import SwiftUI

/*
 WHAT'S NEW IN 1.0.5, AS A REEL, in SwiftUI — src/components/news-reel/v1-0-5.tsx (1.0.5 and
 1.0.6 both play it), seven scenes, a caption over each:
   1. Stamp Press: the dark camera, the moment in the stamp-shaped cut, the lime shutter, a flash,
      the bites punching through, the stamp sliding out to land at −5°, a #topic typed, the filter
      moved from Original to Warm.
   2. Letter papers: the letter card changes paper as the strip's swatches are tapped (Plain →
      Grid → Airmail → Kraft), all seven drawn from data/papers (TS reads their CSS into numbers).
   3. Courier names: three pen pals rise in a list, each a frosted window and the name the
      reader's courier gives them, typed in; the mark and the star sign after it.
   4. Trading names: the signing sheet, then the two windows, YOU SIGNED · WAITING until theirs is
      in, both wiped clear at once onto the faces they chose, the courier names struck, the
      signatures written in.
   5. This or That: Mira's card, a pick, both answers open together.
   6. Sky postcards: her dusk postcard and Wave Back; tapped, the pair — your night beside her
      dusk (KSkyScene's skies, drawn here as the React Native file draws them).
   7. The font: a letter set in Newsreader, then Garamond, then SF Mono, as Settings' tiles are
      tapped.
 The reel's ground is the pen wash; its 10a parts take the light theme's inks (KReelNews105.l).
 Words and facts (TS, swift-reel-data NEWS105): every caption and label in the reader's language,
 the names (lib/stranger-name), the deck's pair and the wave lines, the papers read off
 data/papers, the four windows, the two faces, the three signatures' draw plans, the font tiles
 and each face's fit. Her picture: happy (perched on the list).
 */
enum KReelNews105 {
  /// THEMES.classic's 10a inks, fixed (a reel is a light picture in every theme)
  enum l {
    static let ink = kReelColor("#1E1B35")
    static let sub = kReelColor("#55506E")
    static let mute = kReelColor("#8A86A3")
    static let line = kReelColor("#E6E4EC")
    static let soft = kReelColor("#F6F5F9")
    static let lav = kReelColor("#E4E2F4")
    static let ind = kReelColor("#3A34D6")
  }
  static let rowLine = kReelColor("rgba(17,17,19,0.14)")
  static let bar = kReelColor("rgba(17,17,19,0.16)")
  static let check = "M5 12.5l4.2 4.2L19 7"
  static let lime = kReelColor("#D8F04A")
  static let waxGold = kReelColor("#D8A63F")
  static let goldText = kReelColor("#B8842A")
  static let smooth: (Double) -> Double = { $0 * $0 * (3 - 2 * $0) }

  static let def = KReelDef(bg: KReelInk.penWash, scenes: [
    KReelScene(key: "press", ms: 4800) { AnyView(Press(x: $0)) },
    KReelScene(key: "papers", ms: 4300) { AnyView(Papers(x: $0)) },
    KReelScene(key: "names", ms: 3800) { AnyView(Names(x: $0)) },
    KReelScene(key: "trade", ms: 6600) { AnyView(Trade(x: $0)) },
    KReelScene(key: "pick", ms: 4400) { AnyView(Pick(x: $0)) },
    KReelScene(key: "sky", ms: 4400) { AnyView(SkyScene(x: $0)) },
    KReelScene(key: "font", ms: 4000) { AnyView(FontScene(x: $0)) },
  ])

  // MARK: the shared pieces

  /// each scene's line, over its picture: big type a size down, two lines at most
  static func caption(_ x: KReelCtx, _ key: String) -> some View {
    let s = x.s
    return Text(x.w(key))
      .font(KReelFont.sys(s * 0.058, .bold))
      .tracking(-0.3)
      .kReelLine(s * 0.058, s * 0.068)
      .foregroundStyle(KReelInk.ink)
      .kReelFit(2, min: 0.7)
      .frame(width: s * 0.86, alignment: .leading)
      .kReelRise(x.c, 0, dy: s * 0.03)
      .offset(x: s * 0.07, y: s * 0.075)
  }

  /// shown from `from` until `to`, cross-faded (Between)
  static func between(_ c: KReelClock, _ from: Double, _ to: Double? = nil) -> Double {
    let on = from <= 0 ? 1 : c.once(180, from)
    let off = to.map { c.once(180, $0) } ?? 0
    return on - off
  }

  /// a finger for each tap, each gone soon after its press (the last stays)
  struct Taps: View {
    let c: KReelClock
    let taps: [(x: CGFloat, y: CGFloat, at: Double)]
    let size: CGFloat
    var body: some View {
      ZStack(alignment: .topLeading) {
        ForEach(0..<taps.count, id: \.self) { i in
          let p = taps[i]
          let stays = i == taps.count - 1
          KReelFinger(c: c, x: p.x, y: p.y, at: p.at, size: size)
            .opacity(stays ? 1 : 1 - c.once(220, p.at + 360))
        }
      }
    }
  }

  /// words typed in, a character every `every` ms from `at` (useStep: whole at once with less motion)
  static func typed(_ c: KReelClock, _ text: String, at: Double, every: Double) -> String {
    let chars = Array(text)
    let n = Int(floor(c.step(Double(chars.count), every, at)))
    return String(chars.prefix(n))
  }

  /// a rounded rect as a path
  static func rr(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ r: CGFloat) -> Path {
    Path(roundedRect: CGRect(x: x, y: y, width: w, height: h), cornerRadius: max(0, min(r, w / 2, h / 2)), style: .circular)
  }

  // MARK: 1 · the stamp press

  struct Look {
    let skyTop, skyLow, sun, seaTop, seaLow, land: Color
    init(_ a: String, _ b: String, _ c: String, _ d: String, _ e: String, _ f: String) {
      skyTop = kReelColor(a); skyLow = kReelColor(b); sun = kReelColor(c); seaTop = kReelColor(d); seaLow = kReelColor(e); land = kReelColor(f)
    }
  }

  static let looks: [String: Look] = [
    "original": Look("#86A9DD", "#F5C3A6", "#FFF0C8", "#5A84BC", "#2E4F84", "#3C4E78"),
    "vivid": Look("#5F95F2", "#FFB089", "#FFF4B8", "#3B78D6", "#1C4699", "#2A3D7C"),
    "warm": Look("#9DA8D8", "#FFC08C", "#FFE9A8", "#6E86B6", "#3B5282", "#4A4C72"),
    "golden": Look("#C2A2B2", "#FFB25E", "#FFE08A", "#8C82A2", "#504A6C", "#58445E"),
  ]
  static let filterRow = ["original", "vivid", "warm", "golden"]
  static let glints: [(CGFloat, CGFloat, CGFloat, CGFloat)] = [(49, 73.5, 18, 1.6), (52, 78, 12, 1.4), (54.5, 84, 7, 1.2), (56, 91, 4, 1)]
  static let paper = CGRect(x: 11, y: 8, width: 78, height: 104)
  static let dim = kReelColor("rgba(20,18,42,0.58)")

