// Portable: SwiftUI and AVFoundation only (no Expo), so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI
import AVFoundation

/*
 A JOURNAL PAGE'S FILM IN SWIFTUI (batch 3, 2026-11-09; the "notefilm" switch, off by default).
 It mirrors src/screens/note-page/DetailVideo.tsx, which stays the React Native island in
 KNotePageScreen's film slot while the switch is off:

   ┌──────────────────────────┐   the page's width, 9:16 tall but never over 420 (React Native's
   │                          │   width 100% + aspectRatio 9/16 + maxHeight 420: the width stays,
   │          ┌────┐          │   the height stops at 420), the film filling it (cover), square
   │          │ ▶  │          │   corners, 18 under it. While it isn't playing, the ▶ (System 22,
   │          └────┘          │   white, 3 right of centre) on a 56 square of black at 50%.
   └──────────────────────────┘

 A tap plays or pauses. The ▶ follows the player itself, not the last tap (DetailVideo's rule):
 the end of the film puts ▶ back, and a tap there starts it again from the beginning, so a replay
 is one tap. It doesn't loop and isn't muted (the film's own sound, as expo-video played it); it
 never starts by itself, so Reduce Motion has nothing to hold (DetailVideo has no rule for it
 either). It pauses when the page goes.

 The sound: expo-video put the audio session in playback before an unmuted film played, so a
 film is heard with the ring switch on silent; so does this, just before it plays.

 What is different: nothing drawn. The ground before the first frame is black, as the
 AVPlayerViewController under expo-video's VideoView has it. VoiceOver: one button named
 jt.play / jt.pause (TS's words), as the Pressable was.
 */

public struct KNoteFilm: View {
  /// the play mark's square, black at 50%
  static let markGround = Color.black.opacity(0.5)
  /// the tallest the film gets
  static let maxHeight: CGFloat = 420

  private let url: URL?
  private let playLabel: String
  private let pauseLabel: String

  @StateObject private var model = KNoteFilmPlayer()

  /// - Parameters:
  ///   - url: the film (a file in the journal, or any URL AVPlayer can open); nil draws the ground
  ///   - playLabel: VoiceOver's name while stopped (jt.play)
  ///   - pauseLabel: VoiceOver's name while playing (jt.pause)
  public init(url: URL?, playLabel: String, pauseLabel: String) {
    self.url = url
    self.playLabel = playLabel
    self.pauseLabel = pauseLabel
  }

  public var body: some View {
    SwiftUI.Button {
      model.toggle()
    } label: {
      KNoteFilmBox(maxHeight: Self.maxHeight) {
        ZStack {
          Color.black
          KVideoLayer(player: model.player)
          if !model.playing {
            Text(verbatim: "▶")
              .kText(.system(22))
              .foregroundStyle(Color.white)
              .padding(.leading, 3)
              .frame(width: 56, height: 56)
              .background(Self.markGround)
              .accessibilityHidden(true)
          }
        }
        .clipped()
        .contentShape(Rectangle())
      }
    }
    .buttonStyle(KAsIsButtonStyle())
    .accessibilityLabel(model.playing ? pauseLabel : playLabel)
    .padding(.bottom, 18)
    .onAppear { model.load(url) }
    .onChange(of: url) { _, next in model.load(next) }
    .onDisappear { model.pause() }
  }
}

/// The page's width, 9:16 tall up to `maxHeight` (React Native's width 100% + aspectRatio +
/// maxHeight: the width is kept and the height stops).
struct KNoteFilmBox: Layout {
  let maxHeight: CGFloat

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let width = proposal.width ?? 0
    return CGSize(width: width, height: min(width * 16 / 9, maxHeight))
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    for view in subviews {
      view.place(at: bounds.origin, anchor: .topLeading, proposal: ProposedViewSize(bounds.size))
    }
  }
}

/// The film's player and whether it plays (DetailVideo's useVideoPlayer and its two listeners).
@MainActor
final class KNoteFilmPlayer: ObservableObject {
  /// the player itself says it plays (or is about to), not the last tap
  @Published private(set) var playing = false
  @Published private(set) var player: AVPlayer?

  private var url: URL?
  /// played to its end: the next tap starts it over
  private var ended = false
  private var status: NSKeyValueObservation?
  private var endObserver: NSObjectProtocol?

  func load(_ next: URL?) {
    guard next != url else { return }
    teardown()
    url = next
    guard let next else { return }
    let p = AVPlayer(url: next)
    // no loop: at the end it stops, and the ▶ comes back
    p.actionAtItemEnd = .pause
    status = p.observe(\.timeControlStatus, options: [.initial, .new]) { [weak self] p, _ in
      let now = p.timeControlStatus != .paused
      DispatchQueue.main.async { self?.playing = now }
    }
    endObserver = NotificationCenter.default.addObserver(forName: AVPlayerItem.didPlayToEndTimeNotification, object: p.currentItem, queue: .main) { [weak self] _ in
      MainActor.assumeIsolated {
        self?.ended = true
        self?.playing = false
      }
    }
    player = p
  }

  func toggle() {
    guard let player else { return }
    if playing {
      player.pause()
      return
    }
    Self.soundOn()
    if ended {
      ended = false
      player.seek(to: .zero, toleranceBefore: .zero, toleranceAfter: .zero) { _ in
        DispatchQueue.main.async { player.play() }
      }
      return
    }
    player.play()
  }

  func pause() {
    player?.pause()
  }

  /// The audio session in playback, as expo-video put it before an unmuted film played (heard
  /// with the ring switch on silent). A failure only means the switch decides.
  private static func soundOn() {
    let session = AVAudioSession.sharedInstance()
    do {
      if session.category != .playback { try session.setCategory(.playback, mode: .moviePlayback) }
      try session.setActive(true)
    } catch {
      print("[note-film] the audio session didn't change, the ring switch decides: \(error)")
    }
  }

  private func teardown() {
    player?.pause()
    status?.invalidate()
    status = nil
    if let endObserver { NotificationCenter.default.removeObserver(endObserver) }
    endObserver = nil
    player = nil
    playing = false
    ended = false
  }

  deinit {
    status?.invalidate()
    if let endObserver { NotificationCenter.default.removeObserver(endObserver) }
  }
}
