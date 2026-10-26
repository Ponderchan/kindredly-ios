// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 WRITE TO US, IN SWIFT (owner, 2026-10-27: "make Me all Swift"), under Settings in the Me tab's
 stack (/me/write-to-us). The React Native page (src/app/(tabs)/me/write-to-us.tsx) stays as the
 "writetous" switch's fallback. The contact form refusing to be a contact form: you write, and
 the same bird carries it. Every word, whether it may go, the sending and the outcome are TS's;
 this draws the page and reports the edits and the taps.

   ‹               Write to us                      the sticky secondary bar
   (Wren) Her opener, in the Letter font's italic   13.5/20 in sub, her listening snapshot at 24
   Dear Kindredly…                                  the letter: the reader's Letter font 17/25,
   ─────────────────────────────────────────────    growing to eleven lines, a 1pt line under it
   YOUR ADDRESS (OPTIONAL)                          mono 10 in mute
   you@example.com                                  system 16, the email keyboard, a 1pt line
   ─────────────────────────────────────────────
   No address, no answer.                           12/18 in mute
   It didn't go. Try again in a moment.             (after a failed send) 14/500 in the theme's red
   [        WREN, TAKE THIS        ]                the one filled key: ind, the page colour on it,
   KINDREDLY 1.0.5 · 1.3.0 (29) travels with it     mono 11; at .4 until there are two letters
                                                    of it; "…" while it goes
 SENT: her delighted snapshot at 64, "Taken.", her line (with or without an address), and Done, in
 the middle of the page.

 THE FIELDS are KField (Kit/KField.swift) on the adapter's two controllers. Send drops the
 keyboard first, and the form stays mounted (hidden) under the sent page, so a focused field is
 never taken off screen (the focus/unmount crash).
 */

public struct KWriteToUsContent: Equatable, Sendable {
  public var title = ""
  public var backLabel = ""
  public var intro = ""
  /// her listening snapshot beside the opener
  public var bird: KImageRef?
  public var placeholder = ""
  public var addrLabel = ""
  public var addrPlaceholder = ""
  public var addrHint = ""
  /// the failed send's line; "" for none
  public var fail = ""
  /// the send key's words
  public var send = ""
  /// the version line under the key
  public var travelsWith = ""
  /// two letters or more, and nothing on its way
  public var canSend = false
  /// on its way: the key says "…" and takes no tap
  public var sending = false
  /// it went: the sent page
  public var sent = false
  public var sentTitle = ""
  public var sentBody = ""
  public var done = ""
  /// her delighted snapshot over the sent page
  public var sentBird: KImageRef?

  public init() {}
}

public final class KWriteToUsActions {
  public var onBack: () -> Void = {}
  /// the letter's every edit
  public var onBodyChange: (String) -> Void = { _ in }
  /// the address's every edit
  public var onEmailChange: (String) -> Void = { _ in }
  public var onSend: () -> Void = {}
  /// Done on the sent page
  public var onDone: () -> Void = {}

  public init() {}
}

public struct KWriteToUsScreen: View {
  private let theme: KTheme
  private let content: KWriteToUsContent
  private let letter: KFieldController
  private let email: KFieldController
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let actions: KWriteToUsActions

  public init(theme: KTheme, content: KWriteToUsContent, letter: KFieldController, email: KFieldController, topInset: CGFloat, bottomInset: CGFloat, actions: KWriteToUsActions) {
    self.theme = theme
    self.content = content
    self.letter = letter
    self.email = email
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
  }

  public var body: some View {
    ZStack {
      form
        .opacity(content.sent ? 0 : 1)
        .allowsHitTesting(!content.sent)
        .accessibilityHidden(content.sent)
      if content.sent {
        sentPage
      }
    }
    .background { theme.bg.ignoresSafeArea() }
  }

  // MARK: the form

