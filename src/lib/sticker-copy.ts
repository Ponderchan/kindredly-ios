import { t } from "./i18n";
import type { AuraPhase } from "./aura";
import { STICKER_BY_ID, type AuraTitle, type ResolvedSticker, type Span, type TraitObservation } from "./writing-engine/stickers";
import type { DimKey } from "./hatch-engine";

/* THE STICKER COPY LAYER — ids in, the reader's language out.
   ────────────────────────────────────────────────────────────────────────
   The engine never holds a display string. Every sentence a reader sees
   about their writing is a fixed template from the strings table, filled
   with counted facts; the quote is sliced from their own words. Nothing is
   generated. */

export const stickerName = (id: string): string => t(`st.${id}.name`);

/* traits whose evidence marks are words worth repeating on the sticker —
   "rain, sill, water" says more than a count; the rest get a short template */
const WORDY = new Set(["detail_collector", "idea_explorer", "maybe_maker", "thought_turner", "heart_on_page", "inside_voice", "world_watcher", "dash_lover", "ellipsis_keeper", "emoji_accent"]);

/** the fixed one-line meaning under a sticker's name on the sheet */
export const stickerShort = (id: string): string => t(`st.${id}.short`);

/** the second line on a sticker: the words it fired on, or a counted phrase */
export function stickerSub(s: ResolvedSticker, pieceText: Record<string, { text: string }>): string {
  if (WORDY.has(s.stickerId)) {
    const words: string[] = [];
    for (const e of s.evidence) {
      const p = pieceText[e.pieceId];
      if (!p || !e.mark) continue;
      const w = p.text.slice(e.mark[0], e.mark[1]).trim().toLowerCase();
      if (w && !words.includes(w)) words.push(w);
      if (words.length === 3) break;
    }
    if (words.length) return words.join(", ");
  }
  return t(`st.${s.stickerId}.sub`, { n: s.supporting, m: s.eligible });
}

/** the read, in her words — "You often…" once established, "In these
    letters…" while the signs are first */
export function stickerLine(s: ResolvedSticker): string {
  return s.state === "established" ? t(`st.${s.stickerId}.line`) : t(`st.${s.stickerId}.first`, { n: s.supporting });
}

/** "{n} of your last {m} pieces {what}." — counted from the current window */
export function stickerCount(s: ResolvedSticker): string {
  return t("st.countOf", { n: s.supporting, m: s.eligible, what: t(`st.${s.stickerId}.what`) });
}

export function observationState(state: TraitObservation["state"]): string {
  return t(`as.${state}`);
}

/** where a quote comes from, by source — the sealed page says so */
export function evidenceLabel(source: Span["source"]): string {
  return t(`st.evidence.${source}`);
}

/* ── the title ── */
export function titleName(title: AuraTitle | null | undefined): string {
  if (!title || !title.noun) return "";
  const noun = t(`an.noun.${title.noun}`);
  if (!title.adjective) return t("an.partial", { noun });
  return t("an.format", { adj: t(`an.adj.${title.adjective}`), noun });
}

export function titleDesc(title: AuraTitle | null | undefined): string {
  if (!title || !title.noun) return "";
  const head = t(`an.desc.${title.noun}`);
  return title.adjective ? `${head} ${t(`an.tail.${title.adjective}`)}` : head;
}

/* ── phases ── */
export const phaseLabel = (p: AuraPhase): string => t(`ap.label.${p}`);
export const phaseHeadline = (p: AuraPhase): string => t(`ap.headline.${p}`);
export const phaseFoot = (p: AuraPhase): string => t(`ap.foot.${p}`);
export const phaseCta = (p: AuraPhase): string => t(`ap.cta.${p}`);

/* ── fixed looks: COLOUR IS THE DIMENSION.
   Nine kinds of observation, nine inks. A sticker wears its dimension's
   colour, so the three on the card are always three different colours and
   the same colour always means the same kind of thing (blue is always word
   choice, green is always feeling, coral is always a quirk). Two stickers
   of one dimension never show together, so they can share the ink. The
   shape follows the dimension as well. Nothing here is chosen at runtime. ── */
export interface StickerLook {
  bg: string;
  fg: string;
  border: string;
  radius: number;
  tilt: string;
}

export const DIMENSION_INK: Record<DimKey, { bg: string; fg: string; shape: "pill" | "tag" }> = {
  vocabulary: { bg: "#5B55FF", fg: "#FFFFFF", shape: "pill" }, // word choice — pen blue
  emotion: { bg: "#8CC4A2", fg: "#1E1B35", shape: "tag" }, // feeling — moss
  quirks: { bg: "#F2887E", fg: "#1E1B35", shape: "pill" }, // your tics — coral
  sentence: { bg: "#1E1B35", fg: "#FFFFFF", shape: "tag" }, // sentence shape — ink
  rhythm: { bg: "#E9C15A", fg: "#1E1B35", shape: "tag" }, // rhythm — gold
  perspective: { bg: "#E4E1FA", fg: "#3D38C9", shape: "pill" }, // way of seeing — lavender
  function: { bg: "#F5B99F", fg: "#1E1B35", shape: "tag" }, // little words — peach
  punctuation: { bg: "#B9B4F0", fg: "#1E1B35", shape: "tag" }, // pauses — periwinkle
  structure: { bg: "#A9D0F2", fg: "#1E1B35", shape: "tag" }, // structure — sky
};

const TILT = ["-3deg", "2deg", "-2deg", "2.5deg", "-1.5deg", "1.5deg"];

export function stickerLook(id: string, i = 0): StickerLook {
  const dim = STICKER_BY_ID[id]?.dimension ?? "vocabulary";
  const ink = DIMENSION_INK[dim];
  return { bg: ink.bg, fg: ink.fg, border: ink.bg, radius: ink.shape === "pill" ? 999 : 8, tilt: TILT[i % TILT.length] };
}

/** the glyph for a sticker's icon id — plain characters, so it works in any font */
export function stickerGlyph(id: string): string {
  const G: Record<string, string> = {
    magnifier: "⌕",
    compass: "◎",
    arrow: "→",
    wave: "∿",
    metronome: "∣",
    bolt: "↯",
    heart: "♥",
    bubble: "◌",
    pen: "✎",
    window: "▢",
    tilde: "~",
    turn: "↩",
    dot: "•",
    dash: "—",
    dots: "…",
    frame: "▣",
    pin: "◆",
    question: "?",
    lowercase: "a",
    sparkle: "✦",
  };
  return G[STICKER_BY_ID[id]?.icon ?? ""] ?? "•";
}

/** lowercase the first character — for "{wren} has noticed something: you often…" */
export const lc = (s: string): string => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
