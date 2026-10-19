import type { ThreadSummary } from "../../lib/db";
import type { FaceInput } from "../../lib/faces";
import type { KMenuAction } from "../../../modules/kindredly-ui/src/types";
import { THREAD_STATE, threadStateKind, type ThreadStateKind } from "../../lib/thread-state";
import { unreadOf } from "../../lib/room-seen";
import { closingSoon, daysLeft, isExpired, quietDays } from "../../lib/kindred-expiry";
import { EACH_WAY, developFor, hashStr, mosaicMask } from "../../lib/mosaic";
import { NO_WHO_MARKS, whoBook, type WhoBook, type WhoMarks } from "../../lib/stranger-who";
import type { FrostSpec } from "../../lib/frost";

/* THE KINDREDS TAB, AS DATA (10a step 5). Pure: no React, no React
   Native, no i18n — every word comes in through `fmt`, so
   `node src/screens/kindreds/kindreds-model.test.ts` locks the rules.
   Both renderers draw what buildKindredsView returns and nothing else:
   the SwiftUI screen (KindredsNative → KKindredsView) and the React Native
   fallback (KindredsRN) can't drift apart on who is listed, in what order,
   with which words, badges and menus.

   WHO IS LISTED. A correspondence appears the moment either side has
   written (mine > 0 || theirs > 0): the old `mine > 0` hid every reply to
   your own pool letter. A closed account (0009 nulls their side) stays,
   readable, at the foot.

   THE ORDER (owner, 2026-10-15): whatever is on you first, then the
   newest — no kindred / pen pal grouping. "On you" is the tab's one rule
   (lib/waiting onYou): a kindred with letters of theirs you haven't opened
   on this phone, a pen pal whose turn it is yours (or the brass five-each
   moment). Under ALL with no filter, the pen pals whose last letter is
   yours fold into one row (THEIR TURN, owner 10-12); rooms never fold.
   Rooms quiet for thirty days go to an Expired group (REKINDLE), and
   closed accounts come last; neither shows under the your-turn filter —
   except a quiet room with unread letters, which the title counts, so the
   filter shows it too (critic: "N LETTERS TO ANSWER" used to open on
   ALL ANSWERED), its badge in the trailing slot instead of Rekindle.

   ENTITLEMENT. Nothing expires before the entitlement has answered
   (`settled`): a First Class member's rooms used to flash as Expired on a
   cold start. CLOSES IN n DAYS waits the same way, and the Plush count
   (named kindreds) is 0 until then.

   WHO A PEN PAL IS (identity Phase 1) comes from one place, the book in
   `fmt.who` (lib/stranger-who, built by lib/who useWhoBook). Switch off —
   or no book — every row, the fold and the orbit are exactly what they
   were: "No. 4481", the mosaic developing with their letters. Switch on: a
   pen pal is the courier name the reader's list gives them, with their
   ♀/♂ and star sign once the identity client answers; their face is the
   frosted window everywhere (rows, the fold, the orbit), the same window
   on every ring — it never develops; the ring itself is the progress —
   and VoiceOver opens the row with "Pen pal". A thread from before the
   switch says "was No. 4481" for its first fourteen days on this device.
   The legend's PEN PALS glyph becomes a small frosted square
   (legendFrost). Phase 2: for seven days after names were traded, a
   kindred's row says "was Sunday Kite", the courier name they wore
   (kindredWas), in the same quiet place. Kindreds keep their names and faces; nobody is ever
   sorted, hidden or chosen by a mark or a sign.

   LOAD STATES. loading (nothing yet) · ready (a list, kept or fresh) ·
   none (a real answer with nothing in it: no session, a guest — the empty
   state) · failed (no answer and nothing kept — an offline line under
   Wren, never "Nobody knows your name yet"). Until there is an answer
   (loading, failed) the screen claims nothing it can't back: no title
   status (not ALL ANSWERED), no chip counts (not "Pen pals 0"), no empty
   line or hint under "Not connected.". */

