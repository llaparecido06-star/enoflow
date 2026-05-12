import { Outlet, useParams, useLocation, useNavigate } from "react-router-dom";
import { useWinery } from "@/hooks/useWinery";
import { useAdminAuth, type AdminRole } from "@/hooks/useAdminAuth";
import { useVoucherNotifications } from "@/hooks/useVoucherNotifications";
import { Wine, Package, Users, Loader2, LogOut, UtensilsCrossed, UserCog, LayoutDashboard, Rocket, QrCode, MapPin, Activity, MessageSquare, MoreHorizontal, CalendarCheck, Boxes, DollarSign, Building2, Star, Gift, CalendarDays, Upload, Shield, Smartphone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import NotificationBell from "@/components/admin/crm/NotificationBell";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { can, type Capability } from "@/lib/admin/permissions";

type NavItem = { id: string; label: string; icon: any; path: string; cap: Capability; salesOnly?: boolean };
type NavGroup = { id: string; label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    id: "operacao",
    label: "Operação",
    items: [
      { id: "checkin", label: "Check-in", icon: Smartphone, path: "/checkin", cap: "checkin.use" },
      { id: "reservations", label: "Reservas", icon: CalendarCheck, path: "/reservations", cap: "reservations.view" },
      { id: "settings", label: "Vouchers", icon: QrCode, path: "/settings", cap: "vouchers.issue" },
    ],
  },
  {
    id: "relacionamento",
    label: "Relacionamento",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "", cap: "dashboard.view" },
      { id: "leads", label: "Leads", icon: Users, path: "/leads", cap: "crm.view", salesOnly: true },
      { id: "reviews", label: "Avaliações", icon: Star, path: "/reviews", cap: "reviews.view" },
      { id: "campaigns", label: "Campanhas", icon: MessageSquare, path: "/campaigns", cap: "campaigns.view" },
      { id: "loyalty", label: "Fidelidade", icon: Gift, path: "/loyalty", cap: "loyalty.view" },
    ],
  },
  {
    id: "catalogo",
    label: "Catálogo",
    items: [
      { id: "wines", label: "Vinhos", icon: Wine, path: "/wines", cap: "wines.view" },
      { id: "stock", label: "Estoque", icon: Boxes, path: "/stock", cap: "stock.view" },
      { id: "packages", label: "Pacotes", icon: Package, path: "/packages", cap: "packages.view" },
      { id: "menu", label: "Cardápio", icon: UtensilsCrossed, path: "/menu", cap: "menu.view" },
      { id: "events", label: "Eventos", icon: CalendarDays, path: "/events", cap: "events.view" },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    items: [
      { id: "finance", label: "Financeiro", icon: DollarSign, path: "/finance", cap: "finance.view" },
      { id: "performance", label: "Performance", icon: Activity, path: "/performance", cap: "performance.view" },
      { id: "audit", label: "Auditoria", icon: Shield, path: "/audit", cap: "audit.view" },
    ],
  },
  {
    id: "ajustes",
    label: "Ajustes",
    items: [
      { id: "staff", label: "Equipe", icon: UserCog, path: "/staff", cap: "staff.view" },
      { id: "locations", label: "Locais", icon: MapPin, path: "/locations", cap: "wines.manage" },
      { id: "training", label: "Treinamento", icon: Rocket, path: "/training", cap: "training.view" },
      { id: "import", label: "Importar", icon: Upload, path: "/import", cap: "import.manage" },
      { id: "config", label: "Configurações", icon: Building2, path: "/config", cap: "config.view" },
    ],
  },
];

const navItems: NavItem[] = navGroups.flatMap((g) => g.items);

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

  const visibleGroups = useMemo(() => {
    return navGroups
      .map((g) => ({
        ...g,
        items: admin?.role === "sales"
          ? g.items.filter((n) => n.salesOnly)
          : g.items.filter((n) => can(admin?.role, n.cap)),
      }))
      .filter((g) => g.items.length > 0);
  }, [admin?.role]);
  const visibleNav = useMemo(() => visibleGroups.flatMap((g) => g.items), [visibleGroups]);

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
      <aside className="hidden md:flex w-64 flex-col gradient-sidebar border-r border-sidebar-border">
        <div className="p-4 border-b border-sidebar-border/60">
          <div className="flex items-center gap-3">
            {winery.logo_url ? (
              <img src={winery.logo_url} alt={winery.name} className="w-10 h-10 rounded-xl object-cover ring-2 ring-background shadow-card" />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-card"
                style={{ background: `linear-gradient(135deg, ${winery.primary_color}, ${winery.primary_color}cc)` }}
              >
                {winery.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm font-semibold text-sidebar-foreground truncate tracking-tight">{winery.name}</p>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">{admin.name} · {roleLabel[admin.role]}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto scrollbar-hide">
          {visibleGroups.map((group) => (
            <div key={group.id} className="space-y-0.5">
              <p className="px-3 pt-1 pb-1.5 text-[10px] uppercase tracking-wider font-semibold text-sidebar-foreground/40">
                {group.label}
              </p>
              {group.items.map((item) => {
                const isActive = activeItem === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(basePath + item.path)}
                    className={`group w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 relative ${
                      isActive
                        ? "bg-card text-sidebar-primary font-medium shadow-card"
                        : "text-sidebar-foreground/70 hover:bg-card/60 hover:text-sidebar-foreground"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full gradient-primary" />
                    )}
                    <item.icon className={`w-4 h-4 transition-transform ${isActive ? "scale-110" : "group-hover:scale-105"}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border/60">
          <button onClick={() => { logout(); navigate("/admin/login"); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-destructive/80 hover:bg-destructive/10 transition-colors">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile nav - 4 primary + Mais sheet */}
      <MobileBottomNav
        items={visibleNav}
        groups={visibleGroups}
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

function MobileBottomNav({ items, groups, activeItem, basePath, navigate, onLogout }: {
  items: typeof navItems;
  groups: { id: string; label: string; items: typeof navItems }[];
  activeItem: string | undefined;
  basePath: string;
  navigate: ReturnType<typeof useNavigate>;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const priority = ["checkin", "reservations", "leads", "dashboard", "wines"];
  const primary = priority
    .map((id) => items.find((i) => i.id === id))
    .filter(Boolean)
    .slice(0, 4) as typeof items;
  if (primary.length < 4) {
    for (const it of items) {
      if (primary.length >= 4) break;
      if (!primary.find((p) => p.id === it.id)) primary.push(it);
    }
  }
  const groupsOverflow = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !primary.find((p) => p.id === i.id)) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border shadow-elevated">
      <div className="flex justify-around py-2 px-1 safe-area-inset-bottom">
        {primary.map((item) => {
          const isActive = activeItem === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(basePath + item.path)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 flex-1 rounded-xl transition-all ${
                isActive ? "text-primary bg-primary/8" : "text-muted-foreground active:scale-95"
              }`}
            >
              <item.icon className={`w-5 h-5 transition-transform ${isActive ? "scale-110" : ""}`} />
              <span className="text-[9px] truncate max-w-full font-medium">{item.label}</span>
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
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Mais opções</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-5 pb-4">
              {groupsOverflow.map((group) => (
                <div key={group.id}>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 px-1">{group.label}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {group.items.map((item) => {
                      const isActive = activeItem === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => { navigate(basePath + item.path); setOpen(false); }}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                            isActive ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground hover:bg-secondary/60"
                          }`}
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="text-xs text-center">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <button
                onClick={() => { onLogout(); setOpen(false); }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-destructive/30 text-destructive font-medium"
              >
                <LogOut className="w-5 h-5" />
                Sair
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}