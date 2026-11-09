import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 FOUR PIECES IN SWIFT (2026-11-09, the third Swift batch), each behind its own switch (off by
 default) with its React Native piece kept as the fallback. TS bindings in
 modules/kindredly-ui/src/FourPieces.tsx. Every word, number and rule is TS's; these turn records
 into Portable values and taps into events.

 KRatingAskView: the rating ask's sheet (Portable/Today/KRatingAsk.swift; "ratingask"), filling a
 Host inside the React Native Modal of src/components/RatingAsk.tsx. Props: review (B) or not (A),
 bottom (the room under the sheet), strings { cta, later, stamp, label, ps, say, reviewLabel, who },
 paragraphs, rows [{ label, value, warn }], stampBird, worryBird. Events: onAskTap {} ·
 onAskLater {}

 KFCReceiptView: the First Class receipt (Portable/Kit/KFCReceipt.swift; "fcreceipt"), filling a
 Host laid over the paywall by src/components/FirstClassWelcome.tsx. Props: words { first, gold,
 lav, title, body, go, close }, insets (top: the status bar, bottom: the home indicator). Events:
 onReceiptDone {} (the dim) · onReceiptWrite {} (Start writing)

 KChatHeaderView: a conversation's header on its own (Portable/Chat/KChatHeader.swift), drawn from
 the same record KConversationView takes. It is the binary's marker for "chatheader" (TS asks for
 it before it sends a revealed header to KConversationView, which an older binary would draw as
 the room's) and draws the header alone for a dev page. Props: header, insets.top. Event:
 onChatDock { action: back | page | more }

 KLetterInFlightView: the crossing on its own (Portable/Today/KLetterInFlight.swift), the marker
 for "inflight" (KLetterReaderView draws it at its foot from the same record) and a dev page's.
 Props: inflight (KLetterInFlightRecord), play (a new value flies her again).

 This file imports ExpoUI, whose public Button, Text and Image would make bare names ambiguous,
 so nothing of that kind is written here.
 */

// MARK: - the crossing (shared with KLetterReaderView)

/// The crossing as TS sends it (src/screens/today/LetterReaderNative.tsx); on: false keeps the
/// island.
struct KLetterInFlightRecord: Record {
  @Field var on: Bool = false
  /// who it flies to, in capitals; "" for nobody named
  @Field var to: String = ""
  /// the headwind line in capitals; "" while the send isn't slow
  @Field var slow: String = ""
  @Field var onItsWay: String = ""
  /// the crossing's length in ms
  @Field var cycleMs: Double = 930
  @Field var bird: KImageRefRecord = KImageRefRecord()
  @Field var stillBird: KImageRefRecord = KImageRefRecord()

  var content: KLetterInFlightContent {
    var c = KLetterInFlightContent()
    c.to = to
    c.slow = slow
    c.onItsWay = onItsWay
    c.cycle = cycleMs / 1000
    c.bird = bird.ref
    c.stillBird = stillBird.ref
    return c
  }
}

final class KLetterInFlightViewProps: KScreenProps {
  @Field var inflight: KLetterInFlightRecord = KLetterInFlightRecord()
  /// a new value starts the crossing again (a dev page's replay)
  @Field var play: Int = 0
}

struct KLetterInFlightView: ExpoSwiftUI.View {
  @ObservedObject var props: KLetterInFlightViewProps

  var body: some View {
    KLetterInFlight(theme: props.kTheme, content: props.inflight.content)
      .id(props.play)
      .frame(maxWidth: .infinity, alignment: .topLeading)
      .kScreenEnvironment(props)
  }
}

// MARK: - the rating ask

struct KRatingAskStringsRecord: Record {
  @Field var cta: String = ""
  @Field var later: String = ""
  @Field var stamp: String = ""
  @Field var label: String = ""
  @Field var ps: String = ""
  @Field var say: String = ""
  @Field var reviewLabel: String = ""
  @Field var who: String = ""
}

struct KRatingAskRowRecord: Record {
  @Field var label: String = ""
  @Field var value: String = ""
  @Field var warn: Bool = false
}

