import { useEffect, useState } from "react";
import { X, Phone, Calendar, Wine, MapPin, Star, Heart, MessageSquare, Plus, Trash2, ExternalLink, Award, Bell, CheckCircle2, Clock, Copy } from "lucide-react";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import type { CrmLead } from "./LeadCard";
import TaskFormModal from "./TaskFormModal";
import ScheduleMessageModal from "./ScheduleMessageModal";

interface Props {
  lead: CrmLead;
  wineryId: string;
  currency: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function LeadTimelineModal({ lead, wineryId, currency, onClose, onUpdate }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"timeline" | "notes" | "messages" | "tasks">("timeline");
  const [newNote, setNewNote] = useState("");
  const [newTag, setNewTag] = useState("");
  const [tags, setTags] = useState<string[]>(lead.tags);
  const [estValue, setEstValue] = useState(lead.estimated_value.toString());
  const [showTask, setShowTask] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const { data: r } = await invokeAuth("admin-crm", { action: "lead_360", lead_id: lead.id, winery_id: wineryId });
    setData(r);
    setLoading(false);
  };

  useEffect(() => { load(); }, [lead.id]);

  const addNote = async () => {
    if (!newNote.trim()) return;
    const { error } = await invokeAuth("admin-crm", { action: "add_note", lead_id: lead.id, note_body: newNote, winery_id: wineryId });
    if (error) toast.error("Erro ao salvar nota"); else { setNewNote(""); load(); toast.success("Nota adicionada"); }
  };

  const deleteNote = async (noteId: string) => {
    await invokeAuth("admin-crm", { action: "delete_note", note_id: noteId, winery_id: wineryId });
    load();
  };

  const saveState = async () => {
    await invokeAuth("admin-crm", {
      action: "update_state",
      lead_id: lead.id,
      winery_id: wineryId,
      tags,
      estimated_value: Number(estValue) || 0,
    });
    toast.success("Salvo!");
    onUpdate();
  };

  const addTag = () => {
    const t = newTag.trim();
    if (!t || tags.includes(t)) return;
    setTags([...tags, t]);
    setNewTag("");
  };

  const waLink = `https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`;

  // Combined timeline events
  const events: { date: string; type: string; label: string; meta?: string }[] = [];
  if (data) {
    for (const v of data.vouchers ?? []) {
      events.push({ date: v.created_at, type: "voucher", label: `Voucher ${v.code} · ${formatCurrency(Number(v.total), currency)}`, meta: v.redeemed ? "Resgatado" : "Pendente" });
    }
    for (const c of data.captures ?? []) {
      events.push({ date: c.created_at, type: "visit", label: `Visita: ${c.capture_location || c.capture_category || "—"}` });
    }
    for (const m of data.messages ?? []) {
      events.push({ date: m.sent_at, type: "message", label: `Mensagem (${m.channel})`, meta: m.body?.slice(0, 80) });
    }
    events.sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-2xl rounded-2xl border border-border max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 bg-card z-10 border-b border-border p-4 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">{lead.name}</h2>
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                <Phone className="w-3 h-3" /> {lead.whatsapp} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="w-5 h-5" /></button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            <Stat icon={Wine} label="Vouchers" value={lead.voucher_count} />
            <Stat icon={MapPin} label="Visitas" value={lead.visit_count} />
            <Stat icon={Award} label="Selos" value={lead.loyalty_points} />
            <Stat icon={Star} label="LTV" value={formatCurrency(lead.ltv, currency)} small />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3 border-b border-border -mb-4">
            {(["timeline", "notes", "messages"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
                {t === "timeline" ? "Timeline" : t === "notes" ? "Notas" : "Mensagens"}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando…</p>
          ) : (
            <>
              {/* Profile + tags + value (always visible) */}
              <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  {data.lead.preferences_summary || "Sem persona"}
                  {data.lead.gender && ` · ${data.lead.gender}`}
                  {data.lead.income_class && ` · Renda ${data.lead.income_class}`}
                </p>
                <div className="flex flex-wrap gap-1">
                  {tags.map((t) => (
                    <span key={t} className="text-[10px] bg-card border border-border px-2 py-0.5 rounded inline-flex items-center gap-1">
                      {t}
                      <button onClick={() => setTags(tags.filter((x) => x !== t))}><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                  <input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()}
                    placeholder="+ tag" className="text-[10px] bg-card border border-border rounded px-2 py-0.5 w-20" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-muted-foreground">Valor estimado:</label>
                  <input type="number" value={estValue} onChange={(e) => setEstValue(e.target.value)}
                    className="text-xs bg-card border border-border rounded px-2 py-1 w-24" />
                  <button onClick={saveState} className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded">Salvar</button>
                </div>
              </div>

              {tab === "timeline" && (
                <div className="space-y-2">
                  {events.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade ainda.</p>}
                  {events.map((ev, i) => (
                    <div key={i} className="flex gap-3 text-sm border-l-2 border-primary/30 pl-3 py-1">
                      <Calendar className="w-3 h-3 text-muted-foreground mt-1 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs">{ev.label}</p>
                        {ev.meta && <p className="text-[10px] text-muted-foreground">{ev.meta}</p>}
                        <p className="text-[9px] text-muted-foreground/70">{new Date(ev.date).toLocaleString("pt-BR")}</p>
                      </div>
                    </div>
                  ))}
                  {/* Favorites + Ratings */}
                  {(data.favorites?.length > 0 || data.ratings?.length > 0) && (
                    <div className="pt-3 border-t border-border">
                      <p className="text-xs font-medium mb-1 flex items-center gap-1"><Heart className="w-3 h-3" /> Vinhos curtidos</p>
                      <p className="text-[10px] text-muted-foreground">{data.favorites?.length ?? 0} favoritos · {data.ratings?.length ?? 0} avaliados</p>
                    </div>
                  )}
                </div>
              )}

              {tab === "notes" && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={2} placeholder="Adicionar nota…"
                      className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-background resize-none" />
                    <button onClick={addNote} className="bg-primary text-primary-foreground px-3 rounded-lg text-sm">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {(data.notes ?? []).map((n: any) => (
                    <div key={n.id} className="bg-secondary/50 rounded-lg p-3 text-sm">
                      <p>{n.body}</p>
                      <div className="flex justify-between items-center mt-1 text-[10px] text-muted-foreground">
                        <span>{new Date(n.created_at).toLocaleString("pt-BR")}</span>
                        <button onClick={() => deleteNote(n.id)} className="text-destructive hover:underline">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(data.notes ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma nota.</p>}
                </div>
              )}

              {tab === "messages" && (
                <div className="space-y-2">
                  {(data.messages ?? []).map((m: any) => (
                    <div key={m.id} className="bg-secondary/50 rounded-lg p-3 text-sm">
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {m.channel} · {new Date(m.sent_at).toLocaleString("pt-BR")}
                      </p>
                      {m.body && <p className="mt-1">{m.body}</p>}
                    </div>
                  ))}
                  {(data.messages ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma mensagem registrada.</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, small }: any) {
  return (
    <div className="bg-secondary/50 rounded-lg p-2 text-center">
      <Icon className="w-3 h-3 text-muted-foreground mx-auto mb-0.5" />
      <p className={small ? "text-xs font-semibold text-foreground" : "text-sm font-semibold text-foreground"}>{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
