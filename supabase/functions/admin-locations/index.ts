import { verifySession, json, corsHeaders, createSupabaseAdmin, hasMinRole } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const session = await verifySession(req);
    if (!session || (session.type !== "admin" && session.type !== "master")) return json({ error: "Não autorizado" }, 401);

    const supabase = createSupabaseAdmin();
    const body = await req.json();
    const { action } = body;

    // Master can specify target winery_id in body
    let winery_id = session.winery_id;
    if (session.type === "master" && body.winery_id) {
      winery_id = body.winery_id;
    }

    // Only manager+ or master can manage locations
    if (session.type !== "master" && !hasMinRole(session.role, "manager")) {
      return json({ error: "Permissão insuficiente" }, 403);
    }

    // ─── LIST
    if (!action || action === "list") {
      const [locsRes, wineryRes, captureRes] = await Promise.all([
        supabase.from("capture_points").select("*, linked_restaurant_cp_id, linked_shop_cp_id, linked_tasting_cp_id, enabled_modules").eq("winery_id", winery_id).order("created_at", { ascending: true }),
        supabase.from("wineries").select("max_locations, slug").eq("id", winery_id).single(),
        supabase.from("capture_history").select("capture_point_id").eq("winery_id", winery_id),
      ]);
      if (locsRes.error) throw locsRes.error;

      const visitCounts: Record<string, number> = {};
      for (const c of captureRes.data ?? []) {
        if (c.capture_point_id) {
          visitCounts[c.capture_point_id] = (visitCounts[c.capture_point_id] || 0) + 1;
        }
      }

      const locations = (locsRes.data ?? []).map(loc => ({
        ...loc,
        visit_count: visitCounts[loc.id] ?? 0,
      }));

      return json({
        success: true,
        locations,
        max_locations: wineryRes.data?.max_locations ?? 5,
        slug: wineryRes.data?.slug ?? "",
      });
    }
    if (action === "create") {
      const { name, category, redirect_url, linked_restaurant_cp_id, linked_shop_cp_id, linked_tasting_cp_id, linked_tasting_package_ids, enabled_modules } = body;
      if (!name) return json({ error: "Nome obrigatório" }, 400);

      const { count } = await supabase.from("capture_points").select("id", { count: "exact", head: true }).eq("winery_id", winery_id);
      const { data: winery } = await supabase.from("wineries").select("max_locations").eq("id", winery_id).single();
      const max = winery?.max_locations ?? 5;
      if ((count ?? 0) >= max) return json({ error: `Limite de ${max} locais atingido. Atualize seu plano.` }, 403);

      const validCategories = ["restaurant", "tasting", "shop", "wifi", "other"];
      const validModules = ["tasting", "restaurant", "shop"];
      const sanitizedModules = Array.isArray(enabled_modules)
        ? enabled_modules.filter((m: unknown) => typeof m === "string" && validModules.includes(m))
        : null;

      const { data, error } = await supabase.from("capture_points").insert({
        winery_id,
        name: String(name).slice(0, 100),
        category: validCategories.includes(category) ? category : "restaurant",
        redirect_url: redirect_url ? String(redirect_url).slice(0, 500) : null,
        linked_restaurant_cp_id: linked_restaurant_cp_id || null,
        linked_shop_cp_id: linked_shop_cp_id || null,
        linked_tasting_cp_id: linked_tasting_cp_id || null,
        linked_tasting_package_ids: Array.isArray(linked_tasting_package_ids) ? linked_tasting_package_ids : [],
        enabled_modules: sanitizedModules && sanitizedModules.length > 0 ? sanitizedModules : null,
      }).select().single();
      if (error) throw error;
      return json({ success: true, location: data });
    }

    // ─── UPDATE
    if (action === "update") {
      const { location_id, name, category, redirect_url, linked_restaurant_cp_id, linked_shop_cp_id, linked_tasting_cp_id, linked_tasting_package_ids, enabled_modules } = body;
      if (!location_id) return json({ error: "location_id obrigatório" }, 400);

      const updates: Record<string, unknown> = {};
      if (name) updates.name = String(name).slice(0, 100);
      if (category) {
        const validCategories = ["restaurant", "tasting", "shop", "wifi", "other"];
        if (validCategories.includes(category)) updates.category = category;
      }
      if (redirect_url !== undefined) updates.redirect_url = redirect_url ? String(redirect_url).slice(0, 500) : null;
      if (linked_restaurant_cp_id !== undefined) updates.linked_restaurant_cp_id = linked_restaurant_cp_id || null;
      if (linked_shop_cp_id !== undefined) updates.linked_shop_cp_id = linked_shop_cp_id || null;
      if (linked_tasting_cp_id !== undefined) updates.linked_tasting_cp_id = linked_tasting_cp_id || null;
      if (linked_tasting_package_ids !== undefined) updates.linked_tasting_package_ids = Array.isArray(linked_tasting_package_ids) ? linked_tasting_package_ids : [];
      if (enabled_modules !== undefined) {
        const validModules = ["tasting", "restaurant", "shop"];
        const sanitized = Array.isArray(enabled_modules)
          ? enabled_modules.filter((m: unknown) => typeof m === "string" && validModules.includes(m))
          : null;
        updates.enabled_modules = sanitized && sanitized.length > 0 ? sanitized : null;
      }

      if (Object.keys(updates).length === 0) return json({ error: "Nada para atualizar" }, 400);

      const { error } = await supabase.from("capture_points").update(updates).eq("id", location_id).eq("winery_id", winery_id);
      if (error) throw error;
      return json({ success: true });
    }

    // ─── DELETE
    if (action === "delete") {
      const { location_id } = body;
      if (!location_id) return json({ error: "location_id obrigatório" }, 400);
      const { error } = await supabase.from("capture_points").delete().eq("id", location_id).eq("winery_id", winery_id);
      if (error) throw error;
      return json({ success: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (err) {
    console.error("admin-locations error:", err);
    return json({ error: "Erro interno" }, 500);
  }
});
