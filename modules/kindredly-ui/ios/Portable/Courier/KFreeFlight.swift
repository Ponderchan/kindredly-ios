// Portable: this file imports SwiftUI and UIKit only (the display link, the three haptics and the
// app's resign-active note), so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI
import UIKit

/*
 FREE FLIGHT — her day off, played right on her cover, in SwiftUI (batch 3, 2026-11-09; behind
 the "freeflight" switch, off by default). A port of src/components/FreeFlightGame.tsx (and the
 play mode of components/WrenHome around it), so with the switch on the courier page never leaves
 Swift: KCourierScreen draws this on its cover instead of handing the page to React Native.

 Flappy-bird's shape with the app's own verb: every letter you type is a wingbeat. The letter she
 needs is on a tag in front of her; the right one lifts her, a wrong one does nothing (the tag
 shakes), so she stays up only as long as your fingers find the keys. The sentence is a pangram
 (all 26 letters) and the next one follows when it's done. One course that gets harder every five
 gates (faster, narrower, quicker beats; the top at 40) and a best to beat.

 KEPT TO THE LETTER from the React Native game: the four pangrams and which hour starts which, the
 ramp (lvl, speed, gap, spacing, pace), the physics constants (tuned for a 420 pt course and scaled
 to this one), the three-second warm-up, the forgiving 13 pt hit circle, where a gap may sit, when
 a gate counts, the crash (she drops to the ground and stays), the typing rule (only what the
 keyboard ADDED counts; a burst gives up its last letter only; a crashed run restarts on any letter
 after 0.7 s), the pause when the app leaves the front (the next right letter resumes), the haptics
 (a gate: selection; every fifth: medium and FASTER for 1.1 s; the crash: heavy), the result card's
 four numbers and the NEW BEST rule (more gates than the best TS last sent: lib/free-flight
 saveRun's own test). The world steps on real elapsed time per frame (a CADisplayLink, up to
 120 Hz), each step clamped to 34 ms as the worklet does, so 60 and 120 Hz play alike.

 WHAT STAYS IN TS: the best and its keeping. A finished run is reported (onRun: gates, pace) and
 TS saves it (lib/free-flight saveRun) and re-plans her day-off push (replanLocal force), as the
 React Native game does; the best comes back as a prop.

 HER PICTURE: three snapshots of her own WrenBird at the game's 46 (lib/bird-images ff-<stage>-
 <mood>: curious before take-off, happy in flight, worried after a crash; the fly drawing without
 its letter when grown, perched before, bare as a fledgling), turned by her speed exactly as
 React Native turns her (vy × 0.055 / scale degrees, −18…38).

 REDUCE MOTION, as React Native has it: the game is the motion and plays as it does; the wrong-
 letter shake (a Reanimated timing, which skips to its end under Reduce Motion) does not shake.

 THE KEYBOARD'S EAR: a focused, invisible text field off the course's left edge, ASCII keyboard,
 no autocorrection or capitals; a tap anywhere on the course gives it focus back. It is a
 multi-line field so return types a newline (which no sentence needs) instead of closing the
 keyboard, where React Native says submitBehavior "submit"; the key therefore reads "return", not
 "done". Deliberately different, and the only difference a player can see.

 The sky's colours are the hour's (the cover's), in every theme; the type and the white chips are
 the React Native game's fixed inks (theme/post P.ink, ink40, ink60, pen). Words are TS's.
 Dynamic Type grows the words up to xxLarge, as on the rest of the cover.
 */

// MARK: - What the game shows

/// The four hours: each starts on its own pangram (components/courier-card-model daylight).
public enum KFreeFlightHour: String, CaseIterable, Sendable {
  case morning, day, evening, night
}

/// The game's words (the ff.* keys), resolved by TS.
public struct KFreeFlightStrings: Equatable, Sendable {
  /// the × button's VoiceOver name
  public var done = ""
  public var faster = ""
  /// upper-cased by TS
  public var title = ""
  /// "Type {letter} to take off": "{letter}" is filled here with the letter she needs
  public var takeoff = ""
  public var hint = ""
  /// "BEST {n}": "{n}" is filled here
  public var best = ""
  public var newBest = ""
  public var crashTitle = ""
  public var statGates = ""
  public var statLetters = ""
  public var statAccuracy = ""
  public var statPace = ""
  public var again = ""
  public var anyKey = ""

  public init() {}
}

