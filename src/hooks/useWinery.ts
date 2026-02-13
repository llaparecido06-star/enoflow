import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Winery = Tables<"wineries">;
export type Wine = Tables<"wines">;
export type TastingPackage = Tables<"tasting_packages">;

export function useWinery(slug: string) {
  return useQuery({
    queryKey: ["winery", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wineries")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
}

export function useWines(wineryId: string | undefined) {
  return useQuery({
    queryKey: ["wines", wineryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wines")
        .select("*")
        .eq("winery_id", wineryId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wineryId,
  });
}

export function useTastingPackages(wineryId: string | undefined) {
  return useQuery({
    queryKey: ["tasting_packages", wineryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasting_packages")
        .select("*")
        .eq("winery_id", wineryId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wineryId,
  });
}
