import { motion } from "framer-motion";
import { QrCode, Copy, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";

interface ShopVoucherProps {
  voucher: { code: string; id?: string };
  qrDataUrl: string | null;
  discountedTotal: number;
  currency: string;
  onNewPurchase: () => void;
  t: (k: string) => string;
}

export default function ShopVoucher({ voucher, qrDataUrl, discountedTotal, currency, onNewPurchase, t }: ShopVoucherProps) {
  const copyCode = () => {
    navigator.clipboard.writeText(voucher.code);
    toast.success(t("shop.code_copied"));
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card rounded-xl border-2 border-gold/30 p-6 text-center luxury-shadow"
    >
      {qrDataUrl ? (
        <img src={qrDataUrl} alt="QR Code do Voucher" className="w-48 h-48 mx-auto mb-3 rounded-xl" />
      ) : (
        <QrCode className="w-16 h-16 mx-auto text-gold mb-3" />
      )}
      <p className="text-[11px] text-muted-foreground mb-1">{t("shop.present_at_checkout")}</p>
      <p className="font-display text-2xl font-bold text-foreground tracking-wider">{voucher.code}</p>
      <p className="text-sm text-muted-foreground mt-1">{t("shop.total")}: {formatCurrency(discountedTotal, currency)}</p>
      
      <div className="mt-3 flex items-center justify-center gap-1.5 bg-destructive/10 text-destructive rounded-lg px-3 py-2">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="text-[11px] font-medium">{t("shop.valid_today")}</span>
      </div>

      <div className="flex gap-2 mt-4 justify-center">
        <button onClick={copyCode} className="flex items-center gap-1.5 text-sm border border-border px-4 py-2 rounded-xl hover:bg-muted transition-colors">
          <Copy className="w-3.5 h-3.5" /> {t("shop.copy")}
        </button>
        <button onClick={onNewPurchase}
          className="text-sm bg-gold text-gold-foreground px-4 py-2 rounded-xl hover:bg-gold/90 transition-colors">
          {t("shop.new_purchase")}
        </button>
      </div>
    </motion.div>
  );
}