/// Everything the course needs from TS.
public struct KFreeFlightContent: Equatable, Sendable {
  public var hour: KFreeFlightHour = .day
  /// the course's height (WrenHome playH: taller than the cover, always clear of the keyboard)
  public var height: CGFloat = 320
  /// the room's header rides on the course: the sentence starts below it
  public var top: CGFloat = 44
  public var sky0 = Color(hex: "#BFE3F8")
  public var sky1 = Color(hex: "#E3F3FB")
  /// the pillars' fill
  public var scrim = Color(hex: "#ADDBB5")
  /// the pillars' edge
  public var pillarInk = Color(hex: "#1F5C33")
  /// the ground and its top edge
  public var land = Color(hex: "#9CD48C")
  public var forest = Color(hex: "#3F8F52")
  public var sun: Color?
  public var moon = false
  public var stars = false
  public var night = false
  /// her three faces at 46 (nil until captured)
  public var curious: KImageRef?
  public var happy: KImageRef?
  public var worry: KImageRef?
  /// the best run kept on this phone (gates), 0 for none
  public var best = 0
  public var strings = KFreeFlightStrings()

  public init() {}
}

// MARK: - The rules (FreeFlightGame.tsx, to the number)

enum KFreeFlightRules {
  /// the ramp tops out at 40 gates
  static let ramp = 40
  /// tuned for a 420 pt course; scaled to the one given
  static let grav: CGFloat = 1350
  static let flap: CGFloat = 340
  static let maxV: CGFloat = 640
  static let bird: CGFloat = 46
  /// a forgiving hit circle, inside her drawn body
  static let r: CGFloat = 13
  static let pipeW: CGFloat = 56
  static let lip: CGFloat = 14
  static let ground: CGFloat = 26
  static let birdX: CGFloat = 0.28
  /// a step never covers more than this (a dropped frame doesn't tunnel her through a pillar)
  static let maxStep: Double = 0.034

  /// how hard, by gates passed: a step every five, the top at 40
  static func level(_ gates: Int) -> CGFloat { min(1, CGFloat(gates / 5) / CGFloat(ramp / 5)) }
  static func speed(_ l: CGFloat) -> CGFloat { 78 + 62 * l }
  /// of the course's height
  static func gap(_ l: CGFloat) -> CGFloat { 0.56 - 0.18 * l }
  static func spacing(_ l: CGFloat) -> CGFloat { 280 - 60 * l }
  /// scales gravity, and the wingbeat by its square root, so a beat lifts her the same height
  static func pace(_ l: CGFloat) -> CGFloat { 0.26 + 0.36 * l }

  /// four pangrams; she starts on the hour's
  static let sentences: [KFreeFlightHour: String] = [
    .morning: "the quick brown fox jumps over the lazy dog",
    .day: "sphinx of black quartz judge my vow",
    .evening: "how vexingly quick daft zebras jump",
    .night: "the five boxing wizards jump quickly",
  ]
  static let order: [KFreeFlightHour] = [.morning, .day, .evening, .night]
  static func sentence(_ i: Int) -> String { sentences[order[i % order.count]] ?? "" }
  static func letters(_ i: Int) -> [Character] { sentence(i).filter(isLetter) }
  static func isLetter(_ c: Character) -> Bool { c >= "a" && c <= "z" && c.isASCII }
}

/// The game's fixed inks (theme/post P), and the signal lime.
enum KFreeFlightInk {
  static let ink = Color(hex: "#111113")
  static let ink40 = Color(.sRGB, red: 17 / 255, green: 17 / 255, blue: 19 / 255, opacity: 0.4)
  static let ink60 = Color(.sRGB, red: 17 / 255, green: 17 / 255, blue: 19 / 255, opacity: 0.6)
  static let pen = Color(hex: "#3A3AF5")
  static let lime = Color(hex: "#C3E84F")
  static let statCell = Color(hex: "#F3F2FB")
  static let nightLine = Color(hex: "#DAD6F2")
  static let moon = Color(hex: "#FFF3D6")
  /// a letter still ahead on a day sky: rgba(30,27,53,0.35)
  static let ahead = Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 0.35)
}

// MARK: - The clock

/// Calls `onFrame` with the real seconds since the last frame (0 on the first), every frame the
/// screen draws, up to 120 Hz. React Native's useFrameCallback, in UIKit.
@MainActor
final class KFrameTicker: NSObject {
  private var link: CADisplayLink?
  private var last: CFTimeInterval = 0
  private let onFrame: (Double) -> Void

  init(_ onFrame: @escaping (Double) -> Void) {
    self.onFrame = onFrame
  }

  func start() {
    guard link == nil else { return }
    let l = CADisplayLink(target: self, selector: #selector(tick(_:)))
    l.preferredFrameRateRange = CAFrameRateRange(minimum: 60, maximum: 120, preferred: 120)
    l.add(to: .main, forMode: .common)
    link = l
    last = 0
  }

  /// The link holds its target: stop it when the game goes, or both stay alive.
  func stop() {
    link?.invalidate()
    link = nil
  }

  @objc private func tick(_ l: CADisplayLink) {
    let now = l.timestamp
    let dt = last == 0 ? 0 : now - last
    last = now
    onFrame(dt)
  }
}

// MARK: - The game

/// One sitting of the game: the world (stepped every frame) and the run (moved by letters).
/// Views read only what they draw, so a frame redraws her, her tag and the pillars and nothing
/// else.
@MainActor
@Observable
final class KFreeFlightGame {
  enum Phase { case ready, flying, over }
  /// FreeFlightGame's `run`: 0 ready · 1 flying · 2 crashed (she drops to the ground) · 3 paused
  enum Run { case ready, flying, crashed, paused }

