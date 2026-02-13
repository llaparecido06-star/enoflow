import { useOutletContext } from "react-router-dom";
import type { Winery } from "@/hooks/useWinery";
import { BarChart3, TrendingUp, Send, Clock } from "lucide-react";

export default function AdminReportsPage() {
  const { winery } = useOutletContext<{ winery: Winery }>();

  const stats = [
    { label: "Automações Enviadas", value: "0", icon: Send, color: "text-green-600" },
    { label: "Agendadas", value: "0", icon: Clock, color: "text-gold" },
    { label: "Comissões Geradas", value: "R$ 0,00", icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">Relatórios</h1>
      <p className="text-sm text-muted-foreground mb-6">Pós-venda e automações</p>

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

      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">
          Dados de automação e comissões aparecerão aqui.
        </p>
      </div>
    </div>
  );
}
