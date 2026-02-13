import { Outlet, useParams, useLocation, useNavigate } from "react-router-dom";
import { useWinery } from "@/hooks/useWinery";
import { Wine, Package, BarChart3, Users, Settings, Loader2 } from "lucide-react";

const navItems = [
  { id: "wines", label: "Vinhos", icon: Wine, path: "" },
  { id: "packages", label: "Pacotes", icon: Package, path: "/packages" },
  { id: "leads", label: "Leads", icon: Users, path: "/leads" },
  { id: "reports", label: "Relatórios", icon: BarChart3, path: "/reports" },
  { id: "settings", label: "Configurações", icon: Settings, path: "/settings" },
];

export default function AdminLayout() {
  const { slug } = useParams<{ slug: string }>();
  const { data: winery, isLoading } = useWinery(slug ?? "");
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = `/admin/${slug}`;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!winery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Vinícola não encontrada.</p>
      </div>
    );
  }

  const activeItem = navItems.find((n) => location.pathname === basePath + n.path)?.id ?? "wines";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: winery.primary_color, color: '#fff' }}
            >
              {winery.name.charAt(0)}
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-sidebar-foreground truncate">{winery.name}</p>
              <p className="text-[10px] text-sidebar-foreground/60">Painel Administrativo</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(basePath + item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border">
        <div className="flex justify-around py-2">
          {navItems.slice(0, 4).map((item) => {
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(basePath + item.path)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 ${
                  isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8">
        <Outlet context={{ winery }} />
      </main>
    </div>
  );
}
