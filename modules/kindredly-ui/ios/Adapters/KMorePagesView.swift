import SwiftUI
import UIKit
import ExpoModulesCore
import ExpoUI

/*
 FIVE SMALL PAGES, AS REACT NATIVE SEES THEM (2026-10-27): the Voice report, Your Voice in detail,
 Unsent (drafts), the stamp album and Lore. Each is a screen view like every step-5 screen
 (KScreenProps.swift), registered with ExpoUIView and the "command" AsyncFunction in
 KindredlyUIModule.swift, alone in one @expo/ui <Host> (SurfaceHost). The screens are in
 Portable/Pages and know nothing of Expo. This file imports ExpoUI, whose public Button, Text and
 Image would make bare names ambiguous, so nothing of that kind is written here.

 KVoiceReportView (modules/kindredly-ui/src/VoiceReport.tsx, src/screens/report/VoiceReportNative.tsx)
 - strings: { eyebrowCover, eyebrowStars, eyebrowHour, eyebrowWords, eyebrowPunct, eyebrowQuote,
   eyebrowEnd, archetype, written, brightestTitle, brightest, hourBand, hourLine, firstWord,
   otherWords, wordsLine, topMark, breathe, quote, signature, brand, share, done, close }
 - loaded: Bool; cards: [cover | stars | hour | words | punct | quote | end]; chips: [String]
 - marks: [{ mark, pct, bar }]; sky, keepSky: { size, stars: [{ x, y, big, w }], links: [Int] }
 - bird: image ref
 Events: onVrShare {}, onVrDone {}

 KVoiceDetailView (src/VoiceDetail.tsx, src/screens/voice/VoiceDetailNative.tsx)
 - strings: { title, backLabel, basedOn, summary, signature, learning }
 - rows: [{ key, glyph, title, line, strength, read }]
 - gate: { shown, eyebrow, title, sub, pct (-1 = none), tappable }; bird: image ref
 Events: onVdBack {}, onVdGate {}

 KDraftsView (src/Drafts.tsx, src/screens/drafts/DraftsNative.tsx)
 - strings: { title, backLabel, count, emptyTitle, emptyBody, hint, throwLabel }; loaded: Bool
 - cards: [{ id, date, words, stamp, stampHex, a11y }]
 Events: onDrBack {}, onDrOpen { id }, onDrThrow { id }

 KStampBookView (src/StampBook.tsx, src/screens/stamps/StampBookNative.tsx)
 - strings: { title, backLabel, count, intro }
 - tiles: [{ id, name, emoji, earned, faceFrom, faceTo, label, desc, progress, fraction, action }]
 Events: onSbBack {}, onSbAction { id }

 KLoreView (src/Lore.tsx, src/screens/lore/LoreNative.tsx)
 - strings: { title, backLabel, head, empty, removeLabel, removeHint }; loaded: Bool
 - cards: [{ id, prompt, body, from }]
 Events: onLoBack {}, onLoRemove { id }

 None takes a command yet; each still registers "command" like every screen view.
 */

// MARK: - The Voice report

struct KVoiceReportStringsRecord: Record {
  @Field var eyebrowCover: String = ""
  @Field var eyebrowStars: String = ""
  @Field var eyebrowHour: String = ""
  @Field var eyebrowWords: String = ""
  @Field var eyebrowPunct: String = ""
  @Field var eyebrowQuote: String = ""
  @Field var eyebrowEnd: String = ""
  @Field var archetype: String = ""
  @Field var written: String = ""
  @Field var brightestTitle: String = ""
  @Field var brightest: String = ""
  @Field var hourBand: String = ""
  @Field var hourLine: String = ""
  @Field var firstWord: String = ""
  @Field var otherWords: String = ""
  @Field var wordsLine: String = ""
  @Field var topMark: String = ""
  @Field var breathe: String = ""
  @Field var quote: String = ""
  @Field var signature: String = ""
  @Field var brand: String = ""
  @Field var share: String = ""
  @Field var done: String = ""
  @Field var close: String = ""
  @Field var sampleTitle: String = ""
  @Field var sampleLine: String = ""
}

struct KReportMarkRecord: Record {
  @Field var mark: String = ""
  @Field var pct: Int = 0
  @Field var bar: Double = 6
}

struct KReportStarRecord: Record {
  @Field var x: Double = 0
  @Field var y: Double = 0
  @Field var big: Bool = false
  @Field var w: Double = 0.45
}

