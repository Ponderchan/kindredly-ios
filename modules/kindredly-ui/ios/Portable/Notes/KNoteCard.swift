// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 ONE NOTE (10a, H:55 and H:344-345), in the three layouts the Notes header's button cycles:

   Card   ┌─────────────────────────────────────────┐   one column; nothing is clamped
          │ [☺] OCT 14 · 21:37 · Sleepy          ▤  │   the chip 36, the date with the face's name
          │ ┌─────────────────────────────────────┐ │   a photo or a video's frame, 160 tall
          │ └─────────────────────────────────────┘ │   (+N for the rest, the length on a video)
          │ The words, system 17 at 1.5, whole.     │
          └─────────────────────────────────────────┘
   Grid   two to a row, equal heights; chip 28, "OCT 14" only (owner question 9), picture 96, five lines
   List   a row: chip 28 · "OCT 14 · Sleepy" · the one line · the type icon

 Every word is TS's (screens/notes/notes-model): the three labels, the one line ("Voice note · 0:35"
 on a voice note with no words), the length, the VoiceOver label. The material is the theme's card
 face with a 1.5 ln outline and no shadow, corners 22 (16 in List).

 TAPS. The card is a plain view with a tap that opens the note — not a Button, because a voice note
 holds a real button of its own (the small play mark, owner question 10, our own: the mock draws no
 control), and a button inside a button fights over the touch. VoiceOver hears the card as one
 button with TS's whole label, opening on a double tap, and Play / Pause as a named action on a
 voice note (the play mark itself is hidden from it).

 THE VOICE ROW. Bars 4 wide, 3 apart, corners 2, 6-34 tall from the note's seed (waveHeight, the
 same numbers as TS's notes-model waveHeight), as many as fit the width, in a 36 box. At rest they
 are ind at .8; while this note plays (or is paused part-way) the played part is ind and the rest
 .3. Swift never plays audio: the screen's one player is TS's, which reports only its transitions
 (KNotesDriver.playback); the bars move on locally in a TimelineView in between.

 PICTURES come through KImage (KImageStore in the app: ImageIO downsampling to the block's pixels,
 upright camera photos, HEIC named .jpg; a video's frame made by AVAssetImageGenerator from the
 local file). The block keeps its height while they load.

 KNoteCard is Equatable on what it draws, so a screen redraw that changes nothing about a note
 doesn't redraw its card; the driver and the actions are long-lived objects outside that equality.
 */

/// What a note is made of.
public enum KNoteKind: String, Sendable {
  case text
  case photo
  case voice
  case video

  /// The mock's type icon (H:157; video is ours, in the same hand).
  public var glyph: KLineGlyph {
    switch self {
    case .text: return .text
    case .photo: return .photo
    case .voice: return .mic
    case .video: return .video
    }
  }
}

/// The three ways the notes lie (the header's button cycles them). The raw value is TS's.
public enum KNoteLayout: String, CaseIterable, Sendable {
  case card
  case grid
  case list

  /// The view button's icon (H:346).
  public var glyph: KLineGlyph {
    switch self {
    case .card: return .card
    case .grid: return .grid
    case .list: return .list
    }
  }
}

/// One note, every word already built by TS.
public struct KNote: Identifiable, Equatable, Sendable {
  public let id: String
  public let kind: KNoteKind
  public let group: KMoodGroup
  /// Card: "OCT 14 · 21:37 · Sleepy"
  public let label: String
  /// Grid and the date chip: "OCT 14"
  public let shortLabel: String
  /// List: "OCT 14 · Sleepy"
  public let listLabel: String
  public let body: String
  /// List's one line: the first line of the words, or what the note holds
  public let listLine: String
  /// a photo note's cover
  public let photo: KImageRef?
  /// how many more photos than the cover (+N)
  public let photoMore: Int
  /// a video note's frame (a .videoPoster ref to the local file)
  public let video: KImageRef?
  /// "0:35"; "" when there is no length
  public let duration: String
  /// the voice note can be played (TS has its file)
  public let playable: Bool
  public let waveSeed: UInt32
  /// VoiceOver: the long date, the time, the face's name, what it is, the start of the words
  public let a11yLabel: String

