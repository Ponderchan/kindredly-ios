// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 TEMPLATE B, "MAIL PILE" (design/report-v2/B, the verdict's winner, with its grafts): every card
 is a piece of post on a candy ground.
   1 cover   two envelopes, the type's stamp, a postmark; "you're" and the type name A-size
   2 far     "your 9 letters landed on / 41 / strangers' desks", the receipt, DELIVERED, and
             "41 people have read you. not one of them knows your name."
   3 line    the postcard with your own line (your Letter font), Wren on the corner
   4 vibe    a sheet of three perforated stamps, 1st/2nd/3rd, the third torn off
   5 hour    the night-service ticket: the window, "7 of 9 after 11pm", a dot per letter
   6 click   the luggage tag to the type you'd click with, why, read their letters
   7 share   the 9:16 stamp (KWrappedShareCard), share, compare, switch style
   8 next    how you changed in a sealed envelope (First Class) or open, Wren's prompt, write
 Wren or the stamp runs off the edge on 1, 2 and 6 (the verdict's bleed).
 */

struct KWrappedCardsB: View {
  let card: KWrappedCard
  let ctx: KWCtx

  var body: some View {
    switch card {
    case .cover: cover
    case .far: far
    case .line: line
    case .vibe: vibe
    case .hour: hour
    case .click: click
    case .share: share
    case .next: next
    }
  }

  private var g: KWGround { kwGround(.b, card) }
  private var ink: Color { g.dark ? .white : KW.ink }

  // MARK: 1 cover

  private var cover: some View {
    VStack(alignment: .leading, spacing: 0) {
      KWrappedFit {
        VStack(alignment: .leading, spacing: 0) {
          Text(ctx["coverEyebrow"])
            .kw(.label, 12)
            .foregroundStyle(KW.ink)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(KW.acid)
            .rotationEffect(.degrees(-3))
            .modifier(ctx.slap(0.45))
            .padding(.top, 6)
          ZStack(alignment: .topLeading) {
            KWEnvelope(fill: .white)
              .frame(width: 220, height: 140)
              .rotationEffect(.degrees(-11))
              .kwShadow(6)
              .offset(x: -6, y: 46)
              .modifier(ctx.drop(0))
            KWEnvelope(fill: KW.pink)
              .frame(width: 220, height: 140)
              .overlay(alignment: .bottomTrailing) {
                Text(ctx["envelopeTo"]).kText(.content(14, italic: true)).foregroundStyle(KW.ink).padding(14)
              }
              .rotationEffect(.degrees(8))
              .kwShadow(6)
              .offset(x: 120, y: 150)
              .modifier(ctx.drop(0.12))
            stamp("stamp", width: 180)
              .rotationEffect(.degrees(-6))
              .offset(x: 70, y: 0)
              .modifier(ctx.drop(0.26, from: -90))
            KWPostmark(top: ctx["shareIssue"], bottom: "WREN POST", size: 120)
              .rotationEffect(.degrees(-14))
              .offset(x: 190, y: 160)
              .modifier(ctx.slap(0.8))
          }
          .frame(height: 280, alignment: .topLeading)
          .padding(.top, 10)
          Text(ctx["youre"]).kw(.title, 26).foregroundStyle(Color.white).modifier(ctx.rise(0.5)).padding(.top, 8)
          KWHeroText(text: ctx["typeName"], size: 64)
            .modifier(ctx.rise(0.6))
            .padding(.top, 2)
          Text(ctx["typeLine"])
            .kw(.body, 18)
            .foregroundStyle(Color.white)
            .fixedSize(horizontal: false, vertical: true)
            .modifier(ctx.rise(0.72))
            .padding(.top, 12)
        }
      }
      HStack {
        KWLabel(text: ctx["readFrom"], color: .white.opacity(0.85))
        Spacer(minLength: 12)
        KWLabel(text: ctx["tapToOpen"], color: .white)
      }
    }
    .overlay(alignment: .topTrailing) {
      wren("fly", width: 120).rotationEffect(.degrees(-8)).offset(x: 60, y: 90).modifier(ctx.drop(0.9, from: -30, turn: 10))
    }
  }

  // MARK: 2 far

  private var far: some View {
    VStack(alignment: .leading, spacing: 0) {
      KWrappedFit {
        VStack(alignment: .leading, spacing: 0) {
          KWLabel(text: ctx.c["eyebrow.far"])
          Text(ctx["farLede"]).kw(.title, 27).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true).modifier(ctx.rise(0)).padding(.top, 14)
          KWHeroText(text: ctx["farBig"], size: 150, outline: 5, shadow: 7)
            .modifier(ctx.slap(0.2))
          Text(ctx["farUnit"]).kw(.title, 34).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true).modifier(ctx.rise(0.35))
          KWReceiptView(ctx: ctx)
            .rotationEffect(.degrees(2.5))
            .padding(.horizontal, 18)
            .padding(.top, 22)
            .overlay(alignment: .bottomTrailing) {
              Text(ctx["delivered"])
                .kw(.hero, 26)
                .foregroundStyle(KW.blue)
                .textCase(.uppercase)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(KW.blue, lineWidth: 4))
                .rotationEffect(.degrees(-16))
                .offset(x: 4, y: 10)
                .modifier(ctx.slap(1.2))
            }
            .modifier(ctx.drop(0.5, from: -40, turn: 0))
          Text(ctx["closer"])
            .kw(.body, 16)
            .foregroundStyle(KW.ink)
            .fixedSize(horizontal: false, vertical: true)
            .modifier(ctx.rise(1.3))
            .padding(.top, 28)
        }
      }
    }
    .overlay(alignment: .topTrailing) {
      wren("delight", width: 130).rotationEffect(.degrees(10)).offset(x: 50, y: 36).modifier(ctx.drop(0.6, from: -40, turn: 12))
    }
  }

  // MARK: 3 line

  private var line: some View {
    VStack(alignment: .leading, spacing: 0) {
      KWrappedFit {
        VStack(alignment: .leading, spacing: 0) {
          KWLabel(text: ctx.c["eyebrow.line"])
          Text(ctx["lineTitle"]).kw(.title, 34).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true).padding(.trailing, 60).modifier(ctx.rise(0)).padding(.top, 12)
          KWPostcard(ctx: ctx)
            .rotationEffect(.degrees(-3))
            .padding(.top, 44)
            .padding(.horizontal, 4)
            .overlay(alignment: .topTrailing) {
              wren("curious", width: 104).rotationEffect(.degrees(8)).offset(x: 30, y: -70).modifier(ctx.drop(0.65, from: 0, turn: 10))
            }
            .modifier(ctx.drop(0.2))
          Spacer(minLength: 40)
        }
      }
      Text(ctx["lineOnly"])
        .kw(.body, 13)
        .foregroundStyle(KW.ink)
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity)
        .modifier(ctx.rise(1.1))
    }
  }

  // MARK: 4 vibe

  private var vibe: some View {
    VStack(alignment: .leading, spacing: 0) {
      KWrappedFit {
        VStack(alignment: .leading, spacing: 0) {
          KWLabel(text: ctx.c["eyebrow.vibe"])
          Text(ctx["vibeTitleB"]).kw(.title, 40).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true).modifier(ctx.rise(0)).padding(.top, 12)
          Text(ctx["vibeSub"]).kw(.body, 16).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true).modifier(ctx.rise(0.1)).padding(.top, 8)
          VStack(spacing: 14) {
            ForEach(Array(ctx.c.tags.enumerated()), id: \.element.id) { i, tag in
              let colours: [(Color, Color)] = [(KW.blue, .white), (KW.pink, KW.ink), (KW.mint, KW.ink)]
              let turn: [Double] = [-2, 1.5, -6]
              KWVibeStamp(tag: tag, fill: colours[i % 3].0, ink: colours[i % 3].1)
                .background(alignment: .center) {
                  if i == 2 {
                    RoundedRectangle(cornerRadius: 4).strokeBorder(KW.ink.opacity(0.5), style: StrokeStyle(lineWidth: 2.5, dash: [8, 6])).offset(x: -14, y: -12)
                  }
                }
                .rotationEffect(.degrees(turn[i % 3]))
                .offset(x: i == 2 ? 14 : 0)
                .modifier(i == 2 ? ctx.drop(0.6, from: 0, turn: 10) : ctx.drop(0.15 + Double(i) * 0.15))
            }
          }
          .padding(.top, 22)
        }
      }
      HStack {
        Spacer()
        KWLabel(text: ctx["tear"])
      }
      .modifier(ctx.rise(1))
    }
  }

  // MARK: 5 hour

  private var hour: some View {
    VStack(alignment: .leading, spacing: 0) {
      KWrappedFit {
        VStack(alignment: .leading, spacing: 0) {
          KWLabel(text: ctx.c["eyebrow.hour"], color: .white.opacity(0.8))
          Text(ctx["hourLede"]).kw(.title, 28).foregroundStyle(Color.white).modifier(ctx.rise(0.1)).padding(.top, 14)
          KWHeroText(text: "\(ctx["hourFrom"]) → \(ctx["hourTo"])", size: 72, fill: KW.butter, shadow: 6, shadowColor: KW.blue)
            .lineLimit(1)
            .modifier(ctx.slap(0.25))
            .padding(.top, 4)
          Text(ctx["hourLine"]).kw(.body, 18).foregroundStyle(Color.white).fixedSize(horizontal: false, vertical: true).modifier(ctx.rise(0.4)).padding(.top, 12)
          KWNightTicket(ctx: ctx)
            .rotationEffect(.degrees(-4))
            .padding(.top, 96)
            .overlay(alignment: .topTrailing) {
              wren(ctx.c.hourNight ? "sleepy" : "standing", width: 130)
                .overlay(alignment: .topTrailing) {
                  // the art's own grey z's vanish on the night: two white ones beside them
                  if ctx.c.hourNight {
                    Text("z z").font(.system(size: 18, weight: .black)).foregroundStyle(Color.white).rotationEffect(.degrees(-12)).offset(x: 10, y: 4).accessibilityHidden(true)
                  }
                }
                .offset(x: -6, y: 6)
                .modifier(ctx.rise(0.9))
            }
            .modifier(ctx.drop(0.45))
        }
      }
      KWLabel(text: ctx["hourFoot"], color: .white.opacity(0.85)).modifier(ctx.rise(1.2))
    }
    .background(alignment: .topTrailing) {
      ZStack(alignment: .topTrailing) {
        KWMoon(size: 70).offset(x: -6, y: 0)
        KWStar().fill(KW.acid).frame(width: 16, height: 16).offset(x: -60, y: 110)
        KWStar().fill(KW.pink).frame(width: 11, height: 11).offset(x: -110, y: -6)
      }
      .modifier(ctx.rise(0))
      .accessibilityHidden(true)
    }
  }

  // MARK: 6 click

  private var click: some View {
    VStack(alignment: .leading, spacing: 0) {
      KWrappedFit {
        VStack(alignment: .leading, spacing: 0) {
          KWLabel(text: ctx.c["eyebrow.click"])
          Text(ctx["clickTitle"]).kw(.title, 40).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true).modifier(ctx.rise(0)).padding(.top, 12)
          KWLuggageTag(ctx: ctx)
            .rotationEffect(.degrees(3))
            .padding(.top, 74)
            .padding(.horizontal, 6)
            .modifier(ctx.drop(0.15))
        }
      }
      VStack(spacing: 10) {
        KWKey(title: ctx["readTheirs"], kind: .acid) { ctx.actions.onReadTheirs() }
        Text(ctx["readHint"]).kw(.body, 13).foregroundStyle(KW.ink).multilineTextAlignment(.center)
      }
      .modifier(ctx.rise(0.6))
      .padding(.top, 12)
    }
    .overlay(alignment: .topLeading) {
      wren("curious", width: 104).scaleEffect(x: -1, y: 1).offset(x: -52, y: 150).modifier(ctx.drop(0.8, from: 0, turn: -12))
    }
  }

  // MARK: 7 share

  private var share: some View {
    VStack(alignment: .leading, spacing: 0) {
      KWLabel(text: ctx.c["eyebrow.share"])
      Text(ctx["shareTitle"]).kw(.title, 34).foregroundStyle(KW.ink).modifier(ctx.rise(0)).padding(.top, 12)
      KWSharePreview(ctx: ctx)
        .rotationEffect(.degrees(-2))
        .modifier(ctx.drop(0.15))
        .padding(.vertical, 14)
      VStack(spacing: 10) {
        KWKey(title: ctx.c.busy ? "…" : ctx["shareStory"], kind: .acid) { ctx.share() }
        KWKey(title: ctx["shareCompare"], kind: .white) { ctx.actions.onCompare() }
        KWKey(title: "↺  " + ctx["switchStyle"], kind: .ink, small: true) { ctx.actions.onSwitchStyle() }
      }
      .modifier(ctx.rise(0.5))
    }
  }

  // MARK: 8 next

  private var next: some View {
    VStack(alignment: .leading, spacing: 0) {
      KWrappedFit {
        VStack(alignment: .leading, spacing: 0) {
          KWLabel(text: ctx.c["eyebrow.next"])
          Text(ctx["nextTitle"]).kw(.title, 36).foregroundStyle(KW.ink).modifier(ctx.rise(0)).padding(.top, 12)
          KWChangesEnvelope(ctx: ctx)
            .padding(.top, 22)
            .modifier(ctx.drop(0.15))
          KWPromptCard(ctx: ctx)
            .rotationEffect(.degrees(1.5))
            .padding(.top, 40)
            .modifier(ctx.drop(0.35))
        }
      }
      KWKey(title: ctx["write"], kind: .acid) { ctx.actions.onWrite() }
        .modifier(ctx.rise(0.6))
        .padding(.top, 12)
      HStack(spacing: 10) {
        Circle().strokeBorder(KW.ink, lineWidth: 2).frame(width: 22, height: 22).overlay(Circle().strokeBorder(KW.ink, lineWidth: 1).padding(4))
        KWLabel(text: ctx["nextReport"])
      }
      .frame(maxWidth: .infinity)
      .padding(.top, 14)
    }
  }

  // MARK: pieces

  private func stamp(_ key: String, width: CGFloat) -> some View {
    Group {
      if let img = ctx.pics.image(key) {
        img.resizable().scaledToFit()
      } else {
        RoundedRectangle(cornerRadius: 8).fill(Color.white)
      }
    }
    .frame(width: width, height: width * 1.2)
    .kwInk(3, shadow: 6)
    .accessibilityHidden(true)
  }

  private func wren(_ pose: String, width: CGFloat) -> some View {
    Group {
      if let img = ctx.pics.image(pose) {
        img.resizable().scaledToFit()
      } else {
        Color.clear
      }
    }
    .frame(width: width, height: width)
    .accessibilityHidden(true)
  }
}

