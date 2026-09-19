/* THE COURIER'S FAMILY — generator.
   One drawing (a flat bird, three-quarter front, cream belly, coloured beak and
   feet) in three skins, every stage and mood the app uses, plus the shared
   accessory overlays. Writes design/wren-family.svg (the design source) and
   both data files. Run: node design/wren-family-gen.mjs

   Colour rules the app relies on (WrenBird.tsx shapeHatchling / HatchEyes):
   hatchling eyes are #1E1B33 circles r~8 at (89.5,103)/(117.5,99.5), cheeks are
   #EF9CB4, the beak is the skin's accent colour, the body is one circle r56. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IOS = path.resolve(HERE, "..");
const WEB = "/Users/redbeardlord/Desktop/claude 项目/kindredly";

const EYE = "#1E1B33", HI = "#FFFFFF", WHITE = "#FFFFFF";
/* skin slots: sticker SKY (free) · moss (milestone) · plush MIST (milestone) · peach (First Class) · ink NIGHT (First Class) */
const SKINS = {
  sticker: { name: "SKY",   body: "#5757EC", wing: "#4646DB", belly: "#F6E7C9", acc: "#F2A0B5", blush: "#F2A0B5", ring: null,      crest: "#8E8EFF", egg: "#C9C7FF", eggLine: "#FFFFFF", star: "#E8A63C" },
  plush:   { name: "MIST",  body: "#A9C6F2", wing: "#7FA5E0", belly: "#FBF3E2", acc: "#F2887E", blush: "#F2A0B5", ring: null,      crest: "#C8DBF7", egg: "#DCE8FA", eggLine: "#FFFFFF", star: "#E8A63C" },
  ink:     { name: "NIGHT", body: "#2B2A4A", wing: "#1B1A33", belly: "#F6E7C9", acc: "#F2A0B5", blush: "#F2A0B5", ring: "#F6E7C9", crest: "#4A4870", egg: "#3B3A5E", eggLine: "#6B6A8E", star: "#E8A63C" },
  moss:    { name: "MOSS",  body: "#6DAE78", wing: "#4F8F5C", belly: "#F1E8CE", acc: "#E8B04A", blush: "#F2A0B5", ring: null,      crest: "#9CCFA5", egg: "#B7D3BC", eggLine: "#FFFFFF", star: "#E8A63C" },
  peach:   { name: "PEACH", body: "#F2A08C", wing: "#E27E6A", belly: "#F6E7C9", acc: "#5B55FF", blush: "#E8706A", ring: null,      crest: "#F7C0B2", egg: "#F8CDBF", eggLine: "#FFFFFF", star: "#E8A63C" },
};
const MOODS = ["content", "listen", "worry", "delight", "happy", "curious", "think", "sleepy", "wink"];

/* ── the adult is designed on a 120 grid and mapped into the 200 viewBox ── */
const K = 1.75;
const tx = (x) => +(100 + (x - 60) * K).toFixed(1);
const ty = (y) => +(40 + (y - 30) * K).toFixed(1);
const ts = (v) => +(v * K).toFixed(2);
const S = (v) => String(v);
/* path in 120 units, absolute M/L/C/Q/Z only */
const P = (d, f, extra = {}) => {
  const out = d.replace(/([MLCQ])([^MLCQZ]*)/g, (m, cmd, body) => {
    const n = body.trim().split(/[\s,]+/).filter(Boolean).map(Number), o = [];
    for (let i = 0; i < n.length; i += 2) o.push(tx(n[i]) + "," + ty(n[i + 1]));
    return cmd + o.join(" ");
  });
  const sh = { d: out, f, ...extra, t: "p" };
  if (sh.sw != null) sh.sw = S(ts(+sh.sw));
  return sh;
};
const E = (cx, cy, rx, ry, f, rot, extra = {}) => ({ cx: S(tx(cx)), cy: S(ty(cy)), rx: S(ts(rx)), ry: S(ts(ry)), f, ...(rot ? { tf: `rotate(${rot} ${tx(cx)} ${ty(cy)})` } : {}), ...extra, t: "e" });
const C = (cx, cy, r, f, extra = {}) => ({ cx: S(tx(cx)), cy: S(ty(cy)), r: S(ts(r)), f, ...extra, t: "c" });
const poly = (pts, f) => P("M" + pts.split(" ").join(" L") + " Z", f);
const star = (cx, cy, r, f) => { const p = []; for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 4, rr = i % 2 ? r * .42 : r; p.push((cx + rr * Math.cos(a)).toFixed(2) + "," + (cy + rr * Math.sin(a)).toFixed(2)); } return poly(p.join(" "), f); };

