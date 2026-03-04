import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MenuItem {
  id: string;
  winery_id: string;
  name: string;
  category: string;
  price: number;
  description: string | null;
  suggested_wine_id: string | null;
  image_url: string | null;
  capture_point_ids: string[];
  created_at: string;
}

export function useMenuItems(wineryId: string | undefined) {
  return useQuery({
    queryKey: ["menu_items", wineryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("winery_id", wineryId!)
        .order("category")
        .order("name");
      if (error) throw error;
      return (data ?? []) as MenuItem[];
    },
    enabled: !!wineryId,
  });
}
