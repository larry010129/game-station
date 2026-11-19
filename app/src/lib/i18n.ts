import { useCallback, useSyncExternalStore } from "react";
import { readString, writeString } from "./storage.ts";
import { EN } from "../i18n/en.ts";
import { ZH_TW } from "../i18n/zhTW.ts";

/**
 * The app's language: English or Traditional Chinese (Taiwan usage). No library: two flat dictionaries keyed by
 * dotted ids, and `{name}` placeholders. A key missing from Chinese falls back to English, and a key missing from
 * both shows the fallback the caller gave (or the key), so an untranslated page still reads in English.
 *
 * The choice is saved on this PC under a `cs.` key (so backups carry it and a factory reset clears it). With no
 * choice saved, a first system language of Traditional Chinese (zh-TW, zh-HK, zh-MO, zh-Hant) starts in Chinese.
 */

export type Lang = "en" | "zh-TW";
export const LANGS: { value: Lang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "zh-TW", label: "繁體中文" },
];

export const LANG_KEY = "cs.lang";
const EVENT = "cs-lang";
const DICTS: Record<Lang, Readonly<Record<string, string>>> = { en: EN, "zh-TW": ZH_TW };

/** The system's first language is Traditional Chinese (a later entry in the list does not count). */
export function prefersTraditional(langs: readonly string[]): boolean {
  return /^zh-(tw|hk|mo)\b|^zh-hant\b/i.test(langs[0] ?? "");
}

export function getLang(): Lang {
  const saved = readString(LANG_KEY);
  if (saved === "en" || saved === "zh-TW") return saved;
  const nav = typeof navigator !== "undefined" ? navigator.languages ?? [navigator.language] : [];
  return prefersTraditional(nav.filter(Boolean)) ? "zh-TW" : "en";
}

export function setLang(lang: Lang): void {
  writeString(LANG_KEY, lang);
  if (typeof document !== "undefined") document.documentElement.lang = lang;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

/** Fills `{name}` placeholders. */
const fill = (text: string, vars?: Record<string, string | number>) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text;

/** One string in a given language. `fallback` is shown when neither dictionary has the key. */
export function translate(lang: Lang, key: string, vars?: Record<string, string | number>, fallback?: string): string {
  return fill(DICTS[lang][key] ?? EN[key] ?? fallback ?? key, vars);
}

/** One string in the current language, for code outside React. */
export const tr = (key: string, vars?: Record<string, string | number>, fallback?: string) => translate(getLang(), key, vars, fallback);

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, () => "en");
}

export type T = (key: string, vars?: Record<string, string | number>, fallback?: string) => string;

/** The translate function for the current language; components re-render when it changes. */
export function useT(): T {
  const lang = useLang();
  return useCallback((key, vars, fallback) => translate(lang, key, vars, fallback), [lang]);
}

/** "5h 12m" / "5 小時 12 分": a span of minutes, as days and hours, hours and minutes, or minutes. */
export function spanText(lang: Lang, minutes: number): string {
  const min = Math.max(0, Math.round(minutes));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return translate(lang, "time.dh", { d, h });
  if (h > 0) return translate(lang, "time.hm", { h, m });
  return translate(lang, "time.m", { m });
}
