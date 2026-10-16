import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { useEntitlement } from "./entitlement";
import { useWrenStage } from "./wren-stage";
import { FREE_PER_DAY, lettersLeftToday } from "./api";
import { isFreeWriter } from "../screens/compose/compose-model";
import { publishStage, type PublishStage } from "./publish-stage";

/* THE PUBLISH ENTRY'S TWO READS, for React (the rule itself is publish-stage.ts).
   ────────────────────────────────────────────────────────────────────────
   usePublishStage: which way the + opens — the sheet for a new reader, the
   two pop buttons for a returning one. The tab bar (NativeTabBar) opens
   with it, and Today reads the same answer, with usePlusSheetOpen, to step
   its band, its window and its card out of the way (useTodayDesk).

   useLettersLeft: the "{N} LEFT" on the sheet's letter row — the real free
   plan's open letters left today, read from the server's own count
   (lettersLeftToday: letters_daily against FREE_PER_DAY, the cap the
   compose page shows and bump-letters enforces). Asked each time the sheet
   opens, so a letter sent since the last look is counted. null — the row
   then shows no number — for First Class, a guest, a reader whose plan
   hasn't answered yet, and whenever the count can't be read: never a
   guess. */

/** Which way the tab bar's + opens for the reader on this phone. */
export function usePublishStage(): PublishStage {
  const { user } = useAuth();
  const { stage } = useWrenStage();
  return publishStage({ createdAt: user?.created_at, now: Date.now(), wrenStage: stage });
}

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

  // kept while the sheet closes, so the number doesn't vanish mid-slide
  return free ? left : null;
}
