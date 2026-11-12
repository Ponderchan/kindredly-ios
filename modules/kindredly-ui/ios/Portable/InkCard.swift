// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.
// The Expo side lives in Adapters/KInkCardView.swift and never leaks in here.

import SwiftUI

/*
 THE INKCARD, the 10a material for letters and writing. A face in the theme's sf, a 2.5pt
 outline in ln, round corners, and a hard shadow: the same rounded shape in ln, moved right and
 down, with no blur. It comes in two variants (InkCardVariant below). The default, .today, has
 corners of 28 and a 6/6 shadow: the Today letter card's numbers in the mock
 (.claude/mock/k10/Kindredly 10 Final.dc.html:32, "border:2.5px … border-radius:28px;
 box-shadow:6px 6px 0 … padding:18px 20px 14px; box-sizing:border-box"). The prompts file
 says 24 and 5/5 for InkCards in general; where the two disagree the mock wins
 (tokens-10a.md §11 item 1), and the mock's own Me cards are the 24 and 5/5 one, .me.

 Read the way the browser reads that CSS:
 - box-sizing is border-box, so the content sits inside the outline AND the padding:
   18 + 2.5 from the top, 20 + 2.5 from each side, 14 + 2.5 from the bottom (.me: 16 + 2.5
   all round; the mock's Me cards are flex columns whose content-box padding reads the same).
 - the corners are plain circular arcs, as CSS draws them (and as React Native draws its own
   borderRadius), not SwiftUI's continuous corners, so a card here matches a card there.
 - like box-shadow, the shadow takes no room. It hangs 6pt (5pt for .me) outside the card's
   frame to the right and below, and whoever places the card leaves that room (the mock's 16
   gutter and 12 gap between cards do). The card does not clip it, and SwiftUI draws past a
   view's frame unless something clips; @expo/ui's Host sets no clipping on its hosting view
   either (read in expo-modules-core SwiftUIHostingView.swift, still to be seen on a device in
   ui-lab).

 The card spans the width it is offered and is as tall as its content, which it stacks
 top-down from the leading edge (the mock card is a flex column: no gap on Today, 12 or 14 on
 Me, which is the spacing parameter). For a card of a
 fixed height (the Today card is 576 tall), make the content flexible, e.g. give it a
 Spacer() or .frame(maxHeight: .infinity), and put .frame(height:) on the InkCard.
 */
/// The two InkCards the mock draws (tokens-10a.md §7): the Today letter card and the Me cards.
public enum InkCardVariant: Equatable, Sendable {
  /// The Today letter card: corners of 28, a 6/6 shadow, padding 18 20 14 (H:32). The
  /// default. (The composer sheet shares the corners and shadow but pads 16 with a gap of
  /// 10, H:129, so it is not this variant.)
  case today
  /// The Me cards (profile, Aura, Stamps): corners of 24, a 5/5 shadow, padding 16
  /// (H:72, 78, 81). The calendar popover has the same 5/5. The Courier card (H:75) is not
  /// one: it has no padding, a courier-green face and clips its sky to the corners.
  case me

  public var cornerRadius: CGFloat {
    switch self {
    case .today: return 28
    case .me: return 24
    }
  }

  /// how far the hard shadow sits right of and below the card
  public var shadowOffset: CGFloat {
    switch self {
    case .today: return 6
    case .me: return 5
    }
  }

  /// the CSS padding, inside the outline
  public var padding: EdgeInsets {
    switch self {
    case .today: return EdgeInsets(top: 18, leading: 20, bottom: 14, trailing: 20)
    case .me: return EdgeInsets(top: 16, leading: 16, bottom: 16, trailing: 16)
    }
  }

  /// where the content actually starts: the padding plus the outline, as border-box lays it out
  public var contentInsets: EdgeInsets {
    let p = padding
    let b = InkCardMetrics.borderWidth
    return EdgeInsets(top: p.top + b, leading: p.leading + b, bottom: p.bottom + b, trailing: p.trailing + b)
  }
}

/// The Today card's numbers, by name. The JS side's InkCardHost insets its React Native content
/// by these (modules/kindredly-ui/src/InkCard.tsx); change them together.
public enum InkCardMetrics {
  /// the outline, the same on every InkCard (H:32, 72)
  public static let borderWidth: CGFloat = 2.5
  public static let cornerRadius: CGFloat = InkCardVariant.today.cornerRadius
  /// how far the hard shadow sits right of and below the card
  public static let shadowOffset: CGFloat = InkCardVariant.today.shadowOffset
  /// the CSS padding, inside the outline
  public static let padding = InkCardVariant.today.padding
  /// where the content actually starts: the padding plus the outline, as border-box lays it out
  public static let contentInsets = InkCardVariant.today.contentInsets
}

