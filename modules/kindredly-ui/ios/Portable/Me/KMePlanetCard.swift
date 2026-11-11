import SwiftUI

/* HER CARD ON ME — the planet, her words, her looks (docs/courier-planet.md).
   ─────────────────────────────────────────────────────────────────────────────
   One card, three bands, top to bottom:

   1  the scene (200): the hour's sky and a small whole planet (KPlanetView).
      On it, the chip (YOUR COURIER, or DAY OFF), a hint until the planet is
      first turned, and a small round button that opens the planet page;
   2  her words (122): a white speech bubble whose tail follows her across the
      scene — who and when, her line, her aside, and the one button (Open, or
      Play on her day off): KPlanetBubble, which the planet page shares;
   3  the shelf (84): four looks, a name under each. Worn: the card's own green
      ring and a tick. First Class: gold dashes and a lock. "All looks →".

   Under the card on the Me tab: the Aura and Stamps tiles and the report row,
   each in a colour of its own — the owner is tired of lavender everywhere.
   Stamps is the low mood's blue and the report the calm mood's green (KMood);
   Aura is the morning sky's peach (courier-card-model PALETTE.morning): it was
   the happy mood's sand until the owner saw it on a phone (2026-11-11: "黄色背景
   不好看 有点奇怪"). Each tile is named the way her card is (owner, same day:
   "咋没做一个和信使那里一样的效果"): a chip, white mono capitals on the tile's own
   deep tone (KMeTileChip), not a line of small grey capitals.

   All of it SwiftUI: the birds in the shelf are KWrenBird, not snapshots. */

// MARK: - What it shows

/// One look on the shelf.
public struct KMeShelfLook: Identifiable, Equatable, Sendable {
  /// what a tap reports: "dress:beanie", "skin:moss", …
  public var id: String
  /// BEANIE, MOSS, … (drawn under the chip)
  public var name: String
  /// her in it
  public var look: KWrenLook
  /// she is wearing it: a tap takes it off
  public var worn: Bool
  /// First Class, and the reader is not a member: gold dashes and a lock
  public var firstClass: Bool
  /// not hers yet for another reason (a first kindred): the bird dimmed
  public var dim: Bool
  /// VoiceOver's label and hint
  public var a11y: String
  public var hint: String

  public init(id: String, name: String, look: KWrenLook, worn: Bool = false, firstClass: Bool = false, dim: Bool = false, a11y: String = "", hint: String = "") {
    self.id = id
    self.name = name
    self.look = look
    self.worn = worn
    self.firstClass = firstClass
    self.dim = dim
    self.a11y = a11y
    self.hint = hint
  }
}

public struct KMePlanet: Equatable, Sendable {
  public var planet = KPlanetContent()
  /// YOUR COURIER, or DAY OFF
  public var chip = ""
  /// DRAG TO SPIN
  public var hint = ""
  /// her name, and when ("2H AGO")
  public var name = ""
  public var time = ""
  public var line = ""
  public var aside = ""
  /// Open, or Play
  public var cta = ""
  /// the small button's name for VoiceOver ("Track")
  public var track = ""
  public var shelf: [KMeShelfLook] = []
  /// All looks →
  public var allLooks = ""
  public var allLooksHint = ""
  /// VoiceOver's one sentence for the scene
  public var a11y = ""
  /// the Stamps tile under the card
  public var stamps = KMeStampsTileContent()
  /// VoiceOver's hint for the Aura tile ("Opens your writing aura")
  public var auraHint = ""
  /// the Aura tile's chip: AURA (short, so it sits in a chip as YOUR COURIER does)
  public var auraChip = ""

  public init() {}
}

/// The Stamps tile under her card: what you made (or used) lately, fanned, and the blank one.
public struct KMeStampsTileContent: Equatable, Sendable {
  /// STAMPS
  public var label = ""
  /// Snap a moment.
  public var title = ""
  /// 3 USED
  public var caption = ""
  /// at most three are drawn, the first on top of the fan's left
  public var fan: [KMeStampCell] = []
  /// the blank stamp to make one (the press is open to this reader)
  public var make = false
  public var a11y = ""
  public var hint = ""

  public init() {}
}

public final class KMePlanetActions {
  /// Open (her page), or Play on her day off
  public var onOpen: () -> Void = {}
  /// the small button: the planet page
  public var onTrack: () -> Void = {}
  public var onLook: (String) -> Void = { _ in }
  public var onAllLooks: () -> Void = {}
  /// a tap on the planet landed on something
  public var onTap: (KPlanetTap) -> Void = { _ in }

  public init() {}
}

