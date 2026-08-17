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
}
export interface VoiceRead {
  rows: VoiceRow[];
  chips: string[];
  quote: string; // Wren's pull-quote (local; the AI upgrade may replace it)
  pieces: number; // how many pieces of writing this is based on
  taking: string; // footer line for the card
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
    },
    {
      key: "syntax",
      glyph: "—",
      title: "Sentence Style",
      line: long ? "You let a sentence run when the thought needs it." : "You like short, direct sentences.",
      strength: s(sents.length > 12),
    },
    {
      key: "rhythm",
      glyph: "~",
      title: "Rhythm",
      line: varc > 22 ? "You shift between quick lines and longer runs." : paused ? "A steady pace, with little pauses." : "Quick thoughts. Few pauses.",
      strength: s(sents.length > 8),
    },
    {
      key: "punct",
      glyph: ";",
      title: "Punctuation",
      line: paused ? "Commas and dashes — you leave room to breathe." : "Light on punctuation. You keep it flowing.",
      strength: s(sig.pauses > 10),
    },
    {
      key: "emotion",
      glyph: "♡",
      title: "Emotion",
      line: emotional ? "You say what you feel instead of hiding it." : "You show more than you tell.",
      strength: s(emotional && pieces >= 3),
    },
    {
      key: "flow",
      glyph: "→",
      title: "Flow",
      line: varc > 30 ? "You branch mid-thought, then circle back." : "One thought at a time. Clean transitions.",
      strength: s(pieces >= 4),
    },
    {
      key: "little",
      glyph: "&",
      title: "Little Words",
      line: funcRatio > 0.42 ? "You lean on little connectors to keep it moving." : "You use just enough to connect.",
      strength: s(words > 200),
    },
    {
      key: "quirks",
      glyph: "✦",
      title: "Quirks",
      line: quirks.length ? `${quirks.slice(0, 3).join(", ")}.` : "No tics yet — Wren is watching for them.",
      strength: quirks.length ? s(quirks.length >= 2) : Math.max(1, base - 1),
    },
    {
      key: "shape",
      glyph: "¶",
      title: "Shape",
      line: blocks > pieces / 2 ? "You break lines when the thought lands." : "You write in one clean block.",
      strength: s(blocks >= 3),
    },
  ];

  // what Wren noticed — three soft trait lines, never metric-speak
  const chips = [
    long ? "unhurried thoughts" : "quick thoughts",
    long ? "long, winding lines" : "short, clear lines",
    paused ? "soft pauses" : "few pauses",
  ];
  const quote = long
    ? paused
      ? "You take the long way when it matters,\nand it shows."
      : "You let a thought run, and it lands."
    : "You don't over-explain.\nYou let the right words stay.";
  const taking = pieces < 3 ? "Wren is starting to know you." : "a little more you, every time.";

  return { rows, chips, quote, pieces, taking };
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
