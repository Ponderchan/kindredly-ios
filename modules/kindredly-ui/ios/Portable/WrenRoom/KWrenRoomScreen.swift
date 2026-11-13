// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 WREN'S ROOM, IN SWIFT (2026-10-27; binary, behind the "wrenroom" switch, off by default): the one
 room everybody has, the chat with the courier herself. src/app/room/wren.tsx draws it through
 Adapters/KWrenRoomView.swift (src/screens/wren-room/WrenRoomNative.tsx); its React Native room
 stays as the switch's fallback. Every word, every row, what is matched on the phone, what goes to
 the makers and every navigation are TS's (screens/wren-room: wren-room-model, useWrenRoom); this
 draws the page and reports the edits and the taps.

   ‹  (Wren✓)  Wren                         the header on the page: the one KBackChevron (12 in,
              KINDREDLY'S COURIER            centred in the first 44), her official face at 46 (her
   ────────────────────────────────────      snapshot on a soft2 disc, the blue tick), 11 to her
                                             name (system 600 19, ink) and her role (mono 9 at
                 OCT 14                      .12em, mute, in capitals); padding 3 10 9 56; a 1pt
   WREN · EVENT                              line under it
   Her words, in the Letter font…            THE TRANSCRIPT (padding 20 22 12): a day rule over a
   ┌───────────────┐                         day's first item (mono 9 at .16em, mute, centred, 22
   │  (the reel)   │                         above it but the first, 16 under it); one speaker label
   │ How letters…  │                         per run of the same voice (mono 600 9.5 at .13em: hers
   │ You write to… │                         in ind, yours in mute; 16 above it unless under a day
   │ Write a letter│                         rule, 5 under it); the words in the reader's Letter
   └───────────────┘                         font 16/24 (yours in sub, hers in ink), 3 under them;
   Not it? Send it to the makers ›           a picture you sent at 62% of the column, 3:4, on
                                             soft2 (a tap opens it); a post's other link "Open ›"
   HOW THINGS WORK                           (system 600 12 in ind).
   (How letters travel) (…) (More)           THE CARDS (a guide she answered with, a release's
   Read by the people who make Kindredly…    "what's new"): sf, corners 18, a 1pt line edge, the
                                             reel square on top (a React Native island, below), the
   [A BUG ×]                                 title (system 700 17, ink) and one paragraph (system
   (+)  ( Write to Wren…            (↑) )    15/21, sub) padded 12 14, and the button under a 1pt
                                             line (system 600 15, ind; soft2 while pressed). Under a
 guide she guessed from a question: "Not it?" in mute mono 10.5 and "Send it to the makers ›" in
 ind, 8 under the card.
 THE CHIPS: HOW THINGS WORK (mono 9 at .14em, mute), then the guides as capsules (system 600 13 in
 ind on lav2 with a 1.5 ind edge, padding 6 11) wrapping 8 apart, and More in sub with a 1.5 line
 edge until it is pressed. THE MAIL NOTE (mono 9.5/15 at .06em, mute), 18 under them, once there
 is mail. EMPTY: her curious official face at 64 and wo.empty in the Letter font's italic 14.5/22
 in sub, centred, at most 260 wide, 28 from the top.

 THE DOCK under the list (never in a safeAreaInset, KConversation's rule): the mode chip while
 a bug or an idea is being written (the mode in mono 600 10 at .1em and a × in ind, on lav2 with a
 1.5 ind edge), 18 in and 8 above the row; then the ⊕ (40 round: the 12pt + at 1.8 in ink, or
 turned 45° in ind on the lav disc while its tray is open) and the field: a soft pill (corners 20)
 holding the words in the reader's Letter font 16 (one line growing to four, Return sends while
 they may go) and, once anything is typed, the 30 ind disc with the up arrow in the page colour at
 its right end (at .35 while the words can't go yet). 14 in, 14 above the keyboard or the tray, the
 home indicator's inset more when both are down.

 THE ⊕'S TRAY is the kindred room's (KChatTray, on KConversationDriver): a picture, a bug, an idea
 on their mood cards, in the keyboard's place. The ⊕ lets go of the keyboard and raises it in one
 move; the field taking the keyboard lowers it; a card closes it and goes to TS (a bug or an idea
 sets the mode and gives the field the keyboard; a picture opens the picker). No dim over the list,
 as the React Native room has none.

 THE LIST follows its end only while at it (the .sizeChanges anchor is the bottom while the end is
 within 60pt), so the keyboard, the tray and a growing field keep the newest line in sight there,
 and a reel finishing its layout or More opening never yanks someone reading further up. It opens
 at the newest (settled once the first rows arrive). TS asks for the end for the reader's own new
 line (their mail, her answer, a guide asked for), wherever they were (scrollTo end). A drag down
 takes the keyboard with it.

 THE REELS stay React Native (the guide reels and the news reel are drawn from the product's own
 React Native parts): each card's square is a named island (`reel(slot)`, the adapter's KSlot),
 which TS sizes to the card's inside. The list is a plain VStack, never lazy: islands can't live in
 a LazyVStack row (Adapters/KSlotView.swift). The island is interactive (a tap starts the reel
 over, as before) and VoiceOver reads it as the React Native button it is. Batch 3 (behind the
 "reels" switch, off by default): a card whose record carries a reel (KWrenRoomCard.reel) draws
 it here with the Swift player (Portable/Reels KReelSquare) and has no island.

 Wren is never drawn here: her faces are TS's snapshots of the official bird (lib/bird-images
 "official" and "officialCurious"), set on the disc as her Kindreds row sets them (KPersonBirdFace).

 VOICEOVER: the header is one heading; each line is read with its speaker; a picture is "Open
 photo"; the ⊕, the arrow and the mode's × are named by TS; escape on the tray closes it.
 REDUCE MOTION: the + doesn't turn, the tray fades (KChatMotion.tray).
 */

