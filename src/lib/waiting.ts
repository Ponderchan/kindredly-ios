import { useEffect, useState } from "react";
import { fetchThreads } from "./db";
import { threadState } from "./thread-state";
import { scoped as AsyncStorage } from "./scoped-store";
import { track } from "./track";

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

let count = 0;
const subs = new Set<(n: number) => void>();

export function setWaiting(n: number) {
  if (n === count) return;
  count = n;
  for (const f of subs) f(n);
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
    (threadState.needsYou), not a second, narrower vocabulary. */
export async function refreshWaiting(): Promise<void> {
  const t = await fetchThreads();
  if (!t) return;
  setWaiting(t.filter((x) => threadState(x)?.needsYou).length);
  void countNewReplies(t);
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
    const seen: string[] = JSON.parse((await AsyncStorage.getItem(SEEN_REPLIES)) || "[]");
    const have = new Set(seen);
    const fresh = threads.filter((t) => t.theirs > 0 && !have.has(t.id));
    if (!fresh.length) return;
    for (const t of fresh) track("reply_received", { theirs: t.theirs });
    await AsyncStorage.setItem(SEEN_REPLIES, JSON.stringify([...have, ...fresh.map((t) => t.id)].slice(-300)));
  } catch {
    /* a miscount is better than a crash on a background refresh */
  }
}
