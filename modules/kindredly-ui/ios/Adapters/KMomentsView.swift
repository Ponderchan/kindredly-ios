import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 THREE FULL-SCREEN MOMENTS, as React Native sees them (2026-10-27), each behind its own switch
 (off by default) with its React Native piece as the fallback:

 - <KGrowthMomentView …/>  Wren's grow-up moment over the tabs (src/components/GrowthMomentNative.tsx,
                           "growthmoment") → Portable/Moments/KGrowthMoment.swift
 - <KIdentityNoteView …/>  the one-time identity note over the tabs (src/screens/edit-profile/
                           IdentityNoteNative.tsx, "identitynote") → Portable/Moments/KIdentityNote.swift
 - <KFirstFlightView …>    the first flight (src/components/FirstFlightNative.tsx, "firstflight")
                           → Portable/Moments/KFirstFlight.swift; its children are the islands
                           "bird", "head", "envelope" and "line" (KSlot)

 TS bindings: modules/kindredly-ui/src/Moments.tsx. Each turns props into Portable values and its
 taps into events; nothing is decided here. The props subclass KScreenProps for theme, letterFont
 and the shared image loader (kScreenEnvironment); the identity note also reads insets.bottom.
 Each sits in an @expo/ui <Host> (SurfaceHost) of its own that fills the moment.

 KGrowthMomentView
   startAt (ms), still, beats (GROWTH_BEATS + GROWTH_CURVES), oldBird, newBird ({ uri, key }),
   oldSize, newSize, mark, line, ok · event onGrowthClose
 KIdentityNoteView
   title, body, previewLabel, previewName, previewA11y, when, frost (KFrostRecord, v 0 = none),
   mark ("she" | "he" | ""), sign (a Zodiac id or ""), header, markSwitch { show, label, note, on },
   signSwitch, foot, done · events onNoteMark { on }, onNoteSign { on }, onNoteDone
 KFirstFlightView
   startAt (ms), still, scale, total (s), colors { ground, ink, sub, faint, line, card, pen, post },
   hasHead, title, titleEm, sub, opener, openerLines, carried, yourCity, chart, skip,
   stops [{ label, words }], stopWordsSize, loop (SVG d), home { x, y }, stopPoints [{ x, y }],
   trail [{ x, y, at }], curves, bird { t, x, y }, envelope { t, x, y }, envelopeW, envelopeH,
   hasEnvelope, hasLine · event onFlightSkip
 */

/// "#RRGGBB" from TS, or the fallback for anything else (Color(hex:) would draw magenta).
private func momentColor(_ hex: String, _ fallback: Color) -> Color {
  hex.count == 7 && hex.hasPrefix("#") ? Color(hex: hex) : fallback
}

// MARK: - Wren grows up

struct KGrowthBeatsRecord: Record {
  @Field var ground: Double = 300
  @Field var shakeAt: Double = 450
  @Field var shakeStep: Double = 110
  @Field var shake: [Double] = [-6, 6, -5, 5, -3, 0]
  @Field var outAt: Double = 1150
  @Field var outMs: Double = 220
  @Field var burstAt: Double = 1150
  @Field var burstMs: Double = 900
  @Field var popAt: Double = 1270
  @Field var popMs: Double = 520
  @Field var stampAt: Double = 1850
  @Field var stampMs: Double = 360
  @Field var wordsAt: Double = 2150
  @Field var wordsMs: Double = 300
  @Field var bobAt: Double = 2500
  @Field var bobMs: Double = 1200
  @Field var bobBy: Double = 5
  @Field var groundStill: Double = 250
  @Field var still: Double = 300
  @Field var burst: Int = 14
  @Field var burstCurve: [Double] = [0.2, 0.8, 0.3, 1]
  @Field var popCurve: [Double] = [0.3, 1.4, 0.5, 1]
  @Field var stampCurve: [Double] = [0.5, 0, 0.6, 1.4]

  var beats: KGrowthBeats {
    var b = KGrowthBeats()
    b.ground = ground
    b.shakeAt = shakeAt
    b.shakeStep = shakeStep
    b.shake = shake
    b.outAt = outAt
    b.outMs = outMs
    b.burstAt = burstAt
    b.burstMs = burstMs
    b.popAt = popAt
    b.popMs = popMs
    b.stampAt = stampAt
    b.stampMs = stampMs
    b.wordsAt = wordsAt
    b.wordsMs = wordsMs
    b.bobAt = bobAt
    b.bobMs = bobMs
    b.bobBy = bobBy
    b.groundStill = groundStill
    b.still = still
    b.burst = max(0, min(burst, 64))
    b.burstCurve = burstCurve
    b.popCurve = popCurve
    b.stampCurve = stampCurve
    return b
  }
}

