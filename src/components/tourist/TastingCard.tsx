import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wine, Star, Heart, Grape, MapPin, Thermometer, Clock, User, FlaskConical, ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import type { Wine as WineType } from "@/hooks/useWinery";
import { useI18n } from "@/lib/i18n";
import { useContentTranslation, useTranslatedText } from "@/hooks/useContentTranslation";

interface TastingCardProps {
  wine: WineType;
  isActive: boolean;
  onRate: (ratings: { acidity: number; body: number; sweetness: number }) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  initialRatings?: { acidity: number; body: number; sweetness: number };
  isLast?: boolean;
  allRated?: boolean;
  onFinish?: () => void;
  onReserve?: () => void;
  isReserved?: boolean;
}

type TabId = "sobre" | "ficha" | "harmonizacao";

function StarRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <button key={i} onClick={() => onChange(i + 1)} className="transition-transform hover:scale-110">
            <Star className={`w-5 h-5 ${i < value ? "fill-gold text-gold" : "text-muted-foreground/30"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

function SensoryStars({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={`w-3.5 h-3.5 ${i < value ? "fill-gold text-gold" : "text-muted-foreground/20"}`} />
        ))}
      </div>
    </div>
  );
}

export default function TastingCard({ wine, isActive, onRate, isFavorite, onToggleFavorite, initialRatings, isLast, allRated, onFinish, onReserve, isReserved }: TastingCardProps) {
  const { t } = useI18n();

  const defaultHarmonizations: Record<string, string[]> = {
    Tinto: [t("harm.red_meat"), t("harm.aged_cheese"), t("harm.red_pasta"), t("harm.bbq")],
    Branco: [t("harm.fish"), t("harm.seafood"), t("harm.fresh_salads"), t("harm.light_risotto")],
    Rosé: [t("harm.grilled_salmon"), t("harm.mediterranean"), t("harm.fresh_seafood"), t("harm.appetizers")],
    Espumante: [t("harm.canapes"), t("harm.red_fruit_desserts"), t("harm.fresh_seafood"), t("harm.appetizers")],
  };

  const harmonizationItems = wine.harmonization?.length
    ? wine.harmonization
    : defaultHarmonizations[wine.type] ?? [];

  const [translatedDesc] = useContentTranslation([wine.description]);
  const translatedName = useTranslatedText(wine.name);
  const translatedNotes = useContentTranslation(wine.aromatic_notes ?? []);
  const translatedHarmonization = useContentTranslation(harmonizationItems);

  const [activeTab, setActiveTab] = useState<TabId>("sobre");
  const [acidity, setAcidity] = useState(initialRatings?.acidity ?? 3);
  const [body, setBody] = useState(initialRatings?.body ?? 3);
  const [sweetness, setSweetness] = useState(initialRatings?.sweetness ?? 3);
  const [showRating, setShowRating] = useState(false);
  const [rated, setRated] = useState(!!initialRatings);

  const handleSubmit = () => {
    onRate({ acidity, body, sweetness });
    setRated(true);
    setShowRating(false);
  };

  const typeGradient: Record<string, string> = {
    Tinto: "from-wine/60 via-wine/20 to-transparent",
    Branco: "from-gold/40 via-gold/10 to-transparent",
    Rosé: "from-pink-900/50 via-pink-900/15 to-transparent",
    Espumante: "from-amber-900/40 via-amber-900/10 to-transparent",
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "sobre", label: t("wine.about") },
    { id: "ficha", label: t("wine.tech_sheet") },
    { id: "harmonizacao", label: t("wine.harmonization") },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isActive ? 1 : 0.4, scale: isActive ? 1 : 0.92 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full flex-shrink-0 snap-center"
    >
      <div className="bg-card rounded-2xl overflow-hidden luxury-shadow border border-border/30">
        {/* Hero */}
        <div className={`relative h-52 bg-gradient-to-b ${typeGradient[wine.type] || typeGradient.Tinto} flex items-center justify-center`}>
          {wine.image_url ? (
            <img src={wine.image_url} alt={wine.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-background/10 flex items-center justify-center backdrop-blur-sm">
              <Wine className="w-8 h-8 text-foreground/60" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-card to-transparent" />
          <div className="absolute top-4 left-4">
            <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full bg-background/20 backdrop-blur-md text-foreground border border-foreground/10">
              {wine.type}
            </span>
          </div>
          {rated && (
            <div className="absolute top-4 right-14">
              <span className="text-[10px] font-bold px-2.5 py-1.5 rounded-full bg-gold/20 backdrop-blur-md text-gold border border-gold/30">
                {t("tasting.rated_badge")}
              </span>
            </div>
          )}
          {isReserved && (
            <div className="absolute bottom-2 left-4">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-full bg-gold text-gold-foreground border border-gold/50 shadow-md">
                <ShoppingBag className="w-3 h-3" />
                Reservado na loja
              </span>
            </div>
          )}
        </div>

        {/* Header with title + favorite */}
        <div className="px-5 -mt-5 relative z-10">
          <div className="flex items-start justify-between mb-1">
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-xl font-bold text-foreground leading-tight">{translatedName}</h2>
              <p className="text-[11px] text-muted-foreground">
                {wine.year && `${wine.year} · `}{wine.type}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-2 mt-1">
              {onReserve && (
                <button
                  onClick={onReserve}
                  title="Reservar na loja"
                  className="p-2 rounded-full border border-gold/30 bg-gold/5 hover:bg-gold/10 transition-colors"
                >
                  <ShoppingBag className="w-4 h-4 text-gold" />
                </button>
              )}
              <button onClick={onToggleFavorite} className="p-2 rounded-full border border-border/30 hover:bg-muted/50 transition-colors">
                <Heart className={`w-4 h-4 transition-colors ${isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 mt-3 border-b border-border/30">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 text-xs font-medium py-2.5 text-center transition-colors relative ${
                  activeTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="px-5 pb-5 pt-4 min-h-[260px]">
          <AnimatePresence mode="wait">
            {activeTab === "sobre" && (
              <motion.div key="sobre" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                {wine.description && (
                  <blockquote className="text-sm text-muted-foreground italic leading-relaxed mb-4 border-l-2 border-gold/30 pl-3">
                    "{translatedDesc}"
                  </blockquote>
                )}
                <div className="bg-muted/30 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-foreground">{t("wine.sensory_profile")}</span>
                  </div>
                  <div className="space-y-2">
                    <SensoryStars label={t("wine.body")} value={wine.sensory_body} />
                    <SensoryStars label={t("wine.acidity")} value={wine.sensory_acidity} />
                    <SensoryStars label={t("wine.sweetness")} value={wine.sensory_sweetness} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{t("wine.value")}</span>
                  <span className="font-display text-xl font-bold text-gold">{formatCurrency(Number(wine.price_bottle), (window as any).__enoflow_currency || "BRL")}</span>
                </div>
              </motion.div>
            )}

            {activeTab === "ficha" && (
              <motion.div key="ficha" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { icon: Grape, label: t("wine.grape"), value: wine.grape },
                    { icon: MapPin, label: t("wine.region"), value: wine.region },
                    { icon: FlaskConical, label: t("wine.alcohol_full"), value: wine.alcohol_content },
                    { icon: Thermometer, label: t("wine.serving_temp_full"), value: wine.serving_temp },
                    { icon: Clock, label: t("wine.aging"), value: wine.aging },
                    { icon: User, label: t("wine.enologist"), value: wine.enologist },
                  ].filter(item => item.value).map((item) => (
                    <div key={item.label} className="bg-muted/30 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <item.icon className="w-3.5 h-3.5 text-gold" />
                        <span className="text-[10px] text-muted-foreground">{item.label}</span>
                      </div>
                      <p className="text-xs font-medium text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>

                {wine.aromatic_notes && wine.aromatic_notes.length > 0 && (
                  <div className="bg-muted/30 rounded-xl p-4">
                    <span className="text-xs font-semibold text-foreground block mb-2">{t("wine.aromatic_notes")}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {translatedNotes.map((note: string, i: number) => (
                        <span key={i} className="text-[11px] bg-card border border-border/30 rounded-full px-2.5 py-1 text-muted-foreground">
                          {note}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-baseline justify-between mt-4 pt-3 border-t border-border/30">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{t("wine.value")}</span>
                  <span className="font-display text-xl font-bold text-gold">{formatCurrency(Number(wine.price_bottle), (window as any).__enoflow_currency || "BRL")}</span>
                </div>
              </motion.div>
            )}

            {activeTab === "harmonizacao" && (
              <motion.div key="harmonizacao" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <p className="text-sm font-semibold text-foreground mb-4">{t("wine.harmonizes_with")}</p>
                <div className="space-y-2.5">
                  {translatedHarmonization.map((item: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 bg-muted/30 rounded-xl px-4 py-3">
                      <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
                      <span className="text-sm text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rating section */}
          <div className="mt-4 border-t border-border/30 pt-4">
            {!showRating && !rated ? (
              <button
                onClick={() => setShowRating(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gold/30 text-gold text-sm font-medium hover:bg-gold/5 transition-colors"
              >
                <Star className="w-4 h-4" />
                {t("tasting.rate_wine")}
              </button>
            ) : rated ? (
              <div className="text-center py-2">
                <p className="text-sm text-gold font-medium">{t("tasting.rating_submitted")}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {t("wine.acidity")}: {acidity} · {t("wine.body")}: {body} · {t("wine.sweetness")}: {sweetness}
                </p>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <StarRow label={t("wine.acidity")} value={acidity} onChange={setAcidity} />
                <StarRow label={t("wine.body")} value={body} onChange={setBody} />
                <StarRow label={t("wine.sweetness")} value={sweetness} onChange={setSweetness} />
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setShowRating(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
                    {t("tasting.cancel")}
                  </button>
                  <button onClick={handleSubmit} className="flex-1 py-2.5 rounded-xl bg-gold text-gold-foreground text-sm font-semibold hover:bg-gold/90 transition-colors">
                    {t("tasting.submit")}
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Finish button on last card when all are rated */}
          {isLast && allRated && rated && onFinish && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={onFinish}
              className="w-full mt-4 py-4 rounded-xl bg-gold text-gold-foreground font-display text-base font-bold hover:bg-gold/90 transition-colors animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] flex items-center justify-center gap-2"
            >
              <Star className="w-5 h-5" />
              {t("tasting.finish_discover")}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
