import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import type { MasterAdmin } from "@/hooks/useMasterAuth";
import { invokeAuth } from "@/lib/auth-api";
import { Building2, Users, Wine, Receipt, TrendingUp, DollarSign, BarChart3, Loader2, Sparkles, CreditCard, Percent } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Metrics {
  total_wineries: number;
  total_leads: number;
  total_wines: number;
  total_vouchers: number;
  total_voucher_value: number;
  redeemed_voucher_value: number;
  total_commissions: number;
  total_admins: number;
  total_mrr: number;
  platform_commissions: number;
}

interface PersonaStats {
  sweet_tooth: number;
  bold_intense: number;
  fresh_crisp: number;
  balanced_explorer: number;
}

const personaLabels: Record<string, { label: string; emoji: string; color: string }> = {
  sweet_tooth: { label: "Amantes de Doçura", emoji: "🍬", color: "text-pink-400" },
  bold_intense: { label: "Encorpados", emoji: "🦁", color: "text-red-400" },
  fresh_crisp: { label: "Frescos & Leves", emoji: "🍋", color: "text-green-400" },
  balanced_explorer: { label: "Equilibrados", emoji: "⚖️", color: "text-blue-400" },
};

export default function MasterDashboardPage() {
  const { admin } = useOutletContext<{ admin: MasterAdmin }>();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [leadsChart, setLeadsChart] = useState<{ date: string; count: number }[]>([]);
  const [personaStats, setPersonaStats] = useState<PersonaStats | null>(null);
  const [personaTotal, setPersonaTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await invokeAuth("master-dashboard", {});
        if (res.error) throw res.error;
        if (res.data?.error) throw new Error(res.data.error);
        setMetrics(res.data.metrics);
        setLeadsChart(res.data.leads_chart ?? []);
        setPersonaStats(res.data.persona_stats ?? null);
        setPersonaTotal(res.data.persona_total ?? 0);
      } catch {
        console.error("Erro ao carregar dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [admin.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <span className="ml-3 text-sm text-muted-foreground italic">Consultando nosso Sommelier Digital...</span>
      </div>
    );
  }

  if (!metrics) return null;

  const heroKpis = [
    {
      label: "MRR Total (Assinaturas)",
      value: `R$ ${metrics.total_mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: CreditCard,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Comissões da Plataforma",
      value: `R$ ${metrics.platform_commissions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: Percent,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
  ];

  const stats = [
    { label: "Vinícolas", value: metrics.total_wineries, icon: Building2, color: "text-accent" },
    { label: "Leads Totais", value: metrics.total_leads, icon: Users, color: "text-primary" },
    { label: "Vinhos Cadastrados", value: metrics.total_wines, icon: Wine, color: "text-primary" },
    { label: "Vouchers Gerados", value: metrics.total_vouchers, icon: Receipt, color: "text-green-500" },
    { label: "Receita Vouchers", value: `R$ ${metrics.total_voucher_value.toFixed(2)}`, icon: DollarSign, color: "text-accent" },
    { label: "Vouchers Resgatados", value: `R$ ${metrics.redeemed_voucher_value.toFixed(2)}`, icon: TrendingUp, color: "text-green-500" },
    { label: "Admins", value: metrics.total_admins, icon: Users, color: "text-muted-foreground" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Dashboard Master</h1>
        <p className="text-sm text-muted-foreground">Visão global da plataforma SmartSommelier</p>
      </div>

      {/* Hero Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {heroKpis.map((kpi) => (
          <div key={kpi.label} className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-12 h-12 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
              </div>
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </div>
            <p className="font-display text-3xl font-bold text-foreground">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Persona Intelligence Card */}
      {personaStats && personaTotal > 0 && (
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-accent/20 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-accent" />
            <h3 className="font-display text-sm font-semibold text-foreground">Perfil do Público Hoje</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(personaStats).filter(([, v]) => v > 0).map(([key, count]) => {
              const info = personaLabels[key];
              const pct = Math.round((count / personaTotal) * 100);
              return (
                <div key={key} className="flex items-center gap-2 bg-card/50 rounded-lg p-2.5">
                  <span className="text-lg">{info.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground truncate">{info.label}</p>
                    <p className="font-display text-sm font-bold text-foreground">{pct}%</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Baseado em {personaTotal} degustações de hoje</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-[10px] text-muted-foreground">{stat.label}</span>
            </div>
            <p className="font-display text-lg font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {leadsChart.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Leads / Dia (últimos 30 dias)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={leadsChart}>
                <defs>
                  <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--accent))" fill="url(#leadGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
