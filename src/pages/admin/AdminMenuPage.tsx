import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useWines, type Winery } from "@/hooks/useWinery";
import { useMenuItems, type MenuItem } from "@/hooks/useMenuItems";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { UtensilsCrossed, Plus, Pencil, Trash2, Wine } from "lucide-react";
import MenuItemFormModal from "@/components/admin/MenuItemFormModal";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminMenuPage() {
  const { winery, admin } = useOutletContext<{ winery: Winery; admin: AdminUser }>();
  const { data: menuItems } = useMenuItems(winery.id);
  const { data: wines } = useWines(winery.id);
  const [formItem, setFormItem] = useState<MenuItem | null | undefined>(undefined);
  const [deleteItem, setDeleteItem] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const qc = useQueryClient();

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const res = await supabase.functions.invoke("admin-menu", {
        body: { action: "delete", admin_id: admin.id, winery_id: winery.id, item_id: deleteItem.id },
      });
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

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Item</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Categoria</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Preço</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Vinho sugerido</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {menuItems?.map((item) => {
              const suggestedWine = item.suggested_wine_id ? wineMap.get(item.suggested_wine_id) : undefined;
              return (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                        <UtensilsCrossed className="w-4 h-4 text-gold" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-foreground truncate max-w-[200px] block">{item.name}</span>
                        <span className="text-[10px] text-muted-foreground sm:hidden">{item.category}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{item.category}</td>
                  <td className="px-4 py-3 text-sm text-foreground hidden md:table-cell">R$ {Number(item.price).toFixed(2)}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {suggestedWine ? (
                      <div className="flex items-center gap-1.5">
                        <Wine className="w-3 h-3 text-wine-light" />
                        <span className="text-xs text-muted-foreground truncate max-w-[150px]">{suggestedWine.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setFormItem(item)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => setDeleteItem(item)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {(!menuItems || menuItems.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhum item no cardápio ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {formItem !== undefined && (
        <MenuItemFormModal
          wineryId={winery.id}
          adminId={admin.id}
          item={formItem}
          wines={wines ?? []}
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
