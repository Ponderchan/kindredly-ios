import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KJournalBookView, type KJournalBookRange } from "../../../modules/kindredly-ui/src/JournalBookScreen";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { t, useLang } from "../../lib/i18n";
import { useEntitlement } from "../../lib/entitlement";
import { exportBook, loadBook, rangesWithPages, useBookWren } from "../../lib/journal-book";
import { exportablePages, shareJournalExport } from "../../lib/journal-export-file";
import { BOOK_PAYWALL, BOOK_WRITE, bookKey, bookView, makeIntent, pickKind, rangeOf, type BookKind, type BookRanges, type BookSource } from "./journal-book-model";
import "../../data/strings-book-screen"; // bk.*
import "../../data/strings-audit-notes"; // set.export (the title)
import "../../data/strings-step5-kitrn"; // a11y.back
import "../../data/strings-make-face"; // mf.result.lock (the "1ST" tag)
import "../../data/strings-papers"; // pp.a11y.fc ("First Class", for VoiceOver)

/* THE JOURNAL BOOK'S EXPORT PAGE (journal book, 2026-11-10; .claude/journal-book/CONTRACT.md,
   "The export screen"). One Host holding KJournalBookView (ios/Portable/Book/
   KJournalBookScreen.swift); the route is app/journal-book, opened by Settings' "Export my
   journal" on a binary that has it. The rules are journal-book-model (pure, tested); this file
   is the reading, the navigation and the two exports.

   - THE BOOK. On every focus it asks which ranges have pages and loads the chosen one
     (src/lib/journal-book: the reader's own pages, never samples), then hands Swift the book as
     JSON with a key that changes only when the JSON does: coming back from the paywall or the
     composer with the same pages leaves the preview where it was, and a note written from here
     shows up when the reader returns. A read that fails is said (the page's own line, and a
     warning in the log), never drawn as an empty journal.
   - THE KEY. A member: exportBook (the PDF, then the share sheet), the key busy meanwhile, one
     at a time, a failure alerted. Anyone else: the paywall (/paywall?src=journal_book).
     Membership is the hook Settings reads (useEntitlement) and is refreshed whenever the page
     regains focus, so a reader who comes back from the paywall as a member can export at once.
     A tap before the membership answer is in waits for it instead of guessing.
   - JUST THE WORDS: the free text file, exactly Settings' export (lib/journal-export-file
     shareJournalExport: the one function both call).
   - WRITE A NOTE (the empty journal): the note composer, as Notes' + opens it.

   `source` and `member` are for the dev page (app/dev/journal-book): the same screen fed from
   the sample journal, and a membership it can force either way. */

const LIB: BookSource = { rangesWithPages, loadBook, exportBook };

