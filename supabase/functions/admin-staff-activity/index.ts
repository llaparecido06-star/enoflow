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

    const winery_id = session.winery_id;

    // Verify admin is owner+
    const { data: admin } = await supabase
      .from("admin_users")
      .select("id, role")
      .eq("id", session.sub)
      .eq("winery_id", winery_id)
      .single();

    if (!admin) return json({ error: "Não autorizado" }, 403);

    const roleHierarchy = ["staff", "manager", "owner", "master"];
    if (roleHierarchy.indexOf(admin.role) < roleHierarchy.indexOf("owner")) {
      return json({ error: "Sem permissão" }, 403);
    }

    const body = await req.json();
    const { action } = body;

    // ─── Get staff performance data ──────────────────────
    if (action === "performance") {
      // Get all staff members
      const { data: staffMembers } = await supabase
        .from("admin_users")
        .select("id, name, email, role, is_active")
        .eq("winery_id", winery_id)
        .neq("role", "master");

      // Get login activity (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: logins } = await supabase
        .from("staff_login_activity")
        .select("admin_id, action, created_at, metadata")
        .eq("winery_id", winery_id)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false });

      // Get voucher validations per staff (who validated)
      const { data: vouchers } = await supabase
        .from("vouchers")
        .select("id, total, redeemed, created_at, user_id")
        .eq("winery_id", winery_id)
        .eq("redeemed", true);

      // Build per-staff performance
      const staffPerformance = (staffMembers ?? []).map(member => {
        const memberLogins = (logins ?? []).filter(l => l.admin_id === member.id);
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

      // Global stats
      const totalVouchersRedeemed = vouchers?.length ?? 0;
      const totalVoucherValue = vouchers?.reduce((s, v) => s + Number(v.total || 0), 0) ?? 0;
      const uniqueClients = new Set(vouchers?.map(v => v.user_id) ?? []).size;

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
