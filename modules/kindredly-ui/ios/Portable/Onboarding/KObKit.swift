// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE ONBOARDING'S OWN KIT (src/screens/onboarding/parts, drawn in SwiftUI).

 The run does not wear the theme: one flat Post Blue field before the hatch, the letter's paper
 on 7 and Shell after the crack, with acid keys and pure white type on the blue (parts/tokens).
 Every measure here is the React Native run's own (KEY_H, GUTTER, the frame's 44pt top bar, the
 nest slot), so the Swift screens put each thing where the React Native ones did.

 RULE B (owner, 2026-10-26). The React Native run gave its keys, chips and paper cards a 3pt ink
 edge and a 4pt hard ink shadow. Here controls are flat (no ink edge, no hard shadow) and the
 things that are objects in the story (the cards, the envelopes, the stamp's card, the speech
 card) keep their depth by the shared KObjectDepth shadow, with no ink edge: in the deep purple
 (KObjectDepth.dark, the Midnight tint) on the blue ground, and in the light tint on paper and
 Shell (obDepth below picks the theme that gives that colour).

 THE EGG is art, like a stamp's keyline: it keeps its drawn line (components/EggShell EggBody).
 Wren is never drawn here; she comes from React Native as an island.

 Type: the app's faces only (KType): system for the run's words, SF Mono for labels, the reader's
 Letter font for content (the letter, the cue, Wren's sign-off, the envelope's address line).
 The run stops growing at 1.35x (OB_MAX_FONT): the screens cap Dynamic Type at xxxLarge, keys at
 accessibility1 (1.6x).
 */

// MARK: - colours and measures

public enum KOb {
  /// the app icon's blue: the ground to 6, 8, and 9 up to the crack
  static let blue = Color(hex: "#5B55FF")
  static let paper = Color(hex: "#FFFFFF")
  /// the letter sheet (7)
  static let sheet = Color(hex: "#FFFDF8")
  /// warm eggshell: floods out on 9, the ground of 10–13
  static let shell = Color(hex: "#FFF8EE")
  static let acid = Color(hex: "#C3E84F")
  static let acidDown = Color(hex: "#B5DA3F")
  static let ink = Color(hex: "#1E1B35")
  static let inkSoft = Color(hex: "#4A4664")
  static let gold = Color(hex: "#D8A63F")
  static let white = Color.white
  /// the dim behind a sheet over the blue (1a, 8a)
  static let scrim = Color(.sRGB, red: 14 / 255, green: 12 / 255, blue: 40 / 255, opacity: 0.45)
  /// the egg's drawn line (Y.ink)
  static let eggLine = Color(hex: "#111113")
  /// the letter meter when it travels, on the sheet (5.4:1)
  static let go = Color(hex: "#2E7D46")
  /// a refusal on the sheet or Shell (6.3:1)
  static let stop = Color(hex: "#B3261E")
  /// the quiet lavender the run's paper uses (a window waiting, an empty slot)
  static let lavenderSoft = Color(hex: "#EFEDFA")
  static let lavenderWait = Color(hex: "#E4E2F0")
  /// a control's quiet line on paper and Shell (not an ink edge)
  static let hairline = Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 0.14)

  static let keyH: CGFloat = 56
  /// the room the React Native key area kept for the key's hard shadow; kept so every screen's
  /// key sits exactly where it did
  static let keyRoom: CGFloat = 60
  static let gutter: CGFloat = 24
  static let topBarH: CGFloat = 44
  static let textKeyRow: CGFloat = 44
  static let nestEgg: CGFloat = 84
  static let nestPipsH: CGFloat = 18
  static let nestVoiceH: CGFloat = 22
  static let nestSlotH: CGFloat = 84 + 18 + 22 + 6

  /// the frame's key area height above the home indicator line
  static func keyAreaH(bottomInset: CGFloat) -> CGFloat {
    max(bottomInset, 16) + textKeyRow + 4 + keyRoom + 10
  }

  /// where the key area starts (parts/frame keyAreaTop)
  static func keyAreaTop(height: CGFloat, bottomInset: CGFloat) -> CGFloat {
    height - keyAreaH(bottomInset: bottomInset)
  }

  /// the runner's nest egg box (s01-geometry nestEggRect)
  static func nestEggRect(width: CGFloat, topInset: CGFloat) -> CGRect {
    CGRect(x: (width - nestEgg) / 2, y: topInset + topBarH, width: nestEgg, height: nestEgg)
  }

  /// screen 2's hero egg (s01-geometry heroRect)
  static func heroRect(width: CGFloat, height: CGFloat, topInset: CGFloat, bottomInset: CGFloat) -> (rect: CGRect, offset: CGFloat) {
    let bodyTop = topInset + topBarH
    let bodyH = keyAreaTop(height: height, bottomInset: bottomInset) - bodyTop
    let under: CGFloat = 234
    let size = min(200, max(140, bodyH - under - 40))
    let offset = max(6, (bodyH - size - under) * 0.4)
    return (CGRect(x: (width - size) / 2, y: bodyTop + offset, width: size, height: size), offset)
  }
}

