import type { DimKey } from "../../hatch-engine";
import type { TraitId } from "./types";

/* THE CATALOG — fixed identities, never generated.
   ────────────────────────────────────────────────────────────────────────
   A rule returns a trait id; the catalog says which sticker that trait
   wears: its shape, its colour token, its glyph, and which stickers it
   cannot share the home row with. Names and lines live in the strings
   table under `st.<id>.*` so the owner can rename a sticker without
   touching a rule. Nothing here changes at runtime. */

export type StickerShape = "pill" | "tag" | "stamp" | "round";
/** colour tokens — the theme decides the actual ink */
export type StickerTone = "pen" | "ink" | "moss" | "coral" | "brass" | "mist" | "peach" | "sky" | "paper";

export interface StickerDef {
  id: string;
  trait: TraitId;
  dimension: DimKey;
  shape: StickerShape;
  tone: StickerTone;
  icon: string; // glyph id, resolved by the renderer
  /** stickers that cannot appear beside this one on the home row */
  conflicts: string[];
}

export const STICKERS: StickerDef[] = [
  // vocabulary
  { id: "detail_collector", trait: "concrete_detail", dimension: "vocabulary", shape: "pill", tone: "pen", icon: "magnifier", conflicts: [] },
  { id: "idea_explorer", trait: "abstract_ideas", dimension: "vocabulary", shape: "round", tone: "sky", icon: "compass", conflicts: [] },
  // sentence
  { id: "short_sweet", trait: "short_lines", dimension: "sentence", shape: "stamp", tone: "ink", icon: "arrow", conflicts: ["sentence_weaver"] },
  { id: "sentence_weaver", trait: "long_lines", dimension: "sentence", shape: "tag", tone: "mist", icon: "wave", conflicts: ["short_sweet"] },
  // rhythm
  { id: "steady_beat", trait: "steady_beat", dimension: "rhythm", shape: "tag", tone: "moss", icon: "metronome", conflicts: ["tempo_shifter"] },
  { id: "tempo_shifter", trait: "tempo_shift", dimension: "rhythm", shape: "round", tone: "coral", icon: "bolt", conflicts: ["steady_beat"] },
  // emotion
  { id: "heart_on_page", trait: "heart_open", dimension: "emotion", shape: "round", tone: "coral", icon: "heart", conflicts: ["quiet_type"] },
  { id: "quiet_type", trait: "quiet_feeling", dimension: "emotion", shape: "tag", tone: "moss", icon: "bubble", conflicts: ["heart_on_page"] },
  // perspective
  { id: "inside_voice", trait: "inside_voice", dimension: "perspective", shape: "pill", tone: "paper", icon: "pen", conflicts: ["world_watcher"] },
  { id: "world_watcher", trait: "world_watch", dimension: "perspective", shape: "pill", tone: "sky", icon: "window", conflicts: ["inside_voice"] },
  // function words
  { id: "maybe_maker", trait: "maybe_maker", dimension: "function", shape: "tag", tone: "peach", icon: "tilde", conflicts: [] },
  { id: "thought_turner", trait: "thought_turn", dimension: "function", shape: "tag", tone: "peach", icon: "turn", conflicts: [] },
  { id: "straight_shooter", trait: "firm_voice", dimension: "function", shape: "tag", tone: "peach", icon: "arrow", conflicts: ["maybe_maker"] },
  // punctuation
  { id: "full_stop_fan", trait: "full_stop", dimension: "punctuation", shape: "stamp", tone: "mist", icon: "dot", conflicts: ["dash_lover", "ellipsis_keeper"] },
  { id: "dash_lover", trait: "dash_lover", dimension: "punctuation", shape: "stamp", tone: "brass", icon: "dash", conflicts: ["full_stop_fan"] },
  { id: "ellipsis_keeper", trait: "ellipsis_keeper", dimension: "punctuation", shape: "stamp", tone: "brass", icon: "dots", conflicts: ["full_stop_fan"] },
  { id: "room_maker", trait: "comma_breath", dimension: "punctuation", shape: "stamp", tone: "brass", icon: "wave", conflicts: [] },
  // structure
  { id: "scene_setter", trait: "scene_open", dimension: "structure", shape: "tag", tone: "sky", icon: "frame", conflicts: ["point_first"] },
  { id: "point_first", trait: "point_first", dimension: "structure", shape: "stamp", tone: "ink", icon: "pin", conflicts: ["scene_setter"] },
  // quirks
  { id: "open_ender", trait: "open_ender", dimension: "quirks", shape: "round", tone: "coral", icon: "question", conflicts: [] },
  { id: "lowercase_loyalist", trait: "lowercase_loyal", dimension: "quirks", shape: "pill", tone: "ink", icon: "lowercase", conflicts: [] },
  { id: "emoji_accent", trait: "emoji_accent", dimension: "quirks", shape: "round", tone: "peach", icon: "sparkle", conflicts: [] },
];

