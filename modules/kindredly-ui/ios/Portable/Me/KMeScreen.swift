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

 THE COURIER'S PLANET (2026-11-11, docs/courier-planet.md; `content.planet`, nil unless TS's
 "meplanet" switch is on). With it the segments and the header are gone and Me is one scroll
 with the planet as its cover (KMeCover.swift has the picture: the cover, you under it, then
 this page's her card, the two tiles about your writing and First Class). What follows is the
 first layout, kept for the record; the cover replaced its header and its scene:

   (72 avatar ✎) pen name                    (gear)     the header, as above, without row 3
   ┌ her card ───────────────────────────────┐          KMePlanetCard, white under the sky: the
   │ sky, planet, Wren        (◎ planet page) │          small whole planet, her flight log (its
   │ (mark) PIP · FLIGHT LOG        [Open]    │          rows, a lamp on the one she is at),
   │  ● row  ◉ row  ○ row                     │          four looks
   │ [look][look][look][look]    All looks →  │
   └──────────────────────────────────────────┘
   ┌ Aura ─────────┐ ┌ Stamps ────────┐                  white, each opens its own page
   ┌ the writing report ───────────────────── ›┐
   ┌ First Class card (not for a member) ──────┐

 Every block stands off the page on the same soft shadow (KSoftLift); none has a colour of its
 own. The First Class forms by the day keep their places: the boarding pass and the sealed
 report over her card, the Post's letter on its top edge (left of the round button). While the
 pass or the sealed report is up, the report row and the card at the foot step aside; the
 pull-tab is not drawn on this page. The fit rule and the scroll requests are the same; a
 segment request does nothing.
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
  /// none | beanie | scarf | fc; in Halloween none | witch | ghost | fc
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
  /// always four: none, beanie, scarf, fc (in Halloween none, witch, ghost, fc)
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

/// One of my own photo stamps in MADE BY YOU ("c:<uuid>"; KStamp draws it from KCustomStamps).
public struct KMeMadeCell: Identifiable, Equatable, Sendable {
  public let id: String
  /// "#first snow", lower case; "" for none
  public let topic: String
  /// made in the last 24 hours: the lime "new" sticker
  public let fresh: Bool
  /// "taken down", "checking…" under it instead of the topic; "" for none
  public let note: String
  public let a11yLabel: String

  public init(id: String, topic: String, fresh: Bool, note: String, a11yLabel: String) {
    self.id = id
    self.topic = topic
    self.fresh = fresh
    self.note = note
    self.a11yLabel = a11yLabel
  }
}

/// A stranger's photo stamp kept in the album.
public struct KMeStrangerCell: Identifiable, Equatable, Sendable {
  public let id: String
  /// "FROM SUNDAY KITE"
  public let from: String
  public let a11yLabel: String

  public init(id: String, from: String, a11yLabel: String) {
    self.id = id
    self.from = from
    self.a11yLabel = a11yLabel
  }
}

/// The Stamps card (owner's final Prompt 1, custom stamps): MADE BY YOU · FROM STRANGERS · YOUR
/// STAMPS · Open the album. Every word from TS.
public struct KMeStamps: Equatable, Sendable {
  // ── YOUR STAMPS: the official stamps you have used (at most three here) ──
  /// YOUR STAMPS
  public var label = ""
  /// 7 USED
  public var count = ""
  public var cells: [KMeStampCell] = []
  /// none used yet: the owner's line, and "Write a letter →"
  public var emptyText = ""
  public var emptyCta = ""
  /// the empty state's three dashed slots, each in a category's colour ("#RRGGBB")
  public var yoursSlots: [String] = []

  // ── MADE BY YOU (shown only when the press and 0038 are both there, D10) ──
  public var madeShow = false
  public var madeLabel = ""
  /// "2 OF 3 FREE" or "UNLIMITED"
  public var madeQuota = ""
  /// the quota in the gold ink (First Class, Cofounder)
  public var madeQuotaGold = false
  /// "See all →" when there are more than two; "" for none
  public var seeAll = ""
  public var makeOne = ""
  /// none made yet: "Photograph a moment." and its sub
  public var emptyTitle = ""
  public var emptySub = ""
  /// VoiceOver for the blank stamp: "Make a stamp"
  public var makeA11y = ""
  /// the two newest
  public var made: [KMeMadeCell] = []
  public var newLabel = ""
  /// Free with all three made: the blank stamp opens the small card instead of the camera
  public var full = false
  public var fullTitle = ""
  public var fullSub = ""
  public var fullCta = ""
  public var notNow = ""
  /// "Your stamp is ready." once after an approval, "" for none; its action and the stamp's id
  public var ready = ""
  public var readyCta = ""
  public var readyId = ""

  // ── FROM STRANGERS ──
  public var strangersLabel = ""
  public var strangersCount = ""
  public var strangers: [KMeStrangerCell] = []
  /// none kept: the owner's light line
  public var strangersEmpty = ""

  /// "Open the album →"; "" hides it (all three areas empty)
  public var album = ""

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
  /// her look, drawn by Swift (KWrenBird) on the stamp instead of the snapshot; nil for the
  /// snapshot. The courier's planet sends this: nothing on that page is a picture of her
  public var wren: KWrenLook?
  public var member = false

  public init() {}
}

/// First Class by the day (lib/fc-rollout-core decides): the form and every word it shows.
public struct KMeFcRollout: Equatable, Sendable {
  /// "none" | "invite" | "seat" | "report" | "tab"
  public var form = "none"
  /// the pull-tab on the right edge (with "tab" and "report")
  public var tab = false
  public var firstClass = ""
  public var post = ""
  public var envelopeA11y = ""
  public var seatTimer = ""
  public var seatHead = ""
  public var seatPerks = ""
  public var open = ""
  public var reportEyebrow = ""
  public var reportSealed = ""
  public var reportHead = ""
  public var reportCta = ""
  public var tabA11y = ""

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
  /// First Class by the day (the owner's rollout, 2026-10-20): which form shows, and its words
  public var fc = KMeFcRollout()
  /// VoiceOver's one sentence for the courier card
  public var courierA11y = ""
  public var a11y = KMeA11yWords()
  /// the courier's planet (docs/courier-planet.md): with it Me is one page and the segments
  /// are gone; nil for the page of segments
  public var planet: KMePlanet?

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
  /// the cover's notes number: your notes
  public var onNotes: () -> Void = {}
  /// the empty letters peek's Write a letter →
  public var onWrite: () -> Void = {}
  /// the segment now showing, after a chip or a segment command
  public var onSegment: (Int) -> Void = { _ in }
  public var onCourier: () -> Void = {}
  /// a looks tile: none | beanie | scarf | fc (or witch | ghost in Halloween)
  public var onLook: (String) -> Void = { _ in }
  public var onAllLooks: () -> Void = {}
  public var onAuraOpen: () -> Void = {}
  public var onAuraCta: () -> Void = {}
  public var onAuraShare: () -> Void = {}
  public var onReport: () -> Void = {}
  public var onStampsEmpty: () -> Void = {}
  /// the Stamps card (custom stamps): make | fullCta | seeAll | album | stamp (id) | ready (id)
  public var onStamps: (_ action: String, _ id: String) -> Void = { _, _ in }
  public var onFirstClass: () -> Void = {}
  /// one of the rollout's forms was tapped: "invite" | "seat" | "report" | "tab"
  public var onFcOpen: (String) -> Void = { _ in }
  /// her card's round button: the planet page
  public var onTrack: () -> Void = {}
  /// a tap on her card's planet landed on something: "wren" | "letter" | "stamp" (and its letter's id)
  public var onPlanetTap: (_ what: String, _ id: String) -> Void = { _, _ in }

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
  /// this is the page on show in the Me tab (false under Settings, Edit profile and the tab's
  /// other pages, which stand over it with the tab bar still up: its keys leave the band then)
  private let active: Bool
  private let driver: KMeDriver
  private let actions: KMeActions
  private let avatar: Avatar
  private let courier: Courier
  private let auraArt: AuraArt

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /* A FOLDING PHONE (KFold; iPhone Duo, 2026-11-12). There this screen is the whole window, so
     the cover's sky runs edge to edge, under the system's band and beside the column; what is
     read and pressed (her face and name, the cards, the old segments page) keeps to the column:
     `fold.frame.left` and `.right`, both 0 on a phone. */
  @ObservedObject private var fold = KFold.shared
  /// Edit and the gear stand in the band on a folding phone (KRailTools)
  @ObservedObject private var railTools = KRailTools.shared
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
  // the cover (KMeCover.swift): how far the page is pulled down at its top, how far the cover has
  // folded into its bar (0…1), and whether letting go now opens the planet page
  @State private var pull: CGFloat = 0
  @State private var folded: CGFloat = 0
  @State private var armed = false

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
    active: Bool = true,
    @ViewBuilder avatar: () -> Avatar,
    @ViewBuilder courier: () -> Courier,
    @ViewBuilder auraArt: () -> AuraArt
  ) {
    self.theme = theme
    self.content = content
    self.active = active
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

  /// what the page keeps clear at its foot: the host's number, or the short fade's with the tab
  /// bar in the band (KBottomFade.foot)
  private var foot: CGFloat { KBottomFade.foot(bottomInset, in: fold.frame) }

  /// everything the band's Edit and gear show: they are published again when it changes
  private var toolsSignature: String {
    [theme.key, content.planet == nil ? "segments" : "cover", active ? "on" : "under", content.profile.editLabel, content.settingsLabel].joined(separator: "|")
  }

  /// Edit and the gear, for the band: round keys that do what the two in the page do. Only on
  /// the page with her planet's cover (the older page keeps its own header as it is).
  private func publishTools() {
    guard content.planet != nil, active else {
      KRailTools.shared.set(.me, [])
      return
    }
    let theme = theme
    let actions = actions
    KRailTools.shared.set(.me, [
      KRailTool(KMeTool.edit) {
        KRailKey(theme: theme, label: content.profile.editLabel, action: { actions.onEdit() }) {
          KLineIcon(.pen, size: 20, lineWidth: 1.9, color: theme.ink)
        }
      },
      KRailTool(KMeTool.settings) {
        KRailKey(theme: theme, label: content.settingsLabel, action: { actions.onSettings() }) {
          KLineIcon(.gear, size: 21, lineWidth: 1.9, color: theme.ink)
        }
      },
    ])
  }

  public var body: some View {
    Group {
      if let planet = content.planet {
        if fold.frame.twoPages {
          spreadBody(planet)
        } else {
          coverBody(planet)
        }
      } else {
        segmentsBody
          .padding(.leading, fold.frame.left)
          .padding(.trailing, fold.frame.right)
      }
    }
    .accessibilityElement(children: .contain)
    // Edit and the gear, for the band on a folding phone (KRailTools): again whenever they change
    .onChange(of: toolsSignature, initial: true) { _, _ in
      publishTools()
    }
    // gone, its keys go with it; back again, they are published again (KKindredsScreen)
    .onAppear { publishTools() }
    .onDisappear { KRailTools.shared.set(.me, []) }
    .overlay(alignment: .bottom) {
      // (THE SPREAD: the fade is the right page's own; her planet's page runs to the foot)
      if !fold.frame.twoPages {
        KBottomFade(theme: theme)
      }
    }
    .overlay {
      // the planet's page has no pull-tab: it would sit on her card's Open and All looks, and the
      // First Class card at the page's foot is the standing way in
      if content.fc.tab, content.planet == nil {
        GeometryReader { g in
          KFcPullTab(fc: content.fc) { actions.onFcOpen("tab") }
            .position(x: g.size.width - KFcPullTab.size.width / 2, y: g.size.height * 0.52)
        }
        .transition(.move(edge: .trailing))
      }
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
      // the planet's page has no segments to show
      guard content.planet == nil else { return }
      // reported like a chip, or TS would keep filling the old card's island and leave the new
      // card's frame empty
      show(Self.clampSegment(request.index), report: true)
    }
  }

  /// The page of segments: the status strip, the sticky header, the segment showing.
  private var segmentsBody: some View {
    let floor = self.floor
    return VStack(spacing: 0) {
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
          page
            .padding(.horizontal, Self.gutter)
            .padding(.top, Self.topMargin)
            .padding(.bottom, foot)
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
  }

  /// The courier's planet as the page's cover (KMeCover.swift): one scroll, the cover first; a
  /// pull at the top stretches it, and letting go past the line opens the planet page.
  private func coverBody(_ planet: KMePlanet) -> some View {
    let base = topInset + KMeCoverMetrics.body
    // the scroll at which the bar has taken over: the cover gone but for the bar's own height
    let gone = KMeCoverMetrics.body - KMeCoverMetrics.bar
    return ScrollView(.vertical) {
      VStack(spacing: 0) {
        // drawn taller while pulled, laid out at its own height: the extra reaches up into the gap
        KMeCover(planet: planet, topInset: topInset, pull: pull, actions: coverActions())
          .frame(height: base + pull)
          .frame(height: base, alignment: .bottom)
          // VoiceOver can't pull: the way to the planet page is a button only it sees, over the
          // planet (which it skips), so a finger still pulls and scrolls through it
          .background(alignment: .top) {
            Color.clear
              .frame(height: max(1, base - 120))
              .allowsHitTesting(false)
              .accessibilityElement()
              .accessibilityLabel(planet.track)
              .accessibilityAddTraits(.isButton)
              .accessibilityAction { actions.onTrack() }
          }
        KMeIdentity(theme: theme, profile: content.profile, me: planet.me, settingsLabel: content.settingsLabel, actions: actions, taken: railTools.taken(.me), avatar: avatar)
          .padding(.leading, fold.frame.left)
          .padding(.trailing, fold.frame.right)
        KMePlanetPage(content: content, planet: planet, theme: theme, actions: actions) {
          auraArt
        }
        .padding(.horizontal, Self.gutter)
        .padding(.bottom, foot)
        .padding(.leading, fold.frame.left)
        .padding(.trailing, fold.frame.right)
      }
    }
    .scrollIndicators(.hidden)
    .scrollPosition($position)
    .onScrollGeometryChange(for: CGFloat.self) { g in
      g.contentOffset.y + g.contentInsets.top
    } action: { _, y in
      // kept coarse, so an ordinary scroll between the two ends redraws nothing
      let p = (max(0, -y) * 2).rounded() / 2
      if p != pull { pull = p }
      let f = (min(max((y - (gone - 46)) / 46, 0), 1) * 25).rounded() / 25
      if f != folded { folded = f }
      let a = p >= KMeCoverMetrics.open
      if a != armed { armed = a }
    }
    .onScrollPhaseChange { old, new in
      if old == .interacting, new != .interacting, armed { actions.onTrack() }
    }
    .sensoryFeedback(.impact(weight: .light), trigger: armed) { _, now in now }
    .overlay(alignment: .top) {
      KMeCoverBar(
        palette: planet.planet.palette,
        name: content.profile.name,
        editLabel: content.profile.editLabel,
        settingsLabel: content.settingsLabel,
        topInset: topInset,
        shown: folded,
        actions: actions,
        taken: railTools.taken(.me)
      )
    }
  }

  /* THE SPREAD (iPhone Duo's inner screen; the canvas's Me: "她的星球，整页 | 你的资料、她的工牌、
     皮肤"; owner, 2026-11-12: "要把整个屏都利用起来"). While the window is two pages her planet is
     the whole left page (KMeCover as a page: the big planet, the two ways in at its foot) and you
     are the right page: your face and name, then her card and the tiles, scrolling on their own.
     The right page stops at the system's band, where the tab bar stands. */
  private func spreadBody(_ planet: KMePlanet) -> some View {
    let f = fold.frame
    return HStack(spacing: 0) {
      KMeCover(planet: planet, topInset: topInset, pull: 0, actions: coverActions(), page: true, foot: foot)
        .frame(width: f.crease)
      ScrollView(.vertical) {
        VStack(spacing: 0) {
          // your face stands over the block's top edge (as it does over the cover's)
          Color.clear.frame(height: topInset + KMeCoverMetrics.faceOver + 12)
          KMeIdentity(theme: theme, profile: content.profile, me: planet.me, settingsLabel: content.settingsLabel, actions: actions, taken: railTools.taken(.me), avatar: avatar)
          KMePlanetPage(content: content, planet: planet, theme: theme, actions: actions) {
            auraArt
          }
          .padding(.horizontal, Self.gutter)
          .padding(.bottom, foot)
        }
      }
      .scrollIndicators(.hidden)
      .overlay(alignment: .bottom) {
        KBottomFade(theme: theme)
      }
      .frame(width: max(0, f.rightEnd - f.crease))
      Spacer(minLength: 0)
    }
  }

  private func coverActions() -> KMePlanetActions {
    let a = KMePlanetActions()
    let to = actions
    a.onTap = { what in
      switch what {
      case .wren: to.onPlanetTap("wren", "")
      case .letter: to.onPlanetTap("letter", "")
      case let .stamp(id): to.onPlanetTap("stamp", id)
      }
    }
    // "cover": TS leads it by what the tile shows (a plus → the stamp press, a number → the ones
    // you made, nothing → the album)
    a.onStamps = { to.onStamps("cover", "") }
    a.onLetters = { to.onSeeAll() }
    return a
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

  /// The planet's one page, or the segment showing.
  @ViewBuilder
  private var page: some View {
    if let planet = content.planet {
      KMePlanetPage(content: content, planet: planet, theme: theme, actions: actions) {
        auraArt
      }
    } else {
      segmentCard
    }
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
        if content.fc.form == "seat" {
          KFcBoardingPass(fc: content.fc) { actions.onFcOpen("seat") }
        } else if content.fc.form == "report" {
          KFcSealedReport(fc: content.fc) { actions.onFcOpen("report") }
        }
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
        .overlay(alignment: .topTrailing) {
          if content.fc.form == "invite" {
            KFcEnvelope(fc: content.fc) { actions.onFcOpen("invite") }
              .padding(.trailing, 14)
              .offset(y: -12)
          }
        }
        KLooksTray(theme: theme, looks: content.looks, a11y: content.a11y, actions: actions)
      }
    }
  }
}

// MARK: - The courier's planet: Me as one page

/// Everything under the header when the planet is on (see the top): the First Class forms by the
/// day, her card, the Aura and Stamps tiles, the report row, the First Class card.
struct KMePlanetPage<AuraArt: View>: View {
  let content: KMeContent
  let planet: KMePlanet
  let theme: KTheme
  let actions: KMeActions
  let auraArt: AuraArt

  init(content: KMeContent, planet: KMePlanet, theme: KTheme = .classic, actions: KMeActions, @ViewBuilder auraArt: () -> AuraArt) {
    self.content = content
    self.planet = planet
    self.theme = theme
    self.actions = actions
    self.auraArt = auraArt()
  }

  /// room for each block's soft shadow
  static var gap: CGFloat { 14 }

  private func cardActions() -> KMePlanetActions {
    let a = KMePlanetActions()
    let to = actions
    a.onOpen = { to.onCourier() }
    a.onTrack = { to.onTrack() }
    a.onLook = { id in to.onLook(id) }
    a.onAllLooks = { to.onAllLooks() }
    a.onTap = { what in
      switch what {
      case .wren: to.onPlanetTap("wren", "")
      case .letter: to.onPlanetTap("letter", "")
      case let .stamp(id): to.onPlanetTap("stamp", id)
      }
    }
    return a
  }

  var body: some View {
    // one large First Class thing to a page: while the boarding pass or the sealed report is up,
    // the report tile (the same report) and the card at the foot step aside
    let large = content.fc.form == "seat" || content.fc.form == "report"
    VStack(alignment: .leading, spacing: Self.gap) {
      if content.fc.form == "seat" {
        KFcBoardingPass(fc: content.fc) { actions.onFcOpen("seat") }
      } else if content.fc.form == "report" {
        KFcSealedReport(fc: content.fc) { actions.onFcOpen("report") }
      }
      KMePlanetCard(card: planet, actions: cardActions(), theme: theme)
        .overlay(alignment: .topTrailing) {
          if content.fc.form == "invite" {
            // on her card's corner, clear of the gear above it
            KFcEnvelope(fc: content.fc) { actions.onFcOpen("invite") }
              .padding(.trailing, 18)
              .offset(y: -6)
          }
        }
      HStack(alignment: .top, spacing: Self.gap) {
        KMeAuraTile(aura: content.aura, chip: planet.auraChip, hint: planet.auraHint, theme: theme, onTap: { actions.onAuraOpen() }) {
          auraArt
        }
        // the sealed report above her card is this month's: no second door to it here
        if content.report.show, content.fc.form != "report" {
          KMeReportTileView(report: content.report, tile: planet.reportTile, chip: planet.reportChip, theme: theme) { actions.onReport() }
        }
      }
      // the two tiles are as tall as the taller one's words need, never the room on offer
      .fixedSize(horizontal: false, vertical: true)
      if !content.firstClass.member, !large {
        KMeFirstClassCard(card: content.firstClass) { actions.onFirstClass() }
      }
    }
  }
}

// MARK: - First Class by the day (the owner's rollout, 2026-10-20)

/*
 The owner's "Me First Class Rollout" (D3 / D7 / D30), drawn as its prompts say; every tap goes to
 our own First Class page (TS: the paywall), never a sheet of its own (owner, 10-20).
 (owner, 10-20: no black edges anywhere on these: thin gold lines and soft shadows instead of the
 prompts' 2pt ink edges and hard shadows.)
 - D3, the Post's letter: 74 × 50 on the Courier card's top right (14 in, 12 above it), cream,
   corners of 6, a 5pt gold-and-ink stripe along its top, the flap's V in ink, a 14
   gold wax seal, THE POST in mono 7 gold at its bottom right, a 2/2 ink drop shadow; it bobs 4pt
   over 3.4s.
 - D7, the boarding pass: full width over the Courier card, cream, a 2 ink edge, corners 18, a 4/4
   gold hard shadow, a 14 white notch on its right edge; a 10 wide stripe of gold and ink marching
   down its left side; ● FIRST CLASS and YOUR WEEK · 48H in mono 9, the system 600 20 headline, the
   perks line and an ink capsule "Open →" that nudges 8pt left every 3s.
 - D30, the sealed report: white, a 2 ink edge, corners 20, a 4/4 gold shadow; ● YOUR {MONTH}
   REPORT in mono 10 gold, SEALED in mono 9, the system 600 19 headline, a 32 gold capsule with a 1.5
   ink edge: "Break the seal" and FIRST CLASS.
 - The pull-tab: 34 × 118 on the right edge at 52% of the page, gold, a 2 ink edge open on the
   right, corners 14 on the left, a −2/2 ink shadow, ● FIRST CLASS reading upward in mono 9; it
   nudges 6pt left every 4s; it floats over the page and takes no room.
 Reduce Motion stills the bob, the march and the nudges.
 */

struct KFcEnvelope: View {
  let fc: KMeFcRollout
  let onPress: () -> Void
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var up = false

  var body: some View {
    SwiftUI.Button(action: onPress) {
      ZStack {
        RoundedRectangle(cornerRadius: 6, style: .continuous).fill(KBrand.cream)
        VStack(spacing: 0) {
          KFcStripe(width: 74, height: 5)
          Spacer(minLength: 0)
        }
        .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
        Path { p in
          p.move(to: CGPoint(x: 2, y: 7))
          p.addLine(to: CGPoint(x: 37, y: 29))
          p.addLine(to: CGPoint(x: 72, y: 7))
        }
        .stroke(KBrand.goldText.opacity(0.7), style: StrokeStyle(lineWidth: 1.5, lineJoin: .round))
        Circle().fill(KBrand.waxGold)
          .frame(width: 14, height: 14)
          .position(x: 37, y: 29)
        Text(fc.post)
          .font(.system(size: 7, weight: .semibold, design: .monospaced))
          .foregroundStyle(KBrand.goldText)
          .position(x: 50, y: 43)
        RoundedRectangle(cornerRadius: 6, style: .continuous).strokeBorder(KBrand.waxGold.opacity(0.6), lineWidth: 1)
      }
      .frame(width: 74, height: 50)
      .shadow(color: .black.opacity(0.15), radius: 6, y: 3)
      .offset(y: up ? -4 : 0)
      .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityLabel(fc.envelopeA11y)
    .onAppear {
      guard !reduceMotion else { return }
      withAnimation(.easeInOut(duration: 1.7).repeatForever(autoreverses: true)) { up = true }
    }
  }
}

/// gold and ink stripes at 135°, 7 each; `march` moves them along
struct KFcStripe: View {
  /// nil: the size it's given (a background)
  var width: CGFloat? = nil
  var height: CGFloat? = nil
  var march: CGFloat = 0

  var body: some View {
    Canvas { ctx, size in
      ctx.fill(Path(CGRect(origin: .zero, size: size)), with: .color(KBrand.waxGold))
      let step: CGFloat = 14
      var x = -size.height - step + march.truncatingRemainder(dividingBy: step)
      while x < size.width + size.height {
        var p = Path()
        p.move(to: CGPoint(x: x + 7, y: 0))
        p.addLine(to: CGPoint(x: x + 14, y: 0))
        p.addLine(to: CGPoint(x: x + 14 - size.height, y: size.height))
        p.addLine(to: CGPoint(x: x + 7 - size.height, y: size.height))
        p.closeSubpath()
        ctx.fill(p, with: .color(KBrand.inkOnBrand))
        x += step
      }
    }
    .frame(width: width, height: height)
    // the bars are drawn past the edges on purpose; an offscreen render doesn't clip a Canvas
    .clipped()
  }
}

/// a capsule that slides 8pt left and back every `every` seconds (still under Reduce Motion)
struct KFcNudge: ViewModifier {
  let every: Double
  var distance: CGFloat = 8
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  func body(content: Content) -> some View {
    if reduceMotion {
      content
    } else {
      TimelineView(.periodic(from: .now, by: every)) { ctx in
        content.keyframeAnimator(initialValue: CGFloat(0), trigger: ctx.date) { v, x in
          v.offset(x: x)
        } keyframes: { _ in
          KeyframeTrack {
            CubicKeyframe(-distance, duration: 0.25)
            CubicKeyframe(0, duration: 0.35)
          }
        }
      }
    }
  }
}

struct KFcBoardingPass: View {
  let fc: KMeFcRollout
  let onPress: () -> Void
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: 18, style: .continuous)
    SwiftUI.Button(action: onPress) {
      HStack(spacing: 0) {
        VStack(alignment: .leading, spacing: 6) {
          HStack {
            Text("● " + fc.firstClass.uppercased())
              .kText(.mono(9, .semibold, tracking: 0.12))
              .foregroundStyle(KBrand.goldText)
            Spacer(minLength: 8)
            Text(fc.seatTimer)
              .kText(.mono(9, .semibold, tracking: 0.1))
              .foregroundStyle(KBrand.subOnCream)
          }
          Text(fc.seatHead)
            .kText(.system(20, .semibold, lineHeight: 1.15))
            .foregroundStyle(KBrand.inkOnBrand)
            .fixedSize(horizontal: false, vertical: true)
          HStack(spacing: 10) {
            Text(fc.seatPerks)
              .kText(.system(12))
              .foregroundStyle(KBrand.subOnCream)
              .lineLimit(1)
              .truncationMode(.tail)
              .frame(maxWidth: .infinity, alignment: .leading)
            Text(fc.open + " →")
              .kText(.system(13, .semibold))
              .foregroundStyle(KBrand.paperWhite)
              .padding(.horizontal, 14)
              .frame(height: 28)
              .background(Capsule().fill(KBrand.inkOnBrand))
              .modifier(KFcNudge(every: 3))
          }
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 14)
      }
      .padding(.leading, 10)
      .background(alignment: .leading) {
        // the stripe down the left side, marching (its size is the card's, never asked for)
        TimelineView(.animation(paused: reduceMotion)) { ctx in
          let t = ctx.date.timeIntervalSinceReferenceDate
          KFcStripe(march: CGFloat((t / 1.6).truncatingRemainder(dividingBy: 1)) * 14)
        }
        .frame(width: 10)
      }
      .background(KBrand.cream)
      // (owner, 10-20: no black edges) a thin gold line, a soft shadow; the notch is cut, not drawn
      .overlay(alignment: .trailing) {
        Circle().fill(Color.white)
          .frame(width: 14, height: 14)
          .offset(x: 7)
          .blendMode(.destinationOut)
      }
      .compositingGroup()
      .clipShape(shape)
      .overlay(shape.strokeBorder(KBrand.waxGold.opacity(0.55), lineWidth: 1))
      .shadow(color: KBrand.waxGold.opacity(0.25), radius: 10, y: 4)
      .contentShape(shape)
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel([fc.firstClass, fc.seatHead, fc.seatPerks].joined(separator: ". "))
    .accessibilityAddTraits(.isButton)
  }
}

struct KFcSealedReport: View {
  let fc: KMeFcRollout
  let onPress: () -> Void

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: 20, style: .continuous)
    SwiftUI.Button(action: onPress) {
      VStack(alignment: .leading, spacing: 8) {
        HStack {
          Text("● " + fc.reportEyebrow)
            .kText(.mono(10, .semibold, tracking: 0.14))
            .foregroundStyle(KBrand.goldText)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
          Spacer(minLength: 8)
          Text(fc.reportSealed)
            .kText(.mono(9, .semibold, tracking: 0.12))
            .foregroundStyle(KBrand.subOnCream)
        }
        Text(fc.reportHead)
          .kText(.system(19, .semibold, lineHeight: 1.15))
          .foregroundStyle(KBrand.inkOnBrand)
          .fixedSize(horizontal: false, vertical: true)
        HStack(spacing: 8) {
          Text(fc.reportCta)
            .kText(.system(13, .semibold))
          Text(fc.firstClass.uppercased())
            .kText(.mono(8, .semibold, tracking: 0.12))
            .opacity(0.75)
        }
        .foregroundStyle(KBrand.inkOnBrand)
        .padding(.horizontal, 14)
        .frame(height: 32)
        .background(Capsule().fill(KBrand.waxGold))
        .padding(.top, 2)
      }
      .padding(.vertical, 14)
      .padding(.horizontal, 16)
      .frame(maxWidth: .infinity, alignment: .leading)
      // (owner, 10-20: no black edges) cream, a thin gold line, a soft shadow
      .background(shape.fill(KBrand.cream))
      .overlay(shape.strokeBorder(KBrand.waxGold.opacity(0.55), lineWidth: 1))
      .shadow(color: KBrand.waxGold.opacity(0.25), radius: 10, y: 4)
      .contentShape(shape)
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel([fc.reportEyebrow, fc.reportSealed, fc.reportHead, fc.reportCta].joined(separator: ". "))
    .accessibilityAddTraits(.isButton)
  }
}

