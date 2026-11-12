import type { PoolLetter } from "../../lib/db";
import { channelColors } from "../../theme/post";
import * as C from "../today/today-cards";

/* CATCH A LINE (owner, 2026-11-12: "按2d的做"): the Kindreds tab before anyone is in it. The first
   lines of today's letters drift across the empty orbit; tap one and its letter opens under the
   sky; "Write back" hands that letter to Today (lib/answer-request), which is the one place a
   stranger's letter is answered. This file is its rules, pure:

   - WHICH LETTERS. Only the reader's own desk for today (the saved DayRecord): nothing is
     fetched for this page, so nobody sees a letter here that Today would not also show them,
     and the day's ration stands. Text letters with a writer (a voice letter has no line to
     drift; a deleted account can't be answered). The unread ones first, then the ones passed
     today (catching one brings it back: today-cards frontLetter). Six at a time; with more than
     six, each visit to the tab starts further along the desk (`turn`), so the sky changes.
   - THE LINE. The letter's first sentence, short enough for a slip: a greeting too short to say
     anything ("Hi.") takes the next sentence with it; anything long is cut at a word and ends
     in an ellipsis. A line break ends a sentence too.
   - WHO. Exactly what Today's card says (buildCard, the same format): the courier's name and
     the frosted window with the identity switch on, the number and the mosaic with it off, the
     star sign, and never the she/he mark (strangers' marks stay with kindreds: stranger-who).
   - THE PAPER. In a light theme the letter's topic colour as a pale wash on the page
     (channelColors), a little stronger for the opened letter than for its slip. In a dark theme
     a pale wash of a bright colour is mud (yellow turns olive), so the slip is the theme's
     surface with the faintest tint and the colour is carried by a hairline round it (owner,
     2026-11-12: "dark适配也要美观"). The topic tag on the opened letter is Today's own: the
     stamp's colour, solid.
   - THE TYPE is Swift's, by the type system (2026-10-20): a line and a letter are content, so
     the reader's Letter font; names, buttons and the two lines under the sky the interface's
     System; the tag SF Mono. */

/** how many lines drift at once */
export const CATCH_SLIPS = 6;
/** a slip's longest line, in display columns (a wide character is two): what four lines of a slip hold */
export const LINE_CAP = 56;
/** a first sentence shorter than this takes the next one with it */
const LINE_MIN = 14;

const WIDE: [number, number][] = [
  [0x1100, 0x115f],
  [0x2e80, 0xa4cf],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe30, 0xfe4f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
  [0x1f000, 0x1faff],
];
const cols = (ch: string): number => {
  const cp = ch.codePointAt(0) ?? 0;
  return WIDE.some(([a, b]) => cp >= a && cp <= b) ? 2 : 1;
};
const width = (cs: readonly string[]): number => cs.reduce((n, ch) => n + cols(ch), 0);

const HARD = "。！？";
const SOFT = ".!?…";
const CLOSE = "\"'”’)」』】》";

/** The index just past the sentence that starts at `from` (a line break ends one and is left out). */
function sentenceEnd(cs: readonly string[], from: number): number {
  for (let i = from; i < cs.length; i++) {
    const ch = cs[i];
    if (ch === "\n") return i;
    if (!HARD.includes(ch) && !SOFT.includes(ch)) continue;
    let j = i + 1;
    while (j < cs.length && (HARD.includes(cs[j]) || SOFT.includes(cs[j]) || CLOSE.includes(cs[j]))) j++;
    // "2.5", "kindredly.io": a full stop inside a word is not an end
    if (HARD.includes(ch) || j >= cs.length || /\s/.test(cs[j])) return j;
    i = j - 1;
  }
  return cs.length;
}

