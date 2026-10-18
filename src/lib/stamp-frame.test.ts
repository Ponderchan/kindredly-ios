/* Behaviour lock for the stamp frame (lib/stamp-frame, stamp-spec §2): the tier a width falls in,
   the perforated silhouette of every tier against GOLDEN path strings (the numbers of build.py's
   silhouette(), produced independently by the kit's Python, so a drift in the port fails here),
   the window, the six series grounds, the colours (half-up mixing, pinned on the one stamp where
   it matters), the keyline and rim, the tilt (FNV-1a 32 of the letter id, checked against a
   byte-wise FNV-1a written here), the postmark and the ladder (every size 5:6, each in the tier
   the spec names, the Today card 50×60 and the compose corner 40×48 at 8° as the owner confirmed
   on 2026-10-18).
   design/stamps-v2/golden.json carries the same goldens for the Swift side (KStampShape must
   produce these strings exactly); this test fails when the two disagree, and
     node --experimental-strip-types src/lib/stamp-frame.test.ts --write-golden
   rewrites that file from the goldens below (after the code has matched them).
   Not wired to a runner; run by hand from the repo root with plain node (it strips the types
   itself from Node 22.18 / 23.6 on):
     node --experimental-strip-types src/lib/stamp-frame.test.ts
   A load hook only adds ".ts" to the extensionless relative imports Metro wants. Every line
   prints ok/FAIL and the process exits non-zero if any fail. */

import { registerHooks } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});

const F = await import("./stamp-frame.ts");
const { hashStr } = await import("./mosaic.ts");
type Tier = import("./stamp-frame").StampTier;

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/* ── the goldens ─────────────────────────────────────────────────────── */

