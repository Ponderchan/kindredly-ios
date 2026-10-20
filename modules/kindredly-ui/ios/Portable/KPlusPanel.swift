// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.
// The Expo side lives in Adapters/KTabBarView.swift; ui-lab shows it (kindredly:///ui-lab).

import SwiftUI

/*
 WHAT THE + OPENS. Three ways (KPublishStyle), chosen by whoever holds the bar:
 - cards: the 10a composer sheet below (KPlusPanel), rising just above the tab bar over a dimmed
   screen. ui-lab keeps it;
 - sheet and pop: the publish entry of Today 3d × 25b (design Prompt 8), by the tab it is pressed
   on (owner, 2026-10-18): on Today, where the reader is reading, two round buttons pop from
   behind the + just above the letter's band; on every other tab, a bottom sheet where Wren asks
   who this one is for. Both are further down this file (KPublishSheet, KPublishPop), and the
   stage that puts any of them on screen is KTabStage at the end.

 THE 10a CARDS (H:128-135). The sheet is drawn like an InkCard, not like a float: sf, a 2.5 ln
 outline, corners of 28 and a hard 6/6 ln shadow, padding 16 inside the outline (border-box),
 its pieces 10 apart (H:129). The prompts call for a soft popover here (P:84); the mock wins
 (tokens-10a.md §11 item 4).
 - a header row: the title as the secondary title, System 500 17 centred, as written (NEW in the
   mock, H:130, there in mono capitals; titles are System, owner 2026-10-20), and on the right, if
   one is given, a link in ind, System 600 14 (the mock's RECENT ›; a link is a button);
 - the choices as KChoiceCards, two to a row, 10 apart (H:131-133, Kit/KChoiceCard.swift):
   corners of 18, a 2pt ln outline, a hard 3/3 ln shadow, the glyph 28 across, the title and the
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
    // padding 16 inside the 2.5 outline (border-box)
    .padding(16 + InkCardMetrics.borderWidth)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background {
      KStickerBackground(
        shape: RoundedRectangle(cornerRadius: 28, style: .circular),
        fill: theme.sf,
        stroke: theme.ln,
        lineWidth: InkCardMetrics.borderWidth,
        shadow: theme.ln,
        shadowOffset: 6
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
 ══ THE PUBLISH ENTRY (Today 3d × 25b, design Prompt 8) ══════════════════════════════════════

 The + is where a reader writes, and it opens by who they are (src/lib/publish-stage.ts decides,
 the holder passes the style):

 SHEET, for a new reader (signed up seven days ago or less, or Wren still a chick):
 - the dim is the composer's (.3; Midnight black .45), and the bar slides down 160 out of the
   way on the publish turn's curve (KTabBar hidden);
 - the sheet is pinned to the bottom, full width: sf, top corners of 28, a soft shadow above
   (0 -10 30 -12 rgba(30,27,53,.35); Midnight black .5 and a 1pt line edge, as KFloat's), padding
   0 20. It grows from 0 to 350 (or to its content and the home-indicator inset, if that is
   taller) over .45s on cubic-bezier(.3,1,.3,1), its content held at the top and clipped, so it
   reads as the sheet being pulled up rather than sliding in;
 - inside, top to bottom: a 40 × 6 handle in line, 10 down; 16 below it Wren 44 (the user's own,
   from the caller's snapshot) and 12 beside her the ask in the Letter font's italic 17/1.3;
   18 below, the letter row; 10 below, the note row; 14 below, the footnote in mono 9 at .14em,
   faint, centred;
 - the letter row: 72 tall, a 2.5 ln outline, corners of 20, a hard 3/3 ln shadow, padding 0 16
   inside the outline, its pieces 14 apart: a 44 ink disc holding the envelope 22 in bg; the
   title in system 600 16 with the subtitle 2 below in system 13 sub; on the right, if the
   caller gives one, the letters left in mono 500 10 at .12em, mute. Pressed, the face moves
   (2,2) and the shadow, which stays where it was, reads 1/1;
 - the note row: 72 tall, soft, a 2.5 ln outline, corners of 20, no shadow: a 44 sf disc with a
   2 ln outline holding the ruled card 22 in ink, then the title and subtitle. Pressed, its fill
   turns soft2;
 - it closes on a tap on the dim, VoiceOver's escape, or a drag down on the sheet past 80; each
   is onDismiss. Its text grows with Dynamic Type up to xxLarge.

 POP, for a returning reader:
 - the dim is lighter (.22; Midnight black .33, KDim.publishPop), and the bar stays: its + turns
   to an × on the publish curve, .35s cubic-bezier(.3,1.3,.4,1);
 - two 64 discs, sf with a 2.5 ln outline and a hard 3/3 ln shadow, each holding a 28 drawing in
   ink (the envelope, the ruled card). Closed, both sit at the +'s centre at .4 and transparent,
   under the bar, so they come out from behind it. Open, LETTER goes to 86 left of the + and NOTE
   86 right of it, 91 up (centres at the bar's top − 60), at full size, over .4s on
   cubic-bezier(.3,1.3,.4,1), NOTE 50ms after LETTER. At 393 that is centres 110 and 282 at y
   700: the design's left 78 / 250, top 668. Closing plays it backwards, NOTE first;
 - their labels sit centred 10 under each disc, mono 600 10 at .14em in ink, and fade in 150 and
   200ms after the discs start (opacity .2s); closing, they fade at once;
 - VoiceOver reads the two as buttons with the caller's spoken names (the sheet's titles); the
   labels are hidden from it. The labels' Dynamic Type stops at large.

 Reduce Motion: the sheet and the buttons only fade (no growth, no flight, no overshoot), and
 the bar fades instead of sliding. Opening either moves VoiceOver to the letter choice.

 Every word arrives translated; the bird arrives as the caller's snapshot. Nothing here holds a
 word or a picture of its own.
 */

