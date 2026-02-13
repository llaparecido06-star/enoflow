import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useWines, type Winery, type Wine } from "@/hooks/useWinery";
import { useTouristAuth } from "@/hooks/useTouristAuth";
import { useCart } from "@/hooks/useCart";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Minus, Plus, Trash2, QrCode, Copy,
  Search, SlidersHorizontal, X, Wine as WineIcon, Droplets, Circle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const wineTypes = ["Todos", "Tinto", "Branco", "Rosé", "Espumante"];
const priceRanges = [
  { label: "Todos", min: 0, max: Infinity },
  { label: "Até R$50", min: 0, max: 50 },
  { label: "R$50–100", min: 50, max: 100 },
  { label: "R$100+", min: 100, max: Infinity },
];
const flavorProfiles = [
  { label: "Encorpado", key: "sensory_body" as const, min: 4 },
  { label: "Seco", key: "sensory_sweetness" as const, max: 2 },
  { label: "Frutado", key: "sensory_sweetness" as const, min: 4 },
  { label: "Ácido", key: "sensory_acidity" as const, min: 4 },
];

function SensoryMini({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-px">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`w-1 h-3 rounded-sm ${i < value ? "bg-gold" : "bg-muted"}`} />
        ))}
      </div>
      <span className="text-[9px] text-muted-foreground">{label}</span>
    </div>
  );
}

