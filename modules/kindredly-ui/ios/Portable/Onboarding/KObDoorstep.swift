// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 1 · THE DOORSTEP (screens/S01Doorstep, s01-geometry, s01-showcase): the owner's showcase, opening
 out of the launch's last frame.

 Everything is placed from the window (KObDoorLayout, s01-geometry doorLayout), because the first
 frame has to know where things END: the launch's mark flies to slide 1's stamp corner, the
 wordmark glides to the app line, the egg rolls to dot 1. The hand-off runs on one clock `hc` in
 ms (0 → 1250), the React Native worklets' curves ported as they were:
     0–160    the tag and the mono line fade and drop 6
    80–520    the card rises from below, tilted −2°, on the launch's back-out
   120–560    the mark comes down onto the card on a slight arc, carrying a Post Blue plate
     560      THUNK: the card dips 3, the light haptic, the stamp's paper snaps in round it
   300–700    "kindredly" glides down and shrinks to the app line; the app line fades in
   600–1250   the egg rolls in from the right to dot 1, one turn, two rocks
   760–1000   the chip pops onto the card; the slide's line types from 800
   900–1200   the headline, the key and the sign-in link rise 8 and fade in, 40 apart
 from 600 a tap anywhere completes it. The first frame is held until the route's own 450ms fade
 is over (handedAt + 470). Reduce Motion (or a "still" launch): screen 1 at rest under the launch's
 still frame, which cross-fades away in 220. No hand-off (back from 2, a jump): at rest.

 After the hand-off the slides turn every 4.5s; a touch on the card stops that for good, and so do
 Reduce Motion, VoiceOver and the sign-in sheet. "Hatch my courier": the card, the words and the
 keys drop and fade while the egg rolls to the centre and grows into screen 2's hero (480ms).

 Rule B: the card is an object (no ink edge, the deep purple depth on the blue); the keys are flat.
 */

enum KObLand {
  static let travelFrom = 120.0
  static let windowFrom = 440.0
  static let thunk = 560.0
  static let typeFrom = 800.0
  static let end = 1250.0
}

struct KObDoorLayout {
  static let cardTilt = -2.0
  static let cardRadius: CGFloat = 20
  static let headlineH: CGFloat = 68
  static let pagerH: CGFloat = 46
  static let pagerGap: CGFloat = 64
  static let pagerEgg: CGFloat = 32
  static let wordScale: CGFloat = 0.7
  static let wordLine: CGFloat = 46
  static let appLineH: CGFloat = 42
  /// the language chip's row above the card, when it shows
  static let langRoom: CGFloat = 26

  let sw: CGFloat
  let sh: CGFloat
  let card: CGRect
  let headTop: CGFloat
  let groundY: CGFloat
  let groundX0: CGFloat
  let groundX1: CGFloat
  let dots: [CGFloat]
  let eggY: CGFloat
  let wordTop: CGFloat
  let appTop: CGFloat

  init(sw: CGFloat, sh: CGFloat, top: CGFloat, bottom: CGFloat) {
    self.sw = sw
    self.sh = sh
    let keyTop = KOb.keyAreaTop(height: sh, bottomInset: bottom)
    let cardTop = top + 36
    let wordH = Self.wordLine * Self.wordScale
    let fixed = Self.headlineH + Self.pagerH + wordH + Self.appLineH
    let minGaps: CGFloat = 16 + 8 + 10 + 4 + 12
    let avail = keyTop - cardTop
    let h = min(232, max(168, avail - fixed - minGaps))
    let spare = max(0, avail - fixed - minGaps - h)
    headTop = cardTop + h + 16 + spare * 0.15
    let pagerTop = headTop + Self.headlineH + 8 + spare * 0.12
    groundY = pagerTop + Self.pagerH - 8
    wordTop = pagerTop + Self.pagerH + 10 + spare * 0.33
    appTop = wordTop + wordH + 4
    let cx = sw / 2
    dots = [cx - Self.pagerGap, cx, cx + Self.pagerGap]
    eggY = groundY - 2 - Self.pagerEgg * 0.928
    // the face; the React Native card kept its hard shadow's 4 inside the gutter
    card = CGRect(x: KOb.gutter, y: cardTop, width: sw - 2 * KOb.gutter - 4, height: h)
    groundX0 = cx - Self.pagerGap - 46
    groundX1 = cx + Self.pagerGap + 46
  }

  /// a point in the card's own coordinates → the window, with the card at rest (tilted about its centre)
  func cardToWindow(_ p: CGPoint) -> CGPoint {
    let a = Self.cardTilt * .pi / 180
    let dx = p.x - card.width / 2
    let dy = p.y - card.height / 2
    return CGPoint(x: card.midX + dx * cos(a) - dy * sin(a), y: card.midY + dx * sin(a) + dy * cos(a))
  }
}

/// The launch's last frame (LaunchAnimation launchGeometry): the mark, the word, the tag.
struct KObLaunchGeometry {
  let mark: CGRect
  let wordTop: CGFloat
  let tagTop: CGFloat

  init(sw: CGFloat, sh: CGFloat) {
    let size = min(sw * 0.38, 156)
    let y = sh * 0.4 - size / 2
    mark = CGRect(x: (sw - size) / 2, y: y, width: size, height: size)
    wordTop = y + size + 30
    tagTop = y + size + 88
  }
}

/// "kindredly" as the launch sets it: system 800 40/46 at −1.4, never scaled (it is the logo).
struct KObWordmark: View {
  var body: some View {
    Text(verbatim: "kindredly")
      .font(.system(size: 40, weight: .heavy))
      .tracking(-1.4)
      .foregroundStyle(KOb.white)
      .frame(height: KObDoorLayout.wordLine)
      .accessibilityHidden(true)
  }
}

/// The launch's tag and its mono line.
struct KObLaunchTag: View {
  let tag: String
  let sub: String
  var body: some View {
    VStack(spacing: 0) {
      Text(tag)
        .kText(.system(18, .medium, lineHeight: 24 / 18))
        .foregroundStyle(KOb.white)
        .multilineTextAlignment(.center)
      Text(sub)
        .kText(.mono(10.5, .semibold, tracking: 2.6 / 10.5))
        .foregroundStyle(KOb.white)
        .multilineTextAlignment(.center)
        .padding(.top, 10)
    }
    .frame(maxWidth: .infinity)
    .padding(.horizontal, 24)
  }
}

