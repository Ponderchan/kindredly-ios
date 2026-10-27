// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 LORE, IN SWIFT (2026-10-27): the shelf of kept moments (/lore, from a kindred's room and
 Settings). Local, account-scoped, only yours. The React Native page (src/app/lore.tsx) stays as
 the "lore" switch's fallback. Every word and date is TS's (src/screens/lore/lore-model); this
 draws them and reports a hold. TS asks before a line comes down (the page's Alert, with the
 native sheet's words) and takes it down.

   ‹                   Lore                    the sticky secondary bar (KBackBar), no rule
   Things you've kept                          21/600 in ink, the page's header
   ┌─────────────────────────────────────┐
   │ What did you eat today?             │    a question fold's question, in the Letter font's
   │ The kettle sang all morning.        │    italic (13.5, sub); the kept line in the Letter
   │ FROM ROBIN · OCT 26                 │    font (16/24, ink); the small print mono 9 in mute
   └─────────────────────────────────────┘    on the theme's soft, corners 14, no edge
 Empty (once read): its line, 14.5/22 in sub. A hold (0.4s) asks to take a line down; VoiceOver
 offers the same as an action (ml.rm.remove) with its hint, since nobody using VoiceOver could
 find a long press.
 */

public struct KLoreCard: Equatable, Sendable, Identifiable {
  public let id: String
  /// the question it answered; "" for none
  public let prompt: String
  public let body: String
  /// FROM ROBIN · OCT 26
  public let from: String

  public init(id: String, prompt: String, body: String, from: String) {
    self.id = id
    self.prompt = prompt
    self.body = body
    self.from = from
  }
}

public struct KLoreContent: Equatable, Sendable {
  public var title = ""
  public var backLabel = ""
  public var head = ""
  public var empty = ""
  /// the VoiceOver action that takes a line down, and its hint
  public var removeLabel = ""
  public var removeHint = ""
  public var loaded = false
  public var cards: [KLoreCard] = []

  public init() {}
}

public final class KLoreActions {
  public var onBack: () -> Void = {}
  /// a hold, or the VoiceOver action: TS asks before the line comes down
  public var onRemove: (String) -> Void = { _ in }

  public init() {}
}

public struct KLoreScreen: View {
  private let theme: KTheme
  private let content: KLoreContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let actions: KLoreActions

  public init(theme: KTheme, content: KLoreContent, topInset: CGFloat, bottomInset: CGFloat, actions: KLoreActions) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
  }

  public var body: some View {
    VStack(spacing: 0) {
      Color.clear.frame(height: topInset)
      KBackBar(theme: theme, title: content.title, backLabel: content.backLabel, height: KBackBar<EmptyView>.stickyHeight, sticky: true, onBack: { actions.onBack() })
      ScrollView(.vertical) {
        VStack(alignment: .leading, spacing: 0) {
          Text(content.head)
            .kText(.system(21, .semibold))
            .foregroundStyle(theme.ink)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.bottom, 4)
            .accessibilityAddTraits(.isHeader)
          if content.loaded && content.cards.isEmpty {
            Text(content.empty)
              .kText(.system(14.5, lineHeight: 22.0 / 14.5))
              .foregroundStyle(theme.sub)
              .fixedSize(horizontal: false, vertical: true)
              .padding(.top, 10)
          }
          ForEach(content.cards) { card in
            clipping(card)
              .padding(.top, 12)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.top, 8)
      }
      .scrollIndicators(.hidden)
      .contentMargins(.bottom, bottomInset, for: .scrollContent)
    }
    .background { theme.bg.ignoresSafeArea() }
  }

  private func clipping(_ card: KLoreCard) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      if !card.prompt.isEmpty {
        Text(card.prompt)
          .kText(.content(13.5, italic: true))
          .foregroundStyle(theme.sub)
          .fixedSize(horizontal: false, vertical: true)
          .padding(.bottom, 6)
      }
      Text(card.body)
        .kText(.content(16, lineHeight: 24.0 / 16.0))
        .foregroundStyle(theme.ink)
        .fixedSize(horizontal: false, vertical: true)
      Text(card.from)
        .kText(.mono(9, .medium, tracking: 1.1 / 9))
        .foregroundStyle(theme.mute)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 9)
    }
    .padding(14)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 14, style: .circular).fill(theme.soft))
    .contentShape(RoundedRectangle(cornerRadius: 14, style: .circular))
    // an empty tap first, so the hold never holds up the scroll it sits in
    .onTapGesture {}
    .onLongPressGesture(minimumDuration: 0.4) { actions.onRemove(card.id) }
    .accessibilityElement(children: .combine)
    .accessibilityHint(content.removeHint)
    .accessibilityAction(named: content.removeLabel) { actions.onRemove(card.id) }
  }
}