final class KGrowthMomentViewProps: KScreenProps {
  @Field var startAt: Double = 0
  @Field var still: Bool = false
  @Field var beats: KGrowthBeatsRecord = KGrowthBeatsRecord()
  @Field var oldBird: KImageRefRecord = KImageRefRecord()
  @Field var newBird: KImageRefRecord = KImageRefRecord()
  @Field var oldSize: Double = 160
  @Field var newSize: Double = 190
  @Field var mark: String = ""
  @Field var line: String = ""
  @Field var ok: String = ""

  var onGrowthClose = EventDispatcher()

  /// when this view was made: the clock's start if TS sent none
  let madeAt = Date()

  var content: KGrowthMomentContent {
    KGrowthMomentContent(
      startAt: startAt > 0 ? Date(timeIntervalSince1970: startAt / 1000) : madeAt,
      still: still,
      beats: beats.beats,
      oldBird: oldBird.ref,
      newBird: newBird.ref,
      oldSize: CGFloat(oldSize),
      newSize: CGFloat(newSize),
      mark: mark,
      line: line,
      ok: ok
    )
  }
}

struct KGrowthMomentView: ExpoSwiftUI.View {
  @ObservedObject var props: KGrowthMomentViewProps

  var body: some View {
    KGrowthMoment(theme: props.kTheme, content: props.content) {
      props.onGrowthClose()
    }
    .kScreenEnvironment(props)
  }
}

// MARK: - The one-time identity note

struct KIdentityNoteSwitchRecord: Record {
  /// false: no such switch (the mark's, for they / unset)
  @Field var show: Bool = false
  @Field var label: String = ""
  @Field var note: String = ""
  @Field var on: Bool = false

  var value: KIdentityNoteSwitch? {
    show ? KIdentityNoteSwitch(label: label, note: note, on: on) : nil
  }
}

final class KIdentityNoteViewProps: KScreenProps {
  @Field var title: String = ""
  @Field var body: String = ""
  @Field var previewLabel: String = ""
  @Field var previewName: String = ""
  @Field var previewA11y: String = ""
  @Field var when: String = ""
  @Field var frost: KFrostRecord = KFrostRecord()
  @Field var mark: String = ""
  @Field var sign: String = ""
  @Field var header: String = ""
  @Field var markSwitch: KIdentityNoteSwitchRecord = KIdentityNoteSwitchRecord()
  @Field var signSwitch: KIdentityNoteSwitchRecord = KIdentityNoteSwitchRecord()
  @Field var foot: String = ""
  @Field var done: String = ""

  var onNoteMark = EventDispatcher()
  var onNoteSign = EventDispatcher()
  var onNoteDone = EventDispatcher()

  var content: KIdentityNoteContent {
    KIdentityNoteContent(
      title: title,
      body: body,
      previewLabel: previewLabel,
      previewName: previewName,
      previewA11y: previewA11y,
      when: when,
      frost: frost.spec,
      mark: KLineGlyph.mark(mark),
      sign: KLineGlyph.sign(sign),
      header: header,
      markSwitch: markSwitch.value,
      signSwitch: KIdentityNoteSwitch(label: signSwitch.label, note: signSwitch.note, on: signSwitch.on),
      foot: foot,
      done: done
    )
  }
}

struct KIdentityNoteView: ExpoSwiftUI.View {
  @ObservedObject var props: KIdentityNoteViewProps

  var body: some View {
    KIdentityNote(
      theme: props.kTheme,
      content: props.content,
      bottomInset: props.insets.bottom,
      actions: KIdentityNoteActions(
        onMark: { on in props.onNoteMark(["on": on]) },
        onSign: { on in props.onNoteSign(["on": on]) },
        onDone: { props.onNoteDone() }
      )
    )
    .kScreenEnvironment(props)
  }
}

// MARK: - The first flight

struct KFirstFlightColorsRecord: Record {
  @Field var ground: String = ""
  @Field var ink: String = ""
  @Field var sub: String = ""
  @Field var faint: String = ""
  @Field var line: String = ""
  @Field var card: String = ""
  @Field var pen: String = ""
  @Field var post: String = ""

  func colors(_ theme: KTheme) -> KFirstFlightColors {
    KFirstFlightColors(
      ground: momentColor(ground, theme.lav2),
      ink: momentColor(ink, theme.ink),
      sub: momentColor(sub, theme.sub),
      faint: momentColor(faint, theme.mute),
      line: momentColor(line, theme.ln),
      card: momentColor(card, theme.sf),
      pen: momentColor(pen, theme.ind),
      post: momentColor(post, KBrand.postRed)
    )
  }
}

struct KFirstFlightCurveRecord: Record {
  @Field var t: [Double] = []
  @Field var v: [Double] = []

  /// the record's curve, or the default when TS sent none that can be read
  func curve(or fallback: KFirstFlightCurve) -> KFirstFlightCurve {
    t.isEmpty || t.count != v.count ? fallback : KFirstFlightCurve(t: t, v: v)
  }
}

