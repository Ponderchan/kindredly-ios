/* THE ROLL HANDS THE PAGE ITS PICTURES — in memory, not in the URL.
   Nine file paths in a query string is a long, fragile line for a router
   to carry, and it was carried badly once. The picker leaves the list
   here and navigates; the page takes it on mount. One-shot on purpose:
   a second mount of the page starts blank. */
export type PickedPhoto = { uri: string; ratio: number };

let pending: PickedPhoto[] | null = null;

export function leavePickedPhotos(list: PickedPhoto[]): void {
  pending = list.slice(0, 9);
}

export function takePickedPhotos(): PickedPhoto[] | null {
  const p = pending;
  pending = null;
  return p;
}
