import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Winery } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { invokeAuth } from "@/lib/auth-api";
import { Shield, Download, Filter } from "lucide-react";

const ENTITY_LABEL: Record<string, string> = {
  stock: "Estoque",
  event: "Evento",
  winery_config: "Configurações",
  wine: "Vinho",
  voucher: "Voucher",
  lead: "Lead",
  reservation: "Reserva",
  loyalty_reward: "Recompensa",
};

export default function AdminAuditPage() {
  const { winery } = useOutletContext<{ winery: Winery; admin: AdminUser }>();
  const [entity, setEntity] = useState("");
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ["audit", winery.id, entity, from, to],
    queryFn: async () => {
      const { data } = await invokeAuth("admin-audit", {
        winery_id: winery.id, entity: entity || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to + "T23:59:59").toISOString() : undefined,
      });
      return data?.logs ?? [];
    },
  });

  const exportCsv = () => {
    const rows = [["data", "admin", "entidade", "id", "ação"]];
    for (const l of data ?? []) {
      rows.push([new Date(l.created_at).toLocaleString("pt-BR"), l.admin_name ?? "—", l.entity, l.entity_id ?? "", l.action]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `auditoria_${from}_${to}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" /> Logs de Auditoria
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Histórico de alterações sensíveis no sistema.</p>
        </div>
        <button onClick={exportCsv} className="text-sm px-3 py-2 rounded-lg border border-border inline-flex items-center gap-1"><Download className="w-4 h-4" />CSV</button>
      </div>

      <div className="rounded-xl bg-card border border-border p-3 flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-muted-foreground">De</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="block rounded-lg border border-border p-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Até</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="block rounded-lg border border-border p-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Entidade</label>
          <select value={entity} onChange={(e) => setEntity(e.target.value)} className="block rounded-lg border border-border p-2 text-sm">
            <option value="">Todas</option>
            {Object.entries(ENTITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase">
              <tr>
                <th className="p-2 text-left">Data</th>
                <th className="p-2 text-left">Admin</th>
                <th className="p-2 text-left">Entidade</th>
                <th className="p-2 text-left">Ação</th>
                <th className="p-2 text-left">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Carregando…</td></tr>}
              {!isLoading && (data ?? []).length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum log no período.</td></tr>}
              {(data ?? []).map((l: any) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="p-2 whitespace-nowrap">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                  <td className="p-2">{l.admin_name ?? "—"}</td>
                  <td className="p-2"><span className="text-xs px-2 py-0.5 rounded-full bg-muted">{ENTITY_LABEL[l.entity] ?? l.entity}</span></td>
                  <td className="p-2 font-medium">{l.action}</td>
                  <td className="p-2 text-xs text-muted-foreground max-w-md truncate">{l.entity_id}{l.after ? ` · ${JSON.stringify(l.after).slice(0, 80)}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
