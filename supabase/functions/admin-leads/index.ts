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

    const { admin_id, winery_id } = await req.json();

    if (!admin_id || !winery_id) {
      return new Response(JSON.stringify({ error: "admin_id and winery_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin belongs to winery with dono role
    const { data: admin, error: adminErr } = await supabase
      .from("admin_users")
      .select("id, role")
      .eq("id", admin_id)
      .eq("winery_id", winery_id)
      .single();

    if (adminErr || !admin) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const roleHierarchy = ["staff", "manager", "owner", "master"];
    if (roleHierarchy.indexOf(admin.role) < roleHierarchy.indexOf("owner")) {
      return new Response(JSON.stringify({ error: "Apenas owners podem acessar leads" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: leads, error } = await supabase
      .from("users_leads")
      .select("id, name, whatsapp, created_at, preferences_summary")
      .eq("winery_id", winery_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, leads: leads ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
