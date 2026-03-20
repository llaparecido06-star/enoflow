import { useState, useEffect, useRef, useCallback } from "react";
import { useI18n, type Locale } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

// In-memory cache shared across all hook instances
const translationCache: Record<string, string> = {};

function cacheKey(text: string, locale: Locale) {
  return `${locale}::${text}`;
}

// Load persisted cache from localStorage
const STORAGE_KEY = "enoflow_translations";
try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) Object.assign(translationCache, JSON.parse(stored));
} catch {}

function persistCache() {
  try {
    // Keep cache under 200 entries to avoid bloating localStorage
    const keys = Object.keys(translationCache);
    if (keys.length > 200) {
      const toRemove = keys.slice(0, keys.length - 200);
      toRemove.forEach((k) => delete translationCache[k]);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(translationCache));
  } catch {}
}

// Batch queue for pending translations
let pendingTexts: { text: string; locale: Locale }[] = [];
let batchTimeout: ReturnType<typeof setTimeout> | null = null;
let batchListeners: (() => void)[] = [];

async function flushBatch() {
  if (pendingTexts.length === 0) return;

  const batch = [...pendingTexts];
  pendingTexts = [];

  // Group by locale
  const byLocale: Record<string, string[]> = {};
  batch.forEach(({ text, locale }) => {
    if (!byLocale[locale]) byLocale[locale] = [];
    if (!byLocale[locale].includes(text)) byLocale[locale].push(text);
  });

  for (const [locale, texts] of Object.entries(byLocale)) {
    // Filter out already cached
    const uncached = texts.filter((t) => !translationCache[cacheKey(t, locale as Locale)]);
    if (uncached.length === 0) continue;

    try {
      const { data, error } = await supabase.functions.invoke("translate-content", {
        body: { texts: uncached, target_locale: locale },
      });
      if (!error && data?.translations) {
        uncached.forEach((text, i) => {
          translationCache[cacheKey(text, locale as Locale)] = data.translations[i] || text;
        });
        persistCache();
      }
    } catch (e) {
      console.error("Translation batch error:", e);
    }
  }

  // Notify all listeners
  batchListeners.forEach((cb) => cb());
}

function queueTranslation(text: string, locale: Locale) {
  const key = cacheKey(text, locale);
  if (translationCache[key]) return;

  if (!pendingTexts.some((p) => p.text === text && p.locale === locale)) {
    pendingTexts.push({ text, locale });
  }

  if (batchTimeout) clearTimeout(batchTimeout);
  batchTimeout = setTimeout(flushBatch, 150); // debounce 150ms
}

/**
 * Hook that translates an array of texts from Portuguese to the current locale.
 * Returns the translated texts (or originals while loading / if locale is pt).
 */
export function useContentTranslation(texts: (string | null | undefined)[]): string[] {
  const { locale } = useI18n();
  const [, forceUpdate] = useState(0);
  const textsRef = useRef(texts);
  textsRef.current = texts;

  const listener = useCallback(() => forceUpdate((n) => n + 1), []);

  useEffect(() => {
    batchListeners.push(listener);
    return () => {
      batchListeners = batchListeners.filter((l) => l !== listener);
    };
  }, [listener]);

  // Queue translations for non-pt locales
  useEffect(() => {
    if (locale === "pt") return;
    texts.forEach((text) => {
      if (text) queueTranslation(text, locale);
    });
  }, [texts.join("||"), locale]);

  return texts.map((text) => {
    if (!text) return "";
    if (locale === "pt") return text;
    return translationCache[cacheKey(text, locale)] || text;
  });
}

/**
 * Translate a single text string.
 */
export function useTranslatedText(text: string | null | undefined): string {
  const result = useContentTranslation([text]);
  return result[0];
}
