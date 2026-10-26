import type { Aura } from "../../lib/aura";
import type { DimKey } from "../../lib/hatch-engine";
import type { Chip, StickerLook } from "../../lib/sticker-copy";
import type { UsageGroup, UsageSticker } from "../../lib/usage-stickers";
import type { ResolvedSticker, TraitObservation } from "../../lib/writing-engine/stickers";
import type {
  KAuraArtKind,
  KAuraDim,
  KAuraPause,
  KAuraRoomStrings,
  KAuraShareStrings,
  KAuraSticker,
  KAuraUsageGroup,
  KAuraUsageItem,
  KAuraWord,
} from "../../../modules/kindredly-ui/src/Aura";

/* THE WRITING AURA ROOM AND ITS SHARE CARD, AS DATA (owner decision 2026-10-26: the SwiftUI
   room and card ship in 1.0.7). Pure: no React, no React Native, no i18n — every word and every
   look comes in through `w` (aura-words.ts binds the app's own), so
   `node src/screens/aura/aura-model.test.ts` locks the rules.

   It decides exactly what the React Native page decides (app/aura.tsx AuraRN, app/aura-card.tsx
   AuraShareCardRN, components/AuraCard AuraTicket), so a remote flip between the two renderers
   never changes a word, a count or what travels:
   - the nine, in their order: what she found there (the dimension's sticker, or "no lean yet"
     when the signs balance, or "still reading"), its line and count, the state, one sentence of
     yours from the first piece of evidence still on the phone, where it came from, and the read
     sheet behind it (the whole piece split round the words, the sticker's name and line);
   - the habits: the words you lean on (the first two largest, every other one green) with the
     first sentence each appears in, the pauses as shares of the most counted, the writing
     stickers without a seat on the card, and the counted ones by group with a lock on the
     private ones;
   - the share card: the name (the title once formed, the noun's while it forms, else the
     phase's headline), the stickers that may travel (writing ones, then only PUBLIC counted
     ones: the snapshot rule), the sentence, FORMED FROM n, the scene and the face. Never a
     quote and never a piece id. */

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

/** The words and looks the model needs from the app (aura-words.ts auraWords()). */
export type AuraWords = {
  t: TFn;
  dimLabel: (d: DimKey) => string;
  stickerName: (id: string) => string;
  stickerLine: (s: ResolvedSticker) => string;
  stickerCount: (s: ResolvedSticker) => string;
  observationState: (state: TraitObservation["state"]) => string;
  usageGroupLabel: (g: UsageGroup) => string;
  usageLine: (u: UsageSticker) => string;
  stickerLook: (id: string, i: number) => StickerLook;
  /** "Oct 12" in the reader's language */
  dateShort: (iso: string) => string;
};

/* ── order and small rules ─────────────────────────────────────────────── */

export const ORDER: readonly DimKey[] = ["sentence", "structure", "perspective", "rhythm", "function", "vocabulary", "punctuation", "emotion", "quirks"];
export const GROUPS: readonly UsageGroup[] = ["time", "habit", "subject", "courier", "sealed"];

/** "01" … "09" */
export const pad2 = (n: number): string => String(n).padStart(2, "0");

