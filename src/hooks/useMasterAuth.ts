import { useState, useEffect, useCallback } from "react";

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
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.rpc("master_login", {
      p_email: email,
      p_password: password,
    });

    const result = Array.isArray(data) ? data[0] : data;
    if (error || !result) throw new Error("Credenciais inválidas ou sem permissão Master");

    const user = result as unknown as MasterAdmin;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setAdmin(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAdmin(null);
  }, []);

  return { admin, loading, login, logout };
}
