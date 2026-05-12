import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Winery } from "@/hooks/useWinery";
import { invokeAuth } from "@/lib/auth-api";
import { formatCurrency } from "@/lib/currency";
import { DollarSign, TrendingUp, Receipt, Percent, Download } from "lucide-react";
import { toast } from "sonner";

const CHANNELS = [
  { id: "tasting", label: "Degustação" },
  { id: "restaurant", label: "Restaurante" },
  { id: "shop", label: "Loja" },
  { id: "mixed", label: "Misto" },
];

export default function AdminFinancePage() {
  const { winery } = useOutletContext<{ winery: Winery }>();
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [channelFilter, setChannelFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: summary } = useQuery({
    queryKey: ["finance-summary", winery.id, from, to],
    queryFn: async () => {
      const { data } = await invokeAuth("admin-finance", { action: "summary", winery_id: winery.id, from, to });
      return data;
    },
  });

  const { data: txData } = useQuery({
    queryKey: ["finance-tx", winery.id, from, to, channelFilter, statusFilter],
    queryFn: async () => {
      const { data } = await invokeAuth("admin-finance", {
        action: "transactions", winery_id: winery.id, from, to,
        channel: channelFilter || undefined, status: statusFilter || undefined,
      });
      return data;
    },
  });

  const transactions = txData?.transactions ?? [];
  const currency = winery.currency || "BRL";

  const exportCsv = () => {
    if (!transactions.length) { toast.error("Sem transações"); return; }
    const headers = ["Data", "Voucher", "Lead", "Canal", "Total", "Comissão", "Status", "NPS"];
    const rows = transactions.map((t: any) => [
      new Date(t.created_at).toLocaleDateString("pt-BR"),
      t.code, t.lead_name, t.channel,
      t.total.toFixed(2), t.commission.toFixed(2),
      t.redeemed ? "resgatado" : "pendente", t.nps_score ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `financeiro_${winery.slug}_${from}_${to}.csv`; a.click();
    toast.success("CSV exportado");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="admin-page-title flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-primary" /> Financeiro
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{from} → {to}</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <button onClick={exportCsv} className="flex items-center gap-1.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-3.5 py-2 rounded-lg text-sm font-medium shadow-card hover:shadow-elevated active:scale-95 transition-all"><Download className="w-4 h-4" /> CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={TrendingUp} label="Receita" value={formatCurrency(summary?.summary?.revenue ?? 0, currency)} tone="emerald" />
        <Kpi icon={Receipt} label="Ticket médio" value={formatCurrency(summary?.summary?.ticket_avg ?? 0, currency)} tone="blue" />
        <Kpi icon={DollarSign} label="Vouchers resgatados" value={`${summary?.summary?.redeemed_count ?? 0}/${summary?.summary?.total_count ?? 0}`} tone="amber" />
        <Kpi icon={Percent} label="Comissão" value={formatCurrency(summary?.summary?.commission ?? 0, currency)} tone="rose" />
      </div>

      {summary?.by_channel && Object.keys(summary.by_channel).length > 0 && (
        <div className="admin-card p-5">
          <h3 className="text-sm font-semibold mb-3">Receita por canal</h3>
          <div className="space-y-2">
            {CHANNELS.map((c) => {
              const ch = summary.by_channel[c.id];
              if (!ch) return null;
              const max = Math.max(...Object.values(summary.by_channel as any).map((v: any) => v.revenue));
              const pct = max > 0 ? (ch.revenue / max) * 100 : 0;
              return (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="text-xs w-24 text-muted-foreground">{c.label}</span>
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs tabular-nums w-28 text-right">{formatCurrency(ch.revenue, currency)}</span>
                  <span className="text-[10px] text-muted-foreground w-12 text-right">{ch.count}x</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="admin-card p-3 flex flex-wrap gap-2 items-center">
        <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} className="border border-border rounded-lg px-2 py-1.5 text-sm bg-background">
          <option value="">Todos os canais</option>
          {CHANNELS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-border rounded-lg px-2 py-1.5 text-sm bg-background">
          <option value="">Todos os status</option>
          <option value="redeemed">Resgatados</option>
          <option value="pending">Pendentes</option>
        </select>
      </div>

      <div className="admin-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs text-muted-foreground uppercase">
            <tr>
              <th className="text-left p-2.5">Data</th><th className="text-left p-2.5">Voucher</th>
              <th className="text-left p-2.5">Lead</th><th className="text-left p-2.5">Canal</th>
              <th className="text-right p-2.5">Total</th><th className="text-right p-2.5">Comissão</th>
              <th className="text-center p-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma transação.</td></tr>
            ) : transactions.map((t: any) => (
              <tr key={t.id}>
                <td className="p-2.5 text-xs">{new Date(t.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="p-2.5 font-mono text-xs">{t.code}</td>
                <td className="p-2.5 text-xs">{t.lead_name}</td>
                <td className="p-2.5 text-xs">{CHANNELS.find((c) => c.id === t.channel)?.label || t.channel}</td>
                <td className="p-2.5 text-right tabular-nums">{formatCurrency(t.total, currency)}</td>
                <td className="p-2.5 text-right tabular-nums text-xs text-muted-foreground">{formatCurrency(t.commission, currency)}</td>
                <td className="p-2.5 text-center"><span className={`text-[10px] px-2 py-0.5 rounded-full ${t.redeemed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{t.redeemed ? "resgatado" : "pendente"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }: any) {
  const colors: Record<string, string> = {
    emerald: "from-emerald-50 to-emerald-100/40 text-emerald-700 ring-emerald-200/60",
    blue: "from-blue-50 to-blue-100/40 text-blue-700 ring-blue-200/60",
    amber: "from-amber-50 to-amber-100/40 text-amber-700 ring-amber-200/60",
    rose: "from-rose-50 to-rose-100/40 text-rose-700 ring-rose-200/60",
  };
  return (
    <div className={`rounded-xl ring-1 p-4 bg-gradient-to-br ${colors[tone]} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold opacity-80"><Icon className="w-3.5 h-3.5" /> {label}</div>
      <div className="text-xl font-bold mt-1.5 truncate">{value}</div>
    </div>
  );
}