// build.py silhouette(nx, ny), run by python3 on 2026-10-18 (5×6 is also the kit template's path)
const SIL_5x6 = "M6.000,0L14.000,0 A6.000,6.000 0 0 0 26.000,0L34.000,0 A6.000,6.000 0 0 0 46.000,0L54.000,0 A6.000,6.000 0 0 0 66.000,0L74.000,0 A6.000,6.000 0 0 0 86.000,0L94.000,0 A6.000,6.000 0 0 0 100.000,6.000L100,14.000 A6.000,6.000 0 0 0 100,26.000L100,34.000 A6.000,6.000 0 0 0 100,46.000L100,54.000 A6.000,6.000 0 0 0 100,66.000L100,74.000 A6.000,6.000 0 0 0 100,86.000L100,94.000 A6.000,6.000 0 0 0 100,106.000L100,114.000 A6.000,6.000 0 0 0 94.000,120L86.000,120 A6.000,6.000 0 0 0 74.000,120L66.000,120 A6.000,6.000 0 0 0 54.000,120L46.000,120 A6.000,6.000 0 0 0 34.000,120L26.000,120 A6.000,6.000 0 0 0 14.000,120L6.000,120 A6.000,6.000 0 0 0 0,114.000L0,106.000 A6.000,6.000 0 0 0 0,94.000L0,86.000 A6.000,6.000 0 0 0 0,74.000L0,66.000 A6.000,6.000 0 0 0 0,54.000L0,46.000 A6.000,6.000 0 0 0 0,34.000L0,26.000 A6.000,6.000 0 0 0 0,14.000L0,6.000 A6.000,6.000 0 0 0 6.000,0Z";
const SIL_10x12 = "M3.000,0L7.000,0 A3.000,3.000 0 0 0 13.000,0L17.000,0 A3.000,3.000 0 0 0 23.000,0L27.000,0 A3.000,3.000 0 0 0 33.000,0L37.000,0 A3.000,3.000 0 0 0 43.000,0L47.000,0 A3.000,3.000 0 0 0 53.000,0L57.000,0 A3.000,3.000 0 0 0 63.000,0L67.000,0 A3.000,3.000 0 0 0 73.000,0L77.000,0 A3.000,3.000 0 0 0 83.000,0L87.000,0 A3.000,3.000 0 0 0 93.000,0L97.000,0 A3.000,3.000 0 0 0 100.000,3.000L100,7.000 A3.000,3.000 0 0 0 100,13.000L100,17.000 A3.000,3.000 0 0 0 100,23.000L100,27.000 A3.000,3.000 0 0 0 100,33.000L100,37.000 A3.000,3.000 0 0 0 100,43.000L100,47.000 A3.000,3.000 0 0 0 100,53.000L100,57.000 A3.000,3.000 0 0 0 100,63.000L100,67.000 A3.000,3.000 0 0 0 100,73.000L100,77.000 A3.000,3.000 0 0 0 100,83.000L100,87.000 A3.000,3.000 0 0 0 100,93.000L100,97.000 A3.000,3.000 0 0 0 100,103.000L100,107.000 A3.000,3.000 0 0 0 100,113.000L100,117.000 A3.000,3.000 0 0 0 97.000,120L93.000,120 A3.000,3.000 0 0 0 87.000,120L83.000,120 A3.000,3.000 0 0 0 77.000,120L73.000,120 A3.000,3.000 0 0 0 67.000,120L63.000,120 A3.000,3.000 0 0 0 57.000,120L53.000,120 A3.000,3.000 0 0 0 47.000,120L43.000,120 A3.000,3.000 0 0 0 37.000,120L33.000,120 A3.000,3.000 0 0 0 27.000,120L23.000,120 A3.000,3.000 0 0 0 17.000,120L13.000,120 A3.000,3.000 0 0 0 7.000,120L3.000,120 A3.000,3.000 0 0 0 0,117.000L0,113.000 A3.000,3.000 0 0 0 0,107.000L0,103.000 A3.000,3.000 0 0 0 0,97.000L0,93.000 A3.000,3.000 0 0 0 0,87.000L0,83.000 A3.000,3.000 0 0 0 0,77.000L0,73.000 A3.000,3.000 0 0 0 0,67.000L0,63.000 A3.000,3.000 0 0 0 0,57.000L0,53.000 A3.000,3.000 0 0 0 0,47.000L0,43.000 A3.000,3.000 0 0 0 0,37.000L0,33.000 A3.000,3.000 0 0 0 0,27.000L0,23.000 A3.000,3.000 0 0 0 0,17.000L0,13.000 A3.000,3.000 0 0 0 0,7.000L0,3.000 A3.000,3.000 0 0 0 3.000,0Z";
const SIL_15x18 = "M2.000,0L4.667,0 A2.000,2.000 0 0 0 8.667,0L11.333,0 A2.000,2.000 0 0 0 15.333,0L18.000,0 A2.000,2.000 0 0 0 22.000,0L24.667,0 A2.000,2.000 0 0 0 28.667,0L31.333,0 A2.000,2.000 0 0 0 35.333,0L38.000,0 A2.000,2.000 0 0 0 42.000,0L44.667,0 A2.000,2.000 0 0 0 48.667,0L51.333,0 A2.000,2.000 0 0 0 55.333,0L58.000,0 A2.000,2.000 0 0 0 62.000,0L64.667,0 A2.000,2.000 0 0 0 68.667,0L71.333,0 A2.000,2.000 0 0 0 75.333,0L78.000,0 A2.000,2.000 0 0 0 82.000,0L84.667,0 A2.000,2.000 0 0 0 88.667,0L91.333,0 A2.000,2.000 0 0 0 95.333,0L98.000,0 A2.000,2.000 0 0 0 100.000,2.000L100,4.667 A2.000,2.000 0 0 0 100,8.667L100,11.333 A2.000,2.000 0 0 0 100,15.333L100,18.000 A2.000,2.000 0 0 0 100,22.000L100,24.667 A2.000,2.000 0 0 0 100,28.667L100,31.333 A2.000,2.000 0 0 0 100,35.333L100,38.000 A2.000,2.000 0 0 0 100,42.000L100,44.667 A2.000,2.000 0 0 0 100,48.667L100,51.333 A2.000,2.000 0 0 0 100,55.333L100,58.000 A2.000,2.000 0 0 0 100,62.000L100,64.667 A2.000,2.000 0 0 0 100,68.667L100,71.333 A2.000,2.000 0 0 0 100,75.333L100,78.000 A2.000,2.000 0 0 0 100,82.000L100,84.667 A2.000,2.000 0 0 0 100,88.667L100,91.333 A2.000,2.000 0 0 0 100,95.333L100,98.000 A2.000,2.000 0 0 0 100,102.000L100,104.667 A2.000,2.000 0 0 0 100,108.667L100,111.333 A2.000,2.000 0 0 0 100,115.333L100,118.000 A2.000,2.000 0 0 0 98.000,120L95.333,120 A2.000,2.000 0 0 0 91.333,120L88.667,120 A2.000,2.000 0 0 0 84.667,120L82.000,120 A2.000,2.000 0 0 0 78.000,120L75.333,120 A2.000,2.000 0 0 0 71.333,120L68.667,120 A2.000,2.000 0 0 0 64.667,120L62.000,120 A2.000,2.000 0 0 0 58.000,120L55.333,120 A2.000,2.000 0 0 0 51.333,120L48.667,120 A2.000,2.000 0 0 0 44.667,120L42.000,120 A2.000,2.000 0 0 0 38.000,120L35.333,120 A2.000,2.000 0 0 0 31.333,120L28.667,120 A2.000,2.000 0 0 0 24.667,120L22.000,120 A2.000,2.000 0 0 0 18.000,120L15.333,120 A2.000,2.000 0 0 0 11.333,120L8.667,120 A2.000,2.000 0 0 0 4.667,120L2.000,120 A2.000,2.000 0 0 0 0,118.000L0,115.333 A2.000,2.000 0 0 0 0,111.333L0,108.667 A2.000,2.000 0 0 0 0,104.667L0,102.000 A2.000,2.000 0 0 0 0,98.000L0,95.333 A2.000,2.000 0 0 0 0,91.333L0,88.667 A2.000,2.000 0 0 0 0,84.667L0,82.000 A2.000,2.000 0 0 0 0,78.000L0,75.333 A2.000,2.000 0 0 0 0,71.333L0,68.667 A2.000,2.000 0 0 0 0,64.667L0,62.000 A2.000,2.000 0 0 0 0,58.000L0,55.333 A2.000,2.000 0 0 0 0,51.333L0,48.667 A2.000,2.000 0 0 0 0,44.667L0,42.000 A2.000,2.000 0 0 0 0,38.000L0,35.333 A2.000,2.000 0 0 0 0,31.333L0,28.667 A2.000,2.000 0 0 0 0,24.667L0,22.000 A2.000,2.000 0 0 0 0,18.000L0,15.333 A2.000,2.000 0 0 0 0,11.333L0,8.667 A2.000,2.000 0 0 0 0,4.667L0,2.000 A2.000,2.000 0 0 0 2.000,0Z";
const SIL_20x24 = "M1.500,0L3.500,0 A1.500,1.500 0 0 0 6.500,0L8.500,0 A1.500,1.500 0 0 0 11.500,0L13.500,0 A1.500,1.500 0 0 0 16.500,0L18.500,0 A1.500,1.500 0 0 0 21.500,0L23.500,0 A1.500,1.500 0 0 0 26.500,0L28.500,0 A1.500,1.500 0 0 0 31.500,0L33.500,0 A1.500,1.500 0 0 0 36.500,0L38.500,0 A1.500,1.500 0 0 0 41.500,0L43.500,0 A1.500,1.500 0 0 0 46.500,0L48.500,0 A1.500,1.500 0 0 0 51.500,0L53.500,0 A1.500,1.500 0 0 0 56.500,0L58.500,0 A1.500,1.500 0 0 0 61.500,0L63.500,0 A1.500,1.500 0 0 0 66.500,0L68.500,0 A1.500,1.500 0 0 0 71.500,0L73.500,0 A1.500,1.500 0 0 0 76.500,0L78.500,0 A1.500,1.500 0 0 0 81.500,0L83.500,0 A1.500,1.500 0 0 0 86.500,0L88.500,0 A1.500,1.500 0 0 0 91.500,0L93.500,0 A1.500,1.500 0 0 0 96.500,0L98.500,0 A1.500,1.500 0 0 0 100.000,1.500L100,3.500 A1.500,1.500 0 0 0 100,6.500L100,8.500 A1.500,1.500 0 0 0 100,11.500L100,13.500 A1.500,1.500 0 0 0 100,16.500L100,18.500 A1.500,1.500 0 0 0 100,21.500L100,23.500 A1.500,1.500 0 0 0 100,26.500L100,28.500 A1.500,1.500 0 0 0 100,31.500L100,33.500 A1.500,1.500 0 0 0 100,36.500L100,38.500 A1.500,1.500 0 0 0 100,41.500L100,43.500 A1.500,1.500 0 0 0 100,46.500L100,48.500 A1.500,1.500 0 0 0 100,51.500L100,53.500 A1.500,1.500 0 0 0 100,56.500L100,58.500 A1.500,1.500 0 0 0 100,61.500L100,63.500 A1.500,1.500 0 0 0 100,66.500L100,68.500 A1.500,1.500 0 0 0 100,71.500L100,73.500 A1.500,1.500 0 0 0 100,76.500L100,78.500 A1.500,1.500 0 0 0 100,81.500L100,83.500 A1.500,1.500 0 0 0 100,86.500L100,88.500 A1.500,1.500 0 0 0 100,91.500L100,93.500 A1.500,1.500 0 0 0 100,96.500L100,98.500 A1.500,1.500 0 0 0 100,101.500L100,103.500 A1.500,1.500 0 0 0 100,106.500L100,108.500 A1.500,1.500 0 0 0 100,111.500L100,113.500 A1.500,1.500 0 0 0 100,116.500L100,118.500 A1.500,1.500 0 0 0 98.500,120L96.500,120 A1.500,1.500 0 0 0 93.500,120L91.500,120 A1.500,1.500 0 0 0 88.500,120L86.500,120 A1.500,1.500 0 0 0 83.500,120L81.500,120 A1.500,1.500 0 0 0 78.500,120L76.500,120 A1.500,1.500 0 0 0 73.500,120L71.500,120 A1.500,1.500 0 0 0 68.500,120L66.500,120 A1.500,1.500 0 0 0 63.500,120L61.500,120 A1.500,1.500 0 0 0 58.500,120L56.500,120 A1.500,1.500 0 0 0 53.500,120L51.500,120 A1.500,1.500 0 0 0 48.500,120L46.500,120 A1.500,1.500 0 0 0 43.500,120L41.500,120 A1.500,1.500 0 0 0 38.500,120L36.500,120 A1.500,1.500 0 0 0 33.500,120L31.500,120 A1.500,1.500 0 0 0 28.500,120L26.500,120 A1.500,1.500 0 0 0 23.500,120L21.500,120 A1.500,1.500 0 0 0 18.500,120L16.500,120 A1.500,1.500 0 0 0 13.500,120L11.500,120 A1.500,1.500 0 0 0 8.500,120L6.500,120 A1.500,1.500 0 0 0 3.500,120L1.500,120 A1.500,1.500 0 0 0 0,118.500L0,116.500 A1.500,1.500 0 0 0 0,113.500L0,111.500 A1.500,1.500 0 0 0 0,108.500L0,106.500 A1.500,1.500 0 0 0 0,103.500L0,101.500 A1.500,1.500 0 0 0 0,98.500L0,96.500 A1.500,1.500 0 0 0 0,93.500L0,91.500 A1.500,1.500 0 0 0 0,88.500L0,86.500 A1.500,1.500 0 0 0 0,83.500L0,81.500 A1.500,1.500 0 0 0 0,78.500L0,76.500 A1.500,1.500 0 0 0 0,73.500L0,71.500 A1.500,1.500 0 0 0 0,68.500L0,66.500 A1.500,1.500 0 0 0 0,63.500L0,61.500 A1.500,1.500 0 0 0 0,58.500L0,56.500 A1.500,1.500 0 0 0 0,53.500L0,51.500 A1.500,1.500 0 0 0 0,48.500L0,46.500 A1.500,1.500 0 0 0 0,43.500L0,41.500 A1.500,1.500 0 0 0 0,38.500L0,36.500 A1.500,1.500 0 0 0 0,33.500L0,31.500 A1.500,1.500 0 0 0 0,28.500L0,26.500 A1.500,1.500 0 0 0 0,23.500L0,21.500 A1.500,1.500 0 0 0 0,18.500L0,16.500 A1.500,1.500 0 0 0 0,13.500L0,11.500 A1.500,1.500 0 0 0 0,8.500L0,6.500 A1.500,1.500 0 0 0 0,3.500L0,1.500 A1.500,1.500 0 0 0 1.500,0Z";

