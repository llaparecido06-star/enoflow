import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Winery } from "@/hooks/useWinery";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, TrendingUp, Send, Clock, CheckCircle, Timer, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminReportsPage() {
  const { winery } = useOutletContext<{ winery: Winery }>();
  const [processing, setProcessing] = useState(false);
  const qc = useQueryClient();

  const { data: automations } = useQuery({
    queryKey: ["automations", winery.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automations")
        .select("*, users_leads(name, whatsapp)")
        .eq("winery_id", winery.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const sent = automations?.filter((a) => a.status === "sent") ?? [];
  const scheduled = automations?.filter((a) => a.status === "scheduled") ?? [];
  const totalCommission = automations?.reduce((sum, a) => sum + (Number(a.commission_value) || 0), 0) ?? 0;

  const stats = [
    { label: "Automações Enviadas", value: String(sent.length), icon: Send, color: "text-green-600" },
    { label: "Agendadas", value: String(scheduled.length), icon: Clock, color: "text-gold" },
    { label: "Comissões Geradas", value: `R$ ${totalCommission.toFixed(2)}`, icon: TrendingUp, color: "text-primary" },
  ];

  const runAutomations = async () => {
    setProcessing(true);
    try {
      const res = await supabase.functions.invoke("process-automations", {
        body: { winery_id: winery.id },
      });
      if (res.error) throw res.error;
      toast.success(res.data.message);
      qc.invalidateQueries({ queryKey: ["automations"] });
    } catch {
      toast.error("Erro ao processar automações");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Pós-venda e automações</p>
        </div>
        <button
          onClick={runAutomations}
          disabled={processing}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Processar D+1 / D+15
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-[11px] text-muted-foreground">{stat.label}</span>
            </div>
            <p className="font-display text-xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {automations && automations.length > 0 ? (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-secondary/50">
            <h3 className="text-xs font-medium text-muted-foreground">Histórico de Automações</h3>
          </div>
          <div className="divide-y divide-border">
            {automations.map((auto) => {
              const lead = auto.users_leads as any;
              return (
                <div key={auto.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      auto.status === "sent" ? "bg-green-100" : "bg-gold/10"
                    }`}>
                      {auto.status === "sent" ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Timer className="w-4 h-4 text-gold" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{lead?.name ?? "Visitante"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {auto.trigger_type} · {lead?.whatsapp ?? ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      auto.status === "sent" ? "bg-green-100 text-green-700" : "bg-gold/10 text-gold"
                    }`}>
                      {auto.status === "sent" ? "Enviado" : "Agendado"}
                    </span>
                    {auto.commission_value && Number(auto.commission_value) > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        R$ {Number(auto.commission_value).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Clique em "Processar D+1 / D+15" para simular envios automáticos.</p>
        </div>
      )}
    </div>
  );
}