// MARK: - The pieces of post B draws (A borrows some)

struct KWReceiptView: View {
  let ctx: KWCtx

  var body: some View {
    VStack(spacing: 0) {
      Text(ctx["receiptHead"].uppercased()).font(.system(size: 14, weight: .heavy, design: .monospaced)).tracking(2)
      Text(ctx["receiptSub"]).font(.system(size: 11, weight: .medium, design: .monospaced)).foregroundStyle(KW.ink2).tracking(1).padding(.top, 2).multilineTextAlignment(.center)
      dashed.padding(.vertical, 8)
      row(ctx["rowWrote"], "\(ctx.c["letters"])")
      row(ctx["rowDesks"], "\(ctx.c["desks"])")
      row(ctx["rowBack"], "\(ctx.c["replies"])")
      dashed.padding(.vertical, 8)
      HStack {
        Text(ctx["rowKindred"].uppercased()).fontWeight(.heavy)
        Spacer()
        Text("×\(ctx.c["kindreds"])").fontWeight(.heavy)
      }
      .font(.system(size: 15, design: .monospaced))
      KWBarcode().frame(height: 34).padding(.horizontal, 6).padding(.top, 12)
      Text(ctx["receiptKeep"]).font(.system(size: 11, weight: .medium, design: .monospaced)).tracking(1).padding(.top, 6).multilineTextAlignment(.center)
    }
    .foregroundStyle(KW.ink)
    .padding(.horizontal, 20)
    .padding(.top, 18)
    .padding(.bottom, 30)
    .background(KWReceipt().fill(Color.white))
    .kwInk(3, shadow: 6)
    .accessibilityElement(children: .combine)
  }

