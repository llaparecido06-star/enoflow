import { supabase } from "@/lib/supabase";

const TOKEN_KEY = "smartsommelier_session_token";

export function getSessionToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSessionToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSessionToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Invoke a Supabase edge function with the session token attached.
 * The token is sent as `x-session-token` header so the server can
 * verify identity cryptographically instead of trusting body params.
 * 
 * Supports both JSON body (Record) and FormData for file uploads.
 */
export async function invokeAuth(
  functionName: string,
  body: Record<string, unknown> | FormData = {}
) {
  const token = getSessionToken();
  return supabase.functions.invoke(functionName, {
    body,
    headers: token ? { "x-session-token": token } : {},
  });
}
