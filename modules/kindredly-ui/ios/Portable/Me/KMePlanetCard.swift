import SwiftUI

/* HER CARD ON ME, AND THE TWO TILES ABOUT YOUR WRITING (docs/courier-planet.md).
   ─────────────────────────────────────────────────────────────────────────────
   Since the cover (the owner's idea, 2026-11-11: Me laid out as his older product is — the
   planet is the page's cover, KMeCover.swift) her card no longer carries the planet. It is
   her own page in small, and it does not change with the hour:

   1  her badge: a slot a lanyard would go through, her standing on a small mound, her name,
      YOUR COURIER, DAY 12 (and GROWN once she is);
   2  her journey, while she is still growing: egg, hatch, fledge, grown — the stop she is at
      ringed in her green, the ones ahead faint — and what the next one takes;
   3  her flight log: its own mark (KLineGlyph.flightLog), PIP · FLIGHT LOG and the one button
      (Open: her page; Play on her day off); the run she is on, a row to a line on a thin spine,
      with a lamp that breathes on the row she is at. One line of hers when the rows cannot say
      it (the Post's letter, hunger, her day off): `log.note`;
   4  the shelf, under a hairline: her looks (six, as the model picks them) on the theme's
      quiet tiles, sharing the row, and an arrow to all of them.

   Under it, WRITING AURA and WRITING REPORT, built alike (KMeWritingTile): the name on an ink
   chip, a picture in a 16:9 panel, a title, a line of state. The Aura's picture is its own
   ladder (waiting lines, pencil, ink, then the named scene); the report is a card to punch
   until the first one, then a sheet (ready, read, locked).

   Every block is the theme's surface, lifted off the page by the same soft shadow (KSoftLift);
   only the cover's sky, the stamps, her and First Class's gold are coloured.

   All of it SwiftUI: every bird is KWrenBird, not a snapshot. */

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

/// One of the cover's two ways in: a small picture and a number.
public struct KMeCoverEntry: Equatable, Sendable {
  /// "7"; "" while unknown
  public var count = ""
  public var a11y = ""
  public var hint = ""

  public init() {}
}

/// A stop on her journey.
public struct KMeJourneyStop: Identifiable, Equatable, Sendable {
  /// egg | hatch | fledge | wren
  public var id: String
  /// EGG, HATCH, …
  public var name: String
  /// done | now | later
  public var state: String

  public init(id: String, name: String, state: String) {
    self.id = id
    self.name = name
    self.state = state
  }
}

/// Her badge and her journey.
public struct KMeHerBadge: Equatable, Sendable {
  public var name = ""
  /// DAY 12; "" until the count is in
  public var day = ""
  /// GROWN, once she is; "" while she grows
  public var tag = ""
  /// PIP'S JOURNEY; "" (or no stops) folds the journey away
  public var journeyTitle = ""
  public var stops: [KMeJourneyStop] = []
  /// the next stop and what it takes: "GROWN — FIRST KINDRED"; "" for none
  public var next = ""
  public var a11y = ""

  public init() {}
}

/// You, under the cover.
public struct KMeSelf: Equatable, Sendable {
  /// he | she | "" (no mark)
  public var mark = ""
  /// the sign as its emoji; "" for none
  public var sign = ""
  /// Scorpio
  public var signName = ""
  public var signA11y = ""
  /// kindreds, notes
  public var stats: [KMeStat] = []
  /// Edit
  public var edit = ""

  public init() {}
}

/// Where the writing report stands, for its tile's picture.
public struct KMeReportTile: Equatable, Sendable {
  /// none | progress | ready | done | locked
  public var state = "none"
  public var have = 0
  public var need = 0
  /// what the sheet's corner says: NO. 1, or NOV
  public var tag = ""

  public init() {}
}

public struct KMePlanet: Equatable, Sendable {
  public var planet = KPlanetContent()
  public var stampsEntry = KMeCoverEntry()
  public var lettersEntry = KMeCoverEntry()
  public var me = KMeSelf()
  public var her = KMeHerBadge()
  public var reportTile = KMeReportTile()
  /// the report tile's chip: YOUR WRITING REPORT
  public var reportChip = ""
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
  /// the cover's two ways in
  public var onStamps: () -> Void = {}
  public var onLetters: () -> Void = {}

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
      .background {
        // the hairline runs just outside the block, never over it: laid over her card it was a
        // pale line round the night sky
        shape.inset(by: -1).strokeBorder(theme.line.opacity(theme.isDark ? 1 : 0.65), lineWidth: 1)
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
  static let shelf: CGFloat = 76
  static let corner: CGFloat = 26
  /// her own green: the chip's words, the ring round where she is on her journey
  static let green = Color(hex: "#1F5C33")
  static let lampGold = KPlanetBubble.lampGold
  static let tick = Color(hex: "#2E7D4F")
  static let chipPaper = Color(hex: "#FFFDF6")
}

// MARK: - The card

public struct KMePlanetCard: View {
  private let card: KMePlanet
  private let actions: KMePlanetActions
  private let theme: KTheme

