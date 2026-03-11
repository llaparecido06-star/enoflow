import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import type { MasterAdmin } from "@/hooks/useMasterAuth";
import { invokeAuth } from "@/lib/auth-api";
import { Building2, Users, Wine, Receipt, TrendingUp, DollarSign, BarChart3, Loader2, Sparkles, CreditCard, Percent, UserCircle, Filter } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

interface ConsumerProfile {
  gender: Record<string, number>;
  income: Record<string, number>;
  age: Record<string, number>;
  preferences: Record<string, number>;
  total: number;
}

const personaLabels: Record<string, { label: string; emoji: string; color: string }> = {
  sweet_tooth: { label: "Amantes de Doçura", emoji: "🍬", color: "text-pink-400" },
  bold_intense: { label: "Encorpados", emoji: "🦁", color: "text-red-400" },
  fresh_crisp: { label: "Frescos & Leves", emoji: "🍋", color: "text-green-400" },
  balanced_explorer: { label: "Equilibrados", emoji: "⚖️", color: "text-blue-400" },
};

const genderLabels: Record<string, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
  nao_informar: "Não informado",
  "N/I": "Não informado",
};

const incomeLabels: Record<string, string> = {
  ate_3k: "Até R$3k",
  "3k_8k": "R$3k–8k",
  "8k_15k": "R$8k–15k",
  acima_15k: "Acima R$15k",
  A: "Classe A",
  B: "Classe B",
  C: "Classe C",
  D: "Classe D",
  E: "Classe E",
  "N/I": "Não informado",
};

const PIE_COLORS = ["hsl(var(--accent))", "hsl(var(--primary))", "#10b981", "#f59e0b", "#8b5cf6", "#6b7280"];

export default function MasterDashboardPage() {
  const { admin } = useOutletContext<{ admin: MasterAdmin }>();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [leadsChart, setLeadsChart] = useState<{ date: string; count: number }[]>([]);
  const [personaStats, setPersonaStats] = useState<PersonaStats | null>(null);
  const [personaTotal, setPersonaTotal] = useState(0);
  const [consumerProfile, setConsumerProfile] = useState<ConsumerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [wineries, setWineries] = useState<{ id: string; name: string }[]>([]);
  const [profileWineryFilter, setProfileWineryFilter] = useState<string>("all");
  const [profileLoading, setProfileLoading] = useState(false);

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
        setConsumerProfile(res.data.consumer_profile ?? null);
        setWineries((res.data.wineries ?? []).map((w: any) => ({ id: w.id, name: w.name })));
      } catch {
        console.error("Erro ao carregar dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [admin.id]);

  const fetchConsumerProfile = useCallback(async (wineryId: string) => {
    setProfileLoading(true);
    try {
      const res = await invokeAuth("master-dashboard", {
        consumer_profile_winery_id: wineryId === "all" ? null : wineryId,
      });
      if (res.data?.consumer_profile) {
        setConsumerProfile(res.data.consumer_profile);
      }
    } catch {
      console.error("Erro ao filtrar perfil");
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const handleProfileFilterChange = (value: string) => {
    setProfileWineryFilter(value);
    fetchConsumerProfile(value);
  };

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

  // Build chart data for consumer profile
  const genderData = consumerProfile ? Object.entries(consumerProfile.gender)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: genderLabels[key] || key, value })) : [];

  const incomeData = consumerProfile ? Object.entries(consumerProfile.income)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: incomeLabels[key] || key, value })) : [];

  const ageData = consumerProfile ? Object.entries(consumerProfile.age)
    .filter(([key]) => key !== "N/I" || consumerProfile.age[key] > 0)
    .map(([key, value]) => ({ name: key, value })) : [];

  const prefData = consumerProfile ? Object.entries(consumerProfile.preferences)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: personaLabels[key]?.label || key,
      emoji: personaLabels[key]?.emoji || "🍷",
      value,
      pct: consumerProfile.total > 0 ? Math.round((value / consumerProfile.total) * 100) : 0,
    })) : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Dashboard Master</h1>
        <p className="text-sm text-muted-foreground">Visão global da plataforma EnoFlow</p>
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

      {/* Consumer Profile Section */}
      {consumerProfile && consumerProfile.total > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <UserCircle className="w-5 h-5 text-accent" />
            <h2 className="font-display text-lg font-bold text-foreground">Perfil do Consumidor</h2>
            <div className="flex items-center gap-2 ml-auto">
              {profileLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <Select value={profileWineryFilter} onValueChange={handleProfileFilterChange}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <Filter className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="Todas vinícolas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas vinícolas</SelectItem>
                  {wineries.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">{consumerProfile.total} leads</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Gender */}
            {genderData.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="text-xs font-semibold text-foreground mb-3">Sexo</h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={30} paddingAngle={2}>
                        {genderData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {genderData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      {d.name} ({Math.round((d.value / consumerProfile.total) * 100)}%)
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Age */}
            {ageData.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="text-xs font-semibold text-foreground mb-3">Faixa Etária</h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageData} barSize={24}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="value" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Income */}
            {incomeData.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="text-xs font-semibold text-foreground mb-3">Renda</h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={incomeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={30} paddingAngle={2}>
                        {incomeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {incomeData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      {d.name} ({Math.round((d.value / consumerProfile.total) * 100)}%)
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preferences (Quiz) */}
            {prefData.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="text-xs font-semibold text-foreground mb-3">Preferência (Quiz)</h3>
                <div className="space-y-2">
                  {prefData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="text-base">{d.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-[11px] text-foreground truncate">{d.name}</p>
                          <span className="text-[10px] font-bold text-foreground ml-2">{d.pct}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${d.pct}%` }} />
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
