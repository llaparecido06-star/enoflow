import { useState } from "react";
import { Phone, User, ArrowRight, Loader2, ExternalLink, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useI18n, LanguageSelector } from "@/lib/i18n";

interface WhatsAppLoginProps {
  wineryName: string;
  wineryColor: string;
  wineryLogo?: string | null;
  onLogin: (name: string, whatsapp: string, acceptedTerms: boolean) => Promise<void>;
}

const countryCodes = [
  { code: "+55", flag: "🇧🇷", name: "Brasil", placeholder: "(99) 99999-9999", digits: 11, mask: "(##) #####-####" },
  { code: "+1", flag: "🇺🇸", name: "USA", placeholder: "(555) 123-4567", digits: 10, mask: "(###) ###-####" },
  { code: "+54", flag: "🇦🇷", name: "Argentina", placeholder: "11 1234-5678", digits: 10, mask: "## ####-####" },
  { code: "+56", flag: "🇨🇱", name: "Chile", placeholder: "9 1234 5678", digits: 9, mask: "# #### ####" },
  { code: "+598", flag: "🇺🇾", name: "Uruguay", placeholder: "99 123 456", digits: 8, mask: "## ### ###" },
  { code: "+351", flag: "🇵🇹", name: "Portugal", placeholder: "912 345 678", digits: 9, mask: "### ### ###" },
  { code: "+34", flag: "🇪🇸", name: "España", placeholder: "612 34 56 78", digits: 9, mask: "### ## ## ##" },
  { code: "+33", flag: "🇫🇷", name: "France", placeholder: "06 12 34 56 78", digits: 10, mask: "## ## ## ## ##" },
  { code: "+39", flag: "🇮🇹", name: "Italia", placeholder: "312 345 6789", digits: 10, mask: "### ### ####" },
  { code: "+49", flag: "🇩🇪", name: "Deutschland", placeholder: "151 1234 5678", digits: 11, mask: "### #### ####" },
  { code: "+44", flag: "🇬🇧", name: "UK", placeholder: "7911 123456", digits: 10, mask: "#### ######" },
  { code: "+81", flag: "🇯🇵", name: "Japan", placeholder: "90-1234-5678", digits: 10, mask: "##-####-####" },
  { code: "+86", flag: "🇨🇳", name: "China", placeholder: "131 2345 6789", digits: 11, mask: "### #### ####" },
];

function applyMask(value: string, mask: string): string {
  const digits = value.replace(/\D/g, "");
  let result = "";
  let di = 0;
  for (let i = 0; i < mask.length && di < digits.length; i++) {
    if (mask[i] === "#") {
      result += digits[di++];
    } else {
      result += mask[i];
    }
  }
  return result;
}

export default function WhatsAppLogin({ wineryName, wineryColor, wineryLogo, onLogin }: WhatsAppLoginProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+55");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [step, setStep] = useState<"name" | "phone">("name");
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  const selectedCountry = countryCodes.find(c => c.code === countryCode) ?? countryCodes[0];

  const handleNameSubmit = () => {
    if (name.trim().length < 2) {
      toast.error(t("login.name_required"));
      return;
    }
    setStep("phone");
  };

  const phoneDigits = phone.replace(/\D/g, "");
  const isPhoneValid = phoneDigits.length === selectedCountry.digits;

  const handleLogin = async () => {
    if (!isPhoneValid) {
      toast.error(`${t("login.phone_invalid")} (${selectedCountry.digits} ${t("login.digits_required") || "dígitos"})`);
      return;
    }
    if (!acceptedTerms) {
      toast.error(t("login.terms_required"));
      return;
    }
    setLoading(true);
    try {
      const fullNumber = countryCode.replace("+", "") + phoneDigits;
      await onLogin(name.trim(), fullNumber, true);
      toast.success(t("login.welcome"));
    } catch {
      toast.error(t("login.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Language selector */}
        <div className="flex justify-end mb-4">
          <LanguageSelector />
        </div>

        <div className="text-center mb-8">
          {wineryLogo ? (
            <img src={wineryLogo} alt={wineryName} className="w-40 h-40 rounded-3xl mx-auto mb-6 object-contain drop-shadow-xl" />
          ) : (
            <div
              className="w-28 h-28 rounded-3xl mx-auto mb-6 flex items-center justify-center text-4xl font-bold shadow-lg"
              style={{ backgroundColor: wineryColor, color: '#fff' }}
            >
              {wineryName.charAt(0)}
            </div>
          )}
          <h1 className="font-display text-xl font-bold text-foreground">{wineryName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === "name" ? t("login.how_to_call") : t("login.enter_whatsapp")}
          </p>
        </div>

        {step === "name" ? (
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("login.your_name")}
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
              {t("login.continue")}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {/* Phone with DDI selector */}
            <div className="flex gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCountryPicker(!showCountryPicker)}
                  className="flex items-center gap-1 px-3 py-3 bg-card border border-border rounded-xl text-sm min-w-[5rem] hover:bg-secondary transition-colors"
                >
                  <span className="text-base">{selectedCountry.flag}</span>
                  <span className="text-xs text-muted-foreground">{selectedCountry.code}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
                {showCountryPicker && (
                  <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto w-48">
                    {countryCodes.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => { setCountryCode(c.code); setPhone(""); setShowCountryPicker(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors ${
                          c.code === countryCode ? "bg-primary/5" : ""
                        }`}
                      >
                        <span>{c.flag}</span>
                        <span className="text-xs text-muted-foreground">{c.code}</span>
                        <span className="text-xs truncate">{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="tel"
                  placeholder={selectedCountry.placeholder}
                  value={phone}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const masked = applyMask(raw, selectedCountry.mask);
                    setPhone(masked);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  autoFocus
                  maxLength={selectedCountry.mask.length}
                />
              </div>
              {phoneDigits.length > 0 && (
                <p className={`text-xs mt-1 ${isPhoneValid ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {phoneDigits.length}/{selectedCountry.digits} dígitos
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep("name")}
                className="px-4 py-3 rounded-xl text-sm border border-border hover:bg-secondary transition-colors"
              >
                {t("login.back")}
              </button>
              <button
                onClick={handleLogin}
                disabled={loading || !isPhoneValid}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-primary-foreground transition-colors disabled:opacity-50"
                style={{ backgroundColor: wineryColor }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("login.enter")}
              </button>
            </div>
            <label className="flex items-start gap-2 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-border accent-primary"
              />
              <span className="text-[11px] text-muted-foreground leading-tight">
                {t("login.terms_text")}{" "}
                <Link to="/privacidade" target="_blank" className="underline text-primary inline-flex items-center gap-0.5">
                  {t("login.privacy_terms")} <ExternalLink className="w-3 h-3 inline" />
                </Link>{" "}
                {t("login.terms_suffix")}
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
