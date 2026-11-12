// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE NOTES TAB (10a, H:50-55 and H:108-113, the fused "shrink, then hide" variant, with the owner's
 decisions), drawn by SwiftUI. Every word, date, label, month and VoiceOver line is TS's
 (src/screens/notes: notes-model builds them, useNotesModel holds the journal, the view, the
 calendar, the evening question, her line and the one voice player); this draws them and reports
 taps. Its own state is only what belongs to the gesture: how far the list has scrolled, whether
 the header is hidden, which note is on top.

   ▓ status bar (the page colour)
   NOTES                            [▤ Card] [▦]    the header (KNotesHeader): shrinks, then hides
   MOMENTS YOU'VE CHOSEN TO KEEP                    (above the top: a pull shows it)
   Wren's line · the evening question or its off row
   ┌ note ┐ ┌ note ┐ …                             Card (one column), Grid (rows of two), List
                                    ( [☺] OCT 14 )  the date chip while the header is hidden
   ░░░░░░░ bottom fade ░░░░░░░                      above the floating tab bar (its own Host)
   the calendar overlay over all of it, when open

 LAYOUT. The Host ignores every safe area, so the status bar's strip is drawn here (topInset),
 then a clipped area holds the ScrollView with the header over it — the header hides by sliding
 up under the clip, as the mock's does. The ScrollView keeps a fixed top margin of 74 + 12, so the
 first note rests 12 below the full header and the list scrolls under it; the header's shrinking
 never feeds back into the margins (that is what makes a shrinking header jitter). The bottom
 margin is the fade's height less 6 (KBottomFade.contentMargin), the fade being the tab bar's room
 + 78 (the mock's 176 on a 393 phone), so the last note ends where the fade begins. The scroll
 indicators are hidden, as they were.

 GRID is a waterfall (owner, 2026-10-20: side-by-side cards needn't line up, they should fill each
other's gaps): two columns, each card its own height, the next note going under whichever column
is shorter by an estimate of the cards' heights (KNotesScreen.masonry); at accessibility text sizes it is one
 column (the notes keep their Grid dress). Wren's line and the evening rows span the width.

 THE LIST IS A WINDOW. TS sends the first 60 notes and 60 more each time the list nears its end
 (actions.onReachEnd, once per window), so a long journal never crosses the bridge whole.

 SCROLL REQUESTS come from TS through the driver: the top (the tab pressed again), and a note
 (a calendar day: the list goes there with the note's top under the header). A note not yet in the
 window waits until it arrives. Every jump is settled: the rows it passed were only estimated, so
 it lands again without animation once they're laid out (spike pattern 3), unless the reader's
 finger or another jump came first. When the layout changes, the list goes back to the note that
 was on top — unless the reader is at the top (Wren's line or the evening rows on screen), where
 the list stays put and those rows stay in view.

 THE TOP NOTE (the date chip's day, the layout anchor) is the visible note earliest in the window,
 counted when any part of it is on screen: a page taller than the screen is still the one being
 read.

 Per-frame values live in KScrollModel (the shrink and the pull caption, capped at 44: nothing
 changes past the header's full shrink) and KNotesScrollState (hidden or not, the top note), read
 only by the header, the chip and the caption: the screen itself, and its LazyVStack, never redraw
 as the list scrolls.

 SEARCH (owner's audit, 2026-11-10; the row itself is KNotesHeader's). While the search row is up
 the notes TS sends are the pages that match what was typed — the same cards, opening the same
 pages — with Wren's line and the evening rows left out by TS; nothing matching is one quiet line
 where the first card would be. Each new query starts its results from the top; a drag on the
 list puts the keyboard away (the results under it can be reached). The list remembers what was
 on top when the row came up and goes back there when the field is emptied and when the row
 closes: the top of the list if the reader was at the top, otherwise that note under the header.
 */

/// The search row's words and state, from TS (owner's audit, 2026-11-10). No `button` word means a
/// bundle from before search: no key and no row.
public struct KNotesSearch: Equatable, Sendable {
  /// the header is the search row
  public var on = false
  /// what TS is filtering by (the field's own words live in the field; this seeds a rebuilt one)
  public var query = ""
  /// VoiceOver's name for the magnifier key
  public var button = ""
  public var placeholder = ""
  public var cancel = ""
  /// VoiceOver's name for the field's ⊗
  public var clear = ""
  /// the one line when nothing matches
  public var none = ""

  public init() {}

  /// this bundle knows search
  public var available: Bool { !button.isEmpty }
}

/// Every word of the screen that isn't on a note (TS's NotesStrings).
public struct KNotesStrings: Equatable, Sendable {
  public var title = ""
  public var justYou = ""
  public var viewA11y = ""
  public var viewCard = ""
  public var viewGrid = ""
  public var viewList = ""
  public var calendarA11y = ""
  public var prevMonth = ""
  public var nextMonth = ""
  public var close = ""
  public var moments = ""
  public var play = ""
  public var pause = ""
  public var emptyTitle = ""
  public var emptyBody = ""
  public var newLabel = ""
  public var textKey = ""
  public var voiceKey = ""
  /// the keys' words as drawn (upper case in the reader's locale)
  public var textKeyUpper = ""
  public var voiceKeyUpper = ""
  public var eveningAsk = ""
  public var eveningYes = ""
  public var eveningNo = ""
  public var eveningFoot = ""
  public var eveningOn = ""
  public var eveningOff = ""
  /// the calendar's seven weekday letters, from the language's first weekday
  public var weekdays: [String] = []
  /// Notes E1 (the empty page, KNotesEmpty): the question
  public var neTitle = ""
  /// the title once a mood is tapped, in KMoodGroup.allCases order (calm, happy, tired, low)
  public var neLines: [String] = []
  /// the draft card's grey follow-up, in the same order
  public var neAsks: [String] = []
  /// the draft card's time, as a Card's head row says it ("OCT 19 · 21:37")
  public var neTime = ""
  /// VoiceOver on the draft card
  public var neA11yCard = ""
  /// the four groups' names, in the same order (VoiceOver on the tiles)
  public var neGroupNames: [String] = []

  public init() {}

  /// The view button's name for a layout.
  public func viewLabel(_ layout: KNoteLayout) -> String {
    switch layout {
    case .card: return viewCard
    case .grid: return viewGrid
    case .list: return viewList
    }
  }
}

/// What the evening rows show.
public enum KNotesEvening: String, Sendable {
  case none
  case ask
  case on
}

/// Everything the screen shows, from TS.
public struct KNotesContent: Equatable, Sendable {
  public var strings = KNotesStrings()
  /// the window of notes TS sent, newest first
  public private(set) var notes: [KNote] = []
  /// a note's place in `notes`, by id
  public private(set) var index: [String: Int] = [:]
  /// more notes lie past the window
  public var hasMore = false
  /// no notes at all: the empty state
  public var empty = false
  public var layout: KNoteLayout = .card
  public var calendarOpen = false
  /// the calendar button's six squares (fewer leave the rest empty)
  public var recentGroups: [KMoodGroup] = []
  /// her first-visit line; "" when it doesn't show
  public var wrenLine = ""
  /// the line is Notes E1's one-time "first one down…" (KNotesFirstLine, the Letter font)
  public var wrenFirst = false
  /// her bird at 22 and 26 (the 'content' snapshot); nil until it is captured
  public var bird: KImageRef?
  /// her mini bird at 18 (the off row)
  public var birdMini: KImageRef?
  public var evening: KNotesEvening = .none
  public var eveningBusy = false
  public var palette = KNotesEmptyPalette(keyText: .clear, keyVoice: .clear, tape: .clear, sticker: .clear)
  /// the search row (its words, whether it is up, what is being looked for)
  public var search = KNotesSearch()

  public init() {}

  /// Sets the window of notes and its index (build once per rev: it is O(n)).
  public mutating func setNotes(_ notes: [KNote], index: [String: Int]) {
    self.notes = notes
    self.index = index
  }

  /// The index for a window of notes (the first of a repeated id wins).
  public static func makeIndex(_ notes: [KNote]) -> [String: Int] {
    var out: [String: Int] = [:]
    out.reserveCapacity(notes.count)
    for (i, n) in notes.enumerated() where out[n.id] == nil { out[n.id] = i }
    return out
  }
}

/// Where the screen's taps go. One object for the life of the surface, so a card's closures never
/// make it unequal to itself. Set the closures once.
public final class KNotesActions {
  /// a note was tapped (or opened by VoiceOver), with its id
  public var onOpen: (String) -> Void = { _ in }
  /// the view button: TS moves to the next view
  public var onCycleView: () -> Void = {}
  /// the calendar button, the dim, escape: open (true) or close (false)
  public var onCalendarToggle: (Bool) -> Void = { _ in }
  /// a month chevron: -1 or +1
  public var onCalendarMonth: (Int) -> Void = { _ in }
  /// a calendar day with pages: its newest page's id
  public var onDayPick: (String) -> Void = { _ in }
  /// a voice note's play mark, or its VoiceOver action
  public var onToggleVoice: (String) -> Void = { _ in }
  /// the evening rows: "yes", "no" or "off"
  public var onEvening: (String) -> Void = { _ in }
  /// her line was tapped away
  public var onWrenLineDismiss: () -> Void = {}
  /// an empty-state key: "text" or "voice" (the old empty state; E1 has none)
  public var onCompose: (String) -> Void = { _ in }
  /// Notes E1: the draft card under a chosen mood, with its group ("calm" | "happy" | "tired" | "low")
  public var onEmptyWrite: (String) -> Void = { _ in }
  /// the list nears the end of the window and more notes lie past it
  public var onReachEnd: () -> Void = {}
  /// the magnifier key (true) or Cancel / escape (false): TS shows or hides the search row
  public var onSearch: (Bool) -> Void = { _ in }
  /// what the reader typed in the search field (every edit; "" from the ⊗)
  public var onSearchQuery: (String) -> Void = { _ in }

  public init() {}
}

/// What TS's commands reach: the calendar's month, the player's state, scroll requests. Observed by
/// the calendar and the voice rows, not by the list.
public final class KNotesDriver: ObservableObject {
  /// Where a scroll request goes.
  public enum ScrollTarget: Equatable, Sendable {
    case top
    case note(String)
  }

  struct ScrollRequest: Equatable {
    let target: ScrollTarget
    let animated: Bool
    let serial: Int
  }

  @Published public private(set) var month: KNotesMonth?
  @Published public private(set) var playback: KNotesPlayback?
  @Published private(set) var scrollRequest: ScrollRequest?
  /// the page just sealed, popping in (TS's 'popIn' command); nil once it has
  @Published private(set) var fresh: KNoteFresh?
  /// The search field's handle: as long-lived as the view, so the field is blurred by command
  /// (TS's 'blur', before a page is pushed over a keyboard) and by the adapter before the view goes.
  public let searchField = KFieldController()

  private var serial = 0

  public init() {}

  /// The calendar's month (TS's 'month' command).
  public func setMonth(_ month: KNotesMonth?) {
    if month != self.month { self.month = month }
  }

  /// The one player's state (TS's 'playback' command); nil when nothing is loaded.
  public func setPlayback(_ playback: KNotesPlayback?) {
    if playback != self.playback { self.playback = playback }
  }

  /// Scrolls to the top or to a note (TS's 'scrollTo' command).
  public func scroll(to target: ScrollTarget, animated: Bool = true) {
    serial += 1
    scrollRequest = ScrollRequest(target: target, animated: animated, serial: serial)
  }

  /// The page just sealed pops into its place at the top of TODAY (TS's 'popIn' command, sent when
  /// the composer hands Notes back). Forgotten a moment after the pop, so a card the lazy list
  /// rebuilds while scrolling never pops again.
  public func popIn(_ id: String) {
    serial += 1
    let mark = KNoteFresh(id: id, serial: serial)
    fresh = mark
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
      if self?.fresh == mark { self?.fresh = nil }
    }
  }
}

/// One pop: the note and which request it was.
struct KNoteFresh: Equatable {
  let id: String
  let serial: Int
}

/// THE NEW CARD POPS IN (owner's Note Composer Bar, Prompt 4: "the new card pops in at the top of
/// TODAY"). Hidden at once, then, once the composer has slid away (.3s: the pop played under the
/// sliding page and nobody saw it, checked on a recording 2026-10-26), from 0.9 and clear to its
/// size on a soft spring (.45s), from its top edge; under Reduce Motion only the fade. `serial` 0 =
/// no pop. Runs whether the card was already drawn when the request came or is drawn just after it.
struct KNotePopIn: ViewModifier {
  /// the composer's slide down, which the pop waits out
  static let afterSheet = 0.3
  let serial: Int
  let reduceMotion: Bool
  @State private var scale: CGFloat = 1
  @State private var opacity: Double = 1

  func body(content: Content) -> some View {
    content
      .scaleEffect(scale, anchor: .top)
      .opacity(opacity)
      .onChange(of: serial, initial: true) { _, s in
        guard s > 0 else { return }
        var still = Transaction()
        still.disablesAnimations = true
        withTransaction(still) {
          scale = reduceMotion ? 1 : 0.9
          opacity = 0
        }
        DispatchQueue.main.async {
          withAnimation((reduceMotion ? Animation.easeOut(duration: 0.3) : .spring(response: 0.45, dampingFraction: 0.68)).delay(Self.afterSheet)) {
            scale = 1
            opacity = 1
          }
        }
      }
  }
}

/// What the screen keeps without drawing.
final class KNotesBox {
  var scrollSerial = 0
  /// a note asked for before it was in the window
  var pendingNote: (id: String, animated: Bool)?
  /// Grid (the waterfall): the cards on screen, as they report themselves, and what the list's own
  /// targets last reported (Wren's line, the evening rows); both read together
  var masonryVisible = Set<String>()
  /// where each card on screen is, in the list's coordinates (the date chip's day)
  var frames: [String: CGRect] = [:]
  var listVisible: [String] = []
  /// the window size the last reach-end was sent for (once per window)
  var reachedAt = -1
  /// bumped by every jump, so a settle pass left over from an earlier one does nothing
  var settleToken = 0
  /// Wren's line or the evening rows are on screen: the reader is at the top
  var extrasVisible = false
  /// where the list was when the search row came up: the note on top, nil for the top of the list
  var searchAnchor: String?
}

/// One row of the list: a note, or two side by side in Grid.
struct KNotesRow: Identifiable, Equatable {
  let id: String
  let notes: [KNote]
}

public struct KNotesScreen: View {
  /// the full header's height, and 12 under it to the first note (H:50, H:52)
  static let topMargin: CGFloat = KNotesHeaderBar.fullHeight + 12
  static let wrenId = "notes:wren"
  static let eveningId = "notes:evening"

  private let theme: KTheme
  private let content: KNotesContent
  private let topInset: CGFloat
  private let tabBarRoom: CGFloat
  private let driver: KNotesDriver
  private let actions: KNotesActions

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.accessibilityVoiceOverEnabled) private var voiceOver
  @Environment(\.dynamicTypeSize) private var typeSize
  /// Held in @State, not @StateObject: the screen keeps the models without observing them, so a
  /// scroll frame redraws only the small views that do.
  @State private var chrome = KScrollModel(offsetCap: 44)
  @State private var scrollState = KNotesScrollState()
  @State private var box = KNotesBox()
  /// the page just sealed (driver.fresh), while it pops in
  @State private var fresh: KNoteFresh?

  /* THE SPREAD (iPhone Duo's inner screen; the canvas's Notes: "月历页 | 当天那一页", "列表翻成一本
     摊开的日记"; owner, 2026-11-12: "要把整个屏都利用起来"). On a phone the month is an overlay
     behind the calendar button. While the window is two pages (KFold; this screen is then the
     whole window) the month has the left page to itself and the notes are the right page, as
     they are: a day tapped on the left takes the list on the right to that day's page. The
     header has no calendar button there, and the overlay is never raised. The right page stops
     at the system's band. An empty diary keeps its one page: there is no month to show. */
  @ObservedObject private var fold = KFold.shared

  /// - Parameters:
  ///   - topInset: the status bar's height (the Host ignores safe areas)
  ///   - tabBarRoom: the floating tab bar's room (0 where there is none)
  public init(theme: KTheme, content: KNotesContent, topInset: CGFloat, tabBarRoom: CGFloat, driver: KNotesDriver, actions: KNotesActions) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.tabBarRoom = tabBarRoom
    self.driver = driver
    self.actions = actions
  }

  /// the fade over the bottom: the tab bar's room + 78, never less than the mock's 176
  private var fadeHeight: CGFloat { max(KBottomFade.defaultHeight, tabBarRoom + 78) }

  /// the search row is the header (never on the empty page, never for a bundle without search)
  private var searching: Bool { content.search.available && content.search.on && !content.empty }

  public var body: some View {
    let spread = fold.frame.twoPages && !content.empty
    HStack(spacing: 0) {
      if spread {
        KNotesCalendar(theme: theme, strings: content.strings, topInset: topInset, driver: driver, actions: actions, page: true)
          .frame(width: fold.frame.crease)
      }
      notesPage(spread: spread)
        .frame(width: spread ? max(0, fold.frame.rightEnd - fold.frame.crease) : nil)
      if spread {
        Spacer(minLength: 0)
      }
    }
    .background { theme.bg.ignoresSafeArea() }
    .ignoresSafeArea(.keyboard)
  }

  private func notesPage(spread: Bool) -> some View {
    ZStack(alignment: .top) {
      VStack(spacing: 0) {
        // the status bar's strip: the page colour
        Color.clear.frame(height: topInset)
        ZStack(alignment: .top) {
          if content.empty {
            emptyBody
          } else {
            list
          }
          KNotesHeaderBar(
            theme: theme,
            strings: content.strings,
            layout: content.layout,
            calendarOpen: content.calendarOpen,
            showsCalendar: !spread,
            recentGroups: content.recentGroups,
            empty: content.empty,
            search: content.search,
            searchField: driver.searchField,
            chrome: chrome,
            state: scrollState,
            actions: actions
          )
        }
        .clipped()
      }

      if !content.empty {
        KNotesDateChip(theme: theme, lookup: chipInfo, state: scrollState)
          .padding(.top, topInset + 8)
      }

      VStack(spacing: 0) {
        Spacer(minLength: 0)
        KBottomFade(theme: theme, height: fadeHeight)
      }
      .allowsHitTesting(false)
      .accessibilityHidden(true)

      if content.calendarOpen && !content.empty && !spread {
        KNotesCalendar(theme: theme, strings: content.strings, topInset: topInset, driver: driver, actions: actions)
          .transition(reduceMotion ? .opacity : .opacity.combined(with: .scale(scale: 0.97, anchor: .top)))
          .zIndex(2)
      }
    }
    .animation(KMotion.notesCalendar, value: content.calendarOpen)
    .onAppear {
      scrollState.setVoiceOver(voiceOver)
      scrollState.setSearching(searching)
      scrollState.hideAt = content.layout == .card ? KNotesScrollState.hideAfter : 60
    }
    .onChange(of: searching) { _, on in scrollState.setSearching(on) }
    .onChange(of: content.layout) { _, layout in
      scrollState.hideAt = layout == .card ? KNotesScrollState.hideAfter : 60
    }
    .onChange(of: voiceOver) { _, on in scrollState.setVoiceOver(on) }
    .onChange(of: content.empty) { _, empty in
      if empty { scrollState.show() }
    }
  }

  private func chipInfo(_ id: String) -> (label: String, group: KMoodGroup, icon: String)? {
    guard let i = content.index[id], i < content.notes.count else { return nil }
    let n = content.notes[i]
    return (n.shortLabel, n.group, n.icon)
  }

  // ── the list ────────────────────────────────────────────────────────────

  /// Grid falls to one column at accessibility text sizes.
  private var columns: Int {
    content.layout == .grid && !typeSize.isAccessibilitySize ? 2 : 1
  }

  private var rows: [KNotesRow] {
    let notes = content.notes
    guard columns == 2 else { return notes.map { KNotesRow(id: $0.id, notes: [$0]) } }
    return stride(from: 0, to: notes.count, by: 2).map { i in
      KNotesRow(id: notes[i].id, notes: Array(notes[i..<min(i + 2, notes.count)]))
    }
  }

  /// the row that holds a note (in Grid, a note's row is its pair's first note)
  private func rowId(for noteId: String) -> String? {
    // every card carries its own id (Grid is a waterfall since 2026-10-20, no rows)
    guard content.index[noteId] != nil else { return nil }
    return noteId
  }

  private var list: some View {
    let rows = self.rows
    let bottom = KBottomFade.contentMargin(height: fadeHeight)
    return ScrollViewReader { proxy in
      ScrollView(.vertical) {
        LazyVStack(alignment: .leading, spacing: 12) {
          if !content.wrenLine.isEmpty {
            if content.wrenFirst {
              KNotesFirstLine(theme: theme, bird: content.bird, text: content.wrenLine) { actions.onWrenLineDismiss() }
                .id(Self.wrenId)
            } else {
              KNotesWrenLine(theme: theme, bird: content.bird, text: content.wrenLine) { actions.onWrenLineDismiss() }
                .id(Self.wrenId)
            }
          }
          eveningRow
          if searching && content.notes.isEmpty {
            // nothing matches: one quiet line where the first card would be
            Text(content.search.none)
              .kText(.system(15, lineHeight: 22.0 / 15.0))
              .foregroundStyle(theme.sub)
              .multilineTextAlignment(.center)
              .fixedSize(horizontal: false, vertical: true)
              .frame(maxWidth: .infinity)
              .padding(.horizontal, 24)
              .padding(.top, 48)
          } else if columns == 2 {
            masonry
          } else {
            ForEach(rows) { row in
              rowView(row)
                .id(row.id)
            }
          }
        }
        .scrollTargetLayout()
        .overlay(alignment: .topLeading) {
          KNotesPullCaption(theme: theme, text: content.strings.moments, chrome: chrome)
            .offset(x: 4, y: -22)
        }
        .padding(.horizontal, 16)
      }
      .scrollIndicators(.hidden)
      // the search field's keyboard goes when the reader takes the list (there is no other field here)
      .scrollDismissesKeyboard(.immediately)
      .contentMargins(.top, Self.topMargin, for: .scrollContent)
      .contentMargins(.bottom, bottom, for: .scrollContent)
      .kScrollChrome(chrome)
      .onScrollPhaseChange { _, phase in
        scrollState.phaseChanged(phase)
      }
      // any part on screen counts: a long page (whole on a Card) may never show 30% of itself
      .onScrollTargetVisibilityChange(idType: String.self, threshold: 0.01) { ids in
        box.listVisible = ids
        visibleChanged(columns == 2 ? ids + Array(box.masonryVisible) : ids)
      }
      // the header's hide rule, every frame, without redrawing anything but what it changes:
      // the offset clamped to where the list can rest, so neither end's bounce counts
      .onScrollGeometryChange(for: CGFloat.self) { geo in
        let y = geo.contentOffset.y + geo.contentInsets.top
        let end = max(0, geo.contentSize.height - geo.containerSize.height)
        return (min(max(y, 0), end) * 2).rounded() / 2
      } action: { _, y in
        scrollState.scrolled(to: y)
      }
      .onReceive(driver.$fresh) { fresh = $0 }
      .onReceive(driver.$scrollRequest) { request in
        guard let request, request.serial > box.scrollSerial else { return }
        box.scrollSerial = request.serial
        switch request.target {
        case .top:
          box.pendingNote = nil
          scroll(proxy, to: firstId(rows), animated: request.animated)
        case let .note(id):
          if let row = rowId(for: id) {
            box.pendingNote = nil
            scroll(proxy, to: row, animated: request.animated)
          } else {
            // not in the window yet: TS is sending it
            box.pendingNote = (id, request.animated)
          }
        }
      }
      .onChange(of: content.notes.count) { _, _ in
        guard let pending = box.pendingNote, let row = rowId(for: pending.id) else { return }
        box.pendingNote = nil
        // one turn later, so the new rows exist before the scroll looks for them
        DispatchQueue.main.async { scroll(proxy, to: row, animated: pending.animated) }
      }
      .onChange(of: columns) { _, _ in
        // a new layout: back to the note that was on top
        reanchor(proxy)
      }
      .onChange(of: content.layout) { _, _ in
        reanchor(proxy)
      }
      .onChange(of: searching) { _, on in
        if on {
          // where the reader was: the note on top, or the very top (Wren's line, the evening rows)
          box.searchAnchor = box.extrasVisible ? nil : scrollState.topNoteId
        } else {
          // the whole list is back (the same props brought it): back to where it was
          let anchor = box.searchAnchor
          box.searchAnchor = nil
          DispatchQueue.main.async { restore(proxy, to: anchor) }
        }
      }
      .onChange(of: content.search.query) { _, query in
        guard searching else { return }
        // one turn later, so the new rows exist
        if query.allSatisfy(\.isWhitespace) {
          // the field emptied (the ⊗, or deleted by hand): every page again, where the list was
          let anchor = box.searchAnchor
          DispatchQueue.main.async { restore(proxy, to: anchor) }
        } else {
          // a new query's results start from their top
          DispatchQueue.main.async { scroll(proxy, to: content.notes.first?.id, animated: false) }
        }
      }
    }
  }

  /// Back to where the list was before the search row came up: that note under the header, or the
  /// top of the list (Wren's line, the evening rows) when the reader was there or the note is gone.
  private func restore(_ proxy: ScrollViewProxy, to anchor: String?) {
    if let anchor, let row = rowId(for: anchor) {
      scroll(proxy, to: row, animated: false)
    } else {
      scroll(proxy, to: firstId(rows), animated: false)
    }
  }

  private func firstId(_ rows: [KNotesRow]) -> String? {
    if !content.wrenLine.isEmpty { return Self.wrenId }
    if content.evening != .none { return Self.eveningId }
    return content.notes.first?.id
  }

  private func scroll(_ proxy: ScrollViewProxy, to id: String?, animated: Bool) {
    guard let id else { return }
    box.settleToken &+= 1
    let token = box.settleToken
    let animate = animated && !reduceMotion
    if animate {
      withAnimation(.easeInOut(duration: 0.35)) { proxy.scrollTo(id, anchor: .top) }
    } else {
      proxy.scrollTo(id, anchor: .top)
    }
    settle(proxy, to: id, token: token, after: animate ? 0.4 : 0)
  }

  /// Lands a jump exactly. The rows it passed in the LazyVStack were only estimated (cards of every
  /// height), so the first scrollTo can stop short of the note or past it, leaving it under the
  /// header (spike pattern 3: 62pt short on first layout). So, as KLab.settleAtEnd does: once the
  /// jump is done (after its animation, or on the next turn), scrollTo again without animation, and
  /// once more a beat later — unless another jump has started or the reader has taken the list.
  private func settle(_ proxy: ScrollViewProxy, to id: String, token: Int, after delay: TimeInterval) {
    let box = self.box
    let state = self.scrollState
    let again = {
      guard box.settleToken == token, !state.isReaderScrolling else { return }
      proxy.scrollTo(id, anchor: .top)
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
      again()
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { again() }
    }
  }

  /// A new layout (or a column count change): back to the note that was on top. Not at the top of
  /// the list: there the offset stays, and with it Wren's line and the evening rows, which a jump to
  /// the first note would push up under the header.
  private func reanchor(_ proxy: ScrollViewProxy) {
    guard !box.extrasVisible, let top = scrollState.topNoteId, let row = rowId(for: top) else { return }
    // one turn later, so the new layout's rows exist
    DispatchQueue.main.async { scroll(proxy, to: row, animated: false) }
  }

  private func visibleChanged(_ ids: [String]) {
    // the topmost note on screen: the visible note earliest in the window (the ids don't come in
    // screen order); Wren's line and the evening rows sit above every note
    var top: (id: String, index: Int)?
    var extras = false
    var last = -1
    for id in ids {
      if id == Self.wrenId || id == Self.eveningId {
        extras = true
        continue
      }
      guard let i = content.index[id] else { continue }
      if i < (top?.index ?? Int.max) { top = (id, i) }
      last = max(last, i)
    }
    box.extrasVisible = extras
    // the chip's day comes from the cards' frames (chipDay); this read only seeds it before any
    // frame has come in
    if box.frames.isEmpty { scrollState.visible(top: top?.id) }
    // near the end of the window: ask for more, once per window
    guard content.hasMore, last >= 0 else { return }
    let lastIndex = last
    if lastIndex >= content.notes.count - 8 && box.reachedAt != content.notes.count {
      box.reachedAt = content.notes.count
      actions.onReachEnd()
    }
  }

  @ViewBuilder
  private var eveningRow: some View {
    switch content.evening {
    case .ask:
      KEveningAskCard(
        theme: theme,
        bird: content.bird,
        strings: content.strings,
        busy: content.eveningBusy,
        onYes: { actions.onEvening("yes") },
        onNo: { actions.onEvening("no") }
      )
      .id(Self.eveningId)
    case .on:
      KEveningOnRow(theme: theme, bird: content.birdMini, strings: content.strings, busy: content.eveningBusy) { actions.onEvening("off") }
        .id(Self.eveningId)
    case .none:
      EmptyView()
    }
  }

  /// Grid: two columns, each card its own height. Both columns mark their cards as scroll
  /// targets, so the visibility read (the top note, the end of the window) and the jumps (by note
  /// id) work card by card as they do in Card.
  private var masonry: some View {
    let cols = Self.masonry(content.notes)
    return HStack(alignment: .top, spacing: 12) {
      VStack(spacing: 12) {
        ForEach(cols.left) { note in
          masonryCard(note)
        }
      }
      .frame(maxWidth: .infinity, alignment: .top)
      VStack(spacing: 12) {
        ForEach(cols.right) { note in
          masonryCard(note)
        }
      }
      .frame(maxWidth: .infinity, alignment: .top)
    }
  }

  /// A waterfall card reports its own visibility: nested in a column, it is not one of the list's
  /// scroll targets, so the list's visibility read never saw it (the date chip stuck on the first
  /// day, 2026-10-20). The set feeds the same visibleChanged.
  private func masonryCard(_ note: KNote) -> some View {
    card(note)
      .id(note.id)
      .onScrollVisibilityChange(threshold: 0.01) { shown in
        if shown { box.masonryVisible.insert(note.id) } else { box.masonryVisible.remove(note.id) }
        visibleChanged(box.listVisible + Array(box.masonryVisible))
      }
  }

  /// The waterfall's split, in reading order: each note goes under the column that is shorter so
  /// far, by an estimate of its Grid card (the head, up to five lines of words — CJK counts double,
  /// as the composer counts — the voice bar, the pictures' block). Ties go left.
  static func masonry(_ notes: [KNote]) -> (left: [KNote], right: [KNote]) {
    var left: [KNote] = []
    var right: [KNote] = []
    var lh: CGFloat = 0
    var rh: CGFloat = 0
    for n in notes {
      let h = gridHeight(n)
      if lh <= rh {
        left.append(n)
        lh += h + 12
      } else {
        right.append(n)
        rh += h + 12
      }
    }
    return (left, right)
  }

  static func gridHeight(_ n: KNote) -> CGFloat {
    var h: CGFloat = 64 // padding, the head, the gap under it
    let words = n.words
    if n.textTier != .empty && !words.isEmpty {
      let weight = words.unicodeScalars.reduce(0) { $0 + ($1.value >= 0x2E80 ? 2 : 1) }
      let lines = min(n.gridLines, max(1, Int((Double(weight) / 22).rounded(.up))))
      h += CGFloat(lines) * 22.5 + 10
    }
    if n.kind == .voice { h += 62 }
    if let block = KNotePhotos.Block(count: n.photoCount, grid: true) { h += block.height + 10 }
    if n.kind == .video { h += 140 }
    return h
  }

  @ViewBuilder
  private func rowView(_ row: KNotesRow) -> some View {
    if columns == 2 {
      HStack(alignment: .top, spacing: 12) {
        ForEach(row.notes) { note in
          card(note)
        }
        if row.notes.count == 1 {
          Color.clear.frame(maxWidth: .infinity)
        }
      }
      .fixedSize(horizontal: false, vertical: true)
    } else if let note = row.notes.first {
      card(note)
    }
  }

  private func card(_ note: KNote) -> some View {
    KNoteCard(
      theme: theme,
      note: note,
      layout: content.layout,
      playLabel: content.strings.play,
      pauseLabel: content.strings.pause,
      driver: driver,
      actions: actions
    )
    .equatable()
    // the date chip's day is the card right under the chip (owner, 2026-10-20: it showed the next
    // one down while the top card was half off the screen): every card reports where it is
    .onGeometryChange(for: CGRect.self) { $0.frame(in: .scrollView) } action: { frame in
      box.frames[note.id] = frame
      chipDay()
    }
    .onDisappear { box.frames[note.id] = nil }
    .modifier(KNotePopIn(serial: fresh?.id == note.id ? fresh!.serial : 0, reduceMotion: reduceMotion))
  }

  /// the line the chip sits on, in the list's own coordinates (the chip is 8 under the status bar)
  static let chipLine: CGFloat = 24

  /// The card under the chip's line: the one that crosses it, or (in a gap) the first one below it.
  /// Both columns count in Grid; the left one wins a tie, as the eye reads.
  private func chipDay() {
    var crossing: (id: String, x: CGFloat)?
    var below: (id: String, y: CGFloat)?
    for (id, f) in box.frames {
      if f.minY <= Self.chipLine && f.maxY > Self.chipLine {
        if crossing == nil || f.minX < crossing!.x { crossing = (id, f.minX) }
      } else if f.minY > Self.chipLine, f.minY < (below?.y ?? .infinity) {
        below = (id, f.minY)
      }
    }
    scrollState.visible(top: crossing?.id ?? below?.id)
  }

  // ── nothing yet ─────────────────────────────────────────────────────────

  /// The empty state (Notes E1, KNotesEmpty) scrolls when it doesn't fit (accessibility sizes, an
  /// iPhone SE with the off row, the draft card out): its bottom margin is the list's, the fade's
  /// less 6, so its last scroll position leaves the draft card clear of the fade drawn over it.
  private var emptyBody: some View {
    let bottom = KBottomFade.contentMargin(height: fadeHeight)
    return GeometryReader { geo in
      ScrollView(.vertical) {
        VStack(spacing: 0) {
          if content.evening == .on {
            KEveningOnRow(theme: theme, bird: content.birdMini, strings: content.strings, busy: content.eveningBusy) { actions.onEvening("off") }
              .padding(.horizontal, 16)
          }
          Spacer(minLength: 24)
          KNotesEmpty(theme: theme, strings: content.strings, actions: actions)
          Spacer(minLength: 24)
        }
        // centred between the header and the fade, scrolling when it doesn't fit
        .frame(minHeight: max(0, geo.size.height - KNotesHeaderBar.fullHeight - bottom))
      }
      .scrollIndicators(.hidden)
      .scrollBounceBehavior(.basedOnSize, axes: .vertical)
      .contentMargins(.top, KNotesHeaderBar.fullHeight, for: .scrollContent)
      .contentMargins(.bottom, bottom, for: .scrollContent)
    }
  }
}
