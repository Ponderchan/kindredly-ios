// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE 10a TYPE. Three families, as the mock sets them (tokens-10a.md §4, mock H:12):
 - the system font (SF Pro) for titles, body and everything that is UI;
 - IBM Plex Mono, at 500 and 600 only, for the small labels. Embedded in the app by PostScript
   name as "IBMPlexMono-Medium" and "IBMPlexMono-SemiBold" (assets/fonts, app.json ios.fonts);
 - a serif for letters and the emotional lines. The mock sets EB Garamond; the owner's default
   is Newsreader, embedded as "Newsreader-Regular" and "Newsreader-Italic". CJK falls through
   to the system face, as it does on the React Native side.

 Everything scales with Dynamic Type, as the app's React Native text does (nothing in src
 turns allowFontScaling off). The serif and the mono come from Font.custom(_:size:relativeTo:).
 The system font has no relativeTo, so .kText scales its size with @ScaledMetric against the
 same text style. A surface of a fixed height (the tab bar) caps it with .dynamicTypeSize(...).

 Letter spacing and line height are CSS's, in the mock's own units:
 - tracking is in em, a fraction of the size (.14em at 10pt is 1.4pt). .tracking, like CSS
   letter-spacing, also leaves that room after the last character.
 - lineHeight is CSS line-height, a multiple of the size. SwiftUI only has lineSpacing, the
   room BETWEEN lines, so .kText adds what CSS adds over the face's natural line height
   between the lines, and half of it above and half below the text, where CSS puts it
   (half-leading). A one-line label then has the height of its CSS box too.
   The natural line heights, read from the fonts' hhea tables: Newsreader 1.0 (1470 + 530 of
   2000 units), IBM Plex Mono 1.3 (1025 + 275 of 1000), SF about 1.19 (UIFont reports 20.29
   at 17). No lineHeight means CSS "normal", which is the natural one.

 Use it as Text("YOU").kText(.monoSection). KType hands out bare Fonts for the places that take
 a Font and nothing else; those carry no tracking or line height.
 */

/// One way of setting text: a face, a size, a weight, and the mock's tracking and line height.
public struct KTextStyle: Equatable, Sendable {
  public enum Face: Equatable, Sendable {
    /// SF Pro, at the style's weight
    case system
    /// IBM Plex Mono 500
    case monoMedium
    /// IBM Plex Mono 600
    case monoSemiBold
    /// Newsreader, upright
    case serif
    /// Newsreader, italic
    case serifItalic
  }

  public let face: Face
  /// the size at the default Dynamic Type setting, in points (the mock's px)
  public let size: CGFloat
  /// only read for .system; the embedded faces each carry their own weight
  public let weight: Font.Weight
  /// CSS letter-spacing in em
  public let tracking: CGFloat
  /// CSS line-height as a multiple of the size; nil is "normal"
  public let lineHeight: CGFloat?

  public init(face: Face, size: CGFloat, weight: Font.Weight = .regular, tracking: CGFloat = 0, lineHeight: CGFloat? = nil) {
    self.face = face
    self.size = size
    self.weight = weight
    self.tracking = tracking
    self.lineHeight = lineHeight
  }

  /// The system font. Weights in the mock: 400, 500, 600 (and 700 on one glyph).
  public static func system(_ size: CGFloat, _ weight: Font.Weight = .regular, tracking: CGFloat = 0, lineHeight: CGFloat? = nil) -> KTextStyle {
    KTextStyle(face: .system, size: size, weight: weight, tracking: tracking, lineHeight: lineHeight)
  }

  /// IBM Plex Mono at 500 (.medium) or 600 (anything else), 8 to 14 in the mock.
  public static func mono(_ size: CGFloat, _ weight: Font.Weight = .semibold, tracking: CGFloat = 0) -> KTextStyle {
    KTextStyle(face: weight == .medium ? .monoMedium : .monoSemiBold, size: size, weight: weight, tracking: tracking)
  }

  /// The letter serif, Newsreader, upright or italic. It has one weight, 400.
  public static func letter(_ size: CGFloat, italic: Bool = false, lineHeight: CGFloat? = nil) -> KTextStyle {
    KTextStyle(face: italic ? .serifItalic : .serif, size: size, tracking: 0, lineHeight: lineHeight)
  }

  /// the Dynamic Type style this size scales with
  public var textStyle: Font.TextStyle { KType.textStyle(near: size) }

  /// the font at this style's own size, scaling with Dynamic Type for the embedded faces only
  public var font: Font { KType.font(face: face, size: size, weight: weight, relativeTo: textStyle) }
}

/// Font helpers and the facts about the faces.
public enum KType {
  /// the PostScript names of the embedded faces (assets/fonts, app.json ios.fonts)
  public static let monoMedium = "IBMPlexMono-Medium"
  public static let monoSemiBold = "IBMPlexMono-SemiBold"
  public static let serifRegular = "Newsreader-Regular"
  public static let serifItalic = "Newsreader-Italic"

  /// The system font. It does not scale by itself; .kText scales it.
  public static func system(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
    .system(size: size, weight: weight)
  }