  private var dashed: some View {
    Line().stroke(KW.ink, style: StrokeStyle(lineWidth: 2, dash: [5, 4])).frame(height: 2)
  }

  private func row(_ a: String, _ b: String) -> some View {
    HStack(alignment: .firstTextBaseline, spacing: 8) {
      Text(a).fixedSize(horizontal: false, vertical: true)
      Spacer(minLength: 8)
      Text(b).fontWeight(.heavy)
    }
    .font(.system(size: 13, weight: .medium, design: .monospaced))
    .padding(.vertical, 1)
  }

  struct VLine: Shape {
    func path(in r: CGRect) -> Path {
      var p = Path()
      p.move(to: CGPoint(x: r.midX, y: r.minY))
      p.addLine(to: CGPoint(x: r.midX, y: r.maxY))
      return p
    }
  }

  struct Line: Shape {
    func path(in r: CGRect) -> Path {
      var p = Path()
      p.move(to: CGPoint(x: r.minX, y: r.midY))
      p.addLine(to: CGPoint(x: r.maxX, y: r.midY))
      return p
    }
  }
}

struct KWPostcard: View {
  let ctx: KWCtx

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .top) {
        KWLabel(text: ctx["postcard"], size: 11).padding(.top, 4)
        Spacer()
        Text(ctx["stampSlot"])
          .font(.system(size: 9, weight: .bold, design: .monospaced))
          .foregroundStyle(KW.ink2)
          .multilineTextAlignment(.center)
          .frame(width: 56, height: 66)
          .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(KW.ink2, style: StrokeStyle(lineWidth: 2, dash: [4, 3])))
      }
      Text(ctx["line"])
        .kText(.content(29, lineHeight: 1.15))
        .foregroundStyle(KW.ink)
        .fixedSize(horizontal: false, vertical: true)
        .minimumScaleFactor(0.6)
        .padding(.top, 14)
      Text(ctx["lineSig"]).font(.system(size: 12, weight: .semibold, design: .monospaced)).foregroundStyle(KW.ink2).padding(.top, 14)
      Rectangle().fill(KW.ink).frame(height: 2).padding(.top, 18)
      KWLabel(text: ctx["lineTo"], size: 11, color: KW.ink2).padding(.top, 9)
    }
    .padding(.horizontal, 20)
    .padding(.top, 18)
    .padding(.bottom, 26)
    .background(RoundedRectangle(cornerRadius: 10).fill(Color.white))
    .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(KW.ink, lineWidth: 3))
    .background(RoundedRectangle(cornerRadius: 10).fill(KW.ink).offset(x: 7, y: 7))
    .overlay(alignment: .bottomLeading) {
      KWSticker(text: ctx.c.s["lineSt1"] ?? "", fill: KW.acid, size: 15).rotationEffect(.degrees(-7)).offset(x: -10, y: 22).modifier(ctx.slap(0.9))
    }
    .overlay(alignment: .bottomTrailing) {
      KWSticker(text: ctx.c.s["lineSt2"] ?? "", fill: KW.butter, size: 15).rotationEffect(.degrees(6)).offset(x: 6, y: 30).modifier(ctx.slap(1.05))
    }
  }
}

