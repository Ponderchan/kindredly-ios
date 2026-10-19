import { memo, useEffect, useSyncExternalStore } from "react";
import { AccessibilityInfo, View } from "react-native";
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "../lib/theme";
import { COLS, ROWS, maskHas } from "../lib/mosaic";
import { frostLayers, type FrostSpec } from "../lib/frost";
import type { WhoFace } from "../lib/stranger-who";
import { StampAvatar } from "./StampAvatar";

/* ═══════════════════════════════════════════════════════════════════════
   A STRANGER'S FROSTED WINDOW, DRAWN BY REACT NATIVE (identity Phase 1).
   ═══════════════════════════════════════════════════════════════════════
   FROST v1 — the hash, the twelve dusk-glass tones, where the two lights
   sit and how big they are, the shared head-and-shoulders, the sheen and
   the hairline — is decided in lib/frost and nowhere else. This file only
   lays the spec's gradients on top of each other, in the order lib/frost's
   header gives, so the Swift KFrost and the web's Frost, reading the same
   spec, draw the same window for the same person on every screen:

     1. the base fill;
     2. the two lights: radial gradients, their colour at `alpha` in the
        middle fading to nothing at the radius;
     3. the silhouette (variant A, the owner's pick of 2026-10-18): a head
        and a pair of shoulders in white at silhouette.alpha, flat out to
        `solid` of the radius, then fading — the same shape for everyone,
        so it says "a person" and nothing about which;
     4. the sheen: white from the top-left corner, gone `to` of the way to
        the bottom-right;
     5. the hairline: a thin white edge, inset half its width.
   Everything is clipped to the rounded square (corners at 25% of the side).
   No live blur anywhere: a list of fifty windows is fifty small SVGs.

   ONE RULE FOR SMALL WINDOWS. Under lib/frost's FROST_DETAIL_MIN_PT (20pt
   — the orbit's 17.6, the folded row's faces) the silhouette and the sheen
   would be mush, so frostLayers() drops them and the window is the base,
   the two lights and the hairline. The rule is lib/frost's, not a number
   here, so every renderer drops them at the same size.

   ACCESSIBILITY. Reduce Transparency gives a flat tile in the base colour
   (no lights, no white, no sheen); Increase Contrast (iOS's darker system
   colours) adds lib/frost's `edge` (1.5pt) in the theme's ink round the
   window, inside its bounds, with the hairline moved in past it. VoiceOver
   never lands on a window: the name, the mark and the sign beside it carry
   the meaning, so every window is hidden from it.

   ALSO HERE, so a screen draws a stranger's face slot with one component:
   WhoFaceView takes lib/stranger-who's WhoFace (the mosaic with the switch
   off, the frost with it on, the veil for no one) and the switch-on veil
   for a deleted account: a flat tile, the same for every ghost because it
   claims nothing (plan §1 1b). With the switch off the screens keep their
   own mosaic drawing exactly as it was; WhoFaceView's mosaic is only for a
   slot that is already in the new shape. */

/* ── Reduce Transparency and Increase Contrast, followed for every window ──
   One pair of listeners for the whole app, started by the first window
   drawn; each window reads the pair as one number so a change redraws only
   when something changed. */
let reduceTransparency = false;
let moreContrast = false;
let following = false;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((f) => f());
const snapshot = () => (reduceTransparency ? 1 : 0) | (moreContrast ? 2 : 0);
function follow(): void {
  if (following) return;
  following = true;
  AccessibilityInfo.isReduceTransparencyEnabled()
    .then((v) => {
      reduceTransparency = v;
      changed();
    })
    .catch((e) => console.log("[frost] Reduce Transparency couldn't be read; drawing the full window:", e));
  AccessibilityInfo.isDarkerSystemColorsEnabled()
    .then((v) => {
      moreContrast = v;
      changed();
    })
    .catch((e) => console.log("[frost] Increase Contrast couldn't be read; drawing without the ink edge:", e));
  AccessibilityInfo.addEventListener("reduceTransparencyChanged", (v) => {
    reduceTransparency = v;
    changed();
  });
  AccessibilityInfo.addEventListener("darkerSystemColorsChanged", (v) => {
    moreContrast = v;
    changed();
  });
}
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
};

/** The two settings that change how a window is drawn: Reduce Transparency (flat) and Increase Contrast (the ink edge). */
export function useFrostAccessibility(): { flat: boolean; edge: boolean } {
  useEffect(follow, []);
  const s = useSyncExternalStore(subscribe, snapshot);
  return { flat: (s & 1) === 1, edge: (s & 2) === 2 };
}

/**
 * One frosted window, `size` points square. `ring` draws "your turn" round
 * it (the orbit, the legend): a 1.5pt line in that colour, 1pt clear of the
 * window, outside its box (the layout is the window's size alone).
 */
