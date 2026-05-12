import { Outlet, useParams, useLocation, useNavigate } from "react-router-dom";
import { useWinery } from "@/hooks/useWinery";
import { useAdminAuth, type AdminRole } from "@/hooks/useAdminAuth";
import { useVoucherNotifications } from "@/hooks/useVoucherNotifications";
import { Wine, Package, Users, Loader2, LogOut, UtensilsCrossed, UserCog, LayoutDashboard, Rocket, QrCode, MapPin, Activity, MessageSquare, MoreHorizontal, CalendarCheck, Boxes, DollarSign, Building2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import NotificationBell from "@/components/admin/crm/NotificationBell";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

// salesOnly excludes the item from sales-only sidebars
const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "", minRole: "owner" as AdminRole, salesOnly: false },
  { id: "wines", label: "Vinhos", icon: Wine, path: "/wines", minRole: "manager" as AdminRole, salesOnly: false },
  { id: "packages", label: "Pacotes", icon: Package, path: "/packages", minRole: "manager" as AdminRole, salesOnly: false },
  { id: "menu", label: "Cardápio", icon: UtensilsCrossed, path: "/menu", minRole: "manager" as AdminRole, salesOnly: false },
  { id: "leads", label: "Leads", icon: Users, path: "/leads", minRole: "sales" as AdminRole, salesOnly: true },
  { id: "staff", label: "Equipe", icon: UserCog, path: "/staff", minRole: "owner" as AdminRole, salesOnly: false },
  { id: "performance", label: "Performance", icon: Activity, path: "/performance", minRole: "owner" as AdminRole, salesOnly: false },
  { id: "locations", label: "Pontos de Captura", icon: MapPin, path: "/locations", minRole: "manager" as AdminRole, salesOnly: false },
  { id: "training", label: "Treinamento", icon: Rocket, path: "/training", minRole: "staff" as AdminRole, salesOnly: false },
  { id: "campaigns", label: "Campanhas", icon: MessageSquare, path: "/campaigns", minRole: "owner" as AdminRole, salesOnly: false },
  { id: "settings", label: "Vouchers", icon: QrCode, path: "/settings", minRole: "staff" as AdminRole, salesOnly: false },
];

export default function AdminLayout() {
  const { slug } = useParams<{ slug: string }>();
  const { data: winery, isLoading } = useWinery(slug ?? "");
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = `/admin/${slug}`;

  const { admin, loading: authLoading, logout, hasPermission } = useAdminAuth(winery?.id ?? "");

  // Real-time voucher redemption notifications for owners and managers
  useVoucherNotifications(winery?.id, !!admin && hasPermission("manager"));

  // Force light mode in admin
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !authLoading && !admin) {
      navigate("/admin/login", { replace: true });
    }
  }, [admin, isLoading, authLoading, navigate]);

  const visibleNav = useMemo(() => {
    if (admin?.role === "sales") return navItems.filter((n) => n.salesOnly);
    return navItems.filter((n) => hasPermission(n.minRole));
  }, [hasPermission, admin?.role]);

  // Redirect staff/manager to default page
  useEffect(() => {
    if (!admin || isLoading || authLoading) return;
    const currentPathNow = location.pathname;
    const isBase = currentPathNow === basePath || currentPathNow === basePath + "/";
    if (isBase && !hasPermission("owner" as AdminRole) && visibleNav.length > 0) {
      const defaultItem = visibleNav.find(n => n.id === "settings") ?? visibleNav[0];
      navigate(basePath + defaultItem.path, { replace: true });
    }
  }, [location.pathname, basePath, hasPermission, visibleNav, navigate, admin, isLoading, authLoading]);

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

  // Kill switch: winery inactive
  if ((winery as any).status && (winery as any).status !== "active") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Wine className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground mb-2">Vinícola Inativa</h1>
          <p className="text-sm text-muted-foreground">Esta vinícola está temporariamente inativa. Contate a administração.</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  const activeItem = visibleNav.find((n) => location.pathname === basePath + n.path)?.id ?? visibleNav[0]?.id;

  const roleLabel: Record<AdminRole, string> = {
    staff: "Staff",
    sales: "Atendente",
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
            {winery.logo_url ? (
              <img src={winery.logo_url} alt={winery.name} className="w-9 h-9 rounded-lg object-cover" />
            ) : (
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: winery.primary_color, color: '#fff' }}
              >
                {winery.name.charAt(0)}
              </div>
            )}
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
        <div className="p-3 border-t border-sidebar-border">
          <button onClick={() => { logout(); navigate("/admin/login"); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive/80 hover:bg-destructive/10 transition-colors">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile nav - 4 primary + Mais sheet */}
      <MobileBottomNav
        items={visibleNav}
        activeItem={activeItem}
        basePath={basePath}
        navigate={navigate}
        onLogout={() => { logout(); navigate("/admin/login"); }}
      />

      {/* Content */}
      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8">
        <div className="flex justify-end mb-2">
          <NotificationBell wineryId={winery.id} basePath={basePath} />
        </div>
        <Outlet context={{ winery, admin, hasPermission }} />
      </main>
    </div>
  );
}

function MobileBottomNav({ items, activeItem, basePath, navigate, onLogout }: {
  items: typeof navItems;
  activeItem: string | undefined;
  basePath: string;
  navigate: ReturnType<typeof useNavigate>;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  // Prioritize: leads, dashboard, wines, agenda-equivalents
  const priority = ["leads", "dashboard", "wines", "staff", "menu", "packages"];
  const primary = priority
    .map((id) => items.find((i) => i.id === id))
    .filter(Boolean)
    .slice(0, 4) as typeof items;
  // Fallback fill with first items if fewer primary
  if (primary.length < 4) {
    for (const it of items) {
      if (primary.length >= 4) break;
      if (!primary.find((p) => p.id === it.id)) primary.push(it);
    }
  }
  const overflow = items.filter((i) => !primary.find((p) => p.id === i.id));

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border">
      <div className="flex justify-around py-2">
        {primary.map((item) => {
          const isActive = activeItem === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(basePath + item.path)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 flex-1 ${
                isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] truncate max-w-full">{item.label}</span>
            </button>
          );
        })}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center gap-0.5 px-2 py-1 flex-1 text-sidebar-foreground/60">
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-[9px]">Mais</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Mais opções</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {overflow.map((item) => {
                const isActive = activeItem === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { navigate(basePath + item.path); setOpen(false); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border ${
                      isActive ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-xs text-center">{item.label}</span>
                  </button>
                );
              })}
              <button
                onClick={() => { onLogout(); setOpen(false); }}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-destructive/30 text-destructive"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-xs">Sair</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}