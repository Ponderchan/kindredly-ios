// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 SCREENS 9–13, AFTER THE SHELL (screens/S09Hatch, S10Name, S11Address, S12Flight, S13Knock).

 The bird is React Native's: HatchStage on 9 (the egg reads you, knocks, cracks; a tap helps), the
 named chick on 10, 11 and 13 (it chirps, tilts and hops as TS nudges it), and FirstFlight on 12
 and behind 13. Swift draws everything around them: the Shell flood from the crack, the read-out
 chips and the words on 9, the name's field, chips and pronouns on 10, the address keys on 11, the
 speech card on 13, and every key.

 Rule B: the speech card, the "already an account" card and the envelopes the bird brings back are
 objects (no ink edge, the light depth on Shell); chips and fields are flat.
 */

// MARK: - 9 · the hatch

struct KObHatchScreen<Stage: View>: View {
  let ctx: KObCtx
  let stage: Stage

  @State private var start = Date()
  @State private var flooded: Bool
  @State private var floodP: Double = 0
  @State private var floodOn = false
  @State private var keyIn = false

  init(ctx: KObCtx, stage: Stage) {
    self.ctx = ctx
    self.stage = stage
    _flooded = State(initialValue: ctx.content.ground == .shell)
  }

  private var hatch: KObHatch { ctx.content.hatch }

  var body: some View {
    ZStack(alignment: .topLeading) {
      // the Shell flood, under the stage so the shards fly over it
      if floodOn, let from = hatch.flood, ctx.content.ground != .shell {
        KObFlood(from: from, size: ctx.size, reduce: ctx.reduceMotion, p: floodP)
      }
      VStack(spacing: 0) {
        stage
          .frame(maxWidth: .infinity, maxHeight: .infinity)
          .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { ctx.send("stage", "", Double($0)) }
        footer
        KObKeyArea(bottomInset: ctx.bottom) {
          KObAcidKey(label: ctx.w("key"), disabled: !ctx.content.canAdvance || !hatch.hatched) { ctx.send("advance") }
        } secondary: {
          EmptyView()
        }
        .opacity(keyIn ? 1 : 0)
      }
    }
    .frame(width: ctx.size.width, height: ctx.size.height, alignment: .topLeading)
    .onAppear { withAnimation(.easeOut(duration: 0.2)) { keyIn = true } }
    .onChange(of: hatch.flood, initial: true) { _, at in
      guard at != nil, !floodOn, ctx.content.ground != .shell else { return }
      floodOn = true
      floodP = 0
      let anim: Animation = ctx.reduceMotion ? .easeOut(duration: 0.22) : .timingCurve(0.33, 1, 0.68, 1, duration: 0.42)
      withAnimation(anim) { floodP = 1 } completion: {
        flooded = true
        ctx.send("flooded")
      }
    }
  }

  private var footer: some View {
    let on = flooded || ctx.content.ground == .shell
    let ink = on ? KOb.ink : KOb.white
    let soft = on ? KOb.inkSoft : KOb.white
    let green = Color(hex: "#2E7D46")
    return VStack(spacing: 0) {
      TimelineView(.periodic(from: start, by: 0.09)) { tl in
        let prog = min(1, tl.date.timeIntervalSince(start) / max(0.1, hatch.readS))
        HStack(spacing: 8) {
          ForEach(0..<3, id: \.self) { i in
            let done = hatch.hatched || prog >= Double(i + 1) / 3 * 0.92
            let c = on ? green : KOb.white
            Text("\(ctx.w("chip\(i)")) \(done ? "✓" : "·")")
              .kText(.mono(10, .semibold, tracking: 0.12))
              .foregroundStyle(c)
              .padding(.horizontal, 11)
              .frame(height: 28)
              .overlay(Capsule().strokeBorder(c, lineWidth: 2))
              .opacity(done ? 1 : 0.45)
          }
        }
      }
      if !hatch.hatched {
        VStack(spacing: 0) {
          Text(ctx.w("eyebrow"))
            .kText(.obLabel)
            .foregroundStyle(soft)
          Text(ctx.w("title"))
            .kText(.obHeadline)
            .foregroundStyle(ink)
            .multilineTextAlignment(.center)
            .padding(.top, 6)
            .accessibilityAddTraits(.isHeader)
            .obFocusOnAppear()
          Text(ctx.w("tap"))
            .kText(.obVoice)
            .foregroundStyle(soft)
            .padding(.top, 6)
        }
        .padding(.top, 16)
      } else {
        KObRiseIn {
          VStack(spacing: 0) {
            Text(ctx.w("born"))
              .kText(.obHeadline)
              .foregroundStyle(KOb.ink)
              .multilineTextAlignment(.center)
              .lineLimit(2)
              .minimumScaleFactor(0.8)
              .accessibilityAddTraits(.isHeader)
              .obFocusOnAppear(delay: 0.48)
            Text(ctx.w("bornLine"))
              .kText(.obLineSmall)
              .foregroundStyle(KOb.inkSoft)
              .multilineTextAlignment(.center)
              .padding(.top, 8)
          }
        }
        .padding(.top, 16)
      }
    }
    .frame(maxWidth: .infinity)
    .frame(minHeight: 150, alignment: .top)
    .padding(.horizontal, KOb.gutter)
  }
}

