// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 GLASS KEYS (owner, 2026-11-13, of Notes' calendar and view keys: "感觉有点山寨 … 想象你是苹果的设计
 水准 做这两个按钮 … 点的时候不能做出毛玻璃么 类似底导航那样的效果么").

 A page header's round keys, made of the tab bar's glass (KTabBar: KGlassFace, KGlassTone):

   NOTES                              ( ⌕   ▤   ▦ )      one capsule, 44 tall, each key 44 square

 · Grouped (KGlassGroup), the keys share one capsule, as iOS groups a toolbar's buttons: one
   object at the top of the page, not three grey discs. Alone (KGlassKey solo: a key the Duo's
   band took), a key is its own glass disc, 44 round.
 · The icon is an SF Symbol at 17, medium: the system's own drawing at the weight a toolbar uses,
   in the theme's ink.
 · Under a finger a lens swells behind the icon (36 → 43, the bar's .22s overshoot), bright, with
   the tab bar's lens ring and shadow, and the icon grows 8%; it lets go as the finger lifts. A tap
   too quick to see still shows it for 0.16s. A key that is on (the calendar while it is open)
   keeps a lens tinted with the theme's indigo, its icon in indigo.
 · On a white page the bar's glass alone would be white on white, so the capsule carries a breath
   of ink (4%) and a hairline, and only a small soft shadow (the owner's rule: no heavy lifts).
 · Reduce Motion: no swell and no growth, the lens fades in and out.
 */

enum KGlassKeyMetrics {
  /// a key's square, and the capsule's height
  static let side: CGFloat = 44
  /// the lens at rest (a key that is on)
  static let lens: CGFloat = 36
  /// the lens under a finger: 36 → 43, just inside the capsule's edge
  static let swell: CGFloat = 1.2
  /// the icon under a finger
  static let grow: CGFloat = 1.08
  /// the symbols' size (a toolbar's)
  static let symbol: CGFloat = 17
  /// the shortest a press shows, so a quick tap still answers
  static let minPress: TimeInterval = 0.16
}

/// The keys' glass: the tab bar's, with what a header needs on a plain page.
struct KGlassKeyTone {
  let glass: KGlassTone
  /// a breath of ink in the glass, so it reads as a surface on a white page
  let body: Color
  /// the capsule's hairline
  let edge: Color
  let shadow: [KSoftShadow]
  /// a key that is on: its lens and its icon
  let onFill: Color
  let onInk: Color

  static func of(_ theme: KTheme) -> KGlassKeyTone {
    let ink = Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 1)
    if theme.isDark {
      return KGlassKeyTone(
        glass: KGlassTone.of(theme),
        body: Color.white.opacity(0.07),
        edge: Color.white.opacity(0.12),
        shadow: [KSoftShadow(y: 3, blur: 10, spread: -3, color: Color.black.opacity(0.5))],
        onFill: theme.ind.opacity(0.26),
        onInk: theme.ind
      )
    }
    return KGlassKeyTone(
      glass: KGlassTone.of(theme),
      body: ink.opacity(0.04),
      edge: ink.opacity(0.07),
      shadow: [
        KSoftShadow(y: 3, blur: 10, spread: -4, color: ink.opacity(0.14)),
        KSoftShadow(y: 0.5, blur: 1.5, spread: 0, color: ink.opacity(0.06)),
      ],
      onFill: theme.ind.opacity(0.13),
      onInk: theme.ind
    )
  }
}

/// The glass a group or a solo key stands on: the bar's face, the breath of ink, the hairline,
/// clipped to the shape, its soft shadow outside it only.
struct KGlassKeyFace<S: InsettableShape>: View {
  let tone: KGlassKeyTone
  let shape: S

  var body: some View {
    ZStack {
      KGlassFace(tone: tone.glass, shape: shape)
      shape.fill(tone.body)
      shape.strokeBorder(tone.edge, lineWidth: 0.5)
    }
    .clipShape(shape)
    .background { KOuterShadow(shadows: tone.shadow, shape: shape) }
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

/// Keys sharing one glass capsule.
struct KGlassGroup<Content: View>: View {
  let theme: KTheme
  @ViewBuilder let content: Content

  var body: some View {
    HStack(spacing: 0) { content }
      .padding(.horizontal, 2)
      .frame(height: KGlassKeyMetrics.side)
      .background { KGlassKeyFace(tone: KGlassKeyTone.of(theme), shape: Capsule()) }
  }
}

/// A round key: its icon on the glass, the lens under a finger.
struct KGlassKey<Icon: View>: View {
  let theme: KTheme
  /// its own glass disc (a key the band took); in a KGlassGroup, false
  var solo = false
  /// a key that is on (the calendar while it is open): the tinted lens
  var on = false
  let a11yLabel: String
  var a11yValue: String = ""
  let action: () -> Void
  @ViewBuilder let icon: Icon

  var body: some View {
    SwiftUI.Button(action: action) {
      icon
        .frame(width: KGlassKeyMetrics.side, height: KGlassKeyMetrics.side)
        .contentShape(Rectangle())
    }
    .buttonStyle(KGlassKeyStyle(theme: theme, solo: solo, on: on))
    .accessibilityLabel(a11yLabel)
    .accessibilityValue(a11yValue)
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

  func makeBody(configuration: Configuration) -> some View {
    KGlassKeyBody(label: configuration.label, pressed: configuration.isPressed, theme: theme, solo: solo, on: on)
  }
}

private struct KGlassKeyBody<Label: View>: View {
  let label: Label
  let pressed: Bool
  let theme: KTheme
  let solo: Bool
  let on: Bool

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
        Circle()
          .fill(shown ? tone.glass.lensPressed : tone.onFill)
          .overlay(Circle().strokeBorder(shown ? tone.glass.lensRing : Color.clear, lineWidth: 0.5))
          // a bright line along the lens's top edge, as the bar's lens has
          .overlay(
            Circle().strokeBorder(
              LinearGradient(colors: [shown ? tone.glass.lensRing : Color.clear, Color.clear], startPoint: .top, endPoint: UnitPoint(x: 0.5, y: 0.3)),
              lineWidth: 1
            )
          )
          .background { KOuterShadow(shadows: shown ? tone.glass.lensShadow : [], shape: Circle()) }
          .frame(width: KGlassKeyMetrics.lens, height: KGlassKeyMetrics.lens)
          .scaleEffect(swell ? KGlassKeyMetrics.swell : (lit || reduceMotion ? 1 : 0.7))
          .opacity(lit ? 1 : 0)
          .allowsHitTesting(false)
      }
      .background {
        if solo {
          KGlassKeyFace(tone: tone, shape: Circle())
            .frame(width: KGlassKeyMetrics.side, height: KGlassKeyMetrics.side)
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