  public init(card: KMePlanet, actions: KMePlanetActions, theme: KTheme = .classic) {
    self.card = card
    self.actions = actions
    self.theme = theme
  }

  public var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      Capsule().fill(theme.soft2).frame(width: 42, height: 8)
        .frame(maxWidth: .infinity)
        .padding(.top, 11)
        .accessibilityHidden(true)
      badge
        .padding(.top, 4)
      if !card.her.journeyTitle.isEmpty, !card.her.stops.isEmpty {
        KMeJourneyStrip(her: card.her, skin: look.skin, theme: theme)
          .padding(.top, 12)
      }
      KMeFlightLogBlock(log: card.log, cta: card.cta, palette: card.planet.palette, theme: theme, live: card.planet.live) {
        actions.onOpen()
      }
      .padding(.top, 6)
      Rectangle().fill(theme.line).frame(height: 1)
        .padding(.top, 12)
        .padding(.bottom, 12)
      KMeShelf(card: card, actions: actions, theme: theme)
        .frame(minHeight: KMePlanetMetrics.shelf, alignment: .top)
    }
    .padding(.horizontal, 16)
    .padding(.bottom, 12)
    .background(theme.sf)
    .clipShape(RoundedRectangle(cornerRadius: KMePlanetMetrics.corner, style: .continuous))
    .kSoftLift(theme, radius: KMePlanetMetrics.corner)
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
  }

  private var look: KWrenLook { card.planet.wren?.look ?? KWrenLook() }

  // ── 1: her badge ── (a tap is Open: her page)
  private var badge: some View {
    SwiftUI.Button(action: { actions.onOpen() }) {
      HStack(alignment: .center, spacing: 12) {
        ZStack(alignment: .bottom) {
          Ellipse().fill(theme.soft2).frame(width: 100, height: 26)
          KWrenBird(look, size: 92).offset(y: -9)
        }
        .frame(width: 108, height: 98)
        VStack(alignment: .leading, spacing: 0) {
          Text(card.her.name)
            .kText(.system(28, .bold))
            .foregroundStyle(theme.ink)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
          Text(card.chip)
            .kText(.mono(10, .bold, tracking: 0.16))
            .foregroundStyle(theme.isDark ? theme.sub : KMePlanetMetrics.green)
            .lineLimit(1)
            .padding(.top, 4)
          HStack(spacing: 6) {
            if !card.her.day.isEmpty { tag(card.her.day) }
            if !card.her.tag.isEmpty { tag(card.her.tag) }
          }
          .padding(.top, 9)
        }
        Spacer(minLength: 0)
      }
      .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(card.a11y)
    .accessibilityAddTraits(.isButton)
  }

  private func tag(_ text: String) -> some View {
    Text(text)
      .kText(.mono(9.5, .semibold, tracking: 0.14))
      .foregroundStyle(theme.ink)
      .lineLimit(1)
      .padding(.horizontal, 8)
      .padding(.vertical, 5)
      .background(RoundedRectangle(cornerRadius: 7, style: .continuous).fill(theme.soft2))
  }
}

/// Her journey: the four stops, each drawn as she was (or will be) there.
struct KMeJourneyStrip: View {
  let her: KMeHerBadge
  let skin: KWrenSkin
  let theme: KTheme

