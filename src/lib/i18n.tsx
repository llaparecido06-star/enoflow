import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type Locale = "pt" | "en" | "es";

const translations: Record<Locale, Record<string, string>> = {
  pt: {
    // Login
    "login.how_to_call": "Como devemos te chamar?",
    "login.enter_whatsapp": "Entre com seu WhatsApp",
    "login.your_name": "Seu nome",
    "login.continue": "Continuar",
    "login.back": "Voltar",
    "login.enter": "Entrar",
    "login.welcome": "Bem-vindo(a)! 🍷",
    "login.error": "Erro ao entrar. Tente novamente.",
    "login.name_required": "Digite seu nome",
    "login.phone_invalid": "Digite um número de WhatsApp válido",
    "login.terms_required": "Você precisa aceitar os Termos de Privacidade para continuar.",
    "login.terms_text": "Li e aceito os",
    "login.privacy_terms": "Termos de Privacidade",
    "login.terms_suffix": "e concordo em receber ofertas via WhatsApp.",
    "login.phone_label": "Telefone",
    "login.country_code": "DDI",
    // Nav
    "nav.tasting": "Degustação",
    "nav.restaurant": "Restaurante",
    "nav.shop": "Loja",
    "nav.profile": "Meu Perfil",
    // Header
    "header.hello": "Olá,",
    // General
    "general.loading": "Carregando...",
    "general.not_found": "Vinícola não encontrada",
    "general.not_found_desc": "Verifique o link e tente novamente.",
    "general.unavailable": "Experiência indisponível",
    "general.unavailable_desc": "Esta experiência está temporariamente indisponível. Contate a administração.",
  },
  en: {
    "login.how_to_call": "What should we call you?",
    "login.enter_whatsapp": "Enter your WhatsApp",
    "login.your_name": "Your name",
    "login.continue": "Continue",
    "login.back": "Back",
    "login.enter": "Enter",
    "login.welcome": "Welcome! 🍷",
    "login.error": "Error signing in. Try again.",
    "login.name_required": "Enter your name",
    "login.phone_invalid": "Enter a valid WhatsApp number",
    "login.terms_required": "You must accept the Privacy Terms to continue.",
    "login.terms_text": "I have read and accept the",
    "login.privacy_terms": "Privacy Terms",
    "login.terms_suffix": "and agree to receive offers via WhatsApp.",
    "login.phone_label": "Phone",
    "login.country_code": "Code",
    "nav.tasting": "Tasting",
    "nav.restaurant": "Restaurant",
    "nav.shop": "Shop",
    "nav.profile": "My Profile",
    "header.hello": "Hello,",
    "general.loading": "Loading...",
    "general.not_found": "Winery not found",
    "general.not_found_desc": "Check the link and try again.",
    "general.unavailable": "Experience unavailable",
    "general.unavailable_desc": "This experience is temporarily unavailable. Contact the administration.",
  },
  es: {
    "login.how_to_call": "¿Cómo debemos llamarte?",
    "login.enter_whatsapp": "Ingresa tu WhatsApp",
    "login.your_name": "Tu nombre",
    "login.continue": "Continuar",
    "login.back": "Volver",
    "login.enter": "Entrar",
    "login.welcome": "¡Bienvenido/a! 🍷",
    "login.error": "Error al ingresar. Inténtalo de nuevo.",
    "login.name_required": "Ingresa tu nombre",
    "login.phone_invalid": "Ingresa un número de WhatsApp válido",
    "login.terms_required": "Debes aceptar los Términos de Privacidad para continuar.",
    "login.terms_text": "He leído y acepto los",
    "login.privacy_terms": "Términos de Privacidad",
    "login.terms_suffix": "y acepto recibir ofertas por WhatsApp.",
    "login.phone_label": "Teléfono",
    "login.country_code": "Código",
    "nav.tasting": "Degustación",
    "nav.restaurant": "Restaurante",
    "nav.shop": "Tienda",
    "nav.profile": "Mi Perfil",
    "header.hello": "Hola,",
    "general.loading": "Cargando...",
    "general.not_found": "Bodega no encontrada",
    "general.not_found_desc": "Verifica el enlace e inténtalo de nuevo.",
    "general.unavailable": "Experiencia no disponible",
    "general.unavailable_desc": "Esta experiencia está temporalmente no disponible. Contacta a la administración.",
  },
};

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem("enoflow_locale");
    return (stored as Locale) || "pt";
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("enoflow_locale", l);
  }, []);

  const t = useCallback(
    (key: string) => translations[locale]?.[key] ?? translations.pt[key] ?? key,
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be inside I18nProvider");
  return ctx;
}

const flags: Record<Locale, string> = { pt: "🇧🇷", en: "🇺🇸", es: "🇪🇸" };

export function LanguageSelector({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <div className={`flex items-center gap-0.5 ${className ?? ""}`}>
      {(Object.keys(flags) as Locale[]).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`text-base px-1 py-0.5 rounded transition-opacity ${
            locale === l ? "opacity-100" : "opacity-40 hover:opacity-70"
          }`}
          title={l.toUpperCase()}
        >
          {flags[l]}
        </button>
      ))}
    </div>
  );
}
