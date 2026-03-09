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
    const secret = Deno.env.get("JWT_SIGNING_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    const winery_id = session.winery_id;
    const body = await req.json();
    const { action } = body;

    // ─── LIST campaigns ──────────────────────────
    if (action === "list") {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("winery_id", winery_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({ campaigns: data ?? [] });
    }

    // ─── CREATE campaign ─────────────────────────
    if (action === "create") {
      const { title, message, type, scheduled_at } = body;
      if (!title || !message) return json({ error: "title and message required" }, 400);

      const allowedTypes = ["promotion", "new_wine", "event", "follow_up"];
      const safeType = allowedTypes.includes(type) ? type : "promotion";

      const { data, error } = await supabase.from("campaigns").insert({
        winery_id,
        title: String(title).slice(0, 100),
        message: String(message).slice(0, 1000),
        type: safeType,
        scheduled_at: scheduled_at || null,
      }).select().single();

      if (error) throw error;
      return json({ success: true, campaign: data });
    }

    // ─── UPDATE campaign ─────────────────────────
    if (action === "update") {
      const { id, title, message, type, status, scheduled_at } = body;
      if (!id) return json({ error: "id required" }, 400);

      const updates: Record<string, unknown> = {};
      if (title) updates.title = String(title).slice(0, 100);
      if (message) updates.message = String(message).slice(0, 1000);
      const allowedTypes = ["promotion", "new_wine", "event", "follow_up"];
      if (type && allowedTypes.includes(type)) updates.type = type;
      const allowedStatuses = ["draft", "sent", "scheduled"];
      if (status && allowedStatuses.includes(status)) updates.status = status;
      if (scheduled_at !== undefined) updates.scheduled_at = scheduled_at || null;

      const { data, error } = await supabase
        .from("campaigns")
        .update(updates)
        .eq("id", id)
        .eq("winery_id", winery_id)
        .select()
        .single();

      if (error) throw error;
      return json({ success: true, campaign: data });
    }

    // ─── DELETE campaign ─────────────────────────
    if (action === "delete") {
      const { id } = body;
      if (!id) return json({ error: "id required" }, 400);

      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", id)
        .eq("winery_id", winery_id);

      if (error) throw error;
      return json({ success: true });
    }

    // ─── GET LEADS for sending ───────────────────
    if (action === "get_leads") {
      const { data, error } = await supabase
        .from("users_leads")
        .select("id, name, whatsapp")
        .eq("winery_id", winery_id)
        .order("name");

      if (error) throw error;
      return json({ leads: data ?? [] });
    }

    // ─── MARK AS SENT ────────────────────────────
    if (action === "mark_sent") {
      const { id, sent_count } = body;
      if (!id) return json({ error: "id required" }, 400);

      const { data, error } = await supabase
        .from("campaigns")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          sent_count: typeof sent_count === "number" ? sent_count : 0,
        })
        .eq("id", id)
        .eq("winery_id", winery_id)
        .select()
        .single();

      if (error) throw error;
      return json({ success: true, campaign: data });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("admin-campaigns error:", error);
    return json({ error: "An error occurred" }, 500);
  }
});
