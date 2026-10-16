// node scripts/gen-mood-art-swift.mjs            write the Swift copy of the mood icons
// node scripts/gen-mood-art-swift.mjs --check    exit 1 if the Swift copy is out of date
//
// Writes modules/kindredly-ui/ios/Portable/Kit/KMoodArtData.swift (the 10a overhaul, step 5) from
// two files the React Native app already draws from:
//   - src/data/mood-line-art.ts: the mood icons as one-colour line faces on a 24 grid, written by
//     scripts/import-mood-art.mjs from the owner's SVG files in design/moods-line (MoodFace draws
//     it through ArtShapes into react-native-svg);
//   - src/data/moods.ts: which icons exist and in which order — each group's icon (MOOD_GROUP_IDS)
//     then its faces (MOOD_GROUP_FACES), read by the importer's readMoods.
// KMoodArt (Kit/KMoodArt.swift) draws the generated table with SwiftUI, so a mood icon is drawn
// from the same path data on both sides: the SVG file, then mood-line-art.ts, then this script.
// It is the stamp pipeline's twin (scripts/gen-stamp-art-swift.mjs) on the shared reader
// (scripts/art-path.mjs): the path data goes over verbatim, read by the module's SVG reader
// (KSVGPath), and every path is read with the same grammar first. The paint is the template
// ink (0x000000FF) as the importer wrote it; KMoodArt paints every mark in the group's face ink
// at draw time and scales the strokes, so nothing here is coloured.
//
// Every icon moods.ts names gets an entry, drawn or not. One the owner hasn't delivered yet (or
// one whose shapes the reader refuses, which the importer already rules out) is written with
// paths: nil, and KMoodArt answers nil for it, so KMoodChip falls back to the group's icon and
// then to the 10a line face. A key mood-line-art.ts holds that moods.ts doesn't name is left out
// with a warning.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { swiftHex, swiftPath, toArtPath } from "./art-path.mjs";
import { readMoods } from "./import-mood-art.mjs";

export const ART = new URL("../src/data/mood-line-art.ts", import.meta.url);
export const MOODS = new URL("../src/data/moods.ts", import.meta.url);
export const OUT = new URL("../modules/kindredly-ui/ios/Portable/Kit/KMoodArtData.swift", import.meta.url);

/** The grid mood-line-art.ts draws on (MoodFace: viewBox="0 0 24 24"). */
export const GRID = 24;

/* ── reading the sources ─────────────────────────────────────────────────── */

/** MOOD_LINE_ART from mood-line-art.ts (one JSON object on one line), checked to be on the 24 grid. */
export function readArt(text) {
  const g = /^export const MOOD_LINE_GRID = ([0-9.]+);$/m.exec(text);
  if (!g) throw new Error("mood-line-art.ts: no `export const MOOD_LINE_GRID = …;` line");
  if (Number(g[1]) !== GRID) throw new Error(`mood-line-art.ts draws on a ${g[1]} grid; KMoodArt reads ${GRID}`);
  const m = /^export const MOOD_LINE_ART\s*:[^=]*=\s*(\{.*\});?\s*$/m.exec(text);
  if (!m) throw new Error("mood-line-art.ts: no `export const MOOD_LINE_ART: … = {…};` line");
  try {
    return JSON.parse(m[1]);
  } catch (e) {
    throw new Error(`mood-line-art.ts: MOOD_LINE_ART is not plain JSON (${e.message})`);
  }
}

export function readSources() {
  return { art: readArt(readFileSync(ART, "utf8")), moods: readMoods(readFileSync(MOODS, "utf8")) };
}

/* ── the Swift file ──────────────────────────────────────────────────────── */

const title = (g) => g.charAt(0).toUpperCase() + g.slice(1);

/** names wrapped into /// comment lines */
function wrapDoc(names, width = 100, indent = "///   ") {
  const lines = [];
  let line = indent;
  names.forEach((n, k) => {
    const piece = `${n}${k === names.length - 1 ? "" : ","}`;
    if (line.length > indent.length && (line + " " + piece).length > width) {
      lines.push(line);
      line = indent + piece;
    } else line += (line.length > indent.length ? " " : "") + piece;
  });
  lines.push(line);
  return lines;
}

/**
 * Reads every icon and writes the Swift table. Returns the file and what happened:
 * { swift, drawn: [key], undrawn: [{ key, why }], ignored: [art key], shapes }.
 */