// MARK: - type

extension KTextStyle {
  /// headlines: system 800, 29/34, -0.8
  static let obHeadline = KTextStyle.system(29, .heavy, tracking: -0.8 / 29, lineHeight: 34 / 29)
  static let obLine = KTextStyle.system(16, .regular, lineHeight: 22 / 16)
  static let obLineSmall = KTextStyle.system(15, .regular, lineHeight: 21 / 15)
  /// the egg's voice
  static let obVoice = KTextStyle.system(13, .semibold, lineHeight: 17 / 13)
  static let obKey = KTextStyle.system(17, .bold, tracking: -0.2 / 17)
  static let obTextKey = KTextStyle.system(15, .semibold)
  static let obSmall = KTextStyle.system(12.5, .regular, lineHeight: 17 / 12.5)
  /// the run's mono labels
  static let obLabel = KTextStyle.mono(10, .semibold, tracking: 0.18)
}

// MARK: - easing (the React Native worklets', so the clocks play the same curves)

enum KObEase {
  static func seg(_ x: Double, _ a: Double, _ b: Double) -> Double { min(1, max(0, (x - a) / (b - a))) }
  static func clamp01(_ x: Double) -> Double { min(1, max(0, x)) }
  /// ease-out cubic
  static func eo(_ x: Double) -> Double { 1 - pow(1 - x, 3) }
  /// ease-in-out cubic
  static func eio(_ x: Double) -> Double { x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2 }
  static func inQuad(_ x: Double) -> Double { x * x }
  static func outQuad(_ x: Double) -> Double { 1 - (1 - x) * (1 - x) }
  static func inOutQuad(_ x: Double) -> Double { x < 0.5 ? 2 * x * x : 1 - pow(-2 * x + 2, 2) / 2 }
  /// the launch's back-out: about 4% over
  static func backOut(_ x: Double) -> Double { 1 + 2 * pow(x - 1, 3) + pow(x - 1, 2) }
  /// Reanimated's Easing.back(s), eased out
  static func outBack(_ x: Double, _ s: Double = 1.70158) -> Double {
    let u = x - 1
    return 1 + (s + 1) * u * u * u + s * u * u
  }
  /// a damped spring settling from 1 to 0 over about `dur` seconds (the pips' and the rocks' settle)
  static func settle(_ t: Double, dur: Double = 0.5, freq: Double = 2.2) -> Double {
    guard t > 0 else { return 1 }
    guard t < dur else { return 0 }
    let k = t / dur
    return exp(-5 * k) * cos(2 * .pi * freq * k)
  }
}

// MARK: - depth (rule B)

extension View {
  /// Rule B's depth for an object on the run's ground: the shared KObjectDepth shadow, in the deep
  /// purple on the blue (the dark tint) and the light tint on paper and Shell.
  func obDepth<S: Shape>(_ shape: S, onBlue: Bool, offset: CGFloat = KObjectDepth.offset) -> some View {
    kObjectDepth(shape, theme: onBlue ? .midnight : .classic, offset: offset)
  }
}

// MARK: - the egg (components/EggShell EggBody, on its own -110…110 box)

/// One of the four shells (EGG_SHELLS), or the launch's white egg.
struct KObShellArt: Equatable {
  let base: Color
  let mid: Color
  let deep: Color
  /// nil: no birthmark (the launch's egg)
  let mark: Color?