const GOLDEN_SILHOUETTE: Record<Exclude<Tier, "dot">, { minWidth: number; nx: number; ny: number; r: number; path: string }> = {
  chip: { minWidth: 15, nx: 5, ny: 6, r: 6, path: SIL_5x6 },
  xs: { minWidth: 20, nx: 5, ny: 6, r: 6, path: SIL_5x6 },
  s: { minWidth: 25, nx: 5, ny: 6, r: 6, path: SIL_5x6 },
  m: { minWidth: 40, nx: 10, ny: 12, r: 3, path: SIL_10x12 },
  l: { minWidth: 80, nx: 15, ny: 18, r: 2, path: SIL_15x18 },
  xl: { minWidth: 160, nx: 20, ny: 24, r: 1.5, path: SIL_20x24 },
};

const GOLDEN_TIER_FOR: [number, Tier][] = [
  [0, "dot"], [14.99, "dot"], [15, "chip"], [19.99, "chip"], [20, "xs"], [24.99, "xs"], [25, "s"], [30, "s"],
  [39.99, "s"], [40, "m"], [50, "m"], [79.99, "m"], [80, "l"], [120, "l"], [159.99, "l"], [160, "xl"], [200, "xl"], [1000, "xl"],
];

// letter id → degrees; the four values each appear
const GOLDEN_TILT: [string, number][] = [
  ["00000000-0000-4000-8000-000090000000", -3],
  ["00000000-0000-0000-0000-000000000000", -1.5],
  ["3f2b8c1e-6a4d-4e2f-9b7a-1c5d8e0f2a61", 1.5],
  ["e8b1f6c3-2d47-4a95-b06e-3c9a5d1f7b24", 3],
  ["9c41e2b7-0f5a-4d83-b6e1-7a2c9d4f0e36", 3],
];

