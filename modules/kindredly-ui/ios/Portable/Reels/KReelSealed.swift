import SwiftUI

/*
 THE SEALED JOURNAL, AS A REEL, in SwiftUI — src/components/guide-reel/sealed.tsx, scene for scene:
 the Notes tab is tapped and a page is written; the page folds and Wren's seal is pressed on it;
 it tries to rise to the cloud and can't, while the courier dozes beside it; it lies inside the
 phone, and only there; the title. Every size is the React Native one, a fraction of `s`.
 Words (TS, t()): tab.notes, ga.sealedToday, ga.neverPosted, ga.phoneOnly, gd.sealed.title.
 Pictures: "sleepy" (her snapshot at the dozing size, lib/bird-images reelSleepy).
 One difference: React Native lays absolute children inside a parent's border, so its numbers
 there carry a "- 2" for the 2pt rule; KReelMiniScreen lays them inside the rule the same way.
 */
enum KReelSealed {
  static let flap = kReelColor("#F6F5FC") // the back of the page, a shade under white
  static let edge = kReelColor("rgba(17,17,19,0.16)")
  static let lines: [CGFloat] = [0.94, 0.78, 0.88, 0.52]
  static let barH: CGFloat = 0.018 // a written line's thickness, × s
  static let tap: Double = 700

  static let def = KReelDef(bg: KReelInk.penWash, scenes: [
    KReelScene(key: "tap-notes", ms: 3400) { AnyView(TapNotes(x: $0)) },
    KReelScene(key: "fold-seal", ms: 3200) { AnyView(FoldSeal(x: $0)) },
    KReelScene(key: "stays", ms: 3200) { AnyView(Stays(x: $0)) },
    KReelScene(key: "kept", ms: 3000) { AnyView(Kept(x: $0)) },
    KReelScene(key: "title", ms: 2800) { AnyView(Title(x: $0)) },
  ])

  /// THE PAGE, ONE GEOMETRY FOR SCENES 1 AND 2 (sealed.tsx pageOf)
  struct Page {
    let w, h, hh, top, inset, inner, titleTop, titleSize, titleLine, rowTop, row: CGFloat
    init(_ s: CGFloat) {
      w = s * 0.76
      h = s * 0.52
      hh = h / 2
      top = s * 0.15
      inset = s * 0.06
      inner = w - 3 - inset * 2
      titleTop = s * 0.045
      titleSize = s * 0.07
      titleLine = s * 0.085
      rowTop = s * 0.16
      row = s * 0.065
    }
  }

  static func label(_ x: KReelCtx, _ key: String) -> some View {
    Text(x.w(key))
      .font(KReelFont.mono(x.s * 0.042, .semibold))
      .tracking(x.s * 0.004)
      .foregroundStyle(KReelInk.ink)
      .multilineTextAlignment(.center)
      .lineLimit(1)
      .frame(width: x.s)
  }

  /// a written line, already there
  static func bar(_ s: CGFloat, w: CGFloat, top: CGFloat, left: CGFloat) -> some View {
    Capsule().fill(KReelInk.ink).kReelBox(left, top, w, s * barH)
  }

  static func pageTitle(_ x: KReelCtx) -> some View {
    let g = Page(x.s)
    return Text(x.w("tab.notes"))
      .font(KReelFont.sys(g.titleSize, .bold))
      .foregroundStyle(KReelInk.ink)
      .lineLimit(1)
      .kReelBox(g.inset, g.titleTop, g.w - 2 * g.inset - 3, g.titleLine, align: .leading)
  }

  // MARK: 1 · the Notes tab, tapped; a page opens and is written

