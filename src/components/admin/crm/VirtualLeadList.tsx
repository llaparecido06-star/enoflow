import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Users, Tag, Bell, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import type { CrmLead } from "./LeadCard";

interface Props {
  leads: CrmLead[];
  currency: string;
  onOpen: (lead: CrmLead) => void;
}

const STAGE_LABEL: Record<string, string> = {
  novo: "Novo",
  contatado: "Contatado",
  qualificado: "Qualificado",
  convertido: "Convertido",
  perdido: "Perdido",
};

const STAGE_COLOR: Record<string, string> = {
  novo: "bg-blue-100 text-blue-700",
  contatado: "bg-amber-100 text-amber-700",
  qualificado: "bg-violet-100 text-violet-700",
  convertido: "bg-emerald-100 text-emerald-700",
  perdido: "bg-rose-100 text-rose-700",
};

const ROW_HEIGHT = 72;

export default function VirtualLeadList({ leads, currency, onOpen }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: leads.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  if (!leads.length) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">Nenhum lead encontrado.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="grid grid-cols-[1fr_120px_140px_120px_80px] md:grid-cols-[1.5fr_140px_180px_120px_100px_100px] px-4 py-2.5 bg-secondary/50 border-b border-border text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        <span>Lead</span>
        <span>Estágio</span>
        <span className="hidden md:block">Tags</span>
        <span>Próximo</span>
        <span className="text-right">LTV</span>
        <span className="text-right hidden md:block">Selos</span>
      </div>
      <div ref={parentRef} className="overflow-auto" style={{ height: "min(70vh, 600px)" }}>
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative", width: "100%" }}>
          {rowVirtualizer.getVirtualItems().map((vi) => {
            const l = leads[vi.index];
            const overdue = l.next_task?.overdue;
            return (
              <button
                key={l.id}
                onClick={() => onOpen(l)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${vi.start}px)`,
                  height: `${vi.size}px`,
                }}
                className="grid grid-cols-[1fr_120px_140px_120px_80px] md:grid-cols-[1.5fr_140px_180px_120px_100px_100px] items-center px-4 border-b border-border last:border-0 hover:bg-secondary/30 cursor-pointer text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{l.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{l.whatsapp}</p>
                  </div>
                </div>
                <div>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${STAGE_COLOR[l.stage] ?? "bg-secondary"}`}>
                    {STAGE_LABEL[l.stage] ?? l.stage}
                  </span>
                </div>
                <div className="hidden md:flex flex-wrap gap-1">
                  {l.tags.slice(0, 2).map((t) => (
                    <span key={t} className="text-[9px] bg-secondary px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
                      <Tag className="w-2 h-2" />{t}
                    </span>
                  ))}
                  {l.tags.length > 2 && <span className="text-[9px] text-muted-foreground">+{l.tags.length - 2}</span>}
                </div>
                <div>
                  {l.next_task ? (
                    <span className={`text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${overdue ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700"}`}>
                      {overdue ? <AlertTriangle className="w-2.5 h-2.5" /> : <Bell className="w-2.5 h-2.5" />}
                      <span className="truncate max-w-[80px]">{new Date(l.next_task.due_at).toLocaleDateString("pt-BR")}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-right">
                  {l.ltv > 0 ? formatCurrency(l.ltv, currency) : "—"}
                </p>
                <p className="text-sm text-right hidden md:block">{l.loyalty_points || "—"}</p>
              </button>
            );
          })}
        </div>
      </div>
      <div className="px-4 py-2 bg-secondary/30 border-t border-border text-[10px] text-muted-foreground">
        {leads.length} leads · virtualizado
      </div>
    </div>
  );
}
