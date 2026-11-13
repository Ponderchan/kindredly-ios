// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE CONTROL BAND, B8 (letter papers, owner 2026-10-20; CLAUDE-CODE-PROMPTS-NEXT-REPLY.md, contract
 §4.2; before it, Today 3d × 25b "image 2", 2026-10-16/18). 68 tall under the card, full width, its
 own coordinates (origin at the band's top left; on a 393 × 852 phone the band sits at y 684):

        ( ↑ )     (Wren, 40)     ( ↩ )
        Next                     Reply

 - One row, centred, gap 44: Next's disc, Wren, Reply's disc (26 + 44 + 20 = 90 from the middle
   to each disc's centre). Discs of 52, both GLASS since 2026-11-09 (owner, proto8 "glass, as the
   tab bar"): the 10a tab bar's own material (KGlassFace with KGlassTone: the thin material, its
   white tint and top fade, the bright line along the top and the faint dark one along the bottom;
   in Midnight the bar's dark glass), clipped to the disc, and a soft drop outside it only
   (KOuterShadow: 0 6 16 ink .10 and a .5 hairline in ink .07; Midnight black .5), so the disc
   lifts off the page. The bar's 32-blur shadow is sized for a 62-tall capsule and would swallow a
   52 disc, hence the disc's own (the prototype's numbers). Before, they were flat gray 6 (#F2F1F6
   / #272443). Since 2026-11-13 a pearl (owner, of mock ③ "珍珠玻璃"): a milky body, a specular
   across the top and a bright rim over the same glass (KBandDiscStyle), the drop closer.
 - No number on Next: the 10 a day are a ceiling, not a task. Instead a ring of ticks drawn ON
   Next's edge (KDeskRing; the disc keeps its 52): one tick per letter on today's desk, from 12
   o'clock clockwise, a 2.5 round stroke, 4.5 between ticks (3 past eight letters; the round caps
   take 2.5 of each gap), coloured by how far the reader has got: not yet read #DDDAEE, read
   #B9B5F5, replied #3A34D6 (Midnight: white .16, #6F69D8, #8E89FF, the brief's values kept: on the
   dark glass, about 1.7, 3.4 and 5 to 1, three clear steps). The letter on screen counts as read, and
   the ring follows the card the deck shows (deck.shownId) as well as TS's deskAt, so a pass ticks
   at once. A tick changes colour over .25s; under Reduce Motion at once. Reply has no ring in any
   state (the owner's call).
 - Next's glyph is the ↑ in ink, Reply's the ↩ in ind (22, a 2.2 round stroke on a 24 grid, the
   prompt's paths); on the day's LAST letter Next's ↑ becomes a ✓ at the same size and stroke (a
   .25s crossfade, none under Reduce Motion); once the desk is done the band goes as below. The
   labels 6 under the discs in system 500 11 at .02em, Next's in mute (the dark themes' sub,
   #B9B5D0, as the prompt asks), Reply's in ind.
 - Pressed, a disc takes the tab bar lens's tint over its glass (ink .06; Midnight white .1) and
   shrinks to .96 in 80ms; let go, it springs back over .25s on cubic-bezier(.3, 1.3, .5, 1).
 - Wren (KWireWren draws her) stands between them at 40, her centre on the discs' midline.

 Every word is TS's: Next, Reply and what VoiceOver says (labels.nextA11y, "Next letter", and
 labels.replyA11y); the ring and the ✓ are pictures, hidden from VoiceOver. Its states:
 - hidden (a send in flight, the reader open, the + open): everything fades out and takes no
   touches (bandFade);
 - typing (the reply field has the keyboard, or a send it let go of awaits TS): the same, the
   whole band at opacity 0 with no touches (bandFade), and nothing moves (the chat composers' A1,
   owner 2026-10-18). The tab bar slides away meanwhile, the card shrinks and the reply box rises
   (KTodayDesk), and the band fades back in once the keyboard goes and TS has answered a send;
 - done (flow.bandShown false): the buttons and their labels fade and drop 12;
 - not enabled (loading, offline): the buttons at .4 with no touches.
 Taps are also refused while a card is moving (deck.animating: no re-entry) and while typing.
 The page's ground (KTodayGround, below) is flat since 2026-11-12: the desk puts it behind everything.
 */

