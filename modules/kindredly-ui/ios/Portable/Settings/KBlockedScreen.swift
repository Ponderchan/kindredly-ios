// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 BLOCKED & REPORTED IN SWIFT (owner, 2026-10-27: "make Me all Swift"), under Settings in the Me
 tab's stack (/me/blocked). The React Native page (src/app/(tabs)/me/blocked.tsx) stays as the
 "blocked" switch's fallback. Who each person was, the day, the counts and every word are TS's
 (screens/settings/blocked-model over lib/who); this draws them and reports taps. TS asks before
 anyone is let back (the same Alert as the React Native page).

   ‹         Blocked & reported              03    the sticky secondary bar; the count in mono
   ┌─────────────────────────────────────────┐      (·· while it loads)
   │ [face] Sunday Kite ♀ ♊          UNBLOCK │     a soft row, corners 16, padding 16: the face
   │        BLOCKED OCT 14, 2026             │     they wore on the reader's desk (the mosaic,
   │        They can't reach you.            │     41, with the switch off; their frosted window
   └─────────────────────────────────────────┘     at 40 with it on), the name 15/600 with the
   ─────────────────────────────────────────────    marks, the day (mono 10), the line (12, sub);
   What a report does, in mono, centred             UNBLOCK in ind (15/600)
 Face AND name always: faces alone collide. From xxxLarge type (React Native's 1.35) the row stands
 up: UNBLOCK goes under the name instead of squeezing it.

 THE STATES. loading: the footer at the foot, nothing claimed. ok: the rows, the footer scrolling
 at the end of the list (at the foot of the page while the list is short). empty: "No one's shut
 out." and its line, in the middle, the footer under the page. failed: a line that says it didn't
 load, the whole middle a button that asks again, the footer under the page. A failed read never
 says "no one".
 */

public struct KBlockedRow: Equatable, Sendable, Identifiable {
  /// the blocked person's id (UNBLOCK's target)
  public let id: String
  public let name: String
  public let mark: KLineGlyph?
  public let sign: KLineGlyph?
  /// the face they wore: a bare mosaic, their frosted window, or the veil
  public let face: KFaceSource
  /// the face's side: 41 for the switch-off mosaic, 40 for a window, 28 for a mosaic in a window's place
  public let faceSize: CGFloat
  /// "BLOCKED OCT 14, 2026"
  public let since: String
  /// what VoiceOver says for them ("Sunday Kite, she, Gemini")
  public let spoken: String
  /// VoiceOver for their UNBLOCK ("Unblock Sunday Kite")
  public let unblockA11y: String

  public init(id: String, name: String, mark: KLineGlyph?, sign: KLineGlyph?, face: KFaceSource, faceSize: CGFloat, since: String, spoken: String, unblockA11y: String) {
    self.id = id
    self.name = name
    self.mark = mark
    self.sign = sign
    self.face = face
    self.faceSize = faceSize
    self.since = since
    self.spoken = spoken
    self.unblockA11y = unblockA11y
  }
}

public struct KBlockedContent: Equatable, Sendable {
  public enum State: String, Sendable {
    case loading, ok, empty, failed
  }

  public var title = ""
  public var backLabel = ""
  /// "03", or "··" while it loads
  public var count = ""
  /// what VoiceOver says for the count ("3"); "" hides it
  public var countA11y = ""
  public var state: State = .loading
  public var loadFail = ""
  public var emptyTitle = ""
  public var emptyBody = ""
  /// what a report does
  public var footer = ""
  /// "They can't reach you."
  public var noReach = ""
  /// UNBLOCK
  public var unblock = ""
  public var rows: [KBlockedRow] = []

  public init() {}
}

public final class KBlockedActions {
  public var onBack: () -> Void = {}
  /// UNBLOCK: the person's id (TS asks first)
  public var onUnblock: (String) -> Void = { _ in }
  /// the failed line: try again
  public var onRetry: () -> Void = {}

  public init() {}
}

public struct KBlockedScreen: View {
  private let theme: KTheme
  private let content: KBlockedContent
  private let topInset: CGFloat
  /// under the footer: the floating tab bar's room (or the home indicator) and a little air
  private let bottomInset: CGFloat
  private let actions: KBlockedActions

  @Environment(\.dynamicTypeSize) private var typeSize

  public init(theme: KTheme, content: KBlockedContent, topInset: CGFloat, bottomInset: CGFloat, actions: KBlockedActions) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
  }

  /// React Native's PixelRatio.getFontScale() >= 1.35
  private var tall: Bool { typeSize >= .xxxLarge }

  public var body: some View {
    VStack(spacing: 0) {
      Color.clear.frame(height: topInset)
      KBackBar(theme: theme, title: content.title, backLabel: content.backLabel, height: KBackBar<EmptyView>.stickyHeight, sticky: true) {
        Text(content.count)
          .kText(.mono(11, .medium, tracking: 1.2 / 11))
          .foregroundStyle(theme.mute)
          .lineLimit(1)
          .frame(minWidth: 36, alignment: .trailing)
          .fixedSize()
          .accessibilityLabel(content.countA11y)
          .accessibilityHidden(content.countA11y.isEmpty)
      } onBack: {
        actions.onBack()
      }
      switch content.state {
      case .failed:
        SwiftUI.Button {
          actions.onRetry()
        } label: {
          Text(content.loadFail)
            .kText(.system(16, lineHeight: 23.0 / 16.0))
            .foregroundStyle(theme.sub)
            .multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.horizontal, 40)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        footer
      case .empty:
        VStack(spacing: 12) {
          Text(content.emptyTitle)
            .kText(.system(22, lineHeight: 30.0 / 22.0))
            .foregroundStyle(theme.ink)
          Text(content.emptyBody)
            .kText(.mono(11, .medium))
            .foregroundStyle(theme.sub)
        }
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.horizontal, 40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .combine)
        footer
      case .loading, .ok:
        list
      }
    }
    .background { theme.bg.ignoresSafeArea() }
  }

  private var list: some View {
    GeometryReader { geo in
      ScrollView(.vertical) {
        VStack(spacing: 0) {
          VStack(spacing: 12) {
            ForEach(content.rows) { row in
              rowView(row)
            }
          }
          .padding(16)
          .padding(.bottom, 8)
          // a short list keeps the footer at the foot of the page
          Spacer(minLength: 0)
          footer
        }
        .frame(minHeight: geo.size.height)
      }
      .scrollIndicators(.hidden)
    }
  }

  private var footer: some View {
    Text(content.footer)
      .kText(.mono(10, .medium, tracking: 0.08))
      .foregroundStyle(theme.mute)
      .multilineTextAlignment(.center)
      .fixedSize(horizontal: false, vertical: true)
      .frame(maxWidth: .infinity)
      .padding(.horizontal, 26)
      .padding(.top, 12)
      .padding(.bottom, bottomInset)
      .overlay(alignment: .top) { theme.line.frame(height: 1) }
  }

  private func rowView(_ row: KBlockedRow) -> some View {
    let layout = tall
      ? AnyLayout(VStackLayout(alignment: .leading, spacing: 0))
      : AnyLayout(HStackLayout(alignment: .center, spacing: 0))
    return layout {
      KFace(theme: theme, source: row.face, size: row.faceSize, round: false)
        .frame(width: 41, height: 41)
      VStack(alignment: .leading, spacing: 3) {
        // face AND name, always the pair: a twin face alone would read as "they're back"
        HStack(alignment: .firstTextBaseline, spacing: 0) {
          Text(row.name)
            .kText(.system(15, .semibold))
            .foregroundStyle(theme.ink)
            .fixedSize(horizontal: false, vertical: true)
          KWhoMarks(mark: row.mark, sign: row.sign, size: 12, color: theme.sub)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(row.spoken)
        Text(row.since)
          .kText(.mono(10, .medium, tracking: 0.08))
          .foregroundStyle(theme.mute)
          .fixedSize(horizontal: false, vertical: true)
        Text(content.noReach)
          .kText(.system(12))
          .foregroundStyle(theme.sub)
          .fixedSize(horizontal: false, vertical: true)
      }
      .frame(maxWidth: tall ? .infinity : nil, alignment: .leading)
      .padding(tall ? .top : .leading, tall ? 12 : 14)
      if !tall { Spacer(minLength: 0) }
      SwiftUI.Button {
        actions.onUnblock(row.id)
      } label: {
        Text(content.unblock)
          .kText(.system(15, .semibold))
          .foregroundStyle(theme.ind)
          .padding(.vertical, 6)
          .padding(.leading, tall ? 0 : 10)
          .frame(minHeight: 44)
          .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
      .accessibilityLabel(row.unblockA11y)
      .padding(.top, tall ? 8 : 0)
    }
    .padding(16)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(theme.soft))
  }
}
