import type { PoolLetter, ThreadDetail, ThreadMessage, ThreadSummary } from "../lib/db";
import type { Fold } from "../lib/folds";
import type { WrenPost } from "../lib/wren-desk";
import type { JournalEntry } from "../lib/journal";

/* Sample post — a full desk for previewing the Letters tab before sign-in.
   Shown only in dev builds when there's no real data (see letters.tsx).
   Content mirrors the v20 prototype's seed letters.

   Type imports only: this file stays importable by plain node, so
   src/lib/thread-detail.test.ts can check every fixture against the rules
   the screens run on. */

const H = 3600_000;
const DAY = 24 * H;
const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

/** what a line taken back reads as (= TAKEN_BACK in lib/thread-detail-core,
    web 0031). A literal so this file needs no runtime import; the node
    test checks the two agree. */
export const DEMO_TAKEN_BACK = "(taken back)";
/* a correspondent who closed their account: 0009 nulls their side and
   lib/db hands that null through as `other` (typed string). The fixtures
   carry the same runtime value, so a gone face draws the veil mosaic. */
const GONE = null as unknown as string;

/** the store-mode set (App Store screenshots) and the dev desk's first rows.
    Kept exactly as it was — the state fixtures live in DEMO_STATE_THREADS. */
export const DEMO_THREADS: ThreadSummary[] = [
  {
    id: "demo-mira",
    stamp: "off-chest",
    revealed: true,
    mine: 6,
    theirs: 6,
    otherName: "Mira",
    otherFace: "f-cloud",
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
    theirs: 5,
    theirSigned: true,
    otherName: "Someone at Blackberry Row",
    other: "demo-blackberry",
    theirTexts: [
      "My mother sold the house last month. I found out from my sister, in a text, between two other texts about nothing at all.",
      "Yes. Exactly that. Everyone keeps saying it's just a house, as if a house were a small thing, as if I hadn't learned to read at that table.",
      "Ours had initials under it. I checked before the viewing. Still there — I don't know what I expected. That someone had sanded them off?",
      "I've enclosed my name with this one. No hurry — it keeps, and I'd rather you took your time than felt owed something.",
    ],
    preview: "I've enclosed my name with this one. No hurry — it keeps.",
    lastSenderMe: false,
    lastAt: now - 16 * H,
  },
  {
    /* the state the old `t.mine > 0` filter erased: a stranger answered your
       pool letter and you have not written back. Kept in the demo set so the
       row, the ring mark and the tab signal can never silently regress. */
    id: "demo-answered",
    stamp: "almosts",
    revealed: false,
    mine: 0,
    theirs: 1,
    otherName: null,
    other: "demo-answered",
    preview: "You wrote that you'd stopped waiting for it to feel like home. I've been in mine four years and it still doesn't.",
    lastSenderMe: false,
    lastAt: now - 5 * H,
  },
  {
    id: "demo-north",
    stamp: "overthinking",
    revealed: false,
    mine: 5,
    theirs: 5,
    otherName: "Someone up north",
    other: "demo-north",
    iSigned: true,
    theirTexts: [
      "No stake in the answer. That's the whole thing about strangers — I can tell you something true and you won't have to carry it into next Tuesday with me.",
      "Then you've already decided. You're just waiting for permission, and I don't think it's mine to give, but I'd give it if it counted for anything.",
      "Left law school in my last term. My mother still tells people I'm 'on a break.' Four years is a long break. I've stopped correcting her, which is its own answer.",
    ],
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
    preview: "It gets easier the third week. The bowl is the trick — wash it at night.",
    lastSenderMe: true,
    lastAt: now - 1 * H,
  },
];

/* ── fixture builders ───────────────────────────────────────────────── */

type MsgExtra = Partial<Omit<ThreadMessage, "body" | "mine" | "date">>;
/** one message, `ago` milliseconds back */
const msg = (id: string, mine: boolean, body: string, ago: number, extra: MsgExtra = {}): ThreadMessage => ({
  id,
  body,
  mine,
  date: iso(ago),
  kind: "text",
  ...extra,
});
const taken = (id: string, mine: boolean, ago: number): ThreadMessage =>
  msg(id, mine, DEMO_TAKEN_BACK, ago, { recalledAt: iso(ago - 60_000) });
const counts = (messages: ThreadMessage[]) => ({
  myCount: messages.filter((m) => m.mine).length,
  otherCount: messages.filter((m) => !m.mine).length,
});

/* ── the 300-message room (render windows, prepend anchoring) ──────── */

