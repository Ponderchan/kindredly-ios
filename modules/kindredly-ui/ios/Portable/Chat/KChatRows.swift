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
    VStack(alignment: item.mine ? .trailing : .leading, spacing: 0) {
      // the live app's caption over the slip: LETTER 2 · NO. 5145 / LETTER 2 · YOU
      if !item.head.isEmpty && item.kind != .voice {
        headText
          .padding(.horizontal, 2)
          .padding(.bottom, 6)
      }
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
    .frame(maxWidth: maxWidth, alignment: item.mine ? .trailing : .leading)
    .frame(maxWidth: .infinity, alignment: item.mine ? .trailing : .leading)
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
    // as wide as its words (a short line is a small slip), the time at the foot on the right
    KHugColumn(spacing: 8) {
      Text(item.body)
        .kText(.letterRead(19, lineHeight: 1.35, place: .penPalLetter))
        .foregroundStyle(theme.ink)
        .multilineTextAlignment(.leading)
        .fixedSize(horizontal: false, vertical: true)
      if !item.timeLabel.isEmpty {
        timeText
      }
    }
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

  /// (owner, 2026-10-20: "the live version's pen-pal messages look good") the live app's paper
  /// slips: square, a 1pt rule; theirs white with an ink hairline, mine the accent's palest wash
  /// ruled in lav
  static let radius: CGFloat = 2
  private static let shape = RoundedRectangle(cornerRadius: radius, style: .circular)

  static func fill(_ theme: KTheme, mine: Bool) -> Color {
    guard mine else { return theme.sf }
    return theme.lav2
  }

  func body(content: Content) -> some View {
    content
      .padding(.horizontal, 16)
      .padding(.vertical, 14)
      .background(Self.shape.fill(Self.fill(theme, mine: mine)))
      .overlay(Self.shape.strokeBorder(mine ? theme.lav : theme.ln, lineWidth: 1))
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

/// A column as wide as its widest child (never wider than offered): the first child at the left,
/// the last at the right — a pen-pal slip's words and its time under them.
struct KHugColumn: Layout {
  var spacing: CGFloat = 8

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let sizes = subviews.map { $0.sizeThatFits(ProposedViewSize(width: proposal.width, height: nil)) }
    let w = min(sizes.map(\.width).max() ?? 0, proposal.width ?? .infinity)
    let h = sizes.map(\.height).reduce(0, +) + spacing * CGFloat(max(0, sizes.count - 1))
    return CGSize(width: w, height: h)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    var y = bounds.minY
    for (i, v) in subviews.enumerated() {
      let size = v.sizeThatFits(ProposedViewSize(width: bounds.width, height: nil))
      let last = i == subviews.count - 1 && subviews.count > 1
      let x = last ? bounds.maxX - size.width : bounds.minX
      v.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(width: last ? size.width : bounds.width, height: size.height))
      y += size.height + spacing
    }
  }
}

// MARK: - THE ONE-LETTER READER (thread/[id])

