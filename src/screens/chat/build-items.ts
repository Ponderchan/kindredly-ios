import type { MessageQuote, ThreadDetail, ThreadMessage } from "../../lib/db";
import type { Fold } from "../../lib/folds";
import type { TFn } from "../../lib/format";
import type { KImageRefProps, KMenuAction } from "../../../modules/kindredly-ui/src/types";
import type {
  KChatBand,
  KChatDeck,
  KChatDeckCard,
  KChatDock,
  KChatFace,
  KChatFoldHalf,
  KChatHeader,
  KChatItem,
  KChatPick,
  KChatPickChoice,
  KChatPickState,
  KChatTrace,
  KChatWave,
  KChatWaveCard,
} from "../../../modules/kindredly-ui/src/Conversation";
import type { ThreadStateKind, ThreadToneKey } from "../../lib/thread-state";
import { foldOver } from "../../lib/thread-detail-core";
import { developFor, mosaicMask } from "../../lib/mosaic";
import type { StrangerWho } from "../../lib/stranger-who";
import { LETTER_MAX, REPLY_MIN, weightedCount } from "../../lib/weighted-count";
import { parseSongUrl } from "../../lib/song";
import { PICKS, WAVE_LINES, type DeckLang, type PickPair, type Sky } from "../../data/sparkle-deck";

export type { Sky };

/* THE CONVERSATION'S RULES, WITHOUT REACT, THE NETWORK OR A RENDERER (10a step 5).
   ────────────────────────────────────────────────────────────────────────
   A room with a kindred (room/[id]) and a pen-pal chat (chat/[id]) are drawn
   twice now: by SwiftUI (KConversationView) and by the React Native screens
   kept as their fallback (RoomRN, LettersRN). Every rule about what a line
   shows and offers lives here, once, so the two can't drift:

   · the stream: the opening letter, the messages and the root folds, in
     time order; an answered fold renders once, as a pair
   · each row's words, day rule, spacing, VoiceOver label and quote
   · each long-press menu (owner, 2026-10-10): take back only inside two
     minutes on the server's clock, report only with someone on the other
     side and never on a demo row, translate only when the words look like
     another language or a translation is already shown, nothing on a line
     taken back; and nothing that writes (reply, ANSWER TO OPEN) in a room
     that is gone, missing or expired — readable, not actionable (owner)
   · the dock: closing soon, Wren's notice, the sign door, the reply quote,
     the mode box, the gone line, the expired door, the placeholder, the
     trace tray, and the pen-pal reply bar's hint
   · the composer: whether the words may go, the status line (over the
     limit, a slow network), and whether the field may clear itself at once
   · the pen-pal chat's own header (chat composers A2, 2026-10-18): its
     name, the line under it, the face and the progress band; and the kindreds
     chat's (B): the kindred's round face, the name, KINDRED SINCE
   · the room's ideas (the Kindreds bar's Sparkle, B): the order the 36
     stamps' prompts are offered in, theirs first, shuffled per room (the
     React Native room's bubble)
   · the openers deck (Sparkle, 2026-10-21; the SwiftUI room's ✦): the
     sky now, the Wave card's line, the This or That walk per room, and the
     two new rows it leaves: a This or That (a fold of kind pick, web 0044)
     and a sky wave (a message of kind wave), a wave and its wave back drawn
     as one pair. Their strings are data/strings-sparkle (the model imports
     it: this file must stay loadable by plain node)

   WHO THE PEN PAL IS (identity Phase 1) comes in resolved, from the
   screen's book (lib/stranger-who, lib/who useWhoBook): `name` is their
   "No. 5422" or, with the switch on, the courier name; the header takes
   the whole `who` for the frost, the ♀/♂ mark and the star sign. With no
   `who` (the switch off) the header is exactly what it was.

   THE PEN-PAL CARDS (A2): the pen-pal chat draws each letter as a card
   with a head line (LETTER 3 · NO. 5422 / LETTER 3 · YOU; with the switch
   on LETTER 3 · SUNDAY KITE) and moves the
   day into a day rule, as a room has (buildLetterItems cards: true), in
   SwiftUI and in the React Native fallback alike. Letters are
   counted per writer from the first after the opening — the five each way
   that trade names never count the opening (0012 counts messages) — and
   the opening is WHERE IT BEGAN.

   Every word comes from the caller's t() and every date from its own
   formatters, so `node src/screens/chat/build-items.test.ts` runs without
   React Native (a load hook adds ".ts" to the extensionless imports below,
   which import nothing at runtime themselves). */

/** Two minutes on the server's clock (web 0031). */
export const TAKE_BACK_MS = 2 * 60_000;
/** Names can be traded at five letters each way. */
export const REVEAL = 5;
/** The render window (0b bench: a rows change costs 29/48/79 ms at 80/240/500 rows). */
export const CHAT_WINDOW = { initial: 80, step: 80, max: 160, anchor: "end" as const };
/** The room's ceremony for whoever arrives after the second signature, only this soon after it
    (an old kindred opening the room is not meeting anyone). */
export const ROOM_CEREMONY_DAYS = 14;

/** The opening letter's key; it has no id. */
export const OPENING_KEY = "opening";

/* ── the stream ───────────────────────────────────────────────────────── */

/** The opening letter as a message: no id, no date (it has no day rule and sorts first). */
export function openingMessage(d: ThreadDetail): ThreadMessage {
  return { body: d.opening, mine: d.openingFromMe, date: "" };
}

/** Whether a message is the opening letter (openingMessage's shape). */
export const isOpening = (m: ThreadMessage): boolean => !m.id && m.date === "";

/** The letters in order: the opening (when it has words, or is a voice letter), then the messages. */
export function conversation(d: ThreadDetail | null): ThreadMessage[] {
  if (!d) return [];
  const open = openingMessage(d);
  return [open, ...d.messages].filter((m) => !!m.body || (m === open && !!d.openingMedia));
}

export type StreamItem =
  | { type: "msg"; date: string; msg: ThreadMessage }
  | { type: "fold"; date: string; fold: Fold; answer: Fold | null }
  /** a sky wave; with `back`, the wave back that answered it (the pair sits at the back's date) */
  | { type: "wave"; date: string; wave: ThreadMessage; back: ThreadMessage | null };

/** A wave still standing (one taken back is a line taken back). */
export const isWave = (m: ThreadMessage): boolean => m.kind === "wave" && !m.recalledAt;

/** The wave a wave back answers, by id ("" for none). */
const backOf = (m: ThreadMessage): string => (typeof m.meta?.back === "string" ? m.meta.back : "");

/** One stream: lines and root folds by time; an answered fold collapses onto its opener; a wave
    and the first wave back from the other side collapse onto one pair, at the back's date (the
    newest moment, so it lands at the bottom). */
export function roomStream(conv: readonly ThreadMessage[], folds: readonly Fold[]): StreamItem[] {
  const byParent = new Map<string, Fold>();
  for (const f of folds) if (f.parentId) byParent.set(f.parentId, f);
  // each wave answered by its first wave back from the other side
  const waves = new Map<string, ThreadMessage>();
  for (const m of conv) if (isWave(m) && m.id) waves.set(m.id, m);
  const pairOf = new Map<ThreadMessage, ThreadMessage>(); // back → the wave it answers
  const paired = new Set<ThreadMessage>();
  for (const m of conv) {
    if (!isWave(m)) continue;
    const x = waves.get(backOf(m));
    if (!x || x === m || x.mine === m.mine || paired.has(x)) continue;
    paired.add(x);
    pairOf.set(m, x);
  }
  const items: StreamItem[] = [];
  for (const m of conv) {
    if (paired.has(m)) continue;
    const x = pairOf.get(m);
    if (x) items.push({ type: "wave", date: m.date, wave: x, back: m });
    else if (isWave(m)) items.push({ type: "wave", date: m.date, wave: m, back: null });
    else items.push({ type: "msg", date: m.date, msg: m });
  }
  for (const f of folds) {
    if (f.parentId) continue;
    items.push({ type: "fold", date: f.date, fold: f, answer: byParent.get(f.id) ?? null });
  }
  // a stable sort, as Array.prototype.sort is: equal dates keep their order
  return items.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}

/** A message's key when the caller has no client key for it: its id, "opening", or a fallback. */
export function messageKey(m: ThreadMessage): string {
  if (m.id) return m.id;
  if (isOpening(m)) return OPENING_KEY;
  return `${m.date}|${m.body.slice(0, 24)}`;
}

export const foldKey = (f: Fold): string => `fold:${f.id}`;
export const halfKey = (f: Fold): string => `half:${f.id}`;

/** The demo room the App Store screenshots are taken in (lib/dev-store storeMode). */
export const STORE_ROOM_ID = "demo-mira";
const NO_FOLDS: readonly Fold[] = [];

/** The folds a room draws. In store mode the screenshot room is its five lines in the reader's
    language and nothing else: the demo folds are English and would sit between them. */
export function roomFolds(folds: readonly Fold[], o: { id: string | undefined; storeMode: boolean }): readonly Fold[] {
  return o.storeMode && o.id === STORE_ROOM_ID ? NO_FOLDS : folds;
}

