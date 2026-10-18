import { scoped as AsyncStorage } from "./scoped-store";

/* Tiny local flag store for one-shot achievements (e.g. sent a voice letter). */

const KEY = "kindredly_flags";
/* the first arrival: onboarding sets these, Today reads them once */
export const TODAY_RITUAL = "today_ritual";
export const ARRIVAL_FRESH = "arrival_fresh";
/** the opener cleared the floor and went to the pool (unset: it stayed on the phone) */
export const ARRIVAL_SENT = "arrival_sent";
export const ARRIVAL_AT_KEY = "kindredly_arrival_at";

export async function getFlags(): Promise<Record<string, boolean>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const o = raw ? JSON.parse(raw) : {};
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

export async function setFlag(name: string): Promise<void> {
  try {
    const flags = await getFlags();
    if (flags[name]) return;
    flags[name] = true;
    await AsyncStorage.setItem(KEY, JSON.stringify(flags));
  } catch {
    /* best-effort */
  }
}

export async function unsetFlag(name: string): Promise<void> {
  try {
    const flags = await getFlags();
    if (!flags[name]) return;
    delete flags[name];
    await AsyncStorage.setItem(KEY, JSON.stringify(flags));
  } catch {
    /* best-effort */
  }
}

/* THE DAY'S DESK IS DONE (Today 3d). One flag per desk day (lib/day), set
   when the last letter left the desk and her DayClosed Live Activity went
   up, so a relaunch into a finished desk never starts it again. Only the
   newest day matters, so sealing a day drops the older ones (a key a day
   used to pile up here for good).

   The flag is a note about the desk, not the desk itself: the put-away day
   record (screens/today) says whether the desk is done. A flag can outlive
   its desk — the old blind's pull over a legacy record that fills again, a
   day started over on the phone — and Today then lifts it (sealVerdict in
   today-cards), so the day can close once more. */
const SEALED = "sealed:";
export const sealedFlag = (day: string): string => SEALED + day;

/** whether this desk day is already sealed */
export async function isSealed(day: string): Promise<boolean> {
  return !!(await getFlags())[sealedFlag(day)];
}

/** lift this desk day's seal: its desk is reading again, so the flag was stale */
export const unsealDay = (day: string): Promise<void> => unsetFlag(sealedFlag(day));

/** seal this desk day, and forget the days before it */
export async function sealDay(day: string): Promise<void> {
  try {
    const flags = await getFlags();
    const key = sealedFlag(day);
    let changed = !flags[key];
    for (const k of Object.keys(flags)) {
      if (k.startsWith(SEALED) && k !== key) {
        delete flags[k];
        changed = true;
      }
    }
    if (!changed) return;
    flags[key] = true;
    await AsyncStorage.setItem(KEY, JSON.stringify(flags));
  } catch (e) {
    console.warn("[flags] seal day:", e);
  }
}
