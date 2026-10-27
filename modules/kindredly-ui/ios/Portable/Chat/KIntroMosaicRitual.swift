// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE INTRODUCTION'S MOSAIC RITUAL (2026-10-27, behind the "introritual" switch, OFF by default):
 the sticker-book ritual a kindred's introduction shows when there are no signatures (identity
 off, or names traded before it), redrawn from React Native's (src/components/IntroductionRitual
 .tsx MosaicRitual, kept as the fallback). Every beat is that file's, on the clock TS hands over
 (src/components/introduction-model.ts), in ms from the moment the sheet opened:

   ① THE ROAD (road 380, a letter every 240, each crossing in 620): your window on the left (a
      roof: home), theirs on the right (a sill); each letter arcs over in the order it left, the
      courier flying it, the day stamped on as it lands, the count at the far window ticking up
      with a pop. "10 LETTERS · THE ROAD TO A NAME" fades in after the last.
   ② BURST (burst 3700, 1100): their mosaic, sitting in the middle all along, blows apart: its own
      squares (TS burstScraps) thrown outward with a spin, lifted, then falling, gone by the end.
      SLAP (slap 4220): the kindred-green sticker with its white cut edge arrives big from above,
      squashes, springs back and settles at -3°.
   ③ TYPED (name 4740): the courier's mark •> arrives; 240 later a letter every 95; a jolt 80
      after the last; the mark goes 600 after it.
   ④ BUMP (bump 6240): your mosaic slides in from the left, theirs from the right, tilted; they
      meet overlapping, spring apart, and are faces (white-ringed) from the bump on. The two names
      fade in at +700, KINDREDS · date is slapped between them at +600.
   ⑤ NOTICE (7340): what she noticed, a sticker label with a ×2 corner when you both wear it.

 REDUCE MOTION (`still`), as React Native's reanimated does under the system setting: nothing
 travels. The crossings and the burst are not drawn, the stickers are already settled, the faces
 already met, the names and the road's line already there; the counts still tick up as each
 letter would have landed and the name is still typed letter by letter (those are timers in
 React Native, not animations), with no pop and no jolt.

 ONE CLOCK, as KIntroRitual: every beat is a pure function of the time since `startAt`, drawn in
 a TimelineView that pauses once `beats.end` (8040, later while a long name is still typed) has
 passed. The road, the crossings, the stickers and the chip are KIntroRitual's own drawing (the
 signed ritual, the ceremony's), so the two rituals look the same where they show the same
 thing; this file keeps its own copy of them rather than reach into that one.

 VISUAL RULE B (owner, 2026-10-26): the envelopes, the window panes and the stickers are
 objects: no ink edge, the deep page-purple hard shadow (kObjectDepth). React Native's big
 sticker stands on a soft drop shadow; here it takes the object depth, as the ceremony's sticker
 did. The stickers keep their own print colours in every theme (white cut edge, kindred green,
 the green chip, the ink ×2), and so does the lit window's warm pane.

 The courier is the snapshot of her real WrenBird (a KImage, never redrawn). The •> on the
 sticker is her typographic mark, an ink dot and an amber chevron (GlyphInput.tsx WrenGlyph), not
 a drawing of her.

 VoiceOver: one element, the whole ritual as one sentence (`a11y`); the counts, the dates and the
 half-typed name are not read.
 */

/// The mosaic ritual's clock, in ms from the moment the sheet opened (TS introduction-model).
public struct KIntroMosaicBeats: Equatable, Sendable {
  public var road: Double = 380
  public var step: Double = 240
  public var fly: Double = 620
  public var burst: Double = 3700
  public var burstMs: Double = 1100
  public var slap: Double = 4220
  public var name: Double = 4740
  public var typeLead: Double = 240
  public var typeStep: Double = 95
  public var joltAfter: Double = 80
  public var caretAfter: Double = 600
  public var bump: Double = 6240
  public var notice: Double = 7340
  public var done: Double = 8040
  /// when nothing moves any more: done, or later while a long name is still typed
  public var end: Double = 8040

  public init() {}
}

