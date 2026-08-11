import AsyncStorage from "@react-native-async-storage/async-storage";
import type { GrowthStats } from "../data/growth";
import type { WrenAccessory, WrenStage } from "../components/WrenBird";

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
export function wrenStage(s: GrowthStats): WrenStage {
  if (s.kindreds >= 1) return "wren";
  if (s.deepest >= 5 || s.gotReply) return "fledge";
  if (s.lettersSent >= 1 || s.reached >= 1) return "hatch";
  return "egg";
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

export function stageInfo(s: GrowthStats): StageInfo {
  const stage = wrenStage(s);
  if (stage === "egg") {
    return {
      stage,
      label: "Egg",
      blurb: "She's still curled up. Write your first letter and she'll hatch.",
      next: { label: "Hatchling", milestone: "Write 1 letter", progress: [0, 1] },
    };
  }
  if (stage === "hatch") {
    return {
      stage,
      label: "Hatchling",
      blurb: "Newly out of the shell, and already listening.",
      next: {
        label: "Fledgling",
        milestone: "Get one letter back",
        progress: [Math.min(1, s.deepest), 1],
      },
    };
  }
  if (stage === "fledge") {
    return {
      stage,
      label: "Fledgling",
      blurb: "Finding her wings — someone is writing back to you now.",
      next: { label: "Wren", milestone: "Make your first kindred", progress: [Math.min(1, s.kindreds), 1] },
    };
  }
  return {
    stage,
    label: "Wren",
    blurb: "Fully grown, and unmistakably yours.",
  };
}
