import SwiftUI
import UIKit
import ExpoModulesCore
import ExpoUI

/*
 THE WRAPPED MONTHLY REPORT, AS REACT NATIVE SEES IT (owner, 2026-10-31): a screen view like every
 step-5 screen (KScreenProps.swift), registered with ExpoUIView and the "command" AsyncFunction in
 KindredlyUIModule.swift, alone in one @expo/ui <Host> (SurfaceHost), behind the "reportwrapped"
 switch (off by default; app/report.tsx keeps the Voice report as its fallback). The screen is
 Portable/Pages/KWrappedReportScreen.swift; TS is modules/kindredly-ui/src/WrappedReport.tsx and
 src/screens/report/WrappedReportNative.tsx.

 KWrappedReportView
 - strings: { [field]: String } — every word, by wrapped-core WrappedView's field names, plus
   "eyebrow.<card>", "lineSt1", "lineSt2", and the four counts as text (letters, desks, replies,
   kindreds)
 - loaded: Bool; failed, retry: String; template: "A" | "B"; busy: Bool
 - cards: [cover | far | line | vibe | hour | click | share | next]
 - tags: [{ id, tag, sub, rank }]; changes: [String]; buckets: [Int] (24); hourStart: Int;
   hourNight: Bool; locked: Bool
 - stamp, pairStamp, standing, curious, delight, fly, sleepy: image refs
 Events: onWrClose {}, onWrShare { uri }, onWrCompare {}, onWrSwitch {}, onWrRead {}, onWrWrite {},
 onWrUnlock {}, onWrRetry {}, onWrCard { index, dark }
 */

struct KWrappedTagRecord: Record {
  @Field var id: String = ""
  @Field var tag: String = ""
  @Field var sub: String = ""
  @Field var rank: String = ""
}

final class KWrappedReportViewProps: KScreenProps {
  @Field var strings: [String: String] = [:]
  @Field var loaded: Bool = false
  @Field var failed: String = ""
  @Field var retry: String = ""
  @Field var template: String = "B"
  @Field var busy: Bool = false
  @Field var cards: [String] = []
  @Field var tags: [KWrappedTagRecord] = []
  @Field var changes: [String] = []
  @Field var buckets: [Int] = []
  @Field var hourStart: Int = 0
  @Field var hourNight: Bool = false
  @Field var locked: Bool = false
  @Field var stamp: KImageRefRecord = KImageRefRecord()
  @Field var pairStamp: KImageRefRecord = KImageRefRecord()
  @Field var standing: KImageRefRecord = KImageRefRecord()
  @Field var curious: KImageRefRecord = KImageRefRecord()
  @Field var delight: KImageRefRecord = KImageRefRecord()
  @Field var fly: KImageRefRecord = KImageRefRecord()
  @Field var sleepy: KImageRefRecord = KImageRefRecord()

  var onWrClose = EventDispatcher()
  var onWrShare = EventDispatcher()
  var onWrCompare = EventDispatcher()
  var onWrSwitch = EventDispatcher()
  var onWrRead = EventDispatcher()
  var onWrWrite = EventDispatcher()
  var onWrUnlock = EventDispatcher()
  var onWrRetry = EventDispatcher()
  var onWrCard = EventDispatcher()

  private(set) lazy var actions: KWrappedActions = {
    let a = KWrappedActions()
    a.onClose = { [weak self] in self?.onWrClose() }
    a.onShare = { [weak self] uri in self?.onWrShare(["uri": uri]) }
    a.onCompare = { [weak self] in self?.onWrCompare() }
    a.onSwitchStyle = { [weak self] in self?.onWrSwitch() }
    a.onReadTheirs = { [weak self] in self?.onWrRead() }
    a.onWrite = { [weak self] in self?.onWrWrite() }
    a.onUnlock = { [weak self] in self?.onWrUnlock() }
    a.onRetry = { [weak self] in self?.onWrRetry() }
    a.onCard = { [weak self] index, dark in self?.onWrCard(["index": index, "dark": dark]) }
    return a
  }()

  var content: KWrappedContent {
    cached("content") {
      var c = KWrappedContent()
      c.loaded = loaded
      c.failed = failed
      c.retry = retry
      c.template = KWrappedTemplate(rawValue: template) ?? .b
      c.busy = busy
      var seen = Set<KWrappedCard>()
      c.cards = cards.compactMap { KWrappedCard(rawValue: $0) }.filter { seen.insert($0).inserted }
      c.s = strings
      c.tags = tags.map { KWrappedTagItem(id: $0.id, tag: $0.tag, sub: $0.sub, rank: $0.rank) }
      c.changes = changes
      c.buckets = buckets.count == 24 ? buckets : Array(repeating: 0, count: 24)
      c.hourStart = ((hourStart % 24) + 24) % 24
      c.hourNight = hourNight
      c.locked = locked
      var images: [String: KImageRef] = [:]
      for (key, rec) in [("stamp", stamp), ("pairStamp", pairStamp), ("standing", standing), ("curious", curious), ("delight", delight), ("fly", fly), ("sleepy", sleepy)] {
        if !rec.uri.isEmpty, let ref = rec.ref { images[key] = ref }
      }
      c.images = images
      return c
    }
  }
}

struct KWrappedReportView: ExpoSwiftUI.View {
  @ObservedObject var props: KWrappedReportViewProps

  var body: some View {
    let insets = props.insets
    return KWrappedReportScreen(
      content: props.content,
      topInset: insets.top,
      bottomInset: insets.bottom,
      actions: props.actions
    )
    .kScreenEnvironment(props)
  }
}
