import { voiceSignature } from "./signature";
import { resolveLanguage } from "./writing-engine/resolve-language";
import { resources, tokenize, countMatches } from "./writing-engine/dictionaries";
import { baseline } from "./writing-engine/baselines";
import { bornRead } from "./writing-engine/aura/born-types";
import type { HatchRead } from "./writing-engine/types";

/* AsyncStorage is lazy-required only inside the two persistence functions so
   the pure scoring path (scoreNine/hatch) imports cleanly under plain node for
   tests — the rest of this file is model-free and deterministic. */
const AsyncStorage = () => require("@react-native-async-storage/async-storage").default;

/* THE HATCH ENGINE — product logic specification, owner's spec, Aug 2026.
   ────────────────────────────────────────────────────────────────────────
   Wren is not selected. Wren is GROWN from the user's writing DNA. During
   onboarding the user feeds 3–5 short thoughts to an egg; the hatch result
   is not a personality quiz, it is a reflection of how this person
   naturally thinks, feels and expresses themselves.

   This file is that system, whole: the nine dimensions (0–100, each with a
   LOCKED/GROWING confidence), the weighted identity blend, the archetype
   table with its poetic names, and the growth plan that says what unlocks
   as the letters pile up. Everything is deterministic, on-device, and
   computed from the text alone — no model, no server, no dice.

   It deliberately shares primitives with lib/voice.ts (voiceSignature) but
   is its OWN naming and scoring system: the Me tab's nine rows are a warm
   mirror for reading yourself; this is the genetics of the bird. */

/* ── the nine ─────────────────────────────────────────────────────────── */

export type DimKey =
  | "vocabulary"
  | "sentence"
  | "rhythm"
  | "emotion"
  | "perspective"
  | "function"
  | "punctuation"
  | "structure"
  | "quirks";

export interface DimScore {
  key: DimKey;
  icon: string;
  label: string;
  score: number; // 0..100
  locked: boolean; // enough evidence to trust it; false = still growing
  line: string; // the read, in warm words — never metric-speak
  chip: string; // the same read compressed to a card chip — alive, not canned
  sealed: string; // "Your hidden quirks" — how the growth list names it
}

export interface HatchResult {
  dims: DimScore[]; // all nine, locked first, then by score
  lockedCount: number;
  identity: number; // the weighted blend, 0..100
  archetype: Archetype;
  desc: string; // the archetype's one-liner
  born: HatchRead; // the first-impression born type + strongest early signals
}

/* The language-specific matchers (function words, affect, pronouns, abstract
   morphology, openers, quirks) now live in writing-engine/dictionaries; the
   two length dimensions read their per-language centre from baselines. English
   uses the shipped constants, so English output is unchanged. */

const clamp = (n: number) => Math.max(4, Math.min(98, Math.round(n)));