final class KRatingAskViewProps: KScreenProps {
  @Field var review: Bool = false
  @Field var bottom: Double = 8
  @Field var strings: KRatingAskStringsRecord = KRatingAskStringsRecord()
  @Field var paragraphs: [String] = []
  @Field var rows: [KRatingAskRowRecord] = []
  @Field var stampBird: KImageRefRecord = KImageRefRecord()
  @Field var worryBird: KImageRefRecord = KImageRefRecord()

  var onAskTap = EventDispatcher()
  var onAskLater = EventDispatcher()

  private(set) lazy var actions: KRatingAskActions = {
    let a = KRatingAskActions()
    a.onTap = { [weak self] in self?.onAskTap() }
    a.onLater = { [weak self] in self?.onAskLater() }
    return a
  }()

  var content: KRatingAskContent {
    var c = KRatingAskContent()
    c.review = review
    c.bottom = CGFloat(bottom)
    c.cta = strings.cta
    c.later = strings.later
    c.stamp = strings.stamp
    c.label = strings.label
    c.paragraphs = paragraphs
    c.ps = strings.ps
    c.say = strings.say
    c.reviewLabel = strings.reviewLabel
    c.who = strings.who
    c.rows = rows.map { KRatingAskRow(label: $0.label, value: $0.value, warn: $0.warn) }
    c.stampBird = stampBird.ref
    c.worryBird = worryBird.ref
    return c
  }
}

struct KRatingAskView: ExpoSwiftUI.View {
  @ObservedObject var props: KRatingAskViewProps

  var body: some View {
    KRatingAsk(theme: props.kTheme, content: props.content, actions: props.actions)
      .kScreenEnvironment(props)
  }
}

// MARK: - the First Class receipt

struct KFCReceiptWordsRecord: Record {
  @Field var first: String = ""
  @Field var gold: String = ""
  @Field var lav: String = ""
  @Field var title: String = ""
  @Field var body: String = ""
  @Field var go: String = ""
  @Field var close: String = ""
}

final class KFCReceiptViewProps: KScreenProps {
  @Field var words: KFCReceiptWordsRecord = KFCReceiptWordsRecord()

  var onReceiptDone = EventDispatcher()
  var onReceiptWrite = EventDispatcher()

  private(set) lazy var actions: KFCReceiptActions = {
    let a = KFCReceiptActions()
    a.onDone = { [weak self] in self?.onReceiptDone() }
    a.onWrite = { [weak self] in self?.onReceiptWrite() }
    return a
  }()

  var content: KFCReceiptContent {
    var c = KFCReceiptContent()
    c.first = words.first
    c.gold = words.gold
    c.lav = words.lav
    c.title = words.title
    c.body = words.body
    c.go = words.go
    c.closeLabel = words.close
    c.topInset = insets.top
    c.bottomInset = insets.bottom
    return c
  }
}

struct KFCReceiptView: ExpoSwiftUI.View {
  @ObservedObject var props: KFCReceiptViewProps

  var body: some View {
    KFCReceipt(theme: props.kTheme, content: props.content, actions: props.actions)
      .kScreenEnvironment(props)
  }
}

// MARK: - a conversation's header on its own

final class KChatHeaderViewProps: KScreenProps {
  @Field var header: KChatHeaderRecord = KChatHeaderRecord()

  var onChatDock = EventDispatcher()

  private(set) lazy var actions: KConversationActions = {
    let a = KConversationActions()
    a.onDock = { [weak self] action in self?.onChatDock(["action": action]) }
    return a
  }()
}

struct KChatHeaderView: ExpoSwiftUI.View {
  @ObservedObject var props: KChatHeaderViewProps

  var body: some View {
    let theme = props.kTheme
    Group {
      if let model = props.header.header(theme: theme) {
        KChatHeader(theme: theme, model: model, topInset: props.insets.top, actions: props.actions)
      }
    }
    .frame(maxWidth: .infinity, alignment: .top)
    .kScreenEnvironment(props)
  }
}
