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
 - THE IDEAS KEY (left): the I1 sparkle at 26 in ink, 1.9 on its 24 grid. It opens the sparkle
   deck above the bar (KSparkleDeck, below; it replaced the ideas bubble on 2026-10-21).
   VoiceOver: a button named Openers, selected while the deck is up, whose escape closes it.
 - THE CAPSULE: 40 tall at one line, corners of 20, on soft (Midnight: soft2, since its soft is its
   sf), padding 0 14, nothing in it but the field (Kit/KComposerField, System at 16 — a kindred
   chat is SF Pro, owner 2026-10-21 — the placeholder
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
 - THE THREE PANELS SHUT EACH OTHER (the sparkle deck, the emoji keyboard, the + tray): the dock
   decides (KDock.swift), this bar only reports the presses and the field's focus.
 - The keys don't grow with Dynamic Type (they stop at xxxLarge, as KTabBar's fixed bar does);
   the field does. The keys keep to the bottom line, centred on the capsule's resting row, as the
   field grows.
 - THE ICONS SIT ON THE GUTTER, NOT THEIR TARGETS: the dock pulls the bar 4 past its 12 (KDock), so
   a target starts 8 from the screen's edge and its icon 17, in line with the 16 gutter the reply
   bars keep.
 - ESCAPE ON THE KEYS (VoiceOver's two-finger Z): on the ideas key it closes the deck, on the
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
      // escape on the key closes the deck it opened; with the deck shut it goes back, as escape
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
      // a kindred chat is System, whatever the Letter font (owner, 2026-10-21): the field writes
      // in the face its bubbles are drawn in
      content: false,
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
 THE SPARKLE DECK (owner, 2026-10-21, after a chat app's recording, ref 182; in our soft look): the
 ✦ opens a row of openers 8 above the Kindreds bar, in the ideas bubble's old place. Only two
 kinds, the + tray has the rest: a Wave (your sky, sent as a postcard) and This or That (pick your
 side, send; they pick theirs and you both see). Nothing is sent until a send disc is pressed.

    ✦ Openers                              ⤮    ⌄      the header 44: the sparkle 18 in ind, the
   ┌──────────┐ ┌────────────────────┐ ┌─────           title in System 600 17 ink; shuffle and
   │WAVE·NIGHT│ │ ⇆ THIS OR THAT      │ │                collapse 22 in sub on 44 targets
   │  (sky)   │ │ Spicy or mild?      │ │                the cards 204 tall, 12 apart, a horizontal
   │   ~v~    │ │ ( Spicy ) ( Mild )  │ │                row inset 16 that runs to the screen's
   │Stars are │ │ Pick yours, then…   │ │                edges and snaps card by card
   │out here.(➤)│ ↻ Another       (➤) │ │
   └──────────┘ └────────────────────┘ └─────
    the status line (System 13, postmark red: the cap) only when TS sends one

 - THE WAVE CARD 148×204, corners 22 (continuous), the sky drawn in code (KSkyScene, compact: the
   stars hold still), WAVE · NIGHT in mono 500 10 at .14em top left, the line that will go in the
   Letter font 15 on 1.25 above the send disc, all in the sky's own ink.
 - THE THIS OR THAT CARD 232×204, corners 22, padding 14, on the moods' pale fills in turn (tired,
   happy, calm, low) in the light themes, soft2 in a dark one: the ⇆ on a 24 tile, the label, the
   question in the Letter font 18 (content), the two choices as capsules in the Letter font 15 (a
   tap picks one, a second tap lets it go; the selection haptic), "Pick yours, then send." under
   them until one is picked, and ↻ Another (System 600 13) beside the disc.
 - THE SEND DISC: 40, ind, the line plane 18 in bg; on a This or That it is dim and takes no tap
   until a side is picked. A card TS has turned off shows its note (Waved, 3 waiting) in the
   disc's place. Send: the success haptic, and the dock closes the deck (TS scrolls).
 - Sizes are fixed and the words shrink to .8 before they cut; the panel stops growing at AX2.
 - VoiceOver: each card is a group named by card.a11y; the disc is "Send" with the card's words
   as its hint; the header's keys are Shuffle and Close; escape on the panel closes it.
 */
struct KSparkleDeck: View {
  static let cardHeight: CGFloat = 204
  static let waveWidth: CGFloat = 148
  static let pickWidth: CGFloat = 232

  let theme: KTheme
  let deck: KDeck
  let onShuffle: () -> Void
  let onClose: () -> Void
  let onAnother: (_ key: String) -> Void
  let onSend: (_ key: String, _ choice: Int) -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      header
      ScrollView(.horizontal) {
        HStack(alignment: .top, spacing: 12) {
          ForEach(Array(deck.cards.enumerated()), id: \.element.id) { index, card in
            switch card.kind {
            case .wave:
              KDeckWaveCard(theme: theme, card: card, sendLabel: deck.sendLabel, onSend: { onSend(card.key, -1) })
            case .pick:
              KDeckPickCard(
                theme: theme,
                card: card,
                slot: pickSlot(before: index),
                sendLabel: deck.sendLabel,
                anotherLabel: deck.anotherLabel,
                onAnother: { onAnother(card.key) },
                onSend: { onSend(card.key, $0) }
              )
              // a new question on this card starts unpicked
              .id(card.key + "\u{1F}" + card.prompt + "\u{1F}" + card.a + "\u{1F}" + card.b)
            }
          }
        }
        .scrollTargetLayout()
      }
      .scrollIndicators(.hidden)
      .scrollTargetBehavior(.viewAligned)
      .contentMargins(.horizontal, 16, for: .scrollContent)
      .frame(height: Self.cardHeight)
      // to the screen's edges: out through the dock's 12
      .padding(.horizontal, -12)
      if !deck.status.isEmpty {
        Text(deck.status)
          .kText(.system(13))
          .foregroundStyle(KBrand.postRed)
          .fixedSize(horizontal: false, vertical: true)
          .padding(.horizontal, 4)
          .padding(.top, 8)
      }
    }
    .padding(.bottom, 8)
    .background(theme.bg)
    .dynamicTypeSize(...DynamicTypeSize.accessibility2)
    .accessibilityElement(children: .contain)
    .accessibilityAction(.escape, onClose)
    .onChange(of: deck.status) { _, now in
      if !now.isEmpty { AccessibilityNotification.Announcement(now).post() }
    }
  }

  /// the This or That card's place among the This or That cards (its fill turns with it)
  private func pickSlot(before index: Int) -> Int {
    deck.cards.prefix(index).filter { $0.kind == .pick }.count
  }

  private var header: some View {
    HStack(spacing: 0) {
      KLineIcon(.sparkle, size: 18, lineWidth: 1.9, color: theme.ind)
        .padding(.trailing, 8)
      Text(deck.title)
        .kText(.system(17, .semibold))
        .foregroundStyle(theme.ink)
        .lineLimit(1)
        .accessibilityAddTraits(.isHeader)
      Spacer(minLength: 8)
      headerKey(.shuffle, label: deck.shuffleLabel, action: onShuffle)
      headerKey(.chevronDown, label: deck.closeLabel, action: onClose)
        // the chevron's ink 16 from the edge, in line with the gutter
        .padding(.trailing, -11)
    }
    .frame(height: 44)
    .padding(.leading, 4)
  }

  private func headerKey(_ glyph: KLineGlyph, label: String, action: @escaping () -> Void) -> some View {
    SwiftUI.Button(action: action) {
      KLineIcon(glyph, size: 22, lineWidth: 1.9, color: theme.sub)
        .frame(width: 44, height: 44)
        .contentShape(Rectangle())
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityLabel(label)
  }
}

