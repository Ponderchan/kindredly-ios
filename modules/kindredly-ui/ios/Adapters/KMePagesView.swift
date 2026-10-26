import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 THE LAST ME PAGES, AS REACT NATIVE SEES THEM (owner, 2026-10-27: "make Me all Swift"): the
 keepsakes shelf, one keepsake, and My kindreds. Each is a screen view like every step-5 screen
 (KScreenProps.swift: theme, letterFont, insets, rev, commands), registered with ExpoUIView and the
 "command" AsyncFunction in KindredlyUIModule.swift, alone in one @expo/ui <Host> (SurfaceHost).
 This file turns records into Portable values and taps into events; the screens are
 Portable/Me/KKeepsakesScreen.swift and Portable/Me/KMyKindredsScreen.swift and know nothing of
 Expo. None takes commands (they have no field and nothing that changes often). This file imports
 ExpoUI, whose public Button, Text and Image would make bare names ambiguous, so nothing of that
 kind is written here.

 KKeepsakesView (modules/kindredly-ui/src/Keepsakes.tsx, src/screens/keepsakes/KeepsakesNative.tsx)
 - strings: { title, backLabel, count, lede, none }
 - tiles: [{ id, name, proof, icon (image ref), fresh, a11y }]
 Events: onKsBack {}, onKsOpen { id }

 KKeepsakeView (the same TS file, src/screens/keepsakes/KeepsakeNative.tsx)
 - strings: { title, backLabel, name, when, wrenLine, evidenceLabel, evidence, lineLabel, line, go,
   share, notYet }
 - known, kept: Bool; icon, bird: image refs
 Events: onKsdBack {}, onKsdGo {}, onKsdShare {}

 KMyKindredsView (modules/kindredly-ui/src/MyKindreds.tsx, src/screens/my-kindreds/MyKindredsNative.tsx)
 - strings: { title, backLabel, count, lede, empty, failed }
 - state: loading | ready | empty | failed (an unknown one reads as loading)
 - bird: image ref
 - cards: [{ id, name, face { kind, uri, key, overscan, mask, stamp } (KMyLettersFaceRecord, My
   letters' face record: a kindred's face, never a frost), since, when, youPrefix, preview, badge,
   a11y }]
 Events: onMkBack {}, onMkOpen { id }
 */

// MARK: - Keepsakes: the shelf

struct KKeepsakesStringsRecord: Record {
  @Field var title: String = ""
  @Field var backLabel: String = ""
  @Field var count: String = ""
  @Field var lede: String = ""
  @Field var none: String = ""
}

struct KKeepsakeTileRecord: Record {
  @Field var id: String = ""
  @Field var name: String = ""
  @Field var proof: String = ""
  @Field var icon: KImageRefRecord = KImageRefRecord()
  @Field var fresh: Bool = false
  @Field var a11y: String = ""
}

final class KKeepsakesViewProps: KScreenProps {
  @Field var strings: KKeepsakesStringsRecord = KKeepsakesStringsRecord()
  @Field var tiles: [KKeepsakeTileRecord] = []

  var onKsBack = EventDispatcher()
  var onKsOpen = EventDispatcher()

  private(set) lazy var actions: KKeepsakesActions = {
    let a = KKeepsakesActions()
    a.onBack = { [weak self] in self?.onKsBack() }
    a.onOpen = { [weak self] id in self?.onKsOpen(["id": id]) }
    return a
  }()

  var content: KKeepsakesContent {
    cached("content") {
      var c = KKeepsakesContent()
      c.title = strings.title
      c.backLabel = strings.backLabel
      c.count = strings.count
      c.lede = strings.lede
      c.none = strings.none
      var seen = Set<String>()
      c.tiles = tiles.compactMap { r in
        guard !r.id.isEmpty, seen.insert(r.id).inserted else { return nil }
        return KKeepsakeTile(id: r.id, name: r.name, proof: r.proof, icon: r.icon.ref, fresh: r.fresh, a11y: r.a11y)
      }
      return c
    }
  }
}

struct KKeepsakesView: ExpoSwiftUI.View {
  @ObservedObject var props: KKeepsakesViewProps

  var body: some View {
    let insets = props.insets
    return KKeepsakesScreen(
      theme: props.kTheme,
      content: props.content,
      topInset: insets.top,
      bottomInset: max(insets.tabBarRoom, insets.bottom) + 24,
      actions: props.actions
    )
    .kScreenEnvironment(props)
  }
}

// MARK: - Keepsakes: one

struct KKeepsakeStringsRecord: Record {
  @Field var title: String = ""
  @Field var backLabel: String = ""
  @Field var name: String = ""
  @Field var when: String = ""
  @Field var wrenLine: String = ""
  @Field var evidenceLabel: String = ""
  @Field var evidence: String = ""
  @Field var lineLabel: String = ""
  @Field var line: String = ""
  @Field var go: String = ""
  @Field var share: String = ""
  @Field var notYet: String = ""
}

