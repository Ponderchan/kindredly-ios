// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE DAILY CAP: the free writer's letters for today are spent. Drawn as the App Store page drew
 it (owner, 2026-10-18; compose.tsx): a plain box on the page, a 1pt ink edge with square
 corners, padding 16; the line ("That's your 5 letters for today.") in system 600 15 in ink, why
 replies stay free in system 13 in sub, 5 under it, and the link to First Class in SF Mono 500
 11.5 at 1 in ind, 10 under that (paywall?src=daily_cap). Every colour is the theme's, so it
 follows the four themes.

 It shows the moment the count reads none left (owner question 6's default), not only after a
 letter has flown and bounced back. Every word is the caller's.
 */
struct KCapPanel: View {
  let theme: KTheme
  let text: String
  let sub: String
  let link: String
  let onLink: () -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      Text(text)
        .kText(.system(15, .semibold))
        .foregroundStyle(theme.ink)
        .fixedSize(horizontal: false, vertical: true)
      Text(sub)
        .kText(.system(13))
        .foregroundStyle(theme.sub)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 5)
      SwiftUI.Button(action: onLink) {
        Text(link)
          .composeText(.capLink)
          .foregroundStyle(theme.ind)
          .frame(minHeight: 32, alignment: .leading)
          .contentShape(Rectangle())
      }
      .buttonStyle(KFloatPressStyle())
      .accessibilityAddTraits(.isLink)
      .padding(.top, 10)
    }
    // padding 16 inside the 1pt edge, which React Native adds to the box
    .padding(16 + 1)
    .frame(maxWidth: .infinity, alignment: .leading)
    .overlay {
      Rectangle().strokeBorder(theme.ink, lineWidth: 1)
    }
    .accessibilityElement(children: .contain)
  }
}
