import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 THE PLUSH MOMENT, as React Native sees it (batch 3, 2026-11-09; behind the "plush" switch, off
 by default, with src/components/PlushCelebration.tsx's React Native card as the fallback). JS
 binding: modules/kindredly-ui/src/Plush.tsx; the card is Portable/Moments/KPlushCelebration.swift.
 The view fills a Host inside the transparent React Native Modal that fades it in and out.

 KPlushView
 - theme (KScreenProps)
 - strings { eyebrow, meetPre, meetName, meetPost, body, wear, keep }
 - bird { uri, key, kind } (the Plush bird, 128)
 - dim { hex, alpha } (the fixed dim, or Midnight's black scrim)
 Events: onPlWear {} · onPlKeep {}

 This file imports ExpoUI, whose public Button, Text and Image would make bare names ambiguous, so
 nothing of that kind is written here.
 */

struct KPlushStringsRecord: Record {
  @Field var eyebrow: String = ""
  @Field var meetPre: String = ""
  @Field var meetName: String = ""
  @Field var meetPost: String = ""
  @Field var body: String = ""
  @Field var wear: String = ""
  @Field var keep: String = ""
}

final class KPlushViewProps: KScreenProps {
  @Field var strings: KPlushStringsRecord = KPlushStringsRecord()
  @Field var bird: KImageRefRecord = KImageRefRecord()
  @Field var dim: KSheetDimRecord = KSheetDimRecord()

  var onPlWear = EventDispatcher()
  var onPlKeep = EventDispatcher()

  var content: KPlushContent {
    var c = KPlushContent()
    c.eyebrow = strings.eyebrow
    c.meetPre = strings.meetPre
    c.meetName = strings.meetName
    c.meetPost = strings.meetPost
    c.body = strings.body
    c.wear = strings.wear
    c.keep = strings.keep
    c.bird = bird.uri.isEmpty ? nil : bird.ref
    c.dim = dim.color
    return c
  }
}

struct KPlushView: ExpoSwiftUI.View {
  @ObservedObject var props: KPlushViewProps

  var body: some View {
    KPlushCelebration(
      theme: props.kTheme,
      content: props.content,
      onWear: { props.onPlWear([:]) },
      onKeep: { props.onPlKeep([:]) }
    )
    .kScreenEnvironment(props)
  }
}
