import { isUuid } from "./identity-core";
import type { TFn } from "./format";

/* MUTE A CORRESPONDENCE — THE RULES (owner's audit, 2026-11-10). Pure, so plain node locks them
   (node src/lib/thread-mute-model.test.ts); lib/thread-mute is the React glue (the switch, the
   account, the store, the alert) and lib/db the two calls (loadMutedThreads, setThreadMuted).

   WHY. The ⋯ of a conversation and of a kindred's page offered only "Report this person" and
   "Block this person": for a friend whose pushes are simply too many, that is all hammer. Mute
   sits above them. A muted correspondence sends THIS reader no push notifications; nothing else
   changes (the letters still arrive, the unread counts still count) and the other person is
   never told.

   WHO IS OFFERED IT (muteOffered): the remote switch "threadmute" is on (lib/surfaces, off by
   default: the server must have thread_mutes and skip muted threads first), the reader has an
   account (a guest gets no pushes: no item), the thread is a real one (a demo thread's id is no
   uuid and has no row to write: no item), and someone is on the other side (the ⋯ itself is only
   drawn then). Off for any of these, the menu is exactly what it was.

   THE ITEM (muteRow): "Mute" with the system's bell.slash while it rings, "Unmute" with bell
   once muted: the glyph is what the tap does, as the system's own menus draw it.

   OPTIMISTIC (createMuteBook): a tap shows at once and is written behind it. `known` is what the
   server last confirmed; `wanted` is what the reader asked for and the server hasn't answered
   yet; what the screens show is known with wanted laid over it. A write that held moves its
   answer into known; one that failed is simply dropped, so the screen falls back to known (and
   lib/thread-mute tells the reader). A fresh read from the server replaces known and never
   undoes a tap still on its way. Two taps on one thread are written in order (the glue queues
   them), and only the latest wish for a thread is ever shown. */

/** the switch's key in app_surfaces (lib/surfaces NATIVE_DEFAULTS: off) */
export const MUTE_SURFACE = "threadmute";

export type MuteFacts = {
  /** the remote switch */
  on: boolean;
  /** no account: a guest gets no pushes to mute */
  guest: boolean;
  /** a dev / store demo thread */
  demo: boolean;
  threadId: string | null | undefined;
  /** someone is on the other side (the ⋯ is drawn) */
  someone: boolean;
};

/** Whether this reader is offered Mute / Unmute on this thread. */
export function muteOffered(f: MuteFacts): boolean {
  return f.on && !f.guest && !f.demo && f.someone && isUuid(f.threadId);
}

/** The menu item: what a tap does, and the system glyph for it. */
export type MuteRow = { label: string; icon: "bell.slash" | "bell" };
export function muteRow(muted: boolean, t: TFn): MuteRow {
  return muted ? { label: t("tm.unmute"), icon: "bell" } : { label: t("tm.mute"), icon: "bell.slash" };
}

/** `set` with `threadId` muted or not: a new set, or `set` itself when nothing changes. */
export function withMuted(set: ReadonlySet<string>, threadId: string, muted: boolean): ReadonlySet<string> {
  if (set.has(threadId) === muted) return set;
  const next = new Set(set);
  if (muted) next.add(threadId);
  else next.delete(threadId);
  return next;
}

const NONE: ReadonlySet<string> = new Set();

export type MuteBook = {
  /** what the screens show: the same object until something changes */
  shown: () => ReadonlySet<string>;
  /** the reader tapped: show `muted` for `threadId` at once. Returns the wish's ticket. */
  want: (threadId: string, muted: boolean) => number;
  /** the write of `muted` for ticket `n` came back. `ok`: the server holds it now. Either way the
      wish is let go, unless a later tap on the same thread replaced it. */
  settle: (threadId: string, n: number, muted: boolean, ok: boolean) => void;
  /** a fresh read from the server: replaces what was known, keeps taps still on their way */
  load: (fromServer: ReadonlySet<string>) => void;
  /** another account (or signed out): nothing known, nothing wanted */
  reset: () => void;
};

/** The optimistic store's arithmetic, without React or the network (see OPTIMISTIC above).
    `changed` is called whenever shown() would answer differently. */
export function createMuteBook(changed: () => void = () => {}): MuteBook {
  let known: ReadonlySet<string> = NONE;
  const wanted = new Map<string, { muted: boolean; n: number }>();
  let tickets = 0;
  let shown: ReadonlySet<string> = NONE;

  const redraw = () => {
    let next = known;
    for (const [id, w] of wanted) next = withMuted(next, id, w.muted);
    const same = next.size === shown.size && [...next].every((id) => shown.has(id));
    if (same) return;
    shown = next;
    changed();
  };

  return {
    shown: () => shown,
    want(threadId, muted) {
      const n = ++tickets;
      wanted.set(threadId, { muted, n });
      redraw();
      return n;
    },
    settle(threadId, n, muted, ok) {
      // the server holds this answer now, whatever was tapped since
      if (ok) known = withMuted(known, threadId, muted);
      if (wanted.get(threadId)?.n === n) wanted.delete(threadId);
      redraw();
    },
    load(fromServer) {
      known = fromServer;
      redraw();
    },
    reset() {
      known = NONE;
      wanted.clear();
      redraw();
    },
  };
}
