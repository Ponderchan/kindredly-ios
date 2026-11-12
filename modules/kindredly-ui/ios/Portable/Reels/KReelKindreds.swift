import SwiftUI

/*
 HOW A KINDRED FORMS, AS A REEL, in SwiftUI — src/components/guide-reel/kindreds.tsx (the 1.0.5
 identity), scene for scene:
   1. Wren brings a reply; it drops into a pen pal row (their frosted window, the courier name
      the reader's courier gives them, their star sign (never ♀ / ♂: 2026-11-12), the blue badge) and a
      finger opens it.
   2. Five letters each way fill turn by turn under their window, and at five each the sign door
      arrives.
   3. Signing: the sheet rises, the pen name is typed, signed on the pad stroke by stroke, Sign
      and Send, and what was signed waits sealed.
   4. Both open together: the envelopes lift, each window wipes clear onto the face its person
      sent, the courier names are struck, the signatures draw in with the pen names under them,
      and KINDREDS · today slaps under the two of you.
   5. The letters become a room: the thread's cards shrink into bubbles, the header's window and
      courier name turn into their face and pen name, and a This or That opens: Same!
   6. The title.
 The signatures are lib/pen-signature's made-up demo drawings; TS sends each one's draw plan
 (penDrawPlan's strokes, their delays, durations and lengths) and its viewBox, and Swift draws a
 stroke's dash running out as a trim of its path. The steps that are JS timers in React Native
 (the letters each way, the pen name typed, the door) read the scene's clock in real time.
 Words (TS): the scenes' t() keys, already upper-cased or sentence-cased where the scene does it
 (palName, palNameUp, myNameUp, palPen, myPen, sinceChip, pick.label, pick.asked), pick.q/a/b (the deck's
 pair in the reader's language), mk.ofFive with its {n} filled here. Facts: frosts pal / me,
 sigs pad / mine / theirs, nums penAspect, penBaseline, uprightPen, uprightEmpty, titleFit,
 titleAccent; lists titleParts. Pictures: fly (her flying empty-handed, happy), palFace, myFace.
 */
enum KReelKindreds {
  static let line = kReelColor("rgba(17,17,19,0.14)")
  static let ln = KReelInk.navy
  static let sub = KReelInk.sub
  static let mute = KReelInk.mute
  static let soft = KReelInk.soft
  static let lav = KReelInk.lav
  static let ind = KReelInk.ind
  static let paperWhite = Color.white
  static let greenText = kReelColor("#2E7D4F")
  static let pop = KReelEase.outBack(2)
  static let smooth: (Double) -> Double = { $0 * $0 * (3 - 2 * $0) }

  static let def = KReelDef(bg: KReelInk.penWash, scenes: [
    KReelScene(key: "reply", ms: 3400) { AnyView(Reply(x: $0)) },
    KReelScene(key: "each-way", ms: 3200) { AnyView(EachWay(x: $0)) },
    KReelScene(key: "sign", ms: 3900) { AnyView(Sign(x: $0)) },
    KReelScene(key: "open", ms: 4100) { AnyView(Open(x: $0)) },
    KReelScene(key: "room", ms: 3900) { AnyView(Room(x: $0)) },
    KReelScene(key: "title", ms: 2600) { AnyView(Title(x: $0)) },
  ])

  /// pop in with a stable curve (kindreds Appear)
  static func appear(_ c: KReelClock, _ delay: Double) -> (scale: CGFloat, opacity: Double) {
    let v = c.once(420, delay, pop)
    return (0.5 + 0.5 * CGFloat(v), min(1, v * 1.4))
  }

  /// their courier name, then their star sign (WhoGlyphs). No ♀ / ♂: a pen pal is still a stranger,
  /// and the mark is a kindred's to see (owner, 2026-11-12)
  struct PalName: View {
    let x: KReelCtx
    let size: CGFloat
    var body: some View {
      let g = size * 0.8
      return HStack(spacing: 0) {
        Text(x.w("palName"))
          .font(KReelFont.sys(size, .semibold))
          .foregroundStyle(KReelInk.ink)
          .kReelFit()
        KOwnMark(.gemini, size: g + 2, ink: sub)
          .fixedSize()
        .padding(.leading, size * 0.36)
      }
    }
  }

