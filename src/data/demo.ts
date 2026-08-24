import type { PoolLetter, ThreadDetail, ThreadSummary } from "../lib/db";
import type { JournalEntry } from "../lib/journal";

/* Sample post — a full desk for previewing the Letters tab before sign-in.
   Shown only in dev builds when there's no real data (see letters.tsx).
   Content mirrors the v20 prototype's seed letters. */

const H = 3600_000;
const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

export const DEMO_THREADS: ThreadSummary[] = [
  {
    id: "demo-mira",
    stamp: "off-chest",
    revealed: true,
    mine: 6,
    theirs: 6,
    otherName: "Mira",
    other: "demo-mira",
    preview: "I kept your line about the fridge hum. I read it twice on the bus.",
    lastSenderMe: false,
    lastAt: now - 2 * H,
  },
  {
    id: "demo-wren",
    stamp: "off-chest",
    revealed: false,
    mine: 1,
    theirs: 1,
    otherName: "Someone at the door",
    other: "demo-wren",
    preview: "You answered the one at your door. That tells me more than any form would.",
    lastSenderMe: false,
    lastAt: now - 2 * H,
  },
  {
    id: "demo-blackberry",
    stamp: "never-told",
    revealed: false,
    mine: 5,
    theirs: 4,
    theirSigned: true,
    otherName: "Someone at Blackberry Row",
    other: "demo-blackberry",
    preview: "I've enclosed my name with this one. No hurry — it keeps.",
    lastSenderMe: false,
    lastAt: now - 16 * H,
    theirReaction: "🫂", // they caught your last letter
  },
  {
    id: "demo-north",
    stamp: "overthinking",
    revealed: false,
    mine: 3,
    theirs: 2,
    otherName: "Someone up north",
    other: "demo-north",
    preview: "Left law school in my last term. My mother still tells people I'm 'on a break.'",
    lastSenderMe: false,
    lastAt: now - 40 * H,
  },
  {
    id: "demo-quiet",
    stamp: "growing",
    revealed: false,
    mine: 1,
    theirs: 1,
    otherName: "A quiet correspondent",
    other: "demo-quiet",
    preview: "I moved cities three weeks ago and I still haven't unpacked the box marked KITCHEN.",
    lastSenderMe: false,
    lastAt: now - 26 * H,
  },
  {
    id: "demo-sent",
    stamp: "growing",
    revealed: false,
    mine: 1,
    theirs: 0,
    otherName: null,
    other: "demo-sent",
    preview: "You: It gets easier the third week. The bowl is the trick — wash it at night.",
    lastSenderMe: true,
    lastAt: now - 1 * H,
  },
];

/* canned conversations for the sample threads (thread/[id] falls back to
   these for demo- ids so browsing the preview isn't a dead end). */
export const DEMO_DETAILS: Record<
  string,
  {
    stamp: string;
    revealed: boolean;
    otherName: string | null;
    other: string;
    myCount: number;
    otherCount: number;
    iSigned?: boolean;
    theirSigned?: boolean;
    opening: string;
    openingFromMe: boolean;
    messages: { body: string; mine: boolean; date: string }[];
  }
