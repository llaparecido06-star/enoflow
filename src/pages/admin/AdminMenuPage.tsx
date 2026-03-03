import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useWines, type Winery } from "@/hooks/useWinery";
import { useMenuItems, type MenuItem } from "@/hooks/useMenuItems";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { UtensilsCrossed, Plus, Pencil, Trash2, Wine, MapPin } from "lucide-react";
import MenuItemFormModal from "@/components/admin/MenuItemFormModal";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";

export default function AdminMenuPage() {
  const { winery, admin } = useOutletContext<{ winery: Winery; admin: AdminUser }>();
  const { data: menuItems } = useMenuItems(winery.id);
  const { data: wines } = useWines(winery.id);
  const { data: locations = [] } = useQuery<{ id: string; name: string; category: string }[]>({
    queryKey: ["capture-points", winery.id],
    queryFn: async () => {
      const res = await invokeAuth("admin-locations", { action: "list" });
      if (res.error) throw res.error;
      return (res.data?.locations ?? []).filter((l: any) => l.category === "restaurant");
    },
  });
  const [formItem, setFormItem] = useState<MenuItem | null | undefined>(undefined);
  const [deleteItem, setDeleteItem] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const qc = useQueryClient();

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const res = await invokeAuth("admin-menu", { action: "delete", item_id: deleteItem.id });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("Item excluído!");
      qc.invalidateQueries({ queryKey: ["menu_items"] });
    } catch {
      toast.error("Erro ao excluir");
    } finally {
      setDeleting(false);
      setDeleteItem(null);
    }
  };

  const wineMap = new Map((wines ?? []).map((w) => [w.id, w]));
  const locMap = new Map(locations.map((l) => [l.id, l.name]));

  // Filter by location then group by category
  const filteredItems = (menuItems ?? []).filter(item => {
    if (locationFilter === "all") return true;
    if (locationFilter === "none") return !item.capture_point_id;
    return item.capture_point_id === locationFilter;
  });

  const grouped = filteredItems.reduce<Record<string, MenuItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Cardápio</h1>
          <p className="text-sm text-muted-foreground">Gerencie os pratos do restaurante</p>
        </div>
        <button onClick={() => setFormItem(null)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Novo item
        </button>
      </div>

      {/* Location filter */}
      {locations.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
          <button onClick={() => setLocationFilter("all")}
            className={`whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${locationFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}>
            Todas
          </button>
          {locations.map(loc => (
            <button key={loc.id} onClick={() => setLocationFilter(loc.id)}
              className={`whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${locationFilter === loc.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}>
              <MapPin className="w-3 h-3" /> {loc.name}
            </button>
          ))}
          <button onClick={() => setLocationFilter("none")}
            className={`whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${locationFilter === "none" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}>
            Sem local
          </button>
        </div>
      )}

      {/* Card layout grouped by category */}
      <div className="space-y-5">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{category}</h3>
            <div className="space-y-2">
              {items.map((item) => {
                const suggestedWine = item.suggested_wine_id ? wineMap.get(item.suggested_wine_id) : undefined;
                return (
                  <div key={item.id} className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <UtensilsCrossed className="w-5 h-5 text-gold" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-foreground truncate">{item.name}</h4>
                          {item.capture_point_id && locMap.get(item.capture_point_id) && (
                            <span className="text-[9px] font-medium bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                              <MapPin className="w-2.5 h-2.5" />
                              {locMap.get(item.capture_point_id)}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">R$ {Number(item.price).toFixed(2)}</p>
                        {suggestedWine && (
                          <div className="flex items-center gap-1 mt-1">
                            <Wine className="w-3 h-3 text-wine-light" />
                            <span className="text-[10px] text-muted-foreground truncate">{suggestedWine.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => setFormItem(item)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => setDeleteItem(item)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {(!menuItems || menuItems.length === 0) && (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <UtensilsCrossed className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum item no cardápio ainda.</p>
          </div>
        )}
      </div>

      {formItem !== undefined && (
        <MenuItemFormModal
          wineryId={winery.id}
          adminId={admin.id}
          item={formItem}
          wines={wines ?? []}
          locations={locations}
          onClose={() => setFormItem(undefined)}
        />
      )}

      {deleteItem && (
        <DeleteConfirmModal
          title="Excluir item"
          message={`Tem certeza que deseja excluir "${deleteItem.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteItem(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
