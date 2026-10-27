/* Behaviour lock for the aura art's model (components/aura-art-model): which picture the Aura
   card's slot shows, how it fits, and every colour of the desk at each rung, hour and slot — the
   React Native slot (AuraCard AuraArtSlot, AuraScene) and the SwiftUI one ("auraart") draw from it.
   Not wired to a runner; run by hand from the repo root with plain node (it strips the types
   itself from Node 22.18 / 23.6 on):
     node src/components/aura-art-model.test.ts
   A load hook adds ".ts" to the extensionless relative imports Metro wants. Every line prints
   ok/FAIL and the process exits non-zero if any fail. */

import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});

const M = await import("./aura-art-model.ts");
const { PALETTE } = await import("./courier-card-model.ts");
const { auraSlotPalette } = await import("../screens/me/me-model.ts");

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

/* ── the plan ── */
const has = { scene: (id: string) => id === "quiet-observer", sketch: (id: string) => id === "quiet-observer" || id === "quiet-dreamer" };
ok("named, the scene exists: the picture in colour", JSON.stringify(M.auraArtPlan({ sceneId: "quiet-observer", fidelity: "colour" }, has, false)) === JSON.stringify({ kind: "picture", set: "scenes", id: "quiet-observer", inset: 0 }));
ok("forming, the sketch exists: the sketch", (() => { const p = M.auraArtPlan({ sceneId: "quiet-dreamer", fidelity: "sketch" }, has, false); return p.kind === "picture" && p.set === "sketches" && p.id === "quiet-dreamer"; })());
ok("a dark theme lays the picture in 6", (() => { const p = M.auraArtPlan({ sceneId: "quiet-observer", fidelity: "colour" }, has, true); return p.kind === "picture" && p.inset === 6; })());
ok("named but no such scene: the desk in colour", JSON.stringify(M.auraArtPlan({ sceneId: "loud-nobody", fidelity: "colour" }, has, false)) === JSON.stringify({ kind: "desk", fidelity: "colour" }));
ok("no noun: the desk at the rung's fidelity", ["lines", "pencil", "sketch", "colour"].every((f) => { const p = M.auraArtPlan({ sceneId: null, fidelity: f as never }, has, true); return p.kind === "desk" && p.fidelity === f; }));
ok("a sketch id on the pencil rung is still the desk (only colour and sketch take pictures)", M.auraArtPlan({ sceneId: "quiet-dreamer", fidelity: "pencil" }, has, false).kind === "desk");

/* ── the fit ── */
{
  const a = M.auraArtFit(320, 110, 0);
  ok("flush: fitted by height, 196 × 110 (110 / (9/16) = 195.6)", a.width === 196 && a.height === 110);
  const b = M.auraArtFit(320, 110, 6);
  ok("inset 6: 174 × 98", b.width === 174 && b.height === 98);
  const c = M.auraArtFit(150, 110, 0);
  ok("a narrow slot: as wide as it is, height from 16:9", c.width === 150 && c.height === 84);
}

/* ── the paint ── */
const paper = M.scenePalette({ ground: "#EEECFB" });
ok("a light slot keeps the paper's strokes on its own ground", paper.ground === "#EEECFB" && paper.lines === "#1E1B35" && paper.pencil === "rgba(111,104,184,0.62)" && paper.ink === "#4A4390" && paper.fill === "#F8F7FF");
ok("`ground` wins over the palette's", M.scenePalette({ ground: "#111111" }, "#222222").ground === "#222222");
ok("the lines rung has no figure", M.deskFigure("lines", "day", paper) === null);
{
  const f = M.figureFills(M.deskFigure("pencil", "day", paper)!);
  ok("pencil: an outline with no fills and no sun", f.window === "none" && f.head === "none" && f.hair === "none" && f.body === "none" && f.page === "none" && f.sun === null);
}
{
  const fig = M.deskFigure("sketch", "night", paper)!;
  const f = M.figureFills(fig);
  ok("sketch: one ink on its fill, the hair inked, an outlined sun", fig.stroke === "#4A4390" && f.window === "#F8F7FF" && f.hair === "#4A4390" && f.sun?.fill === "none" && f.sun?.stroke === "#4A4390");
}
for (const day of ["morning", "day", "evening", "night"] as const) {
  const fig = M.deskFigure("colour", day, paper)!;
  const f = M.figureFills(fig);
  const night = day === "night";
  ok(`colour, ${day}: strokes ${night ? "cream" : "umber"}`, fig.stroke === (night ? "#F3ECDA" : "#3A2E1E"));
  ok(`colour, ${day}: the pane is ${night ? "the night pane" : "the hour's lower sky"}`, f.window === (night ? "#3A3F5C" : PALETTE[day].sky[1]));
  ok(`colour, ${day}: skin, body, hair, page`, f.head === "#E8CDB2" && f.body === (night ? "#5B4E8A" : "#8A7454") && f.hair === (night ? "#2A2340" : "#3A2E1E") && f.page === "#FFFFFF");
  ok(`colour, ${day}: the sun is ${night ? "the moon's cream" : "the hour's"}`, f.sun?.fill === (night ? "#FFE7BE" : PALETTE[day].sun) && f.sun?.stroke === "none");
}
ok("the corner lights: cream at .9 at night, brass by day", M.colourDots("night").fill === "#FFE7BE" && M.colourDots("night").opacity === 0.9 && M.colourDots("day").fill === "#D8A63F" && M.colourDots("day").opacity === 1);