/** Words that are nothing but a song link travel as a song (room/[id].tsx). */
export function isBareSong(body: string): boolean {
  const t = body.trim();
  const card = parseSongUrl(t);
  return !!card && t.replace(card.url, "").trim().length === 0;
}

/** The host a song link lives on, for its card. */
export const songHost = (url: string): string => url.replace(/^https?:\/\//, "").split("/")[0];

/* ── menus ────────────────────────────────────────────────────────────── */

export type Translations = Record<string, { text?: string; shown: boolean; busy?: boolean }>;

export type MenuCtx = {
  t: TFn;
  isDemo: boolean;
  /** someone is on the other side (their account exists) */
  otherExists: boolean;
  /** Date.now() and the server's clock minus the phone's, learnt from the last send */
  nowMs: number;
  skewMs: number;
  trans: Translations;
  /** the words look like another language (lib/lang-guess offerTranslate) */
  canTranslate: (body: string) => boolean;
  /** something can still be left here: false when their account is gone, the server calls the
      thread missing, or the room expired. Readable, not actionable (owner): no reply in any menu,
      no ANSWER TO OPEN on a sealed fold, no reply quote in the dock. */
  canWrite: boolean;
};

const act = (key: string, title: string, icon: string, destructive = false): KMenuAction => ({ key, title, icon, destructive });

const canReport = (id: string | null | undefined, c: MenuCtx): boolean => !!id && !c.isDemo && c.otherExists;

/** Reply sits on a line with an id, in a room that can still be written in. */
const canReply = (m: ThreadMessage, c: MenuCtx): boolean => !!m.id && c.canWrite;

/** Whether a line of mine can still be taken back (two minutes on the server's clock). */
export function takeBackOpen(m: ThreadMessage, nowMs: number, skewMs: number): boolean {
  if (!m.mine || !m.id || m.recalledAt) return false;
  const at = Date.parse(m.date);
  return Number.isFinite(at) && nowMs + skewMs - at < TAKE_BACK_MS;
}

/** When the next take-back window closes, in ms from now (null when none is open): the screen
    redraws then so the menu stays honest. */
export function nextTakeBackClose(messages: readonly ThreadMessage[], nowMs: number, skewMs: number): number | null {
  let next: number | null = null;
  for (const m of messages) {
    if (!takeBackOpen(m, nowMs, skewMs)) continue;
    const left = Date.parse(m.date) + TAKE_BACK_MS - (nowMs + skewMs);
    if (next === null || left < next) next = left;
  }
  return next === null ? null : Math.max(0, next) + 50;
}

function translateAct(key: string, body: string, c: MenuCtx): KMenuAction | null {
  if (c.trans[key]?.shown) return act("original", c.t("mm.original"), "character.bubble");
  if (c.canTranslate(body)) return act("translate", c.t("mm.translate"), "character.bubble");
  return null;
}

/** A room line: theirs reply, copy, translate, keep, report; mine reply, copy, take back. */
export function lineMenu(m: ThreadMessage, key: string, c: MenuCtx): KMenuAction[] {
  if (m.recalledAt || !m.body) return [];
  const acts: KMenuAction[] = [];
  if (canReply(m, c)) acts.push(act("reply", c.t("mm.reply"), "arrowshape.turn.up.left"));
  acts.push(act("copy", c.t("mm.copy"), "doc.on.doc"));
  if (!m.mine) {
    const tr = translateAct(key, m.body, c);
    if (tr) acts.push(tr);
    acts.push(act("keep", c.t("mm.keep"), "bookmark"));
    if (canReport(m.id, c)) acts.push(act("report", c.t("mm.report"), "flag", true));
  } else if (takeBackOpen(m, c.nowMs, c.skewMs)) {
    acts.push(act("takeBack", c.t("mm.takeBack"), "arrow.uturn.backward", true));
  }
  return acts;
}

/** A moment: reply, and report theirs. */
export function photoMenu(m: ThreadMessage, c: MenuCtx): KMenuAction[] {
  const acts: KMenuAction[] = [];
  if (canReply(m, c)) acts.push(act("reply", c.t("mm.reply"), "arrowshape.turn.up.left"));
  if (!m.mine && canReport(m.id, c)) acts.push(act("report", c.t("mm.report"), "flag", true));
  return acts;
}

/** A song: reply, copy link, songs between you, report theirs. */
export function songMenu(m: ThreadMessage, c: MenuCtx): KMenuAction[] {
  const acts: KMenuAction[] = [];
  if (canReply(m, c)) acts.push(act("reply", c.t("mm.reply"), "arrowshape.turn.up.left"));
  if (m.meta?.url) acts.push(act("copyLink", c.t("mm.copyLink"), "link"));
  acts.push(act("shelf", c.t("mm.songs"), "music.note.list"));
  if (!m.mine && canReport(m.id, c)) acts.push(act("report", c.t("mm.report"), "flag", true));
  return acts;
}

/** An opened fold's half: a line like any other, minus reply and take back. */
export function foldHalfMenu(half: Fold, c: MenuCtx): KMenuAction[] {
  const body = half.body;
  if (!body) return [];
  const acts: KMenuAction[] = [act("copy", c.t("mm.copy"), "doc.on.doc")];
  if (!half.mine) {
    const tr = translateAct(halfKey(half), body, c);
    if (tr) acts.push(tr);
    acts.push(act("keep", c.t("mm.keep"), "bookmark"));
    if (canReport(half.id, c)) acts.push(act("report", c.t("mm.report"), "flag", true));
  }
  return acts;
}

/** A sky postcard: theirs translate, keep and report; mine nothing. A wave is a gesture: no reply,
    no take back (0031 refuses any kind but text). */
export function waveMenu(m: ThreadMessage, key: string, c: MenuCtx): KMenuAction[] {
  if (m.mine || !m.body) return [];
  const acts: KMenuAction[] = [];
  const tr = translateAct(key, m.body, c);
  if (tr) acts.push(tr);
  acts.push(act("keep", c.t("mm.keep"), "bookmark"));
  if (canReport(m.id, c)) acts.push(act("report", c.t("mm.report"), "flag", true));
  return acts;
}

/** A This or That: report theirs, nothing else. */
export function pickMenu(f: Fold, c: MenuCtx): KMenuAction[] {
  return !f.mine && canReport(f.id, c) ? [act("report", c.t("mm.report"), "flag", true)] : [];
}

/** A pen-pal letter: copy and keep; theirs translate and report too. A posted letter is posted:
    no take back, no quoting.
    KEEP (owner's audit, 2026-11-10): a kindred's room could keep a line in lore and a pen-pal
    correspondence could only copy one, though the letters before names are often the ones worth
    keeping. No comment anywhere recorded a decision that lore is for kindreds only (the room's
    menu simply grew first), so a letter keeps the room's item, in the room's place (after
    translate, before report), on their letters and on the reader's own. */
export function letterMenu(m: ThreadMessage, key: string, c: MenuCtx): KMenuAction[] {
  if (!m.body || m.recalledAt) return [];
  const acts: KMenuAction[] = [act("copy", c.t("mm.copy"), "doc.on.doc")];
  if (!m.mine) {
    const tr = translateAct(key, m.body, c);
    if (tr) acts.push(tr);
  }
  acts.push(act("keep", c.t("mm.keep"), "bookmark"));
  if (!m.mine && canReport(m.id, c)) acts.push(act("report", c.t("mm.report"), "flag", true));
  return acts;
}

/** Whose name a kept pen-pal letter is filed under in Lore (lore.from, "FROM {name}"): theirs as
    the reader knows them at that moment (their No., or the courier name with the identity switch
    on; the traded name in a revealed thread seen as letters), the reader's own letter under
    `you` (mm.you). */
export function keptLetterWho(m: ThreadMessage, name: string, you: string): string {
  return m.mine ? you : name;
}

/* ── rows ─────────────────────────────────────────────────────────────── */

export type ItemsCtx = MenuCtx & {
  /** the reader's locale, for upper-casing names */
  locale: string;
  /** a message's day as a label ("OCT 14"), for day rules and VoiceOver */
  day: (iso: string) => string;
  /** their display name: the revealed name, or "No. 4481" (switch on, the courier name: lib/stranger-who) */
  name: string;
  /** a message's stable key (the client key of a send, else messageKey) */
  keyOf: (m: ThreadMessage) => string;
  /** a moment's picture, or null while its link isn't signed */
  photoOf: (m: ThreadMessage) => KImageRefProps | null;
  /** the voice opening: its playback key and length label; null when the opening is words */
  voice: { key: string; duration: string } | null;
};

export type RoomItemsCtx = ItemsCtx & {
  /** every message (not only the window), for quote lookups */
  messages: readonly ThreadMessage[];
  /** how many distinct songs the two of you left (the shelf link shows from two) */
  songsCount: number;
  /** the last message of the conversation (the shelf link sits under it if it is a song) */
  lastMessage: ThreadMessage | null;
  /** This or That picks of mine on their way: the fold's id → the choice tapped */
  pickSending?: ReadonlyMap<string, 0 | 1>;
};

/** A built row and what it would say at the top of a window (its own day, its own label). */
export type BuiltItem = KChatItem & { ownDay: string; ownLabel: string };

const blank = (key: string, kind: KChatItem["kind"], mine: boolean): KChatItem => ({
  key,
  kind,
  mine,
  dayLabel: "",
  gap: 0,
  speakerLabel: "",
  head: "",
  timeLabel: "",
  body: "",
  a11yLabel: "",
  tappable: false,
  quote: null,
  translation: "none",
  translationText: "",
  menu: [],
  photo: null,
  songTitle: "",
  songHost: "",
  shelfLink: "",
  voiceKey: "",
  voiceDuration: "",
  fold: null,
  pick: null,
  wave: null,
});

const join = (...parts: string[]): string => parts.filter((p) => !!p).join(", ");

function translationOf(key: string, trans: Translations): Pick<KChatItem, "translation" | "translationText"> {
  const tx = trans[key];
  if (tx?.busy) return { translation: "busy", translationText: "" };
  if (tx?.shown && tx.text) return { translation: "shown", translationText: tx.text };
  return { translation: "none", translationText: "" };
}

function quoteOf(m: ThreadMessage, c: RoomItemsCtx): KChatItem["quote"] {
  const q: MessageQuote | undefined = m.meta?.reply ?? undefined;
  if (!q) return null;
  const original = c.messages.find((x) => x.id === q.id);
  const gone = !q.excerpt || !!original?.recalledAt;
  return {
    speaker: (m.replyMine ? c.t("mm.you") : c.name).toLocaleUpperCase(c.locale),
    excerpt: gone ? c.t("mm.quoteGone") : q.excerpt,
    gone,
    // the original's own key (a send of mine keeps its client key), or its id when it isn't here
    target: original ? c.keyOf(original) : q.id,
  };
}

/* ── This or That, and the sky wave (Sparkle, 2026-10-21) ─────────────────── */

const SKIES: readonly Sky[] = ["dawn", "day", "dusk", "night"];
/** A sky word as it came off the wire: anything else reads as day. */
export const skyWord = (v: unknown): Sky => (SKIES.includes(v as Sky) ? (v as Sky) : "day");

/** The sky at a local hour: dawn 5–8, day 8–17, dusk 17–20, night 20–5. */
export function skyOf(hour: number): Sky {
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}

/** The hours the sky changes at. */
const SKY_TURNS = [5, 8, 17, 20];

/** How long, in ms, until the sky next changes (the next of 5:00, 8:00, 17:00, 20:00 local). */
export function msToNextSky(now: Date): number {
  for (let add = 0; add < 2; add++) {
    for (const h of SKY_TURNS) {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + add, h, 0, 0, 0);
      if (at.getTime() > now.getTime()) return at.getTime() - now.getTime();
    }
  }
  return 3600_000;
}

