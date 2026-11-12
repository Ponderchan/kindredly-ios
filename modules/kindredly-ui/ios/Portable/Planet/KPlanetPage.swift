import SwiftUI

/* THE PLANET PAGE — about your letters (docs/courier-planet.md, decision 8).
   ─────────────────────────────────────────────────────────────────────────────
   Opened by the round button on her card and by Track on her page. Her page
   (Open) is about her; this one is about what she has carried.

     ‹  YOUR COURIER                                  the hour's sky, under the
                    ( the planet )                    status bar: the planet,
     DRAG TO SPIN · PINCH TO ZOOM             − +     larger, zoomable
     ( her words, in the bubble; no button )
     [ 1 ON THE WAY ] [ 12 CARRIED ] [ ● 37 ON DESKS ]
     TRACK                                   3 / 12
     ‹ one slip at a time: its stamp, the day and  ›  a pager; the neighbours
       its opening, its rows, Go to the Door          peek, dimmed
     [ My letters                              12 ]

   THE PLANET IS THE INDEX. Swiping to a slip turns the planet to that letter's
   stamp; tapping a stamp brings its slip; turning the planet by hand brings the
   slip of the stamp now facing you. A slip with no stamp (a reply of yours that
   answered someone else's letter) turns nothing.

   Zoom: two fingers, a double tap, or the two round buttons. Closer in, each
   stamp shows its day. The whole scene takes the finger; the page scrolls
   from everything under it.

   THE SLIP IT OPENS ON is TS's (`open`: the run she is on, else the newest
   letter). The letters arrive after the page does, so the page follows `open`
   until the reader picks a slip; after that the choice is theirs.

   Every word is TS's (src/screens/planet). This file's state is the slip on
   show and whether the hint has gone. */

// MARK: - What it shows

/// One letter's slip (or one run's, when the reply she carries answered someone else's letter).
public struct KPlanetSlip: Identifiable, Equatable, Sendable {
  public var id: String
  /// the planet's letter this slip belongs to; "" when there is no stamp for it
  public var letter: String
  /// the stamp drawn on the slip; "" for none
  public var stamp: String
  public var stampHex: String
  /// NOV 3 · CRUSH
  public var head: String
  /// how the letter opens (two lines at most); "" for none
  public var body: String
  /// the rows, as the post files them; the last is where it stands now
  public var rows: [String]
  /// the row a reader's lamp stands before; -1 for none
  public var lamp: Int
  /// Go to the Door; "" for none
  public var cta: String
  public var a11y: String

  public init(id: String, letter: String, stamp: String, stampHex: String = "", head: String, body: String, rows: [String], lamp: Int = -1, cta: String = "", a11y: String = "") {
    self.id = id
    self.letter = letter
    self.stamp = stamp
    self.stampHex = stampHex
    self.head = head
    self.body = body
    self.rows = rows
    self.lamp = lamp
    self.cta = cta
    self.a11y = a11y
  }
}

/// One of the three figures.
public struct KPlanetFigure: Identifiable, Equatable, Sendable {
  /// way | carried | desks
  public var id: String
  public var value: String
  public var label: String
  /// a reader's lamp before the label (ON DESKS)
  public var lamp: Bool
  public var a11y: String

  public init(id: String, value: String, label: String, lamp: Bool = false, a11y: String = "") {
    self.id = id
    self.value = value
    self.label = label
    self.lamp = lamp
    self.a11y = a11y
  }
}

public struct KPlanetPageContent: Equatable, Sendable {
  /// the planet: the sky, the letters, her. `selected` is the page's own (the slip on show).
  public var planet = KPlanetContent()
  /// YOUR COURIER, or DAY OFF
  public var chip = ""
  /// DRAG TO SPIN · PINCH TO ZOOM
  public var hint = ""
  public var name = ""
  public var time = ""
  public var line = ""
  public var aside = ""
  public var figures: [KPlanetFigure] = []
  /// TRACK
  public var track = ""
  public var slips: [KPlanetSlip] = []
  /// no slip at all: NOTHING IN TRANSIT / WRITE, AND SHE FLIES
  public var emptyRows: [String] = []
  /// the slip the page opens on; "" for the first
  public var open = ""
  /// My letters, and how many
  public var myLetters = ""
  public var myLettersCount = ""
  /// VoiceOver: the back chevron, the two zoom buttons, the scene's sentence
  public var back = ""
  public var zoomIn = ""
  public var zoomOut = ""
  public var a11y = ""

  public init() {}
}

public final class KPlanetPageActions {
  public var onBack: () -> Void = {}
  /// Go to the Door on a slip (its id)
  public var onGo: (String) -> Void = { _ in }
  public var onMyLetters: () -> Void = {}

