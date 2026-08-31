import { scoped as AsyncStorage } from "./scoped-store";
import { Directory, File, Paths } from "expo-file-system";
import type { MoodId } from "../data/moods";

/* Journal is LOCAL-ONLY: entries in AsyncStorage, media files copied into the
   app's document directory ("Sealed on this device" — literally). Only an
   opted-in text line ever leaves, anonymously, into the shared morning pool
   (db.insertMorningFragment). Media types: text | photo | voice | video. */

const KEY = "kindredly_journal";

export type JournalType = "text" | "photo" | "voice" | "video";

export interface JournalEntry {
  id: string;
  date: string; // ISO
  type: JournalType;
  body: string; // text content / caption (may be empty for pure media)
  mood: MoodId;
  mediaUri?: string; // the cover (photo) OR the single media file (voice/video)
  media?: string[]; // photo type: every photo (1..9), cover included
  coverIndex?: number; // photo type: index into `media` that is the cover
  dur?: number; // seconds (voice/video)
  driftedLine?: string; // the one line sent out, if any
}

function journalDir(): Directory {
  return new Directory(Paths.document, "journal");
}

let mediaSeq = 0;

/** copy a picked/recorded media file into our persistent journal dir. */
export async function persistMedia(srcUri: string, ext: string): Promise<string | null> {
  try {
    const dir = journalDir();
    dir.create({ intermediates: true, idempotent: true });
    const dest = new File(dir, `j-${Date.now()}-${mediaSeq++}.${ext.replace(/^\./, "")}`);
    await new File(srcUri).copy(dest);
    return dest.uri;
  } catch {
    return null;
  }
}

/** copy several files (photo album), preserving order; drops any that fail. */
export async function persistMediaMany(srcUris: string[], ext: string): Promise<string[]> {
  const out: string[] = [];
  for (const u of srcUris) {
    const p = await persistMedia(u, ext);
    if (p) out.push(p);
  }
  return out;
}

/** re-resolve a stored media URI against the current container by filename. */
function resolve(uri: string): string {
  const name = uri.split("/").pop();
  return name ? new File(journalDir(), name).uri : uri;
}

export async function loadJournal(): Promise<JournalEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as JournalEntry[]) : [];
    if (!Array.isArray(arr)) return [];
    return arr.map((e) => {
      // migrate v1 entries (no `type`) → text
      const entry: JournalEntry = { ...e, type: e.type || "text" };
      // the app container path changes across installs/updates — stored
      // absolute URIs go stale, so re-resolve media by filename each load
      if (entry.media && entry.media.length) {
        entry.media = entry.media.map(resolve);
        const ci = entry.coverIndex ?? 0;
        entry.mediaUri = entry.media[ci] || entry.media[0];
      } else if (entry.mediaUri) {
        entry.mediaUri = resolve(entry.mediaUri);
      }
      return entry;
    });
  } catch {
    return [];
  }
}

async function save(entries: JournalEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* best-effort */
  }
}

export async function addEntry(input: {
  type: JournalType;
  body: string;
  mood: MoodId;
  mediaUri?: string;
  media?: string[];
  coverIndex?: number;
  dur?: number;
}): Promise<JournalEntry[]> {
  const entries = await loadJournal();
  const entry: JournalEntry = {
    id: `j-${Date.now()}`,
    date: new Date().toISOString(),
    type: input.type,
    body: (input.body || "").trim(),
    mood: input.mood,
    mediaUri: input.mediaUri,
    media: input.media,
    coverIndex: input.coverIndex,
    dur: input.dur,
  };
  const next = [entry, ...entries];
  await save(next);
  return next;
}

/** change which photo is the album cover. */
export async function setCover(id: string, coverIndex: number): Promise<JournalEntry[]> {
  const entries = await loadJournal();
  const next = entries.map((e) =>
    e.id === id ? { ...e, coverIndex, mediaUri: e.media?.[coverIndex] || e.mediaUri } : e,
  );
  await save(next);
  return next;
}

/* SAMPLE PAGES CAN BE TORN OUT TOO. Demo entries only exist in dev builds,
   but the owner testing a dev build IS a reader — and to them a page with no
   ··· menu reads as "delete is missing", not "this is a sample". So the menu
   shows on samples and tearing one out hides it for good on this device. */
const HIDDEN_DEMO_KEY = "kindredly_hidden_demo";

export async function hiddenDemoIds(): Promise<string[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(HIDDEN_DEMO_KEY)) || "[]");
  } catch {
    return [];
  }
}

export async function hideDemoEntry(id: string): Promise<void> {
  try {
    const ids = await hiddenDemoIds();
    if (!ids.includes(id)) await AsyncStorage.setItem(HIDDEN_DEMO_KEY, JSON.stringify([...ids, id]));
  } catch {
    /* a sample is not worth failing over */
  }
}

export async function deleteEntry(id: string): Promise<JournalEntry[]> {
  const entries = await loadJournal();
  const gone = entries.find((e) => e.id === id);
  const next = entries.filter((e) => e.id !== id);
  await save(next);
  // best-effort: remove every media file this page owned
  const files = [gone?.mediaUri, ...(gone?.media || [])].filter(Boolean) as string[];
  for (const f of files) {
    try {
      const name = f.split("/").pop();
      if (name) new File(journalDir(), name).delete();
    } catch {
      /* fine */
    }
  }
  return next;
}

export async function setDrift(id: string, line: string): Promise<JournalEntry[]> {
  const entries = await loadJournal();
  const next = entries.map((e) => (e.id === id ? { ...e, driftedLine: line } : e));
  await save(next);
  return next;
}

export async function clearDrift(id: string): Promise<JournalEntry[]> {
  const entries = await loadJournal();
  const next = entries.map((e) => {
    if (e.id !== id) return e;
    const { driftedLine, ...rest } = e;
    return rest;
  });
  await save(next);
  return next;
}

/** split an entry into candidate sentences to drift. */
export function sentencesOf(body: string): string[] {
  return (body || "")
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
}
