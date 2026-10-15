// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE CONVERSATION'S ROWS: one view per item kind, with the 10a values the chat spec gives
 (spec-chat mock 13-17, tokens-10a.md):

 - a room line (KChatBubble): mine on the right in ind with bg words, theirs on the left on soft
   with ink words; corners of 18 and 5 on the tail; padding 10 14; at most 84% of the content
   width; system 16 at 1.44. A reply carries its quote inside: a 2pt rule, the speaker in mono
   500 10, two lines of the excerpt (italic "taken back" when it was), a tap jumps to it.
   Theirs gets a hairline in the themes where soft barely leaves the page (Lavender, Paper,
   Midnight: 1.07-1.11:1, critic).
 - a pen-pal letter (KLetterBlock): the label line (YOU · OCT 14) when the writer or the day
   changes, a light-outline block (sf, 1.5 ln, corners 16; mine lav2 with a lav outline),
   padding 12 14, at most 86%; the words in the reader's Letter font (owner question 1, pen-pal
   letters are letters being read); the 24-hour time at its foot. A tap opens the reader.
 - a moment (KPhotoTile): a square 70% of the width, corners 16, soft2 until it loads.
 - a song (KSongCard): the light-outline card with music.note in ind, the title, the host and a
   chevron; the shelf link under the last song.
 - a fold (KFoldCard): sealed on soft with a 1.5 line outline; opened on sf with a 2 ln outline
   and a 3/3 hard shadow; each opened half is a line with its own menu.
 - a line taken back (KRecallNote), the day rule (KChatDayRule), the translation under a line
   (KChatTranslationLine), the voice opening (a KVoiceCard on the one player).

 ACCESSIBILITY. Each line is one element: its label is the owner's a11yLabel (whose, the words,
 the day), the menu's items are its actions (kMenu), and the nested tap targets are named
 actions on it (the quote jump). Day rules are headers, so the rotor can jump by day. Tappable
 blocks are buttons.

 Rows are Equatable on what they draw (not on the driver or the actions object, which live as
 long as the surface), so a parent redraw doesn't redraw them.
 */

/// One row of the conversation: its day rule, its gap, and the item.
struct KChatRow: View, Equatable {
  let theme: KTheme
  let variant: KChatVariant
  let item: KChatItem
  /// the first row of the window (no space above its day rule)
  let first: Bool
  /// lit for a moment after a quote jump
  let lit: Bool
  /// the list's width less its gutters
  let width: CGFloat
  let strings: KChatStrings
  let driver: KConversationDriver
  let actions: KConversationActions

  static func == (a: KChatRow, b: KChatRow) -> Bool {
    a.item == b.item && a.theme == b.theme && a.variant == b.variant && a.first == b.first && a.lit == b.lit
      && a.width == b.width && a.strings == b.strings
  }

  var body: some View {
    VStack(spacing: 0) {
      if !item.dayLabel.isEmpty {
        KChatDayRule(theme: theme, label: item.dayLabel)
          .padding(.top, first ? 0 : 22)
          .padding(.bottom, 14)
      }
      content
        .padding(.top, item.gap)
    }
    .opacity(lit ? 0.5 : 1)
  }

  @ViewBuilder
  private var content: some View {
    switch item.kind {
    case .line:
      KChatBubble(theme: theme, item: item, maxWidth: (width * 0.84).rounded(), strings: strings, actions: actions)
    case .letter:
      KLetterBlock(theme: theme, item: item, maxWidth: (width * 0.86).rounded(), strings: strings, driver: driver, actions: actions)
    case .photo:
      KPhotoTile(theme: theme, item: item, side: (width * 0.7).rounded(), strings: strings, actions: actions)
    case .song:
      KSongCard(theme: theme, item: item, maxWidth: (width * 0.86).rounded(), actions: actions)
    case .fold:
      if let fold = item.fold {
        KFoldCard(theme: theme, item: item, fold: fold, strings: strings, actions: actions)
      }
    case .recalled:
      KRecallNote(theme: theme, item: item)
    case .voice:
      if variant == .letters {
        KLetterBlock(theme: theme, item: item, maxWidth: (width * 0.86).rounded(), strings: strings, driver: driver, actions: actions)
      } else {
        KChatVoiceLine(theme: theme, item: item, maxWidth: (width * 0.84).rounded(), strings: strings, driver: driver, actions: actions)
      }
    }
  }
}

