import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
};

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
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const admin_id = session.sub;
    const winery_id = session.winery_id;

    const body = await req.json();
    const { action, item_id, item_data } = body;

    // Verify admin belongs to winery with manager+ role
    const { data: admin, error: adminErr } = await supabase
      .from("admin_users")
      .select("id, winery_id, role")
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
    if (roleHierarchy.indexOf(admin.role) < roleHierarchy.indexOf("manager")) {
      return new Response(JSON.stringify({ error: "Permissão insuficiente" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result;

    switch (action) {
      case "create": {
        const { data, error } = await supabase
          .from("menu_items")
          .insert({ ...item_data, winery_id })
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }
      case "update": {
        if (!item_id) throw new Error("item_id required");
        const { data, error } = await supabase
          .from("menu_items")
          .update(item_data)
          .eq("id", item_id)
          .eq("winery_id", winery_id)
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }
      case "delete": {
        if (!item_id) throw new Error("item_id required");
        const { error } = await supabase
          .from("menu_items")
          .delete()
          .eq("id", item_id)
          .eq("winery_id", winery_id);
        if (error) throw error;
        result = { deleted: true };
        break;
      }
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("admin-menu error:", error);
    return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
