import { motion } from "framer-motion";
import { Wine } from "lucide-react";
import tastingBg from "@/assets/tasting-welcome-bg.jpg";

interface TastingWelcomeProps {
  wineryName: string;
  wineryLogo?: string | null;
  wineCount: number;
  onStart: () => void;
}

export default function TastingWelcome({ wineryName, wineryLogo, wineCount, onStart }: TastingWelcomeProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
    >
      {/* Background */}
      <div className="absolute inset-0">
        <img src={tastingBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-sm">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          {wineryLogo ? (
            <img src={wineryLogo} alt={wineryName} className="w-20 h-20 rounded-full object-cover ring-2 ring-gold/40 shadow-2xl" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center ring-2 ring-gold/40">
              <Wine className="w-10 h-10 text-gold" />
            </div>
          )}
        </motion.div>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-gold/80 text-xs uppercase tracking-[0.3em] font-medium mb-3"
        >
          Experiência Exclusiva
        </motion.p>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="font-display text-3xl font-bold text-white leading-tight mb-4"
        >
          Bem-vindo à Experiência{" "}
          <span className="text-gradient-gold">{wineryName}</span>
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-white/60 text-sm leading-relaxed mb-10"
        >
          Descubra seu paladar em {wineCount} {wineCount === 1 ? "passo" : "passos"}. 
          Avalie, descubra sua persona e receba recomendações personalizadas.
        </motion.p>

        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          onClick={onStart}
          className="relative px-10 py-4 rounded-2xl bg-gold text-gold-foreground font-display text-base font-semibold shadow-lg shadow-gold/30 hover:shadow-xl hover:shadow-gold/40 transition-all duration-300"
        >
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-2xl animate-ping bg-gold/20" style={{ animationDuration: '2s' }} />
          <span className="relative flex items-center gap-2">
            <Wine className="w-5 h-5" />
            Iniciar Degustação
          </span>
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-white/30 text-[10px] mt-6"
        >
          🍷 {wineCount} {wineCount === 1 ? "vinho selecionado" : "vinhos selecionados"} para você
        </motion.p>
      </div>
    </motion.div>
  );
}
