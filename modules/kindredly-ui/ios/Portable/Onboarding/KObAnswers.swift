// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 SCREENS 2–5 (screens/S02Egg, S03Birthday + s03-wheel, S04Pronoun, S05Face), drawn as React Native
 drew them, with rule B: the picked chip or tile is a flat fill, the cards (the wheel's paper, the
 face grid) are objects with the deep purple depth on the blue, and no ink edge anywhere.
 */

// MARK: - 2 · your egg

struct KObEggScreen: View {
  let ctx: KObCtx

  /// the egg rolled in from the doorstep: it is already here (only the words rise)
  @State private var fromDoor: Bool
  @State private var come: Double
  @State private var into: Double = 0
  @State private var roll: CGFloat = 0
  @State private var hop = 0
  @State private var gone: Double = 0
  @State private var leaving = false
  @State private var wordsIn: Bool

  init(ctx: KObCtx, fromDoor: Bool) {
    self.ctx = ctx
    let settled = fromDoor || ctx.reduceMotion
    _fromDoor = State(initialValue: fromDoor)
    _come = State(initialValue: settled ? 1 : 0)
    _wordsIn = State(initialValue: !fromDoor)
  }

  var body: some View {
    let hero = KOb.heroRect(width: ctx.size.width, height: ctx.size.height, topInset: ctx.top, bottomInset: ctx.bottom)
    let H = hero.rect.width
    let nest = KOb.nestEggRect(width: ctx.size.width, topInset: ctx.top)
    let content = ctx.content
    KObFrame(topInset: ctx.top, bottomInset: ctx.bottom, backLabel: ctx.w("back"), onBack: content.hasBack ? { ctx.send("back") } : nil) {
      VStack(spacing: 0) {
        heroEgg(H: H, dyNest: nest.midY - hero.rect.midY, sNest: nest.width / H)
          .padding(.top, hero.offset)
        VStack(spacing: 0) {
          Text(ctx.w("voice"))
            .kText(.obVoice)
            .foregroundStyle(KOb.white)
            .frame(height: 22)
            .padding(.top, 6)
          VStack(spacing: 0) {
            KObHeadline(text: ctx.w("head")).obFocusOnAppear()
            KObLine(text: ctx.w("line"), small: true)
          }
          .padding(.top, 8)
          .opacity(wordsIn ? 1 : 0)
          .offset(y: wordsIn ? 0 : 12)
          shells
            .padding(.top, 20)
            .opacity(wordsIn ? 1 : 0)
            .offset(y: wordsIn ? 0 : 12)
        }
        .opacity(1 - gone)
        .offset(y: 14 * gone)
      }
    } primary: {
      KObAcidKey(label: ctx.w("key"), action: mine)
    } secondary: {
      EmptyView()
    }
    .onAppear {
      if !(fromDoor || ctx.reduceMotion) {
        withAnimation(.timingCurve(0.34, 1.4, 0.64, 1, duration: 0.46)) { come = 1 }
      }
      if fromDoor {
        withAnimation(.easeOut(duration: 0.36).delay(0.06)) { wordsIn = true }
      }
    }
  }

