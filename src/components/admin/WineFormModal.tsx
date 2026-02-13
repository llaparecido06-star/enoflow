import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Wine } from "@/hooks/useWinery";

interface WineFormModalProps {
  wineryId: string;
  adminId: string;
  wine?: Wine | null;
  onClose: () => void;
}

const wineTypes = ["Tinto", "Branco", "Rosé", "Espumante"];

export default function WineFormModal({ wineryId, adminId, wine, onClose }: WineFormModalProps) {
  const qc = useQueryClient();
  const isEdit = !!wine;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: wine?.name ?? "",
    type: wine?.type ?? "Tinto",
    price_bottle: wine?.price_bottle?.toString() ?? "",
    price_glass: wine?.price_glass?.toString() ?? "",
    description: wine?.description ?? "",
    sensory_acidity: wine?.sensory_acidity ?? 3,
    sensory_body: wine?.sensory_body ?? 3,
    sensory_sweetness: wine?.sensory_sweetness ?? 3,
    on_tasting: wine?.on_tasting ?? false,
    on_restaurant: wine?.on_restaurant ?? false,
    on_shop: wine?.on_shop ?? true,
  });

  const set = (key: string, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.price_bottle) {
      toast.error("Nome e preço são obrigatórios");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        winery_id: wineryId,
        name: form.name.trim(),
        type: form.type,
        price_bottle: parseFloat(form.price_bottle),
        price_glass: form.price_glass ? parseFloat(form.price_glass) : null,
        description: form.description.trim() || null,
        sensory_acidity: form.sensory_acidity,
        sensory_body: form.sensory_body,
        sensory_sweetness: form.sensory_sweetness,
        on_tasting: form.on_tasting,
        on_restaurant: form.on_restaurant,
        on_shop: form.on_shop,
      };

      if (isEdit) {
        const res = await supabase.functions.invoke("admin-wines", {
          body: { action: "update", admin_id: adminId, winery_id: wineryId, wine_id: wine!.id, wine_data: payload },
        });
        if (res.error) throw res.error;
        if (res.data?.error) throw new Error(res.data.error);
        toast.success("Vinho atualizado!");
      } else {
        const res = await supabase.functions.invoke("admin-wines", {
          body: { action: "create", admin_id: adminId, winery_id: wineryId, wine_data: payload },
        });
        if (res.error) throw res.error;
        if (res.data?.error) throw new Error(res.data.error);
        toast.success("Vinho criado!");
      }
      qc.invalidateQueries({ queryKey: ["wines"] });
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar vinho");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
      <div className="bg-card w-full max-w-lg mx-4 rounded-2xl border border-border max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card rounded-t-2xl">
          <h2 className="font-display text-lg font-semibold">{isEdit ? "Editar Vinho" : "Novo Vinho"}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Nome *</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={200}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>

          {/* Type & Prices */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Tipo</label>
              <select value={form.type} onChange={(e) => set("type", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                {wineTypes.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Preço Garrafa *</label>
              <input type="number" step="0.01" value={form.price_bottle} onChange={(e) => set("price_bottle", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Preço Taça</label>
              <input type="number" step="0.01" value={form.price_glass} onChange={(e) => set("price_glass", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Descrição</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} maxLength={500}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>

          {/* Sensory sliders */}
          <div>
            <label className="text-xs text-muted-foreground block mb-2">Perfil Sensorial (1–5)</label>
            {(["sensory_acidity", "sensory_body", "sensory_sweetness"] as const).map((key) => {
              const labels: Record<string, string> = { sensory_acidity: "Acidez", sensory_body: "Corpo", sensory_sweetness: "Doçura" };
              return (
                <div key={key} className="flex items-center gap-3 mb-2">
                  <span className="text-xs w-14 text-muted-foreground">{labels[key]}</span>
                  <input type="range" min={1} max={5} value={form[key]}
                    onChange={(e) => set(key, parseInt(e.target.value))}
                    className="flex-1 accent-primary" />
                  <span className="text-xs font-medium w-4 text-center">{form[key]}</span>
                </div>
              );
            })}
          </div>

          {/* Availability toggles */}
          <div className="flex gap-4">
            {([["on_tasting", "Degustação"], ["on_restaurant", "Restaurante"], ["on_shop", "Loja"]] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form[key] as boolean} onChange={(e) => set(key, e.target.checked)}
                  className="rounded border-border accent-primary" />
                <span className="text-xs text-foreground">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-border flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border border-border hover:bg-secondary transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            {loading ? "Salvando..." : isEdit ? "Salvar" : "Criar Vinho"}
          </button>
        </div>
      </div>
    </div>
  );
}
