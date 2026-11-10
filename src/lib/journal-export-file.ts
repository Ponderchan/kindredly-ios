import { Directory, File, Paths } from "expo-file-system";
import { moodLabel } from "../data/moods";
import { fmt as fmtDuration, localeTag, time24 } from "./format";
import { t } from "./i18n";
import { readJournal } from "./journal";
import { buildJournalExport, exportFileName, exportPages, type ExportFormat } from "./journal-export";
import "../data/strings-audit-notes"; // jx.*

/* THE JOURNAL'S EXPORT, ON DISK (owner's audit, 2026-11-10; the text itself
   is lib/journal-export, pure and tested). Settings' "Export my journal"
   calls writeJournalExport and hands the file to the iOS share sheet (React
   Native's Share: Save to Files, AirDrop, Mail).

   THE JOURNAL STAYS LOCAL-ONLY (lib/journal's promise). Nothing here sends
   anything anywhere: the file is written inside the app's own cache folder,
   and it leaves the phone only if the reader picks somewhere in the share
   sheet themselves. It is the words only — photos, recordings and films are
   not copied — and the file says so in its first lines.

   - It is read with readJournal, which REJECTS when the journal can't be
     read, so a failed read is said as a failure and never written out as an
     empty journal.
   - One export at a time on disk: the folder (Caches/journal-export) is
     emptied before each new file, so old copies of the reader's pages don't
     pile up outside the journal. The newest stays until the next export, or
     until iOS clears the cache — it has to outlive the share sheet, which
     reads it after this returns (an AirDrop still sending, Mail still open).
   - expo-file-system's current API (SDK 57: File / Directory / Paths; a
     File's write() takes the string and writes UTF-8). */

const DIR = "journal-export";

/** Today's ExportFormat: i18n's words, the reader's locale. */
export function exportFormat(): ExportFormat {
  const locale = localeTag();
  return {
    t,
    moodLabel,
    date: (iso) => new Date(iso).toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
    time: (iso) => time24(iso, { locale }),
    duration: fmtDuration,
  };
}

/** How many pages an export would hold (the reader's own, no samples). Rejects when the journal
    can't be read. */
export async function exportablePages(): Promise<number> {
  return exportPages(await readJournal()).length;
}

/** Write the journal's words to one Markdown file in the cache and say where it is; null when
    there is no page to export. Rejects when the journal can't be read or the file can't be
    written. */
export async function writeJournalExport(now: Date = new Date()): Promise<{ uri: string; pages: number } | null> {
  const { text, pages } = buildJournalExport(await readJournal(), now, exportFormat());
  if (!pages) return null;
  const dir = new Directory(Paths.cache, DIR);
  dir.create({ intermediates: true, idempotent: true });
  // the exports before this one: best-effort, a leftover is not worth failing the new one over
  for (const old of dir.list()) {
    try {
      old.delete();
    } catch (e) {
      console.warn("[journal-export] an earlier export wasn't cleared:", e);
    }
  }
  const file = new File(dir, exportFileName(now));
  file.write(text);
  return { uri: file.uri, pages };
}
