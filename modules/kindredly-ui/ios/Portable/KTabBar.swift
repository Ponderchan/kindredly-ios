// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.
// The Expo side lives in Adapters/KTabBarView.swift; ui-lab shows it (kindredly:///ui-lab).

import SwiftUI

/*
 THE 10a TAB BAR (H:117-119, 445, 486; tokens-10a.md §7.3 and §11 item 6). A float: a solid sf
 face, corners of 34, 62 tall, 16 in from each side, the soft two-layer shadow and no glass
 (in Midnight a black shadow and a 1pt line edge, see KFloat).
 Five equal columns: two tabs, the round + (KPrimaryRound), two tabs. No words under the icons
 (the mock's showLabels is false); each tab's name is still there for VoiceOver and for the
 large content viewer.

 Where the selection is, the mock does not light up the icon's own capsule (it stays
 transparent, H:445). A LENS slides behind it instead (H:118):
 - 5 in from the bar's top and bottom, the column's width less 10, corners of 26, lav fill,
   a 1.5 ring of sf inside its edge and a glow under it, 0 3 10 -3 in ind at .35 (the mock's
   rgba(58,52,214,.35) in the light themes; Midnight's own ind there, see KSoftShadow.lensGlow);
 - it slides on .5s cubic-bezier(.3,1.45,.4,1), which runs well past the new column and comes
   back, and for the first half-second it is stretched sideways to 1.22 (scaleX on .25s
   ease-out, both ways), so it reads as something soft being pulled across;
 - 4 from the column's left and 6 from its right, as the mock has it (left: i·20% + 4, width:
   20% - 10). The 1pt lean is probably a slip in the mock's arithmetic, but it is kept: the bar
   matches 10a to the point, and a change from the mock is the owner's to make.

 The newly selected icon also pops (the tabpop keyframes, H:13 and 445): 1, then 1.24 turned
 -7°, then .95 turned 3°, then 1, over .5s, each step on cubic-bezier(.3,1.4,.5,1). It is drawn
 in ind with a stroke of 2.4 and a small solid accent (the dot in the envelope, the bar on the
 note, the two dots in the bubble, the dot under the head); the others are ink at 1.9, and the
 colour and stroke change on CSS's ease over .25s.

 The icons are the mock's own drawings (P:70-75), drawn 27 across, rather than SF Symbols: they
 are a handful of lines and arcs and the mock's accent fills belong to them. They live with the
 other line icons in Kit/KLineGlyph.swift (envelope, ruledCard, bubbles, person and their
 accents), moved there from this file onto the shared 24 grid; the mock's strokes of 1.9 and 2.4
 are in its 28 units, so they are scaled by 24/28 here and land on screen exactly as before.

 A tab can carry a count: an ind pill with the number in bg (mono 600 11, 18 tall, the mock's
 chip badge, H:62), set above and right of the icon with a 1.6 ring of the bar's own face so it
 reads cut out of the glyph. A number, never a dot (owner, 2026-09-20). It shows "9+" past nine
 and is hidden while its tab is the one selected, as the React Native bar's is (PostTabBar): the
 reader is already looking at what it counts.

 Selection belongs to whoever holds the bar. Tapping a tab only reports it (onSelect); the lens
 moves when selectedIndex changes, so a tab that refuses the press or a route changed from
 elsewhere both come out right. Pressing the tab that is already selected replays the pop and the
 stretch in place, as every pick does in the mock (H:445, 486), so the press is felt.

 The bar is fixed at 62 tall, so its one piece of text, the count, is held at the default
 Dynamic Type size, and each tab and the + show the large content viewer instead, as UIKit's
 own tab bar does. With Reduce Motion on, the lens slides on a plain ease without the stretch
 and the icons don't pop.

 THE PUBLISH ENTRY (Today 3d × 25b, Prompt 8; KPlusPanel.swift). The + is where a reader writes,
 and the holder can give it the design's turn, .35s cubic-bezier(.3,1.3,.4,1) (plusTurn,
 KMotion.plusTurnPublish), instead of the 10a sheet's. For a new reader the + opens a bottom
 sheet that takes the bar's place: hidden drops the whole bar 160 on that same curve, out of
 sight and out of reach, and brings it back up when the sheet goes. With Reduce Motion it fades
 out and in instead.
 */

