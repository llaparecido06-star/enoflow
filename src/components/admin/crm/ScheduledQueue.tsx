import { useEffect, useState } from "react";
import { invokeAuth } from "@/lib/auth-api";
import { Send, X, Clock } from "lucide-react";
import { toast } from "sonner";

interface Scheduled {
  id: string;
  lead_id: string;
  body_resolved: string;
  scheduled_for: string;
  status: string;
  users_leads: { name: string; whatsapp: string } | null;
}

interface Props {
  wineryId: string;
}

export default function ScheduledQueue({ wineryId }: Props) {
  const [list, setList] = useState<Scheduled[]>([]);
  const [tab, setTab] = useState<"ready" | "pending">("ready");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await invokeAuth("admin-crm", { action: "list_scheduled", filter: tab, winery_id: wineryId });
    setList(data?.scheduled ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [wineryId, tab]);

  const send = async (m: Scheduled) => {
    const wa = m.users_leads?.whatsapp?.replace(/\D/g, "");
    if (!wa) return;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(m.body_resolved)}`, "_blank");
    await invokeAuth("admin-crm", { action: "mark_scheduled_sent", message_id: m.id, winery_id: wineryId });
    toast.success("Marcada como enviada");
    load();
  };

  const cancel = async (id: string) => {
    await invokeAuth("admin-crm", { action: "cancel_scheduled", message_id: id, winery_id: wineryId });
    load();
  };

  const ready = tab === "ready" ? list : list.filter((m) => new Date(m.scheduled_for) <= new Date());
  const pending = tab === "pending" ? list : [];

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-border bg-secondary/30">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Mensagens agendadas</h3>
        <div className="flex bg-card border border-border rounded-md text-xs">
          <button onClick={() => setTab("ready")} className={`px-2 py-1 ${tab === "ready" ? "bg-primary text-primary-foreground rounded-md" : ""}`}>Para enviar agora</button>
          <button onClick={() => setTab("pending")} className={`px-2 py-1 ${tab === "pending" ? "bg-primary text-primary-foreground rounded-md" : ""}`}>Todas pendentes</button>
        </div>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {loading ? <p className="text-xs text-muted-foreground text-center py-6">Carregando…</p>
          : list.length === 0 ? <p className="text-xs text-muted-foreground text-center py-6">{tab === "ready" ? "Nada para enviar agora." : "Nenhuma agendada."}</p>
          : (
            <div className="divide-y divide-border">
              {list.map((m) => (
                <div key={m.id} className="p-3 hover:bg-secondary/30">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{m.users_leads?.name ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {m.users_leads?.whatsapp} · {new Date(m.scheduled_for).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => send(m)} className="bg-primary text-primary-foreground p-1.5 rounded-md" title="Enviar via WhatsApp">
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => cancel(m.id)} className="border border-border p-1.5 rounded-md text-muted-foreground hover:text-destructive" title="Cancelar">
                        <X className="w-3.5 h-3.5" />
                      </button>
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
