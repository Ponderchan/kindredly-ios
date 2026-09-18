import type { DimKey } from "../../hatch-engine";
import type { TraitId } from "./types";

/* THE CATALOG — fixed identities, never generated.
   ────────────────────────────────────────────────────────────────────────
   A rule returns a trait id; the catalog says which sticker that trait
   wears. Every sticker is A KIND OF PERSON (the owner's rule: a noun for
   someone, Gen-Z register — Night writer, Emoji lover), never a description
   of the text. Names and lines live in the strings table under `st.<id>.*`
   so a sticker can be renamed without touching a rule. Nothing here changes
   at runtime.

   Colour is the dimension (design/sticker-colours.md). `conflicts` keeps two
   opposite reads off the same home row. `rare` marks stickers that are a
   delight when they land and should never be filled in by default. */

export interface StickerDef {
  id: string;
  trait: TraitId;
  dimension: DimKey;
  /** stickers that cannot appear beside this one on the home row */
  conflicts: string[];
  rare?: boolean;
}

const S = (id: string, trait: TraitId, dimension: DimKey, conflicts: string[] = [], rare = false): StickerDef => ({ id, trait, dimension, conflicts, rare });

export const STICKERS: StickerDef[] = [
  // ── vocabulary ──
  S("detail_collector", "concrete_detail", "vocabulary", ["idea_explorer"]),
  S("idea_explorer", "abstract_ideas", "vocabulary", ["detail_collector"]),
  S("big_word_user", "big_words", "vocabulary"),
  S("repeat_offender", "repeat_word", "vocabulary"),
  S("number_person", "number_person", "vocabulary"),
  // ── sentence ──
  S("straight_shooter", "short_lines", "sentence", ["sentence_weaver"]),
  S("sentence_weaver", "long_lines", "sentence", ["straight_shooter"]),
  S("one_liner", "one_liner", "sentence", ["sentence_weaver"]),
  S("fragment_fan", "fragment_fan", "sentence"),
  S("question_asker", "question_asker", "sentence"),
  S("list_maker", "list_maker", "sentence", [], true),
  // ── rhythm ──
  S("steady_pacer", "steady_beat", "rhythm", ["tempo_shifter"]),
  S("tempo_shifter", "tempo_shift", "rhythm", ["steady_pacer"]),
  S("slow_burner", "slow_burner", "rhythm", ["quick_note"]),
  S("quick_note", "quick_note", "rhythm", ["slow_burner"]),
  S("paragraph_person", "paragraph_person", "rhythm", ["wall_of_text"]),
  S("wall_of_text", "wall_of_text", "rhythm", ["paragraph_person"]),
  // ── emotion ──
  S("open_book", "heart_open", "emotion", ["quiet_type"]),
  S("quiet_type", "quiet_feeling", "emotion", ["open_book"]),
  S("sunny_side", "sunny_side", "emotion", ["heavy_heart"]),
  S("heavy_heart", "heavy_heart", "emotion", ["sunny_side"]),
  S("both_ways", "both_ways", "emotion"),
  S("feeling_namer", "feeling_namer", "emotion"),
  // ── perspective ──
  S("inner_narrator", "inside_voice", "perspective", ["world_watcher"]),
  S("world_watcher", "world_watch", "perspective", ["inner_narrator"]),
  S("you_person", "you_person", "perspective"),
  S("we_person", "we_person", "perspective"),
  S("third_person_thinker", "third_person", "perspective", [], true),
  // ── function words ──
  S("maybe_maker", "maybe_maker", "function", ["plain_speaker"]),
  S("plot_twister", "thought_turn", "function"),
  S("plain_speaker", "firm_voice", "function", ["maybe_maker"]),
  S("honestly_person", "honestly_person", "function"),
  S("reason_giver", "reason_giver", "function"),
  S("and_then_person", "and_then", "function"),
  // ── punctuation ──
  S("full_stop_fan", "full_stop", "punctuation", ["dash_lover", "ellipsis_keeper", "exclaimer"]),
  S("dash_lover", "dash_lover", "punctuation", ["full_stop_fan"]),
  S("ellipsis_keeper", "ellipsis_keeper", "punctuation", ["full_stop_fan"]),
  S("room_maker", "comma_breath", "punctuation"),
  S("exclaimer", "exclaimer", "punctuation", ["full_stop_fan"]),
  S("side_noter", "side_noter", "punctuation"),
  S("quote_collector", "quote_collector", "punctuation"),
  S("stream_of_consciousness", "stream_conscious", "punctuation", ["full_stop_fan"]),
  S("semicolon_enjoyer", "semicolon", "punctuation", [], true),
  // ── structure ──
  S("scene_setter", "scene_open", "structure", ["headliner"]),
  S("headliner", "point_first", "structure", ["scene_setter"]),
  S("time_stamper", "time_stamper", "structure"),
  S("greeter", "greeter", "structure"),
  S("ps_writer", "ps_writer", "structure", [], true),
  S("circle_backer", "circle_back", "structure", [], true),
  // ── quirks ──
  S("curious_cat", "open_ender", "quirks"),
  S("lowercase_loyalist", "lowercase_loyal", "quirks", ["caps_locker"]),
  S("emoji_lover", "emoji_accent", "quirks"),
  S("caps_locker", "caps_locker", "quirks", ["lowercase_loyalist"]),
  S("laugh_tracker", "laugh_tracker", "quirks"),
  S("stretcher", "stretcher", "quirks"),
];

