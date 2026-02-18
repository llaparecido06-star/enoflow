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
}

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
    const res = await supabase.functions.invoke("session-auth", {
      body: { type: "tourist", name, whatsapp, winery_id: wineryId },
    });

    if (res.error) throw res.error;
    if (res.data?.error) throw new Error(res.data.error);
    if (!res.data?.lead || !res.data?.token) throw new Error("Erro ao fazer login");

    // Store JWT token for authenticated tourist API calls
    setSessionToken(res.data.token);

    const lead = res.data.lead as Lead;
    setLead(lead);
    localStorage.setItem(`lead_${wineryId}`, JSON.stringify(lead));
  }, []);

  const logout = useCallback(() => {
    setLead(null);
    localStorage.removeItem(`lead_${wineryId}`);
    clearSessionToken();
  }, [wineryId]);

  return (
    <TouristAuthContext.Provider value={{ lead, isAuthenticated: !!lead, login, logout, isLoading }}>
      {children}
    </TouristAuthContext.Provider>
  );
}
