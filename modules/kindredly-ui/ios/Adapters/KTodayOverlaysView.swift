import SwiftUI
import UIKit
import ExpoModulesCore
import ExpoUI

/*
 TODAY'S OVERLAYS as React Native sees them (2026-10-27, the second Swift batch), each behind its own
 switch, off by default, with its React Native piece kept as the fallback. TS bindings in
 modules/kindredly-ui/src/TodayOverlays.tsx; Portable views in Portable/Today. Every word, date,
 rule and number is TS's; these turn records into Portable values and taps into events. Each sits in
 a Host of its own (none is a whole tab):

 KLetterReaderView: the unfolded letter (Portable/Today/KLetterReaderScreen.swift), inside the React
 Native page sheet of src/screens/today/LetterReader.tsx ("letterreader"). A full-sheet Host that
 keeps the keyboard's safe area (SurfaceHost field). It holds a field, so it is an
 ExpoSwiftUI.FocusableView (the expo focus/unmount crash's guard; TS also blurs it on unmount).
 Props, beyond KScreenProps (insets.bottom: the home indicator):
 - card: the desk card's record (KTodayCardRecord, the same TodayNative sends KTodayView)
 - text, written, docketA11y, sending (a reply in the air: the "inflight" island takes the foot)
 - strings { foldBack, writeBack, placeholder, send, emoji }
 Commands: setText { target: "reply", value } (the draft, as the view attaches) · focus · blur ·
 composer { sendState, hint, hintWarn } (on every edit)
 Events: onReaderClose {} · onReaderChange { text } · onReaderSend { text } · onReaderStamp { action:
 keep | report }
 Island: "inflight" (LetterInFlight, while a reply is in the air), left empty when the
 inflight record says on (batch 3: the crossing drawn here, KLetterInFlight)

 KWardrobeSlipView: the first arrival's wardrobe slip (Portable/Today/KWardrobeSlip.swift), from
 src/screens/today/WardrobeSlip.tsx ("wardrobeslip"), in a Host sized to it. Props: title, sub,
 close, bird (her content snapshot), shown. Events: onSlipOpen {} · onSlipClose {}

 KParcelSheetView / KParcelBannerView: the update prompt (Portable/Today/KParcelSheet.swift), from
 src/components/UpdatePrompt.tsx ("parcel"). The sheet fills a Host inside a transparent React
 Native Modal (insets.bottom: the home indicator); the banner fills a 52-tall Host under the status
 bar. Sheet props: strings { title, line, update, later, version }, force, opening, round, ready,
 art (update-parcel PARCEL_ART, STAMP, PIVOTS), scene (sceneGeometry for its width, BEATS, STARS),
 birds { fly, content, curious, delight }. Events: onParcelUpdate {} · onParcelLater {}. Banner
 props: line, cta, a11y, art. Event: onParcelBanner {}

 Unknown strings fall back (an unknown send state is disabled, an unknown star tone wax gold). This
 file imports ExpoUI, whose public Button would make a bare "Button" ambiguous, so nothing of that
 kind is written here.
 */

// MARK: - the unfolded letter

struct KLetterReaderStringsRecord: Record {
  @Field var foldBack: String = ""
  @Field var writeBack: String = ""
  @Field var placeholder: String = ""
  @Field var send: String = ""
  @Field var emoji: String = ""
}

final class KLetterReaderViewProps: KScreenProps {
  @Field var card: KTodayCardRecord = KTodayCardRecord()
  @Field var text: String = ""
  @Field var written: String = ""
  @Field var docketA11y: String = ""
  @Field var sending: Bool = false
  @Field var strings: KLetterReaderStringsRecord = KLetterReaderStringsRecord()
  /// batch 3: the crossing drawn here ("inflight", KFourPiecesView.swift); on: false (the default,
  /// and what an older JS bundle sends by omission) keeps the "inflight" island
  @Field var inflight: KLetterInFlightRecord = KLetterInFlightRecord()

  var onReaderClose = EventDispatcher()
  var onReaderChange = EventDispatcher()
  var onReaderSend = EventDispatcher()
  var onReaderStamp = EventDispatcher()

  /// the field and TS's composer, as long-lived as the view
  let dock = KLetterReaderDock()

