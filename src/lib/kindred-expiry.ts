/* A KINDRED EXPIRES (owner, 2026-09-20).
   ────────────────────────────────────────────────────────────────────────
   Thirty days without a word in the room, either way, and the door
   closes: the room stays readable, the other side can still write in,
   but answering takes REKINDLE — which is First Class. On First Class no
   room ever expires. Nothing is stored for this: "expired" is a fact
   about the last message's date, so writing one line reopens the room by
   itself, and a lapsed fare closes the quiet ones again.

   An expired kindred does not hold one of the three free seats. */

export const EXPIRE_DAYS = 30;
const DAY = 86_400_000;

export const quietDays = (lastAt: number): number => Math.max(0, Math.floor((Date.now() - lastAt) / DAY));

export const isExpired = (lastAt: number, premium: boolean): boolean => !premium && Date.now() - lastAt > EXPIRE_DAYS * DAY;
