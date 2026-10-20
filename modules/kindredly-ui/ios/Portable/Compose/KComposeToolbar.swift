// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE COMPOSE TOOLBAR, riding the keyboard's top, 10 apart. It looks as the App Store page's did
 (owner, 2026-10-18; compose.tsx and ComposeTray.tsx): the round keys, a keyboard's shape (owner,
 2026-09-20), then the wide key. In order: + · paper · stamp · wide key (letter papers, 2026-10-20).

 THE TWO KEYS WEAR NO RINGS (owner 2026-10-19, contract D11; the compose page only): each is its
 glyph alone in a 44 target, and a press is a small scale (.92) with a light haptic.
 - the +: the question and the voice letter live behind it. Its plus (27 across, 1.8 on the 24
   grid) turns 45° into an × in ind while its tray is open, and an ind dot edged in the page
   colour sits at the glyph's top right when something rides with the letter (a question, the
   voice);
 - the paper (Prompt 3, I9): a 30 face with corners of 7 holding the 22 glyph on the 24 grid, a
   rounded square (1.8) crossed by five diagonals (1.4). Closed: in ink, no fill. While the paper
   strip is open: the face lav, the square filled sf, the square and its diagonals ind, the
   diagonals 2.0, over .2s. While speaking it is off at .4 (a voice letter carries no paper);
 - the stamp: while none is chosen, the stamp glyph, a face in a perforated square
   (ComposeTray's StampKeyGlyph at 27); while the stamp tray is open the face comes apart and a
   pencil lies across the square (owner 2026-09-20: the eyes fly up and out, the smile drops, the
   pencil arrives, .36s). Once a stamp is chosen, THE CHOSEN STAMP ITSELF (owner: "the stamp key
   shows the chosen stamp"): KStamp at 30 wide, flat (your own stamp: no tilt), an official one
   or a photo stamp ("c:<uuid>", drawn by KStamp from the custom registry; the category's frame
   while it resolves). It replaces the 10-19 #name pill (contract §9 Q1);
 - the wide key, taking the rest of the row: square corners, a 1pt edge, padding 17 and 10, its
   label in Plex Mono 600 13 at 1.4, centred. Filling: no fill and a line-coloured edge, a lav2
   wash rising from its left to how far the words are toward the floor, the label in mute and,
   8 beside it, the count ("7/20", key.count) in Plex Mono 10.5 at .6 in mute. PICK A MOOD STAMP:
   solid ind with the label in the page colour, and a chevron 10 in from its left edge that
   leans toward the stamp key, again and again (-4 over .52s, back over .52s, a .26s rest),
   standing still under Reduce Motion. Ready: solid ink, the label in the page colour.
   SENDING…: as filling, without the wash. SEND where LET IT TRAVEL would be squeezed: under a
   170 key, as the App Store page measured it (beside a long pill), and wherever the label
   doesn't fit at its size (the toolbar tries the long word first). When neither fits on one
   line (PICK A MOOD STAMP and SENDING… have no short word: SCEGLI UN FRANCOBOLLO DELL'UMORE at
   the default size on an SE, CHOISIS UN TIMBRE D'HUMEUR at XL, the English at xxxLarge), the
   last choice takes the width it is offered: two centred lines, shrinking to .75 before it
   would cut a word, so the + and the stamp key never leave the gutter.
   On a paper that can't go yet (compose-model keyFor): SEND ON FIRST CLASS PAPER → solid wax gold
   with a 1pt ink edge and the label in inkOnBrand, a press opening the paywall (onPaperUpgrade)
   instead of sending; OPENS WITH YOUR FIRST KINDRED as filling without the wash, not pressable.

 Each key takes the keyboard away before it acts (a tray takes the keyboard's place; the key
 sends, or opens the stamps). Only the key watches the driver: a keystroke redraws it and
 nothing else here.
 */
struct KComposeToolbar: View {
  let theme: KTheme
  let content: KComposeContent
  let driver: KComposeDriver
  let actions: KComposeActions

  var body: some View {
    HStack(spacing: 10) {
      // (owner, 2026-10-20) the three keys a little closer: 40-wide targets with no gap between,
      // so the glyphs sit ~21 apart instead of ~35
      HStack(spacing: 0) {
      KComposeIconKey(
        theme: theme,
        accessibilityLabel: content.tray == .more ? content.strings.closeLabel : content.strings.plusLabel,
        selected: false,
        dot: content.plusDot
      ) {
        driver.blurAll()
        actions.onTray(.more)
      } glyph: {
        KComposePlusGlyph(open: content.tray == .more, color: content.tray == .more ? theme.ind : theme.ink)
      }

      KComposeIconKey(
        theme: theme,
        accessibilityLabel: content.tray == .paper ? content.strings.closeLabel : content.strings.paperKey,
        selected: content.tray == .paper,
        dot: false
      ) {
        driver.blurAll()
        actions.onTray(.paper)
      } glyph: {
        KComposePaperGlyph(theme: theme, open: content.tray == .paper)
      }
      // a voice letter carries no paper
      .disabled(content.mode == .speak)
      .opacity(content.mode == .speak ? 0.4 : 1)

      if let stamp = content.stamp {
        // (owner, 2026-10-20: "the live one") once chosen, the stamp's #name as the live app's pill:
        // its wash, its rule, its ink — the stamp itself sits in the header's slot
        KComposeStampPill(stamp: stamp) {
          driver.blurAll()
          actions.onTray(.stamps)
        }
        .transition(.scale(scale: 0.8).combined(with: .opacity))
      } else {
        KComposeIconKey(
          theme: theme,
          accessibilityLabel: content.strings.stampLabel,
          selected: content.tray == .stamps,
          dot: false
        ) {
          driver.blurAll()
          actions.onTray(.stamps)
        } glyph: {
          KStampKeyGlyph(open: content.tray == .stamps, ink: theme.ink, pencil: KBrand.waxGold)
            .frame(width: KComposeKeySize.glyph, height: KComposeKeySize.glyph)
        }
      }

      }

      KComposeTravelKey(theme: theme, driver: driver) {
        driver.blurAll()
        // the gold key on a First Class paper opens the paywall; it never sends
        if driver.live.key.stage == .paperFirstClass {
          actions.onPaperUpgrade()
        } else {
          actions.onKey(driver.body.text, driver.ask.text)
        }
      }
    }
    .disabled(content.busy)
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
  }
}

/// The keys' press (D11): a small scale while held. The haptic is the key's own (on the tap).
private struct KComposeKeyPressStyle: ButtonStyle {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .scaleEffect(configuration.isPressed ? 0.92 : 1)
      .animation(reduceMotion ? nil : .easeOut(duration: 0.12), value: configuration.isPressed)
  }
}

/// The keys' measures (ComposeTray PlusGlyph and StampKeyGlyph; D11's 44 target).
private enum KComposeKeySize {
  /// the touch target (no ring any more: the glyph alone in it)
  static let target: CGFloat = 44
  /// a key's width in the row (its target stays 44 tall)
  static let width: CGFloat = 40
  /// the glyph's box
  static let glyph: CGFloat = 27
  /// the chosen stamp in the stamp key: 30 wide, the tray tile's size (36 tall, inside the 44)
  static let stamp: CGFloat = 30
}

/// A key in the bar (D11): its glyph alone in a 44 target, no ring, no fill; a press scales it
/// to .92 and taps a light haptic.
private struct KComposeIconKey<Glyph: View>: View {

  let theme: KTheme
  let accessibilityLabel: String
  let selected: Bool
  let dot: Bool
  let action: () -> Void
  let glyph: Glyph
  /// one more per tap: the light haptic's trigger
  @State private var taps = 0

  init(theme: KTheme, accessibilityLabel: String, selected: Bool, dot: Bool, action: @escaping () -> Void, @ViewBuilder glyph: () -> Glyph) {
    self.theme = theme
    self.accessibilityLabel = accessibilityLabel
    self.selected = selected
    self.dot = dot
    self.action = action
    self.glyph = glyph()
  }

  var body: some View {
    SwiftUI.Button {
      taps += 1
      action()
    } label: {
      glyph
        .frame(width: KComposeKeySize.width, height: KComposeKeySize.target)
        .overlay(alignment: .topTrailing) {
          if dot {
            // ComposeTray KeyDot: 9 across, ind edged 1.5 in the page colour, at the glyph's
            // top right (the 27 glyph sits 8.5 in from the target's edges)
            Circle()
              .fill(theme.ind)
              .overlay(Circle().strokeBorder(theme.bg, lineWidth: 1.5))
              .frame(width: 9, height: 9)
              .padding(5)
          }
        }
        .contentShape(Rectangle())
    }
    .buttonStyle(KComposeKeyPressStyle())
    .sensoryFeedback(.impact(weight: .light), trigger: taps)
    .accessibilityLabel(accessibilityLabel)
    .accessibilityAddTraits(selected ? .isSelected : [])
  }
}

/// The paper key's face (Prompt 3, I9): 34 × 34 with corners of 7, the glyph on the 24 grid at 30.4 so its square matches the stamp key.
private struct KComposePaperGlyph: View {
  let theme: KTheme
  let open: Bool
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    // (owner, 2026-10-20) the square drawn as wide as the stamp key's frame (17 of 24 at 27 ≈ 19):
    // its 15 units at 30.4 ≈ 19
    let g: CGFloat = 30.4
    let u = g / 24
    let stroke = open ? theme.ind : theme.ink
    ZStack {
      RoundedRectangle(cornerRadius: 7, style: .circular)
        .fill(open ? theme.lav : Color.clear)
        .frame(width: 34, height: 34)
      ZStack {
        KStampKeyPiece(d: "M7.5 4.5h9a3 3 0 0 1 3 3v9a3 3 0 0 1 -3 3h-9a3 3 0 0 1 -3 -3v-9a3 3 0 0 1 3 -3z")
          .fill(open ? theme.sf : Color.clear)
        KStampKeyPiece(d: "M9 5l-4 4M14 5L5 14M19 5.5L5.5 19M19 10.5l-8.5 8.5M19 15.5L15.5 19")
          .stroke(stroke, style: StrokeStyle(lineWidth: (open ? 2.0 : 1.4) * u, lineCap: .round))
        KStampKeyPiece(d: "M7.5 4.5h9a3 3 0 0 1 3 3v9a3 3 0 0 1 -3 3h-9a3 3 0 0 1 -3 -3v-9a3 3 0 0 1 3 -3z")
          .stroke(stroke, style: StrokeStyle(lineWidth: 1.8 * u, lineCap: .round))
      }
      .frame(width: g, height: g)
    }
    .animation(reduceMotion ? nil : .easeOut(duration: 0.2), value: open)
    .accessibilityHidden(true)
  }
}

/// The plus that turns 45° into an × while its tray is open (ComposeTray PlusGlyph at 27).
private struct KComposePlusGlyph: View {
  let open: Bool
  let color: Color
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    let s = KComposeKeySize.glyph
    // as wide as the stamp key's frame (17 of 24), owner 2026-10-20
    KStampKeyPiece(d: "M12 3.5v17M3.5 12h17")
      .stroke(color, style: StrokeStyle(lineWidth: 1.8 * s / 24, lineCap: .round))
      .frame(width: s, height: s)
      .rotationEffect(.degrees(open ? 45 : 0))
      .animation(reduceMotion ? nil : .easeOut(duration: 0.26), value: open)
      .accessibilityHidden(true)
  }
}