const LONG_LINES = [
  "morning. the kettle is the only thing awake in this house.",
  "same. mine has opinions about it.",
  "what are you reading this week?",
  "a book about lighthouses. I keep stopping to look up the keepers' names.",
  "that's the most you thing I've ever heard.",
  "is it? I'll take it.",
  "the bus driver waved at me today like we were old friends.\n\nwe are not. I've never seen him before.",
  "maybe you are now.",
  "it rained so hard the gutters sang.",
  "ok but did you dance",
  "obviously not. I stood under the awning like a sensible adult and thought about it.",
  "thinking about it counts. half.",
  "tell me one thing that went right today.",
  "the bread rose. first time in three tries.",
  "a triumph. frame it.",
  "I'm putting it on my CV.",
  "long day. no words left, just this: hi.",
  "hi. that's enough.",
  "do you ever reread old letters?",
  "only the ones I'm scared of.",
  "that's a whole letter in one line.",
  "I'll write you a proper one on sunday.",
  "I'll hold you to it.",
  "sunday came. here it is: I think I'm happier than I was in spring. I don't know when it happened. Probably somewhere between the bread and the lighthouses, and you were there for both.",
];
const LONG_N = 300;
function longRoomMessages(): ThreadMessage[] {
  // a tiny LCG, so the room is the same on every launch
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const span = 70 * DAY;
  const out: ThreadMessage[] = [];
  let mine = false;
  for (let i = 0; i < LONG_N; i++) {
    if (rnd() < 0.55) mine = !mine; // runs of one to a few, either side
    const ago = H + Math.round(((LONG_N - 1 - i) / (LONG_N - 1)) * span);
    out.push(msg(`demo-long-${i}`, i === LONG_N - 1 ? false : mine, LONG_LINES[(i * 5 + (mine ? 1 : 0)) % LONG_LINES.length], ago));
  }
  const quote = (i: number, of: number) => {
    const q = out[of];
    out[i] = { ...out[i], meta: { reply: { id: q.id!, excerpt: q.body.slice(0, 140), sender: q.mine ? "demo-me" : "demo-long" } }, replyMine: q.mine };
  };
  out[40] = { ...out[40], kind: "song", body: "Harvest Moon — https://open.spotify.com/track/demo-long", meta: { url: "https://open.spotify.com/track/demo-long", title: "Harvest Moon" } };
  quote(120, 118);
  out[150] = { ...out[150], body: DEMO_TAKEN_BACK, recalledAt: out[150].date };
  quote(200, 199);
  out[260] = { ...out[260], kind: "photo", body: "a tiny moment", meta: { url: "https://picsum.photos/seed/kindredly-long-room/900/1200" } };
  return out;
}
const LONG_MESSAGES = longRoomMessages();
const LONG_LAST = LONG_MESSAGES[LONG_MESSAGES.length - 1];

/* ── the room with every line kind: quotes, taken back, songs, a photo ── */

const JUNO_MESSAGES: ThreadMessage[] = [
  msg("demo-juno-1", false, "the radiator in my flat knocks like someone wants to come in.", 5 * DAY),
  msg("demo-juno-2", true, "let it in. what's the worst that happens, warm feet?", 5 * DAY - 2 * H),
  msg("demo-juno-3", false, "Pink Moon — https://open.spotify.com/track/demo-juno", 4 * DAY, { kind: "song", meta: { url: "https://open.spotify.com/track/demo-juno", title: "Pink Moon" } }),
  msg("demo-juno-4", true, "I have one of those. I named it Gerald.", 4 * DAY - H, {
    meta: { reply: { id: "demo-juno-1", excerpt: "the radiator in my flat knocks like someone wants to come in.", sender: "demo-juno" } },
    replyMine: false,
  }),
  taken("demo-juno-5", false, 3 * DAY),
  msg("demo-juno-6", false, "a tiny moment", 3 * DAY - H, { kind: "photo", meta: { url: "https://picsum.photos/seed/kindredly-juno-window/900/1200" } }),
  taken("demo-juno-7", true, 2 * DAY),
  msg("demo-juno-8", true, "sorry — that came out wrong. what I meant: Gerald says hi.", 2 * DAY - 10 * 60_000),
  msg("demo-juno-9", false, "tell Gerald the feeling is mutual.", 2 * DAY - H, {
    meta: { reply: { id: "demo-juno-8", excerpt: "sorry — that came out wrong. what I meant: Gerald says hi.", sender: "demo-me" } },
    replyMine: true,
  }),
  msg("demo-juno-10", true, "Motion Picture Soundtrack — https://youtu.be/demo-juno", DAY, { kind: "song", meta: { url: "https://youtu.be/demo-juno", title: "Motion Picture Soundtrack" } }),
  // quoted before it was taken back: the server empties the excerpt (0031)
  msg("demo-juno-11", false, "wait, what did the other one say?", DAY - 2 * H, {
    meta: { reply: { id: "demo-juno-7", excerpt: "", sender: "demo-me" } },
    replyMine: true,
  }),
  msg("demo-juno-12", false, "ok that one's going on the fridge.", 3 * H),
];

/* ── pen pals on the five-each-way road, one per band state ─────────── */

