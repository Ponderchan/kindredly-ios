import Foundation
import UIKit
import ImageIO
import AVFoundation
import CryptoKit
import UniformTypeIdentifiers
import os

/*
 THE ONE IMAGE LOADER AND CACHE for every KindredlyUI view: the KImageLoading that the Portable
 KImage asks (Portable/Kit/KImage.swift). Screen adapters install it with
 .kScreenEnvironment(props), which is .environment(\.kImageLoader, KImageStore.shared).

 Where pictures come from (TS turns every source into a URL and a key, src/lib/images.ts,
 faces.ts, bird-images.ts):
 - file:// : bundled portraits and keepsake icons through expo-asset, face and bird snapshots in
   tmp, journal photos and videos in Documents, the profile photo. Read with FileManager and
   ImageIO straight from disk.
 - https:// : signed Supabase links for moment photos (and dev sample photos). Fetched with a
   URLSession of its own that keeps no URL cache: the thumbnail is what gets cached, under the
   storage path, so a re-signed link never refetches.
 - kind .videoPoster : a still from near the start of a video, made by AVAssetImageGenerator.
 expo-image's SDWebImage cache can't be shared: ExpoImage is a prebuilt pod with no SDWebImage
 pod to link (Podfile.lock:205-206).

 What it does with them:
 - Decodes off the main thread, always to the pixels asked for, never the original: ImageIO
   thumbnails (kCGImageSourceCreateThumbnailFromImageAlways) at the size that covers the frame,
   with kCGImageSourceCreateThumbnailWithTransform so camera photos come out upright. The
   content decides the format, not the extension (journal photos are often HEIC named .jpg).
 - Video posters: appliesPreferredTrackTransform (portrait films upright), asked at 0.1s with
   tolerance (a frame at 0 is often black), falling back to the first frame.
 - Sizes are rounded up to 16 pixels, so near sizes share one entry.
 - Memory: an NSCache limited by decoded bytes (the smaller of a twentieth of the phone's
   memory and 96 MB), emptied on a memory warning.
 - Disk: the thumbnails, under Caches/kindredly-ui/images, named by sha256 of the key (plus
   the size, and for a file its size and date, so a file replaced in place isn't served stale).
   Network pictures and posters always go to disk; local files only when the file is over 256
   KB (a small PNG decodes faster than a cache read). Trimmed to 120 MB when over 200 MB,
   oldest-used first, a few seconds after launch; iOS may also empty Caches at any time.
 - The same picture at the same size asked for twice at once loads once. When every caller of
   a load has gone (its row scrolled away), the load is cancelled, the download with it.
 - At most four decodes or posters run at once, so a fast scroll can't flood the CPU.
 - Failures are logged (category "images", with the key, never the signed URL) and come back
   as nil; KImage then keeps its placeholder. Nothing is remembered as failed, so the next
   request tries again (a recaptured snapshot, a freshly signed link).
 */
final class KImageStore: KImageLoading, @unchecked Sendable {
  /// The one store every KindredlyUI view shares.
  static let shared = KImageStore()

  /// pixel sizes are rounded up to a multiple of this
  static let sizeStep: CGFloat = 16
  /// local files smaller than this are decoded from the source each time, not cached on disk
  static let diskMinSourceBytes = 256 * 1024
  static let diskTrimAbove = 200 * 1024 * 1024
  static let diskTrimTo = 120 * 1024 * 1024

  private let memory = NSCache<NSString, KImageBox>()
  private let lock = NSLock()
  private var flights: [String: Flight] = [:]
  private let gate = KImageDecodeGate(slots: 4)
  private let session: URLSession
  private let diskDirectory: URL?
  private let ioQueue = DispatchQueue(label: "kindredly-ui.images.disk", qos: .utility)
  private let log = Logger(subsystem: "kindredly-ui", category: "images")
  private var memoryWarning: NSObjectProtocol?

  /// The app's store, on disk under Caches/kindredly-ui/images. Use `shared`.
  convenience init() {
    let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first
    self.init(diskDirectory: caches?.appendingPathComponent("kindredly-ui/images", isDirectory: true))
  }

  /// A store whose disk cache lives in `diskDirectory` (nil for memory only); for tests.
  init(diskDirectory: URL?) {
    let physical = ProcessInfo.processInfo.physicalMemory
    memory.totalCostLimit = Int(min(physical / 20, 96 * 1024 * 1024))

    let config = URLSessionConfiguration.default
    config.urlCache = nil
    config.requestCachePolicy = .reloadIgnoringLocalCacheData
    config.timeoutIntervalForRequest = 30
    config.httpMaximumConnectionsPerHost = 4
    session = URLSession(configuration: config)

    self.diskDirectory = diskDirectory
    if let diskDirectory {
      try? FileManager.default.createDirectory(at: diskDirectory, withIntermediateDirectories: true)
    }

    memoryWarning = NotificationCenter.default.addObserver(
      forName: UIApplication.didReceiveMemoryWarningNotification, object: nil, queue: nil
    ) { [memory] _ in
      memory.removeAllObjects()
    }

    ioQueue.asyncAfter(deadline: .now() + 5) { [weak self] in self?.trimDisk() }
  }