  /// a face from the library (AvatarImage's portrait): round, on its pale disc
  struct Portrait: View {
    let ref: KImageRef?
    let size: CGFloat
    var body: some View {
      KImage(ref, size: CGSize(width: size, height: size), contentMode: .fill, placeholder: kReelColor("#EFEDFA"))
        .frame(width: size, height: size)
        .background(kReelColor("#EFEDFA"))
        .clipShape(Circle())
    }
  }

  /* a signature, drawn in stroke by stroke: each stroke's dash runs out over its own share of the
     clock (a trim here), hidden until its turn; under Reduce Motion the whole signature */
  struct DrawIn: View {
    let x: KReelCtx
    let sig: String
    let w: CGFloat
    let h: CGFloat
    let at: Double
    let pt: CGFloat
    var body: some View {
      let plan = x.data.sigs[sig]
      let steps = plan?.steps ?? []
      let box = plan?.box ?? [0, 0, 1000, 320]
      let end = max(1, steps.map { $0.delay + $0.duration }.max() ?? 1)
      let now = x.c.once(end, at, KReelEase.linear) * end
      let vb = CGRect(x: box[0], y: box[1], width: max(1, box[2]), height: max(1, box[3]))
      return Canvas { gc, size in
        let k = min(size.width / vb.width, size.height / vb.height)
        var g = gc
        g.translateBy(x: (size.width - vb.width * k) / 2, y: (size.height - vb.height * k) / 2)
        g.scaleBy(x: k, y: k)
        g.translateBy(x: -vb.minX, y: -vb.minY)
        let width = pt / k
        for st in steps where now > st.delay {
          let raw = KReelClock.clamp01((now - st.delay) / max(1, st.duration))
          let p = smooth(raw)
          let to = min(1, p * (st.length + 2) / max(0.001, st.length))
          let path = KReelPaths.parsed(st.d).trimmedPath(from: 0, to: to)
          g.stroke(path, with: .color(KReelInk.ink), style: StrokeStyle(lineWidth: width, lineCap: .round, lineJoin: .round))
        }
      }
      .frame(width: w, height: h)
    }
  }

  // MARK: 1 · a reply arrives

  static let tap: Double = 2450

