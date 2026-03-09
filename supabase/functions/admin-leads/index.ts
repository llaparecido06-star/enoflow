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

    // RBAC: require owner+ to access leads (aligned with frontend)
    if (!hasMinRole(admin.role, "owner")) {
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

    // Fetch capture history
    let captureMap: Record<string, { category: string | null; location: string | null; date: string }[]> = {};
    if (leadIds.length > 0) {
      const { data: captures } = await supabase
        .from("capture_history")
        .select("user_id, capture_category, capture_location, created_at")
        .eq("winery_id", winery_id)
        .in("user_id", leadIds)
        .order("created_at", { ascending: false });

      for (const c of captures ?? []) {
        if (!captureMap[c.user_id]) captureMap[c.user_id] = [];
        captureMap[c.user_id].push({
          category: c.capture_category,
          location: c.capture_location,
          date: c.created_at,
        });
      }
    }

    const enrichedLeads = (leads ?? []).map(l => ({
      ...l,
      ltv: ltvMap[l.id]?.total ?? 0,
      voucher_count: ltvMap[l.id]?.count ?? 0,
      capture_history: captureMap[l.id] ?? [],
    }));

    return json({ success: true, leads: enrichedLeads });
  } catch (error) {
    console.error("admin-leads error:", error);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
