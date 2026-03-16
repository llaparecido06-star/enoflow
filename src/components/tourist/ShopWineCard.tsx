import { motion } from "framer-motion";
import { Wine as WineIcon, Heart, Star, Plus } from "lucide-react";
import { formatCurrencyShort } from "@/lib/currency";
import ShareWineButton from "./ShareWineButton";
import { haptic } from "@/lib/haptic";
import type { Wine } from "@/hooks/useWinery";

function SensoryStarsMini({ value }: { value: number }) {
  return (
    <div className="flex gap-px">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-2.5 h-2.5 ${i < value ? "fill-gold text-gold" : "text-muted-foreground/20"}`} />
      ))}
    </div>
  );
}

export default function ShopWineCard({ wine, onAdd, onDetail, isFavorite, onToggleFavorite, translatedName, currency = "BRL", winerySlug }: {
  wine: Wine; onAdd: () => void; onDetail: () => void;
  isFavorite: boolean; onToggleFavorite: () => void; translatedName: string; currency?: string; winerySlug?: string;
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
      <div className="relative h-36 bg-gradient-to-b from-wine/15 to-transparent flex items-center justify-center cursor-pointer" onClick={onDetail}>
        {wine.image_url ? (
          <img src={wine.image_url} alt={wine.name} className="w-full h-full object-cover" />
        ) : (
          <WineIcon className="w-8 h-8 text-muted-foreground/30" />
        )}
        <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-background/30 backdrop-blur-md text-foreground border border-foreground/10">
          {wine.type}
        </span>
        <div className="absolute top-2 right-2 flex gap-1">
          {winerySlug && <ShareWineButton wine={wine} winerySlug={winerySlug} currency={currency} />}
          <button
            onClick={(e) => { e.stopPropagation(); haptic(); onToggleFavorite(); }}
            className="p-1.5 rounded-full bg-background/30 backdrop-blur-md border border-foreground/10"
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-red-500 text-red-500" : "text-foreground/60"}`} />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <h3 className="font-display text-xs font-semibold text-foreground leading-tight line-clamp-2 min-h-[2rem] cursor-pointer" onClick={onDetail}>
          {translatedName}
        </h3>
        <div className="flex items-center gap-1">
          <SensoryStarsMini value={Math.round((wine.sensory_acidity + wine.sensory_body + wine.sensory_sweetness) / 3)} />
          <span className="text-[9px] text-muted-foreground ml-1">{wine.year || ""}</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-[9px] text-muted-foreground line-through">
              {formatCurrencyShort(Number(wine.price_bottle), currency)}
            </span>
            <span className="font-display text-sm font-bold text-gold ml-1">
              {formatCurrencyShort(Math.round(Number(wine.price_bottle) * 0.9), currency)}
            </span>
            <span className="text-[8px] text-green-500 font-bold ml-0.5">-10%</span>
          </div>
          <button
            onClick={() => { haptic(); onAdd(); }}
            className="w-8 h-8 rounded-lg bg-gold text-gold-foreground flex items-center justify-center hover:bg-gold/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
