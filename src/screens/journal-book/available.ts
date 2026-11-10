import { isKindredlyUIViewAvailable } from "../../../modules/kindredly-ui/src/available";
import { hasJournalBook } from "../../../modules/kindredly-ui/src/JournalBook";

/* WHETHER THIS BINARY HAS THE JOURNAL BOOK'S PAGE (journal book, 2026-11-10).
   Two things have to be in the binary before Settings' "Export my journal" may open /journal-book:
   the renderer that makes the PDF (hasJournalBook, the module function) and the Swift page that
   previews it (KJournalBookView). JavaScript travels over the air to binaries that have neither,
   or only the first (a build from between the two commits), so the row asks for both; without
   them it keeps doing exactly what it did: the text file, straight to the share sheet. */

export const JOURNAL_BOOK_ROUTE = "/journal-book";
export const JOURNAL_BOOK_VIEW = "KJournalBookView";

export function journalBookPageThere(): boolean {
  return hasJournalBook() && isKindredlyUIViewAvailable(JOURNAL_BOOK_VIEW);
}
