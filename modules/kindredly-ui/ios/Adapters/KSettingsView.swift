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
 - strings: { title, backLabel, appearanceHeader, fontLabel, fontSub, footer }
 - banner: Me's 4a First Class card { eyebrow, headline, rows, cta, trial, stampLabel, member, bird }
 - swatches: [{ key, label, hint }] (the five appearances), selectedTheme (the reader's appearance)
 - fonts: [{ key, name, sample }], selectedFont
 - groups: [{ key, header, notice: { present, text, action }, rows: [{ key, symbol, label, value,
   sub, chevron, kind (link | toggle | display | danger), on, busy }] }]
 The records are converted once per rev (useRev in TS).

 Commands: none yet (the page has nothing that changes often; the switches are props, flipped
 rarely and by the reader).

 Events, with what nativeEvent carries:
 - onSettingsBack {}            the chevron
 - onSettingsBanner {}          the First Class banner
 - onSettingsTheme { key }      a swatch (an appearance key)
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
  @Field var fontLabel: String = ""
  @Field var fontSub: String = ""
  @Field var footer: String = ""
  /// the Appearance page: its title, and its sample letter (the pen name, today's postmark, a line)
  @Field var appearanceTitle: String = ""
  @Field var previewName: String = ""
  @Field var previewDate: String = ""
  @Field var previewBody: String = ""
}

/// The card at the top: Me's 4a First Class card (the same fields as KMeFirstClassRecord).
struct KSettingsBannerRecord: Record {
  @Field var eyebrow: String = ""
  @Field var headline: String = ""
  @Field var rows: [String] = []
  @Field var cta: String = ""
  /// "" for none
  @Field var trial: String = ""
  @Field var stampLabel: String = ""
  @Field var member: Bool = false
  @Field var bird: KImageRefRecord = KImageRefRecord()

  var banner: KMeFirstClass {
    var b = KMeFirstClass()
    b.eyebrow = eyebrow
    b.headline = headline
    b.rows = rows
    b.cta = cta
    b.trial = trial
    b.stampLabel = stampLabel
    b.member = member
    b.bird = bird.ref
    return b
  }
}

struct KSettingsSwatchRecord: Record {
  /// system | light | dark | lavender | paper
  @Field var key: String = ""
  @Field var label: String = ""
  /// VoiceOver's hint; "" for none
  @Field var hint: String = ""
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
  /// the card put away (an older bundle sends nothing: shown)
  @Field var bannerHidden: Bool = false
  @Field var swatches: [KSettingsSwatchRecord] = []
  @Field var selectedTheme: String = ""
  @Field var fonts: [KSettingsFontRecord] = []
  @Field var selectedFont: String = ""
  @Field var groups: [KSettingsGroupRecord] = []
  /// "main" (Settings) or "appearance" (its own page). TS probes for this prop by name before it
  /// moves Appearance off the Settings page: keep the name
  @Field var page: String = "main"
  /// the swatches and the fonts drawn on the Settings page (false: the Appearance row instead)
  @Field var appearanceInline: Bool = true

