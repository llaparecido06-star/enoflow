import { useState, useMemo, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Winery } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { invokeAuth } from "@/lib/auth-api";
import { formatCurrency } from "@/lib/currency";
import { Download, Search, LayoutGrid, List, Filter, Send, MessageSquare, Layers, Calendar, Settings } from "lucide-react";
import { toast } from "sonner";
import PipelineBoard from "@/components/admin/crm/PipelineBoard";
import LeadTimelineModal from "@/components/admin/crm/LeadTimelineModal";
import TemplatesManager from "@/components/admin/crm/TemplatesManager";
import BulkSendModal from "@/components/admin/crm/BulkSendModal";
import VirtualLeadList from "@/components/admin/crm/VirtualLeadList";
import SegmentsTab, { applyFilters, type Filters as SegFilters } from "@/components/admin/crm/SegmentsTab";
import TasksPanel from "@/components/admin/crm/TasksPanel";
import ScheduledQueue from "@/components/admin/crm/ScheduledQueue";
import TaskCalendar from "@/components/admin/crm/TaskCalendar";
import AssignmentQueueSettings from "@/components/admin/crm/AssignmentQueueSettings";
import type { CrmLead } from "@/components/admin/crm/LeadCard";

type View = "pipeline" | "list" | "segments" | "agenda" | "templates" | "settings";
type AgendaView = "list" | "calendar" | "scheduled";

interface PersistedState {
  search: string;
  stageFilter: string;
  minLtv: string;
  tagFilter: string;
  view: View;
  pipelineFilters: SegFilters;
}

const STORAGE_PREFIX = "crm_state_";

