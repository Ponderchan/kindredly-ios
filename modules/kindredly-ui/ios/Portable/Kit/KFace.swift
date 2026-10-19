// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE ONE FACE VIEW, for every person in a Swift surface: a kindred's portrait or photo, a pen
 pal's FACE v1 mosaic (or, with the identity switch on, their frosted window), the veil of a
 deleted account, or a soft placeholder while a picture is on its way. What a person looks like
 is decided in TypeScript (src/lib/faces.ts, faceSource); this draws the answer.

     KFace(theme: t, source: .image(ref, overscan: 0.05), size: 52)               // a kindred
     KFace(theme: t, source: .mosaic(mask: m, tint: t.ink), size: 52)              // a pen pal
     KFace(theme: t, source: .mosaic(mask: m, tint: t.ink), size: 28, round: false) // a card's docket

 ROUND (the default): the list face. A circle; behind a mosaic, the veil and the placeholder a
 soft2 disc, with the mosaic 52% across it (52 → cells of 4.5 with gaps of 1.2, 34 → 2.9 and
 .8, as Kindreds draws them today). Owner, 10-15: a round face is a person in a list, a kindred
 or a pen pal alike; a faceless kindred is drawn round too.

 NOT ROUND: the bare mosaic filling its frame, as the Today card's docket and the reader's
 header set it (no disc); a picture there is a rounded square.

 THE FROSTED WINDOW (identity Phase 1) is always a square with corners at 25% of its side
 (KFrost), round or not: the owner's 10-10 rule makes a stranger a square and a kindred a circle,
 and the square turning round when names are traded is a cue that doesn't need colour. Its veil
 (.frostVeil, a deleted account while the switch is on) is the same square as a flat soft tile.

 - dim: the face at .45, for a closed or quiet row; the official badge never dims.
 - badge: the official mark (KOfficialBadge) at the bottom right, 1pt outside the circle, its
   edge cut in `ground`, the colour the face sits on (the page by default; a card passes sf).
 - The frame is always size × size, loaded or not, so a row never jumps when a portrait lands
   (portraits and snapshots arrive a beat later through KImage).
 It is decorative: label the row or button that holds it.
 */

/// What a face shows, as TS resolves it (faceSource in src/lib/faces.ts).
public enum KFaceSource: Equatable, Sendable {
  /// a portrait, a photo or a snapshot; overscan draws it that much larger than the circle,
  /// centred and cropped (the six legacy portraits use .05). A nil ref shows the placeholder.
  case image(KImageRef?, overscan: CGFloat = 0)
  /// a pen pal's FACE v1 mosaic (KMosaic): the 25-bit mask from TS, in this ink
  case mosaic(mask: Int, tint: Color)
  /// a pen pal with the identity switch on: their frosted window (KFrost), always square
  case frost(KFrostSpec)
  /// a deleted account: every cell, in faint
  case veil
  /// a deleted account with the identity switch on: a flat veil tile, square (KFrostVeil)
  case frostVeil
  /// nothing to show yet: the soft2 disc alone
  case placeholder
}

public struct KFace: View {
  /// the round face's mosaic, as a fraction of the face: 52 → 4.5 and 1.2 (kindreds.tsx)
  static let roundCell: CGFloat = 4.5 / 52
  static let roundGap: CGFloat = 1.2 / 52
  /// the gap as a fraction of a cell, for a bare mosaic filling its frame
  static let bareGapRatio: CGFloat = 1.2 / 4.5

  private let theme: KTheme
  private let source: KFaceSource
  private let size: CGFloat
  private let round: Bool
  private let dim: Bool
  private let badge: Bool
  private let ground: Color?
  private let stamp: KMemberStamp?

  /// - Parameters:
  ///   - source: what to show (KFaceSource)
  ///   - size: the face's side, in points
  ///   - round: a circle on a soft2 disc (the default); false for a bare mosaic or a rounded
  ///     square, as the Today card's docket is drawn
  ///   - dim: draw the face at .45 (a closed or quiet row)
  ///   - badge: the official mark at the bottom right (Wren)
  ///   - ground: the colour the face sits on, which cuts the badge's edge; nil for theme.bg
  ///   - stamp: a member's stamp (C2): the face is drawn square inside a gold perforated frame
  ///     that bleeds 4pt outside the box (KStampAvatar). nil (the default) draws it as always. A
  ///     veil (a deleted account) is never stamped.
  public init(theme: KTheme, source: KFaceSource, size: CGFloat, round: Bool = true, dim: Bool = false, badge: Bool = false, ground: Color? = nil, stamp: KMemberStamp? = nil) {
    self.theme = theme
    self.source = source
    self.size = size
    self.round = round
    self.dim = dim
    self.badge = badge
    self.ground = ground
    switch source {
    case .veil, .frostVeil: self.stamp = nil
    default: self.stamp = stamp
    }
  }