/// What the + opens.
public enum KPublishStyle: String, Sendable {
  /// the 10a composer sheet of cards over the bar (KPlusPanel); ui-lab keeps it
  case cards
  /// the bottom sheet, Wren asking who this one is for (every tab but Today)
  case sheet
  /// the two round buttons popping from behind the + (Today)
  case pop
}

/// The new reader's sheet: every word already translated.
public struct KPublishSheetModel: Equatable, Sendable {
  /// Wren's question, beside her ("Who's this one for?")
  public var ask = ""
  /// the letter row's title and subtitle
  public var letterTitle = ""
  public var letterSub = ""
  /// the letters left today on the letter row's right ("3 LEFT"); "" hides it
  public var letterLeft = ""
  /// the note row's title and subtitle
  public var noteTitle = ""
  public var noteSub = ""
  /// the line under the rows
  public var footnote = ""
  /// the user's own Wren beside the question; nil keeps her frame empty while she loads
  public var bird: KImageRef? = nil

  public init() {}
}

/// The returning reader's two buttons: every word already translated.
public struct KPublishPopModel: Equatable, Sendable {
  /// the labels under the discs (LETTER, NOTE)
  public var letterLabel = ""
  public var noteLabel = ""
  /// what VoiceOver says for each disc (the sheet's titles: "Write a letter", "Diary note")
  public var letterA11y = ""
  public var noteA11y = ""
  /// the free plan's letters left today, under LETTER ("3 LEFT"); "" hides it — the same count
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
}

public extension KDim {
  /// The pop's dim: rgba(30,27,53,.22) in the light themes, lighter than the sheet's, as the
  /// design has it (the bar stays, so less of the screen needs to step back).
  static let publishPop = Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 0.22)
  /// Midnight's: black at .33, stepping down from the composer's .45 by the same ratio.
  static let publishPopDark = Color.black.opacity(0.33)

  /// The dim the + spreads over the screen in this theme, for this style.
  static func publish(_ style: KPublishStyle, for theme: KTheme) -> Color {
    switch style {
    case .cards, .sheet: return composer(for: theme)
    case .pop: return theme.isDark ? publishPopDark : publishPop
    }
  }
}