  private(set) lazy var actions: KLetterReaderActions = {
    let a = KLetterReaderActions()
    a.onClose = { [weak self] in self?.onReaderClose() }
    a.onChange = { [weak self] text in self?.onReaderChange(["text": text]) }
    a.onSend = { [weak self] text in self?.onReaderSend(["text": text]) }
    a.onStamp = { [weak self] action in self?.onReaderStamp(["action": action]) }
    return a
  }()

  /// the desk card's stamp reports its long press as a card action ("stamp.keep" | "stamp.report")
  private(set) lazy var stampActions: KLetterCardActions = {
    let a = KLetterCardActions()
    a.onAction = { [weak self] _, action in
      guard action.hasPrefix("stamp.") else { return }
      self?.onReaderStamp(["action": String(action.dropFirst("stamp.".count))])
    }
    return a
  }()

  var content: KLetterReaderContent {
    var c = KLetterReaderContent()
    c.card = card.model
    c.text = text
    c.written = written
    c.docketA11y = docketA11y
    c.foldBack = strings.foldBack
    c.writeBack = strings.writeBack
    c.placeholder = strings.placeholder
    c.send = strings.send
    c.emoji = strings.emoji
    c.sending = sending
    c.inflight = inflight.on ? inflight.content : nil
    return c
  }

  func handle(_ name: String, _ args: [String: Any]) {
    switch name {
    case KCommandName.setText:
      if args.kString("target") == "reply" { dock.reply.setText(args.kString("value") ?? "") }
    case KCommandName.focus:
      if args.kString("target") == "reply" { dock.reply.focus() }
    case KCommandName.blur, KCommandName.reset:
      dock.reply.blur()
    case KCommandName.composer:
      dock.apply(
        sendState: KSendState(rawValue: args.kString("sendState") ?? "") ?? .disabled,
        hint: args.kString("hint") ?? "",
        hintWarn: args.kBool("hintWarn") ?? false
      )
    default:
      break
    }
  }
}

struct KLetterReaderView: ExpoSwiftUI.View {
  @ObservedObject var props: KLetterReaderViewProps

  var body: some View {
    KLetterReaderScreen(
      theme: props.kTheme,
      content: props.content,
      bottomInset: props.insets.bottom,
      dock: props.dock,
      actions: props.actions,
      stampActions: props.stampActions
    ) {
      props.children?.kSlot("inflight")
    }
    .kScreenEnvironment(props)
    .onKCommand(props.commands) { name, args in
      props.handle(name, args)
    }
  }
}

extension KLetterReaderView: ExpoSwiftUI.FocusableView {
  /// Before the view goes: the keyboard away if the reply field has it, then the field told it has
  /// lost focus (as KTodayView does).
  func forceResignFirstResponder() {
    let reply = props.dock.reply
    if reply.isFocused {
      _ = UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
    reply.blur()
  }
}

// MARK: - the wardrobe slip

final class KWardrobeSlipViewProps: KScreenProps {
  @Field var title: String = ""
  @Field var sub: String = ""
  @Field var close: String = ""
  @Field var bird: KImageRefRecord = KImageRefRecord()
  @Field var shown: Bool = true

  var onSlipOpen = EventDispatcher()
  var onSlipClose = EventDispatcher()

  private(set) lazy var actions: KWardrobeSlipActions = {
    let a = KWardrobeSlipActions()
    a.onOpen = { [weak self] in self?.onSlipOpen() }
    a.onClose = { [weak self] in self?.onSlipClose() }
    return a
  }()

  var content: KWardrobeSlipContent {
    var c = KWardrobeSlipContent()
    c.title = title
    c.sub = sub
    c.close = close
    c.bird = bird.uri.isEmpty ? nil : bird.ref
    c.shown = shown
    return c
  }
}

struct KWardrobeSlipView: ExpoSwiftUI.View {
  @ObservedObject var props: KWardrobeSlipViewProps

  var body: some View {
    KWardrobeSlip(theme: props.kTheme, content: props.content, actions: props.actions)
      .frame(maxWidth: .infinity, alignment: .topLeading)
      .fixedSize(horizontal: false, vertical: true)
      .kScreenEnvironment(props)
  }
}

// MARK: - the update prompt

struct KParcelBoxRecord: Record {
  @Field var x: Double = 0
  @Field var y: Double = 0
  @Field var w: Double = 0
  @Field var h: Double = 0
  @Field var r: Double = 0

  var rect: CGRect { CGRect(x: x, y: y, width: w, height: h) }
}

struct KParcelPointRecord: Record {
  @Field var x: Double = 0
  @Field var y: Double = 0

