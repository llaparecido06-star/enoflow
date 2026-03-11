import { useState, useCallback, useEffect, useRef } from "react";
import { invokeAuth } from "@/lib/auth-api";

export function useFavorites(leadId: string | undefined, wineryId?: string) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const loadedRef = useRef(false);

  // Load from server on mount
  useEffect(() => {
    if (!leadId || loadedRef.current) return;
    loadedRef.current = true;
    invokeAuth("tourist-actions", { action: "get_favorites" })
      .then(({ data }) => {
        if (data?.favorites) {
          setFavorites(data.favorites.map((f: any) => f.wine_id));
        }
      })
      .catch(() => {});
  }, [leadId]);

  // Reset when leadId changes
  useEffect(() => {
    if (!leadId) {
      setFavorites([]);
      loadedRef.current = false;
    }
  }, [leadId]);

  const toggleFavorite = useCallback((wineId: string) => {
    setFavorites((prev) => {
      const removing = prev.includes(wineId);
      const next = removing ? prev.filter((id) => id !== wineId) : [...prev, wineId];

      // Sync to server
      invokeAuth("tourist-actions", {
        action: removing ? "remove_favorite" : "add_favorite",
        wine_id: wineId,
      }).catch(() => {});

      return next;
    });
  }, []);

  const isFavorite = useCallback((wineId: string) => favorites.includes(wineId), [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}