  struct Pillar: Equatable {
    var x: CGFloat = -999
    /// the gap's centre and height
    var gy: CGFloat = 0
    var gap: CGFloat = 0
    var passed = false
  }

  // the world, per frame
  var y: CGFloat = 0
  var vy: CGFloat = 0
  var shake: CGFloat = 0
  var pillars = Array(repeating: Pillar(), count: 4)

  // the run, per letter
  var phase: Phase = .ready
  var gates = 0
  var typed = 0
  var misses = 0
  var sent: Int
  var pos = 0
  var best: Int
  var newBest = false
  var faster = false
  /// the keyboard's field
  var buf = ""

  @ObservationIgnored private var run: Run = .ready
  @ObservationIgnored private var bob: Double = 0
  /// gates passed, for the ramp (the world's count; `gates` is what the run shows)
  @ObservationIgnored private var passed = 0
  /// seconds since take-off, for the warm-up
  @ObservationIgnored private var airborne: CGFloat = 0
  @ObservationIgnored private(set) var startedAt = Date()
  @ObservationIgnored private(set) var endedAt = Date()
  @ObservationIgnored private var lastText = ""
  @ObservationIgnored private var fasterTask: Task<Void, Never>?
  /// the wrong-letter shake: Reanimated's withSequence(withTiming 1 / −1 / 0.6 / 0), each leg
  /// from where the last one left it, eased in and out
  @ObservationIgnored private var shakeLegs: [(to: CGFloat, secs: Double)] = []
  @ObservationIgnored private var shakeFrom: CGFloat = 0
  @ObservationIgnored private var shakeT: Double = 0
  @ObservationIgnored private var ticker: KFrameTicker?

  @ObservationIgnored var width: CGFloat = 0
  @ObservationIgnored var height: CGFloat = 0
  @ObservationIgnored var top: CGFloat = 44
  @ObservationIgnored var reduceMotion = false
  @ObservationIgnored var onRun: (Int, Int) -> Void = { _, _ in }

  init(hour: KFreeFlightHour, best: Int) {
    sent = KFreeFlightRules.order.firstIndex(of: hour) ?? 0
    self.best = best
  }

  /// the course over 420 pt
  var scale: CGFloat { max(0.01, (height - KFreeFlightRules.ground) / 420) }

  // MARK: The clock

  func begin(width: CGFloat, height: CGFloat, top: CGFloat) {
    self.width = width
    self.height = height
    self.top = top
    if ticker == nil {
      y = height * 0.5
      ticker = KFrameTicker { [weak self] dt in self?.step(dt) }
    }
    ticker?.start()
  }

  func end() {
    ticker?.stop()
    ticker = nil
    fasterTask?.cancel()
  }

  /// leaving the app mid-flight pauses her; the next right letter resumes
  func pause() {
    if run == .flying { run = .paused }
  }

  // MARK: The world (the React Native worklet, line for line)

  private func step(_ raw: Double) {
    stepShake(raw)
    typealias K = KFreeFlightRules
    let dt = CGFloat(min(K.maxStep, raw))
    let w = width
    let h = height
    guard h > 0 else { return }
    bob += Double(dt)
    let bx = w * K.birdX
    let s = scale
    switch run {
    case .ready:
      y = h * 0.5 + CGFloat(sin(bob * 3)) * 6
      vy = 0
      return
    case .paused:
      return
    case .flying, .crashed:
      break
    }
    let lvl = K.level(passed)
    // a warm-up: half gravity at take-off, full after three seconds
    if run == .flying { airborne += dt }
    let warm = 0.5 + 0.5 * min(1, airborne / 3)
    let g = K.grav * s * K.pace(lvl) * warm
    var v = min(vy + g * dt, K.maxV * s)
    if run == .crashed {
      // she drops to the ground and stays there
      vy = v
      y = min(y + v * dt, h - K.ground - K.r)
      return
    }
    var ny = y + v * dt
    if ny < K.r {
      ny = K.r
      v = 0
    }
    let speed = K.speed(lvl)
    var ps = pillars
    var far: CGFloat = -1e9
    var farGy = h / 2
    for i in ps.indices {
      ps[i].x -= speed * dt
      if ps[i].x > far {
        far = ps[i].x
        farGy = ps[i].gy
      }
    }
    var hit = ny + K.r > h - K.ground
    var cleared = 0
    for i in ps.indices {
      if ps[i].x < -K.pipeW - 12 {
        let gap = K.gap(lvl) * (h - K.ground)
        ps[i].x = far + K.spacing(lvl)
        ps[i].gap = gap
        ps[i].gy = pickGap(farGy, CGFloat.random(in: 0..<1), gap)
        ps[i].passed = false
        far = ps[i].x
        farGy = ps[i].gy
      }
      let x = ps[i].x
      // a gate counts once she is clear of the lip too, where the hit test ends
      if !ps[i].passed && x + K.pipeW + 5 < bx - K.r {
        ps[i].passed = true
        passed += 1
        cleared += 1
      }
      if bx + K.r > x - 5 && bx - K.r < x + K.pipeW + 5 {
        let half = ps[i].gap / 2
        if ny - K.r < ps[i].gy - half || ny + K.r > ps[i].gy + half { hit = true }
      }
    }
    y = ny
    vy = v
    pillars = ps
    for _ in 0..<cleared { onGate() }
    if hit {
      run = .crashed
      vy = max(vy, 120 * s)
      onCrash()
    }
  }