  private func heroEgg(H: CGFloat, dyNest: CGFloat, sNest: CGFloat) -> some View {
    let radius = H * 0.33
    let k = CGFloat(1 - come + into)
    return ZStack {
      KObWarmth(size: H * 1.5)
        .opacity(1 - gone)
      Ellipse()
        .fill(KOb.ink.opacity(0.22))
        .frame(width: H * 116 / 220, height: H * 14 / 220)
        .offset(y: H * 101 / 220)
        .opacity(1 - gone)
      KObEgg(shell: ctx.content.shell, size: H)
        .rotationEffect(.radians(Double(roll / radius)))
        .keyframeAnimator(initialValue: 0.0, trigger: hop) { egg, v in
          egg.scaleEffect(x: 1 + 0.06 * v, y: 1 - 0.05 * v).offset(y: -14 * v)
        } keyframes: { _ in
          CubicKeyframe(1.0, duration: 0.12)
          CubicKeyframe(0.0, duration: 0.14)
        }
        .scaleEffect(1 + (sNest - 1) * k)
        .offset(x: roll, y: dyNest * k)
        .accessibilityElement()
        .accessibilityLabel(ctx.content.shells.indices.contains(ctx.content.shell) ? ctx.content.shells[ctx.content.shell].a11y : "")
        .accessibilityAddTraits(.isImage)
    }
    .frame(width: H, height: H)
    .contentShape(Rectangle())
    .gesture(
      DragGesture(minimumDistance: 12)
        .onEnded { g in
          guard abs(g.translation.width) > abs(g.translation.height) else { return }
          if g.translation.width < -36 { pick(ctx.content.shell + 1) } else if g.translation.width > 36 { pick(ctx.content.shell - 1) }
        }
    )
  }

  private var shells: some View {
    HStack(spacing: 10) {
      ForEach(0..<4, id: \.self) { i in
        let on = i == ctx.content.shell
        let info = ctx.content.shells.indices.contains(i) ? ctx.content.shells[i] : KObShellInfo(name: "", a11y: "")
        Button { pick(i) } label: {
          VStack(spacing: 0) {
            ZStack {
              RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(on ? KOb.paper : Color.clear)
              if !on {
                RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(KOb.white, lineWidth: 2)
              }
              KObEgg(shell: i, size: 50)
            }
            .frame(height: 70)
            Text(info.name)
              .kText(.mono(9.5, .semibold, tracking: 1.2 / 9.5))
              .foregroundStyle(KOb.white)
              .lineLimit(1)
              .padding(.top, 8)
          }
          .contentShape(Rectangle())
        }
        .buttonStyle(KObPressStyle())
        .frame(maxWidth: .infinity)
        .accessibilityLabel(info.a11y)
        .accessibilityAddTraits(on ? .isSelected : [])
      }
    }
  }

  private func pick(_ i: Int) {
    let shell = ctx.content.shell
    guard i != shell, i >= 0, i < 4, !leaving else { return }
    ctx.haptic("tick")
    if !ctx.reduceMotion {
      var t = Transaction()
      t.disablesAnimations = true
      withTransaction(t) { roll = CGFloat(i - shell) * 52 }
      withAnimation(.timingCurve(0.33, 1, 0.68, 1, duration: 0.65)) { roll = 0 }
    }
    ctx.send("shell", "", Double(i))
  }

  /// "It's mine": the hop, then up into the nest the runner draws on 3
  private func mine() {
    guard !leaving else { return }
    leaving = true
    if ctx.reduceMotion {
      ctx.send("advance")
      return
    }
    ctx.haptic("pip")
    hop += 1
    withAnimation(.timingCurve(0.65, 0, 0.35, 1, duration: 0.52)) { gone = 1 }
    withAnimation(.timingCurve(0.65, 0, 0.35, 1, duration: 0.44).delay(0.08)) { into = 1 } completion: {
      ctx.send("advance")
    }
  }
}

// MARK: - 3 · the birthday

struct KObBirthday: View {
  let ctx: KObCtx

  @State private var y: Int
  @State private var m: Int
  @State private var d: Int
  @State private var badgeFrame: CGRect = .zero
  @State private var flight: Double?
  @State private var leaving = false

  init(ctx: KObCtx) {
    self.ctx = ctx
    let dob = ctx.content.dob
    _y = State(initialValue: dob.set ? dob.y : dob.today.y)
    _m = State(initialValue: dob.set ? dob.m : dob.today.m)
    _d = State(initialValue: dob.set ? dob.d : dob.today.d)
  }

  private var years: [Int] { (0..<100).map { ctx.content.dob.today.y - $0 } }

