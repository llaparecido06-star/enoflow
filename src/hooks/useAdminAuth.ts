import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { setSessionToken, clearSessionToken } from "@/lib/auth-api";

export type AdminRole = "staff" | "sales" | "manager" | "owner" | "master";

export interface AdminUser {
  id: string;
  winery_id: string;
  email: string;
  name: string;
  role: AdminRole;
}

const STORAGE_KEY = "smartsommelier_admin";

export function useAdminAuth(wineryId: string) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedWineryId, setCheckedWineryId] = useState<string | null>(null);

  useEffect(() => {
    setAdmin(null);

    if (!wineryId) {
      setLoading(false);
      setCheckedWineryId("");
      return;
    }

    setLoading(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AdminUser;
        if (parsed.winery_id === wineryId) {
          setAdmin(parsed);
        }
      } catch {}
    }

    setCheckedWineryId(wineryId);
    setLoading(false);
  }, [wineryId]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.functions.invoke("session-auth", {
        body: { type: "admin", email, password, winery_id: wineryId },
      });

      if (error) throw new Error("Credenciais inválidas");
      if (data?.error) throw new Error(data.error);
      if (!data?.user || !data?.token) throw new Error("Credenciais inválidas");

      // Store JWT token for authenticated API calls
      setSessionToken(data.token);

      const user = data.user as AdminUser;
      // Store minimal display info in localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      setAdmin(user);
      return user;
    },
    [wineryId]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    clearSessionToken();
    setAdmin(null);
  }, []);

  const hasPermission = useCallback(
    (minRole: AdminRole): boolean => {
      if (!admin) return false;
      const hierarchy: AdminRole[] = ["staff", "manager", "owner", "master"];
      return hierarchy.indexOf(admin.role) >= hierarchy.indexOf(minRole);
    },
    [admin]
  );

  const authLoading = loading || checkedWineryId !== wineryId;

  return { admin, loading: authLoading, login, logout, hasPermission };
}
