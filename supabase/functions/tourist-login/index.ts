import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { name, whatsapp, winery_id } = await req.json();

    if (!whatsapp || !winery_id) {
      return new Response(JSON.stringify({ error: "whatsapp and winery_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if lead exists
    const { data: existing } = await supabase
      .from("users_leads")
      .select("id, winery_id, name, whatsapp, created_at, preferences_summary")
      .eq("winery_id", winery_id)
      .eq("whatsapp", whatsapp)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ success: true, lead: existing }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create new lead
    if (!name) {
      return new Response(JSON.stringify({ error: "name required for new leads" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase
      .from("users_leads")
      .insert({ name, whatsapp, winery_id })
      .select("id, winery_id, name, whatsapp, created_at, preferences_summary")
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, lead: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
