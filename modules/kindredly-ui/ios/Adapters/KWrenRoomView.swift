import SwiftUI
import UIKit
import ExpoModulesCore
import ExpoUI

/*
 WREN'S ROOM, AS REACT NATIVE SEES IT (2026-10-27; behind the "wrenroom" switch, off by default):
 <KWrenRoomView … /> (modules/kindredly-ui/src/WrenRoom.tsx), drawn by src/screens/wren-room/
 WrenRoomNative.tsx alone in one @expo/ui <Host> that keeps the keyboard's safe area (SurfaceHost
 field). A screen view like every step-5 screen (KScreenProps.swift), registered with ExpoUIView
 and the "command" AsyncFunction in KindredlyUIModule.swift. The page is KWrenRoomScreen in
 Portable/WrenRoom and knows nothing of Expo. This file imports ExpoUI, whose public Button, Text
 and Image would make bare names ambiguous, so nothing of that kind is written here.

 Props, beyond KScreenProps (insets.top the status bar, insets.bottom the home indicator):
 - strings: { name, role, backLabel, emptyLine, chipsHead, moreLabel, mailNote, photoOpen,
   placeholder, modeLabel, modeCloseLabel, plusLabel, plusCloseLabel, sendLabel }
 - bird, emptyBird: her official snapshots (image refs)
 - rows: [{ key, dayLabel, first, label, labelMine, labelUnderDay, question, answerLabel, body,
   mine, hasPhoto, photo, link, hasCard, card { slot, title, body, cta, notIt, sendOn, reel } }]
   (reel, batch 3: a reel Swift draws in the square, KReelSpecRecord; off keeps the island)
 - chips: [{ id, title }]; traces: the ⊕'s tray (KChatTraceRecord, KConversationView.swift)
 - cardWidth: a card's width, its edge included
 Children: one <KIsland name={card.slot}> per card (the reel square, cardWidth - 2 square), every
 render, in the transcript's order.
 Batch 3 (2026-11-09, the "postmedia" switch, off by default): media [{ slot, url, kind }] — a
 card whose slot is listed draws its post's picture or film in Swift (KPostMediaSquare, Portable/
 WrenRoom) instead of looking for an island of that name.

 Commands: setText { target: "body", value }, focus { target: "body" }, blur {},
 composer { canSend }, scrollTo { key: "end", animated }
 Events: onWrBack {}, onWrText { text } (every edit, never a setText), onWrSend { text },
 onWrModeClose {}, onWrHand { key }, onWrPhoto { key }, onWrLink { key }, onWrCta { key },
 onWrNotIt { key }, onWrChip { id }, onWrMore {}
 */

struct KWrenRoomStringsRecord: Record {
  @Field var name: String = ""
  @Field var role: String = ""
  @Field var backLabel: String = ""
  @Field var emptyLine: String = ""
  @Field var chipsHead: String = ""
  @Field var moreLabel: String = ""
  @Field var mailNote: String = ""
  @Field var photoOpen: String = ""
  @Field var placeholder: String = ""
  @Field var modeLabel: String = ""
  @Field var modeCloseLabel: String = ""
  @Field var plusLabel: String = ""
  @Field var plusCloseLabel: String = ""
  @Field var sendLabel: String = ""
}

struct KWrenRoomCardRecord: Record {
  @Field var slot: String = ""
  @Field var title: String = ""
  @Field var body: String = ""
  @Field var cta: String = ""
  @Field var notIt: String = ""
  @Field var sendOn: String = ""
  /// batch 3: the reel Swift draws in the square (KReelView.swift); off keeps the island
  @Field var reel: KReelSpecRecord = KReelSpecRecord()

  var card: KWrenRoomCard {
    KWrenRoomCard(slot: slot, title: title, body: body, cta: cta, notIt: notIt, sendOn: sendOn, reel: reel.spec)
  }
}

struct KWrenRoomRowRecord: Record {
  @Field var key: String = ""
  @Field var dayLabel: String = ""
  @Field var first: Bool = false
  @Field var label: String = ""
  @Field var labelMine: Bool = false
  @Field var labelUnderDay: Bool = false
  @Field var question: String = ""
  @Field var answerLabel: String = ""
  @Field var body: String = ""
  @Field var mine: Bool = false
  @Field var hasPhoto: Bool = false
  @Field var photo: KImageRefRecord = KImageRefRecord()
  @Field var link: String = ""
  /// a record field can't take null: the card is there only when this says so
  @Field var hasCard: Bool = false
  @Field var card: KWrenRoomCardRecord = KWrenRoomCardRecord()

  var row: KWrenRoomRow {
    KWrenRoomRow(
      key: key,
      dayLabel: dayLabel,
      first: first,
      label: label,
      labelMine: labelMine,
      labelUnderDay: labelUnderDay,
      question: question,
      answerLabel: answerLabel,
      body: body,
      mine: mine,
      hasPhoto: hasPhoto,
      photo: photo.ref,
      link: link,
      card: hasCard ? card.card : nil
    )
  }
}

struct KWrenRoomChipRecord: Record {
  @Field var id: String = ""
  @Field var title: String = ""
}

final class KWrenRoomViewProps: KScreenProps {
  @Field var strings: KWrenRoomStringsRecord = KWrenRoomStringsRecord()
  @Field var bird: KImageRefRecord = KImageRefRecord()
  @Field var emptyBird: KImageRefRecord = KImageRefRecord()
  /// her avatar as Kindreds' list shows it (an empty uri: none, the header keeps the snapshot)
  @Field var avatar: KImageRefRecord = KImageRefRecord()
  @Field var rows: [KWrenRoomRowRecord] = []
  @Field var chips: [KWrenRoomChipRecord] = []
  @Field var traces: [KChatTraceRecord] = []
  @Field var cardWidth: CGFloat = 0
  // batch 3: postmedia
  @Field var media: [KPostMediaRecord] = []

