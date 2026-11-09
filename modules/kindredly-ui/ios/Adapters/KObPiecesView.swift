import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 THE ONBOARDING'S LAST FOUR ISLANDS IN SWIFT (2026-11-09, batch 3 slice 2): the marker.

 The four pieces — Wren flying on the doorstep ("obroutebird"), the hatch on 9 ("hatch"), the
 named chick on 10, 11 and 13 ("obchick") and the first flight on 12 and behind 13 ("obflight") —
 are drawn by KOnboardingView itself from its `pieces` record (Adapters/KOnboardingView.swift,
 Portable/Onboarding/KObPieces.swift and KObHatchStage.swift). A binary whose KOnboardingView
 predates that record would ignore it and leave an empty slot where the island was, so TS asks
 isKindredlyUIViewAvailable("KObPiecesView") before it sends a piece: this view exists only to be
 that answer (as KCourierCardView is the courier card's). It draws nothing. Built on KScreenProps
 like every other view here; it needs an @expo/ui <Host> if anything ever mounts it. This file
 imports ExpoUI, so no bare Button / Text / Image / Label is written here.
 */

final class KObPiecesViewProps: KScreenProps {}

struct KObPiecesView: ExpoSwiftUI.View {
  @ObservedObject var props: KObPiecesViewProps

  var body: some View {
    Color.clear
      .kScreenEnvironment(props)
  }
}
