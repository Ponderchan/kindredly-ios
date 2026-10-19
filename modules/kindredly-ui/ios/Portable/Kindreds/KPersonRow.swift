// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 ONE PERSON IN A LIST: a Kindreds row (a kindred, a pen pal, Wren's desk), and later anywhere a
 list of people is drawn. The owner kept the current sizes (2026-10-15; foundation batch 1:
 "keep all current row sizes, take only the colours from 10a"):

   [face 52] 14 [ name 17/600 ink · progress mono 11 sub ............ time 13 mute ]
                [ TAG  TAG  You: their last words, two lines at 15/20 in sub  | badge ]
                ───────────────────────────── 1pt line under the words (H:65) ──

 - The row sits 22 in from the edges (H:63-65), on the page colour, so the copy iOS lifts into
   its long-press menu isn't see-through (.kMenu preview .rect).
 - name: dim rows (a quiet room, a closed account) draw it in sub. A pen pal with the identity
   switch on is their courier name, with the ♀/♂ mark 6pt after it and the star sign 4pt after
   that (KWhoMarks: ink glyphs in sub, at 14 beside the 17pt name), when TS sends them.
 - was: for fourteen days after the switch, a pen pal from before it says "was No. 4481" on the
   second line, after the tags and before the words, in mute (TS words it and decides when).
 - progress: a pen pal's "2/5", letters each way (the five-each rule); "" for none.
 - time: always mute (the owner keeps blue for the kindred number and YOUR TURN); "" hides it.
 - tags lead the preview, each in its own tone (ind YOUR TURN, mute THEIR TURN, brass SWAP
   NAMES? / THEY WENT FIRST (wax gold on Midnight), postal red CLOSES IN n DAYS), then
   youPrefix ("You: ") in ink, then the words. Every string arrives translated and cased.
 - trailing: the badge (ind with the page colour on it, 20 high, "9+") or a link-coloured word
   ("Rekindle ›") that is NOT a button: a tap anywhere on the row opens it.
 - dim: the face at .45 (a quiet room, a closed account).
 - Press: a row with a menu doesn't fade (iOS's own press and lift show, owner 10-11); a row
   without one fades to .6. A long press never also opens the row.
 - VoiceOver: one button with the label TS built, and the menu's items as its actions.
 - Accessibility text sizes: the name may take two lines and the progress and time go to their
   own line under it, so neither squeezes the name to "N…" (spec sim check: rows readable at
   AX3-AX5). The standard sizes keep the one line drawn above.

 Faces are drawn by KFace (52, round): a portrait or snapshot, a mosaic inked in the theme's ink
 (or ind), the veil, or the soft2 placeholder while a picture is on its way. With the identity
 switch on a pen pal is their frosted window instead (KFrost, 52 SQUARE with corners of 13: a
 stranger is a square, a kindred a circle), and a closed account the flat veil tile.
 Wren's official bird is the one face drawn here instead (.bird): her transparent snapshot at 62% on a soft2 disc, as
 OfficialBird (WrenDesk.tsx) draws her in the React Native list and H:65 shows, never stretched
 over the whole circle as a portrait would be.
 */

/// A tag ahead of the preview.
public struct KRowTag: Hashable, Sendable {
  public enum Tone: String, Sendable {
    /// the theme's ind: YOUR TURN
    case ind
    /// the theme's mute: THEIR TURN, YOU WENT FIRST
    case mute
    /// postmark red (KBrand.postRed): CLOSES IN n DAYS
    case post
    /// the seal's brass (KBrand.brassSeal): SWAP NAMES?, THEY WENT FIRST. Wax gold on Midnight,
    /// as the profile's mark and the compose count switch brass on dark: brass on Midnight's page
    /// is 4.47:1, under the 4.5 a 12pt tag needs, and wax gold is 8.59:1
    case brass
  }

  public let text: String
  public let tone: Tone

  public init(text: String, tone: Tone) {
    self.text = text
    self.tone = tone
  }

