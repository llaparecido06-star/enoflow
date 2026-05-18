import { Sparkles, X, UtensilsCrossed } from "lucide-react";

interface Pairing { dish: string; reason: string }

interface PairingModalProps {
  wineName: string;
  pairings: Pairing[];
  loading: boolean;
  onClose: () => void;
}

export default function PairingModal({ wineName, pairings, loading, onClose }: PairingModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" />
            <h3 className="font-display text-lg font-semibold">Harmonizações para você</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-5">{wineName}</p>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : pairings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Não foi possível gerar sugestões agora.
          </p>
        ) : (
          <ul className="space-y-3">
            {pairings.map((p, i) => (
              <li key={i} className="flex gap-3 bg-muted/30 rounded-xl p-3">
                <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <UtensilsCrossed className="w-4 h-4 text-gold" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{p.dish}</p>
                  <p className="text-xs text-muted-foreground italic mt-0.5">"{p.reason}"</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={onClose}
          className="w-full mt-6 bg-primary text-primary-foreground py-3 rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