struct KWVibeStamp: View {
  let tag: KWrappedTagItem
  let fill: Color
  let ink: Color

  var body: some View {
    HStack(spacing: 14) {
      KWGlyph(id: tag.id, size: 60)
      VStack(alignment: .leading, spacing: 5) {
        Text(tag.tag).kw(.title, 27).foregroundStyle(ink).lineLimit(1).minimumScaleFactor(0.6)
        Text(tag.sub).kw(.body, 14).foregroundStyle(ink).fixedSize(horizontal: false, vertical: true)
      }
      Spacer(minLength: 0)
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 18)
    .frame(minHeight: 116)
    .background(RoundedRectangle(cornerRadius: 3).fill(fill))
    .overlay(alignment: .topTrailing) {
      Text(tag.rank).font(.system(size: 12, weight: .heavy, design: .monospaced)).foregroundStyle(ink).padding(.top, 8).padding(.trailing, 10)
    }
    .padding(12)
    .background(KWPerforated(bite: 6, pitch: 18).fill(Color.white))
    .kwInk(2, shadow: 4)
    .accessibilityElement(children: .combine)
  }
}

struct KWNightTicket: View {
  let ctx: KWCtx

  var body: some View {
    HStack(spacing: 0) {
      VStack(alignment: .leading, spacing: 0) {
        KWLabel(text: ctx["hourService"], size: 10)
        Text("\(ctx["hourFrom"]) → \(ctx["hourTo"])").kw(.title, 30).foregroundStyle(KW.ink).lineLimit(1).minimumScaleFactor(0.7).padding(.top, 8)
        if !ctx["hourAfter"].isEmpty {
          Text(ctx["hourAfter"]).font(.system(size: 12, weight: .semibold, design: .monospaced)).foregroundStyle(KW.ink).padding(.top, 6)
        }
        Spacer(minLength: 14)
        KWLabel(text: ctx["hourStrip"], size: 10).padding(.bottom, 6)
        KWHourStrip(buckets: ctx.c.buckets, start: ctx.c.hourStart, ink: KW.ink, band: KW.ink.opacity(0.14))
          .frame(height: 64)
      }
      .padding(.leading, 18)
      .padding(.trailing, 14)
      .padding(.vertical, 16)
      .frame(maxWidth: .infinity, alignment: .leading)
      .overlay(alignment: .trailing) {
        KWReceiptView.VLine().stroke(KW.ink, style: StrokeStyle(lineWidth: 3, dash: [6, 5])).frame(width: 3)
      }
      // the stub's words run up the stub, in two lines when they need them
      Text(ctx["hourStub"].uppercased())
        .font(.system(size: 13, weight: .heavy, design: .monospaced))
        .tracking(1.6)
        .multilineTextAlignment(.center)
        .foregroundStyle(KW.ink)
        .lineLimit(2)
        .minimumScaleFactor(0.6)
        .frame(width: 180, height: 60)
        .rotationEffect(.degrees(-90))
        .frame(width: 66, height: 180)
    }
    .frame(minHeight: 214)
    .background(KWTicket(split: 0.76).fill(KW.butter))
    .kwInk(3, shadow: 6, shadowColor: KW.blue)
    .accessibilityElement(children: .combine)
  }
}

