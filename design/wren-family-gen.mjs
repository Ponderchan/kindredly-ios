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
/* ── ACCESSORIES ────────────────────────────────────────────────────────
   Six pieces, drawn ONCE each in a head frame and placed on every stage by
   anchors, so a beanie sits on the brow of the chick, the fledgling and the
   grown bird alike (it used to be drawn for the adult only, at the wrong
   height — the band lay across her eyes and the pom floated free).

   Anchors per stage (viewBox units): the two eyes (EL far, ER near), the
   head's centre line `hx`, the collar line and the body's half-width there.
   The brow line is 18 above the eye midpoint; hats and crowns hang from it,
   shades sit on the eyes, the scarf wraps the collar. The palette is shared
   across skins and chosen to read on all five bodies: cream, ink, brass,
   berry, rose, olive — flat fills, no gradients, no white keyline (the bird
   is drawn bare in the app). */
const CREAM = "#F6E7C9", CREAM_D = "#E0CBA0", INK = "#1E1B33", BRASS = "#E8A63C", BRASS_D = "#C98B25";
const BERRY = "#E05A6A", BERRY_D = "#BF4557", ROSE = "#F2A0B5", OLIVE = "#2F6B3B", LEAF = "#4F8F5C", PETAL = "#FBF3F4";
/* the night bird is ink herself, so nothing she wears may be ink: the
   headphones are cream with ink cushions, the lenses are amber-dark */
