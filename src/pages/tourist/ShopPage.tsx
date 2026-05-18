import { useState, useMemo, useEffect } from "react";
import { useOutletContext, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useContentTranslation } from "@/hooks/useContentTranslation";
import QRCode from "qrcode";
import { useWines, type Winery, type Wine } from "@/hooks/useWinery";
import { useTouristAuth } from "@/hooks/useTouristAuth";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import { formatCurrency, formatCurrencyShort } from "@/lib/currency";
import NpsModal from "@/components/tourist/NpsModal";
import ProfileForm from "@/components/tourist/ProfileForm";
import VoucherRedeemedModal from "@/components/tourist/VoucherRedeemedModal";
import ShopWineCard from "@/components/tourist/ShopWineCard";
import WineDetailModal from "@/components/tourist/WineDetailModal";
import RatingModal from "@/components/tourist/RatingModal";
import PairingModal from "@/components/tourist/PairingModal";
import ShopFilters, { priceRanges, flavorProfiles } from "@/components/tourist/ShopFilters";
import ShopCart from "@/components/tourist/ShopCart";
import ShopVoucher from "@/components/tourist/ShopVoucher";
import ShopSortSelect, { type SortOption } from "@/components/tourist/ShopSortSelect";
import { WineGridSkeleton } from "@/components/tourist/WineCardSkeleton";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Wine as WineIcon, Heart, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { invokeAuth } from "@/lib/auth-api";

