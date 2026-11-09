import SwiftUI
import UIKit
import ExpoModulesCore
import ExpoUI

/*
 THE ONBOARDING as React Native sees it: <KOnboardingView … /> on the JS side
 (modules/kindredly-ui/src/Onboarding.tsx), drawn by src/screens/onboarding/OnboardingNative.tsx
 in one full-screen Host that keeps the keyboard's safe area (SurfaceHost field). This file turns
 records into Portable values and taps into events; the run itself is
 Portable/Onboarding/KOnboardingScreen.swift and knows nothing about Expo.

 Built as every step-5 screen is (KScreenProps.swift; registered in KindredlyUIModule.swift with
 the "command" AsyncFunction), inside ONE @expo/ui <Host>. It holds text fields, so it is an
 ExpoSwiftUI.FocusableView (the expo focus/unmount crash's guard), as KNoteComposeView is.

 Props, beyond KScreenProps (insets: top = the status bar, bottom = the home indicator):
 - screen (flow ScreenId), side ("" | signin | underage | tray | code), ground (blue | paper | shell)
 - canAdvance, hasBack, noFade, demo
 - words: [{ k, v }], this screen's words by OnboardingNative's names, converted once per rev
 - shell, shells: [{ name, a11y }] (rev), pips, voice, still
 - door: { entry, handedAt, showLang, date, sample, frostThem, frostYou, faceThem, faceYou }
 - auth: { apple, busy, err, fold: { stage, busy, bad }, failed, exists, switchCode, switchBusy, switchBad }
 - dob: { set, y, m, d, ty, tm, td, months (rev), sign }
 - pronoun, faces: [{ id, image, a11y }] (rev), selectedFace, make: { show, state, image, id }
 - envelope: { hasUid, name, frost, face, hasFace, mark, sign, showMark, showSign, date, envDate }
 - letter: { left, fill, clean, ready, cueTurn, len }
 - stampShown, sections (KComposeSectionRecord, rev)
 - hatch: { flood, floodX, floodY, hatched, readS }, name: { chick, ideas, typed, pronoun, reserved }
 - refused
 - pieces: { route, birds [{ id, image }], chick { on, … }, flight { on, … }, hatch { on, … } } —
   the four islands Swift may draw itself (batch 3, Portable/Onboarding/KObPieces.swift). An `on`
   false (the default, and what an older JS bundle sends by omission) and an empty route keep
   the island. TS asks for the marker view KObPiecesView before it sends any.
 - children: <KIsland name="routeBird">, "hatch", "chick", "flight", every render, in that order

 Commands (KCommandBus): setText { target: letter | name | email | code | switchCode, value } ·
 focus { target } · blur {} · reset {} (blurs).

 Events: onObEvent { type, s, n } — one channel; OnboardingNative's switch lists every type.

 Unknown enum strings fall back rather than fail (a screen this binary doesn't know is the
 doorstep; a side it doesn't know is none). This file imports ExpoUI, so no bare Button / Text /
 Image / Label is written here.
 */

struct KObWordRecord: Record {
  @Field var k: String = ""
  @Field var v: String = ""
}

struct KObShellRecord: Record {
  @Field var name: String = ""
  @Field var a11y: String = ""
}

struct KObDoorRecord: Record {
  /// full | still | rest
  @Field var entry: String = "rest"
  /// when the launch handed over, ms since 1970
  @Field var handedAt: Double = 0
  @Field var showLang: Bool = false
  @Field var date: String = ""
  @Field var sample: String = ""
  @Field var frostThem: KFrostRecord = KFrostRecord()
  @Field var frostYou: KFrostRecord = KFrostRecord()
  @Field var faceThem: KImageRefRecord = KImageRefRecord()
  @Field var faceYou: KImageRefRecord = KImageRefRecord()
}

struct KObFoldRecord: Record {
  /// key | email | code
  @Field var stage: String = "key"
  @Field var busy: Bool = false
  @Field var bad: String = ""
}

