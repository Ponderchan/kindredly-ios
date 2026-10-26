import SwiftUI
import UIKit
import ExpoModulesCore
import ExpoUI

/*
 MAKE YOUR OWN FACE as React Native sees it: <KMakeFaceView … /> on the JS side
 (modules/kindredly-ui/src/MakeFace.tsx), drawn by src/screens/make-face/MakeFaceNative.tsx in one
 full-screen Host that keeps the keyboard's safe area (SurfaceHost field: the words screen holds
 a text field), on the transparent route src/app/make-face.tsx. This file turns records into
 Portable values and taps into events; the page itself is Portable/MakeFace/KMakeFacePage.swift
 and knows nothing about Expo.

 Built as every step-5 screen is (KScreenProps.swift; registered in KindredlyUIModule.swift with
 the "command" AsyncFunction), inside ONE @expo/ui <Host>. It holds a text field, so it is an
 ExpoSwiftUI.FocusableView (the expo focus/unmount crash's guard), as KNoteComposeView is.

 Props, beyond KScreenProps (insets: top = the status bar, bottom = the home indicator):
 - strings: KMakeFaceStringsRecord (every word, resolved for the screen by TS)
 - screen: intro | method | confirm | words | generating | result | done | rejected | failed |
   quota | signin;  entry: onboarding | me
 - minor, firstClass, appleAvailable, busy, wordsMax
 - photo, result, quotaFace: KImageRefRecord (uri "" for none)
 - chips: [{ id, title, chips: [{ id, label }] }], converted once per rev
 - genLines: [String]
 - children: <KIsland name="wren"> (WrenBird, sized by TS to KMakeFacePage.wrenSize(screen))

 Commands (KCommandBus): setText { target: "words", value } · focus { target: "words" } ·
 blur {} · reset {} (blurs).

 Events, with what nativeEvent carries:
 - onFaceClose {} · onFaceStart {} · onFaceMethod { kind: camera | library | words }
 - onFaceRetake {} · onFaceUsePhoto {} · onFaceDraw { text } · onFaceLeave {}
 - onFaceAccept {} · onFaceAnother {} · onFacePickInstead {} · onFaceDone {}
 - onFaceRetry {} · onFaceRejectPrimary {} · onFaceRejectSecondary {}
 - onFaceFirstClass {} · onFaceNotNow {} · onFaceApple {} · onFaceGoogle {} · onFaceLater {}

 Unknown enum strings fall back rather than fail (a screen this binary doesn't know is the intro;
 an entry is Me). This file imports ExpoUI, so no bare Button / Text / Image / Label is written here.
 */

struct KMakeFaceStringsRecord: Record {
  @Field var closeLabel: String = ""
  @Field var introLine: String = ""
  @Field var introSub: String = ""
  @Field var introPhoto: String = ""
  @Field var introQuota: String = ""
  @Field var go: String = ""
  @Field var methodTitle: String = ""
  @Field var camera: String = ""
  @Field var library: String = ""
  @Field var photoSub: String = ""
  @Field var wordsRow: String = ""
  @Field var wordsSub: String = ""
  @Field var at18: String = ""
  @Field var minorLine: String = ""
  @Field var confirmTitle: String = ""
  @Field var confirmGuide: String = ""
  @Field var retake: String = ""
  @Field var usePhoto: String = ""
  @Field var wordsTitle: String = ""
  @Field var wordsPlaceholder: String = ""
  @Field var draw: String = ""
  @Field var wordsLabel: String = ""
  @Field var genLeave: String = ""
  @Field var genLabel: String = ""
  @Field var resultLine: String = ""
  @Field var resultSub: String = ""
  @Field var resultLabel: String = ""
  @Field var accept: String = ""
  @Field var another: String = ""
  @Field var lock: String = ""
  @Field var instead: String = ""
  @Field var doneTag: String = ""
  @Field var doneLine: String = ""
  @Field var doneButton: String = ""
  @Field var rejectBadge: String = ""
  @Field var rejectLine: String = ""
  @Field var rejectSub: String = ""
  @Field var rejectPrimary: String = ""
  @Field var rejectSecondary: String = ""
  @Field var failedLine: String = ""
  @Field var failedSub: String = ""
  @Field var retry: String = ""
  @Field var notNow: String = ""
  @Field var quotaTag: String = ""
  @Field var quotaTitle: String = ""
  @Field var quotaSub: String = ""
  @Field var quotaCta: String = ""
  @Field var signinTitle: String = ""
  @Field var signinSub: String = ""
  @Field var apple: String = ""
  @Field var google: String = ""
  @Field var later: String = ""

