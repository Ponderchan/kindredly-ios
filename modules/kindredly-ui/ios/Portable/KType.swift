// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE TYPE (owner, 2026-10-20). Four faces, and only these:
 - the system font (SF Pro) for everything that is UI: titles, buttons, descriptions, hints,
   empty states, headlines, names, whole sentences of UI copy;
 - SF Mono, the system's monospaced design, for the small labels (dates, counts, postmarks,
   eyebrows, section heads, badges) and the send key, at the 10a mono sizes and weights
   (500 and 600). It replaced IBM Plex Mono: the face is .system(size:weight:design: .monospaced),
   scaled by .kText like the system font. the Plex PostScript
   names, are left for a later step to remove; nothing draws them;
 - the reader's LETTER font (Settings: Newsreader, the default; System; EB Garamond; SF Mono)
   for CONTENT: letters, replies, notes, translations, quotes, the answers in a fold, Wren's
   spoken lines everywhere, and every field where someone writes (a kindred room's bubbles and
   its field are the exception: System, owner 2026-10-21). Content styles
   are .content(…) (and .letterRead(…), the older name for a letter being read); they follow
   the environment's KLetterFace. CJK falls through to the system face, as it does on the React
   Native side. See LETTER FACE at the end of the file.
 .letter(…) and the letter* roles are the old fixed Newsreader serif, kept only so their call
 sites compile while the screens move off them: UI ones to .system, content ones to .content.
 Fraunces and Inter are not used.

 Everything scales with Dynamic Type, as the app's React Native text does (nothing in src
 turns allowFontScaling off). The embedded serifs (Newsreader, Garamond) come from
 Font.custom(_:size:relativeTo:). The system faces (SF Pro, SF Mono) have no
 relativeTo, so .kText scales their size with @ScaledMetric against the same text style. A surface of a fixed height (the tab bar) caps it with .dynamicTypeSize(...).

 Letter spacing and line height are CSS's, in the mock's own units:
 - tracking is in em, a fraction of the size (.14em at 10pt is 1.4pt). .tracking, like CSS
   letter-spacing, also leaves that room after the last character.
 - lineHeight is CSS line-height, a multiple of the size. SwiftUI only has lineSpacing, the
   room BETWEEN lines, so .kText adds what CSS adds over the face's natural line height
   between the lines, and half of it above and half below the text, where CSS puts it
   (half-leading). A one-line label then has the height of its CSS box too.
   The natural line heights, read from the fonts' hhea tables: Newsreader 1.0 (1470 + 530 of
   2000 units), SF about 1.19 (UIFont reports 20.29 at 17), SF Mono on SF's metrics (1.19),
   System (SF Pro) 1.19 (CoreText: ascent .952 + descent .241 of the size, the same at 13, 17 and 30,
   italic included), EB Garamond 1.305. No lineHeight means CSS "normal", the natural one.

 Use it as Text("YOU").kText(.monoSection), Text(words).kText(.content(16, lineHeight: 1.44)).
 KType hands out bare Fonts for the places that take a Font and nothing else; those carry no
 tracking or line height, and the system faces among them don't scale (.kText scales them).

 Mono sizes: labels are 9, 10 or 11 (P:58). Where the mock still sets 12, 13 or 14, the role is
 sized by KMonoSizes, the one table for owner question 2, so the answer is a one-line change.
 */

/// One way of setting text: a face, a size, a weight, and the mock's tracking and line height.
public struct KTextStyle: Equatable, Sendable {
  public enum Face: Equatable, Sendable {
    /// SF Pro, at the style's weight
    case system
    /// SF Mono 500 (the system monospaced design; the name is from IBM Plex Mono's day)
    case monoMedium
    /// SF Mono 600
    case monoSemiBold
    /// the content face, upright: the reader's Letter font under .kText when the style follows
    /// it (followsLetterFont, every .content style), Newsreader otherwise
    case serif
    /// the content face, italic: as .serif, slanted where the face has a true italic (Newsreader,
    /// System); Garamond and SF Mono have none and are drawn upright (KLetterFace.hasItalic)
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
  /// A content style (.content, .letterRead): .kText draws it in the reader's Letter font (the
  /// environment's KLetterFace). False for every other style, so the Letter font set at a
  /// screen's root reaches only content.
  public let followsLetterFont: Bool