/*
 WHAT VOICEOVER HEARS ON THE WIDE KEY beyond its label (a11y pass cm-8): the wash and "7/20" are
 hidden from it, so a dimmed LET IT TRAVEL said nothing about why. TS compose-model keyFor writes
 both: `value` while the letter is under the floor ("13 more to go") or past the ceiling, `hint`
 on PICK A MOOD STAMP (what it opens, and that a letter needs one). They travel beside
 KComposeLive rather than in KComposeKey: the adapter (KComposeView) keeps one of these for the
 life of the page, sets it from the same composer command, and hands it down the environment;
 without one (the gallery, a preview) the key says only its label, as before.
 */
public final class KComposeKeySpeech: ObservableObject {
  /// VoiceOver's value on the key, "" for none
  @Published public var value: String = ""
  /// VoiceOver's hint on the key, "" for none
  @Published public var hint: String = ""

  public init() {}

  /// Both at once, published only when they change (a keystroke that moves neither redraws nothing).
  public func set(value: String, hint: String) {
    if self.value != value { self.value = value }
    if self.hint != hint { self.hint = hint }
  }
}

private struct KComposeKeySpeechKey: EnvironmentKey {
  static let defaultValue: KComposeKeySpeech? = nil
}

public extension EnvironmentValues {
  /// The wide key's VoiceOver value and hint (KComposeKeySpeech); nil says only the label.
  var kComposeKeySpeech: KComposeKeySpeech? {
    get { self[KComposeKeySpeechKey.self] }
    set { self[KComposeKeySpeechKey.self] = newValue }
  }
}

