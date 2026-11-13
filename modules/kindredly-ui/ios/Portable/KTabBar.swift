// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.
// The Expo side lives in Adapters/KTabBarView.swift; ui-lab shows it (kindredly:///ui-lab).

import SwiftUI

/*
 THE TAB BAR, G1: LIQUID GLASS WITH THE M2 ICONS (owner's design, 2026-10-28:
 ~/Desktop/export/tab-bar-glass-g1, CLAUDE-CODE-PROMPTS-TAB-BAR-GLASS.md, "G" below). It replaces
 the 10a solid float. The five columns stay as they were, Today / Notes / + / Kindreds / Me in
 one capsule, 62 tall, 16 in from each side. No words under the icons; each tab's name is still
 there for VoiceOver and the large content viewer.

 G Prompt 0 prefers the system's own TabView on iOS 26. This bar is a strip the React Native
 navigator holds (src/components/NativeTabBar.tsx), and the + in the middle opens our own panel,
 so it is drawn here on every iOS the app runs on (G Prompt 1), the same on 18 as on 26.

 THE GLASS (G Prompt 1), bottom up: a thin material with a white tint over whatever scrolls
 behind (the screens run under the bar), a white fade over its top half, a .5 white ring, a
 bright line along the top edge and a faint dark one along the bottom, and a soft shadow, two
 layers, drawn outside the capsule only, as CSS's box-shadow is, so it never greys the glass. In
 Midnight the same layers on the dark material, the lines dimmed and the shadow black.

 THE LENS (G Prompts 1-2): a brighter glass capsule, 62 x 50, corners of 25, centred on the
 selected column. Three layers so the motions never fight: the outer one is its place (it slides
 on .5s cubic-bezier(.3,1.25,.4,1)), the middle its press (1.12 while a finger is down, 1.22 x .9
 while it is dragged, on .22s cubic-bezier(.3,1.3,.4,1)), the inner the stretch each new pick
 plays once (1, then 1.5 x .8 at 30%, .94 x 1.06 at 65%, 1, over .5s).
 Holding and dragging (past 4pt) takes the lens along under the finger, clamped 4 inside the
 ends; the tab nearest the finger lights up as it passes, and letting go settles on that tab,
 stretches and selects it. The + column takes no part: a drag passes it by, a tap on it is the +.

 THE ICONS (G Prompt 3, M2), 30 across on a 28 grid, round caps and joins: a pillar box, a
 sticky note, a speech bubble, a person. Resting, a 2 stroke in #9C98B3 (Midnight: mute) with
 the accent in the same grey; selected, 2.4 in ink with the accent in ind, and the accent moves
 once (.55s cubic-bezier(.3,1.3,.4,1)): the pillar box's slot rocks -14 and 10 degrees, the
 note's corner pops 0 to 1.35 to 1, the bubble's eyes blink, the person's smile draws in.

 A tab can carry a count: an ind pill, white 11 bold, 18 tall, ringed 2 in white, top right of
 the icon. A number, never a dot (owner, 2026-09-20); "9+" past nine, and hidden while its tab
 is selected, as the React Native bar's is (PostTabBar): the reader is already looking at it.

 THE + (G Prompt 3, then the owner's own on 2026-11-12: KGlassPlus): an ink disc with the + in
 the page's colour; open, it turns 45 degrees into an x and the disc goes ind. The holder still
 passes the turn's curve.

 THE BAR GROWS (the owner's P2, 2026-11-09: CLAUDE-CODE-PROMPTS-PLUS.md Prompt 2). Given a tray
 (the publish entry's two rows, KPublishTray in KPlusPanel.swift), the glass itself grows taller
 while the + is open: no new layer, the same face, ring and shadow, its bottom edge where it was
 and its corners kept at 31, so it is the capsule again at 62. It grows from 62 by the tray's own
 measured height (210 in all at the default text size; a little more for the new reader's line,
 more with large text) on .45s cubic-bezier(.3,1.2,.4,1); the tray, clipped inside it, fades in
 over .3s once the glass has started (.1s late) and out at once (.15s) on closing. The tab row
 stays at the foot, untouched. While the tray is open a tap on a tab is reported as before but
 plays no pick (the lens stays put, a drag doesn't start): the holder closes the + first and
 switches nothing. With Reduce Motion the height changes at once, the tray only fades, and the +
 doesn't turn: the + and the x cross-fade. Without a tray (ui-lab, the older publish styles)
 none of this happens and the bar is the 62 capsule it always was.

 THE TRAY CAN BE TWO ROWS OR THREE (owner's audit, 2026-11-10: the reader's draft, when there is
 one, is a row above Letter, and it is read from the phone's storage as the + opens). The holder
 sends the row before it opens the bar, so the tray is measured, still closed and invisible, at
 the height it will open to. In case the row and the opening ever arrive together, or the tray's
 height changes while it is open (the text size), the growing is keyed to the bar's height
 itself, not to open or closed: whatever moves the height, the glass travels there on the same
 curve and never jumps. Closed, the height is 62 whatever the tray measures, so nothing animates.

 Selection belongs to whoever holds the bar. A tap or a drag only reports the tab (onSelect);
 the lens settles where selectedIndex says, so a tab that refuses the press or a route changed
 from elsewhere both come out right. A released drag holds its tab for a moment while the holder
 catches up, so the lens doesn't run back to the old tab first.

 The tab row is fixed at 62 tall, so its one piece of text, the count, stays at the default
 Dynamic Type size, and each tab and the + show the large content viewer. The tray's words grow
 with Dynamic Type up to xxLarge, and the bar grows with them. With Reduce Motion the lens
 moves on a plain ease, nothing stretches and the accents stay still; a drag still follows the
 finger.

 THE PUBLISH ENTRY (KPlusPanel.swift). On every tab the + now grows the bar around its tray (see
 THE BAR GROWS above). hidden drops the whole bar 160 on the publish turn's curve, out of sight
 and out of reach, for Today's reply (and the older sheet style); with Reduce Motion it fades
 instead.
 */

/// The four tabs' drawings. The order on the bar is the caller's.
public enum KTabGlyph: String, CaseIterable, Sendable {
  /// Today: a pillar box; selected, its slot rocks
  case today
  /// Notes: a sticky note; selected, its folded corner pops
  case notes
  /// Kindreds: a speech bubble; selected, its two eyes blink
  case kindreds
  /// Me: a person; selected, a smile draws in
  case me

  /// The nearest SF Symbol, for the large content viewer only: it shows an Image and a title,
  /// not a drawing of our own.
  var systemImage: String {
    switch self {
    case .today: return "envelope"
    case .notes: return "note.text"
    case .kindreds: return "bubble.left"
    case .me: return "person"
    }
  }
}

/// One tab: what it shows and what VoiceOver calls it.
public struct KTabItem: Equatable, Sendable {
  public let glyph: KTabGlyph
  /// already translated; spoken by VoiceOver and shown by the large content viewer, never drawn on the bar
  public let label: String
  /// the count on the tab; 0 for none
  public let badge: Int

  public init(glyph: KTabGlyph, label: String, badge: Int = 0) {
    self.glyph = glyph
    self.label = label
    self.badge = badge
  }
}

/// The bar's numbers, for whoever places it and leaves room for it.
public enum KTabBarMetrics {
  /// the bar's height (G Prompt 1)
  public static let height: CGFloat = 62
  /// in from the screen's left and right edges (G Prompt 1)
  public static let sideInset: CGFloat = 16
  /* THE BAR IS NEVER LONGER THAN IT IS ON THE WIDEST PHONE (owner, 2026-11-12, on the iPhone
     Duo: "这种长条的一定注意别弄这么长"). On a window wider than a phone's with the bar along the
     bottom (the Duo's inner screen held upright, 669 across) it stood 637 long with its four
     icons a hand apart; there it keeps to 430 in the middle. No phone's window is wide enough
     for this to act (the widest, 440, gives the bar 408). */
  public static let barMaxWidth: CGFloat = 430

