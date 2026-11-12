import Foundation
import UIKit
import Photos
import os

/*
 THE PHONE'S OWN PHOTOS FOR A SWIFT SCREEN (the Notes photo roll, 2026-10-27). The roll's TS reads
 the library through expo-media-library, whose assets come as ph://<local identifier>; KImageStore
 reads files and links only. This KImageLoading takes ph:// refs to PhotoKit and hands everything
 else to KImageStore.shared, so the roll installs it in place of the store
 (.kImageLoader(KPhotoLibraryLoader.shared) inside .kScreenEnvironment) and every KImage on it,
 the album covers too, just works.

 - The picture is PhotoKit's own thumbnail at the pixels asked for (aspect fill, rounded up to
   KImageStore's 16-pixel step so near sizes share an entry), the high-quality one in a single
   answer, fetched from iCloud when the phone only keeps a small copy. A film gives its frame.
 - Kept in memory only (an NSCache by decoded bytes, at most 64 MB, emptied on a memory warning):
   Photos keeps its own cache, and the library's pictures never go to our disk.
 - A caller that goes away (a cell scrolled off) cancels its request.
 - What can't be had (an asset deleted meanwhile, no access) is logged and comes back nil; KImage
   keeps its placeholder.
 */
final class KPhotoLibraryLoader: KImageLoading, @unchecked Sendable {
  static let shared = KPhotoLibraryLoader()

  private let manager = PHImageManager.default()
  private let memory = NSCache<NSString, KPhotoLibraryBox>()
  private let log = Logger(subsystem: "kindredly-ui", category: "images")
  private var memoryWarning: NSObjectProtocol?

  private init() {
    memory.totalCostLimit = 64 * 1024 * 1024
    memoryWarning = NotificationCenter.default.addObserver(
      forName: UIApplication.didReceiveMemoryWarningNotification, object: nil, queue: nil
    ) { [memory] _ in
      memory.removeAllObjects()
    }
  }

  deinit {
    if let memoryWarning { NotificationCenter.default.removeObserver(memoryWarning) }
  }