  var onSettingsBack = EventDispatcher()
  var onSettingsBanner = EventDispatcher()
  var onSettingsTheme = EventDispatcher()
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
      c.bannerHidden = bannerHidden
      var a = KSettingsAppearance()
      a.header = strings.appearanceHeader
      // keys are the grid's identity: a repeat (never sent by TS) is dropped, not drawn twice
      var seenThemes = Set<String>()
      a.swatches = swatches.compactMap { s in
        guard !s.key.isEmpty, seenThemes.insert(s.key).inserted else { return nil }
        return KThemeSwatch(key: s.key, label: s.label, hint: s.hint)
      }
      a.selectedTheme = selectedTheme
      a.fontLabel = strings.fontLabel
      a.fontSub = strings.fontSub
      var seenFonts = Set<String>()
      a.fonts = fonts.compactMap { f in
        guard !f.key.isEmpty, seenFonts.insert(f.key).inserted else { return nil }
        return KFontOption(key: f.key, name: f.name, sample: f.sample)
      }
      a.selectedFont = selectedFont
      a.inline = appearanceInline
      a.title = strings.appearanceTitle
      var pv = KSettingsPreview()
      pv.name = strings.previewName
      pv.date = strings.previewDate
      pv.body = strings.previewBody
      a.preview = pv
      c.appearance = a
      c.page = page == "appearance" ? "appearance" : "main"
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

// MARK: - First Class page (Me 4a)

/*
 THE FIRST CLASS PAGE as React Native sees it: <KPaywallView … /> (modules/kindredly-ui/src/
 Paywall.tsx), drawn by src/screens/paywall/PaywallNative.tsx in one Host from the /paywall route
 (a page sheet). Appended here rather than in a file of its own so the module needs no pod
 install (.claude/me4a/ME4A.md D1). The page itself is KPaywallScreen in
 Portable/Kit/KFirstClassCard.swift.

 Props, beyond KScreenProps (insets.top is 0 in the sheet; insets.bottom the home indicator):
 - strings: { eyebrow, title, sub, close, restore, terms, privacy, legal, active, activeSub,
   cfTitle, cfTagline, cfFoot, sealLabel, included }
 - bird: the hero's courier (an image ref; empty uri = none)
 - fares: [{ id, period (annual | monthly | lifetime), label, badge, price, per, note, cta,
   ctaNote, legal, a11y }], initialFare
 - benefits: [{ id, glyph (rooms | voice | wardrobe | report | stamps | paper), title, sub }]
 - cofounder: { badge ("" = none), perks: [{ title, sub }] }
 - member: { premium, cofounder, cta, note }
 - busy: a purchase or restore is running

 Events: onPwClose {}, onPwSelect { id }, onPwBuy { id }, onPwRestore {}, onPwTerms {},
 onPwPrivacy {}, onPwManage {}. An unknown period reads as annual and an unknown glyph as rooms.
 */

struct KPaywallStringsRecord: Record {
  @Field var eyebrow: String = ""
  @Field var title: String = ""
  @Field var sub: String = ""
  @Field var close: String = ""
  @Field var restore: String = ""
  @Field var terms: String = ""
  @Field var privacy: String = ""
  @Field var legal: String = ""
  @Field var active: String = ""
  @Field var activeSub: String = ""
  @Field var cfTitle: String = ""
  @Field var cfTagline: String = ""
  @Field var cfFoot: String = ""
  @Field var sealLabel: String = ""
  @Field var included: String = ""
}

struct KPaywallFareRecord: Record {
  @Field var id: String = ""
  @Field var period: String = "annual"
  @Field var label: String = ""
  @Field var badge: String = ""
  @Field var price: String = ""
  @Field var per: String = ""
  @Field var note: String = ""
  @Field var cta: String = ""
  @Field var ctaNote: String = ""
  @Field var legal: String = ""
  @Field var a11y: String = ""

  var fare: KPaywallFare {
    KPaywallFare(
      id: id,
      period: KPaywallFare.Period(rawValue: period) ?? .annual,
      label: label,
      badge: badge,
      price: price,
      per: per,
      note: note,
      cta: cta,
      ctaNote: ctaNote,
      legal: legal,
      a11y: a11y
    )
  }
}

struct KPaywallBenefitRecord: Record {
  @Field var id: String = ""
  @Field var glyph: String = "rooms"
  @Field var title: String = ""
  @Field var sub: String = ""
}

struct KPaywallPerkRecord: Record {
  @Field var title: String = ""
  @Field var sub: String = ""
}

struct KPaywallCofounderRecord: Record {
  @Field var badge: String = ""
  @Field var perks: [KPaywallPerkRecord] = []
}

struct KPaywallMemberRecord: Record {
  @Field var premium: Bool = false
  @Field var cofounder: Bool = false
  @Field var cta: String = ""
  @Field var note: String = ""
}

final class KPaywallViewProps: KScreenProps {
  @Field var strings: KPaywallStringsRecord = KPaywallStringsRecord()
  @Field var bird: KImageRefRecord = KImageRefRecord()
  @Field var fares: [KPaywallFareRecord] = []
  @Field var initialFare: String = ""
  @Field var benefits: [KPaywallBenefitRecord] = []
  @Field var cofounder: KPaywallCofounderRecord = KPaywallCofounderRecord()
  @Field var member: KPaywallMemberRecord = KPaywallMemberRecord()
  @Field var busy: Bool = false

  var onPwClose = EventDispatcher()
  var onPwSelect = EventDispatcher()
  var onPwBuy = EventDispatcher()
  var onPwRestore = EventDispatcher()
  var onPwTerms = EventDispatcher()
  var onPwPrivacy = EventDispatcher()
  var onPwManage = EventDispatcher()

