// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 ONE LETTER ON THE DESK (H:32-37, 10a ink card), at the height the stack gives it. Inside the
 InkCard (.today: sf, a 2.5 ln outline, corners of 28, a hard 6/6 shadow, padding 18 20 14):

 - the docket row, 10 apart: the writer's FACE v1 (KMosaic 28, cell 4.8, gap 1, ink; a deleted
   account is the veil in faint), the postmark in mono 600 11 at .08em, the stamp in a 34 box
   (corners of 10, a 2pt ln outline, sf; the real stamp art inside, whose own perforated frame
   stands in for H's dotted one: stamps are content and keep their colours), and the ⋯ in a 34
   circle that opens Report / Block (a SwiftUI Menu, inside the one Host);
 - the letter, filling what is left, in the reader's Letter font at its tier (telegram 30/40
   centred, 21/33, 18/29), padded 0 10, centred in its space. A letter that doesn't fit is
   FOLDED, never scrolled in place (one swipe means one thing on this page): its height is
   measured from a twin with no height limit, the page shows what fits from the top, a 64pt
   gradient from sf at nothing to sf dissolves the last lines (the old one was hardcoded white:
   a band on Midnight and Paper), and UNFOLD ↓ opens the reader. A translation swaps the text in
   place, a .25s crossfade;
 - a voice letter instead: VOICE LETTER, the voice card (the 44 disc, sixteen bars, the time)
   drawn from TS's one player, and the writer's caption in the italic serif under it. Until its
   link is signed it shows itself unavailable; the caption is never drawn as the letter;
 - the foot: the topic tag (the stamp's channel colours, worked out on this card's face by TS) and
   the one capsule (translation wins over the lime signal), side by side, stacked when they
   don't fit (a long language, large text);
 - a 2pt ln rule (14 above, 10 below), then ↑ PASS (a label: the swipe is the move) and REPLY ↓
   in ind (a 44pt target), both mono 600 11 at .14em.

 VoiceOver reads the card as one element (TS's a11yLabel: the docket, the topic, why the matcher
 chose it, the letter or what the voice letter is) with its moves as actions: write back,
 translate or show the original, unfold, play or pause (as the press would do now), report,
 block, next and previous letter (↑ PASS is only a label for sighted readers). Every move says
 which card it came from: the stack settles on THAT card before the field opens or the page
 moves, whatever page it last settled on (VoiceOver scrolls cards into view on its own).
 */

/// What a card's taps do (one object per surface, so a card is always equal to itself). Each
/// carries the card's id: a reply is always bound to its own letter.
final class KLetterCardActions {
  var onReply: (_ letterId: String) -> Void = { _ in }
  var onAction: (_ letterId: String, _ action: String) -> Void = { _, _ in }
  var onNext: (_ letterId: String) -> Void = { _ in }
  var onPrevious: (_ letterId: String) -> Void = { _ in }
}

struct KLetterCard: View, Equatable {
  static let mosaicCell: CGFloat = 4.8
  static let stampBox: CGFloat = 34
  static let monoLabel = KTextStyle.monoReply

  let theme: KTheme
  let card: KLetterCardModel
  let labels: KTodayLabels
  let voice: KTodayVoice
  let actions: KLetterCardActions

  static func == (a: KLetterCard, b: KLetterCard) -> Bool {
    a.card == b.card && a.theme == b.theme && a.labels == b.labels
  }

