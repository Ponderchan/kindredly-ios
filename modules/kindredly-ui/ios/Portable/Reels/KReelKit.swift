import SwiftUI

/*
 THE KIT FOR A REEL, IN SWIFTUI (2026-11-09, behind the "reels" switch, off by default).
 Mirrors src/components/guide-reel/kit.tsx: a reel is a few scenes that play on their own in a
 square, each drawn at the square's side `s` (never a small picture scaled up), each scene's
 motion starting from zero when its turn comes.

 TIME, NOT ANIMATIONS. React Native runs each piece on Reanimated (useOnce, useLoop, useStep,
 withSequence) and a few on JS timers (a count ticking, a face changing). Here every scene is a
 pure function of one clock: the milliseconds since the scene mounted (KReelClock.t), read off the
 player's TimelineView. So a scene is redrawn every frame from that number and nothing in it can
 restart by being re-rendered (the bug the React Native files guard against with memo and
 module-level curves). The curves are Reanimated's own (Easing.out(cubic), back(s), bounce, the
 withTiming default inOut(quad)), written out in KReelEase.

 REDUCE MOTION, as React Native's ReduceMotion.System does it: an animation finishes at once with
 its delay skipped (once → 1, a sequence → its last value, a loop → the end of one pass: 0 for
 a there-and-back loop, 1 for a pulse). What React Native times in JS (setTimeout: a count, a
 face, a "done" flag) is not Reanimated's and keeps its real time (KReelClock.after), except where
 the React Native scene itself asks useReducedMotion (each scene says so).

 TYPE. A reel is a picture: its type is set at fixed sizes from `s` and does not follow Dynamic
 Type (React Native's would grow inside the fixed square and spill out of it; here the square
 keeps its layout at every text size). Labels are SF Mono, words the system font, a line of a
 letter the reader's Letter font (KType.letter with the environment's face), as in React Native.

 A REEL IS A LIGHT PICTURE IN EVERY THEME (kit.tsx FACE_INK): every colour here is fixed, the
 light themes' (KReelInk); nothing reads the theme but the player's dark-card edge.
 */

// MARK: - Curves

/// Reanimated's Easing, written out: in(f) = f, out(f) = 1 − f(1 − t), inOut(f) halves.
enum KReelEase {
  typealias Curve = (Double) -> Double

  static let linear: Curve = { $0 }
  static let inQuad: Curve = { $0 * $0 }
  static let outQuad: Curve = { 1 - (1 - $0) * (1 - $0) }
  static let inOutQuad: Curve = { t in t < 0.5 ? 2 * t * t : 1 - pow(-2 * t + 2, 2) / 2 }
  static let inCubic: Curve = { $0 * $0 * $0 }
  static let outCubic: Curve = { 1 - pow(1 - $0, 3) }
  static let inOutCubic: Curve = { t in t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2 }

  /// Easing.out(Easing.back(s)): overshoots past 1, then settles
  static func outBack(_ s: Double) -> Curve {
    { t in
      let u = 1 - t
      return 1 - u * u * ((s + 1) * u - s)
    }
  }

  /// Easing.bounce (Reanimated's: Penner's bounce-out)
  static let bounce: Curve = { t in
    if t < 1 / 2.75 { return 7.5625 * t * t }
    if t < 2 / 2.75 {
      let u = t - 1.5 / 2.75
      return 7.5625 * u * u + 0.75
    }
    if t < 2.5 / 2.75 {
      let u = t - 2.25 / 2.75
      return 7.5625 * u * u + 0.9375
    }
    let u = t - 2.625 / 2.75
    return 7.5625 * u * u + 0.984375
  }

  /// withTiming's default curve
  static let timing: Curve = inOutQuad
}

/// one step of a withSequence: to `to` over `ms` along `ease`; `hold` waits first (a withDelay inside it)
struct KReelStep {
  let to: Double
  let ms: Double
  var ease: KReelEase.Curve = KReelEase.timing
  var hold: Double = 0
}