export type ListTab = "all" | "kindreds" | "penpals";
/** the your-turn filter (the title's tap) or none; the old "their" filter could never be set */
export type Show = null | "your";
export type LoadState = "loading" | "ready" | "none" | "failed";

export const LIST_TABS: readonly ListTab[] = ["all", "kindreds", "penpals"];
export const TAB_LABEL: Record<ListTab, string> = { all: "kd.tab.all", kindreds: "kd.tab.kindreds", penpals: "kd.tab.penPals" };
/** faces shown on the folded row; the count says the rest */
export const FOLD_FACES = 6;

/** Her desk, as useWrenDesk reads it. */
export type DeskFacts = { unread: number; lastLine: string | null; lastAt: string | null };

export type KindredsFacts = {
  /** what to list (a dev build has already put the demo rows in) */
  threads: readonly ThreadSummary[];
  /** room-seen: their count you've had in front of you, per thread */
  ledger: Readonly<Record<string, number>>;
  premium: boolean;
  /** the entitlement's first answer is in */
  settled: boolean;
  tab: ListTab;
  show: Show;
  loadState: LoadState;
  desk: DeskFacts;
  /** the official account's name (Wren, never the reader's courier name) */
  wrenName: string;
  /** the notifications-off bar shows */
  notice: boolean;
  /** her once-line, her name already in it; null when it doesn't show */
  wrenLine: string | null;
  /** dev page only: give demo rows their menus so they can be tried */
  demoMenus?: boolean;
};

export type KindredsFormat = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** a list time (format listWhen) */
  when: (at: number | string) => string;
  /** a pen pal's name, "No. 4481" (format penPalName; a closed account reads ld.unsigned) */
  penPal: (other: string | null | undefined) => string;
  /** who strangers are (lib/who useWhoBook). Absent = the switch off, built from `penPal`: exactly the list as it was */
  who?: WhoBook;
  /** a label as a chip says it: "Pen pals", "Seelenverwandte" (sentence case in the locale) */
  sentence: (s: string) => string;
  /** upper case in the locale */
  upper: (s: string) => string;
};

export type TagTone = "ind" | "mute" | "post" | "brass";
export type RowTag = { text: string; tone: TagTone };
export type MenuKey = "rekindle" | "read" | "unread" | "page" | "report" | "block";

export type RowVM = WhoMarks & {
  id: string;
  kind: "kindred" | "penpal" | "wren";
  /** null for Wren (her picture is the official bird); a pen pal's carries `frost` once the switch is on */
  face: FaceInput | null;
  faceBadge: boolean;
  /** a pen pal: "No. 4481", or (switch on) the courier name, followed by the mark and the sign (WhoMarks: null / "" for a kindred, Wren, or none) */
  name: string;
  /** switch on, a pen pal from before the switch, for 14 days: "was No. 4481" on the row's second line, ahead of the preview;
      a kindred for 7 days after names were traded: "was Sunday Kite" (Phase 2); "" otherwise */
  was: string;
  nameDim: boolean;
  /** "2/5"; "" */
  progress: string;
  /** "" hides it */
  time: string;
  tags: RowTag[];
  youPrefix: string;
  preview: string;
  /** "3", "9+"; "" */
  badge: string;
  /** "Rekindle ›"; "" */
  trailingLink: string;
  dim: boolean;
  a11yLabel: string;
  actions: KMenuAction[];
  /** where a tap goes */
  opens: "room" | "chat" | "wren";
};

/** One little face on the folded row: the developing mosaic (`mask`), or with the switch on the frosted window (`frost`, never developing). */
export type FoldFaceVM = { id: string; seed: string; develop: number; mask: number; frost: FrostSpec | null; a11yLabel: string };
export type FoldVM = { faces: FoldFaceVM[]; more: string; label: string; a11yLabel: string };