/*
 THE ONE-LETTER READER in SwiftUI (owner-approved 2026-10-20), the twin of the React Native
 src/screens/chat/ReaderScreen.tsx, on the same model (useReaderModel) through
 src/screens/chat/ReaderNative.tsx and Adapters/KConversationView.swift's KReaderView. It lives
 in this file so the module needs no pod install. One letter of a correspondence, full page, the
 way a letter is read; TS words and dates everything, Swift draws and reports.

 - THE HEADER: KBackBar (the back chevron, Settings' size and place; the thread's count in mono
   capitals, "3 LETTERS IN THIS THREAD"), no rule.
 - THE LETTER CARD, drawn on the letter's PAPER as the Today card is (KPaper; the opening's
   letters.paper, replies are plain): any paper but Plain is its KPaperSurface sheet with every
   piece in the paper's own colours (cardTheme); Plain is the soft card the owner chose on
   2026-10-20 instead of the old black-framed InkPanel: the theme's sf, a 1pt hairline in its
   line colour, the plain paper's soft shadow, corners of plainRadius. No hard ink shadow.
   Inside, top to bottom:
   · the head: their face (a kindred's round portrait, a pen pal's bare mosaic or, with the
     identity switch on, their frosted window; the veil for a deleted account; a member's gold
     stamp round it, C2), the postmark (or, switch on, the courier name with its ♀/♂ and star
     sign over the date), the thread's state in its tone, the stamp at the reader head's 60×72
     (tilted by the letter when it came to you; a stranger's photo stamp keeps Keep / Report on
     its long press), and the ⋯ — a soft grey 34 circle, no ring — that opens Report / Block (the
     React Native ReportSheet, dropped from the ⋯'s foot: onMore carries it in window points);
   · the letter, in the reader's Letter font at the letter tiers (a telegram centred), or the
     paper's face and size; a voice opening plays (the one player is TS's) over its caption;
   · its #topic tag and, for their words in another language, the translate capsule;
   · a hairline, then N LETTERS BETWEEN YOU › (HIDE while open) and REPLY ↓, which gives the
     reply bar the keyboard.
 - EARLIER LETTERS on demand, as the pen-pal chat's soft slips (KLetterCardFrame: square, a 1pt
   rule; mine set in from the left on the accent's palest wash), signed under the words.
 - THE DOCK: the shared KReplyBar (R2: the capsule and the send circle, as on Today and in the
   pen-pal chat; Return is a new line, the letter leaves by the send key), its hint over it; or,
   where nothing can be sent (a deleted account, a closed thread), the line that says why.
 - The keyboard: the Host keeps the keyboard's safe area, so the page shrinks and the dock rides
   it; a drag on the letter dismisses it.
 - VoiceOver: the header is a header; the head row is one element (the name, the date, the
   state); the stamp, the ⋯, the capsule, the toggle and REPLY are buttons; each earlier letter
   is one element.
 */

/// Who is at the top of the card, as TS resolves it (lib/faces): drawn by KFace in the paper's ink.
public enum KReaderFace: Equatable, Sendable {
  case none
  case image(KImageRef?, overscan: CGFloat)
  case mosaic(Int)
  case frost(KFrostSpec)
  case veil
  case frostVeil
  case placeholder
}

/// The letter being read, every word resolved by TS (src/screens/chat/ReaderNative.tsx).
public struct KReaderHero: Equatable, Sendable {
  /// the letter's key ("opening", a message id): the card fades in when it changes
  public var key = ""
  public var paper: KPaper = .plain
  public var face: KReaderFace = .none
  /// a kindred's face is a circle; a pen pal's mosaic, frost or veil is not
  public var faceRound = false
  public var faceSize: CGFloat = 24
  /// a member's C2 stamp round the face: "1ST" | "007" | ""
  public var memberStamp = ""
  /// switch on, a pen pal: the courier name (the date goes under it); "" for the postmark line
  public var name = ""
  public var mark: KLineGlyph?
  public var sign: KLineGlyph?
  /// under the name: OCT.14 · YOU
  public var when = ""
  /// switch off (or a kindred): OCT.14 · NO.7273
  public var postmark = ""
  /// the thread's state (YOUR TURN …) in its tone; "" for none
  public var state = ""
  public var tone: KChatTone = .mute
  /// VoiceOver for the head row; "" reads its words as they are
  public var headA11y = ""
  public var stampId = ""
  public var stampHex = ""
  /// theirs came to you: delivered, tilted by stampLetterId; your own is flat
  public var delivered = false
  public var stampLetterId = ""
  public var stampA11y = ""
  public var isVoice = false
  public var voiceKey = ""
  public var voiceDuration = ""
  /// the words shown (the translation while it is on); a voice letter's caption
  public var body = ""
  /// the letter tier (heroTier): its size and line in points, a telegram centred
  public var size: CGFloat = 21
  public var line: CGFloat = 33
  public var center = false
  /// "#tiny win"; "" for none
  public var topic = ""
  /// the stamp's colour for the tag ("#RRGGBB"); "" for the quiet grey
  public var topicHex = ""
  public var translates = false
  /// "ES→EN"; "" when their language can't be told
  public var translateCode = ""
  public var translateLabel = ""
  public var translateBusy = false
  /// "3 LETTERS BETWEEN YOU ›"; "" when there are no earlier letters
  public var betweenLabel = ""
  public var hideLabel = ""
  /// "REPLY ↓"; "" where nothing can be sent
  public var replyLabel = ""

  public init() {}
}