const YOUDONE_MESSAGES: ThreadMessage[] = [
  msg("demo-band-youdone-1", true, "Your letter about the night bus made me miss a city I've never lived in.", 120 * H),
  msg("demo-band-youdone-2", false, "That's the nicest thing anyone's said about the 47.", 110 * H),
  msg("demo-band-youdone-3", true, "Does the driver still hum? You said he hums.", 96 * H),
  msg("demo-band-youdone-4", false, "Every night. Tonight it was something like a hymn.", 80 * H),
  msg("demo-band-youdone-5", true, "I looked up hymns about buses. There are none. Someone should fix that.", 60 * H),
  msg("demo-band-youdone-6", false, "You write one, I'll get him to hum it.", 40 * H),
  msg("demo-band-youdone-7", true, "Deal. Verse one is mostly about the heater under the back seat.", 20 * H),
  msg("demo-band-youdone-8", true, "Verse two is about you. Don't worry, it's flattering.", 6 * H),
];
const THEYDONE_MESSAGES: ThreadMessage[] = [
  msg("demo-band-theydone-1", true, "I kept your stamp. The one with the kite.", 140 * H),
  msg("demo-band-theydone-2", false, "Good. It was the last one in the book.", 130 * H),
  msg("demo-band-theydone-3", false, "Also: I flew an actual kite today, for research.", 120 * H),
  msg("demo-band-theydone-4", false, "Research conclusion: wind is rude.", 100 * H),
  msg("demo-band-theydone-5", true, "Peer review: confirmed.", 70 * H),
  msg("demo-band-theydone-6", false, "Next experiment is a paper boat. Results by Friday.", 50 * H),
  msg("demo-band-theydone-7", false, "Results: the boat sank, the pond was unimpressed, I had a great time.", 9 * H),
];
const NAMES_MESSAGES: ThreadMessage[] = [
  msg("demo-band-names-1", true, "I'm the one who wrote back about the orange peel.", 200 * H),
  msg("demo-band-names-2", false, "In one piece, every time. I knew someone else did that.", 190 * H),
  msg("demo-band-names-3", true, "It's the only skill I'm sure of.", 170 * H),
  msg("demo-band-names-4", false, "Mine is parallel parking. Nobody believes me.", 150 * H),
  msg("demo-band-names-5", true, "I believe you. Strangers have no reason to lie about parking.", 120 * H),
  msg("demo-band-names-6", false, "That's why I like this. No reason to lie about anything.", 100 * H),
  msg("demo-band-names-7", true, "Five letters each, they say. Then names, if we want.", 70 * H),
  msg("demo-band-names-8", false, "I think I want.", 50 * H),
  msg("demo-band-names-9", true, "Me too. Whoever goes first, goes first.", 30 * H),
  msg("demo-band-names-10", false, "Then I'll let you think about it overnight.", 12 * H),
];

/* ── a quiet room, a closing room, the two who left, a voice opening ── */

const EXPIRED_MESSAGES: ThreadMessage[] = [
  msg("demo-expired-1", false, "the cherry tree outside work finally did the thing.", 40 * DAY),
  msg("demo-expired-2", true, "pictures or it didn't happen", 39 * DAY),
  msg("demo-expired-3", false, "it happened. you'll have to trust me.", 36 * DAY),
  msg("demo-expired-4", true, "I trust you. I'll write properly this weekend.", 34 * DAY),
];
const CLOSING_MESSAGES: ThreadMessage[] = [
  msg("demo-closing-1", true, "how did the interview go?", 30 * DAY),
  msg("demo-closing-2", false, "they asked my greatest weakness and I said 'crisps'.", 28 * DAY),
  msg("demo-closing-3", true, "honest. bold. hire her.", 27 * DAY),
  msg("demo-closing-4", false, "they did!! starting monday. I'll tell you everything.", 25 * DAY),
];
const GONE_KINDRED_MESSAGES: ThreadMessage[] = [
  msg("demo-gone-kindred-1", false, "I'm going to be away from everything for a while. I wanted you to know it isn't you.", 9 * DAY),
  msg("demo-gone-kindred-2", true, "Thank you for telling me. Take the time. I'll be here.", 9 * DAY - 3 * H),
  msg("demo-gone-kindred-3", false, "Your letters were the best part of this year. Keep writing to people.", 8 * DAY),
];
const GONE_PENPAL_MESSAGES: ThreadMessage[] = [
  msg("demo-gone-penpal-1", true, "Your letter about the lighthouse keeper's log stayed with me all week.", 6 * DAY),
  msg("demo-gone-penpal-2", false, "I'm glad. I copied it out by hand — it felt rude to photograph it.", 5 * DAY),
  msg("demo-gone-penpal-3", true, "What was the last entry?", 4 * DAY),
  msg("demo-gone-penpal-4", false, "'Light lit. Sea calm. All well.' Every day for thirty years.", 3 * DAY),
];
const VOICE_MESSAGES: ThreadMessage[] = [
  msg("demo-voice-1", true, "I played it twice. The bit about the tin of buttons — I had a grandmother with one of those.", 26 * H),
  msg("demo-voice-2", false, "Everyone's grandmother had one. I think it came with the job.", 14 * H),
  msg("demo-voice-3", true, "Mine let me sort them by colour when I was sad. Still the best cure I know.", 4 * H),
];
const ANSWERED_MESSAGES: ThreadMessage[] = [
  msg("demo-answered-1", false, "You wrote that you'd stopped waiting for it to feel like home. I've been in mine four years and it still doesn't.", 5 * H),
];

