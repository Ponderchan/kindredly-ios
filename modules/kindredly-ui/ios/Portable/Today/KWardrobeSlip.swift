// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE WARDROBE SLIP — the first arrival's "Otis wants a look →" over Today (the new onboarding's
 storyboard §6), drawn by SwiftUI behind the "wardrobeslip" switch. src/screens/today/
 WardrobeSlip.tsx decides everything (the flag, when it shows, the sheet it opens: the React
 Native wardrobe rack in a page sheet, which stays React Native) and places this in a Host of its
 own just above the control band; this draws the slip and reports its two taps:

   ╭──────────────────────────────────────────╮   a slip of cream paper (#FFF3D6), corners 18,
   │ (Wren)  Otis wants a look →           ×  │   its content where the old 3pt outline put it;
   │         try anything on, free            │   rule B: an object, so no black edge, on the
   ╰──────────────────────────────────────────╯   deeper-purple hard shadow (4/4, its own depth)

 - Wren at 46, her own look (her content snapshot from BirdSnapshots, never redrawn here), the
   name line in system 700 16.5 in ink, the small line in 400 13 in the soft ink, one line each;
   the slip's own ink, the same in every theme (it is a piece of paper, not the page).
 - The slip itself is one button (the name line and the small line, for VoiceOver), .7 while
   pressed; the × (14, 2.6 round strokes, the soft ink) on a 44 target puts it away ("Not now").
 - IN: half a second after it appears, it fades in rising 25pt over .36s; OUT: once `shown` goes
   false (either tap), it fades out over .16s and TS takes the Host away after. Under Reduce
   Motion it is simply there, and simply gone.
 */

/// The slip's two taps.
final class KWardrobeSlipActions {
  /// the slip: the wardrobe sheet opens
  var onOpen: () -> Void = {}
  /// the ×: put away
  var onClose: () -> Void = {}
}

struct KWardrobeSlipContent: Equatable {
  /// "Otis wants a look →"
  var title = ""
  /// "try anything on, free"
  var sub = ""
  /// the ×, for VoiceOver ("Not now")
  var close = ""
  /// her content picture, nil until captured
  var bird: KImageRef?
  /// false once either tap has put it away: it fades out
  var shown = true
}

struct KWardrobeSlip: View {
  /// the slip's paper and inks (onboarding's OB tokens: they don't follow the theme)
  static let paper = Color(hex: "#FFF3D6")
  static let ink = Color(hex: "#1E1B35")
  static let inkSoft = Color(hex: "#4A4664")
  static let radius: CGFloat = 18
  /// the old outline's width: the content stays where it put it
  static let edge: CGFloat = 3
  /// the slip's own depth (the old hard shadow's 4)
  static let depth: CGFloat = 4
  static let birdSize: CGFloat = 46
  static let minHeight: CGFloat = 64
  /// FadeInDown: .5s late, .36s, from 25 below
  static let inDelay: Double = 0.5
  static let inDuration: Double = 0.36
  static let inRise: CGFloat = 25
  static let outDuration: Double = 0.16
  /// Reanimated's timing default, Easing.inOut(Easing.quad), as a curve
  static func quadInOut(_ duration: Double) -> Animation { .timingCurve(0.455, 0.03, 0.515, 0.955, duration: duration) }

  let theme: KTheme
  let content: KWardrobeSlipContent
  let actions: KWardrobeSlipActions

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var arrived = false

  private var visible: Bool { arrived && content.shown }

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: Self.radius, style: .circular)
    HStack(spacing: 0) {
      SwiftUI.Button(action: actions.onOpen) {
        HStack(spacing: 10) {
          KImage(content.bird, size: CGSize(width: Self.birdSize, height: Self.birdSize), contentMode: .fit, placeholder: .clear)
            .frame(width: Self.birdSize, height: Self.birdSize)
          VStack(alignment: .leading, spacing: 1) {
            Text(content.title)
              .kText(.system(16.5, .bold))
              .foregroundStyle(Self.ink)
              .lineLimit(1)
            Text(content.sub)
              .kText(.system(13))
              .foregroundStyle(Self.inkSoft)
              .lineLimit(1)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.vertical, 8)
        .contentShape(Rectangle())
      }
      .buttonStyle(KWardrobeSlipPressStyle())
      .accessibilityElement(children: .ignore)
      .accessibilityLabel("\(content.title) \(content.sub)")
      .accessibilityAddTraits(.isButton)
      SwiftUI.Button(action: actions.onClose) {
        KLineIcon(.close, size: 14, lineWidth: 2.6, color: Self.inkSoft)
          .frame(width: 44, height: 44)
          .contentShape(Rectangle())
      }
      .buttonStyle(KAsIsButtonStyle())
      .accessibilityLabel(content.close)
    }
    .padding(.leading, 10 + Self.edge)
    .padding(.trailing, 4 + Self.edge)
    .padding(.vertical, Self.edge)
    .frame(minHeight: Self.minHeight)
    .background { shape.fill(Self.paper) }
    .kObjectDepth(shape, theme: theme, offset: Self.depth)
    // the depth hangs outside the slip: the Host is sized to hold it
    .padding(.trailing, Self.depth)
    .padding(.bottom, Self.depth)
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
    .opacity(visible ? 1 : 0)
    .offset(y: arrived || reduceMotion ? 0 : Self.inRise)
    .allowsHitTesting(content.shown)
    .accessibilityHidden(!content.shown)
    .onAppear {
      guard !arrived else { return }
      if reduceMotion {
        arrived = true
      } else {
        withAnimation(Self.quadInOut(Self.inDuration).delay(Self.inDelay)) { arrived = true }
      }
    }
    .animation(reduceMotion ? nil : Self.quadInOut(Self.outDuration), value: content.shown)
  }
}

/// The slip's press: .7 while held, as the React Native Pressable.
private struct KWardrobeSlipPressStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .opacity(configuration.isPressed ? 0.7 : 1)
  }
}
