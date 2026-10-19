import { scoped as AsyncStorage } from "./scoped-store";

/* the stamps a hand reaches for — the last eight picked, newest first, on
   this phone; the tray's RECENTLY USED row. Official stamps only (contract
   §3: RECENTLY USED never lists a photo stamp, "c:<uuid>", which lives in
   the custom tab): a photo stamp picked is not noted, and one an older build
   noted is left out when the list is read. */
const KEY = "kindredly_recent_stamps";
const KEEP = 8;
const official = (x: unknown): x is string => typeof x === "string" && !x.startsWith("c:");

export async function readRecentStamps(): Promise<string[]> {
  try {
    const l = JSON.parse((await AsyncStorage.getItem(KEY)) || "[]");
    return Array.isArray(l) ? l.filter(official) : [];
  } catch {
    return [];
  }
}

export async function noteStampUsed(id: string): Promise<string[]> {
  if (!official(id)) return readRecentStamps();
  const next = [id, ...(await readRecentStamps()).filter((x) => x !== id)].slice(0, KEEP);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* the row is a convenience */
  }
  return next;
}
