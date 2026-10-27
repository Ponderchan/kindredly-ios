// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE COMPOSERS' VOICE SLOT: what KComposePage and KNoteComposePage place while a voice letter or
 a voice note is being made. It used to be one React Native island (the Recorder and the take's
 AudioCard). Behind the "recorder" and "audiocard" switches (off by default) Swift draws either
 or both itself, and the island keeps whatever is still React Native:

   bar   — KRecorderBar, when showBar (else the island's React Native Recorder)
   island — the React Native island, when it has something in it
   card  — KAudioCardRow for the take, when showCard (else, if there's a take, it is in the island)

 in that order, `spacing` apart (the island's own gap: 12 on the letter, 10 on a note). With
 nothing said yet (an older JS, or before the first word) the slot is the island alone, exactly
 as before. TS keeps the recording and the player (src/components/VoiceSlot.tsx) and says what to
 draw through the composer view's `recorder` command; the taps come back as KVoiceSlotAction.
 */

public struct KVoiceSlotState: Equatable {
  public var showBar: Bool
  public var bar: KRecorderBarState
  public var showCard: Bool
  /// the take's look; nil until TS has sent one (the slot then draws AudioCard at rest)
  public var card: KAudioCardLook?
  public var cardPlaying: Bool
  /// VoiceOver's name for the take's disc right now
  public var cardLabel: String
  /// the React Native island has something in it
  public var island: Bool

  public init(
    showBar: Bool = false,
    bar: KRecorderBarState = KRecorderBarState(),
    showCard: Bool = false,
    card: KAudioCardLook? = nil,
    cardPlaying: Bool = false,
    cardLabel: String = "",
    island: Bool = true
  ) {
    self.showBar = showBar
    self.bar = bar
    self.showCard = showCard
    self.card = card
    self.cardPlaying = cardPlaying
    self.cardLabel = cardLabel
    self.island = island
  }
}

/// A tap in the slot, for TS.
public enum KVoiceSlotAction: String {
  /// the recording key (start or stop)
  case press
  /// the take's ✕
  case discard
  /// the take's play / pause
  case toggle
}

/// The slot's state, as long-lived as the page (TS updates it through the `recorder` command).
public final class KVoiceSlotModel: ObservableObject {
  @Published public private(set) var state = KVoiceSlotState()

  public init() {}

  public func update(_ next: KVoiceSlotState) {
    if next != state { state = next }
  }
}

public struct KVoiceSlot<Island: View>: View {
  @ObservedObject private var model: KVoiceSlotModel
  private let theme: KTheme
  private let spacing: CGFloat
  private let island: Island?
  private let onAction: (KVoiceSlotAction) -> Void

  /// - Parameters:
  ///   - model: what TS last said
  ///   - spacing: between the bar, the island and the take (the island's own gap)
  ///   - island: the React Native island, nil when the JS side rendered none
  ///   - onAction: a tap, for TS
  public init(model: KVoiceSlotModel, theme: KTheme, spacing: CGFloat, island: Island?, onAction: @escaping (KVoiceSlotAction) -> Void) {
    self.model = model
    self.theme = theme
    self.spacing = spacing
    self.island = island
    self.onAction = onAction
  }

  public var body: some View {
    let s = model.state
    VStack(alignment: .leading, spacing: spacing) {
      if s.showBar {
        KRecorderBar(theme: theme, state: s.bar, onPress: { onAction(.press) }, onDiscard: { onAction(.discard) })
      }
      if s.island, let island {
        island
      }
      if s.showCard {
        KAudioCardRow(look: s.card ?? .rest(theme), playing: s.cardPlaying, label: s.cardLabel, onToggle: { onAction(.toggle) })
      }
    }
  }
}
