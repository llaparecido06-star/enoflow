import { useState, useCallback } from "react";
import type { Wine } from "./useWinery";

export interface CartItem {
  wine: Wine;
  quantity: number;
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

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

  const total = items.reduce(
    (sum, i) => sum + i.wine.price_bottle * i.quantity,
    0
  );

  const clearCart = useCallback(() => setItems([]), []);

  return { items, addItem, removeItem, updateQuantity, total, clearCart };
}
