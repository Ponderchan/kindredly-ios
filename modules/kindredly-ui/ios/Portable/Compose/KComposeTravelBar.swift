// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE LETTER COMPOSER'S BOTTOM BAR, "LET IT TRAVEL" L6 (owner, 2026-10-26; the prototype
 Let It Travel L6, Prompts 1-3). It replaces the round keys and the wide key of KComposeToolbar on
 the compose page; KComposeToolbar stays in the kit, unchanged, for anything else that draws it.

 44 tall, 26 in from the page's sides, riding the keyboard or the strip 12 above it and the home
 indicator 30 above it (KComposePage). From the left, 18 apart (12 once a stamp is chosen), none
 of the three icons ever squeezed:
 - the + (22, a 1.9 line on the 24 grid): the question and the voice letter. It turns 45° into an
   × in ind while its tray is open; an ind dot edged in the page colour at its top right when
   something rides with the letter;
 - the paper (26, TODAY-PAPERS: the rounded square crossed by five diagonals, 1.8 and 1.4; open, a
   lav face of 30 with corners of 7, the square filled sf and drawn in ind with 2.0 diagonals).
   Off at .4 while speaking (a voice letter carries no paper);
 - the stamp slot. None chosen: the dashed stamp icon (26: a 15 square with corners of 2 dashed
   2.2 / 2.2 at 1.8, two eyes, a smile) in a 30 hit square; once the words are enough and none is
   chosen, the square turns lav with corners of 8, the icon ind, and it hops 3 up and back every
   1.2s until the strip opens (still under Reduce Motion). Chosen: the #topic capsule instead (36
   tall, fully round, a 1.8 edge in the stamp's line ink, the stamp's own colour as its fill,
   SF Mono 12 at .02em in its ink, one line): a tap opens the strip again. The stamp itself sits
   in the header's stamp corner (KComposePage);
 - the CTA, right-aligned in what is left: a mono "n/20" (11 at .12em, mute) 10 to its left
   while the letter is under the floor (gone, not hidden, at 20), and one capsule (36 tall, fully
   round, 1.8 edge, padding 14, SF Mono 12 at .06em, never cut: it keeps its own width), the
   paper plane (16, a 2.2 line) 8 after its words. Three states:
   ① writing: a line-coloured edge on the page colour, lav rising inside it from the left to
     n/20 (.25s, cubic-bezier(.3,1,.3,1)), "Let it travel" in faint at 0 and ink after; not
     pressable;
   ② enough words, no stamp: the edge and the words ind, the lav fading out; "Pick a stamp"; a
     press opens the strip (TS keyPress), and Wren says "Now pick a stamp for it.";
   ③ enough words and a stamp: solid ink, the words in the page colour; "Let it travel"; a
     press sends.
   Sending reads as ① without the lav (SENDING…). A paper that can't go keeps its words in the
   capsule (the gold SEND ON FIRST CLASS PAPER → opening the paywall, OPENS WITH YOUR FIRST
   KINDRED dimmed), no plane, its narrow words where the long ones don't fit.

 THE LONG-TOPIC RULE (Prompt 3): the #topic and the CTA share the row, never wrap, and neither is
 cut. With a stamp the CTA keeps "Let it travel" beside the plane only while the topic is at most
 14 characters AND both fit at their own widths (ViewThatFits measures the real text; TS
 compose-model travelShowsLabel is React Native's arithmetic for the same rule); otherwise the
 CTA is the plane alone, a 36 circle with the plane at 18. Only if even that can't fit (the
 largest type on the smallest phone) does the topic give way, with an ellipsis. With a stamp the
 CTA still sits at the right end, where it stood before the stamp was chosen.
 Words too long for the capsule beside the slot (a long language at a large size) lose the count
 first, then the plane, then shrink to .7; they are never cut.

 Controls are flat (owner, 2026-10-26): no hard shadows; the 1.8 ink edges are the design's.
 Only the tail (the slot, the topic and the CTA) watches the driver: a keystroke redraws it and
 nothing else here. Every key takes the keyboard away before it acts.
 */
