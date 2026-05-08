import { useEffect, useState } from "react";
import { invokeAuth } from "@/lib/auth-api";
import { Calendar, CheckCircle2, AlertTriangle, Clock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import TaskFormModal from "./TaskFormModal";

interface Task {
  id: string;
  lead_id: string | null;
  title: string;
  description: string | null;
  due_at: string;
  status: string;
  type: string;
  admin_id: string;
}

interface Props {
  wineryId: string;
  onLeadOpen?: (leadId: string) => void;
}

type Filter = "all" | "mine";

export default function TasksPanel({ wineryId, onLeadOpen }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>("mine");
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [counts, setCounts] = useState({ overdue: 0, today: 0, upcoming: 0, mineOverdue: 0 });

  const load = async () => {
    setLoading(true);
    const [{ data: tasksRes }, { data: countsRes }] = await Promise.all([
      invokeAuth("admin-crm", { action: "list_tasks", scope: filter === "mine" ? "mine" : "winery", winery_id: wineryId }),
      invokeAuth("admin-crm", { action: "task_counts", winery_id: wineryId }),
    ]);
    setTasks((tasksRes?.tasks ?? []).filter((t: Task) => t.status === "pendente"));
    if (countsRes?.success) setCounts({
      overdue: countsRes.overdue,
      today: countsRes.today,
      upcoming: countsRes.upcoming,
      mineOverdue: countsRes.mineOverdue,
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, [wineryId, filter]);

  const complete = async (id: string) => {
    await invokeAuth("admin-crm", { action: "complete_task", task_id: id, winery_id: wineryId });
    toast.success("Tarefa concluída");
    load();
  };

  const remove = async (id: string) => {
    await invokeAuth("admin-crm", { action: "delete_task", task_id: id, winery_id: wineryId });
    load();
  };

  const now = Date.now();
  const overdue = tasks.filter((t) => new Date(t.due_at).getTime() < now);
  const today = tasks.filter((t) => {
    const d = new Date(t.due_at);
    const e = new Date(); e.setHours(23, 59, 59, 999);
    return d.getTime() >= now && d.getTime() <= e.getTime();
  });
  const upcoming = tasks.filter((t) => {
    const e = new Date(); e.setHours(23, 59, 59, 999);
    return new Date(t.due_at).getTime() > e.getTime();
  });

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Agenda do CRM</h3>
          {counts.mineOverdue > 0 && (
            <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full">
              {counts.mineOverdue} atrasada{counts.mineOverdue > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-card border border-border rounded-md text-xs">
            <button onClick={() => setFilter("mine")} className={`px-2 py-1 ${filter === "mine" ? "bg-primary text-primary-foreground rounded-md" : ""}`}>Minhas</button>
            <button onClick={() => setFilter("all")} className={`px-2 py-1 ${filter === "all" ? "bg-primary text-primary-foreground rounded-md" : ""}`}>Todas</button>
          </div>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-1 bg-primary text-primary-foreground text-xs px-2.5 py-1.5 rounded-md">
            <Plus className="w-3 h-3" /> Nova
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border text-center text-[10px]">
        <Stat icon={AlertTriangle} label="Atrasadas" value={overdue.length} color="text-rose-600" />
        <Stat icon={Clock} label="Hoje" value={today.length} color="text-amber-600" />
        <Stat icon={Calendar} label="Próximas" value={upcoming.length} color="text-blue-600" />
      </div>

      <div className="max-h-[280px] overflow-y-auto">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-6">Carregando…</p>
        ) : tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Nenhuma tarefa pendente.</p>
        ) : (
          <div className="divide-y divide-border">
            {[...overdue, ...today, ...upcoming].map((t) => {
              const ov = new Date(t.due_at).getTime() < now;
              return (
                <div key={t.id} className="flex items-start gap-2 p-3 hover:bg-secondary/30">
                  <button onClick={() => complete(t.id)} title="Concluir" className="text-emerald-600 hover:text-emerald-700 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => t.lead_id && onLeadOpen?.(t.lead_id)}
                    disabled={!t.lead_id}
                    className="flex-1 text-left min-w-0 disabled:cursor-default"
                  >
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className={`text-[10px] ${ov ? "text-rose-600" : "text-muted-foreground"}`}>
                      {new Date(t.due_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      {" · "}{t.type}
                    </p>
                  </button>
                  <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showNew && (
        <TaskFormModal
          wineryId={wineryId}
          onClose={() => setShowNew(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: any) {
  return (
    <div className="py-2">
      <Icon className={`w-3.5 h-3.5 mx-auto mb-0.5 ${color}`} />
      <p className={`text-base font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}
