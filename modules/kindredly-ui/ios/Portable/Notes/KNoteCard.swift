// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 ONE NOTE (10a, H:55 and H:344-345), in the three layouts the Notes header's button cycles. Card
 and Grid are the owner's card layouts of 2026-10-18 (SealedTile.tsx, the React Native twin, draws
 the same):

   Card   ┌─────────────────────────────────────────┐   one column
          │ [☺] OCT 16 · 08:12                    ▭ │   the head row: mood square 36, the date and
          │ Sunday, finally.                        │   time, the kind's icon alone (16, mute)
          │ ┌──────────────┬──────┐                 │   then the body, always in this order:
          │ │              ├──────┤                 │   the words, the voice bar, the pictures
          │ └──────────────┴──────┘                 │   (or a video's frame)
          └─────────────────────────────────────────┘
   Grid   two to a row, equal heights; chip 28, "OCT 14" only (owner question 9) and the type icon,
          then the same body at Grid's sizes: the words at 15 in five lines, the pictures at 0.6 of
          the height (five and more as the 2×2), a video's frame 132
   List   a row: chip 28 · "OCT 14 · Sleepy" · the one line · the type icon (the label, capped,
          truncates before the line does; stacked at accessibility sizes — KNoteListRow)

 THE PAPER. One for every note: the theme's card face, a 1.5 outline in the soft line colour (not
 the ink: a diary has one weight and doesn't compete with the letter cards; List's rows wear it
 too, owner 2026-10-18), no shadow, corners 22 (16 in List), padding 14 16 16 (Grid 12 12 14), 12
 between the parts (Grid 10).

 THE WORDS come in TS's three sizes (notes-model textTier, weighed the composer's way, CJK as two):
 a short line (up to 40) at 24 on 31, 41 to 140 at 17 on 24.5, longer at 15 on 22.5 cut to six lines (the card opens
 the page for the rest). All in the reader's Letter font, the face every page of content is in
 (owner, 2026-10-20; it had been the system face since 2026-10-18); in a roomier face (SF Mono,
 Garamond) the six lines and Grid's five or six get one more, so what fits in Newsreader isn't cut.
 A voice note's own words sit above its bar, where the mock puts a
 transcript (the app has no transcription).

 THE PICTURES (notes-model photoTiles; KNotePhotos): never a 3×3, at most four tiles 4 apart in a
 block with corners of 14, each filled and cropped; the first picture is always the big tile (owner,
 2026-10-18). One: a tile 220 tall. Two: side by side, 160. Three: the big tile on the left (2fr)
 over both rows, two small on the right, 220. Four: a 2×2, 220. Five and more: the big tile over
 three rows and three small, 240, the last under the dark ink at .55 with "+N" (the pictures past
 the four shown) in SF Mono 600 15, white. A video is one tile at the one-picture size with its
 frame, the play disc and its length.

 THE VOICE BAR (KNoteVoiceBar): 48 tall on soft, corners 14: the ink play disc (32, the page
 colour's triangle, two bars while it plays), 44 bars 2.5 wide and 2 apart, 4 to 13 tall from the
 note's seed (noteBar: the same numbers as TS's notes-model noteBar), ink at .55 and full ink for
 the part played, and the length in SF Mono 500 11, the time left while it plays. The whole bar is
 a button that plays in place; the rest of the card opens the note. Swift never plays audio: the
 screen's one player is TS's, which reports only its transitions (KNotesDriver.playback); the bars
 and the time move on locally in a TimelineView in between.

 TAPS. The card is a plain view with a tap that opens the note — not a Button, because a voice note
 holds a real button of its own (the bar), and a button inside a button fights over the touch.
 VoiceOver hears the card as one button with TS's whole label, opening on a double tap, and Play /
 Pause as a named action on a voice note (the bar itself is hidden from it).

 THE HEAD ROW is the mood square, the label and the kind's icon, right-aligned: 16 in mute on a
 Card (the owner took the words "TEXT", "3 PHOTOS" off it on 2026-10-18; a new Notes icon set is
 to come), 18 in ind in Grid and List.

 Every word is TS's (screens/notes/notes-model): the labels, the one line ("Voice note ·
 0:35" on a voice note with no words), the length, the VoiceOver label.

 PICTURES come through KImage (KImageStore in the app: ImageIO downsampling to each tile's pixels,
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
    case .text: return .noteText
    case .photo: return .notePhoto
    case .voice: return .noteVoice
    case .video: return .noteVideo
    }
  }
}

