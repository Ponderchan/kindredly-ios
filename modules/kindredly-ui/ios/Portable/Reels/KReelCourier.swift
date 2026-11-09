import SwiftUI

/*
 THE COURIER'S REEL, in SwiftUI — src/components/guide-reel/courier.tsx, six scenes, all of her:
   1  the egg you picked knocks, cracks and opens; she rises out of the bottom shell and a finger
      pokes her (she answers with a heart)
   2  her name, typed onto a tag hung from her
   3  her coat goes Sky → Mist → Peach → Night, then a beanie pops on; the three First Class
      coats carry a small lock on their swatches
   4  the lock screen: her Live Activity rises in with your letter out, desks tick up, then a
      reply lands — she knocks, and she's back
   5  Settings' two switches, and a finger turns the 8 o'clock knock on
   6  the title, with her flying past
 Her pictures are snapshots of the real WrenBird (lib/bird-images reel* poses: the hatchling
 bare in three faces, each coat, the beanie, her two faces in Settings), at her own stage, or
 hatched when she is still an egg, as courier.tsx's useHatchedStage draws her. The egg is the one
 the reader picked (its four colours from TS); the shell is drawn here from EggShell's own
 outline, crack line, speckles and birthmark. The beats that are JS timers in React Native (her
 face, a coat, a count, the name typed) read the scene's clock in real time; the name is simply
 there under Reduce Motion, as NameTag does.
 Words (TS): wren (her name), la.out.* (the {name} and {n} filled here), skin.<coat> (upper-cased),
 set.sec.quiet, set.notify.title, set.knock.title, gd.courier.title. Facts: colors shell.base /
 mid / deep / mark, chick.<coat>. Pictures: hatchContent, hatchDelight, hatchCurious,
 coat.<coat>, coatBeanie, curious, delight, fly.
 */
enum KReelCourier {
  static let ink = KReelInk.ink // Y.ink
  static let out = KReelEase.outCubic
  static let back = KReelEase.outBack(1.5)
  static let pop = KReelEase.outBack(1.8)
  static let coats = ["sticker", "plush", "peach", "ink"] // Sky, Mist, Peach, Night
  static let brass = kReelColor("#E8A63C")
  static let brassInk = kReelColor("#9A7433")

  static let def = KReelDef(bg: KReelInk.penWash, scenes: [
    KReelScene(key: "hatch", ms: 3400) { AnyView(Hatch(x: $0)) },
    KReelScene(key: "name", ms: 3000) { AnyView(NameTag(x: $0)) },
    KReelScene(key: "dress", ms: 3200) { AnyView(Dress(x: $0)) },
    KReelScene(key: "lock", ms: 3400) { AnyView(LockScreen(x: $0)) },
    KReelScene(key: "knocks", ms: 3000) { AnyView(Knocks(x: $0)) },
    KReelScene(key: "title", ms: 2600) { AnyView(Title(x: $0)) },
  ])

  /// the kit's Pop with its curve made once (courier PopIn)
  static func popIn(_ c: KReelClock, _ delay: Double) -> (scale: CGFloat, opacity: Double) {
    let v = c.once(420, delay, pop)
    return (0.4 + 0.6 * CGFloat(v), min(1, v * 1.4))
  }

  static func hop(_ c: KReelClock, _ at: Double, down: Double = 300) -> Double {
    c.seq(at, [KReelStep(to: 1, ms: 150, ease: KReelEase.outQuad), KReelStep(to: 0, ms: down, ease: KReelEase.bounce)])
  }

  // MARK: 1 · the hatch

  static let crackPts: [(CGFloat, CGFloat)] = [(-74, 6), (-52, -8), (-30, 4), (-8, -12), (14, 0), (36, -14), (56, -2), (74, 6)]
  static let topRest: [(CGFloat, CGFloat)] = [(72, -20), (64, -50), (48, -76), (26, -92), (0, -96), (-26, -92), (-48, -76), (-64, -50), (-72, -20)]
  static let bottomRest: [(CGFloat, CGFloat)] = [(68, 38), (52, 68), (30, 88), (0, 96), (-30, 88), (-52, 68), (-68, 38)]
  static let rim: [(CGFloat, CGFloat)] = [(0, -96), (26, -92), (48, -76), (64, -50), (72, -20), (74, 6), (68, 38), (52, 68), (30, 88), (0, 96), (-30, 88), (-52, 68), (-68, 38), (-74, 6), (-72, -20), (-64, -50), (-48, -76), (-26, -92)]
  static let markD = "M-10 -60 q10 -8 20 0 q-4 10 -10 10 q-6 0 -10 -10z"

