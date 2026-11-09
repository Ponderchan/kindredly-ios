// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 ONE FRAME, FULL SCREEN, IN SWIFTUI (batch 3, 2026-11-09; the "frameviewer" switch, off by
 default). The React Native FrameViewer (src/components/SelfCompose.tsx) opened over the Notes
 composer when a picture's thumbnail is tapped; it stays the fallback. Its Modal stays too (the
 window, its fade, the back gesture: src/components/FrameViewerSwift.tsx), and this draws what is
 inside it, from TS's photos and words:

   ‹            2/5              🗑      the chevron (white, Settings' size and place, 12 in), the
                                         count in SF Mono 600 12 at 1.4 centred between 56 and
                                         the bin, the bin (a 20 line drawing at 1.7 in a 44 box,
                                         8 from the right); a 52 row under the safe area
   ┌──────────────────────────────┐
   │        the picture, .fit     │      a pager: one picture to a screen's width, swiped
   │                              │      sideways; a tap on it goes back to the page
   └──────────────────────────────┘
          ( Make It the Cover )          on any picture but the first: a white 1.5 capsule,
               THE COVER                 System 600 14 at 0.3 (60% while pressed); on the first,
                                         THE COVER in SF Mono 600 10.5 at 1.4, white at 55%;
                                         12 above it, the safe area + 18 below

 The stage is near-black (#0A0A0C) with white controls in every theme, the way a photo viewer
 is, so nothing follows the theme. Every word is TS's. The bin and the cover report the picture
 on show by its index; TS makes the cover (and closes) or takes the picture off (and says which
 picture to show next, as `index`). The pager follows `index` whenever TS changes it, and keeps
 its place in range when pictures go.

 VoiceOver: the count is read as "Photo 2 of 5" (TS's sc.a11y.photo / photoCover for the picture
 on show), the bin is "Delete this photo", each picture is a button that closes, and escape
 closes. What is different: nothing drawn; the chevron presses like every SwiftUI back key does
 (KFloatPressStyle) rather than React Native's.
 */

/// Every word of the viewer.
public struct KFrameViewerStrings: Equatable, Sendable {
  /// VoiceOver for the ‹ (ob2.back)
  public var backLabel = ""
  /// VoiceOver for the bin (sc.a11y.deletePhoto)
  public var removeLabel = ""
  /// under the first picture (sc.isCover)
  public var isCover = ""
  /// the capsule under any other (sc.makeCover)
  public var makeCover = ""

  public init() {}
}

/// One picture of the viewer.
public struct KFrameViewerPhoto: Equatable, Sendable {
  public let image: KImageRef?
  /// "Photo 2 of 5" ("…, the cover" for the first of two or more)
  public let accessibilityLabel: String

  public init(image: KImageRef?, accessibilityLabel: String) {
    self.image = image
    self.accessibilityLabel = accessibilityLabel
  }
}

/// What the viewer tells its owner. One object for the life of the viewer; set the closures once.
public final class KFrameViewerActions {
  public var onClose: () -> Void = {}
  /// make this picture the cover
  public var onCover: (Int) -> Void = { _ in }
  /// take this picture off the page
  public var onRemove: (Int) -> Void = { _ in }

  public init() {}
}

public struct KFrameViewer: View {
  /// the stage, #0A0A0C, in every theme
  static let stage = Color(.sRGB, red: 10 / 255, green: 10 / 255, blue: 12 / 255, opacity: 1)
  static let faint = Color.white.opacity(0.55)
  /// the bin, on a 24 grid (the React Native drawing's path)
  static let binPath = "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"

  private let photos: [KFrameViewerPhoto]
  /// the picture TS asks for (where it opened, or where to go after one went)
  private let index: Int
  private let strings: KFrameViewerStrings
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let actions: KFrameViewerActions

  /// the page the pager rests on (nil until it has opened at `index`)
  @State private var page: Int?

  public init(photos: [KFrameViewerPhoto], index: Int, strings: KFrameViewerStrings, topInset: CGFloat, bottomInset: CGFloat, actions: KFrameViewerActions) {
    self.photos = photos
    self.index = index
    self.strings = strings
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
  }

  /// the picture on show, always in range (React Native's Math.min(page, photos.length - 1))
  private var current: Int {
    max(0, min(page ?? index, photos.count - 1))
  }

  public var body: some View {
    VStack(spacing: 0) {
      Color.clear.frame(height: topInset)
      header
      pager
      footer
        .padding(.top, 12)
        .padding(.bottom, bottomInset + 18)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background { Self.stage.ignoresSafeArea() }
    .environment(\.colorScheme, .dark)
    .accessibilityElement(children: .contain)
    .accessibilityAction(.escape) { actions.onClose() }
    .onChange(of: index) { _, next in page = next }
    .onChange(of: photos.count) { _, count in
      if let p = page, p > count - 1 { page = max(0, count - 1) }
    }
  }

  // ── the head: ‹, the count, the bin ──

  private var header: some View {
    ZStack(alignment: .leading) {
      HStack(spacing: 0) {
        Text(verbatim: photos.isEmpty ? "" : "\(current + 1)/\(photos.count)")
          .kText(.mono(12, .semibold, tracking: 1.4 / 12))
          .foregroundStyle(Color.white)
          .lineLimit(1)
          .frame(maxWidth: .infinity)
          .accessibilityLabel(photos.indices.contains(current) ? photos[current].accessibilityLabel : "")
        SwiftUI.Button {
          actions.onRemove(current)
        } label: {
          Canvas { context, size in
            let s = size.width / 24
            let path = KSVGPath.path(Self.binPath).applying(CGAffineTransform(scaleX: s, y: s))
            context.stroke(path, with: .color(.white), style: StrokeStyle(lineWidth: 1.7 * s, lineCap: .round, lineJoin: .round))
          }
          .frame(width: 20, height: 20)
          .frame(width: 44, height: 44)
          .contentShape(Rectangle())
        }
        .buttonStyle(KAsIsButtonStyle())
        .accessibilityLabel(strings.removeLabel)
      }
      .padding(.leading, 56)
      .padding(.trailing, 8)
      // the ‹ in its 36 box 12 from the edge, its 44 reach around it
      SwiftUI.Button(action: actions.onClose) {
        KLineIcon(.chevronLeft, size: 18, lineWidth: 2.2, color: .white)
          .frame(width: 36, height: 36)
          .padding(4)
          .contentShape(Rectangle())
      }
      .buttonStyle(KFloatPressStyle())
      .accessibilityLabel(strings.backLabel)
      .padding(.leading, 12 - 4)
    }
    .frame(height: 52)
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
  }

  // ── the pictures, one to a screen's width ──

  private var pager: some View {
    GeometryReader { geo in
      ScrollViewReader { proxy in
        ScrollView(.horizontal) {
          LazyHStack(spacing: 0) {
            ForEach(photos.indices, id: \.self) { k in
              KImage(photos[k].image, size: geo.size, contentMode: .fit, placeholder: .clear)
                .frame(width: geo.size.width, height: geo.size.height)
                .contentShape(Rectangle())
                .onTapGesture { actions.onClose() }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(photos[k].accessibilityLabel)
                .accessibilityAddTraits(.isButton)
                .accessibilityAction { actions.onClose() }
                .id(k)
            }
          }
          .scrollTargetLayout()
        }
        .scrollIndicators(.hidden)
        .scrollTargetBehavior(.paging)
        .scrollPosition(id: $page)
        .onAppear {
          // open at the picture asked for, without a slide across the ones before it
          let start = max(0, min(index, photos.count - 1))
          page = start
          proxy.scrollTo(start, anchor: .leading)
        }
      }
    }
  }

  // ── under it: the cover, or the way to make this one it ──

  @ViewBuilder
  private var footer: some View {
    if current == 0 {
      Text(strings.isCover)
        .kText(.mono(10.5, .semibold, tracking: 1.4 / 10.5))
        .foregroundStyle(Self.faint)
        .multilineTextAlignment(.center)
    } else {
      SwiftUI.Button {
        actions.onCover(current)
      } label: {
        Text(strings.makeCover)
          .kText(.system(14, .semibold, tracking: 0.3 / 14))
          .foregroundStyle(Color.white)
          .padding(.horizontal, 18)
          .padding(.vertical, 10)
          .overlay(Capsule().strokeBorder(Color.white, lineWidth: 1.5))
          .contentShape(Capsule())
      }
      .buttonStyle(KFrameViewerCoverStyle())
    }
  }
}

/// The cover capsule at 60% while pressed (the React Native Pressable's opacity).
struct KFrameViewerCoverStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label.opacity(configuration.isPressed ? 0.6 : 1)
  }
}