public struct InkCard<Content: View>: View {
  private let theme: KTheme
  private let variant: InkCardVariant
  private let spacing: CGFloat
  /// no outline and no hard shadow: the soft wash Wren's looks sits on (Me's cards, owner 2026-10-20)
  private let soft: Bool
  /// no outline: rule B's object depth instead of the ink shadow (the Aura card, owner 2026-10-26)
  private let object: Bool
  /// the Today letter's sheet (KLetterSheet, owner 2026-11-09): a 1pt edge, flat since 2026-11-12
  /// instead of the outline and the ink shadow, at the variant's corners and the same insets
  private let letter: Bool
  private let content: Content

  /// - Parameters:
  ///   - variant: .today (28, 6/6, 18 20 14) or .me (24, 5/5, 16)
  ///   - spacing: the gap between the content's pieces, CSS's gap. The Today card has none;
  ///     the Me cards use 14 (profile) or 12 (Aura, Stamps).
  public init(theme: KTheme, variant: InkCardVariant = .today, spacing: CGFloat = 0, soft: Bool = false, object: Bool = false, letter: Bool = false, @ViewBuilder content: () -> Content) {
    self.theme = theme
    self.variant = variant
    self.spacing = spacing
    self.soft = soft
    self.object = object
    self.letter = letter
    self.content = content()
  }

  public var body: some View {
    VStack(alignment: .leading, spacing: spacing) {
      content
    }
    .frame(maxWidth: .infinity, alignment: .topLeading)
    .padding(variant.contentInsets)
    .background {
      if soft {
        RoundedRectangle(cornerRadius: 20, style: .circular).fill(theme.soft)
      } else if letter {
        KLetterSheet(theme: theme, radius: variant.cornerRadius)
      } else if object {
        let shape = RoundedRectangle(cornerRadius: variant.cornerRadius, style: .circular)
        shape.fill(theme.sf).kObjectDepth(shape, theme: theme)
      } else {
      // back to front: the shadow, the face, the outline (drawn inside the edge, as a CSS border is)
      // Midnight: flat, a hairline in line and no hard shadow (owner, 2026-10-31: ln is a light lilac
      // there, so the edge and its shadow glowed); the light themes keep the ink edge and shadow
      KStickerBackground(
        shape: RoundedRectangle(cornerRadius: variant.cornerRadius, style: .circular),
        fill: theme.sf,
        stroke: theme.isDark ? theme.line : theme.ln,
        lineWidth: InkCardMetrics.borderWidth,
        shadow: theme.isDark ? nil : theme.ln,
        shadowOffset: variant.shadowOffset
      )
      }
    }
  }
}

/*
 LETTER PAPERS (owner, 2026-10-20; .claude/papers/CONTRACT.md §1–2). The writer picks a paper in
 the compose screen; the reader's Today card is drawn on it. Seven papers, the prototype's ALL()
 values (export 3/today-papers-final/src/Today Papers.dc.html) as SwiftUI data; src/data/papers.ts
 is the same table for TS and the web. Change a value in both places, never one.

 - Plain is drawn in the theme's tokens, so it follows the theme (`themed`): the InkCard where the
   paper is drawn as a paper (the compose body), and on Today the letter sheet (KLetterSheet: no
   black frame since 2026-11-09, as for every paper there; KPaperSurface's `letter`). Every other
   paper is a physical sheet and keeps its own colours in every theme, Midnight included;
   cardTheme(over:) hands the card's pieces a theme in the paper's ink.
 - CSS, read as SwiftUI: a repeating-linear-gradient is KPaperStripes (a CSS angle and the bands
   of one period, drawn by a Canvas from the gradient line's start, as CSS lays it out); a border
   is drawn inside the edge (border-box); airmail's "padding-box white over a border-box gradient"
   is the stripes filling the whole sheet with the white face inset by the 8pt edge (corners of
   10 − 8 = 2 inside, as CSS shrinks them); box-shadow is KSoftShadow (spread and blur as CSS
   means them; a 0-blur one is a hard shadow); the receipt's torn edges are a 12pt zigzag 6 deep
   hanging 7 outside the top and bottom with a 1pt #DDD9E8 line along it (the drop-shadow); the
   sticky note's fold is a 32pt corner, the half towards the corner in the page colour and the
   flap #B5CC2E; riso's misregistration is a 1.5/1 text shadow in rgba(200,65,46,.55) with no blur.
 - Faces: the reader's Letter font WINS on every paper (owner's type system, 10-20): a paper keeps
   its colour, texture and size only. The prototype's G / M / S (serif / Plex Mono / system) now
   say only how the letter is sized: G keeps the tier's size, M and S scale it by size / 29 with
   the paper's leading (KPaper.cardSize / cardLine); the face is .letterRead either way.
 */