/** the dev-only rows for every state the screens must draw: the room with
    every line kind, a 300-message room, a quiet (expired) room, a closing
    room, a gone kindred and a gone pen pal, a voice opening, and the
    band's "you done" / "they done" / names-offered states. Not in store
    mode (see demoThreads). */
export const DEMO_STATE_THREADS: ThreadSummary[] = [
  {
    id: "demo-juno",
    stamp: "cant-sleep",
    revealed: true,
    mine: counts(JUNO_MESSAGES).myCount,
    theirs: counts(JUNO_MESSAGES).otherCount,
    otherName: "Juno",
    otherFace: "f-06-soft-spoken-poet",
    other: "demo-juno",
    preview: "ok that one's going on the fridge.",
    lastSenderMe: false,
    lastAt: now - 3 * H,
    revealedAt: now - 12 * DAY,
  },
  {
    id: "demo-long",
    stamp: "tiny-win",
    revealed: true,
    mine: counts(LONG_MESSAGES).myCount,
    theirs: counts(LONG_MESSAGES).otherCount,
    otherName: "Tamsin",
    otherFace: "f-little-moon",
    other: "demo-long",
    preview: LONG_LAST.body,
    lastSenderMe: false,
    lastAt: Date.parse(LONG_LAST.date),
    revealedAt: now - 72 * DAY,
  },
  {
    id: "demo-expired",
    stamp: "growing",
    revealed: true,
    mine: 2,
    theirs: 2,
    otherName: "Ren",
    otherFace: "f-grass",
    other: "demo-expired",
    preview: "I trust you. I'll write properly this weekend.",
    lastSenderMe: true,
    lastAt: now - 34 * DAY,
    revealedAt: now - 50 * DAY,
  },
  {
    id: "demo-closing",
    stamp: "tiny-win",
    revealed: true,
    mine: 2,
    theirs: 2,
    otherName: "Pia",
    otherFace: "f-apricot",
    other: "demo-closing",
    preview: "they did!! starting monday. I'll tell you everything.",
    lastSenderMe: false,
    lastAt: now - 25 * DAY,
    revealedAt: now - 45 * DAY,
  },
  {
    id: "demo-gone-kindred",
    stamp: "off-chest",
    revealed: true,
    mine: 1,
    theirs: 2,
    otherName: "Sol",
    otherFace: "f-honey", // a gone kindred keeps the face they gave at signing
    other: GONE,
    gone: true,
    preview: "Your letters were the best part of this year. Keep writing to people.",
    lastSenderMe: false,
    lastAt: now - 8 * DAY,
    revealedAt: now - 30 * DAY,
  },
  {
    id: "demo-gone-penpal",
    stamp: "overthinking",
    revealed: false,
    mine: 2,
    theirs: 2,
    otherName: null,
    other: GONE,
    gone: true,
    preview: "'Light lit. Sea calm. All well.' Every day for thirty years.",
    lastSenderMe: false,
    lastAt: now - 3 * DAY,
  },
  {
    id: "demo-voice",
    stamp: "miss-someone",
    revealed: false,
    mine: 2,
    theirs: 1,
    otherName: null,
    other: "demo-voice",
    letterId: "demo-p2",
    opening: "About my grandmother's kitchen",
    preview: "Mine let me sort them by colour when I was sad. Still the best cure I know.",
    lastSenderMe: true,
    lastAt: now - 4 * H,
  },
  {
    id: "demo-band-youdone",
    stamp: "cant-sleep",
    revealed: false,
    mine: 5,
    theirs: 3,
    otherName: null,
    other: "demo-band-youdone",
    preview: "Verse two is about you. Don't worry, it's flattering.",
    lastSenderMe: true,
    lastAt: now - 6 * H,
  },
  {
    id: "demo-band-theydone",
    stamp: "tiny-win",
    revealed: false,
    mine: 2,
    theirs: 5,
    otherName: null,
    other: "demo-band-theydone",
    preview: "Results: the boat sank, the pond was unimpressed, I had a great time.",
    lastSenderMe: false,
    lastAt: now - 9 * H,
  },
  {
    id: "demo-band-names",
    stamp: "almosts",
    revealed: false,
    mine: 5,
    theirs: 5,
    otherName: null,
    other: "demo-band-names",
    preview: "Then I'll let you think about it overnight.",
    lastSenderMe: false,
    lastAt: now - 12 * H,
  },
];

/* THE SIGNATURES ON THE DEMO KINDRED (identity Phase 2): lib/pen-signature penDemo("Mira") and
   penDemo("Rowan") written out as literals, so this file keeps its type-only imports. The ceremony
   and the kindred page draw them on the dev pages; src/lib/pen-signature.test.ts checks they are
   still exactly what penDemo makes. Never real data. */
