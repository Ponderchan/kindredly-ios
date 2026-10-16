// node scripts/import-mood-art.mjs            check the mood icons in design/moods-line, write src/data/mood-line-art.ts
// node scripts/import-mood-art.mjs --check    exit 1 if mood-line-art.ts is out of date with the SVG files
//
// THE MOOD ICONS' IMPORTER (the 10a overhaul, step 5; owner, 2026-10-16). The owner redraws the
// mood icons as one family of 34 one-colour line faces: 4 group icons (mood-group-calm, -happy,
// -tired, -low: a page that chose only a group's colour) and the 30 faces (mood-<face id>), each
// a 24 × 24 SVG drawn in #000000 with every stroke 2 wide, round caps and joins, and no plate.
// The app draws the tile in the group's fill and paints the marks in the group's face ink,
// scaling every stroke by the size's optical step (2.4 at a face of 14pt or less, 2.0 up to
// 29pt, 1.75 from 30pt). The rules are design/moods-line/SPEC.html, from the mood spec and its
// critic (.claude/ui10a-research/step5/mood-spec.json); this script is where they are enforced.
//
// WHAT IT READS. Every *.svg directly in design/moods-line whose name doesn't start with "_" or
// "." (the template _template-24.svg, the _reference folder, the spec page and any source file
// are skipped). The names it expects come from src/data/moods.ts: mood-<group id> for each of
// MOOD_GROUP_IDS and mood-<face id> for each face of MOOD_GROUP_FACES (which must cover MOOD_IDS
// exactly). A missing file is reported, never fatal: a partial delivery (the four group icons
// first, say) imports what is there, and every icon that isn't drawn yet falls back in the app
// to its group's icon, then to the 10a line face. A file no mood is named after is reported with
// the nearest name (a misspelling, most likely) and left out.
//
// IT IS TOLERANT about what the drawing tools write (the critic's list): paint inherited from the
// root or a <g> is resolved (Figma's fill="none" on the root); black, #000, #000000 and rgb(0,0,0)
// are the ink, any other opaque dark colour is read as the ink with a warning (Illustrator's CMYK
// black #231F20), and a light colour is refused (a white knock-out or highlight); extra root
// attributes, <title>, <desc>, <metadata>, comments, ids, data-* and editor attributes are
// ignored; inline style="" declarations are read like attributes; a <g id="guides"> (the
// template's guide layer) is stripped with everything in it; Figma's frame clip (Clip content,
// on by default: a clipPath of one rect over the whole artboard, which clips nothing the live
// area allows) is let go. Circles, ellipses, rects, lines, polylines and polygons become path
// data (scripts/art-path.mjs shapeData for the round ones).
//
// IT CHECKS every drawing rule and prints a report per file naming the element (its line and a
// short description), what is wrong and by how much. An ERROR rejects the icon (it is left out
// of mood-line-art.ts and the app keeps its fallback); a WARNING is printed and the icon is
// imported. Errors:
//   - not readable XML, the root is not <svg>, the viewBox is not 0 0 24 24;
//   - a transform, an opacity (opacity, fill-opacity, stroke-opacity, a see-through colour), a
//     gradient, pattern, mask, clip, filter, marker, <use>, <symbol>, <defs> with content,
//     <style>, text or an image, a dash array, a hidden element, an element or attribute the
//     importer doesn't know;
//   - paint that isn't the ink or none (currentColor, url(), a light or mid-tone colour), and a
//     background rect over the whole artboard (the frame's fill);
//   - a stroke whose width isn't 2 or whose cap or join isn't round;
//   - an element both filled and stroked (an open path stroked with SVG's default black fill
//     included: add fill="none");
//   - one element holding separate pieces (the marks were flattened or unioned: one element per
//     mark), or a filled element with a hole in it;
//   - the mark count: a mark is one drawable element; a group icon has exactly 3 (two eyes and a
//     mouth), a face at most 5 (an accent of up to two marks);
//   - ink outside the live area x 2–22, y 2–22, with every stroke at the 2.4 check weight;
//   - less than 1.25 clear space between two marks at the 2.4 check weight (1.5 for a group
//     icon, which shows at 12pt in the calendar legend), measured edge to edge on the sampled
//     outlines (curves flattened every 0.08 units). Two elements whose ink overlaps by half a
//     unit or more at the master weight are one joined mark (the tongue under its smile) and are
//     not measured against each other.
// Warnings: the eye line (y 10.5 ± 0.75) and the mouth line (y 15.5, down to 16.5; both may
// drop together by 0.75 under a top accent), the eyes' symmetry about x 12, the cluster box
// (x 5–19, y 7.5–20) and the cluster's size and centre, strokes shorter than 3, fills narrower
// than 2.4, zero-length stroke dots, a dark colour read as the ink, a width or height that isn't
// 24, and two icons drawn exactly alike. The eyes and mouth are found by position (two marks
// either side of the centre axis near the eye line, then the mark nearest the mouth line);
// when they can't be, the line checks are skipped with a warning.
//
// WHAT IT WRITES: src/data/mood-line-art.ts, the imported icons as flat shape lists (every mark
// a path, ArtShapes's format) keyed mood-<id> and mood-group-<g> (moods.ts moodArtKey), grid 24,
// in the template ink. The thirty old 60-grid faces in src/data/mood-art.ts stay untouched until
// they are redrawn. scripts/gen-mood-art-swift.mjs then writes the Swift copy.
//
// Exit status: 0 when every delivered file is imported; 1 when a file was rejected or a file no
// mood is named after is present (the rest are still written), or, with --check, when
// mood-line-art.ts is out of date. Missing files never fail the run.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { PATH_CHARS, parsePath, shapeData, toArtPath } from "./art-path.mjs";

export const DIR = new URL("../design/moods-line/", import.meta.url);
export const MOODS = new URL("../src/data/moods.ts", import.meta.url);
export const OUT = new URL("../src/data/mood-line-art.ts", import.meta.url);

/** the artboard and viewBox: 0 0 24 24 */
export const GRID = 24;
/** the template ink every mark is written in (the app paints it the group's face ink) */
export const INK = "#000000";
/** the one stroke weight of the master drawing */
export const STROKE = 2;
/** the heaviest optical step (a face of 14pt or less), at which the space rules are checked */
export const CHECK_WEIGHT = 2.4;
/** the live area, on both axes */
export const LIVE = [2, 22];
/** clear space between two marks at the check weight */
export const CLEAR = { face: 1.25, group: 1.5 };
/** marks per icon: a group icon exactly, a face at most */
export const MARKS = { group: 3, face: 5 };
/** two elements whose ink overlaps by this much at the master weight are one joined mark */
export const JOIN_OVERLAP = 0.5;
/** curves are flattened into chords about this long */
const STEP = 0.08;
/** float noise allowed on the hard limits */
const EPS = 1e-6;

/* ── the names, from moods.ts ────────────────────────────────────────────── */

const strings = (s) => [...s.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

/**
 * The expected icons from moods.ts: MOOD_GROUPS, MOOD_GROUP_IDS, MOOD_GROUP_FACES (checked to
 * cover MOOD_IDS exactly once each). `expected` lists every icon in the order it is written: each
 * group's icon, then its faces.
 */
export function readMoods(text) {
  const grab = (re, what) => {
    const m = re.exec(text);
    if (!m) throw new Error(`moods.ts: no ${what}`);
    return m[1];
  };
  const groups = strings(grab(/export const MOOD_GROUPS\b[^=]*=\s*\[([^\]]*)\]/, "MOOD_GROUPS array"));
  const faces = strings(grab(/export const MOOD_IDS\b[^=]*=\s*\[([^\]]*)\]/, "MOOD_IDS array"));
  const groupIds = Object.fromEntries(
    [...grab(/export const MOOD_GROUP_IDS\b[^=]*=\s*\{([^}]*)\}/, "MOOD_GROUP_IDS table").matchAll(/([\w-]+)\s*:\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]),
  );
  const groupFaces = Object.fromEntries(
    [...grab(/export const MOOD_GROUP_FACES\b[^=]*=\s*\{([\s\S]*?)\n\};/, "MOOD_GROUP_FACES table").matchAll(/([\w-]+)\s*:\s*\[([^\]]*)\]/g)].map((m) => [m[1], strings(m[2])]),
  );
  if (!groups.length) throw new Error("moods.ts: MOOD_GROUPS is empty");
  if (faces.length === 0) throw new Error("moods.ts: MOOD_IDS is empty");
  for (const g of groups) {
    if (!groupIds[g]) throw new Error(`moods.ts: MOOD_GROUP_IDS has no id for the ${g} group`);
    if (!groupFaces[g]) throw new Error(`moods.ts: MOOD_GROUP_FACES has no list for the ${g} group`);
  }
  const placed = groups.flatMap((g) => groupFaces[g]);
  const twice = placed.filter((f, i) => placed.indexOf(f) !== i);
  const unplaced = faces.filter((f) => !placed.includes(f));
  const unknown = placed.filter((f) => !faces.includes(f));
  if (twice.length || unplaced.length || unknown.length) {
    throw new Error(
      `moods.ts: MOOD_GROUP_FACES must hold every MOOD_IDS face once (${[
        twice.length && `twice: ${twice.join(", ")}`,
        unplaced.length && `in no group: ${unplaced.join(", ")}`,
        unknown.length && `not in MOOD_IDS: ${unknown.join(", ")}`,
      ]
        .filter(Boolean)
        .join("; ")})`,
    );
  }
  const expected = groups.flatMap((g) => [
    { key: `mood-${groupIds[g]}`, id: groupIds[g], group: g, kind: "group" },
    ...groupFaces[g].map((f) => ({ key: `mood-${f}`, id: f, group: g, kind: "face" })),
  ]);
  return { groups, faces, groupIds, groupFaces, expected };
}

