import { useState, useRef, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import type { Winery } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Palette, QrCode, CheckCircle, XCircle, Camera } from "lucide-react";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const { winery, admin } = useOutletContext<{ winery: Winery; admin: AdminUser }>();
  const [voucherCode, setVoucherCode] = useState("");
  const [validating, setValidating] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrcodeRef = useRef<any>(null);

  const validateVoucher = async (code: string) => {
    if (!code.trim()) return;
    setValidating(true);
    try {
      const { data, error } = await invokeAuth("admin-vouchers", {
        action: "validate",
        voucher_code: code,
      });

      if (error) throw error;

      if (data?.error) {
        if (data.error === "Voucher não encontrado") {
          toast.error("Voucher não encontrado", { icon: <XCircle className="w-4 h-4" /> });
        } else if (data.error === "Voucher já foi resgatado") {
          toast.error("Voucher já foi resgatado", { icon: <XCircle className="w-4 h-4" /> });
        } else {
          throw new Error(data.error);
        }
        return;
      }

      toast.success(`Voucher resgatado! Total: R$ ${Number(data.voucher.total).toFixed(2)}`, {
        icon: <CheckCircle className="w-4 h-4" />,
      });
      setVoucherCode("");
    } catch {
      toast.error("Erro ao validar voucher");
    } finally {
      setValidating(false);
    }
  };

  const startScanner = async () => {
    setScannerActive(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      html5QrcodeRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded: string) => {
          scanner.stop().catch(() => {});
          setScannerActive(false);
          setVoucherCode(decoded);
          validateVoucher(decoded);
        },
        () => {}
      );
    } catch (err) {
      toast.error("Não foi possível acessar a câmera");
      setScannerActive(false);
    }
  };

  const stopScanner = () => {
    html5QrcodeRef.current?.stop().catch(() => {});
    setScannerActive(false);
  };

  useEffect(() => {
    return () => {
      html5QrcodeRef.current?.stop().catch(() => {});
    };
  }, []);

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

          {/* QR Scanner */}
          <div className="mb-3">
            {scannerActive ? (
              <div>
                <div id="qr-reader" ref={scannerRef} className="rounded-lg overflow-hidden mb-2" />
                <button
                  onClick={stopScanner}
                  className="w-full border border-border py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Cancelar scan
                </button>
              </div>
            ) : (
              <button
                onClick={startScanner}
                className="w-full flex items-center justify-center gap-2 border border-border py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <Camera className="w-4 h-4" />
                Escanear QR Code
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] text-muted-foreground">ou digite o código</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <input
            type="text"
            value={voucherCode}
            onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
            placeholder="Ex: #GOIS-12"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
          />
          <button
            onClick={() => validateVoucher(voucherCode)}
            disabled={validating || !voucherCode.trim()}
            className="mt-2 w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {validating ? "Validando..." : "Validar Voucher"}
          </button>
        </div>
      </div>
    </div>
  );
}