/// The 24 hours from noon to noon: a dot per letter in each hour's column, the window's three
/// columns shaded, ticks at 12 18 00 06 12.
struct KWHourStrip: View {
  let buckets: [Int]
  let start: Int
  var ink: Color = KW.ink
  var band: Color = KW.ink.opacity(0.14)

  var body: some View {
    VStack(spacing: 4) {
      GeometryReader { g in
        let w = g.size.width / 24
        let maxDots = max(1, min(6, buckets.max() ?? 1))
        let d = min(w * 0.72, (g.size.height - 6) / CGFloat(maxDots) - 2)
        ZStack(alignment: .bottomLeading) {
          ForEach(0..<24, id: \.self) { col in
            let hour = (col + 12) % 24
            let inWindow = [start, (start + 1) % 24, (start + 2) % 24].contains(hour)
            if inWindow {
              RoundedRectangle(cornerRadius: 4).fill(band).frame(width: w, height: g.size.height).offset(x: CGFloat(col) * w)
            }
            let n = min(maxDots, buckets.indices.contains(hour) ? buckets[hour] : 0)
            VStack(spacing: 2) {
              ForEach(0..<n, id: \.self) { _ in Circle().fill(ink).frame(width: d, height: d) }
            }
            .frame(width: w, alignment: .bottom)
            .offset(x: CGFloat(col) * w, y: -3)
          }
          Rectangle().fill(ink).frame(height: 2.5).offset(y: 1)
        }
      }
      HStack(spacing: 0) {
        ForEach(Array(["12", "18", "00", "06", "12"].enumerated()), id: \.offset) { i, t in
          if i > 0 { Spacer(minLength: 0) }
          Text(t).font(.system(size: 9.5, weight: .bold, design: .monospaced)).foregroundStyle(ink)
        }
      }
    }
    .accessibilityHidden(true)
  }
}