/// The tiles' colours under her card (see the top).
enum KMeTileColour {
  /// Aura: the morning sky's peach, and the evening sky's plum for its chip
  static let aura = Color(hex: "#FBE3D6")
  static let auraChip = Color(hex: "#4A2F3F")
  /// Stamps: the low mood's blue, and a deep blue for its chip
  static let stamps = KMood.low.fill
  static let stampsChip = Color(hex: "#2B557F")
  /// the report row: the calm mood's green
  static let report = KMood.calm.fill
}

/// A tile's name, drawn as her card's own chip is (YOUR COURIER): white mono capitals on a deep
/// fill, corners 7. One line; a long name in another language shrinks to fit the tile.
struct KMeTileChip: View {
  let text: String
  let fill: Color

  var body: some View {
    Text(text)
      .kText(.mono(11, .bold, tracking: 0.16))
      .foregroundStyle(Color.white)
      .lineLimit(1)
      .minimumScaleFactor(0.7)
      .padding(.horizontal, 10)
      .padding(.vertical, 6)
      .background(RoundedRectangle(cornerRadius: 7, style: .circular).fill(fill))
      .accessibilityHidden(true)
  }
}

enum KMePlanetMetrics {
  static let scene: CGFloat = 200
  static let shelf: CGFloat = 84
  static let corner: CGFloat = 26
  static let lampGold = KPlanetBubble.lampGold
  static let tick = Color(hex: "#2E7D4F")
  static let chipPaper = Color(hex: "#FFFDF6")
}

// MARK: - The card

public struct KMePlanetCard: View {
  private let card: KMePlanet
  private let actions: KMePlanetActions

  @State private var probe = KPlanetProbe()
  @State private var turned = false

  public init(card: KMePlanet, actions: KMePlanetActions) {
    self.card = card
    self.actions = actions
  }

  public var body: some View {
    let palette = card.planet.palette
    VStack(spacing: 0) {
      scene
      words
      KMeShelf(card: card, actions: actions)
        .frame(minHeight: KMePlanetMetrics.shelf, alignment: .top)
    }
    .background(palette.sky1)
    .clipShape(RoundedRectangle(cornerRadius: KMePlanetMetrics.corner, style: .continuous))
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
  }

  // ── 1: the scene ──

  private var scene: some View {
    let palette = card.planet.palette
    return ZStack(alignment: .topLeading) {
      KPlanetView(kind: .card, content: card.planet, probe: probe, onTap: { what in actions.onTap(what) }, onTurned: { turned = true })
      // the scene is a picture to VoiceOver: one sentence (who, when, what she says, what Open does)
      Color.clear
        .allowsHitTesting(false)
        .accessibilityElement()
        .accessibilityLabel(card.a11y)
        .accessibilityAddTraits(.isImage)
      Text(card.chip)
        .kText(.mono(11, .bold, tracking: 0.16))
        .foregroundStyle(palette.chipText)
        .lineLimit(1)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(RoundedRectangle(cornerRadius: 7, style: .circular).fill(palette.chip))
        .offset(x: 12, y: 12)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
      if !card.hint.isEmpty {
        Text(card.hint)
          .kText(.mono(9.5, .semibold, tracking: 0.14))
          .foregroundStyle(palette.ink)
          .opacity(turned ? 0 : 0.6)
          .animation(.easeOut(duration: 0.4), value: turned)
          .offset(x: 14, y: 44)
          .allowsHitTesting(false)
          .accessibilityHidden(true)
      }
      SwiftUI.Button(action: { actions.onTrack() }) {
        ZStack {
          Circle().fill(Color.white.opacity(0.72))
          KLineIcon(.globe, size: 18, lineWidth: 1.9, color: KBrand.inkOnBrand)
        }
        .frame(width: 34, height: 34)
        .padding(5)
        .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
      .accessibilityLabel(card.track)
      .frame(maxWidth: .infinity, alignment: .topTrailing)
      .padding(.trailing, 7)
      .padding(.top, 5)
    }
    .frame(height: KMePlanetMetrics.scene)
    .accessibilityElement(children: .contain)
  }

  // ── 2: her words ──

  private var words: some View {
    KPlanetBubble(
      palette: card.planet.palette,
      name: card.name,
      time: card.time,
      line: card.line,
      aside: card.aside,
      cta: card.cta,
      probe: probe,
      live: card.planet.live,
      onCta: { actions.onOpen() }
    )
  }
}

// MARK: - 3: the shelf

struct KMeShelf: View {
  let card: KMePlanet
  let actions: KMePlanetActions

