import { useState } from "react";
import { Star, X } from "lucide-react";
import type { Wine } from "@/hooks/useWinery";
import { useI18n } from "@/lib/i18n";

interface RatingModalProps {
  wine: Wine;
  onClose: () => void;
  onSubmit: (ratings: { acidity: number; body: number; sweetness: number }) => void;
}

function StarRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            onClick={() => onChange(i + 1)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`w-6 h-6 ${
                i < value
                  ? "fill-gold text-gold"
                  : "text-border"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RatingModal({ wine, onClose, onSubmit }: RatingModalProps) {
  const { t } = useI18n();
  const [acidity, setAcidity] = useState(3);
  const [body, setBody] = useState(3);
  const [sweetness, setSweetness] = useState(3);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold">{t("rating.rate_wine")}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-6">{wine.name}</p>

        <div className="space-y-4">
          <StarRow label={t("rating.acidity")} value={acidity} onChange={setAcidity} />
          <StarRow label={t("rating.body")} value={body} onChange={setBody} />
          <StarRow label={t("rating.sweetness")} value={sweetness} onChange={setSweetness} />
        </div>

        <button
          onClick={() => onSubmit({ acidity, body, sweetness })}
          className="w-full mt-6 bg-primary text-primary-foreground py-3 rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          {t("rating.submit")}
        </button>
      </div>
    </div>
  );
}
