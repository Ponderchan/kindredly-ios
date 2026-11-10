import SwiftUI

/*
 THE WRITING AURA GUIDE, AS A REEL, in SwiftUI — src/components/guide-reel/aura.tsx, scene for
 scene: a letter goes and three things in it light up (a short line measured, a word that came
 back circled, the laugh marked), each with the sticker it would become; the nine dimensions
 filling a piece of evidence at a time and locking one after another; a name forming, the
 stickers slapped on and the title's own scene going from sketch to colour; the whole thing inside
 a phone that locks, ON THIS PHONE ONLY; the title. Every size is the React Native one.
 Words (TS): cp.travel, ga.phoneOnly, gd.aura.title, laugh (the laugh in the reader's language,
 cut from st.laugh_tracker.line as React Native cuts it), name (titleName of the reel's one
 title), dim.<key> (dimLabel of the nine). Facts: stickers "<id>#<i>" (stickerLook + its name),
 colors dim.<key> (DIMENSION_INK). Pictures: scene and sketch (the quick storyteller's).
 */
enum KReelAura {
  static let navy = KReelInk.navy
  static let back = KReelEase.outBack(1.7)
  static let slap = KReelEase.outBack(1.4)
  static let shut = KReelEase.outBack(2.2)
  static let soft = KReelEase.inOutQuad
  static let out = KReelEase.outCubic
  static let order = ["sentence", "structure", "perspective", "rhythm", "function", "vocabulary", "punctuation", "emotion", "quirks"]
  /// where each bar pauses on its way to full (the evidence arriving)
  static let steps: [[Double]] = [[0.3, 0.5, 0.75], [0.2, 0.45, 0.8], [0.35, 0.6, 0.7], [0.25, 0.55, 0.85], [0.3, 0.4, 0.7], [0.15, 0.5, 0.75], [0.4, 0.65, 0.8], [0.2, 0.35, 0.7], [0.3, 0.6, 0.9]]

  static let def = KReelDef(bg: KReelInk.penWash, scenes: [
    KReelScene(key: "aura-read", ms: 3400) { AnyView(Read(x: $0)) },
    KReelScene(key: "aura-nine", ms: 3400) { AnyView(Nine(x: $0)) },
    KReelScene(key: "aura-named", ms: 3200) { AnyView(Named(x: $0)) },
    KReelScene(key: "aura-private", ms: 3200) { AnyView(Private(x: $0)) },
    KReelScene(key: "aura-title", ms: 2800) { AnyView(Title(x: $0)) },
  ])

  // MARK: small movers

  static func riseAt(_ c: KReelClock, _ delay: Double, _ dy: CGFloat) -> (CGFloat, Double) {
    let v = c.once(460, delay, out)
    return ((1 - CGFloat(v)) * dy, v)
  }

  static func ink(_ x: KReelCtx, _ key: String) -> Color { kReelColor(x.data.colors["dim.\(key)"] ?? "#5B55FF") }

