import { onStorageUserChange, scoped as AsyncStorage } from "./scoped-store";
import type { WrenStage } from "../components/WrenBird";

/* WHAT ME KNEW LAST TIME (owner on build 42, 2026-11-12: "数字统计一会打开没有 一会儿又出来了",
   "有时候打开有信使的 journey 一会儿没有", a grown courier drawn as an egg for a moment).
   Me paints before it reads, and what it reads comes from the network: until that landed the
   page drew what it starts with — an egg, no day, a dash for the numbers — and then changed
   under the reader's eyes. This keeps the last answers (her stage, the day she is on, your
   kindreds, your notes) with the account's other things on the phone, so the page opens on what
   was true last time and only moves if something really changed.

   Two copies: this run's (a page that mounts again opens on it at once) and the stored one
   (read in a few milliseconds on a cold start). Never sent anywhere. */

export type MeLast = { stage: WrenStage; kindreds: number | null; day: number | null; notes: number | null };

const KEY = "kindredly_me_last";
const STAGES: readonly WrenStage[] = ["egg", "hatch", "fledge", "wren"];
const count = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);

let now: MeLast | null = null;
onStorageUserChange(() => {
  now = null;
});

/** This run's copy; null until something was read or kept. */
export const meLastNow = (): MeLast | null => now;

/** The stored copy (and this run's from then on); null for none, or one that can't be read. */
export async function readMeLast(): Promise<MeLast | null> {
  if (now) return now;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    if (!STAGES.includes(o.stage as WrenStage)) return null;
    // a count kept while this was being read wins
    now = now ?? { stage: o.stage as WrenStage, kindreds: count(o.kindreds), day: count(o.day), notes: count(o.notes) };
    return now;
  } catch (e) {
    console.warn("[me] what the page knew last time couldn't be read:", e);
    return null;
  }
}

/** Keep what was just learned (her stage only ever moves forward; the page says which). */
export function keepMeLast(patch: Partial<MeLast>): MeLast {
  const next: MeLast = { stage: "egg", kindreds: null, day: null, notes: null, ...(now ?? {}), ...patch };
  now = next;
  AsyncStorage.setItem(KEY, JSON.stringify(next)).catch((e) => console.warn("[me] what the page knows wasn't kept:", e));
  return next;
}
