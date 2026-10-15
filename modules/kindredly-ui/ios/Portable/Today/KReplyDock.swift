// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE REPLY DOCK (H:115, H:123-125): the write-back pill at rest, the reply strip on the keyboard.

 AT REST, the pill (H:115): 16 from either edge, its bottom bottomRoom above the screen's (the tab
 bar's room + 6: H's 104 on Face ID), 52 tall, sf, a 2pt ln outline, corners of 18, a hard 3/3
 shadow, padding 0 8 0 16, 12 between: the pen, "write back…" in system 15 mute (or the draft's
 first line in ink), and the ink ↑ disc. The whole pill focuses the strip. It goes (opacity .25s,
 down 160 over .4s on cubic-bezier(.3,.9,.3,1); a plain fade under Reduce Motion) while the strip
 is up, while a send is in flight, on the blind, with the reader open or the + sheet up, and
 while there is no letter to answer.

 TYPING, the strip (H:124, KReplyStrip on the one KField): 12 from either edge, 26 above the
 keyboard, growing to five lines; the send key disabled, enabled (the plane, owner question 3) or
 dimmed (a full pouch: drawn off, still pressed, so TS can say why). Return is a new line: a reply
 is a letter, and letters keep their paragraphs. Under it, 6 above the keyboard, the hint in mono
 500 10 at .14em, sub (the postmark red when over the limit). While it is up, a clear catcher
 covers the whole dock layer behind it (not only what is above the hidden pill's room, which left
 a band open to the cards): a tap anywhere but the strip puts the keyboard away, and the cards
 can't scroll under the words (the stack is also scroll-disabled while typing, driver.typing).
 VoiceOver's escape puts the keyboard away too. With a hardware keyboard (focused, no keyboard
 inset) the strip sits on the pill's line instead, above the tab bar.

 THE FIELD NEVER LEAVES. It is always mounted, only hidden (the expo focus/unmount crash), and it
 is bound to the card the stack has settled on: what the reader types goes to TS with that card's
 id (onReplyChange), and TS seeds the field (setText) when the bound letter changes. TS's composer
 command says what the key and the hint show; a composer for another letter is ignored until TS
 catches up. SEND (enabled): the field lets go at once and the dock stays hidden until TS answers
 the press (its serial comes back in the composer): TS's fly-by takes the pill's place.
 */
struct KReplyDock: View {
  let theme: KTheme
  let labels: KTodayLabels
  let bottomRoom: CGFloat
  let cardIds: [String]
  let pillHidden: Bool
  @ObservedObject var dock: KTodayDock
  @ObservedObject var driver: KTodayDriver
  let actions: KTodayActions

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  /// the letter the dock answers: the settled card, none on the blind
  private var boundId: String? {
    let i = driver.settledCard
    return cardIds.indices.contains(i) ? cardIds[i] : nil
  }

  /// TS's composer, when it is about the bound letter
  private var composer: KTodayComposer? {
    guard let id = boundId, dock.composer.letterId == id else { return nil }
    return dock.composer
  }

  var body: some View {
    let pillShown = !pillHidden && !dock.focused && !dock.awaitingSend && boundId != nil
    // one layer, the strip drawn last: the catcher covers ALL of it behind the strip, so no band
    // between the hidden pill's room and the strip lets a touch through to the cards (a drag there
    // would scroll another letter under the words, and the field would answer that one)
    ZStack(alignment: .bottom) {
      // the catcher: a tap anywhere but the strip puts the keyboard away
      Color.clear
        .contentShape(Rectangle())
        .onTapGesture { dock.reply.blur() }
        .allowsHitTesting(dock.focused)
        .accessibilityHidden(true)
      pill(shown: pillShown)
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
      // nothing to answer (the blind): the field lets go
      if id == nil && dock.focused { dock.reply.blur() }
    }
  }

