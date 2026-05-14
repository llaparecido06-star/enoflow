import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { invokeAuth } from "@/lib/auth-api";
import { Wine, Clock, Check, MapPin, Filter, Loader2 } from "lucide-react";

interface CapturePoint { id: string; name: string; category: string }
interface HistoryRow {
  id: string;
  title: string;
  body: string | null;
  payload: any;
  voucher_id: string | null;
  capture_point_id: string | null;
  status: string;
  created_at: string;
  seen_at: string | null;
  done_at: string | null;
  capture_point: CapturePoint | null;
  assigned_to: { id: string; name: string; role: string } | null;
  done_by_admin: { id: string; name: string; role: string } | null;
}

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export default function AdminSeparationHistoryPage() {
  const ctx = useOutletContext<any>();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [cps, setCps] = useState<CapturePoint[]>([]);
  const [from, setFrom] = useState<string>(todayISO(-7));
  const [to, setTo] = useState<string>(todayISO(0));
  const [cpId, setCpId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const fetchData = async () => {
    setLoading(true);
    const { data } = await invokeAuth("staff-notifications", {
      action: "history",
      from: from ? `${from}T00:00:00.000Z` : undefined,
      to: to ? `${to}T23:59:59.999Z` : undefined,
      capture_point_id: cpId || undefined,
      status: statusFilter || undefined,
    });
    if (data?.success) {
      setRows(data.history ?? []);
      setCps(data.capture_points ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const done = rows.filter((r) => r.status === "done").length;
    const pending = rows.filter((r) => r.status !== "done").length;
    const avgMin = (() => {
      const completed = rows.filter((r) => r.done_at && r.created_at);
      if (!completed.length) return null;
      const sum = completed.reduce((acc, r) => acc + (+new Date(r.done_at!) - +new Date(r.created_at)), 0);
      return Math.round(sum / completed.length / 60000);
    })();
    return { total, done, pending, avgMin };
  }, [rows]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <Wine className="w-6 h-6 text-amber-500" /> Histórico de separações
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Pendências geradas para a equipe da Loja a partir de vouchers.</p>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Filter className="w-4 h-4" /> Filtros
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="text-[11px] text-muted-foreground">De</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-background" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Até</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-background" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Ponto de captura</label>
            <select value={cpId} onChange={(e) => setCpId(e.target.value)}
              className="mt-1 w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-background">
              <option value="">Todos</option>
              {cps.map((c) => (
                <option key={c.id} value={c.id}>{c.name} · {c.category}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-background">
              <option value="">Todos</option>
              <option value="pending">Pendente</option>
              <option value="seen">Vista</option>
              <option value="done">Concluída</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={fetchData}
              className="w-full px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90">
              Aplicar
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Concluídas" value={stats.done} accent="text-emerald-600" />
        <StatCard label="Pendentes" value={stats.pending} accent="text-amber-600" />
        <StatCard label="Tempo médio (min)" value={stats.avgMin ?? "—"} />
      </div>

      {/* List */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Nenhuma separação no período.</div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((r) => {
              const ageMs = (r.done_at ? +new Date(r.done_at) : Date.now()) - +new Date(r.created_at);
              const ageMin = Math.max(0, Math.round(ageMs / 60000));
              const isDone = r.status === "done";
              return (
                <div key={r.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate">{r.title}</p>
                      <StatusBadge status={r.status} />
                    </div>
                    {r.body && <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.body}</p>}
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
                      {r.payload?.code && <span className="font-mono">{r.payload.code}</span>}
                      {r.capture_point && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.capture_point.name}</span>
                      )}
                      {r.assigned_to && <span>→ {r.assigned_to.name}</span>}
                      {r.done_by_admin && isDone && <span className="text-emerald-600">✓ {r.done_by_admin.name}</span>}
                    </div>
                  </div>
                  <div className="text-right md:min-w-[140px]">
                    <p className="text-[11px] text-muted-foreground flex items-center md:justify-end gap-1">
                      <Clock className="w-3 h-3" /> {new Date(r.created_at).toLocaleString("pt-BR")}
                    </p>
                    <p className={`text-xs mt-0.5 ${isDone ? "text-emerald-600" : "text-amber-600"} font-medium`}>
                      {isDone ? `Concluída em ${ageMin} min` : `Aguardando há ${ageMin} min`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: any; accent?: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pendente", cls: "bg-amber-100 text-amber-700" },
    seen: { label: "Vista", cls: "bg-blue-100 text-blue-700" },
    done: { label: "Concluída", cls: "bg-emerald-100 text-emerald-700" },
  };
  const m = map[status] ?? { label: status, cls: "bg-secondary text-foreground" };
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${m.cls}`}>{m.label}</span>;
}
