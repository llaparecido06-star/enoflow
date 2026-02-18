import { useState, useMemo, useEffect } from "react";
import { useOutletContext, useLocation } from "react-router-dom";
import { useWines, type Winery, type Wine } from "@/hooks/useWinery";
import { useTouristAuth } from "@/hooks/useTouristAuth";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Minus, Plus, Trash2, QrCode, Copy,
  Search, SlidersHorizontal, X, Wine as WineIcon, Heart, Star,
  Grape, MapPin, Thermometer, Clock, User, FlaskConical, ChevronRight
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

function SensoryStarsMini({ value }: { value: number }) {
  return (
    <div className="flex gap-px">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-2.5 h-2.5 ${i < value ? "fill-gold text-gold" : "text-muted-foreground/20"}`} />
      ))}
    </div>
  );
}

function ShopWineCard({ wine, onAdd, onDetail, isFavorite, onToggleFavorite }: {
  wine: Wine; onAdd: () => void; onDetail: () => void;
  isFavorite: boolean; onToggleFavorite: () => void;
}) {
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
      <div className="relative h-36 bg-gradient-to-b from-wine/15 to-transparent flex items-center justify-center cursor-pointer" onClick={onDetail}>
        {wine.image_url ? (
          <img src={wine.image_url} alt={wine.name} className="w-full h-full object-cover" />
        ) : (
          <WineIcon className="w-8 h-8 text-muted-foreground/30" />
        )}
        <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-background/30 backdrop-blur-md text-foreground border border-foreground/10">
          {wine.type}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-background/30 backdrop-blur-md border border-foreground/10"
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-red-500 text-red-500" : "text-foreground/60"}`} />
        </button>
      </div>

      <div className="p-3 space-y-2">
        <h3 className="font-display text-xs font-semibold text-foreground leading-tight line-clamp-2 min-h-[2rem] cursor-pointer" onClick={onDetail}>
          {wine.name}
        </h3>

        <div className="flex items-center gap-1">
          <SensoryStarsMini value={Math.round((wine.sensory_acidity + wine.sensory_body + wine.sensory_sweetness) / 3)} />
          <span className="text-[9px] text-muted-foreground ml-1">{wine.year || ""}</span>
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

function WineDetailModal({ wine, onClose, onAdd }: { wine: Wine; onClose: () => void; onAdd: () => void }) {
  const harmonizationItems = wine.harmonization?.length ? wine.harmonization : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        className="bg-card w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-border/30 luxury-shadow max-h-[85vh] overflow-y-auto"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
      >
        {/* Hero */}
        <div className="relative h-48 bg-gradient-to-b from-wine/20 to-transparent flex items-center justify-center">
          {wine.image_url ? (
            <img src={wine.image_url} alt={wine.name} className="w-full h-full object-cover rounded-t-2xl" />
          ) : (
            <WineIcon className="w-12 h-12 text-muted-foreground/30" />
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full bg-background/30 backdrop-blur-md">
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        <div className="px-5 pb-5 -mt-4 relative z-10">
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-wine/10 text-wine-light border border-wine/20 mb-2 inline-block">
            {wine.type}
          </span>
          <h2 className="font-display text-xl font-bold text-foreground">{wine.name}</h2>
          <p className="text-[11px] text-muted-foreground mb-4">{wine.year && `${wine.year} · `}{wine.grape || ""}</p>

          {wine.description && (
            <p className="text-sm text-muted-foreground italic leading-relaxed mb-4 border-l-2 border-gold/30 pl-3">
              "{wine.description}"
            </p>
          )}

          {/* Sensory stars */}
          <div className="bg-muted/30 rounded-xl p-4 mb-4">
            <span className="text-xs font-semibold text-foreground block mb-2">✨ Perfil Sensorial</span>
            <div className="space-y-1.5">
              {[
                { label: "Corpo", value: wine.sensory_body },
                { label: "Acidez", value: wine.sensory_acidity },
                { label: "Doçura", value: wine.sensory_sweetness },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < s.value ? "fill-gold text-gold" : "text-muted-foreground/20"}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ficha Técnica */}
          {(wine.grape || wine.region || wine.alcohol_content || wine.serving_temp || wine.aging || wine.enologist) && (
            <div className="mb-4">
              <span className="text-xs font-semibold text-foreground block mb-2">Ficha Técnica</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Grape, label: "Uva", value: wine.grape },
                  { icon: MapPin, label: "Região", value: wine.region },
                  { icon: FlaskConical, label: "Teor", value: wine.alcohol_content },
                  { icon: Thermometer, label: "Servir", value: wine.serving_temp },
                  { icon: Clock, label: "Envelhecimento", value: wine.aging },
                  { icon: User, label: "Enólogo", value: wine.enologist },
                ].filter(i => i.value).map(item => (
                  <div key={item.label} className="bg-muted/30 rounded-lg p-2.5">
                    <div className="flex items-center gap-1 mb-0.5">
                      <item.icon className="w-3 h-3 text-gold" />
                      <span className="text-[9px] text-muted-foreground">{item.label}</span>
                    </div>
                    <p className="text-[11px] font-medium text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aromatic notes */}
          {wine.aromatic_notes && wine.aromatic_notes.length > 0 && (
            <div className="mb-4">
              <span className="text-xs font-semibold text-foreground block mb-2">Notas Aromáticas</span>
              <div className="flex flex-wrap gap-1.5">
                {wine.aromatic_notes.map((note) => (
                  <span key={note} className="text-[11px] bg-muted/50 border border-border/30 rounded-full px-2.5 py-1 text-muted-foreground">
                    {note}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Harmonization */}
          {harmonizationItems.length > 0 && (
            <div className="mb-4">
              <span className="text-xs font-semibold text-foreground block mb-2">Harmonização</span>
              <div className="space-y-1.5">
                {harmonizationItems.map((item) => (
                  <div key={item} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
                    <span className="text-[11px] text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price + Add to cart */}
          <div className="flex items-center justify-between pt-3 border-t border-border/30">
            <div>
              <span className="font-display text-xl font-bold text-gold">R$ {Number(wine.price_bottle).toFixed(2)}</span>
              {wine.price_glass && (
                <span className="text-[10px] text-muted-foreground ml-2">Taça R$ {Number(wine.price_glass).toFixed(0)}</span>
              )}
            </div>
            <button
              onClick={() => { onAdd(); onClose(); }}
              className="bg-gold text-gold-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gold/90 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Carrinho
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ShopPage() {
  const { winery } = useOutletContext<{ winery: Winery }>();
  const { lead } = useTouristAuth();
  const { data: wines } = useWines(winery.id);
  const { items, addItem, removeItem, updateQuantity, total, clearCart } = useCart();
  const { favorites, isFavorite, toggleFavorite } = useFavorites(lead?.id);
  const location = useLocation();
  const [voucher, setVoucher] = useState<{ code: string } | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState("Todos");
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [selectedFlavor, setSelectedFlavor] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [detailWine, setDetailWine] = useState<Wine | null>(null);
  const [discountApplied, setDiscountApplied] = useState(false);

  // Handle wine added from profile recommendation
  useEffect(() => {
    const navState = location.state as { addToCart?: Wine; applyDiscount?: boolean } | null;
    if (navState?.addToCart) {
      addItem(navState.addToCart);
      if (navState.applyDiscount) setDiscountApplied(true);
      setShowCart(true);
      // Clear nav state
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  const discountMultiplier = discountApplied ? 0.9 : 1;
  const discountedTotal = total * discountMultiplier;

  const shopWines = wines?.filter((w) => w.on_shop) ?? [];

  const favoriteWines = useMemo(() => shopWines.filter(w => isFavorite(w.id)), [shopWines, favorites]);

  const filteredWines = useMemo(() => {
    let result = shopWines;
    if (showFavoritesOnly) result = result.filter((w) => isFavorite(w.id));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((w) => w.name.toLowerCase().includes(q) || w.type.toLowerCase().includes(q) || w.description?.toLowerCase().includes(q));
    }
    if (selectedType !== "Todos") result = result.filter((w) => w.type === selectedType);
    const range = priceRanges[selectedPrice];
    result = result.filter((w) => w.price_bottle >= range.min && w.price_bottle < range.max);
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
  }, [shopWines, search, selectedType, selectedPrice, selectedFlavor, showFavoritesOnly, favorites]);

  const activeFilterCount = (selectedType !== "Todos" ? 1 : 0) + (selectedPrice !== 0 ? 1 : 0) + (selectedFlavor ? 1 : 0) + (showFavoritesOnly ? 1 : 0);

  const generateVoucher = async () => {
    if (!lead) return;
    setGenerating(true);
    const slug = winery.slug.toUpperCase().slice(0, 4);
    const num = Math.floor(Math.random() * 100);
    const code = `#${slug}-${String(num).padStart(2, "0")}`;
    try {
      const { data, error } = await supabase.functions.invoke("tourist-actions", {
        body: {
          action: "create_voucher",
          user_id: lead.id,
          winery_id: winery.id,
          code,
          items: items.map((i) => ({ wine_id: i.wine.id, name: i.wine.name, qty: i.quantity, price: i.wine.price_bottle * discountMultiplier })),
          total: discountedTotal,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
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
          <span className="font-display font-bold">R$ {discountedTotal.toFixed(2)}{discountApplied && " (-10%)"}</span>
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
                <div>
                  {discountApplied && <p className="text-[10px] text-muted-foreground line-through">R$ {total.toFixed(2)}</p>}
                  <span className="font-display font-bold text-lg text-gold">R$ {discountedTotal.toFixed(2)}</span>
                  {discountApplied && <span className="text-[10px] text-green-500 ml-1 font-medium">-10%</span>}
                </div>
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

      {/* Favorites Shelf */}
      {!voucher && favoriteWines.length > 0 && !showFavoritesOnly && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 fill-red-500 text-red-500" />
              <h2 className="font-display text-sm font-semibold text-foreground">Seus Favoritos</h2>
            </div>
            <button onClick={() => setShowFavoritesOnly(true)} className="text-[11px] text-gold font-medium flex items-center gap-0.5">
              Ver todos <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
            {favoriteWines.slice(0, 6).map((wine) => (
              <div key={wine.id} className="flex-shrink-0 w-32">
                <div className="bg-card rounded-xl border border-border/30 overflow-hidden" onClick={() => setDetailWine(wine)}>
                  <div className="h-24 bg-gradient-to-b from-wine/15 to-transparent flex items-center justify-center cursor-pointer">
                    {wine.image_url ? (
                      <img src={wine.image_url} alt={wine.name} className="w-full h-full object-cover" />
                    ) : (
                      <WineIcon className="w-6 h-6 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] font-semibold text-foreground line-clamp-1">{wine.name}</p>
                    <p className="text-[10px] font-bold text-gold">R$ {Number(wine.price_bottle).toFixed(0)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
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

          {/* Favorites toggle */}
          {favoriteWines.length > 0 && (
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex items-center gap-2 mb-3 text-[11px] font-medium px-3 py-2 rounded-full border transition-all ${
                showFavoritesOnly
                  ? "bg-red-500/10 text-red-400 border-red-500/30"
                  : "bg-muted/50 text-muted-foreground border-border/30 hover:border-red-500/30"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${showFavoritesOnly ? "fill-red-400" : ""}`} />
              Meus Favoritos ({favoriteWines.length})
            </button>
          )}

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
                        <button key={t} onClick={() => setSelectedType(t)}
                          className={`text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all ${
                            selectedType === t ? "bg-gold text-gold-foreground border-gold" : "bg-muted/50 text-muted-foreground border-border/30 hover:border-gold/30"
                          }`}>{t}</button>
                      ))}
                    </div>
                  </div>
                  {/* Price */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-2">Faixa de preço</label>
                    <div className="flex flex-wrap gap-1.5">
                      {priceRanges.map((r, i) => (
                        <button key={r.label} onClick={() => setSelectedPrice(i)}
                          className={`text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all ${
                            selectedPrice === i ? "bg-gold text-gold-foreground border-gold" : "bg-muted/50 text-muted-foreground border-border/30 hover:border-gold/30"
                          }`}>{r.label}</button>
                      ))}
                    </div>
                  </div>
                  {/* Flavor */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-2">Perfil de sabor</label>
                    <div className="flex flex-wrap gap-1.5">
                      {flavorProfiles.map((f) => (
                        <button key={f.label} onClick={() => setSelectedFlavor(selectedFlavor === f.label ? null : f.label)}
                          className={`text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all ${
                            selectedFlavor === f.label ? "bg-gold text-gold-foreground border-gold" : "bg-muted/50 text-muted-foreground border-border/30 hover:border-gold/30"
                          }`}>{f.label}</button>
                      ))}
                    </div>
                  </div>
                  {activeFilterCount > 0 && (
                    <button onClick={() => { setSelectedType("Todos"); setSelectedPrice(0); setSelectedFlavor(null); setShowFavoritesOnly(false); }}
                      className="text-[11px] text-gold font-medium hover:underline">Limpar filtros</button>
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
                  onDetail={() => setDetailWine(wine)}
                  isFavorite={isFavorite(wine.id)}
                  onToggleFavorite={() => {
                    toggleFavorite(wine.id);
                    if (!isFavorite(wine.id)) toast.success("Adicionado aos favoritos! ❤️");
                  }}
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

      {/* Wine Detail Modal */}
      <AnimatePresence>
        {detailWine && (
          <WineDetailModal
            wine={detailWine}
            onClose={() => setDetailWine(null)}
            onAdd={() => { addItem(detailWine); toast.success(`${detailWine.name} adicionado!`); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