const deckLang = (lang: string): DeckLang => (lang in PICKS ? (lang as DeckLang) : "en");
const picksOf = (lang: string): readonly PickPair[] => PICKS[deckLang(lang)] ?? PICKS.en;

/** The Wave card's line: the language's lines for this sky, the n-th (round). */
export function waveLine(lang: string, sky: Sky, n: number): string {
  const lines = (WAVE_LINES[deckLang(lang)] ?? WAVE_LINES.en)[sky] ?? WAVE_LINES.en[sky];
  if (!lines.length) return "";
  return lines[((n % lines.length) + lines.length) % lines.length];
}

/** Where a room's This or That cards stand: the shuffle's seed, the PICKS index on each card
    (-1 for an empty slot), and how far down the room's order the walk is. */
export type DeckWalk = { seed: number; slots: number[]; cursor: number };
/** This or That cards beside the Wave card. */
export const DECK_SLOTS = 4;

/** The room's order of PICKS indices for a seed. */
function deckOrder(n: number, roomId: string, seed: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  const rand = seeded(hash32(`${roomId}#${seed}`));
  for (let k = order.length - 1; k > 0; k--) {
    const j = Math.floor(rand() * (k + 1));
    [order[k], order[j]] = [order[j], order[k]];
  }
  return order;
}

/** The next card from `cursor`: the first index whose question isn't used in the room and isn't
    on the table; once the order has none left, the first that isn't on the table. */
function deckNext(order: readonly number[], cursor: number, pairs: readonly PickPair[], used: ReadonlySet<string>, visible: ReadonlySet<number>): { index: number; cursor: number } {
  const n = order.length;
  for (const skipUsed of [true, false]) {
    for (let step = 0; step < n; step++) {
      const idx = order[(cursor + step) % n];
      if (visible.has(idx)) continue;
      if (skipUsed && used.has(pairs[idx].q)) continue;
      return { index: idx, cursor: cursor + step + 1 };
    }
  }
  return { index: -1, cursor };
}

/** A fresh walk: the first DECK_SLOTS cards of the room's order for `seed` (0 by default),
    skipping questions already asked in the room (`used`) and any in `avoid`. */
export function deckStart(lang: string, roomId: string, used: ReadonlySet<string>, seed = 0, avoid: ReadonlySet<number> = new Set()): DeckWalk {
  const pairs = picksOf(lang);
  const order = deckOrder(pairs.length, roomId, seed);
  const visible = new Set<number>(avoid);
  const slots: number[] = [];
  let cursor = 0;
  for (let s = 0; s < DECK_SLOTS; s++) {
    let next = deckNext(order, cursor, pairs, used, visible);
    // a deck smaller than a shuffle's avoid list still fills from what is left
    if (next.index < 0 && avoid.size) next = deckNext(order, cursor, pairs, used, new Set(slots));
    slots.push(next.index);
    if (next.index >= 0) visible.add(next.index);
    cursor = next.cursor;
  }
  return { seed, slots, cursor };
}

/** Another card in one slot: the next in the room's order that isn't used or on the table. */
export function deckAnother(walk: DeckWalk, slot: number, lang: string, used: ReadonlySet<string>, roomId = ""): DeckWalk {
  if (slot < 0 || slot >= walk.slots.length) return walk;
  const pairs = picksOf(lang);
  const order = deckOrder(pairs.length, roomId, walk.seed);
  const visible = new Set(walk.slots.filter((x) => x >= 0));
  const next = deckNext(order, walk.cursor, pairs, used, visible);
  if (next.index < 0) return walk;
  const slots = walk.slots.slice();
  slots[slot] = next.index;
  return { seed: walk.seed, slots, cursor: next.cursor };
}

/** ↻ Shuffle: a new seed, a new order, and none of the cards on the table now. */
export function deckShuffle(walk: DeckWalk, lang: string, roomId: string, used: ReadonlySet<string>): DeckWalk {
  return deckStart(lang, roomId, used, walk.seed + 1, new Set(walk.slots.filter((x) => x >= 0)));
}

/** The questions already asked in a room (the This or That openers among its folds). */
export function usedPicks(folds: readonly Fold[]): Set<string> {
  const out = new Set<string>();
  for (const f of folds) if (f.kind === "pick" && !f.parentId && f.prompt) out.add(f.prompt);
  return out;
}

/** My This or That openers in a room nobody has picked yet (0044's cap is 3). */
export function picksWaiting(folds: readonly Fold[]): number {
  const answered = new Set(folds.filter((f) => f.parentId).map((f) => f.parentId as string));
  return folds.filter((f) => f.kind === "pick" && f.mine && !f.parentId && !answered.has(f.id)).length;
}
/** The server's cap on my waiting picks in a room. */
export const PICK_WAITING_CAP = 3;
/** The deck's Wave card rests this long after a wave of mine (a courtesy; the server has none). */
export const WAVE_REST_MS = 60 * 60_000;

/** My newest wave's time in ms, or null. */
export function lastWaveAt(messages: readonly ThreadMessage[]): number | null {
  let best: number | null = null;
  for (const m of messages) {
    if (!m.mine || m.kind !== "wave") continue;
    const at = Date.parse(m.date);
    if (Number.isFinite(at) && (best === null || at > best)) best = at;
  }
  return best;
}

/** The PICKS pair a deck card offers, for its key "pick:<n>" (null for any other key). */
export function deckPick(lang: string, key: string): { index: number; pair: PickPair } | null {
  const m = /^pick:(\d+)$/.exec(key);
  if (!m) return null;
  const index = Number(m[1]);
  const pair = picksOf(lang)[index];
  return pair ? { index, pair } : null;
}

export type DeckInput = {
  t: TFn;
  locale: string;
  lang: string;
  walk: DeckWalk;
  sky: Sky;
  /** the line the Wave card would send now */
  line: string;
  /** a wave of mine went less than WAVE_REST_MS ago */
  waved: boolean;
  /** my picks nobody has picked yet */
  waiting: number;
  /** the composer's status line for the deck ("" for none) */
  status: string;
  /** something can be left in the room: false empties the deck (Swift then shows none) */
  canWrite: boolean;
};

