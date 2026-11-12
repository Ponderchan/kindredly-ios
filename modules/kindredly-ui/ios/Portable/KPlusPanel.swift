// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.
// The Expo side lives in Adapters/KTabBarView.swift; ui-lab shows it (kindredly:///ui-lab).

import SwiftUI

/*
 WHAT THE + OPENS. Four ways (KPublishStyle), chosen by whoever holds the bar:
 - grow: the publish entry the app uses on every tab (the owner's P2, 2026-11-09): the glass bar
   itself grows taller around two rows, Letter and Note (KPublishTray, further down; the growing
   is KTabBar's). One behaviour wherever the + is pressed;
 - cards: the 10a composer sheet below (KPlusPanel), rising just above the tab bar over a dimmed
   screen. ui-lab keeps it, and a binary that doesn't know a style it is sent opens it;
 - sheet and pop: the publish entry of Today 3d × 25b (design Prompt 8), which the app chose by
   tab until P2 (owner, 2026-10-18): two round buttons popping from behind the + on Today, an iOS
   sheet where Wren asks who this one is for on the other tabs (KPublishSheet, KPublishPop). The
   app no longer opens either; they stay drawn because ui-lab and the dev Today page still ask
   for them by name.
 The stage that puts any of them on screen is KTabStage at the end.

 THE 10a CARDS (H:128-135). The sheet is a flat panel (owner's rule B, 2026-10-26; the mock's
 2.5 ln outline and hard 6/6 ln shadow are gone): sf, corners of 28, a 1pt line hairline in
 Midnight only, padding 16 and the 2.5 the outline took, its pieces 10 apart (H:129).
 - a header row: the title as the secondary title, System 500 17 centred, as written (NEW in the
   mock, H:130, there in mono capitals; titles are System, owner 2026-10-20), and on the right, if
   one is given, a link in ind, System 600 14 (the mock's RECENT ›; a link is a button);
 - the choices as KChoiceCards, two to a row, 10 apart (H:131-133, Kit/KChoiceCard.swift):
   corners of 18, flat, the glyph 28 across, the title and the
   subtitle in System, both cards in a row one height.

 The two fills are the mock's: the letter card lav2 (the only place the mock uses lav2) and the
 note card #F6E7C6, the happy mood's fill, the same in every theme (KChoiceCard's lavender and
 warm tones, which also keep the warm card's words dark in Midnight).

 Every word comes from the caller, already translated. Nothing here holds a word of its own.
 */

/// One choice on the composer sheet.
public struct KPlusPanelCard: Identifiable, Equatable, Sendable {
  /// the drawings the mock gives its two cards
  public enum Glyph: String, Sendable {
    /// an envelope (H:132)
    case letter
    /// a notebook with a spine (H:133)
    case note
  }

  /// the two card fills the mock uses
  public enum Tone: String, Sendable {
    /// lav2, the letter card (H:132)
    case lavender
    /// #F6E7C6, the happy mood's fill, the note card (H:133)
    case warm
  }

  /// what the caller is told when this card is tapped
  public let key: String
  public let title: String
  public let subtitle: String
  public let glyph: Glyph
  public let tone: Tone

  public var id: String { key }

  /// the drawing on the shared grid (Kit/KLineGlyph.swift)
  public var lineGlyph: KLineGlyph {
    switch glyph {
    case .letter: return .envelope
    case .note: return .notebook
    }
  }

  /// the face of the KChoiceCard it is drawn as
  public var choiceTone: KChoiceCard.Tone {
    switch tone {
    case .lavender: return .lavender
    case .warm: return .warm
    }
  }

  public init(key: String, title: String, subtitle: String, glyph: Glyph, tone: Tone) {
    self.key = key
    self.title = title
    self.subtitle = subtitle
    self.glyph = glyph
    self.tone = tone
  }
}

/// The optional link at the right of the sheet's header (the mock's RECENT ›).
public struct KPlusPanelLink: Equatable, Sendable {
  /// what the caller is told when it is tapped
  public let key: String
  /// the whole label, chevron included if it has one, already translated
  public let title: String

  public init(key: String, title: String) {
    self.key = key
    self.title = title
  }
}

/// The composer sheet itself, without the dim or the motion; KTabStage puts it on screen.
public struct KPlusPanel: View {
  private let theme: KTheme
  private let title: String
  private let link: KPlusPanelLink?
  private let cards: [KPlusPanelCard]
  private let onAction: (String) -> Void

  /// - Parameters:
  ///   - title: the header, e.g. New; set as written
  ///   - link: the header's link on the right, or nil for none
  ///   - cards: the choices, two to a row
  ///   - onAction: a card or the link was tapped, with its key
  public init(theme: KTheme, title: String, link: KPlusPanelLink? = nil, cards: [KPlusPanelCard], onAction: @escaping (String) -> Void) {
    self.theme = theme
    self.title = title
    self.link = link
    self.cards = cards
    self.onAction = onAction
  }

  public var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      header
      // two to a row, one height per row, a row of one at half the width (KChoiceGrid)
      KChoiceGrid(cards) { c in
        KChoiceCard(theme: theme, title: c.title, subtitle: c.subtitle, glyph: c.lineGlyph, tone: c.choiceTone) {
          onAction(c.key)
        }
      }
    }
    // padding 16, and the 2.5 the mock's outline took
    .padding(16 + InkCardMetrics.borderWidth)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background {
      // a flat panel (owner's rule B, 2026-10-26): no ink outline, no hard shadow; in Midnight a
      // 1pt line hairline keeps it off the dim
      KStickerBackground(
        shape: RoundedRectangle(cornerRadius: 28, style: .circular),
        fill: theme.sf,
        stroke: theme.isDark ? theme.line : nil,
        lineWidth: 1
      )
    }
    .accessibilityElement(children: .contain)
  }

  private var header: some View {
    // the title centred as every sheet's is (the secondary title), the link on the right over it
    ZStack(alignment: .trailing) {
      Text(title)
        .kText(.secondaryTitle)
        .foregroundStyle(theme.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.8)
        .frame(maxWidth: .infinity)
        .padding(.horizontal, link == nil ? 0 : 56)
        .accessibilityAddTraits(.isHeader)
      if let link {
        Button {
          onAction(link.key)
        } label: {
          Text(link.title)
            .kText(.system(14, .semibold))
            .foregroundStyle(theme.ind)
            .lineLimit(1)
            .fixedSize()
            // a finger's worth of target around a short word
            .padding(.vertical, 8)
            .contentShape(Rectangle())
            .padding(.vertical, -8)
        }
        .buttonStyle(KAsIsButtonStyle())
      }
    }
  }
}

