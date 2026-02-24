// Currency formatting utility
const CURRENCY_MAP: Record<string, { symbol: string; locale: string }> = {
  BRL: { symbol: "R$", locale: "pt-BR" },
  USD: { symbol: "$", locale: "en-US" },
  EUR: { symbol: "€", locale: "de-DE" },
};

export function formatCurrency(value: number, currency: string = "BRL"): string {
  const cfg = CURRENCY_MAP[currency] || CURRENCY_MAP.BRL;
  return `${cfg.symbol} ${value.toLocaleString(cfg.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCurrencyShort(value: number, currency: string = "BRL"): string {
  const cfg = CURRENCY_MAP[currency] || CURRENCY_MAP.BRL;
  return `${cfg.symbol} ${value.toLocaleString(cfg.locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function currencySymbol(currency: string = "BRL"): string {
  return CURRENCY_MAP[currency]?.symbol || "R$";
}
