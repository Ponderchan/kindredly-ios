// Portable: SwiftUI, UIKit, ImageIO, AVFoundation and CryptoKit only (no Expo), so the 1.1.0
// pure-Swift app can take it as is.

import SwiftUI
import UIKit
import ImageIO
import AVFoundation
import CryptoKit

/*
 A WREN POST'S PICTURE OR FILM IN SWIFTUI (batch 3, 2026-11-09; the "postmedia" switch, off by
 default). It mirrors src/components/PostMediaSquare.tsx, which stays the React Native island in
 the card's square of Wren's room (KWrenRoomScreen's reel slot) while the switch is off:

 - A PICTURE fills the square (cover). An animated WebP or GIF plays, as expo-image played them:
   ImageIO decodes both (animated WebP since iOS 14; tried on this ImageIO, frames and delays
   both read), and CGAnimateImageDataWithBlock hands the frames over at the file's own delays,
   looping as the file says. A still picture is decoded once, at the square's pixels. React
   Native gave it a 150ms fade in (transition 150); so does this. The picture animates whatever
   Reduce Motion says, as expo-image did (PostMediaSquare holds only the film).
 - A FILM fills the square (cover), muted and looping like a gif, and holds on its first frame
   for someone who asked for less motion (Reduce Motion), as PostFilm did. It is played without
   its sound track at all (only the picture tracks are put in the item), so it never touches
   the app's audio session — music in another app keeps playing, as a muted expo-video did.
   It pauses when the square goes and starts again when the app comes back to the front.
 - WHILE LOADING the square shows nothing of its own: the card's ground shows through, as it did
   behind expo-image and expo-video before their first frame.
 - THE FILE is fetched once from its https address (nothing is signed) and kept under
   Caches/kindredly-ui/post-media, named by the sha256 of its address; a second square, or the
   room opened again, reads it from there. Two squares asking at once share one download. iOS may
   empty Caches whenever it likes; the next look fetches it again. A failure is logged (with the
   address's last part, not the whole) and leaves the ground; the next look tries again.

 VoiceOver: nothing (decorative — the card's title says what it is), as the island read nothing.
 Smart Invert leaves both alone.
 */

public enum KPostMediaKind: String, Sendable {
  case image
  case video
}

public struct KPostMediaSquare: View {
  private let url: URL?
  private let kind: KPostMediaKind

  public init(url: URL?, kind: KPostMediaKind) {
    self.url = url
    self.kind = kind
  }

  public var body: some View {
    Group {
      switch kind {
      case .image: KPostMediaImage(url: url)
      case .video: KPostMediaFilm(url: url)
      }
    }
    .clipped()
    .accessibilityHidden(true)
  }
}

// MARK: - the picture

struct KPostMediaImage: View {
  let url: URL?

  @StateObject private var model = KAnimatedImageModel()
  @Environment(\.displayScale) private var displayScale

  var body: some View {
    GeometryReader { geo in
      ZStack {
        if let frame = model.frame {
          Image(decorative: frame, scale: 1)
            .resizable()
            .interpolation(.high)
            .aspectRatio(contentMode: .fill)
            .frame(width: geo.size.width, height: geo.size.height)
            .clipped()
            .accessibilityIgnoresInvertColors(true)
            .transition(.opacity.animation(.easeInOut(duration: 0.15)))
        }
      }
      .frame(width: geo.size.width, height: geo.size.height)
      .onAppear { model.load(url, pixels: max(geo.size.width, geo.size.height) * displayScale) }
      .onChange(of: url) { _, next in model.load(next, pixels: max(geo.size.width, geo.size.height) * displayScale) }
    }
    .onDisappear { model.stop() }
  }
}

/// A picture's frames: one still, or an animation played at the file's own delays.
@MainActor
final class KAnimatedImageModel: ObservableObject {
  @Published private(set) var frame: CGImage?

  private var url: URL?
  private var task: Task<Void, Never>?
  /// set to stop the running animation (read on the main queue, where ImageIO calls back)
  private var stopFlag = KStopFlag()