/// One period of a CSS repeating-linear-gradient: its angle and its bands.
public struct KPaperStripes: Equatable, Sendable {
  /// a band of one period: nil colour is transparent
  public struct Band: Equatable, Sendable {
    public let color: Color?
    public let width: CGFloat
    public init(_ color: Color?, _ width: CGFloat) {
      self.color = color
      self.width = width
    }
  }

  /// CSS degrees: 0 runs toward the top, 90 toward the right (clockwise)
  public let angle: Double
  public let bands: [Band]

  public init(angle: Double, bands: [Band]) {
    self.angle = angle
    self.bands = bands
  }

  /// one period's length along the gradient line
  public var period: CGFloat { bands.reduce(0) { $0 + $1.width } }
}

/// A paper's edge: none, a line drawn inside the edge, or (airmail) stripes `width` deep.
public enum KPaperEdge: Equatable, Sendable {
  case none
  case solid(Color, width: CGFloat, dashed: Bool)
  case stripes(KPaperStripes, width: CGFloat)

  /// how deep the edge reaches in (the content's inset is this plus the padding, border-box)
  public var width: CGFloat {
    switch self {
    case .none: return 0
    case let .solid(_, width, _): return width
    case let .stripes(_, width): return width
    }
  }
}

/// A CSS box-shadow (blur 0 is a hard one), and riso's text-shadow (no blur, no spread).
public struct KPaperShadow: Equatable, Sendable {
  public let x: CGFloat
  public let y: CGFloat
  public let blur: CGFloat
  public let spread: CGFloat
  public let color: Color

  public init(x: CGFloat, y: CGFloat, blur: CGFloat = 0, spread: CGFloat = 0, color: Color) {
    self.x = x
    self.y = y
    self.blur = blur
    self.spread = spread
    self.color = color
  }

  var soft: KSoftShadow { KSoftShadow(x: x, y: y, blur: blur, spread: spread, color: color) }
}

/// One letter paper, every value the card, the compose body and the strip's swatch need.
public struct KPaper: Equatable, Sendable, Identifiable {
  public enum ID: String, CaseIterable, Sendable {
    case plain, grid, kraft, airmail, receipt, sticky, riso
  }

  /// free: anyone; kindred: once the writer has a first kindred; first: First Class
  public enum Tier: String, Sendable {
    case free, kindred, first
  }

  /// G, M and S in the prototype: how the letter is sized on the paper (the face itself is always
  /// the reader's Letter font)
  public enum Face: Sendable {
    /// the tier's own size
    case letter
    /// the prototype's Plex Mono sheet: scaled by size / 29, on the paper's leading
    case mono
    /// the prototype's system sheet: likewise
    case system
  }

  public let id: ID
  public let tier: Tier
  /// Plain: drawn in the theme's tokens (the InkCard), not in the values below
  public let themed: Bool
  // ── the sheet ──
  public let fill: Color
  /// drawn over the fill, first to last
  public let stripes: [KPaperStripes]
  public let edge: KPaperEdge
  public let shadow: KPaperShadow?
  public let radius: CGFloat
  // ── the words ──
  public let ink: Color
  /// the docket's date and postmark, the ⋯ (the prototype's meta)
  public let meta: Color
  public let line: Color
  public let face: Face
  /// the letter's size on the prototype's card (29 is its default): M and S papers scale the
  /// card's tier sizes by size / 29 (cardSize)
  public let size: CGFloat
  /// CSS line-height, × size
  public let lineHeight: CGFloat
  /// CSS letter-spacing, em
  public let tracking: CGFloat
  public let textShadow: KPaperShadow?
  public let tagFill: Color
  public let tagText: Color
  public let stampFill: Color
  public let wrenFill: Color
  /// receipt: torn top and bottom
  public let torn: Bool
  /// sticky: the folded corner
  public let fold: Bool
  // ── the strip's 48 × 60 swatch ──
  public let miniEdge: KPaperEdge
  public let miniRadius: CGFloat

