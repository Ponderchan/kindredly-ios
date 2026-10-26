import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 THE NAME-TRADING CEREMONY'S SIGNED RITUAL, as React Native sees it (owner, 2026-10-26; 1.0.7):
 <KIntroRitualView … /> on the JS side (modules/kindredly-ui/src/IntroRitual.tsx), drawn by
 src/components/IntroductionRitualNative.tsx inside the introduction sheet, behind the
 "ceremony" switch. This file turns props into Portable values and the one action into an event;
 the ritual itself is Portable/Chat/KIntroRitual.swift.

 The props subclass KScreenProps for theme and letterFont (the typed signatures are in the
 reader's Letter font) and kScreenEnvironment's image loader (the faces and the courier are
 KImages); it takes no insets, rev or commands. It MUST sit in an @expo/ui <Host> (SurfaceHost),
 one for the ritual alone, with the height kIntroRitualHeight gives it.

 Props (every word, date and number is TS's):
 - startAt         Date.now() when the sheet opened, ms; every beat counts from it
 - still           Reduce Motion: the end state cross-fades in
 - holdable        their signature may be held
 - beats           SIGNED_BEATS (src/components/IntroductionRitual.tsx), ms
 - road            [{ mine, date }], oldest first
 - youLabel, themLabel, roadLine, chip, a11y, announce
 - stamp           the envelopes' stamp id ("" none); bird { uri, key } the courier ("" none)
 - mine, theirs    { courier, courierSize, name, typedUpright, face { kind, uri, key, overscan,
                     mask }, frost (KFrostRecord, v 0 = the veil), strokes [{ d, delay,
                     duration }] (empty: typed), vbX, vbY, vbW, vbH }
 - notice          { show, name, bg, fg, border, radius, tilt, slapTilt, shared }

 Event:
 - onRitualHold { x, y, width, height }   their signature was held (450ms): its slot, in the
                                          ritual's points from its top left corner
 */

struct KIntroRitualBeatsRecord: Record {
  @Field var road: Double = 380
  @Field var step: Double = 240
  @Field var fly: Double = 620
  @Field var windows: Double = 3400
  @Field var lift: Double = 3520
  @Field var liftMs: Double = 340
  @Field var wipe: Double = 3650
  @Field var wipeMs: Double = 600
  @Field var strikeTheirs: Double = 4250
  @Field var strikeMine: Double = 4370
  @Field var signTheirs: Double = 4600
  @Field var signTheirsMs: Double = 1000
  @Field var signMine: Double = 5600
  @Field var signMineMs: Double = 600
  @Field var bump: Double = 6250
  @Field var chip: Double = 6850
  @Field var notice: Double = 7300
  @Field var done: Double = 8000
  @Field var doneStill: Double = 1600

  var beats: KIntroRitualBeats {
    var b = KIntroRitualBeats()
    b.road = road
    b.step = step
    b.fly = fly
    b.windows = windows
    b.lift = lift
    b.liftMs = max(1, liftMs)
    b.wipe = wipe
    b.wipeMs = max(1, wipeMs)
    b.strikeTheirs = strikeTheirs
    b.strikeMine = strikeMine
    b.signTheirs = signTheirs
    b.signTheirsMs = signTheirsMs
    b.signMine = signMine
    b.signMineMs = signMineMs
    b.bump = bump
    b.chip = chip
    b.notice = notice
    b.done = done
    b.doneStill = doneStill
    return b
  }
}

struct KIntroRitualCrossingRecord: Record {
  @Field var mine: Bool = false
  @Field var date: String = ""
}

/// A face as TS sends it (faces.ts faceRecord): image | mosaic | veil | placeholder.
struct KIntroRitualFaceRecord: Record {
  @Field var kind: String = "placeholder"
  @Field var uri: String = ""
  @Field var key: String = ""
  @Field var overscan: Double = 0
  @Field var mask: Int = 0

  func source(_ theme: KTheme) -> KFaceSource {
    switch kind {
    case "image": return .image(KImageRef(uri: uri, key: key), overscan: CGFloat(overscan))
    case "mosaic": return .mosaic(mask: mask, tint: theme.ink)
    case "veil": return .veil
    default: return .placeholder
    }
  }
}

struct KIntroRitualStrokeRecord: Record {
  /// SVG path data, in PEN v1 box units
  @Field var d: String = ""
  @Field var delay: Double = 0
  @Field var duration: Double = 1
}

struct KIntroRitualSideRecord: Record {
  @Field var courier: String = ""
  @Field var courierSize: Double = 11
  @Field var name: String = ""
  @Field var typedUpright: Bool = false
  @Field var face: KIntroRitualFaceRecord = KIntroRitualFaceRecord()
  @Field var frost: KFrostRecord = KFrostRecord()
  @Field var strokes: [KIntroRitualStrokeRecord] = []
  @Field var vbX: Double = 0
  @Field var vbY: Double = 0
  @Field var vbW: Double = 0
  @Field var vbH: Double = 0

  func side(_ theme: KTheme) -> KIntroRitualSide {
    let drawn = strokes.filter { !$0.d.isEmpty }
    let signature: KIntroRitualSignature? = drawn.isEmpty || vbW <= 0 || vbH <= 0
      ? nil
      : KIntroRitualSignature(
        strokes: drawn.map { KIntroRitualSignature.Stroke(path: KSVGPath.path($0.d), delay: $0.delay, duration: $0.duration) },
        viewBox: CGRect(x: vbX, y: vbY, width: vbW, height: vbH)
      )
    return KIntroRitualSide(
      courier: courier,
      courierSize: CGFloat(courierSize),
      name: name,
      typedUpright: typedUpright,
      face: face.source(theme),
      frost: frost.spec,
      signature: signature
    )
  }
}

struct KIntroRitualNoticeRecord: Record {
  @Field var show: Bool = false
  @Field var name: String = ""
  @Field var bg: String = "#FFFFFF"
  @Field var fg: String = "#1E1B35"
  @Field var border: String = "#FFFFFF"
  @Field var radius: Double = 8
  @Field var tilt: Double = 0
  @Field var slapTilt: Double = 2
  @Field var shared: Bool = false

  var sticker: KIntroRitualSticker? {
    guard show, !name.isEmpty else { return nil }
    return KIntroRitualSticker(
      name: name,
      bg: Color(hex: bg),
      fg: Color(hex: fg),
      border: Color(hex: border),
      radius: CGFloat(radius),
      tilt: tilt,
      slapTilt: slapTilt,
      shared: shared
    )
  }
}

final class KIntroRitualViewProps: KScreenProps {
  @Field var startAt: Double = 0
  @Field var still: Bool = false
  @Field var holdable: Bool = false
  @Field var beats: KIntroRitualBeatsRecord = KIntroRitualBeatsRecord()
  @Field var road: [KIntroRitualCrossingRecord] = []
  @Field var youLabel: String = ""
  @Field var themLabel: String = ""
  @Field var roadLine: String = ""
  @Field var stamp: String = ""
  @Field var bird: KImageRefRecord = KImageRefRecord()
  @Field var mine: KIntroRitualSideRecord = KIntroRitualSideRecord()
  @Field var theirs: KIntroRitualSideRecord = KIntroRitualSideRecord()
  @Field var chip: String = ""
  @Field var notice: KIntroRitualNoticeRecord = KIntroRitualNoticeRecord()
  @Field var a11y: String = ""
  @Field var announce: String = ""

  var onRitualHold = EventDispatcher()

  /// when this view was made: the clock's start if TS sent none
  let madeAt = Date()

  var content: KIntroRitualContent {
    let theme = kTheme
    var c = KIntroRitualContent(mine: mine.side(theme), theirs: theirs.side(theme))
    c.beats = beats.beats
    c.startAt = startAt > 0 ? Date(timeIntervalSince1970: startAt / 1000) : madeAt
    c.still = still
    c.holdable = holdable
    c.road = road.map { KIntroRitualCrossing(mine: $0.mine, date: $0.date) }
    c.youLabel = youLabel
    c.themLabel = themLabel
    c.roadLine = roadLine
    c.stamp = stamp
    c.bird = bird.ref
    c.chip = chip
    c.notice = notice.sticker
    c.a11y = a11y
    c.announce = announce
    return c
  }
}

struct KIntroRitualView: ExpoSwiftUI.View {
  @ObservedObject var props: KIntroRitualViewProps

  var body: some View {
    KIntroRitual(theme: props.kTheme, content: props.content) { r in
      props.onRitualHold(["x": Double(r.minX), "y": Double(r.minY), "width": Double(r.width), "height": Double(r.height)])
    }
    .kScreenEnvironment(props)
  }
}
