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
    const { action, voucher_code } = body;

    // Verify admin belongs to winery
    const { data: admin, error: adminErr } = await supabase
      .from("admin_users")
      .select("id, winery_id, role")
      .eq("id", admin_id)
      .eq("winery_id", winery_id)
      .single();

    if (adminErr || !admin) {
      return json({ error: "Não autorizado" }, 403);
    }

    if (action === "validate") {
      if (!voucher_code) return json({ error: "voucher_code required" }, 400);

      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .eq("winery_id", winery_id)
        .eq("code", String(voucher_code).trim().toUpperCase())
        .maybeSingle();

      if (error) throw error;
      if (!data) return json({ error: "Voucher não encontrado" }, 404);
      if (data.redeemed) return json({ error: "Voucher já foi resgatado" }, 400);

      const { error: updateErr } = await supabase
        .from("vouchers")
        .update({ redeemed: true })
        .eq("id", data.id);

      if (updateErr) throw updateErr;

      return json({ success: true, voucher: { ...data, redeemed: true } });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("admin-vouchers error:", error);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
