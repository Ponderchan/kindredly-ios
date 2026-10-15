import type { PoolLetter } from "../../lib/db";
import type { Signal } from "../../lib/today-signal";
import type { WriteFail } from "../../lib/thread-detail-core";
import type { KMenuAction } from "../../../modules/kindredly-ui/src/types";
import { LETTER_MAX, REPLY_MIN, letterTier, weightedCount } from "../../lib/weighted-count";
import { VEIL_MASK, mosaicMask } from "../../lib/mosaic";
import { DAY_LETTERS, MAX_IN_FLIGHT } from "../../lib/ration";
import { channelColors } from "../../theme/post";

/* THE TODAY TAB, AS DATA (10a step 5). Pure: no React, no React Native, no
   i18n — every word comes in through `fmt`, so
   `node src/screens/today/today-cards.test.ts` locks the rules. Both
   renderers draw what these builders return: the SwiftUI desk
   (TodayNative → KTodayView) and the React Native fallback (TodayRN), so a
   remote flip between them never changes what the reader sees or what a
   tap does.

   What lives here:
   - the desk's own rules: keepDesk (a reload only appends, never
     reshuffles under the thumb), the day's facts (W33: every number is a
     count), the arrival's three envelopes;
   - the card: docket (postmark · NO.xxxx or UNSIGNED, the FACE v1 mask or
     the veil), the stamp and its topic tag in the stamp's channel colours
     worked out on the card's own face, the body in its tier, the voice
     block, ONE capsule slot (translation wins over the signal, owner), the
     ⋯ menu (Report / Block on every signed letter — always reachable, App
     Store), and what VoiceOver reads;
   - the plate's right label: blank only while the first load is in
     flight (it used to say CLOSED then), CLOSED on a quiet day (the plate
     and the strip stay on a quiet day now), ALL READ on the end page;
   - the reply: the send key's three states (disabled / enabled / dimmed —
     a full pouch still takes the tap so the sheet can say why) and the
     hint's four lines;
   - what a refused reply does (gone and blocked take the letter off the
     desk; nothing else does);
   - the desk's geometry, the one formula Swift also uses (KTodayGeometry):
     card height from the Host's height, the end page and its blind's
     scale, so an iPhone SE fits. */

/** i18n's t, as the builders take it. */
export type TFn = (key: string, vars?: Record<string, string | number>) => string;

/** Everything the builders need that isn't pure: words, dates, stamp names. */
export type TodayFormat = {
  t: TFn;
  /** format.postmark: "SEP.23" in the reader's language */
  postmark: (iso: string) => string;
  /** format.postNo: the writer's four-digit number */
  postNo: (uid: string) => number;
  /** m:ss (format.fmt) */
  clock: (seconds: number) => string;
  /** the stamp's colour and its name in the reader's language (sname), or null for an id stamps.ts doesn't list */
  stamp: (id: string) => { color: string; name: string } | null;
  /** a sticker's name in the reader's language (sticker-copy stickerName) */
  stickerName: (id: string) => string;
};

/* ── the desk ─────────────────────────────────────────────────────────── */

/** one page of the server's newest letters (fetchPool's default) */
export const POOL_PAGE = 40;

/**
 * A reload lands on a desk already in use: every letter the server still
 * has stays where it is, and the day's new ones join at the end, up to the
 * fifteen. `all` is one page of the newest letters; when it is full, a
 * letter missing from it may simply have aged past it, so only a short
 * page (the server's whole pool) can say a letter is gone.
 */
export function keepDesk<T extends { id: string }>(cur: readonly T[], all: readonly T[], fresh: readonly T[]): T[] {
  const alive = new Set(all.map((l) => l.id));
  const kept = all.length < POOL_PAGE ? cur.filter((l) => alive.has(l.id)) : [...cur];
  const seen = new Set(kept.map((l) => l.id));
  const add = fresh.filter((l) => !seen.has(l.id));
  return [...kept, ...add].slice(0, Math.max(kept.length, DAY_LETTERS));
}

/** The letters left on the desk when an author is blocked, and where the
    reader's page goes: the same letter if it stays, else the one that
    slides into its place (indexes before it shift down). */
export function withoutAuthor<T extends { id: string; author: string | null }>(feed: readonly T[], author: string, idx: number): { feed: T[]; idx: number } {
  const next = feed.filter((l) => l.author !== author);
  const removedBefore = feed.slice(0, Math.min(idx, feed.length)).filter((l) => l.author === author).length;
  return { feed: next, idx: Math.max(0, Math.min(idx - removedBefore, next.length)) };
}

/** What her slip on the blind says (CloseOfDay DayFacts). */
export type DayFacts = { read: number; replied: number; waiting: number };