// hex → [softHex, groundHex]; outside's green channel is the one exact half (125 + 130 × 0.55 = 196.5)
const GOLDEN_COLOUR: [string, string, string][] = [
  ["#5B3B8C", "#B5A7CB", "#7C62A3"], // never-told
  ["#2A3576", "#9FA4C1", "#555D91"], // cant-sleep
  ["#2F7D4F", "#A1C5B0", "#599772"], // outside: half up (#A1C4B0 under Python's half-to-even)
];

/* ── tiers ───────────────────────────────────────────────────────────── */

for (const [w, t] of GOLDEN_TIER_FOR) ok(`tierFor(${w}) = ${t}`, F.tierFor(w) === t);
ok("tierFor(NaN) = dot", F.tierFor(Number.NaN) === "dot");
ok("the tier table is in width order and starts every tier where tierFor does",
  F.STAMP_TIERS.every((s, i) => (i === 0 || s.minWidth > F.STAMP_TIERS[i - 1].minWidth) && (i === 0 || F.tierFor(s.minWidth) === s.tier)));
ok("bites are always 5:6 and r = 0.3 × pitch",
  F.STAMP_TIERS.filter((s) => s.nx).every((s) => s.nx * 6 === s.ny * 5 && Math.abs(s.r - 0.3 * (100 / s.nx)) < 1e-9));