struct KObAuthRecord: Record {
  @Field var apple: Bool = true
  /// apple | google | switch | ""
  @Field var busy: String = ""
  @Field var err: String = ""
  @Field var fold: KObFoldRecord = KObFoldRecord()
  @Field var failed: Bool = false
  @Field var exists: Bool = false
  @Field var switchCode: Bool = false
  @Field var switchBusy: Bool = false
  @Field var switchBad: Bool = false
}

struct KObDobRecord: Record {
  @Field var set: Bool = false
  @Field var y: Int = 2000
  /// 0–11
  @Field var m: Int = 0
  @Field var d: Int = 1
  @Field var ty: Int = 2026
  @Field var tm: Int = 0
  @Field var td: Int = 1
  @Field var months: [String] = []
  /// the sign's line glyph name (KLineGlyph), "" for none
  @Field var sign: String = ""
}

struct KObFaceRecord: Record {
  @Field var id: String = ""
  @Field var image: KImageRefRecord = KImageRefRecord()
  @Field var a11y: String = ""
}

struct KObMakeRecord: Record {
  /// the makeface switch is on: the "＋ Make yours" cell shows
  @Field var show: Bool = false
  /// free | used | yours
  @Field var state: String = "free"
  @Field var image: KImageRefRecord = KImageRefRecord()
  @Field var id: String = ""
}

struct KObEnvelopeRecord: Record {
  @Field var hasUid: Bool = false
  @Field var name: String = ""
  @Field var frost: KFrostRecord = KFrostRecord()
  @Field var face: KImageRefRecord = KImageRefRecord()
  @Field var hasFace: Bool = false
  /// she | he | ""
  @Field var mark: String = ""
  /// a zodiac line glyph name, or ""
  @Field var sign: String = ""
  @Field var showMark: Bool = true
  @Field var showSign: Bool = true
  @Field var date: String = ""
  @Field var envDate: String = ""
}

struct KObLetterRecord: Record {
  @Field var left: Int = 20
  @Field var fill: Double = 0
  @Field var clean: Bool = true
  @Field var ready: Bool = false
  @Field var cueTurn: Int = 0
  @Field var len: Int = 0
}

struct KObHatchRecord: Record {
  @Field var flood: Bool = false
  @Field var floodX: Double = 0
  @Field var floodY: Double = 0
  @Field var hatched: Bool = false
  @Field var readS: Double = 4.6
}

struct KObNameRecord: Record {
  @Field var chick: Double = 104
  @Field var ideas: [String] = []
  @Field var typed: String = ""
  @Field var pronoun: String = "she"
  @Field var reserved: Bool = false
}

// batch 3: the onboarding's last four islands (Portable/Onboarding/KObPieces.swift, KObHatchStage.swift)

/// One picture by name: a mood, or a rig part.
struct KObPicRecord: Record {
  @Field var id: String = ""
  @Field var image: KImageRefRecord = KImageRefRecord()
}

func kObPics(_ list: [KObPicRecord]) -> [String: KImageRef] {
  var out: [String: KImageRef] = [:]
  for p in list {
    if let r = p.image.ref { out[p.id] = r }
  }
  return out
}

struct KObChickRecord: Record {
  @Field var on: Bool = false
  @Field var mood: String = "content"
  @Field var tag: String = ""
  @Field var a11y: String = ""
  @Field var nudge: Int = 0
  /// chirp | tilt | happy
  @Field var nudgeRe: String = "chirp"

  var piece: KObChickPiece? {
    guard on else { return nil }
    var c = KObChickPiece()
    c.mood = mood
    c.tag = tag
    c.a11y = a11y
    c.nudge = nudge
    c.nudgeRe = nudgeRe
    return c
  }
}

