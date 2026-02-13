import { useOutletContext } from "react-router-dom";
import { useWines, type Winery } from "@/hooks/useWinery";
import WineCard from "@/components/tourist/WineCard";
import { UtensilsCrossed, Wine } from "lucide-react";

const harmonizacoes: Record<string, string[]> = {
  Tinto: ["Carnes vermelhas", "Queijos maturados", "Massas com molho vermelho"],
  Branco: ["Peixes", "Frutos do mar", "Saladas frescas"],
  Rosé: ["Salmão grelhado", "Saladas mediterrâneas", "Risotos leves"],
  Espumante: ["Entradas", "Sobremesas leves", "Frutas frescas"],
};

export default function RestaurantPage() {
  const { winery } = useOutletContext<{ winery: Winery }>();
  const { data: wines } = useWines(winery.id);

  const restaurantWines = wines?.filter((w) => w.on_restaurant) ?? [];

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center gap-2 mb-1">
          <UtensilsCrossed className="w-4 h-4 text-gold" />
          <h2 className="font-display text-sm font-semibold text-foreground">Carta de Vinhos</h2>
        </div>
        <p className="text-[11px] text-muted-foreground mb-4">
          Vinhos disponíveis para acompanhar sua refeição
        </p>

        <div className="space-y-4">
          {restaurantWines.map((wine) => (
            <div key={wine.id} className="space-y-2">
              <WineCard wine={wine} />
              {/* Harmonization suggestion */}
              <div className="bg-gold/5 border border-gold/10 rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Wine className="w-3 h-3 text-gold" />
                  <span className="text-[10px] font-semibold text-gold">Harmoniza com</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(harmonizacoes[wine.type] ?? []).map((h) => (
                    <span
                      key={h}
                      className="text-[10px] bg-card border border-border rounded-full px-2 py-0.5 text-muted-foreground"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {restaurantWines.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum vinho disponível no restaurante no momento.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
