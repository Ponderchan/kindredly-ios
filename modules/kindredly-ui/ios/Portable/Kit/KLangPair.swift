// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE LANGUAGE PAIR — the owner's B1, back on the Today card (2026-10-16): "translate" said as
 two languages and an arrow. ES is what they wrote, EN is yours, and the LIT side (the ink
 segment with the page colour on it) is the one you are reading now; one tap turns it round.
 The smallest possible control, and the least like a machine-translation button: it names the
 two people's languages, not a service. The SwiftUI twin of components/LangPair.tsx, on the 10a
 sticker material: a 2pt ln outline on a true capsule, the two codes in mono 600 11 at .08em
 padded 6 11 inside the outline, the arrow in system 700 13 in ink between them (7 each side).
 Busy, the arrow is an ellipsis and the whole thing is drawn at .6 and takes no tap; pressed,
 it dims the same way. The lit side's move is a .25s crossfade, the same beat as the letter's
 text swapping under it (KCardText), and no motion under Reduce Motion.

 It is drawn at its own ~30pt height (the topic tag's) but its tap target is 44pt tall: the
 extra is a hit area that takes no layout room (padding in, then out, as the card's ⋯ does).

 VoiceOver: the label is the caller's words (read.invite / mm.original / mm.translating, already
 translated, the same the Today card's translate action carries), the value which side is
 showing. Inside the Today card, which VoiceOver reads as one element, the card's action is what
 is heard; the capsule's own label and value are for anywhere else it is drawn.

 The 10a TranslateCapsule look ("ES→EN  Read it in yours", KTranslateCapsule in KCapsules) stays
 in the kit for the reader; Today no longer draws it.
 */
public struct KLangPair: View {
  /// the mono of the two codes: 11 (MONO.title), tracked .08em (the React Native twin's .9px)
  static let codeStyle = KTextStyle.mono(11, .semibold, tracking: 0.08)
  /// the arrow between them: system 700 13
  static let arrowStyle = KTextStyle.system(13, .bold)
  /// each side of the ~30pt capsule, so the tap target is 44 (HIG); taken back outside the button
  static let hitPad: CGFloat = 7

  private let theme: KTheme
  private let from: String
  private let to: String
  private let on: Bool
  private let busy: Bool
  private let label: String
  private let value: String?
  private let action: () -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  /// - Parameters:
  ///   - from: the language they wrote in, as a code ("ES")
  ///   - to: yours ("EN")
  ///   - on: the letter is showing in yours: `to` is lit
  ///   - busy: a translation is on its way: dimmed, an ellipsis for the arrow, no tap
  ///   - label: VoiceOver's name, already translated (what a tap does now)
  ///   - value: VoiceOver's value, which side is showing; nil for none
  public init(theme: KTheme, from: String, to: String, on: Bool, busy: Bool = false, label: String, value: String? = nil, action: @escaping () -> Void) {
    self.theme = theme
    self.from = from
    self.to = to
    self.on = on
    self.busy = busy
    self.label = label
    self.value = value
    self.action = action
  }

  /// The pair a translate capsule's code names, as TS writes it (today-cards capsuleFor, the 10a
  /// kit's translateCode; today-cards langPair reads it the same way): "ES→EN" reads left to
  /// right with the original showing, "EN←ES" is the same pair turned round once the letter is
  /// in yours (`to` first). A code with neither arrow is one language and nothing to turn to.
  public static func pair(_ code: String) -> (from: String, to: String, on: Bool) {
    if let r = code.range(of: "←") {
      return (String(code[r.upperBound...]), String(code[..<r.lowerBound]), true)
    }
    if let r = code.range(of: "→") {
      return (String(code[..<r.lowerBound]), String(code[r.upperBound...]), false)
    }
    return (code, "", false)
  }

  public var body: some View {
    SwiftUI.Button(action: action) {
      capsule
        // the 44pt target: room above and below that the layout gets back below
        .padding(.vertical, Self.hitPad)
        .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .padding(.vertical, -Self.hitPad)
    .compositingGroup()
    .opacity(busy ? 0.6 : 1)
    .disabled(busy)
    .accessibilityLabel(label)
    .accessibilityValue(value ?? "")
  }

  private var capsule: some View {
    HStack(spacing: 0) {
      side(from, lit: !on, outerEdge: .leading)
      Text(busy ? "…" : "→")
        .kText(Self.arrowStyle)
        .foregroundStyle(theme.ink)
        .padding(.horizontal, 7)
      side(to, lit: on, outerEdge: .trailing)
    }
    .lineLimit(1)
    .fixedSize()
    // the lit fill runs under the outline, flush against it, as the twin's background does
    .clipShape(Capsule(style: .circular))
    .overlay(Capsule(style: .circular).strokeBorder(theme.ln, lineWidth: 2))
    .animation(reduceMotion ? nil : .easeInOut(duration: 0.25), value: on)
  }

  /// One side: the code, padded 6 11 inside the 2pt outline (so 13 at the outer edge), the ink
  /// fill with the page colour on it when it is the side you are reading.
  private func side(_ code: String, lit: Bool, outerEdge: HorizontalEdge) -> some View {
    Text(code)
      .kText(Self.codeStyle)
      .foregroundStyle(lit ? theme.bg : theme.ink)
      .padding(.leading, outerEdge == .leading ? 11 + 2 : 11)
      .padding(.trailing, outerEdge == .trailing ? 11 + 2 : 11)
      .padding(.vertical, 6 + 2)
      .background(theme.ink.opacity(lit ? 1 : 0))
  }
}
