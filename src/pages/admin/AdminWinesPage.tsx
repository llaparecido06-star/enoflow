import { useOutletContext } from "react-router-dom";
import { useWines, type Winery } from "@/hooks/useWinery";
import { Wine, Plus } from "lucide-react";

export default function AdminWinesPage() {
  const { winery } = useOutletContext<{ winery: Winery }>();
  const { data: wines } = useWines(winery.id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Vinhos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os vinhos da {winery.name}</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          Novo vinho
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Vinho</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Preço</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Degustação</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Restaurante</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Loja</th>
            </tr>
          </thead>
          <tbody>
            {wines?.map((wine) => (
              <tr key={wine.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Wine className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{wine.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{wine.type}</td>
                <td className="px-4 py-3 text-sm text-foreground hidden md:table-cell">R$ {Number(wine.price_bottle).toFixed(2)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${wine.on_tasting ? "bg-green-500" : "bg-border"}`} />
                </td>
                <td className="px-4 py-3 text-center hidden sm:table-cell">
                  <span className={`inline-block w-2 h-2 rounded-full ${wine.on_restaurant ? "bg-green-500" : "bg-border"}`} />
                </td>
                <td className="px-4 py-3 text-center hidden sm:table-cell">
                  <span className={`inline-block w-2 h-2 rounded-full ${wine.on_shop ? "bg-green-500" : "bg-border"}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
