// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE 10a STICKER CAPSULES (tokens-10a.md §9): small rounded labels with a 2pt ln outline,
 corners of 20 (more than half their height, so they read as capsules) and padding 6 12 inside
 the outline. Some carry a hard shadow, some don't, exactly as the mock draws them. Every word
 on them is passed in already translated.
 */

/*
 THE TOPIC TAG (H:35, 42): the letter's topic, "#made my day". Mono 600 13 on a fill, a 2pt ln
 outline, corners of 20, padding 6 12, and a hard 3/3 shadow in ln (the mock has the shadow;
 the prompts, P:124, don't mention one; the mock wins). The mock fills it two ways: brand green
 with white text, or ind with the text in bg.
 */
public struct KTopicTag: View {
  /// the two fills the mock uses, or any other
  public enum Tone {
    /// #2E7D4F with white text, the same in every theme (H:35)
    case green
    /// the theme's ind with the text in bg (H:42)
    case indigo
    case custom(fill: Color, text: Color)
  }

  private let theme: KTheme
  private let text: String
  private let fill: Color
  private let textColor: Color

  public init(theme: KTheme, text: String, fill: Color, textColor: Color) {
    self.theme = theme
    self.text = text
    self.fill = fill
    self.textColor = textColor
  }

  public init(theme: KTheme, text: String, tone: Tone = .indigo) {
    let colors: (Color, Color)
    switch tone {
    case .green: colors = (KBrand.greenText, .white)
    case .indigo: colors = (theme.ind, theme.bg)
    case let .custom(fill, text): colors = (fill, text)
    }
    self.init(theme: theme, text: text, fill: colors.0, textColor: colors.1)
  }

  public var body: some View {
    Text(text)
      .kText(.monoTag)
      .foregroundStyle(textColor)
      .lineLimit(1)
      .fixedSize()
      // the padding, and the 2pt outline outside it
      .padding(.vertical, 6 + 2)
      .padding(.horizontal, 12 + 2)
      .background {
        KStickerBackground(
          shape: RoundedRectangle(cornerRadius: 20, style: .circular),
          fill: fill,
          stroke: theme.ln,
          lineWidth: 2,
          shadow: theme.ln,
          shadowOffset: 3
        )
      }
  }
}

/// The "auras close" mark: two rings of r 5.5 at x 7 and 13 in a 20 × 14 box (H:35's SVG),
/// scaled to the frame it gets. Stroke it 1.8.
struct KTwoRings: Shape {
  func path(in rect: CGRect) -> Path {
    let u = min(rect.width / 20, rect.height / 14)
    let x0 = rect.midX - 10 * u
    let y0 = rect.midY - 7 * u
    var p = Path()
    for cx in [7.0, 13.0] {
      p.addEllipse(in: CGRect(x: x0 + (cx - 5.5) * u, y: y0 + (7 - 5.5) * u, width: 11 * u, height: 11 * u))
    }
    return p
  }
}

/*
 "AURAS CLOSE" (H:35): the two-ring mark and the words, system 600 13, 6 apart, on the lime
 #D8F04A, a 2pt ln outline, corners of 20, padding 6 12, and no shadow.

 The text and the rings are #1E1B35 in EVERY theme. The mock sets no colour, so they inherit
 the theme's ink, which in Midnight is #E8E5F6 on lime, a contrast of 1.03: a mock bug, fixed
 the way the prompts mean it ("ink 字", P:126), with the light themes' ink.
 */
public struct KAurasClose: View {
  /// the dark ink of the light themes, kept on the lime whatever the theme
  private static let inkOnLime = KTheme.classic.ink

  private let theme: KTheme
  private let label: String

  public init(theme: KTheme, label: String) {
    self.theme = theme
    self.label = label
  }

  public var body: some View {
    HStack(spacing: 6) {
      KTwoRings()
        .stroke(Self.inkOnLime, lineWidth: 1.8)
        .frame(width: 20, height: 14)
        .accessibilityHidden(true)
      Text(label)
        .kText(.chip)
        .lineLimit(1)
        .fixedSize()
    }
    .foregroundStyle(Self.inkOnLime)
    .padding(.vertical, 6 + 2)
    .padding(.horizontal, 12 + 2)
    .background {
      KStickerBackground(
        shape: RoundedRectangle(cornerRadius: 20, style: .circular),
        fill: KBrand.lime,
        stroke: theme.ln,
        lineWidth: 2
      )
    }
    .accessibilityElement(children: .combine)
  }
}

