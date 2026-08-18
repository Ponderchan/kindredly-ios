/* Your Voice (文心) — how you write, read from what you've actually written.
   "Writing fingerprint" stays an internal term; the user-facing concept is
   Your Voice. Nine signals (vocabulary · syntax · punctuation · rhythm ·
   structure · function words · emotion · quirks · formatting), each described
   in Wren's register — observant, warm, never a grade. All local heuristics
   over real user text; the server "voice" job ([[/api/wren]]) deepens the
   summary when it's reachable and falls back silently when it isn't.
   Evidence rule: strength grows with how much writing exists — never a strong
   claim from one line. */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadJournal } from "./journal";
import { voiceSignature } from "./signature";

export interface VoiceRow {
  key: string;
  glyph: string; // a small typographic mark, not an icon font
  title: string;
  line: string;
  strength: number; // 1..5 dots
  /* Whether there is enough writing for this dimension to have been read AT
     ALL, which is not the same as a low strength. Five of the nine need
     volume — word choice needs a vocabulary to average, flow and rhythm need
     several sentences to compare, little words needs a few hundred words,
     shape needs more than one piece. On a first letter only four can honestly
     say anything, and a card that prints all nine as if it knew is the kind
     of lie that makes the whole read feel generated. The hatch card shows the
     unread ones empty on purpose — an incomplete set the writing fills in. */
  read: boolean;
}
export interface AuraTrait {
  icon: string;
  label: string;
  sub: string; // shown once the aura is fully formed
  short: string; // two-word form for the share card
}
export type AuraTier = "empty" | "evolving" | "formed";
export const FORMED_AT = 100; // "Known" — the aura is fully formed

/* ── the growth ladder (owner's spec) — how well Wren knows you, by volume.
   Shown as "N LETTERS · <line>"; zh kept beside each for localization. */
export interface AuraStage {
  name: string; // Seed / Spark / Forming / Emerging / Clear / Known
  line: string; // Wren's words for this stretch
  zh: string;
}
export function auraStageOf(pieces: number): AuraStage {
  if (pieces > 100) return { name: "Known", line: "Wren knows your voice", zh: "Wren 已经认出你的文心" };
  if (pieces > 50) return { name: "Clear", line: "Your voice is becoming clear", zh: "你的声音越来越清晰" };
  if (pieces > 20) return { name: "Emerging", line: "Wren is learning your rhythm", zh: "Wren 正在懂你的节奏" };
  if (pieces >= 8) return { name: "Forming", line: "Your aura is forming", zh: "你的文心正在成形" };
  if (pieces >= 3) return { name: "Spark", line: "A little spark appeared", zh: "文心开始有了光" };
  return { name: "Seed", line: "Wren is listening", zh: "Wren 正在倾听" };
}

export interface VoiceRead {
  rows: VoiceRow[];
  chips: string[];
  traits: AuraTrait[]; // the aura's three trait lines, icon-led
  tier: AuraTier;
  stage: AuraStage; // where on the growth ladder this hand is
  discovery: string; // the latest thing Wren noticed — evidence-based, rotates as you write
  lead: string; // the opening line of your little portrait, in Wren's voice
  quote: string; // Wren's pull-quote (local; the AI upgrade may replace it)
  pieces: number; // how many pieces of writing this is based on
  taking: string; // footer line for the card
}

/** the aura's name — evolving: from the hand's shape; fully formed: the born
 *  type crowned with the writer's hour ("The Midnight Storyteller"). */
export function auraName(read: VoiceRead, typeName: string | null, hour: string | null): string {
  if (read.tier === "formed") {
    const word = (typeName || "Writer").replace(/^The\s+/i, "");
    const prefix =
      hour === "23:00 – 05:00" ? "Midnight" : hour === "05:00 – 11:00" ? "Morning" : hour === "17:00 – 23:00" ? "Dusk" : hour === "11:00 – 17:00" ? "Daylight" : "Quiet";
    return `The ${prefix} ${word}`;
  }
  const long = read.chips[0] === "unhurried thoughts";
  const paused = read.chips[2] === "soft pauses";
  if (long && paused) return "The Patient Wordsmith";
  if (long) return "The Steady Stream";
  if (paused) return "The Quiet Observer";
  return "The Quick Spark";
}

/** every piece of the user's own writing we can read on-device. */
export async function gatherWriting(firstLine?: string | null): Promise<string[]> {
  const out: string[] = [];
  if (firstLine && firstLine.trim().length >= 3) out.push(firstLine.trim());
  try {
    const journal = await loadJournal();
    for (const e of journal) {
      if (e.id.startsWith("demo-")) continue;
      if (e.body && e.body.trim().length >= 3) out.push(e.body.trim());
    }
  } catch {
    /* sealed room unreadable — fine */
  }
  return out;
}

