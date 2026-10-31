// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE WRAPPED REPORT'S KIT (owner, 2026-10-31; design/report-v2): the candy grounds, the type, the
 ink outline and hard shadow, and the pieces of post the two templates are built from. Used by
 KWrappedReportScreen, KWrappedCardsA/B and KWrappedShareCard only.

 THE TYPE (system faces only, as KType says):
 - heroes: SF Pro Black, condensed, tracking −2%, the type name, "41", "23:00–02:00", the pair
 - titles: SF Pro Black, tracking −3.5%, lower case as the copy comes
 - labels: SF Mono Bold, tracking +1.4pt (the copy arrives already cased)
 - body and keys: SF Pro Semibold
 - card 3's line: the reader's Letter font (.kText(.content)), never here
 Every size scales with Dynamic Type (@ScaledMetric); the screen caps it at xxxLarge and fits each
 card to its space (KWrappedFit), so a large size makes the words bigger and the card's
 decoration smaller, never cut off.

 RULE B (2026-10-26): controls are flat — the keys and the close key have no outline and no
 shadow. Mail objects and hashtag stickers keep the 3pt ink outline and the hard offset shadow,
 no blur, no glow.
 */

enum KW {
  static let ink = Color(hex: "#1E1B35")
  static let ink2 = Color(hex: "#55506E")
  static let paper = Color.white
  static let blue = Color(hex: "#5B55FF")
  static let acid = Color(hex: "#C3E84F")
  static let butter = Color(hex: "#FFD84A")
  static let butterDeep = Color(hex: "#EBB63A")
  static let pink = Color(hex: "#FF8FC8")
  static let mint = Color(hex: "#7EE0B8")
  static let orange = Color(hex: "#FF8A3D")
  static let lilac = Color(hex: "#B9A8FF")
  /// A's "your hour" and B's night: the one dark card
  static let night = Color(hex: "#1E1B35")
}

/// A card's ground and whether its chrome (progress, ×, status bar) is drawn light.
struct KWGround {
  let color: Color
  let dark: Bool
  /// the hard shadow under objects on this ground (ink, or the blue on the night card)
  var shadow: Color { dark ? KW.blue : KW.ink }
}

// MARK: - Type

enum KWFace {
  case hero, title, label, body, heavy
}

private struct KWFont: ViewModifier {
  let face: KWFace
  @ScaledMetric private var size: CGFloat

  init(_ face: KWFace, _ size: CGFloat) {
    self.face = face
    // heroes and titles grow more slowly than body text (largeTitle's curve)
    _size = ScaledMetric(wrappedValue: size, relativeTo: face == .hero || face == .title ? .largeTitle : .body)
  }

  func body(content: Content) -> some View {
    switch face {
    case .hero:
      content.font(.system(size: size, weight: .black).width(.condensed)).tracking(-size * 0.02).kwTightLines()
    case .title:
      content.font(.system(size: size, weight: .black)).tracking(-size * 0.035).kwTightLines()
    case .heavy:
      content.font(.system(size: size, weight: .heavy).width(.condensed)).tracking(-size * 0.01)
    case .label:
      content.font(.system(size: size, weight: .bold, design: .monospaced)).tracking(1.4)
    case .body:
      content.font(.system(size: size, weight: .semibold))
    }
  }
}

extension View {
  /// The report's type: kw(.hero, 64) …
  func kw(_ face: KWFace, _ size: CGFloat) -> some View {
    modifier(KWFont(face, size))
  }

  /// The ink outline drawn around whatever this is (its silhouette, `width` out in eight
  /// directions), and the hard shadow `shadow` down and right. For pictures and objects with
  /// irregular edges: a sticker, a stamp, Wren. Text heroes use KWHeroText instead.
  func kwInk(_ width: CGFloat = 3, shadow: CGFloat = 6, shadowColor: Color = KW.ink) -> some View {
    modifier(KWInkOutline(width: width, shadow: shadow, shadowColor: shadowColor))
  }

  /// The hard shadow alone, for shapes that draw their own edge.
  func kwShadow(_ d: CGFloat = 6, _ color: Color = KW.ink) -> some View {
    background { color.mask(self).offset(x: d, y: d).accessibilityHidden(true) }
  }
}

private struct KWInkOutline: ViewModifier {
  let width: CGFloat
  let shadow: CGFloat
  let shadowColor: Color