/// One square of their mosaic: its middle, from the grid's middle, and its throw (TS burstScraps).
public struct KIntroMosaicScrap: Equatable, Sendable {
  public let x0: CGFloat
  public let y0: CGFloat
  public let ang: Double
  public let dist: CGFloat
  public let spin: Double

  public init(x0: CGFloat, y0: CGFloat, ang: Double, dist: CGFloat, spin: Double) {
    self.x0 = x0
    self.y0 = y0
    self.ang = ang
    self.dist = dist
    self.spin = spin
  }
}

/// Everything the mosaic ritual draws, every word and number worked out in TS.
public struct KIntroMosaicContent {
  public var beats = KIntroMosaicBeats()
  /// when the sheet opened: every beat counts from here
  public var startAt = Date()
  /// Reduce Motion: nothing travels (see the top of the file)
  public var still = false
  public var road: [KIntroRitualCrossing] = []
  public var youLabel = ""
  public var themLabel = ""
  public var roadLine = ""
  /// the envelopes' stamp (its dot); "" for none
  public var stamp = ""
  /// the courier, flying (her snapshot)
  public var bird: KImageRef?
  /// their name in capitals as it is typed: the text after each letter lands
  public var nameSteps: [String] = []
  public var scraps: [KIntroMosaicScrap] = []
  /// FACE v1 masks (TS mosaicMask at develop 1)
  public var myMask = 0
  public var theirMask = 0
  /// the faces each of you wears from the bump on
  public var myFace: KFaceSource = .placeholder
  public var theirFace: KFaceSource = .placeholder
  public var myName = ""
  public var otherName = ""
  /// "KINDREDS · OCT 14"
  public var chip = ""
  public var notice: KIntroRitualSticker?
  public var a11y = ""

  public init() {}
}

public struct KIntroMosaicRitual: View {
  private let theme: KTheme
  private let content: KIntroMosaicContent

  @State private var finished = false

  public init(theme: KTheme, content: KIntroMosaicContent) {
    self.theme = theme
    self.content = content
  }

  /// the burst and the name's box (React Native's 300 × 150 under the road)
  static let boxW: CGFloat = 300
  static let boxH: CGFloat = 150
  /// the kindred green: the mark of names traded (this sticker's alone)
  static let kindredGreen = Color(hex: "#7CC58F")
  static let scrapCell: CGFloat = 9

  public var body: some View {
    TimelineView(.animation(minimumInterval: nil, paused: finished)) { tl in
      ritual(finished ? content.beats.end + 1_000 : max(0, tl.date.timeIntervalSince(content.startAt) * 1000))
    }
    .frame(maxWidth: .infinity, alignment: .top)
    // a fixed picture, as React Native's is: its words are VoiceOver's sentence
    .dynamicTypeSize(...DynamicTypeSize.large)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(content.a11y)
    .task(id: content.startAt) {
      finished = false
      // a little past the end, so the last spring has settled
      let left = (content.beats.end + 400) / 1000 - Date().timeIntervalSince(content.startAt)
      if left > 0 { try? await Task.sleep(for: .seconds(left)) }
      if Task.isCancelled { return }
      finished = true
    }
  }

  @ViewBuilder
  private func ritual(_ ms: Double) -> some View {
    VStack(spacing: 0) {
      KIntroRoad(
        theme: theme,
        road: content.road,
        start: content.beats.road,
        step: content.beats.step,
        fly: content.beats.fly,
        reduced: content.still,
        youLabel: content.youLabel,
        themLabel: content.themLabel,
        roadLine: content.roadLine,
        stamp: content.stamp,
        bird: content.bird,
        ms: ms
      )
      burstAndName(ms)
        .frame(width: Self.boxW, height: Self.boxH)
        .padding(.top, 14)
      bump(ms)
        .frame(width: Self.boxW, height: 84)
        .padding(.top, 4)
      names(ms)
        .frame(width: Self.boxW)
      if let notice = content.notice {
        KIntroSticker(theme: theme, notice: notice)
          .modifier(KIntroSlap(p: content.still ? 2 : KIntroCurve.slapP(ms, at: content.beats.notice, small: false), tilt: notice.slapTilt))
          .padding(.top, 18)
      }
    }
  }