/// The dim layer over the screen while the composer is open: rgba(30,27,53,.3) (H:128) in the
/// light themes, black at .45 in Midnight (composer(for:)).
///
/// The mock's navy is fixed, and over Midnight's #0F0E1C page it comes out lighter (#141224), so
/// nothing receded. No dim can step a near-black page the way Classic's steps white (1.9:1; black
/// itself only gets 1.1:1 off #0F0E1C), so Midnight's does its work on what is on the page, a
/// little harder than Classic's: ink against the page falls from 15.4:1 to 5.0:1 (Classic: 16.6
/// to 8.7).
public enum KDim {
  /// the light themes' dim (H:128)
  public static let composer = Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 0.3)
  /// Midnight's
  public static let composerDark = Color.black.opacity(0.45)

  /// The composer's dim in this theme.
  public static func composer(for theme: KTheme) -> Color {
    theme.isDark ? composerDark : composer
  }
}

public extension KMotion {
  /// The dim fading in and out: opacity .3s, CSS's default ease (H:128).
  static let dimFade = Animation.timingCurve(0.25, 0.1, 0.25, 1, duration: 0.3)
  /// The sheet rising: transform .45s cubic-bezier(.25,1.25,.45,1), a little past and back (H:129).
  static let panelRise = Animation.timingCurve(0.25, 1.25, 0.45, 1, duration: 0.45)
  /// The sheet's opacity: .25s, CSS's default ease (H:129).
  static let panelFade = Animation.timingCurve(0.25, 0.1, 0.25, 1, duration: 0.25)
}

/*
 ══ THE PUBLISH ENTRY ═════════════════════════════════════════════════════════════════════════

 The + is where a reader writes. Since the owner's P2 (2026-11-09) it opens the same way on every
 tab: GROW, below. SHEET and POP are the older styles (Today 3d × 25b, design Prompt 8), no longer
 opened by the app, kept for ui-lab and the dev Today page.

 GROW (CLAUDE-CODE-PROMPTS-PLUS.md Prompts 0-2; KTabBar grows the glass, KPublishTray is what it
 grows around):
 - the dim is the pop's (rgba(30,27,53,.22), Midnight black .33) with a light blur of the page
   under it (the design's blur 6, as a thin material at part strength: SwiftUI's materials have
   one blur each, so this is the nearest); a tap on it, on the x or on any tab closes, and nothing
   else happens (no tab switch while it is open);
 - the bar's glass grows upward from 62, its bottom edge fixed and its corners kept, by the
   tray's height: 10 in on every side, the pieces 8 apart, 10 above the tab row (210 in all);
 - for the new reader's first three opens (the holder counts and sends ask; "" otherwise) a line
   above the rows: Wren's own picture 27 x 30 and, 10 beside her, the ask in System italic
   17/1.3 in ink, as the old sheet's header had it;
 - two rows at least 60 tall, corners of 22, translucent white on the glass (.75; pressed .55;
   Midnight white .10 and .18), padding 0 14 0 11, their pieces 12 apart: a 38 tile (corners 12)
   holding a 22 line drawing on the design's 24 grid at 1.9 (Letter #E4E2F4 with the envelope in
   #3A34D6; Note the calm mood's #DDEFD6 with the page in its #2E7D4F, both the same in every
   theme), then the title, System 600 16 in the tile's ink (Midnight: ind and the calm fill, which
   read on the dark glass), and its sub-line under it, System 13 in #8A86A3 (Midnight: sub);
 - on the letter row, if the caller gives one, the letters left today at the right, as the old
   sheet showed it (mono 500 10 at .12em, mute), red #E0483C when none are left (letterOut);
   where Letter then goes is the holder's (the paywall);
 - VoiceOver reads each row as one button, its title, sub-line and count; opening moves it to the
   first row. Reduce Motion: the bar doesn't spring and the + doesn't turn; everything cross-fades.

 YOUR DRAFT, ABOVE LETTER (owner's audit, 2026-11-10). An unsent letter was reachable only from
 My letters and Settings, so a reader with a half-written letter pressed the + and got a blank
 page. When the holder sends a draftTitle, the tray has one more row above Letter, the same row
 in every measure (so the bar grows 68 more, 278 in all): a pencil on the letter's own tile (a
 draft is a letter, so it wears the letter's pair), the title, and under it the draft's first
 words on ONE line, cut with an ellipsis (the two rows below keep wrapping theirs); when there
 are several drafts, how many at the row's end, a bare mono figure in the count's style. Tapped,
 it reports KPublishAction.draft and the holder opens the composer on that draft (or the paywall
 with no letters left today, as Letter). VoiceOver reads it as one button, the title and the
 first words, without the figure, and opening moves VoiceOver to it. With no draftTitle the tray
 is the two rows it was, to the point.

 SHEET, on every tab but Today (until P2):
 - an iOS sheet (owner, 2026-10-26: the hand-drawn one "ran around"; "native, rising from the
   bottom"): the system's rise, dim, grabber, corners and drag down, on sf, exactly as tall as
   its content (a measured height detent). A choice closes it, and the composer is pushed once
   it is down (KTabStage);
 - inside, top to bottom: under the system grabber, 26 down, Wren 44 (the user's own,
   from the caller's snapshot) and 12 beside her the ask in the Letter font's italic 17/1.3;
   18 below, the two rows as one grouped list; 14 below, the footnote in mono 9 at .14em,
   faint, centred; 12 at the foot;
 - the list (owner's mock, 2026-10-20, replacing the black-framed sticker rows): one container
   in soft (soft2 in Midnight, where soft is sf), continuous corners of 20, no outline and no
   shadow; two rows at least 76 tall, padding 0 16, their pieces 14 apart, an inset hairline in
   line between them starting under the words. Each row: a 40 rounded-square tile (corners 11)
   holding a 22 drawing — the letter's ind with the envelope in white (bg in Midnight), the note's the calm mood's
   pale green with the ruled card in its green; the title in System 600 17 with the subtitle 2
   below in System 14 sub; on the letter row, if the caller gives one, the letters left in mono
   500 10 at .12em, mute; then the › chevron in faint. Pressed, the row's ground turns line;
 - it closes on a tap on the dim, VoiceOver's escape, or a drag down, as any iOS sheet; each
   is onDismiss. Its text grows with Dynamic Type up to xxLarge.

 POP, on Today (until P2):
 - the dim is lighter (.22; Midnight black .33, KDim.publishPop), and the bar stays: its + turns
   to an × on the publish curve, .35s cubic-bezier(.3,1.3,.4,1);
 - two 64 discs (owner's mock, 2026-10-20, replacing the black-ringed stickers): the lav2 wash, a
   1pt hairline (sf; line in Midnight) and a soft blur shadow, each holding a 26 drawing in
   ink (the envelope, the ruled card). Closed, both sit at the +'s centre at .4 and transparent,
   under the bar, so they come out from behind it. Open, LETTER goes to 86 left of the + and NOTE
   86 right of it, 91 up (centres at the bar's top − 60), at full size, over .4s on
   cubic-bezier(.3,1.3,.4,1), NOTE 50ms after LETTER. At 393 that is centres 110 and 282 at y
   700: the design's left 78 / 250, top 668. Closing plays it backwards, NOTE first;
 - their labels sit centred 10 under each disc, System 500 13 in sub, sentence case, and fade in 150 and
   200ms after the discs start (opacity .2s); closing, they fade at once;
 - VoiceOver reads the two as buttons with the caller's spoken names (the sheet's titles); the
   labels are hidden from it. The labels' Dynamic Type stops at large.

 Reduce Motion: the buttons only fade (no flight, no overshoot), the bar fades instead of
 sliding, and the sheet does what iOS does for it. Opening either moves VoiceOver to the letter choice.

 Every word arrives translated; the bird arrives as the caller's snapshot. Nothing here holds a
 word or a picture of its own.
 */