export function buildSwift({ art, moods }) {
  const entries = [];
  let shapes = 0;
  for (const e of moods.expected) {
    const list = Object.prototype.hasOwnProperty.call(art, e.key) ? art[e.key] : undefined;
    let paths = null;
    let why = null;
    if (!Array.isArray(list) || !list.length) {
      why = "not drawn yet";
    } else {
      try {
        paths = list.map((s, i) => {
          try {
            return toArtPath(s);
          } catch (err) {
            throw new Error(`shape ${i + 1} of ${list.length}: ${err.message}`);
          }
        });
        paths = paths.filter(Boolean);
        if (!paths.length) throw new Error("every shape is empty");
      } catch (err) {
        paths = null;
        why = err.message;
      }
    }
    if (paths) shapes += paths.length;
    entries.push({ ...e, paths, why });
  }
  const known = new Set(moods.expected.map((e) => e.key));
  const ignored = Object.keys(art).filter((k) => !known.has(k));
  const drawn = entries.filter((e) => e.paths);
  const undrawn = entries.filter((e) => !e.paths).map((e) => ({ key: e.key, why: e.why }));
  const notYet = undrawn.filter((u) => u.why === "not drawn yet");
  const refused = undrawn.filter((u) => u.why !== "not drawn yet");

  const L = [];
  const out = (s = "") => L.push(s);
  out("// GENERATED by scripts/gen-mood-art-swift.mjs from src/data/mood-line-art.ts and src/data/moods.ts. DO NOT EDIT.");
  out("// When the drawings change, run: node scripts/import-mood-art.mjs && node scripts/gen-mood-art-swift.mjs");
  out("//");
  out("// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.");
  out();
  out("import SwiftUI");
  out();
  const groupIcons = moods.expected.filter((e) => e.kind === "group").length;
  out(`/// The ${moods.expected.length} mood icons (${groupIcons} group icons and ${moods.expected.length - groupIcons} faces) as src/data/mood-line-art.ts draws them`);
  out(`/// (MoodFace, through ArtShapes): each mark's path data verbatim on the ${GRID} grid, in the template`);
  out("/// ink, in src/data/moods.ts order (each group's icon, then its faces). KMoodArt paints every");
  out("/// mark in the group's face ink and scales the strokes by the size's step.");
  out("///");
  out(`/// Drawn: ${drawn.length} of ${entries.length}, ${shapes} marks.`);
  if (notYet.length) {
    out(`/// Not drawn yet (paths: nil; KMoodChip falls back to the group's icon, then the 10a line face): ${notYet.length}`);
    for (const l of wrapDoc(notYet.map((u) => u.key))) out(l);
  } else {
    out("/// Not drawn yet: none.");
  }
  if (refused.length) {
    out("/// Refused by the generator (paths: nil):");
    for (const u of refused) out(`///   - ${u.key}: ${u.why}`);
  }
  out("enum KMoodArtData {");
  out(`  /// The grid the icons are drawn on: viewBox 0 0 ${GRID} ${GRID}.`);
  out(`  static let grid: CGFloat = ${GRID}`);
  out();
  out(`  /// The template ink the marks are written in; KMoodArt paints over it (${swiftHex(0x000000ff)}).`);
  out(`  static let ink: UInt32 = ${swiftHex(0x000000ff)}`);
  out();
  out("  static let moods: [KMoodArtEntry] = [");
  let lastGroup = null;
  for (const e of entries) {
    if (e.group !== lastGroup) {
      out(`    // ── ${title(e.group)} ──`);
      lastGroup = e.group;
    }
    if (!e.paths) {
      out(`    KMoodArtEntry(${JSON.stringify(e.key)}, paths: nil),${e.why === "not drawn yet" ? "" : ` // ${e.why}`}`);
      continue;
    }
    out(`    KMoodArtEntry(${JSON.stringify(e.key)}, paths: [`);
    for (const p of e.paths) out(`      ${swiftPath(p)},`);
    out("    ]),");
  }
  out("  ]");
  out("}");
  return { swift: L.join("\n") + "\n", drawn: drawn.map((e) => e.key), undrawn, ignored, shapes, entries };
}

/* ── the command line ────────────────────────────────────────────────────── */

function main() {
  const CHECK = process.argv.includes("--check");
  const fail = (msg) => {
    console.error(`gen-mood-art-swift: ${msg}`);
    process.exit(1);
  };
  let result;
  try {
    result = buildSwift(readSources());
  } catch (e) {
    fail(e.message);
  }
  const { swift, drawn, undrawn, ignored, shapes } = result;
  for (const k of ignored) console.warn(`gen-mood-art-swift: ${k} has art but moods.ts names no such icon; left out`);
  for (const u of undrawn) if (u.why !== "not drawn yet") console.warn(`gen-mood-art-swift: ${u.key} is left undrawn: ${u.why}`);
  const summary = `${drawn.length} of ${drawn.length + undrawn.length} icons drawn, ${shapes} marks`;
  if (CHECK) {
    let current = "";
    try {
      current = readFileSync(OUT, "utf8");
    } catch {
      fail(`${OUT.pathname} does not exist; run node scripts/gen-mood-art-swift.mjs`);
    }
    if (current !== swift) fail("KMoodArtData.swift is out of date with mood-line-art.ts / moods.ts; run node scripts/gen-mood-art-swift.mjs");
    console.log(`KMoodArtData.swift is up to date (${summary})`);
  } else {
    writeFileSync(OUT, swift);
    console.log(`wrote ${OUT.pathname} (${summary})`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
