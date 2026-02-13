import { useOutletContext } from "react-router-dom";
import type { Winery } from "@/hooks/useWinery";
import { Users, Download } from "lucide-react";

export default function AdminLeadsPage() {
  const { winery } = useOutletContext<{ winery: Winery }>();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground">Visitantes e contatos capturados</p>
        </div>
        <button className="flex items-center gap-2 border border-border px-4 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors">
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">
          Os leads aparecerão aqui conforme turistas interagem com a plataforma.
        </p>
      </div>
    </div>
  );
}