struct KObDoorstep<RouteBird: View>: View {
  let ctx: KObCtx
  let routeBird: RouteBird
  let onEggHandoff: () -> Void

  @Environment(\.accessibilityVoiceOverEnabled) private var reader
  /// how this screen opened, decided once
  @State private var entry: KObDoor.Entry
  /// the hand-off clock's start (nil: holding the first frame)
  @State private var hcStart: Date?
  @State private var hcCompleted = false
  @State private var seqDone: Bool
  @State private var veil: Bool
  @State private var veilOn: Bool
  @State private var exStart: Date?
  @State private var chipPop = 0
  @State private var page: Int? = 0
  @State private var scrollX: CGFloat = 0
  @State private var stopped = false
  @State private var leaving = false

  init(ctx: KObCtx, routeBird: RouteBird, onEggHandoff: @escaping () -> Void) {
    self.ctx = ctx
    self.routeBird = routeBird
    self.onEggHandoff = onEggHandoff
    let door = ctx.content.door
    let e: KObDoor.Entry = door.entry == .full && ctx.reduceMotion ? .still : door.entry
    _entry = State(initialValue: e)
    _seqDone = State(initialValue: e != .full)
    _veil = State(initialValue: e == .still)
    _veilOn = State(initialValue: e == .still)
  }

  private var still: Bool { ctx.reduceMotion || entry == .still }
  private var content: KObContent { ctx.content }

  var body: some View {
    let langRoom = content.door.showLang ? KObDoorLayout.langRoom : 0
    let L = KObDoorLayout(sw: ctx.size.width, sh: ctx.size.height, top: ctx.top + langRoom, bottom: ctx.bottom)
    let G = KObLaunchGeometry(sw: ctx.size.width, sh: ctx.size.height)
    // at rest and still (Reduce Motion, a still launch) nothing on the doorstep moves
    TimelineView(.animation(paused: still && seqDone && exStart == nil)) { tl in
      frame(L: L, G: G, now: tl.date)
    }
    .task { await hold() }
    .task(id: autoKey) { await autoAdvance() }
  }

  // MARK: the clocks

  private func hc(_ now: Date) -> Double {
    if entry != .full || hcCompleted { return KObLand.end }
    guard let hcStart else { return 0 }
    return min(KObLand.end, now.timeIntervalSince(hcStart) * 1000)
  }

  private func ex(_ now: Date) -> Double {
    guard let exStart else { return 0 }
    return KObEase.eio(KObEase.clamp01(now.timeIntervalSince(exStart) / 0.48))
  }

  /// hold the first frame until the route's and the runner's fades are done, then play
  private func hold() async {
    guard entry != .rest else { return }
    let waitMs = max(60, content.door.handedAt + 470 - Date().timeIntervalSince1970 * 1000)
    try? await Task.sleep(nanoseconds: UInt64(waitMs * 1_000_000))
    if entry == .full {
      hcStart = Date()
      try? await Task.sleep(nanoseconds: UInt64(KObLand.thunk * 1_000_000))
      if !hcCompleted { ctx.haptic("thunk") }
      try? await Task.sleep(nanoseconds: UInt64((KObLand.end - KObLand.thunk) * 1_000_000))
      seqDone = true
    } else {
      withAnimation(.easeOut(duration: 0.22)) { veilOn = false } completion: { veil = false }
    }
  }

  private var autoKey: String { "\(seqDone)|\(still)|\(stopped)|\(reader)|\(content.side?.rawValue ?? "")" }

  /// every 4.5 s, until a touch, Reduce Motion, VoiceOver, or the sheet
  private func autoAdvance() async {
    guard seqDone, !still, !stopped, !reader, content.side == nil else { return }
    while !Task.isCancelled {
      try? await Task.sleep(nanoseconds: 4_500_000_000)
      if Task.isCancelled { return }
      withAnimation(.easeInOut(duration: 0.45)) { page = ((page ?? 0) + 1) % 3 }
    }
  }

  private func completeNow(_ now: Date) {
    guard entry == .full, !seqDone, hc(now) >= 600 else { return }
    hcCompleted = true
    seqDone = true
  }

  private func onHatch() {
    guard !leaving else { return }
    leaving = true
    stopped = true
    if still {
      ctx.send("advance")
      return
    }
    exStart = Date()
    Task {
      try? await Task.sleep(nanoseconds: 480_000_000)
      onEggHandoff()
      ctx.send("advance")
    }
  }

  // MARK: the frame

  @ViewBuilder
  private func frame(L: KObDoorLayout, G: KObLaunchGeometry, now: Date) -> some View {
    let h = hc(now)
    let e = ex(now)
    let hero = KOb.heroRect(width: ctx.size.width, height: ctx.size.height, topInset: ctx.top, bottomInset: ctx.bottom).rect
    ZStack(alignment: .topLeading) {
      if entry == .full {
        let g = KObEase.eo(KObEase.seg(h, 0, 160))
        KObLaunchTag(tag: ctx.w("launch.tag"), sub: ctx.w("launch.sub"))
          .opacity(1 - g)
          .offset(y: G.tagTop + 6 * g)
          .allowsHitTesting(false)
      }

      headline(L: L, h: h, e: e)
      pager(L: L, h: h, e: e)
      wordmark(L: L, G: G, h: h, e: e)
      appLine(L: L, h: h, e: e)
      card(L: L, h: h, e: e, now: now)
      chip(L: L, h: h, e: e)
      pagerEgg(L: L, hero: hero, h: h, e: e)
      keys(L: L, h: h, e: e)

      if content.door.showLang {
        Button { ctx.send("lang") } label: {
          Text(ctx.w("door.langChip"))
            .kText(.system(13, .semibold))
            .foregroundStyle(KOb.white)
            .padding(.horizontal, 12)
            .frame(height: 30)
            .overlay(Capsule().strokeBorder(KOb.white, lineWidth: 1.5))
        }
        .buttonStyle(KObPressStyle(pressedOpacity: 0.7))
        .accessibilityLabel(ctx.w("door.lang"))
        .frame(width: ctx.size.width - 16, alignment: .trailing)
        .offset(y: ctx.top + 2)
      }

      if entry == .full {
        traveller(L: L, G: G, h: h)
      }

      if veil {
        KObLaunchFrame(G: G, tag: ctx.w("launch.tag"), sub: ctx.w("launch.sub"))
          .frame(width: ctx.size.width, height: ctx.size.height)
          .opacity(veilOn ? 1 : 0)
          .allowsHitTesting(false)
      }

      if !seqDone {
        Color.clear
          .contentShape(Rectangle())
          .frame(width: ctx.size.width, height: ctx.size.height)
          .onTapGesture { completeNow(Date()) }
          .accessibilityHidden(true)
      }
    }
    .frame(width: ctx.size.width, height: ctx.size.height, alignment: .topLeading)
  }

