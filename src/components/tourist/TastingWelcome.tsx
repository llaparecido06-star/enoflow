import { useState } from "react";
import { motion } from "framer-motion";
import { Wine, Package } from "lucide-react";
import tastingBg from "@/assets/tasting-welcome-bg.jpg";
import type { TastingPackage } from "@/hooks/useWinery";
import { useI18n } from "@/lib/i18n";

interface TastingWelcomeProps {
  wineryName: string;
  wineryLogo?: string | null;
  wineCount: number;
  onStart: (packageId?: string) => void;
  packages?: TastingPackage[];
}

export default function TastingWelcome({ wineryName, wineryLogo, wineCount, onStart, packages }: TastingWelcomeProps) {
  const { t } = useI18n();
  const hasMultiplePackages = packages && packages.length > 1;
  const [selectedPkg, setSelectedPkg] = useState<string | undefined>(
    packages && packages.length === 1 ? packages[0].id : undefined
  );

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
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="mb-8">
          {wineryLogo ? (
            <img src={wineryLogo} alt={wineryName} className="w-20 h-20 rounded-full object-cover ring-2 ring-gold/40 shadow-2xl" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center ring-2 ring-gold/40">
              <Wine className="w-10 h-10 text-gold" />
            </div>
          )}
        </motion.div>

        <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-gold/80 text-xs uppercase tracking-[0.3em] font-medium mb-3">
          {t("welcome.exclusive")}
        </motion.p>

        <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
          className="font-display text-3xl font-bold text-white leading-tight mb-4">
          {t("welcome.welcome_to")}{" "}
          <span className="text-gradient-gold">{wineryName}</span>
        </motion.h1>

        <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
          className="text-white/60 text-sm leading-relaxed mb-6">
          {t("welcome.discover_palate")} {wineCount} {wineCount === 1 ? t("welcome.step") : t("welcome.steps")}.{" "}
          {t("welcome.rate_discover")}
        </motion.p>

        {/* Package selection */}
        {hasMultiplePackages && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.55 }}
            className="w-full mb-6 space-y-2">
            <p className="text-white/70 text-xs font-medium mb-2">{t("welcome.select_tasting")}</p>
            {packages.map((pkg) => (
              <button key={pkg.id} onClick={() => setSelectedPkg(pkg.id)}
                className={`w-full text-left rounded-xl p-3 border transition-all ${
                  selectedPkg === pkg.id ? "bg-gold/20 border-gold/50 ring-1 ring-gold/30" : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}>
                <div className="flex items-center gap-2">
                  <Package className={`w-4 h-4 ${selectedPkg === pkg.id ? "text-gold" : "text-white/40"}`} />
                  <span className={`text-sm font-medium ${selectedPkg === pkg.id ? "text-gold" : "text-white/80"}`}>{pkg.name}</span>
                  <span className={`text-xs ml-auto ${selectedPkg === pkg.id ? "text-gold/80" : "text-white/40"}`}>
                    R$ {Number(pkg.price).toFixed(2)}
                  </span>
                </div>
                {pkg.description && <p className="text-[10px] text-white/40 mt-1 ml-6">{pkg.description}</p>}
                <p className="text-[10px] text-white/30 mt-0.5 ml-6">{pkg.wine_ids.length} {t("welcome.wines_label")}</p>
              </button>
            ))}
          </motion.div>
        )}

        <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
          onClick={() => onStart(selectedPkg)}
          disabled={hasMultiplePackages && !selectedPkg}
          className="relative px-10 py-4 rounded-2xl bg-gold text-gold-foreground font-display text-base font-semibold shadow-lg shadow-gold/30 hover:shadow-xl hover:shadow-gold/40 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed">
          {(!hasMultiplePackages || selectedPkg) && (
            <span className="absolute inset-0 rounded-2xl animate-ping bg-gold/20" style={{ animationDuration: '2s' }} />
          )}
          <span className="relative flex items-center gap-2">
            <Wine className="w-5 h-5" />
            {t("welcome.start_tasting")}
          </span>
        </motion.button>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="text-white/30 text-[10px] mt-6">
          🍷 {wineCount} {wineCount === 1 ? t("welcome.wine_selected") : t("welcome.wines_selected")}
        </motion.p>
      </div>
    </motion.div>
  );
}
