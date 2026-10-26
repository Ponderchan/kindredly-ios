import type { ThreadSummary } from "../../lib/db";
import type { FaceInput } from "../../lib/faces";

/* MY KINDREDS, AS DATA (owner, 2026-10-27: the page lists ONLY kindreds).
   ────────────────────────────────────────────────────────────────────────
   Pure: no React, no React Native, no i18n — every word and date comes in
   through `fmt`, so `node src/screens/my-kindreds/my-kindreds-model.test.ts`
   locks the rules. MyKindredsNative turns this into the Swift page
   (KMyKindredsView). The React Native page (app/my-kindreds), the switch's
   fallback, keeps its own numbered sheet with the pen pals.

   WHO IS LISTED. A kindred: names traded (revealed), the account still
   open (a closed one is gone from the book, as the old page did). Pen pals
   on their way are the Kindreds tab's, never here.

   THE ORDER. As they became kindreds, the oldest first: by the day both
   names were sealed (revealedAt, 0020), or for an older row with no such
   day, its last letter — the old page's order, so nobody moves.

   ONLY TRUE NUMBERS (owner rule). The KINDREDS · date chip only when the
   day names were traded is known (revealedAt): never the last letter's day
   standing in for it. The unread badge is their letters this phone hasn't
   had in front of it (the room-seen ledger, as the Kindreds tab counts it;
   a room never opened claims nothing). The time is the last letter's.

   THE STATES. loading: nothing read yet (the bar alone). ready: kindreds to
   show. empty: a real answer with none in it. failed: no answer and nothing
   kept (a failed read keeps what was shown, so it is never "empty"). */

export type MyKindredsFacts = {
  /** the list as read (kept or fresh); null = nothing read yet */
  threads: readonly ThreadSummary[] | null;
  /** the last read got no answer (only matters while nothing is kept) */
  failed: boolean;
  /** room-seen: their count you've had in front of you, per thread */
  ledger: Readonly<Record<string, number>>;
};

export type MyKindredsFormat = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** the chip's day, as the ceremony stamps it (dShort, in capitals) */
  chipDay: (ms: number) => string;
  /** the last letter's day or time (format listWhen) */
  when: (ms: number) => string;
};

export type MyKindredsState = "loading" | "ready" | "empty" | "failed";

export type MyKindredCardVM = {
  /** the thread's id: a tap opens its room */
  id: string;
  name: string;
  /** whose face, as lib/faces takes it (a kindred's: round, the face they gave) */
  face: FaceInput;
  /** their user id (the member stamp's question) */
  other: string;
  /** "KINDREDS · SEP 18"; "" when the day isn't known */
  since: string;
  /** "" when nothing has been written */
  when: string;
  /** "You: " when the last line is yours */
  youPrefix: string;
  preview: string;
  /** "3", "9+"; "" */
  badge: string;
  a11y: string;
};

export type MyKindredsView = {
  state: MyKindredsState;
  strings: { title: string; count: string; lede: string; empty: string; failed: string };
  cards: MyKindredCardVM[];
};

/** The kindreds, in the order they became kindreds (see the note at the top). */
export function kindredsOf(threads: readonly ThreadSummary[]): ThreadSummary[] {
  const since = (th: ThreadSummary) => th.revealedAt ?? th.lastAt;
  return threads.filter((th) => th.revealed && !th.gone).sort((a, b) => since(a) - since(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Their letters you haven't had in front of you (room-seen's rule: a room never opened owes nothing). */
export const unreadIn = (ledger: Readonly<Record<string, number>>, th: ThreadSummary): number =>
  th.id in ledger ? Math.max(0, th.theirs - (ledger[th.id] ?? 0)) : 0;

/** a badge's number: 1–9 as is, then "9+" (the Kindreds tab's) */
export const badgeText = (n: number): string => (n > 9 ? "9+" : String(Math.max(0, Math.floor(n))));

export function cardOf(th: ThreadSummary, ledger: Readonly<Record<string, number>>, fmt: MyKindredsFormat): MyKindredCardVM {
  const { t } = fmt;
  const name = th.otherName ?? "";
  const since = th.revealedAt ? t("in.sinceChip", { date: fmt.chipDay(th.revealedAt) }) : "";
  const when = th.lastAt ? fmt.when(th.lastAt) : "";
  const preview = th.preview || "";
  const youPrefix = preview && th.lastSenderMe ? `${t("mm.you")}: ` : "";
  const unread = unreadIn(ledger, th);
  const a11y = [name, since, unread > 0 ? t("kd.unreadA11y", { n: unread }) : "", when, preview ? youPrefix + preview : ""].filter(Boolean).join(", ");
  return {
    id: th.id,
    name,
    face: { role: "kindred", seed: th.other, avatarId: th.otherFace ?? null, gone: false },
    other: th.other,
    since,
    when,
    youPrefix,
    preview,
    badge: unread > 0 ? badgeText(unread) : "",
    a11y,
  };
}

export function buildMyKindredsView(f: MyKindredsFacts, fmt: MyKindredsFormat): MyKindredsView {
  const { t } = fmt;
  const list = f.threads ? kindredsOf(f.threads) : [];
  const state: MyKindredsState = f.threads == null ? (f.failed ? "failed" : "loading") : list.length ? "ready" : "empty";
  return {
    state,
    strings: {
      title: t("mk.title"),
      count: f.threads == null ? "" : String(list.length),
      lede: t("mk.lede"),
      empty: t("mk.empty"),
      failed: t("auth.err.offline"),
    },
    cards: list.map((th) => cardOf(th, f.ledger, fmt)),
  };
}
