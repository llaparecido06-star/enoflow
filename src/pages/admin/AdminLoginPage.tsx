import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, Loader2, Wine, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setSessionToken } from "@/lib/auth-api";

const ADMIN_STORAGE_KEY = "smartsommelier_admin";
const MASTER_STORAGE_KEY = "smartsommelier_master";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("session-auth", {
        body: { type: "sso", email, password },
      });

      if (fnError) throw new Error("Credenciais inválidas");
      if (data?.error) throw new Error(data.error);
      if (!data?.user || !data?.token) throw new Error("Credenciais inválidas");

      setSessionToken(data.token);
      const user = data.user;

      if (user.role === "master") {
        localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(user));
        navigate("/master", { replace: true });
      } else {
        localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(user));
        navigate(`/admin/${data.winery_slug}`, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || "Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Wine className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">EnoFlow</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {showForgot ? "Recuperar acesso" : "Acesse seu painel"}
          </p>
        </div>

        {showForgot ? (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">Para redefinir sua senha:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Contate o administrador da sua vinícola</li>
                <li>Ele pode alterar sua senha no painel de <strong>Equipe</strong></li>
                <li>Masters podem redefinir diretamente</li>
              </ol>
            </div>
            <button
              onClick={() => setShowForgot(false)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm border border-border hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar ao login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full pl-10 pr-3 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                  className="w-full pl-10 pr-3 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Entrar
            </button>

            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              Esqueci minha senha
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
