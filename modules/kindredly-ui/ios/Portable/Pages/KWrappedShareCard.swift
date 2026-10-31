// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE SHARE PICTURE (card 7), 360×640 points = 1080×1920 at 3×: the reader's type, its stamp,
 the three #tags and kindredly.io/aura — the way back for whoever sees it. Never the line from
 card 3, never a count of letters, never a name (it has no field for any of them).

 B (the verdict): the story is itself a perforated stamp on the orange ground. Top left the
 "kindredly" wordmark, the issue at the right; the stamp art and a postmark; "i'm" and the type
 name, the largest thing on the card; the tags; the acid band "what kind of letter-writer are
 you?" over kindredly.io/aura, big enough to read in a story.
 A: the blue poster on the acid ground, wordmark and "my letter-writer type", the stamp, the type
 name huge, the tags, and the band with "what's yours?" and the URL — big now, not A's tiny mono.

 Fixed type size (the renderer sets .large) and the light scheme: a picture, not a page.
 */

struct KWrappedShareCard: View {
  let c: KWrappedContent
  let pics: KWPics

  var body: some View {
    switch c.template {
    case .a: posterA
    case .b: stampB
    }
  }

  private func s(_ k: String) -> String { c[k] }

  private var stampArt: some View {
    Group {
      if let img = pics.image("stamp") { img.resizable().scaledToFit() } else { RoundedRectangle(cornerRadius: 6).fill(Color.white) }
    }
  }

  private var wordmark: some View {
    Text("kindredly")
      .font(.system(size: 24, weight: .black))
      .tracking(-0.8)
  }

  private func tags(size: CGFloat) -> some View {
    let fills = [KW.acid, KW.pink, KW.butter]
    let turns: [Double] = [-6, 5, -2]
    return KMeFlowLayout(spacing: 8, lineSpacing: 10) {
      ForEach(Array(c.tags.enumerated()), id: \.element.id) { i, t in
        KWSticker(text: t.tag, fill: fills[i % 3], size: size)
          .rotationEffect(.degrees(turns[i % 3]))
      }
    }
  }

  // MARK: B

  private var stampB: some View {
    ZStack {
      KW.orange
      VStack(spacing: 0) {
        HStack(alignment: .firstTextBaseline) {
          wordmark
          Spacer()
          Text(s("shareIssue").uppercased()).font(.system(size: 11, weight: .heavy, design: .monospaced)).tracking(1.2)
        }
        .foregroundStyle(Color.white)
        .padding(.horizontal, 18)
        .padding(.top, 16)
        ZStack(alignment: .topLeading) {
          stampArt
            .frame(width: 150, height: 180)
            .kwInk(2.5, shadow: 5)
            .rotationEffect(.degrees(-7))
            .offset(x: 30, y: 6)
          KWPostmark(top: s("shareIssue").uppercased(), bottom: "WREN POST", color: .white, size: 92)
            .rotationEffect(.degrees(-12))
            .offset(x: 160, y: 120)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .frame(height: 200)
        .padding(.top, 6)
        VStack(alignment: .leading, spacing: 2) {
          Text(s("shareIm")).font(.system(size: 22, weight: .black)).foregroundStyle(Color.white)
          KWShareName(text: s("typeName"), size: 56)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 18)
        .padding(.top, 8)
        tags(size: 15)
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(.horizontal, 16)
          .padding(.top, 14)
        Spacer(minLength: 8)
        VStack(alignment: .leading, spacing: 4) {
          Text(s("shareAsk")).font(.system(size: 14, weight: .bold)).lineLimit(2).minimumScaleFactor(0.7)
          Text(s("shareUrl")).font(.system(size: 32, weight: .black).width(.condensed)).tracking(-0.5).lineLimit(1).minimumScaleFactor(0.6)
        }
        .foregroundStyle(KW.ink)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(KW.acid)
        .overlay(alignment: .top) { Rectangle().fill(KW.ink).frame(height: 3) }
      }
      .background(KW.blue)
      .clipShape(RoundedRectangle(cornerRadius: 4))
      .padding(14)
      .background(KWPerforated(bite: 7, pitch: 21).fill(Color.white, style: FillStyle(eoFill: true)))
      .kwInk(3, shadow: 7)
      .padding(.horizontal, 22)
      .padding(.vertical, 34)
    }
  }

  // MARK: A

  private var posterA: some View {
    ZStack {
      KW.acid
      VStack(alignment: .leading, spacing: 0) {
        HStack(alignment: .firstTextBaseline) {
          wordmark
          Spacer()
          Text(s("shareTypeLabel").uppercased()).font(.system(size: 10, weight: .heavy, design: .monospaced)).tracking(1.2).lineLimit(1).minimumScaleFactor(0.6)
        }
        .foregroundStyle(Color.white)
        stampArt
          .frame(width: 140, height: 168)
          .kwInk(2.5, shadow: 5)
          .rotationEffect(.degrees(4))
          .frame(maxWidth: .infinity)
          .padding(.top, 14)
        KWShareName(text: s("typeName"), size: 62)
          .padding(.top, 16)
        tags(size: 14)
          .padding(.top, 14)
        Spacer(minLength: 8)
        VStack(alignment: .center, spacing: 2) {
          Text(s("shareWhatsYours")).font(.system(size: 24, weight: .black)).tracking(-0.6)
          Text(s("shareUrl")).font(.system(size: 30, weight: .black).width(.condensed)).lineLimit(1).minimumScaleFactor(0.6)
        }
        .foregroundStyle(KW.ink)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(RoundedRectangle(cornerRadius: 14).fill(KW.acid))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(KW.ink, lineWidth: 3))
      }
      .padding(18)
      .background(RoundedRectangle(cornerRadius: 22).fill(KW.blue))
      .overlay(RoundedRectangle(cornerRadius: 22).strokeBorder(KW.ink, lineWidth: 3.5))
      .background(RoundedRectangle(cornerRadius: 22).fill(KW.ink).offset(x: 8, y: 8))
      .padding(.horizontal, 24)
      .padding(.vertical, 40)
    }
  }
}

/// The type name on the share picture: the largest words on it, white condensed black in an ink
/// outline, at a size that fits three lines at most.
struct KWShareName: View {
  let text: String
  let size: CGFloat

  var body: some View {
    Text(text)
      .font(.system(size: size, weight: .black).width(.condensed))
      .tracking(-size * 0.02)
      .lineSpacing(-size * 0.12)
      .foregroundStyle(Color.white)
      .lineLimit(3)
      .minimumScaleFactor(0.5)
      .fixedSize(horizontal: false, vertical: true)
      .kwInk(3, shadow: 4)
  }
}
