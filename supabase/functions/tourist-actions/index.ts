import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, user_id } = body;

    if (!user_id || !action) {
      return json({ error: "action and user_id required" }, 400);
    }

    // Verify user exists
    const { data: user, error: userErr } = await supabase
      .from("users_leads")
      .select("id, winery_id")
      .eq("id", user_id)
      .single();

    if (userErr || !user) {
      return json({ error: "User not found" }, 404);
    }

    // ─── ACTION: upsert_rating ───────────────────────────
    if (action === "upsert_rating") {
      const { wine_id, stars_acidity, stars_body, stars_sweetness } = body;
      if (!wine_id) return json({ error: "wine_id required" }, 400);

      const validStar = (v: unknown) => typeof v === "number" && v >= 1 && v <= 5;
      if (!validStar(stars_acidity) || !validStar(stars_body) || !validStar(stars_sweetness)) {
        return json({ error: "Star values must be between 1 and 5" }, 400);
      }

      const { data: wine } = await supabase.from("wines").select("id").eq("id", wine_id).single();
      if (!wine) return json({ error: "Wine not found" }, 404);

      const { data, error } = await supabase.from("ratings").upsert({
        user_id,
        wine_id,
        stars_acidity,
        stars_body,
        stars_sweetness,
      }, { onConflict: "user_id,wine_id" }).select().single();

      if (error) throw error;
      return json({ success: true, rating: data });
    }

    // ─── ACTION: save_persona ────────────────────────────
    if (action === "save_persona") {
      const { persona_key, persona_label } = body;
      if (!persona_key || !persona_label) return json({ error: "persona_key and persona_label required" }, 400);

      const summary = `Wine Persona: ${String(persona_label).slice(0, 50)} (${String(persona_key).slice(0, 30)})`;
      const { error } = await supabase
        .from("users_leads")
        .update({ preferences_summary: summary })
        .eq("id", user_id);
      if (error) throw error;
      return json({ success: true });
    }

    // ─── ACTION: get_ratings ─────────────────────────────
    if (action === "get_ratings") {
      const { data, error } = await supabase
        .from("ratings")
        .select("wine_id, stars_acidity, stars_body, stars_sweetness")
        .eq("user_id", user_id);
      if (error) throw error;
      return json({ success: true, ratings: data ?? [] });
    }

    // ─── ACTION: create_voucher ──────────────────────────
    if (action === "create_voucher") {
      const { winery_id, code, items, total } = body;
      if (!winery_id || !code || !items || total === undefined) {
        return json({ error: "winery_id, code, items, total required" }, 400);
      }

      if (user.winery_id !== winery_id) {
        return json({ error: "User does not belong to this winery" }, 403);
      }

      if (typeof total !== "number" || total < 0) {
        return json({ error: "Invalid total" }, 400);
      }

      if (typeof code !== "string" || code.length > 20) {
        return json({ error: "Invalid code" }, 400);
      }

      const { data, error } = await supabase.from("vouchers").insert({
        winery_id,
        user_id,
        code: String(code).slice(0, 20),
        items,
        total,
      }).select().single();

      if (error) throw error;
      return json({ success: true, voucher: data });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
});
