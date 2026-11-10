import { useCallback, useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../lib/theme";
import { journalBookPageThere } from "../screens/journal-book/available";
import { JournalBookNative } from "../screens/journal-book/JournalBookNative";

/* THE JOURNAL BOOK (journal book, 2026-11-10; .claude/journal-book/CONTRACT.md): the page
   Settings' "Export my journal" opens. A preview of the reader's own book (their private Notes,
   typeset as an A5 PDF on this phone: nothing leaves it), this month or this year, an ink saver,
   the key that makes the PDF (First Class, or the book bought once; anyone else is offered both
   on a small sheet, or goes to the paywall when the store has no book to sell: 2026-11-10,
   lib/iap-book-core) and, one tap away, the free text file Settings always gave.

     /journal-book

   Swift only (KJournalBookView, ios/Portable/Book/KJournalBookScreen.swift), pushed over the tabs
   on the page colour like the album. Its one door, Settings' row, opens it only on a binary that
   can make the book and has this page (screens/journal-book/available); a binary without them
   that lands here anyway (a link) goes straight back, where the row still exports the text file.
   The screen itself is screens/journal-book/JournalBookNative. */

export default function JournalBook() {
  const router = useRouter();
  const { t: tk } = useTheme();
  const available = journalBookPageThere();

  const back = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me/settings")), [router]);

  useEffect(() => {
    if (available) return;
    console.log("[journal-book] this binary has no journal book page; leaving");
    back();
  }, [available, back]);

  if (!available) return <View style={{ flex: 1, backgroundColor: tk.bg }} />;

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <JournalBookNative />
    </View>
  );
}
