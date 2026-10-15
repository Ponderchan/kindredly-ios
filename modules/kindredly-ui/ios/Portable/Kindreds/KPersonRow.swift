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
 - name: dim rows (a closed account) draw it in sub.
 - progress: a pen pal's "2/5", letters each way (the five-each rule); "" for none.
 - time: always mute (the owner keeps blue for the kindred number and YOUR TURN); "" hides it.
 - tags lead the preview, each in its own tone (ind YOUR TURN, mute THEIR TURN, brass SWAP
   NAMES? / THEY WENT FIRST, postal red CLOSES IN n DAYS), then youPrefix ("You: ") in ink, then
   the words. Every string arrives translated and cased.
 - trailing: the badge (ind with the page colour on it, 20 high, "9+") or a link-coloured word
   ("Rekindle ›") that is NOT a button: a tap anywhere on the row opens it.
 - dim: the face at .45 (a quiet room, a closed account).
 - Press: a row with a menu doesn't fade (iOS's own press and lift show, owner 10-11); a row
   without one fades to .6. A long press never also opens the row.
 - VoiceOver: one button with the label TS built, and the menu's items as its actions.

 Faces are drawn by KFace (52, round): a portrait or snapshot, a mosaic inked in the theme's ink
 (or ind), the veil, or the soft2 placeholder while a picture is on its way.
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
    /// the seal's brass (KBrand.brassSeal): SWAP NAMES?, THEY WENT FIRST
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
    case .brass: return KBrand.brassSeal
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
  /// a deleted account
  case veil
  case placeholder

  func source(_ theme: KTheme) -> KFaceSource {
    switch self {
    case let .image(ref, overscan): return .image(ref, overscan: overscan)
    case let .mosaic(mask, turn): return .mosaic(mask: mask, tint: turn ? theme.ind : theme.ink)
    case .veil: return .veil
    case .placeholder: return .placeholder
    }
  }
}

/// One row's content, every word already from TS.
public struct KPersonRowModel: Identifiable, Equatable, Sendable {
  public let id: String
  public let face: KPersonFace
  /// the official mark on the face (Wren)
  public let faceBadge: Bool
  public let name: String
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
  public let a11yLabel: String
  /// the long-press menu; [] for none
  public let actions: [KMenuItem]

  public init(
    id: String,
    face: KPersonFace,
    faceBadge: Bool = false,
    name: String,
    nameDim: Bool = false,
    progress: String = "",
    time: String = "",
    tags: [KRowTag] = [],
    youPrefix: String = "",
    preview: String = "",
    badge: String = "",
    trailingLink: String = "",
    dim: Bool = false,
    a11yLabel: String,
    actions: [KMenuItem] = []
  ) {
    self.id = id
    self.face = face
    self.faceBadge = faceBadge
    self.name = name
    self.nameDim = nameDim
    self.progress = progress
    self.time = time
    self.tags = tags
    self.youPrefix = youPrefix
    self.preview = preview
    self.badge = badge
    self.trailingLink = trailingLink
    self.dim = dim
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
        KFace(theme: theme, source: row.face.source(theme), size: Self.face, dim: row.dim, badge: row.faceBadge)
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

  private var words: some View {
    VStack(alignment: .leading, spacing: 3) {
      HStack(alignment: .firstTextBaseline, spacing: 8) {
        Text(row.name)
          .kText(Self.name)
          .foregroundStyle(row.nameDim ? theme.sub : theme.ink)
          .lineLimit(1)
          .layoutPriority(1)
        if !row.progress.isEmpty {
          Text(row.progress)
            .kText(Self.progress)
            .foregroundStyle(theme.sub)
            .lineLimit(1)
            .fixedSize()
        }
        Spacer(minLength: 0)
        if !row.time.isEmpty {
          Text(row.time)
            .kText(Self.time)
            .foregroundStyle(theme.mute)
            .lineLimit(1)
            .fixedSize()
        }
      }
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

  /// The tags, "You: " and the words as one run of text, each part in its own colour.
  private var previewText: Text {
    var text = Text(verbatim: "")
    for tag in row.tags {
      text = text + Text(verbatim: tag.text + "  ")
        .font(.system(size: tagSize, weight: .semibold))
        .tracking(0.3)
        .foregroundColor(tag.color(theme))
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