  deinit {
    if let memoryWarning { NotificationCenter.default.removeObserver(memoryWarning) }
  }

  // MARK: - KImageLoading

  func cachedImage(_ ref: KImageRef, pixelSize: CGSize) -> CGImage? {
    guard let box = Self.bucket(pixelSize) else { return nil }
    return memory.object(forKey: Self.memoryKey(ref, box) as NSString)?.image
  }

  func load(_ ref: KImageRef, pixelSize: CGSize) async -> CGImage? {
    guard let box = Self.bucket(pixelSize) else { return nil }
    let key = Self.memoryKey(ref, box)
    if let hit = memory.object(forKey: key as NSString) { return hit.image }
    if Task.isCancelled { return nil }
    let flight = join(key: key, ref: ref, box: box)
    return await withTaskCancellationHandler {
      await flight.task?.value ?? nil
    } onCancel: {
      self.leave(key: key, flight: flight)
    }
  }

  /// Empties the memory and disk caches (for tests, or after the account on the phone changes).
  func removeAll() {
    memory.removeAllObjects()
    ioQueue.async { [diskDirectory] in
      guard let diskDirectory else { return }
      try? FileManager.default.removeItem(at: diskDirectory)
      try? FileManager.default.createDirectory(at: diskDirectory, withIntermediateDirectories: true)
    }
  }

  // MARK: - Flights (one load per key and size at a time)

  private final class Flight {
    var task: Task<CGImage?, Never>?
    var waiters = 0
  }

  private func join(key: String, ref: KImageRef, box: CGSize) -> Flight {
    lock.lock()
    defer { lock.unlock() }
    if let flight = flights[key] {
      flight.waiters += 1
      return flight
    }
    let flight = Flight()
    flight.waiters = 1
    flights[key] = flight
    // still under the lock, so the task can't finish (and remove itself) before it is stored
    flight.task = Task.detached(priority: .userInitiated) { [weak self] in
      guard let self else { return nil }
      let image = await self.produce(ref: ref, box: box, memoryKey: key)
      self.finish(key: key, flight: flight)
      return image
    }
    return flight
  }

  /// a caller went away; the last one out cancels the load
  private func leave(key: String, flight: Flight) {
    lock.lock()
    defer { lock.unlock() }
    flight.waiters -= 1
    guard flight.waiters <= 0 else { return }
    flight.task?.cancel()
    if flights[key] === flight { flights[key] = nil }
  }

  private func finish(key: String, flight: Flight) {
    lock.lock()
    defer { lock.unlock() }
    if flights[key] === flight { flights[key] = nil }
  }

  // MARK: - Producing a picture

  private func produce(ref: KImageRef, box: CGSize, memoryKey: String) async -> CGImage? {
    let stamp = Self.sourceStamp(ref.url)
    let diskName = Self.diskName(ref, box, stamp: stamp)

    if let image = readDisk(diskName) {
      remember(image, memoryKey)
      return image
    }
    if Task.isCancelled { return nil }

    var image: CGImage?
    switch ref.kind {
    case .image:
      guard let source = await imageSource(ref) else { return nil }
      if Task.isCancelled { return nil }
      await gate.enter()
      if !Task.isCancelled {
        image = Self.thumbnail(source, covering: box)
      }
      await gate.leave()
      if image == nil && !Task.isCancelled {
        log.error("could not decode \(ref.cacheKey, privacy: .public)")
      }
    case .videoPoster:
      await gate.enter()
      if !Task.isCancelled {
        image = await poster(ref, covering: box)
      }
      await gate.leave()
    }

    guard let image, !Task.isCancelled else { return nil }
    remember(image, memoryKey)
    let keepOnDisk = ref.kind == .videoPoster || !ref.url.isFileURL || (stamp?.bytes ?? 0) >= Self.diskMinSourceBytes
    if keepOnDisk { writeDisk(image, diskName) }
    return image
  }

  private func remember(_ image: CGImage, _ key: String) {
    let cost = image.bytesPerRow * image.height
    memory.setObject(KImageBox(image), forKey: key as NSString, cost: cost)
  }