  public init() {}
}

enum KPlanetPageMetrics {
  /// the scene under the status bar (380 with a 54-point bar, as the prototype)
  static let sceneBody: CGFloat = 326
  static let side: CGFloat = 16
  /// a slip is the page less 36: the neighbours peek 8 past the 10 between slips
  static let slipInset: CGFloat = 18
  static let slipGap: CGFloat = 10
}

// MARK: - The page

public struct KPlanetScreen: View {
  private let content: KPlanetPageContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let actions: KPlanetPageActions

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var probe = KPlanetProbe()
  /// the slip on show: the pager's position
  @State private var current: String?
  @State private var turned = false
  /// the slip the page last put on show itself (it opens on `content.open`, and follows it while
  /// the letters are still arriving), and whether the reader has since picked one: then it is theirs
  @State private var followed: String?
  @State private var chosen = false
  /// how far the page is pulled up past its end, and whether letting go now goes back to Me
  @State private var pullUp: CGFloat = 0
  @State private var armedUp = false
  /// how far past the end the page has to be pulled to go back
  private static let backPull: CGFloat = 84

  /// - Parameters:
  ///   - topInset: the status bar's height (the sky runs under it)
  ///   - bottomInset: the home indicator's
  public init(content: KPlanetPageContent, topInset: CGFloat, bottomInset: CGFloat, actions: KPlanetPageActions) {
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
    let open = content.slips.first(where: { $0.id == content.open })?.id ?? content.slips.first?.id
    _current = State(initialValue: open)
    _followed = State(initialValue: open)
  }

  private var palette: KCourierPalette { content.planet.palette }

  private var slipOnShow: KPlanetSlip? {
    content.slips.first(where: { $0.id == current }) ?? content.slips.first
  }

  /// The planet, with the slip on show as its selected letter.
  private var planet: KPlanetContent {
    var p = content.planet
    let letter = slipOnShow?.letter ?? ""
    p.selected = letter.isEmpty ? nil : letter
    return p
  }

  public var body: some View {
    GeometryReader { geo in
      ScrollView(.vertical) {
        VStack(spacing: 0) {
          KPlanetPageScene(
            content: content,
            planet: planet,
            topInset: topInset,
            probe: probe,
            turned: turned,
            onBack: { actions.onBack() },
            onTap: { what in tapped(what) },
            onPick: { letter in show(letter: letter) },
            onTurned: { turned = true }
          )
          // her words are not on this page (owner, 2026-11-11: "星球那里 track log 不要"): the
          // figures follow the scene
          KPlanetFigures(figures: content.figures, palette: palette)
            .padding(.top, 12)
          track(width: geo.size.width)
        }
        .padding(.bottom, bottomInset + 44)
      }
      .scrollIndicators(.hidden)
      /* PULLED DOWN ON ME, THE PLANET CAME OUT; PULLED UP HERE, ME COMES BACK (owner, 2026-11-12:
         "下拉星球出来，上滑回到 default me tab"). The page always bounces; past its end by
         `backPull`, letting go goes back. A light tap at the line, and the arrow at the foot
         pops. The chevron top left still goes back too (VoiceOver has no pull). */
      .scrollBounceBehavior(.always)
      .onScrollGeometryChange(for: CGFloat.self) { g in
        let end = max(0, g.contentSize.height + g.contentInsets.top + g.contentInsets.bottom - g.containerSize.height)
        return g.contentOffset.y + g.contentInsets.top - end
      } action: { _, y in
        let v = max(0, (y * 2).rounded() / 2)
        if v != pullUp { pullUp = v }
        let now = v >= Self.backPull
        if now != armedUp { armedUp = now }
      }
      .onScrollPhaseChange { old, new in
        if old == .interacting, new != .interacting, armedUp { actions.onBack() }
      }
      .sensoryFeedback(.impact(weight: .light), trigger: armedUp) { _, now in now }
      .overlay(alignment: .bottom) {
        // the one hint: an arrow at the foot, quiet at rest
        let p = min(1, pullUp / Self.backPull)
        KLineIcon(.chevronDown, size: 20, lineWidth: 2.6, color: palette.ink)
          .rotationEffect(.degrees(180))
          .opacity(0.4 + 0.5 * Double(p))
          .scaleEffect(armedUp ? 1.3 : 1)
          .animation(.spring(response: 0.25, dampingFraction: 0.6), value: armedUp)
          .padding(.bottom, bottomInset + 10 + pullUp * 0.4)
          .allowsHitTesting(false)
          .accessibilityHidden(true)
      }
    }
    .background { palette.scrim.ignoresSafeArea() }
    .ignoresSafeArea(.keyboard)
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
    .onChange(of: content.slips.map(\.id)) { _, _ in follow() }
    .onChange(of: content.open) { _, _ in follow() }
    .onChange(of: current) { _, now in
      // a swipe, a tapped slip or stamp, a turn of the planet: the reader's choice from here on
      if now != followed { chosen = true }
    }
  }

