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

public struct KLaunchContent {
  public var mode: KLaunchMode
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
      ZStack(alignment: .topLeading) {
        content.inks.bg
        if content.mode == .frame || resting {
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
      let left = KLaunchClock.runs(content.mode) - Date().timeIntervalSince(content.startAt)
      if left > 0 {
        try? await Task.sleep(for: .seconds(left + 0.05))
      }
      if !Task.isCancelled { resting = true }
    }
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
