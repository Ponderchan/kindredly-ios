import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 EDIT PROFILE as React Native sees it: <KEditProfileView … /> on the JS side
 (modules/kindredly-ui/src/EditProfile.tsx), drawn by src/screens/edit-profile/EditProfileNative.tsx
 in one full-screen Host, pushed inside the Me tab's stack (src/app/(tabs)/me/edit-profile.tsx).
 This file turns records into Portable values and taps into events, and places the avatar island;
 the screen itself is Portable/Profile/KEditProfileScreen.swift and knows nothing about Expo.

 Built as every step-5 screen is (KScreenProps.swift): the props subclass KScreenProps (theme,
 letterFont, insets, rev, commands), the view is registered with ExpoUIView and the "command"
 AsyncFunction (KindredlyUIModule.swift), and it MUST sit in an @expo/ui <Host>: one Host for the
 whole screen, never one per row. It has no text field: the pen name and the courier's name are
 edited on a React Native page (edit-field).

 Props, beyond KScreenProps (insets: top = the status bar, tabBarRoom = the floating bar the last
 row clears, plus 12, never less than the bottom fade's height - 6):
 - strings: { title, backLabel, cameraLabel, photoLabel, randomLabel, avatarHint, facesHeader,
   youHeader, courierHeader, footer }
 - faces: [{ id, image, a11y }], selectedFace ("" for none)
 - rows: { pen, pronoun, birthday, courier } as { label, value }; pronounOptions [{ id, label }];
   pronounSelected
 - note: { present, title, body, see, keep, faces: [image] }
 The records are converted once per rev (useRev in TS).

 Children: one <KIsland name="avatar"> (112 × 112): AvatarImage, which draws every kind of face
 (a photo, a portrait, an old drawn face, the mosaic) that SwiftUI can't all draw.

 Commands (KCommandBus): scrollTo { key: "top" | "faces", animated }.

 Events, with what nativeEvent carries:
 - onEditBack {}                the chevron
 - onEditPhoto {}               the camera menu: Choose a photo
 - onEditRandom {}              the camera menu or the strip's key: Random face
 - onEditFace { id }            a face in the strip
 - onEditPen {}                 the Pen name row
 - onEditPronoun { id }         a pronoun from the menu (she | he | they)
 - onEditCourierName {}         the courier's Name row
 - onEditNoteSee {}             the new-faces note: See new faces (TS puts the note away; Swift
                                scrolls to the strip once the note-less props arrive)
 - onEditNoteKeep {}            the new-faces note: Keep mine

 This file imports ExpoUI, whose public Button, Text and Image would make bare names ambiguous,
 so nothing of that kind is written here.
 */

struct KEditProfileStringsRecord: Record {
  @Field var title: String = ""
  @Field var backLabel: String = ""
  @Field var cameraLabel: String = ""
  @Field var photoLabel: String = ""
  @Field var randomLabel: String = ""
  @Field var avatarHint: String = ""
  @Field var facesHeader: String = ""
  @Field var youHeader: String = ""
  @Field var courierHeader: String = ""
  @Field var footer: String = ""
}

struct KEditFaceRecord: Record {
  @Field var id: String = ""
  @Field var image: KImageRefRecord = KImageRefRecord()
  @Field var a11y: String = ""
}

struct KEditRowRecord: Record {
  @Field var label: String = ""
  @Field var value: String = ""

  var row: KEditRow { KEditRow(label: label, value: value) }
}

struct KEditRowsRecord: Record {
  @Field var pen: KEditRowRecord = KEditRowRecord()
  @Field var pronoun: KEditRowRecord = KEditRowRecord()
  @Field var birthday: KEditRowRecord = KEditRowRecord()
  @Field var courier: KEditRowRecord = KEditRowRecord()
}

struct KEditPronounOptionRecord: Record {
  @Field var id: String = ""
  @Field var label: String = ""
}

struct KEditNoteRecord: Record {
  /// false: no note
  @Field var present: Bool = false
  @Field var title: String = ""
  @Field var body: String = ""
  @Field var see: String = ""
  @Field var keep: String = ""
  @Field var faces: [KImageRefRecord] = []

  var note: KEditNewFacesNote? {
    guard present else { return nil }
    var n = KEditNewFacesNote()
    n.title = title
    n.body = body
    n.see = see
    n.keep = keep
    n.faces = faces.prefix(3).map(\.ref)
    return n
  }
}

final class KEditProfileViewProps: KScreenProps {
  @Field var strings: KEditProfileStringsRecord = KEditProfileStringsRecord()
  @Field var faces: [KEditFaceRecord] = []
  @Field var selectedFace: String = ""
  @Field var rows: KEditRowsRecord = KEditRowsRecord()
  @Field var pronounOptions: [KEditPronounOptionRecord] = []
  @Field var pronounSelected: String = ""
  @Field var note: KEditNoteRecord = KEditNoteRecord()

  var onEditBack = EventDispatcher()
  var onEditPhoto = EventDispatcher()
  var onEditRandom = EventDispatcher()
  var onEditFace = EventDispatcher()
  var onEditPen = EventDispatcher()
  var onEditPronoun = EventDispatcher()
  var onEditCourierName = EventDispatcher()
  var onEditNoteSee = EventDispatcher()
  var onEditNoteKeep = EventDispatcher()

  /// The scroll requests: as long-lived as the view, like `commands`.
  let driver = KEditProfileDriver()

  /// The screen's taps, made once: each closure reaches this props object's events.
  private(set) lazy var actions: KEditProfileActions = {
    let a = KEditProfileActions()
    a.onBack = { [weak self] in self?.onEditBack() }
    a.onPhoto = { [weak self] in self?.onEditPhoto() }
    a.onRandom = { [weak self] in self?.onEditRandom() }
    a.onFace = { [weak self] id in self?.onEditFace(["id": id]) }
    a.onPen = { [weak self] in self?.onEditPen() }
    a.onPronoun = { [weak self] id in self?.onEditPronoun(["id": id]) }
    a.onCourierName = { [weak self] in self?.onEditCourierName() }
    a.onNoteSee = { [weak self] in self?.onEditNoteSee() }
    a.onNoteKeep = { [weak self] in self?.onEditNoteKeep() }
    return a
  }()

  /// Everything the screen shows, converted once per rev.
  var content: KEditProfileContent {
    cached("content") {
      var c = KEditProfileContent()
      c.title = strings.title
      c.backLabel = strings.backLabel
      c.cameraLabel = strings.cameraLabel
      c.photoLabel = strings.photoLabel
      c.randomLabel = strings.randomLabel
      c.avatarHint = strings.avatarHint
      c.facesHeader = strings.facesHeader
      // ids are the strip's identity: a repeat (never sent by TS) is dropped, not drawn twice
      var seen = Set<String>()
      c.faces = faces.compactMap { f in
        guard !f.id.isEmpty, seen.insert(f.id).inserted else { return nil }
        return KEditFace(id: f.id, image: f.image.ref, a11yLabel: f.a11y)
      }
      c.selectedFace = selectedFace
      c.note = note.note
      c.youHeader = strings.youHeader
      c.pen = rows.pen.row
      c.pronoun = rows.pronoun.row
      c.pronounOptions = pronounOptions.filter { !$0.id.isEmpty }.map { KEditPronounOption(id: $0.id, label: $0.label) }
      c.pronounSelected = pronounSelected
      c.birthday = rows.birthday.row
      c.courierHeader = strings.courierHeader
      c.courier = rows.courier.row
      c.footer = strings.footer
      return c
    }
  }

  /// One command from the bus (see the list at the top of the file).
  func handle(_ name: String, _ args: [String: Any]) {
    guard name == KCommandName.scrollTo, let target = args.kString("key"), let to = KEditProfileDriver.Target(rawValue: target) else { return }
    driver.scroll(to: to, animated: args.kBool("animated") ?? true)
  }
}

struct KEditProfileView: ExpoSwiftUI.View {
  @ObservedObject var props: KEditProfileViewProps

  var body: some View {
    let insets = props.insets
    return KEditProfileScreen(
      theme: props.kTheme,
      content: props.content,
      topInset: insets.top,
      // the floating bar's room plus 12 (list_host_pattern), never less than the fade that is
      // always drawn over the bottom asks (KBottomFade.contentMargin(): 176 - 6)
      bottomInset: max(insets.tabBarRoom + 12, insets.bottom + 12, KBottomFade.contentMargin()),
      driver: props.driver,
      actions: props.actions
    ) {
      props.children?.kSlot("avatar")
    }
    .kScreenEnvironment(props)
    .onKCommand(props.commands) { name, args in
      props.handle(name, args)
    }
  }
}