export type ItemVM =
  | { type: "wrenLine"; id: string; text: string }
  | { type: "notice"; id: string; text: string; closeLabel: string }
  | { type: "line"; id: string; text: string }
  | { type: "showing"; id: string; text: string; clear: string }
  | { type: "wren"; id: string; row: RowVM }
  | { type: "row"; id: string; row: RowVM }
  | { type: "fold"; id: string; fold: FoldVM }
  | { type: "emptyLine"; id: string; text: string }
  | { type: "hintKindreds"; id: string; text: string }
  | { type: "hintPenpals"; id: string; text: string; link: string }
  | { type: "groupHeader"; id: string; text: string };

export type ChipVM = {
  key: ListTab;
  label: string;
  /** "" for ALL */
  count: string;
  glyph: "none" | "kindred" | "penPal";
  selected: boolean;
  dot: boolean;
  a11yLabel: string;
};

/** One stranger on the orbit. a0 comes from a stable order (thread id), the drift from the
    correspondent's id, so a reply that re-sorts the list moves nobody. */
export type OrbitVM = {
  id: string;
  seed: string;
  develop: number;
  /** the mosaic as far as their letters have carried it (switch off) */
  mask: number;
  /** switch on: their frosted window instead (base + lights + hairline at these sizes, lib/frost frostLayers), the same on every ring; null when off */
  frost: FrostSpec | null;
  /** THEIR letters, 0..5 (0 waits outside the rings) */
  ring: number;
  /** letters each way, 0..5 (the folded React Native line's place) */
  each: number;
  a0: number;
  dir: 1 | -1;
  /** seconds per circuit */
  period: number;
  /** it is your turn: the mosaic inked in ind (off), a 1.5pt ind ring round the window (on) */
  turn: boolean;
};

export type KindredsView = {
  title: string;
  status: string;
  statusActive: boolean;
  statusA11y: string;
  legendCloser: string;
  legendTurn: string;
  orbitChipLabel: string;
  /** the identity switch the view was built with (the orbit draws windows, the legend a frosted square) */
  identity: boolean;
  /** switch on: the PEN PALS legend glyph's small frosted square (a fixed sample window, nobody's); null when off */
  legendFrost: FrostSpec | null;
  chips: ChipVM[];
  orbit: OrbitVM[];
  items: ItemVM[];
  /** on you: the title's count and the tab badge */
  waiting: number;
  /** named kindreds that haven't expired: the Plush moment */
  named: number;
  /** a real answer with nobody in it: the React Native empty state */
  empty: boolean;
};

/* ── the rules ─────────────────────────────────────────────────────────── */

/** On the tab once either side has written. */
export const listed = (threads: readonly ThreadSummary[]): ThreadSummary[] => threads.filter((t) => t.mine > 0 || t.theirs > 0);

/** Their letters you haven't had in front of you (0 for a room never opened). */
export const unreadIn = (ledger: Readonly<Record<string, number>>, th: ThreadSummary): number => unreadOf(ledger as Record<string, number>, th.id, th.theirs);

/** A room gone quiet (30 days, not First Class) — only once the entitlement has answered. */
export const isQuietRoom = (th: ThreadSummary, premium: boolean, settled: boolean): boolean => th.revealed && settled && isExpired(th.lastAt, premium);

/** A room inside its last week — only once the entitlement has answered. */
export const isClosing = (th: ThreadSummary, premium: boolean, settled: boolean): boolean => th.revealed && settled && closingSoon(th.lastAt, premium);

const stateKind = (th: ThreadSummary): ThreadStateKind => threadStateKind(th);

/** The list was read (fresh or kept) or is really empty: what it says can be claimed. */
export const answered = (s: LoadState): boolean => s === "ready" || s === "none";

/** Is this correspondence on you? (lib/waiting onYou's rule, per thread) */
export function onMeOf(th: ThreadSummary, ledger: Readonly<Record<string, number>>): boolean {
  if (th.gone) return false;
  return th.revealed ? unreadIn(ledger, th) > 0 : THREAD_STATE[stateKind(th)].needsYou;
}

