import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Winery } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { UserPlus, QrCode, Wine as WineIcon, Plus, Minus, Check } from "lucide-react";

type Step = "lead" | "items" | "done";

interface CartItem { wine_id?: string; package_id?: string; name: string; qty: number; price: number; category?: string }

export default function AdminCheckinPage() {
  const { winery } = useOutletContext<{ winery: Winery; admin: AdminUser }>();
  const [step, setStep] = useState<Step>("lead");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [capturePoint, setCapturePoint] = useState("");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [voucher, setVoucher] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const { data: catalog } = useQuery({
    queryKey: ["checkin-catalog", winery.id],
    queryFn: async () => {
      const { data } = await invokeAuth("admin-checkin", { action: "quick_catalog", winery_id: winery.id });
      return data ?? { wines: [], packages: [], capture_points: [] };
    },
  });

  const submitLead = async () => {
    if (!name.trim() || !whatsapp.trim()) return toast.error("Nome e WhatsApp obrigatórios");
    setLoading(true);
    const { data, error } = await invokeAuth("admin-checkin", {
      action: "register_lead", name, whatsapp, capture_point_id: capturePoint || undefined,
    });
    setLoading(false);
    if (error) return toast.error(error.message ?? "Erro");
    setLeadId(data.lead_id);
    setReturning(data.returning);
    setStep("items");
    toast.success(data.returning ? "Cliente reconhecido!" : "Lead criado!");
  };

  const addItem = (item: CartItem) => {
    setCart((c) => {
      const ix = c.findIndex((i) => i.wine_id === item.wine_id && i.package_id === item.package_id);
      if (ix >= 0) { const copy = [...c]; copy[ix] = { ...copy[ix], qty: copy[ix].qty + 1 }; return copy; }
      return [...c, item];
    });
  };
  const removeItem = (ix: number) => setCart((c) => c.filter((_, i) => i !== ix));
  const inc = (ix: number) => setCart((c) => c.map((it, i) => i === ix ? { ...it, qty: it.qty + 1 } : it));
  const dec = (ix: number) => setCart((c) => c.map((it, i) => i === ix ? { ...it, qty: Math.max(1, it.qty - 1) } : it).filter((it) => it.qty > 0));
  const total = cart.reduce((s, i) => s + i.qty * i.price, 0);

  const issueVoucher = async () => {
    if (!leadId || cart.length === 0) return toast.error("Adicione itens");
    setLoading(true);
    const items = cart.map((i) => ({ ...i }));
    const { data, error } = await invokeAuth("admin-checkin", {
      action: "issue_voucher", lead_id: leadId, items, total, channel: cart[0]?.category ?? "mixed", capture_point_id: capturePoint || undefined,
    });
    setLoading(false);
    if (error) return toast.error(error.message ?? "Erro");
    setVoucher(data.voucher);
    setStep("done");
    toast.success(`Voucher ${data.voucher.code} emitido`);
  };

  const reset = () => {
    setStep("lead"); setName(""); setWhatsapp(""); setCapturePoint(""); setLeadId(null); setReturning(false); setCart([]); setVoucher(null);
  };

  return (
    <div className="space-y-5 max-w-md mx-auto pb-24">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">Check-in</h1>
        <p className="text-xs text-muted-foreground">Cadastro rápido + voucher</p>
      </div>

      <Stepper step={step} />

      {step === "lead" && (
        <div className="space-y-3 bg-card border border-border rounded-2xl p-4">
          <BigInput label="Nome" value={name} onChange={setName} placeholder="Nome completo" />
          <BigInput label="WhatsApp" value={whatsapp} onChange={setWhatsapp} placeholder="+55 54 9..." type="tel" />
          {(catalog?.capture_points?.length ?? 0) > 0 && (
            <div>
              <label className="text-sm font-medium block mb-1">Ponto de captura</label>
              <select value={capturePoint} onChange={(e) => setCapturePoint(e.target.value)} className="w-full rounded-xl border border-border p-3 text-base">
                <option value="">— selecione —</option>
                {catalog!.capture_points.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <button disabled={loading} onClick={submitLead} className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50">
            <UserPlus className="w-5 h-5" /> Registrar e seguir
          </button>
        </div>
      )}

      {step === "items" && (
        <div className="space-y-3">
          {returning && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">Cliente já cadastrado — bem-vindo de volta!</div>}

          {/* Cart */}
          {cart.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-3 space-y-2">
              {cart.map((i, ix) => (
                <div key={ix} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{i.name}</span>
                  <button onClick={() => dec(ix)} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                  <span className="w-6 text-center">{i.qty}</span>
                  <button onClick={() => inc(ix)} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                  <span className="w-20 text-right font-medium">{formatCurrency(i.qty * i.price, winery.currency)}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-border flex items-center justify-between font-semibold">
                <span>Total</span><span className="text-primary">{formatCurrency(total, winery.currency)}</span>
              </div>
            </div>
          )}

          {/* Packages */}
          {(catalog?.packages?.length ?? 0) > 0 && (
            <Section title="Pacotes">
              <div className="space-y-2">
                {catalog!.packages.map((p: any) => (
                  <button key={p.id} onClick={() => addItem({ package_id: p.id, name: p.name, qty: 1, price: Number(p.price), category: "tasting" })}
                    className="w-full text-left bg-card border border-border rounded-xl p-3 active:bg-muted/50">
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(p.price, winery.currency)}</p>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* Wines */}
          <Section title="Vinhos">
            <div className="grid grid-cols-2 gap-2">
              {(catalog?.wines ?? []).slice(0, 20).map((w: any) => (
                <button key={w.id} onClick={() => addItem({ wine_id: w.id, name: w.name, qty: 1, price: Number(w.price_bottle), category: w.on_tasting ? "tasting" : w.on_restaurant ? "restaurant" : "shop" })}
                  className="text-left bg-card border border-border rounded-xl p-2 active:bg-muted/50">
                  <p className="font-medium text-xs line-clamp-2">{w.name}</p>
                  <p className="text-xs text-primary mt-1">{formatCurrency(w.price_bottle, winery.currency)}</p>
                </button>
              ))}
            </div>
          </Section>

          <button disabled={loading || cart.length === 0} onClick={issueVoucher}
            className="fixed bottom-20 left-4 right-4 max-w-md mx-auto h-14 rounded-xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg">
            <QrCode className="w-5 h-5" /> Emitir voucher · {formatCurrency(total, winery.currency)}
          </button>
        </div>
      )}

      {step === "done" && voucher && (
        <div className="bg-card border border-border rounded-2xl p-5 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center"><Check className="w-8 h-8 text-emerald-600" /></div>
          <h2 className="font-display text-xl font-bold">Voucher emitido</h2>
          <p className="text-3xl font-bold tracking-wider text-primary">{voucher.code}</p>
          <p className="text-sm text-muted-foreground">Total: <span className="font-semibold">{formatCurrency(voucher.total, winery.currency)}</span></p>
          <button onClick={reset} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold">Novo check-in</button>
        </div>
      )}
    </div>
  );
}

function BigInput({ label, value, onChange, placeholder, type }: any) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1">{label}</label>
      <input type={type ?? "text"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-border p-3 text-base" />
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{title}</p>
      {children}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: Step[] = ["lead", "items", "done"];
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s} className={`h-1.5 flex-1 rounded-full ${steps.indexOf(step) >= i ? "bg-primary" : "bg-muted"}`} />
      ))}
    </div>
  );
}
