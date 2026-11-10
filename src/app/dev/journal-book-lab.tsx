import { ScrollView, Text } from "react-native";
import { Redirect } from "expo-router";
import { requireOptionalNativeModule } from "expo";
import { SafeAreaView } from "react-native-safe-area-context";
import { KGalleryHost, isKindredlyUIViewAvailable } from "../../../modules/kindredly-ui";
import { useTheme } from "../../lib/theme";

/* dev only — THE JOURNAL BOOK LAB (journal book, 2026-11-10).
   kindredly:///dev/journal-book-lab

   Every page template of the First Class journal book (the typeset A5 PDF of Notes), drawn by
   Swift from a sample book that is built into the binary: no journal, no account, no network.
   It is here so the pages can be looked at on a simulator before the export screen exists.

   The lab itself is Swift (modules/kindredly-ui/ios/Portable/Book/KBookLab.swift) and is shown
   through the gallery's Host with page="book", so it needed no native view of its own. On it:
   an ink-saver switch, a large-pages switch, the four Letter fonts (the book is paginated again
   for each), every template in rows that scroll sideways (opening and each month; words; photos,
   voice and film; the hard cases: CJK, right-to-left, one endless word, emoji alone, an empty
   page; the back cover), and MAKE THE PDF, which writes the sample book as a real PDF and offers
   it to the share sheet.

   A binary from before the book would ignore page="book" and draw the whole gallery, so this page
   asks the module first (hasJournalBook) and says so instead. The words are English, typed here
   and in Swift: a dev page. */

type BookNative = { hasJournalBook?: () => boolean };

function hasBook(): boolean {
  try {
    const native = requireOptionalNativeModule<BookNative>("KindredlyUI");
    return typeof native?.hasJournalBook === "function" && native.hasJournalBook() === true;
  } catch {
    return false;
  }
}

export default function JournalBookLab() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Lab />;
}

function Lab() {
  const { key, t: tk } = useTheme();
  const there = isKindredlyUIViewAvailable("KGalleryView") && hasBook();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tk.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {there ? (
          <KGalleryHost theme={key} page="book" />
        ) : (
          <Text style={{ fontSize: 15, lineHeight: 22, color: tk.ink, margin: 16 }}>
            The journal book is not in this build. Run pod install (new files in modules/kindredly-ui/ios/Portable/Book), then rebuild the dev client.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
