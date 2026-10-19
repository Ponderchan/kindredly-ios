import { useEffect, useSyncExternalStore } from "react";
import { IAP_READY, iapGetPackages, iapTrialEligibility } from "./iap";
import { buildFares, type Fares } from "../screens/paywall/paywall-model";

export type { Fare, Fares, Trial } from "../screens/paywall/paywall-model";

/* THE FARES, ONCE PER LAUNCH (Me 4a, ME4A §4.2).
   ────────────────────────────────────────────────────────────────────────
   RevenueCat's offering, priced as the store prices it, with each
   subscription's free trial only when the store has one AND RevenueCat says
   this Apple ID may still take it (paywall-model buildFares). The Swift
   paywall and Me's First Class card ("7 DAYS FREE") both read it.

   One shared fetch: the first screen that asks starts it, everyone else
   subscribes. Until it answers the placeholders stand in (ready false). An
   answer with no packages (no RevenueCat key, no products yet, not
   configured yet, offline) leaves the placeholders up and is asked again
   the next time a screen mounts, at most once a minute — it is never kept
   as the launch's answer. The trial is never guessed: no eligibility
   answer, no trial. */

const PLACEHOLDERS: Fares = buildFares([], {}, false);
const RETRY_MS = 60_000;

let current: Fares = PLACEHOLDERS;
let settled = false; // a real offering is in: never asked again this launch
let inflight: Promise<void> | null = null;
let nextAskAt = 0;
const listeners = new Set<() => void>();
/* the store's answer while the dev page shows demo fares (setDevFares); null otherwise */
let real: Fares | null = null;

function publish(f: Fares) {
  current = f;
  listeners.forEach((l) => l());
}
/* a store answer: shown, unless the dev page has demo fares up (then kept for when it lets go) */
function land(f: Fares) {
  if (real) real = f;
  else publish(f);
}

function ask(): Promise<void> {
  if (settled || inflight || Date.now() < nextAskAt) return inflight ?? Promise.resolve();
  inflight = (async () => {
    try {
      const pkgs = await iapGetPackages();
      if (!pkgs.length) {
        nextAskAt = Date.now() + RETRY_MS;
        land(buildFares([], {}, true)); // the placeholders, as an answer
        return;
      }
      const ids = pkgs.filter((p) => p.period === "annual" || p.period === "monthly").map((p) => p.productId).filter((x): x is string => !!x);
      const eligibility = await iapTrialEligibility(ids);
      settled = true;
      land(buildFares(pkgs, eligibility, true));
    } catch (e) {
      nextAskAt = Date.now() + RETRY_MS;
      console.warn("[fares] could not read the fares, keeping the placeholders:", e);
      land(buildFares([], {}, true));
    }
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const read = () => current;

/** The fares (see the note above). Starts the one fetch on first use. */
export function useFares(): Fares {
  useEffect(() => {
    void ask();
  }, []);
  return useSyncExternalStore(subscribe, read, read);
}

/** Whether a purchase can happen in this build at all (a RevenueCat key on iOS). */
export const FARES_LIVE = IAP_READY;

/* DEV ONLY (src/app/dev/me4a-fc.tsx): show demo fares in place of the store's, or null to go back
   to the real ones. Never saved; ignored in a release build. */
export function setDevFares(f: Fares | null): void {
  if (!__DEV__) return;
  if (f) {
    if (!real) real = current;
    publish(f);
  } else if (real) {
    const r = real;
    real = null;
    publish(r);
  }
}
