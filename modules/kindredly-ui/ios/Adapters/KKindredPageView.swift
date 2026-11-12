import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 A KINDRED'S PAGE, AS REACT NATIVE SEES IT (2026-10-27, behind the "kindredpage" switch, off by
 default): <KKindredPageView … /> on the JS side (modules/kindredly-ui/src/KindredPage.tsx), drawn
 by src/screens/chat/KindredPageNative.tsx. A screen view like every step-5 screen
 (KScreenProps.swift: theme, letterFont, insets, rev, commands), registered with ExpoUIView and the
 "command" AsyncFunction in KindredlyUIModule.swift, alone in one @expo/ui <Host> (SurfaceHost).
 This file turns records into Portable values and taps into events; the page is
 Portable/Chat/KKindredPageScreen.swift and knows nothing of Expo. This file imports ExpoUI, whose
 public Button, Text and Image would make bare names ambiguous, so nothing of that kind is
 written here.

 Props (every word is TS's, src/screens/chat/kindred-page-view.ts):
 - strings   { title, backLabel, moreLabel ("" no ⋯), offlineTitle, offlineBody, missingBody,
               playLabel, pauseLabel, reportLabel, blockLabel }
 - state     loading | ready | offline | missing (an unknown one reads as loading)
 - face      { shape round | frost | tile | mosaic | veil, kind image | placeholder, uri, key,
               overscan, mask, frost (KFrostRecord, v 0 = none), stamp ("1ST" | "007" | ""), a11y }
 - person    { revealed, heading, mark, sign, headingA11y, sub, arrival, arrivalMask }
 - signed    { show, label, name, typedUpright, a11y, hint, holdable, path (SVG, PEN v1 box
               units; "" typed), boxW, boxH, baselineY, met }
 - learned   { show, label, moments, dims [{ key, label, score, line }], sealedLabel, sealed }
 - resonance { show, label, score, rows [{ key, label, mine, theirs, together, a11y }], close, far }
 - facts     [{ key, label, value, stamp, letterId }]
 - opening   { show, label, voice, duration, body, lines, who }
 - voiceUnavailable, talk ("" no TALK TO)
 Commands: playback { key, playing, positionS, durationS, at } (key "" = nothing playing), reset.
 Events: onKpBack {}, onKpMore {}, onKpTalk {}, onKpVoice {},
         onKpHold { x, y, width, height } (the held signature's slot, in the page's points),
         onKpSigAction { name: "report" | "block" } (VoiceOver's actions on the signature)
 */

struct KKindredPageStringsRecord: Record {
  @Field var title: String = ""
  @Field var backLabel: String = ""
  @Field var moreLabel: String = ""
  @Field var offlineTitle: String = ""
  @Field var offlineBody: String = ""
  @Field var missingBody: String = ""
  @Field var playLabel: String = ""
  @Field var pauseLabel: String = ""
  @Field var reportLabel: String = ""
  @Field var blockLabel: String = ""
}

struct KKindredPageFaceRecord: Record {
  @Field var shape: String = "veil"
  /// round: image | placeholder (faces.ts faceRecord)
  @Field var kind: String = "placeholder"
  @Field var uri: String = ""
  @Field var key: String = ""
  @Field var overscan: Double = 0
  @Field var mask: Int = 0
  @Field var frost: KFrostRecord = KFrostRecord()
  @Field var stamp: String = ""
  @Field var a11y: String = ""

  var face: KKindredFace {
    switch shape {
    case "round":
      return .round(kind == "image" ? .image(KImageRef(uri: uri, key: key), overscan: CGFloat(overscan)) : .placeholder)
    case "frost":
      // TS sends a window with this shape; none at all draws the neutral tile, never a blank
      return frost.spec.map { .frost($0) } ?? .tile
    case "tile":
      return .tile
    case "mosaic":
      return .mosaic(mask: mask)
    default:
      return .veil
    }
  }
}

struct KKindredPagePersonRecord: Record {
  @Field var revealed: Bool = false
  @Field var heading: String = ""
  /// "she" | "he" | "", and the star sign's name or "" (a kindred's only)
  @Field var mark: String = ""
  @Field var sign: String = ""
  @Field var headingA11y: String = ""
  @Field var sub: String = ""
  @Field var arrival: String = ""
  @Field var arrivalMask: Int = 0
}

struct KKindredPageSignedRecord: Record {
  @Field var show: Bool = false
  @Field var label: String = ""
  @Field var name: String = ""
  @Field var typedUpright: Bool = false
  @Field var a11y: String = ""
  @Field var hint: String = ""
  @Field var holdable: Bool = false
  @Field var path: String = ""
  @Field var boxW: Double = 1000
  @Field var boxH: Double = 320
  @Field var baselineY: Double = 230
  @Field var met: String = ""

  var signature: KKindredSignature? {
    guard show else { return nil }
    return KKindredSignature(
      label: label,
      name: name,
      typedUpright: typedUpright,
      a11y: a11y,
      hint: hint,
      holdable: holdable,
      path: path.isEmpty ? nil : KSVGPath.path(path),
      box: CGSize(width: max(1, boxW), height: max(1, boxH)),
      baselineY: CGFloat(baselineY),
      met: met
    )
  }
}

struct KKindredPageDimRecord: Record {
  @Field var key: String = ""
  @Field var label: String = ""
  @Field var score: Double = 0
  @Field var line: String = ""
}

struct KKindredPageLearnedRecord: Record {
  @Field var show: Bool = false
  @Field var label: String = ""
  @Field var moments: String = ""
  @Field var dims: [KKindredPageDimRecord] = []
  @Field var sealedLabel: String = ""
  @Field var sealed: String = ""

  var learned: KKindredLearned? {
    guard show else { return nil }
    var seen = Set<String>()
    let rows = dims.compactMap { d -> KKindredDim? in
      guard seen.insert(d.key).inserted else { return nil }
      return KKindredDim(id: d.key, label: d.label, score: d.score, line: d.line)
    }
    return KKindredLearned(label: label, moments: moments, dims: rows, sealedLabel: sealedLabel, sealed: sealed)
  }
}

struct KKindredPageTrackRecord: Record {
  @Field var key: String = ""
  @Field var label: String = ""
  @Field var mine: Double = 0
  @Field var theirs: Double = 0
  @Field var together: Bool = false
  @Field var a11y: String = ""
}

struct KKindredPageResonanceRecord: Record {
  @Field var show: Bool = false
  @Field var label: String = ""
  @Field var score: String = ""
  @Field var rows: [KKindredPageTrackRecord] = []
  @Field var close: String = ""
  @Field var far: String = ""

  var resonance: KKindredResonance? {
    guard show else { return nil }
    var seen = Set<String>()
    let tracks = rows.compactMap { r -> KKindredTrack? in
      guard seen.insert(r.key).inserted else { return nil }
      return KKindredTrack(id: r.key, label: r.label, mine: min(100, max(0, r.mine)), theirs: min(100, max(0, r.theirs)), together: r.together, a11y: r.a11y)
    }
    return KKindredResonance(label: label, score: score, rows: tracks, close: close, far: far)
  }
}

struct KKindredPageFactRecord: Record {
  @Field var key: String = ""
  @Field var label: String = ""
  @Field var value: String = ""
  @Field var stamp: String = ""
  @Field var letterId: String = ""
}

struct KKindredPageOpeningRecord: Record {
  @Field var show: Bool = false
  @Field var label: String = ""
  @Field var voice: Bool = false
  @Field var duration: String = ""
  @Field var body: String = ""
  @Field var lines: Int = 5
  @Field var who: String = ""

  var opening: KKindredOpening? {
    guard show else { return nil }
    return KKindredOpening(label: label, voice: voice, duration: duration, body: body, lines: lines, who: who)
  }
}

final class KKindredPageViewProps: KScreenProps {
  @Field var strings: KKindredPageStringsRecord = KKindredPageStringsRecord()
  @Field var state: String = "loading"
  @Field var face: KKindredPageFaceRecord = KKindredPageFaceRecord()
  @Field var person: KKindredPagePersonRecord = KKindredPagePersonRecord()
  @Field var signed: KKindredPageSignedRecord = KKindredPageSignedRecord()
  @Field var learned: KKindredPageLearnedRecord = KKindredPageLearnedRecord()
  @Field var resonance: KKindredPageResonanceRecord = KKindredPageResonanceRecord()
  @Field var facts: [KKindredPageFactRecord] = []
  @Field var opening: KKindredPageOpeningRecord = KKindredPageOpeningRecord()
  @Field var voiceUnavailable: Bool = false
  @Field var talk: String = ""

  var onKpBack = EventDispatcher()
  var onKpMore = EventDispatcher()
  var onKpTalk = EventDispatcher()
  var onKpVoice = EventDispatcher()
  var onKpHold = EventDispatcher()
  var onKpSigAction = EventDispatcher()

  /// the voice opening's playback: as long-lived as the view
  let driver = KKindredPageDriver()

  private(set) lazy var actions: KKindredPageActions = {
    let a = KKindredPageActions()
    a.onBack = { [weak self] in self?.onKpBack() }
    a.onMore = { [weak self] in self?.onKpMore() }
    a.onTalk = { [weak self] in self?.onKpTalk() }
    a.onVoice = { [weak self] in self?.onKpVoice() }
    a.onHold = { [weak self] r in
      self?.onKpHold(["x": Double(r.minX), "y": Double(r.minY), "width": Double(r.width), "height": Double(r.height)])
    }
    a.onSignatureAction = { [weak self] name in self?.onKpSigAction(["name": name]) }
    return a
  }()

  /// The page as KKindredPageScreen takes it: the signature (its path parsed), the groups and the
  /// facts converted once per rev; the small fields read as they are.
  var content: KKindredPageContent {
    var c = KKindredPageContent()
    let s = strings
    c.state = KKindredPageContent.State(rawValue: state) ?? .loading
    c.title = s.title
    c.backLabel = s.backLabel
    c.moreLabel = s.moreLabel
    c.offlineTitle = s.offlineTitle
    c.offlineBody = s.offlineBody
    c.missingBody = s.missingBody
    c.playLabel = s.playLabel
    c.pauseLabel = s.pauseLabel
    c.reportLabel = s.reportLabel
    c.blockLabel = s.blockLabel

    let f = face
    c.face = f.face
    c.stamp = KMemberStamp(f.stamp)
    c.faceA11y = f.a11y
    let p = person
    c.revealed = p.revealed
    c.heading = p.heading
    c.mark = KLineGlyph.mark(p.mark)
    c.sign = KLineGlyph.sign(p.sign)
    c.headingA11y = p.headingA11y
    c.sub = p.sub
    c.arrival = p.arrival
    c.arrivalMask = p.arrivalMask

    c.signed = cached("signed") { signed.signature }
    c.learned = cached("learned") { learned.learned }
    c.resonance = cached("resonance") { resonance.resonance }
    c.facts = cached("facts") {
      var seen = Set<String>()
      return facts.compactMap { r in
        guard !r.key.isEmpty, seen.insert(r.key).inserted else { return nil }
        return KKindredFact(id: r.key, label: r.label, value: r.value, stamp: r.stamp, letterId: r.letterId)
      }
    }
    c.opening = opening.opening
    c.voiceUnavailable = voiceUnavailable
    c.talk = talk
    return c
  }

  func handle(_ name: String, _ args: [String: Any]) {
    switch name {
    case KCommandName.playback:
      let key = args.kString("key") ?? ""
      driver.playback = key.isEmpty ? nil : KPlayback(
        playing: args.kBool("playing") ?? false,
        positionS: args.kDouble("positionS") ?? 0,
        durationS: args.kDouble("durationS") ?? 0,
        at: args.kDate("at") ?? Date()
      )
    case KCommandName.reset:
      driver.playback = nil
    default:
      break
    }
  }
}

struct KKindredPageView: ExpoSwiftUI.View {
  @ObservedObject var props: KKindredPageViewProps

  var body: some View {
    KKindredPageScreen(
      theme: props.kTheme,
      content: props.content,
      topInset: props.insets.top,
      bottomInset: props.insets.bottom,
      driver: props.driver,
      actions: props.actions
    )
    .kScreenEnvironment(props)
    .onKCommand(props.commands) { name, args in
      props.handle(name, args)
    }
  }
}
