// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE SHELF, IN SWIFT (2026-10-27, behind the "songshelf" switch): every song either of you left
 in a kindred's room, in order, as the React Native sheet over the Swift room draws it
 (src/screens/chat/ConversationNative.tsx SongShelfRN). The window it rises in (a transparent
 Modal sliding up) and opening a song stay TS's (src/screens/chat/SongShelfNative.tsx); every
 word is TS's too (src/screens/chat/song-shelf.ts). This draws what is inside the window:

   ░░░░░░░░░ the dim (tap: close) ░░░░░░░░░    scrimColor(dark, .3): rgba(30,27,53,.3), Midnight
   ╭─────────────────────────────────────╮       black at .45
   │       Songs you and Juno left     ✕ │     System 500 17 centred; ✕ SF Mono 16 in mute
   │ ┌─────────────────────────────────┐ │
   │ │ (w) Wren's line, Letter font 14  │ │     only when she has one: her mark at 18 (the
   │ └─────────────────────────────────┘ │     snapshot), soft (soft2 on Midnight), 16 corners
   │ ♪ Pink Moon                       › │     ♪ 15 in ind; the title System 15, one line; who
   │   JUNO · OCT 3                      │     and when SF Mono 500 9 in mute; a 1pt line under
   ╰─────────────────────────────────────╯
 The sheet is the page colour (sf on Midnight, with LeaveSheet's ln rule along its top), top
 corners 24, at most 72% of the screen tall, 28 under the list; the list scrolls once it is
 longer than that. VoiceOver: the dim and the ✕ are buttons named "Close", the title a header,
 each song one link (its title, who and when).
 */

public struct KSongShelfRow: Equatable, Sendable, Identifiable {
  /// the song's link: what TS opens
  public let id: String
  public let title: String
  /// "JUNO · OCT 3"
  public let who: String

  public init(id: String, title: String, who: String) {
    self.id = id
    self.title = title
    self.who = who
  }
}

public struct KSongShelfContent: Equatable, Sendable {
  public var title = ""
  /// VoiceOver for the dim and the ✕
  public var closeLabel = ""
  /// Wren's line about the songs; "" when she has none
  public var says = ""
  /// her evidence ("3 · 2")
  public var evidence = ""
  /// her mark beside the line (the mini snapshot)
  public var bird: KImageRef?
  public var rows: [KSongShelfRow] = []

  public init() {}
}

public final class KSongShelfActions {
  public var onClose: () -> Void = {}
  /// a song pressed: its id (the link)
  public var onOpen: (String) -> Void = { _ in }

  public init() {}
}

/// The 10a dim under a sheet over a chat (lib/theme scrimColor): the ink at `alpha` in the light
/// themes, black at `alpha` + .15 (at most .6) on a dark one.
enum KChatScrim {
  static func color(_ theme: KTheme, _ alpha: Double = 0.3) -> Color {
    theme.isDark
      ? Color.black.opacity(min(0.6, alpha + 0.15))
      : Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: alpha)
  }
}

/// A sheet's top edge as React Native's borderTopWidth draws it with rounded top corners: the
/// top line and the two corner arcs, nothing down the sides.
struct KSheetTopRule: Shape {
  let radius: CGFloat

  func path(in rect: CGRect) -> Path {
    var p = Path()
    let r = min(radius, rect.width / 2)
    p.move(to: CGPoint(x: rect.minX, y: rect.minY + r))
    p.addArc(center: CGPoint(x: rect.minX + r, y: rect.minY + r), radius: r, startAngle: .degrees(180), endAngle: .degrees(270), clockwise: false)
    p.addLine(to: CGPoint(x: rect.maxX - r, y: rect.minY))
    p.addArc(center: CGPoint(x: rect.maxX - r, y: rect.minY + r), radius: r, startAngle: .degrees(270), endAngle: .degrees(360), clockwise: false)
    return p
  }
}

public struct KSongShelf: View {
  static let corner: CGFloat = 24
  /// the sheet's share of the screen, at most
  static let maxShare: CGFloat = 0.72

  private let theme: KTheme
  private let content: KSongShelfContent
  private let actions: KSongShelfActions

  public init(theme: KTheme, content: KSongShelfContent, actions: KSongShelfActions) {
    self.theme = theme
    self.content = content
    self.actions = actions
  }

