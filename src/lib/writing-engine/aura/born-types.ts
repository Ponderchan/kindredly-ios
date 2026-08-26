import type { DimScore, DimKey } from "../../hatch-engine";
import type { BornType, HatchRead, AuraAxis } from "../types";

/* BORN TYPE — the hatch first impression (Step 6).
   ────────────────────────────────────────────────────────────────────────
   One onboarding sample can't form a stable nine-dimension aura, so the hatch
   names only the 1–2 strongest early signals and a provisional born type. The
   twelve poetic archetypes still exist and are computed from the full profile
   downstream; this is the warm, low-confidence opener, not a diagnosis.

   Computed from the SAME normalized dims every language produces — so a
   Spanish and an English writer with the same shape get the same born type.
   No language-specific born types. */

// each born type is a small profile over the shipped DimKeys (which the axes
// map onto). Positive weight = "high on this reads as this type"; negative =
// "low reads as this type".
const PROFILES: Record<BornType, Partial<Record<DimKey, number>>> = {
  // quick, bright, direct — short lines, lively rhythm, light punctuation
  spark: { sentence: -1.2, rhythm: 1.3, punctuation: -0.7, emotion: 0.4 },
  // layered, reflective, abstract — long lines, low burstiness, ornate words
  deep_one: { sentence: 1.3, vocabulary: 1.0, rhythm: -0.8, perspective: 0.6 },
  // narrative — travels from detail to feeling, steady, concrete
  storyteller: { structure: 1.4, rhythm: -0.2, vocabulary: -0.5, sentence: 0.4 },
  // restrained — feeling kept under the words, sparse punctuation, soft
  whisper: { emotion: -1.1, punctuation: -0.9, rhythm: -0.5, sentence: -0.2 },
};

const DIR: Partial<Record<DimKey, [string, string]>> = {
  sentence: ["short/direct", "long/layered"],
  rhythm: ["steady/measured", "varied/bursty"],
  punctuation: ["sparse/light", "expressive/dense"],
  vocabulary: ["concrete/everyday", "abstract/ornate"],
  emotion: ["implicit/show", "explicit/tell"],
  structure: ["one-track", "detail→feeling"],
  perspective: ["outward", "inward"],
  function: ["firm/direct", "hedged/qualifying"],
  quirks: ["conventional", "distinctive"],
};

const AXIS_OF: Partial<Record<DimKey, AuraAxis>> = {
  vocabulary: "wordChoice",
  sentence: "sentenceStyle",
  rhythm: "rhythm",
  punctuation: "punctuation",
  structure: "flow",
  function: "littleWords",
  emotion: "emotion",
  quirks: "quirks",
  perspective: "shape",
};

/** the born read from a scored profile. `lockedCount` gates confidence — one
 *  thin sample should never claim certainty. */
export function bornRead(dims: DimScore[], lockedCount: number): HatchRead {
  const by = Object.fromEntries(dims.map((d) => [d.key, d.score])) as Record<DimKey, number>;
  // centre each dim around 50 (the neutral coordinate) → -1..1-ish
  const z = (k: DimKey) => ((by[k] ?? 50) - 50) / 50;

  let best: BornType = "spark";
  let bestScore = -Infinity;
  const scores: Record<string, number> = {};
  for (const [type, profile] of Object.entries(PROFILES) as [BornType, Partial<Record<DimKey, number>>][]) {
    let s = 0;
    for (const [k, w] of Object.entries(profile) as [DimKey, number][]) s += z(k) * w;
    scores[type] = s;
    if (s > bestScore) {
      bestScore = s;
      best = type;
    }
  }

  // confidence: how clearly the winner leads, tempered by how much evidence
  // has actually locked (a one-thought hatch stays low no matter what).
  const sorted = Object.values(scores).sort((a, b) => b - a);
  const margin = Math.max(0, (sorted[0] ?? 0) - (sorted[1] ?? 0));
  const evidence = Math.min(1, lockedCount / 5);
  const bornTypeConfidence = Math.max(0.15, Math.min(0.9, 0.25 + margin * 0.6) * (0.4 + 0.6 * evidence));

  // the 1–2 dimensions that lead this profile, as strongest signals
  const strongestSignals = [...dims]
    .map((d) => ({ key: d.key, dev: Math.abs(z(d.key)) }))
    .sort((a, b) => b.dev - a.dev)
    .slice(0, 2)
    .map((d) => {
      const pair = DIR[d.key];
      const high = (by[d.key] ?? 50) >= 50;
      return {
        dimension: (AXIS_OF[d.key] ?? "shape") as AuraAxis,
        direction: pair ? (high ? pair[1] : pair[0]) : high ? "high" : "low",
        confidence: Math.min(0.9, d.dev * (0.4 + 0.6 * evidence)),
      };
    });

  return { bornType: best, bornTypeConfidence, strongestSignals };
}
