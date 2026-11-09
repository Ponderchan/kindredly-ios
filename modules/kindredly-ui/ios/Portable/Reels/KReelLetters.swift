import SwiftUI

/*
 HOW LETTERS TRAVEL, AS A REEL, in SwiftUI — src/components/guide-reel/letters.tsx, scene for
 scene, every size a fraction of `s` (u = s / 100) as there:
   1 · the + on Today pops its two discs, Letter opens the page, one line is typed and the key
       turns blue, asking for a mood stamp
   2 · a stamp is picked from the tray and lands on the envelope, the seal presses on, LET IT
       TRAVEL — and the letter is gone
   3 · the courier carries it over three strangers' desks, each desk its owner's frosted window
   4 · your own desk: fifteen letters, read one by one; with the last, THAT'S ALL FOR TODAY and
       tomorrow's bag drops in
   5 · the title
 The counts and the "done" moments are JS timers in React Native (useCount, useAfter): here they
 read the scene's clock in real time too; the counts start at their end under Reduce Motion, as
 useCount does, and tomorrow's bag cuts in on time; the stamp scene rests on its sealed envelope.
 Words (TS): pub.popLetter, pub.popNote, cp.header, cp.travel, cp.needStamp, ui.you, ga.left
 (its {n} filled here), cod.wholePost, bag.opens (worded and upper-cased in TS with the morning
 hour in the reader's clock), gd.letters.title. Facts: nums.openingMin, lists.tray (the four
 stamps), lists.reelWidths, frosts me / desk0..2. Pictures: fly (happy, flying), content, sleepy.
 */
enum KReelLetters {
  static let lineInk = KReelInk.navy
  static let def = KReelDef(bg: KReelInk.penWash, scenes: [
    KReelScene(key: "open", ms: 3900) { AnyView(Open(x: $0)) },
    KReelScene(key: "stamp", ms: 3000) { AnyView(StampScene(x: $0)) },
    KReelScene(key: "flight", ms: 3100) { AnyView(Flight(x: $0)) },
    KReelScene(key: "desk", ms: 4300) { AnyView(Desk(x: $0)) },
    KReelScene(key: "title", ms: 2600) { AnyView(Title(x: $0)) },
  ])

  /// useCount: an integer from `from` to `to`, one step every `every`, the first after `delay`; at its end under Reduce Motion
  static func count(_ c: KReelClock, from: Int, to: Int, every: Double, delay: Double) -> Int {
    if c.still || from == to { return to }
    if c.t < delay { return from }
    let steps = 1 + Int(floor((c.t - delay) / every))
    let n = min(abs(to - from), steps)
    return from + (to > from ? n : -n)
  }

  // MARK: 1 · OPEN — the + → its two discs → Letter → the page, one line typed

  static let tTap: Double = 560
  static let tPick: Double = 1250
  static let tSheet: Double = 1400
  static let tType: Double = 1850
  static let tChar: Double = 55