  /// The ref for a uri TS sent: a ph:// asset as it is (KImageRef(uri:) takes files and links
  /// only), anything else as KImageRef reads it; nil for none.
  static func ref(_ uri: String) -> KImageRef? {
    let trimmed = uri.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return nil }
    if trimmed.lowercased().hasPrefix("ph://") {
      guard let url = URL(string: trimmed) else { return nil }
      return KImageRef(url: url, cacheKey: trimmed, kind: .image)
    }
    return KImageRef(uri: trimmed)
  }

  private static func isLibrary(_ ref: KImageRef) -> Bool {
    ref.url.scheme?.lowercased() == "ph"
  }

  /// the asset's local identifier: everything after ph:// in the uri TS sent (the cache key, which
  /// ref(_:) keeps as given)
  private static func localIdentifier(_ ref: KImageRef) -> String {
    String(ref.cacheKey.dropFirst("ph://".count))
  }

  private static func memoryKey(_ ref: KImageRef, _ box: CGSize) -> String {
    "ph|\(Int(box.width))x\(Int(box.height))|\(ref.cacheKey)"
  }

  /// The roll's first pictures read into memory ahead of the roll (THE + OPENS, owner 2026-11-12:
  /// "点写日记…还是抖": the roll rose with grey squares that filled in one by one on the way up).
  /// `pixels` is a cell's side in pixels, what KImage will ask for (its side × the display scale,
  /// rounded up), so the cells find them on their first frame. Only ph:// refs; at most `limit`;
  /// returns at once.
  func prime(_ uris: [String], pixels: CGFloat, limit: Int = 21) {
    guard pixels > 0, pixels.isFinite else { return }
    let size = CGSize(width: pixels.rounded(.up), height: pixels.rounded(.up))
    let refs = uris.prefix(limit).compactMap(Self.ref).filter(Self.isLibrary)
    guard !refs.isEmpty else { return }
    Task.detached(priority: .userInitiated) { [self] in
      await withTaskGroup(of: Void.self) { group in
        for ref in refs where cachedImage(ref, pixelSize: size) == nil {
          group.addTask { _ = await self.load(ref, pixelSize: size) }
        }
      }
    }
  }

  // MARK: - KImageLoading

  func cachedImage(_ ref: KImageRef, pixelSize: CGSize) -> CGImage? {
    guard Self.isLibrary(ref) else { return KImageStore.shared.cachedImage(ref, pixelSize: pixelSize) }
    guard let box = KImageStore.bucket(pixelSize) else { return nil }
    return memory.object(forKey: Self.memoryKey(ref, box) as NSString)?.image
  }

  func load(_ ref: KImageRef, pixelSize: CGSize) async -> CGImage? {
    guard Self.isLibrary(ref) else { return await KImageStore.shared.load(ref, pixelSize: pixelSize) }
    guard let box = KImageStore.bucket(pixelSize) else { return nil }
    let key = Self.memoryKey(ref, box)
    if let hit = memory.object(forKey: key as NSString) { return hit.image }
    if Task.isCancelled { return nil }

    let id = Self.localIdentifier(ref)
    guard let asset = PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil).firstObject else {
      log.error("no library asset for \(ref.cacheKey, privacy: .private)")
      return nil
    }
    guard let image = await request(asset, box: box), !Task.isCancelled else { return nil }
    memory.setObject(KPhotoLibraryBox(image), forKey: key as NSString, cost: image.bytesPerRow * image.height)
    return image
  }

  /// PhotoKit's thumbnail covering `box`, upright; nil when it can't be had or the caller left.
  private func request(_ asset: PHAsset, box: CGSize) async -> CGImage? {
    let options = PHImageRequestOptions()
    options.deliveryMode = .highQualityFormat
    options.resizeMode = .fast
    options.isNetworkAccessAllowed = true
    options.isSynchronous = false
    let pending = KPhotoLibraryRequest()
    let manager = self.manager
    let log = self.log
    return await withTaskCancellationHandler {
      await withCheckedContinuation { (continuation: CheckedContinuation<CGImage?, Never>) in
        pending.begin(continuation)
        let id = manager.requestImage(for: asset, targetSize: box, contentMode: .aspectFill, options: options) { image, info in
          if image == nil, let error = info?[PHImageErrorKey] as? NSError {
            log.error("library picture failed: \(error.localizedDescription, privacy: .public)")
          }
          pending.finish(image.flatMap(Self.upright))
        }
        if pending.started(id) { manager.cancelImageRequest(id) }
      }
    } onCancel: {
      if let id = pending.cancel() { manager.cancelImageRequest(id) }
    }
  }

  /// The UIImage's pixels drawn upright, so the CGImage KImage draws isn't turned.
  private static func upright(_ image: UIImage) -> CGImage? {
    if image.imageOrientation == .up, let cg = image.cgImage { return cg }
    let format = UIGraphicsImageRendererFormat.default()
    format.scale = image.scale
    return UIGraphicsImageRenderer(size: image.size, format: format).image { _ in
      image.draw(at: .zero)
    }.cgImage
  }
}

/// One PhotoKit request and its one answer: the continuation resumed exactly once, whether the
/// picture comes, the caller leaves first, or both.
private final class KPhotoLibraryRequest: @unchecked Sendable {
  private let lock = NSLock()
  private var continuation: CheckedContinuation<CGImage?, Never>?
  private var id: PHImageRequestID?
  private var cancelled = false

  func begin(_ c: CheckedContinuation<CGImage?, Never>) {
    lock.lock()
    defer { lock.unlock() }
    if cancelled {
      c.resume(returning: nil)
    } else {
      continuation = c
    }
  }

  /// the request's id; true when the caller had already left (cancel it at once)
  func started(_ requestId: PHImageRequestID) -> Bool {
    lock.lock()
    defer { lock.unlock() }
    id = requestId
    return cancelled
  }

  func finish(_ image: CGImage?) {
    lock.lock()
    let c = continuation
    continuation = nil
    lock.unlock()
    c?.resume(returning: image)
  }

  /// the caller left: answer nil now; the id to cancel, if the request has one yet
  func cancel() -> PHImageRequestID? {
    lock.lock()
    cancelled = true
    let c = continuation
    continuation = nil
    let requestId = id
    lock.unlock()
    c?.resume(returning: nil)
    return requestId
  }
}

/// a CGImage in a class, for NSCache
private final class KPhotoLibraryBox {
  let image: CGImage
  init(_ image: CGImage) { self.image = image }
}
