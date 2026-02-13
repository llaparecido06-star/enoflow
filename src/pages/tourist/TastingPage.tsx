import { useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { useWines, useTastingPackages, type Winery, type Wine } from "@/hooks/useWinery";
import { useTouristAuth } from "@/hooks/useTouristAuth";
import { useFavorites } from "@/hooks/useFavorites";
import TastingCard from "@/components/tourist/TastingCard";
import { motion } from "framer-motion";
import { Sparkles, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export default function TastingPage() {
  const { winery } = useOutletContext<{ winery: Winery; lead: Tables<"users_leads"> }>();
  const { lead } = useTouristAuth();
  const { data: wines } = useWines(winery.id);
  const { data: packages } = useTastingPackages(winery.id);
  const { isFavorite, toggleFavorite } = useFavorites(lead?.id);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const tastingWines = wines?.filter((w) => w.on_tasting) ?? [];

  const handleRatingSubmit = async (wine: Wine, ratings: { acidity: number; body: number; sweetness: number }) => {
    if (!lead) return;
    try {
      const { data, error } = await supabase.functions.invoke("tourist-actions", {
        body: {
          action: "upsert_rating",
          user_id: lead.id,
          wine_id: wine.id,
          stars_acidity: ratings.acidity,
          stars_body: ratings.body,
          stars_sweetness: ratings.sweetness,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Avaliação enviada com sucesso!");
    } catch {
      toast.error("Erro ao enviar avaliação");
    }
  };

  const handleToggleFavorite = (wineId: string) => {
    toggleFavorite(wineId);
    if (!isFavorite(wineId)) {
      toast.success("Adicionado aos favoritos! ❤️");
    }
  };

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(index, tastingWines.length - 1));
    setCurrentIndex(clamped);
    scrollRef.current?.children[clamped]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  return (
    <div className="space-y-6">
      {packages && packages.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-gold" />
            <h2 className="font-display text-sm font-semibold text-foreground">Pacotes de Degustação</h2>
          </div>
          <div className="space-y-3">
            {packages.map((pkg) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-wine/10 to-gold/10 rounded-xl border border-wine/20 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-sm font-semibold text-foreground">{pkg.name}</h3>
                    {pkg.description && <p className="text-[11px] text-muted-foreground mt-1">{pkg.description}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{pkg.wine_ids.length} vinhos incluídos</p>
                  </div>
                  <span className="font-display text-lg font-bold text-gold">R$ {Number(pkg.price).toFixed(2)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" />
            <h2 className="font-display text-sm font-semibold text-foreground">Vinhos em Degustação</h2>
          </div>
          {tastingWines.length > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <span className="text-xs text-muted-foreground font-medium tabular-nums">
                {currentIndex + 1}/{tastingWines.length}
              </span>
              <button onClick={() => goTo(currentIndex + 1)} disabled={currentIndex >= tastingWines.length - 1} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 px-4"
          onScroll={(e) => {
            const el = e.currentTarget;
            const cardWidth = el.children[0]?.clientWidth ?? 1;
            const idx = Math.round(el.scrollLeft / (cardWidth + 16));
            setCurrentIndex(idx);
          }}
        >
          {tastingWines.map((wine, i) => (
            <TastingCard
              key={wine.id}
              wine={wine as any}
              isActive={i === currentIndex}
              onRate={(ratings) => handleRatingSubmit(wine, ratings)}
              isFavorite={isFavorite(wine.id)}
              onToggleFavorite={() => handleToggleFavorite(wine.id)}
            />
          ))}
        </div>

        {tastingWines.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-4">
            {tastingWines.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentIndex ? "w-6 bg-gold" : "w-1.5 bg-muted"
                }`}
              />
            ))}
          </div>
        )}

        {tastingWines.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">
            Nenhum vinho disponível para degustação no momento.
          </p>
        )}
      </section>
    </div>
  );
}
