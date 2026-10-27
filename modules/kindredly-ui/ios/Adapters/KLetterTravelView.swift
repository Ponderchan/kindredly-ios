import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 LET IT TRAVEL as React Native sees it (2026-10-27; the "lettertravel" switch, off by default):
 <KLetterTravelView … /> on the JS side (modules/kindredly-ui/src/LetterTravel.tsx), drawn by
 src/components/LetterTravel.tsx in one full-screen Host (SurfaceHost) over the compose page while
 a letter goes. The piece itself is Portable/Compose/KLetterTravel.swift.

 The props subclass KScreenProps for theme and the image loader (her snapshot is a KImage); no
 insets, rev or commands.

 Props:
 - ground   the page's colour ("#RRGGBB"): the room it opens on and the last frame it fades to
 - ready    the send has landed: the clock may leave the arrival card
 - title    the card's title; sub, wait, done: its second line as usual, past the wait, and once
            the send has landed (all upper-cased by TS)
 - bird     her flying snapshot, empty-handed (bird-images "travelFly"); "" until captured

 Event:
 - onTravelDone {}   the piece is over (once): TS uncovers the page, or moves on
 */

final class KLetterTravelViewProps: KScreenProps {
  @Field var ground: String = ""
  @Field var ready: Bool = false
  @Field var title: String = ""
  @Field var sub: String = ""
  @Field var wait: String = ""
  @Field var done: String = ""
  @Field var bird: KImageRefRecord = KImageRefRecord()

  var onTravelDone = EventDispatcher()
}

struct KLetterTravelView: ExpoSwiftUI.View {
  @ObservedObject var props: KLetterTravelViewProps

  var body: some View {
    let theme = props.kTheme
    let ground = props.ground.isEmpty ? theme.bg : kVoiceColor(props.ground)
    KLetterTravel(
      theme: theme,
      ground: ground,
      ready: props.ready,
      words: KLetterTravelWords(title: props.title, sub: props.sub, wait: props.wait, done: props.done),
      bird: props.bird.ref
    ) {
      props.onTravelDone()
    }
    .kScreenEnvironment(props)
  }
}
