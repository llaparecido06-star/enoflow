import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useTastingPackages, useWines, type Winery, type TastingPackage } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { Package, Plus, Pencil, Trash2 } from "lucide-react";
import PackageFormModal from "@/components/admin/PackageFormModal";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminPackagesPage() {
  const { winery, admin } = useOutletContext<{ winery: Winery; admin: AdminUser }>();
  const { data: packages } = useTastingPackages(winery.id);
  const { data: wines } = useWines(winery.id);
  const [formPkg, setFormPkg] = useState<TastingPackage | null | undefined>(undefined);
  const [deletePkg, setDeletePkg] = useState<TastingPackage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const qc = useQueryClient();

  const handleDelete = async () => {
    if (!deletePkg) return;
    setDeleting(true);
    try {
      const { data, error } = await invokeAuth("admin-packages", {
        action: "delete",
        package_id: deletePkg.id,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Pacote excluído!");
      qc.invalidateQueries({ queryKey: ["tasting_packages"] });
    } catch {
      toast.error("Erro ao excluir");
    } finally {
      setDeleting(false);
      setDeletePkg(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="admin-page-title flex items-center gap-2"><Package className="w-7 h-7 text-primary" />Pacotes de Degustação</h1>
          <p className="text-sm text-muted-foreground mt-1">Crie experiências de degustação</p>
        </div>
        <button onClick={() => setFormPkg(null)}
          className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium shadow-card hover:shadow-elevated hover:scale-[1.02] active:scale-95 transition-all">
          <Plus className="w-4 h-4" /> Novo pacote
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {packages?.map((pkg) => (
          <div key={pkg.id} className="admin-card admin-card-hover p-4 group">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center ring-1 ring-gold/20 shrink-0">
                  <Package className="w-5 h-5 text-gold" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-sm font-semibold truncate">{pkg.name}</h3>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {pkg.wine_ids.length} vinho{pkg.wine_ids.length !== 1 ? "s" : ""}{pkg.description ? ` · ${pkg.description}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="font-display text-lg font-bold text-primary mr-1">R$ {Number(pkg.price).toFixed(0)}</span>
                <button onClick={() => setFormPkg(pkg)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => setDeletePkg(pkg)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {(!packages || packages.length === 0) && (
          <div className="admin-card p-10 text-center md:col-span-2">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum pacote criado ainda.</p>
          </div>
        )}
      </div>

      {formPkg !== undefined && (
        <PackageFormModal wineryId={winery.id} adminId={admin.id} pkg={formPkg} wines={wines ?? []} onClose={() => setFormPkg(undefined)} />
      )}

      {deletePkg && (
        <DeleteConfirmModal
          title="Excluir pacote"
          message={`Tem certeza que deseja excluir "${deletePkg.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeletePkg(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
