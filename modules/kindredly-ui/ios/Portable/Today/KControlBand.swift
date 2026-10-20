// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE CONTROL BAND, B8 (letter papers, owner 2026-10-20; CLAUDE-CODE-PROMPTS-NEXT-REPLY.md, contract
 §4.2; before it, Today 3d × 25b "image 2", 2026-10-16/18). 68 tall under the card, full width, its
 own coordinates (origin at the band's top left; on a 393 × 852 phone the band sits at y 684):

        ( ↑ )     (Wren, 40)     ( ↩ )
        Next                     Reply

 - One row, centred, gap 44: Next's disc, Wren, Reply's disc (26 + 44 + 20 = 90 from the middle
   to each disc's centre). Discs of 52 in the system's gray 6 (#F2F1F6; #272443 on the dark
   themes), no edge, no shadow, no glass, and no count: the 15 a day are a ceiling, not a task.
 - Next's glyph is the ↑ in ink, Reply's the ↩ in ind (22, a 2.2 round stroke on a 24 grid, the
   prompt's paths); the labels 6 under the discs in system 500 11 at .02em, Next's in mute (the
   dark themes' sub, #B9B5D0, as the prompt asks), Reply's in ind.
 - Pressed, a disc darkens (#E6E4EC; dark #34305A) and shrinks to .96 in 80ms; let go, it springs
   back over .25s on cubic-bezier(.3, 1.3, .5, 1).
 - Wren (KWireWren draws her) stands between them at 40, her centre on the discs' midline.

 Every word is TS's: Next, Reply and what VoiceOver says (labels.nextA11y, "Next letter", and
 labels.replyA11y). Its states:
 - hidden (a send in flight, the reader open, the + open): everything fades out and takes no
   touches (bandFade);
 - typing (the reply field has the keyboard, or a send it let go of awaits TS): the same, the
   whole band at opacity 0 with no touches (bandFade), and nothing moves (the chat composers' A1,
   owner 2026-10-18). The tab bar slides away meanwhile, the card shrinks and the reply bar rises
   (KTodayDesk), and the band fades back in once the keyboard goes and TS has answered a send;
 - done (flow.bandShown false): the buttons and their labels fade and drop 12;
 - not enabled (loading, offline): the buttons at .4 with no touches.
 Taps are also refused while a card is moving (deck.animating: no re-entry) and while typing.
 The page's faint radial ground (KTodayGround, below) stays: the desk puts it behind everything.
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
  ///   - enabled: false while loading or offline: the buttons at .4, no touches, NEXT empty
  ///   - hidden: hideBand or the + open: the band fades out, no touches
  ///   - onNext: NEXT (the desk calls deck.requestNext())
  ///   - onReply: REPLY (the desk routes it to the shown card's reply)
  init(
    theme: KTheme,
    left: Int,
    labels: KTodayLabels,
    leftA11y: String,
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
  /// hears the button's own words, so the label is hidden from it).
  private func control(glyph: KBandGlyph, glyphColor: Color, label: String, labelColor: Color, a11y: String, action: @escaping () -> Void) -> some View {
    let act = { if active { action() } }
    let size = KBandLayout.disc
    return VStack(spacing: KBandLayout.labelGap) {
      Button(action: act) {
        glyph
          .stroke(glyphColor, style: StrokeStyle(lineWidth: KBandGlyph.lineWidth * KBandGlyph.size / 24, lineCap: .round, lineJoin: .round))
          .frame(width: KBandGlyph.size, height: KBandGlyph.size)
          .frame(width: size, height: size)
          .contentShape(Circle())
      }
      .buttonStyle(KBandDiscStyle(dark: theme.isDark))
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

  /// the labels: system 500 11 at .02em
  static let labelStyle = KTextStyle.system(11, .medium, tracking: 0.02)
}

/// B8's two glyphs on a 24 grid, scaled to the frame: Next's ↑ (M12 19V5 M6 11l6-6 6 6) and
/// Reply's ↩ (M9 7 4 12l5 5 M4 12h9a6 6 0 0 1 6 6v1).
private enum KBandGlyph: Shape {
  case next, reply

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
    }
    return p
  }
}

/// A B8 disc: gray 6 at rest, a shade darker and .96 while pressed (80ms out), springing back
/// over .25s on cubic-bezier(.3, 1.3, .5, 1).
private struct KBandDiscStyle: ButtonStyle {
  let dark: Bool

  static let rest = Color(hex: "#F2F1F6")
  static let restDark = Color(hex: "#272443")
  static let pressed = Color(hex: "#E6E4EC")
  static let pressedDark = Color(hex: "#34305A")
  static let press = Animation.easeOut(duration: 0.08)
  static let release = Animation.timingCurve(0.3, 1.3, 0.5, 1, duration: 0.25)

  func makeBody(configuration: Configuration) -> some View {
    let down = configuration.isPressed
    configuration.label
      .background {
        Circle().fill(down ? (dark ? Self.pressedDark : Self.pressed) : (dark ? Self.restDark : Self.rest))
      }
      .scaleEffect(down ? 0.96 : 1)
      .animation(down ? Self.press : Self.release, value: down)
  }
}

/*
 THE RADIAL GROUND (Prompt 3): without it the glass reads as nothing on white. The design's
 "radial-gradient(120% 60% at 50% 100%, #DCD9F3 0%, #F3F1FA 45%, #fff 100%)": the ground colour at
 the bottom centre, .35 of it at 45% (over white that is the design's #F3F1FA), nothing at the
 edge, over bg. The design's #DCD9F3 is no Classic token (Classic's lav2, #EEEDFB, is half as deep
 against white, and the glass vanished on it): it is Lavender's lav, so Classic takes exactly that,
 and every other theme its own lav (Lavender's is the same colour; Paper's the warm one; Midnight's
 stands off its page about as far as the design's stands off white). The ellipse has radii
 1.2W × 0.6H about the bottom centre: a 2.4W × 1.2H rectangle centred on (W/2, H) with an
 elliptical gradient out to half of it, clipped to the frame. The desk puts it behind everything,
 in the Host's full frame; it draws bg itself, so it can stand in for the page colour.
 */
struct KTodayGround: View {
  let theme: KTheme

  init(theme: KTheme) {
    self.theme = theme
  }

  /// the colour at the ground's centre: the design's #DCD9F3 on Classic, the theme's lav elsewhere
  static func base(_ theme: KTheme) -> Color {
    theme.key == KTheme.classic.key ? KTheme.lavender.lav : theme.lav
  }

  var body: some View {
    let base = Self.base(theme)
    GeometryReader { geo in
      let w = geo.size.width, h = geo.size.height
      Rectangle()
        .fill(EllipticalGradient(
          stops: [
            .init(color: base, location: 0),
            .init(color: base.opacity(0.35), location: 0.45),
            .init(color: base.opacity(0), location: 1),
          ],
          center: .center,
          startRadiusFraction: 0,
          endRadiusFraction: 0.5
        ))
        .frame(width: 2.4 * w, height: 1.2 * h)
        .position(x: w / 2, y: h)
    }
    .background(theme.bg)
    .clipped()
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}
