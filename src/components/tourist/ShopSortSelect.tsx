import { ArrowUpDown } from "lucide-react";

export type SortOption = "default" | "price_asc" | "price_desc" | "name_asc" | "name_desc";

const sortLabels: Record<string, Record<SortOption, string>> = {
  pt: { default: "Relevância", price_asc: "Menor preço", price_desc: "Maior preço", name_asc: "A → Z", name_desc: "Z → A" },
  en: { default: "Relevance", price_asc: "Price ↑", price_desc: "Price ↓", name_asc: "A → Z", name_desc: "Z → A" },
  es: { default: "Relevancia", price_asc: "Menor precio", price_desc: "Mayor precio", name_asc: "A → Z", name_desc: "Z → A" },
};

export default function ShopSortSelect({ value, onChange, locale = "pt" }: { value: SortOption; onChange: (v: SortOption) => void; locale?: string }) {
  const labels = sortLabels[locale] || sortLabels.pt;
  return (
    <div className="flex items-center gap-1.5">
      <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="text-[11px] bg-transparent text-muted-foreground border-none outline-none cursor-pointer font-medium"
      >
        {(Object.keys(labels) as SortOption[]).map((key) => (
          <option key={key} value={key}>{labels[key]}</option>
        ))}
      </select>
    </div>
  );
}
