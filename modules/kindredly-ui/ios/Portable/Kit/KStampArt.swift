// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE STAMP (stamps v3 "character", the set and the bright palette the owner chose on 2026-10-19;
 contract .claude/stamp-design/v3/INTEGRATION.md): KStamp, the Swift twin of React Native's
 components/Stamp.tsx, and it draws exactly what that draws. Every one of the 36 mood stamps
 SwiftUI shows goes through here, at a width taken from the ladder (KStampLadder,
 Kit/KStampFrame.swift). The drawing is Kit/KStampArtData.swift's `v3` (generated from
 src/data/stamp-art-v3.ts by scripts/gen-stamp-art-swift.mjs): five layers on the 100 × 120 box,
 frame · rims · body · marks · face, each element a path, circle or ellipse whose fill and stroke
 are a colour ROLE, resolved per stamp here:

     hex  = the stamp's colour (stamps.ts color)
     ink  = #1E1B35, in every theme (never the theme's ink, not on Midnight either)
     tint = mix(hex, white, 0.88), half up (precomputed in the table)

 Each element paints its fill, then its stroke (round caps and joins, the width in box units, so
 it scales with the stamp), bottom to top. No paper, window, ground or keyline is drawn by code
 any more: the frame layer is the paper and its keyline, the rims are the die-cut edge that shows
 on Midnight. One drawing serves every theme.

     KStamp(id: card.stampId, width: KStampLadder.todayCard.w, dark: theme.isDark,
            delivered: true, letterId: card.id)                                  // the Today card
     KStamp(id: item.id, width: KStampLadder.trayTile.w, dark: theme.isDark)    // a tray tile
     KStampSlot(width: 40, stroke: KStampSlot.stroke(for: theme))               // the empty corner

 Which layers a width keeps (KStampLayer.kept(width:), the kit's tierFor + the app's dot):
   · below 15pt there is no stamp: a 6pt dot of the hex edged 1pt in ink, and the dot is all it
     lays out;
   · 15–24.99 (xs): frame, rims, body;
   · 25–39.99 (s): + face (no marks);
   · from 40 (l): all five.

 `dark` stays in the API (the surface under it, theme.isDark) but v3 draws the same stamp on
 every surface; it only takes part in the redraw check.

 THE FALLBACK CHAIN. A known id with no drawing is its frame layer alone in its own colours (tint
 paper, ink keyline). An id this build doesn't know is the frame alone in `fallbackHex` when TS
 passes the stamp's colour, else in #8B7FE8 (tint #F1F0FC). Below 15pt the dot in that colour.
 Never blank, never an emoji.

 DELIVERED MAIL. `delivered` (with the letter's id) is for a stamp that came to you on someone's
 letter: the Today card, the reader, a kindred's "began under". From 40 up it tilts by the
 letter's id ([−2, −1, +1, +2]°, FNV-1a, the same on every platform), about the box centre.
 Below 40, and for your own and unsent stamps (trays, grids, lists), a stamp is flat: 0°.

 THE BOX IT TAKES. Exactly width × 1.2 width (the dot: the dot). Paint lands in x 3–97, y 8–120
 of the box (the art breaks out over the keyline at the top), so nothing leaves it; the tilt's
 corners draw outside it without moving the layout. Nothing here clips.

 THE COST. Each stamp's elements are read into paths once (KSVGPath), the first time that id is
 drawn, and the plan for a tier (which elements, in which colours) is kept per id and tier, so a
 tray of thirty-six redraws without redoing either; each face is an equatable Canvas that only
 redraws when its plan, its width or the surface's darkness changes.

 It is decorative unless it gets an accessibilityLabel (the stamp's name, from TS, in the
 reader's language): without one VoiceOver skips it, with one it reads as an image of that name.
 An empty or blank label counts as none. A button holding a stamp should label the button.

 KSTAMPART, the v1 API (a square tile), is kept as a thin wrapper so any call site not moved yet
 still draws: KStampArt(id:size:…) draws KStamp at 5/6 of the side.
 */
public struct KStamp: View {
  /// room round the box (paint stays inside it; this only spares the antialiased edge)
  static let padPt: CGFloat = 1

  private let id: String
  private let width: CGFloat
  private let dark: Bool
  private let delivered: Bool
  private let letterId: String?
  private let fallbackHex: String?
  private let accessibilityLabel: String?

  /// - Parameters:
  ///   - id: the mood id (stamps.ts, letters.stamp); unknown: the frame in fallbackHex or #8B7FE8
  ///   - width: the rendered width in pt, from KStampLadder; the height is always 1.2 × width
  ///   - dark: the surface under it is dark (theme.isDark); v3 draws the same on both
  ///   - delivered: a stamp that came on someone's letter: from 40 up it tilts by `letterId`
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
    if id.hasPrefix("c:") {
      // a custom photo stamp: drawn from the registry TS fills (KCustomStamps, below)
      KCustomStampFace(id: id, width: width, dark: dark, delivered: delivered, letterId: letterId, fallbackHex: fallbackHex, accessibilityLabel: accessibilityLabel)
        .allowsHitTesting(false)
    } else {
      KStampOfficialFace(id: id, width: width, dark: dark, delivered: delivered, letterId: letterId, fallbackHex: fallbackHex)
        .allowsHitTesting(false)
        .modifier(KStampArtLabel(label: accessibilityLabel))
    }
  }

  /// the letter's tilt; no id (or an empty one), no tilt
  static func tiltDegrees(_ letterId: String?) -> Double {
    guard let letterId, !letterId.isEmpty else { return 0 }
    return KStampFrame.tilt(letterId: letterId)
  }
}

/// The drawn stamp (the 36, or the frame alone for an id the table doesn't know): KStamp's body
/// before custom stamps, kept as it was.
struct KStampOfficialFace: View {
  let id: String
  let width: CGFloat
  let dark: Bool
  let delivered: Bool
  let letterId: String?
  let fallbackHex: String?

  var body: some View {
    stamp(KStampPlan.plan(id: id, width: width, fallbackHex: fallbackHex))
  }

  @ViewBuilder
  private func stamp(_ plan: KStampPlan) -> some View {
    if plan.tier == .dot {
      // edged 1pt in ink so a bright yellow or pink dot stays visible on white (STAMP_DOT_EDGE_PT)
      Circle()
        .fill(KStampFrame.color(plan.hex))
        .overlay(Circle().strokeBorder(KStampFrame.color(KStampArtData.v3Ink >> 8), lineWidth: KStampArtData.v3DotEdge))
        .frame(width: KStampFrame.dotPt, height: KStampFrame.dotPt)
    } else {
      let mail = delivered && KStampFrame.v3TiltsAt(width)
      let deg = mail ? KStamp.tiltDegrees(letterId) : 0
      KStampFace(plan: plan, width: width, dark: dark)
        .equatable()
        .rotationEffect(.degrees(deg))
        .frame(width: width, height: KStampFrame.height(width))
    }
  }
}

/// The stamp itself: one Canvas in box units, padded by padPt all round, laid out as exactly
/// width × height.
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
      plan.draw(in: context, width: width, pad: pad)
    }
    .frame(width: width + 2 * pad, height: KStampFrame.height(width) + 2 * pad)
    .padding(-pad)
  }
}