  struct Open: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, u = x.u, c = x.c
      let barTop = 72 * u
      let cy = 86 * u
      let plus = 22 * u
      let icon = 9 * u
      let fanY = 44 * u
      let turn = c.once(220, tTap + 60, KReelEase.outCubic)
      let dim = c.once(220, tTap + 80, KReelEase.outQuad)
      let f1out = c.once(160, tTap + 380, KReelEase.outQuad)
      let sheet = c.once(420, tSheet, KReelEase.outCubic)
      let tabs: [(CGFloat, KReelTab, Bool)] = [(11, .envelope, true), (30, .notes, false), (70, .kindreds, false), (89, .me, false)]
      return ZStack(alignment: .topLeading) {
        // the tab bar, close up
        Rectangle().fill(Color.white)
          .overlay(alignment: .top) { kReelColor("rgba(30,27,53,0.08)").frame(height: 1) }
          .kReelBox(0, barTop, s, s - barTop)
        ForEach(0..<tabs.count, id: \.self) { i in
          let t = tabs[i]
          KReelTabIcon(tab: t.1, color: t.2 ? KReelInk.pen : KReelInk.tabInk, active: t.2, size: icon)
            .offset(x: t.0 * u - icon / 2, y: cy - icon / 2)
        }
        // the page dims above the bar; the bar stays live
        kReelColor("rgba(30,27,53,0.58)").opacity(dim).kReelBox(0, 0, s, barTop)

        Circle().fill(KReelInk.mix(KReelInk.pen, KReelInk.post, turn))
          .frame(width: plus, height: plus)
          .overlay(KReelPlus(size: plus * 0.5, width: 2.6))
          .rotationEffect(.degrees(turn * 45))
          .offset(x: 50 * u - plus / 2, y: cy - plus / 2)

        // the two discs pop out of the +: Letter and Note
        FanChoice(x: x, cx: 30 * u, cy: fanY, fromX: 20 * u, fromY: cy - fanY, delay: tTap + 100, label: x.w("pub.popLetter"), tab: .envelope)
        FanChoice(x: x, cx: 70 * u, cy: fanY, fromX: -20 * u, fromY: cy - fanY, delay: tTap + 170, label: x.w("pub.popNote"), tab: .notes)

        KReelFinger(c: c, x: 50 * u, y: cy, at: tTap, size: 17 * u).opacity(1 - f1out)
        KReelFinger(c: c, x: 30 * u, y: fanY, at: tPick, size: 17 * u)

        // the composer slides in over all of it
        Composer(x: x)
          .offset(y: (1 - sheet) * s)
          .offset(x: 5 * u, y: 9 * u)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  struct FanChoice: View {
    let x: KReelCtx
    let cx: CGFloat
    let cy: CGFloat
    let fromX: CGFloat
    let fromY: CGFloat
    let delay: Double
    let label: String
    let tab: KReelTab
    var body: some View {
      let u = x.u
      let d = 22 * u
      let v = x.c.once(460, delay, KReelEase.outBack(1.7))
      let word = KReelClock.clamp01((v - 0.7) / 0.3)
      return VStack(spacing: 2.2 * u) {
        Circle().fill(Color.white)
          .frame(width: d, height: d)
          .shadow(color: lineInk.opacity(0.25), radius: 3 * u, x: 0, y: 2 * u)
          .overlay(KReelTabIcon(tab: tab, color: KReelInk.ink, size: 10 * u))
        Text(label)
          .font(KReelFont.sys(4.4 * u, .semibold))
          .foregroundStyle(Color.white)
          .kReelFit()
          .multilineTextAlignment(.center)
          .frame(width: 36 * u)
          .opacity(word)
      }
      .frame(width: 36 * u)
      .scaleEffect(0.35 + 0.65 * v)
      .offset(x: (1 - v) * fromX, y: (1 - v) * fromY)
      .opacity(min(1, v * 1.6))
      .offset(x: cx - 18 * u, y: cy - d / 2)
    }
  }

  /// the writing page: ✕, its header, the stamp's empty corner, one line typed, the key under it
  struct Composer: View {
    let x: KReelCtx
    var body: some View {
      let u = x.u
      let w = 90 * u, h = 96 * u
      let shape = RoundedRectangle(cornerRadius: 5 * u)
      return ZStack(alignment: .topLeading) {
        Color.white
        ZStack(alignment: .topLeading) {
          Text("✕")
            .font(KReelFont.mono(5 * u, .regular))
            .foregroundStyle(KReelInk.ink)
            .fixedSize()
            .offset(x: 5 * u, y: 4 * u)
          Text(x.w("cp.header"))
            .font(KReelFont.mono(3.8 * u, .semibold))
            .tracking(0.3 * u)
            .foregroundStyle(KReelInk.ink)
            .kReelFit()
            .multilineTextAlignment(.center)
            .frame(width: max(0, w - 4 - 39 * u))
            .offset(x: 15 * u, y: 5.4 * u)
          // the corner where the stamp goes, still empty
          RoundedRectangle(cornerRadius: 1.4 * u)
            .fill(KReelInk.penWash)
            .overlay(RoundedRectangle(cornerRadius: 1.4 * u).strokeBorder(KReelInk.pen, style: StrokeStyle(lineWidth: 1.5, dash: [3, 3])))
            .frame(width: 13 * u, height: 13 * u)
            .rotationEffect(.degrees(8))
            .offset(x: w - 4 - 5 * u - 13 * u, y: 3 * u)
          Writing(x: x, inner: w - 4)
        }
        .frame(width: w - 4, height: h - 4, alignment: .topLeading)
        .offset(x: 2, y: 2)
      }
      .frame(width: w, height: h, alignment: .topLeading)
      .clipShape(shape)
      .overlay(shape.strokeBorder(lineInk, lineWidth: 2))
    }
  }

  /// ONE REAL LINE: twenty characters in four words, each a bar growing a character at a time
  static let cw: CGFloat = 4.4
  struct Word { let x: CGFloat; let line: Int; let len: Int; let first: Int }
  static let words: [Word] = {
    var out: [Word] = []
    var px: CGFloat = 6
    var line = 0
    var ch = 1
    for len in [4, 3, 6, 4] {
      if px + CGFloat(len) * cw > 84 {
        px = 6
        line += 1
      }
      out.append(Word(x: px, line: line, len: len, first: ch))
      px += CGFloat(len + 1) * cw
      ch += len + 1
    }
    return out
  }()

  struct Writing: View {
    let x: KReelCtx
    let inner: CGFloat
    var body: some View {
      let u = x.u, k = x.c
      let min20 = Int(x.num("openingMin", 20))
      let c = count(k, from: 0, to: min20, every: tChar, delay: tType)
      let tReady = tType + Double(min20 - 1) * tChar + 70
      let ready = k.once(220, tReady, KReelEase.outCubic)
      let blink = k.loop(380)
      func lineY(_ l: Int) -> CGFloat { 24 * u + CGFloat(l) * 10 * u }
      var caretX: CGFloat = 6
      var caretLine = 0
      for w in words where c >= w.first - 1 {
        caretX = w.x + CGFloat(min(w.len, c - (w.first - 1))) * cw
        caretLine = w.line
      }
      let keyW = inner - 10 * u
      let fill = CGFloat(min20 > 0 ? (Double(c) / Double(min20) * 100).rounded() / 100 : 0)
      return ZStack(alignment: .topLeading) {
        ForEach(0..<words.count, id: \.self) { i in
          let w = words[i]
          let typed = max(0, min(w.len, c - (w.first - 1)))
          if typed > 0 {
            Capsule().fill(KReelInk.ink).opacity(0.82)
              .kReelBox(w.x * u, lineY(w.line), CGFloat(typed) * cw * u - 0.6 * u, 3.8 * u)
          }
        }
        RoundedRectangle(cornerRadius: 0.35 * u).fill(KReelInk.pen)
          .opacity(0.25 + 0.75 * blink)
          .kReelBox(caretX * u + 0.6 * u, lineY(caretLine) - 1.4 * u, 0.7 * u, 6.6 * u)

        // the key: filling as you write, the count beside the label; blue once the line is long enough
        ZStack(alignment: .leading) {
          KReelInk.penWash.frame(width: keyW * fill)
          HStack(spacing: 2 * u) {
            Text(x.w("cp.travel"))
              .font(KReelFont.mono(4 * u, .semibold))
              .tracking(0.35 * u)
              .foregroundStyle(KReelInk.ink40)
              .kReelFit()
            Text("\(c)/\(min20)")
              .font(KReelFont.mono(3.4 * u, .regular))
              .foregroundStyle(KReelInk.ink40)
              .fixedSize()
          }
          .padding(.horizontal, 3 * u)
          .frame(width: keyW)
          Text(x.w("cp.needStamp"))
            .font(KReelFont.mono(4 * u, .semibold))
            .tracking(0.35 * u)
            .foregroundStyle(Color.white)
            .kReelFit()
            .padding(.horizontal, 3 * u)
            .frame(width: keyW, height: 14 * u)
            .background(KReelInk.pen)
            .opacity(ready)
        }
        .frame(width: keyW, height: 14 * u, alignment: .leading)
        .clipped()
        .overlay(Rectangle().strokeBorder(KReelInk.ink12, lineWidth: 1))
        .offset(x: 5 * u, y: 66 * u)
      }
    }
  }

  // MARK: 2 · STAMP — one picked from the tray lands on the envelope; the seal presses on; it's gone

  static let picked = "made-my-day"
  static let trayX: [CGFloat] = [20, 40, 60, 80]
  static let trayY: CGFloat = 85
  static let ex: CGFloat = 12, ey: CGFloat = 13, ew: CGFloat = 76
  static let sealD: CGFloat = 21

  struct StampScene: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, u = x.u, c = x.c
      let sw = kReelSnap(16 * u, x.reelWidths, max: 18 * u)
      let sh = sw * 1.2
      let eh = ew * 0.72
      let stampRight = ew * (200 / 212) - 2.5
      let stampTop = ew * (6 / 212) + 2.5
      let sealAt = CGPoint(x: ew * (102 / 212), y: ew * (74 / 212))
      let stampAt = CGPoint(x: stampRight * u - sw, y: stampTop * u)
      let enter = c.once(320, 0, KReelEase.outCubic)
      let trayIn = c.once(340, 0, KReelEase.outCubic)
      let f1out = c.once(160, 650 + 220, KReelEase.outQuad)
      let fly = c.once(540, 760, KReelEase.inOutCubic)
      let trayOut = c.once(300, 1450 - 130, KReelEase.inCubic)
      let press = c.once(280, 1450, KReelEase.outQuad)
      let ring = c.once(560, 1450 + 70, KReelEase.outCubic)
      let keyIn = c.once(380, 1760, KReelEase.outCubic)
      let lift = c.once(480, 2520, KReelEase.inCubic)
      // with less motion the scene rests on the sealed envelope, not on an empty square
      let go: Double = c.still ? 0 : 1
      let sx0 = trayX[1] * u - sw / 2
      let sy0 = trayY * u - sh / 2
      let sx1 = ex * u + stampAt.x
      let sy1 = ey * u + stampAt.y
      let arc = sin(Double.pi * fly)
      let tray = x.list("tray")
      return ZStack(alignment: .topLeading) {
        // the envelope, its stamp once landed, the seal
        ZStack(alignment: .topLeading) {
          KReelEnvelope(w: ew * u, sealed: false)
          KReelStamp(id: picked, width: sw)
            .rotationEffect(.degrees(8))
            .opacity(fly >= 0.999 ? 1 : 0)
            .offset(x: stampAt.x, y: stampAt.y)
          Circle().strokeBorder(KReelInk.pen, lineWidth: 2)
            .frame(width: sealD * u, height: sealD * u)
            .scaleEffect(1 + 0.75 * ring)
            .opacity(ring > 0 ? (1 - ring) * 0.55 : 0)
            .offset(x: (sealAt.x - sealD / 2) * u, y: (sealAt.y - sealD / 2) * u)
          KReelSeal(size: sealD * u)
            .scaleEffect(1.7 - 0.7 * press)
            .opacity(min(1, press * 2))
            .offset(x: (sealAt.x - sealD / 2) * u, y: (sealAt.y - sealD / 2) * u)
        }
        .frame(width: ew * u, height: eh * u, alignment: .topLeading)
        .scaleEffect(1 - 0.4 * go * lift)
        .offset(y: (1 - enter) * 3 * u - go * lift * 34 * u)
        .opacity(enter * (1 - go * lift))
        .offset(x: ex * u, y: ey * u)

        // the stamp tray, where the keyboard was
        ZStack(alignment: .topLeading) {
          KReelInk.tray
          KReelInk.ink12.frame(height: 1)
          ForEach(0..<min(4, tray.count), id: \.self) { i in
            if i != 1 {
              KReelStamp(id: tray[i], width: sw)
                .offset(x: trayX[i] * u - sw / 2, y: 1 + (trayY - 72) * u - sh / 2)
            }
          }
        }
        .frame(width: s, height: 30 * u, alignment: .topLeading)
        .offset(y: (1 - trayIn) * 28 * u + trayOut * 30 * u)
        .offset(y: 72 * u)

        // the picked one, on its way from the tray to the corner
        KReelStamp(id: picked, width: sw)
          .rotationEffect(.degrees(8 * fly))
          .scaleEffect(1 + 0.5 * arc)
          .offset(x: (sx1 - sx0) * fly, y: (sy1 - sy0) * fly - 9 * u * arc + (1 - trayIn) * 28 * u * (1 - fly))
          .opacity(fly < 0.999 ? 1 : 0)
          .offset(x: sx0, y: sy0)

        KReelFinger(c: c, x: trayX[1] * u, y: trayY * u, at: 650, size: 17 * u).opacity(1 - f1out)

        // the key, solid ink now: both doors open
        Text(x.w("cp.travel"))
          .font(KReelFont.mono(4.2 * u, .semibold))
          .tracking(0.4 * u)
          .foregroundStyle(Color.white)
          .kReelFit()
          .padding(.horizontal, 3 * u)
          .frame(width: s - 28 * u, height: 13 * u)
          .background(KReelInk.ink)
          .offset(y: (1 - keyIn) * 6 * u)
          .opacity(keyIn * (1 - go * lift))
          .offset(x: 14 * u, y: 79 * u)
        KReelFinger(c: c, x: 50 * u, y: 85.5 * u, at: 2350, size: 17 * u).opacity(1 - go * lift)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  // MARK: 3 · FLIGHT — she leaves at once, and the letter lands on strangers' desks, one hop each

  static let hopT0: Double = 200
  static let hopMs: Double = 2250
  static let deskX: [CGFloat] = [36, 60, 84]
  static let youX: CGFloat = 12
  static let deskY: CGFloat = 78
  static let dipY: CGFloat = 56
  static let apex: CGFloat = 26

  struct Flight: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, u = x.u
      let p = x.c.once(hopMs, hopT0, KReelEase.linear)
      let k = 3 * Double.pi * p
      let sn = sin(k)
      let bx = (youX + (deskX[2] - youX) * CGFloat(p)) * u
      let by = (dipY - apex * CGFloat(abs(sn))) * u
      // nose up out of each dip, level at the top, down into the next
      let tilt = -12 * cos(k) * (sn >= 0 ? 1 : -1)
      let cpy = dipY - 2 * apex
      let path = "M\(youX) \(dipY) Q\((youX + deskX[0]) / 2) \(cpy) \(deskX[0]) \(dipY) Q\((deskX[0] + deskX[1]) / 2) \(cpy) \(deskX[1]) \(dipY) Q\((deskX[1] + deskX[2]) / 2) \(cpy) \(deskX[2]) \(dipY)"
      return ZStack(alignment: .topLeading) {
        KReelPath(path, box: CGRect(x: 0, y: 0, width: 100, height: 100))
          .stroke(KReelInk.pen.opacity(0.45), style: StrokeStyle(lineWidth: 0.9 * u, lineCap: .round, dash: [0.1 * u, 2.6 * u]))
          .frame(width: s, height: s)
        DeskTile(x: x, cx: youX, frost: x.frost("me"), you: true)
        ForEach(0..<3, id: \.self) { i in
          DeskTile(x: x, cx: deskX[i], frost: x.frost("desk\(i)"), dropAt: hopT0 + (hopMs * Double(i + 1)) / 3 - 60, tilt: [-6, 5, -3][i])
        }
        KReelBird(ref: x.img("fly"), size: 26 * u)
          .rotationEffect(.degrees(tilt))
          .offset(x: bx - 13 * u, y: by - 17 * u)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  /* A DESK IS ITS OWNER'S FROSTED WINDOW: yours carries the pen line and YOU; a desk the letter
     lands on lights the same line, 1pt clear of the window, its corners following the window's */
  struct DeskTile: View {
    let x: KReelCtx
    let cx: CGFloat
    let frost: KFrostSpec?
    var you: Bool = false
    var dropAt: Double? = nil
    var tilt: Double = 0
    var body: some View {
      let u = x.u
      let side = 17 * u
      let out: CGFloat = 3 // ring 2 + gap 1
      let has = dropAt != nil
      let drop = x.c.once(320, dropAt ?? 0, KReelEase.outBack(1.7))
      let ring = RoundedRectangle(cornerRadius: side * 0.25 + out)
      return ZStack(alignment: .topLeading) {
        KReelFrost(spec: frost, size: side)
        if you {
          ring.strokeBorder(KReelInk.pen, lineWidth: 2).kReelBox(-out, -out, side + 2 * out, side + 2 * out)
        }
        ring.strokeBorder(KReelInk.pen, lineWidth: 2)
          .opacity(has ? min(1, drop) : 0)
          .kReelBox(-out, -out, side + 2 * out, side + 2 * out)
        if has {
          KReelEnvelope(w: 13 * u, sealed: true)
            .rotationEffect(.degrees(tilt))
            .offset(y: (1 - drop) * -8 * u)
            .opacity(min(1, drop * 2))
            .offset(x: (side - 13 * u) / 2, y: -7.5 * u)
        }
        if you {
          Text(x.w("ui.you"))
            .font(KReelFont.mono(3.4 * u, .semibold))
            .tracking(0.3 * u)
            .foregroundStyle(KReelInk.pen)
            .lineLimit(1)
            .frame(width: side * 1.6)
            .offset(x: -side * 0.3, y: side + 1.6 * u)
        }
      }
      .frame(width: side, height: side, alignment: .topLeading)
      .offset(x: cx * u - side / 2, y: deskY * u - side / 2)
    }
  }

  // MARK: 4 · DESK — fifteen letters land; read, each goes quiet; the last, and tomorrow's bag

  static let day = 15
  static let readT0: Double = 1000
  static let readEvery: Double = 105
  static let shutT: Double = 1000 + Double(15 - 1) * 105 + 80

  struct Desk: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, u = x.u, c = x.c
      let pw = 90 * u, ph = 62 * u
      let inner = pw - 4
      let ewd = 14.4 * u
      let ehd = ewd * 0.72
      let gx = 2 * u, gy = 3.5 * u
      let left0 = (inner - (5 * ewd + 4 * gx)) / 2
      let n = count(c, from: day, to: 0, every: readEvery, delay: readT0)
      let done = c.after(shutT)
      return ZStack(alignment: .topLeading) {
        ZStack(alignment: .topLeading) {
          Text(done ? x.w("cod.wholePost") : x.w("ga.left", ["n": "\(n)"]))
            .font(KReelFont.mono(6 * u, .semibold))
            .tracking(0.25 * u)
            .foregroundStyle(KReelInk.ink)
            .kReelFit()
            .frame(width: inner - 10 * u, alignment: .leading)
            .offset(x: 5 * u, y: 4.2 * u)
          KReelInk.ink12.kReelBox(0, 15 * u, inner, 1)
          ForEach(0..<day, id: \.self) { i in
            DeskEnv(x: x, i: i, w: ewd)
              .offset(x: left0 + CGFloat(i % 5) * (ewd + gx), y: 19 * u + CGFloat(i / 5) * (ehd + gy))
          }
          TomorrowBag(x: x, w: inner, h: ph - 4)
        }
        .frame(width: inner, height: ph - 4, alignment: .topLeading)
        .clipped()
        .offset(x: 2, y: 2)
        .frame(width: pw, height: ph, alignment: .topLeading)
        .background(Color.white)
        .overlay(Rectangle().strokeBorder(KReelInk.ink, lineWidth: 2))
        .offset(x: 5 * u, y: 15 * u)

        // the courier by the desk — sleepy once the last letter is read
        let shut = c.after(shutT - 80)
        let come = c.once(380, 250, KReelEase.outBack(1.7))
        ZStack {
          KReelBird(ref: x.img("content"), size: 24 * u).opacity(shut ? 0 : 1)
          KReelBird(ref: x.img("sleepy"), size: 24 * u).opacity(shut ? 1 : 0)
        }
        .offset(y: (1 - come) * 5 * u)
        .opacity(min(1, come * 1.5))
        .offset(x: 70 * u, y: 72 * u)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  struct DeskEnv: View {
    let x: KReelCtx
    let i: Int
    let w: CGFloat
    var body: some View {
      let u = x.u, c = x.c
      let come = c.once(300, 80 + Double(i) * 40, KReelEase.outBack(1.7))
      let read = c.once(200, readT0 + Double(i) * readEvery, KReelEase.outCubic)
      return ZStack(alignment: .topLeading) {
        KReelEnvelope(w: w, sealed: false).opacity(0.32 * read)
        KReelEnvelope(w: w, sealed: true).opacity(1 - read)
      }
      .frame(width: w, height: w * 0.72, alignment: .topLeading)
      .scaleEffect(1 - 0.08 * read)
      .offset(y: (1 - come) * -5 * u)
      .opacity(min(1, come * 1.5))
    }
  }

  /* TOMORROW'S BAG: rounded at the top, deep at the bottom, three sealed envelopes inside (a
     picture of "some", never a count), the hour it opens on its tag. The three rest where
     TodayRN's ENVELOPES put them in its 205-wide bag, scaled. */
  static let bagW: CGFloat = 205
  static let bagEnvW: CGFloat = 52
  static let bagEnvelopes: [(x: CGFloat, y: CGFloat, r: Double)] = [(14, 26, -8), (78, 36, 6), (44, 62, -3)]

  struct TomorrowBag: View {
    let x: KReelCtx
    let w: CGFloat
    let h: CGFloat
    var body: some View {
      let u = x.u, c = x.c
      let due = c.after(shutT)
      let clear = c.once(260, shutT, KReelEase.outCubic)
      let drop = c.once(520, shutT + 140, KReelEase.outBack(1.7))
      let bw = 46 * u, bh = 31 * u
      let k = bw / bagW
      let cluster = 78 + bagEnvW - 14
      let shift = (bagW - cluster) / 2 - bagEnvelopes[0].x
      let tagH = 7 * u
      let bag = UnevenRoundedRectangle(topLeadingRadius: 22 * k, bottomLeadingRadius: 96 * k, bottomTrailingRadius: 96 * k, topTrailingRadius: 22 * k)
      return Group {
        if c.still && !due {
          Color.clear
        } else {
          ZStack(alignment: .topLeading) {
            Color.white
            ZStack(alignment: .top) {
              ZStack(alignment: .topLeading) {
                KReelInk.penWash
                ForEach(0..<3, id: \.self) { i in
                  let e = bagEnvelopes[i]
                  let d = c.once(420, shutT + 360 + Double(i) * 160, KReelEase.outBack(1.7))
                  KReelEnvelope(w: bagEnvW * k, sealed: true)
                    .rotationEffect(.degrees(e.r))
                    .offset(y: -(1 - d) * 10 * u)
                    .opacity(min(1, d * 2))
                    .offset(x: 2 + (e.x + shift) * k, y: 2 + e.y * k)
                }
              }
              .frame(width: bw, height: bh, alignment: .topLeading)
              .clipShape(bag)
              .overlay(bag.strokeBorder(KReelInk.ink, lineWidth: 2))
              Text(x.w("bag.opens"))
                .font(KReelFont.mono(3.2 * u, .semibold))
                .tracking(0.4 * u)
                .foregroundStyle(KReelInk.ink)
                .kReelFit()
                .padding(.horizontal, 2.6 * u)
                .frame(height: tagH)
                .background(Capsule().fill(Color.white))
                .overlay(Capsule().strokeBorder(KReelInk.ink, lineWidth: 2))
                .frame(width: bw + 24 * u)
                .offset(y: -tagH / 2)
            }
            .frame(width: bw, height: bh, alignment: .top)
            .offset(y: -(1 - drop) * 14 * u)
            .opacity(min(1, drop * 2))
            .offset(x: (w - bw) / 2, y: 12 * u)
          }
          .frame(width: w, height: max(0, h - 15 * u - 1), alignment: .topLeading)
          .opacity(clear)
          .offset(y: 15 * u + 1)
        }
      }
    }
  }

  // MARK: 5 · THE TITLE

  struct Title: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, u = x.u, c = x.c
      let title = x.w("gd.letters.title").trimmingCharacters(in: .whitespacesAndNewlines)
      let words = title.split(whereSeparator: { $0.isWhitespace }).map(String.init)
      let list = words.isEmpty ? [title] : words
      let come = c.once(520, 650, KReelEase.outCubic)
      let bob = c.loop(900, 1200)
      return ZStack(alignment: .topLeading) {
        KReelBigType(c: c, s: s, words: list, accent: list.count > 1 ? [list.count - 1] : [])
        KReelBird(ref: x.img("fly"), size: 22 * u)
          .offset(x: (1 - come) * -18 * u, y: (1 - come) * 6 * u - bob * 2 * u)
          .opacity(come)
          .offset(x: 70 * u, y: 72 * u)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }
}
