// node scripts/gen-stamp-art-swift.mjs            write the Swift copy of the stamp art
// node scripts/gen-stamp-art-swift.mjs --check    exit 1 if the Swift copy is out of date
//
// Writes modules/kindredly-ui/ios/Portable/Kit/KStampArtData.swift (the 10a overhaul, step 5)
// from two files the React Native app already draws from:
//   - src/data/stamp-art.ts: each stamp's drawing on a 64 grid, as a flat list of SVG shapes
//     (StampTile draws it through ArtShapes into react-native-svg);
//   - src/data/stamps.ts: which stamp ids exist, in which order, and each stamp's own colour
//     (the backend's vocabulary: letters.stamp stores these ids).
// KStampArt (Kit/KStampArt.swift) draws the generated table with SwiftUI, so a stamp is drawn
// from the same path data on both sides and changes in one place: the design set, then
// stamp-art.ts, then this script. The generated file imports SwiftUI only, like every Portable
// file, so the pure-Swift app planned for 1.1.0 can take it as it is.
//
// What it copies. The path data goes over verbatim and is read on the device by the module's
// SVG reader (KSVGPath in Kit/KLineGlyph.swift: M L H V C S Q T A Z, absolute and relative,
// arcs as cubic Béziers). This script reads every path with the same grammar first (parsePath in
// scripts/art-path.mjs, re-exported here for the test), so nothing reaches Swift that the reader
// would cut short.
// Circles, ellipses and rects, which ArtShapes also draws, become path data here. Paint comes
// over as fill and stroke colours (#RRGGBB, #RRGGBBAA, #RGB or none; RGBA packed in a UInt32),
// stroke width, line cap and join, and the dash array (the frames' perforation, "0.5 5", and
// dashes, "3 5"). Stamps keep their own colours in every theme: they are content, not chrome.
//
// What it refuses. A shape it can't read exactly (path data the grammar rejects, a transform,
// an opacity, a colour that isn't hex, an attribute it doesn't know) is never drawn half right:
// the whole stamp is written as a tinted tile instead (KStampArtEntry paths: nil), the tile
// StampTile itself falls back to, and the script names it and says why. A stamp with no art is
// a tile too. Today every one of the 36 is read.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { paint, swiftHex as hex, swiftPath, toArtPath } from "./art-path.mjs";

export const ART = new URL("../src/data/stamp-art.ts", import.meta.url);
export const LIST = new URL("../src/data/stamps.ts", import.meta.url);
// The colour an id with no stamp is drawn in. It used to be read off StampTile's own fallback
// line; since stamps v2 (2026-10-18) StampTile is a thin wrapper over components/Stamp and that
// colour lives in one place for every renderer, lib/stamp-frame's STAMP_FALLBACK_HEX (spec
// §2.11). It is the same #8B7FE8, so the Swift table this writes is unchanged.
export const FALLBACK = new URL("../src/lib/stamp-frame.ts", import.meta.url);
export const OUT = new URL("../modules/kindredly-ui/ios/Portable/Kit/KStampArtData.swift", import.meta.url);

/** The grid stamp-art.ts draws on (StampTile: viewBox="0 0 64 64"). */
export const GRID = 64;

/* ── reading the sources ─────────────────────────────────────────────────── */