/// A big card in the transcript: a guide she answered with, or a release's "what's new".
public struct KWrenRoomCard: Equatable, Sendable {
  /// the reel square's island, by name
  public let slot: String
  public let title: String
  /// one paragraph
  public let body: String
  /// the button under it
  public let cta: String
  /// "Not it?" under a guide she guessed from a question; "" for none
  public let notIt: String
  /// "Send it to the makers", the link after "Not it?"
  public let sendOn: String
  /// batch 3 (behind "reels"): the reel drawn here in Swift (Portable/Reels KReelSquare) instead
  /// of the slot's React Native island; nil keeps the island
  public let reel: KReelSpec?

  public init(slot: String, title: String, body: String, cta: String, notIt: String, sendOn: String, reel: KReelSpec? = nil) {
    self.slot = slot
    self.title = title
    self.body = body
    self.cta = cta
    self.notIt = notIt
    self.sendOn = sendOn
    self.reel = reel
  }
}

/// One item of the transcript, everything already worded by TS (wren-room-model wrenRoomRows).
public struct KWrenRoomRow: Identifiable, Equatable, Sendable {
  public let key: String
  /// the day rule over it, "" for none
  public let dayLabel: String
  /// the first row: its day rule has no space above it
  public let first: Bool
  /// the speaker label over it, "" for none
  public let label: String
  /// the label is yours (mute, not ind)
  public let labelMine: Bool
  /// the label sits right under a day rule
  public let labelUnderDay: Bool
  /// a question she answered on the phone, drawn as yours, "" for none
  public let question: String
  /// her label over that answer, "" for none
  public let answerLabel: String
  /// the words, "" for none
  public let body: String
  /// the words are yours (sub, not ink)
  public let mine: Bool
  /// a picture you sent stands in place of the words
  public let hasPhoto: Bool
  /// its picture, nil while the link is being signed
  public let photo: KImageRef?
  /// a post's link that isn't a reel ("Open ›"), "" for none
  public let link: String
  public let card: KWrenRoomCard?

  public var id: String { key }

