import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import type { Winery } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Users, Download, Phone, Calendar } from "lucide-react";
import { toast } from "sonner";

interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  created_at: string;
  preferences_summary: string | null;
}

export default function AdminLeadsPage() {
  const { winery, admin } = useOutletContext<{ winery: Winery; admin: AdminUser }>();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await supabase.functions.invoke("admin-leads", {
          body: { admin_id: admin.id, winery_id: winery.id },
        });
        if (res.error) throw res.error;
        if (res.data?.error) throw new Error(res.data.error);
        setLeads(res.data.leads ?? []);
      } catch {
        toast.error("Erro ao carregar leads");
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, [admin.id, winery.id]);

  const exportCSV = () => {
    if (!leads || leads.length === 0) {
      toast.error("Nenhum lead para exportar");
      return;
    }
    const headers = ["Nome", "WhatsApp", "Data", "Preferências"];
    const rows = leads.map((l) => [
      l.name,
      l.whatsapp,
      new Date(l.created_at).toLocaleDateString("pt-BR"),
      l.preferences_summary ?? "",
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground">{leads.length} visitantes capturados</p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 border border-border px-4 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors">
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {loading ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      ) : leads.length > 0 ? (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">WhatsApp</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Data</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{lead.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      {lead.whatsapp}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
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
          <p className="text-sm text-muted-foreground">Os leads aparecerão aqui conforme turistas interagem com a plataforma.</p>
        </div>
      )}
    </div>
  );
}
