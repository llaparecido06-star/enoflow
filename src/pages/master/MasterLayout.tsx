import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMasterAuth } from "@/hooks/useMasterAuth";
import { BarChart3, Building2, Users, Loader2, LogOut, Lock, Mail, Shield } from "lucide-react";
import { useState } from "react";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3, path: "" },
  { id: "wineries", label: "Vinícolas", icon: Building2, path: "/wineries" },
  { id: "admins", label: "Admins", icon: Users, path: "/admins" },
];

export default function MasterLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = "/master";
  const { admin, loading, login, logout } = useMasterAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!admin) {
    return <MasterLoginForm onLogin={login} />;
  }

  const activeItem = navItems.find((n) => location.pathname === basePath + n.path)?.id ?? "dashboard";

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-60 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
              <Shield className="w-5 h-5 text-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm font-semibold text-sidebar-foreground">Master Admin</p>
              <p className="text-[10px] text-sidebar-foreground/60">{admin.name}</p>
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
        <div className="p-3 border-t border-sidebar-border">
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
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
          <button onClick={logout} className="flex flex-col items-center gap-0.5 px-2 py-1 text-sidebar-foreground/60">
            <LogOut className="w-5 h-5" />
            <span className="text-[10px]">Sair</span>
          </button>
        </div>
      </div>

      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8">
        <Outlet context={{ admin }} />
      </main>
    </div>
  );
}

function MasterLoginForm({ onLogin }: { onLogin: (email: string, password: string) => Promise<any> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-accent" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">Master Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">SmartSommelier Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="master@smartsommelier.com"
                required
                className="w-full pl-10 pr-3 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-3 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>
          {error && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-accent-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Entrar como Master
          </button>
        </form>
        <p className="text-[10px] text-muted-foreground text-center mt-6">
          Credenciais: master@smartsommelier.com / master123
        </p>
      </div>
    </div>
  );
}