/// Colours the rows derive from the theme beyond its tokens.
enum KChatPalette {
  /// Theirs bubbles are soft on bg, which barely leaves the page outside Classic (critic: 1.07
  /// to 1.11:1, lighter than the page in Lavender and Paper): a hairline there, none in Classic.
  static func theirsStroke(_ theme: KTheme) -> Color? {
    theme.key == KTheme.classic.key ? nil : theme.line
  }
}

/// A row's tap target drawn exactly as it is: no fade under the finger, which would hide iOS's
/// own press-and-lift of the context menu (chat/[id].tsx's note).
struct KChatPlainPress: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
  }
}

extension View {
  /// A named VoiceOver action, when it has a name: a nested tap target in a row that is read as
  /// one element (the quote jump, ANSWER TO OPEN).
  func kChatAction(_ name: String, perform: @escaping () -> Void) -> some View {
    accessibilityActions {
      if !name.isEmpty {
        SwiftUI.Button(name, action: perform)
      }
    }
  }
}

// MARK: - The day rule

/// "OCT 14", centred, mono 10 in sub (mute fails 4.5:1 at 10pt in Lavender and Paper), a
/// header for VoiceOver's rotor.
struct KChatDayRule: View {
  let theme: KTheme
  let label: String

  var body: some View {
    Text(label)
      .kText(.monoSection)
      .foregroundStyle(theme.sub)
      .multilineTextAlignment(.center)
      .frame(maxWidth: .infinity)
      .accessibilityAddTraits(.isHeader)
  }
}

// MARK: - The translation under a line

struct KChatTranslationLine: View {
  let theme: KTheme
  let translation: KChatTranslation
  let text: String
  let strings: KChatStrings
  let maxWidth: CGFloat

  var body: some View {
    switch translation {
    case .busy:
      Text(strings.translating)
        .kText(.monoMeta)
        .foregroundStyle(theme.mute)
        .padding(.top, 4)
        .padding(.horizontal, 6)
    case .shown where !text.isEmpty:
      Text(text)
        .kText(.system(14.5, lineHeight: 1.45))
        .foregroundStyle(theme.sub)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 5)
        .padding(.horizontal, 6)
        .frame(maxWidth: maxWidth, alignment: .leading)
    default:
      EmptyView()
    }
  }
}

// MARK: - A room line

struct KChatBubble: View {
  let theme: KTheme
  let item: KChatItem
  let maxWidth: CGFloat
  let strings: KChatStrings
  let actions: KConversationActions

  static let radius: CGFloat = 18
  static let tail: CGFloat = 5

  private var shape: UnevenRoundedRectangle {
    UnevenRoundedRectangle(
      topLeadingRadius: Self.radius,
      bottomLeadingRadius: item.mine ? Self.radius : Self.tail,
      bottomTrailingRadius: item.mine ? Self.tail : Self.radius,
      topTrailingRadius: Self.radius,
      style: .circular
    )
  }

  private var side: HorizontalAlignment { item.mine ? .trailing : .leading }
  private var edge: Alignment { item.mine ? .trailing : .leading }

  var body: some View {
    VStack(alignment: side, spacing: 0) {
      bubble
        .frame(maxWidth: maxWidth, alignment: edge)
      KChatTranslationLine(theme: theme, translation: item.translation, text: item.translationText, strings: strings, maxWidth: maxWidth)
    }
    .frame(maxWidth: .infinity, alignment: edge)
    .padding(.bottom, 2)
  }

  private var bubble: some View {
    VStack(alignment: .leading, spacing: 6) {
      if let quote = item.quote {
        quoteView(quote)
      }
      Text(item.body)
        .kText(.system(16, lineHeight: 1.44))
        .foregroundStyle(item.mine ? theme.bg : theme.ink)
        .fixedSize(horizontal: false, vertical: true)
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 10)
    .background(shape.fill(item.mine ? theme.ind : theme.soft))
    .overlay {
      if !item.mine, let stroke = KChatPalette.theirsStroke(theme) {
        shape.stroke(stroke, lineWidth: 1)
      }
    }
    .contentShape(shape)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(item.a11yLabel)
    .kChatAction(item.quote.map { $0.target.isEmpty ? "" : strings.goToQuote } ?? "") {
      actions.onItemPress(item.key, .quote)
    }
    .kMenu(item.menu, preview: .rounded(Self.radius)) { actions.onItemAction(item.key, $0) }
  }

