import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star, ShoppingBag, X, Wine as WineIcon, Sparkles } from "lucide-react";
import type { Wine } from "@/hooks/useWinery";
import { formatCurrencyShort } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";

export interface WinePersona {
  key: string;
  label: string;
  emoji: string;
  description: string;
}

export function calculatePersona(avgAcidity: number, avgBody: number, avgSweetness: number, t: (k: string) => string): WinePersona {
  if (avgSweetness > 4) {
    return { key: "sweet_tooth", label: t("persona.sweet_tooth"), emoji: "🍬", description: t("persona.sweet_tooth_desc") };
  }
  if (avgBody > 4) {
    return { key: "bold_intense", label: t("persona.bold_intense"), emoji: "🦁", description: t("persona.bold_intense_desc") };
  }
  if (avgAcidity > 4) {
    return { key: "fresh_crisp", label: t("persona.fresh_crisp"), emoji: "🍋", description: t("persona.fresh_crisp_desc") };
  }
  return { key: "balanced_explorer", label: t("persona.balanced_explorer"), emoji: "⚖️", description: t("persona.balanced_explorer_desc") };
}

interface CelebrationModalProps {
  persona: WinePersona;
  recommendations: Wine[];
  onClose: () => void;
  onAddToCart: (wine: Wine) => void;
  onGoToShop: () => void;
  currency?: string;
}

function ConfettiEffect() {
  const particles = useMemo(() =>
    Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      size: 4 + Math.random() * 8,
      color: ['hsl(38, 70%, 50%)', 'hsl(350, 82%, 22%)', 'hsl(42, 80%, 60%)', 'hsl(0, 0%, 100%)'][Math.floor(Math.random() * 4)],
      rotation: Math.random() * 360,
    }))
  , []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: '100vh', opacity: 0, rotate: p.rotation + 360 }}
          transition={{ delay: p.delay, duration: p.duration, ease: 'linear' }}
          style={{ position: 'absolute', width: p.size, height: p.size, backgroundColor: p.color, borderRadius: p.size > 8 ? '50%' : '2px' }}
        />
      ))}
    </div>
  );
}

export default function CelebrationModal({ persona, recommendations, onClose, onAddToCart, onGoToShop, currency = "BRL" }: CelebrationModalProps) {
  const [showConfetti, setShowConfetti] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md"
    >
      {showConfetti && <ConfettiEffect />}

      <motion.div
        initial={{ scale: 0.8, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 20 }}
        className="relative bg-card w-full max-w-sm mx-4 rounded-2xl border border-border/30 luxury-shadow max-h-[90vh] overflow-y-auto"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted z-20">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Header */}
        <div className="pt-8 pb-4 px-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="text-6xl mb-4"
          >
            {persona.emoji}
          </motion.div>

          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-gold" />
              <span className="text-xs text-gold uppercase tracking-wider font-medium">{t("celebration.your_profile")}</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              {persona.label}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {persona.description}
            </p>
          </motion.div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="px-6 pb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-gold" />
              <h3 className="font-display text-sm font-semibold text-foreground">
                {t("celebration.perfect_wines")}
              </h3>
            </div>

            <div className="space-y-2">
              {recommendations.map((wine) => (
                <div key={wine.id} className="bg-muted/30 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-wine/10 flex items-center justify-center flex-shrink-0">
                    {wine.image_url ? (
                      <img src={wine.image_url} alt={wine.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <WineIcon className="w-5 h-5 text-wine-light" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{wine.name}</p>
                    <p className="text-[10px] text-muted-foreground">{wine.type}{wine.year ? ` · ${wine.year}` : ""}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[9px] text-muted-foreground line-through">
                      {formatCurrencyShort(Number(wine.price_bottle), currency)}
                    </p>
                    <p className="font-display text-sm font-bold text-gold">
                      {formatCurrencyShort(Number(wine.price_bottle) * 0.9, currency)}
                    </p>
                  </div>
                  <button
                    onClick={() => onAddToCart(wine)}
                    className="w-8 h-8 rounded-lg bg-gold text-gold-foreground flex items-center justify-center hover:bg-gold/90 transition-colors flex-shrink-0"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={onGoToShop}
              className="w-full mt-4 py-3 rounded-xl bg-gold text-gold-foreground font-display text-sm font-semibold hover:bg-gold/90 transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              {t("celebration.buy_with_discount")}
            </button>
          </motion.div>
        )}

        {recommendations.length === 0 && (
          <div className="px-6 pb-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t("celebration.visit_shop")}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