  // MARK: ② the burst, the slap, ③ the name typed on

  @ViewBuilder
  private func burstAndName(_ ms: Double) -> some View {
    let b = content.beats
    ZStack {
      // their mosaic, whole until the burst, then its squares thrown (not drawn under Reduce Motion:
      // React Native's burst lands at its end, every square gone, at once)
      if !content.still {
        let p = KIntroCurve.easeOutCubic(KIntroCurve.clamp((ms - b.burst) / b.burstMs))
        if p < 1 {
          ForEach(Array(content.scraps.enumerated()), id: \.offset) { _, s in
            scrap(s, p: p)
          }
        }
      }
      nameSticker(ms)
        .modifier(KIntroSlap(p: content.still ? 2 : KIntroCurve.slapP(ms, at: b.slap, small: false), tilt: -3))
        .frame(maxWidth: Self.boxW)
    }
  }

  private func scrap(_ s: KIntroMosaicScrap, p: Double) -> some View {
    let gravity = 90 * p * p
    let x = s.x0 + CGFloat(cos(s.ang)) * s.dist * CGFloat(p)
    let y = s.y0 + CGFloat(sin(s.ang)) * s.dist * CGFloat(p) * 0.6 - CGFloat(30 * sin(p * .pi)) + CGFloat(gravity)
    return Rectangle()
      .fill(theme.ink)
      .frame(width: Self.scrapCell, height: Self.scrapCell)
      .rotationEffect(.degrees(s.spin * p))
      .offset(x: x, y: y)
      .opacity(p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3)
  }

  /// the big sticker: white cut edge, kindred green, the name in heavy capitals as it is typed
  private func nameSticker(_ ms: Double) -> some View {
    let b = content.beats
    let steps = content.nameSteps
    // how many letters have landed: letter i (1-based) at name + typeLead + i × typeStep
    let typed = ms < b.name + b.typeLead ? 0 : min(steps.count, Int(floor((ms - b.name - b.typeLead) / b.typeStep)))
    let text = typed > 0 ? steps[typed - 1] : ""
    let last = b.name + b.typeLead + Double(steps.count) * b.typeStep
    let caret = ms >= b.name && ms < last + b.caretAfter
    // the jolt: 70 up (ease in-out), 260 back on the back curve; none under Reduce Motion
    var jolt = 0.0
    if !content.still {
      let dt = ms - (last + b.joltAfter)
      if dt > 0 { jolt = dt < 70 ? KIntroCurve.easeInOutQuad(dt / 70) : dt < 330 ? 1 - KIntroCurve.backOut((dt - 70) / 260) : 0 }
    }
    return HStack(spacing: 4) {
      ZStack {
        // one line's height from the start, so the sticker doesn't grow as the first letter lands
        Text(verbatim: "M").hidden()
        Text(verbatim: text)
      }
      .font(.system(size: 34, weight: .heavy))
      .tracking(-0.8)
      .foregroundStyle(KBrand.inkOnBrand)
      .lineLimit(1)
      .minimumScaleFactor(0.5)
      if caret {
        KWrenGlyph(size: 26)
      }
    }
    .scaleEffect(1 + 0.06 * jolt)
    .padding(.horizontal, 22)
    .padding(.vertical, 12)
    .frame(minWidth: 150)
    .background(RoundedRectangle(cornerRadius: 10, style: .circular).fill(Self.kindredGreen))
    .padding(4)
    .background(RoundedRectangle(cornerRadius: 14, style: .circular).fill(KBrand.paperWhite))
    .kObjectDepth(theme, offset: KObjectDepth.offset, radius: 14)
  }

  // MARK: ④ the bump

  private func bump(_ ms: Double) -> some View {
    // 0 → 1: from off to the side to the collision (in quad, 420); 1 → 2: spring back (back, 420)
    var p = 2.0
    if !content.still {
      let dt = ms - content.beats.bump
      p = dt <= 0 ? 0 : dt < 420 ? KIntroCurve.easeInQuad(dt / 420) : 1 + KIntroCurve.backOut(min(1, (dt - 420) / 420))
    }
    return ZStack {
      bumper(side: -1, mask: content.myMask, face: content.myFace, p: p)
      bumper(side: 1, mask: content.theirMask, face: content.theirFace, p: p)
        .zIndex(2)
    }
  }