  var strings: KMakeFaceStrings {
    var s = KMakeFaceStrings()
    s.closeLabel = closeLabel
    s.introLine = introLine
    s.introSub = introSub
    s.introPhoto = introPhoto
    s.introQuota = introQuota
    s.go = go
    s.methodTitle = methodTitle
    s.camera = camera
    s.library = library
    s.photoSub = photoSub
    s.wordsRow = wordsRow
    s.wordsSub = wordsSub
    s.at18 = at18
    s.minorLine = minorLine
    s.confirmTitle = confirmTitle
    s.confirmGuide = confirmGuide
    s.retake = retake
    s.usePhoto = usePhoto
    s.wordsTitle = wordsTitle
    s.wordsPlaceholder = wordsPlaceholder
    s.draw = draw
    s.wordsLabel = wordsLabel
    s.genLeave = genLeave
    s.genLabel = genLabel
    s.resultLine = resultLine
    s.resultSub = resultSub
    s.resultLabel = resultLabel
    s.accept = accept
    s.another = another
    s.lock = lock
    s.instead = instead
    s.doneTag = doneTag
    s.doneLine = doneLine
    s.doneButton = doneButton
    s.rejectBadge = rejectBadge
    s.rejectLine = rejectLine
    s.rejectSub = rejectSub
    s.rejectPrimary = rejectPrimary
    s.rejectSecondary = rejectSecondary
    s.failedLine = failedLine
    s.failedSub = failedSub
    s.retry = retry
    s.notNow = notNow
    s.quotaTag = quotaTag
    s.quotaTitle = quotaTitle
    s.quotaSub = quotaSub
    s.quotaCta = quotaCta
    s.signinTitle = signinTitle
    s.signinSub = signinSub
    s.apple = apple
    s.google = google
    s.later = later
    return s
  }
}

struct KMakeFaceChipRecord: Record {
  @Field var id: String = ""
  @Field var label: String = ""
}

struct KMakeFaceChipGroupRecord: Record {
  @Field var id: String = ""
  @Field var title: String = ""
  @Field var chips: [KMakeFaceChipRecord] = []
}

final class KMakeFaceViewProps: KScreenProps {
  @Field var strings: KMakeFaceStringsRecord = KMakeFaceStringsRecord()
  @Field var screen: String = "intro"
  @Field var entry: String = "me"
  @Field var minor: Bool = false
  @Field var firstClass: Bool = false
  @Field var appleAvailable: Bool = true
  @Field var busy: Bool = false
  @Field var wordsMax: Int = 120
  @Field var photo: KImageRefRecord = KImageRefRecord()
  @Field var result: KImageRefRecord = KImageRefRecord()
  @Field var quotaFace: KImageRefRecord = KImageRefRecord()
  @Field var chips: [KMakeFaceChipGroupRecord] = []
  @Field var genLines: [String] = []

  var onFaceClose = EventDispatcher()
  var onFaceStart = EventDispatcher()
  var onFaceMethod = EventDispatcher()
  var onFaceRetake = EventDispatcher()
  var onFaceUsePhoto = EventDispatcher()
  var onFaceDraw = EventDispatcher()
  var onFaceLeave = EventDispatcher()
  var onFaceAccept = EventDispatcher()
  var onFaceAnother = EventDispatcher()
  var onFacePickInstead = EventDispatcher()
  var onFaceDone = EventDispatcher()
  var onFaceRetry = EventDispatcher()
  var onFaceRejectPrimary = EventDispatcher()
  var onFaceRejectSecondary = EventDispatcher()
  var onFaceFirstClass = EventDispatcher()
  var onFaceNotNow = EventDispatcher()
  var onFaceApple = EventDispatcher()
  var onFaceGoogle = EventDispatcher()
  var onFaceLater = EventDispatcher()

