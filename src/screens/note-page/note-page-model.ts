import type { JournalEntry } from "../../lib/journal";

/* ONE JOURNAL PAGE AND ONE DAY OF THEM, AS DATA (the Swift pages, 2026-10-27).
   ────────────────────────────────────────────────────────────────────────
   Pure: no React, no React Native, no i18n — every word and date comes in
   from the caller, so `node src/screens/note-page/note-page-model.test.ts`
   locks the rules. NotePageNative (journal/[id], KNotePageView) and
   NoteDayNative (journal/day/[date], KNoteDayView) draw what these return;
   the React Native pages (the "noteentry" / "noteday" switches' fallback)
   keep their own copies of the same rules, unchanged:

   - A photo page's pictures are its album, or the single cover of a page
     saved before albums. The cover (the one coverIndex names; an index past
     the album, or none, is the first) is drawn first, the rest follow in
     their stored order, so a hold that makes another picture the cover
     moves it into the big cell and the Notes card agrees.
   - Only words drift, the whole page or nothing: a real text page with at
     least three characters (a sample never; a page with pictures, a voice
     or a film stays in the room).
   - The cover can be changed on a real page only, and its hint shows only
     when there is more than one picture to choose from.
   - The date line is the page's date, its mood's name after it (never for
     a page that stored no mood), and " · SAMPLE" on a sample, as written.
   - One day's pages are every page of that local day, oldest first.
   - EDIT (owner's audit, 2026-11-10): the ⋯ offers Edit, above Delete, on a
     real page where the SwiftUI composer will be the one drawn — it is the
     only composer that can change a sealed page (the React Native one would
     seal a second page). A sample is never editable: it is ours, not the
     reader's, and lives in data/demo, not in the journal. */

/** A photo page's pictures, as stored. [] on every other kind. */
export function pagePhotos(e: Pick<JournalEntry, "type" | "media" | "mediaUri">): string[] {
  if (e.type !== "photo") return [];
  if (e.media?.length) return e.media;
  return e.mediaUri ? [e.mediaUri] : [];
}

/** The drawing order of n pictures: the cover first, then the rest as stored. Each value is a
    picture's index in the album. */
export function galleryOrder(n: number, coverIndex: number | null | undefined): number[] {
  if (n <= 0) return [];
  const cover = typeof coverIndex === "number" && Number.isInteger(coverIndex) && coverIndex >= 0 && coverIndex < n ? coverIndex : 0;
  const out = [cover];
  for (let i = 0; i < n; i++) if (i !== cover) out.push(i);
  return out;
}

/** The page may leave for the letter desk: a real text page with words to carry. */
export function canDriftPage(e: Pick<JournalEntry, "type" | "body">, isDemo: boolean): boolean {
  return !isDemo && e.type === "text" && (e.body || "").trim().length >= 3;
}

/** The ⋯ offers Edit: a real page, on a phone whose composer can change one (the SwiftUI composer:
    its switch on and its view in the binary — the caller's to say). */
export function canEditPage(isDemo: boolean, composerCanEdit: boolean): boolean {
  return !isDemo && composerCanEdit;
}

/** The line under the mood: the date, the mood's name, and " · SAMPLE" on a sample. */
export function dateLine(date: string, moodName: string, isDemo: boolean): string {
  return `${date}${moodName ? ` · ${moodName}` : ""}${isDemo ? " · SAMPLE" : ""}`;
}

/** One picture of the gallery as drawn: its place in the album and its file. */
export type PagePhoto = { index: number; uri: string };

/** One page as the Swift page draws it (every word but the date line's parts is the caller's). */
export type PageView = {
  kind: JournalEntry["type"];
  /** words only: the larger type */
  pure: boolean;
  body: string;
  /** the line that left; "" for none */
  drifted: string;
  canDrift: boolean;
  /** in drawing order, the cover first */
  photos: PagePhoto[];
  /** a hold makes a picture the cover (a real page) */
  canSetCover: boolean;
  /** "Tap to view · Hold to make it the cover" shows */
  coverHint: boolean;
  /** the voice card shows (a voice page with its recording) */
  voice: boolean;
  /** the film shows (a video page with its file) */
  film: boolean;
};

export function pageView(e: JournalEntry, isDemo: boolean): PageView {
  const all = pagePhotos(e);
  const photos = galleryOrder(all.length, e.coverIndex).map((i) => ({ index: i, uri: all[i] }));
  const canSetCover = !isDemo;
  return {
    kind: e.type,
    pure: e.type === "text",
    body: e.body || "",
    drifted: e.driftedLine || "",
    canDrift: canDriftPage(e, isDemo),
    photos,
    canSetCover,
    coverHint: canSetCover && all.length > 1,
    voice: e.type === "voice" && !!e.mediaUri,
    film: e.type === "video" && !!e.mediaUri,
  };
}

/** The pages of one local day (`keyOf` is the calendar's dayKey), oldest first. Never mutates. */
export function dayPages<T extends { date: string }>(entries: readonly T[], date: string, keyOf: (iso: string) => string): T[] {
  return entries.filter((e) => keyOf(e.date) === date).sort((a, b) => +new Date(a.date) - +new Date(b.date));
}
