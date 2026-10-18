/* ═══════════════════════════════════════════════════════════════════════
   FROST v1 — a stranger's frosted window. THIS IS A CONTRACT, NOT A STYLE.
   ═══════════════════════════════════════════════════════════════════════
   Spec: .claude/ui10a-research/identity/identity-plan.md §2, variant A
   (frost + the shared head-and-shoulders silhouette; owner, 2026-10-18).

   WHAT IT IS. A generated glassine envelope window, not a picture of
   anyone. Before two people have signed, a stranger is shown as this
   window: a base tone and two soft lights picked from their user id, the
   SAME faint head-and-shoulders shape for everybody (it says "a person"
   and nothing about which person), a diagonal sheen and a thin white edge.
   There is nothing to unblur: no portrait id, no skin, no hair, no hijab
   ever goes into it, so "strangers never see your face" stays true. It is
   seeded by the uid every reader already holds for the mosaic, and it is
   the same for every reader, like the mosaic and No. were.

   ONE IMPLEMENTATION, EVERY RENDERER. This file decides every colour and
   every position; the renderers only draw gradients from the spec it
   returns (Swift KFrost receives it as a prop, React Native draws it with
   react-native-svg, the web's app/engine/frost.js is a line-for-line port).
   Nothing is blurred live, so a list of fifty windows costs fifty gradients.
   Swift never hashes. design/identity/frost.v1.vectors.json holds the spec
   of 32 ids in both themes, and both test suites (src/lib/frost.test.ts,
   the web's scripts/frost.test.mjs) must reproduce it exactly.

   FROZEN. Change the hash channel, the palette order, the bit fields or
   the rounding and every remembered window changes colour: people tell
   their pen pals apart by these windows (and by the courier name), so a
   change is a v2 with new vectors, never an edit.

   THE SEED · h = FNV-1a("frost:" + uid) (mosaic.ts hashStr; the channel is
   in its registry). The fields of h:
     h % 12                 the base tone
     bits  4–7  (% 11)      the first light: one of the 11 other tones
     bits  8–11 (% 10)      the second light: one of the 10 tones left
     bits 12–13             which corner the first light sits in (the
                            second takes the opposite corner)
     bits 14–16, 17–19      the first light's inset from its corner, x and y
     bits 20–22, 23–25      the second light's inset, x and y
     bits 26–28, 29–31      the two lights' radii

   THE PALETTE · twelve "dusk glass" tones, each with a Midnight (dark)
   variant: lavender, periwinkle, sea glass, mint, sage, butter, lilac,
   teal, slate, ice, plum, fog. No skin tones or browns (butter sits at a
   yellow hue well clear of the skin range, and its dark variant is olive,
   not brown), and no baby pink or baby blue, so no window ever reads as a
   gender. Picked from the identity-look mock (2026-10-16) and measured in
   CIELAB: the closest two tones in each theme are about ΔE 6 apart, and
   the mock's dark slate/fog pair (ΔE 4) and its butter were moved for it.

   COORDINATES · every position is in units of the window's side, (0, 0)
   the top-left corner, (1, 1) the bottom-right; every radius is a fraction
   of the side. The window is a square with corners at `corner` × side
   (0.25); everything is clipped to it. Draw in this order:
     1. base fill (also the whole tile under Reduce Transparency);
     2. each blob: a radial gradient centred at (x, y), radius r × side,
        its colour at `alpha` in the middle fading to 0 at the radius;
     3. the silhouette (variant A): the head, a circle; the shoulders, an
        ellipse whose radial gradient runs along both radii; both white at
        silhouette.alpha, flat out to `solid` of the radius, then to 0;
     4. the sheen: a linear gradient from the top-left corner to the
        bottom-right, white at sheen.alpha, reaching 0 at `to` of the way;
     5. the hairline: a `width`-pt white stroke at hairline.alpha, inset
        half its width, corners at (corner × side − width / 2).
   Increase Contrast adds an `edge`-pt line in the theme's ink outside the
   hairline. VoiceOver skips the window; the name and the mark carry it.

   SMALL WINDOWS (the orbit, 9–12pt) draw base + blobs + hairline only:
   below FROST_DETAIL_MIN_PT the silhouette and the sheen are mush, so
   frostLayers() says to leave them out. One rule for every place.

   Pure and import-light (only the hash), so plain node can lock it. */

import { hashStr } from "./mosaic";

/** FROST version: the spec, the palette and the bit fields above. */
export const FROST_V = 1 as const;

/** The twelve dusk-glass tones, in their frozen order (the base is FROST_TONES[h % 12]). */
export const FROST_TONES = ["lavender", "periwinkle", "seaglass", "mint", "sage", "butter", "lilac", "teal", "slate", "ice", "plum", "fog"] as const;
export type FrostTone = (typeof FROST_TONES)[number];

/** The tones on a light theme (Classic, Lavender, Paper). */
export const FROST_LIGHT: Readonly<Record<FrostTone, string>> = {
  lavender: "#C9C2EC",
  periwinkle: "#B4BCEA",
  seaglass: "#A9D8CF",
  mint: "#BFE6D2",
  sage: "#C4D3B8",
  butter: "#EAE4B0",
  lilac: "#D9C6E8",
  teal: "#9CC9CC",
  slate: "#B8BFD1",
  ice: "#CBDDE3",
  plum: "#C9AFD0",
  fog: "#D6D4DE",
};

/** The same tones on Midnight: darker, so the window sits in the dark page instead of glowing on it. */
export const FROST_DARK: Readonly<Record<FrostTone, string>> = {
  lavender: "#4A4478",
  periwinkle: "#3F4A7A",
  seaglass: "#35605A",
  mint: "#3C6650",
  sage: "#4A5A3E",
  butter: "#6E6438",
  lilac: "#5A4870",
  teal: "#2F585C",
  slate: "#37485C",
  ice: "#3F5666",
  plum: "#5D3B5C",
  fog: "#5A5860",
};

