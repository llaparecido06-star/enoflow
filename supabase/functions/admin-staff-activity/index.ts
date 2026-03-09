import { verifySession, json, corsHeaders, createSupabaseAdmin, hasMinRole } from "../_shared/auth.ts";

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
    const winery_id = session.winery_id;

    const { data: admin } = await supabase
      .from("admin_users")
      .select("id, role")
      .eq("id", session.sub)
      .eq("winery_id", winery_id)
      .single();

    if (!admin) return json({ error: "Não autorizado" }, 403);
    if (!hasMinRole(admin.role, "owner")) return json({ error: "Sem permissão" }, 403);

    const body = await req.json();
    const { action } = body;

    // ─── Get staff performance data
    if (action === "performance") {
      const [staffRes, loginsRes, vouchersRes] = await Promise.all([
        supabase.from("admin_users")
          .select("id, name, email, role, is_active")
          .eq("winery_id", winery_id)
          .neq("role", "master"),
        supabase.from("staff_login_activity")
          .select("admin_id, action, created_at, metadata")
          .eq("winery_id", winery_id)
          .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order("created_at", { ascending: false }),
        supabase.from("vouchers")
          .select("id, total, redeemed, created_at, user_id")
          .eq("winery_id", winery_id)
          .eq("redeemed", true),
      ]);

      const staffPerformance = (staffRes.data ?? []).map(member => {
        const memberLogins = (loginsRes.data ?? []).filter(l => l.admin_id === member.id);
        const loginCount = memberLogins.filter(l => l.action === "login").length;
        const voucherValidations = memberLogins.filter(l => l.action === "voucher_validate").length;
        const lastLogin = memberLogins.find(l => l.action === "login");

        return {
          ...member,
          login_count_30d: loginCount,
          voucher_validations_30d: voucherValidations,
          last_login: lastLogin?.created_at || null,
          total_actions_30d: memberLogins.length,
        };
      });

      const vouchers = vouchersRes.data ?? [];
      const totalVouchersRedeemed = vouchers.length;
      const totalVoucherValue = vouchers.reduce((s, v) => s + Number(v.total || 0), 0);
      const uniqueClients = new Set(vouchers.map(v => v.user_id)).size;

      return json({
        success: true,
        staff: staffPerformance,
        stats: {
          total_vouchers_redeemed: totalVouchersRedeemed,
          total_voucher_value: totalVoucherValue,
          unique_clients: uniqueClients,
        },
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("admin-staff-activity error:", error);
    return json({ error: "An error occurred" }, 500);
  }
});