  var body: some View {
    let palette = card.planet.palette
    let night = palette.moon
    HStack(alignment: .top, spacing: 10) {
      ForEach(card.shelf) { item in
        KMeShelfChip(item: item, ring: night ? KMePlanetMetrics.lampGold : palette.button, ink: night ? Color.white : KBrand.inkOnBrand) {
          actions.onLook(item.id)
        }
      }
      Spacer(minLength: 4)
      SwiftUI.Button(action: { actions.onAllLooks() }) {
        Text(card.allLooks)
          .kText(.system(12.5, .semibold))
          .foregroundStyle(night ? Color.white : palette.button)
          .lineLimit(1)
          .padding(.vertical, 10)
          .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
      .accessibilityHint(card.allLooksHint)
      .padding(.top, 8)
    }
    .padding(.horizontal, 14)
    .padding(.top, 4)
    .padding(.bottom, 8)
  }
}

struct KMeShelfChip: View {
  let item: KMeShelfLook
  let ring: Color
  let ink: Color
  let onTap: () -> Void

  var body: some View {
    SwiftUI.Button(action: onTap) {
      VStack(spacing: 5) {
        ZStack {
          RoundedRectangle(cornerRadius: 16, style: .continuous)
            .fill(item.firstClass ? KMePlanetMetrics.chipPaper : Color.white)
          if item.firstClass {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
              .strokeBorder(KBrand.waxGold, style: StrokeStyle(lineWidth: 2, dash: [5, 4]))
          }
          KWrenBird(item.look, size: 42)
            .opacity(item.dim ? 0.45 : 1)
        }
        .frame(width: 52, height: 52)
        .overlay {
          if item.worn {
            RoundedRectangle(cornerRadius: 18.5, style: .continuous)
              .strokeBorder(ring, lineWidth: 2.5)
              .padding(-2.5)
          }
        }
        .overlay(alignment: .topLeading) {
          if item.worn {
            badge(KMePlanetMetrics.tick, .check).offset(x: -5, y: -5)
          }
        }
        .overlay(alignment: .topTrailing) {
          if item.firstClass {
            badge(KBrand.waxGold, .lock).offset(x: 5, y: -5)
          }
        }
        // a long name (HEADPHONES, a translation) may run 5 past the chip on each side, then shrinks
        Text(item.name)
          .kText(.mono(7.5, .semibold, tracking: 0.08))
          .foregroundStyle(ink.opacity(0.85))
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          .frame(width: 62)
      }
      .frame(width: 52)
      .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityLabel(item.a11y.isEmpty ? item.name : item.a11y)
    .accessibilityHint(item.hint)
    .accessibilityAddTraits(item.worn ? .isSelected : [])
  }

  private func badge(_ fill: Color, _ glyph: KLineGlyph) -> some View {
    ZStack {
      Circle().fill(Color.white)
      Circle().fill(fill).padding(2)
      KLineIcon(glyph, size: 9, lineWidth: 3, color: .white)
    }
    .frame(width: 21, height: 21)
  }
}

// MARK: - Under the card: two tiles and a row, each in a mood colour

/// The Aura tile: its picture, its title, how many letters it reads from. A tap opens the Aura card.
struct KMeAuraTile<Art: View>: View {
  let aura: KMeAura?
  /// AURA, on the chip; "" falls back to the card's own label
  let chip: String
  let hint: String
  let onTap: () -> Void
  @ViewBuilder let art: Art

  var body: some View {
    SwiftUI.Button(action: onTap) {
      VStack(alignment: .leading, spacing: 0) {
        KMeTileChip(text: chip.isEmpty ? (aura?.label ?? "") : chip, fill: KMeTileColour.auraChip)
        art
          .frame(height: 52)
          .frame(maxWidth: .infinity)
          .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
          .blendMode(.multiply)
          .padding(.top, 9)
          .accessibilityHidden(true)
        Text(aura?.title ?? "")
          .kText(.system(15, .semibold, lineHeight: 19.0 / 15.0))
          .foregroundStyle(KBrand.inkOnBrand)
          .lineLimit(2)
          .multilineTextAlignment(.leading)
          .padding(.top, 8)
        Text(aura?.from ?? "")
          .kText(.mono(9.5, .medium, tracking: 0.14))
          .foregroundStyle(KBrand.subOnCream)
          .lineLimit(1)
          .padding(.top, 5)
        Spacer(minLength: 0)
      }
      .padding(14)
      .frame(maxWidth: .infinity, minHeight: 152, maxHeight: .infinity, alignment: .topLeading)
      .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(KMeTileColour.aura))
      .contentShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel([aura?.label ?? "", aura?.title ?? "", aura?.from ?? ""].filter { !$0.isEmpty }.joined(separator: ", "))
    .accessibilityHint(hint)
    .accessibilityAddTraits(.isButton)
  }
}

/// The Stamps tile: the stamps made (or used) lately fanned out, the blank one to make, a line and
/// a count. A tap opens the album.
struct KMeStampsTile: View {
  let tile: KMeStampsTileContent
  let onTap: () -> Void

