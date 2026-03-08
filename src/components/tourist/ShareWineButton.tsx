import { Share2 } from "lucide-react";
import type { Wine } from "@/hooks/useWinery";
import { formatCurrencyShort } from "@/lib/currency";

interface ShareWineButtonProps {
  wine: Wine;
  winerySlug: string;
  currency?: string;
  className?: string;
}

export default function ShareWineButton({ wine, winerySlug, currency = "BRL", className }: ShareWineButtonProps) {
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const price = formatCurrencyShort(Math.round(Number(wine.price_bottle) * 0.9), currency);
    const url = `${window.location.origin}/app/${winerySlug}/shop`;
    const text = `🍷 *${wine.name}*\n${wine.type}${wine.year ? ` · ${wine.year}` : ""}${wine.grape ? ` · ${wine.grape}` : ""}\n💰 ${price} (10% OFF!)\n\n👉 ${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <button
      onClick={handleShare}
      className={`p-1.5 rounded-full bg-background/30 backdrop-blur-md border border-foreground/10 ${className ?? ""}`}
      title="Compartilhar via WhatsApp"
    >
      <Share2 className="w-3.5 h-3.5 text-foreground/60" />
    </button>
  );
}