function adultShapes(s, { mood = "content", fly = false } = {}) {
  const sh = [];
  const dot = (x, y, r) => { if (s.ring) sh.push(C(x, y, r + 2, s.ring)); sh.push(C(x, y, r, EYE)); sh.push(C(x + r * .35, y - r * .35, r * .3, HI)); };
  const arc = (x, y, w) => { const d = `M${x - w} ${y + 1} Q${x} ${y - w * 1.3 + 1} ${x + w} ${y + 1}`; if (s.ring) sh.push(P(d, "none", { s: s.ring, sw: 5, lc: "round" })); sh.push(P(d, "none", { s: EYE, sw: 2.4, lc: "round" })); };
  const line = (x, y, w) => { const d = `M${x - w} ${y} L${x + w} ${y}`; if (s.ring) sh.push(P(d, "none", { s: s.ring, sw: 5, lc: "round" })); sh.push(P(d, "none", { s: EYE, sw: 2.4, lc: "round" })); };
  const brow = (d) => sh.push(P(d, "none", { s: EYE, sw: 2, lc: "round" }));
  const warm = ["delight", "happy", "wink"].includes(mood);
  // back to front
  sh.push(poly("30,60 6,46 14,63 4,78 30,72", s.wing));
  sh.push(fly ? E(30, 54, 8, 16, s.wing, 55) : E(31, 74, 8, 15, s.wing, 24));
  sh.push(P("M26 70 C26 46 44 30 66 30 C84 30 94 44 94 60 C96 80 84 98 60 98 C40 98 26 88 26 70 Z", s.body, { s: WHITE, sw: 6 }));
  sh.push(E(58, 82, 20, 14, s.belly));
  sh.push(fly ? E(86, 52, 9, 18, s.wing, -55) : E(88, 76, 9, 17, s.wing, -22));
  switch (mood) {
    case "listen": dot(56, 50, 3.6); dot(72, 47, 4); brow("M50 41 Q56 37 62 40"); brow("M66 38 Q72 34 78 37"); break;
    case "worry": dot(56, 50, 3.2); dot(72, 47, 3.6); brow("M51 42 Q56 44 61 44"); brow("M67 39 Q72 41 77 41"); break;
    case "delight": sh.push(star(56, 50, 6, s.star)); sh.push(star(72, 47, 6.5, s.star)); break;
    case "happy": arc(56, 50, 5); arc(72, 47, 5.5); break;
    case "curious": dot(56, 51, 3); dot(72, 46, 5); break;
    case "think": dot(55, 48, 3.4); line(72, 47, 4.5); sh.push(C(88, 40, 2, "#A6A1B6")); sh.push(C(93, 34, 1.6, "#A6A1B6")); sh.push(C(97, 29, 1.3, "#A6A1B6")); break;
    case "sleepy": line(56, 51, 4.5); line(72, 48, 5); sh.push(P("M84 37 L90 37 L84 43 L90 43", "none", { s: EYE, sw: 1.6, lc: "round", lj: "round", o: ".6" })); sh.push(P("M93 27 L100 27 L93 34 L100 34", "none", { s: EYE, sw: 1.8, lc: "round", lj: "round", o: ".45" })); break;
    case "wink": dot(56, 50, 3.6); arc(72, 47, 5.5); break;
    default: dot(56, 50, 3.6); dot(72, 47, 4);
  }
  if (mood === "delight") { sh.push(P("M74 54 L90 57 L75 60 Z", s.acc)); sh.push(P("M75 61 L89 63 L76 67 Z", s.acc, { o: ".8" })); }
  else sh.push(P("M74 55 L90 60 L74 65 Z", s.acc));
  if (warm) { sh.push(C(50, 60, 4, s.blush, { o: ".6" })); sh.push(C(80, 66, 3.5, s.blush, { o: ".6" })); }
  if (!fly) { sh.push(P("M50 97 L50 106 M68 97 L68 106", "none", { s: s.acc, sw: 3, lc: "round" })); sh.push(P("M44 106 L57 106 M62 106 L75 106", "none", { s: s.acc, sw: 3.2, lc: "round" })); }
  return sh;
}
/* the flying pose: the whole bird tilts, the legs hang, the letter rides below */
function flyShapes(s) {
  const lift = (sh) => ({ ...sh, tf: `rotate(-12 ${tx(60)} ${ty(66)}) translate(3.5 -14)` + (sh.tf ? " " + sh.tf : "") });
  const body = adultShapes(s, { fly: true }).map(lift);
  return body.concat([
    P("M52 90 Q50 98 56 102 M66 89 Q66 97 71 101", "none", { s: s.acc, sw: 2.6, lc: "round" }),
    { x: S(tx(49)), y: S(ty(99)), w: S(ts(26)), h: S(ts(18)), rx: "3", f: WHITE, s: "#D8D2C2", sw: "2.4", t: "r" },
    P("M49 99 L62 110 L75 99", "none", { s: "#D8D2C2", sw: 2.4 }),
    C(62, 112, 3, "#E8A63C"),
  ]);
}
function fledglingShapes(s) {
  const sh = [];
  sh.push(E(34, 78, 6, 11, s.wing, 24));
  sh.push(P("M30 72 C30 50 46 38 64 38 C80 38 90 50 90 64 C92 82 82 98 60 98 C42 98 30 88 30 72 Z", s.body, { s: WHITE, sw: 6 }));
  sh.push(E(58, 83, 17, 12, s.belly));
  sh.push(E(86, 78, 7, 13, s.wing, -22));
  for (const [x, y, r] of [[56, 56, 3.6], [72, 54, 4]]) { if (s.ring) sh.push(C(x, y, r + 2, s.ring)); sh.push(C(x, y, r, EYE)); sh.push(C(x + r * .35, y - r * .35, r * .3, HI)); }
  sh.push(P("M74 61 L88 65 L74 69 Z", s.acc));
  sh.push(P("M50 97 L50 106 M68 97 L68 106", "none", { s: s.acc, sw: 3, lc: "round" })); sh.push(P("M44 106 L57 106 M62 106 L75 106", "none", { s: s.acc, sw: 3.2, lc: "round" }));
  return sh;
}
/* THE CHICK IS THE SAME BIRD, SMALL. She used to be a front-facing round
   chick from the previous set — a different drawing from the fledgling
   and the adult she grows into. Now she's the three-quarter bird at baby
   proportions: one round body (a circle, so the read can stretch it),
   bigger eyes set higher, a stub of a tail, a down-feather on the crown
   that she loses when she fledges, short legs. Same grid, same colours.

   WrenBird.tsx (shapeHatchling / HatchEyes) finds the parts by geometry
   and colour, not by index — keep: body = the one circle r>=40; eyes =
   #1E1B33 circles 4<r<14 at (89.5,103) far / (117.5,99.5) near; cheeks =
   #EF9CB4; the crown feather = the only stroke-only path; the beak = the
   skin's accent, centred on (128,117). */
