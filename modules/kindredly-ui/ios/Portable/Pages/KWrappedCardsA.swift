// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 TEMPLATE A, "WRAPPED" (design/report-v2/A): eight loud poster cards, one idea each, a full-bleed
 candy ground per card, giant condensed type, the stamps and Wren on top like stickers running
 off the edges. Same facts and words as B (wrapped-core); only the drawing differs. The eyebrow
 is a white mono pill (a label, so it keeps its edge like a sticker); the keys are flat (rule B).
   1 cover   Wren's note card, the stamp off the right edge, "your writing type is" + the name
   2 far     "41" huge, strangers' desks, the two stickers, the closer
   3 line    the line on lined paper under tape (your Letter font), Wren in the corner
   4 vibe    "you, in three stickers": the three #tags as stickers, and the read of you
   5 hour    the moon, Wren asleep, the window in two lines, the dot strip
   6 click   the pair's stamp and their thing, the pair's name huge, why, read their letters
   7 share   the poster (KWrappedShareCard), share, compare, switch style
   8 next    how you changed (blurred under First Class or open), Wren's prompt, write
 */

struct KWrappedCardsA: View {
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

  private func pill(_ text: String) -> some View {
    Text(text)
      .kw(.label, 10)
      .foregroundStyle(KW.ink)
      .lineLimit(1)
      .minimumScaleFactor(0.7)
      .padding(.horizontal, 10)
      .padding(.vertical, 6)
      .background(Capsule().fill(Color.white))
      .overlay(Capsule().strokeBorder(KW.ink, lineWidth: 2))
  }

  private func pic(_ key: String, width: CGFloat, height: CGFloat? = nil) -> some View {
    Group {
      if let img = ctx.pics.image(key) { img.resizable().scaledToFit() } else { Color.clear }
    }
    .frame(width: width, height: height ?? width)
    .accessibilityHidden(true)
  }

  // MARK: 1 cover