  /// The official badge's side on a face of this size, as OfficialBird sizes it (WrenDesk.tsx).
  public static func badgeSize(for size: CGFloat) -> CGFloat {
    max(16, (size * 0.34).rounded())
  }

  private var shape: AnyShape {
    round ? AnyShape(Circle()) : AnyShape(RoundedRectangle(cornerRadius: size * 0.22, style: .circular))
  }

  public var body: some View {
    framed
      .frame(width: size, height: size)
      // flattened first, so the disc doesn't show through a dimmed mosaic
      .compositingGroup()
      .opacity(dim ? 0.45 : 1)
      .overlay(alignment: .bottomTrailing) {
        if badge {
          KOfficialBadge(theme: theme, size: Self.badgeSize(for: size), ground: ground ?? theme.bg)
            .offset(x: 1, y: 1)
        }
      }
      .accessibilityHidden(true)
  }

  @ViewBuilder
  private var framed: some View {
    if let stamp {
      KStampAvatar(theme: theme, size: size, stamp: stamp) { inner in
        KFace.stampedContent(theme: theme, source: source, inner: inner)
      }
    } else {
      face
    }
  }

  /// A source drawn square at `inner`, for the inside of a stamp: an image clipped to radius 3, a
  /// mosaic on a soft2 radius-3 tile at the round face's proportions, the frost as is.
  @ViewBuilder
  static func stampedContent(theme: KTheme, source: KFaceSource, inner: CGFloat) -> some View {
    let tile = RoundedRectangle(cornerRadius: KMemberStamp.innerRadius, style: .circular)
    switch source {
    case let .image(ref, overscan):
      KImage(ref, size: CGSize(width: inner, height: inner), placeholder: theme.soft2, overscan: overscan)
        .clipShape(tile)
    case let .mosaic(mask, tint):
      ZStack {
        tile.fill(theme.soft2)
        KMosaic(mask: mask, cell: inner * roundCell, gap: inner * roundGap, color: tint, veil: false)
      }
    case let .frost(spec):
      KFrost(theme: theme, spec: spec, size: inner)
    case .veil, .frostVeil, .placeholder:
      tile.fill(theme.soft2)
    }
  }

  @ViewBuilder
  private var face: some View {
    switch source {
    case let .image(ref, overscan):
      KImage(ref, size: CGSize(width: size, height: size), placeholder: theme.soft2, overscan: overscan)
        .clipShape(shape)
    case let .mosaic(mask, tint):
      mosaic(mask: mask, color: tint, veil: false)
    case let .frost(spec):
      KFrost(theme: theme, spec: spec, size: size)
    case .veil:
      mosaic(mask: KMosaic.fullMask, color: theme.faint, veil: true)
    case .frostVeil:
      KFrostVeil(theme: theme, size: size)
    case .placeholder:
      shape.fill(theme.soft2)
    }
  }

  @ViewBuilder
  private func mosaic(mask: Int, color: Color, veil: Bool) -> some View {
    if round {
      ZStack {
        Circle().fill(theme.soft2)
        KMosaic(mask: mask, cell: size * Self.roundCell, gap: size * Self.roundGap, color: color, veil: veil)
      }
    } else {
      // the bare mosaic fills the frame: 5 cells and 4 gaps across
      let cell = size / (5 + 4 * Self.bareGapRatio)
      KMosaic(mask: mask, cell: cell, gap: cell * Self.bareGapRatio, color: color, veil: veil)
    }
  }
}

/*
 A MEMBER'S STAMP (C2, the owner's 10-19 design): a First Class member's face is drawn as a gold
 perforated postage stamp, its denomination printed at the bottom right: "1ST" for a member,
 the Cofounder number ("007") for one of the hundred. The denomination is a printed mark, never
 translated. KStamp is taken (the postage stamps), hence KMemberStamp / KStampAvatar.

   ┌·····························┐  the frame bleeds 4pt outside the face's box, so a row never
   ·  ┌───────────────────────┐  ·  moves: outer = size + 8, radius 6, edge waxGold dotted
   ·  │                       │  ·  (2.5 full, 1.5 small), padding 5 (3 small), inner radius 3
   ·  │        the face       │  ·  ground cream, waxGold at 15% in a dark theme
   ·  │                   007 │  ·  denomination mono 8/600 goldText at 3 / 2, hidden ≤ 32
   ·  └───────────────────────┘  ·
   └·····························┘
 inner = size + 8 − 2 × (border + padding): 72 → 65, 52 → 45, 40 → 33, 34 small → 33, 22 small → 21.
 Decorative: the row or button that holds it says "First Class" / "Cofounder No. 7".
 */

/// A member's stamp: the denomination printed at its bottom right ("1ST" or "007").
public struct KMemberStamp: Equatable, Sendable {
  public let denom: String
  /// nil for "" (not a member: the face stays as it is)
  public init?(_ denom: String) {
    let d = denom.trimmingCharacters(in: .whitespaces)
    if d.isEmpty { return nil }
    self.denom = d
  }