  public init(id: String, kind: KNoteKind, group: KMoodGroup, label: String, shortLabel: String, listLabel: String, body: String, listLine: String, photo: KImageRef?, photoMore: Int, video: KImageRef?, duration: String, playable: Bool, waveSeed: UInt32, a11yLabel: String) {
    self.id = id
    self.kind = kind
    self.group = group
    self.label = label
    self.shortLabel = shortLabel
    self.listLabel = listLabel
    self.body = body
    self.listLine = listLine
    self.photo = photo
    self.photoMore = max(0, photoMore)
    self.video = video
    self.duration = duration
    self.playable = playable
    self.waveSeed = waveSeed
    self.a11yLabel = a11yLabel
  }

  /// The date label a layout shows.
  public func label(for layout: KNoteLayout) -> String {
    switch layout {
    case .card: return label
    case .grid: return shortLabel
    case .list: return listLabel
    }
  }
}

/// What the screen's one player is doing with one note, as TS reports it on each transition.
public struct KNotesPlayback: Equatable, Sendable {
  /// the note's id
  public let key: String
  public let playback: KPlayback
  /// it wouldn't load; the next press loads it again
  public let failed: Bool

  public init(key: String, playback: KPlayback, failed: Bool) {
    self.key = key
    self.playback = playback
    self.failed = failed
  }
}

public struct KNoteCard: View, Equatable {
  static let label = KTextStyle.mono(11, .semibold, tracking: 0.12)
  static let cardBody = KTextStyle.system(17, lineHeight: 1.5)
  static let smallBody = KTextStyle.system(15, lineHeight: 1.5)

  let theme: KTheme
  let note: KNote
  let layout: KNoteLayout
  let playLabel: String
  let pauseLabel: String
  let driver: KNotesDriver
  let actions: KNotesActions

  public init(theme: KTheme, note: KNote, layout: KNoteLayout, playLabel: String, pauseLabel: String, driver: KNotesDriver, actions: KNotesActions) {
    self.theme = theme
    self.note = note
    self.layout = layout
    self.playLabel = playLabel
    self.pauseLabel = pauseLabel
    self.driver = driver
    self.actions = actions
  }

  public static func == (a: KNoteCard, b: KNoteCard) -> Bool {
    a.theme == b.theme && a.note == b.note && a.layout == b.layout && a.playLabel == b.playLabel && a.pauseLabel == b.pauseLabel
  }

  private var shape: RoundedRectangle {
    RoundedRectangle(cornerRadius: layout == .list ? 16 : 22, style: .circular)
  }

  /// CSS padding: Card 14 16 16, Grid 12 12 14, List 10 14 10 10 (H:344)
  private var padding: EdgeInsets {
    switch layout {
    case .card: return EdgeInsets(top: 14, leading: 16, bottom: 16, trailing: 16)
    case .grid: return EdgeInsets(top: 12, leading: 12, bottom: 14, trailing: 12)
    case .list: return EdgeInsets(top: 10, leading: 10, bottom: 10, trailing: 14)
    }
  }

  private var voice: Bool { note.kind == .voice && note.playable }

  public var body: some View {
    content
      .padding(padding)
      .frame(maxWidth: .infinity, maxHeight: layout == .grid ? .infinity : nil, alignment: .topLeading)
      .background { shape.fill(theme.sf) }
      .overlay { shape.strokeBorder(theme.ln, lineWidth: 1.5) }
      .contentShape(shape)
      .onTapGesture { actions.onOpen(note.id) }
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(note.a11yLabel)
      .accessibilityAddTraits(.isButton)
      .accessibilityAction { actions.onOpen(note.id) }
      .modifier(KNoteVoiceActions(enabled: voice && layout != .list, id: note.id, playLabel: playLabel, pauseLabel: pauseLabel, driver: driver, actions: actions))
  }