/** How much is on you: a kindred's unread letters each, plus one per pen pal whose turn is
    yours. Closed accounts owe nothing. The tab badge, the title and lib/waiting all use this. */
export function countOnYou(threads: readonly ThreadSummary[], ledger: Readonly<Record<string, number>>): number {
  let n = 0;
  for (const t of threads) {
    if (t.gone) continue;
    if (t.revealed) n += unreadIn(ledger, t);
    else if (THREAD_STATE[stateKind(t)].needsYou) n += 1;
  }
  return n;
}

/** The long-press menu's items, in order (kindreds.tsx before 10a, unchanged): a kindred gets
    Rekindle (quiet rooms), Mark as read (when something is unread) or Mark as unread (not
    quiet, something of theirs to read), Their page; everyone Report and Block. Closed accounts
    and demo rows get nothing, and Wren isn't a thread. */
export function menuKeys(th: ThreadSummary, quietRow: boolean, unread: number, demoMenus = false): MenuKey[] {
  if (th.gone || (!demoMenus && th.id.startsWith("demo-"))) return [];
  const keys: MenuKey[] = [];
  if (th.revealed) {
    if (quietRow) keys.push("rekindle");
    // a quiet room's unread letters still count in the title, so they can be marked read too
    if (unread > 0) keys.push("read");
    else if (!quietRow && th.theirs > 0) keys.push("unread");
    keys.push("page");
  }
  keys.push("report", "block");
  return keys;
}

const MENU: Record<MenuKey, { label: string; icon: string; destructive?: boolean }> = {
  rekindle: { label: "kd.menu.rekindle", icon: "flame" },
  read: { label: "kd.menu.markRead", icon: "envelope.open" },
  unread: { label: "kd.menu.markUnread", icon: "envelope.badge" },
  page: { label: "kd.menu.theirPage", icon: "person.crop.circle" },
  report: { label: "rp.menu.report", icon: "flag", destructive: true },
  block: { label: "rp.menu.block", icon: "hand.raised", destructive: true },
};

/** a badge's number: 1–9 as is, then "9+" (components/10a kit badgeCount) */
export const badgeText = (n: number): string => (n > 9 ? "9+" : String(Math.max(0, Math.floor(n))));

/** A thread's correspondent as a face (lib/faces threadFaceInput, kept in step: faces.ts
    imports React Native, which a node test can't load). With the switch on (`book`), a pen
    pal's input carries their frosted window; off, it is exactly what it was. */
export function faceInputOf(th: ThreadSummary, book?: WhoBook): FaceInput {
  if (th.revealed) return { role: "kindred", seed: th.other, avatarId: th.otherFace ?? null, gone: !!th.gone };
  const pal: FaceInput = { role: "penpal", seed: th.other, develop: developFor(th.theirs, false), gone: !!th.gone };
  const frost = book && !th.gone ? book.frost(th.other) : null;
  return frost ? { ...pal, frost } : pal;
}

/** The book a builder uses: the caller's, or (none given) the switch off, from its penPal and t. */
export function bookOf(fmt: Pick<KindredsFormat, "t" | "penPal" | "who">): WhoBook {
  return fmt.who ?? whoBook({ identity: false, t: fmt.t, lang: "en", penPal: (uid) => fmt.penPal(uid) });
}

/** The legend glyph's sample window: a fixed seed on the frost channel, never a person's. */
export const LEGEND_FROST_SEED = "kindredly:legend";

/** Everything that decides who is where. */
export type Classified = {
  listed: ThreadSummary[];
  live: ThreadSummary[];
  closed: ThreadSummary[];
  /** the filtered, ordered list (before folding) */
  main: ThreadSummary[];
  /** the Expired group */
  quiet: ThreadSummary[];
  /** closed accounts at the foot */
  shut: ThreadSummary[];
  /** pen pals folded into THEIR TURN */
  folded: ThreadSummary[];
  /** main, less the folded */
  rows: ThreadSummary[];
  counts: { kindreds: number; penpals: number };
  dots: Record<ListTab, boolean>;
  waiting: number;
  named: number;
  empty: boolean;
  /** what shows when the list itself is empty */
  emptyLine: null | "allAnswered" | "hintKindreds" | "hintPenpals";
};