  static let all: [KObShellArt] = [
    KObShellArt(base: Color(hex: "#E6E9F6"), mid: Color(hex: "#D2D7EC"), deep: Color(hex: "#B8BFDC"), mark: Color(hex: "#7C86B8")),
    KObShellArt(base: Color(hex: "#DCE8DC"), mid: Color(hex: "#C6D9C6"), deep: Color(hex: "#A8C2A8"), mark: Color(hex: "#4F8C5C")),
    KObShellArt(base: Color(hex: "#EADFEE"), mid: Color(hex: "#D6C6DC"), deep: Color(hex: "#BCA8C4"), mark: Color(hex: "#8A6AA0")),
    KObShellArt(base: Color(hex: "#F7E4DA"), mid: Color(hex: "#EACCBE"), deep: Color(hex: "#D6ADA0"), mark: Color(hex: "#C8705A")),
  ]
  /// the launch's egg: white, no birthmark, a gold dot of warmth inside
  static let launch = KObShellArt(base: Color(hex: "#FFFFFF"), mid: Color(hex: "#E9E8F7"), deep: Color(hex: "#D3D1EE"), mark: nil)

  static func at(_ i: Int) -> KObShellArt { all.indices.contains(i) ? all[i] : all[0] }
}

enum KObEggPaths {
  static let rim: Path = {
    let pts: [(CGFloat, CGFloat)] = [
      (0, -96), (26, -92), (48, -76), (64, -50), (72, -20), (74, 6), (68, 38), (52, 68), (30, 88), (0, 96),
      (-30, 88), (-52, 68), (-68, 38), (-74, 6), (-72, -20), (-64, -50), (-48, -76), (-26, -92),
    ]
    var p = Path()
    p.move(to: CGPoint(x: pts[0].0, y: pts[0].1))
    for q in pts.dropFirst() { p.addLine(to: CGPoint(x: q.0, y: q.1)) }
    p.closeSubpath()
    return p
  }()
  static let mark = KSVGPath.path("M-10 -60 q10 -8 20 0 q-4 10 -10 10 q-6 0 -10 -10z")
  static let specks: [(CGFloat, CGFloat, CGFloat)] = [(-30, -44, 4.6), (26, -20, 3.4), (-14, 30, 3), (38, 44, 4)]
}

/// The egg drawn alone at `size` (no glow, no shadow): a shell, or the launch's egg with its gold dot.
struct KObEgg: View {
  let art: KObShellArt
  var goldDot = false
  let size: CGFloat

  init(shell: Int?, size: CGFloat) {
    if let shell {
      art = KObShellArt.at(shell)
    } else {
      art = .launch
      goldDot = true
    }
    self.size = size
  }

  var body: some View {
    Canvas { gc, canvas in
      var g = gc
      let k = canvas.width / 220 * 0.98
      g.translateBy(x: canvas.width / 2, y: canvas.height / 2)
      g.scaleBy(x: k, y: k)
      let shading = GraphicsContext.Shading.linearGradient(
        Gradient(stops: [.init(color: .white, location: 0), .init(color: art.base, location: 0.46), .init(color: art.mid, location: 1)]),
        startPoint: CGPoint(x: -40, y: -96),
        endPoint: CGPoint(x: 50, y: 96)
      )
      g.fill(KObEggPaths.rim, with: shading)
      g.stroke(KObEggPaths.rim, with: .color(KOb.eggLine), style: StrokeStyle(lineWidth: 2.4, lineJoin: .round))
      for (x, y, r) in KObEggPaths.specks {
        g.fill(Path(ellipseIn: CGRect(x: x - r, y: y - r, width: 2 * r, height: 2 * r)), with: .color(art.deep.opacity(0.55)))
      }
      if let mark = art.mark {
        g.fill(KObEggPaths.mark, with: .color(mark.opacity(0.7)))
      }
      if goldDot {
        g.fill(Path(ellipseIn: CGRect(x: -15, y: -11, width: 30, height: 30)), with: .color(KOb.gold))
      }
    }
    .frame(width: size, height: size)
    .accessibilityHidden(true)
  }
}

/// The gold warmth behind and inside the egg; `heat` 0–1 grows it.
struct KObWarmth: View {
  let size: CGFloat
  var heat: Double = 0