  func load(_ next: URL?, pixels: CGFloat) {
    if next == url, frame != nil || task != nil { return }
    stop()
    url = next
    guard let next else { return }
    let flag = KStopFlag()
    stopFlag = flag
    task = Task { [weak self] in
      let data: Data
      do {
        data = try await KPostMediaFiles.shared.data(for: next)
      } catch {
        if !Task.isCancelled { print("[post-media] the picture didn't load (\(next.lastPathComponent)): \(error)") }
        return
      }
      guard !Task.isCancelled, !flag.stopped else { return }
      let animated = await Task.detached(priority: .userInitiated) { Self.frameCount(data) > 1 }.value
      guard !Task.isCancelled, !flag.stopped else { return }
      if animated {
        self?.animate(data, flag: flag)
      } else {
        let still = await Task.detached(priority: .userInitiated) { Self.still(data, maxPixels: max(64, pixels)) }.value
        guard !Task.isCancelled, !flag.stopped else { return }
        if let still {
          withAnimation(.easeInOut(duration: 0.15)) { self?.frame = still }
        } else {
          print("[post-media] the picture couldn't be read (\(next.lastPathComponent))")
        }
      }
    }
  }

  func stop() {
    stopFlag.stopped = true
    task?.cancel()
    task = nil
    url = nil
  }

  private func animate(_ data: Data, flag: KStopFlag) {
    var first = true
    let status = CGAnimateImageDataWithBlock(data as CFData, nil) { [weak self] _, image, stop in
      // ImageIO calls back on the main queue
      guard let self, !flag.stopped else {
        stop.pointee = true
        return
      }
      MainActor.assumeIsolated {
        if first {
          first = false
          withAnimation(.easeInOut(duration: 0.15)) { self.frame = image }
        } else {
          self.frame = image
        }
      }
    }
    if status != noErr {
      print("[post-media] the animation couldn't start (status \(status)); showing its first frame")
      if let still = Self.still(data, maxPixels: 2048) { frame = still }
    }
  }

  nonisolated static func frameCount(_ data: Data) -> Int {
    guard let source = CGImageSourceCreateWithData(data as CFData, nil) else { return 0 }
    return CGImageSourceGetCount(source)
  }

  /// the first frame, decoded no bigger than the square needs (upright)
  nonisolated static func still(_ data: Data, maxPixels: CGFloat) -> CGImage? {
    guard let source = CGImageSourceCreateWithData(data as CFData, nil) else { return nil }
    let options: [CFString: Any] = [
      kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceCreateThumbnailWithTransform: true,
      kCGImageSourceShouldCacheImmediately: true,
      kCGImageSourceThumbnailMaxPixelSize: Int(maxPixels.rounded(.up)),
    ]
    return CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary)
  }

  deinit {
    stopFlag.stopped = true
    task?.cancel()
  }
}

/// A stop shared with ImageIO's callback, which outlives a load that was replaced.
final class KStopFlag: @unchecked Sendable {
  var stopped = false
}

// MARK: - the film

struct KPostMediaFilm: View {
  let url: URL?

  @StateObject private var model = KLoopingFilmModel()
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.scenePhase) private var scenePhase

  var body: some View {
    KVideoLayer(player: model.player)
      .onAppear {
        model.still = reduceMotion
        model.load(url)
      }
      .onChange(of: url) { _, next in model.load(next) }
      .onChange(of: reduceMotion) { _, still in model.still = still }
      .onChange(of: scenePhase) { _, phase in
        if phase == .active { model.resume() }
      }
      .onDisappear { model.stop() }
  }
}

/// A film looping muted (AVPlayerLooper), its picture tracks only.
@MainActor
final class KLoopingFilmModel: ObservableObject {
  @Published private(set) var player: AVQueuePlayer?

  /// Reduce Motion: held on its first frame
  var still = false {
    didSet {
      guard still != oldValue else { return }
      if still {
        player?.pause()
        player?.seek(to: .zero)
      } else {
        player?.play()
      }
    }
  }

