// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE DOCK: everything above and in place of the composer, under the list (never in a
 safeAreaInset: spike pattern 1). Top to bottom:

 1. the closing line ("Closes in 3 days…" and FIRST CLASS KEEPS IT OPEN ›, one link)
 2. Wren's notice (SoftGroup: soft, corners 16, padding 12 14; her bird 20, WREN NOTICED and the
    evidence in mono 9, the ×, the line in system 15 at 1.5, the #word as an aura label)
 3. the sign door (pen-pal chat): above the status line and the strip, as it always stood
    (critic): a capsule (sf, 2 ln, corners 20, mono 600 10), gold on cream with a wax shadow when
    they went first, plain mono when I did
 4. the status line: over the limit in postmark red, or the slow-network note in mute (it used to
    be a toast under the keyboard: spec bug 8)
 5. the reply quote (2pt ind rule, REPLYING TO in mono 500 10 ind, one line of the excerpt, ×),
    only while no mode is set
 6. the mode box (lav2, 1.5 ind outline, corners 16, padding 12): its title, ×, and the question's
    prompt field (ask) or the prompt being answered
 7. a room's ideas bubble (chat composers B, Prompt 4: Chat/KKindredBar.swift KIdeasBubble), 8
    above the bar while it is open
 8. the composer row — or, in its place, the gone line or the expired card (InkCard .me,
    REKINDLE):
    - a room (chat composers B, 2026-10-18; the owner's rework that evening): the Kindreds bar
      (Chat/KKindredBar.swift: the ideas key, the capsule with only the field, the emoji key, the
      +; ringless line icons, and the keyboard's send key sends: Return sends, as it did), in
      place of the 10a strip and its Wren tool. The ideas key replaces the Wren tool (which seeded
      the question mode: Ask something in the + tray still does);
    - the pen-pal chat (chat composers A2, 2026-10-18): the reply bar (Kit/KReplyBar.swift, on a
      KComposerField: the reply arrow, the field, the emoji key, the send disc; Return sends, as
      it did). No ideas, no +, as before. While the keyboard is up its hint stands over it:
      LETTER 4 OF 5, LETTER 5 OF 5 · ONE MORE AND NAMES on your fifth, the band's line once your
      five are in (TS words it: dock.hint).
    Both rest at the bottom 16 from either edge (the Kindreds bar's icons; their targets reach 8
    from it) and ride the keyboard (or the + tray) 12 above it.

 THE THREE PANELS (Prompt 3) shut each other, and this dock is where: the ideas bubble lets go of
 the keyboard and shuts the tray; the + lets go of the keyboard (and with it the emoji keyboard)
 and shuts the bubble; the field taking the keyboard (the emoji key gives it the keyboard if it
 hasn't it) shuts both. A tap on the list's empty space shuts the bubble too (KConversation).

 Inset 12 (the gone line 26; the bars 16). Bottom padding: 12 above the keyboard or the tray, the
 home indicator's inset (at least 10) when both are down.

 ACCESSIBILITY SIZES. 1-6 sit in a scroll view at most 40% of the surface tall (KChatCappedHeight:
 its content's height up to that), so at AX5 on an SE the dock can't push the composer under the
 keyboard and leave the list nothing; the body field shows 3 lines before it scrolls inside (5 at
 ordinary sizes) and the round tools stop growing at xxxLarge, as KTabBar's fixed bar does.

 VOICEOVER'S ESCAPE (two-finger Z) closes only what is open: the reply quote, the mode box (from
 its prompt field or its x), the tray from the + (the tray's own cards close it too, KChatTray),
 the ideas bubble from the ideas key or from the bubble. Everywhere else it falls through to the
 stack's back.

 THE TRAY rises on KChatMotion.tray: .45s cubic-bezier(.3,1,.3,1), a plain ease under Reduce
 Motion (the list and the dock reflow inside the same transaction). The bubble pops in on
 KChatMotion.popIn(.3), the dock growing under the same curve; a fade under Reduce Motion.

 NEVER REMOVE A FOCUSED FIELD (the expo focus/unmount crash). Both fields stay mounted for the
 life of the dock: the composer row is collapsed and disabled under the gone line or the expired
 card, after the fields have let go and a runloop has passed; the prompt field is collapsed when
 the mode doesn't ask for it, after it has let go.
 */

struct KChatDockView: View {
  let theme: KTheme
  let variant: KChatVariant
  let dock: KChatDock
  let birds: KChatBirds
  /// the home indicator's inset (the Host ignores it, so the dock pads itself)
  let bottomInset: CGFloat
  /// the conversation's height above the keyboard: the lines above the composer take at most 40%
  let surfaceHeight: CGFloat
  @ObservedObject var driver: KConversationDriver
  let actions: KConversationActions

  /// the terminal state drawn: it follows dock.terminal a runloop after the fields let go
  @State private var shownTerminal: KChatTerminal
  /// the composer has the keyboard (the reply bar's hint shows)
  @State private var bodyFocused = false
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  init(theme: KTheme, variant: KChatVariant, dock: KChatDock, birds: KChatBirds, bottomInset: CGFloat, surfaceHeight: CGFloat, driver: KConversationDriver, actions: KConversationActions) {
    self.theme = theme
    self.variant = variant
    self.dock = dock
    self.birds = birds
    self.bottomInset = bottomInset
    self.surfaceHeight = surfaceHeight
    self.driver = driver
    self.actions = actions
    _shownTerminal = State(initialValue: dock.terminal)
  }

  private var composerHidden: Bool { shownTerminal != .none }

  /// the most the lines above the composer may take before they scroll
  private var aboveCap: CGFloat { max(120, (surfaceHeight * 0.4).rounded()) }

  private var trayAnimation: Animation { KChatMotion.tray(reduceMotion: reduceMotion) }

  private var ideasAnimation: Animation { reduceMotion ? .easeOut(duration: 0.2) : KChatMotion.popIn(0.3) }

  private var bottomPadding: CGFloat {
    // both bars ride the keyboard or the tray 12 above it (Prompts 2 and 3)
    driver.keyboardHeight > 0 || driver.trayOpen ? 12 : max(10, bottomInset)
  }

  private var showsIdeas: Bool {
    dock.hasTools && driver.ideasOpen && shownTerminal == .none && !driver.idea.isEmpty
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      // always mounted (the mode box holds the prompt field): its content's height, up to the cap
      KChatCappedHeight(cap: aboveCap) {
        ScrollView {
          aboveComposer
        }
        .scrollBounceBehavior(.basedOnSize)
        .scrollDismissesKeyboard(.never)
      }
      switch shownTerminal {
      case .gone:
        Text(dock.goneText)
          .kText(.mono(11, .medium, tracking: 0.03))
          .foregroundStyle(theme.mute)
          .multilineTextAlignment(.center)
          .frame(maxWidth: .infinity)
          .padding(.horizontal, 14)
          .padding(.top, 6)
          .padding(.bottom, 12)
      case .expired:
        expiredCard.padding(.bottom, 6)
      case .none:
        EmptyView()
      }
      if showsIdeas {
        KIdeasBubble(
          theme: theme,
          label: dock.ideaLabel,
          idea: driver.idea,
          another: dock.ideaAnother,
          use: dock.ideaUse,
          onAnother: { actions.onDock("ideaNext") },
          onUse: useIdea,
          onClose: closeIdeas
        )
        // 16 from either edge (the dock's 12 and 4 more), 8 above the bar
        .padding(.horizontal, 4)
        .padding(.bottom, 8)
        .transition(reduceMotion ? .opacity : .kChatPopIn)
      }
      composerRow
        .frame(maxHeight: composerHidden ? 0 : nil, alignment: .top)
        .clipped()
        .opacity(composerHidden ? 0 : 1)
        .disabled(composerHidden)
        .allowsHitTesting(!composerHidden)
        .accessibilityHidden(composerHidden)
    }
    .padding(.horizontal, 12)
    .padding(.bottom, bottomPadding)
    // see-through over the + tray, so the tray's shadow shows in the gap above it (KConversation)
    .background(driver.trayOpen ? Color.clear : theme.bg)
    .onChange(of: dock.terminal) { _, now in
      swapTerminal(to: now)
    }
    .onChange(of: dock.mode?.showsPrompt ?? false) { _, shows in
      // the prompt field collapses: it lets go first
      if !shows { driver.prompt.blur() }
    }
  }

  /// 1-6: the closing line, Wren's notice, the sign door, the status line, the reply quote, the mode
  /// box. The dock's top padding is inside the scroll view, so the x's 44pt targets (which hang out
  /// of their rows) are never cut by its edge.
  private var aboveComposer: some View {
    VStack(alignment: .leading, spacing: 0) {
      if !dock.closingText.isEmpty {
        closingLine.padding(.bottom, 8)
      }
      if let notice = dock.notice {
        noticeCard(notice).padding(.bottom, 10)
      }
      if dock.signDoor != .none {
        signDoor.padding(.bottom, 10)
      }
      if !driver.status.isEmpty {
        Text(driver.status)
          .kText(.mono(10, .medium, tracking: 0.12))
          .foregroundStyle(driver.statusAlarm ? KBrand.postRed : theme.mute)
          .multilineTextAlignment(.center)
          .frame(maxWidth: .infinity)
          .padding(.bottom, 6)
      }
      // never above the gone line or the expired card (TS doesn't send one there either)
      if !dock.replyLabel.isEmpty && dock.mode == nil && shownTerminal == .none {
        replyBar
          .padding(.bottom, 8)
          .accessibilityAction(.escape) { actions.onDock("replyClose") }
      }
      modeBox
    }
    .padding(.top, 8)
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  /// The composer goes under the gone line or the expired card only once its fields have let go
  /// (a runloop later), and comes back at once.
  private func swapTerminal(to now: KChatTerminal) {
    guard now != .none else {
      shownTerminal = .none
      return
    }
    if driver.trayOpen { driver.trayOpen = false }
    if driver.ideasOpen { driver.ideasOpen = false }
    if driver.body.isFocused || driver.prompt.isFocused {
      driver.blurAll()
      DispatchQueue.main.async { shownTerminal = now }
    } else {
      shownTerminal = now
    }
  }

  private func send(_ typed: String? = nil) {
    let value = typed ?? driver.body.text
    let prompt = driver.prompt.text
    // a plain line that will go as it is: the field empties at once, and the owner puts the words
    // back only if it refuses them
    let clears = driver.clearOnSend && driver.canSend
    if clears { driver.body.clear() }
    actions.onSend(value, prompt, clears)
  }

  // MARK: 1. closing

  private var closingLine: some View {
    SwiftUI.Button {
      actions.onDock("closingLink")
    } label: {
      VStack(alignment: .leading, spacing: 4) {
        Text(dock.closingText)
          .kText(.mono(11, .medium, tracking: 0.02))
          .foregroundStyle(theme.sub)
          .multilineTextAlignment(.leading)
        if !dock.closingLink.isEmpty {
          Text(dock.closingLink + " ›")
            .kText(.mono(10, .semibold, tracking: 0.12))
            .foregroundStyle(theme.ind)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .contentShape(Rectangle())
    }
    .buttonStyle(KChatPlainPress())
    .padding(.horizontal, 10)
    .accessibilityElement(children: .combine)
    .accessibilityAddTraits(.isLink)
  }

  // MARK: 2. notice

  private func noticeCard(_ notice: KChatNotice) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(spacing: 8) {
        KChatBird(theme: theme, ref: birds.notice, size: 20)
        Text(notice.label)
          .kText(.mono(9, .medium, tracking: 0.12))
          .foregroundStyle(theme.mute)
          .lineLimit(1)
        Spacer(minLength: 4)
        Text(notice.evidence)
          .kText(.mono(9, .medium, tracking: 0.1))
          .foregroundStyle(theme.mute)
          .lineLimit(1)
          .truncationMode(.head)
        KChatCloseButton(theme: theme, label: notice.closeLabel) { actions.onDock("noticeClose") }
      }
      Text(notice.line)
        .kText(.system(15, lineHeight: 1.5))
        .foregroundStyle(theme.ink)
        .fixedSize(horizontal: false, vertical: true)
      if !notice.word.isEmpty {
        // the aura label: no fill, no shadow
        Text("#" + notice.word)
          .kText(.system(12, .semibold))
          .foregroundStyle(theme.ind)
          .padding(.horizontal, 12)
          .padding(.vertical, 5)
          .overlay(RoundedRectangle(cornerRadius: 16, style: .circular).strokeBorder(theme.ind, lineWidth: 1.5))
      }
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 12)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(theme.soft))
    .accessibilityElement(children: .contain)
  }

  // MARK: 3. sign door

  @ViewBuilder
  private var signDoor: some View {
    switch dock.signDoor {
    case .waiting:
      Text(dock.signLabel)
        .kText(.mono(10, .medium, tracking: 0.12))
        .foregroundStyle(theme.mute)
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity)
    case .offer, .theirsFirst:
      let gold = dock.signDoor == .theirsFirst
      SwiftUI.Button {
        actions.onDock("sign")
      } label: {
        Text(dock.signLabel)
          .kText(.mono(10, .semibold, tracking: 0.12))
          .foregroundStyle(gold ? KBrand.goldText : theme.ink)
          .multilineTextAlignment(.center)
          .padding(.horizontal, 14 + 2)
          .padding(.vertical, 8 + 2)
          .background {
            KStickerBackground(
              shape: RoundedRectangle(cornerRadius: 20, style: .circular),
              fill: gold ? KBrand.cream : theme.sf,
              stroke: gold ? KBrand.waxGold : theme.ln,
              lineWidth: 2,
              shadow: gold ? KBrand.waxGold : nil,
              shadowOffset: gold ? 2 : 0
            )
          }
          .contentShape(RoundedRectangle(cornerRadius: 20, style: .circular))
      }
      .buttonStyle(KFloatPressStyle())
      .frame(maxWidth: .infinity)
    case .none:
      EmptyView()
    }
  }

  // MARK: 5. reply quote

  private var replyBar: some View {
    HStack(spacing: 10) {
      Rectangle()
        .fill(theme.ind)
        .frame(width: 2)
      VStack(alignment: .leading, spacing: 2) {
        Text(dock.replyLabel)
          .kText(.mono(10, .medium, tracking: 0.12))
          .foregroundStyle(theme.ind)
          .lineLimit(1)
        Text(dock.replyExcerpt)
          .kText(.system(14))
          .foregroundStyle(theme.sub)
          .lineLimit(1)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .accessibilityElement(children: .combine)
      KChatCloseButton(theme: theme, label: dock.replyCloseLabel) { actions.onDock("replyClose") }
    }
    .fixedSize(horizontal: false, vertical: true)
    .padding(.horizontal, 10)
  }

  // MARK: 6. mode box (always mounted: it holds the prompt field)

  private var modeBox: some View {
    let mode = dock.mode
    let shown = mode != nil
    let showsPrompt = mode?.showsPrompt ?? false
    return VStack(alignment: .leading, spacing: 7) {
      HStack(spacing: 8) {
        Text(mode?.title ?? "")
          .kText(.mono(10, .semibold, tracking: 0.12))
          .foregroundStyle(theme.ind)
          .frame(maxWidth: .infinity, alignment: .leading)
        KChatCloseButton(theme: theme, label: mode?.closeLabel ?? "") { actions.onDock("modeClose") }
      }
      KField(
        theme: theme,
        controller: driver.prompt,
        placeholder: mode?.promptPlaceholder ?? "",
        style: .system(15.5),
        axis: .horizontal,
        lines: nil,
        returnSends: false,
        onChange: { actions.onPromptText($0) },
        onFocus: { focused in
          if focused { shutPanels() }
        }
      )
      .frame(maxHeight: showsPrompt ? nil : 0, alignment: .top)
      .clipped()
      .opacity(showsPrompt ? 1 : 0)
      .disabled(!showsPrompt)
      .accessibilityHidden(!showsPrompt)
      if let text = mode?.promptText, !text.isEmpty {
        Text(text)
          .kText(.system(15.5, lineHeight: 1.4))
          .foregroundStyle(theme.ink)
          .fixedSize(horizontal: false, vertical: true)
      }
    }
    .padding(12)
    .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(theme.lav2))
    .overlay(RoundedRectangle(cornerRadius: 16, style: .circular).strokeBorder(theme.ind, lineWidth: 1.5))
    // from the prompt field or the x: escape closes the mode (hidden, nothing in it takes focus)
    .accessibilityAction(.escape) { actions.onDock("modeClose") }
    .padding(.bottom, 8)
    .frame(maxHeight: shown ? nil : 0, alignment: .top)
    .clipped()
    .opacity(shown ? 1 : 0)
    .allowsHitTesting(shown)
    .accessibilityHidden(!shown)
  }

  // MARK: 7. composer, gone, expired

  @ViewBuilder
  private var composerRow: some View {
    if dock.hasTools {
      roomComposer
    } else {
      letterComposer
    }
  }

  /// The pen-pal chat's reply bar (A2): only words and emoji leave it.
  private var letterComposer: some View {
    KReplyBar(
      theme: theme,
      controller: driver.body,
      placeholder: dock.placeholder,
      hint: dock.hint,
      showsHint: bodyFocused,
      sendState: driver.canSend ? .enabled : .disabled,
      sendLabel: dock.sendLabel,
      emojiLabel: dock.emojiLabel,
      // owner, 2026-10-19: a pen-pal letter leaves by the bar's send key; Return is a new line
      // (only the kindreds bar sends on the keyboard)
      returnSends: false,
      autocapitalize: dock.autocapitalize,
      onChange: { actions.onText($0) },
      onSubmit: { send($0) },
      onFocus: { focused in
        if bodyFocused != focused { bodyFocused = focused }
        actions.onFocus(focused)
      },
      onSend: { send() }
    )
    // 16 from either edge (the dock's 12 and 4 more); the bar's hard shadow hangs 2 right and below
    .padding(.horizontal, 4)
    .padding(.bottom, KReplyBar.shadowOffset)
  }

  /// A room's Kindreds bar (B): the ideas key, the capsule, the +.
  private var roomComposer: some View {
    KKindredBar(
      theme: theme,
      controller: driver.body,
      placeholder: dock.placeholder,
      autocapitalize: dock.autocapitalize,
      emojiLabel: dock.emojiLabel,
      ideasLabel: dock.ideasLabel,
      plusLabel: dock.plusLabel,
      plusCloseLabel: dock.plusCloseLabel,
      ideasOpen: driver.ideasOpen,
      trayOpen: driver.trayOpen,
      onIdeas: toggleIdeas,
      onPlus: togglePlus,
      onCloseIdeas: closeIdeas,
      onCloseTray: { withAnimation(trayAnimation) { driver.trayOpen = false } },
      onEscapeOut: { actions.onDock("back") },
      onChange: { actions.onText($0) },
      onSubmit: { send($0) },
      onFocus: { focused in
        // the keyboard takes the tray's place and the bubble's (the emoji key gives it too)
        if focused { shutPanels() }
        actions.onFocus(focused)
      }
    )
    // the icons 17 from either edge, in line with the 16 gutter: the dock's 12 less 4 puts the
    // 44 targets 8 from it, and a 26 icon sits 9 inside its target
    .padding(.horizontal, -4)
  }

  /// The keyboard came up: the tray and the bubble go (Prompt 3: the panels shut each other).
  private func shutPanels() {
    if driver.trayOpen { withAnimation(trayAnimation) { driver.trayOpen = false } }
    if driver.ideasOpen { closeIdeas() }
  }

  private func togglePlus() {
    if driver.trayOpen {
      withAnimation(trayAnimation) { driver.trayOpen = false }
    } else {
      // choosing something to leave is not something you do mid-sentence; the bubble goes too
      driver.blurAll()
      if driver.ideasOpen { closeIdeas() }
      withAnimation(trayAnimation) { driver.trayOpen = true }
    }
  }

  /// The ideas key: the bubble, which lets go of the keyboard and shuts the tray (Prompt 3), or
  /// closes it.
  private func toggleIdeas() {
    if driver.ideasOpen {
      closeIdeas()
      return
    }
    driver.blurAll()
    if driver.trayOpen { withAnimation(trayAnimation) { driver.trayOpen = false } }
    withAnimation(ideasAnimation) { driver.ideasOpen = true }
  }

  private func closeIdeas() {
    withAnimation(.easeOut(duration: 0.2)) { driver.ideasOpen = false }
  }

  /// USE IT: the bubble goes at once; TS puts the sentence in the field and gives it the keyboard.
  private func useIdea() {
    closeIdeas()
    actions.onDock("ideaUse")
  }

  private var expiredCard: some View {
    InkCard(theme: theme, variant: .me, spacing: 8) {
      HStack(spacing: 8) {
        KChatBird(theme: theme, ref: birds.expired, size: 20)
        Text(dock.expiredLabel)
          .kText(.mono(9, .semibold, tracking: 0.12))
          .foregroundStyle(theme.mute)
      }
      .accessibilityElement(children: .combine)
      Text(dock.expiredBody)
        .kText(.system(15, lineHeight: 1.47))
        .foregroundStyle(theme.ink)
        .fixedSize(horizontal: false, vertical: true)
      KSecondaryButton(theme: theme, title: dock.expiredButton) {
        actions.onDock("rekindle")
      }
      .padding(.top, 4)
    }
    // the card's hard shadow hangs 5 outside, right and below
    .padding(.trailing, InkCardVariant.me.shadowOffset)
    .padding(.bottom, InkCardVariant.me.shadowOffset)
  }
}

/// VoiceOver's escape on a view only while there is something for it to close; otherwise the
/// view has none, and escape goes on up to the stack's back.
struct KChatEscape: ViewModifier {
  let enabled: Bool
  let action: () -> Void

  @ViewBuilder
  func body(content: Content) -> some View {
    if enabled {
      content.accessibilityAction(.escape, action)
    } else {
      content
    }
  }
}

/// Its one subview (a scroll view) at its content's height, up to `cap`; beyond that the subview
/// gets `cap` and scrolls. A ScrollView asked for its ideal height reports its content's.
struct KChatCappedHeight: Layout {
  let cap: CGFloat

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    guard let subview = subviews.first else { return .zero }
    let natural = subview.sizeThatFits(ProposedViewSize(width: proposal.width, height: nil))
    return CGSize(width: proposal.width ?? natural.width, height: min(natural.height, cap))
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    subviews.first?.place(at: bounds.origin, anchor: .topLeading, proposal: ProposedViewSize(width: bounds.width, height: bounds.height))
  }
}

/// A × in mute with a 44pt target that doesn't push its row taller.
struct KChatCloseButton: View {
  let theme: KTheme
  let label: String
  let action: () -> Void

  var body: some View {
    SwiftUI.Button(action: action) {
      KLineIcon(.close, size: 14, lineWidth: 2, color: theme.mute)
        .frame(width: 44, height: 44)
        .contentShape(Rectangle())
    }
    .buttonStyle(KFloatPressStyle())
    .padding(.vertical, -12)
    .padding(.horizontal, -10)
    .accessibilityLabel(label)
  }
}

/// Wren's snapshot at a point size, or the SF Symbol bird while there is none yet (the dock
/// never waits on a capture).
struct KChatBird: View {
  let theme: KTheme
  let ref: KImageRef?
  let size: CGFloat

  var body: some View {
    Group {
      if ref != nil {
        KImage(ref, size: CGSize(width: size, height: size), contentMode: .fit, placeholder: .clear)
      } else {
        SwiftUI.Image(systemName: "bird")
          .font(.system(size: size * 0.75, weight: .regular))
          .foregroundStyle(theme.ink)
          .frame(width: size, height: size)
      }
    }
    .accessibilityHidden(true)
  }
}
