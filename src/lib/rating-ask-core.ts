import { surfaceOn, type SurfaceMap } from "./surfaces-resolve";

/* THE RATING ASK, ITS RULES (owner, 2026-11-01). Pure, node-tested (rating-ask-core.test.ts);
   lib/rating-ask is the React Native glue and screens/today/TodayRatingAsk the host.

   We had zero ratings. Two asks, one per reader, picked at random the first time and kept:
     A  "letter": a letter from Mark, the founder, carried by Wren like any other
     B  "review": Wren's performance review, nervous, with the reader's real numbers
   Both open the App Store's write-a-review page (Apple's guideline 5.6.1: no stars of our own, no
   reward for a rating; the system's requestReview can't say whether it showed, the page always
   opens). Which one converts is read from the events: rating_ask_shown / rating_ask_tapped /
   rating_ask_later, each with { variant, moment }.

   WHEN: only right after a good moment — a reply came (reply), a kindred was made (kindred), a real
   monthly report was read (report). The moment arms the ask; Today shows it at its next calm.
   Never twice in a reader's life after "Leave us a star" / "Vouch for Wren"; after Not now, quiet
   for SNOOZE_DAYS; at most MAX_ASKS ever; never a second time the same day. An armed moment older
   than ARMED_FOR_MS is let go (the good feeling has passed). */

export type RatingVariant = "letter" | "review";
export type RatingMoment = "reply" | "kindred" | "report";

export type RatingState = {
  variant: RatingVariant | null;
  /** epoch ms of each time the ask was on screen */
  shown: number[];
  /** tapped through to the App Store: never again */
  done: boolean;
  /** Not now: nothing before this (epoch ms) */
  quietUntil: number;
  /** the moment waiting for Today's next calm, and when it came */
  armed: { moment: RatingMoment; at: number } | null;
};

export const MAX_ASKS = 3;
export const SNOOZE_DAYS = 60;
export const ARMED_FOR_MS = 2 * 86400_000;
const DAY = 86400_000;

/** the remote switch (app_surfaces 'ratingask'): ON unless a row turns it off */
export const RATING_SURFACE = "ratingask";
const RATING_DEFAULT: SurfaceMap = { [RATING_SURFACE]: true };
export function ratingAskOn(remote: SurfaceMap | null): boolean {
  return surfaceOn(remote, RATING_DEFAULT, RATING_SURFACE);
}

export const emptyRating = (): RatingState => ({ variant: null, shown: [], done: false, quietUntil: 0, armed: null });

/** the kept record, or a fresh one for anything torn */
export function parseRating(raw: string | null): RatingState {
  if (!raw) return emptyRating();
  try {
    const r = JSON.parse(raw) as Partial<RatingState> | null;
    if (!r || typeof r !== "object") return emptyRating();
    const variant = r.variant === "letter" || r.variant === "review" ? r.variant : null;
    const shown = Array.isArray(r.shown) ? r.shown.filter((n): n is number => typeof n === "number") : [];
    const a = r.armed as { moment?: unknown; at?: unknown } | null | undefined;
    const armed =
      a && (a.moment === "reply" || a.moment === "kindred" || a.moment === "report") && typeof a.at === "number" ? { moment: a.moment as RatingMoment, at: a.at } : null;
    return { variant, shown, done: r.done === true, quietUntil: typeof r.quietUntil === "number" ? r.quietUntil : 0, armed };
  } catch {
    return emptyRating();
  }
}

/** the variant, picked once from a number in [0, 1) */
export function withVariant(s: RatingState, rand: number): RatingState {
  return s.variant ? s : { ...s, variant: rand < 0.5 ? "letter" : "review" };
}

/** whether this reader could be asked at all right now (the moment aside) */
export function askable(s: RatingState, now: number): boolean {
  if (s.done || s.shown.length >= MAX_ASKS || now < s.quietUntil) return false;
  const last = s.shown.length ? s.shown[s.shown.length - 1] : 0;
  return now - last >= DAY;
}

/** a good moment happened: armed, unless this reader can't be asked (a newer moment replaces an older one) */
export function arm(s: RatingState, moment: RatingMoment, now: number): RatingState {
  if (!askable(s, now)) return s;
  return { ...s, armed: { moment, at: now } };
}

/** Today may show it now */
export function ratingDue(s: RatingState, now: number): boolean {
  return !!s.armed && now - s.armed.at <= ARMED_FOR_MS && askable(s, now);
}

/** it reached the screen */
export function markShown(s: RatingState, now: number): RatingState {
  return { ...s, shown: [...s.shown, now], armed: null };
}

/** the App Store was opened from it */
export function markTapped(s: RatingState): RatingState {
  return { ...s, done: true, armed: null };
}

/** Not now */
export function markLater(s: RatingState, now: number): RatingState {
  return { ...s, quietUntil: now + SNOOZE_DAYS * DAY, armed: null };
}
