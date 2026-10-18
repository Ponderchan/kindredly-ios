import { TEXT_KEY_ROW, TOPBAR_H, nestTop } from "../parts/frame";
import { NEST_EGG } from "../parts/nest-egg";
import { GUTTER, KEY_H, SHADOW } from "../parts/tokens";

/* WHERE THINGS SIT ON SCREENS 1 AND 2, IN WINDOW POINTS (storyboard §2, §4, §6 · 1–2).
   ────────────────────────────────────────────────────────────────────────
   Screen 1 continues the launch frame for frame, so it can't be laid out by
   flexbox and measured afterwards: at its very first frame it has to know
   where the slide-1 stamp corner will be (the launch's mark flies there),
   where the pager's dot 1 is (the egg rolls to it) and where the app line
   goes (the wordmark glides down to it). So the doorstep is computed here,
   from the window and the safe area alone, the same way every time.

   Screen 2 is computed here too, for one reason: the egg is ONE element
   across the change from 1 to 2 (it rolls off its dot to the centre and
   grows to the hero), and from 2 to 3 (it hops and shrinks into the nest the
   runner draws). Each screen animates its own half of that from numbers
   both can compute, so the egg ends one screen exactly where the next one
   draws it.

   The key area is the frame's (parts/frame KeyArea): the primary key and one
   text-key row are always reserved above the home indicator, so its top is
   the same on every screen; everything here is laid out above it. */

export type Insets = { top: number; bottom: number };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** The top of the frame's key area (KeyArea: 10 above the key, the key with its shadow, 4, a text-key row, the bottom inset). */
export function keyAreaTop(sh: number, insets: Insets): number {
  return sh - (Math.max(insets.bottom, 16) + TEXT_KEY_ROW + 4 + KEY_H + SHADOW + 10);
}

/* ── screen 1 ── */

/** The card's tilt (storyboard §4: it rises "tilted −2°" and stays so). */
export const CARD_TILT = -2;
/** The card's corners, its ink edge (parts/tokens EDGE) and its hard shadow. */
export const CARD_RADIUS = 20;
/** The headline area always reserves two lines (§2 "The keys never move"). */
export const HEADLINE_H = 68;
/** The pager: the ground line, three dots, and the egg standing on the active one. */
export const PAGER_H = 46;
/** The gap between the dots IS one turn of the egg, so it stands upright on every dot (rolling: rotation = distance ÷ radius). */
export const PAGER_GAP = 64;
export const PAGER_EGG = 32;
export const EGG_ROLL_R = PAGER_GAP / (2 * Math.PI);
/** The wordmark at rest is the launch's "kindredly" at this scale (it glides down and shrinks; one element). */
export const WORD_SCALE = 0.7;
/** The launch's wordmark line box (LaunchAnimation WORD_TYPE: 40 / 46). */
export const WORD_LINE = 46;
export const APP_LINE_H = 42;

export type DoorLayout = {
  sw: number;
  sh: number;
  /** the card's box (the face; its hard shadow falls SHADOW to the right and below), before the tilt */
  card: { x: number; y: number; w: number; h: number };
  /** the top of the two-line headline */
  headTop: number;
  /** the ground line's y, its ends, and the three dots' x */
  ground: { y: number; x0: number; x1: number };
  dots: [number, number, number];
  /** the egg's box (PAGER_EGG square) when it stands on dot 0 */
  egg: { x: number; y: number; size: number };
  /** the wordmark's line box top at rest (its scaled box) and the app line's top */
  wordTop: number;
  appTop: number;
  /** the key area's top */
  keyTop: number;
};

export function doorLayout(sw: number, sh: number, insets: Insets): DoorLayout {
  const keyTop = keyAreaTop(sh, insets);
  const cardTop = insets.top + 36; // the chip sits half over the card's top edge
  const wordH = WORD_LINE * WORD_SCALE;
  const fixed = HEADLINE_H + PAGER_H + wordH + APP_LINE_H;
  const minGaps = 16 + 8 + 10 + 4 + 12;
  const avail = keyTop - cardTop;
  const h = clamp(avail - fixed - minGaps, 168, 232);
  const spare = Math.max(0, avail - fixed - minGaps - h);
  const headTop = cardTop + h + 16 + spare * 0.15;
  const pagerTop = headTop + HEADLINE_H + 8 + spare * 0.12;
  const groundY = pagerTop + PAGER_H - 8;
  const wordTop = pagerTop + PAGER_H + 10 + spare * 0.33; // the rest (0.4) stays above the keys
  const appTop = wordTop + wordH + 4;
  const cx = sw / 2;
  const dots: [number, number, number] = [cx - PAGER_GAP, cx, cx + PAGER_GAP];
  // EggArt's egg stands at 0.928 of its box (the polygon's foot at y 96 of the −110…110 box, ×0.98)
  const eggY = groundY - 2 - PAGER_EGG * 0.928;
  return {
    sw,
    sh,
    card: { x: GUTTER, y: cardTop, w: sw - 2 * GUTTER - SHADOW, h },
    headTop,
    ground: { y: groundY, x0: cx - PAGER_GAP - 46, x1: cx + PAGER_GAP + 46 },
    dots,
    egg: { x: dots[0] - PAGER_EGG / 2, y: eggY, size: PAGER_EGG },
    wordTop,
    appTop,
    keyTop,
  };
}

/** A point in the card's own coordinates (from the face's top-left) → the window, with the card at rest (tilted about its centre). */
export function cardToWindow(L: DoorLayout, px: number, py: number, tiltDeg = CARD_TILT): { x: number; y: number } {
  const { x, y, w, h } = L.card;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const a = (tiltDeg * Math.PI) / 180;
  const dx = px - w / 2;
  const dy = py - h / 2;
  return { x: cx + dx * Math.cos(a) - dy * Math.sin(a), y: cy + dx * Math.sin(a) + dy * Math.cos(a) };
}

/* ── screen 2 ── */

/** Screen 2's stack under the hero egg: the voice, the headline, the line, the four shells. */
export const EGG_STACK_UNDER = 234;

/** The hero egg on screen 2 (window points): up to 200, smaller on short phones. */
export function heroRect(sw: number, sh: number, insets: Insets): { x: number; y: number; size: number; offset: number } {
  const bodyTop = insets.top + TOPBAR_H;
  const bodyH = keyAreaTop(sh, insets) - bodyTop;
  const size = clamp(bodyH - EGG_STACK_UNDER - 40, 140, 200);
  const offset = Math.max(6, (bodyH - size - EGG_STACK_UNDER) * 0.4);
  return { x: (sw - size) / 2, y: bodyTop + offset, size, offset };
}

/** The runner's nest egg on 3–6 and 8 (window points): the NestEgg's egg box, at the top of the frame's nest slot. */
export function nestEggRect(sw: number, insets: Insets): { x: number; y: number; size: number } {
  return { x: (sw - NEST_EGG) / 2, y: nestTop(insets.top), size: NEST_EGG };
}

/* ── the egg's hand-over from 1 to 2 ──
   Screen 1 rolls its egg to screen 2's hero spot before it leaves; it leaves
   a note so screen 2 knows the egg arrived that way (and settles it instead
   of fading it in like a new thing). Read once. */
let eggNote: number | null = null;
export function leaveDoorstepEgg(): void {
  eggNote = Date.now();
}
export function takeDoorstepEgg(): boolean {
  const n = eggNote;
  eggNote = null;
  return n !== null && Date.now() - n < 2000;
}
