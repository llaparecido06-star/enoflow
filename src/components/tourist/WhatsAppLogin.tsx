import { useState } from "react";
import { Phone, User, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface WhatsAppLoginProps {
  wineryName: string;
  wineryColor: string;
  onLogin: (name: string, whatsapp: string) => Promise<void>;
}

export default function WhatsAppLogin({ wineryName, wineryColor, onLogin }: WhatsAppLoginProps) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [step, setStep] = useState<"name" | "phone">("name");
  const [loading, setLoading] = useState(false);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleNameSubmit = () => {
    if (name.trim().length < 2) {
      toast.error("Digite seu nome");
      return;
    }
    setStep("phone");
  };

  const handleLogin = async () => {
    const digits = whatsapp.replace(/\D/g, "");
    if (digits.length < 10) {
      toast.error("Digite um número de WhatsApp válido");
      return;
    }
    setLoading(true);
    try {
      await onLogin(name.trim(), digits);
      toast.success("Bem-vindo(a)! 🍷");
    } catch {
      toast.error("Erro ao entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-xl font-bold"
            style={{ backgroundColor: wineryColor, color: '#fff' }}
          >
            {wineryName.charAt(0)}
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">{wineryName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === "name" ? "Como devemos te chamar?" : "Entre com seu WhatsApp"}
          </p>
        </div>

        {step === "name" ? (
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus
                maxLength={100}
              />
            </div>
            <button
              onClick={handleNameSubmit}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-primary-foreground transition-colors"
              style={{ backgroundColor: wineryColor }}
            >
              Continuar
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="tel"
                placeholder="(11) 99999-9999"
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep("name")}
                className="px-4 py-3 rounded-xl text-sm border border-border hover:bg-secondary transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleLogin}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-primary-foreground transition-colors disabled:opacity-50"
                style={{ backgroundColor: wineryColor }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Simularemos um Magic Link enviado ao seu WhatsApp
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
