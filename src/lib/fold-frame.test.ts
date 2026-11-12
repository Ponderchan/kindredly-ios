/* run: node src/lib/fold-frame.test.ts */
import { COLUMN_MAX, foldFrame, isLaptop } from "./fold-frame.ts";
import type { FoldState } from "./fold.ts";

let failed = 0;
function ok(name: string, cond: boolean, got?: unknown): void {
  if (cond) console.log("  ok  " + name);
  else {
    failed++;
    console.log("FAIL  " + name + (got === undefined ? "" : "  got " + JSON.stringify(got)));
  }
}
const region = (x: number, y: number, w: number, h: number) => ({ x, y, w, h, top: 0, left: 0, bottom: 0, right: 0, active: true });

/* what the Duo simulator reported on 2026-11-12 (iOS 27.2) */
const CLOSED: FoldState = {
  hinge: "closed",
  angle: 0,
  width: 466,
  height: 678,
  safe: { top: 0, right: 84, bottom: 34, left: 0 },
  occlusions: [region(399.67, 29.33, 37, 37), region(382, 0, 84, 174)],
  divisions: [],
};
const OPEN: FoldState = {
  hinge: "open",
  angle: Math.PI,
  width: 951,
  height: 669,
  safe: { top: 0, right: 84, bottom: 34, left: 0 },
  occlusions: [region(867, 0, 84, 124)],
  divisions: [],
};

{
  const f = foldFrame({ hinge: "none", angle: 0 }, { width: 393, height: 852 });
  ok("a phone that doesn't fold: nothing changes", !f.duo && f.posture === "phone" && f.left === 0 && f.right === 0 && !f.rail && f.pages === null, f);
  ok("…and it still knows its window", f.width === 393 && f.height === 852, f);
}
{
  const f = foldFrame(CLOSED, { width: 466, height: 678 });
  ok("closed: the outer screen", f.duo && f.posture === "closed" && !f.half, f);
  ok("closed: the band is the system's 84, and the rail stands in it", f.band === 84 && f.rail, f);
  ok("closed: the rail starts under the clock, not under the camera", f.bandTop === 174, f);
  ok("closed: a page keeps out of the band and nothing more", f.left === 0 && f.right === 84, f);
  ok("closed: one page", f.pages === null, f);
}
{
  const f = foldFrame(OPEN, { width: 951, height: 669 });
  ok("open: the inner screen, wider than tall", f.posture === "open" && f.band === 84 && f.bandTop === 124 && f.rail, f);
  const column = f.width - f.left - f.right;
  ok("open: a page is one column of 560", Math.abs(column - COLUMN_MAX) < 0.01, { column, left: f.left, right: f.right });
  ok("open: in the middle of what the band leaves", Math.abs(f.left - (f.right - 84)) < 0.01, f);
  ok("open: two pages meet in the middle of the window, and the right one ends at the band", f.pages?.crease === 475.5 && f.pages?.rightEnd === 867, f.pages);
}
{
  const f = foldFrame({ ...OPEN, divisions: [region(470, 0, 12, 669)] }, { width: 951, height: 669 });
  ok("open: the system's own crease is used when it names one", f.pages?.crease === 476, f.pages);
}
{
  const f = foldFrame({ ...OPEN, hinge: "partly", angle: 1.9 }, { width: 951, height: 669 });
  ok("part-way open: half", f.half && f.posture === "open", f);
}
{
  const f = foldFrame({ ...OPEN, width: 669, height: 951, occlusions: [], safe: { top: 54, right: 0, bottom: 34, left: 0 } }, { width: 669, height: 951 });
  ok("the inner screen upright with no band: no rail, one centred column", f.posture === "tall" && !f.rail && f.band === 0 && Math.abs(f.width - f.left - f.right - COLUMN_MAX) < 0.01 && f.pages === null, f);
}
{
  const f = foldFrame(OPEN, { width: 951, height: 669 }, false);
  ok("the switch off: laid out as a phone", !f.duo && f.left === 0 && f.right === 0 && !f.rail, f);
}
{
  // a camera hole alone, no status area down the side: no band is claimed
  const f = foldFrame({ ...CLOSED, safe: { top: 59, right: 0, bottom: 34, left: 0 }, occlusions: [region(180, 12, 37, 37)] }, { width: 466, height: 678 });
  ok("no status area in the corner: no band, no rail", f.band === 0 && !f.rail && f.right === 0, f);
}

{
  // the small laptop: the inner screen upright and half-folded, and nothing else
  const upright = { ...OPEN, width: 669, height: 951, occlusions: [], safe: { top: 54, right: 0, bottom: 34, left: 0 } };
  const laptop = foldFrame({ ...upright, hinge: "partly" }, { width: 669, height: 951 });
  const flatUpright = foldFrame(upright, { width: 669, height: 951 });
  const halfWide = foldFrame({ ...OPEN, hinge: "partly" }, { width: 951, height: 669 });
  ok("laptop: upright and half-folded only", isLaptop(laptop) && !isLaptop(flatUpright) && !isLaptop(halfWide), { laptop, flatUpright, halfWide });
  ok("laptop: never with the switch off, never on the closed phone", !isLaptop(foldFrame({ ...upright, hinge: "partly" }, { width: 669, height: 951 }, false)) && !isLaptop(foldFrame(CLOSED, { width: 466, height: 678 })));
}

console.log(failed ? `\n${failed} FAILED` : "\nall passed");
if (failed) process.exit(1);
