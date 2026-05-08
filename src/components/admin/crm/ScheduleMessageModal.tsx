import { useEffect, useState } from "react";
import { X, Clock } from "lucide-react";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";
import type { CrmLead } from "./LeadCard";

interface Template { id: string; name: string; body: string; stage: string | null }

interface Props {
  leads: CrmLead[];
  wineryId: string;
  onClose: () => void;
}

function toLocal(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export default function ScheduleMessageModal({ leads, wineryId, onClose }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tplId, setTplId] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [scheduledFor, setScheduledFor] = useState(
    toLocal(new Date(Date.now() + 60 * 60 * 1000).toISOString())
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    invokeAuth("admin-crm", { action: "list_templates", winery_id: wineryId }).then(({ data }) => {
      setTemplates(data?.templates ?? []);
    });
  }, [wineryId]);

  const tpl = templates.find((t) => t.id === tplId);
  const body = customBody || tpl?.body || "";

  const schedule = async () => {
    if (!body.trim() || !scheduledFor) {
      toast.error("Mensagem e horário são obrigatórios");
      return;
    }
    setSaving(true);
    const { data, error } = await invokeAuth("admin-crm", {
      action: "schedule_messages",
      lead_ids: leads.map((l) => l.id),
      template_id: tpl?.id || null,
      body_template: body,
      scheduled_for: new Date(scheduledFor).toISOString(),
      winery_id: wineryId,
    });
    setSaving(false);
    if (error || data?.error) {
      toast.error("Erro ao agendar");
      return;
    }
    toast.success(`${data.count} mensagens agendadas`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-lg rounded-2xl border border-border p-4 max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4" /> Agendar envio — {leads.length} leads
          </h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <label className="text-[10px] text-muted-foreground uppercase block mb-1">Template (opcional)</label>
        <select value={tplId} onChange={(e) => { setTplId(e.target.value); setCustomBody(""); }}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mb-3">
          <option value="">— sem template —</option>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <label className="text-[10px] text-muted-foreground uppercase block mb-1">Mensagem (use {`{{nome}}`})</label>
        <textarea value={body} onChange={(e) => setCustomBody(e.target.value)} rows={5}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none mb-3" />

        <label className="text-[10px] text-muted-foreground uppercase block mb-1">Enviar em</label>
        <input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mb-3" />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 text-xs text-blue-900">
          ℹ️ As mensagens ficam pendentes até a data marcada. Quando o horário chegar, elas aparecem em "Para enviar agora" — você abre o WhatsApp com 1 clique.
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 border border-border py-2 rounded-lg text-sm">Cancelar</button>
          <button onClick={schedule} disabled={saving} className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm disabled:opacity-50">
            {saving ? "Agendando…" : "Agendar"}
          </button>
        </div>
      </div>
    </div>
  );
}