struct KComposeTravelBar: View {
  static let height: CGFloat = 44
  static let side: CGFloat = 26
  /// between the bar's pieces, and once a stamp is chosen
  static let gap: CGFloat = 18
  static let gapStamped: CGFloat = 12

  let theme: KTheme
  let content: KComposeContent
  let driver: KComposeDriver
  let actions: KComposeActions

  var body: some View {
    // each key carries half the gap on either side, so its target reaches its neighbour's
    let half = (content.stamp == nil ? Self.gap : Self.gapStamped) / 2
    HStack(spacing: 0) {
      KTravelIconKey(
        theme: theme,
        accessibilityLabel: content.tray == .more ? content.strings.closeLabel : content.strings.plusLabel,
        selected: false,
        dot: content.plusDot,
        width: 22,
        half: half
      ) {
        driver.blurAll()
        actions.onTray(.more)
      } glyph: {
        KTravelPlusGlyph(open: content.tray == .more, color: content.tray == .more ? theme.ind : theme.ink)
      }

      KTravelIconKey(
        theme: theme,
        accessibilityLabel: content.tray == .paper ? content.strings.closeLabel : content.strings.paperKey,
        selected: content.tray == .paper,
        dot: false,
        width: 26,
        half: half
      ) {
        driver.blurAll()
        actions.onTray(.paper)
      } glyph: {
        KTravelPaperGlyph(theme: theme, open: content.tray == .paper)
      }
      // a voice letter carries no paper
      .disabled(content.mode == .speak)
      .opacity(content.mode == .speak ? 0.4 : 1)

      KTravelTail(theme: theme, content: content, driver: driver, actions: actions, half: half)
    }
    .frame(height: Self.height)
    .padding(.leading, Self.side - half)
    .padding(.trailing, Self.side)
    .animation(.easeOut(duration: 0.25), value: content.stamp?.id)
    .disabled(content.busy)
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
  }
}

/// The keys' press: a small scale while held (the haptic is the key's own, on the tap).
private struct KTravelPressStyle: ButtonStyle {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .scaleEffect(configuration.isPressed ? 0.92 : 1)
      .animation(reduceMotion ? nil : .easeOut(duration: 0.12), value: configuration.isPressed)
  }
}

/// One piece of a glyph: path data on the 24 grid, scaled into its frame.
private struct KTravelPiece: Shape {
  let d: String

  func path(in rect: CGRect) -> Path {
    let s = min(rect.width, rect.height) / 24
    let place = CGAffineTransform(a: s, b: 0, c: 0, d: s, tx: rect.midX - 12 * s, ty: rect.midY - 12 * s)
    return KSVGPath.path(d).applying(place)
  }
}

/// An icon key: its glyph alone (`width` across) with half the gap either side, 44 tall; a press
/// scales it to .92 and taps a light haptic.
private struct KTravelIconKey<Glyph: View>: View {
  let theme: KTheme
  let accessibilityLabel: String
  let selected: Bool
  let dot: Bool
  let width: CGFloat
  let half: CGFloat
  let action: () -> Void
  let glyph: Glyph
  @State private var taps = 0

  init(theme: KTheme, accessibilityLabel: String, selected: Bool, dot: Bool, width: CGFloat, half: CGFloat, action: @escaping () -> Void, @ViewBuilder glyph: () -> Glyph) {
    self.theme = theme
    self.accessibilityLabel = accessibilityLabel
    self.selected = selected
    self.dot = dot
    self.width = width
    self.half = half
    self.action = action
    self.glyph = glyph()
  }

  var body: some View {
    SwiftUI.Button {
      taps += 1
      action()
    } label: {
      glyph
        .frame(width: width, height: width)
        .overlay(alignment: .topTrailing) {
          if dot {
            // 9 across, ind edged 1.5 in the page colour, at the glyph's top right
            Circle()
              .fill(theme.ind)
              .overlay(Circle().strokeBorder(theme.bg, lineWidth: 1.5))
              .frame(width: 9, height: 9)
              .offset(x: 4, y: -4)
          }
        }
        .padding(.horizontal, half)
        .frame(height: KComposeTravelBar.height)
        .contentShape(Rectangle())
    }
    .buttonStyle(KTravelPressStyle())
    .sensoryFeedback(.impact(weight: .light), trigger: taps)
    .accessibilityLabel(accessibilityLabel)
    .accessibilityAddTraits(selected ? .isSelected : [])
  }
}