// MARK: - The clock

/// A scene's time: ms since it mounted, and whether the system asks for less motion.
struct KReelClock {
  let t: Double
  let still: Bool

  @inline(__always) static func clamp01(_ x: Double) -> Double { min(1, max(0, x)) }

  /// useOnce: 0 → 1 once, after `delay`, over `ms`
  func once(_ ms: Double, _ delay: Double = 0, _ ease: KReelEase.Curve = KReelEase.outCubic) -> Double {
    if still { return 1 }
    if t <= delay { return 0 }
    return ease(Self.clamp01((t - delay) / max(1, ms)))
  }

  /// useLoop: 0 → 1 → 0, forever (inOut(quad) both ways); still: 0
  func loop(_ ms: Double, _ delay: Double = 0) -> Double {
    if still || t <= delay { return 0 }
    let ph = (t - delay).truncatingRemainder(dividingBy: 2 * ms)
    let p = ph < ms ? ph / ms : 2 - ph / ms
    return KReelEase.inOutQuad(p)
  }

  /// a withRepeat of one timing 0 → 1 (no reverse), forever; still: 1
  func pulse(_ ms: Double, _ delay: Double = 0, _ ease: KReelEase.Curve = KReelEase.outQuad) -> Double {
    if still { return 1 }
    if t <= delay { return 0 }
    return ease((t - delay).truncatingRemainder(dividingBy: ms) / ms)
  }

  /// useStep: 0 → n linearly, one unit every `every`, after `delay`
  func step(_ n: Double, _ every: Double, _ delay: Double = 0) -> Double {
    if still { return n }
    if t <= delay { return 0 }
    return min(n, (t - delay) / every)
  }

  /// withDelay(delay, withSequence(steps…)) from `from`; still: the last step's value
  func seq(_ delay: Double, from: Double = 0, _ steps: [KReelStep]) -> Double {
    if still { return steps.last?.to ?? from }
    var at = delay
    var value = from
    for s in steps {
      at += s.hold
      if t <= at { return value }
      if t < at + s.ms {
        let p = s.ease((t - at) / max(1, s.ms))
        return value + (s.to - value) * p
      }
      value = s.to
      at += s.ms
    }
    return value
  }

  /// a JS timer (setTimeout): true once `ms` have passed; not Reanimated's, so real time even when still
  func after(_ ms: Double) -> Bool { t >= ms }

  /// how many of `marks` have passed (courier useBeats)
  func beats(_ marks: [Double]) -> Int { marks.filter { t >= $0 }.count }

  /// a press: 0 → 1 over `down`, → 0 over `up`, at `at` (the kit's Finger and the keys under it)
  func press(_ at: Double, down: Double = 120, up: Double = 220) -> Double {
    seq(at, [KReelStep(to: 1, ms: down), KReelStep(to: 0, ms: up)])
  }
}

// MARK: - Colours

/// "#RGB", "#RRGGBB", "#RRGGBBAA" or "rgba(r,g,b,a)" → the colour in sRGB (magenta for garbage).
func kReelColor(_ raw: String) -> Color {
  let s = raw.trimmingCharacters(in: .whitespaces)
  if s.hasPrefix("rgba(") || s.hasPrefix("rgb(") {
    let inner = s.drop { $0 != "(" }.dropFirst().prefix { $0 != ")" }
    let parts = inner.split(separator: ",").map { Double($0.trimmingCharacters(in: .whitespaces)) ?? 0 }
    if parts.count >= 3 {
      return Color(.sRGB, red: parts[0] / 255, green: parts[1] / 255, blue: parts[2] / 255, opacity: parts.count > 3 ? parts[3] : 1)
    }
  }
  var d = s.hasPrefix("#") ? String(s.dropFirst()) : s
  if d.count == 3 { d = d.map { "\($0)\($0)" }.joined() }
  guard d.count == 6 || d.count == 8, let v = UInt64(d, radix: 16) else {
    return Color(.sRGB, red: 1, green: 0, blue: 1, opacity: 1)
  }
  let has = d.count == 8
  let r = Double((v >> (has ? 24 : 16)) & 0xFF) / 255
  let g = Double((v >> (has ? 16 : 8)) & 0xFF) / 255
  let b = Double((v >> (has ? 8 : 0)) & 0xFF) / 255
  let a = has ? Double(v & 0xFF) / 255 : 1
  return Color(.sRGB, red: r, green: g, blue: b, opacity: a)
}