  /// where a gap may sit: clear of the header and the sentence, above the ground, and no more
  /// than 130 (scaled) from the last one
  private func pickGap(_ prev: CGFloat, _ r: CGFloat, _ gap: CGFloat) -> CGFloat {
    let s = scale
    let lo = top + 34 + gap / 2
    let hi = max(lo, height - KFreeFlightRules.ground - 14 - gap / 2)
    let want = lo + r * (hi - lo)
    return max(lo, min(hi, max(prev - 130 * s, min(prev + 130 * s, want))))
  }

  private func stepShake(_ raw: Double) {
    guard !shakeLegs.isEmpty else { return }
    shakeT += raw
    while let leg = shakeLegs.first, shakeT >= leg.secs {
      shakeT -= leg.secs
      shakeFrom = leg.to
      shakeLegs.removeFirst()
    }
    guard let leg = shakeLegs.first else {
      shake = shakeFrom
      return
    }
    // Easing.inOut(Easing.quad), Reanimated's default for withTiming
    let p = shakeT / leg.secs
    let e = p < 0.5 ? 2 * p * p : 1 - pow(-2 * p + 2, 2) / 2
    shake = shakeFrom + (leg.to - shakeFrom) * CGFloat(e)
  }

  private func startShake() {
    // under Reduce Motion Reanimated jumps a timing to its end: no shake at all
    guard !reduceMotion else { return }
    shakeFrom = shake
    shakeT = 0
    shakeLegs = [(1, 0.05), (-1, 0.07), (0.6, 0.06), (0, 0.06)]
  }

  // MARK: The run

  private func onGate() {
    guard phase == .flying else { return }
    gates += 1
    if gates % 5 == 0 && gates <= KFreeFlightRules.ramp {
      UIImpactFeedbackGenerator(style: .medium).impactOccurred()
      faster = true
      fasterTask?.cancel()
      fasterTask = Task { [weak self] in
        try? await Task.sleep(for: .milliseconds(1100))
        guard !Task.isCancelled else { return }
        self?.faster = false
      }
    } else {
      UISelectionFeedbackGenerator().selectionChanged()
    }
  }

  /// the end of a run: kept once (TS saves it), the best updated
  private func onCrash() {
    guard phase == .flying else { return }
    phase = .over
    endedAt = Date()
    UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
    let pace = runPace
    // lib/free-flight saveRun's test, against the best TS last sent
    let isNew = gates > best
    newBest = isNew && gates > 0
    if isNew { best = gates }
    onRun(gates, pace)
  }

  /// letters a minute over the run (at least one second of it)
  var runPace: Int {
    let secs = max(1, endedAt.timeIntervalSince(startedAt))
    return Int((Double(typed) / secs * 60).rounded())
  }

  var accuracy: Int {
    typed + misses > 0 ? Int((Double(typed) / Double(typed + misses) * 100).rounded()) : 100
  }

  private func beat() -> CGFloat {
    KFreeFlightRules.flap * scale * sqrt(KFreeFlightRules.pace(KFreeFlightRules.level(passed)))
  }

  private func start() {
    typealias K = KFreeFlightRules
    let gap = K.gap(0) * (height - K.ground)
    var prev = height * 0.5
    var ps = pillars
    for i in ps.indices {
      ps[i].x = width + 150 + CGFloat(i) * K.spacing(0)
      ps[i].gap = gap
      prev = pickGap(prev, CGFloat.random(in: 0..<1), gap)
      ps[i].gy = prev
      ps[i].passed = false
    }
    pillars = ps
    passed = 0
    airborne = 0
    gates = 0
    startedAt = Date()
    run = .flying
    vy = -K.flap * scale * sqrt(K.pace(0))
    phase = .flying
  }

  func reset() {
    var ps = pillars
    for i in ps.indices { ps[i].x = -999 }
    pillars = ps
    run = .ready
    passed = 0
    gates = 0
    typed = 0
    misses = 0
    pos = 0
    newBest = false
    faster = false
    phase = .ready
  }

