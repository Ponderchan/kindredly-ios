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

 GRID is rows of two, each row as tall as its taller note; at accessibility text sizes it is one
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
 */

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
  /// her bird at 22 and 26 (the 'content' snapshot); nil until it is captured
  public var bird: KImageRef?
  /// her mini bird at 18 (the off row)
  public var birdMini: KImageRef?
  public var evening: KNotesEvening = .none
  public var eveningBusy = false
  public var palette = KNotesEmptyPalette(keyText: .clear, keyVoice: .clear, tape: .clear, sticker: .clear)

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
  /// an empty-state key: "text" or "voice"
  public var onCompose: (String) -> Void = { _ in }
  /// the list nears the end of the window and more notes lie past it
  public var onReachEnd: () -> Void = {}

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
}

/// What the screen keeps without drawing.
final class KNotesBox {
  var scrollSerial = 0
  /// a note asked for before it was in the window
  var pendingNote: (id: String, animated: Bool)?
  /// the window size the last reach-end was sent for (once per window)
  var reachedAt = -1
  /// bumped by every jump, so a settle pass left over from an earlier one does nothing
  var settleToken = 0
  /// Wren's line or the evening rows are on screen: the reader is at the top
  var extrasVisible = false
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

  public var body: some View {
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
            recentGroups: content.recentGroups,
            empty: content.empty,
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

      if content.calendarOpen && !content.empty {
        KNotesCalendar(theme: theme, strings: content.strings, topInset: topInset, driver: driver, actions: actions)
          .transition(reduceMotion ? .opacity : .opacity.combined(with: .scale(scale: 0.97, anchor: .top)))
          .zIndex(2)
      }
    }
    .animation(KMotion.notesCalendar, value: content.calendarOpen)
    .background { theme.bg.ignoresSafeArea() }
    .ignoresSafeArea(.keyboard)
    .onAppear { scrollState.setVoiceOver(voiceOver) }
    .onChange(of: voiceOver) { _, on in scrollState.setVoiceOver(on) }
    .onChange(of: content.empty) { _, empty in
      if empty { scrollState.show() }
    }
  }

  private func chipInfo(_ id: String) -> (label: String, group: KMoodGroup)? {
    guard let i = content.index[id], i < content.notes.count else { return nil }
    let n = content.notes[i]
    return (n.shortLabel, n.group)
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
    guard let i = content.index[noteId] else { return nil }
    return columns == 2 ? content.notes[i - i % 2].id : noteId
  }

  private var list: some View {
    let rows = self.rows
    let bottom = KBottomFade.contentMargin(height: fadeHeight)
    return ScrollViewReader { proxy in
      ScrollView(.vertical) {
        LazyVStack(alignment: .leading, spacing: 12) {
          if !content.wrenLine.isEmpty {
            KNotesWrenLine(theme: theme, bird: content.bird, text: content.wrenLine) { actions.onWrenLineDismiss() }
              .id(Self.wrenId)
          }
          eveningRow
          ForEach(rows) { row in
            rowView(row)
              .id(row.id)
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
      .contentMargins(.top, Self.topMargin, for: .scrollContent)
      .contentMargins(.bottom, bottom, for: .scrollContent)
      .kScrollChrome(chrome)
      .onScrollPhaseChange { _, phase in
        scrollState.phaseChanged(phase)
      }
      // any part on screen counts: a long page (whole on a Card) may never show 30% of itself
      .onScrollTargetVisibilityChange(idType: String.self, threshold: 0.01) { ids in
        visibleChanged(ids)
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
    }
  }

  private func firstId(_ rows: [KNotesRow]) -> String? {
    if !content.wrenLine.isEmpty { return Self.wrenId }
    if content.evening != .none { return Self.eveningId }
    return rows.first?.id
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
    scrollState.visible(top: top?.id)
    // near the end of the window: ask for more, once per window
    guard content.hasMore, last >= 0 else { return }
    let lastIndex = columns == 2 ? last + 1 : last
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
  }

  // ── nothing yet ─────────────────────────────────────────────────────────

  /// The empty state scrolls when it doesn't fit (accessibility sizes, an iPhone SE with the off
  /// row): its bottom margin is the list's, the fade's less 6, so its last scroll position leaves the
  /// two keys clear of the fade drawn over it, not in its graded band.
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
          KNotesEmpty(theme: theme, strings: content.strings, palette: content.palette, actions: actions)
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
