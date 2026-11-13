// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 SETTINGS (10a, H:97-103 with the owner's decisions), drawn by SwiftUI. Every word, value, row
 and destination is TS's (src/screens/settings/settings-model.ts builds them); this draws them
 and reports taps. It keeps no state of its own: even the switches show what the app holds.

   ‹            SETTINGS                     the 44pt header, scrolling away with the page
   ┌ ● FIRST CLASS ─────────────── [1ST] ┐   Me's 4a First Class card (KMeFirstClassCard, FC2
   └─────────────────────────────────────┘   decision 4): one button, to the paywall
   APPEARANCE                                five swatches, System / Light / Dark / Lavender /
   [◩][▣][▣][▣][▣]                           Paper (the reader's appearance selected), then
   Letter font  [Aa][Aa]                     the Letter font tiles
   ACCOUNT · THE QUIET · FIRST CLASS · HELP · SAFETY · the exits in red
                KINDREDLY 1.0.5 · 1.3.0 (29) · MADE SLOWLY

 APPEARANCE, ITS OWN PAGE (owner, 2026-11-13: "appearance 和front 不行合在一起 做个视频里的这种
 方案", of Telegram's and Grok's: one Appearance row in Settings, its own page with a live
 preview over the choices). Where TS says so (content.appearance.inline false: the binary draws
 the page and the row is in the groups), the swatches and the font tiles leave this page for one
 row, and the same view with page "appearance" draws them under a preview:

   ‹           Appearance
   ┌───────────────────────────────────┐   one card: a letter as Today shows one, on the page's
   │ ┌───────────────────────────────┐ │   colour, set in the theme and the Letter font chosen
   │ │ ▢ Pen name        NOV.13      │ │   (it changes as they are tapped: the whole page is in
   │ │ Say the thing you'd never post│ │   the theme, the body in the face)
   │ └───────────────────────────────┘ │
   │ [◩][▣][▣][▣][▣]                   │   the five swatches under it
   └───────────────────────────────────┘
   ┌ Font · Letters, notes and chats ──┐   the Letter font tiles in their own card
   │ [Aa][Aa][Aa][Aa]                  │
   └───────────────────────────────────┘

 LAYOUT. The Host ignores every safe area (the screen gets its insets as props), so the page
 draws its own strip under the status bar and the scroll view starts below it: rows scrolling
 up are clipped under the clock, never drawn over it (critic). One ScrollView over a VStack
 (nothing is lazy: the page is a few dozen rows and has no React Native island), 16 from the
 edges, blocks 12 apart (H:28); the header runs edge to edge. The page clears the floating tab
 bar (Settings is pushed inside the Me tab, so the bar stays) and the bottom fade over it.

 ROWS (SoftGroup.swift): a link is a button around a SoftRow (its value in mono, a chevron); a
 display row (the age) is plain text; a switch is a SoftToggleRow, CONTROLLED (it asks, TS
 answers: a permission prompt that says no leaves it off); the two exits are links in the theme's
 red (KTheme.danger). A busy row (restore) shows its "…" and can't be pressed again. THE
 QUIET's notifications-off notice sits at the top of its group (KNoticeBar, the theme's lav
 ground and ind ink), the whole notice one button.
 */

// MARK: - What the screen shows

/// One row (settings-model SettingsRowVM).
public struct KSettingsRowItem: Identifiable, Equatable, Sendable {
  public enum Kind: String, Sendable {
    /// opens something
    case link
    /// a switch
    case toggle
    /// shows a value, does nothing
    case display
    /// one of the two exits, in red
    case danger
  }

  public let key: String
  /// the SF Symbol in the row's box
  public let symbol: String
  public let label: String
  /// "" for none
  public let value: String
  /// "" for none
  public let sub: String
  public let chevron: Bool
  public let kind: Kind
  /// a switch's state
  public let on: Bool
  /// working on it: shows its value ("…") and takes no tap
  public let busy: Bool

  public var id: String { key }

  public init(key: String, symbol: String, label: String, value: String, sub: String, chevron: Bool, kind: Kind, on: Bool, busy: Bool) {
    self.key = key
    self.symbol = symbol
    self.label = label
    self.value = value
    self.sub = sub
    self.chevron = chevron
    self.kind = kind
    self.on = on
    self.busy = busy
  }
}

/// THE QUIET's notifications-off notice.
public struct KSettingsNotice: Equatable, Sendable {
  public let text: String
  /// the mono line under it: TURN THEM ON › or OPEN SETTINGS ›
  public let action: String

  public init(text: String, action: String) {
    self.text = text
    self.action = action
  }
}

/// A group of rows under its header ("" for none: the exits).
public struct KSettingsGroupItem: Identifiable, Equatable, Sendable {
  public let key: String
  public let header: String
  public let notice: KSettingsNotice?
  public let rows: [KSettingsRowItem]

  public var id: String { key }

  public init(key: String, header: String, notice: KSettingsNotice?, rows: [KSettingsRowItem]) {
    self.key = key
    self.header = header
    self.notice = notice
    self.rows = rows
  }
}

/// APPEARANCE (H:99, plus the owner's Letter font).
public struct KSettingsAppearance: Equatable, Sendable {
  public var header = ""
  public var swatches: [KThemeSwatch] = []
  /// the reader's appearance (system / light / dark / lavender / paper)
  public var selectedTheme = ""
  public var fontLabel = ""
  public var fontSub = ""
  public var fonts: [KFontOption] = []
  public var selectedFont = ""
  /// drawn on the Settings page itself (false: its own page, reached by the Appearance row in
  /// the groups; an older bundle sends nothing, so true)
  public var inline = true
  /// the page's title ("Appearance")
  public var title = ""
  /// the letter the page previews the choices on
  public var preview = KSettingsPreview()

  public init() {}
}

/// The Appearance page's sample letter: the reader's pen name, today's postmark, one line.
public struct KSettingsPreview: Equatable, Sendable {
  public var name = ""
  public var date = ""
  public var body = ""

  public init() {}
}

/// Everything the screen shows, from TS.
public struct KSettingsContent: Equatable, Sendable {
  /// SETTINGS
  public var title = ""
  /// VoiceOver's name for the back chevron
  public var backLabel = ""
  /// the First Class card at the top: Me's 4a card, the member state for members
  public var banner = KMeFirstClass()
  /// the First Class card is put away: a reader who isn't a member has tapped it once (TS decides;
  /// owner, 2026-11-13: "first class 做个策略 如果用户点了 就消失")
  public var bannerHidden = false
  public var appearance = KSettingsAppearance()
  public var groups: [KSettingsGroupItem] = []
  /// KINDREDLY 1.0.5 · 1.3.0 (29) · MADE SLOWLY
  public var footer = ""
  /// which page this view draws: the Settings page, or "appearance" (its own page)
  public var page = "main"

  public init() {}
}

/// Where the screen's taps go. One object for the life of the surface. Set the closures once.
public final class KSettingsActions {
  public var onBack: () -> Void = {}
  public var onBanner: () -> Void = {}
  /// a swatch: its appearance key
  public var onTheme: (String) -> Void = { _ in }
  /// a Letter font tile: its key
  public var onFont: (String) -> Void = { _ in }
  /// a row (link, danger): its key
  public var onRow: (String) -> Void = { _ in }
  /// a switch: its row's key and the value asked for
  public var onToggle: (String, Bool) -> Void = { _, _ in }
  /// the notifications-off notice
  public var onNotice: () -> Void = {}

  public init() {}
}

// MARK: - The screen

public struct KSettingsScreen: View {
  static var gutter: CGFloat { 16 }
  static var gap: CGFloat { 12 }

  private let theme: KTheme
  private let content: KSettingsContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let actions: KSettingsActions

  /// - Parameters:
  ///   - topInset: the status bar's height (the Host ignores safe areas)
  ///   - bottomInset: how far the last of the page must clear the bottom (the tab bar and the fade)
  public init(theme: KTheme, content: KSettingsContent, topInset: CGFloat, bottomInset: CGFloat, actions: KSettingsActions) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
  }

  public var body: some View {
    VStack(spacing: 0) {
      // the status bar's strip: the page colour, and the scroll view clipped under it
      Color.clear.frame(height: topInset)
      ScrollView(.vertical) {
        if content.page == "appearance" {
          appearancePage
        } else {
          mainPage
        }
      }
      .scrollIndicators(.hidden)
      .contentMargins(.bottom, bottomInset, for: .scrollContent)
    }
    .accessibilityElement(children: .contain)
    .overlay(alignment: .bottom) {
      KBottomFade(theme: theme)
    }
    .background { theme.bg.ignoresSafeArea() }
    .ignoresSafeArea(.keyboard)
  }

  /// Appearance on its own page: the preview and the swatches in one card, the fonts in another.
  private var appearancePage: some View {
    VStack(alignment: .leading, spacing: Self.gap) {
      KBackBar(
        theme: theme,
        title: content.appearance.title,
        backLabel: content.backLabel,
        height: KBackBar<EmptyView>.scrollingHeight,
        sticky: false,
        onBack: { actions.onBack() }
      )
      .padding(.horizontal, -Self.gutter)
      VStack(alignment: .leading, spacing: 14) {
        KSettingsPreviewLetter(theme: theme, preview: content.appearance.preview)
        KThemeSwatches(theme: theme, options: content.appearance.swatches, selectedKey: content.appearance.selectedTheme) { key in
          actions.onTheme(key)
        }
      }
      .padding(14)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(theme.soft))
      if !content.appearance.fonts.isEmpty {
        KSettingsFontBlock(theme: theme, appearance: content.appearance, actions: actions)
          .padding(.top, 14)
          .padding(.horizontal, 14)
          .padding(.bottom, 12)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(theme.soft))
      }
    }
    .padding(.horizontal, Self.gutter)
  }

  private var mainPage: some View {
    VStack(alignment: .leading, spacing: Self.gap) {
      KBackBar(
        theme: theme,
        title: content.title,
        backLabel: content.backLabel,
        height: KBackBar<EmptyView>.scrollingHeight,
        sticky: false,
        onBack: { actions.onBack() }
      )
      .padding(.horizontal, -Self.gutter)
      if !content.bannerHidden {
        KMeFirstClassCard(card: content.banner) {
          actions.onBanner()
        }
      }
      if content.appearance.inline {
        KSettingsAppearanceGroup(theme: theme, appearance: content.appearance, actions: actions)
      }
      ForEach(content.groups) { group in
        KSettingsGroupView(theme: theme, group: group, actions: actions)
      }
      Text(content.footer)
        .kText(KTextStyle.mono(11, .medium, tracking: 0.06))
        .foregroundStyle(theme.mute)
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity)
        // H:103: 16 above the footer
        .padding(.top, 16 - Self.gap)
    }
    .padding(.horizontal, Self.gutter)
  }
}

