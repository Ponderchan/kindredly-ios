// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE 10a STICKER CAPSULES (tokens-10a.md §9): small rounded labels, corners of 20 (more than
 half their height, so they read as capsules) and padding 6 12 (plus the 2 the mock's outline
 took). Owner's rule B (2026-10-26): controls and chips are flat, so only the topic tag, which
 belongs to the letter, keeps the mock's ln outline and hard shadow (in the light themes; flat in
 Midnight, owner 2026-10-31). Every word on them is
 passed in already translated.
 */

/*
 THE TOPIC TAG (H:35, 42): the letter's topic, "#made my day". Mono 600 on a fill (the mock's
 13; KMonoSizes, owner question 2: 11), a 2pt ln outline, corners of 20, padding 6 12, and a
 hard 3/3 shadow in ln (the mock has the shadow; the prompts, P:124, don't mention one; the mock
 wins). The mock fills it two ways: brand green with white text, or ind with the text in bg.

 A letter's own topic takes its stamp's colour, and that is the CHANNEL recipe: the stamp's
 wash as the fill and its channel ink as the words (TS channelColors(stampHex, surfaceHex),
 worked out against the surface the tag sits on, so it holds on Midnight's soft tray too). Never
 the full stamp colour as the fill with the channel ink on it: on a dark stamp the words vanish.
 */
