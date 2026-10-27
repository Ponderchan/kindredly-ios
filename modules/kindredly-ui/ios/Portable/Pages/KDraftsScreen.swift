// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 UNSENT, IN SWIFT (2026-10-27): the letters you started and didn't send (/drafts, from Settings).
 The React Native page (src/app/drafts.tsx) stays as the "drafts" switch's fallback. Every word,
 date and order is TS's (src/screens/drafts/drafts-model); this draws them and reports taps. TS
 opens a draft on the letter desk, and asks before one is thrown away (the page's Alert).

   ‹                 Unsent                  03     the sticky secondary bar (KBackBar), the count
   ─────────────────────────────────────────────    in mono 11 mute at its right; a 1pt line under
   ┌───────────────────────────────────────────┐
   │ OCTOBER 27, 2026                   [stamp]│   a card face (sf) edged in line, corners 14; the
   │ Dear stranger, the rain again and …       │   date mono 10 in mute, the stamp it was given at
   └───────────────────────────────────────────┘   the ladder's draftsRow (30, flat: it hasn't gone
          Hold a letter to throw it away.          anywhere); the words in the reader's Letter font
                                                   17/25, four lines (five in a roomy face); the
                                                   hint 12 in mute. Pressed: soft2.
 Empty: the title (22/30, ink) and its line (14/20, sub), centred. A tap opens the draft; a hold
 (half a second) asks to throw it away, and VoiceOver offers the same as an action on the card
 ("<DATE>. <words>"). Until TS has read the drafts, the bar alone (the count "··").
 */

public struct KDraftCard: Equatable, Sendable, Identifiable {
  public let id: String
  public let date: String
  public let words: String
  /// the stamp it was given; "" for none
  public let stamp: String
  /// the stamp's colour for an id this binary's table doesn't know; "" for none
  public let stampHex: String
  public let a11y: String

  public init(id: String, date: String, words: String, stamp: String, stampHex: String, a11y: String) {
    self.id = id
    self.date = date
    self.words = words
    self.stamp = stamp
    self.stampHex = stampHex
    self.a11y = a11y
  }
}

public struct KDraftsContent: Equatable, Sendable {
  public var title = ""
  public var backLabel = ""
  /// "03", or "··" while they load
  public var count = ""
  public var loaded = false
  public var emptyTitle = ""
  public var emptyBody = ""
  public var hint = ""
  /// the VoiceOver action that throws one away
  public var throwLabel = ""
  public var cards: [KDraftCard] = []

  public init() {}
}

public final class KDraftsActions {
  public var onBack: () -> Void = {}
  /// a tap: open this draft on the letter desk
  public var onOpen: (String) -> Void = { _ in }
  /// a hold, or the VoiceOver action: TS asks before it goes
  public var onThrow: (String) -> Void = { _ in }

  public init() {}
}

public struct KDraftsScreen: View {
  private let theme: KTheme
  private let content: KDraftsContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let actions: KDraftsActions

  public init(theme: KTheme, content: KDraftsContent, topInset: CGFloat, bottomInset: CGFloat, actions: KDraftsActions) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
  }

  public var body: some View {
    VStack(spacing: 0) {
      Color.clear.frame(height: topInset)
      KBackBar(theme: theme, title: content.title, backLabel: content.backLabel, height: KBackBar<EmptyView>.stickyHeight, sticky: true) {
        Text(content.count)
          .kText(.mono(11, .medium, tracking: 1.2 / 11))
          .foregroundStyle(theme.mute)
          .lineLimit(1)
          .fixedSize()
          .frame(minWidth: 36, alignment: .trailing)
          .accessibilityHidden(!content.loaded)
      } onBack: {
        actions.onBack()
      }
      theme.line.frame(height: 1)
      if content.loaded && content.cards.isEmpty {
        VStack(spacing: 12) {
          Text(content.emptyTitle)
            .kText(.system(22, lineHeight: 30.0 / 22.0))
            .foregroundStyle(theme.ink)
          Text(content.emptyBody)
            .kText(.system(14, lineHeight: 20.0 / 14.0))
            .foregroundStyle(theme.sub)
        }
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.horizontal, 40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .combine)
      } else {
        ScrollView(.vertical) {
          VStack(spacing: 12) {
            ForEach(content.cards) { card in
              KDraftCardView(theme: theme, card: card, throwLabel: content.throwLabel, actions: actions)
            }
            if content.loaded {
              Text(content.hint)
                .kText(.system(12))
                .foregroundStyle(theme.mute)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity)
                .padding(.top, 10)
            }
          }
          .padding(12)
        }
        .scrollIndicators(.hidden)
        .contentMargins(.bottom, bottomInset, for: .scrollContent)
      }
    }
    .background { theme.bg.ignoresSafeArea() }
  }
}

/// One draft: a tap opens it, a hold asks to throw it away.
private struct KDraftCardView: View {
  let theme: KTheme
  let card: KDraftCard
  let throwLabel: String
  let actions: KDraftsActions

  @Environment(\.kLetterFace) private var face
  /// set when the hold has fired, so lifting the finger doesn't also open the draft
  @State private var held = false

  var body: some View {
    SwiftUI.Button {
      if held {
        held = false
        return
      }
      actions.onOpen(card.id)
    } label: {
      VStack(alignment: .leading, spacing: 12) {
        HStack(alignment: .top, spacing: 8) {
          Text(card.date)
            .kText(.mono(10, .medium, tracking: 0.08))
            .foregroundStyle(theme.mute)
            .frame(maxWidth: .infinity, alignment: .leading)
            .fixedSize(horizontal: false, vertical: true)
          if !card.stamp.isEmpty {
            KStamp(id: card.stamp, width: KStampLadder.draftsRow.w, dark: theme.isDark, fallbackHex: card.stampHex.isEmpty ? nil : card.stampHex)
          }
        }
        Text(card.words)
          .kText(.content(17, lineHeight: 25.0 / 17.0))
          .foregroundStyle(theme.ink)
          .lineLimit(face.fitLines(4))
          .multilineTextAlignment(.leading)
          .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(16)
      .frame(maxWidth: .infinity, alignment: .leading)
      .contentShape(RoundedRectangle(cornerRadius: 14, style: .circular))
    }
    .buttonStyle(KDraftCardStyle(theme: theme))
    .simultaneousGesture(
      LongPressGesture(minimumDuration: 0.5)
        .onChanged { _ in held = false }
        .onEnded { _ in
          held = true
          actions.onThrow(card.id)
        }
    )
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(card.a11y)
    .accessibilityAddTraits(.isButton)
    .accessibilityAction { actions.onOpen(card.id) }
    .accessibilityAction(named: throwLabel) { actions.onThrow(card.id) }
  }
}

/// The card's face: sf edged in line, soft2 while pressed.
private struct KDraftCardStyle: ButtonStyle {
  let theme: KTheme

  func makeBody(configuration: Configuration) -> some View {
    let shape = RoundedRectangle(cornerRadius: 14, style: .circular)
    return configuration.label
      .background(shape.fill(configuration.isPressed ? theme.soft2 : theme.sf))
      .overlay(shape.strokeBorder(theme.line, lineWidth: 1))
  }
}