struct KWLuggageTag: View {
  let ctx: KWCtx

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .top, spacing: 14) {
        Group {
          if let img = ctx.pics.image("pairStamp") { img.resizable().scaledToFit() } else { Color.clear }
        }
        .frame(width: 96, height: 115)
        .kwInk(2, shadow: 3)
        .rotationEffect(.degrees(-6))
        VStack(alignment: .leading, spacing: 4) {
          KWLabel(text: ctx["destination"], size: 10)
          Text(ctx["pairName"]).kw(.hero, 38).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true).minimumScaleFactor(0.6)
        }
      }
      Text("“\(ctx["pairLine"])”").kw(.body, 15).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true).padding(.top, 14)
      KWReceiptView.Line().stroke(KW.ink, style: StrokeStyle(lineWidth: 3, dash: [7, 5])).frame(height: 3).padding(.top, 14)
      KWLabel(text: ctx["whyLabel"], size: 10).padding(.top, 12)
      Text(ctx["why"]).kw(.body, 18).fontWeight(.bold).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true).padding(.top, 6)
    }
    .padding(.horizontal, 22)
    .padding(.top, 62)
    .padding(.bottom, 22)
    .background(KWTag().fill(Color.white))
    .overlay(alignment: .top) {
      Circle().fill(KW.mint).frame(width: 24, height: 24)
        .overlay(Circle().strokeBorder(KW.ink, lineWidth: 3))
        .padding(5)
        .background(Circle().fill(KW.butter))
        .overlay(Circle().strokeBorder(KW.ink, lineWidth: 3))
        .padding(.top, 14)
    }
    .kwInk(3, shadow: 6)
    .overlay(alignment: .top) {
      Path { p in
        p.move(to: CGPoint(x: 14, y: 88))
        p.addCurve(to: CGPoint(x: 40, y: 0), control1: CGPoint(x: 6, y: 56), control2: CGPoint(x: 46, y: 40))
      }
      .stroke(KW.ink, style: StrokeStyle(lineWidth: 3.5, lineCap: .round))
      .frame(width: 60, height: 90)
      .offset(x: 6, y: -64)
      .accessibilityHidden(true)
    }
    .accessibilityElement(children: .combine)
  }
}