  /// the frame's bleed outside the face's box, its corner, and the face's corner inside it
  public static let bleed: CGFloat = 4
  public static let outerRadius: CGFloat = 6
  public static let innerRadius: CGFloat = 3

  /// the side a face is drawn at inside a stamp of this size (KStampAvatar.inner)
  public static func inner(for size: CGFloat, compact: CGFloat) -> CGFloat {
    let c = min(1, max(0, compact))
    return size + 2 * bleed - 2 * ((2.5 - c) + (5 - 2 * c))
  }
}

/// Any face drawn as a gold perforated stamp (C2). The layout box stays size × size; the frame
/// bleeds 4pt outside it, so rows never move. `content` is drawn at `inner` × `inner`.
public struct KStampAvatar<Content: View>: View {
  public static var bleed: CGFloat { KMemberStamp.bleed }
  public static var outerRadius: CGFloat { KMemberStamp.outerRadius }
  public static var innerRadius: CGFloat { KMemberStamp.innerRadius }

  private let theme: KTheme
  private let size: CGFloat
  private let stamp: KMemberStamp
  private let compact: CGFloat
  private let content: (CGFloat) -> Content

  /// - Parameters:
  ///   - size: the face's box; the frame bleeds 4pt outside it
  ///   - compact: 0 = the full rule (2.5 edge, 5 padding, the denomination), 1 = the small rule
  ///     (1.5, 3, no denomination), linear between; nil = by size (≤ 32 → 1). The Me header
  ///     passes its collapse k.
  ///   - content: the face, drawn at the inner side it is given
  public init(theme: KTheme, size: CGFloat, stamp: KMemberStamp, compact: CGFloat? = nil,
              @ViewBuilder content: @escaping (_ inner: CGFloat) -> Content) {
    self.theme = theme
    self.size = size
    self.stamp = stamp
    self.compact = min(1, max(0, compact ?? (size <= 32 ? 1 : 0)))
    self.content = content
  }

  static func border(_ c: CGFloat) -> CGFloat { 2.5 - c }          // 2.5 → 1.5
  static func padding(_ c: CGFloat) -> CGFloat { 5 - 2 * c }       // 5 → 3

  /// the side the face is drawn at inside a stamp of this size
  public static func inner(for size: CGFloat, compact: CGFloat) -> CGFloat {
    KMemberStamp.inner(for: size, compact: compact)
  }

  public var body: some View {
    let c = compact
    let outer = size + 2 * Self.bleed
    let edge = Self.border(c)
    let inner = Self.inner(for: size, compact: c)
    let frame = RoundedRectangle(cornerRadius: Self.outerRadius, style: .circular)
    ZStack {
      frame.fill(theme.isDark ? KBrand.waxGold.opacity(0.15) : KBrand.cream)
      frame.strokeBorder(KBrand.waxGold, style: StrokeStyle(lineWidth: edge, lineCap: .round, dash: [0.001, edge * 2]))
      content(inner)
        .frame(width: inner, height: inner)
        .clipShape(RoundedRectangle(cornerRadius: Self.innerRadius, style: .circular))
        .overlay(alignment: .bottomTrailing) {
          if c < 1 {
            Text(stamp.denom)
              .font(.custom(KType.monoSemiBold, fixedSize: 8))
              .foregroundStyle(KBrand.goldText)
              .lineLimit(1)
              .fixedSize()
              .padding(.trailing, 3)
              .padding(.bottom, 2)
              .opacity(Double(1 - c))
              .dynamicTypeSize(.large)
              .accessibilityHidden(true)
          }
        }
    }
    .frame(width: outer, height: outer)
    // the box stays size × size; the frame bleeds outside it
    .frame(width: size, height: size)
    .accessibilityHidden(true)
  }
}

/*
 THE OFFICIAL MARK (WrenDesk.tsx OfficialMark): the account that is the product's own, Wren's.
 An ind disc with a tick stroked in the page colour (3.4 on the 24 grid, drawn half the disc
 across) and a 2pt edge in the colour it sits on, so it reads cut out of the face under it. The
 tick is the kindreds' green tick in the system's blue: "verified", the way the phone taught it.
 */
public struct KOfficialBadge: View {
  private let theme: KTheme
  private let size: CGFloat
  private let ground: Color

  /// - Parameters:
  ///   - size: the badge's side, edge included
  ///   - ground: the colour it sits on, for its 2pt edge (theme.bg on the page, sf on a card)
  public init(theme: KTheme, size: CGFloat = 16, ground: Color) {
    self.theme = theme
    self.size = size
    self.ground = ground
  }

  public var body: some View {
    KLineIcon(.tick, size: size * 0.5, lineWidth: 3.4, color: theme.bg)
      .frame(width: size, height: size)
      .background(Circle().fill(theme.ind))
      .overlay(Circle().strokeBorder(ground, lineWidth: 2))
      .accessibilityHidden(true)
  }
}
