import { createContext, useContext, useEffect, useMemo, useState, type ComponentProps } from "react";
import { View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Host } from "@expo/ui/swift-ui";
import { KTabBar, isKindredlyUIViewAvailable, type KTabBarCard, type KTabBarProps, type KTabBarTab, type KTabGlyph } from "../../modules/kindredly-ui";
import { t, useLang } from "../lib/i18n";
import { useTheme } from "../lib/theme";
import { useBirdImageRef } from "../lib/bird-images";
import { useWrenName } from "../lib/wren-name";
import { useLettersLeft } from "../lib/use-publish-stage";
import { tabBarHeight } from "./PostTabBar";
import "../data/strings-today3d"; // pub.* (the publish entry's words)

/* THE 10a TAB BAR, IN SWIFTUI (1.3.0) — the floating bar with the sliding
   lens, the + that turns into an ×, and what the + opens, all drawn by
   modules/kindredly-ui (KTabBar). This file is the React Native side of
   it: it turns the navigator's state into the bar's props, the bar's taps
   back into navigation, and holds the one Host they share.

   The tabs layout picks it when useNativeSurface("tabbar") is on and the
   binary has the view (nativeTabBarReady); otherwise PostTabBar and PostFan
   draw exactly what they drew before. The remote switch (app_surfaces,
   lib/surfaces) can send any binary back to them.

   PRESSES DO WHAT POSTTABBAR'S DO. A tab emits tabPress to the navigator
   and navigates only if it isn't already the focused tab and nobody
   prevented it — re-pressing the tab you're on emits and does nothing else,
   as today. The + toggles what it opens. One difference, from the mock: a
   tab tapped while it is open also closes it (H:445, go() clears the
   composer). The React Native fan stayed open over the new tab.

   THE + IS THE PUBLISH ENTRY (Today 3d × 25b, design Prompt 8), and it
   opens by the tab it is pressed on (owner, 2026-10-18; it used to go by
   the reader's first week): on Today, where the reader is reading, two
   round buttons, LETTER and NOTE, pop from behind the + just above the
   letter's band, light enough not to cover the letter; on every other tab
   a bottom sheet, Wren asking who this one is for, with a letter row and a
   diary-note row, while the bar slides away. Both show the free plan's
   real letters left today (under LETTER, or on the letter row). Neither is new writing UI: the letter goes to the letter
   composer (/compose), the note to the diary composer (/journal-pick),
   PostFan's own two destinations, in PostFan's order — push first, close
   after the slide, so the composer slides in over what the + opened.
   Today reads the same open flag (usePlusSheetOpen, which the tabs layout
   provides) to fade its band and window and step its card back; nothing
   crosses between the two Hosts. The style is held from the press to the
   end of the closing (see panelStyle below).

   The 10a cards ("stranger" / "yourself") stay wired, so a binary or a lab
   that still asks for them goes where they always went.

   ONE HOST, TWO SIZES. A SwiftUI hosting view can take every touch inside
   its frame, even where it draws nothing — UIHostingController's view is
   known for it, and expo's hosting view (expo-modules-core
   SwiftUIHostingView.swift) doesn't override hit-testing — so a
   full-screen Host could leave the screens under it untappable. Not
   relying on either answer, the Host is the bar's strip at the
   bottom of the screen (the bar and its gap below, full width) while
   the + is closed, and the whole screen while it is open or closing —
   the dim covers everything and the sheet or the buttons rise from the
   bar. SwiftUI lays all of it out from the bottom edge, so growing the
   Host upward moves nothing. Closing, the Host stays full-screen for
   PANEL_OUT_MS so the sheet, the buttons and the dim can finish going,
   then shrinks. The strip takes no more than PostTabBar did — it was a
   full-width slab 54 + inset tall — and both the wrapper and the Host are
   box-none, so if the hosting view does let touches through where it
   draws nothing, the gutters beside the bar pass them on.

   The Host ignores safe areas: the bar is placed from the bottom inset we
   pass (KTabBarMetrics.bottomGap), and the keyboard never lifts it — it
   goes under the keyboard, as PostTabBar does. Its color scheme follows the
   theme, so anything system-drawn inside is dark in Midnight.

   AWAY (Today's reply: the chat composers' A1, owner 2026-10-18). While
   the reader writes back to a letter on Today, the keyboard and the reply
   bar have the foot of the screen, so Today sends the bar away
   (useTabBarAway, through the layout's `away`): it slides 160 down out of
   sight over .35s (barHidden; a fade under Reduce Motion) and comes back
   up when the reply ends. Honoured only while Today is the tab on screen,
   so a navigation that leaves Today mid-reply never takes the bar from
   another tab. While away the strip takes no touches at all (pointerEvents
   none): with a hardware keyboard Today's reply bar sits right where the
   bar was, and must not be under a hosting view that might swallow its
   taps.

   No haptics: PostTabBar and PostFan have none, so neither does this.

   Words: the tab names (tab.*), the +'s name (pc.post, the post chooser's
   own heading), the × (wren.trackClose, the app's "Close"), the 10a cards
   (pc.stranger / pc.yourself with pc.strangerSaid / pc.yourselfSaid), and
   the publish entry's pub.* (data/strings-today3d, English for now). Wren
   is called by the name the reader gave her. */

type BarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

/* the publish entry's props, as the bar takes them */
type PanelStyle = NonNullable<KTabBarProps["panelStyle"]>;
type PublishSheet = NonNullable<KTabBarProps["sheet"]>;
type PublishPop = NonNullable<KTabBarProps["pop"]>;

/* the four tabs, in the bar's order — the mock's order too (H:448): Today,
   Notes, +, Kindreds, Me. `name` is the route under (tabs)/. */
const TABS: readonly { name: string; glyph: KTabGlyph; label: string }[] = [
  { name: "letters", glyph: "today", label: "tab.today" },
  { name: "journal", glyph: "notes", label: "tab.notes" },
  { name: "kindreds", glyph: "kindreds", label: "tab.kindreds" },
  { name: "me", glyph: "me", label: "tab.me" },
];

/* the 10a cards — PostFan's two choices, same routes */
const CHOICES: readonly { key: string; to: string; title: string; subtitle: string; glyph: KTabBarCard["glyph"]; tone: KTabBarCard["tone"] }[] = [
  { key: "stranger", to: "/compose", title: "pc.stranger", subtitle: "pc.strangerSaid", glyph: "letter", tone: "lavender" },
  { key: "yourself", to: "/journal-pick", title: "pc.yourself", subtitle: "pc.yourselfSaid", glyph: "note", tone: "warm" },
];

/* where every key the + can report goes: the 10a cards' and the publish
   entry's (KPublishAction in ios/Portable/KPlusPanel.swift) */
const ROUTES: Readonly<Record<string, string>> = {
  ...Object.fromEntries(CHOICES.map((c) => [c.key, c.to])),
  letter: "/compose",
  note: "/journal-pick",
};

/** the bar's height (KTabBarMetrics.height) */
export const NATIVE_BAR_H = 62;

/** How far the bar's bottom edge sits above the screen's: 4 inside the
    safe area, never closer than 16 to the edge — the mock's 30 on a Face ID
    iPhone. The same rule as KTabBarMetrics.bottomGap in
    modules/kindredly-ui/ios/Portable/KTabBar.swift; change them together. */
export function barBottomGap(insetBottom: number): number {
  return Math.max(insetBottom - 4, 16);
}

/** The room the floating bar takes at the bottom of a screen, gap
    included: what a screen keeps clear under its own content. */
export function nativeTabBarSpace(insetBottom: number): number {
  return barBottomGap(insetBottom) + NATIVE_BAR_H;
}

/** What a screen's own content keeps clear above a floating bar. With the
    6 Today already adds under its write-back box, the box sits the mock's
    12 above the bar (H:115: bottom 104 = 30 + 62 + 12). */
const TAB_CLEAR = 6;

/* How a tab screen knows how much room to leave at the bottom: the tabs
   layout provides it for whichever bar it drew. Outside the tabs (or before
   the layout decides) it is PostTabBar's height, as it always was. */
export const TabBarSpace = createContext<number | null>(null);

/** the room the floating bar takes, plus the air a screen leaves above it */
export function nativeTabBarRoom(insetBottom: number): number {
  return nativeTabBarSpace(insetBottom) + TAB_CLEAR;
}

/** The room at the bottom of a tab screen that the tab bar has: PostTabBar's
    flush slab, or the floating bar with the air above it. */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  return useContext(TabBarSpace) ?? tabBarHeight(insets.bottom);
}

/* how long the Host stays full-screen after the + closes: the new reader's
   sheet shrinks over .45s (KMotion.publishSheetGrow) and the bar comes back
   up over .35s, the returning reader's buttons fly back over .4s plus
   NOTE's 50ms, and the dim fades over .3s — so .45s and a little over.
   Kept no longer than that because the screen under the Host can't take
   taps until the Host shrinks. */
const PANEL_OUT_MS = 480;

/* PostFan's wait between pushing the composer and closing the sheet under it */
const CLOSE_AFTER_PUSH_MS = 420;

/** Whether this binary can draw the Swift bar: the KindredlyUI module AND
    its KTabBarView (a dev client built before this view existed has the
    one without the other). */
export function nativeTabBarReady(): boolean {
  return isKindredlyUIViewAvailable("KTabBarView");
}

type Props = BarProps & {
  /** the + is open (the layout's `choosing`) */
  open: boolean;
  /** Today's reply sent the bar away (the layout's `barAway`, from useTabBarAway) */
  away?: boolean;
  /** the + was pressed: toggle it */
  onPost: () => void;
  /** close it */
  onClose: () => void;
  /** letters on you plus posts on Wren's desk (lib/waiting), on the Kindreds tab */
  waiting: number;
};