  struct TapNotes: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let barL = s * 0.07, barW = s * 0.86, barT = s * 0.76, barH = s * 0.16
      let slot = barW / 5
      let icon = s * 0.1
      let g = Page(s)
      let on = c.once(220, tap + 60, KReelEase.outCubic)
      let page = c.once(480, tap + 280, KReelEase.outCubic)
      return ZStack(alignment: .topLeading) {
        // the page that opens
        ZStack(alignment: .topLeading) {
          pageTitle(x)
          Typing(x: x, w: g.inner, delay: tap + 700, ms: 1700).offset(x: g.inset, y: g.rowTop)
        }
        .frame(width: g.w - 3, height: g.h - 3, alignment: .topLeading)
        .offset(x: 1.5, y: 1.5)
        .frame(width: g.w, height: g.h, alignment: .topLeading)
        .background(RoundedRectangle(cornerRadius: s * 0.03).fill(Color.white))
        .overlay(RoundedRectangle(cornerRadius: s * 0.03).strokeBorder(edge, lineWidth: 1.5))
        .offset(y: (1 - page) * s * 0.16)
        .opacity(page)
        .offset(x: (s - g.w) / 2, y: g.top)

        // the tab bar, its own four icons and the +
        HStack(spacing: 0) {
          ZStack {
            KReelTabIcon(tab: .envelope, color: KReelInk.tabInk, size: icon).opacity(on)
            KReelTabIcon(tab: .envelope, color: KReelInk.pen, active: true, size: icon).opacity(1 - on)
          }
          .frame(width: slot)
          ZStack {
            KReelTabIcon(tab: .notes, color: KReelInk.tabInk, size: icon).opacity(1 - on)
            KReelTabIcon(tab: .notes, color: KReelInk.pen, active: true, size: icon).opacity(on)
          }
          .scaleEffect(1 + 0.18 * sin(on * .pi))
          .frame(width: slot)
          Circle().fill(KReelInk.pen)
            .frame(width: s * 0.115, height: s * 0.115)
            .overlay(KReelPlus(size: s * 0.055, width: 2.8))
            .frame(width: slot)
          KReelTabIcon(tab: .kindreds, color: KReelInk.tabInk, size: icon).frame(width: slot)
          KReelTabIcon(tab: .me, color: KReelInk.tabInk, size: icon).frame(width: slot)
        }
        .frame(width: barW, height: barH)
        .background(RoundedRectangle(cornerRadius: s * 0.04).fill(Color.white))
        .overlay(RoundedRectangle(cornerRadius: s * 0.04).strokeBorder(KReelInk.ink12, lineWidth: 1.5))
        .offset(x: barL, y: barT)

        KReelFinger(c: c, x: barL + slot * 1.5 + s * 0.01, y: barT + barH / 2 + s * 0.005, at: tap, size: s * 0.15)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  /// four lines typed one after another, the caret riding the end of the one being written
  struct Typing: View {
    let x: KReelCtx
    let w: CGFloat
    let delay: Double
    let ms: Double
    var body: some View {
      let s = x.s, c = x.c
      let n = lines.count
      let p = c.step(Double(n), ms / Double(n), delay)
      let blink = c.loop(320)
      let row = Page(s).row
      let ch = s * 0.05
      let i = min(n - 1, Int(floor(p)))
      let f = p >= Double(n) ? 1 : p - Double(i)
      let typing = p > 0 && p < Double(n)
      return ZStack(alignment: .topLeading) {
        ForEach(0..<n, id: \.self) { k in
          let part = CGFloat(KReelClock.clamp01(p - Double(k)))
          Capsule().fill(KReelInk.ink).kReelBox(0, CGFloat(k) * row, part * lines[k] * w, s * barH)
        }
        RoundedRectangle(cornerRadius: s * 0.004)
          .fill(KReelInk.pen)
          .frame(width: s * 0.008, height: ch)
          .offset(x: CGFloat(f) * lines[i] * w + s * 0.006, y: CGFloat(i) * row + (s * barH - ch) / 2)
          .opacity(typing ? 1 : blink > 0.5 ? 1 : 0)
      }
      .frame(width: w, height: row * CGFloat(n), alignment: .topLeading)
    }
  }

  // MARK: 2 · the page folds in half and the seal is pressed on it

  struct FoldSeal: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let g = Page(s)
      let w = g.w, h = g.h, hh = g.hh, inner = g.inner, inset = g.inset
      let seal = s * 0.19
      let liftBy = s * 0.08
      let r = s * 0.03
      let f = c.once(820, 250, KReelEase.inOutCubic)
      let lift = c.once(420, 1000, KReelEase.outCubic)
      let press = c.once(340, 1380, KReelEase.outCubic)
      let burst = c.once(620, 1600, KReelEase.outCubic)
      let kFront = max(0.001, 1 - 2 * f)
      let kBack = max(0.001, (f - 0.5) * 2)
      let lower = UnevenRoundedRectangle(topLeadingRadius: 0, bottomLeadingRadius: r, bottomTrailingRadius: r, topTrailingRadius: 0)
      let upper = UnevenRoundedRectangle(topLeadingRadius: r, bottomLeadingRadius: 0, bottomTrailingRadius: 0, topTrailingRadius: r)
      return ZStack(alignment: .topLeading) {
        ZStack(alignment: .topLeading) {
          // the lower half, written — its rows sit where scene 1 typed them
          ZStack(alignment: .topLeading) {
            bar(s, w: inner * lines[2], top: g.rowTop + g.row * 2 - hh, left: inset)
            bar(s, w: inner * lines[3], top: g.rowTop + g.row * 3 - hh, left: inset)
          }
          .offset(x: 1.5, y: 1.5)
          .frame(width: w, height: hh, alignment: .topLeading)
          .background(lower.fill(Color.white))
          .clipShape(lower)
          .overlay(lower.strokeBorder(edge, lineWidth: 1.5))
          .offset(y: hh)

          // the upper half, folding down (no rule along its fold)
          ZStack(alignment: .topLeading) {
            pageTitle(x)
            bar(s, w: inner * lines[0], top: g.rowTop, left: inset)
            bar(s, w: inner * lines[1], top: g.rowTop + g.row, left: inset)
          }
          .offset(x: 1.5, y: 1.5)
          .frame(width: w, height: hh, alignment: .topLeading)
          .background(upper.fill(Color.white))
          .overlay(KReelInk.ink.opacity(min(1, f * 2) * 0.3))
          .clipShape(upper)
          .overlay(KReelOpenRect(radius: r, inset: 0.75, open: .bottom).stroke(edge, lineWidth: 1.5))
          .scaleEffect(x: 1, y: kFront)
          .offset(y: (hh / 2) * (1 - kFront))
          .opacity(f < 0.5 ? 1 : 0)

          // the back of the page, now on top
          Color.clear
            .frame(width: w, height: hh)
            .background(lower.fill(flap))
            .overlay(KReelInk.ink.opacity((1 - max(0, (f - 0.5) * 2)) * 0.3))
            .clipShape(lower)
            .overlay(lower.strokeBorder(edge, lineWidth: 1.5))
            .scaleEffect(x: 1, y: kBack)
            .offset(y: -(hh / 2) * (1 - kBack))
            .opacity(f > 0.5 ? 1 : 0)
            .offset(y: hh)

          // the seal, pressed
          Circle().strokeBorder(KReelInk.pen, lineWidth: s * 0.01)
            .frame(width: seal * 1.1, height: seal * 1.1)
            .scaleEffect(0.9 + 0.7 * burst)
            .opacity(burst > 0 && burst < 1 ? (1 - burst) * 0.6 : 0)
            .offset(x: (w - seal * 1.1) / 2, y: hh + (hh - seal * 1.1) / 2)
          KReelSeal(size: seal)
            .scaleEffect(1.7 - 0.7 * press)
            .opacity(min(1, press * 2.5))
            .offset(x: (w - seal) / 2, y: hh + (hh - seal - 3) / 2)
        }
        .frame(width: w, height: h, alignment: .topLeading)
        .offset(y: -liftBy * lift + s * 0.014 * sin(press * .pi))
        .offset(x: (s - w) / 2, y: g.top)

        label(x, "ga.sealedToday")
          .kReelRise(c, 1900)
          .offset(y: g.top + h - liftBy + s * 0.065)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  /// the folded, sealed page — as it lies afterwards
  struct SealedNote: View {
    let s: CGFloat
    let w: CGFloat
    var body: some View {
      let h = w * 0.36
      let shape = RoundedRectangle(cornerRadius: s * 0.025)
      return KReelSeal(size: h * 0.78)
        .frame(width: w, height: h)
        .background(shape.fill(flap))
        .overlay(shape.strokeBorder(edge, lineWidth: 1.5))
    }
  }

  // MARK: 3 · it tries for the cloud and can't; the courier doesn't take it

  struct Stays: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let cx = s * 0.4
      let cloudW = s * 0.36
      let cloudTop = s * 0.07
      let noteW = s * 0.46
      let noteTop = s * 0.6
      let lift = c.seq(450, [KReelStep(to: 1, ms: 650, ease: KReelEase.outQuad), KReelStep(to: 0, ms: 850, ease: KReelEase.bounce)])
      let shake = c.seq(1100, [KReelStep(to: 1, ms: 70), KReelStep(to: -1, ms: 90), KReelStep(to: 0.6, ms: 80), KReelStep(to: 0, ms: 80)])
      let slash = c.once(280, 1020, KReelEase.outCubic)
      let route = c.once(400, 150, KReelEase.outCubic)
      // a nod that starts and rests upright (the loop stops at 0 under Reduce Motion)
      let sway = c.loop(1100)
      let slashW = s * 0.44
      let slashH = s * 0.024
      let cloudMid = cloudTop + cloudW * 0.5
      let routeTop = cloudTop + cloudW * 0.86
      return ZStack(alignment: .topLeading) {
        // the way up, dotted
        Path { p in
          p.move(to: CGPoint(x: 2, y: 0))
          p.addLine(to: CGPoint(x: 2, y: noteTop - routeTop))
        }
        .stroke(KReelInk.ink, style: StrokeStyle(lineWidth: 2.4, lineCap: .round, dash: [4, 6]))
        .frame(width: 4, height: max(0, noteTop - routeTop))
        .opacity(route * 0.5)
        .offset(x: cx - 2, y: routeTop)

        // the cloud, struck out
        ZStack {
          KReelPath("M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z").fill(Color.white)
          KReelPath("M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z").stroke(KReelInk.ink, style: StrokeStyle(lineWidth: 1.2 * cloudW / 24, lineJoin: .round))
        }
        .frame(width: cloudW, height: cloudW)
        .offset(x: shake * s * 0.02)
        .offset(x: cx - cloudW / 2, y: cloudTop)

        Capsule().fill(KReelInk.post)
          .overlay(Capsule().strokeBorder(KReelInk.penWash, lineWidth: s * 0.007))
          .frame(width: slashW, height: slashH)
          .scaleEffect(x: max(0.001, slash), y: 1)
          .rotationEffect(.degrees(-32))
          .opacity(slash > 0 ? 1 : 0)
          .offset(x: cx - slashW / 2, y: cloudMid - slashH / 2)

        // the page — it rises, meets nothing to carry it, and falls back
        SealedNote(s: s, w: noteW)
          .rotationEffect(.degrees(-5 * lift))
          .offset(y: -lift * s * 0.17)
          .offset(x: cx - noteW / 2, y: noteTop)

        // the courier, dozing: she doesn't carry it and doesn't read it
        KReelBird(ref: x.img("sleepy"), size: s * 0.27)
          .rotationEffect(.degrees(sway * 6))
          .offset(x: s * 0.68, y: s * 0.555)

        label(x, "ga.neverPosted")
          .kReelRise(c, 1900)
          .offset(y: s * 0.865)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  // MARK: 4 · it lies inside the phone, and only there

  struct Kept: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s, c = x.c
      let pw = s * 0.44
      let ph = s * 0.64
      let noteW = s * 0.34
      let halo = s * 0.36
      let lockW = s * 0.1
      let drop = c.once(640, 250, KReelEase.outBack(1.3))
      let pulse = c.loop(1000, 700)
      let shackle = c.once(180, 1250, KReelEase.outCubic)
      return ZStack(alignment: .topLeading) {
        KReelMiniScreen(w: pw, h: ph) {
          ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: s * 0.015).fill(KReelInk.ink)
              .kReelBox((pw - pw * 0.32) / 2, s * 0.025, pw * 0.32, s * 0.03)
            Circle().fill(KReelInk.penWash)
              .frame(width: halo, height: halo)
              .scaleEffect(0.9 + 0.14 * pulse)
              .opacity(drop * (0.55 + 0.45 * pulse))
              .offset(x: (pw - halo) / 2 - 2, y: ph * 0.42 - halo / 2)
            SealedNote(s: s, w: noteW)
              .offset(y: (1 - drop) * -s * 0.42)
              .opacity(min(1, drop * 3))
              .offset(x: (pw - noteW) / 2 - 2, y: ph * 0.42 - (noteW * 0.36) / 2)
            // a lock that clicks shut under it
            ZStack(alignment: .topLeading) {
              KReelPath("M6 12V7a4 4 0 0 1 8 0v5", box: CGRect(x: 0, y: 0, width: 20, height: 12))
                .stroke(KReelInk.ink, style: StrokeStyle(lineWidth: 1.8 * lockW / 20, lineCap: .round))
                .frame(width: lockW, height: lockW * 0.6)
                .offset(y: (1 - shackle) * -lockW * 0.22)
              RoundedRectangle(cornerRadius: 2 * lockW / 20).fill(KReelInk.ink)
                .frame(width: 15 * lockW / 20, height: 10 * lockW / 20)
                .offset(x: 2.5 * lockW / 20, y: lockW * 0.5 + 1 * lockW / 20)
            }
            .frame(width: lockW, height: lockW * 1.1, alignment: .topLeading)
            .kReelPop(c, 1000)
            .offset(x: (pw - lockW) / 2 - 2, y: ph * 0.68)
          }
        }
        .offset(x: (s - pw) / 2, y: s * 0.11)

        label(x, "ga.phoneOnly")
          .kReelRise(c, 1400)
          .offset(y: s * 0.11 + ph + s * 0.06)
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }

  // MARK: 5 · the title

  struct Title: View {
    let x: KReelCtx
    var body: some View {
      let s = x.s
      let words = KReelBigType.words(x.w("gd.sealed.title"))
      let seal = s * 0.14
      return ZStack(alignment: .topLeading) {
        KReelBigType(c: x.c, s: s, words: words, accent: words.count > 1 ? [words.count - 1] : [])
        KReelSeal(size: seal)
          .kReelPop(x.c, 120 + Double(words.count) * 170 + 220)
          .offset(x: s * 0.09, y: s - s * 0.08 - (seal + 3))
      }
      .frame(width: s, height: s, alignment: .topLeading)
    }
  }
}

/// A rounded rect's outline with one side left open (a border with that side's width 0)
struct KReelOpenRect: Shape {
  enum Side { case bottom }
  let radius: CGFloat
  let inset: CGFloat
  let open: Side

  func path(in rect: CGRect) -> Path {
    let r = rect.insetBy(dx: inset, dy: inset)
    let q = max(0, min(radius - inset, r.width / 2, r.height / 2))
    var p = Path()
    p.move(to: CGPoint(x: r.minX, y: rect.maxY))
    p.addLine(to: CGPoint(x: r.minX, y: r.minY + q))
    p.addArc(center: CGPoint(x: r.minX + q, y: r.minY + q), radius: q, startAngle: .degrees(180), endAngle: .degrees(270), clockwise: false)
    p.addLine(to: CGPoint(x: r.maxX - q, y: r.minY))
    p.addArc(center: CGPoint(x: r.maxX - q, y: r.minY + q), radius: q, startAngle: .degrees(270), endAngle: .degrees(0), clockwise: false)
    p.addLine(to: CGPoint(x: r.maxX, y: rect.maxY))
    return p
  }
}
