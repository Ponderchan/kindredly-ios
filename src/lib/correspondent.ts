import { hatch, type Archetype, type DimScore } from "./hatch-engine";
import { weightedCount } from "./weighted-count";

/* WHAT YOU KNOW ABOUT THE PERSON WRITING TO YOU.
   ────────────────────────────────────────────────────────────────────────
   The reveal used to be an unlock: five letters each way and a name fell
   out. The subject of this product is not "I met someone", it is "I watched
   a stranger slowly become someone" — so what the screens report is not how
   many letters have gone by, it is how much of them has arrived.

   IT RUNS ON THEIR LETTERS, ON THIS DEVICE, WITH NO BACKEND.
   `hatch()` is a pure function over an array of text and nothing about it is
   self-only, so a correspondent can be read from the letters they actually
   sent you. That means no fingerprints RLS problem (their aura row is never
   touched), no migration, no server, and — the part that matters most — NO
   LLM. An AI paraphrasing a real person to their correspondent would invent
   details in the most intimate place in the product and replace their voice
   with Wren's, in an app whose whole claim is that you ARE your writing.
   (wren.ts has a peek() that does exactly that. It stays unused.)

   It is also truer: this is YOUR read, built from what they wrote to YOU.
   Two correspondents assemble slightly different pictures of one person.

   FARMING. Most lock rules in hatch-engine are evidence-based (fifty words,
   two questions, six punctuation marks), but three of them count containers
   rather than content — four sentences, five sentences, three texts — and
   measuring found that five replies of "ok." / "yeah" / "sure" satisfy all
   three: 5 words of writing, 3 moments. Nobody is knowable from five words.
   So a moment must be BOUGHT WITH A REAL LETTER: only letters carrying at
   least SUBSTANTIAL weight can pay for one. Junk now reads as exactly what
   it is — a voice that has told you nothing.

   With that floor, the reward is computed from the very thing you would have
   to fake, so faking it destroys the reward. That only holds because the
   payoff is derived, never granted. */

export type Stage = "found" | "forming" | "recognizing" | "known";

export interface CorrespondentRead {
  stage: Stage;
  /** dimensions of them that have come through — the count the UI shows */
  moments: number;
  /** the locked dims, each carrying `line`: the read in warm words */
  found: DimScore[];
  /** still growing; each carries `sealed`: how to name it while hidden */
  sealed: DimScore[];
  archetype: Archetype | null;
}

/** moments needed before you are said to know someone's voice */
export const RECOGNIZE_AT = 4;

/* What a letter must weigh to reveal anything. weightedCount charges 2 per
   CJK glyph, so this is ~12 English words or ~30 Chinese characters — a real
   short letter either way, and well under what anyone writing honestly
   sends. "ok." is 3. */
const SUBSTANTIAL = 60;

/* One new moment per letter received, at most.
   The thresholds were tuned for onboarding, where several short thoughts
   arrive at once, so a single substantial letter can lock four or five dims
   on the spot — the whole arc in one delivery. Pacing it to their letters
   keeps both properties: a letter always has something to give, and no
   letter can give what it did not earn. */
export function readCorrespondent(theirLetters: string[], revealed = false): CorrespondentRead {
  const texts = theirLetters.map((t) => (t || "").trim()).filter(Boolean);
  if (!texts.length) {
    return { stage: "found", moments: 0, found: [], sealed: [], archetype: null };
  }

  const h = hatch(texts);
  const locked = h.dims.filter((d) => d.locked);
  const paid = texts.filter((t) => weightedCount(t) >= SUBSTANTIAL).length;
  const moments = Math.min(locked.length, paid);
  const found = locked.slice(0, moments);
  const sealed = h.dims.filter((d) => !found.includes(d));

  const stage: Stage = revealed
    ? "known"
    : moments >= RECOGNIZE_AT
      ? "recognizing"
      : "forming";

  return { stage, moments, found, sealed, archetype: moments ? h.archetype : null };
}

/* hatch-engine writes every line in the second person, because it was built
   to describe you to yourself. Pointed at a correspondent, the same copy has
   to speak about them — and half-converting it (only the first word, say)
   produces the worst possible sentence: "Short lines. You trust the reader
   to fill the rest," which now addresses the wrong person mid-thought.

   English lets this be a clean swap: second person and third person plural
   take the same verb form, so you→they / your→their is grammatical wherever
   it lands. Word boundaries only, and the leading capital is preserved. */
export function theyify(text: string): string {
  return (text || "").replace(
    /\b(you're|yours|yourself|your|you)\b/gi,
    (m) => {
      const lower = m.toLowerCase();
      const out =
        lower === "you're" ? "they're"
        : lower === "yours" ? "theirs"
        : lower === "yourself" ? "themselves"
        : lower === "your" ? "their"
        : "they";
      return m[0] === m[0].toUpperCase() ? out[0].toUpperCase() + out.slice(1) : out;
    },
  );
}

/* What each state says out loud. FOUND and FORMING keep the phrasing already
   shipped, so this is a state machine being named, not a new vocabulary. */
export function stageLine(stage: Stage): string {
  switch (stage) {
    case "found":
      return "A VOICE, FOUND";
    case "forming":
      return "COMING INTO VIEW";
    case "recognizing":
      return "YOU KNOW THEIR VOICE";
    case "known":
      return "NAMES REVEALED";
  }
}
