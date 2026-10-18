// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE STAMP (stamps v2, the set the owner approved on 2026-10-18; spec §2.11 "one component"):
 KStamp, the Swift twin of React Native's components/Stamp.tsx, and it draws exactly what that
 draws. Every one of the 36 mood stamps SwiftUI shows goes through here, at a width taken from
 the ladder (KStampLadder, Kit/KStampFrame.swift), and nothing about it is decided here: the
 tier, the perforated paper, the window, the series ground, the colours, the keyline and the
 tilt are Kit/KStampFrame.swift's (the port of lib/stamp-frame), and the drawing is
 Kit/KStampArtData.swift's (generated from src/data/stamp-art-v2.ts by
 scripts/gen-stamp-art-swift.mjs). This file only lays them on top of each other in the right
 order, so React Native, the web and SwiftUI, reading the same data, draw the same stamp.

     KStamp(id: card.stampId, width: KStampLadder.todayCard.w, dark: theme.isDark,
            delivered: true, letterId: card.id)                                  // the Today card
     KStamp(id: item.id, width: KStampLadder.trayTile.w, dark: theme.isDark)    // a tray tile
     KStampSlot(width: 40, fill: theme.lav2, stroke: theme.ind)                 // the empty corner

 From the bottom up, by the tier the width falls in:
   · below 15pt there is no stamp: a 6pt dot of the field colour, and the dot is all it lays out;
   · chip (15) and XS (20): the field IS the stamp, the perforated silhouette filled with the
     stamp's hex. The chip stops there (colour only); XS adds its own cut, the 1 or 2 bold white
     marks of the `xs` layer, over the whole silhouette;
   · S (25–39) and up: the paper (white, or Midnight's cool #ECE9F4), the 4:5 window in the hex,
     from M the category's series ground in mix(hex, white, 0.20), then the soft plate in
     mix(hex, white, 0.55) (at S without the small marks flagged dropAtS), then the art in white
     on top, both clipped to the window;
   · last, the edge: on the light themes the keyline, ln at 40%, centred on the silhouette
     (S 0.75 / M 1 / L 1.25 / XL 1.5pt); on a dark surface no keyline, but chip and XS get a 1pt
     paper rim. No stamp has a shadow, anywhere.
 Strokes are 4.31u with round caps and joins, never thinner on screen than the tier allows
 (KStampFrame.strokeU). No text is ever drawn on a stamp.

 `dark` is the surface under it, which SwiftUI here has no environment for (a Host doesn't set
 the colour scheme from the app's theme): placements pass theme.isDark, and a picture with its
 own light ground passes false. It decides the paper and the keyline or rim.

 THE FALLBACK CHAIN. A known id with no marks (a drawing not delivered, or one the generator or
 the importer refused) is the template: the paper, the window in its own hex and, from M, its
 category's ground (the ground is frame, not drawing), but no motif. An id this build doesn't
 know is the template in `fallbackHex` when TS passes the stamp's colour (a stamp TS knows and
 this binary's table doesn't yet), else in #8B7FE8, with no ground (it has no category). Never
 blank, never an emoji.

 DELIVERED MAIL. `delivered` (with the letter's id) is for a stamp that came to you on someone's
 letter: the Today card, the reader, a kindred's "began under". From M up it tilts by the
 letter's id ([−2, −1, +1, +2]°, FNV-1a, the same on every platform, so sender and reader see one
 tilt). No postmark: the owner took the wavy lines off on 2026-10-18. Below M, and for your own
 and unsent stamps (trays, grids, lists), a stamp is flat: 0°.

 THE BOX IT TAKES. Exactly width × 1.2 width (the dot: the dot). The keyline's outer half and the
 tilt's corners draw outside that box without moving the layout, so a placement sizes its row by the stamp alone; nothing here clips.

 THE COST. Each stamp's path data is read once (KSVGPath), the first time that id is drawn, and
 the plan for a size (which marks, in which colours, at which stroke) is kept per id, tier and
 width rounded to 0.5pt, so a tray of thirty-six redraws without redoing either; each face is an
 equatable Canvas that only redraws when its plan, its width or the surface's darkness changes.

 It is decorative unless it gets an accessibilityLabel (the stamp's name, from TS, in the
 reader's language): without one VoiceOver skips it, with one it reads as an image of that name.
 An empty or blank label counts as none. A button holding a stamp should label the button.

 KSTAMPART, the v1 API (a square tile of the 64-grid art, before stamps v2), is kept as a thin
 wrapper so any call site not moved yet still draws: KStampArt(id:size:…) draws KStamp at
 5/6 of the side (the 5:6 stamp standing in the square), on the light paper (it has no theme to
 know better). Every 10a placement now draws KStamp itself.
 */
public struct KStamp: View {
  /// room round the box for the keyline's or the rim's outer half (at most 0.75pt)
  static let padPt: CGFloat = 1

  private let id: String
  private let width: CGFloat
  private let dark: Bool
  private let delivered: Bool
  private let letterId: String?
  private let fallbackHex: String?
  private let accessibilityLabel: String?

  /// - Parameters:
  ///   - id: the mood id (stamps.ts, letters.stamp); unknown: the template in fallbackHex or #8B7FE8
  ///   - width: the rendered width in pt, from KStampLadder; the height is always 1.2 × width
  ///   - dark: the surface under it is dark (theme.isDark): Midnight's paper, no keyline, the rim
  ///     at chip and XS
  ///   - delivered: a stamp that came on someone's letter: from M up it tilts by `letterId`
  ///   - letterId: the delivered letter's id, the tilt's seed (no id, no tilt)
  ///   - fallbackHex: TS's colour for an id this binary's table doesn't know ("#RRGGBB")
  ///   - accessibilityLabel: the stamp's name, to make it an image VoiceOver reads
  public init(
    id: String,
    width: CGFloat,
    dark: Bool,
    delivered: Bool = false,
    letterId: String? = nil,
    fallbackHex: String? = nil,
    accessibilityLabel: String? = nil
  ) {
    self.id = id
    self.width = width
    self.dark = dark
    self.delivered = delivered
    self.letterId = letterId
    self.fallbackHex = fallbackHex
    self.accessibilityLabel = accessibilityLabel
  }

  public var body: some View {
    let plan = KStampPlan.plan(id: id, width: width, fallbackHex: fallbackHex)
    stamp(plan)
      .allowsHitTesting(false)
      .modifier(KStampArtLabel(label: accessibilityLabel))
  }

  @ViewBuilder
  private func stamp(_ plan: KStampPlan) -> some View {
    if plan.tier == .dot {
      Circle()
        .fill(KStampFrame.color(plan.hex))
        .frame(width: KStampFrame.dotPt, height: KStampFrame.dotPt)
    } else {
      let mail = delivered && plan.spec.delivered
      let deg = mail ? Self.tiltDegrees(letterId) : 0
      KStampFace(plan: plan, width: width, dark: dark)
        .equatable()
        .rotationEffect(.degrees(deg))
        .frame(width: width, height: KStampFrame.height(width))
    }
  }

  /// the letter's tilt; no id (or an empty one), no tilt
  static func tiltDegrees(_ letterId: String?) -> Double {
    guard let letterId, !letterId.isEmpty else { return 0 }
    return KStampFrame.tilt(letterId: letterId)
  }
}

/// The stamp itself: one Canvas in box units, padded by padPt all round so the edge's outer half
/// isn't cut off, laid out as exactly width × height.
struct KStampFace: View, Equatable {
  let plan: KStampPlan
  let width: CGFloat
  let dark: Bool

  static func == (a: KStampFace, b: KStampFace) -> Bool {
    a.plan === b.plan && a.width == b.width && a.dark == b.dark
  }

  var body: some View {
    let pad = KStamp.padPt
    Canvas { context, _ in
      plan.draw(in: context, width: width, pad: pad, dark: dark)
    }
    .frame(width: width + 2 * pad, height: KStampFrame.height(width) + 2 * pad)
    .padding(-pad)
  }
}

/* ── the empty corner ── */

/**
 Where a stamp goes before one is chosen (components/Stamp StampSlot): the stamp's own perforated
 silhouette for `width`, filled `fill` and drawn dashed in `stroke` (the compose page's corner: ind
 on lav2, owner 2026-10-18), the line 1.5pt and the dashes 3 and 2.5pt (spec §2.8), centred on the
 edge as SVG strokes it. The same box as a KStamp of that width, so choosing one moves nothing.
 Under 15pt: a 6pt dot with a 1pt border.
 */
public struct KStampSlot: View {
  public static let linePt: CGFloat = 1.5
  public static let dashPt: [CGFloat] = [3, 2.5]

  private let width: CGFloat
  private let fill: Color
  private let stroke: Color

  public init(width: CGFloat, fill: Color, stroke: Color) {
    self.width = width
    self.fill = fill
    self.stroke = stroke
  }

  public var body: some View {
    let tier = KStampFrame.tier(for: width)
    Group {
      if tier == .dot {
        Circle()
          .fill(fill)
          .overlay(Circle().strokeBorder(stroke, lineWidth: 1))
          .frame(width: KStampFrame.dotPt, height: KStampFrame.dotPt)
      } else {
        let pad = KStamp.padPt
        Canvas { context, _ in
          guard width > 0 else { return }
          var c = context
          let s = width / 100
          c.translateBy(x: pad, y: pad)
          c.scaleBy(x: s, y: s)
          let paper = KStampShape.boxPath(tier)
          c.fill(paper, with: .color(fill))
          c.stroke(paper, with: .color(stroke), style: StrokeStyle(lineWidth: Self.linePt / s, dash: Self.dashPt.map { $0 / s }))
        }
        .frame(width: width + 2 * pad, height: KStampFrame.height(width) + 2 * pad)
        .padding(-pad)
      }
    }
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

/* ── the plan: everything about a stamp that depends on its id and width ── */

/// One stamp at one size, worked out once and kept: the field, the paper's silhouette, the
/// ground, and the marks in their colours and stroke, bottom to top. Shared between views (a
/// class, compared by identity), never changed after it is made.
final class KStampPlan: @unchecked Sendable {
  /// one mark as drawn: a fill, or a stroke of `sw` box units
  struct Mark {
    let path: Path
    let fill: Bool
    let color: Color
    let sw: CGFloat
  }

  let tier: KStampTier
  let spec: KStampTierSpec
  /// the field: the stamp's hex, or the fallback for an id this build doesn't know (0xRRGGBB)
  let hex: UInt32
  let hexColor: Color
  /// the perforated paper on the box (empty for the dot)
  let silhouette: Path
  /// the series ground (nil below M, and for an id this build doesn't know)
  let ground: Path?
  let groundColor: Color
  /// what goes in the window (or over the whole stamp at XS), bottom to top
  let marks: [Mark]

  private init(tier: KStampTier, hex: UInt32, ground: Path?, marks: [Mark]) {
    self.tier = tier
    self.spec = KStampFrame.spec(tier)
    self.hex = hex
    self.hexColor = KStampFrame.color(hex)
    self.silhouette = KStampShape.boxPath(tier)
    self.ground = ground
    self.groundColor = KStampFrame.color(KStampFrame.groundRGB(hex))
    self.marks = marks
  }

  /// Draws the stamp into `context`: the box scaled to `width`, offset by `pad` on each side.
  func draw(in context: GraphicsContext, width: CGFloat, pad: CGFloat, dark: Bool) {
    guard width > 0, !silhouette.isEmpty else { return }
    var c = context
    let s = width / 100
    c.translateBy(x: pad, y: pad)
    c.scaleBy(x: s, y: s)
    let window = Path(KStampFrame.window)
    if spec.paper {
      c.fill(silhouette, with: .color(KStampFrame.color(KStampFrame.paperRGB(dark: dark))))
      c.fill(window, with: .color(hexColor))
      if let ground { c.fill(ground, with: .color(groundColor)) }
    } else {
      c.fill(silhouette, with: .color(hexColor))
    }
    if !marks.isEmpty {
      var field = c
      field.clip(to: spec.paper ? window : silhouette)
      for mark in marks {
        if mark.fill {
          field.fill(mark.path, with: .color(mark.color))
        } else {
          field.stroke(mark.path, with: .color(mark.color), style: StrokeStyle(lineWidth: mark.sw, lineCap: .round, lineJoin: .round))
        }
      }
    }
    if let edge = KStampFrame.edge(dark: dark, tier: tier) {
      c.stroke(silhouette, with: .color(KStampFrame.color(edge.rgb, opacity: edge.opacity)), lineWidth: edge.widthPt / s)
    }
  }

  // ── the caches ──

  /// a stamp's marks read into paths, once per id
  private struct Read {
    let art: [(Path, KStampMark)]
    let soft: [(Path, KStampMark)]
    let xs: [(Path, KStampMark)]
  }

  private static let lock = NSLock()
  private static var plans: [String: KStampPlan] = [:]
  private static var read: [String: Read] = [:]
  /// an unknown id is a free string, so the cache is cleared rather than left to grow
  private static let plansMax = 600

  /// The plan for `id` at `width` (kept per id, tier and width rounded to 0.5pt).
  static func plan(id: String, width: CGFloat, fallbackHex: String?) -> KStampPlan {
    let tier = KStampFrame.tier(for: width)
    let rounded = width.isFinite ? (width * 2).rounded() / 2 : 0
    let entry = KStampArt.entries[id]
    let key = "\(id)|\(tier.rawValue)|\(rounded)|\(entry == nil ? fallbackHex ?? "" : "")"
    lock.lock()
    defer { lock.unlock() }
    if let kept = plans[key] { return kept }

    let hex: UInt32 = entry.map { $0.tint >> 8 }
      ?? fallbackHex.flatMap { KStampArt.rgba(hex: $0) }.map { $0 >> 8 }
      ?? KStampFrame.fallbackRGB
    let spec = KStampFrame.spec(tier)
    // a stamp written with no marks (refused by the generator or the importer) is the template too
    let drawn: Read? = entry.flatMap { $0.art.isEmpty ? nil : readLocked($0) }
    let sw = KStampFrame.strokeU(for: rounded)
    let white = KStampFrame.color(KStampFrame.white)
    var marks: [Mark] = []
    if let drawn {
      switch spec.motif {
      case .xs:
        marks = inked(drawn.xs, white, sw, dropSmall: false)
      case .art:
        let soft = spec.soft == .none ? [] : inked(drawn.soft, KStampFrame.color(KStampFrame.softRGB(hex)), sw, dropSmall: spec.soft == .s)
        marks = soft + inked(drawn.art, white, sw, dropSmall: false)
      case .none:
        break
      }
    }
    var ground: Path?
    if spec.ground, let entry {
      let d = KStampFrame.groundData(entry.category)
      if !d.isEmpty { ground = KSVGPath.path(d) }
    }
    let plan = KStampPlan(tier: tier, hex: hex, ground: ground, marks: marks)
    if plans.count >= plansMax { plans.removeAll() }
    plans[key] = plan
    return plan
  }

  private static func inked(_ list: [(Path, KStampMark)], _ color: Color, _ sw: CGFloat, dropSmall: Bool) -> [Mark] {
    list.compactMap { path, mark in
      if dropSmall && mark.dropAtS { return nil }
      return Mark(path: path, fill: mark.kind == .fill, color: color, sw: mark.kind == .fill ? 0 : sw)
    }
  }

  /// the entry's marks read into paths (call with the lock held)
  private static func readLocked(_ entry: KStampArtEntry) -> Read {
    if let kept = read[entry.id] { return kept }
    let r = Read(
      art: entry.art.map { (KSVGPath.path($0.d), $0) },
      soft: entry.soft.map { (KSVGPath.path($0.d), $0) },
      xs: entry.xs.map { (KSVGPath.path($0.d), $0) }
    )
    read[entry.id] = r
    return r
  }
}

/* ── the table ── */

/// One mark of a v2 drawing (Kit/KStampArtData.swift): its path data on the 100 × 120 box, drawn
/// as a fill or a stroke (KStamp gives it its colour and stroke width), and whether the S tier
/// leaves it out (the soft plate's accents under 10u).
struct KStampMark: Sendable {
  enum Kind: Sendable {
    case fill
    case stroke
  }

  let d: String
  let kind: Kind
  let dropAtS: Bool

  init(_ d: String, _ kind: Kind, dropAtS: Bool = false) {
    self.d = d
    self.kind = kind
    self.dropAtS = dropAtS
  }
}

/// One stamp in the generated table (Kit/KStampArtData.swift): its id, its category (which series
/// ground it gets), its own colour as 0xRRGGBBAA, and its three layers of marks. No art marks
/// means the template (the generator refused the drawing, or there was none).
struct KStampArtEntry: Sendable {
  let id: String
  let category: String
  let tint: UInt32
  let art: [KStampMark]
  let soft: [KStampMark]
  let xs: [KStampMark]

  init(_ id: String, category: String, tint: UInt32, art: [KStampMark], soft: [KStampMark], xs: [KStampMark]) {
    self.id = id
    self.category = category
    self.tint = tint
    self.art = art
    self.soft = soft
    self.xs = xs
  }
}

/// The v1 API, kept as a thin wrapper over KStamp (see KSTAMPART above).
public struct KStampArt: View {
  private let id: String
  private let size: CGFloat
  private let fallbackHex: String?
  private let accessibilityLabel: String?

  /// - Parameters:
  ///   - id: the stamp id (stamps.ts, letters.stamp)
  ///   - size: the side of the square, in points; the stamp stands in it at 5/6 of the side
  ///   - fallbackHex: TS's colour for an id this binary's table doesn't know
  ///   - fallbackCorner: v1's tile corner; a v2 stamp has perforations, not corners (ignored)
  ///   - accessibilityLabel: the stamp's name, to make it an image VoiceOver reads; nil, "" or
  ///     whitespace alone hides it
  public init(
    id: String,
    size: CGFloat,
    fallbackHex: String? = nil,
    fallbackCorner: CGFloat? = nil,
    accessibilityLabel: String? = nil
  ) {
    self.id = id
    self.size = size
    self.fallbackHex = fallbackHex
    self.accessibilityLabel = accessibilityLabel
  }

  public var body: some View {
    KStamp(id: id, width: size * 5 / 6, dark: false, fallbackHex: fallbackHex, accessibilityLabel: accessibilityLabel)
      .frame(width: size, height: size)
  }

  // ── the table ──

  /// Every stamp in the table, by id.
  static let entries: [String: KStampArtEntry] = {
    var out: [String: KStampArtEntry] = [:]
    for entry in KStampArtData.stamps where out[entry.id] == nil {
      out[entry.id] = entry
    }
    return out
  }()

  /// Every stamp id the table knows, in src/data/stamps.ts order: six categories of six.
  public static let ids: [String] = KStampArtData.stamps.map(\.id)

  /// The ids drawn as the template because their drawing has no marks (refused, or not
  /// delivered); empty while every stamp draws from its drawing.
  public static let unread: [String] = KStampArtData.stamps.filter { $0.art.isEmpty }.map(\.id)

  /// Whether this id draws its drawing; false means the template.
  public static func hasArt(_ id: String) -> Bool {
    entries[id].map { !$0.art.isEmpty } ?? false
  }

  /// The field's colour as 0xRRGGBBAA: the stamp's own, else TS's hex for an id the table
  /// doesn't know, else STAMP_FALLBACK_HEX.
  static func tint(id: String, fallbackHex: String?) -> UInt32 {
    if let entry = entries[id] { return entry.tint }
    if let hex = fallbackHex, let rgba = rgba(hex: hex) { return rgba }
    return KStampArtData.unknownTint
  }

  /// "#RRGGBB" or "#RRGGBBAA" (the # optional) as 0xRRGGBBAA; nil for anything else.
  static func rgba(hex: String) -> UInt32? {
    let digits = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
    guard digits.count == 6 || digits.count == 8, digits.allSatisfy(\.isHexDigit), let value = UInt32(digits, radix: 16) else {
      return nil
    }
    return digits.count == 6 ? (value << 8) | 0xFF : value
  }
}

/// No label (nil, "" or whitespace alone): hidden from VoiceOver. A label: one image element of
/// that name.
private struct KStampArtLabel: ViewModifier {
  let label: String?

  @ViewBuilder
  func body(content: Content) -> some View {
    if let label, !label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      content
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label)
        .accessibilityAddTraits(.isImage)
    } else {
      content.accessibilityHidden(true)
    }
  }
}