  var point: CGPoint { CGPoint(x: x, y: y) }
}

/// update-parcel PARCEL_ART, STAMP and PIVOTS
struct KParcelArtRecord: Record {
  @Field var pw: Double = 120
  @Field var ph: Double = 100
  @Field var front: String = ""
  @Field var frontShade: String = ""
  @Field var top: String = ""
  @Field var flapL: String = ""
  @Field var flapR: String = ""
  @Field var ribbonFront: String = ""
  @Field var ribbonL: String = ""
  @Field var ribbonR: String = ""
  @Field var bowLoops: String = ""
  @Field var bowShade: String = ""
  @Field var bowTails: String = ""
  @Field var star: String = ""
  @Field var knot: KParcelBoxRecord = KParcelBoxRecord()
  @Field var stamp: KParcelBoxRecord = KParcelBoxRecord()
  @Field var foot: KParcelPointRecord = KParcelPointRecord()
  @Field var knotPivot: KParcelPointRecord = KParcelPointRecord()
  @Field var flapLHinge: KParcelPointRecord = KParcelPointRecord()
  @Field var flapRHinge: KParcelPointRecord = KParcelPointRecord()

  var art: KParcelArt {
    var a = KParcelArt()
    a.box = CGSize(width: max(1, pw), height: max(1, ph))
    a.front = KSVGPath.path(front)
    a.frontShade = KSVGPath.path(frontShade)
    a.top = KSVGPath.path(top)
    a.flapL = KSVGPath.path(flapL)
    a.flapR = KSVGPath.path(flapR)
    a.ribbonFront = KSVGPath.path(ribbonFront)
    a.ribbonL = KSVGPath.path(ribbonL)
    a.ribbonR = KSVGPath.path(ribbonR)
    a.bowLoops = KSVGPath.path(bowLoops)
    a.bowShade = KSVGPath.path(bowShade)
    a.bowTails = KSVGPath.path(bowTails)
    a.star = KSVGPath.path(star)
    a.knot = knot.rect
    a.knotRadius = CGFloat(knot.r)
    a.stamp = stamp.rect
    a.foot = foot.point
    a.knotPivot = knotPivot.point
    a.flapLHinge = flapLHinge.point
    a.flapRHinge = flapRHinge.point
    return a
  }
}

struct KParcelStarRecord: Record {
  @Field var dx: Double = 0
  @Field var dy: Double = 0
  @Field var size: Double = 12
  @Field var tone: String = "waxGold"
  @Field var delay: Double = 0
}

/// sceneGeometry for the scene's width, BEATS and STARS
struct KParcelSceneRecord: Record {
  @Field var height: Double = 214
  @Field var size: Double = 96
  @Field var cx: Double = 0
  @Field var ground: Double = 200
  @Field var restX: Double = 0
  @Field var restY: Double = 104
  @Field var perchX: Double = 0
  @Field var perchY: Double = 30
  @Field var hoverX: Double = 0
  @Field var hoverY: Double = 0
  @Field var landX: Double = 0
  @Field var landY: Double = 0
  @Field var startX: Double = 0
  @Field var startY: Double = -120
  @Field var carryDx: Double = -9
  @Field var carryDy: Double = 69
  @Field var perchOriginX: Double = 0
  @Field var perchOriginY: Double = 0
  @Field var start: Double = 280
  @Field var fly: Double = 950
  @Field var hover: Double = 220
  @Field var drop: Double = 300
  @Field var land: Double = 640
  @Field var settle: Double = 160
  @Field var firstShake: Double = 1400
  @Field var shakeMin: Double = 3400
  @Field var shakeMax: Double = 5200
  @Field var curious: Double = 1300
  @Field var bow: Double = 520
  @Field var flapDelay: Double = 90
  @Field var flap: Double = 320
  @Field var starsDelay: Double = 140
  @Field var stars: Double = 760
  @Field var starRun: Double = 560
  @Field var starList: [KParcelStarRecord] = []