/// The value and hint on the key, watching the speech object; nothing without one.
private struct KComposeKeySpeechModifier: ViewModifier {
  @ObservedObject var speech: KComposeKeySpeech

  func body(content: Content) -> some View {
    content
      .accessibilityValue(speech.value)
      .accessibilityHint(speech.hint)
  }
}

private extension View {
  @ViewBuilder func kComposeKeySpeech(_ speech: KComposeKeySpeech?) -> some View {
    if let speech {
      modifier(KComposeKeySpeechModifier(speech: speech))
    } else {
      self
    }
  }
}

/// The wide key, watching the live state.
private struct KComposeTravelKey: View {
  /// under this width the key says SEND (compose.tsx: keyW < 170 && narrowLabel)
  static let narrowBelow: CGFloat = 170

  let theme: KTheme
  @ObservedObject var driver: KComposeDriver
  let action: () -> Void
  /// the key's width as laid out (0 until it is)
  @State private var width: CGFloat = 0
  /// what VoiceOver hears beyond the label (see KComposeKeySpeech)
  @Environment(\.kComposeKeySpeech) private var speech

  var body: some View {
    let key = driver.live.key
    let squeezed = width > 0 && width < Self.narrowBelow && !key.narrowLabel.isEmpty
    SwiftUI.Button(action: action) {
      ViewThatFits(in: .horizontal) {
        if !squeezed {
          row(key.label, key: key, fits: true)
        }
        if !key.narrowLabel.isEmpty {
          row(key.narrowLabel, key: key, fits: true)
        }
        // the last choice can always fit: it wraps and shrinks into the width it is offered
        row(key.narrowLabel.isEmpty ? key.label : key.narrowLabel, key: key, fits: false)
      }
      // compose.tsx: padding 17 and 10 inside a 1pt border, which React Native adds to the box
      // (owner, 2026-10-20: it stood taller than the keys beside it) 40 tall at the default size,
      // in step with the 44 row of keys; it still grows with the text at the large sizes
      .padding(.vertical, 11 + 1)
      .padding(.horizontal, 10 + 1)
      .frame(maxWidth: .infinity, minHeight: 40)
      .background { face(key) }
      .overlay(alignment: .leading) {
        if key.nudge {
          KComposeNudge(color: theme.bg)
            .padding(.leading, 10)
        }
      }
      .overlay {
        Rectangle().strokeBorder(edge(key), lineWidth: 1)
      }
      .contentShape(Rectangle())
    }
    .buttonStyle(KAsIsButtonStyle())
    .disabled(!key.enabled)
    .accessibilityLabel(key.label)
    .kComposeKeySpeech(speech)
    .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width = $0 }
  }

  /// the key's fill: ink when it sends, ind when it wants a stamp, else the wash on nothing
  @ViewBuilder private func face(_ key: KComposeKey) -> some View {
    switch key.stage {
    case .ready:
      theme.ink
    case .needStamp:
      theme.ind
    case .paperFirstClass:
      KBrand.waxGold
    case .paperLocked:
      Color.clear
    case .filling, .sending:
      if key.progress >= 0 {
        // the wash rising from the left toward the floor: inside the 1pt edge, to the whole
        // percent (compose.tsx: width `${Math.round(progress * 100)}%`)
        GeometryReader { geo in
          theme.lav2
            .frame(width: geo.size.width * (min(max(key.progress, 0), 1) * 100).rounded() / 100)
        }
        .padding(1)
        .accessibilityHidden(true)
      }
    }
  }

  private func edge(_ key: KComposeKey) -> Color {
    switch key.stage {
    case .ready: return theme.ink
    case .needStamp: return theme.ind
    case .paperFirstClass: return theme.ink
    case .filling, .sending, .paperLocked: return theme.line
    }
  }

  private func ink(_ key: KComposeKey) -> Color {
    switch key.stage {
    case .ready, .needStamp: return theme.bg
    case .paperFirstClass: return KBrand.inkOnBrand
    case .filling, .sending, .paperLocked: return theme.mute
    }
  }

  /// - fits: true for a one-line label at its own width (ViewThatFits takes it only where it
  ///   fits), false for the last choice, which takes the width it is offered (two lines, .75)
  @ViewBuilder private func row(_ text: String, key: KComposeKey, fits: Bool) -> some View {
    HStack(spacing: 8) {
      if fits {
        Text(text)
          .kText(.mono(13, .semibold, tracking: 1.4 / 13))
          .foregroundStyle(ink(key))
          .lineLimit(1)
          .fixedSize()
      } else {
        Text(text)
          .kText(.mono(13, .semibold, tracking: 1.4 / 13))
          .foregroundStyle(ink(key))
          .lineLimit(2)
          .multilineTextAlignment(.center)
          .minimumScaleFactor(0.75)
          .fixedSize(horizontal: false, vertical: true)
      }
      // the count rides in the row, beside the label, not over it
      if !key.count.isEmpty {
        Text(key.count)
          .composeText(.keyCount)
          .foregroundStyle(theme.mute)
          .lineLimit(1)
          .fixedSize()
          .accessibilityHidden(true)
      }
    }
  }
}