struct KReportSkyRecord: Record {
  @Field var size: Double = 150
  @Field var stars: [KReportStarRecord] = []
  @Field var links: [Int] = []

  var sky: KReportSky {
    KReportSky(
      size: CGFloat(max(1, size)),
      stars: stars.map { KReportStar(x: CGFloat($0.x), y: CGFloat($0.y), big: $0.big, w: $0.w) },
      links: links
    )
  }
}

final class KVoiceReportViewProps: KScreenProps {
  @Field var strings: KVoiceReportStringsRecord = KVoiceReportStringsRecord()
  @Field var loaded: Bool = false
  @Field var cards: [String] = []
  @Field var chips: [String] = []
  @Field var marks: [KReportMarkRecord] = []
  @Field var sky: KReportSkyRecord = KReportSkyRecord()
  @Field var keepSky: KReportSkyRecord = KReportSkyRecord()
  @Field var bird: KImageRefRecord = KImageRefRecord()

  var onVrShare = EventDispatcher()
  var onVrDone = EventDispatcher()

  private(set) lazy var actions: KVoiceReportActions = {
    let a = KVoiceReportActions()
    a.onShare = { [weak self] in self?.onVrShare() }
    a.onDone = { [weak self] in self?.onVrDone() }
    return a
  }()

  var content: KVoiceReportContent {
    cached("content") {
      let s = strings
      var c = KVoiceReportContent()
      c.loaded = loaded
      var seen = Set<KReportCard>()
      c.cards = cards.compactMap { KReportCard(rawValue: $0) }.filter { seen.insert($0).inserted }
      c.eyebrows = [
        .cover: s.eyebrowCover, .stars: s.eyebrowStars, .hour: s.eyebrowHour, .words: s.eyebrowWords,
        .punct: s.eyebrowPunct, .quote: s.eyebrowQuote, .end: s.eyebrowEnd,
      ]
      c.archetype = s.archetype
      c.chips = chips
      c.written = s.written
      c.brightestTitle = s.brightestTitle
      c.brightest = s.brightest
      c.hourBand = s.hourBand
      c.hourLine = s.hourLine
      c.firstWord = s.firstWord
      c.otherWords = s.otherWords
      c.wordsLine = s.wordsLine
      c.topMark = s.topMark
      var marked = Set<String>()
      c.marks = marks.compactMap { m in
        guard !m.mark.isEmpty, marked.insert(m.mark).inserted else { return nil }
        return KReportMark(mark: m.mark, pct: m.pct, bar: m.bar)
      }
      c.breathe = s.breathe
      c.quote = s.quote
      c.signature = s.signature
      c.brand = s.brand
      c.share = s.share
      c.done = s.done
      c.close = s.close
      c.sampleTitle = s.sampleTitle
      c.sampleLine = s.sampleLine
      c.bird = bird.ref
      c.sky = sky.sky
      c.keepSky = keepSky.sky
      return c
    }
  }
}

struct KVoiceReportView: ExpoSwiftUI.View {
  @ObservedObject var props: KVoiceReportViewProps

  var body: some View {
    let insets = props.insets
    return KVoiceReportScreen(
      content: props.content,
      topInset: insets.top,
      bottomInset: insets.bottom,
      actions: props.actions
    )
    .kScreenEnvironment(props)
  }
}

// MARK: - Your Voice, in detail

struct KVoiceDetailStringsRecord: Record {
  @Field var title: String = ""
  @Field var backLabel: String = ""
  @Field var basedOn: String = ""
  @Field var summary: String = ""
  @Field var signature: String = ""
  @Field var learning: String = ""
}

struct KVoiceDetailRowRecord: Record {
  @Field var key: String = ""
  @Field var glyph: String = ""
  @Field var title: String = ""
  @Field var line: String = ""
  @Field var strength: Int = 0
  @Field var read: Bool = false
}

struct KVoiceDetailGateRecord: Record {
  /// false until the gate is known: no door
  @Field var shown: Bool = false
  @Field var eyebrow: String = ""
  @Field var title: String = ""
  @Field var sub: String = ""
  /// 0…100 while she is saving up; -1 for no bar
  @Field var pct: Int = -1
  @Field var tappable: Bool = false
}

final class KVoiceDetailViewProps: KScreenProps {
  @Field var strings: KVoiceDetailStringsRecord = KVoiceDetailStringsRecord()
  @Field var rows: [KVoiceDetailRowRecord] = []
  @Field var gate: KVoiceDetailGateRecord = KVoiceDetailGateRecord()
  @Field var bird: KImageRefRecord = KImageRefRecord()

