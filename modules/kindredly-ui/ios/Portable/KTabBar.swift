// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.
// The Expo side lives in Adapters/KTabBarView.swift; ui-lab shows it (kindredly:///ui-lab).

import SwiftUI

/*
 THE 10a TAB BAR (H:117-119, 445, 486; tokens-10a.md §7.3 and §11 item 6). A float: a solid sf
 face, corners of 34, 62 tall, 16 in from each side, the soft two-layer shadow and no glass.
 Five equal columns: two tabs, the round + (KPrimaryRound), two tabs. No words under the icons
 (the mock's showLabels is false); each tab's name is still there for VoiceOver and for the
 large content viewer.

 Where the selection is, the mock does not light up the icon's own capsule (it stays
 transparent, H:445). A LENS slides behind it instead (H:118):
 - 5 in from the bar's top and bottom, the column's width less 10, corners of 26, lav fill,
   a 1.5 ring of sf inside its edge and an indigo glow under it, 0 3 10 -3 rgba(58,52,214,.35);
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

 The icons are the mock's own drawings (P:70-75), in its 28-unit box drawn 27 across, rather
 than SF Symbols: they are a handful of lines and arcs and the mock's accent fills belong to
 them.

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

  var outline: KGlyphDrawing {
    switch self {
    case .today: return .today
    case .notes: return .notes
    case .kindreds: return .kindreds
    case .me: return .me
    }
  }

  var accent: KGlyphDrawing {
    switch self {
    case .today: return .todayAccent
    case .notes: return .notesAccent
    case .kindreds: return .kindredsAccent
    case .me: return .meAccent
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
  /// The lens's indigo glow: 0 3 10 -3 rgba(58,52,214,.35) (H:118).
  static let lensGlow: [KSoftShadow] = [
    KSoftShadow(y: 3, blur: 10, spread: -3, color: Color(.sRGB, red: 58 / 255, green: 52 / 255, blue: 214 / 255, opacity: 0.35)),
  ]
}

public struct KTabBar: View {
  private let theme: KTheme
  private let items: [KTabItem]
  private let selectedIndex: Int?
  private let isPanelOpen: Bool
  private let plusLabel: String
  private let closeLabel: String
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
  ///   - onSelect: a tab was tapped, with its index; selected or not
  ///   - onPlus: the + (or ×) was tapped
  public init(
    theme: KTheme,
    items: [KTabItem],
    selectedIndex: Int?,
    isPanelOpen: Bool,
    plusLabel: String,
    closeLabel: String,
    onSelect: @escaping (Int) -> Void,
    onPlus: @escaping () -> Void
  ) {
    self.theme = theme
    self.items = items
    self.selectedIndex = selectedIndex
    self.isPanelOpen = isPanelOpen
    self.plusLabel = plusLabel
    self.closeLabel = closeLabel
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
    .accessibilityElement(children: .contain)
    .accessibilityAddTraits(.isTabBar)
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
          .kSoftShadows(KSoftShadow.lensGlow, in: shape)
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
    KPrimaryRound(theme: theme, isOpen: isPanelOpen, accessibilityLabel: isPanelOpen ? closeLabel : plusLabel, action: onPlus)
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

/// A tab's glyph, 27 across: the outline at 1.9 (2.4 selected) of its 28 units, plus the solid
/// accent when selected. The accent appears at once, as in the mock; the colour and the stroke
/// follow whatever animation the caller's transaction carries.
struct KTabIcon: View {
  let glyph: KTabGlyph
  let on: Bool
  let color: Color

  var body: some View {
    ZStack {
      KGlyphShape(drawing: glyph.outline, lineWidth: on ? 2.4 : 1.9)
        .fill(color)
      if on {
        KGlyphShape(drawing: glyph.accent, lineWidth: 0)
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

/*
 THE DRAWINGS, in the mock's 28-unit box (viewBox 0 0 28 28), copied from its SVG paths: the
 four tab icons and their accents (P:70-75, H:158, 417-423) and the notebook on the composer's
 second card (H:133). The composer's envelope is the Today icon (H:132 draws the same path).
 */
enum KGlyphDrawing: Sendable {
  case today, todayAccent
  case notes, notesAccent
  case kindreds, kindredsAccent
  case me, meAccent
  case notebook