ok("no hole is under 1.5pt at the narrowest width of its tier (the chip's 1.8pt is the smallest)",
  F.STAMP_TIERS.filter((s) => s.nx).every((s) => (2 * s.r * s.minWidth) / 100 >= 1.5 - 1e-9) && Math.abs((2 * 6 * 15) / 100 - 1.8) < 1e-9);
ok("paper from S up; the field is the stamp at chip and XS", same(F.STAMP_TIERS.map((s) => s.paper), [false, false, false, true, true, true, true]));
ok("the motif: none, none, the xs cut, then the art", same(F.STAMP_TIERS.map((s) => s.motif), ["none", "none", "xs", "art", "art", "art", "art"]));
ok("grounds from M up", same(F.STAMP_TIERS.map((s) => s.ground), [false, false, false, false, true, true, true]));
ok("soft: none below S, S drops its small marks, M up keeps all", same(F.STAMP_TIERS.map((s) => s.soft), ["none", "none", "none", "s", "all", "all", "all"]));
ok("tilt and postmark only from M up", same(F.STAMP_TIERS.map((s) => s.delivered), [false, false, false, false, true, true, true]));
ok("strokeU: 4.31u where the floor doesn't bind (50 wide)", F.strokeU(50) === 4.31);
ok("strokeU: XS 20 wide never under 1.5pt (7.5u)", Math.abs(F.strokeU(20) - 7.5) < 1e-9);
ok("strokeU: S 25 wide never under 1.25pt (5u)", Math.abs(F.strokeU(25) - 5) < 1e-9);
ok("stampHeight is 5:6", F.stampHeight(50) === 60 && F.stampHeight(15) === 18 && F.stampHeight(40) === 48 && F.stampHeight(25) === 30);

/* ── the silhouette ──────────────────────────────────────────────────── */