export function classify(f: Pick<KindredsFacts, "threads" | "ledger" | "premium" | "settled" | "tab" | "show" | "loadState" | "desk">): Classified {
  const all = listed(f.threads);
  const live = all.filter((t) => !t.gone);
  const closed = all.filter((t) => !!t.gone);
  const quietOf = (t: ThreadSummary) => isQuietRoom(t, f.premium, f.settled);
  const onMe = (t: ThreadSummary) => onMeOf(t, f.ledger);
  const inTab = (t: ThreadSummary) => (f.tab === "all" ? true : f.tab === "kindreds" ? t.revealed : !t.revealed);
  const newest = (a: ThreadSummary, b: ThreadSummary) => b.lastAt - a.lastAt;
  // on you first, then the newest (owner 10-15)
  const order = (a: ThreadSummary, b: ThreadSummary) => Number(onMe(b)) - Number(onMe(a)) || newest(a, b);

  const main = live.filter((t) => (f.show === "your" ? onMe(t) : !quietOf(t)) && inTab(t)).sort(order);
  const quiet = f.show ? [] : live.filter((t) => quietOf(t) && inTab(t)).sort(newest);
  const shut = f.show ? [] : closed.filter(inTab).sort(newest);

  const fold = f.tab === "all" && !f.show;
  // only a pen pal whose last letter is yours is waiting on them
  const folds = (t: ThreadSummary) => !t.revealed && !onMe(t) && t.lastSenderMe;
  const folded = fold ? main.filter(folds) : [];
  const rows = fold ? main.filter((t) => !folds(t)) : main;

  // the empty line only when the paper really is empty (kindreds.tsx:412, exactly): under a
  // filter or on PEN PALS whenever the list is; on ALL and KINDREDS not over quiet or closed rows.
  // And only over a real answer: with nothing read yet (loading, failed) an empty list says
  // nothing about the reader's pen pals.
  let emptyLine: Classified["emptyLine"] = null;
  if (answered(f.loadState) && main.length === 0 && (f.show || f.tab === "penpals" || (quiet.length === 0 && shut.length === 0))) {
    emptyLine = f.show ? "allAnswered" : f.tab === "kindreds" ? "hintKindreds" : f.tab === "penpals" ? "hintPenpals" : null;
  }

  return {
    listed: all,
    live,
    closed,
    main,
    quiet,
    shut,
    folded,
    rows,
    counts: { kindreds: live.filter((t) => t.revealed).length, penpals: live.filter((t) => !t.revealed).length },
    dots: {
      all: f.desk.unread > 0 || live.some(onMe),
      kindreds: live.some((t) => t.revealed && onMe(t)),
      penpals: live.some((t) => !t.revealed && onMe(t)),
    },
    waiting: countOnYou(all, f.ledger),
    named: f.settled ? all.filter((t) => t.revealed && !isExpired(t.lastAt, f.premium)).length : 0,
    empty: (f.loadState === "ready" || f.loadState === "none") && all.length === 0,
    emptyLine,
  };
}

/** The strangers on the orbit (pen pals still on their way, not closed), in a stable order. */
export function orbitItems(live: readonly ThreadSummary[], ledger: Readonly<Record<string, number>>, book?: WhoBook): OrbitVM[] {
  const coming = live.filter((t) => !t.revealed && !t.gone && !!t.other).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const n = Math.max(coming.length, 1);
  return coming.map((t, i) => {
    const h = hashStr(t.other + "@drift");
    const develop = developFor(t.theirs, false);
    return {
      id: t.id,
      seed: t.other,
      develop,
      mask: mosaicMask(t.other, develop),
      frost: book ? book.frost(t.other) : null,
      ring: Math.min(Math.max(0, t.theirs), EACH_WAY),
      each: Math.min(t.mine, t.theirs, EACH_WAY),
      // spread round the ring by the stable order, jittered by ±22° so neighbours never move in lockstep
      a0: -Math.PI / 2 + (i / n) * Math.PI * 2 + (((hashStr(t.other) % 44) - 22) * Math.PI) / 180,
      dir: (h & 1) === 0 ? 1 : -1,
      period: 150 + (h % 120),
      turn: onMeOf(t, ledger),
    };
  });
}

