import { useState, useCallback, useMemo, useEffect } from "react";
import type { Wine } from "./useWinery";

export interface CartItem {
  wine: Wine;
  quantity: number;
  reservedFromTasting?: boolean;
}

function getCartKey(wineryId?: string) {
  return wineryId ? `enoflow_cart_${wineryId}` : "enoflow_cart";
}

function loadCart(wineryId?: string): CartItem[] {
  try {
    const stored = localStorage.getItem(getCartKey(wineryId));
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function persistCart(items: CartItem[], wineryId?: string) {
  try {
    localStorage.setItem(getCartKey(wineryId), JSON.stringify(items));
  } catch {}
}

export function useCart(wineryId?: string, wines?: Wine[]) {
  const [items, setItems] = useState<CartItem[]>(() => loadCart(wineryId));

  // Reload cart when wineryId changes
  useEffect(() => {
    setItems(loadCart(wineryId));
  }, [wineryId]);

  // Reconcile stored cart items against fresh wines data (fixes stale/NaN prices)
  useEffect(() => {
    if (!wines || wines.length === 0) return;
    setItems((prev) => {
      let changed = false;
      const reconciled = prev
        .map((item) => {
          const fresh = wines.find((w) => w.id === item.wine.id);
          if (!fresh) return item;
          const storedPrice = Number(item.wine.price_bottle);
          const freshPrice = Number(fresh.price_bottle);
          if (
            !Number.isFinite(storedPrice) ||
            storedPrice !== freshPrice ||
            item.wine.name !== fresh.name
          ) {
            changed = true;
            return { ...item, wine: { ...item.wine, ...fresh } };
          }
          return item;
        })
        .filter((item) => Number.isFinite(Number(item.wine.price_bottle)));
      if (reconciled.length !== prev.length) changed = true;
      return changed ? reconciled : prev;
    });
  }, [wines]);

  // Persist on every change
  useEffect(() => {
    persistCart(items, wineryId);
  }, [items, wineryId]);

  const addItem = useCallback((wine: Wine, opts?: { reservedFromTasting?: boolean }) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.wine.id === wine.id);
      if (existing) {
        return prev.map((i) =>
          i.wine.id === wine.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                wine: { ...i.wine, ...wine },
                reservedFromTasting: i.reservedFromTasting || !!opts?.reservedFromTasting,
              }
            : i
        );
      }
      return [...prev, { wine, quantity: 1, reservedFromTasting: !!opts?.reservedFromTasting }];
    });
  }, []);

  const isReserved = useCallback(
    (wineId: string) => items.some((i) => i.wine.id === wineId && i.reservedFromTasting),
    [items]
  );

  const removeItem = useCallback((wineId: string) => {
    setItems((prev) => prev.filter((i) => i.wine.id !== wineId));
  }, []);

  const updateQuantity = useCallback((wineId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.wine.id !== wineId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.wine.id === wineId ? { ...i, quantity } : i))
    );
  }, []);

  const total = useMemo(
    () => items.reduce((sum, i) => {
      const p = Number(i.wine.price_bottle);
      return sum + (Number.isFinite(p) ? p : 0) * i.quantity;
    }, 0),
    [items]
  );

  const clearCart = useCallback(() => {
    setItems([]);
    try { localStorage.removeItem(getCartKey(wineryId)); } catch {}
  }, [wineryId]);

  return { items, addItem, removeItem, updateQuantity, total, clearCart, isReserved };
}