/// One earlier letter, signed.
public struct KReaderLetter: Equatable, Sendable, Identifiable {
  public var id: String
  public var mine: Bool
  public var body: String
  /// YOU, or them (their name once traded, else their number or courier name)
  public var signature: String
  public var isVoice: Bool
  public var a11y: String

  public init(id: String, mine: Bool, body: String, signature: String, isVoice: Bool, a11y: String) {
    self.id = id
    self.mine = mine
    self.body = body
    self.signature = signature
    self.isVoice = isVoice
    self.a11y = a11y
  }
}

public struct KReaderContent: Equatable, Sendable {
  public var title = ""
  public var backLabel = ""
  /// "" hides the ⋯ (nobody to report)
  public var moreLabel = ""
  public var hero: KReaderHero?
  public var earlier: [KReaderLetter] = []
  /// nothing loaded and offline: the two lines in place of the letter
  public var offlineTitle = ""
  public var offlineBody = ""
  /// where the reply bar was, when nothing can be sent; "" for the bar
  public var closed = ""
  /// the reply bar is drawn (a thread is loaded and open)
  public var composer = false
  public var placeholder = ""
  public var sendLabel = ""
  public var emojiLabel = ""
  public var playLabel = ""
  public var pauseLabel = ""

  public init() {}
}

/// What changes as the reader types or listens (fed by TS's commands).
public final class KReaderDriver: ObservableObject {
  public let reply = KFieldController()
  @Published public var canSend = false
  @Published public var hint = ""
  @Published public var hintAlarm = false
  @Published public var playback: KPlayback?
  @Published public var playbackKey = ""
  @Published public var voiceUnavailable = false

  public init() {}
}

/// What the reader's taps do (made once per surface).
public final class KReaderActions {
  public var onBack: () -> Void = {}
  /// the ⋯: the window y its card drops from (its foot + 6)
  public var onMore: (_ top: CGFloat) -> Void = { _ in }
  public var onTranslate: () -> Void = {}
  public var onText: (String) -> Void = { _ in }
  public var onSend: (String) -> Void = { _ in }
  public var onFocus: (Bool) -> Void = { _ in }
  public var onVoice: (_ key: String) -> Void = { _ in }
  /// a stranger's photo stamp: "keep" | "report"
  public var onStamp: (_ action: String) -> Void = { _ in }

  public init() {}
}

public struct KReaderScreen: View {
  private let theme: KTheme
  private let content: KReaderContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  @ObservedObject private var driver: KReaderDriver
  private let actions: KReaderActions

