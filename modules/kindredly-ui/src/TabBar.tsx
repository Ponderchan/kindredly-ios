import { requireNativeView } from "expo";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KThemeKey } from "./InkCard";

/* THE 10a TAB BAR, drawn by SwiftUI (ios/Portable/KTabBar.swift), with what its + opens
   (ios/Portable/KPlusPanel.swift): the floating bar with its sliding lens, the round + that
   turns into an ×, and the composer sheet over a dim. One view for all of it, because the bar
   and the sheet share one @expo/ui Host.

   This is the bare view. It MUST sit inside a <Host> (outside one it is a RedBox in dev and a
   CRASH in a release build), and that Host should ignore safe areas: the view places the bar
   from safeAreaBottom itself. The app's holder, with the Host, the navigation and the words,
   is src/components/NativeTabBar.tsx.

   It fills the Host and lays itself out from the bottom edge, so the Host can be the bar's strip
   while the sheet is closed and the whole screen while it is open.

   iOS only, and only in a binary that has this view: check isKindredlyUIViewAvailable("KTabBarView")
   first (a binary built before the view existed has the module but not the view). */

export type KTabGlyph = "today" | "notes" | "kindreds" | "me";

export type KTabBarTab = {
  glyph: KTabGlyph;
  /** already translated; for VoiceOver and the large content viewer, never drawn on the bar */
  label: string;
  /** the count on the tab; 0 or absent for none. Hidden while the tab is selected; "9+" past nine */
  badge?: number;
};

export type KTabBarCard = {
  /** handed back by onPanelAction */
  key: string;
  title: string;
  subtitle: string;
  /** letter = the envelope, note = the notebook (the mock's two cards) */
  glyph: "letter" | "note";
  /** lavender = lav2, warm = the happy mood's #F6E7C6 */
  tone: "lavender" | "warm";
};

type NativeTabBarProps = CommonViewModifierProps & {
  theme: KThemeKey;
  tabs: { glyph: KTabGlyph; label: string; badge: number }[];
  activeIndex: number;
  panelOpen: boolean;
  safeAreaBottom: number;
  plusLabel: string;
  closeLabel: string;
  panelTitle: string;
  panelLinkKey: string;
  panelLinkTitle: string;
  panelCards: KTabBarCard[];
  onTabPress?: (e: { nativeEvent: { index: number } }) => void;
  onPlusPress?: () => void;
  onPanelAction?: (e: { nativeEvent: { key: string } }) => void;
  onPanelDismiss?: () => void;
};

// the view's JS name is the Swift struct's name (ios/Adapters/KTabBarView.swift)
const NativeTabBarView = requireNativeView<NativeTabBarProps>("KindredlyUI", "KTabBarView");

export type KTabBarProps = CommonViewModifierProps & {
  theme: KThemeKey;
  /** left to right; the + goes in the middle */
  tabs: KTabBarTab[];
  /** the selected tab, an index into tabs; -1 for none */
  activeIndex: number;
  /** the sheet is showing and the + is an × */
  panelOpen: boolean;
  /** the screen's bottom safe-area inset (useSafeAreaInsets().bottom) */
  safeAreaBottom: number;
  /** VoiceOver's name for the + while closed */
  plusLabel: string;
  /** VoiceOver's name for the × while open, and for the dim */
  closeLabel: string;
  /** the sheet's header, set in capitals */
  panelTitle: string;
  /** the header's link on the right (the mock's RECENT ›): the whole label, chevron included. None by default */
  panelLink?: { key: string; title: string };
  panelCards: KTabBarCard[];
  /** a tab was tapped, selected or not */
  onTabPress?: (index: number) => void;
  /** the + (or ×) was tapped */
  onPlusPress?: () => void;
  /** a card, or the header link, was tapped */
  onPanelAction?: (key: string) => void;
  /** the dim was tapped, or VoiceOver's escape gesture */
  onPanelDismiss?: () => void;
};

/** The bare SwiftUI tab bar and sheet. Only inside an @expo/ui <Host>; see NativeTabBar in the app. */
export function KTabBar({ modifiers, tabs, panelLink, onTabPress, onPlusPress, onPanelAction, onPanelDismiss, ...rest }: KTabBarProps) {
  return (
    <NativeTabBarView
      modifiers={modifiers}
      // lets event modifiers (onTapGesture, onAppear…) reach this view, as @expo/ui's own views do
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      tabs={tabs.map((tab) => ({ glyph: tab.glyph, label: tab.label, badge: Math.max(0, Math.floor(tab.badge ?? 0)) }))}
      panelLinkKey={panelLink?.key ?? ""}
      panelLinkTitle={panelLink?.title ?? ""}
      onTabPress={onTabPress ? (e) => onTabPress(e.nativeEvent.index) : undefined}
      onPlusPress={onPlusPress}
      onPanelAction={onPanelAction ? (e) => onPanelAction(e.nativeEvent.key) : undefined}
      onPanelDismiss={onPanelDismiss}
    />
  );
}
