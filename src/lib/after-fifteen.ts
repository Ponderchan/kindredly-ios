import { onStorageUserChange, scopedTo, storageOwner } from "./scoped-store";
import { emptyAfter, readAfter, type AfterState } from "./after-fifteen-core";
import { useNativeSurface } from "./surfaces";
import { isKindredlyUIViewAvailable } from "../../modules/kindredly-ui/src/available";

/* TODAY, AFTER FIFTEEN — what the phone keeps (rules: lib/after-fifteen-core; the plan:
   docs/today-after-fifteen.md). One record per account in the scoped store, on this phone only,
   never uploaded: the finished days, the last days' counts, the reading timer's sums and the
   notes on today's letters, today's page and what the reader did with it, the last evenings
   bedtime was offered, whose turn it is and the next fact's number.

   Every change goes through mutateAfter, one at a time (the timer writes while a tap marks a
   step), each read fresh from the store and pinned to the account that asked. A read that fails
   is logged and changes nothing: a record is never written over on a guess. */

const KEY = "kindredly_after15";

/** the Swift view the pages are (modules/kindredly-ui/src/AfterFifteen.tsx) */
export const AFTER_VIEW = "KAfterFifteenView";

/** Today's end-of-day pages are on: the switch says so (off by default; never on a surface that
    struck out on this binary) and this binary has the view. The reading timer runs and a finished
    day counts for the one streak only while this is true, so off is the app exactly as it was. */
export function useAfterFifteenOn(): boolean {
  return useNativeSurface("afterfifteen") && isKindredlyUIViewAvailable(AFTER_VIEW);
}

/* DEV ONLY: the dev demo desk (the sample letters a dev build shows an account with nothing
   dealt) hands over to these pages too, so the swap from the desk — the last card leaving, the
   page arriving, Undo, a relaunch — can be tried on a simulator whose account gets no real
   letters. ON in every dev build (owner, 2026-11-12, reading the sample letters to the end on
   his simulator and meeting the old end of the day: "你的新包为啥读完信后 还是老的交互 我们做的
   新的呢"); it used to wait for kindredly:///dev/after-fifteen?desk=1, which still opens Today.
   What it keeps is the phone's real record (dev page: WIPE). Never true in a release. */
let devOnDemoDesk = __DEV__;
export function setDevAfterOnDemoDesk(on: boolean): void {
  if (__DEV__) devOnDemoDesk = on;
}
export const devAfterOnDemoDesk = (): boolean => __DEV__ && devOnDemoDesk;

let chain: Promise<unknown> = Promise.resolve();
const listeners = new Set<(s: AfterState | null) => void>();

// another account: whoever is listening reads again
onStorageUserChange(() => listeners.forEach((l) => l(null)));

/** The record as the store holds it now (empty when there is none, or it couldn't be read: said in the console). */
export async function loadAfter(): Promise<AfterState> {
  try {
    const owner = await storageOwner();
    return readAfter(await scopedTo(owner).getItem(KEY));
  } catch (e) {
    console.warn("[after-fifteen] the record couldn't be read", e);
    return emptyAfter();
  }
}

/** One change to the record: read, change, written back only if it changed. Resolves to the record after it (null when the store failed). */
export function mutateAfter(change: (s: AfterState) => AfterState): Promise<AfterState | null> {
  const run = async (): Promise<AfterState | null> => {
    try {
      const store = scopedTo(await storageOwner());
      const was = readAfter(await store.getItem(KEY));
      const next = change(was);
      if (next !== was) {
        await store.setItem(KEY, JSON.stringify(next));
        listeners.forEach((l) => l(next));
      }
      return next;
    } catch (e) {
      console.warn("[after-fifteen] a change wasn't kept", e);
      return null;
    }
  };
  const p = chain.then(run, run);
  chain = p;
  return p;
}

/** Hear every change (the record after it; null = the account changed, read again). */
export function subscribeAfter(listener: (s: AfterState | null) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The desk days finished on this phone, for the one streak (lib/fc-rollout-core activeDays). */
export async function finishedDays(): Promise<string[]> {
  return (await loadAfter()).finished;
}

/** dev only: forget everything (the dev page's RESET) */
export async function resetAfter(): Promise<void> {
  if (!__DEV__) return;
  await mutateAfter(() => emptyAfter());
}
