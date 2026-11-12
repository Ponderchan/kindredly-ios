// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE PAGE TODAY BECOMES AFTER THE LAST LETTER (docs/today-after-fifteen.md), top to bottom:

   the status bar's room (topInset)
   Today                         the title where the desk leaves it once a letter has gone past:
                                 small, centred in its band (KTodayHeader's locked look)
   ┌───────────────────────┐
   │ the mailbox, the       │    the page's card takes all the room there is
   │ receipt, or bedtime    │
   └───────────────────────┘
   [ ✈ POND'S OFF THE CLOCK · Fly a lap with Pond  ▶ ]     the strip, 52
   the tab bar's room (bottomInset)

 For five seconds after the day's last pass an Undo capsule stands over the strip (the desk's own
 undo: TS counts the seconds and sends the word while it is offered).

 The layout is a fixed page, not a scroll: the type stops growing at xxLarge, and the pages give
 their words room to wrap inside the card.
 */
public struct KAfterScreen: View {
  let theme: KTheme
  let content: KAfterContent
  let topInset: CGFloat
  let bottomInset: CGFloat
  let actions: KAfterActions
  /// false only for the check sheets: ImageRenderer draws nothing inside a ScrollView
  var scrolls = true
  /// a folding phone's inner screen: the card on the left page, her game's door on the right
  @ObservedObject private var fold = KFold.shared

  public init(theme: KTheme, content: KAfterContent, topInset: CGFloat = 0, bottomInset: CGFloat = 0, actions: KAfterActions = KAfterActions()) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
  }

  /// the title's band (the desk's: KTodayGeometry.band)
  static let band: CGFloat = 52
  static let gutter: CGFloat = 16
  static let gap: CGFloat = 10

  public var body: some View {
    let palette = KAfterPalette.of(theme)
    Group {
      if fold.frame.twoPages {
        spread(palette)
      } else {
        VStack(spacing: 0) {
          title
          VStack(spacing: Self.gap) {
            card(palette)
              .frame(maxWidth: .infinity, maxHeight: .infinity)
            KAfterStripView(theme: theme, palette: palette, strip: content.strip, look: content.look, onPlay: actions.onPlay)
          }
          .overlay(alignment: .bottom) { undo }
          .padding(.horizontal, Self.gutter)
        }
      }
    }
    .padding(.top, topInset)
    .padding(.bottom, bottomInset + 12)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(theme.bg.ignoresSafeArea())
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
  }

  /* THE SPREAD (iPhone Duo's inner screen; found walking the simulator, 2026-11-12: across the
     whole inner screen the mailbox stood 835 wide and the strip under it was one long bar, and
     the receipt's key would have run as long). The day's card keeps the left page, at about
     the width it has on a phone, under the title. Her game has the whole right page (owner,
     2026-11-13: a small card floating in the middle of it "感觉很奇怪 … 没有满屏"): a window as
     tall as the day's card, its top on the card's top and its foot on the card's foot, onto the
     sky she plays under at this hour (KAfterWindow), with the same words and the same one tap
     as the strip. Undo, while it is offered, hangs at the window's top. */
  private func spread(_ palette: KAfterPalette) -> some View {
    let f = fold.frame
    return HStack(alignment: .top, spacing: 0) {
      VStack(spacing: 0) {
        title
        card(palette)
          .frame(maxWidth: .infinity, maxHeight: .infinity)
          .padding(.leading, Self.gutter)
          .padding(.trailing, Self.gutter / 2)
      }
      .frame(width: f.crease)
      VStack(spacing: 0) {
        // the title's band, so the window starts where the day's card starts
        Color.clear.frame(height: Self.band)
        KAfterWindow(theme: theme, palette: palette, strip: content.strip, sky: content.sky, look: content.look, onPlay: actions.onPlay)
          .frame(maxWidth: .infinity, maxHeight: .infinity)
          .overlay(alignment: .top) { undo.padding(.top, 16) }
          .padding(.leading, Self.gutter / 2)
          .padding(.trailing, Self.gutter)
      }
      .frame(width: max(0, f.rightEnd - f.crease))
      Spacer(minLength: 0)
    }
  }

  /// "Today", as the desk's header draws it once locked: its 22 semibold at 17/22, raised 9
  private var title: some View {
    Text(content.title)
      .kText(.system(22, .semibold))
      .foregroundStyle(theme.ink)
      .lineLimit(1)
      .minimumScaleFactor(0.7)
      .scaleEffect(17.0 / 22.0)
      .offset(y: -9)
      .frame(maxWidth: .infinity)
      .frame(height: Self.band)
      .dynamicTypeSize(...DynamicTypeSize.accessibility1)
      .accessibilityAddTraits(.isHeader)
  }

  @ViewBuilder
  private func card(_ palette: KAfterPalette) -> some View {
    switch content.page {
    case .box:
      KAfterBoxView(theme: theme, palette: palette, box: content.box, thing: content.thing, look: content.look, actions: actions)
    case .receipt:
      KAfterReceiptView(theme: theme, palette: palette, receipt: content.receipt, thing: content.thing, look: content.look, actions: actions, scrolls: scrolls)
    case .bedtime:
      KAfterBedView(theme: theme, palette: palette, bed: content.bed, thing: content.thing, look: content.look, actions: actions)
    }
  }

  /// Undo, over the strip, while TS offers it
  @ViewBuilder
  private var undo: some View {
    if !content.undo.isEmpty {
      Button(action: actions.onUndo) {
        Text(content.undo)
          .kText(.system(15, .semibold))
          .foregroundStyle(theme.bg)
          .padding(.horizontal, 18)
          .frame(height: 44)
          .background(theme.ink, in: Capsule())
      }
      .buttonStyle(.plain)
      .accessibilityHint(content.undoHint)
      // (over the strip on a phone; on the spread it hangs at the window's top)
      .padding(.bottom, fold.frame.twoPages ? 0 : 62)
      .transition(.opacity)
    }
  }
}

