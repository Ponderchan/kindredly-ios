// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE COMPOSE TOOLBAR (H:136, P:94), riding the keyboard's top, 18 from the sides, 10 apart:

 - the + (KRoundTool: a 40 circle, 1.5 ln): the question and the voice letter live behind it. It
   turns 45° into an × in ind while its tray is open, and wears an ind dot ringed in bg when
   something rides with the letter (a question, the voice);
 - the stamp: while none is chosen, a 40 square with a 1.5 dashed ln edge and corners of 10,
   holding the face in its own small square (H:136's 18, corners of 3); while the stamp tray is
   open the face comes apart and a pencil lies across the square (ComposeTray's StampKeyGlyph,
   owner 2026-09-20: the eyes fly up and out, the smile drops, the pencil arrives, .36s). Once a
   stamp is chosen, its pill instead: 40 tall, corners of 20, a 1.5 rule in the stamp's colour on
   its wash, "#name" in mono 600 11 in its channel ink, at most 148 wide, shrinking to .68 before
   it would cut the word;
 - on the right, the key: its label in mono 600 11 at .14em, mute until the letter can go and
   ind when it can (or when it wants a stamp), SEND where the label doesn't fit beside the pill
   (the old rule measured a 170pt key; here the toolbar simply tries the long word first). When
   neither fits on one line (PICK A MOOD STAMP and SENDING… have no short word: SCEGLI UN
   FRANCOBOLLO DELL'UMORE at the default size on an SE, CHOISIS UN TIMBRE D'HUMEUR at XL, the
   English at xxxLarge), the last choice takes the width it is offered: two lines, right-aligned,
   shrinking to .75 before it would cut a word, so the + and the stamp key never leave the
   gutter (a label with a fixed width overflowed the row, which then centred, pushing the + off
   the left edge). While
   the words are still short, a thin line under the label fills toward the floor in ind on a
   line-coloured track, with no digits (owner question 5's default). PICK A MOOD STAMP brings a
   chevron that leans toward the stamp key, again and again (-4 over .52s, back over .52s, a
   .26s rest), still under Reduce Motion.

 Each key takes the keyboard away before it acts (a tray takes the keyboard's place; the key
 sends, or opens the stamps). Only the key watches the driver: a keystroke redraws it and
 nothing else here.
 */
struct KComposeToolbar: View {
  let theme: KTheme
  let content: KComposeContent
  let driver: KComposeDriver
  let actions: KComposeActions

  var body: some View {
    // 44pt targets around 40pt marks: 6 between targets is the mock's 10 between marks
    HStack(spacing: 6) {
      KRoundTool(
        theme: theme,
        glyph: .plus(open: content.tray == .more),
        accessibilityLabel: content.tray == .more ? content.strings.closeLabel : content.strings.plusLabel,
        dot: content.plusDot
      ) {
        driver.blurAll()
        actions.onTray(.more)
      }

      if let stamp = content.stamp {
        KComposeStampPill(stamp: stamp) {
          driver.blurAll()
          actions.onTray(.stamps)
        }
      } else {
        KComposeStampKey(theme: theme, open: content.tray == .stamps, accessibilityLabel: content.strings.stampLabel) {
          driver.blurAll()
          actions.onTray(.stamps)
        }
      }

      Spacer(minLength: 8)

      KComposeTravelKey(theme: theme, driver: driver) {
        driver.blurAll()
        actions.onKey(driver.body.text, driver.ask.text)
      }
    }
    .disabled(content.busy)
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
  }
}

/// The stamp key while no stamp is chosen: the dashed square and the face that turns to a pencil.
private struct KComposeStampKey: View {
  let theme: KTheme
  let open: Bool
  let accessibilityLabel: String
  let action: () -> Void

  var body: some View {
    SwiftUI.Button(action: action) {
      KStampKeyGlyph(open: open, ink: theme.ink, pencil: KBrand.waxGold)
        .frame(width: 24, height: 24)
        .frame(width: 40, height: 40)
        .overlay {
          RoundedRectangle(cornerRadius: 10, style: .circular)
            .strokeBorder(theme.ln, style: StrokeStyle(lineWidth: 1.5, dash: [3, 2.5]))
        }
        .frame(width: KRoundTool.target, height: KRoundTool.target)
        .contentShape(Rectangle())
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityLabel(accessibilityLabel)
    .accessibilityAddTraits(open ? .isSelected : [])
  }
}

/// The chosen stamp's pill.
private struct KComposeStampPill: View {
  static let maxWidth: CGFloat = 148
  let stamp: KComposeStamp
  let action: () -> Void

  var body: some View {
    SwiftUI.Button(action: action) {
      Text(stamp.name)
        .kText(.mono(11, .semibold, tracking: 0.02))
        .foregroundStyle(stamp.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.68)
        // the words' room inside the pill: it hugs a short name and stops a long one at 148
        .frame(maxWidth: Self.maxWidth - 24)
        .padding(.horizontal, 12)
        .frame(height: 40)
        .background(Capsule().fill(stamp.wash))
        .overlay(Capsule().strokeBorder(stamp.line, lineWidth: 1.5))
        .padding(.vertical, 2)
        .contentShape(Capsule())
    }
    .buttonStyle(KFloatPressStyle())
    // the pill keeps its width; the key takes what is left and says SEND if it must
    .layoutPriority(1)
    .accessibilityLabel(stamp.accessibilityLabel)
  }
}

/// The key on the right, watching the live state.
private struct KComposeTravelKey: View {
  let theme: KTheme
  @ObservedObject var driver: KComposeDriver
  let action: () -> Void

  var body: some View {
    let key = driver.live.key
    SwiftUI.Button(action: action) {
      HStack(spacing: 6) {
        if key.nudge {
          KComposeNudge(color: theme.ind)
        }
        ViewThatFits(in: .horizontal) {
          label(key.label, key: key, fits: true)
          if !key.narrowLabel.isEmpty {
            label(key.narrowLabel, key: key, fits: true)
          }
          // the last choice can always fit: it wraps and shrinks into the width it is offered
          label(key.narrowLabel.isEmpty ? key.label : key.narrowLabel, key: key, fits: false)
        }
      }
      .frame(minHeight: 44)
      .contentShape(Rectangle())
    }
    .buttonStyle(KAsIsButtonStyle())
    .disabled(!key.enabled)
    .accessibilityLabel(key.label)
    .animation(.easeOut(duration: 0.18), value: key.tone)
  }

  /// - fits: true for a one-line label at its own width (ViewThatFits takes it only where it
  ///   fits), false for the last choice, which takes the width it is offered (two lines, .75)
  @ViewBuilder private func label(_ text: String, key: KComposeKey, fits: Bool) -> some View {
    if fits {
      floorLine(
        Text(text)
          .kText(.mono(11, .semibold, tracking: 0.14))
          .foregroundStyle(key.tone == .ind ? theme.ind : theme.mute)
          .lineLimit(1)
          .fixedSize(),
        key: key
      )
    } else {
      floorLine(
        Text(text)
          .kText(.mono(11, .semibold, tracking: 0.14))
          .foregroundStyle(key.tone == .ind ? theme.ind : theme.mute)
          .lineLimit(2)
          .multilineTextAlignment(.trailing)
          .minimumScaleFactor(0.75)
          .fixedSize(horizontal: false, vertical: true),
        key: key
      )
    }
  }

  private func floorLine(_ label: some View, key: KComposeKey) -> some View {
    label
      // the floor, as a line under the label (no digits): ind filling a line-coloured track
      .overlay(alignment: .bottomLeading) {
        if key.progress >= 0 {
          GeometryReader { geo in
            ZStack(alignment: .leading) {
              Capsule().fill(theme.line)
              Capsule()
                .fill(theme.ind)
                .frame(width: geo.size.width * min(max(key.progress, 0), 1))
            }
          }
          .frame(height: 2)
          .offset(y: 6)
          .animation(.easeOut(duration: 0.2), value: key.progress)
          .accessibilityHidden(true)
        }
      }
  }
}

/// The chevron that leans toward the stamp key while the key says PICK A MOOD STAMP.
private struct KComposeNudge: View {
  let color: Color
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    let chevron = KLineIcon(.chevronLeft, size: 13, lineWidth: 2.6, color: color)
    if reduceMotion {
      chevron
    } else {
      chevron
        .keyframeAnimator(initialValue: 0.0, repeating: true) { view, x in
          view.offset(x: x)
        } keyframes: { _ in
          CubicKeyframe(-4, duration: 0.52)
          CubicKeyframe(0, duration: 0.52)
          LinearKeyframe(0, duration: 0.26)
        }
    }
  }
}

/*
 THE FACE COMES APART, AND A PENCIL ARRIVES (ComposeTray.tsx StampKeyGlyph, owner 2026-09-20),
 on the 24 grid: closed, a face (two eyes, a smile) in a small square; open, the eyes fly up and
 out and shrink, the smile drops, and in their place an ink dot (a stamp being drawn) and a
 short pencil across the square's corner. Closing runs it backwards. The pencil's body is the
 brand's wax gold (the amber of ComposeTray's pencil); everything else is the caller's ink.
 */
struct KStampKeyGlyph: View {
  let open: Bool
  let ink: Color
  let pencil: Color
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    GeometryReader { geo in
      let u = min(geo.size.width, geo.size.height) / 24
      ZStack {
        // the square, always (H:136's 18 with corners of 3, centred on the grid)
        RoundedRectangle(cornerRadius: 3 * u, style: .circular)
          .stroke(ink, lineWidth: 1.5)
          .frame(width: 18 * u, height: 18 * u)
        // the face, in three pieces
        KStampKeyPiece(d: "M8.3 10.4a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0")
          .fill(ink)
          .scaleEffect(open ? 0.4 : 1, anchor: UnitPoint(x: 9.4 / 24, y: 10.4 / 24))
          .offset(x: open ? -5 * u : 0, y: open ? -6 * u : 0)
          .opacity(open ? 0 : 1)
        KStampKeyPiece(d: "M13.5 10.4a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0")
          .fill(ink)
          .scaleEffect(open ? 0.4 : 1, anchor: UnitPoint(x: 14.6 / 24, y: 10.4 / 24))
          .offset(x: open ? 5 * u : 0, y: open ? -6 * u : 0)
          .opacity(open ? 0 : 1)
        KStampKeyPiece(d: "M8.9 14.1c1.1 1.6 5.1 1.6 6.2 0")
          .stroke(ink, style: StrokeStyle(lineWidth: 1.6 * u, lineCap: .round))
          .scaleEffect(open ? 0.6 : 1, anchor: UnitPoint(x: 0.5, y: 14.8 / 24))
          .offset(y: open ? 6 * u : 0)
          .opacity(open ? 0 : 1)
        // what takes its place: the dot of a stamp being drawn, and the pencil
        KStampKeyPiece(d: "M8.1 10.5a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0 -4.8 0")
          .fill(ink)
          .scaleEffect(open ? 1 : 0.3, anchor: UnitPoint(x: 10.5 / 24, y: 10.5 / 24))
          .opacity(open ? 1 : 0)
        ZStack {
          KStampKeyPiece(d: "M15.2 9h2.6a.6 .6 0 0 1 .6 .6v9.8a.6 .6 0 0 1 -.6 .6h-2.6a.6 .6 0 0 1 -.6 -.6V9.6a.6 .6 0 0 1 .6 -.6z")
            .fill(pencil)
          KStampKeyPiece(d: "M15.2 9h2.6a.6 .6 0 0 1 .6 .6v9.8a.6 .6 0 0 1 -.6 .6h-2.6a.6 .6 0 0 1 -.6 -.6V9.6a.6 .6 0 0 1 .6 -.6z")
            .stroke(ink, lineWidth: 1.3 * u)
          KStampKeyPiece(d: "M14.6 20l1.9 3 1.9-3z")
            .fill(ink)
        }
        .rotationEffect(.degrees(45), anchor: UnitPoint(x: 16.5 / 24, y: 16.5 / 24))
        .rotationEffect(.degrees(open ? 0 : 20), anchor: UnitPoint(x: 16.5 / 24, y: 16.5 / 24))
        .offset(x: open ? 0 : 6 * u, y: open ? 0 : 6 * u)
        .opacity(open ? 1 : 0)
      }
      .frame(width: geo.size.width, height: geo.size.height)
    }
    .animation(reduceMotion ? nil : (open ? .easeOut(duration: 0.36) : .easeInOut(duration: 0.36)), value: open)
    .accessibilityHidden(true)
  }
}

/// One piece of the stamp key's glyph: path data on the 24 grid, scaled into its frame.
private struct KStampKeyPiece: Shape {
  let d: String

  func path(in rect: CGRect) -> Path {
    let s = min(rect.width, rect.height) / 24
    let place = CGAffineTransform(a: s, b: 0, c: 0, d: s, tx: rect.midX - 12 * s, ty: rect.midY - 12 * s)
    return KSVGPath.path(d).applying(place)
  }
}