  enum Part { case top, bottom, whole }

  static func polygon(_ pts: [(CGFloat, CGFloat)]) -> Path {
    var p = Path()
    for (i, q) in pts.enumerated() {
      if i == 0 { p.move(to: CGPoint(x: q.0, y: q.1)) } else { p.addLine(to: CGPoint(x: q.0, y: q.1)) }
    }
    p.closeSubpath()
    return p
  }

  /// the egg's outline split along the hatch's own crack line (EggShell RIM and CRACK), viewBox −110 −110 220 220
  struct EggPiece: View {
    let x: KReelCtx
    let size: CGFloat
    let part: Part
    var body: some View {
      let base = kReelColor(x.data.colors["shell.base"] ?? "#E6E9F6")
      let mid = kReelColor(x.data.colors["shell.mid"] ?? "#D2D7EC")
      let deep = kReelColor(x.data.colors["shell.deep"] ?? "#B8BFDC")
      let mark = kReelColor(x.data.colors["shell.mark"] ?? "#7C86B8")
      return Canvas { gc, sz in
        let k = sz.width / 220
        var g = gc
        g.scaleBy(x: k, y: k)
        g.translateBy(x: 110, y: 110)
        let pts: [(CGFloat, CGFloat)] = part == .top ? crackPts + topRest : part == .bottom ? crackPts + bottomRest : rim
        let shape = polygon(pts)
        let grad = Gradient(stops: [.init(color: .white, location: 0), .init(color: base, location: 0.46), .init(color: mid, location: 1)])
        g.fill(shape, with: .linearGradient(grad, startPoint: CGPoint(x: -40, y: -96), endPoint: CGPoint(x: 50, y: 96)))
        g.stroke(shape, with: .color(ink), style: StrokeStyle(lineWidth: 2.6, lineJoin: .round))
        var dots: [(CGFloat, CGFloat, CGFloat)] = []
        if part != .bottom { dots += [(-30, -44, 4.6), (26, -20, 3.4)] }
        if part != .top { dots += [(-14, 30, 3), (38, 44, 4)] }
        for d in dots {
          g.fill(Path(ellipseIn: CGRect(x: d.0 - d.2, y: d.1 - d.2, width: 2 * d.2, height: 2 * d.2)), with: .color(deep.opacity(0.55)))
        }
        if part != .bottom {
          g.fill(KReelPaths.parsed(markD), with: .color(mark.opacity(0.7)))
        }
      }
      .frame(width: size, height: size)
    }
  }

  struct Heart: View {
    let size: CGFloat
    var body: some View {
      let d = "M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.2 4.3 2.4.7-1.2 2.1-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21Z"
      return ZStack {
        KReelPath(d).fill(kReelColor("#F2887E"))
        KReelPath(d).stroke(ink, style: StrokeStyle(lineWidth: 1.4 * size / 24, lineJoin: .round))
      }
      .frame(width: size, height: size)
    }
  }