export default function AdminLeadsPage() {
  const { winery, admin } = useOutletContext<{ winery: Winery; admin: AdminUser }>();
  const qc = useQueryClient();
  const storageKey = `${STORAGE_PREFIX}${winery.id}`;
  const canManage = admin?.role === "owner" || admin?.role === "manager" || admin?.role === "master";

  // ── Restore persisted state
  const persisted: Partial<PersistedState> = (() => {
    try { return JSON.parse(sessionStorage.getItem(storageKey) || "{}"); } catch { return {}; }
  })();

  const [view, setView] = useState<View>(persisted.view ?? "pipeline");
  const [agendaView, setAgendaView] = useState<AgendaView>("list");
  const [search, setSearch] = useState(persisted.search ?? "");
  const [stageFilter, setStageFilter] = useState(persisted.stageFilter ?? "all");
  const [minLtv, setMinLtv] = useState(persisted.minLtv ?? "");
  const [tagFilter, setTagFilter] = useState(persisted.tagFilter ?? "");
  const [showFilters, setShowFilters] = useState(false);
  const [pipelineFilters, setPipelineFilters] = useState<SegFilters>(persisted.pipelineFilters ?? {});
  const [activeLead, setActiveLead] = useState<CrmLead | null>(null);
  const [bulkLeads, setBulkLeads] = useState<CrmLead[] | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Persist
  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify({ search, stageFilter, minLtv, tagFilter, view, pipelineFilters }));
  }, [storageKey, search, stageFilter, minLtv, tagFilter, view, pipelineFilters]);

  const { data: leads = [], isLoading } = useQuery<CrmLead[]>({
    queryKey: ["crm-pipeline", winery.id],
    queryFn: async () => {
      const { data, error } = await invokeAuth("admin-crm", { action: "list_pipeline", winery_id: winery.id });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.leads ?? [];
    },
  });

  // Task counts (badge)
  const { data: counts } = useQuery({
    queryKey: ["crm-task-counts", winery.id],
    queryFn: async () => {
      const { data } = await invokeAuth("admin-crm", { action: "task_counts", winery_id: winery.id });
      return data ?? {};
    },
    refetchInterval: 60000,
  });

  const filtered = useMemo(() => {
    let r = leads;
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      r = r.filter((l) => l.name.toLowerCase().includes(q) || l.whatsapp.includes(q));
    }
    if (stageFilter !== "all") r = r.filter((l) => l.stage === stageFilter);
    if (minLtv) r = r.filter((l) => l.ltv >= Number(minLtv));
    if (tagFilter.trim()) r = r.filter((l) => l.tags.some((t) => t.toLowerCase().includes(tagFilter.toLowerCase())));
    // Apply segment filters too (when set via "aplicar no funil")
    if (Object.keys(pipelineFilters).length > 0) r = applyFilters(r, pipelineFilters);
    return r;
  }, [leads, debouncedSearch, stageFilter, minLtv, tagFilter, pipelineFilters]);

  const moveStage = async (leadId: string, stage: string) => {
    let lost_reason: string | null = null;
    if (stage === "perdido") {
      lost_reason = window.prompt("Motivo da perda (opcional):") || null;
    } else if (stage === "convertido") {
      if (!confirm("Marcar este lead como Convertido?")) return;
    }
    qc.setQueryData(["crm-pipeline", winery.id], (old: CrmLead[] = []) =>
      old.map((l) => (l.id === leadId ? { ...l, stage, lost_reason, stage_changed_at: new Date().toISOString() } : l))
    );
    const { error } = await invokeAuth("admin-crm", {
      action: lost_reason ? "move_stage_with_reason" : "move_stage",
      lead_id: leadId, stage, lost_reason, winery_id: winery.id,
    });
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

  const openLeadById = (id: string) => {
    const l = leads.find((x) => x.id === id);
    if (l) setActiveLead(l);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">CRM</h1>
          <p className="text-sm text-muted-foreground">
            {leads.length} leads · LTV: {formatCurrency(totalLtv, winery.currency)}
            {counts?.mineOverdue > 0 && (
              <span className="ml-2 text-rose-600 font-medium">⚠ {counts.mineOverdue} tarefa{counts.mineOverdue > 1 ? "s" : ""} atrasada{counts.mineOverdue > 1 ? "s" : ""}</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex bg-secondary rounded-lg p-0.5 flex-wrap">
            <ViewBtn icon={LayoutGrid} active={view === "pipeline"} onClick={() => setView("pipeline")} label="Funil" />
            <ViewBtn icon={List} active={view === "list"} onClick={() => setView("list")} label="Lista" />
            <ViewBtn icon={Layers} active={view === "segments"} onClick={() => setView("segments")} label="Segmentos" />
            <ViewBtn icon={Calendar} active={view === "agenda"} onClick={() => setView("agenda")} label="Agenda" badge={counts?.mineOverdue || counts?.today || 0} />
            <ViewBtn icon={MessageSquare} active={view === "templates"} onClick={() => setView("templates")} label="Templates" />
            {canManage && <ViewBtn icon={Settings} active={view === "settings"} onClick={() => setView("settings")} label="Config" />}
          </div>
        </div>
      </div>

      {(view === "pipeline" || view === "list") && (
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
          {Object.keys(pipelineFilters).length > 0 && (
            <button onClick={() => setPipelineFilters({})} className="text-xs text-amber-700 bg-amber-50 border border-amber-300 px-2 py-1 rounded">
              Segmento ativo · limpar
            </button>
          )}
          <button onClick={() => setBulkLeads(filtered)} disabled={filtered.length === 0}
            className="flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/30 px-3 py-2 rounded-lg text-sm disabled:opacity-40">
            <Send className="w-4 h-4" /> Envio em lote ({filtered.length})
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 border border-border px-3 py-2 rounded-lg text-sm">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      )}

      {showFilters && (view === "pipeline" || view === "list") && (
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
        <VirtualLeadList leads={filtered} currency={winery.currency || "BRL"} onOpen={setActiveLead} />
      ) : view === "segments" ? (
        <SegmentsTab
          leads={leads}
          wineryId={winery.id}
          currency={winery.currency || "BRL"}
          onApplyToPipeline={(f) => { setPipelineFilters(f); setView("pipeline"); toast.success("Segmento aplicado ao funil"); }}
        />
      ) : view === "agenda" ? (
        <div className="space-y-3">
          <div className="flex bg-secondary rounded-lg p-0.5 w-fit">
            <SubBtn active={agendaView === "list"} onClick={() => setAgendaView("list")} label="Lista" />
            <SubBtn active={agendaView === "calendar"} onClick={() => setAgendaView("calendar")} label="Calendário" />
            <SubBtn active={agendaView === "scheduled"} onClick={() => setAgendaView("scheduled")} label="Mensagens agendadas" />
          </div>
          {agendaView === "list" ? (
            <div className="grid lg:grid-cols-2 gap-4">
              <TasksPanel wineryId={winery.id} onLeadOpen={openLeadById} />
              <ScheduledQueue wineryId={winery.id} />
            </div>
          ) : agendaView === "calendar" ? (
            <TaskCalendar wineryId={winery.id} onLeadOpen={openLeadById} />
          ) : (
            <ScheduledQueue wineryId={winery.id} />
          )}
        </div>
      ) : view === "settings" ? (
        canManage ? (
          <AssignmentQueueSettings wineryId={winery.id} />
        ) : (
          <p className="text-center text-sm text-muted-foreground py-12">Sem permissão.</p>
        )
      ) : (
        <TemplatesManager wineryId={winery.id} />
      )}

      {activeLead && (
        <LeadTimelineModal
          lead={activeLead}
          wineryId={winery.id}
          currency={winery.currency || "BRL"}
          onClose={() => setActiveLead(null)}
          onUpdate={() => {
            qc.invalidateQueries({ queryKey: ["crm-pipeline", winery.id] });
            qc.invalidateQueries({ queryKey: ["crm-task-counts", winery.id] });
          }}
        />
      )}
      {bulkLeads && (
        <BulkSendModal leads={bulkLeads} wineryId={winery.id} onClose={() => setBulkLeads(null)} />
      )}
    </div>
  );
}

function ViewBtn({ icon: Icon, active, onClick, label, badge }: any) {
  return (
    <button onClick={onClick}
      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${active ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
      <Icon className="w-4 h-4" /> {label}
      {badge > 0 && (
        <span className="ml-1 text-[9px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full leading-none">{badge}</span>
      )}
    </button>
  );
}