/// The band's geometry, in band-local points: origin at the band's top left, W the Host's width.
/// The row is centred at any width; Wren's spot and the window are placed from it. KWireWren, the
/// desk and the done pieces read the same numbers.
enum KBandLayout {
  /// the band's height (KTodayGeometry.controlHeight)
  static let height: CGFloat = KTodayGeometry.controlHeight
  /// Next's and Reply's discs
  static let disc: CGFloat = 52
  /// the label under each disc
  static let labelGap: CGFloat = 6
  /// the row's gap between a disc and Wren
  static let gap: CGFloat = 44
  /// the flight window: 64 tall, its foot 2 above the band's (x 16…W−16)
  static let windowHeight: CGFloat = 64
  /// Wren's size in the window
  static let windowSize: CGFloat = 34

  /// from the middle to a disc's centre: half Wren, the gap, half a disc (20 + 44 + 26)
  static var reach: CGFloat { wrenSize / 2 + gap + disc / 2 }
  /// Next's centre (106.5 at 393)
  static func nextX(_ W: CGFloat) -> CGFloat { W / 2 - reach }
  /// Reply's centre (286.5 at 393)
  static func replyX(_ W: CGFloat) -> CGFloat { W / 2 + reach }

  /// the window's frame top, band-local (its foot 2 above the band's: 2 down)
  static let windowFrameTop: CGFloat = height - 2 - windowHeight
  /// Wren's centre in the window's scene: 53 in, 33 under the window's top (the design's 36, 702 at 34)
  static let window = CGPoint(x: 53, y: windowFrameTop + 33)

  // ── Wren on the ground ──

  /// her size standing between the buttons (B8: 40; the owner's 36 of 2026-10-18 before it)
  static let wrenSize: CGFloat = 40
  /// where her feet fall in her frame (her pictures' feet: WrenBird's 180 of 200; the lean's anchor too)
  static let feetY: CGFloat = 0.9
  /// Wren's centre on the ground, between the buttons on the discs' midline (B8: her foot 26 above
  /// the labels' foot; W/2, 26)
  static func spot(_ W: CGFloat) -> CGPoint {
    CGPoint(x: W / 2, y: disc / 2)
  }

  // ── her flight ──

  /// Wren's centre and size at flight f (0 = her spot on the band, 1 = the window), band-local: one
  /// straight line from her spot into the window (40 → 34).
  static func flightPlace(_ W: CGFloat, _ flight: CGFloat) -> (center: CGPoint, size: CGFloat) {
    let t = min(max(flight, 0), 1)
    let g = spot(W), win = window
    return (
      CGPoint(x: g.x + (win.x - g.x) * t, y: g.y + (win.y - g.y) * t),
      wrenSize + (windowSize - wrenSize) * t
    )
  }
}

struct KControlBand: View {
  private let theme: KTheme
  private let left: Int
  private let desk: [KDeskTick]
  private let deskAt: Int
  private let labels: KTodayLabels
  private let leftA11y: String
  private let enabled: Bool
  private let hidden: Bool
  @ObservedObject private var deck: KDeckState
  @ObservedObject private var flow: KDayFlow
  private let onNext: () -> Void
  private let onReply: () -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  /// - Parameters:
  ///   - left: TS's count of letters on today's desk not yet passed (kept for the record: B8 shows
  ///     no count)
  ///   - labels: Next, Reply and their VoiceOver words (labels.next, .reply, .nextA11y, .replyA11y)
  ///   - leftA11y: the old "Next letter. 3 left today." (kept for the record: B8 says labels.nextA11y)
  ///   - desk, deskAt: today's desk in reading order and the letter on screen's place in it (Next's ring)
  ///   - enabled: false while loading or offline: the buttons at .4, no touches, NEXT empty
  ///   - hidden: hideBand or the + open: the band fades out, no touches
  ///   - onNext: NEXT (the desk calls deck.requestNext())
  ///   - onReply: REPLY (the desk routes it to the shown card's reply)
  init(
    theme: KTheme,
    left: Int,
    labels: KTodayLabels,
    leftA11y: String,
    desk: [KDeskTick],
    deskAt: Int,
    enabled: Bool,
    hidden: Bool,
    deck: KDeckState,
    flow: KDayFlow,
    onNext: @escaping () -> Void,
    onReply: @escaping () -> Void
  ) {
    self.theme = theme
    self.left = left
    self.labels = labels
    self.leftA11y = leftA11y
    self.desk = desk
    self.deskAt = deskAt
    self.enabled = enabled
    self.hidden = hidden
    self._deck = ObservedObject(wrappedValue: deck)
    self._flow = ObservedObject(wrappedValue: flow)
    self.onNext = onNext
    self.onReply = onReply
  }

