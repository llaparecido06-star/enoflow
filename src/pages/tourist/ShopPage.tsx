import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useWines, type Winery, type Wine } from "@/hooks/useWinery";
import { useTouristAuth } from "@/hooks/useTouristAuth";
import WineCard from "@/components/tourist/WineCard";
import { useCart } from "@/hooks/useCart";
import { ShoppingBag, Minus, Plus, Trash2, QrCode, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function ShopPage() {
  const { winery } = useOutletContext<{ winery: Winery }>();
  const { lead } = useTouristAuth();
  const { data: wines } = useWines(winery.id);
  const { items, addItem, removeItem, updateQuantity, total, clearCart } = useCart();
  const [voucher, setVoucher] = useState<{ code: string } | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [generating, setGenerating] = useState(false);

  const shopWines = wines?.filter((w) => w.on_shop) ?? [];

  const generateVoucher = async () => {
    if (!lead) return;
    setGenerating(true);
    const slug = winery.slug.toUpperCase().slice(0, 4);
    const num = Math.floor(Math.random() * 100);
    const code = `#${slug}-${String(num).padStart(2, "0")}`;

    try {
      const { error } = await supabase.from("vouchers").insert({
        winery_id: winery.id,
        user_id: lead.id,
        code,
        items: items.map((i) => ({ wine_id: i.wine.id, name: i.wine.name, qty: i.quantity, price: i.wine.price_bottle })),
        total,
      });
      if (error) throw error;
      setVoucher({ code });
      toast.success("Voucher gerado!");
    } catch {
      toast.error("Erro ao gerar voucher");
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = () => {
    if (voucher) {
      navigator.clipboard.writeText(voucher.code);
      toast.success("Código copiado!");
    }
  };

  return (
    <div className="space-y-4">
      {items.length > 0 && !voucher && (
        <button onClick={() => setShowCart(!showCart)}
          className="w-full flex items-center justify-between bg-primary text-primary-foreground rounded-xl px-4 py-3 animate-scale-in">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            <span className="text-sm font-medium">{items.length} {items.length === 1 ? "item" : "itens"}</span>
          </div>
          <span className="font-display font-bold">R$ {total.toFixed(2)}</span>
        </button>
      )}

      {showCart && !voucher && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-3 animate-slide-up">
          <h3 className="font-display text-sm font-semibold">Seu Carrinho</h3>
          {items.map((item) => (
            <div key={item.wine.id} className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.wine.name}</p>
                <p className="text-[11px] text-muted-foreground">R$ {Number(item.wine.price_bottle).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(item.wine.id, item.quantity - 1)}
                  className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-secondary">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.wine.id, item.quantity + 1)}
                  className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-secondary">
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
            <span className="font-display font-bold text-lg">R$ {total.toFixed(2)}</span>
            <button onClick={generateVoucher} disabled={generating}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {generating ? "Gerando..." : "Gerar Voucher"}
            </button>
          </div>
        </div>
      )}

      {voucher && (
        <div className="bg-card rounded-xl border-2 border-gold/30 p-6 text-center animate-scale-in">
          <QrCode className="w-16 h-16 mx-auto text-primary mb-3" />
          <p className="text-[11px] text-muted-foreground mb-1">Apresente no caixa</p>
          <p className="font-display text-2xl font-bold text-foreground tracking-wider">{voucher.code}</p>
          <p className="text-sm text-muted-foreground mt-1">Total: R$ {total.toFixed(2)}</p>
          <div className="flex gap-2 mt-4 justify-center">
            <button onClick={copyCode} className="flex items-center gap-1.5 text-sm border border-border px-4 py-2 rounded-xl hover:bg-secondary transition-colors">
              <Copy className="w-3.5 h-3.5" /> Copiar
            </button>
            <button onClick={() => { setVoucher(null); clearCart(); setShowCart(false); }}
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors">
              Nova compra
            </button>
          </div>
        </div>
      )}

      {!voucher && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag className="w-4 h-4 text-gold" />
            <h2 className="font-display text-sm font-semibold text-foreground">Loja de Vinhos</h2>
          </div>
          <div className="space-y-3">
            {shopWines.map((wine) => (
              <WineCard key={wine.id} wine={wine} showCartButton onAddToCart={() => { addItem(wine); toast.success(`${wine.name} adicionado!`); }} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
