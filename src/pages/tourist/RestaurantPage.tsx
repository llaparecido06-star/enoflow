import { useState, useMemo } from "react";
import { useOutletContext, useLocation } from "react-router-dom";
import { useWines, type Winery, type Wine } from "@/hooks/useWinery";
import { useMenuItems, type MenuItem } from "@/hooks/useMenuItems";
import { useContentTranslation } from "@/hooks/useContentTranslation";
import { formatCurrency, formatCurrencyShort } from "@/lib/currency";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, Wine as WineIcon, Sparkles, Search, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { invokeAuth } from "@/lib/auth-api";
import { useI18n } from "@/lib/i18n";

interface SommelierRecommendation {
  wine_id: string;
  wine_name: string;
  reason: string;
}

function MenuItemCard({
  item, suggestedWine, onAskSommelier, t, translatedName, translatedDesc,
}: {
  item: MenuItem; suggestedWine?: Wine; onAskSommelier: (item: MenuItem) => void; t: (k: string) => string;
  translatedName: string; translatedDesc: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border/30 p-4 luxury-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground leading-tight">{translatedName}</h3>
          {translatedDesc && <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{translatedDesc}</p>}
        </div>
        <span className="font-display text-base font-bold text-gold whitespace-nowrap">
          {formatCurrencyShort(Number(item.price), (window as any).__enoflow_currency || "BRL")}
        </span>
      </div>
      {suggestedWine && (
        <div className="mt-3 flex items-center gap-2 bg-wine/10 rounded-lg px-3 py-2 border border-wine/15">
          <WineIcon className="w-3.5 h-3.5 text-wine-light flex-shrink-0" />
          <span className="text-[10px] text-muted-foreground">{t("restaurant.suggestion")}</span>
          <span className="text-[11px] font-medium text-foreground truncate">{suggestedWine.name}</span>
        </div>
      )}
      <button onClick={() => onAskSommelier(item)}
        className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gold/20 text-gold text-[11px] font-medium hover:bg-gold/5 transition-colors">
        <Sparkles className="w-3.5 h-3.5" />
        {t("restaurant.ask_sommelier")}
      </button>
    </motion.div>
  );
}

