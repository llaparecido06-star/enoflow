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
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    const body = await req.json();
    const { action, package_id, package_data } = body;

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
    console.error("admin-packages error:", error);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