  /*
   How far the bar's bottom edge sits above the screen's: 4 inside the safe area, never closer
   than 16 to the edge, which is 30 on every Face ID iPhone (G draws it 28 up; the 2 is kept so
   the screens' room below their content doesn't move) and 16 on a phone with a home button.

   The React Native side sizes the Host by the same rule (src/components/NativeTabBar.tsx,
   barBottomGap); change them together.
   */
  public static func bottomGap(safeAreaBottom: CGFloat) -> CGFloat {
    max(safeAreaBottom - 4, 16)
  }

  /// the corners, kept while the bar grows around its tray (a capsule's at 62)
  public static let corner: CGFloat = height / 2

  /// How far the bar drops when hidden (Today 3d Prompt 8: translateY(160)), enough to clear the
  /// screen's bottom edge from any gap.
  public static let hiddenDrop: CGFloat = 160

  /* THE RAISED + (owner, 2026-11-12: "➕发布那里是不是也可以做一个向上凸的", with his old app's
     bar: a disc bigger than the bar's icons, standing proud of the bar in a round swell of the
     bar's own material). The disc is 44 and sits 14 above the row's middle, so it stands 5 over
     the bar's top edge (52 and 11 at first; the owner the same day: "黑圈稍微小一点点", with a
     bigger, bolder +, so 48 and 12; and that evening "发布的那个圈还是有点大", so 44, lifted 2
     more to stand as proud as it did); the glass rises round it as a collar 6 wider than the disc, meeting the
     top edge in a 10pt hollow either side, so it is one outline and not a ring round a button.
     The bar's frame is `plusHeadroom` taller at the top to hold the swell; whoever sizes the
     Host adds the same (NativeTabBar.tsx PLUS_HEADROOM). While the bar is grown round its tray
     the top edge is far above the row, so the swell sinks flat.

     LOWER, AND IT NEVER DROPS (owner, 2026-11-13: "底导航…太高了 把圈➕整体下移一些 … 点➕ 交互 他砸
     自己向下弹"). The disc is 42 and rises 10 (44 and 14 before): its top meets the bar's top edge
     and only the collar crests it, by 6, so the bar no longer reads as a tall block with a ball on
     top. And opening no longer brings the disc down to the row's middle: it was the + falling 14
     under the finger as the bar grew, a control running away from the touch that opened it. It
     stays where it was tapped and turns into the x there; the glass grows up round it. The
     headroom stays 12 (the swell now uses 6 of it), so the Host's size, which the JS sets, is the
     same for every binary. */
  public static let plusHeadroom: CGFloat = 12
  static let plusRaisedSize: CGFloat = 42
  static let plusSize: CGFloat = 44
  static let plusRise: CGFloat = 10
  /// the + drawn on the disc: its frame (the arms are 14/24 of it, so 16.3 long) and its stroke.
  /// 22 and 2.6 until the owner asked for a bigger, bolder + (2026-11-12)
  static let plusMark: CGFloat = 28
  static let plusStroke: CGFloat = 3.4
  static let collarGap: CGFloat = 6
  static let collarFillet: CGFloat = 10

  /* THE RAIL (iPhone Duo, 2026-11-12; the canvas's "侧边导航").
     On a folding phone the system keeps a band down the right edge of both screens, with its
     clock at the top. The bar stands in that band, at its foot, where the thumb of the hand
     holding the phone is.

     v1 was the phone's bar turned 90 degrees: five columns, the + in the middle standing out of
     the left edge in the glass's swell, and the + widened the whole rail round its tray. The
     owner, looking at it in the simulator the same day: "那个发布➕ 能在下面或者悬浮么？感觉侧边
     很奇怪". A + half-way up a column of icons, poking sideways into the page, is not where a
     hand looks for it.

     v2: THE + STANDS ON ITS OWN AT THE FOOT OF THE BAND, under the tabs. Two things in the band:
     · the tabs: the four icons top to bottom in a plain glass capsule (no swell), `height` (62)
       wide, railSlot to a tab, with the lens and the badge as on the bar;
     · the +: the ink disc alone, railPlus across, railGap under the capsule, in the corner the
       thumb rests on. No glass shows round it while it is closed (no rim).
     The + opens its own tray: the glass grows out of the disc to the left and up, round the
     same rows, railTray wider, its right and bottom edges where they were, and the disc turns to
     the red x in the corner it never left. The tabs step out while it is open (the card stands
     where they do). The holder sizes its Host to the band (and to the whole window while the +
     is open). */
  /// a tab's share of the rail's length (the lens is 58 of it)
  public static let railSlot: CGFloat = 62
  /// between the tabs' capsule and the +
  public static let railGap: CGFloat = 12
  /// the + on the rail: on its own, so a little bigger than in the row (54 at first; 50 with the
  /// row's own going from 48 to 44)
  public static let railPlus: CGFloat = 50
  /// the rail's right edge from the screen's: the 62 of the rail in the middle of the system's
  /// 84 band, under its clock
  public static let railEdge: CGFloat = 11
  /// the + from the bottom safe area
  public static let railFoot: CGFloat = 6
  /// how much wider the + grows round its tray
  public static let railTray: CGFloat = 276
  /// the lens on the rail: the bar's, upright
  static let railLens = CGSize(width: 50, height: 58)
  /* THE PAGE'S TOOLS (KRailTools, in KButtons.swift): over the tabs, each a 44 square,
     railToolGap apart, railToolsGap over the tabs' capsule; the stage counts how many fit
     between the system's clock and the tabs, keeping railToolsAir clear under the clock. */
  static let railTool: CGFloat = 44
  static let railToolGap: CGFloat = 4
  static let railToolsGap: CGFloat = 16
  static let railToolsAir: CGFloat = 10
  /// how many of a page's tools the rail has room for in a band `height` tall whose clock ends
  /// at `top`, standing `foot` clear of the bottom edge
  public static func railToolSlots(height: CGFloat, top: CGFloat, foot: CGFloat, tabs: Int) -> Int {
    let stack = foot + self.height + railGap + railTabsLength(tabs)
    let free = height - top - stack - railToolsGap - railToolsAir
    return max(0, min(3, Int((free + railToolGap) / (railTool + railToolGap))))
  }
  /// the tabs' capsule, top to bottom
  static func railTabsLength(_ tabs: Int) -> CGFloat { CGFloat(max(1, tabs)) * railSlot }

  /// the lens (G Prompt 1)
  static let lensSize = CGSize(width: 62, height: 50)
  /// a drag starts once the finger has moved this far (G Prompt 2)
  static let dragSlop: CGFloat = 4
}

public extension KMotion {
  /// The lens settling on a tab: .5s cubic-bezier(.3,1.25,.4,1), a little past and back (G Prompt 2).
  static let lensSlide = Animation.timingCurve(0.3, 1.25, 0.4, 1, duration: 0.5)
  /// The same move with Reduce Motion on: no overshoot.
  static let lensSlideReduced = Animation.easeInOut(duration: 0.25)
  /// The lens swelling under a finger: .22s cubic-bezier(.3,1.3,.4,1).
  static let lensPress = Animation.timingCurve(0.3, 1.3, 0.4, 1, duration: 0.22)
  /// A tab's colour and stroke changing: .2s.
  static let tabTint = Animation.easeOut(duration: 0.2)
  /// Each step of the lens's stretch: cubic-bezier(.3,1,.4,1).
  static let lensStretchStep = UnitCurve.bezier(startControlPoint: UnitPoint(x: 0.3, y: 1), endControlPoint: UnitPoint(x: 0.4, y: 1))
  /// Each step of an accent's move: cubic-bezier(.3,1.3,.4,1).
  static let tabAccentStep = UnitCurve.bezier(startControlPoint: UnitPoint(x: 0.3, y: 1.3), endControlPoint: UnitPoint(x: 0.4, y: 1))
  /// The bar growing around its tray and back: height .45s cubic-bezier(.3,1.2,.4,1) (P2).
  static let barGrow = Animation.timingCurve(0.3, 1.2, 0.4, 1, duration: 0.45)
  /// The + turning with it: .4s on the same curve (the approved prototype's).
  static let plusTurnGrow = Animation.timingCurve(0.3, 1.2, 0.4, 1, duration: 0.4)
  /// The tray's rows fading in once the glass has started: .3s, .1s late (P2).
  static let trayIn = Animation.timingCurve(0.25, 0.1, 0.25, 1, duration: 0.3).delay(0.1)
  /// ...and out at once on closing (.15s).
  static let trayOut = Animation.easeOut(duration: 0.15)
}

