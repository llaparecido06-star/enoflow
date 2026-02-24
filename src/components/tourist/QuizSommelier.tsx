import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wine, ArrowRight, Sparkles } from "lucide-react";

interface QuizSommelierProps {
  wineryColor: string;
  onComplete: (preferences: string) => void;
  onSkip: () => void;
}

const questions = [
  {
    id: "type",
    question: "Qual tipo de vinho você prefere?",
    options: [
      { label: "🍷 Tinto", value: "Tinto" },
      { label: "🥂 Branco", value: "Branco" },
      { label: "🌸 Rosé", value: "Rosé" },
      { label: "🍾 Espumante", value: "Espumante" },
    ],
  },
  {
    id: "sweetness",
    question: "Qual o nível de doçura que agrada mais?",
    options: [
      { label: "Seco", value: "Seco" },
      { label: "Meio-seco", value: "Meio-seco" },
      { label: "Suave", value: "Suave" },
      { label: "Doce", value: "Doce" },
    ],
  },
  {
    id: "body",
    question: "Como você gosta do corpo do vinho?",
    options: [
      { label: "Leve", value: "Leve" },
      { label: "Médio", value: "Médio" },
      { label: "Encorpado", value: "Encorpado" },
    ],
  },
];

export default function QuizSommelier({ wineryColor, onComplete, onSkip }: QuizSommelierProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);

  const handleAnswer = (value: string) => {
    const next = [...answers, value];
    setAnswers(next);
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      onComplete(next.join(", "));
    }
  };

  const q = questions[step];
  const progress = ((step + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-primary/10">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-display text-lg font-bold text-foreground">Quiz Sommelier</h1>
          <p className="text-xs text-muted-foreground mt-1">Descubra seus vinhos ideais</p>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-secondary rounded-full mb-6 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: wineryColor }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <p className="text-sm font-medium text-foreground mb-4 text-center">{q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleAnswer(opt.value)}
                  className="w-full flex items-center justify-between px-4 py-3.5 bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  {opt.label}
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          onClick={onSkip}
          className="w-full mt-6 text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
        >
          Pular quiz →
        </button>
      </div>
    </div>
  );
}
