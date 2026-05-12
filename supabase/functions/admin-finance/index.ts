import { verifySession, json, corsHeaders, createSupabaseAdmin, hasMinRole } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const session = await verifySession(req);
    if (!session || (session.type !== "admin" && session.type !== "master")) return json({ error: "Não autorizado" }, 401);

    const supabase = createSupabaseAdmin();
    const body = await req.json();
    const { action } = body;

    let winery_id = session.winery_id;
    if (session.type === "master" && body.winery_id) winery_id = body.winery_id;

    // Finance is manager+ only
    if (session.type !== "master" && !hasMinRole(session.role, "manager")) {
      return json({ error: "Permissão insuficiente" }, 403);
    }

    const fromIso = body.from ? new Date(body.from).toISOString() : new Date(Date.now() - 30 * 86400 * 1000).toISOString();
    const toIso = body.to ? new Date(body.to).toISOString() : new Date().toISOString();

    // Fetch vouchers in range
    const { data: vouchers, error } = await supabase
      .from("vouchers")
      .select("id, code, total, redeemed, channel, created_at, items, nps_score")
      .eq("winery_id", winery_id)
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: false });
    if (error) throw error;

    // Winery commission rate
    const { data: winery } = await supabase.from("wineries").select("platform_commission_rate, currency").eq("id", winery_id).single();
    const commissionRate = Number(winery?.platform_commission_rate ?? 0);

    const all = vouchers ?? [];

    if (action === "summary") {
      const revenue = all.reduce((s: number, v: any) => s + Number(v.total || 0), 0);
      const redeemedCount = all.filter((v: any) => v.redeemed).length;
      const ticketAvg = all.length ? revenue / all.length : 0;
      const commission = revenue * commissionRate;

      // By channel
      const byChannel: Record<string, { revenue: number; count: number }> = {};
      for (const v of all) {
        const ch = v.channel || "mixed";
        if (!byChannel[ch]) byChannel[ch] = { revenue: 0, count: 0 };
        byChannel[ch].revenue += Number(v.total || 0);
        byChannel[ch].count += 1;
      }

      // Daily series (last N days based on range)
      const dailyMap: Record<string, number> = {};
      for (const v of all) {
        const d = new Date(v.created_at).toISOString().slice(0, 10);
        dailyMap[d] = (dailyMap[d] || 0) + Number(v.total || 0);
      }
      const daily = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, revenue]) => ({ date, revenue }));

      return json({
        success: true,
        currency: winery?.currency || "BRL",
        commission_rate: commissionRate,
        summary: { revenue, redeemed_count: redeemedCount, total_count: all.length, ticket_avg: ticketAvg, commission },
        by_channel: byChannel,
        daily,
      });
    }

    if (action === "transactions") {
      const { channel, status } = body;
      let rows = all;
      if (channel) rows = rows.filter((v: any) => v.channel === channel);
      if (status === "redeemed") rows = rows.filter((v: any) => v.redeemed);
      else if (status === "pending") rows = rows.filter((v: any) => !v.redeemed);

      // Enrich with lead name
      const userIds = Array.from(new Set(rows.map((v: any) => v.user_id).filter(Boolean)));
      // user_id field exists but wasn't selected — re-fetch minimal info
      const ids = rows.map((r: any) => r.id);
      const { data: full } = await supabase.from("vouchers").select("id, user_id").in("id", ids);
      const userMap: Record<string, string> = {};
      for (const f of full ?? []) userMap[f.id] = f.user_id;
      const allUserIds = Array.from(new Set(Object.values(userMap).filter(Boolean)));
      const { data: leads } = allUserIds.length
        ? await supabase.from("users_leads").select("id, name").in("id", allUserIds)
        : { data: [] };
      const leadMap: Record<string, string> = {};
      for (const l of leads ?? []) leadMap[l.id] = l.name;

      const transactions = rows.map((v: any) => ({
        id: v.id, code: v.code, total: Number(v.total || 0),
        channel: v.channel || "mixed",
        redeemed: v.redeemed,
        created_at: v.created_at,
        nps_score: v.nps_score,
        commission: Number(v.total || 0) * commissionRate,
        lead_name: leadMap[userMap[v.id]] || "—",
      }));
      return json({ success: true, transactions, currency: winery?.currency || "BRL" });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-finance error:", e);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