  private(set) lazy var actions: KPaywallActions = {
    let a = KPaywallActions()
    a.onClose = { [weak self] in self?.onPwClose() }
    a.onSelect = { [weak self] id in self?.onPwSelect(["id": id]) }
    a.onBuy = { [weak self] id in self?.onPwBuy(["id": id]) }
    a.onRestore = { [weak self] in self?.onPwRestore() }
    a.onTerms = { [weak self] in self?.onPwTerms() }
    a.onPrivacy = { [weak self] in self?.onPwPrivacy() }
    a.onManage = { [weak self] in self?.onPwManage() }
    return a
  }()

  var content: KPaywallContent {
    cached("content") {
      var c = KPaywallContent()
      c.eyebrow = strings.eyebrow
      c.title = strings.title
      c.sub = strings.sub
      c.close = strings.close
      c.restore = strings.restore
      c.terms = strings.terms
      c.privacy = strings.privacy
      // strings.legal (the member's line) is the button's note already: not drawn twice
      c.active = strings.active
      c.activeSub = strings.activeSub
      c.cfTitle = strings.cfTitle
      c.cfTagline = strings.cfTagline
      c.cfFoot = strings.cfFoot
      c.sealLabel = strings.sealLabel
      c.included = strings.included
      c.bird = bird.ref
      var seen = Set<String>()
      c.fares = fares.compactMap { f in
        guard !f.id.isEmpty, seen.insert(f.id).inserted else { return nil }
        return f.fare
      }
      c.initialFare = initialFare
      var seenB = Set<String>()
      c.benefits = benefits.compactMap { b in
        guard !b.id.isEmpty, seenB.insert(b.id).inserted else { return nil }
        return KPaywallBenefit(id: b.id, glyph: KPaywallGlyph(rawValue: b.glyph) ?? .rooms, title: b.title, sub: b.sub)
      }
      c.cofounderBadge = cofounder.badge
      c.perks = cofounder.perks.map { KPaywallPerk(title: $0.title, sub: $0.sub) }
      c.premium = member.premium
      c.cofounder = member.cofounder
      c.memberCta = member.cta
      c.memberNote = member.note
      return c
    }
  }
}

struct KPaywallView: ExpoSwiftUI.View {
  @ObservedObject var props: KPaywallViewProps

  var body: some View {
    let insets = props.insets
    return KPaywallScreen(
      content: props.content,
      busy: props.busy,
      topInset: insets.top,
      bottomInset: insets.bottom,
      actions: props.actions
    )
    .kScreenEnvironment(props)
  }
}

// MARK: - My letters (Me 4a)

/*
 MY LETTERS as React Native sees it: <KMyLettersView … /> (modules/kindredly-ui/src/
 MyLetters.tsx), drawn by src/screens/letters/MyLettersNative.tsx in one Host from the
 /my-letters route. Appended here so the module needs no pod install (ME4A D1); the page itself
 is KMyLettersScreen in Portable/Kit/KBackBar.swift.

 Props, beyond KScreenProps (insets.top the status bar, insets.bottom the home indicator):
 - strings: { title, write, manage, cancel, remove, back, none, noDrafts }
 - filters: [{ key (all | answered | quiet | drafts), label, count }]
 - cards: [{ id, kind (letter | draft), tag (answered | quiet | draft), date, reads, answers,
   stampId, stampHex, body, tone (quiet | answered | replied | draft), status,
   face { kind, uri, key, overscan, mask }, opens, a11y }]
 - loaded: the first read is in (no empty-state words before it)

 Events: onMlBack {}, onMlWrite {}, onMlOpen { id }, onMlRemove { id }. Unknown enum strings
 fall back (a filter key this binary doesn't know is skipped, a kind reads as letter, a tag as
 quiet, a tone as quiet).
 */

struct KMyLettersStringsRecord: Record {
  @Field var title: String = ""
  @Field var write: String = ""
  @Field var manage: String = ""
  @Field var cancel: String = ""
  @Field var remove: String = ""
  @Field var back: String = ""
  @Field var none: String = ""
  @Field var noDrafts: String = ""
}

struct KMyLettersFilterRecord: Record {
  @Field var key: String = ""
  @Field var label: String = ""
  @Field var count: Int = 0
}

struct KMyLettersFaceRecord: Record {
  /// image | mosaic | veil | placeholder (a reply's face is a kindred's: never frost here)
  @Field var kind: String = "placeholder"
  @Field var uri: String = ""
  @Field var key: String = ""
  @Field var overscan: Double = 0
  @Field var mask: Int = 0
  /// their stamp when they are a member (C2): "1ST" or "007"; "" for none
  @Field var stamp: String = ""