public extension KMotion {
  /// The new reader's sheet growing from nothing: height .45s cubic-bezier(.3,1,.3,1).
  static let publishSheetGrow = Animation.timingCurve(0.3, 1, 0.3, 1, duration: 0.45)
  /// The returning reader's buttons flying out and back: .4s cubic-bezier(.3,1.3,.4,1).
  static let publishPopFly = Animation.timingCurve(0.3, 1.3, 0.4, 1, duration: 0.4)
  /// Their opacity: .2s, CSS's default ease.
  static let publishPopFade = Animation.timingCurve(0.25, 0.1, 0.25, 1, duration: 0.2)
  /// Everything in the publish entry with Reduce Motion on: a plain fade.
  static let publishReduced = Animation.easeInOut(duration: 0.2)
}

/// The publish entry's numbers.
enum KPublishMetrics {
  /// the sheet's least height (it grows past it for large text)
  static let sheetMinHeight: CGFloat = 350
  /// the sheet's top corners
  static let sheetCorner: CGFloat = 28
  /// a drag down past this closes the sheet
  static let dismissDrag: CGFloat = 80
  /// the rows' height and corners
  static let rowHeight: CGFloat = 72
  static let rowCorner: CGFloat = 20
  /// the outline of the rows and the pop discs
  static let outline: CGFloat = 2.5
  /// the pop discs
  static let popDisc: CGFloat = 64
  /// each pop disc's centre from the +'s: 86 to the side, 91 up (the bar's top − 60)
  static let popSide: CGFloat = 86
  static let popRise: CGFloat = 91
  /// a closed disc's size
  static let popClosedScale: CGFloat = 0.4
  /// the label's top under its disc
  static let popLabelGap: CGFloat = 10

  /// The sheet's soft shadow: 0 -10 30 -12 rgba(30,27,53,.35); black at .5 in Midnight, where
  /// the navy would light the page rather than shade it (see KSoftShadow.floatDark).
  static func sheetShadow(for theme: KTheme) -> [KSoftShadow] {
    let color = theme.isDark
      ? Color.black.opacity(0.5)
      : Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 0.35)
    return [KSoftShadow(y: -10, blur: 30, spread: -12, color: color)]
  }
}

/// The new reader's sheet, its content only: the handle, Wren's question and the two rows.
/// KPublishSheetLayer gives it its face, its growth and its drag.
struct KPublishSheet: View {
  let theme: KTheme
  let model: KPublishSheetModel
  let onAction: (String) -> Void
  var letterFocus: AccessibilityFocusState<Bool>.Binding

  var body: some View {
    VStack(spacing: 0) {
      // the handle: 40 × 6 in line, 10 from the top
      Capsule()
        .fill(theme.line)
        .frame(width: 40, height: 6)
        .padding(.top, 10)
        .accessibilityHidden(true)

      // Wren and her question, 16 below
      HStack(spacing: 12) {
        KImage(model.bird, size: CGSize(width: 44, height: 44), contentMode: .fit, placeholder: .clear)
          .accessibilityHidden(true)
        Text(model.ask)
          .kText(.content(17, italic: true, lineHeight: 1.3))
          .foregroundStyle(theme.ink)
          .fixedSize(horizontal: false, vertical: true)
          .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(.top, 16)

      // the two rows, 18 below and 10 apart
      VStack(spacing: 10) {
        letterRow
        noteRow
      }
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
        // a 44 ink disc with the envelope 22 in bg (stroke 2 of the design's 24)
        KLineIcon(.envelope, size: 22, lineWidth: 2, color: theme.bg)
          .frame(width: 44, height: 44)
          .background(Circle().fill(theme.ink))
      }
    }
    .buttonStyle(KPublishRowStyle(theme: theme, raised: true))
    .accessibilityFocused(letterFocus)
  }

  private var noteRow: some View {
    Button {
      onAction(KPublishAction.note)
    } label: {
      row(title: model.noteTitle, sub: model.noteSub, trailing: "") {
        // a 44 sf disc, a 2 ln outline, the ruled card 22 in ink (stroke 2 of its 28)
        KLineIcon(.ruledCard, size: 22, lineWidth: 2 * 24 / 28, color: theme.ink)
          .frame(width: 44, height: 44)
          .background(Circle().fill(theme.sf))
          .overlay(Circle().strokeBorder(theme.ln, lineWidth: 2))
      }
    }
    .buttonStyle(KPublishRowStyle(theme: theme, raised: false))
  }