  public var body: some View {
    GeometryReader { geo in
      ZStack(alignment: .bottom) {
        // the dim above the sheet closes it
        KChatScrim.color(theme)
          .contentShape(Rectangle())
          .onTapGesture { actions.onClose() }
          .accessibilityElement()
          .accessibilityLabel(content.closeLabel)
          .accessibilityAddTraits(.isButton)
          .accessibilityAction { actions.onClose() }
        // the sheet at its own height, at most 72% of the screen; a tap inside it is its own
        sheet
          .frame(maxHeight: geo.size.height * Self.maxShare)
          .contentShape(Rectangle())
      }
      .frame(width: geo.size.width, height: geo.size.height)
    }
    .ignoresSafeArea()
    .accessibilityAction(.escape) { actions.onClose() }
  }

  private var sheet: some View {
    let shape = UnevenRoundedRectangle(topLeadingRadius: Self.corner, bottomLeadingRadius: 0, bottomTrailingRadius: 0, topTrailingRadius: Self.corner, style: .circular)
    return VStack(spacing: 0) {
      header
      if !content.says.isEmpty {
        wrenLine
          .padding(.horizontal, 16)
          .padding(.bottom, 12)
      }
      // the list at its own height while it fits, scrolling once it doesn't
      ViewThatFits(in: .vertical) {
        list
        ScrollView(.vertical) { list }
      }
    }
    .padding(.bottom, 28)
    .frame(maxWidth: .infinity)
    .background(theme.isDark ? theme.sf : theme.bg, in: shape)
    .overlay {
      // Midnight's sheet keeps LeaveSheet's ln rule along its top
      if theme.isDark {
        KSheetTopRule(radius: Self.corner).stroke(theme.ln, lineWidth: 1)
      }
    }
  }

  private var header: some View {
    HStack(spacing: 0) {
      // the ✕'s width mirrored on the left, so the title is centred
      Color.clear.frame(width: 24, height: 1)
      Text(content.title)
        .kText(.system(17, .medium))
        .foregroundStyle(theme.ink)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: .infinity)
        .accessibilityAddTraits(.isHeader)
      SwiftUI.Button(action: { actions.onClose() }) {
        Text(verbatim: "✕")
          .font(.system(size: 16, design: .monospaced))
          .foregroundStyle(theme.mute)
          .frame(width: 24, alignment: .trailing)
          // the React Native key's hitSlop of 10
          .padding(10)
          .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
      .padding(-10)
      .accessibilityLabel(content.closeLabel)
    }
    .padding(.horizontal, 16)
    .padding(.top, 18)
    .padding(.bottom, 12)
  }

  private var wrenLine: some View {
    HStack(spacing: 9) {
      KImage(content.bird, size: CGSize(width: 18, height: 18), contentMode: .fit, placeholder: .clear)
        .accessibilityHidden(true)
      // what Wren says about the songs is her line: the reader's Letter font
      Text(content.says)
        .kText(.content(14, lineHeight: 20.0 / 14.0))
        .foregroundStyle(theme.ink)
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: .infinity, alignment: .leading)
      Text(content.evidence)
        .kText(.mono(9, .medium, tracking: 1.0 / 9.0))
        .foregroundStyle(theme.mute)
    }
    .padding(12)
    .background(theme.isDark ? theme.soft2 : theme.soft, in: RoundedRectangle(cornerRadius: 16, style: .circular))
    .accessibilityElement(children: .combine)
  }

  private var list: some View {
    VStack(spacing: 0) {
      ForEach(content.rows) { row in
        song(row)
      }
    }
    .padding(.horizontal, 16)
    .padding(.bottom, 8)
  }

  private func song(_ row: KSongShelfRow) -> some View {
    SwiftUI.Button(action: { actions.onOpen(row.id) }) {
      HStack(spacing: 11) {
        Text(verbatim: "♪")
          .kText(.system(15))
          .foregroundStyle(theme.ind)
        VStack(alignment: .leading, spacing: 3) {
          Text(row.title)
            .kText(.system(15))
            .foregroundStyle(theme.ink)
            .lineLimit(1)
          Text(row.who)
            .kText(.mono(9, .medium, tracking: 1.0 / 9.0))
            .foregroundStyle(theme.mute)
            .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        Text(verbatim: "›")
          .font(.system(size: 12, design: .monospaced))
          .foregroundStyle(theme.ind)
      }
      .padding(.vertical, 12)
      .overlay(alignment: .bottom) { theme.line.frame(height: 1) }
      .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityElement(children: .combine)
    .accessibilityAddTraits(.isLink)
  }
}