  /// the prototype's default letter size
  public static let baseSize: CGFloat = 29
  /// the card's padding inside the edge (CSS padding 16)
  public static let padding: CGFloat = 16
  /// the sticky note's flap
  public static let foldFlap = Color(hex: "#B5CC2E")
  /// the fold's corner on the card (and the compose body)
  public static let foldSize: CGFloat = 32
  /// the receipt's teeth: one every 12, 6 deep, hanging 7 outside the edge
  public static let tornPeriod: CGFloat = 12
  public static let tornDepth: CGFloat = 6
  public static let tornHang: CGFloat = 7
  public static let tornLine = Color(hex: "#DDD9E8")
  /// the strip's swatch
  public static let swatch = CGSize(width: 48, height: 60)
}

private func kPaperRGBA(_ r: Double, _ g: Double, _ b: Double, _ a: Double) -> Color {
  Color(.sRGB, red: r / 255, green: g / 255, blue: b / 255, opacity: a)
}

public extension KPaper {
  private static let inkHex = Color(hex: "#1E1B35")

  static let plain = KPaper(
    id: .plain, tier: .free, themed: true,
    fill: Color(hex: "#FFFFFF"), stripes: [],
    edge: .solid(inkHex, width: 2.5, dashed: false),
    shadow: KPaperShadow(x: 0, y: 6, blur: 18, spread: -8, color: kPaperRGBA(30, 27, 53, 0.25)),
    radius: 24,
    ink: inkHex, meta: Color(hex: "#8A86A3"), line: inkHex, face: .letter,
    size: 29, lineHeight: 1.3, tracking: 0, textShadow: nil,
    tagFill: Color(hex: "#F5D547"), tagText: inkHex, stampFill: Color(hex: "#DDEFD6"), wrenFill: Color(hex: "#F1F0EE"),
    torn: false, fold: false,
    miniEdge: .solid(inkHex, width: 1.5, dashed: false), miniRadius: 8
  )

  static let grid = KPaper(
    id: .grid, tier: .free, themed: false,
    fill: Color(hex: "#FBFBFF"),
    stripes: [
      KPaperStripes(angle: 0, bands: [.init(nil, 19), .init(Color(hex: "#E4E2F4"), 1)]),
      KPaperStripes(angle: 90, bands: [.init(nil, 19), .init(Color(hex: "#E4E2F4"), 1)]),
    ],
    edge: .solid(inkHex, width: 1.5, dashed: false),
    shadow: KPaperShadow(x: 0, y: 2, color: inkHex),
    radius: 4,
    ink: inkHex, meta: Color(hex: "#55506E"), line: inkHex, face: .letter,
    size: 29, lineHeight: 1.3, tracking: 0, textShadow: nil,
    tagFill: inkHex, tagText: Color(hex: "#FFFFFF"), stampFill: Color(hex: "#FFFFFF"), wrenFill: Color(hex: "#FFFFFF"),
    torn: false, fold: false,
    miniEdge: .solid(inkHex, width: 1.5, dashed: false), miniRadius: 3
  )

  static let kraft = KPaper(
    id: .kraft, tier: .first, themed: false,
    fill: Color(hex: "#E3D5B8"),
    stripes: [KPaperStripes(angle: 115, bands: [.init(Color.white.opacity(0.08), 2), .init(nil, 5)])],
    edge: .none,
    shadow: KPaperShadow(x: 0, y: 14, blur: 28, spread: -14, color: kPaperRGBA(60, 40, 10, 0.55)),
    radius: 18,
    ink: Color(hex: "#3B2E1A"), meta: Color(hex: "#5B4A2E"), line: Color(hex: "#B99E72"), face: .letter,
    size: 29, lineHeight: 1.3, tracking: 0, textShadow: nil,
    tagFill: Color(hex: "#3B2E1A"), tagText: Color(hex: "#E3D5B8"), stampFill: Color(hex: "#F1E7D2"), wrenFill: Color(hex: "#F1E7D2"),
    torn: false, fold: false,
    miniEdge: .none, miniRadius: 6
  )

  /// the par avion stripes: red, white, blue, 10 each, at 45°
  static let airmailStripes = KPaperStripes(angle: 45, bands: [
    .init(Color(hex: "#C8412E"), 10), .init(Color(hex: "#FFFFFF"), 10), .init(Color(hex: "#3A34D6"), 10),
  ])

