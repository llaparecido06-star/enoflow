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
    // Require admin or master auth to process automations
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

    const body = await req.json();
    // Use winery_id from token for admin, or from body for master
    const winery_id = session.type === "master" ? (body.winery_id || session.winery_id) : session.winery_id;

    if (!winery_id) {
      return new Response(JSON.stringify({ error: "winery_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: leads, error: leadsErr } = await supabase
      .from("users_leads")
      .select("id, name, whatsapp, created_at")
      .eq("winery_id", winery_id);

    if (leadsErr) throw leadsErr;

    const now = new Date();
    const results = { created: 0, sent: 0 };

    for (const lead of leads ?? []) {
      const createdAt = new Date(lead.created_at);
      const daysSince = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      const triggers: Array<{ type: "D+1" | "D+15"; days: number }> = [
        { type: "D+1", days: 1 },
        { type: "D+15", days: 15 },
      ];

      for (const trigger of triggers) {
        const { data: existing } = await supabase
          .from("automations")
          .select("id")
          .eq("winery_id", winery_id)
          .eq("user_id", lead.id)
          .eq("trigger_type", trigger.type)
          .maybeSingle();

        if (existing) continue;

        if (daysSince >= trigger.days) {
          const commission = trigger.type === "D+15" ? 25.0 : 0;
          await supabase.from("automations").insert({
            winery_id, user_id: lead.id, trigger_type: trigger.type, status: "sent", commission_value: commission,
          });
          results.sent++;
        } else {
          await supabase.from("automations").insert({
            winery_id, user_id: lead.id, trigger_type: trigger.type, status: "scheduled", commission_value: 0,
          });
          results.created++;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: `Processado: ${results.sent} enviados, ${results.created} agendados`, ...results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("process-automations error:", error);
    return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
