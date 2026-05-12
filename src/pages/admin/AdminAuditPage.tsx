import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Winery } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { invokeAuth } from "@/lib/auth-api";
import { Shield, Download, Activity, Users as UsersIcon, FileText, Search } from "lucide-react";

const ENTITY_LABEL: Record<string, string> = {
  stock: "Estoque",
  event: "Evento",
  winery_config: "Configurações",
  wine: "Vinho",
  voucher: "Voucher",
  lead: "Lead",
  reservation: "Reserva",
  loyalty_reward: "Recompensa",
  wine_review: "Avaliação",
};

const ACTION_TINT = (action: string): string => {
  const a = action.toLowerCase();
  if (a.includes("delete") || a.includes("hide") || a.includes("remove")) return "bg-rose-50 text-rose-700 ring-rose-200";
  if (a.includes("create") || a.includes("add") || a.includes("unhide") || a.includes("issue")) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (a.includes("update") || a.includes("edit") || a.includes("respond")) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-muted text-muted-foreground ring-border";
};

export default function AdminAuditPage() {
  const { winery } = useOutletContext<{ winery: Winery; admin: AdminUser }>();
  const [entity, setEntity] = useState("");
  const [search, setSearch] = useState("");
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

  const logs = data ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter((l: any) =>
      (l.admin_name ?? "").toLowerCase().includes(q) ||
      (l.action ?? "").toLowerCase().includes(q) ||
      (l.entity_id ?? "").toLowerCase().includes(q)
    );
  }, [logs, search]);

  const stats = useMemo(() => {
    const adminSet = new Set<string>();
    const entitySet = new Set<string>();
    for (const l of logs) {
      if (l.admin_id) adminSet.add(l.admin_id);
      if (l.entity) entitySet.add(l.entity);
    }
    return { total: logs.length, admins: adminSet.size, entities: entitySet.size };
  }, [logs]);

  const exportCsv = () => {
    const rows = [["data", "admin", "entidade", "id", "ação"]];
    for (const l of filtered) {
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
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="admin-page-title flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-card">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            Logs de Auditoria
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 ml-12">Histórico de alterações sensíveis no sistema.</p>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted/60 shadow-card transition-all text-sm font-medium"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="admin-kpi p-4">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3 ring-1 ring-border/40">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Eventos</p>
          <p className="font-display text-2xl font-bold tracking-tight mt-0.5">{stats.total}</p>
        </div>
        <div className="admin-kpi p-4">
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center mb-3 ring-1 ring-border/40">
            <UsersIcon className="w-4 h-4 text-accent" />
          </div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Admins ativos</p>
          <p className="font-display text-2xl font-bold tracking-tight mt-0.5">{stats.admins}</p>
        </div>
        <div className="admin-kpi p-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center mb-3 ring-1 ring-border/40">
            <FileText className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Entidades</p>
          <p className="font-display text-2xl font-bold tracking-tight mt-0.5">{stats.entities}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-card p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">De</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background p-2 text-sm" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Até</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background p-2 text-sm" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Entidade</label>
          <select value={entity} onChange={(e) => setEntity(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background p-2 text-sm">
            <option value="">Todas</option>
            {Object.entries(ENTITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Buscar</label>
          <div className="relative mt-1">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Admin, ação, ID…"
              className="w-full rounded-lg border border-border bg-background pl-8 pr-2 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="admin-card overflow-hidden">
        <div className="p-3 border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground flex items-center justify-between">
          <span>Eventos</span>
          <span>{filtered.length} resultado(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/20 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left font-semibold">Data</th>
                <th className="p-3 text-left font-semibold">Admin</th>
                <th className="p-3 text-left font-semibold">Entidade</th>
                <th className="p-3 text-left font-semibold">Ação</th>
                <th className="p-3 text-left font-semibold">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Carregando…</td></tr>}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={5} className="p-12 text-center">
                  <div className="inline-flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Nenhum log no período selecionado.</p>
                  </div>
                </td></tr>
              )}
              {filtered.map((l: any) => (
                <tr key={l.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                  <td className="p-3 font-medium">{l.admin_name ?? "—"}</td>
                  <td className="p-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted ring-1 ring-border">
                      {ENTITY_LABEL[l.entity] ?? l.entity}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ring-1 ${ACTION_TINT(l.action)}`}>
                      {l.action}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground max-w-md truncate">{l.entity_id}{l.after ? ` · ${JSON.stringify(l.after).slice(0, 80)}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