  /// the drawing in box units, before it is placed and stroked
  var path: Path {
    var p = Path()
    switch self {
    case .today:
      // M3 8h22v13H3z M3 9l11 8 11-8
      p.addRect(CGRect(x: 3, y: 8, width: 22, height: 13))
      p.move(to: CGPoint(x: 3, y: 9))
      p.addLine(to: CGPoint(x: 14, y: 17))
      p.addLine(to: CGPoint(x: 25, y: 9))
    case .todayAccent:
      // a circle of r2.4 at 14,15.5
      p.addEllipse(in: CGRect(x: 11.6, y: 13.1, width: 4.8, height: 4.8))
    case .notes:
      // M6 4h16v20H6z M10 10h8 M10 14h8 M10 18h5
      p.addRect(CGRect(x: 6, y: 4, width: 16, height: 20))
      p.move(to: CGPoint(x: 10, y: 10))
      p.addLine(to: CGPoint(x: 18, y: 10))
      p.move(to: CGPoint(x: 10, y: 14))
      p.addLine(to: CGPoint(x: 18, y: 14))
      p.move(to: CGPoint(x: 10, y: 18))
      p.addLine(to: CGPoint(x: 15, y: 18))
    case .notesAccent:
      // M9.5 14.2h9a1 1 0 0 1 0 2h-9a1 1 0 0 1 0-2z: a pill from 8.5 to 19.5, 2 tall
      p.addRoundedRect(in: CGRect(x: 8.5, y: 14.2, width: 11, height: 2), cornerSize: CGSize(width: 1, height: 1), style: .circular)
    case .kindreds:
      // M4 6h13v9H9l-4 4z M12 19h8l4 4V12h-3
      p.move(to: CGPoint(x: 4, y: 6))
      p.addLine(to: CGPoint(x: 17, y: 6))
      p.addLine(to: CGPoint(x: 17, y: 15))
      p.addLine(to: CGPoint(x: 9, y: 15))
      p.addLine(to: CGPoint(x: 5, y: 19))
      p.closeSubpath()
      p.move(to: CGPoint(x: 12, y: 19))
      p.addLine(to: CGPoint(x: 20, y: 19))
      p.addLine(to: CGPoint(x: 24, y: 23))
      p.addLine(to: CGPoint(x: 24, y: 12))
      p.addLine(to: CGPoint(x: 21, y: 12))
    case .kindredsAccent:
      // circles of r1.5 at 8.5,10.5 and 12.5,10.5
      p.addEllipse(in: CGRect(x: 7, y: 9, width: 3, height: 3))
      p.addEllipse(in: CGRect(x: 11, y: 9, width: 3, height: 3))
    case .me:
      // M18 10a4 4 0 1 1-8 0a4 4 0 1 1 8 0z M5 24c1-5 5-7 9-7s8 2 9 7
      p.addEllipse(in: CGRect(x: 10, y: 6, width: 8, height: 8))
      p.move(to: CGPoint(x: 5, y: 24))
      p.addCurve(to: CGPoint(x: 14, y: 17), control1: CGPoint(x: 6, y: 19), control2: CGPoint(x: 10, y: 17))
      p.addCurve(to: CGPoint(x: 23, y: 24), control1: CGPoint(x: 18, y: 17), control2: CGPoint(x: 22, y: 19))
    case .meAccent:
      // a circle of r2 at 14,19.5
      p.addEllipse(in: CGRect(x: 12, y: 17.5, width: 4, height: 4))
    case .notebook:
      // M6 3h13a1 1 0 0 1 1 1v20a1 1 0 0 1-1 1H6z M10 3v22 M14 9h3 M14 13h3
      p.move(to: CGPoint(x: 6, y: 3))
      p.addLine(to: CGPoint(x: 19, y: 3))
      p.addArc(tangent1End: CGPoint(x: 20, y: 3), tangent2End: CGPoint(x: 20, y: 4), radius: 1)
      p.addLine(to: CGPoint(x: 20, y: 24))
      p.addArc(tangent1End: CGPoint(x: 20, y: 25), tangent2End: CGPoint(x: 19, y: 25), radius: 1)
      p.addLine(to: CGPoint(x: 6, y: 25))
      p.closeSubpath()
      p.move(to: CGPoint(x: 10, y: 3))
      p.addLine(to: CGPoint(x: 10, y: 25))
      p.move(to: CGPoint(x: 14, y: 9))
      p.addLine(to: CGPoint(x: 17, y: 9))
      p.move(to: CGPoint(x: 14, y: 13))
      p.addLine(to: CGPoint(x: 17, y: 13))
    }
    return p
  }
}

/// A drawing placed in its frame (square, centred) and stroked as the SVG strokes it: round caps
/// and joins, the width in box units. A lineWidth of 0 fills the drawing instead (the accents).
/// The width animates, so a tab's stroke thickens along with its colour.
struct KGlyphShape: Shape {
  let drawing: KGlyphDrawing
  var lineWidth: CGFloat

  var animatableData: CGFloat {
    get { lineWidth }
    set { lineWidth = newValue }
  }

  func path(in rect: CGRect) -> Path {
    let s = min(rect.width, rect.height) / 28
    let placed = drawing.path.applying(CGAffineTransform(a: s, b: 0, c: 0, d: s, tx: rect.midX - 14 * s, ty: rect.midY - 14 * s))
    guard lineWidth > 0 else { return placed }
    return placed.strokedPath(StrokeStyle(lineWidth: lineWidth * s, lineCap: .round, lineJoin: .round))
  }
}
