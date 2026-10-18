import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { useEntitlement } from "./entitlement";
import { FREE_PER_DAY, lettersLeftToday } from "./api";
import { isFreeWriter } from "../screens/compose/compose-model";

/* THE PUBLISH ENTRY'S COUNT, for React. Which way the + opens no longer
   depends on the reader (owner, 2026-10-18): Today opens the two round
   buttons, every other tab the sheet (NativeTabBar). What stays here:

   useLettersLeft: the "{N} LEFT" under LETTER and on the sheet's letter row
   — the real free plan's open letters left today, read from the server's
   own count (lettersLeftToday: letters_daily against FREE_PER_DAY, the cap
   the compose page shows and bump-letters enforces). Asked each time the +
   opens, so a letter sent since the last look is counted. null — no number
   is shown — for First Class, a guest, a reader whose plan hasn't answered
   yet, and whenever the count can't be read: never a guess. */

/** The free plan's open letters left today, read each time `open` turns true; null when there is
    no count to show (First Class, a guest, the plan not known yet, or the read failed). */
export function useLettersLeft(open: boolean): number | null {
  const { user, isGuest } = useAuth();
  const { premium, settled } = useEntitlement();
  const free = isFreeWriter({ signedIn: !!user, isGuest, premium, premiumSettled: settled });
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !free) return;
    let alive = true;
    // a fresh count for every opening: the last one may be a letter out of date
    setLeft(null);
    void lettersLeftToday(FREE_PER_DAY).then((r) => {
      if (alive) setLeft(r ? r.left : null);
    });
    return () => {
      alive = false;
    };
  }, [open, free]);

  // kept while the + closes, so the number doesn't vanish mid-slide
  return free ? left : null;
}
