import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setSessionToken, clearSessionToken } from "@/lib/auth-api";

export type MasterAdminRole = "master";

export interface MasterAdmin {
  id: string;
  winery_id: string;
  email: string;
  name: string;
  role: MasterAdminRole;
}

const STORAGE_KEY = "smartsommelier_master";

export function useMasterAuth() {
  const [admin, setAdmin] = useState<MasterAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as MasterAdmin;
        if (parsed.role === "master") {
          setAdmin(parsed);
        }
      } catch {}
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.functions.invoke("session-auth", {
      body: { type: "master", email, password },
    });

    if (error) throw new Error("Credenciais inválidas ou sem permissão Master");
    if (data?.error) throw new Error(data.error);
    if (!data?.user || !data?.token) throw new Error("Credenciais inválidas ou sem permissão Master");

    // Store JWT token for authenticated API calls
    setSessionToken(data.token);

    const user = data.user as unknown as MasterAdmin;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setAdmin(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    clearSessionToken();
    setAdmin(null);
  }, []);

  return { admin, loading, login, logout };
}
