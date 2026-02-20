import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useWines, useTastingPackages, type Winery, type Wine } from "@/hooks/useWinery";
import { useTouristAuth } from "@/hooks/useTouristAuth";
import { useFavorites } from "@/hooks/useFavorites";
import TastingCard from "@/components/tourist/TastingCard";
import TastingWelcome from "@/components/tourist/TastingWelcome";
import { calculatePersona } from "@/components/tourist/CelebrationModal";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronLeft, ChevronRight, Wine as WineIcon, LogOut } from "lucide-react";
import { toast } from "sonner";
import { invokeAuth } from "@/lib/auth-api";
import type { Tables } from "@/integrations/supabase/types";

interface RatingEntry { wineId: string; acidity: number; body: number; sweetness: number; }

const STORAGE_KEY = "smartsommelier_tasting_progress";

function loadProgress(leadId: string, wineryId: string): { index: number; ratings: RatingEntry[]; packageId?: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.leadId === leadId && data.wineryId === wineryId) return { index: data.index ?? 0, ratings: data.ratings ?? [], packageId: data.packageId };
  } catch {}
  return null;
}

function saveProgress(leadId: string, wineryId: string, index: number, ratings: RatingEntry[], packageId?: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ leadId, wineryId, index, ratings, packageId }));
}

