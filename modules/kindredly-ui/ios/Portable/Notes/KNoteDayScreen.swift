// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 ONE DAY OF THE JOURNAL (/journal/day/[date], from the Notes fallback's calendar when a day holds
 more than one page), in SwiftUI (2026-10-27). The React Native page (src/app/journal/day/
 [date].tsx) stays as the "noteday" switch's fallback.

   ‹            Wednesday, October 14              the sticky secondary bar (KBackBar): the day in
                                                   the reader's own words, System 500 17
   ┌─────────────────────────────────────────┐    every page of that day, oldest first, as the
   │ [☺] OCT 14 · 07:12                    ▭ │    Notes tab's own cards (KNoteCard, Card layout):
   │ …                                       │    the same paper, head row, words, voice bar and
   └─────────────────────────────────────────┘    pictures; a tap opens the page, the voice bar
                 3 ON THIS DAY                     plays in place (TS's one player)
                                                   SF Mono 500 10 in mute, once the day is read

 Every word and label is TS's (screens/notes/notes-model builds the cards, as for the tab). The
 player's transitions come in through the driver (KNotesDriver.playback), as on the Notes tab.
 */

/// Everything the day page draws.
public struct KNoteDayContent: Equatable, Sendable {
  /// the day, as the reader's language writes it
  public var title = ""
  public var backLabel = ""
  /// "3 ON THIS DAY"; "" until the day is read
  public var footer = ""
  public var play = ""
  public var pause = ""
  /// oldest first
  public var notes: [KNote] = []

  public init() {}
}

public struct KNoteDayScreen: View {
  private let theme: KTheme
  private let content: KNoteDayContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let driver: KNotesDriver
  private let actions: KNotesActions
  private let onBack: () -> Void

  /// - Parameters:
  ///   - driver: the one player's state (and nothing else of the Notes tab's)
  ///   - actions: onOpen and onToggleVoice are the ones a card uses
  public init(theme: KTheme, content: KNoteDayContent, topInset: CGFloat, bottomInset: CGFloat, driver: KNotesDriver, actions: KNotesActions, onBack: @escaping () -> Void) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.driver = driver
    self.actions = actions
    self.onBack = onBack
  }

  public var body: some View {
    VStack(spacing: 0) {
      Color.clear.frame(height: topInset)
      KBackBar(theme: theme, title: content.title, backLabel: content.backLabel, height: KBackBar<EmptyView>.stickyHeight, sticky: true, onBack: onBack)
      ScrollView(.vertical) {
        LazyVStack(alignment: .leading, spacing: 12) {
          ForEach(content.notes) { note in
            KNoteCard(
              theme: theme,
              note: note,
              layout: .card,
              playLabel: content.play,
              pauseLabel: content.pause,
              driver: driver,
              actions: actions
            )
            .equatable()
          }
          if !content.footer.isEmpty {
            Text(content.footer)
              .kText(.mono(10, .medium, tracking: 0.08))
              .foregroundStyle(theme.mute)
              .multilineTextAlignment(.center)
              .frame(maxWidth: .infinity)
              .padding(.top, 10)
          }
        }
        .padding(.horizontal, 16)
        .padding(.top, 18)
      }
      .scrollIndicators(.hidden)
      .contentMargins(.bottom, bottomInset + 40, for: .scrollContent)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .background { theme.bg.ignoresSafeArea() }
    .accessibilityElement(children: .contain)
    .accessibilityAction(.escape) { onBack() }
  }
}
