/* The Kindredly moods — 30 icons designed as colored shapes-with-faces
   (art in data/mood-art.ts). Colors/tones come from that design file.
   `n` = display name; `col` the shape color; `bg` a light plate tint;
   `tone` groups them for palettes. LEGACY_MOOD maps the original 8
   backend ids onto the nearest new id so old journal entries still render. */

export type MoodId =
  | "calm"
  | "numb"
  | "content"
  | "in-love"
  | "surprised"
  | "shocked"
  | "frustrated"
  | "stunned"
  | "cheerful"
  | "pleased"
  | "sleepy"
  | "irritable"
  | "amazed"
  | "angry"
  | "okay"
  | "heartbroken"
  | "grumpy"
  | "meh"
  | "smug"
  | "nervous"
  | "drained"
  | "crying"
  | "shy"
  | "mischievous"
  | "unimpressed"
  | "delighted"
  | "excited"
  | "mad"
  | "playful"
  | "over-it";

export type MoodTone = "soft" | "up" | "spark" | "edge" | "low" | "flat";
export interface Mood { id: MoodId; n: string; col: string; bg: string; tone: MoodTone }

export const MOODS: Record<MoodId, Mood> = {
  "calm": { id: "calm", n: "Calm", col: "#8FBBD9", bg: "#EFF5F9", tone: "soft" },
  "numb": { id: "numb", n: "Numb", col: "#9AA0AE", bg: "#F0F1F3", tone: "flat" },
  "content": { id: "content", n: "Content", col: "#F3B07A", bg: "#FDF3EC", tone: "soft" },
  "in-love": { id: "in-love", n: "In love", col: "#F2708F", bg: "#FDEAEF", tone: "up" },
  "surprised": { id: "surprised", n: "Surprised", col: "#5FC3D9", bg: "#E8F6F9", tone: "spark" },
  "shocked": { id: "shocked", n: "Shocked", col: "#3FA9D8", bg: "#E4F2F9", tone: "spark" },
  "frustrated": { id: "frustrated", n: "Frustrated", col: "#E4703F", bg: "#FBEAE4", tone: "edge" },
  "stunned": { id: "stunned", n: "Stunned", col: "#8C7BD8", bg: "#EEECF9", tone: "spark" },
  "cheerful": { id: "cheerful", n: "Cheerful", col: "#F6C445", bg: "#FDF6E4", tone: "up" },
  "pleased": { id: "pleased", n: "Pleased", col: "#F0A9B6", bg: "#FCF2F4", tone: "soft" },
  "sleepy": { id: "sleepy", n: "Sleepy", col: "#9C9BD6", bg: "#F1F1F9", tone: "soft" },
  "irritable": { id: "irritable", n: "Irritable", col: "#E0894A", bg: "#FAEEE5", tone: "edge" },
  "amazed": { id: "amazed", n: "Amazed", col: "#F5A93C", bg: "#FDF2E3", tone: "up" },
  "angry": { id: "angry", n: "Angry", col: "#D95440", bg: "#F9E7E4", tone: "edge" },
  "okay": { id: "okay", n: "Okay", col: "#A8B4A0", bg: "#F2F4F1", tone: "flat" },
  "heartbroken": { id: "heartbroken", n: "Heartbroken", col: "#B85670", bg: "#F5E7EA", tone: "low" },
  "grumpy": { id: "grumpy", n: "Grumpy", col: "#B9793F", bg: "#F5ECE4", tone: "edge" },
  "meh": { id: "meh", n: "Meh", col: "#A5A5A5", bg: "#F2F2F2", tone: "flat" },
  "smug": { id: "smug", n: "Smug", col: "#C98BD4", bg: "#F7EEF8", tone: "spark" },
  "nervous": { id: "nervous", n: "Nervous", col: "#7E9BC4", bg: "#ECF1F6", tone: "low" },
  "drained": { id: "drained", n: "Drained", col: "#8A8496", bg: "#EEEDF0", tone: "low" },
  "crying": { id: "crying", n: "Crying", col: "#5E86BE", bg: "#E8EEF5", tone: "low" },
  "shy": { id: "shy", n: "Shy", col: "#F4A0A8", bg: "#FDF1F2", tone: "soft" },
  "mischievous": { id: "mischievous", n: "Mischievous", col: "#B47CD8", bg: "#F4ECF9", tone: "spark" },
  "unimpressed": { id: "unimpressed", n: "Unimpressed", col: "#8E9AA8", bg: "#EFF0F2", tone: "edge" },
  "delighted": { id: "delighted", n: "Delighted", col: "#F7CE3F", bg: "#FDF8E4", tone: "up" },
  "excited": { id: "excited", n: "Excited", col: "#F3743F", bg: "#FDEBE4", tone: "up" },
  "mad": { id: "mad", n: "Mad", col: "#CE3F3F", bg: "#F8E4E4", tone: "edge" },
  "playful": { id: "playful", n: "Playful", col: "#5CC08E", bg: "#E8F6EF", tone: "up" },
  "over-it": { id: "over-it", n: "Over it", col: "#9B93A8", bg: "#F1EFF2", tone: "flat" },
};

export const MOOD_IDS: MoodId[] = [
  "calm", "numb", "content", "in-love", "surprised", "shocked", "frustrated", "stunned", "cheerful", "pleased", "sleepy", "irritable", "amazed", "angry", "okay", "heartbroken", "grumpy", "meh", "smug", "nervous", "drained", "crying", "shy", "mischievous", "unimpressed", "delighted", "excited", "mad", "playful", "over-it"
];

/* zh labels (parallel to MOODS) */
export const MOOD_ZH: Record<MoodId, string> = {
  "calm": "平静",
  "numb": "麻木",
  "content": "满足",
  "in-love": "心动",
  "surprised": "惊讶",
  "shocked": "震惊",
  "frustrated": "抓狂",
  "stunned": "错愕",
  "cheerful": "愉悦",
  "pleased": "惬意",
  "sleepy": "困倦",
  "irritable": "烦躁",
  "amazed": "惊叹",
  "angry": "生气",
  "okay": "还行",
  "heartbroken": "心碎",
  "grumpy": "不爽",
  "meh": "无感",
  "smug": "得意",
  "nervous": "忐忑",
  "drained": "疲惫",
  "crying": "大哭",
  "shy": "害羞",
  "mischievous": "窃喜",
  "unimpressed": "不满",
  "delighted": "大笑",
  "excited": "兴奋",
  "mad": "愤怒",
  "playful": "俏皮",
  "over-it": "无语",
};

/* original 8 backend ids → nearest new id (historical data only) */
export const LEGACY_MOOD: Record<string, MoodId> = {
  "tender": "in-love",
  "restless": "irritable",
  "wistful": "sleepy",
  "warm": "content",
  "distant": "numb",
  "bright": "cheerful",
  "heavy": "drained",
};

export const getMood = (id?: string | null): Mood => {
  if (!id) return MOODS.calm;
  if (MOODS[id as MoodId]) return MOODS[id as MoodId];
  const alias = LEGACY_MOOD[id];
  return (alias && MOODS[alias]) || MOODS.calm;
};