/* ── the empty corner ── */

/**
 Where a stamp goes before one is chosen (components/Stamp StampSlot; contract §7): the v3 frame
 path alone, no fill, stroked 4u dashed 8/10 (box units, so it scales with the width) with round
 caps and joins: a dashed outline (the kit's 6u dashed 4/10 read as a string of beads; the lead's
 call of 2026-10-19, a11y pass). In `stroke`: on a page, `stroke(for:)` — the theme's mute, or the
 pale slot colour on Lavender, whose mute is 2.94:1 on its page (lib/stamp-frame stampSlotStroke,
 which decides by contrast; only Lavender is under 3:1; it lives with the tray in
 Compose/KStampTray.swift, so this file and the golden program stay free of KTheme). The same box as a KStamp of that width,
 so choosing one moves nothing. Under 15pt: a 6pt ring.
 */
public struct KStampSlot: View {
  private let width: CGFloat
  private let stroke: Color

  public init(width: CGFloat, stroke: Color) {
    self.width = width
    self.stroke = stroke
  }

  /// the frame path on the box, read once
  static let framePath: Path = KSVGPath.path(KStampArtData.v3FramePath)

  public var body: some View {
    Group {
      if KStampFrame.v3Tier(for: width) == .dot {
        Circle()
          .strokeBorder(stroke, lineWidth: 1)
          .frame(width: KStampFrame.dotPt, height: KStampFrame.dotPt)
      } else {
        let pad = KStamp.padPt
        Canvas { context, _ in
          guard width > 0 else { return }
          var c = context
          let s = width / 100
          c.translateBy(x: pad, y: pad)
          c.scaleBy(x: s, y: s)
          c.stroke(
            Self.framePath,
            with: .color(stroke),
            style: StrokeStyle(lineWidth: KStampArtData.v3SlotWidth, lineCap: .round, lineJoin: .round, dash: KStampArtData.v3SlotDash)
          )
        }
        .frame(width: width + 2 * pad, height: KStampFrame.height(width) + 2 * pad)
        .padding(-pad)
      }
    }
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

/* ── the plan: everything about a stamp that depends on its id and tier ── */

/// One element as drawn: its layer, its shape, its colours resolved (0xRRGGBB, nil = not painted)
/// and its stroke width in box units (0 = no stroke). The list KStamp paints, and the one
/// scripts/stamp-frame-golden.swift compares with design/stamps-v3/golden.json.
struct KStampDrawEl {
  let layer: KStampLayer
  let shape: KStampEl.Shape
  let fill: UInt32?
  let stroke: UInt32?
  let width: CGFloat
}

/// One stamp at one tier, worked out once and kept: its colour and its elements in their colours,
/// bottom to top. Shared between views (a class, compared by identity), never changed after.
final class KStampPlan: @unchecked Sendable {
  struct Piece {
    let path: Path
    let fill: Color?
    let stroke: Color?
    let width: CGFloat
  }

  let tier: KStampTierV3
  /// the stamp's hex, or the fallback for an id this build doesn't know (0xRRGGBB): the dot's colour
  let hex: UInt32
  let pieces: [Piece]

  private init(tier: KStampTierV3, hex: UInt32, pieces: [Piece]) {
    self.tier = tier
    self.hex = hex
    self.pieces = pieces
  }

  /// Draws the stamp into `context`: the box scaled to `width`, offset by `pad` on each side.
  func draw(in context: GraphicsContext, width: CGFloat, pad: CGFloat) {
    guard width > 0, !pieces.isEmpty else { return }
    var c = context
    let s = width / 100
    c.translateBy(x: pad, y: pad)
    c.scaleBy(x: s, y: s)
    for piece in pieces {
      if let fill = piece.fill {
        c.fill(piece.path, with: .color(fill))
      }
      if let stroke = piece.stroke, piece.width > 0 {
        c.stroke(piece.path, with: .color(stroke), style: StrokeStyle(lineWidth: piece.width, lineCap: .round, lineJoin: .round))
      }
    }
  }

  // ── the draw list (pure; the golden check reads it) ──

  /// The stamp's colours: its own (hex, tint), else TS's hex for an id the table doesn't know (its
  /// tint mixed here), else the fallback #8B7FE8 / #F1F0FC. 0xRRGGBB.
  static func colours(id: String, fallbackHex: String?) -> (hex: UInt32, tint: UInt32, entry: KStampV3Entry?) {
    if let entry = KStampArt.entries[id] {
      return (entry.hex >> 8, entry.tint >> 8, entry)
    }
    if let hex = fallbackHex.flatMap({ KStampFrame.rgb(hex: $0) }) {
      return (hex, KStampFrame.v3Tint(hex), nil)
    }
    return (KStampArtData.v3FallbackHex >> 8, KStampArtData.v3FallbackTint >> 8, nil)
  }

  /// What KStamp draws for `id` at `width`, bottom to top (empty below 15pt: the dot). A known id
  /// draws its kept layers; an unknown one the frame layer alone.
  static func drawList(id: String, width: CGFloat, fallbackHex: String? = nil) -> [KStampDrawEl] {
    let (hex, tint, entry) = colours(id: id, fallbackHex: fallbackHex)
    let ink = KStampArtData.v3Ink >> 8
    func role(_ r: KStampRole) -> UInt32? {
      switch r {
      case .none: return nil
      case .hex: return hex
      case .ink: return ink
      case .tint: return tint
      }
    }
    var out: [KStampDrawEl] = []
    for layer in KStampLayer.kept(width: width) {
      let els: [KStampEl]
      if let entry {
        els = entry.elements(layer)
      } else {
        els = layer == .frame ? KStampArtData.v3Frame : []
      }
      for el in els {
        let stroke = el.width > 0 ? role(el.stroke) : nil
        out.append(KStampDrawEl(layer: layer, shape: el.shape, fill: role(el.fill), stroke: stroke, width: stroke == nil ? 0 : el.width))
      }
    }
    return out
  }

  /// an element's shape as a path on the box
  static func path(_ shape: KStampEl.Shape) -> Path {
    switch shape {
    case let .path(d):
      return KSVGPath.path(d)
    case let .circle(cx, cy, r):
      return Path(ellipseIn: CGRect(x: cx - r, y: cy - r, width: 2 * r, height: 2 * r))
    case let .ellipse(cx, cy, rx, ry):
      return Path(ellipseIn: CGRect(x: cx - rx, y: cy - ry, width: 2 * rx, height: 2 * ry))
    }
  }

  // ── the caches ──

  private static let lock = NSLock()
  private static var plans: [String: KStampPlan] = [:]
  /// path data read once (the frame's two strings are shared by all 36)
  private static var paths: [String: Path] = [:]
  /// an unknown id is a free string, so the cache is cleared rather than left to grow
  private static let plansMax = 600

  /// The plan for `id` at `width` (kept per id and tier).
  static func plan(id: String, width: CGFloat, fallbackHex: String?) -> KStampPlan {
    let tier = KStampFrame.v3Tier(for: width)
    let known = KStampArt.entries[id] != nil
    let key = "\(id)|\(tier.rawValue)|\(known ? "" : fallbackHex ?? "")"
    lock.lock()
    defer { lock.unlock() }
    if let kept = plans[key] { return kept }

    let hex = colours(id: id, fallbackHex: fallbackHex).hex
    let pieces: [Piece] = drawList(id: id, width: width, fallbackHex: fallbackHex).map { el in
      Piece(
        path: pathLocked(el.shape),
        fill: el.fill.map { KStampFrame.color($0) },
        stroke: el.stroke.map { KStampFrame.color($0) },
        width: el.width
      )
    }
    let plan = KStampPlan(tier: tier, hex: hex, pieces: pieces)
    if plans.count >= plansMax { plans.removeAll() }
    plans[key] = plan
    return plan
  }

  /// path data read once (call with the lock held); circles and ellipses are cheap to make
  private static func pathLocked(_ shape: KStampEl.Shape) -> Path {
    guard case let .path(d) = shape else { return path(shape) }
    if let kept = paths[d] { return kept }
    let p = KSVGPath.path(d)
    paths[d] = p
    return p
  }
}

/* ── the v2 table's types ──

 KStampArtData.swift still carries the v2 table (KStampArtData.stamps) while
 src/data/stamp-art-v2.ts exists; nothing draws it. These two types keep it compiling until the
 reviewer deletes stamp-art-v2.ts and reruns the generator. */

/// One mark of a v2 drawing (unused since v3).
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

/// One stamp of the v2 table (unused since v3).
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
  ///   - fallbackCorner: v1's tile corner (ignored)
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

  /// Every v3 stamp in the table, by id.
  static let entries: [String: KStampV3Entry] = {
    var out: [String: KStampV3Entry] = [:]
    for entry in KStampArtData.v3 where out[entry.id] == nil {
      out[entry.id] = entry
    }
    return out
  }()

  /// Every stamp id the table knows, in src/data/stamps.ts order: six categories of six.
  public static let ids: [String] = KStampArtData.v3.map(\.id)

  /// The ids drawn as the frame alone because their drawing has no body (the generator couldn't
  /// read it); empty while every stamp draws from its drawing.
  public static let unread: [String] = KStampArtData.v3.filter { $0.body.isEmpty }.map(\.id)

  /// Whether this id draws its drawing; false means the frame alone.
  public static func hasArt(_ id: String) -> Bool {
    entries[id].map { !$0.body.isEmpty } ?? false
  }

  /// The stamp's colour as 0xRRGGBBAA: its own, else TS's hex for an id the table doesn't know,
  /// else STAMP_FALLBACK_HEX.
  static func tint(id: String, fallbackHex: String?) -> UInt32 {
    if let entry = entries[id] { return entry.hex }
    if let hex = fallbackHex, let rgba = rgba(hex: hex) { return rgba }
    return KStampArtData.v3FallbackHex
  }

  /// The tray name's colour for a known stamp (contract §9): nameLight on the light themes,
  /// nameDark (the hex) on Midnight; nil for an id the table doesn't know (keep TS's colour).
  /// Measured on the tray's soft only.
  static func trayName(id: String, dark: Bool) -> Color? {
    guard let entry = entries[id] else { return nil }
    return KStampFrame.color((dark ? entry.nameDark : entry.nameLight) >> 8)
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

// MARK: - CUSTOM PHOTO STAMPS ("c:<uuid>", contract .claude/custom-stamps/CONTRACT.md §3, §4.2)

/*
 Swift never talks to the network: src/lib/custom-stamps resolves the "c:" ids a screen shows
 (0038 custom_stamps_for, a signed link per picture) and pushes them into KCustomStamps through
 the module function setCustomStamps (KindredlyUIModule.swift). KStamp(id: "c:…") draws from it at
 every width, so every Swift surface (the Today card, the tray, the compose corner, Me, the album,
 My letters) shows a photo stamp with no code of its own.

 What a state draws (§3):
   ok                       the photo in KPhotoStampFace(.box) (the hairline ≤ 60, the soft shadow
                            above, a Cofounder's gold line at every size), tilted like any
                            delivered stamp
   pending / rejected       mine only: the photo when TS has a local file for it, else the frame
   removed                  mine: the photo greyed (saturation 0, opacity .6); theirs: the frame
   deleted / hidden / blank the official frame alone in the category's colour
   not in the registry      "resolving" or unknown: the frame in TS's fallbackHex, else #8B7FE8
 Below 15pt every one is the dot in its colour. Decorative unless the caller gives a label, as
 every KStamp; TS names it "Photo stamp, #topic" / "Empty stamp" (KCustomStampWords.spoken is
 the same rule for Swift's own menus).
 */

/// One custom stamp as TS resolved it (src/lib/custom-stamps-core nativeRow).
public struct KCustomStampInfo: Equatable, Sendable {
  public enum State: String, Sendable {
    case ok, pending, rejected, removed, deleted, hidden, blank
  }

  public let id: String
  public let state: State
  /// "#RRGGBB": the category's colour (the frame, the tag, the placeholder's tint)
  public let hex: String
  public let gold: Bool
  /// the #topic without "#"
  public let topic: String
  /// the picture (a signed https link or a file://), nil when there is none
  public let ref: KImageRef?
  /// the reader's own stamp (no Keep / Report)
  public let mine: Bool
  /// a stranger's stamp the reader keeps in their album
  public let kept: Bool

  public init(id: String, state: State, hex: String, gold: Bool, topic: String, ref: KImageRef?, mine: Bool, kept: Bool) {
    self.id = id
    self.state = state
    self.hex = hex
    self.gold = gold
    self.topic = topic
    self.ref = ref
    self.mine = mine
    self.kept = kept
  }

  /// From one row TS sent ({ id, state, hex, gold, topic, url, key, mine, kept }); nil for a row
  /// that isn't a custom stamp.
  public init?(row: [String: Any]) {
    guard let id = row["id"] as? String, id.hasPrefix("c:") else { return nil }
    let url = row["url"] as? String ?? ""
    let key = row["key"] as? String ?? ""
    self.init(
      id: id,
      state: State(rawValue: row["state"] as? String ?? "") ?? .blank,
      hex: row["hex"] as? String ?? "",
      gold: row["gold"] as? Bool ?? false,
      topic: row["topic"] as? String ?? "",
      ref: KImageRef(uri: url, key: key),
      mine: row["mine"] as? Bool ?? false,
      kept: row["kept"] as? Bool ?? false
    )
  }

  /// How it draws.
  public enum Look: Equatable, Sendable { case photo, greyed, frame }

  public var look: Look {
    guard ref != nil else { return .frame }
    switch state {
    case .ok: return .photo
    case .pending, .rejected: return mine ? .photo : .frame
    case .removed: return mine ? .greyed : .frame
    case .deleted, .hidden, .blank: return .frame
    }
  }

  /// a stranger's approved stamp: the reader may keep or report it
  public var canKeep: Bool { !mine && state == .ok }
}

/// The words the stamp menu and VoiceOver use (TS sends them in the reader's language).
public struct KCustomStampWords: Equatable, Sendable {
  public var keep = "Keep this stamp"
  public var report = "Report this stamp"
  public var neverMind = "Never mind"
  public var inAlbum = "In your album ✓"
  /// "Photo stamp, #{topic}"
  public var a11yStamp = "Photo stamp, #{topic}"
  public var a11yBlank = "Empty stamp"

  public init() {}

  public init(row: [String: Any]) {
    func s(_ k: String, _ d: String) -> String {
      let v = (row[k] as? String ?? "").trimmingCharacters(in: .whitespaces)
      return v.isEmpty ? d : v
    }
    let d = KCustomStampWords()
    keep = s("keep", d.keep)
    report = s("report", d.report)
    neverMind = s("neverMind", d.neverMind)
    inAlbum = s("inAlbum", d.inAlbum)
    a11yStamp = s("a11yStamp", d.a11yStamp)
    a11yBlank = s("a11yBlank", d.a11yBlank)
  }

  public func spoken(_ info: KCustomStampInfo?) -> String {
    guard let info, info.look != .frame, !info.topic.isEmpty else { return a11yBlank }
    return a11yStamp.replacingOccurrences(of: "{topic}", with: info.topic)
  }
}

/// THE REGISTRY KStamp draws "c:" ids from. Filled by TS only (setCustomStamps / clearCustomStamps).
/// Only photo stamps observe it, so the 36 never redraw for it.
@MainActor
public final class KCustomStamps: ObservableObject {
  public static let shared = KCustomStamps()

  @Published public private(set) var byId: [String: KCustomStampInfo] = [:]
  @Published public private(set) var words = KCustomStampWords()

  public init() {}

  /// Rows replace the ones with the same id; a row equal to the one held changes nothing.
  public func merge(_ infos: [KCustomStampInfo]) {
    var next = byId
    var changed = false
    for info in infos where next[info.id] != info {
      next[info.id] = info
      changed = true
    }
    if changed { byId = next }
  }

  public func clear() {
    if !byId.isEmpty { byId = [:] }
  }

  public func setWords(_ w: KCustomStampWords) {
    if words != w { words = w }
  }

  public func info(_ id: String) -> KCustomStampInfo? {
    byId[id]
  }
}

/// KStamp for a "c:" id (see the note above).
struct KCustomStampFace: View {
  let id: String
  let width: CGFloat
  let dark: Bool
  let delivered: Bool
  let letterId: String?
  let fallbackHex: String?
  let accessibilityLabel: String?

  @ObservedObject private var registry = KCustomStamps.shared

  var body: some View {
    let info = registry.info(id)
    let look = info?.look ?? .frame
    Group {
      if look != .frame, let info, let ref = info.ref, KStampFrame.v3Tier(for: width) != .dot {
        let mail = delivered && KStampFrame.v3TiltsAt(width)
        let deg = mail ? KStamp.tiltDegrees(letterId) : 0
        let paper = KPhotoStamp.paperRect(boxWidth: width)
        let tint = KStampFrame.rgb(hex: info.hex).map { KStampFrame.color(KStampFrame.v3Tint($0)) } ?? KStampFrame.color(KStampArtData.v3FallbackTint >> 8)
        KPhotoStampFace(width: width, placement: .box, gold: info.gold, dark: dark) {
          KImage(ref, size: paper.size, contentMode: .fill, placeholder: tint)
            .saturation(look == .greyed ? 0 : 1)
            .opacity(look == .greyed ? 0.6 : 1)
        }
        .rotationEffect(.degrees(deg))
        .frame(width: width, height: KStampFrame.height(width))
      } else {
        KStampOfficialFace(id: id, width: width, dark: dark, delivered: delivered, letterId: letterId, fallbackHex: info?.hex ?? fallbackHex)
      }
    }
    // decorative unless the caller names it, as every KStamp (TS sends "Photo stamp, #topic")
    .modifier(KStampArtLabel(label: accessibilityLabel))
  }
}
