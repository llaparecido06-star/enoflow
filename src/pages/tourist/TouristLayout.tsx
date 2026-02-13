import { Outlet, useParams } from "react-router-dom";
import { useWinery } from "@/hooks/useWinery";
import { useDynamicTheme } from "@/hooks/useDynamicTheme";
import { TouristAuthProvider, useTouristAuth } from "@/hooks/useTouristAuth";
import BottomNav from "@/components/tourist/BottomNav";
import WhatsAppLogin from "@/components/tourist/WhatsAppLogin";
import { Loader2, LogOut } from "lucide-react";

function InnerLayout({ slug, winery }: { slug: string; winery: any }) {
  const { isAuthenticated, lead, login, logout } = useTouristAuth();

  if (!isAuthenticated) {
    return (
      <WhatsAppLogin
        wineryName={winery.name}
        wineryColor={winery.primary_color}
        onLogin={(name, whatsapp) => login(name, whatsapp, winery.id)}
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
              <p className="text-[10px] text-muted-foreground">Olá, {lead?.name}</p>
            </div>
          </div>
          <button onClick={logout} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <LogOut className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      <main className="px-4 py-4">
        <Outlet context={{ winery, lead }} />
      </main>

      <BottomNav slug={slug} />
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

  return (
    <TouristAuthProvider wineryId={winery.id}>
      <InnerLayout slug={slug!} winery={winery} />
    </TouristAuthProvider>
  );
}
