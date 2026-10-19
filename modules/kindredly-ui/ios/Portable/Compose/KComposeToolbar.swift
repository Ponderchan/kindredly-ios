// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE COMPOSE TOOLBAR, riding the keyboard's top, 10 apart. It looks as the App Store page's did
 (owner, 2026-10-18; compose.tsx and ComposeTray.tsx): two round keys, a keyboard's shape (owner,
 2026-09-20), then the wide key.

 - the + (a 46 circle with a 1.5 ln ring, ComposeTray's RoundKey): the question and the voice
   letter live behind it. Its plus (27 across, 1.8 on the 24 grid) turns 45° into an × in ind
   while its tray is open, and the ring wears an ind dot edged in the page colour, 2 inside the
   ring at the top right, when something rides with the letter (a question, the voice);
 - the stamp: while none is chosen, the same round key holding the stamp glyph, a face in a
   perforated square (ComposeTray's StampKeyGlyph at 27); while the stamp tray is open the face
   comes apart and a pencil lies across the square (owner 2026-09-20: the eyes fly up and out,
   the smile drops, the pencil arrives, .36s). Once a stamp is chosen, its pill instead, the App
   Store solid pill like the letter's #tag and the web's (the lead's call, 2026-10-19; TS stampVM
   over kit topicTagLook): 46 tall, corners of 23, filled with the stamp's hex, a 2pt edge and a
   hard 3/3 shadow in ln, "#name" in Plex Mono 500 11.5 in ink #1E1B35, at most 148 wide,
   shrinking to .68 before it would cut the word;
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
      KComposeRoundKey(
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

      if let stamp = content.stamp {
        KComposeStampPill(stamp: stamp) {
          driver.blurAll()
          actions.onTray(.stamps)
        }
      } else {
        KComposeRoundKey(
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

      KComposeTravelKey(theme: theme, driver: driver) {
        driver.blurAll()
        actions.onKey(driver.body.text, driver.ask.text)
      }
    }
    .disabled(content.busy)
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
  }
}

/// React Native's pressed look on these keys: the key at .7 while held.
private struct KComposeDimPressStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .opacity(configuration.isPressed ? 0.7 : 1)
  }
}

/// The round keys' measures (ComposeTray RoundKey, PlusGlyph and StampKeyGlyph).
private enum KComposeKeySize {
  /// the circle, and the pill's height beside it
  static let diameter: CGFloat = 46
  /// the glyph's box
  static let glyph: CGFloat = 27
}

/// A round key in the bar (ComposeTray RoundKey): a 46 circle, a 1.5 ln ring, no fill.
private struct KComposeRoundKey<Glyph: View>: View {

  let theme: KTheme
  let accessibilityLabel: String
  let selected: Bool
  let dot: Bool
  let action: () -> Void
  let glyph: Glyph

  init(theme: KTheme, accessibilityLabel: String, selected: Bool, dot: Bool, action: @escaping () -> Void, @ViewBuilder glyph: () -> Glyph) {
    self.theme = theme
    self.accessibilityLabel = accessibilityLabel
    self.selected = selected
    self.dot = dot
    self.action = action
    self.glyph = glyph()
  }

  var body: some View {
    SwiftUI.Button(action: action) {
      glyph
        .frame(width: KComposeKeySize.diameter, height: KComposeKeySize.diameter)
        .overlay(Circle().strokeBorder(theme.ln, lineWidth: 1.5))
        .overlay(alignment: .topTrailing) {
          if dot {
            // ComposeTray KeyDot: 9 across, ind edged 1.5 in the page colour, 2 inside the ring
            Circle()
              .fill(theme.ind)
              .overlay(Circle().strokeBorder(theme.bg, lineWidth: 1.5))
              .frame(width: 9, height: 9)
              .padding(1.5 + 2)
          }
        }
        .contentShape(Circle())
    }
    .buttonStyle(KComposeDimPressStyle())
    .accessibilityLabel(accessibilityLabel)
    .accessibilityAddTraits(selected ? .isSelected : [])
  }
}

/// The plus that turns 45° into an × while its tray is open (ComposeTray PlusGlyph at 27).
private struct KComposePlusGlyph: View {
  let open: Bool
  let color: Color
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    let s = KComposeKeySize.glyph
    KStampKeyPiece(d: "M12 6v12M6 12h12")
      .stroke(color, style: StrokeStyle(lineWidth: 1.8 * s / 24, lineCap: .round))
      .frame(width: s, height: s)
      .rotationEffect(.degrees(open ? 45 : 0))
      .animation(reduceMotion ? nil : .easeOut(duration: 0.26), value: open)
      .accessibilityHidden(true)
  }
}

/// The chosen stamp's pill.
private struct KComposeStampPill: View {
  static let maxWidth: CGFloat = 148
  /// the #tag's edge and its hard shadow's offset (KTopicTag, TS TopicTag: 2 and 3)
  static let edge: CGFloat = 2
  static let shadow: CGFloat = 3
  let stamp: KComposeStamp
  let action: () -> Void

  var body: some View {
    SwiftUI.Button(action: action) {
      // the words' room inside the pill: it hugs a short name and stops a long one at 148,
      // where the name shrinks instead (React Native's maxWidth; a frame would always fill it)
      KComposeWidthCap(maxWidth: Self.maxWidth - 2 * (12 + Self.edge)) {
        Text(stamp.name)
          .composeText(.pillName)
          .foregroundStyle(stamp.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.68)
      }
      // padding 12 inside the 2pt edge, which React Native counts in the box (and in the 148)
      .padding(.horizontal, 12 + Self.edge)
      .frame(height: KComposeKeySize.diameter)
      .background(Capsule().fill(stamp.wash))
      .overlay(Capsule().strokeBorder(stamp.line, lineWidth: Self.edge))
      // the hard shadow: the same capsule in ln, 3 right and 3 down, behind (no blur)
      .background(Capsule().fill(stamp.line).offset(x: Self.shadow, y: Self.shadow))
      .contentShape(Capsule())
      // the shadow takes no room in the row; leave it its 3 on the right
      .padding(.trailing, Self.shadow)
    }
    .buttonStyle(KComposeDimPressStyle())
    // the pill keeps its width; the key takes what is left and says SEND if it must
    .layoutPriority(1)
    .accessibilityLabel(stamp.accessibilityLabel)
  }
}

/// Offers its one child at most `maxWidth` and takes the child's own size: a cap that hugs, as
/// React Native's maxWidth does (a flexible frame takes the whole width it is offered up to its
/// cap).
private struct KComposeWidthCap: Layout {
  let maxWidth: CGFloat

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    guard let child = subviews.first else { return .zero }
    return child.sizeThatFits(ProposedViewSize(width: min(proposal.width ?? maxWidth, maxWidth), height: proposal.height))
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    subviews.first?.place(at: CGPoint(x: bounds.midX, y: bounds.midY), anchor: .center, proposal: ProposedViewSize(width: bounds.width, height: bounds.height))
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
      .padding(.vertical, 17 + 1)
      .padding(.horizontal, 10 + 1)
      .frame(maxWidth: .infinity, minHeight: 44)
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
    case .filling, .sending: return theme.line
    }
  }

  private func ink(_ key: KComposeKey) -> Color {
    switch key.stage {
    case .ready, .needStamp: return theme.bg
    case .filling, .sending: return theme.mute
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
