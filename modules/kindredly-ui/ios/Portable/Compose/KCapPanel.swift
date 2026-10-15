// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE DAILY CAP (compose.tsx, drawn in First Class cream): the free writer's letters for today are
 spent. Cream paper with a 1.5 cream rule, corners of 16, padding 14: the line ("That's your 5
 letters for today.") in system 600 15, why replies stay free in system 13, and the gold link to
 First Class in mono 600 11 (paywall?src=daily_cap). Brand colours, the same in every theme (a
 First Class object, like KFirstClassCard), with the dark ink drawn on cream whatever the theme.

 It shows the moment the count reads none left (owner question 6's default), not only after a
 letter has flown and bounced back. Every word is the caller's.
 */
struct KCapPanel: View {
  let text: String
  let sub: String
  let link: String
  let onLink: () -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 5) {
      Text(text)
        .kText(.system(15, .semibold))
        .foregroundStyle(KBrand.inkOnBrand)
        .fixedSize(horizontal: false, vertical: true)
      Text(sub)
        .kText(.system(13, .regular, lineHeight: 1.35))
        .foregroundStyle(KBrand.subOnCream)
        .fixedSize(horizontal: false, vertical: true)
      SwiftUI.Button(action: onLink) {
        Text(link)
          .kText(.mono(11, .semibold, tracking: 0.1))
          .foregroundStyle(KBrand.goldText)
          .frame(minHeight: 32, alignment: .leading)
          .contentShape(Rectangle())
      }
      .buttonStyle(KFloatPressStyle())
      .padding(.top, 2)
    }
    .padding(14)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background {
      RoundedRectangle(cornerRadius: 16, style: .circular).fill(KBrand.cream)
    }
    .overlay {
      RoundedRectangle(cornerRadius: 16, style: .circular).strokeBorder(KBrand.creamBorder, lineWidth: 1.5)
    }
    .accessibilityElement(children: .contain)
  }
}
