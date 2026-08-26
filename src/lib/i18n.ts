import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* THREE LANGUAGES, NO NATIVE MODULE.
   ────────────────────────────────────────────────────────────────────────
   Locale comes from Intl, which Hermes already carries — expo-localization
   is a native module and would not exist in any client built before it was
   installed (expo-store-review taught us that this week). Intl works
   today, in the dev client, on the first launch.

   A reader may override it: the device says what it says, but someone
   writing in Spanish on an English phone should not have to fight it.

   TRANSLATION RULE, and it matters more here than in most apps: her voice
   is the product. Wren speaks plainly and never performs, so the Spanish
   is written AS Spanish rather than as English rearranged. Where a phrase
   is postal (a stamp, a fare, a postmark), the local postal word wins
   over a literal one.

   Chinese was written and then withdrawn (slice 256): mainland
   distribution needs an ICP filing, and more importantly the aura's nine
   signals are English-shaped — hedges, word length, type-token ratio —
   so a Chinese writer would have read as permanently unformed. It is in
   git history, and it comes back with a Chinese engine, not before.

   Missing keys fall back to English rather than showing a key — a reader
   should never see machinery. */

export type Lang = "en" | "es";
export const LANGS: { id: Lang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
];

const KEY = "kindredly_lang";

function deviceLang(): Lang {
  try {
    const tag = (Intl.DateTimeFormat().resolvedOptions().locale || "en").toLowerCase();
    if (tag.startsWith("es")) return "es";
  } catch {
    /* an app that can't read a locale is still an app in English */
  }
  return "en";
}

let current: Lang = deviceLang();
const subs = new Set<(l: Lang) => void>();

/** restore the reader's own choice, if they made one */
export async function loadLang(): Promise<void> {
  try {
    const saved = (await AsyncStorage.getItem(KEY)) as Lang | null;
    if (saved && LANGS.some((l) => l.id === saved)) setLang(saved, false);
  } catch {
    /* keep the device's answer */
  }
}

export function setLang(l: Lang, persist = true): void {
  if (l === current) return;
  current = l;
  for (const f of subs) f(l);
  if (persist) void AsyncStorage.setItem(KEY, l).catch(() => {});
}

export function getLang(): Lang {
  return current;
}

/** re-renders a screen when the language changes */
export function useLang(): Lang {
  const [l, setL] = useState(current);
  useEffect(() => {
    subs.add(setL);
    setL(current);
    return () => {
      subs.delete(setL);
    };
  }, []);
  return l;
}

/* ── the catalog ──────────────────────────────────────────────────────
   Keyed by surface. English is the source; a missing key anywhere falls
   through to it. */
type Dict = Record<string, string>;

const EN: Dict = {};
const ES: Dict = {};

const DICTS: Record<Lang, Dict> = { en: EN, es: ES };

/** register a screen's strings — one call per surface, kept beside it */
export function strings(en: Dict, es: Dict): void {
  Object.assign(EN, en);
  Object.assign(ES, es);
}

/** t("kindreds.waiting", { n: 2 }) — {vars} are replaced in place */
export function t(key: string, vars?: Record<string, string | number>): string {
  const s = DICTS[current][key] ?? EN[key] ?? key;
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
