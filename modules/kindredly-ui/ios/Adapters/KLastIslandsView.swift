import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 BATCH 3, SLICE 4 (2026-11-09): the last React Native islands of Wren and of your own face inside
 Swift pages, and the face-ready banner, each behind its own switch (src/lib/surfaces, off by
 default) with React Native kept for when it is off:

 - "composewren": the compose toolbar's Wren (KComposeView `wren`, its mood by the `wrenMood`
   command), drawn breathing by KBreathingWren (Portable/Kit/KWrenPicture.swift);
 - "notewren": the Notes composer's Wren (KNoteComposeView `wren`), KWrenPicture at 30;
 - "facewren": Make your own face's Wren (KMakeFaceView `wren`), KWrenPicture at the page's size
   for the screen (KMakeFacePage.wrenSize; the page bobs her itself);
 - "myavatar": your own face in the Me header (KMeView `myFace`) and on Edit profile
   (KEditProfileView `myFace`), KMyFace (Portable/Me/KMyFace.swift);
 - "faceready": the face-ready banner (KFaceReadyView below, Portable/MakeFace/
   KFaceReadyBanner.swift), in a Host of its own from src/components/FaceReadyBanner.tsx.

 A record whose `on` is false (the default, and what an older JS bundle sends by omission) keeps
 the island. TS builds them (src/screens/compose/ComposeNative.tsx, journal-entry/
 NoteComposeNative.tsx, make-face/MakeFaceNative.tsx, me/MeNative.tsx, edit-profile/
 EditProfileNative.tsx through src/lib/my-face.ts) and turns one on only where
 isKindredlyUIViewAvailable says this binary has the piece's marker view: KWrenPictureView for
 the three Wrens, KMyFaceView for your face (an older binary would ignore the record and leave an
 empty frame). The marker views also draw one piece on their own, for a dev page. Each view here
 needs an @expo/ui <Host>; all are built on KScreenProps for the theme and the image loader.

 Her pictures are snapshots of the reader's own WrenBird (src/lib/bird-images: compose-<mood>,
 note30, faceCurious72, faceContent64, delight, faceReady30); a uri "" (not captured yet) keeps
 the frame empty. This file imports ExpoUI, whose public Button, Text and Image would make bare
 names ambiguous, so nothing of that kind is written here.
 */

// MARK: - Wren's pictures

/// One picture of Wren for an island (KWrenPictureData in TS).
struct KWrenPictureRecord: Record {
  /// draw the picture (the host leaves its island out); false keeps the island
  @Field var on: Bool = false
  @Field var image: KImageRefRecord = KImageRefRecord()

  /// nil for "" (not captured yet)
  var ref: KImageRef? { image.uri.isEmpty ? nil : image.ref }
}

/// One mood's picture of the compose toolbar's Wren.
struct KWrenMoodImageRecord: Record {
  @Field var mood: String = ""
  @Field var image: KImageRefRecord = KImageRefRecord()
}

/// The compose toolbar's Wren in every mood (KWrenMoodsData in TS); the mood shown comes by the
/// `wrenMood` command.
struct KWrenMoodsRecord: Record {
  @Field var on: Bool = false
  @Field var moods: [KWrenMoodImageRecord] = []

  /// this mood's picture; nil when it isn't captured (or isn't a mood TS sent)
  func ref(for mood: String) -> KImageRef? {
    guard let m = moods.first(where: { $0.mood == mood }), !m.image.uri.isEmpty else { return nil }
    return m.image.ref
  }
}

/// The compose toolbar's mood, from the `wrenMood` command: watched by her slot alone, so a mood
/// change redraws the bird and nothing else (as ComposeNative's mood store did for the island).
final class KWrenMoodModel: ObservableObject {
  @Published private(set) var mood = "content"

  func set(_ next: String) {
    if !next.isEmpty, next != mood { mood = next }
  }
}

/// The compose toolbar's Wren, watching the mood.
struct KComposeWrenSlot: View {
  @ObservedObject var model: KWrenMoodModel
  let moods: KWrenMoodsRecord

