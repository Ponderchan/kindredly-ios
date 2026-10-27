/* THE AURA ART'S MODEL — pure, no React Native, so both renderers and a node
   test can read it (node src/components/aura-art-model.test.ts).
   ────────────────────────────────────────────────────────────────────────
   What the Aura card's art slot shows (AuraCard AuraArtSlot) and the paint
   of the desk it draws when there is no picture (AuraScene), for the React
   Native slot and the SwiftUI one (modules/kindredly-ui Portable/Me/
   KAuraArt.swift, behind the "auraart" switch, on Me and in the aura room).
   - THE PLAN: the title's own scene (in colour once named, its sketch while
     the name forms), fitted by height and laid in as a print on a dark
     theme; otherwise the desk at the rung's fidelity (auraArtPlan).
   - THE FIT: how wide and tall the picture is in a slot (auraArtFit).
   - THE PAINT: every colour the desk is drawn with at a fidelity, an hour
     and a slot palette (deskFigure, figureFills, colourDots), which
     AuraScene draws with and the Swift record carries (nativeDeskPaint).
   The geometry itself (the window, the desk, someone bent over a page) is
   AuraScene's, copied number for number into the Swift drawing. */

import type { Fidelity } from "../lib/aura-ladder";
import { PALETTE, type Daylight } from "./courier-card-model";

/** the band when it holds one of the fifty scenes: 16:9 */
export const ART_RATIO = 9 / 16;
/** the desk's own drawing box (AuraScene's viewBox) */
export const DESK_W = 357;
export const DESK_H = 114;

export const D = {
  paper: "#FFFFFF", // before colour there is no colour: the drawing sits on the card's own paper
  pencil: "rgba(111,104,184,0.62)", // faint, but a drawing — not nothing
  ink: "#4A4390", // the sketch's one ink
  fill: "#F8F7FF",
  lines: "#1E1B35",
  brass: "#D8A63F",
} as const;

/** What the rungs before colour are drawn with: the ground, the waiting lines (drawn at 30% down
    to 15%), the pencil outline, the sketch's one ink and its fill. */
export type ScenePalette = { ground: string; lines: string; pencil: string; ink: string; fill: string };

/** The rungs on white paper (W33): the default, and every light theme's. */
export const SCENE_ON_PAPER: ScenePalette = { ground: D.paper, lines: D.lines, pencil: D.pencil, ink: D.ink, fill: D.fill };

/** The palette a slot draws with: the paper's, under what the slot passes, under its `ground`. */
export function scenePalette(pal?: Partial<ScenePalette>, ground?: string): ScenePalette {
  return { ...SCENE_ON_PAPER, ...pal, ...(ground ? { ground } : null) };
}

/** The figure's props (AuraScene's Figure): its one stroke, its fill ("none" for none), the
    colour rung's own colours, and the sun's fill (null: no sun yet, "none": an outline). */
export type FigurePaint = { stroke: string; fill: string; pane?: string; skin?: string; body?: string; hair?: string; paper?: string; sunFill: string | null };

/** The figure at a fidelity: none on the lines rung, a pencil outline with no sun, a sketch in
    one ink on its fill with an outlined sun, then colour (the hour's pane and sun, cream strokes
    at night, umber by day). */
export function deskFigure(fidelity: Fidelity, day: Daylight, p: ScenePalette): FigurePaint | null {
  if (fidelity === "pencil") return { stroke: p.pencil, fill: "none", sunFill: null };
  if (fidelity === "sketch") return { stroke: p.ink, fill: p.fill, sunFill: "none" };
  if (fidelity !== "colour") return null;
  const hour = PALETTE[day]; // the hour's light, for the colour rung
  const night = day === "night";
  /* colour: strokes go cream on the night sky, umber by day */
  return {
    stroke: night ? "#F3ECDA" : "#3A2E1E",
    fill: D.fill,
    pane: night ? "#3A3F5C" : hour.sky[1],
    skin: "#E8CDB2",
    body: night ? "#5B4E8A" : "#8A7454",
    hair: night ? "#2A2340" : undefined,
    paper: "#FFFFFF",
    sunFill: night ? "#FFE7BE" : (hour.sun ?? D.brass),
  };
}

/** The colour each part of the figure is filled with ("none" for no fill), and the sun's
    paint (null for no sun): the window's pane, the head's skin, the hair (the stroke's ink
    where the figure has a fill), the body, the page. */
export function figureFills(f: FigurePaint): { window: string; head: string; hair: string; body: string; page: string; sun: { fill: string; stroke: string } | null } {
  return {
    window: f.pane ?? f.fill,
    head: f.skin ?? f.fill,
    hair: f.hair ?? (f.fill === "none" ? "none" : f.stroke),
    body: f.body ?? f.fill,
    page: f.paper ?? f.fill,
    sun: f.sunFill === null ? null : { fill: f.sunFill, stroke: f.sunFill === "none" ? f.stroke : "none" },
  };
}

