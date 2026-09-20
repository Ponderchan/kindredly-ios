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