  var body: some View {
    RadialGradient(
      stops: [
        .init(color: KOb.gold.opacity(0.55 + 0.35 * heat), location: 0),
        .init(color: KOb.gold.opacity(0.18 + 0.2 * heat), location: 0.55),
        .init(color: KOb.gold.opacity(0), location: 1),
      ],
      center: .center,
      startRadius: 0,
      endRadius: size / 2
    )
    .frame(width: size, height: size)
    .clipShape(Circle())
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

// MARK: - the launch's mark (LaunchAnimation LaunchMarkArt, on its 1024 grid)

enum KObMarkPaths {
  static let arcL = KSVGPath.path("M394.6 767.2 C300 707 262 620 262 514 C262 360 346 244 451.5 209.5")
  static let arcR = KSVGPath.path("M629.4 237.5 C714 298 762 400 762 525 C762 660 680 760 572.5 791.7")
}

/// The finished mark, two commas and the dot, at `size` in one colour.
struct KObLaunchMark: View {
  let size: CGFloat
  var color: Color = .white

  var body: some View {
    Canvas { gc, canvas in
      var g = gc
      let k = canvas.width / 1024
      g.scaleBy(x: k, y: k)
      let stroke = StrokeStyle(lineWidth: 84, lineCap: .round)
      g.stroke(KObMarkPaths.arcL, with: .color(color), style: stroke)
      g.stroke(KObMarkPaths.arcR, with: .color(color), style: stroke)
      for (x, y, r) in [(394.6, 767.2, 96.0), (629.4, 237.5, 96.0), (512.0, 520.0, 44.0)] {
        g.fill(Path(ellipseIn: CGRect(x: x - r, y: y - r, width: 2 * r, height: 2 * r)), with: .color(color))
      }
    }
    .frame(width: size, height: size)
    .accessibilityHidden(true)
  }
}

// MARK: - the airmail band (s06-envelope-front AirmailStripes, s08-envelope stripes)

/// Diagonal red and Post Blue bars with white between, 45° down to the left, over the whole box.
struct KObAirmail: View {
  /// the bars' pitch (red to red) and width
  var period: CGFloat = 22
  var bar: CGFloat = 7.5
  var red = Color(hex: "#E5533D")

  var body: some View {
    Canvas { g, size in
      let h = size.height
      var reds = Path()
      var blues = Path()
      var i = 0
      var x = -h
      while x < size.width + h {
        var p = Path()
        p.move(to: CGPoint(x: x, y: 0))
        p.addLine(to: CGPoint(x: x + bar, y: 0))
        p.addLine(to: CGPoint(x: x + bar - h, y: h))
        p.addLine(to: CGPoint(x: x - h, y: h))
        p.closeSubpath()
        if i % 2 == 0 { reds.addPath(p) } else { blues.addPath(p) }
        x += period / 2
        i += 1
      }
      g.fill(Rectangle().path(in: CGRect(origin: .zero, size: size)), with: .color(KOb.paper))
      g.fill(reds, with: .color(red))
      g.fill(blues, with: .color(KOb.blue))
    }
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

// MARK: - keys

/// The press of a flat key: the face a shade down and a hair smaller (rule B: no shadow to collapse).
struct KObPressStyle: ButtonStyle {
  var pressedOpacity: Double = 1
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .scaleEffect(configuration.isPressed ? 0.98 : 1)
      .opacity(configuration.isPressed ? pressedOpacity : 1)
      .animation(.easeOut(duration: configuration.isPressed ? 0.06 : 0.12), value: configuration.isPressed)
  }
}

/// THE primary key: acid, an ink label, flat (rule B). Dim is the same key at 40%, in place.
struct KObAcidKey: View {
  let label: String
  var disabled = false
  var busy = false
  var hint: String? = nil
  let action: () -> Void

  var body: some View {
    let inert = disabled || busy
    Button {
      if !inert { action() }
    } label: {
      KObAcidFace(label: label, busy: busy)
    }
    .buttonStyle(KObAcidPress())
    .disabled(inert)
    .opacity(disabled ? 0.4 : 1)
    .frame(height: KOb.keyRoom)
    .accessibilityLabel(label)
    .accessibilityHint(hint ?? "")
  }
}

private struct KObAcidFace: View {
  let label: String
  let busy: Bool
  var body: some View {
    ZStack {
      if busy {
        ProgressView().tint(KOb.ink)
      } else {
        Text(label)
          .kText(.obKey)
          .foregroundStyle(KOb.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          .padding(.horizontal, 12)
          .dynamicTypeSize(...DynamicTypeSize.accessibility1)
      }
    }
    .frame(maxWidth: .infinity)
    .frame(height: KOb.keyH)
  }
}

private struct KObAcidPress: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(configuration.isPressed ? KOb.acidDown : KOb.acid))
      .scaleEffect(configuration.isPressed ? 0.985 : 1)
      .animation(.easeOut(duration: configuration.isPressed ? 0.06 : 0.12), value: configuration.isPressed)
      .contentShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
  }
}

/// A line of type that is a key: white on blue, ink on paper and Shell; a 44pt target.
struct KObTextKey: View {
  let label: String
  var color: Color = KOb.white
  var underline = false
  var disabled = false
  let action: () -> Void

