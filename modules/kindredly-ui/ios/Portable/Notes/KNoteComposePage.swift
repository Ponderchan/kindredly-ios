// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE NOTES COMPOSER (the "write a page" screen, src/app/journal-entry.tsx), in SwiftUI for 1.0.7
 (binary 1.2.6). Drawn to the owner's Note Composer Bar design (2026-10-26, Desktop/export/
 note-composer-bar: CLAUDE-CODE-PROMPTS-NOTE-COMPOSER.md and its prototype), under visual rule B
 (flat controls: no ink outlines, no hard shadows). The React Native page (components/
 SelfCompose) stays as the remote switch's fallback ("journalentry" in app_surfaces).

 From the top, on the theme's page colour (the prototype's 393 × 852 phone, pt = px):
 - the head, 12 under the status bar, 40 tall, 26 in: the line ✕ (KLineIcon .close 20 at 2.2 in
   its 42 box), the date centred on the page in System 600 17 ("oct 26", TS's words), and on the
   right a filled padlock 11 × 12 and JUST FOR ME in SF Mono 10 at .16em, both mute;
 - Wren's row, 12 down, 22 in on the left: Wren at 30 (a React Native island: her skin, her
   breathing) and, 14 from her, her line in the writer's Letter font, italic where it has one,
   16, sub. A tap gives her next line (TS);
 - a 1.5 line 14 under her, 20 in;
 - the page, 16.5 under the line, 22 in: what rides with it first (photos and a film as 88 × 88
   tiles with corners of 12, in one row that scrolls sideways; the Recorder and its take, an
   island, while speaking), then the words: the Letter font 19 on 1.5, ink, the caret ind. THE
   PAGE OPENS WITH THE KEYBOARD DOWN (both ways in): the placeholder in faint and, before it, a
   2 × 26 ind caret blinking (KComposeEditor idleCaret); a tap on the page brings the keyboard.
 - the bar, 26 in, 44 tall, 14 apart (NoteComposerBar):
     ＋  22 at 1.9, no circle, a 28 key (44 to touch); while its panel is open it turns 45°
         (.3s, the design's cubic-bezier(.3,1.3,.4,1));
     the mood capsule, 36 tall, fully round, a 1.8 edge, 7 in: no circle, no words. Chosen: the
         mood's fill with an edge of the same fill (no ink), the face 20 in the group's face ink.
         None yet: no fill, a dashed 1.8 edge in faint and a dashed face in mute;
     SEAL IT HERE, the rest of the row: 36 tall, fully round, a 1.8 edge, its label in SF Mono
         12 at .06em with a 15 padlock after it. Nothing on the page: the line colour's edge on
         the card face, the words faint, not pressable. Words or media: ink filled, the words
         in the page colour. No counter (a diary has no floor).
   It sits 30 above the home indicator, or 12 above a panel or the keyboard (.3s).
 - a panel where the keyboard goes, one at a time (TS decides which; opening one lets the
   keyboard go, a tap on the page closes them): the soft ground with a 1.5 line along its top,
   rising .3s (Reduce Motion: a fade).
     ＋ panel, 200 with the home indicator: Photo, Video and Audio as three colour cards 92 tall
         with corners of 20 (Photo on Calm's green, Video on Low's blue, Audio on Tired's
         lilac), a 26 line icon at 1.9 over the name in System 600 15. A kind the page can't
         take (it holds another kind: one kind per page) is dimmed, and VoiceOver says why.
     mood panel, 300 with the home indicator, 18 down and 16 in: the four groups as cards 74
         tall with corners of 20 (the group's fill, its face 26 over its name in System 600
         15), the chosen one ringed inside by 2 in the group's own deep colour — flat, no ink
         edge, no hard shadow (owner, 2026-10-26, rule B) — then 22 down the open group's faces,
         five to a row: 54 tiles with corners of 16 and the face 26, the name under each in SF
         Mono 9 at .14em, sub; the chosen face ringed 2 in the panel's own face colour and 2 in
         the group's deep colour around it. A group tap chooses it and keeps the panel open; a
         face tap chooses it and closes the panel (TS).
 - THE SEAL MOMENT (owner, 2026-10-26, option A of three: "the mood is the seal"): the page's
   head, words and bar fade, and the page becomes a card that folds in half; the chosen mood's
   face drops onto the fold as a seal, with a tap of haptics; "KEPT · OCT 26" comes up under it;
   then the note goes down and small into today, and onSealEnd takes the reader back to Notes,
   where the new card pops in. KNoteSealMoment, at the end of this file. (Before it: the design's
   "Sealed. Just for you." veil, then the live app's CourierSendOff, both the same day.)

 THE KEYBOARD is KComposePage's (the page sits in a Host that keeps the keyboard's safe area, so
 the stack is shortened by it and the bar rides its top; whether it is up is the difference of two
 readers' heights). A panel is drawn only once the keyboard has gone.

 Every word comes from TS (KNoteComposeStrings and the lists); the mood colours are KMood's, the
 same in every theme; everything else is the theme's.
 */

/// What sits where the keyboard goes.
public enum KNoteComposePanel: String, Sendable {
  case none
  /// Photo, Video, Audio
  case plus
  case mood
}

/// What a page carries besides words (one kind per page: the journal stores one type).
public enum KNoteMediaKind: String, Sendable {
  case photo
  case video
  case voice
}

/// One face in the mood panel.
public struct KNoteMoodFace: Identifiable, Equatable, Sendable {
  /// the stored mood id ("shy")
  public let id: String
  /// its name as the tile says it (upper-cased by TS for the reader's language)
  public let name: String
  /// the art key KMoodArt draws ("mood-shy")
  public let artKey: String
  /// a face drawn as a path on the 24 grid, for a face with no art in this binary; "" for none
  public let path: String
  public let accessibilityLabel: String

  public init(id: String, name: String, artKey: String, path: String = "", accessibilityLabel: String) {
    self.id = id
    self.name = name
    self.artKey = artKey
    self.path = path
    self.accessibilityLabel = accessibilityLabel
  }
}

/// One of the four groups in the mood panel, and its faces.
public struct KNoteMoodGroup: Identifiable, Equatable, Sendable {
  public let group: KMoodGroup
  /// "Calm", in the reader's language
  public let name: String
  public let faces: [KNoteMoodFace]

  public var id: String { group.rawValue }

  public init(group: KMoodGroup, name: String, faces: [KNoteMoodFace]) {
    self.group = group
    self.name = name
    self.faces = faces
  }
}

/// The mood the page holds, as the capsule draws it.
public struct KNoteChosenMood: Equatable, Sendable {
  public let group: KMoodGroup
  /// the art key ("mood-shy", or "mood-group-low" for a group alone)
  public let artKey: String
  /// a path face for a mood with no art in this binary; "" for none
  public let path: String

  public init(group: KMoodGroup, artKey: String, path: String = "") {
    self.group = group
    self.artKey = artKey
    self.path = path
  }
}

/// A card in the ＋ panel.
public struct KNoteMediaCard: Identifiable, Equatable, Sendable {
  public let kind: KNoteMediaKind
  public let label: String
  /// false: the page holds another kind (dimmed, not pressable)
  public let enabled: Bool
  /// VoiceOver's value while it is off ("One kind per page"); "" for none
  public let accessibilityValue: String

  public var id: String { kind.rawValue }

  public init(kind: KNoteMediaKind, label: String, enabled: Bool, accessibilityValue: String = "") {
    self.kind = kind
    self.label = label
    self.enabled = enabled
    self.accessibilityValue = accessibilityValue
  }
}

/// A tile at the top of the page: a photo, or the film's poster.
public struct KNoteThumb: Identifiable, Equatable, Sendable {
  public let id: String
  public let image: KImageRef?
  public let kind: KNoteMediaKind
  public let accessibilityLabel: String
  public let accessibilityHint: String

  public init(id: String, image: KImageRef?, kind: KNoteMediaKind, accessibilityLabel: String, accessibilityHint: String = "") {
    self.id = id
    self.image = image
    self.kind = kind
    self.accessibilityLabel = accessibilityLabel
    self.accessibilityHint = accessibilityHint
  }
}

/// Every word of the page that isn't in a list.
public struct KNoteComposeStrings: Equatable, Sendable {
  /// "oct 26"
  public var date = ""
  /// JUST FOR ME
  public var justForMe = ""
  /// VoiceOver: the ✕, and the ＋ while its panel is open
  public var closeLabel = ""
  /// VoiceOver: the editor
  public var editorLabel = ""
  /// the empty page's placeholder (the spark, or the media line)
  public var placeholder = ""
  /// VoiceOver: the ＋
  public var plusLabel = ""
  /// VoiceOver: the mood capsule while none is chosen ("How did this feel?")
  public var moodEmptyLabel = ""
  /// Seal it here
  public var sealLabel = ""
  /// while sealing
  public var sealingLabel = ""
  /// VoiceOver's hint on the seal key while the page has no mood yet
  public var sealHint = ""
  /// under the sealed note, mono capitals as TS sends them ("KEPT · OCT 26")
  public var keptLine = ""
  /// what VoiceOver says once the page is sealed ("Kept.")
  public var keptSpoken = ""
  /// under two photos or more: the first is the cover
  public var coverHint = ""
  /// VoiceOver: the film's ✕
  public var removeVideo = ""

  public init() {}
}

/// Everything the page draws (the caller's props).
public struct KNoteComposeContent: Equatable, Sendable {
  public var strings = KNoteComposeStrings()
  /// Wren's line, already in quotes
  public var wrenLine = ""
  /// nil: no mood yet
  public var mood: KNoteChosenMood?
  /// VoiceOver: the mood capsule once one is chosen ("Shy")
  public var moodLabel = ""
  public var panel: KNoteComposePanel = .none
  public var groups: [KNoteMoodGroup] = []
  /// the group whose faces the panel shows
  public var openGroup: KMoodGroup = .calm
  /// the chosen group's card is ringed (nil before one is chosen)
  public var chosenGroup: KMoodGroup?
  /// the chosen face's id ("" for a group alone or none)
  public var chosenFace = ""
  public var cards: [KNoteMediaCard] = []
  public var thumbs: [KNoteThumb] = []
  /// the cover line shows (two photos or more)
  public var coverHint = false
  /// the Recorder island is placed (speaking)
  public var voice = false
  /// words or media: the seal key is live
  public var hasSomething = false
  /// the page is being sealed
  public var busy = false
  /// sealed: the seal moment plays over the page (KNoteSealMoment), then onSealEnd
  public var sealed = false
  /// no mood yet: the seal key's VoiceOver hint says so
  public var needsMood = false

  public init() {}
}

/// The page's live channel: the field's controller. As long-lived as the page.
public final class KNoteComposeDriver: ObservableObject {
  public let body = KFieldController()

  public init() {}

  public func blurAll() {
    body.blur()
  }

  public var anyFocused: Bool { body.isFocused }
}

/// What the page tells its owner. One object for the life of the page; set the closures once.
public final class KNoteComposeActions {
  /// the ✕ and VoiceOver's escape (TS asks before throwing a page away)
  public var onClose: () -> Void = {}
  /// the reader's edits (never a setText)
  public var onTextChange: (String) -> Void = { _ in }
  public var onFieldFocus: (Bool) -> Void = { _ in }
  /// the ＋ or the mood capsule: toggles that panel
  public var onPanel: (KNoteComposePanel) -> Void = { _ in }
  public var onPickGroup: (KMoodGroup) -> Void = { _ in }
  public var onPickFace: (String) -> Void = { _ in }
  public var onCard: (KNoteMediaKind) -> Void = { _ in }
  /// a photo tile (its index among the photos)
  public var onThumb: (Int) -> Void = { _ in }
  /// the film's ✕
  public var onRemoveMedia: () -> Void = {}
  /// SEAL IT HERE, with the words as typed
  public var onSeal: (String) -> Void = { _ in }
  /// the seal moment has played: back to Notes
  public var onSealEnd: () -> Void = {}
  /// Wren's row: her next line
  public var onWren: () -> Void = {}

  public init() {}
}

public struct KNoteComposePage<Wren: View, Recorder: View>: View {
  /// the panels' heights on a phone with a home indicator (the design's 200 and 300 include its 34)
  static var plusPanelHeight: CGFloat { 166 }
  static var moodPanelHeight: CGFloat { 266 }

  private let theme: KTheme
  private let content: KNoteComposeContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let driver: KNoteComposeDriver
  private let actions: KNoteComposeActions
  private let wren: Wren
  private let recorder: Recorder
  /// a folding phone's inner screen: this month, on the left page (THE SPREAD, below); nil for
  /// a holder that has none to show
  private let calendar: KNotesDriver?
  private let weekdays: [String]
  @ObservedObject private var fold = KFold.shared

  @State private var keptHeight: CGFloat = 0
  @State private var fullHeight: CGFloat = 0
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /// one written line (19 on 1.5) at the reader's Dynamic Type setting: the editor keeps two
  @ScaledMetric(relativeTo: .title3) private var writingLine: CGFloat = 28.5

  public init(
    theme: KTheme,
    content: KNoteComposeContent,
    topInset: CGFloat,
    bottomInset: CGFloat,
    driver: KNoteComposeDriver,
    actions: KNoteComposeActions,
    calendar: KNotesDriver? = nil,
    weekdays: [String] = [],
    @ViewBuilder wren: () -> Wren,
    @ViewBuilder recorder: () -> Recorder
  ) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.driver = driver
    self.actions = actions
    self.calendar = calendar
    self.weekdays = weekdays
    self.wren = wren()
    self.recorder = recorder()
  }

  static var writing: KTextStyle { .content(19, lineHeight: 1.5) }

  private var keyboardUp: Bool { fullHeight - keptHeight > 1 }
  private var showPanel: Bool { content.panel != .none && !keyboardUp && !content.sealed }

  /// 30 above the home indicator; 12 above a panel or the keyboard
  private var barBottom: CGFloat {
    if keyboardUp || showPanel { return 12 }
    return bottomInset + 30
  }

  private var editorFloor: CGFloat {
    2 * min(writingLine, 46.5) + 2 * KComposeEditor.topInset
  }

  private var motion: Animation {
    reduceMotion ? .easeOut(duration: 0.15) : .easeOut(duration: 0.3)
  }

  /* THE SPREAD (iPhone Duo's inner screen; the canvas's "写日记": "右页写，左页是这个月"; owner,
     2026-11-12: "逐个做吧"). A note is written to yourself, so what lies beside it is your own
     days: the left page is this month's mood calendar (the one Notes draws, as its page: no dim,
     nothing to close), today's square taking the mood as it is picked, and the right page is
     the composer exactly as on a phone, the keyboard and its panels under it. The month comes
     from TS by the `month` command (NoteComposeNative, only on this screen); until it has
     arrived, and wherever there is none, the page is the one column it always was. The Host is
     the window less the system's band (app/_layout: journal-entry). */
  public var body: some View {
    if fold.frame.twoPages, let calendar {
      HStack(alignment: .top, spacing: 0) {
        KNotesCalendar(theme: theme, strings: calendarStrings, topInset: topInset, driver: calendar, actions: KNotesActions(), page: true)
          .frame(width: fold.frame.crease)
          .frame(maxHeight: .infinity)
        pageBody
          .frame(width: max(0, fold.frame.rightEnd - fold.frame.crease))
        Spacer(minLength: 0)
      }
      .background { theme.bg.ignoresSafeArea() }
    } else {
      pageBody
    }
  }

  /// the calendar's own words here: only the weekday letters (it is not stepped or closed)
  private var calendarStrings: KNotesStrings {
    var s = KNotesStrings()
    s.weekdays = weekdays
    return s
  }

  private var pageBody: some View {
    VStack(spacing: 0) {
      header
        .padding(.top, topInset + 12)

      wrenRow
        .padding(.top, 12)
        .padding(.leading, 22)
        .padding(.trailing, 26)

      Rectangle()
        .fill(theme.line)
        .frame(height: 1.5)
        .padding(.top, 14)
        .padding(.horizontal, 20)
        .accessibilityHidden(true)

      page
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .layoutPriority(1)

      KNoteComposeBar(theme: theme, content: content, driver: driver, actions: actions)
        .padding(.horizontal, 26)
        .padding(.top, 8)
        .padding(.bottom, barBottom)
        .animation(motion, value: keyboardUp)

      if showPanel {
        panel
          .frame(height: (content.panel == .plus ? Self.plusPanelHeight : Self.moodPanelHeight) + bottomInset)
          .transition(reduceMotion ? .opacity : .move(edge: .bottom).combined(with: .opacity))
      }
    }
    .animation(motion, value: showPanel)
    .animation(motion, value: content.panel)
    // sealed: the page steps back for the seal moment
    .opacity(content.sealed ? 0 : 1)
    .animation(.easeOut(duration: 0.22).delay(0.12), value: content.sealed)
    .overlay {
      if content.sealed {
        KNoteSealMoment(theme: theme, mood: content.mood, line: content.strings.keptLine, spoken: content.strings.keptSpoken, onEnd: actions.onSealEnd)
      }
    }
    .background { theme.bg.ignoresSafeArea() }
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
    .onChange(of: content.panel) { _, panel in
      // a panel takes the keyboard's place: let go first
      if panel != .none { driver.blurAll() }
    }
    .onChange(of: content.sealed) { _, sealed in
      if sealed { driver.blurAll() }
    }
    .accessibilityElement(children: .contain)
    .accessibilityAction(.escape) {
      if content.sealed { return }
      if content.panel != .none {
        actions.onPanel(content.panel)
      } else {
        actions.onClose()
      }
    }
  }

  // ── the head ──

  private var header: some View {
    ZStack {
      // the date, centred on the page whatever the sides hold
      Text(content.strings.date)
        .kText(.system(17, .semibold))
        .foregroundStyle(theme.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.8)
        .padding(.horizontal, 96)
        .accessibilityAddTraits(.isHeader)

      HStack(spacing: 0) {
        SwiftUI.Button(action: actions.onClose) {
          KLineIcon(.close, size: 20, lineWidth: 2.2, color: theme.ink)
            .frame(width: 42, height: 42)
            .contentShape(Rectangle())
        }
        .buttonStyle(KAsIsButtonStyle())
        .accessibilityLabel(content.strings.closeLabel)
        .disabled(content.sealed)

        Spacer(minLength: 8)

        HStack(spacing: 6) {
          KNotePadlock(filled: true, color: theme.mute)
            .frame(width: 11, height: 12)
          Text(content.strings.justForMe)
            .kText(.mono(10, .medium, tracking: 0.16))
            .foregroundStyle(theme.mute)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
        }
        .accessibilityElement(children: .combine)
      }
      // the ✕'s glyph 26 in, as the design draws it (its 42 box reaches 11 further out)
      .padding(.leading, 26 - 11)
      .padding(.trailing, 26)
    }
    .frame(minHeight: 42)
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
  }

  // ── Wren's row ──

  private var wrenRow: some View {
    SwiftUI.Button(action: actions.onWren) {
      HStack(spacing: 14) {
        wren
          .frame(width: 30, height: 30)
          .accessibilityHidden(true)
        Text(content.wrenLine)
          .kText(.content(16, italic: true, lineHeight: 22.0 / 16))
          .foregroundStyle(theme.sub)
          .fixedSize(horizontal: false, vertical: true)
          .frame(maxWidth: .infinity, alignment: .leading)
      }
      .frame(minHeight: 40)
      .contentShape(Rectangle())
    }
    .buttonStyle(KAsIsButtonStyle())
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
  }

  // ── the page ──

  private var page: some View {
    VStack(alignment: .leading, spacing: 12) {
      if !content.thumbs.isEmpty {
        VStack(alignment: .leading, spacing: 10) {
          ScrollView(.horizontal) {
            HStack(spacing: 8) {
              ForEach(Array(content.thumbs.enumerated()), id: \.element.id) { index, thumb in
                KNoteThumbTile(theme: theme, thumb: thumb, removeLabel: content.strings.removeVideo) {
                  actions.onThumb(index)
                } onRemove: {
                  actions.onRemoveMedia()
                }
                .transition(reduceMotion ? .opacity : .scale(scale: 0.96).combined(with: .opacity))
              }
            }
            .padding(.horizontal, 22)
          }
          .scrollIndicators(.hidden)
          .frame(height: 88)

          if content.coverHint {
            Text(content.strings.coverHint)
              .kText(.system(12))
              .foregroundStyle(theme.mute)
              .padding(.horizontal, 22)
              .fixedSize(horizontal: false, vertical: true)
          }
        }
      }

      if content.voice {
        // the Recorder keeps its own ✕ for a take; the Audio card takes an empty one away
        recorder
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(.horizontal, 22)
      }

      KComposeEditor(
        theme: theme,
        controller: driver.body,
        placeholder: content.strings.placeholder,
        placeholderColor: theme.faint,
        accessibilityLabel: content.strings.editorLabel,
        writing: Self.writing,
        idleCaret: theme.ind,
        onChange: actions.onTextChange,
        onFocus: actions.onFieldFocus
      )
      .frame(minHeight: editorFloor, maxHeight: .infinity)
      .padding(.horizontal, 22 - KComposeEditor.linePadding)
    }
    .padding(.top, 16.5 - (content.thumbs.isEmpty && !content.voice ? KComposeEditor.topInset : 0))
    .animation(motion, value: content.thumbs.map(\.id))
    .animation(motion, value: content.voice)
  }

  // ── the panels ──

  @ViewBuilder private var panel: some View {
    switch content.panel {
    case .plus:
      KNotePlusPanel(theme: theme, cards: content.cards, onCard: actions.onCard)
    case .mood:
      KNoteMoodPanel(theme: theme, content: content, actions: actions)
    case .none:
      EmptyView()
    }
  }
}

// MARK: - the bar

/// ＋ · the mood capsule · SEAL IT HERE (the design's NoteComposerBar).
struct KNoteComposeBar: View {
  let theme: KTheme
  let content: KNoteComposeContent
  let driver: KNoteComposeDriver
  let actions: KNoteComposeActions
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var taps = 0

  var body: some View {
    HStack(spacing: 14) {
      plus
      mood
      seal
    }
    .frame(minHeight: 44)
    .disabled(content.busy || content.sealed)
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
    .sensoryFeedback(.impact(weight: .light), trigger: taps)
  }

  private var plus: some View {
    let open = content.panel == .plus
    return SwiftUI.Button {
      taps += 1
      driver.blurAll()
      actions.onPanel(.plus)
    } label: {
      KNotePath(d: "M12 5v14M5 12h14")
        .stroke(theme.ink, style: StrokeStyle(lineWidth: 1.9 * 22 / 24, lineCap: .round))
        .frame(width: 22, height: 22)
        .rotationEffect(.degrees(open ? 45 : 0))
        .animation(reduceMotion ? nil : .timingCurve(0.3, 1.3, 0.4, 1, duration: 0.3), value: open)
        .frame(width: 28, height: 44)
        .contentShape(Rectangle().inset(by: -8))
    }
    .buttonStyle(KAsIsButtonStyle())
    .accessibilityLabel(open ? content.strings.closeLabel : content.strings.plusLabel)
    .accessibilityAddTraits(open ? .isSelected : [])
  }

  private var mood: some View {
    let chosen = content.mood
    let fill = chosen?.group.mood.fill
    return SwiftUI.Button {
      taps += 1
      driver.blurAll()
      actions.onPanel(.mood)
    } label: {
      ZStack {
        if let chosen {
          Capsule().fill(chosen.group.mood.fill)
          Capsule().strokeBorder(fill ?? .clear, lineWidth: 1.8)
          KNoteFace(group: chosen.group, artKey: chosen.artKey, path: chosen.path, size: 20, stroke: 2)
        } else {
          Capsule().strokeBorder(theme.faint, style: StrokeStyle(lineWidth: 1.8, dash: [4, 3]))
          KNoteEmptyFace(color: theme.mute)
            .frame(width: 20, height: 20)
        }
      }
      // 7 in, a 1.8 edge, the face 20
      .frame(width: 20 + 2 * (7 + 1.8), height: 36)
      .animation(.easeOut(duration: 0.25), value: chosen)
      .frame(height: 44)
      .contentShape(Rectangle().inset(by: -4))
    }
    .buttonStyle(KAsIsButtonStyle())
    .accessibilityLabel(chosen == nil ? content.strings.moodEmptyLabel : content.moodLabel)
    .accessibilityAddTraits(content.panel == .mood ? .isSelected : [])
  }

  private var seal: some View {
    let live = content.hasSomething && !content.busy
    let ink = live ? theme.bg : theme.faint
    return SwiftUI.Button {
      driver.blurAll()
      actions.onSeal(driver.body.text)
    } label: {
      HStack(spacing: 8) {
        Text(content.busy ? content.strings.sealingLabel : content.strings.sealLabel)
          .kText(.mono(12, .medium, tracking: 0.06))
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          // the words swap at once: crossfaded under the capsule's colour change, "Seal it here"
          // and "Sealing…" stood on top of each other for a moment (seen on a recording, 2026-10-26)
          .contentTransition(.identity)
        KNotePadlock(filled: false, color: ink)
          .frame(width: 15, height: 15)
      }
      .foregroundStyle(ink)
      .padding(.horizontal, 14)
      .frame(maxWidth: .infinity, minHeight: 36)
      .background {
        Capsule().fill(live ? theme.ink : theme.sf)
      }
      .overlay {
        Capsule().strokeBorder(live ? theme.ink : theme.line, lineWidth: 1.8)
      }
      .animation(.easeOut(duration: 0.3), value: live)
      .frame(minHeight: 44)
      .contentShape(Rectangle())
    }
    .buttonStyle(KAsIsButtonStyle())
    .disabled(!live)
    .accessibilityLabel(content.busy ? content.strings.sealingLabel : content.strings.sealLabel)
    .accessibilityHint(live && content.needsMood ? content.strings.sealHint : "")
  }
}

// MARK: - the panels

/// The soft ground every panel stands on: a 1.5 line along its top.
private struct KNotePanelGround<Content: View>: View {
  let theme: KTheme
  @ViewBuilder let content: Content

  var body: some View {
    content
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
      .background(theme.soft)
      .overlay(alignment: .top) {
        Rectangle().fill(theme.line).frame(height: 1.5)
      }
  }
}

/// ＋'s panel: Photo, Video, Audio.
struct KNotePlusPanel: View {
  let theme: KTheme
  let cards: [KNoteMediaCard]
  let onCard: (KNoteMediaKind) -> Void

  var body: some View {
    KNotePanelGround(theme: theme) {
      HStack(spacing: 12) {
        ForEach(cards) { card in
          cardView(card)
        }
      }
      .padding(.top, 22)
      .padding(.horizontal, 24)
      .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
    }
  }

  private func colours(_ kind: KNoteMediaKind) -> KMood {
    switch kind {
    case .photo: return .calm
    case .video: return .low
    case .voice: return .tired
    }
  }

  private func icon(_ kind: KNoteMediaKind) -> String {
    switch kind {
    case .photo: return "M3 5h18v14H3z M3 15l5-5 4 4 3-3 6 6 M16 9h.01"
    case .video: return "M3 7h13v10H3z M16 10l5-3v10l-5-3"
    case .voice: return "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z M5 11a7 7 0 0 0 14 0 M12 18v3"
    }
  }

  private func cardView(_ card: KNoteMediaCard) -> some View {
    let mood = colours(card.kind)
    return SwiftUI.Button {
      onCard(card.kind)
    } label: {
      VStack(spacing: 8) {
        KNotePath(d: icon(card.kind))
          .stroke(mood.ink, style: StrokeStyle(lineWidth: 1.9 * 26 / 24, lineCap: .round, lineJoin: .round))
          .frame(width: 26, height: 26)
        Text(card.label)
          .kText(.system(15, .semibold))
          .foregroundStyle(mood.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.75)
      }
      .padding(.horizontal, 6)
      .frame(maxWidth: .infinity, minHeight: 92)
      .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(mood.fill))
      .contentShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
    .buttonStyle(KFadePressStyle())
    .disabled(!card.enabled)
    .opacity(card.enabled ? 1 : 0.4)
    .accessibilityLabel(card.label)
    .accessibilityValue(card.enabled ? "" : card.accessibilityValue)
  }
}

/// The mood panel: the four groups, then the open group's faces.
struct KNoteMoodPanel: View {
  let theme: KTheme
  let content: KNoteComposeContent
  let actions: KNoteComposeActions

  private var open: KNoteMoodGroup? {
    content.groups.first { $0.group == content.openGroup } ?? content.groups.first
  }

  var body: some View {
    KNotePanelGround(theme: theme) {
      VStack(spacing: 22) {
        HStack(spacing: 10) {
          ForEach(content.groups) { g in
            groupCard(g)
          }
        }
        if let open {
          ScrollView {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 5), alignment: .center, spacing: 14) {
              ForEach(open.faces) { face in
                faceTile(face, group: open.group)
              }
            }
            // room for the rings (they reach 4 outside a tile)
            .padding(.vertical, 4)
            .padding(.bottom, 12)
          }
          .scrollIndicators(.hidden)
          .id(open.id)
          .transition(.opacity)
        }
      }
      .padding(.top, 18)
      .padding(.horizontal, 16)
      .animation(.easeOut(duration: 0.2), value: content.openGroup)
      .dynamicTypeSize(...DynamicTypeSize.xxLarge)
    }
  }

  private func groupCard(_ g: KNoteMoodGroup) -> some View {
    let on = content.chosenGroup == g.group
    let mood = g.group.mood
    let shape = RoundedRectangle(cornerRadius: 20, style: .continuous)
    return SwiftUI.Button {
      actions.onPickGroup(g.group)
    } label: {
      VStack(spacing: 4) {
        KNoteFace(group: g.group, artKey: g.group.iconKey, path: "", size: 26, stroke: 2)
        Text(g.name)
          .kText(.system(15, .semibold))
          .foregroundStyle(mood.faceInk)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
      }
      .padding(.horizontal, 4)
      .frame(maxWidth: .infinity, minHeight: 74)
      .background(shape.fill(mood.fill))
      // the chosen group, flat (rule B): a 2 ring inside in the group's own deep colour
      .overlay {
        if on { shape.strokeBorder(mood.ink, lineWidth: 2) }
      }
      .contentShape(shape)
    }
    .buttonStyle(KFadePressStyle())
    .sensoryFeedback(.selection, trigger: on)
    .accessibilityLabel(g.name)
    .accessibilityAddTraits(on ? .isSelected : [])
  }

  private func faceTile(_ face: KNoteMoodFace, group: KMoodGroup) -> some View {
    let on = content.chosenFace == face.id
    let mood = group.mood
    return SwiftUI.Button {
      actions.onPickFace(face.id)
    } label: {
      VStack(spacing: 8) {
        KNoteFace(group: group, artKey: face.artKey, path: face.path, size: 26, stroke: 2)
          .frame(width: 54, height: 54)
          .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(mood.fill))
          // the chosen face: 2 in the panel's face colour, then 2 in the group's deep colour
          .background {
            if on {
              ZStack {
                RoundedRectangle(cornerRadius: 20, style: .continuous).fill(mood.ink).padding(-4)
                RoundedRectangle(cornerRadius: 18, style: .continuous).fill(theme.sf).padding(-2)
              }
            }
          }
        Text(face.name)
          .kText(.mono(9, .medium, tracking: 0.14))
          .foregroundStyle(theme.sub)
          .multilineTextAlignment(.center)
          .lineLimit(2)
          .minimumScaleFactor(0.8)
          .fixedSize(horizontal: false, vertical: true)
      }
      .frame(maxWidth: .infinity)
      .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityLabel(face.accessibilityLabel)
    .accessibilityAddTraits(on ? .isSelected : [])
  }
}