/** The colour rung's two small lights in the corner — stars at night, sun-dust by day. */
export function colourDots(day: Daylight): { fill: string; opacity: number } {
  const night = day === "night";
  return { fill: night ? "#FFE7BE" : D.brass, opacity: night ? 0.9 : 1 };
}

/* ── the slot ──────────────────────────────────────────────────────────── */

/** What the slot shows: one of the fifty pictures (its set and id, and how far in it sits), or
    the desk at a fidelity. */
export type AuraArtPlan = { kind: "picture"; set: "scenes" | "sketches"; id: string; inset: number } | { kind: "desk"; fidelity: Fidelity };

/** The title's scene in colour once named, its sketch while the name forms (only when the
    picture exists); otherwise the desk at the rung's fidelity. Midnight lays the picture in as a
    print (inset 6): the pictures are drawn on baked pale paper, and run flush to a dark slot they
    read as a light slab cut into it. */
export function auraArtPlan(
  art: { sceneId: string | null; fidelity: Fidelity },
  has: { scene: (id: string) => boolean; sketch: (id: string) => boolean },
  dark: boolean,
): AuraArtPlan {
  const inset = dark ? 6 : 0;
  if (art.sceneId && art.fidelity === "colour" && has.scene(art.sceneId)) return { kind: "picture", set: "scenes", id: art.sceneId, inset };
  if (art.sceneId && art.fidelity === "sketch" && has.sketch(art.sceneId)) return { kind: "picture", set: "sketches", id: art.sceneId, inset };
  return { kind: "desk", fidelity: art.fidelity };
}

/** A picture's size in a slot (AuraScene AuraArtFit): fitted by height, never cover-cropped, as
    wide as the height allows; `inset` in from every edge. Its corners are 8 when inset. */
export function auraArtFit(width: number, height: number, inset = 0): { width: number; height: number } {
  const w = Math.min(width - 2 * inset, Math.round((height - 2 * inset) / ART_RATIO));
  return { width: w, height: Math.round(w * ART_RATIO) };
}

/* ── the Swift record ──────────────────────────────────────────────────── */

/** A CSS colour as Swift reads it: "#RRGGBB" as it is, "rgba(r,g,b,a)" as "#RRGGBBAA", and
    none ("none", "", null) as "". Anything else is passed through (Swift draws it magenta). */
export function nativeColour(c: string | null | undefined): string {
  if (!c || c === "none") return "";
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(c.trim());
  if (!m) return c;
  const hex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0").toUpperCase();
  const a = m[4] === undefined ? 1 : Number(m[4]);
  return "#" + hex(+m[1]) + hex(+m[2]) + hex(+m[3]) + (a >= 1 ? "" : hex(a * 255));
}

/** Every colour the Swift desk is drawn with ("" for none). */
export type DeskPaintRecord = {
  fidelity: Fidelity;
  /** the colour rung's sky, top-left to bottom-right; "" on the others */
  sky0: string;
  sky1: string;
  /** the other rungs' ground */
  ground: string;
  /** the lines rung: the waiting lines and the small star */
  lines: string;
  brass: string;
  /** the figure ("" on the lines rung) */
  stroke: string;
  window: string;
  head: string;
  hair: string;
  body: string;
  page: string;
  /** the sun: whether it is drawn, its fill and its outline */
  sun: boolean;
  sunFill: string;
  sunStroke: string;
  /** the colour rung's two small lights ("" on the others) */
  dots: string;
  dotsOpacity: number;
};

export function nativeDeskPaint(fidelity: Fidelity, day: Daylight, p: ScenePalette): DeskPaintRecord {
  const fig = deskFigure(fidelity, day, p);
  const k = fig ? figureFills(fig) : null;
  const colour = fidelity === "colour";
  const dots = colourDots(day);
  return {
    fidelity,
    sky0: colour ? PALETTE[day].sky[0] : "",
    sky1: colour ? PALETTE[day].sky[1] : "",
    ground: nativeColour(p.ground),
    lines: nativeColour(p.lines),
    brass: D.brass,
    stroke: nativeColour(fig?.stroke),
    window: nativeColour(k?.window),
    head: nativeColour(k?.head),
    hair: nativeColour(k?.hair),
    body: nativeColour(k?.body),
    page: nativeColour(k?.page),
    sun: !!k?.sun,
    sunFill: nativeColour(k?.sun?.fill),
    sunStroke: nativeColour(k?.sun?.stroke),
    dots: colour ? dots.fill : "",
    dotsOpacity: colour ? dots.opacity : 0,
  };
}
