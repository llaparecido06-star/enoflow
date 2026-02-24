import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateVoucherItems, isUUID, str } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function verifySession(req: Request): Promise<{ sub: string; role: string; winery_id: string; type: string } | null> {
  try {
    const token = req.headers.get("x-session-token");
    if (!token) return null;
    const [hB64, pB64, sB64] = token.split(".");
    if (!hB64 || !pB64 || !sB64) return null;
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sig = Uint8Array.from(atob(sB64.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sig, new TextEncoder().encode(`${hB64}.${pB64}`));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(pB64.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0))));
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const session = await verifySession(req);
    if (!session || session.type !== "tourist") {
      return json({ error: "Não autorizado" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action } = body;
    const user_id = session.sub;
    const winery_id = session.winery_id;

    if (!action) {
      return json({ error: "action required" }, 400);
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
      if (!isUUID(wine_id)) return json({ error: "Valid wine_id required" }, 400);

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

      // Sanitize persona values - only allow alphanumeric + basic chars
      const safeKey = String(persona_key).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 30);
      const safeLabel = String(persona_label).replace(/[<>"'&]/g, "").slice(0, 50);
      if (!safeKey || !safeLabel) return json({ error: "Invalid persona values" }, 400);

      const summary = `Wine Persona: ${safeLabel} (${safeKey})`;
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
      const { code, items, total } = body;
      if (!code || !items || total === undefined) {
        return json({ error: "code, items, total required" }, 400);
      }

      if (typeof total !== "number" || total < 0) {
        return json({ error: "Invalid total" }, 400);
      }

      if (typeof code !== "string" || code.length > 20) {
        return json({ error: "Invalid code" }, 400);
      }

      const { valid, sanitized } = validateVoucherItems(items);
      if (!valid) {
        return json({ error: "Invalid items format" }, 400);
      }

      const { data, error } = await supabase.from("vouchers").insert({
        winery_id,
        user_id,
        code: str(code, 20),
        items: sanitized,
        total,
      }).select().single();

      if (error) throw error;
      return json({ success: true, voucher: data });
    }

    // ─── ACTION: submit_nps ─────────────────────────────
    if (action === "submit_nps") {
      const { voucher_id, nps_score } = body;
      if (!voucher_id || typeof nps_score !== "number" || nps_score < 0 || nps_score > 10) {
        return json({ error: "voucher_id and nps_score (0-10) required" }, 400);
      }
      const { error } = await supabase
        .from("vouchers")
        .update({ nps_score })
        .eq("id", voucher_id)
        .eq("user_id", user_id);
      if (error) throw error;
      return json({ success: true });
    }

    // ─── ACTION: update_profile ──────────────────────────
    if (action === "update_profile") {
      const updates: Record<string, unknown> = {};
      if (body.birth_date && typeof body.birth_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.birth_date)) {
        updates.birth_date = body.birth_date;
      }
      const allowedIncomeClasses = ["A", "B", "C", "D", "E"];
      if (body.income_class && allowedIncomeClasses.includes(body.income_class)) {
        updates.income_class = body.income_class;
      }
      if (body.preferences_summary && typeof body.preferences_summary === "string") {
        updates.preferences_summary = str(body.preferences_summary, 500);
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from("users_leads").update(updates).eq("id", user_id);
        if (error) throw error;
      }
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("tourist-actions error:", error);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