for (const [tier, g] of Object.entries(GOLDEN_SILHOUETTE) as [Exclude<Tier, "dot">, (typeof GOLDEN_SILHOUETTE)["m"]][]) {
  const spec = F.tierSpec(tier);
  ok(`${tier}: nx ${g.nx} ny ${g.ny} r ${g.r} from ${g.minWidth}pt`, spec.nx === g.nx && spec.ny === g.ny && spec.r === g.r && spec.minWidth === g.minWidth);
  ok(`${tier}: silhouetteForTier = the golden path`, F.silhouetteForTier(tier) === g.path);
  ok(`${tier}: silhouettePath(${g.minWidth}) = the golden path`, F.silhouettePath(g.minWidth) === g.path);
  const arcs = (g.path.match(/A/g) ?? []).length;
  ok(`${tier}: ${2 * (g.nx - 1) + 2 * (g.ny - 1) + 4} arcs (every bite, four corner notches)`, arcs === 2 * (g.nx - 1) + 2 * (g.ny - 1) + 4);
}
ok("the Today card (50) draws the M silhouette", F.silhouettePath(F.STAMP_LADDER.todayCard.w) === SIL_10x12);
ok("silhouetteFor(10, 12) is the M golden too", F.silhouetteFor(10, 12) === SIL_10x12);
ok("below 15pt there is no silhouette (the dot)", F.silhouettePath(14) === "" && F.silhouetteForTier("dot") === "");
ok("every silhouette starts at the first corner notch and closes", Object.values(GOLDEN_SILHOUETTE).every((g) => g.path.startsWith(`M${g.r.toFixed(3)},0L`) && g.path.endsWith(`,0Z`)));
ok("every silhouette stays on the 100 × 120 box", Object.values(GOLDEN_SILHOUETTE).every((g) => (g.path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number).every((n) => n >= 0 && n <= 120)));

/* ── the window ──────────────────────────────────────────────────────── */

ok("windowRect from S up: x 10 y 10, 80 × 100 (4:5)", [25, 50, 80, 200].every((w) => same(F.windowRect(w), { x: 10, y: 10, width: 80, height: 100 })));
ok("windowRect at chip and XS: the whole box", [15, 20].every((w) => same(F.windowRect(w), { x: 0, y: 0, width: 100, height: 120 })));
ok("the safe area is the window inset 8u", same(F.STAMP_SAFE_AREA, { x: 18, y: 18, width: 64, height: 84 }));
ok("the motif box: 62u square centred, centre y 58", F.STAMP_MOTIF_BOX.x + F.STAMP_MOTIF_BOX.width / 2 === 50 && F.STAMP_MOTIF_BOX.y + F.STAMP_MOTIF_BOX.height / 2 === 58 && F.STAMP_MOTIF_BOX.width === 62);

/* ── series grounds ──────────────────────────────────────────────────── */

