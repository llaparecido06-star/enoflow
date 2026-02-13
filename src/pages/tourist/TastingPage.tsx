import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useWines, useTastingPackages, type Winery, type Wine } from "@/hooks/useWinery";
import { useTouristAuth } from "@/hooks/useTouristAuth";
import WineCard from "@/components/tourist/WineCard";
import RatingModal from "@/components/tourist/RatingModal";
import { Sparkles, Package } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export default function TastingPage() {
  const { winery } = useOutletContext<{ winery: Winery; lead: Tables<"users_leads"> }>();
  const { lead } = useTouristAuth();
  const { data: wines } = useWines(winery.id);
  const { data: packages } = useTastingPackages(winery.id);
  const [ratingWine, setRatingWine] = useState<Wine | null>(null);

  const tastingWines = wines?.filter((w) => w.on_tasting) ?? [];

  const handleRatingSubmit = async (ratings: { acidity: number; body: number; sweetness: number }) => {
    if (!lead || !ratingWine) return;
    try {
      const { error } = await supabase.from("ratings").upsert({
        user_id: lead.id,
        wine_id: ratingWine.id,
        stars_acidity: ratings.acidity,
        stars_body: ratings.body,
        stars_sweetness: ratings.sweetness,
      }, { onConflict: "user_id,wine_id" });
      if (error) throw error;
      toast.success("Avaliação enviada com sucesso!");
    } catch {
      toast.error("Erro ao enviar avaliação");
    }
    setRatingWine(null);
  };

  return (
    <div className="space-y-6">
      {packages && packages.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-gold" />
            <h2 className="font-display text-sm font-semibold text-foreground">Pacotes de Degustação</h2>
          </div>
          <div className="space-y-3">
            {packages.map((pkg) => (
              <div key={pkg.id} className="bg-gradient-to-r from-primary/5 to-gold/5 rounded-xl border border-primary/10 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-sm font-semibold text-foreground">{pkg.name}</h3>
                    {pkg.description && <p className="text-[11px] text-muted-foreground mt-1">{pkg.description}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{pkg.wine_ids.length} vinhos incluídos</p>
                  </div>
                  <span className="font-display text-lg font-bold text-primary">R$ {Number(pkg.price).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-gold" />
          <h2 className="font-display text-sm font-semibold text-foreground">Vinhos em Degustação</h2>
        </div>
        <div className="space-y-3">
          {tastingWines.map((wine) => (
            <WineCard key={wine.id} wine={wine} onRate={() => setRatingWine(wine)} />
          ))}
          {tastingWines.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum vinho disponível para degustação no momento.</p>
          )}
        </div>
      </section>

      {ratingWine && (
        <RatingModal wine={ratingWine} onClose={() => setRatingWine(null)} onSubmit={handleRatingSubmit} />
      )}
    </div>
  );
}