/** The openers deck: the Wave card, then a This or That card per slot. */
export function buildDeck(i: DeckInput): KChatDeck {
  const { t } = i;
  const up = (s: string) => s.toLocaleUpperCase(i.locale);
  const skyName = t(`sp.sky.${i.sky}`);
  const capped = i.waiting >= PICK_WAITING_CAP;
  const cards: KChatDeckCard[] = !i.canWrite
    ? []
    : [
        {
          key: "wave",
          kind: "wave",
          label: up(t("sp.deck.wave")),
          prompt: "",
          a: "",
          b: "",
          sky: i.sky,
          skyLabel: up(skyName),
          line: i.line,
          disabled: i.waved,
          note: i.waved ? t("sp.deck.waved") : "",
          a11y: t("sp.deck.waveA11y", { sky: skyName, line: i.line }),
        },
        ...i.walk.slots
          .map((n) => ({ n, pair: picksOf(i.lang)[n] }))
          .filter((x): x is { n: number; pair: PickPair } => x.n >= 0 && !!x.pair)
          .map(({ n, pair }) => ({
            key: `pick:${n}`,
            kind: "pick" as const,
            label: up(t("sp.deck.tot")),
            prompt: pair.q,
            a: pair.a,
            b: pair.b,
            sky: "day" as const,
            skyLabel: "",
            line: t("sp.deck.pickHint"),
            disabled: capped,
            note: capped ? t("sp.deck.waiting", { n: i.waiting }) : "",
            a11y: t("sp.deck.pickA11y", { prompt: pair.q, a: pair.a, b: pair.b }),
          })),
      ];
  return {
    title: t("sp.deck.title"),
    shuffleLabel: t("sp.deck.shuffle"),
    closeLabel: t("sp.deck.close"),
    sendLabel: t("sp.deck.send"),
    anotherLabel: t("sp.deck.another"),
    status: i.status,
    cards,
  };
}

const sameText = (a: string | null | undefined, b: string | null | undefined): boolean =>
  !!a && !!b && a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

/** A This or That row: the question, its two choices, who picked what once both have. */
export function pickItem(f: Fold, answer: Fold | null, c: RoomItemsCtx): KChatItem {
  const choices: [string, string] = f.choices ?? [f.body ?? "", answer?.body ?? ""];
  const tapped = c.pickSending?.get(f.id);
  const state: KChatPickState = answer ? "open" : f.mine ? "waiting" : tapped !== undefined ? "sending" : c.canWrite ? "choose" : "closed";
  // my side and theirs, as the bodies say (an opener's body is sealed for me until I pick)
  const mineText = f.mine ? f.body : answer?.mine ? answer.body : tapped !== undefined ? choices[tapped] : null;
  const theirText = state === "open" ? (f.mine ? answer?.body : f.body) : null;
  const you = c.t("sp.pick.you");
  const both = c.t("sp.pick.both");
  const choiceRows: KChatPickChoice[] = choices.map((text, idx) => {
    const mine = state === "sending" ? idx === tapped : sameText(text, mineText);
    const theirs = state === "open" && sameText(text, theirText);
    const tag = mine && theirs ? both : mine ? you : theirs ? c.name : "";
    return {
      text,
      mine,
      theirs,
      tag,
      a11y: tag ? c.t("sp.pick.a11yPicked", { choice: text, who: tag }) : c.t("sp.pick.a11yChoice", { choice: text }),
    };
  });
  const same = state === "open" && sameText(mineText, theirText);
  const n = 1 + (hash32(f.id) % 3);
  const hint =
    state === "choose" ? c.t("sp.pick.hint") : state === "waiting" ? c.t("sp.pick.waiting", { name: c.name }) : state === "sending" ? c.t("sp.pick.sending") : state === "closed" ? c.t("sp.pick.closed") : "";
  const prompt = f.prompt ?? "";
  const label = c.t("sp.pick.label");
  const pick: KChatPick = {
    label: label.toLocaleUpperCase(c.locale),
    asker: (f.mine ? c.t("sp.pick.youAsked") : c.t("sp.pick.theyAsked", { name: c.name })).toLocaleUpperCase(c.locale),
    prompt,
    choices: choiceRows,
    state,
    hint,
    verdict: state === "open" ? c.t(same ? `sp.pick.same.${n}` : `sp.pick.diff.${n}`) : "",
    same,
  };
  return {
    ...blank(foldKey(f), "pick", f.mine),
    // the line an older native draws in its place (an unknown kind is a plain line)
    body: c.t("sp.pick.fallback", { prompt, a: choices[0], b: choices[1] }),
    a11yLabel: join(label, prompt, ...choiceRows.map((r) => r.a11y), pick.hint, pick.verdict),
    menu: pickMenu(f, c),
    pick,
  };
}

/** Whether their single wave still offers Wave Back: not answered by a wave of mine, nothing of
    mine waved after it, and the room still open. */
function waveBackOpen(w: ThreadMessage, c: RoomItemsCtx): boolean {
  if (w.mine || !w.id || !c.canWrite) return false;
  const at = Date.parse(w.date);
  for (const m of c.messages) {
    if (!m.mine || m.kind !== "wave") continue;
    if (backOf(m) === w.id) return false;
    const mAt = Date.parse(m.date);
    if (Number.isFinite(at) && Number.isFinite(mAt) && mAt > at) return false;
  }
  return true;
}

function waveCard(m: ThreadMessage, whose: string, c: RoomItemsCtx): KChatWaveCard {
  const key = c.keyOf(m);
  const sky = skyWord(m.meta?.sky);
  const skyName = c.t(`sp.sky.${sky}`);
  return {
    key,
    mine: m.mine,
    sky,
    label: skyName.toLocaleUpperCase(c.locale),
    line: m.body,
    whose,
    menu: waveMenu(m, key, c),
    ...translationOf(key, c.trans),
    a11y: m.mine ? c.t("sp.wave.a11yMine", { sky: skyName, line: m.body }) : c.t("sp.wave.a11yTheirs", { name: c.name, sky: skyName, line: m.body }),
  };
}

/** A sky postcard, or a wave and its wave back as a pair (mine first). */
export function waveItem(w: ThreadMessage, back: ThreadMessage | null, c: RoomItemsCtx): KChatItem {
  if (!back) {
    const card = waveCard(w, "", c);
    const open = waveBackOpen(w, c);
    const wave: KChatWave = { cards: [card], backKey: open ? c.t("sp.wave.back") : "", backA11y: open ? c.t("sp.wave.backA11y") : "" };
    return { ...blank(card.key, "wave", w.mine), body: w.body, a11yLabel: card.a11y, wave };
  }
  const mine = w.mine ? w : back;
  const theirs = w.mine ? back : w;
  const cards = [
    waveCard(mine, c.t("sp.wave.yourSky").toLocaleUpperCase(c.locale), c),
    waveCard(theirs, c.t("sp.wave.theirSky", { name: c.name }).toLocaleUpperCase(c.locale), c),
  ];
  return {
    // the pair is keyed by the wave back (its newest moment)
    ...blank(c.keyOf(back), "wave", back.mine),
    body: `${theirs.body} · ${mine.body}`,
    a11yLabel: join(...cards.map((x) => x.a11y)),
    wave: { cards, backKey: "", backA11y: "" },
  };
}

