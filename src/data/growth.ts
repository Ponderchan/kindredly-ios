/* Growth stamps — Kindredly's collectible achievements, drawn as postage
   stamps. Earned by the quiet things: writing, answering, keeping, staying.
   All conditions derive from local/product stats (no server changes). */

export interface GrowthStats {
  lettersSent: number; // messages you've written across threads
  reached: number; // threads you're part of
  gotReply: boolean;
  deepest: number; // most letters from you on one thread
  kindreds: number;
  keptN: number;
  journalN: number;
  driftN: number; // journal lines let drift
  voiceSent: boolean;
  day: number; // days carrying letters
}

export interface GrowthStamp {
  id: string;
  name: string;
  zh: string;
  emoji: string;
  color: string;
  desc: string; // the 邮票简介 line in the detail view
  earned: (s: GrowthStats) => boolean;
  progress?: (s: GrowthStats) => [number, number]; // current / target
}

export const GROWTH_STAMPS: GrowthStamp[] = [
  {
    id: "first-post",
    name: "First Letter",
    zh: "第一封信",
    emoji: "✉️",
    color: "#3A3AF5",
    desc: "You wrote to no one in particular — which takes more nerve than writing to someone. This one marks the day your first letter went down three streets.",
    earned: (s) => s.lettersSent >= 1 || s.reached >= 1,
  },
  {
    id: "first-echo",
    name: "First Echo",
    zh: "第一声回音",
    emoji: "📬",
    color: "#D66C3E",
    desc: "Somebody opened your letter and wrote back. A stranger's day now has a little of your handwriting in it.",
    earned: (s) => s.gotReply,
  },
  {
    id: "three-streets",
    name: "Three Streets",
    zh: "三条街",
    emoji: "🏘",
    color: "#2E7BAA",
    desc: "Three letters out into the world. Wren is starting to recognize your envelope before she reads the name.",
    earned: (s) => s.lettersSent >= 3,
    progress: (s) => [Math.min(3, s.lettersSent), 3],
  },
  {
    id: "five-deep",
    name: "Five Letters Deep",
    zh: "五封之约",
    emoji: "🕯",
    color: "#6B4F9E",
    desc: "Five letters back and forth with one stranger. This is the quiet threshold where names stop being kept from each other.",
    earned: (s) => s.deepest >= 5,
    progress: (s) => [Math.min(5, s.deepest), 5],
  },
  {
    id: "first-kindred",
    name: "First Kindred",
    zh: "第一位知己",
    emoji: "💜",
    color: "#C86E7A",
    desc: "You're no longer strangers. Somewhere out there, somebody knows your name because you earned it one letter at a time.",
    earned: (s) => s.kindreds >= 1,
  },
  {
    id: "steady-hand",
    name: "Steady Hand",
    zh: "执笔者",
    emoji: "✍️",
    color: "#4E5468",
    desc: "Ten letters written. Your rhythm is unmistakable now — Wren could pick your hand out of a thousand.",
    earned: (s) => s.lettersSent >= 10,
    progress: (s) => [Math.min(10, s.lettersSent), 10],
  },
  {
    id: "first-page",
    name: "First Page",
    zh: "第一页",
    emoji: "📖",
    color: "#6B8A48",
    desc: "You wrote a page nobody will ever read. That's not a small thing — it's the most honest kind of writing there is.",
    earned: (s) => s.journalN >= 1,
  },
  {
    id: "ten-pages",
    name: "Ten Pages",
    zh: "十页手记",
    emoji: "📚",
    color: "#B08A3E",
    desc: "Ten pages in the sealed room. The journal knows things about you now that the letters never will.",
    earned: (s) => s.journalN >= 10,
    progress: (s) => [Math.min(10, s.journalN), 10],
  },
  {
    id: "first-drift",
    name: "First Drift",
    zh: "第一次漂流",
    emoji: "🌊",
    color: "#1E948A",
    desc: "You let one line out of the sealed room. Tomorrow morning it might be the first thing a stranger reads.",
    earned: (s) => s.driftN >= 1,
  },
  {
    id: "keeper",
    name: "Keeper",
    zh: "守夜人",
    emoji: "🔖",
    color: "#9A6B3A",
    desc: "Five lines kept from cooling. Conversations get sealed away, but what you keep stays lit.",
    earned: (s) => s.keptN >= 5,
    progress: (s) => [Math.min(5, s.keptN), 5],
  },
  {
    id: "your-voice",
    name: "Your Voice",
    zh: "你的声音",
    emoji: "🎙",
    color: "#9E4A85",
    desc: "You sent your actual voice out there. Braver than ink — nobody can pretend a voice is somebody else's.",
    earned: (s) => s.voiceSent,
  },
  {
    id: "week-carrying",
    name: "A Week Carrying",
    zh: "七日邮差",
    emoji: "🗓",
    color: "#C6A21E",
    desc: "Seven days carrying letters. The post comes at eight, and you keep showing up for it.",
    earned: (s) => s.day >= 7,
    progress: (s) => [Math.min(7, s.day), 7],
  },
];