/// What the + opens.
public enum KPublishStyle: String, Sendable {
  /// the 10a composer sheet of cards over the bar (KPlusPanel); ui-lab keeps it
  case cards
  /// the bottom sheet, Wren asking who this one is for (every tab but Today, until P2)
  case sheet
  /// the two round buttons popping from behind the + (Today, until P2)
  case pop
  /// the bar growing around two rows, on every tab (the owner's P2): KPublishTray
  case grow
}

/// The publish entry's words, for the sheet and for the grown bar's tray: every word already
/// translated.
public struct KPublishSheetModel: Equatable, Sendable {
  /// Wren's question, beside her ("Who's this one for?"); in the tray, "" leaves her line out
  public var ask = ""
  /// the letter row's title and subtitle
  public var letterTitle = ""
  public var letterSub = ""
  /// the letters left today on the letter row's right ("3 LEFT"); "" hides it
  public var letterLeft = ""
  /// none left today: the tray draws the count in red (the sheet ignores it)
  public var letterOut = false
  /// the note row's title and subtitle
  public var noteTitle = ""
  public var noteSub = ""
  /// the tray's draft row, above Letter (owner's audit, 2026-11-10): its title ("Continue your
  /// draft"); "" leaves the row out, and the tray is the two rows it always was
  public var draftTitle = ""
  /// the draft's own first words, drawn on one line
  public var draftSub = ""
  /// how many drafts there are, when more than one ("3"); "" hides it
  public var draftCount = ""
  /// the line under the rows
  public var footnote = ""
  /// the user's own Wren beside the question; nil keeps her frame empty while she loads
  public var bird: KImageRef? = nil

  public init() {}
}

/// The returning reader's two buttons: every word already translated.
public struct KPublishPopModel: Equatable, Sendable {
  /// the labels under the discs, sentence case (Letter, Note)
  public var letterLabel = ""
  public var noteLabel = ""
  /// what VoiceOver says for each disc (the sheet's titles: "Write a letter", "Diary note")
  public var letterA11y = ""
  public var noteA11y = ""
  /// the free plan's letters left today, under Letter ("3 LEFT"); "" hides it — the same count
  /// the sheet's letter row shows
  public var letterLeft = ""

  public init() {}
}

/// What the publish entry tells its holder through onPanelAction.
public enum KPublishAction {
  /// the letter choice: the letter composer
  public static let letter = "letter"
  /// the note choice: the diary composer
  public static let note = "note"
  /// the tray's draft row: the letter composer, on the reader's most recent draft
  public static let draft = "draft"
}

public extension KDim {
  /// The pop's dim: rgba(30,27,53,.22) in the light themes, lighter than the sheet's, as the
  /// design has it (the bar stays, so less of the screen needs to step back).
  static let publishPop = Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 0.22)
  /// Midnight's: black at .33, stepping down from the composer's .45 by the same ratio.
  static let publishPopDark = Color.black.opacity(0.33)

  /// The dim the + spreads over the screen in this theme, for this style. The grown bar's is
  /// the pop's, the design's own .22 (P2).
  static func publish(_ style: KPublishStyle, for theme: KTheme) -> Color {
    switch style {
    case .cards, .sheet: return composer(for: theme)
    case .pop, .grow: return theme.isDark ? publishPopDark : publishPop
    }
  }

  /// How strong the thin material under the grown bar's dim is: the design blurs the page by 6,
  /// lighter than any material's own blur, so the material is laid at part strength.
  static let growBlur: Double = 0.55
}

public extension KMotion {
  /// The returning reader's buttons flying out and back: .4s cubic-bezier(.3,1.3,.4,1).
  static let publishPopFly = Animation.timingCurve(0.3, 1.3, 0.4, 1, duration: 0.4)
  /// Their opacity: .2s, CSS's default ease.
  static let publishPopFade = Animation.timingCurve(0.25, 0.1, 0.25, 1, duration: 0.2)
  /// Everything in the publish entry with Reduce Motion on: a plain fade.
  static let publishReduced = Animation.easeInOut(duration: 0.2)
}

/// The publish entry's numbers.
enum KPublishMetrics {
  /// a row's least height, and the grouped list's continuous corners
  static let rowHeight: CGFloat = 76
  static let rowCorner: CGFloat = 20
  /// a row's side padding, and the gap between its tile and its words
  static let rowInset: CGFloat = 16
  static let rowGap: CGFloat = 14
  /// the rounded-square icon tile on each row
  static let tile: CGFloat = 40
  static let tileCorner: CGFloat = 11
  /// the pop discs
  static let popDisc: CGFloat = 64
  /// each pop disc's centre from the +'s: 86 to the side, 91 up (the bar's top − 60)
  static let popSide: CGFloat = 86
  static let popRise: CGFloat = 91
  /// a closed disc's size
  static let popClosedScale: CGFloat = 0.4
  /// the label's top under its disc
  static let popLabelGap: CGFloat = 10

  /// the grown bar's tray (P2): padding 10, pieces 8 apart, rows 60 tall with corners of 22,
  /// tiles 38 (the draft row, when there is one, is a third row of the same measures)
  static let trayInset: CGFloat = 10
  static let trayGap: CGFloat = 8
  static let trayRow: CGFloat = 60
  static let trayRowCorner: CGFloat = 22
  static let trayTile: CGFloat = 38
  /// the letter tile's pair, the same in every theme (P2 Prompt 1: lav and ind)
  static let letterTile = Color(hex: "#E4E2F4")
  static let letterInk = Color(hex: "#3A34D6")
  /// the rows' sub-lines in the light themes
  static let traySub = Color(hex: "#8A86A3")
  /// the count when no letters are left today
  static let outRed = Color(hex: "#E0483C")

  /// The grouped list's fill on the sheet's sf: soft, the theme's wash for grouped lists; in
  /// Midnight soft is sf itself, so soft2 there, or the list wouldn't show.
  /// Midnight is a step lighter than soft2 (owner, 2026-10-21: "太暗了"): the list must read as a
  /// surface lifted off the sheet, not a darker hole in it.
  static func listFill(for theme: KTheme) -> Color {
    theme.isDark ? Color(hex: "#26292E") : theme.soft
  }