struct KObFlightPieceRecord: Record {
  @Field var on: Bool = false
  /// ms since 1970
  @Field var startAt: Double = 0
  @Field var still: Bool = false
  @Field var mood: String = "curious"
  @Field var theme: String = "classic"
  @Field var head: String = ""
  @Field var sub: String = ""
  @Field var line: String = ""
  @Field var lineLines: Int = 2
  @Field var stamp: String = ""
  @Field var opener: String = ""
  @Field var openerLines: Int = 3
  @Field var carried: String = ""
  @Field var yourCity: String = ""
  @Field var chart: String = ""
  @Field var skip: String = ""
  @Field var stops: [KFirstFlightStopRecord] = []
  @Field var stopWordsSize: Double = 11
  @Field var loop: String = ""
  @Field var home: KFirstFlightPointRecord = KFirstFlightPointRecord()
  @Field var stopPoints: [KFirstFlightPointRecord] = []
  @Field var trail: [KFirstFlightPointRecord] = []
  @Field var curves: KFirstFlightCurvesRecord = KFirstFlightCurvesRecord()
  @Field var bird: KFirstFlightTrackRecord = KFirstFlightTrackRecord()
  @Field var envelope: KFirstFlightTrackRecord = KFirstFlightTrackRecord()
  @Field var envelopeW: Double = 156
  @Field var envelopeH: Double = 98
  @Field var total: Double = 3.05

  func piece(madeAt: Date) -> KObFlightPiece? {
    guard on else { return nil }
    var f = KObFlightPiece()
    f.startAt = startAt > 0 ? Date(timeIntervalSince1970: startAt / 1000) : madeAt
    f.still = still
    f.mood = mood
    f.theme = theme
    f.head = head
    f.sub = sub
    f.line = line
    f.lineLines = lineLines
    f.stamp = stamp
    f.opener = opener
    f.openerLines = openerLines
    f.carried = carried
    f.yourCity = yourCity
    f.chart = chart
    f.skip = skip
    f.stops = stops.map { KFirstFlightStop(label: $0.label, words: $0.words) }
    f.stopWordsSize = CGFloat(stopWordsSize)
    f.loop = loop
    f.home = home.cg
    f.stopPoints = stopPoints.map(\.cg)
    f.trail = trail.map { KFirstFlightPoint(x: CGFloat($0.x), y: CGFloat($0.y), at: $0.at) }
    f.curves = curves.curves
    f.bird = bird.track
    f.envelope = envelope.track
    f.envelopeSize = CGSize(width: max(1, envelopeW), height: max(1, envelopeH))
    f.total = total > 0 ? total : 3.05
    return f
  }
}

struct KObMotionRecord: Record {
  @Field var m: String = ""
  @Field var w: Double = 0
  @Field var s: Double = 1
  @Field var face: String = ""
}

struct KObHatchPieceRecord: Record {
  @Field var on: Bool = false
  @Field var layers: [KObPicRecord] = []
  @Field var faces: [KObPicRecord] = []
  @Field var mood: String = "content"
  @Field var words: [String] = []
  @Field var quote: String = ""
  @Field var motions: [KObMotionRecord] = []
  @Field var celebrate: Int = 0
  @Field var shadowDark: Bool = false

  var piece: KObHatchPiece? {
    guard on else { return nil }
    var h = KObHatchPiece()
    h.layers = kObPics(layers)
    h.faces = kObPics(faces)
    h.mood = mood
    h.words = words
    h.quote = quote
    h.motions = motions.filter { !$0.m.isEmpty }.map { KObMotionRow(m: $0.m, w: max(0, $0.w), s: $0.s, face: $0.face) }
    h.celebrate = celebrate
    h.shadowDark = shadowDark
    return h
  }
}

struct KObPiecesRecord: Record {
  @Field var route: KImageRefRecord = KImageRefRecord()
  @Field var birds: [KObPicRecord] = []
  @Field var chick: KObChickRecord = KObChickRecord()
  @Field var flight: KObFlightPieceRecord = KObFlightPieceRecord()
  @Field var hatch: KObHatchPieceRecord = KObHatchPieceRecord()

