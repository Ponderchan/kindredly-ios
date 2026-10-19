/* THE ROLL HANDS THE PAGE WHAT WAS PICKED — in memory, not in the URL.
   Nine file paths in a query string is a long, fragile line for a router
   to carry, and it was carried badly once. The picker leaves the pick
   here and navigates; the page takes it when it comes into focus. One-
   shot on purpose: a second mount of the page starts blank.

   Two directions: the roll → the page (pictures, or one film), and the
   page → the roll (the pictures already on the page, so + ADD can merge
   rather than replace). */
export type PickedPhoto = { uri: string; ratio: number };
export type Picked = { photos: PickedPhoto[] } | { video: { uri: string; duration: number } };

let pending: Picked | null = null;
let kept: PickedPhoto[] | null = null;

export function leavePicked(p: Picked): void {
  pending = "photos" in p ? { photos: p.photos.slice(0, 9) } : p;
}
export function takePicked(): Picked | null {
  const p = pending;
  pending = null;
  return p;
}

/** the page tells the roll what it already holds, before asking for more */
export function leaveKept(list: PickedPhoto[]): void {
  kept = list.slice(0, 9);
}
export function takeKept(): PickedPhoto[] {
  const k = kept || [];
  kept = null;
  return k;
}

/* HER QUESTION, HANDED TO THE PAGE (push step two). Tapping her evening
   line or the Sunday look-back opens a fresh Notes page with that line as
   the empty page's placeholder — never as the body. Same one-shot handoff
   as the pictures; stale after a few minutes, so a tap that ended on the
   roll and was abandoned doesn't haunt a page written hours later. */
const SPARK_TTL_MS = 10 * 60 * 1000;
let spark: { text: string; at: number } | null = null;

export function leaveSpark(text: string): void {
  spark = { text, at: Date.now() };
}
export function takeSpark(): string | null {
  const s = spark;
  spark = null;
  return s && Date.now() - s.at < SPARK_TTL_MS ? s.text : null;
}

/* THE MOOD, HANDED TO THE PAGE (Notes E1, 2026-10-19). The empty Notes page asks "how was today,
   honestly?"; the mood tapped there arrives on the composer already chosen, beside its follow-up
   question (the spark above). Same one-shot, same TTL: a tap abandoned on the way doesn't choose
   the mood of a page written hours later. A stored mood id (moods.ts MoodId: "group-calm" …). */
let mood: { id: string; at: number } | null = null;

export function leaveMood(id: string): void {
  mood = { id, at: Date.now() };
}
export function takeMood(): string | null {
  const m = mood;
  mood = null;
  return m && Date.now() - m.at < SPARK_TTL_MS ? m.id : null;
}
