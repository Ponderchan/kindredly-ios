import AsyncStorage from "@react-native-async-storage/async-storage";
import { remoteSurfaces } from "./surfaces";

/* THE PHONE'S HALF OF "A LETTER COMES ONCE" (lib/db fetchPoolPage's note).
   The server counts a letter read after two seconds on screen (the writer's eye, 0020);
   a letter flicked past sooner is not read, but it was shown, and the owner's rule is that
   a shown letter doesn't come back either. So every letter put on screen is written here,
   with the day it was first shown; kept for KEEP_DAYS and at most MAX_IDS, oldest dropped.
   This phone only: another phone or the web knows only what the server kept. */

const KEY = "kindredly_seen_letters_v1";
const KEEP_DAYS = 60;
const MAX_IDS = 3000;
const DAY_MS = 86400000;

type Seen = Record<string, number>; // letter id → when it was first shown (ms)

let cache: Seen | null = null;
let writing: Promise<void> = Promise.resolve();

const prune = (s: Seen, now: number): Seen => {
  const keep = Object.entries(s)
    .filter(([, at]) => typeof at === "number" && now - at < KEEP_DAYS * DAY_MS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_IDS);
  return Object.fromEntries(keep);
};

async function load(): Promise<Seen> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    cache = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? prune(parsed as Seen, Date.now()) : {};
  } catch (e) {
    console.warn("[seen-letters] the list wasn't read", e);
    cache = {};
  }
  return cache;
}

/** every letter this phone has shown in the last KEEP_DAYS */
export async function seenLetterIds(): Promise<Set<string>> {
  return new Set(Object.keys(await load()));
}

/** a letter is on screen: remember it (first sighting kept) */
export function noteLetterShown(id: string): void {
  if (!id || id.startsWith("demo")) return;
  writing = writing
    .then(async () => {
      const s = await load();
      if (s[id]) return;
      const now = Date.now();
      cache = prune({ ...s, [id]: now }, now);
      await AsyncStorage.setItem(KEY, JSON.stringify(cache));
    })
    .catch((e) => console.warn("[seen-letters] the letter wasn't kept", e));
}

/* THE SWITCH. "A letter comes once" is on unless app_surfaces says otherwise: a row
   ('letteronce', the binary's version or '*', false) puts the deal back as it was — the newest
   forty, nothing skipped — with no build and no OTA. Read at each load; until the table has
   answered it is on. One letter per writer (lib/ration) is not behind it. */
export function letterOnceOn(): boolean {
  const r = remoteSurfaces();
  const v = r ? r.letteronce : undefined;
  return typeof v === "boolean" ? v : true;
}
