/* The one-tap reactions — a lighter answer than a letter. Five, curated for
   what people actually need to say back on Kindredly: held, felt, moved,
   with-you, hopeful. No 👍, no 😂-wall — this is a vent & support space. */

import { t } from "../lib/i18n";

export interface Reaction {
  emoji: string;
  key: string; // catalog key for what tapping it says
}

export const REACTIONS: Reaction[] = [
  { emoji: "💜", key: "rx.felt" },
  { emoji: "🫂", key: "rx.holding" },
  { emoji: "🥹", key: "rx.gotMe" },
  { emoji: "🕯", key: "rx.sitting" },
  { emoji: "🌱", key: "rx.rooting" },
];

export const reactionLabel = (emoji?: string | null): string | null => {
  const r = REACTIONS.find((x) => x.emoji === emoji);
  return r ? t(r.key) : null;
};
