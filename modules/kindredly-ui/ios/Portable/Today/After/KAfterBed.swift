// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 F6, BEDTIME (the owner's prompt 3; for a desk finished in the evening). A white card, three rows:

   ① the room: she sits in an opened envelope (214 × 206, standing on the room's floor): the
     raised flap behind her, the pocket with its two folds and its gold seal in front. Her line
     is at the top and changes with what the reader does. A tap on her is a pat.
   ② three steps: 1 Snack · 2 Pat · 3 Lights out. The third is locked until the first two are
     done, and says what is missing when it is tapped early.
   ③ the streak: how many days in a row, when the next letters come, and seven dots for the
     last seven days, tonight's last.

 Lights out: the room goes dark over 0.9 s (a moon, two stars), she sleeps and breathes, three
 z's drift up, tonight's dot lights, and a card comes up over her with the small thing: her fact
 as sleep-talk, or the line of the day under its own name (she says nothing over someone's line).

 TS keeps the three steps for the day, so the page comes back as it was left: asleep stays asleep.
 On a short card (a small phone) the three steps fold away once she sleeps.

 Reduce Motion: nothing bobs, breathes, drifts or is tossed; the room changes on a short fade.
 */
struct KAfterBedView: View {
  let theme: KTheme
  let palette: KAfterPalette
  let bed: KAfterBed
  let thing: KAfterThing
  let look: KWrenLook
  let actions: KAfterActions

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var fed: Bool
  @State private var patted: Bool
  @State private var asleep: Bool
  /// the card over her is up (a moment after the lights go out)
  @State private var cardUp: Bool
  /// her face for a moment: delight after a snack or a pat, curious when lights out is early
  @State private var react: KWrenMood?
  /// her line, once something has happened ("" = the resting one)
  @State private var said = ""
  @State private var feeding = false
  @State private var hearts = 0
  @State private var serial = 0

  init(theme: KTheme, palette: KAfterPalette, bed: KAfterBed, thing: KAfterThing, look: KWrenLook, actions: KAfterActions) {
    self.theme = theme
    self.palette = palette
    self.bed = bed
    self.thing = thing
    self.look = look
    self.actions = actions
    _fed = State(initialValue: bed.fed)
    _patted = State(initialValue: bed.patted)
    _asleep = State(initialValue: bed.asleep)
    _cardUp = State(initialValue: bed.asleep)
  }

  static let bedSize = CGSize(width: 214, height: 206)
  /// under this inner height the card is a short one (an iPhone SE's is about 390, a 6.1-inch phone's 540)
  static let shortCard: CGFloat = 450

  var body: some View {
    KAfterCard(palette: palette) {
      GeometryReader { geo in
        // a short card (a small phone) folds the three steps away once she sleeps: all three are
        // done, and she and her card need the room
        let folded = asleep && geo.size.height < Self.shortCard
        VStack(spacing: 12) {
          room
            .frame(maxWidth: .infinity, maxHeight: .infinity)
          if !folded { steps }
          streak
        }
        .frame(width: geo.size.width, height: geo.size.height)
      }
    }
    .onChange(of: bed.asleep) { _, now in
      if now && !asleep {
        asleep = true
        cardUp = true
      }
    }
    .onChange(of: bed.fed) { _, now in if now { fed = true } }
    .onChange(of: bed.patted) { _, now in if now { patted = true } }
    .sensoryFeedback(.impact(weight: .light), trigger: hearts)
    .sensoryFeedback(.impact(weight: .medium), trigger: asleep)
  }

  // MARK: ① the room

  private var room: some View {
    GeometryReader { geo in
      let w = geo.size.width
      let h = geo.size.height
      // the envelope stands on the floor; a short room draws it smaller so her line (or, once she
      // sleeps, the card over her) still has its place
      let above: CGFloat = asleep ? 150 : 70
      let fit: CGFloat = min(1, max(0.55, (h - above) / Self.bedSize.height))
      let shape = RoundedRectangle(cornerRadius: 22, style: .continuous)
      ZStack(alignment: .top) {
        LinearGradient(colors: [palette.roomTop, palette.roomBottom], startPoint: .top, endPoint: .bottom)
        LinearGradient(colors: [palette.nightTop, palette.nightBottom], startPoint: .top, endPoint: .bottom)
          .opacity(asleep ? 1 : 0)
        nest
          .scaleEffect(fit, anchor: .bottom)
          .frame(width: w, height: h - 4, alignment: .bottom)
        words(w: w)
      }
      .frame(width: w, height: h)
      .clipShape(shape)
      .animation(.easeInOut(duration: reduceMotion ? 0.2 : 0.9), value: asleep)
    }
  }

  private var bird: KWrenLook {
    var l = look
    l.pose = .perch
    l.mood = asleep ? .sleepy : (react ?? .content)
    return l
  }

  /// the envelope with her in it, and what moves around it, on the envelope's own 214 × 206
  private var nest: some View {
    ZStack(alignment: .topLeading) {
      // the sky's things, behind everything
      Circle()
        .fill(palette.moon)
        .frame(width: 44, height: 44)
        .background(Circle().fill(palette.moon.opacity(0.25)).padding(-8))
        .offset(x: -29.5, y: 12)
        .opacity(asleep ? 1 : 0)
      Circle().fill(Color.white).frame(width: 5, height: 5).offset(x: 220.5, y: 30).opacity(asleep ? 1 : 0)
      Circle().fill(Color.white).frame(width: 4, height: 4).offset(x: 194.5, y: 76).opacity(asleep ? 1 : 0)

      KAfterArt(d: "M4 70 L107 8 L210 70 Z", grid: CGSize(width: 214, height: 70), fill: palette.flap, stroke: palette.envelopeLine)
        .frame(width: 214, height: 70)
        .offset(y: 66)
      // the envelope's inside, behind her: the paper's own shade, never the room showing through
      KAfterArt(d: "M3 14 L211 14 L211 30 L107 72 L3 30 Z", grid: CGSize(width: 214, height: 86), fill: palette.flap, stroke: nil)
        .frame(width: 214, height: 86)
        .offset(y: 120)

      Button(action: pat) {
        KWrenBird(bird, size: 156)
          .kAfterBob(6, period: 3, active: !asleep)
          .kAfterBreathe(1.03, period: 4, active: asleep)
      }
      .buttonStyle(.plain)
      .offset(x: 29, y: 16)
      .accessibilityLabel(bed.birdA11y)
      .accessibilityHidden(asleep)
      .allowsHitTesting(!asleep)

      ZStack {
        KAfterArt(d: "M2 12 L107 56 L212 12 V74 a10 10 0 0 1 -10 10 H12 a10 10 0 0 1 -10 -10 Z", grid: CGSize(width: 214, height: 86), fill: palette.envelope, stroke: palette.envelopeLine)
        KAfterArt(d: "M4 82 L78 44 M210 82 L136 44", grid: CGSize(width: 214, height: 86), fill: nil, stroke: palette.fold)
        KAfterArt(d: "M100 66 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 Z", grid: CGSize(width: 214, height: 86), fill: palette.seal, stroke: nil)
      }
      .frame(width: 214, height: 86)
      .offset(y: 120)
      .allowsHitTesting(false)

      if asleep && !reduceMotion {
        KAfterZed(size: 18, delay: 0, ink: palette.zed).offset(x: 158.5, y: 60)
        KAfterZed(size: 24, delay: 0.5, ink: palette.zed).offset(x: 172.5, y: 40)
        KAfterZed(size: 30, delay: 1.0, ink: palette.zed).offset(x: 190.5, y: 14)
      }
      if hearts > 0 && !reduceMotion {
        KAfterPuff(delay: 0) { KAfterHeart().fill(palette.heart).frame(width: 22, height: 22) }
          .offset(x: 40.5, y: -24)
          .id(hearts)
        KAfterPuff(delay: 0.15) { KAfterHeart().fill(palette.heart).frame(width: 16, height: 16) }
          .offset(x: 158.5, y: -4)
          .id(hearts + 100_000)
      }
      if feeding && !reduceMotion {
        KAfterSeedToss(ink: palette.snackInk)
          .offset(x: 100.5, y: 44)
      }
    }
    .frame(width: Self.bedSize.width, height: Self.bedSize.height, alignment: .topLeading)
    .accessibilityElement(children: .contain)
  }

  /// her line while she is awake; the card with the small thing once she sleeps
  @ViewBuilder
  private func words(w: CGFloat) -> some View {
    if asleep {
      if cardUp {
        KAfterThingNote(
          thing: thing,
          palette: palette,
          tag: thing.isLine ? thing.tag : bed.sleepTag,
          tagInk: palette.accent,
          ink: theme.ink,
          footInk: theme.sub,
          keepOff: palette.sleepKeep,
          keepInk: theme.ink,
          size: 16,
          italic: !thing.isLine,
          onKeep: actions.onKeep
        )
        .padding(.vertical, 12)
        .padding(.horizontal, 14)
        .background(palette.sleepCard, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .padding(.horizontal, 14)
        .padding(.top, 14)
        .transition(reduceMotion ? .opacity : .asymmetric(insertion: .scale(scale: 0.94, anchor: .top).combined(with: .opacity).combined(with: .offset(y: 14)), removal: .opacity))
      }
    } else {
      Text(said.isEmpty ? bed.sayIdle : said)
        .kText(.content(17, italic: true, lineHeight: 1.2))
        .foregroundStyle(theme.ink)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.horizontal, 18)
        .padding(.top, 20)
        .frame(width: w)
        .id(said)
        .transition(.opacity)
        .animation(.easeInOut(duration: 0.2), value: said)
    }
  }

  // MARK: what the reader does

  private func snack() {
    guard !asleep else { return }
    if fed {
      say(bed.sayFull, face: nil)
      return
    }
    fed = true
    actions.onStep("snack")
    feeding = true
    say(bed.sayFed, face: .delight)
    after(0.85) { feeding = false }
  }

  private func pat() {
    guard !asleep else { return }
    if !patted {
      patted = true
      actions.onStep("pat")
    }
    hearts += 1
    say(bed.sayPat, face: .delight, hold: 1.0)
  }

  private func lights() {
    guard !asleep else { return }
    if !fed {
      say(bed.sayNeedSnack, face: .curious)
      return
    }
    if !patted {
      say(bed.sayNeedPat, face: .curious)
      return
    }
    serial &+= 1
    react = nil
    asleep = true
    actions.onStep("lights")
    after(reduceMotion ? 0.1 : 0.6) {
      withAnimation(.easeOut(duration: 0.5)) { cardUp = true }
    }
  }

  /// her line, and a face for a moment
  private func say(_ line: String, face: KWrenMood?, hold: Double = 1.5) {
    said = line
    serial &+= 1
    let s = serial
    react = face
    guard face != nil else { return }
    after(hold) { if s == serial { react = nil } }
  }

  private func after(_ seconds: Double, _ step: @escaping () -> Void) {
    DispatchQueue.main.asyncAfter(deadline: .now() + seconds, execute: step)
  }

  // MARK: ② the steps

  private var steps: some View {
    let locked = !asleep && !(fed && patted)
    return HStack(spacing: 10) {
      tile(1, bed.snack, fill: palette.snackFill, ink: palette.snackInk, done: fed, locked: false, art: .bowl, action: snack)
      tile(2, bed.pat, fill: palette.patFill, ink: palette.patInk, done: patted, locked: false, art: .heart, action: pat)
      tile(3, bed.lights, fill: palette.lightsFill, ink: palette.lightsInk, done: asleep, locked: locked, art: .moon, action: lights)
    }
  }

  private func tile(_ n: Int, _ step: KAfterStep, fill: Color, ink: Color, done: Bool, locked: Bool, art: KAfterStepArt.Kind, action: @escaping () -> Void) -> some View {
    let shape = RoundedRectangle(cornerRadius: 20, style: .continuous)
    let sub: String = done ? step.subDone : locked ? bed.lockedSub : step.sub
    let iconInk: Color = locked ? palette.lockedIcon : ink
    let labelInk: Color = locked ? palette.lockedInk : palette.stepInk
    let subInk: Color = locked ? palette.lockedInk : palette.stepSub
    return Button(action: action) {
      VStack(spacing: 3) {
        KAfterStepArt(kind: art, ink: iconInk)
          .frame(width: 22, height: 22)
          .frame(width: 34, height: 34)
          .background(palette.stepDisc, in: Circle())
        Text(step.label)
          .kText(.system(13, .semibold))
          .foregroundStyle(labelInk)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
        Text(sub)
          .kText(.system(10))
          .foregroundStyle(subInk)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
      }
      .padding(.horizontal, 6)
      .frame(maxWidth: .infinity)
      .frame(minHeight: 80)
      .background(locked ? palette.lockedFill : fill, in: shape)
      .overlay(alignment: .topLeading) { badge(n, done: done, ink: ink, locked: locked) }
      .contentShape(shape)
    }
    .buttonStyle(.plain)
    .animation(.easeInOut(duration: 0.3), value: locked)
    .animation(.easeInOut(duration: 0.3), value: done)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(step.label)
    .accessibilityValue(sub)
    .accessibilityAddTraits(.isButton)
  }

  private func badge(_ n: Int, done: Bool, ink: Color, locked: Bool) -> some View {
    ZStack {
      Circle().fill(done ? ink : Color.white.opacity(0.75))
      if done {
        KAfterArt(d: "M5 12l5 5L20 7", grid: CGSize(width: 24, height: 24), fill: nil, stroke: .white, width: 4)
          .frame(width: 9, height: 9)
      } else {
        Text("\(n)")
          .font(.system(size: 10, weight: .bold))
          .foregroundStyle(locked ? palette.lockedInk : palette.stepInk)
      }
    }
    .frame(width: 16, height: 16)
    .padding(8)
    .accessibilityHidden(true)
  }

  // MARK: ③ the streak

  private var streak: some View {
    VStack(spacing: 5) {
      HStack(alignment: .firstTextBaseline, spacing: 8) {
        Text(asleep ? bed.streakDone : bed.streak)
          .kText(.system(12, .semibold))
          .foregroundStyle(theme.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          .frame(maxWidth: .infinity, alignment: .leading)
        HStack(alignment: .firstTextBaseline, spacing: 4) {
          Text(bed.next)
            .kText(.system(10))
            .foregroundStyle(theme.sub)
          Text(bed.nextAt)
            .kText(.system(11, .semibold))
            .foregroundStyle(palette.accent)
        }
        .lineLimit(1)
        .fixedSize()
      }
      HStack(spacing: 6) {
        ForEach(bed.dots) { dot in self.dot(dot) }
        Text(asleep ? bed.streakSubDone : bed.streakSub)
          .kText(.system(10))
          .foregroundStyle(theme.sub)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          .frame(maxWidth: .infinity, alignment: .trailing)
      }
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 8)
    .frame(maxWidth: .infinity, minHeight: 60)
    .background(palette.streakBar, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(asleep ? bed.dotsA11yDone : bed.dotsA11y)
  }

  private func dot(_ d: KAfterDot) -> some View {
    let lit = d.tonight && asleep
    let fill: Color = lit ? palette.lime : d.tonight ? palette.dotOff : d.on ? palette.dotOn : Color.clear
    let ink: Color = lit ? palette.limeInk : d.tonight ? theme.sub : d.on ? palette.dotOnInk : theme.sub
    let ring: CGFloat = lit ? 0 : d.tonight ? 2 : d.on ? 0 : 1.5
    return Text(d.letter)
      .font(.system(size: 9, weight: .bold))
      .foregroundStyle(ink)
      .frame(width: 20, height: 20)
      .background(fill, in: Circle())
      .overlay(Circle().strokeBorder(palette.dotRing, lineWidth: ring))
      .animation(.easeInOut(duration: 0.4), value: lit)
  }
}

// MARK: - Drawing

/// SVG path data on its own grid, scaled to the view: filled, stroked, or both.
struct KAfterArt: View {
  let d: String
  let grid: CGSize
  let fill: Color?
  let stroke: Color?
  var width: CGFloat = 1.5

  var body: some View {
    Canvas { context, size in
      let sx: CGFloat = size.width / grid.width
      let sy: CGFloat = size.height / grid.height
      let path = KSVGPath.path(d).applying(CGAffineTransform(scaleX: sx, y: sy))
      if let fill { context.fill(path, with: .color(fill)) }
      if let stroke {
        context.stroke(path, with: .color(stroke), style: StrokeStyle(lineWidth: width * min(sx, sy), lineCap: .round, lineJoin: .round))
      }
    }
    .accessibilityHidden(true)
  }
}

/// The three steps' pictures, on the prototype's 24 grid.
struct KAfterStepArt: View {
  enum Kind {
    case bowl
    case heart
    case moon
  }

  let kind: Kind
  let ink: Color

  var body: some View {
    let grid = CGSize(width: 24, height: 24)
    ZStack {
      switch kind {
      case .bowl:
        KAfterArt(d: "M4 12.5h16a8 8 0 0 1-16 0z", grid: grid, fill: ink, stroke: nil)
        KAfterArt(d: "M8.5 8h.01M12 5.5h.01M15.5 8h.01", grid: grid, fill: nil, stroke: ink, width: 2.4)
      case .heart:
        KAfterArt(d: "M12 20.5s-7.5-4.6-7.5-10.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.6c0 5.7-7.5 10.3-7.5 10.3z", grid: grid, fill: ink, stroke: nil)
      case .moon:
        KAfterArt(d: "M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1z M17.5 3.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z", grid: grid, fill: ink, stroke: nil)
      }
    }
  }
}

/// the heart that drifts up after a pat (the prototype's, on 24)
struct KAfterHeart: Shape {
  func path(in r: CGRect) -> Path {
    let t = CGAffineTransform(translationX: r.minX, y: r.minY).scaledBy(x: r.width / 24, y: r.height / 24)
    return KSVGPath.path("M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z").applying(t)
  }
}

/// Up and away: `t` runs 0…1; the thing rises, grows a little, and is only there in the middle.
struct KAfterRise: ViewModifier, Animatable {
  var t: CGFloat
  let fromY: CGFloat
  let toY: CGFloat
  let fromScale: CGFloat
  let toScale: CGFloat
  /// where it is fully there
  let peak: CGFloat

  var animatableData: CGFloat {
    get { t }
    set { t = newValue }
  }

  func body(content: Content) -> some View {
    let fade: CGFloat = t < peak ? t / peak : max(0, 1 - (t - peak) / (1 - peak))
    return content
      .scaleEffect(fromScale + (toScale - fromScale) * t)
      .offset(y: fromY + (toY - fromY) * t)
      .opacity(Double(fade))
  }
}

/// One z, drifting up for ever.
struct KAfterZed: View {
  let size: CGFloat
  let delay: Double
  let ink: Color
  @State private var t: CGFloat = 0

  var body: some View {
    Text("z")
      .font(.system(size: size, weight: .regular).italic())
      .foregroundStyle(ink)
      .modifier(KAfterRise(t: t, fromY: 6, toY: -12, fromScale: 1, toScale: 1, peak: 0.4))
      .onAppear {
        withAnimation(.easeInOut(duration: 2.4).repeatForever(autoreverses: false).delay(delay)) { t = 1 }
      }
      .accessibilityHidden(true)
  }
}

/// Something that rises once and is gone (a heart after a pat).
struct KAfterPuff<Inner: View>: View {
  let delay: Double
  @ViewBuilder var inner: () -> Inner
  @State private var t: CGFloat = 0

  var body: some View {
    inner()
      .modifier(KAfterRise(t: t, fromY: 10, toY: -34, fromScale: 0.6, toScale: 1.1, peak: 0.3))
      .onAppear {
        withAnimation(.easeOut(duration: 0.9).delay(delay)) { t = 1 }
      }
      .allowsHitTesting(false)
      .accessibilityHidden(true)
  }
}

/// A seed tossed to her from the lower left.
struct KAfterSeedToss: View {
  let ink: Color
  @State private var t: CGFloat = 0

  var body: some View {
    Ellipse()
      .fill(ink)
      .frame(width: 12, height: 16)
      .modifier(KAfterToss(t: t))
      .onAppear {
        withAnimation(.timingCurve(0.3, 0.8, 0.5, 1, duration: 0.8)) { t = 1 }
      }
      .allowsHitTesting(false)
      .accessibilityHidden(true)
  }
}

struct KAfterToss: ViewModifier, Animatable {
  var t: CGFloat

  var animatableData: CGFloat {
    get { t }
    set { t = newValue }
  }

  func body(content: Content) -> some View {
    let left: CGFloat = 1 - t
    let fade: CGFloat = t < 0.8 ? 1 : max(0, 1 - (t - 0.8) / 0.2)
    return content
      .scaleEffect(1 - 0.6 * t)
      .rotationEffect(.degrees(-40 * Double(left)))
      .offset(x: -70 * left, y: 110 * left)
      .opacity(Double(fade))
  }
}