/// The Appearance page's letter: Today's card in small, on the page's colour, so a swatch or a
/// face tapped shows here at once (the theme is the whole page's; the body is in the Letter face).
struct KSettingsPreviewLetter: View {
  let theme: KTheme
  let preview: KSettingsPreview

  @Environment(\.kLetterFace) private var face
  @ScaledMetric(relativeTo: .title3) private var bodySize: CGFloat = 22

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack(spacing: 10) {
        // the frosted face a stranger's letter wears
        RoundedRectangle(cornerRadius: 8, style: .continuous)
          .fill(LinearGradient(colors: [theme.lav2, theme.lav], startPoint: .topLeading, endPoint: .bottomTrailing))
          .frame(width: 32, height: 32)
        VStack(alignment: .leading, spacing: 1) {
          Text(preview.name)
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(theme.ink)
            .lineLimit(1)
          Text(preview.date)
            .kText(KTextStyle.mono(11, .medium, tracking: 0.06))
            .foregroundStyle(theme.mute)
        }
        Spacer(minLength: 0)
      }
      Text(preview.body)
        .font(KType.letterFont(face, italic: false, size: 22, scaledSize: bodySize, relativeTo: .title3))
        .foregroundStyle(theme.ink)
        .lineSpacing(4)
        .fixedSize(horizontal: false, vertical: true)
    }
    .padding(16)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(theme.sf))
    .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(theme.line, lineWidth: 1))
    .padding(14)
    .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(theme.bg))
    .accessibilityElement(children: .combine)
  }
}