/** The room's rows, oldest first, against the whole stream (see windowItems for a window). */
export function buildRoomItems(stream: readonly StreamItem[], c: RoomItemsCtx): BuiltItem[] {
  const out: BuiltItem[] = [];
  let prevDay = "";
  for (let i = 0; i < stream.length; i++) {
    const it = stream[i];
    const prev = stream[i - 1];
    const day = it.date ? c.day(it.date) : "";
    const newDay = !!day && day !== prevDay;
    if (day) prevDay = day;
    const dayLabel = newDay ? day : "";
    const prevIsMsg = prev?.type === "msg";

    if (it.type === "wave") {
      out.push({ ...waveItem(it.wave, it.back, c), dayLabel, gap: i > 0 && !newDay ? 8 : 0, ownDay: day, ownLabel: "" });
      continue;
    }

    if (it.type === "fold" && it.fold.kind === "pick") {
      out.push({ ...pickItem(it.fold, it.answer, c), dayLabel, gap: i === 0 ? 0 : 14, ownDay: day, ownLabel: "" });
      continue;
    }

    if (it.type === "fold") {
      const f = it.fold;
      const a = it.answer;
      const kindLabel = f.kind === "question" ? c.t("rm.fold.q") : c.t("rm.fold.n");
      const prompt = f.prompt ?? "";
      const halves: KChatFoldHalf[] = a
        ? [f, a].map((half) => ({
            key: halfKey(half),
            mine: half.mine,
            speaker: half.mine ? c.t("ui.you") : c.name.toLocaleUpperCase(c.locale),
            body: half.body ?? "",
            menu: foldHalfMenu(half, c),
            ...translationOf(halfKey(half), c.trans),
          }))
        : [];
      const state: "open" | "waiting" | "sealed" = a ? "open" : f.mine ? "waiting" : "sealed";
      const q = f.kind === "question";
      // a sealed fold in a room nothing can be left in has no door: no hint, no ANSWER TO OPEN
      const answerable = state === "sealed" && c.canWrite;
      out.push({
        ...blank(foldKey(f), "fold", f.mine),
        dayLabel,
        gap: i === 0 ? 0 : 14,
        a11yLabel: join(kindLabel, prompt),
        fold: {
          kindLabel,
          prompt,
          state,
          hint: state === "waiting" ? c.t("rm.fold.waiting", { name: c.name }) : answerable ? (q ? c.t("rm.fold.answerToOpen") : c.t("rm.fold.foldToOpen")) : "",
          answerKey: answerable ? (q ? c.t("rm.fold.answerKey") : c.t("rm.fold.foldKey")) : "",
          halves,
        },
        ownDay: day,
        ownLabel: "",
      });
      continue;
    }

    const m = it.msg;
    const key = c.keyOf(m);
    const speaker = m.mine ? c.t("mm.you") : c.name;
    const base = { dayLabel, ownDay: day, ownLabel: "" };
    const gapAfter = (n: number) => (i > 0 && prevIsMsg && !newDay ? n : 0);

    if (m.recalledAt) {
      const body = m.mine ? c.t("rm.recall.mine") : c.t("rm.recall.theirs", { name: c.name });
      out.push({ ...blank(key, "recalled", m.mine), ...base, gap: gapAfter(8), body, a11yLabel: join(body, day) });
      continue;
    }

    if (isOpening(m) && c.voice) {
      // the caption is the opening letter's words: copy, translate and keep, as they always were
      out.push({
        ...blank(key, "voice", m.mine),
        ...base,
        body: m.body,
        a11yLabel: join(speaker, m.body, day),
        voiceKey: c.voice.key,
        voiceDuration: c.voice.duration,
        menu: lineMenu(m, key, c),
        ...translationOf(key, c.trans),
      });
      continue;
    }

    const isPhoto = m.kind === "photo" && !!(m.mediaPath || m.meta?.url);
    if (isPhoto) {
      out.push({
        ...blank(key, "photo", m.mine),
        ...base,
        gap: gapAfter(6),
        a11yLabel: join(speaker, c.t("ph.open"), day),
        photo: c.photoOf(m),
        menu: photoMenu(m, c),
      });
      continue;
    }

    const url = m.kind === "song" ? m.meta?.url : undefined;
    if (url) {
      const title = m.meta?.title || c.t("rm.song.card");
      out.push({
        ...blank(key, "song", m.mine),
        ...base,
        gap: gapAfter(6),
        body: m.body,
        a11yLabel: join(speaker, title, day),
        songTitle: title,
        songHost: songHost(url),
        // under the last message (not the last stream item: a fold after it doesn't move it)
        shelfLink: c.songsCount >= 2 && c.lastMessage === m ? c.t("rm.shelf.open", { n: String(c.songsCount) }) : "",
        menu: songMenu(m, c),
      });
      continue;
    }

    out.push({
      ...blank(key, "line", m.mine),
      ...base,
      gap: gapAfter(6),
      body: m.body,
      a11yLabel: join(speaker, m.body, day),
      quote: quoteOf(m, c),
      menu: lineMenu(m, key, c),
      ...translationOf(key, c.trans),
    });
  }
  return out;
}

export type LetterItemsCtx = ItemsCtx & {
  /** a message's 24-hour time ("14:05") */
  time: (iso: string) => string;
  /** the A2 cards (SwiftUI and the React Native fallback): every letter carries its head line, and
      the day is a day rule above the first letter of a day instead of a part of the label line,
      which goes */
  cards?: boolean;
};

/** A letter card's head line (A2), in capitals: LETTER 3 · NO. 5422 / LETTER 3 · YOU, the opening
    WHERE IT BEGAN · NO. 5422. `n` is the writer's own count, the opening not counted. */
export function letterHead(m: ThreadMessage, n: number, c: Pick<LetterItemsCtx, "t" | "locale" | "name">): string {
  const who = m.mine ? c.t("ui.you") : c.name;
  const head = isOpening(m) ? `${c.t("kd.whereBegan")} · ${who}` : c.t("ch.card.head", { n, who });
  return head.toLocaleUpperCase(c.locale);
}

/** The pen-pal chat's letters: a label when the writer or the day changes, the time at the foot
    (the older blocks); or, with cards, the head line in every card and a day rule when the day
    changes (the A2 cards both renderers draw). A tap opens the reader. A revealed thread seen here (right
    after the second signature, or from a stale link) shows a line taken back as its note, and
    everything else as its words. */
export function buildLetterItems(conv: readonly ThreadMessage[], c: LetterItemsCtx): BuiltItem[] {
  const out: BuiltItem[] = [];
  const cards = !!c.cards;
  // each writer's own count, the opening not among them (the five each way are messages)
  let mineN = 0;
  let theirsN = 0;
  let lastDay = "";
  for (let i = 0; i < conv.length; i++) {
    const m = conv[i];
    const prev = conv[i - 1];
    const key = c.keyOf(m);
    const day = m.date ? c.day(m.date) : "";
    const prevDay = prev?.date ? c.day(prev.date) : "";
    const who = m.mine ? c.t("ui.you") : c.name.toLocaleUpperCase(c.locale);
    const ownLabel = cards ? "" : day ? `${who} · ${day}` : who;
    const showLabel = !cards && (!prev || prev.mine !== m.mine || day !== prevDay);
    const speaker = m.mine ? c.t("mm.you") : c.name;
    const n = isOpening(m) ? 0 : m.mine ? ++mineN : ++theirsN;
    // cards: the day rule above the first letter of each day (the opening has no date)
    const dayLabel = cards && !!day && day !== lastDay ? day : "";
    if (day) lastDay = day;
    const head = cards ? letterHead(m, n, c) : "";

    if (m.recalledAt) {
      const body = m.mine ? c.t("rm.recall.mine") : c.t("rm.recall.theirs", { name: c.name });
      out.push({ ...blank(key, "recalled", m.mine), dayLabel, body, a11yLabel: join(body, day), ownDay: day, ownLabel });
      continue;
    }
    if (isOpening(m) && c.voice) {
      // the opening letter, spoken: its caption opens the reader and has the letter's menu
      out.push({
        ...blank(key, "voice", m.mine),
        dayLabel,
        speakerLabel: showLabel ? ownLabel : "",
        head,
        body: m.body,
        a11yLabel: join(speaker, m.body, day),
        tappable: true,
        voiceKey: c.voice.key,
        voiceDuration: c.voice.duration,
        menu: letterMenu(m, key, c),
        ...translationOf(key, c.trans),
        ownDay: day,
        ownLabel,
      });
      continue;
    }
    out.push({
      ...blank(key, "letter", m.mine),
      dayLabel,
      speakerLabel: showLabel ? ownLabel : "",
      head,
      timeLabel: m.date ? c.time(m.date) : "",
      body: m.body,
      a11yLabel: join(speaker, m.body, day),
      tappable: true,
      menu: letterMenu(m, key, c),
      ...translationOf(key, c.trans),
      ownDay: day,
      ownLabel,
    });
  }
  return out;
}

/** A window of built rows for Swift: [start, end), the first one labelled as the top of a list
    is (its day rule in a room, its writer and day in letters) and with no gap above it. */
export function windowItems(built: readonly BuiltItem[], start: number, end: number, variant: "room" | "letters"): KChatItem[] {
  const out: KChatItem[] = [];
  for (let i = Math.max(0, start); i < Math.min(built.length, end); i++) {
    const { ownDay, ownLabel, ...item } = built[i];
    if (out.length === 0) {
      const first: KChatItem = { ...item, gap: 0 };
      if (variant === "room" && !first.dayLabel && ownDay && first.kind !== "voice") first.dayLabel = ownDay;
      if (variant === "letters" && !first.speakerLabel && (first.kind === "letter" || first.kind === "voice")) first.speakerLabel = ownLabel;
      // the cards: the window's first letter says its day, as a room's first row does
      if (variant === "letters" && first.head && !first.dayLabel && ownDay) first.dayLabel = ownDay;
      out.push(first);
    } else {
      out.push(item);
    }
  }
  return out;
}

/** Where a key sits in the built rows (a quote jump widens the window to it), or -1. A fold
    half's key finds its fold. */
export function indexOfKey(built: readonly KChatItem[], key: string): number {
  const direct = built.findIndex((b) => b.key === key);
  if (direct >= 0 || !key.startsWith("half:")) return direct;
  return built.findIndex((b) => b.fold?.halves.some((h) => h.key === key));
}

/* ── the dock ─────────────────────────────────────────────────────────── */

/** What the room's composer is for. */
export type RoomMode = { kind: "note" } | { kind: "question"; prompt: string } | { kind: "answer"; fold: Fold } | { kind: "song" };

const NO_DOCK: KChatDock = {
  closingText: "",
  closingLink: "",
  notice: null,
  signDoor: "none",
  signLabel: "",
  signHint: "",
  replyLabel: "",
  replyExcerpt: "",
  replyCloseLabel: "",
  mode: null,
  terminal: "none",
  goneText: "",
  expiredLabel: "",
  expiredBody: "",
  expiredButton: "",
  placeholder: "",
  sendLabel: "",
  autocapitalize: true,
  wrenToolLabel: "",
  plusLabel: "",
  plusCloseLabel: "",
  traces: [],
  hint: "",
  emojiLabel: "",
  ideasLabel: "",
  ideaLabel: "",
  ideaAnother: "",
  ideaUse: "",
  trayTitle: "",
};