/// The reel's fixed inks: theme/post P and the light themes' 10a tokens, as React Native fixes them.
enum KReelInk {
  static let paper = Color.white
  static let ink = kReelColor("#111113")
  static let ink60 = kReelColor("rgba(17,17,19,0.6)")
  static let ink40 = kReelColor("rgba(17,17,19,0.4)")
  static let ink12 = kReelColor("rgba(17,17,19,0.12)")
  static let pen = kReelColor("#3A3AF5")
  static let penWash = kReelColor("#ECECFE")
  static let post = kReelColor("#E0483C")
  static let brassSeal = kReelColor("#9A7433")
  /// FACE_INK, the light themes' ink (#1E1B35)
  static let navy = kReelColor("#1E1B35")
  static let sub = kReelColor("#55506E")
  static let mute = kReelColor("#8A86A3")
  static let soft = kReelColor("#F6F5F9")
  static let lav = kReelColor("#E4E2F4")
  static let ind = kReelColor("#3A34D6")
  /// PostTabBar's resting icon ink
  static let tabInk = kReelColor("#5B5776")
  /// the stamp tray's ground (ComposeTray)
  static let tray = kReelColor("#F3F2FA")

  /// a colour between two, as interpolateColor does it (in sRGB)
  static func mix(_ a: Color, _ b: Color, _ t: Double) -> Color {
    let x = UIColor(a), y = UIColor(b)
    var ar: CGFloat = 0, ag: CGFloat = 0, ab: CGFloat = 0, aa: CGFloat = 0
    var br: CGFloat = 0, bg: CGFloat = 0, bb: CGFloat = 0, ba: CGFloat = 0
    x.getRed(&ar, green: &ag, blue: &ab, alpha: &aa)
    y.getRed(&br, green: &bg, blue: &bb, alpha: &ba)
    let k = CGFloat(KReelClock.clamp01(t))
    return Color(.sRGB, red: Double(ar + (br - ar) * k), green: Double(ag + (bg - ag) * k), blue: Double(ab + (bb - ab) * k), opacity: Double(aa + (ba - aa) * k))
  }
}

// MARK: - Type

/// The reel's type, at fixed sizes (see TYPE above).
enum KReelFont {
  static func sys(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font { .system(size: max(1, size), weight: weight) }
  static func mono(_ size: CGFloat, _ weight: Font.Weight = .semibold) -> Font { .system(size: max(1, size), weight: weight, design: .monospaced) }
  static func letter(_ size: CGFloat, _ face: KLetterFace, weight: Font.Weight? = nil) -> Font {
    let f = KType.letter(max(1, size), face: face)
    return weight.map { f.weight($0) } ?? f
  }
}

extension View {
  /// React Native's lineHeight on a line of `size`: the extra over the natural line, between lines
  func kReelLine(_ size: CGFloat, _ lineHeight: CGFloat) -> some View {
    lineSpacing(max(0, lineHeight - size * 1.19))
  }

  /// numberOfLines + adjustsFontSizeToFit + minimumFontScale
  func kReelFit(_ lines: Int = 1, min scale: CGFloat = 0.6) -> some View {
    lineLimit(lines).minimumScaleFactor(scale)
  }

