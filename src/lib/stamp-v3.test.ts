/* Behaviour lock for stamps v3 on the React Native side (owner, 2026-10-19; the contract is
   .claude/stamp-design/v3/INTEGRATION.md). It proves that what lib/stamp-frame's v3 section draws
   from data/stamp-art-v3 and data/stamps.ts is exactly what the kit drew:
     - design/stamps-v3/golden.json was cut by the kit's own tierSVG with the colours literal as the
       SVGs paint them, so it is independent of the importer's role mapping and of this file's code;
     - for every one of the 36 at every tier (and at each tier's edges), stampDrawListV3 gives the
       same elements, in the same order, with the same geometry, fill, stroke and width;
     - the tier rule, the dot, the frame-only fallback, the slot, the colours in stamps.ts (hex,
       nameLight, nameDark, the six category colours) and the rules on them (ink ≥ 4.5:1 on every
       hex, no hex literal in the art data), and that stamp-art-v3.ts and the golden file are what
       the importer writes from the SVGs today.
   Not wired to a runner; run by hand from the repo root with plain node:
     node src/lib/stamp-v3.test.ts
   A load hook adds ".ts" to the extensionless relative imports Metro wants. Every line prints ok/FAIL
   and the process exits non-zero if any fail. */

import { registerHooks } from "node:module";
import { readFileSync, existsSync } from "node:fs";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});

const F = await import("./stamp-frame.ts");
const A = await import("../data/stamp-art-v3.ts");

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

type GoldenEl = { layer: string; el: string; d?: string; cx?: number; cy?: number; r?: number; rx?: number; ry?: number; fill: string | null; stroke: string | null; width: number };
const G = JSON.parse(readFileSync(new URL("../../design/stamps-v3/golden.json", import.meta.url), "utf8")) as {
  ink: string;
  tintMix: number;
  tierFor: [number, string][];
  layers: Record<string, string[]>;
  tiltsByLetter: Record<string, boolean>;
  dotPt: number;
  fallbackHex: string;
  unknown: GoldenEl[];
  slot: { d: string; width: number; dash: number[]; cap: string; join: string; light: string; dark: string };
  bounds: { x0: number; y0: number; x1: number; y1: number };
  categories: Record<string, string>;
  colours: Record<string, { hex: string; tint: string; ink: string; nameLight: string; nameDark: string }>;
  draw: Record<string, Record<"xs" | "s" | "l", GoldenEl[]>>;
};

