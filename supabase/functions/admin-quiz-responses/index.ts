import { verifySession, json, corsHeaders, createSupabaseAdmin } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const session = await verifySession(req);
    if (!session || (session.type !== "admin" && session.type !== "master")) {
      return json({ error: "Não autorizado" }, 401);
    }
    const supabase = createSupabaseAdmin();
    const body = await req.json().catch(() => ({}));
    let winery_id = session.winery_id;
    if (session.type === "master" && body.winery_id) winery_id = body.winery_id;

    const limit = Math.min(Number(body.limit) || 500, 1000);
    let q = supabase
      .from("quiz_responses")
      .select("id, lead_id, answers, summary, created_at")
      .eq("winery_id", winery_id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (body.from) q = q.gte("created_at", body.from);
    if (body.to) q = q.lte("created_at", body.to);
    const { data, error } = await q;
    if (error) throw error;

    const leadIds = Array.from(new Set((data ?? []).map((r: any) => r.lead_id).filter(Boolean)));
    let leadsMap: Record<string, { name: string; whatsapp: string }> = {};
    if (leadIds.length) {
      const { data: leads } = await supabase
        .from("users_leads")
        .select("id, name, whatsapp")
        .in("id", leadIds);
      for (const l of leads ?? []) leadsMap[l.id] = { name: l.name, whatsapp: l.whatsapp };
    }

    // Aggregate counts per question/value
    const agg: Record<string, Record<string, number>> = {};
    for (const r of data ?? []) {
      for (const a of (r.answers ?? []) as any[]) {
        const key = `${a.question_id}::${a.question}`;
        agg[key] = agg[key] || {};
        agg[key][a.value] = (agg[key][a.value] || 0) + 1;
      }
    }

    return json({
      success: true,
      responses: (data ?? []).map((r: any) => ({ ...r, lead: leadsMap[r.lead_id] ?? null })),
      aggregates: agg,
    });
  } catch (e) {
    console.error("admin-quiz-responses error:", e);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