  /// The pop discs' face: lav2 in the light themes; in Midnight a lifted grey, since lav2 there
  /// sinks into the dimmed page (owner, 2026-10-21; neutral, not violet, since 2026-11-12).
  static func popFill(for theme: KTheme) -> Color {
    theme.isDark ? Color(hex: "#30343A") : theme.lav2
  }

  /// The pop discs' face: the pale wash of the accent (lav2), ringed in a 1pt hairline (sf in the
  /// light themes, catching the light on the dim; line in Midnight, where sf is the page's).
  static func popRim(for theme: KTheme) -> Color {
    theme.isDark ? Color.white.opacity(0.16) : theme.sf
  }

  /// The pop discs' soft lift: 0 4 14 -4 navy at .22 (black at .45 in Midnight).
  static func popShadow(for theme: KTheme) -> [KSoftShadow] {
    let color = theme.isDark
      ? Color.black.opacity(0.45)
      : Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 0.22)
    return [KSoftShadow(y: 4, blur: 14, spread: -4, color: color)]
  }
}

/// The new reader's sheet, its content only: the handle, Wren's question and the two rows.
/// KPublishNativeSheet puts it in an iOS sheet.
struct KPublishSheet: View {
  let theme: KTheme
  let model: KPublishSheetModel
  let onAction: (String) -> Void
  var letterFocus: AccessibilityFocusState<Bool>.Binding
  /// its own 40 × 6 handle; the system sheet (KPublishNativeSheet) draws its own grabber instead
  var drawsHandle = true
  @Environment(\.displayScale) private var displayScale

  var body: some View {
    VStack(spacing: 0) {
      // the handle: 40 × 6 in line, 10 from the top
      if drawsHandle {
        Capsule()
          .fill(theme.line)
          .frame(width: 40, height: 6)
          .padding(.top, 10)
          .accessibilityHidden(true)
      }

      // Wren and her question, 16 below (26 below the system grabber's own room)
      HStack(spacing: 12) {
        KImage(model.bird, size: CGSize(width: 44, height: 44), contentMode: .fit, placeholder: .clear)
          .accessibilityHidden(true)
        Text(model.ask)
          .kText(.content(17, italic: true, lineHeight: 1.3))
          .foregroundStyle(theme.ink)
          .fixedSize(horizontal: false, vertical: true)
          .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(.top, drawsHandle ? 16 : 26)

      // the two rows, 18 below, as one grouped list
      rows
        .padding(.top, 18)

      // the footnote, 14 below, when there is one (the sheet no longer changes after a first
      // week, so TS sends none today)
      if !model.footnote.isEmpty {
        Text(model.footnote)
          .kText(.mono(9, .semibold, tracking: 0.14))
          .foregroundStyle(theme.faint)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
          .frame(maxWidth: .infinity)
          .padding(.top, 14)
      }
    }
    .padding(.horizontal, 20)
  }

  private var letterRow: some View {
    Button {
      onAction(KPublishAction.letter)
    } label: {
      row(title: model.letterTitle, sub: model.letterSub, trailing: model.letterLeft) {
        // an ind tile with the envelope in white (bg in Midnight, whose ind is too light for white)
        KLineIcon(.envelope, size: 22, lineWidth: 2, color: theme.isDark ? theme.bg : KBrand.paperWhite)
          .frame(width: KPublishMetrics.tile, height: KPublishMetrics.tile)
          .background(RoundedRectangle(cornerRadius: KPublishMetrics.tileCorner, style: .continuous).fill(theme.ind))
      }
    }
    .buttonStyle(KPublishRowStyle(theme: theme))
    .accessibilityFocused(letterFocus)
  }

  private var noteRow: some View {
    Button {
      onAction(KPublishAction.note)
    } label: {
      row(title: model.noteTitle, sub: model.noteSub, trailing: "") {
        // a soft green tile with the ruled card in green (the calm mood's pair, every theme)
        KLineIcon(.ruledCard, size: 22, lineWidth: 2 * 24 / 28, color: KMood.calm.ink)
          .frame(width: KPublishMetrics.tile, height: KPublishMetrics.tile)
          .background(RoundedRectangle(cornerRadius: KPublishMetrics.tileCorner, style: .continuous).fill(KMood.calm.fill))
      }
    }
    .buttonStyle(KPublishRowStyle(theme: theme))
  }

  /// The two rows as one grouped list: a soft container, the rows one under the other with an
  /// inset hairline between them (under the words, not the tile, as iOS's lists do).
  private var rows: some View {
    let shape = RoundedRectangle(cornerRadius: KPublishMetrics.rowCorner, style: .continuous)
    return VStack(spacing: 0) {
      letterRow
      Rectangle()
        .fill(theme.line)
        .frame(height: 1 / max(displayScale, 1))
        .padding(.leading, KPublishMetrics.rowInset + KPublishMetrics.tile + KPublishMetrics.rowGap)
        .accessibilityHidden(true)
      noteRow
    }
    .background(shape.fill(KPublishMetrics.listFill(for: theme)))
    .clipShape(shape)
  }

  /// A row's inside: the tile, the two lines, the count on the right if there is one, the chevron.
  private func row<Tile: View>(title: String, sub: String, trailing: String, @ViewBuilder tile: () -> Tile) -> some View {
    HStack(spacing: KPublishMetrics.rowGap) {
      tile()
        .accessibilityHidden(true)
      VStack(alignment: .leading, spacing: 2) {
        Text(title)
          .kText(.system(17, .semibold))
          .foregroundStyle(theme.ink)
          .fixedSize(horizontal: false, vertical: true)
        Text(sub)
          .kText(.system(14))
          .foregroundStyle(theme.sub)
          .fixedSize(horizontal: false, vertical: true)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      HStack(spacing: 10) {
        if !trailing.isEmpty {
          Text(trailing)
            .kText(.mono(10, .medium, tracking: 0.12))
            .foregroundStyle(theme.mute)
            .lineLimit(1)
            .fixedSize()
        }
        // the › at a list row's end, as SoftGroup's rows draw it: system 400 18 in faint
        Text(verbatim: "›")
          .kText(.system(18))
          .foregroundStyle(theme.faint)
          .accessibilityHidden(true)
      }
    }
    // 76 tall, taller only for large text
    .padding(.horizontal, KPublishMetrics.rowInset)
    .padding(.vertical, 10)
    .frame(maxWidth: .infinity, minHeight: KPublishMetrics.rowHeight)
    .contentShape(Rectangle())
    // one element: "Write a letter, Wren carries it to a stranger, 3 LEFT, button"
    .accessibilityElement(children: .combine)
  }
}

/*
 The rows' press, as a list row's: the row's ground darkens to line while the finger is down.
 The container behind is clipped to its corners, so the highlight follows them.
 */
private struct KPublishRowStyle: ButtonStyle {
  let theme: KTheme

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .background(configuration.isPressed ? theme.line : Color.clear)
      .animation(KMotion.press, value: configuration.isPressed)
  }
}

/// THE NEW READER'S SHEET AS AN iOS SHEET (owner, 2026-10-26: "it runs around — make it native,
/// rising from the bottom"). The content is KPublishSheet's, under the system grabber; the system
/// draws the rise, the dim, the drag down and the corners, and the sheet is exactly as tall as
/// what it holds (a height detent, measured). Whatever the Host around the bar is doing, a
/// presented sheet is the window's, so it can't come from anywhere but the bottom.
struct KPublishNativeSheet: View {
  let theme: KTheme
  let model: KPublishSheetModel
  let onAction: (String) -> Void

