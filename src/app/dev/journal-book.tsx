import { useMemo } from "react";
import { Text, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLetterFont, useTheme } from "../../lib/theme";
import { journalBookPageThere } from "../../screens/journal-book/available";
import { demoBookSource } from "../../screens/journal-book/demo-book";
import { JournalBookNative } from "../../screens/journal-book/JournalBookNative";

/* dev only — THE JOURNAL BOOK'S EXPORT PAGE ON THE SAMPLE JOURNAL (journal book, 2026-11-10).

     kindredly:///dev/journal-book              membership as the account has it
     kindredly:///dev/journal-book?member=1     as a First Class member: the key makes the PDF
     kindredly:///dev/journal-book?member=0     as anyone else: the key carries 1ST and opens the paywall
     kindredly:///dev/journal-book?photos=lab   the sample photos as the lab's tinted stand-ins

   The real page (/journal-book) reads the reader's own journal, and a simulator usually has none.
   This opens the SAME screen (screens/journal-book/JournalBookNative: the same Swift page, the
   same events, the same PDF renderer and share sheet), fed from data/demo demoJournal through
   screens/journal-book/demo-book instead of src/lib/journal-book. So the whole flow can be
   walked: the preview, this month / this year, the ink saver, the key in its three states, the
   paywall and back.

   Two things are NOT the sample's: "Just the words" is the real text export (Settings' own
   function), so it exports the account's real journal and is hidden when that is empty; and
   "Write a note" opens the real composer. The sample's photos are remote urls and are passed
   through as they are: the book lays a page out without the photos it can't read from this
   phone (KBookRenderer reads files only), so the photo page prints its words alone, unless
   ?photos=lab swaps in the stand-ins the journal book lab uses. Every sample page is dated within the last days, so near the 1st
   of a month "This month" may be empty and dimmed, which is that state's check. */

export default function DevJournalBook() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Page />;
}

function Page() {
  const { t: tk } = useTheme();
  const letterFont = useLetterFont();
  const { member, photos } = useLocalSearchParams<{ member?: string; photos?: string }>();
  const labPhotos = photos === "lab";
  const source = useMemo(() => demoBookSource(letterFont, { labPhotos }), [letterFont, labPhotos]);
  const forced = member === "1" ? true : member === "0" ? false : undefined;

  if (!journalBookPageThere()) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tk.bg }}>
        <Text style={{ fontSize: 15, lineHeight: 22, color: tk.ink, margin: 16 }}>
          The journal book's page is not in this build. Run pod install (new files in modules/kindredly-ui/ios: Portable/Book/KJournalBookScreen.swift, Adapters/KJournalBookView.swift), then rebuild the dev client.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <JournalBookNative source={source} member={forced} />
    </View>
  );
}
