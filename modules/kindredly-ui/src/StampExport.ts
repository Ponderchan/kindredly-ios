import { requireOptionalNativeModule } from "expo";

/* EXPORTING THE STAMPS A READER MADE, ACROSS THE BRIDGE (stamp export, 2026-11-10; First Class).
   ────────────────────────────────────────────────────────────────────────
   A reader's own photo stamps can leave the app two ways: one as a sticker (a PNG with a
   see-through ground, 768 × 1024) and all of them as printable A4 sheets (a PDF, 25 to a sheet,
   each stamp 30 × 36 mm between dashed cut lines). Swift draws both with the photo stamp's own
   cut, off the main thread (ios/Portable/Stamps/KStampExport.swift), and writes the file into
   the phone's cache.

   TS builds the whole job as one plain object (src/lib/stamp-export-core: which stamps qualify,
   the file names, the paging, every word already in the reader's language) and Swift only draws
   it. The types below ARE the contract between the two: Swift reads exactly these shapes.

   The three native functions are new in the binary that carries the export, and JavaScript
   travels over the air to older binaries: hasStampExport() asks the module itself (never a
   version number) and is false on a binary from before them, on Android, and when the call
   fails; the two renders reject there instead of pretending. The album offers neither action
   wherever hasStampExport() is false. */

/** One stamp to export. */
export type StampExportItem = {
  /** "c:<uuid>" */
  id: string;
  /** its picture: a file:// on this phone or a signed https link */
  url: string;
  /** the picture's cache key (its storage path, never the signed link) */
  key: string;
  /** a Cofounder's stamp: the gold line */
  gold: boolean;
  /** what a sheet prints under it: "#tea" ("" prints nothing) */
  caption: string;
};

/** One stamp as a sticker: Caches/<fileStem>.png */
export type StampStickerJob = { fileStem: string; stamp: StampExportItem };

/** Every stamp as printable sheets: Caches/<fileStem>.pdf */
export type StampSheetJob = {
  fileStem: string;
  /** "KINDREDLY POST · 9 STAMPS · 2026", at the top of every sheet */
  top: string;
  /** "PRINT AT 100% · CUT ALONG THE LINES", at the foot of every sheet */
  foot: string;
  /** the stamps of each sheet, in print order (at most 25 to a sheet) */
  pages: StampExportItem[][];
};

type Native = {
  hasStampExport?: () => boolean;
  renderStampSticker?: (json: string) => Promise<string>;
  renderStampSheet?: (json: string) => Promise<string>;
};

const native = (): Native | null => requireOptionalNativeModule<Native>("KindredlyUI");

/* Asked once and remembered: a binary can't gain the renderer while it runs. */
let has: boolean | undefined;

/** Whether this binary's Swift can export stamps. false on a binary from before it, on Android,
    and when the question itself fails. */
export function hasStampExport(): boolean {
  if (has !== undefined) return has;
  let there = false;
  try {
    const n = native();
    there =
      typeof n?.hasStampExport === "function" &&
      typeof n.renderStampSticker === "function" &&
      typeof n.renderStampSheet === "function" &&
      n.hasStampExport() === true;
  } catch (e) {
    console.log("[kindredly-ui] could not ask for the stamp export, leaving it out:", e);
  }
  has = there;
  return there;
}

/** a bare path is a file too (Share wants the uri) */
const asUri = (out: unknown, what: string): string => {
  if (typeof out !== "string" || !out) throw new Error(`stamp export: the ${what} renderer answered no file`);
  return out.startsWith("/") ? "file://" + out : out;
};

/** Draw one stamp as a see-through PNG in the phone's cache and say where it is (a file:// uri).
    Rejects on a binary without the renderer, and when Swift fails (no picture, no room): the
    caller says so, nothing is swallowed. */
export async function renderStampSticker(job: StampStickerJob): Promise<string> {
  const n = native();
  if (typeof n?.renderStampSticker !== "function") throw new Error("stamp export: this build has no renderStampSticker");
  return asUri(await n.renderStampSticker(JSON.stringify(job)), "sticker");
}

/** Draw the stamps as printable A4 sheets, one PDF in the phone's cache, and say where it is (a
    file:// uri). Rejects as renderStampSticker does; one stamp whose picture can't be had fails
    the whole sheet (it is never printed with an empty place). */
export async function renderStampSheet(job: StampSheetJob): Promise<string> {
  const n = native();
  if (typeof n?.renderStampSheet !== "function") throw new Error("stamp export: this build has no renderStampSheet");
  return asUri(await n.renderStampSheet(JSON.stringify(job)), "sheet");
}