  private static let dirs: [(CGFloat, CGFloat)] = [(1, 0), (-1, 0), (0, 1), (0, -1), (0.7, 0.7), (-0.7, 0.7), (0.7, -0.7), (-0.7, -0.7)]

  func body(content: Content) -> some View {
    content
      .background {
        ZStack {
          if shadow > 0 {
            shadowColor.mask(content).offset(x: shadow, y: shadow)
          }
          ForEach(0..<Self.dirs.count, id: \.self) { i in
            KW.ink.mask(content).offset(x: Self.dirs[i].0 * width, y: Self.dirs[i].1 * width)
          }
        }
        .accessibilityHidden(true)
      }
  }
}

private struct KWLooseLinesKey: EnvironmentKey {
  static let defaultValue = false
}

extension EnvironmentValues {
  /// The report's words are Japanese or Korean: their glyphs are taller than the Latin line box, so
  /// the poster leading stays the font's own (set by KWrappedReportScreen from the copy)
  var kwLooseLines: Bool {
    get { self[KWLooseLinesKey.self] }
    set { self[KWLooseLinesKey.self] = newValue }
  }
}

private struct KWTightLines: ViewModifier {
  @Environment(\.kwLooseLines) private var loose

  func body(content: Content) -> some View {
    if #available(iOS 26.0, *), !loose {
      content.lineHeight(.multiple(factor: 0.94))
    } else {
      content
    }
  }
}

extension View {
  /// Poster leading for the giant condensed words: the lines close up (close to A's .9) where the system
  /// can set a line height (iOS 26), at .94 so descenders and the outline still clear; before that, the font's own leading.
  func kwTightLines() -> some View {
    modifier(KWTightLines())
  }
}

/// Hero words: white (or `fill`) condensed black, a 3pt ink outline and a hard shadow (A's type,
/// grafted onto B by the verdict).
struct KWHeroText: View {
  let text: String
  let size: CGFloat
  var fill: Color = .white
  var outline: CGFloat = 3
  var shadow: CGFloat = 5
  var shadowColor: Color = KW.ink
  var lineSpacing: CGFloat = 0
  var align: TextAlignment = .leading

  var body: some View {
    let t = Text(text)
    t.kw(.hero, size)
      .foregroundStyle(fill)
      .lineSpacing(lineSpacing)
      .kwTightLines()
      .multilineTextAlignment(align)
      .fixedSize(horizontal: false, vertical: true)
      .minimumScaleFactor(0.5)
      // the outline and shadow sit outside the closed-up line box: room for them below
      .padding(.bottom, outline + shadow)
      .kwInk(outline, shadow: shadow, shadowColor: shadowColor)
  }
}

/// A mono label, as the copy gives it (already cased).
struct KWLabel: View {
  let text: String
  var size: CGFloat = 11
  var color: Color = KW.ink

  var body: some View {
    Text(text)
      .kw(.label, size)
      .foregroundStyle(color)
      .fixedSize(horizontal: false, vertical: true)
  }
}

// MARK: - Stickers and keys

/// A hashtag sticker: a pill with the ink outline and a small hard shadow (content, so it keeps
/// its edge under rule B).
struct KWSticker: View {
  let text: String
  var fill: Color = KW.acid
  var size: CGFloat = 17
  var ink: Color = KW.ink

  var body: some View {
    Text(text)
      .kw(.heavy, size)
      .foregroundStyle(ink)
      .lineLimit(1)
      .minimumScaleFactor(0.6)
      .padding(.horizontal, size * 0.75)
      .padding(.vertical, size * 0.42)
      .background(Capsule().fill(fill))
      .overlay(Capsule().strokeBorder(KW.ink, lineWidth: max(2, size * 0.16)))
      .background(Capsule().fill(KW.ink).offset(x: 3, y: 3))
  }
}

/// A key: flat (rule B), a filled rounded rectangle and its words, lower case as the copy is.
struct KWKey: View {
  enum Kind { case acid, white, ink }
  let title: String
  var kind: Kind = .acid
  var small = false
  let action: () -> Void

  var body: some View {
    SwiftUI.Button(action: action) {
      Text(title)
        .kw(.body, small ? 15 : 17)
        .fontWeight(.bold)
        .foregroundStyle(kind == .ink ? Color.white : KW.ink)
        .lineLimit(2)
        .minimumScaleFactor(0.7)
        .multilineTextAlignment(.center)
        .frame(maxWidth: small ? nil : .infinity)
        .padding(.horizontal, 16)
        .frame(minHeight: small ? 44 : 54)
        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(kind == .acid ? KW.acid : kind == .white ? Color.white : KW.ink))
        .contentShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
    .buttonStyle(KFadePressStyle())
  }
}

