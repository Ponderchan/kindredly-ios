import type { PoolLetter } from "../../../lib/db";
import type { ObServices } from "../types";

/* THE THREE LETTERS THE FIRST FLIGHT BRINGS BACK, fetched on 10 and flown
   on 12 (storyboard §6 · 10 "The pool is prefetched here, as now, so the
   three letters it brings back are real").
   ────────────────────────────────────────────────────────────────────────
   Naming the chick takes long enough to fetch the pool, so 10 starts the
   fetch (services.prefetchPool: real letters and Today's first-desk cache,
   or the DEMO samples) and 12 takes what came back. The screens remount
   between them, so the one promise is kept here, keyed by DEMO so a demo's
   samples can never be flown in a real run (or the other way round) within
   one session of the app. 12 forgets it once taken. Never throws: a pool
   that couldn't be fetched flies with the chart's own stop labels. */

let kept: { demo: boolean; p: Promise<PoolLetter[]> } | null = null;

const fetchPool = (services: ObServices): Promise<PoolLetter[]> =>
  services.prefetchPool().catch((e) => {
    console.warn("[onboarding] the first flight's letters weren't fetched; it flies without them:", e);
    return [] as PoolLetter[];
  });

/** 10: start fetching (once per run). */
export function prefetchFlightPool(services: ObServices): void {
  if (!kept || kept.demo !== services.demo) kept = { demo: services.demo, p: fetchPool(services) };
}

/** 12: the letters 10 fetched (or fetch them now, if 10 was skipped by a resume or a jump), then forget them. */
export function takeFlightPool(services: ObServices): Promise<PoolLetter[]> {
  const p = kept && kept.demo === services.demo ? kept.p : fetchPool(services);
  kept = null;
  return p;
}
