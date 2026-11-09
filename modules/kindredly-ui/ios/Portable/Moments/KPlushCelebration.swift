// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE PLUSH MOMENT, IN SWIFTUI (batch 3, 2026-11-09; behind the "plush" switch, off by default):
 the twin of src/components/PlushCelebration.tsx, which stays the fallback. When the first kindred
 lands, the Plush look unlocks, and this says so once, as a gift. Kindreds and Me both mount it;
 TS decides when (the plush_celebrated flag) and what the two keys do.

 A port: the window-level React Native Modal stays the container (TS fills it with one Host), so
 the fade in and out is still the Modal's own. Inside: the fixed dim (TS's colour: rgba(19,16,32,
 .55), or the black scrim on Midnight), and the card 30 in from the sides — sf, corners 28, on a
 dark theme a 1.5 ln frame (sf on the dimmed page is 1.2:1) — zooming in on Reanimated's
 ZoomIn.springify().damping(9).mass(0.8) (stiffness 100, from scale 0), the eyebrow fading in .2s
 later over Reanimated's default .3s. Under Reduce Motion both are simply there, as Reanimated's
 layout animations skip themselves then.

 On the card: NEW LOOK UNLOCKED (SF Mono 600 11 at .18em, ind), the Plush bird at 128 (a snapshot
 of her real art, lib/bird-images "plush128"), "Meet Plush" with the name in ind (system 700 24),
 the body (14/21, sub, at most 300 wide), the wear key (ind, corners 24, 15 tall padding, the page
 colour on it, 700 15) and the quiet keep (600 13, mute). Neither key has a pressed look, as the
 React Native Pressables have none. A tap on the dim does nothing, as before.
 */
public struct KPlushContent: Equatable, Sendable {
  public var eyebrow = ""
  /// "Meet ", the name, "!" — the name drawn in ind
  public var meetPre = ""
  public var meetName = ""
  public var meetPost = ""
  public var body = ""
  public var wear = ""
  public var keep = ""
  public var bird: KImageRef?
  /// the dim behind the card
  public var dim: Color = Color(.sRGB, red: 19 / 255, green: 16 / 255, blue: 32 / 255, opacity: 0.55)

  public init() {}
}

public struct KPlushCelebration: View {
  private let theme: KTheme
  private let content: KPlushContent
  private let onWear: () -> Void
  private let onKeep: () -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var zoomed = false
  @State private var eyebrowIn = false

  /// ZoomIn.springify().damping(9).mass(0.8), Reanimated's default stiffness
  static let zoom = Animation.interpolatingSpring(mass: 0.8, stiffness: 100, damping: 9)

  public init(theme: KTheme, content: KPlushContent, onWear: @escaping () -> Void, onKeep: @escaping () -> Void) {
    self.theme = theme
    self.content = content
    self.onWear = onWear
    self.onKeep = onKeep
  }

  public var body: some View {
    let shape = RoundedRectangle(cornerRadius: 28, style: .circular)
    ZStack {
      content.dim
        .ignoresSafeArea()
        .accessibilityHidden(true)
      VStack(spacing: 0) {
        Text(content.eyebrow)
          .kText(.mono(11, .semibold, tracking: 2.0 / 11))
          .foregroundStyle(theme.ind)
          .multilineTextAlignment(.center)
          .opacity(eyebrowIn || reduceMotion ? 1 : 0)
        KImage(content.bird, size: CGSize(width: 128, height: 128), contentMode: .fit, placeholder: .clear)
          .padding(.top, 10)
          .accessibilityHidden(true)
        (Text(content.meetPre) + Text(content.meetName).foregroundStyle(theme.ind) + Text(content.meetPost))
          .kText(.system(24, .bold))
          .foregroundStyle(theme.ink)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
          .padding(.top, 8)
          .accessibilityAddTraits(.isHeader)
        Text(content.body)
          .kText(.system(14, lineHeight: 21.0 / 14))
          .foregroundStyle(theme.sub)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
          .frame(maxWidth: 300)
          .padding(.top, 8)
        SwiftUI.Button(action: onWear) {
          Text(content.wear)
            .kText(.system(15, .bold))
            .foregroundStyle(theme.bg)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 15)
            .background(RoundedRectangle(cornerRadius: 24, style: .circular).fill(theme.ind))
            .contentShape(RoundedRectangle(cornerRadius: 24, style: .circular))
        }
        .buttonStyle(KSheetChrome.Press(pressed: 1))
        .padding(.top, 20)
        SwiftUI.Button(action: onKeep) {
          Text(content.keep)
            .kText(.system(13, .semibold))
            .foregroundStyle(theme.mute)
            .multilineTextAlignment(.center)
            .padding(.top, 12)
            .padding(.bottom, 2)
            // hitSlop 8
            .padding(.horizontal, 8)
            .contentShape(Rectangle())
        }
        .buttonStyle(KSheetChrome.Press(pressed: 1))
      }
      .padding(.top, 26)
      .padding(.bottom, 22)
      .padding(.horizontal, 24)
      .frame(maxWidth: .infinity)
      .background(shape.fill(theme.sf))
      .overlay {
        if theme.isDark { shape.strokeBorder(theme.ln, lineWidth: 1.5) }
      }
      .scaleEffect(zoomed || reduceMotion ? 1 : 0.001)
      .padding(.horizontal, 30)
      .accessibilityElement(children: .contain)
      .accessibilityAddTraits(.isModal)
      .accessibilityAction(.escape, onKeep)
    }
    .onAppear {
      guard !reduceMotion else { return }
      withAnimation(Self.zoom) { zoomed = true }
      withAnimation(.easeInOut(duration: 0.3).delay(0.2)) { eyebrowIn = true }
    }
  }
}
