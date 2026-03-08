import { useState, useCallback, useMemo, useEffect } from "react";
import type { Wine } from "./useWinery";

export interface CartItem {
  wine: Wine;
  quantity: number;
}

const CART_STORAGE_KEY = "enoflow_cart";

function loadCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function persistCart(items: CartItem[]) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  // Persist on every change
  useEffect(() => {
    persistCart(items);
  }, [items]);

  const addItem = useCallback((wine: Wine) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.wine.id === wine.id);
      if (existing) {
        return prev.map((i) =>
          i.wine.id === wine.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { wine, quantity: 1 }];
    });
  }, []);

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
    () => items.reduce((sum, i) => sum + i.wine.price_bottle * i.quantity, 0),
    [items]
  );

  const clearCart = useCallback(() => {
    setItems([]);
    try { localStorage.removeItem(CART_STORAGE_KEY); } catch {}
  }, []);

  return { items, addItem, removeItem, updateQuantity, total, clearCart };
}