/* ── the Swift record ── */
ok("nativeColour: hex as it is", M.nativeColour("#1E1B35") === "#1E1B35");
ok("nativeColour: rgba as #RRGGBBAA", M.nativeColour("rgba(111,104,184,0.62)") === "#6F68B89E");
ok("nativeColour: opaque rgba as #RRGGBB", M.nativeColour("rgba(1, 2, 3, 1)") === "#010203" && M.nativeColour("rgb(255,0,16)") === "#FF0010");
ok("nativeColour: none is empty", M.nativeColour("none") === "" && M.nativeColour(null) === "" && M.nativeColour("") === "");
{
  const r = M.nativeDeskPaint("colour", "evening", paper);
  ok("record, colour: the hour's sky, the figure's paint, the corner lights", r.sky0 === PALETTE.evening.sky[0] && r.sky1 === PALETTE.evening.sky[1] && r.stroke === "#3A2E1E" && r.window === PALETTE.evening.sky[1] && r.sun && r.sunFill === "#FF9A57" && r.sunStroke === "" && r.dots === "#D8A63F" && r.dotsOpacity === 1);
  const pencil = M.nativeDeskPaint("pencil", "evening", paper);
  ok("record, pencil: no sky, the pencil stroke with its alpha, no fills, no sun", pencil.sky0 === "" && pencil.stroke === "#6F68B89E" && pencil.window === "" && pencil.hair === "" && !pencil.sun && pencil.dots === "");
  const lines = M.nativeDeskPaint("lines", "day", paper);
  ok("record, lines: the ground, the waiting lines and the brass star, no figure", lines.ground === "#EEECFB" && lines.lines === "#1E1B35" && lines.brass === "#D8A63F" && lines.stroke === "");
  const sketch = M.nativeDeskPaint("sketch", "day", paper);
  ok("record, sketch: an outlined sun", sketch.sun && sketch.sunFill === "" && sketch.sunStroke === "#4A4390");
}
{
  // Midnight's slot: the theme's light strokes (me-model auraSlotPalette), as both renderers draw them
  const tk = { soft2: "#2A2650", ink: "#F2F0FF", sub: "#B9B4E0", ind: "#8E86FF", sf: "#1E1B35" };
  const dark = M.scenePalette(auraSlotPalette(tk, true));
  const r = M.nativeDeskPaint("pencil", "night", dark);
  ok("dark slot: the pencil is sub at .62", r.stroke === "#B9B4E09E" && r.ground === "#2A2650");
  const s = M.nativeDeskPaint("sketch", "night", dark);
  ok("dark slot: the sketch is ind on sf", s.stroke === "#8E86FF" && s.window === "#1E1B35");
  ok("dark slot: the lines in ink", M.nativeDeskPaint("lines", "night", dark).lines === "#F2F0FF");
}

/* ── the Swift drawing keeps the React Native numbers ── */
{
  const swift = readFileSync(new URL("../../modules/kindredly-ui/ios/Portable/Me/KAuraArt.swift", import.meta.url), "utf8");
  const scene = readFileSync(new URL("./AuraScene.tsx", import.meta.url), "utf8");
  // every path the React Native desk draws is drawn by Swift from the same data
  const paths = [...scene.matchAll(/<Path d="([^"]+)"/g)].map((m) => m[1]);
  ok("AuraScene has its six figure paths and the star", paths.length === 7);
  ok("Swift draws every one of AuraScene's paths, verbatim", paths.every((d) => swift.includes(`"${d}"`)));
  ok("Swift: the 357 × 114 drawing box", swift.includes(`deskWidth: CGFloat = ${M.DESK_W}`) && swift.includes(`deskHeight: CGFloat = ${M.DESK_H}`));
}

console.log(fails ? fails + " failed" : "all ok");
if (fails) process.exit(1);
