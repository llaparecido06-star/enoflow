import { useEffect, useState } from "react";
import { X, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { invokeAuth } from "@/lib/auth-api";
import { supabase } from "@/integrations/supabase/client";
import type { Wine, Winery } from "@/hooks/useWinery";
import { useQueryClient } from "@tanstack/react-query";

type Lang = "en" | "es";
type Fields = { name: string; description: string };

const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

export default function WineTranslationsDrawer({
  wine,
  winery,
  onClose,
}: {
  wine: Wine;
  winery: Winery;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [active, setActive] = useState<Lang>("en");
  const [values, setValues] = useState<Record<Lang, Fields>>({
    en: { name: "", description: "" },
    es: { name: "", description: "" },
  });
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    const t = (wine as any).translations ?? {};
    setValues({
      en: { name: t.en?.name ?? "", description: t.en?.description ?? "" },
      es: { name: t.es?.name ?? "", description: t.es?.description ?? "" },
    });
  }, [wine.id]);

  const handleAutoTranslate = async () => {
    setTranslating(true);
    try {
      const texts = [wine.name, (wine as any).description ?? ""];
      const targetLang = active === "en" ? "English" : "Spanish";
      const { data, error } = await supabase.functions.invoke("translate-content", {
        body: { texts, targetLang },
      });
      if (error) throw error;
      const out: string[] = data?.translations ?? [];
      setValues((prev) => ({
        ...prev,
        [active]: { name: out[0] ?? prev[active].name, description: out[1] ?? prev[active].description },
      }));
      toast.success("Tradução sugerida pela IA");
    } catch {
      toast.error("Erro ao traduzir");
    } finally {
      setTranslating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const translations: Record<string, Fields> = {};
      for (const l of ["en", "es"] as Lang[]) {
        const v = values[l];
        if (v.name.trim() || v.description.trim()) translations[l] = v;
      }
      const res = await invokeAuth("admin-wines", {
        action: "set_translations",
        wine_id: wine.id,
        translations,
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("Traduções salvas!");
      qc.invalidateQueries({ queryKey: ["wines"] });
      onClose();
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl border-t sm:border border-border max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Traduções</h2>
            <p className="text-xs text-muted-foreground truncate">{wine.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-1 p-3 border-b border-border">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setActive(l.code)}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                active === l.code ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div className="bg-secondary/40 rounded-lg p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Original (PT-BR)</p>
            <p><span className="font-medium">Nome:</span> {wine.name}</p>
            {(wine as any).description && (
              <p className="mt-1 line-clamp-3"><span className="font-medium">Descrição:</span> {(wine as any).description}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">Nome ({active.toUpperCase()})</label>
            <input
              type="text"
              value={values[active].name}
              onChange={(e) => setValues({ ...values, [active]: { ...values[active], name: e.target.value } })}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              placeholder={`Nome em ${active === "en" ? "inglês" : "espanhol"}`}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">Descrição ({active.toUpperCase()})</label>
            <textarea
              rows={5}
              value={values[active].description}
              onChange={(e) => setValues({ ...values, [active]: { ...values[active], description: e.target.value } })}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none"
              placeholder="Descrição traduzida"
            />
          </div>

          <button
            onClick={handleAutoTranslate}
            disabled={translating}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-primary/30 text-primary text-xs font-medium hover:bg-primary/5 disabled:opacity-60"
          >
            {translating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Sugerir com IA
          </button>
        </div>

        <div className="p-4 border-t border-border flex items-center gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
