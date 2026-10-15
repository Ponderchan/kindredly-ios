// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE 10a BUTTON LEVELS (tokens-10a.md §8). Where the prompts and the mock differ, the mock's
 numbers are used:

 - PRIMARY: solid ind, white mark. Only the round + in the tab bar is primary (H:119); the
   write-back ↑ is solid ink in the mock (H:115), so it is a secondary.
 - SECONDARY: solid ink, text in bg, corners of 14 ("See your labels", UPLOAD; H:78, 81).
 - TERTIARY: sf with a 2pt ln outline and ink text, a hard 2/2 shadow if asked (STAMP CAM; H:81).
 - DISABLED: faint text on a soft2 pill, mono 600 11 at .12em (the SEND pill; H:124). The
   prompts' version, mute text with no fill (P:56), is the one the mock replaced.

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
 THE ROUND + (H:119): a 48 circle in ind with an indigo glow under it (0 6 14 -4
 rgba(58,52,214,.55)), and a white + drawn 22 wide. The SVG's stroke is 2.6 in its 24-unit box,
 so 2.6 × 22/24 on screen, with round ends. When isOpen is true the + turns 45° into an ×, on
 the mock's curve (.4s, cubic-bezier(.3,1.2,.4,1), which overshoots a little and settles).

 The mock turns the whole circle, and CSS turns a box-shadow with its box, so there the glow
 swings down and to the left as the + opens. Here only the + turns and the glow stays below:
 the circle looks the same either way, and light doesn't turn with a button.

 The + is white in every theme, as in the mock. On Midnight's ind (#8E89FF) that is a contrast
 of about 2.9, just under the 3 WCAG asks of a graphic.
 */
public struct KPrimaryRound: View {
  private let theme: KTheme
  private let isOpen: Bool
  private let accessibilityLabel: String
  private let action: () -> Void

  /// - Parameters:
  ///   - isOpen: true turns the + into an × (the composer is open)
  ///   - accessibilityLabel: what VoiceOver says, e.g. "Write" closed and "Close" open
  public init(theme: KTheme, isOpen: Bool, accessibilityLabel: String, action: @escaping () -> Void) {
    self.theme = theme
    self.isOpen = isOpen
    self.accessibilityLabel = accessibilityLabel
    self.action = action
  }

  public var body: some View {
    Button(action: action) {
      KPlusGlyph()
        .stroke(Color.white, style: StrokeStyle(lineWidth: 2.6 * 22 / 24, lineCap: .round))
        .frame(width: 22, height: 22)
        .rotationEffect(.degrees(isOpen ? 45 : 0))
        .animation(KMotion.plusTurn, value: isOpen)
        .frame(width: 48, height: 48)
        .background(Circle().fill(theme.ind))
        .kSoftShadows(KSoftShadow.primaryGlow, in: Circle())
        .contentShape(Circle())
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityLabel(accessibilityLabel)
  }
}

/// A secondary or tertiary button's inside: an optional SF Symbol, 8 from the title. The mono
/// kind (UPLOAD, STAMP CAM) is mono 600 12 at .1em in capitals; the plain kind is system 600 14.
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
        .textCase(mono ? .uppercase : nil)
        .kText(mono ? .monoButton : .button)
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

/// TERTIARY (H:81, P:55): sf fill, a 2pt ln outline, ink title, corners of 14, padding 12 (11 for
/// the mono kind) inside the outline, as wide as it is offered. shadow adds the prompts' optional
/// hard 2/2 shadow in ln, which the mock's STAMP CAM doesn't have; pressed, a shadowed one goes
/// down onto its shadow and a plain one dips 1pt.
public struct KTertiaryButton: View {
  private let theme: KTheme
  private let title: String
  private let systemImage: String?
  private let mono: Bool
  private let shadow: Bool
  private let action: () -> Void
  @Environment(\.kButtonsFillHeight) private var fillsHeight

  public init(theme: KTheme, title: String, systemImage: String? = nil, mono: Bool = false, shadow: Bool = false, action: @escaping () -> Void) {
    self.theme = theme
    self.title = title
    self.systemImage = systemImage
    self.mono = mono
    self.shadow = shadow
    self.action = action
  }

  public var body: some View {
    Button(action: action) {
      KButtonLabel(title: title, systemImage: systemImage, mono: mono)
        .foregroundStyle(theme.ink)
        // the padding, and the 2pt outline outside it
        .padding((mono ? 11 : 12) + 2)
        .frame(maxWidth: .infinity, maxHeight: fillsHeight ? .infinity : nil)
    }
    .buttonStyle(KStickerButtonStyle(
      shape: RoundedRectangle(cornerRadius: 14, style: .circular),
      fill: theme.sf,
      stroke: theme.ln,
      lineWidth: 2,
      shadow: shadow ? theme.ln : nil,
      shadowOffset: shadow ? 2 : 0
    ))
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
        .textCase(.uppercase)
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
