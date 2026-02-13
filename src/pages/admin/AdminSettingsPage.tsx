import { useOutletContext } from "react-router-dom";
import type { Winery } from "@/hooks/useWinery";
import { Palette, QrCode } from "lucide-react";

export default function AdminSettingsPage() {
  const { winery } = useOutletContext<{ winery: Winery }>();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">Configurações</h1>
      <p className="text-sm text-muted-foreground mb-6">Branding e configurações da vinícola</p>

      <div className="space-y-4 max-w-lg">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4 text-gold" />
            <span className="text-sm font-semibold text-foreground">Branding</span>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Cor primária</label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg border border-border" style={{ backgroundColor: winery.primary_color }} />
                <span className="text-sm font-mono text-muted-foreground">{winery.primary_color}</span>
              </div>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Nome</label>
              <p className="text-sm font-medium">{winery.name}</p>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Plano</label>
              <span className="text-[11px] font-medium bg-gold/10 text-gold px-2 py-0.5 rounded-full capitalize">{winery.plan_level}</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <QrCode className="w-4 h-4 text-gold" />
            <span className="text-sm font-semibold text-foreground">Validação de Voucher</span>
          </div>
          <input
            type="text"
            placeholder="Digite o código do voucher..."
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button className="mt-2 w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            Validar
          </button>
        </div>
      </div>
    </div>
  );
}