/* ── a small XML reader ──────────────────────────────────────────────────── */

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decode = (s) =>
  s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[A-Za-z]\w*);/g, (m, e) =>
    e[0] === "#" ? String.fromCodePoint(e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (ENTITIES[e] ?? m),
  );

/**
 * Reads an SVG file into a tree of { tag, attrs: [[name, value]], children, text, line }.
 * Comments, processing instructions and a DOCTYPE are skipped; CDATA is text. Throws on what
 * isn't well-formed, saying where.
 */
export function parseXml(source) {
  const text = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
  const n = text.length;
  const lineAt = (pos) => {
    let line = 1;
    for (let k = 0; k < pos && k < n; k++) if (text.charCodeAt(k) === 10) line++;
    return line;
  };
  const stack = [];
  let root = null;
  let i = 0;
  const TAG = /<([A-Za-z_][\w:.-]*)/y;
  const ATTR = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/y;
  const END = /<\/\s*([^\s>]+)\s*>/y;
  while (i < n) {
    const lt = text.indexOf("<", i);
    const chunk = text.slice(i, lt < 0 ? n : lt);
    if (chunk.trim()) {
      if (!stack.length) throw new Error(`text outside the <svg> element (line ${lineAt(i)})`);
      stack[stack.length - 1].text += decode(chunk);
    }
    if (lt < 0) break;
    i = lt;
    if (text.startsWith("<!--", i)) {
      const e = text.indexOf("-->", i + 4);
      if (e < 0) throw new Error(`a comment that never ends (line ${lineAt(i)})`);
      i = e + 3;
      continue;
    }
    if (text.startsWith("<![CDATA[", i)) {
      const e = text.indexOf("]]>", i);
      if (e < 0) throw new Error(`a CDATA section that never ends (line ${lineAt(i)})`);
      if (stack.length) stack[stack.length - 1].text += text.slice(i + 9, e);
      i = e + 3;
      continue;
    }
    if (text.startsWith("<?", i)) {
      const e = text.indexOf("?>", i);
      if (e < 0) throw new Error(`a <?…?> that never ends (line ${lineAt(i)})`);
      i = e + 2;
      continue;
    }
    if (text.startsWith("<!", i)) {
      // a DOCTYPE, with its internal subset in [ ] if there is one
      let j = i + 2;
      let depth = 0;
      for (; j < n; j++) {
        const c = text[j];
        if (c === "[") depth++;
        else if (c === "]") depth--;
        else if (c === ">" && depth <= 0) break;
      }
      if (j >= n) throw new Error(`a <!…> that never ends (line ${lineAt(i)})`);
      i = j + 1;
      continue;
    }
    if (text[i + 1] === "/") {
      END.lastIndex = i;
      const m = END.exec(text);
      if (!m) throw new Error(`a malformed end tag (line ${lineAt(i)})`);
      const el = stack.pop();
      if (!el) throw new Error(`</${m[1]}> closes nothing (line ${lineAt(i)})`);
      if (el.tag !== m[1]) throw new Error(`</${m[1]}> on line ${lineAt(i)} closes <${el.tag}> from line ${el.line}`);
      i = END.lastIndex;
      continue;
    }
    TAG.lastIndex = i;
    const m = TAG.exec(text);
    if (!m) throw new Error(`a "<" that starts no tag (line ${lineAt(i)})`);
    let j = TAG.lastIndex;
    const attrs = [];
    let selfClosing = false;
    for (;;) {
      while (j < n && /\s/.test(text[j])) j++;
      if (text.startsWith("/>", j)) {
        selfClosing = true;
        j += 2;
        break;
      }
      if (text[j] === ">") {
        j++;
        break;
      }
      ATTR.lastIndex = j;
      const a = ATTR.exec(text);
      if (!a) throw new Error(`a malformed attribute in <${m[1]}> (line ${lineAt(j)})`);
      if (attrs.some(([k]) => k === a[1])) throw new Error(`<${m[1]}> has ${a[1]} twice (line ${lineAt(j)})`);
      attrs.push([a[1], decode(a[2] ?? a[3])]);
      j = ATTR.lastIndex;
    }
    const el = { tag: m[1], attrs, children: [], text: "", line: lineAt(i) };
    if (stack.length) stack[stack.length - 1].children.push(el);
    else if (root) throw new Error(`a second root element <${el.tag}> (line ${el.line})`);
    else root = el;
    if (!selfClosing) stack.push(el);
    i = j;
  }
  if (stack.length) throw new Error(`<${stack[stack.length - 1].tag}> opened on line ${stack[stack.length - 1].line} is never closed`);
  if (!root) throw new Error("no element at all");
  return root;
}

const attr = (el, name) => {
  const a = el.attrs.find(([k]) => k === name);
  return a ? a[1] : undefined;
};
const localName = (tag) => (tag.startsWith("svg:") ? tag.slice(4) : tag);

/* ── numbers, colours ────────────────────────────────────────────────────── */

const NUM = /^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)(px)?\s*$/;
const NUMBERS = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
/** a length as a number: plain or px; anything else (%, em, mm) can't be read on a fixed grid */
function length(v, what) {
  const m = NUM.exec(v ?? "");
  if (!m) throw new Error(`${what}="${v}" is a length the importer can't read (plain numbers only)`);
  return Number(m[1]);
}
const round = (n) => {
  const r = +n.toFixed(4);
  return Object.is(r, -0) ? 0 : r;
};
const f2 = (n) => {
  const s = n.toFixed(2);
  return s === "-0.00" ? "0.00" : s;
};
/** a number for a message: two decimals, trailing zeros dropped */
const num = (n) => String(+f2(n));

const NAMED = {
  black: [0, 0, 0], white: [255, 255, 255], red: [255, 0, 0], green: [0, 128, 0], blue: [0, 0, 255], yellow: [255, 255, 0],
  gray: [128, 128, 128], grey: [128, 128, 128], silver: [192, 192, 192], maroon: [128, 0, 0], purple: [128, 0, 128],
  fuchsia: [255, 0, 255], magenta: [255, 0, 255], lime: [0, 255, 0], olive: [128, 128, 0], navy: [0, 0, 128], teal: [0, 128, 128],
  aqua: [0, 255, 255], cyan: [0, 255, 255], orange: [255, 165, 0], darkgray: [169, 169, 169], darkgrey: [169, 169, 169],
  dimgray: [105, 105, 105], dimgrey: [105, 105, 105], lightgray: [211, 211, 211], lightgrey: [211, 211, 211],
  gainsboro: [220, 220, 220], whitesmoke: [245, 245, 245], snow: [255, 250, 250], ivory: [255, 255, 240],
  darkslategray: [47, 79, 79], darkslategrey: [47, 79, 79], midnightblue: [25, 25, 112], darkblue: [0, 0, 139], indigo: [75, 0, 130],
};

