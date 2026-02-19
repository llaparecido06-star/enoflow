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
    if (!session || (session.type !== "admin" && session.type !== "master")) {
      return json({ error: "Não autorizado" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const admin_id = session.sub;
    const winery_id = session.winery_id;

    // Verify admin belongs to winery
    const { data: admin, error: adminErr } = await supabase
      .from("admin_users")
      .select("id, role")
      .eq("id", admin_id)
      .eq("winery_id", winery_id)
      .single();

    if (adminErr || !admin) {
      return json({ error: "Não autorizado" }, 403);
    }

    const body = await req.json().catch(() => ({}));

    // ─── OWNER DASHBOARD ─────────────────────────────────
    if (body.action === "owner_dashboard") {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const monthStart = `${todayStr.slice(0, 7)}-01`;

      // Leads today (with LGPD consent)
      const { count: leadsToday } = await supabase
        .from("users_leads")
        .select("id", { count: "exact", head: true })
        .eq("winery_id", winery_id)
        .eq("accepted_terms", true)
        .gte("created_at", todayStr);

      // Leads this month
      const { count: leadsMonth } = await supabase
        .from("users_leads")
        .select("id", { count: "exact", head: true })
        .eq("winery_id", winery_id)
        .eq("accepted_terms", true)
        .gte("created_at", monthStart);

      // Total leads who have at least 1 rating (participated in tasting)
      const { data: allLeads } = await supabase
        .from("users_leads")
        .select("id")
        .eq("winery_id", winery_id);

      const leadIds = (allLeads ?? []).map((l) => l.id);

      let tastingCount = 0;
      if (leadIds.length > 0) {
        const { data: ratingsData } = await supabase
          .from("ratings")
          .select("user_id")
          .in("user_id", leadIds);
        const uniqueRaters = new Set((ratingsData ?? []).map((r) => r.user_id));
        tastingCount = uniqueRaters.size;
      }

      // Vouchers redeemed
      const { data: redeemedVouchers } = await supabase
        .from("vouchers")
        .select("total")
        .eq("winery_id", winery_id)
        .eq("redeemed", true);

      const totalRedeemed = (redeemedVouchers ?? []).reduce((s, v) => s + Number(v.total), 0);

      // Conversion rate: users who did tasting AND have a redeemed voucher
      const { data: allVouchers } = await supabase
        .from("vouchers")
        .select("user_id, redeemed")
        .eq("winery_id", winery_id);

      const voucherUsers = new Set((allVouchers ?? []).filter((v) => v.redeemed).map((v) => v.user_id));
      const conversionRate = tastingCount > 0 ? (voucherUsers.size / tastingCount) * 100 : 0;

      // Weekly chart: last 7 days
      const weeklyChart: { date: string; leads: number; redeemed: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().slice(0, 10);
        const nextD = new Date(d);
        nextD.setDate(nextD.getDate() + 1);
        const nds = nextD.toISOString().slice(0, 10);

        const { count: lc } = await supabase
          .from("users_leads")
          .select("id", { count: "exact", head: true })
          .eq("winery_id", winery_id)
          .gte("created_at", ds)
          .lt("created_at", nds);

        const { count: vc } = await supabase
          .from("vouchers")
          .select("id", { count: "exact", head: true })
          .eq("winery_id", winery_id)
          .eq("redeemed", true)
          .gte("created_at", ds)
          .lt("created_at", nds);

        weeklyChart.push({ date: ds, leads: lc ?? 0, redeemed: vc ?? 0 });
      }

      return json({
        leads_today: leadsToday ?? 0,
        leads_month: leadsMonth ?? 0,
        conversion_rate: conversionRate,
        influenced_revenue: totalRedeemed,
        weekly_chart: weeklyChart,
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
        .from("users_leads")
        .select("id, name, whatsapp")
        .in("id", userIds);

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