  /// the buttons take a touch now
  private var active: Bool {
    enabled && !hidden && flow.bandShown && !deck.typing && !deck.animating
  }

  /// the letter on screen's place in the desk: TS's, or the deck's card when it is further on (the
  /// deck shows the next card .3s after TS hears of the pass; a card that left reaches TS first)
  private var at: Int {
    let shown = deck.shownId.flatMap { id in desk.firstIndex { $0.id == id } } ?? -1
    return max(deskAt, shown)
  }

  /// each tick, in the desk's order: replied stays replied; the letter on screen and every one
  /// before it count as read
  private var ticks: [KDeskRing.Tick] {
    let at = at
    return desk.indices.map { i in
      let state = desk[i].state
      if state == .replied { return .replied }
      return i <= at || state == .read ? .read : .unread
    }
  }

  /// the day's last letter is on screen: Next's ↑ becomes a ✓
  private var onLast: Bool {
    !desk.isEmpty && at >= desk.count - 1
  }

  /// the ring's and the ✓'s .25s, nothing under Reduce Motion
  private var tickChange: Animation? {
    reduceMotion ? nil : .easeInOut(duration: 0.25)
  }

  var body: some View {
    let away = hidden || deck.typing
    let height = KBandLayout.height
    GeometryReader { geo in
      let W = geo.size.width
      buttons(W)
        .frame(width: W, height: height, alignment: .topLeading)
    }
    .frame(height: height)
    // stepped aside (hidden) or writing back (typing): out of sight and out of reach, in place
    .opacity(away ? 0 : 1)
    .animation(KTodayMotion.bandFade, value: away)
    .allowsHitTesting(!away)
    .accessibilityHidden(away)
  }

  // ── the two buttons ──

  private func buttons(_ W: CGFloat) -> some View {
    let disc = KBandLayout.disc
    let nx = KBandLayout.nextX(W), rx = KBandLayout.replyX(W)
    // each column is centred on its disc; wide enough for a long label, never past Wren
    let column = max(disc, min(120, 2 * (KBandLayout.reach - KBandLayout.wrenSize / 2) - 8))
    let shown = flow.bandShown
    return ZStack(alignment: .topLeading) {
      control(
        glyph: KBandGlyph.next,
        glyphColor: theme.ink,
        label: labels.next,
        labelColor: theme.isDark ? theme.sub : theme.mute,
        a11y: labels.nextA11y,
        ring: true,
        action: onNext
      )
      .frame(width: column, alignment: .top)
      .offset(x: nx - column / 2)

      control(
        glyph: KBandGlyph.reply,
        glyphColor: theme.ind,
        label: labels.reply,
        labelColor: theme.ind,
        a11y: labels.replyA11y,
        ring: false,
        action: onReply
      )
      .frame(width: column, alignment: .top)
      .offset(x: rx - column / 2)
    }
    // loading or offline: at .4 until the desk is there
    .opacity(enabled ? 1 : 0.4)
    .animation(KTodayMotion.bandFade, value: enabled)
    // done: the buttons fade (.3s) and drop 12 (.35s); a fade alone under Reduce Motion. Each
    // curve pinned here: the flow may land several values in one transaction, and its rest and
    // reset disable animations, which .animation(_:value:) honours.
    .opacity(shown ? 1 : 0)
    .animation(reduceMotion ? KTodayMotion.reduced : KTodayMotion.bandFade, value: shown)
    .offset(y: shown || reduceMotion ? 0 : 12)
    .animation(KTodayMotion.bandSlide, value: shown)
    .allowsHitTesting(active)
    .accessibilityHidden(!shown)
  }

