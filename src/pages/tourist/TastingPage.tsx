import { useState, useRef, useMemo, useCallback } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useWines, useTastingPackages, type Winery, type Wine } from "@/hooks/useWinery";
import { useTouristAuth } from "@/hooks/useTouristAuth";
import { useFavorites } from "@/hooks/useFavorites";
import TastingCard from "@/components/tourist/TastingCard";
import TastingWelcome from "@/components/tourist/TastingWelcome";
import CelebrationModal, { calculatePersona, type WinePersona } from "@/components/tourist/CelebrationModal";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Package, ChevronLeft, ChevronRight, Wine as WineIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

interface RatingEntry { wineId: string; acidity: number; body: number; sweetness: number; }

export default function TastingPage() {
  const { winery } = useOutletContext<{ winery: Winery; lead: Tables<"users_leads"> }>();
  const { lead } = useTouristAuth();
  const { data: wines } = useWines(winery.id);
  const { data: packages } = useTastingPackages(winery.id);
  const { isFavorite, toggleFavorite } = useFavorites(lead?.id);
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Immersive flow states
  const [showWelcome, setShowWelcome] = useState(true);
  const [localRatings, setLocalRatings] = useState<RatingEntry[]>([]);
  const [celebration, setCelebration] = useState<{ persona: WinePersona; recommendations: Wine[] } | null>(null);

  const tastingWines = useMemo(() => wines?.filter((w) => w.on_tasting) ?? [], [wines]);
  const shopWines = useMemo(() => wines?.filter((w) => w.on_shop && !w.on_tasting) ?? [], [wines]);

  const handleStartTasting = useCallback(() => {
    setShowWelcome(false);
  }, []);

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

      // Track local ratings for persona calculation
      const updated = [...localRatings.filter(r => r.wineId !== wine.id), { wineId: wine.id, ...ratings }];
      setLocalRatings(updated);

      // Check if all tasting wines have been rated → trigger celebration
      if (updated.length >= tastingWines.length && tastingWines.length > 0) {
        triggerCelebration(updated);
      }
    } catch {
      toast.error("Erro ao enviar avaliação");
    }
  };

  const triggerCelebration = async (ratings: RatingEntry[]) => {
    const avgAcidity = ratings.reduce((s, r) => s + r.acidity, 0) / ratings.length;
    const avgBody = ratings.reduce((s, r) => s + r.body, 0) / ratings.length;
    const avgSweetness = ratings.reduce((s, r) => s + r.sweetness, 0) / ratings.length;

    const persona = calculatePersona(avgAcidity, avgBody, avgSweetness);

    // Find compatible wines from shop
    const recs = shopWines
      .map(w => ({
        wine: w,
        score: Math.abs(w.sensory_acidity - avgAcidity) + Math.abs(w.sensory_body - avgBody) + Math.abs(w.sensory_sweetness - avgSweetness),
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map(r => r.wine);

    setCelebration({ persona, recommendations: recs });

    // Save persona to backend
    if (lead) {
      try {
        await supabase.functions.invoke("tourist-actions", {
          body: {
            action: "save_persona",
            user_id: lead.id,
            persona_key: persona.key,
            persona_label: persona.label,
          },
        });
      } catch { /* non-blocking */ }
    }
  };

  const handleAddToCart = (_wine: Wine) => {
    toast.success(`${_wine.name} adicionado ao carrinho!`);
    // Navigate to shop after brief delay
  };

  const handleGoToShop = () => {
    setCelebration(null);
    const slug = winery.slug;
    navigate(`/app/${slug}/shop`);
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

  // Welcome screen when no wines rated yet
  if (showWelcome && tastingWines.length > 0 && localRatings.length === 0) {
    return (
      <AnimatePresence>
        <TastingWelcome
          wineryName={winery.name}
          wineryLogo={winery.logo_url}
          wineCount={tastingWines.length}
          onStart={handleStartTasting}
        />
      </AnimatePresence>
    );
  }

  return (
    <div className="space-y-6">
      {/* Celebration Modal */}
      <AnimatePresence>
        {celebration && (
          <CelebrationModal
            persona={celebration.persona}
            recommendations={celebration.recommendations}
            onClose={() => setCelebration(null)}
            onAddToCart={handleAddToCart}
            onGoToShop={handleGoToShop}
          />
        )}
      </AnimatePresence>

      {/* Packages */}
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

      {/* Tasting wines section */}
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

        {/* Progress bar */}
        {tastingWines.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">
                {localRatings.length}/{tastingWines.length} avaliados
              </span>
              {localRatings.length > 0 && localRatings.length < tastingWines.length && (
                <span className="text-[10px] text-gold font-medium">
                  Faltam {tastingWines.length - localRatings.length}!
                </span>
              )}
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gold rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(localRatings.length / Math.max(tastingWines.length, 1)) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}

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
          <div className="text-center py-12">
            <WineIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Nossa adega está sendo preparada para você. 🍷
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
