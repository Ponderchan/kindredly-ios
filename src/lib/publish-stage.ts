import type { WrenStage } from "../components/WrenBird";

/* WHAT THE + OPENS, BY WHO IS PRESSING IT (Today 3d × 25b, design Prompt 8).
   ────────────────────────────────────────────────────────────────────────
   The tab bar's + is the publish entry, and it opens one of two ways:
   - "new": a bottom sheet where Wren asks which one tonight, with the two
     choices written out (a letter to a stranger, a diary note);
   - "returning": two round buttons, LETTER and NOTE, that pop from behind
     the + — someone who knows the app needs no explaining.

   A reader is "new" for their first week (signed up 7 days ago or less) OR
   while Wren is still a chick (egg or hatchling): a reader who has been
   around a while but never sent a letter still gets the words. Anything we
   can't read (no account date, a date that won't parse) is "new": the
   sheet explains more, so it is the safe side to be wrong on.

   Pure, so node can test it (publish-stage.test.ts). The React side is
   use-publish-stage.ts. */

export type PublishStage = "new" | "returning";

/** a reader is new for this many days after signing up */
export const NEW_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Which way the + opens for this reader. createdAt is the account's created_at
    (useAuth().user?.created_at); wrenStage is useWrenStage().stage (null until read). */
export function publishStage(a: { createdAt: string | null | undefined; now: number; wrenStage: WrenStage | null }): PublishStage {
  // still a chick: the egg or the hatchling
  if (a.wrenStage === "egg" || a.wrenStage === "hatch") return "new";
  if (!a.createdAt) return "new";
  const created = Date.parse(a.createdAt);
  if (!Number.isFinite(created)) return "new";
  // a date ahead of the clock (a phone set back) is still day one
  return a.now - created <= NEW_DAYS * DAY_MS ? "new" : "returning";
}
