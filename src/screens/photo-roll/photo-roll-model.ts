/* THE NOTES PHOTO ROLL, AS DATA (the Swift roll, 2026-10-27).
   ────────────────────────────────────────────────────────────────────────
   Pure: no React, no React Native, no i18n, so
   `node src/screens/photo-roll/photo-roll-model.test.ts` locks the rules.
   PhotoRollNative (journal-pick, KPhotoRollView) draws what these return;
   the React Native page (the "photoroll" switch's fallback) keeps its own
   copy of the same rules, unchanged:

   - THE FIRST ROW is three cells, each exactly a picture's size. Opening a
     new page: Camera, Text note, Voice note as stamps where the binary has
     the camera card (1.2.6 on), else Text note, Voice note and the newest
     picture (an empty cell while the roll has none), the roll going on from
     the second picture. Adding to a page (?more=1): no first row, the whole
     roll.
   - PICKING: a tap on a picture adds it at the end of the order or takes it
     out; past the room left (nine, less what the page already holds) it is
     refused, unchanged, and the caller says so. A film is never picked: it
     goes to the page on its own.
   - NEXT reads "Next" (or "Add"), "Next · 3" with three picked, "…" while
     the chosen frames become files.
   - THE ALBUMS: the first row is the whole roll (Recents, read without an
     album filter); a row is the current one when it is what the roll shows.
   - A film's length is m:ss. */

/** the most pictures a page holds */
export const ROLL_MAX = 9;
/** frames read per page of the library */
export const ROLL_PAGE = 60;

export type RollKey = "camera" | "text" | "voice";

/** The first row: its stamps, and the newest picture (or an empty cell) where Camera isn't. */
export type FirstRow<F> = {
  keys: RollKey[];
  /** the newest picture in the first row's third cell; null for none */
  lead: F | null;
  /** the third cell is empty (no camera card, nothing on the roll yet) */
  leadBlank: boolean;
  /** what the grid shows after the first row */
  rest: F[];
};

export function firstRow<F>(o: { adding: boolean; camera: boolean; frames: readonly F[] }): FirstRow<F> {
  if (o.adding) return { keys: [], lead: null, leadBlank: false, rest: [...o.frames] };
  if (o.camera) return { keys: ["camera", "text", "voice"], lead: null, leadBlank: false, rest: [...o.frames] };
  const lead = o.frames[0] ?? null;
  return { keys: ["text", "voice"], lead, leadBlank: !lead, rest: o.frames.slice(1) };
}

/** How many more pictures fit, the page holding `kept` already. */
export const roomFor = (kept: number): number => Math.max(0, ROLL_MAX - kept);

/** A tap on a picture: the new order, and whether it was refused because the page is full. */
export function togglePick(picked: readonly string[], id: string, room: number): { picked: string[]; full: boolean } {
  if (picked.includes(id)) return { picked: picked.filter((x) => x !== id), full: false };
  if (picked.length >= room) return { picked: [...picked], full: true };
  return { picked: [...picked, id], full: false };
}

/** Next's words: the word alone, with the count, or "…" while busy. */
export function nextLabel(word: string, n: number, busy: boolean): string {
  if (busy) return "…";
  return n ? `${word} · ${n}` : word;
}

/** Whether a row of the album list is what the roll shows: the first row while no album is
    chosen, otherwise the chosen album's own row. */
export function albumCurrent(index: number, rowId: string | null, currentId: string | null): boolean {
  return index === 0 ? currentId === null : currentId === rowId;
}

/** Seconds as m:ss, as the roll's film badge says them. */
export function mmss(s: number): string {
  const t = Math.max(0, Number.isFinite(s) ? s : 0);
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
}
