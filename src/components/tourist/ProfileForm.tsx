import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Wallet, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProfileFormProps {
  wineryColor: string;
  onComplete: (data: { birth_date?: string; income_class?: string }) => Promise<void>;
  onSkip: () => void;
}

const incomeOptions = [
  { label: "Até R$ 3.000", value: "ate_3k" },
  { label: "R$ 3.000 – R$ 8.000", value: "3k_8k" },
  { label: "R$ 8.000 – R$ 15.000", value: "8k_15k" },
  { label: "Acima de R$ 15.000", value: "acima_15k" },
];

export default function ProfileForm({ wineryColor, onComplete, onSkip }: ProfileFormProps) {
  const [birthDate, setBirthDate] = useState("");
  const [incomeClass, setIncomeClass] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!birthDate) {
      toast.error("Data de nascimento é obrigatória");
      return;
    }
    setLoading(true);
    try {
      await onComplete({
        birth_date: birthDate,
        income_class: incomeClass || undefined,
      });
    } catch {
      toast.error("Erro ao salvar dados");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border p-6 space-y-5"
    >
      <div className="text-center">
        <h2 className="font-display text-base font-bold text-foreground">Quase lá! 🎉</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Complete seu perfil para receber ofertas personalizadas (opcional)
        </p>
      </div>

      {/* Birth date */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-1.5">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          Data de Nascimento <span className="text-destructive">*</span>
        </label>
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          min="1920-01-01"
          className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Income */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-1.5">
          <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
          Faixa de Renda
        </label>
        <div className="grid grid-cols-2 gap-2">
          {incomeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setIncomeClass(incomeClass === opt.value ? "" : opt.value)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                incomeClass === opt.value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/30"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onSkip}
          className="flex-1 px-4 py-3 rounded-xl text-sm border border-border hover:bg-secondary transition-colors"
        >
          Pular
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-primary-foreground transition-colors disabled:opacity-50"
          style={{ backgroundColor: wineryColor }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <>Continuar <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </motion.div>
  );
}
