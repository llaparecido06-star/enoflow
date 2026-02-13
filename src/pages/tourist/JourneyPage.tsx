import { useState, useMemo, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useWines, type Winery, type Wine } from "@/hooks/useWinery";
import { useTouristAuth } from "@/hooks/useTouristAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Star, Heart, Wine as WineIcon, Trophy, TrendingUp, Sparkles, Loader2 } from "lucide-react";

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
  const [ratings, setRatings] = useState<RatingData[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(true);

  useEffect(() => {
    if (!lead?.id) { setLoadingRatings(false); return; }
    (async () => {
      try {
        const { data } = await supabase
          .from("ratings")
          .select("wine_id, stars_acidity, stars_body, stars_sweetness")
          .eq("user_id", lead.id);
        setRatings(data ?? []);
      } catch { }
      setLoadingRatings(false);
    })();
  }, [lead?.id]);
  const tastingWines = useMemo(() => wines?.filter(w => w.on_tasting) ?? [], [wines]);
  const favoriteWines = useMemo(() => wines?.filter(w => isFavorite(w.id)) ?? [], [wines, isFavorite]);

  // Calculate user flavor profile from ratings
  const flavorProfile = useMemo(() => {
    if (ratings.length === 0) return null;
    const avg = (key: keyof RatingData) =>
      ratings.reduce((s, r) => s + Number(r[key]), 0) / ratings.length;
    return {
      acidity: avg("stars_acidity"),
      body: avg("stars_body"),
      sweetness: avg("stars_sweetness"),
    };
  }, [ratings]);

  // Recommendations: wines similar to user's flavor profile that aren't in tasting
  const recommendations = useMemo(() => {
    if (!flavorProfile || !wines) return [];
    return wines
      .filter(w => !w.on_tasting && w.on_shop)
      .map(w => ({
        wine: w,
        score: Math.abs(w.sensory_acidity - flavorProfile.acidity) +
               Math.abs(w.sensory_body - flavorProfile.body) +
               Math.abs(w.sensory_sweetness - flavorProfile.sweetness),
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 4)
      .map(r => r.wine);
  }, [wines, flavorProfile]);

  const ratedWines = useMemo(() => {
    return ratings.map(r => {
      const wine = tastingWines.find(w => w.id === r.wine_id);
      return wine ? { wine, rating: r } : null;
    }).filter(Boolean) as { wine: Wine; rating: RatingData }[];
  }, [ratings, tastingWines]);

  if (loadingRatings) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-5 h-5 text-gold" />
          <h1 className="font-display text-lg font-bold text-foreground">Sua Jornada</h1>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Resumo da sua experiência em {winery.name}
        </p>
      </motion.div>

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
          <div className="mt-3 pt-3 border-t border-border/30">
            <p className="text-[11px] text-muted-foreground">
              {flavorProfile.body >= 4 ? "Você aprecia vinhos encorpados" :
               flavorProfile.body <= 2 ? "Você prefere vinhos leves" : "Você gosta de vinhos equilibrados"}
              {flavorProfile.sweetness >= 4 ? ", com boa doçura" :
               flavorProfile.sweetness <= 2 ? ", secos" : ""}
              {flavorProfile.acidity >= 4 ? " e vibrante acidez." :
               flavorProfile.acidity <= 2 ? " e baixa acidez." : "."}
            </p>
          </div>
        </motion.div>
      )}

      {/* Rated wines summary */}
      {ratedWines.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
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
                    <div className="flex items-center gap-0.5">
                      <span className="text-[9px] text-muted-foreground">Ac</span>
                      <div className="flex gap-px">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-2 h-2 ${i < rating.stars_acidity ? "fill-gold text-gold" : "text-muted-foreground/20"}`} />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className="text-[9px] text-muted-foreground">Co</span>
                      <div className="flex gap-px">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-2 h-2 ${i < rating.stars_body ? "fill-gold text-gold" : "text-muted-foreground/20"}`} />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className="text-[9px] text-muted-foreground">Do</span>
                      <div className="flex gap-px">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-2 h-2 ${i < rating.stars_sweetness ? "fill-gold text-gold" : "text-muted-foreground/20"}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {isFavorite(wine.id) && (
                  <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-gold" />
            <h2 className="font-display text-sm font-semibold text-foreground">Recomendados para Você</h2>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">Baseado no seu perfil de sabor</p>
          <div className="space-y-2">
            {recommendations.map((wine) => (
              <div key={wine.id} className="bg-card rounded-xl border border-border/30 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-wine/10 flex items-center justify-center flex-shrink-0">
                    {wine.image_url ? (
                      <img src={wine.image_url} alt={wine.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <WineIcon className="w-5 h-5 text-wine-light" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{wine.name}</p>
                    <p className="text-[10px] text-muted-foreground">{wine.type}{wine.year ? ` · ${wine.year}` : ""}</p>
                  </div>
                </div>
                <span className="font-display text-sm font-bold text-gold flex-shrink-0">
                  R$ {Number(wine.price_bottle).toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {ratings.length === 0 && (
        <div className="text-center py-12">
          <WineIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Avalie vinhos na degustação para ver seu perfil de sabor e recomendações personalizadas!
          </p>
        </div>
      )}
    </div>
  );
}
