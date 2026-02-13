import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { TastingPackage, Wine } from "@/hooks/useWinery";

interface PackageFormModalProps {
  wineryId: string;
  pkg?: TastingPackage | null;
  wines: Wine[];
  onClose: () => void;
}

export default function PackageFormModal({ wineryId, pkg, wines, onClose }: PackageFormModalProps) {
  const qc = useQueryClient();
  const isEdit = !!pkg;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: pkg?.name ?? "",
    price: pkg?.price?.toString() ?? "",
    description: pkg?.description ?? "",
    wine_ids: new Set<string>(pkg?.wine_ids ?? []),
  });

  const toggleWine = (id: string) => {
    setForm((f) => {
      const next = new Set(f.wine_ids);
      next.has(id) ? next.delete(id) : next.add(id);
      return { ...f, wine_ids: next };
    });
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.price) {
      toast.error("Nome e preço são obrigatórios");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        winery_id: wineryId,
        name: form.name.trim(),
        price: parseFloat(form.price),
        description: form.description.trim() || null,
        wine_ids: Array.from(form.wine_ids),
      };

      if (isEdit) {
        const { error } = await supabase.from("tasting_packages").update(payload).eq("id", pkg!.id);
        if (error) throw error;
        toast.success("Pacote atualizado!");
      } else {
        const { error } = await supabase.from("tasting_packages").insert(payload);
        if (error) throw error;
        toast.success("Pacote criado!");
      }
      qc.invalidateQueries({ queryKey: ["tasting_packages"] });
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar pacote");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md mx-4 rounded-2xl border border-border max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card rounded-t-2xl">
          <h2 className="font-display text-lg font-semibold">{isEdit ? "Editar Pacote" : "Novo Pacote"}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Nome *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={200}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Preço *</label>
            <input type="number" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Descrição</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} maxLength={500}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-2">Vinhos incluídos</label>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {wines.filter((w) => w.on_tasting).map((w) => (
                <label key={w.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary cursor-pointer">
                  <input type="checkbox" checked={form.wine_ids.has(w.id)} onChange={() => toggleWine(w.id)}
                    className="rounded border-border accent-primary" />
                  <span className="text-sm">{w.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border border-border hover:bg-secondary transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading}
            className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            {loading ? "Salvando..." : isEdit ? "Salvar" : "Criar Pacote"}
          </button>
        </div>
      </div>
    </div>
  );
}
