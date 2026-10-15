// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.
// The loader that React Native's app installs is Adapters/KImageStore.swift; it never leaks in here.

import SwiftUI

/*
 EVERY PICTURE IN A SWIFT SURFACE: portraits, moment photos, face and bird snapshots, keepsake
 icons, journal photos, video posters. A view draws one with

     KImage(ref, size: CGSize(width: 52, height: 52), placeholder: theme.soft2)
       .clipShape(Circle())

 and never loads anything itself: KImage asks whoever is installed in the environment as
 \.kImageLoader for a CGImage already downsampled to the pixels it will be drawn at. In the
 React Native app every screen adapter installs the one shared KImageStore
 (.kScreenEnvironment(props)); the 1.1.0 app installs its own loader. With no loader installed,
 KImage draws its placeholder and nothing else.

 How it draws:
 - The frame is always the size given, loaded or not, so a row keeps its height while its
   picture loads (snapshots and portraits are screen-scale PNGs with no @3x suffix; nothing
   here trusts a picture's own size).
 - Until the picture is there, the placeholder colour fills the frame (soft2 in the 10a
   screens; .clear for a transparent bird). The picture then fades in over .15s, or appears at
   once under Reduce Motion, and the placeholder goes, so a transparent PNG isn't drawn on it.
 - A picture the loader already has in memory is drawn on the first frame, with no placeholder
   and no fade, so a lazy row scrolled back into view doesn't flash.
 - .fill (the default) covers the frame and crops; .fit shows all of it. Either way it is
   clipped to the frame; give it a clipShape for a round face.
 - overscan draws the picture that much larger than the frame, centred and cropped: the six
   legacy portraits are drawn 5% larger (overscan .05), as AvatarImage does.
 - It is decorative: VoiceOver skips it. Label the element that holds it.
 */

/// Where a picture comes from, and the key it is cached under.
public struct KImageRef: Hashable, Sendable {
  /// What to make of the URL.
  public enum Kind: String, Hashable, Sendable {
    /// a still image file: PNG, JPEG, HEIC (whatever its extension says)
    case image
    /// a video file; the picture is a still frame from near its start
    case videoPoster
  }

  /// file:// or http(s)://
  public let url: URL
  /// The identity of the picture. The same key must always mean the same picture, so a loader
  /// may serve it from a cache without looking at the URL: a storage path, never a signed URL,
  /// which changes every time it is re-signed.
  public let cacheKey: String
  public let kind: Kind

  public init(url: URL, cacheKey: String, kind: Kind = .image) {
    self.url = url
    self.cacheKey = cacheKey
    self.kind = kind
  }

  /// From the strings the JS side sends: a file:// or http(s):// URI, or a bare absolute path,
  /// which is read as a file. An empty key uses the URI as the key. nil for an empty or
  /// unreadable URI.
  public init?(uri: String, key: String = "", kind: Kind = .image) {
    let trimmed = uri.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return nil }
    let url: URL
    if trimmed.hasPrefix("/") {
      url = URL(fileURLWithPath: trimmed)
    } else if let parsed = URL(string: trimmed), let scheme = parsed.scheme?.lowercased(),
              scheme == "file" || scheme == "http" || scheme == "https" {
      url = parsed
    } else {
      return nil
    }
    self.init(url: url, cacheKey: key.isEmpty ? trimmed : key, kind: kind)
  }
}

/// Whoever turns a KImageRef into pixels. KImage asks the one in the environment
/// (\.kImageLoader). Implementations do their work off the main thread.
public protocol KImageLoading: Sendable {
  /// The picture, made to cover `pixelSize` (it may be larger, never smaller unless the source
  /// is), already decoded; nil when it can't be had (missing file, network error, not an image).
  /// A cancelled caller gets nil.
  func load(_ ref: KImageRef, pixelSize: CGSize) async -> CGImage?

  /// The picture if it can be had at once from memory, without waiting; nil otherwise. Called
  /// from a view's body on the main thread, so it must be cheap. Defaults to nil.
  func cachedImage(_ ref: KImageRef, pixelSize: CGSize) -> CGImage?
}

