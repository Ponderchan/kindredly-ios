import { scoped as AsyncStorage } from "./scoped-store";
import { parseOr } from "./scoped-update-core";
import { birthdayFlag, isBirthdayFlag } from "./birthday-core";

/* Tiny local flag store for one-shot achievements (e.g. sent a voice letter).
   Every change is a queued read-decide-write on the account's key (scoped.update, lib/
   scoped-update-core): two flags set in the same moment used to read the same {} and the later
   write dropped the earlier flag (owner, 2026-11-13: "Meet Mist." again after a sign-in). */

type Flags = Record<string, boolean>;
const flagsOf = (raw: string | null): Flags => {
  const o = parseOr<unknown>(raw, {});
  return o && typeof o === "object" && !Array.isArray(o) ? { ...(o as Flags) } : {};
};

const KEY = "kindredly_flags";
/* the first arrival: onboarding sets these, Today reads them once */
export const TODAY_RITUAL = "today_ritual";
export const ARRIVAL_FRESH = "arrival_fresh";
/** the opener cleared the floor and went to the pool (unset: it stayed on the phone) */
export const ARRIVAL_SENT = "arrival_sent";
export const ARRIVAL_AT_KEY = "kindredly_arrival_at";
/** the new onboarding's first arrival: Today shows the bird's "Otis wants a look →" slip
    (the wardrobe and First Class moved out of the run, storyboard §6 → Today). Set by the
    run as it ends; Today clears it once the slip is opened or dismissed. */
export const WARDROBE_SLIP = "wardrobe_slip";

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
    await AsyncStorage.update(KEY, (raw) => {
      const flags = flagsOf(raw);
      if (flags[name]) return { result: undefined };
      flags[name] = true;
      return { next: JSON.stringify(flags), result: undefined };
    });
  } catch (e) {
    console.warn(`[flags] ${name} wasn't set:`, e);
  }
}

/** Set a flag and say whether this call is the one that set it (false: it was already set, or the
    store couldn't be written). For a moment that must show once: two screens asking together get
    one true between them. */
export async function claimFlag(name: string): Promise<boolean> {
  try {
    return await AsyncStorage.update(KEY, (raw) => {
      const flags = flagsOf(raw);
      if (flags[name]) return { result: false };
      flags[name] = true;
      return { next: JSON.stringify(flags), result: true };
    });
  } catch (e) {
    console.warn(`[flags] ${name} wasn't claimed:`, e);
    return false;
  }
}

export async function unsetFlag(name: string): Promise<void> {
  try {
    await AsyncStorage.update(KEY, (raw) => {
      const flags = flagsOf(raw);
      if (!flags[name]) return { result: undefined };
      delete flags[name];
      return { next: JSON.stringify(flags), result: undefined };
    });
  } catch (e) {
    console.warn(`[flags] ${name} wasn't cleared:`, e);
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
    await AsyncStorage.update(KEY, (raw) => {
      const flags = flagsOf(raw);
      const key = sealedFlag(day);
      let changed = !flags[key];
      for (const k of Object.keys(flags)) {
        if (k.startsWith(SEALED) && k !== key) {
          delete flags[k];
          changed = true;
        }
      }
      if (!changed) return { result: undefined };
      flags[key] = true;
      return { next: JSON.stringify(flags), result: undefined };
    });
  } catch (e) {
    console.warn("[flags] seal day:", e);
  }
}

/* HER BIRTHDAY LETTER WAS READ (owner's audit, 2026-11-10). On the reader's
   birthday the first card on Today is a letter from their courier, once a
   year (lib/birthday-core has the rule). One flag per year, in this store
   because it is the account's own bucket (a guest's is the guest bucket,
   and moves into the account with the rest when they sign in): the letter
   is shown once per year per account on this phone. Only the newest year
   matters, so marking one read drops the older ones. Kept on the phone and
   nowhere else: nothing about the birthday goes to a server. */

/** whether this year's birthday letter was already read (passed) on this phone, for this account */
export async function birthdayLetterRead(year: number): Promise<boolean> {
  return !!(await getFlags())[birthdayFlag(year)];
}

/** this year's birthday letter was passed (`read`), or brought back by Undo (`read` false) */
export async function markBirthdayLetter(year: number, read: boolean): Promise<void> {
  try {
    await AsyncStorage.update(KEY, (raw) => {
      const flags = flagsOf(raw);
      const key = birthdayFlag(year);
      let changed = !!flags[key] !== read;
      for (const k of Object.keys(flags)) {
        if (isBirthdayFlag(k) && k !== key) {
          delete flags[k];
          changed = true;
        }
      }
      if (!changed) return { result: undefined };
      if (read) flags[key] = true;
      else delete flags[key];
      return { next: JSON.stringify(flags), result: undefined };
    });
  } catch (e) {
    console.warn("[flags] birthday letter:", e);
  }
}
