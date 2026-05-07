import { useEffect, useState } from "react";
import { invokeAuth } from "@/lib/auth-api";
import { motion } from "framer-motion";
import { Sparkles, Wine as WineIcon, ShoppingBag } from "lucide-react";
import { formatCurrencyShort } from "@/lib/currency";
import { useNavigate } from "react-router-dom";

interface Wine { id: string; name: string; image_url: string | null; price_bottle: number }
interface Rec { wine: Wine; reason: string }

export default function AIRecommendations({ leadId, slug, currency }: { leadId: string; slug: string; currency: string }) {
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!leadId) return;
    invokeAuth("tourist-loyalty", { action: "recommend" })
      .then(({ data }) => setRecs(data?.recommendations ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading || recs.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-gold" />
        <h2 className="font-display text-sm font-semibold text-foreground">Para o seu paladar</h2>
      </div>
      <div className="space-y-2">
        {recs.map(({ wine, reason }) => (
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
              <p className="text-[10px] text-muted-foreground italic line-clamp-2">"{reason}"</p>
              <p className="text-[10px] text-gold font-bold mt-0.5">{formatCurrencyShort(Number(wine.price_bottle), currency)}</p>
            </div>
            <button onClick={() => navigate(`/app/${slug}/shop`, { state: { addToCart: wine } })}
              className="bg-gold text-gold-foreground px-3 py-2 rounded-xl text-[10px] font-bold flex items-center gap-1 flex-shrink-0">
              <ShoppingBag className="w-3 h-3" /> Comprar
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
