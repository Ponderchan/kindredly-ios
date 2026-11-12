import { useCallback, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { POOL_CACHE_KEY, type PoolLetter } from "../../lib/db";
import { deskDay } from "../../lib/day";
import { useTheme } from "../../lib/theme";
import { DEMO_POOL } from "../../data/demo";
import * as C from "../today/today-cards";
import { useTodayFormat } from "../today/useTodayFormat";
import { buildSlips, catchLetters, type CatchSlip } from "./catch-model";

/* CATCH A LINE, FED (screens/kindreds/catch-model has the rules). The lines drifting over the
   empty Kindreds tab are read from the day Today already saved on this phone (AsyncStorage
   POOL_CACHE_KEY, the DayRecord): nothing is asked of the server for this page, so the letters
   here are exactly the ones on the reader's own desk, and a day with no desk yet (Today hasn't
   dealt, or it is another day's record) simply has no slips: the page stays as it was.

   Read each time the tab comes on show, and each visit starts further along the desk, so the
   sky is not the same six lines twice. A dev build with nothing dealt gets the demo desk, as
   Today does there (its demo letters have the same ids, so Write back lands on them).

   The writers are named by Today's own format (useTodayFormat): the same courier name, frosted
   window and star sign as the card the reader meets after Write back. */

const NONE: PoolLetter[] = [];

export function useCatchDesk(): CatchSlip[] {
  const { t: tk } = useTheme();
  const [letters, setLetters] = useState<PoolLetter[]>(NONE);
  const visits = useRef(0);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      const turn = visits.current++;
      AsyncStorage.getItem(POOL_CACHE_KEY)
        .then((raw) => {
          if (!live) return;
          const saved = C.readDayRecord(raw, deskDay())?.rec ?? null;
          const dealt = !!saved && (saved.desk.length > 0 || saved.passed.length > 0 || saved.answered.length > 0);
          const rec = dealt ? saved : __DEV__ ? { ...C.emptyDay(deskDay()), desk: DEMO_POOL } : null;
          const next = rec ? catchLetters(rec, turn) : NONE;
          setLetters((cur) => (cur.length === next.length && cur.every((l, i) => l.id === next[i].id) ? cur : next));
        })
        .catch((e) => {
          console.log("[catch] could not read today's desk; the empty page stays as it was:", e);
          if (live) setLetters(NONE);
        });
      return () => {
        live = false;
      };
    }, []),
  );
  const { fmt } = useTodayFormat(letters);
  return useMemo(() => buildSlips(letters, { bg: tk.bg, sf: tk.sf, dark: !!tk.dark }, fmt), [letters, tk.bg, tk.sf, tk.dark, fmt]);
}
