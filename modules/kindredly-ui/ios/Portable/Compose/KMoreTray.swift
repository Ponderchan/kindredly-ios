// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE + TRAY (ComposeTray.tsx MoreTray, drawn the 10a way): where the keyboard was, 296 above the
 home indicator, on soft with a 1pt line along its top. Two cells, 10 apart from 18 in and 22
 down: ASK A QUESTION (a question under the letter, where a reply begins) and VOICE LETTER.
 A cell is a 62 square with corners of 16 — sf with a 1pt line edge, or ink when it is on, the
 drawing in the page colour then — over its label in mono 600 9 at .1em in sub. The voice cell
 is First Class: for anyone else its microphone is drawn at .45 with a small ind padlock badge
 (18, bg lock) at its corner, and a tap goes to the paywall (TS decides). The ASK cell is off
 while speaking (a recording carries no question, and the question field is drawn only under a
 written letter): its drawing and label at .45, not pressable, and VoiceOver says why (dimmed,
 "Only with a written letter"), so a tap never lights a cell for a field that isn't there.

 The two drawings are ComposeTray's own: a question mark drawn in one stroke with its dot, and a
 microphone on a stand, 1.7-1.8 strokes with round caps on the 24 grid, 26 across.
 */
struct KMoreTray: View {
  let theme: KTheme
  let askLabel: String
  let voiceLabel: String
  /// VoiceOver's value on the locked voice cell ("First Class only")
  let voiceLockedLabel: String
  /// VoiceOver's value on the ASK cell while it is off ("Only with a written letter")
  let askDisabledLabel: String
  let askOn: Bool
  /// the ASK cell is off (speaking)
  let askDisabled: Bool
  let voiceOn: Bool
  let voiceLocked: Bool
  let onAsk: () -> Void
  let onVoice: () -> Void

  var body: some View {
    HStack(alignment: .top, spacing: 10) {
      cell(label: askLabel, on: askOn, locked: false, disabled: askDisabled, value: askDisabled ? askDisabledLabel : "", glyph: .question, action: onAsk)
      cell(label: voiceLabel, on: voiceOn, locked: voiceLocked, disabled: false, value: voiceLocked ? voiceLockedLabel : "", glyph: .mic, action: onVoice)
      Spacer(minLength: 0)
    }
    .padding(.horizontal, 18)
    .padding(.top, 22)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .background(theme.soft)
    .overlay(alignment: .top) {
      Rectangle().fill(theme.line).frame(height: 1)
    }
  }

  private func cell(label: String, on: Bool, locked: Bool, disabled: Bool, value: String, glyph: KMoreGlyph.Kind, action: @escaping () -> Void) -> some View {
    SwiftUI.Button(action: action) {
      VStack(spacing: 8) {
        ZStack {
          RoundedRectangle(cornerRadius: 16, style: .circular)
            .fill(on ? theme.ink : theme.sf)
          RoundedRectangle(cornerRadius: 16, style: .circular)
            .strokeBorder(on ? theme.ink : theme.line, lineWidth: 1)
          KMoreGlyph(kind: glyph)
            .stroke(on ? theme.bg : theme.ink, style: StrokeStyle(lineWidth: glyph == .question ? 1.8 * 26 / 24 : 1.7 * 26 / 24, lineCap: .round, lineJoin: .round))
            .overlay {
              if glyph == .question {
                // the question mark's dot, filled
                KMoreGlyph(kind: .questionDot).fill(on ? theme.bg : theme.ink)
              }
            }
            .frame(width: 26, height: 26)
            .opacity(locked || disabled ? 0.45 : 1)
        }
        .frame(width: 62, height: 62)
        .overlay(alignment: .bottomTrailing) {
          if locked {
            ZStack {
              Circle().fill(theme.ind)
              KLineIcon(.lock, size: 10, lineWidth: 2.2, color: theme.bg)
            }
            .frame(width: 18, height: 18)
            .offset(x: 5, y: 5)
          }
        }
        Text(label)
          .kText(.mono(9, .semibold, tracking: 0.1))
          .foregroundStyle(theme.sub)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
          .opacity(disabled ? 0.45 : 1)
      }
      .frame(width: 82)
      .contentShape(Rectangle())
    }
    .buttonStyle(KFloatPressStyle())
    .disabled(disabled)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(label)
    .accessibilityValue(value)
    .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
  }
}

/// The + tray's two drawings, on the 24 grid (ComposeTray QuestionGlyph, MicGlyph).
struct KMoreGlyph: Shape {
  enum Kind {
    case question
    case questionDot
    case mic
  }

  let kind: Kind

  func path(in rect: CGRect) -> Path {
    let s = min(rect.width, rect.height) / 24
    let place = CGAffineTransform(a: s, b: 0, c: 0, d: s, tx: rect.midX - 12 * s, ty: rect.midY - 12 * s)
    switch kind {
    case .question:
      return KSVGPath.path("M8.6 9.2a3.4 3.4 0 1 1 5.2 2.9c-1.2.8-1.8 1.5-1.8 2.9").applying(place)
    case .questionDot:
      return Path(ellipseIn: CGRect(x: 12 - 1.25, y: 18.6 - 1.25, width: 2.5, height: 2.5)).applying(place)
    case .mic:
      var p = Path(roundedRect: CGRect(x: 9, y: 3.5, width: 6, height: 10.5), cornerRadius: 3)
      p.addPath(KSVGPath.path("M6 11.5a6 6 0 0 0 12 0M12 17.5v3M9 20.5h6"))
      return p.applying(place)
    }
  }
}
