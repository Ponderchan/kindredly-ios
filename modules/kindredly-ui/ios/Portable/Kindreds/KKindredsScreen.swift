// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE KINDREDS TAB (10a, H:61-65 with the owner's decisions), drawn by SwiftUI. Every word, date,
 count, the order of the list and every menu are TS's (src/screens/kindreds/kindreds-model.ts);
 this draws them and reports taps. Its own state is only what belongs to the gesture: whether
 the orbit band is open, how far the list is scrolled, the pull, and two measured heights.

   KINDREDS ........................................ 2 LETTERS TO ANSWER   (scrolls away)
   ┌ band, pinned under the status bar ──────────────────────────────────────────────┐
   │   (the orbit: 300 open; folded, its rings as a 50% watermark behind the chips)    │
   │ [◎] [⌕] [All] [☺ Kindreds 3] [▦ Pen pals 21]     (searching: [⌕ field ×] Cancel)  │
   └───────────────────────────────────────────────────────────────────────────────────┘
   her once-line · the notifications bar · offline · Showing … CLEAR
   Wren (pinned, ALL only) · rows (on you first, then the newest) · their turn, folded ·
   the empty line or hint · Expired · n + quiet rooms · closed accounts
                                                       (bottom fade over the last rows)

 LAYOUT. One ScrollView: a LazyVStack whose first child is the title row (46 tall, 4 above, 12
 below: H's gap) and whose one Section has the band as its pinned header and the items as its
 rows. The title and its status share a line only while both fit at full size; with large text
 or a long language the status goes under the title and may wrap, rather than shrinking to an
 ellipsis (it is the only way into the your-turn filter). An empty status (nothing read yet) draws
 nothing. The Host ignores every safe area, so the status-bar strip above the scroll view is drawn
 here from `topInset`, and the band pins right under it, as H's scroll container starts at 54.
 The last row clears the floating tab bar (`bottomInset`) and a 176pt KBottomFade lies over the
 bottom of the screen. Its one text field is the search's, pinned in the band at the top, so
 the keyboard's safe area stays ignored: nothing moves when the keyboard rises, and a drag on the
 list drops it (scrollDismissesKeyboard).

 THE BAND (KKindredsDriver owns it; TS only resets it). Folded it is as tall as the chip row
 (measured, ≈58: large text grows it rather than clipping); open it is 300, or more when the
 legend wraps in a long language. It moves over .5s on cubic-bezier(.3,1,.3,1), and changes
 instantly under Reduce Motion. It opens from the Orbit chip, or from a pull at the top: the
 deepest point of one drag, finger down only, past 56pt (the device-tuned threshold of the React
 Native screen; H's 12 is a mouse-wheel filter). It folds from the chip, or once a drag (or the
 glide after one) carries the list more than 24pt down while open; the list then goes back to
 the top once the finger lifts, and again when it settles. Opening from the chip in the middle
 of the list scrolls to the top first, and a programmatic scroll never folds it. It starts
 folded on every visit: the screen folds it on disappear, once it has left the window (after a
 push's slide, or as the tab is detached), never at the start of a push, when the rows would
 jump up while the screen is still sliding out. TS's reset command, if one comes while the
 screen is showing, waits for that.

 WATERMARK. Folded, the orbit's middle strip shows behind the chips at 50%, fading out over the
 first 80pt of scroll. It is the dashed rings alone (owner's audit, 2026-11-10): the centre cell
 and the passing faces used to poke out above a chip as stray grey blocks and read as a glitch,
 so folded they are not drawn (KOrbit ringsOnly; they fade over the same .4s as the band's
 opacity and come back as it opens). This replaces the 10-11 "keeps drifting when folded": with
 only the rings left there is nothing to drift. The scroll's per-frame values live in
 KScrollModel (offset capped at 81), read only by small child views: the screen itself never
 redraws as the list scrolls.

 SCROLL REQUESTS (TS commands through the driver): top, and list, the title's tap ("2 LETTERS
 TO ANSWER" shows only those): the band folds and the list scrolls to where the band pins, so
 the first row sits right under it rather than behind it.

 SEARCH (owner's audit, 2026-11-10: no way to find one correspondent in a long list). A
 magnifier chip (KSearchChip) sits right after the Orbit chip. Tapped, the chip row gives way to
 a search field of the same height (the system's look in the theme's colours: a rounded field
 on soft, the magnifier, the words, a × while there are any, and Cancel beside it), the keyboard
 comes up and the orbit folds; a pull can't open it while the reader is searching. The field is
 a KField and Swift owns it (KKindredsDriver: searching, searchField): every change is reported
 (driver.onSearchChange: the words, and whether the reader is searching), TS narrows `items` by
 its own rule (kindreds-model) and sends them back, so this screen never filters anything.
 Cancel clears the field, drops the keyboard and brings the chips back; TS then shows the tab
 and filter that were on, untouched. Both rows stay mounted and the hidden one is faded out,
 untouchable and hidden from VoiceOver: a focused field is never taken off screen (KField's
 rule). A row opened from the results blurs the field first, so the keyboard doesn't ride into
 the chat; the search is still there on the way back. With no search words from TS (JS from
 before the search) there is no magnifier and no field.

 THE ORBIT TAKES TAPS (owner's audit, 2026-11-10). Open, a tap on a stranger's face (or within
 24pt of it, the nearest wins: KOrbit) opens that correspondence through the same onRow the
 rows use, so TS sees one action and takes one route. A tap on empty sky does nothing; folded,
 the orbit takes no taps at all. VoiceOver still skips the drawing: the rows are its way in.

 THE IDENTITY SWITCH (identity Phase 1) changes data here, never the layout: a pen pal's row, a
 folded face and an orbit face carry their frosted window (KFrost, square) with the courier name
 and its ♀/♂ mark and star sign (KPersonRow, KFoldRow, KOrbit), and `legendFrost` turns the PEN
 PALS chip's mark and the your-turn legend into the small frosted square (KLegendGlyph). All of
 it is empty while the switch is off, and the tab draws the mosaics and numbers it always drew.
 */

/// One chip under the band.
public struct KKindredsChip: Identifiable, Equatable, Sendable {
  public let key: String
  /// cased for a chip ("Pen pals")
  public let label: String
  /// "" for none
  public let count: String
  public let glyph: KFilterChip.Glyph
  public let selected: Bool
  /// someone in this group is waiting on you
  public let dot: Bool
  public let a11yLabel: String

  public var id: String { key }

  public init(key: String, label: String, count: String, glyph: KFilterChip.Glyph, selected: Bool, dot: Bool, a11yLabel: String) {
    self.key = key
    self.label = label
    self.count = count
    self.glyph = glyph
    self.selected = selected
    self.dot = dot
    self.a11yLabel = a11yLabel
  }
}

/// One entry of the list under the band, in TS's order.
public enum KKindredsItem: Identifiable, Equatable, Sendable {
  /// her once-line: the reader's own Wren and what she says
  case wrenLine(id: String, bird: KImageRef?, text: String)
  /// notifications are off: tap to turn them on, × to close for two weeks
  case notice(id: String, text: String, closeLabel: String)
  /// a quiet line of fact ("Not connected.")
  case line(id: String, text: String)
  /// "Showing · your turn · 3" and CLEAR ×
  case showing(id: String, text: String, clear: String)
  /// Wren's desk, pinned first (ALL with no filter); no menu
  case wren(KPersonRowModel)
  /// a kindred, a pen pal, a quiet room or a closed account
  case row(KPersonRowModel)
  /// their turn, folded
  case fold(KFoldModel)
  /// "ALL ANSWERED" under a filter with nothing in it
  case emptyLine(id: String, text: String)
  /// no kindreds yet: a dashed face and the five-letters line (to Wren's guide)
  case hintKindreds(id: String, text: String)
  /// no pen pals yet: the line and "TO THE DESK ›"
  case hintPenpals(id: String, text: String, link: String)
  /// "Expired · 2" over the quiet rooms
  case groupHeader(id: String, text: String)

  public var id: String {
    switch self {
    case let .wrenLine(id, _, _), let .notice(id, _, _), let .line(id, _), let .showing(id, _, _),
         let .emptyLine(id, _), let .hintKindreds(id, _), let .hintPenpals(id, _, _), let .groupHeader(id, _):
      return id
    case let .wren(row), let .row(row):
      return row.id
    case let .fold(fold):
      return fold.id
    }
  }
}

/// Everything the screen shows, from TS.
public struct KKindredsContent: Equatable, Sendable {
  public var title: String = ""
  public var status: String = ""
  /// the status is a way in (letters are waiting): ind, and a button
  public var statusActive = false
  public var statusA11y: String = ""
  public var legendCloser: String = ""
  public var legendTurn: String = ""
  public var orbitChipLabel: String = ""
  /// VoiceOver's name for the magnifier chip and the search field; "" (JS from before the
  /// search) and neither is drawn
  public var searchLabel: String = ""
  /// the search field's placeholder
  public var searchPlaceholder: String = ""
  /// the word beside the field that ends the search
  public var searchCancel: String = ""
  /// VoiceOver's name for the field's × key
  public var searchClear: String = ""
  /// identity switch on: the sample window the PEN PALS chip mark and the your-turn legend are
  /// drawn as (nobody's: TS's fixed seed); nil keeps the mosaic marks
  public var legendFrost: KFrostSpec?
  /// the tab is focused: the orbit may drift
  public var active = true
  public var chips: [KKindredsChip] = []
  public var orbit: [KOrbitItem] = []
  /// you, in the orbit's middle: your own face (nil keeps the ink cell)
  public var orbitMe: KPersonFace?
  /// your kindreds on the orbit's home ring, beside you (at most eight; TS picks and orders them)
  public var orbitKin: [KOrbitKin] = []
  public var items: [KKindredsItem] = []

  public init() {}
}

/// Where the screen's taps go. One object for the life of the surface, so a row's closures never
/// make it unequal to itself. Set the closures once.
public final class KKindredsActions {
  /// a row (kindred, pen pal, quiet, closed) was tapped, with its id
  public var onRow: (String) -> Void = { _ in }
  /// a row's menu item (or its VoiceOver action): the row's id and the item's key
  public var onRowAction: (_ id: String, _ key: String) -> Void = { _, _ in }
  /// Wren's row
  public var onWren: () -> Void = {}
  /// the folded row (not a face)
  public var onFold: () -> Void = {}
  /// a folded face, with its id
  public var onFoldFace: (String) -> Void = { _ in }
  /// a group chip, with its key
  public var onChip: (String) -> Void = { _ in }
  /// the status by the title, while it is a way in
  public var onTitle: () -> Void = {}
  /// CLEAR × on the Showing line
  public var onClear: () -> Void = {}
  /// an empty hint: "kindreds" or "penpals"
  public var onHint: (String) -> Void = { _ in }
  /// the notifications bar: "turnOn" or "close"
  public var onNotice: (String) -> Void = { _ in }
  /// her once-line was tapped away
  public var onWrenLine: () -> Void = {}

  public init() {}
}

/// The band's state and the screen's scroll requests: what TS's commands reach (through the
/// adapter) and what the gestures change. Not observed by the list, only by the band.
public final class KKindredsDriver: ObservableObject {
  /// What opened or folded the band, as reported.
  public enum Via: String, Sendable {
    case chip
    case pull
    case scroll
    case title
    /// the search began (the orbit folds while the reader is searching)
    case search
  }

  /// Where a scroll request goes.
  public enum ScrollTarget: Equatable, Sendable {
    /// the top: the title row
    case top
    /// where the band pins: the first item right under it
    case list
  }

  struct ScrollRequest: Equatable {
    let target: ScrollTarget
    let animated: Bool
    let serial: Int
  }

  /// the deepest pull of one drag that opens the band (kindreds.tsx: -56, tuned on a device)
  public static let pullToOpen: CGFloat = 56
  /// how far a drag may carry the list down while the band is open before it folds (H:499)
  public static let foldPast: CGFloat = 24
  /// the band's motion: .5s cubic-bezier(.3,1,.3,1) (H:62)
  public static let motion = Animation.timingCurve(0.3, 1, 0.3, 1, duration: 0.5)

  @Published public private(set) var bandOpen = false
  @Published private(set) var scrollRequest: ScrollRequest?
  /// the reader is searching: the chip row has given way to the search field
  @Published public private(set) var searching = false
  /// the search field has words in it (its × key shows)
  @Published public private(set) var searchHasText = false
  /// the search field's handle. Whoever hosts the screen blurs it before the view is taken down.
  public let searchField = KFieldController()
  /// the chips and the field changing places
  public static let searchSwap = Animation.easeInOut(duration: 0.2)

  /// told whenever the band opens or folds (not on a reset)
  public var onBandChange: ((_ open: Bool, _ via: Via) -> Void)?
  /// told whenever the search changes: the field's words, and whether the reader is searching
  /// (false: never began, or Cancel). Also told once each time the screen appears, so whoever
  /// filters the list can't be left holding a search this screen no longer shows.
  public var onSearchChange: ((_ query: String, _ active: Bool) -> Void)?
  /// set by the screen from the environment
  var reduceMotion = false

  private var serial = 0
  private var offset: CGFloat = 0
  private var phase: ScrollPhase = .idle
  /// the band folded under a drag: back to the top once the finger lifts, and again on settling
  private var settlePending = false
  /// the screen is in the window (between its onAppear and onDisappear)
  private var onScreen = false

  public init() {}

  private var animation: Animation? { reduceMotion ? nil : Self.motion }

  /// The Orbit chip.
  public func toggleBand() {
    setBand(!bandOpen, via: .chip)
  }

  // ── the search ──

  /// The magnifier chip: the orbit folds, the chip row gives way to the field, the keyboard rises.
  public func beginSearch() {
    guard !searching else { return }
    setBand(false, via: .search)
    searchField.setText("")
    searchHasText = false
    withAnimation(Self.searchSwap) { searching = true }
    searchField.focus()
    reportSearch()
  }

  /// Cancel: the keyboard down, the field emptied, the chips back.
  public func endSearch() {
    guard searching else { return }
    searchField.blur()
    searchField.setText("")
    searchHasText = false
    withAnimation(Self.searchSwap) { searching = false }
    reportSearch()
  }

  /// The field's × key: empty it and keep the keyboard.
  public func clearSearch() {
    searchField.setText("")
    searchHasText = false
    searchField.focus()
    reportSearch()
  }

  /// The reader typed in the field (KField's onChange).
  func searchEdited(_ text: String) {
    let has = !text.isEmpty
    if has != searchHasText { searchHasText = has }
    reportSearch()
  }

  /// Something off this screen is about to show (a row was opened): the keyboard goes first.
  func dropKeyboard() {
    if searching { searchField.blur() }
  }

  private func reportSearch() {
    onSearchChange?(searching ? searchField.text : "", searching)
  }

  /// Folds the band at once, without moving or reporting anything: a new visit starts folded.
  /// The screen calls it on disappear; from outside, use requestReset().
  public func reset() {
    settlePending = false
    guard bandOpen else { return }
    var instant = Transaction()
    instant.disablesAnimations = true
    withTransaction(instant) { bandOpen = false }
  }

  /// A reset asked for from outside (TS's reset command). While the screen is showing it waits:
  /// the screen folds the band itself on disappear, and folding now (a blur arrives at the start
  /// of a push) would jump every row up by the band's height while the screen slides out. Off
  /// screen, it folds at once.
  public func requestReset() {
    guard !onScreen else { return }
    reset()
  }

  /// The screen came into the window.
  func screenAppeared() {
    onScreen = true
    // whoever filters the list hears what this screen is showing (see onSearchChange)
    reportSearch()
  }

  /// The screen left the window (a push has finished sliding it out, or the tab was detached):
  /// the next visit starts folded.
  func screenDisappeared() {
    onScreen = false
    dropKeyboard()
    reset()
  }

  /// Scrolls to the top, or to where the band pins (folding it first).
  public func scroll(to target: ScrollTarget, animated: Bool = true) {
    if target == .list && bandOpen {
      setBand(false, via: .title)
    }
    request(target, animated: animated)
  }

  private func request(_ target: ScrollTarget, animated: Bool) {
    serial += 1
    scrollRequest = ScrollRequest(target: target, animated: animated, serial: serial)
  }

  private func setBand(_ open: Bool, via: Via) {
    guard open != bandOpen else { return }
    withAnimation(animation) { bandOpen = open }
    onBandChange?(open, via)
    // opened in the middle of the list: to the top with it, or it would pin open over the rows
    // and fold again on the next scroll
    if open && offset > 0.5 {
      request(.top, animated: true)
    }
  }

  /// A drag ended (the scroll model's pull release), with its deepest pull past the top.
  func pullReleased(_ depth: CGFloat) {
    // not while searching: the orbit stays folded under the search field
    if !bandOpen && !searching && depth >= Self.pullToOpen {
      setBand(true, via: .pull)
    }
  }

  /// The list's offset (capped at 81, KScrollModel).
  func offsetChanged(_ y: CGFloat) {
    offset = y
    guard bandOpen, y > Self.foldPast else { return }
    // only a reader's scroll folds it: a drag, or the glide after one; never a programmatic one
    guard phase == .interacting || phase == .decelerating || phase == .tracking else { return }
    setBand(false, via: .scroll)
    settlePending = true
    if phase != .interacting { request(.top, animated: true) }
  }

  func phaseChanged(_ next: ScrollPhase) {
    phase = next
    guard settlePending else { return }
    switch next {
    case .decelerating:
      request(.top, animated: true)
    case .idle:
      settlePending = false
      request(.top, animated: true)
    default:
      break
    }
  }
}

/// What the screen keeps without drawing: the title block's height and the last scroll served.
final class KKindredsBox {
  var titleHeight: CGFloat = 62
  var scrollSerial = 0
}

public struct KKindredsScreen: View {
  static let status = KTextStyle.mono(11, .medium, tracking: 0.12)
  static let small = KTextStyle.system(13)
  static let smallStrong = KTextStyle.system(13, .semibold)
  static let monoLine = KTextStyle.mono(11, .semibold, tracking: 0.11)

  private let theme: KTheme
  private let content: KKindredsContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let driver: KKindredsDriver
  private let actions: KKindredsActions

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /// The band's watermark, the fold rule and the pull read this; offset stops changing past 81.
  /// Held in @State, not @StateObject: the screen keeps the one model without observing it, so
  /// a scroll frame redraws only the small views that do (KKindredsOrbitBlock, KKindredsFoldRule),
  /// never the list.
  @State private var chrome = KScrollModel(offsetCap: 81)
  @State private var position = ScrollPosition(edge: .top)
  @State private var box = KKindredsBox()

  /* THE SPREAD (iPhone Duo's inner screen; the canvas's Kindreds: "轨道展开，名单在下"; owner,
     2026-11-12: "要把整个屏都利用起来"). On a phone the orbit is a band folded behind the Orbit
     chip. While the window is two pages (KFold; this screen is then the whole window) it is
     unfolded for good: the orbit is the left page, standing open in its middle, drifting and
     taking taps on its faces as the open band does; the right page is the list as it is, with no
     Orbit chip and no watermark, since there is nothing left to fold. The right page stops at the
     system's band, where the tab bar stands. */
  @ObservedObject private var fold = KFold.shared
  /// what the list keeps clear at its foot: the host's number, or the short fade's with the tab
  /// bar in the band (KBottomFade.foot)
  private var foot: CGFloat { KBottomFade.foot(bottomInset, in: fold.frame) }
  /// the left page's orbit never scrolls: a still model for its block
  @State private var still = KScrollModel(offsetCap: 81)
  @State private var spreadLegend: CGFloat = 16

  /// - Parameters:
  ///   - topInset: the status bar's height (the Host ignores safe areas)
  ///   - bottomInset: how far the last row must clear the bottom (the tab bar and the fade)
  ///   - driver: the band and the scroll requests
  ///   - actions: where the taps go
  public init(theme: KTheme, content: KKindredsContent, topInset: CGFloat, bottomInset: CGFloat, driver: KKindredsDriver, actions: KKindredsActions) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.driver = driver
    self.actions = actions
  }

  public var body: some View {
    let spread = fold.frame.twoPages
    HStack(spacing: 0) {
      if spread {
        orbitPage
          .frame(width: fold.frame.crease)
      }
      listPage(spread: spread)
        .frame(width: spread ? max(0, fold.frame.rightEnd - fold.frame.crease) : nil)
      if spread {
        Spacer(minLength: 0)
      }
    }
    .background { theme.bg.ignoresSafeArea() }
    .ignoresSafeArea(.keyboard)
  }

  /// THE SPREAD's left page: the orbit, open, a third larger than the band's, with its legend
  private var orbitPage: some View {
    KKindredsOrbitBlock(
      theme: theme,
      orbit: content.orbit,
      me: content.orbitMe,
      kin: content.orbitKin,
      legendCloser: content.legendCloser,
      legendTurn: content.legendTurn,
      legendFrost: content.legendFrost,
      open: true,
      active: content.active,
      chrome: still,
      legendHeight: $spreadLegend,
      onFace: { [actions] id in actions.onRow(id) }
    )
    .frame(width: 340)
    .scaleEffect(1.3)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .padding(.top, topInset)
    .padding(.bottom, foot)
  }

  private func listPage(spread: Bool) -> some View {
    VStack(spacing: 0) {
      // the status bar's strip: the page colour, nothing pinned under the clock
      Color.clear.frame(height: topInset)
      ScrollView(.vertical) {
        LazyVStack(alignment: .leading, spacing: 0, pinnedViews: [.sectionHeaders]) {
          titleRow
          Section {
            // H's 12 between the band and the list
            Color.clear
              .frame(height: 12)
              .accessibilityHidden(true)
            ForEach(content.items) { item in
              itemView(item)
            }
          } header: {
            KKindredsBand(theme: theme, content: content, driver: driver, chrome: chrome, actions: actions, spread: spread)
          }
        }
      }
      .scrollIndicators(.hidden)
      // a drag on the list drops the search's keyboard, so the results under it can be seen
      .scrollDismissesKeyboard(.immediately)
      // a short list still bounces, so a new reader's pull still opens the orbit
      .scrollBounceBehavior(.always, axes: .vertical)
      .contentMargins(.bottom, foot, for: .scrollContent)
      .scrollPosition($position)
      .kScrollChrome(chrome)
      .onScrollPhaseChange { _, phase in
        driver.phaseChanged(phase)
      }
      .background {
        KKindredsFoldRule(chrome: chrome, driver: driver)
      }
    }
    .overlay(alignment: .bottom) {
      KBottomFade(theme: theme)
    }
    .onReceive(driver.$scrollRequest) { request in
      guard let request, request.serial > box.scrollSerial else { return }
      box.scrollSerial = request.serial
      scroll(to: request.target, animated: request.animated)
    }
    .onAppear {
      driver.reduceMotion = reduceMotion
      driver.screenAppeared()
      chrome.onPullRelease = { [driver] depth in driver.pullReleased(depth) }
    }
    .onChange(of: reduceMotion) { _, reduce in
      driver.reduceMotion = reduce
    }
    .onDisappear {
      driver.screenDisappeared()
    }
  }

  private func scroll(to target: KKindredsDriver.ScrollTarget, animated: Bool) {
    let pinAt = box.titleHeight
    let move = {
      switch target {
      case .top: position.scrollTo(edge: .top)
      case .list: position.scrollTo(y: pinAt)
      }
    }
    if animated && !reduceMotion {
      withAnimation(KKindredsDriver.motion) { move() }
    } else {
      move()
    }
  }

  // ── the title row: KINDREDS and its one fact; it scrolls away ──────────
  private var titleRow: some View {
    ViewThatFits(in: .horizontal) {
      // one line while the title and the status both fit at full size
      HStack(alignment: .center, spacing: 0) {
        titleText
          .lineLimit(1)
        Spacer(minLength: 12)
        status(stacked: false)
      }
      // otherwise (AX sizes, a long language) the status under the title, wrapping if it must:
      // nothing shrinks to an ellipsis
      VStack(alignment: .leading, spacing: 4) {
        titleText
          .lineLimit(2)
          .minimumScaleFactor(0.7)
          .fixedSize(horizontal: false, vertical: true)
        status(stacked: true)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .frame(minHeight: 46)
    .padding(.top, 4)
    .padding(.horizontal, KPersonRow.inset)
    .padding(.bottom, 12)
    .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { height in
      box.titleHeight = height
    }
  }

  private var titleText: some View {
    Text(content.title)
      .kText(.pageTitle)
      .foregroundStyle(theme.ink)
      .accessibilityAddTraits(.isHeader)
  }

  /// The status's tap target round its one mono line (≈15pt): 15 above and below, 8 at the
  /// sides, all taken back outside the button so nothing moves (44pt, as TabHeader's hitSlop 8
  /// and the row height gave the React Native one).
  static let statusSlop = CGSize(width: 8, height: 15)

  @ViewBuilder
  private func status(stacked: Bool) -> some View {
    if !content.status.isEmpty {
      let label = Text(content.status)
        .kText(Self.status)
        .foregroundStyle(content.statusActive ? theme.ind : theme.mute)
        .lineLimit(stacked ? 2 : 1)
        .multilineTextAlignment(.leading)
        .fixedSize(horizontal: false, vertical: true)
      if content.statusActive {
        SwiftUI.Button {
          actions.onTitle()
        } label: {
          label
            .padding(.vertical, Self.statusSlop.height)
            .padding(.horizontal, Self.statusSlop.width)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        .padding(.vertical, -Self.statusSlop.height)
        .padding(.horizontal, -Self.statusSlop.width)
        .accessibilityLabel(content.statusA11y)
      } else {
        label.accessibilityLabel(content.statusA11y)
      }
    }
  }

  // ── the list ───────────────────────────────────────────────────────────
  @ViewBuilder
  private func itemView(_ item: KKindredsItem) -> some View {
    switch item {
    case let .wrenLine(_, bird, text):
      KWrenLine(theme: theme, bird: bird, line: text) { actions.onWrenLine() }

    case let .notice(_, text, closeLabel):
      KNoticeBar(
        theme: theme,
        text: text,
        closeLabel: closeLabel,
        onTap: { actions.onNotice("turnOn") },
        onClose: { actions.onNotice("close") }
      )

    case let .line(_, text):
      Text(text)
        .kText(Self.small)
        .foregroundStyle(theme.mute)
        .padding(.horizontal, KPersonRow.inset)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)

    case let .showing(_, text, clear):
      HStack(alignment: .firstTextBaseline, spacing: 12) {
        Text(text)
          .kText(Self.small)
          .foregroundStyle(theme.mute)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
        Spacer(minLength: 0)
        SwiftUI.Button {
          actions.onClear()
        } label: {
          // a 44pt target round the 13pt word: 14 above and below, 8 at the sides; everything but
          // the 6 the line always had is taken back outside, so the Showing line keeps its height
          Text(clear)
            .kText(Self.smallStrong)
            .foregroundStyle(theme.ind)
            .lineLimit(1)
            .fixedSize()
            .padding(.vertical, 14)
            .padding(.horizontal, 8)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        .padding(.vertical, -8)
        .padding(.horizontal, -8)
      }
      .padding(.horizontal, KPersonRow.inset)
      .padding(.bottom, 2)

    // a row opened from the search's results: the keyboard goes before the push (dropKeyboard)
    case let .wren(row):
      KPersonRow(theme: theme, row: row, onTap: {
        driver.dropKeyboard()
        actions.onWren()
      })
      .equatable()

    case let .row(row):
      KPersonRow(
        theme: theme,
        row: row,
        onTap: {
          driver.dropKeyboard()
          actions.onRow(row.id)
        },
        onAction: { key in
          driver.dropKeyboard()
          actions.onRowAction(row.id, key)
        }
      )
      .equatable()

    case let .fold(fold):
      KFoldRow(theme: theme, fold: fold, onFace: { id in actions.onFoldFace(id) }, onRow: { actions.onFold() })
        .equatable()

    case let .emptyLine(_, text):
      Text(text)
        .kText(Self.monoLine)
        .foregroundStyle(theme.mute)
        .padding(.horizontal, KPersonRow.inset)
        .padding(.vertical, 16)
        .frame(maxWidth: .infinity, alignment: .leading)

    case let .hintKindreds(_, text):
      SwiftUI.Button {
        actions.onHint("kindreds")
      } label: {
        HStack(alignment: .center, spacing: 12) {
          Circle()
            .strokeBorder(theme.faint, style: StrokeStyle(lineWidth: 1.5, dash: [4, 3]))
            .frame(width: 42, height: 42)
          Text(text)
            .kText(.system(13.5, lineHeight: 19.0 / 13.5))
            .foregroundStyle(theme.sub)
            .multilineTextAlignment(.leading)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, KPersonRow.inset)
        .padding(.vertical, 13)
        .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())

    case let .hintPenpals(_, text, link):
      SwiftUI.Button {
        actions.onHint("penpals")
      } label: {
        VStack(alignment: .leading, spacing: 8) {
          Text(text)
            .kText(.system(14, lineHeight: 20.0 / 14))
            .foregroundStyle(theme.sub)
            .multilineTextAlignment(.leading)
          // the way in is a button's words: system, as a row's trailing link
          Text(link)
            .kText(KPersonRow.link)
            .foregroundStyle(theme.ind)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, KPersonRow.inset)
        .padding(.vertical, 14)
        .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())

    case let .groupHeader(_, text):
      Text(text)
        .kText(Self.smallStrong)
        .foregroundStyle(theme.mute)
        .padding(.horizontal, KPersonRow.inset)
        .padding(.top, 18)
        .padding(.bottom, 4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityAddTraits(.isHeader)
    }
  }
}

// MARK: - The band

/// The pinned band: the orbit (open) or its watermark (folded), and the chip row along its
/// bottom. Observes the driver; the scroll-driven parts are its small children.
/// The band's two chips' names as the rail's tools (KRailTools), in the order it takes them.
enum KKindredsTool {
  static let orbit = "kindreds.orbit"
  static let search = "kindreds.search"
}

struct KKindredsBand: View {
  /// H's open band
  static let openHeight: CGFloat = 300
  /// the orbit block's top: 6 open, -96 folded (so its middle strip shows behind the chips)
  static let orbitTopOpen: CGFloat = 6
  static let orbitTopFolded: CGFloat = -96

  let theme: KTheme
  let content: KKindredsContent
  @ObservedObject var driver: KKindredsDriver
  let chrome: KScrollModel
  let actions: KKindredsActions
  /// THE SPREAD (KKindredsScreen): the orbit has a page of its own, so the band is only the chip
  /// row: never open, no watermark, no Orbit chip
  var spread = false
  /// the Orbit chip and the search stand in the band on a folding phone (KRailTools)
  @ObservedObject private var railTools = KRailTools.shared

  @State private var chipRowHeight: CGFloat = 58
  @State private var legendHeight: CGFloat = 16

  /// 300, or taller when the legend wraps (critic-kindreds: a long language's legend would run
  /// into the chips)
  private var openHeight: CGFloat {
    max(Self.openHeight, Self.orbitTopOpen + KOrbitGeometry.height + legendHeight + 8 + chipRowHeight)
  }

  var body: some View {
    let open = driver.bandOpen && !spread
    Color.clear
      .frame(height: open ? openHeight : chipRowHeight)
      .frame(maxWidth: .infinity)
      .overlay(alignment: .top) {
        KKindredsOrbitBlock(
          theme: theme,
          orbit: content.orbit,
          me: content.orbitMe,
          kin: content.orbitKin,
          legendCloser: content.legendCloser,
          legendTurn: content.legendTurn,
          legendFrost: content.legendFrost,
          open: open,
          active: content.active,
          chrome: chrome,
          legendHeight: $legendHeight,
          // a face on the open orbit opens that correspondence, exactly as its row does
          onFace: { id in actions.onRow(id) }
        )
        .padding(.horizontal, KPersonRow.inset)
        .offset(y: open ? Self.orbitTopOpen : Self.orbitTopFolded)
        // only the open orbit takes taps (its faces); folded it is a watermark behind the chips
        .allowsHitTesting(open)
        // no watermark behind the search field: its rings would show past the field's ends
        .opacity(driver.searching || spread ? 0 : 1)
      }
      .overlay(alignment: .bottom) {
        // both stay mounted (a focused field is never taken off screen); the one not in use is
        // faded out, untouchable and hidden from VoiceOver
        ZStack(alignment: .bottom) {
          chipRow
            .opacity(driver.searching ? 0 : 1)
            .allowsHitTesting(!driver.searching)
            .accessibilityHidden(driver.searching)
          if hasSearch {
            searchRow
              .opacity(driver.searching ? 1 : 0)
              .allowsHitTesting(driver.searching)
              .accessibilityHidden(!driver.searching)
          }
        }
      }
      .clipped()
      .background(theme.bg)
      // the two chips, for the band on a folding phone (KRailTools): again whenever they change
      .onChange(of: toolsSignature, initial: true) { _, _ in
        publishTools()
      }
  }

  /// TS sent the search's words (JS from before the search sends none: no chip, no field)
  private var hasSearch: Bool { !content.searchLabel.isEmpty }

  /// the chips the band's rail drew instead (a folding phone): left out of the row
  private var taken: Set<String> { railTools.taken(.kindreds) }

  /// everything the band's copies of the two chips show: they are published again when it changes
  private var toolsSignature: String {
    [
      theme.key, driver.bandOpen ? "open" : "folded", spread ? "spread" : "page", hasSearch ? "search" : "",
      driver.searching ? "searching" : "", content.orbitChipLabel, content.searchLabel, content.legendCloser, content.legendTurn,
    ].joined(separator: "|")
  }

  /// The Orbit chip and the search, for the band: round keys that do what the chips do. No
  /// Orbit key where the orbit has a page of its own; none at all while the search field is up.
  private func publishTools() {
    guard !driver.searching else {
      KRailTools.shared.set(.kindreds, [])
      return
    }
    let theme = theme
    let driver = driver
    var tools: [KRailTool] = []
    if !spread {
      let on = driver.bandOpen
      let hint = [content.legendCloser, content.legendTurn].filter { !$0.isEmpty }.joined(separator: ". ")
      tools.append(KRailTool(KKindredsTool.orbit) {
        KRailKey(theme: theme, on: on, label: content.orbitChipLabel, hint: hint, action: { driver.toggleBand() }) {
          KLineIcon(.orbit, size: 22, lineWidth: 1.8, color: theme.ink)
        }
      })
    }
    if hasSearch {
      tools.append(KRailTool(KKindredsTool.search) {
        KRailKey(theme: theme, label: content.searchLabel, action: { driver.beginSearch() }) {
          KLineIcon(.noteSearch, size: 22, lineWidth: 2, color: theme.ink)
        }
      })
    }
    KRailTools.shared.set(.kindreds, tools)
  }

  private var chipRow: some View {
    ScrollView(.horizontal) {
      HStack(alignment: .center, spacing: 8) {
        if !spread && !taken.contains(KKindredsTool.orbit) {
          KOrbitChip(
            theme: theme,
            isOn: driver.bandOpen,
            a11yLabel: content.orbitChipLabel,
            a11yHint: [content.legendCloser, content.legendTurn].filter { !$0.isEmpty }.joined(separator: ". ")
          ) {
            driver.toggleBand()
          }
        }
        if hasSearch && !taken.contains(KKindredsTool.search) {
          KSearchChip(theme: theme, a11yLabel: content.searchLabel) {
            driver.beginSearch()
          }
        }
        ForEach(content.chips) { chip in
          KFilterChip(
            theme: theme,
            label: chip.label,
            count: chip.count,
            glyph: chip.glyph,
            selected: chip.selected,
            dot: chip.dot,
            a11yLabel: chip.a11yLabel,
            frost: content.legendFrost
          ) {
            actions.onChip(chip.key)
          }
        }
      }
      // 24 from the screen's left (the band's 22 and the row's 2), to its right edge
      .padding(.leading, 24)
      .padding(.trailing, 24)
      .padding(.top, 10)
      .padding(.bottom, 8)
    }
    .scrollIndicators(.hidden)
    .scrollBounceBehavior(.basedOnSize, axes: .horizontal)
    .fixedSize(horizontal: false, vertical: true)
    .dynamicTypeSize(...DynamicTypeSize.accessibility2)
    .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { height in
      if abs(height - chipRowHeight) > 0.5 { chipRowHeight = height }
    }
  }

  /// The search field in the chip row's place, exactly as tall: the chips' 10 above and 8 below,
  /// 24 from the screen's edges. The system's search look in the theme's colours: a rounded field
  /// on soft, the magnifier, the words (system 17), a × while there are any, Cancel in ind.
  private var searchRow: some View {
    HStack(alignment: .center, spacing: 0) {
      HStack(alignment: .center, spacing: 7) {
        KLineIcon(.search, size: 17, lineWidth: 1.7, color: theme.mute)
        KField(
          theme: theme,
          controller: driver.searchField,
          placeholder: content.searchPlaceholder,
          axis: .horizontal,
          lines: nil,
          returnSends: false,
          autocapitalize: false,
          autocorrect: false,
          accessibilityLabel: content.searchLabel,
          onChange: { text in driver.searchEdited(text) }
        )
        .frame(maxWidth: .infinity, alignment: .leading)
        if driver.searchHasText {
          // the system field's clear key
          SwiftUI.Button {
            driver.clearSearch()
          } label: {
            Image(systemName: "xmark.circle.fill")
              .font(.system(size: 17))
              .foregroundStyle(theme.faint)
              .frame(width: 36, height: 44)
              .contentShape(Rectangle())
          }
          .buttonStyle(KFadePressStyle())
          .accessibilityLabel(content.searchClear)
        }
      }
      .padding(.leading, 11)
      .padding(.trailing, driver.searchHasText ? 0 : 11)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(theme.soft))
      // anywhere on the field takes the keyboard, not only the words
      .contentShape(Rectangle())
      .onTapGesture { driver.searchField.focus() }
      // the chips' 10 above and 8 below
      .padding(.top, 10)
      .padding(.bottom, 8)

      SwiftUI.Button {
        driver.endSearch()
      } label: {
        // the word sits level with the field (the same 10 and 8); the button is the row's whole
        // height, so its target is 44pt or more whatever the text size
        Text(content.searchCancel)
          .kText(.system(17))
          .foregroundStyle(theme.ind)
          .lineLimit(1)
          .fixedSize()
          .padding(.top, 10)
          .padding(.bottom, 8)
          .padding(.horizontal, 12)
          .frame(minWidth: 44, maxHeight: .infinity)
          .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
    }
    .padding(.leading, 24)
    // Cancel's own 12 makes the word end 24 from the edge, as the chips' row does
    .padding(.trailing, 12)
    .frame(height: chipRowHeight)
    .dynamicTypeSize(...DynamicTypeSize.accessibility2)
  }
}

/// The orbit and its legend. Reads the scroll offset (the watermark's fade), so it redraws while
/// the list moves near the top; nothing above it does.
struct KKindredsOrbitBlock: View {
  static let legend = KTextStyle.mono(10, .medium, tracking: 0.06)
  /// the orbit's opacity, filter and legend: .4s CSS ease (H:62); the faces leave on the same curve
  static let fade = KOrbit.fade

  let theme: KTheme
  let orbit: [KOrbitItem]
  /// you in the middle and your kindreds beside you (KOrbit's `me` and `kin`)
  var me: KPersonFace?
  var kin: [KOrbitKin] = []
  let legendCloser: String
  let legendTurn: String
  /// identity switch on: the your-turn mark is the sample window with its ind ring
  let legendFrost: KFrostSpec?
  let open: Bool
  let active: Bool
  @ObservedObject var chrome: KScrollModel
  @Binding var legendHeight: CGFloat
  /// a face on the open orbit was tapped, with the correspondence's id
  let onFace: (String) -> Void

  var body: some View {
    // folded, the watermark fades out over the first 80pt of scroll (H: clamp(0, 1 - sc/80, 1))
    let fade = max(0, min(1, 1 - chrome.offset / 80))
    VStack(spacing: 0) {
      // folded: the rings alone, still (no centre cell, no faces: they read as stray blocks)
      KOrbit(theme: theme, items: orbit, me: me, kin: kin, active: active && open, ringsOnly: !open, onTap: open ? onFace : nil)
        .equatable()
      legend
        .opacity(open ? 1 : 0)
        .accessibilityHidden(!open)
        .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { height in
          if abs(height - legendHeight) > 0.5 { legendHeight = height }
        }
    }
    .opacity(open ? 1 : 0.5 * fade)
    .animation(Self.fade, value: open)
  }

  private var legend: some View {
    ViewThatFits(in: .horizontal) {
      HStack(alignment: .center, spacing: 14) {
        item(.rings, legendCloser).lineLimit(1)
        item(.turn, legendTurn).lineLimit(1)
      }
      VStack(alignment: .center, spacing: 4) {
        item(.rings, legendCloser)
        item(.turn, legendTurn)
      }
    }
    .frame(maxWidth: .infinity)
  }

  private func item(_ kind: KLegendGlyph.Kind, _ text: String) -> some View {
    HStack(alignment: .center, spacing: 5) {
      // the your-turn window wears its ring, so it gets 12 to the mosaic's 9
      KLegendGlyph(theme: theme, kind: kind, size: kind == .rings ? 14 : (legendFrost != nil ? 12 : 9), frost: legendFrost)
      Text(text)
        .kText(Self.legend)
        .foregroundStyle(theme.sub)
        .multilineTextAlignment(.center)
    }
    .accessibilityElement(children: .combine)
  }
}

/// Folds the band when a reader's scroll carries the list past 24 while it is open. Draws
/// nothing; it is the one view that follows the offset for the rule.
struct KKindredsFoldRule: View {
  @ObservedObject var chrome: KScrollModel
  let driver: KKindredsDriver

  var body: some View {
    Color.clear
      .onChange(of: chrome.offset) { _, offset in
        driver.offsetChanged(offset)
      }
      .accessibilityHidden(true)
  }
}