  private func riseIn(_ h: Double, _ e: Double, from: Double) -> (opacity: Double, y: Double) {
    let g = KObEase.eo(KObEase.seg(h, from, from + 200))
    return (g * (1 - e), 8 * (1 - g) + 24 * e)
  }

  private func headline(L: KObDoorLayout, h: Double, e: Double) -> some View {
    let r = riseIn(h, e, from: 900)
    let heads = [ctx.w("door.head0"), ctx.w("door.head1"), ctx.w("door.head2")]
    let i = min(2, max(0, page ?? 0))
    return ZStack {
      Text(heads[i])
        .kText(.obHeadline)
        .foregroundStyle(KOb.white)
        .multilineTextAlignment(.center)
        .lineLimit(2)
        .minimumScaleFactor(0.8)
        .frame(maxWidth: .infinity)
        .id(reader ? 0 : i)
        .transition(.opacity.animation(.easeInOut(duration: 0.22)))
        .accessibilityAddTraits(.isHeader)
        .obFocusOnAppear()
    }
    .frame(width: ctx.size.width - 2 * KOb.gutter, height: KObDoorLayout.headlineH)
    .opacity(r.opacity)
    .offset(x: KOb.gutter, y: L.headTop + r.y)
    .animation(.easeInOut(duration: 0.22), value: i)
    .allowsHitTesting(false)
  }

  private func pager(L: KObDoorLayout, h: Double, e: Double) -> some View {
    let active = min(2, max(0, page ?? 0))
    return Canvas { g, _ in
      var line = Path()
      line.move(to: CGPoint(x: L.groundX0, y: 6))
      line.addLine(to: CGPoint(x: L.groundX1, y: 6))
      g.stroke(line, with: .color(KOb.white), style: StrokeStyle(lineWidth: 2, lineCap: .round))
      for (i, x) in L.dots.enumerated() {
        let r: CGFloat = i == active ? 4.5 : 3.5
        g.fill(Path(ellipseIn: CGRect(x: x - r, y: 6 - r, width: 2 * r, height: 2 * r)), with: .color(KOb.white))
      }
    }
    .frame(width: ctx.size.width, height: 12)
    .opacity(KObEase.seg(h, 520, 760) * (1 - e))
    .offset(y: L.groundY - 6)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }

  private func wordmark(L: KObDoorLayout, G: KObLaunchGeometry, h: Double, e: Double) -> some View {
    let g = KObEase.eo(KObEase.seg(h, 300, 700))
    let start = G.wordTop + KObDoorLayout.wordLine / 2
    let rest = L.wordTop + KObDoorLayout.wordLine * KObDoorLayout.wordScale / 2
    return KObWordmark()
      .scaleEffect(1 + (KObDoorLayout.wordScale - 1) * g)
      .frame(width: ctx.size.width)
      .opacity(1 - e)
      .offset(y: G.wordTop + (rest - start) * g + 24 * e)
      .allowsHitTesting(false)
  }

  private func appLine(L: KObDoorLayout, h: Double, e: Double) -> some View {
    let g = KObEase.eo(KObEase.seg(h, 500, 760))
    return Text(ctx.w("door.app"))
      .kText(.obLineSmall)
      .foregroundStyle(KOb.white)
      .multilineTextAlignment(.center)
      .lineLimit(2)
      .minimumScaleFactor(0.85)
      .frame(width: ctx.size.width - 2 * KOb.gutter)
      .opacity(g * (1 - e))
      .offset(x: KOb.gutter, y: L.appTop + 6 * (1 - g) + 24 * e)
      .allowsHitTesting(false)
  }

  private func card(L: KObDoorLayout, h: Double, e: Double, now: Date) -> some View {
    let r = KObEase.seg(h, 80, 520)
    let dip = h > KObLand.thunk && h < KObLand.thunk + 120 ? 3 * sin(.pi * (h - KObLand.thunk) / 120) : 0
    let riseFrom = ctx.size.height - L.card.minY + 40
    let shape = RoundedRectangle(cornerRadius: KObDoorLayout.cardRadius, style: .continuous)
    return KObShowcase(
      ctx: ctx,
      size: L.card.size,
      page: $page,
      scrollX: $scrollX,
      hc: h,
      firstFromLaunch: entry == .full,
      still: still,
      now: now,
      routeBird: routeBird,
      onTouch: { stopped = true },
      onChipPop: { chipPop += 1 }
    )
    .frame(width: L.card.width, height: L.card.height)
    .background(KOb.paper)
    .clipShape(shape)
    .obDepth(shape, onBlue: true)
    .rotationEffect(.degrees(KObDoorLayout.cardTilt))
    .opacity((h < 80 ? 0 : 1) * (1 - e))
    .offset(x: L.card.minX, y: L.card.minY + (1 - KObEase.backOut(r)) * riseFrom + dip + 24 * e)
  }

