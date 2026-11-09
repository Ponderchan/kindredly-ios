// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 WHERE THE MAGIC LINK LANDS, in SwiftUI (batch 3, 2026-11-09; the "authcallback" switch, off by
 default). A port of src/app/auth-callback.tsx's one screen: a single mono line (cb.line) in the
 middle of a wash, held for the few seconds the sign-in takes. The exchange, the refresh and the
 hand-over to the entry gate all stay in TS; this only draws.

 The same colours as the React Native page: the light themes keep the fixed lavender wash
 (P.penWash #ECECFE) with the line in P.ink60 (#111113 at 60%); Midnight paints its own page
 (tk.bg) with the line in tk.sub, so the hop back from Safari into a dark app doesn't flash
 lavender. Deliberately different: the line is SF Mono 500, the kit's lightest label weight
 (the React Native PFM.mono asks for 400, which the kit's two mono weights don't carry).
 */
public struct KAuthCallback: View {
  let theme: KTheme
  let dark: Bool
  let line: String

  public init(theme: KTheme, dark: Bool, line: String) {
    self.theme = theme
    self.dark = dark
    self.line = line
  }

  public var body: some View {
    ZStack {
      (dark ? theme.bg : Self.wash).ignoresSafeArea()
      Text(line)
        .kText(.mono(12, .medium, tracking: 1.4 / 12))
        .foregroundStyle(dark ? theme.sub : Self.ink60)
        .multilineTextAlignment(.center)
    }
  }

  /// P.penWash, the page's wash in every light theme
  static let wash = Color(hex: "#ECECFE")
  /// P.ink60: rgba(17,17,19,0.6)
  static let ink60 = Color(hex: "#111113").opacity(0.6)
}
