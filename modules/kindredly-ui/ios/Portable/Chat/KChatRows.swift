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
 - a pen-pal letter (KLetterBlock), as the chat composers' A2 draws it (owner, 2026-10-18): a
   card with a 2 ln outline, corners 18, padding 14 16; theirs on sf across the whole width, mine
   on soft (soft2 on Midnight, where soft is sf) set 40 in from the left. Inside, the head line in
   mono 500 10 at .14em, LETTER 3 · NO. 5422 in mute or LETTER 3 · YOU in ind (the opening:
   WHERE IT BEGAN · NO. 5422), then the words in the reader's Letter font at 19 on 1.35 (owner
   question 1: pen-pal letters are letters being read; Newsreader by default, never a fixed
   Garamond), and the 24-hour time at the foot, on the right, as before. The day moved out of the
   old label line into a day rule above the card when it changes (TS sets dayLabel), as in a
   room. A tap opens the reader; the menu, its lifted preview and VoiceOver's frame are the card.
 - a moment (KPhotoTile): a square 70% of the width, corners 16, soft2 until it loads.
 - a song (KSongCard): the light-outline card with music.note in ind, the title, the host and a
   chevron; the shelf link under the last song.
 - a fold (KFoldCard): sealed on soft with a 1.5 line outline; opened on sf with a 2 ln outline
   and a 3/3 hard shadow; each opened half is a line with its own menu.
 - a line taken back (KRecallNote), the day rule (KChatDayRule), the translation under a line
   (KChatTranslationLine), the voice opening (a KVoiceCard on the one player; its caption keeps
   the opening letter's menu and translation, and in letters opens the reader).

 ACCESSIBILITY. Each line is one element: its label is the owner's a11yLabel (whose, the words,
 the day), the menu's items are its actions (kMenu), and the nested tap targets are named
 actions on it (the quote jump). Day rules are headers, so the rotor can jump by day. Tappable
 blocks are buttons. A moment reads whose and which day (its a11yLabel), not only "Open photo".
 The voice opening is a labelled group (whose, the caption): the card is its play control, the
 caption its words with the letter's menu. A line a quote jump lands on takes VoiceOver's focus
 (voFocus, KConversation), so the jump is heard, not only lit.

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
  /// VoiceOver's focus, set to a row's key after a quote jump (not part of ==: it is the same
  /// state for every row, for the life of the list)
  let voFocus: AccessibilityFocusState<String?>.Binding

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
      KChatBubble(theme: theme, item: item, maxWidth: (width * 0.84).rounded(), strings: strings, actions: actions, voFocus: voFocus)
    case .letter:
      KLetterBlock(theme: theme, item: item, maxWidth: width, strings: strings, driver: driver, actions: actions, voFocus: voFocus)
    case .photo:
      KPhotoTile(theme: theme, item: item, side: (width * 0.7).rounded(), strings: strings, actions: actions, voFocus: voFocus)
    case .song:
      KSongCard(theme: theme, item: item, maxWidth: (width * 0.86).rounded(), actions: actions, voFocus: voFocus)
    case .fold:
      if let fold = item.fold {
        KFoldCard(theme: theme, item: item, fold: fold, strings: strings, actions: actions)
      }
    case .recalled:
      KRecallNote(theme: theme, item: item, voFocus: voFocus)
    case .voice:
      if variant == .letters {
        KLetterBlock(theme: theme, item: item, maxWidth: width, strings: strings, driver: driver, actions: actions, voFocus: voFocus)
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
  let voFocus: AccessibilityFocusState<String?>.Binding

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
    .accessibilityFocused(voFocus, equals: item.key)
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

  private var edge: Alignment { item.mine ? .trailing : .leading }

  var body: some View {
    VStack(alignment: item.mine ? .trailing : .leading, spacing: 6) {
      KChatVoiceCard(theme: theme, key: item.voiceKey, duration: item.voiceDuration, strings: strings, panel: true, driver: driver, actions: actions)
      if !item.body.isEmpty {
        // the caption is the voice letter's title, never drawn as its body; it keeps the opening
        // letter's menu (copy, translate, keep)
        Text(item.body)
          .kText(.letterHint)
          .foregroundStyle(theme.sub)
          .multilineTextAlignment(item.mine ? .trailing : .leading)
          .fixedSize(horizontal: false, vertical: true)
          .padding(.horizontal, 6)
          .padding(.vertical, 2)
          // the page's own colour under the lifted copy, which is see-through otherwise and lifts
          // onto the system's preview platter (KMenu); drawn in Midnight only, where that platter
          // is off-theme, so the light themes lift exactly as before
          .background(theme.isDark ? theme.bg : Color.clear)
          .contentShape(RoundedRectangle(cornerRadius: 8, style: .circular))
          .kMenu(item.menu, preview: .rounded(8)) { actions.onItemAction(item.key, $0) }
          .frame(maxWidth: maxWidth, alignment: edge)
      }
      KChatTranslationLine(theme: theme, translation: item.translation, text: item.translationText, strings: strings, maxWidth: maxWidth)
    }
    .frame(maxWidth: .infinity, alignment: edge)
    // a group VoiceOver names (whose, the caption): the card plays, the caption has the menu
    .accessibilityElement(children: .contain)
    .accessibilityLabel(item.a11yLabel)
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
  /// the list's width less its gutters: theirs take all of it, mine all but 40 (A2)
  let maxWidth: CGFloat
  let strings: KChatStrings
  let driver: KConversationDriver
  let actions: KConversationActions
  let voFocus: AccessibilityFocusState<String?>.Binding

  /// mine stand 40 in from the left (A2)
  static let mineIndent: CGFloat = 40

  private var indent: CGFloat { item.mine ? Self.mineIndent : 0 }

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      if item.head.isEmpty && !item.speakerLabel.isEmpty {
        // a block with no head line (a builder without the cards): its old label above it, which
        // says whose and when (the row's own label already says so to VoiceOver)
        Text(item.speakerLabel)
          .kText(.mono(10, .medium, tracking: 0.1))
          .foregroundStyle(theme.mute)
          .padding(.horizontal, 2)
          .padding(.bottom, 6)
          .accessibilityHidden(true)
      }
      if item.kind == .voice {
        voiceCard
      } else {
        SwiftUI.Button {
          open()
        } label: {
          textCard
        }
        .buttonStyle(KChatPlainPress())
        .accessibilityLabel(item.a11yLabel)
        .accessibilityAddTraits(item.tappable ? .isButton : [])
        .accessibilityFocused(voFocus, equals: item.key)
        // the menu, its lift and VoiceOver's frame are the card
        .kMenu(item.menu, preview: .rounded(KLetterCardFrame.radius)) { actions.onItemAction(item.key, $0) }
      }
      KChatTranslationLine(theme: theme, translation: item.translation, text: item.translationText, strings: strings, maxWidth: .infinity)
    }
    .padding(.leading, indent)
    .frame(maxWidth: maxWidth, alignment: .leading)
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.bottom, 10)
  }

  private func open() {
    if item.tappable { actions.onItemPress(item.key, .body) }
  }

  /// LETTER 3 · NO. 5422 in mute, LETTER 3 · YOU in ind
  @ViewBuilder
  private var headText: some View {
    if !item.head.isEmpty {
      Text(item.head)
        .kText(.mono(10, .medium, tracking: 0.14))
        .foregroundStyle(item.mine ? theme.ind : theme.mute)
        .lineLimit(1)
        .accessibilityHidden(true)
    }
  }

  private var timeText: some View {
    Text(item.timeLabel)
      .kText(.mono(10, .medium))
      .foregroundStyle(theme.mute)
  }

  /// The head line, the words, and the time at the foot on the right.
  private var textCard: some View {
    VStack(alignment: .leading, spacing: 8) {
      headText
      Text(item.body)
        .kText(.letterRead(19, lineHeight: 1.35, place: .penPalLetter))
        .foregroundStyle(theme.ink)
        .multilineTextAlignment(.leading)
        .fixedSize(horizontal: false, vertical: true)
      if !item.timeLabel.isEmpty {
        timeText.frame(maxWidth: .infinity, alignment: .trailing)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .modifier(KLetterCardFrame(theme: theme, mine: item.mine))
  }

  /// The voice opening in letters: the card is its own control (the disc plays; the bars, as in a
  /// room, take no tap); the caption (and a time, when there is one) is the letter: a tap opens the
  /// reader, a long press its menu.
  private var voiceCard: some View {
    VStack(alignment: .leading, spacing: 8) {
      headText
      KChatVoiceCard(theme: theme, key: item.voiceKey, duration: item.voiceDuration, strings: strings, panel: false, driver: driver, actions: actions)
      if !item.body.isEmpty || !item.timeLabel.isEmpty {
        SwiftUI.Button {
          open()
        } label: {
          VStack(alignment: .leading, spacing: 6) {
            if !item.body.isEmpty {
              Text(item.body)
                .kText(.letterHint)
                .foregroundStyle(theme.sub)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
            }
            if !item.timeLabel.isEmpty {
              timeText.frame(maxWidth: .infinity, alignment: .trailing)
            }
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          .contentShape(Rectangle())
        }
        .buttonStyle(KChatPlainPress())
        .accessibilityAddTraits(item.tappable ? .isButton : [])
        // the card's own face under the lifted copy (KLetterCardFrame's fill), as the room's
        // caption takes the page's: Midnight only, the light themes lift as before
        .background(theme.isDark ? KLetterCardFrame.fill(theme, mine: item.mine) : Color.clear)
        .kMenu(item.menu, preview: .rounded(8)) { actions.onItemAction(item.key, $0) }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .modifier(KLetterCardFrame(theme: theme, mine: item.mine))
    // a group VoiceOver names (whose, the caption): the card plays, the caption opens the letter
    .accessibilityElement(children: .contain)
    .accessibilityLabel(item.a11yLabel)
  }
}

/// The letter card's face (A2): padding 14 16, a 2 ln outline, corners 18; theirs sf, mine soft
/// (soft2 on Midnight, where soft is sf and the two would be one).
struct KLetterCardFrame: ViewModifier {
  let theme: KTheme
  let mine: Bool

  static let radius: CGFloat = 18
  private static let shape = RoundedRectangle(cornerRadius: radius, style: .circular)

  static func fill(_ theme: KTheme, mine: Bool) -> Color {
    guard mine else { return theme.sf }
    return theme.isDark ? theme.soft2 : theme.soft
  }

  func body(content: Content) -> some View {
    content
      .padding(.horizontal, 16)
      .padding(.vertical, 14)
      .background(Self.shape.fill(Self.fill(theme, mine: mine)))
      // (owner, 2026-10-20: no black frames) theirs on white keeps a light line so it holds its shape
      // on the white page; mine is its soft fill alone
      .overlay(Self.shape.strokeBorder(mine ? Color.clear : theme.line, lineWidth: 1))
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
  let voFocus: AccessibilityFocusState<String?>.Binding

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
    // whose moment and which day ("Open photo" is in it); the Button is the button trait
    .accessibilityLabel(item.a11yLabel.isEmpty ? strings.photoOpen : item.a11yLabel)
    .accessibilityAddTraits(.isImage)
    .accessibilityFocused(voFocus, equals: item.key)
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
  let voFocus: AccessibilityFocusState<String?>.Binding

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
      .accessibilityFocused(voFocus, equals: item.key)
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
      case .sealed where fold.answerKey.isEmpty:
        // a room nothing can be left in: no door, only the hint if there is one
        if !fold.hint.isEmpty {
          Text(fold.hint)
            .kText(.letter(13.5, italic: true))
            .foregroundStyle(theme.mute)
            .padding(.top, 8)
        }
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
        KStickerBackground(shape: Self.shape, fill: theme.sf, stroke: theme.line, lineWidth: 1) // no ink frame (owner, 10-20)
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
  let voFocus: AccessibilityFocusState<String?>.Binding

  var body: some View {
    Text(item.body)
      .kText(.mono(10, .medium, tracking: 0.04))
      .foregroundStyle(theme.mute)
      .padding(.horizontal, 6)
      .frame(maxWidth: .infinity, alignment: item.mine ? .trailing : .leading)
      .padding(.bottom, 4)
      .accessibilityLabel(item.a11yLabel.isEmpty ? item.body : item.a11yLabel)
      // a quote of a line later taken back still jumps here
      .accessibilityFocused(voFocus, equals: item.key)
  }
}
