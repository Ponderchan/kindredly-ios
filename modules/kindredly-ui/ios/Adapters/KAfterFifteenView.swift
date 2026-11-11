import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 TODAY, AFTER FIFTEEN as React Native sees it (docs/today-after-fifteen.md): <KAfterFifteenView … />
 (modules/kindredly-ui/src/AfterFifteen.tsx), drawn by src/screens/today/AfterFifteenNative.tsx in
 one full-screen Host on the Today tab once the day's last letter has gone past and the
 "afterfifteen" switch is on. This file turns records into Portable values and taps into events;
 the pages are Portable/Today/After (KAfterScreen) and know nothing about Expo. Built as every
 step-5 screen is (KScreenProps: theme, letterFont, insets, rev). No text field, no commands.

 Props, beyond KScreenProps (insets.top the status bar, insets.tabBarRoom the floating bar's room):
 - page: "box" | "receipt" | "bedtime"
 - title: "Today"
 - look: KWrenLookRecord (Adapters/KMePlanetView.swift): who she is; the pages set her mood and pose
 - thing: { isLine, tag, body, foot, keep, kept, keepStub, keptStub, isKept, keepHint }
 - strip: { canPlay, eyebrow, title, hint }
 - box: { line, sub, hint, pinned, slot, slotOpening, slotA11y, eyebrow, closed, back, countdown,
          pull, lift, pullA11y, liftA11y, shut }
 - receipt: { line, shop, stampLine, rows: [{ id, label, value, strong, unshared }], delivery: [same],
              print, printing, tear, share, phase ("idle" | "printed" | "torn"), a11y }
 - bed: { sayIdle, sayFed, sayFull, sayPat, sayNeedSnack, sayNeedPat, snack / pat / lights:
          { label, sub, subDone }, lockedSub, sleepTag, streak, streakSub, streakDone, streakSubDone,
          next, nextAt, dots: [{ id, letter, on, tonight }], dotsA11y, dotsA11yDone, birdA11y,
          fed, patted, asleep }
 - undo, undoHint: the Undo capsule's word while the last pass can be taken back ("" = none)
 Converted once per rev (useRev in TS).

 Events:
 - onAfterSlot {}                 the mailbox's slot: write a letter
 - onAfterShut { shut }           the cord
 - onAfterKeep { keep }           Keep (true) or its undoing
 - onAfterReceipt { phase }       "printed" | "torn"
 - onAfterShare { uri }           the receipt's picture in tmp ("" when it couldn't be made)
 - onAfterStep { step }           "snack" | "pat" | "lights"
 - onAfterPlay {}                 the strip
 - onAfterUndo {}                 Undo

 This file imports ExpoUI, so no bare Button / Text / Image / Label is written here.
 */

struct KAfterThingRecord: Record {
  @Field var isLine: Bool = false
  @Field var tag: String = ""
  @Field var body: String = ""
  @Field var foot: String = ""
  @Field var keep: String = ""
  @Field var kept: String = ""
  @Field var keepStub: String = ""
  @Field var keptStub: String = ""
  @Field var isKept: Bool = false
  @Field var keepHint: String = ""

  var thing: KAfterThing {
    var t = KAfterThing()
    t.isLine = isLine
    t.tag = tag
    t.body = body
    t.foot = foot
    t.keep = keep
    t.kept = kept
    t.keepStub = keepStub
    t.keptStub = keptStub
    t.isKept = isKept
    t.keepHint = keepHint
    return t
  }
}

struct KAfterStripRecord: Record {
  @Field var canPlay: Bool = true
  @Field var eyebrow: String = ""
  @Field var title: String = ""
  @Field var hint: String = ""

  var strip: KAfterStrip {
    var s = KAfterStrip()
    s.canPlay = canPlay
    s.eyebrow = eyebrow
    s.title = title
    s.hint = hint
    return s
  }
}

