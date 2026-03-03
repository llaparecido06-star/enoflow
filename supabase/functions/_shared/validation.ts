// Shared validation utilities for edge functions

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUUID(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

export function str(v: unknown, max = 200): string {
  return String(v ?? "").trim().slice(0, max);
}

export function optStr(v: unknown, max = 200): string | null {
  if (v === null || v === undefined || v === "") return null;
  return str(v, max);
}

export function num(v: unknown, min = 0, max = 999999): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function optNum(v: unknown, min = 0, max = 999999): number | null {
  if (v === null || v === undefined || v === "") return null;
  return num(v, min, max);
}

export function intRange(v: unknown, min: number, max: number, def: number): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) return def;
  return n;
}

export function bool(v: unknown, def = false): boolean {
  if (typeof v === "boolean") return v;
  return def;
}

export function strArray(v: unknown, maxItems = 50, maxLen = 200): string[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, maxItems).filter((s): s is string => typeof s === "string").map(s => s.slice(0, maxLen));
}

export function uuidArray(v: unknown, maxItems = 50): string[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, maxItems).filter(isUUID);
}

// Wine data validation
export interface ValidatedWineData {
  name: string;
  type: string;
  grape: string | null;
  region: string | null;
  year: number | null;
  price_bottle: number;
  price_glass: number | null;
  description: string | null;
  alcohol_content: string | null;
  serving_temp: string | null;
  aging: string | null;
  enologist: string | null;
  aromatic_notes: string[] | null;
  harmonization: string[] | null;
  sensory_acidity: number;
  sensory_body: number;
  sensory_sweetness: number;
  on_tasting: boolean;
  on_restaurant: boolean;
  on_shop: boolean;
  image_url: string | null;
}

export function validateWineData(d: Record<string, unknown>): { data?: ValidatedWineData; error?: string } {
  const name = str(d.name, 200);
  if (!name) return { error: "name is required" };
  const type = str(d.type, 50);
  if (!type) return { error: "type is required" };

  return {
    data: {
      name,
      type,
      grape: optStr(d.grape, 100),
      region: optStr(d.region, 100),
      year: d.year != null ? intRange(d.year, 1900, 2100, new Date().getFullYear()) : null,
      price_bottle: num(d.price_bottle, 0, 999999),
      price_glass: optNum(d.price_glass, 0, 999999),
      description: optStr(d.description, 1000),
      alcohol_content: optStr(d.alcohol_content, 20),
      serving_temp: optStr(d.serving_temp, 30),
      aging: optStr(d.aging, 100),
      enologist: optStr(d.enologist, 100),
      aromatic_notes: d.aromatic_notes ? strArray(d.aromatic_notes, 20, 100) : null,
      harmonization: d.harmonization ? strArray(d.harmonization, 20, 100) : null,
      sensory_acidity: intRange(d.sensory_acidity, 1, 5, 3),
      sensory_body: intRange(d.sensory_body, 1, 5, 3),
      sensory_sweetness: intRange(d.sensory_sweetness, 1, 5, 3),
      on_tasting: bool(d.on_tasting),
      on_restaurant: bool(d.on_restaurant),
      on_shop: bool(d.on_shop, true),
      image_url: optStr(d.image_url, 500),
    },
  };
}

// Menu item validation
export interface ValidatedMenuItemData {
  name: string;
  category: string;
  price: number;
  description: string | null;
  image_url: string | null;
  suggested_wine_id: string | null;
  capture_point_id: string | null;
}

export function validateMenuItemData(d: Record<string, unknown>): { data?: ValidatedMenuItemData; error?: string } {
  const name = str(d.name, 200);
  if (!name) return { error: "name is required" };

  return {
    data: {
      name,
      category: str(d.category || "Outros", 100),
      price: num(d.price, 0, 999999),
      description: optStr(d.description, 500),
      image_url: optStr(d.image_url, 500),
      suggested_wine_id: isUUID(d.suggested_wine_id) ? d.suggested_wine_id : null,
      capture_point_id: isUUID(d.capture_point_id) ? d.capture_point_id : null,
    },
  };
}

// Tasting package validation
export interface ValidatedPackageData {
  name: string;
  description: string | null;
  price: number;
  wine_ids: string[];
}

export function validatePackageData(d: Record<string, unknown>): { data?: ValidatedPackageData; error?: string } {
  const name = str(d.name, 200);
  if (!name) return { error: "name is required" };

  return {
    data: {
      name,
      description: optStr(d.description, 500),
      price: num(d.price, 0, 999999),
      wine_ids: uuidArray(d.wine_ids, 50),
    },
  };
}

// Voucher items validation
export function validateVoucherItems(items: unknown): { valid: boolean; sanitized: unknown[] } {
  if (!Array.isArray(items)) return { valid: false, sanitized: [] };
  if (items.length > 100) return { valid: false, sanitized: [] };
  const sanitized = items.slice(0, 100).map((item: Record<string, unknown>) => ({
    name: str(item?.name, 200),
    quantity: intRange(item?.quantity, 1, 999, 1),
    price: num(item?.price, 0, 999999),
  }));
  return { valid: true, sanitized };
}