/// The words' size on a card (TS notes-model textTier). The raw value is TS's.
public enum KNoteTextTier: String, Sendable {
  /// no words
  case empty = "none"
  /// up to 40: a line at 24
  case short
  /// 41 to 140: the system face at 17
  case mid
  /// more: 15, cut to six lines
  case long
}

/// The three ways the notes lie (the header's button cycles them). The raw value is TS's.
public enum KNoteLayout: String, CaseIterable, Sendable {
  case card
  case grid
  case list

  /// The view button's icon (H:346).
  public var glyph: KLineGlyph {
    switch self {
    case .card: return .noteCard
    case .grid: return .noteGrid
    case .list: return .noteList
    }
  }
}

/// One note, every word already built by TS.
public struct KNote: Identifiable, Equatable, Sendable {
  public let id: String
  public let kind: KNoteKind
  public let group: KMoodGroup
  /// the mood icon's art key (src/data/moods.ts moodArtKey): "mood-sleepy", "mood-group-low" for a
  /// page that chose only a group; "" draws the group's icon (KMoodChip)
  public let icon: String
  /// Card's head row: "OCT 16 · 08:12" (the mood square says the mood)
  public let label: String
  /// the words' size
  public let textTier: KNoteTextTier
  /// Grid and the date chip: "OCT 14"
  public let shortLabel: String
  /// List: "OCT 14 · Sleepy"
  public let listLabel: String
  public let body: String
  /// List's one line: the first line of the words, or what the note holds
  public let listLine: String
  /// a photo note's cover, the detail page's choice (the cards draw `photos`)
  public let photo: KImageRef?
  /// the pictures a card shows: the first four in the order taken, the first the big tile (nil for
  /// one whose file is gone: its tile stays, empty)
  public let photos: [KImageRef?]
  /// how many pictures the note holds (KNotePhotos picks the layout from it)
  public let photoCount: Int
  /// the +N on the last tile: the pictures past the four shown (5 → +1, 9 → +5); 0 under five
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

  public init(id: String, kind: KNoteKind, group: KMoodGroup, icon: String = "", label: String, textTier: KNoteTextTier, shortLabel: String, listLabel: String, body: String, listLine: String, photo: KImageRef?, photos: [KImageRef?] = [], photoCount: Int = 0, photoMore: Int, video: KImageRef?, duration: String, playable: Bool, waveSeed: UInt32, a11yLabel: String) {
    self.id = id
    self.kind = kind
    self.group = group
    self.icon = icon
    self.label = label
    self.textTier = textTier
    self.shortLabel = shortLabel
    self.listLabel = listLabel
    self.body = body
    self.listLine = listLine
    self.photo = photo
    self.photos = photos
    self.photoCount = max(0, photoCount)
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

  /// The words as a card shows them (TS draws body.trim()).
  var words: String { body.trimmingCharacters(in: .whitespacesAndNewlines) }

  /// Grid's lines for the words (owner, 2026-10-20): five, six when the words are mostly Chinese,
  /// Japanese or Korean (a line of them holds less of a thought than a line of Latin letters).
  var gridLines: Int {
    var cjk = 0
    var letters = 0
    for u in words.unicodeScalars where !u.properties.isWhitespace {
      letters += 1
      if u.value >= 0x2E80 { cjk += 1 }
    }
    return letters > 0 && cjk * 2 >= letters ? 6 : 5
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
  /// Grid's and List's date: mono 600 11 at .12em
  static let label = KTextStyle.mono(11, .semibold, tracking: 0.12)
  /// Card's date: mono 500 11 at .1em
  static let cardLabel = KTextStyle.mono(11, .medium, tracking: 0.1)
  /// the words, in the Letter font: short, mid, long; Grid and List at 15
  static let shortBody = KTextStyle.content(24, lineHeight: 31.0 / 24.0)
  static let midBody = KTextStyle.content(17, lineHeight: 24.5 / 17.0)
  static let smallBody = KTextStyle.content(15, lineHeight: 1.5)

  let theme: KTheme
  let note: KNote
  let layout: KNoteLayout
  let playLabel: String
  let pauseLabel: String
  let driver: KNotesDriver
  let actions: KNotesActions
  /// the Letter face the words are in (their lineLimit makes room for a roomy one)
  @Environment(\.kLetterFace) private var face

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
      // React Native counts the 1.5 outline inside the card's padding box
      .padding(padding)
      .padding(1.5)
      // its own height everywhere: Grid is a waterfall, nothing stretches a card to a neighbour's
      .frame(maxWidth: .infinity, alignment: .topLeading)
      .background { shape.fill(theme.sf) }
      // one weight for the whole diary: the soft line on Card, Grid and List (owner, 2026-10-18)
      .overlay { shape.strokeBorder(theme.line, lineWidth: 1.5) }
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
      KNoteListRow(theme: theme, note: note)
    case .card, .grid:
      VStack(alignment: .leading, spacing: layout == .grid ? 10 : 12) {
        head
        // the body, top to bottom: the words, the voice bar, the pictures (or a video's frame)
        if note.textTier != .empty && !note.words.isEmpty {
          words
        }
        if voice {
          KNoteVoiceBar(theme: theme, note: note, driver: driver) { actions.onToggleVoice(note.id) }
        }
        media
      }
    }
  }