  var body: some View {
    let dob = ctx.content.dob
    let bodyH = KOb.keyAreaTop(height: ctx.size.height, bottomInset: ctx.bottom) - (ctx.top + KOb.topBarH + KOb.nestSlotH)
    let rows = bodyH >= 400 ? 5 : 3
    ZStack(alignment: .topLeading) {
      KObFrame(topInset: ctx.top, bottomInset: ctx.bottom, backLabel: ctx.w("back"), onBack: ctx.content.hasBack ? { ctx.send("back") } : nil, nest: true) {
        KObHeadline(text: ctx.w("head")).obFocusOnAppear().padding(.top, 8)
        ZStack {
          Text(dob.sign != nil ? ctx.w("after") : ctx.w("before"))
            .kText(.obLineSmall)
            .foregroundStyle(KOb.white)
            .multilineTextAlignment(.center)
            .id(dob.sign.map { "\($0)" } ?? "")
            .transition(.opacity)
        }
        .frame(minHeight: 44)
        .padding(.top, 8)
        .animation(.easeOut(duration: 0.22), value: dob.sign)

        wheelCard(rows: rows)
          .padding(.top, 18)

        Text(ctx.w("age"))
          .kText(.system(13.5, .regular, lineHeight: 17 / 13.5))
          .foregroundStyle(KOb.white)
          .frame(height: 30)
          .padding(.top, 10)
      } primary: {
        KObAcidKey(label: ctx.w("key"), disabled: !ctx.content.canAdvance, action: next)
      } secondary: {
        EmptyView()
      }

      if let flight, let sign = dob.sign {
        KObGlyphFlight(glyph: sign, from: CGPoint(x: badgeFrame.midX, y: badgeFrame.midY), to: kObNestTarget(width: ctx.size.width, top: ctx.top), size: 24, p: flight)
      }
    }
    .onChange(of: dob) { _, now in
      // the wheel follows what TS made of it (31 April is 30 April)
      if now.set {
        y = now.y
        m = now.m
        d = now.d
      }
    }
  }

  private func wheelCard(rows: Int) -> some View {
    let dob = ctx.content.dob
    let shape = RoundedRectangle(cornerRadius: 18, style: .continuous)
    let months = dob.months.count == 12 ? dob.months : (1...12).map { "\($0)" }
    let yi = max(0, years.firstIndex(of: y) ?? 0)
    return ZStack(alignment: .topTrailing) {
      ZStack(alignment: .top) {
        RoundedRectangle(cornerRadius: 10, style: .continuous)
          .fill(Color(hex: "#EFEEF8"))
          .frame(height: KObWheel.row)
          .padding(.horizontal, 10)
          .offset(y: CGFloat(rows - 1) / 2 * KObWheel.row)
        HStack(spacing: 0) {
          KObWheel(ctx: ctx, items: months, value: m, rows: rows, label: ctx.w("month")) { turn(m: $0) }
          KObWheel(ctx: ctx, items: (1...31).map { "\($0)" }, value: d - 1, rows: rows, label: ctx.w("day")) { turn(d: $0 + 1) }
          KObWheel(ctx: ctx, items: years.map { "\($0)" }, value: yi, rows: rows, label: ctx.w("year"), descending: true) { turn(y: years[$0]) }
        }
        .padding(.horizontal, 6)
      }
      .background(shape.fill(KOb.paper))
      .clipShape(shape)
      .obDepth(shape, onBlue: true)
      .accessibilityElement(children: .contain)
      .accessibilityLabel(ctx.w("wheelA11y"))

      if let sign = dob.sign {
        KLineIcon(sign, size: 24, lineWidth: 2, color: KOb.ink)
          .frame(width: 46, height: 46)
          .background(Circle().fill(KOb.paper))
          .obDepth(Circle(), onBlue: true, offset: 3)
          .onGeometryChange(for: CGRect.self) { $0.frame(in: .named(KObSpace.root)) } action: { badgeFrame = $0 }
          .offset(x: 14, y: -20)
          .id(sign)
          .transition(.scale(scale: 0.01).animation(.timingCurve(0.34, 2.0, 0.64, 1, duration: 0.3)))
          .accessibilityHidden(true)
      }
    }
  }

