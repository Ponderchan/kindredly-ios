/* Behaviour lock for lib/constellation: the star-tree both renderers draw (VoiceCard's
   ConstellationOverlay and the Swift Voice report) is the one the overlay always worked out.
   Not wired to a runner; run by hand from the repo root with plain node:
     node src/lib/constellation.test.ts */

import { constellationShape } from "./constellation.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

/* the overlay's code as it stood before it moved here (VoiceCard.tsx, 2026-10-27), as the reference */
function reference(S: number, units: number[], stars: number, dimScores?: number[]) {
  const cx = S / 2;
  const cy = S / 2;
  const k = S / 190;
  const u = (i: number) => units[i % Math.max(1, units.length)] ?? 0.5;
  const pts = dimScores?.length
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

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const UNITS = [0.12, 0.8, 0.33, 0.5, 0.91, 0.07, 0.64];

ok("the spiral at 150 is the overlay's, bit for bit", same(constellationShape(150, UNITS, 12), reference(150, UNITS, 12)));
ok("the spiral at 110 is the overlay's", same(constellationShape(110, UNITS, 4), reference(110, UNITS, 4)));
ok("no beats at all: every beat reads 0.5", same(constellationShape(150, [], 5), reference(150, [], 5)));
ok("one star: no links", constellationShape(150, UNITS, 1).links.length === 0);
const DIMS = [80, 20, 55, 71, 10, 99, 45, 60, 69];
ok("with dims: nine stars at their compass points, as the overlay placed them", same(constellationShape(190, UNITS, 3, DIMS), reference(190, UNITS, 3, DIMS)));
ok("with dims: a score of 70 or more is a big star", constellationShape(190, UNITS, 3, DIMS).pts.map((p) => p.big).join() === DIMS.map((d) => d >= 70).join());
ok("empty dims fall back to the spiral", same(constellationShape(150, UNITS, 6, []), reference(150, UNITS, 6)));
{
  const { pts, links } = constellationShape(150, UNITS, 12);
  ok("every star after the first hangs from an earlier one", links.every(([i, j], n) => i === n + 1 && j < i));
  ok("every star sits inside the square", pts.every((p) => p.x > 0 && p.x < 150 && p.y > 0 && p.y < 150));
  ok("every third star is big, the first among them", pts.every((p, i) => p.big === (i % 3 === 0)));
}

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
