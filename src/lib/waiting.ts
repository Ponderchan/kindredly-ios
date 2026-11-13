import { useEffect, useState } from "react";
import { fetchThreads, type ThreadSummary } from "./db";
import { scoped as AsyncStorage } from "./scoped-store";
import { track } from "./track";
import { armRatingAsk } from "./rating-ask";
import { readRoomSeen } from "./room-seen";
import { fetchWrenPosts, readPostsCache, wrenUnread } from "./wren-desk";
import { countOnYou } from "../screens/kindreds/kindreds-model";
import { syncAppBadge } from "./app-badge";

/* How many correspondences are waiting on YOU — someone answered your letter
   and you have not written back.
   ────────────────────────────────────────────────────────────────────────
   The tab bar lives in (tabs)/_layout, outside the Kindreds screen, so it
   cannot see that screen's data. Rather than run a second query on every
   render, the Kindreds tab pushes the number it already computed, and the
   layout primes it once at launch — the signal has to be right BEFORE you
   ever open the tab, since being told is the entire point.

   Deliberately not a context: the tab bar is mounted once and the value
   changes rarely, so a set of subscribers is smaller and cheaper than a
   provider wrapping the whole app. */

/* two numbers, one signal: correspondences on you, and posts on Wren's
   desk you have not opened (owner, 2026-09-20: a new post is worth the
   same knock on the tab as a letter). Each screen sets its own; the tab
   shows the sum, as a number. */
let turn = 0;
let desk = 0;
let count = 0;
const subs = new Set<(n: number) => void>();

const publish = () => {
  const n = turn + desk;
  if (n === count) return;
  count = n;
  for (const f of subs) f(n);
};

/* WHAT COUNTS AS ON YOU (owner, 2026-09-23). The two groups keep two
   different promises. A stranger whose turn it is stays counted until you
   write back — the letter is the only way forward, and the row only leaves
   STRANGERS when you've sent one. A kindred's letters stop counting the
   moment you have read them, answered or not: you already know each other,
   and a friend's note read and left for later is not a debt. So the tab's
   number, the title's "letters to answer" and the kindred's own badge all
   clear together when a kindred's room is opened. A closed account owes
   nothing: there is nobody at the other end.

   10a step 5: the rule itself lives in the Kindreds model
   (screens/kindreds/kindreds-model countOnYou, node-tested), which the
   tab's title, its chips' dots and both of its renderers read, so the
   badge on the tab and the sentence on the page can't disagree. */
export function onYou(threads: ThreadSummary[], ledger: Record<string, number>): number {
  return countOnYou(threads, ledger);
}

/* DEV: while the Kindreds tab shows its demo rows (an account with no letters, data/demo), the
   tab's number is theirs, as the title's is; the launch's and every realtime poke's count of the
   real (empty) list used to take it back, so on a simulator the badge flipped between the two
   (6, then 9+ with Wren's desk added, then 6 again). The list's own count says which it is. */
let demoHeld = false;

/** The correspondences on you. The Kindreds list passes `from` (whether its rows are the dev demo's);
    the launch's and realtime's refresh pass nothing, and wait while the demo rows are on the page. */
export function setWaiting(n: number, from?: { demo: boolean }) {
  if (from) demoHeld = __DEV__ && from.demo;
  else if (demoHeld) return;
  turn = n;
  publish();
}

export function setDeskWaiting(n: number) {
  desk = n;
  publish();
}

export function useWaiting(): number {
  const [n, setN] = useState(count);
  useEffect(() => {
    subs.add(setN);
    setN(count);
    return () => {
      subs.delete(setN);
    };
  }, []);
  return n;
}

/** one query at launch — and on every realtime poke — so the signal is
    true before Kindreds is ever opened. Same rule as the tab itself
    (onYou), not a second, narrower vocabulary. */
export async function refreshWaiting(): Promise<void> {
  void refreshDeskWaiting();
  const t = await fetchThreads();
  if (!t) return;
  setWaiting(onYou(t, await readRoomSeen()));
  void syncAppBadge(t);
  void countNewReplies(t);
}

/** her desk: posts not yet opened, from the cache first and the network after */
export async function refreshDeskWaiting(): Promise<void> {
  const ledger = await readRoomSeen();
  const cached = await readPostsCache();
  if (cached.length) setDeskWaiting(wrenUnread(ledger, cached.length));
  const live = await fetchWrenPosts();
  if (live) setDeskWaiting(wrenUnread(await readRoomSeen(), live.length));
}

/* REPLY_RECEIVED, COUNTED ONCE PER CORRESPONDENCE. This is the event the
   whole product lives or dies on — someone wrote back — and it has no
   screen of its own, so it is counted here, where the app first learns of
   it. A local ledger of thread ids keeps a refresh from counting the same
   reply on every poll. */
const SEEN_REPLIES = "kindredly_seen_replies";
async function countNewReplies(threads: Awaited<ReturnType<typeof fetchThreads>>): Promise<void> {
  if (!threads) return;
  try {
    /* a queued read-decide-write (scoped.update): two refreshes at once (launch and a realtime
       poke) used to both find the same reply new and count it twice */
    const fresh = await AsyncStorage.update(SEEN_REPLIES, (raw) => {
      let seen: string[] = [];
      try {
        seen = raw ? (JSON.parse(raw) as string[]) : [];
      } catch {
        seen = [];
      }
      const have = new Set(seen);
      const found = threads.filter((t) => t.theirs > 0 && !have.has(t.id));
      if (!found.length) return { result: found };
      return { next: JSON.stringify([...have, ...found.map((t) => t.id)].slice(-300)), result: found };
    });
    if (!fresh.length) return;
    for (const t of fresh) track("reply_received", { theirs: t.theirs });
    armRatingAsk("reply"); // someone wrote back: a good moment to ask for a rating (lib/rating-ask)
  } catch {
    /* a miscount is better than a crash on a background refresh */
  }
}
