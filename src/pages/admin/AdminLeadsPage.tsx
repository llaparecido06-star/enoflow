import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Winery } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { invokeAuth } from "@/lib/auth-api";
import { Users, Download, Phone, Calendar, MapPin, Search, ExternalLink, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  created_at: string;
  preferences_summary: string | null;
  birth_date: string | null;
  income_class: string | null;
  acquisition_category: string | null;
  acquisition_location: string | null;
  ltv: number;
  voucher_count: number;
}

export default function AdminLeadsPage() {
  const { winery } = useOutletContext<{ winery: Winery; admin: AdminUser }>();
  const [search, setSearch] = useState("");

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["admin-leads", winery.id],
    queryFn: async () => {
      const res = await invokeAuth("admin-leads", {});
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      return res.data.leads ?? [];
    },
  });

  const filtered = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.whatsapp.includes(search) ||
      (l.acquisition_location ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalLtv = leads.reduce((s, l) => s + l.ltv, 0);

  const exportCSV = () => {
    if (!filtered.length) { toast.error("Nenhum lead para exportar"); return; }
    const headers = ["Nome", "WhatsApp", "Data", "Origem", "Local", "LTV (R$)", "Vouchers", "Nascimento", "Renda", "Preferências"];
    const rows = filtered.map((l) => [
      l.name, l.whatsapp,
      new Date(l.created_at).toLocaleDateString("pt-BR"),
      l.acquisition_category ?? "", l.acquisition_location ?? "",
      l.ltv.toFixed(2), l.voucher_count,
      l.birth_date ? new Date(l.birth_date).toLocaleDateString("pt-BR") : "",
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
            {leads.length} leads · LTV Total: R$ {totalLtv.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nome, telefone, local..."
              className="pl-9 pr-3 py-2 border border-border rounded-xl text-sm bg-card text-foreground w-56 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-2 border border-border px-4 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">WhatsApp</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Origem</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">LTV (R$)</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Vouchers</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Data</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
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
                    {lead.acquisition_location ? (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[120px]">{lead.acquisition_location}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-semibold ${lead.ltv > 0 ? "text-accent" : "text-muted-foreground"}`}>
                      {lead.ltv > 0 ? lead.ltv.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "—"}
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
      ) : (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? "Nenhum lead encontrado para esta busca." : "Os leads aparecerão aqui conforme turistas interagem com a plataforma."}
          </p>
        </div>
      )}
    </div>
  );
}
