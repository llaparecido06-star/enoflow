import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wine, ChevronDown, Star, BookOpen, Beaker, UtensilsCrossed } from "lucide-react";
import type { Wine as WineType } from "@/hooks/useWinery";

interface TastingCardProps {
  wine: WineType;
  isActive: boolean;
  onRate: (ratings: { acidity: number; body: number; sweetness: number }) => void;
}

const harmonizacoes: Record<string, string[]> = {
  Tinto: ["Carnes vermelhas", "Queijos maturados", "Massas com molho vermelho"],
  Branco: ["Peixes", "Frutos do mar", "Saladas frescas"],
  Rosé: ["Salmão grelhado", "Saladas mediterrâneas", "Risotos leves"],
  Espumante: ["Entradas", "Sobremesas leves", "Frutas frescas"],
};

function StarRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <button key={i} onClick={() => onChange(i + 1)} className="transition-transform hover:scale-110">
            <Star className={`w-6 h-6 ${i < value ? "fill-gold text-gold" : "text-muted-foreground/30"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

function ExpandableSection({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border/30">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-3 px-1 text-left">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gold" />
          <span className="text-xs font-semibold text-foreground tracking-wide uppercase">{title}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pb-3 px-1 text-sm text-muted-foreground leading-relaxed">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TastingCard({ wine, isActive, onRate }: TastingCardProps) {
  const [acidity, setAcidity] = useState(3);
  const [body, setBody] = useState(3);
  const [sweetness, setSweetness] = useState(3);
  const [showRating, setShowRating] = useState(false);
  const [rated, setRated] = useState(false);

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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isActive ? 1 : 0.4, scale: isActive ? 1 : 0.92 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full flex-shrink-0 snap-center"
    >
      <div className="bg-card rounded-2xl overflow-hidden luxury-shadow border border-border/30">
        {/* Hero image area */}
        <div className={`relative h-64 bg-gradient-to-b ${typeGradient[wine.type] || typeGradient.Tinto} flex items-center justify-center`}>
          {wine.image_url ? (
            <img src={wine.image_url} alt={wine.name} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-background/10 flex items-center justify-center backdrop-blur-sm">
                <Wine className="w-10 h-10 text-foreground/60" />
              </div>
            </div>
          )}
          {/* Overlay gradient at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent" />
          {/* Type badge */}
          <div className="absolute top-4 left-4">
            <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full bg-background/20 backdrop-blur-md text-foreground border border-foreground/10">
              {wine.type}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 pb-5 -mt-6 relative z-10">
          <h2 className="font-display text-2xl font-bold text-foreground leading-tight mb-1">
            {wine.name}
          </h2>
          {wine.description && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{wine.description}</p>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="font-display text-xl font-bold text-gold">
              R$ {Number(wine.price_bottle).toFixed(2)}
            </span>
            {wine.price_glass && (
              <span className="text-xs text-muted-foreground">
                Taça R$ {Number(wine.price_glass).toFixed(2)}
              </span>
            )}
          </div>

          {/* Sensory dots */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Acidez", value: wine.sensory_acidity },
              { label: "Corpo", value: wine.sensory_body },
              { label: "Doçura", value: wine.sensory_sweetness },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="flex justify-center gap-0.5 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < s.value ? "bg-gold" : "bg-muted"}`} />
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Expandable sections */}
          <ExpandableSection icon={BookOpen} title="Nossa História">
            {wine.description || "Um vinho cuidadosamente selecionado pela nossa equipe de sommeliers, representando o melhor da tradição vinícola."}
          </ExpandableSection>
          <ExpandableSection icon={Beaker} title="Ficha Técnica">
            <div className="space-y-1 text-xs">
              <p><strong className="text-foreground">Tipo:</strong> {wine.type}</p>
              <p><strong className="text-foreground">Acidez:</strong> {wine.sensory_acidity}/5</p>
              <p><strong className="text-foreground">Corpo:</strong> {wine.sensory_body}/5</p>
              <p><strong className="text-foreground">Doçura:</strong> {wine.sensory_sweetness}/5</p>
            </div>
          </ExpandableSection>
          <ExpandableSection icon={UtensilsCrossed} title="Harmonização">
            <div className="flex flex-wrap gap-1.5">
              {(harmonizacoes[wine.type] ?? []).map((h) => (
                <span key={h} className="text-[11px] bg-muted rounded-full px-2.5 py-1 text-muted-foreground">
                  {h}
                </span>
              ))}
            </div>
          </ExpandableSection>

          {/* Rating overlay */}
          <div className="mt-4 border-t border-border/30 pt-4">
            {!showRating && !rated ? (
              <button
                onClick={() => setShowRating(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gold/30 text-gold text-sm font-medium hover:bg-gold/5 transition-colors"
              >
                <Star className="w-4 h-4" />
                Avaliar este vinho
              </button>
            ) : rated ? (
              <div className="text-center py-2">
                <p className="text-sm text-gold font-medium">✓ Avaliação enviada</p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <StarRow label="Acidez" value={acidity} onChange={setAcidity} />
                <StarRow label="Corpo" value={body} onChange={setBody} />
                <StarRow label="Doçura" value={sweetness} onChange={setSweetness} />
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowRating(false)}
                    className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="flex-1 py-2.5 rounded-xl bg-gold text-gold-foreground text-sm font-semibold hover:bg-gold/90 transition-colors"
                  >
                    Enviar
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
