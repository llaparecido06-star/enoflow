import { Share2, Copy } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function ReferralCard({ leadId, slug, wineryName }: { leadId: string; slug: string; wineryName: string }) {
  const link = `${window.location.origin}/app/${slug}?ref=${leadId}`;
  const text = `🍷 Acabei de descobrir os vinhos da ${wineryName}! Ganhe selos e recompensas você também: ${link}`;

  const share = () => {
    if (navigator.share) {
      navigator.share({ title: wineryName, text, url: link }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };
  const copy = () => {
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border/30 p-4">
      <h2 className="font-display text-sm font-semibold mb-1">Indique um amigo</h2>
      <p className="text-[11px] text-muted-foreground mb-3">Ao gerar o primeiro voucher, vocês dois ganham +1 selo.</p>
      <div className="flex gap-2">
        <button onClick={share} className="flex-1 bg-gold text-gold-foreground px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
          <Share2 className="w-3.5 h-3.5" /> Compartilhar
        </button>
        <button onClick={copy} className="border border-border px-3 py-2 rounded-xl text-xs flex items-center gap-1.5">
          <Copy className="w-3.5 h-3.5" /> Copiar link
        </button>
      </div>
    </motion.div>
  );
}
