import { useDraggable } from "@dnd-kit/core";
import { Phone, Wine, Calendar, Tag, AlertTriangle, Bell } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

export interface CrmLead {
  id: string;
  name: string;
  whatsapp: string;
  preferences_summary: string | null;
  loyalty_points: number;
  stage: string;
  tags: string[];
  estimated_value: number;
  ltv: number;
  voucher_count: number;
  last_voucher_at: string | null;
  visit_count: number;
  last_visit_at: string | null;
  assigned_admin_id: string | null;
  created_at: string;
  stage_changed_at?: string | null;
  lost_reason?: string | null;
  next_task?: { due_at: string; title: string; overdue: boolean } | null;
  birth_date?: string | null;
  gender?: string | null;
  income_class?: string | null;
}

const daysSince = (iso: string | null | undefined) => {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
};

const STALE_DAYS = 7;
const FINAL_STAGES = ["convertido", "perdido"];

const ageFrom = (iso?: string | null): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const age = Math.floor(diff / (365.25 * 86400000));
  return age > 0 && age < 120 ? age : null;
};

const GENDER_ICON: Record<string, string> = { masculino: "♂", feminino: "♀", nao_informar: "" };

export default function LeadCard({ lead, currency, onOpen }: { lead: CrmLead; currency: string; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  const days = daysSince(lead.last_visit_at ?? lead.last_voucher_at ?? lead.created_at);
  const persona = lead.preferences_summary?.match(/Wine Persona:\s*([^(]+)/)?.[1]?.trim();
  const stageDays = daysSince(lead.stage_changed_at);
  const stale = !FINAL_STAGES.includes(lead.stage) && stageDays !== null && stageDays >= STALE_DAYS;
  const age = ageFrom(lead.birth_date);
  const genderIcon = lead.gender ? GENDER_ICON[lead.gender] ?? "" : "";
  const demoChips = [
    age ? `${age}a` : null,
    genderIcon || null,
    lead.income_class ? `R:${lead.income_class}` : null,
  ].filter(Boolean) as string[];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-shadow ${
        isDragging ? "shadow-lg opacity-70" : "hover:shadow-md"
      } ${stale ? "ring-1 ring-amber-300" : ""}`}
    >
      <div {...listeners} {...attributes} className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{lead.name}</p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Phone className="w-2.5 h-2.5" /> {lead.whatsapp}
          </p>
        </div>
        <button onClick={onOpen} className="text-[10px] text-primary hover:underline shrink-0">Abrir</button>
      </div>
      {persona && (
        <p className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded inline-block mb-1.5">{persona}</p>
      )}
      {demoChips.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {demoChips.map((c, i) => (
            <span key={i} className="text-[9px] bg-secondary/70 text-muted-foreground px-1.5 py-0.5 rounded">{c}</span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><Wine className="w-2.5 h-2.5" />{lead.voucher_count}v</span>
        {lead.ltv > 0 && <span className="font-semibold text-accent">{formatCurrency(lead.ltv, currency)}</span>}
        {days !== null && (
          <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />{days}d</span>
        )}
      </div>
      {lead.next_task && (
        <div className={`mt-2 flex items-center gap-1 text-[10px] px-1.5 py-1 rounded ${lead.next_task.overdue ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700"}`}>
          <Bell className="w-2.5 h-2.5" />
          <span className="truncate">{lead.next_task.title}</span>
        </div>
      )}
      {stale && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-700">
          <AlertTriangle className="w-2.5 h-2.5" /> {stageDays}d parado
        </div>
      )}
      {lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {lead.tags.slice(0, 3).map((t) => (
            <span key={t} className="text-[9px] bg-secondary text-foreground px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
              <Tag className="w-2 h-2" />{t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
