import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Minus, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import type { CartItem } from "@/hooks/useCart";

interface ShopCartProps {
  items: CartItem[];
  total: number;
  discountedTotal: number;
  discountApplied: boolean;
  currency: string;
  showCart: boolean;
  setShowCart: (v: boolean) => void;
  updateQuantity: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  onGenerateVoucher: () => void;
  generating: boolean;
  t: (k: string) => string;
}

export default function ShopCart({
  items, total, discountedTotal, discountApplied, currency,
  showCart, setShowCart, updateQuantity, removeItem,
  onGenerateVoucher, generating, t,
}: ShopCartProps) {
  if (items.length === 0) return null;

  return (
    <>
      {/* Cart bar */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setShowCart(!showCart)}
        className="w-full flex items-center justify-between bg-gold text-gold-foreground rounded-xl px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4" />
          <span className="text-sm font-medium">{items.length} {items.length === 1 ? t("shop.item") : t("shop.items")}</span>
        </div>
        <span className="font-display font-bold">{formatCurrency(discountedTotal, currency)}{discountApplied && " (-10%)"}</span>
      </motion.button>

      {/* Cart drawer */}
      <AnimatePresence>
        {showCart && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card rounded-xl border border-border/30 p-4 space-y-3 luxury-shadow">
              <h3 className="font-display text-sm font-semibold">{t("shop.your_cart")}</h3>
              {items.map((item) => (
                <div key={item.wine.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.wine.name}</p>
                    <p className="text-[11px] text-muted-foreground">{formatCurrency(Number(item.wine.price_bottle), currency)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.wine.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.wine.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted">
                      <Plus className="w-3 h-3" />
                    </button>
                    <button onClick={() => removeItem(item.wine.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div>
                  {discountApplied && <p className="text-[10px] text-muted-foreground line-through">{formatCurrency(total, currency)}</p>}
                  <span className="font-display font-bold text-lg text-gold">{formatCurrency(discountedTotal, currency)}</span>
                  {discountApplied && <span className="text-[10px] text-green-500 ml-1 font-medium">-10%</span>}
                </div>
                <button onClick={onGenerateVoucher} disabled={generating}
                  className="bg-gold text-gold-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-gold/90 transition-colors disabled:opacity-50">
                  {generating ? t("shop.generating") : t("shop.generate_voucher")}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