// MARK: - pieces

/// A mood face: the art for its key, else a path face, else the group's icon, else the group's
/// 10a line face (KMoodChip's chain), in the group's face ink.
struct KNoteFace: View {
  let group: KMoodGroup
  let artKey: String
  let path: String
  let size: CGFloat
  /// the stroke on the 24 grid
  let stroke: CGFloat

  var body: some View {
    let ink = group.mood.faceInk
    let scale = stroke / KMoodArt.masterStroke
    if let art = KMoodArt(key: artKey, size: size, ink: ink, strokeScale: scale) {
      art
    } else if !path.isEmpty {
      KNotePath(d: path)
        .stroke(ink, style: StrokeStyle(lineWidth: stroke * size / 24, lineCap: .round, lineJoin: .round))
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    } else if let art = KMoodArt(key: group.iconKey, size: size, ink: ink, strokeScale: scale) {
      art
    } else {
      KLineIcon(group.face, size: size, lineWidth: stroke, color: ink)
        .accessibilityHidden(true)
    }
  }
}

/// The empty capsule's face: a dashed circle and two eyes (1.8 on the 24 grid).
private struct KNoteEmptyFace: View {
  let color: Color

  var body: some View {
    GeometryReader { geo in
      let u = min(geo.size.width, geo.size.height) / 24
      ZStack {
        Circle()
          .stroke(color, style: StrokeStyle(lineWidth: 1.8 * u, dash: [2.4 * u, 2.4 * u]))
          .frame(width: 17 * u, height: 17 * u)
        KNotePath(d: "M9 10h.01M15 10h.01")
          .stroke(color, style: StrokeStyle(lineWidth: 1.8 * u, lineCap: .round))
      }
      .frame(width: geo.size.width, height: geo.size.height)
    }
    .accessibilityHidden(true)
  }
}