  private var url: URL?
  private var looper: AVPlayerLooper?
  private var task: Task<Void, Never>?

  func load(_ next: URL?) {
    if next == url, player != nil || task != nil { return }
    stop()
    url = next
    guard let next else { return }
    task = Task { [weak self] in
      do {
        let file = try await KPostMediaFiles.shared.file(for: next)
        guard !Task.isCancelled else { return }
        let asset = try await Self.silentAsset(file)
        guard !Task.isCancelled, let self else { return }
        let item = AVPlayerItem(asset: asset)
        let queue = AVQueuePlayer()
        queue.isMuted = true
        self.looper = AVPlayerLooper(player: queue, templateItem: item)
        self.player = queue
        if !self.still { queue.play() }
      } catch {
        if !Task.isCancelled { print("[post-media] the film didn't load (\(next.lastPathComponent)): \(error)") }
      }
    }
  }

  func resume() {
    if !still { player?.play() }
  }

  func stop() {
    task?.cancel()
    task = nil
    player?.pause()
    looper?.disableLooping()
    looper = nil
    player = nil
    url = nil
  }

  /// The film's picture tracks alone, kept upright: nothing with a sound to play.
  nonisolated static func silentAsset(_ file: URL) async throws -> AVAsset {
    let asset = AVURLAsset(url: file)
    let tracks = try await asset.loadTracks(withMediaType: .video)
    guard let track = tracks.first else { return asset }
    let (range, transform) = try await track.load(.timeRange, .preferredTransform)
    let composition = AVMutableComposition()
    guard let into = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else {
      return asset
    }
    try into.insertTimeRange(range, of: track, at: .zero)
    into.preferredTransform = transform
    return composition
  }

  deinit {
    task?.cancel()
    looper?.disableLooping()
  }
}

// MARK: - the files

/// Post media fetched once and kept in Caches/kindredly-ui/post-media (see the top of the file).
actor KPostMediaFiles {
  static let shared = KPostMediaFiles()

  private let directory: URL?
  private var flights: [URL: Task<URL, Error>] = [:]
  private let memory = NSCache<NSURL, NSData>()

  init() {
    let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first
    directory = caches?.appendingPathComponent("kindredly-ui/post-media", isDirectory: true)
    // a few animations' worth of bytes; the disk keeps the rest
    memory.totalCostLimit = 24 * 1024 * 1024
  }

  /// The file's bytes (from memory, the disk, or the network).
  func data(for url: URL) async throws -> Data {
    if let kept = memory.object(forKey: url as NSURL) { return kept as Data }
    let file = try await file(for: url)
    let data = try Data(contentsOf: file, options: .mappedIfSafe)
    memory.setObject(data as NSData, forKey: url as NSURL, cost: data.count)
    return data
  }

  /// A local file holding it: the address itself for a file, else the cached copy (fetched if
  /// it isn't there yet; one download for everyone asking at once).
  func file(for url: URL) async throws -> URL {
    if url.isFileURL { return url }
    guard let directory else { throw URLError(.cannotCreateFile) }
    let local = directory.appendingPathComponent(Self.name(url))
    if FileManager.default.fileExists(atPath: local.path) { return local }
    if let flight = flights[url] { return try await flight.value }
    let flight = Task<URL, Error> {
      let (temp, response) = try await URLSession.shared.download(from: url)
      if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
        throw URLError(.badServerResponse)
      }
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      try? FileManager.default.removeItem(at: local)
      try FileManager.default.moveItem(at: temp, to: local)
      return local
    }
    flights[url] = flight
    defer { flights[url] = nil }
    return try await flight.value
  }

  /// sha256 of the address, keeping its extension (AVFoundation reads the type from it)
  static func name(_ url: URL) -> String {
    let digest = SHA256.hash(data: Data(url.absoluteString.utf8)).map { String(format: "%02x", $0) }.joined()
    let ext = url.pathExtension.lowercased()
    return ext.isEmpty || ext.count > 5 ? digest : "\(digest).\(ext)"
  }
}