const LENS = "#4E3325";
const HEADS = {
  adult:     { EL: [93, 75, 6.3],   ER: [121, 69.75, 7],     hx: 103, crown: 40, collar: 112, cw: 60 },
  fledgling: { EL: [93, 85.5, 6.3], ER: [121, 82, 7],        hx: 104, crown: 54, collar: 112, cw: 53 },
  hatchling: { EL: [89.5, 103, 8],  ER: [117.5, 99.5, 8.75], hx: 100, crown: 56, collar: 128, cw: 50 },
};
const f1 = (n) => +n.toFixed(1);
function pieces(h, roomOverride) {
  const brim = f1((h.EL[1] + h.ER[1]) / 2 - 18);
  /* HEADROOM. The grown bird's crown sits 40 units under the top of the
     viewBox and the flying one's nearer 24, so a hat drawn to the chick's
     height loses its pom to the edge. Each piece that rises is drawn to
     the room it actually has: tall on the chick, squatter on the adult,
     squatter still in flight — never clipped. */
  const room = Math.max(24, (roomOverride ?? brim) - 1);
  /* a small path builder in a local frame: X/Y map frame coords to the viewBox */
  const frame = (ox, oy) => {
    const X = (x) => f1(ox + x), Y = (y) => f1(oy + y);
    const pt = (x, y) => `${X(x)},${Y(y)}`;
    return { X, Y, pt,
      path: (d, f, extra = {}) => ({ d, f, ...extra, t: "p" }),
      circ: (x, y, r, f, extra = {}) => ({ cx: S(X(x)), cy: S(Y(y)), r: S(f1(r)), f, ...extra, t: "c" }),
      ell: (x, y, rx, ry, f, rot, extra = {}) => ({ cx: S(X(x)), cy: S(Y(y)), rx: S(f1(rx)), ry: S(f1(ry)), f, ...(rot ? { tf: `rotate(${rot} ${X(x)} ${Y(y)})` } : {}), ...extra, t: "e" }),
      rect: (x, y, w, h, rx, f, extra = {}) => ({ x: S(X(x)), y: S(Y(y)), w: S(w), h: S(h), rx: S(rx), f, ...extra, t: "r" }),
    };
  };
  const H = frame(h.hx, brim); // head frame: origin on the brow, centre line
  const Cx = frame(h.hx, h.collar); // collar frame
  const cw = h.cw;
  const out = {};

  /* BEANIE — a slouchy knit: berry dome with four ribs, a cream folded cuff
     with rib marks, a cream pom that overlaps the dome so it never floats */
  {
    const p = H.pt, top = -Math.min(48, room - 10), mid = top * 0.62;
    out.beanie = [
      H.path(`M${p(-45, -2)} C${p(-46, mid)} ${p(-22, top)} ${p(8, top)} C${p(34, top)} ${p(50, mid)} ${p(47, -2)} Z`, BERRY),
      ...[-24, -8, 8, 24].map((x0) => H.path(`M${p(x0, -6)} Q${p(x0 * 0.9, mid)} ${p(x0 * 0.55 + 3, top + 4)}`, "none", { s: BERRY_D, sw: "2.6", lc: "round" })),
      H.rect(-49, -8, 98, 14, 7, CREAM),
      ...[-36, -24, -12, 0, 12, 24, 36].map((x0) => H.path(`M${p(x0, -5)} L${p(x0, 3)}`, "none", { s: CREAM_D, sw: "2", lc: "round" })),
      H.circ(9, top - 2, 8, CREAM),
      H.circ(6.5, top - 5, 2.6, WHITE, { o: ".9" }),
    ];
  }

  /* SCARF — brass knit wrapped twice round the collar, a crease between the
     wraps, two cream stripes, a knot at the near side and a fringed tail */
  {
    const p = Cx.pt, kx = cw * 0.55, tl = cw * 0.7;
    out.scarf = [
      Cx.path(`M${p(-cw, -10)} Q${p(0, 8)} ${p(cw, -14)} L${p(cw, 6)} Q${p(0, 28)} ${p(-cw, 10)} Z`, BRASS),
      Cx.path(`M${p(-cw + 6, -5)} Q${p(0, 13)} ${p(cw - 6, -9)}`, "none", { s: CREAM, sw: "3", lc: "round" }),
      Cx.path(`M${p(-cw + 6, 3)} Q${p(0, 21)} ${p(cw - 6, -1)}`, "none", { s: CREAM, sw: "3", lc: "round" }),
      Cx.path(`M${p(-cw, -1)} Q${p(0, 17)} ${p(cw, -5)}`, "none", { s: BRASS_D, sw: "2.2", lc: "round", o: ".8" }),
      Cx.path(`M${p(kx - 12, 8)} L${p(kx - 4, 10 + tl)} L${p(kx + 16, 6 + tl)} L${p(kx + 12, 4)} Z`, BRASS),
      Cx.path(`M${p(kx - 9, 16)} L${p(kx + 11, 13)}`, "none", { s: CREAM, sw: "3", lc: "round" }),
      Cx.path(`M${p(kx - 6, 26)} L${p(kx + 13, 23)}`, "none", { s: CREAM, sw: "3", lc: "round" }),
      ...[0, 5, 10, 15].map((dx) => Cx.path(`M${p(kx - 3 + dx, 9 + tl - dx * 0.2)} L${p(kx - 3 + dx, 18 + tl - dx * 0.2)}`, "none", { s: BRASS_D, sw: "2.4", lc: "round" })),
      Cx.ell(kx + 1, 5, 12.5, 8, BRASS_D, -18),
      Cx.ell(kx + 1, 5, 7, 4, BRASS, -18),
    ];
  }

  /* HEADPHONES — an ink band over the crown, two ink cups at the sides at eye
     level, a cream cushion face with a brass dot */
  {
    const p = H.pt, T = h.crown - brim - 9; // the band rides just over the crown
    out.phones = [
      H.path(`M${p(-51, 22)} C${p(-52, T + 12)} ${p(-26, T)} ${p(2, T)} C${p(30, T)} ${p(52, T + 12)} ${p(51, 18)}`, "none", { s: CREAM, sw: "6", lc: "round" }),
      H.path(`M${p(-51, 22)} C${p(-52, T + 12)} ${p(-26, T)} ${p(2, T)} C${p(30, T)} ${p(52, T + 12)} ${p(51, 18)}`, "none", { s: CREAM_D, sw: "1.6", lc: "round", o: ".7" }),
      H.rect(-60, 10, 18, 26, 8, CREAM),
      H.rect(42, 6, 18, 26, 8, CREAM),
      H.ell(-51, 23, 5.4, 8.4, INK, 0),
      H.ell(51, 19, 5.4, 8.4, INK, 0),
      H.circ(-51, 23, 2.2, BRASS),
      H.circ(51, 19, 2.2, BRASS),
    ];
  }

  /* FLOWER CROWN — an olive vine along the brow with leaves, three
     five-petal flowers (rose, cream, rose) with brass hearts, two buds */
  {
    const p = H.pt;
    const flower = (x, y, petal) => [
      ...[0, 1, 2, 3, 4].map((k) => { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; return H.circ(x + 6.2 * Math.cos(a), y + 6.2 * Math.sin(a), 5.2, petal); }),
      H.circ(x, y, 4, BRASS),
    ];
    out.flower = [
      H.path(`M${p(-47, 3)} Q${p(0, -15)} ${p(47, -4)}`, "none", { s: OLIVE, sw: "4", lc: "round" }),
      H.ell(-40, -1, 8, 4, LEAF, -30), H.ell(-14, -10, 8, 4, LEAF, -10), H.ell(14, -12, 8, 4, LEAF, 6), H.ell(41, -6, 8, 4, LEAF, 26),
      H.ell(-30, 4, 7, 3.4, LEAF, 20), H.ell(0, -2, 7, 3.4, LEAF, -4), H.ell(30, 2, 7, 3.4, LEAF, -22),
      H.circ(-46, 2, 3, ROSE), H.circ(46, -4, 3, ROSE),
      ...flower(-27, -10, ROSE), ...flower(2, -17, PETAL), ...flower(30, -11, ROSE),
    ];
  }

  /* PARTY HAT — a cream cone tipped to the near side, two berry stripes cut
     parallel to its left edge, a brass band at the base and a brass pom */
  {
    const A = [18, -Math.min(74, room - 8.5)], B = [-22, -10], C = [34, -16]; // apex, base-left, base-right (frame)
    const lerp = (P, Q, t) => [P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t];
    const pp = (v) => H.pt(v[0], v[1]);
    const stripe = (s1, s2) => H.path(`M${pp(lerp(B, C, s1))} L${pp(lerp(B, C, s2))} L${pp(lerp(A, C, s2))} L${pp(lerp(A, C, s1))} Z`, BERRY);
    out.party = [
      H.path(`M${pp(A)} L${pp(B)} L${pp(C)} Z`, CREAM),
      stripe(0.12, 0.32), stripe(0.54, 0.74),
      H.path(`M${pp(B)} Q${pp([6, -6])} ${pp(C)}`, "none", { s: BRASS, sw: "3.6", lc: "round" }),
      H.circ(A[0], A[1], 7.5, BRASS),
      H.circ(A[0] - 2.2, A[1] - 2.2, 2.2, WHITE, { o: ".9" }),
    ];
  }

  /* SHADES — ink lenses on the eyes with a cream frame so they read on the
     night bird too, a bridge, short arms to the temples, a glint each */
  {
    const [lx, ly] = h.EL, [rx, ry] = h.ER;
    const V = frame(0, 0);
    const lens = (x, y) => V.rect(x - 12.5, y - 7.5, 25, 16, 6.5, LENS, { s: CREAM, sw: "2.8" });
    out.shades = [
      V.path(`M${V.pt(lx - 12, ly - 2)} L${V.pt(lx - 25, ly + 1)}`, "none", { s: CREAM, sw: "2.8", lc: "round" }),
      V.path(`M${V.pt(rx + 12, ry - 2)} L${V.pt(rx + 26, ry - 6)}`, "none", { s: CREAM, sw: "2.8", lc: "round" }),
      lens(lx, ly + 0.5), lens(rx, ry + 0.5),
      V.path(`M${V.pt(lx + 12.5, ly - 2)} L${V.pt(rx - 12.5, ry - 2)}`, "none", { s: CREAM, sw: "2.8", lc: "round" }),
      V.path(`M${V.pt(lx - 8, ly - 3)} L${V.pt(lx - 4.5, ly - 5.5)}`, "none", { s: WHITE, sw: "2.2", lc: "round", o: ".85" }),
      V.path(`M${V.pt(rx - 8, ry - 3)} L${V.pt(rx - 4.5, ry - 5.5)}`, "none", { s: WHITE, sw: "2.2", lc: "round", o: ".85" }),
    ];
  }
  return out;
}
/* the flying adult is the perched one lifted and tilted; her clothes follow */
const LIFT = `rotate(-12 ${tx(60)} ${ty(66)}) translate(3.5 -14)`;

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
for (const [stage, h] of Object.entries(HEADS)) for (const [a, shapes] of Object.entries(pieces(h))) fam[`acc-shared-${stage}-${a}`] = shapes;
/* in flight she is lifted 14 and tilted; her hats get the 38 units that leaves */
for (const [a, shapes] of Object.entries(pieces(HEADS.adult, 38))) fam[`acc-shared-fly-${a}`] = shapes.map((sh) => ({ ...sh, tf: LIFT + (sh.tf ? " " + sh.tf : "") }));
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
