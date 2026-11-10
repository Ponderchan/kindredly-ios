/* THE JOURNAL AS ONE TEXT FILE (owner's audit, 2026-11-10).
   ────────────────────────────────────────────────────────────────────────
   The journal lives only on this phone (lib/journal): deleting the app, or
   moving to a new phone without a backup, loses it, and there was no way to
   take it out. Settings' "Export my journal" writes every page into one
   Markdown file and hands it to the iOS share sheet (lib/journal-export-file
   does the reading, the writing and nothing else; useSettingsModel shares
   it). This file only builds the text — pure: no storage, no files, no
   i18n; every word and date comes in through `fmt`, so
   `node src/lib/journal-export.test.ts` holds the rules:

   - THE READER'S PAGES ONLY, ONCE EACH, OLDEST FIRST. A sample page (ours,
     id "demo-…", dev builds) is never exported; a repeated id is one page
     (the first met: the copy the screens show); a page whose date can't be
     read goes first rather than being dropped.
   - EACH PAGE: its date and time as a heading; one line under it with its
     mood's name (only a mood the page really stored) and a plain note of
     what is attached ("3 pictures", "Voice note, 1:14", "a video, 0:12" —
     the words Notes already uses for them); then the words exactly as
     written, never escaped or tidied; then the line that drifted out, if
     one did.
   - WORDS ONLY, AND IT SAYS SO. Photos, recordings and films are not in the
     file — a text file can't hold them — and the first lines of the file
     say that they stay in the app, so the file never reads as the whole
     journal when it isn't.
   - The file is named with the day it was made, in the phone's own time
     ("kindredly-journal-2026-11-10.md"): two exports on different days sit
     side by side in Files. */

/** One stored page, as much of it as the export reads (lib/journal JournalEntry). */
export type ExportPage = {
  id: string;
  date: string;
  type?: string;
  body?: string;
  mood?: string | null;
  mediaUri?: string;
  media?: string[];
  dur?: number;
  driftedLine?: string;
};

/** Every word and date of the file, from the caller (i18n's t, moods' moodLabel, lib/format). */
export type ExportFormat = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** a stored mood's name in the reader's language; "" for none or an unknown one */
  moodLabel: (mood: string | null | undefined) => string;
  /** a full date with its year: "Wednesday, October 14, 2026" */
  date: (iso: string) => string;
  /** a clock time, 24h: "21:37" */
  time: (iso: string) => string;
  /** seconds as m:ss */
  duration: (seconds: number) => string;
};

const when = (iso: string): number => {
  const n = Date.parse(iso);
  return Number.isNaN(n) ? 0 : n;
};

/** The pages an export holds: the reader's own (no samples), one per id, oldest first. Never mutates. */
export function exportPages<T extends { id: string; date: string }>(entries: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const e of entries) {
    if (!e || typeof e.id !== "string" || e.id.startsWith("demo-") || seen.has(e.id)) continue;
    seen.add(e.id);
    out.push(e);
  }
  return out.sort((a, b) => when(a.date) - when(b.date));
}

/** A plain note of what a page has attached, in Notes' own words; "" for a page of words. */
export function attachedNote(e: ExportPage, fmt: ExportFormat): string {
  const dur = typeof e.dur === "number" && e.dur > 0 ? fmt.duration(e.dur) : "";
  switch (e.type) {
    case "photo": {
      const n = e.media?.length ? e.media.length : e.mediaUri ? 1 : 0;
      if (n <= 0) return "";
      return n > 1 ? fmt.t("jt.pictures", { n }) : fmt.t("jt.picture");
    }
    case "voice":
      if (!e.mediaUri) return "";
      return dur ? `${fmt.t("jp.say")}, ${dur}` : fmt.t("jp.say");
    case "video":
      if (!e.mediaUri) return "";
      return dur ? `${fmt.t("jt.aVideo")}, ${dur}` : fmt.t("jt.aVideo");
    default:
      return "";
  }
}

/** One page of the file: heading, the mood and what is attached, the words, the drifted line. */
export function exportPage(e: ExportPage, fmt: ExportFormat): string {
  // a date that can't be read is shown as stored (or a dash), never invented
  const head = Number.isNaN(Date.parse(e.date)) ? String(e.date || "—") : `${fmt.date(e.date)} · ${fmt.time(e.date)}`;
  const meta = [fmt.moodLabel(e.mood), attachedNote(e, fmt)].filter((s) => s.length > 0).join(" · ");
  const words = (e.body || "").trim();
  const drifted = (e.driftedLine || "").trim();
  const parts = [`## ${head}`];
  if (meta) parts.push(`*${meta}*`);
  if (words) parts.push(words);
  if (drifted) parts.push(`> ${fmt.t("jx.drifted")} ${drifted.replace(/\n+/g, " ")}`);
  return parts.join("\n\n");
}

/** The whole file. `pages` is how many it holds (0: nothing to export, and `text` is ""). */
export function buildJournalExport(entries: readonly ExportPage[], now: Date, fmt: ExportFormat): { text: string; pages: number } {
  const pages = exportPages(entries);
  if (!pages.length) return { text: "", pages: 0 };
  const head = [`# ${fmt.t("sc.journalTitle")}`, fmt.t("jx.intro", { date: fmt.date(now.toISOString()) })].join("\n\n");
  const body = pages.map((e) => exportPage(e, fmt)).join("\n\n---\n\n");
  return { text: `${head}\n\n---\n\n${body}\n`, pages: pages.length };
}

/** The file's name, with the day it was made in the phone's own time. */
export function exportFileName(now: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `kindredly-journal-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.md`;
}