  public init(key: String, dayLabel: String, first: Bool, label: String, labelMine: Bool, labelUnderDay: Bool, question: String, answerLabel: String, body: String, mine: Bool, hasPhoto: Bool, photo: KImageRef?, link: String, card: KWrenRoomCard?) {
    self.key = key
    self.dayLabel = dayLabel
    self.first = first
    self.label = label
    self.labelMine = labelMine
    self.labelUnderDay = labelUnderDay
    self.question = question
    self.answerLabel = answerLabel
    self.body = body
    self.mine = mine
    self.hasPhoto = hasPhoto
    self.photo = photo
    self.link = link
    self.card = card
  }
}

/// A guide chip.
public struct KWrenRoomChip: Identifiable, Equatable, Sendable {
  public let id: String
  public let title: String

  public init(id: String, title: String) {
    self.id = id
    self.title = title
  }
}

/// Everything the page shows, worded by TS.
public struct KWrenRoomContent: Equatable, Sendable {
  public var name = ""
  /// her role, in capitals
  public var role = ""
  public var backLabel = ""
  /// her official snapshot (the header's face, where `avatar` is nil)
  public var bird: KImageRef?
  /// her avatar as Kindreds' list shows it, the whole round (owner, 2026-11-13, opening her room
  /// from the list: "官方wren 头像点进去咋还是老的"); nil on an older bundle: the snapshot
  public var avatar: KImageRef?
  /// her curious official snapshot (the empty room)
  public var emptyBird: KImageRef?
  public var emptyLine = ""
  public var rows: [KWrenRoomRow] = []
  /// HOW THINGS WORK
  public var chipsHead = ""
  public var chips: [KWrenRoomChip] = []
  /// More, "" once every guide shows
  public var moreLabel = ""
  /// the line about where your words go, "" for none (no mail yet)
  public var mailNote = ""
  /// VoiceOver's name for a picture
  public var photoOpen = ""
  public var placeholder = ""
  /// A BUG / AN IDEA while one is being written, "" for none
  public var modeLabel = ""
  /// VoiceOver's name for the mode's ×
  public var modeCloseLabel = ""
  /// VoiceOver's names for the ⊕, shut and open
  public var plusLabel = ""
  public var plusCloseLabel = ""
  /// VoiceOver's name for the arrow
  public var sendLabel = ""
  /// the ⊕'s tray: a picture, a bug, an idea
  public var traces: [KChatTrace] = []
  /// a card's width, its 1pt edge included (the reel is this less 2, square)
  public var cardWidth: CGFloat = 0

  public init() {}
}

/// Where everything the page hears goes. One object for the life of the page.
public final class KWrenRoomActions {
  public var onBack: () -> Void = {}
  /// the reader's edits in the field (never a setText)
  public var onText: (String) -> Void = { _ in }
  /// Return or the arrow, with the words, only while they may go
  public var onSend: (String) -> Void = { _ in }
  /// the mode's ×
  public var onModeClose: () -> Void = {}
  /// a card of the ⊕'s tray: photo, bug, idea
  public var onHand: (String) -> Void = { _ in }
  /// a picture you sent, by its row's key
  public var onPhoto: (String) -> Void = { _ in }
  /// a post's "Open ›", by its row's key
  public var onLink: (String) -> Void = { _ in }
  /// a card's button, by its row's key
  public var onCardCta: (String) -> Void = { _ in }
  /// "Not it? Send it to the makers ›", by its row's key
  public var onNotIt: (String) -> Void = { _ in }
  /// a guide chip, by its id
  public var onChip: (String) -> Void = { _ in }
  public var onMore: () -> Void = {}
  /// the channel the kindred room's tray reports on (KChatTray): its cards come out as onHand
  public let tray = KConversationActions()

  public init() {
    tray.onTrace = { [weak self] key in self?.onHand(key) }
  }
}

/// What changes as the reader types: whether the field holds anything (the arrow shows).
public final class KWrenRoomLive: ObservableObject {
  @Published public var hasText = false

  public init() {}
}

public struct KWrenRoomScreen<Reel: View>: View {
  private let theme: KTheme
  private let content: KWrenRoomContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let driver: KConversationDriver
  private let live: KWrenRoomLive
  private let actions: KWrenRoomActions
  private let reel: (String) -> Reel

  /// only the end matters here: offset capped at 0 and quantized, so it never publishes on a scroll
  @StateObject private var chrome = KScrollModel(offsetCap: 0, quantum: 1000, atBottomWithin: 60, nearTopWithin: 0)
  @State private var position = ScrollPosition(idType: String.self)
  @State private var box = KWrenRoomBox()