export default function TastingPage() {
  const { winery } = useOutletContext<{ winery: Winery; lead: Tables<"users_leads"> }>();
  const { lead } = useTouristAuth();
  const { data: wines } = useWines(winery.id);
  const { data: packages } = useTastingPackages(winery.id);
  const { isFavorite, toggleFavorite } = useFavorites(lead?.id);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load saved progress
  const saved = useMemo(() => lead ? loadProgress(lead.id, winery.id) : null, [lead, winery.id]);

  const [selectedPackageId, setSelectedPackageId] = useState<string | undefined>(saved?.packageId);
  const [currentIndex, setCurrentIndex] = useState(saved?.index ?? 0);
  const [showWelcome, setShowWelcome] = useState(!saved || saved.ratings.length === 0);
  const [localRatings, setLocalRatings] = useState<RatingEntry[]>(saved?.ratings ?? []);

  // Determine tasting wines based on selected package
  const tastingWines = useMemo(() => {
    if (selectedPackageId && packages) {
      const pkg = packages.find(p => p.id === selectedPackageId);
      if (pkg && wines) {
        return wines.filter(w => pkg.wine_ids.includes(w.id));
      }
    }
    return wines?.filter((w) => w.on_tasting) ?? [];
  }, [wines, packages, selectedPackageId]);

  const shopWines = useMemo(() => wines?.filter((w) => w.on_shop && !w.on_tasting) ?? [], [wines]);

  // Also load ratings from server on mount
  useEffect(() => {
    if (!lead?.id || localRatings.length > 0) return;
    (async () => {
      try {
        const res = await invokeAuth("tourist-actions", { action: "get_ratings" });
        if (res.data?.ratings && res.data.ratings.length > 0) {
          const serverRatings: RatingEntry[] = res.data.ratings.map((r: any) => ({
            wineId: r.wine_id,
            acidity: r.stars_acidity,
            body: r.stars_body,
            sweetness: r.stars_sweetness,
          }));
          setLocalRatings(serverRatings);
          setShowWelcome(false);
          saveProgress(lead.id, winery.id, currentIndex, serverRatings, selectedPackageId);
        }
      } catch {}
    })();
  }, [lead?.id]);

  // Save progress on changes
  useEffect(() => {
    if (lead) saveProgress(lead.id, winery.id, currentIndex, localRatings, selectedPackageId);
  }, [currentIndex, localRatings, lead, winery.id, selectedPackageId]);

  // Scroll to saved index on mount
  useEffect(() => {
    if (saved && saved.index > 0 && scrollRef.current?.children[saved.index]) {
      setTimeout(() => {
        scrollRef.current?.children[saved.index]?.scrollIntoView({ behavior: "auto", inline: "center", block: "nearest" });
      }, 300);
    }
  }, [tastingWines.length]);

  const handleStartTasting = useCallback((packageId?: string) => {
    setSelectedPackageId(packageId);
    setShowWelcome(false);
  }, []);

  const handleRatingSubmit = async (wine: Wine, ratings: { acidity: number; body: number; sweetness: number }) => {
    if (!lead) return;
    try {
      const { data, error } = await invokeAuth("tourist-actions", { action: "upsert_rating", wine_id: wine.id, stars_acidity: ratings.acidity, stars_body: ratings.body, stars_sweetness: ratings.sweetness });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Avaliação enviada com sucesso!");
      const updated = [...localRatings.filter(r => r.wineId !== wine.id), { wineId: wine.id, ...ratings }];
      setLocalRatings(updated);
    } catch {
      toast.error("Erro ao enviar avaliação");
    }
  };

  const handleFinishTasting = async () => {
    if (!lead || localRatings.length === 0) return;

    const relevantRatings = localRatings.filter(r => tastingWines.some(w => w.id === r.wineId));
    if (relevantRatings.length === 0) return;

    const avgAcidity = relevantRatings.reduce((s, r) => s + r.acidity, 0) / relevantRatings.length;
    const avgBody = relevantRatings.reduce((s, r) => s + r.body, 0) / relevantRatings.length;
    const avgSweetness = relevantRatings.reduce((s, r) => s + r.sweetness, 0) / relevantRatings.length;
    const persona = calculatePersona(avgAcidity, avgBody, avgSweetness);

    const recs = shopWines
      .map(w => ({ wine: w, score: Math.abs(w.sensory_acidity - avgAcidity) + Math.abs(w.sensory_body - avgBody) + Math.abs(w.sensory_sweetness - avgSweetness) }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map(r => r.wine);

    try {
      await invokeAuth("tourist-actions", { action: "save_persona", persona_key: persona.key, persona_label: persona.label });
    } catch {}

    navigate(`/app/${winery.slug}/journey`, {
      state: { persona, recommendations: recs, justFinished: true },
    });
  };

  const handleToggleFavorite = (wineId: string) => {
    toggleFavorite(wineId);
    if (!isFavorite(wineId)) toast.success("Adicionado aos favoritos! ❤️");
  };

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(index, tastingWines.length - 1));
    setCurrentIndex(clamped);
    scrollRef.current?.children[clamped]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const getRatingForWine = (wineId: string) => {
    const r = localRatings.find(lr => lr.wineId === wineId);
    return r ? { acidity: r.acidity, body: r.body, sweetness: r.sweetness } : undefined;
  };

  const allTastingRated = tastingWines.length > 0 && tastingWines.every(w => localRatings.some(r => r.wineId === w.id));
  const ratedCount = localRatings.filter(r => tastingWines.some(w => w.id === r.wineId)).length;

  // Welcome screen
  if (showWelcome && tastingWines.length > 0 && localRatings.length === 0) {
    return (
      <AnimatePresence>
        <TastingWelcome
          wineryName={winery.name}
          wineryLogo={winery.logo_url}
          wineCount={tastingWines.length}
          onStart={handleStartTasting}
          packages={packages}
        />
      </AnimatePresence>
    );
  }

  return (
    <div className="space-y-6">
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
                {ratedCount}/{tastingWines.length} avaliados
              </span>
              {!allTastingRated && ratedCount > 0 && (
                <span className="text-[10px] text-gold font-medium">
                  Faltam {tastingWines.length - ratedCount}!
                </span>
              )}
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div className="h-full bg-gold rounded-full" initial={{ width: 0 }}
                animate={{ width: `${(ratedCount / Math.max(tastingWines.length, 1)) * 100}%` }}
                transition={{ duration: 0.5 }} />
            </div>
          </div>
        )}

        {/* End tasting early button */}
        {ratedCount > 0 && !allTastingRated && (
          <motion.button
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleFinishTasting}
            className="w-full mb-4 py-2.5 rounded-xl border border-gold/30 text-gold text-xs font-medium hover:bg-gold/5 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Encerrar degustação e ver meu perfil
          </motion.button>
        )}

        <div ref={scrollRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 px-4"
          onScroll={(e) => {
            const el = e.currentTarget;
            const cardWidth = el.children[0]?.clientWidth ?? 1;
            const idx = Math.round(el.scrollLeft / (cardWidth + 16));
            setCurrentIndex(idx);
          }}>
          {tastingWines.map((wine, i) => (
            <TastingCard
              key={wine.id}
              wine={wine as any}
              isActive={i === currentIndex}
              onRate={(ratings) => handleRatingSubmit(wine, ratings)}
              isFavorite={isFavorite(wine.id)}
              onToggleFavorite={() => handleToggleFavorite(wine.id)}
              initialRatings={getRatingForWine(wine.id)}
              isLast={i === tastingWines.length - 1}
              allRated={allTastingRated}
              onFinish={handleFinishTasting}
            />
          ))}
        </div>

        {tastingWines.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-4">
            {tastingWines.map((_, i) => (
              <button key={i} onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? "w-6 bg-gold" : "w-1.5 bg-muted"}`} />
            ))}
          </div>
        )}

        {tastingWines.length === 0 && (
          <div className="text-center py-12">
            <WineIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nossa adega está sendo preparada para você. 🍷</p>
          </div>
        )}
      </section>
    </div>
  );
}
