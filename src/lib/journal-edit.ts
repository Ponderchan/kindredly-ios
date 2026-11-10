import type { JournalType } from "./journal";

/* CHANGING A SEALED PAGE, AS RULES (owner's audit, 2026-11-10: a journal page
   could not be changed once it was saved). Pure — types only, no storage, no
   files — so `node src/lib/journal-edit.test.ts` holds them; lib/journal's
   updateEntry does the reading, the saving and the deleting around them.

   - THE PAGE STAYS THE PAGE. An edit replaces what the page holds (its kind,
     words, mood and media) and nothing else: its id, its date and time, its
     drifted line and anything a later build stored on it stay exactly as
     saved, in the same place in the object, so it keeps its place in the
     list and the calendar.
   - ONE KIND, AND ONLY WHAT IT NEEDS. A photo page keeps its album, a cover
     index that points inside it and that cover as mediaUri; a voice or film
     page keeps its one file and its length; a page of words keeps none of
     those. A kind that arrives without its media is a page of words (the
     journal never stores an album of nothing, or a voice page with no
     recording).
   - FILES ARE KNOWN BY NAME. The app's container path changes across
     installs and updates (lib/journal re-resolves every stored path by its
     file name), so two paths are the same file when their last segment is.
   - WHAT AN EDIT LEAVES BEHIND is every file the page had that NO page of
     the saved journal still names — not just the edited one: old data can
     repeat a page id, and a file one copy still shows is never removed. */

/** What an edit says the page holds now. Media paths are files already in the journal's folder. */
export type PageEdit = {
  type: JournalType;
  body: string;
  mood: string;
  /** voice / video: the one file */
  mediaUri?: string;
  /** photo: every picture, in order */
  media?: string[];
  /** photo: which of `media` is the cover */
  coverIndex?: number;
  /** voice / video: seconds */
  dur?: number;
};

type Stored = Record<string, unknown>;

const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;

/** A path's file name (its last segment); null for none. */
export function fileName(uri: unknown): string | null {
  if (!isStr(uri)) return null;
  const name = uri.split("/").pop();
  return name ? name : null;
}

/** The names of the files a stored page refers to (its one file or cover, and its album), once each. */
export function pageFiles(page: unknown): string[] {
  if (!page || typeof page !== "object") return [];
  const p = page as Stored;
  const out: string[] = [];
  const add = (uri: unknown) => {
    const name = fileName(uri);
    if (name && !out.includes(name)) out.push(name);
  };
  add(p.mediaUri);
  if (Array.isArray(p.media)) p.media.forEach(add);
  return out;
}

/** The stored page with the edit laid over it (see the rules at the top). Never mutates. */
export function editedPage(stored: Stored, edit: PageEdit): Stored {
  // the page's own fields first and in their order; what the edit decides is taken out and written again
  const { type: _type, body: _body, mood: _mood, mediaUri: _uri, media: _media, coverIndex: _cover, dur: _dur, ...kept } = stored;
  const body = (edit.body || "").trim();
  const album = edit.type === "photo" && Array.isArray(edit.media) ? edit.media.filter(isStr) : [];
  if (album.length) {
    const want = edit.coverIndex;
    const cover = typeof want === "number" && Number.isInteger(want) && want >= 0 && want < album.length ? want : 0;
    return { ...kept, type: "photo", body, mood: edit.mood, mediaUri: album[cover], media: album, coverIndex: cover };
  }
  if ((edit.type === "voice" || edit.type === "video") && isStr(edit.mediaUri)) {
    const dur = typeof edit.dur === "number" && Number.isFinite(edit.dur) && edit.dur > 0 ? edit.dur : undefined;
    return { ...kept, type: edit.type, body, mood: edit.mood, mediaUri: edit.mediaUri, ...(dur !== undefined ? { dur } : {}) };
  }
  return { ...kept, type: "text", body, mood: edit.mood };
}

/** The files `before` had that no page of the saved journal names any more: what the edit may delete. */
export function filesDropped(before: unknown, pagesAfter: readonly unknown[]): string[] {
  const had = pageFiles(before);
  if (!had.length) return [];
  const still = new Set<string>();
  for (const p of pagesAfter) for (const name of pageFiles(p)) still.add(name);
  return had.filter((name) => !still.has(name));
}