export const DEMO_PEN_MIRA = { v: 1 as const, w: 1000 as const, h: 320 as const, s: [[112,230,130,227,146,219,160,207,169,194,173,181,173,171,170,164,165,163,160,167,156,176,155,187,159,200,167,212,179,222,195,228,213,230,231,228,247,223,260,216,269,208,273,200,274,191,270,184,265,180,260,180,257,184,256,191,260,201,268,212,281,221,296,228,314,230,332,227,348,220,361,209,371,195,375,180,376,168,372,159,367,155,362,157,358,165,358,177,361,192,369,206,382,219,397,227,415,230,433,227,449,219,463,207,472,193,476,179,476,168,473,161,468,160,463,164,459,173,458,185,462,198,470,211,483,221,498,228,516,230,534,228,550,222,563,214,572,206,577,198,577,192,568,185,563,185,560,188,559,195,563,203,571,213,583,222,599,228,617,230],[92,256,274,262,365,261,455,256,637,238],[253,123]] };
export const DEMO_PEN_ME = { v: 1 as const, w: 1000 as const, h: 320 as const, s: [[164,230,181,228,197,220,209,208,217,193,220,177,219,162,215,151,209,145,203,146,200,153,200,166,204,182,213,200,226,215,242,226,260,230,277,226,293,214,305,197,312,176,315,154,314,136,310,124,304,119,299,123,295,135,296,153,300,175,309,196,322,214,338,226,356,230,373,226,389,215,401,199,408,180,411,162,410,148,406,140,401,139,395,145,392,157,392,173,397,190,405,206,418,219,434,227,452,230,469,228,485,221,497,210,505,197,508,182,507,168,503,157,497,151,492,152,488,158,488,170,492,185,501,202,514,216,530,226,548,230,565,226,581,215,593,198,600,177,603,156,602,138,598,125,592,120,587,124,583,135,584,153,588,175,597,196,610,214,626,226,644,230],[144,256,317,262,404,261,491,256,664,238],[298,89]] };

/* canned conversations for the sample threads (thread/[id] falls back to
   these for demo- ids so browsing the preview isn't a dead end). Every
   pen pal's counts match its messages, so the band and the five-each-way
   road read true; the opening letter is not a message and is not counted. */
