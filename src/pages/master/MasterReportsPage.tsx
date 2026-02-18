import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import type { MasterAdmin } from "@/hooks/useMasterAuth";
import { invokeAuth } from "@/lib/auth-api";
import { Users, Receipt, TrendingUp, BarChart3, Star, Loader2, Filter } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WineryOption {
  id: string;
  name: string;
  slug: string;
  primary_color: string;
}

interface PerWinery {
  id: string;
  name: string;
  slug: string;
  primary_color: string;
  leads: number;
  vouchers: number;
  voucher_value: number;
  automations: number;
  commissions: number;
  ratings: number;
}

export default function MasterReportsPage() {
  const { admin } = useOutletContext<{ admin: MasterAdmin }>();
  const [loading, setLoading] = useState(true);
  const [wineryFilter, setWineryFilter] = useState<string>("all");
  const [wineries, setWineries] = useState<WineryOption[]>([]);
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [leadsChart, setLeadsChart] = useState<{ date: string; count: number }[]>([]);
  const [vouchersChart, setVouchersChart] = useState<{ date: string; count: number }[]>([]);
  const [perWinery, setPerWinery] = useState<PerWinery[]>([]);

  const fetchReports = async (wineryId?: string) => {
    setLoading(true);
    try {
      const res = await invokeAuth("master-dashboard", {
          action: "reports",
          ...(wineryId && wineryId !== "all" ? { winery_id: wineryId } : {}),
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      setMetrics(res.data.metrics ?? {});
      setLeadsChart(res.data.leads_chart ?? []);
      setVouchersChart(res.data.vouchers_chart ?? []);
      setPerWinery(res.data.per_winery ?? []);
      setWineries(res.data.wineries ?? []);
    } catch {
      console.error("Erro ao carregar relatórios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(wineryFilter); }, [admin.id, wineryFilter]);

  const stats = [
    { label: "Leads / Visitantes", value: metrics.total_leads ?? 0, icon: Users, color: "text-accent" },
    { label: "Vouchers Gerados", value: metrics.total_vouchers ?? 0, icon: Receipt, color: "text-green-500" },
    { label: "Receita Vouchers", value: `R$ ${(metrics.total_voucher_value ?? 0).toFixed(2)}`, icon: TrendingUp, color: "text-primary" },
    { label: "Vouchers Resgatados", value: `R$ ${(metrics.redeemed_value ?? 0).toFixed(2)}`, icon: TrendingUp, color: "text-green-600" },
    { label: "Automações", value: metrics.total_automations ?? 0, icon: BarChart3, color: "text-accent" },
    { label: "Comissões", value: `R$ ${(metrics.total_commissions ?? 0).toFixed(2)}`, icon: TrendingUp, color: "text-primary" },
    { label: "Avaliações", value: metrics.total_ratings ?? 0, icon: Star, color: "text-yellow-500" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Métricas consolidadas da plataforma</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={wineryFilter} onValueChange={setWineryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas as vinícolas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as vinícolas</SelectItem>
              {wineries.map(w => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Grid */}
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

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {leadsChart.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Leads / Dia (30 dias)</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={leadsChart}>
                  <defs>
                    <linearGradient id="lgMaster" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(38, 70%, 50%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(38, 70%, 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" stroke="hsl(38, 70%, 50%)" fill="url(#lgMaster)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {vouchersChart.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Vouchers / Dia (30 dias)</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={vouchersChart}>
                  <defs>
                    <linearGradient id="vgMaster" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" stroke="hsl(142, 70%, 45%)" fill="url(#vgMaster)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Per Winery Breakdown */}
      {wineryFilter === "all" && perWinery.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-secondary/50">
            <h3 className="text-xs font-medium text-muted-foreground">Detalhamento por Vinícola</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-[11px] font-medium text-muted-foreground">Vinícola</th>
                  <th className="px-4 py-3 text-[11px] font-medium text-muted-foreground text-right">Leads</th>
                  <th className="px-4 py-3 text-[11px] font-medium text-muted-foreground text-right">Vouchers</th>
                  <th className="px-4 py-3 text-[11px] font-medium text-muted-foreground text-right">Receita</th>
                  <th className="px-4 py-3 text-[11px] font-medium text-muted-foreground text-right">Automações</th>
                  <th className="px-4 py-3 text-[11px] font-medium text-muted-foreground text-right">Comissões</th>
                  <th className="px-4 py-3 text-[11px] font-medium text-muted-foreground text-right">Avaliações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {perWinery.map(w => (
                  <tr key={w.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: w.primary_color }} />
                        <span className="font-medium text-foreground">{w.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">{w.leads}</td>
                    <td className="px-4 py-3 text-right text-foreground">{w.vouchers}</td>
                    <td className="px-4 py-3 text-right text-foreground">R$ {w.voucher_value.toFixed(0)}</td>
                    <td className="px-4 py-3 text-right text-foreground">{w.automations}</td>
                    <td className="px-4 py-3 text-right text-foreground">R$ {w.commissions.toFixed(0)}</td>
                    <td className="px-4 py-3 text-right text-foreground">{w.ratings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bar chart for per-winery comparison */}
      {wineryFilter === "all" && perWinery.length > 1 && (
        <div className="bg-card rounded-xl border border-border p-4 mt-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Leads por Vinícola</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perWinery}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="leads" fill="hsl(38, 70%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
