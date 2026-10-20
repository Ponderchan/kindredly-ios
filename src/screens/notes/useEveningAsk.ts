import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { getFlags, setFlag } from "../../lib/flags";
import { PREF_JOB_MS, askForNotifications, getNotifyOn, readPushPrefs, setPushPref, within } from "../../lib/local-push";
import { t } from "../../lib/i18n";
import { decideEvening, type EveningShow } from "./notes-model";

/* ONE QUESTION, ONCE, AFTER THE FIRST PAGE (owner decision 4, 2026-10-10),
   as a hook both Notes renderers share (10a step 5). The card used to keep
   this inside the component; now the decision, the three answers and every
   Alert live here, the React Native card (components/EveningAsk) and the
   Swift card (KNotesExtras) only draw `state` and call the answers.

   The decision is notes-model decideEvening, node-tested, in the old
   card's exact order: prefs unreadable → wait; daily_line already on → the
   flag is spent and the off row shows while this phone's Notifications
   switch is on; no real page → nothing; answered → nothing; the morning
   question on → the flag is spent; otherwise ask. The one change (owner's
   two-switch rule, critic): the already-on check runs with no pages too,
   because this row is the evening line's only off switch.

   The answers, unchanged:
   - YES asks iOS first. Refused: the flag is spent, no row (nothing is on),
     and the denied Alert. Allowed: daily_line goes on, the row appears,
     the flag is spent. A save that fails keeps the card (nothing was
     answered yet) and says so.
   - NO spends the flag; the card goes for good.
   - TURN OFF writes daily_line false; the row goes. A save that fails
     keeps the row (it is still on) and says so.
   Nothing about any page is read or sent. */

const FLAG = "ev_ask_answered";

export type EveningAsk = {
  /** what shows: nothing, the card, or the slim off row */
  state: EveningShow;
  /** an answer is being saved (the card dims and ignores taps) */
  busy: boolean;
  yes: () => void;
  no: () => void;
  turnOff: () => void;
};

/**
 * @param pages   real pages (dev samples don't count)
 * @param opts.enabled  false until the journal has loaded (a count of 0 before the read isn't
 *                  an empty journal); also false on the dev page, which sets the state itself
 * @param opts.wren the courier's name for the denied Alert
 */
export function useEveningAsk(pages: number, opts: { enabled: boolean; wren: string }): EveningAsk {
  const [state, setState] = useState<EveningShow>("none");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const wren = useRef(opts.wren);
  wren.current = opts.wren;
  const { enabled } = opts;

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void (async () => {
      try {
        const [flags, read] = await Promise.all([getFlags(), readPushPrefs()]);
        // the master switch only matters when the line is already on
        const notifyOn = read.prefs.daily_line ? await getNotifyOn() : true;
        const d = decideEvening({
          prefsUnreadable: read.source === "default" && !!read.error,
          dailyLine: !!read.prefs.daily_line,
          morningQuestion: !!read.prefs.morning_question,
          notifyOn,
          answered: !!flags[FLAG],
          pages,
        });
        if (d.spendFlag) void setFlag(FLAG);
        if (alive) setState(d.show);
      } catch (e) {
        // whether it is on can't be told: ask another day, show nothing
        console.warn("[evening-ask] couldn't decide:", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [pages, enabled]);

  const hold = (on: boolean) => {
    busyRef.current = on;
    setBusy(on);
  };

  /* NEVER GREY FOR GOOD (owner, 2026-10-20: "Yes, at 9" stayed dimmed and nothing happened).
     Every step below ends — the permission read, iOS's question, the queued account write each
     carry a deadline in lib/local-push, and the save is bounded here once more as a whole — and
     busy is released in a finally, whatever happened. A step that ran out of time is a failed
     save: the card stays and the alert says so. */
  const save = (key: "daily_line", value: boolean) =>
    within(setPushPref(key, value), PREF_JOB_MS + 5000, "evening question save");

  const turnOff = useCallback(async () => {
    if (busyRef.current) return;
    hold(true);
    try {
      await save("daily_line", false);
      setState("none");
    } catch (e) {
      console.warn("[evening-ask] turn off:", e);
      Alert.alert(t("set.cantSave"), t("set.push.saveFail")); // the row stays: it is still on
    } finally {
      hold(false);
    }
  }, []);

  const no = useCallback(() => {
    if (busyRef.current) return;
    setState("none");
    void setFlag(FLAG);
  }, []);

  const yes = useCallback(async () => {
    if (busyRef.current) return;
    hold(true);
    try {
      let allowed: boolean;
      try {
        allowed = await askForNotifications();
      } catch (e) {
        // iOS never answered (or the read failed): nothing was decided, so the card stays
        console.warn("[evening-ask] permission:", e);
        Alert.alert(t("set.cantSave"), t("set.push.saveFail"));
        return;
      }
      if (!allowed) {
        setState("none");
        void setFlag(FLAG); // they said yes; iOS said no — nothing is on, so no row either
        Alert.alert(t("set.knock.deniedTitle"), t("set.push.deniedBody", { wren: wren.current }));
        return;
      }
      try {
        await save("daily_line", true);
        // on: the card gives way to the slim off row (the line's only off switch)
        setState("on");
        void setFlag(FLAG);
      } catch (e) {
        console.warn("[evening-ask] save:", e);
        Alert.alert(t("set.cantSave"), t("set.push.saveFail")); // the card stays: nothing was answered yet
      }
    } finally {
      hold(false);
    }
  }, []);

  return {
    state,
    busy,
    yes: useCallback(() => void yes(), [yes]),
    no,
    turnOff: useCallback(() => void turnOff(), [turnOff]),
  };
}