  func pieces(madeAt: Date) -> KObPieces {
    var p = KObPieces()
    p.route = route.ref
    p.birds = kObPics(birds)
    p.chick = chick.piece
    p.flight = flight.piece(madeAt: madeAt)
    p.hatch = hatch.piece
    return p
  }
}

final class KOnboardingViewProps: KScreenProps {
  @Field var screen: String = "doorstep"
  @Field var side: String = ""
  @Field var ground: String = "blue"
  @Field var canAdvance: Bool = false
  @Field var hasBack: Bool = false
  @Field var noFade: Bool = false
  @Field var demo: Bool = false
  @Field var words: [KObWordRecord] = []
  @Field var shell: Int = 0
  @Field var shells: [KObShellRecord] = []
  @Field var pips: Int = 0
  @Field var voice: String = ""
  @Field var still: Bool = false
  @Field var door: KObDoorRecord = KObDoorRecord()
  @Field var auth: KObAuthRecord = KObAuthRecord()
  @Field var dob: KObDobRecord = KObDobRecord()
  @Field var pronoun: String = ""
  @Field var faces: [KObFaceRecord] = []
  @Field var selectedFace: String = ""
  @Field var make: KObMakeRecord = KObMakeRecord()
  @Field var envelope: KObEnvelopeRecord = KObEnvelopeRecord()
  @Field var letter: KObLetterRecord = KObLetterRecord()
  @Field var stampShown: String = ""
  @Field var sections: [KComposeSectionRecord] = []
  @Field var hatch: KObHatchRecord = KObHatchRecord()
  @Field var name: KObNameRecord = KObNameRecord()
  @Field var refused: Bool = false
  // batch 3: the onboarding's last four islands
  @Field var pieces: KObPiecesRecord = KObPiecesRecord()

  var onObEvent = EventDispatcher()

  /// when this view was made: the flight's clock if TS sent none
  let madeAt = Date()

  /// The fields: as long-lived as the view, like `commands`.
  let driver = KObDriver()

  /// The run's taps, made once: the closure reaches this props object's event.
  private(set) lazy var actions: KObActions = {
    let a = KObActions()
    a.onEvent = { [weak self] type, s, n in self?.onObEvent(["type": type, "s": s, "n": n]) }
    return a
  }()

  /// One command from the bus (see the list at the top of the file).
  func handle(_ name: String, _ args: [String: Any]) {
    switch name {
    case KCommandName.setText:
      driver.controller(args.kString("target") ?? "")?.setText(args.kString("value") ?? "")
    case KCommandName.focus:
      driver.controller(args.kString("target") ?? "")?.focus()
    case KCommandName.blur, KCommandName.reset:
      driver.blurAll()
    default:
      break
    }
  }