export type RoomDockInput = {
  t: TFn;
  locale: string;
  /** her name as the reader set it */
  wren: string;
  name: string;
  closing: boolean;
  daysLeft: number;
  mode: RoomMode | null;
  replyTo: { quote: MessageQuote; mine: boolean } | null;
  notice: { line: string; evidence: string; word?: string | null } | null;
  gone: boolean;
  /** the server says this reader has no such thread (deleted, or hidden by a block): closed in
      place, never an automatic leave (the composer may hold words) */
  missing?: boolean;
  expired: boolean;
  quietDays: number;
};

/** The room's four traces (a fold, a question, a moment, a song), as the + tray draws them
    (chat composers B, Prompt 6): the I1 icon and the card's mood fill for each. */
export function roomTraces(t: TFn): KChatTrace[] {
  return [
    { key: "note", title: t("rm.note.t"), subtitle: t("rm.note.s"), glyph: "foldNote", tint: "calm" },
    { key: "ask", title: t("rm.ask.t"), subtitle: t("rm.ask.s"), glyph: "askSomething", tint: "tired" },
    { key: "moment", title: t("rm.moment.t"), subtitle: t("rm.moment.s"), glyph: "tinyMoment", tint: "low" },
    { key: "song", title: t("rm.song.t"), subtitle: t("rm.song.s"), glyph: "leaveSong", tint: "happy" },
  ];
}

export function modeTitle(mode: RoomMode, t: TFn): string {
  if (mode.kind === "note") return t("rm.mode.note");
  if (mode.kind === "question") return t("rm.mode.ask");
  if (mode.kind === "song") return t("rm.mode.song");
  return mode.fold.kind === "question" ? t("rm.mode.answerQ") : t("rm.mode.answerN");
}

export function roomPlaceholder(mode: RoomMode | null, t: TFn): string {
  if (mode?.kind === "song") return t("rm.song.ph");
  if (mode?.kind === "question") return t("rm.mode.answerPh");
  if (mode) return t("rm.mode.notePh");
  return t("rm.ph");
}

/** Everything above and in place of the room's composer. */
export function buildRoomDock(i: RoomDockInput): KChatDock {
  const { t } = i;
  const terminal: KChatDock["terminal"] = i.gone || i.missing ? "gone" : i.expired ? "expired" : "none";
  // a room in its last week says so above whatever is written — not while a fold is being written
  const showClosing = i.closing && terminal === "none" && !(i.mode && i.mode.kind !== "song");
  const showReply = !!i.replyTo && !i.mode && terminal === "none";
  return {
    ...NO_DOCK,
    closingText: showClosing ? (i.daysLeft <= 1 ? t("rm.closing.day") : t("rm.closing.days", { n: i.daysLeft })) : "",
    closingLink: showClosing ? t("rm.closing.fc") : "",
    notice: i.notice
      ? {
          label: t("rm.noticed", { wren: i.wren.toLocaleUpperCase(i.locale) }),
          evidence: i.notice.evidence,
          line: i.notice.line,
          word: i.notice.word ?? "",
          closeLabel: t("wren.trackClose"),
        }
      : null,
    // the reply quote shows only while no mode is set (a fold carries no quote), and only over a
    // composer: never above the gone line or the expired card
    replyLabel: showReply && i.replyTo ? (i.replyTo.mine ? t("mm.replyingSelf") : t("mm.replyingTo", { name: i.name })).toLocaleUpperCase(i.locale) : "",
    replyExcerpt: showReply && i.replyTo ? i.replyTo.quote.excerpt : "",
    replyCloseLabel: t("wren.trackClose"),
    mode:
      i.mode && terminal === "none"
        ? {
            title: modeTitle(i.mode, t),
            closeLabel: t("wren.trackClose"),
            showsPrompt: i.mode.kind === "question",
            promptPlaceholder: t("rm.mode.promptPh"),
            promptText: i.mode.kind === "answer" ? i.mode.fold.prompt ?? "" : "",
          }
        : null,
    terminal,
    // gone says they left; missing stays ambiguous between that and a block (strings-step5-data)
    goneText: i.gone ? t("ch.gone") : t("fail.closed.body"),
    expiredLabel: t("kd.expiredRow", { n: i.quietDays }),
    expiredBody: t("rm.expired.body"),
    expiredButton: t("rm.rekindle"),
    placeholder: roomPlaceholder(i.mode, t),
    sendLabel: t("ld.send"),
    autocapitalize: i.mode?.kind !== "song",
    // the React Native room's Wren tool; the SwiftUI room has the ideas key in its place (B)
    wrenToolLabel: t("rm.seed.a11y", { wren: i.wren }),
    plusLabel: t("lat.title"),
    plusCloseLabel: t("wren.trackClose"),
    traces: terminal === "none" ? roomTraces(t) : [],
    emojiLabel: t("cmp.emoji"),
    // the ✦ key: the SwiftUI room's opens the openers deck; the React Native room keeps its bubble
    ideasLabel: t("sp.deck.a11y"),
    ideaLabel: t("rm.idea.label").toLocaleUpperCase(i.locale),
    ideaAnother: t("rm.idea.another"),
    ideaUse: t("rm.idea.use"),
    trayTitle: t("rm.tray.title"),
  };
}

export type LettersDockInput = {
  t: TFn;
  /** the revealed name, or the pen pal's name as the book gives it ("No. 4481"; switch on, the courier name) */
  name: string;
  /** the identity switch: before names, the reply bar is addressed to the courier name (as the desk's is) */
  identity?: boolean;
  /** i18n hasString (kept for callers; the reply bar no longer needs it: with the switch on it says
      id.writeBackTo, which every language has, and with it off it says ld.writeBackPh as before) */
  has?: (key: string) => boolean;
  revealed: boolean;
  gone: boolean;
  /** the server says this reader has no such thread: closed in place */
  missing?: boolean;
  myCount: number;
  /** their letters (the reply bar's hint says what moves names once your five are in) */
  otherCount?: number;
  iSigned: boolean;
  theirSigned: boolean;
  /** the reader's locale, for the hint's capitals */
  locale?: string;
};

/** The sign door's state: from the fifth letter, until names are traded; never on a gone thread.
    With the identity switch on (Phase 2) it waits for five letters EACH way, as sign_thread does
    (PHASE2.md §5): a door that opens on my fifth would sign into a refusal. */
export function signDoorOf(i: Pick<LettersDockInput, "revealed" | "gone" | "missing" | "myCount" | "otherCount" | "iSigned" | "theirSigned" | "identity">): KChatDock["signDoor"] {
  if (i.revealed || i.gone || i.missing || i.myCount < REVEAL) return "none";
  if (i.identity && (i.otherCount ?? 0) < REVEAL) return "none";
  if (i.iSigned) return "waiting";
  return i.theirSigned ? "theirsFirst" : "offer";
}

/** The pen-pal reply bar's hint (A2), over the bar while the keyboard is up: the letter being
    written, LETTER {n} OF 5 with n your own count + 1, and on your fifth LETTER 5 OF 5 · ONE MORE
    AND NAMES. Once your five are in, more from you won't move anything, and what will is the
    band's line (YOUR FIVE ARE IN · 2 MORE FROM THEM, NAMES CAN BE TRADED), which the band under the
    header already says while names aren't traded: the hint says nothing then rather than repeat
    it (owner, 2026-10-19). In capitals, in the reader's locale; "" once names are traded or
    nothing can be written. */
export function lettersHint(i: Pick<LettersDockInput, "t" | "revealed" | "gone" | "missing" | "myCount" | "otherCount" | "locale">): string {
  if (i.revealed || i.gone || i.missing) return "";
  if (i.myCount >= REVEAL) return "";
  const n = i.myCount + 1;
  return (n === REVEAL ? i.t("ch.hint.names", { n }) : i.t("ch.hint.letter", { n })).toLocaleUpperCase(i.locale);
}

/** The door's words. Off: today's three. On (Phase 2): SEND THEM YOUR NAME, then {COURIER} WROTE
    FIRST when theirs is in (their courier name in capitals: who wrote their NAME first), and the
    quiet YOU SIGNED · WAITING once mine is — the line the SwiftUI KDock and ChatDockRN draw
    unpressable. */
function signLabelOf(i: Pick<LettersDockInput, "t" | "identity" | "name" | "locale">, door: KChatDock["signDoor"]): string {
  const { t } = i;
  if (door === "none") return "";
  if (door === "offer") return t("ch.sendYours");
  if (!i.identity) return door === "waiting" ? t("ch.wentFirst") : t("ch.theyFirst");
  return door === "waiting" ? t("id2.door.waiting") : t("id2.door.theyFirst", { name: i.name });
}