/// The chevron that leans toward the stamp key while the key says PICK A MOOD STAMP
/// (ComposeTray Nudge: 14 across, 2.4 on the 24 grid).
private struct KComposeNudge: View {
  let color: Color
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    let chevron = KStampKeyPiece(d: "M15 5 L8 12 L15 19")
      .stroke(color, style: StrokeStyle(lineWidth: 2.4 * 14 / 24, lineCap: .round, lineJoin: .round))
      .frame(width: 14, height: 14)
      .accessibilityHidden(true)
    if reduceMotion {
      chevron
    } else {
      chevron
        .keyframeAnimator(initialValue: 0.0, repeating: true) { view, x in
          view.offset(x: x)
        } keyframes: { _ in
          CubicKeyframe(-4, duration: 0.52)
          CubicKeyframe(0, duration: 0.52)
          LinearKeyframe(0, duration: 0.26)
        }
    }
  }
}

/*
 THE FACE COMES APART, AND A PENCIL ARRIVES (ComposeTray.tsx StampKeyGlyph, owner 2026-09-20),
 on the 24 grid: closed, a face (two eyes, a smile) in the perforated square (the glyph family's
 mother shape, "Perf Line": 17 across with corners of 1, a 1.6 edge in dashes of 1.4 and gaps of
 1.6, all on the grid, so they grow with the glyph); open, the eyes fly up and
 out and shrink, the smile drops, and in their place an ink dot (a stamp being drawn) and a
 short pencil across the square's corner. Closing runs it backwards. The pencil's body is the
 brand's wax gold (the amber of ComposeTray's pencil); everything else is the caller's ink.
 */