/// The strip under every page: her game. One button, 52 high.
struct KAfterStripView: View {
  let theme: KTheme
  let palette: KAfterPalette
  let strip: KAfterStrip
  let look: KWrenLook
  let onPlay: () -> Void

  var body: some View {
    if strip.canPlay {
      Button(action: onPlay) { row }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityHint(strip.hint)
    } else {
      row.accessibilityElement(children: .combine)
    }
  }

  private var flying: KWrenLook {
    var l = look
    l.pose = strip.canPlay ? .fly : .perch
    l.mood = strip.canPlay ? .happy : .sleepy
    // off the clock: nothing in her feet
    l.letter = false
    return l
  }

  private var row: some View {
    let shape = RoundedRectangle(cornerRadius: 18, style: .continuous)
    return HStack(spacing: 10) {
      KWrenBird(flying, size: 36)
      VStack(alignment: .leading, spacing: 1) {
        if !strip.eyebrow.isEmpty {
          Text(strip.eyebrow)
            .kText(.mono(9, .medium, tracking: 0.14))
            .foregroundStyle(palette.stripLabel)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
        }
        Text(strip.title)
          .kText(.system(15, .semibold))
          .foregroundStyle(palette.stripInk)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      if strip.canPlay {
        ZStack {
          Circle().fill(palette.lime)
          KAfterPlayGlyph()
            .fill(palette.limeInk)
            .frame(width: 12, height: 14)
            .offset(x: 1)
        }
        .frame(width: 36, height: 36)
        .accessibilityHidden(true)
      }
    }
    .padding(.leading, 10)
    .padding(.trailing, 8)
    .frame(minHeight: 52)
    .background(LinearGradient(colors: [palette.stripTop, palette.stripBottom], startPoint: .top, endPoint: .bottom), in: shape)
    .contentShape(shape)
  }
}

/// Her game's window: the whole right page of a folding phone's inner screen (KAfterScreen, THE
/// SPREAD). The sky she plays Free Flight under at this hour (its gradient, two soft discs, the
/// stars, the sun or the moon: KFreeFlightSky's drawing), two pairs of the game's pillars and its
/// ground, and her in the gap, flying and bobbing (still, with Reduce Motion). On the ground, a
/// plate with the strip's words and its play disc; the whole window is the one tap. When she
/// can't play she sits on the ground asleep, and the plate says when she is back, with no disc.
/// A card like the day's: corner 24, a hairline, no shadow (the flat rule, 2026-11-12).
struct KAfterWindow: View {
  let theme: KTheme
  let palette: KAfterPalette
  let strip: KAfterStrip
  let sky: KAfterSky
  let look: KWrenLook
  let onPlay: () -> Void
  @Environment(\.accessibilityReduceMotion) private var still
  @State private var up = false

  /// her side in the window, and how far she rises and falls
  static let bird: CGFloat = 96
  static let bob: CGFloat = 7
  /// the game's pillar (KFreeFlightRules.pipeW, .lip) and its line
  static let pipeW: CGFloat = 56
  static let lip: CGFloat = 14
  static let line: CGFloat = 2.4

  var body: some View {
    if strip.canPlay {
      Button(action: onPlay) { window }
        .buttonStyle(KFreeFlightPress(pressed: 0.85))
        .accessibilityElement(children: .combine)
        .accessibilityHint(strip.hint)
    } else {
      window.accessibilityElement(children: .combine)
    }
  }

