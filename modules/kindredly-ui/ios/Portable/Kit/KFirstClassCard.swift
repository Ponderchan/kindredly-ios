// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE FIRST CLASS CARD, cream paper with a stamp, in its two sizes. Brand colours, the same in
 every theme (a brand object, like the courier's green): cream, the cream's border, wax gold and
 its darker text, and the dark ink and sub drawn on cream (KBrand.inkOnBrand, subOnCream).

 .card (H:84), the Me tab's FIRST CLASS segment: corners of 24, a 2pt cream border, padding
 18 18 16 (the border outside it), 14 between the words and the stamp. The words, 8 apart: the
 eyebrow (an 8pt wax-gold dot and FIRST CLASS in mono 600 10 at .16em in gold), the headline in
 the letter serif 24/1.15 in ink, the list of what it brings in system 13/1.5 in sub, and the
 call to action as an ink pill (system 600 13 in white, padding 10 14, corners of 14), 4 lower.
 The stamp: 78 × 96, white, corners of 8, a 2pt dotted wax-gold edge, turned 4°, the bird 43
 across over 1ST in mono 600 9 at .1em in gold.

 .banner (H:98), the top of Settings: corners of 18, a 1.5 cream border, padding 14 14 14 16,
 12 between, the words 5 apart: the eyebrow with a 7pt dot, the headline 19/1.2, the list in
 system 12/1.4, and the call to action as a gold link (system 600 13), 2 lower. The stamp 56 × 70,
 the bird 31 across.

 The whole card is one button (onPress) and one VoiceOver element. Every word is passed in,
 the owner's copy, already translated; the bird is a picture (the courier's live snapshot in
 the reader's own coat, KImageRef), and nil leaves the stamp's face white.
 */
public struct KFirstClassCard: View {
  /// the two sizes the card comes in
  public enum Variant: Sendable {
    /// the Me tab's FIRST CLASS segment (H:84)
    case card
    /// the top of Settings (H:98)
    case banner
  }

  private let variant: Variant
  private let eyebrow: String
  private let headline: String
  private let sub: String
  private let cta: String
  private let stampLabel: String
  private let bird: KImageRef?
  private let onPress: () -> Void

  /// - Parameters:
  ///   - variant: .card (Me) or .banner (Settings)
  ///   - eyebrow: FIRST CLASS
  ///   - headline: the owner's line, in the letter serif
  ///   - sub: what it brings (line breaks allowed)
  ///   - cta: the call to action, e.g. "See First Class →"
  ///   - stampLabel: the word on the stamp, 1ST
  ///   - bird: the courier's snapshot for the stamp, or nil
  ///   - onPress: the card was tapped
  public init(variant: Variant, eyebrow: String, headline: String, sub: String, cta: String, stampLabel: String, bird: KImageRef?, onPress: @escaping () -> Void) {
    self.variant = variant
    self.eyebrow = eyebrow
    self.headline = headline
    self.sub = sub
    self.cta = cta
    self.stampLabel = stampLabel
    self.bird = bird
    self.onPress = onPress
  }

  private var isCard: Bool { variant == .card }

  public var body: some View {
    let border: CGFloat = isCard ? 2 : 1.5
    let shape = RoundedRectangle(cornerRadius: isCard ? 24 : 18, style: .circular)
    SwiftUI.Button(action: onPress) {
      HStack(alignment: isCard ? .top : .center, spacing: isCard ? 14 : 12) {
        words
        stamp
      }
      // the padding, and the border outside it (content-box, as the mock's card has none set)
      .padding(.top, (isCard ? 18 : 14) + border)
      .padding(.bottom, (isCard ? 16 : 14) + border)
      .padding(.leading, (isCard ? 18 : 16) + border)
      .padding(.trailing, (isCard ? 18 : 14) + border)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background {
        KStickerBackground(shape: shape, fill: KBrand.cream, stroke: KBrand.creamBorder, lineWidth: border)
      }
      .contentShape(shape)
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityElement(children: .combine)
    .accessibilityAddTraits(.isButton)
  }

  private var words: some View {
    VStack(alignment: .leading, spacing: isCard ? 8 : 5) {
      HStack(spacing: 8) {
        Circle()
          .fill(KBrand.waxGold)
          .frame(width: isCard ? 8 : 7, height: isCard ? 8 : 7)
          .accessibilityHidden(true)
        Text(eyebrow)
          .textCase(.uppercase)
          .kText(.monoEyebrow)
          .foregroundStyle(KBrand.goldText)
          .lineLimit(1)
      }
      Text(headline)
        .kText(isCard ? .letterHeadline : .letterBanner)
        .foregroundStyle(KBrand.inkOnBrand)
        .fixedSize(horizontal: false, vertical: true)
      Text(sub)
        .kText(isCard ? .smallBody : .subtext)
        .foregroundStyle(KBrand.subOnCream)
        .fixedSize(horizontal: false, vertical: true)
      if isCard {
        Text(cta)
          .kText(.chip)
          .foregroundStyle(KBrand.paperWhite)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
          .padding(.vertical, 10)
          .padding(.horizontal, 14)
          .background(RoundedRectangle(cornerRadius: 14, style: .circular).fill(KBrand.inkOnBrand))
          .padding(.top, 4)
      } else {
        Text(cta)
          .kText(.chip)
          .foregroundStyle(KBrand.goldText)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
          .padding(.top, 2)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  private var stamp: some View {
    let size = isCard ? CGSize(width: 78, height: 96) : CGSize(width: 56, height: 70)
    let birdSide: CGFloat = isCard ? 43 : 31
    let shape = RoundedRectangle(cornerRadius: 8, style: .circular)
    return VStack(spacing: 4) {
      KImage(bird, size: CGSize(width: birdSide, height: birdSide), contentMode: .fit, placeholder: .clear)
      Text(stampLabel)
        .kText(.monoTiny)
        .foregroundStyle(KBrand.goldText)
        .lineLimit(1)
        .fixedSize()
    }
    .frame(width: size.width, height: size.height)
    .background(shape.fill(KBrand.paperWhite))
    // CSS's 2px dotted: round dots 2 across, 4 apart
    .overlay(shape.strokeBorder(KBrand.waxGold, style: StrokeStyle(lineWidth: 2, lineCap: .round, dash: [0.001, 4])))
    .rotationEffect(.degrees(4))
    .accessibilityHidden(true)
  }
}