  /// THE MOMENT: the sunset in the stamp's box units, in one look
  static func photoScene(_ g: GraphicsContext, _ id: String) {
    let look = looks[id] ?? looks["original"]!
    g.fill(Path(CGRect(x: -300, y: -300, width: 700, height: 370)), with: .linearGradient(Gradient(colors: [look.skyTop, look.skyLow]), startPoint: CGPoint(x: 0, y: 0), endPoint: CGPoint(x: 0, y: 70)))
    g.fill(Path(ellipseIn: CGRect(x: 36, y: 40, width: 44, height: 44)), with: .color(look.sun.opacity(0.35)))
    g.fill(Path(ellipseIn: CGRect(x: 47, y: 51, width: 22, height: 22)), with: .color(look.sun))
    g.fill(Path(CGRect(x: -300, y: 70, width: 700, height: 400)), with: .linearGradient(Gradient(colors: [look.seaTop, look.seaLow]), startPoint: CGPoint(x: 0, y: 70), endPoint: CGPoint(x: 0, y: 130)))
    for gl in glints {
      g.fill(Path(roundedRect: CGRect(x: gl.0, y: gl.1, width: gl.2, height: gl.3), cornerRadius: gl.3 / 2), with: .color(look.sun.opacity(0.75)))
    }
    g.fill(KReelPaths.parsed("M-300 70L-300 50L0 50C12 44 24 50 34 62C37 66 39 68 42 70Z"), with: .color(look.land))
  }

  /// the moment cut to the stamp, at the cut's paper; ≤ 60 wide it keeps the faint hairline
  struct PhotoCut: View {
    let x: KReelCtx
    let w: CGFloat
    let look: String
    var body: some View {
      let cut = KReelPaths.parsed(x.w("photo.d"))
      let k = w / paper.width
      return Canvas { gc, _ in
        var g = gc
        g.scaleBy(x: k, y: k)
        g.translateBy(x: -paper.minX, y: -paper.minY)
        g.clip(to: cut)
        photoScene(g, look)
        if w <= 60 {
          g.stroke(cut, with: .color(KReelInk.navy.opacity(0.3)), lineWidth: (1 * 2 * paper.width) / w)
        }
      }
      .frame(width: w, height: w * paper.height / paper.width)
    }
  }

  static let shutterAt: Double = 1150
  static let punch: Double = shutterAt + 150
  static let punchMs: Double = 350
  static let slideAt: Double = shutterAt + 620
  static let filterTap: Double = 3550

  struct Press: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let px = s * 0.07, py = s * 0.25, pw = s * 0.86, ph = s * 0.68
      let ch = s * 0.42, cw = ch * (paper.width / paper.height)
      let cx = (pw - cw) / 2, cy = s * 0.075
      let u = paper.width / cw
      let x0 = paper.minX - cx * u, y0 = paper.minY - cy * u
      let shutter = s * 0.12
      let shutterY = cy + ch + (ph - cy - ch) / 2
      let bw = s * 0.28, bh = bw * (paper.height / paper.width)
      let lx = s * 0.11, ly = s * 0.255
      let dx = px + pw / 2 - (lx + bw / 2), dy = py + cy + ch / 2 - (ly + bh / 2)
      let k0 = cw / bw
      let freeze = c.once(60, shutterAt + 80)
      let flashIn = c.once(80, shutterAt)
      let flashOut = c.once(260, shutterAt + 90)
      let shown = c.once(60, punch + punchMs + 70)
      let slide = CGFloat(c.once(480, slideAt, KReelEase.inOutCubic))
      let away = c.once(320, slideAt, KReelEase.inQuad)
      let warm = c.once(260, filterTap + 60)
      let cut = KReelPaths.parsed(x.w("photo.d"))
      let unbitten = rr(paper.minX, paper.minY, paper.width, paper.height, 7)
      let outside = Path(CGRect(x: x0, y: y0, width: pw * u, height: ph * u))
      let bites: [CGPoint] = x.list("bites").compactMap { pair in
        let p = pair.split(separator: ",").compactMap { Double($0) }
        return p.count == 2 ? CGPoint(x: p[0], y: p[1]) : nil
      }
      let mw = s * 0.12, mh = mw * (paper.height / paper.width), tileW = mw + 6
      let rowX = s * 0.07, rowW = s * 0.86, rowY = s * 0.7
      let rowGap = (rowW - CGFloat(filterRow.count) * tileW) / CGFloat(filterRow.count - 1)
      func tileX(_ i: Int) -> CGFloat { rowX + CGFloat(i) * (tileW + rowGap) }
      let m: CGFloat = 4.5, mk: CGFloat = 7
      let corners = [
        "M\(paper.minX + m) \(paper.minY + m + mk)V\(paper.minY + m)H\(paper.minX + m + mk)",
        "M\(paper.maxX - m - mk) \(paper.minY + m)H\(paper.maxX - m)V\(paper.minY + m + mk)",
        "M\(paper.maxX - m) \(paper.maxY - m - mk)V\(paper.maxY - m)H\(paper.maxX - m - mk)",
        "M\(paper.minX + m + mk) \(paper.maxY - m)H\(paper.minX + m)V\(paper.maxY - m - mk)",
      ]
      let topicIn = c.once(420, slideAt + 520, KReelEase.outBack(1.8))
      return ZStack(alignment: .topLeading) {
        caption(x, "nw105.press")

        // the camera: the live moment under the dim, the cut, the lime shutter
        ZStack(alignment: .topLeading) {
          KReelInk.ink
          Canvas { gc, _ in
            var g = gc
            g.scaleBy(x: 1 / u, y: 1 / u)
            g.translateBy(x: -x0, y: -y0)
            photoScene(g, "original")
            if freeze < 1 {
              var live = g
              live.opacity = 1 - freeze
              var d = outside
              d.addPath(cut)
              live.fill(d, with: .color(dim), style: FillStyle(eoFill: true))
              live.stroke(cut, with: .color(Color.white.opacity(0.5)), lineWidth: u)
              for cd in corners {
                live.stroke(KReelPaths.parsed(cd), with: .color(lime), style: StrokeStyle(lineWidth: 2 * u, lineCap: .round, lineJoin: .round))
              }
            }
            if freeze > 0 {
              var frozen = g
              frozen.opacity = freeze
              var d = outside
              d.addPath(unbitten)
              frozen.fill(d, with: .color(dim), style: FillStyle(eoFill: true))
              frozen.clip(to: unbitten)
              for (i, b) in bites.enumerated() {
                let v = c.once(90, punch + Double(i) * punchMs / Double(max(1, bites.count)), KReelEase.outCubic)
                let r = 5 * CGFloat(v)
                if r > 0 {
                  frozen.fill(Path(ellipseIn: CGRect(x: paper.minX + b.x - r, y: paper.minY + b.y - r, width: 2 * r, height: 2 * r)), with: .color(dim))
                }
              }
            }
          }
          .frame(width: pw, height: ph)
          RoundedRectangle(cornerRadius: 7 / u).fill(Color.white)
            .frame(width: cw, height: ch)
            .opacity(0.85 * (flashIn - flashOut))
            .offset(x: cx, y: cy)
          Text(x.w("cs2.cam.hint"))
            .font(KReelFont.mono(s * 0.026, .semibold))
            .tracking(1.2)
            .foregroundStyle(Color.white.opacity(0.8))
            .lineLimit(1)
            .frame(width: pw)
            .offset(y: cy * 0.32)
          ZStack(alignment: .topLeading) {
            Circle().fill(Color.black.opacity(0.5)).frame(width: shutter, height: shutter).offset(x: shutter * 0.05, y: shutter * 0.05)
            Circle().fill(lime)
              .overlay(Circle().strokeBorder(l.ink, lineWidth: max(1.5, shutter * 0.033)))
              .overlay(Circle().strokeBorder(l.ink, lineWidth: max(1, shutter * 0.02)).frame(width: shutter * 0.79, height: shutter * 0.79))
              .frame(width: shutter, height: shutter)
          }
          .offset(x: pw / 2 - shutter / 2, y: shutterY - shutter / 2)
        }
        .frame(width: pw, height: ph, alignment: .topLeading)
        .clipShape(RoundedRectangle(cornerRadius: s * 0.05))
        .opacity(1 - away)
        .offset(x: px, y: py)

        // the pressed stamp, from the slot to where the edit page holds it; the look follows the filter
        ZStack(alignment: .topLeading) {
          PhotoCut(x: x, w: bw, look: "original")
          PhotoCut(x: x, w: bw, look: "warm").opacity(warm)
        }
        .frame(width: bw, height: bh)
        .shadow(color: Color.black.opacity(0.18 * Double(slide)), radius: bw * 0.04, x: 0, y: bw * 0.02)
        .rotationEffect(.degrees(-5 * Double(slide)))
        .scaleEffect(k0 + (1 - k0) * slide)
        .offset(x: dx * (1 - slide), y: dy * (1 - slide))
        .opacity(shown)
        .offset(x: lx, y: ly)

        // its #topic, typed, in the topic tag's sticker
        Text(typed(c, x.w("nw105.press.topic"), at: slideAt + 700, every: 60))
          .font(KReelFont.mono(s * 0.034, .semibold))
          .tracking(0.2)
          .foregroundStyle(KReelInk.navy)
          .lineLimit(1)
          .padding(.vertical, s * 0.017)
          .padding(.horizontal, s * 0.034)
          .frame(minWidth: s * 0.12)
          .background(RoundedRectangle(cornerRadius: 20).fill(kReelColor(x.data.colors["topic"] ?? "#B9B5D0")))
          .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(l.ink, lineWidth: 2))
          .background(RoundedRectangle(cornerRadius: 20).fill(l.ink).offset(x: 3, y: 3))
          .frame(maxWidth: s * 0.44, alignment: .leading)
          .scaleEffect(0.4 + 0.6 * topicIn)
          .opacity(min(1, topicIn * 1.4))
          .offset(x: s * 0.5, y: s * 0.4)

