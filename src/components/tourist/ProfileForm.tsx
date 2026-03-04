import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Wallet, ArrowRight, Loader2, Users, AlertTriangle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface ProfileFormProps {
  wineryColor: string;
  onComplete: (data: { birth_date?: string; income_class?: string; gender?: string }) => Promise<boolean | void>;
  onSkip: () => void;
}

export default function ProfileForm({ wineryColor, onComplete, onSkip }: ProfileFormProps) {
  const { t } = useI18n();
  const [birthDate, setBirthDate] = useState("");
  const [incomeClass, setIncomeClass] = useState("");
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(false);
  const [dateError, setDateError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const incomeOptions = [
    { label: t("profile.income_up_to_3k"), value: "ate_3k" },
    { label: t("profile.income_3k_8k"), value: "3k_8k" },
    { label: t("profile.income_8k_15k"), value: "8k_15k" },
    { label: t("profile.income_above_15k"), value: "acima_15k" },
  ];

  const genderOptions = [
    { label: t("profile.male"), value: "masculino" },
    { label: t("profile.female"), value: "feminino" },
    { label: t("profile.prefer_not_say"), value: "nao_informar" },
  ];

  const validateBirthDate = (value: string): { isoDate: string | null; error: string } => {
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = value.match(dateRegex);
    if (!match) return { isoDate: null, error: "Formato inválido. Use DD/MM/AAAA." };

    const [, dd, mm, yyyy] = match;
    const day = Number(dd);
    const month = Number(mm);
    const year = Number(yyyy);

    const parsed = new Date(Date.UTC(year, month - 1, day));
    const validExactDate =
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day;

    const today = new Date();
    const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

    if (!validExactDate || parsed.getTime() > todayUtc || year < 1920) {
      return { isoDate: null, error: "Data inválida. Verifique dia, mês e ano." };
    }

    return { isoDate: `${yyyy}-${mm}-${dd}`, error: "" };
  };

  const handleSubmit = async () => {
    if (dateError) return;

    const { isoDate, error } = validateBirthDate(birthDate);
    if (!isoDate) {
      setDateError(error);
      return;
    }

    setLoading(true);
    setSubmitError("");
    try {
      await onComplete({
        birth_date: isoDate,
        income_class: incomeClass || undefined,
        gender: gender || undefined,
      });
    } catch {
      setSubmitError("Não foi possível gerar o voucher. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setSubmitError("");
    handleSubmit();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border p-6 space-y-5"
    >
      <div className="text-center">
        <h2 className="font-display text-base font-bold text-foreground">{t("profile.almost_there")}</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {t("profile.fill_data")}
        </p>
      </div>

      {/* Birth date */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-1.5">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          {t("profile.birth_date")} <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="DD/MM/AAAA"
          value={birthDate}
          onChange={(e) => {
            let v = e.target.value.replace(/\D/g, "");
            if (v.length > 8) v = v.slice(0, 8);
            if (v.length >= 5) v = v.slice(0, 2) + "/" + v.slice(2, 4) + "/" + v.slice(4);
            else if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
            setBirthDate(v);
            if (v.length === 10) {
              const { error } = validateBirthDate(v);
              setDateError(error);
            } else {
              setDateError("");
            }
          }}
          maxLength={10}
          className={`w-full px-3 py-2.5 bg-background border rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors ${
            dateError ? "border-destructive focus:ring-destructive/20" : "border-border focus:ring-primary/20"
          }`}
        />
        {dateError && (
          <p className="text-[11px] text-destructive mt-1">{dateError}</p>
        )}
      </div>

      {/* Gender */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-1.5">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          {t("profile.gender")}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {genderOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setGender(gender === opt.value ? "" : opt.value)}
              className={`px-2 py-2 rounded-xl text-xs font-medium border transition-all ${
                gender === opt.value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/30"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Income */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-1.5">
          <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
          {t("profile.income_range")}
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

      {/* Inline error with retry */}
      <AnimatePresence>
        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3"
          >
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[11px] text-destructive font-medium">{submitError}</p>
              <button
                onClick={handleRetry}
                disabled={loading}
                className="flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-destructive hover:underline"
              >
                <RotateCcw className="w-3 h-3" />
                Tentar novamente
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onSkip}
          className="flex-1 px-4 py-3 rounded-xl text-sm border border-border hover:bg-secondary transition-colors"
        >
          {t("profile.back")}
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !birthDate || birthDate.length !== 10 || !!dateError}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-primary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: wineryColor }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <>{t("profile.generate_voucher")} <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </motion.div>
  );
}
