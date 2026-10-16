/* The mood icons' importer lock (scripts/import-mood-art.mjs). Not wired to a runner; run by hand
   from the repo root with plain node:
     node scripts/import-mood-art.test.mjs

   It checks, in order: the names read from moods.ts (4 group icons + 30 faces, in the owner's
   groups); the committed src/data/mood-line-art.ts is what the importer writes today; the four
   reference group icons in design/moods-line/_reference pass with no error and no warning, and
   the template passes as the Calm group icon once its guides are stripped; the clear-space metric
   reproduces the spec's and the critic's measurements; the tolerance the critic asked for
   (Figma's and Illustrator's own exports, inherited paint, keywords, CMYK black, editor
   attributes, Figma's frame clip); every refusal, each naming the element; the mark count, the
   live area and the clear space, group and face; joined marks; the warnings that stay warnings;
   shapes to path data; and the whole set: a partial delivery, a misspelled file, a rejected file
   and two icons drawn alike. */

import { readFileSync } from "node:fs";
import { parsePath, toArtPath } from "./art-path.mjs";
import { CLEAR, DIR, GRID, MOODS, OUT, checkSvg, classifyPaint, flatten, importSet, readFolder, readMoods } from "./import-mood-art.mjs";

let fails = 0;
const ok = (name, cond) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
const throws = (fn) => {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
};
const near = (a, b, eps = 0.01) => typeof a === "number" && Math.abs(a - b) <= eps;

const S = (d, extra = "") => `<path d="${d}" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const F = (d, extra = "") => `<path d="${d}" fill="#000000"${extra}/>`;
const C = (cx, cy, r, extra = "") => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#000000"${extra}/>`;
const svg = (body, root = `xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"`) => `<svg ${root}>\n${body}\n</svg>`;
const DOTS = C(8.5, 10.5, 1.5) + C(15.5, 10.5, 1.5);
const SMILE = S("M8 14.75c1.2 1.4 2.6 2 4 2s2.8-.6 4-2");
const CALM = svg(DOTS + SMILE);
const HALF = F("M6.3 10h4.4a2.2 2.2 0 0 1-4.4 0z") + F("M13.3 10h4.4a2.2 2.2 0 0 1-4.4 0z");
const UP = S("M6.25 11c.9-1.6 2.6-1.6 3.5 0") + S("M14.25 11c.9-1.6 2.6-1.6 3.5 0");
const SMIRK = S("M9 16h3.5c1.5 0 2.6-.6 3.5-1.75");

const group = (text) => checkSvg(text, { kind: "group" });
const face = (text) => checkSvg(text, { kind: "face" });
const clean = (r) => r.errors.length === 0 && r.warnings.length === 0;
const refuses = (r, re) => r.errors.some((e) => re.test(e.text));
const warns = (r, re) => r.warnings.some((e) => re.test(e.text));

/* ── the names ── */

const moods = readMoods(readFileSync(MOODS, "utf8"));
ok("moods.ts: the four groups in the owner's order", moods.groups.join() === "calm,happy,tired,low");
ok("moods.ts: 30 faces", moods.faces.length === 30);
ok("34 icons expected: 4 group icons + 30 faces", moods.expected.length === 34 && moods.expected.filter((e) => e.kind === "group").length === 4);
ok("group icons are mood-group-<g>, faces mood-<id>", moods.expected[0].key === "mood-group-calm" && moods.expected.some((e) => e.key === "mood-in-love" && e.kind === "face"));
ok("each group's icon comes first, then its faces", moods.expected.map((e) => e.key).slice(0, 6).join() === "mood-group-calm,mood-calm,mood-content,mood-pleased,mood-okay,mood-shy");
ok("Unimpressed is a Tired face (the owner's table)", moods.expected.find((e) => e.id === "unimpressed").group === "tired");
{
  const text = readFileSync(MOODS, "utf8");
  ok("refuses a face listed in two groups", throws(() => readMoods(text.replace('calm: ["calm", "content"', 'calm: ["calm", "nervous", "content"'))));
  ok("refuses a face in no group", throws(() => readMoods(text.replace('"okay", "shy"]', '"shy"]'))));
}

