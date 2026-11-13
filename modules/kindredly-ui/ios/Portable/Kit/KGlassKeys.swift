// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 GLASS KEYS (owner, 2026-11-13, of Notes' calendar and view keys: "感觉有点山寨 … 想象你是苹果的设计
 水准 做这两个按钮 … 点的时候不能做出毛玻璃么 类似底导航那样的效果么"; then "统一一下" for Kindreds and
 Me, and "整体kindreds那种白色就很不错").

 A page header's round keys, white at rest and glass under the finger:

   NOTES                              ( ⌕   ▤   ▦ )      one capsule, 44 tall, each key 44 square

 · At rest they are Kindreds' chips' white: the page's surface with the chips' 1.5 line, flat, no
   shadow (a first try was the tab bar's glass with a breath of ink, which read grey on the white
   page: "底色背景咋是灰色的"). Grouped (KGlassGroup), the keys share one capsule, as iOS groups a
   toolbar's buttons; alone (KGlassKey solo: a key the Duo's band took), a key is its own disc. A
   row that is shorter passes its own `side` (Kindreds' chips are 40ish).
 · The icon is an SF Symbol at 17, medium: the system's own drawing at the weight a toolbar uses,
   in the theme's ink. A key may carry words (`wide`: Me's Edit), its lens then a capsule.
 · Under a finger a lens swells behind the icon as the tab bar's does (36 → 46, standing a little
   past the capsule's edge, the bar's .22s overshoot) and the icon grows 8%; it lets go as the
   finger lifts. On the white face the lens is a breath of ink (a white bubble on a white key read
   as nothing pressed); on a dark face it is the bar's bright lens with its ring and shadow. A chip
   (Kindreds' filters) takes the same swell (KSwellPressStyle). A tap too quick to see still shows it for
   0.16s. A key that is on (the calendar while open, the orbit while open) keeps a lens tinted with
   the theme's indigo, its icon in indigo.
 · Reduce Motion: no swell and no growth, the lens fades in and out.
 */

enum KGlassKeyMetrics {
  /// a key's square, and the capsule's height (a row that is shorter passes its own `side`)
  static let side: CGFloat = 44
  /// the lens sits this far inside a key (36 round on 44)
  static let lensInset: CGFloat = 4
  /// the lens under a finger: 36 → 46, a bubble that stands a little past the capsule's edge
  static let swell: CGFloat = 1.28
  /// the face's edge at rest (KFilterChip.border)
  static let edge: CGFloat = 1.5
  /// a key with words (Me's Edit) swells less: it is wider than it is tall
  static let swellWide: CGFloat = 1.06
  /// a key with words: its words this far from the lens's ends
  static let widePad: CGFloat = 14
  /// the icon under a finger
  static let grow: CGFloat = 1.08
  /// the symbols' size (a toolbar's)
  static let symbol: CGFloat = 17
  /// the shortest a press shows, so a quick tap still answers
  static let minPress: TimeInterval = 0.16
}

/// The keys' glass: the tab bar's, with what a header needs on a plain page.
struct KGlassKeyTone {
  /// the tab bar's glass: the lens under a finger is its lens
  let glass: KGlassTone
  /// the key's face at rest: the page's surface, as Kindreds' chips are
  let fill: Color
  /// its edge: the chips' line
  let edge: Color
  /// a key that is on: its lens and its icon
  let onFill: Color
  let onInk: Color
  /// the lens under a finger: a breath of ink on the white face (a white lens on a white key read
  /// as nothing pressed: owner, 2026-11-13, "kindreds 顶部的那些咋没有下面底导航点击的效果"); on a
  /// dark face the bar's own bright lens
  let press: Color
  /// its ring (none on the white face: the tint is the lens)
  let pressRing: Color

  static func of(_ theme: KTheme) -> KGlassKeyTone {
    let glass = KGlassTone.of(theme)
    let ink = Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 1)
    return KGlassKeyTone(
      glass: glass,
      fill: theme.sf,
      edge: theme.line,
      onFill: theme.ind.opacity(theme.isDark ? 0.26 : 0.13),
      onInk: theme.ind,
      press: theme.isDark ? glass.lensPressed : ink.opacity(0.08),
      pressRing: theme.isDark ? glass.lensRing : Color.clear
    )
  }
}

