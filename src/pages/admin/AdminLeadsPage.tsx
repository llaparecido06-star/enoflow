import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Winery } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { invokeAuth } from "@/lib/auth-api";
import { formatCurrency } from "@/lib/currency";
import { Users, Download, Phone, Calendar, MapPin, Search, ExternalLink, TrendingUp, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface CaptureEntry {
  category: string | null;
  location: string | null;
  date: string;
}

interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  created_at: string;
  preferences_summary: string | null;
  birth_date: string | null;
  income_class: string | null;
  gender: string | null;
  acquisition_category: string | null;
  acquisition_location: string | null;
  ltv: number;
  voucher_count: number;
  capture_history: CaptureEntry[];
}

const ORIGINS = ["Todos", "Restaurante", "Degustação", "Loja", "WiFi", "QR"];

const genderLabel = (g: string) => {
  const map: Record<string, string> = { masculino: "Masculino", feminino: "Feminino", nao_informar: "N/I" };
  return map[g] || g;
};
const STATUSES = [
  { label: "Todos", value: "all" },
  { label: "Com voucher", value: "has_voucher" },
  { label: "Sem voucher", value: "no_voucher" },
  { label: "Compraram", value: "bought" },
];
const PAGE_SIZE = 20;

export default function AdminLeadsPage() {
  const { winery } = useOutletContext<{ winery: Winery; admin: AdminUser }>();
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [originFilter, setOriginFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["admin-leads", winery.id],
    queryFn: async () => {
      const res = await invokeAuth("admin-leads", {});
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      return res.data.leads ?? [];
    },
  });

  const filtered = useMemo(() => {
    let result = leads;

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.whatsapp.includes(q) ||
          (l.acquisition_location ?? "").toLowerCase().includes(q)
      );
    }

    // Date filter
    if (dateFrom) {
      result = result.filter((l) => l.created_at >= dateFrom);
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      result = result.filter((l) => l.created_at < endDate.toISOString());
    }

    // Origin filter
    if (originFilter !== "Todos") {
      result = result.filter((l) =>
        (l.acquisition_category ?? "").toLowerCase().includes(originFilter.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter === "has_voucher") {
      result = result.filter((l) => l.voucher_count > 0);
    } else if (statusFilter === "no_voucher") {
      result = result.filter((l) => l.voucher_count === 0);
    } else if (statusFilter === "bought") {
      result = result.filter((l) => l.ltv > 0);
    }

    return result;
  }, [leads, search, dateFrom, dateTo, originFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  const resetPage = () => setPage(1);

  const totalLtv = leads.reduce((s, l) => s + l.ltv, 0);
  const activeFilters = (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (originFilter !== "Todos" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0);

  const exportCSV = () => {
    if (!filtered.length) { toast.error("Nenhum lead para exportar"); return; }
    const sym = winery.currency || "BRL";
    const headers = ["Nome", "WhatsApp", "Data", "Origem", "Local", `LTV (${sym})`, "Vouchers", "Nascimento", "Sexo", "Renda", "Preferências"];
    const rows = filtered.map((l) => [
      l.name, l.whatsapp,
      new Date(l.created_at).toLocaleDateString("pt-BR"),
      l.acquisition_category ?? "", l.acquisition_location ?? "",
      l.ltv.toFixed(2), l.voucher_count,
      l.birth_date ? new Date(l.birth_date).toLocaleDateString("pt-BR") : "",
      l.gender ? genderLabel(l.gender) : "",
      l.income_class ?? "", l.preferences_summary ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_${winery.slug}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  const waLink = (phone: string) => {
    const clean = phone.replace(/\D/g, "");
    return `https://wa.me/${clean}`;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">CRM — Leads</h1>
          <p className="text-sm text-muted-foreground">
            {leads.length} leads · LTV Total: {formatCurrency(totalLtv, winery.currency)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
              placeholder="Buscar nome, telefone, local..."
              className="pl-9 pr-3 py-2 border border-border rounded-xl text-sm bg-card text-foreground w-56 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative flex items-center gap-1.5 border px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              showFilters ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-secondary"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {activeFilters > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-2 border border-border px-4 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-card rounded-xl border border-border p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Data Início</label>
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); resetPage(); }}
                className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Data Fim</label>
              <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); resetPage(); }}
                className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Origem</label>
              <select value={originFilter} onChange={(e) => { setOriginFilter(e.target.value); resetPage(); }}
                className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground">
                {ORIGINS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Status</label>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
                className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground">
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          {activeFilters > 0 && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); setOriginFilter("Todos"); setStatusFilter("all"); resetPage(); }}
              className="text-xs text-primary hover:underline">Limpar filtros</button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      ) : filtered.length > 0 ? (
        <>
          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                 <tr className="border-b border-border bg-secondary/50">
                   <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Nome</th>
                   <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">WhatsApp</th>
                   <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Origem</th>
                   <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Sexo</th>
                   <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">LTV</th>
                   <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Vouchers</th>
                   <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Data</th>
                 </tr>
              </thead>
              <tbody>
                {paginated.map((lead) => (
                  <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Users className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-foreground">{lead.name}</span>
                          {lead.income_class && (
                            <span className="ml-2 text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">{lead.income_class}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <a href={waLink(lead.whatsapp)} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                        <Phone className="w-3 h-3" />
                        {lead.whatsapp}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                     <td className="px-4 py-3">
                       {(lead.capture_history?.length > 0 || lead.acquisition_location) ? (
                         <div className="space-y-0.5">
                           {lead.capture_history?.length > 0 ? (
                             lead.capture_history.slice(0, 2).map((c, i) => (
                               <div key={i} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                 <MapPin className="w-3 h-3 shrink-0" />
                                 <span className="truncate max-w-[120px]">{c.location || c.category || "—"}</span>
                                 <span className="text-[10px] text-muted-foreground/60">
                                   {new Date(c.date).toLocaleDateString("pt-BR")}
                                 </span>
                               </div>
                             ))
                           ) : (
                             <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                               <MapPin className="w-3 h-3 shrink-0" />
                               <span className="truncate max-w-[120px]">{lead.acquisition_location}</span>
                             </div>
                           )}
                           {(lead.capture_history?.length ?? 0) > 2 && (
                             <span className="text-[10px] text-primary">+{lead.capture_history.length - 2} visitas</span>
                           )}
                         </div>
                       ) : (
                         <span className="text-xs text-muted-foreground/50">—</span>
                       )}
                     </td>
                     <td className="px-4 py-3 text-center">
                       <span className="text-xs text-muted-foreground">{lead.gender ? genderLabel(lead.gender) : "—"}</span>
                     </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-semibold ${lead.ltv > 0 ? "text-accent" : "text-muted-foreground"}`}>
                        {lead.ltv > 0 ? formatCurrency(lead.ltv, winery.currency) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-muted-foreground">{lead.voucher_count || "—"}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">
                {filtered.length} resultados · Página {page} de {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg border border-border hover:bg-secondary disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button key={pageNum} onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                        page === pageNum ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-muted-foreground"
                      }`}>
                      {pageNum}
                    </button>
                  );
                })}
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-border hover:bg-secondary disabled:opacity-30 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {search || activeFilters > 0 ? "Nenhum lead encontrado para esses filtros." : "Os leads aparecerão aqui conforme turistas interagem com a plataforma."}
          </p>
        </div>
      )}
    </div>
  );
}