  var onVdBack = EventDispatcher()
  var onVdGate = EventDispatcher()

  private(set) lazy var actions: KVoiceDetailActions = {
    let a = KVoiceDetailActions()
    a.onBack = { [weak self] in self?.onVdBack() }
    a.onGate = { [weak self] in self?.onVdGate() }
    return a
  }()

  var content: KVoiceDetailContent {
    cached("content") {
      let s = strings
      var c = KVoiceDetailContent()
      c.title = s.title
      c.backLabel = s.backLabel
      c.basedOn = s.basedOn
      c.summary = s.summary
      c.signature = s.signature
      c.learning = s.learning
      c.bird = bird.ref
      var seen = Set<String>()
      c.rows = rows.compactMap { r in
        guard !r.key.isEmpty, seen.insert(r.key).inserted else { return nil }
        return KVoiceDetailRow(id: r.key, glyph: r.glyph, title: r.title, line: r.line, strength: min(5, max(0, r.strength)), read: r.read)
      }
      let g = gate
      c.gate = g.shown ? KVoiceDetailGate(eyebrow: g.eyebrow, title: g.title, sub: g.sub, pct: g.pct >= 0 ? g.pct : nil, tappable: g.tappable) : nil
      return c
    }
  }
}

struct KVoiceDetailView: ExpoSwiftUI.View {
  @ObservedObject var props: KVoiceDetailViewProps

  var body: some View {
    let insets = props.insets
    return KVoiceDetailScreen(
      theme: props.kTheme,
      content: props.content,
      topInset: insets.top,
      // the React Native page's 40 over the home indicator
      bottomInset: insets.bottom + 40,
      actions: props.actions
    )
    .kScreenEnvironment(props)
  }
}

// MARK: - Unsent

struct KDraftsStringsRecord: Record {
  @Field var title: String = ""
  @Field var backLabel: String = ""
  @Field var count: String = ""
  @Field var emptyTitle: String = ""
  @Field var emptyBody: String = ""
  @Field var hint: String = ""
  @Field var throwLabel: String = ""
}

struct KDraftCardRecord: Record {
  @Field var id: String = ""
  @Field var date: String = ""
  @Field var words: String = ""
  @Field var stamp: String = ""
  @Field var stampHex: String = ""
  @Field var a11y: String = ""
}

final class KDraftsViewProps: KScreenProps {
  @Field var strings: KDraftsStringsRecord = KDraftsStringsRecord()
  @Field var loaded: Bool = false
  @Field var cards: [KDraftCardRecord] = []

  var onDrBack = EventDispatcher()
  var onDrOpen = EventDispatcher()
  var onDrThrow = EventDispatcher()

  private(set) lazy var actions: KDraftsActions = {
    let a = KDraftsActions()
    a.onBack = { [weak self] in self?.onDrBack() }
    a.onOpen = { [weak self] id in self?.onDrOpen(["id": id]) }
    a.onThrow = { [weak self] id in self?.onDrThrow(["id": id]) }
    return a
  }()

  var content: KDraftsContent {
    cached("content") {
      let s = strings
      var c = KDraftsContent()
      c.title = s.title
      c.backLabel = s.backLabel
      c.count = s.count
      c.loaded = loaded
      c.emptyTitle = s.emptyTitle
      c.emptyBody = s.emptyBody
      c.hint = s.hint
      c.throwLabel = s.throwLabel
      var seen = Set<String>()
      c.cards = cards.compactMap { r in
        guard !r.id.isEmpty, seen.insert(r.id).inserted else { return nil }
        return KDraftCard(id: r.id, date: r.date, words: r.words, stamp: r.stamp, stampHex: r.stampHex, a11y: r.a11y)
      }
      return c
    }
  }
}

struct KDraftsView: ExpoSwiftUI.View {
  @ObservedObject var props: KDraftsViewProps

  var body: some View {
    let insets = props.insets
    return KDraftsScreen(
      theme: props.kTheme,
      content: props.content,
      topInset: insets.top,
      // the React Native list's 40 at its foot, clear of the home indicator
      bottomInset: max(40, insets.bottom + 12),
      actions: props.actions
    )
    .kScreenEnvironment(props)
  }
}

// MARK: - The stamp album

struct KStampBookStringsRecord: Record {
  @Field var title: String = ""
  @Field var backLabel: String = ""
  @Field var count: String = ""
  @Field var intro: String = ""
}