struct KAfterBoxRecord: Record {
  @Field var line: String = ""
  @Field var sub: String = ""
  @Field var hint: String = ""
  @Field var pinned: String = ""
  @Field var slot: String = ""
  @Field var slotOpening: String = ""
  @Field var slotA11y: String = ""
  @Field var eyebrow: String = ""
  @Field var closed: String = ""
  @Field var back: String = ""
  @Field var countdown: String = ""
  @Field var pull: String = ""
  @Field var lift: String = ""
  @Field var pullA11y: String = ""
  @Field var liftA11y: String = ""
  @Field var shut: Bool = false

  var box: KAfterBox {
    var b = KAfterBox()
    b.line = line
    b.sub = sub
    b.hint = hint
    b.pinned = pinned
    b.slot = slot
    b.slotOpening = slotOpening
    b.slotA11y = slotA11y
    b.eyebrow = eyebrow
    b.closed = closed
    b.back = back
    b.countdown = countdown
    b.pull = pull
    b.lift = lift
    b.pullA11y = pullA11y
    b.liftA11y = liftA11y
    b.shut = shut
    return b
  }
}

struct KAfterRowRecord: Record {
  @Field var id: String = ""
  @Field var label: String = ""
  @Field var value: String = ""
  @Field var strong: Bool = false
  @Field var unshared: Bool = false
}

struct KAfterReceiptRecord: Record {
  @Field var line: String = ""
  @Field var shop: String = ""
  @Field var stampLine: String = ""
  @Field var rows: [KAfterRowRecord] = []
  @Field var delivery: [KAfterRowRecord] = []
  @Field var print: String = ""
  @Field var printing: String = ""
  @Field var tear: String = ""
  @Field var share: String = ""
  @Field var phase: String = "idle"
  @Field var a11y: String = ""

  private func converted(_ list: [KAfterRowRecord]) -> [KAfterRow] {
    var seen = Set<String>()
    return list.compactMap { r in
      guard !r.id.isEmpty, seen.insert(r.id).inserted else { return nil }
      return KAfterRow(id: r.id, label: r.label, value: r.value, strong: r.strong, unshared: r.unshared)
    }
  }

  var receipt: KAfterReceipt {
    var r = KAfterReceipt()
    r.line = line
    r.shop = shop
    r.stampLine = stampLine
    r.rows = converted(rows)
    r.delivery = converted(delivery)
    r.print = print
    r.printing = printing
    r.tear = tear
    r.share = share
    r.phase = KAfterReceiptPhase(rawValue: phase) ?? .idle
    r.a11y = a11y
    return r
  }
}

struct KAfterStepRecord: Record {
  @Field var label: String = ""
  @Field var sub: String = ""
  @Field var subDone: String = ""

  var step: KAfterStep { KAfterStep(label: label, sub: sub, subDone: subDone) }
}

struct KAfterDotRecord: Record {
  @Field var id: String = ""
  @Field var letter: String = ""
  @Field var on: Bool = false
  @Field var tonight: Bool = false
}

struct KAfterBedRecord: Record {
  @Field var sayIdle: String = ""
  @Field var sayFed: String = ""
  @Field var sayFull: String = ""
  @Field var sayPat: String = ""
  @Field var sayNeedSnack: String = ""
  @Field var sayNeedPat: String = ""
  @Field var snack: KAfterStepRecord = KAfterStepRecord()
  @Field var pat: KAfterStepRecord = KAfterStepRecord()
  @Field var lights: KAfterStepRecord = KAfterStepRecord()
  @Field var lockedSub: String = ""
  @Field var sleepTag: String = ""
  @Field var streak: String = ""
  @Field var streakSub: String = ""
  @Field var streakDone: String = ""
  @Field var streakSubDone: String = ""
  @Field var next: String = ""
  @Field var nextAt: String = ""
  @Field var dots: [KAfterDotRecord] = []
  @Field var dotsA11y: String = ""
  @Field var dotsA11yDone: String = ""
  @Field var birdA11y: String = ""
  @Field var fed: Bool = false
  @Field var patted: Bool = false
  @Field var asleep: Bool = false

