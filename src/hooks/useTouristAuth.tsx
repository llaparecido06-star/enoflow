import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setSessionToken, clearSessionToken } from "@/lib/auth-api";

interface Lead {
  id: string;
  winery_id: string;
  name: string;
  whatsapp: string;
  created_at: string;
  preferences_summary: string | null;
  birth_date: string | null;
  gender: string | null;
  income_class: string | null;
}

interface TouristAuthContextType {
  lead: Lead | null;
  isAuthenticated: boolean;
  login: (name: string, whatsapp: string, wineryId: string, acceptedTerms?: boolean, acquisitionCategory?: string, acquisitionLocation?: string) => Promise<void>;
  updateProfile: (data: { birth_date?: string; income_class?: string; preferences_summary?: string }) => Promise<void>;
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

  const login = useCallback(async (name: string, whatsapp: string, wineryId: string, acceptedTerms = false, acquisitionCategory?: string, acquisitionLocation?: string) => {
    const res = await supabase.functions.invoke("session-auth", {
      body: {
        type: "tourist", name, whatsapp, winery_id: wineryId, accepted_terms: acceptedTerms,
        acquisition_category: acquisitionCategory || undefined,
        acquisition_location: acquisitionLocation || undefined,
      },
    });

    if (res.error) throw res.error;
    if (res.data?.error) throw new Error(res.data.error);
    if (!res.data?.lead || !res.data?.token) throw new Error("Erro ao fazer login");

    setSessionToken(res.data.token);
    const lead = res.data.lead as Lead;
    setLead(lead);
    localStorage.setItem(`lead_${wineryId}`, JSON.stringify(lead));
  }, []);

  const updateProfile = useCallback(async (data: { birth_date?: string; income_class?: string; gender?: string; preferences_summary?: string }) => {
    const { invokeAuth } = await import("@/lib/auth-api");
    const res = await invokeAuth("tourist-actions", { action: "update_profile", ...data });
    if (res.error) throw res.error;
    if (res.data?.error) throw new Error(res.data.error);
    // Update local lead data
    setLead(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      localStorage.setItem(`lead_${prev.winery_id}`, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    setLead(null);
    localStorage.removeItem(`lead_${wineryId}`);
    clearSessionToken();
  }, [wineryId]);

  return (
    <TouristAuthContext.Provider value={{ lead, isAuthenticated: !!lead, login, updateProfile, logout, isLoading }}>
      {children}
    </TouristAuthContext.Provider>
  );
}
