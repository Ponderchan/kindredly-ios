// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE REPLY BOX (owner, 2026-11-09: the Reddit-style reply, from his approved clickable prototype;
 it replaced the chat composers' A1 bar, the mono hint over a pill, on Today). At rest Today has
 no reply box at all: the band and the tab bar are what show. REPLY on the control band raises the
 keyboard (the desk focuses dock.reply), and that is reply mode: the band fades out, the tab bar
 slides away, the card shrinks to stand 14 over the box (KTodayDesk), and the box rises from below
 the screen onto the keyboard:

   (the whole layer dimmed: rgba(30,27,53,.14), Midnight black .32; a tap drops the keyboard)
  ╭───────────────────────────────────────────────────────────────╮  full width, sf, top corners
  │ ▦ Replying to No. 7273                                  (⤢)  │  22, a soft shadow upwards
  │ write back to No. 7273…                                       │  the field: 17, two lines
  │                                                               │  growing to five, then it scrolls
  │ ☺                     OVER THE LIMIT BY 3                (✈)  │  emoji · a notice · send (36)
  ═══════════════════════════ keyboard, right under it ═════════════

 - THE HEADER: the writer's face as the card shows it (KCardFaceSlot at 22), "Replying to …" (the
   card's replyingTo, rd.replyingTo with the header's name; system 600 13 in sub, one line,
   truncating), and EXPAND (a 32 circle on a soft lav tint, the two diagonal arrows going out;
   VoiceOver rd.expandA11y).
 - THE FIELD is the KComposerField the bar had: the reader's Letter font (content: true), Return
   a new line (a reply is a letter and letters keep their paragraphs), 17 here.
 - THE FOOTER: the emoji key (KEmojiKey: the system emoji keyboard and back) on the left, the send
   key on the right: a 36 circle, lav with the plane in faint while there is nothing to send, ind
   (#3A34D6 on the light themes) with the plane in white once there is; dimmed (a full pouch) it is
   drawn as nothing-to-send but still pressed, so TS can say why. Between them, only when TS has
   one, the line about this send (TS's composer hint: the headwind, over the limit in the postmark
   red, the pouch full; mono 10 capitals in sub). TS sends no resting line: the header says who
   the words go to, and ld.replyThreadOpens is no longer shown here.

 EXPAND turns the box into a FULL PAGE between the status bar and the keyboard (top corners 26):

  ╭───────────────────────────────────────────────────────────────╮
  │ (⤡)               Replying to No. 7273                        │  COLLAPSE (rd.collapseA11y)
  │ ┌───────────────────────────────────────────────────────────┐ │
  │ │ ▦ No. 7273                                                │ │  the quote: the face at 30,
  │ │   SEP.23                                                  │ │  the name, the date, the
  │ │   I fixed the wobbly chair today. Nobody will ever kn…     │ │  letter's first two lines
  │ └───────────────────────────────────────────────────────────┘ │
  │ the words, 19, filling the page and scrolling inside           │
  │───────────────────────────────────────────────────────────────│
  │ ☺                                                        (✈)  │  the same footer, on the keyboard
  ═══════════════════════════ keyboard ════════════════════════════

 It is the same box grown, not a second one: ONE field, kept at the same place in the view tree,
 so the words, the caret and the keyboard stay as they are both ways (only its size, 17 or 19, and
 its lines change). COLLAPSE goes back to the compact box. Send works from either. The box grows
 up from the keyboard over .38s (the prototype's curve); under Reduce Motion it fades out and back
 in as the other instead. The full page is never measured for the desk: the card keeps the
 compact box's height under it.

 - IT RISES AND GOES WITH THE KEYBOARD: while the field doesn't have the keyboard the box waits
   just under the screen's bottom edge (offset by its own height and its shadow), and focus brings
   it up on the band's slide (.35s) as the keyboard rises under it; the keyboard's done, the scrim,
   VoiceOver's escape and a send take it down and away the same way (and a full page goes back to
   the compact box for next time). Under Reduce Motion it only fades in and out where it stands.
 - THE ROOM: the compact box's height as drawn goes to the desk through dock.stage with the
   keyboard's, so the card's foot stays 14 over the box.
 - THE SCRIM covers the whole layer behind the box while the field has the keyboard, and fades in
   over .2s: a tap anywhere but the box drops the keyboard. The tab bar is away meanwhile (its own
   Host, slid down by TS from the field's focus). VoiceOver's escape drops the keyboard too (from
   the field itself through its onEscape, from the keys through the container's action).
 - VOICEOVER reads who you reply to, the quote (full page), the field, the emoji key, the notice,
   the send key, and last the expand or collapse key; the full page is modal.
 - With a hardware keyboard (focused, no keyboard inset) it is still reply mode: the box stands on
   the screen's foot, its keys over the home indicator, and the band stays out until the field
   lets go.

 THE FIELD NEVER LEAVES. It is always mounted, only hidden (the expo focus/unmount crash), and it
 is bound to the card the deck shows (deck.shownId): what the reader types goes to TS with that
 card's id (onReplyChange), and TS seeds the field (setText) when the bound letter changes. TS's
 composer command says what the key and the notice show; a composer for another letter is ignored
 until TS catches up. Focus sets deck.typing (the band fades out, Wren with it, the deck
 holds still) and losing it says keyboardDown. SEND (enabled): the field lets go at once, and
 deck.typing stays on until TS answers the press (its serial comes back in the composer), so the
 band doesn't come back while Wren takes the letter off it (KWireWren).
 */
struct KReplyDock: View {
  private let theme: KTheme
  private let labels: KTodayLabels
  private let card: KLetterCardModel?
  private let placeholder: String
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  @ObservedObject private var dock: KTodayDock
  @ObservedObject private var deck: KDeckState
  private let actions: KTodayActions

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /// the compact box as drawn: how far under the screen's edge it waits
  @State private var boxHeight: CGFloat = 140
  /* THE RIGHT PAGE (iPhone Duo's inner screen; KTodayDesk, THE SPREAD). There the box is always
     the page, standing on the right page from the letter's top to the keyboard: no quote (the
     letter itself is on the left page), no expand or collapse (there is nothing smaller to go
     back to), and the compact header's line saying who the words go to. `pageTop` is where the
     page starts (the letter's top). */
  private let page: Bool
  private let pageTop: CGFloat
  /// with no software keyboard under it, the page stands this far off the screen's foot (level
  /// with the letter's)
  private let pageFoot: CGFloat
  /// the box is the full page
  @State private var expanded = false
  /// Reduce Motion's cross-fade between the box and the page
  @State private var fade: Double = 1

  /// the box growing into the page and back (the prototype's cubic-bezier(.2,.85,.25,1), .38s)
  static let grow = Animation.timingCurve(0.2, 0.85, 0.25, 1, duration: 0.38)

  /// - Parameters:
  ///   - labels: SEND (labels.send), the emoji key's VoiceOver name (labels.emoji), and the
  ///     expand and collapse keys' (labels.expandA11y, labels.collapseA11y)
  ///   - card: the shown card (the writer's face, name, date and letter, and replyingTo); nil in done
  ///   - placeholder: the shown card's replyPlaceholder ("write back to No. 7273…"), else
  ///     labels.placeholder
  ///   - topInset: the status bar: the full page starts under it
  ///   - bottomInset: the home indicator: with a hardware keyboard the box's keys stand over it
  ///   - dock: the field, TS's composer, focus and the keyboard
  ///   - deck: the shown card (the field's letter) and typing
  init(
    theme: KTheme,
    labels: KTodayLabels,
    card: KLetterCardModel?,
    placeholder: String,
    topInset: CGFloat,
    bottomInset: CGFloat,
    dock: KTodayDock,
    deck: KDeckState,
    page: Bool = false,
    pageTop: CGFloat = 0,
    pageFoot: CGFloat = 0,
    actions: KTodayActions
  ) {
    self.theme = theme
    self.labels = labels
    self.card = card
    self.placeholder = placeholder
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.page = page
    self.pageTop = pageTop
    self.pageFoot = pageFoot
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

  /// the scrim's colour in this theme (light: the prototype's; Midnight darker, so it reads on the dark page)
  private var scrimColor: Color {
    theme.isDark
      ? Color.black.opacity(0.32)
      : Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 0.14)
  }

  var body: some View {
    let focused = dock.focused
    // one layer, the box drawn last: the scrim covers ALL of it behind the box, so a touch
    // anywhere else drops the keyboard and never reaches a card under the words
    ZStack(alignment: .bottom) {
      // (the right page of a folding phone covers nothing: the letter is beside it, so no dim)
      scrimColor
        .opacity(focused && !page ? 1 : 0.001)
        .animation(.easeOut(duration: 0.2), value: focused)
        .contentShape(Rectangle())
        .onTapGesture { dock.reply.blur() }
        .allowsHitTesting(focused)
        .accessibilityHidden(true)
      box
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
    .onChange(of: focused) { _, now in
      // the box goes away as the compact box: the next REPLY opens it small again
      if !now && expanded {
        var quiet = Transaction()
        quiet.disablesAnimations = true
        withTransaction(quiet) {
          expanded = false
          fade = 1
        }
      }
    }
  }

  /// deck.typing: the field has the keyboard, or a send it let go of hasn't been answered yet
  private func syncTyping() {
    let now = dock.focused || dock.awaitingSend
    if deck.typing != now { deck.typing = now }
  }

  /// Into the full page (true) or back to the compact box: the box grows or shrinks in place, or,
  /// under Reduce Motion, fades out, changes, and fades back in.
  private func setExpanded(_ now: Bool) {
    guard now != expanded else { return }
    if reduceMotion {
      withAnimation(.easeOut(duration: 0.12)) {
        fade = 0
      } completion: {
        var quiet = Transaction()
        quiet.disablesAnimations = true
        withTransaction(quiet) { expanded = now }
        withAnimation(.easeIn(duration: 0.18)) { fade = 1 }
      }
    } else {
      withAnimation(Self.grow) { expanded = now }
    }
  }

  // ── the box ──
  private var box: some View {
    let state = composer?.sendState ?? .disabled
    let focused = dock.focused
    let isExpanded = expanded || page
    return KReplyBox(
      theme: theme,
      labels: labels,
      card: card,
      placeholder: placeholder,
      notice: composer?.hint ?? "",
      noticeWarn: composer?.hintWarn == true,
      sendState: state,
      expanded: expanded || page,
      page: page,
      // with a hardware keyboard the layer reaches the screen's foot: the keys stand over the
      // home indicator; with the software one the box sits right on it
      bottomPad: max(0, bottomInset - dock.keyboardInset),
      controller: dock.reply,
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
      onSend: { send(state) },
      onExpand: { setExpanded(true) },
      onCollapse: { setExpanded(false) }
    )
    // the compact box as drawn, for the desk's card and for how far down the box waits (the
    // full page covers the card, which keeps the compact box's height under it)
    .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { height in
      guard !isExpanded else { return }
      if abs(boxHeight - height) > 0.5 { boxHeight = height }
      dock.stage.setStrip(height)
    }
    .opacity(fade)
    // the full page stops under the status bar (the right page: level with the letter's top)
    .padding(.top, page ? pageTop : topInset)
    // inside the dock's own frame, so the keyboard's measure (the frame's height) never moves
    .padding(.bottom, page && dock.keyboardInset < 1 ? pageFoot : 0)
    // up from under the screen's edge with the keyboard, and down and away with it (its own
    // height and its shadow beyond the edge); a fade alone under Reduce Motion
    .offset(y: focused || reduceMotion ? 0 : boxHeight + 32)
    .animation(reduceMotion ? nil : KTodayMotion.bandSlide, value: focused)
    .opacity(focused ? 1 : 0)
    .animation(reduceMotion ? KTodayMotion.reduced : .easeOut(duration: 0.2), value: focused)
    .allowsHitTesting(focused)
    // VoiceOver's escape (the two-finger scrub) drops the keyboard without sending: the scrim is
    // hidden from VoiceOver and the keyboard has no key for it. A container of its own, so the
    // escape reaches it from the keys inside (the field passes its own on through onEscape).
    // Always attached, acting only while focused (and the box is hidden from VoiceOver
    // otherwise): a modifier that came and went with the focus would rebuild the box, and the
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
}

/// The box itself, compact or as the full page (see THE REPLY BOX above). Its own view so it reads
/// the Dynamic Type size the dock caps (the field's lines are counted in it).
private struct KReplyBox: View {
  static let compactCorner: CGFloat = 22
  static let fullCorner: CGFloat = 26
  /// the field's size before Dynamic Type: the box's, and the full page's
  static let compactSize: CGFloat = 17
  static let fullSize: CGFloat = 19
  static let face: CGFloat = 22
  static let quoteFace: CGFloat = 30
  /// expand and collapse: a 32 circle on a 44 target
  static let roundKey: CGFloat = 32
  static let target: CGFloat = 44
  /// the header line, "Replying to No. 7273"
  static let headerStyle = KTextStyle.system(13, .semibold)
  /// the full page's title
  static let titleStyle = KTextStyle.system(16, .semibold)
  static let quoteName = KTextStyle.system(14, .semibold)
  static let quoteText = KTextStyle.system(15, .regular, lineHeight: 1.4)

  let theme: KTheme
  let labels: KTodayLabels
  let card: KLetterCardModel?
  let placeholder: String
  let notice: String
  let noticeWarn: Bool
  let sendState: KSendState
  let expanded: Bool
  /// the right page of a folding phone (KReplyDock, THE RIGHT PAGE)
  var page = false
  let bottomPad: CGFloat
  let controller: KFieldController
  let onChange: (String) -> Void
  let onFocus: (Bool) -> Void
  let onEscape: () -> Bool
  let onSend: () -> Void
  let onExpand: () -> Void
  let onCollapse: () -> Void

  @Environment(\.dynamicTypeSize) private var typeSize
  @Environment(\.kLetterFace) private var letterFace
  /// the full page's room for the field, as laid out (its lines are counted from it)
  @State private var fieldRoom: CGFloat = 0

  private var replyingTo: String { card?.replyingTo ?? "" }

  /// the round keys' soft ground (the prototype's #F3F2F9 on white; a deeper tint in Midnight)
  private var keyTint: Color { theme.lav.opacity(theme.isDark ? 0.8 : 0.55) }

  /// the box's shadow, up over the dimmed desk
  private var shadowColor: Color {
    theme.isDark ? Color.black.opacity(0.45) : Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: expanded ? 0.18 : 0.14)
  }

  var body: some View {
    let corner = expanded ? Self.fullCorner : Self.compactCorner
    // the right page is a sheet of its own, round at every corner; the box stands on the keyboard
    let shape = UnevenRoundedRectangle(topLeadingRadius: corner, bottomLeadingRadius: page ? corner : 0, bottomTrailingRadius: page ? corner : 0, topTrailingRadius: corner, style: .continuous)
    // the field keeps its place in this stack whichever way the box is drawn, so it is the same
    // text view both ways
    VStack(spacing: 0) {
      header
      if expanded && !page {
        quote
          .padding(.horizontal, 16)
          .transition(.opacity)
      }
      field
      footer
    }
    .padding(.bottom, bottomPad)
    .frame(maxWidth: .infinity)
    .frame(maxHeight: expanded ? .infinity : nil, alignment: .top)
    .background {
      shape
        .fill(theme.sf)
        .shadow(color: shadowColor, radius: expanded ? 15 : 12, x: 0, y: expanded ? -10 : -8)
    }
    .accessibilityElement(children: .contain)
    .accessibilityAddTraits(expanded ? .isModal : [])
  }

  // ── the header ──
  @ViewBuilder private var header: some View {
    if expanded && !page {
      ZStack {
        Text(replyingTo)
          .kText(Self.titleStyle)
          .foregroundStyle(theme.ink)
          .lineLimit(1)
          .padding(.horizontal, Self.roundKey + 8)
          .accessibilityAddTraits(.isHeader)
          .accessibilitySortPriority(5)
        HStack(spacing: 0) {
          roundKey(expand: false, label: labels.collapseA11y, action: onCollapse)
          Spacer(minLength: 0)
        }
      }
      .padding(EdgeInsets(top: 14, leading: 16, bottom: 10, trailing: 16))
    } else {
      HStack(spacing: 8) {
        if let card {
          KCardFaceSlot(theme: theme, face: card.who.face, side: Self.face)
        }
        Text(replyingTo)
          .kText(Self.headerStyle)
          .foregroundStyle(theme.sub)
          .lineLimit(1)
          .truncationMode(.tail)
          .frame(maxWidth: .infinity, alignment: .leading)
          .accessibilitySortPriority(5)
        if !page {
          roundKey(expand: true, label: labels.expandA11y, action: onExpand)
        }
      }
      .padding(EdgeInsets(top: page ? 16 : 12, leading: 16, bottom: 8, trailing: 16))
    }
  }

  /// Expand (the arrows going out) or collapse (coming in): a 32 circle on the soft tint, its
  /// target 44 reaching into the margins. Read last.
  private func roundKey(expand: Bool, label: String, action: @escaping () -> Void) -> some View {
    SwiftUI.Button(action: action) {
      KReplyBoxArrows(expand: expand)
        .stroke(theme.sub, style: StrokeStyle(lineWidth: 2.2, lineCap: .round, lineJoin: .round))
        .frame(width: 16, height: 16)
        .frame(width: Self.roundKey, height: Self.roundKey)
        .background(Circle().fill(keyTint))
        .frame(width: Self.target, height: Self.target)
        .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .padding(-(Self.target - Self.roundKey) / 2)
    .accessibilityLabel(label)
    .accessibilitySortPriority(0)
  }

  // ── the quote (the full page) ──
  @ViewBuilder private var quote: some View {
    if let card {
      HStack(alignment: .top, spacing: 10) {
        KCardFaceSlot(theme: theme, face: card.who.face, side: Self.quoteFace)
        VStack(alignment: .leading, spacing: 0) {
          Text(card.who.name)
            .kText(Self.quoteName)
            .foregroundStyle(theme.ink)
            .lineLimit(1)
          if !card.when.isEmpty {
            Text(card.when)
              .kText(KLetterCard.whenStyle)
              .foregroundStyle(theme.mute)
              .lineLimit(1)
          }
          Text(quoteText(card))
            .kText(Self.quoteText)
            .foregroundStyle(theme.sub)
            .lineLimit(2)
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(EdgeInsets(top: 12, leading: 14, bottom: 12, trailing: 14))
      .background(
        RoundedRectangle(cornerRadius: 16, style: .continuous)
          .fill(theme.isDark ? theme.soft2 : theme.lav.opacity(0.4))
      )
      // the field keeps its room at the largest sizes
      .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
      .accessibilityElement(children: .combine)
      .accessibilitySortPriority(4)
    }
  }

  /// the letter's first words; a voice letter has none, so its caption or VOICE LETTER
  private func quoteText(_ card: KLetterCardModel) -> String {
    if !card.body.isEmpty { return card.body }
    return card.caption.isEmpty ? labels.voiceLetter : card.caption
  }

  // ── the field ──
  private var field: some View {
    let size = expanded ? Self.fullSize : Self.compactSize
    let line = ceil(KComposerField.contentFont(size: size, face: letterFace, typeSize: typeSize).lineHeight)
    let ax = typeSize.isAccessibilitySize
    // two lines growing to five in the box (one to three at the accessibility sizes, where a
    // line is ~40pt); as many as the full page has room for there
    let minLines = ax ? 1 : 2
    let maxLines = expanded ? max(minLines, Int((fieldRoom / line).rounded(.down))) : (ax ? 3 : 5)
    let isExpanded = expanded
    return KComposerField(
      theme: theme,
      controller: controller,
      placeholder: placeholder,
      size: size,
      // what is typed here is a letter: the reader's Letter font
      content: true,
      maxLines: maxLines,
      returnSends: false,
      onChange: onChange,
      onFocus: onFocus,
      onEscape: onEscape
    )
    .frame(minHeight: line * CGFloat(minLines), alignment: .topLeading)
    .frame(maxHeight: expanded ? .infinity : nil, alignment: .topLeading)
    .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { height in
      guard isExpanded, abs(fieldRoom - height) > 0.5 else { return }
      fieldRoom = height
    }
    // a tap in the room the words don't fill yet puts the caret back (the text view takes its own)
    .background {
      Color.clear
        .contentShape(Rectangle())
        .onTapGesture { controller.focus() }
    }
    .padding(expanded ? EdgeInsets(top: 16, leading: 18, bottom: 16, trailing: 18) : EdgeInsets(top: 2, leading: 16, bottom: 6, trailing: 16))
    .accessibilitySortPriority(3)
  }

  // ── the footer: the emoji key, the notice, the send key ──
  private var footer: some View {
    HStack(spacing: 8) {
      KEmojiKey(theme: theme, controller: controller, label: labels.emoji)
        .accessibilitySortPriority(2)
      Text(notice.uppercased())
        .kText(.monoMetaWide)
        .foregroundStyle(noticeWarn ? KBrand.postRed : theme.sub)
        .multilineTextAlignment(.center)
        .lineLimit(2)
        .minimumScaleFactor(0.8)
        .frame(maxWidth: .infinity)
        .dynamicTypeSize(...DynamicTypeSize.accessibility2)
        .accessibilityHidden(notice.isEmpty)
        .accessibilitySortPriority(1.5)
      KReplyBoxSend(theme: theme, state: sendState, label: labels.send, action: onSend)
        .accessibilitySortPriority(1)
    }
    .padding(expanded ? EdgeInsets(top: 8, leading: 10, bottom: 10, trailing: 16) : EdgeInsets(top: 4, leading: 10, bottom: 10, trailing: 16))
    .overlay(alignment: .top) {
      if expanded {
        Rectangle().fill(theme.line).frame(height: 0.5)
      }
    }
  }
}

/// The send key: a 36 circle on a 44 target. Nothing to send: lav, the plane in faint, not
/// pressable. Words that can go: ind (#3A34D6 on the light themes) with the plane in white (in
/// Midnight the page's dark, which reads on its pale ind). Dimmed (a full pouch): drawn as
/// nothing-to-send but still pressed, so TS can say why.
private struct KReplyBoxSend: View {
  static let diameter: CGFloat = 36

  let theme: KTheme
  let state: KSendState
  let label: String
  let action: () -> Void

  var body: some View {
    let on = state == .enabled
    SwiftUI.Button(action: action) {
      KLineIcon(.planeLine, size: 18, lineWidth: 2.2, color: on ? (theme.isDark ? theme.bg : KBrand.paperWhite) : theme.faint)
        .frame(width: Self.diameter, height: Self.diameter)
        .background(Circle().fill(on ? theme.ind : theme.lav))
        .frame(width: 44, height: 44)
        .contentShape(Circle())
    }
    .buttonStyle(KFadePressStyle())
    .padding(-4)
    .disabled(state == .disabled)
    .animation(.easeOut(duration: 0.2), value: on)
    .accessibilityLabel(label)
  }
}

/// The expand and collapse glyphs, two diagonal arrows in a 24 box (the prototype's paths):
/// out to the corners (expand), or in from them (collapse).
private struct KReplyBoxArrows: Shape {
  let expand: Bool

  func path(in rect: CGRect) -> Path {
    let s = min(rect.width, rect.height) / 24
    func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: rect.minX + x * s, y: rect.minY + y * s) }
    var path = Path()
    if expand {
      // M14 4h6v6 M10 20H4v-6 M20 4l-7 7 M4 20l7-7
      path.move(to: p(14, 4)); path.addLine(to: p(20, 4)); path.addLine(to: p(20, 10))
      path.move(to: p(10, 20)); path.addLine(to: p(4, 20)); path.addLine(to: p(4, 14))
      path.move(to: p(20, 4)); path.addLine(to: p(13, 11))
      path.move(to: p(4, 20)); path.addLine(to: p(11, 13))
    } else {
      // M4 14h6v6 M20 10h-6V4 M10 14l-7 7 M14 10l7-7
      path.move(to: p(4, 14)); path.addLine(to: p(10, 14)); path.addLine(to: p(10, 20))
      path.move(to: p(20, 10)); path.addLine(to: p(14, 10)); path.addLine(to: p(14, 4))
      path.move(to: p(10, 14)); path.addLine(to: p(3, 21))
      path.move(to: p(14, 10)); path.addLine(to: p(21, 3))
    }
    return path
  }
}