  /* the sticker, drawn at the reel's size: its dimension's ink, the white cut edge, the tilt */
  struct Sticker: View {
    let x: KReelCtx
    let id: String
    let i: Int
    var k: CGFloat = 1
    let maxW: CGFloat
    var body: some View {
      /* every value is named and typed first, and the chain is cut in two: one long chain of
         modifiers over optional lookups did not type-check "in reasonable time" on the cloud
         build's compiler (EAS, 2026-11-10), though it did on this Mac's */
      let look = x.data.stickers["\(id)#\(i)"]
      let fs: CGFloat = x.s * 0.04 * k
      let pill: Bool = look?.pill ?? true
      let outerR: CGFloat = pill ? 999 : fs * 0.55
      let innerR: CGFloat = pill ? 999 : fs * 0.4
      let name: String = look?.name ?? ""
      let fg: Color = kReelColor(look?.fg ?? "#FFFFFF")
      let bg: Color = kReelColor(look?.bg ?? "#5B55FF")
      let edge: Color = kReelColor(look?.border ?? "#5B55FF")
      let edgeW: CGFloat = max(1.5, fs * 0.12)
      let tilt: Double = Double(look?.tilt ?? 0)
      let shade: Color = navy.opacity(0.2)
      let inner = RoundedRectangle(cornerRadius: innerR)
      let outer = RoundedRectangle(cornerRadius: outerR)
      let label = Text(name)
        .font(KReelFont.sys(fs, .bold))
        .foregroundStyle(fg)
        .kReelFit()
        .padding(.horizontal, fs * 0.8)
        .padding(.vertical, fs * 0.32)
        .background(inner.fill(bg))
        .overlay(inner.strokeBorder(edge, lineWidth: edgeW))
      let cut = outer.fill(Color.white).shadow(color: shade, radius: fs * 0.4, x: 0, y: fs * 0.3)
      return label
        .padding(fs * 0.22)
        .background(cut)
        .rotationEffect(.degrees(tilt))
        .frame(maxWidth: maxW, alignment: .leading)
        .fixedSize(horizontal: false, vertical: true)
    }
  }

  /* a hand's worth of writing: cursive humps, loops and tall loops on a baseline (aura.tsx scribble) */
  static func scribble(_ w: CGFloat, _ h: CGFloat, _ seed: Int) -> Path {
    let base = h * 0.78, xh = h * 0.34, top = h * 0.1
    let n = max(1, Int((w / (h * 0.34)).rounded()))
    let st = (w - 2) / CGFloat(n)
    var x: CGFloat = 1
    var p = Path()
    p.move(to: CGPoint(x: x, y: base))
    for i in 0..<n {
      let k = (seed * 7 + i * 5 + ((i * i) % 3)) % 5
      let a = x, b = x + st
      if k == 0 {
        p.addCurve(to: CGPoint(x: a + st * 0.6, y: top), control1: CGPoint(x: a + st * 0.85, y: base - xh * 0.7), control2: CGPoint(x: a + st, y: top))
        p.addCurve(to: CGPoint(x: b, y: base), control1: CGPoint(x: a + st * 0.2, y: top), control2: CGPoint(x: a + st * 0.3, y: base))
      } else if k % 2 == 1 {
        p.addCurve(to: CGPoint(x: b, y: base), control1: CGPoint(x: a + st * 0.12, y: base - xh * 1.3), control2: CGPoint(x: b - st * 0.12, y: base - xh * 1.3))
      } else {
        p.addCurve(to: CGPoint(x: a + st * 0.5, y: base - xh), control1: CGPoint(x: a + st * 0.9, y: base - xh * 0.5), control2: CGPoint(x: a + st * 0.8, y: base - xh))
        p.addCurve(to: CGPoint(x: b, y: base), control1: CGPoint(x: a + st * 0.15, y: base - xh), control2: CGPoint(x: a + st * 0.25, y: base))
      }
      x = b
    }
    return p
  }

  struct Scribble: View {
    let w: CGFloat
    let h: CGFloat
    let seed: Int
    var body: some View {
      scribble(w, h, seed)
        .stroke(navy, style: StrokeStyle(lineWidth: max(1.6, h * 0.075), lineCap: .round, lineJoin: .round))
        .frame(width: w, height: h)
    }
  }

  /// a strip that uncovers what's in it, left to right — the pen moving
  struct Reveal<Content: View>: View {
    let c: KReelClock
    let w: CGFloat
    let h: CGFloat
    let ms: Double
    let delay: Double
    @ViewBuilder let content: () -> Content
    var body: some View {
      let v = c.once(ms, delay, soft)
      return HStack(alignment: .top, spacing: 0) { content() }
        .frame(width: w, height: h, alignment: .topLeading)
        .frame(width: w * CGFloat(v), height: h, alignment: .topLeading)
        .clipped()
    }
  }

  // MARK: 1 · a letter goes, and the aura reads it