  /// A disc that is the button, and its label 6 under it (a tap on the label presses too; VoiceOver
  /// hears the button's own words, so the label is hidden from it). `ring`: Next's ticks on its
  /// edge, and its ↑ turning into a ✓ on the day's last letter.
  private func control(glyph: KBandGlyph, glyphColor: Color, label: String, labelColor: Color, a11y: String, ring: Bool, action: @escaping () -> Void) -> some View {
    let act = { if active { action() } }
    let size = KBandLayout.disc
    let check = ring && onLast
    return VStack(spacing: KBandLayout.labelGap) {
      Button(action: act) {
        ZStack {
          if ring && !desk.isEmpty {
            let ticks = ticks
            KDeskRing(ticks: ticks, dark: theme.isDark)
              .frame(width: 2 * KDeskRing.radius, height: 2 * KDeskRing.radius)
              .animation(tickChange, value: ticks)
          }
          stroked(glyph, glyphColor)
            .opacity(check ? 0 : 1)
          if ring {
            stroked(.check, glyphColor)
              .opacity(check ? 1 : 0)
          }
        }
        .animation(tickChange, value: check)
        .frame(width: size, height: size)
        .contentShape(Circle())
      }
      .buttonStyle(KBandDiscStyle(theme: theme))
      .disabled(!enabled)
      .accessibilityLabel(a11y)

      Text(label)
        .kText(Self.labelStyle)
        .foregroundStyle(labelColor)
        .lineLimit(1)
        .minimumScaleFactor(0.6)
        .contentShape(Rectangle())
        .onTapGesture(perform: act)
        .accessibilityHidden(true)
    }
    .dynamicTypeSize(...DynamicTypeSize.large)
  }

  /// a glyph at 22, its 2.2 stroke on the 24 grid
  private func stroked(_ glyph: KBandGlyph, _ color: Color) -> some View {
    glyph
      .stroke(color, style: StrokeStyle(lineWidth: KBandGlyph.lineWidth * KBandGlyph.size / 24, lineCap: .round, lineJoin: .round))
      .frame(width: KBandGlyph.size, height: KBandGlyph.size)
  }

  /// the labels: system 500 11 at .02em
  static let labelStyle = KTextStyle.system(11, .medium, tracking: 0.02)
}

/*
 NEXT'S RING (owner 2026-11-09, proto8): one tick per letter on today's desk, drawn on the disc's
 own edge, the circle 1.5 inside it (the prototype's r 25.5 on its 54 disc: 24.5 on our 52), from
 12 o'clock clockwise. Each tick is the circle trimmed to its share less the gap, the gap split
 either side of the boundary, so the gaps sit between letters; one letter is the whole circle with
 no gap. Pictures only: the band's VoiceOver words are TS's.
 */
struct KDeskRing: View {
  enum Tick: Equatable {
    case unread, read, replied
  }

  /// the circle's radius: 1.5 inside the 52 disc's edge
  static let radius: CGFloat = KBandLayout.disc / 2 - 1.5
  static let lineWidth: CGFloat = 2.5

  /// the gap between ticks along the circle: 4.5, 3 past eight letters (none for one)
  static func gap(_ n: Int) -> CGFloat {
    n > 1 ? (n > 8 ? 3 : 4.5) : 0
  }

  static func color(_ tick: Tick, dark: Bool) -> Color {
    switch (tick, dark) {
    case (.unread, false): return Color(hex: "#DDDAEE")
    case (.read, false): return Color(hex: "#B9B5F5")
    case (.replied, false): return Color(hex: "#3A34D6")
    case (.unread, true): return Color.white.opacity(0.16)
    case (.read, true): return Color(hex: "#6F69D8")
    case (.replied, true): return Color(hex: "#8E89FF")
    }
  }

  let ticks: [Tick]
  let dark: Bool

