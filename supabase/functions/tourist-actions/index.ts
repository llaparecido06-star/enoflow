import { isUUID, str, num, optStr, optNum, bool, intRange, validateVoucherItems } from "../_shared/validation.ts";
import { verifySession, json, corsHeaders, createSupabaseAdmin } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const session = await verifySession(req);
    if (!session || session.type !== "tourist") {
      return json({ error: "Não autorizado" }, 401);
    }

    const supabase = createSupabaseAdmin();
    const body = await req.json();
    const { action } = body;
    const user_id = session.sub;
    const winery_id = session.winery_id;

    if (!action) return json({ error: "action required" }, 400);

    const { data: user, error: userErr } = await supabase
      .from("users_leads")
      .select("id, winery_id")
      .eq("id", user_id)
      .single();

    if (userErr || !user) return json({ error: "User not found" }, 404);

    // ─── ACTION: upsert_rating
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
        user_id, wine_id, stars_acidity, stars_body, stars_sweetness,
      }, { onConflict: "user_id,wine_id" }).select().single();

      if (error) throw error;
      return json({ success: true, rating: data });
    }

    // ─── ACTION: save_persona
    if (action === "save_persona") {
      const { persona_key, persona_label } = body;
      if (!persona_key || !persona_label) return json({ error: "persona_key and persona_label required" }, 400);

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

    // ─── ACTION: get_ratings
    if (action === "get_ratings") {
      const { data, error } = await supabase
        .from("ratings")
        .select("wine_id, stars_acidity, stars_body, stars_sweetness")
        .eq("user_id", user_id);
      if (error) throw error;
      return json({ success: true, ratings: data ?? [] });
    }

    // ─── ACTION: get_favorites
    if (action === "get_favorites") {
      const { data, error } = await supabase
        .from("favorites")
        .select("wine_id")
        .eq("user_id", user_id)
        .eq("winery_id", winery_id);
      if (error) throw error;
      return json({ success: true, favorites: data ?? [] });
    }

    // ─── ACTION: add_favorite
    if (action === "add_favorite") {
      const { wine_id } = body;
      if (!isUUID(wine_id)) return json({ error: "Valid wine_id required" }, 400);

      const { error } = await supabase.from("favorites").upsert(
        { user_id, wine_id, winery_id },
        { onConflict: "user_id,wine_id" }
      );
      if (error) throw error;
      return json({ success: true });
    }

    // ─── ACTION: remove_favorite
    if (action === "remove_favorite") {
      const { wine_id } = body;
      if (!isUUID(wine_id)) return json({ error: "Valid wine_id required" }, 400);

      const { error } = await supabase.from("favorites")
        .delete()
        .eq("user_id", user_id)
        .eq("wine_id", wine_id);
      if (error) throw error;
      return json({ success: true });
    }

    // ─── ACTION: create_voucher
    if (action === "create_voucher") {
      const { code, items, total } = body;
      if (!code || !items || total === undefined) return json({ error: "code, items, total required" }, 400);
      if (typeof total !== "number" || total < 0) return json({ error: "Invalid total" }, 400);
      if (typeof code !== "string" || code.length > 20) return json({ error: "Invalid code" }, 400);

      const { valid, sanitized } = validateVoucherItems(items);
      if (!valid) return json({ error: "Invalid items format" }, 400);

      const { data, error } = await supabase.from("vouchers").insert({
        winery_id, user_id, code: str(code, 20), items: sanitized, total,
      }).select().single();

      if (error) throw error;
      return json({ success: true, voucher: data });
    }

    // ─── ACTION: submit_nps
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

    // ─── ACTION: update_profile
    if (action === "update_profile") {
      const updates: Record<string, unknown> = {};
      if (body.birth_date && typeof body.birth_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.birth_date)) {
        updates.birth_date = body.birth_date;
      }
      const allowedIncomeClasses = ["A", "B", "C", "D", "E", "ate_3k", "3k_8k", "8k_15k", "acima_15k"];
      if (body.income_class && allowedIncomeClasses.includes(body.income_class)) {
        updates.income_class = body.income_class;
      }
      const allowedGenders = ["masculino", "feminino", "nao_informar"];
      if (body.gender && allowedGenders.includes(body.gender)) {
        updates.gender = body.gender;
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

    // ─── ACTION: track_visit (capture point visit for returning users)
    if (action === "track_visit") {
      const { capture_point_id, capture_category, capture_location } = body;
      if (!capture_point_id && !capture_category && !capture_location) {
        return json({ error: "At least one capture param required" }, 400);
      }

      if (capture_point_id) {
        const { data: cp } = await supabase.from("capture_points").select("id").eq("id", capture_point_id).maybeSingle();
        if (!cp) return json({ error: "Invalid capture point" }, 400);
      }

      await supabase.from("capture_history").insert({
        user_id,
        winery_id,
        capture_category: capture_category || null,
        capture_location: capture_location || null,
        capture_point_id: capture_point_id || null,
      });

      return json({ success: true });
    }

    // ─── ACTION: get_vouchers
    if (action === "get_vouchers") {
      const { data, error } = await supabase
        .from("vouchers")
        .select("id, code, total, redeemed, nps_score, created_at, items")
        .eq("user_id", user_id)
        .eq("winery_id", winery_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({ success: true, vouchers: data ?? [] });
    }

    // ─── ACTION: resolve_capture_point
    if (action === "resolve_capture_point") {
      const { capture_point_id } = body;
      if (!isUUID(capture_point_id)) return json({ error: "capture_point_id required" }, 400);

      const { data: cp, error } = await supabase
        .from("capture_points")
        .select("id, name, category, linked_restaurant_cp_id, linked_shop_cp_id, linked_tasting_cp_id, linked_tasting_package_ids")
        .eq("id", capture_point_id)
        .eq("winery_id", winery_id)
        .single();

      if (error || !cp) return json({ success: true, resolved: { restaurant_cp: capture_point_id, shop_cp: capture_point_id, tasting_cp: capture_point_id, tasting_package_ids: [] } });

      return json({
        success: true,
        resolved: {
          restaurant_cp: cp.linked_restaurant_cp_id || capture_point_id,
          shop_cp: cp.linked_shop_cp_id || capture_point_id,
          tasting_cp: cp.linked_tasting_cp_id || capture_point_id,
          tasting_package_ids: (cp as any).linked_tasting_package_ids ?? [],
        },
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("tourist-actions error:", error);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
