import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { admin_id, action, winery_id, plan_level } = await req.json();

    if (!admin_id) {
      return new Response(JSON.stringify({ error: "admin_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify master role
    const { data: admin, error: adminErr } = await supabase
      .from("admin_users")
      .select("id, role")
      .eq("id", admin_id)
      .single();

    if (adminErr || !admin || admin.role !== "master") {
      return new Response(JSON.stringify({ error: "Acesso restrito a Master Admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_plan") {
      if (!winery_id || !plan_level) {
        return new Response(JSON.stringify({ error: "winery_id and plan_level required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase
        .from("wineries")
        .update({ plan_level })
        .eq("id", winery_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: fetch dashboard metrics
    const [
      wineriesRes,
      leadsRes,
      winesRes,
      vouchersRes,
      automationsRes,
      adminsRes,
    ] = await Promise.all([
      supabase.from("wineries").select("id, name, slug, plan_level, primary_color, created_at"),
      supabase.from("users_leads").select("id, winery_id, created_at"),
      supabase.from("wines").select("id, winery_id"),
      supabase.from("vouchers").select("id, winery_id, total, redeemed, created_at"),
      supabase.from("automations").select("id, winery_id, commission_value, status"),
      supabase.from("admin_users").select("id, winery_id, role"),
    ]);

    const wineries = wineriesRes.data ?? [];
    const leads = leadsRes.data ?? [];
    const wines = winesRes.data ?? [];
    const vouchers = vouchersRes.data ?? [];
    const automations = automationsRes.data ?? [];
    const admins = adminsRes.data ?? [];

    const totalVoucherValue = vouchers.reduce((s, v) => s + Number(v.total || 0), 0);
    const redeemedVoucherValue = vouchers.filter(v => v.redeemed).reduce((s, v) => s + Number(v.total || 0), 0);
    const totalCommissions = automations.reduce((s, a) => s + Number(a.commission_value || 0), 0);

    // Per-winery breakdown
    const wineryMetrics = wineries.map(w => ({
      ...w,
      leads_count: leads.filter(l => l.winery_id === w.id).length,
      wines_count: wines.filter(wi => wi.winery_id === w.id).length,
      vouchers_count: vouchers.filter(v => v.winery_id === w.id).length,
      vouchers_value: vouchers.filter(v => v.winery_id === w.id).reduce((s, v) => s + Number(v.total || 0), 0),
      admins_count: admins.filter(a => a.winery_id === w.id).length,
    }));

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

    return new Response(JSON.stringify({
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
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