export const Frost = memo(function Frost({ spec, size, ring }: { spec: FrostSpec; size: number; ring?: string | null }) {
  const { t: tk } = useTheme();
  const a11y = useFrostAccessibility();
  const corner = spec.corner * size;
  const layers = frostLayers(size);
  const edge = a11y.edge ? spec.edge : 0;
  const hw = spec.hairline.width;
  const sil = spec.silhouette;
  const { head, shoulders } = sil;
  const fade = (id: string, color: string, alpha: number, solid = 0) => (
    <RadialGradient id={id} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
      <Stop offset={0} stopColor={color} stopOpacity={alpha} />
      <Stop offset={solid} stopColor={color} stopOpacity={alpha} />
      <Stop offset={1} stopColor={color} stopOpacity={0} />
    </RadialGradient>
  );

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {a11y.flat ? (
          <Rect x={0} y={0} width={size} height={size} rx={corner} ry={corner} fill={spec.base} />
        ) : (
          <>
            <Defs>
              <ClipPath id="window">
                <Rect x={0} y={0} width={size} height={size} rx={corner} ry={corner} />
              </ClipPath>
              {fade("b0", spec.blobs[0].color, spec.blobs[0].alpha)}
              {fade("b1", spec.blobs[1].color, spec.blobs[1].alpha)}
              {layers.silhouette && fade("head", "#FFFFFF", sil.alpha, head.solid)}
              {layers.silhouette && fade("shoulders", "#FFFFFF", sil.alpha, shoulders.solid)}
              {layers.sheen && (
                <LinearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset={0} stopColor="#FFFFFF" stopOpacity={spec.sheen.alpha} />
                  <Stop offset={spec.sheen.to} stopColor="#FFFFFF" stopOpacity={0} />
                </LinearGradient>
              )}
            </Defs>
            <G clipPath="url(#window)">
              <Rect x={0} y={0} width={size} height={size} fill={spec.base} />
              {spec.blobs.map((b, i) => (
                // a circle's own box is its gradient's box, so the gradient's 50% is the light's radius
                <Circle key={i} cx={b.x * size} cy={b.y * size} r={b.r * size} fill={`url(#b${i})`} />
              ))}
              {layers.silhouette && (
                <>
                  <Ellipse cx={shoulders.x * size} cy={shoulders.y * size} rx={shoulders.rx * size} ry={shoulders.ry * size} fill="url(#shoulders)" />
                  <Circle cx={head.x * size} cy={head.y * size} r={head.r * size} fill="url(#head)" />
                </>
              )}
              {layers.sheen && <Rect x={0} y={0} width={size} height={size} fill="url(#sheen)" />}
            </G>
            <Rect
              x={edge + hw / 2}
              y={edge + hw / 2}
              width={size - 2 * edge - hw}
              height={size - 2 * edge - hw}
              rx={Math.max(0, corner - edge - hw / 2)}
              ry={Math.max(0, corner - edge - hw / 2)}
              fill="none"
              stroke="#FFFFFF"
              strokeOpacity={spec.hairline.alpha}
              strokeWidth={hw}
            />
          </>
        )}
        {edge > 0 && (
          <Rect x={edge / 2} y={edge / 2} width={size - edge} height={size - edge} rx={Math.max(0, corner - edge / 2)} ry={Math.max(0, corner - edge / 2)} fill="none" stroke={tk.ink} strokeWidth={edge} />
        )}
      </Svg>
      {!!ring && <RingRound size={size} corner={corner} color={ring} />}
    </View>
  );
});

/* "your turn": 1.5pt, 1pt clear of the window, its corners following the window's */
const RING = 1.5;
const RING_GAP = 1;
function RingRound({ size, corner, color }: { size: number; corner: number; color: string }) {
  const out = RING + RING_GAP;
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: -out, top: -out, width: size + 2 * out, height: size + 2 * out, borderRadius: corner + out, borderWidth: RING, borderColor: color }}
    />
  );
}

/**
 * No one behind the window (a deleted account, switch on): a flat tile in
 * the theme's soft2 with a hairline in its line, the same for every ghost.
 */
export function VeilTile({ size }: { size: number }) {
  const { t: tk } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size * 0.25, backgroundColor: tk.soft2, borderWidth: 1, borderColor: tk.line }}
    />
  );
}

/* a FACE v1 mask, painted (the off state of a slot already in the new shape) */
function MaskFace({ mask, size, ink }: { mask: number; size: number; ink: string }) {
  // five cells and four gaps of a fifth of a cell fill `size`
  const cell = size / (COLS + (COLS - 1) * 0.2);
  const gap = cell * 0.2;
  return (
    <View style={{ gap }}>
      {Array.from({ length: ROWS }).map((_, r) => (
        <View key={r} style={{ flexDirection: "row", gap }}>
          {Array.from({ length: COLS }).map((_, c) => (
            <View key={c} style={{ width: cell, height: cell, backgroundColor: maskHas(mask, r, c) ? ink : "transparent" }} />
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * A stranger's face slot as lib/stranger-who gives it, `size` points square:
 * the frosted window (switch on), the switch-on veil tile for no one, or the
 * mosaic at 70% of the slot (switch off, centred). `ring` is "your turn".
 */
export function WhoFaceView({ face, size, ring, denom }: { face: WhoFace; size: number; ring?: string | null; denom?: string | null }) {
  const { t: tk } = useTheme();
  /* a member (C2): the window, or the mask on a soft2 tile, square inside the gold stamp; the
     stamp replaces the turn ring (the screen's words still say whose turn it is). Never the veil */
  if (denom && face.kind !== "veil") {
    return (
      <StampAvatar size={size} denom={denom}>
        {({ size: inner }) =>
          face.kind === "frost" ? (
            <Frost spec={face.spec} size={inner} />
          ) : (
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: inner, height: inner, borderRadius: 3, backgroundColor: tk.soft2, alignItems: "center", justifyContent: "center" }}>
              <MaskFace mask={face.mask} size={inner * 0.7} ink={ring ?? tk.ink} />
            </View>
          )
        }
      </StampAvatar>
    );
  }
  if (face.kind === "frost") return <Frost spec={face.spec} size={size} ring={ring} />;
  if (face.kind === "veil") return <VeilTile size={size} />;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <MaskFace mask={face.mask} size={size * 0.7} ink={ring ?? tk.ink} />
    </View>
  );
}
