/* EXPORTING THE STAMPS A READER MADE — THE RULES (stamp export, 2026-11-10; First Class).
   ────────────────────────────────────────────────────────────────────────
   A reader presses their own stamps from a photo (Stamp Press). The owner wants them to leave the
   app two ways, as part of First Class: one stamp as a sticker (a PNG with a see-through ground)
   and all of them as a printable sheet (an A4 PDF, each stamp at a real stamp's size between
   dashed cut lines). Swift draws both (ios/Portable/Stamps/KStampExport.swift); this file is
   everything that is decided before it draws, pure (no React, no storage, no i18n: every word
   comes through `t`), so `node src/lib/stamp-export-core.test.ts` holds it:

   - WHICH STAMPS. Only the reader's own stamps that passed the check: state "ok". Never one that
     is still being checked, was refused, was taken down or was deleted, and never anyone else's
     (keeping strangers' stamps is parked by the owner; this is about what YOU made).
   - A STAMP WITH NO PICTURE IS NOT LEFT OUT QUIETLY. A stamp that qualifies but has no picture
     in hand (a link that could not be signed, a phone offline) fails the export with its name:
     a sheet that says "9 STAMPS" and prints 8 would be a lie.
   - THE FILE NAMES are readable: "kindredly-stamp-<topic>" (the #topic in lower case, letters
     and digits of any script, everything else a dash) and "kindredly-stamps-<year>".
   - THE SHEET. 25 stamps to a sheet (5 × 5: Swift's grid, KStampSheetMetrics), newest first as
     the album shows them, as many sheets as they need. The line at the top counts ALL the
     stamps in the file (the number is real: it is the length of the list that is printed).
   - WHO MAY. Everyone who can export sees the two actions; a First Class member exports, anyone
     else meets the paywall (/paywall?src=stamp_export; the journal book's one-time purchase does
     not include stamps). The small wax-gold mark shows only once the membership answer is in
     and it is no; before that a tap waits for the answer instead of sending a paying reader to
     the paywall (lib/entitlement: `premium: false` before `settled` means "not asked yet").
   - THE ALBUM. The album's sections and its sheet are stamp-collection.ts's, with the owner's
     layout rules; withStampExport only ADDS: "Save as sticker" to the sheet of each stamp that
     qualifies (after "Write with it", before the editing actions and Delete), and the words of
     the one head action, "Print a sheet", when at least one stamp qualifies. On a binary that
     can't export it changes nothing. */

import type { StampExportItem, StampSheetJob, StampStickerJob } from "../../modules/kindredly-ui/src/StampExport";
import type { KAlbumAction, KAlbumSection, KAlbumStrings } from "../../modules/kindredly-ui/src/Me";

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

/** A non-member's tap on either action. */
export const STAMP_EXPORT_PAYWALL = "/paywall?src=stamp_export";

/** Swift's grid: 5 columns × 5 rows of 30 × 40 mm cells on A4 (KStampSheetMetrics.perSheet). */
export const SHEET_PER_PAGE = 25;

/** One of the reader's stamps, as much of it as an export needs (lib/custom-stamps MyCustomStamp
    has every field). */
export type ExportStamp = {
  /** "c:<uuid>" */
  id: string;
  state: string;
  /** the #topic without "#" */
  topic: string;
  /** the picture: a file:// on this phone or a signed https link; null when there is none in hand */
  url: string | null;
  /** the picture's cache key */
  key: string;
  gold: boolean;
};

const isCustom = (id: string): boolean => id.startsWith("c:");

/** May this stamp be exported: the reader's own photo stamp that passed the check. */
export const qualifies = (s: Pick<ExportStamp, "id" | "state">): boolean => isCustom(s.id) && s.state === "ok";

/** The stamps that may be exported, in the order given (the album's: newest first), each once. */
export function exportable<T extends Pick<ExportStamp, "id" | "state">>(stamps: readonly T[]): T[] {
  const seen = new Set<string>();
  return stamps.filter((s) => qualifies(s) && !seen.has(s.id) && !!seen.add(s.id));
}

/** Whether the pictures should be asked for again before exporting: one has none in hand, or is
    a signed link (it lapses after an hour; the album may have been open that long). Stamps
    pressed on this phone are files and need nothing. */
