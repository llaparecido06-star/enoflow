import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Winery } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { invokeAuth } from "@/lib/auth-api";
import { formatCurrency } from "@/lib/currency";
import { Users, Download, Search, LayoutGrid, List, Filter, Send, MessageSquare, Tag } from "lucide-react";
import { toast } from "sonner";
import PipelineBoard from "@/components/admin/crm/PipelineBoard";
import LeadTimelineModal from "@/components/admin/crm/LeadTimelineModal";
import TemplatesManager from "@/components/admin/crm/TemplatesManager";
import BulkSendModal from "@/components/admin/crm/BulkSendModal";
import type { CrmLead } from "@/components/admin/crm/LeadCard";

type View = "pipeline" | "list" | "templates";

export default function AdminLeadsPage() {
  const { winery } = useOutletContext<{ winery: Winery; admin: AdminUser }>();
  const qc = useQueryClient();
  const [view, setView] = useState<View>("pipeline");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [activeLead, setActiveLead] = useState<CrmLead | null>(null);
  const [bulkLeads, setBulkLeads] = useState<CrmLead[] | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [minLtv, setMinLtv] = useState("");
  const [hasNps, setHasNps] = useState(false);
  const [tagFilter, setTagFilter] = useState("");

  const { data: leads = [], isLoading } = useQuery<CrmLead[]>({
    queryKey: ["crm-pipeline", winery.id],
    queryFn: async () => {
      const { data, error } = await invokeAuth("admin-crm", { action: "list_pipeline", winery_id: winery.id });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.leads ?? [];
    },
  });

  const filtered = useMemo(() => {
    let r = leads;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((l) => l.name.toLowerCase().includes(q) || l.whatsapp.includes(q));
    }
    if (stageFilter !== "all") r = r.filter((l) => l.stage === stageFilter);
    if (minLtv) r = r.filter((l) => l.ltv >= Number(minLtv));
    if (tagFilter.trim()) r = r.filter((l) => l.tags.some((t) => t.toLowerCase().includes(tagFilter.toLowerCase())));
    return r;
  }, [leads, search, stageFilter, minLtv, tagFilter]);

  const moveStage = async (leadId: string, stage: string) => {
    // Optimistic update
    qc.setQueryData(["crm-pipeline", winery.id], (old: CrmLead[] = []) =>
      old.map((l) => (l.id === leadId ? { ...l, stage } : l))
    );
    const { error } = await invokeAuth("admin-crm", { action: "move_stage", lead_id: leadId, stage, winery_id: winery.id });
    if (error) {
      toast.error("Erro ao mover");
      qc.invalidateQueries({ queryKey: ["crm-pipeline", winery.id] });
    } else {
      toast.success(`Movido para ${stage}`);
    }
  };

  const exportCSV = () => {
    if (!filtered.length) { toast.error("Nenhum lead"); return; }
    const sym = winery.currency || "BRL";
    const headers = ["Nome", "WhatsApp", "Estágio", "Tags", `LTV (${sym})`, "Vouchers", "Visitas", "Selos", "Data"];
    const rows = filtered.map((l) => [
      l.name, l.whatsapp, l.stage, l.tags.join("|"),
      l.ltv.toFixed(2), l.voucher_count, l.visit_count, l.loyalty_points,
      new Date(l.created_at).toLocaleDateString("pt-BR"),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crm_${winery.slug}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  const totalLtv = leads.reduce((s, l) => s + l.ltv, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">CRM</h1>
          <p className="text-sm text-muted-foreground">
            {leads.length} leads · LTV: {formatCurrency(totalLtv, winery.currency)}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-secondary rounded-lg p-0.5">
            <ViewBtn icon={LayoutGrid} active={view === "pipeline"} onClick={() => setView("pipeline")} label="Funil" />
            <ViewBtn icon={List} active={view === "list"} onClick={() => setView("list")} label="Lista" />
            <ViewBtn icon={MessageSquare} active={view === "templates"} onClick={() => setView("templates")} label="Templates" />
          </div>
        </div>
      </div>

      {view !== "templates" && (
        <div className="bg-card rounded-xl border border-border p-3 mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome, telefone…"
              className="pl-9 pr-3 py-2 border border-border rounded-lg text-sm bg-background w-full" />
          </div>
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-background">
            <option value="all">Todos os estágios</option>
            <option value="novo">Novo</option>
            <option value="contatado">Contatado</option>
            <option value="qualificado">Qualificado</option>
            <option value="convertido">Convertido</option>
            <option value="perdido">Perdido</option>
          </select>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 border px-3 py-2 rounded-lg text-sm ${showFilters ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
            <Filter className="w-4 h-4" /> Mais filtros
          </button>
          <button onClick={() => setBulkLeads(filtered)} disabled={filtered.length === 0}
            className="flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/30 px-3 py-2 rounded-lg text-sm disabled:opacity-40">
            <Send className="w-4 h-4" /> Envio em lote ({filtered.length})
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 border border-border px-3 py-2 rounded-lg text-sm">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      )}

      {showFilters && view !== "templates" && (
        <div className="bg-card rounded-xl border border-border p-3 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase block mb-1">LTV mínimo</label>
            <input type="number" value={minLtv} onChange={(e) => setMinLtv(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background" placeholder="0" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase block mb-1">Tag contém</label>
            <input value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background" placeholder="VIP" />
          </div>
        </div>
      )}

      {/* Body */}
      {isLoading ? (
        <p className="text-center text-sm text-muted-foreground py-12">Carregando…</p>
      ) : view === "pipeline" ? (
        <PipelineBoard
          leads={filtered}
          currency={winery.currency || "BRL"}
          onMove={moveStage}
          onOpen={(l) => setActiveLead(l)}
        />
      ) : view === "list" ? (
        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <Th>Nome</Th><Th>Estágio</Th><Th>Tags</Th>
                <Th right>LTV</Th><Th center>Vouchers</Th><Th center>Visitas</Th><Th center>Selos</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} onClick={() => setActiveLead(l)} className="border-b border-border last:border-0 hover:bg-secondary/30 cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center"><Users className="w-3.5 h-3.5 text-primary" /></div>
                      <div>
                        <p className="text-sm font-medium">{l.name}</p>
                        <p className="text-[10px] text-muted-foreground">{l.whatsapp}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-[10px] uppercase tracking-wider bg-secondary px-2 py-0.5 rounded">{l.stage}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {l.tags.slice(0, 2).map((t) => (
                        <span key={t} className="text-[9px] bg-secondary px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
                          <Tag className="w-2 h-2" />{t}
                        </span>
                      ))}
                      {l.tags.length > 2 && <span className="text-[9px] text-muted-foreground">+{l.tags.length - 2}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">{l.ltv > 0 ? formatCurrency(l.ltv, winery.currency) : "—"}</td>
                  <td className="px-4 py-3 text-center text-sm">{l.voucher_count || "—"}</td>
                  <td className="px-4 py-3 text-center text-sm">{l.visit_count || "—"}</td>
                  <td className="px-4 py-3 text-center text-sm">{l.loyalty_points || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhum lead.</p>}
        </div>
      ) : (
        <TemplatesManager wineryId={winery.id} />
      )}

      {activeLead && (
        <LeadTimelineModal
          lead={activeLead}
          wineryId={winery.id}
          currency={winery.currency || "BRL"}
          onClose={() => setActiveLead(null)}
          onUpdate={() => qc.invalidateQueries({ queryKey: ["crm-pipeline", winery.id] })}
        />
      )}
      {bulkLeads && (
        <BulkSendModal leads={bulkLeads} wineryId={winery.id} onClose={() => setBulkLeads(null)} />
      )}
    </div>
  );
}

function ViewBtn({ icon: Icon, active, onClick, label }: any) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${active ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}
function Th({ children, right, center }: any) {
  return <th className={`px-4 py-3 text-xs font-medium text-muted-foreground ${right ? "text-right" : center ? "text-center" : "text-left"}`}>{children}</th>;
}