  /// position: absolute at (x, y), its frame w × h (the box the transform turns about)
  func kReelBox(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, align: Alignment = .topLeading) -> some View {
    frame(width: max(0, w), height: max(0, h), alignment: align).offset(x: x, y: y)
  }
}

// MARK: - Paths

/// An SVG path drawn from its own viewBox into whatever rect it is given (KSVGPath reads it once).
struct KReelPath: Shape {
  let d: String
  let box: CGRect

  init(_ d: String, box: CGRect = CGRect(x: 0, y: 0, width: 24, height: 24)) {
    self.d = d
    self.box = box
  }

  func path(in rect: CGRect) -> Path {
    let p = KReelPaths.parsed(d)
    let sx = rect.width / max(0.0001, box.width)
    let sy = rect.height / max(0.0001, box.height)
    let t = CGAffineTransform(translationX: rect.minX, y: rect.minY).scaledBy(x: sx, y: sy).translatedBy(x: -box.minX, y: -box.minY)
    return p.applying(t)
  }
}

/// parsed paths, once a string (main thread only, as every SwiftUI body is)
enum KReelPaths {
  private static var cache: [String: Path] = [:]

  static func parsed(_ d: String) -> Path {
    if let p = cache[d] { return p }
    let p = KSVGPath.path(d)
    if cache.count > 400 { cache.removeAll() }
    cache[d] = p
    return p
  }
}

// MARK: - The kit's parts

/// The Finger SVG (kit.tsx), viewBox 40 × 50
let kReelFingerD = "M13 4c2.2 0 4 1.8 4 4v13l2-.4c1.6-.3 3.1.7 3.5 2.3l.1.4 1.6-.3c1.7-.3 3.3.8 3.6 2.5l1.7-.2c1.8-.2 3.4 1.1 3.6 2.9L35 38c.8 6.6-4.4 11-11 11h-3.4c-3.4 0-6.6-1.6-8.6-4.4L5 35.4c-1-1.4-.7-3.4.7-4.4 1.3-.9 3.1-.8 4.2.4L9 30V8c0-2.2 1.8-4 4-4Z"

/* A FINGER THAT TAPS — slides in to (x, y), presses (it and the ring under it shrink), lifts.
   `at` is when the press lands, in ms. kit.tsx Finger, point for point. */
struct KReelFinger: View {
  let c: KReelClock
  let x: CGFloat
  let y: CGFloat
  var at: Double = 700
  var size: CGFloat = 46

  var body: some View {
    let come = c.once(520, max(0, at - 560))
    let press = c.press(at, down: 120, up: 220)
    let ox = x - size * 0.3
    let oy = y - size * 0.12
    ZStack(alignment: .topLeading) {
      Circle()
        .fill(Color.white)
        .frame(width: 36, height: 36)
        .scaleEffect(0.6 + 0.8 * press)
        .opacity(press * 0.5)
        .offset(x: size * 0.3 - 18, y: size * 0.12 - 18)
      ZStack {
        KReelPath(kReelFingerD, box: CGRect(x: 0, y: 0, width: 40, height: 50)).fill(kReelColor("#F1C9A5"))
        KReelPath(kReelFingerD, box: CGRect(x: 0, y: 0, width: 40, height: 50))
          .stroke(KReelInk.navy, style: StrokeStyle(lineWidth: 1.6 * size / 40, lineJoin: .round))
      }
      .frame(width: size, height: size * 1.25)
      .scaleEffect(1 - 0.12 * press)
      .offset(x: (1 - come) * 60, y: (1 - come) * 80)
      .opacity(come)
    }
    .offset(x: ox, y: oy)
    .allowsHitTesting(false)
  }
}

/* BIG TYPE — a few words, very large, arriving one after another; the accent word in the pen.
   kit.tsx BigType: 0.11·s on a 0.13·s line, bold, −0.5 tracking, each word fading in over 380 ms
   from 120 + 170·i. `scale` sets it a size down (stamps' and kindreds' fitted titles). */
struct KReelBigType: View {
  let c: KReelClock
  let s: CGFloat
  let words: [String]
  var accent: Set<Int> = []
  var color: Color = KReelInk.ink
  var accentColor: Color = KReelInk.pen
  /// the size, as a fraction of 0.11·s (1 = BigType's)
  var fit: CGFloat = 1
  /// the line, as a multiple of the size (BigType: .13 / .11)
  var line: CGFloat = 0.13 / 0.11