/// THE SHELL FLOOD (parts/flood): a disc of Shell grows from the crack until it covers the screen
/// (420 ms, ease-out); Reduce Motion: a 220 ms cross-fade.
struct KObFlood: View, Animatable {
  let from: CGPoint
  let size: CGSize
  let reduce: Bool
  var p: Double

  var animatableData: Double {
    get { p }
    set { p = newValue }
  }

  var body: some View {
    if reduce {
      KOb.shell.opacity(p).frame(width: size.width, height: size.height).allowsHitTesting(false)
    } else {
      let r = max(
        hypot(from.x, from.y),
        hypot(size.width - from.x, from.y),
        hypot(from.x, size.height - from.y),
        hypot(size.width - from.x, size.height - from.y)
      )
      Circle()
        .fill(KOb.shell)
        .frame(width: 2 * r, height: 2 * r)
        .scaleEffect(max(0.0001, p))
        .position(x: from.x, y: from.y)
        .opacity(p > 0 ? 1 : 0)
        .allowsHitTesting(false)
    }
  }
}

/// Rises 12 and fades in on appear (Reanimated FadeInDown, 420 ms).
struct KObRiseIn<Content: View>: View {
  var duration = 0.42
  var delay = 0.0
  @ViewBuilder let content: Content
  @State private var shown = false

  var body: some View {
    content
      .opacity(shown ? 1 : 0)
      .offset(y: shown ? 0 : -12)
      .onAppear { withAnimation(.easeOut(duration: duration).delay(delay)) { shown = true } }
  }
}

// MARK: - 10 · name it

struct KObNameScreen: View {
  let ctx: KObCtx

  private var name: KObName { ctx.content.name }

  var body: some View {
    KObFrame(topInset: ctx.top, bottomInset: ctx.bottom, keyboardUp: ctx.keyboardUp) {
      ScrollView {
        VStack(spacing: 0) {
          // the island is resized by TS as the keyboard comes and goes; the slot follows it unanimated
          KObChickSlot(size: name.chick)
          KObHeadline(text: ctx.w("head"), color: KOb.ink).obFocusOnAppear().padding(.top, 10)
          Text(ctx.w("line"))
            .kText(.obLineSmall)
            .foregroundStyle(KOb.inkSoft)
            .multilineTextAlignment(.center)
            .padding(.top, 6)
          field.padding(.top, 18)
          KObFlow(spacing: 5) {
            ForEach(name.ideas, id: \.self) { idea in
              KObChip(label: idea.uppercased(), on: name.typed == idea, small: true) {
                ctx.send("idea", idea)
              }
            }
          }
          .padding(.top, 14)
          Text(ctx.w("goesBy"))
            .kText(.obLabel)
            .foregroundStyle(KOb.inkSoft)
            .multilineTextAlignment(.center)
            .padding(.top, 22)
          HStack(spacing: 10) {
            ForEach(["she", "he", "they"], id: \.self) { p in
              KObChip(label: ctx.w("p.\(p)"), on: name.pronoun == p) { ctx.send("wrenPronoun", p) }
            }
          }
          .padding(.top, 10)
          if name.reserved {
            Text(ctx.w("reserved"))
              .kText(.obSmall)
              .foregroundStyle(KOb.inkSoft)
              .multilineTextAlignment(.center)
              .padding(.top, 14)
          }
        }
        .padding(.bottom, 16)
      }
      .scrollIndicators(.hidden)
      .scrollDismissesKeyboard(.interactively)
    } primary: {
      KObAcidKey(label: ctx.w("key"), disabled: !ctx.content.canAdvance) { ctx.send("advance") }
    } secondary: {
      EmptyView()
    }
    .padding(.bottom, ctx.keyboard)
  }

