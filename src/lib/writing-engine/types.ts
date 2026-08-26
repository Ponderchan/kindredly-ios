/* THE WRITING ENGINE — shared types (Step 2).
   ────────────────────────────────────────────────────────────────────────
   Analyze locally, normalize globally, speak natively.

   Every language is read according to its own behaviour (extractors +
   per-language dictionaries), but all four collapse into the SAME normalized
   product structures below, so the rest of Kindredly never has to know which
   language someone wrote in. Nothing here is a quality score — every 0..100 is
   a POSITION on a stylistic axis, not "good/bad" writing.

   Hard rule this module lives under: the deterministic path is SYNCHRONOUS
   (readMood runs per-keystroke; hatch runs in render). A semantic/LLM layer
   may only ENRICH these signals asynchronously later — never gate the live
   read. And signature.ts (the cross-user match vector) is byte-frozen; this
   module layers on top and never feeds it. */

export type SupportedLanguage = "en" | "es" | "pt" | "id";
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["en", "es", "pt", "id"];

/* ── the nine, as a normalized vector ─────────────────────────────────────
   These keys are the product-facing style space. They map 1:1 onto the
   hatch-engine's existing DimKey (different spelling, same nine) via
   VECTOR_TO_DIM below, so the archetype/visual layers keep working unchanged.

   Each is a coordinate 0..100 with a documented meaning:
     wordChoice    0 concrete/everyday      → 100 abstract/ornate
     sentenceStyle 0 short/direct           → 100 long/layered
     rhythm        0 steady/measured        → 100 varied/bursty
     punctuation   0 sparse/light           → 100 expressive/dense
     flow          0 linear/one-track       → 100 branching/circling
     littleWords   0 firm/direct            → 100 hedged/qualifying
     emotion       0 implicit/show          → 100 explicit/tell
     quirks        0 conventional           → 100 distinctive/idiosyncratic
     shape         0 compact/block-like     → 100 fragmented/open */
export interface WritingAuraVector {
  wordChoice: number;
  sentenceStyle: number;
  rhythm: number;
  punctuation: number;
  flow: number;
  littleWords: number;
  emotion: number;
  quirks: number;
  shape: number;
}

export type AuraAxis = keyof WritingAuraVector;
export const AURA_AXES: AuraAxis[] = [
  "wordChoice",
  "sentenceStyle",
  "rhythm",
  "punctuation",
  "flow",
  "littleWords",
  "emotion",
  "quirks",
  "shape",
];

/* the bridge to the shipped hatch-engine's DimKey — so the archetype table,
   the Me-tab rows, the AuraCard, and the correspondent read all keep working
   while their numbers now come from language-relative normalization. */
export const AXIS_TO_DIM: Record<AuraAxis, string> = {
  wordChoice: "vocabulary",
  sentenceStyle: "sentence",
  rhythm: "rhythm",
  punctuation: "punctuation",
  flow: "structure", // "how ideas move / where a thought lands"
  littleWords: "function",
  emotion: "emotion",
  quirks: "quirks",
  shape: "perspective", // nearest existing dim; see NOTE in compute-vector
};

/* Each dimension is more than a number: it carries how much we trust it, how
   stable it is across pieces, and the raw features it was built from (kept for
   fingerprinting and debugging — never shown as metric-speak). */
export interface AuraDimensionResult {
  value: number; // 0..100 style coordinate
  confidence: number; // 0..1
  stability: number; // 0..1 across pieces/context
  evidenceCount: number;
  rawFeatures: Record<string, number | string | boolean>;
}

export interface AuraAnalysisResult {
  language: SupportedLanguage;
  dimensions: Record<AuraAxis, AuraDimensionResult>;
}

/* ── raw, language-relative features ───────────────────────────────────────
   What an extractor emits BEFORE normalization. Deliberately raw and
   language-relative: an es writer's 18 words/sentence and an en writer's 14
   are both just numbers here — normalize.ts turns each into a percentile
   against its OWN language baseline. Never compare these across languages. */
