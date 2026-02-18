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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Pacotes de Degustação</h1>
          <p className="text-sm text-muted-foreground">Crie experiências de degustação</p>
        </div>
        <button onClick={() => setFormPkg(null)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Novo pacote
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
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold text-foreground">R$ {Number(pkg.price).toFixed(2)}</span>
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
          <div className="bg-card rounded-xl border border-border p-8 text-center">
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