/** A paint value: { none } or { rgba: [r, g, b, a] } (0-255, alpha 0-1), or { error }. */
export function readColour(value) {
  const v = String(value).trim();
  const low = v.toLowerCase();
  if (low === "none" || low === "transparent") return { none: true };
  if (low === "currentcolor") return { error: "currentColor (its colour depends on where the icon is used): export a real colour, black" };
  if (low.startsWith("url(")) return { error: `a gradient or pattern paint (${v})` };
  let m = /^#([0-9a-f]+)$/i.exec(v);
  if (m) {
    const h = m[1];
    if (h.length === 3 || h.length === 4) {
      const c = [...h].map((x) => parseInt(x + x, 16));
      return { rgba: [c[0], c[1], c[2], h.length === 4 ? c[3] / 255 : 1] };
    }
    if (h.length === 6 || h.length === 8) {
      const c = h.match(/../g).map((x) => parseInt(x, 16));
      return { rgba: [c[0], c[1], c[2], h.length === 8 ? c[3] / 255 : 1] };
    }
    return { error: `a colour the importer can't read (${v})` };
  }
  m = /^rgba?\(([^)]*)\)$/i.exec(v);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length !== 3 && parts.length !== 4) return { error: `a colour the importer can't read (${v})` };
    const c = parts.map((p, k) => {
      const pm = /^([+-]?(?:\d+\.?\d*|\.\d+))(%?)$/.exec(p);
      if (!pm) return NaN;
      const x = Number(pm[1]);
      if (k === 3) return pm[2] ? x / 100 : x;
      return pm[2] ? (x * 255) / 100 : x;
    });
    if (c.some((x) => !Number.isFinite(x))) return { error: `a colour the importer can't read (${v})` };
    return { rgba: [c[0], c[1], c[2], c.length === 4 ? c[3] : 1] };
  }
  if (Object.prototype.hasOwnProperty.call(NAMED, low)) return { rgba: [...NAMED[low], 1] };
  return { error: `a colour the importer can't read (${v}): use hex, #000000` };
}

/** WCAG relative luminance of an sRGB colour (0-255 channels). */
export function luminance([r, g, b]) {
  const lin = (c) => {
    const s = Math.min(255, Math.max(0, c)) / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** the darkest a colour may be and still not count as the ink */
const INK_MAX_LUMINANCE = 0.2;
/** lighter than this is a knock-out or a highlight */
const LIGHT_MIN_LUMINANCE = 0.5;

/** A paint value as the importer reads it: { none }, { ink, warn? }, or { error }. */
export function classifyPaint(value) {
  const c = readColour(value);
  if (c.error || c.none) return c;
  const [r, g, b, a] = c.rgba;
  if (a < 1) return { error: `a see-through colour (${value}): no opacity, the ink is solid` };
  if (r === 0 && g === 0 && b === 0) return { ink: true };
  const L = luminance([r, g, b]);
  if (L <= INK_MAX_LUMINANCE) return { ink: true, warn: `${value} read as the ink (draw in black, #000000; an Illustrator CMYK document exports black as #231F20, use RGB)` };
  if (L >= LIGHT_MIN_LUMINANCE) return { error: `a light colour (${value}): a knock-out or a highlight? The family is one colour, every mark in black` };
  return { error: `${value} is too light to read as the ink: draw every mark in black (#000000)` };
}

/* ── elements and attributes ─────────────────────────────────────────────── */

const DRAWABLE = new Set(["path", "circle", "ellipse", "rect", "line", "polyline", "polygon"]);
const SKIPPED = new Set(["title", "desc", "metadata"]);
const REFUSED_ELEMENTS = {
  style: "a <style> sheet: export with presentation attributes (Illustrator: Styling = Presentation Attributes)",
  linearGradient: "a gradient",
  radialGradient: "a gradient",
  pattern: "a pattern",
  mask: "a mask",
  clipPath: "a clipping path (Figma: turn Clip content off)",
  filter: "a filter",
  use: "a <use> copy: make it a real shape",
  symbol: "a <symbol>",
  text: "text: draw it as marks",
  tspan: "text: draw it as marks",
  textPath: "text: draw it as marks",
  image: "an embedded image",
  marker: "a marker",
  foreignObject: "foreign content",
  script: "a script",
  switch: "a <switch>",
  a: "a link",
  svg: "an <svg> inside the <svg>",
  animate: "an animation",
  animateTransform: "an animation",
  animateMotion: "an animation",
  set: "an animation",
};
const PAINT = new Set(["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"]);
const GEOMETRY = {
  path: ["d"],
  circle: ["cx", "cy", "r"],
  ellipse: ["cx", "cy", "rx", "ry"],
  rect: ["x", "y", "width", "height", "rx", "ry"],
  line: ["x1", "y1", "x2", "y2"],
  polyline: ["points"],
  polygon: ["points"],
};
// harmless everywhere: names, classes (a <style> sheet is refused on its own), the fill and clip
// rules (holes are refused, so the rule never decides anything), the miter limit (joins are
// round), dash offsets and path lengths (dash arrays are refused), rendering hints
const IGNORED = new Set([
  "id", "class", "fill-rule", "clip-rule", "stroke-miterlimit", "stroke-dashoffset", "pathLength", "paint-order",
  "shape-rendering", "color-interpolation", "color-interpolation-filters", "color-rendering", "image-rendering",
  "text-rendering", "isolation", "lang", "tabindex", "focusable", "role", "color",
]);
// read on the root only: its size and housekeeping (the viewBox is checked on its own)
const ROOT_IGNORED = new Set(["width", "height", "x", "y", "viewBox", "version", "baseProfile", "preserveAspectRatio", "enable-background", "overflow", "contentScriptType", "contentStyleType", "zoomAndPan"]);
const IDENTITY_TRANSFORM = /^\s*(?:(?:matrix\(\s*1[\s,]+0[\s,]+0[\s,]+1[\s,]+0[\s,]+0\s*\)|translate\(\s*0(?:[\s,]+0)?\s*\)|scale\(\s*1(?:[\s,]+1)?\s*\)|rotate\(\s*0\s*\))\s*)*$/;

/**
 * What one attribute (or style declaration) on an element means: "paint", "geometry", "ignore",
 * or { refuse: why }. `unknown` for one the importer doesn't know.
 */
function classifyAttr(tag, name, value, isRoot) {
  const v = String(value).trim();
  const low = v.toLowerCase();
  if (PAINT.has(name)) return "paint";
  if (GEOMETRY[tag]?.includes(name)) return "geometry";
  if (isRoot && ROOT_IGNORED.has(name)) return "ignore";
  if (IGNORED.has(name) || name.startsWith("data-") || name.startsWith("aria-") || name === "xmlns") return "ignore";
  if (name === "xlink:href" || name === "href") return { refuse: `a link to another element (${name}="${v}")` };
  if (name.includes(":")) return "ignore"; // xml:space, xmlns:xlink, inkscape:…, sodipodi:…, serif:…
  switch (name) {
    case "transform":
      return IDENTITY_TRANSFORM.test(v) ? "ignore" : { refuse: `a transform (${v}): apply or flatten it before export` };
    case "opacity":
    case "fill-opacity":
    case "stroke-opacity": {
      const m = NUM.exec(v);
      const pct = /^\s*100%\s*$/.test(v);
      return pct || (m && Number(m[1]) === 1) ? "ignore" : { refuse: `${name} ${v}: no opacity, the ink is solid` };
    }
    case "stroke-dasharray":
      return low === "none" || low === "" ? "ignore" : { refuse: `a dashed stroke (stroke-dasharray ${v})` };
    case "vector-effect":
      return low === "none" ? "ignore" : { refuse: `vector-effect ${v}: the app scales the strokes itself` };
    case "mask":
    case "clip-path":
    case "filter":
    case "marker":
    case "marker-start":
    case "marker-mid":
    case "marker-end":
      return low === "none" ? "ignore" : { refuse: `${name} ${v}` };
    case "display":
      return low === "none" ? { refuse: "a hidden element (display none): delete it before export" } : "ignore";
    case "visibility":
      return low === "hidden" || low === "collapse" ? { refuse: `a hidden element (visibility ${v}): delete it before export` } : "ignore";
    case "mix-blend-mode":
      return low === "normal" ? "ignore" : { refuse: `a blend mode (${v})` };
    case "style":
      return "style";
    default:
      return isRoot ? "ignore" : "unknown";
  }
}

/** style="a: b; c: d" as [[a, b], [c, d]] */
const declarations = (style) =>
  style
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const k = d.indexOf(":");
      return k < 0 ? [d.trim(), ""] : [d.slice(0, k).trim(), d.slice(k + 1).trim()];
    });

/* ── geometry ────────────────────────────────────────────────────────────── */