  /// The keyboard is the controller: the right letter is a wingbeat. Only what was ADDED since
  /// the last change counts — fast typing can deliver "t", "th", "the" before a reset lands, and
  /// reading the whole field each time counted the same letter again.
  func type(_ txt: String) {
    let prev = lastText
    // what the keyboard just added: a backspace adds nothing, and a field that no longer starts
    // with what we last saw (a reset that raced a key) or a sudden burst gives up only its last
    // letter — never a replay
    var added = txt.hasPrefix(prev) ? String(txt.dropFirst(prev.count)) : String(txt.suffix(1))
    if txt.count < prev.count && prev.hasPrefix(txt) { added = "" }
    if added.count > 3 { added = String(added.suffix(1)) }
    if txt.count > 40 {
      lastText = ""
      buf = ""
    } else {
      lastText = txt
      buf = txt
    }
    for ch in added.lowercased() {
      guard KFreeFlightRules.isLetter(ch) else { continue }
      if phase == .over {
        if Date().timeIntervalSince(endedAt) > 0.7 { reset() }
        return
      }
      let letters = KFreeFlightRules.letters(sent)
      if pos < letters.count && ch == letters[pos] {
        if phase == .ready {
          start()
        } else if run == .flying {
          vy = -beat()
        } else if run == .paused {
          // back from the background: this letter is the first beat again
          run = .flying
          vy = -beat()
        }
        typed += 1
        pos += 1
        if pos >= letters.count {
          // the sentence is done: on to the next pangram
          pos = 0
          sent = (sent + 1) % KFreeFlightRules.order.count
        }
      } else {
        if phase == .flying { misses += 1 }
        startShake()
      }
    }
  }

  // MARK: What the words show

  var want: String {
    let l = KFreeFlightRules.letters(sent)
    return pos < l.count ? String(l[pos]) : ""
  }

  /// the next two, fainter — read ahead, keep the rhythm
  var upcoming: String {
    let both = KFreeFlightRules.letters(sent) + KFreeFlightRules.letters(sent + 1)
    let from = min(both.count, pos + 1)
    let to = min(both.count, pos + 3)
    return String(both[from..<to]).uppercased()
  }
}

// MARK: - The course

/// The game on the cover: `width` × content.height, the sky, the pillars, her and the words.
public struct KFreeFlight: View {
  private let content: KFreeFlightContent
  private let width: CGFloat
  private let onClose: () -> Void
  private let onRun: (Int, Int) -> Void

  @State private var game: KFreeFlightGame
  @FocusState private var focused: Bool
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @ScaledMetric(relativeTo: .caption2) private var anyKeySize: CGFloat = 10

  public init(content: KFreeFlightContent, width: CGFloat, onClose: @escaping () -> Void, onRun: @escaping (Int, Int) -> Void) {
    self.content = content
    self.width = width
    self.onClose = onClose
    self.onRun = onRun
    _game = State(initialValue: KFreeFlightGame(hour: content.hour, best: content.best))
  }

  private var night: Bool { content.night }
  private var onSkyInk: Color { night ? .white : KFreeFlightInk.ink }
  private var quiet: Color { night ? Color.white.opacity(0.72) : KFreeFlightInk.ink60 }

  public var body: some View {
    let h = content.height
    let x = width * KFreeFlightRules.birdX
    ZStack(alignment: .topLeading) {
      KFreeFlightSky(content: content, width: width, height: h)
      KFreeFlightCourse(game: game, content: content, width: width, height: h)
      KFreeFlightBird(game: game, picture: picture, x: x)
      if game.phase != .over && !game.want.isEmpty {
        KFreeFlightTag(game: game, x: x + KFreeFlightRules.bird / 2 + 8)
      }
      corner
      if game.phase != .over {
        sentence
      }
      if game.faster && game.phase == .flying {
        fasterSign(height: h)
      }
      if game.phase == .ready {
        ready(height: h)
      }
      if game.phase == .over {
        result
      }
      ear
    }
    .frame(width: width, height: h, alignment: .topLeading)
    .clipped()
    .contentShape(Rectangle())
    // the whole course is the keyboard's: a tap anywhere brings it back
    .onTapGesture { focused = true }
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
    .onAppear {
      game.reduceMotion = reduceMotion
      game.onRun = onRun
      game.begin(width: width, height: h, top: content.top)
      focused = true
    }
    .task {
      // React Native's autoFocus: once the field is on screen (a focus asked for in the same pass
      // as the field's first appearance can be dropped)
      try? await Task.sleep(for: .milliseconds(60))
      focused = true
    }
    .onDisappear { game.end() }
    .onChange(of: reduceMotion) { _, on in game.reduceMotion = on }
    .onChange(of: content.best) { _, b in game.best = b }
    .onChange(of: width) { _, w in game.begin(width: w, height: content.height, top: content.top) }
    .onReceive(NotificationCenter.default.publisher(for: UIApplication.willResignActiveNotification)) { _ in
      game.pause()
    }
  }