/// What a group or a solo key stands on at rest: the page's surface and the chips' line
/// (KFilterChip: 1.5 in the theme's line), flat, no shadow.
struct KGlassKeyFace<S: InsettableShape>: View {
  let tone: KGlassKeyTone
  let shape: S

  var body: some View {
    shape.fill(tone.fill)
      .overlay(shape.strokeBorder(tone.edge, lineWidth: KGlassKeyMetrics.edge))
      .allowsHitTesting(false)
      .accessibilityHidden(true)
  }
}

/// Keys sharing one glass capsule. `side`: the capsule's height (its keys pass the same), 44
/// unless a row is shorter (Kindreds' chips).
struct KGlassGroup<Content: View>: View {
  let theme: KTheme
  var side: CGFloat = KGlassKeyMetrics.side
  @ViewBuilder let content: Content

  var body: some View {
    HStack(spacing: 0) { content }
      .padding(.horizontal, 2)
      .frame(height: side)
      .background { KGlassKeyFace(tone: KGlassKeyTone.of(theme), shape: Capsule()) }
  }
}

/// A key: its icon on the glass, the lens under a finger. Round (`side` square), or `wide`: an
/// icon and words, as long as they are, its lens a capsule (Me's Edit).
struct KGlassKey<Icon: View>: View {
  let theme: KTheme
  var side: CGFloat = KGlassKeyMetrics.side
  var wide = false
  /// its own glass disc (a key the band took); in a KGlassGroup, false
  var solo = false
  /// a key that is on (the calendar while it is open): the tinted lens
  var on = false
  let a11yLabel: String
  var a11yValue: String = ""
  var a11yHint: String = ""
  let action: () -> Void
  @ViewBuilder let icon: Icon

  var body: some View {
    SwiftUI.Button(action: action) {
      Group {
        if wide {
          icon
            .padding(.horizontal, KGlassKeyMetrics.widePad)
            .frame(minWidth: side)
            .frame(height: side)
            .fixedSize()
        } else {
          icon.frame(width: side, height: side)
        }
      }
      .contentShape(Rectangle())
    }
    .buttonStyle(KGlassKeyStyle(theme: theme, solo: solo, on: on, wide: wide))
    .accessibilityLabel(a11yLabel)
    .accessibilityValue(a11yValue)
    .accessibilityHint(a11yHint)
    .accessibilityAddTraits(on ? .isSelected : [])
  }
}

/// An SF Symbol at the keys' size and weight.
struct KGlassSymbol: View {
  let name: String

  init(_ name: String) { self.name = name }

  var body: some View {
    Image(systemName: name)
      .font(.system(size: KGlassKeyMetrics.symbol, weight: .medium))
      .accessibilityHidden(true)
  }
}

struct KGlassKeyStyle: ButtonStyle {
  let theme: KTheme
  let solo: Bool
  let on: Bool
  var wide = false

  func makeBody(configuration: Configuration) -> some View {
    KGlassKeyBody(label: configuration.label, pressed: configuration.isPressed, theme: theme, solo: solo, on: on, wide: wide)
  }
}

private struct KGlassKeyBody<Label: View>: View {
  let label: Label
  let pressed: Bool
  let theme: KTheme
  let solo: Bool
  let on: Bool
  let wide: Bool

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /// the press as drawn: held for minPress after a quick tap lifts
  @State private var shown = false
  @State private var downAt: Date?
  /// counts presses, so a held-over lift never puts out the press that came after it
  @State private var pressId = 0