  /// the mood square, the date, and the kind's icon (Card: 16 in mute; Grid: 18 in ind)
  private var head: some View {
    HStack(alignment: .center, spacing: 10) {
      KMoodChip(group: note.group, icon: note.icon, metrics: layout == .grid ? .compact : .card)
      if layout == .grid {
        Text(note.shortLabel)
          .kText(Self.label)
          .foregroundStyle(theme.sub)
          .lineLimit(1)
          .truncationMode(.tail)
        Spacer(minLength: 0)
        KLineIcon(note.kind.glyph, size: 18, lineWidth: 2, color: theme.ind)
      } else {
        Text(note.label)
          .kText(Self.cardLabel)
          .foregroundStyle(theme.sub)
          .lineLimit(1)
          .truncationMode(.tail)
          .frame(maxWidth: .infinity, alignment: .leading)
        KLineIcon(note.kind.glyph, size: 16, lineWidth: 2, color: theme.mute)
      }
    }
  }

  /// The words in their size (see THE WORDS); Grid keeps 15 in five lines.
  @ViewBuilder
  private var words: some View {
    let text = Text(note.words)
    Group {
      if layout == .grid {
        text
          .kText(Self.smallBody)
          .lineLimit(face.fitLines(note.gridLines))
      } else {
        switch note.textTier {
        case .short:
          text.kText(Self.shortBody)
        case .mid:
          text.kText(Self.midBody)
        case .long, .empty:
          text
            .kText(Self.smallBody)
            .lineLimit(face.fitLines(6))
        }
      }
    }
    .foregroundStyle(theme.ink)
    .truncationMode(.tail)
    .multilineTextAlignment(.leading)
    .fixedSize(horizontal: false, vertical: true)
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  @ViewBuilder
  private var media: some View {
    switch note.kind {
    case .photo:
      if !note.photos.isEmpty, let block = KNotePhotos.Block(count: note.photoCount, grid: layout == .grid) {
        KNotePhotos(theme: theme, photos: note.photos, more: note.photoMore, block: block)
      }
    case .video:
      if let video = note.video {
        KNotePicture(theme: theme, ref: video, height: layout == .grid ? 132 : 220, badge: note.duration, playMark: true)
      }
    case .voice, .text:
      EmptyView()
    }
  }
}

/// The picture block (see THE PICTURES): the tiles laid out the way TS's photoTiles and the
/// prototype's CSS grid lay them (columns 2fr 1fr, rows of equal height, 4 apart), each tile
/// filled and cropped at its own size.
struct KNotePhotos: View {
  /// the dark ink over the last tile, and +N on it
  static let moreFill = KBrand.inkOnBrand.opacity(0.55)
  static let moreText = KTextStyle.mono(15, .semibold)
  static let gap: CGFloat = 4

