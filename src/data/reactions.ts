/* The one-tap reactions — a lighter answer than a letter. Five, curated for
   what people actually need to say back on Kindredly: held, felt, moved,
   with-you, hopeful. No 👍, no 😂-wall — this is a vent & support space. */

export interface Reaction {
  emoji: string;
  label: string; // what tapping it says
}

export const REACTIONS: Reaction[] = [
  { emoji: "💜", label: "felt this" },
  { emoji: "🫂", label: "holding you" },
  { emoji: "🥹", label: "this got me" },
  { emoji: "🕯", label: "sitting with you" },
  { emoji: "🌱", label: "rooting for you" },
];

export const reactionLabel = (emoji?: string | null): string | null =>
  REACTIONS.find((r) => r.emoji === emoji)?.label ?? null;