/** Everything above and in place of the pen-pal chat's composer. */
export function buildLettersDock(i: LettersDockInput): KChatDock {
  const { t } = i;
  const signDoor = signDoorOf(i);
  return {
    ...NO_DOCK,
    signDoor,
    signLabel: signLabelOf(i, signDoor),
    terminal: i.gone || i.missing ? "gone" : "none",
    goneText: i.gone ? t("ch.gone") : t("fail.closed.body"),
    // before names you write back (the reply bar's own words, A2) — to the courier name once the switch is on, as on
    // the desk; after, a person you talk to
    placeholder: i.revealed
      ? t("th.sayTo", { name: i.name })
      : i.identity && !i.gone && !i.missing && i.name
        ? t("id.writeBackTo", { name: i.name })
        : t("ld.writeBackPh"),
    sendLabel: t("ld.send"),
    hint: lettersHint(i),
    // identity on: the door opens the signing sheet, and VoiceOver says so (ChatDockRN's signHint)
    signHint: i.identity && (signDoor === "offer" || signDoor === "theirsFirst") ? t("id2.door.hint") : "",
    emojiLabel: t("cmp.emoji"),
  };
}

/* ── the composer ─────────────────────────────────────────────────────── */

export type ComposerFacts = {
  /** the words as typed may go */
  canSend: boolean;
  /** over the limit, or a slow network; "" for none */
  status: string;
  /** the status is a refusal (postmark red) */
  statusAlarm: boolean;
  /** a send of these words is a plain line that goes as it is: the field may clear itself */
  clearOnSend: boolean;
};

const NO_STATUS = { status: "", statusAlarm: false };

/** The status line when nothing is refused: a slow send, else no connection and nothing kept. */
function quietStatus(i: { t: TFn; slow: boolean; offline?: boolean }): { status: string; statusAlarm: boolean } {
  if (i.slow) return { status: i.t("net.slow"), statusAlarm: false };
  if (i.offline) return { status: i.t("net.offline.title"), statusAlarm: false };
  return NO_STATUS;
}

/** The room's composer: a plain line weighs 2..1000; a fold needs words, at most 600 of them as
    folds.ts counts them (the server cut them silently before), and a question its prompt too; a
    song needs a link (checked on send). */
export function roomComposer(i: { t: TFn; text: string; prompt: string; mode: RoomMode | null; sending: boolean; slow: boolean; offline?: boolean }): ComposerFacts {
  const { t } = i;
  const slow = quietStatus(i);
  const body = i.text.trim();
  if (i.mode && i.mode.kind !== "song") {
    const over = foldOver(i.text);
    const needsPrompt = i.mode.kind === "question";
    // words but no question yet: Return would do nothing, so the status line says why (in red, and
    // VoiceOver hears it)
    const noPrompt = needsPrompt && !i.prompt.trim() && !!body;
    return {
      canSend: !!body && over === 0 && (!needsPrompt || !!i.prompt.trim()) && !i.sending,
      ...(over > 0
        ? { status: t("ui.overLimit", { n: String(over) }), statusAlarm: true }
        : noPrompt
          ? { status: t("rm.askNeedsPrompt"), statusAlarm: true }
          : slow),
      clearOnSend: false,
    };
  }
  if (i.mode?.kind === "song") {
    return { canSend: !!body && !i.sending, ...slow, clearOnSend: false };
  }
  const weight = weightedCount(i.text);
  const over = weight > LETTER_MAX;
  const canSend = weight >= REPLY_MIN && !over && !i.sending;
  return {
    canSend,
    ...(over ? { status: t("ui.overLimit", { n: String(weight - LETTER_MAX) }), statusAlarm: true } : slow),
    // a bare song link goes as a song once its title is fetched: the field waits for that
    clearOnSend: canSend && !isBareSong(i.text),
  };
}

/** The pen-pal chat's composer: a letter weighs 2..1000. */
export function lettersComposer(i: { t: TFn; text: string; sending: boolean; slow: boolean; offline?: boolean }): ComposerFacts {
  const weight = weightedCount(i.text);
  const over = weight > LETTER_MAX;
  const canSend = weight >= REPLY_MIN && !over && !i.sending;
  return {
    canSend,
    ...(over ? { status: i.t("ui.overLimit", { n: String(weight - LETTER_MAX) }), statusAlarm: true } : quietStatus(i)),
    clearOnSend: canSend,
  };
}

/* ── the band (pen-pal chat) ──────────────────────────────────────────── */

export type BandFacts = { me: number; them: number; line: string; named: boolean };

/** Both sides' five cells and the one line that says who still owes what (owner, 2026-10-10). */
export function bandFacts(myCount: number, otherCount: number, t: TFn): BandFacts {
  const me = Math.min(myCount, REVEAL);
  const them = Math.min(otherCount, REVEAL);
  const a = REVEAL - me;
  const b = REVEAL - them;
  const line = !a && !b ? t("ch.band.names") : !a ? t("ch.band.youDone", { n: b }) : !b ? t("ch.band.theyDone", { n: a }) : t("ch.band.both", { a, b });
  return { me, them, line, named: !a && !b };
}

/* ── the pen-pal header (A2) ───────────────────────────────────────────── */

export type LettersHeaderInput = {
  t: TFn;
  locale: string;
  /** their pen-pal name ("No. 5422"; switch on, the courier name) */
  name: string;
  /** who they are, from the screen's book (lib/stranger-who): with the switch on it brings the frost,
      the mark, the sign and VoiceOver's words. Absent, or the switch off: today's header exactly */
  who?: StrangerWho | null;
  /** their user id; null for a deleted account (the veil) */
  other: string | null;
  myCount: number;
  otherCount: number;
  theirSigned: boolean;
  /** lib/thread-state's state for the thread (the Kindreds rows' rule), null while loading */
  state: { label: string; toneKey: ThreadToneKey; kind: ThreadStateKind } | null;
  /** the face and name open their page (only once you know their voice) */
  canOpenPage: boolean;
  /** someone is on the other side to report (ReportMenu's own rule) */
  canReport: boolean;
};

/** No face to draw: the soft2 disc alone. */
export const NO_FACE: KChatFace = { kind: "placeholder", uri: "", key: "", overscan: 0, mask: 0 };

/** The pen-pal chat's progress band under the header's rule (live 1.0.4's, brought back by the
    owner 2026-10-19; ReachBand is its React Native twin): YOU and their name in capitals ("NO.
    8768", the courier name with the identity switch on), each with five cells, and bandFacts'
    line. Only while someone is on the other side (a deleted account has none); the callers draw
    this header only while names aren't traded. */
export function lettersBand(i: { t: TFn; locale: string; name: string; other: string | null; myCount: number; otherCount: number }): KChatBand | null {
  if (!i.other) return null;
  const f = bandFacts(i.myCount, i.otherCount, i.t);
  return {
    me: f.me,
    them: f.them,
    line: f.line,
    named: f.named,
    youLabel: i.t("ch.band.you"),
    themLabel: i.name.toLocaleUpperCase(i.locale),
    a11y: i.t("ch.band.a11y", { me: f.me, them: f.them }),
  };
}

/** The pen-pal chat's header (A2): the name, the line under it, FACE v1 and its frame, the band.
    The line is the thread's state (YOUR TURN / THEIR TURN in mute, other states in their tone),
    as live 1.0.4 has it; the counts are the band's.
    The band (lettersBand) replaced the five dots (owner, 2026-10-19): it says both sides' counts. */
export function lettersHeader(i: LettersHeaderInput): KChatHeader {
  const { t } = i;
  const kind = i.state?.kind ?? null;
  // the line under the name is the thread's state as live 1.0.4 says it (owner, 2026-10-19):
  // YOUR TURN / THEIR TURN in mute, any other state in its own tone; the band under the header
  // carries the counts, so the line never repeats them
  let sub = "";
  let tone: KChatHeader["tone"] = "mute";
  if (i.state) {
    sub = i.state.label;
    if (kind !== "yourTurn" && kind !== "theirTurn") tone = i.state.toneKey;
  }
  sub = sub.toLocaleUpperCase(i.locale);
  const seed = i.other || null;
  // switch on: the frosted window in the face slot (it never develops), the mark and the sign after the name
  const frost = seed && i.who?.face.kind === "frost" ? i.who.face.spec : null;
  return {
    room: false,
    face: NO_FACE,
    name: i.name,
    sub,
    tone,
    mask: seed ? mosaicMask(seed, developFor(i.otherCount)) : 0,
    frost,
    mark: seed ? i.who?.mark ?? null : null,
    sign: seed ? i.who?.sign ?? null : null,
    veil: !seed,
    // CorrespondentFace: a face that has come through is framed; brass once they went first
    frame: !seed || i.otherCount < REVEAL ? "none" : i.theirSigned ? "brass" : "line",
    band: lettersBand({ t, locale: i.locale, name: i.name, other: seed, myCount: i.myCount, otherCount: i.otherCount }),
    // VoiceOver: "Sunday Kite, she, Gemini" with the switch on (the name alone off), the line; the band says the counts
    a11yLabel: join(seed && i.who ? i.who.spoken : i.name, sub),
    canOpenPage: i.canOpenPage,
    backLabel: t("a11y.back"),
    moreLabel: i.canReport ? t("rp.menu.a11y") : "",
  };
}

/* ── the kindreds header (B) ───────────────────────────────────────────── */

