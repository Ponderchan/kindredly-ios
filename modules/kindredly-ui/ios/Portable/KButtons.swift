// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE 10a BUTTON LEVELS (tokens-10a.md §8). Where the prompts and the mock differ, the mock's
 numbers are used:

 - PRIMARY: solid ind, white mark (bg in Midnight). Only the round + in the tab bar is primary
   (H:119); the write-back ↑ is solid ink in the mock (H:115), so it is a secondary.
 - SECONDARY: solid ink, text in bg, corners of 14 ("See your labels", UPLOAD; H:78, 81).
 - TERTIARY: a flat lav fill and ink text (STAMP CAM; H:81). The mock's 2pt ln outline and hard
   shadow are gone (owner's rule B, 2026-10-26: controls are flat).
 - DISABLED: faint text on a soft2 pill, mono 600 11 at .12em (the SEND pill; H:124). The
   prompts' version, mute text with no fill (P:56), is the one the mock replaced.

 Two keys every composer shares are at the end of the file: KSendKey, the one send key of the
 app, and KRoundTool, the round + and Wren buttons beside a reply strip.

 Every title is passed in already translated; nothing here holds a word of its own.
 */

/// The mock's + glyph: "M12 5v14M5 12h14" in a 24-unit box, scaled to whatever frame it gets.
struct KPlusGlyph: Shape {
  func path(in rect: CGRect) -> Path {
    let u = min(rect.width, rect.height) / 24
    let x0 = rect.midX - 12 * u
    let y0 = rect.midY - 12 * u
    var p = Path()
    p.move(to: CGPoint(x: x0 + 12 * u, y: y0 + 5 * u))
    p.addLine(to: CGPoint(x: x0 + 12 * u, y: y0 + 19 * u))
    p.move(to: CGPoint(x: x0 + 5 * u, y: y0 + 12 * u))
    p.addLine(to: CGPoint(x: x0 + 19 * u, y: y0 + 12 * u))
    return p
  }
}

/*
 THE ROUND + (H:119): a 48 circle in ind with a glow of the same ind under it (0 6 14 -4 at .55,
 the mock's rgba(58,52,214,.55) in the light themes), and a white + drawn 22 wide. The SVG's
 stroke is 2.6 in its 24-unit box, so 2.6 × 22/24 on screen, with round ends. When isOpen is
 true the + turns 45° into an ×, on the mock's curve (.4s, cubic-bezier(.3,1.2,.4,1), which
 overshoots a little and settles). A caller can pass its own turn: the tab bar's publish entry
 (Today 3d, Prompt 8) turns it on KMotion.plusTurnPublish (.35s, cubic-bezier(.3,1.3,.4,1)).

 The mock turns the whole circle, and CSS turns a box-shadow with its box, so there the glow
 swings down and to the left as the + opens. Here only the + turns and the glow stays below:
 the circle looks the same either way, and light doesn't turn with a button.

 The + is white in the light themes, as in the mock. Midnight draws it in bg instead: white on
 its pale ind (#8E89FF) is 2.93:1, under the 3 WCAG asks of a graphic, and bg is 6.52:1, the
 colour every other mark on an ind fill already takes there (the tab count, the voice disc).
 */
public struct KPrimaryRound: View {
  private let theme: KTheme
  private let isOpen: Bool
  private let accessibilityLabel: String
  private let turn: Animation
  private let action: () -> Void
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  /// - Parameters:
  ///   - isOpen: true turns the + into an × (the composer is open)
  ///   - accessibilityLabel: what VoiceOver says, e.g. "Write" closed and "Close" open
  ///   - turn: the curve the + turns on; KMotion.plusTurn unless the caller has its own (the
  ///     publish entry's KMotion.plusTurnPublish). Reduce Motion always gets a plain ease.
  public init(theme: KTheme, isOpen: Bool, accessibilityLabel: String, turn: Animation = KMotion.plusTurn, action: @escaping () -> Void) {
    self.theme = theme
    self.isOpen = isOpen
    self.accessibilityLabel = accessibilityLabel
    self.turn = turn
    self.action = action
  }

  public var body: some View {
    Button(action: action) {
      KPlusGlyph()
        .stroke(theme.isDark ? theme.bg : Color.white, style: StrokeStyle(lineWidth: 2.6 * 22 / 24, lineCap: .round))
        .frame(width: 22, height: 22)
        .rotationEffect(.degrees(isOpen ? 45 : 0))
        // the turn overshoots a little; with Reduce Motion it is a plain ease
        .animation(reduceMotion ? .easeInOut(duration: 0.25) : turn, value: isOpen)
        .frame(width: 48, height: 48)
        .background(Circle().fill(theme.ind))
        .kSoftShadows(KSoftShadow.primaryGlow(for: theme), in: Circle())
        .contentShape(Circle())
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityLabel(accessibilityLabel)
  }
}

public extension KMotion {
  /// The + turning to × as the publish entry (Today 3d, Prompt 8): transform .35s
  /// cubic-bezier(.3,1.3,.4,1), a little more overshoot than plusTurn and a little quicker. The
  /// tab bar passes it to KPrimaryRound(turn:) and slides itself away on it for the sheet.
  static let plusTurnPublish = Animation.timingCurve(0.3, 1.3, 0.4, 1, duration: 0.35)
}

/*
 PRESSING A ROUND CONTROL that is neither a sticker nor a float (Today 3d, Prompt 3: NEXT's glass
 disc and REPLY's ink disc): it shrinks to .94 over 150ms, as the design's
 "transition:transform .15s; :active scale(.94)" does, and comes back the same way. KFloatPressStyle
 is the same scale on the shorter press curve; this one keeps the design's own timing and lets a
 caller pass another scale or curve. Reduce Motion keeps it: it follows the finger, it is feedback.
 */
public struct KPressScaleStyle: ButtonStyle {
  private let scale: CGFloat
  private let animation: Animation

  /// - Parameters:
  ///   - scale: the size while the finger is down
  ///   - animation: the curve both ways
  public init(scale: CGFloat = 0.94, animation: Animation = .easeOut(duration: 0.15)) {
    self.scale = scale
    self.animation = animation
  }

  public func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .scaleEffect(configuration.isPressed ? scale : 1)
      .animation(animation, value: configuration.isPressed)
  }
}

/// A secondary or tertiary button's inside: an optional SF Symbol, 8 from the title. A button is
/// System 600 14 whatever its kind (owner's type system, 10-20: the mock's mono kind, UPLOAD and
/// STAMP CAM in capitals, is no longer set in mono; `mono` now only keeps its 11 padding).
struct KButtonLabel: View {
  let title: String
  let systemImage: String?
  let mono: Bool

  var body: some View {
    HStack(spacing: 8) {
      if let systemImage {
        // the mock's icons are 16 × 16 line drawings, stroke 1.9 of 24
        Image(systemName: systemImage)
          .font(.system(size: 14, weight: .semibold))
          .frame(width: 16, height: 16)
      }
      Text(title)
        .kText(.button)
        .lineLimit(1)
    }
  }
}

/*
 Side by side in the mock's two-column grid (UPLOAD | STAMP CAM, H:81: "grid-template-columns:
 1fr 1fr; gap:10px"), the grid stretches both buttons to the taller one's height. A tertiary is
 4pt taller than a secondary of the same kind, its 2pt outline sitting outside the padding as
 CSS draws it. Put the pair in an HStack(spacing: 10) and give the HStack .kEqualHeightButtons().
 */
private struct KButtonsFillHeightKey: EnvironmentKey {
  static let defaultValue = false
}

extension EnvironmentValues {
  var kButtonsFillHeight: Bool {
    get { self[KButtonsFillHeightKey.self] }
    set { self[KButtonsFillHeightKey.self] = newValue }
  }
}

public extension View {
  /// The secondary and tertiary buttons inside take the height of the tallest of them, as the
  /// mock's button grid does. For a row of buttons, not for a screen: it also fixes the row's
  /// height to its content.
  func kEqualHeightButtons() -> some View {
    environment(\.kButtonsFillHeight, true)
      .fixedSize(horizontal: false, vertical: true)
  }
}

/// SECONDARY (H:78, 81): ink fill, the title in bg, corners of 14, padding 12 (11 for the mono
/// kind), and as wide as it is offered, the title centred. No outline and no shadow; pressed, it
/// dips 1pt.
public struct KSecondaryButton: View {
  private let theme: KTheme
  private let title: String
  private let systemImage: String?
  private let mono: Bool
  private let action: () -> Void
  @Environment(\.kButtonsFillHeight) private var fillsHeight

  public init(theme: KTheme, title: String, systemImage: String? = nil, mono: Bool = false, action: @escaping () -> Void) {
    self.theme = theme
    self.title = title
    self.systemImage = systemImage
    self.mono = mono
    self.action = action
  }

  public var body: some View {
    Button(action: action) {
      KButtonLabel(title: title, systemImage: systemImage, mono: mono)
        .foregroundStyle(theme.bg)
        .padding(mono ? 11 : 12)
        .frame(maxWidth: .infinity, maxHeight: fillsHeight ? .infinity : nil)
    }
    .buttonStyle(KStickerButtonStyle(shape: RoundedRectangle(cornerRadius: 14, style: .circular), fill: theme.ink))
  }
}

/// TERTIARY (H:81, P:55): a flat lav fill (owner's rule B, 2026-10-26), ink title, corners of 14,
/// padding 12 (11 for the mono kind) and the 2 the mock's outline took, as wide as it is offered;
/// pressed, it dips 1pt.
public struct KTertiaryButton: View {
  private let theme: KTheme
  private let title: String
  private let systemImage: String?
  private let mono: Bool
  private let action: () -> Void
  @Environment(\.kButtonsFillHeight) private var fillsHeight

  public init(theme: KTheme, title: String, systemImage: String? = nil, mono: Bool = false, action: @escaping () -> Void) {
    self.theme = theme
    self.title = title
    self.systemImage = systemImage
    self.mono = mono
    self.action = action
  }

  public var body: some View {
    Button(action: action) {
      KButtonLabel(title: title, systemImage: systemImage, mono: mono)
        .foregroundStyle(theme.ink)
        // the padding, and the 2 the mock's outline took
        .padding((mono ? 11 : 12) + 2)
        .frame(maxWidth: .infinity, maxHeight: fillsHeight ? .infinity : nil)
    }
    .buttonStyle(KStickerButtonStyle(shape: RoundedRectangle(cornerRadius: 14, style: .circular), fill: theme.lav))
  }
}

/// A button style that draws the label as it is, pressed or not, enabled or not.
struct KAsIsButtonStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
  }
}

