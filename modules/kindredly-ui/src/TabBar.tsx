import { requireNativeView } from "expo";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KThemeKey } from "./InkCard";
import type { KImageRefProps } from "./types";

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

   WHAT THE + OPENS (panelStyle). "grow" is the publish entry the app opens on every tab (the
   owner's P2, 2026-11-09): the glass bar itself grows taller around two rows, Letter and Note,
   with Wren's question above them when the sheet model carries an ask. "cards" is the 10a sheet
   of cards above the bar (the default, so ui-lab is unchanged, and what a binary that doesn't
   know "grow" opens). "sheet" and "pop" are the older publish entry of Today 3d × 25b (Prompt 8),
   the iOS sheet and the two round buttons, no longer opened by the app; ui-lab and the dev Today
   page still show them. grow, sheet and pop report "letter" or "note" through onPanelAction.

   THE DRAFT ROW (owner's audit, 2026-11-10). For "grow", a sheet with a draftTitle gets one more
   row above Letter — the reader's unsent letter: the title, the draft's first words on one line
   (draftSub), and how many drafts there are when more than one (draftCount). Tapped, it reports
   "draft". Without a draftTitle, and on a binary built before the row, the tray is its two rows.

   barHidden sends the bar away, 160 down out of sight and reach over .35s (a fade under Reduce
   Motion), whatever the + is doing: Today's reply (the chat composers' A1, owner 2026-10-18),
   while the keyboard and the reply bar have the foot of the screen.

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

/** What the + opens: the grown bar's two rows, the 10a cards, the older sheet, or the older two buttons. */
export type KTabBarPanelStyle = "cards" | "sheet" | "pop" | "grow";

/** The publish entry's words, for the sheet and the grown bar's tray. Every string already translated. */
export type KTabBarSheet = {
  /** Wren's question beside her ("Who's this one for?"); for "grow", "" leaves her line out */
  ask: string;
  letterTitle: string;
  letterSub: string;
  /** the free plan's letters left today ("3 LEFT"); "" hides it */
  letterLeft: string;
  /** none left today: "grow" draws the count in red. false by default */
  letterOut?: boolean;
  noteTitle: string;
  noteSub: string;
  footnote: string;
  /** the user's own Wren (a BirdSnapshots capture); null while there is none yet */
  bird: KImageRefProps | null;
  /** "grow" only: the draft row above Letter ("Continue your draft"); "" or absent leaves it out */
  draftTitle?: string;
  /** the draft's own first words, drawn on one line */
  draftSub?: string;
  /** how many drafts there are, when more than one ("3"); "" or absent hides it */
  draftCount?: string;
};

/** The returning reader's two buttons. Every string already translated. */
export type KTabBarPop = {
  /** the labels under the discs (LETTER, NOTE) */
  letterLabel: string;
  noteLabel: string;
  /** what VoiceOver says for each disc */
  letterA11y: string;
  noteA11y: string;
  /** the free plan's letters left today under LETTER ("3 LEFT"); "" hides it */
  letterLeft: string;
};

type NativeImage = { uri: string; key: string; kind: "image" | "videoPoster" };
type NativeSheet = Omit<KTabBarSheet, "bird" | "letterOut" | "draftTitle" | "draftSub" | "draftCount"> & {
  letterOut: boolean;
  bird: NativeImage;
  draftTitle: string;
  draftSub: string;
  draftCount: string;
};

const NO_IMAGE: NativeImage = { uri: "", key: "", kind: "image" };
const EMPTY_SHEET: NativeSheet = {
  ask: "",
  letterTitle: "",
  letterSub: "",
  letterLeft: "",
  letterOut: false,
  noteTitle: "",
  noteSub: "",
  footnote: "",
  bird: NO_IMAGE,
  draftTitle: "",
  draftSub: "",
  draftCount: "",
};
const EMPTY_POP: KTabBarPop = { letterLabel: "", noteLabel: "", letterA11y: "", noteA11y: "", letterLeft: "" };

/** The sheet as Swift's flat record: a missing bird is an empty ref, never null (a Record @Field
    can't take one), and the draft row's words are always sent ("" for none), so Swift never sees
    one go missing between two openings. */
function nativeSheet(sheet: KTabBarSheet | undefined): NativeSheet {
  if (!sheet) return EMPTY_SHEET;
  const { bird, letterOut, draftTitle, draftSub, draftCount, ...words } = sheet;
  return {
    ...words,
    letterOut: letterOut ?? false,
    bird: bird && bird.uri ? { uri: bird.uri, key: bird.key, kind: bird.kind ?? "image" } : NO_IMAGE,
    draftTitle: draftTitle ?? "",
    draftSub: draftSub ?? "",
    draftCount: draftCount ?? "",
  };
}

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
  panelStyle: KTabBarPanelStyle;
  sheet: NativeSheet;
  pop: KTabBarPop;
  barHidden: boolean;
  plusRaised: boolean;
  rail: boolean;
  railTop: number;
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
  /** what the + opens; "cards" (the 10a sheet) by default */
  panelStyle?: KTabBarPanelStyle;
  /** the publish entry's words, for panelStyle "sheet" and "grow" */
  sheet?: KTabBarSheet;
  /** the returning reader's two buttons, for panelStyle "pop" */
  pop?: KTabBarPop;
  /** the bar steps away (slides down out of sight): Today's reply has the foot of the screen. false by default */
  barHidden?: boolean;
  /** the + stands proud of the bar in a swell of its glass (owner, 2026-11-12). The Host must be
      K_TAB_PLUS_HEADROOM taller at the top for it; a binary without the prop keeps the + in the
      row (ask kindredlyUIViewHasProp("KTabBarView", "plusRaised") before sizing the Host). false by default */
  plusRaised?: boolean;
  /** a folding phone (iPhone Duo): the bar stands upright in the system's band at the right edge,
      the + out of its left edge, and the + opens it sideways. The Host is then that band, the
      whole window's height (and the whole window while the + is open). A binary without the prop
      keeps the bar along the bottom (ask kindredlyUIViewHasProp("KTabBarView", "rail")). false by default */
  rail?: boolean;
  /** with rail: where the system's own status area ends at the top of the band, in points */
  railTop?: number;
  /** a tab was tapped, selected or not */
  onTabPress?: (index: number) => void;
  /** the + (or ×) was tapped */
  onPlusPress?: () => void;
  /** a card, or the header link, was tapped; for "sheet", "pop" and "grow", "letter" or "note"; "grow" also reports "draft" */
  onPanelAction?: (key: string) => void;
  /** the dim was tapped, VoiceOver's escape gesture, or the publish sheet was dragged down */
  onPanelDismiss?: () => void;
};

