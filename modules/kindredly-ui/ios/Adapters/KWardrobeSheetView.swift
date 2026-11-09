import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 THE WARDROBE SHEET, as React Native sees it (batch 3, 2026-11-09; behind the "wardrobesheet"
 switch, off by default, with WardrobeSheet's React Native page sheet in src/screens/today/
 WardrobeSlip.tsx as the fallback). JS binding: modules/kindredly-ui/src/WardrobeSheet.tsx; the
 sheet is Portable/Today/KWardrobeSheet.swift. The view sits in a 1pt Host and presents an iOS
 sheet while `presented` is true.

 KWardrobeSheetView
 - theme (KScreenProps), presented
 - strings { head, line, close, keep, looksLabel, looksCount, dressLabel, dressCount }
 - bird { uri, key, kind } (her, big), near [{ uri, key, kind }] (the pictures one tap away)
 - looks / dress [{ id, label, lock, hint, on, bird }]
 Events: onWsLook { id } · onWsDress { id } · onWsKeep {} · onWsClose {} (the ✕, a drag down) ·
 onWsGone {} (the sheet has finished going)

 This file imports ExpoUI, whose public Button, Text and Image would make bare names ambiguous, so
 nothing of that kind is written here.
 */

struct KWardrobeSheetStringsRecord: Record {
  @Field var head: String = ""
  @Field var line: String = ""
  @Field var close: String = ""
  @Field var keep: String = ""
  @Field var looksLabel: String = ""
  @Field var looksCount: String = ""
  @Field var dressLabel: String = ""
  @Field var dressCount: String = ""
}

struct KWardrobeTileRecord: Record {
  @Field var id: String = ""
  @Field var label: String = ""
  @Field var lock: String = ""
  @Field var hint: String = ""
  @Field var on: Bool = false
  @Field var bird: KImageRefRecord = KImageRefRecord()

  var tile: KCourierTile {
    KCourierTile(id: id, label: label, lock: lock, hint: hint, on: on, bird: bird.uri.isEmpty ? nil : bird.ref)
  }
}

final class KWardrobeSheetViewProps: KScreenProps {
  @Field var presented: Bool = false
  @Field var strings: KWardrobeSheetStringsRecord = KWardrobeSheetStringsRecord()
  @Field var bird: KImageRefRecord = KImageRefRecord()
  @Field var near: [KImageRefRecord] = []
  @Field var looks: [KWardrobeTileRecord] = []
  @Field var dress: [KWardrobeTileRecord] = []

  var onWsLook = EventDispatcher()
  var onWsDress = EventDispatcher()
  var onWsKeep = EventDispatcher()
  var onWsClose = EventDispatcher()
  var onWsGone = EventDispatcher()

  private(set) lazy var actions: KWardrobeSheetActions = {
    let a = KWardrobeSheetActions()
    a.onLook = { [weak self] id in self?.onWsLook(["id": id]) }
    a.onDress = { [weak self] id in self?.onWsDress(["id": id]) }
    a.onKeep = { [weak self] in self?.onWsKeep() }
    a.onClose = { [weak self] in self?.onWsClose() }
    a.onGone = { [weak self] in self?.onWsGone() }
    return a
  }()

  var content: KWardrobeSheetContent {
    var c = KWardrobeSheetContent()
    c.head = strings.head
    c.line = strings.line
    c.close = strings.close
    c.keep = strings.keep
    c.looksLabel = strings.looksLabel
    c.looksCount = strings.looksCount
    c.dressLabel = strings.dressLabel
    c.dressCount = strings.dressCount
    c.bird = bird.uri.isEmpty ? nil : bird.ref
    c.near = near.compactMap { $0.uri.isEmpty ? nil : $0.ref }
    c.looks = looks.map(\.tile)
    c.dress = dress.map(\.tile)
    return c
  }
}

struct KWardrobeSheetView: ExpoSwiftUI.View {
  @ObservedObject var props: KWardrobeSheetViewProps

  var body: some View {
    KWardrobeSheetAnchor(theme: props.kTheme, presented: props.presented, content: props.content, actions: props.actions)
      .kScreenEnvironment(props)
  }
}