  private var her: KWrenLook {
    var l = look
    l.pose = strip.canPlay ? .fly : .perch
    l.mood = strip.canPlay ? .happy : .sleepy
    l.letter = false
    return l
  }

  private var window: some View {
    let shape = RoundedRectangle(cornerRadius: KAfterBoxView.corner, style: .continuous)
    return GeometryReader { geo in
      let w = geo.size.width
      let h = geo.size.height
      let ground = max(56, (h * 0.14).rounded())
      let groundTop = h - ground
      // the gap she flies through: a little above the course's middle, kept off the plate
      let gapY = (groundTop * 0.44).rounded()
      let gap = max(150, (groundTop * 0.4).rounded())
      ZStack(alignment: .topLeading) {
        scene(w: w, h: h, groundTop: groundTop, gapY: gapY, gap: gap)
        KWrenBird(her, size: Self.bird)
          .frame(width: Self.bird, height: Self.bird)
          .offset(y: strip.canPlay && !still ? (up ? -Self.bob : Self.bob) : 0)
          .position(x: (w * 0.27).rounded(), y: strip.canPlay ? gapY : groundTop - Self.bird * 0.42)
          .accessibilityHidden(true)
        plate
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
      }
    }
    .clipShape(shape)
    .overlay(shape.strokeBorder(palette.cardLine, lineWidth: 1))
    .contentShape(shape)
    .onAppear {
      guard strip.canPlay, !still else { return }
      withAnimation(.easeInOut(duration: 1.7).repeatForever(autoreverses: true)) { up = true }
    }
  }

  /// the sky, the pillars and the ground, still
  private func scene(w: CGFloat, h: CGFloat, groundTop: CGFloat, gapY: CGFloat, gap: CGFloat) -> some View {
    Canvas { ctx, size in
      ctx.fill(
        Path(CGRect(origin: .zero, size: size)),
        with: .linearGradient(Gradient(colors: [sky.sky0, sky.sky1]), startPoint: .zero, endPoint: CGPoint(x: 0, y: groundTop))
      )
      func disc(_ x: CGFloat, _ y: CGFloat, _ r: CGFloat, _ color: Color) {
        ctx.fill(Path(ellipseIn: CGRect(x: x - r, y: y - r, width: r * 2, height: r * 2)), with: .color(color))
      }
      disc(w * 0.78, h * 0.3, 120, Color.white.opacity(sky.night ? 0.06 : 0.24))
      disc(w * 0.16, h * 0.78, 150, Color.white.opacity(sky.night ? 0.05 : 0.2))
      if sky.stars {
        let stars: [(CGFloat, CGFloat)] = [(0.12, 0.08), (0.3, 0.05), (0.47, 0.11), (0.62, 0.06), (0.86, 0.1), (0.93, 0.19), (0.2, 0.22), (0.72, 0.24)]
        for (i, s) in stars.enumerated() {
          disc(w * s.0, groundTop * s.1, i % 2 == 1 ? 1 : 1.6, Color.white.opacity(0.8))
        }
      }
      if let sun = sky.sun {
        disc(w * 0.82, 64, 20, sun.opacity(0.9))
      }
      if sky.moon {
        disc(w * 0.82, 64, 16, KFreeFlightInk.moon)
        disc(w * 0.82 + 7.5, 57, 14, sky.sky0)
      }
      // two pairs of the game's pillars, the gap stepping as the course does
      func block(_ rect: CGRect, _ radii: RectangleCornerRadii) {
        guard rect.height > 0 else { return }
        ctx.fill(UnevenRoundedRectangle(cornerRadii: radii, style: .circular).path(in: rect), with: .color(sky.scrim))
        let l = Self.line
        let inner = RectangleCornerRadii(
          topLeading: max(0, radii.topLeading - l / 2), bottomLeading: max(0, radii.bottomLeading - l / 2),
          bottomTrailing: max(0, radii.bottomTrailing - l / 2), topTrailing: max(0, radii.topTrailing - l / 2)
        )
        ctx.stroke(UnevenRoundedRectangle(cornerRadii: inner, style: .circular).path(in: rect.insetBy(dx: l / 2, dy: l / 2)), with: .color(sky.pillarInk), lineWidth: l)
      }
      let lipR = RectangleCornerRadii(topLeading: 5, bottomLeading: 5, bottomTrailing: 5, topTrailing: 5)
      let pw = Self.pipeW
      let lip = Self.lip
      // the first ahead of her, the next coming in at the window's edge, about half of it showing
      let first = (w * 0.5).rounded()
      let next = max(first + pw + 70, w - (pw * 0.55).rounded())
      for (x, gy) in [(first, gapY - 18), (next, gapY + 46)] {
        let upper = gy - gap / 2
        let lower = gy + gap / 2
        block(CGRect(x: x, y: -4, width: pw, height: max(0, upper + 4)), RectangleCornerRadii(bottomLeading: 4, bottomTrailing: 4))
        block(CGRect(x: x - 5, y: upper - 0.4 - lip, width: pw + 10, height: lip), lipR)
        block(CGRect(x: x, y: lower, width: pw, height: max(0, groundTop - lower)), RectangleCornerRadii(topLeading: 4, topTrailing: 4))
        block(CGRect(x: x - 5, y: lower + 0.4, width: pw + 10, height: lip), lipR)
      }
      // the ground, its top edge in the forest's green (the night's lilac), as the game's
      ctx.fill(Path(CGRect(x: 0, y: groundTop, width: w, height: h - groundTop)), with: .color(sky.land))
      ctx.fill(Path(CGRect(x: 0, y: groundTop, width: w, height: Self.line)), with: .color(sky.night ? KFreeFlightInk.nightLine : sky.forest))
    }
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }

  /// the strip's words and its disc, on a card-coloured plate standing on the ground
  private var plate: some View {
    let shape = RoundedRectangle(cornerRadius: 18, style: .continuous)
    return HStack(spacing: 12) {
      VStack(alignment: .leading, spacing: 2) {
        if !strip.eyebrow.isEmpty {
          Text(strip.eyebrow)
            .kText(.mono(10, .medium, tracking: 0.14))
            .foregroundStyle(theme.mute)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
        }
        Text(strip.title)
          .kText(.system(19, .semibold))
          .foregroundStyle(theme.ink)
          .lineLimit(2)
          .minimumScaleFactor(0.7)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      if strip.canPlay {
        ZStack {
          Circle().fill(palette.lime)
          KAfterPlayGlyph()
            .fill(palette.limeInk)
            .frame(width: 16, height: 19)
            .offset(x: 1.5)
        }
        .frame(width: 52, height: 52)
        .accessibilityHidden(true)
      }
    }
    .padding(.leading, 18)
    .padding(.trailing, strip.canPlay ? 12 : 18)
    .padding(.vertical, 12)
    .frame(minHeight: 76)
    .frame(maxWidth: 400)
    .background(palette.card, in: shape)
    .overlay(shape.strokeBorder(palette.cardLine, lineWidth: 1))
    .padding(.horizontal, 16)
    .padding(.bottom, 16)
  }
}

/// the play triangle (the prototype's M1 1l10 6-10 6z on 12 × 14)
struct KAfterPlayGlyph: Shape {
  func path(in rect: CGRect) -> Path {
    var p = Path()
    let sx = rect.width / 12
    let sy = rect.height / 14
    p.move(to: CGPoint(x: rect.minX + 1 * sx, y: rect.minY + 1 * sy))
    p.addLine(to: CGPoint(x: rect.minX + 11 * sx, y: rect.minY + 7 * sy))
    p.addLine(to: CGPoint(x: rect.minX + 1 * sx, y: rect.minY + 13 * sy))
    p.closeSubpath()
    return p
  }
}

/// The small thing as a note's contents: its tag, its words, what stands under them and Keep.
/// The mailbox tapes it to the shutter; bedtime sets it on the card over her.
struct KAfterThingNote: View {
  let thing: KAfterThing
  let palette: KAfterPalette
  /// the tag over the words (bedtime says "…, TALKING IN HER SLEEP" over her fact)
  let tag: String
  let tagInk: Color
  let ink: Color
  let footInk: Color
  let keepOff: Color
  let keepInk: Color
  /// the words' size (15 on the note, 16 over her)
  let size: CGFloat
  let italic: Bool
  let onKeep: (Bool) -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(tag)
        .kText(.mono(9, .semibold, tracking: 0.14))
        .foregroundStyle(tagInk)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
      Text(thing.body)
        .kText(.content(size, italic: italic, lineHeight: 1.3))
        .foregroundStyle(ink)
        .fixedSize(horizontal: false, vertical: true)
        .minimumScaleFactor(0.8)
        .frame(maxWidth: .infinity, alignment: .leading)
      HStack(spacing: 8) {
        Text(thing.foot)
          .kText(.mono(9, .medium, tracking: 0.06))
          .foregroundStyle(footInk)
          .lineLimit(1)
          .truncationMode(.tail)
          .frame(maxWidth: .infinity, alignment: .leading)
        KAfterKeepCapsule(thing: thing, palette: palette, off: keepOff, offInk: keepInk, onKeep: onKeep)
      }
      .padding(.top, 2)
    }
  }
}