/** The bare SwiftUI tab bar and sheet. Only inside an @expo/ui <Host>; see NativeTabBar in the app. */
export function KTabBar({ modifiers, tabs, panelLink, panelStyle, sheet, pop, barHidden, plusRaised, rail, railTop, onTabPress, onPlusPress, onPanelAction, onPanelDismiss, ...rest }: KTabBarProps) {
  return (
    <NativeTabBarView
      modifiers={modifiers}
      // lets event modifiers (onTapGesture, onAppear…) reach this view, as @expo/ui's own views do
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      tabs={tabs.map((tab) => ({ glyph: tab.glyph, label: tab.label, badge: Math.max(0, Math.floor(tab.badge ?? 0)) }))}
      panelLinkKey={panelLink?.key ?? ""}
      panelLinkTitle={panelLink?.title ?? ""}
      panelStyle={panelStyle ?? "cards"}
      sheet={nativeSheet(sheet)}
      pop={pop ?? EMPTY_POP}
      // always sent, so Swift never sees it go missing
      barHidden={barHidden ?? false}
      plusRaised={plusRaised ?? false}
      rail={rail ?? false}
      railTop={railTop ?? 0}
      onTabPress={onTabPress ? (e) => onTabPress(e.nativeEvent.index) : undefined}
      onPlusPress={onPlusPress}
      onPanelAction={onPanelAction ? (e) => onPanelAction(e.nativeEvent.key) : undefined}
      onPanelDismiss={onPanelDismiss}
    />
  );
}
