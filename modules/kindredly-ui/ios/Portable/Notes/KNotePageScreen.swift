// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 ONE JOURNAL PAGE (/journal/[id], opened from a Notes card), in SwiftUI (2026-10-27). The React
 Native page (src/app/journal/[id].tsx) stays as the "noteentry" switch's fallback; this draws the
 same page from what TS hands it (src/screens/note-page: the reads, the cover, tearing a page out,
 letting it drift and the lightbox stay in TS).

   ‹                                         ⋯     the back chevron (KBackChevron) and iOS's own
                                                   pull-down menu from the ⋯ (an SF Symbol 19 in a
                                                   42 box, 20 from the right): Let This Drift Out
                                                   (a real words-only page), Edit (a real page:
                                                   owner's audit, 2026-11-10; TS opens the composer
                                                   holding this page), Delete (destructive)
                     [☺ 52]                        the mood on its group's tile (52, corners 16,
               ▢ WED, OCT 14 · SLEEPY              face 32 at 1.75), the date line under it in SF
                                                   Mono 500 11 in sub, after a small calendar glyph
   ┌──────────────┬──────┬──────┐                  the pictures (a photo page): one fills the width
   │              │      │      │                  at 4:5; more are the cover big on the left and
   │    cover     ├──────┼──────┤                  the next four in a 2×2 (250 tall), then rows of
   │              │      │      │                  three squares, 2 apart, square corners. Tap: the
   └──────────────┴──────┴──────┘                  lightbox (TS); hold: make it the cover (TS)
   Tap to view · Hold to make it the cover         System 12 in mute (a real page, two or more)
   [ the voice card ]  or  [ the film ]            React Native islands (AudioCard, the player)
   The words, in the reader's Letter font: 20 on 34 for a page of words alone, 16.5 on 27 under
   media, ink.
   ──────────────────────────────────────          a 1pt rule, then ONE LINE IS OUT IN THE WORLD
   ONE LINE IS OUT IN THE WORLD                    (SF Mono 10 in ind) over the line itself on the
   the line, on the pale highlight                 pale highlight (#F6E7A6, its ink fixed: it is
   Tomorrow it might be the first thing…           pale in every theme), and System 12 in mute

 No header rule (10a's sub-pages have none); the page is the theme's, and the mood, the pictures
 and the highlight keep their own colours: they are content. Still reading: the chevron alone.
 Read and not there: "This page isn't here any more." 120 down, System 15 in sub.

 Every word is TS's. VoiceOver: each picture is a button ("Photo 2 of 5", opening it), with "Make
 It the Cover" as an action where a hold would make it the cover; escape goes back.
 */

/// What the page is showing.
public enum KNotePageState: String, Sendable {
  /// the first read hasn't answered: the chevron alone
  case loading
  case ready
  /// read, and not there (torn out elsewhere, or a journal that couldn't be read)
  case missing
}

/// One picture of the gallery, in drawing order (the cover first).
public struct KNotePagePhoto: Identifiable, Equatable, Sendable {
  public let id: String
  /// its place in the page's album: what a tap or a hold reports
  public let index: Int
  public let image: KImageRef?
  /// "Photo 2 of 5" ("…, the cover" for the first of two or more)
  public let accessibilityLabel: String

  public init(id: String, index: Int, image: KImageRef?, accessibilityLabel: String) {
    self.id = id
    self.index = index
    self.image = image
    self.accessibilityLabel = accessibilityLabel
  }
}

/// Every word of the page.
public struct KNotePageStrings: Equatable, Sendable {
  public var backLabel = ""
  /// VoiceOver: the ⋯
  public var moreLabel = ""
  public var driftLabel = ""
  /// the menu's Edit, above Delete
  public var editLabel = ""
  public var deleteLabel = ""
  /// the date, the mood's name, " · SAMPLE", in capitals as TS sends them
  public var dateLine = ""
  public var notFound = ""
  public var oneLineOut = ""
  public var tomorrowStranger = ""
  /// under the pictures on a real page with two or more
  public var coverHint = ""
  /// VoiceOver's hint on a picture ("Opens the photo")
  public var photoHint = ""
  /// VoiceOver's action on a picture that can become the cover
  public var makeCover = ""

  public init() {}
}

/// Everything the page draws (the caller's props).
public struct KNotePageContent: Equatable, Sendable {
  public var strings = KNotePageStrings()
  public var state: KNotePageState = .loading
  public var kind: KNoteKind = .text
  public var group: KMoodGroup = .calm
  /// the mood icon's art key ("mood-sleepy", "mood-group-low"); "" draws the group's icon
  public var icon = ""
  public var body = ""
  /// a page of words alone: the larger type
  public var pure = false
  /// the line that left; "" for none
  public var drifted = ""
  /// the menu offers Let This Drift Out
  public var canDrift = false
  /// the menu offers Edit (a real page whose composer can change it)
  public var canEdit = false
  /// in drawing order, the cover first
  public var photos: [KNotePagePhoto] = []
  /// a hold makes a picture the cover (a real page)
  public var canSetCover = false
  /// the cover hint shows
  public var coverHint = false
  /// the voice island is placed
  public var voice = false
  /// the film island is placed
  public var film = false

  public init() {}
}

/// What the page tells its owner. One object for the life of the page; set the closures once.
public final class KNotePageActions {
  public var onBack: () -> Void = {}
  public var onDrift: () -> Void = {}
  /// Edit in the menu (TS opens the composer holding this page)
  public var onEdit: () -> Void = {}
  /// Delete in the menu (TS asks first)
  public var onDelete: () -> Void = {}
  /// a picture tapped: its index in the album
  public var onPhoto: (Int) -> Void = { _ in }
  /// a picture held: make it the cover (its index in the album)
  public var onCover: (Int) -> Void = { _ in }

  public init() {}
}

public struct KNotePageScreen<Voice: View, Film: View>: View {
  /// the mood at the page's head: 52, corners 16, face 32 at 1.75 (the composer's key that chose it)
  static var moodMetrics: KMoodChip.Metrics { KMoodChip.Metrics(size: 52, cornerRadius: 16, faceSize: 32, faceStroke: 1.75) }
  /// the drift highlight and the ink on it, the same in every theme
  static var highlight: Color { Color(hex: "#F6E7A6") }
  static var onHighlight: Color { KBrand.inkOnBrand }

  private let theme: KTheme
  private let content: KNotePageContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let actions: KNotePageActions
  private let voice: Voice
  private let film: Film

  public init(
    theme: KTheme,
    content: KNotePageContent,
    topInset: CGFloat,
    bottomInset: CGFloat,
    actions: KNotePageActions,
    @ViewBuilder voice: () -> Voice,
    @ViewBuilder film: () -> Film
  ) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
    self.voice = voice()
    self.film = film()
  }

  public var body: some View {
    VStack(spacing: 0) {
      Color.clear.frame(height: topInset)
      header
      switch content.state {
      case .ready:
        page
      case .missing:
        Text(content.strings.notFound)
          .kText(.system(15, lineHeight: 22.0 / 15.0))
          .foregroundStyle(theme.sub)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
          .padding(.horizontal, 40)
          .padding(.top, 120)
          .frame(maxWidth: .infinity)
        Spacer(minLength: 0)
      case .loading:
        Spacer(minLength: 0)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .background { theme.bg.ignoresSafeArea() }
    .accessibilityElement(children: .contain)
    .accessibilityAction(.escape) { actions.onBack() }
  }

  // ── the head: ‹ and ⋯ (no rule under it) ──

  private var header: some View {
    HStack(spacing: 0) {
      KBackChevron(theme: theme, label: content.strings.backLabel, action: actions.onBack)
        .padding(.leading, KBackChevron.leading)
      Spacer(minLength: 0)
      // samples get the menu too: hiding it read as "delete is missing", not "this is a sample"
      if content.state == .ready {
        menu
          .padding(.trailing, 20)
      }
    }
    // the row in the first 44 of a 52 bar, where every sub-page puts it
    .frame(height: 44)
    .frame(height: KBackBar<EmptyView>.stickyHeight, alignment: .top)
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
  }

  /// iOS's own pull-down menu, dropping from the ⋯ (owner, 2026-10-20: the Report menu's kind)
  private var menu: some View {
    SwiftUI.Menu {
      if content.canDrift {
        SwiftUI.Button(action: actions.onDrift) {
          Label(content.strings.driftLabel, systemImage: "paperplane")
        }
      }
      // above Delete; never without its word (a bundle from before the audit sends none)
      if content.canEdit && !content.strings.editLabel.isEmpty {
        SwiftUI.Button(action: actions.onEdit) {
          Label(content.strings.editLabel, systemImage: "pencil")
        }
      }
      SwiftUI.Button(role: .destructive, action: actions.onDelete) {
        Label(content.strings.deleteLabel, systemImage: "trash")
      }
    } label: {
      Image(systemName: "ellipsis")
        .font(.system(size: 19))
        .foregroundStyle(theme.ink)
        .frame(width: 42, height: 42)
        .contentShape(Rectangle())
    }
    .menuIndicator(.hidden)
    .menuOrder(.fixed)
    .accessibilityLabel(content.strings.moreLabel)
  }

  // ── the page ──

  private var page: some View {
    ScrollView(.vertical) {
      VStack(alignment: .leading, spacing: 0) {
        moodHead
          .frame(maxWidth: .infinity)
          .padding(.top, 4)
          .padding(.bottom, 24)

        if content.kind == .photo && !content.photos.isEmpty {
          KNotePageGallery(theme: theme, content: content, actions: actions)
            .padding(.bottom, 18)
        }
        if content.voice {
          voice
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.bottom, 18)
        }
        if content.film {
          // the player carries its own 18 below it (DetailVideo, shared with the React Native page)
          film
            .frame(maxWidth: .infinity, alignment: .leading)
        }

        if !content.body.isEmpty {
          Text(content.body)
            .kText(content.pure ? .content(20, lineHeight: 34.0 / 20.0) : .content(16.5, lineHeight: 27.0 / 16.5))
            .foregroundStyle(theme.ink)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
        }

        if !content.drifted.isEmpty {
          drifted
            .padding(.top, 28)
        }
      }
      .padding(.horizontal, 22)
      .padding(.top, 6)
    }
    .scrollIndicators(.hidden)
    .contentMargins(.bottom, bottomInset + 40, for: .scrollContent)
  }

  /// the mood leads, the date under it, both centred
  private var moodHead: some View {
    VStack(spacing: 10) {
      KMoodChip(group: content.group, icon: content.icon, metrics: Self.moodMetrics)
      HStack(alignment: .center, spacing: 6) {
        KNoteCalendarGlyph(color: theme.sub)
        Text(content.strings.dateLine)
          .kText(.mono(11, .medium, tracking: 0.8 / 11))
          .foregroundStyle(theme.sub)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
      }
      .accessibilityElement(children: .combine)
    }
  }

  /// the line that left, on its highlight
  private var drifted: some View {
    VStack(alignment: .leading, spacing: 0) {
      Rectangle()
        .fill(theme.ln)
        .frame(height: 1)
        .accessibilityHidden(true)
      Text(content.strings.oneLineOut)
        .kText(.mono(10, .medium, tracking: 0.14))
        .foregroundStyle(theme.ind)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 14)
      Text(content.drifted)
        .kText(.content(15.5, lineHeight: 24.0 / 15.5))
        .foregroundStyle(Self.onHighlight)
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Self.highlight)
        .padding(.top, 10)
      Text(content.strings.tomorrowStranger)
        .kText(.system(12, lineHeight: 17.0 / 12.0))
        .foregroundStyle(theme.mute)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 10)
    }
  }
}

