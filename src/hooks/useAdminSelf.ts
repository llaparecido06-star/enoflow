import { useEffect, useState } from "react";
import { invokeAuth } from "@/lib/auth-api";

export interface AdminSelf {
  id: string;
  role: string;
  enabled_modules: string[] | null;
  capture_point_ids: string[];
}

export function useAdminSelf(adminId: string | undefined) {
  const [self, setSelf] = useState<AdminSelf | null>(null);
  useEffect(() => {
    if (!adminId) { setSelf(null); return; }
    let mounted = true;
    invokeAuth("admin-staff", { action: "self" })
      .then(({ data }) => { if (mounted && data?.me) setSelf(data.me as AdminSelf); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [adminId]);
  return self;
}
