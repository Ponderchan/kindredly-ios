import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 THE WRITING AURA ROOM AND ITS SHARE CARD as React Native sees them (owner decision 2026-10-26:
 ships in 1.0.7): <KAuraRoomView … /> and <KAuraShareView … /> on the JS side
 (modules/kindredly-ui/src/Aura.tsx), drawn by src/screens/aura/AuraNative.tsx and
 AuraShareNative.tsx, each in one full-screen Host (SurfaceHost) behind the "aura" and
 "auracard" switches (src/lib/surfaces.ts). This file turns records into Portable values and
 taps into events, and places the room's one island; the screens are Portable/Aura/
 KAuraRoomScreen.swift and KAuraShareScreen.swift and know nothing about Expo. Built as every
 step-5 screen is (KScreenProps.swift); neither has a text field.

 KAuraRoomView props, beyond KScreenProps (insets.top the status bar, insets.bottom the home
 indicator):
 - strings: { title, back, share, tabs: [3], allDims, swipe, prev, next, seeRead, readTitle, nine,
   nineSub, close, scope, wordsTitle, wordsNone, wordsHint, pausesTitle, pausesHint, extrasLabel,
   usageNoneLabel, usageNone, scopeRow, scopeTitle, scopeLetters, scopeLettersSub, included,
   scopeSealed, scopeSealedSub, scopeNote, done }
 - data: { ready, card (KMeAuraRecord, Me's), ctaOpensRoom, dims: [{ key, number, label, counter,
   name, line, state, established, quote, quoteFrom, quoteLines, hasReading, reading: { before,
   marked, after, from, name, line } }], fromPieces, words: [{ word, count, tier, green, hit }],
   pauses: [{ label, count, fraction }], extras: [{ sticker, line, privateLabel }], groups:
   [{ key, label, items }], sealedOn }
   A sticker: { id, name, bg, fg, border, pill, tilt, trying }.
 - initialLens: portrait | dims | habits (read when the view first draws)
 Children: one <KIsland name="auraArt"> (the card's inside × 110), as on Me.
 - auraArt (KMePiecesView.swift): with `on`, Swift draws the card's picture (KAuraArt) and leaves
   the island out ("auraart" switch, off by default).
 Events: onRoomBack {}, onRoomShare {}, onRoomWrite {}, onRoomScope { sealed }.

 KAuraShareView props, beyond KScreenProps:
 - strings: { title, back, share, save, working, readingFrom, onlyCard }
 - ticket: { ready, brand, label, meInWords, artKind (scene | sketch | empty | lines), artImage,
   artMask, name, stickers, desc, formedFrom, faceMask, a11y }
 - busy: "" | "share" | "save"
 - bird: KImageRefRecord (uri "" for none)
 Events: onCardBack {}, onCardShare { uri }, onCardSave { uri } (uri "" when the picture
 couldn't be made).

 Unknown enum strings fall back rather than fail (a lens opens PORTRAIT, an art kind draws the
 first lines). This file imports ExpoUI, whose public Button, Text and Image would make bare names
 ambiguous, so nothing of that kind is written here.
 */

struct KAuraStickerRecord: Record {
  @Field var id: String = ""
  @Field var name: String = ""
  @Field var bg: String = "#FFFFFF"
  @Field var fg: String = "#1E1B35"
  @Field var border: String = "#1E1B35"
  @Field var pill: Bool = false
  @Field var tilt: Double = 0
  @Field var trying: Bool = false

  var sticker: KAuraSticker {
    KAuraSticker(id: id, name: name, bg: bg, fg: fg, border: border, pill: pill, tilt: tilt, trying: trying)
  }
}

struct KAuraReadingRecord: Record {
  @Field var before: String = ""
  @Field var marked: String = ""
  @Field var after: String = ""
  @Field var from: String = ""
  @Field var name: String = ""
  @Field var line: String = ""

  var reading: KAuraReading {
    var r = KAuraReading()
    r.before = before
    r.marked = marked
    r.after = after
    r.from = from
    r.name = name
    r.line = line
    return r
  }
}

struct KAuraDimRecord: Record {
  @Field var key: String = ""
  @Field var number: String = ""
  @Field var label: String = ""
  @Field var counter: String = ""
  @Field var name: String = ""
  @Field var line: String = ""
  @Field var state: String = ""
  @Field var established: Bool = false
  @Field var quote: String = ""
  @Field var quoteFrom: String = ""
  @Field var quoteLines: Int = 4
  @Field var hasReading: Bool = false
  @Field var reading: KAuraReadingRecord = KAuraReadingRecord()
}

struct KAuraWordRecord: Record {
  @Field var word: String = ""
  @Field var count: Int = 0
  @Field var tier: Int = 2
  @Field var green: Bool = false
  @Field var hit: String = ""
}

struct KAuraPauseRecord: Record {
  @Field var label: String = ""
  @Field var count: Int = 0
  @Field var fraction: Double = 0
}

struct KAuraUsageItemRecord: Record {
  @Field var sticker: KAuraStickerRecord = KAuraStickerRecord()
  @Field var line: String = ""
  @Field var privateLabel: String = ""
}

struct KAuraUsageGroupRecord: Record {
  @Field var key: String = ""
  @Field var label: String = ""
  @Field var items: [KAuraUsageItemRecord] = []
}

struct KAuraRoomStringsRecord: Record {
  @Field var title: String = ""
  @Field var back: String = ""
  @Field var share: String = ""
  @Field var tabs: [String] = []
  @Field var allDims: String = ""
  @Field var swipe: String = ""
  @Field var prev: String = ""
  @Field var next: String = ""
  @Field var seeRead: String = ""
  @Field var readTitle: String = ""
  @Field var nine: String = ""
  @Field var nineSub: String = ""
  @Field var close: String = ""
  @Field var scope: String = ""
  @Field var wordsTitle: String = ""
  @Field var wordsNone: String = ""
  @Field var wordsHint: String = ""
  @Field var pausesTitle: String = ""
  @Field var pausesHint: String = ""
  @Field var extrasLabel: String = ""
  @Field var usageNoneLabel: String = ""
  @Field var usageNone: String = ""
  @Field var scopeRow: String = ""
  @Field var scopeTitle: String = ""
  @Field var scopeLetters: String = ""
  @Field var scopeLettersSub: String = ""
  @Field var included: String = ""
  @Field var scopeSealed: String = ""
  @Field var scopeSealedSub: String = ""
  @Field var scopeNote: String = ""
  @Field var done: String = ""
}

struct KAuraRoomDataRecord: Record {
  @Field var ready: Bool = false
  @Field var card: KMeAuraRecord = KMeAuraRecord()
  @Field var ctaOpensRoom: Bool = false
  @Field var dims: [KAuraDimRecord] = []
  @Field var fromPieces: String = ""
  @Field var words: [KAuraWordRecord] = []
  @Field var pauses: [KAuraPauseRecord] = []
  @Field var extras: [KAuraUsageItemRecord] = []
  @Field var groups: [KAuraUsageGroupRecord] = []
  @Field var sealedOn: Bool = false
}

private func usageItems(_ records: [KAuraUsageItemRecord]) -> [KAuraUsageItem] {
  // ids are the rows' identity: a repeat (never sent by TS) is dropped rather than drawn twice
  var seen = Set<String>()
  return records.compactMap { r in
    guard !r.sticker.id.isEmpty, seen.insert(r.sticker.id).inserted else { return nil }
    return KAuraUsageItem(sticker: r.sticker.sticker, line: r.line, privateLabel: r.privateLabel)
  }
}

final class KAuraRoomViewProps: KScreenProps {
  @Field var strings: KAuraRoomStringsRecord = KAuraRoomStringsRecord()
  @Field var data: KAuraRoomDataRecord = KAuraRoomDataRecord()
  @Field var initialLens: String = "portrait"
  /// the card's picture in Swift (Adapters/KMePiecesView.swift, "auraart"): with `on`, drawn
  /// here instead of the "auraArt" island
  @Field var auraArt: KAuraArtRecord = KAuraArtRecord()

  var onRoomBack = EventDispatcher()
  var onRoomShare = EventDispatcher()
  var onRoomWrite = EventDispatcher()
  var onRoomScope = EventDispatcher()

  private(set) lazy var actions: KAuraRoomActions = {
    let a = KAuraRoomActions()
    a.onBack = { [weak self] in self?.onRoomBack() }
    a.onShare = { [weak self] in self?.onRoomShare() }
    a.onWrite = { [weak self] in self?.onRoomWrite() }
    a.onScope = { [weak self] sealed in self?.onRoomScope(["sealed": sealed]) }
    return a
  }()

  /// Everything the room shows, converted once per rev.
  var content: KAuraRoomContent {
    cached("content") {
      let s = strings
      let d = data
      var c = KAuraRoomContent()
      c.title = s.title
      c.backLabel = s.back
      c.shareLabel = s.share
      c.tabs = s.tabs
      c.ready = d.ready
      c.card = d.ready ? d.card.aura : nil
      c.ctaOpensRoom = d.ctaOpensRoom
      var seenDims = Set<String>()
      c.dims = d.dims.compactMap { r in
        guard !r.key.isEmpty, seenDims.insert(r.key).inserted else { return nil }
        return KAuraDim(
          id: r.key, number: r.number, label: r.label, counter: r.counter, name: r.name, line: r.line,
          state: r.state, established: r.established, quote: r.quote, quoteFrom: r.quoteFrom,
          quoteLines: max(1, r.quoteLines), reading: r.hasReading ? r.reading.reading : nil
        )
      }
      c.allDims = s.allDims
      c.swipe = s.swipe
      c.prevLabel = s.prev
      c.nextLabel = s.next
      c.seeRead = s.seeRead
      c.readTitle = s.readTitle
      c.nine = s.nine
      c.nineSub = s.nineSub
      c.closeLabel = s.close
      c.fromPieces = d.fromPieces
      c.scope = s.scope
      c.wordsTitle = s.wordsTitle
      var seenWords = Set<String>()
      c.words = d.words.compactMap { w in
        guard !w.word.isEmpty, seenWords.insert(w.word).inserted else { return nil }
        return KAuraWord(word: w.word, count: w.count, tier: min(max(w.tier, 0), 2), green: w.green, hit: w.hit)
      }
      c.wordsNone = s.wordsNone
      c.wordsHint = s.wordsHint
      c.pausesTitle = s.pausesTitle
      var seenPauses = Set<String>()
      c.pauses = d.pauses.compactMap { p in
        guard seenPauses.insert(p.label).inserted else { return nil }
        return KAuraPause(label: p.label, count: max(0, p.count), fraction: min(max(p.fraction, 0), 1))
      }
      c.pausesHint = s.pausesHint
      c.extrasLabel = s.extrasLabel
      c.extras = usageItems(d.extras)
      var seenGroups = Set<String>()
      c.groups = d.groups.compactMap { g in
        let items = usageItems(g.items)
        guard !g.key.isEmpty, !items.isEmpty, seenGroups.insert(g.key).inserted else { return nil }
        return KAuraUsageGroup(id: g.key, label: g.label, items: items)
      }
      c.usageNoneLabel = s.usageNoneLabel
      c.usageNone = s.usageNone
      c.scopeRow = s.scopeRow
      c.scopeTitle = s.scopeTitle
      c.scopeLetters = s.scopeLetters
      c.scopeLettersSub = s.scopeLettersSub
      c.included = s.included
      c.scopeSealed = s.scopeSealed
      c.scopeSealedSub = s.scopeSealedSub
      c.scopeNote = s.scopeNote
      c.done = s.done
      c.sealedOn = d.sealedOn
      return c
    }
  }
}

struct KAuraRoomView: ExpoSwiftUI.View {
  @ObservedObject var props: KAuraRoomViewProps

  var body: some View {
    let insets = props.insets
    return KAuraRoomScreen(
      theme: props.kTheme,
      content: props.content,
      initialLens: KAuraLens(rawValue: props.initialLens) ?? .portrait,
      topInset: insets.top,
      bottomInset: insets.bottom,
      actions: props.actions
    ) {
      if props.auraArt.on {
        KAuraArt(theme: props.kTheme, art: props.auraArt.model)
      } else {
        props.children?.kSlot("auraArt")
      }
    }
    .kScreenEnvironment(props)
  }
}

// MARK: - The share card

struct KAuraShareStringsRecord: Record {
  @Field var title: String = ""
  @Field var back: String = ""
  @Field var share: String = ""
  @Field var save: String = ""
  @Field var working: String = ""
  @Field var readingFrom: String = ""
  @Field var onlyCard: String = ""
}

struct KAuraTicketRecord: Record {
  @Field var ready: Bool = false
  @Field var brand: String = ""
  @Field var label: String = ""
  @Field var meInWords: String = ""
  /// scene | sketch | empty | lines
  @Field var artKind: String = "lines"
  @Field var artImage: KImageRefRecord = KImageRefRecord()
  @Field var artMask: Int = 0
  @Field var name: String = ""
  @Field var stickers: [KAuraStickerRecord] = []
  @Field var desc: String = ""
  @Field var formedFrom: String = ""
  @Field var faceMask: Int = 0
  @Field var a11y: String = ""

  var ticket: KAuraTicket {
    var t = KAuraTicket()
    t.brand = brand
    t.label = label
    t.meInWords = meInWords
    var art = KAuraTicketArt()
    art.kind = KAuraTicketArt.Kind(rawValue: artKind) ?? .lines
    art.image = artImage.ref
    art.mask = artMask & KMosaic.fullMask
    t.art = art
    t.name = name
    var seen = Set<String>()
    t.stickers = stickers.compactMap { s in
      guard !s.id.isEmpty, seen.insert(s.id).inserted else { return nil }
      return s.sticker
    }
    t.desc = desc
    t.formedFrom = formedFrom
    t.faceMask = faceMask & KMosaic.fullMask
    t.a11y = a11y
    return t
  }
}

final class KAuraShareViewProps: KScreenProps {
  @Field var strings: KAuraShareStringsRecord = KAuraShareStringsRecord()
  @Field var ticket: KAuraTicketRecord = KAuraTicketRecord()
  @Field var busy: String = ""
  @Field var bird: KImageRefRecord = KImageRefRecord()

  var onCardBack = EventDispatcher()
  var onCardShare = EventDispatcher()
  var onCardSave = EventDispatcher()

  private(set) lazy var actions: KAuraShareActions = {
    let a = KAuraShareActions()
    a.onBack = { [weak self] in self?.onCardBack() }
    a.onShare = { [weak self] uri in self?.onCardShare(["uri": uri]) }
    a.onSave = { [weak self] uri in self?.onCardSave(["uri": uri]) }
    return a
  }()

  /// The page's content. The ticket converts once per rev; busy changes on its own, so it is
  /// read fresh.
  var content: KAuraShareContent {
    var c = KAuraShareContent()
    c.title = strings.title
    c.backLabel = strings.back
    c.ready = ticket.ready
    c.ticket = cached("ticket") { ticket.ticket }
    c.share = strings.share
    c.save = strings.save
    c.working = strings.working
    c.busy = busy == "share" || busy == "save" ? busy : ""
    c.readingFrom = strings.readingFrom
    c.onlyCard = strings.onlyCard
    c.bird = bird.ref
    return c
  }
}

struct KAuraShareView: ExpoSwiftUI.View {
  @ObservedObject var props: KAuraShareViewProps

  var body: some View {
    let insets = props.insets
    return KAuraShareScreen(
      theme: props.kTheme,
      content: props.content,
      topInset: insets.top,
      bottomInset: insets.bottom,
      actions: props.actions
    )
    .kScreenEnvironment(props)
  }
}
