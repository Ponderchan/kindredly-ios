import type { Aura } from "./aura";
import type { ResolvedSticker } from "./writing-engine/stickers";

/* THE LADDER — where the aura card stands, in seven rungs (the owner's
   W33 sheet, on the forming ladder of 2026-09-18).
   ────────────────────────────────────────────────────────────────────────
     0 hatched        nothing written yet          lines
     1 one letter     1–2 letters, nothing holds   lines
     2 three letters  3+ letters, still trying     pencil
     3 first stuck    1–2 labels established       sketch
     4 almost named   3 established, no name yet   sketch
     5 named          the title is formed          colour
     6 still you      named, and a label changing  colour

   The picture IS the progress: the same scene, drawn four ways. Every
   number on the card is counted, never scored. */

export type Fidelity = "lines" | "pencil" | "sketch" | "colour";

export interface Rung {
  level: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  fidelity: Fidelity;
  /** pool letters + replies — what the aura actually read */
  letters: number;
  /** labels that hold (one per dimension) */
  stuck: number;
  /** labels still trying on, among the three shown */
  changing: number;
  /** the bar under the picture: how many of the five ticks are lit */
  ticks: number;
  /** the strongest held label's "n of your last m", for the five slips */
  slips: { n: number; of: number } | null;
}

export function rungOf(aura: Aura): Rung {
  const letters = aura.sources.letters + aura.sources.conversations;
  const st = aura.stickers;
  const byDim = Object.values(st?.byDimension ?? {}).filter(Boolean) as ResolvedSticker[];
  const stuck = byDim.filter((s) => s.state === "established").length;
  const home = st?.home ?? [];
  const changing = home.filter((s) => s.state === "emerging").length;
  const top = byDim.filter((s) => s.state === "established").sort((a, b) => b.supporting - a.supporting)[0] ?? null;
  const slips = top ? { n: Math.min(5, top.supporting), of: Math.min(5, Math.max(top.eligible, 1)) } : null;

  const base = { letters, stuck, changing, slips };
  if (aura.phase === "formed") {
    const level = changing > 0 ? 6 : 5;
    return { ...base, level, fidelity: "colour", ticks: 5 };
  }
  if (aura.phase === "clearing") return { ...base, level: 4, fidelity: "sketch", ticks: 4 };
  if (aura.phase === "shaping") return { ...base, level: 3, fidelity: "sketch", ticks: 3 };
  if (letters >= 3) return { ...base, level: 2, fidelity: "pencil", ticks: 2 };
  if (letters >= 1) return { ...base, level: 1, fidelity: "lines", ticks: 1 };
  return { ...base, level: 0, fidelity: "lines", ticks: 0 };
}