/// DISABLED (H:124): the title in faint on a soft2 pill, mono 600 11 at .12em in capitals,
/// corners of 18, padding 9 14. It is a button that can't be pressed, so VoiceOver reads it as
/// a dimmed button (the SEND pill before anything has been written).
public struct KDisabledPill: View {
  private let theme: KTheme
  private let title: String

  public init(theme: KTheme, title: String) {
    self.theme = theme
    self.title = title
  }

  public var body: some View {
    Button(action: {}) {
      Text(title)
        .kText(.monoSend)
        .foregroundStyle(theme.faint)
        .lineLimit(1)
        .fixedSize()
        .padding(.vertical, 9)
        .padding(.horizontal, 14)
        .background(RoundedRectangle(cornerRadius: 18, style: .circular).fill(theme.soft2))
    }
    .buttonStyle(KAsIsButtonStyle())
    .disabled(true)
  }
}

/*
 THE SEND KEY, one for the whole app: the reply strips in rooms and chats, the Today reply dock,
 the reader. Three states (KSendState):
 - disabled: nothing to send yet (or not enough): KDisabledPill, the faint SEND on soft2 (H:124);
 - enabled: the words can go;
 - dimmed: the words are fine but they can't go right now (a full pouch: every letter you may
   have in flight is flying). It looks off, at .35, and still takes the tap, so the screen can
   say why (owner: "a full pouch dims the plane before the tap, not after").
 And two looks for enabled (KSendStyle), owner question 3, asked 2026-10-16 and built with the
 recommended answer, standard = .plane:
 - plane: the owner's 2026-09-20 key, a 54 × 36 ink pill, corners of 18, with a solid paper
   plane 19 across in bg (ChatField.tsx SendPlane, letters.tsx:655);
 - word: the prompts' version, SEND in bg on an ind pill, KDisabledPill's own metrics.
 VoiceOver reads the label (SEND) as a button, dimmed when disabled.
 */

