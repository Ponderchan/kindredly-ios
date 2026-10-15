// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE DESK STRIP (owner 2026-09-20; 10a dress from spec-today "Desk strip"): while a post of
 Wren's is unopened, one line under the plate, in her voice, that goes to her desk. A sticker on
 the page: sf, a 2pt ln outline, corners of 18, a hard 3/3 shadow, padding 10 12 inside the
 outline, 10 between its parts; her bird at 22 (a React Native island: the official look, the
 sticker skin, delight), the line in system 13 in ink on one line, a › in faint. 16 in from the
 edges and 4 under the plate. Pressed, it goes down onto its shadow. It scrolls with the cards
 (it never takes height from them) and stays on a quiet day.

 TS decides whether it shows (the line is "" otherwise) and words it (wo.strip.one / many).
 */
struct KDeskStrip: View {
  static let bird: CGFloat = 22

  let theme: KTheme
  let text: String
  let bird: AnyView?
  let onTap: () -> Void

  var body: some View {
    SwiftUI.Button(action: onTap) {
      HStack(alignment: .center, spacing: 10) {
        Group {
          if let bird {
            bird
          } else {
            Color.clear
          }
        }
        .frame(width: Self.bird, height: Self.bird)
        .accessibilityHidden(true)
        Text(text)
          .kText(.system(13))
          .foregroundStyle(theme.ink)
          .lineLimit(1)
          .frame(maxWidth: .infinity, alignment: .leading)
        KLineIcon(.chevronRight, size: 18, lineWidth: 1.9, color: theme.faint)
      }
      // padding 10 12 inside the 2pt outline
      .padding(.vertical, 10 + 2)
      .padding(.horizontal, 12 + 2)
    }
    .buttonStyle(KStickerButtonStyle(
      shape: RoundedRectangle(cornerRadius: 18, style: .circular),
      fill: theme.sf,
      stroke: theme.ln,
      lineWidth: 2,
      shadow: theme.ln,
      shadowOffset: 3
    ))
    .accessibilityLabel(text)
    .padding(.horizontal, KTodayGeometry.gutter)
    .padding(.top, 4)
    .dynamicTypeSize(...DynamicTypeSize.accessibility2)
  }
}