/// The + (22: M12 5v14M5 12h14 at 1.9 on the 24 grid), turning 45° into an × while its tray is open.
private struct KTravelPlusGlyph: View {
  let open: Bool
  let color: Color
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    KTravelPiece(d: "M12 5v14M5 12h14")
      .stroke(color, style: StrokeStyle(lineWidth: 1.9 * 22 / 24, lineCap: .round))
      .rotationEffect(.degrees(open ? 45 : 0))
      .animation(reduceMotion ? nil : .easeOut(duration: 0.26), value: open)
      .accessibilityHidden(true)
  }
}

/// The paper (TODAY-PAPERS, at 26): the rounded square (1.8) crossed by five diagonals (1.4). Open:
/// a lav face of 30 with corners of 7, the square filled sf, square and diagonals ind (2.0), over .2s.
private struct KTravelPaperGlyph: View {
  let theme: KTheme
  let open: Bool
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  private static let square = "M7.5 4.5h9a3 3 0 0 1 3 3v9a3 3 0 0 1 -3 3h-9a3 3 0 0 1 -3 -3v-9a3 3 0 0 1 3 -3z"
  private static let diagonals = "M9 5l-4 4M14 5L5 14M19 5.5L5.5 19M19 10.5l-8.5 8.5M19 15.5L15.5 19"

  var body: some View {
    let u: CGFloat = 26 / 24
    let stroke = open ? theme.ind : theme.ink
    ZStack {
      RoundedRectangle(cornerRadius: 7, style: .circular)
        .fill(open ? theme.lav : Color.clear)
        .frame(width: 30, height: 30)
      KTravelPiece(d: Self.square)
        .fill(open ? theme.sf : Color.clear)
      KTravelPiece(d: Self.diagonals)
        .stroke(stroke, style: StrokeStyle(lineWidth: (open ? 2.0 : 1.4) * u, lineCap: .round))
      KTravelPiece(d: Self.square)
        .stroke(stroke, style: StrokeStyle(lineWidth: 1.8 * u, lineCap: .round))
    }
    .animation(reduceMotion ? nil : .easeOut(duration: 0.2), value: open)
    .accessibilityHidden(true)
  }
}

/// The empty stamp slot's icon (the prototype's, on the 24 grid): a 15 square at 4.5 with corners
/// of 2, dashed 2.2 / 2.2 at 1.8; two eyes (r .9) in ink; a smile at 1.8. `stroke` is the square's
/// and the smile's colour (ink, ind while it asks for a stamp).
struct KTravelStampIcon: View {
  let stroke: Color
  let eyes: Color

  var body: some View {
    GeometryReader { geo in
      let u = min(geo.size.width, geo.size.height) / 24
      ZStack {
        RoundedRectangle(cornerRadius: 2 * u, style: .circular)
          .stroke(stroke, style: StrokeStyle(lineWidth: 1.8 * u, lineCap: .round, lineJoin: .round, dash: [2.2 * u, 2.2 * u]))
          .frame(width: 15 * u, height: 15 * u)
        KTravelPiece(d: "M8.6 10.5a.9 .9 0 1 0 1.8 0a.9 .9 0 1 0 -1.8 0M13.6 10.5a.9 .9 0 1 0 1.8 0a.9 .9 0 1 0 -1.8 0")
          .fill(eyes)
        KTravelPiece(d: "M9 14c1.5 1.6 4.5 1.6 6 0")
          .stroke(stroke, style: StrokeStyle(lineWidth: 1.8 * u, lineCap: .round, lineJoin: .round))
      }
      .frame(width: geo.size.width, height: geo.size.height)
    }
    .accessibilityHidden(true)
  }
}

/// The paper plane (M21 3L3.5 10.2l7 2.6L13 20l8-17z M10.5 12.8 21 3, a 2.2 line on the 24 grid).
struct KTravelPlaneGlyph: View {
  let color: Color
  let size: CGFloat

