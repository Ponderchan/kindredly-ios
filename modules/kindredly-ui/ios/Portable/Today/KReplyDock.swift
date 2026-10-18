// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE REPLY DOCK (Today 3d × 25b, Prompt 7; the bar is the chat composers' reply bar and its A1
 mount, owner 2026-10-18: "the chat after tapping REPLY follows the prototype"). At rest Today has
 no reply bar at all: the band and the tab bar are what show. REPLY on the control band raises
 the keyboard (the desk focuses dock.reply), and that is reply mode: the band fades out, the tab
 bar slides away, the card shrinks (KTodayDesk), and the reply bar rises from below the screen to
 12 over the keyboard:

   (the whole layer dimmed: rgba(30,27,53,.18), Midnight black .35; a tap drops the keyboard)
      REPLY AND A THREAD OPENS                      the composer's hint, 6 in, 6 above the bar
   ┌──────────────────────────────────────────────┐
   │ ↩  write back to No. 7273…          ☺   (✈)  │  the reply bar (Kit/KReplyBar.swift): 16 from
   └──────────────────────────────────────────────┘  either edge, 54 at one line, corners of 16,
   ═══════════════ keyboard, 12 below ═══════════════  sf, a 2 ln outline, a hard 2/2 ln shadow

 - THE BAR is KReplyBar, shared with the pen-pal chat. Return is a new line (a reply is a letter
   and letters keep their paragraphs). The send disc has the three states it always had:
   disabled (#C9C6D6), enabled (ink, the plane), dimmed (a full pouch: drawn off, still pressed,
   so TS can say why).
 - IT RISES AND GOES WITH THE KEYBOARD: while the field doesn't have the keyboard the bar waits
   just under the screen's bottom edge (offset by its own height and its gap), and focus brings it
   up on the band's slide (.35s) as the keyboard rises under it; the keyboard's done, the scrim,
   VoiceOver's escape and a send take it down and away the same way. Under Reduce Motion it only
   fades in and out where it stands.
 - THE HINT is TS's composer hint (today-cards replyState: the headwind line, over the limit in
   the postmark red, the pouch full, the two thread lines), set in capitals here (the headwind
   line is written in lower case for its other places) in the bar's hint style, mono 10 at .14em
   in sub; it is up whenever the bar is, since the bar only shows with the keyboard.
 - THE ROOM: the strip's height as drawn (the hint and the bar, which grows to four lines) goes to
   the desk through dock.stage with the keyboard's, so the card's foot stays 14 over the hint.
 - THE SCRIM covers the whole layer behind the bar while the field has the keyboard, and fades
   in over .2s: a tap anywhere but the bar drops the keyboard. The tab bar is away meanwhile (its
   own Host, slid down by TS from the field's focus). VoiceOver's escape drops the keyboard too
   (from the field itself through its onEscape, from the keys through the container's action).
 - With a hardware keyboard (focused, no keyboard inset) it is still reply mode: the bar sits on
   the tab bar's own line over the bottom safe area (bottomGap, KTabBarMetrics) instead of 12
   above a keyboard that isn't there, and the band stays out until the field lets go.

 THE FIELD NEVER LEAVES. It is always mounted, only hidden (the expo focus/unmount crash), and it
 is bound to the card the deck shows (deck.shownId): what the reader types goes to TS with that
 card's id (onReplyChange), and TS seeds the field (setText) when the bound letter changes. TS's
 composer command says what the key and the hint show; a composer for another letter is ignored
 until TS catches up. Focus sets deck.typing (the band fades out, Wren with it, the deck
 holds still) and losing it says keyboardDown. SEND (enabled): the field lets go at once, and
 deck.typing stays on until TS answers the press (its serial comes back in the composer), so the
 band doesn't come back while Wren takes the letter off it (KWireWren).
 */
struct KReplyDock: View {
  private let theme: KTheme
  private let labels: KTodayLabels
  private let placeholder: String
  private let bottomGap: CGFloat
  @ObservedObject private var dock: KTodayDock
  @ObservedObject private var deck: KDeckState
  private let actions: KTodayActions

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /// the hint and the bar as drawn: how far under the screen's edge the bar waits
  @State private var stripHeight: CGFloat = KReplyBar.minHeight

  /// - Parameters:
  ///   - labels: SEND (labels.send) and the emoji key's VoiceOver name (labels.emoji)
  ///   - placeholder: the shown card's replyPlaceholder ("write back to No. 7273…"), else
  ///     labels.placeholder
  ///   - bottomGap: the tab bar's own line over the bottom safe area: where the bar sits with a
  ///     hardware keyboard (the tab bar is away while the reader writes back)
  ///   - dock: the field, TS's composer, focus and the keyboard
  ///   - deck: the shown card (the field's letter) and typing
  init(
    theme: KTheme,
    labels: KTodayLabels,
    placeholder: String,
    bottomGap: CGFloat,
    dock: KTodayDock,
    deck: KDeckState,
    actions: KTodayActions
  ) {
    self.theme = theme
    self.labels = labels
    self.placeholder = placeholder
    self.bottomGap = bottomGap
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
    // one layer, the bar drawn last: the scrim covers ALL of it behind the bar, so a touch
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

  // ── the reply bar and its hint ──
  private var strip: some View {
    let state = composer?.sendState ?? .disabled
    let focused = dock.focused
    // 12 over the software keyboard (the layer stands on it); on the tab bar's line with none
    let gap = max(KTodayGeometry.replyGap, bottomGap - dock.keyboardInset)
    return KReplyBar(
      theme: theme,
      controller: dock.reply,
      placeholder: placeholder,
      // in capitals, as the prototype sets it (TS's headwind line is lower case elsewhere)
      hint: (composer?.hint ?? "").uppercased(),
      hintWarn: composer?.hintWarn == true,
      // the bar only shows with the keyboard, so its hint is up whenever it is
      showsHint: true,
      sendState: state,
      sendLabel: labels.send,
      emojiLabel: labels.emoji,
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
      },
      onEscape: {
        // from inside the field (a UITextView: the container's action below doesn't reach it)
        guard dock.focused else { return false }
        dock.reply.blur()
        return true
      },
      onSend: { send(state) }
    )
    // the strip as drawn, for the desk's card and for how far down the bar waits
    .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { height in
      if abs(stripHeight - height) > 0.5 { stripHeight = height }
      dock.stage.setStrip(height)
    }
    .padding(.horizontal, KTodayGeometry.gutter)
    .padding(.bottom, gap)
    .animation(reduceMotion ? nil : KTodayMotion.bandSlide, value: gap)
    // up from under the screen's edge with the keyboard, and down and away with it (its own
    // height, its gap and the hard shadow's 2 beyond the edge); a fade alone under Reduce Motion
    .offset(y: focused || reduceMotion ? 0 : stripHeight + gap + KReplyBar.shadowOffset + 8)
    .animation(reduceMotion ? nil : KTodayMotion.bandSlide, value: focused)
    .opacity(focused ? 1 : 0)
    .animation(reduceMotion ? KTodayMotion.reduced : .easeOut(duration: 0.2), value: focused)
    .allowsHitTesting(focused)
    // VoiceOver's escape (the two-finger scrub) drops the keyboard without sending: the scrim is
    // hidden from VoiceOver and the keyboard has no key for it. A container of its own, so the
    // escape reaches it from the emoji key and the send key inside (the field passes its own on
    // through onEscape). Always attached, acting only while focused (and the bar is hidden from
    // VoiceOver otherwise): a modifier that came and went with the focus would rebuild the bar,
    // and the field in it, at the moment it took the keyboard.
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