  /// A row's inside: the disc, the two lines, and the count on the right if there is one.
  private func row<Disc: View>(title: String, sub: String, trailing: String, @ViewBuilder disc: () -> Disc) -> some View {
    HStack(spacing: 14) {
      disc()
        .accessibilityHidden(true)
      VStack(alignment: .leading, spacing: 2) {
        Text(title)
          .kText(.system(16, .semibold))
          .foregroundStyle(theme.ink)
          .fixedSize(horizontal: false, vertical: true)
        Text(sub)
          .kText(.system(13))
          .foregroundStyle(theme.sub)
          .fixedSize(horizontal: false, vertical: true)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      if !trailing.isEmpty {
        Text(trailing)
          .kText(.mono(10, .medium, tracking: 0.12))
          .foregroundStyle(theme.mute)
          .lineLimit(1)
          .fixedSize()
      }
    }
    // padding 0 16 inside the 2.5 outline (border-box); 72 tall, taller only for large text
    .padding(.horizontal, 16 + KPublishMetrics.outline)
    .padding(.vertical, 8 + KPublishMetrics.outline)
    .frame(maxWidth: .infinity, minHeight: KPublishMetrics.rowHeight)
    .contentShape(RoundedRectangle(cornerRadius: KPublishMetrics.rowCorner, style: .circular))
    // one element: "Write a letter, Wren carries it to a stranger, 3 LEFT, button"
    .accessibilityElement(children: .combine)
  }
}

/*
 The rows' press. The letter row is a sticker whose face moves (2,2) onto its 3/3 shadow, which
 stays put, so the shadow reads 1/1 while the finger is down (the design's style-active). The
 note row has no shadow; its fill turns soft2 instead.
 */
private struct KPublishRowStyle: ButtonStyle {
  let theme: KTheme
  let raised: Bool

  func makeBody(configuration: Configuration) -> some View {
    let shape = RoundedRectangle(cornerRadius: KPublishMetrics.rowCorner, style: .circular)
    let pressed = configuration.isPressed
    if raised {
      configuration.label
        .background {
          ZStack {
            shape.fill(theme.sf)
            shape.strokeBorder(theme.ln, lineWidth: KPublishMetrics.outline)
          }
        }
        .animation(KMotion.press) { $0.offset(x: pressed ? 2 : 0, y: pressed ? 2 : 0) }
        // drawn after the offset, so it stays where it is while the face moves onto it
        .background { shape.fill(theme.ln).offset(x: 3, y: 3) }
    } else {
      configuration.label
        .background {
          ZStack {
            shape.fill(pressed ? theme.soft2 : theme.soft)
            shape.strokeBorder(theme.ln, lineWidth: KPublishMetrics.outline)
          }
        }
        .animation(KMotion.press, value: pressed)
    }
  }
}

/// The new reader's sheet on screen: pinned to the bottom, growing from nothing, closed by a
/// drag down past 80. It lays itself out from the bottom edge it is given.
struct KPublishSheetLayer: View {
  let theme: KTheme
  let model: KPublishSheetModel
  let open: Bool
  let safeAreaBottom: CGFloat
  let onAction: (String) -> Void
  let onDismiss: () -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /// the content's own height, measured; the sheet is at least 350 and grows past it for it
  @State private var contentHeight: CGFloat = 0
  /// how far the finger has pulled the sheet down
  @State private var drag: CGFloat = 0
  /// a drag past the line has asked to close, and the holder hasn't closed yet
  @State private var leaving = false
  @AccessibilityFocusState private var letterFocused: Bool