  /// the content's own height, measured; a guess until then so the first frame isn't empty
  @State private var height: CGFloat = 300
  @AccessibilityFocusState private var letterFocused: Bool

  var body: some View {
    KPublishSheet(theme: theme, model: model, onAction: onAction, letterFocus: $letterFocused, drawsHandle: false)
      .dynamicTypeSize(...DynamicTypeSize.xxLarge)
      .fixedSize(horizontal: false, vertical: true)
      .padding(.bottom, 12)
      .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { height = $0 }
      .frame(maxHeight: .infinity, alignment: .top)
      .presentationDetents([.height(height)])
      .presentationDragIndicator(.visible)
      .presentationBackground(theme.sf)
      .onAppear {
        // VoiceOver to the first choice once the sheet is up
        Task { @MainActor in
          try? await Task.sleep(for: .milliseconds(450))
          letterFocused = true
        }
      }
  }
}

/// The rows the bar grows around (P2): Wren's line for a new reader, the reader's draft when there
/// is one (owner's audit, 2026-11-10), then Letter and Note.
/// The glass, the growing and the clip are KTabBar's; this is only what is inside.
struct KPublishTray: View {
  let theme: KTheme
  let model: KPublishSheetModel
  let open: Bool
  let onAction: (String) -> Void

  @AccessibilityFocusState private var letterFocused: Bool
  @AccessibilityFocusState private var draftFocused: Bool

  /// the draft row shows: the holder sent its title
  private var hasDraft: Bool { !model.draftTitle.isEmpty }

  var body: some View {
    VStack(spacing: KPublishMetrics.trayGap) {
      // Wren asks, for the new reader's first three opens: her picture, then the line
      if !model.ask.isEmpty {
        HStack(spacing: 10) {
          KImage(model.bird, size: CGSize(width: 27, height: 30), contentMode: .fit, placeholder: .clear)
            .accessibilityHidden(true)
          Text(model.ask)
            .italic()
            .kText(.system(17, lineHeight: 1.3))
            .foregroundStyle(theme.ink)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 6)
        .padding(.top, 4)
        .padding(.bottom, 2)
      }
      // the reader's unsent letter, above Letter: a draft is a letter, so it wears the letter's
      // pair; its first words stay on one line, and the figure (several drafts) isn't spoken
      if hasDraft {
        row(
          key: KPublishAction.draft,
          art: KPublishArt.draft,
          tile: KPublishMetrics.letterTile,
          ink: KPublishMetrics.letterInk,
          title: model.draftTitle,
          titleColor: theme.isDark ? theme.ind : KPublishMetrics.letterInk,
          sub: model.draftSub,
          trailing: model.draftCount,
          out: false,
          subOnOneLine: true,
          trailingSpoken: false
        )
        .accessibilityFocused($draftFocused)
      }
      row(
        key: KPublishAction.letter,
        art: KPublishArt.letter,
        tile: KPublishMetrics.letterTile,
        ink: KPublishMetrics.letterInk,
        title: model.letterTitle,
        titleColor: theme.isDark ? theme.ind : KPublishMetrics.letterInk,
        sub: model.letterSub,
        trailing: model.letterLeft,
        out: model.letterOut
      )
      .accessibilityFocused($letterFocused)
      row(
        key: KPublishAction.note,
        art: KPublishArt.note,
        tile: KMood.calm.fill,
        ink: KMood.calm.ink,
        title: model.noteTitle,
        titleColor: theme.isDark ? KMood.calm.fill : KMood.calm.ink,
        sub: model.noteSub,
        trailing: "",
        out: false
      )
    }
    .padding(KPublishMetrics.trayInset)
    .onChange(of: open) { _, isOpen in
      guard isOpen else { return }
      // VoiceOver to the first choice once the bar has grown: the draft when there is one
      Task { @MainActor in
        try? await Task.sleep(for: .milliseconds(450))
        if hasDraft {
          draftFocused = true
        } else {
          letterFocused = true
        }
      }
    }
  }

  /// One row: the tile, the title over its sub-line, the count on the right if there is one.
  /// subOnOneLine keeps the sub-line to one line, cut with an ellipsis (the draft's first words;
  /// the other rows wrap theirs); trailingSpoken false keeps the figure out of VoiceOver's reading.
  private func row(
    key: String,
    art: Path,
    tile: Color,
    ink: Color,
    title: String,
    titleColor: Color,
    sub: String,
    trailing: String,
    out: Bool,
    subOnOneLine: Bool = false,
    trailingSpoken: Bool = true
  ) -> some View {
    let shape = RoundedRectangle(cornerRadius: KPublishMetrics.trayRowCorner, style: .continuous)
    return Button {
      onAction(key)
    } label: {
      HStack(spacing: 12) {
        KPublishGlyphShape(art: art)
          .stroke(ink, style: StrokeStyle(lineWidth: 1.9 * 22 / KPublishArt.grid, lineCap: .round, lineJoin: .round))
          .frame(width: 22, height: 22)
          .frame(width: KPublishMetrics.trayTile, height: KPublishMetrics.trayTile)
          .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(tile))
          .accessibilityHidden(true)
        VStack(alignment: .leading, spacing: 1) {
          Text(title)
            .kText(.system(16, .semibold))
            .foregroundStyle(titleColor)
            .fixedSize(horizontal: false, vertical: true)
          Text(sub)
            .kText(.system(13))
            .foregroundStyle(theme.isDark ? theme.sub : KPublishMetrics.traySub)
            // one line, cut with an ellipsis, or as many as it takes
            .lineLimit(subOnOneLine ? 1 : nil)
            .truncationMode(.tail)
            .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        if !trailing.isEmpty {
          Text(trailing)
            .kText(.mono(10, .medium, tracking: 0.12))
            .foregroundStyle(out ? KPublishMetrics.outRed : theme.mute)
            .lineLimit(1)
            .fixedSize()
            .accessibilityHidden(!trailingSpoken)
        }
      }
      // 60 tall, taller only for large text
      .padding(.leading, 11)
      .padding(.trailing, 14)
      .padding(.vertical, 8)
      .frame(maxWidth: .infinity, minHeight: KPublishMetrics.trayRow)
      .contentShape(shape)
      // one element: "Write a letter, Wren carries it to a stranger, 3 LEFT, button"
      .accessibilityElement(children: .combine)
    }
    .buttonStyle(KPublishTrayRowStyle(theme: theme, shape: shape))
  }
}

/// The tray rows' ground: translucent white on the glass, lighter while pressed (Midnight: a
/// faint white lift, a little more pressed).
private struct KPublishTrayRowStyle: ButtonStyle {
  let theme: KTheme
  let shape: RoundedRectangle