/// The share card on card 7: the real picture's view, scaled to the space.
struct KWSharePreview: View {
  let ctx: KWCtx

  var body: some View {
    GeometryReader { g in
      let s = min(g.size.width / 360, g.size.height / 640)
      KWrappedShareCard(c: ctx.c, pics: ctx.pics)
        .frame(width: 360, height: 640)
        .environment(\.dynamicTypeSize, .large)
        .scaleEffect(s)
        .frame(width: g.size.width, height: g.size.height)
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel([ctx["shareIm"], ctx["typeName"], ctx.c.tags.map(\.tag).joined(separator: ", "), ctx["shareUrl"]].joined(separator: " "))
  }
}

/// "how you changed": a sheet in a sealed envelope (blurred, the First Class seal and its key),
/// or the sheet alone and open (a member), or the first month's note.
struct KWChangesEnvelope: View {
  let ctx: KWCtx

  var body: some View {
    if ctx.c.changes.isEmpty {
      sheet(blurred: false)
        .rotationEffect(.degrees(-2))
    } else if !ctx.c.locked {
      sheet(blurred: false)
        .rotationEffect(.degrees(-2))
    } else {
      ZStack(alignment: .bottom) {
        sheet(blurred: true)
          .rotationEffect(.degrees(-3))
          .padding(.horizontal, 22)
          .frame(maxHeight: .infinity, alignment: .top)
        envelope
          .frame(height: 140)
      }
      .frame(height: 250)
      .overlay(alignment: .topTrailing) {
        Text(ctx["seal"].uppercased())
          .font(.system(size: 9.5, weight: .heavy, design: .monospaced))
          .multilineTextAlignment(.center)
          .foregroundStyle(KW.ink)
          .padding(10)
          .frame(width: 88, height: 88)
          .background(Circle().fill(KW.butter))
          .overlay(Circle().strokeBorder(KW.ink, lineWidth: 3))
          .overlay(Circle().strokeBorder(KW.ink, style: StrokeStyle(lineWidth: 2, dash: [4, 3])).padding(6))
          .background(Circle().fill(KW.ink).offset(x: 4, y: 4))
          .rotationEffect(.degrees(14))
          .offset(x: 8, y: 70)
          .modifier(ctx.slap(0.7))
      }
    }
  }