// MARK: - Shapes of post

/// A stamp's perforated edge: a rectangle with half-circle bites every `pitch` along each side.
struct KWPerforated: Shape {
  var bite: CGFloat = 6
  var pitch: CGFloat = 18

  func path(in r: CGRect) -> Path {
    var holes = Path()
    func bites(_ from: CGPoint, _ to: CGPoint) {
      let len = hypot(to.x - from.x, to.y - from.y)
      let n = max(1, Int((len / pitch).rounded()))
      for i in 0...n {
        let f = CGFloat(i) / CGFloat(n)
        let c = CGPoint(x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f)
        holes.addEllipse(in: CGRect(x: c.x - bite, y: c.y - bite, width: bite * 2, height: bite * 2))
      }
    }
    bites(CGPoint(x: r.minX, y: r.minY), CGPoint(x: r.maxX, y: r.minY))
    bites(CGPoint(x: r.minX, y: r.maxY), CGPoint(x: r.maxX, y: r.maxY))
    bites(CGPoint(x: r.minX, y: r.minY), CGPoint(x: r.minX, y: r.maxY))
    bites(CGPoint(x: r.maxX, y: r.minY), CGPoint(x: r.maxX, y: r.maxY))
    // the bites are cut out of the edge, never added to it
    return Path(r).subtracting(holes)
  }
}

/// A till receipt: square top, a zigzag torn bottom (even teeth, so the edge is clean).
struct KWReceipt: Shape {
  var tooth: CGFloat = 10

  func path(in r: CGRect) -> Path {
    var p = Path()
    p.move(to: CGPoint(x: r.minX, y: r.minY))
    p.addLine(to: CGPoint(x: r.maxX, y: r.minY))
    p.addLine(to: CGPoint(x: r.maxX, y: r.maxY - tooth))
    let n = max(2, Int((r.width / (tooth * 2)).rounded()))
    let w = r.width / CGFloat(n)
    for i in 0..<n {
      let x0 = r.maxX - CGFloat(i) * w
      p.addLine(to: CGPoint(x: x0 - w / 2, y: r.maxY))
      p.addLine(to: CGPoint(x: x0 - w, y: r.maxY - tooth))
    }
    p.closeSubpath()
    return p
  }
}

/// A ticket with the stub's two notches at `split` across.
struct KWTicket: Shape {
  var split: CGFloat = 0.73
  var notch: CGFloat = 13
  var radius: CGFloat = 14

  func path(in r: CGRect) -> Path {
    let x = r.minX + r.width * split
    var holes = Path()
    holes.addEllipse(in: CGRect(x: x - notch, y: r.minY - notch, width: notch * 2, height: notch * 2))
    holes.addEllipse(in: CGRect(x: x - notch, y: r.maxY - notch, width: notch * 2, height: notch * 2))
    return Path(roundedRect: r, cornerRadius: radius, style: .continuous).subtracting(holes)
  }
}

/// A luggage tag: the top corners clipped, rounded at the bottom.
struct KWTag: Shape {
  func path(in r: CGRect) -> Path {
    let c = min(r.width * 0.22, 70)
    let h = min(r.height * 0.13, 56)
    var p = Path()
    p.move(to: CGPoint(x: r.minX + c, y: r.minY))
    p.addLine(to: CGPoint(x: r.maxX - c, y: r.minY))
    p.addLine(to: CGPoint(x: r.maxX, y: r.minY + h))
    p.addLine(to: CGPoint(x: r.maxX, y: r.maxY - 12))
    p.addQuadCurve(to: CGPoint(x: r.maxX - 12, y: r.maxY), control: CGPoint(x: r.maxX, y: r.maxY))
    p.addLine(to: CGPoint(x: r.minX + 12, y: r.maxY))
    p.addQuadCurve(to: CGPoint(x: r.minX, y: r.maxY - 12), control: CGPoint(x: r.minX, y: r.maxY))
    p.addLine(to: CGPoint(x: r.minX, y: r.minY + h))
    p.closeSubpath()
    return p
  }
}

/// An envelope: a card with its flap drawn as a V.
struct KWEnvelope: View {
  var fill: Color = .white
  var flapDepth: CGFloat = 0.54
  var line: CGFloat = 3

