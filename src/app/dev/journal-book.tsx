import { useMemo } from "react";
import { Text, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLetterFont, useTheme } from "../../lib/theme";
import { journalBookPageThere } from "../../screens/journal-book/available";
import { demoBookSource } from "../../screens/journal-book/demo-book";
import { JournalBookNative } from "../../screens/journal-book/JournalBookNative";
import type { BookStore } from "../../screens/journal-book/journal-book-model";

/* dev only — THE JOURNAL BOOK'S EXPORT PAGE ON THE SAMPLE JOURNAL (journal book, 2026-11-10).

     kindredly:///dev/journal-book              membership as the account has it
     kindredly:///dev/journal-book?member=1     as a First Class member: the key makes the PDF
     kindredly:///dev/journal-book?member=0     as anyone else: the key carries 1ST and opens the paywall
     kindredly:///dev/journal-book?photos=lab   the sample photos as the lab's tinted stand-ins

   THE BOOK BOUGHT ONCE (new feature, 2026-11-10; lib/iap-book-core), without the store:
     kindredly:///dev/journal-book?book=owned               not First Class, the book bought: no 1ST, the key makes the PDF
     kindredly:///dev/journal-book?member=0&product=fake    neither: the key carries 1ST and raises the two-way sheet;
                                                            "Just the book" goes through after a moment (the "…" key),
                                                            the sheet and the lock go, and the book is made at once
     …&product=fake&buy=cancel                              the reader backs out of the store's sheet: nothing changes
     …&product=fake&buy=fail                                the purchase fails: one alert, the sheet stays
   product=fake is a made-up product only this page can hand the screen (the real route has no
   such prop): its price label, "$0.00 (dev)", says what it is, nothing is charged, nothing
   reaches the store, and nothing it does is counted (lib/track). Without it the page asks the
   real store, which on a simulator has no book to sell: the key then opens the paywall, as it
   did before the book could be bought (that is the "not created yet" state's check).

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
  const { member, photos, book, product, buy } = useLocalSearchParams<{ member?: string; photos?: string; book?: string; product?: string; buy?: string }>();
  const labPhotos = photos === "lab";
  const source = useMemo(() => demoBookSource(letterFont, { labPhotos }), [letterFont, labPhotos]);
  const forced = member === "1" ? true : member === "0" ? false : undefined;
  const owned = book === "owned" ? true : undefined;
  const store = useMemo(() => (product === "fake" ? fakeStore(buy) : undefined), [product, buy]);

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
      <JournalBookNative source={source} member={forced} owned={owned} store={store} />
    </View>
  );
}

/** A store that sells a made-up book: the price label says it is one, a purchase takes a moment
    (so the busy key can be seen) and then goes through, is backed out of, or fails, as asked. */
function fakeStore(buy: string | undefined): BookStore {
  return {
    dev: true,
    product: async () => ({ productId: "dev.fake.journalbook", priceString: "$0.00 (dev)", raw: null }),
    buy: async () => {
      await new Promise((r) => setTimeout(r, 900));
      if (buy === "cancel") return { ok: false, cancelled: true };
      if (buy === "fail") return { ok: false, error: "dev: a failed purchase" };
      return { ok: true };
    },
  };
}
