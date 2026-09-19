import { READER_LANGUAGES, hasDictionary, type ReaderLanguage } from "./types";
import { engineLanguage } from "./app-language";

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

function coerce(v: string | null | undefined): ReaderLanguage | null {
  if (!v) return null;
  const base = v.toLowerCase().split(/[-_]/)[0];
  // legacy Indonesian code, just in case
  if (base === "in") return "id";
  return (READER_LANGUAGES as string[]).includes(base) ? (base as ReaderLanguage) : null;
}

/* Marker sets that are cheap and high-precision. We only trust a detection
   when a language shows DISTINCTIVE evidence — shared Latin words prove
   nothing. Order matters: id and pt/es have near-unique particles/diacritics
   we can lean on; English is never "detected", it is only the fallback. */
const MARKERS: { lang: ReaderLanguage; re: RegExp }[] = [
  // Indonesian: colloquial particles + very common function words that don't
  // collide with es/pt. These are exactly the stylistic signals we care about.
  { lang: "id", re: /\b(yang|tidak|nggak|ngga|gak|nggk|aku|kamu|saya|gue|gw|banget|kok|sih|deh|dong|kan|nih|udah|belum|dengan|karena|kalau|jadi|juga|bisa|sudah)\b/i },
  // Spanish: inverted marks + ñ + distinctive words
  { lang: "es", re: /[¿¡ñ]|\b(que|pero|porque|cuando|también|estoy|siento|nosotros|muy|más|todavía|quizá|quizás|entonces)\b/i },
  // Portuguese: ã/õ/ç + distinctive words
  { lang: "pt", re: /[ãõ]|ç|\b(você|voce|não|nao|porque|então|entao|ainda|também|tambem|gente|acho|muito|mesmo|coisa)\b/i },
  /* the three we can name but not yet read (no dictionary): naming them is
     what lets the engine decline to lock instead of misreading. Markers
     are the ones that don't collide with es/pt — ß and the umlauts, the
     French negation and clitics, the Italian connectives. */
  { lang: "de", re: /[ßäöü]|\b(ich|nicht|und|das|ist|aber|auch|noch|schon|vielleicht|eigentlich|irgendwie)\b/i },
  { lang: "fr", re: /\b(je|ne|pas|les|des|une|est|et|c'est|j'ai|mais|très|être|peut-être|toujours|jamais|vraiment|quelque)\b/i },
  { lang: "it", re: /\b(non|che|perché|anche|sono|questo|questa|però|molto|già|forse|davvero|niente)\b/i },
];

/* Japanese and Korean are told by script alone — kana or hangul anywhere
   is proof, and nothing else writes in them. Checked before the Latin
   markers so a loanword can't outvote the script. */
const SCRIPT: { lang: ReaderLanguage; re: RegExp }[] = [
  { lang: "ja", re: /[\u3040-\u30ff]/ },
  { lang: "ko", re: /[\uac00-\ud7af\u1100-\u11ff]/ },
];

/** last-resort detector — returns null unless the evidence is distinctive. */
export function detectLanguage(text: string, minHits = 1): ReaderLanguage | null {
  const t = (text || "").toLowerCase();
  if (t.trim().length < 8) return null; // too little to detect honestly
  for (const { lang, re } of SCRIPT) if (re.test(t)) return lang;
  let best: ReaderLanguage | null = null;
  let bestHits = 0;
  for (const { lang, re } of MARKERS) {
    const hits = (t.match(new RegExp(re, "gi")) || []).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = lang;
    }
  }
  return bestHits >= minHits ? best : null;
}

/** the resolver — declared language wins; detection is the last thing tried. */
export function resolveLanguage(text: string, hints: LanguageHints = {}): ReaderLanguage {
  const declared = coerce(hints.explicit) ?? coerce(hints.writingLang) ?? coerce(hints.threadLang);
  if (declared) return declared;
  const ui = coerce(engineLanguage()); // the reader's chosen app language, a real signal
  if (ui && hasDictionary(ui)) {
    /* the four we read: the UI stands, as before — unless the words are
       plainly something else. Another script is proof; for Latin markers
       it takes three distinctive hits, so an English letter that says
       "5pm EST" or "non-stop" is not suddenly French or Italian. Before
       this, a Japanese letter under an English UI was read as English and
       four dimensions locked on it. */
    const plain = detectLanguage(text, 3);
    if (plain && plain !== ui) return plain;
    /* and the one Latin language we never detect by marker: a text with not
       a single marker of the UI's own language, in plain ASCII, is English
       — someone with the app in French writing to the pool in English */
    if (ui !== "en" && !hitsOf(text, ui) && latinEnglish(text)) return "en";
    return ui;
  }
  /* A UI language we can't read yet says less about the text than the text
     does: someone with the app in French may still write to the pool in
     English. So the words are asked first; only when they say nothing
     distinctive — and aren't plainly Latin-script English — does the UI
     language stand, and the dictionary-fed dimensions hold off. */
  const detected = detectLanguage(text);
  if (detected) return detected;
  if (ui) return latinEnglish(text) ? "en" : ui;
  return "en";
}

/** how many of a language's own markers the text carries (0 for English, which has none) */
function hitsOf(text: string, lang: ReaderLanguage): number {
  const m = MARKERS.find((x) => x.lang === lang);
  return m ? ((text || "").toLowerCase().match(new RegExp(m.re, "gi")) || []).length : 0;
}

/* Latin script with no other language's markers (checked by the caller):
   read as English, the only Latin language we never detect by marker. */
function latinEnglish(text: string): boolean {
  const letters = text.match(/\p{L}/gu) || [];
  if (letters.length < 8) return false;
  const latin = text.match(/[A-Za-z]/g) || [];
  return latin.length / letters.length >= 0.97;
}

/* Code-switching note: we never force a single interpretation on a mixed
   piece. resolveLanguage picks the FRAME language (usually the declared one);
   the extractors preserve punctuation, formatting and quirks regardless, and
   confidence.ts lowers confidence on language-sensitive axes when the frame
   language's own markers are sparse relative to the text length. That check
   lives with the extractors, which see the raw token counts. */
