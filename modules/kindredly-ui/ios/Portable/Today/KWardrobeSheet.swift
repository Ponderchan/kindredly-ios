// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE WARDROBE SHEET, IN SWIFTUI (batch 3, 2026-11-09; behind the "wardrobesheet" switch, off by
 default): what the first arrival's wardrobe slip opens. The twin of WardrobeSheet in
 src/screens/today/WardrobeSlip.tsx (a React Native page sheet), which stays the fallback.

 Presented as an iOS sheet from a 1pt Host the slip leaves on Today (KWardrobeSheetAnchor), the
 way the tab bar presents the new reader's sheet (KPlusPanel): the system draws the rise, the drag
 down and the corners. Inside, as the React Native sheet draws it, on onboarding's Shell ground
 (OB tokens, not the theme):
   - the head, "Otis's wardrobe" (system 800 22, -.5 tracking, ink, one line) and the ✕ (16, 2.6
     round strokes, ink, a 44 target), 22 / 8 in, 14 down; under it the line (15/21, the soft ink);
   - in a scroll, 18 in: her at 150 trying the look on (happy), 14 above and below, then the rack
     (WardrobeRack tone "post"): LOOKS n/5 over the five coats across, each in the trial piece,
     and DRESS n/m over the pieces in a sideways scroll, each on the trial coat. The tiles are the
     courier page's (KCourierRackTile: the theme's card face, the ind ring on the one tried on,
     the brass lock tag kept at full colour); the headers SF Mono 600 9 at .2em and the count 8.5,
     both in mute (P.ink40);
   - the acid Keep key (KObAcidKey), 22 in, max(home indicator, 16) from the bottom.
 Every tile tries on, First Class or not. TS holds the trial and every word; a tap reports the
 tile, and TS sends the new pictures.

 HER, BIG. Each look is a snapshot of her real art in that coat and piece (lib/bird-images
 "try-<skin>-<piece>"); TS keeps the last one up until the next has been captured, so a swap is
 never an empty frame, and hands over the pictures one tap away (`near`) so they can be loaded
 into memory here, unseen: a tap on a tile then swaps her on the next frame, as React Native
 redraws her (WrenBird has no animation of its own; neither does this).

 THE FARE. Keep with a First Class piece on goes through the First Class page. React Native swaps
 the sheet's content for the page in place; here the sheet goes down first (TS turns `presented`
 off without closing) and TS raises the React Native page sheet with the Swift First Class page in
 it once this one is gone (onGone). That is the one deliberate difference.

 Closing: the ✕ and a drag down both report onClose; TS then turns `presented` off. onGone comes
 once the sheet has finished going, however it went.
 */

/// The sheet's taps and its going.
final class KWardrobeSheetActions {
  var onLook: (String) -> Void = { _ in }
  var onDress: (String) -> Void = { _ in }
  var onKeep: () -> Void = {}
  /// the ✕, or a drag down
  var onClose: () -> Void = {}
  /// the sheet has finished going
  var onGone: () -> Void = {}
}

struct KWardrobeSheetContent: Equatable {
  /// "Otis's wardrobe"
  var head = ""
  var line = ""
  /// the ✕, for VoiceOver
  var close = ""
  /// Keep this look
  var keep = ""
  /// LOOKS / DRESS and their counts ("2/5")
  var looksLabel = ""
  var looksCount = ""
  var dressLabel = ""
  var dressCount = ""
  /// her, trying it on (nil until the first capture)
  var bird: KImageRef?
  /// the pictures one tap away, loaded unseen
  var near: [KImageRef] = []
  var looks: [KCourierTile] = []
  var dress: [KCourierTile] = []
}

/// The anchor in its 1pt Host: presents the sheet while `presented`.
struct KWardrobeSheetAnchor: View {
  let theme: KTheme
  let presented: Bool
  let content: KWardrobeSheetContent
  let actions: KWardrobeSheetActions

  var body: some View {
    Color.clear
      .frame(width: 1, height: 1)
      .sheet(
        isPresented: Binding(
          get: { presented },
          set: { shown in
            // a drag down (TS turning it off sets nothing)
            if !shown && presented { actions.onClose() }
          }
        ),
        onDismiss: { actions.onGone() }
      ) {
        KWardrobeSheet(theme: theme, content: content, actions: actions)
      }
  }
}