const CATS = ["confessions", "almosts", "latenights", "small", "becoming", "missing"];
ok("six grounds, one per category", CATS.every((c) => F.groundPath(c).startsWith("M") && F.groundPath(c).endsWith("Z")) && Object.keys(F.STAMP_GROUNDS).length === 6);
ok("every ground lies inside the window (its points; the arcs' extremes checked below)", CATS.every((c) => {
  const nums = (F.groundPath(c).replace(/A[\d.,\s]+? 0 [01] [01] /g, "M").match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  return nums.every((n) => n >= 10 && n <= 110);
}));
ok("spotlight disc: r 30 at 50,58 (x 20–80, y 28–88)", F.groundPath("confessions") === "M20,58A30,30 0 1 0 80,58A30,30 0 1 0 20,58Z");
ok("low sun: a half disc r 36 on the window floor (top y 74)", F.groundPath("almosts") === "M14,110A36,36 0 0 1 86,110Z");
ok("far lamp: the quarter disc r 38 the window leaves of the circle at 90,10", F.groundPath("missing") === "M90,10V48A38,38 0 0 1 52,10Z");
ok("an unknown category has no ground (and no prototype key leaks through)", F.groundPath("nope") === "" && F.groundPath("toString") === "" && F.groundPath("") === "");

/* ── colour ──────────────────────────────────────────────────────────── */

for (const [hex, soft, ground] of GOLDEN_COLOUR) {
  ok(`softHex(${hex}) = ${soft}`, F.softHex(hex) === soft);
  ok(`groundHex(${hex}) = ${ground}`, F.groundHex(hex) === ground);
}
ok("mixHex reads lower case and a missing #", F.mixHex("5b3b8c", "#ffffff", 0.55) === "#B5A7CB");
ok("mixHex: t 0 and t 1 are the ends", F.mixHex("#123456", "#FFFFFF", 0) === "#123456" && F.mixHex("#123456", "#FFFFFF", 1) === "#FFFFFF");
ok("a colour that isn't #RRGGBB reads as the fallback tint", F.softHex("purple") === F.softHex(F.STAMP_FALLBACK_HEX));
ok("paper: white, Midnight #ECE9F4", F.paperHex(false) === "#FFFFFF" && F.paperHex(true) === "#ECE9F4");

/* ── keyline and rim ─────────────────────────────────────────────────── */

const KL = (w: number) => ({ kind: "keyline", color: "#1E1B35", opacity: 0.4, widthPt: w });
ok("light keyline: S 0.75, M 1, L 1.25, XL 1.5pt, ln at 40%",
  same(F.keyline(false, "s"), KL(0.75)) && same(F.keyline(false, "m"), KL(1)) && same(F.keyline(false, "l"), KL(1.25)) && same(F.keyline(false, "xl"), KL(1.5)));
ok("light: no keyline at chip, XS or the dot", F.keyline(false, "chip") === null && F.keyline(false, "xs") === null && F.keyline(false, "dot") === null);
ok("dark: chip and XS get the 1pt paper rim", ["chip", "xs"].every((t) => same(F.keyline(true, t as Tier), { kind: "rim", color: "#ECE9F4", opacity: 1, widthPt: 1 })));
ok("dark: nothing from S up (the paper makes the edge), nothing for the dot", ["s", "m", "l", "xl", "dot"].every((t) => F.keyline(true, t as Tier) === null));

/* ── tilt ────────────────────────────────────────────────────────────── */

const fnv1a = (s: string) => {
  let h = 2166136261;
  for (const b of new TextEncoder().encode(s)) {
    h ^= b;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
ok("hashStr is FNV-1a 32 (the published vectors: 'a', 'foobar')", hashStr("a") === 0xe40c292c && hashStr("foobar") === 0xbf9cf968);
for (const [id, deg] of GOLDEN_TILT) ok(`tilt(${id}) = ${deg}`, F.tilt(id) === deg && F.STAMP_TILTS[fnv1a(id) % 4] === deg);
ok("the four tilts, in order", same(F.STAMP_TILTS, [-3, -1.5, 1.5, 3]));
ok("the goldens cover all four tilts", new Set(GOLDEN_TILT.map(([, d]) => d)).size === 4);

/* ── postmark ────────────────────────────────────────────────────────── */

const pm = F.postmark(50);
ok("postmark at the card: 1.3 W long, right end over the stamp's left 20% (x −55 to 10)", pm.x0 === -55 && pm.x1 === 10);
ok("postmark at the card: the band is 0.73–0.95 H (43.8–57 of 60)", pm.top === 43.8 && pm.bottom === 57);
ok("postmark: four lines 3.6pt apart, amplitude 1.2", same(pm.axes, [45, 48.6, 52.2, 55.8]) && pm.paths.length === 4);
ok("postmark: 1pt lines", pm.strokePt === 1 && F.POSTMARK.strokePt === 1);
ok("postmark at the card: text may reach 0.72 H (43.2pt), just above the band's ink (43.3)", pm.maxTextBlockPt === 43.2);
ok("postmark: each line runs from x0 to x1, numbers to 2 decimals",
  pm.paths.every((d, j) => d.startsWith(`M-55,${pm.axes[j]}L`) && d.endsWith(`L10,${pm.axes[j]}`) && !/\.\d{3}/.test(d)));
ok("postmark: the crests and troughs touch the band's edges", (() => {
  const ys = pm.paths.flatMap((d) => [...d.matchAll(/,(-?[\d.]+)/g)].map((m) => Number(m[1])));
  return Math.min(...ys) === 43.8 && Math.max(...ys) === 57;
})());
const pm40 = F.postmark(40);
ok("postmark at 40: the band keeps its points, so text must stay above its ink (31.9)", pm40.top === 32.4 && pm40.bottom === 45.6 && pm40.maxTextBlockPt === 31.9);
ok("postmark ink: ln 28% light, Midnight ln 30%", same(F.postmarkInk(false), { color: "#1E1B35", opacity: 0.28 }) && same(F.postmarkInk(true), { color: "#D4D0EA", opacity: 0.3 }));
ok("postmark draws in over 180ms", F.POSTMARK.drawInMs === 180);

/* ── the ladder ──────────────────────────────────────────────────────── */

const L = F.STAMP_LADDER;
ok("every placement is 5:6", Object.values(L).every((p) => p.h === F.stampHeight(p.w) && p.w * 6 === p.h * 5));
ok("Today card: 50×60, tilt from the letter, postmark (owner, 2026-10-18)", same(L.todayCard, { w: 50, h: 60, tilt: "letter", postmark: true }));
ok("compose corner: 40×48 at the App Store page's 8°, no postmark (owner, 2026-10-18)", same(L.composeCorner, { w: 40, h: 48, tilt: 8, postmark: false }));
const TIER_OF: Partial<Record<keyof typeof L, Tier>> = {
  introEnvelope: "chip", liveActivityIsland: "xs", liveActivityLock: "s", routeStop: "xs", chosenPill: "xs", composeKey: "xs",
  composeCorner: "m", trayTile: "m", myLettersRow: "s", draftsRow: "s", kindredBeganUnder: "m", todayCard: "m", readerHead: "m",
  firstClassBanner: "m", firstClassCard: "l", meYourStamps: "l", preview: "l", shareCard: "xl", landingWall: "l",
  spokeInline: "m", spokeFeature: "l", guideReelSmall: "s", guideReelMedium: "m", guideReelLarge: "m",
};
ok("each placement falls in the tier the spec names", Object.entries(TIER_OF).every(([k, t]) => F.tierFor(L[k as keyof typeof L].w) === t));
ok("only delivered mail at M and up tilts by the letter and carries the postmark",
  Object.values(L).every((p) => (p.tilt === "letter") === p.postmark && (!p.postmark || F.tierSpecFor(p.w).delivered)));
ok("First Class: +3°", L.firstClassBanner.tilt === 3 && L.firstClassCard.tilt === 3);
ok("own stamps, trays, grids and lists: 0°", [L.trayTile, L.myLettersRow, L.draftsRow, L.meYourStamps, L.chosenPill, L.composeKey].every((p) => p.tilt === 0 && !p.postmark));
ok("the store master: 1000 × 1200 px", same(F.STAMP_STORE_MASTER_PX, { w: 1000, h: 1200 }));

/* ── design/stamps-v2/golden.json: the same goldens for Swift ────────── */

const GOLDEN_FILE = new URL("../../design/stamps-v2/golden.json", import.meta.url);
const goldenJson = {
  about:
    "Stamp v2 frame goldens (stamp-spec §2). silhouette[tier].path is the perforated 5:6 paper on the 0 0 100 120 box, " +
    "exactly as src/lib/stamp-frame.ts silhouettePath(width) writes it (build.py silhouette(nx, ny): 3 decimals, the straight " +
    "edges' 100 and 120 bare); Swift's KStampShape must produce the same strings. tierFor: [width pt, tier]. tilt: [letter id, " +
    "degrees] = [-3, -1.5, 1.5, 3][FNV-1a 32 of the id mod 4]. colour: [hex, softHex = mix(hex, white, 0.55), groundHex = " +
    "mix(hex, white, 0.20)], channels rounded half up. Checked by src/lib/stamp-frame.test.ts; rewritten by it with --write-golden.",
  box: [0, 0, 100, 120],
  silhouette: GOLDEN_SILHOUETTE,
  tierFor: GOLDEN_TIER_FOR,
  tilt: GOLDEN_TILT,
  colour: GOLDEN_COLOUR,
};
const goldenText = JSON.stringify(goldenJson, null, 1) + "\n";
if (process.argv.includes("--write-golden")) {
  if (fails) {
    console.log("FAIL not writing golden.json: the code doesn't match the goldens");
  } else {
    writeFileSync(GOLDEN_FILE, goldenText);
    console.log(`wrote ${GOLDEN_FILE.pathname}`);
  }
}
let onDisk = "";
try {
  onDisk = readFileSync(GOLDEN_FILE, "utf8");
} catch {
  onDisk = "";
}
ok("design/stamps-v2/golden.json holds these goldens", onDisk === goldenText);

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
process.exit(fails ? 1 : 0);