  @State private var expanded = false
  @State private var focused = false
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  public init(theme: KTheme, content: KReaderContent, topInset: CGFloat, bottomInset: CGFloat, driver: KReaderDriver, actions: KReaderActions) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.driver = driver
    self.actions = actions
  }

  public var body: some View {
    VStack(spacing: 0) {
      theme.bg.frame(height: topInset)
      KBackBar(theme: theme, title: content.title, backLabel: content.backLabel, onBack: actions.onBack)
      ScrollView(.vertical) {
        // lazy: a long thread's earlier letters (hundreds) are only built as they scroll in
        LazyVStack(alignment: .leading, spacing: 0) {
          if content.hero == nil && !content.offlineTitle.isEmpty {
            offline
          }
          if let hero = content.hero {
            KReaderCard(theme: theme, hero: hero, moreLabel: content.moreLabel, expanded: $expanded, strings: content, driver: driver, actions: actions)
              .id(hero.key)
              .transition(.opacity)
            if expanded {
              ForEach(content.earlier) { letter in
                KReaderSlip(theme: theme, letter: letter, voiceKey: hero.voiceKey, voiceDuration: hero.voiceDuration, strings: content, driver: driver, actions: actions)
                  .padding(.top, 10)
              }
            }
          }
        }
        .animation(reduceMotion ? nil : .easeOut(duration: 0.3), value: content.hero?.key)
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 16)
      }
      .scrollIndicators(.hidden)
      .scrollDismissesKeyboard(.interactively)
      dock
    }
    .background(theme.bg.ignoresSafeArea())
    .onChange(of: content.earlier.isEmpty) { _, none in
      if none { expanded = false }
    }
  }

  private var offline: some View {
    VStack(spacing: 8) {
      Text(content.offlineTitle)
        .kText(.system(16, .semibold))
        .foregroundStyle(theme.ink)
      Text(content.offlineBody)
        .kText(.system(14, lineHeight: 20 / 14))
        .foregroundStyle(theme.sub)
        .multilineTextAlignment(.center)
        .frame(maxWidth: 280)
    }
    .frame(maxWidth: .infinity)
    .padding(.top, 48)
  }

  @ViewBuilder
  private var dock: some View {
    Group {
      if !content.closed.isEmpty {
        // nobody home: the letters stay readable; there is no one to send to
        Text(content.closed)
          .kText(.mono(11, .medium, tracking: 0.03))
          .foregroundStyle(theme.mute)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
          .frame(maxWidth: .infinity)
          .padding(.horizontal, 14)
          .padding(.top, 4)
          .padding(.bottom, 6)
      } else if content.composer {
        KReplyBar(
          theme: theme,
          controller: driver.reply,
          placeholder: content.placeholder,
          hint: driver.hint,
          hintWarn: driver.hintAlarm,
          showsHint: true,
          sendState: driver.canSend ? .enabled : .disabled,
          sendLabel: content.sendLabel,
          emojiLabel: content.emojiLabel,
          // a pen-pal letter leaves by the send key; Return is a new line (owner, 2026-10-19)
          returnSends: false,
          onChange: { actions.onText($0) },
          onSubmit: { actions.onSend($0) },
          onFocus: { now in
            if focused != now { focused = now }
            actions.onFocus(now)
          },
          onEscape: {
            guard focused else { return false }
            driver.reply.blur()
            return true
          },
          onSend: { actions.onSend(driver.reply.text) }
        )
        .dynamicTypeSize(...DynamicTypeSize.accessibility3)
      }
    }
    .padding(.horizontal, 16)
    .padding(.top, 6)
    .padding(.bottom, focused ? 10 : max(10, bottomInset))
    .background(theme.bg)
  }
}

/// The letter card (see the note above KReaderFace).
struct KReaderCard: View {
  /// Plain's corners: square-ish, as the soft slips are (owner, 2026-10-20)
  static let plainRadius: CGFloat = 6
  /// Plain's padding inside its hairline (the old panel's 18 20 14 20)
  static let plainPadding = EdgeInsets(top: 18, leading: 20, bottom: 14, trailing: 20)
  static let stampWidth: CGFloat = KStampLadder.readerHead.w
  static let moreSide: CGFloat = 34

  let theme: KTheme
  let hero: KReaderHero
  let moreLabel: String
  @Binding var expanded: Bool
  let strings: KReaderContent
  let driver: KReaderDriver
  let actions: KReaderActions

  @State private var moreBottom: CGFloat = 0
  @Environment(\.dynamicTypeSize) private var typeSize
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  /// every piece in the paper's own colours (Plain: the theme's)
  private var ink: KTheme { hero.paper.cardTheme(over: theme) }
  private var big: Bool { typeSize.isAccessibilitySize }

  var body: some View {
    let paper = hero.paper
    VStack(alignment: .leading, spacing: 0) {
      head
      letter
      foot
      Rectangle()
        .fill(paper.themed ? theme.line : paper.line.opacity(0.35))
        .frame(height: 1)
        .padding(.top, 14)
        .padding(.bottom, 10)
        .accessibilityHidden(true)
      toggles
    }
    .frame(maxWidth: .infinity, alignment: .topLeading)
    .padding(paper.themed ? Self.plainPadding : EdgeInsets(top: paper.edge.width + KPaper.padding, leading: paper.edge.width + KPaper.padding, bottom: paper.edge.width + KPaper.padding, trailing: paper.edge.width + KPaper.padding))
    .background { surface }
    // the receipt's teeth and the plain shadow hang outside the sheet
    .padding(.vertical, paper.torn ? KPaper.tornHang : 0)
    .padding(.bottom, 6)
  }

  @ViewBuilder
  private var surface: some View {
    if hero.paper.themed {
      let shape = RoundedRectangle(cornerRadius: Self.plainRadius, style: .continuous)
      shape
        .fill(theme.sf)
        .overlay(shape.strokeBorder(theme.line, lineWidth: 1))
        .kSoftShadows(hero.paper.shadow.map { [$0.soft] } ?? [], in: shape)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    } else {
      KPaperSurface(paper: hero.paper, theme: theme)
    }
  }

