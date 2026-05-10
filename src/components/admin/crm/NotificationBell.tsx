import { useEffect, useState } from "react";
import { Bell, AlertTriangle, Clock, UserPlus } from "lucide-react";
import { invokeAuth } from "@/lib/auth-api";
import { useNavigate } from "react-router-dom";

interface Props {
  wineryId: string;
  basePath: string;
}

interface NotifData {
  overdue_tasks: any[];
  today_tasks: any[];
  ready_messages: any[];
  unassigned_leads: any[];
}

export default function NotificationBell({ wineryId, basePath }: Props) {
  const [data, setData] = useState<NotifData>({ overdue_tasks: [], today_tasks: [], ready_messages: [], unassigned_leads: [] });
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!wineryId) return;
    const load = async () => {
      const { data: r } = await invokeAuth("admin-crm", { action: "notifications", winery_id: wineryId });
      if (r?.success) setData(r);
    };
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [wineryId]);

  const total = data.overdue_tasks.length + data.ready_messages.length + data.unassigned_leads.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
        aria-label="Notificações"
      >
        <Bell className="w-5 h-5 text-foreground/70" />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden max-h-[70vh] overflow-y-auto">
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