/// The deck's send disc: 40, ind, the line plane in bg; dim and still while it can't send.
private struct KDeckSendDisc: View {
  let theme: KTheme
  let label: String
  let hint: String
  let enabled: Bool
  let action: () -> Void

  @State private var sent = 0

  var body: some View {
    SwiftUI.Button {
      guard enabled else { return }
      sent += 1
      action()
    } label: {
      KLineIcon(.planeLine, size: 18, lineWidth: 1.9, color: theme.bg)
        .frame(width: 40, height: 40)
        .background(Circle().fill(theme.ind))
        .frame(width: 44, height: 44)
        .contentShape(Circle())
    }
    .buttonStyle(KFloatPressStyle())
    .opacity(enabled ? 1 : 0.35)
    .disabled(!enabled)
    .padding(-2)
    .sensoryFeedback(.success, trigger: sent)
    .accessibilityLabel(label)
    .accessibilityHint(hint)
  }
}

/// The note a turned-off card shows in its disc's place ("Waved", "3 waiting").
private struct KDeckNote: View {
  let text: String
  let color: Color

  var body: some View {
    Text(text)
      .kText(.system(12.5, .semibold))
      .foregroundStyle(color)
      .lineLimit(1)
      .minimumScaleFactor(0.8)
      .frame(minHeight: 40)
  }
}

/// The deck's Wave card: your sky now, and the line that will go.
private struct KDeckWaveCard: View {
  let theme: KTheme
  let card: KDeckCard
  let sendLabel: String
  let onSend: () -> Void

  private static let shape = RoundedRectangle(cornerRadius: 22, style: .continuous)

  var body: some View {
    let ink = KSkyPalette.text(card.sky)
    VStack(alignment: .leading, spacing: 0) {
      Text(card.skyLabel.isEmpty ? card.label : card.label + " · " + card.skyLabel)
        .kText(.mono(10, .medium, tracking: 0.14))
        .foregroundStyle(ink.opacity(0.8))
        .lineLimit(1)
        .minimumScaleFactor(0.8)
      Spacer(minLength: 8)
      Text(card.line)
        .kText(.content(15, lineHeight: 1.25))
        .foregroundStyle(ink)
        .lineLimit(3)
        .minimumScaleFactor(0.8)
        .fixedSize(horizontal: false, vertical: true)
      HStack(spacing: 0) {
        Spacer(minLength: 0)
        if card.disabled {
          KDeckNote(text: card.note, color: ink.opacity(0.8))
        } else {
          KDeckSendDisc(theme: theme, label: sendLabel, hint: card.a11y, enabled: true, action: onSend)
        }
      }
      .padding(.top, 6)
    }
    .padding(14)
    .frame(width: KSparkleDeck.waveWidth, height: KSparkleDeck.cardHeight, alignment: .topLeading)
    .background(KSkyScene(sky: card.sky, compact: true, seed: "deck", birdWidth: 22))
    .clipShape(Self.shape)
    .contentShape(Self.shape)
    .accessibilityElement(children: .contain)
    .accessibilityLabel(card.a11y)
  }
}

