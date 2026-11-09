import SwiftUI

/*
 THE MOOD STAMPS GUIDE, AS A REEL, in SwiftUI — src/components/guide-reel/stamps.tsx, scene for
 scene: the send key filling to twenty and turning into PICK A MOOD STAMP; three stamps read off
 the letter fanning out and one picked; all thirty-six riffling in; the picked one landing on the
 envelope, the key now LET IT TRAVEL; Stamp Press, a moment photographed and pressed into a stamp
 of its own, named and given a filter; the title. The ground is the stamp tray's lavender.
 The stamps are the real ones (KStamp), at the guide-reel widths the React Native scene snaps to.
 The pressed photo stamp is the photo stamp's own cut (lib/stamp-frame PHOTO_STAMP: its path,
 its sixteen bites, the hairline at a small size, the soft shadow at a large one), sent by TS,
 with the press's stand-in picture (a sky, the sun, a green hill) in its four flat colours, each
 filter's look applied to those colours as stamps.tsx `looked` does.
 Words (TS): cp.travel, cp.needStamp, cp.forThisLetter, cs2.ed.topicPh, gd.stamps.pressTopic,
 cs2.cam.hint, cs2.ed.fcBadge, cs2.ed.f.<filter>, gd.stamps.title, fan.<id> (a stamp's name,
 upper-cased), tag (the chosen one's #name). Facts: lists suggested / all / row / locked /
 reelWidths / bites ("x,y"), nums openingMin, colors nameLight.<id>, chosen, topic, strings
 photo.d in words.
 */
enum KReelStamps {
  static let chosen = "made-my-day"
  static let tagInk = KReelInk.navy // TOPIC_TAG_INK
  static let v3Ink = KReelInk.navy // STAMP_V3_INK
  static let lime = kReelColor("#D8F04A")
  static let waxGold = kReelColor("#D8A63F")

  static let def = KReelDef(bg: KReelInk.tray, scenes: [
    KReelScene(key: "count", ms: 3300) { AnyView(Count(x: $0)) },
    KReelScene(key: "suggest", ms: 3200) { AnyView(Suggest(x: $0)) },
    KReelScene(key: "all", ms: 3000) { AnyView(All(x: $0)) },
    KReelScene(key: "land", ms: 3200) { AnyView(Land(x: $0)) },
    KReelScene(key: "press", ms: 5200) { AnyView(Press(x: $0)) },
    KReelScene(key: "title", ms: 2600) { AnyView(Title(x: $0)) },
  ])

  /// ComposeTray StampGlyph: the perforated square and a smile, 24-unit art
  struct StampGlyph: View {
    let size: CGFloat
    var body: some View {
      let k = size / 24
      return ZStack(alignment: .topLeading) {
        RoundedRectangle(cornerRadius: 1 * k)
          .stroke(KReelInk.ink, style: StrokeStyle(lineWidth: 1.6 * k, dash: [1.4 * k, 1.6 * k]))
          .frame(width: 17 * k, height: 17 * k)
          .offset(x: 3.5 * k, y: 3.5 * k)
        Circle().fill(KReelInk.ink).frame(width: 2.2 * k, height: 2.2 * k).offset(x: 8.3 * k, y: 9.3 * k)
        Circle().fill(KReelInk.ink).frame(width: 2.2 * k, height: 2.2 * k).offset(x: 13.5 * k, y: 9.3 * k)
        KReelPath("M8.9 14.1c1.1 1.6 5.1 1.6 6.2 0")
          .stroke(KReelInk.ink, style: StrokeStyle(lineWidth: 1.6 * k, lineCap: .round))
          .frame(width: size, height: size)
      }
      .frame(width: size, height: size, alignment: .topLeading)
    }
  }

  // MARK: 1 · the key fills to twenty and asks for a stamp

  static let lines: [CGFloat] = [0.94, 0.8, 0.58]