  var body: some View {
    KTravelPiece(d: "M21 3L3.5 10.2l7 2.6L13 20l8-17z M10.5 12.8 21 3")
      .stroke(color, style: StrokeStyle(lineWidth: 2.2 * size / 24, lineCap: .round, lineJoin: .round))
      .frame(width: size, height: size)
      .accessibilityHidden(true)
  }
}

/// What the CTA capsule shows: its words and the plane, its words alone, its compact form (the
/// plane alone, or a paper's narrow words), or its words shrinking to .7 (the last resort).
private enum KTravelForm {
  case labelPlane
  case label
  case compact
  case shrink
}

/// The slot (or the #topic) and the CTA, watching the live state.
private struct KTravelTail: View {
  let theme: KTheme
  let content: KComposeContent
  @ObservedObject var driver: KComposeDriver
  let actions: KComposeActions
  let half: CGFloat

  var body: some View {
    let key = driver.live.key
    if let stamp = content.stamp {
      // THE LONG-TOPIC RULE: the first that fits at its own width
      ViewThatFits(in: .horizontal) {
        if stamp.name.count <= KTravelRule.topicMaxChars {
          stamped(stamp, key, form: .labelPlane, count: true)
        }
        stamped(stamp, key, form: .compact, count: true)
        stamped(stamp, key, form: .compact, count: false)
        stamped(stamp, key, form: .compact, count: false, squeeze: true)
      }
    } else {
      HStack(spacing: 0) {
        slot(key)
        ViewThatFits(in: .horizontal) {
          cta(key, form: .labelPlane, count: true)
          cta(key, form: .label, count: true)
          cta(key, form: .labelPlane, count: false)
          cta(key, form: .label, count: false)
          cta(key, form: .shrink, count: false)
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
      }
    }
  }

  /// the count, then the capsule, at the right end
  private func cta(_ key: KComposeKey, form: KTravelForm, count: Bool) -> some View {
    HStack(spacing: KTravelRule.countGap) {
      Spacer(minLength: half)
      if count && !key.count.isEmpty {
        Text(key.count)
          .kText(.mono(11, .medium, tracking: 0.12))
          .foregroundStyle(theme.mute)
          .lineLimit(1)
          .fixedSize()
          .accessibilityHidden(true)
      }
      KTravelCapsule(theme: theme, key: key, form: form, action: send)
    }
  }

  /// the #topic capsule, then the count and the CTA at the right end
  private func stamped(_ stamp: KComposeStamp, _ key: KComposeKey, form: KTravelForm, count: Bool, squeeze: Bool = false) -> some View {
    HStack(spacing: 0) {
      KTravelTopic(stamp: stamp, half: half, squeeze: squeeze) {
        driver.blurAll()
        actions.onTray(.stamps)
      }
      .layoutPriority(squeeze ? 0 : 1)
      HStack(spacing: KTravelRule.countGap) {
        // squeezed, nothing flexible beside the topic: the CTA keeps its width, the topic the rest
        if !squeeze {
          Spacer(minLength: half)
        }
        if count && !key.count.isEmpty {
          Text(key.count)
            .kText(.mono(11, .medium, tracking: 0.12))
            .foregroundStyle(theme.mute)
            .lineLimit(1)
            .fixedSize()
            .accessibilityHidden(true)
        }
        KTravelCapsule(theme: theme, key: key, form: form, action: send)
      }
      .padding(.leading, squeeze ? half : 0)
      .layoutPriority(squeeze ? 1 : 0)
    }
  }

  /// the empty slot: the dashed stamp icon in its 30 square, hopping on lav while it asks
  private func slot(_ key: KComposeKey) -> some View {
    KTravelSlotKey(
      theme: theme,
      asks: key.stage == .needStamp,
      hops: key.nudge,
      open: content.tray == .stamps,
      half: half,
      accessibilityLabel: content.strings.stampLabel
    ) {
      driver.blurAll()
      actions.onTray(.stamps)
    }
  }

  /// the CTA's press: the keyboard goes; the gold key on a First Class paper opens the paywall (it
  /// never sends); everything else is TS's keyPress (send, or open the stamps), with the words as typed
  private func send() {
    driver.blurAll()
    if driver.live.key.stage == .paperFirstClass {
      actions.onPaperUpgrade()
    } else {
      actions.onKey(driver.body.text, driver.ask.text)
    }
  }
}

/// The bar's numbers that TS compose-model TRAVEL_BAR keeps too.
enum KTravelRule {
  /// a topic longer than this always takes the plane alone (owner, Prompt 3)
  static let topicMaxChars = 14
  /// the n/20 count's distance from the capsule
  static let countGap: CGFloat = 10
  static let capsule: CGFloat = 36
  static let edge: CGFloat = 1.8
}

/// The empty stamp slot's key.
private struct KTravelSlotKey: View {
  let theme: KTheme
  /// the words are enough and no stamp is chosen: lav square, ind icon
  let asks: Bool
  /// …and the strip is shut: it hops
  let hops: Bool
  let open: Bool
  let half: CGFloat
  let accessibilityLabel: String
  let action: () -> Void
  @State private var taps = 0
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    SwiftUI.Button {
      taps += 1
      action()
    } label: {
      face
        .padding(.horizontal, half)
        .frame(height: KComposeTravelBar.height)
        .contentShape(Rectangle())
    }
    .buttonStyle(KTravelPressStyle())
    .sensoryFeedback(.impact(weight: .light), trigger: taps)
    .accessibilityLabel(accessibilityLabel)
    .accessibilityAddTraits(open ? .isSelected : [])
  }

