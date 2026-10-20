// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 SHE SAYS IT ONCE, IN THE PAGE (WrenSaysOnce.tsx, drawn by Swift): the reader's own Wren at 22 and
 one line in the reader's Letter font, italic where the face has one, 13.5/20 in sub. Not an
 overlay: nothing is covered and nothing must be dismissed to go on. A tap closes it.

 Whether it shows is decided in TS (useWrenOnce: once per account, then for the rest of the
 session until tapped, kept in a store so a remount or a renderer flip can't bring back a line
 already closed). This only draws it: it fades in over .42s when it appears and out over .2s
 when tapped, then reports the tap (no fades under Reduce Motion), as the React Native line does.

 The bird is a snapshot of her real art (bird-images.ts, pose "content"), a transparent PNG drawn
 on nothing; until it lands the line simply has an empty 22pt place beside it.

 The type is KTextStyle.content: Wren's lines are content and follow the reader's Letter font
 (upright in Garamond and SF Mono, which have no italic).
 */
public struct KWrenLine: View {
  static let bird: CGFloat = 22
  static let line = KTextStyle.content(13.5, italic: true, lineHeight: 20.0 / 13.5)

  private let theme: KTheme
  private let bird: KImageRef?
  private let line: String
  private let onTap: () -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var shown = false
  @State private var leaving = false

  /// - Parameters:
  ///   - bird: her snapshot; nil leaves the place empty
  ///   - line: what she says, her name already in it
  ///   - onTap: tapped (after the fade out)
  public init(theme: KTheme, bird: KImageRef?, line: String, onTap: @escaping () -> Void) {
    self.theme = theme
    self.bird = bird
    self.line = line
    self.onTap = onTap
  }

  public var body: some View {
    SwiftUI.Button(action: close) {
      HStack(alignment: .center, spacing: 10) {
        KImage(bird, size: CGSize(width: Self.bird, height: Self.bird), contentMode: .fit, placeholder: .clear)
        Text(line)
          .kText(Self.line)
          .foregroundStyle(theme.sub)
          .multilineTextAlignment(.leading)
          .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(.horizontal, KPersonRow.inset)
      .padding(.vertical, 11)
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .opacity(leaving ? 0 : (shown ? 1 : 0))
    .onAppear {
      guard !shown else { return }
      if reduceMotion {
        shown = true
      } else {
        withAnimation(.easeOut(duration: 0.42)) { shown = true }
      }
    }
  }

  private func close() {
    guard !leaving else { return }
    if reduceMotion {
      onTap()
      return
    }
    withAnimation(.easeIn(duration: 0.2)) { leaving = true }
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { onTap() }
  }
}
