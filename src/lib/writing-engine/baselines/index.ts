import { hasDictionary, type ReaderLanguage, type SupportedLanguage } from "../types";

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
  /** multiplies every sentence's word count first. The frozen counter
      (signature.scriptWords) makes kana and hangul two characters a word,
      which sizes a Japanese or Korean sentence at roughly six-tenths and
      a half of its English twin: parallel long sentences measured 16 and
      14 against 26, while one-word sentences already matched. An added
      offset can't fix a ratio — the short end would blow up — so the
      correction is a factor. Absent = 1. */
  sentenceLenScale?: number;
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
  // French: long clauses, words a little longer than English's.
  fr: { wordLenCenter: 4.3, wordLenCopyThreshold: 5.7, sentenceLenOffset: 3, sentenceCopyThreshold: 14, provisional: true },
  // German: compounds push the word centre well past five; sentences are
  // not the long ones the stereotype says — informal German is clipped.
  de: { wordLenCenter: 5.3, wordLenCopyThreshold: 6.8, sentenceLenOffset: 2, sentenceCopyThreshold: 13, provisional: true },
  // Italian: close to Spanish.
  it: { wordLenCenter: 4.4, wordLenCopyThreshold: 5.8, sentenceLenOffset: 3, sentenceCopyThreshold: 14, provisional: true },
  /* Japanese and Korean: "words" are what signature.scriptWords makes of the
     script (kana and hangul at 2 characters a word, han at 1.7). Measured
     on parallel sentences that runs SHORT, not long — ja 16.3 and ko 13.8
     words where the English twin has 26, with one-word sentences already
     level — so the correction is a scale (×1.6, ×1.9), not the additive
     offset first guessed. The word-length numbers are unused: vocabulary
     reads these two through its own proxies (hatch-engine). */
  ja: { wordLenCenter: 3.6, wordLenCopyThreshold: 5, sentenceLenOffset: 0, sentenceLenScale: 1.6, sentenceCopyThreshold: 11, provisional: true },
  ko: { wordLenCenter: 3.6, wordLenCopyThreshold: 5, sentenceLenOffset: 0, sentenceLenScale: 1.9, sentenceCopyThreshold: 11, provisional: true },
};

export function baseline(lang: ReaderLanguage): LanguageBaseline {
  return hasDictionary(lang) ? (BASELINES[lang] ?? BASELINES.en) : BASELINES.en;
}