  /// The words field: as long-lived as the view, like `commands`.
  let driver = KMakeFaceDriver()

  /// The page's taps, made once: each closure reaches this props object's events.
  private(set) lazy var actions: KMakeFaceActions = {
    let a = KMakeFaceActions()
    a.onClose = { [weak self] in self?.onFaceClose() }
    a.onStart = { [weak self] in self?.onFaceStart() }
    a.onMethod = { [weak self] kind in self?.onFaceMethod(["kind": kind.rawValue]) }
    a.onRetake = { [weak self] in self?.onFaceRetake() }
    a.onUsePhoto = { [weak self] in self?.onFaceUsePhoto() }
    a.onDraw = { [weak self] text in self?.onFaceDraw(["text": text]) }
    a.onLeave = { [weak self] in self?.onFaceLeave() }
    a.onAccept = { [weak self] in self?.onFaceAccept() }
    a.onAnother = { [weak self] in self?.onFaceAnother() }
    a.onPickInstead = { [weak self] in self?.onFacePickInstead() }
    a.onDone = { [weak self] in self?.onFaceDone() }
    a.onRetry = { [weak self] in self?.onFaceRetry() }
    a.onRejectPrimary = { [weak self] in self?.onFaceRejectPrimary() }
    a.onRejectSecondary = { [weak self] in self?.onFaceRejectSecondary() }
    a.onFirstClass = { [weak self] in self?.onFaceFirstClass() }
    a.onNotNow = { [weak self] in self?.onFaceNotNow() }
    a.onApple = { [weak self] in self?.onFaceApple() }
    a.onGoogle = { [weak self] in self?.onFaceGoogle() }
    a.onLater = { [weak self] in self?.onFaceLater() }
    return a
  }()

  /// One command from the bus (see the list at the top of the file).
  func handle(_ name: String, _ args: [String: Any]) {
    switch name {
    case KCommandName.setText:
      driver.words.setText(args.kString("value") ?? "")
    case KCommandName.focus:
      driver.words.focus()
    case KCommandName.blur, KCommandName.reset:
      driver.blurAll()
    default:
      break
    }
  }

  /// The page's content from the props; the chips are converted once per rev.
  func content() -> KMakeFaceContent {
    var c = KMakeFaceContent()
    c.screen = KMakeFaceScreen(rawValue: screen) ?? .intro
    c.entry = KMakeFaceEntry(rawValue: entry) ?? .me
    c.strings = strings.strings
    c.minor = minor
    c.firstClass = firstClass
    c.appleAvailable = appleAvailable
    c.busy = busy
    c.wordsMax = max(1, wordsMax)
    c.photo = photo.ref
    c.result = result.ref
    c.quotaFace = quotaFace.ref
    c.chips = cached("chips") {
      chips.map { g in
        KMakeFaceChipGroup(id: g.id, title: g.title, chips: g.chips.filter { !$0.id.isEmpty }.map { KMakeFaceChip(id: $0.id, label: $0.label) })
      }
    }
    c.genLines = genLines
    return c
  }
}

struct KMakeFaceView: ExpoSwiftUI.View {
  @ObservedObject var props: KMakeFaceViewProps

  var body: some View {
    KMakeFacePage(
      theme: props.kTheme,
      content: props.content(),
      topInset: props.insets.top,
      bottomInset: props.insets.bottom,
      driver: props.driver,
      actions: props.actions
    ) {
      props.children?.kSlot("wren")
    }
    .kScreenEnvironment(props)
    .onKCommand(props.commands) { name, args in
      props.handle(name, args)
    }
  }
}

extension KMakeFaceView: ExpoSwiftUI.FocusableView {
  /// Before the view goes: the keyboard away if our field has it, then the field told it has
  /// lost focus (as KNoteComposeView does).
  func forceResignFirstResponder() {
    let driver = props.driver
    if driver.anyFocused {
      _ = UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
    driver.blurAll()
  }
}