        // the filter row: the moment in each look, the gold 1ST on what First Class keeps
        ForEach(0..<filterRow.count, id: \.self) { i in
          let id = filterRow[i]
          VStack(spacing: s * 0.012) {
            ZStack(alignment: .topTrailing) {
              PhotoCut(x: x, w: mw, look: id).padding(3)
              if id == "original" || id == "warm" {
                RoundedRectangle(cornerRadius: 8).strokeBorder(l.ind, lineWidth: 2)
                  .frame(width: tileW, height: mh + 6)
                  .opacity(id == "original" ? between(c, 0, filterTap) : between(c, filterTap))
              }
              if id == "golden" {
                Text(x.w("cs2.ed.fcBadge"))
                  .font(KReelFont.mono(s * 0.02, .semibold))
                  .foregroundStyle(l.ink)
                  .kReelFit()
                  .frame(width: s * 0.062, height: s * 0.044)
                  .background(RoundedRectangle(cornerRadius: 3).fill(waxGold))
                  .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(l.ink, lineWidth: 1.5))
                  .rotationEffect(.degrees(6))
                  .offset(x: s * 0.02, y: -s * 0.018)
              }
            }
            .frame(width: tileW, height: mh + 6)
            Text(x.w("cs2.ed.f.\(id)"))
              .font(KReelFont.mono(s * 0.025, .medium))
              .foregroundStyle(l.sub)
              .kReelFit()
              .frame(width: tileW + rowGap * 0.8)
          }
          .frame(width: tileW)
          .kReelRise(c, slideAt + 600 + Double(i) * 70, dy: s * 0.03)
          .offset(x: tileX(i), y: rowY)
        }

        // the shutter, pressed (the finger goes with the camera), then Warm
        KReelFinger(c: c, x: px + pw / 2, y: py + shutterY, at: shutterAt, size: s * 0.15).opacity(1 - away)
        KReelFinger(c: c, x: tileX(2) + tileW / 2, y: rowY + 3 + mh / 2, at: filterTap, size: s * 0.13)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  // MARK: 2 · letter papers

  static let paperRun: [(id: String, at: Double)] = [("plain", 0), ("grid", 1050), ("airmail", 2000), ("kraft", 2950)]

  /// a rect, a torn receipt or a folded sticky, as sheetPath draws it
  static func sheetPath(_ p: KReelPaperJSON, _ w: CGFloat, _ h: CGFloat, _ r: CGFloat, _ k: CGFloat) -> Path {
    if p.torn {
      let tooth = max(4, 10 * k)
      let a = tooth * 0.45
      let n = max(2, Int((w / tooth).rounded()))
      let step = w / CGFloat(n)
      var d = Path()
      d.move(to: CGPoint(x: 0, y: a))
      for i in 0..<n {
        d.addLine(to: CGPoint(x: (CGFloat(i) + 0.5) * step, y: 0))
        d.addLine(to: CGPoint(x: CGFloat(i + 1) * step, y: a))
      }
      d.addLine(to: CGPoint(x: w, y: h - a))
      for i in stride(from: n - 1, through: 0, by: -1) {
        d.addLine(to: CGPoint(x: (CGFloat(i) + 0.5) * step, y: h))
        d.addLine(to: CGPoint(x: CGFloat(i) * step, y: h - a))
      }
      d.closeSubpath()
      return d
    }
    if p.fold {
      let f = min(w, h) * 0.18
      var d = Path()
      d.move(to: .zero)
      d.addLine(to: CGPoint(x: w, y: 0))
      d.addLine(to: CGPoint(x: w, y: h - f))
      d.addLine(to: CGPoint(x: w - f, y: h))
      d.addLine(to: CGPoint(x: 0, y: h))
      d.closeSubpath()
      return d
    }
    return rr(0, 0, w, h, r)
  }

  /// A PAPER, as TS read it off the papers table (its card's values for ~340 wide, its swatch's for 48 × 60)
  struct PaperSheet: View {
    let p: KReelPaperJSON
    let w: CGFloat
    let h: CGFloat
    let k: CGFloat
    var swatch: Bool = false
    var body: some View {
      let r = CGFloat(swatch ? p.tRadius : p.radius) * k
      let line = swatch ? p.tLine : p.line
      let lw = CGFloat(line?.w ?? 0) * k
      let stripes = CGFloat(swatch ? p.tStripes : p.stripes) * k
      let hard = swatch ? nil : p.hard
      let soft = !swatch && hard == nil && p.soft
      let d = sheetPath(p, w, h, r, k)
      let f = min(w, h) * 0.18
      let grid = 20 * k
      return ZStack(alignment: .topLeading) {
        if let hard {
          d.fill(kReelColor(hard.color)).offset(x: CGFloat(hard.x) * k, y: CGFloat(hard.y) * k)
        }
        Canvas { g, _ in
          g.fill(d, with: .color(kReelColor(p.ground)))
          var inner = g
          inner.clip(to: d)
          if p.id == "grid", let ink = p.gridInk {
            let across = Int(ceil(w / grid)), down = Int(ceil(h / grid))
            var lines = Path()
            for i in 0..<across { lines.move(to: CGPoint(x: CGFloat(i + 1) * grid, y: 0)); lines.addLine(to: CGPoint(x: CGFloat(i + 1) * grid, y: h)) }
            for i in 0..<down { lines.move(to: CGPoint(x: 0, y: CGFloat(i + 1) * grid)); lines.addLine(to: CGPoint(x: w, y: CGFloat(i + 1) * grid)) }
            inner.stroke(lines, with: .color(kReelColor(ink)), lineWidth: max(0.5, k))
          }
          if stripes > 0, !p.stripeColors.isEmpty {
            let band = 10 * k
            let period = band * CGFloat(p.stripeColors.count)
            var xx = -h - period
            while xx < w {
              for (i, col) in p.stripeColors.enumerated() {
                let a = xx + CGFloat(i) * band
                var poly = Path()
                poly.move(to: CGPoint(x: a, y: 0))
                poly.addLine(to: CGPoint(x: a + band, y: 0))
                poly.addLine(to: CGPoint(x: a + band + h, y: h))
                poly.addLine(to: CGPoint(x: a + h, y: h))
                poly.closeSubpath()
                inner.fill(poly, with: .color(kReelColor(col)))
              }
              xx += period
            }
            inner.fill(rr(stripes, stripes, w - 2 * stripes, h - 2 * stripes, max(0, r - stripes)), with: .color(.white))
          }
          if p.fold {
            var flap = Path()
            flap.move(to: CGPoint(x: w - f, y: h - f))
            flap.addLine(to: CGPoint(x: w, y: h - f))
            flap.addLine(to: CGPoint(x: w - f, y: h))
            flap.closeSubpath()
            g.fill(flap, with: .color(kReelColor("#B5CC2E")))
          }
          if let line, lw > 0 {
            let outline = p.torn || p.fold ? d : rr(lw / 2, lw / 2, w - lw, h - lw, max(0, r - lw / 2))
            g.stroke(outline, with: .color(kReelColor(line.color)), style: StrokeStyle(lineWidth: lw, dash: line.dashed ? [3 * k, 2 * k] : []))
          }
        }
        .frame(width: w, height: h)
        .shadow(color: soft ? l.ink.opacity(0.22) : .clear, radius: 10 * k, x: 0, y: 6 * k)
      }
      .frame(width: w, height: h, alignment: .topLeading)
    }
  }

  static func fit(_ size: CGFloat, _ f: Double) -> CGFloat {
    f == 1 ? size : (size * CGFloat(f) * 2).rounded() / 2
  }

  struct Papers: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let papers = x.data.papers
      let size = fit(s * 0.044, x.num("fit.reader", 1))
      let cardW = s * 0.64, cardH = s * 0.36
      let cardX = (s - cardW) / 2, cardY = s * 0.255
      let k = cardW / 340
      let sw = kReelSnap(s * 0.085, x.reelWidths)
      let stripW = s * 0.86, g = s * 0.016
      let n = CGFloat(max(1, papers.count))
      let tw = (stripW - (n - 1) * g) / n, th = tw * 1.25
      let stripX = (s - stripW) / 2, stripY = s * 0.735
      let headY = cardY + cardH + s * 0.05
      func tileX(_ i: Int) -> CGFloat { stripX + CGFloat(i) * (tw + g) }
      func index(_ id: String) -> Int { papers.firstIndex { $0.id == id } ?? 0 }
      func paper(_ id: String) -> KReelPaperJSON? { papers.first { $0.id == id } }
      let taps = paperRun.dropFirst().map { (x: tileX(index($0.id)) + tw / 2, y: stripY + th / 2, at: $0.at) }
      return ZStack(alignment: .topLeading) {
        caption(x, "nw105.papers")

        // the letter card, on the paper last picked
        ZStack(alignment: .topLeading) {
          ForEach(0..<paperRun.count, id: \.self) { i in
            if let p = paper(paperRun[i].id) {
              let pad = CGFloat(p.id == "airmail" ? p.stripes : 0) * k + 16 * k
              let next = i + 1 < paperRun.count ? paperRun[i + 1].at + 200 : nil
              ZStack(alignment: .topLeading) {
                PaperSheet(p: p, w: cardW, h: cardH, k: k)
                KReelStamp(id: "made-my-day", width: sw).offset(x: cardW - pad - sw, y: pad)
                Text(x.w("nw105.papers.line"))
                  .font(KReelFont.letter(size, x.face))
                  .kReelLine(size, size * 1.3)
                  .foregroundStyle(kReelColor(p.ink))
                  .kReelFit(3, min: 0.7)
                  .shadow(color: p.glow.map { kReelColor($0.color) } ?? .clear, radius: 0, x: CGFloat(p.glow?.x ?? 0) * k, y: CGFloat(p.glow?.y ?? 0) * k)
                  .frame(width: max(0, cardW - 2 * pad - sw - s * 0.02), alignment: .topLeading)
                  .offset(x: pad, y: pad + s * 0.01)
              }
              .frame(width: cardW, height: cardH, alignment: .topLeading)
              .opacity(between(c, paperRun[i].at, next))
            }
          }
        }
        .frame(width: cardW, height: cardH, alignment: .topLeading)
        .kReelRise(c, 0, dy: s * 0.03)
        .offset(x: cardX, y: cardY)

        // the strip's head: PAPER · {name}, "· FIRST CLASS" in gold on a First Class paper
        ForEach(0..<paperRun.count, id: \.self) { i in
          if let p = paper(paperRun[i].id) {
            let next = i + 1 < paperRun.count ? paperRun[i + 1].at : nil
            (Text(p.head).foregroundColor(l.ink) + (p.first ? Text(" " + x.w("pp.strip.fc")).foregroundColor(goldText) : Text("")))
              .font(KReelFont.mono(s * 0.03, .semibold))
              .tracking(1.2)
              .kReelFit(1, min: 0.7)
              .frame(width: s * 0.86)
              .opacity(between(c, paperRun[i].at, next))
              .offset(x: s * 0.07, y: headY)
          }
        }

        // the strip: all seven, the gold 1ST on First Class, the picked one ringed
        ForEach(0..<papers.count, id: \.self) { i in
          let p = papers[i]
          VStack(spacing: s * 0.012) {
            ZStack(alignment: .topLeading) {
              PaperSheet(p: p, w: tw, h: th, k: tw / 48, swatch: true)
              VStack(alignment: .leading, spacing: th * 0.1) {
                RoundedRectangle(cornerRadius: 2).fill(kReelColor(p.lineColor)).opacity(0.55).frame(width: tw * 0.6, height: max(1.5, th * 0.045))
                RoundedRectangle(cornerRadius: 2).fill(kReelColor(p.lineColor)).opacity(0.55).frame(width: tw * 0.6 * 0.62, height: max(1.5, th * 0.045))
              }
              .offset(x: tw * 0.2, y: th * 0.36)
              if p.first {
                Text(x.w("pp.badge.fc"))
                  .font(KReelFont.mono(max(6.5, s * 0.018), .semibold))
                  .foregroundStyle(l.ink)
                  .fixedSize()
                  .padding(.horizontal, 2.5)
                  .padding(.vertical, 1)
                  .background(RoundedRectangle(cornerRadius: 3).fill(waxGold))
                  .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(l.ink, lineWidth: 1))
                  .rotationEffect(.degrees(6))
                  .frame(width: tw + tw * 0.18 * 2, alignment: .topTrailing)
                  .offset(y: -th * 0.1)
              }
            }
            .frame(width: tw, height: th, alignment: .topLeading)
            Text(p.nameLower)
              .font(KReelFont.mono(s * 0.024, .medium))
              .foregroundStyle(l.sub)
              .kReelFit()
              .frame(width: tw + g)
          }
          .frame(width: tw + g)
          .kReelRise(c, 150 + Double(i) * 50, dy: s * 0.02)
          .offset(x: tileX(i) - g / 2, y: stripY)
        }
        ForEach(0..<paperRun.count, id: \.self) { i in
          let next = i + 1 < paperRun.count ? paperRun[i + 1].at : nil
          RoundedRectangle(cornerRadius: 6).strokeBorder(l.ind, lineWidth: 2)
            .frame(width: tw + 6, height: th + 6)
            .opacity(between(c, paperRun[i].at, next))
            .offset(x: tileX(index(paperRun[i].id)) - 3, y: stripY - 3)
        }

        Taps(c: c, taps: Array(taps), size: s * 0.13)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  // MARK: 3 · courier names

  static let nameEvery: Double = 45

  struct NameRow: View {
    let x: KReelCtx
    let i: Int
    var body: some View {
      let s = x.s, c = x.c
      let name = x.w("name.\(i)")
      let at = 250 + Double(i) * 520
      let typedAt = at + 220
      let glyphsAt = typedAt + Double(name.count) * nameEvery + 160
      let win = s * 0.092
      let marks = x.list("marks"), signs = x.list("signs")
      let mark = i < marks.count ? KLineGlyph.mark(marks[i]) : nil
      let sign = i < signs.count ? KLineGlyph.sign(signs[i]) : nil
      let gs = (s * 0.038).rounded()
      let pop = c.once(420, glyphsAt, KReelEase.outBack(1.8))
      return HStack(spacing: s * 0.035) {
        KReelFrost(spec: x.frost("named\(i)"), size: win)
        VStack(alignment: .leading, spacing: s * 0.018) {
          HStack(spacing: 0) {
            Text(typed(c, name, at: typedAt, every: nameEvery))
              .font(KReelFont.sys(s * 0.047, .semibold))
              .foregroundStyle(l.ink)
              .lineLimit(1)
            HStack(spacing: 4) {
              if let mark { KLineIcon(mark, size: gs, lineWidth: 2, color: l.sub) }
              if let sign { KLineIcon(sign, size: gs, lineWidth: 2, color: l.sub) }
            }
            .padding(.leading, 6)
            .scaleEffect(0.4 + 0.6 * pop)
            .opacity(min(1, pop * 1.4))
          }
          .frame(minHeight: s * 0.06)
          Capsule().fill(bar).frame(height: 6).padding(.trailing, s * (0.08 + 0.07 * CGFloat(i)))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(.horizontal, s * 0.04)
      .frame(height: s * 0.14)
      .overlay(alignment: .bottom) { if i < 2 { rowLine.frame(height: 1) } }
      .kReelRise(c, at, dy: s * 0.03)
    }
  }

  struct Names: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s
      let lx = s * 0.07, ly = s * 0.4, w = s * 0.86
      let wren = s * 0.16
      return ZStack(alignment: .topLeading) {
        caption(x, "nw105.names")
        VStack(spacing: 0) {
          ForEach(0..<3, id: \.self) { i in NameRow(x: x, i: i) }
        }
        .frame(width: w)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .offset(x: lx, y: ly)
        // the courier who named them, perched on the list
        KReelBird(ref: x.img("happy"), size: wren)
          .kReelRise(x.c, 0, dy: s * 0.02)
          .offset(x: lx + w - wren - s * 0.04, y: ly - wren * 0.9)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  // MARK: 4 · trading names

  static let tName: Double = 250
  static let tDraw: Double = 850
  static let tSend: Double = 2050
  static let tSheetOut: Double = 2300
  static let tPair: Double = 2500
  static let tMine: Double = 2650
  static let tTheirs: Double = 3250
  static let tWipe: Double = 3500
  static let tStrike: Double = 4150
  static let tSign: Double = 4400
  static let tSignMs: Double = 900
  static let wipeMs: Double = 600

  struct WipeWindow: View {
    let x: KReelCtx
    let spec: KFrostSpec?
    let face: KImageRef?
    let size: CGFloat
    var body: some View {
      let v = x.c.once(wipeMs, tWipe, KReelEase.linear)
      let ms = v * wipeMs
      let radius = size * (0.25 + 0.25 * CGFloat(smooth(KReelClock.clamp01((ms - 50) / 500))))
      let frost = 1 - smooth(KReelClock.clamp01(ms / 550))
      let p = KReelClock.clamp01(ms / 550)
      let d = -size * 0.85 + size * 1.7 * CGFloat(smooth(p))
      let f = KReelClock.clamp01((ms - 150) / 450)
      let shape = RoundedRectangle(cornerRadius: radius)
      return ZStack(alignment: .topLeading) {
        ZStack(alignment: .topLeading) {
          KReelKindreds.Portrait(ref: face, size: size).scaleEffect(0.92 + 0.08 * CGFloat(f)).opacity(f)
          KReelFrost(spec: spec, size: size).opacity(frost)
          LinearGradient(stops: [.init(color: Color.white.opacity(0), location: 0), .init(color: Color.white.opacity(0.85), location: 0.5), .init(color: Color.white.opacity(0), location: 1)], startPoint: .leading, endPoint: .trailing)
            .frame(width: size * 0.5, height: size * 2)
            .rotationEffect(.degrees(45))
            .offset(x: d, y: d)
            .opacity(p > 0 && p < 1 ? sin(p * .pi) : 0)
            .offset(x: size * 0.25, y: -size * 0.5)
        }
        .frame(width: size, height: size, alignment: .topLeading)
        .clipShape(shape)
        shape.strokeBorder(Color.white, lineWidth: 3)
          .frame(width: size, height: size)
          .scaleEffect(0.92 + 0.08 * CGFloat(f))
          .opacity(f)
      }
      .frame(width: size, height: size)
    }
  }

  struct Side: View {
    let x: KReelCtx
    let mine: Bool
    var body: some View {
      let s = x.s, c = x.c
      let colW = s * 0.42, win = s * 0.2, badge = s * 0.065
      let slotW = s * 0.34, slotH = s * 0.1
      let signAt = mine ? tSign + 250 : tSign
      let on = c.once(380, mine ? tMine : tTheirs, KReelEase.outBack(1.8))
      let off = c.once(200, tWipe)
      let text = x.w(mine ? "meCourier" : "themCourier")
      let room = colW * 0.95
      let ems = text.unicodeScalars.reduce(0.0) { $0 + (kReelWide($1) ? 1 : 0.6) + 0.06 }
      let fs = min(s * 0.03, room / CGFloat(max(1, ems)))
      let strike = c.once(240, mine ? tStrike + 120 : tStrike, KReelEase.inOutCubic)
      return VStack(spacing: 0) {
        ZStack(alignment: .topLeading) {
          WipeWindow(x: x, spec: x.frost(mine ? "me" : "them"), face: x.img(mine ? "meFace" : "themFace"), size: win)
          KReelPath(check)
            .stroke(Color.white, style: StrokeStyle(lineWidth: 3.2 * badge * 0.58 / 24, lineCap: .round, lineJoin: .round))
            .frame(width: badge * 0.58, height: badge * 0.58)
            .frame(width: badge, height: badge)
            .background(Circle().fill(l.ind))
            .overlay(Circle().strokeBorder(Color.white, lineWidth: 2))
            .scaleEffect(0.4 + 0.6 * on)
            .opacity(min(1, on * 1.4) * (1 - off))
            .offset(x: win - badge * 0.7, y: win - badge * 0.7)
        }
        .frame(width: win, height: win, alignment: .topLeading)
        Text(text)
          .font(KReelFont.mono(fs, .medium))
          .tracking(0.6)
          .foregroundStyle(l.sub)
          .lineLimit(1)
          .fixedSize()
          .opacity(1 - 0.55 * strike)
          .overlay(alignment: .leading) {
            GeometryReader { g in
              l.ink.frame(width: g.size.width * CGFloat(strike), height: 1.5).offset(y: g.size.height / 2 - 0.5)
            }
          }
          .padding(.top, s * 0.03)
        KReelKindreds.DrawIn(x: x, sig: mine ? "trade.me" : "trade.them", w: slotW, h: slotH, at: signAt, pt: 2)
          .padding(.top, s * 0.02)
        Text(x.w(mine ? "myPen" : "palPen"))
          .font(KReelFont.letter(s * 0.042, x.face))
          .foregroundStyle(l.ink)
          .lineLimit(1)
          .kReelRise(c, signAt + tSignMs, dy: s * 0.015)
          .padding(.top, s * 0.008)
      }
      .frame(width: colW)
    }
  }

  struct Trade: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let sheetOut = c.once(300, tSheetOut, KReelEase.inQuad)
      let sx = s * 0.07, sy = s * 0.25, sw = s * 0.86, pad = s * 0.05
      let fieldH = s * 0.1, padY = pad + s * 0.215, padH = s * 0.19, keyY = pad + s * 0.44, keyH = s * 0.11
      let labelFont = KReelFont.mono(s * 0.026, .semibold)
      let waiting = between(c, tMine + 60, tTheirs)
      return ZStack(alignment: .topLeading) {
        caption(x, "nw105.trade")

        ZStack(alignment: .topLeading) {
          Color.white
          Text(x.w("id2.sheet.name")).font(labelFont).tracking(1.2).foregroundStyle(l.sub).lineLimit(1).offset(x: pad, y: pad)
          Text(typed(c, x.w("myPen"), at: tName, every: 110))
            .font(KReelFont.letter(s * 0.05, x.face))
            .foregroundStyle(l.ink)
            .lineLimit(1)
            .padding(.horizontal, s * 0.03)
            .frame(width: sw - 2 * pad, height: fieldH, alignment: .leading)
            .overlay(RoundedRectangle(cornerRadius: s * 0.025).strokeBorder(l.line, lineWidth: 1.5))
            .offset(x: pad, y: pad + s * 0.045)
          Text(x.w("id2.sheet.sign")).font(labelFont).tracking(1.2).foregroundStyle(l.sub).lineLimit(1).offset(x: pad, y: pad + s * 0.17)
          KReelKindreds.DrawIn(x: x, sig: "trade.pad", w: sw - 2 * pad - s * 0.08, h: padH * 0.8, at: tDraw, pt: 2.6)
            .frame(width: sw - 2 * pad, height: padH)
            .background(RoundedRectangle(cornerRadius: s * 0.03).fill(l.soft))
            .offset(x: pad, y: padY)
          Text(x.w("id2.sheet.send"))
            .font(KReelFont.sys(s * 0.042, .semibold))
            .foregroundStyle(Color.white)
            .kReelFit(1, min: 0.7)
            .frame(width: sw - 2 * pad, height: keyH)
            .background(Capsule().fill(l.ink))
            .offset(x: pad, y: keyY)
        }
        .frame(width: sw, height: s * 0.66, alignment: .topLeading)
        .clipShape(RoundedRectangle(cornerRadius: s * 0.05))
        .kReelRise(c, 0, dy: s * 0.04)
        .offset(y: CGFloat(sheetOut) * s * 0.06)
        .opacity(1 - sheetOut)
        .offset(x: sx, y: sy)
        KReelFinger(c: c, x: s * 0.5, y: sy + keyY + keyH / 2, at: tSend, size: s * 0.15)
          .offset(y: CGFloat(sheetOut) * s * 0.06)
          .opacity(1 - sheetOut)

        // the two of you: sealed until both have signed, then open together
        HStack(alignment: .top, spacing: 0) {
          Side(x: x, mine: true).kReelRise(c, tPair, dy: s * 0.03)
          Spacer(minLength: 0)
          Side(x: x, mine: false).kReelRise(c, tPair + 80, dy: s * 0.03)
        }
        .frame(width: s * 0.84)
        .offset(x: s * 0.08, y: s * 0.3)
        Text(x.w("id2.door.waiting"))
          .font(KReelFont.mono(s * 0.03, .semibold))
          .tracking(1.2)
          .foregroundStyle(l.ind)
          .kReelFit(1, min: 0.7)
          .frame(width: s)
          .opacity(waiting)
          .offset(y: s * 0.88)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  // MARK: 5 · This or That

  static let pickTap: Double = 1500
  static let pickOpen: Double = 1950

  struct Pick: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let lit = c.once(200, pickTap + 40)
      let open = c.once(350, pickOpen, KReelEase.outCubic)
      let px = s * 0.07, py = s * 0.25, w = s * 0.86, pad = s * 0.045
      let icon = s * 0.072, promptH = s * 0.15, chH = s * 0.17, gap = s * 0.028
      let chY = pad + icon + s * 0.025 + promptH + s * 0.02
      let chW = (w - 2 * pad - gap) / 2
      let mono = KReelFont.mono(s * 0.027, .medium)
      func choice(_ text: String, _ b: Bool) -> some View {
        ZStack {
          l.soft
          if b { l.lav.opacity(lit) }
          VStack(spacing: s * 0.01) {
            Text(text)
              .font(KReelFont.letter(s * 0.045, x.face))
              .foregroundStyle(l.ink)
              .multilineTextAlignment(.center)
              .kReelFit(2, min: 0.7)
            if b {
              HStack(spacing: 4) {
                KReelPath(check)
                  .stroke(l.ind, style: StrokeStyle(lineWidth: 2.8 * s * 0.034 / 24, lineCap: .round, lineJoin: .round))
                  .frame(width: s * 0.034, height: s * 0.034)
                Text(x.w("sp.pick.both")).font(KReelFont.sys(s * 0.034, .semibold)).foregroundStyle(l.ind).lineLimit(1)
              }
              .opacity(open)
            }
          }
          .padding(.horizontal, s * 0.025)
        }
        .frame(width: chW, height: chH)
        .clipShape(RoundedRectangle(cornerRadius: s * 0.04))
        .opacity(b ? 1 : 1 - 0.4 * open)
      }
      return ZStack(alignment: .topLeading) {
        caption(x, "nw105.pick")
        ZStack(alignment: .topLeading) {
          Color.white
          HStack(spacing: s * 0.028) {
            KReelPath("M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4")
              .stroke(l.ind, style: StrokeStyle(lineWidth: 1.9 * icon * 0.58 / 24, lineCap: .round, lineJoin: .round))
              .frame(width: icon * 0.58, height: icon * 0.58)
              .frame(width: icon, height: icon)
              .background(RoundedRectangle(cornerRadius: s * 0.022).fill(l.lav))
            Text(x.w("pick.label")).font(mono).tracking(1.2).foregroundStyle(l.mute).lineLimit(1)
            Spacer(minLength: 0)
            Text(x.w("pick.asked")).font(mono).tracking(1.2).foregroundStyle(l.mute).lineLimit(1)
          }
          .frame(width: w - 2 * pad, height: icon)
          .offset(x: pad, y: pad)
          Text(x.w("pick.q"))
            .font(KReelFont.letter(s * 0.058, x.face))
            .kReelLine(s * 0.058, s * 0.075)
            .foregroundStyle(l.ink)
            .kReelFit(2, min: 0.7)
            .frame(width: w - 2 * pad, height: promptH, alignment: .leading)
            .offset(x: pad, y: pad + icon + s * 0.025)
          HStack(spacing: gap) {
            choice(x.w("pick.a"), false)
            choice(x.w("pick.b"), true)
          }
          .offset(x: pad, y: chY)
          ZStack(alignment: .topLeading) {
            Text(x.w("sp.pick.hint"))
              .font(KReelFont.sys(s * 0.036))
              .kReelLine(s * 0.036, s * 0.048)
              .foregroundStyle(l.mute)
              .lineLimit(2)
              .opacity(1 - open)
            Text(x.w("sp.pick.same.1"))
              .font(KReelFont.sys(s * 0.044, .semibold))
              .foregroundStyle(l.ind)
              .lineLimit(1)
              .offset(y: (1 - CGFloat(open)) * 6)
              .opacity(open)
          }
          .frame(width: w - 2 * pad, alignment: .topLeading)
          .offset(x: pad, y: chY + chH + s * 0.03)
        }
        .frame(width: w, height: chY + chH + s * 0.12 + pad, alignment: .topLeading)
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .kReelRise(c, 0, dy: s * 0.04)
        .offset(x: px, y: py)
        KReelFinger(c: c, x: px + pad + chW + gap + chW * 0.55, y: py + chY + chH * 0.55, at: pickTap, size: s * 0.15)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  // MARK: 6 · sky postcards

  struct SkyLook {
    let stops: [Color]
    let ink: Color
    let bird: Color
    let birdAlpha: Double
  }

  static let skies: [String: SkyLook] = [
    "dawn": SkyLook(stops: [kReelColor("#F7B9C8"), kReelColor("#FFDDB8")], ink: KReelInk.navy, bird: KReelInk.navy, birdAlpha: 0.55),
    "day": SkyLook(stops: [kReelColor("#86C3F2"), kReelColor("#D3ECFC")], ink: KReelInk.navy, bird: KReelInk.navy, birdAlpha: 0.55),
    "dusk": SkyLook(stops: [kReelColor("#6D58C6"), kReelColor("#C774A8"), kReelColor("#F59A55")], ink: .white, bird: kReelColor("#2A1E3D"), birdAlpha: 0.7),
    "night": SkyLook(stops: [kReelColor("#0E1838"), kReelColor("#24325F")], ink: .white, bird: .white, birdAlpha: 0.85),
  ]

  /// the night's stars, from a fixed seed so a card keeps its sky (v1-0-5 starsOf, mulberry32)
  static let stars: [(x: Double, y: Double, r: Double, a: Double)] = {
    var h: UInt32 = 105
    func next() -> Double {
      h = h &+ 0x6D2B_79F5
      var z = h
      z = (z ^ (z >> 15)) &* (z | 1)
      z ^= z &+ ((z ^ (z >> 7)) &* (z | 61))
      return Double(z ^ (z >> 14)) / 4_294_967_296
    }
    return (0..<16).map { _ in
      let x = 0.04 + 0.92 * next()
      let y = 0.05 + 0.65 * next()
      let r = 0.6 + 0.5 * next()
      let a = 0.55 + 0.45 * next()
      return (x, y, r, a)
    }
  }()

  /// Wren in flight as a silhouette (KWrenFlightShape): two swept wings and a tail
  static func flight(_ cx: CGFloat, _ cy: CGFloat, _ bw: CGFloat) -> Path {
    let bh = bw / 2, x0 = cx - bw / 2, y0 = cy - bh / 2
    func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: x0 + x * bw, y: y0 + y * bh) }
    var d = Path()
    d.move(to: p(0.47, 0.62)); d.addCurve(to: p(0, 0.12), control1: p(0.34, 0.4), control2: p(0.16, 0.16)); d.addCurve(to: p(0.42, 0.78), control1: p(0.2, 0.36), control2: p(0.3, 0.66)); d.closeSubpath()
    d.move(to: p(0.52, 0.6)); d.addCurve(to: p(1, 0), control1: p(0.66, 0.3), control2: p(0.84, 0.06)); d.addCurve(to: p(0.6, 0.76), control1: p(0.86, 0.28), control2: p(0.72, 0.58)); d.closeSubpath()
    d.move(to: p(0.4, 0.76)); d.addLine(to: p(0.26, 0.98)); d.addLine(to: p(0.44, 0.86)); d.closeSubpath()
    return d
  }

  struct SkyArt: View {
    let sky: String
    let w: CGFloat
    let h: CGFloat
    let bird: CGFloat
    var body: some View {
      let look = skies[sky] ?? skies["dusk"]!
      return Canvas { g, _ in
        let air = GraphicsContext.Shading.linearGradient(Gradient(colors: look.stops), startPoint: .zero, endPoint: CGPoint(x: 0, y: h))
        g.fill(Path(CGRect(x: 0, y: 0, width: w, height: h)), with: air)
        let u = min(w, h)
        func disc(_ cx: CGFloat, _ cy: CGFloat, _ r: CGFloat) -> Path { Path(ellipseIn: CGRect(x: cx - r, y: cy - r, width: 2 * r, height: 2 * r)) }
        switch sky {
        case "dawn":
          g.fill(disc(0.7 * w, 0.86 * h, 0.11 * h), with: .color(kReelColor("#FFF4E2").opacity(0.9)))
          g.fill(Path(CGRect(x: 0, y: 0.86 * h, width: w, height: 0.14 * h)), with: .color(kReelColor("#FFDDB8").opacity(0.7)))
          g.fill(Path(CGRect(x: 0, y: 0.86 * h - 1, width: w, height: 2)), with: .color(Color.white.opacity(0.25)))
        case "day":
          g.fill(disc(0.86 * w, 0.17 * h, 0.075 * h), with: .color(kReelColor("#FFF3C4")))
          for (cx, cy) in [(0.22, 0.3), (0.62, 0.2), (0.8, 0.48)] as [(CGFloat, CGFloat)] {
            var cl = disc(cx * w - 0.09 * u, cy * h + 0.02 * u, 0.07 * u)
            cl.addPath(disc(cx * w, cy * h - 0.02 * u, 0.095 * u))
            cl.addPath(disc(cx * w + 0.09 * u, cy * h + 0.025 * u, 0.065 * u))
            g.fill(cl, with: .color(Color.white.opacity(0.9)))
          }
        case "dusk":
          g.fill(disc(0.66 * w, h, 0.13 * h), with: .color(kReelColor("#FFD27A")))
        default:
          for st in stars {
            g.fill(disc(CGFloat(st.x) * w, CGFloat(st.y) * h, max(0.5, CGFloat(st.r) * (w / 240))), with: .color(Color.white.opacity(st.a)))
          }
          let moonR = 0.1 * h
          g.fill(disc(0.8 * w, 0.24 * h, moonR), with: .color(kReelColor("#F3EFD9")))
          g.fill(disc(0.8 * w + 0.64 * moonR, 0.24 * h - 0.28 * moonR, 0.92 * moonR), with: air)
        }
        let bx = 0.3 * w, by = 0.4 * h, bh = bird / 2
        var b = g
        b.opacity = look.birdAlpha
        b.translateBy(x: bx, y: by)
        b.rotate(by: .degrees(-8))
        b.translateBy(x: -bx, y: -by)
        var shape = flight(bx, by, bird)
        shape.addEllipse(in: CGRect(x: bx - bird / 2 + 0.51 * bird - 0.15 * bird, y: by - bh / 2 + 0.73 * bh - 0.15 * bh, width: 0.3 * bird, height: 0.3 * bh))
        shape.addEllipse(in: CGRect(x: bx - bird / 2 + 0.67 * bird - 0.07 * bird, y: by - bh / 2 + 0.62 * bh - 0.1 * bh, width: 0.14 * bird, height: 0.2 * bh))
        b.fill(shape, with: .color(look.bird))
      }
      .frame(width: w, height: h)
    }
  }

  /// a postcard (KWavePostcard): the sky, its name top left and the line at the foot in its own ink
  struct Postcard: View {
    let x: KReelCtx
    let sky: String
    let w: CGFloat
    let h: CGFloat
    let label: String
    let line: String
    let lineSize: CGFloat
    let bird: CGFloat
    var body: some View {
      let ink = (skies[sky] ?? skies["dusk"]!).ink
      let pad = w * 0.045
      return ZStack(alignment: .topLeading) {
        SkyArt(sky: sky, w: w, h: h, bird: bird)
        Text(label)
          .font(KReelFont.mono(max(8, lineSize * 0.62), .medium))
          .tracking(1.3)
          .foregroundStyle(ink.opacity(0.85))
          .lineLimit(1)
          .offset(x: pad, y: pad)
        Text(line)
          .font(KReelFont.letter(lineSize, x.face))
          .kReelLine(lineSize, lineSize * 1.3)
          .foregroundStyle(ink)
          .kReelFit(2, min: 0.8)
          .frame(width: w - 2 * pad, height: h - 2 * pad, alignment: .bottomLeading)
          .offset(x: pad, y: pad)
      }
      .frame(width: w, height: h, alignment: .topLeading)
      .clipShape(RoundedRectangle(cornerRadius: 18))
    }
  }

  static let waveTap: Double = 1650
  static let pairAt: Double = 2050

  struct SkyScene: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let out = c.once(300, waveTap + 250, KReelEase.inQuad)
      let px = s * 0.07, py = s * 0.26
      let w1 = s * 0.72, h1 = w1 * 2 / 3
      let capH = s * 0.1, capY = py + h1 + s * 0.03
      let gap = s * 0.03, w2 = (s * 0.86 - gap) / 2, h2 = w2 * 1.25
      let whose = KReelFont.mono(s * 0.025, .medium)
      let pair: [(sky: String, whose: String, at: Double)] = [("night", x.w("wave.yours"), pairAt), ("dusk", x.w("wave.theirs"), pairAt + 150)]
      return ZStack(alignment: .topLeading) {
        caption(x, "nw105.sky")
        // her wave: one postcard, and Wave Back under it
        VStack(alignment: .leading, spacing: s * 0.03) {
          Postcard(x: x, sky: "dusk", w: w1, h: h1, label: x.w("sky.dusk"), line: x.w("line.dusk"), lineSize: s * 0.045, bird: s * 0.09)
            .kReelRise(c, 0, dy: s * 0.04)
          Text(x.w("sp.wave.back"))
            .font(KReelFont.sys(s * 0.04, .semibold))
            .foregroundStyle(l.ind)
            .lineLimit(1)
            .padding(.horizontal, s * 0.05)
            .frame(height: capH)
            .background(Capsule().fill(l.lav))
            .kReelRise(c, 350, dy: s * 0.02)
        }
        .scaleEffect(1 - 0.04 * CGFloat(out))
        .opacity(1 - out)
        .offset(x: px, y: py)
        KReelFinger(c: c, x: px + s * 0.12, y: capY + capH / 2, at: waveTap, size: s * 0.15)
          .scaleEffect(1 - 0.04 * CGFloat(out))
          .opacity(1 - out)

        // waved back: the pair, yours first — your night beside her dusk
        HStack(alignment: .top, spacing: gap) {
          ForEach(0..<2, id: \.self) { i in
            let p = pair[i]
            VStack(alignment: .leading, spacing: s * 0.018) {
              Postcard(x: x, sky: p.sky, w: w2, h: h2, label: x.w("sky.\(p.sky)"), line: x.w("line.\(p.sky)"), lineSize: s * 0.036, bird: s * 0.065)
              Text(p.whose).font(whose).tracking(1.2).foregroundStyle(l.mute).kReelFit(1, min: 0.7).frame(width: w2, alignment: .leading)
            }
            .opacity(between(c, p.at))
          }
        }
        .offset(x: px, y: py)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  // MARK: 7 · the font

  struct FontScene: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let keys = x.list("fontKeys"), names = x.list("fontNames")
      let sample = x.w("fontSample")
      let runKeys = x.list("runKeys")
      let runAt = x.list("runAt").compactMap { Double($0) }
      let lx = s * 0.07, w = s * 0.86
      let cardY = s * 0.25, cardH = s * 0.2
      let boxY = s * 0.5, pad = s * 0.04, gap = s * 0.025
      let tw = (w - 2 * pad - gap) / 2, th = s * 0.12
      let tilesY = boxY + pad + s * 0.12
      func tileAt(_ i: Int) -> CGPoint { CGPoint(x: lx + pad + CGFloat(i % 2) * (tw + gap), y: tilesY + CGFloat(i / 2) * (th + gap)) }
      func at(_ i: Int) -> Double { i < runAt.count ? runAt[i] : 0 }
      let taps: [(x: CGFloat, y: CGFloat, at: Double)] = runKeys.indices.dropFirst().map { r in
        let p = tileAt(keys.firstIndex(of: runKeys[r]) ?? 0)
        return (x: p.x + tw * 0.55, y: p.y + th * 0.55, at: at(r))
      }
      return ZStack(alignment: .topLeading) {
        caption(x, "nw105.font")
        // a letter, in the face the reader picks
        ZStack(alignment: .leading) {
          Color.white
          ForEach(0..<runKeys.count, id: \.self) { r in
            let size = fit(s * 0.052, x.num("fit.\(runKeys[r])", 1))
            Text(x.w("nw105.font.line"))
              .font(KReelFont.letter(size, KLetterFace(key: runKeys[r])))
              .kReelLine(size, size * 1.3)
              .foregroundStyle(l.ink)
              .kReelFit(2, min: 0.7)
              .frame(width: w - s * 0.1, alignment: .leading)
              .offset(x: s * 0.05)
              .opacity(between(c, at(r), r + 1 < runKeys.count ? at(r + 1) : nil))
          }
        }
        .frame(width: w, height: cardH)
        .clipShape(RoundedRectangle(cornerRadius: s * 0.045))
        .kReelRise(c, 0, dy: s * 0.03)
        .offset(x: lx, y: cardY)

        // Settings: Font, what it's for, the tiles
        VStack(alignment: .leading, spacing: s * 0.008) {
          Text(x.w("set.letterFont")).font(KReelFont.sys(s * 0.042)).foregroundStyle(l.ink).lineLimit(1)
          Text(x.w("set.letterFont.sub")).font(KReelFont.sys(s * 0.032)).foregroundStyle(l.mute).kReelFit(1, min: 0.7)
        }
        .padding(pad)
        .frame(width: w, height: s * 0.12 + 2 * th + gap + 2 * pad, alignment: .topLeading)
        .background(RoundedRectangle(cornerRadius: s * 0.04).fill(Color.white))
        .kReelRise(c, 150, dy: s * 0.03)
        .offset(x: lx, y: boxY)
        ForEach(0..<keys.count, id: \.self) { i in
          let p = tileAt(i)
          let run = runKeys.firstIndex(of: keys[i])
          ZStack {
            VStack(spacing: s * 0.004) {
              Text(sample)
                .font(KReelFont.letter(s * 0.058, KLetterFace(key: keys[i])))
                .foregroundStyle(l.ink)
                .lineLimit(1)
                .frame(height: s * 0.066)
              Text(i < names.count ? names[i] : "")
                .font(KReelFont.sys(s * 0.03, .medium))
                .foregroundStyle(l.sub)
                .kReelFit(1, min: 0.7)
                .frame(height: s * 0.038)
            }
            .frame(width: tw, height: th)
            .background(RoundedRectangle(cornerRadius: 12).fill(Color.white))
            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(l.line, lineWidth: 1))
            if let run {
              // the selected look: a 2pt ind border in a 3pt lav halo
              ZStack {
                RoundedRectangle(cornerRadius: 15).strokeBorder(l.lav, lineWidth: 3)
                RoundedRectangle(cornerRadius: 12).strokeBorder(l.ind, lineWidth: 2).padding(3)
              }
              .frame(width: tw + 6, height: th + 6)
              .opacity(between(c, at(run), run + 1 < runKeys.count ? at(run + 1) : nil))
            }
          }
          .frame(width: tw, height: th)
          .kReelRise(c, 250 + Double(i) * 60, dy: s * 0.02)
          .offset(x: p.x, y: p.y)
        }
        Taps(c: c, taps: taps, size: s * 0.13)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }
}

/// a paper as TS reads it off data/papers (swift-reel-data NEWS105 paperFacts)
struct KReelPaperJSON: Decodable {
  struct Line: Decodable { var w: Double; var color: String; var dashed: Bool }
  struct Hard: Decodable { var x: Double; var y: Double; var color: String }
  var id: String
  var first: Bool
  var head: String
  var nameLower: String
  var ground: String
  var ink: String
  var lineColor: String
  var radius: Double
  var tRadius: Double
  var line: Line?
  var tLine: Line?
  var hard: Hard?
  var soft: Bool
  var glow: Hard?
  var stripes: Double
  var tStripes: Double
  var stripeColors: [String]
  var gridInk: String?
  var torn: Bool
  var fold: Bool
}
