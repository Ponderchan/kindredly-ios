import AsyncStorage from "@react-native-async-storage/async-storage";
import type { GrowthStats } from "../data/growth";
import type { WrenAccessory, WrenSkin, WrenStage } from "../components/WrenBird";

/* What Wren is wearing — local-only, like drafts. A cosmetic; nothing about
   being heard is ever gated. Free birds get a couple of pieces; the rest are
   Kindredly+ / seasonal drops. */

const KEY = "kindredly_wren_accessory";

export const FREE_ACCESSORIES: WrenAccessory[] = ["none", "beanie", "scarf"];

export const ACCESSORY_META: { id: WrenAccessory; label: string; emoji: string; free: boolean }[] = [
  { id: "none", label: "Bare", emoji: "🐦", free: true },
  { id: "beanie", label: "Beanie", emoji: "🧢", free: true },
  { id: "scarf", label: "Scarf", emoji: "🧣", free: true },
  { id: "phones", label: "Headphones", emoji: "🎧", free: false },
  { id: "flower", label: "Flower crown", emoji: "🌸", free: false },
  { id: "party", label: "Party hat", emoji: "🎉", free: false },
  { id: "shades", label: "Shades", emoji: "🕶", free: false },
];

/* Which skin Wren wears. sticker is the free default; plush unlocks at a
   milestone (first kindred); ink is Kindredly+. The gate lives in the UI —
   this just remembers the pick. */
const SKIN_KEY = "kindredly_wren_skin";

export const SKINS: { id: WrenSkin; name: string; blurb: string; lock: "free" | "milestone" | "plus" }[] = [
  { id: "sticker", name: "Sticker", blurb: "Bold and outlined — your everyday Wren.", lock: "free" },
  { id: "plush", name: "Plush", blurb: "Soft and squishy. Unlocks with your first kindred.", lock: "milestone" },
  { id: "ink", name: "Ink & Post", blurb: "The quiet postal bird. A Kindredly+ look.", lock: "plus" },
];

export async function getWrenSkin(): Promise<WrenSkin> {
  try {
    const v = (await AsyncStorage.getItem(SKIN_KEY)) as WrenSkin | null;
    return v && SKINS.some((s) => s.id === v) ? v : "sticker";
  } catch {
    return "sticker";
  }
}

export async function setWrenSkin(s: WrenSkin): Promise<void> {
  try {
    await AsyncStorage.setItem(SKIN_KEY, s);
  } catch {
    /* best-effort */
  }
}

/** Is a skin available to this user? sticker always; plush after first
 *  kindred; ink with premium. */
export function skinUnlocked(id: WrenSkin, stats: GrowthStats, premium: boolean): boolean {
  const meta = SKINS.find((s) => s.id === id);
  if (!meta || meta.lock === "free") return true;
  if (meta.lock === "plus") return premium;
  return stats.kindreds >= 1; // milestone
}

export async function getWrenAccessory(): Promise<WrenAccessory> {
  try {
    const v = (await AsyncStorage.getItem(KEY)) as WrenAccessory | null;
    return v && ACCESSORY_META.some((a) => a.id === v) ? v : "none";
  } catch {
    return "none";
  }
}

export async function setWrenAccessory(a: WrenAccessory): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, a);
  } catch {
    /* best-effort */
  }
}

/* Growth stage from the same product stats the stamps use:
   egg (signed up) → hatchling (first letter) → fledgling (written back to)
   → wren (first kindred). */
export const STAGE_ORDER: WrenStage[] = ["egg", "hatch", "fledge", "wren"];
export function stageIndex(s: WrenStage): number {
  return Math.max(0, STAGE_ORDER.indexOf(s));
}

export function wrenStage(s: GrowthStats): WrenStage {
  if (s.kindreds >= 1) return "wren";
  if (s.deepest >= 5 || s.gotReply) return "fledge";
  if (s.lettersSent >= 1 || s.reached >= 1) return "hatch";
  return "egg";
}

/* Growth only ever moves forward. The live stage is a snapshot of current
   threads, so deleting a conversation could regress it — we persist the
   highest stage ever reached and never drop below it. */
const FLOOR_KEY = "kindredly_wren_stage_floor";

export async function getStageFloor(): Promise<WrenStage> {
  try {
    const v = await AsyncStorage.getItem(FLOOR_KEY);
    const i = v ? Number(v) : 0;
    return STAGE_ORDER[Math.min(STAGE_ORDER.length - 1, Math.max(0, Number.isFinite(i) ? i : 0))];
  } catch {
    return "egg";
  }
}

export async function bumpStageFloor(stage: WrenStage): Promise<void> {
  try {
    const v = await AsyncStorage.getItem(FLOOR_KEY);
    const cur = v ? Number(v) : 0;
    const next = stageIndex(stage);
    if (next > cur) await AsyncStorage.setItem(FLOOR_KEY, String(next));
  } catch {
    /* best-effort */
  }
}

export interface StageInfo {
  stage: WrenStage;
  label: string;
  blurb: string; // where she is now
  next?: {
    label: string; // the next stage name
    milestone: string; // what unlocks it
    progress?: [number, number];
  };
}

export function stageInfo(s: GrowthStats, floor: WrenStage = "egg"): StageInfo {
  let stage = wrenStage(s);
  if (stageIndex(floor) > stageIndex(stage)) stage = floor; // only ever forward
  if (stage === "egg") {
    return {
      stage,
      label: "Egg",
      blurb: "She's still curled up. Write your first letter and she'll hatch.",
      // binary: the write itself hatches her
      next: { label: "Hatchling", milestone: "Write your first letter", progress: [Math.min(1, s.lettersSent), 1] },
    };
  }
  if (stage === "hatch") {
    return {
      stage,
      label: "Hatchling",
      blurb: "Newly out of the shell, and already listening.",
      // fledges on a reply OR five letters into one thread — the bar counts
      // your letters (the part you control); a reply short-circuits it.
      next: {
        label: "Fledgling",
        milestone: s.gotReply ? "A letter back" : "A reply — or 5 into one thread",
        progress: s.gotReply ? [1, 1] : [Math.min(5, s.deepest), 5],
      },
    };
  }
  if (stage === "fledge") {
    return {
      stage,
      label: "Fledgling",
      blurb: "Finding her wings — someone is writing back to you now.",
      // a kindred needs five letters from each side; the bar shows your five.
      next: { label: "Grown", milestone: "Trade five letters each to make a kindred", progress: [Math.min(5, s.deepest), 5] },
    };
  }
  return {
    stage,
    label: "Grown",
    blurb: "Fully grown, and unmistakably yours.",
  };
}