/** An element's shape as path data, or null when it has no size (SVG draws nothing either). */
function elementData(tag, el) {
  const val = (name, fallback) => {
    const v = attr(el, name);
    return v === undefined ? fallback : length(v, name);
  };
  switch (tag) {
    case "path": {
      const d = attr(el, "d");
      if (d === undefined || !d.trim()) return null;
      const out = d.trim().replace(/\s+/g, " ");
      if (!PATH_CHARS.test(out)) throw new Error(`path data with characters SVG doesn't allow ("${out.length > 40 ? out.slice(0, 37) + "…" : out}")`);
      return out;
    }
    case "circle": {
      const r = val("r", 0);
      return r > 0 ? shapeData({ t: "c", cx: val("cx", 0), cy: val("cy", 0), r }, round) : null;
    }
    case "ellipse": {
      // SVG 2: an auto radius takes the other's value
      const rxv = attr(el, "rx");
      const ryv = attr(el, "ry");
      const rx = rxv === undefined || rxv === "auto" ? (ryv === undefined || ryv === "auto" ? 0 : length(ryv, "ry")) : length(rxv, "rx");
      const ry = ryv === undefined || ryv === "auto" ? rx : length(ryv, "ry");
      return rx > 0 && ry > 0 ? shapeData({ t: "e", cx: val("cx", 0), cy: val("cy", 0), rx, ry }, round) : null;
    }
    case "rect": {
      const x = val("x", 0);
      const y = val("y", 0);
      const w = val("width", 0);
      const h = val("height", 0);
      if (!(w > 0 && h > 0)) return null;
      const rxv = attr(el, "rx");
      const ryv = attr(el, "ry");
      const given = (v) => v !== undefined && v !== "auto";
      let rx = given(rxv) ? length(rxv, "rx") : given(ryv) ? length(ryv, "ry") : 0;
      let ry = given(ryv) ? length(ryv, "ry") : rx;
      rx = Math.max(0, Math.min(rx, w / 2));
      ry = Math.max(0, Math.min(ry, h / 2));
      const [X, Y, W, H] = [x, y, w, h].map(round);
      if (rx === 0 || ry === 0) return `M${X},${Y}h${W}v${H}h${round(-w)}Z`;
      const [a, b, sw, sh] = [rx, ry, w - 2 * rx, h - 2 * ry].map(round);
      return `M${round(x + rx)},${Y}h${sw}a${a},${b} 0 0 1 ${a},${b}v${sh}a${a},${b} 0 0 1 ${-a},${b}h${round(-sw)}a${a},${b} 0 0 1 ${-a},${-b}v${round(-sh)}a${a},${b} 0 0 1 ${a},${-b}Z`;
    }
    case "line":
      return `M${round(val("x1", 0))},${round(val("y1", 0))}L${round(val("x2", 0))},${round(val("y2", 0))}`;
    case "polyline":
    case "polygon": {
      const p = (attr(el, "points") ?? "").match(NUMBERS)?.map(Number) ?? [];
      if (p.length % 2) throw new Error(`points="${attr(el, "points")}" holds an odd count of numbers`);
      if (p.length < 4) return null;
      const pairs = [];
      for (let k = 0; k < p.length; k += 2) pairs.push(`${round(p[k])},${round(p[k + 1])}`);
      return `M${pairs[0]}L${pairs.slice(1).join(" ")}${tag === "polygon" ? "Z" : ""}`;
    }
  }
  return null;
}

/** parsePath's segments as polylines: [{ pts: [[x, y]], closed }], curves cut into short chords. */
export function flatten(segments, step = STEP) {
  const subs = [];
  let cur = null;
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  const begin = () => {
    cur = { pts: [[x, y]], closed: false };
    subs.push(cur);
  };
  const chords = (pts) => {
    let len = 0;
    for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    return Math.min(400, Math.max(4, Math.ceil(len / step)));
  };
  for (const s of segments) {
    if (s.op === "M") {
      [x, y] = s.p;
      sx = x;
      sy = y;
      begin();
      continue;
    }
    if (s.op === "Z") {
      if (cur) cur.closed = true;
      x = sx;
      y = sy;
      cur = null;
      continue;
    }
    if (!cur) begin();
    if (s.op === "L") {
      [x, y] = s.p;
      cur.pts.push([x, y]);
    } else if (s.op === "Q") {
      const [cx, cy, ex, ey] = s.p;
      const n = chords([[x, y], [cx, cy], [ex, ey]]);
      for (let k = 1; k <= n; k++) {
        const t = k / n;
        const u = 1 - t;
        cur.pts.push([u * u * x + 2 * u * t * cx + t * t * ex, u * u * y + 2 * u * t * cy + t * t * ey]);
      }
      [x, y] = [ex, ey];
    } else if (s.op === "C") {
      const [c1x, c1y, c2x, c2y, ex, ey] = s.p;
      const n = chords([[x, y], [c1x, c1y], [c2x, c2y], [ex, ey]]);
      for (let k = 1; k <= n; k++) {
        const t = k / n;
        const u = 1 - t;
        cur.pts.push([
          u * u * u * x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex,
          u * u * u * y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ey,
        ]);
      }
      [x, y] = [ex, ey];
    }
  }
  return subs;
}

const boxOf = (pts) => {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of pts) {
    if (x < b[0]) b[0] = x;
    if (y < b[1]) b[1] = y;
    if (x > b[2]) b[2] = x;
    if (y > b[3]) b[3] = y;
  }
  return b;
};
const unionBox = (boxes) => boxOf(boxes.flatMap((b) => [[b[0], b[1]], [b[2], b[3]]]));
const grow = (b, r) => [b[0] - r, b[1] - r, b[2] + r, b[3] + r];
const boxGap = (a, b) => Math.hypot(Math.max(0, a[0] - b[2], b[0] - a[2]), Math.max(0, a[1] - b[3], b[1] - a[3]));

/** A mark's segments ([ax, ay, bx, by], with its box) — a fill's subpaths closed. */
function segmentsOf(subs, closeAll) {
  const out = [];
  for (const s of subs) {
    const pts = s.pts;
    if (pts.length === 1) out.push([pts[0][0], pts[0][1], pts[0][0], pts[0][1]]);
    for (let k = 1; k < pts.length; k++) out.push([pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1]]);
    const last = pts[pts.length - 1];
    if ((closeAll || s.closed) && pts.length > 1 && (last[0] !== pts[0][0] || last[1] !== pts[0][1])) out.push([last[0], last[1], pts[0][0], pts[0][1]]);
  }
  return out.map((s) => ({ s, box: [Math.min(s[0], s[2]), Math.min(s[1], s[3]), Math.max(s[0], s[2]), Math.max(s[1], s[3])] }));
}

const cross = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
/** the nearest point of segment a-b to p */
function nearest(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  return [ax + t * dx, ay + t * dy];
}
function segmentsCross(a, b) {
  const [ax, ay, bx, by] = a;
  const [cx, cy, dx, dy] = b;
  const d1 = cross(cx, cy, dx, dy, ax, ay);
  const d2 = cross(cx, cy, dx, dy, bx, by);
  const d3 = cross(ax, ay, bx, by, cx, cy);
  const d4 = cross(ax, ay, bx, by, dx, dy);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}
/** the distance between two segments, with the nearest points: { d, p, q } */
function segmentDistance(a, b) {
  if (segmentsCross(a, b)) return { d: 0, p: [a[0], a[1]], q: [a[0], a[1]] };
  let best = { d: Infinity };
  const consider = (p, q) => {
    const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (d < best.d) best = { d, p, q };
  };
  consider([a[0], a[1]], nearest(a[0], a[1], b[0], b[1], b[2], b[3]));
  consider([a[2], a[3]], nearest(a[2], a[3], b[0], b[1], b[2], b[3]));
  consider(nearest(b[0], b[1], a[0], a[1], a[2], a[3]), [b[0], b[1]]);
  consider(nearest(b[2], b[3], a[0], a[1], a[2], a[3]), [b[2], b[3]]);
  return best;
}
/** nonzero winding of p in a fill's closed subpaths */
function inside(px, py, subs) {
  let wn = 0;
  for (const { pts } of subs) {
    for (let k = 0; k < pts.length; k++) {
      const [ax, ay] = pts[k];
      const [bx, by] = pts[(k + 1) % pts.length];
      if (ay <= py) {
        if (by > py && cross(ax, ay, bx, by, px, py) > 0) wn++;
      } else if (by <= py && cross(ax, ay, bx, by, px, py) < 0) wn--;
    }
  }
  return wn !== 0;
}

/**
 * The geometric distance between two marks' drawings (stroke centre-lines, fill regions), with
 * the nearest points: { d, p, q, inside } — d 0 when they cross, or when one runs inside a fill.
 */