struct KStampKeyGlyph: View {
  let open: Bool
  let ink: Color
  let pencil: Color
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    GeometryReader { geo in
      let u = min(geo.size.width, geo.size.height) / 24
      ZStack {
        // the perforated square, always (ComposeTray Perf: x 3.5, y 3.5, 17 across, rx 1)
        RoundedRectangle(cornerRadius: 1 * u, style: .circular)
          .stroke(ink, style: StrokeStyle(lineWidth: 1.6 * u, dash: [1.4 * u, 1.6 * u]))
          .frame(width: 17 * u, height: 17 * u)
        // the face, in three pieces
        KStampKeyPiece(d: "M8.3 10.4a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0")
          .fill(ink)
          .scaleEffect(open ? 0.4 : 1, anchor: UnitPoint(x: 9.4 / 24, y: 10.4 / 24))
          .offset(x: open ? -5 * u : 0, y: open ? -6 * u : 0)
          .opacity(open ? 0 : 1)
        KStampKeyPiece(d: "M13.5 10.4a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0")
          .fill(ink)
          .scaleEffect(open ? 0.4 : 1, anchor: UnitPoint(x: 14.6 / 24, y: 10.4 / 24))
          .offset(x: open ? 5 * u : 0, y: open ? -6 * u : 0)
          .opacity(open ? 0 : 1)
        KStampKeyPiece(d: "M8.9 14.1c1.1 1.6 5.1 1.6 6.2 0")
          .stroke(ink, style: StrokeStyle(lineWidth: 1.6 * u, lineCap: .round))
          .scaleEffect(open ? 0.6 : 1, anchor: UnitPoint(x: 0.5, y: 14.8 / 24))
          .offset(y: open ? 6 * u : 0)
          .opacity(open ? 0 : 1)
        // what takes its place: the dot of a stamp being drawn, and the pencil
        KStampKeyPiece(d: "M8.1 10.5a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0 -4.8 0")
          .fill(ink)
          .scaleEffect(open ? 1 : 0.3, anchor: UnitPoint(x: 10.5 / 24, y: 10.5 / 24))
          .opacity(open ? 1 : 0)
        ZStack {
          KStampKeyPiece(d: "M15.2 9h2.6a.6 .6 0 0 1 .6 .6v9.8a.6 .6 0 0 1 -.6 .6h-2.6a.6 .6 0 0 1 -.6 -.6V9.6a.6 .6 0 0 1 .6 -.6z")
            .fill(pencil)
          KStampKeyPiece(d: "M15.2 9h2.6a.6 .6 0 0 1 .6 .6v9.8a.6 .6 0 0 1 -.6 .6h-2.6a.6 .6 0 0 1 -.6 -.6V9.6a.6 .6 0 0 1 .6 -.6z")
            .stroke(ink, lineWidth: 1.3 * u)
          KStampKeyPiece(d: "M14.6 20l1.9 3 1.9-3z")
            .fill(ink)
        }
        .rotationEffect(.degrees(45), anchor: UnitPoint(x: 16.5 / 24, y: 16.5 / 24))
        .rotationEffect(.degrees(open ? 0 : 20), anchor: UnitPoint(x: 16.5 / 24, y: 16.5 / 24))
        .offset(x: open ? 0 : 6 * u, y: open ? 0 : 6 * u)
        .opacity(open ? 1 : 0)
      }
      .frame(width: geo.size.width, height: geo.size.height)
    }
    .animation(reduceMotion ? nil : (open ? .easeOut(duration: 0.36) : .easeInOut(duration: 0.36)), value: open)
    .accessibilityHidden(true)
  }
}

