/* THE STAMP AVATAR'S GEOMETRY (C2, 2026-10-19). Pure; components/StampAvatar draws it, and the
   Swift KStampAvatar (Portable/Kit/KFace.swift) uses the same numbers.

   From the owner's prototype: the frame sits 4pt outside the face's box (inset −4), so a row
   never moves when a face becomes a stamp; a 2.5pt dotted #D8A63F edge, radius 6, padding 5; the
   face inside is clipped to radius 3. At ≤32pt ("compact" 1) the edge is 1.5pt, the padding 3 and
   the denomination is hidden. A compact between 0 and 1 interpolates (the Swift Me header passes
   its collapse; RN callers leave it to the size).

     inner = size + 8 − 2 × (border + pad)   →  72 → 65 · 52 → 45 · 44 → 37 · 36 small → 35 · 22 small → 21 */

export const STAMP_GOLD = "#D8A63F";
export const STAMP_GOLD_TEXT = "#B8842A";
export const STAMP_CREAM = "#FFF8E8";
/** the ground on a dark theme (Midnight): gold at 15% */
export const STAMP_GROUND_DARK = "rgba(216,166,63,0.15)";
export const STAMP_OUTER_RADIUS = 6;
export const STAMP_INNER_RADIUS = 3;
/** a face at or under this size takes the small rule */
export const STAMP_SMALL_MAX = 32;

export type StampGeometry = {
  bleed: 4;
  /** the frame's full side: size + 8 */
  outer: number;
  border: number;
  pad: number;
  /** the face's side inside the frame */
  inner: number;
  /** the denomination prints (opacity 1 − compact; shown only while compact < 1) */
  showDenom: boolean;
  denomOpacity: number;
};

/** The frame for a face of `size`. compact: 0 full rule, 1 small rule; omitted = by size (≤32 → 1). */
export function stampGeometry(size: number, compact?: number): StampGeometry {
  const c = compact == null || !Number.isFinite(compact) ? (size <= STAMP_SMALL_MAX ? 1 : 0) : Math.min(1, Math.max(0, compact));
  const border = 2.5 - c * 1;
  const pad = 5 - c * 2;
  const outer = size + 8;
  return { bleed: 4, outer, border, pad, inner: outer - 2 * (border + pad), showDenom: c < 1, denomOpacity: 1 - c };
}