  /// TS's photoTiles: the tier (5 is the big tile and three small) and the block's height.
  struct Block: Equatable {
    let tier: Int
    let height: CGFloat

    /// nil for no pictures; Grid scales every height by 0.6 and draws five and more as the 2×2
    init?(count n: Int, grid: Bool) {
      guard n > 0 else { return nil }
      tier = n >= 5 ? (grid ? 4 : 5) : n
      let base: CGFloat = tier == 2 ? 160 : tier == 5 ? 240 : 220
      height = grid ? (base * 0.6).rounded() : base
    }
  }

  let theme: KTheme
  let photos: [KImageRef?]
  let more: Int
  let block: Block

  var body: some View {
    Color.clear
      .frame(maxWidth: .infinity)
      .frame(height: block.height)
      .overlay(alignment: .topLeading) {
        GeometryReader { geo in
          let rects = Self.rects(tier: block.tier, size: geo.size)
          ForEach(Array(rects.enumerated()), id: \.offset) { index, rect in
            tile(index, size: rect.size, more: index == rects.count - 1 ? more : 0)
              .offset(x: rect.minX, y: rect.minY)
          }
        }
      }
      .clipShape(RoundedRectangle(cornerRadius: 14, style: .circular))
      .accessibilityHidden(true)
  }

  private func tile(_ index: Int, size: CGSize, more: Int) -> some View {
    let ref = index < photos.count ? photos[index] : nil
    return KImage(ref, size: size, placeholder: theme.soft2)
      .frame(width: size.width, height: size.height)
      .clipped()
      .overlay {
        if more > 0 {
          ZStack {
            Self.moreFill
            Text(verbatim: "+\(more)")
              .kText(Self.moreText)
              .foregroundStyle(KBrand.paperWhite)
              .lineLimit(1)
          }
        }
      }
  }

  /// Each tile's frame in a block of `size`: 1 one; 2 two columns; 3 the big tile (2fr) over two
  /// rows and two small (1fr); 4 a 2×2; 5 the big tile over three rows and three small.
  static func rects(tier: Int, size: CGSize) -> [CGRect] {
    let w = size.width, h = size.height, g = gap
    let half = (w - g) / 2
    let big = (w - g) * 2 / 3, small = (w - g) / 3
    switch tier {
    case 1:
      return [CGRect(x: 0, y: 0, width: w, height: h)]
    case 2:
      return [CGRect(x: 0, y: 0, width: half, height: h), CGRect(x: half + g, y: 0, width: half, height: h)]
    case 3:
      let row = (h - g) / 2
      return [
        CGRect(x: 0, y: 0, width: big, height: h),
        CGRect(x: big + g, y: 0, width: small, height: row),
        CGRect(x: big + g, y: row + g, width: small, height: row),
      ]
    case 4:
      let row = (h - g) / 2
      return [
        CGRect(x: 0, y: 0, width: half, height: row),
        CGRect(x: half + g, y: 0, width: half, height: row),
        CGRect(x: 0, y: row + g, width: half, height: row),
        CGRect(x: half + g, y: row + g, width: half, height: row),
      ]
    default:
      let row = (h - 2 * g) / 3
      return [
        CGRect(x: 0, y: 0, width: big, height: h),
        CGRect(x: big + g, y: 0, width: small, height: row),
        CGRect(x: big + g, y: row + g, width: small, height: row),
        CGRect(x: big + g, y: 2 * (row + g), width: small, height: row),
      ]
    }
  }
}

/// List's row: the chip, "OCT 14 · Sleepy", the one line, the type icon. The label gives way before
/// the words: it is capped at `labelMax` (150 at the default text size, growing with it), and the
/// line keeps at least `lineMin` — so the label truncates first, and a long mood name in another
/// language ("14 DE OUT. · De coração partido" on an iPhone SE) still leaves some of the note's
/// words. The chip and label keep the layout priority, so they are offered their capped width first
/// against the line's reserved minimum (were the line given the priority, its infinite frame would
/// take everything and cut the label to "O…"; with no priority at all, the label would be offered
/// half and truncate even in English). The cap is KCapWidth, not frame(maxWidth:), which would take
/// the whole proposal up to the cap and leave a short label a wide empty box. At accessibility text
/// sizes the row stacks: the chip, the label and the icon above, the one line under them.
/// SealedTile (the React Native twin) lays it out the same way.
struct KNoteListRow: View {
  /// the label's widest at the default text size
  static let labelMaxBase: CGFloat = 150
  /// the narrowest the one line may get
  static let lineMin: CGFloat = 64