/// The four tabs' drawings (P:70-75). The order on the bar is the caller's.
public enum KTabGlyph: String, CaseIterable, Sendable {
  /// Today: an envelope; selected, a dot inside it
  case today
  /// Notes: a ruled card; selected, a bar over its middle line
  case notes
  /// Kindreds: a speech bubble with another answering it; selected, two dots in the first
  case kindreds
  /// Me: a head and shoulders; selected, a dot under the head
  case me

  /// the line drawing (KLineGlyph.swift)
  public var outline: KLineGlyph {
    switch self {
    case .today: return .envelope
    case .notes: return .ruledCard
    case .kindreds: return .bubbles
    case .me: return .person
    }
  }

  /// the solid accent drawn over it while the tab is selected
  public var accent: KLineGlyph {
    switch self {
    case .today: return .envelopeDot
    case .notes: return .ruledCardBar
    case .kindreds: return .bubblesDots
    case .me: return .personDot
    }
  }

  /// The nearest SF Symbol, for the large content viewer only: it shows an Image and a title,
  /// not a drawing of our own.
  var systemImage: String {
    switch self {
    case .today: return "envelope"
    case .notes: return "note.text"
    case .kindreds: return "bubble.left.and.bubble.right"
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
  /// the bar's height (H:117)
  public static let height: CGFloat = 62
  /// in from the screen's left and right edges (H:117)
  public static let sideInset: CGFloat = 16

  /*
   How far the bar's bottom edge sits above the screen's. The mock's phone puts it 30 up
   (H:117), on a screen whose home indicator inset is 34, so it sits 4 inside the inset. Read as
   "4 inside the safe area, and never closer than 16 to the edge", which gives the mock's 30 on
   every Face ID iPhone and 16 on a phone with a home button (inset 0).

   The React Native side sizes the Host by the same rule (src/components/NativeTabBar.tsx,
   barBottomGap); change them together.
   */
  public static func bottomGap(safeAreaBottom: CGFloat) -> CGFloat {
    max(safeAreaBottom - 4, 16)
  }

  /// How far the bar drops when hidden (Today 3d Prompt 8: translateY(160)), enough to clear the
  /// screen's bottom edge from any gap.
  public static let hiddenDrop: CGFloat = 160
}

public extension KMotion {
  /// The lens sliding to a new tab: left .5s cubic-bezier(.3,1.45,.4,1), well past and back (H:118).
  static let lensSlide = Animation.timingCurve(0.3, 1.45, 0.4, 1, duration: 0.5)
  /// The same move with Reduce Motion on: no overshoot.
  static let lensSlideReduced = Animation.easeInOut(duration: 0.25)
  /// A tab's colour and stroke changing: CSS's default ease over .25s (H:119).
  static let tabTint = Animation.timingCurve(0.25, 0.1, 0.25, 1, duration: 0.25)
  /// Each step of the tabpop keyframes: cubic-bezier(.3,1.4,.5,1) (H:445).
  static let tabPopStep = UnitCurve.bezier(startControlPoint: UnitPoint(x: 0.3, y: 1.4), endControlPoint: UnitPoint(x: 0.5, y: 1))
}

public extension KSoftShadow {
  /// The lens's glow: 0 3 10 -3 in the theme's ind at .35 (H:118: rgba(58,52,214,.35), the light
  /// themes' ind). The mock's fixed indigo glowed darker than Midnight's lens and bar; the
  /// theme's ind reads as light there too.
  static func lensGlow(for theme: KTheme) -> [KSoftShadow] {
    [KSoftShadow(y: 3, blur: 10, spread: -3, color: theme.ind.opacity(0.35))]
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
  private let onSelect: (Int) -> Void
  private let onPlus: () -> Void
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /// bumped by a press on the tab that is already selected, to replay its pop and the stretch
  @State private var repress = 0

  /// - Parameters:
  ///   - items: the tabs, left to right; the + goes in the middle (after the first half)
  ///   - selectedIndex: the selected tab, an index into items; nil shows no lens
  ///   - isPanelOpen: true turns the + into an × (what it opens is showing)
  ///   - plusLabel: what VoiceOver says for the + while closed, already translated
  ///   - closeLabel: what it says for the × while open, already translated
  ///   - plusTurn: the curve the + turns to an × on: the 10a sheet's (KMotion.plusTurn) unless the
  ///     holder says otherwise; the publish entry passes KMotion.plusTurnPublish
  ///   - hidden: the bar slides 160 down out of sight (the new reader's publish sheet takes its
  ///     place), on the publish turn's curve; with Reduce Motion it fades instead
  ///   - onSelect: a tab was tapped, with its index; selected or not
  ///   - onPlus: the + (or ×) was tapped
  public init(
    theme: KTheme,
    items: [KTabItem],
    selectedIndex: Int?,
    isPanelOpen: Bool,
    plusLabel: String,
    closeLabel: String,
    plusTurn: Animation = KMotion.plusTurn,
    hidden: Bool = false,
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

  private var selectedColumn: Int? {
    guard let selectedIndex, items.indices.contains(selectedIndex) else { return nil }
    return column(of: selectedIndex)
  }

  public var body: some View {
    KFloat(theme: theme, corner: .bar) {
      HStack(spacing: 0) {
        ForEach(0..<columnCount, id: \.self) { c in
          if c == leading {
            plus
          } else {
            let i = c < leading ? c : c - 1
            tab(i, items[i])
          }
        }
      }
      .frame(height: KTabBarMetrics.height)
      .frame(maxWidth: .infinity)
      .background { lens }
    }
    // the bar never grows; its count is the only text (see the note at the top)
    .dynamicTypeSize(...DynamicTypeSize.large)
    // out of the way for the publish sheet: down 160, or with Reduce Motion a fade
    .animation(reduceMotion ? .easeInOut(duration: 0.25) : KMotion.plusTurnPublish) {
      $0
        .offset(y: hidden && !reduceMotion ? KTabBarMetrics.hiddenDrop : 0)
        .opacity(hidden && reduceMotion ? 0 : 1)
    }
    .allowsHitTesting(!hidden)
    .accessibilityElement(children: .contain)
    .accessibilityAddTraits(.isTabBar)
    .accessibilityHidden(hidden)
  }

  // ── the lens (H:118) ──
  private var lens: some View {
    // read here, not inside the animator's closures, which run off the main actor
    let stretches = !reduceMotion
    return GeometryReader { geo in
      if let col = selectedColumn {
        let colW = geo.size.width / CGFloat(columnCount)
        let shape = RoundedRectangle(cornerRadius: 26, style: .circular)
        shape
          .fill(theme.lav)
          // inset 0 0 0 1.5px sf: a ring of the bar's face just inside the lens's edge
          .overlay(shape.strokeBorder(theme.sf, lineWidth: 1.5))
          .kSoftShadows(KSoftShadow.lensGlow(for: theme), in: shape)
          .frame(width: max(0, colW - 10), height: max(0, geo.size.height - 10))
          // pulled sideways while it travels: 1.22 on .25s ease-out, held to .52s, back on .25s
          .keyframeAnimator(initialValue: CGFloat(1), trigger: [col, repress]) { content, stretch in
            content.scaleEffect(x: stretches ? stretch : 1, y: 1)
          } keyframes: { _ in
            KeyframeTrack {
              LinearKeyframe(1.22, duration: 0.25, timingCurve: .easeOut)
              LinearKeyframe(1.22, duration: 0.27)
              LinearKeyframe(1, duration: 0.25, timingCurve: .easeOut)
            }
          }
          .offset(x: colW * CGFloat(col) + 4, y: 5)
          .animation(stretches ? KMotion.lensSlide : KMotion.lensSlideReduced, value: col)
      }
    }
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }

  // ── a tab ──
  private func tab(_ i: Int, _ item: KTabItem) -> some View {
    let on = i == selectedIndex
    let color = on ? theme.ind : theme.ink
    let count = on ? 0 : max(0, item.badge)
    let pops = on && !reduceMotion
    return Button {
      // only the selected tab counts a re-press; any other waits for selectedIndex to move
      if on { repress &+= 1 }
      onSelect(i)
    } label: {
      KTabIcon(glyph: item.glyph, on: on, color: color)
        // the pop runs on every change of tab and every re-press; only the selected one takes it
        .keyframeAnimator(initialValue: KTabPop(), trigger: [selectedIndex ?? -1, repress]) { content, pop in
          content
            .scaleEffect(pops ? pop.scale : 1)
            .rotationEffect(pops ? pop.angle : .zero)
        } keyframes: { _ in
          KeyframeTrack(\.scale) {
            LinearKeyframe(1.24, duration: 0.2, timingCurve: KMotion.tabPopStep)
            LinearKeyframe(0.95, duration: 0.15, timingCurve: KMotion.tabPopStep)
            LinearKeyframe(1, duration: 0.15, timingCurve: KMotion.tabPopStep)
          }
          KeyframeTrack(\.angle) {
            LinearKeyframe(.degrees(-7), duration: 0.2, timingCurve: KMotion.tabPopStep)
            LinearKeyframe(.degrees(3), duration: 0.15, timingCurve: KMotion.tabPopStep)
            LinearKeyframe(.zero, duration: 0.15, timingCurve: KMotion.tabPopStep)
          }
        }
        .overlay(alignment: .topTrailing) {
          if count > 0 {
            KTabBadge(theme: theme, count: count)
              // above and right of the glyph, where the React Native bar puts its count
              .alignmentGuide(.top) { $0[.top] + 7 }
              .alignmentGuide(.trailing) { $0[.trailing] - 11 }
          }
        }
        // the icon's 50 × 40 capsule (H:119), and then the whole column is the target
        .frame(width: 50, height: 40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .contentShape(Rectangle())
    }
    .buttonStyle(KAsIsButtonStyle())
    .animation(KMotion.tabTint, value: on)
    .accessibilityLabel(item.label)
    .accessibilityValue(count > 0 ? Text(count > 9 ? "9+" : String(count)) : Text(verbatim: ""))
    .accessibilityAddTraits(on ? .isSelected : [])
    .accessibilityShowsLargeContentViewer {
      Label(item.label, systemImage: item.glyph.systemImage)
    }
  }

  // ── the + (H:119) ──
  private var plus: some View {
    KPrimaryRound(theme: theme, isOpen: isPanelOpen, accessibilityLabel: isPanelOpen ? closeLabel : plusLabel, turn: plusTurn, action: onPlus)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      // the whole column takes the tap, as the mock's cell and PostTabBar's column do; the disc
      // keeps its own press (a child's gesture wins inside the circle)
      .contentShape(Rectangle())
      .onTapGesture(perform: onPlus)
      .accessibilityShowsLargeContentViewer {
        Label(isPanelOpen ? closeLabel : plusLabel, systemImage: isPanelOpen ? "xmark" : "plus")
      }
  }
}

/// The tabpop keyframes' two values.
struct KTabPop {
  var scale: CGFloat = 1
  var angle: Angle = .zero
}

/// A tab's glyph, 27 across: the outline at the mock's 1.9 (2.4 selected) of its 28 units, plus
/// the solid accent when selected. The accent appears at once, as in the mock; the colour and the
/// stroke follow whatever animation the caller's transaction carries.
struct KTabIcon: View {
  /// the mock's 28-unit strokes on the shared 24 grid (KLineGlyph)
  static let restingStroke: CGFloat = 1.9 * 24 / 28
  static let selectedStroke: CGFloat = 2.4 * 24 / 28

  let glyph: KTabGlyph
  let on: Bool
  let color: Color

  var body: some View {
    ZStack {
      KLineGlyphShape(glyph.outline, lineWidth: on ? Self.selectedStroke : Self.restingStroke)
        .fill(color)
      if on {
        KLineGlyphShape(glyph.accent, lineWidth: 0)
          .fill(color)
          .transition(.identity)
      }
    }
    .frame(width: 27, height: 27)
    .accessibilityHidden(true)
  }
}

/// A tab's count: an 18-tall ind pill, the number in bg in mono 600 11 (H:62), ringed in sf.
struct KTabBadge: View {
  let theme: KTheme
  let count: Int

  var body: some View {
    Text(count > 9 ? "9+" : String(count))
      .kText(.mono(11, .semibold))
      .foregroundStyle(theme.bg)
      .lineLimit(1)
      .fixedSize()
      .padding(.horizontal, 4)
      .frame(minWidth: 18, minHeight: 18, maxHeight: 18)
      .background(Capsule().fill(theme.ind))
      .padding(1.6)
      .background(Capsule().fill(theme.sf))
      .accessibilityHidden(true)
  }
}