function hatchlingShapes(s) {
  const sh = [];
  const eye = (x, y, r) => { if (s.ring) sh.push(C(x, y, r + 1.2, s.ring)); sh.push(C(x, y, r, EYE)); sh.push(C(x + r * .35, y - r * .35, r * .3, HI)); };
  // back to front
  sh.push(poly("34,80 22,74 26,86", s.wing)); // the tail, a stub
  sh.push(E(36, 82, 5.5, 10, s.wing, 24)); // far wing
  sh.push(P("M62 43 Q60 36 66 33", "none", { s: s.crest, sw: 5, lc: "round" })); // the down-feather
  sh.push(C(60, 72, 30, s.body, { s: WHITE, sw: S(ts(6)) })); // the body: one circle
  sh.push(E(60, 88, 17, 12, s.belly));
  sh.push(E(86, 84, 6.5, 11, s.wing, -22)); // near wing
  eye(54, 66, 4.6); eye(70, 64, 5);
  sh.push(C(49, 72, 3.4, "#EF9CB4")); sh.push(C(77, 80, 3, "#EF9CB4")); // cheeks
  sh.push(P("M72 70 L86 74 L72 78 Z", s.acc)); // beak
  sh.push(P("M52 101 L52 107 M66 101 L66 107", s.acc, { s: s.acc, sw: 3, lc: "round" }));
  sh.push(P("M46 107 L58 107 M60 107 L72 107", s.acc, { s: s.acc, sw: 3.2, lc: "round" }));
  return sh;
}
function eggShapes(s) {
  const eye = (x, y) => (s.ring ? [{ cx: S(x), cy: S(y), r: "7", f: EYE, s: s.ring, sw: "3", t: "c" }] : [{ cx: S(x), cy: S(y), r: "7", f: EYE, t: "c" }]);
  return [
    { d: "M100,28 C142,28 164,74 164,118 C164,160 134,184 100,184 C66,184 36,160 36,118 C36,74 58,28 100,28 Z", f: s.egg, s: WHITE, sw: "10", t: "p" },
    { d: "M56,118 l18,12 l16,-14 l16,14 l18,-12", f: "none", s: s.eggLine, sw: "5", lc: "round", lj: "round", t: "p" },
    { cx: "70", cy: "62", r: "3", f: s.acc, o: ".7", t: "c" }, { cx: "126", cy: "80", r: "2.6", f: s.acc, o: ".7", t: "c" }, { cx: "132", cy: "140", r: "2.4", f: s.acc, o: ".7", t: "c" },
    ...eye(82, 90), ...eye(118, 90),
    { d: "M100,98 l8,5 l-8,6 l-8,-6 Z", f: s.acc, t: "p" },
  ];
}
const miniShapes = (s) => [
  { d: "M84,44 Q78,16 92,8", f: "none", s: s.body, sw: "16", lc: "round", t: "p" },
  { cx: "100", cy: "116", r: "70", f: s.body, t: "c" },
  { cx: "100", cy: "150", rx: "34", ry: "24", f: s.belly, t: "e" },
  { d: "M162,104 l30,12 l-30,14 Z", f: s.acc, t: "p" },
  { cx: "86", cy: "104", r: "13", f: WHITE, t: "c" }, { cx: "88", cy: "105", r: "6", f: EYE, t: "c" },
];
/* accessories sit on the three-quarter head: eyes at (93,75) and (121,70), crown near (110,40) */
const ACC = {
  beanie: [
    { cx: "112", cy: "22", r: "9", f: "#FBF3F4", t: "c" },
    { d: "M68,72 Q110,14 154,66 Z", f: "#F2A0B5", t: "p" },
    { x: "64", y: "64", w: "92", h: "15", rx: "7.5", f: "#E787A3", t: "r" },
  ],
  phones: [
    { d: "M62,112 Q66,30 118,30 Q162,32 162,92", f: "none", s: EYE, sw: "9", lc: "round", t: "p" },
    { x: "50", y: "100", w: "20", h: "30", rx: "8", f: EYE, t: "r" }, { x: "152", y: "84", w: "20", h: "30", rx: "8", f: EYE, t: "r" },
    { cx: "60", cy: "115", r: "4.5", f: "#7C7CF7", t: "c" }, { cx: "162", cy: "99", r: "4.5", f: "#7C7CF7", t: "c" },
  ],
  flower: [
    { cx: "76", cy: "50", r: "6", f: "#F2A0B5", t: "c" }, { cx: "88", cy: "44", r: "6", f: "#F2A0B5", t: "c" }, { cx: "82", cy: "58", r: "6", f: "#F2A0B5", t: "c" }, { cx: "82", cy: "51", r: "5", f: "#F5C64F", t: "c" },
    { cx: "104", cy: "36", r: "7", f: "#FBF3F4", t: "c" }, { cx: "118", cy: "34", r: "7", f: "#FBF3F4", t: "c" }, { cx: "111", cy: "46", r: "7", f: "#FBF3F4", t: "c" }, { cx: "111", cy: "38", r: "6", f: "#E8A63C", t: "c" },
  ],
  scarf: [
    { d: "M50,128 Q100,152 152,120 L152,138 Q100,172 50,148 Z", f: "#9FD0BB", s: "#7BB79A", sw: "3", lj: "round", t: "p" },
    { x: "130", y: "136", w: "18", h: "34", rx: "7", f: "#9FD0BB", s: "#7BB79A", sw: "3", t: "r" },
    { d: "M134,166 v6 M140,166 v6", s: "#7BB79A", sw: "3", lc: "round", t: "p" },
  ],
  party: [
    { d: "M112,4 L140,62 L84,62 Z", f: "#F5C64F", s: "#E8A63C", sw: "3", lj: "round", t: "p" },
    { d: "M96,40 Q112,32 126,44", f: "none", s: "#EF9CB4", sw: "6", lc: "round", t: "p" },
    { cx: "112", cy: "6", r: "7", f: "#EF9CB4", t: "c" },
  ],
  shades: [
    { x: "76", y: "64", w: "34", h: "22", rx: "9", f: EYE, t: "r" }, { x: "106", y: "58", w: "34", h: "22", rx: "9", f: EYE, t: "r" },
    { d: "M108,72 L110,70", s: EYE, sw: "5", lc: "round", t: "p" },
    { d: "M76,74 l-12,4 M140,68 l12,-3", s: EYE, sw: "5", lc: "round", t: "p" },
    { d: "M82,69 q6,-3 10,0", s: "#7C7CF7", sw: "3", f: "none", lc: "round", t: "p" },
  ],
};

