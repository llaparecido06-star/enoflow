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

    const { admin_id, winery_id } = await req.json();

    if (!admin_id || !winery_id) {
      return json({ error: "admin_id and winery_id required" }, 400);
    }

    // Verify admin belongs to winery
    const { data: admin, error: adminErr } = await supabase
      .from("admin_users")
      .select("id, role")
      .eq("id", admin_id)
      .eq("winery_id", winery_id)
      .single();

    if (adminErr || !admin) {
      return json({ error: "Não autorizado" }, 403);
    }

    // Fetch automations with lead info
    const { data: automations, error } = await supabase
      .from("automations")
      .select("id, winery_id, user_id, trigger_type, status, commission_value, created_at")
      .eq("winery_id", winery_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fetch lead names for the automations
    const userIds = [...new Set((automations ?? []).map(a => a.user_id))];
    let leadsMap: Record<string, { name: string; whatsapp: string }> = {};

    if (userIds.length > 0) {
      const { data: leads } = await supabase
        .from("users_leads")
        .select("id, name, whatsapp")
        .in("id", userIds);

      for (const lead of leads ?? []) {
        leadsMap[lead.id] = { name: lead.name, whatsapp: lead.whatsapp };
      }
    }

    const enriched = (automations ?? []).map(a => ({
      ...a,
      users_leads: leadsMap[a.user_id] || null,
    }));

    return json({ success: true, automations: enriched });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
});