  /// IBM Plex Mono at 500 (.medium) or 600, scaling with Dynamic Type.
  public static func mono(_ size: CGFloat, _ weight: Font.Weight = .semibold) -> Font {
    .custom(weight == .medium ? monoMedium : monoSemiBold, size: size, relativeTo: textStyle(near: size))
  }

  /// The letter serif, Newsreader, scaling with Dynamic Type.
  public static func letter(_ size: CGFloat, italic: Bool = false) -> Font {
    .custom(italic ? serifItalic : serifRegular, size: size, relativeTo: textStyle(near: size))
  }

  static func font(face: KTextStyle.Face, size: CGFloat, weight: Font.Weight, relativeTo style: Font.TextStyle) -> Font {
    switch face {
    case .system: return .system(size: size, weight: weight)
    case .monoMedium: return .custom(monoMedium, size: size, relativeTo: style)
    case .monoSemiBold: return .custom(monoSemiBold, size: size, relativeTo: style)
    case .serif: return .custom(serifRegular, size: size, relativeTo: style)
    case .serifItalic: return .custom(serifItalic, size: size, relativeTo: style)
    }
  }

  /// A face's natural line height as a multiple of its size (see the note at the top).
  public static func naturalLineHeight(_ face: KTextStyle.Face) -> CGFloat {
    switch face {
    case .system: return 1.19
    case .monoMedium, .monoSemiBold: return 1.3
    case .serif, .serifItalic: return 1.0
    }
  }

  /// The Dynamic Type style whose default size is nearest, so a size grows with its neighbours:
  /// caption2 11, caption 12, footnote 13, subheadline 15, callout 16, body 17, title3 20,
  /// title2 22, title 28, largeTitle 34. The mono labels under 11 scale with caption2.
  public static func textStyle(near size: CGFloat) -> Font.TextStyle {
    switch size {
    case ..<11.5: return .caption2
    case ..<12.5: return .caption
    case ..<13.5: return .footnote
    case ..<15.5: return .subheadline
    case ..<16.5: return .callout
    case ..<18.5: return .body
    case ..<21: return .title3
    case ..<25: return .title2
    case ..<31: return .title
    default: return .largeTitle
    }
  }
}

/*
 The roles the mock uses, named for where they appear. Each says where in the mock it comes from
 (H:line in .claude/mock/k10/Kindredly 10 Final.dc.html). A screen that needs a size this list
 lacks writes KTextStyle.system(…) / .mono(…) / .letter(…) inline, as the mock does.
 */
public extension KTextStyle {
  // ── system ──
  /// 500 11: the theme swatch name (H:99)
  static let swatchLabel = system(11, .medium)
  /// 400 12/1.4: a row's subline, the Match system subtitle (H:98, 99, 101)
  static let subtext = system(12, .regular, lineHeight: 1.4)
  /// 600 12: the Notes view label, Aura labels (H:50, 78)
  static let smallLabel = system(12, .semibold)
  /// 500 12: the First Class line on the stamps card (H:81)
  static let smallLine = system(12, .medium)
  /// 600 13: chips, capsules, small buttons, "auras close" (H:35, 42, 73, 75, 84, 98, 115)
  static let chip = system(13, .semibold)
  /// 400 13/1.45: small body copy, the Bio line (H:92)
  static let small = system(13, .regular, lineHeight: 1.45)
  /// 400 14: the Kindreds preview line (H:65)
  static let preview = system(14, .regular)
  /// 500 14: Edit-profile row values (H:92)
  static let rowValue = system(14, .medium)
  /// 600 14: buttons, "See your labels" (H:78)
  static let button = system(14, .semibold)
  /// 400 15: row labels, the write-back placeholder (H:92, 101, 115)
  static let rowLabel = system(15, .regular)
  /// 500 15: Kindreds filter chips (H:62)
  static let filterChip = system(15, .medium)
  /// 600 15: a pen pal's name in a list (H:65)
  static let name = system(15, .semibold)
  /// 600 16: the pen name in the Me nav bar (H:71)
  static let navTitle = system(16, .semibold)
  /// 400 17: the reply input and the compose body (H:124, 136)
  static let input = system(17, .regular)
  /// 600 17: avatar initials (H:65)
  static let initials = system(17, .semibold)
  /// 600 18: the profile name (H:72)
  static let profileName = system(18, .semibold)
  /// 400 18: the › chevron at the end of a row (H:92, 101)
  static let chevron = system(18, .regular)
  /// 600 20/1.2: the Aura card title (H:78)
  static let cardTitle = system(20, .semibold, lineHeight: 1.2)
  /// 600 22 at .04em: page titles, at rest (H:61, 71)
  static let pageTitle = system(22, .semibold, tracking: 0.04)
  /// 400 24: the × close (H:136)
  static let close = system(24, .regular)