export const DEMO_DETAILS: Record<string, ThreadDetail> = {
  "demo-mira": {
    stamp: "off-chest",
    revealed: true,
    otherName: "Mira",
    otherFace: "f-cloud",
    other: "demo-mira",
    myCount: 6,
    otherCount: 6,
    // what each side was given at the reveal (web 0035): her drawn name, and yours as she received it
    otherSig: DEMO_PEN_MIRA,
    mySig: DEMO_PEN_ME,
    mySignedName: "Rowan",
    mySignedFace: "m-anchor",
    iSigned: true,
    theirSigned: true,
    since: iso(200 * H),
    revealedAt: iso(100 * H),
    openingAt: iso(210 * H),
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
    otherCount: 5,
    theirSigned: true,
    since: iso(100 * H),
    openingAt: iso(110 * H),
    opening: "My mother sold the house last month. I found out from my sister.",
    openingFromMe: false,
    messages: [
      { body: "That's a particular kind of grief — losing a place while everyone insists nothing died.", mine: true, date: iso(100 * H) },
      { body: "Yes. Exactly that. Everyone keeps saying 'it's just a house.'", mine: false, date: iso(90 * H) },
      { body: "The kitchen table is what I'd miss. Ours had a burn mark shaped like Portugal.", mine: true, date: iso(80 * H) },
      { body: "Ours had initials under it. I checked before the viewing. Still there.", mine: false, date: iso(70 * H) },
      { body: "Whose initials?", mine: true, date: iso(60 * H) },
      { body: "Mine and my brother's. We were seven and nine and very proud of the knife.", mine: false, date: iso(50 * H) },
      { body: "Then part of you is still in that kitchen. That's not nothing.", mine: true, date: iso(40 * H) },
      { body: "I hadn't thought of it like that. Thank you for that one.", mine: false, date: iso(30 * H) },
      { body: "Write me when the new owners repaint. I want to know if they find it.", mine: true, date: iso(24 * H) },
      { body: "I've enclosed my name with this one. No hurry — it keeps.", mine: false, date: iso(16 * H) },
    ],
  },
  "demo-north": {
    stamp: "overthinking",
    revealed: false,
    otherName: "Someone up north",
    other: "demo-north",
    iSigned: true,
    // 5 and 5: the sign door's "you went first" state needs both sides full
    myCount: 5,
    otherCount: 5,
    since: iso(100 * H),
    openingAt: iso(120 * H),
    // letter papers (0041): the opening came on Airmail (the reader draws it there; replies are plain)
    openingPaper: "airmail",
    opening: "No stake in the answer. That's the whole thing about strangers.",
    openingFromMe: false,
    messages: [
      { body: "That's why I can say this here: I don't think I want the job I've been chasing for two years.", mine: true, date: iso(100 * H) },
      { body: "Then you've already decided. You're just waiting for permission.", mine: false, date: iso(90 * H) },
      { body: "You sound like someone who's done this exact thing.", mine: true, date: iso(80 * H) },
      { body: "I walked away from something once. I'll tell you mine if you tell me yours.", mine: false, date: iso(70 * H) },
      { body: "Do you regret it?", mine: true, date: iso(64 * H) },
      { body: "Only on Sundays, and only for an hour. Then I remember the library at 2am and I'm fine.", mine: false, date: iso(58 * H) },
      { body: "I told my manager today. My hands shook the whole time.", mine: true, date: iso(52 * H) },
      { body: "Shaking hands still count. Proud of you, stranger.", mine: false, date: iso(46 * H) },
      { body: "I've enclosed my name. Whenever you're ready.", mine: true, date: iso(44 * H) },
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
    // letter papers (0041): the opening came on Kraft
    openingPaper: "kraft",
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
  // someone answered MY pool letter: the opening is mine, their reply is the one message
  "demo-answered": {
    stamp: "almosts",
    revealed: false,
    otherName: null,
    other: "demo-answered",
    ...counts(ANSWERED_MESSAGES),
    since: iso(5 * H),
    openingAt: iso(30 * H),
    letterId: "demo-my-letter",
    opening: "I've stopped waiting for this flat to feel like home. Maybe that's what home is — the place you stop waiting in.",
    openingFromMe: true,
    messages: ANSWERED_MESSAGES,
  },
  "demo-juno": {
    stamp: "cant-sleep",
    revealed: true,
    otherName: "Juno",
    otherFace: "f-06-soft-spoken-poet",
    other: "demo-juno",
    ...counts(JUNO_MESSAGES),
    iSigned: true,
    theirSigned: true,
    since: iso(20 * DAY),
    revealedAt: iso(12 * DAY),
    openingAt: iso(21 * DAY),
    opening: "Nobody tells you the worst part of insomnia is how loud the fridge gets.",
    openingFromMe: false,
    messages: JUNO_MESSAGES,
  },
  "demo-long": {
    stamp: "tiny-win",
    revealed: true,
    otherName: "Tamsin",
    otherFace: "f-little-moon",
    other: "demo-long",
    ...counts(LONG_MESSAGES),
    iSigned: true,
    theirSigned: true,
    since: iso(71 * DAY),
    revealedAt: iso(60 * DAY),
    openingAt: iso(72 * DAY),
    opening: "I fixed the wobbly chair today. Nobody will ever know how much that meant.",
    openingFromMe: false,
    messages: LONG_MESSAGES,
  },
  "demo-expired": {
    stamp: "growing",
    revealed: true,
    otherName: "Ren",
    otherFace: "f-grass",
    other: "demo-expired",
    ...counts(EXPIRED_MESSAGES),
    iSigned: true,
    theirSigned: true,
    since: iso(60 * DAY),
    revealedAt: iso(50 * DAY),
    openingAt: iso(61 * DAY),
    opening: "Spring is late here. I've started taking it personally.",
    openingFromMe: false,
    messages: EXPIRED_MESSAGES,
  },
  "demo-closing": {
    stamp: "tiny-win",
    revealed: true,
    otherName: "Pia",
    otherFace: "f-apricot",
    other: "demo-closing",
    ...counts(CLOSING_MESSAGES),
    iSigned: true,
    theirSigned: true,
    since: iso(55 * DAY),
    revealedAt: iso(45 * DAY),
    openingAt: iso(56 * DAY),
    opening: "I have an interview on Thursday and I've already rehearsed the handshake forty times.",
    openingFromMe: false,
    messages: CLOSING_MESSAGES,
  },
  "demo-gone-kindred": {
    stamp: "off-chest",
    revealed: true,
    otherName: "Sol",
    otherFace: "f-honey",
    other: GONE,
    gone: true,
    ...counts(GONE_KINDRED_MESSAGES),
    iSigned: true,
    theirSigned: true,
    since: iso(40 * DAY),
    revealedAt: iso(30 * DAY),
    openingAt: iso(41 * DAY),
    opening: "I write letters I never send. This is the first one I'm sending.",
    openingFromMe: false,
    messages: GONE_KINDRED_MESSAGES,
  },
  "demo-gone-penpal": {
    stamp: "overthinking",
    revealed: false,
    otherName: null,
    other: GONE,
    gone: true,
    ...counts(GONE_PENPAL_MESSAGES),
    since: iso(6 * DAY),
    openingAt: null, // the letter went with its writer's account: no date to show
    opening: "My grandfather kept a lighthouse log. I found it in a box of his shirts.",
    openingFromMe: false,
    messages: GONE_PENPAL_MESSAGES,
  },
  // known bug 2: a voice opening with replies after it — the card must stay
  "demo-voice": {
    stamp: "miss-someone",
    revealed: false,
    otherName: null,
    other: "demo-voice",
    ...counts(VOICE_MESSAGES),
    since: iso(26 * H),
    openingAt: iso(30 * H),
    letterId: "demo-p2",
    opening: "About my grandmother's kitchen",
    openingFromMe: false,
    openingMedia: "demo/voice.m4a",
    openingDurationS: 74,
    messages: VOICE_MESSAGES,
  },
  "demo-band-youdone": {
    stamp: "cant-sleep",
    revealed: false,
    otherName: null,
    other: "demo-band-youdone",
    ...counts(YOUDONE_MESSAGES),
    since: iso(120 * H),
    openingAt: iso(130 * H),
    opening: "The night bus driver hums. I've never told anyone that I wait for his route on purpose.",
    openingFromMe: false,
    messages: YOUDONE_MESSAGES,
  },
  "demo-band-theydone": {
    stamp: "tiny-win",
    revealed: false,
    otherName: null,
    other: "demo-band-theydone",
    ...counts(THEYDONE_MESSAGES),
    since: iso(140 * H),
    openingAt: iso(150 * H),
    opening: "I bought a book of stamps just to have a reason to write to someone.",
    openingFromMe: false,
    messages: THEYDONE_MESSAGES,
  },
  "demo-band-names": {
    stamp: "almosts",
    revealed: false,
    otherName: null,
    other: "demo-band-names",
    ...counts(NAMES_MESSAGES),
    since: iso(200 * H),
    openingAt: iso(210 * H),
    opening: "I peel oranges in one piece. It's the only thing I do perfectly.",
    openingFromMe: false,
    messages: NAMES_MESSAGES,
  },
};

/* the folds a demo room shows — every state the room can draw */
export const DEMO_FOLDS: Record<string, Fold[]> = {
  // the set the room has always shown on demo-mira
  "demo-mira": [
    { id: "df-1", mine: false, kind: "note", prompt: null, parentId: null, body: null, date: iso(60 * H) },
    { id: "df-2", mine: true, kind: "question", prompt: "the song you replay and never post?", parentId: null, body: "the one i sent you, obviously", date: iso(50 * H) },
    { id: "df-3", mine: true, kind: "note", prompt: null, parentId: null, body: "i almost moved home in march.", date: iso(40 * H) },
    { id: "df-4", mine: false, kind: "note", prompt: null, parentId: "df-3", body: "i almost didn't move here at all.", date: iso(39 * H) },
  ],
  "demo-juno": [
    // theirs, sealed until I fold one back
    { id: "dj-1", mine: false, kind: "note", prompt: null, parentId: null, body: null, date: iso(4 * DAY + H) },
    // my question, my answer sealed with it, waiting on theirs
    { id: "dj-2", mine: true, kind: "question", prompt: "the smallest thing that ruins your whole day?", parentId: null, body: "a wet sock. every time.", date: iso(3 * DAY + H) },
    // their question: the prompt shows, their answer doesn't
    { id: "dj-3", mine: false, kind: "question", prompt: "what did you want to be at nine?", parentId: null, body: null, date: iso(2 * DAY + 2 * H) },
    // an opened pair of notes
    { id: "dj-4", mine: false, kind: "note", prompt: null, parentId: null, body: "i still sleep with the hall light on.", date: iso(2 * DAY - 3 * H) },
    { id: "dj-5", mine: true, kind: "note", prompt: null, parentId: "dj-4", body: "me too. don't tell anyone.", date: iso(DAY + 4 * H) },
    // an opened question
    { id: "dj-6", mine: true, kind: "question", prompt: "a song you'd never admit to loving?", parentId: null, body: "Mr. Brightside, sincerely.", date: iso(DAY) },
    { id: "dj-7", mine: false, kind: "question", prompt: null, parentId: "dj-6", body: "anything by ABBA. all of it.", date: iso(10 * H) },
  ],
};

/** a seeded room-seen ledger (thread id → their count you have seen), so
    the Kindreds unread badge has something to show: unreadOf() reads 0 for
    a room never opened. Merge UNDER the real ledger — withDemoRoomSeen —
    so opening the room clears it as it would for real. */
export const DEMO_ROOM_SEEN: Record<string, number> = {
  "demo-mira": 4,
  "demo-juno": counts(JUNO_MESSAGES).otherCount - 2,
  "demo-long": counts(LONG_MESSAGES).otherCount - 3,
};
/** the real ledger with the demo seeds under it (real entries win) */
export const withDemoRoomSeen = (ledger: Record<string, number>): Record<string, number> => ({ ...DEMO_ROOM_SEEN, ...ledger });

/** the dev desk's rows: the store-mode set alone in store mode, otherwise
    it plus every state fixture */
export const demoThreads = (opts: { store: boolean }): ThreadSummary[] =>
  opts.store ? DEMO_THREADS : [...DEMO_THREADS, ...DEMO_STATE_THREADS];

/* A DEV SWITCH FOR THE LISTS (critic): a dev build swaps an empty account
   for the demo rows, so the empty state and the offline-with-nothing-kept
   state could never be seen on a simulator. A screen's dev link can set
   this; in-memory, dev only, reset on reload. */
export type DemoListMode = "demo" | "empty" | "offline";
let listMode: DemoListMode = "demo";
/** what the dev lists should show in place of an empty account */
export const demoListMode = (): DemoListMode => listMode;
export const setDemoListMode = (m: DemoListMode): void => {
  listMode = m;
};

/** a demo media path → a playable address (a demo path is not in storage) */
export const DEMO_MEDIA: Record<string, string> = {
  "demo/voice.m4a": "https://download.samplelib.com/mp3/sample-6s.mp3",
};
export const demoMediaUrl = (path: string | null | undefined): string | null => (path ? DEMO_MEDIA[path] ?? null : null);

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
    other: letter.author || "demo-ghost", // demo authors always exist; belt for the type
    myCount: 1,
    otherCount: 0,
    since: iso(0),
    openingAt: letter.created_at,
    letterId: letter.id,
    opening: letter.body,
    openingFromMe: false,
    openingMedia: letter.kind === "voice" ? letter.media_path ?? null : null,
    openingDurationS: letter.kind === "voice" ? letter.duration_s ?? null : null,
    messages: [{ id: `${id}-m0`, body: reply, mine: true, date: iso(0), kind: "text" }],
  };
  return id;
}

