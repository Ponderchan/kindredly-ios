import SwiftUI

/* HER CARD ON ME — the planet, her flight log, her looks (docs/courier-planet.md).
   ─────────────────────────────────────────────────────────────────────────────
   One white card that stands a little off the page (a hairline and a soft shadow), top to bottom:

   1  the scene (200): the hour's sky and a small whole planet (KPlanetView).
      On it, the chip (YOUR COURIER, or DAY OFF), a hint until the planet is
      first turned, and a small round button that opens the planet page. The
      white body under it has a small tail that points up at her, wherever she is;
   2  her flight log: its own mark (KLineGlyph.flightLog), PIP · FLIGHT LOG and
      the one button (Open, or Play on her day off); then the run she is on as
      her page's slip files it, a row to a line, on a thin spine: an ink dot for
      what has happened, a ring for what hasn't, and a lamp that breathes on the
      row she is at. Her two sentences are gone (owner, 2026-11-11: "有 flight log
      那些 … 这些就不用了吧"); one line of hers stays only when the log cannot say
      it (the Post's letter, hunger, her day off): `log.note`;
   3  the shelf, under a hairline: four looks on the theme's quiet tiles, a name
      under each. Worn: the card's own green ring and a tick. First Class: gold
      dashes and a lock. "All looks →".

   Under the card on the Me tab: the Aura and Stamps tiles and the report row,
   white like the card and lifted the same way, their names on ink chips. No
   colour of their own (the owner tried each tile in a colour, then the hour's
   tint, then neutral grey, and chose "纯白底 立体一点 不要配色", the soft shadow):
   only the sky, the stamps and First Class's gold are coloured on this page.

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

/// Her flight log on the card: the run she is on, as her page's slip files it.
public struct KMeFlightLog: Equatable, Sendable {
  /// PIP · FLIGHT LOG
  public var title = ""
  /// two or three rows, in the order they happen ("YOUR LETTER LEFT — 2H AGO", …)
  public var rows: [String] = []
  /// how many of the rows have happened; the last of them is where she is now (the lamp)
  public var done = 0
  /// a line of hers the rows cannot say (the Post's letter, hunger, her day off); "" for none
  public var note = ""
  /// VoiceOver's sentence for the whole log
  public var a11y = ""

  public init() {}
}

public struct KMePlanet: Equatable, Sendable {
  public var planet = KPlanetContent()
  /// YOUR COURIER, or DAY OFF
  public var chip = ""
  /// DRAG TO SPIN
  public var hint = ""
  public var log = KMeFlightLog()
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

/// A tile's inks (see the top): the theme's surface, its name on an ink chip.
struct KMeTileTone: Equatable {
  var fill: Color
  var chip: Color
  var chipText: Color
  var ink: Color
  var sub: Color
  /// the Aura picture is multiplied onto a light ground; on a dark one it is laid on as it is
  var multiply: Bool

  init(_ theme: KTheme) {
    fill = theme.sf
    chip = theme.ink
    chipText = theme.bg
    ink = theme.ink
    sub = theme.sub
    multiply = !theme.isDark
  }
}

/// How a block stands off the page: a hairline round it and a soft shadow under it (a contact
/// shadow and a wide one). The shadow is the background shape's, so nothing live inside the
/// block (the planet) is flattened to cast it. A dark theme has the hairline only.
struct KSoftLift: ViewModifier {
  let theme: KTheme
  let radius: CGFloat

  private static let shade = Color(hex: "#1E1B35")

  func body(content: Content) -> some View {
    let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)
    content
      .overlay {
        shape.strokeBorder(theme.line.opacity(theme.isDark ? 1 : 0.65), lineWidth: 1)
          .allowsHitTesting(false)
      }
      .background {
        if !theme.isDark {
          shape.fill(theme.sf)
            .shadow(color: Self.shade.opacity(0.07), radius: 1.5, x: 0, y: 1)
            .shadow(color: Self.shade.opacity(0.15), radius: 14, x: 0, y: 10)
        }
      }
  }
}

extension View {
  func kSoftLift(_ theme: KTheme, radius: CGFloat) -> some View {
    modifier(KSoftLift(theme: theme, radius: radius))
  }
}

/// A tile's name, drawn as her card's own chip is (YOUR COURIER): mono capitals on a deep fill,
/// corners 7. One line; a long name in another language shrinks to fit the tile.
struct KMeTileChip: View {
  let text: String
  let fill: Color
  var ink: Color = .white

  var body: some View {
    Text(text)
      .kText(.mono(11, .bold, tracking: 0.16))
      .foregroundStyle(ink)
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
  static let shelf: CGFloat = 76
  static let corner: CGFloat = 26
  /// the body's tail under the scene
  static let tail = CGSize(width: 18, height: 8)
  static let lampGold = KPlanetBubble.lampGold
  static let tick = Color(hex: "#2E7D4F")
  static let chipPaper = Color(hex: "#FFFDF6")
}

// MARK: - The card

public struct KMePlanetCard: View {
  private let card: KMePlanet
  private let actions: KMePlanetActions
  private let theme: KTheme

  @State private var probe = KPlanetProbe()
  @State private var turned = false

  public init(card: KMePlanet, actions: KMePlanetActions, theme: KTheme = .classic) {
    self.card = card
    self.actions = actions
    self.theme = theme
  }

  public var body: some View {
    VStack(spacing: 0) {
      scene
        .overlay(alignment: .bottom) {
          KMeCardTail(probe: probe, live: card.planet.live, fill: theme.sf)
        }
      VStack(alignment: .leading, spacing: 0) {
        KMeFlightLogBlock(log: card.log, cta: card.cta, palette: card.planet.palette, theme: theme, live: card.planet.live) {
          actions.onOpen()
        }
        Rectangle().fill(theme.line).frame(height: 1)
          .padding(.top, 12)
          .padding(.bottom, 12)
        KMeShelf(card: card, actions: actions, theme: theme)
          .frame(minHeight: KMePlanetMetrics.shelf, alignment: .top)
      }
      .padding(.horizontal, 16)
      .padding(.top, 8)
      .padding(.bottom, 12)
    }
    .background(theme.sf)
    .clipShape(RoundedRectangle(cornerRadius: KMePlanetMetrics.corner, style: .continuous))
    .kSoftLift(theme, radius: KMePlanetMetrics.corner)
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
}

/// The body's tail: a small triangle of the body's own colour on the scene's lower edge, under
/// her, wherever she is. Redrawn each frame from the probe the planet reports her place to.
private struct KMeCardTail: View {
  let probe: KPlanetProbe
  let live: Bool
  let fill: Color

  var body: some View {
    TimelineView(.animation(minimumInterval: nil, paused: !live)) { _ in
      Canvas { context, size in
        let half = KMePlanetMetrics.tail.width / 2
        let x = min(max(probe.wrenX, 40), size.width - 40)
        var tail = Path()
        tail.move(to: CGPoint(x: x - half, y: size.height + 0.5))
        tail.addLine(to: CGPoint(x: x, y: 0))
        tail.addLine(to: CGPoint(x: x + half, y: size.height + 0.5))
        tail.closeSubpath()
        context.fill(tail, with: .color(fill))
      }
    }
    .frame(height: KMePlanetMetrics.tail.height)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

// MARK: - 2: her flight log

/// Its mark, PIP · FLIGHT LOG and the one button; a line of hers when there is one to say; the
/// rows on their spine. VoiceOver hears the log as one sentence and the button by itself.
struct KMeFlightLogBlock: View {
  let log: KMeFlightLog
  /// Open, or Play; "" for no button
  let cta: String
  let palette: KCourierPalette
  let theme: KTheme
  /// the tab is in front: the lamp breathes
  let live: Bool
  let onOpen: () -> Void

  /// her own line is content: set in the reader's font (Settings), as her card always set it
  @Environment(\.kLetterFace) private var face
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    // the hour's green on a light body by day; at night, and on a dark theme, the theme's ink
    let quiet = palette.moon || theme.isDark
    HStack(alignment: .top, spacing: 12) {
      ZStack {
        RoundedRectangle(cornerRadius: 11, style: .continuous).fill(theme.ink.opacity(0.07))
        KLineIcon(.flightLog, size: 22, lineWidth: 1.9, color: theme.ink)
      }
      .frame(width: 36, height: 36)
      .padding(.top, 4)
      .accessibilityHidden(true)
      VStack(alignment: .leading, spacing: 4) {
        HStack(alignment: .center, spacing: 8) {
          Text(log.title)
            .kText(.mono(9.5, .semibold, tracking: 0.14))
            .foregroundStyle(theme.sub)
            .lineLimit(1)
            .minimumScaleFactor(0.75)
            .accessibilityHidden(true)
          Spacer(minLength: 4)
          if !cta.isEmpty {
            SwiftUI.Button(action: onOpen) {
              Text(cta)
                .kText(.system(13.5, .semibold))
                .foregroundStyle(quiet ? theme.bg : palette.buttonText)
                .lineLimit(1)
                .padding(.horizontal, 15)
                .frame(minHeight: 30)
                .background(Capsule().fill(quiet ? theme.ink : palette.button))
                // 44 to the finger
                .padding(.vertical, 7)
                .contentShape(Rectangle())
            }
            .buttonStyle(KFadePressStyle())
            .fixedSize()
          }
        }
        .frame(minHeight: 44)
        VStack(alignment: .leading, spacing: 8) {
          if !log.note.isEmpty {
            Text(log.note)
              .kText(.content(face.fitSize(14), lineHeight: 18.0 / 14.0))
              .foregroundStyle(theme.ink)
              .multilineTextAlignment(.leading)
              .fixedSize(horizontal: false, vertical: true)
          }
          rows
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(log.a11y)
      }
    }
  }

  private var rows: some View {
    VStack(alignment: .leading, spacing: 8) {
      ForEach(Array(log.rows.enumerated()), id: \.offset) { i, row in
        HStack(alignment: .top, spacing: 9) {
          marker(reached: i < log.done, at: i == log.done - 1)
            .padding(.top, 0.5)
          Text(row)
            .kText(.mono(10, .semibold, tracking: 0.1))
            .foregroundStyle(i < log.done ? theme.ink : theme.sub)
            .lineLimit(2)
            .multilineTextAlignment(.leading)
            .fixedSize(horizontal: false, vertical: true)
        }
      }
    }
    // the spine the dots sit on
    .background(alignment: .leading) {
      Rectangle().fill(theme.line).frame(width: 1.5).padding(.vertical, 7).offset(x: 5.25)
    }
  }

  @ViewBuilder private func marker(reached: Bool, at: Bool) -> some View {
    if at {
      KMeLogLamp(breathe: live && !reduceMotion)
    } else if reached {
      Circle().fill(theme.ink).frame(width: 7, height: 7)
        .frame(width: 12, height: 12)
        .background(Circle().fill(theme.sf).frame(width: 11, height: 11))
    } else {
      Circle().strokeBorder(theme.faint, lineWidth: 1.6).frame(width: 8, height: 8)
        .frame(width: 12, height: 12)
        .background(Circle().fill(theme.sf).frame(width: 11, height: 11))
    }
  }
}

/// The lamp on the row she is at: it breathes, a slow in and out (owner, 2026-11-11: "那个黄点
/// 类似呼吸动的感觉"); still under Reduce Motion and while the tab is behind another.
struct KMeLogLamp: View {
  let breathe: Bool
  @State private var out = false

  var body: some View {
    ZStack {
      Circle().fill(KPlanetBubble.lampGold.opacity(0.5))
        .frame(width: 16, height: 16)
        .scaleEffect(out ? 1.3 : 0.85)
        .opacity(out ? 0.85 : 0.35)
      Circle().fill(KPlanetBubble.lampGold)
        .frame(width: 8, height: 8)
        .overlay(Circle().strokeBorder(Color(hex: "#1E1B35").opacity(0.3), lineWidth: 1))
        .scaleEffect(out ? 1.15 : 1)
    }
    .frame(width: 12, height: 12)
    .onAppear { set(breathe) }
    .onChange(of: breathe) { _, on in set(on) }
    .accessibilityHidden(true)
  }

  private func set(_ on: Bool) {
    if on {
      withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) { out = true }
    } else {
      withAnimation(.easeOut(duration: 0.3)) { out = false }
    }
  }
}

// MARK: - 3: the shelf

struct KMeShelf: View {
  let card: KMePlanet
  let actions: KMePlanetActions
  let theme: KTheme

  var body: some View {
    let palette = card.planet.palette
    // the hour's green by day; at night, and on a dark theme, the theme's indigo
    let accent = (palette.moon || theme.isDark) ? theme.ind : palette.button
    HStack(alignment: .top, spacing: 10) {
      ForEach(card.shelf) { item in
        KMeShelfChip(item: item, ground: theme.soft2, ring: accent, ink: theme.sub) {
          actions.onLook(item.id)
        }
      }
      Spacer(minLength: 4)
      SwiftUI.Button(action: { actions.onAllLooks() }) {
        Text(card.allLooks)
          .kText(.system(12.5, .semibold))
          .foregroundStyle(accent)
          .lineLimit(1)
          .padding(.vertical, 10)
          .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
      .accessibilityHint(card.allLooksHint)
      .padding(.top, 8)
    }
  }
}

struct KMeShelfChip: View {
  let item: KMeShelfLook
  /// the tile she stands on (First Class looks stand on their own paper)
  let ground: Color
  let ring: Color
  let ink: Color
  let onTap: () -> Void

  var body: some View {
    SwiftUI.Button(action: onTap) {
      VStack(spacing: 5) {
        ZStack {
          RoundedRectangle(cornerRadius: 16, style: .continuous)
            .fill(item.firstClass ? KMePlanetMetrics.chipPaper : ground)
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
          .foregroundStyle(ink)
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

// MARK: - Under the card: two tiles and a row, white and lifted like the card

/// The Aura tile: its picture, its title, how many letters it reads from. A tap opens the Aura card.
struct KMeAuraTile<Art: View>: View {
  let aura: KMeAura?
  /// AURA, on the chip; "" falls back to the card's own label
  let chip: String
  let hint: String
  var theme: KTheme = .classic
  let onTap: () -> Void
  @ViewBuilder let art: Art

  var body: some View {
    let tone = KMeTileTone(theme)
    SwiftUI.Button(action: onTap) {
      VStack(alignment: .leading, spacing: 0) {
        KMeTileChip(text: chip.isEmpty ? (aura?.label ?? "") : chip, fill: tone.chip, ink: tone.chipText)
        art
          .frame(height: 52)
          .frame(maxWidth: .infinity)
          .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
          .blendMode(tone.multiply ? .multiply : .normal)
          .padding(.top, 9)
          .accessibilityHidden(true)
        Text(aura?.title ?? "")
          .kText(.system(15, .semibold, lineHeight: 19.0 / 15.0))
          .foregroundStyle(tone.ink)
          .lineLimit(2)
          .multilineTextAlignment(.leading)
          .padding(.top, 8)
        Text(aura?.from ?? "")
          .kText(.mono(9.5, .medium, tracking: 0.14))
          .foregroundStyle(tone.sub)
          .lineLimit(1)
          .padding(.top, 5)
        Spacer(minLength: 0)
      }
      .padding(14)
      .frame(maxWidth: .infinity, minHeight: 152, maxHeight: .infinity, alignment: .topLeading)
      .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(tone.fill))
      .kSoftLift(theme, radius: 24)
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
  var theme: KTheme = .classic
  let onTap: () -> Void

  var body: some View {
    let tone = KMeTileTone(theme)
    let fan = Array(tile.fan.prefix(3))
    let fanWidth: CGFloat = fan.isEmpty ? 0 : 36 + CGFloat(fan.count - 1) * 28
    SwiftUI.Button(action: onTap) {
      VStack(alignment: .leading, spacing: 0) {
        KMeTileChip(text: tile.label, fill: tone.chip, ink: tone.chipText)
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
            KStampSlot(width: 34, stroke: tone.ink.opacity(0.55))
          }
        }
        .frame(height: 54)
        .padding(.top, 8)
        .accessibilityHidden(true)
        Text(tile.title)
          .kText(.system(15, .semibold, lineHeight: 19.0 / 15.0))
          .foregroundStyle(tone.ink)
          .lineLimit(2)
          .multilineTextAlignment(.leading)
          .padding(.top, 8)
        Text(tile.caption)
          .kText(.mono(9.5, .medium, tracking: 0.14))
          .foregroundStyle(tone.sub)
          .lineLimit(1)
          .padding(.top, 5)
        Spacer(minLength: 0)
      }
      .padding(14)
      .frame(maxWidth: .infinity, minHeight: 152, maxHeight: .infinity, alignment: .topLeading)
      .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(tone.fill))
      .kSoftLift(theme, radius: 24)
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

/// The report row.
struct KMeReportRow: View {
  let report: KMeReport
  var theme: KTheme = .classic
  let onTap: () -> Void

  var body: some View {
    let tone = KMeTileTone(theme)
    let shape = RoundedRectangle(cornerRadius: 20, style: .continuous)
    SwiftUI.Button(action: onTap) {
      HStack(alignment: .center, spacing: 14) {
        ZStack {
          RoundedRectangle(cornerRadius: 11, style: .continuous)
            .fill(report.locked ? KBrand.cream : tone.chip.opacity(0.07))
          if report.locked {
            ZStack {
              Circle().fill(KBrand.waxGold)
              KLineIcon(.lock, size: 12, lineWidth: 2.4, color: KBrand.inkOnBrand)
            }
            .frame(width: 22, height: 22)
          } else {
            KLineIcon(.ruledCard, size: 20, lineWidth: 1.9, color: tone.chip)
          }
        }
        .frame(width: 38, height: 38)
        VStack(alignment: .leading, spacing: 2) {
          Text(report.title)
            .kText(.system(15, .semibold))
            .foregroundStyle(tone.ink)
            .fixedSize(horizontal: false, vertical: true)
          if !report.sub.isEmpty {
            Text(report.sub)
              .kText(.system(13))
              .foregroundStyle(tone.sub)
              .fixedSize(horizontal: false, vertical: true)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        if report.enabled {
          KLineIcon(.chevronRight, size: 14, lineWidth: 2.4, color: tone.sub)
        }
      }
      .padding(.horizontal, 16)
      .padding(.vertical, 14)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(shape.fill(tone.fill))
      .kSoftLift(theme, radius: 20)
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