function markDistance(A, B) {
  const pts = (m) => m.subs.flatMap((s) => s.pts);
  if (B.fill && pts(A).some(([x, y]) => inside(x, y, B.subs))) return { d: 0, inside: true, p: pts(A)[0], q: pts(A)[0] };
  if (A.fill && pts(B).some(([x, y]) => inside(x, y, A.subs))) return { d: 0, inside: true, p: pts(B)[0], q: pts(B)[0] };
  let best = { d: Infinity };
  for (const a of A.segs) {
    if (boxGap(a.box, B.box) >= best.d) continue;
    for (const b of B.segs) {
      if (boxGap(a.box, b.box) >= best.d) continue;
      const r = segmentDistance(a.s, b.s);
      if (r.d < best.d) best = r;
      if (best.d === 0) return { ...best, inside: false };
    }
  }
  return { ...best, inside: false };
}

/** half the ink's width around a mark's drawing at a stroke weight (a fill has none) */
const halfInk = (m, weight) => (m.fill ? 0 : weight / 2);

/** the length of a stroke's centre-line */
const polyLength = (subs) => subs.reduce((n, { pts }) => n + pts.slice(1).reduce((s, p, k) => s + Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]), 0), 0);

/* ── one file ────────────────────────────────────────────────────────────── */

/** <path d="M8 14.75c1.2…"> and the like, for a message */
function describe(el) {
  const tag = localName(el.tag);
  const a = (k) => attr(el, k);
  const short = (s, n = 18) => {
    const t = String(s ?? "").trim().replace(/\s+/g, " ");
    return t.length > n ? t.slice(0, n) + "…" : t;
  };
  switch (tag) {
    case "path":
      return `<path d="${short(a("d"))}">`;
    case "circle":
      return `<circle cx=${a("cx") ?? 0} cy=${a("cy") ?? 0} r=${a("r") ?? 0}>`;
    case "ellipse":
      return `<ellipse cx=${a("cx") ?? 0} cy=${a("cy") ?? 0} rx=${a("rx") ?? "auto"} ry=${a("ry") ?? "auto"}>`;
    case "rect":
      return `<rect x=${a("x") ?? 0} y=${a("y") ?? 0} ${a("width") ?? 0}×${a("height") ?? 0}>`;
    case "line":
      return `<line ${a("x1") ?? 0},${a("y1") ?? 0} → ${a("x2") ?? 0},${a("y2") ?? 0}>`;
    case "polyline":
    case "polygon":
      return `<${tag} points="${short(a("points"))}">`;
    default:
      return `<${el.tag}>`;
  }
}

/**
 * Checks one SVG file against every rule and reads its marks. `kind` is "group" (exactly 3
 * marks, 1.5 clear space) or "face". Returns { shapes, errors, warnings, notes, stats }; each
 * message is { line, text } (line null for the file as a whole). The icon is imported when
 * errors is empty.
 */
