import { useState, useMemo, useEffect } from "react";
import { useOutletContext, useLocation, useNavigate } from "react-router-dom";
import { useWines, type Winery, type Wine } from "@/hooks/useWinery";
import { useTouristAuth } from "@/hooks/useTouristAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import { calculatePersona, type WinePersona } from "@/components/tourist/CelebrationModal";
import Confetti from "@/components/tourist/Confetti";
import { motion } from "framer-motion";
import { Star, Heart, Wine as WineIcon, Trophy, TrendingUp, Sparkles, Loader2, ShoppingBag, User } from "lucide-react";
import { toast } from "sonner";

interface RatingData {
  wine_id: string;
  stars_acidity: number;
  stars_body: number;
  stars_sweetness: number;
}

function SensoryStars({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(value) ? "fill-gold text-gold" : "text-muted-foreground/20"}`} />
        ))}
      </div>
    </div>
  );
}

export default function JourneyPage() {
  const { winery } = useOutletContext<{ winery: Winery }>();
  const { lead } = useTouristAuth();
  const { data: wines } = useWines(winery.id);
  const { isFavorite } = useFavorites(lead?.id);
  const location = useLocation();
  const navigate = useNavigate();
  const [ratings, setRatings] = useState<RatingData[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  // Check if we arrived from the "Finalizar" button
  const navState = location.state as { persona?: WinePersona; recommendations?: Wine[]; justFinished?: boolean } | null;

  useEffect(() => {
    if (navState?.justFinished) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 4000);
      // Clear the state so refresh doesn't re-trigger confetti
      window.history.replaceState({}, "");
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (!lead?.id) { setLoadingRatings(false); return; }
    (async () => {
      try {
        const res = await supabase.functions.invoke("tourist-actions", {
          body: { action: "get_ratings", user_id: lead.id },
        });
        if (res.data?.ratings) setRatings(res.data.ratings);
      } catch { }
      setLoadingRatings(false);
    })();
  }, [lead?.id]);

  const tastingWines = useMemo(() => wines?.filter(w => w.on_tasting) ?? [], [wines]);
  const favoriteWines = useMemo(() => wines?.filter(w => isFavorite(w.id)) ?? [], [wines, isFavorite]);

  // Calculate persona from ratings or use nav state
  const flavorProfile = useMemo(() => {
    if (ratings.length === 0) return null;
    const avg = (key: keyof RatingData) =>
      ratings.reduce((s, r) => s + Number(r[key]), 0) / ratings.length;
    return { acidity: avg("stars_acidity"), body: avg("stars_body"), sweetness: avg("stars_sweetness") };
  }, [ratings]);

  const persona = useMemo(() => {
    if (navState?.persona) return navState.persona;
    if (!flavorProfile) return null;
    return calculatePersona(flavorProfile.acidity, flavorProfile.body, flavorProfile.sweetness);
  }, [navState?.persona, flavorProfile]);

  // Recommendations from nav state or computed
  const recommendations = useMemo(() => {
    if (navState?.recommendations && navState.recommendations.length > 0) return navState.recommendations;
    if (!flavorProfile || !wines) return [];
    return wines
      .filter(w => !w.on_tasting && w.on_shop)
      .map(w => ({
        wine: w,
        score: Math.abs(w.sensory_acidity - flavorProfile.acidity) + Math.abs(w.sensory_body - flavorProfile.body) + Math.abs(w.sensory_sweetness - flavorProfile.sweetness),
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map(r => r.wine);
  }, [navState?.recommendations, wines, flavorProfile]);

  const ratedWines = useMemo(() => {
    return ratings.map(r => {
      const wine = tastingWines.find(w => w.id === r.wine_id);
      return wine ? { wine, rating: r } : null;
    }).filter(Boolean) as { wine: Wine; rating: RatingData }[];
  }, [ratings, tastingWines]);

  const handleBuyNow = (wine: Wine) => {
    // Navigate to shop with the wine to add + discount flag
    navigate(`/app/${winery.slug}/shop`, {
      state: { addToCart: wine, applyDiscount: true },
    });
    toast.success(`${wine.name} adicionado com 10% OFF! 🎉`);
  };

  if (loadingRatings) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
        <span className="ml-3 text-sm text-muted-foreground italic">Consultando nosso Sommelier Digital...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {showConfetti && <Confetti />}

      {/* Persona Hero */}
      {persona ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
          className="bg-gradient-to-br from-gold/10 via-wine/5 to-card rounded-2xl border border-gold/20 p-6 text-center luxury-shadow">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
            className="text-6xl mb-3">{persona.emoji}</motion.div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-gold" />
            <span className="text-[10px] text-gold uppercase tracking-widest font-medium">Seu Paladar é</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">{persona.label}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{persona.description}</p>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-1">
            <User className="w-5 h-5 text-gold" />
            <h1 className="font-display text-lg font-bold text-foreground">Meu Perfil</h1>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Complete a degustação para descobrir seu perfil de sabor!
          </p>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border/30 p-3 text-center">
          <WineIcon className="w-4 h-4 text-wine-light mx-auto mb-1" />
          <p className="font-display text-lg font-bold text-foreground">{tastingWines.length}</p>
          <p className="text-[9px] text-muted-foreground">Degustados</p>
        </div>
        <div className="bg-card rounded-xl border border-border/30 p-3 text-center">
          <Star className="w-4 h-4 text-gold mx-auto mb-1" />
          <p className="font-display text-lg font-bold text-foreground">{ratings.length}</p>
          <p className="text-[9px] text-muted-foreground">Avaliados</p>
        </div>
        <div className="bg-card rounded-xl border border-border/30 p-3 text-center">
          <Heart className="w-4 h-4 fill-red-500 text-red-500 mx-auto mb-1" />
          <p className="font-display text-lg font-bold text-foreground">{favoriteWines.length}</p>
          <p className="text-[9px] text-muted-foreground">Favoritos</p>
        </div>
      </motion.div>

      {/* Flavor Profile */}
      {flavorProfile && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border border-border/30 p-4 luxury-shadow">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-gold" />
            <h2 className="font-display text-sm font-semibold text-foreground">Seu Perfil de Sabor</h2>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            Baseado nas suas {ratings.length} avaliações
          </p>
          <div className="space-y-2">
            <SensoryStars label="Corpo" value={flavorProfile.body} />
            <SensoryStars label="Acidez" value={flavorProfile.acidity} />
            <SensoryStars label="Doçura" value={flavorProfile.sweetness} />
          </div>
        </motion.div>
      )}

      {/* Recommendations with 1-click buy */}
      {recommendations.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-gold" />
            <h2 className="font-display text-sm font-semibold text-foreground">🍷 Vinhos perfeitos para você</h2>
          </div>
          <div className="space-y-2">
            {recommendations.map((wine) => (
              <div key={wine.id} className="bg-card rounded-xl border border-border/30 p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-wine/10 flex items-center justify-center flex-shrink-0">
                  {wine.image_url ? (
                    <img src={wine.image_url} alt={wine.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <WineIcon className="w-5 h-5 text-wine-light" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{wine.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-muted-foreground line-through">R$ {Number(wine.price_bottle).toFixed(0)}</p>
                    <p className="text-xs font-bold text-gold">R$ {(Number(wine.price_bottle) * 0.9).toFixed(0)}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleBuyNow(wine)}
                  className="bg-gold text-gold-foreground px-3 py-2 rounded-xl text-[10px] font-bold hover:bg-gold/90 transition-colors flex items-center gap-1 flex-shrink-0 whitespace-nowrap"
                >
                  <ShoppingBag className="w-3 h-3" />
                  Levar Agora
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Rated wines summary */}
      {ratedWines.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-gold" />
            <h2 className="font-display text-sm font-semibold text-foreground">Suas Avaliações</h2>
          </div>
          <div className="space-y-2">
            {ratedWines.map(({ wine, rating }) => (
              <div key={wine.id} className="bg-card rounded-xl border border-border/30 p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-wine/10 flex items-center justify-center flex-shrink-0">
                  {wine.image_url ? (
                    <img src={wine.image_url} alt={wine.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <WineIcon className="w-5 h-5 text-wine-light" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{wine.name}</p>
                  <div className="flex gap-3 mt-1">
                    {[
                      { label: "Ac", value: rating.stars_acidity },
                      { label: "Co", value: rating.stars_body },
                      { label: "Do", value: rating.stars_sweetness },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center gap-0.5">
                        <span className="text-[9px] text-muted-foreground">{label}</span>
                        <div className="flex gap-px">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-2 h-2 ${i < value ? "fill-gold text-gold" : "text-muted-foreground/20"}`} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {isFavorite(wine.id) && <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {ratings.length === 0 && !persona && (
        <div className="text-center py-12">
          <WineIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Avalie vinhos na degustação para descobrir seu perfil e receber recomendações personalizadas!
          </p>
        </div>
      )}
    </div>
  );
}
