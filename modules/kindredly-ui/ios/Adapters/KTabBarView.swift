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
 - panelStyle: what the + opens: "grow" (the bar grows around two rows, the app's on every tab),
   "cards" (the 10a sheet above, the default; ui-lab), "sheet" (the older publish sheet) or "pop"
   (the older two buttons). Anything else is "cards"
 - sheet: { ask, letterTitle, letterSub, letterLeft, letterOut, noteTitle, noteSub, footnote,
   bird, draftTitle, draftSub, draftCount }: the publish entry's words for the sheet and the
   grown bar's tray ("" letterLeft hides the count, letterOut draws it red, "" ask leaves the
   tray's Wren line out) and the user's own Wren ({ uri, key, kind }, an empty uri for none yet).
   The three draft words are the tray's row above Letter (owner's audit, 2026-11-10): its title,
   the draft's first words, and how many drafts there are when more than one; "" draftTitle (and
   a JS bundle that doesn't send them) leaves the row out
 - pop: { letterLabel, noteLabel, letterA11y, noteA11y, letterLeft }: the two buttons' labels and what
   VoiceOver says for each
 - barHidden: the bar slides 160 down out of sight and reach (a fade under Reduce Motion): Today's
   reply (the chat composers' A1, owner 2026-10-18), while the reader writes back on the keyboard
 Every string arrives translated; nothing in Swift holds a word.

 Events, with what nativeEvent carries:
 - onTabPress { index }: a tab was tapped, selected or not; JS decides what that means
 - onPlusPress {}: the + (or ×) was tapped
 - onPanelAction { key }: a card (or the header link) was tapped; for the publish sheet and the
   two buttons, "letter" or "note"; the grown bar's tray also reports "draft"
 - onPanelDismiss {}: the dim was tapped, VoiceOver's escape, or the publish sheet was dragged
   down

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

/// The new reader's publish sheet, as JS sends it.
struct KTabBarSheetRecord: Record {
  @Field var ask: String = ""
  @Field var letterTitle: String = ""
  @Field var letterSub: String = ""
  /// "3 LEFT"; empty hides it (First Class, a guest, a count that couldn't be read)
  @Field var letterLeft: String = ""
  /// none left today: the grown bar's tray draws the count in red
  @Field var letterOut: Bool = false
  @Field var noteTitle: String = ""
  @Field var noteSub: String = ""
  @Field var footnote: String = ""
  /// the user's own Wren (a BirdSnapshots capture); an empty uri while there is none yet
  @Field var bird: KImageRefRecord = KImageRefRecord()
  /// the tray's draft row above Letter (owner's audit, 2026-11-10); an empty title leaves it out
  @Field var draftTitle: String = ""
  /// the draft's first words
  @Field var draftSub: String = ""
  /// how many drafts, when more than one ("3"); empty hides it
  @Field var draftCount: String = ""
}

/// The returning reader's two buttons, as JS sends them.
struct KTabBarPopRecord: Record {
  @Field var letterLabel: String = ""
  @Field var noteLabel: String = ""
  @Field var letterA11y: String = ""
  @Field var noteA11y: String = ""
  @Field var letterLeft: String = ""
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
  /// cards, sheet, pop or grow (KPublishStyle)
  @Field var panelStyle: String = "cards"
  @Field var sheet: KTabBarSheetRecord = KTabBarSheetRecord()
  @Field var pop: KTabBarPopRecord = KTabBarPopRecord()
  /// Today's reply has the screen's foot: the bar steps away
  @Field var barHidden: Bool = false

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
      // a style this binary doesn't know opens the 10a sheet
      style: KPublishStyle(rawValue: props.panelStyle) ?? .cards,
      sheet: sheetModel,
      pop: popModel,
      barHidden: props.barHidden,
      onSelect: { props.onTabPress(["index": $0]) },
      onPlus: { props.onPlusPress() },
      onPanelAction: { props.onPanelAction(["key": $0]) },
      onDismiss: { props.onPanelDismiss() }
    )
    // the publish sheet's Wren is a KImage: the one shared loader, as every step-5 screen has
    .kImageLoader(KImageStore.shared)
  }

  /// the new reader's publish sheet, from its record
  private var sheetModel: KPublishSheetModel {
    let r = props.sheet
    var m = KPublishSheetModel()
    m.ask = r.ask
    m.letterTitle = r.letterTitle
    m.letterSub = r.letterSub
    m.letterLeft = r.letterLeft
    m.letterOut = r.letterOut
    m.noteTitle = r.noteTitle
    m.noteSub = r.noteSub
    m.footnote = r.footnote
    m.bird = r.bird.ref
    m.draftTitle = r.draftTitle
    m.draftSub = r.draftSub
    m.draftCount = r.draftCount
    return m
  }

  /// the returning reader's two buttons, from their record
  private var popModel: KPublishPopModel {
    let r = props.pop
    var m = KPublishPopModel()
    m.letterLabel = r.letterLabel
    m.noteLabel = r.noteLabel
    m.letterA11y = r.letterA11y
    m.noteA11y = r.noteA11y
    m.letterLeft = r.letterLeft
    return m
  }
}