export function checkSvg(text, { kind = "face" } = {}) {
  const errors = [];
  const warnings = [];
  const notes = [];
  const result = { shapes: [], errors, warnings, notes, stats: null };
  const err = (line, t) => errors.push({ line, text: t });
  const warn = (line, t) => warnings.push({ line, text: t });

  let root;
  try {
    root = parseXml(text);
  } catch (e) {
    err(null, `not readable as SVG: ${e.message}`);
    return result;
  }
  if (localName(root.tag) !== "svg") {
    err(root.line, `the root element is <${root.tag}>, not <svg>`);
    return result;
  }

  // the viewBox is the only root attribute that has to be exact
  const vb = attr(root, "viewBox");
  const sizeOf = (k) => {
    const v = attr(root, k);
    const m = v === undefined ? null : NUM.exec(v);
    return m ? Number(m[1]) : v;
  };
  if (vb === undefined) {
    if (sizeOf("width") === GRID && sizeOf("height") === GRID) warn(root.line, `no viewBox: read width and height 24 as viewBox 0 0 24 24 (export it with viewBox="0 0 24 24")`);
    else err(root.line, `no viewBox: it must be viewBox="0 0 24 24"`);
  } else {
    const v = vb.match(NUMBERS)?.map(Number) ?? [];
    if (v.length !== 4 || v[0] !== 0 || v[1] !== 0 || v[2] !== GRID || v[3] !== GRID) err(root.line, `viewBox="${vb}": it must be 0 0 24 24 (a 24 × 24 artboard at 0,0)`);
  }
  for (const k of ["width", "height"]) {
    const v = sizeOf(k);
    if (v !== undefined && v !== GRID) warn(root.line, `${k}="${attr(root, k)}": the importer reads the viewBox only; export the artboard at 24 × 24`);
  }

  // walk the tree: inherited paint, refused things, the drawable elements in document order
  const DEFAULT = {
    fill: { v: "black", from: null },
    stroke: { v: "none", from: null },
    "stroke-width": { v: "1", from: null },
    "stroke-linecap": { v: "butt", from: null },
    "stroke-linejoin": { v: "miter", from: null },
  };
  // Figma's frame clip (Clip content, on by default): a clipPath of one rect over the whole
  // artboard clips nothing the live area allows, so it and the clip-path pointing at it are let go
  const covers = (r) => {
    const v = (k, d) => {
      const m = NUM.exec(attr(r, k) ?? "");
      return m ? Number(m[1]) : d;
    };
    return v("x", 0) <= 0 && v("y", 0) <= 0 && v("x", 0) + v("width", 0) >= GRID && v("y", 0) + v("height", 0) >= GRID;
  };
  const frameClips = new Set();
  const findClips = (el) => {
    for (const c of el.children) {
      if (localName(c.tag) === "clipPath") {
        const kids = c.children.filter((k) => !SKIPPED.has(localName(k.tag)));
        const plain = (k) => !attr(k, "transform") || IDENTITY_TRANSFORM.test(attr(k, "transform"));
        if (attr(c, "id") && plain(c) && (attr(c, "clipPathUnits") ?? "userSpaceOnUse") === "userSpaceOnUse" && kids.length === 1 && localName(kids[0].tag) === "rect" && plain(kids[0]) && covers(kids[0]))
          frameClips.add(attr(c, "id"));
      } else findClips(c);
    }
  };
  findClips(root);

  const drawables = [];
  const walk = (el, inherited, isRoot) => {
    const tag = localName(el.tag);
    const own = {};
    const readAttr = (name, value, viaStyle) => {
      const clip = name === "clip-path" ? /^url\(\s*['"]?#([^'")]+)['"]?\s*\)$/.exec(String(value).trim()) : null;
      if (clip && frameClips.has(clip[1])) return;
      const c = classifyAttr(tag, name, value, isRoot);
      if (c === "paint") {
        if (String(value).trim() !== "inherit") own[name] = { v: String(value).trim(), from: el, viaStyle };
      } else if (c === "style") {
        for (const [k, v] of declarations(value)) readAttr(k, v, true);
      } else if (c === "unknown") {
        err(el.line, `${describe(el)}: ${viaStyle ? "a style property" : "an attribute"} the importer doesn't know (${name}="${value}")`);
      } else if (c && typeof c === "object") {
        err(el.line, `${describe(el)}: ${c.refuse}`);
      }
    };
    // attributes first, then style="" over them (CSS beats presentation attributes)
    for (const [k, v] of el.attrs) if (k !== "style") readAttr(k, v, false);
    const style = attr(el, "style");
    if (style !== undefined) readAttr("style", style, false);
    const paint = { ...inherited, ...own };

    if (isRoot || tag === "g") {
      for (const child of el.children) {
        const ctag = localName(child.tag);
        if (ctag === "g" && /^guides?$/i.test(attr(child, "id") ?? attr(child, "data-name") ?? "")) {
          notes.push({ line: child.line, text: `stripped <g id="${attr(child, "id") ?? attr(child, "data-name")}"> and everything in it (the template's guides)` });
          continue;
        }
        if (child.tag.includes(":") && !child.tag.startsWith("svg:")) {
          notes.push({ line: child.line, text: `ignored <${child.tag}> (an editor's own element)` });
          continue;
        }
        walk(child, paint, false);
      }
      if (el.text.trim()) err(el.line, `stray text in <${el.tag}>: "${el.text.trim().slice(0, 30)}"`);
      return;
    }
    if (SKIPPED.has(tag)) return;
    if (tag === "defs") {
      // an empty <defs/> is harmless; anything in it is something the app wouldn't draw
      for (const c of el.children) {
        const ctag = localName(c.tag);
        if (SKIPPED.has(ctag)) continue;
        if (ctag === "clipPath" && frameClips.has(attr(c, "id"))) {
          notes.push({ line: c.line, text: `let go of the frame's clip <clipPath id="${attr(c, "id")}"> (Figma's Clip content): it clips nothing inside the artboard` });
          continue;
        }
        err(c.line, `<${c.tag}> in <defs>: ${REFUSED_ELEMENTS[ctag] ?? "definitions the app doesn't draw"}`);
      }
      return;
    }
    if (REFUSED_ELEMENTS[tag]) {
      err(el.line, `<${el.tag}>: ${REFUSED_ELEMENTS[tag]}`);
      return;
    }
    if (!DRAWABLE.has(tag)) {
      err(el.line, `<${el.tag}>: an element the importer doesn't know`);
      return;
    }
    if (el.children.some((c) => !SKIPPED.has(localName(c.tag)))) err(el.line, `${describe(el)} has elements inside it`);
    if (tag === "rect" && covers(el) && classifyPaint(paint.fill.v).none !== true) {
      // the frame's own fill, exported as a rect over the whole board
      err(el.line, `${describe(el)} is a background over the whole artboard (the frame's fill): remove it; the app draws the tile`);
      drawables.push({ el, tag, paint, refused: true });
      return;
    }
    drawables.push({ el, tag, paint });
  };
  walk(root, DEFAULT, true);

  // each drawable element: its path data and its paint
  const marks = [];
  const inkWarned = new Set();
  let refused = 0; // drawables refused outright: still marks for the count, not drawn or measured
  for (const { el, tag, paint, refused: background } of drawables) {
    if (background) continue; // refused above, and not a mark
    const where = describe(el);
    const fromWhere = (p) => (p.from && p.from !== el ? ` (inherited from <${p.from.tag}> on line ${p.from.line})` : !p.from ? " (SVG's default)" : "");
    let d;
    try {
      d = elementData(tag, el);
    } catch (e) {
      err(el.line, `${where}: ${e.message}`);
      refused++;
      continue;
    }
    if (d === null) {
      warn(el.line, `${where} has no size and draws nothing; left out`);
      continue;
    }
    let segments;
    try {
      segments = parsePath(d);
    } catch (e) {
      err(el.line, `${where}: path data the app can't read (${e.message})`);
      refused++;
      continue;
    }
    const readPaint = (prop) => {
      const p = paint[prop];
      const c = classifyPaint(p.v);
      if (c.error) {
        err(el.line, `${where}: ${prop}: ${c.error}${fromWhere(p)}`);
        return null;
      }
      if (c.warn && !inkWarned.has(p.v)) {
        inkWarned.add(p.v);
        warn(el.line, `${where}: ${c.warn}`);
      }
      return c.ink ? "ink" : "none";
    };
    const fillPaint = readPaint("fill");
    const strokePaint = readPaint("stroke");
    if (fillPaint === null || strokePaint === null) {
      refused++;
      continue;
    }
    // a line has no inside: SVG fills nothing however it is painted
    const filled = fillPaint === "ink" && tag !== "line";
    const stroked = strokePaint === "ink";
    if (filled && stroked) {
      const why = paint.fill.from === null ? `filled (SVG fills a shape black unless it says fill="none"; add fill="none" to a stroke)` : `filled${fromWhere(paint.fill)}`;
      err(el.line, `${where} is ${why} and stroked: a mark is a stroke or a fill, never both`);
      refused++;
      continue;
    }
    if (!filled && !stroked) {
      warn(el.line, `${where} has neither fill nor stroke and draws nothing; left out`);
      continue;
    }
    if (stroked) {
      const w = paint["stroke-width"];
      const wm = NUM.exec(w.v);
      if (!wm) err(el.line, `${where}: stroke-width "${w.v}" is not a number; every stroke is 2`);
      else if (Math.abs(Number(wm[1]) - STROKE) > EPS)
        err(el.line, `${where}: stroke-width ${w.v}${w.from === null ? " (SVG's default)" : fromWhere(w)}; every stroke is 2 (the app scales it to 2.4 / 2.0 / 1.75)`);
      const cap = paint["stroke-linecap"];
      if (cap.v !== "round") err(el.line, `${where}: stroke-linecap ${cap.v}${cap.from === null ? " (SVG's default)" : fromWhere(cap)}; caps are round (Figma: Cap Round)`);
      const join = paint["stroke-linejoin"];
      if (join.v !== "round") err(el.line, `${where}: stroke-linejoin ${join.v}${join.from === null ? " (SVG's default)" : fromWhere(join)}; joins are round (Figma: Join Round)`);
    }
    const shape = filled ? { t: "p", d, f: INK } : { t: "p", d, f: "none", s: INK, sw: String(STROKE), lc: "round", lj: "round" };
    try {
      toArtPath(shape);
    } catch (e) {
      err(el.line, `${where}: the Swift reader would refuse it (${e.message})`);
      refused++;
      continue;
    }
    const subs = flatten(segments).filter((s) => s.pts.length > 0);
    const allPts = subs.flatMap((s) => s.pts);
    const m = {
      index: marks.length,
      el,
      line: el.line,
      where,
      fill: filled,
      shape,
      subs,
      segs: segmentsOf(subs, filled),
      box: boxOf(allPts),
      label: "",
    };
    marks.push(m);
  }
  result.shapes = marks.map((m) => m.shape);

  // one element, one mark: separate pieces in one element, and holes in a fill
  for (const m of marks) {
    if (m.subs.length < 2) continue;
    const pieces = m.subs.map((s) => ({ ...m, subs: [s], segs: segmentsOf([s], m.fill), box: boxOf(s.pts) }));
    if (m.fill) {
      for (let a = 0; a < pieces.length; a++)
        for (let b = 0; b < pieces.length; b++) {
          if (a === b) continue;
          const [ba, bb] = [pieces[a].box, pieces[b].box];
          if (bb[0] >= ba[0] && bb[1] >= ba[1] && bb[2] <= ba[2] && bb[3] <= ba[3] && pieces[b].subs[0].pts.every(([x, y]) => inside(x, y, pieces[a].subs))) {
            err(m.line, `${m.where}: subpath ${b + 1} sits inside subpath ${a + 1}, a hole or a knock-out (draw a ring as a stroke; one colour, no holes)`);
          }
        }
    }
    // pieces whose ink doesn't touch at the master weight are separate marks
    const parent = pieces.map((_, k) => k);
    const findRoot = (k) => (parent[k] === k ? k : (parent[k] = findRoot(parent[k])));
    for (let a = 0; a < pieces.length; a++)
      for (let b = a + 1; b < pieces.length; b++) {
        const r = markDistance(pieces[a], pieces[b]);
        if (r.inside || r.d - halfInk(m, STROKE) * 2 <= EPS) parent[findRoot(a)] = findRoot(b);
      }
    const groups = new Set(pieces.map((_, k) => findRoot(k))).size;
    if (groups > 1) err(m.line, `${m.where} holds ${groups} separate pieces: one element per mark (don't flatten or union marks into one shape)`);
  }

  // the mark count: every drawable element, the refused ones too
  const count = marks.length + refused;
  if (kind === "group" && count !== MARKS.group)
    err(null, `${count} mark${count === 1 ? "" : "s"}; a group icon has exactly 3 (two eyes and a mouth, no accent)`);
  if (kind === "face" && count > MARKS.face)
    err(null, `${count} marks; a face has at most 5 (two eyes, a mouth and an accent of one or two marks; one element is one mark)`);
  if (kind === "face" && count < 3 && count > 0) warn(null, `only ${count} mark${count === 1 ? "" : "s"}; a face is two eyes and a mouth at least`);
  if (!count) err(null, "nothing to draw");
  if (!marks.length) return result;

  // the live area, at the check weight
  for (const m of marks) {
    const b = grow(m.box, halfInk(m, CHECK_WEIGHT));
    const past = [
      [LIVE[0] - b[0], `x ${num(b[0])}`],
      [LIVE[0] - b[1], `y ${num(b[1])}`],
      [b[2] - LIVE[1], `x ${num(b[2])}`],
      [b[3] - LIVE[1], `y ${num(b[3])}`],
    ].filter(([over]) => over > 0.005);
    for (const [over, at] of past)
      err(m.line, `${m.where} reaches ${at}${m.fill ? "" : " at the 2.4 check weight"}: ${num(over)} past the live area (2–22)`);
  }

  // pairs: joined marks, then the clear space at the check weight
  const need = CLEAR[kind];
  const parent = marks.map((_, k) => k);
  const findRoot = (k) => (parent[k] === k ? k : (parent[k] = findRoot(parent[k])));
  const pairs = [];
  for (let a = 0; a < marks.length; a++)
    for (let b = a + 1; b < marks.length; b++) {
      const A = marks[a];
      const B = marks[b];
      const r = markDistance(A, B);
      const overlap = r.inside ? Infinity : halfInk(A, STROKE) + halfInk(B, STROKE) - r.d;
      if (overlap >= JOIN_OVERLAP - EPS) {
        parent[findRoot(a)] = findRoot(b);
        notes.push({ line: B.line, text: `${B.where} joins ${A.where} (line ${A.line}) as one mark` });
        continue;
      }
      // where the gap is: the middle of the space between the two inks at the check weight
      const [hA, hB] = [halfInk(A, CHECK_WEIGHT), halfInk(B, CHECK_WEIGHT)];
      let at = r.p;
      if (r.p && r.q && r.d > 0) {
        const [ux, uy] = [(r.q[0] - r.p[0]) / r.d, (r.q[1] - r.p[1]) / r.d];
        at = [(r.p[0] + ux * hA + r.q[0] - ux * hB) / 2, (r.p[1] + uy * hA + r.q[1] - uy * hB) / 2];
      }
      pairs.push({ A, B, gap: r.d - hA - hB, at });
    }

  // eyes and mouth, found by position on the joined marks
  const clusters = [...new Set(marks.map((_, k) => findRoot(k)))].map((rootIndex) => {
    const members = marks.filter((_, k) => findRoot(k) === rootIndex);
    const box = unionBox(members.map((m) => m.box));
    const ink = unionBox(members.map((m) => grow(m.box, halfInk(m, STROKE))));
    return { members, box, ink, cx: (box[0] + box[2]) / 2, cy: (box[1] + box[3]) / 2 };
  });
  const pick = (list, tx, ty) => list.reduce((best, c) => (!best || Math.hypot(c.cx - tx, c.cy - ty) < Math.hypot(best.cx - tx, best.cy - ty) ? c : best), null);
  const eyeBand = clusters.filter((c) => c.cy >= 7 && c.cy <= 13.5);
  const left = pick(eyeBand.filter((c) => c.cx < 12), 8.25, 10.5);
  const right = pick(eyeBand.filter((c) => c.cx > 12), 15.75, 10.5);
  const mouth = pick(clusters.filter((c) => c !== left && c !== right && c.cy >= 13 && c.cy <= 20.5 && Math.abs(c.cx - 12) <= 3), 12, 15.75);
  const accents = clusters.filter((c) => c !== left && c !== right && c !== mouth);
  for (const c of accents) for (const m of c.members) m.label = "accent";
  if (left) for (const m of left.members) m.label = "left eye";
  if (right) for (const m of right.members) m.label = "right eye";
  if (mouth) for (const m of mouth.members) m.label = "mouth";
  const labelled = (m) => `${m.where}${m.label ? ` (${m.label})` : ""}`;
  const named = (m) => `line ${m.line} ${labelled(m)}`;

  // the clear space
  let closest = null;
  for (const pr of pairs) {
    if (!closest || pr.gap < closest.gap) closest = pr;
    if (pr.gap < need - EPS) {
      const shown = f2(pr.gap) === f2(need) ? pr.gap.toFixed(3) : num(pr.gap);
      const at = pr.at ? `, closest near (${num(pr.at[0])}, ${num(pr.at[1])})` : "";
      const how = pr.gap <= -(halfInk(pr.A, CHECK_WEIGHT) + halfInk(pr.B, CHECK_WEIGHT)) + EPS ? "touch" : pr.gap <= 0 ? "touch at the 2.4 check weight" : `are ${shown} apart at the 2.4 check weight`;
      const rule = kind === "group" ? "a group icon's marks need" : "marks need";
      err(null, `${named(pr.A)} and ${named(pr.B)} ${how}; ${rule} ${num(need)} (${num(need - Math.max(pr.gap, -CHECK_WEIGHT))} more)${at}`);
    }
  }

  // eye line, mouth line, cluster: warnings
  const topAccent = accents.some((c) => c.cy < 8);
  const drop = topAccent ? 0.75 : 0;
  if (refused) {
    // an element was refused: its absence would only make the position checks misleading
  } else if (!left || !right || !mouth) {
    warn(null, `couldn't tell two eyes and a mouth apart by position (eyes either side of x 12 near y 10.5, a mouth near y 15.5); eye line, mouth line and cluster not checked`);
  } else {
    for (const [eye, side] of [[left, "left"], [right, "right"]]) {
      if (eye.cy < 10.5 - 0.75 - EPS || eye.cy > 10.5 + 0.75 + drop + EPS)
        warn(eye.members[0].line, `the ${side} eye's centre is at y ${num(eye.cy)}; the eye line is y 10.5 (± 0.75${topAccent ? ", down to 12 under a top accent" : ""})`);
    }
    const axis = (left.cx + right.cx) / 2;
    if (Math.abs(axis - 12) > 0.5 + EPS) warn(left.members[0].line, `the eyes are centred on x ${num(axis)}; faces are symmetric about x 12 (± 0.5)`);
    if (mouth.cy < 14.75 - EPS || mouth.cy > 17.25 + drop + EPS)
      warn(mouth.members[0].line, `the mouth's centre is at y ${num(mouth.cy)}; the mouth line is y 15.5 (down to 16.5${topAccent ? ", 0.75 lower under a top accent" : ""})`);
    if (Math.abs(mouth.cx - 12) > 1 + EPS) warn(mouth.members[0].line, `the mouth's centre is at x ${num(mouth.cx)}; it sits on the centre axis x 12`);
    const cl = unionBox([left.ink, right.ink, mouth.ink]);
    const outside = [
      cl[0] < 5 - EPS && `x ${num(cl[0])}`,
      cl[1] < 7.5 - EPS && `y ${num(cl[1])}`,
      cl[2] > 19 + EPS && `x ${num(cl[2])}`,
      cl[3] > 20 + EPS && `y ${num(cl[3])}`,
    ].filter(Boolean);
    if (outside.length) warn(null, `the eyes and mouth reach ${outside.join(" and ")}; they stay in the cluster box x 5–19, y 7.5–20 (accents may use the ring outside it)`);
    const [w, h, cx, cy] = [cl[2] - cl[0], cl[3] - cl[1], (cl[0] + cl[2]) / 2, (cl[1] + cl[3]) / 2];
    if (w < 10 - EPS || w > 14 + EPS) warn(null, `the eyes and mouth are ${num(w)} wide; the family's faces are 10–14 wide`);
    if (h < 7 - EPS || h > 12 + EPS) warn(null, `the eyes and mouth are ${num(h)} tall; the family's faces are 7–12 tall`);
    if (Math.abs(cx - 12) > 0.5 + EPS || Math.abs(cy - 13.5 - drop) > 1 + EPS) warn(null, `the eyes and mouth are centred at (${num(cx)}, ${num(cy)}); the family centres on (12, 13.5) (± 0.5 across, ± 1 down${topAccent ? ", 0.75 lower under a top accent" : ""})`);
  }

  // the smallest marks
  for (const m of marks) {
    if (m.fill) {
      const side = Math.min(m.box[2] - m.box[0], m.box[3] - m.box[1]);
      if (side < 2.4 - 0.005) warn(m.line, `${labelled(m)} is ${num(side)} across at its narrowest; fills are at least 2.4`);
    } else {
      const len = polyLength(m.subs);
      if (len < 0.1) warn(m.line, `${labelled(m)} is a zero-length stroke used as a dot; draw a filled circle Ø3 instead`);
      else if (len < 3 - 0.005) warn(m.line, `${labelled(m)} is a stroke ${num(len)} long; strokes are at least 3 (a dot is a filled circle)`);
    }
  }

  const ink = unionBox(marks.map((m) => grow(m.box, halfInk(m, CHECK_WEIGHT))));
  result.stats = { marks: marks.length, closest: closest ? closest.gap : null, need, ink };
  return result;
}

