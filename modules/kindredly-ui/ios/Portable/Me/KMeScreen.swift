// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE ME TAB (4a, 2026-10-19, with the owner's decisions), drawn by SwiftUI. Every word, figure and
 destination is TS's (src/screens/me/me-model.ts builds them); this draws them and reports taps.
 Its own state is only the gesture's: which segment is showing, the scroll, which peek is open,
 and a few measured heights.

   (72 avatar ✎) pen name                    (gear)     KMeHeader: sticky, OUTSIDE the scroll
                 joined Jul 27                            view; collapses by the scroll's first
   [✉ 10 letters ⌄] [☺ 4 kindreds ⌄]                      40pt (72→36 avatar, 22→17 name, the
   ┌ peek: 3 latest letters | 3 kindreds ┐               joined line and the two buttons gone)
   [Courier] [Aura] [Stamps] [First Class]
   ─────────────────────────────────────────────
   one segment: the courier in her frame + WREN'S LOOKS · the Aura card + the report door ·
   your stamps · the First Class card                    (bottom fade over the last of it)

 LAYOUT. The header sits above a ScrollView that holds only the segment, on a PLAIN VStack, not a
 LazyVStack: the avatar, the courier scene and the aura art are React Native islands, and a lazy
 container re-parents an island's native view whenever it rebuilds a row (foundation
 list_host_pattern (f)). The Host ignores every safe area, so the status-bar strip is drawn here
 from `topInset`. Only the header observes the scroll (a KScrollModel capped past 40), so the
 page never redraws as it moves.

 FITS ONE SCREEN = NO SCROLL (4a's rule). The segment's natural height C (its top margin and the
 bottom clearance included) is measured, and so is the room under the EXPANDED header, Vx (the
 header reports its expanded height and how much it collapses, `delta`, whenever those change:
 a peek opening, the type size; never per frame). C ≤ Vx: the scroll view is disabled and the
 header stays expanded. Otherwise the segment is given a minimum height of Vx + delta + 40, so a
 page that scrolls can always reach the fully collapsed header, and the header can never
 oscillate as the viewport grows under it (a page just over the line used to bounce).

 THE SEGMENTS. One card at a time. A chip shows its card at once and tells TS (onSegment), which
 then fills that card's island — so a hidden CourierCard isn't running its loops. The swap is
 never animated (only the chip's highlight moves, on its own curve), and the page jumps to the
 top, so the header expands (4a: segments don't inherit each other's scroll).

 SCROLL REQUESTS (TS commands through the driver): top, when Me is pressed again while showing;
 segment, which shows a card as a chip would and reports it the same way (onSegment).
 */

// MARK: - What the screen shows

/// One of the two buttons under the name.
public struct KMeStat: Identifiable, Equatable, Sendable {
  /// letters | kindreds, as tapped
  public let key: String
  /// the figure, or "–" while unknown
  public let count: String
  public let unit: String
  public let a11yLabel: String
  /// VoiceOver's hint ("Shows your latest letters")
  public let hint: String

  public var id: String { key }

  public init(key: String, count: String, unit: String, a11yLabel: String, hint: String) {
    self.key = key
    self.count = count
    self.unit = unit
    self.a11yLabel = a11yLabel
    self.hint = hint
  }
}

/// The header's person.
public struct KMeProfile: Equatable, Sendable {
  public var name = ""
  /// "joined Jul 27", plus " · COFOUNDER No. 007" for a cofounder; "" for none
  public var joined = ""
  public var stats: [KMeStat] = []
  /// VoiceOver's name for the pencil and the avatar
  public var editLabel = ""
  /// your stamp's denomination when you are a member (C2): "1ST" or "007"; "" for none
  public var stamp = ""

  public init() {}
}

/// One mini card in the letters peek.
public struct KMePeekLetter: Identifiable, Equatable, Sendable {
  public enum Tone: String, Sendable {
    case quiet, answered, replied
  }

  public let id: String
  /// 2026.09.23
  public let date: String
  public let stampId: String
  /// its colour, for a stamp this binary's table doesn't know; "" for none
  public let stampHex: String
  public let body: String
  public let tone: Tone
  /// QUIET · ANSWERED · 2 · Luna wrote back
  public let status: String
  public let a11y: String

  public init(id: String, date: String, stampId: String, stampHex: String, body: String, tone: Tone, status: String, a11y: String) {
    self.id = id
    self.date = date
    self.stampId = stampId
    self.stampHex = stampHex
    self.body = body
    self.tone = tone
    self.status = status
    self.a11y = a11y
  }
}

/// Whether a peek has been read yet, and whether it found anything.
public enum KMePeekState: String, Sendable {
  case loading, empty, ready
}

/// The letters peek.
public struct KMePeekLetters: Equatable, Sendable {
  public var state: KMePeekState = .loading
  /// the newest three
  public var items: [KMePeekLetter] = []
  /// See all 10 →
  public var seeAll = ""
  public var emptyText = ""
  /// Write a letter →
  public var emptyCta = ""

  public init() {}
}

/// One small card in the kindreds peek.
public struct KMePeekKindred: Identifiable, Equatable, Sendable {
  public let id: String
  public let name: String
  /// their last line; "" for none
  public let line: String
  public let face: KPersonFace
  public let a11y: String
  /// a member's stamp around the face (C2); nil for none
  public let stamp: KMemberStamp?

  public init(id: String, name: String, line: String, face: KPersonFace, a11y: String, stamp: KMemberStamp? = nil) {
    self.id = id
    self.name = name
    self.line = line
    self.face = face
    self.a11y = a11y
    self.stamp = stamp
  }
}

/// The kindreds peek.
public struct KMePeekKindreds: Equatable, Sendable {
  public var state: KMePeekState = .loading
  public var items: [KMePeekKindred] = []
  /// Open kindreds →
  public var open = ""
  public var emptyText = ""

  public init() {}
}

/// One tile of WREN'S LOOKS.
public struct KMeLookTile: Identifiable, Equatable, Sendable {
  /// none | beanie | scarf | fc
  public let id: String
  /// BARE · BEANIE · SCARF · 1ST CLASS (drawn)
  public let label: String
  /// Bare · Beanie · Scarf · First Class looks (VoiceOver)
  public let name: String
  public let bird: KImageRef?
  public let selected: Bool
  /// the gold lock (First Class for a free reader)
  public let locked: Bool
  /// the bird at 35%
  public let dim: Bool
  /// VoiceOver's hint; "" for none
  public let hint: String

  public init(id: String, label: String, name: String, bird: KImageRef?, selected: Bool, locked: Bool, dim: Bool, hint: String) {
    self.id = id
    self.label = label
    self.name = name
    self.bird = bird
    self.selected = selected
    self.locked = locked
    self.dim = dim
    self.hint = hint
  }
}

/// WREN'S LOOKS, under the courier card.
public struct KMeLooks: Equatable, Sendable {
  /// WREN'S LOOKS
  public var header = ""
  /// All looks →
  public var all = ""
  /// VoiceOver's hint for All looks ("Opens First Class" or "Opens Wren's wardrobe")
  public var allHint = ""
  /// always four: none, beanie, scarf, fc
  public var tiles: [KMeLookTile] = []

  public init() {}
}

/// One label on the Aura card.
public struct KMeAuraChip: Identifiable, Equatable, Sendable {
  public let id: String
  public let name: String
  /// still trying on: drawn dashed
  public let emerging: Bool

  public init(id: String, name: String, emerging: Bool) {
    self.id = id
    self.name = name
    self.emerging = emerging
  }
}

/// The Aura card's well: counts, never a bar (owner).
public struct KMeAuraMeter: Equatable, Sendable {
  public enum Kind: String, Sendable {
    /// letters on the way to the first label
    case ticks
    /// the labels a name needs
    case slots
  }

  public var kind: Kind = .ticks
  public var filled = 0
  public var total = 5
  /// the strongest held label's "n of your last m", as five slips; nil for none
  public var slips: (n: Int, of: Int)?

  public init() {}

  public static func == (a: KMeAuraMeter, b: KMeAuraMeter) -> Bool {
    a.kind == b.kind && a.filled == b.filled && a.total == b.total && a.slips?.n == b.slips?.n && a.slips?.of == b.slips?.of
  }
}

/// The Aura card (H:78).
public struct KMeAura: Equatable, Sendable {
  /// YOUR WRITING AURA
  public var label = ""
  public var title = ""
  /// FROM YOUR 12 LETTERS
  public var from = ""
  public var chips: [KMeAuraChip] = []
  public var meter = KMeAuraMeter()
  public var caption = ""
  public var cta = ""
  /// named: the share key shows
  public var share = false
  public var shareLabel = ""

  public init() {}
}

/// The report door under the Aura card (O6): four states, decided in TS.
public struct KMeReport: Equatable, Sendable {
  public var show = false
  public var title = ""
  public var sub = ""
  /// a tap opens something (the report, or First Class when locked)
  public var enabled = false
  /// First Class only: the gold lock
  public var locked = false
  /// VoiceOver's hint; "" for none
  public var hint = ""

  public init() {}
}

/// One stamp you have used.
public struct KMeStampCell: Identifiable, Equatable, Sendable {
  /// the stamp id (stamps.ts)
  public let id: String
  /// the day you last used it, "OCT 12"; "" for none
  public let date: String
  public let a11yLabel: String
  /// its colour, for the template KStamp draws an id this binary's table doesn't know in; "" for none
  public let hex: String

  public init(id: String, date: String, a11yLabel: String, hex: String) {
    self.id = id
    self.date = date
    self.a11yLabel = a11yLabel
    self.hex = hex
  }
}

/// The Stamps card (owner's placeholder, H:81).
public struct KMeStamps: Equatable, Sendable {
  /// YOUR STAMPS
  public var label = ""
  /// 7 USED
  public var count = ""
  public var cells: [KMeStampCell] = []
  public var emptyText = ""
  public var emptyCta = ""

  public init() {}
}

/// The First Class segment's card (4a, Prompt 6).
public struct KMeFirstClass: Equatable, Sendable {
  /// FIRST CLASS
  public var eyebrow = ""
  public var headline = ""
  /// the three rows with gold checks
  public var rows: [String] = []
  /// See First Class →
  public var cta = ""
  /// 7 DAYS FREE; "" for none (no trial on offer, or a member)
  public var trial = ""
  /// 1ST, or MEMBER
  public var stampLabel = ""
  /// the courier's live snapshot for the stamp; nil leaves its face cream
  public var bird: KImageRef?
  public var member = false

  public init() {}
}

/// VoiceOver's words the header and the looks need beyond the records.
public struct KMeA11yWords: Equatable, Sendable {
  public var expanded = ""
  public var collapsed = ""
  public var seeAllAction = ""
  public var openKindredsAction = ""
  public var locked = ""

  public init() {}
}

/// Everything the screen shows, from TS.
public struct KMeContent: Equatable, Sendable {
  public var settingsLabel = ""
  /// the four chips: Courier, Aura, Stamps, First Class
  public var segments: [String] = []
  public var profile = KMeProfile()
  public var peekLetters = KMePeekLetters()
  public var peekKindreds = KMePeekKindreds()
  public var looks = KMeLooks()
  /// nil until the first aura read: the card's skeleton
  public var aura: KMeAura?
  public var report = KMeReport()
  public var stamps = KMeStamps()
  public var firstClass = KMeFirstClass()
  /// VoiceOver's one sentence for the courier card
  public var courierA11y = ""
  public var a11y = KMeA11yWords()

  public init() {}
}

/// Where the screen's taps go. One object for the life of the surface. Set the closures once.
public final class KMeActions {
  public var onSettings: () -> Void = {}
  public var onEdit: () -> Void = {}
  /// a peek opened or closed: "letters" | "kindreds" (analytics only)
  public var onPeek: (String, Bool) -> Void = { _, _ in }
  public var onPeekLetter: (String) -> Void = { _ in }
  public var onPeekKindred: (String) -> Void = { _ in }
  /// See all n →
  public var onSeeAll: () -> Void = {}
  /// Open kindreds →
  public var onOpenKindreds: () -> Void = {}
  /// the empty letters peek's Write a letter →
  public var onWrite: () -> Void = {}
  /// the segment now showing, after a chip or a segment command
  public var onSegment: (Int) -> Void = { _ in }
  public var onCourier: () -> Void = {}
  /// a looks tile: none | beanie | scarf | fc
  public var onLook: (String) -> Void = { _ in }
  public var onAllLooks: () -> Void = {}
  public var onAuraOpen: () -> Void = {}
  public var onAuraCta: () -> Void = {}
  public var onAuraShare: () -> Void = {}
  public var onReport: () -> Void = {}
  public var onStampsEmpty: () -> Void = {}
  public var onFirstClass: () -> Void = {}

  public init() {}
}

/// What TS's commands reach (through the adapter): scroll to the top, show a segment.
public final class KMeDriver: ObservableObject {
  struct ScrollRequest: Equatable {
    let animated: Bool
    let serial: Int
  }

  struct SegmentRequest: Equatable {
    let index: Int
    let serial: Int
  }

  @Published private(set) var scrollRequest: ScrollRequest?
  @Published private(set) var segmentRequest: SegmentRequest?
  private var serial = 0

  public init() {}

  /// To the top of the page (the header expands).
  public func scrollToTop(animated: Bool = true) {
    serial += 1
    scrollRequest = ScrollRequest(animated: animated, serial: serial)
  }

  /// Shows a segment as its chip would, and reports it as a chip does (onSegment), so the app
  /// fills that card's island.
  public func showSegment(_ index: Int) {
    serial += 1
    segmentRequest = SegmentRequest(index: index, serial: serial)
  }
}

/// What the screen keeps without drawing.
final class KMeBox {
  var scrollSerial = 0
  var segmentSerial = 0
}

/// The header's two measured facts the fit rule needs: its height expanded, and how much
/// shorter it is collapsed.
struct KMeHeaderMetrics: Equatable {
  var expanded: CGFloat = 0
  var delta: CGFloat = 0
}

// MARK: - The screen

public struct KMeScreen<Avatar: View, Courier: View, AuraArt: View>: View {
  /// the avatar island's side: always drawn 72 and scaled, so React Native never re-lays it out
  public static var avatarIsland: CGFloat { 72 }
  /// the courier scene's height: CourierCard's SCENE_H, its band included
  public static var courierSceneHeight: CGFloat { 236 }
  static var gutter: CGFloat { 16 }
  static var gap: CGFloat { 12 }
  /// 4a's scroll content starts 12 below the header (the container's gap)
  static var topMargin: CGFloat { 12 }
  /// how far past the collapse a page that scrolls can always go (the fit rule's 40)
  static var collapseSlack: CGFloat { 40 }

  private let theme: KTheme
  private let content: KMeContent
  private let initialSegment: Int
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let driver: KMeDriver
  private let actions: KMeActions
  private let avatar: Avatar
  private let courier: Courier
  private let auraArt: AuraArt

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /// The header reads this (k = offset / 40); held in @State, never observed here.
  @State private var chrome = KScrollModel(offsetCap: 48, quantum: 0.5)
  @State private var position = ScrollPosition(edge: .top)
  /// the card showing; only ever changed with animations off
  @State private var segment: Int
  /// the chips' highlight: follows `segment`, but on the chip's own curve
  @State private var chipSelection: Int
  @State private var box = KMeBox()
  /// the room under the status strip (header + scroll view)
  @State private var areaHeight: CGFloat = 0
  /// the segment's natural height, its margins included
  @State private var contentHeight: CGFloat = 0
  @State private var header = KMeHeaderMetrics()

  /// - Parameters:
  ///   - initialSegment: the segment to open on (the one used last this session)
  ///   - topInset: the status bar's height (the Host ignores safe areas)
  ///   - bottomInset: how far the last of the page must clear the bottom (the tab bar and the fade)
  ///   - avatar: the user's avatar (a React Native island in the app), drawn avatarIsland across
  ///   - courier: the courier's live scene, as wide as the frame's inside, courierSceneHeight tall
  ///   - auraArt: the Aura card's picture, as wide as the card's inside, 110 tall
  public init(
    theme: KTheme,
    content: KMeContent,
    initialSegment: Int,
    topInset: CGFloat,
    bottomInset: CGFloat,
    driver: KMeDriver,
    actions: KMeActions,
    @ViewBuilder avatar: () -> Avatar,
    @ViewBuilder courier: () -> Courier,
    @ViewBuilder auraArt: () -> AuraArt
  ) {
    self.theme = theme
    self.content = content
    self.initialSegment = initialSegment
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.driver = driver
    self.actions = actions
    self.avatar = avatar()
    self.courier = courier()
    self.auraArt = auraArt()
    _segment = State(initialValue: Self.clampSegment(initialSegment))
    _chipSelection = State(initialValue: Self.clampSegment(initialSegment))
  }

  /// A transaction that animates nothing, whatever transaction it is opened inside.
  static var instant: Transaction {
    var t = Transaction()
    t.disablesAnimations = true
    return t
  }

  static func clampSegment(_ i: Int) -> Int {
    (0..<4).contains(i) ? i : 0
  }

  /// The fit rule (see the top): nil when the segment fits under the expanded header (no
  /// scroll), else the minimum height that lets the header collapse fully.
  static func scrollFloor(content: CGFloat, area: CGFloat, header: KMeHeaderMetrics) -> CGFloat? {
    guard area > 0, header.expanded > 0 else { return nil }
    let room = area - header.expanded
    if content <= room + 0.5 { return nil }
    return max(content, room + header.delta + collapseSlack)
  }

  private var floor: CGFloat? {
    Self.scrollFloor(content: contentHeight, area: areaHeight, header: header)
  }

  public var body: some View {
    let floor = self.floor
    VStack(spacing: 0) {
      // the status bar's strip: the page colour, nothing under the clock
      Color.clear.frame(height: topInset)
      VStack(spacing: 0) {
        KMeHeader(
          theme: theme,
          content: content,
          chrome: chrome,
          selection: Binding(get: { chipSelection }, set: { pick($0) }),
          actions: actions,
          onMetrics: { m in
            if abs(m.expanded - header.expanded) > 0.5 || abs(m.delta - header.delta) > 0.5 { header = m }
          }
        ) {
          avatar
        }
        .zIndex(1)
        ScrollView(.vertical) {
          segmentCard
            .padding(.horizontal, Self.gutter)
            .padding(.top, Self.topMargin)
            .padding(.bottom, bottomInset)
            .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { h in
              if abs(h - contentHeight) > 0.5 { contentHeight = h }
            }
            .frame(minHeight: floor ?? 0, alignment: .top)
            // the swap is never animated (see THE SEGMENTS), even if a caller's transaction is
            .transaction(value: segment) { t in
              t.animation = nil
              t.disablesAnimations = true
            }
        }
        .scrollIndicators(.hidden)
        .scrollDisabled(floor == nil)
        .scrollPosition($position)
        .kScrollChrome(chrome)
      }
      .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { h in
        if abs(h - areaHeight) > 0.5 { areaHeight = h }
      }
    }
    .accessibilityElement(children: .contain)
    .overlay(alignment: .bottom) {
      KBottomFade(theme: theme)
    }
    .background { theme.bg.ignoresSafeArea() }
    .ignoresSafeArea(.keyboard)
    .onChange(of: floor == nil) { _, fits in
      // a page that stopped scrolling (a peek closed, the card got shorter) goes back to the top
      if fits { withTransaction(Self.instant) { position.scrollTo(edge: .top) } }
    }
    .onReceive(driver.$scrollRequest) { request in
      guard let request, request.serial > box.scrollSerial else { return }
      box.scrollSerial = request.serial
      if request.animated && !reduceMotion {
        withAnimation(.easeInOut(duration: 0.35)) { position.scrollTo(edge: .top) }
      } else {
        position.scrollTo(edge: .top)
      }
    }
    .onReceive(driver.$segmentRequest) { request in
      guard let request, request.serial > box.segmentSerial else { return }
      box.segmentSerial = request.serial
      // reported like a chip, or TS would keep filling the old card's island and leave the new
      // card's frame empty
      show(Self.clampSegment(request.index), report: true)
    }
  }

  /// A chip, tapped (inside KSegmentChips' withAnimation(KMotion.chip)): the highlight moves on
  /// that curve, or at once under Reduce Motion; the card is shown at once either way.
  private func pick(_ index: Int) {
    if reduceMotion {
      withTransaction(Self.instant) { chipSelection = index }
    } else {
      chipSelection = index
    }
    show(index, report: true)
  }

  /// Shows a segment at once (no transition, no height animation), at the top of the page, so
  /// the header expands (4a: switching segments resets the scroll).
  private func show(_ index: Int, report: Bool) {
    if chipSelection != index {
      // a command: the highlight jumps with the card
      withTransaction(Self.instant) { chipSelection = index }
    }
    guard index != segment else { return }
    withTransaction(Self.instant) {
      segment = index
      position.scrollTo(edge: .top)
    }
    if report { actions.onSegment(index) }
  }

  // ── the one card ──────────────────────────────────────────────────────
  @ViewBuilder
  private var segmentCard: some View {
    switch segment {
    case 1:
      VStack(alignment: .leading, spacing: Self.gap) {
        if let aura = content.aura {
          KAuraCard(theme: theme, aura: aura, actions: actions) {
            auraArt
          }
        } else {
          KAuraSkeleton(theme: theme)
        }
        if content.report.show {
          KReportDoorRow(theme: theme, report: content.report) { actions.onReport() }
        }
      }
    case 2:
      KStampsCard(theme: theme, stamps: content.stamps, actions: actions)
    case 3:
      KMeFirstClassCard(card: content.firstClass) { actions.onFirstClass() }
    default:
      VStack(alignment: .leading, spacing: Self.gap) {
        KCourierFrame(
          theme: theme,
          a11yLabel: content.courierA11y,
          sceneHeight: Self.courierSceneHeight,
          onTap: { actions.onCourier() }
        ) {
          courier
        } footer: {
          EmptyView()
        }
        KLooksTray(theme: theme, looks: content.looks, a11y: content.a11y, actions: actions)
      }
    }
  }
}

// MARK: - The First Class card (4a, Prompt 6)

/*
 Cream paper (KBrand, the same in every theme): a 1.5 cream-border outline, corners of 24, padding
 18 18 16, 14 between its parts:
 - the eyebrow: a 7pt wax-gold dot and FIRST CLASS in mono 10 at .18em, gold text;
 - the headline in the serif 26/1.1, 100 clear on the right for the stamp;
 - three rows of system 14 (7 apart), each after a 16 gold check at stroke 2.6, also 100 clear;
 - the foot: an ink button 40 tall (padding 0 16, corners 14, system 600 14 in white) and, at the
   far right, 7 DAYS FREE in mono 10 at .1em, gold — only when TS says a free trial is on offer;
 - the stamp, 16 from the right and 18 from the top, turned 5°: 82 × 100, white, corners 4, a 2pt
   dotted wax-gold edge, 5 of padding round a cream face with the bird at 70% and 1ST in mono
   600 8, gold, at its bottom right.
 The whole card is one button and one VoiceOver element. The headline grows with the type; the
 stamp stays its size.
 */
struct KMeFirstClassCard: View {
  let card: KMeFirstClass
  let onPress: () -> Void

  static var eyebrowStyle: KTextStyle { .mono(10, .semibold, tracking: 0.18) }
  static var headlineStyle: KTextStyle { .letter(26, lineHeight: 1.1) }
  static var rowStyle: KTextStyle { .system(14) }
  static var trialStyle: KTextStyle { .mono(10, .semibold, tracking: 0.1) }
  static var stampSize: CGSize { CGSize(width: 82, height: 100) }
  /// the room the words leave the stamp
  static var stampRoom: CGFloat { 100 }

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: 24, style: .circular)
    SwiftUI.Button(action: onPress) {
      VStack(alignment: .leading, spacing: 14) {
        HStack(spacing: 6) {
          Circle().fill(KBrand.waxGold).frame(width: 7, height: 7)
          Text(card.eyebrow)
            .textCase(.uppercase)
            .kText(Self.eyebrowStyle)
            .foregroundStyle(KBrand.goldText)
            .lineLimit(1)
        }
        Text(card.headline)
          .kText(Self.headlineStyle)
          .foregroundStyle(KBrand.inkOnBrand)
          .fixedSize(horizontal: false, vertical: true)
          .padding(.trailing, Self.stampRoom)
        VStack(alignment: .leading, spacing: 7) {
          ForEach(Array(card.rows.enumerated()), id: \.offset) { _, row in
            HStack(alignment: .firstTextBaseline, spacing: 8) {
              KLineIcon(.check, size: 16, lineWidth: 2.6, color: KBrand.goldText)
                .alignmentGuide(.firstTextBaseline) { d in d[VerticalAlignment.center] + 5 }
              Text(row)
                .kText(Self.rowStyle)
                .foregroundStyle(KBrand.inkOnBrand)
                .fixedSize(horizontal: false, vertical: true)
            }
          }
        }
        .padding(.trailing, Self.stampRoom)
        HStack(alignment: .center, spacing: 12) {
          Text(card.cta)
            .kText(.button)
            .foregroundStyle(KBrand.paperWhite)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
            .padding(.horizontal, 16)
            .frame(minHeight: 40)
            .background(RoundedRectangle(cornerRadius: 14, style: .circular).fill(KBrand.inkOnBrand))
          Spacer(minLength: 0)
          if !card.trial.isEmpty {
            Text(card.trial)
              .kText(Self.trialStyle)
              .foregroundStyle(KBrand.goldText)
              .lineLimit(1)
              .minimumScaleFactor(0.8)
          }
        }
        .padding(.top, 4)
      }
      .padding(.top, 18 + 1.5)
      .padding(.horizontal, 18 + 1.5)
      .padding(.bottom, 16 + 1.5)
      .frame(maxWidth: .infinity, alignment: .leading)
      .overlay(alignment: .topTrailing) {
        stamp
          .padding(.top, 18)
          .padding(.trailing, 16)
      }
      .background(shape.fill(KBrand.cream))
      .overlay(shape.strokeBorder(KBrand.creamBorder, lineWidth: 1.5))
      .clipShape(shape)
      .contentShape(shape)
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel([card.eyebrow, card.headline, card.rows.joined(separator: ", "), card.trial].filter { !$0.isEmpty }.joined(separator: ". "))
    .accessibilityHint(card.cta.replacingOccurrences(of: "→", with: "").trimmingCharacters(in: .whitespaces))
    .accessibilityAddTraits(.isButton)
  }

  private var stamp: some View {
    let size = Self.stampSize
    let inner = CGSize(width: size.width - 14, height: size.height - 14)
    return ZStack {
      RoundedRectangle(cornerRadius: 2, style: .circular).fill(KBrand.cream)
      KImage(card.bird, size: CGSize(width: inner.width * 0.7, height: inner.width * 0.7), contentMode: .fit, placeholder: .clear)
    }
    .frame(width: inner.width, height: inner.height)
    .overlay(alignment: .bottomTrailing) {
      Text(card.stampLabel)
        .kText(.mono(8, .semibold))
        .foregroundStyle(KBrand.goldText)
        .lineLimit(1)
        .fixedSize()
        .padding(.trailing, 5)
        .padding(.bottom, 4)
    }
    .clipShape(RoundedRectangle(cornerRadius: 2, style: .circular))
    .padding(5)
    .frame(width: size.width, height: size.height)
    .background(RoundedRectangle(cornerRadius: 4, style: .circular).fill(KBrand.paperWhite))
    // CSS's 2px dotted: round dots 2 across, 4 apart
    .overlay(RoundedRectangle(cornerRadius: 4, style: .circular).strokeBorder(KBrand.waxGold, style: StrokeStyle(lineWidth: 2, lineCap: .round, dash: [0.001, 4])))
    .rotationEffect(.degrees(5))
    .dynamicTypeSize(.large)
    .accessibilityHidden(true)
  }
}

// MARK: - The Aura card's skeleton

/// Before the first aura read ever lands (no kept copy yet): the card's own silhouette, so the
/// page doesn't grow under the thumb. Nothing for VoiceOver to read.
struct KAuraSkeleton: View {
  let theme: KTheme

  var body: some View {
    InkCard(theme: theme, variant: .me, spacing: 12) {
      RoundedRectangle(cornerRadius: 6, style: .circular).fill(theme.soft2).frame(width: 132, height: 22)
      RoundedRectangle(cornerRadius: 14, style: .circular).fill(theme.soft2).frame(height: KAuraCardMetrics.artHeight)
      RoundedRectangle(cornerRadius: 6, style: .circular).fill(theme.soft2).frame(width: 220, height: 24)
      RoundedRectangle(cornerRadius: 4, style: .circular).fill(theme.soft2).frame(width: 150, height: 12)
      RoundedRectangle(cornerRadius: 14, style: .circular).fill(theme.soft2).frame(height: 44).padding(.top, 30)
    }
    .accessibilityHidden(true)
  }
}