  func makeBody(configuration: Configuration) -> some View {
    let fill: Color = theme.isDark
      ? Color.white.opacity(configuration.isPressed ? 0.18 : 0.10)
      : Color.white.opacity(configuration.isPressed ? 0.55 : 0.75)
    return configuration.label
      .background(shape.fill(fill))
      .animation(KMotion.press, value: configuration.isPressed)
  }
}

/// The tray's drawings on a 24 grid: the design's own two (P2 Prompt 1), and the draft row's.
enum KPublishArt {
  static let grid: CGFloat = 24
  /// an envelope
  static let letter = KSVGPath.path("M3 6h18v12H3z M3 7l9 7 9-7")
  /// a page with a folded corner and two lines
  static let note = KSVGPath.path("M6 3h12v14l-4 4H6z M14 21v-4h4 M9 8h6 M9 12h6")
  /// a pencil, its point down on the line it has started (the draft row; owner's audit,
  /// 2026-11-10): drawn in the other two's hand, straight strokes with round joins
  static let draft = KSVGPath.path("M4 20l1-4.5L16 4.5l3.5 3.5L8.5 19z M13.5 7l3.5 3.5 M13 20h7")
}

/// A path on the tray's 24 grid, drawn to whatever frame it is given.
struct KPublishGlyphShape: Shape {
  let art: Path

  func path(in rect: CGRect) -> Path {
    art.applying(CGAffineTransform(scaleX: rect.width / KPublishArt.grid, y: rect.height / KPublishArt.grid))
  }
}

/// The returning reader's two buttons, in the stage's whole frame: they come out from behind the
/// + and go back there.
struct KPublishPop: View {
  let theme: KTheme
  let model: KPublishPopModel
  let open: Bool
  /// the bar's bottom edge above the frame's (KTabBarMetrics.bottomGap)
  let barGap: CGFloat
  let onAction: (String) -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @AccessibilityFocusState private var letterFocused: Bool

  var body: some View {
    GeometryReader { geo in
      let w = geo.size.width
      let barTop = geo.size.height - barGap - KTabBarMetrics.height
      // the +'s centre, where both wait
      let plus = CGPoint(x: w / 2, y: barTop + KTabBarMetrics.height / 2)
      ZStack {
        label(model.letterLabel, sub: model.letterLeft, x: w / 2 - KPublishMetrics.popSide, discCentreY: plus.y - KPublishMetrics.popRise, fadeDelay: 0.15)
        label(model.noteLabel, sub: "", x: w / 2 + KPublishMetrics.popSide, discCentreY: plus.y - KPublishMetrics.popRise, fadeDelay: 0.2)
        disc(.envelope, lineWidth: 1.9, a11y: model.letterA11y, side: -1, key: KPublishAction.letter, at: plus, flyDelay: open ? 0 : 0.05)
          .accessibilityFocused($letterFocused)
        disc(.ruledCard, lineWidth: 1.9 * 24 / 28, a11y: model.noteA11y, side: 1, key: KPublishAction.note, at: plus, flyDelay: open ? 0.05 : 0)
      }
    }
    .onChange(of: open) { _, isOpen in
      guard isOpen else { return }
      Task { @MainActor in
        try? await Task.sleep(for: .milliseconds(400))
        letterFocused = true
      }
    }
  }

  /// One disc: 64, the lav2 wash with a 1pt hairline and a soft blur shadow, the drawing 26 in
  /// ink; pressed, it shrinks to .94 (KPressScaleStyle). Placed at
  /// the +'s centre and moved out by an offset, so the flight is the same whatever the frame.
  private func disc(_ glyph: KLineGlyph, lineWidth: CGFloat, a11y: String, side: CGFloat, key: String, at plus: CGPoint, flyDelay: Double) -> some View {
    // with Reduce Motion they wait where they open, full size, and only fade
    let flies = !reduceMotion
    let out = open || !flies
    let fly = flies ? KMotion.publishPopFly.delay(flyDelay) : KMotion.publishReduced
    let fade = flies ? KMotion.publishPopFade : KMotion.publishReduced
    return Button {
      onAction(key)
    } label: {
      KLineIcon(glyph, size: 26, lineWidth: lineWidth, color: theme.ink)
        .frame(width: KPublishMetrics.popDisc, height: KPublishMetrics.popDisc)
        .background {
          Circle()
            .fill(KPublishMetrics.popFill(for: theme))
            .overlay(Circle().strokeBorder(KPublishMetrics.popRim(for: theme), lineWidth: 1))
            .kSoftShadows(KPublishMetrics.popShadow(for: theme), in: Circle())
        }
        .contentShape(Circle())
    }
    .buttonStyle(KPressScaleStyle())
    .animation(fly) {
      $0
        .scaleEffect(out ? 1 : KPublishMetrics.popClosedScale)
        .offset(x: out ? side * KPublishMetrics.popSide : 0, y: out ? -KPublishMetrics.popRise : 0)
    }
    .animation(fade) { $0.opacity(open ? 1 : 0) }
    .position(plus)
    .allowsHitTesting(open)
    .accessibilityLabel(a11y)
    .accessibilityHidden(!open)
  }