  /// the square Swift draws for a slot, if any (a handful at most: not worth a rev cache, and the
  /// list changes without the rows when the piece's gate opens)
  func postMedia(for slot: String) -> KPostMediaRecord? {
    media.first { $0.slot == slot }
  }

  var onWrBack = EventDispatcher()
  var onWrText = EventDispatcher()
  var onWrSend = EventDispatcher()
  var onWrModeClose = EventDispatcher()
  var onWrHand = EventDispatcher()
  var onWrPhoto = EventDispatcher()
  var onWrLink = EventDispatcher()
  var onWrCta = EventDispatcher()
  var onWrNotIt = EventDispatcher()
  var onWrChip = EventDispatcher()
  var onWrMore = EventDispatcher()

  /// the field, canSend, the ⊕'s tray, the keyboard and scroll requests, as long-lived as the view
  let driver = KConversationDriver()
  let live = KWrenRoomLive()

  private(set) lazy var actions: KWrenRoomActions = {
    let a = KWrenRoomActions()
    a.onBack = { [weak self] in self?.onWrBack() }
    a.onText = { [weak self] text in self?.onWrText(["text": text]) }
    a.onSend = { [weak self] text in self?.onWrSend(["text": text]) }
    a.onModeClose = { [weak self] in self?.onWrModeClose() }
    a.onHand = { [weak self] key in self?.onWrHand(["key": key]) }
    a.onPhoto = { [weak self] key in self?.onWrPhoto(["key": key]) }
    a.onLink = { [weak self] key in self?.onWrLink(["key": key]) }
    a.onCardCta = { [weak self] key in self?.onWrCta(["key": key]) }
    a.onNotIt = { [weak self] key in self?.onWrNotIt(["key": key]) }
    a.onChip = { [weak self] id in self?.onWrChip(["id": id]) }
    a.onMore = { [weak self] in self?.onWrMore() }
    return a
  }()

  var content: KWrenRoomContent {
    let s = strings
    var c = KWrenRoomContent()
    c.name = s.name
    c.role = s.role
    c.backLabel = s.backLabel
    c.bird = bird.ref
    c.emptyBird = emptyBird.ref
    c.avatar = avatar.ref
    c.emptyLine = s.emptyLine
    c.rows = cached("rows") { rows.map(\.row) }
    c.chipsHead = s.chipsHead
    c.chips = cached("chips") { chips.map { KWrenRoomChip(id: $0.id, title: $0.title) } }
    c.moreLabel = s.moreLabel
    c.mailNote = s.mailNote
    c.photoOpen = s.photoOpen
    c.placeholder = s.placeholder
    c.modeLabel = s.modeLabel
    c.modeCloseLabel = s.modeCloseLabel
    c.plusLabel = s.plusLabel
    c.plusCloseLabel = s.plusCloseLabel
    c.sendLabel = s.sendLabel
    c.traces = cached("traces") { traces.map(\.trace) }
    c.cardWidth = cardWidth
    return c
  }

  /// One command from the bus (see the list at the top of the file).
  func handle(_ name: String, _ args: [String: Any]) {
    switch name {
    case KCommandName.setText:
      guard args.kString("target") == "body" else { return }
      let value = args.kString("value") ?? ""
      driver.body.setText(value)
      if live.hasText != !value.isEmpty { live.hasText = !value.isEmpty }
    case KCommandName.focus:
      if args.kString("target") == "body" { driver.body.focus() }
    case KCommandName.blur, KCommandName.reset:
      driver.blurAll()
    case KCommandName.composer:
      let can = args.kBool("canSend") ?? false
      if driver.canSend != can { driver.canSend = can }
    case KCommandName.scrollTo:
      if case .end = KScrollRequest(args) {
        driver.scroll(to: .end, animated: args.kBool("animated") ?? true)
      }
    default:
      break
    }
  }
}

struct KWrenRoomView: ExpoSwiftUI.View {
  @ObservedObject var props: KWrenRoomViewProps

  var body: some View {
    let insets = props.insets
    return KWrenRoomScreen(
      theme: props.kTheme,
      content: props.content,
      topInset: insets.top,
      bottomInset: insets.bottom,
      driver: props.driver,
      live: props.live,
      actions: props.actions
    ) { slot in
      // batch 3: postmedia
      if let media = props.postMedia(for: slot) {
        KPostMediaSquare(url: KMediaURL.from(media.url), kind: KPostMediaKind(rawValue: media.kind) ?? .image)
      } else {
        props.children?.kSlot(slot)
      }
    }
    .kScreenEnvironment(props)
    .onKCommand(props.commands) { name, args in
      props.handle(name, args)
    }
  }
}

extension KWrenRoomView: ExpoSwiftUI.FocusableView {
  /// Before the view goes: the keyboard away if the field has it, then the field told it has lost
  /// focus (as KComposeView does).
  func forceResignFirstResponder() {
    if props.driver.body.isFocused {
      _ = UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
    props.driver.blurAll()
  }
}

/// A post's picture or film that Swift draws in a card's square (batch 3: postmedia).
struct KPostMediaRecord: Record {
  @Field var slot: String = ""
  @Field var url: String = ""
  /// "image" | "video"
  @Field var kind: String = "image"
}
