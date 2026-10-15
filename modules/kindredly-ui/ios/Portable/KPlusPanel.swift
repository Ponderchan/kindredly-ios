// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.
// The Expo side lives in Adapters/KTabBarView.swift; ui-lab shows it (kindredly:///ui-lab).

import SwiftUI

/*
 WHAT THE + OPENS (H:128-135): the composer sheet, rising just above the tab bar over a dimmed
 screen.

 The sheet is drawn like an InkCard, not like a float: sf, a 2.5 ln outline, corners of 28 and
 a hard 6/6 ln shadow, padding 16 inside the outline (border-box), its pieces 10 apart (H:129).
 The prompts call for a soft popover here (P:84); the mock wins (tokens-10a.md §11 item 4).
 - a header row: the title in mono 600 .16em (NEW in the mock, H:130), and on the right, if one
   is given, a link in ind, mono 600 .12em (the mock's RECENT ›). The mock sets both at 12;
   KMonoSizes sizes them (owner question 2: 11);
 - the choices as KChoiceCards, two to a row, 10 apart (H:131-133, Kit/KChoiceCard.swift):
   corners of 18, a 2pt ln outline, a hard 3/3 ln shadow, the glyph 28 across, the title in mono
   capitals and the subtitle in the letter serif's italic, both cards in a row one height.

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
  ///   - title: the header, e.g. NEW; set in capitals
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
    HStack(alignment: .firstTextBaseline, spacing: 8) {
      Text(title)
        .textCase(.uppercase)
        .kText(.monoHeader)
        .foregroundStyle(theme.ink)
        .lineLimit(1)
        .accessibilityAddTraits(.isHeader)
      Spacer(minLength: 8)
      if let link {
        Button {
          onAction(link.key)
        } label: {
          Text(link.title)
            .kText(.monoLink)
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

/// The dim layer over the screen while the composer is open: rgba(30,27,53,.3) (H:128), the
/// same in every theme.
public enum KDim {
  public static let composer = Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 0.3)
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
 THE STAGE: the tab bar with what its + opens, as one view filling the space it is given, laid
 out from the bottom up, the way the mock stacks them (H:117, 128, 129):
 - the dim, over everything it is given (z 6 in the mock). A tap on it closes the sheet;
   VoiceOver reads it as a close button, and the escape gesture (two-finger scrub) closes too;
 - the sheet (z 7), 12 in from each side, its bottom 12 above the bar's top. In the mock that
   is bottom 104 = the bar's 30 + 62 + 12, and here it follows the bar wherever the safe area
   puts it. It rises from 24 lower at .94 of its size, scaling from its bottom edge, over .45s
   on a curve that overshoots, and fades in over .25s; closing plays the same backwards. With
   Reduce Motion on it only fades;
 - the bar on top (z 8), so the × stays live and undimmed, KTabBarMetrics.bottomGap above the
   bottom edge.

 The sheet and the dim are always there, only transparent and untouchable while closed, as in
 the mock's CSS. That keeps them out of VoiceOver while closed, and it means the whole stage
 only needs the full screen while the sheet is open or closing: the holder can give it just the
 bar's strip the rest of the time (see src/components/NativeTabBar.tsx, which does). Everything
 is anchored to the bottom edge, so growing or shrinking the space from the top moves nothing.

 The sheet's text grows with Dynamic Type up to accessibility size 1, so it can't run off the
 top of a phone; the bar holds its own size (KTabBar).

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
  private let onSelect: (Int) -> Void
  private let onPlus: () -> Void
  private let onPanelAction: (String) -> Void
  private let onDismiss: () -> Void
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  /// - Parameters:
  ///   - items, selectedIndex, plusLabel, closeLabel, onSelect, onPlus: the bar's (KTabBar)
  ///   - isPanelOpen: the sheet is showing, and the + is an ×
  ///   - panelTitle, panelLink, cards: the sheet's (KPlusPanel)
  ///   - safeAreaBottom: the screen's bottom safe-area inset
  ///   - onPanelAction: a card or the header link was tapped, with its key
  ///   - onDismiss: the dim was tapped (or VoiceOver's escape); the holder closes the sheet
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
    self.onSelect = onSelect
    self.onPlus = onPlus
    self.onPanelAction = onPanelAction
    self.onDismiss = onDismiss
  }

  public var body: some View {
    let gap = KTabBarMetrics.bottomGap(safeAreaBottom: safeAreaBottom)
    let open = isPanelOpen
    // with Reduce Motion the sheet only fades: no rise, no overshoot
    let rises = !reduceMotion
    // ── the dim (H:128). It is also the stage's frame: a colour takes exactly the space it is
    // offered, and the sheet and the bar hang off its bottom edge as overlays, which add nothing
    // to its size. So the stage is never bigger than its Host, even while the Host is only the
    // bar's strip and the sheet, closed and invisible, reaches far above it. (A root view bigger
    // than its hosting view can be centred in it instead of pinned, and the bar would drop.)
    KDim.composer
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
      // ── the sheet (H:129), at its own height whatever room it is offered ──
      .overlay(alignment: .bottom) {
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
      // ── the bar (H:117), on top ──
      .overlay(alignment: .bottom) {
        KTabBar(
          theme: theme,
          items: items,
          selectedIndex: selectedIndex,
          isPanelOpen: open,
          plusLabel: plusLabel,
          closeLabel: closeLabel,
          onSelect: onSelect,
          onPlus: onPlus
        )
        .padding(.horizontal, KTabBarMetrics.sideInset)
        .padding(.bottom, gap)
      }
      .ignoresSafeArea()
      // a container of its own, so VoiceOver's escape reaches it from any element inside
      .accessibilityElement(children: .contain)
      .accessibilityAction(.escape) {
        if open { onDismiss() }
      }
  }
}