  var body: some View {
    Button {
      if !disabled { action() }
    } label: {
      Text(label)
        .kText(.obTextKey)
        .underline(underline)
        .foregroundStyle(color)
        .multilineTextAlignment(.center)
        .padding(.horizontal, 12)
        .frame(minHeight: 44)
        .contentShape(Rectangle())
    }
    .buttonStyle(KObPressStyle(pressedOpacity: 0.6))
    .disabled(disabled)
    .opacity(disabled ? 0.4 : 1)
  }
}

/// ‹ in the ground's type colour, a 44pt target.
struct KObBackKey: View {
  let label: String
  var color: Color = KOb.white
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      KLineIcon(.chevronLeft, size: 22, lineWidth: 2.6, color: color)
        .frame(width: 44, height: 44)
        .contentShape(Rectangle())
    }
    .buttonStyle(KObPressStyle(pressedOpacity: 0.6))
    .accessibilityLabel(label)
  }
}

// MARK: - headline and line

struct KObHeadline: View {
  let text: String
  var color: Color = KOb.white
  var align: TextAlignment = .center

  var body: some View {
    Text(text)
      .kText(.obHeadline)
      .foregroundStyle(color)
      .multilineTextAlignment(align)
      .frame(maxWidth: .infinity, alignment: align == .center ? .center : .leading)
      .fixedSize(horizontal: false, vertical: true)
      .accessibilityAddTraits(.isHeader)
  }
}

struct KObLine: View {
  let text: String
  var color: Color = KOb.white
  var small = false
  var align: TextAlignment = .center

  var body: some View {
    Text(text)
      .kText(small ? .obLineSmall : .obLine)
      .foregroundStyle(color)
      .multilineTextAlignment(align)
      .frame(maxWidth: .infinity, alignment: align == .center ? .center : .leading)
      .fixedSize(horizontal: false, vertical: true)
      .padding(.top, 10)
  }
}

// MARK: - the screen frame (parts/frame ScreenFrame)

/// The key area: the primary key's room, then a 44pt row for a text key, both always reserved,
/// above the home indicator (or 8 above the keyboard).
struct KObKeyArea<Primary: View, Secondary: View>: View {
  let bottomInset: CGFloat
  var keyboardUp = false
  @ViewBuilder let primary: Primary
  @ViewBuilder let secondary: Secondary

  var body: some View {
    // the rows are reserved even when a screen has no key for them (an EmptyView keeps no frame)
    VStack(spacing: 0) {
      Color.clear
        .frame(maxWidth: .infinity)
        .frame(height: KOb.keyRoom)
        .overlay { primary }
      Color.clear
        .frame(maxWidth: .infinity)
        .frame(height: KOb.textKeyRow)
        .overlay { secondary }
        .padding(.top, 4)
    }
    .padding(.horizontal, KOb.gutter)
    .padding(.top, 10)
    .padding(.bottom, keyboardUp ? 8 : max(bottomInset, 16))
  }
}

/// Every screen from 2 on: the top bar (‹ on the left), the nest slot on 3–6 and 8 (the root
/// draws the one nest egg over it), the body, and the key area.
struct KObFrame<Body: View, Primary: View, Secondary: View>: View {
  let topInset: CGFloat
  let bottomInset: CGFloat
  var backLabel = ""
  var backColor: Color = KOb.white
  var onBack: (() -> Void)? = nil
  var nest = false
  var keyboardUp = false
  var scroll = false
  @ViewBuilder let content: Body
  @ViewBuilder let primary: Primary
  @ViewBuilder let secondary: Secondary

