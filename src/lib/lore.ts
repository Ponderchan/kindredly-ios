import { scoped as AsyncStorage } from "./scoped-store";

/* LORE — the moments you chose to keep from a correspondence.
   Local-only, account-scoped, never uploaded: a saved moment is a private
   clipping, the same promise the journal makes. The old plan assumed this
   needed a server table; it never did — lore is personal by definition. */

const KEY = "kindredly_lore";

export interface LoreEntry {
  id: string;
  threadId: string;
  who: string; // their name as it read when saved
  body: string;
  prompt?: string | null; // a question fold's prompt, when it was one
  at: string; // ISO — when saved
  said: string; // ISO — when originally written, if known
}

export async function loadLore(): Promise<LoreEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LoreEntry[]) : [];
  } catch {
    return [];
  }
}

export async function saveToLore(e: Omit<LoreEntry, "id" | "at">): Promise<void> {
  try {
    const all = await loadLore();
    all.unshift({ ...e, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: new Date().toISOString() });
    await AsyncStorage.setItem(KEY, JSON.stringify(all.slice(0, 500)));
  } catch {
    /* a keepsake that fails to pin is retried by the person, not by code */
  }
}

export async function removeLore(id: string): Promise<void> {
  try {
    const all = await loadLore();
    await AsyncStorage.setItem(KEY, JSON.stringify(all.filter((e) => e.id !== id)));
  } catch {}
}