  var body: some View {
    let fan = Array(tile.fan.prefix(3))
    let fanWidth: CGFloat = fan.isEmpty ? 0 : 36 + CGFloat(fan.count - 1) * 28
    SwiftUI.Button(action: onTap) {
      VStack(alignment: .leading, spacing: 0) {
        KMeTileChip(text: tile.label, fill: KMeTileColour.stampsChip)
        HStack(alignment: .center, spacing: 0) {
          ZStack(alignment: .leading) {
            ForEach(Array(fan.enumerated()), id: \.element.id) { i, cell in
              KStamp(id: cell.id, width: 36, dark: false, fallbackHex: cell.hex.isEmpty ? nil : cell.hex)
                .rotationEffect(.degrees(KMeStampsTile.tilt[i % 3]))
                .offset(x: CGFloat(i) * 28, y: KMeStampsTile.drop[i % 3])
            }
          }
          .frame(width: fanWidth, height: 50, alignment: .leading)
          Spacer(minLength: 6)
          if tile.make {
            KStampSlot(width: 34, stroke: KBrand.inkOnBrand.opacity(0.55))
          }
        }
        .frame(height: 54)
        .padding(.top, 8)
        .accessibilityHidden(true)
        Text(tile.title)
          .kText(.system(15, .semibold, lineHeight: 19.0 / 15.0))
          .foregroundStyle(KBrand.inkOnBrand)
          .lineLimit(2)
          .multilineTextAlignment(.leading)
          .padding(.top, 8)
        Text(tile.caption)
          .kText(.mono(9.5, .medium, tracking: 0.14))
          .foregroundStyle(KBrand.subOnCream)
          .lineLimit(1)
          .padding(.top, 5)
        Spacer(minLength: 0)
      }
      .padding(14)
      .frame(maxWidth: .infinity, minHeight: 152, maxHeight: .infinity, alignment: .topLeading)
      .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(KMeTileColour.stamps))
      .contentShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(tile.a11y.isEmpty ? [tile.label, tile.title, tile.caption].filter { !$0.isEmpty }.joined(separator: ", ") : tile.a11y)
    .accessibilityHint(tile.hint)
    .accessibilityAddTraits(.isButton)
  }

  static let tilt: [Double] = [-8, 3, 10]
  static let drop: [CGFloat] = [2, -1, 3]
}

/// The report row, in the calm green.
struct KMeReportRow: View {
  let report: KMeReport
  let onTap: () -> Void

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: 20, style: .continuous)
    SwiftUI.Button(action: onTap) {
      HStack(alignment: .center, spacing: 14) {
        ZStack {
          RoundedRectangle(cornerRadius: 11, style: .continuous)
            .fill(report.locked ? KBrand.cream : KBrand.greenText.opacity(0.16))
          if report.locked {
            ZStack {
              Circle().fill(KBrand.waxGold)
              KLineIcon(.lock, size: 12, lineWidth: 2.4, color: KBrand.inkOnBrand)
            }
            .frame(width: 22, height: 22)
          } else {
            KLineIcon(.ruledCard, size: 20, lineWidth: 1.9, color: KBrand.greenText)
          }
        }
        .frame(width: 38, height: 38)
        VStack(alignment: .leading, spacing: 2) {
          Text(report.title)
            .kText(.system(15, .semibold))
            .foregroundStyle(KBrand.inkOnBrand)
            .fixedSize(horizontal: false, vertical: true)
          if !report.sub.isEmpty {
            Text(report.sub)
              .kText(.system(13))
              .foregroundStyle(KBrand.subOnCream)
              .fixedSize(horizontal: false, vertical: true)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        if report.enabled {
          KLineIcon(.chevronRight, size: 14, lineWidth: 2.4, color: KBrand.subOnCream)
        }
      }
      .padding(.horizontal, 16)
      .padding(.vertical, 14)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(shape.fill(KMeTileColour.report))
      .contentShape(shape)
    }
    .buttonStyle(KFadePressStyle())
    .disabled(!report.enabled)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel([report.title, report.sub].filter { !$0.isEmpty }.joined(separator: ", "))
    .accessibilityHint(report.enabled ? report.hint : "")
    .accessibilityAddTraits(report.enabled ? .isButton : .isStaticText)
    .accessibilityRemoveTraits(report.enabled ? [] : .isButton)
  }
}