/* the stamps as data/stamps.ts lists them (read as text: it imports i18n, which imports React Native) */
const stampsText = readFileSync(new URL("../data/stamps.ts", import.meta.url), "utf8");
const STAMPS = [...stampsText.matchAll(/\{ id: "([\w-]+)", cat: "(\w+)", emoji: "[^"]*", color: "(#[0-9A-F]{6})", nameLight: "(#[0-9A-F]{6})", nameDark: "(#[0-9A-F]{6})"/g)].map((m) => ({
  id: m[1], cat: m[2], color: m[3], nameLight: m[4], nameDark: m[5],
}));
const CATS = [...stampsText.slice(stampsText.indexOf("export const STAMP_CATEGORIES"), stampsText.indexOf("export const STAMPS")).matchAll(/\{ id: "(\w+)", emoji: "[^"]*", color: "(#[0-9A-F]{6})"/g)].map((m) => ({ id: m[1], color: m[2] }));

/* the golden's shape for one drawn element (drop cap/join: always round, checked separately) */
const asGolden = (e: import("./stamp-frame").StampDrawEl): GoldenEl => {
  const g: Record<string, unknown> = { layer: e.layer, el: e.el };
  if (e.el === "path") g.d = e.d;
  else if (e.el === "circle") Object.assign(g, { cx: e.cx, cy: e.cy, r: e.r });
  else Object.assign(g, { cx: e.cx, cy: e.cy, rx: e.rx, ry: e.ry });
  return Object.assign(g, { fill: e.fill, stroke: e.stroke, width: e.width }) as GoldenEl;
};

/* ── stamps.ts: the bright palette ── */

ok("stamps.ts lists 36 stamps, each with color, nameLight and nameDark", STAMPS.length === 36);
ok("the golden covers the same 36, in the same order", same(Object.keys(G.draw), STAMPS.map((s) => s.id)));
ok("every stamp's colour is the palette's hex (golden colours, from palette.json via the kit)", STAMPS.every((s) => G.colours[s.id]?.hex === s.color));
ok("every nameLight / nameDark is the palette's name_classic / name_midnight", STAMPS.every((s) => G.colours[s.id].nameLight === s.nameLight && G.colours[s.id].nameDark === s.nameDark));
ok("six category colours, rung 3 of each family", CATS.length === 6 && CATS.every((c) => G.categories[c.id] === c.color));
const lin = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const lum = (h: string) => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
const cr = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
ok("ink #1E1B35 clears 4.5:1 on every stamp colour (the #tag's words, the eye rings)", STAMPS.every((s) => cr(F.STAMP_V3_INK, s.color) >= 4.5));
ok("white fails 4.5:1 on every stamp colour (never white words on a hex)", STAMPS.every((s) => cr("#FFFFFF", s.color) < 4.5));

/* ── colours ── */

ok("the ink role is #1E1B35, the tint mix 0.88", F.STAMP_V3_INK === G.ink && F.STAMP_V3_TINT_MIX === G.tintMix);
ok("stampTint is the kit's tintOf on all 36", STAMPS.every((s) => F.stampTint(s.color) === G.colours[s.id].tint));
ok("stampColoursV3: hex, ink, tint", same(F.stampColoursV3("#9774F0"), { hex: "#9774F0", ink: "#1E1B35", tint: "#F3EEFD" }));
ok("stampColoursV3 reads lower case and a missing #", same(F.stampColoursV3("9774f0"), F.stampColoursV3("#9774F0")));
ok("a missing or malformed colour reads as the fallback", F.stampColoursV3(null).hex === G.fallbackHex && F.stampColoursV3("purple").hex === G.fallbackHex && F.STAMP_FALLBACK_HEX === G.fallbackHex);
ok("stampRoleHex: none is null", F.stampRoleHex("none", F.stampColoursV3("#9774F0")) === null && F.stampRoleHex("ink", F.stampColoursV3("#9774F0")) === "#1E1B35");

/* ── tiers ── */

for (const [w, t] of G.tierFor) ok(`stampTierV3(${w}) = ${t}`, F.stampTierV3(w) === t);
ok("stampTierV3(NaN) = dot", F.stampTierV3(Number.NaN) === "dot");
for (const t of ["dot", "xs", "s", "l"] as const) {
  const spec = F.STAMP_V3_TIERS.find((s) => s.tier === t)!;
  ok(`${t}: layers ${G.layers[t].join(" ") || "(none)"}`, same(spec.layers, G.layers[t]) && same(F.stampLayersFor(spec.minWidth), G.layers[t]));
  ok(`${t}: ${G.tiltsByLetter[t] ? "delivered mail tilts by its letter" : "flat"}`, spec.delivered === G.tiltsByLetter[t] && F.stampTiltsAtV3(spec.minWidth) === G.tiltsByLetter[t]);
}
ok("the layers, in draw order", same(F.STAMP_V3_LAYERS, ["frame", "rims", "body", "marks", "face"]));
ok("the dot: 6pt", F.STAMP_DOT_PT === G.dotPt);
ok("the ladder keeps its sizes: Today card 40×48 by the letter, compose corner 40×48 at 8°, tray 30×36",
  same(F.STAMP_LADDER.todayCard, { w: 40, h: 48, tilt: "letter" }) && same(F.STAMP_LADDER.composeCorner, { w: 40, h: 48, tilt: 8 }) && F.STAMP_LADDER.trayTile.w === 30);
ok("every placement that tilts by the letter is at l (≥ 40)", Object.values(F.STAMP_LADDER).every((p) => p.tilt !== "letter" || F.stampTiltsAtV3(p.w)));

/* ── the drawings: every id × tier against the kit ── */

const WIDTHS: Record<"xs" | "s" | "l", number[]> = { xs: [15, 20, 24.99], s: [25, 30, 39.99], l: [40, 60, 80, 200] };
let drawn = 0;
const misses: string[] = [];
for (const s of STAMPS) {
  const art = A.STAMP_ART_V3[s.id as keyof typeof A.STAMP_ART_V3];
  if (!art) {
    misses.push(`${s.id}: no drawing in stamp-art-v3.ts`);
    continue;
  }
  for (const t of ["xs", "s", "l"] as const) {
    for (const w of WIDTHS[t]) {
      const list = F.stampDrawListV3(art, s.color, w);
      if (!same(list.map(asGolden), G.draw[s.id][t])) misses.push(`${s.id} at ${w}: differs from golden ${t}`);
      else if (!list.every((e) => e.cap === "round" && e.join === "round")) misses.push(`${s.id} at ${w}: a cap or join that isn't round`);
      else drawn++;
    }
  }
  if (F.stampDrawListV3(art, s.color, 14.99).length) misses.push(`${s.id}: draws something below 15`);
}
for (const m of misses.slice(0, 12)) console.log("     " + m);
ok(`all 36 draw exactly the kit's element lists at xs, s and l (${drawn} of ${36 * 10} widths)`, misses.length === 0);
ok("below 15pt nothing is drawn (the dot)", F.stampDrawListV3(A.STAMP_ART_V3["crush"], "#FAA7D8", 14).length === 0 && F.stampDrawListV3(null, null, 0).length === 0);
ok("the face keeps the eye rings first at s and l (ink circles before every disc)", STAMPS.every((s) => {
  const face = F.stampDrawListV3(A.STAMP_ART_V3[s.id as keyof typeof A.STAMP_ART_V3], s.color, 40).filter((e) => e.layer === "face");
  const firstNonRing = face.findIndex((e) => !(e.el === "circle" && e.fill === "#1E1B35" && face.some((d) => d.el === "circle" && d.fill !== "#1E1B35" && Math.abs(d.cx - e.cx) < 0.01 && Math.abs(d.cy - e.cy) < 0.01 && Math.abs(e.r - d.r - 2.5) < 0.01)));
  return firstNonRing === 2;
}));

/* ── the frame, the fallback and the slot ── */

ok("the data's frame is lib/stamp-frame's frame (path and the two elements)", A.STAMP_V3_FRAME_PATH === F.STAMP_V3_FRAME_D && same(A.STAMP_V3_FRAME, F.STAMP_V3_FRAME_ELS));
ok("every drawing shares that frame", Object.values(A.STAMP_ART_V3).every((a) => a && a.frame === A.STAMP_V3_FRAME));
ok("an id with no drawing draws the frame alone in the fallback colour (golden unknown)", same(F.stampDrawListV3(null, undefined, 40).map(asGolden), G.unknown) && same(F.stampDrawListV3(undefined, "nope", 30).map(asGolden), G.unknown));
ok("an id with no drawing but a known colour draws the frame in that colour", same(F.stampDrawListV3(null, "#9774F0", 20).map((e) => [e.fill, e.stroke]), [["#F3EEFD", "#F3EEFD"], ["#F3EEFD", "#1E1B35"]]));
ok("the slot: the frame path, 6u, dashed 4/10, round, #8A86A3 / #8F8BAA",
  F.STAMP_V3_SLOT.d === G.slot.d && F.STAMP_V3_SLOT.width === G.slot.width && same(F.STAMP_V3_SLOT.dash, G.slot.dash) && F.STAMP_V3_SLOT.cap === "round" && F.STAMP_V3_SLOT.join === "round" && F.STAMP_V3_SLOT.light === G.slot.light && F.STAMP_V3_SLOT.dark === G.slot.dark);
const B = F.STAMP_V3_FRAME_BOUNDS;
ok(`the paint stays in the box: x${G.bounds.x0}–${G.bounds.x1} y${G.bounds.y0}–${G.bounds.y1} (STAMP_V3_FRAME_BOUNDS + the break-out)`,
  G.bounds.x0 >= 0 && G.bounds.y0 >= 0 && G.bounds.x1 <= 100 && G.bounds.y1 <= 120 && B.x === G.bounds.x0 && B.x + B.width === G.bounds.x1 && B.y + B.height === G.bounds.y1 && G.bounds.y0 >= 8);

/* ── the data file itself ── */

const artText = readFileSync(new URL("../data/stamp-art-v3.ts", import.meta.url), "utf8");
ok("stamp-art-v3.ts holds no hex literal outside its comments (roles only)", !/#[0-9a-f]{6}/i.test(artText.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")));
ok("every element's paint is a role, every stroke has a width and round caps and joins", Object.values(A.STAMP_ART_V3).every((a) => a && F.STAMP_V3_LAYERS.every((L) => a[L].every((e) =>
  ["hex", "ink", "tint", "none"].includes(e.fill) && ["hex", "ink", "tint", "none"].includes(e.stroke) && (e.stroke === "none" ? e.width === undefined : e.width! > 0 && e.cap === "round" && e.join === "round")))));

/* ── fresh: the files are what the importer writes from the SVGs today ── */

const svgDir = new URL("../../.claude/stamp-design/v3/final/svg/", import.meta.url);
if (existsSync(new URL("cringe.svg", svgDir))) {
  const I = await import("../../scripts/import-stamp-art-v3.mjs");
  const r = I.importAll();
  ok("the importer reads all 36 SVGs (none missing, none rejected)", r.missing.length === 0 && r.rejected.length === 0);
  ok("stamp-art-v3.ts is up to date (node scripts/import-stamp-art-v3.mjs)", I.buildTs(r) === artText);
  ok("design/stamps-v3/golden.json is up to date", (await I.buildGolden(r)) === readFileSync(new URL("../../design/stamps-v3/golden.json", import.meta.url), "utf8"));
} else {
  console.log("skip the kit's SVGs aren't here (.claude/stamp-design/v3/final/svg); freshness not checked");
}

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
process.exit(fails ? 1 : 0);