export interface RawFeatures {
  // volume / evidence
  chars: number;
  tokens: number; // language-relative word-ish units
  pieces: number;
  sentences: number;
  // sentence shape
  meanSentenceLen: number;
  medianSentenceLen: number;
  sentenceLenVariance: number;
  fragmentRate: number; // 0..1 short sentences
  questionRate: number; // 0..1
  // word choice
  typeTokenRatio: number; // 0..1 lexical diversity
  meanWordLen: number;
  abstractRate: number; // 0..1 abstract-suffix / semantic
  // rhythm
  lengthSwings: number; // count of big consecutive-sentence jumps
  // punctuation (structural, not correctness)
  commaRate: number; // per token
  dashRate: number;
  ellipsisCount: number;
  terminalCount: number;
  // little words (per-language function/hedge profile)
  hedgeCount: number;
  firstPersonRate: number;
  outwardRate: number;
  // emotion — explicitness, NOT diagnosis
  affectHits: number;
  ownedEmotion: boolean;
  contrast: boolean; // holds positive + negative at once
  // flow / structure
  detailOpens: number;
  feelingEnds: number;
  // quirks — repeated, language-specific internet behaviour
  quirks: string[]; // stable trait ids, e.g. "lowercase-i", "laugh-jaja"
  // shape / formatting (largely language-neutral)
  lineBreaks: number;
  paragraphs: number;
  emoji: boolean;
}

/* ── born type: the hatch FIRST IMPRESSION ─────────────────────────────────
   One onboarding sample cannot form a stable 9-D aura. The hatch names only
   the 1–2 strongest early signals and a provisional born type. The twelve
   poetic archetypes still exist and are computed from the normalized vector
   downstream — born type is the warm, low-confidence opener, not a diagnosis. */
export type BornType = "spark" | "deep_one" | "storyteller" | "whisper";

export interface HatchRead {
  bornType: BornType;
  bornTypeConfidence: number; // 0..1
  strongestSignals: Array<{
    dimension: AuraAxis;
    direction: string; // e.g. "short/direct", "varied/bursty"
    confidence: number;
  }>;
}

/* ── courier mood: keep the SHIPPED taxonomy, make it multilingual ─────────
   Kindredly already has WrenMood (components/WrenBird). We do NOT invent a new
   product taxonomy; CourierMood is an alias so the engine speaks the existing
   language while this file documents the intent. */
export type CourierMood = "content" | "happy" | "listen" | "sleepy" | "curious" | "delight" | "think" | "wink" | "worry";

export interface CourierReadResult {
  mood: CourierMood;
  confidence: number; // 0..1
  signals: string[]; // stable signal ids that fired, for debugging
  language: SupportedLanguage;
}

/* ── journal themes: stable, language-independent IDs ──────────────────────
   "casa"/"rumah"/"home" all resolve to `home`; localization decides the spark
   text shown. Kept close to the shipped journal-sparks THEMES so migration is
   a re-labelling, not a new product vocabulary. */
export type JournalTheme =
  | "memory"
  | "family"
  | "friendship"
  | "missing_someone"
  | "tired"
  | "work"
  | "sleep"
  | "loneliness"
  | "small_win"
  | "uncertainty"
  | "future"
  | "home"
  | "love"
  | "something_unsaid";

export interface JournalThemeResult {
  theme: JournalTheme;
  confidence: number;
  evidence: string[];
}

export interface JournalThemeAnalysis {
  language: SupportedLanguage;
  themes: JournalThemeResult[];
}

/* ── per-language support (confidence, honestly) ───────────────────────────
   How well each axis is genuinely covered per language, from ACTUAL test
   coverage — never a permanent "en trustworthy / id not". Starts high for en
   (the shipped, snapshot-guarded path) and slightly lower where a language's
   resources are still thin; raised as tests land. Feeds confidence.ts. */
export interface LanguageSupportConfig {
  language: SupportedLanguage;
  featureSupport: Record<AuraAxis, number>; // 0..1 each
}