/* ── the committed table ── */

const set = importSet(readFolder(DIR), moods);
ok("mood-line-art.ts is what the importer writes (run node scripts/import-mood-art.mjs)", readFileSync(OUT, "utf8") === set.ts);
ok("design/moods-line imports every delivered file", set.results.every((r) => r.status !== "rejected") && set.unexpected.length === 0);
ok("the four group icons are delivered today", ["calm", "happy", "tired", "low"].every((g) => set.results.find((r) => r.entry.key === `mood-group-${g}`)?.status === "ok"));
{
  const m = /^export const MOOD_LINE_ART\s*:[^=]*=\s*(\{.*\});$/m.exec(set.ts);
  const table = m ? JSON.parse(m[1]) : {};
  ok("the table is one JSON line", !!m);
  ok("its keys follow moods.ts order", Object.keys(table).join() === set.results.filter((r) => r.status === "ok").map((r) => r.entry.key).join());
  ok("every shape is a path in the template ink, read by the Swift reader", Object.values(table).every((list) => list.every((s) => s.t === "p" && (s.f === "#000000" || (s.f === "none" && s.s === "#000000" && s.sw === "2" && s.lc === "round" && s.lj === "round")) && toArtPath(s))));
  ok("grid 24 and the ink are written", /^export const MOOD_LINE_GRID = 24;$/m.test(set.ts) && /^export const MOOD_LINE_INK = "#000000";$/m.test(set.ts));
}

/* ── the references ── */

