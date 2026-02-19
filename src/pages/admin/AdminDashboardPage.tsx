import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Winery } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { invokeAuth } from "@/lib/auth-api";
import { Users, Receipt, TrendingUp, Loader2, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function AdminDashboardPage() {
  const { winery } = useOutletContext<{ winery: Winery; admin: AdminUser }>();

  const { data, isLoading } = useQuery({
    queryKey: ["owner-dashboard", winery.id],
    queryFn: async () => {
      const res = await invokeAuth("admin-reports", { action: "owner_dashboard" });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const kpis = [
    {
      label: "Novos Leads (LGPD)",
      value: data?.leads_today ?? 0,
      sub: `${data?.leads_month ?? 0} no mês`,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Taxa de Conversão",
      value: `${(data?.conversion_rate ?? 0).toFixed(1)}%`,
      sub: "Degustação → Voucher",
      icon: Receipt,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Receita Influenciada",
      value: `R$ ${(data?.influenced_revenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      sub: "Vouchers validados",
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-500/10",
    },
  ];

  const chartData = data?.weekly_chart ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Dashboard Executivo</h1>
        <p className="text-sm text-muted-foreground">Painel de conversão financeira</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </div>
            <p className="font-display text-2xl font-bold text-foreground">{kpi.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="font-display text-base font-semibold text-foreground">Leads vs. Vouchers Validados — Últimos 7 dias</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value) => (value === "leads" ? "Novos Leads" : "Vouchers Validados")}
                />
                <Bar dataKey="leads" fill="hsl(350, 82%, 22%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="redeemed" fill="hsl(38, 70%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Dados insuficientes para exibir o gráfico.</p>
        </div>
      )}
    </div>
  );
}