/// The Letter font's label, its line and its tiles (the inline group's lower half, and the
/// Appearance page's second card).
struct KSettingsFontBlock: View {
  let theme: KTheme
  let appearance: KSettingsAppearance
  let actions: KSettingsActions

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      VStack(alignment: .leading, spacing: 4) {
        Text(appearance.fontLabel)
          .kText(.rowLabel)
          .foregroundStyle(theme.ink)
          .accessibilityAddTraits(.isHeader)
        if !appearance.fontSub.isEmpty {
          Text(appearance.fontSub)
            .kText(.subtext)
            .foregroundStyle(theme.mute)
            .fixedSize(horizontal: false, vertical: true)
        }
      }
      KFontPicker(theme: theme, options: appearance.fonts, selectedKey: appearance.selectedFont) { key in
        actions.onFont(key)
      }
    }
  }
}

// MARK: - Appearance

/// APPEARANCE (H:99): one soft block, padding 14 14 12, 12 between its parts: the five swatches
/// (System is one of them, so there is no Match system row); the Letter font with a 1pt line
/// over it.
struct KSettingsAppearanceGroup: View {
  let theme: KTheme
  let appearance: KSettingsAppearance
  let actions: KSettingsActions

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      SoftGroupHeader(theme: theme, title: appearance.header)
      VStack(alignment: .leading, spacing: 12) {
        KThemeSwatches(theme: theme, options: appearance.swatches, selectedKey: appearance.selectedTheme) { key in
          actions.onTheme(key)
        }
        if !appearance.fonts.isEmpty {
          VStack(alignment: .leading, spacing: 12) {
            SoftDivider(theme: theme)
            KSettingsFontBlock(theme: theme, appearance: appearance, actions: actions)
          }
        }
      }
      .padding(.top, 14)
      .padding(.horizontal, 14)
      .padding(.bottom, 12)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(theme.soft))
    }
  }
}

