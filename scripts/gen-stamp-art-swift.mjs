// node scripts/gen-stamp-art-swift.mjs            write the Swift copy of the stamp art
// node scripts/gen-stamp-art-swift.mjs --check    exit 1 if the Swift copy is out of date
//
// STAMPS v3 (owner, 2026-10-19; the contract is .claude/stamp-design/v3/INTEGRATION.md). The file
// now also carries the v3 set from src/data/stamp-art-v3.ts (scripts/import-stamp-art-v3.mjs):
// KStampArtData.v3, one KStampV3Entry per stamp in stamps.ts order with its colours as 0xRRGGBBAA
// (hex = stamps.ts color, tint = mix(hex, white, 0.88) half up, nameLight, nameDark) and its four
// own layers (rims, body, marks, face) as KStampEl lists whose paint is a KStampRole; the frame
// layer, the same for all 36, is KStampArtData.v3Frame. The v3 types are declared in the generated
// file itself, so it compiles on its own whatever KStampArt.swift draws. A v3 stamp the generator
// can't read exactly is written with empty layers (KStamp then draws its frame alone) and named.
// The v2 table below (KStampArtData.stamps) is written only while src/data/stamp-art-v2.ts exists:
// it keeps the v2 KStamp compiling until the Swift renderer has moved to v3; delete stamp-art-v2.ts
// and rerun, and it is gone.
//
// Writes modules/kindredly-ui/ios/Portable/Kit/KStampArtData.swift from the files the React
// Native app draws its stamps from:
//   - src/data/stamp-art-v2.ts: stamps v2, the set the owner approved on 2026-10-18 (written by
//     scripts/import-stamp-art.mjs from design/stamps-v2): each stamp's white marks on the
//     100 × 120 box (5:6) in three layers, `art`, `soft` and `xs`, each mark a fill or a stroke,
//     some soft marks flagged dropAtS (components/Stamp draws them through lib/stamp-frame);
//   - src/data/stamps.ts: which stamp ids exist, in which order, each stamp's category (which
//     series ground it gets from M up) and its own colour, the field (the backend's vocabulary:
//     letters.stamp stores these ids);
//   - src/lib/stamp-frame.ts: only STAMP_FALLBACK_HEX, the colour an id nobody knows is drawn in.
// KStamp (Kit/KStampArt.swift) draws the generated table with SwiftUI over the frame
// Kit/KStampFrame.swift ports from lib/stamp-frame, so a stamp is drawn from the same path data
// on both sides and changes in one place: the SVG files, then the importer, then this script.
// The generated file imports SwiftUI only, like every Portable file, so the pure-Swift app
// planned for 1.1.0 can take it as it is.
//
// Until stamps v2 this script read the 64-grid set (src/data/stamp-art.ts, each shape with its
// own baked paint, frame and all, written out as KArtPath). The v2 marks carry no colour at all:
// the renderer paints art and xs white, soft in softHex(hex), and strokes them at the tier's
// width (lib/stamp-frame strokeU), so what goes over is just the path data, fill or stroke, and
// the dropAtS flag (KStampMark). stamp-art.ts is no longer read here; the web and the guide reels
// that still draw it read it themselves.
//
// What it copies. The path data goes over verbatim and is read on the device by the module's
// SVG reader (KSVGPath in Kit/KLineGlyph.swift: M L H V C S Q T A Z, absolute and relative,
// arcs as cubic Béziers). This script reads every path with the same grammar first (parsePath in
// scripts/art-path.mjs, re-exported here for the test), so nothing reaches Swift that the reader
// would cut short.
//
// What it refuses. A mark it can't read exactly (path data the grammar rejects or with
// characters SVG doesn't allow, a kind that isn't fill or stroke, a key it doesn't know) is never
// drawn half right: the whole stamp is written with no marks (art: [], soft: [], xs: []), which
// KStamp draws as the template — the paper, the window in the stamp's own hex and, from M, its
// category's ground — exactly as components/Stamp draws a stamp the importer rejected (spec
// §2.11's fallback chain), and the script names it and says why. A stamp with no drawing at all
// in stamp-art-v2.ts is the template too. Today every one of the 36 is read.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { PATH_CHARS, paint, parsePath, swiftHex as hex, swiftNumber as fmt } from "./art-path.mjs";