struct KFirstFlightCurvesRecord: Record {
  @Field var cardFold: KFirstFlightCurveRecord = KFirstFlightCurveRecord()
  @Field var cardFade: KFirstFlightCurveRecord = KFirstFlightCurveRecord()
  @Field var envFade: KFirstFlightCurveRecord = KFirstFlightCurveRecord()
  @Field var envScale: KFirstFlightCurveRecord = KFirstFlightCurveRecord()
  @Field var envTurn: KFirstFlightCurveRecord = KFirstFlightCurveRecord()
  @Field var title: KFirstFlightCurveRecord = KFirstFlightCurveRecord()
  @Field var chart: KFirstFlightCurveRecord = KFirstFlightCurveRecord()
  @Field var birdScale: KFirstFlightCurveRecord = KFirstFlightCurveRecord()
  @Field var birdTurn: KFirstFlightCurveRecord = KFirstFlightCurveRecord()
  @Field var trayFade: KFirstFlightCurveRecord = KFirstFlightCurveRecord()
  @Field var trayRise: KFirstFlightCurveRecord = KFirstFlightCurveRecord()
  @Field var trailLead: Double = 0.02
  @Field var trailPeak: Double = 0.7
  @Field var trailHold: Double = 2.9
  @Field var trailEnd: Double = 0.3

  var curves: KFirstFlightCurves {
    var c = KFirstFlightCurves()
    c.cardFold = cardFold.curve(or: c.cardFold)
    c.cardFade = cardFade.curve(or: c.cardFade)
    c.envFade = envFade.curve(or: c.envFade)
    c.envScale = envScale.curve(or: c.envScale)
    c.envTurn = envTurn.curve(or: c.envTurn)
    c.title = title.curve(or: c.title)
    c.chart = chart.curve(or: c.chart)
    c.birdScale = birdScale.curve(or: c.birdScale)
    c.birdTurn = birdTurn.curve(or: c.birdTurn)
    c.trayFade = trayFade.curve(or: c.trayFade)
    c.trayRise = trayRise.curve(or: c.trayRise)
    c.trailLead = trailLead
    c.trailPeak = trailPeak
    c.trailHold = trailHold
    c.trailEnd = trailEnd
    return c
  }
}

struct KFirstFlightTrackRecord: Record {
  @Field var t: [Double] = []
  @Field var x: [Double] = []
  @Field var y: [Double] = []

  var track: KFirstFlightTrack { KFirstFlightTrack(t: t, x: x, y: y) }
}

struct KFirstFlightPointRecord: Record {
  @Field var x: Double = 0
  @Field var y: Double = 0
  @Field var at: Double = 0

  var cg: CGPoint { CGPoint(x: x, y: y) }
}

struct KFirstFlightStopRecord: Record {
  @Field var label: String = ""
  @Field var words: String = ""
}

final class KFirstFlightViewProps: KScreenProps {
  @Field var startAt: Double = 0
  @Field var still: Bool = false
  @Field var scale: Double = 1
  @Field var total: Double = 3.05
  @Field var colors: KFirstFlightColorsRecord = KFirstFlightColorsRecord()
  @Field var hasHead: Bool = false
  @Field var title: String = ""
  @Field var titleEm: String = ""
  @Field var sub: String = ""
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
  @Field var envelopeW: Double = 120
  @Field var envelopeH: Double = 80
  @Field var hasEnvelope: Bool = false
  @Field var hasLine: Bool = false

  var onFlightSkip = EventDispatcher()

  /// when this view was made: the clock's start if TS sent none
  let madeAt = Date()

  var content: KFirstFlightContent {
    let theme = kTheme
    return KFirstFlightContent(
      startAt: startAt > 0 ? Date(timeIntervalSince1970: startAt / 1000) : madeAt,
      still: still,
      scale: scale > 0 ? CGFloat(scale) : 1,
      total: total > 0 ? total : 3.05,
      colors: colors.colors(theme),
      hasHead: hasHead,
      title: title,
      titleEm: titleEm,
      sub: sub,
      opener: opener,
      openerLines: openerLines,
      carried: carried,
      yourCity: yourCity,
      chart: chart,
      skip: skip,
      stops: stops.map { KFirstFlightStop(label: $0.label, words: $0.words) },
      stopWordsSize: CGFloat(stopWordsSize),
      loop: loop,
      home: home.cg,
      stopPoints: stopPoints.map(\.cg),
      trail: trail.map { KFirstFlightPoint(x: CGFloat($0.x), y: CGFloat($0.y), at: $0.at) },
      curves: curves.curves,
      bird: bird.track,
      envelope: envelope.track,
      envelopeSize: CGSize(width: max(1, envelopeW), height: max(1, envelopeH)),
      hasEnvelope: hasEnvelope,
      hasLine: hasLine
    )
  }
}

struct KFirstFlightView: ExpoSwiftUI.View {
  @ObservedObject var props: KFirstFlightViewProps

  var body: some View {
    KFirstFlight(theme: props.kTheme, content: props.content, onSkip: { props.onFlightSkip() }) { name in
      props.children?.kSlot(name)
    }
    .kScreenEnvironment(props)
  }
}