// MARK: - A group of rows

struct KSettingsGroupView: View {
  let theme: KTheme
  let group: KSettingsGroupItem
  let actions: KSettingsActions

  var body: some View {
    SoftGroupSection(theme: theme, header: group.header) {
      if let notice = group.notice {
        KNoticeBar(theme: theme, text: notice.text, actionLabel: notice.action, style: .bar) {
          actions.onNotice()
        }
      }
      ForEach(Array(group.rows.enumerated()), id: \.element.id) { index, row in
        KSettingsRowView(theme: theme, row: row, last: index == group.rows.count - 1, actions: actions)
      }
    }
  }
}

struct KSettingsRowView: View {
  let theme: KTheme
  let row: KSettingsRowItem
  let last: Bool
  let actions: KSettingsActions

  var body: some View {
    switch row.kind {
    case .toggle:
      SoftToggleRow(theme: theme, systemImage: row.symbol, label: row.label, subtitle: row.sub, isOn: row.on, divider: !last) { on in
        actions.onToggle(row.key, on)
      }
    case .display:
      SoftRow(theme: theme, systemImage: row.symbol, label: row.label, value: row.value, subtitle: row.sub, chevron: false, divider: !last)
    case .link, .danger:
      SwiftUI.Button {
        actions.onRow(row.key)
      } label: {
        SoftRow(
          theme: theme,
          systemImage: row.symbol,
          label: row.label,
          value: row.value,
          subtitle: row.sub,
          chevron: row.chevron,
          divider: !last,
          tint: row.kind == .danger ? theme.danger : nil
        )
      }
      .buttonStyle(KFadePressStyle())
      .disabled(row.busy)
      .accessibilityAddTraits(.isButton)
    }
  }
}
