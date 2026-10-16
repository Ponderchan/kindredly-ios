// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 A NOTICE: "notifications are off, turn them on" under the Kindreds title (NotifyBanner.tsx),
 and Settings' notifications-off panel in THE QUIET. Themed now: the theme's lav ground with
 its ind ink, instead of the fixed #EEF5FD and #3A34D6 (#1F5FA8 in Settings) the React Native
 pieces paint. On Midnight the ground is lav2 (KTheme.lavUnderInd): ind on Midnight's lav is
 4.38:1, under the 4.5 the 14pt words need, and on lav2 it is 5.09:1.

 Two looks (Style):
 - bar: full width, square, as the Kindreds banner lies across the list: 16 in from each side,
   11 above and below;
 - panel: a rounded block (corners of 16, padding 14 16), as Settings sets it among its groups.
 Inside, left to right: an optional glyph (the bell, 16 across at stroke 2), the words (system
 400 14/19, two lines at most), and under them, if given, an action line (mono 600 11 at .1em:
 "TURN ON IN SETTINGS ›"); the whole of that is one button (onTap). Then, if a closeLabel is
 given, the × (14 across at stroke 2.2), its own button with that label for VoiceOver.

 Every word comes from the caller, already translated.
 */
public struct KNoticeBar: View {
  /// the two looks a notice takes
  public enum Style: Sendable {
    /// full width and square: the Kindreds banner
    case bar
    /// a rounded block: the Settings panel
    case panel
  }

  private let theme: KTheme
  private let text: String
  private let actionLabel: String?
  private let closeLabel: String?
  private let glyph: KLineGlyph?
  private let style: Style
  private let onTap: () -> Void
  private let onClose: () -> Void

  /// - Parameters:
  ///   - text: the notice, two lines at most
  ///   - actionLabel: a mono line under it saying what a tap does; nil for none
  ///   - closeLabel: what VoiceOver calls the ×; nil leaves the × out
  ///   - glyph: the mark before the words; the bell by default, nil for none
  ///   - style: .bar (the default) or .panel
  ///   - onTap: the notice was tapped
  ///   - onClose: the × was tapped
  public init(
    theme: KTheme,
    text: String,
    actionLabel: String? = nil,
    closeLabel: String? = nil,
    glyph: KLineGlyph? = .bell,
    style: Style = .bar,
    onTap: @escaping () -> Void,
    onClose: @escaping () -> Void = {}
  ) {
    self.theme = theme
    self.text = text
    self.actionLabel = actionLabel
    self.closeLabel = closeLabel
    self.glyph = glyph
    self.style = style
    self.onTap = onTap
    self.onClose = onClose
  }

  public var body: some View {
    let side: CGFloat = 16
    let vertical: CGFloat = style == .bar ? 11 : 14
    HStack(alignment: .center, spacing: 0) {
      SwiftUI.Button(action: onTap) {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
          if let glyph {
            KLineIcon(glyph, size: 16, lineWidth: 2, color: theme.ind)
              // centred on the first line
              .alignmentGuide(.firstTextBaseline) { $0[VerticalAlignment.center] + 4 }
          }
          VStack(alignment: .leading, spacing: 6) {
            Text(text)
              .kText(.notice)
              .foregroundStyle(theme.ind)
              .lineLimit(2)
              .fixedSize(horizontal: false, vertical: true)
            if let actionLabel {
              Text(actionLabel)
                .textCase(.uppercase)
                .kText(.monoAction)
                .foregroundStyle(theme.ind)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            }
          }
          .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.leading, side)
        .padding(.trailing, closeLabel == nil ? side : 4)
        .padding(.vertical, vertical)
        .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
      .accessibilityElement(children: .combine)
      .accessibilityAddTraits(.isButton)

      if let closeLabel {
        SwiftUI.Button(action: onClose) {
          KLineIcon(.close, size: 14, lineWidth: 2.2, color: theme.ind)
            .padding(.horizontal, side)
            .padding(.vertical, vertical)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        .accessibilityLabel(closeLabel)
      }
    }
    .background {
      if style == .panel {
        RoundedRectangle(cornerRadius: 16, style: .circular).fill(theme.lavUnderInd)
      } else {
        Rectangle().fill(theme.lavUnderInd)
      }
    }
  }
}

extension KTheme {
  /// The pale ground ind words sit on (a notice, a group chip that is on): lav, or lav2 on
  /// Midnight. The cause is the token pair: Midnight's ind on its lav is 4.38:1 (Classic's is
  /// 6.24:1), under the 4.5 body text needs, and on lav2, the darker of its two lavs, 5.09:1.
  /// Retire this if themes.json darkens Midnight's lav.
  var lavUnderInd: Color { isDark ? lav2 : lav }
}

/// A plain press: the label fades to .6 while the finger is down (React Native's Pressable
/// opacity, which the notices and list rows use).
public struct KFadePressStyle: ButtonStyle {
  public init() {}

  public func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .opacity(configuration.isPressed ? 0.6 : 1)
      .animation(KMotion.press, value: configuration.isPressed)
  }
}
