import type { SupportedLanguage } from "../types";

/* LANGUAGE BASELINES — Step 5 (PROVISIONAL).
   ────────────────────────────────────────────────────────────────────────
   "Analyze locally, normalize globally": a Spanish writer's 18 words/sentence
   and an English writer's 14 should land on the SAME style coordinate if both
   are 68th-percentile long-form for their own language. Most of the nine
   dimensions are count-based and self-adapt the moment they read a language's
   own word lists (dictionaries/*). Only the two LENGTH dimensions — word
   length and sentence length — carry an absolute scale that differs by
   language, so those get a per-language centre here.

   English values are the CURRENT hatch-engine constants verbatim, so English
   output is byte-identical through the migration (the snapshot test proves
   it). The es/pt/id numbers are linguistically-informed estimates, NOT a
   validated corpus: Spanish/Portuguese run structurally longer, Indonesian
   words are longer (agglutinative) but sentences are punchier. They are
   deliberately isolated here and easy to recalibrate once we have real
   per-language reference writing. Do not treat them as final. */

export interface LanguageBaseline {
  /** subtracted from mean word length before the vocabulary formula. */
  wordLenCenter: number;
  /** "reaches for longer/observed words" copy threshold (raw avg word len). */
  wordLenCopyThreshold: number;
  /** subtracted from mean sentence length before the sentence formula. */
  sentenceLenOffset: number;
  /** "lets thoughts breathe" copy threshold (raw mean sentence len). */
  sentenceCopyThreshold: number;
  /** provisional flag — true until validated against real reference writing. */
  provisional: boolean;
}

const BASELINES: Record<SupportedLanguage, LanguageBaseline> = {
  // identity — the shipped English constants. Never mark provisional; this is
  // the frozen reference the snapshot guards.
  en: { wordLenCenter: 3.6, wordLenCopyThreshold: 5, sentenceLenOffset: 0, sentenceCopyThreshold: 11, provisional: false },
  // Spanish: longer words and longer clauses are the norm.
  es: { wordLenCenter: 4.3, wordLenCopyThreshold: 5.7, sentenceLenOffset: 3, sentenceCopyThreshold: 14, provisional: true },
  // Brazilian Portuguese: close to Spanish.
  pt: { wordLenCenter: 4.2, wordLenCopyThreshold: 5.6, sentenceLenOffset: 3, sentenceCopyThreshold: 14, provisional: true },
  // Indonesian: agglutinative → longer words; conversational → punchier lines.
  id: { wordLenCenter: 5.0, wordLenCopyThreshold: 6.4, sentenceLenOffset: 1, sentenceCopyThreshold: 12, provisional: true },
};

export function baseline(lang: SupportedLanguage): LanguageBaseline {
  return BASELINES[lang] ?? BASELINES.en;
}
