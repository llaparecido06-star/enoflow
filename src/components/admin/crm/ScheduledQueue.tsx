import { useEffect, useMemo, useState } from "react";
import { invokeAuth } from "@/lib/auth-api";
import { Send, X, Clock, AlertTriangle, CheckCircle2, RotateCcw, MoreVertical } from "lucide-react";
import { toast } from "sonner";

interface Scheduled {
  id: string;
  lead_id: string;
  body_resolved: string;
  scheduled_for: string;
  status: string;
  error_reason: string | null;
  sent_at: string | null;
  users_leads: { name: string; whatsapp: string } | null;
}

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
  const [tab, setTab] = useState<Tab>("ready");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    // For sent/error we fetch all and filter client-side (status string + recency)
    const filter = tab === "ready" ? "ready" : tab === "pending" ? "pending" : "all";
    const { data } = await invokeAuth("admin-crm", { action: "list_scheduled", filter, winery_id: wineryId });
    setList(data?.scheduled ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [wineryId, tab]);

  const items = useMemo(() => {
    if (tab === "sent") {
      const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
      return list.filter((m) => m.status === "enviada" && (m.sent_at ? new Date(m.sent_at).getTime() >= cutoff : true));
    }
    if (tab === "error") return list.filter((m) => m.status === "erro");
    return list;
  }, [list, tab]);

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
    if (!wa) {
      toast.error("Lead sem WhatsApp");
      return;
    }
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(m.body_resolved)}`, "_blank");
    await invokeAuth("admin-crm", { action: "mark_scheduled_sent", message_id: m.id, winery_id: wineryId });
    toast.success("Marcada como enviada");
    load();
  };

  const cancel = async (id: string) => {
    await invokeAuth("admin-crm", { action: "cancel_scheduled", message_id: id, winery_id: wineryId });
    toast.success("Cancelada");
    load();
  };

  const markError = async (id: string) => {
    const reason = window.prompt("Motivo do erro (opcional):") || "";
    await invokeAuth("admin-crm", { action: "mark_scheduled_error", message_id: id, reason, winery_id: wineryId });
    toast.success("Marcada como erro");
    setMenuOpen(null);
    load();
  };

  const retry = async (id: string) => {
    await invokeAuth("admin-crm", { action: "retry_scheduled", message_id: id, winery_id: wineryId });
    toast.success("Voltou para pendentes");
    load();
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
      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-6">Carregando…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            {tab === "ready" ? "Nada para enviar agora." : tab === "pending" ? "Nenhuma pendente." : tab === "sent" ? "Nenhuma enviada nos últimos 7 dias." : "Nenhum erro."}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {items.map((m) => (
              <div key={m.id} className="p-3 hover:bg-secondary/30 relative">
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