  var body: some View {
    let n = ticks.count
    let circumference = 2 * CGFloat.pi * Self.radius
    // each tick's share and the gap, as fractions of the circle
    let share = n > 0 ? 1 / CGFloat(n) : 0
    let gap = Self.gap(n) / circumference
    ZStack {
      ForEach(0..<n, id: \.self) { i in
        let from = CGFloat(i) * share + gap / 2
        Circle()
          .trim(from: from, to: max(from, from + share - gap))
          .stroke(Self.color(ticks[i], dark: dark), style: StrokeStyle(lineWidth: Self.lineWidth, lineCap: .round))
      }
    }
    // a circle's path starts at 3 o'clock and runs clockwise: a quarter turn back starts it at 12
    .rotationEffect(.degrees(-90))
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

/*
 UNDO AFTER NEXT (owner's audit, 2026-11-10). Next is one tap and a passed letter doesn't come
 back by itself, so a mis-tap cost a letter unless the reader knew the ⋯ held "Bring back the last
 letter". For five seconds after a pass (TS counts them, and says when it goes early: a reply
 begun, the + panel, the reader, the tab left, the next pass taking the offer over) this small
 capsule stands just over the band, centred: the system's arrow.uturn.backward and TS's "Undo".
 A tap is that same bring back (KTodayActions.onBringBack), so the deck plays its brought-back
 reverse and Next's ring steps back with TS's desk.

 It is the app's toast, made a button: flat, ink with the page colour on it (KToastPill's pair, so
 it reads on the card's foot and on the ground in all four themes), system 600 13, no outline and
 no shadow. Its centre sits `lift` above the band's top: the capsule then lies in the card's own
 bottom margin and the 14 of air under the card, above Wren's head, over no word of the letter and
 clear of her (her arrival bubble, which shares the spot on her first day, waits while it is up:
 KTodayDesk). The target is the capsule and 6 round it (44 tall).

 It fades in over .25s rising 6, and fades out; under Reduce Motion it only fades. VoiceOver reads
 it as a button, "Undo", with TS's hint ("Bring back the last letter"); the card on screen offers
 the same move as an action (KLetterCardAccessibilityActions), since five seconds are short for
 finding a new button. Always in the tree (its opacity says whether it is up), so the words are
 still there while it fades.
 */
struct KUndoCapsule: View {
  /// the capsule's centre, this far above the band's top
  static let lift: CGFloat = 16
  /// the words: system 600 13, the toast's
  static let labelStyle = KTextStyle.system(13, .semibold)

  let theme: KTheme
  let label: String
  /// VoiceOver's hint: what the tap does
  let hint: String
  let shown: Bool
  let action: () -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    Button(action: action) {
      HStack(spacing: 6) {
        Image(systemName: "arrow.uturn.backward")
          .font(.system(size: 12, weight: .bold))
          .accessibilityHidden(true)
        Text(label)
          .kText(Self.labelStyle)
          .lineLimit(1)
      }
      .foregroundStyle(theme.bg)
      .padding(.horizontal, 14)
      .padding(.vertical, 8)
      .background(Capsule().fill(theme.ink))
      // the target: 6 round the capsule
      .padding(6)
      .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
    .opacity(shown ? 1 : 0)
    .offset(y: shown || reduceMotion ? 0 : 6)
    .animation(reduceMotion ? KTodayMotion.reduced : .easeOut(duration: 0.25), value: shown)
    .allowsHitTesting(shown)
    .accessibilityLabel(label)
    .accessibilityHint(hint)
    .accessibilityHidden(!shown)
  }
}

/// B8's two glyphs on a 24 grid, scaled to the frame: Next's ↑ (M12 19V5 M6 11l6-6 6 6) and
/// Reply's ↩ (M9 7 4 12l5 5 M4 12h9a6 6 0 0 1 6 6v1); and the ✓ Next shows on the day's last
/// letter (M5 12.5l4.5 4.5L19 7.5), in the ↑'s room.
private enum KBandGlyph: Shape {
  case next, reply, check

  /// drawn at 22
  static let size: CGFloat = 22
  /// the stroke on the 24 grid
  static let lineWidth: CGFloat = 2.2

  func path(in rect: CGRect) -> Path {
    let k = min(rect.width, rect.height) / 24
    func pt(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: rect.minX + x * k, y: rect.minY + y * k) }
    var p = Path()
    switch self {
    case .next:
      p.move(to: pt(12, 19))
      p.addLine(to: pt(12, 5))
      p.move(to: pt(6, 11))
      p.addLine(to: pt(12, 5))
      p.addLine(to: pt(18, 11))
    case .reply:
      p.move(to: pt(9, 7))
      p.addLine(to: pt(4, 12))
      p.addLine(to: pt(9, 17))
      p.move(to: pt(4, 12))
      p.addLine(to: pt(13, 12))
      // a 6 arc, a quarter turn from (13, 12) to (19, 18), then down 1
      p.addArc(tangent1End: pt(19, 12), tangent2End: pt(19, 18), radius: 6 * k)
      p.addLine(to: pt(19, 19))
    case .check:
      p.move(to: pt(5, 12.5))
      p.addLine(to: pt(9.5, 17))
      p.addLine(to: pt(19, 7.5))
    }
    return p
  }
}

/// A band disc: the tab bar's glass (KGlassFace in the theme's KGlassTone) clipped to the circle,
/// made a pearl (owner, 2026-11-13, of mock ③ "珍珠玻璃": "ok"): a milky body over the glass, a
/// soft specular across its top, a bright rim with a faint dark one at its foot, and a close soft
/// drop outside it only. On the white page the glass has nothing behind it to show, so this is
/// what glass reads as there (as iOS's own on white): a pearl with a lit edge. Pressed, the bar
/// lens's tint over the glass and .96 (80ms out), springing back over .25s on
/// cubic-bezier(.3, 1.3, .5, 1).
private struct KBandDiscStyle: ButtonStyle {
  let theme: KTheme