  private func sheet(blurred: Bool) -> some View {
    VStack(alignment: .leading, spacing: 6) {
      if !ctx["sinceLabel"].isEmpty { KWLabel(text: ctx["sinceLabel"], size: 10) }
      Text(ctx["changedTitle"]).kw(.title, 21).foregroundStyle(KW.ink)
      if ctx.c.changes.isEmpty {
        Text(ctx["firstNote"]).kw(.body, 15).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true).padding(.top, 4)
      } else {
        VStack(alignment: .leading, spacing: 4) {
          ForEach(Array(ctx.c.changes.enumerated()), id: \.offset) { _, line in
            Text("· " + line).kw(.body, 15).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true)
          }
        }
        .padding(.top, 4)
        .blur(radius: blurred ? 5 : 0)
        .accessibilityHidden(blurred)
      }
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 14)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 6).fill(Color.white))
    .overlay(RoundedRectangle(cornerRadius: 6).strokeBorder(KW.ink, lineWidth: 3))
    .background(RoundedRectangle(cornerRadius: 6).fill(KW.ink).offset(x: 5, y: 5))
  }

  private var envelope: some View {
    GeometryReader { geo in
      let w = geo.size.width, h = geo.size.height
      ZStack(alignment: .bottom) {
        Path { p in
          p.move(to: .zero)
          p.addLine(to: CGPoint(x: w / 2, y: h * 0.3))
          p.addLine(to: CGPoint(x: w, y: 0))
          p.addLine(to: CGPoint(x: w, y: h))
          p.addLine(to: CGPoint(x: 0, y: h))
          p.closeSubpath()
        }
        .fill(KW.blue)
        Path { p in
          p.move(to: .zero)
          p.addLine(to: CGPoint(x: w / 2, y: h * 0.3))
          p.addLine(to: CGPoint(x: w, y: 0))
          p.addLine(to: CGPoint(x: w, y: h))
          p.addLine(to: CGPoint(x: 0, y: h))
          p.closeSubpath()
        }
        .stroke(KW.ink, style: StrokeStyle(lineWidth: 3, lineJoin: .round))
        KWKey(title: ctx["unlock"], kind: .white, small: true) { ctx.actions.onUnlock() }
          .padding(.bottom, 16)
      }
    }
    .background(Rectangle().fill(KW.ink).offset(x: 5, y: 5).padding(.top, 20))
  }
}

struct KWPromptCard: View {
  let ctx: KWCtx

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      KWLabel(text: ctx["promptLabel"], size: 10)
      Text(ctx["prompt"]).kw(.body, 22).fontWeight(.bold).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true).padding(.trailing, 50)
    }
    .padding(.horizontal, 18)
    .padding(.vertical, 16)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 16).fill(Color.white))
    .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(KW.ink, lineWidth: 3))
    .background(RoundedRectangle(cornerRadius: 16).fill(KW.ink).offset(x: 6, y: 6))
    .overlay(alignment: .topTrailing) {
      Group {
        if let img = ctx.pics.image("delight") { img.resizable().scaledToFit() } else { Color.clear }
      }
      .frame(width: 100, height: 100)
      .offset(x: 12, y: -58)
      .accessibilityHidden(true)
    }
    .accessibilityElement(children: .combine)
  }
}
