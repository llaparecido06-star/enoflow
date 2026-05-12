import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Winery } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { invokeAuth } from "@/lib/auth-api";
import { formatCurrency } from "@/lib/currency";
import { DollarSign, Users, Wine, Loader2, BarChart3, TrendingUp, Receipt, Target, ThumbsUp, QrCode, FileDown } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RoiCapturePointsTab from "@/components/admin/RoiCapturePointsTab";
import { generateMonthlyReport } from "@/lib/admin/pdf";
import { toast } from "sonner";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(220, 70%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(30, 80%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 65%, 55%)",
  "hsl(45, 80%, 50%)",
];

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

  const cur = winery.currency || "BRL";

  const kpis = [
    {
      label: "Receita Total",
      value: formatCurrency(data?.revenue_total ?? 0, cur),
      sub: `${formatCurrency(data?.revenue_month ?? 0, cur)} no mês`,
      icon: DollarSign, color: "text-accent", bg: "bg-accent/10",
    },
    {
      label: "Vouchers Resgatados",
      value: data?.vouchers_redeemed ?? 0,
      sub: `${data?.vouchers_total ?? 0} emitidos no total`,
      icon: Receipt, color: "text-primary", bg: "bg-primary/10",
    },
    {
      label: "Taxa de Conversão",
      value: `${data?.conversion_rate ?? 0}%`,
      sub: `${data?.leads_total ?? 0} leads → ${data?.vouchers_redeemed ?? 0} vendas`,
      icon: Target, color: "text-accent", bg: "bg-accent/10",
    },
    {
      label: "Leads (Hoje / Mês)",
      value: data?.leads_today ?? 0,
      sub: `${data?.leads_month ?? 0} no mês · ${data?.leads_total ?? 0} total`,
      icon: Users, color: "text-primary", bg: "bg-primary/10",
    },
    {
      label: "Vinho Campeão",
      value: data?.top_wine_name ?? "—",
      sub: data?.top_wine_name ? `${data?.top_wine_count ?? 0} vendas` : "Sem dados",
      icon: Wine, color: "text-primary", bg: "bg-primary/10",
    },
    {
      label: "NPS Médio",
      value: data?.nps_avg !== null && data?.nps_avg !== undefined ? `${Number(data.nps_avg).toFixed(1)}` : "—",
      sub: `${data?.nps_count ?? 0} respostas · ${data?.nps_today_count ?? 0} hoje`,
      icon: ThumbsUp, color: "text-primary", bg: "bg-primary/10",
    },
  ];

  const chartData = data?.weekly_chart ?? [];
  const biAge: { name: string; value: number }[] = data?.bi_age ?? [];
  const biOrigin: { name: string; value: number }[] = (data?.bi_origin ?? []).map((d: any) => ({ ...d, name: d.name || "Não informado" }));
  const biPrefs: { name: string; value: number }[] = (data?.bi_preferences ?? []).map((d: any) => ({ ...d, name: d.name || "Não informado" }));
  const biCapture: { name: string; value: number }[] = (data?.bi_capture_points ?? []).map((d: any) => ({ ...d, name: d.name || "Acesso Direto" }));

  const handleExportPdf = async () => {
    try {
      const period = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      await generateMonthlyReport(winery as any, {
        period,
        revenue: Number(data?.revenue_month ?? 0),
        vouchers: Number(data?.vouchers_redeemed ?? 0),
        leads: Number(data?.leads_month ?? 0),
        npsScore: data?.nps_avg ? Number(Number(data.nps_avg).toFixed(1)) : 0,
        byChannel: (data?.bi_capture_points ?? []).map((d: any) => ({ channel: d.name || "Direto", revenue: Number(d.value || 0) })),
        topWines: data?.top_wine_name ? [{ name: data.top_wine_name, count: Number(data.top_wine_count ?? 0) }] : [],
      });
      toast.success("Relatório gerado!");
    } catch {
      toast.error("Erro ao gerar relatório");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard Executivo</h1>
          <p className="text-sm text-muted-foreground">Visão geral de {winery.name}</p>
        </div>
        <button
          onClick={handleExportPdf}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-xl text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <FileDown className="w-4 h-4" /> Relatório PDF
        </button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="w-4 h-4" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="roi" className="gap-1.5">
            <QrCode className="w-4 h-4" /> ROI por QR Code
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                    <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <p className="font-display text-2xl font-bold text-foreground truncate">{kpi.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* Weekly Chart */}
          {chartData.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-5 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h2 className="font-display text-base font-semibold text-foreground">Vendas & Leads — Últimos 7 dias</h2>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={4}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value) => (value === "leads" ? "Novos Leads" : "Vendas (R$)")} />
                    <Bar dataKey="leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="sales" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* BI Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <BiBarCard title="📍 Pontos de Captura (visitas)" data={biCapture} emptyMsg="Sem dados de visitas por QR" />
            <BiBarCard title="Origem por Local" data={biOrigin} emptyMsg="Sem dados de origem" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BiPieCard title="Faixa Etária" data={biAge} emptyMsg="Sem dados de idade" />
            <BiBarCard title="Preferências" data={biPrefs} emptyMsg="Sem dados de preferências" />
          </div>
        </TabsContent>

        <TabsContent value="roi">
          <RoiCapturePointsTab currency={cur} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BiPieCard({ title, data, emptyMsg }: { title: string; data: { name: string; value: number }[]; emptyMsg: string }) {
  if (!data.length) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 flex flex-col items-center justify-center min-h-[220px]">
        <p className="text-sm text-muted-foreground">{emptyMsg}</p>
      </div>
    );
  }
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="font-display text-sm font-semibold text-foreground mb-3">{title}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function BiBarCard({ title, data, emptyMsg }: { title: string; data: { name: string; value: number }[]; emptyMsg: string }) {
  if (!data.length) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 flex flex-col items-center justify-center min-h-[220px]">
        <p className="text-sm text-muted-foreground">{emptyMsg}</p>
      </div>
    );
  }
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="font-display text-sm font-semibold text-foreground mb-3">{title}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0 }}>
            <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