  // ── the head: who, when, the stamp it travelled under, and the ⋯ ──
  private var head: some View {
    HStack(alignment: .center, spacing: 10) {
      if hero.face != .none {
        face.frame(minWidth: 28)
      }
      who
        .frame(maxWidth: .infinity, alignment: .leading)
      if !hero.stampId.isEmpty {
        stamp
      }
      if !moreLabel.isEmpty {
        more
      }
    }
    .dynamicTypeSize(...DynamicTypeSize.accessibility2)
  }

  @ViewBuilder
  private var face: some View {
    let stamp = KMemberStamp(hero.memberStamp)
    switch hero.face {
    case .none:
      EmptyView()
    case let .image(ref, overscan):
      KFace(theme: ink, source: .image(ref, overscan: overscan), size: hero.faceSize, round: hero.faceRound, ground: ink.sf, stamp: stamp)
    case let .mosaic(mask):
      KFace(theme: ink, source: .mosaic(mask: mask, tint: ink.ink), size: hero.faceSize, round: hero.faceRound, ground: ink.sf, stamp: stamp)
    case let .frost(spec):
      KFace(theme: ink, source: .frost(spec), size: hero.faceSize, round: false, ground: ink.sf, stamp: stamp)
    case .veil:
      KFace(theme: ink, source: .veil, size: hero.faceSize, round: hero.faceRound, ground: ink.sf)
    case .frostVeil:
      KFace(theme: ink, source: .frostVeil, size: hero.faceSize, round: false, ground: ink.sf)
    case .placeholder:
      KFace(theme: ink, source: .placeholder, size: hero.faceSize, round: hero.faceRound, ground: ink.sf)
    }
  }

  @ViewBuilder
  private var who: some View {
    let lines = VStack(alignment: .leading, spacing: 2) {
      if !hero.name.isEmpty {
        HStack(alignment: .firstTextBaseline, spacing: 0) {
          Text(hero.name)
            .kText(.system(17, .semibold))
            .foregroundStyle(ink.ink)
            .lineLimit(big ? nil : 2)
            .fixedSize(horizontal: false, vertical: true)
          KWhoMarks(mark: hero.mark, sign: hero.sign, size: 14, color: ink.sub)
        }
        if !hero.when.isEmpty {
          Text(hero.when)
            .kText(.mono(11, .medium, tracking: 0.08))
            .foregroundStyle(ink.sub)
            .lineLimit(big ? nil : 1)
        }
      } else if !hero.postmark.isEmpty {
        Text(hero.postmark)
          .kText(.mono(11, .semibold, tracking: 0.08))
          .foregroundStyle(ink.sub)
          .lineLimit(big ? nil : 1)
          .minimumScaleFactor(big ? 1 : 0.8)
      }
      if !hero.state.isEmpty {
        Text(hero.state)
          .kText(.mono(10, .semibold, tracking: 0.1))
          .foregroundStyle(toneColor)
          .lineLimit(big ? nil : 1)
      }
    }
    if hero.headA11y.isEmpty {
      lines.accessibilityElement(children: .combine)
    } else {
      lines
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(hero.headA11y)
    }
  }

  private var toneColor: Color {
    switch hero.tone {
    case .mute: return ink.mute
    case .ind: return ink.ind
    case .brass: return ink.isDark ? KBrand.waxGold : KBrand.brassSeal
    }
  }

  @ViewBuilder
  private var stamp: some View {
    let drawn = KStamp(
      id: hero.stampId,
      width: Self.stampWidth,
      dark: ink.isDark,
      delivered: hero.delivered,
      letterId: hero.stampLetterId.isEmpty ? nil : hero.stampLetterId,
      fallbackHex: hero.stampHex.isEmpty ? nil : hero.stampHex,
      accessibilityLabel: hero.stampA11y.isEmpty ? nil : hero.stampA11y
    )
    KReaderStampKeep(id: hero.stampId, width: Self.stampWidth, stamp: drawn, actions: actions)
  }

