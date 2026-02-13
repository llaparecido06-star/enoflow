import { useState, useEffect, useCallback } from "react";

export type AdminRole = "staff" | "manager" | "owner" | "master";

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

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AdminUser;
        if (parsed.winery_id === wineryId) {
          setAdmin(parsed);
        }
      } catch {}
    }
    setLoading(false);
  }, [wineryId]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .rpc("admin_login", {
          p_email: email,
          p_password: password,
          p_winery_id: wineryId,
        });

      const result = Array.isArray(data) ? data[0] : data;

      if (error || !result) throw new Error("Credenciais inválidas");

      const user = result as unknown as AdminUser;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      setAdmin(user);
      return user;
    },
    [wineryId]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
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

  return { admin, loading, login, logout, hasPermission };
}
