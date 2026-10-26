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

  var onObEvent = EventDispatcher()

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