/// The padlock: filled (the head's, the design's solid glyph) or drawn in line (the seal key's),
/// on the 24 grid.
struct KNotePadlock: View {
  let filled: Bool
  let color: Color

  var body: some View {
    Group {
      if filled {
        KNotePath(d: "M7 10V8a5 5 0 0 1 10 0v2h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zm2 0h6V8a3 3 0 0 0-6 0z")
          .fill(color, style: FillStyle(eoFill: true))
      } else {
        GeometryReader { geo in
          let u = min(geo.size.width, geo.size.height) / 24
          KNotePath(d: "M7 10h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z M8 10V7a4 4 0 0 1 8 0v3")
            .stroke(color, style: StrokeStyle(lineWidth: 2 * u, lineCap: .round, lineJoin: .round))
        }
      }
    }
    .accessibilityHidden(true)
  }
}

/// A photo or the film's poster, 88 × 88 with corners of 12. A photo opens its frame (TS); the
/// film carries its ✕.
private struct KNoteThumbTile: View {
  let theme: KTheme
  let thumb: KNoteThumb
  let removeLabel: String
  let onTap: () -> Void
  let onRemove: () -> Void

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: 12, style: .continuous)
    let picture = KImage(thumb.image, size: CGSize(width: 88, height: 88), contentMode: .fill, placeholder: theme.soft2)
      .frame(width: 88, height: 88)
      .clipShape(shape)
    if thumb.kind == .photo {
      SwiftUI.Button(action: onTap) {
        picture.contentShape(shape)
      }
      .buttonStyle(KFadePressStyle())
      .accessibilityLabel(thumb.accessibilityLabel)
      .accessibilityHint(thumb.accessibilityHint)
    } else {
      picture
        .overlay {
          // the film: a play mark on its poster
          Circle().fill(Color.black.opacity(0.45)).frame(width: 30, height: 30)
            .overlay {
              KNotePath(d: "M9 7l8 5-8 5z").fill(Color.white).frame(width: 14, height: 14)
            }
            .accessibilityHidden(true)
        }
        .overlay(alignment: .topTrailing) {
          KNoteRemoveDisc(label: removeLabel, action: onRemove)
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(thumb.accessibilityLabel)
    }
  }
}

