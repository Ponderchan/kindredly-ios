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
import { iapBookProduct, iapBuyBook } from "../../lib/iap";
import { track } from "../../lib/track";
import { LeaveSheet } from "../../components/LeaveSheet";
import { exportBook, loadBook, rangesWithPages, useBookWren } from "../../lib/journal-book";
import { exportablePages, shareJournalExport } from "../../lib/journal-export-file";
import {
  BOOK_PAYWALL,
  BOOK_TRACK_FARE,
  BOOK_TRACK_SOURCE,
  BOOK_WRITE,
  afterBuy,
  bookChoice,
  bookKey,
  bookView,
  makeIntent,
  pickKind,
  rangeOf,
  type BookBuyResult,
  type BookKind,
  type BookOffer,
  type BookRanges,
  type BookSource,
  type BookStore,
  type MakeIntent,
} from "./journal-book-model";
import "../../data/strings-book-screen"; // bk.*
import "../../data/strings-book-buy"; // bkb.* (the two-way sheet)
import "../../data/strings-audit-notes"; // set.export (the title)
import "../../data/strings-step5-kitrn"; // a11y.back
import "../../data/strings-make-face"; // mf.result.lock (the "1ST" tag), mf.notNow (the sheet's way out)
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
   - THE KEY. A member, or someone who bought the book once: exportBook (the PDF, then the share
     sheet), the key busy meanwhile, one at a time, a failure alerted. Anyone else: the two-way
     sheet below, or the paywall (/paywall?src=journal_book) when the store has no book to sell.
     Membership is the hook Settings reads (useEntitlement: premium, bookOwned) and is refreshed
     whenever the page regains focus, so a reader who comes back from the paywall as a member
     can export at once. A tap before the membership answer is in waits for it instead of
     guessing.
   - THE SMALLER DOOR (new feature, 2026-11-10; lib/iap-book-core): the book bought once, a
     non-consumable. On every focus the page asks the store whether it sells it (lib/iap
     iapBookProduct: the real product with its localized price, or null). With a product in
     hand, a tap by someone who has neither raises the app's own sheet (components/LeaveSheet,
     the iOS-native face every confirm wears): "Just the book" at the store's price, or First
     Class (the paywall, as before). Buying happens right there (the system's purchase sheet;
     the key shows "…" meanwhile): bought → the sheet goes, the lock goes, and the book is made
     at once; backed out → the sheet stays as it was, no word said; failed → one plain alert.
     With no product the sheet never exists and the tap is the paywall's, exactly as before, so
     the page is right before the owner has created the product and on any build where the
     store doesn't answer. No price is ever written here: it is the store's string.
     The money events are the paywall's own (lib/track purchase_started / _done / _failed),
     with source "journal_book" and fare "book"; gate_hit counts the sheet's showings.
   - JUST THE WORDS: the free text file, exactly Settings' export (lib/journal-export-file
     shareJournalExport: the one function both call).
   - WRITE A NOTE (the empty journal): the note composer, as Notes' + opens it.

   `source`, `member`, `owned` and `store` are for the dev page (app/dev/journal-book): the same
   screen fed from the sample journal, a membership and a bought book it can force, and a fake
   store (a made-up product whose price label says it is one). The real route passes none of
   them, so a fake product can never reach a reader. */

const LIB: BookSource = { rangesWithPages, loadBook, exportBook };
/** the App Store, through RevenueCat */
const STORE: BookStore = { product: iapBookProduct, buy: iapBuyBook };

