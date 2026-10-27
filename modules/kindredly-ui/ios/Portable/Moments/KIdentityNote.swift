// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE ONE-TIME NOTE AFTER THE IDENTITY SWITCH, in SwiftUI (2026-10-27; behind the "identitynote"
 switch, off by default). The React Native sheet (src/screens/edit-profile/IdentityNote.tsx,
 IdentityNoteSheetRN) stays the fallback; who sees it, when, and every save are TS's. This draws
 the same sheet from the same note (edit-profile-model identityNote):

     WHAT STRANGERS SEE NOW                    the title, then the body
     ┌ YOU, TO A STRANGER ───────────────┐
     │ [frost]  Sunday Kite ♀ ♊          │    your window, the name a stranger's courier in your
     │          OCT.18                   │    language gives you, the glyphs as the switches stand
     └───────────────────────────────────┘
     ON YOUR LETTERS
     Show ♀ on your letters          (●)    the mark's switch (she / he only)
     Star sign on your letters       (●)
     Change either any time in Edit profile.
     [ DONE ]

 The switches are equal and controlled (SoftToggleRow, as Edit profile's): each shows the value TS
 holds and asks for the other; TS saves it as it moves and sends the answer back. Done is the only
 key, and the dim doesn't dismiss: Done is what saves both answers.

 It rises as React Native's does: the dim fades in over 160ms and the sheet slides up from the
 bottom over 260ms; with Reduce Motion both are simply there. The sheet takes its content's height,
 up to 92% of the screen, and scrolls past that (the large text sizes). Rule B: the sheet is a
 surface, not an object, so it has no ink rule along its top. VoiceOver: the dim is hidden, the
 sheet is modal, the title is a header, and the preview is one element (`previewA11y`).
 */

/// One switch of the note: its label, its note under it, and the value TS holds.
public struct KIdentityNoteSwitch: Equatable, Sendable {
  public var label: String
  public var note: String
  public var on: Bool

  public init(label: String, note: String, on: Bool) {
    self.label = label
    self.note = note
    self.on = on
  }
}

/// What the note shows: every word, the window and the glyphs are TS's.
public struct KIdentityNoteContent: Equatable {
  public var title: String
  public var body: String
  /// YOU, TO A STRANGER
  public var previewLabel: String
  /// the name a stranger's courier in your language gives you
  public var previewName: String
  /// VoiceOver: the preview as one sentence
  public var previewA11y: String
  /// today's postmark date, under the name
  public var when: String
  /// your own frosted window; nil draws the soft square
  public var frost: KFrostSpec?
  /// the glyphs beside the name, as the switches stand (TS decides)
  public var mark: KLineGlyph?
  public var sign: KLineGlyph?
  /// ON YOUR LETTERS
  public var header: String
  /// the mark's switch, for she / he only
  public var markSwitch: KIdentityNoteSwitch?
  public var signSwitch: KIdentityNoteSwitch
  public var foot: String
  public var done: String

  public init(
    title: String,
    body: String,
    previewLabel: String,
    previewName: String,
    previewA11y: String,
    when: String,
    frost: KFrostSpec?,
    mark: KLineGlyph?,
    sign: KLineGlyph?,
    header: String,
    markSwitch: KIdentityNoteSwitch?,
    signSwitch: KIdentityNoteSwitch,
    foot: String,
    done: String
  ) {
    self.title = title
    self.body = body
    self.previewLabel = previewLabel
    self.previewName = previewName
    self.previewA11y = previewA11y
    self.when = when
    self.frost = frost
    self.mark = mark
    self.sign = sign
    self.header = header
    self.markSwitch = markSwitch
    self.signSwitch = signSwitch
    self.foot = foot
    self.done = done
  }
}

/// What the note's controls do: each goes back to TS.
public struct KIdentityNoteActions {
  public var onMark: (Bool) -> Void
  public var onSign: (Bool) -> Void
  public var onDone: () -> Void

  public init(onMark: @escaping (Bool) -> Void, onSign: @escaping (Bool) -> Void, onDone: @escaping () -> Void) {
    self.onMark = onMark
    self.onSign = onSign
    self.onDone = onDone
  }
}

public struct KIdentityNote: View {
  private let theme: KTheme
  private let content: KIdentityNoteContent
  private let bottomInset: CGFloat
  private let actions: KIdentityNoteActions

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var dimIn = false
  @State private var sheetIn = false

  /// the 10a dim, as LeaveSheet's and SignUpSheet's: #1E1B35 at 30%
  private static let dim = Color(hex: "#1E1B35").opacity(0.3)
  /// the sheet's top corners (React Native's 24)
  private static let corner: CGFloat = 24

  /// - Parameters:
  ///   - bottomInset: the home indicator's inset (the Host ignores the safe area)
  public init(theme: KTheme, content: KIdentityNoteContent, bottomInset: CGFloat, actions: KIdentityNoteActions) {
    self.theme = theme
    self.content = content
    self.bottomInset = bottomInset
    self.actions = actions
  }

  public var body: some View {
    GeometryReader { g in
      ZStack(alignment: .bottom) {
        Self.dim
          .opacity(dimIn ? 1 : 0)
          .ignoresSafeArea()
          // the dim doesn't dismiss: Done is one tap, and it is what saves both answers
          .contentShape(Rectangle())
          .onTapGesture {}
          .accessibilityHidden(true)
        sheet(maxHeight: g.size.height * 0.92)
          .offset(y: sheetIn ? 0 : g.size.height)
      }
      .frame(width: g.size.width, height: g.size.height, alignment: .bottom)
    }
    .ignoresSafeArea()
    .onAppear {
      if reduceMotion {
        dimIn = true
        sheetIn = true
        return
      }
      withAnimation(.easeInOut(duration: 0.16)) { dimIn = true }
      withAnimation(.easeInOut(duration: 0.26)) { sheetIn = true }
    }
  }

  // MARK: the sheet

  private func sheet(maxHeight: CGFloat) -> some View {
    let shape = UnevenRoundedRectangle(topLeadingRadius: Self.corner, topTrailingRadius: Self.corner, style: .continuous)
    return ViewThatFits(in: .vertical) {
      column
      ScrollView(.vertical) {
        column
      }
      .scrollBounceBehavior(.basedOnSize)
    }
    .frame(maxWidth: .infinity)
    .frame(maxHeight: maxHeight)
    .background(shape.fill(theme.sf))
    .clipShape(shape)
    .accessibilityElement(children: .contain)
    .accessibilityAddTraits(.isModal)
  }

  private var column: some View {
    VStack(alignment: .leading, spacing: 14) {
      Text(content.title)
        .kText(.system(20, .bold))
        .foregroundStyle(theme.ink)
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityAddTraits(.isHeader)
      Text(content.body)
        .kText(.system(15, lineHeight: 21.0 / 15))
        .foregroundStyle(theme.sub)
        .fixedSize(horizontal: false, vertical: true)
      preview
      SoftGroupSection(theme: theme, header: content.header, headerInset: 4) {
        if let mark = content.markSwitch {
          SoftToggleRow(theme: theme, systemImage: nil, label: mark.label, subtitle: mark.note, isOn: mark.on) { on in
            actions.onMark(on)
          }
        }
        SoftToggleRow(theme: theme, systemImage: nil, label: content.signSwitch.label, subtitle: content.signSwitch.note, isOn: content.signSwitch.on, divider: false) { on in
          actions.onSign(on)
        }
      }
      Text(content.foot)
        .kText(.system(13, lineHeight: 18.0 / 13))
        .foregroundStyle(theme.mute)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: .infinity)
      doneKey
    }
    .padding(.horizontal, 20)
    .padding(.top, 22)
    .padding(.bottom, max(bottomInset, 12) + 8)
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  /// YOU, TO A STRANGER: the card header a stranger's desk shows for you
  private var preview: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(content.previewLabel)
        .kText(.mono(10, .semibold, tracking: 0.14))
        .foregroundStyle(theme.mute)
      HStack(alignment: .center, spacing: 10) {
        if let frost = content.frost {
          KFrost(theme: theme, spec: frost, size: 40)
        } else {
          RoundedRectangle(cornerRadius: 10, style: .circular)
            .fill(theme.soft2)
            .frame(width: 40, height: 40)
        }
        VStack(alignment: .leading, spacing: 1) {
          HStack(alignment: .firstTextBaseline, spacing: 0) {
            Text(content.previewName)
              .kText(.system(17, .semibold))
              .foregroundStyle(theme.ink)
              .lineLimit(1)
              .layoutPriority(1)
            KWhoMarks(mark: content.mark, sign: content.sign, size: 14, color: theme.sub)
          }
          Text(content.when)
            .kText(.mono(11, .medium, tracking: 0.08))
            .foregroundStyle(theme.sub)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
    }
    .padding(14)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(theme.soft))
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(content.previewA11y)
  }

  private var doneKey: some View {
    SwiftUI.Button(action: actions.onDone) {
      Text(content.done)
        .kText(.system(15, .semibold))
        .foregroundStyle(theme.bg)
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 15)
        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(theme.ink))
        .contentShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
    .buttonStyle(KMomentPressStyle(opacity: 0.85))
  }
}
