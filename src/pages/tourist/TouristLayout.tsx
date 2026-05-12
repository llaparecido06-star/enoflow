import { Outlet, useParams, useLocation, useNavigate } from "react-router-dom";
import { useWinery } from "@/hooks/useWinery";
import { useDynamicTheme } from "@/hooks/useDynamicTheme";
import { TouristAuthProvider, useTouristAuth } from "@/hooks/useTouristAuth";
import { I18nProvider, useI18n, LanguageSelector } from "@/lib/i18n";
import BottomNav from "@/components/tourist/BottomNav";
import PullToRefresh from "@/components/tourist/PullToRefresh";
import WhatsAppLogin from "@/components/tourist/WhatsAppLogin";
import QuizSommelier from "@/components/tourist/QuizSommelier";
import { Loader2, LogOut, Wine, Instagram, Facebook, Youtube, MapPin, Star, Globe } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useEffect, useState, useRef, useCallback } from "react";
import { invokeAuth } from "@/lib/auth-api";
import { useQueryClient } from "@tanstack/react-query";

interface ResolvedCPs {
  restaurant_cp: string | null;
  shop_cp: string | null;
  tasting_cp: string | null;
  tasting_package_ids: string[];
}

function InnerLayout({ slug, winery }: { slug: string; winery: any }) {
  const { isAuthenticated, lead, login, logout, updateProfile } = useTouristAuth();
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const enabledModules: string[] = winery.enabled_modules ?? ["tasting", "restaurant", "shop"];
  const [showQuiz, setShowQuiz] = useState(false);
  const [pendingRedirectCategory, setPendingRedirectCategory] = useState<string | null>(null);
  const [resolvedCPs, setResolvedCPs] = useState<ResolvedCPs | null>(null);
  const queryClient = useQueryClient();

  // Read acquisition params from URL
  const searchParams = new URLSearchParams(location.search);
  const acqCategory = searchParams.get("category") || undefined;
  const acqLocation = searchParams.get("location") || undefined;
  const capturePointId = searchParams.get("cp") || undefined;
  const referrerId = searchParams.get("ref") || undefined;

  // Persist referrer once authenticated
  useEffect(() => {
    if (!isAuthenticated || !referrerId) return;
    invokeAuth("tourist-loyalty", { action: "set_referrer", referrer_id: referrerId }).catch(() => {});
  }, [isAuthenticated, referrerId]);

  const categoryToPath: Record<string, string> = { restaurant: "/restaurant", shop: "/shop", tasting: "" };
  const hasTrackedVisit = useRef(false);
  const hasResolvedCPs = useRef(false);

  const moduleMap: Record<string, string> = { restaurant: "restaurant", shop: "shop" };
  useEffect(() => {
    const pathSuffix = location.pathname.replace(`/app/${slug}`, "").replace(/^\//, "");
    const mod = moduleMap[pathSuffix];
    if (mod && !enabledModules.includes(mod)) {
      navigate(`/app/${slug}`, { replace: true });
    }
  }, [location.pathname, enabledModules]);

  // Track visit for returning authenticated users who arrive via QR code
  useEffect(() => {
    if (!isAuthenticated || hasTrackedVisit.current) return;
    if (!capturePointId && !acqCategory && !acqLocation) return;
    hasTrackedVisit.current = true;
    invokeAuth("tourist-actions", {
      action: "track_visit",
      capture_point_id: capturePointId || undefined,
      capture_category: acqCategory || undefined,
      capture_location: acqLocation || undefined,
    }).catch(() => {});
    // Navigate to the right tab based on QR category
    const path = categoryToPath[acqCategory || ""] ?? "";
    const cpQuery = capturePointId ? `?cp=${capturePointId}` : "";
    navigate(`/app/${slug}${path}${cpQuery}`, { replace: true });
  }, [isAuthenticated, capturePointId, acqCategory, acqLocation]);

  // Resolve linked capture points
  useEffect(() => {
    if (!isAuthenticated || !capturePointId || hasResolvedCPs.current) return;
    hasResolvedCPs.current = true;
    invokeAuth("tourist-actions", {
      action: "resolve_capture_point",
      capture_point_id: capturePointId,
    }).then(({ data }) => {
      if (data?.resolved) {
        setResolvedCPs(data.resolved);
      }
    }).catch(() => {});
  }, [isAuthenticated, capturePointId]);

  // Show quiz right after first login (no preferences yet)
  useEffect(() => {
    if (isAuthenticated && lead && !lead.preferences_summary) {
      setShowQuiz(true);
    } else if (isAuthenticated && pendingRedirectCategory !== null) {
      // No quiz needed, redirect immediately
      navigateToCategory(pendingRedirectCategory);
      setPendingRedirectCategory(null);
    }
  }, [isAuthenticated, lead?.id]);

  const navigateToCategory = (category: string | null) => {
    const path = categoryToPath[category || ""] ?? "";
    const cpQuery = capturePointId ? `?cp=${capturePointId}` : "";
    navigate(`/app/${slug}${path}${cpQuery}`, { replace: true });
  };

  if (!isAuthenticated) {
    return (
      <WhatsAppLogin
        wineryName={winery.name}
        wineryColor={winery.primary_color}
        wineryLogo={winery.logo_url}
        onLogin={async (name, whatsapp, acceptedTerms) => {
          const captureCategory = await login(name, whatsapp, winery.id, acceptedTerms, acqCategory, acqLocation, capturePointId);
          setPendingRedirectCategory(captureCategory);
        }}
      />
    );
  }

  if (showQuiz) {
    return (
      <QuizSommelier
        wineryColor={winery.primary_color}
        onComplete={async (preferences) => {
          try {
            await updateProfile({ preferences_summary: preferences });
          } catch {}
          setShowQuiz(false);
          if (pendingRedirectCategory !== null) {
            navigateToCategory(pendingRedirectCategory);
            setPendingRedirectCategory(null);
          }
        }}
        onSkip={() => {
          setShowQuiz(false);
          if (pendingRedirectCategory !== null) {
            navigateToCategory(pendingRedirectCategory);
            setPendingRedirectCategory(null);
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative pb-28">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {winery.logo_url ? (
              <img src={winery.logo_url} alt={winery.name} className="w-8 h-8 rounded-full object-cover ring-1 ring-gold/20" />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-1 ring-gold/20"
                style={{ backgroundColor: winery.primary_color, color: '#fff' }}
              >
                {winery.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-display text-base font-semibold text-foreground truncate">{winery.name}</h1>
              <p className="text-[10px] text-muted-foreground">{t("header.hello")} {lead?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <LanguageSelector />
            <ThemeToggle />
            <button onClick={logout} className="p-2 rounded-lg hover:bg-muted transition-colors">
              <LogOut className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-4">
        <PullToRefresh onRefresh={async () => {
          await queryClient.invalidateQueries({ queryKey: ["wines", winery.id] });
          await queryClient.invalidateQueries({ queryKey: ["menu_items", winery.id] });
          await queryClient.invalidateQueries({ queryKey: ["tasting_packages", winery.id] });
        }}>
          <Outlet context={{ winery, lead, resolvedCPs }} />
        </PullToRefresh>
      </main>

      <SocialFooter winery={winery} />

      <BottomNav slug={slug} enabledModules={enabledModules} />
    </div>
  );
}

function SocialFooter({ winery }: { winery: any }) {
  const clean = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t.length > 0 ? t : null;
  };

  const links = [
    { url: clean(winery.instagram_url), Icon: Instagram, label: "Instagram" },
    { url: clean(winery.facebook_url), Icon: Facebook, label: "Facebook" },
    { url: clean(winery.youtube_url), Icon: Youtube, label: "YouTube" },
  ].filter((l): l is { url: string; Icon: typeof Instagram; label: string } => !!l.url);

  const reviewLinks = [
    { url: clean(winery.google_business_url), label: "Avalie no Google", Icon: Star },
    { url: clean(winery.tripadvisor_url), label: "Avalie no TripAdvisor", Icon: MapPin },
  ].filter((l): l is { url: string; label: string; Icon: typeof Star } => !!l.url);

  if (links.length === 0 && reviewLinks.length === 0) return null;

  return (
    <footer className="px-4 pb-4 pt-2 space-y-3">
      {reviewLinks.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-3 space-y-2">
          <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-gold fill-gold" /> Gostou da experiência?
          </p>
          <div className={`grid gap-2 ${reviewLinks.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
            {reviewLinks.map((l) => (
              <a
                key={l.label}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/15 active:scale-[0.98] transition-all min-h-[40px]"
              >
                <l.Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{l.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}
      {links.length > 0 && (
        <div className="flex items-center justify-center gap-3">
          {links.map(({ url, Icon, label }) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition-all"
            >
              <Icon className="w-4 h-4" />
            </a>
          ))}
        </div>
      )}
    </footer>
  );
}

export default function TouristLayout() {
  const { slug } = useParams<{ slug: string }>();
  const { data: winery, isLoading, error } = useWinery(slug ?? "");

  useDynamicTheme(winery?.primary_color);

  // Dynamic SEO meta tags
  useEffect(() => {
    if (!winery) return;
    document.title = `${winery.name} — Experiência Digital | EnoFlow`;
    const metaDesc = document.querySelector('meta[name="description"]');
    const desc = `Explore os vinhos de ${winery.name}. Degustação, cardápio e loja com desconto exclusivo.`;
    if (metaDesc) {
      metaDesc.setAttribute("content", desc);
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = desc;
      document.head.appendChild(meta);
    }
    return () => { document.title = "EnoFlow"; };
  }, [winery?.name]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !winery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Vinícola não encontrada</h1>
          <p className="text-muted-foreground text-sm">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }

  // Kill Switch: winery inactive
  if ((winery as any).status && (winery as any).status !== "active") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Wine className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground mb-2">Experiência indisponível</h1>
          <p className="text-sm text-muted-foreground">Esta experiência está temporariamente indisponível. Contate a administração.</p>
        </div>
      </div>
    );
  }

  return (
    <I18nProvider>
      <TouristAuthProvider wineryId={winery.id}>
        <InnerLayout slug={slug!} winery={winery} />
      </TouristAuthProvider>
    </I18nProvider>
  );
}