  private func quoteView(_ quote: KChatQuote) -> some View {
    let rule = item.mine ? theme.bg.opacity(0.7) : theme.ind
    let speaker = item.mine ? theme.bg.opacity(0.85) : theme.ind
    let excerpt = item.mine ? theme.bg.opacity(0.85) : theme.sub
    return SwiftUI.Button {
      actions.onItemPress(item.key, .quote)
    } label: {
      HStack(alignment: .top, spacing: 8) {
        Rectangle()
          .fill(rule)
          .frame(width: 2)
        VStack(alignment: .leading, spacing: 2) {
          Text(quote.speaker)
            .kText(.mono(10, .medium, tracking: 0.1))
            .foregroundStyle(speaker)
            .lineLimit(1)
          Text(quote.excerpt)
            .italic(quote.gone)
            .kText(.system(13.5, lineHeight: 1.33))
            .foregroundStyle(excerpt)
            .lineLimit(2)
            .multilineTextAlignment(.leading)
        }
      }
      .fixedSize(horizontal: false, vertical: true)
      .contentShape(Rectangle())
    }
    .buttonStyle(KChatPlainPress())
    .disabled(quote.target.isEmpty)
  }
}

// MARK: - The voice opening in a room

struct KChatVoiceLine: View {
  let theme: KTheme
  let item: KChatItem
  let maxWidth: CGFloat
  let strings: KChatStrings
  let driver: KConversationDriver
  let actions: KConversationActions

  var body: some View {
    VStack(alignment: item.mine ? .trailing : .leading, spacing: 6) {
      KChatVoiceCard(theme: theme, key: item.voiceKey, duration: item.voiceDuration, strings: strings, panel: true, driver: driver, actions: actions)
      if !item.body.isEmpty {
        // the caption is the voice letter's title, never drawn as its body
        Text(item.body)
          .kText(.letterHint)
          .foregroundStyle(theme.sub)
          .padding(.horizontal, 6)
          .frame(maxWidth: maxWidth, alignment: item.mine ? .trailing : .leading)
      }
    }
    .frame(maxWidth: .infinity, alignment: item.mine ? .trailing : .leading)
    .padding(.bottom, 2)
  }
}

/// The voice card for one item, watching the driver's playback (only this view redraws as it
/// plays).
struct KChatVoiceCard: View {
  let theme: KTheme
  let key: String
  let duration: String
  let strings: KChatStrings
  let panel: Bool
  @ObservedObject var driver: KConversationDriver
  let actions: KConversationActions

  var body: some View {
    let mine = driver.playbackKey == key
    KVoiceCard(
      theme: theme,
      playback: mine ? driver.playback : nil,
      durationLabel: duration,
      playLabel: strings.playLabel,
      pauseLabel: strings.pauseLabel,
      unavailable: mine && driver.voiceUnavailable,
      panel: panel,
      onToggle: { actions.onVoiceToggle(key) }
    )
  }
}

// MARK: - A pen-pal letter

struct KLetterBlock: View {
  let theme: KTheme
  let item: KChatItem
  let maxWidth: CGFloat
  let strings: KChatStrings
  let driver: KConversationDriver
  let actions: KConversationActions

  private static let shape = RoundedRectangle(cornerRadius: 16, style: .circular)
  private var edge: Alignment { item.mine ? .trailing : .leading }

  var body: some View {
    VStack(alignment: item.mine ? .trailing : .leading, spacing: 0) {
      if !item.speakerLabel.isEmpty {
        // the row's own label already says whose and when
        Text(item.speakerLabel)
          .kText(.mono(10, .medium, tracking: 0.1))
          .foregroundStyle(theme.mute)
          .padding(.horizontal, 2)
          .padding(.bottom, 6)
          .accessibilityHidden(true)
      }
      if item.kind == .voice {
        // the voice card is its own control; the block only frames it
        block
          .frame(maxWidth: maxWidth, alignment: edge)
          .accessibilityElement(children: .contain)
      } else {
        SwiftUI.Button {
          if item.tappable { actions.onItemPress(item.key, .body) }
        } label: {
          block
        }
        .buttonStyle(KChatPlainPress())
        .frame(maxWidth: maxWidth, alignment: edge)
        .accessibilityLabel(item.a11yLabel)
        .accessibilityAddTraits(item.tappable ? .isButton : [])
        .kMenu(item.menu, preview: .rounded(16)) { actions.onItemAction(item.key, $0) }
      }
      KChatTranslationLine(theme: theme, translation: item.translation, text: item.translationText, strings: strings, maxWidth: maxWidth)
    }
    .frame(maxWidth: .infinity, alignment: edge)
    .padding(.bottom, 10)
  }

