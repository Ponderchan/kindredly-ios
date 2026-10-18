// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE COMPOSE PAGE (H:136, P:90-94): writing to a stranger, a full page that rises from the bottom.
 It LOOKS AS THE APP STORE PAGE DID (owner, 2026-10-18: "the composer as it was", the sticker-zine
 desk of compose.tsx before 10a, which ComposeRN draws too); everything it does is 10a step 5's.
 From the top, on the theme's page colour, 22 in from the sides unless said:
 - the top row, 20 in and 8 under the status bar: the ✕ in IBM Plex Mono 17 in its 42 box (the
   guarded way out: there is no edge swipe), TO A STRANGER in Plex Mono 600 12 at 1.6, centred in
   what is left, and the stamp corner tilted 8°: a 44 square with corners of 5 in 3 of room,
   a 1.5 dashed ind edge on lav2 while empty, the stamp's own art once chosen (a tap opens the
   stamps);
 - Wren's row, 14 down: Wren bare in a 46 frame (a React Native island drawing her at 38: her
   skin, her mood, her breathing are hers to draw) and, 10 from her, her line in Fraunces italic
   14 on 20, sub;
 - a 1pt line 12 under her, then 8 down the editor: Inter 19 on 30, ink, an ind caret, the spark
   as the placeholder in the old lavender (#B9B3D8) on the light themes and mute on the dark
   ones. It is a TextEditor (UITextView), which keeps its own caret in view as a long letter
   grows, so the caret never slips under the toolbar the way a growing TextField in a ScrollView
   does. While speaking, the Recorder (an island) and the line that travels with it take its
   place;
 - the question, when one is attached: a 1pt line along its top, its label in Plex Mono 9.5 at
   1.2 in mute, 7 above a one-line field of 140 in the system face at 16.5, padding 22 and 12;
 - the daily-cap panel when the day's letters are spent: a plain box with a 1pt ink edge, its
   line in system 600 15, why replies stay free in system 13 sub, the link in Plex Mono 500 11.5
   at 1 in ind. It is drawn only while the keyboard and the trays are away: it never takes the
   editor's height on a small phone (on an SE with the keyboard up it would leave the editor one
   line), and NONE LEFT TODAY stays on the small line above the toolbar while the writer types;
 - the small line above the toolbar, 24 in: the count near the ceiling and, for a free writer,
   "N LEFT TODAY", in Plex Mono 11, right-aligned (owner question 6's default);
 - the toolbar, 18 in, 10 above it and 24 below (10 over a tray): the two round keys, + and the
   stamp (or the chosen stamp's #name pill), and the wide key that fills toward the floor with
   the count beside its label (KComposeToolbar);
 - a tray, where the keyboard was (the stamps, or the + tray).
 The three faces 10a's type (KType) doesn't carry, Plex Mono at 400, Inter and Fraunces italic,
 are set here by KComposeType; the system face and Plex Mono 500 and 600 by .kText.

 THE KEYBOARD. The page sits in a Host that keeps the keyboard's safe area (ignoreSafeArea
 "container"), so the whole stack is shortened by the keyboard and the toolbar, the last thing in
 it, rides the keyboard's top (spike: a dock goes UNDER the content in a VStack, never in
 .safeAreaInset, which iOS 18 counts twice). Whether the keyboard is up is measured as the height
 of a reader that ignores the keyboard less the height of one that respects it (spike pattern 5:
 the safe-area reading said 0 with the keyboard up). Up, the toolbar sits 24 above it; down, 24
 above the home indicator (bottomInset, which the Host ignores), as the App Store page's sat.

 A TRAY TAKES THE KEYBOARD'S PLACE. Opening one blurs first (the tap does it at once; a tray
 that arrives from TS while a field is focused does it too), and the tray is drawn only once the
 keyboard has gone, so it is uncovered as the keyboard slides away instead of rising over it.
 Focusing a field closes the tray (onFieldFocus: TS owns which tray is open). Under Reduce
 Motion a tray fades in and out instead of sliding 296pt.

 VOICEOVER'S ESCAPE (two-finger Z) closes an open tray first, then asks to leave as the ✕ does
 (onClose, guarded by TS). Without it the gesture reached the navigation stack and popped the
 page past the leave guard, losing a recording (which can't be a draft) without a word.

 THE WORDS. The fields are uncontrolled: the words live in the fields (KField's rules, through
 the driver's two controllers, body and ask), every edit is reported (onTextChange) and nothing
 TS sends lands on typing except a deliberate setText (a draft resumed, a remount). While
 speaking, the caption field shares the body's controller: it is one text, as it always was, so
 switching between writing and speaking never loses a word.

 THE LIVE STATE (Wren's line, the key, the count) changes as the letter is typed. It comes
 through the driver (the `composer` command), and only the three small views that show it watch
 the driver; the page itself never redraws for a keystroke.

 Every word comes from the caller (KComposeContent); the stamps keep their own colours; every
 other colour is the theme's or a brand colour.
 */

/// Which field of the page.
public enum KComposeField: String, Sendable {
  /// the letter, or the line that travels with a recording
  case body
  /// the question under the letter
  case ask
}

/// What the page is writing.
public enum KComposeMode: String, Sendable {
  case write
  case speak
}

/// What sits where the keyboard was.
public enum KComposeTray: String, Sendable {
  case none
  case stamps
  case more
}

/// The chosen stamp, coloured for the page by the caller (theme/post channelColors).
public struct KComposeStamp: Equatable, Sendable {
  public let id: String
  /// "#made my day", already cased
  public let name: String
  /// the pill's fill, its words and its rule
  public let wash: Color
  public let ink: Color
  public let line: Color
  /// VoiceOver: "Mood stamp: Made my day. Change it"
  public let accessibilityLabel: String

  public init(id: String, name: String, wash: Color, ink: Color, line: Color, accessibilityLabel: String) {
    self.id = id
    self.name = name
    self.wash = wash
    self.ink = ink
    self.line = line
    self.accessibilityLabel = accessibilityLabel
  }
}

/// One stamp in the tray.
public struct KComposeStampItem: Identifiable, Equatable, Sendable {
  public let id: String
  /// its name, cased for the tray
  public let name: String
  /// the name's colour (the stamp's channel ink on the tray)
  public let ink: Color
  public let accessibilityLabel: String

  public init(id: String, name: String, ink: Color, accessibilityLabel: String) {
    self.id = id
    self.name = name
    self.ink = ink
    self.accessibilityLabel = accessibilityLabel
  }
}

/// One section of the stamp tray: FOR THIS LETTER, RECENTLY USED, a category.
public struct KComposeStampSection: Identifiable, Equatable, Sendable {
  /// stable within the tray (the caller's order and title)
  public let id: String
  public let title: String
  public let items: [KComposeStampItem]

  public init(id: String, title: String, items: [KComposeStampItem]) {
    self.id = id
    self.title = title
    self.items = items
  }
}

/// The main key, as the caller decides it (compose-model keyFor).
public struct KComposeKey: Equatable, Sendable {
  public enum Stage: String, Sendable {
    case filling
    case needStamp
    case ready
    case sending
  }

  public enum Tone: String, Sendable {
    case mute
    case ind
  }

  public var stage: Stage
  /// LET IT TRAVEL / PICK A MOOD STAMP / SENDING…
  public var label: String
  /// what it says where `label` doesn't fit (SEND); "" never squeezes
  public var narrowLabel: String
  public var tone: Tone
  /// pressable (ready: it sends; needStamp: it opens the stamps)
  public var enabled: Bool
  /// the wash rising toward the floor, 0...1; below 0 for none
  public var progress: Double
  /// the count beside the label while the wash shows ("7/20"); "" for none
  public var count: String
  /// the chevron leaning toward the stamp key
  public var nudge: Bool

  public init(stage: Stage = .filling, label: String = "", narrowLabel: String = "", tone: Tone = .mute, enabled: Bool = false, progress: Double = -1, count: String = "", nudge: Bool = false) {
    self.stage = stage
    self.label = label
    self.narrowLabel = narrowLabel
    self.tone = tone
    self.enabled = enabled
    self.progress = progress
    self.count = count
    self.nudge = nudge
  }
}

/// The count near the ceiling.
public struct KComposeCount: Equatable, Sendable {
  public enum Tone: String, Sendable {
    case mute
    /// within 40 of the ceiling
    case amber
    /// past it
    case post
  }

  /// "" hides it
  public var text: String
  public var tone: Tone

  public init(text: String = "", tone: Tone = .mute) {
    self.text = text
    self.tone = tone
  }
}

/// The state that changes as the letter is typed (the `composer` command).
public struct KComposeLive: Equatable, Sendable {
  /// Wren's line, already in quotes
  public var wrenLine: String
  public var key: KComposeKey
  public var count: KComposeCount

  public init(wrenLine: String = "", key: KComposeKey = KComposeKey(), count: KComposeCount = KComposeCount()) {
    self.wrenLine = wrenLine
    self.key = key
    self.count = count
  }
}

/// Every word the page shows that isn't live or in a list.
public struct KComposeStrings: Equatable, Sendable {
  public var title = ""
  /// "Close": the ✕, and the + while its tray is open
  public var closeLabel = ""
  /// VoiceOver: the empty stamp slot and the stamp key
  public var stampLabel = ""
  /// VoiceOver: the +
  public var plusLabel = ""
  /// VoiceOver: the editor
  public var editorLabel = ""
  /// the spark
  public var placeholder = ""
  public var captionPlaceholder = ""
  public var voiceNote = ""
  public var askLabel = ""
  public var askPlaceholder = ""
  public var moreAsk = ""
  public var moreVoice = ""
  /// VoiceOver's value on the locked voice cell
  public var voiceLocked = ""
  /// VoiceOver's value on the ASK cell while it is off (speaking: a recording carries no question)
  public var askDisabled = ""
  public var capText = ""
  public var capSub = ""
  public var capLink = ""

  public init() {}
}

/// Everything the page draws that isn't live: the caller's props.
public struct KComposeContent: Equatable, Sendable {
  public var strings = KComposeStrings()
  /// nil: none chosen yet
  public var stamp: KComposeStamp?
  public var mode: KComposeMode = .write
  public var tray: KComposeTray = .none
  /// the stamp tray's sections (sent while it is open)
  public var sections: [KComposeStampSection] = []
  /// the question field shows
  public var askOn = false
  /// the + tray's cells (ASK is off while speaking)
  public var askCellOn = false
  public var askCellDisabled = false
  public var voiceCellOn = false
  public var voiceLocked = false
  /// the + key's dot
  public var plusDot = false
  /// "4 LEFT TODAY", "" for none
  public var quota = ""
  public var capPanel = false
  /// a send is in flight
  public var busy = false

  public init() {}
}

/// The page's live channel from whoever drives it (the Expo adapter, from TS commands): the two
/// fields' controllers and the live state. As long-lived as the page. Only the small views that
/// show the live state watch it.
public final class KComposeDriver: ObservableObject {
  /// the letter (or, while speaking, the line that travels with the recording)
  public let body = KFieldController()
  /// the question
  public let ask = KFieldController()
  @Published public var live = KComposeLive()

  public init() {}

  /// Either field, by name.
  public func controller(_ field: KComposeField) -> KFieldController {
    field == .body ? body : ask
  }

  /// Takes the keyboard from both fields.
  public func blurAll() {
    body.blur()
    ask.blur()
  }

  /// One of the fields has the keyboard.
  public var anyFocused: Bool {
    body.isFocused || ask.isFocused
  }
}

/// What the page tells its owner. One object for the life of the page; set the closures once.
public final class KComposeActions {
  /// the ✕ (TS asks before leaving a page with words)
  public var onClose: () -> Void = {}
  /// the reader's edits in a field (never a setText)
  public var onTextChange: (_ field: KComposeField, _ text: String) -> Void = { _, _ in }
  /// a tray key: toggles that tray (.stamps or .more)
  public var onTray: (KComposeTray) -> Void = { _ in }
  public var onPickStamp: (String) -> Void = { _ in }
  public var onAskToggle: () -> Void = {}
  public var onVoiceToggle: () -> Void = {}
  /// the main key, with the words as typed (the letter, the question)
  public var onKey: (_ text: String, _ ask: String) -> Void = { _, _ in }
  public var onCapLink: () -> Void = {}
  /// a field gained or lost the keyboard
  public var onFieldFocus: (_ field: KComposeField, _ focused: Bool) -> Void = { _, _ in }

  public init() {}
}

public struct KComposePage<Wren: View, Recorder: View>: View {
  /// the page's side margin (compose.tsx: the scroll's paddingHorizontal 22)
  static var gutter: CGFloat { 22 }
  /// the tray's height above the home indicator (ComposeTray TRAY_H)
  public static var trayHeight: CGFloat { 296 }

  private let theme: KTheme
  private let content: KComposeContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let driver: KComposeDriver
  private let actions: KComposeActions
  private let wren: Wren
  private let recorder: Recorder

  /// the height of the page laid out around the keyboard, and of the page under it
  @State private var keptHeight: CGFloat = 0
  @State private var fullHeight: CGFloat = 0
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  /// - Parameters:
  ///   - content: everything that isn't live (the caller's props)
  ///   - topInset: the status bar (the Host ignores it)
  ///   - bottomInset: the home indicator (the Host ignores it): the toolbar's room while the
  ///     keyboard is down, and the tray grows by it
  ///   - driver: the fields' controllers and the live state
  ///   - actions: every tap and edit
  ///   - wren: Wren, 46 × 46 (an island), set bare beside her line
  ///   - recorder: the Recorder and its preview (an island), placed while speaking
  public init(
    theme: KTheme,
    content: KComposeContent,
    topInset: CGFloat,
    bottomInset: CGFloat,
    driver: KComposeDriver,
    actions: KComposeActions,
    @ViewBuilder wren: () -> Wren,
    @ViewBuilder recorder: () -> Recorder
  ) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.driver = driver
    self.actions = actions
    self.wren = wren()
    self.recorder = recorder()
  }

  /// the keyboard covers part of the page (a hardware keyboard covers none)
  private var keyboardUp: Bool { fullHeight - keptHeight > 1 }
  /// the tray, once the keyboard has gone
  private var showTray: Bool { content.tray != .none && !keyboardUp }
  /// the cap panel, only while the keyboard and the trays are away (see the top of the file)
  private var showCap: Bool { content.capPanel && !keyboardUp && !showTray }

  /// compose.tsx: paddingBottom 24 (10 over a tray), inside the safe area
  private var toolbarBottom: CGFloat {
    if keyboardUp { return 24 }
    if showTray { return 10 }
    return bottomInset + 24
  }

  public var body: some View {
    VStack(spacing: 0) {
      header
        .padding(.top, topInset + 8)
        .padding(.horizontal, 20)

      wrenRow
        .padding(.top, 14)
        .padding(.horizontal, Self.gutter)

      Rectangle()
        .fill(theme.line)
        .frame(height: 1)
        .padding(.top, 12)
        .padding(.horizontal, Self.gutter)
        .accessibilityHidden(true)

      page
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)

      if content.askOn && content.mode == .write {
        askField
      }

      if showCap {
        KCapPanel(theme: theme, text: content.strings.capText, sub: content.strings.capSub, link: content.strings.capLink, onLink: actions.onCapLink)
          .padding(.horizontal, Self.gutter)
          .padding(.top, 16)
          .padding(.bottom, 14)
          .transition(.opacity)
      }

      KComposeNoteLine(theme: theme, driver: driver, quota: content.quota)
        .padding(.horizontal, 24)

      KComposeToolbar(theme: theme, content: content, driver: driver, actions: actions)
        .padding(.horizontal, 18)
        .padding(.top, 10)
        .padding(.bottom, toolbarBottom)
        .animation(.easeOut(duration: 0.25), value: keyboardUp)

      if showTray {
        tray
          .frame(height: Self.trayHeight + bottomInset)
          .transition(reduceMotion ? .opacity : .move(edge: .bottom).combined(with: .opacity))
      }
    }
    .animation(reduceMotion ? .easeOut(duration: 0.15) : .easeOut(duration: 0.22), value: showTray)
    .animation(.easeOut(duration: 0.2), value: showCap)
    .background { theme.bg.ignoresSafeArea() }
    // the keyboard: the page as laid out around it, and the page under it (see THE KEYBOARD)
    .background {
      GeometryReader { geo in
        Color.clear.onChange(of: geo.size.height, initial: true) { _, h in keptHeight = h }
      }
    }
    .background {
      GeometryReader { geo in
        Color.clear.onChange(of: geo.size.height, initial: true) { _, h in fullHeight = h }
      }
      .ignoresSafeArea(.keyboard)
    }
    .onChange(of: content.tray) { _, tray in
      // a tray takes the keyboard's place: let go first
      if tray != .none { driver.blurAll() }
    }
    // a container of its own, so VoiceOver's escape reaches it from any element on the page
    .accessibilityElement(children: .contain)
    .accessibilityAction(.escape) {
      // an open tray closes first (onTray toggles the open one shut); then the guarded way out
      if content.tray != .none {
        actions.onTray(content.tray)
      } else {
        actions.onClose()
      }
    }
  }

  // ── the top row ──

  /// compose.tsx's row: the ✕ in its 42 box, the title centred in what is left, the stamp
  /// corner (50 with its room) tilted 8°
  private var header: some View {
    HStack(spacing: 0) {
      SwiftUI.Button(action: actions.onClose) {
        Text(verbatim: "✕")
          .composeText(.close)
          .foregroundStyle(theme.ink)
          .frame(width: 42, height: 42)
          .contentShape(Rectangle())
      }
      .buttonStyle(KAsIsButtonStyle())
      .accessibilityLabel(content.strings.closeLabel)

      Text(content.strings.title)
        .kText(.mono(12, .semibold, tracking: 1.6 / 12))
        .foregroundStyle(theme.ink)
        .lineLimit(1)
        // the longer languages (A UN EXTRAÑO, AN EINEN FREMDEN) shrink before they would run
        // under the ✕ or the stamp corner
        .minimumScaleFactor(0.8)
        .frame(maxWidth: .infinity)
        .accessibilityAddTraits(.isHeader)

      SwiftUI.Button {
        driver.blurAll()
        actions.onTray(.stamps)
      } label: {
        stampCorner
          .padding(3)
          .contentShape(Rectangle())
          .rotationEffect(.degrees(8))
      }
      .buttonStyle(KAsIsButtonStyle())
      .accessibilityLabel(content.stamp?.accessibilityLabel ?? content.strings.stampLabel)
    }
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
  }

  /// the 44 corner where the stamp goes: dashed ind on lav2 while empty, the stamp's art once chosen
  @ViewBuilder private var stampCorner: some View {
    if let stamp = content.stamp {
      KStampArt(id: stamp.id, size: 44, fallbackCorner: 5)
    } else {
      RoundedRectangle(cornerRadius: 5, style: .circular)
        .fill(theme.lav2)
        .overlay {
          // React Native's dashed border: dashes and gaps of three widths
          RoundedRectangle(cornerRadius: 5, style: .circular)
            .strokeBorder(theme.ind, style: StrokeStyle(lineWidth: 1.5, dash: [4.5, 4.5]))
        }
        .frame(width: 44, height: 44)
    }
  }

  // ── Wren's row ──

  private var wrenRow: some View {
    HStack(spacing: 10) {
      wren
        .frame(width: 46, height: 46)
        .accessibilityHidden(true)
      KComposeWrenLine(theme: theme, driver: driver)
    }
  }

  /// the placeholders' colour: the old lavender on the light themes, mute on the dark ones
  private var placeholderColor: Color {
    theme.isDark ? theme.mute : KComposeType.placeholderLight
  }

  // ── the page: the editor, or the recorder and its line ──

  @ViewBuilder private var page: some View {
    switch content.mode {
    case .write:
      KComposeEditor(
        theme: theme,
        controller: driver.body,
        placeholder: content.strings.placeholder,
        placeholderColor: placeholderColor,
        accessibilityLabel: content.strings.editorLabel,
        onChange: { actions.onTextChange(.body, $0) },
        onFocus: { actions.onFieldFocus(.body, $0) }
      )
      // UITextView pads its lines 5 in from each side: the words start at the gutter
      .padding(.horizontal, Self.gutter - KComposeEditor.linePadding)
      // compose.tsx: 8 under the line and the field's own 10, less UITextView's 8
      .padding(.top, 8 + 10 - KComposeEditor.topInset)
    case .speak:
      ScrollView {
        VStack(alignment: .leading, spacing: 14) {
          recorder
            .frame(maxWidth: .infinity, alignment: .leading)
          Text(content.strings.voiceNote)
            .composeText(.voiceNote)
            .foregroundStyle(theme.mute)
            .fixedSize(horizontal: false, vertical: true)
          KField(
            controller: driver.body,
            placeholder: content.strings.captionPlaceholder,
            axis: .vertical,
            lines: 1...4,
            returnSends: false,
            tint: theme.ind,
            textColor: theme.ink,
            placeholderColor: placeholderColor,
            onChange: { actions.onTextChange(.body, $0) },
            onFocus: { actions.onFieldFocus(.body, $0) }
          )
        }
        .padding(.horizontal, Self.gutter)
        .padding(.top, 8 + 12)
        .padding(.bottom, 14)
      }
      .scrollDismissesKeyboard(.interactively)
      .scrollIndicators(.hidden)
    }
  }

  // ── the question ──

  private var askField: some View {
    VStack(alignment: .leading, spacing: 7) {
      Text(content.strings.askLabel)
        .composeText(.askLabel)
        .foregroundStyle(theme.mute)
        .accessibilityHidden(true)
      KField(
        controller: driver.ask,
        placeholder: content.strings.askPlaceholder,
        style: .system(16.5),
        axis: .horizontal,
        lines: nil,
        returnSends: false,
        maxLength: KComposeAsk.maxLength,
        tint: theme.ind,
        textColor: theme.ink,
        placeholderColor: placeholderColor,
        accessibilityLabel: content.strings.askLabel,
        onChange: { actions.onTextChange(.ask, $0) },
        onFocus: { actions.onFieldFocus(.ask, $0) }
      )
      // compose.tsx: paddingVertical 4; SwiftUI's one-line field stands 1.7 taller over its
      // words than React Native's, so less above keeps them where they were (measured)
      .padding(.top, 4 - 1.7)
      .padding(.bottom, 4)
    }
    .padding(.horizontal, Self.gutter)
    // padding 12 under its 1pt top border, which React Native adds to the box
    .padding(.top, 12 + 1)
    .padding(.bottom, 12)
    .frame(maxWidth: .infinity, alignment: .leading)
    .overlay(alignment: .top) {
      Rectangle().fill(theme.line).frame(height: 1)
    }
    .transition(.opacity)
  }

  // ── the tray ──

  @ViewBuilder private var tray: some View {
    switch content.tray {
    case .stamps:
      KStampTray(theme: theme, sections: content.sections, selectedId: content.stamp?.id ?? "", bottomInset: bottomInset, onPick: actions.onPickStamp)
    case .more:
      KMoreTray(
        theme: theme,
        askLabel: content.strings.moreAsk,
        voiceLabel: content.strings.moreVoice,
        voiceLockedLabel: content.strings.voiceLocked,
        askDisabledLabel: content.strings.askDisabled,
        askOn: content.askCellOn,
        askDisabled: content.askCellDisabled,
        voiceOn: content.voiceCellOn,
        voiceLocked: content.voiceLocked,
        onAsk: actions.onAskToggle,
        onVoice: actions.onVoiceToggle
      )
    case .none:
      EmptyView()
    }
  }
}

/// The question's limit (compose.tsx maxLength 140): Swift cuts it, so TS never has to echo a
/// shortened text back.
enum KComposeAsk {
  static let maxLength = 140
}

/*
 THE APP STORE PAGE'S TYPE (src/theme/post PF; owner, 2026-10-18). Three of its faces aren't
 among 10a's (KType): IBM Plex Mono at 400 (the ✕, the small mono lines, the count beside the
 key's label), Inter (where you write: PF.writing) and Fraunces italic (Wren's line:
 PF.serifItalic); and it sets Plex Mono 500 at 11.5 (the pill, the cap panel's link). All are
 embedded in the app by PostScript name (assets/fonts, app.json expo-font, UIAppFonts) and found
 by that name, so Fraunces-Italic comes out italic without asking for the trait (React Native
 picks a face by family and style, so it needs fontStyle "italic" as well). They are set at a
 fixed size scaled by the text style's Dynamic Type factor, not by Font.custom(_:size:relativeTo:),
 which rounds a fractional size up to the whole point (9.5, 10.5 and 11.5 came out 10, 11 and
 12, 4% wide); the factor is read as @ScaledMetric's 100, since a size read straight from it is
 rounded to the pixel (9.5 came out 9.67).
 CJK falls through to the system face, as it does in React Native.
 Sizes, letter spacing and line heights are compose.tsx's, in points, and scale with Dynamic
 Type as React Native's text does: the line height as KTextModifier does it, the room React
 Native adds over the face's own line (hhea: Plex Mono 1.3, Inter 1.21, Fraunces 1.233) between
 the lines and half of it above and below, as its Text centres a line in its height; except
 where you write, where React Native's TextInput puts all of it above each line (leadingAbove),
 so the first line sits as low as it did.
 */
struct KComposeType: Equatable {
  enum Face: String {
    case mono = "IBMPlexMono-Regular"
    case monoMedium = "IBMPlexMono-Medium"
    case writing = "Inter-Regular"
    case wren = "Fraunces-Italic"

    /// the face's own line height, a multiple of its size (hhea ascender + descender)
    var natural: CGFloat {
      switch self {
      case .mono, .monoMedium: return 1.3
      case .writing: return 1.21
      case .wren: return 1.233
      }
    }
  }

  let face: Face
  let size: CGFloat
  /// letter spacing in points (React Native's letterSpacing)
  var tracking: CGFloat = 0
  /// line height in points (React Native's lineHeight); nil for the face's own
  var lineHeight: CGFloat?
  /// the extra line height goes above the first line, as React Native's TextInput sets it
  /// (its Text centres the line instead)
  var leadingAbove = false

  /// the text style its Dynamic Type scaling follows
  var textStyle: Font.TextStyle { KType.textStyle(near: size) }

  /// the ✕
  static let close = KComposeType(face: .mono, size: 17)
  /// Wren's line
  static let wrenLine = KComposeType(face: .wren, size: 14, lineHeight: 20)
  /// the letter as it is written
  static let writing = KComposeType(face: .writing, size: 19, lineHeight: 30, leadingAbove: true)
  /// the note under the Recorder
  static let voiceNote = KComposeType(face: .mono, size: 10, tracking: 0.6, lineHeight: 17)
  /// the question's label
  static let askLabel = KComposeType(face: .mono, size: 9.5, tracking: 1.2)
  /// the count near the ceiling, the letters left today
  static let countLine = KComposeType(face: .mono, size: 11, tracking: 0.4)
  static let quotaLine = KComposeType(face: .mono, size: 11, tracking: 0.6)
  /// the count beside the key's label ("7/20")
  static let keyCount = KComposeType(face: .mono, size: 10.5, tracking: 0.6)
  /// the chosen stamp's #name in its pill
  static let pillName = KComposeType(face: .monoMedium, size: 11.5, tracking: 0.2)
  /// the cap panel's link to First Class
  static let capLink = KComposeType(face: .monoMedium, size: 11.5, tracking: 1)

  /// the placeholders' lavender on the light themes (compose.tsx; the dark themes use mute)
  static let placeholderLight = Color(hex: "#B9B3D8")
}

/// Sets a KComposeType: the face, its letter spacing and its line height, scaled with Dynamic Type.
struct KComposeTypeModifier: ViewModifier {
  let type: KComposeType
  /// 100 at the reader's Dynamic Type setting: the text style's factor, in percent
  @ScaledMetric private var percent: CGFloat

  init(_ type: KComposeType) {
    self.type = type
    _percent = ScaledMetric(wrappedValue: 100, relativeTo: type.textStyle)
  }

  func body(content: Content) -> some View {
    let scale = percent / 100
    let size = type.size * scale
    let leading = type.lineHeight.map { max(0, $0 * scale - type.face.natural * size) } ?? 0
    return content
      .font(.custom(type.face.rawValue, fixedSize: size))
      .tracking(type.tracking * scale)
      .lineSpacing(leading)
      .padding(.top, type.leadingAbove ? leading : leading / 2)
      .padding(.bottom, type.leadingAbove ? 0 : leading / 2)
  }
}

extension View {
  /// Sets text in one of the App Store page's faces: Text("✕").composeText(.close).
  func composeText(_ type: KComposeType) -> some View {
    modifier(KComposeTypeModifier(type))
  }
}

/// Wren's line, watching the live state. Never cut short: her once-per-language hello runs to
/// about 150 characters in French and about 70 full-width ones in Japanese and Korean, more than
/// three lines in this column; the editor below takes whatever room is left. The row stops
/// growing at the page's accessibility cap instead of truncating her words.
private struct KComposeWrenLine: View {
  let theme: KTheme
  @ObservedObject var driver: KComposeDriver

  var body: some View {
    Text(driver.live.wrenLine)
      .composeText(.wrenLine)
      .foregroundStyle(theme.sub)
      .fixedSize(horizontal: false, vertical: true)
      .frame(maxWidth: .infinity, alignment: .leading)
      .dynamicTypeSize(...DynamicTypeSize.accessibility1)
  }
}

/// The small line above the toolbar: the count near the ceiling, and the free writer's letters
/// left today, right-aligned in Plex Mono 11. Nothing at all when neither shows.
private struct KComposeNoteLine: View {
  let theme: KTheme
  @ObservedObject var driver: KComposeDriver
  let quota: String

  var body: some View {
    let count = driver.live.count
    if !count.text.isEmpty || !quota.isEmpty {
      HStack(spacing: 12) {
        Spacer(minLength: 0)
        if !count.text.isEmpty {
          Text(count.text)
            .composeText(.countLine)
            .foregroundStyle(color(count.tone))
            .lineLimit(1)
        }
        if !quota.isEmpty {
          Text(quota)
            .composeText(.quotaLine)
            .foregroundStyle(theme.mute)
            .lineLimit(1)
        }
      }
      .minimumScaleFactor(0.8)
      // compose.tsx: marginBottom -2, so the toolbar's 10 reads as 8 under it
      .padding(.bottom, -2)
      .dynamicTypeSize(...DynamicTypeSize.accessibility1)
      .accessibilityElement(children: .combine)
    }
  }

  /// compose-model countBrand: near the ceiling, brass that reads as small mono text — brassSeal
  /// on the light pages (goldText measures under 3:1 on Classic, Lavender and Paper), goldText on
  /// Midnight (5.8:1 there); past it, postmark red.
  private func color(_ tone: KComposeCount.Tone) -> Color {
    switch tone {
    case .mute: return theme.mute
    case .amber: return theme.isDark ? KBrand.goldText : KBrand.brassSeal
    case .post: return KBrand.postRed
    }
  }
}
