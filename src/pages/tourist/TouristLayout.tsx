import { Outlet, useParams } from "react-router-dom";
import { useWinery } from "@/hooks/useWinery";
import BottomNav from "@/components/tourist/BottomNav";
import { Loader2 } from "lucide-react";

export default function TouristLayout() {
  const { slug } = useParams<{ slug: string }>();
  const { data: winery, isLoading, error } = useWinery(slug ?? "");

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
    <div className="min-h-screen bg-background max-w-lg mx-auto relative pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          {winery.logo_url ? (
            <img src={winery.logo_url} alt={winery.name} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: winery.primary_color, color: '#fff' }}
            >
              {winery.name.charAt(0)}
            </div>
          )}
          <h1 className="font-display text-base font-semibold text-foreground truncate">{winery.name}</h1>
        </div>
      </header>

      <main className="px-4 py-4">
        <Outlet context={{ winery }} />
      </main>

      <BottomNav slug={slug!} />
    </div>
  );
}
