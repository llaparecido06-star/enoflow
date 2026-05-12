import { useEffect, useMemo, useState } from "react";
import { invokeAuth } from "@/lib/auth-api";
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import TaskFormModal from "./TaskFormModal";

interface Task {
  id: string;
  lead_id: string | null;
  title: string;
  due_at: string;
  status: string;
  type: string;
  admin_id: string;
}

interface Staff { id: string; name: string; role: string }

interface Props {
  wineryId: string;
  onLeadOpen?: (leadId: string) => void;
}

const STORAGE_KEY = "crm_calendar_filters_v1";
const TYPE_COLOR: Record<string, string> = {
  followup: "bg-blue-500",
  ligacao: "bg-amber-500",
  visita: "bg-violet-500",
  mensagem: "bg-emerald-500",
};
const TYPE_LABEL: Record<string, string> = {
  followup: "Follow-up",
  ligacao: "Ligação",
  visita: "Visita",
  mensagem: "Mensagem",
};

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function TaskCalendar({ wineryId, onLeadOpen }: Props) {
  const persisted = (() => { try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } })();
  const [cursor, setCursor] = useState<Date>(new Date());
  const [selected, setSelected] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>(persisted.typeFilter ?? "all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>(persisted.assigneeFilter ?? "all");
  const [statusFilter, setStatusFilter] = useState<string>(persisted.statusFilter ?? "pendente");
  const [showNew, setShowNew] = useState(false);
  const [newPreset, setNewPreset] = useState<Date | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ typeFilter, assigneeFilter, statusFilter }));
  }, [typeFilter, assigneeFilter, statusFilter]);

  const load = async () => {
    setLoading(true);
    const [{ data: tRes }, { data: sRes }] = await Promise.all([
      invokeAuth("admin-crm", { action: "list_tasks", scope: "winery", winery_id: wineryId }),
      invokeAuth("admin-crm", { action: "list_staff", winery_id: wineryId }),
    ]);
    setTasks(tRes?.tasks ?? []);
    setStaff(sRes?.staff ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [wineryId]);

  const filteredTasks = useMemo(() => tasks.filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (assigneeFilter !== "all" && t.admin_id !== assigneeFilter) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  }), [tasks, typeFilter, assigneeFilter, statusFilter]);

  const tasksByDay = useMemo(() => {
    const m: Record<string, Task[]> = {};
    for (const t of filteredTasks) {
      const key = t.due_at.slice(0, 10);
      (m[key] ||= []).push(t);
    }
    return m;
  }, [filteredTasks]);

  // Build month grid (weeks of 7 cells starting on Sunday)
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
    if (i >= 34 && d > monthEnd && d.getDay() === 6) break;
  }

  const dayTasks = tasksByDay[selected.toISOString().slice(0, 10)] ?? [];

  const complete = async (id: string) => {
    await invokeAuth("admin-crm", { action: "complete_task", task_id: id, winery_id: wineryId });
    toast.success("Concluída");
    load();
  };
  const remove = async (id: string) => {
    await invokeAuth("admin-crm", { action: "delete_task", task_id: id, winery_id: wineryId });
    load();
  };

  const openNewForDay = (d: Date) => {
    setNewPreset(d);
    setShowNew(true);
  };

  const handleDrop = async (dayKey: string) => {
    const id = dragId;
    setDragId(null);
    setDragOverKey(null);
    if (!id) return;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const orig = new Date(task.due_at);
    const [y, m, dd] = dayKey.split("-").map(Number);
    const newDate = new Date(y, m - 1, dd, orig.getHours(), orig.getMinutes());
    if (newDate.toISOString().slice(0, 10) === task.due_at.slice(0, 10)) return;
    // optimistic
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, due_at: newDate.toISOString() } : t));
    const { error } = await invokeAuth("admin-crm", { action: "move_task", task_id: id, due_at: newDate.toISOString(), winery_id: wineryId });
    if (error) { toast.error("Erro ao mover"); load(); } else { toast.success("Reagendada"); }
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="p-1 hover:bg-secondary rounded"><ChevronLeft className="w-4 h-4" /></button>
          <h3 className="text-sm font-semibold capitalize min-w-[140px] text-center">
            {cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </h3>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="p-1 hover:bg-secondary rounded"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => { setCursor(new Date()); setSelected(new Date()); }} className="text-xs border border-border px-2 py-1 rounded ml-1">Hoje</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="text-xs border border-border rounded px-2 py-1 bg-background">
            <option value="all">Todos os tipos</option>
            <option value="followup">Follow-up</option>
            <option value="ligacao">Ligação</option>
            <option value="visita">Visita</option>
            <option value="mensagem">Mensagem</option>
          </select>
          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="text-xs border border-border rounded px-2 py-1 bg-background">
            <option value="all">Todos atendentes</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border border-border rounded px-2 py-1 bg-background">
            <option value="pendente">Pendentes</option>
            <option value="feito">Feitas</option>
            <option value="all">Todas</option>
          </select>
          <button onClick={() => openNewForDay(selected)} className="flex items-center gap-1 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
            <Plus className="w-3 h-3" /> Nova
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]">
        {/* Calendar grid */}
        <div className="p-2">
          <div className="grid grid-cols-7 text-[10px] uppercase text-muted-foreground mb-1">
            {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d) => (
              <div key={d} className="text-center py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d) => {
              const key = d.toISOString().slice(0, 10);
              const ts = tasksByDay[key] ?? [];
              const inMonth = d.getMonth() === cursor.getMonth();
              const isSel = isSameDay(d, selected);
              const isToday = isSameDay(d, new Date());
              return (
                <div
                  key={key + d.getTime()}
                  onClick={() => setSelected(d)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverKey(key); }}
                  onDragLeave={() => setDragOverKey((k) => (k === key ? null : k))}
                  onDrop={() => handleDrop(key)}
                  className={`relative h-16 sm:h-20 rounded-md border text-left p-1 transition-colors cursor-pointer ${
                    isSel ? "border-primary ring-1 ring-primary" : "border-border hover:bg-secondary/40"
                  } ${inMonth ? "bg-background" : "bg-secondary/20 text-muted-foreground"} ${
                    dragOverKey === key ? "bg-primary/10 border-primary" : ""
                  }`}
                >
                  <div className={`text-[11px] font-medium ${isToday ? "text-primary" : ""}`}>{d.getDate()}</div>
                  <div className="absolute bottom-1 left-1 right-1 flex flex-wrap gap-0.5">
                    {ts.slice(0, 4).map((t) => (
                      <span key={t.id} className={`w-1.5 h-1.5 rounded-full ${TYPE_COLOR[t.type] || "bg-gray-400"}`} />
                    ))}
                    {ts.length > 4 && <span className="text-[9px] text-muted-foreground">+{ts.length - 4}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 px-1 mt-2 text-[10px] text-muted-foreground">
            {Object.entries(TYPE_LABEL).map(([k, l]) => (
              <span key={k} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${TYPE_COLOR[k]}`} /> {l}
              </span>
            ))}
          </div>
        </div>

        {/* Day panel */}
        <div className="border-t lg:border-t-0 lg:border-l border-border p-3 max-h-[480px] overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold capitalize">
              {selected.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" })}
            </p>
            <button onClick={() => openNewForDay(selected)} className="text-xs flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded">
              <Plus className="w-3 h-3" /> Neste dia
            </button>
          </div>
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-6">Carregando…</p>
          ) : dayTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Sem tarefas neste dia.</p>
          ) : (
            <div className="space-y-1.5">
              {dayTasks.map((t) => {
                const ov = new Date(t.due_at) < new Date() && t.status === "pendente";
                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => { setDragId(null); setDragOverKey(null); }}
                    className={`flex items-start gap-2 p-2 border border-border rounded-md hover:bg-secondary/30 cursor-grab active:cursor-grabbing ${dragId === t.id ? "opacity-50" : ""}`}
                  >
                    <span className={`w-2 h-2 mt-1.5 rounded-full ${TYPE_COLOR[t.type] || "bg-gray-400"}`} />
                    <button
                      onClick={() => setEditing(t)}
                      className="flex-1 text-left min-w-0"
                    >
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className={`text-[10px] ${ov ? "text-rose-600" : "text-muted-foreground"}`}>
                        {new Date(t.due_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        {" · "}{TYPE_LABEL[t.type] || t.type}
                        {t.status === "feito" && " · ✓"}
                      </p>
                    </button>
                    {t.lead_id && (
                      <button onClick={() => onLeadOpen?.(t.lead_id!)} title="Abrir lead" className="text-[10px] text-primary underline">lead</button>
                    )}
                    {t.status === "pendente" && (
                      <button onClick={() => complete(t.id)} title="Concluir" className="text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showNew && (
        <TaskFormModal
          wineryId={wineryId}
          presetDueAt={newPreset ?? undefined}
          onClose={() => { setShowNew(false); setNewPreset(null); }}
          onSaved={load}
        />
      )}
      {editing && (
        <TaskFormModal
          wineryId={wineryId}
          taskId={editing.id}
          initial={{ title: editing.title, due_at: editing.due_at, type: editing.type, assigned_admin_id: editing.admin_id }}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