  /// the transcript's gutters (the React Native room's 22)
  static var gutter: CGFloat { 22 }

  /// - Parameters:
  ///   - topInset: the status bar's room over the header (the Host ignores the safe area)
  ///   - bottomInset: the home indicator's inset
  ///   - driver: the field, canSend, the tray, the keyboard's height, scroll requests
  ///   - live: whether the field holds anything
  ///   - reel: a card's reel island by its slot name
  public init(
    theme: KTheme,
    content: KWrenRoomContent,
    topInset: CGFloat,
    bottomInset: CGFloat,
    driver: KConversationDriver,
    live: KWrenRoomLive,
    actions: KWrenRoomActions,
    @ViewBuilder reel: @escaping (String) -> Reel
  ) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.driver = driver
    self.live = live
    self.actions = actions
    self.reel = reel
  }

  public var body: some View {
    GeometryReader { geo in
      VStack(spacing: 0) {
        header
        list(column: max(0, geo.size.width - 2 * Self.gutter))
        if !content.modeLabel.isEmpty {
          modeChip
        }
        KWrenRoomDock(theme: theme, content: content, bottomInset: bottomInset, driver: driver, live: live, actions: actions)
        KChatTray(theme: theme, traces: content.traces, title: "", bottomInset: bottomInset, driver: driver, actions: actions.tray)
          .zIndex(-1)
      }
      .background { keyboardProbe }
    }
    .background { theme.bg.ignoresSafeArea() }
    .onReceive(driver.$scrollRequest) { request in
      guard let request, request.serial > box.scrollSerial else { return }
      box.scrollSerial = request.serial
      if case .end = request.target { toEnd(animated: request.animated) }
    }
    .onChange(of: content.rows.isEmpty) { _, empty in
      if !empty && !box.settled { settleAtEnd() }
    }
    .onAppear {
      if !content.rows.isEmpty && !box.settled { settleAtEnd() }
    }
  }

  // MARK: the header

  private var header: some View {
    VStack(spacing: 0) {
      headerRow
        .padding(.top, topInset)
      theme.line
        .frame(height: 1)
        .accessibilityHidden(true)
    }
    .background(theme.bg)
    .dynamicTypeSize(...DynamicTypeSize.accessibility2)
  }

  /// her face in the header: the avatar the list shows, filling the round, with the official badge;
  /// the snapshot on a disc where the bundle sends none
  @ViewBuilder private var headerFace: some View {
    if let avatar = content.avatar {
      KImage(avatar, size: CGSize(width: 46, height: 46), contentMode: .fill, placeholder: .clear)
        .frame(width: 46, height: 46)
        .clipShape(Circle())
        .overlay(alignment: .bottomTrailing) {
          KOfficialBadge(theme: theme, size: KFace.badgeSize(for: 46), ground: theme.bg)
            .offset(x: 1, y: 1)
        }
        .accessibilityHidden(true)
    } else {
      KPersonBirdFace(theme: theme, bird: content.bird, size: 46, dim: false, badge: true)
    }
  }

  private var headerRow: some View {
    ZStack(alignment: .topLeading) {
      HStack(spacing: 11) {
        headerFace
        VStack(alignment: .leading, spacing: 2) {
          Text(content.name)
            .kText(.system(19, .semibold))
            .foregroundStyle(theme.ink)
            .lineLimit(1)
          Text(content.role)
            .kText(.mono(9, .medium, tracking: 1.1 / 9))
            .foregroundStyle(theme.mute)
            .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(.leading, 56)
      .padding(.trailing, 10)
      .padding(.top, 3)
      .padding(.bottom, 9)
      .accessibilityElement(children: .combine)
      .accessibilityAddTraits(.isHeader)
      // the app's one back chevron, at Settings' place: its 44 target 8 in, the box centred in
      // the first 44 below the safe area (the React Native room's BackChevron)
      KBackChevron(theme: theme, label: content.backLabel) { actions.onBack() }
        .padding(.leading, KBackChevron.leading)
        // VoiceOver meets Back first, as on every pushed page
        .accessibilitySortPriority(1)
    }
  }

  // MARK: the transcript

  private func list(column: CGFloat) -> some View {
    ScrollView(.vertical) {
      VStack(alignment: .leading, spacing: 0) {
        if content.rows.isEmpty {
          empty.padding(.horizontal, Self.gutter)
        }
        // the gutters on each row, never around the stack (KConversation's THE GUTTERS)
        ForEach(content.rows) { row in
          KWrenRoomRowView(theme: theme, row: row, column: column, cardWidth: content.cardWidth, photoOpen: content.photoOpen, actions: actions, reel: reel)
            .padding(.horizontal, Self.gutter)
        }
        chips.padding(.horizontal, Self.gutter)
        if !content.mailNote.isEmpty {
          Text(content.mailNote)
            .kText(KTextStyle(face: .monoMedium, size: 9.5, weight: .medium, tracking: 0.6 / 9.5, lineHeight: 15 / 9.5))
            .foregroundStyle(theme.mute)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 18)
            .padding(.horizontal, Self.gutter)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(.top, 20)
      .padding(.bottom, 12)
    }
    .scrollIndicators(.hidden)
    .scrollPosition($position)
    .defaultScrollAnchor(.bottom, for: .initialOffset)
    .defaultScrollAnchor(chrome.isAtBottom ? UnitPoint.bottom : nil, for: .sizeChanges)
    .scrollDismissesKeyboard(.interactively)
    .kScrollChrome(chrome)
  }

  private var empty: some View {
    VStack(spacing: 0) {
      KPersonBirdFace(theme: theme, bird: content.emptyBird, size: 64, dim: false, badge: true)
      Text(content.emptyLine)
        .kText(.content(14.5, italic: true, lineHeight: 22 / 14.5))
        .foregroundStyle(theme.sub)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: 260)
        .padding(.top, 16)
    }
    .frame(maxWidth: .infinity)
    .padding(.top, 28)
    .padding(.bottom, 8)
  }

  /// the guides, findable without typing
  private var chips: some View {
    VStack(alignment: .leading, spacing: 0) {
      Text(content.chipsHead)
        .kText(.mono(9, .medium, tracking: 1.3 / 9))
        .foregroundStyle(theme.mute)
        .padding(.bottom, 8)
        .accessibilityAddTraits(.isHeader)
      KMeFlowLayout(spacing: 8, lineSpacing: 8) {
        ForEach(content.chips) { chip in
          chipKey(chip.title, ink: theme.ind, edge: theme.ind, fill: theme.lav2) { actions.onChip(chip.id) }
        }
        if !content.moreLabel.isEmpty {
          chipKey(content.moreLabel, ink: theme.sub, edge: theme.line, fill: .clear) { actions.onMore() }
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.top, 18)
  }

  private func chipKey(_ title: String, ink: Color, edge: Color, fill: Color, action: @escaping () -> Void) -> some View {
    SwiftUI.Button(action: action) {
      Text(title)
        .kText(.system(13, .semibold))
        .foregroundStyle(ink)
        .lineLimit(2)
        // the React Native capsule's 6 11 inside its 1.5 edge
        .padding(.horizontal, 11 + 1.5)
        .padding(.vertical, 6 + 1.5)
        .background(Capsule(style: .circular).fill(fill))
        .overlay(Capsule(style: .circular).strokeBorder(edge, lineWidth: 1.5))
        .contentShape(Capsule(style: .circular))
    }
    .buttonStyle(KFadePressStyle())
  }

  // MARK: the mode chip

  private var modeChip: some View {
    HStack(spacing: 6) {
      Text(content.modeLabel)
        .kText(.mono(10, .semibold, tracking: 0.1))
        .foregroundStyle(theme.ind)
        .lineLimit(1)
      SwiftUI.Button {
        actions.onModeClose()
      } label: {
        Text(verbatim: "×")
          .kText(.mono(12, .medium))
          .foregroundStyle(theme.ind)
          .contentShape(Rectangle().inset(by: -8))
      }
      .buttonStyle(KFadePressStyle())
      .accessibilityLabel(content.modeCloseLabel)
    }
    .padding(.horizontal, 10 + 1.5)
    .padding(.vertical, 4 + 1.5)
    .background(Capsule(style: .circular).fill(theme.lav2))
    .overlay(Capsule(style: .circular).strokeBorder(theme.ind, lineWidth: 1.5))
    .padding(.horizontal, 18)
    .padding(.bottom, 8)
    .frame(maxWidth: .infinity, alignment: .leading)
    .dynamicTypeSize(...DynamicTypeSize.accessibility2)
  }

  // MARK: the keyboard

  /// The keyboard's overlap: a reader that ignores the keyboard's safe area less one that keeps it
  /// (KConversation's probe; the Host ignores every other safe area).
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

  // MARK: scrolling

  /// The real end after the first layouts: a runloop and a frame later (KConversation.settleAtEnd).
  private func settleAtEnd() {
    box.settled = true
    DispatchQueue.main.async {
      position.scrollTo(edge: .bottom)
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
        position.scrollTo(edge: .bottom)
      }
    }
  }

  /// The reader's own new line, wherever they were: now, and once more after its real height is in.
  private func toEnd(animated: Bool) {
    box.settled = true
    let go = {
      if animated {
        withAnimation(.easeOut(duration: 0.25)) { position.scrollTo(edge: .bottom) }
      } else {
        position.scrollTo(edge: .bottom)
      }
    }
    DispatchQueue.main.async(execute: go)
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
      if !chrome.isInteracting { go() }
    }
  }
}

/// What the page keeps without redrawing for it.
private final class KWrenRoomBox {
  var fullHeight: CGFloat = 0
  var keptHeight: CGFloat = 0
  var scrollSerial = 0
  /// the first rows have been put at the end
  var settled = false
}

// MARK: - one item

private struct KWrenRoomRowView<Reel: View>: View {
  let theme: KTheme
  let row: KWrenRoomRow
  /// the transcript's column, between the gutters
  let column: CGFloat
  let cardWidth: CGFloat
  let photoOpen: String
  let actions: KWrenRoomActions
  let reel: (String) -> Reel

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      if !row.dayLabel.isEmpty {
        Text(row.dayLabel)
          .kText(.mono(9, .medium, tracking: 1.4 / 9))
          .foregroundStyle(theme.mute)
          .multilineTextAlignment(.center)
          .frame(maxWidth: .infinity)
          .padding(.top, row.first ? 0 : 22)
          .padding(.bottom, 16)
      }
      if hasSpeech {
        speech
      }
      if row.hasPhoto {
        photo
      }
      if let card = row.card {
        cardView(card)
      } else if !row.link.isEmpty {
        SwiftUI.Button {
          actions.onLink(row.key)
        } label: {
          Text(row.link)
            .kText(.system(12, .semibold, tracking: 0.6 / 12))
            .foregroundStyle(theme.ind)
            .contentShape(Rectangle().inset(by: -6))
        }
        .buttonStyle(KFadePressStyle())
        .accessibilityAddTraits(.isLink)
        .padding(.top, 4)
        .padding(.bottom, 6)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  private var hasSpeech: Bool {
    !row.label.isEmpty || !row.question.isEmpty || (!row.hasPhoto && !row.body.isEmpty)
  }

  /// the speaker and the words, read as one
  private var speech: some View {
    VStack(alignment: .leading, spacing: 0) {
      if !row.label.isEmpty {
        label(row.label, mine: row.labelMine, underDay: row.labelUnderDay)
      }
      if !row.question.isEmpty {
        words(row.question, color: theme.sub)
        label(row.answerLabel, mine: false, underDay: false)
      }
      if !row.hasPhoto && !row.body.isEmpty {
        words(row.body, color: row.mine ? theme.sub : theme.ink)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .accessibilityElement(children: .combine)
  }

  private func label(_ text: String, mine: Bool, underDay: Bool) -> some View {
    Text(text)
      .kText(.mono(9.5, .semibold, tracking: 1.2 / 9.5))
      .foregroundStyle(mine ? theme.mute : theme.ind)
      .padding(.top, underDay ? 0 : 16)
      .padding(.bottom, 5)
  }

  /// what is said here, hers and yours: content, in the reader's Letter font
  private func words(_ text: String, color: Color) -> some View {
    Text(text)
      .kText(.content(16, lineHeight: 24.0 / 16.0))
      .foregroundStyle(color)
      .fixedSize(horizontal: false, vertical: true)
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(.bottom, 3)
  }

  /// a picture you sent: 62% of the column, 3:4, on soft2 until it loads
  private var photo: some View {
    let width = (column * 0.62).rounded()
    let height = (width / 0.75).rounded()
    return SwiftUI.Button {
      actions.onPhoto(row.key)
    } label: {
      KImage(row.photo, size: CGSize(width: width, height: height), contentMode: .fill, placeholder: theme.soft2)
        .contentShape(Rectangle())
    }
    .buttonStyle(KChatPlainPress())
    .accessibilityLabel(photoOpen)
    .accessibilityAddTraits(.isImage)
    .padding(.bottom, 6)
  }

  /// a guide or a release: the reel, its words and its button, and "Not it?" under a guess
  private func cardView(_ card: KWrenRoomCard) -> some View {
    let side = max(0, cardWidth - 2)
    let shape = RoundedRectangle(cornerRadius: 18, style: .circular)
    return VStack(alignment: .leading, spacing: 0) {
      VStack(alignment: .leading, spacing: 0) {
        Group {
          if let spec = card.reel {
            KReelSquare(theme: theme, spec: spec, side: side)
          } else {
            reel(card.slot)
          }
        }
        .frame(width: side, height: side)
        VStack(alignment: .leading, spacing: 6) {
          Text(card.title)
            .kText(.system(17, .bold))
            .foregroundStyle(theme.ink)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityAddTraits(.isHeader)
          Text(card.body)
            .kText(.system(15, lineHeight: 21.0 / 15.0))
            .foregroundStyle(theme.sub)
            .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        SwiftUI.Button {
          actions.onCardCta(row.key)
        } label: {
          Text(card.cta)
            .kText(.system(15, .semibold))
            .foregroundStyle(theme.ind)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .contentShape(Rectangle())
        }
        .buttonStyle(KWrenCardKeyStyle(theme: theme))
        .overlay(alignment: .top) {
          theme.line.frame(height: 1).accessibilityHidden(true)
        }
      }
      // inside the 1pt edge, as the React Native card's children are
      .padding(1)
      .frame(width: max(0, cardWidth), alignment: .leading)
      .background(shape.fill(theme.sf))
      .clipShape(shape)
      .overlay(shape.strokeBorder(theme.line, lineWidth: 1).allowsHitTesting(false))
      if !card.notIt.isEmpty {
        SwiftUI.Button {
          actions.onNotIt(row.key)
        } label: {
          (Text(verbatim: card.notIt + " ").foregroundColor(theme.mute)
            + Text(verbatim: card.sendOn + " ›").fontWeight(.semibold).foregroundColor(theme.ind))
            .kText(.mono(10.5, .medium, tracking: 0.6 / 10.5))
            .multilineTextAlignment(.leading)
            .fixedSize(horizontal: false, vertical: true)
            .contentShape(Rectangle().inset(by: -6))
        }
        .buttonStyle(KFadePressStyle())
        .padding(.top, 8)
      }
    }
    .padding(.top, 6)
    .padding(.bottom, 8)
  }
}

/// A card's button: the card's sf, soft2 while pressed (the React Native card's).
private struct KWrenCardKeyStyle: ButtonStyle {
  let theme: KTheme

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .background(configuration.isPressed ? theme.soft2 : theme.sf)
  }
}

// MARK: - the dock

private struct KWrenRoomDock: View {
  let theme: KTheme
  let content: KWrenRoomContent
  let bottomInset: CGFloat
  @ObservedObject var driver: KConversationDriver
  @ObservedObject var live: KWrenRoomLive
  let actions: KWrenRoomActions

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.dynamicTypeSize) private var typeSize

  private var trayAnimation: Animation { KChatMotion.tray(reduceMotion: reduceMotion) }

  var body: some View {
    HStack(alignment: .bottom, spacing: 8) {
      plusKey
      field
    }
    .padding(.horizontal, 14)
    // 14 above the keyboard or the tray; the home indicator's inset more when both are down
    .padding(.bottom, driver.keyboardHeight > 0 || driver.trayOpen ? 14 : 14 + bottomInset)
  }

  // MARK: the ⊕

  private var plusKey: some View {
    let open = driver.trayOpen
    return SwiftUI.Button(action: togglePlus) {
      // the React Native PlusGlyph: 12 long at 1.8 in a 24 box (the .plus glyph is 14 of its grid)
      KLineIcon(.plus, size: 24 * 12 / 14, lineWidth: 1.8 * 14 / 12, color: open ? theme.ind : theme.ink)
        .rotationEffect(.degrees(open ? 45 : 0))
        .animation(reduceMotion ? nil : .timingCurve(0.215, 0.61, 0.355, 1, duration: 0.26), value: open)
        .frame(width: 40, height: 40)
        // no ring (owner, 2026-10-26); open, the lilac disc the kindred room's × sits on
        .background(Circle().fill(open ? theme.lav : Color.clear))
        .contentShape(Circle().inset(by: -6))
    }
    .buttonStyle(KWrenDimPress())
    .accessibilityLabel(open ? content.plusCloseLabel : content.plusLabel)
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
    // escape on the ⊕ closes the tray it opened
    .modifier(KChatEscape(enabled: open) { closeTray() })
  }

  /// With the keyboard up the tray rises as it goes down, in one move.
  private func togglePlus() {
    if driver.trayOpen {
      closeTray()
    } else {
      driver.blurAll()
      withAnimation(trayAnimation) { driver.trayOpen = true }
    }
  }

  private func closeTray() {
    guard driver.trayOpen else { return }
    withAnimation(trayAnimation) { driver.trayOpen = false }
  }

  // MARK: the field

  private var field: some View {
    HStack(alignment: .bottom, spacing: 0) {
      KComposerField(
        theme: theme,
        controller: driver.body,
        placeholder: content.placeholder,
        size: 16,
        // what is written to her is content: the reader's Letter font
        content: true,
        maxLines: typeSize.isAccessibilitySize ? 3 : 4,
        returnSends: true,
        onChange: { text in
          let has = !text.isEmpty
          if live.hasText != has { live.hasText = has }
          actions.onText(text)
        },
        onSubmit: { text in
          if driver.canSend { actions.onSend(text) }
        },
        onFocus: { focused in
          // the keyboard's rise takes the tray's place
          if focused { closeTray() }
        }
      )
      // one line is the React Native field's 24, padded 9 above and below
      .frame(minHeight: 24)
      .padding(.vertical, 9)
      .frame(maxWidth: .infinity, alignment: .leading)
      if live.hasText {
        sendKey
          .padding(.bottom, 6)
      }
    }
    .padding(.leading, 14)
    .padding(.trailing, 5)
    .background {
      // the pill's own ground gives a tap to the field (the text view takes its own)
      RoundedRectangle(cornerRadius: 20, style: .circular)
        .fill(theme.soft)
        .contentShape(RoundedRectangle(cornerRadius: 20, style: .circular))
        .onTapGesture { driver.body.focus() }
        .accessibilityHidden(true)
    }
  }

  /// the 30 ind disc with the up arrow: there once anything is typed, at .35 until it may go
  private var sendKey: some View {
    SwiftUI.Button {
      actions.onSend(driver.body.text)
    } label: {
      KLineIcon(.arrowUp, size: 30 * 0.52, lineWidth: 2.8, color: theme.bg)
        .frame(width: 30, height: 30)
        .background(Circle().fill(theme.ind))
        .contentShape(Circle().inset(by: -6))
    }
    .buttonStyle(KWrenDimPress())
    .disabled(!driver.canSend)
    .opacity(driver.canSend ? 1 : 0.35)
    .accessibilityLabel(content.sendLabel)
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
  }
}

/// The React Native keys' press: down to .7.
private struct KWrenDimPress: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label.opacity(configuration.isPressed ? 0.7 : 1)
  }
}