  @ViewBuilder private var face: some View {
    let square = KTravelStampIcon(stroke: asks ? theme.ind : theme.ink, eyes: theme.ink)
      .frame(width: 26, height: 26)
      .frame(width: 30, height: 30)
      .background {
        RoundedRectangle(cornerRadius: 8, style: .circular)
          .fill(asks ? theme.lav : Color.clear)
      }
      .animation(.easeOut(duration: 0.3), value: asks)
    if hops && !reduceMotion {
      // 3 up and back over 1.2s, ease in and out, again and again
      square
        .keyframeAnimator(initialValue: 0.0, repeating: true) { view, y in
          view.offset(y: y)
        } keyframes: { _ in
          CubicKeyframe(-3, duration: 0.6)
          CubicKeyframe(0, duration: 0.6)
        }
    } else {
      square
    }
  }
}

/// The chosen stamp's #topic: 36 tall, fully round, the stamp's colour, a 1.8 edge in its line ink,
/// SF Mono 12 at .02em in its ink, one line. `squeeze`: the last resort, cut with an ellipsis.
private struct KTravelTopic: View {
  let stamp: KComposeStamp
  let half: CGFloat
  let squeeze: Bool
  let action: () -> Void

  var body: some View {
    SwiftUI.Button(action: action) {
      Text(stamp.name)
        .kText(.mono(12, .medium, tracking: 0.02))
        .foregroundStyle(stamp.ink)
        .lineLimit(1)
        .truncationMode(.tail)
        .fixedSize(horizontal: !squeeze, vertical: false)
        .padding(.horizontal, 14)
        .frame(height: KTravelRule.capsule)
        .background(Capsule().fill(stamp.wash))
        .overlay(Capsule().strokeBorder(stamp.line, lineWidth: KTravelRule.edge))
        .padding(.horizontal, half)
        .frame(height: KComposeTravelBar.height)
        .contentShape(Rectangle())
    }
    .buttonStyle(KTravelPressStyle())
    .accessibilityLabel(stamp.accessibilityLabel)
    .transition(.scale(scale: 0.8).combined(with: .opacity))
  }
}

/// The CTA capsule (Prompt 2): one capsule, three states (see the top of the file).
private struct KTravelCapsule: View {
  let theme: KTheme
  let key: KComposeKey
  let form: KTravelForm
  let action: () -> Void
  /// what VoiceOver hears beyond the label (KComposeKeySpeech, KComposeToolbar.swift)
  @Environment(\.kComposeKeySpeech) private var speech