/// The glass's colours, light and Midnight (G Prompt 1; the dark side is ours, the mock is light).
struct KGlassTone {
  let tint: Color
  let topFade: Color
  let ring: Color
  let topLine: Color
  let bottomLine: Color
  let shadow: [KSoftShadow]
  let lens: Color
  let lensPressed: Color
  let lensRing: Color
  let lensShadow: [KSoftShadow]
  /// a resting icon
  let rest: Color
  /// the count's ring
  let badgeRing: Color

  static func of(_ theme: KTheme) -> KGlassTone {
    let ink = Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 1)
    if theme.isDark {
      return KGlassTone(
        tint: theme.sf.opacity(0.35),
        topFade: Color.white.opacity(0.08),
        ring: Color.white.opacity(0.16),
        topLine: Color.white.opacity(0.22),
        bottomLine: Color.black.opacity(0.3),
        shadow: [
          KSoftShadow(y: 12, blur: 32, spread: -12, color: Color.black.opacity(0.6)),
          KSoftShadow(y: 2, blur: 6, spread: -2, color: Color.black.opacity(0.35)),
        ],
        lens: Color.white.opacity(0.1),
        lensPressed: Color.white.opacity(0.22),
        lensRing: Color.white.opacity(0.22),
        lensShadow: [KSoftShadow(y: 3, blur: 10, spread: -4, color: Color.black.opacity(0.45))],
        rest: theme.mute,
        badgeRing: theme.sf
      )
    }
    return KGlassTone(
      /* frosted white (owner, 2026-11-13: "低导航 透明程度你看看有问题么"). At .22 the thin material's
         own grey showed through: the bar read darker than a white page (245 against 252) and greyed
         Lavender's and Paper's colour out, and the page's bottom fade means nothing ever scrolls
         under it to be frosted. At .72 it is the white of Kindreds' keys on every light page, and
         anything that does pass behind is still frosted. */
      tint: Color.white.opacity(0.72),
      topFade: Color.white.opacity(0.55),
      ring: Color.white.opacity(0.85),
      topLine: Color.white.opacity(0.95),
      bottomLine: ink.opacity(0.08),
      shadow: [
        KSoftShadow(y: 12, blur: 32, spread: -12, color: ink.opacity(0.38)),
        KSoftShadow(y: 2, blur: 6, spread: -2, color: ink.opacity(0.12)),
      ],
      lens: ink.opacity(0.06),
      lensPressed: Color.white.opacity(0.92),
      lensRing: Color.white.opacity(0.95),
      lensShadow: [KSoftShadow(y: 3, blur: 10, spread: -4, color: ink.opacity(0.25))],
      rest: Color(hex: "#9C98B3"),
      badgeRing: Color.white.opacity(0.95)
    )
  }
}

public struct KTabBar: View {
  private let theme: KTheme
  private let items: [KTabItem]
  private let selectedIndex: Int?
  private let isPanelOpen: Bool
  private let plusLabel: String
  private let closeLabel: String
  private let plusTurn: Animation
  private let hidden: Bool
  private let raised: Bool
  private let rail: Bool
  private let toolSlots: Int
  private let tray: AnyView?
  private let onSelect: (Int) -> Void
  private let onPlus: () -> Void
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /// the tray's own height, measured, so the bar grows by exactly that
  @State private var trayHeight: CGFloat = 0
  /// the pages' own tools, which the rail draws over the tabs (KRailTools)
  @ObservedObject private var railTools = KRailTools.shared

  /// where the finger went down, while it is down
  @State private var downX: CGFloat?
  /// the finger's x once it has moved past the slop: the bar is being dragged
  @State private var dragX: CGFloat?
  /// a finger is down somewhere other than the +
  @State private var pressed = false
  /// the tab a released drag or tap chose, held until the holder's selectedIndex catches up
  @State private var pending: Int?
  /// bumped by each new pick: replays the lens's stretch and the chosen icon's accent
  @State private var pick = 0

  /// - Parameters:
  ///   - items: the tabs, left to right; the + goes in the middle (after the first half)
  ///   - selectedIndex: the selected tab, an index into items; nil shows no lens
  ///   - isPanelOpen: true turns the + into an x (what it opens is showing)
  ///   - plusLabel: what VoiceOver says for the + while closed, already translated
  ///   - closeLabel: what it says for the x while open, already translated
  ///   - plusTurn: the curve the + turns to an x on: KMotion.plusTurn unless the holder says
  ///     otherwise; the publish entry passes KMotion.plusTurnPublish
  ///   - hidden: the bar slides 160 down out of sight (the new reader's publish sheet takes its
  ///     place, or Today's reply has the keyboard: KTabStage barHidden), on the publish turn's
  ///     curve; with Reduce Motion it fades instead
  ///   - raised: the + stands proud of the bar in a swell of its glass (KTabBarMetrics, THE
  ///     RAISED +); the bar's frame is plusHeadroom taller at the top. false: the + sits in the row
  ///   - rail: the bar stands upright (KTabBarMetrics, THE RAIL): the tabs top to bottom in their
  ///     capsule, the + on its own under them, growing to the left and up round its tray
  ///   - toolSlots: on the rail, how many of the page's own tools it draws over the tabs
  ///     (KTabBarMetrics.railToolSlots); 0 draws none
  ///   - tray: what the bar grows around while isPanelOpen (the publish entry's rows); nil keeps
  ///     the bar 62 tall whatever isPanelOpen says
  ///   - onSelect: a tab was chosen (tapped, or a drag let go over it), with its index; selected or not
  ///   - onPlus: the + (or x) was tapped
  public init(
    theme: KTheme,
    items: [KTabItem],
    selectedIndex: Int?,
    isPanelOpen: Bool,
    plusLabel: String,
    closeLabel: String,
    plusTurn: Animation = KMotion.plusTurn,
    hidden: Bool = false,
    raised: Bool = false,
    rail: Bool = false,
    toolSlots: Int = 0,
    tray: AnyView? = nil,
    onSelect: @escaping (Int) -> Void,
    onPlus: @escaping () -> Void
  ) {
    self.theme = theme
    self.items = items
    self.selectedIndex = selectedIndex
    self.isPanelOpen = isPanelOpen
    self.plusLabel = plusLabel
    self.closeLabel = closeLabel
    self.plusTurn = plusTurn
    self.hidden = hidden
    self.raised = raised
    self.rail = rail
    self.toolSlots = toolSlots
    self.tray = tray
    self.onSelect = onSelect
    self.onPlus = onPlus
  }

  /// tabs before the +
  private var leading: Int { items.count / 2 }
  /// (on the rail the + is not in the row: it stands on its own at the foot)
  private var columnCount: Int { rail ? items.count : items.count + 1 }

  /// the column a tab sits in: the + takes one in the middle
  private func column(of index: Int) -> Int {
    rail || index < leading ? index : index + 1
  }

  private var dragging: Bool { dragX != nil }

  /// the bar has grown around its tray: a tap on a tab closes it first, and plays no pick
  private var trayOpen: Bool { tray != nil && isPanelOpen }

  /// the tab drawn as selected: the one under a dragging finger, else the one just chosen, else the holder's
  private func shownTab(slot: CGFloat) -> Int? {
    if let dragX { return nearestTab(to: dragX, slot: slot) }
    if let pending { return pending }
    guard let selectedIndex, items.indices.contains(selectedIndex) else { return nil }
    return selectedIndex
  }

