// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE REPLY DOCK (Today 3d × 25b, Prompt 7). There is no pill any more: REPLY on the control band
 raises the keyboard (the desk focuses dock.reply), the band and the tab bar go down under it, and
 the reply strip rides the keyboard:

   (the whole layer dimmed: rgba(30,27,53,.18), Midnight black .35; a tap drops the keyboard)
      REPLY AND A THREAD OPENS                      the composer's hint, 6 in, 6 above the strip
   ┌──────────────────────────────────────────────┐
   │ write back to No. 7273…               [ ✈ ]  │  the strip: 16 from either edge, 54 at least,
   └──────────────────────────────────────────────┘  corners of 16, sf, a 2 ln outline, a hard 2/2
   ═══════════════ keyboard, 12 below ═══════════════  ln shadow; system 17, up to five lines

 - THE STRIP is this file's own (KTodayReplyField); Kit/KReplyStrip, which rooms and chats share,
   keeps its own look. The field is the one KField; Return is a new line (a reply is a letter and
   letters keep their paragraphs). The send key is KSendKey with its three states, unchanged:
   disabled (the faint SEND), enabled (the plane, owner question 3), dimmed (a full pouch: drawn
   off, still pressed, so TS can say why).
 - THE HINT is TS's composer hint (the four hint lines; the postmark red when over the limit), in
   mono 500 10 at .14em, sub, over the strip.
 - THE SCRIM covers the whole layer behind the strip while the field has the keyboard, and fades
   in over .2s: a tap anywhere but the strip drops the keyboard. The tab bar's own Host isn't
   dimmed; it sits under the keyboard. VoiceOver's escape drops the keyboard too.
 - With a hardware keyboard (focused, no keyboard inset) the strip's bottom sits on the band's
   bottom line (restingBottom) instead of 12 above a keyboard that isn't there.

 THE FIELD NEVER LEAVES. It is always mounted, only hidden (the expo focus/unmount crash), and it
 is bound to the card the deck shows (deck.shownId): what the reader types goes to TS with that
 card's id (onReplyChange), and TS seeds the field (setText) when the bound letter changes. TS's
 composer command says what the key and the hint show; a composer for another letter is ignored
 until TS catches up. Focus sets deck.typing (the band slides away, Wren is delighted, the deck
 holds still) and losing it says keyboardDown. SEND (enabled): the field lets go at once, and
 deck.typing stays on until TS answers the press (its serial comes back in the composer), so the
 band doesn't rise under TS's fly-by.
 */
struct KReplyDock: View {
  private let theme: KTheme
  private let labels: KTodayLabels
  private let placeholder: String
  private let restingBottom: CGFloat
  @ObservedObject private var dock: KTodayDock
  @ObservedObject private var deck: KDeckState
  private let actions: KTodayActions

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  /// - Parameters:
  ///   - labels: SEND (labels.send)
  ///   - placeholder: the shown card's replyPlaceholder ("write back to No. 7273…"), else
  ///     labels.placeholder
  ///   - restingBottom: tabBarRoom + 2, the band's bottom line: where the strip sits with a
  ///     hardware keyboard
  ///   - dock: the field, TS's composer, focus and the keyboard
  ///   - deck: the shown card (the field's letter) and typing
  init(
    theme: KTheme,
    labels: KTodayLabels,
    placeholder: String,
    restingBottom: CGFloat,
    dock: KTodayDock,
    deck: KDeckState,
    actions: KTodayActions
  ) {
    self.theme = theme
    self.labels = labels
    self.placeholder = placeholder
    self.restingBottom = restingBottom
    self._dock = ObservedObject(wrappedValue: dock)
    self._deck = ObservedObject(wrappedValue: deck)
    self.actions = actions
  }

  /// the letter the field answers: the card the deck shows (none in done)
  private var boundId: String? { deck.shownId }

  /// TS's composer, when it is about the bound letter
  private var composer: KTodayComposer? {
    guard let id = boundId, dock.composer.letterId == id else { return nil }
    return dock.composer
  }

