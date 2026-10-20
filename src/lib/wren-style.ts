import { useEffect, useState } from "react";
import { scoped as AsyncStorage } from "./scoped-store";
import { readWren, writeWren } from "./wren-profile";   // her coat and dress live on the account (WREN_FIELDS)
import { t } from "./i18n";
import type { GrowthStats } from "../data/growth";
import type { WrenAccessory, WrenSkin, WrenStage } from "../components/WrenBird";

/* What Wren is wearing — local-only, like drafts. A cosmetic; nothing about
   being heard is ever gated. Free birds get a couple of pieces; the rest are
   First Class / seasonal drops. */


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
   milestone (first kindred); ink is First Class. The gate lives in the UI —
   this just remembers the pick. */

export const SKINS: { id: WrenSkin; lock: "free" | "milestone" | "plus" }[] = [
  { id: "sticker", lock: "free" },     // Sky
  { id: "moss", lock: "milestone" },   // Moss
  { id: "plush", lock: "plus" },  // Mist
  { id: "peach", lock: "plus" },       // Peach
  { id: "ink", lock: "plus" },         // Night
];

/* The skin's display name. A module constant is evaluated once at import, so
   the name can't live in SKINS — it would freeze in whatever language the app
   started in. This is a lookup the UI calls at render instead. */
export const skinName = (id: WrenSkin): string => t(`skin.${id}.name`);

export async function getWrenSkin(): Promise<WrenSkin> {
  return ((await readWren("skin", (v) => SKINS.some((s) => s.id === v))) as WrenSkin | null) || "sticker";
}

export async function setWrenSkin(s: WrenSkin): Promise<void> {
  await writeWren("skin", s);
}

/* THE COAT SHE HATCHED IN (owner, 2026-09-24). The web's public test (/aura)
   hatches her in any of the five, and she keeps that one — it's hers without
   First Class. The web's onboarding writes it to the account (wrenHatchSkin);
   this reads it, and every gate below lets it through. */
let hatchSkin: WrenSkin | null = null;
export async function loadHatchSkin(): Promise<WrenSkin | null> {
  hatchSkin = ((await readWren("hatchSkin", (v) => SKINS.some((s) => s.id === v))) as WrenSkin | null) || null;
  return hatchSkin;
}
/** the hatched coat, for a screen that draws the wardrobe (re-renders once it's read) */
export function useHatchSkin(): WrenSkin | null {
  const [v, setV] = useState<WrenSkin | null>(hatchSkin);
  useEffect(() => {
    let alive = true;
    void loadHatchSkin().then((h) => alive && setV(h));
    return () => {
      alive = false;
    };
  }, []);
  return v;
}

/** Is a skin available to this user? Sky always; Moss after the first
 *  kindred; Mist, Peach and Night with First Class (owner's ladder, 2026-09-16);
 *  and whatever coat she hatched in on /aura. */
export function skinUnlocked(id: WrenSkin, stats: GrowthStats, premium: boolean, hatch: WrenSkin | null = hatchSkin): boolean {
  if (hatch && id === hatch) return true;
  const meta = SKINS.find((s) => s.id === id);
  if (!meta || meta.lock === "free") return true;
  if (meta.lock === "plus") return premium;
  return stats.kindreds >= 1; // milestone
}

export async function getWrenAccessory(): Promise<WrenAccessory> {
  return ((await readWren("accessory", (v) => ACCESSORY_META.some((a) => a.id === v))) as WrenAccessory | null) || "none";
}

export async function setWrenAccessory(a: WrenAccessory): Promise<void> {
  await writeWren("accessory", a);
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
  let floor: WrenStage = "egg";
  try {
    const v = await AsyncStorage.getItem(FLOOR_KEY);
    const i = v ? Number(v) : 0;
    floor = STAGE_ORDER[Math.min(STAGE_ORDER.length - 1, Math.max(0, Number.isFinite(i) ? i : 0))];
  } catch (e) {
    console.warn("[wren] the stage floor wasn't read", e);
  }
  if (floor !== "egg") return floor;
  /* Onboarding hatches her (the hatch engine reads the first letter), so past it she is never an
     egg again — not after a reinstall, on another phone, or on an account from before the floor
     was kept (owner, 2026-10-20: an egg floating on Me after the onboarding hatched her). The
     floor lives on this phone; this puts it right. */
  void bumpStageFloor("hatch");
  return "hatch";
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
