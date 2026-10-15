import { scoped as AsyncStorage, scopedTo, storageOwner } from "./scoped-store";
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

/* A JOURNAL THAT CAN'T BE READ IS NOT AN EMPTY ONE.
   Every change reads the stored pages, edits them and saves them back. The
   read used to turn ANY failure — storage refusing, one malformed page, a
   blob that wouldn't parse — into [], and the next sealed page then saved
   [itself] over every page, on a journal that lives nowhere but this phone.
   Now a change starts from the pages exactly as stored: a page that can't be
   shown is hidden on screen but kept; a blob that can't be parsed is set
   aside under RESCUE_KEY before anything replaces it; and a read or save
   that fails throws, so the caller can say so instead of losing the page. */
const RESCUE_KEY = "kindredly_journal_rescue";
/* AND A JOURNAL STORAGE LOST TRACK OF IS NOT AN EMPTY ONE EITHER. After one
   failed read of a large value, iOS's AsyncStorage drops the key from its
   manifest (RNCAsyncStorage.mm, _getValueForKey) — the file is still on
   disk, but every later read answers null, without an error, and null is
   what "no journal yet" looks like. So: a read that fails stops every change
   until the app starts again, and COUNT_KEY keeps how many pages the last
   good read or save saw — null over a journal that had pages is never
   written over. */
const COUNT_KEY = "kindredly_journal_n";
let readFailed = false;
let noted: string | null = null; // `${account}:${count}` last written

/* ONE ACCOUNT FROM READ TO WRITE. A scoped key is fixed when its call is
   made, but the account can change before the answer comes back — signing
   out, a guest linking Apple — and WrenStage reads the journal in the very
   commit that flips it. A count written on that answer landed in the NEW
   account, which then looked like a journal storage had lost and was locked
   out of writing for good. So every read, and every change from its read to
   its save, is pinned to the account it started on. */
type Store = ReturnType<typeof scopedTo>;
type Stored = { pages: unknown[]; unreadable?: string; vanished?: boolean };

/** a storage read of ours; one that fails marks the session. */
async function read(store: Store, key: string): Promise<string | null> {
  try {
    return await store.getItem(key);
  } catch (err) {
    readFailed = true;
    throw err;
  }
}

/** remember how many pages this account has — best-effort, only on a change. */
async function noteCount(store: Store, owner: string, n: number): Promise<void> {
  const mark = `${owner}:${n}`;
  if (mark === noted) return;
  try {
    await store.setItem(COUNT_KEY, String(n));
    noted = mark;
  } catch (err) {
    console.warn("[journal] couldn't note the page count:", err);
  }
}

/** the pages exactly as saved. Rejects when storage can't be read; a blob
    that isn't a list comes back as `unreadable` for a writer to set aside,
    and nothing where pages were comes back as `vanished`. */
async function readStored(store: Store): Promise<Stored> {
  const raw = await read(store, KEY);
  if (!raw) return Number(await read(store, COUNT_KEY)) > 0 ? { pages: [], vanished: true } : { pages: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return { pages: parsed };
  } catch {
    /* not JSON — handed back as unreadable below */
  }
  return { pages: [], unreadable: raw };
}

/** keep every unreadable journal, oldest first, before a write replaces it. */
async function setAside(store: Store, raw: string): Promise<void> {
  const kept = await store.getItem(RESCUE_KEY);
  let all: unknown[] = [];
  if (kept) {
    try {
      const parsed: unknown = JSON.parse(kept);
      all = Array.isArray(parsed) ? parsed : [kept];
    } catch {
      all = [kept];
    }
  }
  await store.setItem(RESCUE_KEY, JSON.stringify([...all, { at: new Date().toISOString(), raw }]));
  console.warn(`[journal] the stored journal didn't parse (${raw.length} chars); set aside under ${RESCUE_KEY}`);
}

/** one stored page as the screens want it, or null when it can't be shown. */
function shown(e: unknown): JournalEntry | null {
  try {
    if (!e || typeof e !== "object") return null;
    const s = e as Partial<JournalEntry>;
    if (typeof s.id !== "string") return null;
    // migrate v1 entries (no `type`) → text
    const entry = { ...s, type: s.type || "text", body: typeof s.body === "string" ? s.body : "" } as JournalEntry;
    // the app container path changes across installs/updates — stored
    // absolute URIs go stale, so re-resolve media by filename each load
    if (Array.isArray(entry.media)) entry.media = entry.media.filter((u): u is string => typeof u === "string" && u.length > 0);
    if (entry.media && entry.media.length) {
      entry.media = entry.media.map(resolve);
      const ci = entry.coverIndex ?? 0;
      entry.mediaUri = entry.media[ci] || entry.media[0];
    } else if (typeof entry.mediaUri === "string" && entry.mediaUri) {
      entry.mediaUri = resolve(entry.mediaUri);
    }
    return entry;
  } catch (err) {
    console.warn("[journal] a page couldn't be shown; it stays stored:", err);
    return null;
  }
}

const showAll = (pages: unknown[]): JournalEntry[] =>
  pages.map(shown).filter((e): e is JournalEntry => e !== null);

const isPage = (e: unknown, id: string): e is Partial<JournalEntry> =>
  !!e && typeof e === "object" && (e as { id?: unknown }).id === id;

/** for screens: never throws — a journal that can't be read shows as none,
    and stays stored exactly as it was. */
export async function loadJournal(): Promise<JournalEntry[]> {
  try {
    const owner = await storageOwner();
    const store = scopedTo(owner);
    const { pages, unreadable, vanished } = await readStored(store);
    if (unreadable !== undefined) console.warn("[journal] the stored journal didn't parse; showing none, keeping it");
    else if (vanished) console.warn("[journal] storage answered nothing where the journal had pages; showing none, writing nothing");
    else void noteCount(store, owner, pages.length); // journals saved before the count existed get one here
    return showAll(pages);
  } catch (err) {
    console.warn("[journal] couldn't read the journal:", err);
    return [];
  }
}