  /// the ⋯: a soft grey circle, no ring (owner, 2026-10-20); the card drops from its foot
  private var more: some View {
    SwiftUI.Button {
      actions.onMore(moreBottom + 6)
    } label: {
      KLineIcon(.more, size: 16, lineWidth: 3, color: ink.sub)
        .frame(width: Self.moreSide, height: Self.moreSide)
        .background(Circle().fill(ink.isDark ? Color.white.opacity(0.12) : Color.black.opacity(0.06)))
        // a 44 target round the 34 circle
        .padding(5)
        .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .padding(-5)
    .onGeometryChange(for: CGFloat.self) { $0.frame(in: .global).maxY } action: { y in
      if abs(moreBottom - y) > 0.5 { moreBottom = y }
    }
    .accessibilityLabel(moreLabel)
  }

  // ── the letter: words in the reader's Letter font (or the paper's face), or a voice letter ──
  @ViewBuilder
  private var letter: some View {
    if hero.isVoice {
      VStack(alignment: .leading, spacing: 12) {
        KReaderVoiceCard(theme: ink, key: hero.voiceKey, duration: hero.voiceDuration, strings: strings, panel: true, driver: driver, actions: actions)
        if !hero.body.isEmpty {
          Text(hero.body)
            .kText(.letterRead(17, lineHeight: 26 / 17, place: .reader))
            .foregroundStyle(ink.sub)
            .fixedSize(horizontal: false, vertical: true)
        }
      }
      .padding(.top, 18)
    } else {
      Text(hero.body)
        .kText(letterStyle)
        .foregroundStyle(ink.ink)
        .modifier(KReaderMisprint(shadow: hero.paper.textShadow))
        .multilineTextAlignment(hero.center ? .center : .leading)
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: .infinity, alignment: hero.center ? .center : .leading)
        .contentTransition(.opacity)
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.25), value: hero.body)
        .padding(.top, hero.center ? 26 : 18)
        .padding(.bottom, hero.center ? 10 : 0)
        .textSelection(.enabled)
    }
  }

  /// Plain: the tier in the reader's Letter font; on paper, the paper's face and size for the tier
  private var letterStyle: KTextStyle {
    let paper = hero.paper
    if paper.themed {
      return .letterRead(hero.size, lineHeight: hero.size > 0 ? hero.line / hero.size : nil, place: .reader)
    }
    let size = paper.cardSize(tier: hero.size)
    let line = paper.cardLine(size: size, tierSize: hero.size, tierLine: hero.line)
    return paper.letterStyle(size: size, lineHeight: line, place: .reader)
  }

  // ── its topic and, for their words in another language, the capsule ──
  @ViewBuilder
  private var foot: some View {
    if !hero.topic.isEmpty || hero.translates {
      ViewThatFits(in: .horizontal) {
        HStack(alignment: .center, spacing: 10) {
          topicTag
          Spacer(minLength: 0)
          capsule
        }
        VStack(alignment: .leading, spacing: 10) {
          topicTag
          capsule
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(.trailing, hero.paper.fold ? 36 : 3)
      .padding(.bottom, 3)
      .padding(.top, 18)
      .dynamicTypeSize(...DynamicTypeSize.accessibility2)
    }
  }

  @ViewBuilder
  private var topicTag: some View {
    if !hero.topic.isEmpty {
      // the App Store tag, as the Today card draws it: the stamp's own colour, the words in ink
      KTopicTag(
        theme: ink,
        text: hero.topic,
        tone: .custom(
          fill: KStampFrame.rgb(hex: hero.topicHex).map { KStampFrame.color($0) } ?? KStampFrame.color(KStampFrame.v3TagNeutral),
          text: KStampFrame.color(KStampFrame.v3Ink)
        )
      )
    }
  }

  @ViewBuilder
  private var capsule: some View {
    if hero.translates {
      KTranslateCapsule(theme: ink, code: hero.translateCode, label: hero.translateLabel, enabled: !hero.translateBusy) {
        actions.onTranslate()
      }
    }
  }

  // ── N LETTERS BETWEEN YOU › and REPLY ↓ ──
  private var toggles: some View {
    HStack(alignment: .center, spacing: 12) {
      if !hero.betweenLabel.isEmpty {
        SwiftUI.Button {
          withAnimation(reduceMotion ? nil : .easeOut(duration: 0.25)) { expanded.toggle() }
        } label: {
          Text(expanded ? hero.hideLabel : hero.betweenLabel)
            .kText(.mono(11, .semibold, tracking: 0.14))
            .foregroundStyle(ink.ink)
            .multilineTextAlignment(.leading)
            .padding(.vertical, 8)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        .padding(.vertical, -8)
        .accessibilityAddTraits(expanded ? .isSelected : [])
      }
      Spacer(minLength: 0)
      if !hero.replyLabel.isEmpty {
        SwiftUI.Button {
          driver.reply.focus()
        } label: {
          Text(hero.replyLabel)
            .kText(.mono(11, .semibold, tracking: 0.14))
            .foregroundStyle(ink.ind)
            .padding(.vertical, 8)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        .padding(.vertical, -8)
      }
    }
    .frame(minHeight: 28)
    .padding(.trailing, hero.paper.fold ? 36 : 0)
    .dynamicTypeSize(...DynamicTypeSize.accessibility2)
  }
}

/// The stamp in the head; a stranger's photo stamp keeps Keep / Report on its long press, as the
/// Today card's does (KLetterCardStamp), reported to TS (onStamp).
struct KReaderStampKeep<Stamp: View>: View {
  let id: String
  let width: CGFloat
  let stamp: Stamp
  let actions: KReaderActions

  @ObservedObject private var registry = KCustomStamps.shared

  var body: some View {
    if id.hasPrefix("c:"), let info = registry.info(id), info.canKeep {
      let words = registry.words
      Color.clear
        .frame(width: width, height: KStampFrame.height(width))
        .overlay(stamp)
        .contentShape(Rectangle())
        .contextMenu {
          if info.kept {
            SwiftUI.Button(words.inAlbum) {}.disabled(true)
          } else {
            SwiftUI.Button(words.keep) { actions.onStamp("keep") }
          }
          SwiftUI.Button(words.report, role: .destructive) { actions.onStamp("report") }
          SwiftUI.Button(words.neverMind) {}
        }
        .accessibilityActions {
          if !info.kept {
            SwiftUI.Button(words.keep) { actions.onStamp("keep") }
          }
          SwiftUI.Button(words.report) { actions.onStamp("report") }
        }
    } else {
      stamp
    }
  }
}

/// An earlier letter: the pen-pal chat's soft slip (KLetterCardFrame), signed under the words.
struct KReaderSlip: View {
  let theme: KTheme
  let letter: KReaderLetter
  let voiceKey: String
  let voiceDuration: String
  let strings: KReaderContent
  let driver: KReaderDriver
  let actions: KReaderActions

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      if letter.isVoice {
        KReaderVoiceCard(theme: theme, key: voiceKey, duration: voiceDuration, strings: strings, panel: true, driver: driver, actions: actions)
      }
      if !letter.body.isEmpty {
        Text(letter.body)
          .kText(.letterRead(15.5, lineHeight: 24 / 15.5, place: .reader))
          .foregroundStyle(letter.isVoice ? theme.sub : theme.ink)
          .fixedSize(horizontal: false, vertical: true)
          .textSelection(.enabled)
      }
      Text(letter.signature)
        .kText(.mono(10, .medium, tracking: 0.08))
        .foregroundStyle(theme.mute)
        .accessibilityHidden(true)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .modifier(KLetterCardFrame(theme: theme, mine: letter.mine))
    .accessibilityElement(children: letter.isVoice ? .contain : .ignore)
    .accessibilityLabel(letter.a11y)
    .padding(.leading, letter.mine ? 28 : 0)
    .padding(.trailing, letter.mine ? 0 : 28)
  }
}

/// The voice opening's card on the one player TS owns (only this view redraws as it plays).
struct KReaderVoiceCard: View {
  let theme: KTheme
  let key: String
  let duration: String
  let strings: KReaderContent
  let panel: Bool
  @ObservedObject var driver: KReaderDriver
  let actions: KReaderActions

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
      onToggle: { actions.onVoice(key) }
    )
  }
}

/// Riso's misregistration on the letter (a paper with no text shadow gets nothing).
private struct KReaderMisprint: ViewModifier {
  let shadow: KPaperShadow?

  func body(content: Content) -> some View {
    if let shadow {
      content.shadow(color: shadow.color, radius: 0, x: shadow.x, y: shadow.y)
    } else {
      content
    }
  }
}