/** Score the nine from a set of short thoughts. Pure and deterministic. */
export function scoreNine(thoughts: string[]): DimScore[] {
  const texts = thoughts.map((t) => t.trim()).filter(Boolean);
  const all = texts.join("\n");
  const sig = voiceSignature(all);
  const words = Math.max(1, sig.words);
  const latin = all.match(/[A-Za-zÀ-ɏ']+/g) || [];
  const sents = all.split(/[.!?。！？\n]+/).filter((s) => s.trim().length);
  const lens = sents.map((s) => voiceSignature(s).words);
  const mean = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
  const varc = lens.length ? lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length : 0;

  // ANALYZE LOCALLY: resolve the language and read it with its own resources;
  // the two length dimensions normalize against that language's baseline.
  const lang = resolveLanguage(all);
  const res = resources(lang);
  const B = baseline(lang);
  const lower = all.toLowerCase();
  const toks = tokenize(all);
  const affectAll = res.emotionWords ?? [...res.affectPos, ...res.affectNeg];

  // vocabulary: uniqueness, concreteness, emotional reach
  const uniq = latin.length ? new Set(latin.map((w) => w.toLowerCase())).size / latin.length : 0;
  const avgLen = latin.length ? latin.reduce((a, w) => a + w.length, 0) / latin.length : 4;
  const abstractR = (all.match(res.abstract) || []).length / words;
  const emoHits = countMatches(lower, toks, affectAll);

  // sentence shape: length, fragments, pauses inside a line
  const frags = lens.filter((l) => l <= 3).length;
  const pausePerSent = sents.length ? sig.pauses / sents.length : 0;

  // rhythm: variance + whether consecutive sentences alternate length
  let swings = 0;
  for (let i = 1; i < lens.length; i++) if (Math.abs(lens[i] - lens[i - 1]) >= 5) swings++;

  // emotion: depth, contrast, ownership
  const contrast = countMatches(lower, toks, res.affectPos) > 0 && countMatches(lower, toks, res.affectNeg) > 0;
  const owned = res.ownedFrame.test(all);

  // perspective: introspection vs observation, and self-distance
  const inward = countMatches(lower, toks, res.firstPerson) / words;
  const outward = countMatches(lower, toks, res.outward) / words;
  const distance = res.distanceFrame.test(all);

  // function words: the small unconscious tells
  const hedges = countMatches(lower, toks, res.hedges);

  // punctuation fingerprint
  const commas = (all.match(/[,，]/g) || []).length;
  const dashes = (all.match(/[—–-]{1,2}/g) || []).length;
  const dots = (all.match(/(\.\.\.|…)/g) || []).length;
  const punctTotal = commas + dashes + dots + (all.match(/[.!?。！？]/g) || []).length;

  // structure: does a thought travel — detail openings, feeling endings
  const detailOpen = texts.filter((t) => res.detailOpeners.test(t.trim())).length;
  // NOTE (intentional bug fix): the shipped code called a GLOBAL regex's
  // .test() inside this filter, so its lastIndex advanced between thoughts and
  // it UNDERCOUNTED feeling-endings. Counting statelessly is correct; it can
  // nudge the structure dimension (and thus an archetype) up on some English
  // samples vs the old snapshot. Documented, not silent.
  const feelingEnd = texts.filter((t) => {
    const tail = t.split(/[.!?]/).slice(-2).join(" ");
    return countMatches(tail.toLowerCase(), tokenize(tail), affectAll) > 0;
  }).length;

  // quirks: personal signatures — shared, language-neutral tells plus the
  // resolved language's own (lowercase-i for en, particles for id, …)
  const q: string[] = [];
  if (dots >= 2) q.push("ellipses");
  if ((all.match(/[!！]/g) || []).length === 0 && words > 40) q.push("no-exclamation");
  if (/[\u{1F300}-\u{1FAFF}]/u.test(all)) q.push("emoji");
  if (hedges >= 3) q.push("soft-hedges");
  q.push(...res.quirks(all, toks));

  const dims: DimScore[] = [
    {
      key: "vocabulary",
      icon: "◆",
      label: "Vocabulary",
      // type-token ratio is ~1.0 on any short text, so it only counts once
      // there are enough words for repetition to be possible at all
      score: clamp(30 + uniq * 40 * Math.min(1, latin.length / 50) + (avgLen - B.wordLenCenter) * 11 + Math.min(14, emoHits * 4) + abstractR * 60),
      locked: latin.length >= 40,
      line: avgLen >= B.wordLenCopyThreshold || abstractR > 0.02 ? "You choose words that feel observed, not performed." : "You reach for the plain word, and it lands.",
      chip: avgLen >= B.wordLenCopyThreshold || abstractR > 0.02 ? "Observed, not performed" : "Plain words, well aimed",
      sealed: "the words only you choose",
    },
    {
      key: "sentence",
      icon: "▬",
      label: "Sentence Shape",
      score: clamp(34 + (mean - B.sentenceLenOffset) * 2.2 + pausePerSent * 16 + frags * 6),
      locked: sents.length >= 4,
      line: mean >= B.sentenceCopyThreshold ? "You let thoughts breathe instead of forcing conclusions." : "Short lines. You trust the reader to fill the rest.",
      chip: mean >= B.sentenceCopyThreshold ? "Long, breathing lines" : "Short, direct lines",
      sealed: "the shape your sentences take",
    },
    {
      key: "rhythm",
      icon: "∿",
      label: "Rhythm",
      score: clamp(28 + varc * 1.3 + swings * 12),
      locked: sents.length >= 5,
      line: swings >= 2 ? "Your writing moves like a conversation." : "One steady pace, held all the way through.",
      chip: swings >= 2 ? "Quick line, long line" : "One steady pace",
      sealed: "the rhythm hiding in your sentences",
    },
    {
      key: "emotion",
      icon: "♥",
      label: "Emotional Range",
      score: clamp(22 + emoHits * 9 + (contrast ? 22 : 0) + (owned ? 14 : 0)),
      locked: words >= 30,
      line: contrast ? "You hold two feelings at once without dropping either." : owned ? "You notice feelings before naming them." : "You keep the feeling under the words, where it hums.",
      chip: contrast ? "Two feelings at once" : owned ? "Names its feelings" : "Feeling kept low",
      sealed: "the feelings under your words",
    },
    {
      key: "perspective",
      icon: "◉",
      label: "Perspective",
      score: clamp(30 + inward * 200 + (distance ? 24 : 0) + outward * 90),
      locked: words >= 40,
      line: distance ? "You often look at yourself from the outside." : inward > outward ? "You write from the inside out." : "You watch the world first, then let it in.",
      chip: distance ? "Sees itself from outside" : inward > outward ? "Writes inside out" : "Watches the world first",
      sealed: "how you see the world",
    },
    {
      key: "function",
      icon: "∴",
      label: "Function Words",
      score: clamp(26 + hedges * 16),
      locked: words >= 50,
      line: hedges >= 2 ? "Your small words reveal hesitation and curiosity." : "No hedging — you commit to the sentence.",
      chip: hedges >= 2 ? "Maybes and almosts" : "Commits to the sentence",
      sealed: "the small words you lean on",
    },
    {
      key: "punctuation",
      icon: "❟",
      label: "Punctuation",
      score: clamp(24 + commas * 7 + dashes * 10 + dots * 12),
      locked: punctTotal >= 6,
      line: dots >= 1 || dashes >= 1 ? "You pause where most people rush." : commas >= 2 ? "Commas carry your breathing." : "Clean stops. No decoration.",
      chip: dots >= 1 || dashes >= 1 ? "Pauses on purpose" : commas >= 2 ? "Breathes in commas" : "Clean stops",
      sealed: "where you pause, and why",
    },
    {
      key: "structure",
      icon: "¶",
      label: "Structure",
      score: clamp(28 + detailOpen * 16 + feelingEnd * 16 + Math.min(20, texts.length * 5)),
      locked: texts.length >= 3,
      line: detailOpen >= 1 && feelingEnd >= 1 ? "You often start with a detail and arrive at a feeling." : "You open where the thought opens, no throat-clearing.",
      chip: detailOpen >= 1 && feelingEnd >= 1 ? "Detail, then feeling" : "No throat-clearing",
      sealed: "how your thoughts land",
    },
    {
      key: "quirks",
      icon: "✦",
      label: "Quirks",
      score: clamp(20 + q.length * 19),
      locked: q.length >= 2 || words >= 80,
      line: q.length ? "You have small ways of saying things that feel unmistakably yours." : "No tics yet — they show up as you relax.",
      chip: q.length ? q.slice(0, 2).join(", ") : "No tics yet",
      sealed: "the patterns nobody else has",
    },
  ];

  return dims;
}

/* ── the identity blend (owner's weights, verbatim) ───────────────────── */

/* The identity blend — our own weights, not the spec draft's. Ranked by how
   much each signal says about WHO IS WRITING rather than what mood they're
   in: quirks and perspective are identity (nobody else has your tics or your
   distance from yourself), emotion is closer to weather, and function words
   are the least ownable thing in a language. */
const WEIGHTS: Partial<Record<DimKey, number>> = {
  quirks: 0.18,
  perspective: 0.16,
  emotion: 0.14,
  rhythm: 0.12,
  punctuation: 0.1,
  vocabulary: 0.1,
  structure: 0.08,
  sentence: 0.07,
  function: 0.05,
};

export function identityScore(dims: DimScore[]): number {
  let sum = 0;
  for (const d of dims) sum += (WEIGHTS[d.key] ?? 0) * d.score;
  return Math.round(sum);
}

/* ── the naming system ────────────────────────────────────────────────── */

export interface Archetype {
  id: string;
  name: string;
  desc: string;
  /** affinity per dimension — the archetype is the best dot-product match,
      never a single-dimension verdict */
  aff: Partial<Record<DimKey, number>>;
  /** hour band that suits this spirit; a small boost, not a gate */
  hours?: [number, number]; // [from, to) in 24h, wrapping
}

/* The library — ours, and deliberately bigger than a starter six: twelve
   spirits so that two friends comparing hatch cards usually DON'T match,
   which is where the surprise lives. Every name stays in this product's
   world — letters, hours, margins, weather — and every description is a
   sentence you'd forgive on a birth certificate. */
export const ARCHETYPES: Archetype[] = [
  {
    id: "window-watcher",
    name: "The Window Watcher",
    desc: "You see whole lives in strangers' windows.",
    aff: { perspective: 3, vocabulary: 2, rhythm: 1 },
    hours: [5, 11],
  },
  {
    id: "night-courier",
    name: "The Night Courier",
    desc: "Your truest letters get written after midnight.",
    aff: { emotion: 3, structure: 2, sentence: 1 },
    hours: [23, 5],
  },
  {
    id: "pocket-archivist",
    name: "The Pocket Archivist",
    desc: "You keep small moments the way coats keep ticket stubs.",
    aff: { vocabulary: 3, structure: 2, quirks: 1 },
  },
  {
    id: "soft-cartographer",
    name: "The Soft Cartographer",
    desc: "You map feelings by walking their streets first.",
    aff: { structure: 3, perspective: 2, function: 1 },
  },
  {
    id: "static-listener",
    name: "The Static Listener",
    desc: "You hear what hums underneath ordinary noise.",
    aff: { punctuation: 3, quirks: 2, perspective: 1 },
    hours: [17, 23],
  },
  {
    id: "unsent-editor",
    name: "The Unsent Editor",
    desc: "You rewrite the thing ten times, then almost send it.",
    aff: { function: 3, sentence: 2, punctuation: 1 },
  },
  {
    id: "weather-reporter",
    name: "The Weather Reporter",
    desc: "You tell your inner weather like it's the morning news.",
    aff: { emotion: 3, rhythm: 2, vocabulary: 1 },
    hours: [11, 17],
  },
  {
    id: "ellipsis-keeper",
    name: "The Ellipsis Keeper",
    desc: "You leave doors open at the ends of sentences.",
    aff: { punctuation: 3, emotion: 1, quirks: 2 },
  },
  {
    id: "blunt-valentine",
    name: "The Blunt Valentine",
    desc: "You say it plain, and it still lands soft.",
    // defined by restraint: scored on inverted sentence/punctuation below
    aff: { emotion: 3, quirks: 1 },
  },
  {
    id: "slow-confetti",
    name: "The Slow Confetti",
    desc: "Your joy arrives in small bright pieces.",
    aff: { rhythm: 3, emotion: 2, quirks: 1 },
  },
  {
    id: "margin-scribbler",
    name: "The Margin Scribbler",
    desc: "Your best lines happen in the margins.",
    aff: { quirks: 3, sentence: 2, rhythm: 1 },
  },
  {
    id: "deep-diver",
    name: "The Deep Diver",
    desc: "You go down until the water gets quiet.",
    aff: { sentence: 3, perspective: 2, emotion: 2 },
  },
];

function inBand(h: number, [a, b]: [number, number]): boolean {
  return a <= b ? h >= a && h < b : h >= a || h < b;
}

/** Best-match archetype — weighted combination, never one dimension.
 *
 *  Matched on RANKS, not raw scores. The formulas above each have their own
 *  centre of gravity (a dimension whose formula runs hot would otherwise win
 *  every card — an early build sent six of seven test writers to the same
 *  archetype because short-text vocabulary ran high). Ranking the nine
 *  within the card first means an archetype matches the SHAPE of your
 *  profile — which dimensions lead for you — not the absolute numbers. */
export function matchArchetype(dims: DimScore[], when = new Date()): Archetype {
  const order = [...dims].sort((a, b) => b.score - a.score);
  const rank = Object.fromEntries(order.map((d, i) => [d.key, 9 - i])) as Record<DimKey, number>;
  const hour = when.getHours();
  let best: Archetype = ARCHETYPES[0];
  let bestScore = -Infinity;
  for (const a of ARCHETYPES) {
    let s = 0;
    let wsum = 0;
    for (const [k, w] of Object.entries(a.aff) as [DimKey, number][]) {
      s += rank[k] * w;
      wsum += w;
    }
    s = s / Math.max(1, wsum);
    // the minimalist earns points for restraint, not volume
    if (a.id === "blunt-valentine") s += (9 - rank.sentence) * 0.55 + (9 - rank.punctuation) * 0.3;
    if (a.hours && inBand(hour, a.hours)) s += 0.9;
    if (s > bestScore) {
      bestScore = s;
      best = a;
    }
  }
  return best;
}

/** the whole read, in one call */
export function hatch(thoughts: string[], when = new Date()): HatchResult {
  const dims = scoreNine(thoughts);
  const sorted = [...dims].sort((a, b) => Number(b.locked) - Number(a.locked) || b.score - a.score);
  const archetype = matchArchetype(dims, when);
  return {
    dims: sorted,
    lockedCount: dims.filter((d) => d.locked).length,
    identity: identityScore(dims),
    archetype,
    desc: archetype.desc,
    born: bornRead(dims, dims.filter((d) => d.locked).length),
  };
}

/* ── the growth plan ──────────────────────────────────────────────────────
   What the hatch starts, the letters finish. Stages are keyed on PIECES of
   writing (letters + journal pages), the same currency auraStageOf counts.
   Each stage says what it unlocks so the product can always answer "why
   should I write another one?" with something specific and true. */

export interface GrowthStage {
  at: number; // pieces required
  name: string;
  unlocks: string; // what becomes readable here
}

export const GROWTH_PLAN: GrowthStage[] = [
  { at: 0, name: "Hatchling", unlocks: "Your first read — four of nine dimensions, provisional." },
  { at: 3, name: "Nestling", unlocks: "Structure locks: how your thoughts open and land." },
  { at: 8, name: "Fledgling", unlocks: "Function words and quirks lock: your unconscious tells." },
  { at: 20, name: "Flier", unlocks: "All nine locked. Your archetype is confirmed or re-read." },
  { at: 50, name: "Companion", unlocks: "Your rare words surface — the ones only you reach for." },
  { at: 100, name: "Kindred", unlocks: "Fully formed. The archetype gains your writing hour as a crown." },
];

export function growthStage(pieces: number): GrowthStage {
  let cur = GROWTH_PLAN[0];
  for (const s of GROWTH_PLAN) if (pieces >= s.at) cur = s;
  return cur;
}

/* THE FIRST LETTER'S STAMP. Onboarding used to post every first letter with
   STARTER_STAMPS[0] — "Off my chest" — so someone writing about a good day
   got a confession stamp on it, and every newcomer's letter arrived in the
   pool wearing the same one. The stamp is the only topic label a reader sees
   before opening, so it has to come from the writer. The mood they picked is
   the most direct signal there is; the text is the fallback. */
export function starterStamp(mood: string | null, text: string): string {
  const M: Record<string, string> = {
    "in-love": "crush",
    shy: "crush",
    delighted: "growing",
    cheerful: "growing",
    excited: "growing",
    pleased: "ordinary",
    content: "ordinary",
    okay: "ordinary",
    calm: "ordinary",
    meh: "ordinary",
    sleepy: "cant-sleep",
    nervous: "cant-sleep",
    drained: "cant-sleep",
    heartbroken: "miss-someone",
    crying: "miss-someone",
    numb: "miss-someone",
  };
  if (mood && M[mood]) return M[mood];
  const t = text.toLowerCase();
  if (/\b(miss|missed|missing|gone|left)\b/.test(t)) return "miss-someone";
  if (/\b(sleep|awake|2am|3am|tonight|night)\b/.test(t)) return "cant-sleep";
  if (/\b(love|crush|him|her|they)\b/.test(t)) return "crush";
  if (/\b(better|proud|learned|growing|finally)\b/.test(t)) return "growing";
  return "off-chest";
}

/* ── persistence — the hatch is a moment; the identity is a record ────── */

const KEY = "kindredly_hatch_archetype";

export async function saveArchetype(id: string): Promise<void> {
  try {
    await AsyncStorage().setItem(KEY, id);
  } catch {
    /* never worth blocking a hatch */
  }
}

export async function getArchetype(): Promise<Archetype | null> {
  try {
    const id = await AsyncStorage().getItem(KEY);
    return ARCHETYPES.find((a) => a.id === id) || null;
  } catch {
    return null;
  }
}
