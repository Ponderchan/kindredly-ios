import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 A REEL, AS REACT NATIVE SEES IT (2026-11-09; behind the "reels" switch, off by default).
 <KReelView reel side cornerTop cornerBottom theme letterFont /> (modules/kindredly-ui/src/
 Reel.tsx), put in a Host of the square's size by src/components/ReelSquare.tsx; the Swift Wren
 room draws the same square from the record on its card (KWrenRoomView.swift, KWrenRoomCardRecord
 .reel). The square is KReelSquare in Portable/Reels and knows nothing of Expo. This view is also
 the binary's marker: TS asks for "KReelView" before it hands a reel to Swift. No commands, no
 events: a tap starts the reel over inside Swift. This file imports ExpoUI, whose public Button,
 Text and Image would make bare names ambiguous, so nothing of that kind is written here.

 reel: { on, id, label, live, data (JSON), images: [{ name, uri, key, kind }] }
 */

struct KReelImageRecord: Record {
  @Field var name: String = ""
  @Field var uri: String = ""
  @Field var key: String = ""
  @Field var kind: String = "image"
}

/// A reel as TS sends it (src/components/guide-reel/swift-reels.ts; NativeReelSpec in TS).
struct KReelSpecRecord: Record {
  /// false: no reel (the card keeps its island)
  @Field var on: Bool = false
  @Field var id: String = ""
  @Field var label: String = ""
  @Field var live: Bool = true
  @Field var data: String = "{}"
  @Field var images: [KReelImageRecord] = []

  /// the Portable spec, or nil when off
  var spec: KReelSpec? {
    guard on, !id.isEmpty else { return nil }
    var refs: [String: KImageRef] = [:]
    for im in images {
      if let r = KImageRef(uri: im.uri, key: im.key, kind: KImageRef.Kind(rawValue: im.kind) ?? .image) {
        refs[im.name] = r
      }
    }
    return KReelSpec(id: id, label: label, live: live, data: data, images: refs)
  }
}

final class KReelViewProps: KScreenProps {
  @Field var reel: KReelSpecRecord = KReelSpecRecord()
  @Field var side: CGFloat = 0
  @Field var cornerTop: CGFloat = 17
  @Field var cornerBottom: CGFloat = 0
}

/// One reel square on its own (ReelSquare's Host; the binary's marker for the reels).
struct KReelView: ExpoSwiftUI.View {
  @ObservedObject var props: KReelViewProps

  var body: some View {
    Group {
      if let spec = props.reel.spec {
        KReelSquare(theme: props.kTheme, spec: spec, side: props.side, cornerTop: props.cornerTop, cornerBottom: props.cornerBottom)
      } else {
        Color.clear
      }
    }
    .kScreenEnvironment(props)
  }
}