export function JournalBookNative({
  source = LIB,
  member,
  owned,
  store = STORE,
}: {
  source?: BookSource;
  /** dev: First Class forced on or off */
  member?: boolean;
  /** dev: the book bought once, forced on or off */
  owned?: boolean;
  /** dev: where the book's product comes from and how it is bought */
  store?: BookStore;
}) {
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
  /** dev: the account's own answers are not read at all */
  const forced = member !== undefined || owned !== undefined;
  const premium = member ?? (forced ? false : ent.premium);
  const settled = forced || ent.settled;
  const refreshEntitlement = ent.refresh;
  /** the purchase went through on this page: the lock goes now, before RevenueCat is re-read */
  const [bought, setBought] = useState(false);
  const bookOwned = (owned ?? (forced ? false : ent.bookOwned)) || bought;
  /** the book as the store sells it: undefined until it has answered, null when it sells none */
  const [offer, setOffer] = useState<BookOffer | null | undefined>(undefined);
  /** the two-way sheet is up */
  const [choosing, setChoosing] = useState(false);
  /** the system's purchase sheet is up (or about to be) */
  const [buying, setBuying] = useState(false);

  const [phase, setPhase] = useState<"loading" | "ready" | "failed">("loading");
  const [ranges, setRanges] = useState<BookRanges | null>(null);
  const [kind, setKind] = useState<BookKind>("year");
  const [book, setBook] = useState<{ key: string; json: string }>({ key: "", json: "" });
  const [inkSaver, setInkSaver] = useState(false);
  const [busy, setBusy] = useState(false);
  /** the key was tapped before the membership answer (or the store's, about the book) was in */
  const [waiting, setWaiting] = useState(false);
  const [wordsPages, setWordsPages] = useState<number | null>(null);

  const kindRef = useRef<BookKind>("year");
  const inkRef = useRef(false);
  const busyRef = useRef(false);
  const wordsRef = useRef(false);
  const offerRef = useRef<BookOffer | null | undefined>(undefined);
  offerRef.current = offer;
  const buyingRef = useRef(false);
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
      if (!forced) refreshEntitlement().catch((e) => console.warn("[journal-book] entitlement refresh:", e));
      // whether the store sells the book once (the smaller door); a product already in hand is kept
      if (!offerRef.current) {
        store
          .product()
          .then((p) => alive && setOffer(p))
          .catch((e) => {
            console.warn("[journal-book] the book's product wasn't read:", e);
            if (alive) setOffer(null);
          });
      }
      exportablePages()
        .then((n) => alive && setWordsPages(n))
        .catch((e) => {
          console.warn("[journal-book] the journal wasn't counted for the words link:", e);
          if (alive) setWordsPages(null);
        });
      return () => {
        alive = false;
        seq.current++; // a load still out answers to nobody
        setWaiting(false); // a tap that was waiting for an answer doesn't act after the page was left
      };
    }, [load, forced, refreshEntitlement, store]),
  );

  const view = useMemo(
    () => bookView({ phase, ranges, kind, busy: busy || waiting, premium, bookOwned, settled, wordsPages }, t),
    // lang: every word is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, ranges, kind, busy, waiting, premium, bookOwned, settled, wordsPages, lang],
  );
  const choice = useMemo(
    () => (offer ? bookChoice(offer, t) : null),
    // lang: every word is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [offer, lang],
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

  /** what a tap comes to, once nothing is left to wait for */
  const act = useCallback(
    (intent: MakeIntent) => {
      if (intent === "export") void runExport();
      else if (intent === "paywall") router.push(BOOK_PAYWALL as Href);
      else if (intent === "choose") {
        setChoosing(true);
        if (!store.dev) track("gate_hit", { source: BOOK_TRACK_SOURCE });
      }
    },
    [runExport, router, store],
  );

  const onMake = useCallback(() => {
    const intent = makeIntent({ settled, premium, bookOwned, busy: busyRef.current, offer });
    if (intent !== "wait") return act(intent);
    setWaiting(true);
    if (!settled && !forced) refreshEntitlement().catch((e) => console.warn("[journal-book] entitlement refresh:", e));
  }, [settled, premium, bookOwned, offer, act, forced, refreshEntitlement]);

  // the tap that waited (for the membership answer, then for the store's): once both are in,
  // do what it would have done
  useEffect(() => {
    if (!waiting) return;
    const intent = makeIntent({ settled, premium, bookOwned, busy: false, offer });
    if (intent === "wait") return;
    setWaiting(false);
    act(intent);
  }, [waiting, settled, premium, bookOwned, offer, act]);

  /* THE SHEET'S FIRST KEY: buy the book, here. One at a time; the key shows "…" until the
     store has answered. */
  const onBuyBook = useCallback(async () => {
    const o = offerRef.current;
    if (!o || buyingRef.current) return;
    buyingRef.current = true;
    setBuying(true);
    const counted = !store.dev;
    if (counted) track("purchase_started", { source: BOOK_TRACK_SOURCE, fare: BOOK_TRACK_FARE, price: o.priceString });
    let res: BookBuyResult;
    try {
      res = await store.buy(o);
    } catch (e) {
      console.warn("[journal-book] buying the book:", e);
      res = { ok: false, error: "purchase-failed" };
    }
    buyingRef.current = false;
    setBuying(false);
    const next = afterBuy(res);
    if (next === "export") {
      if (counted) track("purchase_done", { source: BOOK_TRACK_SOURCE, fare: BOOK_TRACK_FARE, price: o.priceString });
      setBought(true);
      setChoosing(false);
      // so every other screen knows it too (and the next visit to this one)
      if (!forced) refreshEntitlement().catch((e) => console.warn("[journal-book] entitlement refresh after the purchase:", e));
      void runExport();
    } else if (next === "alert") {
      if (counted) track("purchase_failed", { source: BOOK_TRACK_SOURCE, fare: BOOK_TRACK_FARE });
      Alert.alert(t("pw.purchase.title"), t("pw.purchase.fail"));
    }
    // "nothing": the reader backed out of the store's sheet; ours stays as it was
  }, [store, forced, refreshEntitlement, runExport]);

  /* THE SHEET'S SECOND KEY: First Class, the page a tap opened before the sheet existed. */
  const onFirstClass = useCallback(() => {
    if (buyingRef.current) return;
    setChoosing(false);
    router.push(BOOK_PAYWALL as Href);
  }, [router]);

  const closeChoice = useCallback(() => {
    if (!buyingRef.current) setChoosing(false);
  }, []);

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
    <>
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
      {/* the two-way sheet: only ever with a product the store priced (or the dev page's fake) */}
      {choice ? (
        <LeaveSheet
          open={choosing}
          title={choice.title}
          body={choice.body}
          cancelLabel={choice.cancel}
          onCancel={closeChoice}
          actions={[
            { label: choice.book, kind: "primary", busy: buying, onPress: () => void onBuyBook() },
            { label: choice.firstClass, kind: "quiet", onPress: onFirstClass },
          ]}
        />
      ) : null}
    </>
  );
}

/** The same object while its content is the same, so an unrelated render sends Swift nothing. */
function useSame<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}