  var body: some View {
    let shape = UnevenRoundedRectangle(
      topLeadingRadius: KPublishMetrics.sheetCorner,
      bottomLeadingRadius: 0,
      bottomTrailingRadius: 0,
      topTrailingRadius: KPublishMetrics.sheetCorner,
      style: .circular
    )
    let full = max(KPublishMetrics.sheetMinHeight, contentHeight + safeAreaBottom + 12)
    // with Reduce Motion it doesn't grow: it is there at full height and fades
    let grows = !reduceMotion
    let height = open || !grows ? full : 0

    KPublishSheet(theme: theme, model: model, onAction: onAction, letterFocus: $letterFocused)
      .dynamicTypeSize(...DynamicTypeSize.xxLarge)
      .fixedSize(horizontal: false, vertical: true)
      .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { contentHeight = $0 }
      // held at the top of a frame that grows: the sheet is pulled up, its content uncovered
      .frame(maxWidth: .infinity, alignment: .top)
      .frame(height: height, alignment: .top)
      .clipShape(shape)
      .background(shape.fill(theme.sf))
      .overlay {
        // Midnight's edge, as KFloat's: sf is barely off the page there
        if theme.isDark {
          shape.strokeBorder(theme.line, lineWidth: 1).allowsHitTesting(false)
        }
      }
      .kSoftShadows(KPublishMetrics.sheetShadow(for: theme), in: shape)
      .animation(grows ? KMotion.publishSheetGrow : nil, value: height)
      .offset(y: drag)
      .opacity(grows || open ? 1 : 0)
      .animation(reduceMotion ? KMotion.publishReduced : nil, value: open)
      .gesture(
        DragGesture(minimumDistance: 6)
          .onChanged { v in
            guard open, !leaving else { return }
            drag = max(0, v.translation.height)
          }
          .onEnded { v in
            guard open, !leaving else { return }
            if v.translation.height > KPublishMetrics.dismissDrag {
              // stays where the finger left it until the holder closes, then goes down from there
              leaving = true
              onDismiss()
            } else {
              withAnimation(KMotion.publishSheetGrow) { drag = 0 }
            }
          }
      )
      .allowsHitTesting(open)
      .accessibilityElement(children: .contain)
      .accessibilityHidden(!open)
      .onChange(of: open) { _, isOpen in
        leaving = false
        if isOpen {
          drag = 0
          // VoiceOver to the first choice once the sheet is up (the bar it came from has gone)
          Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(450))
            letterFocused = true
          }
        } else {
          withAnimation(grows ? KMotion.publishSheetGrow : KMotion.publishReduced) { drag = 0 }
        }
      }
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