  /// The slip the page should be on when its content changes: the one TS says to open on (the
  /// run she is on, else the newest letter) until the reader picks one; theirs after that, for as
  /// long as it is still in the list (a letter taken back leaves it).
  private func follow() {
    let ids = content.slips.map(\.id)
    if chosen, let current, ids.contains(current) { return }
    let wanted = ids.contains(content.open) ? content.open : ids.first
    guard current != wanted else { return }
    followed = wanted
    current = wanted
  }

  // ── TRACK: one slip at a time ──

  private func track(width: CGFloat) -> some View {
    let slips = content.slips
    let index = slips.firstIndex(where: { $0.id == current }) ?? 0
    let slipWidth = max(0, width - KPlanetPageMetrics.slipInset * 2)
    return VStack(alignment: .leading, spacing: 0) {
      KPlanetTrackHead(title: content.track, count: slips.isEmpty ? "" : "\(index + 1) / \(slips.count)", palette: palette)
      if slips.isEmpty {
        KPlanetSlipCard(slip: KPlanetSlip(id: "", letter: "", stamp: "", head: "", body: "", rows: content.emptyRows), palette: palette, onShow: true, onGo: {})
          .padding(.horizontal, KPlanetPageMetrics.slipInset)
      } else {
        ScrollViewReader { reader in
          ScrollView(.horizontal) {
            HStack(alignment: .top, spacing: KPlanetPageMetrics.slipGap) {
              ForEach(slips) { slip in
                KPlanetSlipCard(slip: slip, palette: palette, onShow: slip.id == slipOnShow?.id) {
                  actions.onGo(slip.id)
                }
                .frame(width: slipWidth)
                .id(slip.id)
                .onTapGesture {
                  if slip.id != current { show(slip: slip.id) }
                }
              }
            }
            .scrollTargetLayout()
          }
          .contentMargins(.horizontal, KPlanetPageMetrics.slipInset, for: .scrollContent)
          .scrollTargetBehavior(.viewAligned)
          .scrollPosition(id: $current)
          .scrollIndicators(.hidden)
          .onAppear {
            // the page may open on a slip that is not the first (the run she is on): the
            // position's first value is not always honoured, so the pager is put there by hand
            if let current, current != slips.first?.id { reader.scrollTo(current, anchor: .center) }
          }
        }
      }
      // no "My letters" row (owner, 2026-11-12: "track 那里不是有了吗"): the slips are the letters
      // here, and the postbox on Me's cover is the door to the list
    }
    .padding(.top, 10)
  }

  // ── what a tap and a turn do ──

  private func tapped(_ what: KPlanetTap) {
    switch what {
    case let .stamp(letter):
      show(letter: letter)
    case .letter:
      // the reply she set down: its slip, where Go to the Door is
      if let slip = content.slips.first(where: { !$0.cta.isEmpty }) { show(slip: slip.id) }
    case .wren:
      break
    }
  }

  /// The slip of a letter on the planet (its stamp was tapped, or turned to face the reader).
  private func show(letter: String) {
    guard let slip = content.slips.first(where: { $0.letter == letter }) else { return }
    show(slip: slip.id)
  }

  private func show(slip id: String) {
    guard id != current else { return }
    if reduceMotion {
      current = id
    } else {
      withAnimation(.easeInOut(duration: 0.3)) { current = id }
    }
  }
}

// MARK: - Its parts

extension KCourierPalette {
  /// The planet page's tiles: a pane of white on the hour's deep tone, thinner at night.
  var planetGlass: Color { Color.white.opacity(moon ? 0.14 : 0.5) }
}

/// The scene: the sky under the status bar, the planet, the back chevron and the chip, the hint,
/// the two zoom keys.
struct KPlanetPageScene: View {
  let content: KPlanetPageContent
  /// the planet with the slip on show selected
  let planet: KPlanetContent
  let topInset: CGFloat
  let probe: KPlanetProbe
  /// the planet has been turned: the hint goes
  let turned: Bool
  let onBack: () -> Void
  let onTap: (KPlanetTap) -> Void
  let onPick: (String) -> Void
  let onTurned: () -> Void