> = {
  "demo-mira": {
    stamp: "off-chest",
    revealed: true,
    otherName: "Mira",
    other: "demo-mira",
    myCount: 6,
    otherCount: 6,
    opening: "I read your fridge line twice on the way to bed last night. It felt like something I might have written.",
    openingFromMe: false,
    messages: [
      { body: "Really? That means a lot. It was one of those 2AM thoughts that make more sense in the dark.", mine: true, date: iso(80 * H) },
      { body: "I get that. Darkness is honest. What keeps you up at 2AM?", mine: false, date: iso(64 * H) },
      { body: "letter no. 5 — okay. if we're doing this: the box marked KITCHEN. still not unpacked.", mine: true, date: iso(30 * H) },
      { body: "so it turns out we both kept the box unpacked. solidarity.", mine: false, date: iso(2 * H) },
    ],
  },
  "demo-wren": {
    stamp: "off-chest",
    revealed: false,
    otherName: "Wren",
    other: "demo-wren",
    myCount: 1,
    otherCount: 1,
    opening:
      "You answered the one at your door. That tells me more than any form would.\n\nI read the way you wrote back — plainly, without performing. The post will suit you. Three streets are open tonight; write when something is true, not when it's polished.",
    openingFromMe: false,
    messages: [
      { body: "Thank you. I wasn't sure anyone was actually reading.", mine: true, date: iso(2 * H) },
    ],
  },
  "demo-blackberry": {
    stamp: "never-told",
    revealed: false,
    otherName: "Someone at Blackberry Row",
    other: "demo-blackberry",
    myCount: 5,
    otherCount: 4,
    theirSigned: true,
    opening: "My mother sold the house last month. I found out from my sister.",
    openingFromMe: false,
    messages: [
      { body: "That's a particular kind of grief — losing a place while everyone insists nothing died.", mine: true, date: iso(90 * H) },
      { body: "Yes. Exactly that. Everyone keeps saying 'it's just a house.'", mine: false, date: iso(70 * H) },
      { body: "The kitchen table is what I'd miss. Ours had a burn mark shaped like Portugal.", mine: true, date: iso(50 * H) },
      { body: "Ours had initials under it. I checked before the viewing. Still there.", mine: false, date: iso(30 * H) },
      { body: "I've enclosed my name with this one. No hurry — it keeps.", mine: false, date: iso(16 * H) },
    ],
  },
  "demo-north": {
    stamp: "overthinking",
    revealed: false,
    otherName: "Someone up north",
    other: "demo-north",
    myCount: 3,
    otherCount: 3,
    opening: "No stake in the answer. That's the whole thing about strangers.",
    openingFromMe: false,
    messages: [
      { body: "That's why I can say this here: I don't think I want the job I've been chasing for two years.", mine: true, date: iso(80 * H) },
      { body: "Then you've already decided. You're just waiting for permission.", mine: false, date: iso(64 * H) },
      { body: "You sound like someone who's done this exact thing.", mine: true, date: iso(48 * H) },
      { body: "Left law school in my last term. My mother still tells people I'm 'on a break.'", mine: false, date: iso(40 * H) },
    ],
  },
  "demo-quiet": {
    stamp: "growing",
    revealed: false,
    otherName: "A quiet correspondent",
    other: "demo-quiet",
    myCount: 1,
    otherCount: 1,
    opening:
      "I moved cities three weeks ago and I still haven't unpacked the box marked KITCHEN. I've been eating standing up, out of the one bowl I bothered to find.\n\nI think I'm waiting to be sure I'm staying before I let myself arrive.",
    openingFromMe: false,
    messages: [
      { body: "It gets easier the third week. The bowl is the trick — wash it at night, and morning feels less like camping.", mine: true, date: iso(26 * H) },
    ],
  },
  "demo-sent": {
    stamp: "growing",
    revealed: false,
    otherName: null,
    other: "demo-sent",
    myCount: 1,
    otherCount: 0,
    opening: "It gets easier the third week. The bowl is the trick — wash it at night.",
    openingFromMe: true,
    messages: [],
  },
};

/* Ephemeral demo threads — seeded the moment you reply to a sample pool letter,
   so the whole loop (read a stranger → write back → a thread opens) closes on
   the simulator without a real backend. Dev-only, in-memory (cleared on reload;
   demo authors aren't real users, so replyToLetter can't persist them). */
export const SEEDED_DEMO: Record<string, ThreadDetail> = {};

export function seedDemoThread(letter: PoolLetter, reply: string): string {
  const id = `demo-seed-${letter.id}`;
  SEEDED_DEMO[id] = {
    stamp: letter.stamp,
    revealed: false,
    otherName: null,
    other: letter.author,
    myCount: 1,
    otherCount: 1,
    opening: letter.body,
    openingFromMe: false,
    openingMedia: letter.kind === "voice" ? letter.media_path ?? null : null,
    openingDurationS: letter.kind === "voice" ? letter.duration_s ?? null : null,
    messages: [{ body: reply, mine: true, date: iso(0) }],
  };
  return id;
}