/** How long a new kindred's row still says the courier name they wore (identity Phase 2, plan §1 row 5). */
export const KINDRED_WAS_DAYS = 7;

/** "was Sunday Kite" (id2.kd.was) on a kindred's row for KINDRED_WAS_DAYS after the names met
    (revealedAt), with the switch on; "" otherwise — switch off, a gone account, no date, or later. */
export function kindredWas(
  th: Pick<ThreadSummary, "revealed" | "gone" | "other" | "revealedAt">,
  book: WhoBook,
  t: KindredsFormat["t"],
  now: number = Date.now(),
): string {
  if (!book.identity || !th.revealed || th.gone || !th.other || th.revealedAt == null) return "";
  const age = now - th.revealedAt;
  if (!(age >= 0 && age < KINDRED_WAS_DAYS * 864e5)) return "";
  return t("id2.kd.was", { name: book.name(th.other) });
}

/** One row (a kindred, a pen pal, a quiet room, a closed account). */
export function rowFor(
  th: ThreadSummary,
  ctx: { quiet: boolean; closing: boolean; unread: number; yourFilter: boolean; demoMenus?: boolean },
  fmt: KindredsFormat,
): RowVM {
  const { t } = fmt;
  const book = bookOf(fmt);
  const kind = stateKind(th);
  const st = THREAD_STATE[kind];
  const kindred = th.revealed;
  const gone = !!th.gone;
  const quiet = ctx.quiet;
  // a pen pal as the book says (off: penPal exactly; on: the courier name, mark and sign); a kindred by the name they gave
  const pal = kindred ? null : book.who(gone ? null : th.other);
  const name = pal ? pal.name : th.otherName || t("kd.aKindred");
  const marks: WhoMarks = pal ? { mark: pal.mark, markLabel: pal.markLabel, sign: pal.sign, signLabel: pal.signLabel } : NO_WHO_MARKS;
  const was = pal ? book.was(th) : kindredWas(th, book, t);
  const left = ctx.closing ? daysLeft(th.lastAt) : 0;
  const closes = ctx.closing ? (left <= 1 ? t("kd.closesDay") : t("kd.closesIn", { n: left })) : null;
  // the brass moment: five letters each way, names may be traded
  const milestone = !kindred && !gone && (kind === "swapNames" || kind === "theyWentFirst") ? t(st.labelKey) : null;
  // a kindred counts letters (gone when read); a pen pal says whose turn it is, in words (owner 10-15).
  // A quiet room shows its count only under the your-turn filter, in Rekindle's place.
  const count = gone || !kindred ? 0 : quiet ? (ctx.yourFilter ? ctx.unread : 0) : ctx.unread;
  const turn = gone || quiet || kindred || milestone ? null : { label: t(st.labelKey), tone: (st.toneKey === "ind" ? "ind" : "mute") as TagTone };
  const each = Math.min(th.mine, th.theirs, EACH_WAY);
  const progress = !kindred && !gone ? `${each}/${EACH_WAY}` : "";
  const time = quiet ? "" : fmt.when(th.lastAt);
  const statusLine = quiet ? t("kd.expiredRow", { n: quietDays(th.lastAt) }) : gone ? t("kd.accountClosed") : null;

  const tags: RowTag[] = [];
  if (statusLine == null) {
    if (closes) tags.push({ text: fmt.upper(closes), tone: "post" });
    if (milestone) tags.push({ text: fmt.upper(milestone), tone: "brass" });
    if (turn) tags.push({ text: fmt.upper(turn.label), tone: turn.tone });
  }

  const a11yLabel = [
    // switch on, a pen pal is said as one: "Pen pal, Sunday Kite, she, Gemini, was No. 4481" (off: the name alone, as ever)
    pal && book.identity ? t("id.vo.penPal") : null,
    pal ? pal.spoken : name,
    was || null,
    closes,
    milestone ?? turn?.label ?? null,
    progress ? t("mk.ofFive", { n: each }) : null,
    statusLine,
    count ? String(count) : null,
    time || null,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    id: th.id,
    kind: kindred ? "kindred" : "penpal",
    face: faceInputOf(th, book),
    faceBadge: false,
    name,
    ...marks,
    was,
    // a quiet room's name is muted as well as a closed account's (inventory 38: "dim rows: face
    // at .45, name muted, no time")
    nameDim: quiet || gone,
    progress,
    time,
    tags,
    youPrefix: statusLine == null && th.lastSenderMe ? `${t("mm.you")}: ` : "",
    preview: statusLine ?? (th.preview || ""),
    badge: count > 0 ? badgeText(count) : "",
    trailingLink: quiet && count === 0 ? `${t("kd.menu.rekindle")} ›` : "",
    dim: quiet || gone,
    a11yLabel,
    actions: menuKeys(th, quiet, ctx.unread, ctx.demoMenus).map((key) => ({
      key,
      title: t(MENU[key].label),
      icon: MENU[key].icon,
      destructive: !!MENU[key].destructive,
    })),
    opens: kindred ? "room" : "chat",
  };
}

