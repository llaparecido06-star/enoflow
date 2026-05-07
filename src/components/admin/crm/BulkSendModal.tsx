import { useEffect, useState } from "react";
import { X, Send } from "lucide-react";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";
import type { CrmLead } from "./LeadCard";

interface Template { id: string; name: string; body: string; stage: string | null }

interface Props {
  leads: CrmLead[];
  wineryId: string;
  onClose: () => void;
}

const renderTemplate = (body: string, lead: CrmLead) =>
  body
    .replace(/\{\{nome\}\}/g, lead.name.split(" ")[0])
    .replace(/\{\{ultima_visita\}\}/g, lead.last_visit_at ? new Date(lead.last_visit_at).toLocaleDateString("pt-BR") : "sua última visita")
    .replace(/\{\{vinho_favorito\}\}/g, "nosso vinho que você curtiu");

export default function BulkSendModal({ leads, wineryId, onClose }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tplId, setTplId] = useState("");
  const [sending, setSending] = useState(false);
  const [sentIdx, setSentIdx] = useState(0);

  useEffect(() => {
    invokeAuth("admin-crm", { action: "list_templates", winery_id: wineryId }).then(({ data }) => {
      setTemplates(data?.templates ?? []);
      if (data?.templates?.[0]) setTplId(data.templates[0].id);
    });
  }, [wineryId]);

  const tpl = templates.find((t) => t.id === tplId);

  const start = async () => {
    if (!tpl) { toast.error("Selecione um template"); return; }
    setSending(true);
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const msg = renderTemplate(tpl.body, lead);
      const url = `https://wa.me/${lead.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
      window.open(url, "_blank");
      await invokeAuth("admin-crm", {
        action: "log_message",
        lead_id: lead.id,
        template_id: tpl.id,
        body: msg,
        winery_id: wineryId,
      });
      setSentIdx(i + 1);
      // Small delay between opens to avoid popup blockers
      await new Promise((r) => setTimeout(r, 1500));
    }
    setSending(false);
    toast.success(`${leads.length} mensagens registradas`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-lg rounded-2xl border border-border p-4 max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-display font-semibold">Envio em lote — {leads.length} leads</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <select value={tplId} onChange={(e) => setTplId(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mb-3">
          <option value="">— escolha um template —</option>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        {tpl && leads[0] && (
          <div className="bg-secondary/50 rounded-lg p-3 mb-3">
            <p className="text-[10px] text-muted-foreground mb-1">Pré-visualização (lead 1):</p>
            <p className="text-sm whitespace-pre-wrap">{renderTemplate(tpl.body, leads[0])}</p>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-xs text-amber-900">
          ⚠️ O navegador abrirá uma aba do WhatsApp por lead com 1.5s de intervalo. Permita pop-ups.
        </div>

        {sending ? (
          <div>
            <p className="text-sm text-center mb-2">Enviando {sentIdx} / {leads.length}…</p>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(sentIdx / leads.length) * 100}%` }} />
            </div>
          </div>
        ) : (
          <button onClick={start} disabled={!tplId}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            <Send className="w-4 h-4" /> Iniciar envio
          </button>
        )}
      </div>
    </div>
  );
}
