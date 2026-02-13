import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Lead = Tables<"users_leads">;

interface TouristAuthContextType {
  lead: Lead | null;
  isAuthenticated: boolean;
  login: (name: string, whatsapp: string, wineryId: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const TouristAuthContext = createContext<TouristAuthContextType | null>(null);

export function useTouristAuth() {
  const ctx = useContext(TouristAuthContext);
  if (!ctx) throw new Error("useTouristAuth must be inside TouristAuthProvider");
  return ctx;
}

export function TouristAuthProvider({ children, wineryId }: { children: ReactNode; wineryId: string }) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(`lead_${wineryId}`);
    if (stored) {
      try {
        setLead(JSON.parse(stored));
      } catch {}
    }
    setIsLoading(false);
  }, [wineryId]);

  const login = useCallback(async (name: string, whatsapp: string, wineryId: string) => {
    // Check if lead already exists for this whatsapp + winery
    const { data: existing } = await supabase
      .from("users_leads")
      .select("*")
      .eq("winery_id", wineryId)
      .eq("whatsapp", whatsapp)
      .maybeSingle();

    if (existing) {
      setLead(existing);
      localStorage.setItem(`lead_${wineryId}`, JSON.stringify(existing));
      return;
    }

    const { data, error } = await supabase
      .from("users_leads")
      .insert({ name, whatsapp, winery_id: wineryId })
      .select()
      .single();

    if (error) throw error;
    setLead(data);
    localStorage.setItem(`lead_${wineryId}`, JSON.stringify(data));
  }, []);

  const logout = useCallback(() => {
    setLead(null);
    localStorage.removeItem(`lead_${wineryId}`);
  }, [wineryId]);

  return (
    <TouristAuthContext.Provider value={{ lead, isAuthenticated: !!lead, login, logout, isLoading }}>
      {children}
    </TouristAuthContext.Provider>
  );
}