  private func bumper(side: CGFloat, mask: Int, face: KFaceSource, p: Double) -> some View {
    let cp = CGFloat(p)
    let x = p <= 1 ? side * (170 - (170 - 22) * cp) : side * (22 + 8 * (cp - 1))
    let tilt = Double(side) * (p <= 1 ? -10 * (1 - p) : 0)
    let mosaic = p < 1 ? 1 : max(0, 1 - (p - 1) * 3)
    let portrait = p < 1 ? 0 : min(1, (p - 1) * 3)
    let grow = 0.9 + 0.1 * min(1, max(0, p - 1))
    return ZStack {
      KMosaic(mask: mask, cell: 5.6, gap: 1.6, color: theme.ink)
        .opacity(mosaic)
      // the face, as a sticker: a white ring round it
      KFace(theme: theme, source: face, size: 62)
        .padding(3)
        .overlay(Circle().strokeBorder(KBrand.paperWhite, lineWidth: 3))
        .opacity(portrait)
        .scaleEffect(grow)
    }
    .frame(width: 64, height: 64)
    .rotationEffect(.degrees(tilt))
    .offset(x: x)
  }

  // the two names, and since when between them
  private func names(_ ms: Double) -> some View {
    let b = content.beats
    let shown = content.still ? 1 : KIntroCurve.easeInOutQuad(KIntroCurve.clamp((ms - b.bump - 700) / 300))
    return HStack(spacing: 10) {
      name(content.myName).opacity(shown)
      KIntroChip(text: content.chip)
        .modifier(KIntroSlap(p: content.still ? 2 : KIntroCurve.slapP(ms, at: b.bump + 600, small: true), tilt: 2))
      name(content.otherName).opacity(shown)
    }
  }

  private func name(_ text: String) -> some View {
    KIntroCapWidth(max: 120) {
      Text(verbatim: text)
        .kText(.system(13, .bold))
        .foregroundStyle(theme.ink)
        .lineLimit(1)
    }
  }
}

// MARK: - the road (KIntroRitual's, for the mosaic ritual)

/// The road between the two windows, as the ceremony's KIntroRitual draws it: the ground, the
/// dotted road, your window (a roof) and theirs (a sill), each letter crossing in its turn, the
/// counts ticking up with a pop, and the road's line under it all. `reduced`: no crossings, no pop,
/// the line already there, the counts still ticking as each letter would have landed.
struct KIntroRoad: View {
  let theme: KTheme
  let road: [KIntroRitualCrossing]
  let start: Double
  let step: Double
  let fly: Double
  let reduced: Bool
  let youLabel: String
  let themLabel: String
  let roadLine: String
  let stamp: String
  let bird: KImageRef?
  let ms: Double

  static let w: CGFloat = 300
  static let h: CGFloat = 144
  static let win: CGFloat = 34

