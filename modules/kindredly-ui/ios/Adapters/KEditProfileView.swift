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
 - letters: ON YOUR LETTERS, the identity switch's two switches { present, header, markShown,
   markLabel, markNote, markOn, signLabel, signNote, signOn }; present false (the switch off)
   draws no group, and markShown false (they / unset) no mark row
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
 - onEditShowMark { on }        ON YOUR LETTERS: the ♀/♂ switch asks for this value (TS saves it)
 - onEditShowSign { on }        ON YOUR LETTERS: the star sign's switch asks for this value
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

/// ON YOUR LETTERS (identity switch on); present false draws no group.
struct KEditLettersRecord: Record {
  @Field var present: Bool = false
  @Field var header: String = ""
  /// false: no mark row (they / unset)
  @Field var markShown: Bool = false
  @Field var markLabel: String = ""
  @Field var markNote: String = ""
  @Field var markOn: Bool = false
  @Field var signLabel: String = ""
  @Field var signNote: String = ""
  @Field var signOn: Bool = true

  var letters: KEditLetters? {
    guard present else { return nil }
    var l = KEditLetters()
    l.header = header
    l.mark = markShown ? KEditToggle(label: markLabel, note: markNote, on: markOn) : nil
    l.sign = KEditToggle(label: signLabel, note: signNote, on: signOn)
    return l
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
  @Field var letters: KEditLettersRecord = KEditLettersRecord()

  var onEditBack = EventDispatcher()
  var onEditPhoto = EventDispatcher()
  var onEditRandom = EventDispatcher()
  var onEditFace = EventDispatcher()
  var onEditPen = EventDispatcher()
  var onEditPronoun = EventDispatcher()
  var onEditShowMark = EventDispatcher()
  var onEditShowSign = EventDispatcher()
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
    a.onShowMark = { [weak self] on in self?.onEditShowMark(["on": on]) }
    a.onShowSign = { [weak self] on in self?.onEditShowSign(["on": on]) }
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
      c.letters = letters.letters
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

// MARK: - STAMP PRESS · THE EDIT PAGE as React Native sees it (build agent B "edit", 2026-10-19)

/*
 <KStampEditView … /> on the JS side (modules/kindredly-ui/src/StampEdit.tsx), drawn by
 src/screens/stamp-edit/StampEditNative.tsx in one full-screen Host (field: the #topic is a text
 field), on the root route src/app/stamp-edit.tsx. Appended to this file because a new adapter
 file needs a pod install; the screen itself is Portable/Profile/KFaceStrip.swift
 KStampEditScreen. Registered in KindredlyUIModule.swift with the "command" AsyncFunction like
 every screen (no command is used yet).

 Props, beyond KScreenProps (insets: top = the status bar, bottom = the home indicator):
 - strings: every word, resolved (KStampEditStringsRecord; the card and reject words follow the phase)
 - categories [{ id, hex "#RRGGBB", name }], filters [{ id, name, locked }], filterEditable
 - gold (a Cofounder: the 2pt gold line along the cut), editing (an edit of an approved stamp)
 - phase: editing | checking | rejected | approved | unavailable | quota | cap | problem;
   rejectField: image | topic
 - seed (bump to put the page back to the values below), photo (file:// of the 10:11 crop; "" =
   the dev stand-in scene), topic, category, filter

 Events, with what nativeEvent carries:
 - onStampEditRetake {}                     Retake / Try another photo
 - onStampEditSubmit { image, original, topic, category, filter }   image = the filtered
                                            640 × 704 JPEG (file://), original = the unfiltered
                                            1280 × 1408 crop (file://, or "")
 - onStampEditUpgrade {}                    Keep it with First Class →
 - onStampEditReset {}                      the reader started fixing a rejection
 - onStampEditFlown {}                      the approved stamp has flown: leave the page
 - onStampEditCardPrimary {} / onStampEditCardSecondary {}   the status card's buttons
 - onStampEditExportFailed {}               no picture could be made
 */

struct KStampEditStringsRecord: Record {
  @Field var title: String = ""
  @Field var retake: String = ""
  @Field var eyebrow: String = ""
  @Field var cardMeta: String = ""
  @Field var firstLine: String = ""
  @Field var topicPlaceholder: String = ""
  @Field var topicLabel: String = ""
  @Field var aurasClose: String = ""
  @Field var colourLabel: String = ""
  @Field var filterLabel: String = ""
  @Field var submit: String = ""
  @Field var checking: String = ""
  @Field var keepFC: String = ""
  @Field var fcRibbon: String = ""
  @Field var fcBadge: String = ""
  @Field var lockedHint: String = ""
  @Field var freeLine: String = ""
  @Field var yours: String = ""
  @Field var stampLabel: String = ""
  @Field var holdHint: String = ""
  @Field var selected: String = ""
  @Field var rejectBody: String = ""
  @Field var rejectRetry: String = ""
  @Field var rejectRename: String = ""
  @Field var cardTitle: String = ""
  @Field var cardBody: String = ""
  @Field var cardPrimary: String = ""
  @Field var cardSecondary: String = ""
  @Field var announce: String = ""
}

struct KStampEditCategoryRecord: Record {
  @Field var id: String = ""
  /// "#RRGGBB"
  @Field var hex: String = ""
  @Field var name: String = ""
}

struct KStampEditFilterRecord: Record {
  @Field var id: String = ""
  @Field var name: String = ""
  @Field var locked: Bool = false
}

final class KStampEditViewProps: KScreenProps {
  @Field var strings: KStampEditStringsRecord = KStampEditStringsRecord()
  @Field var categories: [KStampEditCategoryRecord] = []
  @Field var filters: [KStampEditFilterRecord] = []
  @Field var filterEditable: Bool = true
  @Field var gold: Bool = false
  @Field var editing: Bool = false
  @Field var phase: String = "editing"
  @Field var rejectField: String = "image"
  @Field var seed: Int = 0
  @Field var photo: String = ""
  @Field var topic: String = ""
  @Field var category: String = "small"
  @Field var filter: String = "original"

  var onStampEditRetake = EventDispatcher()
  var onStampEditSubmit = EventDispatcher()
  var onStampEditUpgrade = EventDispatcher()
  var onStampEditReset = EventDispatcher()
  var onStampEditFlown = EventDispatcher()
  var onStampEditCardPrimary = EventDispatcher()
  var onStampEditCardSecondary = EventDispatcher()
  var onStampEditExportFailed = EventDispatcher()

  /// The page's taps, made once: each closure reaches this props object's events.
  private(set) lazy var actions: KStampEditActions = {
    let a = KStampEditActions()
    a.onRetake = { [weak self] in self?.onStampEditRetake() }
    a.onSubmit = { [weak self] image, original, topic, category, filter in
      self?.onStampEditSubmit(["image": image, "original": original, "topic": topic, "category": category, "filter": filter])
    }
    a.onUpgrade = { [weak self] in self?.onStampEditUpgrade() }
    a.onReset = { [weak self] in self?.onStampEditReset() }
    a.onFlown = { [weak self] in self?.onStampEditFlown() }
    a.onCardPrimary = { [weak self] in self?.onStampEditCardPrimary() }
    a.onCardSecondary = { [weak self] in self?.onStampEditCardSecondary() }
    a.onExportFailed = { [weak self] in self?.onStampEditExportFailed() }
    return a
  }()

  var content: KStampEditContent {
    var c = KStampEditContent()
    let s = strings
    c.title = s.title
    c.retake = s.retake
    c.eyebrow = s.eyebrow
    c.cardMeta = s.cardMeta
    c.firstLine = s.firstLine
    c.topicPlaceholder = s.topicPlaceholder
    c.topicLabel = s.topicLabel
    c.aurasClose = s.aurasClose
    c.colourLabel = s.colourLabel
    c.filterLabel = s.filterLabel
    c.submit = s.submit
    c.checking = s.checking
    c.keepFC = s.keepFC
    c.fcRibbon = s.fcRibbon
    c.fcBadge = s.fcBadge
    c.lockedHint = s.lockedHint
    c.freeLine = s.freeLine
    c.yours = s.yours
    c.stampLabel = s.stampLabel
    c.holdHint = s.holdHint
    c.selected = s.selected
    c.rejectBody = s.rejectBody
    c.rejectRetry = s.rejectRetry
    c.rejectRename = s.rejectRename
    c.cardTitle = s.cardTitle
    c.cardBody = s.cardBody
    c.cardPrimary = s.cardPrimary
    c.cardSecondary = s.cardSecondary
    c.announce = s.announce
    var seenIds = Set<String>()
    c.categories = categories.compactMap { r in
      guard !r.id.isEmpty, seenIds.insert(r.id).inserted, let rgb = KStampFrame.rgb(hex: r.hex) else { return nil }
      return KStampEditCategory(id: r.id, rgb: rgb, name: r.name)
    }
    var seenFilters = Set<String>()
    c.filters = filters.compactMap { r in
      guard KPressFilter(rawValue: r.id) != nil, seenFilters.insert(r.id).inserted else { return nil }
      return KStampEditFilterItem(id: r.id, name: r.name, locked: r.locked)
    }
    c.filterEditable = filterEditable
    c.gold = gold
    c.editing = editing
    c.phase = KStampEditPhase(rawValue: phase) ?? .editing
    c.rejectField = rejectField
    return c
  }

  var seedValue: KStampEditSeed {
    var v = KStampEditSeed()
    v.seed = seed
    v.photo = photo
    v.topic = topic
    v.category = category
    v.filter = filter
    return v
  }
}

struct KStampEditView: ExpoSwiftUI.View {
  @ObservedObject var props: KStampEditViewProps

  var body: some View {
    let insets = props.insets
    return KStampEditScreen(
      theme: props.kTheme,
      content: props.content,
      seed: props.seedValue,
      topInset: insets.top,
      bottomInset: max(insets.bottom, 12) + 12,
      actions: props.actions
    )
    .kScreenEnvironment(props)
    .onKCommand(props.commands) { _, _ in }
  }
}
