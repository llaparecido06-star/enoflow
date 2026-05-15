import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export interface QuizQuestion {
  id: string;
  emoji: string;
  question: string;
  options: { label: string; emoji: string; value: string }[];
}

export interface QuizAnswerEntry {
  question_id: string;
  question: string;
  value: string;
}

interface QuizSommelierProps {
  wineryColor: string;
  questions?: QuizQuestion[];
  onComplete: (preferences: string, answers: QuizAnswerEntry[]) => void;
  onSkip: () => void;
}

const DEFAULT_QUESTIONS_KEYS = [
  {
    id: "type",
    emoji: "🍷",
    questionKey: "quiz.q_type",
    options: [
      { labelKey: "quiz.opt_red", emoji: "🍷", value: "Tinto" },
      { labelKey: "quiz.opt_white", emoji: "🥂", value: "Branco" },
      { labelKey: "quiz.opt_rose", emoji: "🌸", value: "Rosé" },
      { labelKey: "quiz.opt_sparkling", emoji: "🍾", value: "Espumante" },
    ],
  },
  {
    id: "sweetness",
    emoji: "🍬",
    questionKey: "quiz.q_sweetness",
    options: [
      { labelKey: "quiz.opt_dry", emoji: "🌵", value: "Seco" },
      { labelKey: "quiz.opt_semi_dry", emoji: "🌤️", value: "Meio-seco" },
      { labelKey: "quiz.opt_smooth", emoji: "🌺", value: "Suave" },
      { labelKey: "quiz.opt_sweet", emoji: "🍯", value: "Doce" },
    ],
  },
  {
    id: "body",
    emoji: "💪",
    questionKey: "quiz.q_body",
    options: [
      { labelKey: "quiz.opt_light", emoji: "🪶", value: "Leve" },
      { labelKey: "quiz.opt_medium", emoji: "⚖️", value: "Médio" },
      { labelKey: "quiz.opt_full", emoji: "🏋️", value: "Encorpado" },
    ],
  },
];

export default function QuizSommelier({ wineryColor, questions: customQuestions, onComplete, onSkip }: QuizSommelierProps) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [direction, setDirection] = useState(1);

  const questions: QuizQuestion[] = (customQuestions && customQuestions.length > 0)
    ? customQuestions
    : DEFAULT_QUESTIONS_KEYS.map((q) => ({
        id: q.id,
        emoji: q.emoji,
        question: t(q.questionKey),
        options: q.options.map((o) => ({ label: t(o.labelKey), emoji: o.emoji, value: o.value })),
      }));

  const handleAnswer = (value: string) => {
    setSelectedValue(value);
    const next = [...answers, value];
    if (step < questions.length - 1) {
      setTimeout(() => {
        setAnswers(next);
        setSelectedValue(null);
        setDirection(1);
        setStep(step + 1);
      }, 300);
    } else {
      // Last question: complete immediately to avoid delay
      setSelectedValue(null);
      onComplete(next.join(", "));
    }
  };

  const q = questions[step];
  const progress = ((step + 1) / questions.length) * 100;

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0, scale: 0.95 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0, scale: 0.95 }),
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <motion.div
            className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-primary/10"
            animate={{ rotate: [0, -5, 5, -3, 3, 0] }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Sparkles className="w-8 h-8 text-primary" />
          </motion.div>
          <h1 className="font-display text-xl font-bold text-foreground">{t("quiz.title")}</h1>
          <p className="text-xs text-muted-foreground mt-1">{t("quiz.discover")}</p>
        </motion.div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-5">
          {questions.map((_, i) => (
            <motion.div key={i} className="relative flex items-center justify-center" initial={false}>
              <motion.div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors"
                animate={{
                  borderColor: i <= step ? wineryColor : "hsl(var(--border))",
                  backgroundColor: i < step ? wineryColor : "transparent",
                  color: i < step ? "#fff" : i === step ? wineryColor : "hsl(var(--muted-foreground))",
                }}
                transition={{ duration: 0.3 }}
              >
                {i < step ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
                    <Check className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <span>{questions[i].emoji}</span>
                )}
              </motion.div>
              {i < questions.length - 1 && (
                <motion.div
                  className="absolute left-full top-1/2 -translate-y-1/2 w-4 h-0.5 rounded-full"
                  animate={{ backgroundColor: i < step ? wineryColor : "hsl(var(--border))" }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </motion.div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-secondary rounded-full mb-6 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: wineryColor }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* Question card */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <motion.p
              className="text-sm font-medium text-foreground mb-5 text-center"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {q.question}
            </motion.p>

            <div className="space-y-2.5">
              {q.options.map((opt, i) => {
                const isSelected = selectedValue === opt.value;
                return (
                  <motion.button
                    key={opt.value}
                    onClick={() => !selectedValue && handleAnswer(opt.value)}
                    disabled={!!selectedValue}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i + 0.15, duration: 0.25 }}
                    whileHover={!selectedValue ? { scale: 1.02, x: 4 } : {}}
                    whileTap={!selectedValue ? { scale: 0.98 } : {}}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all border ${
                      isSelected
                        ? "border-primary bg-primary/10 text-foreground shadow-md"
                        : selectedValue
                          ? "border-border bg-card/50 text-muted-foreground opacity-50"
                          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    <motion.span
                      className="text-lg"
                      animate={isSelected ? { scale: [1, 1.3, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      {opt.emoji}
                    </motion.span>
                    <span className="flex-1 text-left">{opt.label}</span>
                    {isSelected ? (
                      <motion.div
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <Check className="w-4 h-4 text-primary" />
                      </motion.div>
                    ) : (
                      <ArrowRight className="w-4 h-4 text-muted-foreground/40" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        <motion.button
          onClick={onSkip}
          className="w-full mt-6 text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02 }}
        >
          {t("quiz.skip")}
        </motion.button>
      </motion.div>
    </div>
  );
}