  @ViewBuilder
  private var content: some View {
    switch layout {
    case .list:
      HStack(alignment: .center, spacing: 12) {
        HStack(alignment: .center, spacing: 10) {
          KMoodChip(group: note.group, metrics: .compact)
          labelText
        }
        .layoutPriority(1)
        Text(note.listLine)
          .kText(Self.smallBody)
          .foregroundStyle(theme.ink)
          .lineLimit(1)
          .truncationMode(.tail)
          .frame(maxWidth: .infinity, alignment: .leading)
        KLineIcon(note.kind.glyph, size: 18, lineWidth: 2, color: theme.ind)
      }
    case .card, .grid:
      VStack(alignment: .leading, spacing: layout == .grid ? 10 : 12) {
        HStack(alignment: .center, spacing: 10) {
          KMoodChip(group: note.group, metrics: layout == .grid ? .compact : .card)
          labelText
          Spacer(minLength: 0)
          KLineIcon(note.kind.glyph, size: 18, lineWidth: 2, color: theme.ind)
        }
        media
        if !note.body.isEmpty {
          Text(note.body)
            .kText(layout == .grid ? Self.smallBody : Self.cardBody)
            .foregroundStyle(theme.ink)
            .lineLimit(layout == .grid ? 5 : nil)
            .multilineTextAlignment(.leading)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
      }
    }
  }

  private var labelText: some View {
    Text(note.label(for: layout))
      .kText(Self.label)
      .foregroundStyle(theme.sub)
      .lineLimit(1)
      .truncationMode(.tail)
  }

  @ViewBuilder
  private var media: some View {
    let height: CGFloat = layout == .grid ? 96 : 160
    switch note.kind {
    case .photo:
      if let photo = note.photo {
        KNotePicture(theme: theme, ref: photo, height: height, badge: note.photoMore > 0 ? "+\(note.photoMore)" : "", playMark: false)
      }
    case .video:
      if let video = note.video {
        KNotePicture(theme: theme, ref: video, height: height, badge: note.duration, playMark: true)
      }
    case .voice:
      if note.playable {
        KNoteVoiceRow(theme: theme, note: note, driver: driver) { actions.onToggleVoice(note.id) }
      }
    case .text:
      EmptyView()
    }
  }
}

/// A photo's cover or a video's frame: full width, `height` tall, corners 12, filled and clipped;
/// a badge at the bottom right (+N, a length) and, on a video, the play mark in the middle.
struct KNotePicture: View {
  /// the badges sit on the picture in the same dark ink in every theme
  static let badgeFill = KBrand.inkOnBrand.opacity(0.72)
  static let markFill = KBrand.inkOnBrand.opacity(0.55)
  static let badgeText = KTextStyle.mono(10, .semibold)

  let theme: KTheme
  let ref: KImageRef
  let height: CGFloat
  let badge: String
  let playMark: Bool

  var body: some View {
    Color.clear
      .frame(maxWidth: .infinity)
      .frame(height: height)
      .overlay {
        GeometryReader { geo in
          KImage(ref, size: geo.size, placeholder: theme.soft2)
        }
      }
      .clipShape(RoundedRectangle(cornerRadius: 12, style: .circular))
      .overlay {
        if playMark {
          KLineIcon(.play, size: 14, lineWidth: 0, color: KBrand.paperWhite)
            .frame(width: 34, height: 34)
            .background(Circle().fill(Self.markFill))
        }
      }
      .overlay(alignment: .bottomTrailing) {
        if !badge.isEmpty {
          Text(badge)
            .kText(Self.badgeText)
            .foregroundStyle(KBrand.paperWhite)
            .lineLimit(1)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(RoundedRectangle(cornerRadius: 6, style: .circular).fill(Self.badgeFill))
            .padding(8)
        }
      }
      .accessibilityHidden(true)
  }
}

/// A voice note's row: the small play mark (a real button, hidden from VoiceOver: the card carries
/// Play / Pause), the bars, the length. Observes the driver, so a playback change redraws only the
/// voice rows.
struct KNoteVoiceRow: View {
  let theme: KTheme
  let note: KNote
  @ObservedObject var driver: KNotesDriver
  let onToggle: () -> Void