  var body: some View {
    VStack(alignment: .leading, spacing: 7) {
      Text(her.journeyTitle)
        .kText(.mono(8.5, .semibold, tracking: 0.18))
        .foregroundStyle(theme.sub)
        .lineLimit(1)
      HStack(alignment: .top, spacing: 0) {
        ForEach(her.stops) { stop in
          let now = stop.state == "now"
          VStack(spacing: 4) {
            ZStack {
              Circle().fill(now ? theme.sf : theme.soft2)
              if now {
                Circle().strokeBorder(theme.isDark ? theme.ind : KMePlanetMetrics.green, lineWidth: 2.2)
              }
              KWrenBird(KWrenLook(skin: skin, stage: KWrenStage(rawValue: stop.id) ?? .wren), size: 28)
                .opacity(stop.state == "later" ? 0.3 : 1)
            }
            .frame(width: 42, height: 42)
            Text(stop.name)
              .kText(.mono(8.5, now ? .bold : .semibold, tracking: 0.12))
              .foregroundStyle(now ? theme.ink : theme.sub)
              .lineLimit(1)
              .minimumScaleFactor(0.7)
          }
          .frame(maxWidth: .infinity)
        }
      }
      .background(alignment: .top) {
        Rectangle().fill(theme.line).frame(height: 1.5).padding(.horizontal, 44).offset(y: 20)
      }
      if !her.next.isEmpty {
        Text(her.next)
          .kText(.mono(9.5, .semibold, tracking: 0.12))
          .foregroundStyle(theme.sub)
          .lineLimit(2)
          .multilineTextAlignment(.leading)
          .fixedSize(horizontal: false, vertical: true)
      }
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(her.a11y)
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

  /// the row's width, read once it is laid out (the card's inner width on a 402pt screen until then)
  @State private var width: CGFloat = 338

  /// the arrow's column
  private static let arrow: CGFloat = 26

  var body: some View {
    let palette = card.planet.palette
    // the hour's green by day; at night, and on a dark theme, the theme's indigo
    let accent = (palette.moon || theme.isDark) ? theme.ind : palette.button
    let n = max(1, card.shelf.count)
    let gap: CGFloat = n > 4 ? 6 : 10
    // the looks share what the arrow leaves, and are never larger than a chip of four was
    let side = min(52, max(30, ((width - Self.arrow - gap * CGFloat(n)) / CGFloat(n)).rounded(.down)))
    HStack(alignment: .top, spacing: gap) {
      ForEach(card.shelf) { item in
        // a First Class look stands on its own cream paper; on a dark theme that paper would be
        // six white squares in a row, so it keeps the theme's tile and the gold dashes say it
        KMeShelfChip(item: item, side: side, nameWidth: side + gap - 2, ground: theme.soft2, paper: theme.isDark ? theme.soft2 : KMePlanetMetrics.chipPaper, cut: theme.sf, ring: accent, ink: theme.sub) {
          actions.onLook(item.id)
        }
      }
      // all of her looks: an arrow, no words (owner, 2026-11-11); it takes what is left of the row
      SwiftUI.Button(action: { actions.onAllLooks() }) {
        HStack(spacing: 0) {
          Spacer(minLength: 0)
          KLineIcon(.chevronRight, size: 18, lineWidth: 2.2, color: accent)
        }
        .frame(minWidth: Self.arrow - gap, maxWidth: .infinity)
        .frame(height: side)
        .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
      .accessibilityLabel(card.allLooks)
      .accessibilityHint(card.allLooksHint)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width = $0 }
  }
}

struct KMeShelfChip: View {
  let item: KMeShelfLook
  /// the tile's side: 52 for a shelf of four, smaller when six share the row
  var side: CGFloat = 52
  /// how wide the name may run under it
  var nameWidth: CGFloat = 62
  /// the tile she stands on
  let ground: Color
  /// the tile a First Class look stands on
  var paper: Color = KMePlanetMetrics.chipPaper
  /// the card's own colour: a badge is cut out of the tile in it (white would ring it on a dark card)
  var cut: Color = .white
  let ring: Color
  let ink: Color
  let onTap: () -> Void

  var body: some View {
    let k = side / 52
    SwiftUI.Button(action: onTap) {
      VStack(spacing: 5) {
        ZStack {
          RoundedRectangle(cornerRadius: 16 * k, style: .continuous)
            .fill(item.firstClass ? paper : ground)
          if item.firstClass {
            RoundedRectangle(cornerRadius: 15 * k, style: .continuous)
              .strokeBorder(KBrand.waxGold, style: StrokeStyle(lineWidth: 2, dash: [5, 4]))
          }
          KWrenBird(item.look, size: 42 * k)
            .opacity(item.dim ? 0.45 : 1)
        }
        .frame(width: side, height: side)
        .overlay {
          if item.worn {
            RoundedRectangle(cornerRadius: 16 * k + 2.5, style: .continuous)
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
        // a long name (HEADPHONES, a translation) takes a second line before it shrinks
        Text(item.name)
          .kText(.mono(7.5, .semibold, tracking: 0.08))
          .foregroundStyle(ink)
          .multilineTextAlignment(.center)
          .lineLimit(2)
          .minimumScaleFactor(0.75)
          .frame(width: nameWidth, alignment: .top)
      }
      .frame(width: side)
      .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityLabel(item.a11y.isEmpty ? item.name : item.a11y)
    .accessibilityHint(item.hint)
    .accessibilityAddTraits(item.worn ? .isSelected : [])
  }

  private func badge(_ fill: Color, _ glyph: KLineGlyph) -> some View {
    // a little smaller on a smaller tile, so two neighbours' badges keep apart
    let d: CGFloat = side >= 50 ? 21 : 18
    return ZStack {
      Circle().fill(cut)
      Circle().fill(fill).padding(2)
      KLineIcon(glyph, size: d * 0.43, lineWidth: 3, color: .white)
    }
    .frame(width: d, height: d)
  }
}

// MARK: - Under the card: the two tiles about your writing

/// A tile: its name on an ink chip, a picture in a 16:9 panel, a title, a line of state.
struct KMeWritingTile<Art: View, Foot: View>: View {
  let chip: String
  let title: String
  let a11y: String
  let hint: String
  let enabled: Bool
  var theme: KTheme = .classic
  let onTap: () -> Void
  @ViewBuilder let art: Art
  @ViewBuilder let foot: Foot

  var body: some View {
    let tone = KMeTileTone(theme)
    SwiftUI.Button(action: onTap) {
      VStack(alignment: .leading, spacing: 0) {
        KMeTileChip(text: chip, fill: tone.chip, ink: tone.chipText)
        // the panel is 16:9 whatever is in it (the named scenes are 16:9; the rest sit in its middle)
        RoundedRectangle(cornerRadius: 14, style: .continuous).fill(theme.soft2)
          .aspectRatio(16.0 / 9.0, contentMode: .fit)
          .overlay { art }
          .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
          .padding(.top, 10)
          .accessibilityHidden(true)
        Text(title)
          .kText(.system(15, .semibold, lineHeight: 19.0 / 15.0))
          .foregroundStyle(tone.ink)
          .lineLimit(2)
          .multilineTextAlignment(.leading)
          .fixedSize(horizontal: false, vertical: true)
          .frame(maxWidth: .infinity, minHeight: 38, alignment: .topLeading)
          .padding(.top, 10)
        foot
          .frame(maxWidth: .infinity, minHeight: 28, alignment: .topLeading)
          .padding(.top, 6)
        Spacer(minLength: 0)
      }
      .padding(14)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(tone.fill))
      .kSoftLift(theme, radius: 24)
      .contentShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }
    .buttonStyle(KFadePressStyle())
    .disabled(!enabled)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(a11y)
    .accessibilityHint(enabled ? hint : "")
    .accessibilityAddTraits(enabled ? .isButton : .isStaticText)
    .accessibilityRemoveTraits(enabled ? [] : .isButton)
  }
}

/// A tile's line of state: small capitals, two lines at most.
struct KMeTileLine: View {
  let text: String
  let ink: Color

  var body: some View {
    Text(text)
      .kText(.mono(9.5, .semibold, tracking: 0.1))
      .foregroundStyle(ink)
      .lineLimit(3)
      .multilineTextAlignment(.leading)
      .fixedSize(horizontal: false, vertical: true)
  }
}

/// The Aura tile: its picture (TS's `auraArt`: the ladder's drawing, or the named scene), what
/// it is called, and how far along it is — the meter and its caption until it has a name, then
/// how many letters it is read from.
struct KMeAuraTile<Art: View>: View {
  let aura: KMeAura?
  let chip: String
  let hint: String
  var theme: KTheme = .classic
  let onTap: () -> Void
  @ViewBuilder let art: Art

  var body: some View {
    let label = [aura?.label ?? "", aura?.title ?? "", aura?.caption ?? "", aura?.from ?? ""].filter { !$0.isEmpty }.joined(separator: ", ")
    KMeWritingTile(chip: chip.isEmpty ? (aura?.label ?? "") : chip, title: aura?.title ?? "", a11y: label, hint: hint, enabled: true, theme: theme, onTap: onTap) {
      art
    } foot: {
      if let aura, !aura.caption.isEmpty, !aura.share {
        VStack(alignment: .leading, spacing: 6) {
          HStack(spacing: 4) {
            ForEach(0..<max(0, aura.meter.total), id: \.self) { i in
              Capsule().fill(i < aura.meter.filled ? theme.ink : theme.line).frame(width: 18, height: 4)
            }
          }
          KMeTileLine(text: aura.caption.uppercased(), ink: theme.sub)
        }
      } else {
        KMeTileLine(text: aura?.from ?? "", ink: theme.sub)
      }
    }
  }
}

/// The report tile. Until the first report it is a card to punch, a hole a piece; then a sheet:
/// ready (a lamp by its line), read (a tick), or behind First Class (a gold lock).
struct KMeReportTileView: View {
  let report: KMeReport
  let tile: KMeReportTile
  let chip: String
  var theme: KTheme = .classic
  let onTap: () -> Void

  var body: some View {
    let label = [chip, report.title, report.sub].filter { !$0.isEmpty }.joined(separator: ", ")
    KMeWritingTile(chip: chip, title: report.title, a11y: label, hint: report.hint, enabled: report.enabled, theme: theme, onTap: onTap) {
      picture
    } foot: {
      if tile.state == "ready" {
        HStack(alignment: .top, spacing: 6) {
          KMeLogLamp(breathe: false).padding(.top, 0.5)
          KMeTileLine(text: report.sub.uppercased(), ink: theme.ink)
        }
      } else {
        KMeTileLine(text: report.sub.uppercased(), ink: theme.sub)
      }
    }
  }

  @ViewBuilder private var picture: some View {
    if tile.state == "progress" || tile.state == "none" {
      punchCard
    } else {
      sheet
    }
  }

  /// two rows of holes: the pieces written so far, punched
  private var punchCard: some View {
    let need = max(1, min(tile.need, 20))
    let perRow = (need + 1) / 2
    return VStack(spacing: 7) {
      ForEach(0..<2, id: \.self) { row in
        HStack(spacing: 7) {
          ForEach(0..<perRow, id: \.self) { column in
            let i = row * perRow + column
            ZStack {
              if i >= need {
                Color.clear
              } else if i < tile.have {
                Circle().fill(theme.ink)
                KLineIcon(.check, size: 9, lineWidth: 3.2, color: theme.bg)
              } else {
                Circle().strokeBorder(theme.faint, style: StrokeStyle(lineWidth: 1.6, dash: [3, 3]))
              }
            }
            .frame(width: 18, height: 18)
          }
        }
      }
    }
  }

  /// the report as a sheet on another: its corner says which one, a bar for its headline
  private var sheet: some View {
    let quiet = tile.state != "ready"
    let paper = theme.isDark ? theme.soft2 : Color.white
    let shade = Color(hex: "#1E1B35")
    return ZStack {
      RoundedRectangle(cornerRadius: 7, style: .continuous).fill(paper)
        .frame(width: 58, height: 66)
        .shadow(color: shade.opacity(0.10), radius: 3, x: 0, y: 2)
        .rotationEffect(.degrees(6))
        .offset(x: 9, y: 2)
      VStack(alignment: .leading, spacing: 5) {
        Text(tile.tag)
          .kText(.mono(8.5, .bold, tracking: 0.12))
          .foregroundStyle(quiet ? theme.sub : theme.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
        Capsule().fill(quiet ? theme.line : theme.ink).frame(width: 38, height: 4)
        Capsule().fill(theme.line).frame(width: 26, height: 4)
        Capsule().fill(theme.line).frame(width: 32, height: 4)
        Capsule().fill(theme.line).frame(width: 20, height: 4)
      }
      .padding(9)
      .frame(width: 58, height: 66, alignment: .topLeading)
      .background(RoundedRectangle(cornerRadius: 7, style: .continuous).fill(paper))
      .shadow(color: shade.opacity(0.14), radius: 4, x: 0, y: 3)
      .rotationEffect(.degrees(-4))
      .overlay(alignment: .bottomTrailing) {
        if tile.state == "done" {
          ZStack {
            Circle().fill(KMePlanetMetrics.tick)
            KLineIcon(.check, size: 10, lineWidth: 3.2, color: .white)
          }
          .frame(width: 20, height: 20)
          .offset(x: 8, y: 6)
        } else if tile.state == "locked" {
          ZStack {
            Circle().fill(KBrand.waxGold)
            KLineIcon(.lock, size: 10, lineWidth: 2.6, color: KBrand.inkOnBrand)
          }
          .frame(width: 22, height: 22)
          .offset(x: 9, y: 7)
        }
      }
    }
  }
}
