import { useEffect, useState } from "react";
import { X, Calendar } from "lucide-react";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";

interface Props {
  wineryId: string;
  leadId?: string | null;
  leadName?: string | null;
  taskId?: string | null;
  initial?: { title?: string; description?: string; due_at?: string; type?: string; assigned_admin_id?: string };
  presetDueAt?: Date;
  onClose: () => void;
  onSaved: () => void;
}

const TYPES = [
  { id: "followup", label: "Follow-up" },
  { id: "ligacao", label: "Ligação" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "visita", label: "Visita" },
  { id: "outro", label: "Outro" },
];

export default function TaskFormModal({ wineryId, leadId, leadName, taskId, initial, presetDueAt, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [dueAt, setDueAt] = useState(
    initial?.due_at
      ? toLocal(initial.due_at)
      : presetDueAt
      ? toLocal(new Date(presetDueAt.getFullYear(), presetDueAt.getMonth(), presetDueAt.getDate(), 9, 0).toISOString())
      : toLocal(new Date(Date.now() + 24 * 3600 * 1000).toISOString())
  );
  const [type, setType] = useState(initial?.type ?? "followup");
  const [assignedTo, setAssignedTo] = useState(initial?.assigned_admin_id ?? "");
  const [staff, setStaff] = useState<{ id: string; name: string; role: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    invokeAuth("admin-crm", { action: "list_staff", winery_id: wineryId }).then(({ data }) => {
      setStaff(data?.staff ?? []);
    });
  }, [wineryId]);

  const save = async () => {
    if (!title.trim() || !dueAt) {
      toast.error("Título e data são obrigatórios");
      return;
    }
    setSaving(true);
    const { data, error } = await invokeAuth("admin-crm", {
      action: "upsert_task",
      task_id: taskId || undefined,
      lead_id: leadId || undefined,
      title,
      description,
      due_at: new Date(dueAt).toISOString(),
      type,
      assigned_admin_id: assignedTo || undefined,
      winery_id: wineryId,
    });
    setSaving(false);
    if (error || data?.error) {
      toast.error("Erro ao salvar tarefa");
      return;
    }
    toast.success(taskId ? "Tarefa atualizada" : "Tarefa criada");
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border p-4 animate-scale-in">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4" /> {taskId ? "Editar tarefa" : "Nova tarefa"}
          </h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        {leadName && <p className="text-xs text-muted-foreground mb-3">Lead: <span className="font-medium text-foreground">{leadName}</span></p>}
        <div className="space-y-3">
          <Field label="Título">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" placeholder="Ex: Ligar para confirmar visita" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data e hora">
              <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
            </Field>
            <Field label="Tipo">
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
                {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Responsável">
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
              <option value="">— eu mesmo —</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
            </select>
          </Field>
          <Field label="Detalhes (opcional)">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
          </Field>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 border border-border py-2 rounded-lg text-sm">Cancelar</button>
          <button onClick={save} disabled={saving} className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm disabled:opacity-50">
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground uppercase block mb-1">{label}</label>
      {children}
    </div>
  );
}

function toLocal(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}