/* sample journal pages — shows every card form (dev only, listed after the
   real entries; read-only, can't be deleted or drifted). */
export const DEMO_JOURNAL: JournalEntry[] = [
  {
    id: "demo-j-photo",
    date: iso(20 * H),
    type: "photo",
    body: "The light hit the kitchen wall like this for exactly four minutes.",
    mood: "content",
    media: [
      "https://picsum.photos/seed/kindredly-kitchen/900/1125",
      "https://picsum.photos/seed/kindredly-window/1200/800",
      "https://picsum.photos/seed/kindredly-cup/1000/1000",
      "https://picsum.photos/seed/kindredly-street/1000/1250",
      "https://picsum.photos/seed/kindredly-tree/900/900",
      "https://picsum.photos/seed/kindredly-sky/1200/900",
      "https://picsum.photos/seed/kindredly-door/800/1000",
      "https://picsum.photos/seed/kindredly-cat/1000/800",
    ],
    coverIndex: 0,
    mediaUri: "https://picsum.photos/seed/kindredly-kitchen/900/1125",
  },
  {
    id: "demo-j-text1",
    date: iso(44 * H),
    type: "text",
    body: "I said no to something today and the world did not end. I keep checking. It really didn't.",
    mood: "cheerful",
    driftedLine: "I said no to something today and the world did not end.",
  },
  {
    id: "demo-j-voice",
    date: iso(70 * H),
    type: "voice",
    body: "3am thoughts, recorded so I'd stop thinking them.",
    mood: "drained",
    mediaUri: "https://download.samplelib.com/mp3/sample-6s.mp3",
    dur: 42,
  },
  {
    id: "demo-j-text2",
    date: iso(90 * H),
    type: "text",
    body: "Mum called. We talked about nothing for an hour. Nothing is my favourite thing to talk about with her.",
    mood: "in-love",
  },
  {
    id: "demo-j-long",
    date: iso(4 * H),
    type: "text",
    body: "在新的研究中，研究团队将数十年来对蚂蚁运动的观察，与已有的社会激活理论结合起来，建立了一个计算机模型。在这个模型中，蚂蚁之间的互动能够随着它们的运动自然产生，模型中的运动参数直接来自实验测量，包括蚂蚁的移动速度、蚁群密度，以及它们能够感知附近同伴的距离等。我读到这里的时候是凌晨两点，忽然觉得：这周的我大概就处在不应期，静止，暂时无法被激活，但那不是失败，只是一种需要的休息。",
    mood: "sleepy",
  },
  {
    id: "demo-j-video",
    date: iso(112 * H),
    type: "video",
    body: "the sea did that thing again. filmed it so i'd believe it later.",
    mood: "calm",
    mediaUri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    dur: 15,
  },
];

export const DEMO_POOL: PoolLetter[] = [
  {
    id: "demo-p1",
    author: "demo-a1",
    stamp: "cant-sleep",
    body: "It's 2am and I'm listening to the dishwasher because it sounds like rain.",
    lang: "en",
    created_at: iso(3 * H),
    kind: "text",
    media_path: null,
    duration_s: null,
  },
  {
    id: "demo-p2",
    author: "demo-a2",
    stamp: "miss-someone",
    body: "About my grandmother's kitchen",
    lang: "en",
    created_at: iso(5 * H),
    kind: "voice",
    media_path: "demo/voice.m4a",
    duration_s: 74,
  },
  {
    id: "demo-p3",
    author: "demo-a3",
    stamp: "tiny-win",
    body: "I fixed the wobbly chair today. Nobody will ever know how much that meant.",
    lang: "en",
    created_at: iso(9 * H),
    kind: "text",
    media_path: null,
    duration_s: null,
  },
];
