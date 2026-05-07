import { useEffect, useState } from "react";
import { invokeAuth } from "@/lib/auth-api";
import { motion } from "framer-motion";
import { Award, Gift, CheckCircle2 } from "lucide-react";

interface Reward { id: string; threshold: number; title: string; description: string | null }
interface Status {
  points: number;
  rewards: Reward[];
  next_reward: Reward | null;
  voucher_count: number;
  redeemed_count: number;
  referral_count: number;
}

export default function LoyaltyCard({ leadId }: { leadId: string }) {
  const [s, setS] = useState<Status | null>(null);

  useEffect(() => {
    if (!leadId) return;
    invokeAuth("tourist-loyalty", { action: "loyalty_status" })
      .then(({ data }) => setS(data))
      .catch(() => {});
  }, [leadId]);

  if (!s || s.rewards.length === 0) return null;

  const next = s.next_reward;
  const progress = next ? Math.min(100, (s.points / next.threshold) * 100) : 100;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-gold/10 to-card rounded-xl border border-gold/20 p-4 luxury-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-gold" />
          <h2 className="font-display text-sm font-semibold">Programa de Fidelidade</h2>
        </div>
        <span className="text-xs font-bold text-gold">{s.points} {s.points === 1 ? "selo" : "selos"}</span>
      </div>

      {next ? (
        <>
          <p className="text-[11px] text-muted-foreground mb-2">
            Faltam <strong>{next.threshold - s.points}</strong> para "{next.title}"
          </p>
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }}
              className="bg-gradient-to-r from-gold to-gold/70 h-2" />
          </div>
        </>
      ) : (
        <p className="text-[11px] text-emerald-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Todas as recompensas conquistadas!
        </p>
      )}

      <div className="mt-3 grid grid-cols-1 gap-1.5">
        {s.rewards.map((r) => {
          const unlocked = s.points >= r.threshold;
          return (
            <div key={r.id} className={`flex items-center gap-2 text-[11px] p-2 rounded-lg ${unlocked ? "bg-gold/10" : "bg-secondary/40"}`}>
              {unlocked ? <CheckCircle2 className="w-3 h-3 text-gold" /> : <Gift className="w-3 h-3 text-muted-foreground" />}
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${unlocked ? "text-foreground" : "text-muted-foreground"}`}>{r.title}</p>
                {r.description && <p className="text-[9px] text-muted-foreground truncate">{r.description}</p>}
              </div>
              <span className="text-[10px] text-muted-foreground">{r.threshold}</span>
            </div>
          );
        })}
      </div>

      {s.referral_count > 0 && (
        <p className="text-[10px] text-muted-foreground mt-2">🎁 {s.referral_count} {s.referral_count === 1 ? "amigo indicado" : "amigos indicados"}</p>
      )}
    </motion.div>
  );
}
