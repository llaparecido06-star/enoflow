import { DndContext, useDroppable, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import LeadCard, { type CrmLead } from "./LeadCard";
import { formatCurrency } from "@/lib/currency";

const STAGES = [
  { id: "novo", label: "Novo", color: "bg-blue-500/10 text-blue-700" },
  { id: "contatado", label: "Contatado", color: "bg-amber-500/10 text-amber-700" },
  { id: "qualificado", label: "Qualificado", color: "bg-violet-500/10 text-violet-700" },
  { id: "convertido", label: "Convertido", color: "bg-emerald-500/10 text-emerald-700" },
  { id: "perdido", label: "Perdido", color: "bg-rose-500/10 text-rose-700" },
];

interface Props {
  leads: CrmLead[];
  currency: string;
  onMove: (leadId: string, stage: string) => void;
  onOpen: (lead: CrmLead) => void;
}

export default function PipelineBoard({ leads, currency, onMove, onOpen }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    if (!e.over) return;
    const stage = String(e.over.id);
    const leadId = String(e.active.id);
    const lead = leads.find((l) => l.id === leadId);
    if (lead && lead.stage !== stage) onMove(leadId, stage);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {STAGES.map((s) => {
          const colLeads = leads.filter((l) => l.stage === s.id);
          const colValue = colLeads.reduce((sum, l) => sum + (l.estimated_value || l.ltv || 0), 0);
          return <Column key={s.id} stage={s} leads={colLeads} value={colValue} currency={currency} onOpen={onOpen} />;
        })}
      </div>
    </DndContext>
  );
}

function Column({ stage, leads, value, currency, onOpen }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div ref={setNodeRef} className={`bg-secondary/30 rounded-xl p-2 min-h-[300px] transition-colors ${isOver ? "bg-primary/10" : ""}`}>
      <div className="flex items-center justify-between px-2 py-1.5 mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${stage.color}`}>{stage.label}</span>
        <span className="text-[10px] text-muted-foreground">{leads.length}</span>
      </div>
      {value > 0 && (
        <p className="text-[10px] text-muted-foreground text-right px-2 mb-2">{formatCurrency(value, currency)}</p>
      )}
      <div className="space-y-2">
        {leads.map((l: CrmLead) => (
          <LeadCard key={l.id} lead={l} currency={currency} onOpen={() => onOpen(l)} />
        ))}
      </div>
    </div>
  );
}
