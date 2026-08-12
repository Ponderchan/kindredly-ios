import type { PoolLetter, ThreadSummary } from "../lib/db";
import type { JournalEntry } from "../lib/journal";

/* Sample post — a full desk for previewing the Letters tab before sign-in.
   Shown only in dev builds when there's no real data (see letters.tsx).
   Content mirrors the v20 prototype's seed letters. */

const H = 3600_000;
const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

export const DEMO_THREADS: ThreadSummary[] = [
  {
    id: "demo-wren",
    stamp: "off-chest",
    revealed: false,
    mine: 1,
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
    otherName: "Someone at Blackberry Row",
    other: "demo-blackberry",
    preview: "One more from you and Wren tells us each other's names. Strange to want that this much.",
    lastSenderMe: false,
    lastAt: now - 16 * H,
    theirReaction: "🫂", // they caught your last letter
  },
  {
    id: "demo-north",
    stamp: "overthinking",
    revealed: false,
    mine: 3,
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
    opening: string;
    openingFromMe: boolean;
    messages: { body: string; mine: boolean; date: string }[];
  }
> = {
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
    opening: "My mother sold the house last month. I found out from my sister.",
    openingFromMe: false,
    messages: [
      { body: "That's a particular kind of grief — losing a place while everyone insists nothing died.", mine: true, date: iso(90 * H) },
      { body: "Yes. Exactly that. Everyone keeps saying 'it's just a house.'", mine: false, date: iso(70 * H) },
      { body: "The kitchen table is what I'd miss. Ours had a burn mark shaped like Portugal.", mine: true, date: iso(50 * H) },
      { body: "Ours had initials under it. I checked before the viewing. Still there.", mine: false, date: iso(30 * H) },
      { body: "One more from you and Wren tells us each other's names. Strange to want that this much.", mine: false, date: iso(16 * H) },
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
    mediaUri: "",
    dur: 42,
  },
  {
    id: "demo-j-text2",
    date: iso(90 * H),
    type: "text",
    body: "Mum called. We talked about nothing for an hour. Nothing is my favourite thing to talk about with her.",
    mood: "in-love",
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