export function JournalBookNative({ source = LIB, member }: { source?: BookSource; member?: boolean }) {
  const lang = useLang();
  const router = useRouter();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  // her back-cover picture is a snapshot of the real bird (lib/bird-images): keep it captured while
  // the page is up, so the book the key makes carries her (the lib reads the capture when it builds)
  useBookWren();
  const insets = useScreenInsets();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands(ref);
  const ent = useEntitlement();
  const premium = member ?? ent.premium;
  const settled = member !== undefined || ent.settled;
  const refreshEntitlement = ent.refresh;

  const [phase, setPhase] = useState<"loading" | "ready" | "failed">("loading");
  const [ranges, setRanges] = useState<BookRanges | null>(null);
  const [kind, setKind] = useState<BookKind>("year");
  const [book, setBook] = useState<{ key: string; json: string }>({ key: "", json: "" });
  const [inkSaver, setInkSaver] = useState(false);
  const [busy, setBusy] = useState(false);
  /** the key was tapped before the membership answer was in */
  const [waiting, setWaiting] = useState(false);
  const [wordsPages, setWordsPages] = useState<number | null>(null);

  const kindRef = useRef<BookKind>("year");
  const inkRef = useRef(false);
  const busyRef = useRef(false);
  const wordsRef = useRef(false);
  /** the newest load: an older one that answers late is dropped */
  const seq = useRef(0);
  const loadedOnce = useRef(false);

  const load = useCallback(
    async (want: BookKind, quiet = false) => {
      const mine = ++seq.current;
      // quiet: a re-read on coming back to the page; the preview stays as it is unless the book changed
      if (!quiet) setPhase("loading");
      try {
        const now = new Date();
        let has = await source.rangesWithPages(now);
        // a range that says it has pages and then gives no book is treated as empty, once each
        for (let tries = 0; tries < 2; tries++) {
          if (mine !== seq.current) return;
          const pick = pickKind(has, want);
          setRanges(has);
          if (!pick) {
            setPhase("ready"); // the empty state (journal-book-model bookView)
            return;
          }
          kindRef.current = pick;
          setKind(pick);
          const { book: made } = await source.loadBook(rangeOf(pick, now));
          if (mine !== seq.current) return;
          if (made && made.pages.length) {
            const json = JSON.stringify(made);
            const key = bookKey(json);
            setBook((b) => (b.key === key ? b : { key, json }));
            setPhase("ready");
            return;
          }
          console.warn(`[journal-book] the ${pick} range said it had pages and gave no book`);
          has = { ...has, [pick]: false };
        }
        setRanges(has);
        setPhase("ready");
      } catch (e) {
        console.warn("[journal-book] the book wasn't loaded:", e);
        if (mine === seq.current) setPhase("failed");
      }
    },
    [source],
  );

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      // the first read shows the page's loading state; a return to the page re-reads quietly
      void load(kindRef.current, loadedOnce.current);
      loadedOnce.current = true;
      // First Class may have changed while the page was covered (the paywall)
      if (member === undefined) refreshEntitlement().catch((e) => console.warn("[journal-book] entitlement refresh:", e));
      exportablePages()
        .then((n) => alive && setWordsPages(n))
        .catch((e) => {
          console.warn("[journal-book] the journal wasn't counted for the words link:", e);
          if (alive) setWordsPages(null);
        });
      return () => {
        alive = false;
        seq.current++; // a load still out answers to nobody
      };
    }, [load, member, refreshEntitlement]),
  );

  const view = useMemo(
    () => bookView({ phase, ranges, kind, busy: busy || waiting, premium, settled, wordsPages }, t),
    // lang: every word is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, ranges, kind, busy, waiting, premium, settled, wordsPages, lang],
  );
  const strings = useSame(view.strings);
  const rev = useRev(strings, book.key);

  const back = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me/settings" as Href)), [router]);

  const onRange = useCallback(
    (next: KJournalBookRange) => {
      if (next === kindRef.current) return;
      kindRef.current = next;
      setKind(next);
      void load(next);
    },
    [load],
  );

  const onInkSaver = useCallback((on: boolean) => {
    inkRef.current = on;
    setInkSaver(on);
  }, []);

  const runExport = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await source.exportBook(rangeOf(kindRef.current, new Date()), inkRef.current);
    } catch (e) {
      console.warn("[journal-book] the book wasn't made:", e);
      Alert.alert(t("set.export"), t("bk.fail"));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [source]);

  const onMake = useCallback(() => {
    const intent = makeIntent({ settled, premium, busy: busyRef.current });
    if (intent === "export") void runExport();
    else if (intent === "paywall") router.push(BOOK_PAYWALL as Href);
    else if (intent === "wait") {
      setWaiting(true);
      refreshEntitlement().catch((e) => console.warn("[journal-book] entitlement refresh:", e));
    }
  }, [settled, premium, runExport, router, refreshEntitlement]);

  // the tap that waited: once the answer is in, do what it would have done
  useEffect(() => {
    if (!waiting || !settled) return;
    setWaiting(false);
    if (premium) void runExport();
    else router.push(BOOK_PAYWALL as Href);
  }, [waiting, settled, premium, runExport, router]);

  const onWords = useCallback(async () => {
    if (wordsRef.current || busyRef.current) return;
    wordsRef.current = true;
    try {
      // 0: no page of the reader's own (the link then goes)
      setWordsPages(await shareJournalExport());
    } catch (e) {
      console.warn("[journal-book] the journal's words weren't exported:", e);
      Alert.alert(t("set.export"), t("cp.fail.generic"));
    } finally {
      wordsRef.current = false;
    }
  }, []);

  const onWrite = useCallback(() => router.push(BOOK_WRITE as Href), [router]);

  return (
    <SurfaceHost>
      <KJournalBookView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        state={view.state}
        book={book.json}
        bookKey={book.key}
        range={kind}
        monthEnabled={view.monthEnabled}
        yearEnabled={view.yearEnabled}
        inkSaver={inkSaver}
        makeState={view.makeState}
        onBack={back}
        onRange={onRange}
        onInkSaver={onInkSaver}
        onMake={onMake}
        onWords={onWords}
        onWrite={onWrite}
      />
    </SurfaceHost>
  );
}

/** The same object while its content is the same, so an unrelated render sends Swift nothing. */
function useSame<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}
