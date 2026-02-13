import { useState, useEffect, useCallback } from "react";

export type AdminRole = "funcionario" | "gerente" | "dono";

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
        .from("admin_users")
        .select("id, winery_id, email, name, role")
        .eq("winery_id", wineryId)
        .eq("email", email)
        .eq("password_hash", password)
        .maybeSingle();

      if (error || !data) throw new Error("Credenciais inválidas");

      const user = data as AdminUser;
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
      const hierarchy: AdminRole[] = ["funcionario", "gerente", "dono"];
      return hierarchy.indexOf(admin.role) >= hierarchy.indexOf(minRole);
    },
    [admin]
  );

  return { admin, loading, login, logout, hasPermission };
}
