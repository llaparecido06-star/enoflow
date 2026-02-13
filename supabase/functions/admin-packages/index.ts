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

    const body = await req.json();
    const { action, admin_id, winery_id, package_id, package_data } = body;

    if (!admin_id || !winery_id) {
      return json({ error: "admin_id and winery_id required" }, 400);
    }

    // Verify admin belongs to winery with manager+ role
    const { data: admin, error: adminErr } = await supabase
      .from("admin_users")
      .select("id, winery_id, role")
      .eq("id", admin_id)
      .eq("winery_id", winery_id)
      .single();

    if (adminErr || !admin) {
      return json({ error: "Não autorizado" }, 403);
    }

    const roleHierarchy = ["staff", "manager", "owner", "master"];
    if (roleHierarchy.indexOf(admin.role) < roleHierarchy.indexOf("manager")) {
      return json({ error: "Permissão insuficiente" }, 403);
    }

    switch (action) {
      case "create": {
        if (!package_data?.name) return json({ error: "name required" }, 400);
        const { data, error } = await supabase
          .from("tasting_packages")
          .insert({ ...package_data, winery_id })
          .select()
          .single();
        if (error) throw error;
        return json({ success: true, data });
      }
      case "update": {
        if (!package_id) return json({ error: "package_id required" }, 400);
        const { data, error } = await supabase
          .from("tasting_packages")
          .update(package_data)
          .eq("id", package_id)
          .eq("winery_id", winery_id)
          .select()
          .single();
        if (error) throw error;
        return json({ success: true, data });
      }
      case "delete": {
        if (!package_id) return json({ error: "package_id required" }, 400);
        const { error } = await supabase
          .from("tasting_packages")
          .delete()
          .eq("id", package_id)
          .eq("winery_id", winery_id);
        if (error) throw error;
        return json({ success: true, deleted: true });
      }
      default:
        return json({ error: "Invalid action" }, 400);
    }
  } catch (error) {
    return json({ error: error.message }, 500);
  }
});
