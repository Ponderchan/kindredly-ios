/* FACE v1 lock (lib/mosaic). People recognise their correspondents by these
   faces, so a refactor that moves one square is a regression even if every
   screen still "looks fine". The golden masks below were produced by the
   MosaicId component as it stood before the maths moved out of it
   (ios-1.2.3 @ 777f2bd, 2026-10-16); they must never change.
   Not wired to a runner; run by hand from the repo root with plain node
   (it strips the types itself from Node 22.18 / 23.6 on):
     node src/lib/mosaic.test.ts */

import {
  COLS,
  EACH_WAY,
  ROWS,
  VEIL_MASK,
  cellsToMask,
  developFor,
  hashStr,
  inkedCells,
  inkedMask,
  maskHas,
  mosaicMask,
  visibleCells,
} from "./mosaic.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => { console.log((cond ? "ok  " : "FAIL") + " " + name); if (!cond) fails++; };

/* ── the root hash (FNV-1a 32) ── */
ok("hash: empty and missing are 0", hashStr("") === 0 && hashStr(null) === 0 && hashStr(undefined) === 0);
ok("hash: FNV-1a of 'a'", hashStr("a") === 3826002220);
ok("hash: namespaced seeds", hashStr("mosaic:anon") === 1169866475 && hashStr("post:x") === 2558476973 && hashStr("kindredly") === 2424713993);

/* ── golden masks: [develop 0, .15, .32, .5, .83, 1] per seed ── */
const DEVS = [0, 0.15, 0.32, 0.5, 0.83, 1];
const GOLDEN: Record<string, number[]> = {
  "a1b2c3d4-0000-4000-8000-000000000001": [0, 10485760, 10518656, 10649728, 11174030, 11178126],
  "7f3e9c1a-5b2d-4e8f-9a6c-1d2e3f4a5b6c": [0, 17, 5137, 4215825, 4281809, 4675025],
  "guide-you": [0, 17825792, 17825793, 17825937, 17837201, 17853585],
  "guide-them": [0, 327680, 2424832, 6619136, 15007904, 15008416],
  "guide-stranger": [0, 20480, 31744, 4226052, 4685316, 4685476],
  anon: [0, 557088, 557728, 568992, 585403, 11071163],
  x: [0, 14336, 178176, 702656, 29014464, 29014481],
  "demo-north": [0, 1048580, 18087940, 18284548, 18297156, 18299204],
  "demo-south": [0, 672, 328352, 12911264, 32834218, 32844458],
  "00000000-0000-0000-0000-000000000000": [0, 10240, 145408, 145424, 12728341, 14825493],
  "ffffffff-ffff-4fff-bfff-ffffffffffff": [0, 18, 27, 4194335, 4526175, 4526431],
  kindredly: [0, 17408, 17952, 575008, 902708, 902709],
};
for (const [seed, want] of Object.entries(GOLDEN)) {
  const got = DEVS.map((d) => mosaicMask(seed, d));
  ok(`golden ${seed}`, JSON.stringify(got) === JSON.stringify(want));
}

/* a fingerprint over 500 seeds × 6 develops, from the same pre-refactor code */
{
  let fp = 2166136261;
  for (let i = 0; i < 500; i++) for (const d of DEVS) fp = Math.imul(fp ^ mosaicMask("u-" + i, d), 16777619) >>> 0;
  ok("fingerprint over 3000 faces", fp >>> 0 === 2826724926);
}

/* ── the veil: no one ── */
ok("veil mask is all 25 cells", VEIL_MASK === 0x1ffffff && VEIL_MASK === 33554431);
ok("null seed → veil", mosaicMask(null) === VEIL_MASK && mosaicMask(undefined, 0.5) === VEIL_MASK && mosaicMask("", 1) === VEIL_MASK);

/* ── shape rules, over many seeds ── */
{
  let density = true, mirror = true, notVeil = true, nested = true, faintNotBlank = true, compat = true;
  for (let i = 0; i < 2000; i++) {
    const seed = "seed-" + i;
    const cells = inkedCells(seed);
    if (cells.size < 8 || cells.size > 16) density = false;
    const full = mosaicMask(seed, 1);
    if (full === VEIL_MASK) notVeil = false;
    if (full !== inkedMask(seed) || full !== cellsToMask(cells)) compat = false;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (maskHas(full, r, c) !== maskHas(full, r, COLS - 1 - c)) mirror = false;
    // a face only ever gains cells as it develops, and they are its own
    let prev = 0;
    for (const d of DEVS) {
      const m = mosaicMask(seed, d);
      if ((m & prev) !== prev || (m & full) !== m) nested = false;
      prev = m;
    }
    if (mosaicMask(seed, 0.15) === 0) faintNotBlank = false;
  }
  ok("8..16 inked cells (density rule)", density);
  ok("a complete face is mirror-symmetric", mirror);
  ok("no real face is the veil", notVeil);
  ok("mosaicMask(seed, 1) = inkedMask = cellsToMask(inkedCells)", compat);
  ok("developing only adds the face's own cells", nested);
  ok("the faintest develop is never a blank plate", faintNotBlank);
}

/* ── develop clamps like the component did ── */
ok("develop > 1 is the whole face", mosaicMask("x", 7) === mosaicMask("x", 1));
ok("develop < 0 shows nothing", mosaicMask("x", -3) === 0);
ok("default develop is complete", mosaicMask("x") === mosaicMask("x", 1));
ok("visibleCells(…, 1) is inkedCells", JSON.stringify([...visibleCells("x", 1)].sort()) === JSON.stringify([...inkedCells("x")].sort()));

/* ── bit layout: r * 5 + c ── */
ok("bit (0,0) is 1", cellsToMask(["0,0"]) === 1);
ok("bit (4,4) is 1 << 24", cellsToMask(["4,4"]) === 1 << 24 && maskHas(1 << 24, 4, 4));
ok("bit (1,2) is 1 << 7", cellsToMask(["1,2"]) === 1 << 7 && maskHas(1 << 7, 1, 2) && !maskHas(1 << 7, 2, 1));
ok("out-of-grid keys are ignored", cellsToMask(["5,0", "0,5", "-1,0", "junk"]) === 0);

/* ── developFor: the one develop rule ── */
ok("0 letters → 0.15", developFor(0) === 0.15);
ok("each letter adds 0.17", Math.abs(developFor(2) - (0.15 + 0.85 * 0.4)) < 1e-12);
ok(`${EACH_WAY} letters → complete`, developFor(EACH_WAY) === 1 && developFor(40) === 1);
ok("revealed → complete", developFor(0, true) === 1);
ok("junk counts read as none", developFor(-2) === 0.15 && developFor(NaN) === 0.15);

if (fails) {
  console.log(`\n${fails} failing`);
  process.exit(1);
}
console.log("\nall passing");