  var body: some View {
    GeometryReader { g in
      let w = g.size.width, h = g.size.height
      ZStack {
        RoundedRectangle(cornerRadius: 8, style: .continuous).fill(fill)
        Path { p in
          p.move(to: .zero)
          p.addLine(to: CGPoint(x: w / 2, y: h * flapDepth))
          p.addLine(to: CGPoint(x: w, y: 0))
        }
        .stroke(KW.ink, style: StrokeStyle(lineWidth: line, lineJoin: .round))
        RoundedRectangle(cornerRadius: 8, style: .continuous).strokeBorder(KW.ink, lineWidth: line)
      }
    }
  }
}

/// A round postmark: two rings, the words in the middle, three waves out to the right.
struct KWPostmark: View {
  let top: String
  let bottom: String
  var color: Color = KW.ink
  var size: CGFloat = 110

  var body: some View {
    ZStack(alignment: .leading) {
      ZStack {
        Circle().strokeBorder(color, lineWidth: 2.5)
        Circle().strokeBorder(color, lineWidth: 1.5).padding(7)
        VStack(spacing: 2) {
          Text(top).font(.system(size: size * 0.1, weight: .heavy, design: .monospaced))
          Rectangle().fill(color).frame(width: size * 0.42, height: 1.5)
          Text(bottom).font(.system(size: size * 0.085, weight: .bold, design: .monospaced))
        }
        .foregroundStyle(color)
        .lineLimit(1)
        .minimumScaleFactor(0.4)
        .frame(width: size * 0.48)
      }
      .frame(width: size * 0.72, height: size * 0.72)
      VStack(spacing: size * 0.08) {
        ForEach(0..<3, id: \.self) { _ in
          KWWave().stroke(color, style: StrokeStyle(lineWidth: 2.5, lineCap: .round)).frame(width: size * 0.5, height: size * 0.06)
        }
      }
      .offset(x: size * 0.62)
    }
    .frame(width: size * 1.15, height: size * 0.72, alignment: .leading)
    .accessibilityHidden(true)
  }
}

struct KWWave: Shape {
  func path(in r: CGRect) -> Path {
    var p = Path()
    p.move(to: CGPoint(x: r.minX, y: r.midY))
    let n = 3
    let w = r.width / CGFloat(n)
    for i in 0..<n {
      let x = r.minX + CGFloat(i) * w
      p.addQuadCurve(to: CGPoint(x: x + w / 2, y: r.midY), control: CGPoint(x: x + w / 4, y: r.minY))
      p.addQuadCurve(to: CGPoint(x: x + w, y: r.midY), control: CGPoint(x: x + w * 3 / 4, y: r.maxY))
    }
    return p
  }
}

/// A four-point sparkle.
struct KWStar: Shape {
  func path(in r: CGRect) -> Path {
    let c = CGPoint(x: r.midX, y: r.midY)
    let a = r.width / 2, b = r.width * 0.12
    var p = Path()
    p.move(to: CGPoint(x: c.x, y: c.y - a))
    p.addLine(to: CGPoint(x: c.x + b, y: c.y - b))
    p.addLine(to: CGPoint(x: c.x + a, y: c.y))
    p.addLine(to: CGPoint(x: c.x + b, y: c.y + b))
    p.addLine(to: CGPoint(x: c.x, y: c.y + a))
    p.addLine(to: CGPoint(x: c.x - b, y: c.y + b))
    p.addLine(to: CGPoint(x: c.x - a, y: c.y))
    p.addLine(to: CGPoint(x: c.x - b, y: c.y - b))
    p.closeSubpath()
    return p
  }
}

/// A barcode, ink bars of a fixed rhythm.
struct KWBarcode: View {
  var body: some View {
    Canvas { ctx, size in
      let pattern: [CGFloat] = [2, 2, 3, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 2, 1, 3]
      var x: CGFloat = 0
      var i = 0
      while x < size.width {
        let w = pattern[i % pattern.count]
        if i % 2 == 0 { ctx.fill(Path(CGRect(x: x, y: 0, width: w, height: size.height)), with: .color(KW.ink)) }
        x += w + 1
        i += 1
      }
    }
    .accessibilityHidden(true)
  }
}

/// The moon of the night cards: butter, two craters.
struct KWMoon: View {
  var size: CGFloat = 74

