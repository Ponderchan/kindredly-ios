import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "./types";
import { getLang } from "../i18n";

/* RESOLVE A PIECE'S LANGUAGE — Step 3.
   ────────────────────────────────────────────────────────────────────────
   Every piece of writing must have a resolved language before analysis. We
   PREFER what we already know and only detect as a last resort — re-detecting
   every fragment is both wasteful and wrong (a one-word reply is not evidence
   of anything). Resolution order, per spec:

     explicit piece language
       ↓ user's selected writing / app language
         ↓ thread language
           ↓ lightweight detector (fallback only)
             ↓ "en"

   Detection here is deliberately tiny and script/marker-based — NOT a model
   and NOT a dependency. It exists only to catch the case where we have no
   declared language at all. When it is unsure it returns null and we fall
   through to the app language, never to a guess. */

export interface LanguageHints {
  /** a language stamped on the piece itself (e.g. letter.lang) */
  explicit?: string | null;
  /** the writer's chosen writing/app language (strongest real signal) */
  writingLang?: string | null;
  /** the language a thread is being conducted in */
  threadLang?: string | null;
}

function coerce(v: string | null | undefined): SupportedLanguage | null {
  if (!v) return null;
  const base = v.toLowerCase().split(/[-_]/)[0];
  // legacy Indonesian code, just in case
  if (base === "in") return "id";
  return (SUPPORTED_LANGUAGES as string[]).includes(base) ? (base as SupportedLanguage) : null;
}

/* Marker sets that are cheap and high-precision. We only trust a detection
   when a language shows DISTINCTIVE evidence — shared Latin words prove
   nothing. Order matters: id and pt/es have near-unique particles/diacritics
   we can lean on; English is never "detected", it is only the fallback. */
const MARKERS: { lang: SupportedLanguage; re: RegExp }[] = [
  // Indonesian: colloquial particles + very common function words that don't
  // collide with es/pt. These are exactly the stylistic signals we care about.
  { lang: "id", re: /\b(yang|tidak|nggak|ngga|gak|nggk|aku|kamu|saya|gue|gw|banget|kok|sih|deh|dong|kan|nih|udah|belum|dengan|karena|kalau|jadi|juga|bisa|sudah)\b/i },
  // Spanish: inverted marks + ñ + distinctive words
  { lang: "es", re: /[¿¡ñ]|\b(que|pero|porque|cuando|también|estoy|siento|nosotros|muy|más|todavía|quizá|quizás|entonces)\b/i },
  // Portuguese: ã/õ/ç + distinctive words
  { lang: "pt", re: /[ãõ]|ç|\b(você|voce|não|nao|porque|então|entao|ainda|também|tambem|gente|acho|muito|mesmo|coisa)\b/i },
];

/** last-resort detector — returns null unless the evidence is distinctive. */
export function detectLanguage(text: string): SupportedLanguage | null {
  const t = (text || "").toLowerCase();
  if (t.trim().length < 8) return null; // too little to detect honestly
  let best: SupportedLanguage | null = null;
  let bestHits = 0;
  for (const { lang, re } of MARKERS) {
    const hits = (t.match(new RegExp(re, "gi")) || []).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = lang;
    }
  }
  return bestHits >= 1 ? best : null;
}

/** the resolver — declared language wins; detection is the last thing tried. */
export function resolveLanguage(text: string, hints: LanguageHints = {}): SupportedLanguage {
  return (
    coerce(hints.explicit) ??
    coerce(hints.writingLang) ??
    coerce(hints.threadLang) ??
    coerce(getLang()) ?? // the reader's chosen app language, a real signal
    detectLanguage(text) ??
    "en"
  );
}

/* Code-switching note: we never force a single interpretation on a mixed
   piece. resolveLanguage picks the FRAME language (usually the declared one);
   the extractors preserve punctuation, formatting and quirks regardless, and
   confidence.ts lowers confidence on language-sensitive axes when the frame
   language's own markers are sparse relative to the text length. That check
   lives with the extractors, which see the raw token counts. */