struct KStampBookTileRecord: Record {
  @Field var id: String = ""
  @Field var name: String = ""
  @Field var emoji: String = ""
  @Field var earned: Bool = false
  @Field var faceFrom: String = "#DFDFDB"
  @Field var faceTo: String = "#C6C6C2"
  @Field var label: String = ""
  @Field var desc: String = ""
  @Field var progress: String = ""
  @Field var fraction: Double = 0
  @Field var action: String = ""
}

final class KStampBookViewProps: KScreenProps {
  @Field var strings: KStampBookStringsRecord = KStampBookStringsRecord()
  @Field var tiles: [KStampBookTileRecord] = []

  var onSbBack = EventDispatcher()
  var onSbAction = EventDispatcher()

  private(set) lazy var actions: KStampBookActions = {
    let a = KStampBookActions()
    a.onBack = { [weak self] in self?.onSbBack() }
    a.onAction = { [weak self] id in self?.onSbAction(["id": id]) }
    return a
  }()

  var content: KStampBookContent {
    cached("content") {
      let s = strings
      var c = KStampBookContent()
      c.title = s.title
      c.backLabel = s.backLabel
      c.count = s.count
      c.intro = s.intro
      var seen = Set<String>()
      c.tiles = tiles.compactMap { r in
        guard !r.id.isEmpty, seen.insert(r.id).inserted else { return nil }
        return KStampBookTile(
          id: r.id,
          name: r.name,
          emoji: r.emoji,
          earned: r.earned,
          faceFrom: r.faceFrom.hasPrefix("#") ? r.faceFrom : "#DFDFDB",
          faceTo: r.faceTo.hasPrefix("#") ? r.faceTo : "#C6C6C2",
          label: r.label,
          desc: r.desc,
          progress: r.progress,
          fraction: r.fraction,
          action: r.action
        )
      }
      return c
    }
  }
}

struct KStampBookView: ExpoSwiftUI.View {
  @ObservedObject var props: KStampBookViewProps

  var body: some View {
    let insets = props.insets
    return KStampBookScreen(
      theme: props.kTheme,
      content: props.content,
      topInset: insets.top,
      // the React Native page's 40 over the home indicator
      bottomInset: insets.bottom + 40,
      actions: props.actions
    )
    .kScreenEnvironment(props)
  }
}

// MARK: - Lore

struct KLoreStringsRecord: Record {
  @Field var title: String = ""
  @Field var backLabel: String = ""
  @Field var head: String = ""
  @Field var empty: String = ""
  @Field var removeLabel: String = ""
  @Field var removeHint: String = ""
}

struct KLoreCardRecord: Record {
  @Field var id: String = ""
  @Field var prompt: String = ""
  @Field var body: String = ""
  @Field var from: String = ""
}

final class KLoreViewProps: KScreenProps {
  @Field var strings: KLoreStringsRecord = KLoreStringsRecord()
  @Field var loaded: Bool = false
  @Field var cards: [KLoreCardRecord] = []

  var onLoBack = EventDispatcher()
  var onLoRemove = EventDispatcher()

  private(set) lazy var actions: KLoreActions = {
    let a = KLoreActions()
    a.onBack = { [weak self] in self?.onLoBack() }
    a.onRemove = { [weak self] id in self?.onLoRemove(["id": id]) }
    return a
  }()

  var content: KLoreContent {
    cached("content") {
      let s = strings
      var c = KLoreContent()
      c.title = s.title
      c.backLabel = s.backLabel
      c.head = s.head
      c.empty = s.empty
      c.removeLabel = s.removeLabel
      c.removeHint = s.removeHint
      c.loaded = loaded
      var seen = Set<String>()
      c.cards = cards.compactMap { r in
        guard !r.id.isEmpty, seen.insert(r.id).inserted else { return nil }
        return KLoreCard(id: r.id, prompt: r.prompt, body: r.body, from: r.from)
      }
      return c
    }
  }
}

struct KLoreView: ExpoSwiftUI.View {
  @ObservedObject var props: KLoreViewProps

  var body: some View {
    let insets = props.insets
    return KLoreScreen(
      theme: props.kTheme,
      content: props.content,
      topInset: insets.top,
      // the React Native page's 40 at its foot, clear of the home indicator
      bottomInset: max(40, insets.bottom + 12),
      actions: props.actions
    )
    .kScreenEnvironment(props)
  }
}