  private var block: some View {
    VStack(alignment: .leading, spacing: 6) {
      if item.kind == .voice {
        KChatVoiceCard(theme: theme, key: item.voiceKey, duration: item.voiceDuration, strings: strings, panel: false, driver: driver, actions: actions)
        if !item.body.isEmpty {
          Text(item.body)
            .kText(.letterHint)
            .foregroundStyle(theme.sub)
        }
      } else {
        Text(item.body)
          .kText(.letterRead(15.5, lineHeight: 23.0 / 15.5, place: .penPalLetter))
          .foregroundStyle(theme.ink)
          .multilineTextAlignment(.leading)
          .fixedSize(horizontal: false, vertical: true)
      }
      if !item.timeLabel.isEmpty {
        Text(item.timeLabel)
          .kText(.mono(10, .medium))
          .foregroundStyle(theme.mute)
          .frame(maxWidth: .infinity, alignment: .trailing)
      }
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 12)
    .background(Self.shape.fill(item.mine ? theme.lav2 : theme.sf))
    .overlay(Self.shape.strokeBorder(item.mine ? theme.lav : theme.ln, lineWidth: 1.5))
    .contentShape(Self.shape)
  }
}

// MARK: - A moment

struct KPhotoTile: View {
  let theme: KTheme
  let item: KChatItem
  let side: CGFloat
  let strings: KChatStrings
  let actions: KConversationActions

  private static let shape = RoundedRectangle(cornerRadius: 16, style: .circular)

  var body: some View {
    SwiftUI.Button {
      actions.onItemPress(item.key, .photo)
    } label: {
      KImage(item.photo, size: CGSize(width: side, height: side), contentMode: .fill, placeholder: theme.soft2)
        .clipShape(Self.shape)
        .contentShape(Self.shape)
    }
    .buttonStyle(KChatPlainPress())
    .accessibilityLabel(strings.photoOpen)
    .accessibilityAddTraits(.isImage)
    .kMenu(item.menu, preview: .rounded(16)) { actions.onItemAction(item.key, $0) }
    .frame(maxWidth: .infinity, alignment: item.mine ? .trailing : .leading)
    .padding(.bottom, 6)
  }
}

// MARK: - A song

struct KSongCard: View {
  let theme: KTheme
  let item: KChatItem
  let maxWidth: CGFloat
  let actions: KConversationActions

  private static let shape = RoundedRectangle(cornerRadius: 16, style: .circular)
  private var edge: Alignment { item.mine ? .trailing : .leading }

  var body: some View {
    VStack(alignment: item.mine ? .trailing : .leading, spacing: 0) {
      SwiftUI.Button {
        actions.onItemPress(item.key, .song)
      } label: {
        HStack(spacing: 10) {
          SwiftUI.Image(systemName: "music.note")
            .font(.system(size: 17, weight: .medium))
            .foregroundStyle(theme.ind)
            .accessibilityHidden(true)
          VStack(alignment: .leading, spacing: 2) {
            Text(item.songTitle)
              .kText(.mono(11, .medium))
              .foregroundStyle(theme.ink)
              .lineLimit(1)
            Text(item.songHost)
              .kText(.monoMeta)
              .foregroundStyle(theme.mute)
              .lineLimit(1)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          KLineIcon(.chevronRight, size: 14, lineWidth: 2, color: theme.ind)
        }
        .padding(12)
        .background(Self.shape.fill(item.mine ? theme.lav2 : theme.sf))
        .overlay(Self.shape.strokeBorder(item.mine ? theme.lav : theme.ln, lineWidth: 1.5))
        .contentShape(Self.shape)
      }
      .buttonStyle(KChatPlainPress())
      .frame(maxWidth: maxWidth, alignment: edge)
      .accessibilityLabel(item.a11yLabel)
      .accessibilityAddTraits(.isLink)
      .kMenu(item.menu, preview: .rounded(16)) { actions.onItemAction(item.key, $0) }

      if !item.shelfLink.isEmpty {
        SwiftUI.Button {
          actions.onItemPress(item.key, .shelf)
        } label: {
          Text(item.shelfLink + " ›")
            .kText(.monoAction)
            .foregroundStyle(theme.ind)
            .frame(minHeight: 32)
        }
        .buttonStyle(KChatPlainPress())
        .accessibilityLabel(item.shelfLink)
        .accessibilityAddTraits(.isLink)
        .padding(.top, 2)
      }
    }
    .frame(maxWidth: .infinity, alignment: edge)
    .padding(.bottom, 6)
  }
}

// MARK: - A fold

struct KFoldCard: View {
  let theme: KTheme
  let item: KChatItem
  let fold: KChatFold
  let strings: KChatStrings
  let actions: KConversationActions

