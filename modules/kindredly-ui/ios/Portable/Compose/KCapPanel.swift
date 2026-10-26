// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE DAILY CAP: the free writer's letters for today are spent. A soft panel on the page (rule B,
 owner 2026-10-26: no ink edges on what isn't an object; it was a 1pt ink box with square
 corners, as the App Store page drew it): lav2, continuous corners of 16, padding 16; the line ("That's your 5 letters for today.") in system 600 15 in ink, why
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
    .padding(16)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(theme.lav2))
    .accessibilityElement(children: .contain)
  }
}
