import { useEffect, useRef, useState } from "react";
import { Bell, AlertTriangle, Clock, UserPlus } from "lucide-react";
import { invokeAuth } from "@/lib/auth-api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Props {
  wineryId: string;
  basePath: string;
  adminId?: string;
}

interface NotifData {
  overdue_tasks: any[];
  today_tasks: any[];
  ready_messages: any[];
  unassigned_leads: any[];
  prefs?: any;
}

const FREQ_MS: Record<string, number> = {
  off: Infinity,
  "5min": 5 * 60_000,
  "15min": 15 * 60_000,
  "1h": 60 * 60_000,
  daily: 24 * 60 * 60_000,
};

function inQuietHours(prefs: any): boolean {
  if (!prefs) return false;
  const s = prefs.quiet_hours_start;
  const e = prefs.quiet_hours_end;
  if (s == null || e == null) return false;
  const h = new Date().getHours();
  return s <= e ? (h >= s && h < e) : (h >= s || h < e);
}

export default function NotificationBell({ wineryId, basePath, adminId }: Props) {
  const [data, setData] = useState<NotifData>({ overdue_tasks: [], today_tasks: [], ready_messages: [], unassigned_leads: [] });
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const lastToastRef = useRef<number>(0);
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!wineryId) return;
    const load = async () => {
      const { data: r } = await invokeAuth("admin-crm", { action: "notifications", winery_id: wineryId });
      if (!r?.success) return;
      setData(r);

      const prefs = r.prefs;
      const freq = FREQ_MS[prefs?.digest_frequency ?? "15min"] ?? FREQ_MS["15min"];
      if (freq === Infinity) return;
      if (inQuietHours(prefs)) return;
      const now = Date.now();
      if (now - lastToastRef.current < freq) return;

      const newOverdue = (r.overdue_tasks ?? []).filter((t: any) => !seenIdsRef.current.has("t:" + t.id));
      const newReady = (r.ready_messages ?? []).filter((m: any) => !seenIdsRef.current.has("m:" + m.id));
      const newLeads = (r.unassigned_leads ?? []).filter((l: any) => !seenIdsRef.current.has("l:" + l.lead_id));

      if (newOverdue.length && prefs?.notify_overdue !== false) {
        toast.error(`${newOverdue.length} tarefa(s) atrasada(s)`, { description: "Clique no sino para ver." });
        newOverdue.forEach((t: any) => seenIdsRef.current.add("t:" + t.id));
        lastToastRef.current = now;
      }
      if (newReady.length && prefs?.notify_scheduled_ready !== false) {
        toast(`${newReady.length} mensagem(ns) prontas para enviar`);
        newReady.forEach((m: any) => seenIdsRef.current.add("m:" + m.id));
        lastToastRef.current = now;
      }
      if (newLeads.length && prefs?.notify_new_lead !== false) {
        toast(`${newLeads.length} novo(s) lead(s) sem dono`);
        newLeads.forEach((l: any) => seenIdsRef.current.add("l:" + l.lead_id));
        lastToastRef.current = now;
      }
    };
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [wineryId]);

  const total = data.overdue_tasks.length + data.ready_messages.length + data.unassigned_leads.length;
  const quiet = inQuietHours(data.prefs);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
        aria-label="Notificações"
      >
        <Bell className={`w-5 h-5 ${quiet ? "text-muted-foreground/50" : "text-foreground/70"}`} />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden max-h-[70vh] overflow-y-auto">
            <div className="p-3 border-b border-border bg-secondary/30 flex items-center justify-between">
              <span className="text-sm font-semibold">Notificações</span>
              <span className="text-[10px] text-muted-foreground">{total} pendente{total !== 1 ? "s" : ""}</span>
            </div>
            {total === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Tudo em dia ✓</p>
            ) : (
              <div className="divide-y divide-border">
                {data.overdue_tasks.length > 0 && (
                  <Section
                    icon={AlertTriangle}
                    color="text-rose-600"
                    title={`${data.overdue_tasks.length} tarefa${data.overdue_tasks.length > 1 ? "s" : ""} atrasada${data.overdue_tasks.length > 1 ? "s" : ""}`}
                    items={data.overdue_tasks.slice(0, 5).map((t: any) => ({
                      title: t.title,
                      meta: new Date(t.due_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
                    }))}
                    onClick={() => { setOpen(false); navigate(`${basePath}/leads`); }}
                  />
                )}
                {data.ready_messages.length > 0 && (
                  <Section
                    icon={Clock}
                    color="text-amber-600"
                    title={`${data.ready_messages.length} mensagem${data.ready_messages.length > 1 ? "ns" : ""} pronta${data.ready_messages.length > 1 ? "s" : ""} para enviar`}
                    items={[]}
                    onClick={() => { setOpen(false); navigate(`${basePath}/leads`); }}
                  />
                )}
                {data.unassigned_leads.length > 0 && (
                  <Section
                    icon={UserPlus}
                    color="text-blue-600"
                    title={`${data.unassigned_leads.length} lead${data.unassigned_leads.length > 1 ? "s" : ""} sem dono`}
                    items={[]}
                    onClick={() => { setOpen(false); navigate(`${basePath}/leads`); }}
                  />
                )}
              </div>
            )}
            {quiet && (
              <p className="text-[10px] text-muted-foreground text-center py-2 border-t border-border bg-secondary/20">
                Modo silencioso ativo
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Section({ icon: Icon, color, title, items, onClick }: any) {
  return (
    <button onClick={onClick} className="w-full p-3 text-left hover:bg-secondary/40">
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 mt-0.5 ${color}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">{title}</p>
          {items.slice(0, 3).map((it: any, i: number) => (
            <p key={i} className="text-[10px] text-muted-foreground truncate">
              {it.title} <span className="text-muted-foreground/70">· {it.meta}</span>
            </p>
          ))}
        </div>
      </div>
    </button>
  );
}
