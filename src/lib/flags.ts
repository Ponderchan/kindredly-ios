import { scoped as AsyncStorage } from "./scoped-store";

/* Tiny local flag store for one-shot achievements (e.g. sent a voice letter). */

const KEY = "kindredly_flags";
/* the first arrival: onboarding sets these, Today reads them once */
export const TODAY_RITUAL = "today_ritual";
export const ARRIVAL_FRESH = "arrival_fresh";
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
