import { useEffect, useMemo, useState } from "react";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";
import { Save, Trash2, Filter, Send, Clock, Tag as TagIcon, Download } from "lucide-react";
import type { CrmLead } from "./LeadCard";
import { formatCurrency } from "@/lib/currency";
import BulkSendModal from "./BulkSendModal";
import ScheduleMessageModal from "./ScheduleMessageModal";

interface Segment {
  id: string;
  name: string;
  filters: Filters;
}

export interface Filters {
  stage?: string;
  persona?: string;
  gender?: string;
  income?: string;
  tag?: string;
  minLtv?: number;
  minVouchers?: number;
  minVisits?: number;
  recencyDays?: number;
  birthMonth?: number;
}

interface Props {
  leads: CrmLead[];
  wineryId: string;
  currency: string;
  onApplyToPipeline: (filters: Filters) => void;
}

export function applyFilters(leads: CrmLead[], f: Filters): CrmLead[] {
  return leads.filter((l) => {
    if (f.stage && l.stage !== f.stage) return false;
    if (f.persona) {
      const p = l.preferences_summary?.toLowerCase() ?? "";
      if (!p.includes(f.persona.toLowerCase())) return false;
    }
    if (f.gender && (l.gender ?? "").toLowerCase() !== f.gender.toLowerCase()) return false;
    if (f.income && (l.income_class ?? "") !== f.income) return false;
    if (f.tag && !l.tags.some((t) => t.toLowerCase().includes(f.tag!.toLowerCase()))) return false;
    if (f.minLtv && l.ltv < f.minLtv) return false;
    if (f.minVouchers && l.voucher_count < f.minVouchers) return false;
    if (f.minVisits && l.visit_count < f.minVisits) return false;
    if (f.recencyDays) {
      const ref = l.last_visit_at ?? l.last_voucher_at ?? l.created_at;
      const d = (Date.now() - new Date(ref).getTime()) / 86400000;
      if (d > f.recencyDays) return false;
    }
    if (f.birthMonth && l.birth_date) {
      const m = new Date(l.birth_date).getMonth() + 1;
      if (m !== f.birthMonth) return false;
    }
    return true;
  });
}

const initial: Filters = {};

