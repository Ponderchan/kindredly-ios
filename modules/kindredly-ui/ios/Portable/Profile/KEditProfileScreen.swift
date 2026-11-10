// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 EDIT PROFILE (10a, H:90-94 with the owner's fields), drawn by SwiftUI: its own page, pushed in
 the Me tab's stack. Every word and value is TS's (src/screens/edit-profile/edit-profile-model.ts
 builds them); this draws them and reports taps. Each field saves on its own, in TS.

   ‹          EDIT PROFILE                  the 52pt header, sticky on the page colour
   ┌──────────── (avatar) ◉ ────────────┐   the avatar block: your face (a React Native island:
   │  Strangers never see your face…    │   photo, portrait, old drawn face or mosaic) with the
   └────────────────────────────────────┘   camera button's menu: Choose a photo / Random face
   [the one-time new-faces note]            only for the six legacy portraits (owner q.12)
   PICK A FACE                  [Random]
   (◯)(◯)(◯)(◯)(◯)…                         the face strip (KFaceStrip)
   YOU
   Pen name                    maynaa  ›   opens the one-field page
   Pronouns                  she / her  ›   a menu: she / he / they, saved at once
   Birthday                1 November 1991  shown, never edited: no chevron, no button
   Birthday                              —  ›   only while there is none: opens the date wheel (below)
   ON YOUR LETTERS                          identity switch on only (identity Phase 1):
   Show ♀ on your letters            (●)    the mark's switch, she / he only, its note under it
   Star sign on your letters         (●)    the sign's switch, your sign named under it
   Strangers never see it — only a kindred…  ep.privateNote (id.ep.privateNote with the switch on)
   YOUR COURIER
   Name                            Pip  ›   opens the one-field page (no pronoun row: owner q.13)

 ON YOUR LETTERS (identity-plan §4 and its zodiac addendum) is drawn only when TS sends it, which
 is only while the identity switch is on; off, the page is exactly what it was. Each switch is a
 SoftToggleRow, CONTROLLED: it shows the value the account holds and asks TS for the other one
 (onShowMark / onShowSign), which saves it to the account at once, as a pronoun is saved. The mark's
 row is not sent for they or unset (they have no mark). Nothing here decides who may be marked.

 LAYOUT. The Host ignores every safe area, so the page draws its own strip under the status bar,
 and the header sits under it, outside the scroll view (sticky, H:90). One ScrollView over a
 VStack: the avatar island must not sit in a lazy container. 16 from the edges, blocks 12 apart;
 the strip runs edge to edge. The page clears the floating tab bar and the bottom fade.

 A BIRTHDAY, SET ONCE (owner's audit, 2026-11-10). "Shown, never edited" stays the rule for a
 birthday that exists. An account with none saw "—" it could not tap; for that account only, TS
 sends `birthdaySet`, and the row is a button with the chevron every editable row has. It opens
 an iOS sheet (the system's: grabber, rise, dim, drag down; exactly as tall as what it holds, as
 the new reader's sheet is) holding iOS's own date wheel, in the reader's language, from the
 oldest year TS allows up to today. The wheel rests on today, as onboarding's does, and the key
 stays dim until a year before this one is under the band (onboarding's "not answered yet").
 The key closes the sheet and, once it is down, hands the date to TS (onBirthday), which asks
 once more with the system's alert and decides what the date does: nothing here knows the 18+
 rule or saves anything. The date picked is kept while the page lives, so a "Go back" in that
 alert finds the wheel where it was left.

 The note's "See new faces" tells TS (which puts the note away for good) and scrolls the strip
 to the top of the view ONCE THE NOTE HAS GONE: the note sits above the strip, so a scroll aimed
 while it was there landed about 150pt too far once it went (more at large text), the strip
 under the header. "Keep mine" only tells TS. A scrollTo command ("faces" or "top") reaches the
 same places through the driver.
 */

// MARK: - What the screen shows

/// A row of YOU or YOUR COURIER.
public struct KEditRow: Equatable, Sendable {
  public var label = ""
  public var value = ""

  public init(label: String = "", value: String = "") {
    self.label = label
    self.value = value
  }
}

/// One choice in the Pronouns menu.
public struct KEditPronounOption: Identifiable, Equatable, Sendable {
  /// she | he | they
  public let id: String
  public let label: String

  public init(id: String, label: String) {
    self.id = id
    self.label = label
  }
}

/// One switch of ON YOUR LETTERS: its label, the note under it, the value the account holds.
public struct KEditToggle: Equatable, Sendable {
  public var label = ""
  public var note = ""
  public var on = false

  public init(label: String = "", note: String = "", on: Bool = false) {
    self.label = label
    self.note = note
    self.on = on
  }
}

/// ON YOUR LETTERS (identity switch on): the mark's switch (nil for they / unset) and the sign's.
public struct KEditLetters: Equatable, Sendable {
  /// "ON YOUR LETTERS"
  public var header = ""
  public var mark: KEditToggle?
  public var sign = KEditToggle()

  public init() {}
}

/// The Birthday row as a button and its wheel sheet, only while the account has no birthday.
public struct KEditBirthdaySet: Equatable, Sendable {
  /// VoiceOver's hint on the row
  public var hint = ""
  /// the sheet: its title, the line under it, the key under the wheel, the small line under the key
  public var title = ""
  public var body = ""
  public var key = ""
  public var once = ""
  /// VoiceOver's name for the ✕
  public var closeLabel = ""
  /// today on the reader's calendar (month 1–12): where the wheel rests, and its last day
  public var todayY = 0
  public var todayM = 1
  public var todayD = 1
  /// the oldest year on the wheel
  public var minYear = 0
  /// BCP-47, for the wheel's month names (the app's language, not the phone's)
  public var locale = ""

  public init() {}
}

/// The one-time note for a legacy portrait.
public struct KEditNewFacesNote: Equatable, Sendable {
  public var title = ""
  public var body = ""
  public var see = ""
  public var keep = ""
  /// up to three of the new faces, as a glimpse
  public var faces: [KImageRef?] = []

  public init() {}
}

/// Everything the screen shows, from TS.
public struct KEditProfileContent: Equatable, Sendable {
  /// EDIT PROFILE
  public var title = ""
  public var backLabel = ""
  /// VoiceOver's name for the camera button
  public var cameraLabel = ""
  /// the camera menu's two items
  public var photoLabel = ""
  public var randomLabel = ""
  /// under the avatar
  public var avatarHint = ""
  /// PICK A FACE
  public var facesHeader = ""
  public var faces: [KEditFace] = []
  /// the face worn; "" while a photo is worn, or none is
  public var selectedFace = ""
  /// Make your own face's ＋ cell at the head of the strip; nil while its switch is off
  public var make: KEditMakeFace?
  public var note: KEditNewFacesNote?
  /// YOU
  public var youHeader = ""
  public var pen = KEditRow()
  public var pronoun = KEditRow()
  public var pronounOptions: [KEditPronounOption] = []
  public var pronounSelected = ""
  public var birthday = KEditRow()
  /// no birthday yet: the row is a button over the date wheel; nil once one is set (shown, never edited)
  public var birthdaySet: KEditBirthdaySet?
  /// ON YOUR LETTERS, between YOU and the footer; nil while the identity switch is off
  public var letters: KEditLetters?
  /// YOUR COURIER
  public var courierHeader = ""
  public var courier = KEditRow()
  /// the YOU group's footer
  public var footer = ""

  public init() {}
}

/// Where the screen's taps go. One object for the life of the surface. Set the closures once.
public final class KEditProfileActions {
  public var onBack: () -> Void = {}
  /// the camera menu: Choose a photo
  public var onPhoto: () -> Void = {}
  /// the camera menu or the strip's key: Random face
  public var onRandom: () -> Void = {}
  /// a face in the strip: its id
  public var onFace: (String) -> Void = { _ in }
  /// the strip's ＋ cell: Make your own face
  public var onMake: () -> Void = {}
  /// the Pen name row
  public var onPen: () -> Void = {}
  /// a pronoun from the menu: she | he | they
  public var onPronoun: (String) -> Void = { _ in }
  /// ON YOUR LETTERS: the mark's switch asks for this value
  public var onShowMark: (Bool) -> Void = { _ in }
  /// ON YOUR LETTERS: the sign's switch asks for this value
  public var onShowSign: (Bool) -> Void = { _ in }
  /// the courier's Name row
  public var onCourierName: () -> Void = {}
  /// the note's two buttons
  public var onNoteSee: () -> Void = {}
  public var onNoteKeep: () -> Void = {}
  /// the birthday wheel's answer, once its sheet is down: year, month (1–12), day
  public var onBirthday: (Int, Int, Int) -> Void = { _, _, _ in }

  public init() {}
}

/// What TS's commands reach (through the adapter): scroll to the top or to the face strip.
public final class KEditProfileDriver: ObservableObject {
  public enum Target: String, Sendable {
    case top
    case faces
  }

  struct Request: Equatable {
    let target: Target
    let animated: Bool
    let serial: Int
  }

  @Published private(set) var request: Request?
  private var serial = 0

  public init() {}

  public func scroll(to target: Target, animated: Bool = true) {
    serial += 1
    request = Request(target: target, animated: animated, serial: serial)
  }
}

final class KEditProfileBox {
  var served = 0
}

// MARK: - The screen

public struct KEditProfileScreen<Avatar: View>: View {
  /// the avatar's side (H:91)
  public static var avatarSize: CGFloat { 112 }
  static var gutter: CGFloat { 16 }
  static var gap: CGFloat { 12 }
  /// YOU and YOUR COURIER's headers, in from the group (H:92)
  static var headerInset: CGFloat { 4 }
  static var topID: String { "kEditTop" }
  static var facesID: String { "kEditFaces" }

  private let theme: KTheme
  private let content: KEditProfileContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let driver: KEditProfileDriver
  private let actions: KEditProfileActions
  private let avatar: Avatar

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var box = KEditProfileBox()
  /// "See new faces" was pressed: the strip is scrolled to once the note has gone
  @State private var facesAfterNote = false
  /// the birthday wheel's sheet is up
  @State private var birthdayOpen = false
  /// the date under the wheel's band, kept while the page lives (nil: never turned, it rests on today)
  @State private var birthdayPicked: Date?
  /// the key was pressed: the date goes to TS once the sheet is down
  @State private var birthdayAnswer: Date?

  /// - Parameters:
  ///   - topInset: the status bar's height (the Host ignores safe areas)
  ///   - bottomInset: how far the last of the page must clear the bottom (the tab bar and the fade)
  ///   - avatar: your face (a React Native island in the app), drawn avatarSize across in a circle
  public init(
    theme: KTheme,
    content: KEditProfileContent,
    topInset: CGFloat,
    bottomInset: CGFloat,
    driver: KEditProfileDriver,
    actions: KEditProfileActions,
    @ViewBuilder avatar: () -> Avatar
  ) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.driver = driver
    self.actions = actions
    self.avatar = avatar()
  }

  public var body: some View {
    VStack(spacing: 0) {
      Color.clear.frame(height: topInset)
      KBackBar(theme: theme, title: content.title, backLabel: content.backLabel, height: KBackBar<EmptyView>.stickyHeight, sticky: true) {
        actions.onBack()
      }
      .accessibilitySortPriority(1)
      ScrollViewReader { proxy in
        ScrollView(.vertical) {
          VStack(alignment: .leading, spacing: Self.gap) {
            avatarBlock
              .id(Self.topID)
            if let note = content.note {
              KNewFacesNoteView(theme: theme, note: note) {
                // the note goes first (TS); the scroll waits for the page without it (below)
                facesAfterNote = true
                actions.onNoteSee()
              } onKeep: {
                actions.onNoteKeep()
              }
            }
            KFaceStrip(
              theme: theme,
              header: content.facesHeader,
              randomLabel: content.randomLabel,
              faces: content.faces,
              selected: content.selectedFace,
              make: content.make,
              onPick: { actions.onFace($0) },
              onRandom: { actions.onRandom() },
              onMake: { actions.onMake() }
            )
            .id(Self.facesID)
            .padding(.top, 4)
            youGroup
            if let letters = content.letters {
              lettersGroup(letters)
            }
            Text(content.footer)
              .kText(.system(13, lineHeight: 1.5))
              .foregroundStyle(theme.mute)
              .multilineTextAlignment(.center)
              .fixedSize(horizontal: false, vertical: true)
              .frame(maxWidth: .infinity)
              .padding(.horizontal, 20)
              // H:94: the page's gap (12) plus the footer's own 4 (React Native: marginTop 4)
              .padding(.top, 4)
            courierGroup
          }
          .padding(.horizontal, Self.gutter)
          .padding(.top, 4)
        }
        .scrollIndicators(.hidden)
        .contentMargins(.bottom, bottomInset, for: .scrollContent)
        .onReceive(driver.$request) { request in
          guard let request, request.serial > box.served else { return }
          box.served = request.serial
          scroll(proxy, to: request.target, animated: request.animated)
        }
        .onChange(of: content.note == nil) { _, gone in
          guard gone, facesAfterNote else { return }
          facesAfterNote = false
          // a turn later, once the page has been laid out without the note
          DispatchQueue.main.async { scroll(proxy, to: .faces, animated: true) }
        }
      }
    }
    .accessibilityElement(children: .contain)
    .overlay(alignment: .bottom) {
      KBottomFade(theme: theme)
    }
    .background { theme.bg.ignoresSafeArea() }
    .ignoresSafeArea(.keyboard)
    // ── the birthday wheel (only while no birthday is set): an iOS sheet; its answer is handed
    // to TS once the sheet is down, so TS's alert shows over a clear page ──
    .sheet(
      isPresented: Binding(
        // a birthday that arrived meanwhile (TS stops sending birthdaySet) takes the sheet down
        get: { birthdayOpen && content.birthdaySet != nil },
        set: { birthdayOpen = $0 }
      ),
      onDismiss: {
        guard let date = birthdayAnswer else { return }
        birthdayAnswer = nil
        let parts = KBirthdayWheelSheet.calendar.dateComponents([.year, .month, .day], from: date)
        guard let y = parts.year, let m = parts.month, let d = parts.day else { return }
        actions.onBirthday(y, m, d)
      }
    ) {
      if let set = content.birthdaySet {
        KBirthdayWheelSheet(theme: theme, set: set, picked: $birthdayPicked) { date in
          birthdayAnswer = date
          birthdayOpen = false
        } onClose: {
          birthdayOpen = false
        }
      }
    }
    .onChange(of: content.birthdaySet == nil) { _, gone in
      // a birthday now exists: the wheel is never offered again
      if gone { birthdayOpen = false }
    }
  }

  private func scroll(_ proxy: ScrollViewProxy, to target: KEditProfileDriver.Target, animated: Bool) {
    let id = target == .faces ? Self.facesID : Self.topID
    if animated && !reduceMotion {
      withAnimation(.easeInOut(duration: 0.35)) { proxy.scrollTo(id, anchor: .top) }
    } else {
      proxy.scrollTo(id, anchor: .top)
    }
  }

  // ── the avatar block (H:91) ──────────────────────────────────────────
  private var avatarBlock: some View {
    let side = Self.avatarSize
    return VStack(spacing: 14) {
      ZStack(alignment: .bottomTrailing) {
        avatar
          .frame(width: side, height: side)
          .background(Circle().fill(theme.lav))
          .clipShape(Circle())
          .accessibilityHidden(true)
        cameraMenu
          // right -2, bottom 2 (H:91), for the 36 circle: the 44 target (its 4pt padding) is
          // what aligns to the corner, so the offset counts that 4 on both axes
          .offset(x: 2 + 4, y: -2 + 4)
      }
      .frame(width: side, height: side)
      Text(content.avatarHint)
        .kText(.system(13))
        .foregroundStyle(theme.mute)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
    }
    .padding(.top, 30)
    .padding(.horizontal, 16)
    .padding(.bottom, 24)
    .frame(maxWidth: .infinity)
    .background(RoundedRectangle(cornerRadius: 20, style: .circular).fill(theme.soft))
  }

  /// The camera button (36, ink, the picture glyph in the page colour, a 3pt soft edge) and its
  /// menu: Choose a photo, Random face.
  private var cameraMenu: some View {
    SwiftUI.Menu {
      SwiftUI.Button {
        actions.onPhoto()
      } label: {
        Label(content.photoLabel, systemImage: "photo.on.rectangle")
      }
      SwiftUI.Button {
        actions.onRandom()
      } label: {
        Label(content.randomLabel, systemImage: "dice")
      }
    } label: {
      KLineIcon(.picture, size: 15, lineWidth: 2.2, color: theme.bg)
        .frame(width: 36, height: 36)
        .background(Circle().fill(theme.ink))
        .overlay(Circle().strokeBorder(theme.soft, lineWidth: 3))
        // a 44 target around the 36 circle
        .padding(4)
        .contentShape(Circle())
    }
    .menuOrder(.fixed)
    .accessibilityLabel(content.cameraLabel)
  }

  // ── YOU (H:92) ────────────────────────────────────────────────────────
  private var youGroup: some View {
    // H:92: Edit's headers sit 4 in from the group (Settings' 10)
    SoftGroupSection(theme: theme, header: content.youHeader, headerInset: Self.headerInset) {
      SwiftUI.Button {
        actions.onPen()
      } label: {
        SoftPlainRow(theme: theme, label: content.pen.label, value: content.pen.value)
      }
      .buttonStyle(KFadePressStyle())
      SwiftUI.Menu {
        ForEach(content.pronounOptions) { option in
          SwiftUI.Button {
            actions.onPronoun(option.id)
          } label: {
            if option.id == content.pronounSelected {
              Label(option.label, systemImage: "checkmark")
            } else {
              Text(option.label)
            }
          }
        }
      } label: {
        SoftPlainRow(theme: theme, label: content.pronoun.label, value: content.pronoun.value)
      }
      .menuOrder(.fixed)
      .menuStyle(.button)
      .buttonStyle(KFadePressStyle())
      if let set = content.birthdaySet {
        // no birthday yet: the row opens the wheel, once (see the top)
        SwiftUI.Button {
          birthdayOpen = true
        } label: {
          SoftPlainRow(theme: theme, label: content.birthday.label, value: content.birthday.value, divider: false)
        }
        .buttonStyle(KFadePressStyle())
        .accessibilityHint(set.hint)
      } else {
        // shown, never edited: no chevron, and no button for VoiceOver to press
        SoftPlainRow(theme: theme, label: content.birthday.label, value: content.birthday.value, chevron: false, divider: false)
      }
    }
  }

  // ── ON YOUR LETTERS (identity switch on) ──────────────────────────────
  private func lettersGroup(_ letters: KEditLetters) -> some View {
    SoftGroupSection(theme: theme, header: letters.header, headerInset: Self.headerInset) {
      if let mark = letters.mark {
        SoftToggleRow(theme: theme, systemImage: nil, label: mark.label, subtitle: mark.note, isOn: mark.on) { on in
          actions.onShowMark(on)
        }
      }
      SoftToggleRow(theme: theme, systemImage: nil, label: letters.sign.label, subtitle: letters.sign.note, isOn: letters.sign.on, divider: false) { on in
        actions.onShowSign(on)
      }
    }
  }

  // ── YOUR COURIER (H:93, without the gender row: owner question 13) ───
  private var courierGroup: some View {
    SoftGroupSection(theme: theme, header: content.courierHeader, headerInset: Self.headerInset) {
      SwiftUI.Button {
        actions.onCourierName()
      } label: {
        SoftPlainRow(theme: theme, label: content.courier.label, value: content.courier.value, divider: false)
      }
      .buttonStyle(KFadePressStyle())
    }
  }
}

// MARK: - The birthday wheel

/// The date wheel in an iOS sheet, for an account with no birthday (owner's audit, 2026-11-10):
/// the sheets' own header (title, round ✕) and body line, iOS's wheel in the reader's language,
/// the filled key (dim until a year before this one is under the band: onboarding's "not
/// answered yet"), and the line that says it is set once. The system draws the grabber, the rise,
/// the dim and the drag down; the sheet is as tall as what it holds, and scrolls if the text size
/// makes that taller than the screen. It decides nothing: the key hands the date back.
struct KBirthdayWheelSheet: View {
  /// Gregorian, in the phone's own time zone: the wheel, its range and the answer read the same days
  static var calendar: Calendar {
    var c = Calendar(identifier: .gregorian)
    c.timeZone = .current
    return c
  }

  let theme: KTheme
  let set: KEditBirthdaySet
  /// the date under the band, kept by the page (nil: never turned)
  @Binding var picked: Date?
  let onSet: (Date) -> Void
  let onClose: () -> Void

  /// the content's own height, measured; a guess until then so the first frame isn't empty
  @State private var height: CGFloat = 470
  @AccessibilityFocusState private var titleFocused: Bool

  private var today: Date {
    Self.calendar.date(from: DateComponents(year: set.todayY, month: set.todayM, day: set.todayD, hour: 12)) ?? Date()
  }

  private var oldest: Date {
    // TS sends a hundred years of them (onboarding's wheel); a bad value falls back to the same
    let year = set.minYear > 0 && set.minYear <= set.todayY ? set.minYear : set.todayY - 99
    return min(Self.calendar.date(from: DateComponents(year: year, month: 1, day: 1, hour: 12)) ?? today, today)
  }

  /// what the wheel shows: the date picked, inside the range; today until it is turned
  private var date: Date { min(max(picked ?? today, oldest), today) }

  /// a year before this one is under the band (TS's gate reads the answer again: this only dims the key)
  private var answered: Bool { Self.calendar.component(.year, from: date) < set.todayY }

  var body: some View {
    ScrollView(.vertical) {
      VStack(spacing: 0) {
        KSheetChrome.Header(theme: theme, title: set.title, closeLabel: set.closeLabel, titleFocus: $titleFocused, onClose: onClose)
        KSheetChrome.Body(theme: theme, text: set.body)
          .fixedSize(horizontal: false, vertical: true)
        DatePicker(
          set.title,
          selection: Binding(get: { date }, set: { picked = $0 }),
          in: oldest...today,
          displayedComponents: .date
        )
        .datePickerStyle(.wheel)
        .labelsHidden()
        .environment(\.locale, set.locale.isEmpty ? Locale.current : Locale(identifier: set.locale))
        .environment(\.calendar, Self.calendar)
        // the wheel's own type follows the theme's light or dark, as the page does
        .environment(\.colorScheme, theme.isDark ? .dark : .light)
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 8)
        KSheetChrome.Key(theme: theme, kind: .primary, label: set.key, dimmed: answered ? nil : 0.4) {
          guard answered else { return }
          onSet(date)
        }
        .disabled(!answered)
        .padding(.horizontal, KSheetChrome.keyInset)
        .padding(.top, 8)
        Text(set.once)
          .kText(.system(13, lineHeight: 18 / 13))
          .foregroundStyle(theme.mute)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
          .frame(maxWidth: .infinity)
          .padding(.horizontal, 24)
          .padding(.top, 12)
      }
      .padding(.top, KSheetChrome.topPad)
      .padding(.bottom, KSheetChrome.bottomPad)
      .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { height = $0 }
    }
    .scrollBounceBehavior(.basedOnSize)
    .scrollIndicators(.hidden)
    .presentationDetents([.height(height)])
    .presentationDragIndicator(.visible)
    .presentationBackground(theme.sf)
    .onAppear {
      // VoiceOver to the title once the sheet is up
      Task { @MainActor in
        try? await Task.sleep(for: .milliseconds(450))
        titleFocused = true
      }
    }
  }
}

// MARK: - The new-faces note

/// The one-time note over the face strip, for a legacy portrait: its words on the theme's palest
/// accent wash, three of the new faces, See new faces (secondary) and Keep mine (a quiet link).
struct KNewFacesNoteView: View {
  let theme: KTheme
  let note: KEditNewFacesNote
  let onSee: () -> Void
  let onKeep: () -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(alignment: .top, spacing: 12) {
        VStack(alignment: .leading, spacing: 4) {
          Text(note.title)
            .kText(.name)
            .foregroundStyle(theme.ink)
            .accessibilityAddTraits(.isHeader)
          Text(note.body)
            .kText(.small)
            .foregroundStyle(theme.sub)
            .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        HStack(spacing: -10) {
          ForEach(Array(note.faces.prefix(3).enumerated()), id: \.offset) { _, ref in
            KImage(ref, size: CGSize(width: 34, height: 34), placeholder: theme.soft2)
              .clipShape(Circle())
              .overlay(Circle().strokeBorder(theme.lav2, lineWidth: 2))
          }
        }
        .accessibilityHidden(true)
      }
      // side by side while both fit on one line each; stacked when they don't (accessibility
      // text sizes, or a long language), where each one-line label would otherwise be cut
      ViewThatFits(in: .horizontal) {
        HStack(spacing: 12) {
          KSecondaryButton(theme: theme, title: note.see, action: onSee)
          keepButton(oneLine: true)
        }
        VStack(alignment: .leading, spacing: 8) {
          KSecondaryButton(theme: theme, title: note.see, action: onSee)
          keepButton(oneLine: false)
        }
      }
    }
    .padding(14)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(theme.lav2))
    .accessibilityElement(children: .contain)
  }

  /// Keep mine, a quiet link: one line beside See new faces (so ViewThatFits can tell when the
  /// pair no longer fits), wrapping when stacked under it.
  private func keepButton(oneLine: Bool) -> some View {
    SwiftUI.Button(action: onKeep) {
      Text(note.keep)
        .kText(.chip)
        .foregroundStyle(theme.ind)
        .lineLimit(oneLine ? 1 : nil)
        .fixedSize(horizontal: false, vertical: !oneLine)
        .multilineTextAlignment(.leading)
        .padding(.vertical, 12)
        .padding(.horizontal, 8)
        .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
  }
}
