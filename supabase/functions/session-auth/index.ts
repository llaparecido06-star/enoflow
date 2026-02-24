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

// ─── JWT Utilities ───────────────────────────────────────
function b64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function signJwt(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSeconds = 86400
): Promise<string> {
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const now = Math.floor(Date.now() / 1000);
  const body = b64url(
    new TextEncoder().encode(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSeconds }))
  );
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = b64url(
    new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${header}.${body}`)))
  );
  return `${header}.${body}.${sig}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const body = await req.json();
    const { type } = body;

    // ─── SSO LOGIN (unified) ─────────────────────────────
    if (type === "sso") {
      const { email, password } = body;
      if (!email || !password) return json({ error: "email and password required" }, 400);
      if (typeof email !== "string" || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Invalid email" }, 400);
      if (typeof password !== "string" || password.length < 6 || password.length > 100) return json({ error: "Invalid password" }, 400);

      const normalizedEmail = email.trim().toLowerCase();

      // Try master first
      const { data: masterData } = await supabase.rpc("master_login", {
        p_email: normalizedEmail,
        p_password: password,
      });
      const masterResult = Array.isArray(masterData) ? masterData[0] : masterData;

      if (masterResult) {
        const token = await signJwt(
          { sub: masterResult.id, winery_id: masterResult.winery_id, role: "master", type: "master", email: masterResult.email, name: masterResult.name },
          secret, 86400
        );
        return json({
          success: true,
          user: { id: masterResult.id, winery_id: masterResult.winery_id, email: masterResult.email, name: masterResult.name, role: masterResult.role },
          winery_slug: null,
          token,
        });
      }

      // Try regular admin via sso_login RPC
      const { data: ssoData } = await supabase.rpc("sso_login", {
        p_email: normalizedEmail,
        p_password: password,
      });
      const ssoResult = Array.isArray(ssoData) ? ssoData[0] : ssoData;

      if (!ssoResult) return json({ error: "Credenciais inválidas" }, 401);

      // Check winery status (kill switch)
      if (ssoResult.winery_status !== "active") {
        return json({ error: "Esta vinícola está temporariamente inativa. Contate a administração." }, 403);
      }

      const token = await signJwt(
        { sub: ssoResult.id, winery_id: ssoResult.winery_id, role: ssoResult.role, type: "admin", email: ssoResult.email, name: ssoResult.name },
        secret, 86400
      );
      return json({
        success: true,
        user: { id: ssoResult.id, winery_id: ssoResult.winery_id, email: ssoResult.email, name: ssoResult.name, role: ssoResult.role },
        winery_slug: ssoResult.winery_slug,
        token,
      });
    }

    // ─── ADMIN LOGIN (legacy, still used by AdminLayout) ─
    if (type === "admin") {
      const { email, password, winery_id } = body;
      if (!email || !password || !winery_id) return json({ error: "email, password, winery_id required" }, 400);
      if (typeof email !== "string" || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Invalid email" }, 400);
      if (typeof password !== "string" || password.length < 6 || password.length > 100) return json({ error: "Invalid password" }, 400);

      const normalizedEmail = email.trim().toLowerCase();

      // Check winery status
      const { data: winery } = await supabase.from("wineries").select("status").eq("id", winery_id).maybeSingle();
      if (winery && winery.status !== "active") {
        return json({ error: "Esta vinícola está temporariamente inativa." }, 403);
      }

      const { data, error } = await supabase.rpc("admin_login", {
        p_email: normalizedEmail, p_password: password, p_winery_id: winery_id,
      });
      const result = Array.isArray(data) ? data[0] : data;
      if (error || !result) return json({ error: "Credenciais inválidas" }, 401);

      // Check is_active
      const { data: adminUser } = await supabase.from("admin_users").select("is_active").eq("id", result.id).maybeSingle();
      if (adminUser && !adminUser.is_active) return json({ error: "Sua conta está desativada. Contate o administrador." }, 403);

      const token = await signJwt(
        { sub: result.id, winery_id: result.winery_id, role: result.role, type: "admin", email: result.email, name: result.name },
        secret, 86400
      );
      return json({
        success: true,
        user: { id: result.id, winery_id: result.winery_id, email: result.email, name: result.name, role: result.role },
        token,
      });
    }

    // ─── MASTER LOGIN ────────────────────────────────────
    if (type === "master") {
      const { email, password } = body;
      if (!email || !password) return json({ error: "email and password required" }, 400);
      if (typeof email !== "string" || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Invalid email" }, 400);
      if (typeof password !== "string" || password.length < 6 || password.length > 100) return json({ error: "Invalid password" }, 400);

      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.rpc("master_login", { p_email: normalizedEmail, p_password: password });
      const result = Array.isArray(data) ? data[0] : data;
      if (error || !result) return json({ error: "Credenciais inválidas ou sem permissão Master" }, 401);

      const token = await signJwt(
        { sub: result.id, winery_id: result.winery_id, role: "master", type: "master", email: result.email, name: result.name },
        secret, 86400
      );
      return json({
        success: true,
        user: { id: result.id, winery_id: result.winery_id, email: result.email, name: result.name, role: result.role },
        token,
      });
    }

    // ─── TOURIST LOGIN ───────────────────────────────────
    if (type === "tourist") {
      const { name, whatsapp, winery_id } = body;
      if (!whatsapp || !winery_id) return json({ error: "whatsapp and winery_id required" }, 400);

      // Check winery status
      const { data: winery } = await supabase.from("wineries").select("status").eq("id", winery_id).maybeSingle();
      if (winery && winery.status !== "active") {
        return json({ error: "Esta experiência está temporariamente indisponível." }, 403);
      }

      const { data: existing } = await supabase
        .from("users_leads")
        .select("id, winery_id, name, whatsapp, created_at, preferences_summary, accepted_terms, lgpd_consent_date")
        .eq("winery_id", winery_id)
        .eq("whatsapp", whatsapp)
        .maybeSingle();

      let lead = existing;

      if (!existing) {
        if (!name) return json({ error: "name required for new leads" }, 400);
        const { data, error } = await supabase
          .from("users_leads")
          .insert({
            name, whatsapp, winery_id,
            accepted_terms: body.accepted_terms === true,
            lgpd_consent_date: body.accepted_terms === true ? new Date().toISOString() : null,
          })
          .select("id, winery_id, name, whatsapp, created_at, preferences_summary, accepted_terms, lgpd_consent_date")
          .single();
        if (error) throw error;
        lead = data;
      } else if (!existing.accepted_terms && body.accepted_terms === true) {
        await supabase
          .from("users_leads")
          .update({ accepted_terms: true, lgpd_consent_date: new Date().toISOString() })
          .eq("id", existing.id);
        lead = { ...existing, accepted_terms: true, lgpd_consent_date: new Date().toISOString() };
      }

      const token = await signJwt(
        { sub: lead!.id, winery_id: lead!.winery_id, type: "tourist" },
        secret, 604800
      );
      return json({ success: true, lead, token });
    }

    return json({ error: "Invalid type. Use: sso, admin, master, or tourist" }, 400);
  } catch (error) {
    console.error("session-auth error:", error);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
