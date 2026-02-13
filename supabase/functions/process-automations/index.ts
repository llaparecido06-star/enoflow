import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    const { winery_id } = await req.json();

    if (!winery_id) {
      return new Response(JSON.stringify({ error: "winery_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all leads for this winery
    const { data: leads, error: leadsErr } = await supabase
      .from("users_leads")
      .select("id, name, whatsapp, created_at")
      .eq("winery_id", winery_id);

    if (leadsErr) throw leadsErr;

    const now = new Date();
    const results = { created: 0, sent: 0 };

    for (const lead of leads ?? []) {
      const createdAt = new Date(lead.created_at);
      const daysSince = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      const triggers: Array<{ type: "D+1" | "D+15"; days: number }> = [
        { type: "D+1", days: 1 },
        { type: "D+15", days: 15 },
      ];

      for (const trigger of triggers) {
        // Check if automation already exists
        const { data: existing } = await supabase
          .from("automations")
          .select("id")
          .eq("winery_id", winery_id)
          .eq("user_id", lead.id)
          .eq("trigger_type", trigger.type)
          .maybeSingle();

        if (existing) continue;

        if (daysSince >= trigger.days) {
          // Simulate sending message and create as "sent"
          const commission = trigger.type === "D+15" ? 25.0 : 0;
          await supabase.from("automations").insert({
            winery_id,
            user_id: lead.id,
            trigger_type: trigger.type,
            status: "sent",
            commission_value: commission,
          });
          results.sent++;
        } else {
          // Schedule for future
          await supabase.from("automations").insert({
            winery_id,
            user_id: lead.id,
            trigger_type: trigger.type,
            status: "scheduled",
            commission_value: 0,
          });
          results.created++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processado: ${results.sent} enviados, ${results.created} agendados`,
        ...results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
