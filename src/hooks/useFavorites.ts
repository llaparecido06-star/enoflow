import { useState, useCallback, useEffect } from "react";

const STORAGE_PREFIX = "smartsommelier_favorites_";

export function useFavorites(leadId: string | undefined) {
  const [favorites, setFavorites] = useState<string[]>([]);

  const storageKey = leadId ? `${STORAGE_PREFIX}${leadId}` : null;

  useEffect(() => {
    if (!storageKey) return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setFavorites(JSON.parse(stored));
    } catch {}
  }, [storageKey]);

  const persist = useCallback((newFavs: string[]) => {
    setFavorites(newFavs);
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(newFavs));
  }, [storageKey]);

  const toggleFavorite = useCallback((wineId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(wineId) ? prev.filter((id) => id !== wineId) : [...prev, wineId];
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, [storageKey]);

  const isFavorite = useCallback((wineId: string) => favorites.includes(wineId), [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}
