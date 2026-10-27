import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 WREN'S INTRODUCTION, THE WHOLE SHEET, as React Native sees it (2026-10-27, behind the
 "introritual" switch, OFF by default): <KIntroductionView … /> on the JS side
 (modules/kindredly-ui/src/Introduction.tsx), drawn by src/components/IntroductionNative.tsx
 inside the introduction's page sheet. This file turns props into Portable values and the taps
 into events; the sheet is Portable/Chat/KIntroduction.swift, its mosaic ritual
 Portable/Chat/KIntroMosaicRitual.swift, its signed ritual the ceremony's KIntroRitual (whose
 records, in Adapters/KIntroRitualView.swift, it reuses).

 The props subclass KScreenProps for theme, letterFont and insets (bottom: the home indicator
 under TALK TO) and kScreenEnvironment's image loader; no rev or commands. It sits in its own
 @expo/ui <Host> (SurfaceHost) filling the sheet.

 Props (every word, date and number is TS's):
 - startAt, still, holdable           the clock's start (Date.now(), ms), Reduce Motion, holdable
 - title, closeLabel, wren, letter     the header, her snapshot ({ uri, key }) and her letter
 - kind                                "signed" (beats, mine, theirs: KIntroRitualView's records)
                                       or "mosaic" (mosaic)
 - road, youLabel, themLabel, roadLine, stamp, courier, chip, notice   both rituals' road and stickers
 - mosaic                              { beats, nameSteps, scraps, myMask, theirMask, myFace,
                                         theirFace, myName, otherName }
 - a11y, announce, reportLabel, blockLabel
 - noticedHead, noticedLine, noticedAt, knowYou, talkTo

 Events:
 - onInClose, onInTalk                 the ✕, TALK TO
 - onInHold { x, y, width, height }    their signature was held: its slot, in the sheet's points
 - onInAction { name }                 VoiceOver's "report" or "block" on the ritual
 */

struct KIntroMosaicBeatsRecord: Record {
  @Field var road: Double = 380
  @Field var step: Double = 240
  @Field var fly: Double = 620
  @Field var burst: Double = 3700
  @Field var burstMs: Double = 1100
  @Field var slap: Double = 4220
  @Field var name: Double = 4740
  @Field var typeLead: Double = 240
  @Field var typeStep: Double = 95
  @Field var joltAfter: Double = 80
  @Field var caretAfter: Double = 600
  @Field var bump: Double = 6240
  @Field var notice: Double = 7340
  @Field var done: Double = 8040
  @Field var end: Double = 8040

  var beats: KIntroMosaicBeats {
    var b = KIntroMosaicBeats()
    b.road = road
    b.step = step
    b.fly = max(1, fly)
    b.burst = burst
    b.burstMs = max(1, burstMs)
    b.slap = slap
    b.name = name
    b.typeLead = typeLead
    b.typeStep = max(1, typeStep)
    b.joltAfter = joltAfter
    b.caretAfter = caretAfter
    b.bump = bump
    b.notice = notice
    b.done = done
    b.end = max(end, done)
    return b
  }
}

struct KIntroMosaicScrapRecord: Record {
  @Field var x0: Double = 0
  @Field var y0: Double = 0
  @Field var ang: Double = 0
  @Field var dist: Double = 0
  @Field var spin: Double = 0
}

struct KIntroMosaicRecord: Record {
  @Field var beats: KIntroMosaicBeatsRecord = KIntroMosaicBeatsRecord()
  @Field var nameSteps: [String] = []
  @Field var scraps: [KIntroMosaicScrapRecord] = []
  @Field var myMask: Int = 0
  @Field var theirMask: Int = 0
  @Field var myFace: KIntroRitualFaceRecord = KIntroRitualFaceRecord()
  @Field var theirFace: KIntroRitualFaceRecord = KIntroRitualFaceRecord()
  @Field var myName: String = ""
  @Field var otherName: String = ""
}

final class KIntroductionViewProps: KScreenProps {
  @Field var startAt: Double = 0
  @Field var still: Bool = false
  @Field var holdable: Bool = false
  @Field var title: String = ""
  @Field var closeLabel: String = ""
  @Field var wren: KImageRefRecord = KImageRefRecord()
  @Field var letter: String = ""
  @Field var kind: String = "mosaic"
  @Field var road: [KIntroRitualCrossingRecord] = []
  @Field var youLabel: String = ""
  @Field var themLabel: String = ""
  @Field var roadLine: String = ""
  @Field var stamp: String = ""
  @Field var courier: KImageRefRecord = KImageRefRecord()
  @Field var chip: String = ""
  @Field var notice: KIntroRitualNoticeRecord = KIntroRitualNoticeRecord()
  @Field var beats: KIntroRitualBeatsRecord = KIntroRitualBeatsRecord()
  @Field var mine: KIntroRitualSideRecord = KIntroRitualSideRecord()
  @Field var theirs: KIntroRitualSideRecord = KIntroRitualSideRecord()
  @Field var mosaic: KIntroMosaicRecord = KIntroMosaicRecord()
  @Field var a11y: String = ""
  @Field var announce: String = ""
  @Field var reportLabel: String = ""
  @Field var blockLabel: String = ""
  @Field var noticedHead: String = ""
  @Field var noticedLine: String = ""
  @Field var noticedAt: Double = 0
  @Field var knowYou: String = ""
  @Field var talkTo: String = ""

  var onInClose = EventDispatcher()
  var onInTalk = EventDispatcher()
  var onInHold = EventDispatcher()
  var onInAction = EventDispatcher()

  /// when this view was made: the clock's start if TS sent none
  let madeAt = Date()

  private var start: Date {
    startAt > 0 ? Date(timeIntervalSince1970: startAt / 1000) : madeAt
  }

  private var crossings: [KIntroRitualCrossing] {
    road.map { KIntroRitualCrossing(mine: $0.mine, date: $0.date) }
  }

  private var signedRitual: KIntroRitualContent {
    let theme = kTheme
    var c = KIntroRitualContent(mine: mine.side(theme), theirs: theirs.side(theme))
    c.beats = beats.beats
    c.startAt = start
    c.still = still
    c.holdable = holdable
    c.road = crossings
    c.youLabel = youLabel
    c.themLabel = themLabel
    c.roadLine = roadLine
    c.stamp = stamp
    c.bird = courier.ref
    c.chip = chip
    c.notice = notice.sticker
    c.a11y = a11y
    c.announce = announce
    return c
  }

  private var mosaicRitual: KIntroMosaicContent {
    let theme = kTheme
    var c = KIntroMosaicContent()
    c.beats = mosaic.beats.beats
    c.startAt = start
    c.still = still
    c.road = crossings
    c.youLabel = youLabel
    c.themLabel = themLabel
    c.roadLine = roadLine
    c.stamp = stamp
    c.bird = courier.ref
    c.nameSteps = mosaic.nameSteps
    c.scraps = mosaic.scraps.map { KIntroMosaicScrap(x0: CGFloat($0.x0), y0: CGFloat($0.y0), ang: $0.ang, dist: CGFloat($0.dist), spin: $0.spin) }
    c.myMask = mosaic.myMask
    c.theirMask = mosaic.theirMask
    c.myFace = mosaic.myFace.source(theme)
    c.theirFace = mosaic.theirFace.source(theme)
    c.myName = mosaic.myName
    c.otherName = mosaic.otherName
    c.chip = chip
    c.notice = notice.sticker
    c.a11y = a11y
    return c
  }

  var content: KIntroductionContent {
    var c = KIntroductionContent(ritual: kind == "signed" ? .signed(signedRitual) : .mosaic(mosaicRitual))
    c.startAt = start
    c.still = still
    c.holdable = holdable
    c.bottomInset = insets.bottom
    c.title = title
    c.closeLabel = closeLabel
    c.wren = wren.ref
    c.body = letter
    c.a11y = a11y
    c.reportLabel = reportLabel
    c.blockLabel = blockLabel
    c.noticedHead = noticedHead
    c.noticedLine = noticedLine
    c.noticedAt = noticedAt
    c.knowYou = knowYou
    c.talkTo = talkTo
    return c
  }
}

struct KIntroductionView: ExpoSwiftUI.View {
  @ObservedObject var props: KIntroductionViewProps

  var body: some View {
    KIntroduction(
      theme: props.kTheme,
      content: props.content,
      onClose: { props.onInClose([:]) },
      onTalk: { props.onInTalk([:]) },
      onHold: { r in props.onInHold(["x": Double(r.minX), "y": Double(r.minY), "width": Double(r.width), "height": Double(r.height)]) },
      onAction: { name in props.onInAction(["name": name]) }
    )
    .kScreenEnvironment(props)
  }
}