  var body: some View {
    // ComposeNative's island: 38 in 46, breathing 6 over 2.6 s, a .34 s ZoomIn on each mood
    KBreathingWren(moods.ref(for: model.mood), mood: model.mood, size: 38, frame: 46, distance: 6, period: 2.6, zoom: 0.34)
  }
}

final class KWrenPictureViewProps: KScreenProps {
  @Field var image: KImageRefRecord = KImageRefRecord()
  /// the capture size, and the frame it sits in (0: the size)
  @Field var size: Double = 30
  @Field var frame: Double = 0
  /// breathe and zoom in as the compose toolbar's Wren does
  @Field var breathe: Bool = false
  /// with breathe: what identifies the face (a change zooms the new one in)
  @Field var mood: String = ""
}

/// One picture of Wren on its own (a dev page; the binary's marker for "composewren",
/// "notewren" and "facewren").
struct KWrenPictureView: ExpoSwiftUI.View {
  @ObservedObject var props: KWrenPictureViewProps

  var body: some View {
    let ref = props.image.uri.isEmpty ? nil : props.image.ref
    let size = CGFloat(max(1, props.size))
    let frame = props.frame > 0 ? CGFloat(props.frame) : size
    Group {
      if props.breathe {
        KBreathingWren(ref, mood: props.mood, size: size, frame: frame)
      } else {
        KWrenPicture(ref, size: size, frame: frame)
      }
    }
    .kScreenEnvironment(props)
  }
}

// MARK: - Your own face

/// Your face for an island (KMyFaceData in TS): faces.ts faceRecord, role kindred, plus `on`.
struct KMyFaceRecord: Record {
  /// draw the face (the host leaves its island out); false keeps the island
  @Field var on: Bool = false
  /// image | veil | placeholder (your own face is never a mosaic or a window)
  @Field var kind: String = "placeholder"
  @Field var uri: String = ""
  @Field var key: String = ""
  @Field var overscan: Double = 0

  var source: KFaceSource {
    switch kind {
    case "image": return .image(KImageRef(uri: uri, key: key), overscan: CGFloat(overscan))
    case "veil": return .veil
    default: return .placeholder
    }
  }
}

final class KMyFaceViewProps: KScreenProps {
  @Field var face: KMyFaceRecord = KMyFaceRecord()
  @Field var size: Double = 72
  /// drawn square for the inside of a stamp (the Me header with your C2 stamp)
  @Field var square: Bool = false
}

/// Your face on its own (a dev page; the binary's marker for "myavatar").
struct KMyFaceView: ExpoSwiftUI.View {
  @ObservedObject var props: KMyFaceViewProps

  var body: some View {
    KMyFace(theme: props.kTheme, source: props.face.source, size: CGFloat(max(1, props.size)), square: props.square)
      .kScreenEnvironment(props)
  }
}

// MARK: - The face-ready banner

final class KFaceReadyViewProps: KScreenProps {
  @Field var title: String = ""
  @Field var name: String = ""
  @Field var see: String = ""
  @Field var a11y: String = ""
  @Field var face: KImageRefRecord = KImageRefRecord()
  @Field var bird: KImageRefRecord = KImageRefRecord()
  @Field var shown: Bool = true

  var onFaceReadyOpen = EventDispatcher()

  var content: KFaceReadyContent {
    var c = KFaceReadyContent()
    c.title = title
    c.name = name
    c.see = see
    c.a11yLabel = a11y
    c.face = face.uri.isEmpty ? nil : face.ref
    c.bird = bird.uri.isEmpty ? nil : bird.ref
    c.shown = shown
    return c
  }
}

/// The face-ready banner, in a Host as wide as the card and as tall as it (FaceReadyBanner.tsx).
struct KFaceReadyView: ExpoSwiftUI.View {
  @ObservedObject var props: KFaceReadyViewProps

  var body: some View {
    KFaceReadyBanner(theme: props.kTheme, content: props.content) {
      props.onFaceReadyOpen()
    }
    .frame(maxWidth: .infinity, alignment: .topLeading)
    .fixedSize(horizontal: false, vertical: true)
    .kScreenEnvironment(props)
  }
}