  /// One disc: 64, sf, a 2.5 ln outline, a hard 3/3 ln shadow, the drawing 28 in ink. Placed at
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
      KLineIcon(glyph, size: 28, lineWidth: lineWidth, color: theme.ink)
        .frame(width: KPublishMetrics.popDisc, height: KPublishMetrics.popDisc)
    }
    .buttonStyle(KStickerButtonStyle(
      shape: Circle(),
      fill: theme.sf,
      stroke: theme.ln,
      lineWidth: KPublishMetrics.outline,
      shadow: theme.ln,
      shadowOffset: 3
    ))
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
            .kText(.mono(10, .semibold, tracking: 0.14))
            .foregroundStyle(theme.ink)
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
 out from the bottom up, the way the mocks stack them (10a H:117, 128, 129; Today 3d Prompt 8),
 back to front:
 - the dim, over everything it is given. A tap on it closes; VoiceOver reads it as a close
   button, and the escape gesture (two-finger scrub) closes too. Its strength is the style's
   (KDim.publish);
 - cards: the 10a sheet, 12 in from each side, its bottom 12 above the bar's top. In the mock
   that is bottom 104 = the bar's 30 + 62 + 12, and here it follows the bar wherever the safe
   area puts it. It rises from 24 lower at .94 of its size, scaling from its bottom edge, over
   .45s on a curve that overshoots, and fades in over .25s; closing plays the same backwards.
   With Reduce Motion on it only fades;
 - pop: the returning reader's two buttons, under the bar so they come out from behind the +;
 - the bar (KTabBarMetrics.bottomGap above the bottom edge), over the dim so the × stays live
   and undimmed. With the sheet open it slides down out of sight; and while the holder says
   barHidden (Today's reply, the chat composers' A1, owner 2026-10-18: the reader writing back
   to a letter has the keyboard and the reply bar where the tab bar was) it does the same, 160
   down out of sight and reach over .35s, and comes back up when the reply ends;
 - sheet: the new reader's sheet, pinned to the bottom edge over everything.

 The sheets, the buttons and the dim are always there, only transparent and untouchable while
 closed. That keeps them out of VoiceOver while closed, and it means the whole stage only needs
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
  private let onSelect: (Int) -> Void
  private let onPlus: () -> Void
  private let onPanelAction: (String) -> Void
  private let onDismiss: () -> Void
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  /// - Parameters:
  ///   - items, selectedIndex, plusLabel, closeLabel, onSelect, onPlus: the bar's (KTabBar)
  ///   - isPanelOpen: what the + opens is showing, and the + is an ×
  ///   - panelTitle, panelLink, cards: the 10a sheet's (KPlusPanel), for the cards style
  ///   - safeAreaBottom: the screen's bottom safe-area inset
  ///   - style: what the + opens (cards by default, as before the publish entry)
  ///   - sheet: the new reader's sheet, for the sheet style
  ///   - pop: the returning reader's buttons, for the pop style
  ///   - barHidden: the bar steps away (slides 160 down out of sight; a fade under Reduce
  ///     Motion), whatever the + is doing: Today's reply has the bottom of the screen
  ///   - onPanelAction: a choice was tapped, with its key: a card's or the header link's
  ///     (cards), or KPublishAction.letter / .note (sheet and pop)
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
    self.onSelect = onSelect
    self.onPlus = onPlus
    self.onPanelAction = onPanelAction
    self.onDismiss = onDismiss
  }

  public var body: some View {
    let gap = KTabBarMetrics.bottomGap(safeAreaBottom: safeAreaBottom)
    let open = isPanelOpen
    // with Reduce Motion the 10a sheet only fades: no rise, no overshoot
    let rises = !reduceMotion
    // ── the dim. It is also the stage's frame: a colour takes exactly the space it is offered,
    // and everything else hangs off its bottom edge as overlays, which add nothing to its size.
    // So the stage is never bigger than its Host, even while the Host is only the bar's strip
    // and a sheet, closed and invisible, reaches far above it. (A root view bigger than its
    // hosting view can be centred in it instead of pinned, and the bar would drop.)
    KDim.publish(style, for: theme)
      .opacity(open ? 1 : 0)
      .animation(KMotion.dimFade, value: open)
      .contentShape(Rectangle())
      .onTapGesture(perform: onDismiss)
      .allowsHitTesting(open)
      .accessibilityElement()
      .accessibilityLabel(closeLabel)
      .accessibilityAddTraits(.isButton)
      .accessibilityAction { onDismiss() }
      .accessibilityHidden(!open)
      // ── the 10a sheet (H:129), at its own height whatever room it is offered ──
      .overlay(alignment: .bottom) {
        if style == .cards {
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
        if style == .pop {
          KPublishPop(theme: theme, model: pop, open: open, barGap: gap, onAction: onPanelAction)
        }
      }
      // ── the bar (H:117), over the dim ──
      .overlay(alignment: .bottom) {
        KTabBar(
          theme: theme,
          items: items,
          selectedIndex: selectedIndex,
          isPanelOpen: open,
          plusLabel: plusLabel,
          closeLabel: closeLabel,
          // the publish entry turns its + on the design's own curve; the 10a sheet keeps its own
          plusTurn: style == .cards ? KMotion.plusTurn : KMotion.plusTurnPublish,
          // the new reader's sheet takes the bar's place; Today's reply has the screen's foot
          hidden: (style == .sheet && open) || barHidden,
          onSelect: onSelect,
          onPlus: onPlus
        )
        .padding(.horizontal, KTabBarMetrics.sideInset)
        .padding(.bottom, gap)
      }
      // ── the new reader's sheet, over everything ──
      .overlay(alignment: .bottom) {
        if style == .sheet {
          KPublishSheetLayer(
            theme: theme,
            model: sheet,
            open: open,
            safeAreaBottom: safeAreaBottom,
            onAction: onPanelAction,
            onDismiss: onDismiss
          )
        }
      }
      .ignoresSafeArea()
      // a container of its own, so VoiceOver's escape reaches it from any element inside
      .accessibilityElement(children: .contain)
      .accessibilityAction(.escape) {
        if open { onDismiss() }
      }
  }
}
