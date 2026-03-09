import { useState, useRef, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import type { Winery } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { Palette, QrCode, CheckCircle, XCircle, Camera, History, User, Clock, Trophy, Package, CalendarIcon, Filter } from "lucide-react";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

interface RedeemedVoucher {
  id: string;
  code: string;
  total: number;
  created_at: string;
  customer_name: string;
  validated_by: string;
  validated_at: string;
}

interface RankingItem {
  name: string;
  count: number;
}

interface SkuItem {
  name: string;
  qty: number;
  revenue: number;
}

export default function AdminSettingsPage() {
  const { winery, admin } = useOutletContext<{ winery: Winery; admin: AdminUser }>();
  const [voucherCode, setVoucherCode] = useState("");
  const [validating, setValidating] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrcodeRef = useRef<any>(null);

  const [redeemedVouchers, setRedeemedVouchers] = useState<RedeemedVoucher[]>([]);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [skus, setSkus] = useState<SkuItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<"history" | "ranking" | "skus">("history");

  const loadHistory = async (from?: Date, to?: Date) => {
    setLoadingHistory(true);
    try {
      const payload: any = { action: "list_redeemed" };
      if (from) payload.date_from = format(from, "yyyy-MM-dd");
      if (to) payload.date_to = format(to, "yyyy-MM-dd");

      const { data, error } = await invokeAuth("admin-vouchers", payload);
      if (error) throw error;
      setRedeemedVouchers(data?.vouchers ?? []);
      setRanking(data?.ranking ?? []);
      setSkus(data?.skus ?? []);
    } catch {
      // silent
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const applyDateFilter = () => {
    loadHistory(dateFrom, dateTo);
  };

  const clearDateFilter = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    loadHistory();
  };

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
      loadHistory(dateFrom, dateTo);
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
    } catch {
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

  const isOwner = admin.role === "owner" || admin.role === "master";

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
      " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const totalRevenue = redeemedVouchers.reduce((s, v) => s + v.total, 0);

  const tabs = [
    { key: "history" as const, label: "Histórico", icon: History },
    { key: "ranking" as const, label: "Ranking", icon: Trophy },
    { key: "skus" as const, label: "Inventário", icon: Package },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">
        {isOwner ? "Configurações" : "Validação de Voucher"}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        {isOwner ? "Branding e configurações da vinícola" : "Escaneie ou digite o código do voucher"}
      </p>

      <div className="space-y-4 max-w-2xl">
        {isOwner && (
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
        )}

        {/* Voucher validation */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <QrCode className="w-4 h-4 text-gold" />
            <span className="text-sm font-semibold text-foreground">Validação de Voucher</span>
          </div>

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
            onChange={(e) => {
              let val = e.target.value.toUpperCase().replace(/^#+/, "");
              setVoucherCode(val ? `#${val}` : "");
            }}
            placeholder="Ex: LUCAS-4827"
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

        {/* Date filter */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gold" />
            <span className="text-sm font-semibold text-foreground">Filtrar por período</span>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[140px]">
              <label className="text-[11px] text-muted-foreground block mb-1">De</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm h-9", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="w-3.5 h-3.5 mr-2" />
                    {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="text-[11px] text-muted-foreground block mb-1">Até</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm h-9", !dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="w-3.5 h-3.5 mr-2" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy") : "Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <Button onClick={applyDateFilter} size="sm" className="h-9">Filtrar</Button>
            {(dateFrom || dateTo) && (
              <Button onClick={clearDateFilter} variant="ghost" size="sm" className="h-9 text-muted-foreground">Limpar</Button>
            )}
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <p className="text-[11px] text-muted-foreground">Validados</p>
            <p className="font-display text-xl font-bold text-foreground">{redeemedVouchers.length}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <p className="text-[11px] text-muted-foreground">Receita</p>
            <p className="font-display text-xl font-bold text-gold">{formatCurrency(totalRevenue, winery.currency)}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <p className="text-[11px] text-muted-foreground">SKUs</p>
            <p className="font-display text-xl font-bold text-foreground">{skus.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors",
                  activeTab === tab.key
                    ? "text-gold border-b-2 border-gold bg-gold/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {loadingHistory ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : activeTab === "history" ? (
              /* ── History Tab ── */
              redeemedVouchers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum voucher validado neste período</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {redeemedVouchers.map((v) => (
                    <div key={v.id} className="flex items-center justify-between gap-3 border border-border/50 rounded-lg p-3 hover:bg-muted/20 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-foreground">{v.code}</span>
                          <span className="text-xs font-medium text-gold">{formatCurrency(v.total, winery.currency)}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <User className="w-3 h-3" />{v.customer_name}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="w-3 h-3" />{formatDate(v.validated_at)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-muted-foreground">por</span>
                        <p className="text-[11px] font-medium text-foreground">{v.validated_by}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : activeTab === "ranking" ? (
              /* ── Ranking Tab ── */
              ranking.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma validação registrada</p>
              ) : (
                <div className="space-y-2">
                  {ranking.map((r, i) => (
                    <div key={r.name} className="flex items-center gap-3 border border-border/50 rounded-lg p-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                        i === 0 ? "bg-gold/20 text-gold" :
                        i === 1 ? "bg-muted text-muted-foreground" :
                        i === 2 ? "bg-accent text-accent-foreground" :
                        "bg-muted/50 text-muted-foreground"
                      )}>
                        {i + 1}º
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-foreground">{r.count}</p>
                        <p className="text-[10px] text-muted-foreground">validações</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* ── SKU Inventory Tab ── */
              skus.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum item vendido neste período</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {skus.map((s) => (
                    <div key={s.name} className="flex items-center justify-between gap-3 border border-border/50 rounded-lg p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground">{s.qty} {s.qty === 1 ? "unidade" : "unidades"} vendida{s.qty === 1 ? "" : "s"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gold">{formatCurrency(s.revenue, winery.currency)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
