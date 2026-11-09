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

 THE + (G Prompt 3): a 46 ind disc with a white + 22 across at 2.6 and an ind glow; open, it
 turns 45 degrees into an x and the disc goes ink. The holder still passes the turn's curve.

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
      tint: Color.white.opacity(0.22),
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
  private let tray: AnyView?
  private let onSelect: (Int) -> Void
  private let onPlus: () -> Void
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /// the tray's own height, measured, so the bar grows by exactly that
  @State private var trayHeight: CGFloat = 0

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
    self.tray = tray
    self.onSelect = onSelect
    self.onPlus = onPlus
  }

  /// tabs before the +
  private var leading: Int { items.count / 2 }
  private var columnCount: Int { items.count + 1 }

  /// the column a tab sits in: the + takes one in the middle
  private func column(of index: Int) -> Int {
    index < leading ? index : index + 1
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
    Int(floor(x / slot)) == leading
  }

  public var body: some View {
    let tone = KGlassTone.of(theme)
    // the capsule's corners at any height: a capsule at 62, its corners kept while it grows
    let shape = RoundedRectangle(cornerRadius: KTabBarMetrics.corner, style: .circular)
    let grown = trayOpen
    return ZStack(alignment: .bottom) {
      // the tray, above the tab row, inside the glass: clipped away while closed
      if let tray {
        tray
          .dynamicTypeSize(...DynamicTypeSize.xxLarge)
          .fixedSize(horizontal: false, vertical: true)
          .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { trayHeight = $0 }
          .opacity(grown ? 1 : 0)
          .animation(reduceMotion ? KMotion.publishReduced : grown ? KMotion.trayIn : KMotion.trayOut, value: grown)
          .allowsHitTesting(grown)
          .accessibilityHidden(!grown)
          .padding(.bottom, KTabBarMetrics.height)
      }
      tabRow(tone: tone)
    }
    // bottom edge fixed: the frame grows upward and the tab row stays at its foot
    .frame(height: KTabBarMetrics.height + (grown ? trayHeight : 0), alignment: .bottom)
    .animation(reduceMotion ? nil : KMotion.barGrow, value: grown)
    .frame(maxWidth: .infinity)
    .background { KGlassFace(tone: tone) }
    .clipShape(shape)
    .background { KOuterShadow(shadows: tone.shadow, shape: shape) }
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

  /// the 62 row of tabs and the +, with the lens behind them
  private func tabRow(tone: KGlassTone) -> some View {
    GeometryReader { geo in
      let width = geo.size.width
      let slot = width / CGFloat(max(1, columnCount))
      let shown = shownTab(slot: slot)
      ZStack(alignment: .topLeading) {
        lens(tone: tone, width: width, slot: slot, shown: shown)
        HStack(spacing: 0) {
          ForEach(0..<columnCount, id: \.self) { c in
            if c == leading {
              plus
            } else {
              let i = c < leading ? c : c - 1
              tab(i, items[i], on: i == shown, tone: tone)
            }
          }
        }
        .frame(width: width, height: KTabBarMetrics.height)
      }
      .frame(width: width, height: KTabBarMetrics.height)
      .contentShape(Capsule(style: .circular))
      .gesture(barGesture(slot: slot))
    }
    .frame(height: KTabBarMetrics.height)
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
        let x = value.location.x
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
          if onPlusColumn(value.location.x, slot: slot) {
            onPlus()
          } else {
            onSelect(nearestTab(to: value.location.x, slot: slot))
          }
          return
        }
        let x = dragX ?? value.location.x
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
    let size = KTabBarMetrics.lensSize
    let shape = RoundedRectangle(cornerRadius: size.height / 2, style: .circular)
    let x: CGFloat = {
      if let dragX { return min(max(KTabBarMetrics.dragSlop, dragX - size.width / 2), width - size.width - KTabBarMetrics.dragSlop) }
      guard let shown else { return 0 }
      return (CGFloat(column(of: shown)) + 0.5) * slot - size.width / 2
    }()
    let press: CGSize = dragging ? CGSize(width: 1.22, height: 0.9) : pressed ? CGSize(width: 1.12, height: 1.12) : CGSize(width: 1, height: 1)
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
            content.scaleEffect(x: stretches && !isDragging ? s.width : 1, y: stretches && !isDragging ? s.height : 1)
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
          .offset(x: x, y: (KTabBarMetrics.height - size.height) / 2)
          .animation(dragging ? nil : (stretches ? KMotion.lensSlide : KMotion.lensSlideReduced), value: x)
      }
    }
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }

  // ── a tab ──
  private func tab(_ i: Int, _ item: KTabItem, on: Bool, tone: KGlassTone) -> some View {
    let count = on ? 0 : max(0, item.badge)
    return KTabIcon(glyph: item.glyph, on: on, lineColor: on ? theme.ink : tone.rest, accentColor: on ? theme.ind : tone.rest, pick: pick, moves: on && !reduceMotion)
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
  private var plus: some View {
    // the grown bar's + under Reduce Motion doesn't turn: the + and the x cross-fade
    KGlassPlus(theme: theme, isOpen: isPanelOpen, turn: reduceMotion ? .easeInOut(duration: 0.25) : plusTurn, turns: !(reduceMotion && tray != nil))
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
struct KGlassFace: View {
  let tone: KGlassTone

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: KTabBarMetrics.corner, style: .circular)
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

/// The + (G Prompt 3): a 46 ind disc, a white + 22 across at 2.6, an ind glow and a bright line
/// along its top; open, it turns 45 degrees into an x and the disc goes ink. In Midnight the mark
/// is drawn in bg, as KPrimaryRound's is (white on its pale ind is under 3:1). turns false (the
/// grown bar under Reduce Motion) keeps it still: the + fades out as an x, already turned, fades in.
struct KGlassPlus: View {
  let theme: KTheme
  let isOpen: Bool
  let turn: Animation
  var turns = true

  var body: some View {
    let disc = Circle()
    ZStack {
      mark.opacity(turns || !isOpen ? 1 : 0)
      if !turns {
        mark.rotationEffect(.degrees(45)).opacity(isOpen ? 1 : 0)
      }
    }
      .frame(width: 46, height: 46)
      .background(disc.fill(isOpen ? theme.ink : theme.ind))
      .overlay(
        disc.strokeBorder(
          LinearGradient(colors: [Color.white.opacity(0.35), Color.white.opacity(0)], startPoint: .top, endPoint: UnitPoint(x: 0.5, y: 0.2)),
          lineWidth: 1
        )
      )
      .rotationEffect(.degrees(turns && isOpen ? 45 : 0))
      .animation(turn, value: isOpen)
      .kSoftShadows([KSoftShadow(y: 6, blur: 16, spread: -6, color: theme.ind.opacity(0.7))], in: disc)
      .accessibilityHidden(true)
  }

  private var mark: some View {
    KPlusGlyph()
      .stroke(theme.isDark ? theme.bg : Color.white, style: StrokeStyle(lineWidth: 2.6, lineCap: .round))
      .frame(width: 22, height: 22)
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