  public init(face: Face, size: CGFloat, weight: Font.Weight = .regular, tracking: CGFloat = 0, lineHeight: CGFloat? = nil, followsLetterFont: Bool = false) {
    self.face = face
    self.size = size
    self.weight = weight
    self.tracking = tracking
    self.lineHeight = lineHeight
    self.followsLetterFont = followsLetterFont && (face == .serif || face == .serifItalic)
  }

  /// the Letter face this style is drawn in when the environment carries `environment`:
  /// that face if the style follows the Letter font, Newsreader otherwise
  public func letterFace(in environment: KLetterFace) -> KLetterFace {
    followsLetterFont ? environment : .newsreader
  }

  /// The system font. Weights in the mock: 400, 500, 600 (and 700 on one glyph).
  public static func system(_ size: CGFloat, _ weight: Font.Weight = .regular, tracking: CGFloat = 0, lineHeight: CGFloat? = nil) -> KTextStyle {
    KTextStyle(face: .system, size: size, weight: weight, tracking: tracking, lineHeight: lineHeight)
  }

  /// SF Mono at 500 (.medium) or 600 (anything else), for labels. Labels are 9, 10 or 11 (P:58);
  /// a size the mock sets above 11 goes through KMonoSizes.
  public static func mono(_ size: CGFloat, _ weight: Font.Weight = .semibold, tracking: CGFloat = 0) -> KTextStyle {
    KTextStyle(face: weight == .medium ? .monoMedium : .monoSemiBold, size: size, weight: weight, tracking: tracking)
  }

  /// OLD: the fixed Newsreader serif, whatever the reader's Letter font. Kept so the call sites
  /// compile while they move: UI copy (hints, headlines, empty states) to .system(…), content
  /// (Wren's lines, quotes, previews) to .content(…). Don't add new uses.
  public static func letter(_ size: CGFloat, italic: Bool = false, lineHeight: CGFloat? = nil) -> KTextStyle {
    KTextStyle(face: italic ? .serifItalic : .serif, size: size, tracking: 0, lineHeight: lineHeight)
  }

  /// The content face for someone's letter being read, at `place`: the same as .content(…)
  /// while KLetterFontScope reaches every place (it does). Existing letter call sites keep it;
  /// new content uses .content(…).
  public static func letterRead(_ size: CGFloat, italic: Bool = false, lineHeight: CGFloat? = nil, place: KLetterPlace) -> KTextStyle {
    KTextStyle(face: italic ? .serifItalic : .serif, size: size, tracking: 0, lineHeight: lineHeight, followsLetterFont: KLetterFontScope.reaches(place))
  }

  /// CONTENT: words someone wrote or Wren says, always in the reader's Letter font (the
  /// environment's KLetterFace) under .kText, at its one weight, 400. Letters, replies, notes,
  /// translations, quotes, fold answers, This or That's question and choices, a wave's line,
  /// Wren's lines, my-letter previews, and the fields people write content in (KField style:,
  /// KComposerField content:). Not a kindred room's chat bubbles, their quotes, the translation
  /// under them or the room's field: those are System (owner, 2026-10-21). Two tiers by size:
  /// the long letter (19–30, with a lineHeight) and the short line (13–17). `italic` slants it
  /// where the face has a true italic (Newsreader, System) and leaves Garamond and SF Mono
  /// upright (KLetterFace.hasItalic). For a face that takes more room (SF Mono wider, Garamond
  /// taller) under a lineLimit or a fixed height, see KLetterFace.fitLines / fitSize.
  public static func content(_ size: CGFloat, italic: Bool = false, lineHeight: CGFloat? = nil) -> KTextStyle {
    KTextStyle(face: italic ? .serifItalic : .serif, size: size, tracking: 0, lineHeight: lineHeight, followsLetterFont: true)
  }

  /// the Dynamic Type style this size scales with
  public var textStyle: Font.TextStyle { KType.textStyle(near: size) }

  /// the font at this style's own size, scaling with Dynamic Type for the embedded faces only;
  /// a content style is Newsreader here (use font(letterFace:) for the reader's Letter font)
  public var font: Font { KType.font(face: face, size: size, weight: weight, relativeTo: textStyle) }

