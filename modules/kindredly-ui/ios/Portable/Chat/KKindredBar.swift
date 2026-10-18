// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE KINDREDS BAR (chat composers, Prompt 3, as the owner reworked it on the evening of
 2026-10-18 after a chat app's recording): a room's composer, once names are traded. Before names
 the pen-pal chat writes in the reply bar (Kit/KReplyBar), which only sends words; here there is
 more to leave, so the bar has a key on the left and two on the right.

    ✦    ( leave something here…            )    ☺    +      one row 48 tall; line icons 26 with
   44                  40 tall                   44   44     no ring, each on a 44 target; no
                                                             send key: the keyboard's sends
 - SEND IS THE KEYBOARD'S. A room always sent on Return (returnSends), so the owner took the send
   disc out of the capsule: the return key says "send" and stays dim while the field is empty
   (KComposerField, enablesReturnKeyAutomatically). Words that can't go yet (a fold without its
   question) are refused by TS, which says why in the status line, as a disabled disc used to.
   The Today and pen-pal reply bars keep their paper plane: Return there makes a new line, or
   sends a letter, and a letter wants a key you mean to press.
 - THE IDEAS KEY (left): the I1 sparkle at 26 in ink, 1.9 on its 24 grid. It opens the ideas
   bubble above the bar (KIdeasBubble, below). VoiceOver: a button, selected while the bubble is
   up, whose escape closes it.
 - THE CAPSULE: 40 tall at one line, corners of 20, on soft (Midnight: soft2, since its soft is its
   sf), padding 0 14, nothing in it but the field (Kit/KComposerField, system 16, the placeholder
   "leave something here…" in mute; one line growing to five, three at the accessibility sizes,
   then it scrolls inside). A tap on the capsule's own ground gives the field the keyboard.
 - THE EMOJI KEY (right of the capsule, beside the +: the owner moved it out of the field to sit
   with the +): KEmojiKey on a 44 target with the face at 26. It switches the field to the system
   emoji keyboard and back.
 - THE + KEY: the plus 18 long at 2 on screen. Open, it turns 45° into an ×, on the springy .35s
   (KChatMotion.plusTurn; a plain ease under Reduce Motion), and opens the + tray
   (Chat/KTraceTray.swift).
 - ONE "ON" FOR ALL THREE: a lav disc (38) behind the icon while its panel is up, the ground the
   emoji key always showed. The icons stay in ink: lav is pale on the light themes and a deep
   indigo on Midnight, and ink reads on both (the old filled keys needed Midnight's own case).
 - THE THREE PANELS SHUT EACH OTHER (the ideas bubble, the emoji keyboard, the + tray): the dock
   decides (KDock.swift), this bar only reports the presses and the field's focus.
 - The keys don't grow with Dynamic Type (they stop at xxxLarge, as KTabBar's fixed bar does);
   the field does. The keys keep to the bottom line, centred on the capsule's resting row, as the
   field grows.
 - THE ICONS SIT ON THE GUTTER, NOT THEIR TARGETS: the dock pulls the bar 4 past its 12 (KDock), so
   a target starts 8 from the screen's edge and its icon 17, in line with the 16 gutter the reply
   bars keep.
 - ESCAPE ON THE KEYS (VoiceOver's two-finger Z): on the ideas key it closes the bubble, on the
   + the tray; with nothing of its own open it goes out of the room (onEscapeOut, the stack's
   back, which is where escape would have gone anyway). The action is always there: adding it
   only while open (KChatEscape) swaps the key for a new one each time it opens, which drops
   its springy turn and fades it out and back instead.
 */
struct KKindredBar: View {
  /// the bar's numbers (the owner's rework of Prompt 3)
  static let rowHeight: CGFloat = 48
  static let target: CGFloat = 44
  static let icon: CGFloat = 26
  static let disc: CGFloat = 38
  static let capsule: CGFloat = 40

  let theme: KTheme
  let controller: KFieldController
  let placeholder: String
  let autocapitalize: Bool
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
  /// the keyboard's send (a typed Return), with the words
  let onSubmit: (String) -> Void
  let onFocus: (Bool) -> Void

  @Environment(\.dynamicTypeSize) private var typeSize
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  /// the ideas bubble's ground: ink, or Midnight's lav (its ink is pale)
  static func openFill(_ theme: KTheme) -> Color {
    theme.isDark ? theme.lav : theme.ink
  }

  private var capsuleFill: Color {
    theme.isDark ? theme.soft2 : theme.soft
  }

  var body: some View {
    HStack(alignment: .bottom, spacing: 0) {
      ideasKey
      capsuleField
        .padding(.horizontal, 4)
      emojiKey
      plusKey
    }
    // the 44 targets in a 48 row
    .padding(.vertical, (Self.rowHeight - Self.target) / 2)
    .accessibilityElement(children: .contain)
  }

  /// a key's place on the bottom line: centred on the capsule's one-line row as the field grows
  private func onRestingRow<V: View>(_ key: V) -> some View {
    key.alignmentGuide(.bottom) { $0[VerticalAlignment.center] + Self.capsule / 2 }
  }

  /// the lav disc behind an icon whose panel is up
  private func disc(_ on: Bool) -> some View {
    Circle().fill(on ? theme.lav : Color.clear).frame(width: Self.disc, height: Self.disc)
  }

  // MARK: the ideas key

  private var ideasKey: some View {
    onRestingRow(
      SwiftUI.Button(action: onIdeas) {
        KLineIcon(.sparkle, size: Self.icon, lineWidth: 1.9, color: theme.ink)
          .frame(width: Self.target, height: Self.target)
          .background(disc(ideasOpen))
          .contentShape(Rectangle())
          .animation(.easeOut(duration: 0.2), value: ideasOpen)
      }
      .buttonStyle(KFloatPressStyle())
      .accessibilityLabel(ideasLabel)
      .accessibilityAddTraits(ideasOpen ? .isSelected : [])
      .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
      // escape on the key closes the bubble it opened; with the bubble shut it goes back, as escape
      // anywhere else does (see ESCAPE ON THE KEYS)
      .accessibilityAction(.escape) { ideasOpen ? onCloseIdeas() : onEscapeOut() }
    )
  }

  // MARK: the capsule

  private var capsuleField: some View {
    KComposerField(
      theme: theme,
      controller: controller,
      placeholder: placeholder,
      size: 16,
      // at the accessibility sizes a line is ~40pt: three, then it scrolls inside
      maxLines: typeSize.isAccessibilitySize ? 3 : 5,
      returnSends: true,
      autocapitalize: autocapitalize,
      onChange: onChange,
      onSubmit: onSubmit,
      onFocus: onFocus
    )
    .padding(.vertical, 10)
    .frame(minHeight: Self.capsule)
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, 14)
    .background {
      // the capsule's own ground takes a tap to the field (the text view takes its own)
      RoundedRectangle(cornerRadius: Self.capsule / 2, style: .circular)
        .fill(capsuleFill)
        .contentShape(RoundedRectangle(cornerRadius: Self.capsule / 2, style: .circular))
        .onTapGesture { controller.focus() }
        .accessibilityHidden(true)
    }
  }

  // MARK: the emoji key

  private var emojiKey: some View {
    onRestingRow(
      KEmojiKey(theme: theme, controller: controller, label: emojiLabel, side: Self.target, circle: true, iconSize: Self.icon, ground: Self.disc)
        .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
    )
  }

  // MARK: the + key

  private var plusKey: some View {
    onRestingRow(
      SwiftUI.Button(action: onPlus) {
        // 18 long at 2 on screen (the .plus glyph is 14 of its 24 grid)
        KLineIcon(.plus, size: 18 * 24 / 14, lineWidth: 2 * 14 / 18, color: theme.ink)
          .rotationEffect(.degrees(trayOpen ? 45 : 0))
          .frame(width: Self.target, height: Self.target)
          .background(disc(trayOpen))
          .contentShape(Rectangle())
          .animation(KChatMotion.plusTurn(reduceMotion: reduceMotion), value: trayOpen)
      }
      .buttonStyle(KFloatPressStyle())
      .accessibilityLabel(trayOpen ? plusCloseLabel : plusLabel)
      .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
      // escape on the + closes the tray it opened; with the tray shut it goes back
      .accessibilityAction(.escape) { trayOpen ? onCloseTray() : onEscapeOut() }
    )
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
   └ ✦

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
