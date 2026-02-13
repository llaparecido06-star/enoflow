import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useWines, type Winery, type Wine } from "@/hooks/useWinery";
import { useMenuItems, type MenuItem } from "@/hooks/useMenuItems";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, Wine as WineIcon, Sparkles, Search, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SommelierRecommendation {
  wine_id: string;
  wine_name: string;
  reason: string;
}

function MenuItemCard({
  item,
  suggestedWine,
  onAskSommelier,
}: {
  item: MenuItem;
  suggestedWine?: Wine;
  onAskSommelier: (item: MenuItem) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border/30 p-4 luxury-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground leading-tight">{item.name}</h3>
          {item.description && (
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
          )}
        </div>
        <span className="font-display text-base font-bold text-gold whitespace-nowrap">
          R$ {Number(item.price).toFixed(0)}
        </span>
      </div>

      {suggestedWine && (
        <div className="mt-3 flex items-center gap-2 bg-wine/10 rounded-lg px-3 py-2 border border-wine/15">
          <WineIcon className="w-3.5 h-3.5 text-wine-light flex-shrink-0" />
          <span className="text-[10px] text-muted-foreground">Sugestão:</span>
          <span className="text-[11px] font-medium text-foreground truncate">{suggestedWine.name}</span>
        </div>
      )}

      <button
        onClick={() => onAskSommelier(item)}
        className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gold/20 text-gold text-[11px] font-medium hover:bg-gold/5 transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Perguntar ao Sommelier Digital
      </button>
    </motion.div>
  );
}

function SommelierPanel({
  dish: dishItem,
  recommendations,
  loading,
  wines,
  onClose,
}: {
  dish: MenuItem;
  recommendations: SommelierRecommendation[];
  loading: boolean;
  wines: Wine[];
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        className="bg-card w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 border border-border/30 luxury-shadow max-h-[80vh] overflow-y-auto"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-gold" />
          <h3 className="font-display text-lg font-semibold text-foreground">Sommelier Digital</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Harmonizações para <span className="font-semibold text-foreground">{dishItem.name}</span>
        </p>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gold" />
            <p className="text-xs text-muted-foreground">Analisando harmonizações...</p>
          </div>
        ) : recommendations.length > 0 ? (
          <div className="space-y-3">
            {recommendations.map((rec, i) => {
              const wine = wines.find((w) => w.id === rec.wine_id);
              return (
                <motion.div
                  key={rec.wine_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-muted/50 rounded-xl p-4 border border-border/20"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <WineIcon className="w-4 h-4 text-wine-light" />
                    <span className="font-display text-sm font-semibold text-foreground">{rec.wine_name}</span>
                    {wine && (
                      <span className="text-[10px] bg-wine/10 text-wine-light px-2 py-0.5 rounded-full ml-auto">
                        {wine.type}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{rec.reason}</p>
                  {wine && (
                    <p className="text-xs font-medium text-gold mt-2">
                      R$ {Number(wine.price_bottle).toFixed(2)}
                      {wine.price_glass && ` · Taça R$ ${Number(wine.price_glass).toFixed(2)}`}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">Não foi possível gerar recomendações.</p>
        )}

        <button
          onClick={onClose}
          className="w-full mt-5 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          Fechar
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function RestaurantPage() {
  const { winery } = useOutletContext<{ winery: Winery }>();
  const { data: wines } = useWines(winery.id);
  const { data: menuItems } = useMenuItems(winery.id);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sommelierDish, setSommelierDish] = useState<MenuItem | null>(null);
  const [recommendations, setRecommendations] = useState<SommelierRecommendation[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const restaurantWines = wines?.filter((w) => w.on_restaurant) ?? [];
  const allWines = wines ?? [];

  // Group menu items by category
  const categories = useMemo(() => {
    const cats: Record<string, MenuItem[]> = {};
    (menuItems ?? []).forEach((item) => {
      if (!cats[item.category]) cats[item.category] = [];
      cats[item.category].push(item);
    });
    return cats;
  }, [menuItems]);

  const categoryNames = Object.keys(categories);

  // Default to first category
  const currentCategory = activeCategory ?? categoryNames[0] ?? null;

  const askSommelier = async (item: MenuItem) => {
    setSommelierDish(item);
    setAiLoading(true);
    setRecommendations([]);
    try {
      const { data, error } = await supabase.functions.invoke("sommelier-suggest", {
        body: {
          dish_name: item.name,
          dish_description: item.description,
          wines: allWines.map((w) => ({
            id: w.id,
            name: w.name,
            type: w.type,
            sensory_acidity: w.sensory_acidity,
            sensory_body: w.sensory_body,
            sensory_sweetness: w.sensory_sweetness,
            price_bottle: w.price_bottle,
            price_glass: w.price_glass,
          })),
        },
      });
      if (error) throw error;
      setRecommendations(data?.recommendations ?? []);
    } catch (e) {
      console.error("Sommelier error:", e);
      toast.error("Erro ao consultar o sommelier digital");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <UtensilsCrossed className="w-4 h-4 text-gold" />
          <h2 className="font-display text-sm font-semibold text-foreground">Cardápio</h2>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Selecione um prato e peça sugestões ao nosso Sommelier Digital
        </p>
      </section>

      {/* Category tabs */}
      {categoryNames.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
          {categoryNames.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap text-xs font-medium px-4 py-2 rounded-full border transition-all duration-300 ${
                currentCategory === cat
                  ? "bg-gold text-gold-foreground border-gold"
                  : "bg-card text-muted-foreground border-border/30 hover:border-gold/30"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Menu items for current category */}
      <AnimatePresence mode="wait">
        {currentCategory && categories[currentCategory] && (
          <motion.div
            key={currentCategory}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-3"
          >
            {categories[currentCategory].map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                suggestedWine={restaurantWines.find((w) => w.id === item.suggested_wine_id)}
                onAskSommelier={askSommelier}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Restaurant wines section */}
      {restaurantWines.length > 0 && (
        <section className="pt-2">
          <div className="flex items-center gap-2 mb-3">
            <WineIcon className="w-4 h-4 text-gold" />
            <h2 className="font-display text-sm font-semibold text-foreground">Carta de Vinhos</h2>
          </div>
          <div className="space-y-2">
            {restaurantWines.map((wine) => (
              <motion.div
                key={wine.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between bg-card rounded-xl border border-border/30 px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-wine/10 flex items-center justify-center flex-shrink-0">
                    <WineIcon className="w-4 h-4 text-wine-light" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{wine.name}</p>
                    <p className="text-[10px] text-muted-foreground">{wine.type}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-display font-bold text-gold">R$ {Number(wine.price_bottle).toFixed(0)}</p>
                  {wine.price_glass && (
                    <p className="text-[10px] text-muted-foreground">Taça R$ {Number(wine.price_glass).toFixed(0)}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {(menuItems ?? []).length === 0 && restaurantWines.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">
          Nenhum item disponível no restaurante no momento.
        </p>
      )}

      {/* Sommelier Modal */}
      <AnimatePresence>
        {sommelierDish && (
          <SommelierPanel
            dish={sommelierDish}
            recommendations={recommendations}
            loading={aiLoading}
            wines={allWines}
            onClose={() => setSommelierDish(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
