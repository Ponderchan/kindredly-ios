import { scoped as AsyncStorage } from "./scoped-store";

/* the stamps a hand reaches for — the last eight picked, newest first, on
   this phone; the tray's RECENTLY USED row */
const KEY = "kindredly_recent_stamps";
const KEEP = 8;

export async function readRecentStamps(): Promise<string[]> {
  try {
    const l = JSON.parse((await AsyncStorage.getItem(KEY)) || "[]");
    return Array.isArray(l) ? l.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function noteStampUsed(id: string): Promise<string[]> {
  const next = [id, ...(await readRecentStamps()).filter((x) => x !== id)].slice(0, KEEP);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* the row is a convenience */
  }
  return next;
}