  var body: some View {
    let palette = planet.palette
    ZStack(alignment: .topLeading) {
      KPlanetView(kind: .page, content: planet, probe: probe, onTap: onTap, onPick: onPick, onTurned: onTurned)
      Color.clear
        .allowsHitTesting(false)
        .accessibilityElement()
        .accessibilityLabel(content.a11y)
        .accessibilityAddTraits(.isImage)
      HStack(alignment: .center, spacing: 8) {
        SwiftUI.Button(action: onBack) {
          ZStack {
            Circle().fill(Color.white.opacity(0.72))
            KLineIcon(.chevronLeft, size: 18, lineWidth: 2.2, color: KBrand.inkOnBrand)
          }
          .frame(width: 36, height: 36)
          .padding(4)
          .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        .accessibilityLabel(content.back)
        Text(content.chip)
          .kText(.mono(11, .bold, tracking: 0.16))
          .foregroundStyle(palette.chipText)
          .lineLimit(1)
          .padding(.horizontal, 10)
          .padding(.vertical, 6)
          .background(RoundedRectangle(cornerRadius: 7, style: .circular).fill(palette.chip))
          .accessibilityHidden(true)
      }
      .padding(.leading, 8)
      .padding(.top, topInset)
      // no "drag to spin · pinch to zoom" (owner, 2026-11-12: let people find it); the two keys stay
      HStack(spacing: 8) {
        zoomKey("−", label: content.zoomOut) { probe.zoom(by: 1 / 1.35) }
        zoomKey("+", label: content.zoomIn) { probe.zoom(by: 1.35) }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
      .padding(.trailing, 14)
      .padding(.bottom, 12)
    }
    .frame(height: topInset + KPlanetPageMetrics.sceneBody)
    .accessibilityElement(children: .contain)
  }

  private func zoomKey(_ sign: String, label: String, action: @escaping () -> Void) -> some View {
    SwiftUI.Button(action: action) {
      Text(verbatim: sign)
        .font(.system(size: 19, weight: .semibold))
        .foregroundStyle(KBrand.inkOnBrand)
        .frame(width: 34, height: 34)
        .background(Circle().fill(Color.white.opacity(0.72)))
        .padding(5)
        .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .padding(-5)
    .accessibilityLabel(label)
  }
}

/// The three figures: ON THE WAY, CARRIED, ON DESKS.
struct KPlanetFigures: View {
  let figures: [KPlanetFigure]
  let palette: KCourierPalette

  var body: some View {
    HStack(spacing: 10) {
      ForEach(figures) { figure in
        VStack(alignment: .leading, spacing: 1) {
          Text(figure.value)
            .kText(.system(22, .semibold))
            .monospacedDigit()
            .foregroundStyle(palette.text)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
          HStack(spacing: 5) {
            if figure.lamp { KPlanetLampDot() }
            Text(figure.label)
              .kText(.mono(9.5, .semibold, tracking: 0.14))
              .foregroundStyle(palette.text.opacity(0.75))
              .lineLimit(1)
              .minimumScaleFactor(0.6)
          }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(palette.planetGlass))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(figure.a11y.isEmpty ? "\(figure.value) \(figure.label)" : figure.a11y)
      }
    }
    .padding(.horizontal, KPlanetPageMetrics.side)
    .padding(.top, 4)
  }
}

/// TRACK, and which slip of how many.
struct KPlanetTrackHead: View {
  let title: String
  /// "3 / 12"; "" for none
  let count: String
  let palette: KCourierPalette

  var body: some View {
    HStack {
      Text(title)
      Spacer(minLength: 8)
      if !count.isEmpty {
        Text(verbatim: count)
          .monospacedDigit()
      }
    }
    .kText(.mono(9.5, .semibold, tracking: 0.14))
    .foregroundStyle(palette.text.opacity(0.7))
    .lineLimit(1)
    .frame(minHeight: 22)
    .padding(.horizontal, KPlanetPageMetrics.side)
    .accessibilityElement(children: .combine)
    .accessibilityAddTraits(.isHeader)
  }
}

/// The way to the whole list: My letters, and how many.
struct KPlanetMyLettersRow: View {
  let title: String
  let count: String
  let palette: KCourierPalette
  let onTap: () -> Void

  var body: some View {
    SwiftUI.Button(action: onTap) {
      HStack {
        Text(title)
          .kText(.system(13, .semibold))
          .foregroundStyle(palette.text)
        Spacer(minLength: 8)
        Text(count)
          .kText(.mono(11, .semibold))
          .monospacedDigit()
          .foregroundStyle(palette.text.opacity(0.75))
        KLineIcon(.chevronRight, size: 12, lineWidth: 2.2, color: palette.text.opacity(0.6))
      }
      .padding(.horizontal, 14)
      .frame(minHeight: 44)
      .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(palette.planetGlass))
      .contentShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
    .buttonStyle(KFadePressStyle())
    .padding(.horizontal, KPlanetPageMetrics.side)
    .padding(.top, 12)
    .accessibilityElement(children: .combine)
  }
}

// MARK: - A slip

/// A reader's lamp, beside words: lit gold with a dark edge so it reads on a pale sky too.
struct KPlanetLampDot: View {
  var body: some View {
    Circle()
      .fill(KPlanetBubble.lampGold)
      .frame(width: 7, height: 7)
      .overlay(Circle().strokeBorder(Color(hex: "#1E1B35").opacity(0.3), lineWidth: 1))
      .shadow(color: KPlanetBubble.lampGold.opacity(0.9), radius: 3)
      .accessibilityHidden(true)
  }
}

struct KPlanetSlipCard: View {
  let slip: KPlanetSlip
  let palette: KCourierPalette
  /// the slip on show; its neighbours are dimmed
  let onShow: Bool
  let onGo: () -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /// how the letter opens is content: the reader's own font (Settings)
  @Environment(\.kLetterFace) private var face

  var body: some View {
    let ink = palette.text
    VStack(alignment: .leading, spacing: 10) {
      if !slip.head.isEmpty || !slip.body.isEmpty {
        HStack(alignment: .center, spacing: 12) {
          if !slip.stamp.isEmpty {
            KStamp(id: slip.stamp, width: 38, dark: false, fallbackHex: slip.stampHex.isEmpty ? nil : slip.stampHex)
              .accessibilityHidden(true)
          }
          VStack(alignment: .leading, spacing: 2) {
            Text(slip.head)
              .kText(.mono(10, .semibold, tracking: 0.1))
              .foregroundStyle(ink.opacity(0.75))
              .lineLimit(1)
              .minimumScaleFactor(0.75)
            if !slip.body.isEmpty {
              // two lines when it has them: never squeezed to one by a tight page
              Text(slip.body)
                .kText(.content(face.fitSize(13.5), lineHeight: 18.0 / 13.5))
                .foregroundStyle(ink)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
            }
          }
          .frame(maxWidth: .infinity, alignment: .leading)
        }
        .accessibilityElement(children: .combine)
      }
      HStack(alignment: .bottom, spacing: 8) {
        VStack(alignment: .leading, spacing: 6) {
          ForEach(Array(slip.rows.enumerated()), id: \.offset) { i, row in
            HStack(alignment: .center, spacing: 8) {
              ZStack {
                Circle().strokeBorder(ink, lineWidth: 2)
                if i == slip.rows.count - 1 { Circle().fill(ink) }
              }
              .frame(width: 9, height: 9)
              if i == slip.lamp { KPlanetLampDot() }
              Text(row)
                .kText(.mono(10.5, .semibold, tracking: 0.1))
                .foregroundStyle(ink)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
            }
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
        if !slip.cta.isEmpty {
          SwiftUI.Button(action: onGo) {
            Text(slip.cta)
              .kText(.system(12.5, .semibold))
              .foregroundStyle(palette.moon ? KBrand.inkOnBrand : palette.buttonText)
              .lineLimit(1)
              .padding(.horizontal, 13)
              .frame(height: 30)
              .background(Capsule().fill(palette.moon ? Color.white : palette.button))
          }
          .buttonStyle(KFadePressStyle())
          .fixedSize()
        }
      }
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 12)
    .frame(maxWidth: .infinity, alignment: .topLeading)
    .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(palette.planetGlass))
    .contentShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    .opacity(onShow ? 1 : 0.55)
    .animation(reduceMotion ? nil : .easeOut(duration: 0.2), value: onShow)
    .modifier(KPlanetSlipVoice(slip: slip, onShow: onShow))
  }
}

/// How VoiceOver hears a slip. Without a button it is one element: its day and stamp, how the
/// letter opens, its rows, in one sentence. With Go to the Door it is three: the letter, where it
/// stands, the button. The slip on show is the selected one.
private struct KPlanetSlipVoice: ViewModifier {
  let slip: KPlanetSlip
  let onShow: Bool

  func body(content: Content) -> some View {
    if slip.cta.isEmpty {
      content
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(slip.a11y.isEmpty ? ([slip.head, slip.body] + slip.rows).filter { !$0.isEmpty }.joined(separator: ". ") : slip.a11y)
        .accessibilityAddTraits(onShow ? .isSelected : [])
    } else {
      content
        .accessibilityElement(children: .contain)
    }
  }
}
