import { verifySession, json, corsHeaders, createSupabaseAdmin } from "../_shared/auth.ts";

function getAgeGroup(birthDate: string): string {
  const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 25) return "18-24";
  if (age < 35) return "25-34";
  if (age < 45) return "35-44";
  if (age < 55) return "45-54";
  if (age < 65) return "55-64";
  return "65+";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const session = await verifySession(req);
    if (!session || (session.type !== "admin" && session.type !== "master")) {
      return json({ error: "Não autorizado" }, 401);
    }

    const supabase = createSupabaseAdmin();

    const admin_id = session.sub;
    const winery_id = session.winery_id;

    const { data: admin, error: adminErr } = await supabase
      .from("admin_users")
      .select("id, role")
      .eq("id", admin_id)
      .eq("winery_id", winery_id)
      .single();

    if (adminErr || !admin) return json({ error: "Não autorizado" }, 403);

    const body = await req.json().catch(() => ({}));

    // ─── OWNER DASHBOARD ─────────────────────────────────
    if (body.action === "owner_dashboard") {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const monthStart = `${todayStr.slice(0, 7)}-01`;
      const nextDay = new Date(now);
      nextDay.setDate(nextDay.getDate() + 1);
      const tomorrowStr = nextDay.toISOString().slice(0, 10);

      // Leads today
      const { count: leadsToday } = await supabase
        .from("users_leads")
        .select("id", { count: "exact", head: true })
        .eq("winery_id", winery_id)
        .eq("accepted_terms", true)
        .gte("created_at", todayStr)
        .lt("created_at", tomorrowStr);

      // Leads this month
      const { count: leadsMonth } = await supabase
        .from("users_leads")
        .select("id", { count: "exact", head: true })
        .eq("winery_id", winery_id)
        .eq("accepted_terms", true)
        .gte("created_at", monthStart);

      // Total leads
      const { count: leadsTotal } = await supabase
        .from("users_leads")
        .select("id", { count: "exact", head: true })
        .eq("winery_id", winery_id)
        .eq("accepted_terms", true);

      // Vouchers data
      const { data: allVouchers } = await supabase
        .from("vouchers")
        .select("total, redeemed, created_at, user_id, nps_score")
        .eq("winery_id", winery_id);

      const vouchersTotal = (allVouchers ?? []).length;
      const vouchersRedeemed = (allVouchers ?? []).filter(v => v.redeemed).length;
      const revenueTotal = (allVouchers ?? []).filter(v => v.redeemed).reduce((s, v) => s + Number(v.total || 0), 0);
      const revenueMonth = (allVouchers ?? [])
        .filter(v => v.redeemed && v.created_at >= monthStart)
        .reduce((s, v) => s + Number(v.total || 0), 0);
      const salesToday = (allVouchers ?? [])
        .filter(v => v.redeemed && v.created_at >= todayStr && v.created_at < tomorrowStr)
        .reduce((s, v) => s + Number(v.total || 0), 0);

      // NPS calculation
      const npsVouchers = (allVouchers ?? []).filter(v => v.nps_score !== null && v.nps_score !== undefined);
      const npsCount = npsVouchers.length;
      const npsAvg = npsCount > 0 ? npsVouchers.reduce((s, v) => s + Number(v.nps_score), 0) / npsCount : null;
      const npsTodayVouchers = npsVouchers.filter(v => v.created_at >= todayStr && v.created_at < tomorrowStr);
      const npsTodayCount = npsTodayVouchers.length;
      const conversionRate = leadsTotal && leadsTotal > 0
        ? ((vouchersRedeemed / leadsTotal) * 100).toFixed(1)
        : "0";

      // Top wine by sales (voucher items)
      const { data: wineryWines } = await supabase
        .from("wines").select("id, name").eq("winery_id", winery_id);
      const wineIds = (wineryWines ?? []).map(w => w.id);
      const wineNameMap: Record<string, string> = {};
      (wineryWines ?? []).forEach(w => { wineNameMap[w.id] = w.name; });

      let topWineName = null;
      let topWineCount = 0;
      let avgSatisfaction = null;
      let ratingsToday = 0;

      // Count per-wine sales from voucher items
      const wineSalesCount: Record<string, number> = {};
      for (const v of (allVouchers ?? []).filter(v => v.redeemed)) {
        const items = Array.isArray(v.items) ? v.items : [];
        for (const item of items) {
          const wineId = (item as any)?.id || (item as any)?.wine?.id;
          if (wineId && wineNameMap[wineId]) {
            const qty = Number((item as any)?.quantity) || 1;
            wineSalesCount[wineId] = (wineSalesCount[wineId] || 0) + qty;
          }
        }
      }

      // Find best seller
      let bestSalesId = "";
      let bestSales = 0;
      Object.entries(wineSalesCount).forEach(([id, count]) => {
        if (count > bestSales) { bestSales = count; bestSalesId = id; }
      });
      if (bestSalesId) {
        topWineName = wineNameMap[bestSalesId] || "—";
        topWineCount = bestSales;
      }

      if (wineIds.length > 0) {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const { data: todayRatings } = await supabase
          .from("ratings")
          .select("stars_acidity, stars_body, stars_sweetness")
          .in("wine_id", wineIds)
          .gte("created_at", todayStr)
          .lt("created_at", tomorrowStr);
        ratingsToday = todayRatings?.length ?? 0;
        if (ratingsToday > 0) {
          const sum = todayRatings!.reduce((s, r) => s + (r.stars_acidity + r.stars_body + r.stars_sweetness) / 3, 0);
          avgSatisfaction = sum / ratingsToday;
        }
      }

      // Weekly chart - single query approach using already-fetched data
      const weeklyChart: { date: string; leads: number; sales: number }[] = [];
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);
      
      // Fetch all leads for the last 7 days in a single query
      const { data: weekLeads } = await supabase
        .from("users_leads")
        .select("created_at")
        .eq("winery_id", winery_id)
        .gte("created_at", sevenDaysAgoStr);
      
      // Aggregate leads by day
      const leadsPerDay: Record<string, number> = {};
      for (const l of weekLeads ?? []) {
        const d = l.created_at.slice(0, 10);
        leadsPerDay[d] = (leadsPerDay[d] || 0) + 1;
      }
      
      // Build chart from pre-fetched vouchers + aggregated leads
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        const ds = d.toISOString().slice(0, 10);
        const nextD = new Date(d); nextD.setDate(nextD.getDate() + 1);
        const nds = nextD.toISOString().slice(0, 10);
        const daySales = (allVouchers ?? [])
          .filter(v => v.redeemed && v.created_at >= ds && v.created_at < nds)
          .reduce((s, v) => s + Number(v.total || 0), 0);
        weeklyChart.push({ date: ds, leads: leadsPerDay[ds] ?? 0, sales: daySales });
      }

      // ─── BI: Age distribution ───
      const { data: allLeads } = await supabase
        .from("users_leads")
        .select("birth_date, acquisition_location, preferences_summary")
        .eq("winery_id", winery_id)
        .eq("accepted_terms", true);

      const ageDist: Record<string, number> = {};
      const originDist: Record<string, number> = {};
      const prefDist: Record<string, number> = {};

      for (const l of allLeads ?? []) {
        if (l.birth_date) {
          const group = getAgeGroup(l.birth_date);
          ageDist[group] = (ageDist[group] || 0) + 1;
        }
        const originLabel = (l.acquisition_location || "").trim() || "Não informado";
        originDist[originLabel] = (originDist[originLabel] || 0) + 1;
        if (l.preferences_summary) {
          const prefs = l.preferences_summary.split(",").map((p: string) => p.trim()).filter(Boolean);
          for (const p of prefs) {
            prefDist[p] = (prefDist[p] || 0) + 1;
          }
        }
      }

      // ─── BI: Capture points distribution ───
      const { data: captureData } = await supabase
        .from("capture_history")
        .select("capture_category, capture_location, capture_point_id, created_at")
        .eq("winery_id", winery_id);

      // Get capture point names for better labels
      const { data: capturePoints } = await supabase
        .from("capture_points")
        .select("id, name, category")
        .eq("winery_id", winery_id);
      const cpMap: Record<string, string> = {};
      for (const cp of capturePoints ?? []) { cpMap[cp.id] = cp.name; }

      const captureDist: Record<string, number> = {};
      for (const c of captureData ?? []) {
        const rawLabel = (c.capture_point_id && cpMap[c.capture_point_id]) 
          ? cpMap[c.capture_point_id] 
          : c.capture_location || c.capture_category || "";
        const label = rawLabel.trim() || "Acesso Direto";
        captureDist[label] = (captureDist[label] || 0) + 1;
      }

      const toChartArray = (map: Record<string, number>) =>
        Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

      return json({
        leads_today: leadsToday ?? 0,
        leads_month: leadsMonth ?? 0,
        leads_total: leadsTotal ?? 0,
        sales_today: salesToday,
        revenue_total: revenueTotal,
        revenue_month: revenueMonth,
        vouchers_total: vouchersTotal,
        vouchers_redeemed: vouchersRedeemed,
        conversion_rate: conversionRate,
        top_wine_name: topWineName,
        top_wine_count: topWineCount,
        avg_satisfaction: avgSatisfaction,
        ratings_today: ratingsToday,
        nps_avg: npsAvg,
        nps_count: npsCount,
        nps_today_count: npsTodayCount,
        weekly_chart: weeklyChart,
        bi_age: toChartArray(ageDist),
        bi_origin: toChartArray(originDist).slice(0, 10),
        bi_preferences: toChartArray(prefDist).slice(0, 10),
        bi_capture_points: toChartArray(captureDist).slice(0, 10),
      });
    }

    // ─── ROI BY CAPTURE POINT ────────────────────────────
    if (body.action === "roi_capture_points") {
      // Optional period filter (days)
      const days = body.days ? Number(body.days) : null;
      const sinceDate = days
        ? new Date(Date.now() - days * 86400000).toISOString()
        : null;

      // Get all capture points
      const { data: capturePoints } = await supabase
        .from("capture_points")
        .select("id, name, category")
        .eq("winery_id", winery_id);

      // Get capture history to map users to their capture points
      let chQuery = supabase
        .from("capture_history")
        .select("user_id, capture_point_id, created_at")
        .eq("winery_id", winery_id);
      if (sinceDate) chQuery = chQuery.gte("created_at", sinceDate);
      const { data: captureHistory } = await chQuery;

      // Get redeemed vouchers
      let vQuery = supabase
        .from("vouchers")
        .select("user_id, total, created_at")
        .eq("winery_id", winery_id)
        .eq("redeemed", true);
      if (sinceDate) vQuery = vQuery.gte("created_at", sinceDate);
      const { data: redeemedVouchers } = await vQuery;

      // Build user → capture_point mapping (first capture = attribution)
      const userCapturePoint: Record<string, string> = {};
      for (const ch of captureHistory ?? []) {
        if (ch.capture_point_id && !userCapturePoint[ch.user_id]) {
          userCapturePoint[ch.user_id] = ch.capture_point_id;
        }
      }

      // Aggregate revenue per capture point
      const cpRevenue: Record<string, { revenue: number; conversions: number; leads: number }> = {};
      const cpLeads: Record<string, Set<string>> = {};

      for (const ch of captureHistory ?? []) {
        if (ch.capture_point_id) {
          if (!cpLeads[ch.capture_point_id]) cpLeads[ch.capture_point_id] = new Set();
          cpLeads[ch.capture_point_id].add(ch.user_id);
        }
      }

      for (const v of redeemedVouchers ?? []) {
        const cpId = userCapturePoint[v.user_id];
        if (cpId) {
          if (!cpRevenue[cpId]) cpRevenue[cpId] = { revenue: 0, conversions: 0, leads: 0 };
          cpRevenue[cpId].revenue += Number(v.total || 0);
          cpRevenue[cpId].conversions++;
        }
      }

      // Build final array
      const cpNameMap: Record<string, { name: string; category: string }> = {};
      for (const cp of capturePoints ?? []) {
        cpNameMap[cp.id] = { name: cp.name, category: cp.category };
      }

      const roiData = Object.entries(cpNameMap).map(([id, info]) => ({
        id,
        name: info.name,
        category: info.category,
        leads: cpLeads[id]?.size ?? 0,
        conversions: cpRevenue[id]?.conversions ?? 0,
        revenue: cpRevenue[id]?.revenue ?? 0,
        conversion_rate: (cpLeads[id]?.size ?? 0) > 0
          ? ((cpRevenue[id]?.conversions ?? 0) / cpLeads[id]!.size * 100).toFixed(1)
          : "0",
        avg_ticket: (cpRevenue[id]?.conversions ?? 0) > 0
          ? (cpRevenue[id]!.revenue / cpRevenue[id]!.conversions).toFixed(2)
          : "0",
      })).sort((a, b) => b.revenue - a.revenue);

      return json({ success: true, roi_capture_points: roiData });
    }

    // ─── DEFAULT: AUTOMATIONS ────────────────────────────
    const { data: automations, error } = await supabase
      .from("automations")
      .select("id, winery_id, user_id, trigger_type, status, commission_value, created_at")
      .eq("winery_id", winery_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const userIds = [...new Set((automations ?? []).map(a => a.user_id))];
    let leadsMap: Record<string, { name: string; whatsapp: string }> = {};
    if (userIds.length > 0) {
      const { data: leads } = await supabase
        .from("users_leads").select("id, name, whatsapp").in("id", userIds);
      for (const lead of leads ?? []) {
        leadsMap[lead.id] = { name: lead.name, whatsapp: lead.whatsapp };
      }
    }

    const enriched = (automations ?? []).map(a => ({
      ...a,
      users_leads: leadsMap[a.user_id] || null,
    }));

    return json({ success: true, automations: enriched });
  } catch (error) {
    console.error("admin-reports error:", error);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