struct KWardrobeSheet: View {
  static let bird: CGFloat = 150
  static let head = KTextStyle.system(22, .heavy, tracking: -0.5 / 22)
  static let headerLabel = KTextStyle.mono(9, .semibold, tracking: 1.8 / 9)
  static let headerCount = KTextStyle.mono(8.5, .medium)

  let theme: KTheme
  let content: KWardrobeSheetContent
  let actions: KWardrobeSheetActions

  var body: some View {
    GeometryReader { geo in
      VStack(spacing: 0) {
        HStack(alignment: .center, spacing: 0) {
          Text(content.head)
            .kText(Self.head)
            .foregroundStyle(KOb.ink)
            .lineLimit(1)
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityAddTraits(.isHeader)
          SwiftUI.Button(action: actions.onClose) {
            KLineIcon(.close, size: 16, lineWidth: 2.6, color: KOb.ink)
              .frame(width: 44, height: 44)
              .contentShape(Rectangle())
          }
          .buttonStyle(KAsIsButtonStyle())
          .accessibilityLabel(content.close)
        }
        .padding(.leading, 22)
        .padding(.trailing, 8)
        .padding(.top, 14)
        Text(content.line)
          .kText(.obLineSmall)
          .foregroundStyle(KOb.inkSoft)
          .fixedSize(horizontal: false, vertical: true)
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(.horizontal, 22)
          .padding(.top, 2)
        ScrollView(.vertical) {
          VStack(spacing: 0) {
            ZStack {
              // one tap away: loaded into memory unseen, so a tile's tap swaps her at once
              ForEach(content.near, id: \.self) { ref in
                KImage(ref, size: CGSize(width: Self.bird, height: Self.bird), contentMode: .fit, placeholder: .clear)
                  .opacity(0)
              }
              KImage(content.bird, size: CGSize(width: Self.bird, height: Self.bird), contentMode: .fit, placeholder: .clear)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .accessibilityHidden(true)
            KWardrobeSheetRack(theme: theme, content: content, actions: actions)
          }
          .padding(.horizontal, 18)
          .padding(.bottom, 24)
        }
        .scrollIndicators(.hidden)
        KObAcidKey(label: content.keep, action: actions.onKeep)
          .padding(.horizontal, 22)
          .padding(.top, 8)
          // paddingBottom max(insets.bottom, 16), from the sheet's foot (the safe area is already under it)
          .padding(.bottom, max(geo.safeAreaInsets.bottom, 16) - geo.safeAreaInsets.bottom)
      }
    }
    .background(KOb.shell.ignoresSafeArea())
    .presentationBackground(KOb.shell)
    // onboarding's paper: its own inks in every theme, so the system's parts match it
    .environment(\.colorScheme, .light)
  }
}

/// WardrobeRack, tone "post", both rows with their headers (see the top).
struct KWardrobeSheetRack: View {
  let theme: KTheme
  let content: KWardrobeSheetContent
  let actions: KWardrobeSheetActions

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      header(content.looksLabel, content.looksCount)
      HStack(alignment: .top, spacing: 6) {
        ForEach(content.looks) { tile in
          KCourierRackTile(theme: theme, tile: tile) { actions.onLook(tile.id) }
            .frame(maxWidth: .infinity)
        }
      }
      header(content.dressLabel, content.dressCount)
        .padding(.top, 16)
      ScrollView(.horizontal) {
        HStack(alignment: .top, spacing: 8) {
          ForEach(content.dress) { tile in
            KCourierRackTile(theme: theme, tile: tile) { actions.onDress(tile.id) }
              .frame(width: 76)
          }
        }
        .padding(.trailing, 24)
        .padding(.bottom, 4)
      }
      .scrollIndicators(.hidden)
    }
  }

  private func header(_ label: String, _ count: String) -> some View {
    HStack(alignment: .firstTextBaseline, spacing: 6) {
      Text(label)
        .kText(KWardrobeSheet.headerLabel)
        .foregroundStyle(theme.mute)
      Text(count)
        .kText(KWardrobeSheet.headerCount)
        .foregroundStyle(theme.mute)
    }
    .padding(.bottom, 8)
    .accessibilityElement(children: .combine)
  }
}
