/* WHAT THE EGG HEARS.
   ────────────────────────────────────────────────────────────────────────
   The owner's rule for onboarding: while you are feeding it, the egg must
   visibly react to your words — not with a score, not with a label, with
   a crack that grows and a light that comes on. The user should never be
   told the algorithm; they should just start wondering whether the thing
   is listening.

   These are NOT the hatch engine. The engine reads whole thoughts and
   locks dimensions on evidence; this runs on every keystroke, so it is
   deliberately cheap string arithmetic and deliberately unlabelled. It
   decides how the shell LOOKS, never what the bird IS. The one thing it
   must be is honest in direction: long sentences really do reach, and a
   quirk really does pull the crack off-centre. */

export interface EggSignals {
  /** how many cracks are on the shell — one per thought already fed */
  cracks: number;
  /** 0..1 — how far the live crack has travelled (long sentences reach) */
  reach: number;
  /** 0..1 — light inside (feeling on the surface of the words) */
  glow: number;
  /** 0..1 — surface texture (detail, small nouns, commas) */
  speck: number;
  /** -1..1 — how far off-centre the crack runs (quirks) */
  skew: number;
  /** true while the writer has paused mid-thought — the light hesitates */
  held: boolean;
}

const FEELING =
  /\b(love|hate|miss|scared|afraid|tired|happy|sad|angry|lonely|hope|hurt|ache|glad|sorry|wish|need|want|cry|laugh|warm|cold|quiet|alone)\b/gi;

export function eggSignals(draft: string, fed: number): EggSignals {
  const t = draft.trim();
  if (!t) return { cracks: fed, reach: 0, glow: 0, speck: 0, skew: 0, held: false };

  const words = t.split(/\s+/).filter(Boolean);
  const sentences = t.split(/[.!?…]+/).filter((s) => s.trim().length > 1);
  const perSentence = words.length / Math.max(1, sentences.length || 1);

  /* LONG SENTENCES REACH. A short clipped line cracks the shell in a
     hurry and stops; a long one keeps travelling. Capped at ~22 words so
     an essay doesn't just max out and go still. */
  const reach = Math.min(1, perSentence / 22);

  /* FEELING TURNS THE LIGHT ON — named feelings, and the punctuation
     people reach for when they mean it. */
  const feels = (t.match(FEELING) || []).length;
  const marks = (t.match(/[!?]/g) || []).length;
  const glow = Math.min(1, (feels * 2 + marks) / Math.max(6, words.length / 4));

  /* DETAIL SPECKLES THE SHELL — commas hold clauses together, and long
     words are usually the specific ones. */
  const commas = (t.match(/,/g) || []).length;
  const long = words.filter((w) => w.length >= 7).length;
  const speck = Math.min(1, (commas + long) / Math.max(5, words.length / 3));

  /* QUIRKS PULL IT OFF-CENTRE. Dashes, ellipses, a lowercase i, doubled
     punctuation — the tells that are nobody else's. Signed so two writers
     with different tells crack in different directions. */
  const dashes = (t.match(/—|--/g) || []).length;
  const dots = (t.match(/\.\.\.|…/g) || []).length;
  const lowI = (t.match(/\bi\b/g) || []).length;
  const doubled = (t.match(/([!?])\1/g) || []).length;
  const quirk = dashes + dots + lowI + doubled;
  const skew = Math.max(-1, Math.min(1, (dashes + doubled - dots - lowI) / 3)) * Math.min(1, quirk / 2);

  /* A THOUGHT LEFT HANGING. Mid-sentence, mid-clause — the light holds
     its breath rather than pretending the thought landed. */
  const held = /[,;:—]\s*$/.test(t) || (words.length > 2 && !/[.!?…"']$/.test(t));

  return { cracks: fed, reach, glow, speck, skew, held };
}