  static let wR1: Double = 260, wR2: Double = 500, wR3: Double = 760
  static let tap: Double = 1100, measure: Double = 1280
  static let chip1: Double = 1420, ringA: Double = 1600, ringB: Double = 1700, chip2: Double = 1840, mark: Double = 2040, chip3: Double = 2180

  struct Read: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let rowH = s * 0.09, x0 = s * 0.12, gap = s * 0.026
      let rows: [CGFloat] = [0.21, 0.37, 0.53].map { s * $0 }
      let r1a = s * 0.11, r1b = s * 0.13, dot = s * 0.016
      let r1w = r1a + gap + r1b + s * 0.008 + dot
      let wa = s * 0.085, wb = s * 0.12
      let r2w = wa + gap + wb + gap + wa
      let w3 = s * 0.12
      let r3w = s * 0.37
      let laughMax = r3w - w3 - gap - 2
      let chipX = s * 0.5, chipMax = s * 0.46
      let measureH = s * 0.03
      let msw = max(1.5, s * 0.005)
      let card = riseAt(c, 0, s * 0.04)
      let key = riseAt(c, 150, s * 0.03)
      let press = c.seq(tap, [KReelStep(to: 1, ms: 120), KReelStep(to: 0, ms: 320)])
      let band = c.once(300, mark, soft)
      return ZStack(alignment: .topLeading) {
        // the letter, its rules riding in with it
        ZStack(alignment: .topLeading) {
          ForEach(0..<3, id: \.self) { i in
            kReelColor("rgba(58,58,245,0.14)").kReelBox(s * 0.04, rows[i] + rowH * 0.3 - s * 0.1, s * 0.8, 1)
          }
        }
        .frame(width: s * 0.88, height: s * 0.58, alignment: .topLeading)
        .background(RoundedRectangle(cornerRadius: s * 0.035).fill(Color.white).shadow(color: navy.opacity(0.08), radius: s * 0.04, x: 0, y: s * 0.015))
        .offset(y: card.0)
        .opacity(card.1)
        .offset(x: s * 0.06, y: s * 0.1)

        Reveal(c: c, w: r1w + 2, h: rowH, ms: 260, delay: wR1) {
          Scribble(w: r1a, h: rowH, seed: 3)
          Color.clear.frame(width: gap, height: 1)
          Scribble(w: r1b, h: rowH, seed: 8)
          Circle().fill(navy).frame(width: dot, height: dot).padding(.leading, s * 0.008).padding(.top, rowH * 0.78 - dot * 0.6)
        }
        .offset(x: x0, y: rows[0] - rowH / 2)
        Reveal(c: c, w: r2w + 2, h: rowH, ms: 300, delay: wR2) {
          Scribble(w: wa, h: rowH, seed: 5)
          Color.clear.frame(width: gap, height: 1)
          Scribble(w: wb, h: rowH, seed: 2)
          Color.clear.frame(width: gap, height: 1)
          Scribble(w: wa, h: rowH, seed: 5)
        }
        .offset(x: x0, y: rows[1] - rowH / 2)
        // line 3 — the laugh is the one thing that reads as letters
        Reveal(c: c, w: r3w, h: rowH, ms: 300, delay: wR3) {
          Scribble(w: w3, h: rowH, seed: 11)
          Text(x.w("laugh"))
            .font(KReelFont.letter(s * 0.07, x.face))
            .foregroundStyle(navy)
            .kReelFit()
            .padding(.horizontal, s * 0.012)
            .frame(height: rowH)
            .background(alignment: .leading) {
              GeometryReader { g in
                RoundedRectangle(cornerRadius: s * 0.012).fill(ink(x, "quirks"))
                  .frame(width: g.size.width * CGFloat(band), height: rowH * 0.74)
                  .offset(y: rowH * 0.14)
              }
            }
            .frame(maxWidth: laughMax, alignment: .leading)
            .padding(.leading, gap)
        }
        .offset(x: x0, y: rows[2] - rowH / 2)

        // what the aura picks out — how long the line is
        Reveal(c: c, w: r1w, h: measureH, ms: 320, delay: measure) {
          Path { p in
            p.move(to: CGPoint(x: msw, y: msw))
            p.addLine(to: CGPoint(x: msw, y: measureH - msw))
            p.move(to: CGPoint(x: msw, y: measureH / 2))
            p.addLine(to: CGPoint(x: r1w - msw, y: measureH / 2))
            p.move(to: CGPoint(x: r1w - msw, y: msw))
            p.addLine(to: CGPoint(x: r1w - msw, y: measureH - msw))
          }
          .stroke(navy, style: StrokeStyle(lineWidth: msw * 2, lineCap: .round))
          .frame(width: r1w, height: measureH)
        }
        .offset(x: x0, y: rows[0] + rowH * 0.5 + s * 0.012)
        // … the word you reach for, twice
        Ring(x: x, cx: x0 + wa / 2, cy: rows[1], w: wa + s * 0.045, h: rowH * 1.02, delay: ringA)
        Ring(x: x, cx: x0 + wa + gap + wb + gap + wa / 2, cy: rows[1], w: wa + s * 0.045, h: rowH * 1.02, delay: ringB)

        // the stickers they would become
        Sticker(x: x, id: "straight_shooter", i: 0, maxW: chipMax).modifier(KReelPop(c: c, delay: chip1, from: 0.3, ease: back, fade: 2)).offset(x: chipX, y: rows[0] - s * 0.052)
        Sticker(x: x, id: "repeat_offender", i: 1, maxW: chipMax).modifier(KReelPop(c: c, delay: chip2, from: 0.3, ease: back, fade: 2)).offset(x: chipX, y: rows[1] - s * 0.052)
        Sticker(x: x, id: "laugh_tracker", i: 2, maxW: chipMax).modifier(KReelPop(c: c, delay: chip3, from: 0.3, ease: back, fade: 2)).offset(x: chipX, y: rows[2] - s * 0.052)

        // the compose screen's send key, ink, square — it gives under the finger
        ZStack {
          KReelInk.ink
          KReelInk.pen.opacity(press)
          Text(x.w("cp.travel"))
            .font(KReelFont.mono(s * 0.045, .semibold))
            .tracking(s * 0.005)
            .foregroundStyle(Color.white)
            .kReelFit(1, min: 0.7)
            .padding(.horizontal, s * 0.05)
        }
        .frame(width: s * 0.88, height: s * 0.12)
        .clipped()
        .scaleEffect(1 - 0.04 * press)
        .offset(y: key.0)
        .opacity(key.1)
        .offset(x: s * 0.06, y: s * 0.73)
        KReelFinger(c: c, x: s * 0.7, y: s * 0.79, at: tap, size: s * 0.15)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  /// a pen ring around a word, in the word-choice ink
  struct Ring: View {
    let x: KReelCtx
    let cx: CGFloat
    let cy: CGFloat
    let w: CGFloat
    let h: CGFloat
    let delay: Double
    var body: some View {
      let sw = max(2, x.s * 0.009)
      return Ellipse()
        .stroke(ink(x, "vocabulary"), lineWidth: sw)
        .frame(width: w - 2 * sw, height: h - 2 * sw)
        .frame(width: w, height: h)
        .rotationEffect(.degrees(-6))
        .modifier(KReelPop(c: x.c, delay: delay, from: 0.5, ease: back, fade: 2))
        .offset(x: cx - w / 2, y: cy - h / 2)
    }
  }

  // MARK: 2 · the nine, each filling a piece of evidence at a time and locking when it holds

  struct DimRow: View {
    let x: KReelCtx
    let i: Int
    var body: some View {
      let s = x.s, c = x.c
      let key = order[i]
      let start = 120 + Double(i) * 80
      let end = 950 + Double(i) * 190
      let d = end - start
      let m = d * 0.17
      let p = (d - 4 * m) / 3
      let st = steps[i]
      let fill = c.seq(start, [KReelStep(to: st[0], ms: m, ease: out), KReelStep(to: st[1], ms: m, ease: out, hold: p), KReelStep(to: st[2], ms: m, ease: out, hold: p), KReelStep(to: 1, ms: m, ease: out, hold: p)])
      let lock = c.once(380, end, back)
      let lk = min(1, lock)
      let l = s * 0.046
      let barH = s * 0.032
      let barW = s * 0.81 - s * 0.34 - s * 0.03 - s * 0.065
      return HStack(spacing: 0) {
        Text(x.w("dim.\(key)"))
          .font(KReelFont.sys(s * 0.04, .semibold))
          .foregroundStyle(navy)
          .kReelFit(1, min: 0.65)
          .frame(width: s * 0.34, alignment: .leading)
          .opacity(0.45 + 0.55 * lk)
          .padding(.trailing, s * 0.03)
        ZStack(alignment: .leading) {
          Capsule().fill(KReelInk.penWash)
          Capsule().fill(ink(x, key)).frame(width: barW * CGFloat(fill)).opacity(0.5 + 0.5 * lk)
        }
        .frame(width: barW, height: barH)
        .clipShape(Capsule())
        ZStack(alignment: .topLeading) {
          KReelPath("M6 10V6.5a4 4 0 0 1 8 0V10", box: CGRect(x: 0, y: 0, width: 20, height: 22))
            .stroke(navy, style: StrokeStyle(lineWidth: 2.4 * l / 20, lineCap: .round))
          RoundedRectangle(cornerRadius: 2.2 * l / 20).fill(navy)
            .frame(width: 14 * l / 20, height: 11 * l / 20)
            .offset(x: 3 * l / 20, y: 9.5 * l / 20)
        }
        .frame(width: l, height: l * 1.1, alignment: .topLeading)
        .rotationEffect(.degrees((1 - lock) * -25))
        .scaleEffect(0.2 + 0.8 * lock)
        .opacity(min(1, lock * 2))
        .frame(width: s * 0.065, alignment: .trailing)
      }
      .frame(height: s * 0.087)
    }
  }

  struct Nine: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s
      let card = riseAt(x.c, 0, s * 0.03)
      return ZStack(alignment: .topLeading) {
        VStack(spacing: 0) {
          ForEach(0..<9, id: \.self) { i in
            DimRow(x: x, i: i)
            if i < 8 { Spacer(minLength: 0) }
          }
        }
        .padding(.horizontal, s * 0.045)
        .padding(.vertical, s * 0.03)
        .frame(width: s * 0.9, height: s * 0.875)
        .background(RoundedRectangle(cornerRadius: s * 0.045).fill(Color.white))
        .offset(y: card.0)
        .opacity(card.1)
        .offset(x: s * 0.05, y: s * 0.085)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  // MARK: 3 · a name forms

  struct Picture: View {
    let ref: KImageRef?
    let w: CGFloat
    let h: CGFloat
    var body: some View {
      KImage(ref, size: CGSize(width: w, height: h), contentMode: .fill, placeholder: .clear)
        .frame(width: w, height: h)
        .clipped()
    }
  }

  struct Named: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let cw = s * 0.8
      let ih = cw * 9 / 16
      let r = s * 0.05
      let colour = c.once(650, 1350, soft)
      let gone = c.once(260, 1600, soft)
      let cardTop = s * 0.1
      let card = riseAt(c, 0, s * 0.04)
      let top = UnevenRoundedRectangle(topLeadingRadius: r, bottomLeadingRadius: 0, bottomTrailingRadius: 0, topTrailingRadius: r)
      return ZStack(alignment: .topLeading) {
        VStack(alignment: .leading, spacing: 0) {
          ZStack {
            Picture(ref: x.img("sketch"), w: cw, h: ih)
            Picture(ref: x.img("scene"), w: cw, h: ih).opacity(colour)
          }
          .frame(width: cw, height: ih)
          .clipShape(top)
          // the name, centred in at least .21 of the square (its padding inside that)
          Text(x.w("name"))
            .font(KReelFont.sys(s * 0.068, .heavy))
            .tracking(-0.6)
            .kReelLine(s * 0.068, s * 0.078)
            .foregroundStyle(navy)
            .kReelFit(2, min: 0.7)
            .modifier(KReelPop(c: c, delay: 1700, from: 0.6, ease: back, fade: 2))
            .frame(width: cw - s * 0.1, alignment: .leading)
            .frame(minHeight: s * 0.21 - s * 0.09)
            .padding(.vertical, s * 0.045)
            .padding(.horizontal, s * 0.05)
            .background(alignment: .topLeading) {
              // while it forms: two grey lines where the name will be
              VStack(alignment: .leading, spacing: s * 0.025) {
                RoundedRectangle(cornerRadius: s * 0.01).fill(KReelInk.ink12).frame(width: cw * 0.62, height: s * 0.035)
                RoundedRectangle(cornerRadius: s * 0.01).fill(KReelInk.ink12).frame(width: cw * 0.38, height: s * 0.035)
              }
              .opacity(1 - gone)
              .offset(x: s * 0.05, y: s * 0.06)
            }
        }
        .frame(width: cw, alignment: .topLeading)
        .background(RoundedRectangle(cornerRadius: r).fill(Color.white).shadow(color: navy.opacity(0.12), radius: s * 0.05, x: 0, y: s * 0.02))
        .offset(y: card.0)
        .opacity(card.1)
        .offset(x: (s - cw) / 2, y: cardTop)

        Sticker(x: x, id: "straight_shooter", i: 0, k: 1.1, maxW: s * 0.55)
          .modifier(KReelPop(c: c, delay: 450, from: 1.9, ms: 360, ease: slap, fade: 3))
          .offset(x: s * 0.05, y: cardTop + ih - s * 0.06)
        Sticker(x: x, id: "scene_setter", i: 1, k: 1.1, maxW: s * 0.55)
          .modifier(KReelPop(c: c, delay: 900, from: 1.9, ms: 360, ease: slap, fade: 3))
          .frame(width: s * 0.95, alignment: .trailing)
          .offset(y: cardTop + s * 0.035)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  // MARK: 4 · it stays on the phone

  struct Private: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let pw = s * 0.46, ph = s * 0.64
      let px = (s - pw) / 2, py = s * 0.1
      let bw = max(2, s * 0.008)
      let inner = pw - 2 * bw - s * 0.05
      let halo = s * 0.022
      let glow = c.loop(900, 600)
      let phone = riseAt(c, 0, s * 0.03)
      let foot = riseAt(c, 1150, s * 0.02)
      return ZStack(alignment: .topLeading) {
        // the edge it stays inside
        RoundedRectangle(cornerRadius: s * 0.09)
          .strokeBorder(KReelInk.pen, lineWidth: max(2, s * 0.008))
          .opacity(0.2 + 0.65 * glow)
          .kReelBox(px - halo, py - halo, pw + halo * 2, ph + halo * 2)

        ZStack(alignment: .top) {
          Capsule().fill(navy).frame(width: s * 0.11, height: s * 0.022).offset(y: s * 0.022)
          VStack(alignment: .leading, spacing: 0) {
            Picture(ref: x.img("scene"), w: inner, h: inner * 9 / 16)
              .clipShape(RoundedRectangle(cornerRadius: s * 0.02))
            Text(x.w("name"))
              .font(KReelFont.sys(s * 0.036, .heavy))
              .foregroundStyle(navy)
              .kReelFit()
              .frame(width: inner, alignment: .leading)
              .padding(.top, s * 0.022)
            VStack(alignment: .leading, spacing: s * 0.02) {
              Sticker(x: x, id: "straight_shooter", i: 0, k: 0.7, maxW: inner).offset(y: -s * 0.012 * c.loop(1100, 0))
              Sticker(x: x, id: "laugh_tracker", i: 1, k: 0.7, maxW: inner).offset(y: -s * 0.012 * c.loop(1100, 350))
            }
            .frame(width: inner, alignment: .leading)
            .padding(.top, s * 0.022)
          }
          .padding(.top, s * 0.065)
        }
        .frame(width: pw - 2 * bw, height: ph - 2 * bw, alignment: .top)
        .offset(x: bw, y: bw)
        .frame(width: pw, height: ph, alignment: .topLeading)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: s * 0.07))
        .overlay(RoundedRectangle(cornerRadius: s * 0.07).strokeBorder(navy, lineWidth: bw))
        .offset(y: phone.0)
        .opacity(phone.1)
        .offset(x: px, y: py)

        // the lock sits on the phone's bottom edge, below the stickers
        LockBadge(x: x, cx: s / 2, cy: py + ph)

        Text(x.w("ga.phoneOnly"))
          .font(KReelFont.mono(s * 0.04, .semibold))
          .tracking(s * 0.004)
          .foregroundStyle(navy)
          .kReelFit()
          .frame(width: s * 0.88)
          .offset(y: foot.0)
          .opacity(foot.1)
          .offset(x: s * 0.06, y: s * 0.865)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  struct LockBadge: View {
    let x: KReelCtx
    let cx: CGFloat
    let cy: CGFloat
    var body: some View {
      let s = x.s, c = x.c
      let d = s * 0.19
      let pop = c.once(420, 300, back)
      let sh = c.once(320, 900, shut)
      let ring = c.pulse(1300, 1150, KReelEase.outQuad)
      let l = d * 0.48
      return ZStack(alignment: .topLeading) {
        Circle().strokeBorder(KReelInk.pen, lineWidth: max(2, s * 0.008))
          .frame(width: d, height: d)
          .scaleEffect(1 + 0.7 * ring)
          .opacity(min(1, sh) * 0.6 * (1 - ring))
        ZStack {
          Circle().fill(KReelInk.pen)
          Circle().strokeBorder(Color.white, lineWidth: max(2, s * 0.012))
          ZStack(alignment: .topLeading) {
            KReelPath("M6 10V6.5a4 4 0 0 1 8 0V10", box: CGRect(x: 0, y: 0, width: 20, height: 22))
              .stroke(Color.white, style: StrokeStyle(lineWidth: 2.6 * l / 20, lineCap: .round))
              .frame(width: l, height: l * 1.1)
              .offset(y: -d * 0.12 * (1 - sh))
            RoundedRectangle(cornerRadius: 2.2 * l / 20).fill(Color.white)
              .frame(width: 14 * l / 20, height: 11 * l / 20)
              .offset(x: 3 * l / 20, y: 9.5 * l / 20)
            Circle().fill(KReelInk.pen)
              .frame(width: 3.2 * l / 20, height: 3.2 * l / 20)
              .offset(x: 8.4 * l / 20, y: 13.4 * l / 20)
          }
          .frame(width: l, height: l * 1.1, alignment: .topLeading)
        }
        .frame(width: d, height: d)
        .scaleEffect(0.3 + 0.7 * pop)
        .opacity(min(1, pop * 2))
      }
      .frame(width: d, height: d, alignment: .topLeading)
      .offset(x: cx - d / 2, y: cy - d / 2)
    }
  }

  // MARK: 5 · the title, big

  struct Title: View {
    let x: KReelCtx
    var body: some View {
      let words = KReelBigType.words(x.w("gd.aura.title"))
      let hit = words.firstIndex { $0.range(of: "aura", options: .caseInsensitive) != nil } ?? 0
      return KReelBigType(c: x.c, s: x.s, words: words, accent: [hit])
    }
  }
}