  private func nearestTab(to x: CGFloat, slot: CGFloat) -> Int {
    var best = 0
    var bestDistance = CGFloat.infinity
    for i in items.indices {
      let centre = (CGFloat(column(of: i)) + 0.5) * slot
      if abs(centre - x) < bestDistance {
        bestDistance = abs(centre - x)
        best = i
      }
    }
    return best
  }

  private func onPlusColumn(_ x: CGFloat, slot: CGFloat) -> Bool {
    !rail && Int(floor(x / slot)) == leading
  }

  public var body: some View {
    Group {
      if rail {
        railBody
      } else {
        barBody
      }
    }
    // the pages are told how many of their tools stand here (none unless this is the rail)
    .onChange(of: rail ? toolSlots : 0, initial: true) { _, n in
      KRailTools.shared.setRoom(n)
    }
    .onDisappear { KRailTools.shared.setRoom(0) }
  }

  /// where a touch is along the bar: across the screen on the bar, down it on the rail
  private func along(_ p: CGPoint) -> CGFloat { rail ? p.y : p.x }

  private var barBody: some View {
    let tone = KGlassTone.of(theme)
    let grown = trayOpen
    // the capsule's corners at any height: a capsule at 62, its corners kept while it grows;
    // raised, with the swell round the + over its top edge (flat while the bar is grown)
    let shape = outline(swell: grown ? 0 : 1)
    // the bar's height: 62, and the tray's own measured height while it is open
    let barHeight = KTabBarMetrics.height + (grown ? trayHeight : 0)
    return ZStack(alignment: .bottom) {
      // the tray, above the tab row, inside the glass: clipped away while closed
      if let tray {
        tray
          .dynamicTypeSize(...DynamicTypeSize.xxLarge)
          .fixedSize(horizontal: false, vertical: true)
          .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { trayHeight = $0 }
          // ONLY the opacity is animated (owner on TestFlight 1.2.8, 2026-11-10: "sometimes Write a
          // letter and Daily note come down from the top"). An .animation(_:value:) here also
          // animated where the tray sits: when the Host grew from the bar's strip to the whole screen
          // in the same pass that `grown` flipped, the rows travelled from the old layout, whose top
          // is the top of the screen. Scoped to the closure, a change of place is never animated.
          .animation(reduceMotion ? KMotion.publishReduced : grown ? KMotion.trayIn : KMotion.trayOut) { $0.opacity(grown ? 1 : 0) }
          .allowsHitTesting(grown)
          .accessibilityHidden(!grown)
          .padding(.bottom, KTabBarMetrics.height)
      }
      tabRow(tone: tone, lifted: !grown)
    }
    // bottom edge fixed: the frame grows upward and the tab row stays at its foot (the headroom
    // above the top edge is the swell's)
    .frame(height: barHeight + headroom, alignment: .bottom)
    .frame(maxWidth: .infinity)
    .background { KGlassFace(tone: tone, shape: shape) }
    .clipShape(shape)
    .background { KOuterShadow(shadows: tone.shadow, shape: shape) }
    // THE GROWTH (P2: .45s, the bottom edge fixed). Keyed to the height, not to open or closed:
    // a tray measured a pass late, or a third row arriving, still travels. It sits OUTSIDE the
    // glass face, the clip and the shadow, because an animation only moves what it wraps: put
    // straight after the frame (as it was until 2026-11-10) it wrapped the rows and the tab row,
    // which don't move, and left the glass, its corners and its shadow to jump to the new height
    // in one frame. Frame by frame on the simulator the bar popped open and popped shut; that,
    // more than anything, is what the owner saw as "not as smooth as P2". (A scoped
    // .animation { $0.frame(height:) } does not animate a frame either.) Wrapping the whole bar
    // also means it would move the bar if its place in the Host changed in the same pass, which
    // is why KTabStage opens the + only one pass after the Host has grown (`shownOpen` there).
    .animation(reduceMotion ? nil : KMotion.barGrow, value: barHeight)
    .environment(\.colorScheme, theme.isDark ? .dark : .light)
    .onChange(of: selectedIndex) { _, _ in pending = nil }
    // out of the way for the publish sheet: down 160, or with Reduce Motion a fade
    .animation(reduceMotion ? .easeInOut(duration: 0.25) : KMotion.plusTurnPublish) {
      $0
        .offset(y: hidden && !reduceMotion ? KTabBarMetrics.hiddenDrop : 0)
        .opacity(hidden && reduceMotion ? 0 : 1)
    }
    .allowsHitTesting(!hidden)
    .accessibilityElement(children: .contain)
    .accessibilityHidden(hidden)
  }

  // ── the rail (KTabBarMetrics, THE RAIL): the tabs upright, and the + on its own at the foot ──
  private var railBody: some View {
    let tone = KGlassTone.of(theme)
    let grown = trayOpen
    return VStack(alignment: .trailing, spacing: KTabBarMetrics.railGap) {
      // the +'s card grows up over where the tools and the tabs stand: they step out while it
      // is open
      VStack(spacing: KTabBarMetrics.railGap) {
        railToolColumn
        railTabs(tone: tone)
      }
      .animation(reduceMotion ? KMotion.publishReduced : grown ? KMotion.trayOut : KMotion.trayIn) { $0.opacity(grown ? 0 : 1) }
      .allowsHitTesting(!grown)
      .accessibilityHidden(grown)
      railPod(tone: tone, grown: grown)
    }
    .frame(width: KTabBarMetrics.height)
    .environment(\.colorScheme, theme.isDark ? .dark : .light)
    .onChange(of: selectedIndex) { _, _ in pending = nil }
    // out of the way (Today's reply has the keyboard): off the right edge, or a fade
    .animation(reduceMotion ? .easeInOut(duration: 0.25) : KMotion.plusTurnPublish) {
      $0
        .offset(x: hidden && !reduceMotion ? KTabBarMetrics.hiddenDrop : 0)
        .opacity(hidden && reduceMotion ? 0 : 1)
    }
    .allowsHitTesting(!hidden)
    .accessibilityElement(children: .contain)
    .accessibilityHidden(hidden)
  }

  /// the selected page's own tools (KRailTools), over the tabs: as many as the band has room for.
  /// Each is the button the page would have drawn in its header; they change with the tab.
  private var railToolColumn: some View {
    let tab: KTabGlyph? = selectedIndex.flatMap { items.indices.contains($0) ? items[$0].glyph : nil }
    let list = tab.map { Array((railTools.tools[$0] ?? []).prefix(max(0, toolSlots))) } ?? []
    return VStack(spacing: KTabBarMetrics.railToolGap) {
      ForEach(list) { tool in
        tool.view
          .frame(width: KTabBarMetrics.railTool, height: KTabBarMetrics.railTool)
          .transition(reduceMotion ? .opacity : .scale(scale: 0.6).combined(with: .opacity))
      }
    }
    .frame(width: KTabBarMetrics.height)
    .padding(.bottom, list.isEmpty ? 0 : KTabBarMetrics.railToolsGap - KTabBarMetrics.railGap)
    .dynamicTypeSize(...DynamicTypeSize.large)
    .animation(reduceMotion ? .easeInOut(duration: 0.2) : .spring(duration: 0.3, bounce: 0.2), value: list.map(\.id))
  }

  /// the tabs' capsule: the four icons top to bottom, the lens behind them
  private func railTabs(tone: KGlassTone) -> some View {
    let shape = RoundedRectangle(cornerRadius: KTabBarMetrics.corner, style: .circular)
    let length = KTabBarMetrics.railTabsLength(items.count)
    let slot = KTabBarMetrics.railSlot
    let shown = shownTab(slot: slot)
    return ZStack(alignment: .topLeading) {
      lens(tone: tone, width: length, slot: slot, shown: shown)
      VStack(spacing: 0) {
        ForEach(items.indices, id: \.self) { i in
          tab(i, items[i], on: i == shown, tone: tone)
        }
      }
      .frame(width: KTabBarMetrics.height, height: length)
    }
    .frame(width: KTabBarMetrics.height, height: length)
    .contentShape(Rectangle())
    .gesture(barGesture(slot: slot))
    .background { KGlassFace(tone: tone, shape: shape) }
    .clipShape(shape)
    .background { KOuterShadow(shadows: tone.shadow, shape: shape) }
    .dynamicTypeSize(...DynamicTypeSize.large)
    .accessibilityElement(children: .contain)
    .accessibilityAddTraits(.isTabBar)
  }