export default function SegmentsTab({ leads, wineryId, currency, onApplyToPipeline }: Props) {
  const [filters, setFilters] = useState<Filters>(initial);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [name, setName] = useState("");
  const [bulkLeads, setBulkLeads] = useState<CrmLead[] | null>(null);
  const [scheduleLeads, setScheduleLeads] = useState<CrmLead[] | null>(null);

  const load = async () => {
    const { data } = await invokeAuth("admin-crm", { action: "list_segments", winery_id: wineryId });
    setSegments(data?.segments ?? []);
  };
  useEffect(() => { load(); }, [wineryId]);

  const result = useMemo(() => applyFilters(leads, filters), [leads, filters]);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));

  const reset = () => setFilters(initial);

  const saveSegment = async () => {
    if (!name.trim()) return;
    const { error } = await invokeAuth("admin-crm", { action: "save_segment", name, filters, winery_id: wineryId });
    if (error) { toast.error("Erro"); return; }
    toast.success("Segmento salvo");
    setShowSave(false); setName("");
    load();
  };

  const removeSegment = async (id: string) => {
    await invokeAuth("admin-crm", { action: "delete_segment", segment_id: id, winery_id: wineryId });
    load();
  };

  const applyTagBulk = async () => {
    const tag = prompt("Aplicar tag em " + result.length + " leads:");
    if (!tag?.trim()) return;
    for (const l of result) {
      const newTags = Array.from(new Set([...(l.tags ?? []), tag.trim()]));
      await invokeAuth("admin-crm", { action: "update_state", lead_id: l.id, tags: newTags, winery_id: wineryId });
    }
    toast.success(`Tag "${tag}" aplicada em ${result.length} leads`);
  };

  const exportCSV = () => {
    if (!result.length) { toast.error("Nenhum lead"); return; }
    const headers = ["Nome", "WhatsApp", "Estágio", "Tags", "LTV", "Vouchers", "Visitas", "Selos"];
    const rows = result.map((l) => [
      l.name, l.whatsapp, l.stage, l.tags.join("|"),
      l.ltv.toFixed(2), l.voucher_count, l.visit_count, l.loyalty_points,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `segmento_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-4">
      {/* Segmentos salvos */}
      <aside className="bg-card rounded-xl border border-border overflow-hidden h-fit">
        <div className="p-3 border-b border-border bg-secondary/30">
          <p className="text-xs font-semibold flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" /> Segmentos salvos</p>
        </div>
        {segments.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3">Nenhum salvo ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {segments.map((s) => {
              const count = applyFilters(leads, s.filters).length;
              return (
                <li key={s.id} className="p-3 hover:bg-secondary/30 flex items-center justify-between gap-2">
                  <button onClick={() => setFilters(s.filters)} className="text-left min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">{count} leads agora</p>
                  </button>
                  <button onClick={() => removeSegment(s.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      <div>
        {/* Construtor */}
        <div className="bg-card rounded-xl border border-border p-3 mb-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Construtor de segmento</p>
            <button onClick={reset} className="text-xs text-muted-foreground hover:underline">Limpar</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Sel label="Estágio" v={filters.stage} onChange={(v) => set("stage", v)} options={[
              { v: "", l: "Qualquer" }, { v: "novo", l: "Novo" }, { v: "contatado", l: "Contatado" },
              { v: "qualificado", l: "Qualificado" }, { v: "convertido", l: "Convertido" }, { v: "perdido", l: "Perdido" },
            ]} />
            <Inp label="Persona contém" v={filters.persona ?? ""} onChange={(v) => set("persona", v)} placeholder="Ex: Apreciador" />
            <Sel label="Gênero" v={filters.gender ?? ""} onChange={(v) => set("gender", v)} options={[
              { v: "", l: "Qualquer" }, { v: "masculino", l: "Masculino" }, { v: "feminino", l: "Feminino" }, { v: "outro", l: "Outro" },
            ]} />
            <Sel label="Renda" v={filters.income ?? ""} onChange={(v) => set("income", v)} options={[
              { v: "", l: "Qualquer" }, { v: "A", l: "A" }, { v: "B", l: "B" }, { v: "C", l: "C" }, { v: "D", l: "D" }, { v: "E", l: "E" },
            ]} />
            <Inp label="Tag contém" v={filters.tag ?? ""} onChange={(v) => set("tag", v)} placeholder="VIP" />
            <Num label="LTV mínimo" v={filters.minLtv} onChange={(v) => set("minLtv", v)} />
            <Num label="Vouchers mín" v={filters.minVouchers} onChange={(v) => set("minVouchers", v)} />
            <Num label="Visitas mín" v={filters.minVisits} onChange={(v) => set("minVisits", v)} />
            <Num label="Últimos N dias" v={filters.recencyDays} onChange={(v) => set("recencyDays", v)} />
            <Sel label="Aniv. no mês" v={filters.birthMonth ? String(filters.birthMonth) : ""} onChange={(v) => set("birthMonth", v ? Number(v) : undefined)} options={[
              { v: "", l: "Qualquer" },
              ...Array.from({ length: 12 }, (_, i) => ({ v: String(i + 1), l: new Date(2000, i, 1).toLocaleDateString("pt-BR", { month: "long" }) })),
            ]} />
          </div>
        </div>

        {/* Resultado + ações */}
        <div className="bg-card rounded-xl border border-border p-3 mb-3 flex flex-wrap items-center gap-2 justify-between">
          <p className="text-sm">
            <span className="font-bold text-primary">{result.length}</span> leads no segmento
            {result.length > 0 && (
              <span className="text-xs text-muted-foreground"> · LTV total {formatCurrency(result.reduce((s, l) => s + l.ltv, 0), currency)}</span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowSave(true)} className="flex items-center gap-1 border border-border px-2.5 py-1.5 rounded-md text-xs">
              <Save className="w-3 h-3" /> Salvar
            </button>
            <button onClick={() => onApplyToPipeline(filters)} className="flex items-center gap-1 border border-border px-2.5 py-1.5 rounded-md text-xs">
              <Filter className="w-3 h-3" /> Aplicar no funil
            </button>
            <button onClick={applyTagBulk} disabled={!result.length} className="flex items-center gap-1 border border-border px-2.5 py-1.5 rounded-md text-xs disabled:opacity-40">
              <TagIcon className="w-3 h-3" /> Aplicar tag
            </button>
            <button onClick={exportCSV} disabled={!result.length} className="flex items-center gap-1 border border-border px-2.5 py-1.5 rounded-md text-xs disabled:opacity-40">
              <Download className="w-3 h-3" /> CSV
            </button>
            <button onClick={() => setScheduleLeads(result)} disabled={!result.length} className="flex items-center gap-1 bg-amber-500/10 text-amber-700 border border-amber-300 px-2.5 py-1.5 rounded-md text-xs disabled:opacity-40">
              <Clock className="w-3 h-3" /> Agendar
            </button>
            <button onClick={() => setBulkLeads(result)} disabled={!result.length} className="flex items-center gap-1 bg-primary text-primary-foreground px-2.5 py-1.5 rounded-md text-xs disabled:opacity-40">
              <Send className="w-3 h-3" /> Enviar agora
            </button>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border max-h-[400px] overflow-y-auto">
          {result.slice(0, 200).map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border last:border-0 text-sm">
              <span className="truncate">{l.name}</span>
              <span className="text-[10px] text-muted-foreground">{l.stage} · {l.whatsapp}</span>
            </div>
          ))}
          {result.length > 200 && <p className="text-xs text-center text-muted-foreground py-2">+{result.length - 200} leads…</p>}
          {result.length === 0 && <p className="text-xs text-center text-muted-foreground py-6">Ajuste os filtros para ver leads.</p>}
        </div>
      </div>

      {showSave && (
        <div className="fixed inset-0 z-50 bg-foreground/40 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border p-4 w-full max-w-sm">
            <p className="text-sm font-semibold mb-2">Nome do segmento</p>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: VIPs ativos" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setShowSave(false)} className="flex-1 border border-border py-2 rounded-lg text-sm">Cancelar</button>
              <button onClick={saveSegment} className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {bulkLeads && <BulkSendModal leads={bulkLeads} wineryId={wineryId} onClose={() => setBulkLeads(null)} />}
      {scheduleLeads && <ScheduleMessageModal leads={scheduleLeads} wineryId={wineryId} onClose={() => setScheduleLeads(null)} />}
    </div>
  );
}

function Sel({ label, v, onChange, options }: any) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground uppercase block mb-0.5">{label}</label>
      <select value={v ?? ""} onChange={(e) => onChange(e.target.value || undefined)} className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-background">
        {options.map((o: any) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}
function Inp({ label, v, onChange, placeholder }: any) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground uppercase block mb-0.5">{label}</label>
      <input value={v} onChange={(e) => onChange(e.target.value || undefined)} placeholder={placeholder} className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-background" />
    </div>
  );
}
function Num({ label, v, onChange }: any) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground uppercase block mb-0.5">{label}</label>
      <input type="number" value={v ?? ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)} className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-background" />
    </div>
  );
}