  var scene: KParcelScene {
    var s = KParcelScene()
    s.height = CGFloat(height)
    s.size = CGFloat(size)
    s.cx = CGFloat(cx)
    s.ground = CGFloat(ground)
    s.restX = CGFloat(restX)
    s.restY = CGFloat(restY)
    s.perchX = CGFloat(perchX)
    s.perchY = CGFloat(perchY)
    s.hoverX = CGFloat(hoverX)
    s.hoverY = CGFloat(hoverY)
    s.landX = CGFloat(landX)
    s.landY = CGFloat(landY)
    s.startX = CGFloat(startX)
    s.startY = CGFloat(startY)
    s.carryDx = CGFloat(carryDx)
    s.carryDy = CGFloat(carryDy)
    s.perchOrigin = CGPoint(x: perchOriginX, y: perchOriginY)
    s.start = start
    s.fly = fly
    s.hover = hover
    s.drop = drop
    s.land = max(201, land)
    s.settle = settle
    s.firstShake = firstShake
    s.shakeMin = shakeMin
    s.shakeMax = max(shakeMin, shakeMax)
    s.curious = curious
    s.bow = max(1, bow)
    s.flapDelay = flapDelay
    s.flap = max(1, flap)
    s.starsDelay = starsDelay
    s.stars = stars
    s.starRun = max(1, starRun)
    s.starList = starList.enumerated().map { i, r in
      KParcelStar(id: i, dx: CGFloat(r.dx), dy: CGFloat(r.dy), size: CGFloat(r.size), tone: r.tone, delay: r.delay)
    }
    return s
  }
}

struct KParcelStringsRecord: Record {
  @Field var title: String = ""
  @Field var line: String = ""
  @Field var update: String = ""
  @Field var later: String = ""
  /// "" while the version is unknown: no stamp
  @Field var version: String = ""
}

struct KParcelBirdsRecord: Record {
  @Field var fly: KImageRefRecord = KImageRefRecord()
  @Field var content: KImageRefRecord = KImageRefRecord()
  @Field var curious: KImageRefRecord = KImageRefRecord()
  @Field var delight: KImageRefRecord = KImageRefRecord()

  private static func ref(_ r: KImageRefRecord) -> KImageRef? { r.uri.isEmpty ? nil : r.ref }

  var birds: KParcelBirds {
    KParcelBirds(fly: Self.ref(fly), content: Self.ref(content), curious: Self.ref(curious), delight: Self.ref(delight))
  }
}

final class KParcelSheetViewProps: KScreenProps {
  @Field var strings: KParcelStringsRecord = KParcelStringsRecord()
  @Field var force: Bool = false
  @Field var opening: Bool = false
  @Field var round: Int = 0
  @Field var ready: Bool = false
  @Field var art: KParcelArtRecord = KParcelArtRecord()
  @Field var scene: KParcelSceneRecord = KParcelSceneRecord()
  @Field var birds: KParcelBirdsRecord = KParcelBirdsRecord()

  var onParcelUpdate = EventDispatcher()
  var onParcelLater = EventDispatcher()

  private(set) lazy var actions: KParcelSheetActions = {
    let a = KParcelSheetActions()
    a.onUpdate = { [weak self] in self?.onParcelUpdate() }
    a.onLater = { [weak self] in self?.onParcelLater() }
    return a
  }()

  var content: KParcelSheetContent {
    var c = KParcelSheetContent()
    c.title = strings.title
    c.line = strings.line
    c.update = strings.update
    c.later = strings.later
    c.version = strings.version
    c.force = force
    c.opening = opening
    c.round = round
    c.ready = ready
    // the paths are parsed once per rev (TS bumps it when the art or the scene changes)
    c.art = cached("art") { art.art }
    c.scene = cached("scene") { scene.scene }
    c.birds = birds.birds
    return c
  }
}

struct KParcelSheetView: ExpoSwiftUI.View {
  @ObservedObject var props: KParcelSheetViewProps

  var body: some View {
    KParcelSheet(theme: props.kTheme, content: props.content, bottomInset: props.insets.bottom, actions: props.actions)
      .kScreenEnvironment(props)
  }
}

final class KParcelBannerViewProps: KScreenProps {
  @Field var line: String = ""
  @Field var cta: String = ""
  @Field var a11y: String = ""
  @Field var art: KParcelArtRecord = KParcelArtRecord()

  var onParcelBanner = EventDispatcher()

  var content: KParcelBannerContent {
    var c = KParcelBannerContent()
    c.line = line
    c.cta = cta
    c.a11y = a11y
    c.art = cached("art") { art.art }
    return c
  }
}

struct KParcelBannerView: ExpoSwiftUI.View {
  @ObservedObject var props: KParcelBannerViewProps

  var body: some View {
    KParcelBanner(theme: props.kTheme, content: props.content) { [weak props] in
      props?.onParcelBanner()
    }
    .kScreenEnvironment(props)
  }
}