  private func turn(y ny: Int? = nil, m nm: Int? = nil, d nd: Int? = nil) {
    if let ny { y = ny }
    if let nm { m = nm }
    if let nd { d = nd }
    ctx.send("dob", "\(y)-\(m)-\(d)")
  }

  private func next() {
    guard ctx.content.canAdvance, !leaving else { return }
    guard ctx.w("gate") == "adult", !ctx.reduceMotion, ctx.content.dob.sign != nil, badgeFrame != .zero else {
      ctx.send("advance")
      return
    }
    leaving = true
    flight = 0
    withAnimation(.timingCurve(0.65, 0, 0.35, 1, duration: 0.38)) { flight = 1 } completion: {
      ctx.send("advance")
    }
  }
}

/// One column of the birthday wheel (s03-wheel PaperWheel), on the run's paper: the row under the
/// band in bold ink while it spins, a tick per row passing, the value reported when it settles,
/// and a value changed from outside (a clamped day) followed. VoiceOver: one adjustable element.
struct KObWheel: View {
  static let row: CGFloat = 44

  let ctx: KObCtx
  let items: [String]
  let value: Int
  let rows: Int
  let label: String
  var descending = false
  let onChange: (Int) -> Void

  @State private var position = ScrollPosition()
  @State private var live: Int
  @State private var placed = false

  init(ctx: KObCtx, items: [String], value: Int, rows: Int, label: String, descending: Bool = false, onChange: @escaping (Int) -> Void) {
    self.ctx = ctx
    self.items = items
    self.value = value
    self.rows = rows
    self.label = label
    self.descending = descending
    self.onChange = onChange
    _live = State(initialValue: value)
  }

  private var pad: CGFloat { CGFloat(rows - 1) / 2 * Self.row }

  var body: some View {
    let fade = Self.row * (rows > 3 ? 1.6 : 0.8)
    ScrollView(.vertical) {
      LazyVStack(spacing: 0) {
        ForEach(items.indices, id: \.self) { i in
          Text(items[i])
            .font(.system(size: i == live ? 19 : 16, weight: i == live ? .bold : .medium))
            .tracking(-0.2)
            .foregroundStyle(i == live ? KOb.ink : Color(hex: "#A9A6BF"))
            .frame(maxWidth: .infinity)
            .frame(height: Self.row)
        }
      }
      .scrollTargetLayout()
    }
    .contentMargins(.vertical, pad, for: .scrollContent)
    .scrollTargetBehavior(.viewAligned)
    .scrollPosition($position)
    .scrollIndicators(.hidden)
    .frame(height: Self.row * CGFloat(rows))
    .overlay(alignment: .top) {
      LinearGradient(colors: [KOb.paper, KOb.paper.opacity(0)], startPoint: .top, endPoint: .bottom)
        .frame(height: fade)
        .allowsHitTesting(false)
    }
    .overlay(alignment: .bottom) {
      LinearGradient(colors: [KOb.paper.opacity(0), KOb.paper], startPoint: .top, endPoint: .bottom)
        .frame(height: fade)
        .allowsHitTesting(false)
    }
    .onScrollGeometryChange(for: Int.self) { g in
      // the row under the band: the band is the column's middle
      Int(floor(g.visibleRect.midY / Self.row))
    } action: { _, i in
      let c = max(0, min(items.count - 1, i))
      if c != live {
        live = c
        if placed { ctx.haptic("tick") }
      }
    }
    .onScrollPhaseChange { _, phase in
      if phase == .idle, placed, live != value { onChange(live) }
    }
    .onAppear {
      position.scrollTo(id: value, anchor: .center)
      Task {
        try? await Task.sleep(nanoseconds: 50_000_000)
        placed = true
      }
    }
    .onChange(of: value) { _, v in
      guard v != live else { return }
      live = v
      withAnimation { position.scrollTo(id: v, anchor: .center) }
    }
    .frame(maxWidth: .infinity)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(label)
    .accessibilityValue(items.indices.contains(value) ? items[value] : "")
    .accessibilityAdjustableAction { dir in
      let up = dir == .increment
      let next = up != descending ? value + 1 : value - 1
      if next >= 0 && next < items.count { onChange(next) }
    }
  }
}