  /// The + on the rail and what it opens. Its place in the rail is always the 62 square at the
  /// foot; grown, the glass reaches out of that square to the left and up (a frame bigger than
  /// its place, held by its bottom right corner), so nothing above it moves.
  private func railPod(tone: KGlassTone, grown: Bool) -> some View {
    let side = KTabBarMetrics.height
    // closed, the glass is tucked under the disc (no rim round the +); grown, it is the card
    let shape = KPodOutline(corner: KTabBarMetrics.corner, tuck: grown ? 0 : (side - KTabBarMetrics.railPlus) / 2 + 1)
    let width = side + (grown ? KTabBarMetrics.railTray : 0)
    let height = max(side, grown ? trayHeight : 0)
    return ZStack(alignment: .bottomTrailing) {
      if let tray {
        tray
          .dynamicTypeSize(...DynamicTypeSize.xLarge)
          .frame(width: KTabBarMetrics.railTray)
          .fixedSize(horizontal: false, vertical: true)
          .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { trayHeight = $0 }
          // only the opacity is animated, as on the bar (see barBody)
          .animation(reduceMotion ? KMotion.publishReduced : grown ? KMotion.trayIn : KMotion.trayOut) { $0.opacity(grown ? 1 : 0) }
          .allowsHitTesting(grown)
          .accessibilityHidden(!grown)
          .padding(.trailing, side - 6)
      }
      plus()
        .frame(width: side, height: side)
        .onTapGesture { onPlus() }
    }
    // bottom right corner fixed: the frame grows to the left and up, the + stays in its corner
    .frame(width: width, height: height, alignment: .bottomTrailing)
    .background { KGlassFace(tone: tone, shape: shape) }
    .clipShape(shape)
    .background {
      // the card's shadow; closed, the disc has its own
      KOuterShadow(shadows: tone.shadow, shape: shape)
        .animation(reduceMotion ? nil : KMotion.barGrow) { $0.opacity(grown ? 1 : 0) }
    }
    // the growth, outside the glass, the clip and the shadow, as on the bar
    .animation(reduceMotion ? nil : KMotion.barGrow, value: width)
    .animation(reduceMotion ? nil : KMotion.barGrow, value: height)
    .frame(width: side, height: side, alignment: .bottomTrailing)
  }

  /// room over the bar's top edge for the swell round a raised +
  private var headroom: CGFloat { raised ? KTabBarMetrics.plusHeadroom : 0 }

  /// The bar's outline in a frame `headroom` taller than the bar: the capsule, and with a raised
  /// + the swell over its top edge (swell 1; 0 is the capsule alone).
  private func outline(swell: CGFloat) -> KBarOutline {
    KBarOutline(
      corner: KTabBarMetrics.corner,
      headroom: headroom,
      collarRadius: KTabBarMetrics.plusRaisedSize / 2 + KTabBarMetrics.collarGap,
      collarCentre: KTabBarMetrics.height / 2 - KTabBarMetrics.plusRise,
      fillet: KTabBarMetrics.collarFillet,
      swell: raised ? swell : 0
    )
  }

  /// the 62 row of tabs and the +, with the lens behind them; `lifted`: a raised + is up (the bar
  /// is not grown round its tray)
  private func tabRow(tone: KGlassTone, lifted: Bool) -> some View {
    GeometryReader { geo in
      let width = geo.size.width
      let slot = width / CGFloat(max(1, columnCount))
      let shown = shownTab(slot: slot)
      ZStack(alignment: .topLeading) {
        lens(tone: tone, width: width, slot: slot, shown: shown)
        HStack(spacing: 0) {
          ForEach(0..<columnCount, id: \.self) { c in
            if c == leading {
              plus()
            } else {
              let i = c < leading ? c : c - 1
              tab(i, items[i], on: i == shown, tone: tone)
            }
          }
        }
        .frame(width: width, height: KTabBarMetrics.height)
      }
      .frame(width: width, height: KTabBarMetrics.height)
      // the row's touch is the bar's own outline, the swell included: the part of a raised + that
      // stands over the top edge is pressed like the rest of it
      .frame(width: width, height: KTabBarMetrics.height + headroom, alignment: .bottom)
      .contentShape(outline(swell: lifted ? 1 : 0))
      .gesture(barGesture(slot: slot))
    }
    .frame(height: KTabBarMetrics.height + headroom)
    // the row never grows; its count is the only text (see the note at the top)
    .dynamicTypeSize(...DynamicTypeSize.large)
    .accessibilityElement(children: .contain)
    .accessibilityAddTraits(.isTabBar)
  }

