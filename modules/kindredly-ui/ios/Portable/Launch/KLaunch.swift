// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE LAUNCH IN SWIFTUI (batch 3, 2026-11-09; the "launch" switch, off by default). A port of
 src/components/LaunchAnimation.tsx — the egg hatching into the mark on every cold start — and of
 its held last frame, LaunchFrame, as ONE view: KLaunch plays `full`, `short` or `still`, and
 `frame` is the finished frame at rest (what LaunchFrame draws while a route decides).

 What it draws is the React Native piece's, number for number:
 - the mark on its 1024 grid (logos/c-mark.svg): the two commas (KObMarkPaths, the paths the
   Swift onboarding's doorstep already draws the launch's last frame with), their heads growing
   out of the stroke ends with a 4% overshoot, and the dot settling from gold to ink;
 - the two pieces of shell that close it into an egg, each with its zig-zag crack cut in the
   ground's colour, drawn in over 0.8–0.98 s, then flying off (0.98–1.4 s) about their own pivots;
 - the whole egg rocking twice on its base (0.3–0.95 s) — no jitter — after rising in at 0.82;
 - "kindredly" (system 800, 40/46, −1.4, never scaled: it is the logo) and, under it, the tag
   and its mono line, each sliding up a few points as it fades in.
 Every layer is derived from one clock, as the React Native one is (reanimated, one shared value),
 counted from `startAt` (TS's Date.now() when it mounted the view). `short` plays the second half
 from 0.98 s; `still` (Reduce Motion) is the finished frame fading in over 220 ms. The geometry is
 KObLaunchGeometry (launchGeometry): the hand-off into the Swift onboarding starts from exactly
 these pixels.

 What stays in TS: which way it plays (first launch after an update or not, Reduce Motion), the
 inks (day: white on Post Blue; night: Midnight's tokens), the words, the light haptic as the
 shell breaks, when it may leave (the clock's end, a tap past 1.35 s) and the routing after it.
 Swift only draws and reports a tap. Nothing here waits on anything: TS picks this view only from
 answers already on the phone.

 Deliberately different: nothing. The status bar's light style is set by TS (expo-status-bar).
 */

/// How the launch plays (LaunchAnimation LaunchMode), plus the still last frame (LaunchFrame).
public enum KLaunchMode: String, Sendable {
  /// the hatch: first launch, and the first launch after an update (2.0 s)
  case full
  /// the hatch's second half, from the shell breaking (≈1 s): every other open
  case short
  /// Reduce Motion: the finished frame, fading in
  case still
  /// LaunchFrame: the finished frame at rest, no fade, no tap
  case frame
}

/// The launch's colours (LaunchAnimation launchInks): white on Post Blue by day, Midnight's at night.
public struct KLaunchInks: Sendable {
  public var bg: Color
  public var ink: Color
  public var word: Color
  public var mute: Color

  public init(bg: Color, ink: Color, word: Color, mute: Color) {
    self.bg = bg
    self.ink = ink
    self.word = word
    self.mute = mute
  }

  /// the day set: the app icon's blue with the mark, the word and the line in white
  public static let day = KLaunchInks(bg: KOb.blue, ink: .white, word: .white, mute: .white)
}

/// What the launch draws: the hatching mark (to 1.0.8), or Wren peeking out of a letter (the
/// cobalt icon's launch, 2026-11-13; TS asks for it on a binary that has it).
public enum KLaunchArt: String, Sendable {
  case mark
  case envelope
}

public struct KLaunchContent {
  public var mode: KLaunchMode
  public var art: KLaunchArt = .mark
  /// when the clock started (TS's Date.now() as it mounted the view)
  public var startAt: Date
  public var inks: KLaunchInks
  /// launch.tag and launch.sub, resolved
  public var tag: String
  public var sub: String
  /// LaunchFrame's `word` and `tag` (always both while it plays)
  public var showWord: Bool
  public var showTag: Bool

  public init(mode: KLaunchMode, startAt: Date, inks: KLaunchInks, tag: String, sub: String, showWord: Bool = true, showTag: Bool = true) {
    self.mode = mode
    self.startAt = startAt
    self.inks = inks
    self.tag = tag
    self.sub = sub
    self.showWord = showWord
    self.showTag = showTag
  }
}

/// The piece's clock and its curves (LaunchAnimation's END, SKIP_FROM, SHORT_FROM, seg, eo, backOut).
enum KLaunchClock {
  static let end = 2.0
  static let skipFrom = 1.35
  static let shortFrom = 0.98
  /// still: the whole finished frame fades in (withTiming 220 ms, out cubic)
  static let veil = 0.22

  /// how long the clock runs in `mode`, seconds, from startAt
  static func runs(_ mode: KLaunchMode) -> Double {
    switch mode {
    case .full: return end
    case .short: return end - shortFrom
    case .still: return veil
    case .frame: return 0
    }
  }

  static func seg(_ t: Double, _ a: Double, _ b: Double) -> Double {
    min(1, max(0, (t - a) / (b - a)))
  }

  static func eo(_ x: Double) -> Double {
    1 - pow(1 - x, 3)
  }

  /// a small overshoot, ~4% — enough to land, not enough to bounce
  static func backOut(_ x: Double) -> Double {
    let c = 1.0
    return 1 + (c + 1) * pow(x - 1, 3) + c * pow(x - 1, 2)
  }
}

/// Every layer's value at one moment of the clock (LaunchAnimation's animated styles and props).
struct KLaunchPose {
  var whole: Double = 1
  var scale: Double = 1
  /// the rock, degrees
  var rock: Double = 0
  /// the shell is drawn (full and short only)
  var shells = false
  /// the pieces' flight, 0…1
  var frag: Double = 1
  /// the cracks: shown, and how much of them is drawn in
  var crackShown = true
  var crack: Double = 1
  /// the heads' radius and the dot's, on the 1024 grid
  var head: Double = 96
  var dot: Double = 44
  var gold: Double = 0
  var inkDot: Double = 1
  var word: Double = 1
  var tag: Double = 1

  static let stroke: CGFloat = 84
  static let headR = 96.0
  static let cap = 42.0 // a head starts as the stroke's own round end

  static func at(_ mode: KLaunchMode, elapsed raw: Double) -> KLaunchPose {
    typealias C = KLaunchClock
    let elapsed = max(0, raw)
    var p = KLaunchPose()
    let tt: Double
    var veil = 1.0
    switch mode {
    case .full: tt = min(C.end, elapsed)
    case .short: tt = C.shortFrom + min(C.end - C.shortFrom, elapsed)
    case .still:
      tt = C.end
      veil = C.eo(min(1, elapsed / C.veil))
    case .frame: tt = C.end
    }

    switch mode {
    case .still, .frame:
      p.whole = veil
      p.scale = 1
      p.rock = 0
    case .short:
      // the cracked egg comes up out of the splash in a blink, then breaks
      let e = C.eo(C.seg(tt, C.shortFrom, C.shortFrom + 0.14))
      p.whole = e
      p.scale = 0.97 + 0.03 * e
    case .full:
      let e = C.eo(C.seg(tt, 0, 0.3))
      let u = C.seg(tt, 0.3, 0.95)
      // two swings on the egg's base, gathering and settling — no jitter
      p.rock = tt > 0.3 && tt < 0.95 ? 6 * sin(u * .pi * 4) * sin(u * .pi) : 0
      p.whole = e
      p.scale = 0.82 + 0.18 * e
    }

    p.shells = mode == .full || mode == .short
    p.frag = C.eo(C.seg(tt, 0.98, 1.4))
    p.crack = C.seg(tt, 0.8, 0.98)
    p.crackShown = tt >= 0.8
    p.head = cap + (headR - cap) * C.backOut(C.seg(tt, 1.0, 1.32))
    p.dot = 44 * (1 + 0.1 * sin(.pi * C.seg(tt, 0.3, 0.95)) + 0.18 * sin(.pi * C.seg(tt, 1.22, 1.55)))
    p.gold = 1 - C.seg(tt, 1.3, 1.55)
    p.inkDot = C.seg(tt, 1.3, 1.55)
    let still = mode == .still || mode == .frame
    p.word = still ? veil : C.eo(C.seg(tt, 1.35, 1.8))
    p.tag = still ? veil : C.eo(C.seg(tt, 1.5, 1.95))
    return p
  }
}

/// The shell's two pieces and their cracks (LaunchAnimation FRAG_T / FRAG_B, CRACK_T / CRACK_B).
enum KLaunchShellPaths {
  static let fragTop = KSVGPath.path("M451.5 209.5 Q540 186 629.4 237.5")
  static let fragBottom = KSVGPath.path("M572.5 791.7 Q480 815 394.6 767.2")
  static let crackTop = KSVGPath.path("M470 214 L500 250 L528 208 L560 246 L590 222")
  static let crackBottom = KSVGPath.path("M552 790 L522 752 L494 796 L462 758 L430 778")
  static let crackLen: CGFloat = 200
}

/// The launch (see the note at the top). `onTap` is told of every tap while it plays; TS decides
/// whether it skips (the full hatch, past 1.35 s).
public struct KLaunch: View {
  let content: KLaunchContent
  let onTap: () -> Void

  /// the clock has run out: the last frame is drawn without a timeline
  @State private var resting = false

  public init(content: KLaunchContent, onTap: @escaping () -> Void = {}) {
    self.content = content
    self.onTap = onTap
  }

  public var body: some View {
    GeometryReader { geo in
      let G = KObLaunchGeometry(sw: geo.size.width, sh: geo.size.height)
      let E = KLaunchEnvelopeGeometry(sw: geo.size.width, sh: geo.size.height)
      ZStack(alignment: .topLeading) {
        content.inks.bg
        if content.art == .envelope {
          if content.mode == .frame || resting {
            envelopeScene(KLaunchEnvelopePose.at(content.mode, elapsed: .infinity), E)
          } else {
            TimelineView(.animation) { tl in
              envelopeScene(KLaunchEnvelopePose.at(content.mode, elapsed: tl.date.timeIntervalSince(content.startAt)), E)
            }
          }
        } else if content.mode == .frame || resting {
          scene(KLaunchPose.at(content.mode, elapsed: .infinity), G)
        } else {
          TimelineView(.animation) { tl in
            scene(KLaunchPose.at(content.mode, elapsed: tl.date.timeIntervalSince(content.startAt)), G)
          }
        }
      }
      .frame(width: geo.size.width, height: geo.size.height, alignment: .topLeading)
    }
    .ignoresSafeArea()
    .modifier(KLaunchTouch(playing: content.mode != .frame, onTap: onTap))
    .task(id: content.startAt) {
      resting = false
      guard content.mode != .frame else { return }
      let runs = content.art == .envelope ? KLaunchEnvelopeClock.runs(content.mode) : KLaunchClock.runs(content.mode)
      let left = runs - Date().timeIntervalSince(content.startAt)
      if left > 0 {
        try? await Task.sleep(for: .seconds(left + 0.05))
      }
      if !Task.isCancelled { resting = true }
    }
  }

  /// Wren peeking out of the letter, the word and the tag (see "The envelope" below)
  private func envelopeScene(_ p: KLaunchEnvelopePose, _ E: KLaunchEnvelopeGeometry) -> some View {
    ZStack(alignment: .topLeading) {
      KLaunchEnvelopeArt(pose: p)
        .scaleEffect(p.scale, anchor: UnitPoint(x: KLaunchEnvelopeArt.artCentre.x / KLaunchEnvelopeArt.box.width, y: (KLaunchEnvelopeArt.pad.y + 80) / KLaunchEnvelopeArt.box.height))
        .opacity(p.whole)
        .offset(x: E.envelope.minX - KLaunchEnvelopeArt.pad.x, y: E.envelope.minY - KLaunchEnvelopeArt.pad.y + p.drop)
      if content.showWord {
        KLaunchWordmark(color: content.inks.word)
          .frame(maxWidth: .infinity)
          .opacity(p.word)
          .offset(y: E.wordTop + 10 * (1 - p.word))
      }
      if content.showTag {
        KLaunchTagLines(tag: content.tag, sub: content.sub, mute: content.inks.mute, ink: content.inks.ink)
          .padding(.horizontal, 24)
          .frame(maxWidth: .infinity)
          .opacity(p.tag)
          .offset(y: E.tagTop + 8 * (1 - p.tag))
      }
    }
    .allowsHitTesting(false)
  }

  private func scene(_ p: KLaunchPose, _ G: KObLaunchGeometry) -> some View {
    let M = G.mark.width
    let k = M / 1024
    let pivot = UnitPoint(x: 0.5, y: 0.796)
    return ZStack(alignment: .topLeading) {
      // the two commas and the dot — what the egg becomes — and, over them, the shell
      ZStack(alignment: .topLeading) {
        KLaunchMarkLayer(pose: p, ink: content.inks.ink)
          .frame(width: M, height: M)
        if p.shells {
          KLaunchShellLayer(frag: KLaunchShellPaths.fragTop, crack: KLaunchShellPaths.crackTop, pose: p, inks: content.inks)
            .frame(width: M, height: M)
            .rotationEffect(.degrees(40 * p.frag), anchor: UnitPoint(x: 0.527, y: 0.205))
            .offset(x: 140 * k * p.frag, y: -190 * k * p.frag)
            .opacity(1 - p.frag)
          KLaunchShellLayer(frag: KLaunchShellPaths.fragBottom, crack: KLaunchShellPaths.crackBottom, pose: p, inks: content.inks)
            .frame(width: M, height: M)
            .rotationEffect(.degrees(40 * p.frag), anchor: UnitPoint(x: 0.469, y: 0.781))
            .offset(x: -140 * k * p.frag, y: 190 * k * p.frag)
            .opacity(1 - p.frag)
        }
      }
      .frame(width: M, height: M, alignment: .topLeading)
      .scaleEffect(p.scale, anchor: pivot)
      .rotationEffect(.degrees(p.rock), anchor: pivot)
      // one layer fades, as the React Native view does (overlaps don't show through)
      .compositingGroup()
      .opacity(p.whole)
      .offset(x: G.mark.minX, y: G.mark.minY)

      if content.showWord {
        KLaunchWordmark(color: content.inks.word)
          .frame(maxWidth: .infinity)
          .opacity(p.word)
          .offset(y: G.wordTop + 8 * (1 - p.word))
      }
      if content.showTag {
        KLaunchTagLines(tag: content.tag, sub: content.sub, mute: content.inks.mute, ink: content.inks.ink)
          .padding(.horizontal, 24)
          .frame(maxWidth: .infinity)
          .opacity(p.tag)
          .offset(y: G.tagTop + 6 * (1 - p.tag))
      }
    }
    .allowsHitTesting(false)
  }
}

/// The tap while it plays (the React Native Pressable: an image called "Kindredly" that skips);
/// the still frame takes no touch and says nothing (LaunchFrame is pointerEvents none).
private struct KLaunchTouch: ViewModifier {
  let playing: Bool
  let onTap: () -> Void

  func body(content: Content) -> some View {
    if playing {
      content
        .contentShape(Rectangle())
        .onTapGesture(perform: onTap)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(verbatim: "Kindredly"))
        .accessibilityAddTraits(.isImage)
        .accessibilityAction { onTap() }
    } else {
      content.accessibilityHidden(true)
    }
  }
}

/// The mark's commas, heads and dot at one pose, in the ink.
private struct KLaunchMarkLayer: View {
  let pose: KLaunchPose
  let ink: Color

  var body: some View {
    Canvas { gc, canvas in
      var g = gc
      let k = canvas.width / 1024
      g.scaleBy(x: k, y: k)
      let stroke = StrokeStyle(lineWidth: KLaunchPose.stroke, lineCap: .round)
      g.stroke(KObMarkPaths.arcL, with: .color(ink), style: stroke)
      g.stroke(KObMarkPaths.arcR, with: .color(ink), style: stroke)
      g.fill(Self.circle(394.6, 767.2, pose.head), with: .color(ink))
      g.fill(Self.circle(629.4, 237.5, pose.head), with: .color(ink))
      // the dot: gold, settling to ink over it
      if pose.gold > 0 {
        g.fill(Self.circle(512, 520, pose.dot), with: .color(KOb.gold.opacity(pose.gold)))
      }
      if pose.inkDot > 0 {
        g.fill(Self.circle(512, 520, pose.dot), with: .color(ink.opacity(pose.inkDot)))
      }
    }
    .accessibilityHidden(true)
  }

  static func circle(_ x: Double, _ y: Double, _ r: Double) -> Path {
    Path(ellipseIn: CGRect(x: x - r, y: y - r, width: 2 * r, height: 2 * r))
  }
}

/// One piece of shell, with its crack drawn in (stroke-dashoffset) in the ground's colour.
private struct KLaunchShellLayer: View {
  let frag: Path
  let crack: Path
  let pose: KLaunchPose
  let inks: KLaunchInks

  var body: some View {
    Canvas { gc, canvas in
      var g = gc
      let k = canvas.width / 1024
      g.scaleBy(x: k, y: k)
      g.stroke(frag, with: .color(inks.ink), style: StrokeStyle(lineWidth: KLaunchPose.stroke, lineCap: .round))
      if pose.crackShown {
        let len = KLaunchShellPaths.crackLen
        let style = StrokeStyle(lineWidth: 36, lineCap: .round, lineJoin: .round, dash: [len, len], dashPhase: len * (1 - pose.crack))
        g.stroke(crack, with: .color(inks.bg), style: style)
      }
    }
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

/// "kindredly" as the launch sets it (WORD_TYPE; KObWordmark in a colour): system 800 40/46 at
/// −1.4, never scaled — it is the logo, and the onboarding's first screen starts from its pixels.
struct KLaunchWordmark: View {
  let color: Color

  var body: some View {
    Text(verbatim: "kindredly")
      .font(.system(size: 40, weight: .heavy))
      .tracking(-1.4)
      .foregroundStyle(color)
      .frame(height: KObDoorLayout.wordLine)
      .accessibilityHidden(true)
  }
}

/// The tag (TAG_TYPE: system 500 18/24, centred, in `mute`) and its mono line under it (SUB_TYPE:
/// SF Mono 600 10.5 at 2.6, 10 below, in `ink`), both scaling with Dynamic Type as the React
/// Native lines do.
struct KLaunchTagLines: View {
  let tag: String
  let sub: String
  let mute: Color
  let ink: Color

  var body: some View {
    VStack(spacing: 0) {
      Text(tag)
        .kText(.system(18, .medium, lineHeight: 24 / 18))
        .foregroundStyle(mute)
        .multilineTextAlignment(.center)
      Text(sub)
        .kText(.mono(10.5, .semibold, tracking: 2.6 / 10.5))
        .foregroundStyle(ink)
        .multilineTextAlignment(.center)
        .padding(.top, 10)
    }
    .accessibilityHidden(true)
  }
}

// MARK: - The envelope (2026-11-13)

/*
 WREN PEEKS OUT OF THE LETTER (owner, 2026-11-13: the app icon is the cobalt Wren now, "启动动画也需要
 一个与之对应的创意启动页"; of the first prototype "挺好的", then of its white letter round a white Wren
 "太白了 … 和wren撞色" and "不要牛皮纸 不行就蓝鸟 peek 白信封"). The icon's Wren peeks up over its
 tile's edge; here she peeks out of a letter. Drawn on the icon's cobalt, number for number as the
 prototype draws it (design/launch-wren/launch-frame.js, its frames the reference):

   t   0.00  the splash's cobalt; a white letter comes down onto it, flap closed (to 0.22)
       0.22  two little hops on its foot, something inside (to 0.56)
       0.56  the flap opens up behind (to 0.82), its inside a pale blue
       0.78  Wren rises out of it with an overshoot (to 1.10), eyes shut; she squashes 5% as she
             settles (1.00–1.26) and opens her eyes at 1.02
       1.22  she looks at you (the glints move, to 1.42); a butter ✦ pops by her head (1.30–1.52,
             spinning in from −40°); one blink 1.44–1.56
       1.28  "kindredly" rises in (to 1.64); the tag and its line (1.42–1.78)
       1.85  the end: the piece rests on its last frame until the session is known
 `short` (every other open) plays from 0.56, the closed letter coming up out of the splash in a
 blink (0.14 s) as the flap starts to open; `still` is the last frame fading in. The native splash
 is the plain cobalt (no picture), so nothing has to line up with it. She is Wren as the official art
 colours her (indigo, a deeper wing, a cream belly, a pink beak) with the icon's shapes, so her blue
 stands against the letter's white; the open flap is tall enough that her whole head is against
 it, never against the cobalt.

 The letter is 244 × 160 on every phone, centred on the screen. The onboarding's doorstep starts
 from these pixels (KObLaunchGeometry; the letter flies to slide 1's stamp corner, KObDoorstep).
 */

/// The envelope's clock (seconds): the piece's end, the skip, and where `short` starts.
enum KLaunchEnvelopeClock {
  static let end = 1.85
  static let skipFrom = 1.22
  static let shortFrom = 0.56

  static func runs(_ mode: KLaunchMode) -> Double {
    switch mode {
    case .full: return end
    case .short: return end - shortFrom
    case .still: return KLaunchClock.veil
    case .frame: return 0
    }
  }

  static func eio(_ x: Double) -> Double {
    x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2
  }

  /// a spring's overshoot, settling by x = 1 (`s` sets how far past)
  static func backOut(_ x: Double, _ s: Double) -> Double {
    1 + (s + 1) * pow(x - 1, 3) + s * pow(x - 1, 2)
  }
}

/// The letter and Wren at one moment of the clock.
struct KLaunchEnvelopePose {
  var whole: Double = 1
  /// the letter coming down onto the cobalt: its height above its place, and its size
  var drop: Double = 0
  var scale: Double = 1
  /// the hops: up (points, negative) and the tilt on its foot (degrees)
  var hopY: Double = 0
  var hopR: Double = 0
  /// the flap: 0 closed (down over the front) … 1 open (up behind)
  var flap: Double = 1
  /// Wren: 0 inside … 1 out (past 1 in the overshoot)
  var rise: Double = 1
  var squash: Double = 1
  var eyesShut = false
  var look: Double = 1
  var star: Double = 1
  var starSpin: Double = 0
  var word: Double = 1
  var tag: Double = 1

  /// at rest, all of it out: the last frame (the doorstep's start, a stamp's picture)
  static let rest = KLaunchEnvelopePose()

  static func at(_ mode: KLaunchMode, elapsed raw: Double) -> KLaunchEnvelopePose {
    typealias C = KLaunchEnvelopeClock
    let seg = KLaunchClock.seg
    let eo = KLaunchClock.eo
    let elapsed = max(0, raw)
    var p = KLaunchEnvelopePose()
    let tt: Double
    var veil = 1.0
    switch mode {
    case .full: tt = min(C.end, elapsed)
    case .short: tt = C.shortFrom + min(C.end - C.shortFrom, elapsed)
    case .still:
      tt = C.end
      veil = eo(min(1, elapsed / KLaunchClock.veil))
    case .frame: tt = C.end
    }
    switch mode {
    case .full:
      // it comes down onto the splash's cobalt
      let a = eo(seg(tt, 0, 0.22))
      p.whole = a
      p.drop = -22 * (1 - a)
      p.scale = 0.94 + 0.06 * a
    case .short:
      // the closed letter comes up out of the splash in a blink
      let a = eo(seg(tt, C.shortFrom, C.shortFrom + 0.14))
      p.whole = a
      p.scale = 0.97 + 0.03 * a
    case .still, .frame:
      p.whole = veil
    }
    let hp = seg(tt, 0.22, 0.56)
    let hop = tt < 0.56 ? sin(hp * .pi * 2) * (1 - hp) : 0
    p.hopY = -abs(hop) * 10
    p.hopR = hop * 2.6
    p.flap = C.eio(seg(tt, 0.56, 0.82))
    let r = seg(tt, 0.78, 1.1)
    p.rise = r <= 0 ? 0 : C.backOut(r, 2.0)
    p.squash = 1 + sin(seg(tt, 1.0, 1.26) * .pi) * 0.05
    p.eyesShut = (tt > 0.74 && tt < 1.02) || (tt > 1.44 && tt < 1.56)
    p.look = eo(seg(tt, 1.22, 1.42))
    let s = seg(tt, 1.3, 1.52)
    p.star = s <= 0 ? 0 : C.backOut(s, 3)
    p.starSpin = (1 - eo(s)) * -40
    let still = mode == .still || mode == .frame
    p.word = still ? veil : eo(seg(tt, 1.28, 1.64))
    p.tag = still ? veil : eo(seg(tt, 1.42, 1.78))
    return p
  }
}

/// Where the launch's letter, word and tag stand on a screen `sw` × `sh`: the letter centred, at
/// its one size (the native splash's picture is centred at its own size).
struct KLaunchEnvelopeGeometry {
  static let size = CGSize(width: 244, height: 160)
  let envelope: CGRect
  let wordTop: CGFloat
  let tagTop: CGFloat

  init(sw: CGFloat, sh: CGFloat) {
    let s = Self.size
    envelope = CGRect(x: ((sw - s.width) / 2).rounded(), y: ((sh - s.height) / 2).rounded(), width: s.width, height: s.height)
    wordTop = envelope.maxY + 56
    tagTop = envelope.maxY + 116
  }
}

/// The letter with Wren in it, at a pose, drawn at `scale` of its own size. Its box reaches past
/// the letter on every side (`pad`), so the open flap, the star, the shadow and a hop are never
/// cut: place it with its letter's top-left at `pad` × scale inside.
struct KLaunchEnvelopeArt: View {
  let pose: KLaunchEnvelopePose
  var scale: CGFloat = 1
  /// the soft shadow under the letter, 0…1 (0 for a stamp's picture)
  var shadow: Double = 1

  /// the letter's top-left inside the box, and the box, in the letter's own points
  static let pad = CGPoint(x: 12, y: 126)
  static let box = CGSize(width: 268, height: 326)
  /// the middle of the picture a stamp shows (the letter with its flap open), in the box
  static let artCentre = CGPoint(x: 134, y: 150)
  /// that picture's size: the letter and its open flap
  static let artSize = CGSize(width: 244, height: 272)

  static let body = KSVGPath.path("M40.5,110C40.5,68 72,40 110.5,40C142,40 159.5,64.5 159.5,92.5C163,127.5 142,159 100,159C65,159 40.5,141.5 40.5,110Z")
  static let beak = KSVGPath.path("M127,83.5C139,84.5 150,88.5 158.5,93C160.6,94.1 160.6,96.4 158.5,97.5C150,102 139,105.5 127,106.5C123.5,99 123.5,91 127,83.5Z")
  /// Wren as the official art colours her (~/Desktop/wren-official/no-outline), the letter's whites
  /// and blues, the star's butter, the shadow's deep cobalt
  static let wrenBody = Color(hex: "#5757EC")
  static let wrenLow = Color(hex: "#4C4CDF")
  static let wing = Color(hex: "#4646DB")
  static let belly = Color(hex: "#F6E7C9")
  static let beakTop = Color(hex: "#F7AFC1")
  static let beakLow = Color(hex: "#EE8EA7")
  static let eye = Color(hex: "#1E1B33")
  static let inside = Color(hex: "#E8EDFF")
  static let line = Color(hex: "#C9D3FF")
  static let starInk = Color(hex: "#FFE08A")
  static let lift = Color(hex: "#1636B8")
  static let flapLength: CGFloat = 112

  var body: some View {
    Canvas { gc, _ in
      var g = gc
      g.scaleBy(x: scale, y: scale)
      g.translateBy(x: Self.pad.x, y: Self.pad.y)
      Self.draw(&g, pose, shadow: shadow)
    }
    .frame(width: Self.box.width * scale, height: Self.box.height * scale)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }

  /// the whole picture in the letter's own points, its top-left at the origin
  static func draw(_ g: inout GraphicsContext, _ p: KLaunchEnvelopePose, shadow: Double) {
    let W = KLaunchEnvelopeGeometry.size.width, H = KLaunchEnvelopeGeometry.size.height, cx = W / 2
    var e = g
    // the hops: up, and a tilt about the letter's foot
    e.translateBy(x: 0, y: p.hopY)
    e.translateBy(x: cx, y: H)
    e.rotate(by: .degrees(p.hopR))
    e.translateBy(x: -cx, y: -H)

    if shadow > 0 {
      e.drawLayer { l in
        l.addFilter(.blur(radius: 7))
        l.fill(Path(ellipseIn: CGRect(x: cx - W * 0.4, y: H + 6, width: W * 0.8, height: 20)), with: .color(lift.opacity(0.3 * shadow)))
      }
    }
    // the flap: its tip from down over the front (closed) to up behind (open)
    let tip = flapLength - CGFloat(p.flap) * flapLength * 2
    let bend: CGFloat = tip > 0 ? -6 : 6
    var flap = Path()
    flap.move(to: CGPoint(x: 2, y: 0))
    flap.addLine(to: CGPoint(x: W - 2, y: 0))
    flap.addQuadCurve(to: CGPoint(x: cx, y: tip), control: CGPoint(x: cx + 16, y: tip + bend))
    flap.addQuadCurve(to: CGPoint(x: 2, y: 0), control: CGPoint(x: cx - 16, y: tip + bend))
    flap.closeSubpath()
    let front = p.flap < 0.5
    let flapStroke = StrokeStyle(lineWidth: 1.3, lineJoin: .round)
    if !front {
      e.fill(flap, with: .color(inside))
      e.stroke(flap, with: .color(line), style: flapStroke)
    }
    // Wren, rising from inside the letter (its front covers what is still in)
    var w = e
    let k = 1.12
    let wrenY = 72 - p.rise * 78
    w.translateBy(x: cx - 4, y: wrenY)
    w.scaleBy(x: k / p.squash, y: k * p.squash)
    w.translateBy(x: -100, y: -100)
    w.fill(body, with: .linearGradient(Gradient(stops: [.init(color: wrenBody, location: 0), .init(color: wrenBody, location: 0.62), .init(color: wrenLow, location: 1)]), startPoint: CGPoint(x: 70.9, y: 46), endPoint: CGPoint(x: 113.4, y: 159)))
    w.fill(Path(ellipseIn: CGRect(x: 96.5 - 36, y: 133 - 24, width: 72, height: 48)), with: .color(belly))
    var wing = w
    wing.translateBy(x: 149, y: 121)
    wing.rotate(by: .degrees(-22))
    wing.fill(Path(ellipseIn: CGRect(x: -15, y: -28.5, width: 30, height: 57)), with: .color(Self.wing))
    eyeDraw(&w, at: CGPoint(x: 90, y: 76), r: 9.6, glint: CGPoint(x: 2.6 - p.look * 4.2, y: -2.8 + p.look * 0.6), gr: 2.6, shut: p.eyesShut)
    eyeDraw(&w, at: CGPoint(x: 125.5, y: 70), r: 10.4, glint: CGPoint(x: 2.8 - p.look * 4.4, y: -3 + p.look * 0.6), gr: 2.8, shut: p.eyesShut)
    w.fill(beak, with: .linearGradient(Gradient(colors: [beakTop, beakLow]), startPoint: CGPoint(x: 140, y: 83.5), endPoint: CGPoint(x: 140, y: 106.5)))
    // the letter's front, its folds, and the flap while it is still down over it
    let face = Path(roundedRect: CGRect(x: 0, y: 0, width: W, height: H), cornerRadius: 16, style: .circular)
    e.fill(face, with: .color(.white))
    var folds = Path()
    folds.move(to: CGPoint(x: 10, y: H - 8))
    folds.addLine(to: CGPoint(x: cx, y: H * 0.5))
    folds.addLine(to: CGPoint(x: W - 10, y: H - 8))
    e.stroke(folds, with: .color(line), style: StrokeStyle(lineWidth: 1.3, lineCap: .round, lineJoin: .round))
    if front {
      e.fill(flap, with: .color(.white))
      e.stroke(flap, with: .color(line), style: flapStroke)
    }
    // the star by her head
    if p.star > 0 {
      var s = e
      s.translateBy(x: cx + 78, y: -64)
      s.rotate(by: .degrees(p.starSpin))
      s.scaleBy(x: p.star, y: p.star)
      s.fill(star(r: 14), with: .color(starInk))
    }
  }

  private static func eyeDraw(_ g: inout GraphicsContext, at c: CGPoint, r: CGFloat, glint: CGPoint, gr: CGFloat, shut: Bool) {
    var e = g
    e.translateBy(x: c.x, y: c.y)
    e.scaleBy(x: 1, y: shut ? 0.12 : 1)
    e.fill(Path(ellipseIn: CGRect(x: -r, y: -r, width: 2 * r, height: 2 * r)), with: .color(eye))
    if !shut {
      e.fill(Path(ellipseIn: CGRect(x: glint.x - gr, y: glint.y - gr, width: 2 * gr, height: 2 * gr)), with: .color(.white))
    }
  }

  /// a four-point star, `r` to its points, its waist pulled in (the avatar's ✦)
  static func star(r: CGFloat) -> Path {
    let w = r * 0.3 * 0.35
    var p = Path()
    p.move(to: CGPoint(x: 0, y: -r))
    p.addQuadCurve(to: CGPoint(x: r, y: 0), control: CGPoint(x: w, y: -w))
    p.addQuadCurve(to: CGPoint(x: 0, y: r), control: CGPoint(x: w, y: w))
    p.addQuadCurve(to: CGPoint(x: -r, y: 0), control: CGPoint(x: -w, y: w))
    p.addQuadCurve(to: CGPoint(x: 0, y: -r), control: CGPoint(x: -w, y: -w))
    p.closeSubpath()
    return p
  }
}