  /// the mark's 26 disc, inside a 44 target that takes nothing from the row's layout
  static let disc: CGFloat = 26
  static let slop: CGFloat = 9

  var body: some View {
    let mine = driver.playback?.key == note.id ? driver.playback : nil
    let playing = (mine?.playback.playing ?? false) && !(mine?.failed ?? false)
    HStack(alignment: .center, spacing: 12) {
      SwiftUI.Button(action: onToggle) {
        KLineIcon(playing ? .pause : .play, size: 12, lineWidth: 0, color: theme.ind)
          .frame(width: Self.disc, height: Self.disc)
          .background(Circle().fill(theme.lav))
          .padding(Self.slop)
          .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
      .padding(-Self.slop)
      .accessibilityHidden(true)

      TimelineView(.animation(minimumInterval: 1.0 / 30, paused: !playing)) { context in
        let active = mine.map { $0.playback.playing || $0.playback.positionS > 0 } ?? false
        KVoiceWave(seed: note.waveSeed, progress: active ? mine?.playback.progress(at: context.date) : nil, color: theme.ind)
      }

      if !note.duration.isEmpty {
        Text(note.duration)
          .kText(.monoAction)
          .foregroundStyle(theme.sub)
          .lineLimit(1)
          .fixedSize()
      }
    }
  }
}

/// The seeded bars, drawn in one Canvas.
struct KVoiceWave: View {
  let seed: UInt32
  /// 0...1 while this note plays or is paused part-way; nil at rest
  let progress: Double?
  let color: Color

  /// Bar `i`'s height (6...34) from the seed: the same arithmetic as TS's notes-model waveHeight,
  /// so both renderers draw the same bars (seed 12345 gives 32, 29, 18, 18, 28).
  static func height(seed: UInt32, index i: Int) -> CGFloat {
    var x = seed &+ (UInt32(truncatingIfNeeded: i + 1) &* 0x9e37_79b1)
    x = (x ^ (x >> 16)) &* 0x85eb_ca6b
    x = (x ^ (x >> 13)) &* 0xc2b2_ae35
    x = x ^ (x >> 16)
    return 6 + CGFloat(x % 29)
  }

  var body: some View {
    Canvas { context, size in
      let count = max(1, Int((size.width + 3) / 7))
      for i in 0..<count {
        let h = min(size.height, Self.height(seed: seed, index: i))
        let rect = CGRect(x: CGFloat(i) * 7, y: (size.height - h) / 2, width: 4, height: h)
        let opacity: Double
        if let progress {
          opacity = Double(i) / Double(count) < progress ? 1 : 0.3
        } else {
          opacity = 0.8
        }
        context.fill(Path(roundedRect: rect, cornerRadius: 2, style: .circular), with: .color(color.opacity(opacity)))
      }
    }
    .frame(maxWidth: .infinity)
    .frame(height: 36)
    .clipped()
    .accessibilityHidden(true)
  }
}

/// Play / Pause as a named VoiceOver action on a voice note's card, named for what the player is
/// doing now. Only this modifier follows the driver, not the card it sits on.
struct KNoteVoiceActions: ViewModifier {
  let enabled: Bool
  let id: String
  let playLabel: String
  let pauseLabel: String
  @ObservedObject var driver: KNotesDriver
  let actions: KNotesActions

  func body(content: Content) -> some View {
    if enabled {
      let mine = driver.playback?.key == id ? driver.playback : nil
      let playing = (mine?.playback.playing ?? false) && !(mine?.failed ?? false)
      content.accessibilityAction(named: Text(playing ? pauseLabel : playLabel)) {
        actions.onToggleVoice(id)
      }
    } else {
      content
    }
  }
}