  /// A disc's label, centred 10 under where the disc opens. It doesn't fly: it fades in after the
  /// disc has left (150 / 200ms), and out at once.
  private func label(_ text: String, sub: String, x: CGFloat, discCentreY: CGFloat, fadeDelay: Double) -> some View {
    let fade = reduceMotion ? KMotion.publishReduced : KMotion.publishPopFade.delay(fadeDelay)
    return Color.clear
      .frame(width: 0, height: 0)
      .overlay(alignment: .top) {
        VStack(spacing: 3) {
          Text(text)
            .kText(.system(13, .medium))
            .foregroundStyle(theme.sub)
          // the letters left today under LETTER, in the sheet's letter-row style (mono 500 10, mute)
          if !sub.isEmpty {
            Text(sub)
              .kText(.mono(10, .medium, tracking: 0.12))
              .foregroundStyle(theme.mute)
          }
        }
        .lineLimit(1)
        .fixedSize()
        .dynamicTypeSize(...DynamicTypeSize.large)
      }
      .animation(open ? fade : KMotion.publishPopFade) { $0.opacity(open ? 1 : 0) }
      .position(x: x, y: discCentreY + KPublishMetrics.popDisc / 2 + KPublishMetrics.popLabelGap)
      .allowsHitTesting(false)
      .accessibilityHidden(true)
  }
}

/*
 THE STAGE: the tab bar with what its + opens, as one view filling the space it is given, laid
 out from the bottom up, the way the mocks stack them (10a H:117, 128, 129; Today 3d Prompt 8;
 P2), back to front:
 - the dim, over everything it is given. A tap on it closes; VoiceOver reads it as a close
   button, and the escape gesture (two-finger scrub) closes too. Its strength is the style's
   (KDim.publish); for grow, a thin material at part strength under it blurs the page a little;
 - cards: the 10a sheet, 12 in from each side, its bottom 12 above the bar's top. In the mock
   that is bottom 104 = the bar's 30 + 62 + 12, and here it follows the bar wherever the safe
   area puts it. It rises from 24 lower at .94 of its size, scaling from its bottom edge, over
   .45s on a curve that overshoots, and fades in over .25s; closing plays the same backwards.
   With Reduce Motion on it only fades;
 - pop: the returning reader's two buttons, under the bar so they come out from behind the +;
 - the bar (KTabBarMetrics.bottomGap above the bottom edge), over the dim so the × stays live
   and undimmed (the new reader's sheet, an iOS sheet, covers it). For grow it carries the tray
   and grows around it, upward from where it sits. While the holder says
   barHidden (Today's reply, the chat composers' A1, owner 2026-10-18: the reader writing back
   to a letter has the keyboard and the reply bar where the tab bar was) it does the same, 160
   down out of sight and reach over .35s, and comes back up when the reply ends;
 - sheet: the new reader's sheet, presented as an iOS sheet over the window (no dim of ours).

 The sheets, the buttons, the tray and the dim are always there, only transparent and
 untouchable while closed. That keeps them out of VoiceOver while closed, and it means the whole stage only needs
 the full screen while something is open or closing: the holder can give it just the bar's strip
 the rest of the time (see src/components/NativeTabBar.tsx, which does). Everything is anchored
 to the bottom edge, so growing or shrinking the space from the top moves nothing.

 The 10a sheet's text grows with Dynamic Type up to accessibility size 1 and the new reader's
 sheet up to xxLarge, so neither can run off the top of a phone; the bar holds its own size
 (KTabBar).

 safeAreaBottom is the screen's bottom inset. The stage ignores safe areas itself, so the
 keyboard coming up never lifts the bar (it goes under the keyboard, as the React Native bar
 does).
 */
public struct KTabStage: View {
  private let theme: KTheme
  private let items: [KTabItem]
  private let selectedIndex: Int?
  private let isPanelOpen: Bool
  private let plusLabel: String
  private let closeLabel: String
  private let panelTitle: String
  private let panelLink: KPlusPanelLink?
  private let cards: [KPlusPanelCard]
  private let safeAreaBottom: CGFloat
  private let style: KPublishStyle
  private let sheet: KPublishSheetModel
  private let pop: KPublishPopModel
  private let barHidden: Bool
  private let plusRaised: Bool
  private let rail: Bool
  private let railTop: CGFloat
  private let onSelect: (Int) -> Void
  private let onPlus: () -> Void
  private let onPanelAction: (String) -> Void
  private let onDismiss: () -> Void
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /// the new reader's sheet: the choice tapped, held until the sheet has gone down
  @State private var chosen: String?
  /* THE + OPENS ONE PASS AFTER THE HOST IS THE WHOLE SCREEN (owner on TestFlight 1.2.8,
     2026-11-10: "not as smooth as P2; sometimes Write a letter and Daily note come down from
     the top"). While the + is closed the Host is only the bar's strip; to open, React Native
     makes it the whole screen and then sets panelOpen. If that resize and the opening reach
     SwiftUI in one pass, the bar's own animations (its height, its tray) also animate where
     everything sits, from the strip's layout, whose top is the top of the screen. React Native
     already waits a layout event and a frame before it opens, but its layout event can come
     before the native view has really been resized, so the race was narrowed, not closed.
     Here it is closed: this view watches its own height, and what it shows as open is the
     prop held back until that height is the screen's, and then one more turn of the run loop,
     so the resize is laid out, unanimated, before anything opens. Closing is never held back. */
  @State private var stageTall = false
  /// the stage's height: on the rail, the band's (how many of the page's tools fit in it)
  @State private var stageHeight: CGFloat = 0
  @State private var shownOpen = false
  /// an opening is waiting for its turn of the run loop; a close that arrives first cancels it
  @State private var opening = false

  /// - Parameters:
  ///   - items, selectedIndex, plusLabel, closeLabel, onSelect, onPlus: the bar's (KTabBar)
  ///   - isPanelOpen: what the + opens is showing, and the + is an ×
  ///   - panelTitle, panelLink, cards: the 10a sheet's (KPlusPanel), for the cards style
  ///   - safeAreaBottom: the screen's bottom safe-area inset
  ///   - style: what the + opens (cards by default, as before the publish entry)
  ///   - sheet: the publish entry's words, for the sheet style and the grown bar's tray
  ///   - pop: the returning reader's buttons, for the pop style
  ///   - barHidden: the bar steps away (slides 160 down out of sight; a fade under Reduce
  ///     Motion), whatever the + is doing: Today's reply has the bottom of the screen
  ///   - plusRaised: the + stands proud of the bar (KTabBar raised); the Host's strip must be
  ///     KTabBarMetrics.plusHeadroom taller for it
  ///   - rail: the bar stands upright at the stage's right edge (KTabBarMetrics, THE RAIL: a
  ///     folding phone's band), on the bottom safe area: the tabs, and under them the + on its own
  ///   - railTop: where the system's own status area ends at the top of the band
  ///   - onPanelAction: a choice was tapped, with its key: a card's or the header link's
  ///     (cards), or KPublishAction.letter / .note (sheet, pop and grow)
  ///   - onDismiss: the dim was tapped, VoiceOver's escape, or the sheet was dragged down; the
  ///     holder closes
  public init(
    theme: KTheme,
    items: [KTabItem],
    selectedIndex: Int?,
    isPanelOpen: Bool,
    plusLabel: String,
    closeLabel: String,
    panelTitle: String,
    panelLink: KPlusPanelLink? = nil,
    cards: [KPlusPanelCard],
    safeAreaBottom: CGFloat,
    style: KPublishStyle = .cards,
    sheet: KPublishSheetModel = .init(),
    pop: KPublishPopModel = .init(),
    barHidden: Bool = false,
    plusRaised: Bool = false,
    rail: Bool = false,
    railTop: CGFloat = 0,
    onSelect: @escaping (Int) -> Void,
    onPlus: @escaping () -> Void,
    onPanelAction: @escaping (String) -> Void,
    onDismiss: @escaping () -> Void
  ) {
    self.theme = theme
    self.items = items
    self.selectedIndex = selectedIndex
    self.isPanelOpen = isPanelOpen
    self.plusLabel = plusLabel
    self.closeLabel = closeLabel
    self.panelTitle = panelTitle
    self.panelLink = panelLink
    self.cards = cards
    self.safeAreaBottom = safeAreaBottom
    self.style = style
    self.sheet = sheet
    self.pop = pop
    self.barHidden = barHidden
    self.plusRaised = plusRaised
    self.rail = rail
    self.railTop = railTop
    self.onSelect = onSelect
    self.onPlus = onPlus
    self.onPanelAction = onPanelAction
    self.onDismiss = onDismiss
  }

