import { scoped as AsyncStorage } from "./scoped-store";

/* Kept passages — local-only, like the web's Kept: "Conversations get sealed
   away, but kept lines stay. Each one notes who it came from, and which day." */

const KEY = "kindredly_kept";

export interface KeptPassage {
  id: string; // stable key of the source (morning fragment id / letter id)
  date: string; // ISO — when kept
  text: string;
  from: "morning" | "letter" | "thread";
  who?: string; // alias if known
}

export async function loadKept(): Promise<KeptPassage[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as KeptPassage[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function save(kept: KeptPassage[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(kept));
  } catch {
    /* best-effort */
  }
}

export async function isKept(id: string): Promise<boolean> {
  return (await loadKept()).some((k) => k.id === id);
}

/** toggle; returns the new kept-state for this id. */
export async function toggleKept(p: Omit<KeptPassage, "date">): Promise<boolean> {
  const kept = await loadKept();
  const i = kept.findIndex((k) => k.id === p.id);
  if (i >= 0) {
    kept.splice(i, 1);
    await save(kept);
    return false;
  }
  kept.unshift({ ...p, date: new Date().toISOString() });
  await save(kept);
  return true;
}

export async function unkeep(id: string): Promise<KeptPassage[]> {
  const kept = (await loadKept()).filter((k) => k.id !== id);
  await save(kept);
  return kept;
}
