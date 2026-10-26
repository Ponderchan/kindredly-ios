// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 HOW KINDREDLY WORKS, IN SWIFT (owner, 2026-10-27: "make Me all Swift"), under Settings in the Me
 tab's stack (/me/help). The React Native page (src/app/(tabs)/me/help.tsx) stays as the "help"
 switch's fallback. The answers, in the product's own voice, are TS's; this draws them.

   ‹            How Kindredly works                 the sticky secondary bar
   (Wren) Her opener, in the Letter font's italic   13.5/20 in sub, her snapshot at 26
   Why can't I see who wrote this?            –     a question 16/600 in ink; its answer 15/23 in
   The answer, under it while it is open.           sub, 9 under it; a 1pt line under each
   ─────────────────────────────────────────────
   Why is it so slow?                         +
   ─────────────────────────────────────────────
 One open at a time, the first open to begin with; a tap opens or closes it (a short ease, none
 under Reduce Motion). VoiceOver: each question is one button, its answer read with it while
 open, "Expanded" / "Collapsed" as its value. The page clears the floating tab bar and the bottom
 fade over it, as Settings does.
 */

public struct KHelpItem: Equatable, Sendable, Identifiable {
  public let id: Int
  public let question: String
  public let answer: String

  public init(id: Int, question: String, answer: String) {
    self.id = id
    self.question = question
    self.answer = answer
  }
}

public struct KHelpContent: Equatable, Sendable {
  public var title = ""
  public var backLabel = ""
  /// her opener
  public var intro = ""
  /// her snapshot beside it; nil while it is captured
  public var bird: KImageRef?
  public var items: [KHelpItem] = []
  /// VoiceOver's values for a question
  public var expanded = ""
  public var collapsed = ""

  public init() {}
}

public final class KHelpActions {
  public var onBack: () -> Void = {}

  public init() {}
}

public struct KHelpScreen: View {
  private let theme: KTheme
  private let content: KHelpContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let actions: KHelpActions

  /// the open question's id; the first one to begin with
  @State private var open: Int? = 0
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  public init(theme: KTheme, content: KHelpContent, topInset: CGFloat, bottomInset: CGFloat, actions: KHelpActions) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
  }

  public var body: some View {
    VStack(spacing: 0) {
      Color.clear.frame(height: topInset)
      KBackBar(theme: theme, title: content.title, backLabel: content.backLabel, height: KBackBar<EmptyView>.stickyHeight, sticky: true, onBack: { actions.onBack() })
      ScrollView(.vertical) {
        VStack(alignment: .leading, spacing: 0) {
          HStack(alignment: .center, spacing: 10) {
            KImage(content.bird, size: CGSize(width: 26, height: 26), contentMode: .fit, placeholder: .clear)
              .accessibilityHidden(true)
            Text(content.intro)
              .kText(.content(13.5, italic: true, lineHeight: 20.0 / 13.5))
              .foregroundStyle(theme.sub)
              .fixedSize(horizontal: false, vertical: true)
              .frame(maxWidth: .infinity, alignment: .leading)
          }
          .padding(.bottom, 18)
          ForEach(content.items) { item in
            row(item)
          }
        }
        .padding(.horizontal, 22)
        .padding(.top, 8)
      }
      .scrollIndicators(.hidden)
      .contentMargins(.bottom, bottomInset, for: .scrollContent)
    }
    .overlay(alignment: .bottom) {
      KBottomFade(theme: theme)
    }
    .background { theme.bg.ignoresSafeArea() }
  }

  private func row(_ item: KHelpItem) -> some View {
    let on = open == item.id
    return SwiftUI.Button {
      withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.2)) {
        open = on ? nil : item.id
      }
    } label: {
      VStack(alignment: .leading, spacing: 0) {
        HStack(alignment: .top, spacing: 10) {
          Text(item.question)
            .kText(.system(16, .semibold, lineHeight: 23.0 / 16.0))
            .foregroundStyle(theme.ink)
            .multilineTextAlignment(.leading)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
          Text(verbatim: on ? "–" : "+")
            .kText(.mono(11, .medium))
            .foregroundStyle(theme.mute)
            .padding(.top, 3)
            .accessibilityHidden(true)
        }
        if on {
          Text(item.answer)
            .kText(.system(15, lineHeight: 23.0 / 15.0))
            .foregroundStyle(theme.sub)
            .multilineTextAlignment(.leading)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 9)
            .transition(.opacity)
        }
      }
      .padding(.vertical, 15)
      .frame(maxWidth: .infinity, alignment: .leading)
      .overlay(alignment: .bottom) { theme.line.frame(height: 1) }
      .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityElement(children: .combine)
    .accessibilityValue(on ? content.expanded : content.collapsed)
    .accessibilityAddTraits(.isButton)
  }
}