  private var field: some View {
    HStack(spacing: 0) {
      KField(
        controller: ctx.driver.name,
        placeholder: ctx.w("ph"),
        style: .system(23, .medium),
        axis: .horizontal,
        lines: nil,
        returnSends: false,
        autocorrect: false,
        maxLength: Int(ctx.w("max")) ?? 20,
        tint: KOb.blue,
        textColor: KOb.ink,
        placeholderColor: Color(.sRGB, red: 74 / 255, green: 70 / 255, blue: 100 / 255, opacity: 0.55),
        accessibilityLabel: ctx.w("head"),
        onChange: { text in ctx.send("name", text) },
        onSubmit: { _ in ctx.send("advance") }
      )
      .textInputAutocapitalization(.words)
      .submitLabel(.done)
      Button { ctx.send("nameDice") } label: {
        KObDice(size: 18, five: true)
          .frame(width: 38, height: 38)
          .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(KOb.lavenderSoft))
          .contentShape(Rectangle())
      }
      .buttonStyle(KObPressStyle())
      .accessibilityLabel(ctx.w("dice"))
    }
    .padding(.leading, 16)
    .padding(.trailing, 10)
    .frame(height: 60)
    .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(KOb.paper))
    .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(KOb.hairline, lineWidth: 1))
  }
}

/// A chip on Shell, flat (rule B): white with a quiet line; picked, acid.
struct KObChip: View {
  let label: String
  let on: Bool
  var small = false
  let action: () -> Void

  var body: some View {
    let h: CGFloat = small ? 34 : 44
    Button(action: action) {
      Text(label)
        .kText(small ? .system(12, .bold, tracking: 0.3 / 12) : .system(17, .bold))
        .foregroundStyle(KOb.ink)
        .padding(.horizontal, small ? 9 : 18)
        .frame(minWidth: small ? 0 : 92)
        .frame(height: h)
        .background(Capsule().fill(on ? KOb.acid : KOb.paper))
        .overlay {
          if !on { Capsule().strokeBorder(KOb.hairline, lineWidth: 1) }
        }
        .contentShape(Capsule())
    }
    .buttonStyle(KObPressStyle())
    .accessibilityAddTraits(on ? .isSelected : [])
  }
}

/// Children in centred rows that wrap (the ideas on 10).
struct KObFlow: Layout {
  var spacing: CGFloat = 5

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let width = proposal.width ?? .infinity
    let rows = arrange(width: width, subviews: subviews)
    let h = rows.reduce(0) { $0 + $1.height } + spacing * CGFloat(max(0, rows.count - 1))
    let w = rows.map(\.width).max() ?? 0
    return CGSize(width: proposal.width ?? w, height: h)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    var y = bounds.minY
    for row in arrange(width: bounds.width, subviews: subviews) {
      var x = bounds.minX + (bounds.width - row.width) / 2
      for i in row.items {
        let s = subviews[i].sizeThatFits(.unspecified)
        subviews[i].place(at: CGPoint(x: x, y: y + (row.height - s.height) / 2), proposal: ProposedViewSize(s))
        x += s.width + spacing
      }
      y += row.height + spacing
    }
  }

  private struct Row {
    var items: [Int] = []
    var width: CGFloat = 0
    var height: CGFloat = 0
  }

  private func arrange(width: CGFloat, subviews: Subviews) -> [Row] {
    var rows: [Row] = []
    var row = Row()
    for i in subviews.indices {
      let s = subviews[i].sizeThatFits(.unspecified)
      let next = row.items.isEmpty ? s.width : row.width + spacing + s.width
      if !row.items.isEmpty && next > width {
        rows.append(row)
        row = Row()
      }
      row.width = row.items.isEmpty ? s.width : row.width + spacing + s.width
      row.height = max(row.height, s.height)
      row.items.append(i)
    }
    if !row.items.isEmpty { rows.append(row) }
    return rows
  }
}

// MARK: - 11 · where should replies find you?

struct KObAddressScreen: View {
  let ctx: KObCtx

  private var auth: KObAuth { ctx.content.auth }

