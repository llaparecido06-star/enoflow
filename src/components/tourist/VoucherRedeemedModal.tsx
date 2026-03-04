import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, ArrowRight, PartyPopper } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import Confetti from "./Confetti";

interface Props {
  total: number;
  currency: string;
  onClose: () => void;
}

export default function VoucherRedeemedModal({ total, currency, onClose }: Props) {
  const [step, setStep] = useState<"confirmed" | "payment">("confirmed");

  useEffect(() => {
    const timer = setTimeout(() => setStep("payment"), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-md p-6"
    >
      <Confetti />
      <AnimatePresence mode="wait">
        {step === "confirmed" ? (
          <motion.div
            key="confirmed"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className="bg-card rounded-2xl border border-border/30 p-8 text-center max-w-sm w-full shadow-2xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", damping: 12 }}
            >
              <CheckCircle className="w-20 h-20 mx-auto text-green-500 mb-4" />
            </motion.div>
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="font-display text-2xl font-bold text-foreground mb-2"
            >
              Compra confirmada! ✅
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-sm text-muted-foreground"
            >
              Seu voucher foi validado com sucesso
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="payment"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className="bg-card rounded-2xl border border-border/30 p-8 text-center max-w-sm w-full shadow-2xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", damping: 12 }}
              className="w-16 h-16 mx-auto rounded-full bg-gold/10 flex items-center justify-center mb-4"
            >
              <ArrowRight className="w-8 h-8 text-gold" />
            </motion.div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">
              Dirija-se ao caixa
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Efetue o pagamento diretamente no caixa
            </p>
            <div className="bg-muted/30 rounded-xl p-4 mb-6">
              <p className="text-[11px] text-muted-foreground mb-1">Total a pagar</p>
              <p className="font-display text-2xl font-bold text-gold">
                {formatCurrency(total, currency)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full bg-gold text-gold-foreground py-3 rounded-xl text-sm font-medium hover:bg-gold/90 transition-colors"
            >
              Entendi
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