  var body: some View {
    let w = Self.w
    let win = Self.win
    let x0 = win / 2 + 8
    let x1 = w - win / 2 - 8
    let y: CGFloat = 100 - 30
    let lands = road.indices.map { start + Double($0) * step + fly }
    // a letter lands at the window it was sent TO: theirs at yours, yours at theirs
    let atMine = road.indices.filter { !road[$0].mine }.map { lands[$0] }
    let atTheirs = road.indices.filter { road[$0].mine }.map { lands[$0] }
    let lineAt = start + Double(road.count) * step + fly + 100
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
      window(label: youLabel, landed: atMine, roof: true)
        .offset(x: x0 - win / 2 - 20, y: y - win / 2 - 14)
      window(label: themLabel, landed: atTheirs, roof: false)
        .offset(x: x1 - win / 2 - 20, y: y - win / 2 - 14)
      if !reduced {
        ForEach(Array(road.enumerated()), id: \.offset) { i, m in
          crossing(m, at: start + Double(i) * step, from: m.mine ? x0 : x1, to: m.mine ? x1 : x0, y: y)
        }
      }
    }
    .frame(width: w, height: Self.h, alignment: .topLeading)
    .overlay(alignment: .bottom) {
      Text(roadLine)
        .kText(.mono(10, .medium, tracking: 0.14))
        .foregroundStyle(theme.mute)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .opacity(reduced ? 1 : KIntroCurve.easeInOutQuad(KIntroCurve.clamp((ms - lineAt) / 400)))
    }
  }

  /// a window with its count of the letters that have landed on it; it pops as one lands
  private func window(label: String, landed: [Double], roof: Bool) -> some View {
    let win = Self.win
    let count = landed.filter { $0 <= ms }.count
    var pop = 0.0
    if !reduced, let last = landed.last(where: { $0 <= ms }) {
      let dt = ms - last
      pop = dt < 90 ? KIntroCurve.easeInOutQuad(dt / 90) : dt < 370 ? 1 - KIntroCurve.backOut((dt - 90) / 280) : 0
    }
    return VStack(spacing: 0) {
      // your side is home, a roof; theirs is a window in a wall we cannot see
      if roof {
        KIntroRoof()
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
  private func crossing(_ m: KIntroRitualCrossing, at: Double, from: CGFloat, to: CGFloat, y: CGFloat) -> some View {
    let dt = ms - at
    let flying = dt > 0 && dt < fly + 420
    let p = dt <= 0 ? 0 : dt < fly ? KIntroCurve.easeInOutSine(dt / fly) : 1
    let q = dt < fly ? 0 : KIntroCurve.easeOutCubic(min(1, (dt - fly) / 420))
    let dir: CGFloat = to > from ? 1 : -1
    let x = from + (to - from) * CGFloat(p)
    let yy = y - 58 * CGFloat(sin(p * .pi)) - 12 * CGFloat(q)
    let s = KIntroCurve.clamp(q * 2.5)
    return ZStack {
      // the courier, small, over the letter, facing the way she flies
      if let bird {
        KImage(bird, size: CGSize(width: 26, height: 26), contentMode: .fit, placeholder: .clear)
          .scaleEffect(x: dir, y: 1)
          .offset(y: -23)
      }
      // no ink edge: an object, its depth the page purple
      ZStack(alignment: .topTrailing) {
        RoundedRectangle(cornerRadius: 3, style: .circular).fill(theme.sf)
        Rectangle().fill(theme.line).frame(height: 1).frame(maxHeight: .infinity, alignment: .top)
        if !stamp.isEmpty {
          KStamp(id: stamp, width: KStampFrame.dotPt, dark: theme.isDark)
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
}

// MARK: - the stickers (KIntroRitual's)

/// KINDREDS · date: the green chip, a sticker with its own print in every theme.
struct KIntroChip: View {
  let text: String

  var body: some View {
    Text(text)
      .kText(.mono(9, .semibold, tracking: 1.4 / 9))
      .foregroundStyle(KBrand.greenText)
      .lineLimit(1)
      .fixedSize()
      .padding(.horizontal, 10.5)
      .padding(.vertical, 4.5)
      .background(Capsule().fill(KBrand.paperWhite))
      .overlay(Capsule().strokeBorder(KBrand.greenText, lineWidth: 1.5))
  }
}

/// What she noticed, as a sticker label (React Native's StickerChip, size lg) with a ×2 corner
/// when you both wear it; an object under rule B.
struct KIntroSticker: View {
  let theme: KTheme
  let notice: KIntroRitualSticker

  var body: some View {
    ZStack(alignment: .topTrailing) {
      Text(notice.name)
        .kText(.system(13.5, .bold))
        .foregroundStyle(notice.fg)
        .lineLimit(1)
        .fixedSize()
        .padding(.horizontal, 15)
        .padding(.vertical, 8)
        .background(RoundedRectangle(cornerRadius: notice.radius, style: .circular).fill(notice.bg))
        .overlay(RoundedRectangle(cornerRadius: notice.radius, style: .circular).strokeBorder(notice.border, lineWidth: 2))
        // the white cut edge
        .padding(3)
        .background(RoundedRectangle(cornerRadius: notice.radius + 3, style: .circular).fill(KBrand.paperWhite))
        .kObjectDepth(theme, offset: 3, radius: notice.radius + 3)
      if notice.shared {
        Text(verbatim: "×2")
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
    .rotationEffect(.degrees(notice.tilt))
  }
}

/// The courier's typographic mark, •>: an ink eye and an amber beak, the same in every theme
/// (src/components/GlyphInput.tsx WrenGlyph, viewBox 1.1 × 0.5). Drawn, not typed, so the eye
/// sits on the name's x-height whatever the face.
struct KWrenGlyph: View {
  let size: CGFloat

  var body: some View {
    Canvas { gc, box in
      let s = box.width / 1.1
      gc.fill(Path(ellipseIn: CGRect(x: 0.01 * s, y: 0.13 * s, width: 0.24 * s, height: 0.24 * s)), with: .color(KBrand.inkOnBrand))
      var beak = Path()
      beak.move(to: CGPoint(x: 0.5 * s, y: 0.03 * s))
      beak.addLine(to: CGPoint(x: 0.98 * s, y: 0.25 * s))
      beak.addLine(to: CGPoint(x: 0.5 * s, y: 0.47 * s))
      gc.stroke(beak, with: .color(KBrand.waxGold), style: StrokeStyle(lineWidth: 0.14 * s, lineCap: .round, lineJoin: .round))
    }
    .frame(width: size * 1.1, height: size * 0.5)
    .accessibilityHidden(true)
  }
}

/// React Native's Slapped: arrives large from above, squashes on landing, springs back, settles tilted.
struct KIntroSlap: ViewModifier {
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
struct KIntroRoof: Shape {
  func path(in r: CGRect) -> Path {
    var p = Path()
    p.move(to: CGPoint(x: r.midX, y: r.minY))
    p.addLine(to: CGPoint(x: r.maxX, y: r.maxY))
    p.addLine(to: CGPoint(x: r.minX, y: r.maxY))
    p.closeSubpath()
    return p
  }
}

/// A view as wide as its content, at most `max`: React Native's maxWidth (a SwiftUI frame with a
/// maxWidth would grow a short name to it).
struct KIntroCapWidth<Content: View>: View {
  let max: CGFloat
  @ViewBuilder let content: () -> Content

  var body: some View {
    KIntroCapLayout(max: max) { content() }
  }
}

private struct KIntroCapLayout: Layout {
  let max: CGFloat

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    guard let s = subviews.first else { return .zero }
    return s.sizeThatFits(ProposedViewSize(width: Swift.min(proposal.width ?? max, max), height: proposal.height))
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    subviews.first?.place(at: bounds.origin, proposal: ProposedViewSize(width: bounds.width, height: bounds.height))
  }
}

// MARK: easing (React Native's curves)

enum KIntroCurve {
  static func clamp(_ x: Double) -> Double { Swift.min(1, Swift.max(0, x)) }
  static func easeInQuad(_ t: Double) -> Double { t * t }
  /// reanimated's withTiming default, Easing.inOut(Easing.quad)
  static func easeInOutQuad(_ t: Double) -> Double { t < 0.5 ? 2 * t * t : 1 - pow(-2 * t + 2, 2) / 2 }
  static func easeOutCubic(_ t: Double) -> Double { 1 - pow(1 - t, 3) }
  static func easeInOutSine(_ t: Double) -> Double { -(cos(.pi * t) - 1) / 2 }
  /// Easing.out(Easing.back(2)): overshoots a little past 1, then settles
  static func backOut(_ t: Double, _ s: Double = 2) -> Double {
    let u = 1 - t
    return 1 - (s + 1) * u * u * u + s * u * u
  }

  /// a sticker slapped down: 0 → 1 falling in big and flat-fast (in quad, 220; 160 small),
  /// 1 → 2 squash and spring back (back, 380)
  static func slapP(_ ms: Double, at: Double, small: Bool) -> Double {
    let fall: Double = small ? 160 : 220
    let dt = ms - at
    if dt <= 0 { return 0 }
    if dt < fall { return easeInQuad(dt / fall) }
    return 1 + backOut(min(1, (dt - fall) / 380))
  }
}