  var body: some View {
    let size = s * 0.11 * fit
    var text = Text(verbatim: "")
    for (i, w) in words.enumerated() {
      let v = c.once(380, 120 + Double(i) * 170)
      let ink = accent.contains(i) ? accentColor : color
      text = text + Text(verbatim: w + (i < words.count - 1 ? " " : "")).foregroundColor(ink.opacity(v))
    }
    return text
      .font(KReelFont.sys(size, .bold))
      .tracking(-0.5)
      .kReelLine(size, size * line)
      .fixedSize(horizontal: false, vertical: true)
      .frame(width: s - 2 * s * 0.09, alignment: .leading)
      .frame(width: s, height: s)
  }

  /// a title split as the React Native scenes split it: on spaces, or whole when it has none
  static func words(_ title: String) -> [String] {
    title.contains(" ") ? title.split(separator: " ", omittingEmptySubsequences: false).map(String.init) : [title]
  }
}

/// Rise: fade + rise in, after `delay` (460 ms, out cubic), `dy` below
struct KReelRise: ViewModifier {
  let c: KReelClock
  var delay: Double = 0
  var dy: CGFloat = 14
  var ms: Double = 460
  var ease: KReelEase.Curve = KReelEase.outCubic

  func body(content: Content) -> some View {
    let v = c.once(ms, delay, ease)
    return content.offset(y: (1 - v) * dy).opacity(v)
  }
}

/// Pop: in from small (420 ms, out back 1.8), opacity at 1.4×
struct KReelPop: ViewModifier {
  let c: KReelClock
  var delay: Double = 0
  var from: CGFloat = 0.4
  var ms: Double = 420
  var ease: KReelEase.Curve = KReelEase.outBack(1.8)
  var fade: Double = 1.4

  func body(content: Content) -> some View {
    let v = c.once(ms, delay, ease)
    return content.scaleEffect(from + (1 - from) * v).opacity(min(1, v * fade))
  }
}

extension View {
  func kReelRise(_ c: KReelClock, _ delay: Double = 0, dy: CGFloat = 14) -> some View {
    modifier(KReelRise(c: c, delay: delay, dy: dy))
  }

  func kReelPop(_ c: KReelClock, _ delay: Double = 0, from: CGFloat = 0.4, ease: @escaping KReelEase.Curve = KReelEase.outBack(1.8)) -> some View {
    modifier(KReelPop(c: c, delay: delay, from: from, ease: ease))
  }
}

/// A SMALL PHONE — a white screen with rounded corners and a 2pt navy rule (kit MiniScreen)
struct KReelMiniScreen<Content: View>: View {
  let w: CGFloat
  let h: CGFloat
  var bg: Color = .white
  @ViewBuilder let content: () -> Content

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: w * 0.09, style: .circular)
    ZStack(alignment: .topLeading) {
      bg
      // React Native lays absolute children inside the 2pt rule
      ZStack(alignment: .topLeading) { content() }
        .frame(width: max(0, w - 4), height: max(0, h - 4), alignment: .topLeading)
        .offset(x: 2, y: 2)
    }
    .frame(width: w, height: h, alignment: .topLeading)
    .clipShape(shape)
    .overlay(shape.strokeBorder(KReelInk.navy, lineWidth: 2))
  }
}

/// Her snapshot (lib/bird-images reel-*), always with an explicit frame; nothing until captured.
struct KReelBird: View {
  let ref: KImageRef?
  let size: CGFloat

  var body: some View {
    Group {
      if let ref {
        KImage(ref, size: CGSize(width: size, height: size), contentMode: .fit, placeholder: .clear)
      } else {
        Color.clear
      }
    }
    .frame(width: size, height: size)
    .accessibilityHidden(true)
  }
}