const refs = readFolder(new URL("_reference/", DIR));
ok("_reference holds the four group icons", [...refs.keys()].join() === "mood-group-calm.svg,mood-group-happy.svg,mood-group-low.svg,mood-group-tired.svg");
const gaps = {};
for (const [name, text] of refs) {
  const r = group(text);
  gaps[name] = r.stats?.closest;
  ok(`${name} passes clean (no error, no warning) as a group icon`, clean(r) && r.shapes.length === 3);
  if (!clean(r)) for (const m of [...r.errors, ...r.warnings]) console.log(`     ${m.line ?? ""} ${m.text}`);
}
ok("the references clear 1.5 at 2.4 (calm 1.58, happy 1.55, tired 2.10, low 2.44)", near(gaps["mood-group-calm.svg"], 1.58) && near(gaps["mood-group-happy.svg"], 1.55) && near(gaps["mood-group-tired.svg"], 2.1) && near(gaps["mood-group-low.svg"], 2.44));
ok("the spec's first happy geometry (smile at 14.5) measures 1.32 and fails a group icon's 1.5", (() => {
  const r = group(svg(UP + S("M7.5 14.5c1.5 2.2 3 3 4.5 3s3-.8 4.5-3")));
  return near(r.stats?.closest, 1.32) && refuses(r, /a group icon's marks need 1\.5 \(0\.18 more\)/);
})());
{
  const t = group(readFileSync(new URL("_template-24.svg", DIR), "utf8"));
  ok("the template passes as the Calm group icon, its guides stripped", clean(t) && t.notes.some((n) => /stripped <g id="guides">/.test(n.text)) && t.shapes.length === 3);
}

/* ── the metric against the critic's measurements ── */

ok("smug (HALF + SMIRK): 0.88, refused as a face", (() => {
  const r = face(svg(HALF + SMIRK));
  return near(r.stats?.closest, 0.88) && refuses(r, /\(right eye\) and .*\(mouth\) are 0\.88 apart at the 2\.4 check weight; marks need 1\.25 \(0\.37 more\)/);
})());
ok("mischievous (UP + SMIRK): 1.29, passes as a face", (() => {
  const r = face(svg(UP + SMIRK));
  return near(r.stats?.closest, 1.29) && r.errors.length === 0;
})());
ok("a face needs 1.25, a group icon 1.5: the same 1.29 passes one and fails the other", CLEAR.face === 1.25 && CLEAR.group === 1.5 && refuses(group(svg(UP + SMIRK)), /need 1\.5/));

/* ── tolerance ── */

const FIGMA = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_12_7)">
<circle cx="8.5" cy="10.5" r="1.5" fill="black"/>
<circle cx="15.5" cy="10.5" r="1.5" fill="black"/>
<path d="M8 14.75C9.2 16.15 10.6 16.75 12 16.75C13.4 16.75 14.8 16.15 16 14.75" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<defs>
<clipPath id="clip0_12_7">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>
</svg>`;
{
  const r = group(FIGMA);
  ok("Figma: root fill none inherited, black keywords, the frame clip let go", clean(r) && r.shapes[2].f === "none" && r.shapes[2].s === "#000000" && r.notes.some((n) => /frame's clip/.test(n.text)));
}
const ILLUSTRATOR = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" viewBox="0 0 24 24" style="enable-background:new 0 0 24 24;" xml:space="preserve">
  <title>mood-group-calm</title>
  <desc>Created with Illustrator</desc>
  <metadata><x:xmpmeta xmlns:x="adobe:ns:meta/"/></metadata>
  <circle cx="8.5" cy="10.5" r="1.5"/>
  <circle cx="15.5" cy="10.5" r="1.5"/>
  <path d="M8,14.75c1.2,1.4,2.6,2,4,2s2.8-.6,4-2" fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
</svg>`;
ok("Illustrator (presentation attributes): extra root attributes, title, desc, metadata, a DOCTYPE, default black fills", clean(group(ILLUSTRATOR)));
{
  const r = group(ILLUSTRATOR.replaceAll('r="1.5"/>', 'r="1.5" fill="#231f20"/>').replace('stroke="#000"', 'stroke="#231f20"'));
  ok("Illustrator CMYK black #231F20 is read as the ink, with one warning", r.errors.length === 0 && r.warnings.length === 1 && warns(r, /#231f20 read as the ink/) && r.shapes.every((s) => (s.f === "none" ? s.s : s.f) === "#000000"));
}
ok("#000, rgb(0,0,0), black and BLACK are all the ink", ["#000", "rgb(0,0,0)", "black", "BLACK", "#000000ff"].every((v) => classifyPaint(v).ink && !classifyPaint(v).warn));
ok("paint inherited from a <g> (and style=\"\" declarations) is resolved", (() => {
  const r = group(svg(`<g fill="none" style="stroke: #000000; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round">${`<path d="M6.25 10.5h3.5"/><path d="M14.25 10.5h3.5"/><path d="M10.5 15.5h3"/>`}</g>`));
  return clean(r) && r.shapes.every((s) => s.f === "none" && s.s === "#000000");
})());
ok("ids, data-*, inkscape:/sodipodi: attributes, fill-rule and the miter limit are ignored", clean(group(svg(`<g id="art" data-name="Art" inkscape:label="x">` + C(8.5, 10.5, 1.5, ' id="eye-l" fill-rule="evenodd"') + C(15.5, 10.5, 1.5) + S("M8 14.75c1.2 1.4 2.6 2 4 2s2.8-.6 4-2", ' stroke-miterlimit="10"') + "</g>"))));
ok("an editor's own elements (Inkscape's sodipodi:namedview) are ignored", (() => {
  const r = group(svg(`<sodipodi:namedview id="base" pagecolor="#ffffff"/>` + DOTS + SMILE, `xmlns="http://www.w3.org/2000/svg" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" viewBox="0 0 24 24"`));
  return clean(r) && r.notes.some((n) => /ignored <sodipodi:namedview>/.test(n.text));
})());
ok("an identity transform and opacity 1 are harmless", clean(group(svg(`<g transform="translate(0 0)" opacity="1">${DOTS + SMILE}</g>`))));
ok("no viewBox but width and height 24: read as 0 0 24 24, with a warning", (() => {
  const r = group(svg(DOTS + SMILE, `xmlns="http://www.w3.org/2000/svg" width="24" height="24"`));
  return r.errors.length === 0 && warns(r, /no viewBox/);
})());
ok("a width of 48 with the right viewBox: a warning only", (() => {
  const r = group(svg(DOTS + SMILE, `xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"`));
  return r.errors.length === 0 && warns(r, /width="48"/);
})());

/* ── refusals, each naming the element ── */

const refusal = (name, text, re, kind = "group") => {
  const r = checkSvg(text, { kind });
  const hit = refuses(r, re);
  ok(`refuses ${name}`, hit);
  if (!hit) for (const e of r.errors) console.log(`     got: ${e.line ?? ""} ${e.text}`);
};
refusal("a viewBox that isn't 0 0 24 24", svg(DOTS + SMILE, `xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"`), /viewBox="0 0 48 48": it must be 0 0 24 24/);
refusal("XML that isn't well-formed", "<svg viewBox=\"0 0 24 24\"><g><circle r=\"1\"/></svg>", /not readable as SVG: <\/svg> on line 1 closes <g>/);
refusal("a root that isn't <svg>", "<g/>", /the root element is <g>/);
refusal("a transform", svg(DOTS + S("M8 14.75c1.2 1.4 2.6 2 4 2s2.8-.6 4-2", ' transform="rotate(5 12 12)"')), /<path d="M8 14\.75c1\.2 1\.4 2…">: a transform \(rotate\(5 12 12\)\)/);
refusal("a transform on a <g>", svg(`<g transform="scale(2)">${DOTS + SMILE}</g>`), /<g>: a transform \(scale\(2\)\)/);
refusal("an opacity", svg(DOTS + S("M8 14.75c1.2 1.4 2.6 2 4 2s2.8-.6 4-2", ' opacity="0.5"')), /opacity 0\.5: no opacity/);
refusal("a fill-opacity", svg(C(8.5, 10.5, 1.5, ' fill-opacity=".8"') + C(15.5, 10.5, 1.5) + SMILE), /fill-opacity \.8/);
refusal("a see-through colour", svg(C(8.5, 10.5, 1.5).replace("#000000", "#00000080") + C(15.5, 10.5, 1.5) + SMILE), /a see-through colour \(#00000080\)/);
refusal("a gradient paint and its gradient", svg(`<defs><linearGradient id="g"/></defs>` + C(8.5, 10.5, 1.5).replace('"#000000"', '"url(#g)"') + C(15.5, 10.5, 1.5) + SMILE), /a gradient or pattern paint/);
refusal("<linearGradient> in <defs>", svg(`<defs><linearGradient id="g"/></defs>` + DOTS + SMILE), /<linearGradient> in <defs>: a gradient/);
refusal("currentColor", svg(C(8.5, 10.5, 1.5).replace('"#000000"', '"currentColor"') + C(15.5, 10.5, 1.5) + SMILE), /currentColor/);
refusal("a white knock-out (a light colour)", svg(DOTS + SMILE + `<circle cx="9" cy="10" r=".5" fill="#FFFFFF"/>`, undefined), /<circle cx=9 cy=10 r=\.5>: fill: a light colour \(#FFFFFF\)/, "face");
refusal("a mid-tone colour", svg(C(8.5, 10.5, 1.5).replace('"#000000"', '"#B8842A"') + C(15.5, 10.5, 1.5) + SMILE), /#B8842A is too light to read as the ink/);
refusal("a dash array", svg(DOTS + S("M8 14.75c1.2 1.4 2.6 2 4 2s2.8-.6 4-2", ' stroke-dasharray="1 1"')), /a dashed stroke/);
refusal("a mask", svg(`<g mask="url(#m)">${DOTS + SMILE}</g>`), /<g>: mask url\(#m\)/);
refusal("a clip that isn't the frame's", svg(`<defs><clipPath id="c"><rect x="4" y="4" width="10" height="10"/></clipPath></defs><g clip-path="url(#c)">${DOTS + SMILE}</g>`), /<clipPath> in <defs>: a clipping path/);
refusal("a filter", svg(`<g filter="url(#f)">${DOTS + SMILE}</g>`), /filter url\(#f\)/);
refusal("<use>", svg(DOTS + SMILE + `<use href="#a"/>`), /<use>: a <use> copy/);
refusal("text", svg(DOTS + SMILE + `<text x="1" y="1">z</text>`), /<text>: text/);
refusal("an image", svg(DOTS + SMILE + `<image href="a.png"/>`), /<image>: an embedded image/);
refusal("a <style> sheet", svg(`<style>.a{fill:none}</style>` + DOTS + SMILE), /a <style> sheet: export with presentation attributes/);
refusal("an element it doesn't know", svg(DOTS + SMILE + `<blob/>`), /<blob>: an element the importer doesn't know/);
refusal("an attribute it doesn't know", svg(C(8.5, 10.5, 1.5, ' wobble="3"') + C(15.5, 10.5, 1.5) + SMILE), /an attribute the importer doesn't know \(wobble="3"\)/);
refusal("a hidden element", svg(DOTS + SMILE + C(12, 4, 1, ' display="none"')), /a hidden element \(display none\)/, "face");
refusal("a background rect over the whole board (the frame's fill)", svg(`<rect width="24" height="24" fill="white"/>` + DOTS + SMILE), /a background over the whole artboard/);
refusal("a stroke width that isn't 2", svg(DOTS + SMILE.replace('stroke-width="2"', 'stroke-width="1.5"')), /stroke-width 1\.5; every stroke is 2/);
refusal("a missing stroke width (SVG's default 1)", svg(DOTS + SMILE.replace(' stroke-width="2"', "")), /stroke-width 1 \(SVG's default\)/);
refusal("a butt cap", svg(DOTS + SMILE.replace("round", "butt")), /stroke-linecap butt; caps are round/);
refusal("a miter join (by default)", svg(DOTS + SMILE.replace(' stroke-linejoin="round"', "")), /stroke-linejoin miter \(SVG's default\); joins are round/);
refusal("a mark both filled and stroked", svg(DOTS + SMILE.replace('fill="none"', 'fill="#000000"')), /is filled and stroked: a mark is a stroke or a fill/);
refusal("a stroke with SVG's default black fill (no fill=\"none\")", svg(DOTS + SMILE.replace(' fill="none"', "")), /SVG fills a shape black unless it says fill="none"/);
refusal("marks flattened into one element", svg(F("M7 10.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0Z M14 10.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0Z") + SMILE + S("M12 4h.5")), /holds 2 separate pieces: one element per mark/);
refusal("a hole in a fill", svg(F("M6 10.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0Z M7.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0Z") + C(15.5, 10.5, 1.5) + SMILE), /subpath 2 sits inside subpath 1, a hole/);
refusal("path data the app can't read", svg(DOTS + S("M8 14.75c1.2 1.4")), /path data the app can't read/);

/* ── marks, live area, clear space ── */

refusal("a group icon with 2 marks", svg(DOTS), /2 marks; a group icon has exactly 3/);
refusal("a group icon with an accent (4 marks)", svg(DOTS + SMILE + S("M17.5 3.5h3l-3 3h3")), /4 marks; a group icon has exactly 3/);
refusal("a face with 6 marks", svg(DOTS + SMILE + S("M17.5 3.5h3l-3 3h3") + S("M3.75 14.5h1.5") + S("M18.75 14.5h1.5")), /6 marks; a face has at most 5/, "face");
ok("a face with 5 marks (two eyes, a mouth, two tears) is fine", face(svg(S("M6.25 10.25c.9 1.6 2.6 1.6 3.5 0") + S("M14.25 10.25c.9 1.6 2.6 1.6 3.5 0") + `<ellipse cx="12" cy="16.5" rx="2.25" ry="2.75" fill="#000000"/>` + S("M5.5 14.75v4.5") + S("M18.5 14.75v4.5"))).errors.length === 0);
refusal("ink past the live area at the 2.4 check weight", svg(DOTS + S("M3 15.5h18")), /<path d="M3 15\.5h18"> reaches x 1\.8 at the 2\.4 check weight: 0\.2 past the live area \(2–22\)/);
ok("a stroke centred 3.2 from the edge just fits at 2.4 (2.0 exactly)", group(svg(DOTS + S("M3.2 15.5h17.6"))).errors.every((e) => !/live area/.test(e.text)));
refusal("two marks too close, saying how much more space they need and where", svg(C(8.5, 10.5, 1.5) + C(15.5, 10.5, 1.5) + S("M8 13.5h8")), /\(left eye\) and .*\(mouth\) are 0\.3 apart at the 2\.4 check weight; a group icon's marks need 1\.5 \(1\.2 more\), closest near \(8\.5, 12\.15\)/);
refusal("marks that touch", svg(C(8.5, 10.5, 1.5) + C(15.5, 10.5, 1.5) + S("M8 12.75h8")), /touch at the 2\.4 check weight/);

/* ── joined marks ── */

{
  const TONGUE = S("M7.5 14.5c1.5 2.2 3 3 4.5 3s3-.8 4.5-3") + F("M12 16.8h2.6v1.4a1.3 1.3 0 0 1-2.6 0z");
  const r = face(svg(S("M6.25 11c.9-1.6 2.6-1.6 3.5 0") + C(15.5, 10.5, 1.5) + TONGUE));
  ok("a tongue under its smile is one joined mark: not measured against it, and noted", r.errors.length === 0 && r.notes.some((n) => /joins .* as one mark/.test(n.text)));
  const graze = face(svg(DOTS + S("M8 15.5h8") + S("M12 17.3h2")));
  ok("two strokes that only graze (overlap under 0.5) are too close, not joined", refuses(graze, /touch/) && !graze.notes.some((n) => /joins/.test(n.text)));
}

/* ── warnings stay warnings ── */

{
  const low = face(svg(C(8.5, 13, 1.5) + C(15.5, 13, 1.5) + S("M9.5 17.25h5")));
  ok("eyes off the eye line: a warning, imported", low.errors.length === 0 && warns(low, /the left eye's centre is at y 13; the eye line is y 10\.5/));
  const high = face(svg(DOTS + S("M9.5 14.5h5")));
  ok("a mouth above the mouth line: a warning", high.errors.length === 0 && warns(high, /the mouth's centre is at y 14\.5; the mouth line is y 15\.5/));
  const zz = face(svg(S("M6.25 11c.9 1.6 2.6 1.6 3.5 0") + S("M14.25 11c.9 1.6 2.6 1.6 3.5 0") + S("M10.5 16.25h3") + S("M17.5 3.5h3l-3 3h3")));
  ok("eyes and mouth dropped 0.75 under a top accent (sleepy): no warning", clean(zz));
  const asym = face(svg(C(9.5, 10.5, 1.5) + C(16.5, 10.5, 1.5) + S("M10 16h5")));
  ok("eyes off the centre axis: a warning", asym.errors.length === 0 && warns(asym, /the eyes are centred on x 13; faces are symmetric about x 12/));
  const dotStroke = face(svg(S("M8.5 10.5h.01") + S("M15.5 10.5h.01") + SMILE));
  ok("zero-length stroke dots: a warning to draw a filled circle", dotStroke.errors.length === 0 && warns(dotStroke, /zero-length stroke used as a dot/));
  const shortStroke = face(svg(DOTS + S("M11 15.5h2")));
  ok("a stroke shorter than 3: a warning", warns(shortStroke, /a stroke 2 long; strokes are at least 3/));
  ok("a fill narrower than 2.4 (the half-disc eye, 2.2): a warning", warns(face(svg(HALF + S("M9.5 15.5h5"))), /2\.2 across at its narrowest; fills are at least 2\.4/));
  const lost = face(svg(DOTS + S("M2.5 4h2")));
  ok("no mouth to be found: the line checks are skipped with a warning", warns(lost, /couldn't tell two eyes and a mouth apart/));
}

/* ── shapes to path data ── */

{
  const one = (el) => face(svg(el + DOTS + S("M9.5 15.5h5"))).shapes[0];
  const box = (d) => {
    const pts = flatten(parsePath(d)).flatMap((s) => s.pts);
    return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))].map((v) => +v.toFixed(3));
  };
  const c = one(`<circle cx="12" cy="4.5" r="1.5"/>`);
  ok("a circle becomes arc path data, numbers rounded", c.d === "M10.5,4.5a1.5,1.5 0 1 0 3,0a1.5,1.5 0 1 0 -3,0Z" && c.f === "#000000");
  ok("an ellipse keeps its two radii", box(one(`<ellipse cx="12" cy="4.5" rx="2.25" ry="1.25"/>`).d).join() === "9.75,3.25,14.25,5.75");
  ok("a rect with rx and ry becomes rounded corners on both axes", (() => {
    const d = one(`<rect x="17" y="3" width="4" height="3" rx="1.5" ry="1" fill="#000"/>`).d;
    return box(d).join() === "17,3,21,6" && /a1\.5,1 0 0 1/.test(d);
  })());
  ok("a <line> becomes M…L…", one(`<line x1="17" y1="4" x2="20" y2="4" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`).d === "M17,4L20,4");
  ok("a <polyline> and a <polygon> (closed)", one(`<polyline points="17.5,3.5 20.5,3.5 17.5,6.5 20.5,6.5" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`).d === "M17.5,3.5L20.5,3.5 17.5,6.5 20.5,6.5" && /Z$/.test(one(`<polygon points="18,3 20,3 19,5"/>`).d));
  ok("a filled <line> draws nothing and is left out with a warning", warns(face(svg(DOTS + SMILE + `<line x1="17" y1="4" x2="20" y2="4"/>`)), /neither fill nor stroke|draws nothing/));
  ok("a path's data is kept as drawn (whitespace tidied)", one(`<path d="M17 4\n  h3" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`).d === "M17 4 h3");
  ok("refuses a length in %", refuses(face(svg(`<circle cx="50%" cy="4" r="1"/>` + DOTS + SMILE)), /cx="50%" is a length the importer can't read/));
}

/* ── the whole set ── */

{
  const files = new Map([
    ["mood-group-calm.svg", CALM],
    ["mood-sleepy.svg", svg(S("M6.25 11c.9 1.6 2.6 1.6 3.5 0") + S("M14.25 11c.9 1.6 2.6 1.6 3.5 0") + S("M10.5 16.25h3") + S("M17.5 3.5h3l-3 3h3"))],
    ["mood-smug.svg", svg(HALF + SMIRK)],
    ["mood-exited.svg", CALM],
  ]);
  const r = importSet(files, moods);
  const status = (k) => r.results.find((x) => x.entry.key === k).status;
  ok("a partial delivery imports what is there", status("mood-group-calm") === "ok" && status("mood-sleepy") === "ok");
  ok("a rejected file is left out", status("mood-smug") === "rejected" && !/"mood-smug"/.test(r.ts.split("\n").pop()));
  ok("the rest are reported missing, not fatal", r.results.filter((x) => x.status === "missing").length === 31);
  ok("a misspelled file is not imported, and the nearest name is suggested", r.unexpected.length === 1 && r.unexpected[0].name === "mood-exited.svg" && r.unexpected[0].suggestion === "mood-excited.svg");
  ok("the table holds the two imported icons, in moods.ts order", /"mood-group-calm":\[.*\],"mood-sleepy":\[/.test(r.ts) && !/"mood-exited"/.test(r.ts));
  ok("its header names what was imported, missing and rejected", /Imported: 2 of 34 — mood-group-calm, mood-sleepy\./.test(r.ts) && /Not delivered yet: 31 —/.test(r.ts) && /Rejected by the checks \(run the importer for its report\): 1 —\s+mood-smug\./.test(r.ts));
  const twins = importSet(new Map([["mood-cheerful.svg", svg(UP + SMIRK)], ["mood-delighted.svg", svg(UP + SMIRK)]]), moods);
  ok("two icons drawn exactly alike: a warning on both", twins.results.filter((x) => x.status === "ok" && x.check.warnings.some((w) => /draws exactly what/.test(w.text))).length === 2);
  const none = importSet(new Map(), moods);
  ok("an empty folder writes an empty table", /Imported: none of 34\./.test(none.ts) && /= \{\};$/m.test(none.ts));
  ok("the grid constant is 24", GRID === 24);
}

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
