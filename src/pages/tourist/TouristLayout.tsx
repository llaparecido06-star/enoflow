import { Outlet, useParams, useLocation, useNavigate } from "react-router-dom";
import { useWinery } from "@/hooks/useWinery";
import { useDynamicTheme } from "@/hooks/useDynamicTheme";
import { TouristAuthProvider, useTouristAuth } from "@/hooks/useTouristAuth";
import { I18nProvider, useI18n, LanguageSelector } from "@/lib/i18n";
import BottomNav from "@/components/tourist/BottomNav";
import WhatsAppLogin from "@/components/tourist/WhatsAppLogin";
import QuizSommelier from "@/components/tourist/QuizSommelier";
import { Loader2, LogOut, Wine } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useEffect, useState } from "react";

function InnerLayout({ slug, winery }: { slug: string; winery: any }) {
  const { isAuthenticated, lead, login, logout, updateProfile } = useTouristAuth();
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const enabledModules: string[] = winery.enabled_modules ?? ["tasting", "restaurant", "shop"];
  const [showQuiz, setShowQuiz] = useState(false);

  // Read acquisition params from URL
  const searchParams = new URLSearchParams(location.search);
  const acqCategory = searchParams.get("category") || undefined;
  const acqLocation = searchParams.get("location") || undefined;
  const capturePointId = searchParams.get("cp") || undefined;

  const moduleMap: Record<string, string> = { restaurant: "restaurant", shop: "shop" };
  useEffect(() => {
    const pathSuffix = location.pathname.replace(`/app/${slug}`, "").replace(/^\//, "");
    const mod = moduleMap[pathSuffix];
    if (mod && !enabledModules.includes(mod)) {
      navigate(`/app/${slug}`, { replace: true });
    }
  }, [location.pathname, enabledModules]);

  // Show quiz right after first login (no preferences yet)
  useEffect(() => {
    if (isAuthenticated && lead && !lead.preferences_summary) {
      setShowQuiz(true);
    }
  }, [isAuthenticated, lead?.id]);

  if (!isAuthenticated) {
    return (
      <WhatsAppLogin
        wineryName={winery.name}
        wineryColor={winery.primary_color}
        wineryLogo={winery.logo_url}
        onLogin={(name, whatsapp, acceptedTerms) => login(name, whatsapp, winery.id, acceptedTerms, acqCategory, acqLocation, capturePointId)}
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
        }}
        onSkip={() => setShowQuiz(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative pb-20">
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
        <Outlet context={{ winery, lead }} />
      </main>

      <BottomNav slug={slug} enabledModules={enabledModules} />
    </div>
  );
}

export default function TouristLayout() {
  const { slug } = useParams<{ slug: string }>();
  const { data: winery, isLoading, error } = useWinery(slug ?? "");

  useDynamicTheme(winery?.primary_color);

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