/// What the send key can do right now.
public enum KSendState: String, Sendable {
  /// nothing to send: the faint pill, not pressable
  case disabled
  /// the words can go
  case enabled
  /// the words are fine but can't go now (a full pouch): drawn off, still pressable
  case dimmed
}

/// How the send key looks when it can send.
public enum KSendStyle: String, Sendable {
  /// the ink pill with the paper plane (ChatField.tsx SendPlane)
  case plane
  /// SEND on an ind pill
  case word

  /// OWNER QUESTION 3: the look every send key takes. The plane until the owner says otherwise.
  public static let standard: KSendStyle = .plane
}

public struct KSendKey: View {
  /// the plane pill's size (ChatField.tsx SendPlane)
  public static let planeSize = CGSize(width: 54, height: 36)

  private let theme: KTheme
  private let state: KSendState
  private let style: KSendStyle
  private let label: String
  private let action: () -> Void

  /// - Parameters:
  ///   - state: disabled, enabled or dimmed (see the note above)
  ///   - style: the enabled look; KSendStyle.standard unless a screen has a reason
  ///   - label: SEND, already translated: the disabled pill's word, the word style's word, and
  ///     what VoiceOver says
  ///   - action: the key was pressed (enabled or dimmed)
  public init(theme: KTheme, state: KSendState, style: KSendStyle = .standard, label: String, action: @escaping () -> Void) {
    self.theme = theme
    self.state = state
    self.style = style
    self.label = label
    self.action = action
  }

