import { useNavigate } from "react-router-dom";
import { Wine, ArrowRight, Grape } from "lucide-react";
import heroImage from "@/assets/hero-winery.jpg";
import ThemeToggle from "@/components/ThemeToggle";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative h-[70vh] overflow-hidden">
        <img
          src={heroImage}
          alt="Wine cellar"
          className="absolute inset-0 w-full h-full object-cover" />

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

      {/* Quick access */}
      <div className="max-w-lg mx-auto px-6 py-8 space-y-4">
        <button
          onClick={() => navigate("/app/vinicola-goes")}
          className="w-full flex items-center justify-between bg-card border border-border rounded-xl p-4 hover:bg-secondary/50 transition-colors group animate-fade-in">

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#630D16' }}>
              <Wine className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="text-left">
              <p className="text-sm font-display font-semibold text-foreground">Vinícola Góes</p>
              <p className="text-[11px] text-muted-foreground">Experiência do Turista</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => navigate("/admin/vinicola-goes")}
          className="w-full flex items-center justify-between bg-card border border-border rounded-xl p-4 hover:bg-secondary/50 transition-colors group animate-fade-in"
          style={{ animationDelay: "0.1s" }}>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sidebar flex items-center justify-center">
              <Wine className="w-5 h-5 text-sidebar-foreground" />
            </div>
            <div className="text-left">
              <p className="text-sm font-display font-semibold text-foreground">Painel Admin</p>
              <p className="text-[11px] text-muted-foreground">Gerenciamento da vinícola</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => navigate("/master")}
          className="w-full flex items-center justify-between bg-card border border-border rounded-xl p-4 hover:bg-secondary/50 transition-colors group animate-fade-in"
          style={{ animationDelay: "0.2s" }}>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <Grape className="w-5 h-5 text-accent-foreground" />
            </div>
            <div className="text-left">
              <p className="text-sm font-display font-semibold text-foreground">Master Admin</p>
              <p className="text-[11px] text-muted-foreground">Gestão da plataforma</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>);

};

export default Index;