  let theme: KTheme
  let note: KNote

  @ScaledMetric(relativeTo: .caption2) private var labelMax: CGFloat = KNoteListRow.labelMaxBase
  @Environment(\.dynamicTypeSize) private var typeSize

  var body: some View {
    if typeSize.isAccessibilitySize {
      VStack(alignment: .leading, spacing: 8) {
        HStack(alignment: .center, spacing: 10) {
          KMoodChip(group: note.group, icon: note.icon, metrics: .compact)
          label
          Spacer(minLength: 0)
          icon
        }
        line
          .frame(maxWidth: .infinity, alignment: .leading)
      }
    } else {
      HStack(alignment: .center, spacing: 12) {
        HStack(alignment: .center, spacing: 10) {
          KMoodChip(group: note.group, icon: note.icon, metrics: .compact)
          KCapWidth(max: labelMax) { label }
        }
        .layoutPriority(1)
        line
          .frame(minWidth: Self.lineMin, maxWidth: .infinity, alignment: .leading)
        icon
      }
    }
  }

  private var label: some View {
    Text(note.listLabel)
      .kText(KNoteCard.label)
      .foregroundStyle(theme.sub)
      .lineLimit(1)
      .truncationMode(.tail)
  }

  private var line: some View {
    Text(note.listLine)
      .kText(KNoteCard.smallBody)
      .foregroundStyle(theme.ink)
      .lineLimit(1)
      .truncationMode(.tail)
  }

  private var icon: some View {
    KLineIcon(note.kind.glyph, size: 18, lineWidth: 2, color: theme.ind)
  }
}

/// Proposes at most `max` wide to its one child and takes the child's own size: a cap that, unlike
/// frame(maxWidth:), doesn't widen a short child to the cap when more room is offered.
struct KCapWidth: Layout {
  let max: CGFloat

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    guard let child = subviews.first else { return .zero }
    let cap = Swift.max(0, max)
    var size = child.sizeThatFits(ProposedViewSize(width: proposal.width.map { Swift.min($0, cap) }, height: proposal.height))
    if size.width > cap {
      // asked for its ideal and it is wider than the cap: measure it at the cap
      size = child.sizeThatFits(ProposedViewSize(width: cap, height: proposal.height))
      size.width = Swift.min(size.width, cap)
    }
    return size
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    subviews.first?.place(at: bounds.origin, anchor: .topLeading, proposal: ProposedViewSize(width: bounds.width, height: bounds.height))
  }
}

/// A video's frame: full width, `height` tall, corners 14, filled and clipped; the play mark in the
/// middle and its length at the bottom right.
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
      .clipShape(RoundedRectangle(cornerRadius: 14, style: .circular))
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

/// A voice note's bar (see THE VOICE BAR): one button, hidden from VoiceOver (the card carries
/// Play / Pause). Observes the driver, so a playback change redraws only the voice bars.
struct KNoteVoiceBar: View {
  /// the length, and the time left while it plays: mono 500 11 at .08em
  static let timeStyle = KTextStyle.mono(11, .medium, tracking: 0.9 / 11)

  let theme: KTheme
  let note: KNote
  @ObservedObject var driver: KNotesDriver
  let onToggle: () -> Void

