import { useNavigate } from "react-router-dom";
import { Wine, ArrowRight, Grape, Lock, Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-winery.jpg";
import ThemeToggle from "@/components/ThemeToggle";

interface WinerySummary {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  status: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [wineries, setWineries] = useState<WinerySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("wineries")
      .select("id, name, slug, logo_url, primary_color, status")
      .eq("status", "active")
      .order("name")
      .then(({ data }) => {
        setWineries(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative h-[70vh] overflow-hidden">
        <img
          src={heroImage}
          alt="Wine cellar"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle className="bg-background/60 backdrop-blur-sm" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Grape className="w-5 h-5 text-gold" />
            <span className="text-xs font-medium text-gold tracking-wider uppercase">ENOFLOW</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white leading-tight mb-2 drop-shadow-lg">
            Inteligência em<br />Enoturismo
          </h1>
          <p className="text-sm text-white/80 leading-relaxed drop-shadow-md">
            A plataforma que conecta vinícolas aos seus visitantes com experiências digitais memoráveis.
          </p>
        </div>
      </div>

      {/* Wineries list + Admin login */}
      <div className="max-w-lg mx-auto px-6 py-8 space-y-6">
        {/* Wineries */}
        <div>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Vinícolas</h2>
          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : wineries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma vinícola ativa</p>
            ) : (
              wineries.map((w, i) => (
                <div
                  key={w.id}
                  className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <button
                    onClick={() => navigate(`/app/${w.slug}`)}
                    className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: w.primary_color }}
                      >
                        {w.logo_url ? (
                          <img src={w.logo_url} alt={w.name} className="w-7 h-7 object-contain rounded" />
                        ) : (
                          <Wine className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-display font-semibold text-foreground">{w.name}</p>
                        <p className="text-[11px] text-muted-foreground">Experiência do Turista</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Single admin login */}
        <div>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Administração</h2>
          <button
            onClick={() => navigate("/admin/login")}
            className="w-full flex items-center justify-between bg-card border border-border rounded-xl p-4 hover:bg-secondary/50 transition-colors group animate-fade-in"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sidebar flex items-center justify-center">
                <Lock className="w-5 h-5 text-sidebar-foreground" />
              </div>
              <div className="text-left">
                <p className="text-sm font-display font-semibold text-foreground">Painel Admin</p>
                <p className="text-[11px] text-muted-foreground">Login unificado (Admin & Master)</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;