/// A 22 dark disc with a white ✕, 44 to touch: takes the film off the page.
private struct KNoteRemoveDisc: View {
  let label: String
  let action: () -> Void

  var body: some View {
    SwiftUI.Button(action: action) {
      Circle()
        .fill(Color.black.opacity(0.55))
        .frame(width: 22, height: 22)
        .overlay {
          KLineIcon(.close, size: 10, lineWidth: 2.6, color: .white)
        }
        .frame(width: 44, height: 44)
        .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .padding(-8)
    .accessibilityLabel(label)
  }
}

/// Path data on the 24 grid, scaled into its frame.
struct KNotePath: Shape {
  let d: String

  func path(in rect: CGRect) -> Path {
    let s = min(rect.width, rect.height) / 24
    let place = CGAffineTransform(a: s, b: 0, c: 0, d: s, tx: rect.midX - 12 * s, ty: rect.midY - 12 * s)
    return KSVGPath.path(d).applying(place)
  }
}

// MARK: - the seal moment

/// THE SEAL MOMENT (owner, 2026-10-26, option A of three: "the mood is the seal"). Over the page's
/// own ground, in about two seconds:
/// - the page becomes a card (sf with a line hairline, corners of 14, rule B's hard shadow), at
///   most 280 wide and 160 tall, rising to the middle at .85, its words as four faint lines (.38s,
///   cubic-bezier(.3,1,.3,1)) — a note, not the whole page (the full width read as a flat bar);
/// - it folds in half: the top half swings down over the bottom one about the middle (.36s);
/// - the mood's face drops onto the folded note as a seal (46 round: the mood's fill, a 3 ring
///   of the page ground, the face 26 in its ink, the object's shadow), squashing as it lands,
///   with a medium impact; the note gives 3pt under it;
/// - the line ("KEPT · OCT 26", mono 9 at .16em, mute) comes up 18 below;
/// - after a breath, the note, its seal and the line go down 210 and to .4 as they fade (.42s,
///   an ease-in), and onEnd.
/// Reduce Motion: the sealed note and the line are simply there, then fade; VoiceOver hears the
/// spoken line once the seal is down. Nothing here can be touched.
struct KNoteSealMoment: View {
  let theme: KTheme
  let mood: KNoteChosenMood?
  let line: String
  let spoken: String
  let onEnd: () -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var step = Step.page
  @State private var sealedBeat = false