export type RoomHeaderInput = {
  t: TFn;
  locale: string;
  /** their name, traded */
  name: string;
  /** the line under it as the room has always worded it: KINDRED SINCE {the day names were
      traded}, else how they write (ChatHeader's subtitle); "" for none. Drawn in capitals */
  sub: string;
  /** the kindred's face as lib/faces resolves it (their chosen portrait, the glyph, the veil) */
  face: KChatFace;
  /** someone is on the other side to report (ReportMenu's own rule) */
  canReport: boolean;
};

/** The kindreds chat's header (chat composers B): ‹, the kindred's round face 44 across, the name,
    the line under it in mute capitals, ⋯. No band: the five are behind them. The face and name
    open their page. */
export function roomHeader(i: RoomHeaderInput): KChatHeader {
  const { t } = i;
  const sub = i.sub.toLocaleUpperCase(i.locale);
  return {
    room: true,
    face: i.face,
    name: i.name,
    sub,
    tone: "mute",
    mask: 0,
    // a kindred: no window, no mark, no sign (the face and the name say enough)
    frost: null,
    mark: null,
    sign: null,
    veil: false,
    frame: "none",
    band: null,
    a11yLabel: join(i.name, sub),
    canOpenPage: true,
    backLabel: t("a11y.back"),
    moreLabel: i.canReport ? t("rp.menu.a11y") : "",
  };
}

/* ── the pen-pal chat once names are traded ("chatheader", 2026-11-09) ── */

export type RevealedHeaderInput = {
  t: TFn;
  /** their name, traded */
  name: string;
  /** the kindred's face as lib/faces resolves it (role kindred: their portrait, the glyph, the veil) */
  face: KChatFace;
  /** the thread's state (lib/thread-state), as ChatHeader's "letters" variant shows it; null for none */
  state: { label: string; toneKey: ThreadToneKey } | null;
  canOpenPage: boolean;
  /** someone is on the other side to report (ReportMenu's own rule) */
  canReport: boolean;
};

/** A pen-pal chat seen in place after names are traded: what the React Native ChatHeader's
    "letters" variant shows (52 tall, ‹, the round face at 36, the name in 600 16, the state in
    its tone under it, ⋯), drawn by Swift's KChatHeader when `revealed`. The state's label goes
    as it is (ChatHeader never upper-cases it) in its own tone, whatever its kind; no band. */
export function revealedLettersHeader(i: RevealedHeaderInput): KChatHeader {
  const { t } = i;
  const sub = i.state?.label ?? "";
  return {
    room: true,
    revealed: true,
    face: i.face,
    name: i.name,
    sub,
    tone: i.state?.toneKey ?? "mute",
    mask: 0,
    frost: null,
    mark: null,
    sign: null,
    veil: false,
    frame: "none",
    band: null,
    a11yLabel: join(i.name, sub),
    canOpenPage: i.canOpenPage,
    backLabel: t("a11y.back"),
    moreLabel: i.canReport ? t("rp.menu.a11y") : "",
  };
}

/* ── the ideas (B, Prompt 4)───────────────────────────────────────────── */

/* THE IDEAS BUBBLE'S SENTENCES. There is no server pool of openers (the
   spec's): the room offers the 36 stamps' prompts (data/stamps, already in
   nine languages), in an order of its own. Prompts from the categories the
   OTHER person writes in come first — their opening letter's stamp, and the
   stamps their letters and lines call up (lib/stamp-suggest stampsHeard) —
   then the rest; each part shuffled by the room's id, so every room has its
   own order and the same room the same one. useRoomModel walks it, one
   sentence at a time, and wraps only once every sentence has been offered.

   THE WALK REMEMBERS WHAT IT OFFERED, not where it stood (IdeaWalk). The
   order is not fixed for the life of a room: their categories move when a
   new letter of theirs tips the count, and the reader can change language.
   A position in the order would then point into a different order, and
   sentences already offered would come round again before the rest had
   been (the owner's rule: no repeat until the pool is used). So the walk
   keeps the sentences it moved past, offers the first in the order now
   that isn't among them, and starts over once every one has been; a new
   walk never opens on the sentence that closed the last one. A language
   change starts a fresh walk in the new words (the old ones aren't in it). */

/** One prompt the bubble can offer: its stamp's category and its words in the reader's language. */
export type IdeaPrompt = { cat: string; text: string };

/** The strongest categories counted as "theirs" (three of the six: half). */
export const THEIR_CATEGORIES = 3;

/** FNV-1a over the string's UTF-16 units: a room id as a seed. */
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: a small seeded generator in [0, 1), the same sequence for the same seed. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** The categories the other person writes in, strongest first, at most `max`: their opening
    letter's stamp leads (the one they chose themselves); then each category by how many of their
    letters and lines call up one of its stamps (`heard`: the stamp ids each one calls up), ties to
    the one heard first. */
export function theirCategories(i: {
  openingStamp: string | null;
  heard: readonly (readonly string[])[];
  catOf: (stampId: string) => string | null | undefined;
  max?: number;
}): string[] {
  const max = i.max ?? THEIR_CATEGORIES;
  const score = new Map<string, number>();
  for (const ids of i.heard) {
    // one vote per letter for each category it calls up
    const cats = new Set<string>();
    for (const id of ids) {
      const cat = i.catOf(id);
      if (cat) cats.add(cat);
    }
    for (const cat of cats) score.set(cat, (score.get(cat) ?? 0) + 1);
  }
  // Map keeps the order heard; a stable sort keeps it among equals
  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1]).map(([cat]) => cat);
  const opening = i.openingStamp ? i.catOf(i.openingStamp) ?? null : null;
  const out = opening ? [opening, ...ranked.filter((c) => c !== opening)] : ranked;
  return out.slice(0, Math.max(0, max));
}

/** The order the ideas bubble offers its sentences in: each sentence once (blank ones dropped),
    shuffled by `seed` (the room's id), those whose category is one of `theirCats` first. */
export function ideaOrder(prompts: readonly IdeaPrompt[], theirCats: readonly string[], seed: string): string[] {
  const seen = new Set<string>();
  const pool: IdeaPrompt[] = [];
  for (const p of prompts) {
    const text = p.text.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    pool.push({ cat: p.cat, text });
  }
  const rand = seeded(hash32(seed));
  for (let k = pool.length - 1; k > 0; k--) {
    const j = Math.floor(rand() * (k + 1));
    [pool[k], pool[j]] = [pool[j], pool[k]];
  }
  const theirs = new Set(theirCats);
  return [...pool.filter((p) => theirs.has(p.cat)), ...pool.filter((p) => !theirs.has(p.cat))].map((p) => p.text);
}

/** Where a room's ideas stand: the sentences moved past since the walk began (↻ ANOTHER or USE
    IT), and the one that closed the previous walk ("" for none), which a new walk doesn't open
    on. */
export type IdeaWalk = { readonly seen: ReadonlySet<string>; readonly last: string };

/** A walk that has offered nothing yet. */
export const IDEA_WALK_START: IdeaWalk = { seen: new Set(), last: "" };

/** The sentence the bubble offers now: the first in `order` the walk hasn't moved past (and not
    the one that closed the previous walk, while another is left); "" for an empty order. */
export function ideaNow(order: readonly string[], walk: IdeaWalk): string {
  let fallback = "";
  for (const s of order) {
    if (walk.seen.has(s)) continue;
    if (s !== walk.last) return s;
    fallback = s;
  }
  return fallback || (order[0] ?? "");
}

/** The walk once the sentence it offers now has been moved past: that sentence joins the seen,
    and once every sentence of `order` has been seen a new walk begins, remembering it as the last
    so the next isn't the same one. */
export function ideaPassed(order: readonly string[], walk: IdeaWalk): IdeaWalk {
  const now = ideaNow(order, walk);
  if (!now) return walk;
  const seen = new Set(walk.seen);
  seen.add(now);
  if (order.every((s) => seen.has(s))) return { seen: new Set(), last: now };
  return { seen, last: walk.last };
}

/** The words USE IT leaves in the field: the sentence alone in an empty field; after the
    reader's own words, a space and then the sentence (nothing typed is ever thrown away). */
export function withIdea(current: string, idea: string): string {
  const typed = current.replace(/\s+$/u, "");
  return typed ? `${typed} ${idea}` : idea;
}

/** The road to the name: the first five letters each way, in the order they left. */
export function roadOf(messages: readonly ThreadMessage[]): ThreadMessage[] {
  const out: ThreadMessage[] = [];
  let mine = 0;
  let theirs = 0;
  for (const m of [...messages].sort((x, y) => (x.date || "").localeCompare(y.date || ""))) {
    if (m.mine ? mine >= REVEAL : theirs >= REVEAL) continue;
    if (m.mine) mine++;
    else theirs++;
    out.push(m);
    if (mine >= REVEAL && theirs >= REVEAL) break;
  }
  return out;
}

/** The newest message's time, else the day the room opened (lib/kindred-expiry's clock). */
export function lastWordAt(d: ThreadDetail | null, nowMs: number): number {
  if (!d) return nowMs;
  let best = -Infinity;
  for (const m of d.messages) {
    const n = Date.parse(m.date);
    if (Number.isFinite(n) && n > best) best = n;
  }
  if (best > -Infinity) return best;
  const since = d.since ? Date.parse(d.since) : NaN;
  return Number.isFinite(since) ? since : nowMs;
}