  /// the stages that travel: the plane rides with them
  private var travels: Bool {
    switch key.stage {
    case .filling, .needStamp, .ready, .sending: return true
    case .paperFirstClass, .paperLocked: return false
    }
  }

  var body: some View {
    SwiftUI.Button(action: action) {
      face
        .background { fill }
        .overlay { Capsule().strokeBorder(edge, lineWidth: KTravelRule.edge) }
        .animation(.easeOut(duration: 0.3), value: key.stage)
        .contentShape(Capsule())
        // the 44 row's target around the 36 capsule
        .frame(height: KComposeTravelBar.height)
        .contentShape(Rectangle())
    }
    .buttonStyle(KTravelPressStyle())
    .disabled(!key.enabled)
    .accessibilityLabel(key.label)
    .modifier(KTravelSpeech(speech: speech))
  }

  @ViewBuilder private var face: some View {
    let ink = self.ink
    if form == .compact && travels {
      // the plane alone: a 36 circle, the plane at 18
      KTravelPlaneGlyph(color: ink, size: 18)
        .frame(width: KTravelRule.capsule, height: KTravelRule.capsule)
    } else {
      let words = form == .compact && !key.narrowLabel.isEmpty ? key.narrowLabel : key.label
      HStack(spacing: 8) {
        if form == .shrink {
          Text(words)
            .kText(.mono(12, .medium, tracking: 0.06))
            .foregroundStyle(ink)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
        } else {
          Text(words)
            .kText(.mono(12, .medium, tracking: 0.06))
            .foregroundStyle(ink)
            .lineLimit(1)
            .fixedSize()
        }
        if form == .labelPlane && travels {
          KTravelPlaneGlyph(color: ink, size: 16)
        }
      }
      .padding(.horizontal, 14)
      .frame(height: KTravelRule.capsule)
    }
  }

  /// the ground, and the lav rising from the left toward the floor (fading out at 20)
  private var fill: some View {
    ZStack(alignment: .leading) {
      Capsule().fill(ground)
      GeometryReader { geo in
        theme.lav
          .frame(width: geo.size.width * washWidth)
          .animation(.timingCurve(0.3, 1, 0.3, 1, duration: 0.25), value: washWidth)
      }
      .opacity(key.progress >= 0 ? 1 : 0)
      .animation(.easeOut(duration: 0.3), value: key.progress >= 0)
    }
    .clipShape(Capsule())
    .accessibilityHidden(true)
  }

  /// how far the lav reaches: the words toward the floor; past it, all the way (as it fades)
  private var washWidth: CGFloat {
    if key.progress >= 0 { return CGFloat(min(max(key.progress, 0), 1)) }
    return key.stage == .needStamp || key.stage == .ready ? 1 : 0
  }

  private var ground: Color {
    switch key.stage {
    case .ready: return theme.ink
    case .paperFirstClass: return KBrand.waxGold
    case .filling, .needStamp, .sending, .paperLocked: return theme.bg
    }
  }

  private var edge: Color {
    switch key.stage {
    case .ready, .paperFirstClass: return theme.ink
    case .needStamp: return theme.ind
    case .filling, .sending, .paperLocked: return theme.line
    }
  }

  private var ink: Color {
    switch key.stage {
    case .ready: return theme.bg
    case .needStamp: return theme.ind
    case .paperFirstClass: return KBrand.inkOnBrand
    case .sending, .paperLocked: return theme.mute
    case .filling: return key.progress > 0 ? theme.ink : theme.faint
    }
  }
}

/// VoiceOver's value and hint on the CTA (KComposeKeySpeech), watching it; nothing without one.
private struct KTravelSpeech: ViewModifier {
  let speech: KComposeKeySpeech?

  @ViewBuilder func body(content: Content) -> some View {
    if let speech {
      content.modifier(KTravelSpeechWatch(speech: speech))
    } else {
      content
    }
  }
}

private struct KTravelSpeechWatch: ViewModifier {
  @ObservedObject var speech: KComposeKeySpeech

  func body(content: Content) -> some View {
    content
      .accessibilityValue(speech.value)
      .accessibilityHint(speech.hint)
  }
}
