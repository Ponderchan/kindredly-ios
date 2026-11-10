// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE JOURNAL BOOK'S EXPORT PAGE (journal book, 2026-11-10; .claude/journal-book/CONTRACT.md, "The
 export screen"). Settings' "Export my journal" opens it (/journal-book). The journal is private
 and lives only on this phone; here the reader sees their own book before it is made, picks this
 month or this year, and either makes the PDF (First Class) or takes just the words (free, the
 text file Settings always gave).

   ‹              Journal book                   KBackBar, sticky
        ▏ ┌───────────────┐ ▕                    THE PREVIEW: the first printed pages of the
        ▏ │               │ ▕                    reader's own book (8 at most), each a
        ▏ │   the page    │ ▕                    KBookPageView, paging sideways. The centred page
        ▏ │               │ ▕                    is 62% of the screen's width (320 at most) and
        ▏ └───────────────┘ ▕                    its neighbours show at both edges. A page is
               PAGE 1 OF 42                      paper: a 1pt soft edge and the object's shadow
   [   This month   |   This year   ]            (rule B: the page purple one shade deeper, hard,
   No pages this month yet.                      no blur), never a black frame.
   ┌─────────────────────────────────────┐       "PAGE n OF N": mono, mute; N is the whole
   │ Save ink                        (○) │       book's printed page count, not the preview's.
   │ White pages. The colour stays in …  │       THE RANGE: Me's segmented control; a range with
   └─────────────────────────────────────┘       no page is dimmed and can't be chosen, and the
   ─────────────────────────────────────────     line under it says so (TS words it).
   (        Make my book        1ST      )       SAVE INK: Settings' switch row on its soft
              Just the words                     group; the preview redraws at once.
                                                 THE DOCK stays at the foot: the main key and,
 under it, the quiet link to the free text file.

 THE MAIN KEY, three states (TS decides which):
 - idle: the app's primary key (a capsule in ind, System 600 16, the mark in white; bg in
   Midnight, where white on its pale ind is under 3:1);
 - busy: the book is being written: a spinner before "Binding…", and the key takes no tap;
 - locked: the reader has neither First Class nor the book bought once (2026-11-10): the same
   key with the small wax-gold tag the app puts on locked things (Make-your-face's "1ST" on its
   Another key); the tap is TS's (its own two-way sheet, "Just the book" or First Class, drawn
   over this page by components/LeaveSheet; or the paywall when the store has no book to sell).
 While the book is still being read the key is dimmed and takes no tap.

 AN EMPTY JOURNAL (no page in either range): no preview, no range, no switch: one line and a
 "Write a note" key, and the words link only if there are words to take (older pages).
 A JOURNAL THAT COULD NOT BE READ (or a book this binary can't read as one): one line, no key;
 only the words link stays, the one thing left worth trying.

 WHO OWNS WHAT. TS reads the journal, builds the book (src/lib/journal-book) and sends it as the
 JSON string of the contract's `Book`, with a short `key` that changes whenever the JSON does;
 this page decodes and paginates it off the main thread (KBookRenderer.pages, the same call the
 PDF makes, so the preview and the file cannot disagree) every time the key changes. The range
 and the switch are held here so they answer the finger at once, reported to TS (onRange,
 onInkSaver), and follow TS when it sends another value. While TS reads another range the old
 pages stay, dimmed, until the new book arrives; the carousel then returns to its first page.

 - Themes: every colour is the theme's. The pages are paper and keep their own colours.
 - Dynamic Type: the chrome's words grow and wrap (the page scrolls under the dock when they
   need the room); the pages keep their print sizes, as a printed page does.
 - VoiceOver: the carousel is ONE adjustable element (its label is TS's, its value "Page n of
   N"; swipe up or down to turn the page); the range's parts are buttons, a part that can't be
   chosen is dimmed; the switch is a switch; the key says "First Class" when it is locked.
 - Reduce Motion: the neighbours don't shrink as they leave the centre, a page turned by
   VoiceOver jumps, the range's pill jumps (KMeSegmented).
 Every word is TS's, already in the reader's language.
 */

/// The book as TS sends it: the JSON of the contract's `Book`, and a short key that changes
/// whenever the JSON does. Two sources are the same book when their keys are (a year of pages is
/// a long string to compare on every body run).
public struct KJournalBookSource: Equatable, Sendable {
  public var key: String
  public var json: String

  public init(key: String = "", json: String = "") {
    self.key = key
    self.json = json
  }

  public static func == (a: KJournalBookSource, b: KJournalBookSource) -> Bool {
    a.key == b.key
  }
}

public struct KJournalBookContent: Equatable, Sendable {
  public enum State: String, Sendable {
    /// the journal is being read (first open, or another range): the last pages stay, dimmed
    case loading
    /// `book` is the chosen range's book
    case ready
    /// no page in either range: the line and the "Write a note" key
    case empty
    /// the journal could not be read: the line alone
    case failed
  }

  public enum Key: String, Sendable {
    case idle, busy, locked
  }

  public var title = ""
  public var backLabel = ""
  public var state: State = .loading
  public var book = KJournalBookSource()
  /// 0 this month, 1 this year
  public var range = 1
  /// the two parts' words, month then year
  public var rangeLabels: [String] = []
  /// the parts that have a page (month, year); a part without one can't be chosen
  public var rangeEnabled: [Bool] = [true, true]
  /// the line under the range when one of them has no page; "" for none
  public var rangeNote = ""
  public var inkSaver = false
  /// "PAGE {n} OF {total}", the two filled in here
  public var pageOf = ""
  /// VoiceOver's name for the carousel ("Your book, a preview")
  public var previewA11y = ""
  public var inkLabel = ""
  public var inkSub = ""
  public var key: Key = .idle
  public var make = ""
  /// the key's words while the book is written
  public var making = ""
  /// the wax-gold tag on a locked key ("1ST"); "" draws none
  public var lockTag = ""
  /// what VoiceOver adds to a locked key ("First Class")
  public var lockA11y = ""
  /// the quiet link under the key; "" draws none (no words to take)
  public var words = ""
  public var emptyLine = ""
  public var emptyKey = ""
  public var failedLine = ""

  public init() {}
}

public final class KJournalBookActions {
  public var onBack: () -> Void = {}
  /// the range was chosen: 0 this month, 1 this year
  public var onRange: (Int) -> Void = { _ in }
  public var onInkSaver: (Bool) -> Void = { _ in }
  /// the main key (TS: export for a member or the book's owner; for anyone else its sheet, or the paywall)
  public var onMake: () -> Void = {}
  /// the quiet link: the free text file
  public var onWords: () -> Void = {}
  /// the empty journal's key: write a note
  public var onWrite: () -> Void = {}

  public init() {}
}

public struct KJournalBookScreen: View {
  /// how many printed pages the preview shows
  static var previewPages: Int { 8 }
  /// the centred page's share of the screen's width, and its cap (an iPad, a phone on its side)
  static var pageShare: CGFloat { 0.62 }
  static var pageMax: CGFloat { 320 }
  /// between two pages
  static var gap: CGFloat { 14 }
  /// the page's shadow (a small object's: KKeepsakesScreen's tiles use 4, the cards 6)
  static var depth: CGFloat { 5 }

  private let theme: KTheme
  private let content: KJournalBookContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let actions: KJournalBookActions

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  /// the screen's width, measured
  @State private var width: CGFloat = 0
  /// the preview's pages (the first eight) and the whole book's count
  @State private var pages: [KBookRenderedPage] = []
  @State private var total = 0
  /// the book's key those pages were made from
  @State private var shownKey = ""
  /// the book could not be read as a book (a drift between TS and this binary)
  @State private var broken = false
  /// the centred page's index
  @State private var current: Int? = 0
  @State private var range: Int
  @State private var inkSaver: Bool

  public init(theme: KTheme, content: KJournalBookContent, topInset: CGFloat, bottomInset: CGFloat, actions: KJournalBookActions) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
    _range = State(initialValue: content.range)
    _inkSaver = State(initialValue: content.inkSaver)
  }

  private var pageWidth: CGFloat {
    guard width > 0 else { return 0 }
    return min((width * Self.pageShare).rounded(), Self.pageMax)
  }

  private var pageHeight: CGFloat { (pageWidth / KBookPageView.aspectRatio).rounded() }

  /// the pages on screen belong to another book than the one TS now holds, or TS is reading
  private var stale: Bool { content.state == .loading || shownKey != content.book.key }

  private var failed: Bool { content.state == .failed || (broken && content.state == .ready) }

  public var body: some View {
    VStack(spacing: 0) {
      Color.clear.frame(height: topInset)
      KBackBar(theme: theme, title: content.title, backLabel: content.backLabel, height: KBackBar<EmptyView>.stickyHeight, sticky: true) {
        actions.onBack()
      }
      if failed {
        notice(content.failedLine)
      } else if content.state == .empty {
        emptyJournal
      } else {
        ScrollView(.vertical) {
          VStack(spacing: 0) {
            preview
            controls
              .padding(.horizontal, 16)
              .padding(.top, 14)
          }
          .padding(.top, 4)
          .padding(.bottom, 16)
        }
        .scrollIndicators(.hidden)
        .scrollBounceBehavior(.basedOnSize)
        dock
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .background { theme.bg.ignoresSafeArea() }
    .onGeometryChange(for: CGFloat.self) { proxy in
      proxy.size.width
    } action: { newWidth in
      width = newWidth
    }
    .task(id: content.book.key) {
      await paginate(content.book)
    }
    // TS's value wins when it sends another one (the default range, once it knows which have pages)
    .onChange(of: content.range) { _, next in
      if range != next { range = next }
    }
    .onChange(of: content.inkSaver) { _, next in
      if inkSaver != next { inkSaver = next }
    }
    .onChange(of: range) { _, next in
      if next != content.range { actions.onRange(next) }
    }
  }

  // MARK: The preview

  @ViewBuilder
  private var preview: some View {
    let w = pageWidth
    let h = pageHeight
    VStack(spacing: 10) {
      if w <= 0 {
        Color.clear.frame(height: 1)
      } else if pages.isEmpty {
        // the book is being read: the page's place, so nothing below it moves when it arrives
        Rectangle()
          .fill(theme.soft)
          .frame(width: w, height: h)
          .padding(.top, 6)
          .padding(.bottom, Self.depth + 4)
          .accessibilityHidden(true)
      } else {
        carousel(width: w, height: h)
      }
      Text(pageLine)
        .kText(.monoSection)
        .foregroundStyle(theme.mute)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .frame(minHeight: 14)
        .padding(.horizontal, 16)
        // said by the carousel, as its value
        .accessibilityHidden(true)
    }
  }

  private func carousel(width w: CGFloat, height h: CGFloat) -> some View {
    let shrink = !reduceMotion
    let ink = inkSaver
    return ScrollView(.horizontal) {
      LazyHStack(alignment: .top, spacing: Self.gap) {
        ForEach(pages) { page in
          KBookPageView(page: page, inkSaver: ink)
            .frame(width: w, height: h)
            // paper on the page: a 1pt soft edge, and the object's depth
            .overlay(Rectangle().strokeBorder(theme.line, lineWidth: 1))
            .kObjectDepth(Rectangle(), theme: theme, offset: Self.depth)
            .scrollTransition(.interactive, axis: .horizontal) { view, phase in
              view.scaleEffect(phase.isIdentity || !shrink ? 1 : 0.94)
            }
        }
      }
      .scrollTargetLayout()
      .padding(.top, 6)
      .padding(.bottom, Self.depth + 4)
    }
    .contentMargins(.horizontal, max(0, (width - w) / 2), for: .scrollContent)
    .scrollTargetBehavior(.viewAligned)
    .scrollPosition(id: $current)
    .scrollIndicators(.hidden)
    .frame(height: h + 6 + Self.depth + 4)
    .opacity(stale ? 0.45 : 1)
    .animation(reduceMotion ? nil : .easeOut(duration: 0.2), value: stale)
    // one element: "Your book, a preview. Page 2 of 42." Swipe up or down turns the page.
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(content.previewA11y)
    .accessibilityValue(pageLine)
    .accessibilityAdjustableAction { direction in
      turn(direction == .increment ? 1 : -1)
    }
  }

  /// "PAGE 2 OF 42"; "" until the book has been paginated.
  private var pageLine: String {
    guard total > 0, !pages.isEmpty else { return "" }
    let n = min(max((current ?? 0) + 1, 1), pages.count)
    return content.pageOf
      .replacingOccurrences(of: "{n}", with: String(n))
      .replacingOccurrences(of: "{total}", with: String(total))
  }

  private func turn(_ by: Int) {
    guard !pages.isEmpty else { return }
    let next = min(max((current ?? 0) + by, 0), pages.count - 1)
    guard next != (current ?? 0) else { return }
    if reduceMotion {
      current = next
    } else {
      withAnimation(.easeInOut(duration: 0.3)) { current = next }
    }
  }

  // MARK: The range and the switch

  private var controls: some View {
    VStack(spacing: 14) {
      VStack(spacing: 8) {
        KMeSegmented(theme: theme, labels: Array(content.rangeLabels.prefix(2)), selection: $range, disabled: disabledRanges)
          .dynamicTypeSize(...DynamicTypeSize.accessibility2)
          .accessibilityElement(children: .contain)
        if !content.rangeNote.isEmpty {
          Text(content.rangeNote)
            .kText(.system(13, lineHeight: 1.4))
            .foregroundStyle(theme.mute)
            .multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity)
        }
      }
      SoftGroup(theme: theme) {
        SoftToggleRow(theme: theme, systemImage: nil, label: content.inkLabel, subtitle: content.inkSub, isOn: inkSaver, divider: false) { on in
          inkSaver = on
          actions.onInkSaver(on)
        }
      }
    }
  }

  private var disabledRanges: Set<Int> {
    var out = Set<Int>()
    for (i, enabled) in content.rangeEnabled.prefix(2).enumerated() where !enabled { out.insert(i) }
    return out
  }

  // MARK: The dock

  private var dock: some View {
    VStack(spacing: 2) {
      mainKey
      if !content.words.isEmpty {
        wordsLink
      }
    }
    .padding(.horizontal, 16)
    .padding(.top, 10)
    .padding(.bottom, max(bottomInset, 12))
    .frame(maxWidth: .infinity)
    .background(theme.bg)
    // a 1pt line where the page scrolls under the dock
    .overlay(alignment: .top) {
      Rectangle().fill(theme.line).frame(height: 1).accessibilityHidden(true)
    }
  }

  private var mainKey: some View {
    let busy = content.key == .busy
    let locked = content.key == .locked
    // nothing to make until the chosen range's own pages are on screen
    let live = content.state == .ready && !stale && !pages.isEmpty && !busy
    let mark = theme.isDark ? theme.bg : Color.white
    return SwiftUI.Button {
      actions.onMake()
    } label: {
      HStack(spacing: 10) {
        if busy {
          ProgressView().tint(mark)
        }
        Text(busy ? content.making : content.make)
          .kText(.system(16, .semibold))
          .foregroundStyle(mark)
          .lineLimit(2)
          .multilineTextAlignment(.center)
          .minimumScaleFactor(0.75)
        if locked && !busy && !content.lockTag.isEmpty {
          Text(content.lockTag)
            .kText(.mono(8, .semibold, tracking: 0.12))
            .foregroundStyle(KBrand.inkOnBrand)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(RoundedRectangle(cornerRadius: 6, style: .continuous).fill(KBrand.waxGold))
            .fixedSize()
            .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
        }
      }
      .padding(.horizontal, 16)
      .padding(.vertical, 6)
      .frame(maxWidth: .infinity, minHeight: 52)
    }
    .buttonStyle(KStickerButtonStyle(shape: Capsule(), fill: theme.ind))
    .disabled(!live)
    .opacity(live || busy ? 1 : 0.45)
    // the key's own words, then "First Class" where it is locked (never the tag's "1ST")
    .accessibilityLabel(busy ? content.making : content.make)
    .accessibilityValue(locked && !busy ? content.lockA11y : "")
  }

  private var wordsLink: some View {
    SwiftUI.Button {
      actions.onWords()
    } label: {
      Text(content.words)
        .kText(.system(15, .medium))
        .foregroundStyle(theme.sub)
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity, minHeight: 44)
        .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .disabled(content.key == .busy)
  }

  // MARK: Nothing to show

  /// No page this month or this year: one line and the way to write one.
  private var emptyJournal: some View {
    VStack(spacing: 0) {
      Spacer(minLength: 24)
      VStack(spacing: 20) {
        Text(content.emptyLine)
          .kText(.system(16, lineHeight: 1.45))
          .foregroundStyle(theme.sub)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
          .frame(maxWidth: 300)
        if !content.emptyKey.isEmpty {
          SwiftUI.Button {
            actions.onWrite()
          } label: {
            Text(content.emptyKey)
              .kText(.system(16, .semibold))
              .foregroundStyle(theme.isDark ? theme.bg : Color.white)
              .lineLimit(2)
              .multilineTextAlignment(.center)
              .minimumScaleFactor(0.75)
              .padding(.horizontal, 28)
              .padding(.vertical, 6)
              .frame(minHeight: 52)
          }
          .buttonStyle(KStickerButtonStyle(shape: Capsule(), fill: theme.ind))
        }
        if !content.words.isEmpty {
          wordsLink
        }
      }
      .padding(.horizontal, 24)
      Spacer(minLength: 24)
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .padding(.bottom, bottomInset)
  }

  /// The journal (or the book made from it) could not be read: the line, and the words link,
  /// which is the one thing left worth trying (its own failure is said by TS).
  private func notice(_ text: String) -> some View {
    VStack(spacing: 12) {
      Text(text)
        .kText(.system(16, lineHeight: 1.45))
        .foregroundStyle(theme.sub)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: 300)
      if !content.words.isEmpty {
        wordsLink
      }
    }
    .padding(.horizontal, 24)
    .padding(.top, 48)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
  }

  // MARK: Reading the book

  /// Decode and paginate the book TS sent, off the main thread, and keep the first pages. A JSON
  /// this binary can't read as a book is said (print, and the failed line), never drawn as an
  /// empty book.
  private func paginate(_ source: KJournalBookSource) async {
    guard !source.json.isEmpty else {
      // no book yet (the journal is being read, or it is empty): keep what is on screen
      return
    }
    let json = source.json
    let limit = Self.previewPages
    let work = Task.detached(priority: .userInitiated) { () -> Result<(pages: [KBookRenderedPage], total: Int), Error> in
      do {
        let book = try KBook.decode(json: json)
        let all = KBookRenderer.pages(book: book)
        return .success((Array(all.prefix(limit)), all.count))
      } catch {
        return .failure(error)
      }
    }
    let result = await withTaskCancellationHandler {
      await work.value
    } onCancel: {
      work.cancel()
    }
    // another book was sent while this one was being read
    if Task.isCancelled { return }
    switch result {
    case let .success(made):
      broken = made.pages.isEmpty
      pages = made.pages
      total = made.total
      current = made.pages.first?.index
    case let .failure(error):
      print("[journal-book] the book TS sent could not be read: \((error as? LocalizedError)?.errorDescription ?? String(describing: error))")
      broken = true
      pages = []
      total = 0
      current = 0
    }
    shownKey = source.key
  }
}