  var body: some View {
    let mine = driver.playback?.key == note.id ? driver.playback : nil
    let failed = mine?.failed ?? false
    let playing = (mine?.playback.playing ?? false) && !failed
    SwiftUI.Button(action: onToggle) {
      TimelineView(.animation(minimumInterval: 1.0 / 30, paused: !playing)) { context in
        let playback = failed ? nil : mine?.playback
        let started = playback.map { $0.playing || $0.positionS > 0 } ?? false
        let progress = started ? (playback?.progress(at: context.date) ?? 0) : 0
        HStack(alignment: .center, spacing: 12) {
          KLineIcon(playing ? .pause : .play, size: 14, lineWidth: 0, color: theme.bg)
            .frame(width: 32, height: 32)
            .background(Circle().fill(theme.ink))
          KNoteBars(seed: note.waveSeed, progress: started ? progress : nil, color: theme.ink)
          let time = Self.timeText(note: note, playback: playback, started: started, at: context.date)
          if !time.isEmpty {
            Text(time)
              .kText(Self.timeStyle)
              .foregroundStyle(theme.sub)
              .lineLimit(1)
              .fixedSize()
          }
        }
        .padding(.leading, 8)
        .padding(.trailing, 12)
        .frame(maxWidth: .infinity)
        .frame(height: 48)
        .background(RoundedRectangle(cornerRadius: 14, style: .circular).fill(theme.soft))
        .contentShape(RoundedRectangle(cornerRadius: 14, style: .circular))
      }
    }
    .buttonStyle(KNoteBarPressStyle())
    .accessibilityHidden(true)
  }

  /// The length; the time left while it plays or is paused part-way (TS: fmt(ceil(left))).
  static func timeText(note: KNote, playback: KPlayback?, started: Bool, at now: Date) -> String {
    guard started, let playback, playback.durationS > 0 else { return note.duration }
    return KVoiceCard.clock(max(0, playback.durationS - playback.position(at: now)).rounded(.up))
  }
}

/// React Native's pressed bar: .75 while held.
private struct KNoteBarPressStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label.opacity(configuration.isPressed ? 0.75 : 1)
  }
}

/// The voice bar's 44 seeded bars, drawn in one Canvas: 2.5 wide, 2 apart, from the left, in a strip
/// 22 tall that clips them when it is narrow.
struct KNoteBars: View {
  static let count = 44
  static let width: CGFloat = 2.5
  static let gap: CGFloat = 2

  let seed: UInt32
  /// 0...1 while this note plays or is paused part-way; nil at rest
  let progress: Double?
  let color: Color

  /// Bar `i`'s height (6...34) from the seed: the same arithmetic as TS's notes-model waveHeight
  /// (seed 12345 gives 32, 29, 18, 18, 28).
  static func waveHeight(seed: UInt32, index i: Int) -> Int {
    var x = seed &+ (UInt32(truncatingIfNeeded: i + 1) &* 0x9e37_79b1)
    x = (x ^ (x >> 16)) &* 0x85eb_ca6b
    x = (x ^ (x >> 13)) &* 0xc2b2_ae35
    x = x ^ (x >> 16)
    return 6 + Int(x % 29)
  }

  /// Bar `i`'s height on a card (4...13): TS's notes-model noteBar, waveHeight folded into the
  /// owner's 4–13 (seed 12345 gives 10, 7, 6, 6, 6).
  static func height(seed: UInt32, index i: Int) -> CGFloat {
    CGFloat(4 + (waveHeight(seed: seed, index: i) - 6) % 10)
  }

  var body: some View {
    Canvas { context, size in
      for i in 0..<Self.count {
        let x = CGFloat(i) * (Self.width + Self.gap)
        if x >= size.width { break }
        let h = min(size.height, Self.height(seed: seed, index: i))
        let rect = CGRect(x: x, y: (size.height - h) / 2, width: Self.width, height: h)
        let played = progress.map { Double(i) / Double(Self.count) < $0 } ?? false
        context.fill(Path(roundedRect: rect, cornerRadius: min(2, Self.width / 2), style: .circular), with: .color(color.opacity(played ? 1 : 0.55)))
      }
    }
    .frame(maxWidth: .infinity)
    .frame(height: 22)
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