function SommelierPanel({
  dish: dishItem, recommendations, loading, wines, onClose, t,
}: {
  dish: MenuItem; recommendations: SommelierRecommendation[]; loading: boolean; wines: Wine[]; onClose: () => void; t: (k: string) => string;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/60 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div onClick={(e) => e.stopPropagation()}
        className="bg-card w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 border border-border/30 luxury-shadow max-h-[80vh] overflow-y-auto"
        initial={{ y: 100 }} animate={{ y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-gold" />
          <h3 className="font-display text-lg font-semibold text-foreground">{t("restaurant.sommelier_digital")}</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          {t("restaurant.pairings_for")} <span className="font-semibold text-foreground">{dishItem.name}</span>
        </p>
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gold" />
            <p className="text-xs text-muted-foreground">{t("restaurant.analyzing")}</p>
          </div>
        ) : recommendations.length > 0 ? (
          <div className="space-y-3">
            {recommendations.map((rec, i) => {
              const wine = wines.find((w) => w.id === rec.wine_id);
              return (
                <motion.div key={rec.wine_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                  className="bg-muted/50 rounded-xl p-4 border border-border/20">
                  <div className="flex items-center gap-2 mb-2">
                    <WineIcon className="w-4 h-4 text-wine-light" />
                    <span className="font-display text-sm font-semibold text-foreground">{rec.wine_name}</span>
                    {wine && (
                      <span className="text-[10px] bg-wine/10 text-wine-light px-2 py-0.5 rounded-full ml-auto">{wine.type}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{rec.reason}</p>
                  {wine && (
                    <p className="text-xs font-medium text-gold mt-2">
                      {formatCurrency(Number(wine.price_bottle), (window as any).__enoflow_currency || "BRL")}
                      {wine.price_glass && ` · ${t("restaurant.glass")} ${formatCurrency(Number(wine.price_glass), (window as any).__enoflow_currency || "BRL")}`}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">{t("restaurant.no_recommendations")}</p>
        )}
        <button onClick={onClose}
          className="w-full mt-5 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
          {t("restaurant.close")}
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function RestaurantPage() {
  const { winery } = useOutletContext<{ winery: Winery }>();
  const { t } = useI18n();
  const { data: wines } = useWines(winery.id);
  const { data: allMenuItems } = useMenuItems(winery.id);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const capturePointId = searchParams.get("cp");

  // Filter menu items: show items for this capture point + items with no capture point
  const menuItems = useMemo(() => {
    if (!allMenuItems) return [];
    if (!capturePointId) return allMenuItems;
    return allMenuItems.filter(item => !item.capture_point_ids || item.capture_point_ids.length === 0 || item.capture_point_ids.includes(capturePointId));
  }, [allMenuItems, capturePointId]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sommelierDish, setSommelierDish] = useState<MenuItem | null>(null);
  const [recommendations, setRecommendations] = useState<SommelierRecommendation[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const restaurantWines = wines?.filter((w) => w.on_restaurant) ?? [];
  const allWines = wines ?? [];
  const translatedWineNames = useContentTranslation(restaurantWines.map(w => w.name));

  const categories = useMemo(() => {
    const cats: Record<string, MenuItem[]> = {};
    (menuItems ?? []).forEach((item) => {
      if (!cats[item.category]) cats[item.category] = [];
      cats[item.category].push(item);
    });
    return cats;
  }, [menuItems]);

  const categoryNames = Object.keys(categories);
  const currentCategory = activeCategory ?? categoryNames[0] ?? null;

  // Collect all translatable texts from menu items
  const allTexts = useMemo(() => {
    const items = menuItems ?? [];
    const texts: (string | null)[] = [];
    // category names
    categoryNames.forEach((c) => texts.push(c));
    // item names and descriptions
    items.forEach((item) => {
      texts.push(item.name);
      texts.push(item.description);
    });
    return texts;
  }, [menuItems, categoryNames]);

  const translated = useContentTranslation(allTexts);

  // Build lookup maps
  const translatedCategories = useMemo(() => {
    const map: Record<string, string> = {};
    categoryNames.forEach((c, i) => { map[c] = translated[i] || c; });
    return map;
  }, [categoryNames, translated]);

  const translatedItems = useMemo(() => {
    const offset = categoryNames.length;
    const items = menuItems ?? [];
    const map: Record<string, { name: string; description: string }> = {};
    items.forEach((item, i) => {
      map[item.id] = {
        name: translated[offset + i * 2] || item.name,
        description: translated[offset + i * 2 + 1] || item.description || "",
      };
    });
    return map;
  }, [menuItems, categoryNames.length, translated]);

  const askSommelier = async (item: MenuItem) => {
    setSommelierDish(item);
    setAiLoading(true);
    setRecommendations([]);
    try {
      const { data, error } = await invokeAuth("sommelier-suggest", {
        dish_name: item.name,
        dish_description: item.description,
        wines: allWines.map((w) => ({
          id: w.id, name: w.name, type: w.type,
          sensory_acidity: w.sensory_acidity, sensory_body: w.sensory_body, sensory_sweetness: w.sensory_sweetness,
          price_bottle: w.price_bottle, price_glass: w.price_glass,
        })),
      });
      if (error) throw error;
      setRecommendations(data?.recommendations ?? []);
    } catch (e) {
      console.error("Sommelier error:", e);
      toast.error(t("restaurant.sommelier_error"));
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <section>
        <div className="flex items-center gap-2 mb-1">
          <UtensilsCrossed className="w-4 h-4 text-gold" />
          <h2 className="font-display text-sm font-semibold text-foreground">{t("restaurant.menu")}</h2>
        </div>
        <p className="text-[11px] text-muted-foreground">{t("restaurant.select_dish")}</p>
      </section>

      {categoryNames.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
          {categoryNames.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap text-xs font-medium px-4 py-2 rounded-full border transition-all duration-300 ${
                currentCategory === cat ? "bg-gold text-gold-foreground border-gold" : "bg-card text-muted-foreground border-border/30 hover:border-gold/30"
              }`}>{translatedCategories[cat] || cat}</button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {currentCategory && categories[currentCategory] && (
          <motion.div key={currentCategory} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }} className="space-y-3">
            {categories[currentCategory].map((item) => (
              <MenuItemCard key={item.id} item={item} suggestedWine={restaurantWines.find((w) => w.id === item.suggested_wine_id)}
                onAskSommelier={askSommelier} t={t}
                translatedName={translatedItems[item.id]?.name || item.name}
                translatedDesc={translatedItems[item.id]?.description || item.description || ""} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {restaurantWines.length > 0 && (
        <section className="pt-2">
          <div className="flex items-center gap-2 mb-3">
            <WineIcon className="w-4 h-4 text-gold" />
            <h2 className="font-display text-sm font-semibold text-foreground">{t("restaurant.wine_list")}</h2>
          </div>
          <div className="space-y-2">
            {restaurantWines.map((wine) => (
              <motion.div key={wine.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center justify-between bg-card rounded-xl border border-border/30 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-wine/10 flex items-center justify-center flex-shrink-0">
                    <WineIcon className="w-4 h-4 text-wine-light" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{translatedWineNames[restaurantWines.indexOf(wine)] || wine.name}</p>
                    <p className="text-[10px] text-muted-foreground">{wine.type}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-display font-bold text-gold">R$ {Number(wine.price_bottle).toFixed(0)}</p>
                  {wine.price_glass && (
                    <p className="text-[10px] text-muted-foreground">{t("restaurant.glass")} R$ {Number(wine.price_glass).toFixed(0)}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {(menuItems ?? []).length === 0 && restaurantWines.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">{t("restaurant.no_items")}</p>
      )}

      <AnimatePresence>
        {sommelierDish && (
          <SommelierPanel dish={sommelierDish} recommendations={recommendations} loading={aiLoading}
            wines={allWines} onClose={() => setSommelierDish(null)} t={t} />
        )}
      </AnimatePresence>
    </div>
  );
}