/**
 * The fixture for a demo thread id (a seeded reply first, then
 * DEMO_DETAILS), with every message given a stable id (`<thread>-m<i>`)
 * where the fixture has none, so menus, quotes and render windows key on
 * something. null when there is no such fixture — useThreadDetail reads
 * that as 'missing'.
 */
export function demoDetail(id: string): ThreadDetail | null {
  const d = SEEDED_DEMO[id] ?? DEMO_DETAILS[id];
  if (!d) return null;
  return { ...d, messages: d.messages.map((m, i) => (m.id ? m : { ...m, id: `${id}-m${i}` })) };
}
/** the demo folds of a thread ([] when it has none) */
export const demoFolds = (id: string): Fold[] => DEMO_FOLDS[id] ?? [];

/* sample journal pages — shows every card form (dev only, listed after the
   real entries; read-only, can't be deleted or drifted).
   THE STORE-MODE SET, kept exactly as it was: store mode shows every entry
   here, and its words come translated from dev-store's DEMO_TEXT by id
   ((tabs)/journal.tsx STORE_BODY) — a page added here would put an English
   (or a wordless) card and an extra calendar month into the App Store
   Notes shots in every language. The state pages live in
   DEMO_STATE_JOURNAL; a screen lists them through demoJournal(). */
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

