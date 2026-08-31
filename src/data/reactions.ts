/* ONE TAP, ONE POSTAL FACT. This was five curated feelings — a menu of ways
   to not write back, in a letters product where writing back is the whole
   funnel. A tap can only say something a tap can honestly mean, and there is
   exactly one such thing here: "read it — a reply is on its way." It doesn't
   compete with the letter; it buys the letter time. The same line works in
   both directions, promise and notice, so it is one key.

   Legacy reactions (💜 🫂 🥹 🕯 🌱) still live in the table; reactionLabel
   returns null for them and every surface already falls back gracefully. */

import { t } from "../lib/i18n";

export interface Reaction {
  emoji: string;
  key: string; // catalog key for what tapping it says
}

export const ON_WAY: Reaction = { emoji: "✍️", key: "rx.onWay" };

export const REACTIONS: Reaction[] = [ON_WAY];

export const reactionLabel = (emoji?: string | null): string | null => {
  const r = REACTIONS.find((x) => x.emoji === emoji);
  return r ? t(r.key) : null;
};
