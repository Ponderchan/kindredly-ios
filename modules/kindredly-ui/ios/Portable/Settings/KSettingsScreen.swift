// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 SETTINGS (10a, H:97-103 with the owner's decisions), drawn by SwiftUI. Every word, value, row
 and destination is TS's (src/screens/settings/settings-model.ts builds them); this draws them
 and reports taps. It keeps no state of its own: even the switches show what the app holds.

   ‹            SETTINGS                     the 44pt header, scrolling away with the page
   ┌ ● FIRST CLASS ─────────────── [1ST] ┐   the cream banner: one button, to the paywall
   └─────────────────────────────────────┘
   APPEARANCE                                the swatches (the theme in effect selected), then
   [▣][▣][▣][ ]                              Match system (once the dark theme is ready), then
   Letter font  [Aa][Aa]                     the Letter font tiles
   ACCOUNT · THE QUIET · FIRST CLASS · HELP · SAFETY · the exits in red
                KINDREDLY 1.0.5 · 1.3.0 (29) · MADE SLOWLY

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

/// The cream First Class banner (H:98, in the owner's copy).
public struct KSettingsBanner: Equatable, Sendable {
  public var eyebrow = ""
  public var headline = ""
  public var sub = ""
  public var cta = ""
  public var stampLabel = ""
  /// the courier's live snapshot for the stamp; nil leaves its face white
  public var bird: KImageRef?

  public init() {}
}

/// APPEARANCE (H:99, plus the owner's Letter font).
public struct KSettingsAppearance: Equatable, Sendable {
  public var header = ""
  public var swatches: [KThemeSwatch] = []
  /// the theme in effect
  public var selectedTheme = ""
  /// Match system's row shows (only once the dark theme is ready)
  public var showMatch = false
  public var matchLabel = ""
  public var matchSub = ""
  public var matchOn = false
  public var fontLabel = ""
  public var fontSub = ""
  public var fonts: [KFontOption] = []
  public var selectedFont = ""

  public init() {}
}

/// Everything the screen shows, from TS.
public struct KSettingsContent: Equatable, Sendable {
  /// SETTINGS
  public var title = ""
  /// VoiceOver's name for the back chevron
  public var backLabel = ""
  public var banner = KSettingsBanner()
  public var appearance = KSettingsAppearance()
  public var groups: [KSettingsGroupItem] = []
  /// KINDREDLY 1.0.5 · 1.3.0 (29) · MADE SLOWLY
  public var footer = ""

  public init() {}
}

/// Where the screen's taps go. One object for the life of the surface. Set the closures once.
public final class KSettingsActions {
  public var onBack: () -> Void = {}
  public var onBanner: () -> Void = {}
  /// a swatch: its theme key
  public var onTheme: (String) -> Void = { _ in }
  /// Match system flipped to this value
  public var onMatchSystem: (Bool) -> Void = { _ in }
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
          KFirstClassCard(
            variant: .banner,
            eyebrow: content.banner.eyebrow,
            headline: content.banner.headline,
            sub: content.banner.sub,
            cta: content.banner.cta,
            stampLabel: content.banner.stampLabel,
            bird: content.banner.bird
          ) {
            actions.onBanner()
          }
          KSettingsAppearanceGroup(theme: theme, appearance: content.appearance, actions: actions)
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
}

// MARK: - Appearance

/// APPEARANCE (H:99): one soft block, padding 14 14 12, 12 between its parts: the swatches;
/// Match system with a 1pt line over it; the Letter font with a 1pt line over it.
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
        if appearance.showMatch {
          VStack(alignment: .leading, spacing: 12) {
            SoftDivider(theme: theme)
            Toggle(isOn: Binding(get: { appearance.matchOn }, set: { actions.onMatchSystem($0) })) {
              VStack(alignment: .leading, spacing: 4) {
                Text(appearance.matchLabel)
                  .kText(.rowLabel)
                  .foregroundStyle(theme.ink)
                Text(appearance.matchSub)
                  .kText(.subtext)
                  .foregroundStyle(theme.mute)
                  .fixedSize(horizontal: false, vertical: true)
              }
              .frame(maxWidth: .infinity, alignment: .leading)
            }
            .toggleStyle(KToggleStyle(theme: theme))
            .accessibilityHint(appearance.matchSub)
          }
        }
        if !appearance.fonts.isEmpty {
          VStack(alignment: .leading, spacing: 12) {
            SoftDivider(theme: theme)
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