/* ── the whole set ───────────────────────────────────────────────────────── */

const distance = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};

/** The SVG files a delivery folder holds: name → text (no "_" or "." names, no folders). */
export function readFolder(dir = DIR) {
  const files = new Map();
  for (const name of readdirSync(dir).sort()) {
    if (!name.toLowerCase().endsWith(".svg") || name.startsWith("_") || name.startsWith(".")) continue;
    const url = new URL(name, dir);
    if (!statSync(url).isFile()) continue;
    files.set(name, readFileSync(url, "utf8"));
  }
  return files;
}

/**
 * Checks every file against the expected set. Returns { results: [{ entry, file, status: "ok" |
 * "rejected" | "missing", check }], unexpected: [{ name, suggestion }], ts } — ts the
 * mood-line-art.ts that the accepted icons make.
 */
export function importSet(files, moods) {
  const expectedNames = new Map(moods.expected.map((e) => [`${e.key}.svg`, e]));
  const results = moods.expected.map((entry) => {
    const file = `${entry.key}.svg`;
    if (!files.has(file)) return { entry, file, status: "missing", check: null };
    const check = checkSvg(files.get(file), { kind: entry.kind });
    return { entry, file, status: check.errors.length ? "rejected" : "ok", check };
  });
  const unexpected = [...files.keys()]
    .filter((name) => !expectedNames.has(name))
    .map((name) => {
      const low = name.toLowerCase();
      let suggestion = null;
      let best = Infinity;
      for (const e of expectedNames.keys()) {
        const d = distance(low, e);
        if (d < best) {
          best = d;
          suggestion = e;
        }
      }
      return { name, suggestion: best <= 3 ? suggestion : null };
    });
  // two icons drawn exactly alike read the same on screen (cheerful = delighted in the old set)
  const ok = results.filter((r) => r.status === "ok");
  for (let a = 0; a < ok.length; a++)
    for (let b = a + 1; b < ok.length; b++) {
      if (JSON.stringify(ok[a].check.shapes) === JSON.stringify(ok[b].check.shapes)) {
        ok[a].check.warnings.push({ line: null, text: `draws exactly what ${ok[b].file} draws` });
        ok[b].check.warnings.push({ line: null, text: `draws exactly what ${ok[a].file} draws` });
      }
    }
  return { results, unexpected, ts: buildTs(results, moods) };
}