/**
 * The day's counts (owner W33: every number is a count, never a guess).
 * `read` is what went past the desk: the counter of letters landed on, or
 * — when the counter has fallen behind — what is still on the desk plus
 * what was answered (answered letters leave the desk, so the desk alone
 * undercounts: after three replies on fifteen it used to say twelve).
 */
export function dayFacts({ onDesk, seen, replied, waiting }: { onDesk: number; seen: number; replied: number; waiting: number }): DayFacts {
  return { read: Math.max(seen, onDesk + replied), replied, waiting };
}

/** The three envelopes she brought back, as the reader pages past them. */
export type EnvelopeState = "opened" | "current" | "sealed";
export const ARRIVAL_ENVELOPES = 3;
export function envelopeStates(idx: number): EnvelopeState[] {
  return Array.from({ length: ARRIVAL_ENVELOPES }, (_, i) => (i < idx ? "opened" : i === idx ? "current" : "sealed"));
}
/** The arrival is over once the third envelope is behind the reader. */
export const arrivalSettled = (idx: number): boolean => idx >= ARRIVAL_ENVELOPES;

/* ── the plate ────────────────────────────────────────────────────────── */

/**
 * The plate's right label. Nothing while the first load is in flight (the
 * page used to say CLOSED while it was still asking — "the day is over
 * while we're still asking", the worst thing it can say); CLOSED on a
 * quiet day (loaded, nothing on the desk); ALL READ on the end page; no
 * counter ever (the founding spec).
 */
export function plateLabel({ loaded, count, atEnd }: { loaded: boolean; count: number; atEnd: boolean }, t: TFn): string {
  if (!loaded) return "";
  if (count === 0) return t("ld.closed");
  return atEnd ? t("ld.allRead") : "";
}

/* ── the card ─────────────────────────────────────────────────────────── */

/** the caption a voice letter is published with when the writer gave none */
export const DEFAULT_VOICE_CAPTION = "🎙 A voice letter";

/** A translation's state on one card. */
export type Translation = { text: string | null; on: boolean; busy: boolean };

/** The one capsule slot at the card's foot. */
export type CardCapsule =
  | { kind: "none" }
  | { kind: "translate"; code: string; label: string; enabled: boolean; value: string }
  | { kind: "signal"; label: string; glyph: "rings" | "clock" | "stickers" };

export type CardVM = {
  id: string;
  /** "SEP.23 · NO.7273" or "SEP.23 · UNSIGNED" */
  postmark: string;
  /** FACE v1 25-bit mask, or VEIL_MASK for a ghost */
  mask: number;
  /** the author deleted their account: the veil, in faint */
  ghost: boolean;
  stampId: string;
  /** the stamp's colour, for the tinted tile when its art is missing */
  stampHex: string;
  /** the stamp's name, for VoiceOver ("" hides the stamp from it) */
  stampName: string;
  /** "#made my day", lowercase (the writer picked it); "" for none */
  topic: string;
  topicWash: string;
  topicInk: string;
  topicLine: string;
  /** the text shown: the translation when it is on */
  body: string;
  bodySize: number;
  bodyLine: number;
  bodyCenter: boolean;
  isVoice: boolean;
  /** the voice letter's link is signed (else the card shows it unavailable — never the caption as the body) */
  voiceReady: boolean;
  /** the writer's caption, "" for the default one */
  caption: string;
  /** "1:14", "" when unknown */
  durationLabel: string;
  capsule: CardCapsule;
  /** the ⋯ menu: Report / Block; [] for an unsigned letter (nobody to report) */
  menu: KMenuAction[];
  /** what VoiceOver reads for the whole card */
  a11yLabel: string;
  /** a dev sample (demo-): skips the counters, the read receipt and the pouch */
  demo: boolean;
};

export type CardInput = {
  letter: PoolLetter;
  /** the translate offer for this letter (needsTranslating and the language guess agree), or null */
  offer: { code: string } | null;
  xl?: Translation | null;
  signal: Signal | null;
  voiceReady: boolean;
};

/** The docket line: when it was posted and who by (NO.xxxx), or UNSIGNED. */
export function docket(letter: Pick<PoolLetter, "created_at" | "author">, fmt: Pick<TodayFormat, "postmark" | "postNo" | "t">): string {
  return `${fmt.postmark(letter.created_at)} · ${letter.author ? `NO.${fmt.postNo(letter.author)}` : fmt.t("ld.unsigned")}`;
}