  func color(_ theme: KTheme) -> Color {
    switch tone {
    case .ind: return theme.ind
    case .mute: return theme.mute
    case .post: return KBrand.postRed
    case .brass: return theme.isDark ? KBrand.waxGold : KBrand.brassSeal
    }
  }
}

/// What a row's face shows, before the theme is applied (so rows convert once per data change,
/// not once per theme).
public enum KPersonFace: Equatable, Sendable {
  /// a portrait, photo or snapshot; nil while it is on its way (the placeholder)
  case image(KImageRef?, overscan: CGFloat)
  /// a pen pal's FACE v1 mask; `turn` inks it in ind instead of ink
  case mosaic(mask: Int, turn: Bool)
  /// a pen pal with the identity switch on: their frosted window (square)
  case frost(KFrostSpec)
  /// a deleted account
  case veil
  /// a deleted account with the identity switch on: the flat veil tile (square)
  case frostVeil
  case placeholder
  /// Wren's official bird: a transparent snapshot set at 62% on a soft2 disc (nil: the disc alone
  /// while it is on its way). KPersonRow draws it (KPersonBirdFace); KFace has no such source.
  case bird(KImageRef?)

  func source(_ theme: KTheme) -> KFaceSource {
    switch self {
    case let .image(ref, overscan): return .image(ref, overscan: overscan)
    case let .mosaic(mask, turn): return .mosaic(mask: mask, tint: turn ? theme.ind : theme.ink)
    case let .frost(spec): return .frost(spec)
    case .veil: return .veil
    case .frostVeil: return .frostVeil
    case .placeholder, .bird: return .placeholder
    }
  }
}

/// Wren's face in a list (OfficialBird, WrenDesk.tsx): a soft2 disc with her bird at 62% across
/// it, the official mark at the bottom right as KFace sets it, the whole face at .45 when dim.
struct KPersonBirdFace: View {
  /// OfficialBird: WrenBird size = round(size * 0.62)
  static let birdRatio: CGFloat = 0.62

  let theme: KTheme
  let bird: KImageRef?
  let size: CGFloat
  let dim: Bool
  let badge: Bool

  var body: some View {
    let side = (size * Self.birdRatio).rounded()
    ZStack {
      Circle().fill(theme.soft2)
      KImage(bird, size: CGSize(width: side, height: side), contentMode: .fit, placeholder: .clear)
    }
    .frame(width: size, height: size)
    .compositingGroup()
    .opacity(dim ? 0.45 : 1)
    .overlay(alignment: .bottomTrailing) {
      if badge {
        KOfficialBadge(theme: theme, size: KFace.badgeSize(for: size), ground: theme.bg)
          .offset(x: 1, y: 1)
      }
    }
    .accessibilityHidden(true)
  }
}

/// One row's content, every word already from TS.
public struct KPersonRowModel: Identifiable, Equatable, Sendable {
  public let id: String
  public let face: KPersonFace
  /// the official mark on the face (Wren)
  public let faceBadge: Bool
  public let name: String
  /// the she/he mark after a pen pal's name (identity switch on); nil for none
  public let mark: KLineGlyph?
  /// the star sign after the mark; nil for none
  public let sign: KLineGlyph?
  /// "was No. 4481" on the second line (fourteen days after the switch); "" for none
  public let was: String
  /// the name in sub (a closed account)
  public let nameDim: Bool
  /// "2/5"; "" for none
  public let progress: String
  /// "" hides it
  public let time: String
  public let tags: [KRowTag]
  /// "You: " when the last word was yours; ""
  public let youPrefix: String
  public let preview: String
  /// "3", "9+"; "" for none
  public let badge: String
  /// "Rekindle ›"; "" for none (shown only without a badge)
  public let trailingLink: String
  /// the face at .45
  public let dim: Bool
  /// a member's stamp around the face (C2); nil for none (never Wren)
  public let stamp: KMemberStamp?
  public let a11yLabel: String
  /// the long-press menu; [] for none
  public let actions: [KMenuItem]