  static let airmail = KPaper(
    id: .airmail, tier: .kindred, themed: false,
    fill: Color(hex: "#FFFFFF"), stripes: [],
    edge: .stripes(airmailStripes, width: 8),
    shadow: KPaperShadow(x: 0, y: 10, blur: 24, spread: -12, color: kPaperRGBA(30, 27, 53, 0.45)),
    radius: 10,
    ink: inkHex, meta: Color(hex: "#C8412E"), line: Color(hex: "#3A34D6"), face: .letter,
    size: 29, lineHeight: 1.3, tracking: 0, textShadow: nil,
    tagFill: Color(hex: "#C8412E"), tagText: Color(hex: "#FFFFFF"), stampFill: Color(hex: "#FFFFFF"), wrenFill: Color(hex: "#F1F0EE"),
    torn: false, fold: false,
    miniEdge: .stripes(airmailStripes, width: 4), miniRadius: 4
  )

  static let receipt = KPaper(
    id: .receipt, tier: .first, themed: false,
    fill: Color(hex: "#FDFCF7"), stripes: [],
    edge: .solid(Color(hex: "#DDD9E8"), width: 1, dashed: false),
    shadow: KPaperShadow(x: 0, y: 10, blur: 22, spread: -10, color: kPaperRGBA(30, 27, 53, 0.45)),
    radius: 2,
    ink: inkHex, meta: Color(hex: "#55506E"), line: inkHex, face: .mono,
    size: 17, lineHeight: 1.6, tracking: -0.01, textShadow: nil,
    tagFill: inkHex, tagText: Color(hex: "#FFFFFF"), stampFill: Color(hex: "#FFFFFF"), wrenFill: Color(hex: "#F1F0EE"),
    torn: true, fold: false,
    miniEdge: .solid(Color(hex: "#8A86A3"), width: 1, dashed: true), miniRadius: 0
  )

  static let sticky = KPaper(
    id: .sticky, tier: .first, themed: false,
    fill: Color(hex: "#D8F04A"), stripes: [],
    edge: .none,
    shadow: KPaperShadow(x: 3, y: 6, color: kPaperRGBA(30, 27, 53, 0.22)),
    radius: 2,
    ink: inkHex, meta: Color(hex: "#55506E"), line: inkHex, face: .system,
    size: 24, lineHeight: 1.3, tracking: -0.01, textShadow: nil,
    tagFill: inkHex, tagText: Color(hex: "#D8F04A"), stampFill: Color(hex: "#FFFFFF"), wrenFill: Color(hex: "#FFFFFF"),
    torn: false, fold: true,
    miniEdge: .none, miniRadius: 2
  )

  static let riso = KPaper(
    id: .riso, tier: .first, themed: false,
    fill: Color(hex: "#F3C6D4"),
    stripes: [KPaperStripes(angle: 0, bands: [.init(kPaperRGBA(58, 52, 214, 0.06), 2), .init(nil, 2)])],
    edge: .none,
    shadow: KPaperShadow(x: 6, y: 6, color: Color(hex: "#3A34D6")),
    radius: 0,
    ink: Color(hex: "#3A34D6"), meta: Color(hex: "#3A34D6"), line: Color(hex: "#3A34D6"), face: .letter,
    size: 29, lineHeight: 1.3, tracking: 0,
    textShadow: KPaperShadow(x: 1.5, y: 1, color: kPaperRGBA(200, 65, 46, 0.55)),
    tagFill: Color(hex: "#3A34D6"), tagText: Color(hex: "#F3C6D4"), stampFill: Color(hex: "#F3C6D4"), wrenFill: Color(hex: "#FBE3EA"),
    torn: false, fold: false,
    miniEdge: .none, miniRadius: 0
  )

  /// the strip's order
  static let all: [KPaper] = [plain, grid, kraft, airmail, receipt, sticky, riso]

  /// The paper for an id TS sends ("plain", "riso", …); "", nil or anything unknown is plain.
  init(key: String?) {
    let id = ID(rawValue: key ?? "") ?? .plain
    self = Self.all.first { $0.id == id } ?? .plain
  }

  // ── the letter on the Today card (contract §3.3) ──

  /// The letter's size for its tier's size (30, 21, 18): the serif keeps the tier; mono and the
  /// system face scale it by size / 29, never under 16.
  func cardSize(tier: CGFloat) -> CGFloat {
    face == .letter ? tier : max(16, (tier * size / Self.baseSize).rounded())
  }

