import { useState } from "react";
import { X, Star } from "lucide-react";
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

function SensoryStarInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-14 text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <button key={i} type="button" onClick={() => onChange(i + 1)} className="transition-transform hover:scale-110">
            <Star className={`w-5 h-5 ${i < value ? "fill-gold text-gold" : "text-muted-foreground/30"}`} />
          </button>
        ))}
      </div>
      <span className="text-xs font-medium w-4 text-center text-muted-foreground">{value}</span>
    </div>
  );
}

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
    // Ficha Técnica fields
    grape: wine?.grape ?? "",
    region: wine?.region ?? "",
    alcohol_content: wine?.alcohol_content ?? "",
    serving_temp: wine?.serving_temp ?? "",
    aging: wine?.aging ?? "",
    enologist: wine?.enologist ?? "",
    year: wine?.year?.toString() ?? "",
    aromatic_notes: wine?.aromatic_notes?.join(", ") ?? "",
    harmonization: wine?.harmonization?.join(", ") ?? "",
  });

  const set = (key: string, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.price_bottle) {
      toast.error("Nome e preço são obrigatórios");
      return;
    }
    setLoading(true);
    try {
      const aromaticArr = form.aromatic_notes.split(",").map(s => s.trim()).filter(Boolean);
      const harmonizationArr = form.harmonization.split(",").map(s => s.trim()).filter(Boolean);

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
        grape: form.grape.trim() || null,
        region: form.region.trim() || null,
        alcohol_content: form.alcohol_content.trim() || null,
        serving_temp: form.serving_temp.trim() || null,
        aging: form.aging.trim() || null,
        enologist: form.enologist.trim() || null,
        year: form.year ? parseInt(form.year) : null,
        aromatic_notes: aromaticArr.length > 0 ? aromaticArr : null,
        harmonization: harmonizationArr.length > 0 ? harmonizationArr : null,
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
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
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

          {/* Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Safra (Ano)</label>
              <input type="number" value={form.year} onChange={(e) => set("year", e.target.value)} placeholder="2022"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Uva</label>
              <input value={form.grape} onChange={(e) => set("grape", e.target.value)} placeholder="Cabernet Sauvignon" maxLength={100}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          {/* Region & Alcohol */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Região</label>
              <input value={form.region} onChange={(e) => set("region", e.target.value)} placeholder="São Roque, SP" maxLength={100}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Teor Alcoólico</label>
              <input value={form.alcohol_content} onChange={(e) => set("alcohol_content", e.target.value)} placeholder="12.5%" maxLength={20}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          {/* Temp & Aging */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Temperatura de Serviço</label>
              <input value={form.serving_temp} onChange={(e) => set("serving_temp", e.target.value)} placeholder="16-18°C" maxLength={20}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Envelhecimento</label>
              <input value={form.aging} onChange={(e) => set("aging", e.target.value)} placeholder="12 meses em carvalho" maxLength={100}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          {/* Enologist */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Enólogo</label>
            <input value={form.enologist} onChange={(e) => set("enologist", e.target.value)} placeholder="Nome do enólogo" maxLength={100}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Descrição</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} maxLength={500}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>

          {/* Aromatic notes */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Notas Aromáticas (separar por vírgula)</label>
            <input value={form.aromatic_notes} onChange={(e) => set("aromatic_notes", e.target.value)} placeholder="Frutas vermelhas, Baunilha, Especiarias" maxLength={300}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>

          {/* Harmonization */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Harmonização (separar por vírgula)</label>
            <input value={form.harmonization} onChange={(e) => set("harmonization", e.target.value)} placeholder="Carnes vermelhas, Queijos maturados" maxLength={300}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>

          {/* Sensory - Stars */}
          <div>
            <label className="text-xs text-muted-foreground block mb-2">Perfil Sensorial</label>
            <div className="space-y-2">
              <SensoryStarInput label="Acidez" value={form.sensory_acidity} onChange={(v) => set("sensory_acidity", v)} />
              <SensoryStarInput label="Corpo" value={form.sensory_body} onChange={(v) => set("sensory_body", v)} />
              <SensoryStarInput label="Doçura" value={form.sensory_sweetness} onChange={(v) => set("sensory_sweetness", v)} />
            </div>
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
