import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 The 10a tab bar and its composer sheet as React Native sees them: <KTabBar … /> on the JS side
 (modules/kindredly-ui/src/TabBar.tsx), placed by src/components/NativeTabBar.tsx. This file
 only turns props into plain values and taps into events; the bar, the sheet and the dim are
 Portable/KTabBar.swift and Portable/KPlusPanel.swift (KTabStage puts them together) and know
 nothing about Expo.

 Built as KInkCardView is (see there for why): the JS name is the struct's name,
 "KTabBarView"; the props subclass UIBaseViewProps and the view is registered with ExpoUIView
 in KindredlyUIModule; and it MUST sit inside an @expo/ui <Host>. It has no React Native
 children. The bar and the sheet share ONE Host: NativeTabBar gives that Host the bar's strip
 at the bottom of the screen while the sheet is closed and the whole screen while it is open or
 closing, and the stage lays everything out from the bottom edge so nothing moves when it does.

 Props, all set by NativeTabBar:
 - theme: a key of src/theme/themes.json
 - tabs: [{ glyph, label, badge }], left to right; glyph is today / notes / kindreds / me
 - activeIndex: the selected tab, an index into tabs; -1 for none
 - panelOpen: the sheet is showing and the + is an ×
 - safeAreaBottom: the screen's bottom inset (the Host ignores safe areas, so the bar is placed
   from this and the keyboard never lifts it)
 - plusLabel, closeLabel: what VoiceOver says for the + and the × (and the dim)
 - panelTitle: the sheet's header; panelLinkKey / panelLinkTitle: its link on the right, shown
   only when the title is not empty
 - panelCards: [{ key, title, subtitle, glyph, tone }]; glyph letter / note, tone lavender / warm
 Every string arrives translated; nothing in Swift holds a word.

 Events, with what nativeEvent carries:
 - onTabPress { index }: a tab was tapped, selected or not; JS decides what that means
 - onPlusPress {}: the + (or ×) was tapped
 - onPanelAction { key }: a card (or the header link) was tapped
 - onPanelDismiss {}: the dim was tapped, or VoiceOver's escape

 Named on* with their own nouns rather than onPress, as @expo/ui names its own events
 (onButtonPress): a precaution against clashing with React Native's generic ones.

 The sheet's cards are SwiftUI buttons; this file imports ExpoUI, whose own public Button would
 make a bare "Button" here ambiguous, so nothing of that kind is written in this file.
 */

/// One tab, as JS sends it.
struct KTabBarTabRecord: Record {
  @Field var glyph: String = "today"
  @Field var label: String = ""
  @Field var badge: Int = 0
}

/// One card on the sheet, as JS sends it.
struct KTabBarCardRecord: Record {
  @Field var key: String = ""
  @Field var title: String = ""
  @Field var subtitle: String = ""
  @Field var glyph: String = "letter"
  @Field var tone: String = "lavender"
}

final class KTabBarViewProps: UIBaseViewProps {
  /// a key of src/theme/themes.json: classic, midnight, lavender or paper
  @Field var theme: String = "classic"
  @Field var tabs: [KTabBarTabRecord] = []
  @Field var activeIndex: Int = -1
  @Field var panelOpen: Bool = false
  @Field var safeAreaBottom: CGFloat = 0
  @Field var plusLabel: String = ""
  @Field var closeLabel: String = ""
  @Field var panelTitle: String = ""
  @Field var panelLinkKey: String = ""
  @Field var panelLinkTitle: String = ""
  @Field var panelCards: [KTabBarCardRecord] = []

  var onTabPress = EventDispatcher()
  var onPlusPress = EventDispatcher()
  var onPanelAction = EventDispatcher()
  var onPanelDismiss = EventDispatcher()
}

struct KTabBarView: ExpoSwiftUI.View {
  @ObservedObject var props: KTabBarViewProps

  var body: some View {
    // unknown strings fall back rather than fail: a tab with a glyph this binary doesn't know
    // draws as Today, a card as the letter card, a theme as Classic (one added to the JSON
    // without regenerating KTheme.swift)
    let items = props.tabs.map {
      KTabItem(glyph: KTabGlyph(rawValue: $0.glyph) ?? .today, label: $0.label, badge: $0.badge)
    }
    let cards = props.panelCards.map {
      KPlusPanelCard(
        key: $0.key,
        title: $0.title,
        subtitle: $0.subtitle,
        glyph: KPlusPanelCard.Glyph(rawValue: $0.glyph) ?? .letter,
        tone: KPlusPanelCard.Tone(rawValue: $0.tone) ?? .lavender
      )
    }
    KTabStage(
      theme: KTheme.named(props.theme) ?? .classic,
      items: items,
      selectedIndex: items.indices.contains(props.activeIndex) ? props.activeIndex : nil,
      isPanelOpen: props.panelOpen,
      plusLabel: props.plusLabel,
      closeLabel: props.closeLabel,
      panelTitle: props.panelTitle,
      panelLink: props.panelLinkTitle.isEmpty ? nil : KPlusPanelLink(key: props.panelLinkKey, title: props.panelLinkTitle),
      cards: cards,
      safeAreaBottom: props.safeAreaBottom,
      onSelect: { props.onTabPress(["index": $0]) },
      onPlus: { props.onPlusPress() },
      onPanelAction: { props.onPanelAction(["key": $0]) },
      onDismiss: { props.onPanelDismiss() }
    )
  }
}
