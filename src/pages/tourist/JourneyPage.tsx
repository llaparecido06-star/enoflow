import { useState, useMemo, useEffect } from "react";
import { useOutletContext, useLocation, useNavigate } from "react-router-dom";
import { useWines, type Winery, type Wine } from "@/hooks/useWinery";
import { useTouristAuth } from "@/hooks/useTouristAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { invokeAuth } from "@/lib/auth-api";
import { calculatePersona, type WinePersona } from "@/components/tourist/CelebrationModal";
import { formatCurrencyShort, formatCurrency } from "@/lib/currency";
import Confetti from "@/components/tourist/Confetti";
import VoucherHistory from "@/components/tourist/VoucherHistory";
import QuizSommelier from "@/components/tourist/QuizSommelier";
import { motion } from "framer-motion";
import { Star, Heart, Wine as WineIcon, Trophy, TrendingUp, Sparkles, Loader2, ShoppingBag, User, Receipt, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
  const { lead, updateProfile } = useTouristAuth();
  const { data: wines } = useWines(winery.id);
  const { isFavorite } = useFavorites(lead?.id);
  const location = useLocation();
  const navigate = useNavigate();
  const [ratings, setRatings] = useState<RatingData[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);

  const navState = location.state as { persona?: WinePersona; recommendations?: Wine[]; justFinished?: boolean } | null;

  useEffect(() => {
    if (navState?.justFinished) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      window.history.replaceState({}, "");
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!lead?.id) { setLoadingRatings(false); return; }
    (async () => {
      try {
        const res = await invokeAuth("tourist-actions", { action: "get_ratings" });
        if (res.data?.ratings) setRatings(res.data.ratings);
      } catch { }
      setLoadingRatings(false);
    })();
  }, [lead?.id]);

  const tastingWines = useMemo(() => wines?.filter(w => w.on_tasting) ?? [], [wines]);
  const favoriteWines = useMemo(() => wines?.filter(w => isFavorite(w.id)) ?? [], [wines, isFavorite]);

  const flavorProfile = useMemo(() => {
    if (ratings.length === 0) return null;
    const avg = (key: keyof RatingData) =>
      ratings.reduce((s, r) => s + Number(r[key]), 0) / ratings.length;
    return { acidity: avg("stars_acidity"), body: avg("stars_body"), sweetness: avg("stars_sweetness") };
  }, [ratings]);

  // Parse quiz preferences into sensory hints
  const quizProfile = useMemo(() => {
    if (!lead?.preferences_summary) return null;
    const prefs = lead.preferences_summary.toLowerCase();
    let bodyHint = 3, acidityHint = 3, sweetnessHint = 3;
    if (prefs.includes("encorpado")) bodyHint = 5;
    else if (prefs.includes("médio")) bodyHint = 3;
    else if (prefs.includes("leve")) bodyHint = 1;
    if (prefs.includes("doce")) sweetnessHint = 5;
    else if (prefs.includes("suave")) sweetnessHint = 4;
    else if (prefs.includes("meio-seco")) sweetnessHint = 2;
    else if (prefs.includes("seco")) sweetnessHint = 1;
    return { acidity: acidityHint, body: bodyHint, sweetness: sweetnessHint };
  }, [lead?.preferences_summary]);

  // Merge tasting ratings (70%) + quiz preferences (30%) for recommendations
  const combinedProfile = useMemo(() => {
    if (flavorProfile && quizProfile) {
      return {
        acidity: flavorProfile.acidity * 0.7 + quizProfile.acidity * 0.3,
        body: flavorProfile.body * 0.7 + quizProfile.body * 0.3,
        sweetness: flavorProfile.sweetness * 0.7 + quizProfile.sweetness * 0.3,
      };
    }
    return flavorProfile || quizProfile;
  }, [flavorProfile, quizProfile]);

  const persona = useMemo(() => {
    if (navState?.persona) return navState.persona;
    if (!combinedProfile) return null;
    return calculatePersona(combinedProfile.acidity, combinedProfile.body, combinedProfile.sweetness, t);
  }, [navState?.persona, combinedProfile, t]);

  const recommendations = useMemo(() => {
    if (navState?.recommendations && navState.recommendations.length > 0) return navState.recommendations;
    if (!combinedProfile || !wines) return [];
    return wines
      .filter(w => !w.on_tasting && w.on_shop)
      .map(w => ({ wine: w, score: Math.abs(w.sensory_acidity - combinedProfile.acidity) + Math.abs(w.sensory_body - combinedProfile.body) + Math.abs(w.sensory_sweetness - combinedProfile.sweetness) }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map(r => r.wine);
  }, [navState?.recommendations, wines, combinedProfile]);

  const ratedWines = useMemo(() => {
    return ratings.map(r => {
      const wine = tastingWines.find(w => w.id === r.wine_id);
      return wine ? { wine, rating: r } : null;
    }).filter(Boolean) as { wine: Wine; rating: RatingData }[];
  }, [ratings, tastingWines]);

  const handleBuyNow = (wine: Wine) => {
    navigate(`/app/${winery.slug}/shop`, { state: { addToCart: wine, applyDiscount: true } });
    toast.success(`${wine.name} ${t("journey.added_with_discount")}`);
  };

  if (loadingRatings) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
        <span className="ml-3 text-sm text-muted-foreground italic">{t("journey.consulting")}</span>
      </div>
    );
  }

  const hasProfile = !!lead?.preferences_summary || !!persona;

  if (showQuiz) {
    return (
      <QuizSommelier
        wineryColor={winery.primary_color}
        onComplete={async (preferences) => {
          try {
            await updateProfile({ preferences_summary: preferences });
            toast.success(t("quiz.title") + " ✨");
          } catch {}
          setShowQuiz(false);
        }}
        onSkip={() => setShowQuiz(false)}
      />
    );
  }

  return (
    <div className="space-y-6 relative">
      {showConfetti && <Confetti />}

      {persona ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
          className="bg-gradient-to-br from-gold/10 via-wine/5 to-card rounded-2xl border border-gold/20 p-6 text-center luxury-shadow">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
            className="text-6xl mb-3">{persona.emoji}</motion.div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-gold" />
            <span className="text-[10px] text-gold uppercase tracking-widest font-medium">{t("journey.your_palate")}</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">{persona.label}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{persona.description}</p>
        </motion.div>
      ) : !hasProfile ? (
        /* Empty state — no quiz done */
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border/30 p-8 text-center luxury-shadow">
          <motion.div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-primary/10"
            animate={{ rotate: [0, -5, 5, -3, 3, 0] }}
            transition={{ duration: 0.6, delay: 0.3, repeat: Infinity, repeatDelay: 4 }}
          >
            <Sparkles className="w-8 h-8 text-primary" />
          </motion.div>
          <h2 className="font-display text-lg font-bold text-foreground mb-2">{t("journey.no_profile")}</h2>
          <p className="text-xs text-muted-foreground mb-5">{t("journey.empty_state")}</p>
          <motion.button
            onClick={() => setShowQuiz(true)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Sparkles className="w-4 h-4" />
            {t("journey.take_quiz")}
          </motion.button>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-1">
            <User className="w-5 h-5 text-gold" />
            <h1 className="font-display text-lg font-bold text-foreground">{t("journey.my_profile")}</h1>
          </div>
          <p className="text-[11px] text-muted-foreground">{t("journey.complete_tasting")}</p>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border/30 p-3 text-center">
          <WineIcon className="w-4 h-4 text-wine-light mx-auto mb-1" />
          <p className="font-display text-lg font-bold text-foreground">{tastingWines.length}</p>
          <p className="text-[9px] text-muted-foreground">{t("journey.tasted")}</p>
        </div>
        <div className="bg-card rounded-xl border border-border/30 p-3 text-center">
          <Star className="w-4 h-4 text-gold mx-auto mb-1" />
          <p className="font-display text-lg font-bold text-foreground">{ratings.length}</p>
          <p className="text-[9px] text-muted-foreground">{t("journey.rated")}</p>
        </div>
        <div className="bg-card rounded-xl border border-border/30 p-3 text-center">
          <Heart className="w-4 h-4 fill-red-500 text-red-500 mx-auto mb-1" />
          <p className="font-display text-lg font-bold text-foreground">{favoriteWines.length}</p>
          <p className="text-[9px] text-muted-foreground">{t("journey.favorites")}</p>
        </div>
      </motion.div>

      {flavorProfile && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border border-border/30 p-4 luxury-shadow">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-gold" />
            <h2 className="font-display text-sm font-semibold text-foreground">{t("journey.flavor_profile")}</h2>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            {t("journey.based_on")} {ratings.length} {t("journey.evaluations")}
          </p>
          <div className="space-y-2">
            <SensoryStars label={t("wine.body")} value={flavorProfile.body} />
            <SensoryStars label={t("wine.acidity")} value={flavorProfile.acidity} />
            <SensoryStars label={t("wine.sweetness")} value={flavorProfile.sweetness} />
          </div>
        </motion.div>
      )}

      {recommendations.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-gold" />
            <h2 className="font-display text-sm font-semibold text-foreground">{t("journey.perfect_wines")}</h2>
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
                    <p className="text-[10px] text-muted-foreground line-through">{formatCurrencyShort(Number(wine.price_bottle), winery.currency)}</p>
                    <p className="text-xs font-bold text-gold">{formatCurrencyShort(Number(wine.price_bottle) * 0.9, winery.currency)}</p>
                  </div>
                </div>
                <button onClick={() => handleBuyNow(wine)}
                  className="bg-gold text-gold-foreground px-3 py-2 rounded-xl text-[10px] font-bold hover:bg-gold/90 transition-colors flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
                  <ShoppingBag className="w-3 h-3" />
                  {t("journey.buy_now")}
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {ratedWines.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-gold" />
            <h2 className="font-display text-sm font-semibold text-foreground">{t("journey.your_ratings")}</h2>
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

      {/* Voucher History */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="w-4 h-4 text-gold" />
          <h2 className="font-display text-sm font-semibold text-foreground">{t("journey.purchase_history")}</h2>
        </div>
        <VoucherHistory currency={winery.currency} />
      </motion.div>

      {/* Retake quiz link — only shown when user already has profile data */}
      {hasProfile && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="text-center pb-4">
          <button
            onClick={() => setShowQuiz(true)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            {t("journey.retake_quiz")}
          </button>
        </motion.div>
      )}
    </div>
  );
}
