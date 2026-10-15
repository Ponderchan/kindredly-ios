// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE ME TAB (10a, H:71-86 with the owner's decisions), drawn by SwiftUI. Every word, figure and
 destination is TS's (src/screens/me/me-model.ts builds them); this draws them and reports taps.
 Its own state is only the gesture's: which segment is showing, how far the page is scrolled,
 and four measured heights.

   ME ─────────────────────────────── (sliders)      the 52pt bar: ME fades and rises as the
                                                       pen name comes in (H:71), never hidden
   ┌ profile (InkCard .me) ──────────────────────┐
   │ (avatar) pen name / JOINED / COFOUNDER   ✎ │    the avatar is a React Native island
   │ [✉ 12 LETTERS] [☺ 4 KINDREDS]              │
   └─────────────────────────────────────────────┘
   [Courier] [Aura] [Stamps] [First Class]           pinned under the bar once it gets there
   one card: the courier in her frame + keepsakes · the Aura card · your stamps · First Class
                                                       (bottom fade over the last of it)

 LAYOUT. One ScrollView over a PLAIN VStack, not a LazyVStack: the avatar, the courier scene
 and the aura art are React Native islands, and a lazy container re-parents an island's native
 view whenever it rebuilds a row (foundation list_host_pattern (f)). The page is short, so a
 plain stack costs nothing. The Host ignores every safe area, so the status-bar strip above the
 scroll view is drawn here from `topInset`, and the bar sits at its top, over the scroll view,
 on the page colour. The cards are 16 from the edges and 12 apart (H:28); the chip row runs
 edge to edge (H:73: margin 0 -16, padding 4 18 10).

 THE PINNED CHIPS. A LazyVStack's pinned section header would put the islands in a lazy
 container, so the chip row pins itself: it sits in a placeholder of its own height and, past
 the point where it reaches the bar, is drawn that far further down (offset, which moves its
 taps with it), over the card under it. Only that small row follows the scroll frame by frame
 (a KScrollModel it alone observes); the page itself never redraws as it scrolls.

 THE SEGMENTS. One card at a time (H:74-85). A chip shows its card at once, here, and tells TS
 (onSegment), which then fills that card's island — so a hidden CourierCard isn't running its
 loops while Aura is showing (critic): the courier and aura islands are only placed while
 their card is up, and TS renders nothing into them otherwise. AT ONCE means no animation: the
 chip's highlight moves on its own curve (KSegmentChips' KMotion.chip, and not at all under
 Reduce Motion), but the card is swapped in a transaction with animations off, so the old card
 never fades over the new one and the page's height never overshoots (which unpinned the chips
 for a moment). Switching while the chips are pinned scrolls (without animation) so the new
 card starts right under them. The segment area is never shorter than the screen less the bar,
 the chips and the bottom margin, so even the short First Class card can pin the chips (the
 mock's 380pt tail, measured instead).

 SCROLL REQUESTS (TS commands through the driver): top, when Me is pressed again while showing
 (the Me stack pops itself to this page first). And segment, which shows a card as a chip would
 and reports it the same way (onSegment), so TS fills that card's island.
 */

// MARK: - What the screen shows

/// One of the two figures on the profile card.
public struct KMeStat: Identifiable, Equatable, Sendable {
  /// letters | kindreds, as tapped
  public let key: String
  /// .envelope or .bubbles
  public let glyph: KLineGlyph
  /// the figure, or "–" while unknown
  public let count: String
  public let unit: String
  public let a11yLabel: String

  public var id: String { key }

  public init(key: String, glyph: KLineGlyph, count: String, unit: String, a11yLabel: String) {
    self.key = key
    self.glyph = glyph
    self.count = count
    self.unit = unit
    self.a11yLabel = a11yLabel
  }
}

/// The profile card (H:72).
public struct KMeProfile: Equatable, Sendable {
  public var name = ""
  /// "JOINED JUL 27"; "" for none
  public var joined = ""
  /// "COFOUNDER No. 007"; "" for none
  public var cofounder = ""
  public var stats: [KMeStat] = []
  /// VoiceOver's name for the pencil
  public var editLabel = ""

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

/// One stamp you have used.
public struct KMeStampCell: Identifiable, Equatable, Sendable {
  /// the stamp id (stamps.ts)
  public let id: String
  /// the day you last used it, "OCT 12"; "" for none
  public let date: String
  public let a11yLabel: String
  /// its colour, for the tile a stamp without art falls back to; "" for none
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

/// One filled keepsake tile.
public struct KMeKeepsakeTile: Identifiable, Equatable, Sendable {
  public let id: String
  public let name: String
  /// its icon (a bundled PNG as a file, through expo-asset); nil while it is on its way
  public let image: KImageRef?
  /// not opened yet: a small ind dot
  public let fresh: Bool
  /// VoiceOver's label, from TS: "{name}, new" while unopened (the dot is only drawn)
  public let a11yLabel: String

  public init(id: String, name: String, image: KImageRef?, fresh: Bool, a11yLabel: String) {
    self.id = id
    self.name = name
    self.image = image
    self.fresh = fresh
    self.a11yLabel = a11yLabel
  }
}

/// The keepsakes block under the courier's scene (H:75).
public struct KMeKeepsakes: Equatable, Sendable {
  /// KEEPSAKES
  public var header = ""
  /// 3 SO FAR
  public var count = ""
  public var note = ""
  /// two tiles: the latest keepsakes, nil for an empty (dashed) one
  public var tiles: [KMeKeepsakeTile?] = [nil, nil]
  /// VoiceOver's reading of the header
  public var a11yLabel = ""

  public init() {}
}

/// The First Class card (H:84 in the owner's cream and copy).
public struct KMeFirstClass: Equatable, Sendable {
  public var eyebrow = ""
  public var headline = ""
  public var sub = ""
  public var cta = ""
  public var stampLabel = ""
  /// the courier's live snapshot for the stamp; nil leaves its face white
  public var bird: KImageRef?

  public init() {}
}

/// Everything the screen shows, from TS.
public struct KMeContent: Equatable, Sendable {
  /// ME
  public var title = ""
  /// the pen name the bar crossfades to
  public var penName = ""
  public var settingsLabel = ""
  /// the four chips: Courier, Aura, Stamps, First Class
  public var segments: [String] = []
  public var profile = KMeProfile()
  /// nil until the first aura read: the card's skeleton
  public var aura: KMeAura?
  public var stamps = KMeStamps()
  public var keepsakes = KMeKeepsakes()
  public var firstClass = KMeFirstClass()
  /// VoiceOver's one sentence for the courier card
  public var courierA11y = ""

  public init() {}
}

/// Where the screen's taps go. One object for the life of the surface. Set the closures once.
public final class KMeActions {
  public var onSettings: () -> Void = {}
  public var onEdit: () -> Void = {}
  /// a figure: "letters" or "kindreds"
  public var onStat: (String) -> Void = { _ in }
  /// the segment now showing, after a chip or a segment command
  public var onSegment: (Int) -> Void = { _ in }
  public var onCourier: () -> Void = {}
  public var onKeepsakes: () -> Void = {}
  public var onKeepsake: (String) -> Void = { _ in }
  public var onAuraOpen: () -> Void = {}
  public var onAuraCta: () -> Void = {}
  public var onAuraShare: () -> Void = {}
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

  /// To the top of the page (the bar and the profile card).
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

// MARK: - The screen

public struct KMeScreen<Avatar: View, Courier: View, AuraArt: View>: View {
  /// the bar's height (H:71)
  public static var barHeight: CGFloat { 52 }
  /// the courier scene's height: CourierCard's SCENE_H, its band included
  public static var courierSceneHeight: CGFloat { 236 }
  static var gutter: CGFloat { 16 }
  static var gap: CGFloat { 12 }
  static var space: String { "kMeContent" }

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
  /// The bar reads this (its crossfade is over by 100pt); held in @State, not observed here.
  @State private var barChrome = KScrollModel(offsetCap: 120)
  /// The chip row reads this, frame by frame while pinned; nothing else does.
  @State private var pinChrome = KScrollModel(quantum: 0.5)
  @State private var position = ScrollPosition(edge: .top)
  /// the card showing; only ever changed with animations off
  @State private var segment: Int
  /// the chips' highlight: follows `segment`, but on the chip's own curve
  @State private var chipSelection: Int
  @State private var box = KMeBox()
  /// where the chip row's placeholder starts in the content, and its height
  @State private var chipsY: CGFloat = 0
  @State private var chipRowHeight: CGFloat = 50
  /// the scroll view's own height
  @State private var viewportHeight: CGFloat = 0

  /// - Parameters:
  ///   - initialSegment: the segment to open on (the one used last this session)
  ///   - topInset: the status bar's height (the Host ignores safe areas)
  ///   - bottomInset: how far the last of the page must clear the bottom (the tab bar and the fade)
  ///   - avatar: the user's avatar (a React Native island in the app), drawn 56 across in a circle
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

  /// how far the page has scrolled when the chips reach the bar
  private var pinOffset: CGFloat { max(0, chipsY - Self.barHeight) }

  /// the segment area is never shorter than this, so any card can pin the chips
  private var segmentMinHeight: CGFloat {
    max(0, viewportHeight - Self.barHeight - chipRowHeight - Self.gap - bottomInset)
  }

  public var body: some View {
    VStack(spacing: 0) {
      // the status bar's strip: the page colour, nothing under the clock
      Color.clear.frame(height: topInset)
      ScrollView(.vertical) {
        VStack(alignment: .leading, spacing: Self.gap) {
          // the bar's room: it is drawn over the scroll view, on the page colour
          Color.clear
            .frame(height: Self.barHeight)
            .accessibilityHidden(true)
          KProfileCard(theme: theme, profile: content.profile, actions: actions) {
            avatar
          }
          chipPlaceholder
          segmentCard
            .frame(minHeight: segmentMinHeight, alignment: .top)
            // the swap is never animated (see THE SEGMENTS), even if a caller's transaction is
            .transaction(value: segment) { t in
              t.animation = nil
              t.disablesAnimations = true
            }
        }
        .padding(.horizontal, Self.gutter)
        .coordinateSpace(.named(Self.space))
      }
      .scrollIndicators(.hidden)
      .contentMargins(.bottom, bottomInset, for: .scrollContent)
      .scrollPosition($position)
      .kScrollChrome(barChrome, pinChrome)
      .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { height in
        if abs(height - viewportHeight) > 0.5 { viewportHeight = height }
      }
      .overlay(alignment: .top) {
        KMeHeader(
          theme: theme,
          title: content.title,
          centerTitle: content.penName,
          trailingLabel: content.settingsLabel,
          chrome: barChrome,
          onTrailing: { actions.onSettings() }
        )
        // drawn over the page, read before it
        .accessibilitySortPriority(1)
      }
    }
    .accessibilityElement(children: .contain)
    .overlay(alignment: .bottom) {
      KBottomFade(theme: theme)
    }
    .background { theme.bg.ignoresSafeArea() }
    .ignoresSafeArea(.keyboard)
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

  // ── the chips: a placeholder in the stack, the row drawn over it ─────
  private var chipPlaceholder: some View {
    // read here, so this screen redraws the row when the highlight moves
    let on = chipSelection
    return Color.clear
      .frame(height: chipRowHeight)
      .frame(maxWidth: .infinity)
      .onGeometryChange(for: CGFloat.self) { $0.frame(in: .named(Self.space)).minY } action: { y in
        if abs(y - chipsY) > 0.5 { chipsY = y }
      }
      .overlay(alignment: .top) {
        KMeChipsRow(
          theme: theme,
          labels: content.segments,
          selection: Binding(get: { on }, set: { pick($0) }),
          chrome: pinChrome,
          pinOffset: pinOffset,
          rowHeight: $chipRowHeight
        )
        .padding(.horizontal, -Self.gutter)
      }
      // over the card that follows it, so the pinned row covers what scrolls under it
      .zIndex(1)
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

  /// Shows a segment at once (no transition, no height animation). Pinned, the page then goes
  /// (without animation) to where the chips pin, so the new card starts right under them.
  private func show(_ index: Int, report: Bool) {
    if chipSelection != index {
      // a command: the highlight jumps with the card
      withTransaction(Self.instant) { chipSelection = index }
    }
    guard index != segment else { return }
    let pinned = pinChrome.offset >= pinOffset - 0.5 && pinOffset > 0
    withTransaction(Self.instant) { segment = index }
    if report { actions.onSegment(index) }
    if pinned {
      let y = pinOffset
      withTransaction(Self.instant) { position.scrollTo(y: y) }
    }
  }

  // ── the one card ──────────────────────────────────────────────────────
  @ViewBuilder
  private var segmentCard: some View {
    switch segment {
    case 1:
      if let aura = content.aura {
        KAuraCard(theme: theme, aura: aura, actions: actions) {
          auraArt
        }
      } else {
        KAuraSkeleton(theme: theme)
      }
    case 2:
      KStampsCard(theme: theme, stamps: content.stamps, actions: actions)
    case 3:
      KFirstClassCard(
        variant: .card,
        eyebrow: content.firstClass.eyebrow,
        headline: content.firstClass.headline,
        sub: content.firstClass.sub,
        cta: content.firstClass.cta,
        stampLabel: content.firstClass.stampLabel,
        bird: content.firstClass.bird
      ) {
        actions.onFirstClass()
      }
    default:
      KCourierFrame(
        theme: theme,
        a11yLabel: content.courierA11y,
        sceneHeight: Self.courierSceneHeight,
        onTap: { actions.onCourier() }
      ) {
        courier
      } footer: {
        KKeepsakesBlock(theme: theme, keepsakes: content.keepsakes, actions: actions)
      }
    }
  }
}

// MARK: - The chip row

/// The four chips, edge to edge (H:73: padding 4 18 10, scrolling sideways when they don't
/// fit), on the page colour. It pins itself under the bar: past `pinOffset` it is drawn that
/// much lower, so it stays put while the page scrolls under it. The one view that follows the
/// scroll frame by frame.
struct KMeChipsRow: View {
  let theme: KTheme
  let labels: [String]
  @Binding var selection: Int
  @ObservedObject var chrome: KScrollModel
  let pinOffset: CGFloat
  @Binding var rowHeight: CGFloat

  var body: some View {
    let drop = pinOffset > 0 ? max(0, chrome.offset - pinOffset) : 0
    ScrollView(.horizontal) {
      KSegmentChips(theme: theme, labels: labels, selection: $selection, firstClassIndex: labels.count > 3 ? 3 : nil)
        .padding(.top, 4)
        .padding(.horizontal, 18)
        .padding(.bottom, 10)
    }
    .scrollIndicators(.hidden)
    .scrollBounceBehavior(.basedOnSize, axes: .horizontal)
    .fixedSize(horizontal: false, vertical: true)
    .dynamicTypeSize(...DynamicTypeSize.accessibility2)
    .background(theme.bg)
    .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { height in
      if abs(height - rowHeight) > 0.5 { rowHeight = height }
    }
    .offset(y: drop)
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