// MARK: - the pictures

/// All the pictures at once (Apple Journal's detail page): one at 4:5, or the cover big on the
/// left with the next four in a 2×2 (250 tall), then rows of three squares; 2 apart, square corners.
struct KNotePageGallery: View {
  static let gap: CGFloat = 2
  static let bandHeight: CGFloat = 250

  let theme: KTheme
  let content: KNotePageContent
  let actions: KNotePageActions

  private var photos: [KNotePagePhoto] { content.photos }

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      if photos.count == 1, let only = photos.first {
        Color.clear
          .frame(maxWidth: .infinity)
          .aspectRatio(4.0 / 5.0, contentMode: .fit)
          .overlay {
            GeometryReader { geo in
              cell(only, place: 0, size: geo.size)
            }
          }
      } else {
        band
        if photos.count > 5 {
          rest
            .padding(.top, Self.gap)
        }
      }
      if content.coverHint {
        Text(content.strings.coverHint)
          .kText(.system(12))
          .foregroundStyle(theme.mute)
          .fixedSize(horizontal: false, vertical: true)
          .padding(.top, 8)
      }
    }
  }

  /// the cover on the left, the next four in a 2×2 (an empty place stays empty)
  private var band: some View {
    Color.clear
      .frame(maxWidth: .infinity)
      .frame(height: Self.bandHeight)
      .overlay(alignment: .topLeading) {
        GeometryReader { geo in
          let g = Self.gap
          let half = (geo.size.width - g) / 2
          let small = (half - g) / 2
          let row = (geo.size.height - g) / 2
          let spots: [CGPoint] = [
            CGPoint(x: half + g, y: 0),
            CGPoint(x: half + g + small + g, y: 0),
            CGPoint(x: half + g, y: row + g),
            CGPoint(x: half + g + small + g, y: row + g),
          ]
          ZStack(alignment: .topLeading) {
            cell(photos[0], place: 0, size: CGSize(width: half, height: geo.size.height))
            ForEach(1..<min(5, photos.count), id: \.self) { k in
              cell(photos[k], place: k, size: CGSize(width: small, height: row))
                .offset(x: spots[k - 1].x, y: spots[k - 1].y)
            }
          }
        }
      }
  }

  /// everything after the first five, three to a row
  private var rest: some View {
    let after = Array(photos.dropFirst(5).enumerated())
    let rows = stride(from: 0, to: after.count, by: 3).map { Array(after[$0..<min($0 + 3, after.count)]) }
    return VStack(spacing: Self.gap) {
      ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
        HStack(spacing: Self.gap) {
          ForEach(0..<3, id: \.self) { j in
            if j < row.count {
              let item = row[j]
              Color.clear
                .aspectRatio(1, contentMode: .fit)
                .overlay {
                  GeometryReader { geo in
                    cell(item.element, place: item.offset + 5, size: geo.size)
                  }
                }
            } else {
              Color.clear.aspectRatio(1, contentMode: .fit)
            }
          }
        }
      }
    }
  }

  /// One picture: a tap opens it, a hold makes it the cover (a real page, not the cover already).
  /// `place` is its place in the drawing order (0 is the cover).
  private func cell(_ photo: KNotePagePhoto, place: Int, size: CGSize) -> some View {
    let holdable = content.canSetCover && place > 0
    return KImage(photo.image, size: size, contentMode: .fill, placeholder: theme.soft2)
      .contentShape(Rectangle())
      .onTapGesture { actions.onPhoto(photo.index) }
      .onLongPressGesture(minimumDuration: 0.35) {
        if holdable { actions.onCover(photo.index) }
      }
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(photo.accessibilityLabel)
      .accessibilityHint(content.strings.photoHint)
      .accessibilityAddTraits(.isButton)
      .accessibilityAction { actions.onPhoto(photo.index) }
      .accessibilityActions {
        if holdable {
          SwiftUI.Button(content.strings.makeCover) { actions.onCover(photo.index) }
        }
      }
  }
}

// MARK: - pieces

/// A small monochrome calendar, 13 square (the 📅 emoji bakes in a wrong date): a 1.4 frame, two
/// rings on top and a bar across the middle.
struct KNoteCalendarGlyph: View {
  let color: Color

  var body: some View {
    ZStack {
      Rectangle().strokeBorder(color, lineWidth: 1.4)
      RoundedRectangle(cornerRadius: 1, style: .circular).fill(color).frame(width: 6, height: 1.4)
    }
    .frame(width: 13, height: 13)
    .overlay(alignment: .topLeading) {
      RoundedRectangle(cornerRadius: 1, style: .circular).fill(color).frame(width: 1.5, height: 3)
        .offset(x: 2.5, y: -2.5)
    }
    .overlay(alignment: .topTrailing) {
      RoundedRectangle(cornerRadius: 1, style: .circular).fill(color).frame(width: 1.5, height: 3)
        .offset(x: -2.5, y: -2.5)
    }
    .accessibilityHidden(true)
  }
}