final class KKeepsakeViewProps: KScreenProps {
  @Field var strings: KKeepsakeStringsRecord = KKeepsakeStringsRecord()
  @Field var known: Bool = false
  @Field var kept: Bool = false
  @Field var icon: KImageRefRecord = KImageRefRecord()
  @Field var bird: KImageRefRecord = KImageRefRecord()

  var onKsdBack = EventDispatcher()
  var onKsdGo = EventDispatcher()
  var onKsdShare = EventDispatcher()

  private(set) lazy var actions: KKeepsakeActions = {
    let a = KKeepsakeActions()
    a.onBack = { [weak self] in self?.onKsdBack() }
    a.onGo = { [weak self] in self?.onKsdGo() }
    a.onShare = { [weak self] in self?.onKsdShare() }
    return a
  }()

  var content: KKeepsakeContent {
    cached("content") {
      let s = strings
      var c = KKeepsakeContent()
      c.title = s.title
      c.backLabel = s.backLabel
      c.known = known
      c.icon = icon.ref
      c.name = s.name
      c.when = s.when
      c.kept = kept
      c.bird = bird.ref
      c.wrenLine = s.wrenLine
      c.evidenceLabel = s.evidenceLabel
      c.evidence = s.evidence
      c.lineLabel = s.lineLabel
      c.line = s.line
      c.go = s.go
      c.share = s.share
      c.notYet = s.notYet
      return c
    }
  }
}

struct KKeepsakeView: ExpoSwiftUI.View {
  @ObservedObject var props: KKeepsakeViewProps

  var body: some View {
    let insets = props.insets
    return KKeepsakeScreen(
      theme: props.kTheme,
      content: props.content,
      topInset: insets.top,
      bottomInset: max(insets.tabBarRoom, insets.bottom) + 50,
      actions: props.actions
    )
    .kScreenEnvironment(props)
  }
}

// MARK: - My kindreds

struct KMyKindredsStringsRecord: Record {
  @Field var title: String = ""
  @Field var backLabel: String = ""
  @Field var count: String = ""
  @Field var lede: String = ""
  @Field var empty: String = ""
  @Field var failed: String = ""
}

struct KMyKindredCardRecord: Record {
  @Field var id: String = ""
  @Field var name: String = ""
  @Field var face: KMyLettersFaceRecord = KMyLettersFaceRecord()
  @Field var since: String = ""
  @Field var when: String = ""
  @Field var youPrefix: String = ""
  @Field var preview: String = ""
  @Field var badge: String = ""
  @Field var a11y: String = ""
}

final class KMyKindredsViewProps: KScreenProps {
  @Field var strings: KMyKindredsStringsRecord = KMyKindredsStringsRecord()
  @Field var state: String = "loading"
  @Field var bird: KImageRefRecord = KImageRefRecord()
  @Field var cards: [KMyKindredCardRecord] = []

  var onMkBack = EventDispatcher()
  var onMkOpen = EventDispatcher()

  private(set) lazy var actions: KMyKindredsActions = {
    let a = KMyKindredsActions()
    a.onBack = { [weak self] in self?.onMkBack() }
    a.onOpen = { [weak self] id in self?.onMkOpen(["id": id]) }
    return a
  }()

  /// depends on the theme too (a mosaic's ink): its slot is named for it
  var content: KMyKindredsContent {
    let theme = kTheme
    return cached("content:\(theme.key)") {
      var c = KMyKindredsContent()
      c.title = strings.title
      c.backLabel = strings.backLabel
      c.count = strings.count
      c.lede = strings.lede
      c.empty = strings.empty
      c.failed = strings.failed
      c.bird = bird.ref
      c.state = KMyKindredsContent.State(rawValue: state) ?? .loading
      var seen = Set<String>()
      c.cards = cards.compactMap { r in
        guard !r.id.isEmpty, seen.insert(r.id).inserted else { return nil }
        return KMyKindredCard(
          id: r.id,
          name: r.name,
          face: r.face.source(theme),
          stamp: KMemberStamp(r.face.stamp),
          since: r.since,
          when: r.when,
          youPrefix: r.youPrefix,
          preview: r.preview,
          badge: r.badge,
          a11y: r.a11y
        )
      }
      return c
    }
  }
}

struct KMyKindredsView: ExpoSwiftUI.View {
  @ObservedObject var props: KMyKindredsViewProps

  var body: some View {
    let insets = props.insets
    return KMyKindredsScreen(
      theme: props.kTheme,
      content: props.content,
      topInset: insets.top,
      bottomInset: max(insets.tabBarRoom, insets.bottom) + 24,
      actions: props.actions
    )
    .kScreenEnvironment(props)
  }
}
