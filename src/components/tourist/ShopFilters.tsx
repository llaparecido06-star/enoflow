import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, X, Heart } from "lucide-react";
import type { Wine } from "@/hooks/useWinery";

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

export { wineTypes, priceRanges, flavorProfiles };

interface ShopFiltersProps {
  search: string;
  setSearch: (v: string) => void;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  selectedType: string;
  setSelectedType: (v: string) => void;
  selectedPrice: number;
  setSelectedPrice: (v: number) => void;
  selectedFlavor: string | null;
  setSelectedFlavor: (v: string | null) => void;
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (v: boolean) => void;
  activeFilterCount: number;
  favoriteCount: number;
  t: (k: string) => string;
}

export default function ShopFilters({
  search, setSearch, showFilters, setShowFilters,
  selectedType, setSelectedType, selectedPrice, setSelectedPrice,
  selectedFlavor, setSelectedFlavor, showFavoritesOnly, setShowFavoritesOnly,
  activeFilterCount, favoriteCount, t,
}: ShopFiltersProps) {
  return (
    <>
      {/* Search bar */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("shop.search_wines")}
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
      {favoriteCount > 0 && (
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`flex items-center gap-2 mb-3 text-[11px] font-medium px-3 py-2 rounded-full border transition-all ${
            showFavoritesOnly
              ? "bg-red-500/10 text-red-400 border-red-500/30"
              : "bg-muted/50 text-muted-foreground border-border/30 hover:border-red-500/30"
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${showFavoritesOnly ? "fill-red-400" : ""}`} />
          {t("shop.my_favorites")} ({favoriteCount})
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
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-2">{t("shop.type")}</label>
                <div className="flex flex-wrap gap-1.5">
                  {wineTypes.map((type) => (
                    <button key={type} onClick={() => setSelectedType(type)}
                      className={`text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all ${
                        selectedType === type ? "bg-gold text-gold-foreground border-gold" : "bg-muted/50 text-muted-foreground border-border/30 hover:border-gold/30"
                      }`}>{type}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-2">{t("shop.price_range")}</label>
                <div className="flex flex-wrap gap-1.5">
                  {priceRanges.map((r, i) => (
                    <button key={r.label} onClick={() => setSelectedPrice(i)}
                      className={`text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all ${
                        selectedPrice === i ? "bg-gold text-gold-foreground border-gold" : "bg-muted/50 text-muted-foreground border-border/30 hover:border-gold/30"
                      }`}>{r.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-2">{t("shop.flavor_profile")}</label>
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
                  className="text-[11px] text-gold font-medium hover:underline">{t("shop.clear_filters")}</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