  public var body: some View {
    if state == .disabled {
      KDisabledPill(theme: theme, title: label)
        .accessibilityLabel(label)
    } else {
      SwiftUI.Button(action: action) {
        face
      }
      .buttonStyle(KFloatPressStyle())
      .compositingGroup()
      .opacity(state == .dimmed ? 0.35 : 1)
      .accessibilityLabel(label)
    }
  }

  @ViewBuilder
  private var face: some View {
    switch style {
    case .plane:
      KLineIcon(.plane, size: 19, lineWidth: 0, color: theme.bg)
        .frame(width: Self.planeSize.width, height: Self.planeSize.height)
        .background(Capsule().fill(theme.ink))
        .contentShape(Capsule())
    case .word:
      Text(label)
        .kText(.monoSend)
        .foregroundStyle(theme.bg)
        .lineLimit(1)
        .fixedSize()
        .padding(.vertical, 9)
        .padding(.horizontal, 14)
        .background(RoundedRectangle(cornerRadius: 18, style: .circular).fill(theme.ind))
        .contentShape(RoundedRectangle(cornerRadius: 18, style: .circular))
    }
  }
}

/*
 A ROUND TOOL beside a reply strip or on a composer toolbar (H:136, chat spec): a 40 circle with
 no ring (owner's rule B, 2026-10-26: controls are flat; the lav disc only while the +'s tray is
 open, as Wren's desk's +) and nothing inside it but its mark, in a 44 target.
 - plus(open:): the + 18 across at stroke 2 in ink; open (its tray is showing) it turns 45° into
   an × in ind, on the + sheet's curve (KMotion.plusTurn; a plain ease with Reduce Motion);
 - image: a picture 24 across, fitted (Wren's bird snapshot); nil keeps the circle empty while
   it loads;
 - line: any line glyph, 18 across at stroke 2 in ink.
 dot adds a 9pt ind dot ringed 1.5 in bg at the top right: something is attached (compose).
 */
public struct KRoundTool: View {
  /// what the circle holds
  public enum Glyph: Equatable, Sendable {
    /// the +, turned to an × in ind while its tray is open
    case plus(open: Bool)
    /// a picture, fitted 24 across (Wren's snapshot)
    case image(KImageRef?)
    /// a line glyph in ink
    case line(KLineGlyph)
  }

  /// the circle and the target around it
  public static let diameter: CGFloat = 40
  public static let target: CGFloat = 44

  private let theme: KTheme
  private let glyph: Glyph
  private let accessibilityLabel: String
  private let dot: Bool
  private let action: () -> Void
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  /// - Parameters:
  ///   - glyph: the mark (see Glyph)
  ///   - accessibilityLabel: what VoiceOver says, already translated (an open + says "close")
  ///   - dot: the ind dot at the top right (something attached)
  public init(theme: KTheme, glyph: Glyph, accessibilityLabel: String, dot: Bool = false, action: @escaping () -> Void) {
    self.theme = theme
    self.glyph = glyph
    self.accessibilityLabel = accessibilityLabel
    self.dot = dot
    self.action = action
  }

