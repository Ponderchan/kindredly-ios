// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE NAME-TRADING CEREMONY'S SIGNED RITUAL (owner, 2026-10-26; ships in 1.0.7). When both sides
 have signed, the introduction sheet shows this instead of React Native's ritual
 (src/components/IntroductionRitual.tsx SignedRitual, kept as the fallback behind the "ceremony"
 switch: src/components/IntroductionRitualNative.tsx). The beats are that file's, read from TS
 (SIGNED_BEATS), all in ms from the moment the sheet opened:

   ① THE ROAD. Your window on the left (a roof: home), theirs on the right (a sill); every letter
      that bought this crosses between them in the order it left, the courier flying it, the day
      stamped on as it lands, the counts ticking up. "10 LETTERS · THE ROAD TO A NAME" under it.
   ② windows: two signed cards, yours left and theirs right, each with the frosted window that
      person wore and a sealed envelope over it. lift: both envelopes lift at once (the kindreds
      reel's "both open together"; React Native has no envelopes here). wipe: a sheen sweeps each
      pane, the frost goes, the square turns round, and the face each SENT comes forward.
   ③ strike: an ink line strikes through their courier name, then yours; both dim to 45%.
   ④ sign: their signature draws in stroke by stroke (TS's plan, fitPlan), the pen name fading in
      under it; then yours, faster. A typed side fades its pen name into the slot in the Letter
      font's italic (upright for CJK), once.
   ⑤ bump: the two faces meet in the middle, overlap a little and spring back.
   ⑥ chip: KINDREDS · {date} is slapped under the two of you. ⑦ notice: what she noticed, a
      sticker with a ×2 corner when you both wear it. done.

 STILL (Reduce Motion): nothing moves. The road is already landed, and the end state cross-fades
 in: the cards at 300 (400ms), the chip at 900, the sticker at 1300; done by doneStill (1600).
 A cross-fade isn't motion, so it still fades, as React Native's does.

 ONE CLOCK. Every beat is a pure function of the time since `startAt`, drawn in a TimelineView that
 pauses once the ritual is done, so a Host that arrives a frame late lands on the same beat as
 the sheet's own timers.

 VISUAL RULE B (owner, 2026-10-26): the physical objects (the envelopes, the signed cards, the
 sticker and the window panes) have no ink edge; their depth is the hard offset shadow in the
 deep page purple (kObjectDepth, Kit/KObjectDepth.swift). The stickers keep their own print
 colours in every theme (the white cut edge, the green chip), as React Native's do.

 VoiceOver: one element, the whole ritual as one sentence (`a11y`), and `announce` is said once
 when it is done. Their signature, once `holdable`, can be held (450ms) for Report / Block:
 onHoldTheirs gets its slot in this view's own points, from its top left corner.
 */

/// The ritual's clock, in ms from the moment the sheet opened (TS SIGNED_BEATS).
public struct KIntroRitualBeats: Equatable, Sendable {
  public var road: Double = 380
  public var step: Double = 240
  public var fly: Double = 620
  public var windows: Double = 3400
  public var lift: Double = 3520
  public var liftMs: Double = 340
  public var wipe: Double = 3650
  public var wipeMs: Double = 600
  public var strikeTheirs: Double = 4250
  public var strikeMine: Double = 4370
  public var signTheirs: Double = 4600
  public var signTheirsMs: Double = 1000
  public var signMine: Double = 5600
  public var signMineMs: Double = 600
  public var bump: Double = 6250
  public var chip: Double = 6850
  public var notice: Double = 7300
  public var done: Double = 8000
  public var doneStill: Double = 1600

  public init() {}
}

/// One letter of the road, oldest first.
public struct KIntroRitualCrossing: Equatable, Sendable {
  public let mine: Bool
  /// the day it left, "OCT.14" (or "—")
  public let date: String

  public init(mine: Bool, date: String) {
    self.mine = mine
    self.date = date
  }
}

/// A drawn signature: its strokes in box units, each with its turn, and the box to show.
public struct KIntroRitualSignature {
  public struct Stroke {
    public let path: Path
    /// ms from the signature's own beat
    public let delay: Double
    public let duration: Double

    public init(path: Path, delay: Double, duration: Double) {
      self.path = path
      self.delay = delay
      self.duration = max(1, duration)
    }
  }

  public let strokes: [Stroke]
  /// the viewBox, in box units (TS penViewBox "ink" at the slot's aspect)
  public let viewBox: CGRect

  public init(strokes: [Stroke], viewBox: CGRect) {
    self.strokes = strokes
    self.viewBox = viewBox
  }
}

/// One side of the pair.
public struct KIntroRitualSide {
  /// the courier name they wore, already upper-cased; "" for none
  public let courier: String
  /// its mono size, fitted to the column in TS
  public let courierSize: CGFloat
  /// the pen name signed
  public let name: String
  /// a typed name in CJK: upright, not the italic
  public let typedUpright: Bool
  /// the face they sent, behind the window
  public let face: KFaceSource
  /// the window they wore; nil draws the veil tile
  public let frost: KFrostSpec?
  /// the drawing; nil for a typed side
  public let signature: KIntroRitualSignature?

  public init(courier: String, courierSize: CGFloat, name: String, typedUpright: Bool, face: KFaceSource, frost: KFrostSpec?, signature: KIntroRitualSignature?) {
    self.courier = courier
    self.courierSize = courierSize
    self.name = name
    self.typedUpright = typedUpright
    self.face = face
    self.frost = frost
    self.signature = signature
  }
}

/// What she noticed, as a sticker label (React Native's StickerChip, size lg).
public struct KIntroRitualSticker {
  public let name: String
  public let bg: Color
  public let fg: Color
  public let border: Color
  /// 999 for a pill
  public let radius: CGFloat
  /// the sticker's own tilt, degrees
  public let tilt: Double
  /// the tilt it is slapped down at, degrees
  public let slapTilt: Double
  /// a label you both wear: the ×2 corner
  public let shared: Bool

  public init(name: String, bg: Color, fg: Color, border: Color, radius: CGFloat, tilt: Double, slapTilt: Double, shared: Bool) {
    self.name = name
    self.bg = bg
    self.fg = fg
    self.border = border
    self.radius = radius
    self.tilt = tilt
    self.slapTilt = slapTilt
    self.shared = shared
  }
}

/// Everything the ritual draws, every word and number worked out in TS.
public struct KIntroRitualContent {
  public var beats = KIntroRitualBeats()
  /// when the sheet opened: every beat counts from here
  public var startAt = Date()
  /// Reduce Motion: the end state cross-fades in
  public var still = false
  /// the ritual is done and their signature may be held
  public var holdable = false
  public var road: [KIntroRitualCrossing] = []
  public var youLabel = ""
  public var themLabel = ""
  public var roadLine = ""
  /// the envelopes' stamp (its dot); "" for none
  public var stamp = ""
  /// the courier, flying
  public var bird: KImageRef?
  public var mine: KIntroRitualSide
  public var theirs: KIntroRitualSide
  public var chip = ""
  public var notice: KIntroRitualSticker?
  public var a11y = ""
  public var announce = ""

  public init(mine: KIntroRitualSide, theirs: KIntroRitualSide) {
    self.mine = mine
    self.theirs = theirs
  }
}

public struct KIntroRitual: View {
  private let theme: KTheme
  private let content: KIntroRitualContent
  private let onHoldTheirs: (CGRect) -> Void

  @State private var finished = false
  @State private var theirSlot: CGRect = .zero
  @Environment(\.accessibilityVoiceOverEnabled) private var voiceOver

  /// - Parameters:
  ///   - onHoldTheirs: their signature was held (once `holdable`): its slot, in this view's points
  public init(theme: KTheme, content: KIntroRitualContent, onHoldTheirs: @escaping (CGRect) -> Void = { _ in }) {
    self.theme = theme
    self.content = content
    self.onHoldTheirs = onHoldTheirs
  }

  // MARK: Layout (the React Native ritual's, plus the cards)

  static let space = "kIntroRitual"
  /// the road: 300 wide, 100 + 44 for the counts and its line
  static let roadW: CGFloat = 300
  static let roadH: CGFloat = 144
  static let win: CGFloat = 34
  /// the two signed cards: 150 wide, 8 apart, 190 tall, their shadow 6 outside
  static let cardW: CGFloat = 150
  static let cardGap: CGFloat = 8
  static let cardH: CGFloat = 190
  static let cardRadius: CGFloat = 20
  static let face: CGFloat = 64
  static let slotW: CGFloat = 132
  static let slotH: CGFloat = 42
  /// the signature's stroke, in points (React Native's SIG_PT)
  static let sigPt: CGFloat = 2
  /// how far each face travels to the collision: they meet overlapping by 10pt
  static let bumpIn: CGFloat = (cardW + cardGap - face) / 2 + 5
  static let depth: CGFloat = 6
  static let chipH: CGFloat = 24
  static let noticeH: CGFloat = 50

  /// The ritual's height: the same numbers as kIntroRitualHeight in modules/kindredly-ui/src/IntroRitual.tsx.
  public static func height(notice: Bool) -> CGFloat {
    roadH + 14 + cardH + depth + 10 + chipH + (notice ? 14 + noticeH : 0)
  }

  private var doneAt: Double { content.still ? content.beats.doneStill : content.beats.done }

  public var body: some View {
    TimelineView(.animation(minimumInterval: nil, paused: finished)) { tl in
      ritual(finished ? doneAt + 1_000 : max(0, tl.date.timeIntervalSince(content.startAt) * 1000))
    }
    .frame(maxWidth: .infinity, alignment: .top)
    .frame(height: Self.height(notice: content.notice != nil), alignment: .top)
    .coordinateSpace(.named(Self.space))
    // a fixed picture, as React Native's is: its words are VoiceOver's sentence
    .dynamicTypeSize(...DynamicTypeSize.large)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(content.a11y)
    .task(id: content.startAt) {
      finished = false
      let left = doneAt / 1000 - Date().timeIntervalSince(content.startAt)
      if left > 0 { try? await Task.sleep(for: .seconds(left)) }
      if Task.isCancelled { return }
      if voiceOver, !content.announce.isEmpty { AccessibilityNotification.Announcement(content.announce).post() }
      finished = true
    }
  }

  @ViewBuilder
  private func ritual(_ ms: Double) -> some View {
    VStack(spacing: 0) {
      road(ms)
      pair(ms)
        .padding(.top, 14)
        .padding(.bottom, Self.depth)
      chip(ms)
        .frame(height: Self.chipH)
        .padding(.top, 10)
      if let notice = content.notice {
        sticker(notice, ms: ms)
          .frame(height: Self.noticeH)
          .padding(.top, 14)
      }
    }
  }

  // MARK: ① the road

  private var landings: [Double] {
    content.road.indices.map { content.beats.road + Double($0) * content.beats.step + content.beats.fly }
  }

  @ViewBuilder
  private func road(_ ms: Double) -> some View {
    let w = Self.roadW
    let win = Self.win
    let x0 = win / 2 + 8
    let x1 = w - win / 2 - 8
    let y: CGFloat = 100 - 30
    let b = content.beats
    let lands = landings
    let still = content.still
    // a letter lands at the window it was sent TO: theirs at yours, yours at theirs
    let atMine = content.road.indices.filter { !content.road[$0].mine }.map { lands[$0] }
    let atTheirs = content.road.indices.filter { content.road[$0].mine }.map { lands[$0] }
    let lineAt = b.road + Double(content.road.count) * b.step + b.fly + 100
    ZStack(alignment: .topLeading) {
      // the ground the two windows stand on, and the dotted road between
      Rectangle()
        .fill(theme.ln)
        .frame(width: w - 20, height: 1.5)
        .offset(x: 10, y: y + win / 2 + 2)
      Path { p in
        p.move(to: CGPoint(x: x0 + win / 2 + 6, y: y - 30))
        p.addLine(to: CGPoint(x: x1 - win / 2 - 6, y: y - 30))
      }
      .stroke(theme.line, style: StrokeStyle(lineWidth: 1.5, lineCap: .round, dash: [0.01, 3.5]))
      window(label: content.youLabel, landed: atMine, roof: true, ms: ms)
        .offset(x: x0 - win / 2 - 20, y: y - win / 2 - 14)
      window(label: content.themLabel, landed: atTheirs, roof: false, ms: ms)
        .offset(x: x1 - win / 2 - 20, y: y - win / 2 - 14)
      if !still {
        ForEach(Array(content.road.enumerated()), id: \.offset) { i, m in
          crossing(m, at: b.road + Double(i) * b.step, from: m.mine ? x0 : x1, to: m.mine ? x1 : x0, y: y, ms: ms)
        }
      }
    }
    .frame(width: w, height: Self.roadH, alignment: .topLeading)
    .overlay(alignment: .bottom) {
      Text(content.roadLine)
        .kText(.mono(10, .medium, tracking: 0.14))
        .foregroundStyle(theme.mute)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .opacity(still ? 1 : clamp((ms - lineAt) / 400))
    }
  }

  /// a window with its count of the letters that have landed on it; it pops as one lands
  private func window(label: String, landed: [Double], roof: Bool, ms: Double) -> some View {
    let win = Self.win
    let count = content.still ? landed.count : landed.filter { $0 <= ms }.count
    var pop = 0.0
    if !content.still, let last = landed.last(where: { $0 <= ms }) {
      let dt = ms - last
      pop = dt < 90 ? easeInOutQuad(dt / 90) : dt < 370 ? 1 - backOut((dt - 90) / 280) : 0
    }
    return VStack(spacing: 0) {
      // your side is home, a roof; theirs is a window in a wall we cannot see
      if roof {
        KRitualRoof()
          .fill(theme.ln)
          .frame(width: win + 10, height: 14)
      } else {
        Color.clear.frame(height: 14)
      }
      // the pane is warm in every theme; its bars are the brand ink on it
      ZStack {
        Rectangle().fill(Color(hex: "#FFF8DE"))
        Rectangle().fill(KBrand.inkOnBrand).frame(width: 1.5)
        Rectangle().fill(KBrand.inkOnBrand).frame(height: 1.5)
      }
      .frame(width: win, height: win)
      .kObjectDepth(theme, offset: 2, radius: 0)
      if !roof {
        Rectangle()
          .fill(theme.ln)
          .frame(width: win + 10, height: 3)
          .padding(.top, 1)
      }
      HStack(alignment: .firstTextBaseline, spacing: 4) {
        Text("\(count)")
          .kText(.system(15, .heavy))
          .foregroundStyle(theme.ink)
          .scaleEffect(1 + 0.25 * pop)
        Text(label)
          .kText(.mono(9, .semibold, tracking: 1.2 / 9))
          .foregroundStyle(theme.mute)
          .lineLimit(1)
      }
      .padding(.top, 5)
    }
    .frame(width: win + 40)
  }

  /// one letter crossing: the courier carries it over the arc, the envelope turning a little, and
  /// on landing the day stamps on and both fade. Always in the tree (hidden outside its flight),
  /// so the courier's picture is loaded once, not as each letter sets off.
  private func crossing(_ m: KIntroRitualCrossing, at: Double, from: CGFloat, to: CGFloat, y: CGFloat, ms: Double) -> some View {
    let fly = content.beats.fly
    let dt = ms - at
    let flying = dt > 0 && dt < fly + 420
    let p = dt <= 0 ? 0 : dt < fly ? easeInOutSine(dt / fly) : 1
    let q = dt < fly ? 0 : easeOutCubic(min(1, (dt - fly) / 420))
    let dir: CGFloat = to > from ? 1 : -1
    let x = from + (to - from) * p
    let yy = y - 58 * sin(p * .pi) - 12 * q
    let s = clamp(q * 2.5)
    return ZStack {
      // the courier, small, over the letter, facing the way she flies
      if let bird = content.bird {
        KImage(bird, size: CGSize(width: 26, height: 26), contentMode: .fit, placeholder: .clear)
          .scaleEffect(x: dir, y: 1)
          .offset(y: -23)
      }
      // no ink edge: an object, its depth the page purple
      ZStack(alignment: .topTrailing) {
        RoundedRectangle(cornerRadius: 3, style: .circular).fill(theme.sf)
        Rectangle().fill(theme.line).frame(height: 1).frame(maxHeight: .infinity, alignment: .top)
        if !content.stamp.isEmpty {
          KStamp(id: content.stamp, width: KStampFrame.dotPt, dark: theme.isDark)
            .padding(3)
        }
        Text(m.date)
          .kText(.mono(6.5, .semibold, tracking: 0.4 / 6.5))
          .foregroundStyle(theme.ind)
          .lineLimit(1)
          .fixedSize()
          .padding(.horizontal, 3)
          .padding(.vertical, 1)
          .background(RoundedRectangle(cornerRadius: 2, style: .circular).fill(theme.sf))
          .overlay(RoundedRectangle(cornerRadius: 2, style: .circular).strokeBorder(theme.ind, lineWidth: 1))
          .scaleEffect(0.5 + 0.5 * s)
          .rotationEffect(.degrees(-10 + 10 * s))
          .opacity(s)
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      }
      .frame(width: 34, height: 22)
      .kObjectDepth(theme, offset: 2, radius: 3)
    }
    .frame(width: 42, height: 28)
    .rotationEffect(.degrees(Double(dir) * (-14 + 28 * p)))
    .opacity(flying ? 1 - q : 0)
    .offset(x: x - 21, y: yy - 14)
    .allowsHitTesting(false)
  }

  // MARK: ②–⑤ the signed cards

  @ViewBuilder
  private func pair(_ ms: Double) -> some View {
    let b = content.beats
    let shown = content.still ? clamp((ms - 300) / 400) : clamp((ms - b.windows) / 250)
    ZStack(alignment: .top) {
      // the two cards under everything, so a face crossing the gap in the bump stays on top
      HStack(spacing: Self.cardGap) {
        card
        card
      }
      HStack(spacing: Self.cardGap) {
        column(content.mine, dir: 1, strikeAt: b.strikeMine, signAt: b.signMine, signMs: b.signMineMs, theirs: false, ms: ms)
        column(content.theirs, dir: -1, strikeAt: b.strikeTheirs, signAt: b.signTheirs, signMs: b.signTheirsMs, theirs: true, ms: ms)
      }
    }
    .frame(width: Self.cardW * 2 + Self.cardGap, height: Self.cardH)
    .opacity(shown)
  }

  private var card: some View {
    RoundedRectangle(cornerRadius: Self.cardRadius, style: .circular)
      .fill(theme.sf)
      .kObjectDepth(theme, radius: Self.cardRadius)
      .frame(width: Self.cardW, height: Self.cardH)
  }

  /// one side: the window that wipes onto the face (under its sealed envelope), the struck
  /// courier name, the signature, the pen name
  private func column(_ side: KIntroRitualSide, dir: CGFloat, strikeAt: Double, signAt: Double, signMs: Double, theirs: Bool, ms: Double) -> some View {
    VStack(spacing: 0) {
      windowStack(side, dir: dir, ms: ms)
      struck(side.courier, size: side.courierSize, at: strikeAt, ms: ms)
        .frame(height: 16)
        .padding(.top, 8)
      slot(side, at: signAt, ms: ms, theirs: theirs)
        .padding(.top, 10)
      Group {
        // the typed pen name under a drawing (a typed side IS the name: nothing under it)
        if side.signature != nil {
          Text(side.name)
            .kText(.system(13, .semibold))
            .foregroundStyle(theme.ink)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .frame(maxWidth: Self.slotW)
            .opacity(content.still ? 1 : easeOutCubic(clamp((ms - signAt - signMs) / 200)))
        }
      }
      .frame(height: 20)
      .padding(.top, 4)
    }
    .padding(.top, 14)
    .frame(width: Self.cardW, height: Self.cardH, alignment: .top)
  }

  /// ② the window, wiped clear, with the sealed envelope over it that lifts first; ⑤ the bump
  private func windowStack(_ side: KIntroRitualSide, dir: CGFloat, ms: Double) -> some View {
    let b = content.beats
    var k: CGFloat = 0
    if !content.still {
      let dt = ms - b.bump
      if dt > 0 {
        let p = dt < 420 ? easeInQuad(dt / 420) : 1 + backOut(min(1, (dt - 420) / 420))
        k = p <= 1 ? p : 2 - p
      }
    }
    let lift = easeInQuad(clamp((ms - b.lift) / b.liftMs))
    return ZStack {
      wipe(side, ms: ms)
      if !content.still, lift < 1 {
        KRitualEnvelope(theme: theme)
          .frame(width: 48, height: 32)
          .scaleEffect(1 + 0.15 * lift)
          .offset(y: 17 - 22 * lift)
          .opacity(1 - lift)
      }
    }
    .frame(width: Self.face, height: Self.face)
    .rotationEffect(.degrees(Double(dir * 6 * k)))
    .offset(x: dir * Self.bumpIn * k)
  }

  /// the frosted window each wore, wiped clear: a sheen sweeps the pane while the frost fades, the
  /// square goes round, and the face behind it, the one they SENT, comes forward
  private func wipe(_ side: KIntroRitualSide, ms: Double) -> some View {
    let d = Self.face
    let b = content.beats
    let c = content.still ? b.wipeMs : min(b.wipeMs, max(0, ms - b.wipe))
    let round = smooth(clamp((c - 50) / 500))
    let radius = d * (0.25 + 0.25 * round)
    let pf = clamp(c / 550)
    let e = smooth(pf)
    let sweep = -d * 0.85 + d * 1.7 * e
    let sheen = pf > 0 && pf < 1 ? sin(pf * .pi) : 0
    let f = clamp((c - 150) / 450)
    let shape = RoundedRectangle(cornerRadius: radius, style: .circular)
    return ZStack {
      faceLayer(side.face)
        .opacity(f)
        .scaleEffect(0.92 + 0.08 * f)
      if !content.still {
        Group {
          if let spec = side.frost {
            KFrost(theme: theme, spec: spec, size: d)
          } else {
            KFrostVeil(theme: theme, size: d)
          }
        }
        .opacity(1 - e)
        if sheen > 0 {
          LinearGradient(colors: [.white.opacity(0), .white.opacity(0.85), .white.opacity(0)], startPoint: .leading, endPoint: .trailing)
            .frame(width: d * 0.5, height: d * 2)
            .rotationEffect(.degrees(45))
            .offset(x: sweep, y: sweep)
            .opacity(sheen)
        }
      }
    }
    .frame(width: d, height: d)
    .clipShape(shape)
    // the white ring a face wears as a sticker, once it's round
    .overlay(shape.strokeBorder(KBrand.paperWhite, lineWidth: 3).opacity(f))
  }

  @ViewBuilder
  private func faceLayer(_ source: KFaceSource) -> some View {
    let d = Self.face
    switch source {
    case let .image(ref, overscan):
      KImage(ref, size: CGSize(width: d, height: d), placeholder: theme.soft2, overscan: overscan)
    default:
      KFace(theme: theme, source: source, size: d, round: false)
    }
  }

  /// ③ a 1.5pt ink line strikes through the courier name, left to right; the name dims to 45%
  @ViewBuilder
  private func struck(_ text: String, size: CGFloat, at: Double, ms: Double) -> some View {
    if text.isEmpty {
      Color.clear
    } else {
      let v = content.still ? 1 : easeInOutQuad(clamp((ms - at) / 240))
      Text(text)
        .kText(.mono(size, .medium, tracking: 0.6 / max(1, size)))
        .foregroundStyle(theme.sub)
        .lineLimit(1)
        .fixedSize()
        .opacity(1 - 0.55 * v)
        .overlay(alignment: .leading) {
          Rectangle()
            .fill(theme.ink)
            .frame(height: 1.5)
            .scaleEffect(x: v, y: 1, anchor: .leading)
        }
        .frame(maxWidth: Self.slotW)
    }
  }

  /// ④ the signature, drawn stroke by stroke, or the typed pen name fading in
  @ViewBuilder
  private func slot(_ side: KIntroRitualSide, at: Double, ms: Double, theirs: Bool) -> some View {
    let mark = Group {
      if let sig = side.signature {
        drawn(sig, clock: content.still ? .greatestFiniteMagnitude : ms - at)
      } else {
        Text(side.name)
          .kText(.content(20, italic: !side.typedUpright))
          .foregroundStyle(theme.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.5)
          .frame(maxWidth: Self.slotW)
          .opacity(content.still ? 1 : easeOutCubic(clamp((ms - at) / 400)))
      }
    }
    .frame(width: Self.slotW, height: Self.slotH)
    if theirs {
      mark
        .contentShape(Rectangle())
        .onGeometryChange(for: CGRect.self) { $0.frame(in: .named(Self.space)) } action: { theirSlot = $0 }
        .onLongPressGesture(minimumDuration: 0.45) {
          if content.holdable { onHoldTheirs(theirSlot) }
        }
        .allowsHitTesting(content.holdable)
    } else {
      mark
    }
  }

  /// the drawing in the slot: each stroke runs out over its own share of the clock (smoothstep),
  /// hidden until its turn; the stroke is sigPt points whatever the drawing's size
  private func drawn(_ sig: KIntroRitualSignature, clock: Double) -> some View {
    let ink = theme.ink
    return Canvas { gc, size in
      let vb = sig.viewBox
      guard vb.width > 0, vb.height > 0 else { return }
      let s = min(size.width / vb.width, size.height / vb.height)
      let tx = (size.width - vb.width * s) / 2
      let ty = (size.height - vb.height * s) / 2
      let fit = CGAffineTransform(translationX: tx, y: ty).scaledBy(x: s, y: s).translatedBy(x: -vb.minX, y: -vb.minY)
      let style = StrokeStyle(lineWidth: Self.sigPt, lineCap: .round, lineJoin: .round)
      for stroke in sig.strokes where clock >= stroke.delay {
        let p = smooth(clamp((clock - stroke.delay) / stroke.duration))
        let path = (p >= 1 ? stroke.path : stroke.path.trimmedPath(from: 0, to: p)).applying(fit)
        gc.stroke(path, with: .color(ink), style: style)
      }
    }
    .frame(width: Self.slotW, height: Self.slotH)
  }

  // MARK: ⑥ ⑦ the stickers

  @ViewBuilder
  private func chip(_ ms: Double) -> some View {
    let label = Text(content.chip)
      .kText(.mono(9, .semibold, tracking: 1.4 / 9))
      .foregroundStyle(KBrand.greenText)
      .lineLimit(1)
      .fixedSize()
      .padding(.horizontal, 10.5)
      .padding(.vertical, 4.5)
      .background(Capsule().fill(KBrand.paperWhite))
      .overlay(Capsule().strokeBorder(KBrand.greenText, lineWidth: 1.5))
    if content.still {
      // at the tilt the slapped chip settles at, so the end state is the same either way
      label.rotationEffect(.degrees(2)).opacity(clamp((ms - 900) / 300))
    } else {
      label.modifier(KRitualSlap(p: slapP(ms, at: content.beats.chip, small: true), tilt: 2))
    }
  }

  @ViewBuilder
  private func sticker(_ n: KIntroRitualSticker, ms: Double) -> some View {
    let label = ZStack(alignment: .topTrailing) {
      Text(n.name)
        .kText(.system(13.5, .bold))
        .foregroundStyle(n.fg)
        .lineLimit(1)
        .fixedSize()
        .padding(.horizontal, 15)
        .padding(.vertical, 8)
        .background(RoundedRectangle(cornerRadius: n.radius, style: .circular).fill(n.bg))
        .overlay(RoundedRectangle(cornerRadius: n.radius, style: .circular).strokeBorder(n.border, lineWidth: 2))
        // the white cut edge
        .padding(3)
        .background(RoundedRectangle(cornerRadius: n.radius + 3, style: .circular).fill(KBrand.paperWhite))
        .kObjectDepth(theme, offset: 3, radius: n.radius + 3)
      if n.shared {
        Text("×2")
          .kText(.mono(9, .semibold))
          .foregroundStyle(KBrand.paperWhite)
          .fixedSize()
          .padding(.horizontal, 8)
          .padding(.vertical, 4)
          .background(Capsule().fill(KBrand.inkOnBrand))
          .overlay(Capsule().strokeBorder(KBrand.paperWhite, lineWidth: 2))
          .offset(x: 12, y: -9)
      }
    }
    .rotationEffect(.degrees(n.tilt))
    if content.still {
      label.rotationEffect(.degrees(n.slapTilt)).opacity(clamp((ms - 1300) / 300))
    } else {
      label.modifier(KRitualSlap(p: slapP(ms, at: content.beats.notice, small: false), tilt: n.slapTilt))
    }
  }

  /// a sticker slapped down: 0→1 falling in big and flat-fast, 1→2 squash and spring back (back ease)
  private func slapP(_ ms: Double, at: Double, small: Bool) -> Double {
    let fall: Double = small ? 160 : 220
    let dt = ms - at
    if dt <= 0 { return 0 }
    if dt < fall { return easeInQuad(dt / fall) }
    return 1 + backOut(min(1, (dt - fall) / 380))
  }
}

/// React Native's Slapped: arrives large from above, squashes on landing, springs back, settles tilted.
private struct KRitualSlap: ViewModifier {
  let p: Double
  let tilt: Double

  func body(content: Content) -> some View {
    let scale = p <= 1 ? 1.35 - 0.35 * p : 1
    let squash = p > 1 && p < 1.5 ? 1 - (p - 1) / 0.5 : 0
    content
      .rotationEffect(.degrees(tilt * min(1, p)))
      .scaleEffect(x: scale * (1 + 0.12 * squash), y: scale * (1 - 0.18 * squash))
      .offset(y: p <= 1 ? -40 * (1 - p) : 0)
      .opacity(p < 0.05 ? 0 : 1)
  }
}

/// your window's roof
private struct KRitualRoof: Shape {
  func path(in r: CGRect) -> Path {
    var p = Path()
    p.move(to: CGPoint(x: r.midX, y: r.minY))
    p.addLine(to: CGPoint(x: r.maxX, y: r.maxY))
    p.addLine(to: CGPoint(x: r.minX, y: r.maxY))
    p.closeSubpath()
    return p
  }
}

/// A sealed envelope: the card face, its flap folded down to a wax seal; no ink edge, its depth
/// the page purple (rule B).
private struct KRitualEnvelope: View {
  let theme: KTheme

  var body: some View {
    GeometryReader { g in
      let w = g.size.width
      let h = g.size.height
      ZStack(alignment: .topLeading) {
        RoundedRectangle(cornerRadius: 4, style: .circular).fill(theme.sf)
        Path { p in
          p.move(to: CGPoint(x: 2, y: 2))
          p.addLine(to: CGPoint(x: w / 2, y: h * 0.56))
          p.addLine(to: CGPoint(x: w - 2, y: 2))
        }
        .stroke(theme.line, style: StrokeStyle(lineWidth: 1.2, lineCap: .round, lineJoin: .round))
        Circle()
          .fill(KBrand.brassSeal)
          .frame(width: 9, height: 9)
          .offset(x: w / 2 - 4.5, y: h * 0.56 - 4.5)
      }
      .kObjectDepth(theme, offset: 3, radius: 4)
    }
    .accessibilityHidden(true)
  }
}

// MARK: easing (the React Native ritual's curves)

private func clamp(_ x: Double) -> Double { min(1, max(0, x)) }
private func smooth(_ x: Double) -> Double { x * x * (3 - 2 * x) }
private func easeInQuad(_ t: Double) -> Double { t * t }
private func easeInOutQuad(_ t: Double) -> Double { t < 0.5 ? 2 * t * t : 1 - pow(-2 * t + 2, 2) / 2 }
private func easeOutCubic(_ t: Double) -> Double { 1 - pow(1 - t, 3) }
private func easeInOutSine(_ t: Double) -> Double { -(cos(.pi * t) - 1) / 2 }
/// Easing.out(Easing.back(2)): overshoots a little past 1, then settles
private func backOut(_ t: Double, _ s: Double = 2) -> Double {
  let u = 1 - t
  return 1 - (s + 1) * u * u * u + s * u * u
}