/** Wren's desk as a row: pinned first in ALL with no filter; no menu. */
export function wrenRow(desk: DeskFacts, wrenName: string, fmt: KindredsFormat): RowVM {
  const { t } = fmt;
  const time = desk.lastAt ? fmt.when(desk.lastAt) : "";
  return {
    id: "wren",
    kind: "wren",
    face: null,
    faceBadge: true,
    name: wrenName,
    ...NO_WHO_MARKS,
    was: "",
    nameDim: false,
    progress: "",
    time,
    tags: [],
    youPrefix: "",
    preview: desk.lastLine ?? t("wo.row.sub"),
    badge: desk.unread > 0 ? badgeText(desk.unread) : "",
    trailingLink: "",
    dim: false,
    a11yLabel: [wrenName, t("wo.tag"), desk.unread ? String(desk.unread) : null, time || null].filter(Boolean).join(", "),
    actions: [],
    opens: "wren",
  };
}

/** The folded THEIR TURN row. */
export function foldFor(folded: readonly ThreadSummary[], fmt: KindredsFormat): FoldVM {
  const book = bookOf(fmt);
  const label = `${fmt.sentence(fmt.t("state.waitingThem"))} · ${folded.length}`;
  const shown = folded.slice(0, FOLD_FACES);
  return {
    faces: shown.map((th) => {
      const develop = developFor(th.theirs, false);
      return { id: th.id, seed: th.other, develop, mask: mosaicMask(th.other, develop), frost: book.frost(th.other), a11yLabel: book.who(th.other).spoken };
    }),
    more: folded.length > shown.length ? `+${folded.length - shown.length}` : "",
    label,
    a11yLabel: `${label}, ${fmt.sentence(fmt.t("kd.tab.penPals"))}`,
  };
}

