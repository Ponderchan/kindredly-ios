import type { JournalTheme } from "../types";

/* PER-LANGUAGE RESOURCES — Step 4.
   ────────────────────────────────────────────────────────────────────────
   The linguistic heart. Each supported language ships one LangResources
   object describing how ITS speakers actually write — function words,
   discourse particles, affect words, laughter, question habits, quirks, and
   the topic lexicons that resolve to shared theme IDs. Nothing here is
   translated from English: each list is native to its language, including the
   Gen-Z/informal registers (id `sih/deh/gue/wkwk`, es `jaja/q/xq`, pt
   `kkk/vc/mano/tipo`) that carry the strongest style signal.

   Consumed by: courier-read (affect/laughter/question), journal-sparks
   (themes), hatch-engine (hedges/affect/pronouns/quirks/openers). All four
   languages are Latin-script, so we tokenize unicode-aware and test SET
   membership rather than leaning on ASCII \b word boundaries, which mis-fire
   on accented words. */

export interface LangResources {
  /** qualifiers, hedges, discourse markers, particles — the "little words".
      Higher count → more hedged/qualifying. */
  hedges: string[];
  /** positive / bright affect words (explicitness of feeling). */
  affectPos: string[];
  /** heavy / negative affect words. */
  affectNeg: string[];
  /** words counted for emotional EXPLICITNESS (emoHits/feeling-endings).
      Defaults to affectPos+affectNeg; en overrides it to the shipped set. */
  emotionWords?: string[];
  /** laughter & playful runs — jaja / kkkk / wkwk / haha, repeated. */
  laughter: RegExp;
  /** question habits beyond a bare "?" (particles, tags). */
  question: RegExp;
  /** an owned-emotion frame: "I feel", "me siento", "aku merasa". */
  ownedFrame: RegExp;
  /** self-distance frame: "a person who", "alguien que", "orang yang". */
  distanceFrame: RegExp;
  /** first-person pronouns (inward gaze). */
  firstPerson: string[];
  /** outward-looking words (people, places, the world). */
  outward: string[];
  /** abstract-noun morphology for this language. */
  abstract: RegExp;
  /** concrete sentence-openers (a detail, not a feeling, up front). */
  detailOpeners: RegExp;
  /** language-specific quirk detectors → stable trait ids (repeated only). */
  quirks: (text: string, tokens: string[]) => string[];
  /** topic lexicons → shared JournalTheme ids. */
  themes: { theme: JournalTheme; words: string[] }[];
}

/* unicode-aware tokenizer: lowercased letter-runs (keeps accents, drops
   punctuation/emoji). Apostrophes inside words (id "nggak'", en "don't") are
   split, which is fine for membership tests. */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}]+/gu) || []) as string[];
}

export function countAny(tokens: string[], list: string[]): number {
  if (!list.length) return 0;
  const set = new Set(list);
  let n = 0;
  for (const tk of tokens) if (set.has(tk)) n++;
  return n;
}

export function hasAny(tokens: string[], list: string[]): boolean {
  const set = new Set(list);
  return tokens.some((tk) => set.has(tk));
}

/* phrase-aware occurrence count: single-word entries counted by token
   membership (fast, exact), multi-word entries ("kind of", "por fin", "sei
   lá") counted by substring on the lowercased text. Used where the shipped
   English behaviour counted phrases via regex. */
export function countMatches(lowerText: string, tokens: string[], list: string[]): number {
  const singles = new Set<string>();
  const phrases: string[] = [];
  for (const w of list) (w.includes(" ") ? phrases.push(w) : singles.add(w));
  let n = 0;
  for (const tk of tokens) if (singles.has(tk)) n++;
  for (const p of phrases) {
    let i = lowerText.indexOf(p);
    while (i !== -1) {
      n++;
      i = lowerText.indexOf(p, i + p.length);
    }
  }
  return n;
}