  /// The run's content from the props; the lists are converted once per rev.
  func content() -> KObContent {
    var c = KObContent()
    c.screen = KObScreen(rawValue: screen) ?? .doorstep
    c.side = KObSide(rawValue: side)
    c.ground = KObGround(rawValue: ground) ?? .blue
    c.canAdvance = canAdvance
    c.hasBack = hasBack
    c.noFade = noFade
    c.demo = demo
    c.words = cached("words") {
      var out: [String: String] = [:]
      for w in words { out[w.k] = w.v }
      return out
    }
    c.shell = shell
    c.shells = cached("shells") { shells.map { KObShellInfo(name: $0.name, a11y: $0.a11y) } }
    c.pips = pips
    c.voice = voice
    c.still = still

    var d = KObDoor()
    d.entry = KObDoor.Entry(rawValue: door.entry) ?? .rest
    d.handedAt = door.handedAt
    d.showLang = door.showLang
    d.date = door.date
    d.sample = door.sample
    d.frostThem = door.frostThem.spec
    d.frostYou = door.frostYou.spec
    d.faceThem = door.faceThem.ref
    d.faceYou = door.faceYou.ref
    c.door = d

    var a = KObAuth()
    a.apple = auth.apple
    a.busy = auth.busy
    a.err = auth.err
    a.fold.stage = KObFold.Stage(rawValue: auth.fold.stage) ?? .key
    a.fold.busy = auth.fold.busy
    a.fold.bad = auth.fold.bad
    a.failed = auth.failed
    a.exists = auth.exists
    a.switchCode = auth.switchCode
    a.switchBusy = auth.switchBusy
    a.switchBad = auth.switchBad
    c.auth = a

    var b = KObDob()
    b.set = dob.set
    b.y = dob.y
    b.m = dob.m
    b.d = dob.d
    b.today = (dob.ty, dob.tm, dob.td)
    b.months = cached("months") { dob.months }
    b.sign = KLineGlyph(rawValue: dob.sign)
    c.dob = b

    c.pronoun = pronoun
    var f = KObFaces()
    f.items = cached("faces") { faces.map { KObFaceItem(id: $0.id, image: $0.image.ref, a11y: $0.a11y) } }
    f.selected = selectedFace
    if make.show {
      var m = KObMakeFace()
      m.state = KObMakeFace.State(rawValue: make.state) ?? .free
      m.image = make.image.ref
      m.id = make.id
      f.make = m
    }
    c.faces = f

    var e = KObEnvelope()
    e.hasUid = envelope.hasUid
    e.name = envelope.name
    e.frost = envelope.frost.spec
    e.face = envelope.face.ref
    e.hasFace = envelope.hasFace
    e.mark = KLineGlyph(rawValue: envelope.mark)
    e.sign = KLineGlyph(rawValue: envelope.sign)
    e.showMark = envelope.showMark
    e.showSign = envelope.showSign
    e.date = envelope.date
    e.envDate = envelope.envDate
    c.env = e

    var l = KObLetter()
    l.left = letter.left
    l.fill = letter.fill
    l.clean = letter.clean
    l.ready = letter.ready
    l.cueTurn = letter.cueTurn
    l.len = letter.len
    c.letter = l

    var s = KObStampState()
    s.shown = stampShown
    s.sections = cached("sections") {
      sections.enumerated().map { index, sec in
        KComposeStampSection(
          id: "\(index):\(sec.title)",
          title: sec.title,
          items: sec.items.map { item in
            KComposeStampItem(id: item.id, name: item.name, ink: kComposeColor(item.inkHex) ?? KTheme.classic.ink, accessibilityLabel: item.a11yLabel)
          },
          mark: sec.mark
        )
      }
    }
    c.stamp = s

    var h = KObHatch()
    h.flood = hatch.flood ? CGPoint(x: hatch.floodX, y: hatch.floodY) : nil
    h.hatched = hatch.hatched
    h.readS = hatch.readS
    c.hatch = h

    var n = KObName()
    n.chick = CGFloat(name.chick)
    n.ideas = cached("ideas") { name.ideas }
    n.typed = name.typed
    n.pronoun = name.pronoun
    n.reserved = name.reserved
    c.name = n

    c.refused = refused
    c.pieces = pieces.pieces(madeAt: madeAt)
    return c
  }
}

struct KOnboardingView: ExpoSwiftUI.View {
  @ObservedObject var props: KOnboardingViewProps

  var body: some View {
    KOnboardingScreen(
      content: props.content(),
      topInset: props.insets.top,
      bottomInset: props.insets.bottom,
      driver: props.driver,
      actions: props.actions
    ) {
      props.children?.kSlot("routeBird")
    } hatch: {
      props.children?.kSlot("hatch")
    } chick: {
      props.children?.kSlot("chick")
    } flight: {
      props.children?.kSlot("flight")
    }
    .kScreenEnvironment(props)
    .onKCommand(props.commands) { name, args in
      props.handle(name, args)
    }
  }
}

extension KOnboardingView: ExpoSwiftUI.FocusableView {
  /// Before the view goes: the keyboard away if one of our fields has it, then every field told
  /// it has lost focus (as KNoteComposeView does).
  func forceResignFirstResponder() {
    let driver = props.driver
    if driver.anyFocused {
      _ = UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
    driver.blurAll()
  }
}
