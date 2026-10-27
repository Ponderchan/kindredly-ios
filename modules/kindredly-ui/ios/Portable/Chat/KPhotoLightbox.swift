// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 A PHOTO, BIG, IN SWIFT (2026-10-27, behind the "lightbox" switch): the React Native
 PhotoLightbox (src/components/PhotoLightbox.tsx) drawn by SwiftUI. The window it opens in, its
 fade, the keyboard put away and the signing of a moments path stay TS's
 (src/components/PhotoLightbox.tsx PhotoLightboxSwift); this draws what is inside the window.

 Tap a photo and it opens alone on ink: pinch to look closer (up to 4×, bouncing back from past
 either end as iOS's scroll-view zoom does, around the point the pinch began), drag to look
 around once it is closer, tap anywhere or the × to put it back. A pinch is never a tap: two
 fingers anywhere in the gesture and it doesn't close; once the photo is zoomed in (past 1.01),
 only the × closes it, so panning around a close-up can't throw it away. The stage is
 near-black (rgba 10,10,12 at .96) and the × white on its own dark disc in every theme: a photo
 is looked at on dark, so none of this follows the page's colours.

 The photo is drawn .fit in the screen's width and 80% of its height, as the React Native one
 is. VoiceOver: the stage and the × are each one button named "Close" (TS's word), and the
 escape gesture closes it. Reduce Motion: the bounce back is a jump.
 */

public struct KPhotoLightboxContent: Equatable, Sendable {
  /// the photo; nil while its link is signed (the stage alone)
  public var photo: KImageRef?
  /// VoiceOver for the stage and the ×
  public var closeLabel = ""

  public init() {}
}

public struct KPhotoLightbox: View {
  /// the stage, rgba(10,10,12,.96), in every theme
  static let stage = Color(.sRGB, red: 10 / 255, green: 10 / 255, blue: 12 / 255, opacity: 0.96)
  /// the ×'s disc, rgba(10,10,12,.55): a zoomed-in photo can put white right behind it
  static let disc = Color(.sRGB, red: 10 / 255, green: 10 / 255, blue: 12 / 255, opacity: 0.55)
  static let maxZoom: CGFloat = 4
  /// past this the photo is zoomed in, and only the × closes it
  static let zoomedAbove: CGFloat = 1.01
  /// how far a pinch may go past either end before it resists entirely (the bounce)
  static let overZoom: CGFloat = 0.3

  private let content: KPhotoLightboxContent
  private let topInset: CGFloat
  private let onClose: () -> Void

  @State private var scale: CGFloat = 1
  @State private var offset: CGSize = .zero
  /// the scale and offset when the pinch or the drag in progress began; nil between gestures
  @State private var pinchBase: (scale: CGFloat, offset: CGSize)?
  @State private var dragBase: CGSize?
  /// a second finger was down during this gesture: the tap that ends it isn't one
  @State private var pinched = false
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  public init(content: KPhotoLightboxContent, topInset: CGFloat, onClose: @escaping () -> Void) {
    self.content = content
    self.topInset = topInset
    self.onClose = onClose
  }

  public var body: some View {
    GeometryReader { geo in
      let size = geo.size
      ZStack(alignment: .topTrailing) {
        Self.stage
        KImage(content.photo, size: CGSize(width: size.width, height: size.height * 0.8), contentMode: .fit, placeholder: .clear)
          .scaleEffect(scale)
          .offset(offset)
          .frame(width: size.width, height: size.height)
          .contentShape(Rectangle())
          .gesture(magnify(size).simultaneously(with: pan(size)))
          .onTapGesture {
            // a pinch is never a tap, and a close-up only closes from the ×
            if !pinched && scale <= Self.zoomedAbove { onClose() }
          }
          .accessibilityElement()
          .accessibilityLabel(content.closeLabel)
          .accessibilityAddTraits(.isButton)
          .accessibilityAction { onClose() }
        closeKey
          .padding(.top, topInset + 6)
          .padding(.trailing, 14)
      }
      .frame(width: size.width, height: size.height)
    }
    .ignoresSafeArea()
    .accessibilityAction(.escape) { onClose() }
    .onChange(of: content.photo) { _, _ in
      // another photo starts at its own size
      scale = 1
      offset = .zero
      pinchBase = nil
      dragBase = nil
      pinched = false
    }
  }

  private var closeKey: some View {
    SwiftUI.Button(action: onClose) {
      Text(verbatim: "×")
        .font(.system(size: 26))
        .foregroundStyle(Color.white)
        .frame(width: 40, height: 40)
        .background(Self.disc, in: Circle())
        // the React Native key's hitSlop of 12
        .padding(12)
        .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .padding(-12)
    .accessibilityLabel(content.closeLabel)
  }

  /// the pinch: around the point it began, past either end with resistance
  private func magnify(_ size: CGSize) -> some Gesture {
    MagnifyGesture()
      .onChanged { v in
        pinched = true
        let base = pinchBase ?? (scale, offset)
        if pinchBase == nil { pinchBase = base }
        let s = Self.resisted(base.scale * v.magnification)
        // the point under the pinch's start stays under it
        let cx = size.width / 2
        let cy = size.height / 2
        let qx = (v.startLocation.x - cx - base.offset.width) / base.scale
        let qy = (v.startLocation.y - cy - base.offset.height) / base.scale
        scale = s
        offset = CGSize(width: v.startLocation.x - cx - qx * s, height: v.startLocation.y - cy - qy * s)
      }
      .onEnded { _ in
        pinchBase = nil
        settle(size)
        // the gesture is over once the last finger lifts: the next tap is a tap again
        DispatchQueue.main.async { pinched = false }
      }
  }

  /// the drag around a close-up (nothing to drag at its own size)
  private func pan(_ size: CGSize) -> some Gesture {
    DragGesture(minimumDistance: 4)
      .onChanged { v in
        guard pinchBase == nil, scale > Self.zoomedAbove else { return }
        let base = dragBase ?? offset
        if dragBase == nil { dragBase = base }
        let want = CGSize(width: base.width + v.translation.width, height: base.height + v.translation.height)
        offset = Self.rubber(want, bound: Self.bounds(size, scale: scale))
      }
      .onEnded { _ in
        guard dragBase != nil else { return }
        dragBase = nil
        settle(size)
      }
  }

  /// back inside 1…4 and inside the photo's bounds, as the scroll view bounces
  private func settle(_ size: CGSize) {
    let s = min(Self.maxZoom, max(1, scale))
    let b = Self.bounds(size, scale: s)
    let o = CGSize(width: min(b.width, max(-b.width, offset.width)), height: min(b.height, max(-b.height, offset.height)))
    guard s != scale || o != offset else { return }
    withAnimation(reduceMotion ? nil : .easeOut(duration: 0.25)) {
      scale = s
      offset = s <= 1 ? .zero : o
    }
  }

  /// how far the stage, scaled, can move each way before an edge comes inside the screen
  static func bounds(_ size: CGSize, scale: CGFloat) -> CGSize {
    CGSize(width: max(0, (size.width * scale - size.width) / 2), height: max(0, (size.height * scale - size.height) / 2))
  }

  /// a scale past either end, halved and capped, as a bounce
  static func resisted(_ s: CGFloat) -> CGFloat {
    if s < 1 { return max(1 - overZoom, 1 - (1 - s) / 2) }
    if s > maxZoom { return min(maxZoom * (1 + overZoom), maxZoom + (s - maxZoom) / 2) }
    return s
  }

  /// an offset past the bounds, halved
  static func rubber(_ o: CGSize, bound b: CGSize) -> CGSize {
    func one(_ v: CGFloat, _ m: CGFloat) -> CGFloat {
      if v > m { return m + (v - m) / 2 }
      if v < -m { return -m + (v + m) / 2 }
      return v
    }
    return CGSize(width: one(o.width, b.width), height: one(o.height, b.height))
  }
}