/** A letter's first line as a slip carries it; "" when the letter has no words. */
export function firstLine(body: string | null | undefined, cap = LINE_CAP): string {
  const text = (body ?? "")
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
  if (!text) return "";
  const cs = Array.from(text);
  let end = sentenceEnd(cs, 0);
  if (width(cs.slice(0, end)) < LINE_MIN && end < cs.length) {
    let next = end;
    while (next < cs.length && /\s/.test(cs[next])) next++;
    end = sentenceEnd(cs, next);
  }
  const line = cs.slice(0, end).join("").replace(/\n/g, " ").trim();
  const ls = Array.from(line);
  if (width(ls) <= cap) return line;
  let n = 0;
  let cut = 0;
  while (cut < ls.length && n + cols(ls[cut]) <= cap - 1) n += cols(ls[cut++]);
  let head = ls.slice(0, cut).join("");
  // at a word, when the line has words and the cut isn't far back
  const space = head.lastIndexOf(" ");
  if (space > head.length * 0.55) head = head.slice(0, space);
  return head.replace(/[\s,;:、，—–-]+$/u, "") + "…";
}

/** A letter that can drift: someone wrote it, in words. */
const catchable = (l: PoolLetter): boolean => !!l.author && !(l.kind === "voice" && !!l.media_path) && firstLine(l.body) !== "";

/** The letters whose lines drift this visit (see the top). */
export function catchLetters(rec: Pick<C.DayRecord, "desk" | "passed">, turn = 0, max = CATCH_SLIPS): PoolLetter[] {
  const passed = new Set(rec.passed);
  const all = [...rec.desk.filter((l) => catchable(l) && !passed.has(l.id)), ...rec.desk.filter((l) => catchable(l) && passed.has(l.id))];
  if (all.length <= max) return all;
  const start = (((turn * max) % all.length) + all.length) % all.length;
  return Array.from({ length: max }, (_, i) => all[(start + i) % all.length]);
}

/** One drifting line and the letter under it. */
export type CatchSlip = {
  id: string;
  /** the first line, as the slip carries it */
  line: string;
  /** the slip's paper: light, the topic's colour pale on the page; dark, the surface barely tinted */
  wash: string;
  /** the opened letter's paper: the same, a little stronger */
  cardWash: string;
  /** dark themes: the hairline round both, in the topic's colour; "" in a light theme */
  edge: string;
  /** the topic tag's fill: the stamp's own colour (Today's tag), or its quiet grey */
  tagFill: string;
  /** who wrote it, as Today's card names them (the mark is never sent on) */
  who: C.CardWho;
  /** "#made my day"; "" for none */
  topic: string;
  /** the whole letter */
  body: string;
  /** VoiceOver, for the slip: "Sunday Kite, Gemini. #made my day. It's 2am and…" */
  a11y: string;
  /** VoiceOver, for the opened letter's header (the letter is read after it): "Sunday Kite, Gemini. #made my day" */
  spoken: string;
};

/** The theme a slip is coloured for: the page (tk.bg), the card surface (tk.sf), and whether it is a dark one. */
export type CatchLook = { bg: string; sf: string; dark: boolean };

/** The slips for these letters, in order. */
export function buildSlips(letters: readonly PoolLetter[], look: CatchLook, fmt: C.TodayFormat): CatchSlip[] {
  return letters.map((letter) => {
    const card = C.buildCard({ letter, offer: null, signal: null, voiceReady: false }, look.sf, fmt);
    const line = firstLine(letter.body);
    const hue = card.stampHex || null;
    return {
      id: letter.id,
      line,
      wash: look.dark ? channelColors(hue, look.sf, 0.12).wash : channelColors(hue, look.bg, 0.22).wash,
      cardWash: look.dark ? channelColors(hue, look.sf, 0.16).wash : channelColors(hue, look.bg, 0.34).wash,
      edge: look.dark ? channelColors(hue, look.sf, 0.5).wash : "",
      tagFill: card.topicWash,
      who: { ...card.who, mark: null, markLabel: "" },
      topic: card.topic,
      body: letter.body || "",
      a11y: [card.who.spoken, card.topic, line].filter(Boolean).join(". "),
      spoken: [card.who.spoken, card.topic].filter(Boolean).join(". "),
    };
  });
}
