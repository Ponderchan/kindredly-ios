import { scoped as AsyncStorage } from "./scoped-store";

/* Letter drafts — local-only, like the web: "Drafts are only ever yours to
   see, and they never send themselves." Text drafts only (voice recordings
   live in the temp dir and don't survive as drafts). */

const KEY = "kindredly_drafts";

export interface Draft {
  id: string;
  date: string; // ISO — last touched
  stamp: string;
  body: string;
  ask: string;
}

export async function loadDrafts(): Promise<Draft[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as Draft[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    // still "no drafts" to every caller, but said out loud (owner's audit, 2026-11-10: the +
    // tray reads this to offer a draft, and a read that fails silently looks like no drafts)
    if (__DEV__) console.warn("[drafts] unread", e);
    return [];
  }
}

async function save(drafts: Draft[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(drafts));
  } catch {
    /* best-effort */
  }
}

/** upsert (id present → update, else create). Returns the draft's id. */
export async function saveDraft(input: {
  id?: string | null;
  stamp: string;
  body: string;
  ask: string;
}): Promise<string> {
  const drafts = await loadDrafts();
  const id = input.id || `d-${Date.now()}`;
  const next: Draft = {
    id,
    date: new Date().toISOString(),
    stamp: input.stamp,
    body: input.body,
    ask: input.ask,
  };
  const i = drafts.findIndex((d) => d.id === id);
  if (i >= 0) drafts[i] = next;
  else drafts.unshift(next);
  await save(drafts);
  return id;
}

export async function getDraft(id: string): Promise<Draft | null> {
  const drafts = await loadDrafts();
  return drafts.find((d) => d.id === id) || null;
}

export async function deleteDraft(id: string): Promise<Draft[]> {
  const drafts = (await loadDrafts()).filter((d) => d.id !== id);
  await save(drafts);
  return drafts;
}