/* the journal's state pages (dev only, never in store mode): the card
   forms the store set lacks — a photo page with one photo, a photo page
   and a voice page with no words, a one-word page — across more mood
   groups, and pages weeks back (one over a month back, so the calendar
   crosses a month boundary). Same rules as DEMO_JOURNAL (read-only,
   can't be deleted or drifted). */
export const DEMO_STATE_JOURNAL: JournalEntry[] = [
  {
    id: "demo-j-photo-one",
    date: iso(6 * DAY + 3 * H),
    type: "photo",
    body: "Found a four-leaf clover. Didn't pick it. Let someone else have the luck.",
    mood: "pleased",
    media: ["https://picsum.photos/seed/kindredly-clover/1000/1250"],
    coverIndex: 0,
    mediaUri: "https://picsum.photos/seed/kindredly-clover/1000/1250",
  },
  {
    id: "demo-j-photo-bare",
    date: iso(9 * DAY + 5 * H),
    type: "photo",
    body: "",
    mood: "surprised",
    media: ["https://picsum.photos/seed/kindredly-fog/1200/900", "https://picsum.photos/seed/kindredly-bridge/900/1200"],
    coverIndex: 1,
    mediaUri: "https://picsum.photos/seed/kindredly-bridge/900/1200",
  },
  {
    id: "demo-j-voice-bare",
    date: iso(12 * DAY + 2 * H),
    type: "voice",
    body: "",
    mood: "nervous",
    mediaUri: "https://download.samplelib.com/mp3/sample-6s.mp3",
    dur: 6,
  },
  {
    id: "demo-j-short",
    date: iso(15 * DAY + 8 * H),
    type: "text",
    body: "ok.",
    mood: "okay",
  },
  {
    id: "demo-j-edge",
    date: iso(18 * DAY + 1 * H),
    type: "text",
    body: "Missed the train by four seconds. Watched it leave like it owed me money.",
    mood: "frustrated",
  },
  {
    id: "demo-j-lastmonth",
    date: iso(36 * DAY + 6 * H),
    type: "text",
    body: "Packed his mug last. Couldn't decide if it was mine to keep.",
    mood: "heartbroken",
  },
];

/** the dev journal pages: the store-mode set alone in store mode, otherwise
    it plus every state page (the same split as demoThreads). A lookup by id
    (the page, a day) passes `store: false` so every demo page opens. */
export const demoJournal = (opts: { store: boolean }): JournalEntry[] =>
  opts.store ? DEMO_JOURNAL : [...DEMO_JOURNAL, ...DEMO_STATE_JOURNAL];

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

/* WREN'S DESK, in the simulator, before 0023 has anything in it: two posts
   so the room and its row have something to be. Dev only — the screen
   falls back to these only when the fetch itself fails. */
export const DEMO_WREN_POSTS: WrenPost[] = [
  {
    id: 1,
    kind: "note",
    body: "Welcome. I'm Wren, the courier — I carry every letter here. This is where I'll tell you when something in Kindredly changes, and where you can write to the people who make it.",
    i18n: null,
    link: null,
    at: iso(3 * 24 * H),
    media: null,
  },
  {
    id: 2,
    kind: "update",
    body: "Long letters now fold on the Today card. One word unfolds them.",
    i18n: null,
    link: null,
    at: iso(5 * H),
    media: null,
  },
];
