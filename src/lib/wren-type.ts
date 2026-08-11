import AsyncStorage from "@react-native-async-storage/async-storage";
import { voiceSignature } from "./signature";
import type { WrenAccessory } from "../components/WrenBird";

/* What hatches is decided by how you write. Same bird, always — the type is
   a personality read from your first line's fingerprint (sentence length ×
   pauses), shown as a label + a born-with accessory. The shell was your
   pick; this part is earned by the writing. */

export type WrenTypeId = "spark" | "deep" | "storyteller" | "whisper";

export interface WrenType {
  id: WrenTypeId;
  name: string; // "The Spark"
  line: string; // how she matches your hand
  accessory: WrenAccessory; // born-with trait (free for you)
}

export const WREN_TYPES: Record<WrenTypeId, WrenType> = {
  spark: {
    id: "spark",
    name: "The Spark",
    line: "Quick and bright — one true line at a time, just like you.",
    accessory: "phones",
  },
  deep: {
    id: "deep",
    name: "The Deep One",
    line: "Slow and deep — your pauses mean something, and so does she.",
    accessory: "scarf",
  },
  storyteller: {
    id: "storyteller",
    name: "The Storyteller",
    line: "One thought unspooling into the next — she could listen all night.",
    accessory: "flower",
  },
  whisper: {
    id: "whisper",
    name: "The Whisper",
    line: "Soft, careful words that land quietly — she leans in close.",
    accessory: "beanie",
  },
};

/** Read the type from a piece of writing (the first line at the hatch). */
export function wrenTypeFor(text: string): WrenType {
  const sig = voiceSignature((text || "").trim());
  const long = sig.sentenceLen >= 12;
  const paused = sig.pauses >= 2;
  if (long && paused) return WREN_TYPES.deep;
  if (long) return WREN_TYPES.storyteller;
  if (paused) return WREN_TYPES.whisper;
  return WREN_TYPES.spark;
}

const KEY = "kindredly_wren_type";

export async function saveWrenType(id: WrenTypeId): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, id);
  } catch {
    /* best-effort */
  }
}

export async function getWrenType(): Promise<WrenType | null> {
  try {
    const v = (await AsyncStorage.getItem(KEY)) as WrenTypeId | null;
    return v && WREN_TYPES[v] ? WREN_TYPES[v] : null;
  } catch {
    return null;
  }
}