  public var body: some View {
    SwiftUI.Button(action: action) {
      mark
        .frame(width: Self.diameter, height: Self.diameter)
        .background(Circle().fill(glyph == .plus(open: true) ? theme.lav : Color.clear))
        .overlay(alignment: .topTrailing) {
          if dot {
            Circle()
              .fill(theme.ind)
              .frame(width: 9, height: 9)
              .padding(1.5)
              .background(Circle().fill(theme.bg))
              .offset(x: 1, y: -1)
          }
        }
        .frame(width: Self.target, height: Self.target)
        .contentShape(Circle())
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityLabel(accessibilityLabel)
  }

  @ViewBuilder
  private var mark: some View {
    switch glyph {
    case let .plus(open):
      KLineIcon(.plus, size: 18, lineWidth: 2, color: open ? theme.ind : theme.ink)
        .rotationEffect(.degrees(open ? 45 : 0))
        .animation(reduceMotion ? .easeInOut(duration: 0.25) : KMotion.plusTurn, value: open)
    case let .image(ref):
      KImage(ref, size: CGSize(width: 24, height: 24), contentMode: .fit, placeholder: .clear)
    case let .line(g):
      KLineIcon(g, size: 18, lineWidth: 2, color: theme.ink)
    }
  }
}

// MARK: - long bars stay phone-length

/* LONG BARS STAY PHONE-LENGTH (owner, 2026-11-12, looking at "Hatch my courier" drawn 900 wide on
   the iPhone Duo's inner screen: "适配的时候这种长条的一定注意别弄这么长… 要美合理"). A key, an
   input bar or any other bar that fills its row on a phone must not grow with a wide screen: on
   a page wider than any phone it keeps a phone's length and sits in the middle of its row.

   kPhoneLength() does that for one view. Offered no more than `over` (440: the widest iPhone's
   window) it changes nothing at all, so no phone is laid out differently; offered more, the view
   is offered `cap` instead and centred in the room it was given. */
struct KPhoneLength: Layout {
  /// the length a bar keeps on a wide page
  var cap: CGFloat = 360
  /// offered more than this, the bar is on a page wider than any phone
  var over: CGFloat = 440

  private func capped(_ p: ProposedViewSize) -> ProposedViewSize {
    guard let w = p.width, w > over else { return p }
    // only ever narrower: a cap wider than the room (the reader's 600 on the Duo's 466 outer
    // screen) must not push the content past the edge
    return ProposedViewSize(width: min(cap, w), height: p.height)
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    subviews.first?.sizeThatFits(capped(proposal)) ?? .zero
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    subviews.first?.place(
      at: CGPoint(x: bounds.midX, y: bounds.midY),
      anchor: .center,
      proposal: capped(ProposedViewSize(width: bounds.width, height: bounds.height))
    )
  }
}

extension View {
  /// On a page wider than any phone this view keeps a phone's length (KPhoneLength); on a phone
  /// it is laid out exactly as without it.
  func kPhoneLength(_ cap: CGFloat = 360) -> some View {
    KPhoneLength(cap: cap) { self }
  }
}

// MARK: - the fold (iPhone Duo)

/* THE FOLD, AS A VIEW READS IT (iPhone Duo, 2026-11-12). The app decides how a folding phone's
   window is laid out in one place (React Native's lib/fold-frame: the system's band down the
   right edge, one column on the inner screen, where two pages meet) and hands the numbers over
   through the module (setFoldFrame). They are kept here so any view can read them without a
   prop of its own:

     @ObservedObject private var fold = KFold.shared     // then fold.frame

   On a phone that doesn't fold nothing is ever handed over and the frame is `.phone`: every
   number 0, duo false. A view should read it only to do something a phone never needs. */
public struct KFoldFrame: Equatable, Sendable {
  /// a folding phone, and the layout for it is on
  public var duo = false
  /// "phone", "closed" (the outer screen), "open" (the inner screen, wider than tall) or "tall"
  public var posture = "phone"
  /// the hinge is part-way: the phone is standing half-folded
  public var half = false
  /// what a page keeps clear on its left and right (the band, and the air beside one column)
  public var left: CGFloat = 0
  public var right: CGFloat = 0
  /// the system's band down the right edge, and where its own status area ends
  public var band: CGFloat = 0
  public var bandTop: CGFloat = 0
  /// two pages: the crease's x and the right page's own right edge; 0 when the window is one page
  public var crease: CGFloat = 0
  public var rightEnd: CGFloat = 0

