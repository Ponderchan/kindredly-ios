import { useMemo } from "react";
import { View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useLetterFont, useTheme } from "../../lib/theme";
import { demoJournal } from "../../data/demo";
import { existingFile, exportBook, loadBook, rangesWithPages, type BookOptions } from "../../lib/journal-book";
import type { JournalEntry } from "../../lib/journal";
import { JournalBookNative } from "../../screens/journal-book/JournalBookNative";
import type { BookSource } from "../../screens/journal-book/journal-book-model";

/* dev only — A VERY LONG JOURNAL, TO TIME THE BOOK (journal book, 2026-11-10).

     kindredly:///dev/journal-book-big            365 pages across this year
     kindredly:///dev/journal-book-big?n=800      that many
     kindredly:///dev/journal-book-big?photos=0   no photo pages (text only)

   The owner asked how the book behaves for someone who has written for a year. This opens the
   real export page as a member, over a journal made by repeating the sample pages across the
   year's days (one or more a day), with the lab's stand-in photos, and prints in the Metro log how
   long the preview's book and the PDF took and how many sheets it came to. Nothing here is the
   product's: the pages are the product's own builder and renderer, only the journal is invented. */

function longJournal(n: number, photos: boolean): JournalEntry[] {
  const samples = demoJournal({ store: false }).filter((e) => photos || e.type !== "photo");
  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1, 9, 0, 0).getTime();
  const span = Math.max(1, Date.now() - start);
  const out: JournalEntry[] = [];
  for (let i = 0; i < n; i++) {
    const s = samples[i % samples.length];
    const date = new Date(start + Math.floor((span * i) / n)).toISOString();
    // every seventh page is a long one, so continuation sheets are in the mix
    const body = i % 7 === 3 ? Array.from({ length: 6 }, () => s.body || "A long page, written slowly.").join(" ") : s.body;
    const page: JournalEntry = { ...s, id: `dev-big-${i}`, date, body };
    if (s.type === "photo") {
      const media = (s.media?.length ? s.media : [s.mediaUri ?? ""]).map((_, k) => `lab:${k + 1}`);
      out.push({ ...page, mediaUri: media[0], media });
    } else out.push(page);
  }
  return out;
}

export default function DevJournalBookBig() {
  const { t: tk } = useTheme();
  const letterFont = useLetterFont();
  const { n, photos } = useLocalSearchParams<{ n?: string; photos?: string }>();
  const count = Math.max(1, Math.min(2000, Number(n) || 365));
  const withPhotos = photos !== "0";
  const source = useMemo<BookSource>(() => {
    const entries = longJournal(count, withPhotos);
    const base = (): BookOptions => ({ entries, letterFont, file: (uri) => (uri.startsWith("lab:") ? uri : existingFile(uri)) });
    return {
      rangesWithPages: (now) => rangesWithPages(now, base()),
      loadBook: async (range) => {
        const t0 = Date.now();
        const r = await loadBook(range, base());
        console.log(`[book-big] built ${r.pages} journal pages → ${r.book.pages.length} model pages in ${Date.now() - t0} ms (${range.kind})`);
        return r;
      },
      exportBook: async (range, ink) => {
        const t0 = Date.now();
        const r = await exportBook(range, ink, base());
        console.log(`[book-big] exported ${r?.pages ?? 0} journal pages in ${Date.now() - t0} ms (includes the time the share sheet stayed open)`);
        return r;
      },
    };
  }, [count, withPhotos, letterFont]);
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <JournalBookNative source={source} member />
    </View>
  );
}
