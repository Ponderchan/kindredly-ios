import { useSyncExternalStore } from "react";
import { onStorageUserChange, scoped as AsyncStorage } from "./scoped-store";

/* WHAT THIS PHONE REACHES FOR (owner, 2026-11-11: the looks on her card's shelf are not a fixed
   list; they can follow a festival or "用户点击的热度"). A count per look — a tap on the shelf
   (a locked one too: wanting it counts), a look put on anywhere — kept on the phone with the
   account's other things (lib/scoped-store) and never sent. screens/me/planet-model shelfSlots
   reads it as one of the things that put the shelf in order.

   Ids are the catalogue's bare ones ("phones", "peach"); the defaults ("none", "sticker") are
   not looks and are not counted. */

const KEY = "kindredly_look_heat";
/** a count stops here: a look reached for a hundred times is as warm as one can be */
const CEILING = 999;
const NOT_LOOKS = new Set(["", "none", "sticker"]);

let heat: Readonly<Record<string, number>> = Object.freeze({});
let loaded: Promise<void> | null = null;
const subs = new Set<() => void>();
const tell = () => subs.forEach((f) => f());

function parse(raw: string | null): Record<string, number> {
  if (!raw) return {};
  try {
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out: Record<string, number> = {};
    for (const [k, n] of Object.entries(v as Record<string, unknown>)) {
      if (typeof n === "number" && Number.isFinite(n) && n > 0) out[k] = Math.min(CEILING, Math.floor(n));
    }
    return out;
  } catch (e) {
    console.warn("[look-heat] the record on this phone can't be read; starting again:", e);
    return {};
  }
}

/** Read the record once per account; safe to call from anywhere, any number of times. */
export function loadLookHeat(): Promise<void> {
  if (!loaded) {
    loaded = AsyncStorage.getItem(KEY)
      .then((raw) => {
        // counts made before the read landed are kept on top of it
        const stored = parse(raw);
        const merged: Record<string, number> = { ...stored };
        for (const [k, n] of Object.entries(heat)) merged[k] = Math.min(CEILING, (stored[k] ?? 0) + n);
        heat = Object.freeze(merged);
        tell();
      })
      .catch((e) => console.warn("[look-heat] the record wasn't read:", e));
  }
  return loaded;
}

onStorageUserChange(() => {
  heat = Object.freeze({});
  loaded = null;
  tell();
});

/** One more reach for this look. */
export function bumpLookHeat(id: string): void {
  if (NOT_LOOKS.has(id)) return;
  const before = Object.prototype.hasOwnProperty.call(heat, id) ? heat[id] : 0;
  heat = Object.freeze({ ...heat, [id]: Math.min(CEILING, before + 1) });
  tell();
  void loadLookHeat()
    .then(() => AsyncStorage.setItem(KEY, JSON.stringify(heat)))
    .catch((e) => console.warn("[look-heat] the record wasn't saved:", e));
}

/** The record as it stands (the same object until a count changes). */
export const lookHeat = (): Readonly<Record<string, number>> => heat;

const subscribe = (f: () => void) => {
  subs.add(f);
  void loadLookHeat();
  return () => {
    subs.delete(f);
  };
};

/** The record, followed. */
export function useLookHeat(): Readonly<Record<string, number>> {
  return useSyncExternalStore(subscribe, lookHeat, lookHeat);
}