  private var picture: KImageRef? {
    switch game.phase {
    case .over: return content.worry
    case .flying: return content.happy
    case .ready: return content.curious
    }
  }

  // MARK: The top right: the gates, and the way out (flat white on the sky, rule B)

  private var corner: some View {
    HStack(spacing: 8) {
      if game.phase != .ready {
        Text("\(game.gates)")
          .kText(.mono(12.5))
          .foregroundStyle(KFreeFlightInk.ink)
          .padding(.horizontal, 12)
          .frame(height: 30)
          .background(Capsule().fill(Color.white))
      }
      SwiftUI.Button(action: onClose) {
        Text("×")
          .kText(.system(17))
          .foregroundStyle(KFreeFlightInk.ink)
          .frame(width: 30, height: 30)
          .background(Circle().fill(Color.white))
          .padding(8)
          .contentShape(Rectangle())
      }
      .buttonStyle(KFreeFlightPress(pressed: 0.7))
      .padding(-8)
      .accessibilityLabel(content.strings.done)
    }
    .padding(.top, 8)
    .padding(.trailing, 12)
    .frame(width: width, alignment: .topTrailing)
  }

  // MARK: The sentence she is flying on — done in ink, the next letter underlined

  private var sentence: some View {
    let text = KFreeFlightRules.sentence(game.sent)
    var out = AttributedString()
    var li = -1
    for c in text {
      let isLetter = KFreeFlightRules.isLetter(c)
      if isLetter { li += 1 }
      let done = isLetter && li < game.pos
      let now = isLetter && li == game.pos
      var run = AttributedString(String(c))
      run.foregroundColor = now ? (night ? .white : KFreeFlightInk.pen) : done ? onSkyInk : night ? Color.white.opacity(0.4) : KFreeFlightInk.ahead
      if now { run.underlineStyle = .single }
      out += run
    }
    return Text(out)
      .kText(KTextStyle(face: .monoSemiBold, size: 12.5, weight: .semibold, lineHeight: 18 / 12.5))
      .frame(width: max(0, width - 28), alignment: .leading)
      .offset(x: 14, y: content.top + 6)
      .allowsHitTesting(false)
  }

  // MARK: Every five gates: faster

  private func fasterSign(height h: CGFloat) -> some View {
    Text(content.strings.faster)
      .kText(.mono(14, tracking: 2 / 14))
      .foregroundStyle(KFreeFlightInk.ink)
      .padding(.horizontal, 14.4)
      .padding(.vertical, 6.4)
      .background(RoundedRectangle(cornerRadius: 8, style: .circular).fill(KFreeFlightInk.lime))
      .rotationEffect(.degrees(-4))
      .frame(width: width)
      .offset(y: h * 0.34)
      .allowsHitTesting(false)
  }

  // MARK: Before take-off

  private func ready(height h: CGFloat) -> some View {
    let letter = (game.want.isEmpty ? "t" : game.want).uppercased()
    let best = game.best > 0 ? " · " + content.strings.best.replacingOccurrences(of: "{n}", with: "\(game.best)") : ""
    return VStack(spacing: 0) {
      Text(content.strings.title)
        .kText(.mono(9.5, tracking: 2 / 9.5))
        .foregroundStyle(quiet)
        .padding(.bottom, 6)
      Text(content.strings.takeoff.replacingOccurrences(of: "{letter}", with: letter))
        .kText(.system(18, .heavy))
        .foregroundStyle(onSkyInk)
        .multilineTextAlignment(.center)
      Text(content.strings.hint + best)
        .kText(.mono(9.5, tracking: 1.4 / 9.5))
        .foregroundStyle(quiet)
        .multilineTextAlignment(.center)
        .padding(.top, 6)
        .padding(.horizontal, 16)
    }
    .frame(width: width, height: max(0, h - (KFreeFlightRules.ground + 14)), alignment: .bottom)
    .allowsHitTesting(false)
  }

  // MARK: The result card (an object, rule B: no ink edge, the object depth)

