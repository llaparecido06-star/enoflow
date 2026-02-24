import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Send, X } from "lucide-react";

interface NpsModalProps {
  onSubmit: (score: number) => void;
  onSkip: () => void;
}

export default function NpsModal({ onSubmit, onSkip }: NpsModalProps) {
  const [score, setScore] = useState<number | null>(null);

  const labels = ["😡", "😞", "😕", "😐", "😐", "🙂", "🙂", "😊", "😄", "🤩", "🥳"];
  const colors = [
    "bg-destructive", "bg-destructive", "bg-destructive/80",
    "bg-orange-500", "bg-orange-400", "bg-yellow-500",
    "bg-yellow-400", "bg-green-400", "bg-green-500",
    "bg-green-600", "bg-green-700",
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-card w-full max-w-sm mx-4 rounded-2xl border border-border/30 p-6 luxury-shadow"
      >
        <button onClick={onSkip} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="text-center mb-5">
          <Star className="w-8 h-8 text-gold mx-auto mb-2" />
          <h2 className="font-display text-lg font-bold text-foreground">Como foi sua experiência?</h2>
          <p className="text-xs text-muted-foreground mt-1">
            De 0 a 10, o quanto você recomendaria esta vinícola?
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {Array.from({ length: 11 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setScore(i)}
              className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                score === i
                  ? `${colors[i]} text-white scale-110 ring-2 ring-gold/50`
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {i}
            </button>
          ))}
        </div>

        {score !== null && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-4"
          >
            <span className="text-3xl">{labels[score]}</span>
          </motion.div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onSkip}
            className="flex-1 py-2.5 rounded-xl text-sm border border-border text-muted-foreground hover:bg-muted transition-colors"
          >
            Pular
          </button>
          <button
            onClick={() => score !== null && onSubmit(score)}
            disabled={score === null}
            className="flex-1 py-2.5 rounded-xl text-sm bg-gold text-gold-foreground font-medium hover:bg-gold/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            Enviar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