export const ART = new URL("../src/data/stamp-art-v2.ts", import.meta.url);
export const ART_V3 = new URL("../src/data/stamp-art-v3.ts", import.meta.url);
export const LIST = new URL("../src/data/stamps.ts", import.meta.url);
// The colour an id with no stamp is drawn in: lib/stamp-frame's STAMP_FALLBACK_HEX, the one
// place every renderer reads it from (spec §2.11).
export const FALLBACK = new URL("../src/lib/stamp-frame.ts", import.meta.url);
export const OUT = new URL("../modules/kindredly-ui/ios/Portable/Kit/KStampArtData.swift", import.meta.url);

/** The box stamp-art-v2.ts draws on (components/Stamp: viewBox 0 0 100 120). */
export const BOX = Object.freeze({ width: 100, height: 120 });
/** The three layers of a v2 stamp, in the order the Swift entry lists them. */
export const LAYERS = Object.freeze(["art", "soft", "xs"]);
/** A v3 stamp's own layers, in draw order (the frame, shared, is KStampArtData.v3Frame). */
export const LAYERS_V3 = Object.freeze(["rims", "body", "marks", "face"]);
/** v3's ink role and tint mix (lib/stamp-frame STAMP_V3_INK, STAMP_V3_TINT_MIX). */
export const V3_INK = "#1E1B35";
export const V3_TINT_MIX = 0.88;

/* ── reading the sources ─────────────────────────────────────────────────── */

/**
 * STAMP_ART_V2 from stamp-art-v2.ts: a generated file whose table is one stamp per line,
 * `  "id": {…json…},`, between `export const STAMP_ART_V2: … = {` and `};`.
 */
