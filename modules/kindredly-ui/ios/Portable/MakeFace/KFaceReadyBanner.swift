// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 WREN KNOCKS INSIDE THE APP, in SwiftUI (batch 3, slice 4, 2026-11-09; behind the "faceready"
 switch). The port of src/components/FaceReadyBanner.tsx (the owner's design, 2026-10-31, board
 3): the reader left Make your own face while Wren painted and is still in the app when the
 drawing lands, so a banner drops from the top with the new face, the line and See, which opens
 the page on the result. TS decides everything — when it shows, the eight seconds, the tap's
 route, VoiceOver's announcement — and places this in a Host of its own, 12 from the sides and 6
 under the status bar, as tall as the card; this draws the card and reports the tap.

   ╭────────────────────────────────────────────────╮  sf, a 1pt line edge, corners 24, the
   │ (face)  knock knock. your face is done.  [See] │  shadow #1E1B35 at .28, radius 18, 10 down;
   │   (Wren) Wren                                  │  padding 10 / 10 left / 12 right, 12 apart
   ╰────────────────────────────────────────────────╯

 - the face at 52, round: the new face's picture, or a lav disc while there is none; Wren at 30,
   delighted (her snapshot: her own look, never redrawn), hanging off its bottom right (12 out,
   8 down), over the face;
 - the line in System 600 15, ink, at most two lines; under it "Wren" in 13 mute, one line (2
   apart); both take what room is left;
 - See: an ind capsule at least 36 tall, 14 in, its word in System 600 14 in the page colour.
 The whole card is the one button (the React Native Pressable: no pressed look), read as the line
 and See.

 IN: React Native's Animated.spring (friction 7, tension 70: stiffness 338.8, damping 22) from 120
 above with the opacity riding the same value. OUT: once `shown` goes false, back up and out over
 .22 s (Animated.timing's Easing.inOut(Easing.ease)); TS takes the Host away after. DELIBERATELY
 DIFFERENT: under Reduce Motion React Native still slid it (a .2 s timing) though its comment
 says it fades; here it only fades, in .2 s and out .22 s, as the comment meant.

 The edge's hairline and the soft shadow are React Native's own look for this card (rule B's hard
 shadow is for objects; this is a system banner, copied as it is).
 */

/// What the banner shows (all of TS's words).
public struct KFaceReadyContent: Equatable {
  /// "knock knock. your face is done."
  public var title = ""
  /// the small line under it (React Native's "Wren")
  public var name = ""
  /// "See it"
  public var see = ""
  /// VoiceOver's label for the card: the line and See
  public var a11yLabel = ""
  /// the new face's picture; nil draws the lav disc
  public var face: KImageRef?
  /// her delighted picture at 30; nil until captured
  public var bird: KImageRef?
  /// false: it goes back up and out
  public var shown = true

  public init() {}
}

public struct KFaceReadyBanner: View {
  static let faceSize: CGFloat = 52
  static let birdSize: CGFloat = 30
  static let radius: CGFloat = 24
  static let rise: CGFloat = 120
  /// RN Animated.spring friction 7 / tension 70, through React Native's origami conversion
  static let inSpring = Animation.interpolatingSpring(mass: 1, stiffness: 338.8, damping: 22, initialVelocity: 0)
  static let outDuration: Double = 0.22
  static let calmInDuration: Double = 0.2
  static let shadowInk = Color(hex: "#1E1B35")

  private let theme: KTheme
  private let content: KFaceReadyContent
  private let onOpen: () -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var arrived = false

  public init(theme: KTheme, content: KFaceReadyContent, onOpen: @escaping () -> Void) {
    self.theme = theme
    self.content = content
    self.onOpen = onOpen
  }

  private var visible: Bool { arrived && content.shown }

  public var body: some View {
    let shape = RoundedRectangle(cornerRadius: Self.radius, style: .circular)
    SwiftUI.Button(action: onOpen) {
      HStack(spacing: 12) {
        face
        VStack(alignment: .leading, spacing: 2) {
          Text(content.title)
            .kText(.system(15, .semibold))
            .foregroundStyle(theme.ink)
            .lineLimit(2)
          Text(content.name)
            .kText(.system(13))
            .foregroundStyle(theme.mute)
            .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        Text(content.see)
          .kText(.system(14, .semibold))
          .foregroundStyle(theme.bg)
          .lineLimit(1)
          .padding(.horizontal, 14)
          .frame(minHeight: 36)
          .background(Capsule().fill(theme.ind))
      }
      .padding(.vertical, 10)
      .padding(.leading, 10)
      .padding(.trailing, 12)
      .background { shape.fill(theme.sf) }
      .overlay { shape.strokeBorder(theme.line, lineWidth: 1) }
      .compositingGroup()
      .shadow(color: Self.shadowInk.opacity(0.28), radius: 18, x: 0, y: 10)
      .contentShape(shape)
    }
    .buttonStyle(KAsIsButtonStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(content.a11yLabel)
    .accessibilityAddTraits(.isButton)
    .opacity(visible ? 1 : 0)
    .offset(y: visible || reduceMotion ? 0 : -Self.rise)
    .allowsHitTesting(content.shown)
    .accessibilityHidden(!content.shown)
    .onAppear {
      guard !arrived else { return }
      withAnimation(reduceMotion ? .easeInOut(duration: Self.calmInDuration) : Self.inSpring) { arrived = true }
    }
    .animation(Animation(KEaseInOutEase(duration: Self.outDuration)), value: content.shown)
  }

  /// The new face, round, with Wren hanging off its bottom right.
  private var face: some View {
    ZStack {
      if let ref = content.face {
        KImage(ref, size: CGSize(width: Self.faceSize, height: Self.faceSize), placeholder: .clear)
          .clipShape(Circle())
      } else {
        Circle().fill(theme.lav)
      }
    }
    .frame(width: Self.faceSize, height: Self.faceSize)
    .overlay(alignment: .bottomTrailing) {
      KWrenPicture(content.bird, size: Self.birdSize)
        .offset(x: 12, y: 8)
        .allowsHitTesting(false)
    }
  }
}
