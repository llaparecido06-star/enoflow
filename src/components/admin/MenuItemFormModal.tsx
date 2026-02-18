import { useState } from "react";
import { X } from "lucide-react";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { MenuItem } from "@/hooks/useMenuItems";
import type { Wine } from "@/hooks/useWinery";

interface MenuItemFormModalProps {
  wineryId: string;
  adminId: string;
  item?: MenuItem | null;
  wines: Wine[];
  onClose: () => void;
}

const defaultCategories = ["Entradas", "Pratos Principais", "Sobremesas", "Bebidas"];

export default function MenuItemFormModal({ wineryId, adminId, item, wines, onClose }: MenuItemFormModalProps) {
  const qc = useQueryClient();
  const isEdit = !!item;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: item?.name ?? "",
    category: item?.category ?? "Entradas",
    price: item?.price?.toString() ?? "",
    description: item?.description ?? "",
    suggested_wine_id: item?.suggested_wine_id ?? "",
  });

  const set = (key: string, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.price) {
      toast.error("Nome e preço são obrigatórios");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        price: parseFloat(form.price),
        description: form.description.trim() || null,
        suggested_wine_id: form.suggested_wine_id || null,
      };

      const body = isEdit
        ? { action: "update", item_id: item!.id, item_data: payload }
        : { action: "create", item_data: payload };

      const res = await invokeAuth("admin-menu", body);
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(isEdit ? "Item atualizado!" : "Item criado!");
      qc.invalidateQueries({ queryKey: ["menu_items"] });
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
      <div className="bg-card w-full max-w-lg mx-4 rounded-2xl border border-border max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card rounded-t-2xl">
          <h2 className="font-display text-lg font-semibold">{isEdit ? "Editar Item" : "Novo Item"}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Nome *</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={200}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Categoria</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                {defaultCategories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Preço *</label>
              <input type="number" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Descrição</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} maxLength={500}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Vinho sugerido</label>
            <select value={form.suggested_wine_id} onChange={(e) => set("suggested_wine_id", e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">Nenhum</option>
              {wines.map((w) => (
                <option key={w.id} value={w.id}>{w.name} ({w.type})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-4 border-t border-border flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border border-border hover:bg-secondary transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            {loading ? "Salvando..." : isEdit ? "Salvar" : "Criar Item"}
          </button>
        </div>
      </div>
    </div>
  );
}
