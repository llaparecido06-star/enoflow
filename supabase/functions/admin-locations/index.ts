import { verifySession, json, corsHeaders, createSupabaseAdmin } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const session = await verifySession(req);
    if (!session || session.type !== "admin") return json({ error: "Não autorizado" }, 401);

    const supabase = createSupabaseAdmin();
    const body = await req.json();
    const { action } = body;
    const winery_id = session.winery_id;

    // Only owner/manager can manage locations
    if (!["owner", "dono", "manager", "gerente", "master"].includes(session.role)) {
      return json({ error: "Permissão insuficiente" }, 403);
    }

    // ─── LIST
    if (!action || action === "list") {
      const [locsRes, wineryRes, captureRes] = await Promise.all([
        supabase.from("capture_points").select("*, linked_restaurant_cp_id, linked_shop_cp_id, linked_tasting_cp_id").eq("winery_id", winery_id).order("created_at", { ascending: true }),
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

    // ─── CREATE
    if (action === "create") {
      const { name, category, redirect_url, linked_restaurant_cp_id, linked_shop_cp_id, linked_tasting_cp_id } = body;
      if (!name) return json({ error: "Nome obrigatório" }, 400);

      const { count } = await supabase.from("capture_points").select("id", { count: "exact", head: true }).eq("winery_id", winery_id);
      const { data: winery } = await supabase.from("wineries").select("max_locations").eq("id", winery_id).single();
      const max = winery?.max_locations ?? 5;
      if ((count ?? 0) >= max) return json({ error: `Limite de ${max} locais atingido. Atualize seu plano.` }, 403);

      const validCategories = ["restaurant", "tasting", "shop", "wifi", "other"];
      const { data, error } = await supabase.from("capture_points").insert({
        winery_id,
        name: String(name).slice(0, 100),
        category: validCategories.includes(category) ? category : "restaurant",
        redirect_url: redirect_url ? String(redirect_url).slice(0, 500) : null,
        linked_restaurant_cp_id: linked_restaurant_cp_id || null,
        linked_shop_cp_id: linked_shop_cp_id || null,
        linked_tasting_cp_id: linked_tasting_cp_id || null,
      }).select().single();
      if (error) throw error;
      return json({ success: true, location: data });
    }

    // ─── UPDATE
    if (action === "update") {
      const { location_id, name, category, redirect_url, linked_restaurant_cp_id, linked_shop_cp_id, linked_tasting_cp_id } = body;
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