  private var cover: some View {
    VStack(alignment: .leading, spacing: 0) {
      KWrappedFit {
        VStack(alignment: .leading, spacing: 0) {
          pill(ctx["coverEyebrow"])
          VStack(alignment: .leading, spacing: 8) {
            Text(ctx["typeLine"]).kw(.title, 18).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true)
            KWLabel(text: "— " + ctx["coverSign"], size: 9, color: KW.ink2)
          }
          .padding(14)
          .frame(width: 180, alignment: .leading)
          .background(RoundedRectangle(cornerRadius: 10).fill(Color.white))
          .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(KW.ink, lineWidth: 3))
          .background(RoundedRectangle(cornerRadius: 10).fill(KW.ink).offset(x: 5, y: 5))
          .rotationEffect(.degrees(-4))
          .padding(.top, 40)
          .modifier(ctx.drop(0.2))
          Spacer(minLength: 120)
          Text(ctx["typeIs"]).kw(.title, 20).foregroundStyle(Color.white).modifier(ctx.rise(0.4))
          KWHeroText(text: ctx["typeName"], size: 88, shadow: 6)
            .modifier(ctx.rise(0.5))
            .padding(.top, 4)
        }
      }
      KWLabel(text: ctx["readFrom"] + "  ·  " + ctx["tapToOpen"], size: 10, color: .white.opacity(0.9))
        .padding(.top, 12)
    }
    .overlay(alignment: .topTrailing) {
      pic("stamp", width: 190, height: 228)
        .kwInk(3, shadow: 6)
        .rotationEffect(.degrees(6))
        .offset(x: 70, y: 26)
        .modifier(ctx.drop(0.05, from: -80, turn: 14))
    }
  }

  // MARK: 2 far

  private var far: some View {
    KWrappedFit {
      VStack(alignment: .leading, spacing: 0) {
        pill(ctx.c["eyebrow.far"])
        Text(ctx["farLede"]).kw(.title, 28).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true).padding(.trailing, 100).padding(.top, 18).modifier(ctx.rise(0))
        KWHeroText(text: ctx["farBig"], size: 210, outline: 6, shadow: 8)
          .modifier(ctx.slap(0.2))
        Text(ctx["farUnit"]).kw(.hero, 46).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true).modifier(ctx.rise(0.35))
        VStack(alignment: .leading, spacing: 12) {
          KWSticker(text: ctx["backSticker"], fill: .white, size: 18).rotationEffect(.degrees(-3))
          if ctx.c["kindreds"] != "0" {
            KWSticker(text: ctx["kindredSticker"], fill: KW.pink, size: 18).rotationEffect(.degrees(2))
          }
        }
        .padding(.top, 22)
        .modifier(ctx.slap(0.6))
        Text(ctx["closer"]).kw(.body, 16).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true).padding(.top, 26).modifier(ctx.rise(0.9))
      }
    }
    .overlay(alignment: .topTrailing) {
      pic("fly", width: 150).rotationEffect(.degrees(-6)).offset(x: 44, y: 24).modifier(ctx.drop(0.4, from: -40, turn: 10))
    }
  }

  // MARK: 3 line

  private var line: some View {
    VStack(alignment: .leading, spacing: 0) {
      KWrappedFit {
        VStack(alignment: .leading, spacing: 0) {
          pill(ctx.c["eyebrow.line"])
          Text(ctx["lineTitle"]).kw(.hero, 50).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true).padding(.top, 14).modifier(ctx.rise(0))
          VStack(alignment: .leading, spacing: 14) {
            Text(ctx["line"]).kText(.content(25, italic: true, lineHeight: 1.3)).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true).minimumScaleFactor(0.6)
            KWLabel(text: ctx["lineSig"], size: 10, color: KW.ink2)
          }
          .padding(.horizontal, 18)
          .padding(.top, 26)
          .padding(.bottom, 22)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(
            RoundedRectangle(cornerRadius: 4).fill(Color.white)
              .overlay {
                VStack(spacing: 31) {
                  ForEach(0..<8, id: \.self) { _ in Rectangle().fill(KW.blue.opacity(0.18)).frame(height: 1) }
                }
                .padding(.top, 52)
                .frame(maxHeight: .infinity, alignment: .top)
              }
              .clipShape(RoundedRectangle(cornerRadius: 4))
          )
          .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(KW.ink, lineWidth: 3))
          .background(RoundedRectangle(cornerRadius: 4).fill(KW.ink).offset(x: 6, y: 6))
          .overlay(alignment: .top) {
            Rectangle().fill(KW.acid.opacity(0.9)).frame(width: 80, height: 22).rotationEffect(.degrees(-2)).offset(y: -11)
          }
          .overlay(alignment: .bottomTrailing) {
            KWSticker(text: ctx.c.s["lineSt1"] ?? "", fill: KW.butter, size: 15).rotationEffect(.degrees(-6)).offset(x: 8, y: 18).modifier(ctx.slap(0.9))
          }
          .rotationEffect(.degrees(-2))
          .padding(.top, 26)
          .modifier(ctx.drop(0.2))
          Text(ctx["lineOutOf"]).kw(.body, 14).foregroundStyle(KW.ink).multilineTextAlignment(.trailing).frame(maxWidth: .infinity, alignment: .trailing).padding(.leading, 96).padding(.top, 40).modifier(ctx.rise(0.7))
        }
      }
      Text(ctx["lineOnly"]).kw(.body, 12).foregroundStyle(KW.ink).frame(maxWidth: .infinity).multilineTextAlignment(.center)
    }
    .overlay(alignment: .bottomLeading) {
      // low in the corner, above the footer note and left of the "out of everything" line
      pic("standing", width: 104).offset(x: -34, y: -54).modifier(ctx.drop(0.6, from: 30, turn: 0))
    }
  }

  // MARK: 4 vibe

  private var vibe: some View {
    KWrappedFit {
      VStack(alignment: .leading, spacing: 0) {
        pill(ctx.c["eyebrow.vibe"])
        Text(ctx["vibeTitleA"]).kw(.hero, 64).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true).padding(.top, 14).modifier(ctx.rise(0))
        VStack(alignment: .leading, spacing: 18) {
          ForEach(Array(ctx.c.tags.enumerated()), id: \.element.id) { i, tag in
            let fills: [(Color, Color)] = [(KW.blue, .white), (KW.butter, KW.ink), (KW.pink, KW.ink)]
            let turns: [Double] = [-3, 2, -1.5]
            VStack(alignment: .leading, spacing: 4) {
              Text(tag.tag).kw(.heavy, 28).foregroundStyle(fills[i % 3].1).lineLimit(1).minimumScaleFactor(0.6)
              Text(tag.sub).kw(.label, 10).foregroundStyle(fills[i % 3].1).fixedSize(horizontal: false, vertical: true)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(RoundedRectangle(cornerRadius: 16).fill(fills[i % 3].0))
            .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(KW.ink, lineWidth: 3))
            .background(RoundedRectangle(cornerRadius: 16).fill(KW.ink).offset(x: 5, y: 5))
            .rotationEffect(.degrees(turns[i % 3]))
            .padding(.leading, CGFloat(i % 2) * 34)
            .modifier(ctx.slap(0.2 + Double(i) * 0.18))
            .accessibilityElement(children: .combine)
          }
        }
        .padding(.top, 24)
        Text(ctx["vibeRead"]).kw(.body, 16).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true).padding(.trailing, 120).padding(.top, 30).modifier(ctx.rise(0.8))
      }
    }
    .overlay(alignment: .bottomTrailing) {
      pic("delight", width: 140).offset(x: 30, y: 6).modifier(ctx.drop(0.9, from: 40, turn: 8))
    }
  }

  // MARK: 5 hour

  private var hour: some View {
    VStack(alignment: .leading, spacing: 0) {
      KWrappedFit {
        VStack(alignment: .leading, spacing: 0) {
          pill(ctx.c["eyebrow.hour"])
          Spacer(minLength: 200)
          Text(ctx["hourLede"]).kw(.title, 20).foregroundStyle(Color.white).modifier(ctx.rise(0.2))
          KWHeroText(text: ctx["hourFrom"] + " –\n" + ctx["hourTo"], size: 96, fill: KW.butter, shadow: 6, shadowColor: KW.blue, lineSpacing: -18)
            .modifier(ctx.slap(0.3))
          Text(ctx["hourLine"]).kw(.body, 18).foregroundStyle(Color.white).fixedSize(horizontal: false, vertical: true).padding(.top, 14).modifier(ctx.rise(0.5))
          KWHourStrip(buckets: ctx.c.buckets, start: ctx.c.hourStart, ink: .white, band: Color.white.opacity(0.14))
            .frame(height: 56)
            .padding(.top, 28)
            .modifier(ctx.rise(0.7))
        }
      }
      KWLabel(text: ctx["hourEach"], size: 10, color: .white.opacity(0.85)).padding(.top, 10)
    }
    .background(alignment: .topTrailing) {
      KWMoon(size: 200).offset(x: 70, y: 10).modifier(ctx.rise(0))
    }
    .overlay(alignment: .topLeading) {
      pic(ctx.c.hourNight ? "sleepy" : "standing", width: 150)
        .overlay(alignment: .topTrailing) {
          // the art's own grey z's vanish on the night: two white ones beside them
          if ctx.c.hourNight {
            Text("z z").font(.system(size: 20, weight: .black, design: .rounded)).foregroundStyle(Color.white).rotationEffect(.degrees(-12)).offset(x: 6, y: 8).accessibilityHidden(true)
          }
        }
        .offset(x: 10, y: 70).modifier(ctx.drop(0.4, from: -20, turn: 0))
    }
  }

  // MARK: 6 click

  private var click: some View {
    VStack(alignment: .leading, spacing: 0) {
      KWrappedFit {
        VStack(alignment: .leading, spacing: 0) {
          pill(ctx.c["eyebrow.click"])
          HStack(alignment: .top) {
            pic("pairStamp", width: 150, height: 180).kwInk(3, shadow: 6).rotationEffect(.degrees(-6)).modifier(ctx.drop(0.1))
            Spacer(minLength: 8)
            VStack(alignment: .leading, spacing: 4) {
              KWLabel(text: ctx["theirThing"], size: 9, color: KW.ink2)
              Text(ctx["pairLine"]).kw(.title, 16).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true)
            }
            .padding(12)
            .frame(width: 150, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: 10).fill(Color.white))
            .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(KW.ink, lineWidth: 3))
            .background(RoundedRectangle(cornerRadius: 10).fill(KW.ink).offset(x: 5, y: 5))
            .rotationEffect(.degrees(4))
            .padding(.top, 40)
            .modifier(ctx.drop(0.3))
          }
          .padding(.top, 20)
          Text(ctx["pairName"]).kw(.hero, 72).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true).minimumScaleFactor(0.5).padding(.top, 24).modifier(ctx.rise(0.4))
          Text(ctx["why"]).kw(.body, 17).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true).padding(.top, 12).modifier(ctx.rise(0.55))
        }
      }
      KWKey(title: ctx["readTheirs"], kind: .ink) { ctx.actions.onReadTheirs() }.modifier(ctx.rise(0.7))
    }
  }

  // MARK: 7 share

  private var share: some View {
    VStack(alignment: .leading, spacing: 0) {
      pill(ctx.c["eyebrow.share"])
      KWSharePreview(ctx: ctx)
        .rotationEffect(.degrees(2))
        .modifier(ctx.drop(0.1))
        .padding(.vertical, 14)
      VStack(spacing: 10) {
        KWKey(title: ctx.c.busy ? "…" : ctx["shareStory"], kind: .ink) { ctx.share() }
        KWKey(title: ctx["shareCompare"], kind: .white) { ctx.actions.onCompare() }
        KWKey(title: "↺  " + ctx["switchStyle"], kind: .white, small: true) { ctx.actions.onSwitchStyle() }
      }
      .modifier(ctx.rise(0.4))
    }
  }

  // MARK: 8 next

  private var next: some View {
    VStack(alignment: .leading, spacing: 0) {
      KWrappedFit {
        VStack(alignment: .leading, spacing: 0) {
          pill(ctx.c["eyebrow.next"])
          changes.padding(.top, 20).modifier(ctx.drop(0.1))
          KWPromptCard(ctx: ctx).padding(.top, 74).modifier(ctx.drop(0.35))
        }
      }
      KWKey(title: ctx["write"], kind: .ink) { ctx.actions.onWrite() }.modifier(ctx.rise(0.6)).padding(.top, 12)
      KWLabel(text: ctx["nextReport"], size: 10).frame(maxWidth: .infinity).padding(.top, 14)
    }
  }

  private var changes: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text([ctx["changedTitle"], ctx["sinceLabel"]].filter { !$0.isEmpty }.joined(separator: " · ")).kw(.title, 20).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true)
      if ctx.c.changes.isEmpty {
        Text(ctx["firstNote"]).kw(.body, 15).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true)
      } else {
        VStack(alignment: .leading, spacing: 4) {
          ForEach(Array(ctx.c.changes.enumerated()), id: \.offset) { _, line in
            Text("· " + line).kw(.body, 15).foregroundStyle(KW.ink).fixedSize(horizontal: false, vertical: true)
          }
        }
        .blur(radius: ctx.c.locked ? 5 : 0)
        .accessibilityHidden(ctx.c.locked)
        if ctx.c.locked {
          HStack(spacing: 10) {
            Image(systemName: "lock.fill").font(.system(size: 15, weight: .bold)).foregroundStyle(KW.ink)
              .frame(width: 44, height: 44)
              .background(RoundedRectangle(cornerRadius: 12).fill(Color.white))
              .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(KW.ink, lineWidth: 2))
              .accessibilityHidden(true)
            KWKey(title: ctx["unlock"], kind: .acid, small: true) { ctx.actions.onUnlock() }
          }
          .padding(.top, 6)
        }
      }
    }
    .padding(16)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 16).fill(Color.white))
    .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(KW.ink, lineWidth: 3))
    .background(RoundedRectangle(cornerRadius: 16).fill(KW.ink).offset(x: 6, y: 6))
    .overlay(alignment: .bottomTrailing) {
      pic("curious", width: 96).offset(x: 10, y: 70)
    }
  }
}