  public init(
    id: String,
    face: KPersonFace,
    faceBadge: Bool = false,
    name: String,
    mark: KLineGlyph? = nil,
    sign: KLineGlyph? = nil,
    was: String = "",
    nameDim: Bool = false,
    progress: String = "",
    time: String = "",
    tags: [KRowTag] = [],
    youPrefix: String = "",
    preview: String = "",
    badge: String = "",
    trailingLink: String = "",
    dim: Bool = false,
    stamp: KMemberStamp? = nil,
    a11yLabel: String,
    actions: [KMenuItem] = []
  ) {
    self.id = id
    self.face = face
    self.faceBadge = faceBadge
    self.name = name
    self.mark = mark
    self.sign = sign
    self.was = was
    self.nameDim = nameDim
    self.progress = progress
    self.time = time
    self.tags = tags
    self.youPrefix = youPrefix
    self.preview = preview
    self.badge = badge
    self.trailingLink = trailingLink
    self.dim = dim
    self.stamp = stamp
    self.a11yLabel = a11yLabel
    self.actions = actions
  }
}

public struct KPersonRow: View, Equatable {
  /// the owner's sizes (ChatRowStyle / components/10a kit ROW_METRICS)
  public static let face: CGFloat = 52
  public static let gap: CGFloat = 14
  public static let inset: CGFloat = 22
  static let name = KTextStyle.system(17, .semibold)
  /// the mark and the sign beside the 17pt name (KWhoMarks)
  static let markSize: CGFloat = 14
  static let time = KTextStyle.system(13)
  static let progress = KTextStyle.mono(11, .medium)
  static let preview = KTextStyle.system(15, lineHeight: 20.0 / 15.0)
  static let link = KTextStyle.system(13, .semibold)

  private let theme: KTheme
  private let row: KPersonRowModel
  private let onTap: () -> Void
  private let onAction: (String) -> Void

  /// the tags' size (12 at the default text size), scaled like the preview around them
  @ScaledMetric(relativeTo: .caption) private var tagSize: CGFloat = 12
  @ScaledMetric(relativeTo: .caption) private var badgeText: CGFloat = 12
  /// accessibility sizes stack the name over its progress and time
  @Environment(\.dynamicTypeSize) private var typeSize

  /// - Parameters:
  ///   - onTap: the row was tapped (never after a long press)
  ///   - onAction: a menu item (or its VoiceOver action) was chosen, with its key
  public init(theme: KTheme, row: KPersonRowModel, onTap: @escaping () -> Void, onAction: @escaping (String) -> Void = { _ in }) {
    self.theme = theme
    self.row = row
    self.onTap = onTap
    self.onAction = onAction
  }

  /// Rows compare by what they draw; the closures come from one long-lived actions object.
  public static func == (a: KPersonRow, b: KPersonRow) -> Bool {
    a.theme == b.theme && a.row == b.row
  }

  public var body: some View {
    SwiftUI.Button(action: onTap) {
      HStack(alignment: .center, spacing: Self.gap) {
        face
        words
      }
      .padding(.horizontal, Self.inset)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(theme.bg)
      .contentShape(Rectangle())
    }
    .buttonStyle(KRowPressStyle(fades: row.actions.isEmpty))
    // the button is the one element; its label is TS's sentence, not the parts drawn
    .accessibilityLabel(row.a11yLabel)
    .kMenu(row.actions, preview: .rect, onAction: onAction)
  }

  @ViewBuilder
  private var face: some View {
    if case let .bird(ref) = row.face {
      KPersonBirdFace(theme: theme, bird: ref, size: Self.face, dim: row.dim, badge: row.faceBadge)
    } else {
      KFace(theme: theme, source: row.face.source(theme), size: Self.face, dim: row.dim, badge: row.faceBadge, stamp: row.stamp)
    }
  }

  private var nameText: some View {
    Text(row.name)
      .kText(Self.name)
      .foregroundStyle(row.nameDim ? theme.sub : theme.ink)
  }

  private var marks: KWhoMarks {
    KWhoMarks(mark: row.mark, sign: row.sign, size: Self.markSize, color: theme.sub)
  }

  private var progressText: some View {
    Text(row.progress)
      .kText(Self.progress)
      .foregroundStyle(theme.sub)
  }