  /// The font at this style's own size, a content style in the given Letter face (an old
  /// .letter serif stays Newsreader). A bare Font, for the places that take nothing else: no
  /// tracking, no line height, and the system faces (System, SF Mono) don't scale with Dynamic
  /// Type here (.kText scales everything).
  public func font(letterFace: KLetterFace) -> Font {
    switch face {
    case .serif, .serifItalic:
      return KType.letterFont(self.letterFace(in: letterFace), italic: face == .serifItalic, size: size, scaledSize: size, relativeTo: textStyle)
    case .system, .monoMedium, .monoSemiBold:
      return font
    }
  }
}

/// Font helpers and the facts about the faces.
public enum KType {
  /// the PostScript names of the embedded faces (assets/fonts, app.json expo-font). Labels are
  /// SF Mono (the system's), so no mono face is embedded.
  public static let serifRegular = "Newsreader-Regular"
  public static let serifItalic = "Newsreader-Italic"
  /// EB Garamond (see KLetterFace.garamondReady). Only the Regular is embedded, so it has no
  /// italic: content italic in Garamond is drawn upright.
  public static let garamondRegular = "EBGaramond-Regular"

  /// The system font. It does not scale by itself; .kText scales it.
  public static func system(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
    .system(size: size, weight: weight)
  }

  /// SF Mono at 500 (.medium) or 600. It does not scale by itself; .kText scales it.
  public static func mono(_ size: CGFloat, _ weight: Font.Weight = .semibold) -> Font {
    .system(size: size, weight: weight == .medium ? .medium : .semibold, design: .monospaced)
  }

  /// The letter serif, in Newsreader unless a face is given. Newsreader and Garamond scale with
  /// Dynamic Type; System (SF Pro) scales only under .kText.
  public static func letter(_ size: CGFloat, italic: Bool = false, face: KLetterFace = .newsreader) -> Font {
    letterFont(face, italic: italic, size: size, scaledSize: size, relativeTo: textStyle(near: size))
  }

  /// The content face in a Letter face. `size` is the size at the default Dynamic Type setting,
  /// which the embedded faces scale themselves (relativeTo); `scaledSize` is that size already
  /// scaled, which the system faces (System, SF Mono) need instead. A face this binary can't
  /// draw yet (KLetterFace.drawn) falls back to Newsreader, never to the system sans. Italic is
  /// drawn only where the face has one (KLetterFace.hasItalic): Garamond and SF Mono stay upright
  /// rather than take SwiftUI's synthetic slant.
  public static func letterFont(_ face: KLetterFace, italic: Bool, size: CGFloat, scaledSize: CGFloat, relativeTo style: Font.TextStyle) -> Font {
    switch face.drawn {
    case .newsreader:
      return .custom(italic ? serifItalic : serifRegular, size: size, relativeTo: style)
    case .system:
      let upright = Font.system(size: scaledSize, weight: .regular)
      return italic ? upright.italic() : upright
    case .garamond:
      return .custom(garamondRegular, size: size, relativeTo: style)
    case .sfMono:
      return .system(size: scaledSize, weight: .regular, design: .monospaced)
    }
  }

  static func font(face: KTextStyle.Face, size: CGFloat, weight: Font.Weight, relativeTo style: Font.TextStyle) -> Font {
    switch face {
    case .system: return .system(size: size, weight: weight)
    case .monoMedium: return .system(size: size, weight: .medium, design: .monospaced)
    case .monoSemiBold: return .system(size: size, weight: .semibold, design: .monospaced)
    case .serif: return .custom(serifRegular, size: size, relativeTo: style)
    case .serifItalic: return .custom(serifItalic, size: size, relativeTo: style)
    }
  }

  /// A face's natural line height as a multiple of its size (see the note at the top), the serif
  /// in the given Letter face (Newsreader by default).
  /// The reader's language is written in a script whose glyphs iOS draws from its own CJK faces
  /// (ja, ko): the letter serifs have none, and those faces stand taller than the serif's line,
  /// so serif text gets `tallScriptLineHeight` at least. Set from TS (KindredlyUI.setTextScript);
  /// read at body time, and a language change re-renders every screen with new strings anyway.
  nonisolated(unsafe) public static var tallScript = false
  /// the least line height (× size) a serif style gets while `tallScript` (CJK body text sits at
  /// about 1.6–1.8)
  public static let tallScriptLineHeight: CGFloat = 1.6
  /// the least leading (× size) between the lines of a style that sets a line height, whatever
  /// the face's natural line (see KTextModifier)
  public static let minLeading: CGFloat = 0.06

