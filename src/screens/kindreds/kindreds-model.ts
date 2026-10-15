import type { ThreadSummary } from "../../lib/db";
import type { FaceInput } from "../../lib/faces";
import type { KMenuAction } from "../../../modules/kindredly-ui/src/types";
import { THREAD_STATE, threadStateKind, type ThreadStateKind } from "../../lib/thread-state";
import { unreadOf } from "../../lib/room-seen";
import { closingSoon, daysLeft, isExpired, quietDays } from "../../lib/kindred-expiry";
import { EACH_WAY, developFor, hashStr, mosaicMask } from "../../lib/mosaic";

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

   LOAD STATES. loading (nothing yet) · ready (a list, kept or fresh) ·
   none (a real answer with nothing in it: no session, a guest — the empty
   state) · failed (no answer and nothing kept — an offline line under
   Wren, never "Nobody knows your name yet"). */

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
  /** a label as a chip says it: "Pen pals", "Seelenverwandte" (sentence case in the locale) */
  sentence: (s: string) => string;
  /** upper case in the locale */
  upper: (s: string) => string;
};

export type TagTone = "ind" | "mute" | "post" | "brass";
export type RowTag = { text: string; tone: TagTone };
export type MenuKey = "rekindle" | "read" | "unread" | "page" | "report" | "block";

export type RowVM = {
  id: string;
  kind: "kindred" | "penpal" | "wren";
  /** null for Wren (her picture is the official bird) */
  face: FaceInput | null;
  faceBadge: boolean;
  name: string;
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

export type FoldFaceVM = { id: string; seed: string; develop: number; mask: number; a11yLabel: string };
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
  mask: number;
  /** THEIR letters, 0..5 (0 waits outside the rings) */
  ring: number;
  /** letters each way, 0..5 (the folded React Native line's place) */
  each: number;
  a0: number;
  dir: 1 | -1;
  /** seconds per circuit */
  period: number;
  /** it is your turn: inked in ind */
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
    imports React Native, which a node test can't load). */
export function faceInputOf(th: ThreadSummary): FaceInput {
  return th.revealed
    ? { role: "kindred", seed: th.other, avatarId: th.otherFace ?? null, gone: !!th.gone }
    : { role: "penpal", seed: th.other, develop: developFor(th.theirs, false), gone: !!th.gone };
}

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
  // filter or on PEN PALS whenever the list is; on ALL and KINDREDS not over quiet or closed rows
  let emptyLine: Classified["emptyLine"] = null;
  if (main.length === 0 && (f.show || f.tab === "penpals" || (quiet.length === 0 && shut.length === 0))) {
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
export function orbitItems(live: readonly ThreadSummary[], ledger: Readonly<Record<string, number>>): OrbitVM[] {
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

/** One row (a kindred, a pen pal, a quiet room, a closed account). */
export function rowFor(
  th: ThreadSummary,
  ctx: { quiet: boolean; closing: boolean; unread: number; yourFilter: boolean; demoMenus?: boolean },
  fmt: KindredsFormat,
): RowVM {
  const { t } = fmt;
  const kind = stateKind(th);
  const st = THREAD_STATE[kind];
  const kindred = th.revealed;
  const gone = !!th.gone;
  const quiet = ctx.quiet;
  const name = kindred ? th.otherName || t("kd.aKindred") : fmt.penPal(gone ? null : th.other);
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
    name,
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
    face: faceInputOf(th),
    faceBadge: false,
    name,
    nameDim: gone,
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
  const label = `${fmt.sentence(fmt.t("state.waitingThem"))} · ${folded.length}`;
  const shown = folded.slice(0, FOLD_FACES);
  return {
    faces: shown.map((th) => {
      const develop = developFor(th.theirs, false);
      return { id: th.id, seed: th.other, develop, mask: mosaicMask(th.other, develop), a11yLabel: fmt.penPal(th.other) };
    }),
    more: folded.length > shown.length ? `+${folded.length - shown.length}` : "",
    label,
    a11yLabel: `${label}, ${fmt.sentence(fmt.t("kd.tab.penPals"))}`,
  };
}

/** The whole screen, as both renderers draw it. */
export function buildKindredsView(f: KindredsFacts, fmt: KindredsFormat): KindredsView {
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

  const status = c.waiting === 1 ? t("kindreds.toAnswerOne") : c.waiting ? t("kindreds.toAnswer", { n: c.waiting }) : t("kindreds.allAnswered");
  const chips: ChipVM[] = LIST_TABS.map((k) => {
    const label = fmt.sentence(t(TAB_LABEL[k]));
    const count = k === "all" ? "" : String(c.counts[k]);
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
    statusActive: c.waiting > 0,
    statusA11y: status,
    legendCloser: t("kd.legendCloser"),
    legendTurn: t("kd.legendTurn10"),
    orbitChipLabel: t("kd.orbit"),
    chips,
    orbit: orbitItems(c.live, f.ledger),
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
