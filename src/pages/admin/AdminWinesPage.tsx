import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useWines, type Winery, type Wine } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { Wine as WineIcon, Plus, Pencil, Trash2, MapPin } from "lucide-react";
import WineFormModal from "@/components/admin/WineFormModal";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";

export default function AdminWinesPage() {
  const { winery, admin } = useOutletContext<{ winery: Winery; admin: AdminUser }>();
  const { data: wines } = useWines(winery.id);
  const { data: locations = [] } = useQuery<{ id: string; name: string; category: string }[]>({
    queryKey: ["capture-points", winery.id],
    queryFn: async () => {
      const res = await invokeAuth("admin-locations", { action: "list" });
      if (res.error) throw res.error;
      return res.data?.locations ?? [];
    },
  });
  const [formWine, setFormWine] = useState<Wine | null | undefined>(undefined);
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [deleteWine, setDeleteWine] = useState<Wine | null>(null);
  const [deleting, setDeleting] = useState(false);
  const qc = useQueryClient();

  const handleDelete = async () => {
    if (!deleteWine) return;
    setDeleting(true);
    try {
      const res = await invokeAuth("admin-wines", { action: "delete", wine_id: deleteWine.id });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("Vinho excluído!");
      qc.invalidateQueries({ queryKey: ["wines"] });
    } catch {
      toast.error("Erro ao excluir");
    } finally {
      setDeleting(false);
      setDeleteWine(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Vinhos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os vinhos da {winery.name}</p>
        </div>
        <button onClick={() => setFormWine(null)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Novo vinho
        </button>
      </div>

      {/* Location filter */}
      {locations.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
          <button onClick={() => setLocationFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${locationFilter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
            Todas
          </button>
          <button onClick={() => setLocationFilter("none")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${locationFilter === "none" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
            Sem unidade
          </button>
          {locations.map((loc) => (
            <button key={loc.id} onClick={() => setLocationFilter(loc.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${locationFilter === loc.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
              <MapPin className="w-3 h-3" /> {loc.name}
            </button>
          ))}
        </div>
      )}

      {/* Card layout for mobile-friendly display */}
      <div className="space-y-3">
        {wines?.filter((w) => {
          if (locationFilter === "all") return true;
          if (locationFilter === "none") return !(w as any).capture_point_id;
          return (w as any).capture_point_id === locationFilter;
        }).map((wine) => (
          <div key={wine.id} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {wine.image_url ? (
                  <img src={wine.image_url} alt={wine.name} className="w-full h-full object-cover" />
                ) : (
                  <WineIcon className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">{wine.name}</h3>
                <p className="text-[11px] text-muted-foreground">{wine.type} · R$ {Number(wine.price_bottle).toFixed(2)}</p>
                {(wine as any).capture_point_id && (
                  <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
                    <MapPin className="w-2.5 h-2.5" />
                    {locations.find(l => l.id === (wine as any).capture_point_id)?.name ?? "Unidade"}
                  </span>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  {[
                    { label: "Deg", active: wine.on_tasting },
                    { label: "Rest", active: wine.on_restaurant },
                    { label: "Loja", active: wine.on_shop },
                  ].map(({ label, active }) => (
                    <span key={label} className="flex items-center gap-1">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${active ? "bg-green-500" : "bg-border"}`} />
                      <span className="text-[10px] text-muted-foreground">{label}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setFormWine(wine)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => setDeleteWine(wine)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {(!wines || wines.length === 0) && (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <WineIcon className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum vinho cadastrado ainda.</p>
          </div>
        )}
      </div>

      {formWine !== undefined && (
        <WineFormModal wineryId={winery.id} adminId={admin.id} wine={formWine} locations={locations} onClose={() => setFormWine(undefined)} />
      )}

      {deleteWine && (
        <DeleteConfirmModal
          title="Excluir vinho"
          message={`Tem certeza que deseja excluir "${deleteWine.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteWine(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
