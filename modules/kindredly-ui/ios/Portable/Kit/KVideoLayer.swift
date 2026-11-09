// Portable: SwiftUI, UIKit and AVFoundation only (no Expo), so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI
import UIKit
import AVFoundation

/*
 A FILM'S PICTURE, AND NOTHING ELSE (batch 3, 2026-11-09): an AVPlayerLayer in a UIView, for the
 two films that were expo-video VideoViews with nativeControls off — a journal page's film
 (Notes/KNoteFilm.swift, src/screens/note-page/DetailVideo.tsx) and a Wren post's looping film
 (WrenRoom/KPostMediaSquare.swift, src/components/PostMediaSquare.tsx). Both drew contentFit
 "cover", so the layer fills its frame (aspect fill) and the frame clips it. No controls, no
 touches (the caller's button or nothing takes them), and Smart Invert leaves it alone, as it
 leaves every picture alone.

 The player belongs to the caller; this only shows it. Before the player has a frame the layer is
 clear and the caller's ground shows through.

 KMediaURL reads a uri the way TS hands one over: file://, https://, or a bare absolute path (a
 journal file), as KImageRef does for pictures.
 */

struct KVideoLayer: UIViewRepresentable {
  let player: AVPlayer?

  final class LayerView: UIView {
    override class var layerClass: AnyClass { AVPlayerLayer.self }
    // swiftlint:disable:next force_cast
    var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }
  }

  func makeUIView(context: Context) -> LayerView {
    let view = LayerView()
    view.backgroundColor = .clear
    view.isUserInteractionEnabled = false
    view.accessibilityIgnoresInvertColors = true
    view.isAccessibilityElement = false
    view.playerLayer.videoGravity = .resizeAspectFill
    view.playerLayer.player = player
    return view
  }

  func updateUIView(_ view: LayerView, context: Context) {
    if view.playerLayer.player !== player { view.playerLayer.player = player }
  }

  static func dismantleUIView(_ view: LayerView, coordinator: ()) {
    view.playerLayer.player = nil
  }
}

enum KMediaURL {
  /// file://… or https://… as given; a bare absolute path as a file; nil for nothing usable
  static func from(_ uri: String) -> URL? {
    let s = uri.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !s.isEmpty else { return nil }
    if s.hasPrefix("/") { return URL(fileURLWithPath: s) }
    guard let url = URL(string: s), url.scheme != nil else { return nil }
    return url
  }
}