/*
 THE TRANSLATE CAPSULE, as the mock draws it (H:42): sf, a 2pt ln outline, corners of 20,
 padding 6 12, and no shadow. Inside, 8 apart: the language pair in mono 600 10 at .1em in ind
 ("ES→EN"), then the words in system 600 13 in ink ("read in yours"). The prompts' version,
 a lav fill with "EN ← ES" turning to "ORIGINAL" (P:127), is the one the mock replaced; the
 caller still decides what code and words to show in each state.

 It is a button (it switches the letter between the original and the reader's language);
 pressed, it dips 1pt.
 */
public struct KTranslateCapsule: View {
  private let theme: KTheme
  private let code: String
  private let label: String
  private let action: () -> Void

  public init(theme: KTheme, code: String, label: String, action: @escaping () -> Void) {
    self.theme = theme
    self.code = code
    self.label = label
    self.action = action
  }

  public var body: some View {
    Button(action: action) {
      HStack(spacing: 8) {
        Text(code)
          .kText(.monoCode)
          .foregroundStyle(theme.ind)
        Text(label)
          .kText(.chip)
          .foregroundStyle(theme.ink)
      }
      .lineLimit(1)
      .fixedSize()
      .padding(.vertical, 6 + 2)
      .padding(.horizontal, 12 + 2)
    }
    .buttonStyle(KStickerButtonStyle(
      shape: RoundedRectangle(cornerRadius: 20, style: .circular),
      fill: theme.sf,
      stroke: theme.ln,
      lineWidth: 2
    ))
  }
}

/*
 THE ME CHIPS (H:73, 465, 467): the row of section chips at the top of Me. System 600 13,
 padding 8 12 inside a 2pt outline, corners of 20, 8 apart.

 - off: sf, ink text, ln outline, a hard 2/2 shadow in ln;
 - on: ink fill, sf text (the mock's; the prompts say bg, P:248), ln outline, a hard 3/3 shadow
   in ind, and the chip lifted up and left by 1pt. CSS lifts the shadow with it, so the shadow
   ends up where the off chip's was and only the chip rises off it;
 - the First Class chip, if the row has one (firstClassIndex), is gold in every theme: off is
   cream with gold text, a gold outline and a 2/2 gold shadow; on is wax gold with #1E1B35
   text, a gold outline and a 3/3 shadow in ln.

 A change of chip animates as the mock's transition does (.25s, cubic-bezier(.3,1.2,.5,1)).

 The chips sit in an HStack and take only the room they need. The mock's row scrolls sideways
 when it runs out of room (overflow-x:auto, padding 4 18 10); put this in a horizontal
 ScrollView with that padding, which also leaves the shadows their room.
 */
public struct KSegmentChips: View {
  private let theme: KTheme
  private let labels: [String]
  @Binding private var selection: Int
  private let firstClassIndex: Int?

  public init(theme: KTheme, labels: [String], selection: Binding<Int>, firstClassIndex: Int? = nil) {
    self.theme = theme
    self.labels = labels
    self._selection = selection
    self.firstClassIndex = firstClassIndex
  }

  public var body: some View {
    HStack(spacing: 8) {
      ForEach(labels.indices, id: \.self) { i in
        chip(i)
      }
    }
    .accessibilityElement(children: .contain)
  }

  private func chip(_ i: Int) -> some View {
    let on = i == selection
    let gold = i == firstClassIndex
    let fill: Color
    let text: Color
    let border: Color
    let shadow: Color
    if gold {
      fill = on ? KBrand.waxGold : KBrand.cream
      text = on ? KTheme.classic.ink : KBrand.goldText
      border = KBrand.waxGold
      shadow = on ? theme.ln : KBrand.waxGold
    } else {
      fill = on ? theme.ink : theme.sf
      text = on ? theme.sf : theme.ink
      border = theme.ln
      shadow = on ? theme.ind : theme.ln
    }
    return Button {
      withAnimation(KMotion.chip) { selection = i }
    } label: {
      Text(labels[i])
        .kText(.chip)
        .foregroundStyle(text)
        .lineLimit(1)
        .fixedSize()
        .padding(.vertical, 8 + 2)
        .padding(.horizontal, 12 + 2)
    }
    .buttonStyle(KStickerButtonStyle(
      shape: RoundedRectangle(cornerRadius: 20, style: .circular),
      fill: fill,
      stroke: border,
      lineWidth: 2,
      shadow: shadow,
      shadowOffset: on ? 3 : 2,
      lift: on ? 1 : 0
    ))
    .accessibilityAddTraits(on ? .isSelected : [])
  }
}
