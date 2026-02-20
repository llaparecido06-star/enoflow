import { Outlet, useParams, useLocation, useNavigate } from "react-router-dom";
import { useWinery } from "@/hooks/useWinery";
import { useAdminAuth, type AdminRole } from "@/hooks/useAdminAuth";
import { Wine, Package, BarChart3, Users, Settings, Loader2, LogOut, UtensilsCrossed, UserCog, LayoutDashboard, Rocket } from "lucide-react";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import ThemeToggle from "@/components/ThemeToggle";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "", minRole: "owner" as AdminRole },
  { id: "wines", label: "Vinhos", icon: Wine, path: "/wines", minRole: "manager" as AdminRole },
  { id: "packages", label: "Pacotes", icon: Package, path: "/packages", minRole: "manager" as AdminRole },
  { id: "menu", label: "Cardápio", icon: UtensilsCrossed, path: "/menu", minRole: "manager" as AdminRole },
  { id: "leads", label: "Leads", icon: Users, path: "/leads", minRole: "owner" as AdminRole },
  { id: "reports", label: "Relatórios", icon: BarChart3, path: "/reports", minRole: "owner" as AdminRole },
  { id: "staff", label: "Equipe", icon: UserCog, path: "/staff", minRole: "owner" as AdminRole },
  { id: "training", label: "Treinamento", icon: Rocket, path: "/training", minRole: "manager" as AdminRole },
  { id: "settings", label: "Config.", icon: Settings, path: "/settings", minRole: "staff" as AdminRole },
];

export default function AdminLayout() {
  const { slug } = useParams<{ slug: string }>();
  const { data: winery, isLoading } = useWinery(slug ?? "");
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = `/admin/${slug}`;

  const { admin, loading: authLoading, login, logout, hasPermission } = useAdminAuth(winery?.id ?? "");

  if (isLoading || authLoading) {
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

  if (!admin) {
    return <AdminLoginForm onLogin={login} wineryName={winery.name} />;
  }

  const visibleNav = navItems.filter((n) => hasPermission(n.minRole));
  const activeItem = visibleNav.find((n) => location.pathname === basePath + n.path)?.id ?? visibleNav[0]?.id;

  const roleLabel: Record<AdminRole, string> = {
    staff: "Staff",
    manager: "Manager",
    owner: "Owner",
    master: "Master",
  };

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
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm font-semibold text-sidebar-foreground truncate">{winery.name}</p>
              <p className="text-[10px] text-sidebar-foreground/60">{admin.name} · {roleLabel[admin.role]}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {visibleNav.map((item) => {
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
        <div className="p-3 border-t border-sidebar-border flex items-center justify-between">
          <button onClick={() => { logout(); navigate("/"); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive/80 hover:bg-destructive/10 transition-colors">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border">
        <div className="flex justify-around py-2 overflow-x-auto">
          {visibleNav.map((item) => {
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(basePath + item.path)}
                className={`flex flex-col items-center gap-0.5 px-1.5 py-1 min-w-[3rem] ${
                  isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[9px]">{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => { logout(); navigate("/"); }}
            className="flex flex-col items-center gap-0.5 px-1.5 py-1 min-w-[3rem] text-destructive/70"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[9px]">Sair</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8">
        <Outlet context={{ winery, admin, hasPermission }} />
      </main>
    </div>
  );
}