/* The shared silhouette and the finish: the same numbers for every window.
   The silhouette's white is 22% on light themes and 13% on Midnight — the
   same 22% on a dark tone doubles its contrast, so the dark theme gets its
   own step and both read alike (identity-look, variant A). */
const SIL_LIGHT = 0.22;
const SIL_DARK = 0.13;
const HEAD = { x: 0.5, y: 0.4, r: 0.235, solid: 0.62 } as const;
const SHOULDERS = { x: 0.5, y: 1.04, rx: 0.52, ry: 0.36, solid: 0.55 } as const;
const SHEEN = { alpha: 0.18, to: 0.55 } as const;
const HAIRLINE = { alpha: 0.35, width: 1 } as const;
const BLOB_ALPHA = 0.9;
const CORNER = 0.25;
const EDGE = 1.5;

/** Below this side (pt) a window draws base + blobs + hairline only (frostLayers). */
export const FROST_DETAIL_MIN_PT = 20;

/** One soft light: a radial gradient at (x, y) with radius r (unit coordinates), `alpha` at the centre → 0. */
export type FrostBlob = { tone: FrostTone; color: string; x: number; y: number; r: number; alpha: number };

/** Everything a renderer needs to draw one window. Positions and radii are in units of the side. */
export type FrostSpec = {
  v: typeof FROST_V;
  /** true = the Midnight tones and the dark silhouette step */
  dark: boolean;
  /** the base tone's name (for tests and logs; renderers use `base`) */
  tone: FrostTone;
  /** the window's fill, and the whole flat tile under Reduce Transparency */
  base: string;
  /** the two lights, drawn in this order over the base */
  blobs: readonly [FrostBlob, FrostBlob];
  /** the shared head-and-shoulders, white at `alpha`, the same for everyone */
  silhouette: {
    alpha: number;
    head: { x: number; y: number; r: number; solid: number };
    shoulders: { x: number; y: number; rx: number; ry: number; solid: number };
  };
  /** the diagonal glassine sheen, top-left → bottom-right, white `alpha` → 0 at `to` */
  sheen: { alpha: number; to: number };
  /** the window's edge: a white stroke `width` pt wide at `alpha`, inset half its width */
  hairline: { alpha: number; width: number };
  /** corner radius as a fraction of the side (a square with rounded corners) */
  corner: number;
  /** Increase Contrast: an ink edge this many pt wide */
  edge: number;
};

/* Four decimals: enough for any screen, and the same digits in every
   JavaScript engine, so the vectors compare exactly. */
const r4 = (v: number) => Math.round(v * 10000) / 10000;

/** a 3-bit field of h starting at `lo`, as 0..7 */
const bits3 = (h: number, lo: number) => (h >>> lo) & 7;
/** a light's inset from its corner: 0.18..0.32 of the side */
const inset = (n: number) => 0.18 + (n / 7) * 0.14;
/** a light's radius: 0.55..0.75 of the side */
const radius = (n: number) => 0.55 + (n / 7) * 0.2;

/** The base tone's index for a uid (FROST_TONES[i]): h % 12. */
export function frostToneIndex(uid: string): number {
  return hashStr("frost:" + uid) % 12;
}

/**
 * FROST v1: the frosted window for a stranger's user id, on a light or a dark
 * (Midnight) theme. A missing id is a deleted account, which has no window:
 * null, and the caller draws the veil.
 */
export function frostSpec(uid: string | null | undefined, dark = false): FrostSpec | null {
  if (!uid) return null;
  const h = hashStr("frost:" + uid);
  const pal = dark ? FROST_DARK : FROST_LIGHT;

  const t0 = h % 12;
  const t1 = (t0 + 1 + (((h >>> 4) & 15) % 11)) % 12;
  // the second light: the n-th of the ten tones that are neither the base nor the first light
  const rest = FROST_TONES.map((_, i) => i).filter((i) => i !== t0 && i !== t1);
  const t2 = rest[((h >>> 8) & 15) % 10];

  const corner = (h >>> 12) & 3;
  const right = (corner & 1) === 1;
  const bottom = (corner & 2) === 2;
  const x1 = inset(bits3(h, 14));
  const y1 = inset(bits3(h, 17));
  const x2 = inset(bits3(h, 20));
  const y2 = inset(bits3(h, 23));

  const blob = (i: number, x: number, y: number, r: number): FrostBlob => {
    const tone = FROST_TONES[i];
    return { tone, color: pal[tone], x: r4(x), y: r4(y), r: r4(r), alpha: BLOB_ALPHA };
  };
  const tone = FROST_TONES[t0];

  return {
    v: FROST_V,
    dark,
    tone,
    base: pal[tone],
    blobs: [
      blob(t1, right ? 1 - x1 : x1, bottom ? 1 - y1 : y1, radius(bits3(h, 26))),
      blob(t2, right ? x2 : 1 - x2, bottom ? y2 : 1 - y2, radius(bits3(h, 29))),
    ],
    silhouette: { alpha: dark ? SIL_DARK : SIL_LIGHT, head: { ...HEAD }, shoulders: { ...SHOULDERS } },
    sheen: { ...SHEEN },
    hairline: { ...HAIRLINE },
    corner: CORNER,
    edge: EDGE,
  };
}

/** Which layers a window of this side (pt) draws: the silhouette and the sheen only from FROST_DETAIL_MIN_PT up. */
export function frostLayers(sidePt: number): { silhouette: boolean; sheen: boolean } {
  const detail = sidePt >= FROST_DETAIL_MIN_PT;
  return { silhouette: detail, sheen: detail };
}