  /// the source, opened lazily; nil (and logged) when the file is missing or the fetch fails
  private func imageSource(_ ref: KImageRef) async -> CGImageSource? {
    let options = [kCGImageSourceShouldCache: false] as CFDictionary
    if ref.url.isFileURL {
      guard FileManager.default.fileExists(atPath: ref.url.path) else {
        log.error("no file for \(ref.cacheKey, privacy: .public)")
        return nil
      }
      return CGImageSourceCreateWithURL(ref.url as CFURL, options)
    }
    do {
      let (data, response) = try await session.data(from: ref.url)
      if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
        log.error("HTTP \(http.statusCode) for \(ref.cacheKey, privacy: .public)")
        return nil
      }
      return CGImageSourceCreateWithData(data as CFData, options)
    } catch {
      if !Task.isCancelled {
        log.error("fetch failed for \(ref.cacheKey, privacy: .public): \(error.localizedDescription, privacy: .public)")
      }
      return nil
    }
  }

  /// A decoded thumbnail just big enough to cover `box` (never larger than the source), upright.
  static func thumbnail(_ source: CGImageSource, covering box: CGSize) -> CGImage? {
    var maxPixel = max(box.width, box.height)
    if let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
       let width = (properties[kCGImagePropertyPixelWidth] as? NSNumber)?.doubleValue,
       let height = (properties[kCGImagePropertyPixelHeight] as? NSNumber)?.doubleValue,
       width > 0, height > 0 {
      // EXIF orientations 5-8 turn the picture a quarter, swapping its sides
      let orientation = (properties[kCGImagePropertyOrientation] as? NSNumber)?.intValue ?? 1
      let (w, h) = orientation >= 5 ? (CGFloat(height), CGFloat(width)) : (CGFloat(width), CGFloat(height))
      let scale = min(1, max(box.width / w, box.height / h))
      maxPixel = (max(w, h) * scale).rounded(.up)
    }
    let options: [CFString: Any] = [
      kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceCreateThumbnailWithTransform: true,
      kCGImageSourceShouldCacheImmediately: true,
      kCGImageSourceThumbnailMaxPixelSize: max(1, maxPixel),
    ]
    return CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary)
  }

  /// a still from near the start of the video, upright, covering `box`
  private func poster(_ ref: KImageRef, covering box: CGSize) async -> CGImage? {
    if ref.url.isFileURL && !FileManager.default.fileExists(atPath: ref.url.path) {
      log.error("no video file for \(ref.cacheKey, privacy: .public)")
      return nil
    }
    let asset = AVURLAsset(url: ref.url)
    let generator = AVAssetImageGenerator(asset: asset)
    generator.appliesPreferredTrackTransform = true
    generator.requestedTimeToleranceBefore = CMTime(seconds: 0.1, preferredTimescale: 600)
    generator.requestedTimeToleranceAfter = CMTime(seconds: 0.5, preferredTimescale: 600)

    // the generator fits its image inside maximumSize; a square as large as the cover's long
    // side covers the box whichever way the film is turned
    var side = max(box.width, box.height)
    if let track = try? await asset.loadTracks(withMediaType: .video).first,
       let geometry = try? await track.load(.naturalSize, .preferredTransform) {
      let shown = geometry.0.applying(geometry.1)
      let w = abs(shown.width), h = abs(shown.height)
      if w > 0, h > 0 {
        let scale = min(1, max(box.width / w, box.height / h))
        side = (max(w, h) * scale).rounded(.up)
      }
    }
    generator.maximumSize = CGSize(width: side, height: side)

    do {
      return try await generator.image(at: CMTime(seconds: 0.1, preferredTimescale: 600)).image
    } catch {
      if Task.isCancelled { return nil }
      do {
        return try await generator.image(at: .zero).image
      } catch {
        if !Task.isCancelled {
          log.error("no poster for \(ref.cacheKey, privacy: .public): \(error.localizedDescription, privacy: .public)")
        }
        return nil
      }
    }
  }

  // MARK: - Keys

  /// the asked size rounded up to the step, or nil for an empty one
  static func bucket(_ pixelSize: CGSize) -> CGSize? {
    guard pixelSize.width > 0, pixelSize.height > 0, pixelSize.width.isFinite, pixelSize.height.isFinite else { return nil }
    let step = sizeStep
    return CGSize(width: (pixelSize.width / step).rounded(.up) * step, height: (pixelSize.height / step).rounded(.up) * step)
  }

  static func memoryKey(_ ref: KImageRef, _ box: CGSize) -> String {
    "\(ref.kind.rawValue)|\(Int(box.width))x\(Int(box.height))|\(ref.cacheKey)"
  }

  /// a local file's size and modification date, so a file replaced in place gets a new disk entry
  struct SourceStamp {
    let bytes: Int
    let modified: TimeInterval
  }

  static func sourceStamp(_ url: URL) -> SourceStamp? {
    guard url.isFileURL, let attributes = try? FileManager.default.attributesOfItem(atPath: url.path) else { return nil }
    let bytes = (attributes[.size] as? NSNumber)?.intValue ?? 0
    let modified = (attributes[.modificationDate] as? Date)?.timeIntervalSince1970 ?? 0
    return SourceStamp(bytes: bytes, modified: modified)
  }

  static func diskName(_ ref: KImageRef, _ box: CGSize, stamp: SourceStamp?) -> String {
    var identity = "\(ref.kind.rawValue)\u{1}\(ref.cacheKey)"
    if let stamp { identity += "\u{1}\(stamp.bytes)\u{1}\(Int(stamp.modified))" }
    let digest = SHA256.hash(data: Data(identity.utf8)).map { String(format: "%02x", $0) }.joined()
    return "\(digest.prefix(40))-\(Int(box.width))x\(Int(box.height))"
  }

  // MARK: - Disk

  private func readDisk(_ name: String) -> CGImage? {
    guard let url = diskDirectory?.appendingPathComponent(name),
          FileManager.default.fileExists(atPath: url.path),
          let source = CGImageSourceCreateWithURL(url as CFURL, [kCGImageSourceShouldCache: false] as CFDictionary),
          let image = CGImageSourceCreateImageAtIndex(source, 0, [kCGImageSourceShouldCacheImmediately: true] as CFDictionary)
    else { return nil }
    // a read counts as a use, so trimming drops the longest unused first
    ioQueue.async {
      try? FileManager.default.setAttributes([.modificationDate: Date()], ofItemAtPath: url.path)
    }
    return image
  }

  /// PNG when the picture has transparency (snapshots, icons), JPEG otherwise; written to a
  /// temporary name and moved into place, so a reader never sees half a file
  private func writeDisk(_ image: CGImage, _ name: String) {
    guard let directory = diskDirectory else { return }
    ioQueue.async { [log] in
      let final = directory.appendingPathComponent(name)
      let temporary = directory.appendingPathComponent(name + ".\(UUID().uuidString).tmp")
      let hasAlpha: Bool
      switch image.alphaInfo {
      case .none, .noneSkipFirst, .noneSkipLast: hasAlpha = false
      default: hasAlpha = true
      }
      let type = (hasAlpha ? UTType.png : UTType.jpeg).identifier as CFString
      guard let destination = CGImageDestinationCreateWithURL(temporary as CFURL, type, 1, nil) else { return }
      let properties = hasAlpha ? nil : [kCGImageDestinationLossyCompressionQuality: 0.85] as CFDictionary
      CGImageDestinationAddImage(destination, image, properties)
      guard CGImageDestinationFinalize(destination) else {
        try? FileManager.default.removeItem(at: temporary)
        log.error("could not write a cached image")
        return
      }
      try? FileManager.default.removeItem(at: final)
      do {
        try FileManager.default.moveItem(at: temporary, to: final)
      } catch {
        try? FileManager.default.removeItem(at: temporary)
      }
    }
  }

  /// over 200 MB: drop the longest unused until 120 MB; leftover temporaries always go
  private func trimDisk() {
    guard let directory = diskDirectory,
          let urls = try? FileManager.default.contentsOfDirectory(
            at: directory, includingPropertiesForKeys: [.fileSizeKey, .contentModificationDateKey], options: [.skipsHiddenFiles]
          )
    else { return }
    var entries: [(url: URL, bytes: Int, used: Date)] = []
    var total = 0
    for url in urls {
      if url.pathExtension == "tmp" {
        try? FileManager.default.removeItem(at: url)
        continue
      }
      let values = try? url.resourceValues(forKeys: [.fileSizeKey, .contentModificationDateKey])
      let bytes = values?.fileSize ?? 0
      entries.append((url, bytes, values?.contentModificationDate ?? .distantPast))
      total += bytes
    }
    guard total > Self.diskTrimAbove else { return }
    for entry in entries.sorted(by: { $0.used < $1.used }) {
      guard total > Self.diskTrimTo else { break }
      try? FileManager.default.removeItem(at: entry.url)
      total -= entry.bytes
    }
  }
}

/// a CGImage in a class, for NSCache
private final class KImageBox {
  let image: CGImage
  init(_ image: CGImage) { self.image = image }
}

/// At most `slots` decodes at once; the rest wait their turn, first come first served.
private actor KImageDecodeGate {
  private var free: Int
  private var waiting: [CheckedContinuation<Void, Never>] = []

  init(slots: Int) {
    free = slots
  }

  func enter() async {
    if free > 0 {
      free -= 1
      return
    }
    await withCheckedContinuation { waiting.append($0) }
  }

  func leave() {
    if waiting.isEmpty {
      free += 1
    } else {
      waiting.removeFirst().resume()
    }
  }
}