  var body: some View {
    Circle().fill(KW.butter)
      .overlay(alignment: .topLeading) {
        Circle().fill(KW.butterDeep).frame(width: size * 0.22).offset(x: size * 0.24, y: size * 0.27)
      }
      .overlay(alignment: .topLeading) {
        Circle().fill(KW.butterDeep).frame(width: size * 0.16).offset(x: size * 0.56, y: size * 0.56)
      }
      .frame(width: size, height: size)
      .accessibilityHidden(true)
  }
}

// MARK: - The #tags' glyphs

/// The little picture on a vibe stamp, by tag id (wrapped-core TAG_IDS): drawn, never a word, so
/// it reads in every language (the verdict's unreadable crossed-out "blah" is gone).
struct KWGlyph: View {
  let id: String
  var size: CGFloat = 64

  var body: some View {
    Canvas { ctx, s in
      let w = s.width
      let ink = GraphicsContext.Shading.color(KW.ink)
      let line = StrokeStyle(lineWidth: w * 0.055, lineCap: .round, lineJoin: .round)
      func circle(_ x: CGFloat, _ y: CGFloat, _ r: CGFloat) -> Path { Path(ellipseIn: CGRect(x: x - r, y: y - r, width: r * 2, height: r * 2)) }
      switch id {
      case "night":
        let moon = circle(w * 0.45, w * 0.55, w * 0.36).subtracting(circle(w * 0.66, w * 0.38, w * 0.3))
        ctx.fill(moon, with: .color(KW.butter))
        ctx.stroke(moon, with: ink, style: line)
        let star = KWStar().path(in: CGRect(x: w * 0.68, y: w * 0.08, width: w * 0.26, height: w * 0.26))
        ctx.fill(star, with: .color(KW.acid))
        ctx.stroke(star, with: ink, style: StrokeStyle(lineWidth: w * 0.035, lineJoin: .round))
      case "breathe", "steady", "conversation", "commas":
        for k in 0..<3 {
          var p = Path()
          let y = w * (0.3 + CGFloat(k) * 0.2)
          p.move(to: CGPoint(x: w * 0.08, y: y))
          let amp: CGFloat = id == "steady" ? 0.0 : (id == "conversation" && k == 1 ? 0.12 : 0.07)
          p.addCurve(to: CGPoint(x: w * 0.92, y: y), control1: CGPoint(x: w * 0.35, y: y - w * amp), control2: CGPoint(x: w * 0.65, y: y + w * amp))
          ctx.stroke(p, with: ink, style: line)
        }
      case "short", "clean", "commits":
        let bars: [CGFloat] = id == "short" ? [0.7, 0.45, 0.6] : [0.8, 0.8, 0.8]
        for (k, b) in bars.enumerated() {
          var p = Path()
          let y = w * (0.3 + CGFloat(k) * 0.2)
          p.move(to: CGPoint(x: w * 0.1, y: y))
          p.addLine(to: CGPoint(x: w * (0.1 + b * 0.7), y: y))
          ctx.stroke(p, with: ink, style: line)
          ctx.fill(circle(w * (0.1 + b * 0.7) + w * 0.12, y, w * 0.05), with: ink)
        }
      case "pauses", "hedged":
        for k in 0..<3 { ctx.fill(circle(w * (0.25 + CGFloat(k) * 0.25), w * 0.55, w * 0.08), with: ink) }
      case "observed", "world", "detail":
        let eye = Path(ellipseIn: CGRect(x: w * 0.08, y: w * 0.28, width: w * 0.84, height: w * 0.44))
        ctx.fill(eye, with: .color(.white))
        ctx.stroke(eye, with: ink, style: line)
        ctx.fill(circle(w * 0.5, w * 0.5, w * 0.14), with: ink)
        ctx.fill(circle(w * 0.55, w * 0.45, w * 0.04), with: .color(.white))
      case "contrast", "owned", "low":
        var heart = Path()
        heart.move(to: CGPoint(x: w * 0.5, y: w * 0.85))
        heart.addCurve(to: CGPoint(x: w * 0.5, y: w * 0.3), control1: CGPoint(x: w * -0.15, y: w * 0.45), control2: CGPoint(x: w * 0.3, y: w * 0.0))
        heart.addCurve(to: CGPoint(x: w * 0.5, y: w * 0.85), control1: CGPoint(x: w * 0.7, y: w * 0.0), control2: CGPoint(x: w * 1.15, y: w * 0.45))
        ctx.fill(heart, with: .color(KW.pink))
        if id == "contrast" {
          var half = Path()
          half.addRect(CGRect(x: w * 0.5, y: 0, width: w * 0.5, height: w))
          ctx.drawLayer { l in
            l.clip(to: half)
            l.fill(heart, with: .color(KW.blue))
          }
        }
        ctx.stroke(heart, with: ink, style: line)
      case "distance", "inside":
        let head = circle(w * 0.5, w * 0.42, w * 0.24)
        ctx.fill(head, with: .color(.white))
        ctx.stroke(head, with: ink, style: line)
        let dot = id == "inside" ? circle(w * 0.5, w * 0.42, w * 0.08) : circle(w * 0.85, w * 0.15, w * 0.08)
        ctx.fill(dot, with: ink)
        var body = Path()
        body.move(to: CGPoint(x: w * 0.18, y: w * 0.92))
        body.addQuadCurve(to: CGPoint(x: w * 0.82, y: w * 0.92), control: CGPoint(x: w * 0.5, y: w * 0.55))
        ctx.stroke(body, with: ink, style: line)
      case "nothroat":
        // a speech bubble with an arrow straight through it: no warm-up, right in
        var bubble = Path(roundedRect: CGRect(x: w * 0.1, y: w * 0.15, width: w * 0.8, height: w * 0.5), cornerRadius: w * 0.1)
        bubble.move(to: CGPoint(x: w * 0.3, y: w * 0.65))
        bubble.addLine(to: CGPoint(x: w * 0.28, y: w * 0.85))
        bubble.addLine(to: CGPoint(x: w * 0.48, y: w * 0.65))
        ctx.fill(bubble, with: .color(.white))
        ctx.stroke(bubble, with: ink, style: line)
        var arrow = Path()
        arrow.move(to: CGPoint(x: w * 0.25, y: w * 0.4))
        arrow.addLine(to: CGPoint(x: w * 0.72, y: w * 0.4))
        arrow.move(to: CGPoint(x: w * 0.6, y: w * 0.3))
        arrow.addLine(to: CGPoint(x: w * 0.72, y: w * 0.4))
        arrow.addLine(to: CGPoint(x: w * 0.6, y: w * 0.5))
        ctx.stroke(arrow, with: ink, style: line)
      case "plain":
        let sq = Path(roundedRect: CGRect(x: w * 0.2, y: w * 0.2, width: w * 0.6, height: w * 0.6), cornerRadius: w * 0.08)
        ctx.fill(sq, with: .color(KW.acid))
        ctx.stroke(sq, with: ink, style: line)
      default:
        // quirks, and anything new: a squiggle
        var p = Path()
        p.move(to: CGPoint(x: w * 0.12, y: w * 0.6))
        p.addCurve(to: CGPoint(x: w * 0.5, y: w * 0.45), control1: CGPoint(x: w * 0.2, y: w * 0.1), control2: CGPoint(x: w * 0.45, y: w * 0.9))
        p.addCurve(to: CGPoint(x: w * 0.88, y: w * 0.4), control1: CGPoint(x: w * 0.55, y: w * 0.05), control2: CGPoint(x: w * 0.8, y: w * 0.8))
        ctx.stroke(p, with: ink, style: line)
        let star = KWStar().path(in: CGRect(x: w * 0.66, y: w * 0.06, width: w * 0.24, height: w * 0.24))
        ctx.fill(star, with: .color(KW.butter))
        ctx.stroke(star, with: ink, style: StrokeStyle(lineWidth: w * 0.035, lineJoin: .round))
      }
    }
    .frame(width: size, height: size)
    .accessibilityHidden(true)
  }
}

// MARK: - Fitting a card to its space

/// Lays the card out at its natural height for this width (bigger with Dynamic Type), and scales
/// it down from the top left (in line with the card's footer) when that is taller than the space (an iPhone SE, XXXL). Never up. The
/// width stays the space's (measuring at a wider one would change the height it measures), so a
/// card scaled down gains side margins.
struct KWrappedFit<Content: View>: View {
  @ViewBuilder let content: () -> Content
  @State private var natural: CGFloat = 0

  var body: some View {
    GeometryReader { g in
      let s = natural > g.size.height && natural > 0 ? max(0.55, g.size.height / natural) : 1
      content()
        .frame(width: g.size.width, alignment: .leading)
        .fixedSize(horizontal: false, vertical: true)
        .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { natural = $0 }
        .scaleEffect(s, anchor: .topLeading)
        .frame(width: g.size.width, height: g.size.height, alignment: .topLeading)
    }
  }
}
