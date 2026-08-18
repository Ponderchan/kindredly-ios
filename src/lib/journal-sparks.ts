import type { JournalEntry } from "./journal";
import { getMood } from "../data/moods";

/* The line on an empty SEALED page (just for me).
   ────────────────────────────────────────────────────────────────────────
   The counterpart to lib/sparks.ts, which does the same job for the letter
   desk. That one points OUTWARD at a stranger and rotates on a visit counter;
   this one points INWARD and chooses itself from your own entries and moods.
   Keep them apart: a letter prompt here would ask you to explain yourself to
   nobody, and a diary prompt there would forget someone is going to read it.
   ────────────────────────────────────────────────────────────────────────

   "today felt like…" every single time teaches the page has one shape. These
   are the owner's six families, chosen by a ladder rather than a dice roll:

     new          the gentlest openers, because the first days are about
                  lowering the cost of writing at all
     night        22:00–04:00 has its own voice at every tier — asking someone
                  at 2am what small thing stayed with them today is tone-deaf
     settled      once there's a handful of entries, the RECENT MOODS choose.
                  Mood is required now, so the writer has already told us how
                  the last few days went; we never have to guess from the text.
     known        past twenty entries, a theme that keeps recurring picks the
                  line — "something you miss but never mention…"

   Everything here runs ON THE DEVICE. The known tier reads your own entries in
   your own phone's memory: nothing is uploaded, nothing is sent to a model.
   That's the constraint that makes "no one sees this, not even me" true, and
   it's why this is word-matching rather than an LLM. */

const NEW = [
  "today felt like…",
  "something on my mind…",
  "a little moment from today…",
  "one thing that stayed with me…",
];

const EVERYDAY = [
  "something I don't want to forget…",
  "a thought I didn't say out loud…",
  "currently carrying…",
  "the thing I keep replaying…",
];

const NIGHT = [
  "it's late and I'm thinking about…",
  "the thought that won't leave…",
  "what my brain keeps coming back to…",
  "the conversation I keep having in my head…",
  "the quiet thing bothering me…",
  "something I can't explain yet…",
];

const FUTURE = [
  "future me, remember this…",
  "when you read this later…",
  "I hope you still remember…",
  "don't forget this version of you…",
  "a note from today…",
  "something worth saving…",
];

const SMALL = [
  "a tiny win today…",
  "something unexpectedly nice…",
  "a moment that made me smile…",
  "something small but important…",
  "a little thing I noticed…",
  "today's tiny detail…",
];

const PRIVATE = [
  "something I wouldn't post anywhere…",
  "what I really wanted to say…",
  "the version nobody sees…",
  "behind the \"I'm fine\"…",
  "what I kept to myself…",
  "the honest version…",
];

/* Wren's own register — used sparingly. She shouldn't be in the room every
   time; a companion who speaks on every single visit is a notification. */
const WREN = ["no need to make it pretty…", "just leave a line here…", "you can be unfinished here…"];

/* Themes worth naming, matched locally against your own words. Deliberately
   few: a wrong guess about someone's life is worse than a general question. */
const THEMES: { hit: RegExp; line: string }[] = [
  { hit: /\b(miss|missed|missing)\b/i, line: "something you miss but never mention…" },
  { hit: /\b(tired|exhausted|drained|burnt|burned out)\b/i, line: "what's been taking it out of you…" },
  { hit: /\b(mum|mom|dad|family|parents|brother|sister)\b/i, line: "something about them you've never said…" },
  { hit: /\b(work|job|boss|deadline|meeting)\b/i, line: "the part of it nobody sees…" },
  { hit: /\b(sleep|awake|insomnia|2am|3am)\b/i, line: "what keeps you up, plainly…" },
  { hit: /\b(friend|friends|lonely|alone)\b/i, line: "who you thought of today…" },
];

const pick = (list: string[], n: number) => list[Math.abs(n) % list.length];
const isNight = (d: Date) => d.getHours() >= 22 || d.getHours() < 4;

/** the line for this visit, chosen from what's already on the device */
export function journalSpark(entries: JournalEntry[], now = new Date()): string {
  const n = entries.length;
  const seed = n * 7 + now.getDate();

  if (isNight(now)) return pick(NIGHT, seed);

  // NEW — keep it easy while writing is still a new habit
  if (n < 4) return pick(NEW, seed);

  // KNOWN — a theme that keeps coming back earns a line of its own
  if (n >= 20) {
    const text = entries
      .slice(0, 25)
      .map((e) => e.body || "")
      .join(" ");
    const hits = THEMES.filter((t) => (text.match(t.hit) || []).length >= 3);
    if (hits.length) return pick(hits.map((h) => h.line), seed);
  }

  // SETTLED — the recent moods choose, because the writer already told us
  const tones = entries.slice(0, 5).map((e) => getMood(e.mood).tone);
  const heavy = tones.filter((t) => t === "low" || t === "flat" || t === "edge").length;
  const bright = tones.filter((t) => t === "up" || t === "spark").length;
  if (heavy >= 3) return pick([...PRIVATE, "what's been heavy lately…"], seed);
  if (bright >= 3) return pick([...SMALL, "something worth remembering…"], seed);

  // otherwise rotate the wider library, with Wren surfacing now and then
  const pool = seed % 9 === 0 ? WREN : [...EVERYDAY, ...FUTURE, ...SMALL];
  return pick(pool, seed);
}
