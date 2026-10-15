// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE 10a SWITCH (H:99, H:101): a 44 × 26 track with corners of 13, ind when on and faint when
 off, and a 22 white knob 2 in from the left (off) or the right (on), both moving over .2s
 (transition: background .2s, left .2s). The knob is white in every theme, as drawn
 (KBrand.paperWhite).

     Toggle(label, isOn: $on).toggleStyle(KToggleStyle(theme: t))

 It stays a Toggle for VoiceOver: a switch with its label and its on/off value
 (accessibilityRepresentation), whatever it looks like. The label is laid out before the
 track as the system's is; hide it with .labelsHidden() where the row shows its own words.
 With Reduce Motion the knob jumps instead of sliding.
 */
public struct KToggleStyle: ToggleStyle {
  /// the track (H:99)
  public static let trackSize = CGSize(width: 44, height: 26)
  public static let knob: CGFloat = 22

  private let theme: KTheme

  public init(theme: KTheme) {
    self.theme = theme
  }

  public func makeBody(configuration: Configuration) -> some View {
    KToggleBody(theme: theme, configuration: configuration)
  }
}

private struct KToggleBody: View {
  let theme: KTheme
  let configuration: ToggleStyleConfiguration
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.isEnabled) private var isEnabled

  var body: some View {
    let on = configuration.isOn
    let size = KToggleStyle.trackSize
    // the knob's centre sits this far either side of the track's: 2 in from each end
    let travel = (size.width - KToggleStyle.knob) / 2 - 2
    HStack(spacing: 12) {
      configuration.label
      Capsule()
        .fill(on ? theme.ind : theme.faint)
        .frame(width: size.width, height: size.height)
        .overlay {
          Circle()
            .fill(KBrand.paperWhite)
            .frame(width: KToggleStyle.knob, height: KToggleStyle.knob)
            .offset(x: on ? travel : -travel)
        }
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.2), value: on)
        .opacity(isEnabled ? 1 : 0.5)
        .contentShape(Capsule())
        .onTapGesture {
          if isEnabled { configuration.isOn.toggle() }
        }
    }
    // VoiceOver hears the system switch: its label, its value, its double-tap
    .accessibilityRepresentation {
      Toggle(isOn: configuration.$isOn) { configuration.label }
    }
  }
}