export const needsFreshPictures = (stamps: readonly Pick<ExportStamp, "url">[]): boolean => stamps.some((s) => !s.url || !/^file:|^\//.test(s.url));

/* ── file names ── */

/** A #topic as part of a file name: lower case, letters, marks and digits of any script kept,
    every run of anything else one dash, none at either end, at most 40 characters. "" when
    nothing of it can be kept (an emoji alone). */
export function topicSlug(topic: string, lower: (s: string) => string = (s) => s.toLowerCase()): string {
  const slug = lower(topic.normalize("NFKC"))
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return [...slug].slice(0, 40).join("").replace(/-+$/, "");
}

/** "kindredly-stamp-tiny-win"; "kindredly-stamp" for a topic nothing can be kept of. */
export function stickerFileStem(topic: string, lower?: (s: string) => string): string {
  const slug = topicSlug(topic, lower);
  return slug ? `kindredly-stamp-${slug}` : "kindredly-stamp";
}

/** "kindredly-stamps-2026" */
export const sheetFileStem = (year: number): string => `kindredly-stamps-${year}`;

/* ── the jobs ── */

export type ExportFormat = {
  t: TFn;
  lower: (s: string) => string;
};

/** A stamp's picture is missing: the export says which and stops. */
export class NoStampPicture extends Error {
  readonly stampId: string;
  constructor(s: Pick<ExportStamp, "id" | "topic">) {
    super(`stamp export: no picture in hand for ${s.topic ? "#" + s.topic : s.id}`);
    this.name = "NoStampPicture";
    this.stampId = s.id;
  }
}

/** One stamp as Swift takes it. Throws NoStampPicture when it has none. */
export function exportItem(s: ExportStamp, fmt: Pick<ExportFormat, "lower">): StampExportItem {
  if (!s.url) throw new NoStampPicture(s);
  return { id: s.id, url: s.url, key: s.key || s.url, gold: !!s.gold, caption: s.topic ? `#${fmt.lower(s.topic)}` : "" };
}

/** The sticker of one stamp. Throws when the stamp does not qualify or has no picture. */
export function stickerJob(s: ExportStamp, fmt: Pick<ExportFormat, "lower">): StampStickerJob {
  if (!qualifies(s)) throw new Error(`stamp export: ${s.id} did not pass the check (${s.state}), it can't be a sticker`);
  return { fileStem: stickerFileStem(s.topic, fmt.lower), stamp: exportItem(s, fmt) };
}

/** `list` in sheets of `per`, in order; no empty sheet. */
export function sheetPages<T>(list: readonly T[], per: number = SHEET_PER_PAGE): T[][] {
  const size = Math.max(1, Math.floor(per));
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** The printable sheets of every stamp that qualifies, or null when none does. The top line's
    number is the count of stamps printed. Throws NoStampPicture when one of them has no picture. */
export function sheetJob(stamps: readonly ExportStamp[], now: Date, fmt: ExportFormat): StampSheetJob | null {
  const items = exportable(stamps).map((s) => exportItem(s, fmt));
  if (!items.length) return null;
  const year = now.getFullYear();
  return {
    fileStem: sheetFileStem(year),
    top: items.length === 1 ? fmt.t("sx.sheet.topOne", { year }) : fmt.t("sx.sheet.top", { n: items.length, year }),
    foot: fmt.t("sx.sheet.foot"),
    pages: sheetPages(items),
  };
}

/* ── who may ── */

export type ExportIntent = "export" | "paywall" | "wait" | "none";

/** What a tap on either action does. busy: nothing. Membership not answered yet: wait for it.
    A member: export. Anyone else: the paywall. */
export function exportIntent(f: { settled: boolean; premium: boolean; busy: boolean }): ExportIntent {
  if (f.busy) return "none";
  if (f.premium) return "export";
  return f.settled ? "paywall" : "wait";
}

/** The two actions wear the First Class mark only once the answer is in and it is no. */
export const exportLocked = (f: { settled: boolean; premium: boolean }): boolean => f.settled && !f.premium;

/* ── the album ── */

export type AlbumExportFacts = {
  /** this binary can export (lib/stamp-export stampExportAvailable) */
  on: boolean;
  /** the ids that qualify (exportable(my stamps)) */
  ids: ReadonlySet<string>;
  premium: boolean;
  settled: boolean;
};

/** The album as stamp-collection built it, plus the export: "Save as sticker" in the sheet of
    each stamp that qualifies, and MADE BY YOU's head action when one does. Nothing else moves;
    with `on` false the very same objects come back. */
export function withStampExport(
  album: { strings: KAlbumStrings; sections: KAlbumSection[] },
  f: AlbumExportFacts,
  t: TFn,
): { strings: KAlbumStrings; sections: KAlbumSection[] } {
  if (!f.on) return album;
  const locked = exportLocked(f);
  const lock = locked ? { lock: t("mf.result.lock"), lockA11y: t("pp.a11y.fc") } : {};
  const sticker: KAlbumAction = { key: "sticker", title: t("sx.sticker"), style: "plain", ...lock };
  let any = false;
  const sections = album.sections.map((sec) => {
    if (sec.key !== "made") return sec;
    let touched = false;
    const cells = sec.cells.map((c) => {
      if (!f.ids.has(c.id) || c.actions.some((a) => a.key === "sticker")) return c;
      touched = true;
      // after the first action when that is "Write with it", else first
      const at = c.actions[0]?.key === "write" ? 1 : 0;
      return { ...c, actions: [...c.actions.slice(0, at), sticker, ...c.actions.slice(at)] };
    });
    any = any || touched;
    return touched ? { ...sec, cells } : sec;
  });
  if (!any) return album;
  return {
    sections,
    strings: { ...album.strings, sheet: t("sx.sheet"), sheetLock: locked ? t("mf.result.lock") : "", sheetLockA11y: locked ? t("pp.a11y.fc") : "" },
  };
}
