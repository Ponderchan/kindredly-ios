import type { DimKey } from "../../hatch-engine";
import type { SupportedLanguage } from "../types";

/* THE STICKER LAYER — types.
   ────────────────────────────────────────────────────────────────────────
   The nine are nine KINDS OF OBSERVATION, not nine fixed stickers and not
   nine scores. A piece of the reader's own writing yields checkable
   observations; an observation, once it repeats across independent pieces,
   picks a sticker from a fixed catalog; several stable observations together
   pick the aura title. Nothing in this layer is a rating.

   Pure module: no React, no i18n, no storage. Everything here runs under
   plain node (npx tsx …/tests/stickers.test.ts). Copy is ids only; the RN
   side (lib/sticker-copy) turns ids into the reader's language. */

export const RULE_VERSION = "stickers-1";

export type PieceSource = "letter" | "reply" | "sealed" | "hatch";

/** one thing the reader wrote, as the engine sees it */
export interface Piece {
  id: string;
  /** content revision — a hash of the text; editing yields a new revision,
      re-saving the same text does not */
  revision: string;
  source: PieceSource;
  text: string;
  /** ISO timestamp; "" when unknown (the hatch line) */
  createdAt: string;
  /** a language stamped on the piece itself, if any */
  lang?: string | null;
}

export type Verdict = "support" | "contra" | "unknown";

export interface Span {
  pieceId: string;
  revision: string;
  /** the quotable range — a whole sentence, so the quote reads as language */
  start: number;
  end: number;
  /** the exact words the rule fired on, inside [start, end) — for highlight */
  mark?: [number, number];
  source: PieceSource;
}

/** what one piece says about one trait */
export interface PieceVerdict {
  verdict: Verdict;
  spans: Span[]; // evidence, only for support
}

/* every trait a rule can vote on. Writing traits live in the nine
   dimensions; the list is the source of truth for TraitId, so a sticker in
   the catalog cannot point at a trait no rule produces. */
export const TRAITS = [
  // vocabulary
  "concrete_detail", "abstract_ideas", "big_words", "repeat_word", "number_person",
  // sentence
  "short_lines", "long_lines", "one_liner", "fragment_fan", "question_asker", "list_maker",
  // rhythm
  "steady_beat", "tempo_shift", "slow_burner", "quick_note", "paragraph_person", "wall_of_text",
  // emotion
  "heart_open", "quiet_feeling", "sunny_side", "heavy_heart", "both_ways", "feeling_namer",
  // perspective
  "inside_voice", "world_watch", "you_person", "we_person", "third_person",
  // function words
  "maybe_maker", "thought_turn", "firm_voice", "honestly_person", "reason_giver", "and_then",
  // punctuation
  "full_stop", "dash_lover", "ellipsis_keeper", "comma_breath", "exclaimer", "side_noter", "quote_collector", "stream_conscious", "semicolon",
  // structure
  "scene_open", "point_first", "time_stamper", "greeter", "ps_writer", "circle_back",
  // quirks
  "open_ender", "lowercase_loyal", "emoji_accent", "caps_locker", "laugh_tracker", "stretcher",
] as const;
export type TraitId = (typeof TRAITS)[number];

export type ObservationState = "unknown" | "emerging" | "established" | "balanced";

/** the spec's TraitObservation, aggregated across the current window */
export interface TraitObservation {
  dimension: DimKey;
  traitId: TraitId;
  stickerId: string | null;
  state: ObservationState;
  /** the frame language most of the supporting pieces were read in */
  language: SupportedLanguage | "mixed" | "unknown";
  eligiblePieceCount: number;
  supportingPieceCount: number;
  contradictingPieceCount: number;
  /** distinct writing days among supporting pieces */
  supportingDays: number;
  metrics: Record<string, number>;
  evidence: Span[];
  firstSeenAt: string; // ISO day of the earliest supporting piece
  assessedAt: string; // ISO day the window was assessed
  ruleVersion: string;
}

/* ── per-piece features (raw, language-relative, never shown) ── */

export type Ending = "period" | "exclaim" | "question" | "ellipsis" | "none";

export interface Sentence {
  start: number;
  end: number;
  text: string;
  words: number;
  ending: Ending;
}

export interface PieceFeatures {
  piece: Piece;
  lang: SupportedLanguage | null; // null → language-neutral traits only
  words: number;
  sentences: Sentence[];
  /** enough text for whole-piece structure/ending reads */
  full: boolean;
  /** each trait's verdict for this piece */
  verdicts: Partial<Record<TraitId, PieceVerdict>>;
  /** the ISO day (local) this piece was written, "" if unknown */
  day: string;
}

/* ── resolved outputs ── */

export interface ResolvedSticker {
  stickerId: string;
  traitId: TraitId;
  dimension: DimKey;
  state: "emerging" | "established";
  /** "{n} of your last {m}" — pieces, from the current window */
  supporting: number;
  eligible: number;
  evidence: Span[];
  since: string; // ISO day
}

export type TitleState = "none" | "partial" | "formed";

export interface AuraTitle {
  state: TitleState;
  noun: string | null; // e.g. "observer"
  adjective: string | null; // e.g. "quiet" — null while partial
  /** ids of the observations the title rests on */
  basis: TraitId[];
}

export interface StickerReadout {
  ruleVersion: string;
  assessedAt: string;
  /** pieces in the current window, after dedup and eligibility */
  windowPieces: number;
  /** distinct writing days in the window */
  writingDays: number;
  observations: TraitObservation[];
  /** one representative per dimension, when the dimension has one */
  byDimension: Partial<Record<DimKey, ResolvedSticker>>;
  /** the home three: established first, complementary, deduped */
  home: ResolvedSticker[];
  /** every sticker that holds right now, seats and extras alike */
  board: ResolvedSticker[];
  title: AuraTitle;
  /** counted, from dated letters/replies only: over half left 22:00–06:00 */
  nightShare: number | null;
}

/* ── persisted state for stability (debounce) ── */

export interface DimensionHold {
  stickerId: string;
  since: string; // ISO day first adopted
}

export interface Candidate {
  stickerId: string;
  wins: number; // consecutive review batches won
}

export interface StickerState {
  ruleVersion: string;
  current: Partial<Record<DimKey, DimensionHold>>;
  candidates: Partial<Record<DimKey, Candidate>>;
  /** window piece count at the last review batch */
  reviewedAt: number;
  /** retired stickers, with their period */
  history: { stickerId: string; dimension: DimKey; from: string; to: string }[];
  title: AuraTitle | null;
}

export const EMPTY_STATE: StickerState = {
  ruleVersion: RULE_VERSION,
  current: {},
  candidates: {},
  reviewedAt: 0,
  history: [],
  title: null,
};

/* ── the share snapshot: never private text ── */

export interface ShareSnapshot {
  ruleVersion: string;
  createdAt: string;
  title: AuraTitle;
  stickerIds: string[]; // established only
  phase: string;
}
