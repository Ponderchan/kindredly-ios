// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE ROWS ABOVE THE NOTES, which the mock doesn't draw and the owner kept (they span both columns
 in Grid):

 - Wren's first-visit line: her own bird (a snapshot of her real art, TS's 'content' pose) at 22
   and the line in Newsreader italic 15 in sub — her lines don't follow the Letter font. It fades
   in over .42s; a tap fades it out over .2s and reports it (no fades under Reduce Motion). Whether
   it shows is TS's (useWrenOnce, once per account, only once there are notes to show it over).
 - The evening question (owner decision 4): the note card's material (sf, a 1.5 ln outline,
   corners 22), her bird at 26, the question in the serif's italic, NO THANKS in mono 11 sub, YES
   as an ink pill with its words in the page colour, the foot in system 12 at 1.4, mute; dimmed to
   .6 and not tappable while an answer saves. Every Alert, permission ask and save is TS's.
 - Its off row, after a yes: her mini bird at 18 (the simplified mark WrenBird draws at 20 and
   below), "Wren's small question, every evening at 9." in system 13 sub, TURN OFF in mono 10 ind
   with a 44pt target. It is the evening line's only off switch (Settings has two switches), so the
   screen also draws it on the empty state.
 - The pull caption, MOMENTS YOU'VE CHOSEN TO KEEP, tucked above the first row under the header,
   fading in as the list is pulled down past the top (opacity 0 at −8, 1 at −40).
 */

/// Her first-visit line, in the page.
struct KNotesWrenLine: View {
  static let bird: CGFloat = 22
  static let line = KTextStyle.letter(15, italic: true, lineHeight: 21.0 / 15)

  let theme: KTheme
  let bird: KImageRef?
  let text: String
  let onTap: () -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var shown = false
  @State private var leaving = false

  var body: some View {
    SwiftUI.Button(action: close) {
      HStack(alignment: .center, spacing: 10) {
        KImage(bird, size: CGSize(width: Self.bird, height: Self.bird), contentMode: .fit, placeholder: .clear)
        Text(text)
          .kText(Self.line)
          .foregroundStyle(theme.sub)
          .multilineTextAlignment(.leading)
          .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(.horizontal, 4)
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

/// The evening question, asked once after the first real page.
struct KEveningAskCard: View {
  static let question = KTextStyle.letter(15, italic: true, lineHeight: 22.0 / 15)
  static let button = KTextStyle.mono(11, .semibold, tracking: 0.1)
  static let foot = KTextStyle.system(12, lineHeight: 1.4)

  let theme: KTheme
  let bird: KImageRef?
  let strings: KNotesStrings
  let busy: Bool
  let onYes: () -> Void
  let onNo: () -> Void

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: 22, style: .circular)
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .top, spacing: 10) {
        KImage(bird, size: CGSize(width: 26, height: 26), contentMode: .fit, placeholder: .clear)
          .accessibilityHidden(true)
        Text(strings.eveningAsk)
          .kText(Self.question)
          .foregroundStyle(theme.ink)
          .multilineTextAlignment(.leading)
          .fixedSize(horizontal: false, vertical: true)
          .frame(maxWidth: .infinity, alignment: .leading)
      }
      // a11y cm-10: side by side while both fit on one line each; stacked, right-aligned and
      // wrapping once they don't (Indonesian from XXXL, English at the AX sizes), so YES, AT 9
      // never loses the 9 it is agreeing to (KNewFacesNoteView's pattern)
      ViewThatFits(in: .horizontal) {
        HStack(spacing: 10) {
          noButton(oneLine: true)
          yesButton(oneLine: true)
        }
        VStack(alignment: .trailing, spacing: 8) {
          noButton(oneLine: false)
          yesButton(oneLine: false)
        }
      }
      .frame(maxWidth: .infinity, alignment: .trailing)
      .padding(.top, 4)
      Text(strings.eveningFoot)
        .kText(Self.foot)
        .foregroundStyle(theme.mute)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 2)
    }
    .padding(16)
    .background { shape.fill(theme.sf) }
    .overlay { shape.strokeBorder(theme.ln, lineWidth: 1.5) }
    .opacity(busy ? 0.6 : 1)
    .disabled(busy)
    .padding(.top, 4)
    .padding(.bottom, 2)
  }

  /// No thanks: one line beside the yes (so ViewThatFits can tell when the pair no longer fits),
  /// wrapping when stacked.
  private func noButton(oneLine: Bool) -> some View {
    SwiftUI.Button(action: onNo) {
      Text(strings.eveningNo)
        .kText(Self.button)
        .foregroundStyle(theme.sub)
        .multilineTextAlignment(.trailing)
        .lineLimit(oneLine ? 1 : nil)
        .fixedSize(horizontal: false, vertical: !oneLine)
        .padding(.horizontal, 14)
        .padding(.vertical, 9)
        .frame(minHeight: 44)
        .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
  }

  /// Yes, at 9: the ink pill, one line beside the no, wrapping when stacked.
  private func yesButton(oneLine: Bool) -> some View {
    SwiftUI.Button(action: onYes) {
      Text(strings.eveningYes)
        .kText(Self.button)
        .foregroundStyle(theme.bg)
        .multilineTextAlignment(.center)
        .lineLimit(oneLine ? 1 : nil)
        .fixedSize(horizontal: false, vertical: !oneLine)
        .padding(.horizontal, 16)
        .padding(.vertical, 9)
        .background(RoundedRectangle(cornerRadius: 18, style: .circular).fill(theme.ink))
        .frame(minHeight: 44)
        .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
  }
}

/// The slim off row after a yes: the evening line's only off switch.
struct KEveningOnRow: View {
  static let text = KTextStyle.system(13, lineHeight: 18.0 / 13)
  static let off = KTextStyle.mono(10, .semibold, tracking: 0.12)

  let theme: KTheme
  let bird: KImageRef?
  let strings: KNotesStrings
  let busy: Bool
  let onOff: () -> Void

  var body: some View {
    HStack(alignment: .center, spacing: 8) {
      KImage(bird, size: CGSize(width: 18, height: 18), contentMode: .fit, placeholder: .clear)
        .accessibilityHidden(true)
      Text(strings.eveningOn)
        .kText(Self.text)
        .foregroundStyle(theme.sub)
        .multilineTextAlignment(.leading)
        .frame(maxWidth: .infinity, alignment: .leading)
      SwiftUI.Button(action: onOff) {
        Text(strings.eveningOff)
          .kText(Self.off)
          .foregroundStyle(theme.ind)
          .lineLimit(1)
          .fixedSize()
          .padding(.vertical, 14)
          .padding(.horizontal, 8)
          .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
      .padding(.vertical, -14)
      .padding(.horizontal, -8)
      .disabled(busy)
      .opacity(busy ? 0.5 : 1)
    }
    .padding(.horizontal, 4)
    .padding(.vertical, 8)
  }
}

/// MOMENTS YOU'VE CHOSEN TO KEEP, revealed by a pull past the top.
struct KNotesPullCaption: View {
  static let style = KTextStyle.mono(11, .medium, tracking: 0.07)

  let theme: KTheme
  let text: String
  @ObservedObject var chrome: KScrollModel

  var body: some View {
    let y = chrome.offset
    Text(text)
      .kText(Self.style)
      .foregroundStyle(theme.mute)
      .lineLimit(1)
      .opacity(max(0, min(1, (-8 - y) / 32)))
      .allowsHitTesting(false)
      .accessibilityHidden(true)
  }
}