  var body: some View {
    ScrollViewReader { reader in
      ScrollView {
        VStack(spacing: 0) {
          KObChickSlot(size: 96)
          KObHeadline(text: ctx.w("head"), color: KOb.ink)
            .frame(maxWidth: 280)
            .obFocusOnAppear()
            .padding(.top, 12)
          Text(ctx.w("line"))
            .kText(.obLineSmall)
            .foregroundStyle(KOb.inkSoft)
            .multilineTextAlignment(.center)
            .padding(.top, 8)
          terms.padding(.top, 16)

          VStack(spacing: 0) {
            if auth.exists {
              existsCard.transition(.opacity)
            } else {
              if auth.apple {
                KObAuthKey(icon: .apple, iconSize: 19, label: ctx.w("apple"), solid: true, first: true, busy: auth.busy == "apple", disabled: !auth.busy.isEmpty) {
                  ctx.send("link", "apple")
                }
              }
              KObAuthKey(icon: .google, iconSize: 18, label: ctx.w("google"), first: !auth.apple, busy: auth.busy == "google", disabled: !auth.busy.isEmpty) {
                ctx.send("link", "google")
              }
              KObEmailFold(ctx: ctx, fold: auth.fold, caption: KOb.ink, disabled: !auth.busy.isEmpty)
                .id("fold")
            }
            if auth.failed {
              Text(ctx.w("failed"))
                .kText(.system(12.5, .semibold, lineHeight: 17 / 12.5))
                .foregroundStyle(KOb.stop)
                .multilineTextAlignment(.center)
                .padding(.top, 10)
            }
          }
          .animation(.easeOut(duration: 0.2), value: auth.exists)
          .padding(.top, 16)

          if !auth.exists {
            KObTextKey(label: ctx.w("guest"), color: KOb.ink, underline: true, disabled: !auth.busy.isEmpty) { ctx.send("skip") }
              .padding(.top, 14)
            Text(ctx.w("guestLine"))
              .kText(.obSmall)
              .foregroundStyle(KOb.inkSoft)
              .multilineTextAlignment(.center)
              .frame(maxWidth: 300)
              .padding(.top, 2)
          }
        }
        .padding(.top, ctx.top + KOb.topBarH - 8)
        .padding(.bottom, max(ctx.bottom, 16) + 12)
        .padding(.horizontal, KOb.gutter)
      }
      .scrollIndicators(.hidden)
      .onChange(of: auth.fold.stage) { _, stage in
        guard stage != .key else { return }
        Task {
          try? await Task.sleep(nanoseconds: 320_000_000)
          withAnimation { reader.scrollTo("fold", anchor: .bottom) }
        }
      }
    }
    .padding(.bottom, ctx.keyboard)
  }

  /// the UGC terms line, Terms and Privacy Policy as live links where each language puts them
  private var terms: some View {
    var text = AttributedString()
    var rest = Substring(ctx.w("terms"))
    while let r = rest.range(of: "{terms}") ?? rest.range(of: "{privacy}") {
      let isTerms = rest[r] == "{terms}"
      text += AttributedString(String(rest[rest.startIndex..<r.lowerBound]))
      var link = AttributedString(ctx.w(isTerms ? "termsLink" : "privacyLink"))
      link.link = URL(string: "oblink://\(isTerms ? 0 : 1)")
      link.underlineStyle = .single
      link.foregroundColor = KOb.ink
      link.inlinePresentationIntent = .stronglyEmphasized
      text += link
      rest = rest[r.upperBound...]
    }
    text += AttributedString(String(rest))
    return Text(text)
      .kText(.obSmall)
      .foregroundStyle(KOb.inkSoft)
      .tint(KOb.ink)
      .multilineTextAlignment(.center)
      .environment(\.openURL, OpenURLAction { url in
        ctx.send("terms", "", Double(KObLinked.index(url) ?? 0))
        return .handled
      })
  }

