import { t } from "./i18n";
import type { AuraPhase } from "./aura";
import { STICKER_BY_ID, type AuraTitle, type ResolvedSticker, type Span, type TraitObservation } from "./writing-engine/stickers";
import type { DimKey } from "./hatch-engine";
import { usageGroupOf, type UsageGroup, type UsageSticker } from "./usage-stickers";

/* THE STICKER COPY LAYER — ids in, the reader's language out.
   ────────────────────────────────────────────────────────────────────────
   The engine never holds a display string. Every sentence a reader sees
   about their writing is a fixed template from the strings table, filled
   with counted facts; the quote is sliced from their own words. Nothing is
   generated. */

/** a sticker's name — a writing sticker reads from `st.`, a counted one from `us.` */
export const stickerName = (id: string): string => t(STICKER_BY_ID[id] ? `st.${id}.name` : `us.${id}.name`);

/* ── one list for the card: writing stickers first, then what the product
   counted. `line` is the sentence under the name; `private` never travels. ── */
export interface Chip {
  id: string;
  kind: "writing" | "usage";
  line: string;
  private: boolean;
}

export function chipsFor(home: ResolvedSticker[], usage: UsageSticker[], max: number, opts?: { publicOnly?: boolean }): Chip[] {
  const out: Chip[] = home.map((s) => ({ id: s.stickerId, kind: "writing" as const, line: stickerLine(s), private: false }));
  for (const u of usage) {
    if (out.length >= max) break;
    if (opts?.publicOnly && u.private) continue;
    out.push({ id: u.id, kind: "usage", line: usageLine(u), private: u.private });
  }
  return out.slice(0, max);
}

/** the counted sentence under a usage sticker — "{n} of your {m} letters…" */
export function usageLine(u: UsageSticker): string {
  // a count of one reads as "one", where the sticker has that line
  if (u.n === 1 && t(`us.${u.id}.line1`) !== `us.${u.id}.line1`) return t(`us.${u.id}.line1`);
  return t(`us.${u.id}.line`, { n: u.n, m: u.of ?? u.n });
}
export const usageGroupLabel = (g: UsageGroup): string => t(`us.group.${g}`);

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
  sentence: { bg: "#1E1B35", fg: "#FFFFFF", shape: "tag" }, // sentence shape — black label
  rhythm: { bg: "#FFE14D", fg: "#1E1B35", shape: "tag" }, // rhythm — butter
  emotion: { bg: "#FF5FA8", fg: "#1E1B35", shape: "tag" }, // feeling — hot pink
  quirks: { bg: "#C8F542", fg: "#1E1B35", shape: "pill" }, // your tics — lime
  perspective: { bg: "#C9A8FF", fg: "#1E1B35", shape: "pill" }, // way of seeing — lilac
  function: { bg: "#FF8A4C", fg: "#1E1B35", shape: "tag" }, // little words — tangerine
  punctuation: { bg: "#7DEFC4", fg: "#1E1B35", shape: "tag" }, // pauses — mint
  structure: { bg: "#7AC7FF", fg: "#1E1B35", shape: "tag" }, // structure — sky
};

/* the counted labels are the other family: a clear sticker — white, a
   coloured edge, coloured name — so "what you do" never passes for "how
   you write". Five deep inks, one per group. */
export const USAGE_INK: Record<UsageGroup, { ink: string; shape: "pill" | "tag" }> = {
  time: { ink: "#5B2CC9", shape: "pill" }, // the hour on a letter — violet
  habit: { ink: "#0E9C8F", shape: "tag" }, // what you do with letters — teal
  subject: { ink: "#D9481F", shape: "pill" }, // what you write about — rust
  sealed: { ink: "#7A2E9E", shape: "tag" }, // the sealed room — plum
  courier: { ink: "#E0457B", shape: "pill" }, // the bird — raspberry
};

const TILT = ["-3deg", "2deg", "-2deg", "2.5deg", "-1.5deg", "1.5deg"];

export function stickerLook(id: string, i = 0): StickerLook {
  const dim = STICKER_BY_ID[id]?.dimension;
  const tilt = TILT[i % TILT.length];
  if (!dim) {
    const g = usageGroupOf(id);
    const u = USAGE_INK[g ?? "habit"];
    return { bg: "#FFFFFF", fg: u.ink, border: u.ink, radius: u.shape === "pill" ? 999 : 8, tilt };
  }
  const ink = DIMENSION_INK[dim];
  return { bg: ink.bg, fg: ink.fg, border: ink.bg, radius: ink.shape === "pill" ? 999 : 8, tilt };
}

/** lowercase the first character — for "{wren} has noticed something: you often…" */
export const lc = (s: string): string => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