  // ── the strip and its hint ──
  private var strip: some View {
    let state = composer?.sendState ?? .disabled
    let onKeyboard = dock.focused && !dock.hardwareKeyboard
    return VStack(alignment: .leading, spacing: 7) {
      KReplyStrip(
        theme: theme,
        field: KField(
          theme: theme,
          controller: dock.reply,
          placeholder: labels.placeholder,
          returnSends: false,
          onChange: { text in
            if let id = boundId { actions.onReplyChange(id, text) }
          },
          onFocus: { now in
            dock.setFocused(now)
            // the stack stops scrolling while the words are up (it reads the driver, not the dock)
            if driver.typing != now { driver.typing = now }
            actions.onReplyFocus(now)
            if now && boundId == nil { dock.reply.blur() }
          }
        ),
        sendState: state,
        sendLabel: labels.send,
        onSend: { send(state) }
      )
      // the strip's 4/4 shadow hangs outside it
      .padding(.trailing, KReplyStrip<EmptyView, EmptyView>.shadowOffset)
      Text(composer?.hint ?? "")
        .kText(.monoMetaWide)
        .foregroundStyle(composer?.hintWarn == true ? KBrand.postRed : theme.sub)
        .lineLimit(2)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.leading, 2)
        .accessibilityHidden(composer?.hint.isEmpty ?? true)
    }
    .padding(.horizontal, 12)
    // 6 above the keyboard (the strip lands 26 above it); on the pill's line with a hardware keyboard
    .padding(.bottom, onKeyboard ? 6 : max(6, bottomRoom - 20))
    .opacity(dock.focused ? 1 : 0)
    .animation(reduceMotion ? nil : .easeOut(duration: 0.2), value: dock.focused)
    .animation(reduceMotion ? nil : .easeOut(duration: 0.25), value: dock.hardwareKeyboard)
    .allowsHitTesting(dock.focused)
    // VoiceOver's escape (the two-finger scrub) puts the keyboard away without sending: the
    // catcher is hidden from VoiceOver, the pill is gone and the keyboard has no key for it.
    // A container of its own, so the escape reaches it from the field and the send key inside.
    // Always attached, acting only while focused (and the strip is hidden from VoiceOver
    // otherwise): a modifier that came and went with the focus would rebuild the strip, and the
    // field in it, at the moment it took the keyboard.
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

  // ── the pill ──
  private func pill(shown: Bool) -> some View {
    let preview = composer?.preview ?? ""
    return SwiftUI.Button {
      dock.reply.focus()
    } label: {
      HStack(alignment: .center, spacing: 12) {
        KLineIcon(.pen, size: 18, lineWidth: 2, color: theme.ink)
        Text(preview.isEmpty ? labels.placeholder : preview)
          .kText(.rowLabel)
          .foregroundStyle(preview.isEmpty ? theme.mute : theme.ink)
          .lineLimit(1)
          .frame(maxWidth: .infinity, alignment: .leading)
        KLineIcon(.arrowUp, size: 15, lineWidth: 2.6, color: theme.bg)
          .frame(width: 32, height: 32)
          .background(Circle().fill(theme.ink))
      }
      // padding 0 8 0 16 inside the 2pt outline (border-box, 52 tall)
      .padding(.leading, 16 + 2)
      .padding(.trailing, 8 + 2)
      .frame(height: KTodayGeometry.pillHeight)
      .frame(maxWidth: .infinity)
    }
    .buttonStyle(KStickerButtonStyle(
      shape: RoundedRectangle(cornerRadius: 18, style: .circular),
      fill: theme.sf,
      stroke: theme.ln,
      lineWidth: 2,
      shadow: theme.ln,
      shadowOffset: 3
    ))
    .accessibilityLabel(preview.isEmpty ? labels.placeholder : preview)
    .accessibilityHint(labels.replyA11y)
    .padding(.horizontal, KTodayGeometry.gutter)
    .padding(.bottom, bottomRoom)
    .animation(reduceMotion ? nil : .easeOut(duration: 0.25)) { $0.opacity(shown ? 1 : 0) }
    .animation(reduceMotion ? nil : .timingCurve(0.3, 0.9, 0.3, 1, duration: 0.4)) { $0.offset(y: shown || reduceMotion ? 0 : 160) }
    .allowsHitTesting(shown)
    .accessibilityHidden(!shown)
    .dynamicTypeSize(...DynamicTypeSize.accessibility2)
  }
}