/** every change goes through here: read as stored, change, save. Throws
    when the journal can't be read, was lost track of, or can't be saved. A
    save that throws may still have landed (iOS caches the value before it
    checks the write), so callers retry with the same page id. */
async function rewrite(change: (pages: unknown[]) => unknown[]): Promise<JournalEntry[]> {
  if (readFailed) throw new Error("journal: a read failed this session; nothing is written until the app restarts");
  const owner = await storageOwner();
  const store = scopedTo(owner);
  const { pages, unreadable, vanished } = await readStored(store);
  if (vanished) throw new Error("journal: storage lost track of a journal that had pages; not writing over it");
  if (unreadable !== undefined) await setAside(store, unreadable);
  const next = change(pages);
  await store.setItem(KEY, JSON.stringify(next));
  await noteCount(store, owner, next.length);
  return showAll(next);
}

export async function addEntry(input: {
  /** the composer's own id for this page, so a retry replaces rather than repeats */
  id?: string;
  type: JournalType;
  body: string;
  mood: MoodId;
  mediaUri?: string;
  media?: string[];
  coverIndex?: number;
  dur?: number;
}): Promise<JournalEntry[]> {
  const entry: JournalEntry = {
    id: input.id || `j-${Date.now()}`,
    date: new Date().toISOString(),
    type: input.type,
    body: (input.body || "").trim(),
    mood: input.mood,
    mediaUri: input.mediaUri,
    media: input.media,
    coverIndex: input.coverIndex,
    dur: input.dur,
  };
  return rewrite((pages) => [entry, ...pages.filter((e) => !isPage(e, entry.id))]);
}

/** change which photo is the album cover. */
export async function setCover(id: string, coverIndex: number): Promise<JournalEntry[]> {
  return rewrite((pages) =>
    pages.map((e) =>
      isPage(e, id) ? { ...e, coverIndex, mediaUri: (Array.isArray(e.media) && e.media[coverIndex]) || e.mediaUri } : e,
    ),
  );
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
  let gone: Partial<JournalEntry> | undefined;
  const next = await rewrite((pages) => {
    gone = pages.find((e): e is Partial<JournalEntry> => isPage(e, id));
    return pages.filter((e) => !isPage(e, id));
  });
  // best-effort: remove every media file this page owned
  const files = [gone?.mediaUri, ...(Array.isArray(gone?.media) ? gone.media : [])].filter(
    (f): f is string => typeof f === "string" && f.length > 0,
  );
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
  return rewrite((pages) => pages.map((e) => (isPage(e, id) ? { ...e, driftedLine: line } : e)));
}

export async function clearDrift(id: string): Promise<JournalEntry[]> {
  return rewrite((pages) =>
    pages.map((e) => {
      if (!isPage(e, id)) return e;
      const { driftedLine, ...rest } = e;
      return rest;
    }),
  );
}

/* THE JOURNAL OUTLIVES THE ACCOUNT (owner, 2026-10-15: "日记留吧" — and the
   Delete Account sheet promises it). Deleting an account scrubs that
   account's bucket and the phone falls back to the guest one, so the sealed
   pages are handed to the guest bucket first: moved when it has none,
   merged (newest first, one copy per page id) when it has. A side that
   won't parse is never merged over — the deleted account's whole blob goes
   into the guest bucket's rescue list instead. Media lives in
   Documents/journal for the phone, not per account, and stays put.
   Throws if storage refuses, so the caller can leave the pages unscrubbed. */
export async function handOverJournal(fromUid: string): Promise<void> {
  if (!fromUid || fromUid === "anon") return;
  const from = scopedTo(fromUid);
  const to = scopedTo("anon");
  const mine = await from.getItem(KEY);
  if (!mine) return;
  const parse = (raw: string | null): unknown[] | null => {
    if (!raw) return [];
    try {
      const v: unknown = JSON.parse(raw);
      return Array.isArray(v) ? v : null;
    } catch {
      return null;
    }
  };
  const keep = async (raw: string) => {
    const prev = await to.getItem(RESCUE_KEY);
    const kept = prev ? (parse(prev) ?? [prev]) : []; // an unreadable rescue list is kept whole too
    await to.setItem(RESCUE_KEY, JSON.stringify([...kept, { at: new Date().toISOString(), raw }]));
  };
  const a = parse(mine);
  const b = parse(await to.getItem(KEY));
  if (a === null || b === null) {
    await keep(mine);
    console.warn("[journal] hand-over: a side didn't parse; the deleted account's journal is kept in the guest rescue list");
    return;
  }
  const idOf = (e: unknown) => (e && typeof e === "object" && typeof (e as { id?: unknown }).id === "string" ? (e as { id: string }).id : null);
  const when = (e: unknown) => {
    const d = e && typeof e === "object" ? Date.parse(String((e as { date?: unknown }).date)) : NaN;
    return isNaN(d) ? 0 : d;
  };
  const seen = new Set<string>();
  const merged = [...a, ...b].filter((e) => {
    const id = idOf(e);
    if (!id) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  merged.sort((x, y) => when(y) - when(x));
  await to.setItem(KEY, JSON.stringify(merged));
  await to.setItem(COUNT_KEY, String(merged.length));
  const rescued = await from.getItem(RESCUE_KEY);
  if (rescued) await keep(rescued);
}

/** split an entry into candidate sentences to drift. */
export function sentencesOf(body: string): string[] {
  return (body || "")
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
}