/** The capsule slot: translation wins (owner), else the signal, else nothing. */
export function capsuleFor(offer: { code: string } | null, xl: Translation | null | undefined, signal: Signal | null, fmt: Pick<TodayFormat, "t" | "stickerName">): CardCapsule {
  if (offer) {
    const on = !!(xl?.on && xl.text);
    const busy = !!xl?.busy;
    const [from, to] = offer.code.split("→");
    return {
      kind: "translate",
      // turned round once it is in yours: "EN←ES"
      code: on && to ? `${to}←${from}` : offer.code,
      label: busy ? fmt.t("mm.translating") : on ? fmt.t("mm.original") : fmt.t("read.invite"),
      enabled: !busy,
      value: on ? to ?? "" : from ?? "",
    };
  }
  if (!signal) return { kind: "none" };
  if (signal.kind === "close") return { kind: "signal", label: fmt.t("ld.close"), glyph: "rings" };
  return { kind: "signal", label: fmt.t("ld.both.label", { name: fmt.stickerName(signal.stickerId) }), glyph: signal.kind === "hour" ? "clock" : "stickers" };
}

/** The ⋯ menu of a desk letter: Report and Block, for anyone signed. */
export function cardMenu(letter: Pick<PoolLetter, "author">, t: TFn): KMenuAction[] {
  if (!letter.author) return [];
  return [
    { key: "report", title: t("rp.menu.report"), icon: "flag", destructive: false },
    { key: "block", title: t("rp.menu.block"), icon: "nosign", destructive: true },
  ];
}

/** One desk letter as both renderers draw it. `surfaceHex` is the card's face (tk.sf): the topic tag's colours are worked out on it. */
export function buildCard(input: CardInput, surfaceHex: string, fmt: TodayFormat): CardVM {
  const { letter, offer, xl, signal, voiceReady } = input;
  const st = fmt.stamp(letter.stamp);
  const isVoice = letter.kind === "voice" && !!letter.media_path;
  const shown = xl?.on && xl.text ? xl.text : letter.body || "";
  const tier = letterTier(weightedCount(shown));
  const caption = isVoice && letter.body && letter.body !== DEFAULT_VOICE_CAPTION ? letter.body : "";
  const topic = st ? `#${st.name.toLowerCase()}` : "";
  const colors = channelColors(st?.color ?? null, surfaceHex);
  const post = docket(letter, fmt);
  const words = isVoice ? [fmt.t("ld.voiceLetter"), caption].filter(Boolean).join(". ") : shown;
  return {
    id: letter.id,
    postmark: post,
    mask: letter.author ? mosaicMask(letter.author, 1) : VEIL_MASK,
    ghost: !letter.author,
    stampId: letter.stamp,
    stampHex: st?.color ?? "",
    stampName: st?.name ?? "",
    topic,
    topicWash: colors.wash,
    topicInk: colors.ink,
    topicLine: colors.line,
    body: isVoice ? "" : shown,
    bodySize: tier.size,
    bodyLine: tier.line,
    bodyCenter: tier.center,
    isVoice,
    voiceReady: isVoice && voiceReady,
    caption,
    durationLabel: letter.duration_s && letter.duration_s > 0 ? fmt.clock(letter.duration_s) : "",
    capsule: isVoice ? (signal ? capsuleFor(null, null, signal, fmt) : { kind: "none" }) : capsuleFor(offer, xl, signal, fmt),
    menu: cardMenu(letter, fmt.t),
    a11yLabel: [post, topic, words].filter(Boolean).join(". "),
    demo: letter.id.startsWith("demo"),
  };
}

export function buildCards(inputs: readonly CardInput[], surfaceHex: string, fmt: TodayFormat): CardVM[] {
  return inputs.map((i) => buildCard(i, surfaceHex, fmt));
}

/* ── the fold (the React Native card; Swift measures its own) ────────── */

/**
 * Whether a letter overflows its page, as the React Native card decides:
 * the measured height first (exact once the layout callback lands), with a
 * CJK-aware estimate as the floor beneath it — CJK packs about half as
 * many characters per line as Latin at the same size, which is why a fixed
 * threshold failed (a 325-weight Chinese letter is far past one page).
 */
export function overflows({ text, size, line, width, frameH, textH }: { text: string; size: number; line: number; width: number; frameH: number; textH: number }): boolean {
  const weighted = weightedCount(text);
  const cjk = (text.match(/[㐀-鿿]/g) || []).length > text.length * 0.3;
  const perLine = Math.max(8, Math.round(width / (size * (cjk ? 1 : 0.52))));
  const lines = frameH > 0 ? Math.floor(frameH / line) : 22;
  const measured = frameH > 0 && textH > frameH + line;
  return measured || weighted > perLine * lines;
}

/* ── the reply ────────────────────────────────────────────────────────── */

export type SendState = "disabled" | "enabled" | "dimmed";