/** a list of names wrapped into comment lines of at most `width` characters */
function wrapList(lead, names, width = 100, indent = "   ") {
  const lines = [];
  let line = `${indent}${lead}`;
  names.forEach((n, k) => {
    const piece = `${n}${k === names.length - 1 ? "." : ","}`;
    if ((line + " " + piece).length > width) {
      lines.push(line);
      line = `${indent}  ${piece}`;
    } else line += ` ${piece}`;
  });
  lines.push(line);
  return lines;
}

/** src/data/mood-line-art.ts for a set of results. */
export function buildTs(results, moods) {
  const ok = results.filter((r) => r.status === "ok");
  const missing = results.filter((r) => r.status === "missing").map((r) => r.entry.key);
  const rejected = results.filter((r) => r.status === "rejected").map((r) => r.entry.key);
  const total = moods.expected.length;
  const L = [];
  L.push("/* AUTO-GENERATED from design/moods-line by scripts/import-mood-art.mjs — do not edit.");
  L.push("   grid 24, template ink #000000. After the drawings change, run: node scripts/import-mood-art.mjs");
  L.push("   (then node scripts/gen-mood-art-swift.mjs for the Swift copy).");
  L.push("");
  L.push("   The mood icons as one-colour line faces (owner, 2026-10-16): each icon's marks on the 24 grid,");
  L.push("   every one a path in the template ink. MoodFace (screens/notes/notes-glyphs) and KMoodArt (Swift)");
  L.push("   paint them in the group's face ink and scale each stroke (2) by the size's step (2.4 / 2.0 /");
  L.push("   1.75); the tile behind them is the app's. Keys are moods.ts moodArtKey's: mood-<face> and");
  L.push("   mood-group-<group>. An icon not here is drawn as its group's icon, then as the 10a line face;");
  L.push("   the thirty old faces stay in data/mood-art.ts (60 grid) until they are redrawn.");
  L.push("");
  if (ok.length) L.push(...wrapList(`Imported: ${ok.length} of ${total} —`, ok.map((r) => r.entry.key)));
  else L.push(`   Imported: none of ${total}.`);
  if (missing.length) L.push(...wrapList(`Not delivered yet: ${missing.length} —`, missing));
  else L.push("   Not delivered yet: none.");
  if (rejected.length) L.push(...wrapList(`Rejected by the checks (run the importer for its report): ${rejected.length} —`, rejected));
  else L.push("   Rejected by the checks: none.");
  L[L.length - 1] += " */";
  L.push('export interface LineShape { t: "p"; d: string; f: string; s?: string; sw?: string; lc?: string; lj?: string }');
  L.push(`export const MOOD_LINE_GRID = ${GRID};`);
  L.push(`export const MOOD_LINE_INK = "${INK}";`);
  const table = {};
  for (const r of ok) table[r.entry.key] = r.check.shapes.map((s) => (s.s ? { t: s.t, d: s.d, f: s.f, s: s.s, sw: s.sw, lc: s.lc, lj: s.lj } : { t: s.t, d: s.d, f: s.f }));
  L.push(`export const MOOD_LINE_ART: Readonly<Record<string, readonly LineShape[]>> = ${JSON.stringify(table)};`);
  return L.join("\n") + "\n";
}

/* ── the report ──────────────────────────────────────────────────────────── */

/** The human report: one block per delivered file, then what is missing or misnamed. */
export function formatReport({ results, unexpected }) {
  const out = [];
  const ok = results.filter((r) => r.status === "ok").length;
  const rejected = results.filter((r) => r.status === "rejected").length;
  const missing = results.filter((r) => r.status === "missing");
  out.push(`design/moods-line: ${ok} of ${results.length} icons imported, ${rejected} rejected, ${missing.length} not delivered yet`);
  out.push("");
  const pad = Math.max(...results.map((r) => r.file.length));
  const msg = (kind, m) => `      ${kind}  ${m.line ? `line ${m.line}: ` : ""}${m.text}`;
  for (const r of results) {
    if (r.status === "missing") continue;
    const c = r.check;
    if (r.status === "ok") {
      const s = c.stats;
      const space = s.closest === null ? "" : `, closest ${num(s.closest)} apart at 2.4 (needs ${num(s.need)})`;
      out.push(`  ok        ${r.file.padEnd(pad)}  ${s.marks} marks${space}, ink x ${num(s.ink[0])}–${num(s.ink[2])} y ${num(s.ink[1])}–${num(s.ink[3])}`);
    } else {
      out.push(`  REJECTED  ${r.file.padEnd(pad)}  ${c.errors.length} error${c.errors.length === 1 ? "" : "s"}; left out, the app keeps its fallback`);
    }
    for (const e of c.errors) out.push(msg("error", e));
    for (const w of c.warnings) out.push(msg("warn ", w));
    for (const n of c.notes) out.push(msg("note ", n));
  }
  if (missing.length) {
    out.push("");
    out.push(`  not delivered yet (${missing.length}; the app draws the group's icon, or the old art, meanwhile):`);
    let line = "   ";
    for (const r of missing) {
      if (line.length + r.file.length + 2 > 100) {
        out.push(line);
        line = "   ";
      }
      line += ` ${r.file},`;
    }
    out.push(line.replace(/,$/, ""));
  }
  for (const u of unexpected) {
    out.push("");
    out.push(`  not imported: ${u.name}: no mood is named that${u.suggestion ? ` (did you mean ${u.suggestion}?)` : ""}; names are mood-<id>.svg as in src/data/moods.ts`);
  }
  return out.join("\n");
}

/* ── the command line ────────────────────────────────────────────────────── */

function main() {
  const CHECK = process.argv.includes("--check");
  let set;
  try {
    const moods = readMoods(readFileSync(MOODS, "utf8"));
    set = importSet(readFolder(DIR), moods);
  } catch (e) {
    console.error(`import-mood-art: ${e.message}`);
    process.exit(1);
  }
  const report = formatReport(set);
  const bad = set.results.some((r) => r.status === "rejected") || set.unexpected.length > 0;
  if (CHECK) {
    let current = "";
    try {
      current = readFileSync(OUT, "utf8");
    } catch {
      console.error(`import-mood-art: ${OUT.pathname} does not exist; run node scripts/import-mood-art.mjs`);
      process.exit(1);
    }
    if (current !== set.ts) {
      console.error(report);
      console.error("\nimport-mood-art: mood-line-art.ts is out of date with design/moods-line; run node scripts/import-mood-art.mjs");
      process.exit(1);
    }
    if (bad) console.warn(report + "\n");
    console.log(`mood-line-art.ts is up to date (${set.results.filter((r) => r.status === "ok").length} of ${set.results.length} icons)`);
    return;
  }
  console.log(report);
  writeFileSync(OUT, set.ts);
  console.log(`\nwrote ${OUT.pathname}`);
  if (bad) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