  static let press = Animation.easeOut(duration: 0.08)
  static let release = Animation.timingCurve(0.3, 1.3, 0.5, 1, duration: 0.25)

  /// the disc's drop (mock ③: a .5 hairline in ink .07, 0 8 22 −8 ink .28 close under it, 0 1 3
  /// ink .08); Midnight's in black, its edge the glass's own white ring
  static func shadows(dark: Bool) -> [KSoftShadow] {
    let ink = Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 1)
    if dark {
      return [KSoftShadow(y: 6, blur: 16, color: Color.black.opacity(0.5))]
    }
    return [
      KSoftShadow(y: 0, blur: 0, spread: 0.5, color: ink.opacity(0.07)),
      KSoftShadow(y: 8, blur: 22, spread: -8, color: ink.opacity(0.28)),
      KSoftShadow(y: 1, blur: 3, color: ink.opacity(0.08)),
    ]
  }

  func makeBody(configuration: Configuration) -> some View {
    let down = configuration.isPressed
    let tone = KGlassTone.of(theme)
    let dark = theme.isDark
    let disc = Circle()
    configuration.label
      .background {
        ZStack {
          // the bar's own glass, drawn with the bar's capsule corners as it always was
          KGlassFace(tone: tone, shape: RoundedRectangle(cornerRadius: KTabBarMetrics.corner, style: .circular))
          // the pearl's body: milk over the glass, a little thinner at the foot
          disc.fill(LinearGradient(
            colors: dark ? [Color.white.opacity(0.10), Color.white.opacity(0.03)] : [Color.white.opacity(0.62), Color(hex: "#F6F5FB").opacity(0.44)],
            startPoint: .top, endPoint: .bottom))
          // its specular: a soft oval of light across the top (on 64: 40 wide, 22 tall, 5 down)
          GeometryReader { g in
            Ellipse()
              .fill(LinearGradient(colors: [Color.white.opacity(dark ? 0.20 : 0.85), Color.white.opacity(0)], startPoint: .top, endPoint: .bottom))
              .frame(width: g.size.width * 0.625, height: g.size.height * 0.34)
              .position(x: g.size.width / 2, y: g.size.height * (0.08 + 0.17))
          }
          disc.fill(tone.lens).opacity(down ? 1 : 0)
        }
        .clipShape(disc)
        // the rim: a bright line all round, brighter along the top, a faint dark one at the foot
        .overlay(disc.strokeBorder(Color.white.opacity(dark ? 0.20 : 0.95), lineWidth: 0.5))
        .overlay(
          disc.strokeBorder(LinearGradient(colors: [Color.white.opacity(dark ? 0.30 : 1), Color.white.opacity(0)], startPoint: .top, endPoint: UnitPoint(x: 0.5, y: 0.3)), lineWidth: 1.5)
        )
        .overlay(
          disc.strokeBorder(LinearGradient(colors: [Color.clear, (dark ? Color.black.opacity(0.3) : tone.bottomLine)], startPoint: UnitPoint(x: 0.5, y: 0.7), endPoint: .bottom), lineWidth: 1.5)
            .blur(radius: 1)
        )
        // the material reads the theme's light or dark, as the tab bar's does
        .environment(\.colorScheme, dark ? .dark : .light)
        .allowsHitTesting(false)
      }
      .background { KOuterShadow(shadows: Self.shadows(dark: dark), shape: disc) }
      .scaleEffect(down ? 0.96 : 1)
      .animation(down ? Self.press : Self.release, value: down)
  }
}

/*
 THE PAGE'S GROUND: the page colour and nothing else.

 It was a radial wash (Prompt 3: Lavender's lav at the bottom centre, fading out by 60% of the
 height), there so the glass discs had something behind them. The owner took it out twice on
 2026-11-12: first on the iPhone Duo, where the system's band cut it off square and it read as a
 purple block ("紫色的底哪里来的"), then everywhere ("去掉吧"): the page is one flat colour from
 the title to the tab bar. The discs keep their own rim and soft shadow, which is what they are
 read by on the letter itself on the Duo's inner screen. The desk still puts this behind
 everything, in the Host's full frame, so it stands in for the page colour.
 */
struct KTodayGround: View {
  let theme: KTheme

  init(theme: KTheme) {
    self.theme = theme
  }

  var body: some View {
    theme.bg
      .allowsHitTesting(false)
      .accessibilityHidden(true)
  }
}