  private var timeText: some View {
    Text(row.time)
      .kText(Self.time)
      .foregroundStyle(theme.mute)
  }

  /// The name, a pen pal's n/5 and the time: one line at the standard sizes; at accessibility
  /// sizes the name gets the whole width (two lines) and the other two a line of their own.
  @ViewBuilder
  private var header: some View {
    if typeSize.isAccessibilitySize {
      VStack(alignment: .leading, spacing: 2) {
        HStack(alignment: .firstTextBaseline, spacing: 0) {
          nameText
            .lineLimit(2)
            .fixedSize(horizontal: false, vertical: true)
          marks
        }
        if !row.progress.isEmpty || !row.time.isEmpty {
          HStack(alignment: .firstTextBaseline, spacing: 8) {
            if !row.progress.isEmpty {
              progressText.lineLimit(1).fixedSize()
            }
            if !row.time.isEmpty {
              timeText.lineLimit(1)
            }
          }
        }
      }
    } else {
      HStack(alignment: .firstTextBaseline, spacing: 8) {
        // the mark and the sign stay with the name (a long name gives way, never the glyphs)
        HStack(alignment: .firstTextBaseline, spacing: 0) {
          nameText
            .lineLimit(1)
          marks
        }
        .layoutPriority(1)
        if !row.progress.isEmpty {
          progressText
            .lineLimit(1)
            .fixedSize()
        }
        Spacer(minLength: 0)
        if !row.time.isEmpty {
          timeText
            .lineLimit(1)
            .fixedSize()
        }
      }
    }
  }

  private var words: some View {
    VStack(alignment: .leading, spacing: 3) {
      header
      HStack(alignment: .top, spacing: 8) {
        previewText
          .kText(Self.preview)
          .foregroundStyle(theme.sub)
          .lineLimit(2)
          .multilineTextAlignment(.leading)
          .frame(maxWidth: .infinity, alignment: .leading)
        trailing
      }
    }
    .padding(.vertical, 12)
    .frame(maxWidth: .infinity, alignment: .leading)
    // the hairline under the words, from where they start (H:65)
    .overlay(alignment: .bottom) {
      Rectangle().fill(theme.line).frame(height: 1)
    }
  }

  /// The tags, "was No. 4481", "You: " and the words as one run of text, each part in its own colour.
  private var previewText: Text {
    var text = Text(verbatim: "")
    for tag in row.tags {
      text = text + Text(verbatim: tag.text + "  ")
        .font(.system(size: tagSize, weight: .semibold))
        .tracking(0.3)
        .foregroundColor(tag.color(theme))
    }
    if !row.was.isEmpty {
      // "was No. 4481": the number they wore before the courier named them, quiet
      text = text + Text(verbatim: row.was + "  ").foregroundColor(theme.mute)
    }
    if !row.youPrefix.isEmpty {
      text = text + Text(verbatim: row.youPrefix).foregroundColor(theme.ink)
    }
    return text + Text(verbatim: row.preview)
  }

  @ViewBuilder
  private var trailing: some View {
    if !row.badge.isEmpty {
      Text(verbatim: row.badge)
        .font(.system(size: badgeText, weight: .semibold))
        .foregroundStyle(theme.bg)
        .lineLimit(1)
        .padding(.horizontal, 6)
        .frame(minWidth: 20, minHeight: 20)
        .background(Capsule().fill(theme.ind))
        .fixedSize()
        .padding(.top, 2)
    } else if !row.trailingLink.isEmpty {
      Text(row.trailingLink)
        .kText(Self.link)
        .foregroundStyle(theme.ind)
        .lineLimit(1)
        .fixedSize()
        .padding(.top, 2)
    }
  }
}

/// A row's press: no fade for a row with a long-press menu (the system's own press and lift
/// show instead), the list's .6 fade for one without.
struct KRowPressStyle: ButtonStyle {
  let fades: Bool

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .opacity(fades && configuration.isPressed ? 0.6 : 1)
      .animation(KMotion.press, value: configuration.isPressed)
  }
}
