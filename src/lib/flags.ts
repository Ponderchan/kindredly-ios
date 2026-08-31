import { scoped as AsyncStorage } from "./scoped-store";

/* Tiny local flag store for one-shot achievements (e.g. sent a voice letter). */

const KEY = "kindredly_flags";

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