  var body: some View {
    let tone = KGlassKeyTone.of(theme)
    let lit = shown || on
    let swell = shown && !reduceMotion
    label
      .foregroundStyle(on && !shown ? tone.onInk : theme.ink)
      .scaleEffect(swell ? KGlassKeyMetrics.grow : 1)
      .background {
        // the lens: a capsule inside the key (round on a square key); under a finger the tab bar's
        // lens, a bright bubble with its ring and its shadow
        Capsule()
          .fill(shown ? tone.press : tone.onFill)
          .overlay(Capsule().strokeBorder(shown ? tone.pressRing : Color.clear, lineWidth: 0.5))
          // a bright line along the lens's top edge, as the bar's lens has (the dark face's)
          .overlay(
            Capsule().strokeBorder(
              LinearGradient(colors: [shown ? tone.pressRing : Color.clear, Color.clear], startPoint: .top, endPoint: UnitPoint(x: 0.5, y: 0.3)),
              lineWidth: 1
            )
          )
          .background { KOuterShadow(shadows: shown && theme.isDark ? tone.glass.lensShadow : [], shape: Capsule()) }
          .padding(KGlassKeyMetrics.lensInset)
          .scaleEffect(swell ? (wide ? KGlassKeyMetrics.swellWide : KGlassKeyMetrics.swell) : (lit || reduceMotion ? 1 : 0.7))
          .opacity(lit ? 1 : 0)
          .allowsHitTesting(false)
      }
      .background {
        if solo {
          KGlassKeyFace(tone: tone, shape: Capsule())
        }
      }
      .animation(reduceMotion ? .easeOut(duration: 0.15) : KMotion.lensPress, value: shown)
      .animation(.easeInOut(duration: 0.2), value: on)
      .onChange(of: pressed, initial: false) { _, down in
        if down {
          pressId += 1
          downAt = Date()
          shown = true
        } else {
          let held = Date().timeIntervalSince(downAt ?? .distantPast)
          let rest = max(0, KGlassKeyMetrics.minPress - held)
          let id = pressId
          if rest == 0 {
            shown = false
          } else {
            DispatchQueue.main.asyncAfter(deadline: .now() + rest) {
              if pressId == id { shown = false }
            }
          }
        }
      }
  }
}

/// A capsule control's press, as the keys' and the tab bar's: it swells a little (6%, the bar's
/// .22s overshoot) under a breath of ink, and lets go as the finger lifts; a quick tap still shows
/// it for 0.16s. Reduce Motion: the tint alone. For a chip that is a whole capsule (Kindreds'
/// filters), where a lens inside it would have no room.
struct KSwellPressStyle: ButtonStyle {
  let theme: KTheme

  func makeBody(configuration: Configuration) -> some View {
    KSwellPressBody(label: configuration.label, pressed: configuration.isPressed, theme: theme)
  }
}

private struct KSwellPressBody<Label: View>: View {
  let label: Label
  let pressed: Bool
  let theme: KTheme

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var shown = false
  @State private var downAt: Date?
  @State private var pressId = 0

  var body: some View {
    let tone = KGlassKeyTone.of(theme)
    label
      .overlay(Capsule().fill(tone.press).opacity(shown ? 1 : 0).allowsHitTesting(false))
      .scaleEffect(shown && !reduceMotion ? 1.06 : 1)
      .animation(reduceMotion ? .easeOut(duration: 0.15) : KMotion.lensPress, value: shown)
      .onChange(of: pressed, initial: false) { _, down in
        if down {
          pressId += 1
          downAt = Date()
          shown = true
        } else {
          let rest = max(0, KGlassKeyMetrics.minPress - Date().timeIntervalSince(downAt ?? .distantPast))
          let id = pressId
          if rest == 0 {
            shown = false
          } else {
            DispatchQueue.main.asyncAfter(deadline: .now() + rest) {
              if pressId == id { shown = false }
            }
          }
        }
      }
  }
}
