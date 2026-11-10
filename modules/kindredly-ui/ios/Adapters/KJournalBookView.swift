import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 THE JOURNAL BOOK'S EXPORT PAGE, AS REACT NATIVE SEES IT (journal book, 2026-11-10; contract
 .claude/journal-book/CONTRACT.md, "The export screen"). A screen view like every step-5 screen
 (KScreenProps.swift: theme, letterFont, insets, rev, commands), registered with ExpoUIView and
 the "command" AsyncFunction in KindredlyUIModule.swift, alone in one @expo/ui <Host>
 (SurfaceHost). This file turns records into Portable values and taps into events; the page is
 Portable/Book/KJournalBookScreen.swift and knows nothing of Expo. It takes no commands. This
 file imports ExpoUI, whose public Button, Text and Image would make bare names ambiguous, so
 nothing of that kind is written here.

 KJournalBookView (modules/kindredly-ui/src/JournalBookScreen.tsx,
 src/screens/journal-book/JournalBookNative.tsx)
 - strings: { title, backLabel, rangeMonth, rangeYear, rangeNote, pageOf, previewA11y, inkLabel,
   inkSub, make, making, lockTag, lockA11y, words, emptyLine, emptyKey, failedLine }
 - state: loading | ready | empty | failed (an unknown one reads as loading)
 - book: the JSON string of the contract's `Book` ("" while there is none); bookKey: a short
   string that changes whenever `book` does (the page paginates again only then)
 - range: month | year (anything else reads as year); monthEnabled, yearEnabled: that range has
   a page
 - inkSaver: Bool
 - makeState: idle | busy | locked (an unknown one reads as idle)
 Events: onJbBack {}, onJbRange { range: "month" | "year" }, onJbInkSaver { on }, onJbMake {},
 onJbWords {}, onJbWrite {}

 Nothing here is cached by rev: the content is a handful of strings and the book's JSON is
 handed on as it came (the page reads it off the main thread, once per bookKey).
 */

struct KJournalBookStringsRecord: Record {
  @Field var title: String = ""
  @Field var backLabel: String = ""
  @Field var rangeMonth: String = ""
  @Field var rangeYear: String = ""
  @Field var rangeNote: String = ""
  @Field var pageOf: String = ""
  @Field var previewA11y: String = ""
  @Field var inkLabel: String = ""
  @Field var inkSub: String = ""
  @Field var make: String = ""
  @Field var making: String = ""
  @Field var lockTag: String = ""
  @Field var lockA11y: String = ""
  @Field var words: String = ""
  @Field var emptyLine: String = ""
  @Field var emptyKey: String = ""
  @Field var failedLine: String = ""
}

final class KJournalBookViewProps: KScreenProps {
  @Field var strings: KJournalBookStringsRecord = KJournalBookStringsRecord()
  @Field var state: String = "loading"
  @Field var book: String = ""
  @Field var bookKey: String = ""
  @Field var range: String = "year"
  @Field var monthEnabled: Bool = true
  @Field var yearEnabled: Bool = true
  @Field var inkSaver: Bool = false
  @Field var makeState: String = "idle"

  var onJbBack = EventDispatcher()
  var onJbRange = EventDispatcher()
  var onJbInkSaver = EventDispatcher()
  var onJbMake = EventDispatcher()
  var onJbWords = EventDispatcher()
  var onJbWrite = EventDispatcher()

  private(set) lazy var actions: KJournalBookActions = {
    let a = KJournalBookActions()
    a.onBack = { [weak self] in self?.onJbBack() }
    a.onRange = { [weak self] index in self?.onJbRange(["range": index == 0 ? "month" : "year"]) }
    a.onInkSaver = { [weak self] on in self?.onJbInkSaver(["on": on]) }
    a.onMake = { [weak self] in self?.onJbMake() }
    a.onWords = { [weak self] in self?.onJbWords() }
    a.onWrite = { [weak self] in self?.onJbWrite() }
    return a
  }()

  var content: KJournalBookContent {
    let s = strings
    var c = KJournalBookContent()
    c.title = s.title
    c.backLabel = s.backLabel
    c.state = KJournalBookContent.State(rawValue: state) ?? .loading
    c.book = KJournalBookSource(key: bookKey, json: book)
    c.range = range == "month" ? 0 : 1
    c.rangeLabels = [s.rangeMonth, s.rangeYear]
    c.rangeEnabled = [monthEnabled, yearEnabled]
    c.rangeNote = s.rangeNote
    c.inkSaver = inkSaver
    c.pageOf = s.pageOf
    c.previewA11y = s.previewA11y
    c.inkLabel = s.inkLabel
    c.inkSub = s.inkSub
    c.key = KJournalBookContent.Key(rawValue: makeState) ?? .idle
    c.make = s.make
    c.making = s.making
    c.lockTag = s.lockTag
    c.lockA11y = s.lockA11y
    c.words = s.words
    c.emptyLine = s.emptyLine
    c.emptyKey = s.emptyKey
    c.failedLine = s.failedLine
    return c
  }
}

struct KJournalBookView: ExpoSwiftUI.View {
  @ObservedObject var props: KJournalBookViewProps

  var body: some View {
    let insets = props.insets
    return KJournalBookScreen(
      theme: props.kTheme,
      content: props.content,
      topInset: insets.top,
      bottomInset: max(insets.tabBarRoom, insets.bottom),
      actions: props.actions
    )
    .kScreenEnvironment(props)
  }
}
