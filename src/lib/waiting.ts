import { useEffect, useState } from "react";
import { fetchThreads } from "./db";
import { threadState } from "./thread-state";

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
  if (t) setWaiting(t.filter((x) => threadState(x)?.needsYou).length);
}