  private var form: some View {
    VStack(spacing: 0) {
      Color.clear.frame(height: topInset)
      KBackBar(theme: theme, title: content.title, backLabel: content.backLabel, height: KBackBar<EmptyView>.stickyHeight, sticky: true, onBack: { actions.onBack() })
      ScrollView(.vertical) {
        VStack(alignment: .leading, spacing: 0) {
          HStack(alignment: .center, spacing: 10) {
            KImage(content.bird, size: CGSize(width: 24, height: 24), contentMode: .fit, placeholder: .clear)
              .accessibilityHidden(true)
            Text(content.intro)
              .kText(.content(13.5, italic: true, lineHeight: 20.0 / 13.5))
              .foregroundStyle(theme.sub)
              .fixedSize(horizontal: false, vertical: true)
              .frame(maxWidth: .infinity, alignment: .leading)
          }
          .padding(.bottom, 16)

          // the letter: content, in the reader's Letter font
          KField(
            theme: theme,
            controller: letter,
            placeholder: content.placeholder,
            style: .content(17, lineHeight: 25.0 / 17.0),
            axis: .vertical,
            lines: 1...11,
            returnSends: false,
            onChange: { actions.onBodyChange($0) }
          )
          .padding(.vertical, 10)
          .frame(maxWidth: .infinity, alignment: .leading)
          .overlay(alignment: .bottom) { theme.line.frame(height: 1) }

          Text(content.addrLabel)
            .kText(.mono(10, .medium, tracking: 0.12))
            .foregroundStyle(theme.mute)
            .padding(.top, 26)
            .accessibilityHidden(true)
          KField(
            theme: theme,
            controller: email,
            placeholder: content.addrPlaceholder,
            style: .system(16),
            axis: .horizontal,
            lines: nil,
            returnSends: false,
            autocapitalize: false,
            autocorrect: false,
            accessibilityLabel: content.addrLabel,
            onChange: { actions.onEmailChange($0) }
          )
          .keyboardType(.emailAddress)
          .textContentType(.emailAddress)
          .padding(.vertical, 10)
          .frame(maxWidth: .infinity, alignment: .leading)
          .overlay(alignment: .bottom) { theme.line.frame(height: 1) }
          .padding(.top, 6)
          Text(content.addrHint)
            .kText(.system(12, lineHeight: 18.0 / 12.0))
            .foregroundStyle(theme.mute)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.top, 8)

          if !content.fail.isEmpty {
            Text(content.fail)
              .kText(.system(14, .medium, lineHeight: 20.0 / 14.0))
              .foregroundStyle(theme.danger)
              .fixedSize(horizontal: false, vertical: true)
              .padding(.top, 16)
          }

          sendKey
            .padding(.top, 26)

          Text(content.travelsWith)
            .kText(.mono(9, .medium, tracking: 1.0 / 9))
            .foregroundStyle(theme.mute)
            .multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity)
            .padding(.top, 14)
        }
        .padding(.horizontal, 22)
        .padding(.top, 8)
      }
      .scrollIndicators(.hidden)
      .scrollDismissesKeyboard(.interactively)
      .contentMargins(.bottom, bottomInset, for: .scrollContent)
    }
  }

  private var sendKey: some View {
    let live = content.canSend && !content.sending
    return SwiftUI.Button {
      // the keyboard goes first: a field is never taken off screen while it has it
      letter.blur()
      email.blur()
      actions.onSend()
    } label: {
      Text(content.sending ? "…" : content.send)
        .kText(.mono(11, .semibold, tracking: 1.8 / 11))
        .foregroundStyle(theme.bg)
        .multilineTextAlignment(.center)
        .padding(.horizontal, 16)
        .padding(.vertical, 15)
        .frame(maxWidth: .infinity, minHeight: 48)
        .background(Rectangle().fill(theme.ind))
        .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .disabled(!live)
    .opacity(content.canSend ? 1 : 0.4)
    .accessibilityLabel(content.send)
  }

  // MARK: sent

  private var sentPage: some View {
    VStack(spacing: 0) {
      KImage(content.sentBird, size: CGSize(width: 64, height: 64), contentMode: .fit, placeholder: .clear)
        .accessibilityHidden(true)
      Text(content.sentTitle)
        .kText(.system(24, .semibold))
        .foregroundStyle(theme.ink)
        .multilineTextAlignment(.center)
        .padding(.top, 18)
        .accessibilityAddTraits(.isHeader)
      Text(content.sentBody)
        .kText(.content(15, italic: true, lineHeight: 23.0 / 15.0))
        .foregroundStyle(theme.sub)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 12)
      SwiftUI.Button {
        actions.onDone()
      } label: {
        Text(content.done)
          .kText(.system(16, .semibold))
          .foregroundStyle(theme.bg)
          .padding(.vertical, 15)
          .frame(maxWidth: .infinity, minHeight: 48)
          .background(Rectangle().fill(theme.ind))
          .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
      .padding(.top, 30)
    }
    .padding(.horizontal, 34)
    .padding(.top, topInset)
    .padding(.bottom, bottomInset)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}