const FUNCTION_WORDS =
  /\b(the|a|an|and|but|or|so|of|in|on|at|to|for|with|about|as|that|this|it|i|you|we|they|is|are|was|were|be|been|just|really|very|kind of|sort of|maybe)\b/gi;
const EMOTION_WORDS =
  /(feel|felt|love|miss|hate|scared|happy|sad|tired|angry|lonely|hope|hurt|glad|开心|难过|想念|害怕|累|爱|恨|孤独|希望)/i;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

/** deterministic read of the nine signals from real text. */
export function analyzeVoice(texts: string[]): VoiceRead {
  const pieces = texts.length;
  const all = texts.join("\n\n");
  const sig = voiceSignature(all);
  const words = Math.max(1, sig.words);
  const sents = all.split(/[.!?。！？\n]+/).filter((s) => s.trim().length);
  const sentLens = sents.map((s) => voiceSignature(s).words);
  const mean = sentLens.length ? sentLens.reduce((a, b) => a + b, 0) / sentLens.length : 0;
  const varc = sentLens.length ? sentLens.reduce((a, b) => a + (b - mean) ** 2, 0) / sentLens.length : 0;

  const latinWords = all.match(/[A-Za-zÀ-ɏ]+/g) || [];
  const avgWordLen = latinWords.length ? latinWords.reduce((a, w) => a + w.length, 0) / latinWords.length : 4;
  const punctDensity = sig.pauses / words;
  const exclaims = (all.match(/[!！]/g) || []).length;
  const ellipses = (all.match(/(\.\.\.|…)/g) || []).length;
  const lowerI = (all.match(/\bi(?=['\s,.])/g) || []).length; // lowercase "i"
  const funcRatio = (all.match(FUNCTION_WORDS) || []).length / words;
  const emotional = EMOTION_WORDS.test(all);
  const emoji = EMOJI.test(all);
  const blocks = texts.filter((t) => t.includes("\n")).length;

  // evidence rule → base confidence from how much writing exists
  const base = pieces >= 6 ? 4 : pieces >= 3 ? 3 : pieces >= 1 ? 2 : 1;
  const s = (extra: boolean) => Math.min(5, base + (extra ? 1 : 0));

  const long = sig.sentenceLen > 13;
  const paused = punctDensity > 0.08;

  const quirks: string[] = [];
  if (lowerI >= 2) quirks.push("lowercase i");
  if (ellipses >= 2) quirks.push("ellipses");
  if (exclaims === 0 && words > 40) quirks.push("no exclamation");
  if (emoji) quirks.push("the odd emoji");

  const rows: VoiceRow[] = [
    {
      key: "vocab",
      glyph: "Aa",
      title: "Word Choice",
      line: avgWordLen < 5.2 ? "You reach for simple, concrete words." : "You reach for the longer, exact word.",
      strength: s(latinWords.length > 120),
      read: latinWords.length >= 25,
    },
    {
      key: "syntax",
      glyph: "—",
      title: "Sentence Style",
      line: long ? "You let a sentence run when the thought needs it." : "You like short, direct sentences.",
      strength: s(sents.length > 12),
      read: words >= 8,
    },
    {
      key: "rhythm",
      glyph: "~",
      title: "Rhythm",
      line: varc > 22 ? "You shift between quick lines and longer runs." : paused ? "A steady pace, with little pauses." : "Quick thoughts. Few pauses.",
      strength: s(sents.length > 8),
      read: sents.length >= 2,
    },
    {
      key: "punct",
      glyph: ";",
      title: "Punctuation",
      line: paused ? "Commas and dashes — you leave room to breathe." : "Light on punctuation. You keep it flowing.",
      strength: s(sig.pauses > 10),
      read: words >= 8,
    },
    {
      key: "emotion",
      glyph: "♡",
      title: "Emotion",
      line: emotional ? "You say what you feel instead of hiding it." : "You show more than you tell.",
      strength: s(emotional && pieces >= 3),
      read: words >= 6,
    },
    {
      key: "flow",
      glyph: "→",
      title: "Flow",
      line: varc > 30 ? "You branch mid-thought, then circle back." : "One thought at a time. Clean transitions.",
      strength: s(pieces >= 4),
      read: sents.length >= 3,
    },
    {
      key: "little",
      glyph: "&",
      title: "Little Words",
      line: funcRatio > 0.42 ? "You lean on little connectors to keep it moving." : "You use just enough to connect.",
      strength: s(words > 200),
      read: words >= 60,
    },
    {
      key: "quirks",
      glyph: "✦",
      title: "Quirks",
      line: quirks.length ? `${quirks.slice(0, 3).join(", ")}.` : "No tics yet — Wren is watching for them.",
      strength: quirks.length ? s(quirks.length >= 2) : Math.max(1, base - 1),
      read: quirks.length > 0,
    },
    {
      key: "shape",
      glyph: "¶",
      title: "Shape",
      line: blocks > pieces / 2 ? "You break lines when the thought lands." : "You write in one clean block.",
      strength: s(blocks >= 3),
      read: pieces >= 2 || blocks > 0,
    },
  ];

  /* the four, from metrics already on hand. Reflection reads pace and the
     room left between clauses; Imagination reads word length against filler
     ratio (dense, specific writing scores high); Emotion counts the feeling
     words rather than merely noticing one; Rhythm is the variance between
     sentence lengths, which is the one thing a single long line can't fake. */
  // what Wren noticed — three soft trait lines, never metric-speak
  const chips = [
    long ? "unhurried thoughts" : "quick thoughts",
    long ? "long, winding lines" : "short, clear lines",
    paused ? "soft pauses" : "few pauses",
  ];
  // the same three, icon-led, with a second line for the fully formed aura
  const traits: AuraTrait[] = [
    long
      ? { icon: "🌙", label: "Unhurried thinking", sub: "You give ideas time to settle.", short: "unhurried thoughts" }
      : { icon: "⚡", label: "Fast moving thoughts", sub: "Your thoughts arrive suddenly.", short: "quick thoughts" },
    long
      ? { icon: "📖", label: "Long flowing lines", sub: "One sentence carries many turns.", short: "long lines" }
      : { icon: "🌱", label: "Notices small moments", sub: "Small moments become stories.", short: "small details" },
    paused
      ? { icon: "🌊", label: "Feelings between lines", sub: "You leave room between words.", short: "quiet feelings" }
      : { icon: "🕊", label: "Says it, then lets go", sub: "No padding — just the thing.", short: "says it straight" },
  ];
  const tier: AuraTier = pieces === 0 ? "empty" : pieces >= FORMED_AT ? "formed" : "evolving";
  const stage = auraStageOf(pieces);

  /* result copy — things Wren can honestly claim from the evidence on hand.
     Every piece written re-rolls which one she brings up, so the card talks
     back to the writing instead of repeating itself. */
  const found: string[] = [];
  if (exclaims === 0 && words > 40) found.push("You've never once reached for an exclamation mark.\nI like that.");
  if (ellipses >= 3) found.push("You trail off on purpose.\nThe dots do the talking.");
  if (lowerI >= 2) found.push("you write 'i' small.\nit reads like a whisper.");
  if (!long && !paused && words > 30) found.push("You say the thing,\nthen you stop. Rare.");
  if (long && paused) found.push("You take the scenic route,\nand every stop matters.");
  if (emotional) found.push("You don't hide the feeling\nunder the words.");
  if (emoji) found.push("The odd emoji,\nexactly where a face would go.");
  if (varc > 30) found.push("Quick line, long line, quick line —\nyour rhythm moves like a walk.");
  if (blocks >= 2) found.push("You break the line\nright where the thought lands.");
  if (funcRatio <= 0.42 && words > 60) found.push("No filler words.\nEvery one of yours is load-bearing.");
  // the portrait's opening line — how Wren would begin describing you
  const lead = long
    ? paused
      ? "You write like someone who waits for the right word."
      : "You write like a thought that doesn't want to stop."
    : paused
      ? "You write in small breaths, one at a time."
      : "You write like your thoughts are still moving.";
  const quote = long
    ? paused
      ? "You take the long way when it matters,\nand it shows."
      : "You let a thought run, and it lands."
    : "You don't over-explain.\nYou let the right words stay.";
  const discovery = found.length ? found[pieces % found.length] : quote;
  const taking = stage.line; // the ladder speaks everywhere the count shows

  return { rows, chips, traits, tier, stage, discovery, lead, quote, pieces, taking };
}

/* ── the deeper AI read (server job "voice"; cached; silent fallback) ── */

const CACHE_KEY = "kindredly_voice_ai";

export interface VoiceAI {
  voice_summary?: string;
  signature_traits?: string[];
  sample_size?: number;
}

export async function cachedVoiceAI(): Promise<VoiceAI | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as VoiceAI) : null;
  } catch {
    return null;
  }
}

export async function storeVoiceAI(v: VoiceAI): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(v));
  } catch {
    /* best-effort */
  }
}
