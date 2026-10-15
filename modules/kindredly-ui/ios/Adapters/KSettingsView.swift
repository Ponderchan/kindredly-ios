import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 SETTINGS as React Native sees it: <KSettingsView … /> on the JS side
 (modules/kindredly-ui/src/Settings.tsx), drawn by src/screens/settings/SettingsNative.tsx in one
 full-screen Host, pushed inside the Me tab's stack (src/app/(tabs)/me/settings.tsx). This file
 turns records into Portable values and taps into events; the screen itself is
 Portable/Settings/KSettingsScreen.swift and knows nothing about Expo.

 Built as every step-5 screen is (KScreenProps.swift): the props subclass KScreenProps (theme,
 letterFont, insets, rev, commands), the view is registered with ExpoUIView and the "command"
 AsyncFunction (KindredlyUIModule.swift), and it MUST sit in an @expo/ui <Host>: one Host for the
 whole screen, never one per row. It has no text field and no React Native island (the language
 and delete sheets are React Native siblings of the Host, window-level modals).

 Props, beyond KScreenProps (insets: top = the status bar the screen draws its strip for,
 tabBarRoom = the floating bar the last row clears, plus 12, and never less than the bottom
 fade's height - 6, since the fade is always drawn):
 - strings: { title, backLabel, appearanceHeader, matchLabel, matchSub, fontLabel, fontSub, footer }
 - banner: { eyebrow, headline, sub, cta, stampLabel, bird }
 - swatches: [{ key, label }], selectedTheme, showMatch, matchOn
 - fonts: [{ key, name, sample }], selectedFont
 - groups: [{ key, header, notice: { present, text, action }, rows: [{ key, symbol, label, value,
   sub, chevron, kind (link | toggle | display | danger), on, busy }] }]
 The records are converted once per rev (useRev in TS).

 Commands: none yet (the page has nothing that changes often; the switches are props, flipped
 rarely and by the reader).

 Events, with what nativeEvent carries:
 - onSettingsBack {}            the chevron
 - onSettingsBanner {}          the First Class banner
 - onSettingsTheme { key }      a swatch
 - onSettingsMatch { on }       Match system flipped (the value asked for)
 - onSettingsFont { key }       a Letter font tile
 - onSettingsRow { key }        a link or an exit
 - onSettingsToggle { key, on } a switch flipped (the value asked for; TS answers with the prop)
 - onSettingsNotice {}          the notifications-off notice

 Unknown enum strings fall back rather than fail (a row kind reads as a link), as KTabBarView
 does. This file imports ExpoUI, whose public Button, Text and Image would make bare names
 ambiguous, so nothing of that kind is written here.
 */

struct KSettingsStringsRecord: Record {
  @Field var title: String = ""
  @Field var backLabel: String = ""
  @Field var appearanceHeader: String = ""
  @Field var matchLabel: String = ""
  @Field var matchSub: String = ""
  @Field var fontLabel: String = ""
  @Field var fontSub: String = ""
  @Field var footer: String = ""
}

struct KSettingsBannerRecord: Record {
  @Field var eyebrow: String = ""
  @Field var headline: String = ""
  @Field var sub: String = ""
  @Field var cta: String = ""
  @Field var stampLabel: String = ""
  @Field var bird: KImageRefRecord = KImageRefRecord()

  var banner: KSettingsBanner {
    var b = KSettingsBanner()
    b.eyebrow = eyebrow
    b.headline = headline
    b.sub = sub
    b.cta = cta
    b.stampLabel = stampLabel
    b.bird = bird.ref
    return b
  }
}

struct KSettingsSwatchRecord: Record {
  @Field var key: String = ""
  @Field var label: String = ""
}

struct KSettingsFontRecord: Record {
  @Field var key: String = ""
  @Field var name: String = ""
  /// the specimen drawn in the face ("Aa", from TS)
  @Field var sample: String = ""
}

struct KSettingsNoticeRecord: Record {
  /// false: no notice
  @Field var present: Bool = false
  @Field var text: String = ""
  @Field var action: String = ""
}

struct KSettingsRowRecord: Record {
  @Field var key: String = ""
  @Field var symbol: String = ""
  @Field var label: String = ""
  @Field var value: String = ""
  @Field var sub: String = ""
  @Field var chevron: Bool = true
  /// link | toggle | display | danger
  @Field var kind: String = "link"
  @Field var on: Bool = false
  @Field var busy: Bool = false

  var row: KSettingsRowItem {
    KSettingsRowItem(
      key: key,
      symbol: symbol,
      label: label,
      value: value,
      sub: sub,
      chevron: chevron,
      kind: KSettingsRowItem.Kind(rawValue: kind) ?? .link,
      on: on,
      busy: busy
    )
  }
}

struct KSettingsGroupRecord: Record {
  @Field var key: String = ""
  @Field var header: String = ""
  @Field var notice: KSettingsNoticeRecord = KSettingsNoticeRecord()
  @Field var rows: [KSettingsRowRecord] = []
}

final class KSettingsViewProps: KScreenProps {
  @Field var strings: KSettingsStringsRecord = KSettingsStringsRecord()
  @Field var banner: KSettingsBannerRecord = KSettingsBannerRecord()
  @Field var swatches: [KSettingsSwatchRecord] = []
  @Field var selectedTheme: String = ""
  @Field var showMatch: Bool = false
  @Field var matchOn: Bool = false
  @Field var fonts: [KSettingsFontRecord] = []
  @Field var selectedFont: String = ""
  @Field var groups: [KSettingsGroupRecord] = []

  var onSettingsBack = EventDispatcher()
  var onSettingsBanner = EventDispatcher()
  var onSettingsTheme = EventDispatcher()
  var onSettingsMatch = EventDispatcher()
  var onSettingsFont = EventDispatcher()
  var onSettingsRow = EventDispatcher()
  var onSettingsToggle = EventDispatcher()
  var onSettingsNotice = EventDispatcher()

  /// The screen's taps, made once: each closure reaches this props object's events.
  private(set) lazy var actions: KSettingsActions = {
    let a = KSettingsActions()
    a.onBack = { [weak self] in self?.onSettingsBack() }
    a.onBanner = { [weak self] in self?.onSettingsBanner() }
    a.onTheme = { [weak self] key in self?.onSettingsTheme(["key": key]) }
    a.onMatchSystem = { [weak self] on in self?.onSettingsMatch(["on": on]) }
    a.onFont = { [weak self] key in self?.onSettingsFont(["key": key]) }
    a.onRow = { [weak self] key in self?.onSettingsRow(["key": key]) }
    a.onToggle = { [weak self] key, on in self?.onSettingsToggle(["key": key, "on": on]) }
    a.onNotice = { [weak self] in self?.onSettingsNotice() }
    return a
  }()

  /// Everything the screen shows, converted once per rev.
  var content: KSettingsContent {
    cached("content") {
      var c = KSettingsContent()
      c.title = strings.title
      c.backLabel = strings.backLabel
      c.banner = banner.banner
      var a = KSettingsAppearance()
      a.header = strings.appearanceHeader
      // keys are the grid's identity: a repeat (never sent by TS) is dropped, not drawn twice
      var seenThemes = Set<String>()
      a.swatches = swatches.compactMap { s in
        guard !s.key.isEmpty, seenThemes.insert(s.key).inserted else { return nil }
        return KThemeSwatch(key: s.key, label: s.label)
      }
      a.selectedTheme = selectedTheme
      a.showMatch = showMatch
      a.matchLabel = strings.matchLabel
      a.matchSub = strings.matchSub
      a.matchOn = matchOn
      a.fontLabel = strings.fontLabel
      a.fontSub = strings.fontSub
      var seenFonts = Set<String>()
      a.fonts = fonts.compactMap { f in
        guard !f.key.isEmpty, seenFonts.insert(f.key).inserted else { return nil }
        return KFontOption(key: f.key, name: f.name, sample: f.sample)
      }
      a.selectedFont = selectedFont
      c.appearance = a
      var seenGroups = Set<String>()
      c.groups = groups.enumerated().compactMap { i, g in
        let key = g.key.isEmpty ? "group\(i)" : g.key
        guard seenGroups.insert(key).inserted else { return nil }
        var seenRows = Set<String>()
        let rows = g.rows.compactMap { r -> KSettingsRowItem? in
          guard !r.key.isEmpty, seenRows.insert(r.key).inserted else { return nil }
          return r.row
        }
        let notice = g.notice.present ? KSettingsNotice(text: g.notice.text, action: g.notice.action) : nil
        return KSettingsGroupItem(key: key, header: g.header, notice: notice, rows: rows)
      }
      c.footer = strings.footer
      return c
    }
  }
}

struct KSettingsView: ExpoSwiftUI.View {
  @ObservedObject var props: KSettingsViewProps

  var body: some View {
    let insets = props.insets
    return KSettingsScreen(
      theme: props.kTheme,
      content: props.content,
      topInset: insets.top,
      // the floating bar's room plus 12 (list_host_pattern), never less than the fade that is
      // always drawn over the bottom asks (KBottomFade.contentMargin(): 176 - 6)
      bottomInset: max(insets.tabBarRoom + 12, insets.bottom + 12, KBottomFade.contentMargin()),
      actions: props.actions
    )
    .kScreenEnvironment(props)
  }
}
