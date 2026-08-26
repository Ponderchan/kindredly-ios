import type { JournalEntry } from "./journal";
import { t as tr } from "./i18n";
import { getMood } from "../data/moods";

/* The line on an empty SEALED page (just for me).
   ────────────────────────────────────────────────────────────────────────
   The counterpart to lib/sparks.ts, which does the same job for the letter
   desk. That one points OUTWARD at a stranger and rotates on a visit counter;
   this one points INWARD and chooses itself from your own entries and moods.
   Keep them apart: a letter prompt here would ask you to explain yourself to
   nobody, and a diary prompt there would forget someone is going to read it.
   ────────────────────────────────────────────────────────────────────────

   "js.1" every single time teaches the page has one shape. These
   are the owner's six families, chosen by a ladder rather than a dice roll:

     new          the gentlest openers, because the first days are about
                  lowering the cost of writing at all
     night        22:00–04:00 has its own voice at every tier — asking someone
                  at 2am what small thing stayed with them today is tone-deaf
     settled      once there's a handful of entries, the RECENT MOODS choose.
                  Mood is required now, so the writer has already told us how
                  the last few days went; we never have to guess from the text.
     known        past twenty entries, a theme that keeps recurring picks the
                  line — "js.37"

   Everything here runs ON THE DEVICE. The known tier reads your own entries in
   your own phone's memory: nothing is uploaded, nothing is sent to a model.
   That's the constraint that makes "no one sees this, not even me" true, and
   it's why this is word-matching rather than an LLM. */

const NEW = [
  "js.1",
  "js.2",
  "js.3",
  "js.4",
];

const EVERYDAY = [
  "js.5",
  "js.6",
  "js.16",
  "js.27",
];

const NIGHT = [
  "js.31",
  "js.28",
  "js.30",
  "js.29",
  "js.26",
  "js.25",
];

const FUTURE = [
  "js.17",
  "js.18",
  "I hope you still remember…",
  "js.19",
  "js.10",
  "js.15",
];

const SMALL = [
  "js.12",
  "js.13",
  "js.11",
  "js.8",
  "js.7",
  "js.9",
];

const PRIVATE = [
  "js.24",
  "js.23",
  "js.21",
  "behind the \"I'm fine\"…",
  "js.22",
  "js.20",
];

/* Wren's own register — used sparingly. She shouldn't be in the room every
   time; a companion who speaks on every single visit is a notification. */
const WREN = ["js.33", "js.34", "js.35"];

/* Themes worth naming, matched locally against your own words. Deliberately
   few: a wrong guess about someone's life is worse than a general question. */
const THEMES: { hit: RegExp; line: string }[] = [
  { hit: /\b(miss|missed|missing)\b/i, line: "js.37" },
  { hit: /\b(tired|exhausted|drained|burnt|burned out)\b/i, line: "js.38" },
  { hit: /\b(mum|mom|dad|family|parents|brother|sister)\b/i, line: "js.39" },
  { hit: /\b(work|job|boss|deadline|meeting)\b/i, line: "js.40" },
  { hit: /\b(sleep|awake|insomnia|2am|3am)\b/i, line: "js.32" },
  { hit: /\b(friend|friends|lonely|alone)\b/i, line: "js.41" },
];

const pick = (list: string[], n: number) => list[Math.abs(n) % list.length];
const isNight = (d: Date) => d.getHours() >= 22 || d.getHours() < 4;

/** the line for this visit, chosen from what's already on the device */
export function journalSpark(entries: JournalEntry[], now = new Date()): string {
  const n = entries.length;
  const seed = n * 7 + now.getDate();

  if (isNight(now)) return tr(pick(NIGHT, seed));

  // NEW — keep it easy while writing is still a new habit
  if (n < 4) return tr(pick(NEW, seed));

  // KNOWN — a theme that keeps coming back earns a line of its own
  if (n >= 20) {
    const text = entries
      .slice(0, 25)
      .map((e) => e.body || "")
      .join(" ");
    const hits = THEMES.filter((t) => (text.match(t.hit) || []).length >= 3);
    if (hits.length) return tr(pick(hits.map((h) => h.line), seed));
  }

  // SETTLED — the recent moods choose, because the writer already told us
  const tones = entries.slice(0, 5).map((e) => getMood(e.mood).tone);
  const heavy = tones.filter((t) => t === "low" || t === "flat" || t === "edge").length;
  const bright = tones.filter((t) => t === "up" || t === "spark").length;
  if (heavy >= 3) return tr(pick([...PRIVATE, "js.36"], seed));
  if (bright >= 3) return tr(pick([...SMALL, "js.14"], seed));

  // otherwise rotate the wider library, with Wren surfacing now and then
  const pool = seed % 9 === 0 ? WREN : [...EVERYDAY, ...FUTURE, ...SMALL];
  return tr(pick(pool, seed));
}