  private var result: some View {
    let card = RoundedRectangle(cornerRadius: 18, style: .circular)
    let bestLine = game.best > 0 && !game.newBest ? content.strings.best.replacingOccurrences(of: "{n}", with: "\(game.best)") + " · " : ""
    return VStack(alignment: .leading, spacing: 0) {
      Text(content.strings.crashTitle)
        .kText(.system(18, .heavy, tracking: -0.3 / 18))
        .foregroundStyle(KFreeFlightInk.ink)
        .fixedSize(horizontal: false, vertical: true)
      HStack(spacing: 6) {
        stat(content.strings.statGates, "\(game.gates)", strong: game.newBest)
        stat(content.strings.statLetters, "\(game.typed)")
        stat(content.strings.statAccuracy, "\(game.accuracy)%")
        stat(content.strings.statPace, "\(game.runPace)")
      }
      .padding(.top, 10)
      HStack(alignment: .center, spacing: 10) {
        SwiftUI.Button {
          game.reset()
          focused = true
        } label: {
          Text(content.strings.again)
            .kText(.system(14.5, .bold))
            .foregroundStyle(Color.white)
            .lineLimit(1)
            .frame(maxWidth: .infinity)
            .frame(height: 40)
            .background(Capsule().fill(KFreeFlightInk.pen))
            .contentShape(Capsule())
        }
        .buttonStyle(KFreeFlightPress(pressed: 0.8))
        .frame(maxWidth: .infinity)
        Text(bestLine + content.strings.anyKey)
          .font(.system(size: anyKeySize, weight: .regular, design: .monospaced))
          .tracking(0.06 * anyKeySize)
          .foregroundStyle(KFreeFlightInk.ink40)
          .lineLimit(2)
          .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(.top, 12)
    }
    .padding(16.4)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background {
      ZStack {
        card.fill(night ? KObjectDepth.dark : KObjectDepth.light)
          .offset(x: KObjectDepth.offset, y: KObjectDepth.offset)
        card.fill(Color.white)
      }
      .accessibilityHidden(true)
    }
    .overlay(alignment: .topTrailing) {
      if game.newBest {
        Text(content.strings.newBest)
          .kText(.mono(10, tracking: 0.14))
          .foregroundStyle(KFreeFlightInk.ink)
          .padding(.horizontal, 10)
          .padding(.vertical, 4)
          .background(RoundedRectangle(cornerRadius: 6, style: .circular).fill(KFreeFlightInk.lime))
          .rotationEffect(.degrees(6))
          .padding(.trailing, 12)
          .offset(y: -12)
      }
    }
    .padding(.horizontal, 16)
    .frame(width: width)
    .offset(y: content.top + 10)
  }

  private func stat(_ label: String, _ value: String, strong: Bool = false) -> some View {
    VStack(spacing: 0) {
      Text(value)
        .kText(.mono(15))
        .foregroundStyle(strong ? KFreeFlightInk.pen : KFreeFlightInk.ink)
        .lineLimit(1)
      Text(label)
        .kText(.mono(8, tracking: 0.1))
        .foregroundStyle(KFreeFlightInk.ink40)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .padding(.top, 2)
    }
    .padding(.vertical, 6)
    .padding(.horizontal, 2)
    .frame(maxWidth: .infinity)
    .background(RoundedRectangle(cornerRadius: 10, style: .circular).fill(KFreeFlightInk.statCell))
    .accessibilityElement(children: .combine)
  }

  // MARK: The keyboard's ear: off the course, always listening, never autocorrecting

  private var ear: some View {
    TextField("", text: Binding(get: { game.buf }, set: { game.type($0) }), axis: .vertical)
      .focused($focused)
      .keyboardType(.asciiCapable)
      .textInputAutocapitalization(.never)
      .autocorrectionDisabled()
      .textContentType(nil)
      .frame(width: 10, height: 10)
      .opacity(0.001)
      .offset(x: -100)
      .accessibilityHidden(true)
  }
}

/// A press that fades to `pressed` (React Native's opacity on press).
struct KFreeFlightPress: ButtonStyle {
  let pressed: Double

  func makeBody(configuration: Configuration) -> some View {
    configuration.label.opacity(configuration.isPressed ? pressed : 1)
  }
}

// MARK: - The pieces that move every frame

/// The hour's sky: its gradient, two soft discs, the stars, the sun or the moon (still).
struct KFreeFlightSky: View {
  let content: KFreeFlightContent
  let width: CGFloat
  let height: CGFloat

  private static let stars: [(CGFloat, CGFloat)] = [(0.12, 40), (0.3, 24), (0.47, 58), (0.62, 30), (0.86, 48), (0.93, 90)]

