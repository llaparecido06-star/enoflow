import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wine, Star, Heart, Grape, MapPin, Thermometer, Clock, User, FlaskConical, UtensilsCrossed } from "lucide-react";
import type { Wine as WineType } from "@/hooks/useWinery";

interface TastingCardProps {
  wine: WineType & {
    grape?: string | null;
    region?: string | null;
    alcohol_content?: string | null;
    serving_temp?: string | null;
    aging?: string | null;
    enologist?: string | null;
    aromatic_notes?: string[] | null;
    harmonization?: string[] | null;
    year?: number | null;
  };
  isActive: boolean;
  onRate: (ratings: { acidity: number; body: number; sweetness: number }) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

type TabId = "sobre" | "ficha" | "harmonizacao";

const defaultHarmonizacoes: Record<string, string[]> = {
  Tinto: ["Carnes vermelhas", "Queijos maturados", "Massas com molho vermelho", "Churrasco"],
  Branco: ["Peixes", "Frutos do mar", "Saladas frescas", "Risotos leves"],
  Rosé: ["Salmão grelhado", "Saladas mediterrâneas", "Frutos do mar frescos", "Aperitivos"],
  Espumante: ["Canapés", "Sobremesas com frutas vermelhas", "Frutos do mar frescos", "Aperitivos"],
};

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

function SensoryBar({ label, value, percentage }: { label: string; value: number; percentage: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-16">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-gold/80 to-gold rounded-full"
        />
      </div>
      <span className="text-[10px] text-muted-foreground w-8 text-right">{percentage}%</span>
    </div>
  );
}

export default function TastingCard({ wine, isActive, onRate, isFavorite, onToggleFavorite }: TastingCardProps) {
  const [activeTab, setActiveTab] = useState<TabId>("sobre");
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

  const tabs: { id: TabId; label: string }[] = [
    { id: "sobre", label: "Sobre" },
    { id: "ficha", label: "Ficha Técnica" },
    { id: "harmonizacao", label: "Harmonização" },
  ];

  const harmonizationItems = (wine as any).harmonization?.length
    ? (wine as any).harmonization
    : defaultHarmonizacoes[wine.type] ?? [];

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
        </div>

        {/* Header with title + favorite */}
        <div className="px-5 -mt-5 relative z-10">
          <div className="flex items-start justify-between mb-1">
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-xl font-bold text-foreground leading-tight">{wine.name}</h2>
              <p className="text-[11px] text-muted-foreground">
                {(wine as any).year && `${(wine as any).year} · `}{wine.type}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-2 mt-1">
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
                  <motion.div
                    layoutId="tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold rounded-full"
                  />
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
                    "{wine.description}"
                  </blockquote>
                )}

                {/* Perfil Sensorial */}
                <div className="bg-muted/30 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-foreground">✨ Perfil Sensorial</span>
                  </div>
                  <div className="space-y-2.5">
                    <SensoryBar label="Corpo" value={wine.sensory_body} percentage={wine.sensory_body * 20} />
                    <SensoryBar label="Acidez" value={wine.sensory_acidity} percentage={wine.sensory_acidity * 20} />
                    <SensoryBar label="Doçura" value={wine.sensory_sweetness} percentage={wine.sensory_sweetness * 20} />
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Valor</span>
                  <span className="font-display text-xl font-bold text-gold">R$ {Number(wine.price_bottle).toFixed(2)}</span>
                </div>
              </motion.div>
            )}

            {activeTab === "ficha" && (
              <motion.div key="ficha" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { icon: Grape, label: "Uva", value: (wine as any).grape },
                    { icon: MapPin, label: "Região", value: (wine as any).region },
                    { icon: FlaskConical, label: "Teor Alcoólico", value: (wine as any).alcohol_content },
                    { icon: Thermometer, label: "Servir a", value: (wine as any).serving_temp },
                    { icon: Clock, label: "Envelhecimento", value: (wine as any).aging },
                    { icon: User, label: "Enólogo", value: (wine as any).enologist },
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

                {/* Aromatic notes */}
                {(wine as any).aromatic_notes && (wine as any).aromatic_notes.length > 0 && (
                  <div className="bg-muted/30 rounded-xl p-4">
                    <span className="text-xs font-semibold text-foreground block mb-2">Notas Aromáticas</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(wine as any).aromatic_notes.map((note: string) => (
                        <span key={note} className="text-[11px] bg-card border border-border/30 rounded-full px-2.5 py-1 text-muted-foreground">
                          {note}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price */}
                <div className="flex items-baseline justify-between mt-4 pt-3 border-t border-border/30">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Valor</span>
                  <span className="font-display text-xl font-bold text-gold">R$ {Number(wine.price_bottle).toFixed(2)}</span>
                </div>
              </motion.div>
            )}

            {activeTab === "harmonizacao" && (
              <motion.div key="harmonizacao" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <p className="text-sm font-semibold text-foreground mb-4">Harmoniza perfeitamente com:</p>
                <div className="space-y-2.5">
                  {harmonizationItems.map((item: string) => (
                    <div key={item} className="flex items-center gap-3 bg-muted/30 rounded-xl px-4 py-3">
                      <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
                      <span className="text-sm text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rating section - always visible at bottom */}
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
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <StarRow label="Acidez" value={acidity} onChange={setAcidity} />
                <StarRow label="Corpo" value={body} onChange={setBody} />
                <StarRow label="Doçura" value={sweetness} onChange={setSweetness} />
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setShowRating(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={handleSubmit} className="flex-1 py-2.5 rounded-xl bg-gold text-gold-foreground text-sm font-semibold hover:bg-gold/90 transition-colors">
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