  private func chip(L: KObDoorLayout, h: Double, e: Double) -> some View {
    let g = KObEase.seg(h, 760, 1000)
    let chips = [ctx.w("door.chip0"), ctx.w("door.chip1"), ctx.w("door.chip2")]
    let i = min(2, max(0, page ?? 0))
    return ZStack {
      HStack(spacing: 7) {
        Circle().fill(KOb.acid).frame(width: 8, height: 8)
        Text(chips[i])
          .kText(.system(12.5, .semibold))
          .foregroundStyle(KOb.white)
          .lineLimit(1)
      }
      .padding(.horizontal, 12)
      .frame(height: 28)
      .background(Capsule().fill(KOb.ink))
      .id(i)
      .transition(.opacity.animation(.easeInOut(duration: 0.2)))
    }
    .keyframeAnimator(initialValue: 0.0, trigger: chipPop) { v, k in
      v.scaleEffect(1 + 0.08 * k)
    } keyframes: { _ in
      LinearKeyframe(1.0, duration: 0.11)
      SpringKeyframe(0.0, duration: 0.4, spring: Spring(mass: 1, stiffness: 220, damping: 9))
    }
    .scaleEffect(0.9 + 0.1 * KObEase.backOut(g))
    .frame(width: L.card.width, height: 28)
    .opacity(g * (1 - e))
    .offset(x: L.card.minX, y: L.card.minY - 14 + 24 * e)
    .animation(.easeInOut(duration: 0.2), value: i)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }

  /// your egg on the active dot: drawn at the hero's size and scaled down, so growing into 2 stays sharp
  private func pagerEgg(L: KObDoorLayout, hero: CGRect, h: Double, e: Double) -> some View {
    let H = hero.width
    let gap = KObDoorLayout.pagerGap
    let eggCx = L.dots[0]
    let eggCy = L.eggY + KObDoorLayout.pagerEgg / 2
    let rollFrom = ctx.size.width + KObDoorLayout.pagerEgg - eggCx
    let k = KObEase.seg(h, 600, 1050)
    let travel = Double(rollFrom) * (1 - KObEase.eo(k))
    let prog = min(2, max(0, Double(scrollX / max(1, L.card.width))))
    let kk = KObEase.seg(h, 1050, KObLand.end)
    let rock = kk <= 0 || kk >= 1 ? 0 : (kk < 0.5 ? -6 : -3) * sin(2 * .pi * kk)
    let e1 = KObEase.eo(KObEase.seg(e, 0, 0.5))
    let e2 = KObEase.eo(KObEase.seg(e, 0.3, 1))
    let toCentre = Double(ctx.size.width / 2 - (eggCx + CGFloat(prog) * gap))
    let dx = travel + prog * Double(gap) + toCentre * e1
    let rot = travel / Double(rollFrom) * 360 + prog * 360 + toCentre / Double(gap) * 360 * e1 + rock
    let small = KObDoorLayout.pagerEgg / H
    let scale = small + (1 - small) * CGFloat(e2)
    return ZStack {
      KObWarmth(size: H * 1.5).opacity(e2)
      KObEgg(shell: nil, size: H).opacity(1 - e2)
      KObEgg(shell: content.shell, size: H).opacity(e2)
    }
    .frame(width: H, height: H)
    .rotationEffect(.degrees(rot))
    .scaleEffect(scale)
    .opacity(h >= 600 ? 1 : 0)
    .offset(x: eggCx - H / 2 + CGFloat(dx), y: eggCy - H / 2 + (hero.midY - eggCy) * CGFloat(e2))
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }

  private func keys(L: KObDoorLayout, h: Double, e: Double) -> some View {
    let key = riseIn(h, e, from: 940)
    let link = riseIn(h, e, from: 980)
    let line = KObLinked.attributed(ctx.w("door.signin"), bold: true)
    return KObKeyArea(bottomInset: ctx.bottom) {
      KObAcidKey(label: ctx.w("door.key"), action: onHatch)
        .opacity(key.opacity)
        .offset(y: key.y)
    } secondary: {
      Button { ctx.send("side", "signin") } label: {
        Text(line)
          .kText(.obTextKey)
          .foregroundStyle(KOb.white)
          .tint(KOb.white)
          .multilineTextAlignment(.center)
          .padding(.horizontal, 12)
          .frame(minHeight: 44)
          .contentShape(Rectangle())
      }
      .buttonStyle(KObPressStyle(pressedOpacity: 0.6))
      .environment(\.openURL, OpenURLAction { _ in
        ctx.send("side", "signin")
        return .handled
      })
      .opacity(link.opacity)
      .offset(y: link.y)
    }
    .frame(width: ctx.size.width)
    .frame(height: ctx.size.height, alignment: .bottom)
  }