export default function ShopPage() {
  const { winery, resolvedCPs } = useOutletContext<{ winery: Winery; resolvedCPs?: { restaurant_cp: string | null; shop_cp: string | null; tasting_cp: string | null } }>();
  const { t, locale } = useI18n();
  const { lead, updateProfile } = useTouristAuth();
  const queryClient = useQueryClient();
  const { data: wines } = useWines(winery.id);

  // Force fresh wines on every Shop mount so cart reconciliation uses live DB prices/names
  useEffect(() => {
    if (!winery.id) return;
    queryClient.invalidateQueries({ queryKey: ["wines", winery.id] });
  }, [winery.id, queryClient]);

  const { items, addItem, removeItem, updateQuantity, total, clearCart } = useCart(winery.id, wines);
  const { favorites, isFavorite, toggleFavorite } = useFavorites(lead?.id, winery.id);
  const location = useLocation();
  const cur = winery.currency || "BRL";
  const [voucher, setVoucher] = useState<{ code: string; id?: string } | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState("Todos");
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [selectedFlavor, setSelectedFlavor] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [detailWine, setDetailWine] = useState<Wine | null>(null);
  const [ratingWine, setRatingWine] = useState<Wine | null>(null);
  const [discountApplied] = useState(true);
  const [showNps, setShowNps] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [funnelStep, setFunnelStep] = useState<"profile" | null>(null);
  const [voucherRedeemed, setVoucherRedeemed] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [userRatings, setUserRatings] = useState<{ wine_id: string; stars_acidity: number; stars_body: number; stars_sweetness: number }[]>([]);

  const discountMultiplier = discountApplied ? 0.9 : 1;

  // Load user ratings for profile-based sorting
  useEffect(() => {
    if (!lead?.id) return;
    invokeAuth("tourist-actions", { action: "get_ratings" })
      .then(({ data }) => { if (data?.ratings) setUserRatings(data.ratings); })
      .catch(() => {});
  }, [lead?.id]);
  const discountedTotal = total * discountMultiplier;

  // Realtime voucher redemption listener
  useEffect(() => {
    if (!voucher?.id) return;
    let active = true;
    const checkRedeemed = async () => {
      const { data } = await supabase.from("vouchers").select("redeemed").eq("id", voucher.id).maybeSingle();
      if (active && data?.redeemed === true) setVoucherRedeemed(true);
    };
    const channel = supabase
      .channel(`voucher-${voucher.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "vouchers", filter: `id=eq.${voucher.id}` },
        (payload) => { if ((payload.new as any)?.redeemed === true) setVoucherRedeemed(true); })
      .subscribe();
    const interval = window.setInterval(checkRedeemed, 2000);
    checkRedeemed();
    return () => { active = false; window.clearInterval(interval); supabase.removeChannel(channel); };
  }, [voucher?.id]);

  // Handle wine added from profile recommendation or open detail from another page
  useEffect(() => {
    const navState = location.state as { addToCart?: Wine; openWineId?: string } | null;
    if (navState?.addToCart) {
      addItem(navState.addToCart);
      setShowCart(true);
      window.history.replaceState({}, "");
    }
    if (navState?.openWineId && wines) {
      const target = wines.find((w) => w.id === navState.openWineId);
      if (target) {
        setDetailWine(target);
        window.history.replaceState({}, "");
      }
    }
  }, [location.state, wines]);

  const searchParams = new URLSearchParams(location.search);
  const rawCp = searchParams.get("cp");
  const capturePointId = resolvedCPs?.shop_cp || rawCp;

  // Compute user flavor profile from ratings + quiz
  const userProfile = useMemo(() => {
    const ratingsProfile = userRatings.length > 0 ? {
      acidity: userRatings.reduce((s, r) => s + r.stars_acidity, 0) / userRatings.length,
      body: userRatings.reduce((s, r) => s + r.stars_body, 0) / userRatings.length,
      sweetness: userRatings.reduce((s, r) => s + r.stars_sweetness, 0) / userRatings.length,
    } : null;

    let quizProfile: { acidity: number; body: number; sweetness: number } | null = null;
    if (lead?.preferences_summary) {
      const prefs = lead.preferences_summary.toLowerCase();
      let bodyHint = 3, acidityHint = 3, sweetnessHint = 3;
      if (prefs.includes("encorpado")) bodyHint = 5;
      else if (prefs.includes("médio")) bodyHint = 3;
      else if (prefs.includes("leve")) bodyHint = 1;
      if (prefs.includes("doce")) sweetnessHint = 5;
      else if (prefs.includes("suave")) sweetnessHint = 4;
      else if (prefs.includes("meio-seco")) sweetnessHint = 2;
      else if (prefs.includes("seco")) sweetnessHint = 1;
      quizProfile = { acidity: acidityHint, body: bodyHint, sweetness: sweetnessHint };
    }

    if (ratingsProfile && quizProfile) {
      return {
        acidity: ratingsProfile.acidity * 0.7 + quizProfile.acidity * 0.3,
        body: ratingsProfile.body * 0.7 + quizProfile.body * 0.3,
        sweetness: ratingsProfile.sweetness * 0.7 + quizProfile.sweetness * 0.3,
      };
    }
    return ratingsProfile || quizProfile;
  }, [userRatings, lead?.preferences_summary]);

  const shopWines = useMemo(() => {
    const all = wines?.filter((w) => w.on_shop) ?? [];
    const filtered = capturePointId
      ? all.filter(w => !(w as any).capture_point_id || (w as any).capture_point_id === capturePointId)
      : all;

    // Sort by profile similarity (closest match first) when no explicit sort
    if (userProfile) {
      return [...filtered].sort((a, b) => {
        const scoreA = Math.abs(a.sensory_acidity - userProfile.acidity) + Math.abs(a.sensory_body - userProfile.body) + Math.abs(a.sensory_sweetness - userProfile.sweetness);
        const scoreB = Math.abs(b.sensory_acidity - userProfile.acidity) + Math.abs(b.sensory_body - userProfile.body) + Math.abs(b.sensory_sweetness - userProfile.sweetness);
        return scoreA - scoreB;
      });
    }
    return filtered;
  }, [wines, capturePointId, userProfile]);

  const translatedWineNames = useContentTranslation(shopWines.map(w => w.name));
  const wineNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    shopWines.forEach((w, i) => { map[w.id] = translatedWineNames[i] || w.name; });
    return map;
  }, [shopWines, translatedWineNames]);

  const favoriteWines = useMemo(() => shopWines.filter(w => isFavorite(w.id)), [shopWines, favorites]);

  const filteredWines = useMemo(() => {
    let result = shopWines;
    if (showFavoritesOnly) result = result.filter((w) => isFavorite(w.id));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((w) => w.name.toLowerCase().includes(q) || w.type.toLowerCase().includes(q) || w.description?.toLowerCase().includes(q));
    }
    if (selectedType !== "Todos") result = result.filter((w) => w.type === selectedType);
    const range = priceRanges[selectedPrice];
    result = result.filter((w) => w.price_bottle >= range.min && w.price_bottle < range.max);
    if (selectedFlavor) {
      const profile = flavorProfiles.find((f) => f.label === selectedFlavor);
      if (profile) {
        result = result.filter((w) => {
          const val = w[profile.key];
          if ('min' in profile && profile.min) return val >= profile.min;
          if ('max' in profile && profile.max) return val <= profile.max;
          return true;
        });
      }
    }
    // Apply sorting
    if (sortBy === "price_asc") result = [...result].sort((a, b) => a.price_bottle - b.price_bottle);
    else if (sortBy === "price_desc") result = [...result].sort((a, b) => b.price_bottle - a.price_bottle);
    else if (sortBy === "name_asc") result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "name_desc") result = [...result].sort((a, b) => b.name.localeCompare(a.name));
    return result;
  }, [shopWines, search, selectedType, selectedPrice, selectedFlavor, showFavoritesOnly, favorites, sortBy]);

  const activeFilterCount = (selectedType !== "Todos" ? 1 : 0) + (selectedPrice !== 0 ? 1 : 0) + (selectedFlavor ? 1 : 0) + (showFavoritesOnly ? 1 : 0);

  const startVoucherFunnel = () => {
    if (lead?.birth_date) {
      generateVoucher();
    } else {
      setFunnelStep("profile");
    }
  };

  const handleProfileComplete = async (data: { birth_date?: string; income_class?: string; gender?: string }): Promise<boolean> => {
    try {
      await updateProfile(data);
      const ok = await generateVoucher();
      if (!ok) throw new Error("voucher_generation_failed");
      setFunnelStep(null);
      return true;
    } catch {
      toast.error("Erro ao gerar voucher. Tente novamente.");
      return false;
    }
  };

  const generateVoucher = async (): Promise<boolean> => {
    if (!lead) return false;
    setGenerating(true);
    const firstName = lead.name.split(" ")[0].toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const num = Math.floor(Math.random() * 9000 + 1000);
    const code = `#${firstName}-${num}`;
    try {
      const { data, error } = await invokeAuth("tourist-actions", {
        action: "create_voucher",
        code,
        items: items.map((i) => ({ wine_id: i.wine.id, id: i.wine.id, name: i.wine.name, qty: i.quantity, quantity: i.quantity, price: (Number(i.wine.price_bottle) || 0) * discountMultiplier })),
        total: Number(discountedTotal) || 0,
        capture_point_id: resolvedCPs?.shop_cp ?? new URLSearchParams(location.search).get("cp") ?? undefined,
        channel: "shop",
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setVoucher({ code, id: data?.voucher?.id });
      toast.success(t("shop.voucher_generated"));
      // Award loyalty point + handle referral propagation (fire and forget)
      invokeAuth("tourist-loyalty", { action: "award_voucher_points" }).catch(() => {});
      try {
        const qrUrl = await QRCode.toDataURL(code, { width: 200, margin: 2, color: { dark: "#000000", light: "#ffffff" } });
        setQrDataUrl(qrUrl);
      } catch {}
      return true;
    } catch {
      toast.error(t("shop.voucher_error"));
      return false;
    } finally {
      setGenerating(false);
    }
  };

  const handleNpsSubmit = async (score: number, comment: string) => {
    if (voucher?.id) {
      try {
        await invokeAuth("tourist-actions", { action: "submit_nps", voucher_id: voucher.id, nps_score: score, comment });
        toast.success(t("nps.thanks"));
      } catch {}
    }
    setShowNps(false);
  };

  const handleNewPurchase = () => {
    setVoucher(null);
    setQrDataUrl(null);
    clearCart();
    setShowCart(false);
  };

  return (
    <div className="space-y-4">
      {/* Cart */}
      {!voucher && (
        <ShopCart
          items={items}
          total={total}
          discountedTotal={discountedTotal}
          discountApplied={discountApplied}
          currency={cur}
          showCart={showCart}
          setShowCart={setShowCart}
          updateQuantity={updateQuantity}
          removeItem={removeItem}
          onGenerateVoucher={startVoucherFunnel}
          generating={generating}
          t={t}
        />
      )}

      {/* Voucher */}
      {voucher && (
        <ShopVoucher
          voucher={voucher}
          qrDataUrl={qrDataUrl}
          discountedTotal={discountedTotal}
          currency={cur}
          onNewPurchase={handleNewPurchase}
          t={t}
          wineryName={winery.name}
        />
      )}

      {/* Profile Funnel */}
      <AnimatePresence>
        {funnelStep === "profile" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-6">
            <div className="w-full max-w-sm">
              <ProfileForm wineryColor={winery.primary_color} onComplete={handleProfileComplete} onSkip={() => setFunnelStep(null)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NPS Modal */}
      <AnimatePresence>
        {showNps && <NpsModal onSubmit={handleNpsSubmit} onSkip={() => setShowNps(false)} />}
      </AnimatePresence>

      {/* Voucher Redeemed Modal */}
      <AnimatePresence>
        {voucherRedeemed && (
          <VoucherRedeemedModal
            total={discountedTotal}
            currency={cur}
            onClose={() => {
              setVoucherRedeemed(false);
              handleNewPurchase();
              setShowNps(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Favorites Shelf */}
      {!voucher && favoriteWines.length > 0 && !showFavoritesOnly && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 fill-red-500 text-red-500" />
              <h2 className="font-display text-sm font-semibold text-foreground">{t("shop.your_favorites")}</h2>
            </div>
            <button onClick={() => setShowFavoritesOnly(true)} className="text-[11px] text-gold font-medium flex items-center gap-0.5">
              {t("shop.see_all")} <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
            {favoriteWines.slice(0, 6).map((wine) => (
              <div key={wine.id} className="flex-shrink-0 w-32">
                <div className="bg-card rounded-xl border border-border/30 overflow-hidden" onClick={() => setDetailWine(wine)}>
                  <div className="h-24 bg-gradient-to-b from-wine/15 to-transparent flex items-center justify-center cursor-pointer">
                    {wine.image_url ? (
                      <img src={wine.image_url} alt={wine.name} className="w-full h-full object-cover" />
                    ) : (
                      <WineIcon className="w-6 h-6 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] font-semibold text-foreground line-clamp-1">{wine.name}</p>
                    <p className="text-[10px] font-bold text-gold">{formatCurrencyShort(Number(wine.price_bottle), cur)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Shop */}
      {!voucher && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="w-4 h-4 text-gold" />
            <h2 className="font-display text-sm font-semibold text-foreground">{t("shop.discover_wines")}</h2>
          </div>

          <ShopFilters
            search={search} setSearch={setSearch}
            showFilters={showFilters} setShowFilters={setShowFilters}
            selectedType={selectedType} setSelectedType={setSelectedType}
            selectedPrice={selectedPrice} setSelectedPrice={setSelectedPrice}
            selectedFlavor={selectedFlavor} setSelectedFlavor={setSelectedFlavor}
            showFavoritesOnly={showFavoritesOnly} setShowFavoritesOnly={setShowFavoritesOnly}
            activeFilterCount={activeFilterCount}
            favoriteCount={favoriteWines.length}
            t={t}
          />

          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-muted-foreground">
              {filteredWines.length} {filteredWines.length === 1 ? t("shop.wine_found") : t("shop.wines_found")}
            </p>
            <ShopSortSelect value={sortBy} onChange={setSortBy} locale={locale} />
          </div>

          {!wines ? (
            <WineGridSkeleton count={6} />
          ) : shopWines.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gold/10 flex items-center justify-center">
                <WineIcon className="w-8 h-8 text-gold" />
              </div>
              <h3 className="font-display text-base font-bold text-foreground mb-2">{t("shop.empty_title")}</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">{t("shop.empty_desc")}</p>
            </div>
          ) : (
            <>
              <motion.div layout className="grid grid-cols-2 gap-3">
                <AnimatePresence>
                  {filteredWines.map((wine) => (
                    <ShopWineCard
                      key={wine.id}
                      wine={wine}
                      translatedName={wineNameMap[wine.id] || wine.name}
                      currency={cur}
                      winerySlug={winery.slug}
                      onAdd={() => { addItem(wine); toast.success(`${wine.name} ${t("shop.added_to_cart")}`); }}
                      onDetail={() => setDetailWine(wine)}
                      onRate={() => setRatingWine(wine)}
                      isFavorite={isFavorite(wine.id)}
                      onToggleFavorite={() => {
                        toggleFavorite(wine.id);
                        if (!isFavorite(wine.id)) toast.success(t("shop.added_favorites"));
                      }}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>

              {filteredWines.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">{t("shop.no_wines_found")}</p>
              )}
            </>
          )}
        </section>
      )}

      {/* Wine Detail Modal */}
      <AnimatePresence>
        {detailWine && (
          <WineDetailModal
            wine={detailWine}
            onClose={() => setDetailWine(null)}
            onAdd={() => { addItem(detailWine); toast.success(`${detailWine.name} ${t("shop.added_to_cart")}`); }}
            t={t}
            currency={cur}
            winerySlug={winery.slug}
          />
        )}
      </AnimatePresence>

      {/* Rating Modal */}
      <AnimatePresence>
        {ratingWine && (
          <RatingModal
            wine={ratingWine}
            onClose={() => setRatingWine(null)}
            onSubmit={async (r) => {
              try {
                await invokeAuth("tourist-actions", {
                  action: "upsert_rating",
                  wine_id: ratingWine.id,
                  stars_acidity: r.acidity,
                  stars_body: r.body,
                  stars_sweetness: r.sweetness,
                });
                toast.success(t("rating.submitted") || "Avaliação enviada!");
                setUserRatings((prev) => {
                  const others = prev.filter((x) => x.wine_id !== ratingWine.id);
                  return [...others, { wine_id: ratingWine.id, stars_acidity: r.acidity, stars_body: r.body, stars_sweetness: r.sweetness }];
                });
              } catch {
                toast.error("Erro ao enviar avaliação");
              } finally {
                setRatingWine(null);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
