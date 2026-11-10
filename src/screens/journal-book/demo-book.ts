import { demoJournal } from "../../data/demo";
import { existingFile, exportBook, loadBook, rangesWithPages, type BookOptions } from "../../lib/journal-book";
import type { JournalEntry } from "../../lib/journal";
import type { BookSource } from "./journal-book-model";

/* dev only — THE BOOK FROM THE SAMPLE JOURNAL (journal book, 2026-11-10).
   ───────────────────────────────────────────────────────────
   The export page (/journal-book) reads the reader's own journal, and a simulator usually has
   none. kindredly:///dev/journal-book opens the SAME screen (JournalBookNative) with this as its
   source: the product's own three calls (src/lib/journal-book: rangesWithPages, loadBook,
   exportBook, so the real builder buildBook, the real words in every language and the real PDF),
   handed data/demo demoJournal instead of the phone's journal.

   Two things differ from a reader's book, both only so the samples can be printed at all:
   - samples are never in a real book (their ids start "demo-": journal-export exportPages drops
     them), so here each sample's id is given a "dev-" prefix;
   - the sample photos are remote urls, which a book never draws (it reads files on this phone).
     With `labPhotos` each becomes the journal book lab's stand-in ("lab:<n>", a tinted block Swift
     draws without a file: KBookImages.isLab), so the photo layouts can be judged; without it the
     photo pages print their words alone, as a book does when a photo's file has gone.
   (Merged 2026-11-10: this file used to build its own simplified book, written before the model
   slice existed; it now goes through the real builder.) */

function devEntries(labPhotos: boolean): JournalEntry[] {
  return demoJournal({ store: false }).map((e) => {
    const page: JournalEntry = { ...e, id: "dev-" + e.id };
    if (!labPhotos || e.type !== "photo") return page;
    const media = (e.media?.length ? e.media : [e.mediaUri ?? ""]).map((_, i) => `lab:${i + 1}`);
    return { ...page, mediaUri: media[0], media };
  });
}

/** The dev page's source: the product's own calls over the sample journal. */
export function demoBookSource(letterFont: string, opts: { labPhotos?: boolean; wren?: string } = {}): BookSource {
  const base = (): BookOptions => ({
    entries: devEntries(!!opts.labPhotos),
    letterFont,
    wren: opts.wren,
    file: (uri) => (opts.labPhotos && uri.startsWith("lab:") ? uri : existingFile(uri)),
  });
  return {
    rangesWithPages: (now) => rangesWithPages(now, base()),
    loadBook: (range) => loadBook(range, base()),
    exportBook: (range, inkSaver) => exportBook(range, inkSaver, base()),
  };
}
