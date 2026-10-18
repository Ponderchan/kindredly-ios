// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE KINDREDS BAR (chat composers, Prompt 3; the owner's final, 2026-10-18): a room's composer,
 once names are traded. Before names the pen-pal chat writes in the reply bar (Kit/KReplyBar),
 which only sends words; here there is more to leave, so the bar has a key either side.

   ( ✦ )  ( leave something here…        ☺  (✈) )  ( + )      one row 56 tall, the dock 16 from
    52                 52 tall                       52        either edge, its three parts 10
                                                               apart; no voice anywhere
 - THE IDEAS KEY (left): a 52 circle, a 2 ln outline on sf, the I1 sparkle 24 in ink at 1.9.
   Open, its ground fills with ink and the sparkle turns lime (#D8F04A), on a .2s ease; it opens
   the ideas bubble above the bar (KIdeasBubble, below). VoiceOver: a button, selected while the
   bubble is up, whose escape closes it.
 - THE CAPSULE: 52 tall at one line, corners of 26, on soft (Midnight: soft2, since its soft is
   its sf and the round keys' sf would melt into it), padding 0 6 0 16. In it the field
   (Kit/KComposerField, system 16, the placeholder "leave something here…" in mute; one line
   growing to five, three at the accessibility sizes, then it scrolls inside, as the room's
   field did), the emoji key (KEmojiKey, a 40 circle, lav while the system emoji keyboard is up)
   and, only while there are words, the send key (KSendDisc: a 40 circle in ind with the white
   plane 16; the disabled ground while the words can't go yet, a fold without its question say).
   A tap on the capsule's own ground gives the field the keyboard.
 - THE + KEY (right): a 52 circle, a 2 ln outline on sf, the plus 16 long at a 2.4 stroke. Open,
   it turns 45° into an ×, its ground fills with ink and the plus turns white, on a springy .35s
   (KChatMotion.plusTurn; a plain ease under Reduce Motion). It opens the + tray
   (Chat/KTraceTray.swift).
 - MIDNIGHT'S INK IS PALE, so "filled with ink" would put lime and white on near-white: there the
   two open keys and the bubble take the theme's lav (#2E2A66) instead, an indigo that keeps the
   lime and the white legible and still reads as the bar's one dark, lit thing.
 - THE THREE PANELS SHUT EACH OTHER (the ideas bubble, the emoji keyboard, the + tray): the dock
   decides (KDock.swift), this bar only reports the presses and the field's focus.
 - The round keys and the capsule's icons don't grow with Dynamic Type (the keys stop at
   xxxLarge, as KTabBar's fixed bar does); the field does. The keys and the capsule's two keys
   keep to the bottom line, centred on the resting row, as the field grows.
 - ESCAPE ON THE KEYS (VoiceOver's two-finger Z): on the ideas key it closes the bubble, on the
   + the tray; with nothing of its own open it goes out of the room (onEscapeOut, the stack's
   back, which is where escape would have gone anyway). The action is always there: adding it
   only while open (KChatEscape) swaps the key for a new one each time it opens, which drops
   its springy turn and fades it out and back instead.
 */
struct KKindredBar: View {
  /// the bar's numbers (Prompt 3)
  static let rowHeight: CGFloat = 56
  static let key: CGFloat = 52
  static let capsuleKey: CGFloat = 40
  static let gap: CGFloat = 10

  let theme: KTheme
  let controller: KFieldController
  let placeholder: String
  let autocapitalize: Bool
  /// the words as typed may go (the send key's ground)
  let canSend: Bool
  let sendLabel: String
  let emojiLabel: String
  let ideasLabel: String
  let plusLabel: String
  let plusCloseLabel: String
  let ideasOpen: Bool
  let trayOpen: Bool
  let onIdeas: () -> Void
  let onPlus: () -> Void
  let onCloseIdeas: () -> Void
  let onCloseTray: () -> Void
  /// VoiceOver's escape on a key with nothing of its own open: out of the room (the stack's back)
  let onEscapeOut: () -> Void
  let onChange: (String) -> Void
  let onSubmit: (String) -> Void
  let onFocus: (Bool) -> Void
  let onSend: () -> Void

  /// there are words in the field (the send key shows): the reader's edits, and every setText
  @State private var hasWords: Bool
  @Environment(\.dynamicTypeSize) private var typeSize
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  init(
    theme: KTheme,
    controller: KFieldController,
    placeholder: String,
    autocapitalize: Bool,
    canSend: Bool,
    sendLabel: String,
    emojiLabel: String,
    ideasLabel: String,
    plusLabel: String,
    plusCloseLabel: String,
    ideasOpen: Bool,
    trayOpen: Bool,
    onIdeas: @escaping () -> Void,
    onPlus: @escaping () -> Void,
    onCloseIdeas: @escaping () -> Void,
    onCloseTray: @escaping () -> Void,
    onEscapeOut: @escaping () -> Void,
    onChange: @escaping (String) -> Void,
    onSubmit: @escaping (String) -> Void,
    onFocus: @escaping (Bool) -> Void,
    onSend: @escaping () -> Void
  ) {
    self.theme = theme
    self.controller = controller
    self.placeholder = placeholder
    self.autocapitalize = autocapitalize
    self.canSend = canSend
    self.sendLabel = sendLabel
    self.emojiLabel = emojiLabel
    self.ideasLabel = ideasLabel
    self.plusLabel = plusLabel
    self.plusCloseLabel = plusCloseLabel
    self.ideasOpen = ideasOpen
    self.trayOpen = trayOpen
    self.onIdeas = onIdeas
    self.onPlus = onPlus
    self.onCloseIdeas = onCloseIdeas
    self.onCloseTray = onCloseTray
    self.onEscapeOut = onEscapeOut
    self.onChange = onChange
    self.onSubmit = onSubmit
    self.onFocus = onFocus
    self.onSend = onSend
    _hasWords = State(initialValue: Self.words(controller.text))
  }

  private static func words(_ text: String) -> Bool {
    !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
  }

  /// an open key's ground: ink, or Midnight's lav (its ink is pale; see the header)
  static func openFill(_ theme: KTheme) -> Color {
    theme.isDark ? theme.lav : theme.ink
  }

  private var capsuleFill: Color {
    theme.isDark ? theme.soft2 : theme.soft
  }

  var body: some View {
    HStack(alignment: .bottom, spacing: Self.gap) {
      ideasKey
      capsule
      plusKey
    }
    // the 52 keys in a 56 row
    .padding(.vertical, (Self.rowHeight - Self.key) / 2)
    .onReceive(controller.$textRequest) { _ in
      // a setText (a draft, USE IT, a send's clear, words put back): the controller holds them
      let now = Self.words(controller.text)
      if hasWords != now { withAnimation(.easeOut(duration: 0.2)) { hasWords = now } }
    }
    .accessibilityElement(children: .contain)
  }

  // MARK: the ideas key

  private var ideasKey: some View {
    SwiftUI.Button(action: onIdeas) {
      KLineIcon(.sparkle, size: 24, lineWidth: 1.9, color: ideasOpen ? KBrand.lime : theme.ink)
        .frame(width: Self.key, height: Self.key)
        .background(Circle().fill(ideasOpen ? Self.openFill(theme) : theme.sf))
        .overlay(Circle().strokeBorder(theme.ln, lineWidth: 2))
        .contentShape(Circle())
        .animation(.easeOut(duration: 0.2), value: ideasOpen)
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityLabel(ideasLabel)
    .accessibilityAddTraits(ideasOpen ? .isSelected : [])
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
    // escape on the key closes the bubble it opened; with the bubble shut it goes back, as escape
    // anywhere else does (see ESCAPE ON THE KEYS)
    .accessibilityAction(.escape) { ideasOpen ? onCloseIdeas() : onEscapeOut() }
  }

  // MARK: the capsule

  private var capsule: some View {
    HStack(alignment: .bottom, spacing: 6) {
      KComposerField(
        theme: theme,
        controller: controller,
        placeholder: placeholder,
        size: 16,
        // at the accessibility sizes a line is ~40pt: three, then it scrolls inside
        maxLines: typeSize.isAccessibilitySize ? 3 : 5,
        returnSends: true,
        autocapitalize: autocapitalize,
        onChange: { text in
          let now = Self.words(text)
          if hasWords != now { withAnimation(.easeOut(duration: 0.2)) { hasWords = now } }
          onChange(text)
        },
        onSubmit: onSubmit,
        onFocus: onFocus
      )
      .padding(.vertical, 14)
      .frame(minHeight: Self.key)
      .frame(maxWidth: .infinity, alignment: .leading)
      KEmojiKey(theme: theme, controller: controller, label: emojiLabel, side: Self.capsuleKey, circle: true)
        .alignmentGuide(.bottom) { $0[VerticalAlignment.center] + Self.key / 2 }
        .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
      if hasWords {
        KSendDisc(theme: theme, state: canSend ? .enabled : .disabled, label: sendLabel, diameter: Self.capsuleKey, fill: theme.ind, action: onSend)
          .alignmentGuide(.bottom) { $0[VerticalAlignment.center] + Self.key / 2 }
          .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
          .transition(reduceMotion ? .opacity : .scale(scale: 0.6).combined(with: .opacity))
      }
    }
    .padding(.leading, 16)
    .padding(.trailing, 6)
    .frame(minHeight: Self.key)
    .background {
      // the capsule's own ground takes a tap to the field (the keys and the text view take theirs)
      RoundedRectangle(cornerRadius: Self.key / 2, style: .circular)
        .fill(capsuleFill)
        .contentShape(RoundedRectangle(cornerRadius: Self.key / 2, style: .circular))
        .onTapGesture { controller.focus() }
        .accessibilityHidden(true)
    }
  }

  // MARK: the + key

  private var plusKey: some View {
    SwiftUI.Button(action: onPlus) {
      // the prototype's plus: 16 long at 2.4 on screen (the .plus glyph is 14 of its 24 grid)
      KLineIcon(.plus, size: 16 * 24 / 14, lineWidth: 2.4 * 14 / 16, color: trayOpen ? KBrand.paperWhite : theme.ink)
        .rotationEffect(.degrees(trayOpen ? 45 : 0))
        .frame(width: Self.key, height: Self.key)
        .background(Circle().fill(trayOpen ? Self.openFill(theme) : theme.sf))
        .overlay(Circle().strokeBorder(theme.ln, lineWidth: 2))
        .contentShape(Circle())
        .animation(KChatMotion.plusTurn(reduceMotion: reduceMotion), value: trayOpen)
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityLabel(trayOpen ? plusCloseLabel : plusLabel)
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
    // escape on the + closes the tray it opened; with the tray shut it goes back
    .accessibilityAction(.escape) { trayOpen ? onCloseTray() : onEscapeOut() }
  }
}

/*
 THE IDEAS BUBBLE (chat composers, Prompt 4; the owner's lead for its sentences): 8 above the
 Kindreds bar, 16 from either edge, one sentence to start from. Only the reader sees it; nothing
 is sent until they send it themselves.

   ┌──────────────────────────────────────────┐   ink (Midnight: lav), corners 18 18 18 4, the
   │ AN IDEA                                  │   small corner at the bottom left, toward the
   │ Something I've never said out loud.      │   ideas key; padding 12 14 12 16, 8 apart
   │ ↻ ANOTHER   USE IT →                     │
   └──────────────────────────────────────────┘
   └ ( ✦ )

 - AN IDEA in mono 500 10 at .14em, white at 60%;
 - the sentence in the serif at 19 on 1.3, white: Newsreader, as every serif that isn't someone's
   letter being read is (KTextStyle.letter: Wren's lines and hints; the reader's Letter font is for
   letters only, KLetterFontScope);
 - two text keys in mono 600 10 at .12em, 14 apart: ↻ ANOTHER (white at 70%) shows the next
   sentence, USE IT → (lime) puts this one in the field and gives it the keyboard. Each has a 44
   tall target that doesn't push the bubble taller.
 The words come from TS (the dock's AN IDEA / ANOTHER / USE IT, the driver's idea); the ↻ and the
 → are drawn here, outside what VoiceOver reads. It pops in on kpopin (KChatPopIn: up 10, from
 .96, from clear, .3s), fades under Reduce Motion, and a new sentence fades in over the old.
 VoiceOver's escape on it closes it.
 */
struct KIdeasBubble: View {
  let theme: KTheme
  let label: String
  let idea: String
  let another: String
  let use: String
  let onAnother: () -> Void
  let onUse: () -> Void
  let onClose: () -> Void

  private var shape: UnevenRoundedRectangle {
    UnevenRoundedRectangle(topLeadingRadius: 18, bottomLeadingRadius: 4, bottomTrailingRadius: 18, topTrailingRadius: 18, style: .circular)
  }

  var body: some View {
    let white = KBrand.paperWhite
    VStack(alignment: .leading, spacing: 8) {
      Text(label)
        .kText(.mono(10, .medium, tracking: 0.14))
        .foregroundStyle(white.opacity(0.6))
      Text(idea)
        .kText(.letter(19, lineHeight: 1.3))
        .foregroundStyle(white)
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: .infinity, alignment: .leading)
        // a new sentence fades in where the old one was (never both stacked)
        .contentTransition(.opacity)
      HStack(spacing: 14) {
        textKey("↻ " + another, a11y: another, color: white.opacity(0.7), action: onAnother)
        textKey(use + " →", a11y: use, color: KBrand.lime, action: onUse)
      }
    }
    .padding(.top, 12)
    .padding(.trailing, 14)
    .padding(.bottom, 12)
    .padding(.leading, 16)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(shape.fill(KKindredBar.openFill(theme)))
    .animation(.easeOut(duration: 0.2), value: idea)
    .dynamicTypeSize(...DynamicTypeSize.accessibility2)
    .accessibilityElement(children: .contain)
    .accessibilityAction(.escape, onClose)
  }

  /// A mono text key with a 44 tall target that doesn't change the bubble's height.
  private func textKey(_ title: String, a11y: String, color: Color, action: @escaping () -> Void) -> some View {
    SwiftUI.Button(action: action) {
      Text(title)
        .kText(.mono(10, .semibold, tracking: 0.12))
        .foregroundStyle(color)
        .padding(.vertical, 15)
        .contentShape(Rectangle())
    }
    .buttonStyle(KFloatPressStyle())
    .padding(.vertical, -15)
    // read in lower case: VoiceOver can spell out a short word in capitals ("IT")
    .accessibilityLabel(a11y.localizedLowercase)
  }
}

/// kpopin as a view modifier: up 10, from .96, from clear (Prompts 4 and 6).
struct KChatPopIn: ViewModifier {
  let shown: Bool

  func body(content: Content) -> some View {
    content
      .opacity(shown ? 1 : 0)
      .scaleEffect(shown ? 1 : 0.96)
      .offset(y: shown ? 0 : 10)
  }
}

extension AnyTransition {
  /// kpopin on the way in (pair it with KChatMotion.popIn), a plain fade on the way out.
  static var kChatPopIn: AnyTransition {
    .asymmetric(
      insertion: .modifier(active: KChatPopIn(shown: false), identity: KChatPopIn(shown: true)),
      removal: .opacity
    )
  }
}