/* ── assemble the family in the order the old file used ── */
const fam = {};
const base = SKINS.sticker;
fam["base-adult"] = adultShapes(base);
fam["base-egg"] = eggShapes(base);
fam["base-hatchling"] = hatchlingShapes(base);
fam["base-fledgling"] = fledglingShapes(base);
fam["base-fly"] = flyShapes(base);
fam["base-mini"] = miniShapes(base);
for (const [id, s] of Object.entries(SKINS)) {
  fam[`wren-${id}-egg`] = eggShapes(s);
  fam[`wren-${id}-hatchling`] = hatchlingShapes(s);
  fam[`wren-${id}-fledgling`] = fledglingShapes(s);
  fam[`wren-${id}-fly`] = flyShapes(s);
  fam[`wren-${id}-mini`] = miniShapes(s);
  for (const m of MOODS) fam[`wren-${id}-adult-${m}`] = adultShapes(s, { mood: m });
}
for (const [a, shapes] of Object.entries(ACC)) fam[`acc-shared-adult-${a}`] = shapes;
const count = Object.values(fam).reduce((n, l) => n + l.length, 0);

/* ── emit ── */
const attr = (sh) => {
  const a = [];
  if (sh.f != null) a.push(`fill="${sh.f}"`);
  if (sh.s != null) a.push(`stroke="${sh.s}"`);
  if (sh.sw != null) a.push(`stroke-width="${sh.sw}"`);
  if (sh.lc) a.push(`stroke-linecap="${sh.lc}"`);
  if (sh.lj) a.push(`stroke-linejoin="${sh.lj}"`);
  if (sh.o != null) a.push(`opacity="${sh.o}"`);
  if (sh.tf) a.push(`transform="${sh.tf}"`);
  if (sh.da) a.push(`stroke-dasharray="${sh.da}"`);
  return a.join(" ");
};
const el = (sh) => sh.t === "p" ? `<path d="${sh.d}" ${attr(sh)}></path>` : sh.t === "c" ? `<circle cx="${sh.cx}" cy="${sh.cy}" r="${sh.r}" ${attr(sh)}></circle>` : sh.t === "e" ? `<ellipse cx="${sh.cx}" cy="${sh.cy}" rx="${sh.rx}" ry="${sh.ry}" ${attr(sh)}></ellipse>` : `<rect x="${sh.x}" y="${sh.y}" width="${sh.w}" height="${sh.h}"${sh.rx != null ? ` rx="${sh.rx}"` : ""} ${attr(sh)}></rect>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0">\n<!-- generated by design/wren-family-gen.mjs — edit the generator, not this file -->\n\n` +
  Object.entries(fam).map(([id, l]) => `<symbol id="${id}" viewBox="0 0 200 200">\n${l.map(el).join("\n")}\n</symbol>`).join("\n\n") + "\n</svg>\n";