  var body: some View {
    Canvas { ctx, size in
      let night = content.night
      let top = content.top
      ctx.fill(
        Path(CGRect(origin: .zero, size: size)),
        with: .linearGradient(Gradient(colors: [content.sky0, content.sky1]), startPoint: .zero, endPoint: CGPoint(x: 0, y: size.height))
      )
      func disc(_ x: CGFloat, _ y: CGFloat, _ r: CGFloat, _ color: Color) {
        ctx.fill(Path(ellipseIn: CGRect(x: x - r, y: y - r, width: r * 2, height: r * 2)), with: .color(color))
      }
      disc(width * 0.78, height * 0.3, 120, Color.white.opacity(night ? 0.06 : 0.24))
      disc(width * 0.16, height * 0.84, 150, Color.white.opacity(night ? 0.05 : 0.2))
      if content.stars {
        for (i, s) in Self.stars.enumerated() {
          disc(width * s.0, s.1, i % 2 == 1 ? 1 : 1.6, Color.white.opacity(0.8))
        }
      }
      if let sun = content.sun {
        disc(width * 0.84, top + 58, 18, sun.opacity(0.9))
      }
      if content.moon {
        disc(width * 0.84, top + 58, 14, KFreeFlightInk.moon)
        disc(width * 0.84 + 6.5, top + 52, 12, content.sky0)
      }
    }
    .frame(width: width, height: height)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

/// The pillars (a column above the gap and one below, each with a lip at the gap's edge) and
/// the ground, redrawn every frame.
struct KFreeFlightCourse: View {
  let game: KFreeFlightGame
  let content: KFreeFlightContent
  let width: CGFloat
  let height: CGFloat

  var body: some View {
    let pillars = game.pillars
    Canvas { ctx, _ in
      typealias K = KFreeFlightRules
      let fill = content.scrim
      let ink = content.pillarInk
      let line: CGFloat = 2.4
      // React Native's border sits inside the box: the edge is stroked 1.2 in
      func block(_ rect: CGRect, _ radii: RectangleCornerRadii) {
        guard rect.height > 0 else { return }
        ctx.fill(UnevenRoundedRectangle(cornerRadii: radii, style: .circular).path(in: rect), with: .color(fill))
        let inner = RectangleCornerRadii(
          topLeading: max(0, radii.topLeading - line / 2), bottomLeading: max(0, radii.bottomLeading - line / 2),
          bottomTrailing: max(0, radii.bottomTrailing - line / 2), topTrailing: max(0, radii.topTrailing - line / 2)
        )
        ctx.stroke(UnevenRoundedRectangle(cornerRadii: inner, style: .circular).path(in: rect.insetBy(dx: line / 2, dy: line / 2)), with: .color(ink), lineWidth: line)
      }
      let lipR = RectangleCornerRadii(topLeading: 5, bottomLeading: 5, bottomTrailing: 5, topTrailing: 5)
      for p in pillars where p.x > -K.pipeW - 20 && p.x < width + 20 {
        let upper = p.gy - p.gap / 2
        let lower = p.gy + p.gap / 2
        // the column above, rounded at its foot, and its lip (5 out each side, 0.4 inside the end)
        block(CGRect(x: p.x, y: -4, width: K.pipeW, height: max(0, upper + 4)), RectangleCornerRadii(bottomLeading: 4, bottomTrailing: 4))
        block(CGRect(x: p.x - 5, y: upper - 0.4 - K.lip, width: K.pipeW + 10, height: K.lip), lipR)
        // the column below, rounded at its head, and its lip
        block(CGRect(x: p.x, y: lower, width: K.pipeW, height: max(0, height - K.ground - lower)), RectangleCornerRadii(topLeading: 4, topTrailing: 4))
        block(CGRect(x: p.x - 5, y: lower + 0.4, width: K.pipeW + 10, height: K.lip), lipR)
      }
      // the ground, its top edge in the forest's green (the night's lilac)
      ctx.fill(Path(CGRect(x: 0, y: height - K.ground, width: width, height: K.ground)), with: .color(content.land))
      ctx.fill(Path(CGRect(x: 0, y: height - K.ground, width: width, height: line)), with: .color(content.night ? KFreeFlightInk.nightLine : content.forest))
    }
    .frame(width: width, height: height)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

/// Her, turned by her speed.
struct KFreeFlightBird: View {
  let game: KFreeFlightGame
  let picture: KImageRef?
  let x: CGFloat

  var body: some View {
    let side = KFreeFlightRules.bird
    let deg = max(-18, min(38, game.vy * (0.055 / game.scale)))
    KImage(picture, size: CGSize(width: side, height: side), contentMode: .fit, placeholder: .clear)
      .frame(width: side, height: side)
      .rotationEffect(.degrees(Double(deg)))
      .offset(x: x - side / 2, y: game.y - side / 2)
      .allowsHitTesting(false)
      .accessibilityHidden(true)
  }
}

/// The letter she needs, on a white tag in front of her, and the next two fainter.
struct KFreeFlightTag: View {
  let game: KFreeFlightGame
  let x: CGFloat

  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 0) {
      Text(game.want.uppercased())
        .kText(.mono(17))
        .foregroundStyle(KFreeFlightInk.ink)
      Text(" " + game.upcoming)
        .kText(.mono(12))
        .foregroundStyle(KFreeFlightInk.ink40)
    }
    .lineLimit(1)
    .fixedSize()
    .padding(.horizontal, 10.4)
    .frame(minWidth: 32)
    .frame(height: 32)
    .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(Color.white))
    .offset(x: x + game.shake * 6, y: game.y - 16)
    .allowsHitTesting(false)
  }
}