  enum Step: Int, Comparable {
    case page, card, folded, sealed, away
    static func < (a: Step, b: Step) -> Bool { a.rawValue < b.rawValue }
  }

  /// the card before it folds
  static let cardWidth: CGFloat = 280
  static let cardHeight: CGFloat = 160
  static let seal: CGFloat = 46

  var body: some View {
    GeometryReader { geo in
      // a note, not the whole page: at most 280 wide (238 once it has drawn back to .85)
      let width = min(geo.size.width - 36, Self.cardWidth)
      let folded = step >= .folded
      ZStack {
        VStack(spacing: 18) {
          note(width: width)
          Text(line)
            .kText(.mono(9, .medium, tracking: 0.16))
            .foregroundStyle(theme.mute)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .opacity(step >= .sealed ? 1 : 0)
            .offset(y: step >= .sealed ? 0 : 4)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.26).delay(0.12), value: step)
        }
        .scaleEffect(step == .away ? 0.4 : 1)
        .offset(y: step == .away ? 210 : 0)
        .opacity(step == .away ? 0 : 1)
        // the card rises from where the words were (a little above the middle, at full width);
        // folded, only its bottom half shows, so it moves up a quarter to stay in the middle
        .offset(y: step == .page ? -geo.size.height * 0.18 : (folded ? -Self.cardHeight / 4 : 0))
        .frame(maxWidth: .infinity, maxHeight: .infinity)
      }
    }
    .ignoresSafeArea()
    .allowsHitTesting(true)
    .contentShape(Rectangle())
    .sensoryFeedback(.impact(weight: .medium), trigger: sealedBeat)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(spoken)
    .task { await play() }
  }

  /// The card, folding; the seal on it once it has.
  private func note(width: CGFloat) -> some View {
    let half = Self.cardHeight / 2
    let folded = step >= .folded
    let shape = RoundedRectangle(cornerRadius: 14, style: .continuous)
    return ZStack(alignment: .top) {
      // the bottom half, with the last two lines of the words
      VStack(alignment: .leading, spacing: 9) {
        bar(0.86)
        bar(0.54)
      }
      .padding(.horizontal, 16)
      .padding(.top, 14)
      .frame(width: width, height: half, alignment: .topLeading)
      .background(shape.fill(theme.sf))
      // a hairline so the paper reads on a page of its own colour (rule B: no ink edge)
      .overlay(shape.strokeBorder(theme.line, lineWidth: 1))
      .kObjectDepth(shape, theme: theme)
      .offset(y: half)
      // the top half, swinging down over it about the fold
      VStack(alignment: .leading, spacing: 9) {
        bar(0.92)
        bar(0.78)
      }
      .padding(.horizontal, 16)
      .padding(.top, 16)
      .frame(width: width, height: half, alignment: .topLeading)
      .background(shape.fill(theme.sf))
      .overlay {
        // the outside of the fold is plain paper: the lines go as it turns past upright
        shape.fill(theme.sf).opacity(folded ? 1 : 0)
      }
      .overlay(shape.strokeBorder(theme.line, lineWidth: 1))
      .rotation3DEffect(.degrees(folded ? -180 : 0), axis: (x: 1, y: 0, z: 0), anchor: .bottom, perspective: 0.5)
      // the seal on the folded note
      if step >= .sealed || reduceMotion && folded {
        sealView
          .offset(y: half + half / 2 - (Self.seal + 6) / 2)
          .transition(reduceMotion ? .opacity : .asymmetric(insertion: .modifier(active: KSealDrop(on: false), identity: KSealDrop(on: true)), removal: .identity))
      }
    }
    .frame(width: width, height: Self.cardHeight, alignment: .top)
    .scaleEffect(step == .page ? 1 : 0.85)
    .opacity(step == .page ? 0 : 1)
    // the note gives a little under the seal
    .offset(y: sealedBeat ? 3 : 0)
    .animation(.spring(response: 0.16, dampingFraction: 0.5), value: sealedBeat)
  }

  private var sealView: some View {
    ZStack {
      Circle().fill(mood?.group.mood.fill ?? theme.lav2)
      if let mood {
        KNoteFace(group: mood.group, artKey: mood.artKey, path: mood.path, size: 26, stroke: 2)
      } else {
        KNotePadlock(filled: false, color: theme.ink)
          .frame(width: 20, height: 20)
      }
    }
    .frame(width: Self.seal, height: Self.seal)
    .padding(3)
    .background(Circle().fill(theme.bg))
    .kObjectDepth(Circle(), theme: theme, offset: 3)
  }

  private func bar(_ fraction: CGFloat) -> some View {
    GeometryReader { g in
      Capsule().fill(theme.line).frame(width: g.size.width * fraction, height: 4)
    }
    .frame(height: 4)
  }

  private func play() async {
    if reduceMotion {
      withAnimation(.easeOut(duration: 0.2)) { step = .folded }
      step = .sealed
      AccessibilityNotification.Announcement(spoken).post()
      try? await Task.sleep(for: .milliseconds(1100))
      withAnimation(.easeOut(duration: 0.25)) { step = .away }
      try? await Task.sleep(for: .milliseconds(280))
      onEnd()
      return
    }
    try? await Task.sleep(for: .milliseconds(160))
    withAnimation(.timingCurve(0.3, 1, 0.3, 1, duration: 0.38)) { step = .card }
    try? await Task.sleep(for: .milliseconds(400))
    withAnimation(.timingCurve(0.5, 0, 0.3, 1, duration: 0.36)) { step = .folded }
    try? await Task.sleep(for: .milliseconds(380))
    withAnimation(.timingCurve(0.5, 0, 0.6, 1.4, duration: 0.3)) { step = .sealed }
    try? await Task.sleep(for: .milliseconds(230))
    sealedBeat = true
    AccessibilityNotification.Announcement(spoken).post()
    try? await Task.sleep(for: .milliseconds(160))
    sealedBeat = false
    try? await Task.sleep(for: .milliseconds(620))
    withAnimation(.timingCurve(0.6, 0, 0.8, 0.6, duration: 0.42)) { step = .away }
    try? await Task.sleep(for: .milliseconds(440))
    onEnd()
  }
}

/// The seal coming down onto the note: from 40 above at 1.7 and clear, to its place.
private struct KSealDrop: ViewModifier {
  let on: Bool
  func body(content: Content) -> some View {
    content
      .scaleEffect(on ? 1 : 1.7)
      .offset(y: on ? 0 : -40)
      .opacity(on ? 1 : 0)
  }
}
