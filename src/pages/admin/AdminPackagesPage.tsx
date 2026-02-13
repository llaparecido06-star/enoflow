import { useOutletContext } from "react-router-dom";
import { useTastingPackages, type Winery } from "@/hooks/useWinery";
import { Package, Plus } from "lucide-react";

export default function AdminPackagesPage() {
  const { winery } = useOutletContext<{ winery: Winery }>();
  const { data: packages } = useTastingPackages(winery.id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Pacotes de Degustação</h1>
          <p className="text-sm text-muted-foreground">Crie experiências de degustação</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          Novo pacote
        </button>
      </div>

      <div className="space-y-3">
        {packages?.map((pkg) => (
          <div key={pkg.id} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-semibold">{pkg.name}</h3>
                  <p className="text-[11px] text-muted-foreground">{pkg.wine_ids.length} vinhos · {pkg.description}</p>
                </div>
              </div>
              <span className="font-display text-lg font-bold text-foreground">R$ {Number(pkg.price).toFixed(2)}</span>
            </div>
          </div>
        ))}
        {(!packages || packages.length === 0) && (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum pacote criado ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
