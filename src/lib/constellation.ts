/* THE STAR-TREE'S SHAPE, for both renderers (2026-10-27).
   ────────────────────────────────────────────────────────────────────────
   Where the stars of a writer's constellation sit and which star each one
   hangs from. It was worked out inside VoiceCard's ConstellationOverlay;
   it lives here so the Swift Voice report (screens/report, KVoiceReportView)
   draws the very same sky: React Native's overlay and the Swift host both
   call this, and only the drawing differs.

   Pure: no React, no React Native, so
     node src/lib/constellation.test.ts
   locks it. The arithmetic is the overlay's own, in its own order, so the
   React Native sky is unchanged to the last bit.

   In points on an S × S square: with dimScores, nine stars, one per
   dimension, each at its own compass point, radius by score; without, the
   generic spiral of `stars` stars placed by the rhythm beats (`units`).
   Each star after the first is linked to the nearest one before it. */

export type ConstellationStar = {
  x: number;
  y: number;
  /** drawn as the four-point star, not a dot */
  big: boolean;
  /** its weight, 0.45…1: size and opacity */
  w: number;
};

export type ConstellationShape = {
  pts: ConstellationStar[];
  /** [star, the earlier star it hangs from] for every star after the first */
  links: (readonly [number, number])[];
};

export function constellationShape(S: number, units: readonly number[], stars: number, dimScores?: readonly number[]): ConstellationShape {
  const cx = S / 2;
  const cy = S / 2;
  const k = S / 190;
  const u = (i: number) => units[i % Math.max(1, units.length)] ?? 0.5;
  const pts: ConstellationStar[] = dimScores?.length
    ? dimScores.map((sc, i) => {
        const a = -Math.PI / 2 + (i / dimScores.length) * Math.PI * 2 + (u(i) - 0.5) * 0.3;
        const r = (14 + (sc / 100) * 58 + u(i + 3) * 6) * k;
        return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) * 0.8, big: sc >= 70, w: 0.45 + (sc / 100) * 0.55 };
      })
    : Array.from({ length: stars }, (_, i) => {
        const a = i * 2.399 + u(i) * 1.4;
        const r = (16 + (i / Math.max(1, stars - 1)) * 58 + u(i + 3) * 10) * k;
        return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) * 0.8, big: i % 3 === 0, w: 0.45 + u(i + 1) * 0.55 };
      });
  const links = pts.slice(1).map((p, kk) => {
    const i = kk + 1;
    let best = 0;
    let bd = Infinity;
    for (let j = 0; j < i; j++) {
      const d = (p.x - pts[j].x) ** 2 + (p.y - pts[j].y) ** 2;
      if (d < bd) {
        bd = d;
        best = j;
      }
    }
    return [i, best] as const;
  });
  return { pts, links };
}
