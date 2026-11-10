import { requireNativeView } from "expo";
import { forwardRef, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KInsets, KScreenBaseProps, KScreenHandle } from "./types";

/* THE JOURNAL BOOK'S EXPORT PAGE, drawn by SwiftUI (journal book, 2026-11-10; contract
   .claude/journal-book/CONTRACT.md, "The export screen"): ios/Portable/Book/
   KJournalBookScreen.swift, adapter ios/Adapters/KJournalBookView.swift, for
   src/screens/journal-book/JournalBookNative.tsx (the route /journal-book).

   TS reads the journal, builds the book and words everything; Swift paginates the book it is
   handed, draws the preview and reports taps. It is a whole screen: alone in one @expo/ui
   <Host style={{flex:1}}> (SurfaceHost), and only after
   isKindredlyUIViewAvailable("KJournalBookView") says this binary has it (a binary with the book's
   renderer and not this view keeps Settings' plain text export). */

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;

/** which book: the calendar month or the calendar year of now */
export type KJournalBookRange = "month" | "year";

/** loading: the journal is being read (the last pages stay, dimmed); ready: `book` is the chosen
    range's book; empty: no page in either range; failed: the journal could not be read */
export type KJournalBookState = "loading" | "ready" | "empty" | "failed";

/** the main key: idle, busy (the PDF is being written) or locked (not First Class: the wax-gold
    tag, and the tap is the paywall's) */
export type KJournalBookMakeState = "idle" | "busy" | "locked";

export type KJournalBookStrings = {
  title: string;
  /** VoiceOver for the back chevron */
  backLabel: string;
  rangeMonth: string;
  rangeYear: string;
  /** the line under the range when one of them has no page; "" for none */
  rangeNote: string;
  /** "PAGE {n} OF {total}": Swift fills in the two numbers */
  pageOf: string;
  /** VoiceOver's name for the carousel */
  previewA11y: string;
  inkLabel: string;
  inkSub: string;
  make: string;
  /** the key's words while the book is written */
  making: string;
  /** the wax-gold tag on a locked key ("1ST") */
  lockTag: string;
  /** what VoiceOver adds to a locked key ("First Class") */
  lockA11y: string;
  /** the quiet link under the key; "" draws none */
  words: string;
  emptyLine: string;
  emptyKey: string;
  failedLine: string;
};

export type KJournalBookViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KJournalBookStrings;
    state: KJournalBookState;
    /** JSON.stringify of the contract's `Book`; "" while there is none */
    book: string;
    /** changes whenever `book` does: Swift paginates again only when this changes */
    bookKey: string;
    range: KJournalBookRange;
    /** that range has a page (a range without one can't be chosen) */
    monthEnabled: boolean;
    yearEnabled: boolean;
    inkSaver: boolean;
    makeState: KJournalBookMakeState;
    onBack?: () => void;
    onRange?: (range: KJournalBookRange) => void;
    onInkSaver?: (on: boolean) => void;
    /** the main key */
    onMake?: () => void;
    /** the quiet link: the free text file */
    onWords?: () => void;
    /** the empty journal's key */
    onWrite?: () => void;
  };

type NativeProps = Omit<KJournalBookViewProps, "letterFont" | "insets" | "rev" | "onBack" | "onRange" | "onInkSaver" | "onMake" | "onWords" | "onWrite"> &
  Required<Pick<KJournalBookViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    onJbBack?: None;
    onJbRange?: Ev<{ range: string }>;
    onJbInkSaver?: Ev<{ on: boolean }>;
    onJbMake?: None;
    onJbWords?: None;
    onJbWrite?: None;
  };

const NativeKJournalBookView = requireNativeView<NativeProps>("KindredlyUI", "KJournalBookView");

/** The bare SwiftUI export page. Only inside an @expo/ui <Host>. */
export const KJournalBookView = forwardRef<KScreenHandle, KJournalBookViewProps>(function KJournalBookView(
  { modifiers, letterFont, insets, rev, onBack, onRange, onInkSaver, onMake, onWords, onWrite, ...rest },
  ref,
) {
  return (
    <NativeKJournalBookView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      onJbBack={onBack ? () => onBack() : undefined}
      onJbRange={onRange ? (e) => onRange(e.nativeEvent.range === "month" ? "month" : "year") : undefined}
      onJbInkSaver={onInkSaver ? (e) => onInkSaver(e.nativeEvent.on === true) : undefined}
      onJbMake={onMake ? () => onMake() : undefined}
      onJbWords={onWords ? () => onWords() : undefined}
      onJbWrite={onWrite ? () => onWrite() : undefined}
    />
  );
});