// MARK: - 3x · not yet

struct KObUnderage: View {
  let ctx: KObCtx
  @State private var shown = false

  var body: some View {
    KObFrame(topInset: ctx.top, bottomInset: ctx.bottom, nest: true) {
      VStack(spacing: 0) {
        KObHeadline(text: ctx.w("underage.head")).obFocusOnAppear()
        KObLine(text: ctx.w("underage.line"))
        if !ctx.w("underage.change").isEmpty {
          Button { ctx.send("changeAge") } label: {
            Text(ctx.w("underage.change"))
              .kText(.system(15, .semibold))
              .underline()
              .foregroundStyle(KOb.white)
              .padding(.vertical, 8)
          }
          .buttonStyle(KObPressStyle(pressedOpacity: 0.6))
          .padding(.top, 28)
        }
      }
      .padding(.top, 18)
      .opacity(shown ? 1 : 0)
    } primary: {
      EmptyView()
    } secondary: {
      EmptyView()
    }
    .onAppear {
      ctx.haptic("refuse")
      withAnimation(.easeOut(duration: 0.32)) { shown = true }
    }
  }
}

// MARK: - 4 · she, he, or they

struct KObPronoun: View {
  let ctx: KObCtx

  @State private var leaving = false
  @State private var glyphFrames: [String: CGRect] = [:]
  @State private var flying: (glyph: KLineGlyph, from: CGRect)?
  @State private var flight: Double = 0
  @State private var shown = false

  private static let chips: [(id: String, glyph: KLineGlyph?)] = [("she", .she), ("he", .he), ("they", nil)]

  var body: some View {
    ZStack(alignment: .topLeading) {
      KObFrame(topInset: ctx.top, bottomInset: ctx.bottom, backLabel: ctx.w("back"), onBack: ctx.content.hasBack ? { ctx.send("back") } : nil, nest: true, scroll: true) {
        KObHeadline(text: ctx.w("head")).obFocusOnAppear().padding(.top, 8)
        KObLine(text: ctx.w("line"), small: true)
        VStack(spacing: 14) {
          ForEach(Array(Self.chips.enumerated()), id: \.offset) { i, c in
            chip(c.id, glyph: c.glyph)
              .opacity(shown ? 1 : 0)
              .offset(y: shown ? 0 : 14)
              .animation(.easeOut(duration: 0.32).delay(0.06 + Double(i) * 0.05), value: shown)
          }
        }
        .padding(.top, 24)
      } primary: {
        Text(ctx.w("hint"))
          .kText(.obLabel)
          .foregroundStyle(KOb.white)
          .multilineTextAlignment(.center)
          .accessibilityHidden(true)
      } secondary: {
        KObTextKey(label: ctx.w("skip"), underline: true) {
          if !leaving { ctx.send("skip") }
        }
      }

      if let flying {
        KObGlyphFlight(glyph: flying.glyph, from: CGPoint(x: flying.from.midX, y: flying.from.midY), to: kObNestTarget(width: ctx.size.width, top: ctx.top), size: 22, p: flight)
      }
    }
    .onAppear { shown = true }
  }

