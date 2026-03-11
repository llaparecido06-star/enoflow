/**
 * Shared authentication utilities for all Edge Functions.
 * Centralizes verifySession, CORS headers, and JSON response helper.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
};

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export interface SessionPayload {
  sub: string;
  role: string;
  winery_id: string;
  type: string;
  email?: string;
  name?: string;
}

export async function verifySession(req: Request): Promise<SessionPayload | null> {
  try {
    const token = req.headers.get("x-session-token");
    if (!token) return null;
    const [hB64, pB64, sB64] = token.split(".");
    if (!hB64 || !pB64 || !sB64) return null;
    const secret = Deno.env.get("JWT_SIGNING_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sig = Uint8Array.from(
      atob(sB64.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sig,
      new TextEncoder().encode(`${hB64}.${pB64}`)
    );
    if (!valid) return null;
    const payload = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(
          atob(pB64.replace(/-/g, "+").replace(/_/g, "/")),
          (c) => c.charCodeAt(0)
        )
      )
    );
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

/** Standard role hierarchy check — supports both EN and PT role names */
const ROLE_HIERARCHY = ["staff", "manager", "owner", "master"];

const ROLE_ALIAS: Record<string, string> = {
  funcionario: "staff",
  gerente: "manager",
  dono: "owner",
};

function normalizeRole(role: string): string {
  return ROLE_ALIAS[role] || role;
}

export function hasMinRole(userRole: string, minRole: string): boolean {
  return ROLE_HIERARCHY.indexOf(normalizeRole(userRole)) >= ROLE_HIERARCHY.indexOf(normalizeRole(minRole));
}
