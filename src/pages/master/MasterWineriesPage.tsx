import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import type { MasterAdmin } from "@/hooks/useMasterAuth";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Users, Wine, Receipt, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface WineryMetric {
  id: string;
  name: string;
  slug: string;
  plan_level: string;
  primary_color: string;
  created_at: string;
  leads_count: number;
  wines_count: number;
  vouchers_count: number;
  vouchers_value: number;
  admins_count: number;
}

const planOptions = ["bronze", "silver", "gold"] as const;
const planColors: Record<string, string> = {
  bronze: "bg-orange-500/10 text-orange-400",
  silver: "bg-gray-400/10 text-gray-300",
  gold: "bg-accent/10 text-accent",
};

export default function MasterWineriesPage() {
  const { admin } = useOutletContext<{ admin: MasterAdmin }>();
  const [wineries, setWineries] = useState<WineryMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await supabase.functions.invoke("master-dashboard", {
        body: { admin_id: admin.id },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      setWineries(res.data.wineries ?? []);
    } catch {
      toast.error("Erro ao carregar vinícolas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [admin.id]);

  const updatePlan = async (wineryId: string, plan: string) => {
    setUpdatingId(wineryId);
    try {
      const res = await supabase.functions.invoke("master-dashboard", {
        body: { admin_id: admin.id, action: "update_plan", winery_id: wineryId, plan_level: plan },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("Plano atualizado!");
      setWineries(prev => prev.map(w => w.id === wineryId ? { ...w, plan_level: plan } : w));
    } catch {
      toast.error("Erro ao atualizar plano");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Vinícolas</h1>
        <p className="text-sm text-muted-foreground">{wineries.length} vinícolas na plataforma</p>
      </div>

      <div className="space-y-4">
        {wineries.map((w) => (
          <div key={w.id} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: w.primary_color }}
                >
                  {w.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground">{w.name}</h3>
                  <p className="text-[11px] text-muted-foreground">/{w.slug} · desde {new Date(w.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={w.plan_level}
                  onChange={(e) => updatePlan(w.id, e.target.value)}
                  disabled={updatingId === w.id}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer ${planColors[w.plan_level] || "bg-secondary text-foreground"} focus:outline-none`}
                >
                  {planOptions.map(p => (
                    <option key={p} value={p} className="bg-card text-foreground">{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
                <a
                  href={`/admin/${w.slug}`}
                  target="_blank"
                  rel="noopener"
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-accent" />
                <div>
                  <p className="text-xs font-bold text-foreground">{w.leads_count}</p>
                  <p className="text-[9px] text-muted-foreground">Leads</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Wine className="w-3.5 h-3.5 text-primary" />
                <div>
                  <p className="text-xs font-bold text-foreground">{w.wines_count}</p>
                  <p className="text-[9px] text-muted-foreground">Vinhos</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Receipt className="w-3.5 h-3.5 text-green-500" />
                <div>
                  <p className="text-xs font-bold text-foreground">{w.vouchers_count}</p>
                  <p className="text-[9px] text-muted-foreground">Vouchers</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <div>
                  <p className="text-xs font-bold text-foreground">R$ {w.vouchers_value.toFixed(0)}</p>
                  <p className="text-[9px] text-muted-foreground">Receita</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