fs.writeFileSync(path.join(HERE, "wren-family.svg"), svg);

const json = JSON.stringify(fam);
const tsOut = `/* AUTO-GENERATED by design/wren-family-gen.mjs — do not edit by hand.
   ${Object.keys(fam).length} symbols, ${count} shapes. The bird faces three-quarter front; skins
   sticker = ${SKINS.sticker.name}, plush = ${SKINS.plush.name}, ink = ${SKINS.ink.name}, moss, peach. */

export interface WShape { t: "p" | "c" | "e" | "r"; d?: string; cx?: string; cy?: string; r?: string; rx?: string; ry?: string; x?: string; y?: string; w?: string; h?: string; f?: string; s?: string; sw?: string; lc?: string; lj?: string; o?: string; tf?: string; da?: string }

export const WREN_FAMILY: Record<string, WShape[]> = ${json};
`;
fs.writeFileSync(path.join(IOS, "src/components/wren-family-data.ts"), tsOut);
const spaced = json.replace(/\{/g, "{ ").replace(/\}/g, " }").replace(/":/g, '": ').replace(/,"/g, ', "').replace(/,\{/g, ", {").replace(/\],"/g, '], "');
fs.writeFileSync(path.join(WEB, "app/wren-family.js"), `const WREN_FAMILY = ${spaced};\nexport {\n  WREN_FAMILY\n};\n`);
console.log("wrote", Object.keys(fam).length, "symbols,", count, "shapes");