function ShopWineCard({ wine, onAdd }: { wine: Wine; onAdd: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="bg-card rounded-xl border border-border/30 overflow-hidden luxury-shadow group"
    >
      {/* Image area */}
      <div className="relative h-36 bg-gradient-to-b from-wine/15 to-transparent flex items-center justify-center">
        {wine.image_url ? (
          <img src={wine.image_url} alt={wine.name} className="w-full h-full object-cover" />
        ) : (
          <WineIcon className="w-8 h-8 text-muted-foreground/30" />
        )}
        <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-background/30 backdrop-blur-md text-foreground border border-foreground/10">
          {wine.type}
        </span>
      </div>

      <div className="p-3 space-y-2">
        <h3 className="font-display text-xs font-semibold text-foreground leading-tight line-clamp-2 min-h-[2rem]">
          {wine.name}
        </h3>

        <div className="flex gap-2">
          <SensoryMini value={wine.sensory_acidity} label="Ac" />
          <SensoryMini value={wine.sensory_body} label="Co" />
          <SensoryMini value={wine.sensory_sweetness} label="Do" />
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="font-display text-sm font-bold text-gold">
              R$ {Number(wine.price_bottle).toFixed(0)}
            </span>
            {wine.price_glass && (
              <span className="text-[9px] text-muted-foreground ml-1">
                Taça {Number(wine.price_glass).toFixed(0)}
              </span>
            )}
          </div>
          <button
            onClick={onAdd}
            className="w-8 h-8 rounded-lg bg-gold text-gold-foreground flex items-center justify-center hover:bg-gold/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function ShopPage() {
  const { winery } = useOutletContext<{ winery: Winery }>();
  const { lead } = useTouristAuth();
  const { data: wines } = useWines(winery.id);
  const { items, addItem, removeItem, updateQuantity, total, clearCart } = useCart();
  const [voucher, setVoucher] = useState<{ code: string } | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState("Todos");
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [selectedFlavor, setSelectedFlavor] = useState<string | null>(null);

  const shopWines = wines?.filter((w) => w.on_shop) ?? [];

  const filteredWines = useMemo(() => {
    let result = shopWines;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((w) => w.name.toLowerCase().includes(q) || w.type.toLowerCase().includes(q) || w.description?.toLowerCase().includes(q));
    }

    // Type filter
    if (selectedType !== "Todos") {
      result = result.filter((w) => w.type === selectedType);
    }

    // Price filter
    const range = priceRanges[selectedPrice];
    result = result.filter((w) => w.price_bottle >= range.min && w.price_bottle < range.max);

    // Flavor filter
    if (selectedFlavor) {
      const profile = flavorProfiles.find((f) => f.label === selectedFlavor);
      if (profile) {
        result = result.filter((w) => {
          const val = w[profile.key];
          if ('min' in profile && profile.min) return val >= profile.min;
          if ('max' in profile && profile.max) return val <= profile.max;
          return true;
        });
      }
    }

    return result;
  }, [shopWines, search, selectedType, selectedPrice, selectedFlavor]);

  const activeFilterCount = (selectedType !== "Todos" ? 1 : 0) + (selectedPrice !== 0 ? 1 : 0) + (selectedFlavor ? 1 : 0);

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
      {/* Cart bar */}
      {items.length > 0 && !voucher && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setShowCart(!showCart)}
          className="w-full flex items-center justify-between bg-gold text-gold-foreground rounded-xl px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            <span className="text-sm font-medium">{items.length} {items.length === 1 ? "item" : "itens"}</span>
          </div>
          <span className="font-display font-bold">R$ {total.toFixed(2)}</span>
        </motion.button>
      )}

      {/* Cart drawer */}
      <AnimatePresence>
        {showCart && !voucher && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card rounded-xl border border-border/30 p-4 space-y-3 luxury-shadow">
              <h3 className="font-display text-sm font-semibold">Seu Carrinho</h3>
              {items.map((item) => (
                <div key={item.wine.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.wine.name}</p>
                    <p className="text-[11px] text-muted-foreground">R$ {Number(item.wine.price_bottle).toFixed(2)}</p>
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
                <span className="font-display font-bold text-lg text-gold">R$ {total.toFixed(2)}</span>
                <button onClick={generateVoucher} disabled={generating}
                  className="bg-gold text-gold-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-gold/90 transition-colors disabled:opacity-50">
                  {generating ? "Gerando..." : "Gerar Voucher"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voucher */}
      {voucher && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-xl border-2 border-gold/30 p-6 text-center luxury-shadow"
        >
          <QrCode className="w-16 h-16 mx-auto text-gold mb-3" />
          <p className="text-[11px] text-muted-foreground mb-1">Apresente no caixa</p>
          <p className="font-display text-2xl font-bold text-foreground tracking-wider">{voucher.code}</p>
          <p className="text-sm text-muted-foreground mt-1">Total: R$ {total.toFixed(2)}</p>
          <div className="flex gap-2 mt-4 justify-center">
            <button onClick={copyCode} className="flex items-center gap-1.5 text-sm border border-border px-4 py-2 rounded-xl hover:bg-muted transition-colors">
              <Copy className="w-3.5 h-3.5" /> Copiar
            </button>
            <button onClick={() => { setVoucher(null); clearCart(); setShowCart(false); }}
              className="text-sm bg-gold text-gold-foreground px-4 py-2 rounded-xl hover:bg-gold/90 transition-colors">
              Nova compra
            </button>
          </div>
        </motion.div>
      )}

      {/* Shop */}
      {!voucher && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="w-4 h-4 text-gold" />
            <h2 className="font-display text-sm font-semibold text-foreground">Descubra nossos rótulos</h2>
          </div>

          {/* Search bar */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar vinhos..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/20"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative p-2.5 rounded-xl border transition-colors ${showFilters ? "bg-gold text-gold-foreground border-gold" : "bg-card border-border/30 text-muted-foreground hover:border-gold/30"}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-wine text-wine-foreground text-[9px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Filters panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-3"
              >
                <div className="bg-card rounded-xl border border-border/30 p-4 space-y-4">
                  {/* Type */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-2">Tipo</label>
                    <div className="flex flex-wrap gap-1.5">
                      {wineTypes.map((t) => (
                        <button
                          key={t}
                          onClick={() => setSelectedType(t)}
                          className={`text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all ${
                            selectedType === t ? "bg-gold text-gold-foreground border-gold" : "bg-muted/50 text-muted-foreground border-border/30 hover:border-gold/30"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-2">Faixa de preço</label>
                    <div className="flex flex-wrap gap-1.5">
                      {priceRanges.map((r, i) => (
                        <button
                          key={r.label}
                          onClick={() => setSelectedPrice(i)}
                          className={`text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all ${
                            selectedPrice === i ? "bg-gold text-gold-foreground border-gold" : "bg-muted/50 text-muted-foreground border-border/30 hover:border-gold/30"
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Flavor */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-2">Perfil de sabor</label>
                    <div className="flex flex-wrap gap-1.5">
                      {flavorProfiles.map((f) => (
                        <button
                          key={f.label}
                          onClick={() => setSelectedFlavor(selectedFlavor === f.label ? null : f.label)}
                          className={`text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all ${
                            selectedFlavor === f.label ? "bg-gold text-gold-foreground border-gold" : "bg-muted/50 text-muted-foreground border-border/30 hover:border-gold/30"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clear all */}
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => { setSelectedType("Todos"); setSelectedPrice(0); setSelectedFlavor(null); }}
                      className="text-[11px] text-gold font-medium hover:underline"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results count */}
          <p className="text-[10px] text-muted-foreground mb-3">
            {filteredWines.length} {filteredWines.length === 1 ? "vinho encontrado" : "vinhos encontrados"}
          </p>

          {/* Grid */}
          <motion.div layout className="grid grid-cols-2 gap-3">
            <AnimatePresence>
              {filteredWines.map((wine) => (
                <ShopWineCard
                  key={wine.id}
                  wine={wine}
                  onAdd={() => { addItem(wine); toast.success(`${wine.name} adicionado!`); }}
                />
              ))}
            </AnimatePresence>
          </motion.div>

          {filteredWines.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum vinho encontrado com esses filtros.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
