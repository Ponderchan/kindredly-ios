/* EXPORTING THE STAMPS A READER MADE — THE CALLS (stamp export, 2026-11-10; First Class).
   ────────────────────────────────────────────────────────────────────────
   The album's two actions end here: "Save as sticker" (one stamp as a PNG with a see-through
   ground) and "Print a sheet" (every stamp the reader made, as printable A4 sheets). The rules
   are stamp-export-core (pure, node-tested: which stamps qualify, the file names, the paging,
   the words); Swift draws (ios/Portable/Stamps/KStampExport.swift, across
   modules/kindredly-ui/src/StampExport.ts); this file joins them and hands the file to the iOS
   share sheet, the way src/lib/journal-book.ts does for the book.

   - stampExportAvailable(): this binary can (the module itself is asked, never a version). The
     album offers neither action where it is false.
   - THE PICTURES. A stamp pressed on this phone is a file here; one made on another phone is a
     signed link that lapses after an hour. `source` is asked for the stamps at the moment of the
     export: myStamps(current) reads them again from the server only when a picture is missing or
     is a link (lib/custom-stamps freshMyCustomStamps signs afresh), so the common case costs
     nothing. A stamp that qualifies and still has no picture FAILS the export with its name
     (stamp-export-core NoStampPicture): a sheet is never printed one stamp short.
   - ONE AT A TIME. A second tap while an export is being made makes nothing more (null), never a
     second render or a second share sheet over the first.
   - `made` is called when the file is ready and the share sheet is about to open, so the album
     can stop saying "making…" behind the share sheet.
   - FAILURES ARE THE CALLER'S TO SAY. Every failure is logged here with what failed and thrown
     again; the album shows the alert (sx.sticker.fail / sx.sheet.fail). Closing the share sheet
     without sharing is not a failure.

   Who may export (First Class) is not decided here: the album's hook asks the entitlement and
   sends anyone else to the paywall (screens/me/useStampExport). */

import { Share } from "react-native";
import { hasStampExport, renderStampSheet, renderStampSticker } from "../../modules/kindredly-ui/src/StampExport";
import { freshMyCustomStamps } from "./custom-stamps";
import { exportable, needsFreshPictures, sheetJob, stickerJob, type ExportFormat, type ExportStamp } from "./stamp-export-core";
import { t } from "./i18n";
import "../data/strings-stamp-export";

/** Whether this binary can export stamps at all. */
export const stampExportAvailable = (): boolean => hasStampExport();

/** Where an export gets the reader's stamps, asked at the moment of the export. */
export type StampSource = () => Promise<readonly ExportStamp[]>;

/** The reader's own stamps for an export: the list in hand when every picture it needs is a file
    on this phone, else read again from the server with fresh links. */
export function myStamps(current: () => readonly ExportStamp[]): StampSource {
  return async () => {
    const now = current();
    if (!needsFreshPictures(exportable(now))) return now;
    return freshMyCustomStamps();
  };
}

const format = (): ExportFormat => ({ t, lower: (s) => s.toLocaleLowerCase() });

/* one export at a time */
let making = false;

async function one<T>(what: string, run: () => Promise<T>): Promise<T | null> {
  if (making) return null;
  making = true;
  try {
    if (!hasStampExport()) throw new Error("stamp export: this build can't export stamps");
    return await run();
  } catch (e) {
    console.warn(`[stamp-export] the ${what} wasn't made:`, e);
    throw e;
  } finally {
    making = false;
  }
}

/** Make one stamp's sticker and hand it to the iOS share sheet. Resolves once the share sheet has
    closed, whatever the reader did there; null when another export was already being made.
    REJECTS when the stamp is not among the source's, did not pass the check, has no picture, this
    binary can't draw it, the drawing fails or the sheet can't open: the caller says so. */
export function exportSticker(id: string, source: StampSource, made?: () => void): Promise<{ uri: string } | null> {
  return one("sticker", async () => {
    const stamp = (await source()).find((s) => s.id === id);
    if (!stamp) throw new Error(`stamp export: ${id} is not one of the reader's stamps any more`);
    const uri = await renderStampSticker(stickerJob(stamp, format()));
    made?.();
    await Share.share({ url: uri });
    return { uri };
  });
}

/** Make the printable sheets of every stamp that qualifies and hand the PDF to the iOS share
    sheet. Resolves once the share sheet has closed with how many stamps and sheets it holds;
    null when no stamp qualifies (nothing was made) or another export was already being made.
    REJECTS as exportSticker does; one stamp without a picture fails the whole sheet. */
export function exportSheet(source: StampSource, made?: () => void, now: Date = new Date()): Promise<{ uri: string; stamps: number; sheets: number } | null> {
  return one("sheet", async () => {
    const job = sheetJob(await source(), now, format());
    if (!job) return null;
    const uri = await renderStampSheet(job);
    made?.();
    await Share.share({ url: uri });
    return { uri, stamps: job.pages.reduce((n, p) => n + p.length, 0), sheets: job.pages.length };
  });
}
