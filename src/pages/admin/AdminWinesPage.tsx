import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useWines, type Winery, type Wine } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { Wine as WineIcon, Plus, Pencil, Trash2 } from "lucide-react";
import WineFormModal from "@/components/admin/WineFormModal";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminWinesPage() {
  const { winery, admin } = useOutletContext<{ winery: Winery; admin: AdminUser }>();
  const { data: wines } = useWines(winery.id);
  const [formWine, setFormWine] = useState<Wine | null | undefined>(undefined); // undefined = closed, null = new, Wine = edit
  const [deleteWine, setDeleteWine] = useState<Wine | null>(null);
  const [deleting, setDeleting] = useState(false);
  const qc = useQueryClient();

  const handleDelete = async () => {
    if (!deleteWine) return;
    setDeleting(true);
    try {
      const res = await supabase.functions.invoke("admin-wines", {
        body: { action: "delete", admin_id: admin.id, winery_id: winery.id, wine_id: deleteWine.id },
      });
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

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Vinho</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Preço</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Deg.</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Rest.</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Loja</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {wines?.map((wine) => (
              <tr key={wine.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <WineIcon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{wine.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{wine.type}</td>
                <td className="px-4 py-3 text-sm text-foreground hidden md:table-cell">R$ {Number(wine.price_bottle).toFixed(2)}</td>
                <td className="px-4 py-3 text-center"><span className={`inline-block w-2 h-2 rounded-full ${wine.on_tasting ? "bg-green-500" : "bg-border"}`} /></td>
                <td className="px-4 py-3 text-center hidden sm:table-cell"><span className={`inline-block w-2 h-2 rounded-full ${wine.on_restaurant ? "bg-green-500" : "bg-border"}`} /></td>
                <td className="px-4 py-3 text-center hidden sm:table-cell"><span className={`inline-block w-2 h-2 rounded-full ${wine.on_shop ? "bg-green-500" : "bg-border"}`} /></td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => setFormWine(wine)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => setDeleteWine(wine)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formWine !== undefined && (
        <WineFormModal wineryId={winery.id} adminId={admin.id} wine={formWine} onClose={() => setFormWine(undefined)} />
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