export function readArt(text) {
  const head = /^export const STAMP_ART_V2\s*:[^=]*=\s*\{\s*$/m.exec(text);
  if (!head) throw new Error("stamp-art-v2.ts: no `export const STAMP_ART_V2: … = {` line");
  const start = head.index + head[0].length;
  const end = text.indexOf("\n};", start);
  if (end < 0) throw new Error("stamp-art-v2.ts: STAMP_ART_V2 is not closed by a `};` line");
  const body = text.slice(start, end).trim().replace(/,$/, "");
  try {
    return JSON.parse(`{${body}}`);
  } catch (e) {
    throw new Error(`stamp-art-v2.ts: STAMP_ART_V2 is not plain JSON, one stamp per line (${e.message})`);
  }
}

/** The stamps and their categories from stamps.ts, in its order. */
export function readStamps(text) {
  const block = (name) => {
    const start = text.indexOf(`export const ${name}`);
    const end = start < 0 ? -1 : text.indexOf("\n];", start);
    if (start < 0 || end < 0) throw new Error(`stamps.ts: no ${name} array`);
    return text.slice(start, end);
  };
  const cats = [...block("STAMP_CATEGORIES").matchAll(/\{ id: "([^"]+)", emoji: "[^"]*", color: "(#[0-9A-Fa-f]{6})", name: \{ en: "([^"]+)"/g)].map(
    ([, id, color, name]) => ({ id, color, name }),
  );
  const stamps = [...block("STAMPS").matchAll(/\{ id: "([^"]+)", cat: "([^"]+)", emoji: "[^"]*", color: "(#[0-9A-Fa-f]{6})"(?:, nameLight: "(#[0-9A-Fa-f]{6})", nameDark: "(#[0-9A-Fa-f]{6})")?/g)].map(
    ([, id, cat, color, nameLight, nameDark]) => ({ id, cat, color, nameLight: nameLight ?? null, nameDark: nameDark ?? null }),
  );
  if (!stamps.length) throw new Error("stamps.ts: no stamps read from STAMPS");
  if (new Set(stamps.map((s) => s.id)).size !== stamps.length) throw new Error("stamps.ts: a stamp id is listed twice");
  return { cats, stamps };
}

/** The colour a stamp id this build doesn't know is drawn in (lib/stamp-frame STAMP_FALLBACK_HEX). */
export function readUnknownTint(text) {
  const m = /export const STAMP_FALLBACK_HEX = "(#[0-9A-Fa-f]{6})"/.exec(text);
  if (!m) throw new Error("stamp-frame.ts: no fallback colour (`export const STAMP_FALLBACK_HEX = \"#…\"`)");
  return m[1];
}

/**
 * stamp-art-v3.ts: { framePath, art: { id: { rims, body, marks, face } } } from the generated file,
 * whose ART table is one stamp per line, `  "id": {…json…},`, between `const ART… = {` and `};`.
 */
export function readArtV3(text) {
  const fm = /^export const STAMP_V3_FRAME_PATH = ("[^"]+");$/m.exec(text);
  if (!fm) throw new Error("stamp-art-v3.ts: no `export const STAMP_V3_FRAME_PATH = \"…\";` line");
  const head = /^const ART\s*:[^=]*=\s*\{\s*$/m.exec(text);
  if (!head) throw new Error("stamp-art-v3.ts: no `const ART: … = {` line");
  const start = head.index + head[0].length;
  const end = text.indexOf("\n};", start);
  if (end < 0) throw new Error("stamp-art-v3.ts: ART is not closed by a `};` line");
  const body = text.slice(start, end).trim().replace(/,$/, "");
  try {
    return { framePath: JSON.parse(fm[1]), art: JSON.parse(`{${body}}`) };
  } catch (e) {
    throw new Error(`stamp-art-v3.ts: ART is not plain JSON, one stamp per line (${e.message})`);
  }
}

export function readSources() {
  return {
    art: existsSync(ART) ? readArt(readFileSync(ART, "utf8")) : null,
    v3: readArtV3(readFileSync(ART_V3, "utf8")),
    ...readStamps(readFileSync(LIST, "utf8")),
    unknownTint: readUnknownTint(readFileSync(FALLBACK, "utf8")),
  };
}

/* ── the shared reader ───────────────────────────────────────────────────── */

// The path-data reader lives in scripts/art-path.mjs, shared with the mood icons' importer and
// Swift generator and with the stamps' importer. It is re-exported here so this script's test
// (and anything else that imported it from here) keeps working.
export { arcToCurves, dashes, paint, parsePath, shapeData, swiftPath, toArtPath } from "./art-path.mjs";

const MARK_KEYS = new Set(["d", "kind", "dropAtS"]);

/**
 * One v2 mark as the Swift table writes it: { d, kind, dropAtS }, its path data read to the end
 * by the device's grammar. Throws, saying why, for anything KStamp couldn't draw exactly.
 */
export function readMark(m) {
  if (!m || typeof m !== "object" || Array.isArray(m)) throw new Error("not a mark");
  for (const k of Object.keys(m)) if (!MARK_KEYS.has(k)) throw new Error(`a key the generator doesn't know ("${k}")`);
  if (m.kind !== "fill" && m.kind !== "stroke") throw new Error(`a kind that isn't fill or stroke ("${m.kind}")`);
  if (m.dropAtS !== undefined && m.dropAtS !== true) throw new Error(`dropAtS that isn't true ("${m.dropAtS}")`);
  if (typeof m.d !== "string" || !PATH_CHARS.test(m.d)) throw new Error(`path data with characters SVG doesn't allow ("${String(m.d).slice(0, 40)}")`);
  parsePath(m.d); // throws where KSVGPath would stop short
  return { d: m.d, kind: m.kind, dropAtS: m.dropAtS === true };
}

/** One KStampMark(…) initialiser (dropAtS left out when false). */
export function swiftMark(m) {
  return `KStampMark(${JSON.stringify(m.d)}, .${m.kind}${m.dropAtS ? ", dropAtS: true" : ""})`;
}

/* ── v3 ────────────────────────────────────────────────────────────────── */

const ROLES = new Set(["hex", "ink", "tint", "none"]);
const EL_KEYS = { path: ["d"], circle: ["cx", "cy", "r"], ellipse: ["cx", "cy", "rx", "ry"] };

/** mix(a, white, t) per channel, half up, as 0xRRGGBBAA (lib/stamp-frame stampTint) */
export function tintOf(hexStr, t = V3_TINT_MIX) {
  const v = paint(hexStr, "fill");
  const c = [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255].map((x) => Math.round(x + (255 - x) * t));
  return ((c[0] << 24) | (c[1] << 16) | (c[2] << 8) | 0xff) >>> 0;
}

/**
 * One v3 element as the Swift table writes it, read and checked: { el, d | cx cy r | cx cy rx ry,
 * fill, stroke, width }. Throws, saying why, for anything KStamp couldn't draw exactly.
 */
export function readElV3(e) {
  if (!e || typeof e !== "object" || Array.isArray(e)) throw new Error("not an element");
  const geo = EL_KEYS[e.el];
  if (!geo) throw new Error(`an element kind KStamp doesn't draw ("${e.el}")`);
  const known = new Set(["el", ...geo, "fill", "stroke", "width", "cap", "join"]);
  for (const k of Object.keys(e)) if (!known.has(k)) throw new Error(`a key the generator doesn't know ("${k}")`);
  if (!ROLES.has(e.fill) || !ROLES.has(e.stroke)) throw new Error(`paint that isn't a role (fill "${e.fill}", stroke "${e.stroke}")`);
  const out = { el: e.el, fill: e.fill, stroke: e.stroke, width: 0 };
  if (e.el === "path") {
    if (typeof e.d !== "string" || !PATH_CHARS.test(e.d)) throw new Error(`path data with characters SVG doesn't allow ("${String(e.d).slice(0, 40)}")`);
    parsePath(e.d); // throws where KSVGPath would stop short
    out.d = e.d;
  } else {
    for (const k of geo) {
      if (typeof e[k] !== "number" || !Number.isFinite(e[k])) throw new Error(`${k} is not a number`);
      out[k] = e[k];
    }
  }
  if (e.stroke === "none") {
    if (e.width !== undefined) throw new Error("a stroke width with no stroke");
  } else {
    if (typeof e.width !== "number" || !(e.width > 0)) throw new Error("a stroke without a positive width");
    if (e.cap !== "round" || e.join !== "round") throw new Error("a stroke that isn't round-capped and round-joined");
    out.width = e.width;
  }
  return out;
}

/** One KStampEl initialiser: .p(d, fill, stroke, width) / .c(cx, cy, r, …) / .e(cx, cy, rx, ry, …) */
export function swiftEl(e) {
  const paintArgs = `.${e.fill}, .${e.stroke}, ${fmt(e.width)}`;
  if (e.el === "path") return `.p(${JSON.stringify(e.d)}, ${paintArgs})`;
  if (e.el === "circle") return `.c(${fmt(e.cx)}, ${fmt(e.cy)}, ${fmt(e.r)}, ${paintArgs})`;
  return `.e(${fmt(e.cx)}, ${fmt(e.cy)}, ${fmt(e.rx)}, ${fmt(e.ry)}, ${paintArgs})`;
}

/** The v3 entries: [{ id, cat, color, nameLight, nameDark, layers | null, why }] and the element counts. */
export function readV3({ v3, stamps }) {
  const counts = Object.fromEntries(LAYERS_V3.map((l) => [l, 0]));
  const entries = stamps.map((st) => {
    const entry = Object.prototype.hasOwnProperty.call(v3.art, st.id) ? v3.art[st.id] : undefined;
    let layers = null;
    let why = null;
    if (!st.nameLight || !st.nameDark) why = "stamps.ts gives it no nameLight / nameDark";
    else if (!entry || typeof entry !== "object") why = "no drawing in stamp-art-v3.ts";
    else {
      try {
        for (const k of Object.keys(entry)) if (!LAYERS_V3.includes(k)) throw new Error(`a layer the generator doesn't know ("${k}")`);
        layers = {};
        for (const L of LAYERS_V3) {
          const list = entry[L] ?? [];
          if (!Array.isArray(list)) throw new Error(`${L} is not a list`);
          layers[L] = list.map((e, i) => {
            try {
              return readElV3(e);
            } catch (err) {
              throw new Error(`${L} element ${i + 1} of ${list.length}: ${err.message}`);
            }
          });
        }
        if (!layers.body.length) throw new Error("no body");
      } catch (err) {
        layers = null;
        why = err.message;
      }
    }
    if (layers) for (const L of LAYERS_V3) counts[L] += layers[L].length;
    return { ...st, layers, why };
  });
  return { entries, counts };
}

/** The v3 part of the Swift file: the types (at file scope) and the table (inside KStampArtData). */
function swiftV3({ v3, cats, unknownTint }, entries, counts) {
  const types = [];
  const t = (x = "") => types.push(x);
  t("/// STAMPS v3 (owner, 2026-10-19; contract: .claude/stamp-design/v3/INTEGRATION.md). A colour role, resolved per");
  t("/// stamp: .hex = entry.hex, .ink = KStampArtData.v3Ink (never the theme's ink), .tint = entry.tint, .none = not painted.");
  t("enum KStampRole: UInt8, Sendable {");
  t("  case none, hex, ink, tint");
  t("}");
  t();
  t("/// The five layers of a v3 stamp in draw order, and which a width keeps (lib/stamp-frame stampLayersFor):");
  t("/// under 15pt none (a 6pt dot of the hex), 15–24 frame rims body, 25–39 + face, from 40 all five.");
  t("enum KStampLayer: Int, CaseIterable, Sendable {");
  t("  case frame, rims, body, marks, face");
  t();
  t("  static func kept(width: CGFloat) -> [KStampLayer] {");
  t("    if !(width >= 15) { return [] }");
  t("    if width < 25 { return [.frame, .rims, .body] }");
  t("    if width < 40 { return [.frame, .rims, .body, .face] }");
  t("    return [.frame, .rims, .body, .marks, .face]");
  t("  }");
  t("}");
  t();
  t("/// One element of a v3 stamp on the 100 × 120 box: SVG path data (read by KSVGPath), a circle or an ellipse,");
  t("/// its fill and stroke roles and its stroke width in box units (0 with no stroke). Every stroke is round-capped");
  t("/// and round-joined.");
  t("struct KStampEl: Sendable {");
  t("  enum Shape: Sendable {");
  t("    case path(String)");
  t("    case circle(cx: CGFloat, cy: CGFloat, r: CGFloat)");
  t("    case ellipse(cx: CGFloat, cy: CGFloat, rx: CGFloat, ry: CGFloat)");
  t("  }");
  t("  let shape: Shape");
  t("  let fill: KStampRole");
  t("  let stroke: KStampRole");
  t("  let width: CGFloat");
  t();
  t("  static func p(_ d: String, _ fill: KStampRole, _ stroke: KStampRole, _ width: CGFloat) -> KStampEl {");
  t("    KStampEl(shape: .path(d), fill: fill, stroke: stroke, width: width)");
  t("  }");
  t("  static func c(_ cx: CGFloat, _ cy: CGFloat, _ r: CGFloat, _ fill: KStampRole, _ stroke: KStampRole, _ width: CGFloat) -> KStampEl {");
  t("    KStampEl(shape: .circle(cx: cx, cy: cy, r: r), fill: fill, stroke: stroke, width: width)");
  t("  }");
  t("  static func e(_ cx: CGFloat, _ cy: CGFloat, _ rx: CGFloat, _ ry: CGFloat, _ fill: KStampRole, _ stroke: KStampRole, _ width: CGFloat) -> KStampEl {");
  t("    KStampEl(shape: .ellipse(cx: cx, cy: cy, rx: rx, ry: ry), fill: fill, stroke: stroke, width: width)");
  t("  }");
  t("}");
  t();
  t("/// A v3 stamp: its colours (0xRRGGBBAA) and its own four layers; the frame layer is KStampArtData.v3Frame.");
  t("/// hex = stamps.ts color, tint = mix(hex, white, 0.88) half up, nameLight / nameDark = the tray name on the");
  t("/// light themes / on Midnight. Empty layers: the generator couldn't read the drawing; draw the frame alone.");
  t("struct KStampV3Entry: Sendable {");
  t("  let id: String");
  t("  let category: String");
  t("  let hex: UInt32");
  t("  let tint: UInt32");
  t("  let nameLight: UInt32");
  t("  let nameDark: UInt32");
  t("  let rims: [KStampEl]");
  t("  let body: [KStampEl]");
  t("  let marks: [KStampEl]");
  t("  let face: [KStampEl]");
  t();
  t("  init(");
  t("    _ id: String, category: String, hex: UInt32, tint: UInt32, nameLight: UInt32, nameDark: UInt32,");
  t("    rims: [KStampEl], body: [KStampEl], marks: [KStampEl], face: [KStampEl]");
  t("  ) {");
  t("    self.id = id");
  t("    self.category = category");
  t("    self.hex = hex");
  t("    self.tint = tint");
  t("    self.nameLight = nameLight");
  t("    self.nameDark = nameDark");
  t("    self.rims = rims");
  t("    self.body = body");
  t("    self.marks = marks");
  t("    self.face = face");
  t("  }");
  t();
  t("  /// a layer's elements (the frame from KStampArtData.v3Frame)");
  t("  func elements(_ layer: KStampLayer) -> [KStampEl] {");
  t("    switch layer {");
  t("    case .frame: return KStampArtData.v3Frame");
  t("    case .rims: return rims");
  t("    case .body: return body");
  t("    case .marks: return marks");
  t("    case .face: return face");
  t("    }");
  t("  }");
  t("}");

  const L = [];
  const o = (x = "") => L.push(x);
  const unread = entries.filter((e) => !e.layers);
  o(`  // ── STAMPS v3: ${entries.length - unread.length} of ${entries.length} from src/data/stamp-art-v3.ts; ${counts.rims} rim, ${counts.body} body, ${counts.marks} mark, ${counts.face} face elements ──`);
  if (unread.length) for (const u of unread) o(`  //   ${u.id} is drawn as its frame alone: ${u.why}`);
  o();
  o(`  /// v3's ink role (${V3_INK}): edges, eye rings, pupils, lids, lines on the paper; the #tag's words.`);
  o(`  static let v3Ink: UInt32 = ${hex(paint(V3_INK, "fill"))}`);
  o(`  /// tint = mix(hex, white, this), each channel rounded half up`);
  o(`  static let v3TintMix: CGFloat = ${V3_TINT_MIX}`);
  o(`  /// an id this table doesn't know: its frame alone in this colour (STAMP_FALLBACK_HEX) and its tint`);
  o(`  static let v3FallbackHex: UInt32 = ${hex(paint(unknownTint, "fill"))}`);
  o(`  static let v3FallbackTint: UInt32 = ${hex(tintOf(unknownTint))}`);
  o(`  /// the empty slot: the frame path, no fill, a 4u stroke dashed 8/10, round caps (a dashed outline, not beads);`);
  o(`  /// the theme's mute colour, the pale one where mute is under 3:1 on the page (KStampSlot.stroke(for:))`);
  o(`  static let v3SlotWidth: CGFloat = 4`);
  o(`  static let v3SlotDash: [CGFloat] = [8, 10]`);
  o(`  /// the slot on a page where mute is under 3:1 (Lavender), 0xRRGGBB: lib/stamp-frame STAMP_V3_SLOT.pale`);
  o(`  static let v3SlotPale: UInt32 = 0x7A7694`);
  o(`  /// the dot below 15pt is edged in ink this wide (lib/stamp-frame STAMP_DOT_EDGE_PT)`);
  o(`  static let v3DotEdge: CGFloat = 1`);
  o(`  /// the frame path, the same in all 36 (lib/stamp-frame STAMP_V3_FRAME_D)`);
  o(`  static let v3FramePath = ${JSON.stringify(v3.framePath)}`);
  o(`  /// the frame layer, the same in all 36: the tint rim (14u) under the keyline (tint paper, ink 6u)`);
  o(`  static let v3Frame: [KStampEl] = [.p(v3FramePath, .tint, .tint, 14), .p(v3FramePath, .tint, .ink, 6)]`);
  o(`  /// the six category colours (stamps.ts STAMP_CATEGORIES, rung 3 of each family)`);
  o(`  static let v3Categories: [String: UInt32] = [`);
  for (const c of cats) o(`    ${JSON.stringify(c.id)}: ${hex(paint(c.color, "fill"))},`);
  o(`  ]`);
  o();
  o(`  static let v3: [KStampV3Entry] = [`);
  let lastCat = null;
  for (const e of entries) {
    if (e.cat !== lastCat) {
      const cat = cats.find((c) => c.id === e.cat);
      o(`    // ── ${cat ? cat.name : e.cat} ──`);
      lastCat = e.cat;
    }
    const nl = e.nameLight ? hex(paint(e.nameLight, "fill")) : hex(paint(e.color, "fill"));
    const nd = e.nameDark ? hex(paint(e.nameDark, "fill")) : hex(paint(e.color, "fill"));
    const lead = `KStampV3Entry(${JSON.stringify(e.id)}, category: ${JSON.stringify(e.cat)}, hex: ${hex(paint(e.color, "fill"))}, tint: ${hex(tintOf(e.color))}, nameLight: ${nl}, nameDark: ${nd}`;
    if (!e.layers) {
      o(`    // ${e.id}: its frame alone, ${e.why}`);
      o(`    ${lead}, rims: [], body: [], marks: [], face: []),`);
      continue;
    }
    o(`    ${lead},`);
    LAYERS_V3.forEach((layer, i) => {
      const sep = i < LAYERS_V3.length - 1 ? "," : "";
      const list = e.layers[layer];
      if (!list.length) {
        o(`      ${layer}: []${sep}`);
        return;
      }
      o(`      ${layer}: [`);
      for (const el of list) o(`        ${swiftEl(el)},`);
      o(`      ]${sep}`);
    });
    o("    ),");
  }
  o("  ]");
  return { types, table: L };
}

/**
 * Reads every stamp and writes the Swift table. Returns the file and what happened:
 * { swift, read: [id], unread: [{ id, why }], ignored: [art key], marks: { art, soft, xs }, entries }.
 */
export function buildSwift({ art, v3, cats, stamps, unknownTint }) {
  const entries = [];
  const unread = [];
  const marks = { art: 0, soft: 0, xs: 0 };
  for (const st of art ? stamps : []) {
    const entry = Object.prototype.hasOwnProperty.call(art, st.id) ? art[st.id] : undefined;
    let layers = null;
    let why = null;
    if (!entry || typeof entry !== "object") {
      why = "no drawing in stamp-art-v2.ts";
    } else if (!Array.isArray(entry.art) || !entry.art.length) {
      why = "no art marks (not delivered, or rejected by the importer)";
    } else {
      try {
        for (const k of Object.keys(entry)) if (!LAYERS.includes(k)) throw new Error(`a layer the generator doesn't know ("${k}")`);
        layers = {};
        for (const layer of LAYERS) {
          const list = entry[layer] ?? [];
          if (!Array.isArray(list)) throw new Error(`${layer} is not a list`);
          layers[layer] = list.map((m, i) => {
            try {
              return readMark(m);
            } catch (e) {
              throw new Error(`${layer} mark ${i + 1} of ${list.length}: ${e.message}`);
            }
          });
        }
      } catch (e) {
        layers = null;
        why = e.message;
      }
    }
    if (layers) for (const layer of LAYERS) marks[layer] += layers[layer].length;
    else unread.push({ id: st.id, why });
    entries.push({ ...st, layers, why });
  }
  const known = new Set(stamps.map((s) => s.id));
  const ignored = art ? Object.keys(art).filter((k) => !known.has(k)) : [];
  const V3 = readV3({ v3, stamps });
  const ignoredV3 = Object.keys(v3.art).filter((k) => !known.has(k));
  const sv3 = swiftV3({ v3, cats, unknownTint }, V3.entries, V3.counts);

  const L = [];
  const out = (s = "") => L.push(s);
  out(`// GENERATED by scripts/gen-stamp-art-swift.mjs from src/data/stamp-art-v3.ts${art ? ", src/data/stamp-art-v2.ts" : ""} and src/data/stamps.ts. DO NOT EDIT.`);
  out("// When the drawings or the stamp list change, run: node scripts/gen-stamp-art-swift.mjs");
  out("//");
  out("// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.");
  out();
  out("import SwiftUI");
  out();
  for (const line of sv3.types) out(line);
  out();
  out(`/// The ${stamps.length} stamps v3 (KStampArtData.v3, below) and, while src/data/stamp-art-v2.ts exists, the v2 set`);
  out(`/// (KStampArtData.stamps) the v2 KStamp draws until it moves to v3.`);
  out("///");
  out(`/// The ${stamps.length} stamps v2 as src/data/stamp-art-v2.ts holds them (components/Stamp draws them in React`);
  out(`/// Native): each stamp's marks, path data verbatim on the ${BOX.width} × ${BOX.height} box, in three layers (art, soft, xs),`);
  out("/// with its category and its own colour, in src/data/stamps.ts order. KStamp draws it over the frame");
  out("/// (Kit/KStampFrame.swift): art and xs in white, soft in softHex, strokes at the tier's width.");
  out("///");
  out(`/// Read by the generator: ${stamps.length - unread.length} of ${stamps.length} stamps; ${marks.art} art, ${marks.soft} soft and ${marks.xs} xs marks.`);
  if (unread.length) {
    out("/// Drawn as the template instead (no marks), because the generator could not read their drawing:");
    for (const u of unread) out(`///   - ${u.id}: ${u.why}`);
  } else {
    out("/// Drawn as the template instead: none.");
  }
  out("enum KStampArtData {");
  out(`  /// The box the marks are drawn on: viewBox 0 0 ${BOX.width} ${BOX.height}.`);
  out(`  static let box = CGSize(width: ${BOX.width}, height: ${BOX.height})`);
  out();
  out(`  /// The colour an id this build doesn't know is drawn in (STAMP_FALLBACK_HEX, ${unknownTint.toUpperCase()}).`);
  out(`  static let unknownTint: UInt32 = ${hex(paint(unknownTint, "fill"))}`);
  out();
  for (const line of sv3.table) out(line);
  if (!art) {
    out("}");
    return { swift: L.join("\n") + "\n", read: [], unread, ignored, marks, entries, v3: V3, ignoredV3 };
  }
  out();
  out("  // ── STAMPS v2 (deprecated: written while src/data/stamp-art-v2.ts exists) ──");
  out("  static let stamps: [KStampArtEntry] = [");
  let lastCat = null;
  for (const e of entries) {
    if (e.cat !== lastCat) {
      const cat = cats.find((c) => c.id === e.cat);
      out(`    // ── ${cat ? cat.name : e.cat} ──`);
      lastCat = e.cat;
    }
    const tint = hex(paint(e.color, "fill"));
    const lead = `KStampArtEntry(${JSON.stringify(e.id)}, category: ${JSON.stringify(e.cat)}, tint: ${tint}`;
    if (!e.layers) {
      out(`    // ${e.id}: the template, ${e.why}`);
      out(`    ${lead}, art: [], soft: [], xs: []),`);
      continue;
    }
    out(`    ${lead},`);
    LAYERS.forEach((layer, i) => {
      const sep = i < LAYERS.length - 1 ? "," : "";
      const list = e.layers[layer];
      if (!list.length) {
        out(`      ${layer}: []${sep}`);
        return;
      }
      out(`      ${layer}: [`);
      for (const m of list) out(`        ${swiftMark(m)},`);
      out(`      ]${sep}`);
    });
    out("    ),");
  }
  out("  ]");
  out("}");
  return { swift: L.join("\n") + "\n", read: entries.filter((e) => e.layers).map((e) => e.id), unread, ignored, marks, entries, v3: V3, ignoredV3 };
}

/* ── the command line ────────────────────────────────────────────────────── */

function main() {
  const CHECK = process.argv.includes("--check");
  const fail = (msg) => {
    console.error(`gen-stamp-art-swift: ${msg}`);
    process.exit(1);
  };
  let result;
  try {
    result = buildSwift(readSources());
  } catch (e) {
    fail(e.message);
  }
  const { swift, read, unread, ignored, marks, v3, ignoredV3 } = result;
  for (const k of ignoredV3) console.warn(`gen-stamp-art-swift: ${k} has a v3 drawing but stamps.ts has no such stamp; left out`);
  for (const e of v3.entries.filter((x) => !x.layers)) console.warn(`gen-stamp-art-swift: v3 ${e.id} is drawn as its frame alone: ${e.why}`);
  for (const k of ignored) console.warn(`gen-stamp-art-swift: ${k} has a drawing but stamps.ts has no such stamp; left out`);
  for (const u of unread) console.warn(`gen-stamp-art-swift: ${u.id} is drawn as the template: ${u.why}`);
  const v3read = v3.entries.filter((x) => x.layers).length;
  const summary = `v3: ${v3read} of ${v3.entries.length} stamps, ${v3.counts.rims} rim / ${v3.counts.body} body / ${v3.counts.marks} mark / ${v3.counts.face} face elements; ` +
    (read.length + unread.length ? `v2: ${read.length} of ${read.length + unread.length} stamps from their drawing, ${marks.art} art / ${marks.soft} soft / ${marks.xs} xs marks; template: ${unread.length ? unread.map((u) => u.id).join(", ") : "none"}` : "v2: not written (no stamp-art-v2.ts)");
  if (CHECK) {
    let current = "";
    try {
      current = readFileSync(OUT, "utf8");
    } catch {
      fail(`${OUT.pathname} does not exist; run node scripts/gen-stamp-art-swift.mjs`);
    }
    if (current !== swift) fail("KStampArtData.swift is out of date with stamp-art-v3.ts / stamp-art-v2.ts / stamps.ts; run node scripts/gen-stamp-art-swift.mjs");
    console.log(`KStampArtData.swift is up to date (${summary})`);
  } else {
    writeFileSync(OUT, swift);
    console.log(`wrote ${OUT.pathname} (${summary})`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