  /// the scrim's colour in this theme
  private var scrimColor: Color {
    theme.isDark
      ? Color.black.opacity(0.35)
      : Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 0.18)
  }

  var body: some View {
    let focused = dock.focused
    // one layer, the strip drawn last: the scrim covers ALL of it behind the strip, so a touch
    // anywhere else drops the keyboard and never reaches a card under the words
    ZStack(alignment: .bottom) {
      scrimColor
        .opacity(focused ? 1 : 0)
        .animation(.easeOut(duration: 0.2), value: focused)
        .contentShape(Rectangle())
        .onTapGesture { dock.reply.blur() }
        .allowsHitTesting(focused)
        .accessibilityHidden(true)
      strip
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
    .background {
      GeometryReader { geo in
        Color.clear.onChange(of: geo.size.height, initial: true) { _, height in
          if abs(dock.respectingHeight - height) > 0.5 { dock.respectingHeight = height }
        }
      }
    }
    .onChange(of: boundId) { _, id in
      // nothing to answer (done): the field lets go
      if id == nil && dock.focused { dock.reply.blur() }
    }
    .onChange(of: dock.awaitingSend) { _, _ in syncTyping() }
  }

  /// deck.typing: the field has the keyboard, or a send it let go of hasn't been answered yet
  private func syncTyping() {
    let now = dock.focused || dock.awaitingSend
    if deck.typing != now { deck.typing = now }
  }

  // ── the strip and its hint ──
  private var strip: some View {
    let state = composer?.sendState ?? .disabled
    let hint = composer?.hint ?? ""
    let onKeyboard = dock.focused && !dock.hardwareKeyboard
    return VStack(alignment: .leading, spacing: 6) {
      Text(hint)
        .kText(.monoMetaWide)
        .foregroundStyle(composer?.hintWarn == true ? KBrand.postRed : theme.sub)
        .lineLimit(2)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.leading, 6)
        .accessibilityHidden(hint.isEmpty)
      KTodayReplyField(
        theme: theme,
        field: KField(
          theme: theme,
          controller: dock.reply,
          placeholder: placeholder,
          returnSends: false,
          onChange: { text in
            if let id = boundId { actions.onReplyChange(id, text) }
          },
          onFocus: { now in
            dock.setFocused(now)
            syncTyping()
            actions.onReplyFocus(now)
            if !now { deck.emit(.keyboardDown) }
            if now && boundId == nil { dock.reply.blur() }
          }
        ),
        sendState: state,
        sendLabel: labels.send,
        onSend: { send(state) }
      )
    }
    .padding(.horizontal, KTodayGeometry.gutter)
    // 12 above the keyboard; on the band's bottom line with a hardware keyboard
    .padding(.bottom, onKeyboard ? 12 : restingBottom)
    .opacity(dock.focused ? 1 : 0)
    .animation(reduceMotion ? nil : .easeOut(duration: 0.2), value: dock.focused)
    .animation(reduceMotion ? nil : .easeOut(duration: 0.25), value: dock.hardwareKeyboard)
    .allowsHitTesting(dock.focused)
    // VoiceOver's escape (the two-finger scrub) drops the keyboard without sending: the scrim is
    // hidden from VoiceOver and the keyboard has no key for it. A container of its own, so the
    // escape reaches it from the field and the send key inside. Always attached, acting only
    // while focused (and the strip is hidden from VoiceOver otherwise): a modifier that came and
    // went with the focus would rebuild the strip, and the field in it, at the moment it took the
    // keyboard.
    .accessibilityElement(children: .contain)
    .accessibilityAction(.escape) {
      if dock.focused { dock.reply.blur() }
    }
    .accessibilityHidden(!dock.focused)
    .dynamicTypeSize(...DynamicTypeSize.accessibility3)
  }

  private func send(_ state: KSendState) {
    guard let id = boundId else { return }
    switch state {
    case .enabled:
      let text = dock.reply.text
      let serial = dock.pressSend()
      actions.onReplySend(id, text, serial)
    case .dimmed:
      actions.onReplySend(id, dock.reply.text, dock.pressDimmed())
    case .disabled:
      break
    }
  }
}

/*
 TODAY'S REPLY STRIP (Prompt 7): at least 54 tall and growing with the field up to five lines,
 corners of 16, sf, a 2 ln outline and a hard 2/2 ln shadow (hanging outside, right and below);
 padding 0 7 0 14 inside the outline, the field and the send key 8 apart. The send key keeps to
 the bottom line, centred on the resting row, as the field grows.
 */
private struct KTodayReplyField: View {
  static let minHeight: CGFloat = 54
  static let borderWidth: CGFloat = 2
  static let cornerRadius: CGFloat = 16
  static let shadowOffset: CGFloat = 2

  let theme: KTheme
  let field: KField
  let sendState: KSendState
  let sendLabel: String
  let onSend: () -> Void

  /// the room inside the outline at rest
  private var innerHeight: CGFloat { Self.minHeight - 2 * Self.borderWidth }

  var body: some View {
    HStack(alignment: .bottom, spacing: 8) {
      field
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 12)
        .frame(minHeight: innerHeight)
      KSendKey(theme: theme, state: sendState, label: sendLabel, action: onSend)
        // centred on the resting row, and kept on the bottom line as the field grows
        .alignmentGuide(.bottom) { $0[VerticalAlignment.center] + innerHeight / 2 }
    }
    // padding 0 7 0 14 inside the 2 outline (border-box): the plane pill sits as far from the
    // right edge as from the top and bottom
    .padding(.leading, 14 + Self.borderWidth)
    .padding(.trailing, 7 + Self.borderWidth)
    .padding(.vertical, Self.borderWidth)
    .frame(minHeight: Self.minHeight)
    .background {
      KStickerBackground(
        shape: RoundedRectangle(cornerRadius: Self.cornerRadius, style: .circular),
        fill: theme.sf,
        stroke: theme.ln,
        lineWidth: Self.borderWidth,
        shadow: theme.ln,
        shadowOffset: Self.shadowOffset
      )
    }
    .accessibilityElement(children: .contain)
  }
}