  /// the launch's mark flying to slide 1's stamp corner (frame 0: exactly where the launch left it)
  private func traveller(L: KObDoorLayout, G: KObLaunchGeometry, h: Double) -> some View {
    let M = G.mark.width
    let c0 = CGPoint(x: G.mark.midX, y: G.mark.midY)
    let sb = KObSlide1.stampBox(w: L.card.width, h: L.card.height)
    let c1 = L.cardToWindow(CGPoint(x: sb.midX, y: sb.midY))
    let ctrl = CGPoint(x: (c0.x + c1.x) / 2 - 56, y: min(c0.y, c1.y) - 6)
    let s1 = sb.width / M
    let p = KObEase.seg(h, KObLand.travelFrom, KObLand.thunk)
    let u = CGFloat(KObEase.eio(p))
    let v = 1 - u
    let x = v * v * c0.x + 2 * v * u * ctrl.x + u * u * c1.x
    let y = v * v * c0.y + 2 * v * u * ctrl.y + u * u * c1.y
    let k = CGFloat(1 - pow(1 - p, 2.2))
    let plate = 0.9 + 0.1 * KObEase.eo(KObEase.seg(h, KObLand.windowFrom, KObLand.thunk))
    return ZStack(alignment: .topLeading) {
      Rectangle()
        .fill(KOb.blue)
        .frame(width: M * 0.8, height: M)
        .scaleEffect(plate)
        .offset(x: M * 0.1)
      KObLaunchMark(size: M)
    }
    .frame(width: M, height: M, alignment: .topLeading)
    .rotationEffect(.degrees(KObDoorLayout.cardTilt * Double(u)))
    .scaleEffect(1 + (s1 - 1) * k)
    .opacity(h < KObLand.thunk ? 1 : 0)
    .offset(x: x - M / 2, y: y - M / 2)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

/// The launch's still frame (LaunchFrame), for the Reduce Motion cross-fade.
struct KObLaunchFrame: View {
  let G: KObLaunchGeometry
  let tag: String
  let sub: String

  var body: some View {
    ZStack(alignment: .topLeading) {
      KOb.blue
      KObLaunchMark(size: G.mark.width)
        .offset(x: G.mark.minX, y: G.mark.minY)
      KObWordmark()
        .frame(maxWidth: .infinity)
        .offset(y: G.wordTop)
      KObLaunchTag(tag: tag, sub: sub)
        .offset(y: G.tagTop)
    }
    .accessibilityHidden(true)
  }
}

// MARK: - the live card (s01-showcase)

struct KObShowcase<RouteBird: View>: View {
  let ctx: KObCtx
  let size: CGSize
  @Binding var page: Int?
  @Binding var scrollX: CGFloat
  let hc: Double
  let firstFromLaunch: Bool
  let still: Bool
  let now: Date
  let routeBird: RouteBird
  let onTouch: () -> Void
  let onChipPop: () -> Void

  var body: some View {
    ScrollView(.horizontal) {
      HStack(spacing: 0) {
        ForEach(0..<3, id: \.self) { i in
          slide(i)
            .frame(width: size.width, height: size.height)
            .clipped()
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(ctx.w("door.slide\(i)"))
            .accessibilityAddTraits(.isImage)
            .id(i)
        }
      }
      .scrollTargetLayout()
    }
    .scrollTargetBehavior(.paging)
    .scrollPosition(id: $page)
    .scrollIndicators(.hidden)
    .scrollBounceBehavior(.basedOnSize)
    .onScrollGeometryChange(for: CGFloat.self) { $0.contentOffset.x } action: { _, x in scrollX = x }
    .onScrollPhaseChange { _, phase in
      if phase == .interacting { onTouch() }
    }
  }

  @ViewBuilder
  private func slide(_ i: Int) -> some View {
    switch i {
    case 0:
      KObSlide1(ctx: ctx, size: size, active: page == 0, hc: hc, firstFromLaunch: firstFromLaunch, still: still, now: now)
    case 1:
      KObSlide2(ctx: ctx, size: size, active: page == 1, still: still, now: now, routeBird: routeBird, onLand: onChipPop)
    default:
      KObSlide3(ctx: ctx, size: size, active: page == 2, still: still, now: now, onTrade: onChipPop)
    }
  }
}

/// The envelope's paper: the airmail band round a white middle, the content centred in it.
struct KObAirmailPaper<Content: View>: View {
  var radius: CGFloat = 20
  var band: CGFloat = 9
  var padX: CGFloat = 16
  @ViewBuilder let content: Content

  var body: some View {
    ZStack {
      KObAirmail()
      RoundedRectangle(cornerRadius: max(2, radius - band), style: .continuous)
        .fill(KOb.paper)
        .padding(band)
      VStack(alignment: .leading, spacing: 0) { content }
        .padding(.horizontal, band + padX)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
  }
}

/// The Today card's docket at `k` (s06-envelope-front Docket): the face, the name over the date,
/// the stamp corner.
struct KObDocket<Face: View, Name: View, Date_: View, Stamp: View>: View {
  let k: CGFloat
  @ViewBuilder let face: Face
  @ViewBuilder let name: Name
  @ViewBuilder let date: Date_
  @ViewBuilder let stamp: Stamp

  var body: some View {
    HStack(spacing: 0) {
      face.frame(width: 40 * k, height: 40 * k)
      VStack(alignment: .leading, spacing: 2 * k) {
        name
        date
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(.leading, 10 * k)
      .padding(.trailing, 10 * k * 0.6)
      stamp.frame(width: 40 * k, height: 48 * k)
    }
    .frame(height: 48 * k)
  }
}

/// A courier name with its mark and sign after it (WhoName's order and sizes).
struct KObNameMarks: View {
  let name: String
  let mark: KLineGlyph?
  let sign: KLineGlyph?
  let size: CGFloat

  var body: some View {
    let g = (size * 0.8).rounded()
    HStack(spacing: 0) {
      Text(name)
        .kText(.system(size, .semibold, tracking: -0.2 / size))
        .foregroundStyle(KOb.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
      if mark != nil || sign != nil {
        HStack(spacing: 4 * size / 17) {
          if let mark { KOwnMark(mark, size: g + 2, ink: KOb.inkSoft) }
          if let sign { KOwnMark(sign, size: g + 2, ink: KOb.inkSoft) }
        }
        .padding(.leading, 6 * size / 17)
        .fixedSize()
      }
    }
  }
}

/// The date under the name: mono 500 11k in quiet ink.
struct KObDocketDate: View {
  let text: String
  let k: CGFloat
  var body: some View {
    Text(text)
      .kText(.mono(11 * k, .medium, tracking: 0.08))
      .foregroundStyle(KOb.inkSoft)
      .lineLimit(1)
  }
}

// MARK: slide 1: the letter, the stamp, the line

/// The launch's mark as a stamp (s06-envelope-front MarkStampPaper / MarkStampArt): the v3 frame
/// stretched round a Post Blue window holding the white mark, `width` × 1.2 width.
struct KObMarkStampPaper: View {
  let width: CGFloat
  static let frame: Path = {
    let sx: CGFloat = 94 / 80
    let sy: CGFloat = 114 / 88
    let t = CGAffineTransform(translationX: 3 - 10 * sx, y: 3 - 25 * sy).scaledBy(x: sx, y: sy)
    return KSVGPath.path(KStampArtData.v3FramePath).applying(t)
  }()

  var body: some View {
    Canvas { gc, canvas in
      var g = gc
      g.scaleBy(x: canvas.width / 100, y: canvas.width / 100)
      g.fill(Self.frame, with: .color(KOb.paper))
      g.stroke(Self.frame, with: .color(KOb.ink), style: StrokeStyle(lineWidth: 6, lineJoin: .round))
    }
    .frame(width: width, height: width * 1.2)
    .accessibilityHidden(true)
  }
}

struct KObMarkStampArt: View {
  let width: CGFloat
  var body: some View {
    ZStack(alignment: .topLeading) {
      Rectangle().fill(KOb.blue)
        .frame(width: width * 0.8, height: width)
        .offset(x: width * 0.1, y: width * 0.1)
      KObLaunchMark(size: width)
        .offset(y: width * 0.1)
    }
    .frame(width: width, height: width * 1.2, alignment: .topLeading)
    .accessibilityHidden(true)
  }
}

struct KObSlide1: View {
  static let k: CGFloat = 1.25
  static let below: CGFloat = 44
  static let gap: CGFloat = 10
  static let tilt = 2.0

  /// where slide 1's stamp corner is in the card (s01-showcase slide1StampBox: envelopeStampBox
  /// with the docket at 1.25, two lines under it), the card being `w` × `h`
  static func stampBox(w: CGFloat, h: CGFloat) -> CGRect {
    let content = 48 * k + gap + below
    let top = max(9 + 12, (h - content) / 2)
    return CGRect(x: w - 9 - 16 - 40 * k, y: top, width: 40 * k, height: 48 * k)
  }

  let ctx: KObCtx
  let size: CGSize
  let active: Bool
  let hc: Double
  let firstFromLaunch: Bool
  let still: Bool
  let now: Date

  /// a later visit: the slide's own small landing (nil: the first one, mirroring the hand-off)
  @State private var landStart: Date?
  @State private var visits = 0
  /// when the line started typing
  @State private var typeStart: Date?

  private var land: Double {
    if still { return KObLand.end }
    if let landStart { return min(KObLand.end, now.timeIntervalSince(landStart) * 1000) }
    return firstFromLaunch ? hc : KObLand.end
  }
  /// the mark that lands is the launch's own (the first visit from the launch)
  private var travelling: Bool { landStart == nil && firstFromLaunch && !still }

  var body: some View {
    let k = Self.k
    let line = ctx.w("door.s1letter")
    let l = land
    let typed: Int = {
      if still { return line.count }
      guard let typeStart else { return 0 }
      return min(line.count, Int(now.timeIntervalSince(typeStart) * 1000 / 34))
    }()
    KObAirmailPaper(radius: KObDoorLayout.cardRadius) {
      Spacer(minLength: 0)
      KObDocket(k: k) {
        if let spec = ctx.content.door.frostThem {
          KFrost(theme: .classic, spec: spec, size: 40 * k)
        }
      } name: {
        KObNameMarks(name: ctx.content.door.sample, mark: .she, sign: .gemini, size: 17 * k)
      } date: {
        KObDocketDate(text: ctx.content.door.date, k: k)
      } stamp: {
        corner(l)
      }
      typedLine(line: line, typed: typed)
        .frame(height: Self.below, alignment: .top)
        .padding(.top, Self.gap)
      Spacer(minLength: 0)
    }
    .onChange(of: l >= KObLand.typeFrom, initial: true) { _, on in
      if on && typeStart == nil && !still { typeStart = now }
    }
    .onChange(of: active, initial: true) { _, on in
      guard on, !still else { return }
      visits += 1
      // the first visit is the hand-off's (or opened at rest: the line types once)
      guard visits > 1 else { return }
      typeStart = nil
      landStart = Date()
    }
  }

  private func typedLine(line: String, typed: Int) -> some View {
    let shown = String(line.prefix(typed))
    let caretOn = still ? 0.0 : (sin(now.timeIntervalSinceReferenceDate * .pi / 0.52) + 1) / 2
    return (Text(shown).foregroundStyle(KOb.ink) + Text(verbatim: still ? "" : "|").foregroundStyle(KOb.blue.opacity(caretOn)))
      .kText(.content(16.5, italic: true, lineHeight: 22 / 16.5))
      .lineLimit(2)
      .fixedSize(horizontal: false, vertical: true)
      .frame(maxWidth: .infinity, alignment: .topLeading)
  }

  private func corner(_ l: Double) -> some View {
    let w = 40 * Self.k
    let slot = 1 - KObEase.seg(l, KObLand.thunk, KObLand.thunk + 80)
    let s = KObEase.seg(l, KObLand.thunk, KObLand.thunk + 170)
    let over = s < 1 ? sin(s * .pi) * 0.8 : 0
    let tilt = Self.tilt * KObEase.eo(s) + over
    let p = KObEase.seg(l, KObLand.thunk, KObLand.thunk + 110)
    let a = KObEase.seg(l, KObLand.windowFrom - 140, KObLand.thunk)
    let artOpacity = travelling ? (l >= KObLand.thunk ? 1 : 0) : a
    let artScale = travelling ? 1 : 1.7 - 0.7 * KObEase.eo(a)
    return ZStack(alignment: .topLeading) {
      KStampSlot(width: w, stroke: Color(hex: "#B3B0C9")).opacity(slot)
      ZStack(alignment: .topLeading) {
        KObMarkStampPaper(width: w)
          .scaleEffect(1.14 - 0.14 * KObEase.eo(p))
          .opacity(p)
        KObMarkStampArt(width: w)
          .scaleEffect(artScale)
          .opacity(artOpacity)
      }
      .rotationEffect(.degrees(tilt))
    }
    .frame(width: w, height: w * 1.2, alignment: .topLeading)
  }
}

// MARK: slide 2: the route chart

/// the route loop's clock, in seconds (s01-showcase R)
enum KObRoute {
  static let loop = 4.1
  static let outFrom = 0.35
  static let outTo = 1.55
  static let backFrom = 1.9
  static let backTo = 3.1
  static let bird: CGFloat = 50
  static let n = 12
}

struct KObSlide2<RouteBird: View>: View {

  let ctx: KObCtx
  let size: CGSize
  let active: Bool
  let still: Bool
  let now: Date
  let routeBird: RouteBird
  let onLand: () -> Void

  @State private var start: Date?
  @State private var landedLoop = -1

  private typealias Pt = CGPoint

  private var home: Pt { Pt(x: size.width * 0.17, y: size.height * 0.72) }
  private var far: Pt { Pt(x: size.width * 0.8, y: size.height * 0.4) }
  private var out: [Pt] { [home, Pt(x: size.width * 0.1, y: size.height * 0.3), Pt(x: size.width * 0.52, y: size.height * 0.16), far] }
  private var back: [Pt] { [far, Pt(x: size.width * 0.98, y: size.height * 0.72), Pt(x: size.width * 0.52, y: size.height * 1.0), home] }

  private static func cubic(_ c: [Pt], _ u: CGFloat) -> Pt {
    let v = 1 - u
    let x = v * v * v * c[0].x + 3 * v * v * u * c[1].x + 3 * v * u * u * c[2].x + u * u * u * c[3].x
    let y = v * v * v * c[0].y + 3 * v * v * u * c[1].y + 3 * v * u * u * c[2].y + u * u * u * c[3].y
    return Pt(x: x, y: y)
  }

  private var clock: Double {
    if still { return KObRoute.loop }
    guard active, let start else { return 0 }
    return now.timeIntervalSince(start).truncatingRemainder(dividingBy: KObRoute.loop)
  }

  /// the bird's place at `c` (the React Native interpolate over the sampled path)
  private func place(_ c: Double) -> Pt {
    if c <= KObRoute.outFrom || c >= KObRoute.loop { return home }
    if c <= KObRoute.outTo {
      return Self.cubic(out, CGFloat((c - KObRoute.outFrom) / (KObRoute.outTo - KObRoute.outFrom)))
    }
    if c < KObRoute.backFrom { return far }
    if c <= KObRoute.backTo {
      return Self.cubic(back, CGFloat((c - KObRoute.backFrom) / (KObRoute.backTo - KObRoute.backFrom)))
    }
    return home
  }

  var body: some View {
    let c = clock
    let p = place(c)
    let goingBack = c > (KObRoute.outTo + KObRoute.backFrom) / 2 && c < KObRoute.loop - 0.05
    let lift: CGFloat = c > KObRoute.outFrom && c < KObRoute.backTo ? -4 : 0
    let drop = KObEase.seg(c, KObRoute.outTo, KObRoute.outTo + 0.25)
    ZStack(alignment: .topLeading) {
      KOb.paper
      chart
      trail(c)
      Text(ctx.w("door.yourCity"))
        .kText(.mono(8.5, .semibold, tracking: 1.2 / 8.5))
        .foregroundStyle(KOb.ink)
        .multilineTextAlignment(.center)
        .frame(width: 100)
        .offset(x: home.x - 50, y: home.y + 14)
      Text(ctx.w("door.themCaps"))
        .kText(.mono(8.5, .semibold, tracking: 1.2 / 8.5))
        .foregroundStyle(KOb.ink)
        .lineLimit(1)
        .frame(width: size.width * 0.5, alignment: .trailing)
        .offset(x: size.width - 8 - size.width * 0.5, y: far.y - 30)
      KObPlainEnvelope(width: 22)
        .scaleEffect(0.6 + 0.4 * KObEase.eo(drop))
        .opacity(drop)
        .offset(x: far.x + 8, y: far.y + 6)
      routeBird
        .frame(width: KObRoute.bird, height: KObRoute.bird)
        .scaleEffect(x: goingBack ? -1 : 1, y: 1)
        .offset(x: p.x - KObRoute.bird / 2, y: p.y - KObRoute.bird * 0.62 + lift)
        .allowsHitTesting(false)
    }
    .frame(width: size.width, height: size.height, alignment: .topLeading)
    .onChange(of: active, initial: true) { _, on in
      start = on && !still ? Date() : nil
    }
    .onChange(of: c >= KObRoute.backTo) { _, landed in
      if landed && active && !still { onLand() }
    }
  }

  private var chart: some View {
    Canvas { g, sz in
      let grid: CGFloat = 18
      var lines = Path()
      var x: CGFloat = 0
      while x <= sz.width + grid {
        lines.move(to: CGPoint(x: x, y: 0))
        lines.addLine(to: CGPoint(x: x, y: sz.height))
        x += grid
      }
      var y: CGFloat = 0
      while y <= sz.height + grid {
        lines.move(to: CGPoint(x: 0, y: y))
        lines.addLine(to: CGPoint(x: sz.width, y: y))
        y += grid
      }
      g.stroke(lines, with: .color(KOb.ink.opacity(0.07)), lineWidth: 1)
      for c in [out, back] {
        var p = Path()
        p.move(to: c[0])
        p.addCurve(to: c[3], control1: c[1], control2: c[2])
        g.stroke(p, with: .color(KOb.ink.opacity(0.22)), style: StrokeStyle(lineWidth: 1.2, dash: [3, 5]))
      }
      for (i, s) in [home, far].enumerated() {
        let r: CGFloat = 9
        let ring = Path(ellipseIn: CGRect(x: s.x - r, y: s.y - r, width: 2 * r, height: 2 * r))
        g.fill(ring, with: .color(KOb.paper))
        g.stroke(ring, with: .color(KOb.ink), lineWidth: 1.6)
        g.fill(Path(CGRect(x: s.x - 2.8, y: s.y - 2.8, width: 5.6, height: 5.6)), with: .color(i == 0 ? KOb.ink : KOb.blue))
      }
    }
    .accessibilityHidden(true)
  }

  private func trail(_ c: Double) -> some View {
    Canvas { g, _ in
      for leg in 0..<2 {
        for i in 0...KObRoute.n {
          let u = CGFloat(i) / CGFloat(KObRoute.n)
          let pt = Self.cubic(leg == 0 ? out : back, u)
          let at = leg == 0 ? KObRoute.outFrom + Double(u) * (KObRoute.outTo - KObRoute.outFrom) : KObRoute.backFrom + Double(u) * (KObRoute.backTo - KObRoute.backFrom)
          let o: Double
          if still {
            o = 0.55
          } else if c < at - 0.02 {
            o = 0
          } else if c < at {
            o = 0.7 * (c - (at - 0.02)) / 0.02
          } else if c < KObRoute.loop - 0.35 {
            o = 0.7
          } else {
            o = 0.7 * (1 - KObEase.seg(c, KObRoute.loop - 0.35, KObRoute.loop))
          }
          if o > 0 {
            g.fill(Path(ellipseIn: CGRect(x: pt.x - 2.2, y: pt.y - 2.2, width: 4.4, height: 4.4)), with: .color(KOb.blue.opacity(o)))
          }
        }
      }
    }
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

// MARK: slide 3: five letters each, then the names

struct KObSlide3: View {
  static let fillFrom = 0.25
  static let cell = 0.15
  static let strike = 1.95
  static let wipeFrom = 2.15
  static let wipeTo = 2.55
  static let signFrom = 2.55
  static let signTo = 3.25
  static let fadeFrom = 3.95
  static let loop = 4.3
  static let win: CGFloat = 56
  /// two signatures drawn by hand on a 90 × 24 box (no letters anyone could read)
  static let sigs: [Path] = [
    KSVGPath.path("M3 17 C7 4 11 3 11 12 C11 18 14 18 17 11 C19 7 21 8 21 13 C21 17 24 17 27 12 C30 7 31 9 31 13 C32 18 36 16 39 10 C41 6 43 7 43 12 C43 16 47 16 51 9 M55 14 C60 11 66 10 74 12 C79 13 84 12 88 9"),
    KSVGPath.path("M4 14 C8 6 14 4 13 11 C12 17 8 19 7 15 C6 11 14 9 20 12 C24 14 25 18 29 13 C33 8 34 6 36 12 C37 16 40 17 44 11 C47 7 50 8 50 13 C50 17 55 17 60 12 C64 9 70 9 78 11 C82 12 85 11 87 8"),
  ]

  let ctx: KObCtx
  let size: CGSize
  let active: Bool
  let still: Bool
  let now: Date
  let onTrade: () -> Void

  @State private var start: Date?

  private var clock: Double {
    if still { return Self.signTo }
    guard active, let start else { return 0 }
    return now.timeIntervalSince(start).truncatingRemainder(dividingBy: Self.loop)
  }

  var body: some View {
    let c = clock
    let n = c >= Self.loop - 0.02 ? 0 : max(0, min(5, Int(floor(((c - Self.fillFrom) / Self.cell - 1) / 2)) + 1))
    let top = max(14, (size.height - (Self.win + 8 + 9 + 10 + 16 + 4 + 24)) / 2)
    let door = ctx.content.door
    ZStack(alignment: .topLeading) {
      KOb.paper
      Text(ctx.w("door.count").replacingOccurrences(of: "{n}", with: "\(n)"))
        .kText(.mono(9.5, .semibold, tracking: 1.4 / 9.5))
        .foregroundStyle(KOb.ink)
        .frame(width: size.width)
        .offset(y: top + Self.win / 2 - 7)
      column(c, side: 0, spec: door.frostThem, face: door.faceThem, name: door.sample)
        .offset(x: size.width * 0.3 - 60, y: top)
      column(c, side: 1, spec: door.frostYou, face: door.faceYou, name: ctx.w("door.you"))
        .offset(x: size.width * 0.7 - 60, y: top)
    }
    .frame(width: size.width, height: size.height, alignment: .topLeading)
    .onChange(of: active, initial: true) { _, on in
      start = on && !still ? Date() : nil
    }
    .onChange(of: c >= Self.wipeTo) { _, traded in
      if traded && active && !still { onTrade() }
    }
  }

  private func column(_ c: Double, side: Int, spec: KFrostSpec?, face: KImageRef?, name: String) -> some View {
    VStack(spacing: 0) {
      window(c, spec: spec, face: face)
      HStack(spacing: 3) {
        ForEach(0..<5, id: \.self) { i in
          let at = Self.fillFrom + Double(i * 2 + side) * Self.cell
          let on = c >= at && c < Self.loop - 0.02
          RoundedRectangle(cornerRadius: 2, style: .continuous)
            .fill(on ? KOb.blue : Color.clear)
            .overlay(RoundedRectangle(cornerRadius: 2, style: .continuous).strokeBorder(KOb.ink, lineWidth: 1.4))
            .frame(width: 9, height: 9)
            .scaleEffect(on ? 0.8 + 0.2 * KObEase.eo(KObEase.seg(c, at, at + 0.12)) : 1)
        }
      }
      .padding(.top, 8)
      struck(c, name: name, strike: side == 0)
        .padding(.top, 9)
      Self.sigs[side]
        .trimmedPath(from: 0, to: KObEase.seg(c, Self.signFrom, Self.signTo))
        .stroke(KOb.ink.opacity(1 - KObEase.seg(c, Self.fadeFrom, Self.loop)), style: StrokeStyle(lineWidth: 1.7, lineCap: .round, lineJoin: .round))
        .frame(width: 90, height: 24)
        .padding(.top, 4)
    }
    .frame(width: 120)
  }

  private func window(_ c: Double, spec: KFrostSpec?, face: KImageRef?) -> some View {
    let win = Self.win
    let s = KObEase.seg(c, Self.wipeTo - 0.1, Self.wipeTo + 0.2) * (1 - KObEase.seg(c, Self.fadeFrom, Self.loop))
    let radius = win * 0.25 + win * 0.25 * CGFloat(KObEase.eo(s))
    let open = KObEase.seg(c, Self.wipeFrom, Self.wipeTo)
    let back = KObEase.seg(c, Self.fadeFrom, Self.loop)
    let frostW = win * CGFloat(1 - KObEase.eo(open)) + win * CGFloat(back) * (open >= 1 ? 1 : 0)
    return ZStack(alignment: .topTrailing) {
      KOb.lavenderSoft
      KImage(face, size: CGSize(width: win, height: win), contentMode: .fill, placeholder: KOb.lavenderSoft)
      if let spec {
        KFrost(theme: .classic, spec: spec, size: win)
          .frame(width: frostW, height: win, alignment: .trailing)
          .clipped()
      }
    }
    .frame(width: win, height: win)
    .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
  }

  private func struck(_ c: Double, name: String, strike: Bool) -> some View {
    let s = KObEase.seg(c, Self.strike, Self.strike + 0.2) * (1 - KObEase.seg(c, Self.fadeFrom, Self.loop))
    return Text(name)
      .kText(.system(13, .semibold))
      .foregroundStyle(KOb.ink)
      .lineLimit(1)
      .overlay(alignment: .leading) {
        // the strike runs the name's own width
        if strike {
          GeometryReader { g in
            Rectangle().fill(KOb.ink)
              .frame(width: g.size.width * CGFloat(KObEase.eo(s)), height: 1.6)
              .offset(y: g.size.height / 2 - 0.8)
          }
        }
      }
      .frame(maxWidth: 118)
      .frame(height: 18)
  }
}