public struct KTopicTag: View {
  /// the fills a tag takes
  public enum Tone {
    /// #2E7D4F with white text, the same in every theme (H:35)
    case green
    /// the theme's ind with the text in bg (H:42)
    case indigo
    /// a stamp's channel colours: the wash as the fill, the channel ink as the words
    case channel(wash: Color, ink: Color)
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
    case .green: colors = (KBrand.greenText, KBrand.paperWhite)
    case .indigo: colors = (theme.ind, theme.bg)
    case let .channel(wash, ink): colors = (wash, ink)
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
        // Midnight: flat (owner, 2026-10-31: the pale outline and shadow looked wrong at night;
        // there ln is a light lilac, so the sticker read as a glowing cut-out). Same size either way.
        KStickerBackground(
          shape: RoundedRectangle(cornerRadius: 20, style: .circular),
          fill: fill,
          stroke: theme.isDark ? nil : theme.ln,
          lineWidth: 2,
          shadow: theme.isDark ? nil : theme.ln,
          shadowOffset: theme.isDark ? 0 : 3
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

/// One of the signal marks of SignalChip.tsx, drawn in its 16-unit box and fitted, centred, to
/// the frame's shorter side.
struct KSignalShape: Shape {
  let parts: [KLineGlyphTable.Part]

  func path(in rect: CGRect) -> Path {
    let s = min(rect.width, rect.height) / 16
    return KLineGlyphTable.path(parts)
      .applying(CGAffineTransform(a: s, b: 0, c: 0, d: s, tx: rect.midX - 8 * s, ty: rect.midY - 8 * s))
  }
}

/*
 "AURAS CLOSE" (H:35) and its family, the signal capsule: the mark and the words, system 600 13,
 6 apart, on the lime #D8F04A, a 2pt ln outline, corners of 20, padding 6 12, and no shadow.
 Every reason a letter shares something with you wears it (owner: one lime capsule, four
 kinds), each with its own mark in the 20 × 14 slot (Glyph):
 - rings: two rings, "auras close" (H:35);
 - clock: a clock face, the same hour (SignalChip.tsx);
 - stickers: two of the same sticker, theirs on the letter and yours on you (subject, label).

 The text and the mark are #1E1B35 in EVERY theme (KBrand.inkOnBrand). The mock sets no colour,
 so they inherit the theme's ink, which in Midnight is #E8E5F6 on lime, a contrast of 1.03: a
 mock bug, fixed the way the prompts mean it ("ink 字", P:126), with the light themes' ink.
 */
public struct KAurasClose: View {
  /// the marks a signal capsule carries
  public enum Glyph: String, Sendable {
    /// two rings: auras close
    case rings
    /// a clock face: the same hour
    case clock
    /// two of the same sticker: the same subject or label
    case stickers
  }

  /// the dark ink kept on the lime whatever the theme
  private static let inkOnLime = KBrand.inkOnBrand

  private let theme: KTheme
  private let label: String
  private let glyph: Glyph

  /// - Parameters:
  ///   - label: the words, already translated ("auras close", "Night owl, like you")
  ///   - glyph: the mark before them; the two rings by default
  public init(theme: KTheme, label: String, glyph: Glyph = .rings) {
    self.theme = theme
    self.label = label
    self.glyph = glyph
  }

  @ViewBuilder
  private var mark: some View {
    switch glyph {
    case .rings:
      KTwoRings().stroke(Self.inkOnLime, lineWidth: 1.8)
    case .clock:
      // SignalChip's clock: a ring of r6.4 and the hands, at its 1.8 of 16
      KSignalShape(parts: [.circle(8, 8, r: 6.4), .d("M8 4.4V8l2.6 1.6")])
        .stroke(Self.inkOnLime, style: StrokeStyle(lineWidth: 1.8 * 14 / 16, lineCap: .round, lineJoin: .round))
    case .stickers:
      // SignalChip's pair: one sticker outlined, the same one solid, overlapping
      ZStack {
        KSignalShape(parts: [.rect(1.2, 5, 8.6, 8.6, r: 2)])
          .stroke(Self.inkOnLime, lineWidth: 1.8 * 14 / 16)
        KSignalShape(parts: [.rect(6, 1.2, 8.6, 8.6, r: 2)])
          .fill(Self.inkOnLime)
      }
    }
  }

  public var body: some View {
    HStack(spacing: 6) {
      mark
        .frame(width: 20, height: 14)
        .accessibilityHidden(true)
      Text(label)
        .kText(.chip)
        .lineLimit(1)
        .fixedSize()
    }
    .foregroundStyle(Self.inkOnLime)
    // the padding, and the 2 the outline took: flat lime, no outline (owner's rule B, 2026-10-26)
    .padding(.vertical, 6 + 2)
    .padding(.horizontal, 12 + 2)
    .background(RoundedRectangle(cornerRadius: 20, style: .circular).fill(KBrand.lime))
    .accessibilityElement(children: .combine)
  }
}

/*
 THE TRANSLATE CAPSULE (H:42), flat (owner's rule B, 2026-10-26): a lav fill, no outline,
 corners of 20, padding 6 12 (and the 2 the mock's outline took), and no shadow. Inside, 8 apart: the language pair in mono 600 10 at .1em in ind
 ("ES→EN"), then the words in system 600 13 in ink ("read in yours"). The prompts' version,
 a lav fill with "EN ← ES" turning to "ORIGINAL" (P:127), is the one the mock replaced; the
 caller still decides what code and words to show in each state.

 It is a button (it switches the letter between the original and the reader's language);
 pressed, it dips 1pt. While a translation is on its way (enabled: false) it is drawn at .55
 and doesn't take taps; the caller shows its own word for that ("translating…"). VoiceOver
 reads the words as the label and, if given, accessibilityValue as the value (which side is
 showing).
 */
public struct KTranslateCapsule: View {
  private let theme: KTheme
  private let code: String
  private let label: String
  private let enabled: Bool
  private let accessibilityValue: String?
  private let action: () -> Void

  /// - Parameters:
  ///   - code: the language pair, e.g. "ES→EN"
  ///   - label: the words, e.g. "read in yours"
  ///   - enabled: false while a translation is on its way
  ///   - accessibilityValue: what VoiceOver says the state is, already translated; nil for none
  public init(theme: KTheme, code: String, label: String, enabled: Bool = true, accessibilityValue: String? = nil, action: @escaping () -> Void) {
    self.theme = theme
    self.code = code
    self.label = label
    self.enabled = enabled
    self.accessibilityValue = accessibilityValue
    self.action = action
  }

  public var body: some View {
    capsule
      .compositingGroup()
      .opacity(enabled ? 1 : 0.55)
      .disabled(!enabled)
      .accessibilityLabel(label)
      .accessibilityValue(accessibilityValue ?? "")
  }

  private var capsule: some View {
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
      fill: theme.lav
    ))
  }
}

/*
 THE ME CHIPS (H:73, 465, 467): the row of section chips at the top of Me. System 600 13,
 padding 8 12 inside a 2pt outline, corners of 20, 8 apart.

 Flat (owner's rule B, 2026-10-26): no outline, no hard shadow, no lift.
 - off: a lav fill, ink text;
 - on: an ind fill, the text in bg;
 - the First Class chip, if the row has one (firstClassIndex), is gold in every theme: off is
   cream with gold text; on is wax gold with #1E1B35 text.

 A change of chip animates as the mock's transition does (.25s, cubic-bezier(.3,1.2,.5,1)).

 The chips sit in an HStack and take only the room they need. The mock's row scrolls sideways
 when it runs out of room (overflow-x:auto, padding 4 18 10); put this in a horizontal
 ScrollView with that padding, which also leaves the shadows their room. `tight` (padding 8 10,
 6 apart) is the step before scrolling, for a language whose four words are wider than the
 phone (Italian "Messaggera · Aura · Francobolli · Prima classe"): KMeChipsRow tries the row at
 its own size, then tight, and only then lets it scroll.
 */
public struct KSegmentChips: View {
  private let theme: KTheme
  private let labels: [String]
  @Binding private var selection: Int
  private let firstClassIndex: Int?
  private let tight: Bool
  /// share the row's width out evenly (Me's header: the chips line up with the stat buttons above)
  private let stretch: Bool

  public init(theme: KTheme, labels: [String], selection: Binding<Int>, firstClassIndex: Int? = nil, tight: Bool = false, stretch: Bool = false) {
    self.theme = theme
    self.labels = labels
    self._selection = selection
    self.firstClassIndex = firstClassIndex
    self.tight = tight
    self.stretch = stretch
  }

  public var body: some View {
    HStack(spacing: tight ? 6 : 8) {
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
    if gold {
      fill = on ? KBrand.waxGold : KBrand.cream
      text = on ? KTheme.classic.ink : KBrand.goldText
    } else {
      fill = on ? theme.ind : theme.lav
      text = on ? theme.bg : theme.ink
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
        .padding(.horizontal, tight ? 8 + 2 : 12 + 2)
        .frame(maxWidth: stretch ? .infinity : nil)
    }
    .buttonStyle(KStickerButtonStyle(shape: RoundedRectangle(cornerRadius: 20, style: .circular), fill: fill))
    .accessibilityAddTraits(on ? .isSelected : [])
  }
}
