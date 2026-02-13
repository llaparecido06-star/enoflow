import { Wine as WineType } from "@/hooks/useWinery";
import { Wine, Droplets, Circle } from "lucide-react";

interface WineCardProps {
  wine: WineType;
  onRate?: () => void;
  onAddToCart?: () => void;
  showCartButton?: boolean;
}

function SensoryDots({ value, label, icon: Icon }: { value: number; label: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-[10px] text-muted-foreground w-14">{label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i < value ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function WineCard({ wine, onRate, onAddToCart, showCartButton }: WineCardProps) {
  const typeColors: Record<string, string> = {
    Tinto: "bg-primary/10 text-primary",
    Branco: "bg-gold/10 text-gold",
    Rosé: "bg-pink-100 text-pink-600",
    Espumante: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-12 h-16 rounded-lg bg-gradient-to-b from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
          <Wine className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeColors[wine.type] || "bg-secondary text-secondary-foreground"}`}>
              {wine.type}
            </span>
          </div>
          <h3 className="font-display text-sm font-semibold text-foreground leading-tight truncate">
            {wine.name}
          </h3>
          {wine.description && (
            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{wine.description}</p>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <SensoryDots value={wine.sensory_acidity} label="Acidez" icon={Droplets} />
        <SensoryDots value={wine.sensory_body} label="Corpo" icon={Circle} />
        <SensoryDots value={wine.sensory_sweetness} label="Doçura" icon={Wine} />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <span className="text-lg font-display font-bold text-foreground">
            R$ {Number(wine.price_bottle).toFixed(2)}
          </span>
          {wine.price_glass && (
            <span className="text-[11px] text-muted-foreground ml-2">
              Taça R$ {Number(wine.price_glass).toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {onRate && (
            <button
              onClick={onRate}
              className="text-[11px] font-medium text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
            >
              Avaliar
            </button>
          )}
          {showCartButton && onAddToCart && (
            <button
              onClick={onAddToCart}
              className="text-[11px] font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
            >
              + Carrinho
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