// MARK: - The product's own objects, as the reels draw them

/// WREN_PATHS (components/Wren): the seal's emboss, in a 40-ish unit box
enum KReelWrenPaths {
  static let body = "M30 14C27.2 10.2 21.4 9.3 17 12C12.4 14.8 9.5 19 9.8 23.5C10.1 27.8 14 30.8 18.5 30.8C23.5 30.8 28 27.5 30 23C31 20.5 31 16.2 30 14Z"
  static let tail = "M12.5 28L6.5 15.5L11 13.8L16 25Z"
  static let beak = "M29.6 14.4L36.6 16.8L29.8 18.6Z"
  static let all = [tail, body, beak]
}

/// the static C palette's seal colours (theme/tokens): an object with its own colours
enum KReelSealInk {
  static let face = Color.white
  static let ring = kReelColor("#E4E4E0")
  static let inner = kReelColor("#E9E9FA")
  static let tint = kReelColor("#E9E9FA")
  static let shade = kReelColor("#2A2AB0")
  static let purple = kReelColor("#3A3AF5")
}

/* WREN'S SEAL — components/Seal: a blind emboss, size × (size + 3). Below 56 it is the small seal
   (the tinted face, no shade, no inner ring). */
struct KReelSeal: View {
  let size: CGFloat

  var body: some View {
    let r = size / 2
    let small = size < 56
    let bs = size / 62
    Canvas { gc, _ in
      let disc = CGRect(x: 1, y: 1, width: size - 2, height: size - 2)
      if !small {
        gc.fill(Path(ellipseIn: disc.offsetBy(dx: 0, dy: 1.6)), with: .color(KReelSealInk.shade.opacity(0.09)))
      }
      gc.fill(Path(ellipseIn: disc), with: .color(small ? KReelSealInk.tint : KReelSealInk.face))
      gc.stroke(Path(ellipseIn: disc), with: .color(small ? kReelColor("#D8D0F0") : KReelSealInk.ring), lineWidth: max(0.8, size * 0.016))
      if !small {
        let ri = (r - 1) * 0.86
        gc.stroke(Path(ellipseIn: CGRect(x: r - ri, y: r - ri, width: 2 * ri, height: 2 * ri)), with: .color(KReelSealInk.inner), lineWidth: max(0.6, size * 0.011))
      }
      let t = CGAffineTransform(translationX: r - 20 * bs, y: r - 21 * bs).scaledBy(x: bs, y: bs)
      for d in KReelWrenPaths.all {
        gc.fill(KReelPaths.parsed(d).applying(t), with: .color(KReelSealInk.purple))
      }
    }
    .frame(width: size, height: size + 3)
    .accessibilityHidden(true)
  }
}

/* THE HERO ENVELOPE — components/EnvelopeArt, viewBox 212 × 152, w × 0.72w; `sealed` draws the
   embossed seal on the flap. */
struct KReelEnvelope: View {
  let w: CGFloat
  var sealed: Bool = true

