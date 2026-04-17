import { useState, useEffect } from "react";
import { invokeAuth } from "@/lib/auth-api";
import { formatCurrency } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Receipt, CheckCircle, Clock, Loader2, ShoppingBag } from "lucide-react";

interface VoucherRecord {
  id: string;
  code: string;
  total: number;
  redeemed: boolean;
  nps_score: number | null;
  created_at: string;
  items: Array<{ name: string; qty?: number; quantity?: number; price?: number }>;
}

export default function VoucherHistory({ currency = "BRL" }: { currency?: string }) {
  const { t } = useI18n();
  const [vouchers, setVouchers] = useState<VoucherRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await invokeAuth("tourist-actions", { action: "get_vouchers" });
        if (res.data?.vouchers) setVouchers(res.data.vouchers);
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (vouchers.length === 0) {
    return (
      <div className="text-center py-6">
        <ShoppingBag className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">{t("journey.no_purchases")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {vouchers.map((v, i) => (
        <motion.div
          key={v.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-card rounded-xl border border-border/30 p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-gold" />
              <span className="text-xs font-semibold text-foreground font-mono">{v.code}</span>
            </div>
            <div className="flex items-center gap-1">
              {v.redeemed ? (
                <span className="flex items-center gap-1 text-[10px] text-green-500 font-medium">
                  <CheckCircle className="w-3 h-3" /> {t("journey.redeemed")}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-amber-500 font-medium">
                  <Clock className="w-3 h-3" /> {t("journey.pending")}
                </span>
              )}
            </div>
          </div>
          <div className="space-y-0.5 mb-2">
            {(v.items || []).map((item, j) => {
              const qty = Number(item.qty ?? item.quantity ?? 1);
              const price = Number(item.price ?? 0);
              return (
                <div key={j} className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{qty}x {item.name}</span>
                  <span>{formatCurrency(price * qty, currency)}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between pt-1.5 border-t border-border/20">
            <span className="text-[10px] text-muted-foreground">
              {new Date(v.created_at).toLocaleDateString("pt-BR")}
            </span>
            <span className="text-xs font-bold text-gold">{formatCurrency(v.total, currency)}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
