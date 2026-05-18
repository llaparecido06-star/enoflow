import { useState, useEffect } from "react";
import { invokeAuth } from "@/lib/auth-api";
import { formatCurrency } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { Receipt, CheckCircle, Clock, Loader2, ShoppingBag, QrCode, ChevronDown, ChevronUp } from "lucide-react";
import QRCode from "qrcode";

interface VoucherRecord {
  id: string;
  code: string;
  total: number;
  redeemed: boolean;
  nps_score: number | null;
  created_at: string;
  items: Array<{ name: string; qty?: number; quantity?: number; price?: number }>;
}

function isValidToday(createdAt: string): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  return (
    created.getDate() === now.getDate() &&
    created.getMonth() === now.getMonth() &&
    created.getFullYear() === now.getFullYear()
  );
}

export default function VoucherHistory({ currency = "BRL" }: { currency?: string }) {
  const { t } = useI18n();
  const [vouchers, setVouchers] = useState<VoucherRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [generatingQr, setGeneratingQr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await invokeAuth("tourist-actions", { action: "get_vouchers" });
        if (res.data?.vouchers) setVouchers(res.data.vouchers);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const toggleExpand = async (voucher: VoucherRecord) => {
    if (expandedId === voucher.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(voucher.id);
    if (!voucher.redeemed && isValidToday(voucher.created_at) && !qrMap[voucher.id]) {
      setGeneratingQr(voucher.id);
      try {
        const qrUrl = await QRCode.toDataURL(voucher.code, {
          width: 200,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        });
        setQrMap((prev) => ({ ...prev, [voucher.id]: qrUrl }));
      } catch {}
      setGeneratingQr(null);
    }
  };

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
      {vouchers.map((v, i) => {
        const isExpanded = expandedId === v.id;
        const canShowQr = !v.redeemed && isValidToday(v.created_at);

        return (
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

            {canShowQr && (
              <button
                onClick={() => toggleExpand(v)}
                className="mt-2 w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-foreground bg-muted rounded-lg px-3 py-2 hover:bg-muted/80 transition-colors"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    {t("shop.hide_qr") || "Ocultar QR Code"}
                  </>
                ) : (
                  <>
                    <QrCode className="w-3.5 h-3.5" />
                    {t("shop.show_qr") || "Mostrar QR Code"}
                  </>
                )}
              </button>
            )}

            <AnimatePresence>
              {isExpanded && canShowQr && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 flex flex-col items-center">
                    {generatingQr === v.id ? (
                      <div className="flex items-center gap-2 py-4">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">{t("shop.generating_qr") || "Gerando QR Code..."}</span>
                      </div>
                    ) : qrMap[v.id] ? (
                      <>
                        <img
                          src={qrMap[v.id]}
                          alt={`QR Code ${v.code}`}
                          className="w-40 h-40 rounded-xl border border-border/30"
                        />
                        <p className="text-[10px] text-muted-foreground mt-2 text-center">
                          {t("shop.present_at_checkout") || "Apresente este QR Code no caixa"}
                        </p>
                      </>
                    ) : null}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