  /// Its line height: the paper's leading or the tier's own, whichever is more.
  func cardLine(size: CGFloat, tierSize: CGFloat, tierLine: CGFloat) -> CGFloat {
    let tierRatio = tierSize > 0 ? tierLine / tierSize : lineHeight
    return size * max(lineHeight, tierRatio)
  }

  /// The style the letter is set in at `size` on `lineHeight` (points): the reader's Letter font on
  /// every paper (the paper no longer overrides the face, nor its tracking).
  func letterStyle(size: CGFloat, lineHeight line: CGFloat, place: KLetterPlace = .todayCard) -> KTextStyle {
    .letterRead(size, lineHeight: size > 0 ? line / size : nil, place: place)
  }

  /// The theme the card's pieces are drawn in on this paper: the base theme on Plain; elsewhere
  /// Classic's tokens with the paper's own: sf the sheet, ink the words, ln the ink (outlines, the
  /// tag's edge), sub and mute the meta colour. Light, whatever the base (a paper is a paper).
  func cardTheme(over base: KTheme) -> KTheme {
    if themed { return base }
    let c = KTheme.classic
    return KTheme(
      key: base.key + "." + id.rawValue,
      name: base.name,
      isDark: false,
      bg: c.bg,
      sf: fill,
      ink: ink,
      ln: ink,
      sub: meta,
      mute: meta,
      faint: c.faint,
      soft: c.soft,
      soft2: c.soft2,
      line: c.line,
      lav: c.lav,
      lav2: c.lav2,
      ind: c.ind
    )
  }
}

/// A repeating-linear-gradient's stripes, drawn as CSS lays them: the gradient line through the
/// centre, as long as the box seen along it, its first band at the line's start.
struct KPaperStripesView: View {
  let stripes: KPaperStripes

