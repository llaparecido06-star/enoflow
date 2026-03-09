import { verifySession, json, corsHeaders, createSupabaseAdmin } from "../_shared/auth.ts";

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
    const body = await req.json();
    const winery_id = session.type === "master" ? (body.winery_id || session.winery_id) : session.winery_id;

    if (!winery_id) {
      return json({ error: "winery_id required" }, 400);
    }

    // Fetch all leads and existing automations in parallel
    const [leadsRes, existingRes] = await Promise.all([
      supabase
        .from("users_leads")
        .select("id, name, whatsapp, created_at")
        .eq("winery_id", winery_id),
      supabase
        .from("automations")
        .select("user_id, trigger_type")
        .eq("winery_id", winery_id),
    ]);

    if (leadsRes.error) throw leadsRes.error;

    // Build a set of existing automations for O(1) lookup
    const existingSet = new Set(
      (existingRes.data ?? []).map((a) => `${a.user_id}:${a.trigger_type}`)
    );

    const now = new Date();
    const toInsert: Array<{
      winery_id: string;
      user_id: string;
      trigger_type: "D+1" | "D+15";
      status: "sent" | "scheduled";
      commission_value: number;
    }> = [];

    const triggers: Array<{ type: "D+1" | "D+15"; days: number }> = [
      { type: "D+1", days: 1 },
      { type: "D+15", days: 15 },
    ];

    for (const lead of leadsRes.data ?? []) {
      const createdAt = new Date(lead.created_at);
      const daysSince = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      for (const trigger of triggers) {
        const key = `${lead.id}:${trigger.type}`;
        if (existingSet.has(key)) continue;

        if (daysSince >= trigger.days) {
          toInsert.push({
            winery_id,
            user_id: lead.id,
            trigger_type: trigger.type,
            status: "sent",
            commission_value: trigger.type === "D+15" ? 25.0 : 0,
          });
        } else {
          toInsert.push({
            winery_id,
            user_id: lead.id,
            trigger_type: trigger.type,
            status: "scheduled",
            commission_value: 0,
          });
        }
      }
    }

    // Batch insert all new automations at once
    let sent = 0;
    let created = 0;

    if (toInsert.length > 0) {
      const { error: insertErr } = await supabase
        .from("automations")
        .insert(toInsert);
      if (insertErr) throw insertErr;

      sent = toInsert.filter((r) => r.status === "sent").length;
      created = toInsert.filter((r) => r.status === "scheduled").length;
    }

    return json({
      success: true,
      message: `Processado: ${sent} enviados, ${created} agendados`,
      sent,
      created,
    });
  } catch (error) {
    console.error("process-automations error:", error);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