  // ── IBM Plex Mono ──
  /// 600 8 .1em: stamp dates in the stamp grid (H:81)
  static let monoStamp = mono(8, .semibold, tracking: 0.1)
  /// 600 9 .08em: tab labels (H:119)
  static let monoTab = mono(9, .semibold, tracking: 0.08)
  /// 600 9 .1em: 1ST on the First Class cards (H:84, 98)
  static let monoTiny = mono(9, .semibold, tracking: 0.1)
  /// 600 9 .14em: the Courier card's YOU / SOMEWHERE (H:75)
  static let monoTinyWide = mono(9, .semibold, tracking: 0.14)
  /// 600 10 .14em: section and group headers, ink labels (H:75, 78, 81, 92, 99, 101)
  static let monoSection = mono(10, .semibold, tracking: 0.14)
  /// 600 10 .1em: the language code in the translate capsule, ES→EN (H:42)
  static let monoCode = mono(10, .semibold, tracking: 0.1)
  /// 500 10 .12em: counts and units, "9 MADE", JOINED (H:72, 75, 81, 113)
  static let monoMeta = mono(10, .medium, tracking: 0.12)
  /// 500 10 .14em: "FROM YOUR 121 LETTERS" on the Aura card, the reply hint (H:78, 125)
  static let monoMetaWide = mono(10, .medium, tracking: 0.14)
  /// 500 10 .06em: progress captions, the Orbit legend (H:62, 78)
  static let monoCaption = mono(10, .medium, tracking: 0.06)
  /// 500 11: times in a list (H:65)
  static let monoTime = mono(11, .medium)
  /// 600 11 .12em: SEND, the Notes date chip (H:55, 111, 124)
  static let monoSend = mono(11, .semibold, tracking: 0.12)
  /// 600 11 .1em: WRITE A LETTER and the composer labels (H:55, 132, 133)
  static let monoAction = mono(11, .semibold, tracking: 0.1)
  /// 600 11 .18em: TO A STRANGER (H:136)
  static let monoWide = mono(11, .semibold, tracking: 0.18)
  /// 500 12: Settings row values (H:101)
  static let monoValue = mono(12, .medium)
  /// 600 12 .08em: the letter's postmark, SEP.23 · NO.7273 (H:33, 40)
  static let monoPostmark = mono(12, .semibold, tracking: 0.08)
  /// 600 12 .1em: mono buttons, UPLOAD and STAMP CAM (H:81)
  static let monoButton = mono(12, .semibold, tracking: 0.1)
  /// 600 12 .14em: ↑ PASS and REPLY ↓ (H:37, 44)
  static let monoReply = mono(12, .semibold, tracking: 0.14)
  /// 600 12 .16em: EDIT PROFILE, SETTINGS, NEW (H:90, 97, 130)
  static let monoHeader = mono(12, .semibold, tracking: 0.16)
  /// 600 13: the topic tag, stat numbers (H:35, 42, 72)
  static let monoTag = mono(13, .semibold)
  /// 600 13 .14em: the calendar's month, OCTOBER 2026 (H:113)
  static let monoMonth = mono(13, .semibold, tracking: 0.14)
  /// 600 14: 1ST in the gold cell (H:81)
  static let monoNumber = mono(14, .semibold)

  // ── the letter serif (Newsreader where the mock sets EB Garamond) ──
  /// 400 30/1.3: a letter's body on the Today card (H:34)
  static let letterBody = letter(30, lineHeight: 1.3)
  /// 400 24/1.15: the First Class headline (H:84)
  static let letterHeadline = letter(24, lineHeight: 1.15)
  /// 400 19/1.2: the Settings banner (H:98)
  static let letterBanner = letter(19, lineHeight: 1.2)
  /// italic 15: Wren's line on the letter page (H:136)
  static let letterAside = letter(15, italic: true)
  /// italic 13: hints and the composer's sublines (H:91, 132, 133)
  static let letterHint = letter(13, italic: true)
  /// italic 12/1.4: the Courier card's note (H:75)
  static let letterNote = letter(12, italic: true, lineHeight: 1.4)
}

/// Sets a KTextStyle: the font, its tracking and its line height, all scaled with Dynamic Type.
struct KTextModifier: ViewModifier {
  let style: KTextStyle
  /// the style's size at the reader's Dynamic Type setting
  @ScaledMetric private var size: CGFloat

  init(style: KTextStyle) {
    self.style = style
    _size = ScaledMetric(wrappedValue: style.size, relativeTo: style.textStyle)
  }

  func body(content: Content) -> some View {
    // what CSS line-height adds over the natural line, in points at the scaled size
    let leading = style.lineHeight.map { max(0, ($0 - KType.naturalLineHeight(style.face)) * size) } ?? 0
    // the system font is sized here; the embedded faces scale themselves (relativeTo) by the same metric
    let font = style.face == .system
      ? Font.system(size: size, weight: style.weight)
      : style.font
    content
      .font(font)
      .tracking(style.tracking * size)
      .lineSpacing(leading)
      .padding(.vertical, leading / 2)
  }
}

public extension View {
  /// Sets text in one of the 10a styles: Text("YOU").kText(.monoSection).
  func kText(_ style: KTextStyle) -> some View {
    modifier(KTextModifier(style: style))
  }
}