/// One piece of the stamp key's glyph: path data on the 24 grid, scaled into its frame.
private struct KStampKeyPiece: Shape {
  let d: String

  func path(in rect: CGRect) -> Path {
    let s = min(rect.width, rect.height) / 24
    let place = CGAffineTransform(a: s, b: 0, c: 0, d: s, tx: rect.midX - 12 * s, ty: rect.midY - 12 * s)
    return KSVGPath.path(d).applying(place)
  }
}

/// The chosen stamp's #name, the live app's pill (owner, 2026-10-20): 32 tall (one fixed height,
/// centred on the 44 row), fully round, the stamp's wash with a 1.5 rule in its line colour,
/// "#name" in Plex Mono 500 11.5 in its ink. A long name never shrinks or cuts: the pill grows to
/// the right and the key beside it gives way (it says SEND when LET IT TRAVEL no longer fits). No
/// hard shadow. Tapping it opens the stamps again.
private struct KComposeStampPill: View {
  static let height: CGFloat = 32
  let stamp: KComposeStamp
  let action: () -> Void

  var body: some View {
    SwiftUI.Button(action: action) {
      Text(stamp.name)
        .composeText(.pillName)
        .foregroundStyle(stamp.ink)
        .lineLimit(1)
        .fixedSize()
        .padding(.horizontal, 12)
        .frame(height: Self.height)
        .background(Capsule().fill(stamp.wash))
        .overlay(Capsule().strokeBorder(stamp.line, lineWidth: 1.5))
        .frame(height: KComposeKeySize.target)
        .contentShape(Rectangle())
    }
    .buttonStyle(KComposeKeyPressStyle())
    .layoutPriority(1)
    .accessibilityLabel(stamp.accessibilityLabel)
  }
}
