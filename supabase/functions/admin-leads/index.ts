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

    const admin_id = session.sub;
    const winery_id = session.winery_id;

    const { data: admin, error: adminErr } = await supabase
      .from("admin_users")
      .select("id, role")
      .eq("id", admin_id)
      .eq("winery_id", winery_id)
      .single();

    if (adminErr || !admin) {
      return json({ error: "Não autorizado" }, 403);
    }

    const roleHierarchy = ["staff", "manager", "owner", "master"];
    if (roleHierarchy.indexOf(admin.role) < roleHierarchy.indexOf("manager")) {
      return json({ error: "Sem permissão para acessar leads" }, 403);
    }

    // Fetch leads
    const { data: leads, error } = await supabase
      .from("users_leads")
      .select("id, name, whatsapp, created_at, preferences_summary, birth_date, income_class, gender, acquisition_category, acquisition_location")
      .eq("winery_id", winery_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fetch voucher totals per user for LTV
    const leadIds = (leads ?? []).map(l => l.id);
    let ltvMap: Record<string, { total: number; count: number }> = {};

    if (leadIds.length > 0) {
      const { data: vouchers } = await supabase
        .from("vouchers")
        .select("user_id, total, redeemed")
        .eq("winery_id", winery_id)
        .eq("redeemed", true)
        .in("user_id", leadIds);

      for (const v of vouchers ?? []) {
        if (!ltvMap[v.user_id]) ltvMap[v.user_id] = { total: 0, count: 0 };
        ltvMap[v.user_id].total += Number(v.total || 0);
        ltvMap[v.user_id].count++;
      }
    }

    const enrichedLeads = (leads ?? []).map(l => ({
      ...l,
      ltv: ltvMap[l.id]?.total ?? 0,
      voucher_count: ltvMap[l.id]?.count ?? 0,
    }));

    return json({ success: true, leads: enrichedLeads });
  } catch (error) {
    console.error("admin-leads error:", error);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
