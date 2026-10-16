import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setEngineLanguage } from "./writing-engine/app-language";

/* NINE LANGUAGES, NO NATIVE MODULE.
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

export type Lang = "en" | "es" | "pt" | "id" | "fr" | "de" | "it" | "ja" | "ko";
/* endonyms, never translated; the flag is the one the copy is written in —
   the Portuguese here is Brazilian (você, pra), so it flies Brazil's */
export const LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: "en", label: "English", flag: "🇺🇸" },
  { id: "es", label: "Español", flag: "🇪🇸" },
  { id: "pt", label: "Português", flag: "🇧🇷" },
  { id: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
  { id: "fr", label: "Français", flag: "🇫🇷" },
  { id: "de", label: "Deutsch", flag: "🇩🇪" },
  { id: "it", label: "Italiano", flag: "🇮🇹" },
  { id: "ja", label: "日本語", flag: "🇯🇵" },
  { id: "ko", label: "한국어", flag: "🇰🇷" },
];

const KEY = "kindredly_lang";

function deviceLang(): Lang {
  try {
    const tag = (Intl.DateTimeFormat().resolvedOptions().locale || "en").toLowerCase();
    if (tag.startsWith("es")) return "es";
    if (tag.startsWith("pt")) return "pt";
    if (tag.startsWith("id") || tag.startsWith("in")) return "id"; // "in" is the legacy Indonesian tag
    if (tag.startsWith("fr")) return "fr";
    if (tag.startsWith("de")) return "de";
    if (tag.startsWith("it")) return "it";
    if (tag.startsWith("ja")) return "ja";
    if (tag.startsWith("ko")) return "ko";
  } catch {
    /* an app that can't read a locale is still an app in English */
  }
  return "en";
}

let current: Lang = deviceLang();
/* The writing engine reads all nine (dictionaries per language, and for
   Japanese and Korean their own way of meeting the text). It is told the
   app language as-is and takes it as a signal, not a verdict: the words
   outvote it when they plainly belong to another language. */
const engineTag = (l: Lang) => l as Parameters<typeof setEngineLanguage>[0];
setEngineLanguage(engineTag(current)); // keep the writing engine's language in sync
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
  setEngineLanguage(engineTag(l));
  for (const f of subs) f(l);
  /* the morning knock lives in the OS schedule, not in a React tree, so no
     subscriber can repaint it — it has to be re-stamped. Lazy require:
     notify imports this module. */
  try {
    void (require("./notify") as typeof import("./notify")).refreshMorningKnock();
  } catch {
    /* notifications unavailable — the knock simply isn't scheduled */
  }
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
const PT: Dict = {};
const ID: Dict = {};
const FR: Dict = {};
const DE: Dict = {};
const IT: Dict = {};
const JA: Dict = {};
const KO: Dict = {};

const DICTS: Record<Lang, Dict> = { en: EN, es: ES, pt: PT, id: ID, fr: FR, de: DE, it: IT, ja: JA, ko: KO };

/** register a screen's strings — one call per surface, kept beside it.
    Positional, in LANGS order; a language left off falls back to English. */
export function strings(en: Dict, es: Dict, pt: Dict, id: Dict, fr?: Dict, de?: Dict, it?: Dict, ja?: Dict, ko?: Dict): void {
  Object.assign(EN, en);
  Object.assign(ES, es);
  Object.assign(PT, pt);
  Object.assign(ID, id);
  if (fr) Object.assign(FR, fr);
  if (de) Object.assign(DE, de);
  if (it) Object.assign(IT, it);
  if (ja) Object.assign(JA, ja);
  if (ko) Object.assign(KO, ko);
}

/** whether the reader's language has its own words for `key` (t() would
    otherwise fall back to English) — for a new line that should give way to
    an older, already-localized one until its languages are written */
export function hasString(key: string): boolean {
  return key in DICTS[current];
}

/** t("kindreds.waiting", { n: 2 }) — {vars} are replaced in place */
export function t(key: string, vars?: Record<string, string | number>): string {
  const s = DICTS[current][key] ?? EN[key] ?? key;
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/* WHAT LANGUAGE A LETTER IS IN, versus what its writer's app was set to.

   `lang` is stamped at publish from the writer's UI language, and those are
   not the same thing. A Chinese speaker running Kindredly in English writes
   a letter in Chinese and it ships tagged "en" — so an English reader was
   never offered to read it in theirs, while the letter beside it, from
   someone whose app happened to be set differently, was. Same language on
   the page, two different offers.

   Seven of the languages Kindredly speaks are Latin-script, so a body that
   is substantially NOT Latin cannot be in any of them — unless it is
   Japanese or Korean, which the app now also speaks. So: a non-Latin body
   is named by its script, and it needs translating only when that script
   is not the reader's own. That is enough to catch what the tag gets wrong
   — deterministically, on device, no model. Telling Spanish from
   Portuguese still rests on the tag, which is what the tag is actually
   good for. */
const OTHER_SCRIPT =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\u0400-\u04ff\u0590-\u05ff\u0600-\u06ff\u0e00-\u0e7f\u0900-\u097f]/g;

/* the two-letter tag on the language pair's left side: the row's tag when
   the script agrees with it, the script's own name when it doesn't (a
   Chinese letter filed as "en" is not English) */
const SCRIPT_TAG: [RegExp, string][] = [
  [/[\u3040-\u30ff]/, "JA"],
  [/[\uac00-\ud7af]/, "KO"],
  [/[\u3400-\u4dbf\u4e00-\u9fff]/, "ZH"],
  [/[\u0400-\u04ff]/, "RU"],
  [/[\u0590-\u05ff]/, "HE"],
  [/[\u0600-\u06ff]/, "AR"],
  [/[\u0e00-\u0e7f]/, "TH"],
  [/[\u0900-\u097f]/, "HI"],
];
export function sourceTag(body: string | null | undefined, lang: string | null | undefined): string {
  if (body) {
    const other = (body.match(OTHER_SCRIPT) || []).length;
    const dense = body.replace(/\s/g, "").length;
    if (other >= 4 && dense > 0 && other / dense > 0.2) {
      for (const [re, tag] of SCRIPT_TAG) if (re.test(body)) return tag;
    }
  }
  return (lang || "en").slice(0, 2).toUpperCase();
}

export function needsTranslating(body: string | null | undefined, lang: string | null | undefined): boolean {
  if (body) {
    const other = (body.match(OTHER_SCRIPT) || []).length;
    const dense = body.replace(/\s/g, "").length;
    if (other >= 4 && dense > 0 && other / dense > 0.2) {
      /* a Japanese letter is Japanese whatever its tag says; a Japanese
         reader does not need it translated */
      for (const [re, tag] of SCRIPT_TAG) if (re.test(body)) return tag.toLowerCase() !== getLang();
      return true;
    }
  }
  return (lang || "en") !== getLang();
}