  struct Reply: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let fly = c.once(1000, 80, KReelEase.inOutCubic)
      let drop = c.once(520, 1120, KReelEase.inQuad)
      let away = c.once(900, 1120, KReelEase.inQuad)
      let press = c.seq(tap, [KReelStep(to: 1, ms: 120), KReelStep(to: 0, ms: 280)])
      let b = s * 0.34
      let ew = s * 0.22
      let eh = ew * 0.72
      let birdTop = s * 0.11
      let envTop = birdTop + b * 0.7
      let rowL = s * 0.06, rowT = s * 0.6, rowW = s * 0.88, rowH = s * 0.25
      let pad = s * 0.04
      let face = rowH * 0.62
      let badge = s * 0.075
      let faceCx = rowL + pad + face / 2
      let rowCy = rowT + rowH / 2
      let dropX = faceCx - s / 2
      let dropY = rowCy - (envTop + eh / 2)
      let f = CGFloat(fly), d = CGFloat(drop), a = CGFloat(away)
      let lift = CGFloat(sin(fly * .pi)) * s * 0.03
      let envOp = 1 - KReelClock.clamp01((drop - 0.7) / 0.3)
      let badgeIn = appear(c, 1650)
      return ZStack(alignment: .topLeading) {
        // the pen pal row it lands in, their window never developing
        HStack(spacing: pad) {
          KReelFrost(spec: x.frost("pal"), size: face)
          VStack(alignment: .leading, spacing: s * 0.022) {
            PalName(x: x, size: s * 0.047)
            GeometryReader { g in
              VStack(alignment: .leading, spacing: s * 0.022) {
                RoundedRectangle(cornerRadius: s * 0.01).fill(kReelColor("#E6E4F2")).frame(width: g.size.width * 0.92, height: s * 0.02)
                RoundedRectangle(cornerRadius: s * 0.01).fill(kReelColor("#E6E4F2")).frame(width: g.size.width * 0.62, height: s * 0.02)
              }
            }
            .frame(height: s * 0.062)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          // one letter owed: it's on you
          Text("1")
            .font(KReelFont.sys(s * 0.042, .bold))
            .foregroundStyle(Color.white)
            .frame(width: badge, height: badge)
            .background(Circle().fill(KReelInk.pen))
            .scaleEffect(badgeIn.scale)
            .opacity(badgeIn.opacity)
        }
        .padding(.horizontal, pad)
        .frame(width: rowW, height: rowH)
        .background(Color.white)
        .overlay(KReelInk.ink.opacity(press * 0.07))
        .clipShape(RoundedRectangle(cornerRadius: s * 0.045))
        .kReelRise(c, 1150, dy: s * 0.05)
        .offset(x: rowL, y: rowT)

        KReelEnvelope(w: ew, sealed: true)
          .rotationEffect(.degrees(-8 * (1 - fly) + 10 * drop))
          .scaleEffect(1 - 0.6 * d)
          .offset(x: (f - 1) * s * 0.85 + d * dropX, y: -lift + d * dropY)
          .opacity(envOp)
          .offset(x: s / 2 - ew / 2, y: envTop)
        KReelBird(ref: x.img("fly"), size: b)
          .offset(x: (f - 1) * s * 0.85 + a * s * 0.9, y: -lift - a * s * 0.32)
          .offset(x: s / 2 - b / 2, y: birdTop)

        KReelFinger(c: c, x: rowL + rowW * 0.56, y: rowCy + s * 0.01, at: tap, size: s * 0.15)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  // MARK: 2 · five letters each way

  /// one cell of a row: a white square under a 1.5 rule, filled (popping in) from the moment it is on
  struct Cell: View {
    let c: KReelClock
    let onAt: Double?
    let size: CGFloat
    let color: Color
    var body: some View {
      let v: Double = onAt.map { $0 <= 0 ? 1 : c.once(320, $0, pop) } ?? 0
      return ZStack(alignment: .topLeading) {
        Color.white
        Rectangle().strokeBorder(line, lineWidth: 1.5)
        color
          .frame(width: size, height: size)
          .scaleEffect(0.3 + 0.7 * CGFloat(v))
          .opacity(min(1, v * 1.5))
      }
      .frame(width: size, height: size)
    }
  }

  struct EachWay: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      // letters so far, turn by turn (JS timers): one each is in, then one every 250 ms from 420
      let ticks: [Double] = (0..<8).map { 420 + Double($0) * 250 }
      let n = 2 + c.beats(ticks)
      let mine = (n + 1) / 2
      let theirs = n / 2
      let done = mine >= 5 && theirs >= 5
      // when the count reached each value, so a cell pops from the moment it filled
      func at(_ count: Int) -> Double { count <= 2 ? 0 : ticks[count - 3] }
      // their k-th cell (0-based) fills at n = 2(k+1); yours at n = 2k+1
      func theirsAt(_ k: Int) -> Double? { theirs > k ? at(2 * (k + 1)) : nil }
      func mineAt(_ k: Int) -> Double? { mine > k ? at(2 * k + 1) : nil }
      let d = s * 0.3
      let cs = s * 0.082
      let g = s * 0.022
      let lw = s * 0.16
      let doorIn = appear(c, ticks[7])
      return VStack(spacing: 0) {
        VStack(spacing: s * 0.025) {
          KReelFrost(spec: x.frost("pal"), size: d)
          PalName(x: x, size: s * 0.05).frame(maxWidth: s * 0.84)
        }
        .padding(.top, s * 0.08)
        VStack(alignment: .leading, spacing: s * 0.03) {
          HStack(spacing: s * 0.03) {
            KReelFrost(spec: x.frost("pal"), size: cs).frame(width: lw)
            HStack(spacing: g) {
              ForEach(0..<5, id: \.self) { k in Cell(c: c, onAt: theirsAt(k), size: cs, color: KReelInk.pen) }
            }
          }
          HStack(spacing: s * 0.03) {
            Text(x.w("ui.you"))
              .font(KReelFont.mono(s * 0.042, .semibold))
              .tracking(1)
              .foregroundStyle(KReelInk.ink)
              .kReelFit()
              .frame(width: lw)
            HStack(spacing: g) {
              ForEach(0..<5, id: \.self) { k in Cell(c: c, onAt: mineAt(k), size: cs, color: KReelInk.ink) }
            }
          }
        }
        .padding(.top, s * 0.05)
        HStack(spacing: s * 0.03) {
          Text(x.w("mk.ofFive", ["n": "\(min(mine, theirs))"]))
            .font(KReelFont.mono(s * 0.04, .semibold))
            .tracking(1)
            .foregroundStyle(KReelInk.ink60)
            .fixedSize()
          if done {
            // the sign door as the pen-pal chat draws it at five each way
            Text(x.w("ch.sendYours"))
              .font(KReelFont.sys(s * 0.036, .semibold))
              .foregroundStyle(KReelInk.ink)
              .kReelFit()
              .padding(.horizontal, s * 0.039)
              .padding(.vertical, s * 0.02)
              .background(RoundedRectangle(cornerRadius: s * 0.056).fill(Color.white))
              .overlay(RoundedRectangle(cornerRadius: s * 0.056).strokeBorder(ln, lineWidth: 2))
              .frame(maxWidth: s * 0.62)
              .scaleEffect(doorIn.scale)
              .opacity(doorIn.opacity)
          }
        }
        .padding(.horizontal, s * 0.05)
        .frame(height: s * 0.1)
        .padding(.top, s * 0.04)
        Spacer(minLength: 0)
      }
      .frame(width: s, height: s, alignment: .top)
    }
  }