/** What the reply strip shows for the words typed for one letter. */
export type ReplyState = {
  /** 2..1000 weighted: the words may go */
  ok: boolean;
  sendState: SendState;
  hint: string;
  /** the hint in the postmark red (over the limit) */
  hintWarn: boolean;
  /** the pouch is full for this letter (a dev letter never counts) */
  pouchFull: boolean;
};

/**
 * The send key and the hint. Empty or not 2..1000 (or a send in flight):
 * disabled. Fine but the pouch is full: dimmed, still tappable, so the
 * sheet can say why (owner: "a full pouch dims the plane before the tap,
 * not after"). Otherwise enabled. The hint: over the limit (red), five in
 * flight, a thread opens with the words, or the resting line.
 */
export function replyState(
  { text, flights, demo, forceFull = false, sending = false }: { text: string; flights: number; demo: boolean; forceFull?: boolean; sending?: boolean },
  t: TFn,
): ReplyState {
  // weighed as it is sent: trimmed
  const w = weightedCount(text.trim());
  const ok = w >= REPLY_MIN && w <= LETTER_MAX;
  const pouchFull = forceFull || (!demo && flights >= MAX_IN_FLIGHT);
  const over = w - LETTER_MAX;
  const sendState: SendState = !ok || sending ? "disabled" : pouchFull ? "dimmed" : "enabled";
  const hint = over > 0 ? t("ui.overLimit", { n: String(over) }) : pouchFull ? t("ld.flightFull") : ok ? t("ld.threadOpensTwo") : t("ld.replyThreadOpens");
  return { ok, sendState, hint, hintWarn: over > 0, pouchFull };
}

/** The first line of a draft, for the resting pill ("" shows the placeholder). */
export function draftPreview(text: string): string {
  const first = text.trim().split("\n")[0] ?? "";
  return first.length > 80 ? first.slice(0, 80).trimEnd() + "…" : first;
}

/** What a reply that didn't go does. A guest is asked to sign in (the letter resumes after); a letter
    taken back, or whose writer left or blocked the reader, leaves the desk (ld.unreachable, never
    "try again"); everything else keeps the words in the box. */
export function replyFailAction(kind: WriteFail | null | undefined, isGuest: boolean): "signup" | "remove" | "keep" {
  if (isGuest) return "signup";
  return kind === "gone" || kind === "blocked" ? "remove" : "keep";
}

/* ── the geometry (KTodayGeometry in Swift: change them together) ────── */

/** the plate band, fixed in layout (the title shrinks inside it) */
export const BAND = 52;
/** the first card sits this far under the band (H's gap; the snap line) */
export const CONTENT_TOP = 12;
/** from one card's foot to the next card's top: H's 12 + 120 */
export const CARD_GAP = 132;
/** the write-back pill's height (H:115), and what clears it under a card */
export const PILL_H = 52;
export const PILL_AIR = 14;
/** the shortest card, and the window the blind needs before it scales (312 × 404 plus its capsule and cue) */
export const CARD_MIN = 360;
export const BLIND_H = 520;
export const END_MIN = 300;

export type DeskGeometry = {
  /** the pill's bottom above the screen's: the tab bar's room + 6 (H:115's 104 on Face ID) */
  bottomRoom: number;
  /** what the stack's scroll view is tall: the Host less the status bar and the band */
  viewH: number;
  cardH: number;
  /** one card and the gap after it */
  stride: number;
  /** the blind's page (the pill is hidden there) */
  endH: number;
  /** the blind scaled to fit an SE */
  endScale: number;
};

/**
 * The desk's numbers from the Host's height. The card scales with the
 * screen (owner): what is left under the band once the snap line (12) and
 * the pill with its air (52 + 14) above the tab bar are taken out, never
 * under 360 — about 559 on a 393 × 852 phone and 427 on an iPhone SE. The
 * desk strip and the arrival scroll with the cards, so they never take
 * height from them (critic: pinned, they clamped the SE card to 360 and
 * hid REPLY ↓ under the pill).
 */
export function deskGeometry({ hostH, safeTop, tabBarRoom }: { hostH: number; safeTop: number; tabBarRoom: number }): DeskGeometry {
  const bottomRoom = tabBarRoom + 6;
  const viewH = Math.max(0, hostH - safeTop - BAND);
  const cardH = Math.max(CARD_MIN, Math.round(viewH - CONTENT_TOP - (bottomRoom + PILL_H + PILL_AIR)));
  const endH = Math.max(END_MIN, Math.round(viewH - CONTENT_TOP - bottomRoom));
  return { bottomRoom, viewH, cardH, stride: cardH + CARD_GAP, endH, endScale: Math.min(1, endH / BLIND_H) };
}