export function NativeTabBar({ state, navigation, open, away = false, onPost, onClose, waiting }: Props) {
  const lang = useLang(); // the navigator renders this bar, not a screen — subscribe here or the words go stale
  const { key: theme, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const current: string = state.routes[state.index]?.name ?? "letters";
  // only Today writes back on this bar's ground; anywhere else the bar stays
  const hidden = away && current === "letters";

  /* full screen while open, and for PANEL_OUT_MS after it closes. Decided
     during render, not in an effect, so the frame it starts closing in is
     already a full-screen one; each close restarts the wait. */
  const [wasOpen, setWasOpen] = useState(open);
  const [closedAt, setClosedAt] = useState(0);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) setClosedAt(Date.now());
  }
  useEffect(() => {
    if (!closedAt) return;
    const id = setTimeout(() => setClosedAt(0), PANEL_OUT_MS);
    return () => clearTimeout(id);
  }, [closedAt]);
  const full = open || closedAt > 0;

  /* what the + opens: the two buttons on Today, the sheet on the other tabs —
     HELD for the life of an opening, so a tab tapped while it is open (which
     closes it) can't swap the closing sheet for the buttons under the finger.
     The style follows the tab only while the Host is the strip; from the
     press until the closing is over (full) it stays what it was. Adjusted
     during render, as `full` is. */
  const stageNow: PanelStyle = current === "letters" ? "pop" : "sheet";
  const [panelStyle, setPanelStyle] = useState(stageNow);
  if (!full && panelStyle !== stageNow) setPanelStyle(stageNow);
  const wren = useWrenName();
  const bird = useBirdImageRef("content");
  // the free plan's count, asked as the + opens (both styles show it)
  const left = useLettersLeft(open);

  // dev: one line in Metro per change, next to Today's own (useTodayDesk), so when the + seems
  // to do nothing it shows which side moved — the bar's open state, or the screen's
  useEffect(() => {
    if (__DEV__) console.log(`[tabbar] open=${open} style=${panelStyle} full=${full}`);
  }, [open, panelStyle, full]);

  // the navigator's own semantics, exactly as PostTabBar has them
  const go = (name: string) => {
    const route = state.routes.find((r) => r.name === name);
    const focused = current === name;
    const event = navigation.emit({ type: "tabPress", target: route?.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(name);
  };

  const onTabPress = (index: number) => {
    const tab = TABS[index];
    if (!tab) return;
    if (open) onClose();
    go(tab.name);
  };

  // push first, close after the slide — the composer slides over what the + opened
  const onPanelAction = (key: string) => {
    const to = ROUTES[key];
    if (!to) return;
    router.push(to);
    setTimeout(onClose, CLOSE_AFTER_PUSH_MS);
  };

  // lang is in the deps so a change of language re-reads t()
  const tabs = useMemo<KTabBarTab[]>(
    () => TABS.map((tab) => ({ glyph: tab.glyph, label: t(tab.label), badge: tab.name === "kindreds" ? waiting : 0 })),
    [lang, waiting],
  );
  const cards = useMemo<KTabBarCard[]>(
    () => CHOICES.map((c) => ({ key: c.key, title: t(c.title), subtitle: t(c.subtitle), glyph: c.glyph, tone: c.tone })),
    [lang],
  );
  const sheet = useMemo<PublishSheet>(
    () => ({
      ask: t("pub.ask"),
      letterTitle: t("pub.letter"),
      letterSub: t("pub.letterSub", { name: wren }),
      // hidden for First Class, a guest, and a count that couldn't be read: never a guess
      letterLeft: left == null ? "" : t("pub.left", { n: left }),
      noteTitle: t("pub.note"),
      noteSub: t("pub.noteSub"),
      footnote: "",
      bird,
    }),
    [lang, wren, left, bird],
  );
  const pop = useMemo<PublishPop>(
    () => ({ letterLabel: t("pub.popLetter"), noteLabel: t("pub.popNote"), letterA11y: t("pub.letter"), noteA11y: t("pub.note"), letterLeft: left == null ? "" : t("pub.left", { n: left }) }),
    [lang, left],
  );

  const strip = nativeTabBarSpace(insets.bottom);
  return (
    <View
      pointerEvents={hidden ? "none" : "box-none"}
      style={full ? { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 } : { position: "absolute", left: 0, right: 0, bottom: 0, height: strip }}
    >
      <Host style={{ flex: 1 }} pointerEvents="box-none" ignoreSafeArea="all" colorScheme={dark ? "dark" : "light"}>
        <KTabBar
          theme={theme}
          tabs={tabs}
          activeIndex={TABS.findIndex((tab) => tab.name === current)}
          panelOpen={open}
          safeAreaBottom={insets.bottom}
          plusLabel={t("pc.post")}
          closeLabel={t("wren.trackClose")}
          panelTitle={t("pc.post")}
          panelCards={cards}
          panelStyle={panelStyle}
          sheet={sheet}
          pop={pop}
          barHidden={hidden}
          onTabPress={onTabPress}
          onPlusPress={onPost}
          onPanelAction={onPanelAction}
          onPanelDismiss={onClose}
        />
      </Host>
    </View>
  );
}