/** A StickerChip's look as the Swift chip takes it. `state` "emerging" draws it dashed. */
export function stickerRecord(w: AuraWords, id: string, i: number, state?: ResolvedSticker["state"]): KAuraSticker {
  const look = w.stickerLook(id, i);
  const tilt = parseFloat(look.tilt);
  return {
    id,
    name: w.stickerName(id),
    bg: look.bg,
    fg: look.fg,
    border: look.border,
    pill: look.radius >= 999,
    tilt: Number.isFinite(tilt) ? tilt : 0,
    trying: state === "emerging",
  };
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The first sentence of yours a word appears in (the React Native page's wordHit), or "". */
export function sentenceWith(pieceText: Aura["pieceText"], word: string): string {
  if (!word) return "";
  const re = new RegExp(`(^|[^\\p{L}])${escapeRe(word)}(?=[^\\p{L}]|$)`, "iu");
  for (const p of Object.values(pieceText)) {
    const sent = p.text.split(/(?<=[.!?。！？])\s+|\n+/).find((x) => re.test(x));
    if (sent) return sent.trim();
  }
  return "";
}

/* ── the room ──────────────────────────────────────────────────────────── */

/** One of the nine. `quoteLines` is the reader's Letter font's room for four lines (letterFitLines). */
export function buildDim(aura: Aura, d: DimKey, i: number, w: AuraWords, quoteLines = 4): KAuraDim {
  const { t } = w;
  const st = aura.stickers;
  const rep = st?.byDimension[d] ?? null;
  const obs = (st?.observations ?? []).filter((o) => o.dimension === d);
  const state: TraitObservation["state"] = rep ? rep.state : obs.some((o) => o.state === "balanced") ? "balanced" : "unknown";
  const ev = rep?.evidence.find((e) => aura.pieceText[e.pieceId]) ?? null;
  const piece = ev ? aura.pieceText[ev.pieceId] : null;
  const quote = ev && piece ? piece.text.slice(ev.start, ev.end) : "";
  const when = piece?.createdAt ? w.dateShort(piece.createdAt) : "";
  const from = ev ? t(`wa.quoteFrom.${ev.source}`, { d: when }) : "";
  return {
    key: d,
    number: pad2(i + 1),
    label: w.dimLabel(d),
    counter: t("wa.dimOf", { i: i + 1 }),
    name: rep ? w.stickerName(rep.stickerId) : state === "balanced" ? t("wa.noLean") : t("wa.stillReading"),
    line: rep ? `${w.stickerLine(rep)} ${w.stickerCount(rep)}` : state === "balanced" ? t("st.noLean") : t("wa.fillsIn"),
    state: rep ? w.observationState(rep.state) : "",
    established: rep?.state === "established",
    quote,
    quoteFrom: quote ? from : "",
    quoteLines,
    // the door to the whole sentence and what it was read as
    reading:
      rep && quote && ev && piece
        ? {
            before: piece.text.slice(0, ev.start),
            marked: piece.text.slice(ev.start, ev.end),
            after: piece.text.slice(ev.end),
            from,
            name: w.stickerName(rep.stickerId),
            line: w.stickerLine(rep),
          }
        : null,
  };
}

export function buildWords(aura: Aura, counts: readonly (readonly [string, number])[]): KAuraWord[] {
  return counts.map(([word, count], i) => ({
    word,
    count,
    tier: i < 2 ? 0 : i < 4 ? 1 : 2,
    green: i % 2 === 1,
    hit: sentenceWith(aura.pieceText, word),
  }));
}

export function buildPauses(counts: readonly (readonly [string, number])[]): KAuraPause[] {
  const max = Math.max(1, ...counts.map((p) => p[1]));
  return counts.map(([label, count]) => ({ label, count, fraction: count / max }));
}

/** The writing stickers that hold but have no seat on the card. */
export function buildExtras(aura: Aura, w: AuraWords): KAuraUsageItem[] {
  const home = new Set((aura.stickers?.home ?? []).map((s) => s.stickerId));
  return (aura.stickers?.board ?? [])
    .filter((s) => !home.has(s.stickerId))
    .map((s, i) => ({ sticker: stickerRecord(w, s.stickerId, i), line: w.stickerCount(s), privateLabel: "" }));
}

/** What the product counted, by group in the room's order; groups with nothing are left out. */
export function buildGroups(aura: Aura, w: AuraWords): KAuraUsageGroup[] {
  return GROUPS.map((g) => ({ g, items: (aura.usage ?? []).filter((u) => u.group === g) }))
    .filter((x) => x.items.length)
    .map(({ g, items }) => ({
      key: g,
      label: w.usageGroupLabel(g),
      items: items.map((u, i) => ({ sticker: stickerRecord(w, u.id, i), line: w.usageLine(u), privateLabel: u.private ? w.t("us.private") : "" })),
    }));
}

export type AuraRoomBody = {
  dims: KAuraDim[];
  fromPieces: string;
  words: KAuraWord[];
  pauses: KAuraPause[];
  extras: KAuraUsageItem[];
  groups: KAuraUsageGroup[];
};

/** Everything under the lenses but the card (MeNative nativeAura builds that, as Me does). */
export function buildAuraRoom(
  aura: Aura,
  w: AuraWords,
  counted: { words: readonly (readonly [string, number])[]; pauses: readonly (readonly [string, number])[] },
  quoteLines = 4,
): AuraRoomBody {
  return {
    dims: ORDER.map((d, i) => buildDim(aura, d, i, w, quoteLines)),
    fromPieces: w.t("wa.fromPieces", { n: aura.pieces }),
    words: buildWords(aura, counted.words),
    pauses: buildPauses(counted.pauses),
    extras: buildExtras(aura, w),
    groups: buildGroups(aura, w),
  };
}

/** The room's words, in the reader's language. */
export function auraRoomStrings(t: TFn, usageGroupLabel: (g: UsageGroup) => string): KAuraRoomStrings {
  return {
    title: t("wa.title"),
    back: t("a11y.back"),
    share: t("ac.shareSm"),
    tabs: [t("wa.tab.portrait"), t("wa.tab.dims"), t("wa.tab.habits")],
    allDims: t("wa.allDims"),
    swipe: t("wa.swipe"),
    prev: t("sh.a11y.prevDim"),
    next: t("sh.a11y.nextDim"),
    seeRead: t("wa.seeRead"),
    readTitle: t("wa.readTitle"),
    nine: t("wa.nine"),
    nineSub: t("wa.nineSub"),
    close: t("wren.trackClose"),
    scope: t("wa.scope"),
    wordsTitle: t("wa.words"),
    wordsNone: t("wa.wordsNone"),
    wordsHint: t("wa.wordsHint"),
    pausesTitle: t("wa.pauses"),
    pausesHint: t("wa.pausesHint"),
    extrasLabel: t("us.more"),
    usageNoneLabel: usageGroupLabel("habit"),
    usageNone: t("us.none"),
    scopeRow: t("wa.scopeRow"),
    scopeTitle: t("wa.scopeTitle"),
    scopeLetters: t("wa.scopeLetters"),
    scopeLettersSub: t("wa.scopeLettersSub"),
    included: t("wa.included"),
    scopeSealed: t("wa.scopeSealed"),
    scopeSealedSub: t("wa.scopeSealedSub"),
    scopeNote: t("wa.scopeNote"),
    done: t("wa.done"),
  };
}

/* ── the share card ────────────────────────────────────────────────────── */

/** Which of the two picture sets the card's scene comes from, and its id there. */
export type TicketScene = { kind: KAuraArtKind; set: "scenes" | "sketches" | null; id: string | null; develop: number };

/** "quiet-observer" — a scene's id, the AuraCard rule (adjective "quiet" stands in while unknown). */
export const sceneKey = (adj: string | null, noun: string): string => `${(adj ?? "quiet").replace(/_/g, "-")}-${noun.replace(/_/g, "-")}`;

/** The card's scene (components/AuraCard AuraArt): the title's scene once formed, the noun's
    sketch while it forms, the faded quiet observer before anything, else the first lines. */
export function ticketScene(aura: Aura): TicketScene {
  const title = aura.stickers?.title ?? null;
  if (aura.phase === "formed" && title?.noun && title.adjective) return { kind: "scene", set: "scenes", id: sceneKey(title.adjective, title.noun), develop: 1 };
  if (title?.noun) return { kind: "sketch", set: "sketches", id: sceneKey(null, title.noun), develop: 0.5 };
  if (aura.phase === "empty") return { kind: "empty", set: "sketches", id: "quiet-observer", develop: 0 };
  return { kind: "lines", set: null, id: null, develop: 0 };
}

/** What the share card needs beyond `w` (sticker-copy's title and chip helpers, lib/mosaic). */
export type TicketWords = AuraWords & {
  titleName: (title: NonNullable<Aura["stickers"]>["title"] | null | undefined) => string;
  titleDesc: (title: NonNullable<Aura["stickers"]>["title"] | null | undefined) => string;
  phaseHeadline: (p: Aura["phase"]) => string;
  chipsFor: (home: ResolvedSticker[], usage: UsageSticker[], max: number, opts?: { publicOnly?: boolean }) => Chip[];
  mosaicMask: (seed: string, develop: number) => number;
};

export type TicketVM = {
  brand: string;
  label: string;
  meInWords: string;
  scene: TicketScene;
  /** the face drawn in the slot when its picture is missing */
  artMask: number;
  name: string;
  stickers: KAuraSticker[];
  desc: string;
  formedFrom: string;
  faceMask: number;
  a11y: string;
};

/** The card that travels (W14 · 03). `who` is your handle ("me" without one), `seed` your id. */
export function buildTicket(aura: Aura, w: TicketWords, who: string, seed: string): TicketVM {
  const { t } = w;
  const st = aura.stickers;
  const name = aura.phase === "formed" ? w.titleName(st?.title) : st?.title?.noun ? w.titleName(st.title) : w.phaseHeadline(aura.phase);
  // what travels: the writing stickers, then only the counted ones that may leave the phone
  const held = w.chipsFor(st?.home ?? [], aura.usage, 3, { publicOnly: true });
  const desc = st?.title?.noun ? w.titleDesc(st.title) : held[0] ? held[0].line : "";
  const letters = st?.windowPieces ?? aura.pieces;
  const scene = ticketScene(aura);
  const stickers = held.map((s, i) => stickerRecord(w, s.id, i));
  const label = t("ap.title");
  const formedFrom = t("ac.formedFrom", { n: letters });
  return {
    brand: "KINDREDLY",
    label,
    meInWords: t("ac.meInWords", { name: who }),
    scene,
    artMask: scene.develop > 0 ? w.mosaicMask(seed, scene.develop) : 0,
    name,
    stickers,
    desc,
    formedFrom,
    faceMask: w.mosaicMask(seed, 1),
    a11y: [label, name, ...stickers.map((s) => s.name), desc, formedFrom].filter(Boolean).join(". "),
  };
}

/** The share page's words. `wren` is the courier's name. */
export function auraShareStrings(t: TFn, wren: string): KAuraShareStrings {
  return {
    title: t("ac.shareYourAura"),
    back: t("sh.a11y.back"),
    share: t("ac.shareCard"),
    save: t("ac.saveImage"),
    working: t("ac.working"),
    readingFrom: t("ac.readingFrom", { name: wren }),
    onlyCard: t("ac.onlyCard"),
  };
}

/** The words that ride along with a shared picture: the card's own, never a line from a letter
    (app/aura-card.tsx cardWords). */
export function shareMessage(aura: Aura, w: Pick<TicketWords, "t" | "titleName" | "stickerName">, wren: string): string {
  const held = (aura.stickers?.home ?? []).slice(0, 3).map((s) => w.stickerName(s.stickerId).toLowerCase());
  return aura.phase === "formed"
    ? w.t("ac.shareTitle", { title: dearName(w.titleName(aura.stickers?.title)), name: wren })
    : w.t("ac.shareStickers", { list: held.length ? held.join(", ") : "—", name: wren });
}

/** components/AuraCard dear: "The Quiet Observer" → "Quiet Observer" */
export const dearName = (name: string): string => name.replace(/^The\s+/i, "");