/** STAMP_ART from stamp-art.ts: a generated file whose table is one JSON object on one line. */
export function readArt(text) {
  const m = /^export const STAMP_ART\s*:[^=]*=\s*(\{.*\});?\s*$/m.exec(text);
  if (!m) throw new Error("stamp-art.ts: no `export const STAMP_ART: … = {…};` line");
  try {
    return JSON.parse(m[1]);
  } catch (e) {
    throw new Error(`stamp-art.ts: STAMP_ART is not plain JSON (${e.message})`);
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
  const stamps = [...block("STAMPS").matchAll(/\{ id: "([^"]+)", cat: "([^"]+)", emoji: "[^"]*", color: "(#[0-9A-Fa-f]{6})"/g)].map(([, id, cat, color]) => ({
    id,
    cat,
    color,
  }));
  if (!stamps.length) throw new Error("stamps.ts: no stamps read from STAMPS");
  if (new Set(stamps.map((s) => s.id)).size !== stamps.length) throw new Error("stamps.ts: a stamp id is listed twice");
  return { cats, stamps };
}

/** The colour a stamp id this build doesn't know is drawn in (StampTile → Stamp → stamp-frame). */
export function readUnknownTint(text) {
  const m = /export const STAMP_FALLBACK_HEX = "(#[0-9A-Fa-f]{6})"/.exec(text);
  if (!m) throw new Error("stamp-frame.ts: no fallback colour (`export const STAMP_FALLBACK_HEX = \"#…\"`)");
  return m[1];
}

export function readSources() {
  return {
    art: readArt(readFileSync(ART, "utf8")),
    ...readStamps(readFileSync(LIST, "utf8")),
    unknownTint: readUnknownTint(readFileSync(FALLBACK, "utf8")),
  };
}

/* ── the shared reader ───────────────────────────────────────────────────── */

// The path-data reader, the shape-to-KArtPath conversion and the Swift writer live in
// scripts/art-path.mjs, shared with the mood icons' importer and Swift generator. They are
// re-exported here so this script's test (and anything else that imported them from here) keeps
// working unchanged.
export { arcToCurves, dashes, paint, parsePath, shapeData, swiftPath, toArtPath } from "./art-path.mjs";

/**
 * Reads every stamp and writes the Swift table. Returns the file and what happened:
 * { swift, read: [id], unread: [{ id, why }], ignored: [art key], shapes }.
 */
export function buildSwift({ art, cats, stamps, unknownTint }) {
  const entries = [];
  const unread = [];
  let shapes = 0;
  for (const st of stamps) {
    const list = art[`stamp-${st.id}`];
    let paths = null;
    let why = null;
    if (!Array.isArray(list) || !list.length) {
      why = "no art in stamp-art.ts";
    } else {
      try {
        paths = list.map((s, i) => {
          try {
            return toArtPath(s);
          } catch (e) {
            throw new Error(`shape ${i + 1} of ${list.length}: ${e.message}`);
          }
        });
        paths = paths.filter(Boolean);
        if (!paths.length) throw new Error("every shape is empty");
      } catch (e) {
        paths = null;
        why = e.message;
      }
    }
    if (paths) shapes += paths.length;
    else unread.push({ id: st.id, why });
    entries.push({ ...st, paths, why });
  }
  const known = new Set(stamps.map((s) => `stamp-${s.id}`));
  const ignored = Object.keys(art).filter((k) => !known.has(k));

  const L = [];
  const out = (s = "") => L.push(s);
  out("// GENERATED by scripts/gen-stamp-art-swift.mjs from src/data/stamp-art.ts and src/data/stamps.ts. DO NOT EDIT.");
  out("// When the art or the stamp list changes, run: node scripts/gen-stamp-art-swift.mjs");
  out("//");
  out("// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.");
  out();
  out("import SwiftUI");
  out();
  out(`/// The ${stamps.length} stamps as src/data/stamp-art.ts draws them (StampTile, through ArtShapes): each shape's`);
  out(`/// path data verbatim on the ${GRID} grid and its paint, in src/data/stamps.ts order. KStampArt draws it.`);
  out("///");
  out(`/// Read by the generator: ${stamps.length - unread.length} of ${stamps.length} stamps, ${shapes} shapes.`);
  if (unread.length) {
    out("/// Drawn as a tinted tile instead (paths: nil), because the generator could not read their art:");
    for (const u of unread) out(`///   - ${u.id}: ${u.why}`);
  } else {
    out("/// Drawn as a tinted tile instead: none.");
  }
  out("enum KStampArtData {");
  out(`  /// The grid the art is drawn on: viewBox 0 0 ${GRID} ${GRID}.`);
  out(`  static let grid: CGFloat = ${GRID}`);
  out();
  out(`  /// The tile colour StampTile gives an id it doesn't know (${unknownTint.toUpperCase()}).`);
  out(`  static let unknownTint: UInt32 = ${hex(paint(unknownTint, "fill"))}`);
  out();
  out("  static let stamps: [KStampArtEntry] = [");
  let lastCat = null;
  for (const e of entries) {
    if (e.cat !== lastCat) {
      const cat = cats.find((c) => c.id === e.cat);
      out(`    // ── ${cat ? cat.name : e.cat} ──`);
      lastCat = e.cat;
    }
    const tint = hex(paint(e.color, "fill"));
    if (!e.paths) {
      out(`    // ${e.id}: a tinted tile, ${e.why}`);
      out(`    KStampArtEntry(${JSON.stringify(e.id)}, tint: ${tint}, paths: nil),`);
      continue;
    }
    out(`    KStampArtEntry(${JSON.stringify(e.id)}, tint: ${tint}, paths: [`);
    for (const p of e.paths) out(`      ${swiftPath(p)},`);
    out("    ]),");
  }
  out("  ]");
  out("}");
  return { swift: L.join("\n") + "\n", read: entries.filter((e) => e.paths).map((e) => e.id), unread, ignored, shapes, entries };
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
  const { swift, read, unread, ignored, shapes } = result;
  for (const k of ignored) console.warn(`gen-stamp-art-swift: ${k} has art but stamps.ts has no such stamp; left out`);
  for (const u of unread) console.warn(`gen-stamp-art-swift: ${u.id} is drawn as a tinted tile: ${u.why}`);
  const summary = `${read.length} of ${read.length + unread.length} stamps from their art, ${shapes} shapes; tinted tile: ${unread.length ? unread.map((u) => u.id).join(", ") : "none"}`;
  if (CHECK) {
    let current = "";
    try {
      current = readFileSync(OUT, "utf8");
    } catch {
      fail(`${OUT.pathname} does not exist; run node scripts/gen-stamp-art-swift.mjs`);
    }
    if (current !== swift) fail("KStampArtData.swift is out of date with stamp-art.ts / stamps.ts; run node scripts/gen-stamp-art-swift.mjs");
    console.log(`KStampArtData.swift is up to date (${summary})`);
  } else {
    writeFileSync(OUT, swift);
    console.log(`wrote ${OUT.pathname} (${summary})`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
