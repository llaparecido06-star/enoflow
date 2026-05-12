import { useEffect, useMemo, useState } from "react";
import { invokeAuth } from "@/lib/auth-api";
import { Send, X, Clock, AlertTriangle, CheckCircle2, RotateCcw, MoreVertical, Search } from "lucide-react";
import { toast } from "sonner";

interface Scheduled {
  id: string;
  lead_id: string;
  body_resolved: string;
  scheduled_for: string;
  status: string;
  error_reason: string | null;
  sent_at: string | null;
  created_by: string;
  users_leads: { name: string; whatsapp: string } | null;
}

interface Staff { id: string; name: string }
interface Props { wineryId: string }

type Tab = "ready" | "pending" | "sent" | "error";

const TAB_LABEL: Record<Tab, string> = {
  ready: "Para enviar agora",
  pending: "Pendentes",
  sent: "Enviadas (7d)",
  error: "Erros",
};

export default function ScheduledQueue({ wineryId }: Props) {
  const [list, setList] = useState<Scheduled[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [tab, setTab] = useState<Tab>("ready");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [assignee, setAssignee] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = async () => {
    setLoading(true);
    const filter = tab === "ready" ? "ready" : tab === "pending" ? "pending" : "all";
    const [{ data }, { data: s }] = await Promise.all([
      invokeAuth("admin-crm", { action: "list_scheduled", filter, winery_id: wineryId }),
      staff.length ? Promise.resolve({ data: { staff } }) : invokeAuth("admin-crm", { action: "list_staff", winery_id: wineryId }),
    ]);
    setList(data?.scheduled ?? []);
    if (!staff.length) setStaff(s?.staff ?? []);
    setSelected(new Set());
    setLoading(false);
  };

  useEffect(() => { load(); }, [wineryId, tab]);

  // Reset selection when tab changes
  useEffect(() => { setSelected(new Set()); }, [tab]);

  const items = useMemo(() => {
    let r = list;
    if (tab === "sent") {
      const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
      r = r.filter((m) => m.status === "enviada" && (m.sent_at ? new Date(m.sent_at).getTime() >= cutoff : true));
    } else if (tab === "error") {
      r = r.filter((m) => m.status === "erro");
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((m) =>
        (m.users_leads?.name || "").toLowerCase().includes(q) ||
        (m.users_leads?.whatsapp || "").includes(q) ||
        (m.body_resolved || "").toLowerCase().includes(q)
      );
    }
    if (assignee !== "all") r = r.filter((m) => m.created_by === assignee);
    if (from) r = r.filter((m) => m.scheduled_for >= new Date(from).toISOString());
    if (to) r = r.filter((m) => m.scheduled_for <= new Date(to + "T23:59:59").toISOString());
    return r;
  }, [list, tab, search, assignee, from, to]);

  const counts = useMemo(() => {
    const c = { ready: 0, pending: 0, sent: 0, error: 0 };
    const now = Date.now();
    const cutoff = now - 7 * 24 * 3600 * 1000;
    for (const m of list) {
      if (m.status === "pendente") {
        c.pending++;
        if (new Date(m.scheduled_for).getTime() <= now) c.ready++;
      } else if (m.status === "enviada") {
        if (!m.sent_at || new Date(m.sent_at).getTime() >= cutoff) c.sent++;
      } else if (m.status === "erro") c.error++;
    }
    return c;
  }, [list]);

  const send = async (m: Scheduled) => {
    const wa = m.users_leads?.whatsapp?.replace(/\D/g, "");
    if (!wa) { toast.error("Lead sem WhatsApp"); return; }
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(m.body_resolved)}`, "_blank");
    await invokeAuth("admin-crm", { action: "mark_scheduled_sent", message_id: m.id, winery_id: wineryId });
    toast.success("Marcada como enviada");
    load();
  };
  const cancel = async (id: string) => {
    await invokeAuth("admin-crm", { action: "cancel_scheduled", message_id: id, winery_id: wineryId });
    toast.success("Cancelada"); load();
  };
  const markError = async (id: string) => {
    const reason = window.prompt("Motivo do erro (opcional):") || "";
    await invokeAuth("admin-crm", { action: "mark_scheduled_error", message_id: id, reason, winery_id: wineryId });
    setMenuOpen(null); load();
  };
  const retry = async (id: string) => {
    await invokeAuth("admin-crm", { action: "retry_scheduled", message_id: id, winery_id: wineryId });
    toast.success("Voltou para pendentes"); load();
  };

  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const bulkCancel = async () => {
    if (!confirm(`Cancelar ${selected.size} mensagem(ns)?`)) return;
    await invokeAuth("admin-crm", { action: "bulk_cancel_scheduled", message_ids: [...selected], winery_id: wineryId });
    toast.success("Canceladas"); load();
  };
  const bulkError = async () => {
    const reason = window.prompt("Motivo do erro (aplicado a todas):") || "";
    await invokeAuth("admin-crm", { action: "bulk_mark_error", message_ids: [...selected], reason, winery_id: wineryId });
    toast.success("Marcadas como erro"); load();
  };
  const bulkSend = async () => {
    const ids = [...selected];
    const items = list.filter((m) => ids.includes(m.id));
    if (!confirm(`Abrir WhatsApp para ${items.length} lead(s) em sequência?`)) return;
    for (const m of items) {
      const wa = m.users_leads?.whatsapp?.replace(/\D/g, "");
      if (wa) window.open(`https://wa.me/${wa}?text=${encodeURIComponent(m.body_resolved)}`, "_blank");
      await new Promise((r) => setTimeout(r, 700));
    }
    await invokeAuth("admin-crm", { action: "bulk_mark_sent", message_ids: ids, winery_id: wineryId });
    toast.success(`${items.length} enviada(s)`); load();
  };

  const badge = (status: string) => {
    if (status === "enviada") return <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">Enviada</span>;
    if (status === "erro") return <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full font-medium">Erro</span>;
    if (status === "cancelada") return <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">Cancelada</span>;
    return <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Pendente</span>;
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-border bg-secondary/30">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Mensagens agendadas
        </h3>
      </div>

      <div className="flex border-b border-border overflow-x-auto">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 min-w-[110px] text-xs px-2 py-2 border-b-2 transition-colors ${
              tab === t ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {TAB_LABEL[t]}
            {counts[t] > 0 && (
              <span className={`ml-1 text-[9px] px-1.5 py-0.5 rounded-full ${
                t === "error" ? "bg-rose-500 text-white" : t === "ready" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
              }`}>{counts[t]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="p-2.5 border-b border-border bg-secondary/10 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome, telefone, texto…"
            className="w-full pl-8 pr-2 py-1.5 border border-border rounded-lg text-xs bg-background" />
        </div>
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background">
          <option value="all">Todos atendentes</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background" />
        {(search || assignee !== "all" || from || to) && (
          <button onClick={() => { setSearch(""); setAssignee("all"); setFrom(""); setTo(""); }} className="text-[10px] text-muted-foreground underline">Limpar</button>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-primary" />
          <span className="text-[11px] text-muted-foreground">
            {selected.size > 0 ? `${selected.size} selecionada(s)` : `Selecionar todas (${items.length})`}
          </span>
        </div>
      )}

      <div className="max-h-[420px] overflow-y-auto">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-6">Carregando…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            {tab === "ready" ? "Nada para enviar agora." : tab === "pending" ? "Nenhuma pendente." : tab === "sent" ? "Nenhuma enviada nos últimos 7 dias." : "Nenhum erro."}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {items.map((m) => (
              <div key={m.id} className="p-3 hover:bg-secondary/30 relative flex gap-2">
                <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleOne(m.id)} className="mt-1 accent-primary" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium truncate">{m.users_leads?.name ?? "—"}</p>
                        {badge(m.status)}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {m.users_leads?.whatsapp} ·{" "}
                        {m.status === "enviada" && m.sent_at
                          ? `Enviada ${new Date(m.sent_at).toLocaleString("pt-BR")}`
                          : `Agend. ${new Date(m.scheduled_for).toLocaleString("pt-BR")}`}
                      </p>
                      {m.status === "erro" && m.error_reason && (
                        <p className="text-[10px] text-rose-600 mt-0.5 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {m.error_reason}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {m.status === "pendente" && (
                        <>
                          <button onClick={() => send(m)} className="bg-primary text-primary-foreground p-1.5 rounded-md" title="Enviar via WhatsApp">
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <div className="relative">
                            <button onClick={() => setMenuOpen(menuOpen === m.id ? null : m.id)} className="border border-border p-1.5 rounded-md text-muted-foreground hover:bg-secondary">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                            {menuOpen === m.id && (
                              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-md shadow-lg z-10 min-w-[170px]">
                                <button onClick={() => { setMenuOpen(null); send(m); }} className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-secondary text-left">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Marcar como enviada
                                </button>
                                <button onClick={() => markError(m.id)} className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-secondary text-left">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Marcar como erro
                                </button>
                                <button onClick={() => { setMenuOpen(null); cancel(m.id); }} className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-secondary text-left text-destructive">
                                  <X className="w-3.5 h-3.5" /> Cancelar
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      {m.status === "erro" && (
                        <>
                          <button onClick={() => retry(m.id)} className="border border-border p-1.5 rounded-md text-amber-600" title="Re-tentar">
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => send(m)} className="bg-primary text-primary-foreground p-1.5 rounded-md" title="Enviar agora">
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{m.body_resolved}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <div className="sticky bottom-0 bg-card border-t border-border p-2.5 flex flex-wrap items-center gap-2 shadow-lg">
          <span className="text-xs font-medium">{selected.size} selecionada(s)</span>
          <button onClick={bulkSend} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md flex items-center gap-1">
            <Send className="w-3 h-3" /> Enviar todas
          </button>
          <button onClick={bulkCancel} className="text-xs border border-border px-3 py-1.5 rounded-md flex items-center gap-1">
            <X className="w-3 h-3" /> Cancelar
          </button>
          <button onClick={bulkError} className="text-xs border border-border px-3 py-1.5 rounded-md text-rose-600 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Marcar erro
          </button>
        </div>
      )}
    </div>
  );
}