/// The deck's This or That card: the question, its two sides as chips, Another and the disc.
private struct KDeckPickCard: View {
  let theme: KTheme
  let card: KDeckCard
  /// its place among the This or That cards: the mood its fill takes
  let slot: Int
  let sendLabel: String
  let anotherLabel: String
  let onAnother: () -> Void
  let onSend: (_ choice: Int) -> Void

  /// the side picked on this card, nil for none (reset with the card's question: the deck gives
  /// each question its own identity)
  @State private var chosen: Int?

  private static let shape = RoundedRectangle(cornerRadius: 22, style: .continuous)
  private static let moods: [KMood] = [.tired, .happy, .calm, .low]

  private var mood: KMood { Self.moods[((slot % 4) + 4) % 4] }
  private var dark: Bool { theme.isDark }
  private var fill: Color { dark ? theme.soft2 : mood.fill }
  private var accent: Color { dark ? theme.ind : mood.ink }
  private var labelInk: Color { dark ? theme.sub : mood.ink }
  private var words: Color { dark ? theme.ink : KBrand.inkOnBrand }

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(spacing: 8) {
        KLineIcon(.swap, size: 14, lineWidth: 1.9, color: accent)
          .frame(width: 24, height: 24)
          .background(RoundedRectangle(cornerRadius: 8, style: .continuous).fill(dark ? theme.sf : Color.white.opacity(0.55)))
        Text(card.label)
          .kText(.mono(10, .medium, tracking: 0.14))
          .foregroundStyle(labelInk)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      }
      .accessibilityHidden(true)
      Text(card.prompt)
        .kText(.content(18, lineHeight: 1.25))
        .foregroundStyle(words)
        .lineLimit(3)
        .minimumScaleFactor(0.8)
        // the question takes what the chips and the foot leave (and shrinks to .8 in it), so the
        // chips and the foot sit at the same height on every card
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(.top, 10)
        .layoutPriority(-1)
        .accessibilityHidden(true)
      HStack(spacing: 8) {
        chip(card.a, index: 0)
        chip(card.b, index: 1)
      }
      .padding(.top, 10)
      if chosen == nil && !card.disabled && !card.line.isEmpty {
        Text(card.line)
          .kText(.system(12.5))
          .foregroundStyle(accent.opacity(0.8))
          .lineLimit(1)
          .minimumScaleFactor(0.8)
          .padding(.top, 6)
          .accessibilityHidden(true)
      }
      HStack(spacing: 8) {
        SwiftUI.Button(action: onAnother) {
          Text("↻ " + anotherLabel)
            .kText(.system(13, .semibold))
            .foregroundStyle(labelInk)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFloatPressStyle())
        .padding(.vertical, -2)
        .accessibilityLabel(anotherLabel)
        Spacer(minLength: 0)
        if card.disabled {
          KDeckNote(text: card.note, color: labelInk)
        } else {
          KDeckSendDisc(theme: theme, label: sendLabel, hint: card.a11y, enabled: chosen != nil) {
            if let chosen { onSend(chosen) }
          }
        }
      }
    }
    .padding(14)
    .frame(width: KSparkleDeck.pickWidth, height: KSparkleDeck.cardHeight, alignment: .topLeading)
    .background(Self.shape.fill(fill))
    .clipShape(Self.shape)
    .contentShape(Self.shape)
    .sensoryFeedback(.selection, trigger: chosen)
    .accessibilityElement(children: .contain)
    .accessibilityLabel(card.a11y)
  }

  private func chip(_ text: String, index: Int) -> some View {
    let on = chosen == index
    return SwiftUI.Button {
      chosen = on ? nil : index
    } label: {
      Text(text)
        .kText(.content(15))
        .foregroundStyle(on ? (dark ? theme.bg : KBrand.paperWhite) : words)
        .lineLimit(1)
        .minimumScaleFactor(0.8)
        .padding(.horizontal, 14)
        .frame(height: 36)
        .background(Capsule(style: .continuous).fill(on ? accent : (dark ? theme.sf : Color.white.opacity(0.7))))
        .contentShape(Capsule(style: .continuous))
        .animation(.easeOut(duration: 0.15), value: on)
    }
    .buttonStyle(KFloatPressStyle())
    .disabled(card.disabled)
    .accessibilityLabel(text)
    .accessibilityAddTraits(on ? .isSelected : [])
  }
}

/// kpopin as a view modifier: up 10, from .96, from clear (Prompts 4 and 6; the deck pops in on it).
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
