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
    const { admin_id, action } = body;

    if (!admin_id) return json({ error: "admin_id required" }, 400);

    // Verify master role
    const { data: admin, error: adminErr } = await supabase
      .from("admin_users")
      .select("id, role")
      .eq("id", admin_id)
      .single();

    if (adminErr || !admin || admin.role !== "master") {
      return json({ error: "Acesso restrito a Master Admin" }, 403);
    }

    // ─── ACTION: update_plan ─────────────────────────────
    if (action === "update_plan") {
      const { winery_id, plan_level } = body;
      if (!winery_id || !plan_level) return json({ error: "winery_id and plan_level required" }, 400);
      const { error } = await supabase.from("wineries").update({ plan_level }).eq("id", winery_id);
      if (error) throw error;
      return json({ success: true });
    }

    // ─── ACTION: create_winery ───────────────────────────
    if (action === "create_winery") {
      const { name, slug, primary_color, plan_level, logo_url } = body;
      if (!name || !slug) return json({ error: "name and slug required" }, 400);
      const slugClean = slug.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 50);
      const { data: winery, error } = await supabase.from("wineries").insert({
        name: String(name).slice(0, 100),
        slug: slugClean,
        primary_color: primary_color || "#630D16",
        plan_level: plan_level || "bronze",
        logo_url: logo_url || null,
      }).select().single();
      if (error) throw error;
      return json({ success: true, winery });
    }

    // ─── ACTION: update_winery ───────────────────────────
    if (action === "update_winery") {
      const { winery_id, name, slug, primary_color, plan_level, logo_url } = body;
      if (!winery_id) return json({ error: "winery_id required" }, 400);
      const updates: Record<string, unknown> = {};
      if (name) updates.name = String(name).slice(0, 100);
      if (slug) updates.slug = String(slug).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 50);
      if (primary_color) updates.primary_color = String(primary_color).slice(0, 20);
      if (plan_level) updates.plan_level = plan_level;
      if (logo_url !== undefined) updates.logo_url = logo_url || null;
      if (Object.keys(updates).length === 0) return json({ error: "Nothing to update" }, 400);
      const { error } = await supabase.from("wineries").update(updates).eq("id", winery_id);
      if (error) throw error;
      return json({ success: true });
    }

    // ─── ACTION: delete_winery ───────────────────────────
    if (action === "delete_winery") {
      const { winery_id } = body;
      if (!winery_id) return json({ error: "winery_id required" }, 400);
      // Delete associated data first
      await supabase.from("automations").delete().eq("winery_id", winery_id);
      await supabase.from("vouchers").delete().eq("winery_id", winery_id);
      await supabase.from("ratings").delete().in("wine_id",
        (await supabase.from("wines").select("id").eq("winery_id", winery_id)).data?.map(w => w.id) ?? []
      );
      await supabase.from("menu_items").delete().eq("winery_id", winery_id);
      await supabase.from("tasting_packages").delete().eq("winery_id", winery_id);
      await supabase.from("wines").delete().eq("winery_id", winery_id);
      await supabase.from("users_leads").delete().eq("winery_id", winery_id);
      await supabase.from("admin_users").delete().eq("winery_id", winery_id);
      const { error } = await supabase.from("wineries").delete().eq("id", winery_id);
      if (error) throw error;
      return json({ success: true });
    }

    // ─── ACTION: list_admins ─────────────────────────────
    if (action === "list_admins") {
      const { data, error } = await supabase
        .from("admin_users")
        .select("id, name, email, role, winery_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const { data: wineries } = await supabase.from("wineries").select("id, name, slug");
      return json({ success: true, admins: data ?? [], wineries: wineries ?? [] });
    }

    // ─── ACTION: create_admin ────────────────────────────
    if (action === "create_admin") {
      const { name, email, password, role, winery_id } = body;
      if (!name || !email || !password || !role || !winery_id) {
        return json({ error: "name, email, password, role, winery_id required" }, 400);
      }
      const validRoles = ["staff", "manager", "owner"];
      if (!validRoles.includes(role)) return json({ error: "Invalid role" }, 400);
      const { data: existing } = await supabase
        .from("admin_users")
        .select("id")
        .eq("email", email)
        .eq("winery_id", winery_id);
      if (existing && existing.length > 0) return json({ error: "Email já cadastrado nesta vinícola" }, 400);
      const { data: newAdmin, error } = await supabase.from("admin_users").insert({
        name: String(name).slice(0, 100),
        email: String(email).slice(0, 255),
        password_hash: String(password).slice(0, 100),
        role,
        winery_id,
      }).select("id, name, email, role, winery_id, created_at").single();
      if (error) throw error;
      return json({ success: true, admin: newAdmin });
    }

    // ─── ACTION: update_admin ────────────────────────────
    if (action === "update_admin") {
      const { target_id, name, email, password, role } = body;
      if (!target_id) return json({ error: "target_id required" }, 400);
      const { data: target } = await supabase.from("admin_users").select("role").eq("id", target_id).single();
      if (target?.role === "master") return json({ error: "Não é possível editar master" }, 403);
      const updates: Record<string, string> = {};
      if (name) updates.name = String(name).slice(0, 100);
      if (email) updates.email = String(email).slice(0, 255);
      if (password) updates.password_hash = String(password).slice(0, 100);
      if (role && ["staff", "manager", "owner"].includes(role)) updates.role = role;
      if (Object.keys(updates).length === 0) return json({ error: "Nothing to update" }, 400);
      const { error } = await supabase.from("admin_users").update(updates).eq("id", target_id);
      if (error) throw error;
      return json({ success: true });
    }

    // ─── ACTION: delete_admin ────────────────────────────
    if (action === "delete_admin") {
      const { target_id } = body;
      if (!target_id) return json({ error: "target_id required" }, 400);
      const { data: target } = await supabase.from("admin_users").select("role").eq("id", target_id).single();
      if (target?.role === "master") return json({ error: "Não é possível remover master" }, 403);
      const { error } = await supabase.from("admin_users").delete().eq("id", target_id);
      if (error) throw error;
      return json({ success: true });
    }

    // ─── ACTION: reports ─────────────────────────────────
    if (action === "reports") {
      const { winery_id } = body; // optional filter

      const [leadsRes, vouchersRes, automationsRes, wineriesRes, ratingsRes] = await Promise.all([
        supabase.from("users_leads").select("id, winery_id, created_at"),
        supabase.from("vouchers").select("id, winery_id, total, redeemed, created_at"),
        supabase.from("automations").select("id, winery_id, commission_value, status, trigger_type, created_at"),
        supabase.from("wineries").select("id, name, slug, primary_color"),
        supabase.from("ratings").select("id, wine_id, created_at"),
      ]);

      let leads = leadsRes.data ?? [];
      let vouchers = vouchersRes.data ?? [];
      let automations = automationsRes.data ?? [];
      let ratings = ratingsRes.data ?? [];
      const allWineries = wineriesRes.data ?? [];

      // Get wine -> winery mapping for ratings
      const { data: wines } = await supabase.from("wines").select("id, winery_id");
      const wineWineryMap: Record<string, string> = {};
      (wines ?? []).forEach(w => { wineWineryMap[w.id] = w.winery_id; });

      if (winery_id) {
        leads = leads.filter(l => l.winery_id === winery_id);
        vouchers = vouchers.filter(v => v.winery_id === winery_id);
        automations = automations.filter(a => a.winery_id === winery_id);
        ratings = ratings.filter(r => wineWineryMap[r.wine_id] === winery_id);
      }

      const totalVoucherValue = vouchers.reduce((s, v) => s + Number(v.total || 0), 0);
      const redeemedValue = vouchers.filter(v => v.redeemed).reduce((s, v) => s + Number(v.total || 0), 0);
      const totalCommissions = automations.reduce((s, a) => s + Number(a.commission_value || 0), 0);

      // Leads per day (last 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const leadsPerDay: Record<string, number> = {};
      leads.forEach(l => {
        const d = new Date(l.created_at);
        if (d >= thirtyDaysAgo) {
          const key = d.toISOString().slice(0, 10);
          leadsPerDay[key] = (leadsPerDay[key] || 0) + 1;
        }
      });
      const leadsChart = Object.entries(leadsPerDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));

      // Vouchers per day (last 30 days)
      const vouchersPerDay: Record<string, number> = {};
      vouchers.forEach(v => {
        const d = new Date(v.created_at);
        if (d >= thirtyDaysAgo) {
          const key = d.toISOString().slice(0, 10);
          vouchersPerDay[key] = (vouchersPerDay[key] || 0) + 1;
        }
      });
      const vouchersChart = Object.entries(vouchersPerDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));

      // Per winery breakdown
      const perWinery = allWineries.map(w => ({
        id: w.id,
        name: w.name,
        slug: w.slug,
        primary_color: w.primary_color,
        leads: leads.filter(l => l.winery_id === w.id).length,
        vouchers: vouchers.filter(v => v.winery_id === w.id).length,
        voucher_value: vouchers.filter(v => v.winery_id === w.id).reduce((s, v) => s + Number(v.total || 0), 0),
        automations: automations.filter(a => a.winery_id === w.id).length,
        commissions: automations.filter(a => a.winery_id === w.id).reduce((s, a) => s + Number(a.commission_value || 0), 0),
        ratings: ratings.filter(r => wineWineryMap[r.wine_id] === w.id).length,
      }));

      return json({
        success: true,
        metrics: {
          total_leads: leads.length,
          total_vouchers: vouchers.length,
          total_voucher_value: totalVoucherValue,
          redeemed_value: redeemedValue,
          total_automations: automations.length,
          total_commissions: totalCommissions,
          total_ratings: ratings.length,
        },
        leads_chart: leadsChart,
        vouchers_chart: vouchersChart,
        per_winery: perWinery,
        wineries: allWineries,
      });
    }

    // ─── ACTION: bulk_import ─────────────────────────────
    if (action === "bulk_import") {
      const { winery_id, import_type, items } = body;
      if (!winery_id || !import_type || !items || !Array.isArray(items)) {
        return json({ error: "winery_id, import_type, items[] required" }, 400);
      }

      // Verify winery exists
      const { data: winery } = await supabase.from("wineries").select("id").eq("id", winery_id).single();
      if (!winery) return json({ error: "Vinícola não encontrada" }, 404);

      let insertedCount = 0;

      if (import_type === "wines") {
        const rows = items.map((item: Record<string, unknown>) => ({
          winery_id,
          name: String(item.name || "").slice(0, 200),
          type: String(item.type || "Tinto"),
          grape: item.grape ? String(item.grape).slice(0, 100) : null,
          year: item.year ? Number(item.year) : null,
          region: item.region ? String(item.region).slice(0, 100) : null,
          price_bottle: Number(item.price_bottle || item.price || 0),
          price_glass: item.price_glass ? Number(item.price_glass) : null,
          description: item.description ? String(item.description).slice(0, 500) : null,
          alcohol_content: item.alcohol_content ? String(item.alcohol_content) : null,
          on_tasting: Boolean(item.on_tasting),
          on_restaurant: Boolean(item.on_restaurant),
          on_shop: item.on_shop !== false,
        })).filter(r => r.name);

        if (rows.length > 0) {
          const { error } = await supabase.from("wines").insert(rows);
          if (error) throw error;
          insertedCount = rows.length;
        }
      } else if (import_type === "menu") {
        const rows = items.map((item: Record<string, unknown>) => ({
          winery_id,
          name: String(item.name || "").slice(0, 200),
          category: String(item.category || "Outros"),
          price: Number(item.price || 0),
          description: item.description ? String(item.description).slice(0, 500) : null,
        })).filter(r => r.name);

        if (rows.length > 0) {
          const { error } = await supabase.from("menu_items").insert(rows);
          if (error) throw error;
          insertedCount = rows.length;
        }
      } else if (import_type === "packages") {
        for (const item of items) {
          if (!item.name) continue;
          const { error } = await supabase.from("tasting_packages").insert({
            winery_id,
            name: String(item.name).slice(0, 200),
            description: item.description ? String(item.description).slice(0, 500) : null,
            price: Number(item.price || 0),
            wine_ids: Array.isArray(item.wine_ids) ? item.wine_ids : [],
          });
          if (!error) insertedCount++;
        }
      } else {
        return json({ error: "import_type must be wines, menu, or packages" }, 400);
      }

      return json({ success: true, inserted: insertedCount });
    }

    // ─── DEFAULT: dashboard metrics ──────────────────────
    const [wineriesRes, leadsRes, winesRes, vouchersRes, automationsRes, adminsRes, ratingsRes] = await Promise.all([
      supabase.from("wineries").select("id, name, slug, plan_level, primary_color, created_at"),
      supabase.from("users_leads").select("id, winery_id, created_at, preferences_summary"),
      supabase.from("wines").select("id, winery_id"),
      supabase.from("vouchers").select("id, winery_id, total, redeemed, created_at"),
      supabase.from("automations").select("id, winery_id, commission_value, status"),
      supabase.from("admin_users").select("id, winery_id, role"),
      supabase.from("ratings").select("id, user_id, stars_acidity, stars_body, stars_sweetness, created_at"),
    ]);

    const wineries = wineriesRes.data ?? [];
    const leads = leadsRes.data ?? [];
    const wines = winesRes.data ?? [];
    const vouchers = vouchersRes.data ?? [];
    const automations = automationsRes.data ?? [];
    const admins = adminsRes.data ?? [];
    const allRatings = ratingsRes.data ?? [];

    const totalVoucherValue = vouchers.reduce((s, v) => s + Number(v.total || 0), 0);
    const redeemedVoucherValue = vouchers.filter(v => v.redeemed).reduce((s, v) => s + Number(v.total || 0), 0);
    const totalCommissions = automations.reduce((s, a) => s + Number(a.commission_value || 0), 0);

    const wineryMetrics = wineries.map(w => ({
      ...w,
      leads_count: leads.filter(l => l.winery_id === w.id).length,
      wines_count: wines.filter(wi => wi.winery_id === w.id).length,
      vouchers_count: vouchers.filter(v => v.winery_id === w.id).length,
      vouchers_value: vouchers.filter(v => v.winery_id === w.id).reduce((s, v) => s + Number(v.total || 0), 0),
      admins_count: admins.filter(a => a.winery_id === w.id).length,
    }));

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const leadsPerDay: Record<string, number> = {};
    leads.forEach(l => {
      const d = new Date(l.created_at);
      if (d >= thirtyDaysAgo) {
        const key = d.toISOString().slice(0, 10);
        leadsPerDay[key] = (leadsPerDay[key] || 0) + 1;
      }
    });

    const leadsChart = Object.entries(leadsPerDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // ─── Persona stats (today's ratings) ──────────────────
    const todayStr = now.toISOString().slice(0, 10);
    const todayRatings = allRatings.filter(r => r.created_at?.slice(0, 10) === todayStr);
    
    // Group by user and calculate persona
    const userRatings: Record<string, { acidity: number[]; body: number[]; sweetness: number[] }> = {};
    todayRatings.forEach(r => {
      if (!userRatings[r.user_id]) userRatings[r.user_id] = { acidity: [], body: [], sweetness: [] };
      userRatings[r.user_id].acidity.push(r.stars_acidity);
      userRatings[r.user_id].body.push(r.stars_body);
      userRatings[r.user_id].sweetness.push(r.stars_sweetness);
    });

    const personaCounts: Record<string, number> = { sweet_tooth: 0, bold_intense: 0, fresh_crisp: 0, balanced_explorer: 0 };
    Object.values(userRatings).forEach(ur => {
      const avgA = ur.acidity.reduce((s, v) => s + v, 0) / ur.acidity.length;
      const avgB = ur.body.reduce((s, v) => s + v, 0) / ur.body.length;
      const avgS = ur.sweetness.reduce((s, v) => s + v, 0) / ur.sweetness.length;
      if (avgS > 4) personaCounts.sweet_tooth++;
      else if (avgB > 4) personaCounts.bold_intense++;
      else if (avgA > 4) personaCounts.fresh_crisp++;
      else personaCounts.balanced_explorer++;
    });

    return json({
      success: true,
      metrics: {
        total_wineries: wineries.length,
        total_leads: leads.length,
        total_wines: wines.length,
        total_vouchers: vouchers.length,
        total_voucher_value: totalVoucherValue,
        redeemed_voucher_value: redeemedVoucherValue,
        total_commissions: totalCommissions,
        total_admins: admins.length,
      },
      wineries: wineryMetrics,
      leads_chart: leadsChart,
      persona_stats: personaCounts,
      persona_total: Object.values(personaCounts).reduce((s, v) => s + v, 0),
    });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
});