  var body: some View {
    Canvas { ctx, size in
      let period = stripes.period
      guard period > 0, size.width > 0, size.height > 0 else { return }
      let a = stripes.angle * .pi / 180
      let dx = CGFloat(sin(a)), dy = CGFloat(-cos(a))
      let length = abs(size.width * dx) + abs(size.height * dy)
      ctx.translateBy(x: size.width / 2 - dx * length / 2, y: size.height / 2 - dy * length / 2)
      // x now runs along the gradient line, y across it
      ctx.rotate(by: .radians(a - .pi / 2))
      let across = hypot(size.width, size.height)
      var x: CGFloat = 0
      while x < length {
        for band in stripes.bands {
          if let color = band.color, band.width > 0 {
            ctx.fill(Path(CGRect(x: x, y: -across, width: band.width, height: 2 * across)), with: .color(color))
          }
          x += band.width
        }
      }
    }
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

/// The receipt's torn edge: teeth `period` apart, `depth` deep, pointing up (flip it for the bottom).
struct KPaperZigzag: Shape {
  var period: CGFloat = KPaper.tornPeriod
  var depth: CGFloat = KPaper.tornDepth

  func path(in rect: CGRect) -> Path {
    var p = Path()
    p.move(to: CGPoint(x: rect.minX, y: rect.maxY))
    p.addLine(to: CGPoint(x: rect.minX, y: rect.minY + depth))
    var x = rect.minX
    while x < rect.maxX {
      p.addLine(to: CGPoint(x: min(x + period / 2, rect.maxX), y: rect.minY))
      p.addLine(to: CGPoint(x: min(x + period, rect.maxX), y: rect.minY + depth))
      x += period
    }
    p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
    p.closeSubpath()
    return p
  }
}

/// The sticky note's folded corner: the half toward the corner in the page colour, the flap.
struct KPaperFold: View {
  let page: Color
  let size: CGFloat

  var body: some View {
    ZStack {
      Path { p in
        p.move(to: CGPoint(x: 0, y: size))
        p.addLine(to: CGPoint(x: size, y: 0))
        p.addLine(to: CGPoint(x: size, y: size))
        p.closeSubpath()
      }
      .fill(page)
      Path { p in
        p.move(to: CGPoint(x: 0, y: 0))
        p.addLine(to: CGPoint(x: size, y: 0))
        p.addLine(to: CGPoint(x: 0, y: size))
        p.closeSubpath()
      }
      .fill(KPaper.foldFlap)
    }
    .frame(width: size, height: size)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

/*
 THE LETTER SHEET: the letter you read, on every place the Today letter is drawn.

 Two steps, both the owner's:
 - 2026-11-09: the black frame went (the InkCard's ink outline and black hard shadow). The face in
   sf, a 1pt edge in the face's own slightly darker tone (its ink at 11%: on white that is the ink
   at the brief's 10–12%; on Midnight's dark face the same rule gives a faint light hairline, which
   is what reads as an edge there), and a hard 6/6 drop in a per-theme lavender (rule B).
 - 2026-11-12: THE DROP WENT TOO ("去掉吧", at the lavender edge showing right of and under the
   card; the same day he had asked for no purple shadows and no raised edges on the iPhone Duo).
   The sheet is now flat: the face and its 1pt edge, nothing behind it, in every theme. Rule B's
   hard shadow stays on the other objects (KObjectDepth); only the letter lost it.

 No layout changes with either: the content keeps the insets it had inside the 2.5 outline
 (InkCardVariant.contentInsets), so nothing inside a card moves. Nothing leaves room for a drop
 any more (the unfolded letter gave its 6 back).

 Every place the Today letter is drawn uses it, so reading looks the same everywhere: the desk
 card on Plain (through KPaperSurface(letter: true)), the loading and offline card in its slot,
 Wren's letter when the day is done, and the unfolded letter (KLetterReaderScreen).
 */
public struct KLetterSheet: View {
  /// the edge: 1pt, drawn inside the face, in the face's ink at this opacity
  public static let edgeWidth: CGFloat = 1
  public static let edgeOpacity: Double = 0.11

  /// the edge's colour on a face whose words are drawn in `ink`
  public static func edge(ink: Color) -> Color { ink.opacity(edgeOpacity) }

  let theme: KTheme
  let radius: CGFloat

  /// - Parameter radius: the card's own corners (24 for the desk card, 28 for the unfolded letter)
  public init(theme: KTheme, radius: CGFloat) {
    self.theme = theme
    self.radius = radius
  }

  public var body: some View {
    let shape = RoundedRectangle(cornerRadius: radius, style: .circular)
    // the face, and the edge inside it (as a CSS border is); nothing behind
    ZStack {
      shape.fill(theme.sf)
      shape.strokeBorder(Self.edge(ink: theme.ink), lineWidth: Self.edgeWidth)
    }
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

/*
 THE SHEET, behind a card's content: .background { KPaperSurface(paper:theme:) }. Back to front:
 the shadow (outside the sheet, as CSS paints it), the fill, the stripes, the edge, and on top the
 receipt's teeth (outside the frame, top and bottom) and the sticky note's fold. Plain draws the
 theme's InkCard (.me: sf, a 2.5 ln edge, corners of 24, the hard 5/5 shadow in ln). `mini` is the
 strip's swatch: the paper's mini edge and corners, no shadow, no teeth, no fold; teeth: false
 leaves the receipt's teeth off (the compose body). The content's inset is paper.edge.width +
 KPaper.padding (border-box); a caller with its own padding adds the edge's width.

 `letter` is the Today letter (owner, 2026-11-09; KLetterSheet above): Plain loses its black frame
 for the letter sheet at the .me corners. Every other paper is drawn exactly as before (owner,
 2026-11-09: only Plain changes, the others "保持"), so the branch below no longer applies to them. Every other paper keeps its fill, its stripes, the
 airmail border, the receipt's teeth and the sticky note's fold, but loses its own shadow and its
 solid line (grid's ink outline among them) for the same frame as Plain: a 1pt edge in the paper's
 ink at 11% (a darker tone of that paper: brown on kraft, indigo on riso, ink on the rest) and the
 theme's hard 6/6 depth, cut to the sheet's outline (the receipt's teeth included). The inset stays
 paper.edge.width + KPaper.padding, so nothing inside moves. The compose body, the chat hero and the
 strip's swatches don't pass it and are drawn exactly as before.
 */
public struct KPaperSurface: View {
  let paper: KPaper
  let theme: KTheme
  let mini: Bool
  /// the receipt's torn edges (the compose body leaves them off, as the prototype's does)
  let teeth: Bool
  /// the Today letter's frame (rule B) instead of the paper's own edge and shadow
  let letter: Bool

  public init(paper: KPaper, theme: KTheme, mini: Bool = false, teeth: Bool = true, letter: Bool = false) {
    self.paper = paper
    self.theme = theme
    self.mini = mini
    self.teeth = teeth
    // only Plain takes the letter frame (owner, 2026-11-09: "除了 plain 别的就不动了"); every other paper as before
    self.letter = letter && !mini && paper.themed
  }

  public var body: some View {
    if paper.themed && letter {
      KLetterSheet(theme: theme, radius: InkCardVariant.me.cornerRadius)
    } else if paper.themed {
      let radius = mini ? paper.miniRadius : InkCardVariant.me.cornerRadius
      KStickerBackground(
        shape: RoundedRectangle(cornerRadius: radius, style: .circular),
        fill: theme.sf,
        stroke: theme.isDark ? theme.line : theme.ln,
        lineWidth: mini ? 1.5 : InkCardMetrics.borderWidth,
        shadow: mini || theme.isDark ? nil : theme.ln,
        shadowOffset: mini ? 0 : InkCardVariant.me.shadowOffset
      )
      .allowsHitTesting(false)
      .accessibilityHidden(true)
    } else {
      sheet
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
  }

  private var sheet: some View {
    let radius = mini ? paper.miniRadius : paper.radius
    let edge = mini ? paper.miniEdge : paper.edge
    let shape = RoundedRectangle(cornerRadius: radius, style: .circular)
    return ZStack {
      face(shape: shape, edge: edge, radius: radius)
      if letter {
        // the letter's 1pt edge, in a darker tone of this paper, round every paper alike
        shape.strokeBorder(KLetterSheet.edge(ink: paper.ink), lineWidth: KLetterSheet.edgeWidth)
      } else {
        switch edge {
        case .none, .stripes:
          EmptyView()
        case let .solid(color, width, dashed):
          shape.strokeBorder(color, style: StrokeStyle(lineWidth: width, dash: dashed ? [3, 2] : []))
        }
      }
    }
    .background {
      // (a letter never reaches here: only Plain takes the letter frame, and Plain is KLetterSheet)
      if !letter, !mini, let s = paper.shadow {
        Color.clear.kSoftShadows([s.soft], in: shape)
      }
    }
    .overlay(alignment: .top) {
      if !mini && teeth && paper.torn { torn(flipped: false) }
    }
    .overlay(alignment: .bottom) {
      if !mini && teeth && paper.torn { torn(flipped: true) }
    }
    .overlay(alignment: .bottomTrailing) {
      if !mini && paper.fold { KPaperFold(page: theme.bg, size: KPaper.foldSize) }
    }
  }

  /// the fill and the stripes inside the shape; airmail's stripes fill the sheet and the white
  /// face sits inside its edge (corners of radius − edge, as CSS shrinks them)
  @ViewBuilder
  private func face(shape: RoundedRectangle, edge: KPaperEdge, radius: CGFloat) -> some View {
    if case let .stripes(stripes, width) = edge {
      ZStack {
        KPaperStripesView(stripes: stripes).clipShape(shape)
        RoundedRectangle(cornerRadius: max(0, radius - width), style: .circular)
          .fill(paper.fill)
          .padding(width)
      }
    } else {
      ZStack {
        shape.fill(paper.fill)
        ForEach(paper.stripes.indices, id: \.self) { i in
          KPaperStripesView(stripes: paper.stripes[i]).clipShape(shape)
        }
      }
    }
  }

  /// the sheet's outline in one colour (the letter's depth): its shape, and the receipt's teeth
  /// where the sheet has them
  private func silhouette(shape: RoundedRectangle, color: Color) -> some View {
    let tornHeight = KPaper.tornHang + 1
    return shape.fill(color)
      .overlay(alignment: .top) {
        if teeth && paper.torn {
          KPaperZigzag().fill(color).frame(height: tornHeight).offset(y: -KPaper.tornHang)
        }
      }
      .overlay(alignment: .bottom) {
        if teeth && paper.torn {
          KPaperZigzag().fill(color).frame(height: tornHeight).scaleEffect(x: 1, y: -1).offset(y: KPaper.tornHang)
        }
      }
  }

  /// a torn edge: the teeth hang tornHang outside the frame and overlap it by 1, with the 1pt
  /// line along them
  private func torn(flipped: Bool) -> some View {
    let height = KPaper.tornHang + 1
    return ZStack {
      KPaperZigzag().fill(KPaper.tornLine).offset(y: -1)
      KPaperZigzag().fill(paper.fill)
    }
    .frame(height: height)
    .scaleEffect(x: 1, y: flipped ? -1 : 1)
    .offset(y: flipped ? KPaper.tornHang : -KPaper.tornHang)
  }
}