export const STICKER_BY_ID: Record<string, StickerDef> = Object.fromEntries(STICKERS.map((s) => [s.id, s]));
export const STICKER_BY_TRAIT: Partial<Record<TraitId, StickerDef>> = Object.fromEntries(STICKERS.map((s) => [s.trait, s]));

/** which traits belong to which dimension */
export const TRAITS_OF: Record<DimKey, TraitId[]> = {
  vocabulary: ["concrete_detail", "abstract_ideas", "big_words", "repeat_word", "number_person"],
  sentence: ["short_lines", "long_lines", "one_liner", "fragment_fan", "question_asker", "list_maker"],
  rhythm: ["steady_beat", "tempo_shift", "slow_burner", "quick_note", "paragraph_person", "wall_of_text"],
  emotion: ["heart_open", "quiet_feeling", "sunny_side", "heavy_heart", "both_ways", "feeling_namer"],
  perspective: ["inside_voice", "world_watch", "you_person", "we_person", "third_person"],
  function: ["maybe_maker", "thought_turn", "firm_voice", "honestly_person", "reason_giver", "and_then"],
  punctuation: ["full_stop", "dash_lover", "ellipsis_keeper", "comma_breath", "exclaimer", "side_noter", "quote_collector", "stream_conscious", "semicolon"],
  structure: ["scene_open", "point_first", "time_stamper", "greeter", "ps_writer", "circle_back"],
  quirks: ["open_ender", "lowercase_loyal", "emoji_accent", "caps_locker", "laugh_tracker", "stretcher"],
};

export const DIMENSION_OF: Record<TraitId, DimKey> = Object.fromEntries(
  (Object.entries(TRAITS_OF) as [DimKey, TraitId[]][]).flatMap(([d, ts]) => ts.map((t) => [t, d])),
) as Record<TraitId, DimKey>;

/* the representative of a dimension (the one the title reads) is chosen
   among these; the rest of the dimension's stickers are extras that show on
   the board but do not speak for the dimension */
export const PRIMARY_TRAITS: Partial<Record<DimKey, TraitId[]>> = {
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

/* ── the title library: adjective + noun, both earned ── */

export interface TitleNoun {
  id: string;
  requires: TraitId[]; // any one of these, established
  conflicts: TraitId[]; // none of these may be established
}
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
];

export const TITLE_ADJECTIVES: TitleAdjective[] = [
  { id: "quiet", axis: "temperature", tiers: [{ requires: ["quiet_feeling"], conflicts: ["heart_open"] }, { requires: ["full_stop"], conflicts: ["dash_lover", "ellipsis_keeper"] }] },
  { id: "unfiltered", axis: "temperature", tiers: [{ requires: ["heart_open"], conflicts: ["quiet_feeling"] }, { requires: ["dash_lover", "ellipsis_keeper"], conflicts: ["full_stop"] }] },
  { id: "quick", axis: "pace", tiers: [{ requires: ["short_lines"], conflicts: ["long_lines"] }, { requires: ["tempo_shift"], conflicts: ["steady_beat"] }] },
  { id: "slow", axis: "pace", tiers: [{ requires: ["long_lines"], conflicts: ["short_lines"] }, { requires: ["steady_beat"], conflicts: ["tempo_shift"] }] },
];