  var bed: KAfterBed {
    var b = KAfterBed()
    b.sayIdle = sayIdle
    b.sayFed = sayFed
    b.sayFull = sayFull
    b.sayPat = sayPat
    b.sayNeedSnack = sayNeedSnack
    b.sayNeedPat = sayNeedPat
    b.snack = snack.step
    b.pat = pat.step
    b.lights = lights.step
    b.lockedSub = lockedSub
    b.sleepTag = sleepTag
    b.streak = streak
    b.streakSub = streakSub
    b.streakDone = streakDone
    b.streakSubDone = streakSubDone
    b.next = next
    b.nextAt = nextAt
    var seen = Set<String>()
    b.dots = dots.compactMap { d in
      guard !d.id.isEmpty, seen.insert(d.id).inserted else { return nil }
      return KAfterDot(id: d.id, letter: d.letter, on: d.on, tonight: d.tonight)
    }
    b.dotsA11y = dotsA11y
    b.dotsA11yDone = dotsA11yDone
    b.birdA11y = birdA11y
    b.fed = fed
    b.patted = patted
    b.asleep = asleep
    return b
  }
}

final class KAfterFifteenViewProps: KScreenProps {
  @Field var page: String = "box"
  @Field var title: String = ""
  @Field var look: KWrenLookRecord = KWrenLookRecord()
  @Field var thing: KAfterThingRecord = KAfterThingRecord()
  @Field var strip: KAfterStripRecord = KAfterStripRecord()
  @Field var box: KAfterBoxRecord = KAfterBoxRecord()
  @Field var receipt: KAfterReceiptRecord = KAfterReceiptRecord()
  @Field var bed: KAfterBedRecord = KAfterBedRecord()
  @Field var undo: String = ""
  @Field var undoHint: String = ""

  var onAfterSlot = EventDispatcher()
  var onAfterShut = EventDispatcher()
  var onAfterKeep = EventDispatcher()
  var onAfterReceipt = EventDispatcher()
  var onAfterShare = EventDispatcher()
  var onAfterStep = EventDispatcher()
  var onAfterPlay = EventDispatcher()
  var onAfterUndo = EventDispatcher()

  private(set) lazy var actions: KAfterActions = {
    let a = KAfterActions()
    a.onSlot = { [weak self] in self?.onAfterSlot() }
    a.onShut = { [weak self] shut in self?.onAfterShut(["shut": shut]) }
    a.onKeep = { [weak self] keep in self?.onAfterKeep(["keep": keep]) }
    a.onReceipt = { [weak self] phase in self?.onAfterReceipt(["phase": phase.rawValue]) }
    a.onShare = { [weak self] uri in self?.onAfterShare(["uri": uri]) }
    a.onStep = { [weak self] step in self?.onAfterStep(["step": step]) }
    a.onPlay = { [weak self] in self?.onAfterPlay() }
    a.onUndo = { [weak self] in self?.onAfterUndo() }
    return a
  }()

  /// Everything the page shows, converted once per rev.
  var content: KAfterContent {
    cached("content") {
      var c = KAfterContent()
      c.page = KAfterPage(rawValue: page) ?? .box
      c.title = title
      c.look = look.look
      c.thing = thing.thing
      c.strip = strip.strip
      c.box = box.box
      c.receipt = receipt.receipt
      c.bed = bed.bed
      c.undo = undo
      c.undoHint = undoHint
      return c
    }
  }
}

struct KAfterFifteenView: ExpoSwiftUI.View {
  @ObservedObject var props: KAfterFifteenViewProps

  var body: some View {
    let insets = props.insets
    return KAfterScreen(
      theme: props.kTheme,
      content: props.content,
      topInset: insets.top,
      bottomInset: insets.tabBarRoom,
      actions: props.actions
    )
    .kScreenEnvironment(props)
  }
}
