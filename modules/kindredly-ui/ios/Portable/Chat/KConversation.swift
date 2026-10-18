// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE CONVERSATION (10a step 5, batch 1): the whole screen of a room with a kindred and of a
 pen-pal chat, in the screen's ONE Host. src/app/room/[id].tsx and src/app/chat/[id].tsx draw it
 through Adapters/KConversationView.swift; the rows are KChatRows.swift, the dock KDock.swift
 (its bars Kit/KReplyBar.swift and KKindredBar.swift), the + tray KTraceTray.swift.

 THE HEADER (chat composers, 2026-10-18): the pen-pal chat before names (A2) and the kindreds
 chat (B) draw their own (KChatHeader.swift), the first thing in the stack, padded down by the
 status bar's room (topInset), with the list, the dock and the tray under it. A pen-pal chat
 already revealed keeps a React Native header above the Host (header nil).

 THE + TRAY (B) comes up under the dock, which rides 12 above it; while it is open a dim lies
 over the list (KChatTrayScrim) and a tap on it closes the tray. The tray draws under the dock
 (zIndex), so its soft shadow shows only in the gap above it, as the prototype's does, and the
 dock is see-through meanwhile (the page under both is the same colour).

 LAYOUT (spike-results.md, binding):
 - The dock sits UNDER the list in a VStack, never in a safeAreaInset (iOS 18 counts an inset
   dock twice and scrollTo(edge: .bottom) lands a dock-height past the end). The Host keeps the
   keyboard's safe area (ignoreSafeArea "container"), so the stack shrinks and the dock rides the
   keyboard; the tray takes the keyboard's place under the dock.
 - The keyboard's overlap is measured as the height of a reader that ignores the keyboard less
   the height of one that respects it (pattern 5); the dock pads 10 above it, the home
   indicator's inset when it is down.

 THE LIST: a ScrollView over a LazyVStack of the owner's render window (80 items, growing by 80
 near the top, at most 160: the bench), each row Equatable.
 - Open at the newest: .defaultScrollAnchor(.bottom, for: .initialOffset), then a settle to the
   real end a runloop and a frame after the first rows appear (pattern 3: the initial anchor
   lands short while the last rows' heights are only estimated). The Host mounts at once with an
   empty list; the settle runs when the first rows arrive.
 - Follow the end only while at it (pattern 4): the .sizeChanges anchor is .bottom while the end
   is within 60pt (KScrollModel) and the window sits at the newest, nil otherwise. The keyboard,
   the tray, a growing composer and a translation opening keep the newest line in view while at
   the bottom; a line arriving while the reader is up in the history moves nothing. The owner
   asks to follow a new line explicitly (scroll request onlyAtBottom), and to go to the end on
   its own send. Whether that request may move the list is decided by where the list stood when
   the new row arrived (atBottomAtAppend, noted as items.last changes, before the new row's
   layout), not when the request lands: by then a tall row the anchor didn't follow has already
   pushed the end more than 60pt away, which is exactly the case the request is for.
 - Keep the place when older items go in above (pattern 6): an id-based ScrollPosition over
   .scrollTargetLayout(), anchored on the row nearest the dock (anchor .bottom), so the rows on
   screen stay put; a window that slides back toward the newest doesn't follow the end either.
   (Verify on a device: the spike measured ~45pt with the top anchor.)
 - Near the top (600pt) asks for older items once per arrival at the top; the end of a window
   that slid away from the newest asks for newer ones.
 - THE GUTTERS (16) pad each row, never the LazyVStack: the stack spans the scroll view's full
   width. Padded around the stack, every height change of the list (the keyboard rising, the
   ideas bubble, the + tray) left it scrolled 16 to the left until the next drag: re-anchoring
   the bottom after a size change put the scroll target layout's leading edge at the viewport's,
   and the padding had moved that edge 16 in (measured 2026-10-18 on the iPhone 17 Pro simulator,
   iOS 26.5: contentOffset.x 16 with a 402 content in a 402 container). Content margins instead
   of padding shift it the same way (to the margin's 0).
 - A quote jump scrolls the item to the centre and lights it (.5 for 1.4s) and gives it
   VoiceOver's focus once the scroll has settled (lit alone is only visual); an item outside the
   window is jumped to as soon as the owner's wider window arrives.
 - A drag dismisses the keyboard interactively; a tap on the list's empty space puts it away too
   (it used to: React Native's default), and closes the ideas bubble. Only empty space: the tap
   target sits behind the rows, so ANSWER TO OPEN, a quote, the voice disc and every menu keep
   the keyboard (and the bubble) where they are.
 */
public struct KConversation: View {
  private let theme: KTheme
  private let variant: KChatVariant
  private let items: [KChatItem]
  private let hasOlder: Bool
  private let hasNewer: Bool
  private let dock: KChatDock
  private let strings: KChatStrings
  private let birds: KChatBirds
  private let bottomInset: CGFloat
  private let header: KChatHeaderModel?
  private let topInset: CGFloat
  private let driver: KConversationDriver
  private let actions: KConversationActions

  /// only the ends and the near-top matter here: offset is capped at 0 and quantized to 1000, so
  /// it never publishes while the list scrolls
  @StateObject private var chrome = KScrollModel(offsetCap: 0, quantum: 1000, atBottomWithin: 60, nearTopWithin: 600)
  @State private var position = ScrollPosition(idType: String.self)
  @State private var box = KConversationBox()
  /// the item lit after a quote jump
  @State private var lit: String?
  /// VoiceOver's focus: a quote jump moves it to the line it lands on
  @AccessibilityFocusState private var voFocus: String?

  /// - Parameters:
  ///   - items: the render window, oldest first; the list opens at the last
  ///   - hasOlder: there are items before the window (near the top asks for them)
  ///   - hasNewer: the window has slid away from the newest (its end asks for them)
  ///   - dock: everything above and in place of the composer, and the tray's choices
  ///   - strings: the words the rows share
  ///   - birds: Wren's three dock snapshots
  ///   - bottomInset: the home indicator's inset (the Host ignores it)
  ///   - header: the pen-pal chat's own header, or nil (the React Native one stands above)
  ///   - topInset: the status bar's room over the header (the Host ignores it)
  ///   - driver: the fields, the live state, scroll requests (lives as long as the screen)
  ///   - actions: where everything the conversation hears goes
  public init(
    theme: KTheme,
    variant: KChatVariant,
    items: [KChatItem],
    hasOlder: Bool,
    hasNewer: Bool,
    dock: KChatDock,
    strings: KChatStrings,
    birds: KChatBirds,
    bottomInset: CGFloat,
    header: KChatHeaderModel? = nil,
    topInset: CGFloat = 0,
    driver: KConversationDriver,
    actions: KConversationActions
  ) {
    self.theme = theme
    self.variant = variant
    self.items = items
    self.hasOlder = hasOlder
    self.hasNewer = hasNewer
    self.dock = dock
    self.strings = strings
    self.birds = birds
    self.bottomInset = bottomInset
    self.header = header
    self.topInset = topInset
    self.driver = driver
    self.actions = actions
  }

  /// the .sizeChanges anchor: the end, only while at it and the window is at the newest
  private var followsEnd: Bool {
    chrome.isAtBottom && !hasNewer && !box.windowMoving
  }

  public var body: some View {
    GeometryReader { geo in
      VStack(spacing: 0) {
        if let header {
          KChatHeader(theme: theme, model: header, topInset: topInset, actions: actions)
        }
        list(width: max(0, geo.size.width - 2 * Self.gutter))
          .overlay { KChatTrayScrim(theme: theme, driver: driver) }
        KChatDockView(theme: theme, variant: variant, dock: dock, birds: birds, bottomInset: bottomInset, surfaceHeight: geo.size.height, driver: driver, actions: actions)
        KChatTray(theme: theme, traces: dock.traces, title: dock.trayTitle, bottomInset: bottomInset, driver: driver, actions: actions)
          .zIndex(-1)
      }
      .background { keyboardProbe }
    }
    .background { theme.bg.ignoresSafeArea() }
    .onReceive(driver.$scrollRequest) { request in
      guard let request, request.serial > box.scrollSerial else { return }
      box.scrollSerial = request.serial
      perform(request)
    }
    .onChange(of: chrome.isAtBottom, initial: true) { _, atBottom in
      actions.onBottomChange(atBottom)
      if atBottom && hasNewer { askForNewer() }
    }
    .onChange(of: chrome.isNearTop) { _, near in
      if near && hasOlder { actions.onReachTop() }
    }
    .onChange(of: items.last?.key) { _, _ in
      // where the list stood before the new row is laid out (a follow request reads it)
      noteAppend()
      // the window has moved (or a line arrived): what the slide back asked for is in
      DispatchQueue.main.async { box.windowMoving = false }
      applyPendingJump()
    }
    .onChange(of: items.first?.key) { _, _ in
      applyPendingJump()
    }
    .onChange(of: items.isEmpty) { _, empty in
      if !empty && !box.settled { settleAtEnd() }
    }
    .onAppear {
      if !items.isEmpty && !box.settled { settleAtEnd() }
    }
  }

  static let gutter: CGFloat = 16

  private func list(width: CGFloat) -> some View {
    ScrollView {
      LazyVStack(spacing: 0) {
        ForEach(items) { item in
          KChatRow(
            theme: theme,
            variant: variant,
            item: item,
            first: item.key == items.first?.key,
            lit: lit == item.key,
            width: width,
            strings: strings,
            driver: driver,
            actions: actions,
            voFocus: $voFocus
          )
          .equatable()
          // the gutters on each row, never around the stack (see THE GUTTERS above)
          .padding(.horizontal, Self.gutter)
        }
      }
      .scrollTargetLayout()
      .padding(.top, 12)
      .padding(.bottom, 12)
      // behind the rows, gutters and gaps: a tap on empty space, never on a row's controls
      .background { dismissTarget }
    }
    .scrollPosition($position, anchor: .bottom)
    .defaultScrollAnchor(.bottom, for: .initialOffset)
    .defaultScrollAnchor(followsEnd ? UnitPoint.bottom : nil, for: .sizeChanges)
    .scrollDismissesKeyboard(.interactively)
    .kScrollChrome(chrome)
    // and under a conversation shorter than the screen
    .background { dismissTarget }
  }

  /// Empty space that puts the keyboard away when tapped, and the ideas bubble ("or elsewhere":
  /// Prompt 4).
  private var dismissTarget: some View {
    Color.clear
      .contentShape(Rectangle())
      .onTapGesture {
        if driver.body.isFocused || driver.prompt.isFocused { driver.blurAll() }
        if driver.ideasOpen { withAnimation(.easeOut(duration: 0.2)) { driver.ideasOpen = false } }
      }
      .accessibilityHidden(true)
  }

  /// The keyboard's overlap: a reader that ignores the keyboard's safe area less one that
  /// respects it (spike pattern 5; the Host ignores every other safe area).
  private var keyboardProbe: some View {
    ZStack {
      GeometryReader { full in
        Color.clear
          .onChange(of: full.size.height, initial: true) { _, height in
            box.fullHeight = height
            measureKeyboard()
          }
      }
      .ignoresSafeArea(.keyboard)
      GeometryReader { kept in
        Color.clear
          .onChange(of: kept.size.height, initial: true) { _, height in
            box.keptHeight = height
            measureKeyboard()
          }
      }
    }
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }

  private func measureKeyboard() {
    guard box.fullHeight > 0, box.keptHeight > 0 else { return }
    driver.setKeyboard(box.fullHeight - box.keptHeight)
  }

  /// The end of a window that slid away from the newest: ask for the newer items, and don't let
  /// the .sizeChanges anchor follow them in (the rows on screen stay where they are).
  private func askForNewer() {
    box.windowMoving = true
    box.windowMoveSerial += 1
    let serial = box.windowMoveSerial
    actions.onReachBottom()
    // if nothing arrives, the anchor follows the end again
    DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
      if box.windowMoveSerial == serial { box.windowMoving = false }
    }
  }

  // MARK: scrolling

  /// Puts the list at its real end after the first layouts: a runloop and a frame later, because
  /// the second pass can still change the last rows' heights (spike pattern 3, KLab.settleAtEnd).
  private func settleAtEnd() {
    box.settled = true
    DispatchQueue.main.async {
      position.scrollTo(edge: .bottom)
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
        position.scrollTo(edge: .bottom)
      }
    }
  }

  /// Notes, as a new last row arrives and before its layout reaches the scroll geometry, whether
  /// the list was at its end: a follow request (onlyAtBottom) is decided on that, for a second.
  private func noteAppend() {
    box.atBottomAtAppend = chrome.isAtBottom && !hasNewer
    box.appendSerial += 1
    let serial = box.appendSerial
    DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
      if box.appendSerial == serial { box.atBottomAtAppend = false }
    }
  }

  private func perform(_ request: KConversationDriver.ScrollRequest) {
    // at the end now, or when the row this request follows arrived (a tall row the .sizeChanges
    // anchor didn't follow has already taken the end out of reach)
    let wasAtEnd = (chrome.isAtBottom || box.atBottomAtAppend) && !hasNewer
    if request.onlyAtBottom && !wasAtEnd { return }
    switch request.target {
    case .top:
      move(request.animated) { position.scrollTo(edge: .top) }
    case .end:
      move(request.animated) { position.scrollTo(edge: .bottom) }
      let follow = request.onlyAtBottom
      // and once more after the new row's real height is in (it was only estimated); a follow
      // only while the reader hasn't put a finger on the list since
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
        if !follow || (!chrome.isInteracting && (chrome.isAtBottom || box.atBottomAtAppend)) {
          position.scrollTo(edge: .bottom)
        }
        if follow { box.atBottomAtAppend = false }
      }
    case let .item(key):
      guard items.contains(where: { $0.key == key }) else {
        // outside the window: the owner is widening it; jump when it arrives
        box.pendingJump = request
        return
      }
      box.pendingJump = nil
      move(request.animated) { position.scrollTo(id: key, anchor: .center) }
      if request.highlight {
        light(key)
        // VoiceOver goes where the eye does, once the row is on screen
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { voFocus = key }
      }
    }
  }

  private func applyPendingJump() {
    guard let pending = box.pendingJump, case let .item(key) = pending.target,
          items.contains(where: { $0.key == key }) else { return }
    box.pendingJump = nil
    // a runloop later, so the new rows are laid out first
    DispatchQueue.main.async { perform(pending) }
  }

  private func move(_ animated: Bool, _ change: @escaping () -> Void) {
    if animated {
      withAnimation(.easeOut(duration: 0.25)) { change() }
    } else {
      change()
    }
  }

  /// The quoted line, lit for a moment (a plain fade, with or without Reduce Motion).
  private func light(_ key: String) {
    withAnimation(.easeOut(duration: 0.2)) { lit = key }
    DispatchQueue.main.asyncAfter(deadline: .now() + KChatMotion.litSeconds) {
      if lit == key {
        withAnimation(.easeOut(duration: 0.3)) { lit = nil }
      }
    }
  }
}

/// What the conversation keeps without redrawing for it.
private final class KConversationBox {
  /// the two keyboard probes' heights
  var fullHeight: CGFloat = 0
  var keptHeight: CGFloat = 0
  /// the last scroll request applied
  var scrollSerial = 0
  /// a quote jump to an item the window doesn't hold yet
  var pendingJump: KConversationDriver.ScrollRequest?
  /// the first rows have been settled at the end
  var settled = false
  /// a slide back toward the newest is on its way: don't follow its rows to the end
  var windowMoving = false
  var windowMoveSerial = 0
  /// the list was at its end when the last new row arrived (for a second, or until the follow
  /// request it is for has run)
  var atBottomAtAppend = false
  var appendSerial = 0
}