  private func chip(_ id: String, glyph: KLineGlyph?) -> some View {
    let on = ctx.content.pronoun == id
    let ink = on ? KOb.ink : KOb.white
    return Button { pick(id, glyph: glyph) } label: {
      HStack(spacing: 0) {
        Text(ctx.w("chip.\(id)"))
          .kText(.system(17, .semibold))
          .foregroundStyle(ink)
          .frame(maxWidth: .infinity, alignment: .leading)
        if let glyph {
          KLineIcon(glyph, size: 22, lineWidth: 2, color: ink)
            .onGeometryChange(for: CGRect.self) { $0.frame(in: .named(KObSpace.root)) } action: { glyphFrames[id] = $0 }
        }
      }
      .padding(.horizontal, 18)
      .frame(height: 56)
      .background {
        if on {
          RoundedRectangle(cornerRadius: 14, style: .continuous).fill(KOb.acid)
        } else {
          RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(KOb.white, lineWidth: 2)
        }
      }
      .contentShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
    .buttonStyle(KObPressStyle())
    .accessibilityLabel(ctx.w("chip.\(id)"))
    .accessibilityAddTraits(on ? .isSelected : [])
  }

  private func pick(_ id: String, glyph: KLineGlyph?) {
    guard !leaving else { return }
    leaving = true
    ctx.haptic("tick")
    ctx.send("pronoun", id)
    if let glyph, !ctx.reduceMotion, let from = glyphFrames[id] {
      flying = (glyph, from)
      flight = 0
      withAnimation(.timingCurve(0.65, 0, 0.35, 1, duration: 0.38)) { flight = 1 } completion: {
        ctx.send("advance")
      }
    } else {
      Task {
        try? await Task.sleep(nanoseconds: 300_000_000)
        ctx.send("advance")
      }
    }
  }
}

// MARK: - 5 · a face

struct KObFaceScreen: View {
  let ctx: KObCtx
  static let pen = Color(hex: "#3A3AF5")

  @State private var rolled = false
  @State private var cardIn = false

  var body: some View {
    let faces = ctx.content.faces
    KObFrame(topInset: ctx.top, bottomInset: ctx.bottom, backLabel: ctx.w("back"), onBack: ctx.content.hasBack ? { ctx.send("back") } : nil, nest: true) {
      KObHeadline(text: ctx.w("head")).obFocusOnAppear().padding(.top, 8)
      KObLine(text: ctx.w("line"), small: true)
      card(faces)
        .padding(.top, 18)
        .padding(.bottom, 6)
        .opacity(cardIn ? 1 : 0)
        .offset(y: cardIn ? 0 : 16)
    } primary: {
      KObAcidKey(label: ctx.w("key"), disabled: !ctx.content.canAdvance) { ctx.send("advance") }
    } secondary: {
      KObTextKey(label: ctx.w("later"), underline: true) { ctx.send("skip") }
    }
    .onAppear {
      withAnimation(.easeOut(duration: 0.34).delay(0.08)) { cardIn = true }
    }
  }

  private func card(_ faces: KObFaces) -> some View {
    let shape = RoundedRectangle(cornerRadius: 18, style: .continuous)
    return GeometryReader { geo in
      let pad: CGFloat = 10
      let cell = max(1, (geo.size.width - 2 * pad) / 4)
      let face = max(40, min(60, cell - 18))
      ScrollViewReader { reader in
        ScrollView {
          LazyVGrid(columns: Array(repeating: GridItem(.fixed(cell), spacing: 0), count: 4), spacing: 0) {
            if let make = faces.make {
              makeCell(make, cell: cell, selected: !make.id.isEmpty && faces.selected == make.id)
                .id("make")
            }
            ForEach(faces.items) { f in
              faceCell(f, cell: cell, face: face, on: faces.selected == f.id)
                .id(f.id)
            }
          }
          .padding(pad)
          .padding(.top, 14)
        }
        .scrollIndicators(.hidden)
        .onChange(of: faces.selected) { _, id in
          guard rolled else { return }
          rolled = false
          withAnimation { reader.scrollTo(id, anchor: UnitPoint(x: 0.5, y: 0.3)) }
        }
      }
    }
    .background(shape.fill(KOb.paper))
    .clipShape(shape)
    .obDepth(shape, onBlue: true)
    .overlay(alignment: .topTrailing) { dice.offset(x: -14, y: -16) }
    .frame(maxHeight: .infinity)
  }

