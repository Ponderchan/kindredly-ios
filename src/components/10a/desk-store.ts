/* WREN'S DESK: ONE ANSWER FOR EVERY SCREEN, WITHOUT REACT (WrenDesk's store).
   ────────────────────────────────────────────────────────────────────────
   Her row on Kindreds, the strip on Today and the tab's number ask the same
   two questions — what has she posted, and how much of it is unopened —
   and now share one answer. This is that answer's rules, kept free of
   React and of the network so they can be checked under plain node
   (stores.test.ts); WrenDesk.tsx wires the real sources in.

   - A refresh reads the phone's copy and the network side by side. The
     copy is used only while the network hasn't answered; the network's
     posts win whenever they come.
   - Each answer needs the room-seen ledger read before it can say what is
     unread, and those reads can finish out of order. The answer started
     last wins: a slow copy can't land on top of the network's newer posts.
   - No network answer (offline, no table yet) keeps what the copy gave.
     `fallback` (dev only: demo posts) is used only when the copy was empty
     too.
   - Every answer goes to `publish` (the tab's number: setDeskWaiting). */

export type DeskSnapshot<P> = {
  readonly posts: readonly P[];
  readonly unread: number;
  /** true once the phone's copy or the network has answered */
  readonly loaded: boolean;
};

export type DeskSources<P> = {
  /** the phone's copy (never throws; [] when there is none) */
  cache: () => Promise<P[]>;
  /** the network; null when it couldn't ask */
  fetch: () => Promise<P[] | null>;
  /** what to show when neither has anything (dev's demo posts), or nothing */
  fallback?: () => P[] | null;
};

export type DeskStore<P> = {
  subscribe: (listener: () => void) => () => void;
  read: () => DeskSnapshot<P>;
  /** take these posts as the answer (after reading the ledger) */
  settle: (posts: P[]) => Promise<void>;
  /** read the copy and the network again; resolves when both have been heard */
  refresh: (sources: DeskSources<P>) => Promise<void>;
};

export function createDeskStore<P>(io: {
  /** the room-seen ledger (lib/room-seen readRoomSeen) */
  readLedger: () => Promise<Record<string, number>>;
  /** how many of `count` posts are unopened by that ledger (lib/wren-desk wrenUnread) */
  unread: (ledger: Record<string, number>, count: number) => number;
  /** every answer's unread count (lib/waiting setDeskWaiting) */
  publish: (unread: number) => void;
  warn?: (message: string, error: unknown) => void;
}): DeskStore<P> {
  let snap: DeskSnapshot<P> = { posts: [], unread: 0, loaded: false };
  const listeners = new Set<() => void>();
  let seq = 0;
  const warn = (what: string) => (e: unknown) => io.warn?.(what, e);

  const settle = async (posts: P[]): Promise<void> => {
    const mine = ++seq;
    const ledger = await io.readLedger();
    if (mine !== seq) return; // a later answer is on its way
    const unread = io.unread(ledger, posts.length);
    snap = { posts, unread, loaded: true };
    listeners.forEach((l) => l());
    io.publish(unread);
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    read: () => snap,
    settle,
    async refresh({ cache, fetch, fallback }) {
      let live = false;
      const cached = cache().catch((e) => {
        warn("the phone's copy wasn't read")(e);
        return [] as P[];
      });
      const fromCache = cached.then((c) => {
        if (!live && c.length) return settle(c);
      });
      const fromNetwork = fetch()
        .catch((e) => {
          warn("the desk wasn't fetched")(e);
          return null;
        })
        .then(async (p) => {
          if (p) {
            live = true;
            return settle(p);
          }
          const extra = (await cached).length ? null : fallback?.() ?? null;
          if (extra) return settle(extra);
        });
      await Promise.all([fromCache.catch(warn("the copy didn't settle")), fromNetwork.catch(warn("the desk didn't settle"))]);
    },
  };
}