  struct Hatch: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let loved = c.after(2520)
      let e = s * 0.7
      let k = e / 220
      let cy = s * 0.56
      let b = s * 0.56
      let top = cy + 20 * k - 0.83 * b
      // three knocks, each harder, while the crack runs across; then it opens
      func knock(_ deg: Double, hold: Double) -> [KReelStep] {
        [KReelStep(to: deg, ms: 70, hold: hold), KReelStep(to: -deg * 0.7, ms: 90), KReelStep(to: 0, ms: 100)]
      }
      let wob = c.seq(0, knock(5, hold: 250) + knock(7, hold: 140) + knock(9, hold: 90))
      let hp = hop(c, 2500, down: 280)
      let crack = c.once(1000, 250, KReelEase.linear)
      let burst = c.once(650, 1350, out)
      let rise = c.once(560, 1350, back)
      let g0 = s * 0.78
      let heart = popIn(c, 2560)
      let crackPath = "M-74 6 L-52 -8 L-30 4 L-8 -12 L14 0 L36 -14 L56 -2 L74 6"
      let bu = CGFloat(burst)
      return ZStack(alignment: .topLeading) {
        // the light from inside
        Circle().fill(kReelColor("#FFD98A"))
          .frame(width: g0, height: g0)
          .scaleEffect(0.8 + 0.2 * CGFloat(crack) + 0.45 * bu)
          .opacity(burst > 0 ? 0.15 + 0.6 * (1 - burst) : 0.12 + 0.5 * crack)
          .offset(x: (s - g0) / 2, y: cy - g0 / 2)
        // the ground under the egg
        RoundedRectangle(cornerRadius: s * 0.02).fill(ink).opacity(0.1)
          .kReelBox(s * 0.31, cy + 94 * k, s * 0.38, s * 0.035)
        // her, behind the bottom shell
        KReelBird(ref: x.img(loved ? "hatchDelight" : "hatchContent"), size: b)
          .rotationEffect(.degrees(hp * -6))
          .offset(y: (1 - CGFloat(rise)) * s * 0.22 - CGFloat(hp) * s * 0.06)
          .opacity(min(1, rise * 3))
          .offset(x: (s - b) / 2, y: top)
        ZStack(alignment: .topLeading) {
          EggPiece(x: x, size: e, part: .bottom)
          EggPiece(x: x, size: e, part: .top)
            .rotationEffect(.degrees(55 * burst))
            .offset(x: s * 0.2 * bu, y: -s * 0.55 * bu)
            .opacity(1 - burst)
          EggPiece(x: x, size: e, part: .whole).opacity(burst > 0 ? 0 : 1)
          KReelPath(crackPath, box: CGRect(x: -110, y: -110, width: 220, height: 220))
            .stroke(ink, style: StrokeStyle(lineWidth: 3.2 * k, lineCap: .round, lineJoin: .round))
            .frame(width: e, height: e)
            .frame(width: min(e, (36 + 148 * CGFloat(crack)) * k + 3), height: e, alignment: .leading)
            .clipped()
            .opacity(burst > 0 ? 0 : 1)
        }
        .frame(width: e, height: e, alignment: .topLeading)
        .rotationEffect(.degrees(wob))
        .offset(x: (s - e) / 2, y: cy - e / 2)
        kReelColor("#FFF6E3")
          .frame(width: s, height: s)
          .opacity(burst > 0 ? 0.6 * (1 - burst) * (1 - burst) : 0)
        // poke her head: a heart, as the hatch answers
        Heart(size: s * 0.11)
          .scaleEffect(heart.scale)
          .opacity(heart.opacity)
          .offset(x: s / 2 - s * 0.25, y: top + b * 0.1)
        KReelFinger(c: c, x: s / 2 + s * 0.08, y: top + b * 0.38, at: 2500, size: s * 0.17)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  // MARK: 2 · her name

  struct NameTag: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let name = x.w("wren")
      let chars = Array(name)
      // one letter every 110 ms after a 650 ms pause; with Reduce Motion the name is simply there
      let typedN = c.still ? chars.count : chars.indices.filter { c.after(650 + Double($0) * 110) }.count
      let done = typedN >= chars.count
      let doneAt = c.still ? 0 : 650 + Double(max(0, chars.count - 1)) * 110
      let typed = String(chars.prefix(typedN))
      let come = c.once(520, 60, back)
      let sway = c.loop(1300)
      let blink = c.loop(320)
      let hp = done ? hop(c, doneAt) : 0
      let b = s * 0.46
      let gt = s * 0.36
      let tw = s * 0.78
      let th = s * 0.28
      let tagTop = s * 0.14
      let line = max(2, s * 0.009)
      let holeY = tagTop + line + s * 0.044
      let units = name.unicodeScalars.reduce(0.0) { $0 + (kReelCourierWide($1) ? 1 : 0.62) }
      let fs = min(s * 0.13, (s * 0.6) / CGFloat(max(units, 1.8)))
      let check = popIn(c, doneAt)
      return ZStack(alignment: .topLeading) {
        ZStack(alignment: .topLeading) {
          Path { p in
            p.move(to: CGPoint(x: s / 2 - s * 0.07, y: s * 0.02))
            p.addLine(to: CGPoint(x: s / 2, y: holeY))
            p.addLine(to: CGPoint(x: s / 2 + s * 0.07, y: s * 0.02))
          }
          .stroke(KReelInk.ink, style: StrokeStyle(lineWidth: line, lineCap: .round, lineJoin: .round))
          ZStack(alignment: .topLeading) {
            Circle().fill(KReelInk.penWash)
              .overlay(Circle().strokeBorder(KReelInk.ink, lineWidth: line))
              .frame(width: s * 0.044, height: s * 0.044)
              .offset(x: tw / 2 - s * 0.022, y: line + s * 0.022)
            HStack(spacing: 0) {
              Text(typed)
                .font(KReelFont.sys(fs, .bold))
                .tracking(-0.3)
                .foregroundStyle(KReelInk.ink)
                .kReelFit()
              if !done {
                RoundedRectangle(cornerRadius: 1).fill(KReelInk.pen)
                  .frame(width: max(2, s * 0.011), height: fs * 0.95)
                  .padding(.leading, s * 0.008)
                  .opacity(blink > 0.5 ? 1 : 0.15)
              }
            }
            .frame(maxWidth: tw - s * 0.08)
            .frame(width: tw, height: th)
            .offset(y: s * 0.02)
            KReelInk.pen.opacity(0.35)
              .kReelBox(tw * 0.14, th - line - s * 0.05 - max(1.5, s * 0.006), tw * 0.72, max(1.5, s * 0.006))
            if done {
              KReelPath("M5 12.5l4.5 4.5L19 7.5")
                .stroke(Color.white, style: StrokeStyle(lineWidth: 3.2 * s * 0.045 / 24, lineCap: .round, lineJoin: .round))
                .frame(width: s * 0.045, height: s * 0.045)
                .frame(width: s * 0.075, height: s * 0.075)
                .background(Circle().fill(KReelInk.pen))
                .scaleEffect(check.scale)
                .opacity(check.opacity)
                .offset(x: tw - line - s * 0.03 - s * 0.075, y: line + s * 0.025)
            }
          }
          .frame(width: tw, height: th, alignment: .topLeading)
          .background(RoundedRectangle(cornerRadius: s * 0.035).fill(Color.white))
          .overlay(RoundedRectangle(cornerRadius: s * 0.035).strokeBorder(KReelInk.ink, lineWidth: line))
          .offset(x: (s - tw) / 2, y: tagTop)
        }
        .frame(width: s, height: s * 0.5, alignment: .topLeading)
        .scaleEffect(1 + 0.04 * CGFloat(hp), anchor: .top)
        .rotationEffect(.degrees(-2 + 4 * sway), anchor: .top)
        .offset(y: -(1 - CGFloat(come)) * s * 0.08)
        .opacity(come)
        .offset(y: gt)
        // her, in front of the strings
        KReelBird(ref: x.img(done ? "hatchDelight" : "hatchCurious"), size: b)
          .offset(y: -CGFloat(hp) * s * 0.05)
          .offset(x: (s - b) / 2, y: s * 0.06)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  // MARK: 3 · what she wears

  static let dressBeats: [Double] = [650, 1250, 1850, 2450]

  struct Sparkle: View {
    let size: CGFloat
    var body: some View {
      KReelPath("M12 1.5 L14 10 L22.5 12 L14 14 L12 22.5 L10 14 L1.5 12 L10 10 Z").fill(KReelInk.pen).frame(width: size, height: size)
    }
  }

  /// courier.tsx Lock: a padlock in a 20 × 22 box, stroked
  struct Lock: View {
    let size: CGFloat
    let color: Color
    var body: some View {
      let k = size / 20
      return ZStack(alignment: .topLeading) {
        RoundedRectangle(cornerRadius: 2 * k)
          .stroke(color, lineWidth: 2.2 * k)
          .frame(width: 14 * k, height: 11 * k)
          .offset(x: 3 * k, y: 9 * k)
        KReelPath("M6.5 9V6a3.5 3.5 0 0 1 7 0v3", box: CGRect(x: 0, y: 0, width: 20, height: 22))
          .stroke(color, style: StrokeStyle(lineWidth: 2.2 * k, lineCap: .round, lineJoin: .round))
          .frame(width: size, height: size * 1.1)
      }
      .frame(width: size, height: size, alignment: .topLeading)
    }
  }

  struct Dress: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let n = c.beats(dressBeats)
      let at = min(n, coats.count - 1)
      let coat = coats[at]
      let beanie = n >= dressBeats.count
      let bump = n == 0 ? 0 : c.seq(dressBeats[n - 1], [KReelStep(to: 1, ms: 90), KReelStep(to: 0, ms: 300, ease: KReelEase.outBack(2.4))])
      let d = s * 0.56
      let b = s * 0.52
      let discTop = s * 0.1
      let w = s * 0.085
      let ring = w + s * 0.034
      let line = max(2, s * 0.008)
      let birdIn = popIn(c, 60)
      let sparkles: [(CGFloat, CGFloat, CGFloat, Double)] = [(-0.24, 0.17, 0.06, 0), (0.18, 0.13, 0.075, 70), (0.22, 0.3, 0.045, 140)]
      return ZStack(alignment: .topLeading) {
        Circle().fill(Color.white).frame(width: d, height: d).offset(x: (s - d) / 2, y: discTop)
        KReelBird(ref: x.img(beanie ? "coatBeanie" : "coat.\(coat)"), size: b)
          .scaleEffect(birdIn.scale)
          .opacity(birdIn.opacity)
          .scaleEffect(1 - 0.1 * CGFloat(bump))
          .offset(y: CGFloat(bump) * s * 0.02)
          .offset(x: (s - b) / 2 + s * 0.015, y: discTop + (d - b) / 2 + s * 0.01)
        if beanie {
          ForEach(0..<3, id: \.self) { i in
            let sp = sparkles[i]
            let v = popIn(c, dressBeats[3] + sp.3)
            Sparkle(size: s * sp.2)
              .scaleEffect(v.scale)
              .opacity(v.opacity)
              .offset(x: s / 2 + s * sp.0, y: s * sp.1)
          }
        }
        Text(x.w("skin.\(coat)"))
          .font(KReelFont.mono(s * 0.052, .semibold))
          .tracking(s * 0.006)
          .foregroundStyle(KReelInk.ink)
          .lineLimit(1)
          .frame(width: s)
          .offset(y: s * 0.69)
        HStack(spacing: s * 0.035) {
          ForEach(0..<coats.count, id: \.self) { i in
            ZStack(alignment: .bottomTrailing) {
              Circle().strokeBorder(i == at ? KReelInk.ink : Color.clear, lineWidth: line)
                .frame(width: ring, height: ring)
                .overlay(Circle().fill(kReelColor(x.data.colors["chick.\(coats[i])"] ?? "#5757EC")).frame(width: w, height: w))
              if i > 0 {
                Lock(size: s * 0.024, color: KReelInk.ink)
                  .frame(width: s * 0.042, height: s * 0.042)
                  .background(Circle().fill(Color.white))
                  .overlay(Circle().strokeBorder(KReelInk.ink, lineWidth: max(1, s * 0.004)))
                  .offset(x: s * 0.012, y: s * 0.012)
              }
            }
            .frame(width: ring, height: ring)
          }
        }
        .frame(width: s)
        .offset(y: s * 0.79)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  // MARK: 4 · on the lock screen

  static let lockBeats: [Double] = [950, 1350, 1750, 2250]

  /// the Live Activity's envelope, 24 × 18.7
  struct Envelope: View {
    let w: CGFloat
    let color: Color
    var open: Bool = false
    var body: some View {
      let k = w / 24
      return ZStack(alignment: .topLeading) {
        RoundedRectangle(cornerRadius: 2.2 * k).fill(color).frame(width: 22 * k, height: 16.7 * k).offset(x: k, y: k)
        KReelPath(open ? "M1.5 2.2 L12 10.4 L22.5 2.2" : "M1.5 2 L12 10 L22.5 2", box: CGRect(x: 0, y: 0, width: 24, height: 18.7))
          .stroke(Color.white, style: StrokeStyle(lineWidth: 1.8 * k, lineJoin: .round))
      }
      .frame(width: w, height: w * 0.78, alignment: .topLeading)
    }
  }

  struct LockScreen: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let name = x.w("wren").uppercased()
      let n = c.beats(lockBeats)
      let reads = min(n, 3)
      let replied = n >= lockBeats.count
      let come = c.once(560, 250, back)
      let shake = c.seq(2250, [KReelStep(to: 1, ms: 55), KReelStep(to: -1, ms: 55), KReelStep(to: 1, ms: 55), KReelStep(to: -1, ms: 55), KReelStep(to: 0, ms: 55)])
      let ring = c.seq(2250, [KReelStep(to: 1, ms: 450, ease: KReelEase.outQuad), KReelStep(to: 0, ms: 0), KReelStep(to: 1, ms: 450, ease: KReelEase.outQuad)])
      let eyebrow = replied ? x.w("la.out.back", ["name": name]) : x.w("la.out.eyebrow", ["name": name])
      let head = replied ? x.w("la.out.repliedHead") : reads == 0 ? x.w("la.out.reads0") : reads == 1 ? x.w("la.out.reads1") : x.w("la.out.readsN", ["n": "\(reads)"])
      let said = replied ? x.w("la.out.repliedLine") : x.w("la.out.looking")
      let pw = s * 0.9
      let pl = (s - pw) / 2
      let pt = s * 0.085
      let edge = max(2, s * 0.012)
      let bw = s * 0.16
      let backIn = popIn(c, lockBeats[3])
      return ZStack(alignment: .topLeading) {
        ZStack(alignment: .topLeading) {
          kReelColor("#1B1A33")
          VStack(spacing: 0) {
            Lock(size: s * 0.045, color: .white)
            Text("9:41")
              .font(KReelFont.sys(s * 0.17, .bold))
              .tracking(-1)
              .foregroundStyle(Color.white)
              .fixedSize()
              .frame(height: s * 0.2)
              .padding(.top, s * 0.01)
          }
          .frame(width: pw - 2 * edge)
          .offset(y: edge + s * 0.055)
          // her Live Activity, as LetterOut draws it
          HStack(alignment: .center, spacing: 0) {
            ZStack {
              Circle().strokeBorder(KReelInk.pen, lineWidth: max(2, s * 0.008))
                .frame(width: bw, height: bw)
                .scaleEffect(0.8 + 0.8 * ring)
                .opacity(ring > 0 ? 0.9 * (1 - ring) : 0)
              KReelBird(ref: x.img(replied ? "delight" : "fly"), size: bw)
            }
            .frame(width: bw, height: bw)
            VStack(alignment: .leading, spacing: 0) {
              Text(eyebrow)
                .font(KReelFont.mono(s * 0.032, .semibold))
                .tracking(0.4)
                .foregroundStyle(replied ? brassInk : KReelInk.ink60)
                .kReelFit(1, min: 0.7)
              Text(head)
                .font(KReelFont.sys(s * 0.052, .semibold))
                .kReelLine(s * 0.052, s * 0.064)
                .foregroundStyle(KReelInk.ink)
                .kReelFit(2, min: 0.75)
                .padding(.top, s * 0.012)
              if !replied && reads > 0 {
                HStack(spacing: s * 0.01) {
                  ForEach(0..<reads, id: \.self) { i in
                    let v = popIn(c, lockBeats[i])
                    Envelope(w: s * 0.04, color: KReelInk.pen, open: true).scaleEffect(v.scale).opacity(v.opacity)
                  }
                }
                .padding(.top, s * 0.014)
              }
              HStack(alignment: .center, spacing: 0) {
                if replied {
                  Envelope(w: s * 0.045, color: brass)
                    .scaleEffect(backIn.scale)
                    .opacity(backIn.opacity)
                    .padding(.trailing, s * 0.012)
                }
                Text(said)
                  .font(KReelFont.mono(s * 0.033, .regular))
                  .kReelLine(s * 0.033, s * 0.043)
                  .foregroundStyle(replied ? brassInk : KReelInk.ink60)
                  .kReelFit(2, min: 0.75)
                  .frame(maxWidth: .infinity, alignment: .leading)
              }
              .padding(.top, s * 0.014)
            }
            .padding(.leading, s * 0.028)
            .frame(maxWidth: .infinity, alignment: .leading)
          }
          .padding(s * 0.032)
          .frame(width: pw - 2 * edge - s * 0.05)
          .background(RoundedRectangle(cornerRadius: s * 0.06).fill(KReelInk.penWash))
          .offset(x: CGFloat(shake) * s * 0.014, y: (1 - CGFloat(come)) * s * 0.16)
          .opacity(min(1, come * 1.5))
          .offset(x: edge + s * 0.025, y: edge + s * 0.36)
        }
        .frame(width: pw, height: s * 1.02, alignment: .topLeading)
        .clipShape(RoundedRectangle(cornerRadius: s * 0.12))
        .overlay(RoundedRectangle(cornerRadius: s * 0.12).strokeBorder(KReelInk.navy, lineWidth: edge))
        .offset(x: pl, y: pt)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  // MARK: 5 · two switches

  static let knockAt: Double = 1300

  struct Toggle: View {
    let s: CGFloat
    let on: Double
    var body: some View {
      let w = s * 0.13
      let h = w * 0.6
      let knob = h - 4
      return Circle().fill(Color.white)
        .frame(width: knob, height: knob)
        .offset(x: CGFloat(on) * (w - knob - 4))
        .padding(.horizontal, 2)
        .frame(width: w, height: h, alignment: .leading)
        .background(Capsule().fill(KReelInk.mix(kReelColor("#D8D8D6"), KReelInk.pen, on)))
    }
  }

  struct Knocks: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let glad = c.after(knockAt + 120)
      let knock = c.once(240, knockAt + 60, out)
      let come = c.once(460, 120, back)
      let hp = hop(c, knockAt + 120)
      let cl = s * 0.07, cw = s * 0.86, ct = s * 0.25
      let rowH = s * 0.15
      let padX = s * 0.05
      let b = s * 0.27
      func row(_ key: String, _ on: Double, last: Bool) -> some View {
        HStack(spacing: s * 0.03) {
          Text(x.w(key))
            .font(KReelFont.sys(s * 0.05))
            .foregroundStyle(KReelInk.ink)
            .kReelFit(1, min: 0.7)
            .frame(maxWidth: .infinity, alignment: .leading)
          Toggle(s: s, on: on)
        }
        .padding(.horizontal, padX)
        .frame(height: rowH)
        .overlay(alignment: .bottom) { if !last { KReelInk.ink12.frame(height: 1) } }
      }
      return ZStack(alignment: .topLeading) {
        ZStack(alignment: .topLeading) {
          Text(x.w("set.sec.quiet"))
            .font(KReelFont.mono(s * 0.034, .semibold))
            .tracking(s * 0.004)
            .foregroundStyle(KReelInk.ink60)
            .lineLimit(1)
            .frame(width: cw - 2 * padX, alignment: .leading)
            .offset(x: padX, y: ct - s * 0.062)
          VStack(spacing: 0) {
            row("set.notify.title", 1, last: false)
            row("set.knock.title", knock, last: true)
          }
          .frame(width: cw)
          .background(Color.white)
          .clipShape(RoundedRectangle(cornerRadius: s * 0.045))
          .offset(y: ct)
        }
        .frame(width: cw, height: s, alignment: .topLeading)
        .offset(y: (1 - CGFloat(come)) * s * 0.05)
        .opacity(come)
        .offset(x: cl)
        // her, under the switches: glad when the knock goes on
        KReelBird(ref: x.img(glad ? "delight" : "curious"), size: b)
          .offset(y: -CGFloat(hp) * s * 0.05)
          .offset(x: (s - b) / 2, y: ct + 2 * rowH + s * 0.07)
        KReelFinger(c: c, x: cl + cw - padX - s * 0.065, y: ct + rowH * 1.5, at: knockAt, size: s * 0.15)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  // MARK: 6 · the title

  struct Title: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let words = KReelBigType.words(x.w("gd.courier.title"))
      let come = c.once(800, 450, out)
      let bob = c.loop(700)
      let b = s * 0.24
      return ZStack(alignment: .topLeading) {
        KReelBigType(c: c, s: s, words: words, accent: [words.count - 1])
        KReelBird(ref: x.img("fly"), size: b)
          .offset(x: (1 - CGFloat(come)) * s * 0.35, y: (1 - CGFloat(come)) * s * 0.12 - CGFloat(bob) * s * 0.025)
          .opacity(come)
          .offset(x: s - s * 0.07 - b, y: s * 0.7)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }
}

/// courier.tsx isWide: a CJK, kana or hangul letter is about a full em wide
func kReelCourierWide(_ u: Unicode.Scalar) -> Bool {
  let p = u.value
  return (0x1100...0x11FF).contains(p) || (0x2E80...0x9FFF).contains(p) || (0xAC00...0xD7AF).contains(p) || (0xF900...0xFAFF).contains(p) || (0xFF00...0xFFEF).contains(p)
}
