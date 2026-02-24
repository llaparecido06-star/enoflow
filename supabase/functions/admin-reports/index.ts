import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const secret = Deno.env.get("JWT_SIGNING_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sig = Uint8Array.from(atob(sB64.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sig, new TextEncoder().encode(`${hB64}.${pB64}`));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(pB64.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0))));
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch { return null; }
}

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
        .select("total, redeemed, created_at, user_id")
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
      const conversionRate = leadsTotal && leadsTotal > 0
        ? ((vouchersRedeemed / leadsTotal) * 100).toFixed(1)
        : "0";

      // Top wine
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: wineryWines } = await supabase
        .from("wines").select("id, name").eq("winery_id", winery_id);
      const wineIds = (wineryWines ?? []).map(w => w.id);
      const wineNameMap: Record<string, string> = {};
      (wineryWines ?? []).forEach(w => { wineNameMap[w.id] = w.name; });

      let topWineName = null;
      let topWineDetail = "Sem dados";
      let avgSatisfaction = null;
      let ratingsToday = 0;

      if (wineIds.length > 0) {
        const { data: monthRatings } = await supabase
          .from("ratings")
          .select("wine_id, stars_acidity, stars_body, stars_sweetness")
          .in("wine_id", wineIds)
          .gte("created_at", thirtyDaysAgo);

        if (monthRatings && monthRatings.length > 0) {
          const wineScores: Record<string, { total: number; count: number }> = {};
          monthRatings.forEach(r => {
            const avg = (r.stars_acidity + r.stars_body + r.stars_sweetness) / 3;
            if (!wineScores[r.wine_id]) wineScores[r.wine_id] = { total: 0, count: 0 };
            wineScores[r.wine_id].total += avg;
            wineScores[r.wine_id].count++;
          });
          let bestId = "", bestAvg = 0;
          Object.entries(wineScores).forEach(([id, s]) => {
            const avg = s.total / s.count;
            if (avg > bestAvg) { bestAvg = avg; bestId = id; }
          });
          if (bestId) {
            topWineName = wineNameMap[bestId] || "—";
            topWineDetail = `${bestAvg.toFixed(1)}⭐ (${wineScores[bestId].count} aval.)`;
          }
        }

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

      // Weekly chart
      const weeklyChart: { date: string; leads: number; sales: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        const ds = d.toISOString().slice(0, 10);
        const nextD = new Date(d); nextD.setDate(nextD.getDate() + 1);
        const nds = nextD.toISOString().slice(0, 10);
        const { count: lc } = await supabase
          .from("users_leads").select("id", { count: "exact", head: true })
          .eq("winery_id", winery_id).gte("created_at", ds).lt("created_at", nds);
        const daySales = (allVouchers ?? [])
          .filter(v => v.redeemed && v.created_at >= ds && v.created_at < nds)
          .reduce((s, v) => s + Number(v.total || 0), 0);
        weeklyChart.push({ date: ds, leads: lc ?? 0, sales: daySales });
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
        if (l.acquisition_location) {
          originDist[l.acquisition_location] = (originDist[l.acquisition_location] || 0) + 1;
        }
        if (l.preferences_summary) {
          const prefs = l.preferences_summary.split(",").map((p: string) => p.trim()).filter(Boolean);
          for (const p of prefs) {
            prefDist[p] = (prefDist[p] || 0) + 1;
          }
        }
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
        top_wine_detail: topWineDetail,
        avg_satisfaction: avgSatisfaction,
        ratings_today: ratingsToday,
        weekly_chart: weeklyChart,
        bi_age: toChartArray(ageDist),
        bi_origin: toChartArray(originDist).slice(0, 10),
        bi_preferences: toChartArray(prefDist).slice(0, 10),
      });
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
