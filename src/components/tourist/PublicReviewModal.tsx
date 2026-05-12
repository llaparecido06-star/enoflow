import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Send, X } from "lucide-react";

interface Props {
  wineName: string;
  onSubmit: (stars: number, comment: string) => void;
  onClose: () => void;
}

export default function PublicReviewModal({ wineName, onSubmit, onClose }: Props) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        className="bg-card w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 luxury-shadow"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">Avaliar este vinho</h3>
            <p className="text-xs text-muted-foreground truncate max-w-[260px]">{wineName}</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="p-1.5 rounded-lg hover:bg-muted">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex justify-center gap-1.5 my-5">
          {Array.from({ length: 5 }).map((_, i) => {
            const filled = i < stars;
            return (
              <button
                key={i}
                onClick={() => setStars(i + 1)}
                aria-label={`${i + 1} estrelas`}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star className={`w-8 h-8 ${filled ? "fill-gold text-gold" : "text-border"}`} />
              </button>
            );
          })}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 500))}
          placeholder="Conte sobre sua experiência (opcional)…"
          rows={3}
          maxLength={500}
          className="w-full mb-4 rounded-xl border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm border border-border text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => stars > 0 && onSubmit(stars, comment.trim())}
            disabled={stars === 0}
            className="flex-1 py-2.5 rounded-xl text-sm bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Send className="w-3.5 h-3.5" /> Enviar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
