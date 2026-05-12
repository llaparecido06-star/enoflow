import { motion } from "framer-motion";
import { useState } from "react";
import { useTranslatedText, useContentTranslation } from "@/hooks/useContentTranslation";
import { formatCurrency } from "@/lib/currency";
import { Wine as WineIcon, X, Star, Plus, Grape, MapPin, Thermometer, Clock, User, FlaskConical, Share2, MessageSquarePlus } from "lucide-react";
import ShareWineButton from "./ShareWineButton";
import PublicReviewModal from "./PublicReviewModal";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";
import type { Wine } from "@/hooks/useWinery";

export default function WineDetailModal({ wine, onClose, onAdd, t, currency = "BRL", winerySlug }: { wine: Wine; onClose: () => void; onAdd: () => void; t: (k: string) => string; currency?: string; winerySlug?: string }) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const harmonizationItems = wine.harmonization?.length ? wine.harmonization : [];
  const translatedDescription = useTranslatedText(wine.description);
  const translatedName = useTranslatedText(wine.name);
  const translatedNotes = useContentTranslation(wine.aromatic_notes ?? []);
  const translatedHarmonization = useContentTranslation(harmonizationItems);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        className="bg-card w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-border/30 luxury-shadow max-h-[85vh] overflow-y-auto"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
      >
        {/* Hero */}
        <div className="relative h-48 bg-gradient-to-b from-wine/20 to-transparent flex items-center justify-center">
          {wine.image_url ? (
            <img src={wine.image_url} alt={wine.name} className="w-full h-full object-cover rounded-t-2xl" />
          ) : (
            <WineIcon className="w-12 h-12 text-muted-foreground/30" />
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full bg-background/30 backdrop-blur-md">
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        <div className="px-5 pb-5 -mt-4 relative z-10">
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-wine/10 text-wine-light border border-wine/20 mb-2 inline-block">
            {wine.type}
          </span>
          <h2 className="font-display text-xl font-bold text-foreground">{translatedName}</h2>
          <p className="text-[11px] text-muted-foreground mb-4">{wine.year && `${wine.year} · `}{wine.grape || ""}</p>

          {wine.description && (
            <p className="text-sm text-muted-foreground italic leading-relaxed mb-4 border-l-2 border-gold/30 pl-3">
              "{translatedDescription}"
            </p>
          )}

          {/* Sensory stars */}
          <div className="bg-muted/30 rounded-xl p-4 mb-4">
            <span className="text-xs font-semibold text-foreground block mb-2">{t("wine.sensory_profile")}</span>
            <div className="space-y-1.5">
              {[
                { label: t("wine.body"), value: wine.sensory_body },
                { label: t("wine.acidity"), value: wine.sensory_acidity },
                { label: t("wine.sweetness"), value: wine.sensory_sweetness },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < s.value ? "fill-gold text-gold" : "text-muted-foreground/20"}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tech Sheet */}
          {(wine.grape || wine.region || wine.alcohol_content || wine.serving_temp || wine.aging || wine.enologist) && (
            <div className="mb-4">
              <span className="text-xs font-semibold text-foreground block mb-2">{t("wine.tech_sheet")}</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Grape, label: t("wine.grape"), value: wine.grape },
                  { icon: MapPin, label: t("wine.region"), value: wine.region },
                  { icon: FlaskConical, label: t("wine.alcohol"), value: wine.alcohol_content },
                  { icon: Thermometer, label: t("wine.serving_temp"), value: wine.serving_temp },
                  { icon: Clock, label: t("wine.aging"), value: wine.aging },
                  { icon: User, label: t("wine.enologist"), value: wine.enologist },
                ].filter(i => i.value).map(item => (
                  <div key={item.label} className="bg-muted/30 rounded-lg p-2.5">
                    <div className="flex items-center gap-1 mb-0.5">
                      <item.icon className="w-3 h-3 text-gold" />
                      <span className="text-[9px] text-muted-foreground">{item.label}</span>
                    </div>
                    <p className="text-[11px] font-medium text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aromatic notes */}
          {wine.aromatic_notes && wine.aromatic_notes.length > 0 && (
            <div className="mb-4">
              <span className="text-xs font-semibold text-foreground block mb-2">{t("wine.aromatic_notes")}</span>
              <div className="flex flex-wrap gap-1.5">
                {translatedNotes.map((note, i) => (
                  <span key={i} className="text-[11px] bg-muted/50 border border-border/30 rounded-full px-2.5 py-1 text-muted-foreground">
                    {note}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Harmonization */}
          {harmonizationItems.length > 0 && (
            <div className="mb-4">
              <span className="text-xs font-semibold text-foreground block mb-2">{t("wine.harmonization")}</span>
              <div className="space-y-1.5">
                {translatedHarmonization.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
                    <span className="text-[11px] text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Public review CTA */}
          <button
            onClick={() => setReviewOpen(true)}
            className="w-full mt-2 mb-3 flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:bg-secondary/40 transition-colors"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" /> Avaliar este vinho
          </button>

          {/* Price + Add to cart */}
          <div className="flex items-center justify-between pt-3 border-t border-border/30">
            <div>
              <span className="text-xs text-muted-foreground line-through">{formatCurrency(Number(wine.price_bottle), currency)}</span>
              <span className="font-display text-xl font-bold text-gold ml-1">{formatCurrency(Math.round(Number(wine.price_bottle) * 0.9), currency)}</span>
              <span className="text-[10px] text-green-500 font-bold ml-1">-10%</span>
            </div>
            <div className="flex items-center gap-2">
              {winerySlug && <ShareWineButton wine={wine} winerySlug={winerySlug} currency={currency} className="p-2" />}
              <button
              onClick={() => { onAdd(); onClose(); }}
              className="bg-gold text-gold-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gold/90 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> {t("shop.cart")}
            </button>
            </div>
          </div>
        </div>
      </motion.div>

      {reviewOpen && (
        <PublicReviewModal
          wineName={wine.name}
          onClose={() => setReviewOpen(false)}
          onSubmit={async (stars, comment) => {
            try {
              const res = await invokeAuth("tourist-actions", {
                action: "submit_wine_review",
                wine_id: wine.id,
                stars,
                comment,
              });
              if (res.error || res.data?.error) throw new Error(res.data?.error || "Erro");
              toast.success("Avaliação enviada. Obrigado!");
              setReviewOpen(false);
            } catch {
              toast.error("Não foi possível enviar a avaliação");
            }
          }}
        />
      )}
    </motion.div>
  );
}