struct KFcPullTab: View {
  static let size = CGSize(width: 34, height: 118)
  let fc: KMeFcRollout
  let onPress: () -> Void

  var body: some View {
    let shape = UnevenRoundedRectangle(topLeadingRadius: 14, bottomLeadingRadius: 14, style: .continuous)
    SwiftUI.Button(action: onPress) {
      Text("● " + fc.firstClass.uppercased())
        .kText(.mono(9, .semibold, tracking: 0.2))
        .foregroundStyle(KBrand.inkOnBrand)
        .fixedSize()
        .rotationEffect(.degrees(-90))
        .frame(width: Self.size.width, height: Self.size.height)
        .background(shape.fill(KBrand.waxGold))
        .shadow(color: .black.opacity(0.18), radius: 6, x: -2, y: 2)
        .contentShape(shape)
        .modifier(KFcNudge(every: 4, distance: 6))
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityLabel(fc.tabA11y)
  }
}

// MARK: - The First Class card (4a, Prompt 6)

/*
 Cream paper (KBrand, the same in every theme): a 1.5 cream-border outline, corners of 24, padding
 18 18 16, 14 between its parts:
 - the eyebrow: a 7pt wax-gold dot and FIRST CLASS in mono 10 at .18em, gold text;
 - the headline in system 600 26/1.1, 100 clear on the right for the stamp;
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
  static var headlineStyle: KTextStyle { .system(26, .semibold, lineHeight: 1.1) }
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
      if let look = card.wren {
        KWrenBird(look, size: inner.width * 0.7)
      } else {
        KImage(card.bird, size: CGSize(width: inner.width * 0.7, height: inner.width * 0.7), contentMode: .fit, placeholder: .clear)
      }
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
    // the card's own face (rule B: sf, no outline, the purple object shadow), so the card that
    // lands in its place doesn't change shape
    VStack(alignment: .leading, spacing: 12) {
      RoundedRectangle(cornerRadius: 6, style: .circular).fill(theme.soft2).frame(width: 132, height: 22)
      RoundedRectangle(cornerRadius: 14, style: .circular).fill(theme.soft2).frame(height: KAuraCardMetrics.artHeight)
      RoundedRectangle(cornerRadius: 6, style: .circular).fill(theme.soft2).frame(width: 220, height: 24)
      RoundedRectangle(cornerRadius: 4, style: .circular).fill(theme.soft2).frame(width: 150, height: 12)
      Capsule(style: .circular).fill(theme.soft2).frame(height: 44).padding(.top, 30)
    }
    .kAuraObjectFace(theme)
    .accessibilityHidden(true)
  }
}