  private static let shape = RoundedRectangle(cornerRadius: 16, style: .circular)
  private var open: Bool { fold.state == .open }

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      Text(fold.kindLabel)
        .kText(.monoSection)
        .foregroundStyle(theme.mute)
      if !fold.prompt.isEmpty {
        Text(fold.prompt)
          .kText(.system(16, lineHeight: 1.5))
          .foregroundStyle(theme.ink)
          .fixedSize(horizontal: false, vertical: true)
          .padding(.top, 6)
      }
      switch fold.state {
      case .open:
        ForEach(fold.halves) { half in
          KFoldHalfView(theme: theme, half: half, strings: strings, actions: actions)
        }
      case .waiting:
        Text(fold.hint)
          .kText(.letter(13.5, italic: true))
          .foregroundStyle(theme.mute)
          .padding(.top, 8)
      case .sealed:
        SwiftUI.Button {
          actions.onItemPress(item.key, .fold)
        } label: {
          VStack(alignment: .leading, spacing: 6) {
            Text(fold.hint)
              .kText(.letter(13.5, italic: true))
              .foregroundStyle(theme.sub)
            Text(fold.answerKey + " ›")
              .kText(.monoAction)
              .foregroundStyle(theme.ind)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          .contentShape(Rectangle())
        }
        .buttonStyle(KChatPlainPress())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(fold.hint)
        .accessibilityAddTraits(.isButton)
        .accessibilityAction(named: fold.answerKey) { actions.onItemPress(item.key, .fold) }
        .padding(.top, 8)
      }
    }
    .padding(14 + (open ? 2 : 1.5))
    .frame(maxWidth: .infinity, alignment: .leading)
    .background {
      if open {
        KStickerBackground(shape: Self.shape, fill: theme.sf, stroke: theme.ln, lineWidth: 2, shadow: theme.ln, shadowOffset: 3)
      } else {
        KStickerBackground(shape: Self.shape, fill: theme.soft, stroke: theme.line, lineWidth: 1.5)
      }
    }
    // the open card's hard shadow hangs 3 outside, right and below
    .padding(.trailing, open ? 3 : 0)
    .padding(.bottom, open ? 9 : 6)
    .accessibilityElement(children: .contain)
  }
}

/// One opened half: a line with its own menu, lifted on the card's face.
struct KFoldHalfView: View {
  let theme: KTheme
  let half: KChatFoldHalf
  let strings: KChatStrings
  let actions: KConversationActions

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      VStack(alignment: .leading, spacing: 3) {
        Text(half.speaker)
          .kText(.mono(10, .semibold, tracking: 0.1))
          .foregroundStyle(half.mine ? theme.mute : theme.ind)
        Text(half.body)
          .kText(.system(16, lineHeight: 1.5))
          .foregroundStyle(half.mine ? theme.sub : theme.ink)
          .fixedSize(horizontal: false, vertical: true)
      }
      // 8 of the card's own padding go into the half, so the lifted copy has a margin and the
      // words don't move
      .padding(.horizontal, 8)
      .padding(.top, 10)
      .padding(.bottom, 4)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(theme.sf)
      .contentShape(RoundedRectangle(cornerRadius: 12, style: .circular))
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(half.speaker + ", " + half.body)
      .kMenu(half.menu, preview: .rounded(12)) { actions.onItemAction(half.key, $0) }
      KChatTranslationLine(theme: theme, translation: half.translation, text: half.translationText, strings: strings, maxWidth: .infinity)
        .padding(.horizontal, 2)
    }
    .padding(.horizontal, -8)
  }
}

// MARK: - A line taken back

struct KRecallNote: View {
  let theme: KTheme
  let item: KChatItem

  var body: some View {
    Text(item.body)
      .kText(.mono(10, .medium, tracking: 0.04))
      .foregroundStyle(theme.mute)
      .padding(.horizontal, 6)
      .frame(maxWidth: .infinity, alignment: item.mine ? .trailing : .leading)
      .padding(.bottom, 4)
      .accessibilityLabel(item.a11yLabel.isEmpty ? item.body : item.a11yLabel)
  }
}