  private var existsCard: some View {
    let shape = RoundedRectangle(cornerRadius: 18, style: .continuous)
    return VStack(alignment: .leading, spacing: 0) {
      Text(ctx.w("exists"))
        .kText(.system(21, .heavy, tracking: -0.5 / 21, lineHeight: 26 / 21))
        .foregroundStyle(KOb.ink)
        .accessibilityAddTraits(.isHeader)
      Text(ctx.w("existsLine"))
        .kText(.obLineSmall)
        .foregroundStyle(KOb.inkSoft)
        .padding(.top, 6)
      if auth.switchCode {
        VStack(spacing: 0) {
          KObCodeField(ctx: ctx, controller: ctx.driver.switchCode, label: ctx.w("codeCap"), bad: auth.switchBad, event: "switchCode")
          Text(auth.switchBusy ? "…" : auth.switchBad ? ctx.w("codeBad") : ctx.w("codeCap"))
            .kText(.obSmall)
            .foregroundStyle(auth.switchBad ? KOb.stop : KOb.inkSoft)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
            .padding(.top, 8)
        }
        .padding(.top, 14)
      } else {
        KObAcidKey(label: ctx.w("switch"), busy: auth.busy == "switch") { ctx.send("switch") }
          .padding(.top, 16)
      }
      KObTextKey(label: ctx.w("other"), color: KOb.ink, underline: true) { ctx.send("otherWay") }
        .frame(maxWidth: .infinity)
        .padding(.top, 4)
    }
    .padding(18)
    .background(shape.fill(KOb.paper))
    .obDepth(shape, onBlue: false)
  }
}

// MARK: - 13 · the knock

struct KObKnockScreen: View {
  let ctx: KObCtx

  @State private var left = false
  @State private var rowIn = false
  @State private var cardIn = false

  var body: some View {
    ZStack {
      Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 0.10)
        .allowsHitTesting(false)
      ScrollView {
        VStack(spacing: 0) {
          HStack(alignment: .bottom, spacing: 0) {
            KObChickSlot(size: 96)
            HStack(alignment: .bottom, spacing: 0) {
              KObPlainEnvelope(width: 58, tilt: -8)
              KObPlainEnvelope(width: 58, tilt: 4).padding(.leading, -6).offset(y: 4)
              KObPlainEnvelope(width: 58, tilt: -3).padding(.leading, -6).offset(y: -6)
            }
            .padding(.leading, -18)
            .padding(.bottom, 8)
            Spacer(minLength: 0)
          }
          .padding(.leading, 4)
          .opacity(rowIn ? 1 : 0)

          card
            .padding(.top, 22)
            .opacity(cardIn ? 1 : 0)
            .offset(y: cardIn ? 0 : -14)
        }
        .padding(.top, ctx.top + 40)
        .padding(.bottom, max(ctx.bottom, 16) + 8)
        .padding(.horizontal, KOb.gutter)
        .frame(minHeight: ctx.size.height, alignment: .center)
      }
      .scrollIndicators(.hidden)
      .scrollBounceBehavior(.basedOnSize)
    }
    .onAppear {
      withAnimation(.easeOut(duration: 0.26)) { rowIn = true }
      withAnimation(.timingCurve(0.33, 1, 0.68, 1, duration: 0.36).delay(0.12)) { cardIn = true }
    }
  }

  private var card: some View {
    let shape = RoundedRectangle(cornerRadius: 22, style: .continuous)
    return VStack(alignment: .leading, spacing: 0) {
      Text(ctx.w("head"))
        .kText(.system(25, .heavy, tracking: -0.6 / 25, lineHeight: 30 / 25))
        .foregroundStyle(KOb.ink)
        .accessibilityAddTraits(.isHeader)
        .obFocusOnAppear(delay: 0.5)
      Text(ctx.content.refused ? ctx.w("settings") : ctx.w("line"))
        .kText(.obLineSmall)
        .foregroundStyle(KOb.inkSoft)
        .padding(.top, 8)
      KObAcidKey(label: ctx.w("yes")) { once("advance") }
        .padding(.top, 22)
      KObTextKey(label: ctx.w("no"), color: KOb.ink, underline: true) { once("skip") }
        .frame(maxWidth: .infinity)
        .padding(.top, 6)
      Text(ctx.w("sign"))
        .kText(.content(16, italic: true))
        .foregroundStyle(KOb.inkSoft)
        .frame(maxWidth: .infinity, alignment: .trailing)
        .padding(.top, 2)
    }
    .padding(.horizontal, 22)
    .padding(.top, 22)
    .padding(.bottom, 14)
    .background(shape.fill(KOb.paper))
    .overlay(alignment: .topLeading) {
      // the tail, pointing up at the chick
      Rectangle()
        .fill(KOb.paper)
        .frame(width: 22, height: 22)
        .rotationEffect(.degrees(45))
        .offset(x: 52, y: -11)
        .accessibilityHidden(true)
    }
    .obDepth(shape, onBlue: false)
  }

  private func once(_ type: String) {
    guard !left else { return }
    left = true
    ctx.send(type)
  }
}