  struct Count: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let min20 = x.num("openingMin", 20)
      let v = c.step(min20, 65, 300)
      let n = Int(floor(v))
      // the key lights once the count is whole (at once with less motion, as the count is)
      let lit = c.once(320, 300 + min20 * 65, KReelEase.outCubic)
      let press = c.press(2450, down: 120, up: 220)
      let nudge = c.loop(520, 1900)
      let cl = s * 0.07, ct = s * 0.14, cw = s * 0.86, chh = s * 0.74
      let pd = s * 0.055, kh = s * 0.15, g = s * 0.025
      let keyL = pd + kh + g
      let keyW = cw - 2 * pd - kh - g
      let fx = cl + keyL + keyW * 0.55
      let fy = ct + chh - pd - kh * 0.5
      let fieldW = cw - 2 * pd
      let corner = s * 0.14
      let lineH = max(3, s * 0.017)
      let labelSize = s * 0.04
      let bw = max(1.5, s * 0.0047)
      let sum = lines.reduce(0, +)
      let lit1 = 1 - 0.04 * press
      let keyScale = (1 + 0.06 * sin(lit * .pi)) * lit1
      return ZStack(alignment: .topLeading) {
        ZStack(alignment: .topLeading) {
          // the corner where the stamp goes, still empty
          RoundedRectangle(cornerRadius: s * 0.014)
            .fill(KReelInk.penWash)
            .overlay(RoundedRectangle(cornerRadius: s * 0.014).strokeBorder(KReelInk.pen, style: StrokeStyle(lineWidth: bw, dash: [3 * bw, 3 * bw])))
            .frame(width: corner, height: corner)
            .rotationEffect(.degrees(8))
            .offset(x: cw - 2 - pd - corner, y: pd * 0.8)
          // the letter, being written
          VStack(alignment: .leading, spacing: s * 0.04) {
            ForEach(0..<lines.count, id: \.self) { i in
              let from = lines[..<i].reduce(0, +) / sum
              let len = lines[i] / sum
              let p = KReelClock.clamp01((v / min20 - Double(from)) / Double(len))
              Capsule().fill(KReelInk.ink).frame(width: fieldW * lines[i] * CGFloat(p), height: lineH)
            }
          }
          .offset(x: pd, y: pd + corner + s * 0.035)
          // the bar: the stamp key, and the send key
          HStack(spacing: g) {
            Circle().strokeBorder(KReelInk.ink, lineWidth: bw)
              .frame(width: kh, height: kh)
              .overlay(StampGlyph(size: kh * 0.59))
            ZStack(alignment: .leading) {
              ZStack(alignment: .leading) {
                KReelInk.penWash.frame(width: keyW * CGFloat(min(1, v / min20)))
                HStack(spacing: s * 0.022) {
                  Text(x.w("cp.travel"))
                    .font(KReelFont.mono(labelSize, .semibold))
                    .tracking(1.2)
                    .foregroundStyle(KReelInk.ink40)
                    .kReelFit()
                  Text("\(min(n, Int(min20)))/\(Int(min20))")
                    .font(KReelFont.mono(labelSize * 0.9, .semibold))
                    .foregroundStyle(KReelInk.ink60)
                    .fixedSize()
                }
                .padding(.horizontal, s * 0.03)
                .frame(width: keyW)
              }
              .frame(width: keyW, height: kh, alignment: .leading)
              .clipped()
              .overlay(Rectangle().strokeBorder(KReelInk.ink12, lineWidth: 1))
              .opacity(1 - lit)
              // clear: solid pen blue, asking for the stamp, the chevron leaning toward the stamp key
              ZStack(alignment: .leading) {
                KReelInk.pen
                KReelPath("M15 5 L8 12 L15 19")
                  .stroke(Color.white, style: StrokeStyle(lineWidth: 2.6 * s * 0.045 / 24, lineCap: .round, lineJoin: .round))
                  .frame(width: s * 0.045, height: s * 0.045)
                  .offset(x: s * 0.025 - s * 0.014 * nudge)
                Text(x.w("cp.needStamp"))
                  .font(KReelFont.mono(labelSize, .semibold))
                  .tracking(1.2)
                  .foregroundStyle(Color.white)
                  .multilineTextAlignment(.center)
                  .kReelFit(2)
                  .frame(width: keyW - s * 0.085)
                  .offset(x: s * 0.06)
              }
              .frame(width: keyW, height: kh)
              .opacity(lit)
            }
            .frame(width: keyW, height: kh)
            .scaleEffect(keyScale)
          }
          .frame(width: cw - 2 - 2 * pd, height: kh, alignment: .leading)
          .offset(x: pd, y: chh - 2 - pd - kh)
        }
        .frame(width: cw - 2, height: chh - 2, alignment: .topLeading)
        .offset(x: 1, y: 1)
        .frame(width: cw, height: chh, alignment: .topLeading)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: s * 0.04))
        .overlay(RoundedRectangle(cornerRadius: s * 0.04).strokeBorder(KReelInk.ink12, lineWidth: 1))
        .offset(x: cl, y: ct)
        KReelFinger(c: c, x: fx, y: fy, at: 2450, size: s * 0.15)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  // MARK: 2 · the album leads with stamps read off the letter; one is picked

  struct Suggest: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let fan = c.once(720, 250, KReelEase.outBack(1.3))
      let pick = c.once(260, 1950)
      let w = kReelSnap(s * 0.25, x.reelWidths)
      let cy = s * 0.5
      let ids = x.list("suggested")
      // the chosen one is drawn last (its zIndex 2)
      let order = ids.indices.sorted { (ids[$0] == chosen ? 1 : 0) < (ids[$1] == chosen ? 1 : 0) }
      return ZStack(alignment: .topLeading) {
        Text(x.w("cp.forThisLetter"))
          .font(KReelFont.mono(s * 0.038, .semibold))
          .tracking(1.8)
          .foregroundStyle(KReelInk.ink60)
          .fixedSize()
          .kReelRise(c, 100, dy: s * 0.04)
          .frame(width: s)
          .offset(y: s * 0.15)
        ForEach(order, id: \.self) { i in
          FanStamp(x: x, id: ids[i], i: i, w: w, cy: cy, fan: fan, pick: pick)
        }
        KReelFinger(c: c, x: s * 0.5 + w * 0.14, y: cy + w * 0.12, at: 1950, size: s * 0.15)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  struct FanStamp: View {
    let x: KReelCtx
    let id: String
    let i: Int
    let w: CGFloat
    let cy: CGFloat
    let fan: Double
    let pick: Double
    var body: some View {
      let s = x.s
      let isChosen = id == chosen
      let side = CGFloat(i - 1)
      let dx = side * s * 0.3
      let dy = abs(side) * s * 0.035
      let rot = Double(side) * 9
      let rise = s * 0.2
      let pad = w * 0.07
      let box = w * 1.15
      let h = w * 1.2
      let f = CGFloat(fan)
      let scale = (0.7 + 0.3 * f) * (isChosen ? 1 + 0.1 * CGFloat(pick) : 1)
      let op = KReelClock.clamp01(fan * 2.2) * (isChosen ? 1 : 1 - 0.6 * pick)
      return VStack(spacing: s * 0.006) {
        ZStack {
          if isChosen {
            RoundedRectangle(cornerRadius: w * 0.13).strokeBorder(KReelInk.pen, lineWidth: max(2, w * 0.035)).opacity(pick)
          }
          KReelStamp(id: id, width: w)
        }
        .frame(width: w + 2 * pad, height: h + 2 * pad)
        Text(x.w("fan.\(id)"))
          .font(KReelFont.mono(s * 0.032, .semibold))
          .tracking(0.4)
          .foregroundStyle(kReelColor(x.data.colors["nameLight.\(id)"] ?? "#111113"))
          .multilineTextAlignment(.center)
          .kReelFit(2)
          .frame(width: box)
          .opacity(KReelClock.clamp01((fan - 0.55) / 0.45))
      }
      .frame(width: box)
      .scaleEffect(scale)
      .rotationEffect(.degrees(rot * fan))
      .offset(x: dx * f, y: dy * f + (1 - min(1, f)) * rise)
      .opacity(op)
      .offset(x: s / 2 - box / 2, y: cy - h / 2 - pad)
    }
  }

  // MARK: 3 · all thirty-six riffle in, then a wave runs through them

  struct All: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let g = s * 0.76
      let cell = g / 6
      let tile = kReelSnap(cell * 0.82, x.reelWidths, max: (cell * 0.92) / 1.2)
      let tileH = tile * 1.2
      let top = s * 0.16
      let left = (s - g) / 2
      let badge = s * 0.3
      let ids = Array(x.list("all").prefix(36))
      return ZStack(alignment: .topLeading) {
        ForEach(0..<ids.count, id: \.self) { k in
          let r = k / 6, col = k % 6
          let inn = c.once(380, 120 + Double(r + col) * 55, KReelEase.outBack(1.6))
          let wave = c.once(540, 1900 + Double(r + col) * 40, KReelEase.inOutQuad)
          let tilt = Double(((r * 7 + col * 5) % 5) - 2) * 7
          KReelStamp(id: ids[k], width: tile)
            .scaleEffect(0.5 + 0.5 * inn)
            .rotationEffect(.degrees(tilt * (1 - inn)))
            .offset(y: -(1 - CGFloat(inn)) * s * 0.08 - CGFloat(sin(wave * .pi)) * tile * 0.18)
            .opacity(min(1, inn * 1.6))
            .offset(x: left + CGFloat(col) * cell + (cell - tile) / 2, y: top + CGFloat(r) * cell + (cell - tileH) / 2)
        }
        // how many there are
        Text("\(ids.count)")
          .font(KReelFont.sys(s * 0.13, .heavy))
          .tracking(-1)
          .foregroundStyle(Color.white)
          .frame(width: badge, height: badge)
          .background(Circle().fill(KReelInk.pen))
          .overlay(Circle().strokeBorder(Color.white, lineWidth: max(3, s * 0.014)))
          .kReelPop(c, 1350)
          .offset(x: (s - badge) / 2, y: top + g / 2 - badge / 2)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  // MARK: 4 · the picked stamp lands on the envelope; the key can let it go

  struct Land: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let ew = s * 0.74
      let eh = ew * 0.72
      let ex = (s - ew) / 2
      let ey = s * 0.15
      let sw = kReelSnap(ew * 0.22, x.reelWidths)
      let sh = sw * 1.2
      let land: Double = 930
      let drop = c.once(480, land - 480, KReelEase.inQuad)
      let thud = c.once(320, land, KReelEase.outQuad)
      let kh = s * 0.14
      let rowTop = ey + eh + s * 0.06
      let bw = max(1.5, s * 0.0047)
      // inside the paper's top-right corner, so the tilt doesn't hang off the edge
      let sx = ex + (ew * 200) / 212 - sw - ew * 0.06
      let sy = ey + ew * 0.075
      let d = CGFloat(drop)
      return ZStack(alignment: .topLeading) {
        KReelEnvelope(w: ew, sealed: false)
          .kReelRise(c, 0, dy: s * 0.04)
          .scaleEffect(1 - 0.035 * sin(thud * .pi))
          .offset(x: ex, y: ey)
        RoundedRectangle(cornerRadius: sw * 0.2)
          .strokeBorder(KReelInk.pen, lineWidth: max(2, s * 0.008))
          .frame(width: sw * 1.3, height: sh + sw * 0.3)
          .scaleEffect(1 + 0.7 * thud)
          .opacity(thud > 0 && thud < 1 ? 0.55 * (1 - thud) : 0)
          .offset(x: sx - sw * 0.15, y: sy - sw * 0.15)
        KReelStamp(id: chosen, width: sw)
          .scaleEffect(1.9 - 0.9 * d)
          .rotationEffect(.degrees(-22 + 30 * drop))
          .offset(x: -(1 - d) * s * 0.16, y: -(1 - d) * s * 0.02)
          .opacity(min(1, drop * 3))
          .offset(x: sx, y: sy)
        // the bar after: the stamp's own pill, and the key in solid ink
        HStack(spacing: s * 0.025) {
          Text(x.w("tag"))
            .font(KReelFont.mono(s * 0.036, .medium))
            .foregroundStyle(tagInk)
            .multilineTextAlignment(.center)
            .kReelFit(2)
            .padding(.horizontal, s * 0.03)
            .frame(height: kh)
            .background(Capsule().fill(kReelColor(x.data.colors["chosen"] ?? "#B9B5D0")))
            .overlay(Capsule().strokeBorder(tagInk, lineWidth: bw))
            .frame(maxWidth: ew * 0.46)
            .layoutPriority(1)
          Text(x.w("cp.travel"))
            .font(KReelFont.mono(s * 0.038, .semibold))
            .tracking(1.2)
            .foregroundStyle(Color.white)
            .kReelFit(1, min: 0.55)
            .padding(.horizontal, s * 0.025)
            .frame(maxWidth: .infinity)
            .frame(height: kh)
            .background(KReelInk.ink)
        }
        .frame(width: ew, height: kh)
        .kReelRise(c, 1300, dy: s * 0.04)
        .offset(x: ex, y: rowTop)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  // MARK: 5 · Stamp Press: a moment pressed into a stamp of its own

  /// the cut's paper on the 100 × 120 box
  static let paper = CGRect(x: 11, y: 8, width: 78, height: 104)
  static let aspect: CGFloat = 3 / 4
  static let cutCorner: CGFloat = 7
  static let biteR: CGFloat = 5
  static let dim = kReelColor("rgba(20,18,42,0.58)")

  /// a filter's look on four flat colours: white balance, exposure, lift, saturation (stamps.tsx LOOKS)
  struct Look {
    let gain: (Double, Double, Double)
    let ev: Double
    let lift: Double
    let sat: Double
  }

  static let looks: [String: Look] = [
    "original": Look(gain: (1, 1, 1), ev: 1, lift: 0, sat: 1),
    "vivid": Look(gain: (1, 1, 1), ev: 1.03, lift: 0.04, sat: 1.3),
    "warm": Look(gain: (1.07, 1, 0.9), ev: 1.1, lift: 0.03, sat: 1.12),
    "golden": Look(gain: (1.12, 1.03, 0.82), ev: 1.04, lift: 0, sat: 1.18),
    "film": Look(gain: (1.06, 1.03, 0.92), ev: 1.07, lift: 0.07, sat: 0.9),
    "airy": Look(gain: (0.98, 1, 1.03), ev: 1.22, lift: 0.05, sat: 0.94),
    "gilt": Look(gain: (1.14, 1.06, 0.78), ev: 1.13, lift: 0, sat: 1.18),
  ]

  /// stamps.tsx looked(): the look applied to one sRGB colour
  static func looked(_ hex: String, _ id: String) -> Color {
    let l = looks[id] ?? looks["original"]!
    let d = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
    guard d.count == 6, let v = UInt32(d, radix: 16) else { return .white }
    let r = Double((v >> 16) & 0xFF) / 255 * l.gain.0 * l.ev
    let g = Double((v >> 8) & 0xFF) / 255 * l.gain.1 * l.ev
    let b = Double(v & 0xFF) / 255 * l.gain.2 * l.ev
    let y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    func out(_ c: Double) -> Double {
      let q = l.lift + (1 - l.lift) * min(1, max(0, y + (c - y) * l.sat))
      return (q * 255).rounded() / 255
    }
    return Color(.sRGB, red: out(r), green: out(g), blue: out(b), opacity: 1)
  }

  static func pX(_ f: CGFloat) -> CGFloat { paper.minX + f * paper.width }
  static func pY(_ f: CGFloat) -> CGFloat { paper.minY + f * paper.height }

  /// the picture itself, in the box's units; the sky reaches well past the cut for the live view
  static func drawPicture(_ gc: GraphicsContext, look: String) {
    let sky = Gradient(colors: [looked("#9EC9F5", look), looked("#F6D9C6", look)])
    gc.fill(Path(CGRect(x: pX(-1), y: pY(-1), width: paper.width * 3, height: paper.height * 3)), with: .linearGradient(sky, startPoint: CGPoint(x: 0, y: pY(0)), endPoint: CGPoint(x: 0, y: pY(1))))
    let sr = 0.13 * paper.width
    let sun = CGPoint(x: pX(0.71), y: pY(0.18) + 0.13 * paper.width)
    gc.fill(Path(ellipseIn: CGRect(x: sun.x - sr, y: sun.y - sr, width: 2 * sr, height: 2 * sr)), with: .color(looked("#FBBF3E", look)))
    var hill = Path()
    hill.move(to: CGPoint(x: pX(-1), y: pY(0.78)))
    hill.addLine(to: CGPoint(x: pX(0), y: pY(0.78)))
    hill.addQuadCurve(to: CGPoint(x: pX(1), y: pY(0.72)), control: CGPoint(x: pX(0.45), y: pY(0.52)))
    hill.addLine(to: CGPoint(x: pX(2), y: pY(0.72)))
    hill.addLine(to: CGPoint(x: pX(2), y: pY(2)))
    hill.addLine(to: CGPoint(x: pX(-1), y: pY(2)))
    hill.closeSubpath()
    gc.fill(hill, with: .color(looked("#4CA86E", look)))
  }

  /// the photo stamp `w` wide (the cut's own width), its edge by its box's width (photoStampEdge)
  struct PressStamp: View {
    let x: KReelCtx
    let w: CGFloat
    let look: String
    var lifted: Bool = true
    var body: some View {
      let h = w / aspect
      let box = (w * 100) / paper.width
      let hair = box <= 60
      let cut = KReelPaths.parsed(x.w("photo.d"))
      let k = w / paper.width
      return Canvas { gc, _ in
        var g = gc
        g.scaleBy(x: k, y: k)
        g.translateBy(x: -paper.minX, y: -paper.minY)
        g.clip(to: cut)
        drawPicture(g, look: look)
        if hair {
          g.stroke(cut, with: .color(v3Ink.opacity(0.3)), style: StrokeStyle(lineWidth: (1 * 2 * 100) / box, lineJoin: .round))
        }
      }
      .frame(width: w, height: h)
      .shadow(color: Color.black.opacity(!hair && lifted ? 0.18 : 0), radius: w * 0.04, x: 0, y: w * 0.02)
    }
  }

  static let pressAt: Double = 1100
  static let punchAt: Double = 1250
  static let punchMs: Double = 350
  static let liftAt: Double = 1800
  static let namedAt: Double = 2900
  static let filterAt: Double = 3700
  static let pickedFilter = "warm"

  struct Press: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let camL = s * 0.07, camT = s * 0.1, camW = s * 0.86, camH = s * 0.86
      let w = s * 0.44
      let h = w / aspect
      let cx = camL + (camW - w) / 2
      let cy = camT + s * 0.035
      let k = paper.width / w // the cut's units per point
      let corner = cutCorner / k
      let shutter = s * 0.115
      let shutterY = s * 0.86
      let mark = w * 0.09
      let markIn = w * 0.06
      let settled: CGFloat = 0.68
      let dy = s * 0.3 - (cy + h / 2)
      let tagH = s * 0.08
      let rowTop = s * 0.665
      let row = x.list("row")
      let locked = Set(x.list("locked"))
      let slot = camW / CGFloat(max(1, row.count))
      let tw = s * 0.095
      let th = tw / aspect
      let pad = s * 0.009
      let pickedAt = row.firstIndex(of: pickedFilter) ?? 2
      let flash = c.once(260, pressAt)
      let frozen = c.once(60, pressAt + 80)
      let camera = c.once(300, liftAt)
      let slide = CGFloat(c.once(560, liftAt + 160, KReelEase.inOutCubic))
      let tagIn = c.once(380, liftAt + 520)
      let named = c.once(300, namedAt, KReelEase.outBack(1.4))
      let rowIn = c.once(420, liftAt + 700)
      let pick = c.once(320, filterAt + 60)
      let bites: [CGPoint] = x.list("bites").compactMap { pair in
        let p = pair.split(separator: ",").compactMap { Double($0) }
        return p.count == 2 ? CGPoint(x: p[0], y: p[1]) : nil
      }
      let cut = KReelPaths.parsed(x.w("photo.d"))
      let tagLabel = KReelFont.mono(s * 0.036, .semibold)
      return ZStack(alignment: .topLeading) {
        // ── the edit page, under the camera ──
        ZStack(alignment: .topLeading) {
          PressStamp(x: x, w: w, look: "original")
          PressStamp(x: x, w: w, look: pickedFilter, lifted: false).opacity(pick)
        }
        .frame(width: w, height: h)
        .rotationEffect(.degrees(-5 * Double(slide)))
        .scaleEffect(1 - (1 - settled) * slide)
        .offset(y: dy * slide)
        .offset(x: cx, y: cy)

        // the #topic: dashed and the placeholder while empty, solid in its colour once named
        ZStack {
          Text(x.w("cs2.ed.topicPh"))
            .font(tagLabel)
            .foregroundStyle(KReelInk.ink40)
            .lineLimit(1)
            .padding(.horizontal, s * 0.035)
            .frame(height: tagH)
            .overlay(RoundedRectangle(cornerRadius: tagH * 0.375).strokeBorder(KReelInk.ink40, style: StrokeStyle(lineWidth: 1.5, dash: [4, 3])))
            .opacity(1 - min(1, named))
          Text("#" + x.w("gd.stamps.pressTopic"))
            .font(tagLabel)
            .foregroundStyle(tagInk)
            .lineLimit(1)
            .padding(.horizontal, s * 0.035)
            .frame(height: tagH)
            .background(RoundedRectangle(cornerRadius: tagH * 0.375).fill(kReelColor(x.data.colors["topic"] ?? "#B9B5D0")))
            .overlay(RoundedRectangle(cornerRadius: tagH * 0.375).strokeBorder(tagInk, lineWidth: 2))
            .background(RoundedRectangle(cornerRadius: tagH * 0.375).fill(tagInk).offset(x: 3, y: 3))
            .scaleEffect(0.85 + 0.15 * named)
            .opacity(min(1, named * 2))
        }
        .frame(width: s, height: tagH + 3)
        .offset(y: (1 - CGFloat(tagIn)) * s * 0.03)
        .opacity(tagIn)
        .offset(y: s * 0.545)

        // the filter row: each tile the stamp in that look; the gold 1ST on what Free can't keep
        HStack(alignment: .top, spacing: 0) {
          ForEach(0..<row.count, id: \.self) { i in
            let f = row[i]
            VStack(spacing: s * 0.006) {
              ZStack(alignment: .topTrailing) {
                if i == 0 {
                  RoundedRectangle(cornerRadius: s * 0.02).strokeBorder(KReelInk.pen, lineWidth: 2).opacity(1 - pick)
                }
                if i == pickedAt {
                  RoundedRectangle(cornerRadius: s * 0.02).strokeBorder(KReelInk.pen, lineWidth: 2).opacity(pick)
                }
                PressStamp(x: x, w: tw, look: f).padding(pad)
                if locked.contains(f) {
                  Text(x.w("cs2.ed.fcBadge"))
                    .font(KReelFont.mono(s * 0.019, .semibold))
                    .foregroundStyle(tagInk)
                    .kReelFit()
                    .frame(width: s * 0.046, height: s * 0.032)
                    .background(RoundedRectangle(cornerRadius: s * 0.007).fill(waxGold))
                    .overlay(RoundedRectangle(cornerRadius: s * 0.007).strokeBorder(tagInk, lineWidth: 1.5))
                    .rotationEffect(.degrees(6))
                    .offset(x: s * 0.012, y: -s * 0.012)
                }
              }
              .frame(width: tw + 2 * pad, height: th + 2 * pad)
              Text(x.w("cs2.ed.f.\(f)"))
                .font(KReelFont.mono(s * 0.028, .medium))
                .foregroundStyle(KReelInk.ink60)
                .kReelFit()
                .frame(maxWidth: slot - 2)
            }
            .frame(width: slot)
          }
        }
        .frame(width: camW, alignment: .leading)
        .offset(y: (1 - CGFloat(rowIn)) * s * 0.04)
        .opacity(rowIn)
        .offset(x: camL, y: rowTop)
        KReelFinger(c: c, x: camL + slot * (CGFloat(pickedAt) + 0.5), y: rowTop + pad + th / 2, at: filterAt, size: s * 0.15)

        // ── the camera, over all of it until the stamp is pressed ──
        ZStack(alignment: .topLeading) {
          ZStack(alignment: .topLeading) {
            Canvas { gc, _ in
              var g = gc
              g.scaleBy(x: 1 / k, y: 1 / k)
              g.translateBy(x: -(paper.minX - (cx - camL) * k), y: -(paper.minY - (cy - camT) * k))
              drawPicture(g, look: "original")
              var dimmed = Path(CGRect(x: paper.minX - (cx - camL) * k, y: paper.minY - (cy - camT) * k, width: camW * k, height: camH * k))
              dimmed.addPath(cut)
              g.fill(dimmed, with: .color(dim), style: FillStyle(eoFill: true))
              g.stroke(cut, with: .color(Color.white.opacity(0.5)), lineWidth: k)
            }
            .frame(width: camW, height: camH)
            Text(x.w("cs2.cam.hint"))
              .font(KReelFont.mono(s * 0.032, .semibold))
              .tracking(1.2)
              .foregroundStyle(Color.white)
              .kReelFit()
              .frame(maxWidth: camW - s * 0.08)
              .frame(width: camW)
              .offset(y: cy - camT + h + s * 0.016)
          }
          .frame(width: camW, height: camH, alignment: .topLeading)
          .clipShape(RoundedRectangle(cornerRadius: s * 0.06))
          .overlay(RoundedRectangle(cornerRadius: s * 0.06).strokeBorder(v3Ink, lineWidth: 2))
          .offset(x: camL, y: camT)

          // the corner marks: what's in here is the stamp
          ZStack(alignment: .topLeading) {
            ForEach(0..<4, id: \.self) { n in
              let right = n % 2 == 1
              let bottom = n >= 2
              Path { p in
                p.move(to: CGPoint(x: right ? 0 : mark, y: bottom ? mark : 0))
                p.addLine(to: CGPoint(x: right ? mark : 0, y: bottom ? mark : 0))
                p.addLine(to: CGPoint(x: right ? mark : 0, y: bottom ? 0 : mark))
              }
              .stroke(lime, style: StrokeStyle(lineWidth: 2, lineCap: .square))
              .frame(width: mark, height: mark)
              .offset(x: right ? w - markIn - mark : markIn, y: bottom ? h - markIn - mark : markIn)
            }
          }
          .frame(width: w, height: h, alignment: .topLeading)
          .opacity(1 - frozen)
          .offset(x: cx, y: cy)

          // the press: the picture frozen as the un-bitten rect, the bites punching through it
          ZStack(alignment: .topLeading) {
            Canvas { gc, _ in
              var g = gc
              g.scaleBy(x: 1 / k, y: 1 / k)
              g.translateBy(x: -paper.minX, y: -paper.minY)
              drawPicture(g, look: "original")
            }
            .frame(width: w, height: h)
            ForEach(0..<bites.count, id: \.self) { n in
              let at = punchAt + Double(n) * (punchMs - 120) / Double(max(1, bites.count - 1))
              let b = bites[n]
              let r = biteR / k
              Circle().fill(dim)
                .frame(width: 2 * r, height: 2 * r)
                .scaleEffect(c.once(120, at))
                .offset(x: b.x / k - r, y: b.y / k - r)
            }
          }
          .frame(width: w, height: h, alignment: .topLeading)
          .clipShape(RoundedRectangle(cornerRadius: corner))
          .opacity(frozen)
          .offset(x: cx, y: cy)
          RoundedRectangle(cornerRadius: corner).fill(Color.white)
            .frame(width: w, height: h)
            .opacity(flash > 0 && flash < 1 ? 0.9 * (1 - flash) : 0)
            .offset(x: cx, y: cy)

          // the lime shutter, its hard shadow behind it
          ZStack(alignment: .topLeading) {
            Circle().fill(Color.black.opacity(0.5)).frame(width: shutter, height: shutter).offset(x: 3, y: 3)
            Circle().fill(lime)
              .overlay(Circle().strokeBorder(v3Ink, lineWidth: 2.5))
              .overlay(Circle().strokeBorder(v3Ink, lineWidth: 1.5).frame(width: shutter * 60 / 76, height: shutter * 60 / 76))
              .frame(width: shutter, height: shutter)
          }
          .offset(x: s / 2 - shutter / 2, y: shutterY - shutter / 2)
          KReelFinger(c: c, x: s / 2, y: shutterY, at: pressAt, size: s * 0.15)
        }
        .frame(width: s, height: s, alignment: .topLeading)
        .opacity(1 - camera)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  // MARK: 6 · the title, very large

  struct Title: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s
      let title = x.w("gd.stamps.title")
      let words = KReelBigType.words(title)
      let longest = words.map { $0.count }.max() ?? 1
      let cjk = title.range(of: "[\\u3040-\\u30FF\\u3400-\\u9FFF\\uAC00-\\uD7AF]", options: .regularExpression) != nil
      let fit: CGFloat = cjk ? 1 : min(1, 11.5 / CGFloat(max(1, longest)))
      let sw = kReelSnap(s * 0.2, x.reelWidths)
      return ZStack(alignment: .topLeading) {
        KReelBigType(c: x.c, s: s, words: words, accent: words.count > 1 ? [words.count - 1] : [], fit: fit)
        KReelStamp(id: chosen, width: sw)
          .kReelPop(x.c, 650)
          .rotationEffect(.degrees(8))
          .offset(x: s - s * 0.09 - sw, y: s - s * 0.08 - sw * 1.2)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }
}