  public init() {}
  public static let phone = KFoldFrame()
  /// the window is two pages side by side
  public var twoPages: Bool { duo && crease > 0 }
  /// the tab bar stands in the band, so there is none along the bottom (fold-frame.ts's rule:
  /// the band has to hold it, RAIL_MIN_BAND = 80)
  public var rail: Bool { duo && band >= 80 }
}

public final class KFold: ObservableObject {
  public static let shared = KFold()
  @Published public private(set) var frame = KFoldFrame.phone

  /// main thread only
  public func set(_ next: KFoldFrame) {
    if next != frame { frame = next }
  }
}

// MARK: - The page's own tools, in the band (iPhone Duo)

/*
 THE PAGE'S TOOLS MOVE INTO THE BAND (owner, 2026-11-12, at the outer screen: "类似 notes 等这个
 屏的时候…日历和切换 grid/card 图标什么的自动切到侧边栏。你想想还有那些 tap 可以切").

 On a folding phone the tab bar stands in the band at the right edge (KTabBarMetrics, THE RAIL),
 and between the system's clock and the tabs the band is empty. A page's round keys, the ones
 that sat at the top right of its header (as far from the thumb as a key can be), stand there
 instead, over the tabs: Notes' view and calendar, Kindreds' orbit and search, Me's Edit and
 settings. Today has none.

 How it works, all in Swift (no bridge):
 · a tab's screen PUBLISHES its tools here, most wanted first, each one the finished button it
   would have drawn in its header (so it looks and behaves exactly the same);
 · the rail DRAWS the selected tab's tools, as many as it has room for (2 on the outer screen,
   3 on the inner), and says how many that is (`room`);
 · the screen LEAVES OUT of its header the ones the rail took (`taken`), and keeps the rest.
 On a phone, with the bar along the bottom, or with a tab bar that is not this one, `room` is 0
 and every header is exactly as it was.

 A tool is a snapshot: the screen publishes again whenever something its buttons show changes
 (.onChange of a signature), never from a body.
 */
public struct KRailTool: Identifiable {
  /// unique across tabs ("notes.view"), so a tool arriving or leaving is its own transition
  public let id: String
  let view: AnyView

  public init<V: View>(_ id: String, @ViewBuilder view: () -> V) {
    self.id = id
    self.view = AnyView(view())
  }
}

public final class KRailTools: ObservableObject {
  public static let shared = KRailTools()
  /// each tab's tools, most wanted first
  @Published public private(set) var tools: [KTabGlyph: [KRailTool]] = [:]
  /// how many of a page's tools the rail draws: 0 unless the tab bar stands in the band
  @Published public private(set) var room = 0

  /// main thread only
  public func set(_ tab: KTabGlyph, _ list: [KRailTool]) {
    if list.isEmpty && (tools[tab]?.isEmpty ?? true) { return }
    tools[tab] = list
  }

  /// main thread only (the rail's)
  public func setRoom(_ n: Int) {
    if n != room { room = n }
  }

  /// the tools of `tab` the rail draws: the page leaves these out of its own header
  public func taken(_ tab: KTabGlyph) -> Set<String> {
    Set((tools[tab] ?? []).prefix(room).map(\.id))
  }
}

/// A page's round key as the band draws it, for a tool whose header form is not already one
/// (Kindreds' chips, Me's Edit): 40 round on the theme's soft, lav while on, in a 44 square,
/// as Notes' header keys are.
public struct KRailKey<Icon: View>: View {
  let theme: KTheme
  let on: Bool
  let label: String
  let hint: String
  let action: () -> Void
  let icon: Icon

  public init(theme: KTheme, on: Bool = false, label: String, hint: String = "", action: @escaping () -> Void, @ViewBuilder icon: () -> Icon) {
    self.theme = theme
    self.on = on
    self.label = label
    self.hint = hint
    self.action = action
    self.icon = icon()
  }

  public var body: some View {
    SwiftUI.Button(action: action) {
      icon
        .frame(width: 40, height: 40)
        .background(Circle().fill(on ? theme.lav : theme.soft))
        .frame(width: 44, height: 44)
        .contentShape(Rectangle())
        .animation(.easeInOut(duration: 0.18), value: on)
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityLabel(label)
    .accessibilityHint(hint)
    .accessibilityAddTraits(on ? .isSelected : [])
  }
}
