import { verifySession, json, corsHeaders, createSupabaseAdmin, hasMinRole } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const session = await verifySession(req);
    if (!session || (session.type !== "admin" && session.type !== "master")) return json({ error: "Não autorizado" }, 401);
    if (session.type !== "master" && !hasMinRole(session.role, "owner")) return json({ error: "Apenas owner" }, 403);

    const supabase = createSupabaseAdmin();
    const body = await req.json();

    let winery_id = session.winery_id;
    if (session.type === "master" && body.winery_id) winery_id = body.winery_id;

    const { entity, admin_id, from, to, limit } = body;
    let q = supabase.from("audit_logs").select("*").eq("winery_id", winery_id);
    if (entity) q = q.eq("entity", entity);
    if (admin_id) q = q.eq("admin_id", admin_id);
    if (from) q = q.gte("created_at", from);
    if (to) q = q.lte("created_at", to);
    const { data, error } = await q.order("created_at", { ascending: false }).limit(limit ?? 200);
    if (error) throw error;

    return json({ success: true, logs: data ?? [] });
  } catch (e) {
    console.error("admin-audit error:", e);
    return json({ error: "An error occurred." }, 500);
  }
});