  public static func naturalLineHeight(_ face: KTextStyle.Face, letterFace: KLetterFace = .newsreader) -> CGFloat {
    switch face {
    // SF Pro, and SF Mono on the same metrics
    case .system, .monoMedium, .monoSemiBold: return 1.19
    case .serif, .serifItalic: return letterFace.drawn.naturalLineHeight
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
 lacks writes KTextStyle.system(…) / .mono(…) inline for UI and labels, as the mock does, and
 .content(…) for content (the reader's Letter font).
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
  /// 400 13/1.5: the First Class card's list of what it brings (H:84)
  static let smallBody = system(13, .regular, lineHeight: 1.5)
  /// 400 14: the Kindreds preview line (H:65)
  static let preview = system(14, .regular)
  /// 400 14/19: a notice's words (NotifyBanner)
  static let notice = system(14, .regular, lineHeight: 19.0 / 14.0)
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
  /// 700 22: the four main tab titles (Today, Notes, Kindreds, Me), leading (owner, 2026-10-20)
  static let pageTitle = system(22, .bold)
  /// 500 17: a secondary page's title, centred, as written (not in capitals): KBackBar, My
  /// letters, the compose title, sheets (owner, 2026-10-20)
  static let secondaryTitle = system(17, .medium)
  /// 400 24: the × close (H:136)
  static let close = system(24, .regular)

  // ── SF Mono: 9, 10 and 11 (P:58) ──
  /// 600 9 .1em: stamp dates in the stamp grid (H:81 sets 8; the 9/10/11 rule lifts it to 9)
  static let monoStamp = mono(9, .semibold, tracking: 0.1)
  /// 600 9 .08em: tab labels (H:119)
  static let monoTab = mono(9, .semibold, tracking: 0.08)
  /// 600 9 .1em: 1ST on the First Class cards (H:84, 98)
  static let monoTiny = mono(9, .semibold, tracking: 0.1)
  /// 600 9 .14em: the Courier card's YOU / SOMEWHERE (H:75)
  static let monoTinyWide = mono(9, .semibold, tracking: 0.14)
  /// 600 10 .14em: section and group headers, ink labels (H:75, 78, 81, 92, 99, 101)
  static let monoSection = mono(10, .semibold, tracking: 0.14)
  /// 600 10 .16em: the FIRST CLASS eyebrow on the cream cards (H:84, 98)
  static let monoEyebrow = mono(10, .semibold, tracking: 0.16)
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
  /// 600 11 .1em: WRITE A LETTER and the composer labels (H:55, 132, 133); a voice card's time
  static let monoAction = mono(11, .semibold, tracking: 0.1)
  /// 600 11 .18em: TO A STRANGER (H:136)
  static let monoWide = mono(11, .semibold, tracking: 0.18)

  // ── SF Mono where the mock sets 12, 13 or 14: sized by KMonoSizes (owner question 2) ──
  /// 500, mock 12: Settings row values (H:101)
  static let monoValue = mono(KMonoSizes.label(12), .medium)
  /// 600 .08em, mock 12: the letter's postmark, SEP.23 · NO.7273 (H:33, 40)
  static let monoPostmark = mono(KMonoSizes.label(12), .semibold, tracking: 0.08)
  /// 600 .1em, mock 12: mono buttons, UPLOAD and STAMP CAM (H:81)
  static let monoButton = mono(KMonoSizes.label(12), .semibold, tracking: 0.1)
  /// 600 .14em, mock 12: ↑ PASS and REPLY ↓ (H:37, 44)
  static let monoReply = mono(KMonoSizes.label(12), .semibold, tracking: 0.14)
  /// 600 .16em, mock 12: EDIT PROFILE, SETTINGS, NEW (H:90, 97, 130)
  static let monoHeader = mono(KMonoSizes.label(12), .semibold, tracking: 0.16)
  /// 600 .12em, mock 12: a header's link, RECENT › (H:130)
  static let monoLink = mono(KMonoSizes.label(12), .semibold, tracking: 0.12)
  /// 600, mock 13: the topic tag (H:35, 42)
  static let monoTag = mono(KMonoSizes.label(13), .semibold)
  /// 600 .14em, mock 13: the calendar's month, OCTOBER 2026 (H:113)
  static let monoMonth = mono(KMonoSizes.label(13), .semibold, tracking: 0.14)
  /// 600, mock 14: 1ST in the gold cell (H:81)
  static let monoNumber = mono(KMonoSizes.label(14), .semibold)
  /// 600, mock 13: the two numbers on the Me profile card, figures rather than labels (H:72)
  static let monoFigure = mono(KMonoSizes.figure(13), .semibold)

  /// 600 12 .14em: YOUR COURIER, which keeps its 12 whatever KMonoSizes says (owner)
  static let monoCourier = mono(12, .semibold, tracking: 0.14)

  // ── content: the reader's Letter font ──
  /// 400 30/1.3: a letter's body on the Today card (H:34)
  static let letterBody = letterRead(30, lineHeight: 1.3, place: .todayCard)
  /// 400 17: what someone writes in a KField (the compose ask, a voice caption, the dock's
  /// prompt), the content counterpart of .input
  static let contentInput = content(17)

  // ── OLD: the fixed Newsreader serif. Kept so the call sites compile while they move: the
  // headline, banner and hint are UI (→ .system), the aside and note are Wren (→ .content). ──
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
/// A content style (followsLetterFont) is drawn in the Letter face the environment carries
/// (.kLetterFace); an old .letter serif in Newsreader; the mono in SF Mono.
struct KTextModifier: ViewModifier {
  let style: KTextStyle
  /// the style's size at the reader's Dynamic Type setting
  @ScaledMetric private var size: CGFloat
  @Environment(\.kLetterFace) private var environmentFace

  init(style: KTextStyle) {
    self.style = style
    _size = ScaledMetric(wrappedValue: style.size, relativeTo: style.textStyle)
  }

  func body(content: Content) -> some View {
    let letterFace = style.letterFace(in: environmentFace)
    // what CSS line-height adds over the natural line, in points at the scaled size
    let natural = KType.naturalLineHeight(style.face, letterFace: letterFace)
    // A line height set for Newsreader (natural 1.0) can fall at or under a taller face's own
    // line (Garamond 1.305, System and SF Mono 1.19). CSS would then pull the lines together;
    // SwiftUI can't (a negative lineSpacing overlaps the glyphs), so the leading never goes under
    // a floor: nothing for a label, and for text that asks for a line height a little air
    // (KType.minLeading of the size), so a paragraph in a tall face is never set solid.
    var leading = style.lineHeight.map { max(KType.minLeading * size, ($0 - natural) * size) } ?? 0
    // Japanese and Korean in a serif style: the CJK glyphs come from iOS's own faces, taller than
    // the serif's line, so the line opens up to tallScriptLineHeight (KType.tallScript)
    if KType.tallScript, style.face == .serif || style.face == .serifItalic {
      leading = max(leading, (KType.tallScriptLineHeight - natural) * size)
    }
    // the system faces (SF Pro, SF Mono) are sized here; the embedded faces scale
    // themselves (relativeTo) by the same metric
    let font: Font
    switch style.face {
    case .system:
      font = .system(size: size, weight: style.weight)
    case .serif, .serifItalic:
      font = KType.letterFont(letterFace, italic: style.face == .serifItalic, size: style.size, scaledSize: size, relativeTo: style.textStyle)
    case .monoMedium:
      font = .system(size: size, weight: .medium, design: .monospaced)
    case .monoSemiBold:
      font = .system(size: size, weight: .semibold, design: .monospaced)
    }
    return content
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

/*
 THE MONO SIZES ABOVE 11, the one table for owner question 2 (asked 2026-10-16, built with its
 recommended answer). Mono labels are 9, 10 or 11 (P:58), yet the mock still sets some at 12, 13
 and 14: page titles (EDIT PROFILE, SETTINGS, the + sheet's NEW), the postmark, PASS and REPLY,
 Settings row values, the calendar month, 1ST in the gold cell, and the two numbers on the Me
 profile card. Every role that the mock sets over 11 is sized through here, so the owner's answer
 is one line: `rule`. YOUR COURIER (monoCourier) keeps its 12 whatever the rule.
 */
public enum KMonoSizes {
  /// The three answers the owner was offered.
  public enum Rule: Sendable {
    /// (a) every label, title and number at 11
    case everythingAtEleven
    /// (b) every label and title at 11; the Me profile numbers keep 13, as figures
    case labelsAtElevenFiguresKept
    /// (c) the mock's own 12, 13 and 14
    case mockSizes
  }

  /// THE ANSWER. (b) until the owner says otherwise.
  public static let rule: Rule = .labelsAtElevenFiguresKept

  /// The size of a label or title the mock sets at `mock` points.
  public static func label(_ mock: CGFloat) -> CGFloat {
    rule == .mockSizes ? mock : min(mock, 11)
  }

  /// The size of a figure (the Me profile card's two numbers) the mock sets at `mock` points.
  public static func figure(_ mock: CGFloat) -> CGFloat {
    rule == .everythingAtEleven ? min(mock, 11) : mock
  }
}

/*
 LETTER FACE: the reader's Letter font (a device preference set in Settings: Newsreader, the
 default; System; EB Garamond; SF Mono), as SwiftUI sees it. It is one value in the
 environment:

     KTodayDesk(…).kLetterFace(KLetterFace(key: props.letterFont))

 Screen adapters set it once at their root (kScreenEnvironment in Adapters/KScreenProps.swift).
 Following it is the style's choice: every CONTENT style (.content(…), .letterRead(…),
 letterBody, contentInput) is drawn in it; UI (.system) and labels (.mono) never are. Content is
 what someone wrote or Wren says: letters, replies, notes, translations, quotes, fold answers,
 Wren's lines everywhere, my-letter previews, and every field where someone writes content
 (KField with a content style, KComposerField with content: true). The Kindreds list's preview
 line and names stay system, and so do a kindred room's chat bubbles, their quotes, the
 translation under them and the room's field (owner, 2026-10-21). A paper (InkCard, the
 compose paper) keeps only its colour, texture and size: the reader's face wins over it.

 - Newsreader is embedded and scales through relativeTo. It has a true italic.
 - System is SF Pro, .system(size:weight:), scaled by .kText's
   @ScaledMetric as the system sans is. It needs no file and has a true italic.
 - EB Garamond is embedded (owner approved the download, 2026-10-16): Regular only, cut to
   Latin, so no italic (content italic is drawn upright). Its natural line is tall (1.305).
   garamondReady guards a build without it: the choice is left out of pickers (choices) and a
   stored "garamond" is drawn as Newsreader (drawn), never as the system sans a missing custom
   font would silently turn into.
 - SF Mono is the system monospaced design, like System a system face with no file. No italic
   (drawn upright); about 20% wider than Newsreader.
 Where content sits under a lineLimit or in a fixed height, the wider and taller faces get room
 (fitLines) or a smaller size (fitSize) rather than being cut.
 */
public enum KLetterFace: String, CaseIterable, Sendable {
  /// Newsreader, the default
  case newsreader
  /// System: SF Pro, the interface's own face (owner, 2026-10-20: it replaced New York); the JS
  /// side calls it "system". A stored "newyork" from before is no case and reads as Newsreader.
  case system
  /// EB Garamond, the mock's own serif, once it is embedded
  case garamond
  /// SF Mono, the system monospaced design (owner, 2026-10-20); no file, like System
  case sfMono = "sfmono"

  /// GARAMOND_READY: EBGaramond-Regular.ttf is in assets/fonts and app.json's expo-font list, so
  /// a binary built from here carries it; the JS side keeps its own GARAMOND_READY in step.
  public static let garamondReady = true

  /// The face for a key the JS side sends ("newsreader", "system", "garamond", "sfmono"). Anything else
  /// is System, the default since 2026-10-26 (owner; it was Newsreader).
  public init(key: String) {
    self = KLetterFace(rawValue: key) ?? .system
  }

  /// The faces a picker offers, in order: Garamond only once it is ready.
  public static var choices: [KLetterFace] {
    allCases.filter { $0 != .garamond || garamondReady }
  }

  /// The face actually drawn: Garamond falls back to Newsreader while it isn't ready.
  public var drawn: KLetterFace {
    self == .garamond && !Self.garamondReady ? .newsreader : self
  }

  /// Whether the face has a true italic. Content italic in a face without one (Garamond,
  /// SF Mono) is drawn upright, never with SwiftUI's synthetic slant.
  public var hasItalic: Bool {
    switch drawn {
    case .newsreader, .system: return true
    case .garamond, .sfMono: return false
    }
  }

  /// Whether the face takes more room than Newsreader, the face the content layouts were drawn
  /// for: SF Mono is about 20% wider, Garamond's line is 1.305 tall.
  public var isRoomy: Bool {
    drawn == .sfMono || drawn == .garamond
  }

  /// The lines to allow content set for `lines` in Newsreader: one more in a roomy face, so a
  /// lineLimit doesn't cut what fits in Newsreader.
  public func fitLines(_ lines: Int) -> Int {
    isRoomy ? lines + 1 : lines
  }

  /// The size to set content at in a box measured for Newsreader at `size` (a fixed height, a
  /// one-line limit): SF Mono a step down for its width, Garamond for its taller line, the
  /// others as given.
  public func fitSize(_ size: CGFloat) -> CGFloat {
    switch drawn {
    case .sfMono: return (size * 0.85 * 2).rounded() / 2
    case .garamond: return (size * 0.92 * 2).rounded() / 2
    case .newsreader, .system: return size
    }
  }

  /// The face's natural line height as a multiple of its size (see the note at the top).
  public var naturalLineHeight: CGFloat {
    switch self {
    case .newsreader: return 1.0
    case .system: return 1.19
    // measured from the embedded file: (hhea ascender 1007 + |descender| 298 + lineGap 0) / 1000
    case .garamond: return 1.305
    // the system monospaced design sits on SF's metrics, as System does
    case .sfMono: return 1.19
    }
  }
}

private struct KLetterFaceKey: EnvironmentKey {
  static let defaultValue: KLetterFace = .system
}

public extension EnvironmentValues {
  /// The Letter face the content below is drawn in (.kText, styles with followsLetterFont).
  /// Newsreader by default.
  var kLetterFace: KLetterFace {
    get { self[KLetterFaceKey.self] }
    set { self[KLetterFaceKey.self] = newValue }
  }
}

public extension View {
  /// Draws the content inside (styles with followsLetterFont) in this Letter face (see LETTER
  /// FACE in KType.swift).
  func kLetterFace(_ face: KLetterFace) -> some View {
    environment(\.kLetterFace, face)
  }
}

/// The places someone's letter is read, where the serif may follow the reader's Letter font
/// (owner question 1). A screen names its place in .letterRead(…, place:).
public enum KLetterPlace: CaseIterable, Sendable {
  /// the letter on the Today card (letterBody)
  case todayCard
  /// the one-letter reader
  case reader
  /// a pen pal's letter blocks in the chat, before names are traded
  case penPalLetter
  /// a letter in My letters
  case myLetters
  /// the opening letter on a kindred's page
  case kindredOpening
  /// a quote in Keepsakes or Lore
  case quote
}

/*
 THE LETTER FONT'S REACH over .letterRead(…, place:), from owner question 1 (2026-10-16). The
 2026-10-20 type system answers it wider still: all content follows the Letter font, which
 .content(…) does with no place to name. This table only keeps .letterRead's call sites
 meaning what they did; (b) reaches every place.
 */
public enum KLetterFontScope {
  /// The answers the owner was offered that this table can give.
  public enum Rule: Sendable {
    /// (a) only the Today card and the one-letter reader
    case todayAndReader
    /// (b) everywhere someone's letter is read: the Today card and reader, pen-pal letter blocks
    /// before names are traded, My letters, a kindred's opening letter, Keepsake and Lore quotes
    case everyLetterRead
  }

  /// THE ANSWER. (b) until the owner says otherwise.
  public static let rule: Rule = .everyLetterRead

  /// Whether a letter read at `place` follows the Letter font.
  public static func reaches(_ place: KLetterPlace) -> Bool {
    switch rule {
    case .todayAndReader: return place == .todayCard || place == .reader
    case .everyLetterRead: return true
    }
  }
}
