import { isUUID, str, num, optStr, optNum, bool, intRange } from "../_shared/validation.ts";
import { verifySession, json, corsHeaders, createSupabaseAdmin } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const session = await verifySession(req);
    if (!session || session.type !== "master") {
      return json({ error: "Acesso restrito a Master Admin" }, 401);
    }

    const supabase = createSupabaseAdmin();

    const admin_id = session.sub;
    const body = await req.json();
    const { action } = body;

    // Verify master role still valid
    const { data: admin, error: adminErr } = await supabase
      .from("admin_users")
      .select("id, role")
      .eq("id", admin_id)
      .single();

    if (adminErr || !admin || admin.role !== "master") {
      return json({ error: "Acesso restrito a Master Admin" }, 403);
    }

    // ─── ACTION: list_plans ─────────────────────────────
    if (action === "list_plans") {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("price", { ascending: true });
      if (error) throw error;
      return json({ success: true, plans: data ?? [] });
    }

    // ─── ACTION: create_plan ─────────────────────────────
    if (action === "create_plan") {
      const { name, plan_key, price, max_locations, max_wines, max_staff, commission_rate, enabled_modules, features } = body;
      if (!name || !plan_key) return json({ error: "name and plan_key required" }, 400);
      const { data: plan, error } = await supabase.from("subscription_plans").insert({
        name: String(name).slice(0, 100),
        plan_key: String(plan_key).toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 50),
        price: Number(price) || 0,
        max_locations: Number(max_locations) || 5,
        max_wines: max_wines != null ? Number(max_wines) : null,
        max_staff: max_staff != null ? Number(max_staff) : null,
        commission_rate: Number(commission_rate) || 0,
        enabled_modules: Array.isArray(enabled_modules) ? enabled_modules : ["tasting", "restaurant", "shop"],
        features: Array.isArray(features) ? features.map((f: unknown) => String(f).slice(0, 200)) : [],
      }).select().single();
      if (error) throw error;
      return json({ success: true, plan });
    }

    // ─── ACTION: update_plan_config ──────────────────────
    if (action === "update_plan_config") {
      const { plan_id, name, price, max_locations, max_wines, max_staff, commission_rate, enabled_modules, features, is_active } = body;
      if (!plan_id) return json({ error: "plan_id required" }, 400);
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = String(name).slice(0, 100);
      if (price !== undefined) updates.price = Number(price) || 0;
      if (max_locations !== undefined) updates.max_locations = Number(max_locations) || 5;
      if (max_wines !== undefined) updates.max_wines = max_wines === null ? null : Number(max_wines);
      if (max_staff !== undefined) updates.max_staff = max_staff === null ? null : Number(max_staff);
      if (commission_rate !== undefined) updates.commission_rate = Number(commission_rate) || 0;
      if (enabled_modules !== undefined) updates.enabled_modules = Array.isArray(enabled_modules) ? enabled_modules : ["tasting", "restaurant", "shop"];
      if (features !== undefined) updates.features = Array.isArray(features) ? features.map((f: unknown) => String(f).slice(0, 200)) : [];
      if (is_active !== undefined) updates.is_active = Boolean(is_active);
      if (Object.keys(updates).length === 0) return json({ error: "Nothing to update" }, 400);
      const { error } = await supabase.from("subscription_plans").update(updates).eq("id", plan_id);
      if (error) throw error;
      return json({ success: true });
    }

    // ─── ACTION: delete_plan ─────────────────────────────
    if (action === "delete_plan") {
      const { plan_id } = body;
      if (!plan_id) return json({ error: "plan_id required" }, 400);
      const { error } = await supabase.from("subscription_plans").delete().eq("id", plan_id);
      if (error) throw error;
      return json({ success: true });
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
      const { name, slug, primary_color, plan_level, logo_url, subscription_value, platform_commission_rate, enabled_modules } = body;
      if (!name || !slug) return json({ error: "name and slug required" }, 400);
      const slugClean = slug.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 50);
      const validModules = ["tasting", "restaurant", "shop"];
      const modules = Array.isArray(enabled_modules) ? enabled_modules.filter((m: string) => validModules.includes(m)) : validModules;
      const validCurrencies = ["BRL", "USD", "EUR"];
      const { data: winery, error } = await supabase.from("wineries").insert({
        name: String(name).slice(0, 100),
        slug: slugClean,
        primary_color: primary_color || "#630D16",
        plan_level: plan_level || "bronze",
        logo_url: logo_url || null,
        subscription_value: Number(subscription_value) || 0,
        platform_commission_rate: Number(platform_commission_rate) || 0,
        enabled_modules: modules,
        max_locations: Math.max(1, Math.min(100, Number(body.max_locations) || 5)),
        currency: validCurrencies.includes(body.currency) ? body.currency : "BRL",
      }).select().single();
      if (error) throw error;
      return json({ success: true, winery });
    }

    // ─── ACTION: update_winery ───────────────────────────
    if (action === "update_winery") {
      const { winery_id, name, slug, primary_color, plan_level, logo_url, subscription_value, platform_commission_rate, enabled_modules } = body;
      if (!winery_id) return json({ error: "winery_id required" }, 400);
      const updates: Record<string, unknown> = {};
      if (name) updates.name = String(name).slice(0, 100);
      if (slug) updates.slug = String(slug).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 50);
      if (primary_color) updates.primary_color = String(primary_color).slice(0, 20);
      if (plan_level) updates.plan_level = plan_level;
      if (logo_url !== undefined) updates.logo_url = logo_url || null;
      if (subscription_value !== undefined) updates.subscription_value = Number(subscription_value) || 0;
      if (platform_commission_rate !== undefined) updates.platform_commission_rate = Number(platform_commission_rate) || 0;
      if (enabled_modules !== undefined) {
        const validModules = ["tasting", "restaurant", "shop"];
        updates.enabled_modules = Array.isArray(enabled_modules) ? enabled_modules.filter((m: string) => validModules.includes(m)) : validModules;
      }
      if (body.status !== undefined && ["active", "inactive"].includes(body.status)) {
        updates.status = body.status;
      }
      if (body.max_locations !== undefined) updates.max_locations = Math.max(1, Math.min(100, Number(body.max_locations) || 5));
      if (body.currency !== undefined) {
        const validCurrencies = ["BRL", "USD", "EUR"];
        if (validCurrencies.includes(body.currency)) updates.currency = body.currency;
      }
      if (Object.keys(updates).length === 0) return json({ error: "Nothing to update" }, 400);
      const { error } = await supabase.from("wineries").update(updates).eq("id", winery_id);
      if (error) throw error;
      return json({ success: true });
    }

    // ─── ACTION: delete_winery ───────────────────────────
    if (action === "delete_winery") {
      const { winery_id } = body;
      if (!winery_id) return json({ error: "winery_id required" }, 400);
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
      // Hash password with bcrypt
      const { data: hashResult } = await supabase.rpc("hash_password", { p_password: String(password).slice(0, 100) });
      if (!hashResult) return json({ error: "Erro ao processar senha" }, 500);
      const { data: newAdmin, error } = await supabase.from("admin_users").insert({
        name: String(name).slice(0, 100),
        email: String(email).slice(0, 255),
        password_hash: hashResult,
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
      if (password) {
        const { data: hashResult } = await supabase.rpc("hash_password", { p_password: String(password).slice(0, 100) });
        if (hashResult) updates.password_hash = hashResult;
      }
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
      const { winery_id } = body;

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
      const leadsChart = Object.entries(leadsPerDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));

      const vouchersPerDay: Record<string, number> = {};
      vouchers.forEach(v => {
        const d = new Date(v.created_at);
        if (d >= thirtyDaysAgo) {
          const key = d.toISOString().slice(0, 10);
          vouchersPerDay[key] = (vouchersPerDay[key] || 0) + 1;
        }
      });
      const vouchersChart = Object.entries(vouchersPerDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));

      const perWinery = allWineries.map(w => ({
        id: w.id, name: w.name, slug: w.slug, primary_color: w.primary_color,
        leads: leads.filter(l => l.winery_id === w.id).length,
        vouchers: vouchers.filter(v => v.winery_id === w.id).length,
        voucher_value: vouchers.filter(v => v.winery_id === w.id).reduce((s, v) => s + Number(v.total || 0), 0),
        automations: automations.filter(a => a.winery_id === w.id).length,
        commissions: automations.filter(a => a.winery_id === w.id).reduce((s, a) => s + Number(a.commission_value || 0), 0),
        ratings: ratings.filter(r => wineWineryMap[r.wine_id] === w.id).length,
      }));

      return json({
        success: true,
        metrics: { total_leads: leads.length, total_vouchers: vouchers.length, total_voucher_value: totalVoucherValue, redeemed_value: redeemedValue, total_automations: automations.length, total_commissions: totalCommissions, total_ratings: ratings.length },
        leads_chart: leadsChart, vouchers_chart: vouchersChart, per_winery: perWinery, wineries: allWineries,
      });
    }

    // ─── ACTION: bulk_import ─────────────────────────────
    if (action === "bulk_import") {
      const { winery_id, import_type, items, capture_point_id } = body;
      if (!isUUID(winery_id) || !import_type || !items || !Array.isArray(items)) {
        return json({ error: "winery_id, import_type, items[] required" }, 400);
      }
      if (items.length > 500) {
        return json({ error: "Maximum 500 items per import" }, 400);
      }
      const { data: winery } = await supabase.from("wineries").select("id").eq("id", winery_id).single();
      if (!winery) return json({ error: "Vinícola não encontrada" }, 404);

      const cpId = isUUID(capture_point_id) ? capture_point_id : null;
      let insertedCount = 0;

      if (import_type === "wines") {
        const rows = items.map((item: Record<string, unknown>) => ({
          winery_id, name: str(item.name, 200), type: str(item.type || "Tinto", 50),
          grape: optStr(item.grape, 100),
          year: item.year != null ? intRange(item.year, 1900, 2100, new Date().getFullYear()) : null,
          region: optStr(item.region, 100),
          price_bottle: num(item.price_bottle || item.price, 0, 999999),
          price_glass: optNum(item.price_glass, 0, 999999),
          description: optStr(item.description, 500),
          alcohol_content: optStr(item.alcohol_content, 20),
          sensory_acidity: intRange(item.sensory_acidity, 1, 5, 3),
          sensory_body: intRange(item.sensory_body, 1, 5, 3),
          sensory_sweetness: intRange(item.sensory_sweetness, 1, 5, 3),
          on_tasting: bool(item.on_tasting), on_restaurant: bool(item.on_restaurant), on_shop: bool(item.on_shop, true),
          capture_point_id: cpId,
        })).filter(r => r.name);
        if (rows.length > 0) { const { error } = await supabase.from("wines").insert(rows); if (error) throw error; insertedCount = rows.length; }
      } else if (import_type === "menu") {
        const rows = items.map((item: Record<string, unknown>) => ({
          winery_id, name: str(item.name, 200), category: str(item.category || "Outros", 100),
          price: num(item.price, 0, 999999), description: optStr(item.description, 500),
          capture_point_ids: cpId ? [cpId] : [],
        })).filter(r => r.name);
        if (rows.length > 0) { const { error } = await supabase.from("menu_items").insert(rows); if (error) throw error; insertedCount = rows.length; }
      } else if (import_type === "packages") {
        for (const item of items.slice(0, 500)) {
          if (!item.name) continue;
          const { error } = await supabase.from("tasting_packages").insert({
            winery_id, name: str(item.name, 200),
            description: optStr(item.description, 500),
            price: num(item.price, 0, 999999),
            wine_ids: Array.isArray(item.wine_ids) ? item.wine_ids.slice(0, 50).filter((id: unknown) => isUUID(id)) : [],
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
      supabase.from("wineries").select("id, name, slug, plan_level, primary_color, created_at, subscription_value, platform_commission_rate, enabled_modules, logo_url, status, max_locations, currency"),
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
    
    // MRR from subscriptions
    const totalMRR = wineries.reduce((s, w) => s + Number((w as any).subscription_value || 0), 0);
    
    // Platform commissions based on redeemed vouchers * commission rate per winery
    const platformCommissions = wineries.reduce((s, w) => {
      const wineryRedeemed = vouchers.filter(v => v.redeemed && v.winery_id === w.id).reduce((vs, v) => vs + Number(v.total || 0), 0);
      return s + wineryRedeemed * (Number((w as any).platform_commission_rate || 0) / 100);
    }, 0);

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
      if (d >= thirtyDaysAgo) { const key = d.toISOString().slice(0, 10); leadsPerDay[key] = (leadsPerDay[key] || 0) + 1; }
    });
    const leadsChart = Object.entries(leadsPerDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));

    const todayStr = now.toISOString().slice(0, 10);
    const todayRatings = allRatings.filter(r => r.created_at?.slice(0, 10) === todayStr);
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
        total_wineries: wineries.length, total_leads: leads.length, total_wines: wines.length,
        total_vouchers: vouchers.length, total_voucher_value: totalVoucherValue,
        redeemed_voucher_value: redeemedVoucherValue, total_commissions: totalCommissions,
        total_admins: admins.length, total_mrr: totalMRR, platform_commissions: platformCommissions,
      },
      wineries: wineryMetrics, leads_chart: leadsChart,
      persona_stats: personaCounts, persona_total: Object.values(personaCounts).reduce((s, v) => s + v, 0),
    });
  } catch (error) {
    console.error("master-dashboard error:", error);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