  var body: some View {
    VStack(spacing: 0) {
      Color.clear.frame(height: topInset)
      HStack {
        if let onBack {
          KObBackKey(label: backLabel, color: backColor, action: onBack)
        } else {
          Color.clear.frame(width: 44, height: 44)
        }
        Spacer()
      }
      .padding(.horizontal, 6)
      .frame(height: KOb.topBarH)
      if nest {
        Color.clear.frame(height: KOb.nestSlotH)
      }
      Group {
        if scroll {
          ScrollView {
            content
              .padding(.horizontal, KOb.gutter)
              .frame(maxWidth: .infinity)
          }
          .scrollIndicators(.hidden)
          .scrollBounceBehavior(.basedOnSize)
        } else {
          VStack(spacing: 0) { content }
            .padding(.horizontal, KOb.gutter)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
      }
      .frame(maxHeight: .infinity, alignment: .top)
      KObKeyArea(bottomInset: bottomInset, keyboardUp: keyboardUp) { primary } secondary: { secondary }
    }
  }
}

// MARK: - small drawings

/// The dice, in ink (5 and 10).
struct KObDice: View {
  var size: CGFloat = 16
  var color: Color = KOb.ink
  var five = true

  var body: some View {
    Canvas { gc, canvas in
      var g = gc
      let k = canvas.width / 24
      g.scaleBy(x: k, y: k)
      g.stroke(Path(roundedRect: CGRect(x: 3, y: 3, width: 18, height: 18), cornerRadius: 4), with: .color(color), lineWidth: 2.2)
      var dots: [(CGFloat, CGFloat)] = [(8.5, 8.5), (15.5, 8.5), (8.5, 15.5), (15.5, 15.5)]
      if five { dots.append((12, 12)) }
      for (x, y) in dots {
        g.fill(Path(ellipseIn: CGRect(x: x - 1.9, y: y - 1.9, width: 3.8, height: 3.8)), with: .color(color))
      }
    }
    .frame(width: size, height: size)
    .accessibilityHidden(true)
  }
}

/// A plain little envelope (the ones the bird brings back, the one it holds on 11), rule B: white
/// paper, the flap's V in a quiet line, the object's depth instead of an ink edge.
struct KObPlainEnvelope: View {
  var width: CGFloat = 58
  var tilt: Double = 0

  var body: some View {
    let h = (width * 0.66).rounded()
    let r = width / 14
    ZStack {
      RoundedRectangle(cornerRadius: r, style: .continuous).fill(KOb.paper)
      Path { p in
        let e = max(2, width / 26) * 1.6
        p.move(to: CGPoint(x: e, y: e))
        p.addLine(to: CGPoint(x: width / 2, y: h * 0.56))
        p.addLine(to: CGPoint(x: width - e, y: e))
      }
      .stroke(KOb.inkSoft.opacity(0.55), style: StrokeStyle(lineWidth: max(1.4, width / 34), lineCap: .round, lineJoin: .round))
    }
    .frame(width: width, height: h)
    .obDepth(RoundedRectangle(cornerRadius: r, style: .continuous), onBlue: false, offset: max(2, width / 20))
    .rotationEffect(.degrees(tilt))
    .accessibilityHidden(true)
  }
}

/// The run's switch, flat (rule B): an acid track and a white knob when on; quiet grey off.
struct KObToggle: View {
  let on: Bool

  var body: some View {
    ZStack(alignment: .leading) {
      Capsule().fill(on ? KOb.acid : KOb.lavenderWait)
      Circle()
        .fill(KOb.paper)
        .frame(width: 24, height: 24)
        .offset(x: on ? 23 : 3)
    }
    .frame(width: 50, height: 30)
    .animation(.easeOut(duration: 0.16), value: on)
    .accessibilityHidden(true)
  }
}

/// A string with [bracketed] spans as links (1a's lines): the spans underlined, each a link.
enum KObLinked {
  /// the line as an AttributedString whose bracketed spans carry `obLink://i` and are underlined
  static func attributed(_ text: String, linkColor: Color? = nil, bold: Bool = false) -> AttributedString {
    var out = AttributedString()
    var rest = Substring(text)
    var n = 0
    while let open = rest.firstIndex(of: "["), let close = rest[open...].firstIndex(of: "]") {
      out += AttributedString(String(rest[rest.startIndex..<open]))
      var link = AttributedString(String(rest[rest.index(after: open)..<close]))
      link.link = URL(string: "oblink://\(n)")
      if linkColor == nil { link.underlineStyle = .single }
      if let linkColor { link.foregroundColor = linkColor }
      if bold { link.inlinePresentationIntent = .stronglyEmphasized }
      out += link
      n += 1
      rest = rest[rest.index(after: close)...]
    }
    out += AttributedString(String(rest))
    return out
  }

  /// which bracketed span a tapped oblink:// URL is
  static func index(_ url: URL) -> Int? {
    guard url.scheme == "oblink" else { return nil }
    return Int(url.host ?? "")
  }
}
