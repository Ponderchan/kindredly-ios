// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE FIRST ARRIVAL (letters.tsx Arrival, in 10a materials): the last frame of her first crossing,
 continued. She lands (a React Native island at 34, her LAND keyframe inside it), her line comes
 in under her in the italic serif (13.5/20, sub), and the three envelopes she carried sit under
 the line and open one by one as the reader pages (sealed in ln, open in your hand in ind, read
 in mute; the paper sf; the flag ind, mute once read). Tapping one goes to its letter. It folds
 away (height, opacity, scaleY .35 over .38s) when the third is behind the reader or one of them
 is answered; TS decides (arrival.open, never on a desk with no letters: today-cards
 arrivalShows) and says every word.

 Not a counter: the desk never shows arithmetic, but three envelopes she physically brought back
 are an object, not a meter. It scrolls with the cards; it never takes height from them.

 THE ENTRANCE, as the old arrival played it (and TodayRN's still does): she lands (560ms after
 80, in the island), her line fades in (360ms after 320), then the envelopes come up one by one
 from 8pt below (320ms after 480 + i × 120), all ease-out. Under Reduce Motion everything is
 there at once.
 */
struct KArrival: View {
  static let bird: CGFloat = 34
  /// how far below its place an envelope starts
  static let envelopeRise: CGFloat = 8

  let theme: KTheme
  let arrival: KTodayArrival
  let bird: AnyView?
  let onEnvelope: (Int) -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /// the entrance has begun: the line and each envelope animate to their places, each on its delay
  @State private var entered = false

  var body: some View {
    HStack(alignment: .top, spacing: 12) {
      Group {
        if let bird {
          bird
        } else {
          Color.clear
        }
      }
      .frame(width: Self.bird, height: Self.bird)
      .padding(.top, 2)
      .accessibilityHidden(true)
      VStack(alignment: .leading, spacing: 9) {
        Text(arrival.line)
          .kText(.letter(13.5, italic: true, lineHeight: 20.0 / 13.5))
          .foregroundStyle(theme.sub)
          .fixedSize(horizontal: false, vertical: true)
          .opacity(entered || reduceMotion ? 1 : 0)
          .animation(reduceMotion ? nil : .easeOut(duration: 0.36).delay(0.32), value: entered)
        HStack(alignment: .bottom, spacing: 9) {
          ForEach(Array(arrival.states.enumerated()), id: \.offset) { i, state in
            let shown = entered || reduceMotion
            SwiftUI.Button {
              onEnvelope(i)
            } label: {
              KEnvelopeGlyph(theme: theme, state: state)
                .frame(width: 30, height: 28)
                .padding(8)
                .contentShape(Rectangle())
            }
            .buttonStyle(KFadePressStyle())
            .padding(-8)
            .opacity(shown ? 1 : 0)
            .offset(y: shown ? 0 : Self.envelopeRise)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.32).delay(0.48 + Double(i) * 0.12), value: entered)
            .accessibilityLabel(i < arrival.labels.count ? arrival.labels[i] : "")
            .accessibilityValue(i < arrival.values.count ? arrival.values[i] : "")
          }
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding(.horizontal, 22)
    .padding(.top, 12)
    .padding(.bottom, 10)
    .accessibilityElement(children: .contain)
    // the entrance plays once, as she lands (at once under Reduce Motion: the animations are nil)
    .onAppear { entered = true }
  }
}

/// The fold-away of the arrival: height (by the stack's own layout), opacity and scaleY .35, from the top.
struct KArrivalFold: ViewModifier {
  let shown: Bool

  func body(content: Content) -> some View {
    content
      .scaleEffect(x: 1, y: shown ? 1 : 0.35, anchor: .top)
      .opacity(shown ? 1 : 0)
  }
}

extension AnyTransition {
  /// The arrival folding away (and coming in, the same way reversed).
  static var kArrivalFold: AnyTransition {
    .modifier(active: KArrivalFold(shown: false), identity: KArrivalFold(shown: true))
  }
}

/*
 THE ENVELOPE from the route chart, at glyph size (letters.tsx Env), on its 30 × 28 box with the
 viewBox 0 -9 30 28: sealed (the flap down, a V), open in your hand (the flap folded back and the
 letter standing out of it — the sheet, not the raised flap alone, reads as opened), or read.
 */
struct KEnvelopeGlyph: View {
  let theme: KTheme
  let state: KEnvelopeState

  var body: some View {
    let stroke = state == .sealed ? theme.ln : state == .current ? theme.ind : theme.mute
    let flag = state == .opened ? theme.mute : theme.ind
    let paper = theme.sf
    let up = state != .sealed
    Canvas { context, size in
      // the 30 × 28 viewBox from y -9, fitted to the frame
      let s = min(size.width / 30, size.height / 28)
      context.translateBy(x: (size.width - 30 * s) / 2, y: (size.height - 28 * s) / 2 + 9 * s)
      context.scaleBy(x: s, y: s)
      let line = StrokeStyle(lineWidth: 1.3, lineCap: .butt, lineJoin: .round)
      if up {
        var flap = Path()
        flap.move(to: CGPoint(x: 3, y: 1))
        flap.addLine(to: CGPoint(x: 15, y: -6))
        flap.addLine(to: CGPoint(x: 27, y: 1))
        flap.closeSubpath()
        context.fill(flap, with: .color(paper))
        context.stroke(flap, with: .color(stroke), style: line)
        let sheet = Path(CGRect(x: 7.5, y: -5, width: 15, height: 8))
        context.fill(sheet, with: .color(paper))
        context.stroke(sheet, with: .color(stroke), style: line)
      }
      let body = Path(CGRect(x: 1, y: 1, width: 28, height: 17))
      context.fill(body, with: .color(paper))
      context.stroke(body, with: .color(stroke), style: line)
      if !up {
        var v = Path()
        v.move(to: CGPoint(x: 1, y: 1))
        v.addLine(to: CGPoint(x: 15, y: 11))
        v.addLine(to: CGPoint(x: 29, y: 1))
        context.stroke(v, with: .color(stroke), style: line)
      }
      context.fill(Path(CGRect(x: 22, y: 4, width: 4.5, height: 4)), with: .color(flag))
    }
    .accessibilityHidden(true)
  }
}
