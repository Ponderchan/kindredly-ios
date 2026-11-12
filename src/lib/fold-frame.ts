import type { FoldState } from "./fold";

/* THE FOLD, AS A LAYOUT (iPhone Duo, step 1 of the plan on the design canvas: "先不坏").
   lib/fold says what the system says; this turns it into the few numbers a screen needs, and it
   is the only place that decides them. Pure, locked by fold-frame.test.

   What the Duo simulator reports (iOS 27.2, read 2026-11-12), all in points:
     closed  window 466 x 678, safe right 84, the system's status area 84 x 174 in the top right
     open    window 951 x 669, safe right 84, the status area 84 x 124 in the top right
   So on both screens the system keeps a band down the right edge, with its clock at the top of
   it. Three things follow, and they are everything step 1 does:

   1. THE BAND IS THE TAB BAR'S. The bar stands in it as a rail, under the clock, where the hand
      holding the phone has its thumb (the canvas, "侧边导航").
   2. A PAGE KEEPS OUT OF THE BAND: `right`.
   3. ON THE INNER SCREEN A PAGE IS ONE COLUMN, NO WIDER THAN 560, IN THE MIDDLE OF WHAT IS LEFT:
      `left` and `right` grow by the same air. (Step 2 gives some pages two pages instead; they
      ask for `pages`.)

   On a phone that doesn't fold, before iOS 27.1, on a binary without the monitor, and with the
   "duo" switch off, the frame is PHONE: no band, no air, no rail, and every screen is laid out
   exactly as it always was. Nothing here reads the device's name. */

/** a single column is never wider than this on the inner screen */
export const COLUMN_MAX = 560;
/** the band has to be at least this wide to hold the rail (the bar is 62, with a 12 swell) */
const RAIL_MIN_BAND = 80;
/** on a screen whose top safe inset is 0 (the Duo's: its clock is in the band), what a page
    still keeps clear at the top, so nothing touches the glass's edge */
export const FOLD_TOP_AIR = 14;

export type FoldFrame = {
  /** the system says this is a folding phone, and the "duo" switch is on */
  duo: boolean;
  /** closed: the outer screen. open: the inner screen, wider than tall. tall: the inner screen,
      taller than wide. phone: not a folding phone. */
  posture: "phone" | "closed" | "open" | "tall";
  /** the hinge is part-way: the phone is standing half-folded */
  half: boolean;
  /** what a page keeps clear on its left and right */
  left: number;
  right: number;
  /** the system's band down the right edge, 0 for none */
  band: number;
  /** where the system's own status area ends in that band: the rail starts under it */
  bandTop: number;
  /** the tab bar stands in the band */
  rail: boolean;
  /** the window, for callers that have no other use for useWindowDimensions */
  width: number;
  height: number;
  /** two pages side by side: where the left one ends and the right one begins (the crease),
      and the right page's own right edge (the band's left). null when the window is one page. */
  pages: { crease: number; rightEnd: number } | null;
};

export function phoneFrame(width: number, height: number): FoldFrame {
  return { duo: false, posture: "phone", half: false, left: 0, right: 0, band: 0, bandTop: 0, rail: false, width, height, pages: null };
}

/** The frame for this window. `on` is the "duo" switch. */
export function foldFrame(fold: FoldState, window: { width: number; height: number }, on = true): FoldFrame {
  // the window as React Native has it (it changes in the same render as the layout); the
  // monitor's own reading only when there is none
  const width = window.width > 0 ? window.width : (fold.width ?? 0);
  const height = window.height > 0 ? window.height : (fold.height ?? 0);
  if (!on || fold.hinge === "none") return phoneFrame(width, height);

  const safeLeft = Math.max(0, fold.safe?.left ?? 0);
  const safeRight = Math.max(0, fold.safe?.right ?? 0);
  // the system's status area: what it covers at the top of the right edge
  const corner = (fold.occlusions ?? []).filter((o) => o.x + o.w >= width - 1 && o.y <= 1 && o.w >= 40);
  const band = corner.length ? safeRight : 0;
  const bandTop = corner.reduce((m, o) => Math.max(m, o.y + o.h), 0);

  const posture: FoldFrame["posture"] = fold.hinge === "closed" ? "closed" : width > height ? "open" : "tall";
  const half = fold.hinge === "partly";

  // one column in the middle of what the band leaves
  const room = width - safeLeft - Math.max(band, safeRight);
  const air = posture === "closed" ? 0 : Math.max(0, (room - COLUMN_MAX) / 2);
  const left = safeLeft + air;
  const right = Math.max(band, safeRight) + air;

  // two pages: the system's own division when it names one, else the middle of the window
  let pages: FoldFrame["pages"] = null;
  if (posture === "open") {
    const named = (fold.divisions ?? []).find((d) => d.h >= height - 1 && d.x > width * 0.3 && d.x < width * 0.7);
    const crease = named ? named.x + named.w / 2 : width / 2;
    pages = { crease, rightEnd: width - Math.max(band, safeRight) };
  }

  return { duo: true, posture, half, left, right, band, bandTop, rail: band >= RAIL_MIN_BAND, width, height, pages };
}

/** a page's last row keeps this far off a bend that runs across the screen (Swift KTodayGeometry.bendGap) */
export const BEND_GAP = 14;

/** The inner screen held upright and half-folded, like a small laptop: the bend runs across the
    middle, the upper half is the screen to read and the lower half is where the keyboard comes up. */
export function isLaptop(frame: FoldFrame): boolean {
  return frame.duo && frame.half && frame.posture === "tall";
}