export const STICKER_BY_ID: Record<string, StickerDef> = Object.fromEntries(STICKERS.map((s) => [s.id, s]));
export const STICKER_BY_TRAIT: Partial<Record<TraitId, StickerDef>> = Object.fromEntries(STICKERS.map((s) => [s.trait, s]));

/** which traits belong to which dimension — including title-only traits */
export const TRAITS_OF: Record<DimKey, TraitId[]> = {
  vocabulary: ["concrete_detail", "abstract_ideas"],
  sentence: ["short_lines", "long_lines"],
  rhythm: ["steady_beat", "tempo_shift"],
  emotion: ["heart_open", "quiet_feeling"],
  perspective: ["inside_voice", "world_watch"],
  function: ["maybe_maker", "thought_turn", "firm_voice"],
  punctuation: ["full_stop", "dash_lover", "ellipsis_keeper", "comma_breath"],
  structure: ["scene_open", "point_first"],
  quirks: ["open_ender", "lowercase_loyal", "emoji_accent"],
};

export const DIMENSION_OF: Record<TraitId, DimKey> = Object.fromEntries(
  (Object.entries(TRAITS_OF) as [DimKey, TraitId[]][]).flatMap(([d, ts]) => ts.map((t) => [t, d])),
) as Record<TraitId, DimKey>;

/* ── the title library: adjective + noun, both earned ──
   Ten nouns from what you write about and how you build a letter, five
   adjectives from how it sounds (one of them counted from the clock, not
   the text). Every entry names the observations it REQUIRES and the ones
   that CONTRADICT it; a title is never the loudest single number. */

export interface TitleNoun {
  id: string;
  requires: TraitId[]; // any one of these, established
  conflicts: TraitId[]; // none of these may be established
}
/* an adjective sits on one of two axes — temperature (quiet ↔ unfiltered)
   or pace (quick ↔ slow) — and each axis reads its primary dimension first
   (emotion; sentence length) and falls back to its secondary (punctuation;
   rhythm) only when the primary has no established lean. Short lines with a
   steady beat is the commonest voice there is; it must not be a contradiction. */
export interface TitleAdjective {
  id: string;
  axis: "temperature" | "pace";
  tiers: { requires: TraitId[]; conflicts: TraitId[] }[];
}

export const TITLE_NOUNS: TitleNoun[] = [
  { id: "observer", requires: ["concrete_detail"], conflicts: ["abstract_ideas"] },
  { id: "dreamer", requires: ["abstract_ideas"], conflicts: ["concrete_detail"] },
  { id: "storyteller", requires: ["scene_open"], conflicts: ["point_first"] },
  { id: "minimalist", requires: ["point_first"], conflicts: ["scene_open"] },
  { id: "reporter", requires: ["world_watch"], conflicts: ["inside_voice"] },
  { id: "diarist", requires: ["inside_voice"], conflicts: ["world_watch"] },
  { id: "overthinker", requires: ["maybe_maker", "thought_turn"], conflicts: ["firm_voice"] },
  { id: "truth_teller", requires: ["firm_voice"], conflicts: ["maybe_maker"] },
  { id: "original", requires: ["open_ender", "lowercase_loyal", "emoji_accent"], conflicts: [] },
  // "classic" is the quirks dimension assessed and balanced — it is resolved
  // in resolve.ts as the fallback noun, never by evidence strength
];

export const TITLE_ADJECTIVES: TitleAdjective[] = [
  {
    id: "quiet",
    axis: "temperature",
    tiers: [
      { requires: ["quiet_feeling"], conflicts: ["heart_open"] },
      { requires: ["full_stop"], conflicts: ["dash_lover", "ellipsis_keeper"] },
    ],
  },
  {
    id: "unfiltered",
    axis: "temperature",
    tiers: [
      { requires: ["heart_open"], conflicts: ["quiet_feeling"] },
      { requires: ["dash_lover", "ellipsis_keeper"], conflicts: ["full_stop"] },
    ],
  },
  {
    id: "quick",
    axis: "pace",
    tiers: [
      { requires: ["short_lines"], conflicts: ["long_lines"] },
      { requires: ["tempo_shift"], conflicts: ["steady_beat"] },
    ],
  },
  {
    id: "slow",
    axis: "pace",
    tiers: [
      { requires: ["long_lines"], conflicts: ["short_lines"] },
      { requires: ["steady_beat"], conflicts: ["tempo_shift"] },
    ],
  },
  // "late_night" is counted from when letters were left, in resolve.ts
];
