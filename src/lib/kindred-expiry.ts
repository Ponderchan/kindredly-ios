/* A KINDRED EXPIRES (owner, 2026-09-20).
   ────────────────────────────────────────────────────────────────────────
   Thirty days without a word in the room, either way, and the door
   closes: the room stays readable, and writing in again takes REKINDLE —
   which is First Class. Each phone decides this for itself, so the other
   side can still write only if they are on First Class. On First Class no
   room ever expires. Nothing is stored for this: "expired" is a fact
   about the last message's date, so writing one line reopens the room by
   itself, and a lapsed fare closes the quiet ones again.

   An expired kindred does not hold one of the three free seats. */

export const EXPIRE_DAYS = 30;
const DAY = 86_400_000;

export const quietDays = (lastAt: number): number => Math.max(0, Math.floor((Date.now() - lastAt) / DAY));

export const isExpired = (lastAt: number, premium: boolean): boolean => !premium && Date.now() - lastAt > EXPIRE_DAYS * DAY;

/* CLOSING SOON (owner, 2026-10-10). The foot of the Kindreds list used to
   say the thirty-day rule to everyone, always. Now it is said where it is
   true: a room inside its last week says how long it has left, on its row
   and in the room. Whole days left, rounded UP — at 29.5 days quiet the
   room has half a day, which is "within a day", never "tomorrow". */
export const CLOSING_DAYS = 7;
export const daysLeft = (lastAt: number): number => Math.max(0, Math.ceil((lastAt + EXPIRE_DAYS * DAY - Date.now()) / DAY));
export const closingSoon = (lastAt: number, premium: boolean): boolean => !premium && !isExpired(lastAt, premium) && daysLeft(lastAt) <= CLOSING_DAYS;