  // ── touch: one gesture for the whole bar, so a press can turn into a drag (G Prompt 2) ──
  private func barGesture(slot: CGFloat) -> some Gesture {
    DragGesture(minimumDistance: 0, coordinateSpace: .local)
      .onChanged { value in
        // the grown bar: a tab only closes the tray, so no press and no drag to show
        if trayOpen { return }
        let x = along(value.location)
        if downX == nil {
          downX = x
          pressed = !onPlusColumn(x, slot: slot)
        }
        if dragX != nil || abs(x - (downX ?? x)) > KTabBarMetrics.dragSlop {
          dragX = x
          pressed = true
        }
      }
      .onEnded { value in
        if trayOpen {
          downX = nil
          dragX = nil
          pressed = false
          // the x closes as ever; a tab is reported, and the holder only closes the tray
          if onPlusColumn(along(value.location), slot: slot) {
            onPlus()
          } else {
            onSelect(nearestTab(to: along(value.location), slot: slot))
          }
          return
        }
        let x = dragX ?? along(value.location)
        let dragged = dragX != nil
        let wasShown = shownTab(slot: slot)
        downX = nil
        dragX = nil
        pressed = false
        if !dragged && onPlusColumn(x, slot: slot) {
          onPlus()
          return
        }
        let k = nearestTab(to: x, slot: slot)
        if dragged || k != wasShown {
          pick &+= 1
          pending = k
          // if the holder refuses the tab, the lens goes back to where selectedIndex is
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            if pending == k { pending = nil }
          }
        }
        onSelect(k)
      }
  }

  // ── the lens (G Prompts 1-2) ──
  private func lens(tone: KGlassTone, width: CGFloat, slot: CGFloat, shown: Int?) -> some View {
    // read here, not inside the animator's closures, which run off the main actor
    let stretches = !reduceMotion
    let isDragging = dragging
    // on the rail everything that ran across the bar runs down it: the lens's place, the way it
    // stretches when it is picked and when it is dragged. `width` is then the rail's length.
    let upright = rail
    let size = upright ? KTabBarMetrics.railLens : KTabBarMetrics.lensSize
    let reach = upright ? size.height : size.width
    let shape = RoundedRectangle(cornerRadius: min(size.width, size.height) / 2, style: .circular)
    let x: CGFloat = {
      if let dragX { return min(max(KTabBarMetrics.dragSlop, dragX - reach / 2), width - reach - KTabBarMetrics.dragSlop) }
      guard let shown else { return 0 }
      return (CGFloat(column(of: shown)) + 0.5) * slot - reach / 2
    }()
    let pressAlong: CGSize = dragging ? CGSize(width: 1.22, height: 0.9) : pressed ? CGSize(width: 1.12, height: 1.12) : CGSize(width: 1, height: 1)
    let press = upright ? CGSize(width: pressAlong.height, height: pressAlong.width) : pressAlong
    return Group {
      if shown != nil {
        // inner: the stretch each new pick plays once
        shape
          .fill(pressed ? tone.lensPressed : tone.lens)
          .overlay(shape.strokeBorder(tone.lensRing, lineWidth: 0.5))
          // inset 0 1 0 white: a bright line along the lens's top edge
          .overlay(
            shape.strokeBorder(
              LinearGradient(colors: [tone.lensRing, tone.lensRing.opacity(0)], startPoint: .top, endPoint: UnitPoint(x: 0.5, y: 0.3)),
              lineWidth: 1
            )
          )
          .overlay(
            shape.strokeBorder(
              LinearGradient(colors: [tone.bottomLine.opacity(0), tone.bottomLine], startPoint: UnitPoint(x: 0.5, y: 0.6), endPoint: .bottom),
              lineWidth: 1
            )
          )
          .background { KOuterShadow(shadows: tone.lensShadow, shape: shape) }
          .animation(.easeOut(duration: 0.18), value: pressed)
          .keyframeAnimator(initialValue: CGSize(width: 1, height: 1), trigger: pick) { content, s in
            let live = stretches && !isDragging
            return content.scaleEffect(x: live ? (upright ? s.height : s.width) : 1, y: live ? (upright ? s.width : s.height) : 1)
          } keyframes: { _ in
            KeyframeTrack(\.width) {
              LinearKeyframe(1.5, duration: 0.15, timingCurve: KMotion.lensStretchStep)
              LinearKeyframe(0.94, duration: 0.175, timingCurve: KMotion.lensStretchStep)
              LinearKeyframe(1, duration: 0.175, timingCurve: KMotion.lensStretchStep)
            }
            KeyframeTrack(\.height) {
              LinearKeyframe(0.8, duration: 0.15, timingCurve: KMotion.lensStretchStep)
              LinearKeyframe(1.06, duration: 0.175, timingCurve: KMotion.lensStretchStep)
              LinearKeyframe(1, duration: 0.175, timingCurve: KMotion.lensStretchStep)
            }
          }
          // middle: the press and the drag
          .scaleEffect(x: press.width, y: press.height)
          .animation(KMotion.lensPress, value: press)
          .frame(width: size.width, height: size.height)
          // outer: the place; it follows a dragging finger at once
          .offset(x: upright ? (KTabBarMetrics.height - size.width) / 2 : x, y: upright ? x : (KTabBarMetrics.height - size.height) / 2)
          .animation(dragging ? nil : (stretches ? KMotion.lensSlide : KMotion.lensSlideReduced), value: x)
      }
    }
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }

  // ── a tab ──
  private func tab(_ i: Int, _ item: KTabItem, on: Bool, tone: KGlassTone) -> some View {
    let count = on ? 0 : max(0, item.badge)
    // The accent of a selected tab is ind, as in the App Store version (G1). It was postmark
    // red for an afternoon (2026-11-12, after a mock); the owner, the same evening, having
    // looked at both: "底部导航还是蓝色适合我们 类似线上的版本". Indigo is the colour of everything
    // else that asks to be tapped here (Reply, YOUR TURN, the unread counts in the list).
    // The whole selected icon is ind, its outline too (owner, 2026-11-13: "底导图标点上后的蓝色变
    // 化是不是有点浅"): the accents alone (two 3.2 eyes, a folded corner) were too little blue to
    // read as the page you are on; iOS's own bar tints the whole selected icon. Unselected icons
    // keep the bar's grey. To go back to ink outlines, lineColor `on ? theme.ink`.
    return KTabIcon(glyph: item.glyph, on: on, lineColor: on ? theme.ind : tone.rest, accentColor: on ? theme.ind : tone.rest, pick: pick, moves: on && !reduceMotion)
      .animation(KMotion.tabTint, value: on)
      .frame(width: KTabBarMetrics.lensSize.width, height: KTabBarMetrics.lensSize.height)
      .overlay(alignment: .topTrailing) {
        if count > 0 {
          KTabBadge(theme: theme, ring: tone.badgeRing, count: count)
            .padding(.top, 3)
            .padding(.trailing, 9)
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .contentShape(Rectangle())
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(item.label)
      .accessibilityValue(count > 0 ? Text(count > 9 ? "9+" : String(count)) : Text(verbatim: ""))
      .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
      .accessibilityAction { onSelect(i) }
      .accessibilityShowsLargeContentViewer {
        Label(item.label, systemImage: item.glyph.systemImage)
      }
  }

  // ── the + (G Prompt 3) ──
  private func plus() -> some View {
    // the grown bar's + under Reduce Motion doesn't turn: the + and the x cross-fade
    KGlassPlus(theme: theme, isOpen: isPanelOpen, turn: reduceMotion ? .easeInOut(duration: 0.25) : plusTurn, turns: !(reduceMotion && tray != nil), size: rail ? KTabBarMetrics.railPlus : raised ? KTabBarMetrics.plusRaisedSize : KTabBarMetrics.plusSize)
      // raised: up out of the row's middle, and kept there while the bar is grown round its tray
      // (it used to come back down into the row as the bar grew: the + fell under the finger)
      .offset(y: !rail && raised ? -KTabBarMetrics.plusRise : 0)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .contentShape(Rectangle())
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(isPanelOpen ? closeLabel : plusLabel)
      .accessibilityAddTraits(.isButton)
      .accessibilityAction { onPlus() }
      .accessibilityShowsLargeContentViewer {
        Label(isPanelOpen ? closeLabel : plusLabel, systemImage: isPanelOpen ? "xmark" : "plus")
      }
  }
}

/// The capsule's glass, inside its edge (G Prompt 1). The caller clips it to the capsule. Its ring
/// and lines keep the capsule's corners at any height, so the bar grown around its tray is the
/// same glass, taller.
struct KGlassFace<S: InsettableShape>: View {
  let tone: KGlassTone
  /// the bar's outline (the caller clips to the same)
  let shape: S

  var body: some View {
    ZStack {
      Rectangle().fill(.ultraThinMaterial)
      Rectangle().fill(tone.tint)
      // linear-gradient(180deg, white .55 0%, transparent 55%)
      LinearGradient(colors: [tone.topFade, tone.topFade.opacity(0)], startPoint: .top, endPoint: UnitPoint(x: 0.5, y: 0.55))
      shape.strokeBorder(tone.ring, lineWidth: 0.5)
      // inset 0 1.5 1 white: the bright line along the top edge
      shape
        .strokeBorder(LinearGradient(colors: [tone.topLine, tone.topLine.opacity(0)], startPoint: .top, endPoint: UnitPoint(x: 0.5, y: 0.25)), lineWidth: 1.5)
        .blur(radius: 0.5)
      // inset 0 -1.5 2 ink .08: the faint dark line along the bottom
      shape
        .strokeBorder(LinearGradient(colors: [tone.bottomLine.opacity(0), tone.bottomLine], startPoint: UnitPoint(x: 0.5, y: 0.7), endPoint: .bottom), lineWidth: 1.5)
        .blur(radius: 1)
    }
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

/// Soft shadows of a shape drawn outside it only, as CSS's box-shadow is: under a glass face a
/// shadow behind would show through and grey it.
struct KOuterShadow<S: InsettableShape>: View {
  let shadows: [KSoftShadow]
  let shape: S

  var body: some View {
    ZStack {
      Color.clear.kSoftShadows(shadows, in: shape)
      // cut the shape itself out of its shadows
      shape.fill(Color.black).blendMode(.destinationOut)
    }
    .compositingGroup()
    .allowsHitTesting(false)
      .accessibilityHidden(true)
  }
}

/// The +: an ink disc with the + in the page's colour (KTabBarMetrics.plusMark, plusStroke), and a bright line along
/// its top; open, it turns 45 degrees into an x and the disc goes ind with the x in white
/// (owner, 2026-11-12: "➕ 咱们的蓝色 换成贴图三那样的黑色设计", then that evening "➕还是黑圈白➕
/// 一点之后变成蓝底白x"; it opened postmark red in between). G1 had an ind disc that went ink. On a dark theme ink is the light
/// colour, so the disc is light with a dark +, as the theme's other ink buttons are. turns false
/// (the grown bar under Reduce Motion) keeps it still: the + fades out as an x, already turned,
/// fades in.
struct KGlassPlus: View {
  let theme: KTheme
  let isOpen: Bool
  let turn: Animation
  var turns = true
  /// the disc: KTabBarMetrics.plusSize in the row, plusRaisedSize raised, railPlus on the rail
  var size: CGFloat = KTabBarMetrics.plusSize

  var body: some View {
    let disc = Circle()
    // Every animation here is scoped to one effect (the turn, a fade), never .animation(_:value:)
    // on the disc: that also animated where the disc sits, and when the Host grew to the whole
    // screen in the pass that opened the +, the disc could ride in from the old layout
    // (owner on TestFlight 1.2.8, 2026-11-10). The disc goes from ink to red as red fading in
    // over ink, which draws the same blend; the mark from the page's colour to white likewise.
    ZStack {
      mark(theme.bg).animation(turn) { $0.opacity(turns || !isOpen ? 1 : 0) }
      mark(openMark).animation(turn) { $0.opacity(turns && isOpen ? 1 : 0) }
      if !turns {
        mark(openMark).rotationEffect(.degrees(45)).animation(turn) { $0.opacity(isOpen ? 1 : 0) }
      }
    }
      .frame(width: size, height: size)
      .background {
        ZStack {
          disc.fill(theme.ink)
          // open: ind (owner, 2026-11-12 evening: "一点之后变成蓝底白x"; red for an afternoon)
          disc.fill(theme.ind).animation(turn) { $0.opacity(isOpen ? 1 : 0) }
        }
      }
      .overlay(
        disc.strokeBorder(
          LinearGradient(colors: [Color.white.opacity(0.35), Color.white.opacity(0)], startPoint: .top, endPoint: UnitPoint(x: 0.5, y: 0.2)),
          lineWidth: 1
        )
      )
      .animation(turn) { $0.rotationEffect(.degrees(turns && isOpen ? 45 : 0)) }
      .kSoftShadows([KSoftShadow(y: 6, blur: 16, spread: -6, color: Color.black.opacity(theme.isDark ? 0.55 : 0.32))], in: disc)
      .accessibilityHidden(true)
  }

  /// the x on the open disc: white on ind; on the dark theme, whose ind is pale, the page's
  /// colour (white on it is under 3:1)
  private var openMark: Color { theme.isDark ? theme.bg : Color.white }

  private func mark(_ color: Color) -> some View {
    KPlusGlyph()
      .stroke(color, style: StrokeStyle(lineWidth: KTabBarMetrics.plusStroke, lineCap: .round))
      .frame(width: KTabBarMetrics.plusMark, height: KTabBarMetrics.plusMark)
  }
}

/// The bar's outline (THE RAISED +, KTabBarMetrics): a rounded rectangle whose corners keep the
/// capsule's radius at any height, set `headroom` down from the top of its frame, and over its
/// top edge, in the middle, a round collar that meets the edge in a hollow either side. One
/// closed path, so the glass, its bright edge and its shadow all follow the swell. `swell` runs
/// from 0 (the collar sunk under the edge: the plain bar) to 1 and animates.
struct KBarOutline: InsettableShape {
  var corner: CGFloat
  var headroom: CGFloat
  /// the collar's radius, and its centre's depth under the bar's top edge at swell 1
  var collarRadius: CGFloat
  var collarCentre: CGFloat
  /// the hollow's radius where the collar meets the edge
  var fillet: CGFloat
  var swell: CGFloat
  var inset: CGFloat = 0

  var animatableData: CGFloat {
    get { swell }
    set { swell = newValue }
  }

  func inset(by amount: CGFloat) -> KBarOutline {
    var s = self
    s.inset += amount
    return s
  }

  func path(in rect: CGRect) -> Path {
    let top = rect.minY + headroom
    let bar = CGRect(x: rect.minX + inset, y: top + inset, width: max(0, rect.width - inset * 2), height: max(0, rect.maxY - top - inset * 2))
    let r = max(0, min(corner - inset, bar.width / 2, bar.height / 2))
    // the collar's centre: sunk until its top is 2 under the edge at swell 0
    let depth = collarCentre + (1 - min(max(swell, 0), 1)) * (collarRadius - collarCentre + 2)
    let over = collarRadius - depth
    guard over > 0.5, bar.width > 0, bar.height > 0 else {
      return Path(roundedRect: bar, cornerRadius: r, style: .circular)
    }
    // the hollow is no deeper than the swell is tall, so a low swell is a low wave, not a notch
    let f = min(fillet, over * 1.2)
    let c = CGPoint(x: rect.midX, y: top + depth)
    // the hollows' centres sit f over the edge, where they touch both the edge and the collar
    let reach = (collarRadius + f) * (collarRadius + f) - (depth + f) * (depth + f)
    let a = reach > 0 ? reach.squareRoot() : 0
    guard a > 0, c.x - a > bar.minX + r, c.x + a < bar.maxX - r else {
      return Path(roundedRect: bar, cornerRadius: r, style: .circular)
    }
    let rc = max(0, collarRadius - inset)
    let rf = f + inset
    let left = CGPoint(x: c.x - a, y: top - f)
    let right = CGPoint(x: c.x + a, y: top - f)
    func arc(_ centre: CGPoint, _ radius: CGFloat, from: CGFloat, to: CGFloat, into p: inout Path) {
      let steps = 14
      for i in 0...steps {
        let t = from + (to - from) * CGFloat(i) / CGFloat(steps)
        p.addLine(to: CGPoint(x: centre.x + radius * cos(t), y: centre.y + radius * sin(t)))
      }
    }
    // angles with y down: the left hollow runs from straight down to where it meets the collar
    let meetLeft = atan2(depth + f, a)
    let meetRight = atan2(depth + f, -a)
    let collarFrom = atan2(-(depth + f), -a)
    let collarTo = atan2(-(depth + f), a)
    var p = Path()
    p.move(to: CGPoint(x: bar.minX + r, y: bar.minY))
    arc(left, rf, from: .pi / 2, to: meetLeft, into: &p)
    arc(c, rc, from: collarFrom, to: collarTo, into: &p)
    arc(right, rf, from: meetRight, to: .pi / 2, into: &p)
    p.addLine(to: CGPoint(x: bar.maxX - r, y: bar.minY))
    p.addArc(tangent1End: CGPoint(x: bar.maxX, y: bar.minY), tangent2End: CGPoint(x: bar.maxX, y: bar.minY + r), radius: r)
    p.addLine(to: CGPoint(x: bar.maxX, y: bar.maxY - r))
    p.addArc(tangent1End: CGPoint(x: bar.maxX, y: bar.maxY), tangent2End: CGPoint(x: bar.maxX - r, y: bar.maxY), radius: r)
    p.addLine(to: CGPoint(x: bar.minX + r, y: bar.maxY))
    p.addArc(tangent1End: CGPoint(x: bar.minX, y: bar.maxY), tangent2End: CGPoint(x: bar.minX, y: bar.maxY - r), radius: r)
    p.addLine(to: CGPoint(x: bar.minX, y: bar.minY + r))
    p.addArc(tangent1End: CGPoint(x: bar.minX, y: bar.minY), tangent2End: CGPoint(x: bar.minX + r, y: bar.minY), radius: r)
    p.closeSubpath()
    return p
  }
}

/// The outline of the +'s own glass on the rail (KTabBarMetrics, THE RAIL): a rounded rectangle
/// with the bar's corners, drawn `tuck` inside its frame. Closed, the frame is the 62 square and
/// the tuck puts the glass wholly under the disc, where it is a circle; grown, the tuck is 0 and
/// it is the card. The tuck animates, so the glass comes out from under the disc as it grows.
struct KPodOutline: InsettableShape {
  var corner: CGFloat
  var tuck: CGFloat
  var inset: CGFloat = 0

  var animatableData: CGFloat {
    get { tuck }
    set { tuck = newValue }
  }

  func inset(by amount: CGFloat) -> KPodOutline {
    var s = self
    s.inset += amount
    return s
  }

  func path(in rect: CGRect) -> Path {
    let r = rect.insetBy(dx: tuck + inset, dy: tuck + inset)
    guard r.width > 0, r.height > 0 else { return Path() }
    let c = min(max(0, corner - inset), min(r.width, r.height) / 2)
    return Path(roundedRect: r, cornerRadius: c, style: .circular)
  }
}

/// The M2 drawings on their 28 grid (G Prompt 3), read once.
enum KTabArt {
  static let grid: CGFloat = 28

  static func outline(_ g: KTabGlyph) -> Path {
    switch g {
    case .today: return todayOutline
    case .notes: return notesOutline
    case .kindreds: return kindredsOutline
    case .me: return meOutline
    }
  }

  static func accent(_ g: KTabGlyph) -> Path {
    switch g {
    case .today: return todayAccent
    case .notes: return notesAccent
    case .kindreds: return kindredsAccent
    case .me: return meAccent
    }
  }

  /// The point each accent moves about: the centre of its own box, as CSS's transform-box: fill-box does.
  static func anchor(_ g: KTabGlyph) -> UnitPoint {
    let r = accent(g).boundingRect
    return UnitPoint(x: r.midX / grid, y: r.midY / grid)
  }

  static let todayOutline = KSVGPath.path("M14 3.8L4.2 10.6h2.6V21c0 .9-.9 1.6-1.6 2.4h17.6c-.7-.8-1.6-1.5-1.6-2.4V10.6h2.6z")
  /// the slot, solid
  static let todayAccent = KSVGPath.path("M10 13.2h8v2.6h-8z")
  static let notesOutline = KSVGPath.path("M6.5 5h15v12l-6 6.5h-9z M15.5 23.5V17h6")
  /// the folded corner, solid
  static let notesAccent = KSVGPath.path("M15.5 17h6l-6 6.5z")
  static let kindredsOutline = KSVGPath.path("M5 6h18v12H11l-6 5z")
  /// the two eyes, solid
  static let kindredsAccent: Path = {
    var p = Path()
    p.addEllipse(in: CGRect(x: 10.5 - 1.6, y: 10.6 - 1.6, width: 3.2, height: 3.2))
    p.addEllipse(in: CGRect(x: 17.5 - 1.6, y: 10.6 - 1.6, width: 3.2, height: 3.2))
    return p
  }()
  static let meOutline = KSVGPath.path("M14 4.5c2.9 0 5 2.4 5 5.5s-2.1 5.5-5 5.5-5-2.4-5-5.5 2.1-5.5 5-5.5z M5 24c.8-4.4 4.4-6.5 9-6.5s8.2 2.1 9 6.5")
  /// the smile, a stroke
  static let meAccent = KSVGPath.path("M11.8 11.6c1.2 1.1 3.2 1.1 4.4 0")
}

/// A path on the 28 grid, drawn to whatever frame it is given.
struct KTabArtShape: Shape {
  let art: Path

  func path(in rect: CGRect) -> Path {
    art.applying(CGAffineTransform(scaleX: rect.width / KTabArt.grid, y: rect.height / KTabArt.grid))
  }
}

/// An accent's move (G Prompt 3): one value per kind of move, so one animator serves all four.
struct KTabAccentMove {
  var angle: Double = 0
  var scale: CGFloat = 1
  var scaleY: CGFloat = 1
  var draw: CGFloat = 1
}

/// A tab's icon, 30 across: the outline at 2 (2.4 selected) of its 28 units and the accent,
/// which moves once on each new pick while the tab is selected.
struct KTabIcon: View {
  static let side: CGFloat = 30

  let glyph: KTabGlyph
  let on: Bool
  let lineColor: Color
  let accentColor: Color
  /// bumped by each new pick
  let pick: Int
  /// the accent moves (selected, and Reduce Motion off)
  let moves: Bool

  var body: some View {
    let unit = Self.side / KTabArt.grid
    let glyph = glyph
    let moves = moves
    ZStack {
      KTabArtShape(art: KTabArt.outline(glyph))
        .stroke(lineColor, style: StrokeStyle(lineWidth: (on ? 2.4 : 2) * unit, lineCap: .round, lineJoin: .round))
      accent(unit: unit)
        .keyframeAnimator(initialValue: KTabAccentMove(), trigger: pick) { content, m in
          content
            .rotationEffect(.degrees(moves && glyph == .today ? m.angle : 0), anchor: KTabArt.anchor(glyph))
            .scaleEffect(moves && glyph == .notes ? m.scale : 1, anchor: KTabArt.anchor(glyph))
            .scaleEffect(x: 1, y: moves && glyph == .kindreds ? m.scaleY : 1, anchor: KTabArt.anchor(glyph))
        } keyframes: { _ in
          // .55s in all; the steps are the mock's keyframe stops
          KeyframeTrack(\.angle) {
            LinearKeyframe(-14, duration: 0.1375, timingCurve: KMotion.tabAccentStep)
            LinearKeyframe(10, duration: 0.1925, timingCurve: KMotion.tabAccentStep)
            LinearKeyframe(0, duration: 0.22, timingCurve: KMotion.tabAccentStep)
          }
          KeyframeTrack(\.scale) {
            MoveKeyframe(0)
            LinearKeyframe(1.35, duration: 0.33, timingCurve: KMotion.tabAccentStep)
            LinearKeyframe(1, duration: 0.22, timingCurve: KMotion.tabAccentStep)
          }
          KeyframeTrack(\.scaleY) {
            LinearKeyframe(0.1, duration: 0.165, timingCurve: KMotion.tabAccentStep)
            LinearKeyframe(1.2, duration: 0.1375, timingCurve: KMotion.tabAccentStep)
            LinearKeyframe(1, duration: 0.2475, timingCurve: KMotion.tabAccentStep)
          }
        }
    }
    .frame(width: Self.side, height: Self.side)
    .accessibilityHidden(true)
  }

  @ViewBuilder
  private func accent(unit: CGFloat) -> some View {
    let shape = KTabArtShape(art: KTabArt.accent(glyph))
    if glyph == .me {
      // the smile is a line; it draws in from its left end on each new pick
      KTabSmile(color: accentColor, lineWidth: 2.4 * unit, pick: pick, moves: moves)
    } else {
      shape.fill(accentColor)
    }
  }
}

/// Me's smile, drawn in on each new pick (the mock's stroke-dashoffset 1 to 0 over .55s).
struct KTabSmile: View {
  let color: Color
  let lineWidth: CGFloat
  let pick: Int
  let moves: Bool

  var body: some View {
    let moves = moves
    KTabArtShape(art: KTabArt.meAccent)
      .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round, lineJoin: .round))
      .keyframeAnimator(initialValue: CGFloat(1), trigger: pick) { content, drawn in
        content.mask {
          // a wipe from the left stands in for trimming the stroke
          GeometryReader { geo in
            Rectangle()
              .frame(width: geo.size.width * (moves ? drawn : 1))
              .frame(maxWidth: .infinity, alignment: .leading)
          }
        }
      } keyframes: { _ in
        KeyframeTrack {
          MoveKeyframe(0)
          LinearKeyframe(1, duration: 0.55, timingCurve: KMotion.tabAccentStep)
        }
      }
  }
}

/// A tab's count: an 18-tall ind pill, white 11 bold, ringed 2 in white (G Prompt 3).
struct KTabBadge: View {
  let theme: KTheme
  let ring: Color
  let count: Int

  var body: some View {
    Text(count > 9 ? "9+" : String(count))
      .font(.system(size: 11, weight: .bold))
      .monospacedDigit()
      // ind, as in the App Store version and as the unread counts in the Kindreds list are
      // (postmark red for an afternoon, 2026-11-12); on the dark theme's pale ind the digits
      // are the page's colour
      .foregroundStyle(theme.isDark ? theme.bg : Color.white)
      .lineLimit(1)
      .fixedSize()
      .padding(.horizontal, 5)
      .frame(minWidth: 18, minHeight: 18, maxHeight: 18)
      .background(Capsule().fill(theme.ind))
      .padding(2)
      .background(Capsule().fill(ring))
      .padding(-2)
      .accessibilityHidden(true)
  }
}