  var body: some View {
    Canvas { gc, size in
      let k = size.width / 212
      gc.scaleBy(x: k, y: size.height / 152)
      gc.fill(Path(roundedRect: CGRect(x: 8, y: 12, width: 196, height: 132), cornerRadius: 5), with: .color(kReelColor("rgba(90,66,40,0.15)")))
      gc.fill(Path(roundedRect: CGRect(x: 4, y: 6, width: 196, height: 132), cornerRadius: 5), with: .color(kReelColor("#FBF7EF")))
      let edge = kReelColor("#E8DFCD")
      var v = Path()
      v.move(to: CGPoint(x: 4, y: 10))
      v.addLine(to: CGPoint(x: 102, y: 84))
      v.addLine(to: CGPoint(x: 200, y: 10))
      gc.stroke(v, with: .color(edge), lineWidth: 1.2)
      var flap = Path()
      flap.move(to: CGPoint(x: 4, y: 6))
      flap.addLine(to: CGPoint(x: 200, y: 6))
      flap.addLine(to: CGPoint(x: 102, y: 82))
      flap.closeSubpath()
      gc.fill(flap, with: .color(kReelColor("#FDFAF4")))
      gc.stroke(flap, with: .color(edge), lineWidth: 1.2)
      if sealed {
        let disc = CGRect(x: 81, y: 53, width: 42, height: 42)
        gc.fill(Path(ellipseIn: disc.offsetBy(dx: 0, dy: 1.5)), with: .color(KReelSealInk.shade.opacity(0.09)))
        gc.fill(Path(ellipseIn: disc), with: .color(KReelSealInk.face))
        gc.stroke(Path(ellipseIn: disc), with: .color(KReelSealInk.ring), lineWidth: 1.3)
        gc.stroke(Path(ellipseIn: CGRect(x: 84, y: 56, width: 36, height: 36)), with: .color(KReelSealInk.inner), lineWidth: 1)
        let t = CGAffineTransform(translationX: 88.5, y: 59.5).scaledBy(x: 0.68, y: 0.68)
        for d in KReelWrenPaths.all {
          gc.fill(KReelPaths.parsed(d).applying(t), with: .color(KReelSealInk.purple))
        }
      }
    }
    .frame(width: w, height: w * 0.72)
    .accessibilityHidden(true)
  }
}

/// PostTabBar's four icons (the light bar's: what the reels draw them with)
enum KReelTab {
  case envelope, notes, kindreds, me

  /// [outline (filled with the wash when active), the rest]
  var paths: (fill: [String], line: [String]) {
    switch self {
    case .envelope:
      return (["M3 7.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"], ["M3.5 8l8.5 5.5L20.5 8"])
    case .notes:
      return (["M5.5 4.5h10L20 9v10.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5V6a1.5 1.5 0 0 1 1.5-1.5z"], ["M15.5 4.5V9H20", "M8 12.5h8M8 16h5"])
    case .kindreds:
      return (["M3 6.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H8l-3.5 3v-3H5a2 2 0 0 1-2-2z"], ["M18.5 9.5h.5a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2h-.5v3l-3.4-3H12"])
    case .me:
      return (["M15.8 8.5a3.8 3.8 0 1 1-7.6 0a3.8 3.8 0 1 1 7.6 0z", "M4.5 20.5c0-4.3 3.3-6.7 7.5-6.7s7.5 2.4 7.5 6.7"], [])
    }
  }
}

/// one tab icon, 24-unit art at `size`; stroke 2.2 active, 1.8 resting (PostTabBar strokeFor)
struct KReelTabIcon: View {
  let tab: KReelTab
  let color: Color
  var active: Bool = false
  let size: CGFloat
  /// the selected icon's fill: the light bar's lav wash
  var wash: Color = kReelColor("#E4E2F4")

  var body: some View {
    let p = tab.paths
    let style = StrokeStyle(lineWidth: (active ? 2.2 : 1.8) * size / 24, lineCap: .round, lineJoin: .round)
    ZStack {
      ForEach(Array(p.fill.enumerated()), id: \.offset) { _, d in
        if active { KReelPath(d).fill(wash) }
        KReelPath(d).stroke(color, style: style)
      }
      ForEach(Array(p.line.enumerated()), id: \.offset) { _, d in
        KReelPath(d).stroke(color, style: style)
      }
    }
    .frame(width: size, height: size)
  }
}

/// the + (Path "M12 5v14M5 12h14", round caps), white on its disc
struct KReelPlus: View {
  let size: CGFloat
  var width: CGFloat = 2.6
  var color: Color = .white

  var body: some View {
    KReelPath("M12 5v14M5 12h14").stroke(color, style: StrokeStyle(lineWidth: width * size / 24, lineCap: .round))
      .frame(width: size, height: size)
  }
}
