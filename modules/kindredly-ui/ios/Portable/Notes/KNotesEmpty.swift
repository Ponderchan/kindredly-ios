// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 NOTES WITH NOTHING IN IT YET — design 1b's one warm, playful moment, redrawn in SwiftUI with every
 word it said: a taped note tilted −1° (the tape at −5°) with the title in the serif (Newsreader 27
 at 1.26, 10a's serif rather than the old Fraunces) and the line under it, a NEW sticker at +6°,
 and two 120-tall keys — words, or a voice (the photo way in is the roll, from the tab's +).

 The page, the note's face, its outline and its words are the theme's. The tape, the sticker and
 the two keys are objects with colours of their own, the same in every theme (TS hands them over:
 KNotesEmptyPalette), so the glyphs and words on them keep a fixed dark ink (KBrand.inkOnBrand):
 the theme's ink is light in Midnight and would vanish on the pale keys.
 */

/// The empty note's fixed colours (from TS: the note keys' P.keyText / P.keyVoice, the tape, the sticker).
public struct KNotesEmptyPalette: Equatable, Sendable {
  public let keyText: Color
  public let keyVoice: Color
  public let tape: Color
  public let sticker: Color

  public init(keyText: Color, keyVoice: Color, tape: Color, sticker: Color) {
    self.keyText = keyText
    self.keyVoice = keyVoice
    self.tape = tape
    self.sticker = sticker
  }
}

struct KNotesEmpty: View {
  static let title = KTextStyle.letter(27, lineHeight: 34.0 / 27)
  static let body = KTextStyle.system(14.5, lineHeight: 22.0 / 14.5)
  static let sticker = KTextStyle.mono(11, .semibold, tracking: 0.09)
  static let key = KTextStyle.mono(10, .semibold, tracking: 0.12)

  let theme: KTheme
  let strings: KNotesStrings
  let palette: KNotesEmptyPalette
  let actions: KNotesActions

  var body: some View {
    VStack(spacing: 0) {
      note
        .padding(.bottom, 34)
      HStack(spacing: 2) {
        key(glyph: .pen, label: strings.textKeyUpper, a11y: strings.textKey, tint: palette.keyText) { actions.onCompose("text") }
        key(glyph: .noteVoice, label: strings.voiceKeyUpper, a11y: strings.voiceKey, tint: palette.keyVoice) { actions.onCompose("voice") }
      }
    }
    .padding(.horizontal, 26)
  }

  private var note: some View {
    VStack(spacing: 14) {
      Text(strings.emptyTitle)
        .kText(Self.title)
        .foregroundStyle(theme.ink)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
      Text(strings.emptyBody)
        .kText(Self.body)
        .foregroundStyle(theme.sub)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
    }
    .padding(.horizontal, 26)
    .padding(.vertical, 30)
    .frame(maxWidth: .infinity)
    .background(theme.sf)
    .overlay(Rectangle().strokeBorder(theme.ln, lineWidth: 1))
    .rotationEffect(.degrees(-1))
    .overlay(alignment: .topLeading) {
      palette.tape
        .opacity(0.85)
        .frame(width: 78, height: 22)
        .rotationEffect(.degrees(-5))
        .offset(x: 46, y: -11)
        .accessibilityHidden(true)
    }
    .overlay(alignment: .bottomTrailing) {
      Text(strings.newLabel)
        .kText(Self.sticker)
        .foregroundStyle(KBrand.inkOnBrand)
        .padding(.horizontal, 9)
        .padding(.vertical, 6)
        .background(palette.sticker)
        .rotationEffect(.degrees(6))
        .offset(x: -8, y: 14)
        .accessibilityHidden(true)
    }
    .accessibilityElement(children: .combine)
  }

  private func key(glyph: KLineGlyph, label: String, a11y: String, tint: Color, action: @escaping () -> Void) -> some View {
    SwiftUI.Button(action: action) {
      VStack(spacing: 10) {
        KLineIcon(glyph, size: 26, lineWidth: 1.6, color: KBrand.inkOnBrand)
        Text(label)
          .kText(Self.key)
          .foregroundStyle(KBrand.inkOnBrand)
          .lineLimit(2)
          .multilineTextAlignment(.center)
          .padding(.horizontal, 6)
      }
      .frame(maxWidth: .infinity)
      .frame(minHeight: 120)
      .background(tint)
      .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityLabel(a11y)
  }
}