public extension KImageLoading {
  func cachedImage(_ ref: KImageRef, pixelSize: CGSize) -> CGImage? { nil }
}

private struct KImageLoaderKey: EnvironmentKey {
  static let defaultValue: (any KImageLoading)? = nil
}

public extension EnvironmentValues {
  /// The loader every KImage below asks; nil (the default) draws placeholders only.
  var kImageLoader: (any KImageLoading)? {
    get { self[KImageLoaderKey.self] }
    set { self[KImageLoaderKey.self] = newValue }
  }
}

public extension View {
  /// Installs the loader every KImage inside asks for its pictures.
  func kImageLoader(_ loader: (any KImageLoading)?) -> some View {
    environment(\.kImageLoader, loader)
  }
}

/// One picture, drawn at a fixed size (see the note at the top of KImage.swift).
public struct KImage: View {
  private let ref: KImageRef?
  private let size: CGSize
  private let contentMode: ContentMode
  private let placeholder: Color
  private let overscan: CGFloat

  @Environment(\.kImageLoader) private var loader
  @Environment(\.displayScale) private var displayScale
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var shown: Shown?

  /// - Parameters:
  ///   - ref: the picture, or nil for the placeholder alone
  ///   - size: the frame, in points; always applied
  ///   - contentMode: .fill covers the frame and crops (the default); .fit shows it all
  ///   - placeholder: the colour that fills the frame until the picture is there
  ///   - overscan: how much larger than the frame to draw it, e.g. 0.05 for 5%
  public init(_ ref: KImageRef?, size: CGSize, contentMode: ContentMode = .fill, placeholder: Color, overscan: CGFloat = 0) {
    self.ref = ref
    self.size = size
    self.contentMode = contentMode
    self.placeholder = placeholder
    self.overscan = max(0, overscan)
  }

  /// what is asked of the loader: the picture and the pixels it will cover
  private struct Request: Hashable {
    let ref: KImageRef
    let width: Int
    let height: Int

    var pixelSize: CGSize { CGSize(width: width, height: height) }
  }

  private struct Shown {
    let request: Request
    let image: CGImage
  }

  private var drawSize: CGSize {
    CGSize(width: size.width * (1 + overscan), height: size.height * (1 + overscan))
  }

  private var request: Request? {
    guard let ref, size.width > 0, size.height > 0 else { return nil }
    let scale = max(1, displayScale)
    return Request(
      ref: ref,
      width: Int((drawSize.width * scale).rounded(.up)),
      height: Int((drawSize.height * scale).rounded(.up))
    )
  }

  public var body: some View {
    let request = self.request
    let image = request.flatMap(currentImage(for:))
    let animate = !reduceMotion
    ZStack {
      if let image {
        Image(decorative: image, scale: 1)
          .resizable()
          .aspectRatio(contentMode: contentMode)
          .frame(width: drawSize.width, height: drawSize.height)
          .transition(.opacity)
      } else {
        placeholder
          .transition(.opacity)
      }
    }
    .frame(width: size.width, height: size.height)
    .clipped()
    .task(id: request) {
      guard let request else { return }
      await load(request, animate: animate)
    }
  }

  /// what this frame can draw right now: the picture already shown for this request, or one the
  /// loader has in memory
  private func currentImage(for request: Request) -> CGImage? {
    if let shown, shown.request == request { return shown.image }
    return loader?.cachedImage(request.ref, pixelSize: request.pixelSize)
  }

  private func load(_ request: Request, animate: Bool) async {
    if let shown, shown.request == request { return }
    guard let loader else { return }
    if let hit = loader.cachedImage(request.ref, pixelSize: request.pixelSize) {
      shown = Shown(request: request, image: hit)
      return
    }
    guard let image = await loader.load(request.ref, pixelSize: request.pixelSize), !Task.isCancelled else { return }
    var transaction = Transaction(animation: animate ? .easeOut(duration: 0.15) : nil)
    transaction.disablesAnimations = !animate
    withTransaction(transaction) {
      shown = Shown(request: request, image: image)
    }
  }
}
