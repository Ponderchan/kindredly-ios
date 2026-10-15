// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE ORBIT CHIP, first in the row under the Kindreds band (H:62, H:461): icon only, it opens
 and folds the orbit.

 - The icon: the orbit drawing on the 24 grid (KLineGlyph.orbit: ellipses rx 9 / ry 6.5 and rx 5
   / ry 3.6, a 2.4 centre cell) drawn 18 across at stroke 1.6, with the mock's margin 0 -4, so the
   chip's padding is 9 / 12 inside its 1.5 border.
 - On (open): an ink fill and border, the icon in the page colour. Off: sf, an ink icon, a line
   border. The same height as the group chips beside it, whatever the text size: a hidden line
   of the chips' type sets it.
 - VoiceOver: a toggle button named by TS (kd.orbit, "Orbit"), on while the orbit is open, with
   the legend as its hint (the orbit drawing itself is hidden from VoiceOver, so its meaning
   travels here).
 */
public struct KOrbitChip: View {
  private let theme: KTheme
  private let isOn: Bool
  private let a11yLabel: String
  private let a11yHint: String
  private let action: () -> Void

  /// - Parameters:
  ///   - isOn: the orbit is open
  ///   - a11yLabel: VoiceOver's name for it
  ///   - a11yHint: what VoiceOver adds after it (the legend's two lines)
  public init(theme: KTheme, isOn: Bool, a11yLabel: String, a11yHint: String = "", action: @escaping () -> Void) {
    self.theme = theme
    self.isOn = isOn
    self.a11yLabel = a11yLabel
    self.a11yHint = a11yHint
    self.action = action
  }

  public var body: some View {
    SwiftUI.Button(action: action) {
      ZStack {
        // a line of the chips' type, so this chip is exactly as tall as theirs at any size
        Text(verbatim: " ")
          .kText(KFilterChip.label)
          .hidden()
          .frame(width: 0)
        KLineIcon(.orbit, size: 18, lineWidth: 1.6, color: isOn ? theme.bg : theme.ink)
      }
      .padding(.vertical, KFilterChip.padV)
      .padding(.horizontal, KFilterChip.padH - 4)
      .background(Capsule().fill(isOn ? theme.ink : theme.sf))
      .overlay(Capsule().strokeBorder(isOn ? theme.ink : theme.line, lineWidth: KFilterChip.border))
      .contentShape(Capsule())
    }
    .buttonStyle(KFadePressStyle())
    .animation(.easeInOut(duration: 0.25), value: isOn)
    .accessibilityLabel(a11yLabel)
    .accessibilityHint(a11yHint)
    // a toggle with the selected trait: VoiceOver says on / off
    .accessibilityAddTraits(isOn ? [.isToggle, .isSelected] : .isToggle)
  }
}
