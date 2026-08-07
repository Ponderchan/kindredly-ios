/* The 8 journal/morning moods. IDs match the web backend's mood vocabulary
   (system.js) so a mood string round-trips web↔iOS; the color/bg are v20's
   designed palette (the visual blueprint). */

export type MoodId =
  | "calm"
  | "tender"
  | "restless"
  | "wistful"
  | "warm"
  | "distant"
  | "bright"
  | "heavy";

export interface Mood {
  id: MoodId;
  n: string;
  col: string;
  bg: string;
}

export const MOODS: Record<MoodId, Mood> = {
  calm: { id: "calm", n: "Calm", col: "#8FBBD9", bg: "#EBF3F8" },
  tender: { id: "tender", n: "Tender", col: "#F2A2B0", bg: "#FBEEF1" },
  restless: { id: "restless", n: "Restless", col: "#F0B84A", bg: "#FBF3DE" },
  wistful: { id: "wistful", n: "Wistful", col: "#B294D6", bg: "#F1EBF7" },
  warm: { id: "warm", n: "Warm", col: "#FF9A6B", bg: "#FBEBE0" },
  distant: { id: "distant", n: "Distant", col: "#7C8AA0", bg: "#E8ECEF" },
  bright: { id: "bright", n: "Bright", col: "#F5C64F", bg: "#FBF3D9" },
  heavy: { id: "heavy", n: "Heavy", col: "#5A5568", bg: "#E5E3EA" },
};

export const MOOD_IDS: MoodId[] = [
  "calm",
  "tender",
  "restless",
  "wistful",
  "warm",
  "distant",
  "bright",
  "heavy",
];

export const getMood = (id?: string | null): Mood =>
  (id && MOODS[id as MoodId]) || MOODS.calm;