  private func faceCell(_ f: KObFaceItem, cell: CGFloat, face: CGFloat, on: Bool) -> some View {
    Button {
      guard !on else { return }
      ctx.haptic("tick")
      ctx.send("face", f.id)
    } label: {
      ZStack {
        if on {
          Circle().strokeBorder(KOb.ink, lineWidth: 2).frame(width: face + 12, height: face + 12)
          Circle().strokeBorder(KOb.acid, lineWidth: 4).frame(width: face + 8, height: face + 8)
        }
        KImage(f.image, size: CGSize(width: face, height: face), contentMode: .fill, placeholder: KOb.lavenderSoft)
          .clipShape(Circle())
      }
      .scaleEffect(on ? 1.04 : 1)
      .frame(width: cell, height: cell)
      .contentShape(Rectangle())
    }
    .buttonStyle(KObPressStyle())
    .accessibilityLabel(f.a11y)
    .accessibilityAddTraits(on ? .isSelected : [])
  }

  /// "＋ Make yours" (the custom face, behind the makeface switch): a 62 circle on lav2 with a
  /// dashed pen-blue edge and a ＋, or the face made once it exists; its mono line under it.
  private func makeCell(_ make: KObMakeFace, cell: CGFloat, selected: Bool) -> some View {
    let label: String
    switch make.state {
    case .free: label = ctx.w("make.free")
    case .used: label = ctx.w("make.used")
    case .yours: label = ctx.w("make.yours")
    }
    return Button {
      ctx.haptic("tick")
      if make.state == .yours && !make.id.isEmpty {
        if !selected { ctx.send("face", make.id) }
      } else {
        ctx.send("makeFace")
      }
    } label: {
      VStack(spacing: 4) {
        ZStack {
          if selected {
            Circle().strokeBorder(KOb.ink, lineWidth: 2).frame(width: 74, height: 74)
            Circle().strokeBorder(KOb.acid, lineWidth: 4).frame(width: 70, height: 70)
          }
          if make.state == .yours, let image = make.image {
            KImage(image, size: CGSize(width: 62, height: 62), contentMode: .fill, placeholder: Color(hex: "#EEEDFB"))
              .clipShape(Circle())
          } else {
            Circle().fill(Color(hex: "#EEEDFB"))
            Circle().strokeBorder(Self.pen, style: StrokeStyle(lineWidth: 2, dash: [5, 4]))
            KLineIcon(.plus, size: 24, lineWidth: 2.2, color: Self.pen)
          }
        }
        .frame(width: 62, height: 62)
        Text(label)
          .kText(.mono(7.5, .semibold, tracking: 0.1))
          .foregroundStyle(Self.pen)
          .multilineTextAlignment(.center)
          .lineLimit(2)
          .minimumScaleFactor(0.8)
          .dynamicTypeSize(...DynamicTypeSize.large)
      }
      .frame(width: cell, height: max(cell, 84))
      .contentShape(Rectangle())
    }
    .buttonStyle(KObPressStyle())
    .accessibilityLabel(make.state == .yours ? ctx.w("make.yoursA11y") : ctx.w("make.a11y"))
    .accessibilityValue(label)
    .accessibilityAddTraits(selected ? .isSelected : [])
  }

  /// the dice chip on the card's top-right edge (flat: a white chip with a quiet line)
  private var dice: some View {
    Button {
      rolled = true
      ctx.haptic("tick")
      ctx.send("dice")
    } label: {
      HStack(spacing: 6) {
        KObDice(size: 16)
        Text(ctx.w("random"))
          .kText(.system(13, .bold))
          .foregroundStyle(KOb.ink)
      }
      .padding(.horizontal, 12)
      .frame(height: 32)
      .background(Capsule().fill(KOb.paper))
      .overlay(Capsule().strokeBorder(Color(hex: "#D9D7E6"), lineWidth: 1))
      .contentShape(Capsule())
    }
    .buttonStyle(KObPressStyle())
    .accessibilityLabel(ctx.w("random"))
  }
}