  // MARK: 3 · signing, then the sealed wait

  static let signType: Double = 350
  static let signDraw: Double = 1150
  static let signTap: Double = 2400
  static let signGo: Double = 2600
  static let signSealed: Double = 2800

  struct Sign: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let pen = x.w("myPen")
      let chars = Array(pen)
      let every = min(110, 700 / Double(max(1, chars.count)))
      let k = chars.indices.filter { c.after(signType + Double($0) * every) }.count
      let typed = String(chars.prefix(k))
      let go = c.once(420, signGo, KReelEase.inQuad)
      let ink = c.once(180, signDraw, KReelEase.outCubic)
      let sx = s * 0.06
      let sw = s * 0.88
      let inset = s * 0.05
      let padW = sw - inset * 2 - 2
      let padH = padW * CGFloat(x.num("penAspect", 0.32))
      let baseY = padH * CGFloat(x.num("penBaseline", 230.0 / 320.0))
      let u = s / 360
      let guide = typed.isEmpty ? x.w("id2.sheet.traceEmpty") : typed
      let upright = typed.isEmpty ? x.num("uprightEmpty") > 0 : x.num("uprightPen") > 0
      let gs = padH * 0.42
      let sealedIn = appear(c, signSealed)
      let sheetIn = c.once(460, 0, KReelEase.outCubic)
      return ZStack(alignment: .topLeading) {
        // what's left once it has gone: the signature sealed, waiting for theirs
        KReelEnvelope(w: s * 0.38, sealed: true)
          .scaleEffect(sealedIn.scale)
          .opacity(sealedIn.opacity)
          .frame(width: s)
          .offset(y: s * 0.24)
        Text(x.w("id2.door.waiting"))
          .font(KReelFont.mono(s * 0.036, .medium))
          .tracking(s * 0.036 * 0.12)
          .foregroundStyle(mute)
          .kReelFit()
          .kReelRise(c, signSealed + 150, dy: s * 0.03)
          .frame(width: s * 0.84)
          .offset(x: s * 0.08, y: s * 0.6)

        // the sheet as SignSheet draws it: its title, YOUR PEN NAME's well, YOUR SIGNATURE's pad, the main button
        VStack(alignment: .leading, spacing: 0) {
          Text(x.w("id2.sheet.title"))
            .font(KReelFont.sys(s * 0.047, .medium))
            .foregroundStyle(KReelInk.ink)
            .kReelFit()
            .frame(maxWidth: .infinity)
          VStack(alignment: .leading, spacing: s * 0.018) {
            label(x, "id2.sheet.name")
            HStack(spacing: 0) {
              Text(typed)
                .font(KReelFont.letter(s * 0.047, x.face))
                .foregroundStyle(KReelInk.ink)
                .lineLimit(1)
              if k < chars.count {
                ind.frame(width: 2, height: s * 0.055).padding(.leading, 1)
              }
              Spacer(minLength: 0)
            }
            .padding(.horizontal, s * 0.039)
            .frame(height: s * 0.105)
            .background(RoundedRectangle(cornerRadius: s * 0.044).fill(soft))
          }
          .padding(.top, s * 0.035)
          VStack(alignment: .leading, spacing: s * 0.018) {
            label(x, "id2.sheet.sign")
            ZStack(alignment: .topLeading) {
              soft
              Text(guide)
                .font(KReelFont.letter(gs, x.face, italic: !upright))
                .foregroundStyle(KReelInk.ink.opacity(0.1))
                .kReelFit(1, min: 0.5)
                .frame(width: padW * 0.7, height: gs * 1.25)
                .offset(x: padW * 0.15, y: baseY - gs * 1.02)
              Path { p in
                p.move(to: CGPoint(x: padW * 0.06, y: baseY))
                p.addLine(to: CGPoint(x: padW * 0.94, y: baseY))
              }
              .stroke(ln, lineWidth: 1)
              Path { p in
                p.move(to: CGPoint(x: padW * 0.06, y: baseY - 13 * u))
                p.addLine(to: CGPoint(x: padW * 0.06 + 7 * u, y: baseY - 6 * u))
                p.move(to: CGPoint(x: padW * 0.06 + 7 * u, y: baseY - 13 * u))
                p.addLine(to: CGPoint(x: padW * 0.06, y: baseY - 6 * u))
              }
              .stroke(sub, style: StrokeStyle(lineWidth: 1.4, lineCap: .round))
              DrawIn(x: x, sig: "pad", w: padW, h: padH, at: signDraw, pt: 2.4 * u)
              Text(x.w("id2.sheet.trace"))
                .font(KReelFont.mono(s * 0.028, .medium))
                .tracking(s * 0.028 * 0.06)
                .foregroundStyle(sub)
                .lineLimit(1)
                .fixedSize()
                .opacity(1 - ink)
                .offset(x: s * 0.033, y: s * 0.024)
            }
            .frame(width: padW, height: padH, alignment: .topLeading)
            .clipShape(RoundedRectangle(cornerRadius: s * 0.033))
          }
          .padding(.top, s * 0.03)
          Text(x.w("id2.sheet.send"))
            .font(KReelFont.sys(s * 0.044, .semibold))
            .tracking(0.4)
            .foregroundStyle(Color.white)
            .kReelFit()
            .padding(.horizontal, s * 0.04)
            .frame(maxWidth: .infinity)
            .frame(height: s * 0.115)
            .background(RoundedRectangle(cornerRadius: s * 0.039).fill(ind))
            .padding(.top, s * 0.045)
        }
        .padding(.horizontal, inset)
        .padding(.top, s * 0.035)
        .frame(width: sw, height: s * 0.95, alignment: .top)
        .background(UnevenRoundedRectangle(topLeadingRadius: s * 0.056, bottomLeadingRadius: 0, bottomTrailingRadius: 0, topTrailingRadius: s * 0.056).fill(Color.white))
        .overlay(KReelOpenRect(radius: s * 0.056, inset: 0.5, open: .bottom).stroke(ln, lineWidth: 1))
        .offset(y: (1 - CGFloat(sheetIn)) * s * 0.12)
        .opacity(sheetIn)
        .offset(y: CGFloat(go) * s * 0.95)
        .offset(x: sx, y: s * 0.1)

        // the finger taps Sign and Send, then goes with the sheet
        KReelFinger(c: c, x: s * 0.5, y: s * 0.83, at: signTap, size: s * 0.15).opacity(1 - go)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }

    func label(_ x: KReelCtx, _ key: String) -> some View {
      Text(x.w(key))
        .font(KReelFont.mono(x.s * 0.028, .semibold))
        .tracking(x.s * 0.028 * 0.14)
        .foregroundStyle(mute)
        .lineLimit(1)
    }
  }

  // MARK: 4 · both open together

  static let openTheirs: Double = 450
  static let openLift: Double = 1050
  static let openWipe: Double = 1200
  static let wipeMs: Double = 600
  static let openStrike: Double = 1850
  static let openSign: Double = 2000
  static let openSignTheirsMs: Double = 650
  static let openSignMineMs: Double = 400
  static let openChip: Double = 3150

  /// the frosted window each wore, wiped clear onto the face they sent (IntroductionRitual WipeWindow)
  struct Wipe: View {
    let x: KReelCtx
    let frost: KFrostSpec?
    let face: KImageRef?
    let d: CGFloat
    var body: some View {
      let p = x.c.once(wipeMs, openWipe, KReelEase.linear)
      let r = KReelClock.clamp01((p - 0.1) / 0.9)
      let radius = d * (0.25 + 0.25 * CGFloat(smooth(r)))
      let f = KReelClock.clamp01((p - 0.25) / 0.75)
      let e = smooth(p)
      let o = -d * 0.85 + d * 1.7 * CGFloat(e)
      let shape = RoundedRectangle(cornerRadius: radius)
      return ZStack(alignment: .topLeading) {
        ZStack(alignment: .topLeading) {
          Portrait(ref: face, size: d)
            .scaleEffect(0.92 + 0.08 * CGFloat(f))
            .opacity(f)
          KReelFrost(spec: frost, size: d).opacity(1 - smooth(p))
          LinearGradient(stops: [.init(color: Color.white.opacity(0), location: 0), .init(color: Color.white.opacity(0.85), location: 0.5), .init(color: Color.white.opacity(0), location: 1)], startPoint: .leading, endPoint: .trailing)
            .frame(width: d * 0.5, height: d * 2)
            .rotationEffect(.degrees(45))
            .offset(x: o, y: o)
            .opacity(p > 0 && p < 1 ? sin(p * .pi) : 0)
            .offset(x: d * 0.25, y: -d * 0.5)
        }
        .frame(width: d, height: d, alignment: .topLeading)
        .clipShape(shape)
        // the white ring a face wears as a sticker, once it's round
        shape.strokeBorder(paperWhite, lineWidth: 3)
          .frame(width: d, height: d)
          .scaleEffect(0.92 + 0.08 * CGFloat(f))
          .opacity(f)
      }
      .frame(width: d, height: d)
    }
  }

  /// the courier name, struck through left to right in ink and dimmed
  struct Struck: View {
    let x: KReelCtx
    let text: String
    let at: Double
    let maxW: CGFloat
    var body: some View {
      let s = x.s
      let v = x.c.once(240, at, KReelEase.inOutCubic)
      let ems = text.unicodeScalars.reduce(0.0) { $0 + (kReelWide($1) ? 1 : 0.6) + 0.05 }
      let fs = min(s * 0.034, maxW / CGFloat(max(1, ems)))
      return Text(text)
        .font(KReelFont.mono(fs, .medium))
        .tracking(fs * 0.05)
        .foregroundStyle(sub)
        .lineLimit(1)
        .fixedSize()
        .opacity(1 - 0.55 * v)
        .overlay(alignment: .leading) {
          GeometryReader { g in
            KReelInk.ink.frame(width: g.size.width * CGFloat(v), height: 1.5).offset(y: g.size.height / 2 - 0.5)
          }
        }
        .frame(maxWidth: maxW)
    }
  }

  struct Side: View {
    let x: KReelCtx
    let mine: Bool
    var body: some View {
      let s = x.s, c = x.c
      let colW = s * 0.42
      let d = s * 0.27
      let ew = s * 0.2
      let slotW = s * 0.38, slotH = s * 0.12
      let sealedAt: Double? = mine ? nil : openTheirs
      let strikeAt = mine ? openStrike + 100 : openStrike
      let signAt = mine ? openSign + openSignTheirsMs : openSign
      let signMs = mine ? openSignMineMs : openSignTheirsMs
      let drop = c.once(420, sealedAt ?? 0, KReelEase.outCubic)
      let lift = c.once(380, openLift, KReelEase.inQuad)
      let inn = sealedAt == nil ? 1 : drop
      let fade = c.once(220, signAt + signMs, KReelEase.outCubic)
      return ZStack(alignment: .top) {
        VStack(spacing: 0) {
          Wipe(x: x, frost: x.frost(mine ? "me" : "pal"), face: x.img(mine ? "myFace" : "palFace"), d: d)
          Struck(x: x, text: x.w(mine ? "myNameUp" : "palNameUp"), at: strikeAt, maxW: colW)
            .frame(height: s * 0.045)
            .padding(.top, s * 0.035)
          DrawIn(x: x, sig: mine ? "mine" : "theirs", w: slotW, h: slotH, at: signAt, pt: s * 0.0056)
            .padding(.top, s * 0.015)
          Text(x.w(mine ? "myPen" : "palPen"))
            .font(KReelFont.sys(s * 0.046, .semibold))
            .foregroundStyle(KReelInk.ink)
            .kReelFit()
            .frame(maxWidth: colW)
            .opacity(fade)
            .frame(height: s * 0.06)
            .padding(.top, s * 0.008)
        }
        KReelEnvelope(w: ew, sealed: true)
          .scaleEffect(1 + 0.15 * lift)
          .offset(y: (1 - CGFloat(inn)) * -s * 0.3 - CGFloat(lift) * s * 0.08)
          .opacity(inn * (1 - lift))
          .offset(y: d * 0.52)
      }
      .frame(width: colW)
    }
  }

  struct Open: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let slap = c.once(420, openChip, pop)
      let fs = s * 0.032
      return ZStack(alignment: .topLeading) {
        // yours on the left, as the ceremony has it
        HStack(alignment: .top, spacing: 0) {
          Side(x: x, mine: true)
          Spacer(minLength: 0)
          Side(x: x, mine: false)
        }
        .frame(width: s * 0.88, alignment: .topLeading)
        .offset(x: s * 0.06, y: s * 0.1)
        // since when — under the two of you, the ceremony's chip
        Text(x.w("sinceChip"))
          .font(KReelFont.mono(fs, .semibold))
          .tracking(fs * 0.15)
          .foregroundStyle(greenText)
          .lineLimit(1)
          .fixedSize()
          .padding(.horizontal, s * 0.028)
          .padding(.vertical, s * 0.01)
          .background(Capsule().fill(paperWhite))
          .overlay(Capsule().strokeBorder(greenText, lineWidth: 1.5))
          .rotationEffect(.degrees(2 + 6 * (1 - slap)))
          .scaleEffect(1.6 - 0.6 * slap)
          .opacity(min(1, slap * 2))
          .frame(width: s)
          .offset(y: s * 0.76)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  // MARK: 5 · the letters become a room

  static let morphAt: Double = 1250
  static let pickAt: Double = morphAt + 950
  static let pickOpen: Double = pickAt + 750
  static let roomSides = [false, true, false]
  static let roomW: [CGFloat] = [0.46, 0.38, 0.5]

  struct Morph: View {
    let x: KReelCtx
    let i: Int
    let m: Double
    var body: some View {
      let s = x.s
      let mine = roomSides[i]
      let pad = s * 0.07
      let cardW = s * 0.62, cardH = s * 0.15, cardGap = s * 0.025
      let bw = s * roomW[i], bh = s * 0.082, bGap = s * 0.02
      let top0 = s * 0.2
      let barH = s * 0.018
      let k = CGFloat(m)
      let w = cardW + (bw - cardW) * k
      let h = cardH + (bh - cardH) * k
      let top = top0 + CGFloat(i) * (cardH + cardGap + (bh + bGap - cardH - cardGap) * k)
      let left = mine ? s - pad - w : pad
      let radius = s * (0.02 + 0.021 * k)
      let bg = KReelInk.mix(.white, mine ? KReelInk.pen : .white, m)
      let bar = KReelInk.mix(kReelColor("rgba(17,17,19,0.12)"), mine ? kReelColor("rgba(255,255,255,0.6)") : kReelColor("rgba(17,17,19,0.2)"), m)
      let inner = w - 2 * s * 0.04
      let more = 1 - min(1, m * 2)
      return ZStack(alignment: .topTrailing) {
        VStack(alignment: .leading, spacing: 0) {
          Capsule().fill(bar).frame(width: inner * 0.7, height: barH)
          Capsule().fill(bar).frame(width: inner * 0.86, height: barH * (1 - k)).opacity(more).padding(.top, barH * 0.8 * (1 - k))
          Capsule().fill(bar).frame(width: inner * 0.52, height: barH * (1 - k)).opacity(more).padding(.top, barH * 0.8 * (1 - k))
        }
        .padding(.horizontal, s * 0.04)
        .frame(width: w, height: h, alignment: .leading)
        RoundedRectangle(cornerRadius: 2).fill(i == 1 ? KReelInk.pen : KReelInk.brassSeal)
          .frame(width: s * 0.045, height: s * 0.055)
          .opacity(1 - min(1, m * 2.5))
          .offset(x: -s * 0.025, y: s * 0.022)
      }
      .frame(width: w, height: h)
      .background(RoundedRectangle(cornerRadius: radius).fill(bg))
      .overlay(RoundedRectangle(cornerRadius: radius).strokeBorder(line, lineWidth: 1.5 * (1 - k)))
      .offset(x: left, y: top)
    }
  }

  /// a This or That card as the room draws it (KPickCard): both picked blind, opened at once
  struct Pick: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s
      let open = x.c.once(350, pickOpen, KReelEase.outCubic)
      let tile = s * 0.06
      let mono = KReelFont.mono(s * 0.026, .medium)
      func choice(_ text: String, chosen: Bool) -> some View {
        VStack(spacing: s * 0.008) {
          Text(text)
            .font(KReelFont.letter(s * 0.042, x.face))
            .foregroundStyle(KReelInk.ink)
            .kReelFit()
          if chosen {
            HStack(spacing: s * 0.01) {
              KReelPath("M5 12.5l4.5 4.5L19 7.5")
                .stroke(ind, style: StrokeStyle(lineWidth: 3 * s * 0.032 / 24, lineCap: .round, lineJoin: .round))
                .frame(width: s * 0.032, height: s * 0.032)
              Text(x.w("sp.pick.both"))
                .font(KReelFont.sys(s * 0.032, .semibold))
                .foregroundStyle(ind)
                .lineLimit(1)
            }
            .opacity(open)
          }
        }
        .padding(.horizontal, s * 0.02)
        .frame(maxWidth: .infinity)
        .frame(height: s * 0.11)
        .background(RoundedRectangle(cornerRadius: s * 0.033).fill(chosen ? KReelInk.mix(soft, lav, open) : soft))
        .opacity(chosen ? 1 : 1 - 0.4 * open)
      }
      return VStack(alignment: .leading, spacing: 0) {
        HStack(spacing: s * 0.025) {
          KReelPath("M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4")
            .stroke(ind, style: StrokeStyle(lineWidth: 2 * tile * 0.6 / 24, lineCap: .round, lineJoin: .round))
            .frame(width: tile * 0.6, height: tile * 0.6)
            .frame(width: tile, height: tile)
            .background(RoundedRectangle(cornerRadius: s * 0.02).fill(lav))
          Text(x.w("pick.label")).font(mono).tracking(s * 0.026 * 0.14).foregroundStyle(mute).lineLimit(1)
          Spacer(minLength: 0)
          Text(x.w("pick.asked")).font(mono).tracking(s * 0.026 * 0.14).foregroundStyle(mute).lineLimit(1)
        }
        Text(x.w("pick.q"))
          .font(KReelFont.letter(s * 0.048, x.face))
          .foregroundStyle(KReelInk.ink)
          .kReelFit()
          .padding(.top, s * 0.02)
        HStack(spacing: s * 0.025) {
          choice(x.w("pick.a"), chosen: true)
          choice(x.w("pick.b"), chosen: false)
        }
        .padding(.top, s * 0.022)
        Text(x.w("sp.pick.same.1"))
          .font(KReelFont.sys(s * 0.04, .semibold))
          .foregroundStyle(ind)
          .lineLimit(1)
          .offset(y: (1 - CGFloat(open)) * s * 0.017)
          .opacity(open)
          .padding(.top, s * 0.02)
      }
      .padding(s * 0.035)
      .background(RoundedRectangle(cornerRadius: s * 0.05).fill(Color.white))
    }
  }

  struct Room: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let m = c.once(800, morphAt, KReelEase.inOutCubic)
      let face = s * 0.11
      let bh = s * 0.082, bGap = s * 0.02, top0 = s * 0.2, pad = s * 0.07
      return ZStack(alignment: .topLeading) {
        // who: a window and a courier name in the thread, a face and a pen name in the room
        ZStack(alignment: .leading) {
          HStack(spacing: s * 0.03) {
            KReelFrost(spec: x.frost("pal"), size: face)
            PalName(x: x, size: s * 0.052)
          }
          .opacity(1 - m)
          HStack(spacing: s * 0.03) {
            Portrait(ref: x.img("palFace"), size: face)
            Text(x.w("palPen"))
              .font(KReelFont.sys(s * 0.052, .semibold))
              .foregroundStyle(KReelInk.ink)
              .kReelFit()
          }
          .opacity(m)
        }
        .frame(width: s - pad * 2, height: face, alignment: .leading)
        .offset(x: pad, y: s * 0.05)
        ForEach(0..<3, id: \.self) { i in Morph(x: x, i: i, m: m) }
        // then what a room has that a thread doesn't: a This or That, opened together
        Pick(x: x)
          .frame(width: s - 2 * pad)
          .kReelRise(c, pickAt, dy: s * 0.04)
          .offset(x: pad, y: top0 + 3 * (bh + bGap) + s * 0.015)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  // MARK: 6 · the title

  struct Title: View {
    let x: KReelCtx
    var body: some View {
      let parts = x.list("titleParts")
      let accent = Int(x.num("titleAccent", -1))
      return KReelBigType(c: x.c, s: x.s, words: parts, accent: accent >= 0 ? [accent] : [], fit: CGFloat(x.num("titleFit", 1)), line: 1.18, spaced: false)
    }
  }
}

/// a CJK, kana, hangul or full-width character: about a full em (kindreds WIDE)
func kReelWide(_ u: Unicode.Scalar) -> Bool {
  let v = u.value
  return (0x1100...0x11FF).contains(v) || (0x2E80...0xA4CF).contains(v) || (0xAC00...0xD7AF).contains(v) || (0xF900...0xFAFF).contains(v) || (0xFF00...0xFF60).contains(v)
}
