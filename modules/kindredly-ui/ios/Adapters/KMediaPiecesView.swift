import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 PICTURES AND FILMS, AS REACT NATIVE SEES THEM (batch 3, 2026-11-09), each behind its own switch
 (src/lib/surfaces.ts, off by default) with its React Native piece kept as the fallback. The
 pieces are Portable (Notes/KNoteFilm.swift, Notes/KFrameViewer.swift, WrenRoom/
 KPostMediaSquare.swift, Kit/KVideoLayer.swift) and know nothing of Expo. The props subclass
 KScreenProps for the theme, the insets and kScreenEnvironment's image loader. This file imports
 ExpoUI, whose public Button, Text and Image would make bare names ambiguous, so nothing of that
 kind is written here.

 KFrameViewerView ("frameviewer"; modules/kindredly-ui/src/MediaPieces.tsx,
 src/components/FrameViewerSwift.tsx): one frame full screen over the Notes composer, alone in a
 @expo/ui <Host> inside the React Native Modal that FrameViewer always had.
 - photos [{ image (image ref), a11y }], index (the picture to show)
 - strings { backLabel, removeLabel, isCover, makeCover }; insets top and bottom
 Events: onFvClose {}, onFvCover { index }, onFvRemove { index }

 KNoteFilmView ("notefilm") and KPostMediaView ("postmedia") are the binary's markers: TS asks for
 them (isKindredlyUIViewAvailable) before it hands KNotePageView a swiftFilm (or sends it the
 voice card, "notevoice": same binary) or KWrenRoomView its media, since an older binary would
 ignore those and leave an empty slot. Each also draws its piece on its own, in a Host of its own:
 - KNoteFilmView: url, playLabel, pauseLabel (as wide as it is laid out, 9:16 up to 420, 18 under)
 - KPostMediaView: url, kind ("image" | "video"), filling the frame it is given
 */

// MARK: - One frame, full screen

struct KFrameViewerPhotoRecord: Record {
  @Field var image: KImageRefRecord = KImageRefRecord()
  @Field var a11y: String = ""
}

struct KFrameViewerStringsRecord: Record {
  @Field var backLabel: String = ""
  @Field var removeLabel: String = ""
  @Field var isCover: String = ""
  @Field var makeCover: String = ""

  var strings: KFrameViewerStrings {
    var s = KFrameViewerStrings()
    s.backLabel = backLabel
    s.removeLabel = removeLabel
    s.isCover = isCover
    s.makeCover = makeCover
    return s
  }
}

final class KFrameViewerViewProps: KScreenProps {
  @Field var photos: [KFrameViewerPhotoRecord] = []
  @Field var index: Int = 0
  @Field var strings: KFrameViewerStringsRecord = KFrameViewerStringsRecord()

  var onFvClose = EventDispatcher()
  var onFvCover = EventDispatcher()
  var onFvRemove = EventDispatcher()

  private(set) lazy var actions: KFrameViewerActions = {
    let a = KFrameViewerActions()
    a.onClose = { [weak self] in self?.onFvClose() }
    a.onCover = { [weak self] index in self?.onFvCover(["index": index]) }
    a.onRemove = { [weak self] index in self?.onFvRemove(["index": index]) }
    return a
  }()

  var framePhotos: [KFrameViewerPhoto] {
    photos.map { KFrameViewerPhoto(image: $0.image.ref, accessibilityLabel: $0.a11y) }
  }
}

struct KFrameViewerView: ExpoSwiftUI.View {
  @ObservedObject var props: KFrameViewerViewProps

  var body: some View {
    KFrameViewer(
      photos: props.framePhotos,
      index: props.index,
      strings: props.strings.strings,
      topInset: props.insets.top,
      bottomInset: props.insets.bottom,
      actions: props.actions
    )
    .kScreenEnvironment(props)
  }
}

// MARK: - A journal page's film, alone (the "notefilm" marker)

final class KNoteFilmViewProps: KScreenProps {
  @Field var url: String = ""
  @Field var playLabel: String = ""
  @Field var pauseLabel: String = ""
}

struct KNoteFilmView: ExpoSwiftUI.View {
  @ObservedObject var props: KNoteFilmViewProps

  var body: some View {
    KNoteFilm(url: KMediaURL.from(props.url), playLabel: props.playLabel, pauseLabel: props.pauseLabel)
      .kScreenEnvironment(props)
  }
}

// MARK: - A Wren post's picture or film, alone (the "postmedia" marker)

final class KPostMediaViewProps: KScreenProps {
  @Field var url: String = ""
  @Field var kind: String = "image"
}

struct KPostMediaView: ExpoSwiftUI.View {
  @ObservedObject var props: KPostMediaViewProps

  var body: some View {
    KPostMediaSquare(url: KMediaURL.from(props.url), kind: KPostMediaKind(rawValue: props.kind) ?? .image)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .kScreenEnvironment(props)
  }
}