  public var body: some View {
    let gap = KTabBarMetrics.bottomGap(safeAreaBottom: safeAreaBottom)
    let open = shownOpen
    // the new reader's sheet is the system's, with the system's dim: this stage draws none for it
    let dims = open && style != .sheet
    // with Reduce Motion the 10a sheet only fades: no rise, no overshoot
    let rises = !reduceMotion
    // read here: the geometry closure below runs off the main actor
    let upright = rail
    // ── the dim. It is also the stage's frame: a colour takes exactly the space it is offered,
    // and everything else hangs off its bottom edge as overlays, which add nothing to its size.
    // So the stage is never bigger than its Host, even while the Host is only the bar's strip
    // and a sheet, closed and invisible, reaches far above it. (A root view bigger than its
    // hosting view can be centred in it instead of pinned, and the bar would drop.)
    KDim.publish(style, for: theme)
      // the grown bar's blur of the page, under its dim (P2: blur 6)
      .background {
        if style == .grow {
          Rectangle().fill(.ultraThinMaterial).opacity(KDim.growBlur)
        }
      }
      // only the dim's opacity is animated. This colour is the stage's frame: with an
      // .animation(_:value:) on it, its SIZE was animated too when the Host grew from the bar's
      // strip to the whole screen in the pass that opened the +, and everything hung from its
      // bottom edge (the bar, the tray's rows) rode down from the top of the screen (owner on
      // TestFlight 1.2.8, 2026-11-10; the same thing b32 showed before the Host was made to grow
      // first, which narrowed the race without closing it)
      .animation(KMotion.dimFade) { $0.opacity(dims ? 1 : 0) }
      // the stage is the Host's size: taller than any bar's strip means the whole screen
      // (on the rail the Host is the band, as tall as the window: wider than any band, then)
      .onGeometryChange(for: Bool.self) { upright ? $0.size.width > 200 : $0.size.height > 320 } action: { stageTall = $0 }
      // the band's height, for how many of the page's own tools the rail has room for
      .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { stageHeight = $0 }
      .onChange(of: isPanelOpen && stageTall, initial: true) { _, want in
        if want {
          opening = true
          DispatchQueue.main.async {
            if opening { shownOpen = true }
            opening = false
          }
        } else {
          opening = false
          shownOpen = false
        }
      }
      .contentShape(Rectangle())
      .onTapGesture(perform: onDismiss)
      .allowsHitTesting(dims)
      .accessibilityElement()
      .accessibilityLabel(closeLabel)
      .accessibilityAddTraits(.isButton)
      .accessibilityAction { onDismiss() }
      .accessibilityHidden(!dims)
      // ── the 10a sheet (H:129), at its own height whatever room it is offered ──
      .overlay(alignment: .bottom) {
        if style == .cards && !rail {
          KPlusPanel(theme: theme, title: panelTitle, link: panelLink, cards: cards, onAction: onPanelAction)
            .dynamicTypeSize(...DynamicTypeSize.accessibility1)
            .fixedSize(horizontal: false, vertical: true)
            .animation(KMotion.panelRise) {
              $0
                .scaleEffect(open || !rises ? 1 : 0.94, anchor: .bottom)
                .offset(y: open || !rises ? 0 : 24)
            }
            .animation(KMotion.panelFade) { $0.opacity(open ? 1 : 0) }
            .allowsHitTesting(open)
            .accessibilityHidden(!open)
            .padding(.horizontal, 12)
            .padding(.bottom, gap + KTabBarMetrics.height + 12)
        }
      }
      // ── the returning reader's buttons, behind the bar ──
      .overlay {
        if style == .pop && !rail {
          KPublishPop(theme: theme, model: pop, open: open, barGap: gap, onAction: onPanelAction)
        }
      }
      // ── the bar (H:117), over the dim; on a folding phone the rail, at the foot of the band ──
      .overlay(alignment: rail ? .bottomTrailing : .bottom) {
        KTabBar(
          theme: theme,
          items: items,
          selectedIndex: selectedIndex,
          isPanelOpen: open,
          plusLabel: plusLabel,
          closeLabel: closeLabel,
          // the publish entry turns its + on the design's own curve; the 10a sheet keeps its own
          plusTurn: style == .cards ? KMotion.plusTurn : style == .grow ? KMotion.plusTurnGrow : KMotion.plusTurnPublish,
          // Today's reply has the screen's foot (the new reader's sheet covers the bar itself)
          hidden: barHidden,
          raised: plusRaised,
          rail: rail,
          toolSlots: rail && stageHeight > 0
            ? KTabBarMetrics.railToolSlots(height: stageHeight, top: railTop, foot: max(safeAreaBottom, 16) + KTabBarMetrics.railFoot, tabs: items.count)
            : 0,
          // the grown bar's rows (P2): the bar itself grows around them
          tray: style == .grow ? AnyView(KPublishTray(theme: theme, model: sheet, open: open, onAction: onPanelAction)) : nil,
          onSelect: onSelect,
          onPlus: onPlus
        )
        .padding(.horizontal, rail ? 0 : KTabBarMetrics.sideInset)
        // the rail: in the middle of the band, standing on the bottom safe area (the + lowest,
        // in the corner the thumb rests on), and never up into the system's clock
        .padding(.bottom, rail ? max(safeAreaBottom, 16) + KTabBarMetrics.railFoot : gap)
        .padding(.trailing, rail ? KTabBarMetrics.railEdge : 0)
        .padding(.top, rail ? railTop : 0)
      }
      .ignoresSafeArea()
      // ── the new reader's sheet: an iOS sheet, rising from the bottom of the window. A choice
      // closes it first and is handed over once it is down, so the composer slides in on a clear
      // screen instead of the sheet going down over it (owner, 2026-10-26). A drag down or a tap
      // on the system's dim closes it as the dim here does. ──
      .sheet(
        isPresented: Binding(
          get: { style == .sheet && open },
          set: { shown in
            if !shown && open { onDismiss() }
          }
        ),
        onDismiss: {
          guard let key = chosen else { return }
          chosen = nil
          onPanelAction(key)
        }
      ) {
        KPublishNativeSheet(theme: theme, model: sheet) { key in
          chosen = key
          onDismiss()
        }
      }
      // a container of its own, so VoiceOver's escape reaches it from any element inside
      .accessibilityElement(children: .contain)
      .accessibilityAction(.escape) {
        if open { onDismiss() }
      }
  }
}
