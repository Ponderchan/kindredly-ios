// node scripts/gen-stamp-art-swift.mjs            write the Swift copy of the stamp art
// node scripts/gen-stamp-art-swift.mjs --check    exit 1 if the Swift copy is out of date
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
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { PATH_CHARS, paint, parsePath, swiftHex as hex } from "./art-path.mjs";

export const ART = new URL("../src/data/stamp-art-v2.ts", import.meta.url);
export const LIST = new URL("../src/data/stamps.ts", import.meta.url);
// The colour an id with no stamp is drawn in: lib/stamp-frame's STAMP_FALLBACK_HEX, the one
// place every renderer reads it from (spec §2.11).
export const FALLBACK = new URL("../src/lib/stamp-frame.ts", import.meta.url);
export const OUT = new URL("../modules/kindredly-ui/ios/Portable/Kit/KStampArtData.swift", import.meta.url);

/** The box stamp-art-v2.ts draws on (components/Stamp: viewBox 0 0 100 120). */
export const BOX = Object.freeze({ width: 100, height: 120 });
/** The three layers of a v2 stamp, in the order the Swift entry lists them. */
export const LAYERS = Object.freeze(["art", "soft", "xs"]);

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
  const stamps = [...block("STAMPS").matchAll(/\{ id: "([^"]+)", cat: "([^"]+)", emoji: "[^"]*", color: "(#[0-9A-Fa-f]{6})"/g)].map(([, id, cat, color]) => ({
    id,
    cat,
    color,
  }));
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

export function readSources() {
  return {
    art: readArt(readFileSync(ART, "utf8")),
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

/**
 * Reads every stamp and writes the Swift table. Returns the file and what happened:
 * { swift, read: [id], unread: [{ id, why }], ignored: [art key], marks: { art, soft, xs }, entries }.
 */
export function buildSwift({ art, cats, stamps, unknownTint }) {
  const entries = [];
  const unread = [];
  const marks = { art: 0, soft: 0, xs: 0 };
  for (const st of stamps) {
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
  const ignored = Object.keys(art).filter((k) => !known.has(k));

  const L = [];
  const out = (s = "") => L.push(s);
  out("// GENERATED by scripts/gen-stamp-art-swift.mjs from src/data/stamp-art-v2.ts and src/data/stamps.ts. DO NOT EDIT.");
  out("// When the drawings or the stamp list change, run: node scripts/gen-stamp-art-swift.mjs");
  out("//");
  out("// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.");
  out();
  out("import SwiftUI");
  out();
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
  return { swift: L.join("\n") + "\n", read: entries.filter((e) => e.layers).map((e) => e.id), unread, ignored, marks, entries };
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
  const { swift, read, unread, ignored, marks } = result;
  for (const k of ignored) console.warn(`gen-stamp-art-swift: ${k} has a drawing but stamps.ts has no such stamp; left out`);
  for (const u of unread) console.warn(`gen-stamp-art-swift: ${u.id} is drawn as the template: ${u.why}`);
  const summary = `${read.length} of ${read.length + unread.length} stamps from their drawing, ${marks.art} art / ${marks.soft} soft / ${marks.xs} xs marks; template: ${unread.length ? unread.map((u) => u.id).join(", ") : "none"}`;
  if (CHECK) {
    let current = "";
    try {
      current = readFileSync(OUT, "utf8");
    } catch {
      fail(`${OUT.pathname} does not exist; run node scripts/gen-stamp-art-swift.mjs`);
    }
    if (current !== swift) fail("KStampArtData.swift is out of date with stamp-art-v2.ts / stamps.ts; run node scripts/gen-stamp-art-swift.mjs");
    console.log(`KStampArtData.swift is up to date (${summary})`);
  } else {
    writeFileSync(OUT, swift);
    console.log(`wrote ${OUT.pathname} (${summary})`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
