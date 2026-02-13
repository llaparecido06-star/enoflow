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
      // Check duplicate email in same winery
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
      // Prevent editing master
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

    // ─── DEFAULT: dashboard metrics ──────────────────────
    const [wineriesRes, leadsRes, winesRes, vouchersRes, automationsRes, adminsRes] = await Promise.all([
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
    });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
});