  var body: some View {
    InkCard(theme: theme) {
      docket
      Group {
        if card.isVoice {
          KCardVoiceBlock(theme: theme, card: card, labels: labels, voice: voice) {
            actions.onAction(card.id, "voice")
          }
        } else {
          KCardText(theme: theme, card: card, unfold: labels.unfold) {
            actions.onAction(card.id, "unfold")
          }
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      foot
      Rectangle()
        .fill(theme.ln)
        .frame(height: 2)
        .padding(.top, 14)
        .padding(.bottom, 10)
        .accessibilityHidden(true)
      moves
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(card.a11yLabel)
    .modifier(KLetterCardAccessibilityActions(card: card, labels: labels, voice: voice, actions: actions))
  }

  // ── the docket row ──
  private var docket: some View {
    HStack(alignment: .center, spacing: 10) {
      Group {
        if card.ghost {
          KMosaic.veil(theme: theme, cell: Self.mosaicCell, gap: 1)
        } else {
          KMosaic(mask: card.mask, cell: Self.mosaicCell, gap: 1, color: theme.ink)
        }
      }
      Text(card.postmark)
        .kText(.monoPostmark)
        .foregroundStyle(theme.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.75)
        .frame(maxWidth: .infinity, alignment: .leading)
      KStampArt(id: card.stampId, size: Self.stampBox - 6, fallbackHex: card.stampHex.isEmpty ? nil : card.stampHex)
        .frame(width: Self.stampBox, height: Self.stampBox)
        .background(RoundedRectangle(cornerRadius: 10, style: .circular).fill(theme.sf))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .circular))
        .overlay(RoundedRectangle(cornerRadius: 10, style: .circular).strokeBorder(theme.ln, lineWidth: 2))
      if !card.menu.isEmpty {
        Menu {
          ForEach(card.menu) { item in
            SwiftUI.Button(role: item.destructive ? .destructive : nil) {
              actions.onAction(card.id, item.key)
            } label: {
              if item.systemImage.isEmpty {
                Text(item.title)
              } else {
                Label(item.title, systemImage: item.systemImage)
              }
            }
          }
        } label: {
          KLineIcon(.more, size: 18, lineWidth: 3.2, color: theme.ink)
            .frame(width: Self.stampBox, height: Self.stampBox)
            .overlay(Circle().strokeBorder(theme.ln, lineWidth: 2))
            .contentShape(Circle())
            .padding(5)
            .contentShape(Rectangle())
        }
        .menuIndicator(.hidden)
        .padding(-5)
        .accessibilityLabel(labels.more)
      }
    }
    .dynamicTypeSize(...DynamicTypeSize.accessibility2)
  }

  // ── the foot: the topic tag and the one capsule ──
  @ViewBuilder
  private var foot: some View {
    let hasCapsule = card.capsule != .none
    if !card.topic.isEmpty || hasCapsule {
      ViewThatFits(in: .horizontal) {
        HStack(alignment: .center, spacing: 9) {
          topicTag
          Spacer(minLength: 0)
          capsule
        }
        VStack(alignment: .leading, spacing: 8) {
          topicTag
          capsule
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      // the tag's 3/3 shadow hangs outside it
      .padding(.trailing, 3)
      .padding(.bottom, 3)
      .padding(.top, 8)
      .dynamicTypeSize(...DynamicTypeSize.accessibility2)
    }
  }

  @ViewBuilder
  private var topicTag: some View {
    if !card.topic.isEmpty {
      KTopicTag(
        theme: theme,
        text: card.topic,
        tone: .channel(wash: Color(hex: card.topicWash), ink: Color(hex: card.topicInk))
      )
    }
  }

  @ViewBuilder
  private var capsule: some View {
    switch card.capsule {
    case .none:
      EmptyView()
    case let .translate(code, label, enabled, value):
      KTranslateCapsule(theme: theme, code: code, label: label, enabled: enabled, accessibilityValue: value) {
        actions.onAction(card.id, "translate")
      }
    case let .signal(label, glyph):
      KAurasClose(theme: theme, label: label, glyph: glyph)
    }
  }

  // ── ↑ PASS · REPLY ↓ ──
  private var moves: some View {
    HStack(alignment: .center) {
      Text(labels.pass)
        .kText(Self.monoLabel)
        .foregroundStyle(theme.ink)
        .lineLimit(1)
      Spacer(minLength: 12)
      SwiftUI.Button {
        actions.onReply(card.id)
      } label: {
        Text(labels.reply)
          .kText(Self.monoLabel)
          .foregroundStyle(theme.ind)
          .lineLimit(1)
          // a 44pt target round the 11pt word, taken back outside so the row keeps its height
          .padding(.vertical, 15)
          .padding(.leading, 16)
          .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
      .padding(.vertical, -15)
      .padding(.leading, -16)
    }
    .dynamicTypeSize(...DynamicTypeSize.accessibility2)
  }
}

/// The card's VoiceOver actions. A modifier of its own so the voice action can follow the one
/// player (Pause while this letter plays, Play otherwise) while the card itself stays equal to
/// itself: only this observes the player, which reports transitions, never ticks.
struct KLetterCardAccessibilityActions: ViewModifier {
  let card: KLetterCardModel
  let labels: KTodayLabels
  @ObservedObject var voice: KTodayVoice
  let actions: KLetterCardActions

  func body(content: Content) -> some View {
    let playing = voice.key == card.id && voice.playback?.playing == true
    content.accessibilityActions {
      SwiftUI.Button(labels.replyA11y) { actions.onReply(card.id) }
      if case let .translate(_, label, enabled, _) = card.capsule, enabled {
        SwiftUI.Button(label) { actions.onAction(card.id, "translate") }
      }
      if card.isVoice {
        if card.voiceReady {
          SwiftUI.Button(playing ? labels.pause : labels.play) { actions.onAction(card.id, "voice") }
        }
      } else {
        SwiftUI.Button(labels.unfoldA11y) { actions.onAction(card.id, "unfold") }
      }
      ForEach(card.menu) { item in
        SwiftUI.Button(item.title) { actions.onAction(card.id, item.key) }
      }
      SwiftUI.Button(labels.next) { actions.onNext(card.id) }
      SwiftUI.Button(labels.previous) { actions.onPrevious(card.id) }
    }
  }
}

/*
 The letter itself, folded when it doesn't fit. The visible copy is set at its full height
 (fixedSize) and clipped from the top, so a folded letter shows its beginning, never an ellipsis;
 a hidden twin with no height limit says how tall it really is.
 */
struct KCardText: View {
  let theme: KTheme
  let card: KLetterCardModel
  let unfold: String
  let onUnfold: () -> Void

  @State private var frameHeight: CGFloat = 0
  @State private var textHeight: CGFloat = 0
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  private var folded: Bool { frameHeight > 1 && textHeight > frameHeight + 1 }

  var body: some View {
    VStack(spacing: 0) {
      ZStack {
        letter
          .fixedSize(horizontal: false, vertical: true)
          .id(card.body)
          .transition(.opacity)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: folded ? .top : .center)
      .clipped()
      .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { height in
        if abs(height - frameHeight) > 0.5 { frameHeight = height }
      }
      .background(alignment: .top) {
        letter
          .fixedSize(horizontal: false, vertical: true)
          .hidden()
          .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { height in
            if abs(height - textHeight) > 0.5 { textHeight = height }
          }
          .accessibilityHidden(true)
      }
      .overlay(alignment: .bottom) {
        if folded {
          LinearGradient(colors: [theme.sf.opacity(0), theme.sf], startPoint: .top, endPoint: .bottom)
            .frame(height: 64)
            .allowsHitTesting(false)
            .accessibilityHidden(true)
        }
      }
      .animation(reduceMotion ? nil : .easeInOut(duration: 0.25), value: card.body)
      if folded {
        SwiftUI.Button(action: onUnfold) {
          Text(unfold)
            .kText(KLetterCard.monoLabel)
            .foregroundStyle(theme.ind)
            .padding(.vertical, 6)
            .padding(.horizontal, 12)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        .padding(.top, 2)
        .dynamicTypeSize(...DynamicTypeSize.accessibility2)
      }
    }
  }

  private var letter: some View {
    Text(card.body)
      .kText(.letterRead(card.bodySize, lineHeight: card.bodySize > 0 ? card.bodyLine / card.bodySize : nil, place: .todayCard))
      .foregroundStyle(theme.ink)
      .multilineTextAlignment(card.bodyCenter ? .center : .leading)
      .frame(maxWidth: .infinity, alignment: card.bodyCenter ? .center : .leading)
      .padding(.horizontal, 10)
  }
}

/// A voice letter's block: the label, the voice card on TS's one player, the caption.
struct KCardVoiceBlock: View {
  let theme: KTheme
  let card: KLetterCardModel
  let labels: KTodayLabels
  @ObservedObject var voice: KTodayVoice
  let onToggle: () -> Void

  var body: some View {
    let mine = voice.key == card.id
    let playback = mine ? voice.playback : nil
    let pausedAt: String = {
      guard let playback, !playback.playing, playback.positionS > 0 else { return "" }
      return KVoiceCard.clock(playback.positionS)
    }()
    VStack(alignment: .leading, spacing: 0) {
      Text(labels.voiceLetter)
        .kText(KLetterCard.monoLabel)
        .foregroundStyle(theme.ind)
        .padding(.bottom, 14)
        .accessibilityHidden(true)
      KVoiceCard(
        theme: theme,
        playback: playback,
        durationLabel: card.durationLabel,
        positionLabel: pausedAt,
        playLabel: labels.play,
        pauseLabel: labels.pause,
        unavailable: !card.voiceReady || (mine && voice.failed),
        compact: false,
        panel: false,
        onToggle: onToggle
      )
      if !card.caption.isEmpty {
        Text(card.caption)
          .kText(.letterRead(15, italic: true, lineHeight: 24.0 / 15.0, place: .todayCard))
          .foregroundStyle(theme.sub)
          .padding(.top, 16)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .clipped()
  }
}