  func source(_ theme: KTheme) -> KFaceSource {
    switch kind {
    case "image": return .image(KImageRef(uri: uri, key: key), overscan: CGFloat(overscan))
    case "mosaic": return .mosaic(mask: mask, tint: theme.ink)
    case "veil", "frost": return .veil
    default: return .placeholder
    }
  }
}

struct KMyLettersCardRecord: Record {
  @Field var id: String = ""
  @Field var kind: String = "letter"
  @Field var tag: String = "quiet"
  @Field var date: String = ""
  @Field var reads: Int = 0
  @Field var answers: Int = 0
  @Field var stampId: String = ""
  @Field var stampHex: String = ""
  @Field var body: String = ""
  @Field var tone: String = "quiet"
  @Field var status: String = ""
  @Field var face: KMyLettersFaceRecord = KMyLettersFaceRecord()
  @Field var opens: Bool = false
  @Field var a11y: String = ""
}

final class KMyLettersViewProps: KScreenProps {
  @Field var strings: KMyLettersStringsRecord = KMyLettersStringsRecord()
  @Field var filters: [KMyLettersFilterRecord] = []
  @Field var cards: [KMyLettersCardRecord] = []
  @Field var loaded: Bool = false

  var onMlBack = EventDispatcher()
  var onMlWrite = EventDispatcher()
  var onMlOpen = EventDispatcher()
  var onMlRemove = EventDispatcher()

  private(set) lazy var actions: KMyLettersActions = {
    let a = KMyLettersActions()
    a.onBack = { [weak self] in self?.onMlBack() }
    a.onWrite = { [weak self] in self?.onMlWrite() }
    a.onOpen = { [weak self] id in self?.onMlOpen(["id": id]) }
    a.onRemove = { [weak self] id in self?.onMlRemove(["id": id]) }
    return a
  }()

  /// depends on the theme too (a mosaic's ink): its slot is named for it
  var content: KMyLettersContent {
    let theme = kTheme
    return cached("content:\(theme.key)") {
      var c = KMyLettersContent()
      c.title = strings.title
      c.write = strings.write
      c.manage = strings.manage
      c.cancel = strings.cancel
      c.remove = strings.remove
      c.back = strings.back
      c.none = strings.none
      c.noDrafts = strings.noDrafts
      c.loaded = loaded
      var seenF = Set<String>()
      c.filters = filters.compactMap { f in
        guard let key = KMyLettersFilter.Key(rawValue: f.key), seenF.insert(f.key).inserted else { return nil }
        return KMyLettersFilter(key: key, label: f.label, count: f.count)
      }
      var seen = Set<String>()
      c.cards = cards.compactMap { r in
        guard !r.id.isEmpty, seen.insert(r.id).inserted else { return nil }
        let tone = KMyLettersCard.Tone(rawValue: r.tone) ?? .quiet
        return KMyLettersCard(
          id: r.id,
          kind: KMyLettersCard.Kind(rawValue: r.kind) ?? .letter,
          tag: KMyLettersCard.Tag(rawValue: r.tag) ?? .quiet,
          date: r.date,
          reads: r.reads,
          answers: r.answers,
          stampId: r.stampId,
          stampHex: r.stampHex,
          body: r.body,
          tone: tone,
          status: r.status,
          face: tone == .replied ? r.face.source(theme) : nil,
          stamp: tone == .replied ? KMemberStamp(r.face.stamp) : nil,
          opens: r.opens,
          a11y: r.a11y
        )
      }
      return c
    }
  }
}

struct KMyLettersView: ExpoSwiftUI.View {
  @ObservedObject var props: KMyLettersViewProps

  var body: some View {
    let insets = props.insets
    return KMyLettersScreen(
      theme: props.kTheme,
      content: props.content,
      topInset: insets.top,
      bottomInset: insets.bottom,
      actions: props.actions
    )
    .kScreenEnvironment(props)
  }
}