/** The whole screen, as both renderers draw it. */
export function buildKindredsView(f: KindredsFacts, fmt0: KindredsFormat): KindredsView {
  // one book for the whole view (the caller's, or the switch off), handed to every row
  const book = bookOf(fmt0);
  const fmt: KindredsFormat = fmt0.who ? fmt0 : { ...fmt0, who: book };
  const { t } = fmt;
  const c = classify(f);
  const yourFilter = f.show === "your";
  const row = (th: ThreadSummary, quiet: boolean): ItemVM => ({
    type: "row",
    id: th.id,
    row: rowFor(th, { quiet, closing: !quiet && isClosing(th, f.premium, f.settled), unread: unreadIn(f.ledger, th), yourFilter, demoMenus: f.demoMenus }, fmt),
  });

  const items: ItemVM[] = [];
  if (f.wrenLine) items.push({ type: "wrenLine", id: "wren-line", text: f.wrenLine });
  if (f.notice) items.push({ type: "notice", id: "notice", text: t("nb.turnOn"), closeLabel: t("nb.close") });
  if (f.loadState === "failed") items.push({ type: "line", id: "offline", text: t("auth.err.offline") });
  if (f.show) items.push({ type: "showing", id: "showing", text: fmt.sentence(t("kd.showing", { what: t("state.yourTurn"), n: c.main.length })), clear: fmt.sentence(t("kd.clear")) });
  if (f.tab === "all" && !f.show) items.push({ type: "wren", id: "wren", row: wrenRow(f.desk, f.wrenName, fmt) });
  for (const th of c.rows) items.push(row(th, isQuietRoom(th, f.premium, f.settled)));
  if (c.folded.length) items.push({ type: "fold", id: "fold", fold: foldFor(c.folded, fmt) });
  if (c.emptyLine === "allAnswered") items.push({ type: "emptyLine", id: "empty-line", text: t("kindreds.allAnswered") });
  else if (c.emptyLine === "hintKindreds") items.push({ type: "hintKindreds", id: "hint-kindreds", text: t("kd.noKindredsYet") });
  else if (c.emptyLine === "hintPenpals") items.push({ type: "hintPenpals", id: "hint-penpals", text: t("kd.penPalsEmpty"), link: t("kd.toDesk") });
  if (c.quiet.length) {
    items.push({ type: "groupHeader", id: "group-expired", text: fmt.sentence(t("kd.groupExpired", { n: c.quiet.length })) });
    for (const th of c.quiet) items.push(row(th, true));
  }
  for (const th of c.shut) items.push(row(th, false));

  // nothing read yet (loading, failed): no status at all rather than ALL ANSWERED, and no counts
  // rather than "Pen pals 0" (TabHeader and Swift's title row draw nothing for "")
  const known = answered(f.loadState);
  const status = !known ? "" : c.waiting === 1 ? t("kindreds.toAnswerOne") : c.waiting ? t("kindreds.toAnswer", { n: c.waiting }) : t("kindreds.allAnswered");
  const chips: ChipVM[] = LIST_TABS.map((k) => {
    const label = fmt.sentence(t(TAB_LABEL[k]));
    const count = k === "all" || !known ? "" : String(c.counts[k]);
    return {
      key: k,
      label,
      count,
      glyph: k === "kindreds" ? "kindred" : k === "penpals" ? "penPal" : "none",
      selected: f.tab === k,
      dot: c.dots[k],
      a11yLabel: [label, count].filter(Boolean).join(", "),
    };
  });

  return {
    title: t("kindreds.title"),
    status,
    statusActive: known && c.waiting > 0,
    statusA11y: status,
    legendCloser: t("kd.legendCloser"),
    // state.yourTurn is in all nine languages already ("TE TOCA", "あなたの番"), said as a sentence
    legendTurn: fmt.sentence(t("state.yourTurn")),
    orbitChipLabel: t("kd.orbit"),
    identity: book.identity,
    legendFrost: book.frost(LEGEND_FROST_SEED),
    chips,
    orbit: orbitItems(c.live, f.ledger, book),
    items,
    waiting: c.waiting,
    named: c.named,
    empty: c.empty,
  };
}

/** The faces a view needs, keyed by row id (for useFaceSources). */
export function faceInputs(view: Pick<KindredsView, "items">): Record<string, FaceInput> {
  const out: Record<string, FaceInput> = {};
  for (const it of view.items) {
    if (it.type === "row" && it.row.face) out[it.id] = it.row.face;
  }
  return out;
}

/** A thread by id, among those the view was built from. */
export const threadById = (threads: readonly ThreadSummary[], id: string): ThreadSummary | undefined => threads.find((t) => t.id === id);
