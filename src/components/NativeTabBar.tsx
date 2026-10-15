import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Host } from "@expo/ui/swift-ui";
import { KTabBar, isKindredlyUIViewAvailable, type KTabBarCard, type KTabBarTab, type KTabGlyph } from "../../modules/kindredly-ui";
import { t, useLang } from "../lib/i18n";
import { useTheme } from "../lib/theme";

/* THE 10a TAB BAR, IN SWIFTUI (1.3.0) — the floating bar with the sliding
   lens, the + that turns into an ×, and the composer sheet it opens, all
   drawn by modules/kindredly-ui (KTabBar). This file is the React Native
   side of it: it turns the navigator's state into the bar's props, the
   bar's taps back into navigation, and holds the one Host they share.

   The tabs layout picks it when useNativeSurface("tabbar") is on and the
   binary has the view (nativeTabBarReady); otherwise PostTabBar and PostFan
   draw exactly what they drew before. The remote switch (app_surfaces,
   lib/surfaces) can send any binary back to them.

   PRESSES DO WHAT POSTTABBAR'S DO. A tab emits tabPress to the navigator
   and navigates only if it isn't already the focused tab and nobody
   prevented it — re-pressing the tab you're on emits and does nothing else,
   as today. The + toggles the sheet. The two cards are PostFan's two
   choices with PostFan's destinations — to a stranger (/compose), to
   yourself (/journal-pick) — and its order: push first, close after the
   slide, so the composer slides in over the sheet. One difference, from
   the mock: a tab tapped while the sheet is open also closes it (H:445,
   go() clears the composer). The React Native fan stayed open over the
   new tab.

   ONE HOST, TWO SIZES. A SwiftUI hosting view can take every touch inside
   its frame, even where it draws nothing — UIHostingController's view is
   known for it, and expo's hosting view (expo-modules-core
   SwiftUIHostingView.swift) doesn't override hit-testing — so a
   full-screen Host could leave the screens under it untappable. Not
   relying on either answer, the Host is the bar's strip at the
   bottom of the screen (the bar, its gap below, a little room above) while
   the sheet is closed, and the whole screen while it is open or closing —
   the dim covers everything and the sheet rises from just above the bar.
   SwiftUI lays all of it out from the bottom edge, so growing the Host
   upward moves nothing. Closing, the Host stays full-screen for
   PANEL_OUT_MS so the sheet and the dim can finish going, then shrinks.

   The Host ignores safe areas: the bar is placed from the bottom inset we
   pass (KTabBarMetrics.bottomGap), and the keyboard never lifts it — it
   goes under the keyboard, as PostTabBar does. Its color scheme follows the
   theme, so anything system-drawn inside is dark in Midnight.

   No haptics: PostTabBar and PostFan have none, so neither does this.

   Every word is an existing key, already in nine languages: the tab names
   (tab.*), the sheet's header and the +'s name (pc.post, the post
   chooser's own heading), the × (wren.trackClose, the app's "Close"), and
   the cards (pc.stranger / pc.yourself with the old chooser's replies,
   pc.strangerSaid / pc.yourselfSaid, as subtitles). */

type BarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

/* the four tabs, in the bar's order — the mock's order too (H:448): Today,
   Notes, +, Kindreds, Me. `name` is the route under (tabs)/. */
const TABS: readonly { name: string; glyph: KTabGlyph; label: string }[] = [
  { name: "letters", glyph: "today", label: "tab.today" },
  { name: "journal", glyph: "notes", label: "tab.notes" },
  { name: "kindreds", glyph: "kindreds", label: "tab.kindreds" },
  { name: "me", glyph: "me", label: "tab.me" },
];

/* what the + offers — PostFan's two choices, same routes */
const CHOICES: readonly { key: string; to: string; title: string; subtitle: string; glyph: KTabBarCard["glyph"]; tone: KTabBarCard["tone"] }[] = [
  { key: "stranger", to: "/compose", title: "pc.stranger", subtitle: "pc.strangerSaid", glyph: "letter", tone: "lavender" },
  { key: "yourself", to: "/journal-pick", title: "pc.yourself", subtitle: "pc.yourselfSaid", glyph: "note", tone: "warm" },
];

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

/* room above the bar's top edge inside the strip. The bar's soft shadow
   falls below it, not above, and nothing the Host draws is clipped to it
   anyway; this is so the strip still holds the whole bar if the Swift rule
   above ever drifts a point from this one. Kept small: the strip may take
   touches even where it draws nothing (see ONE HOST above). */
const STRIP_ROOM = 4;

/* how long the sheet takes to go: its .45s rise played backwards, and a
   little over (KMotion.panelRise in KPlusPanel.swift) */
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
  /** the sheet is open (the layout's `choosing`) */
  open: boolean;
  /** the + was pressed: toggle the sheet */
  onPost: () => void;
  /** close the sheet */
  onClose: () => void;
  /** letters on you plus posts on Wren's desk (lib/waiting), on the Kindreds tab */
  waiting: number;
};

export function NativeTabBar({ state, navigation, open, onPost, onClose, waiting }: Props) {
  const lang = useLang(); // the navigator renders this bar, not a screen — subscribe here or the words go stale
  const { key: theme, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const current: string = state.routes[state.index]?.name ?? "letters";

  /* full screen while open, and for PANEL_OUT_MS after it closes. Decided
     during render, not in an effect, so the frame the sheet starts closing
     in is already a full-screen one; each close restarts the wait. */
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

  // push first, close after the slide — the composer slides over the sheet
  const onPanelAction = (key: string) => {
    const choice = CHOICES.find((c) => c.key === key);
    if (!choice) return;
    router.push(choice.to);
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

  const strip = nativeTabBarSpace(insets.bottom) + STRIP_ROOM;
  return (
    <View style={full ? { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 } : { position: "absolute", left: 0, right: 0, bottom: 0, height: strip }}>
      <Host style={{ flex: 1 }} ignoreSafeArea="all" colorScheme={dark ? "dark" : "light"}>
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
          onTabPress={onTabPress}
          onPlusPress={onPost}
          onPanelAction={onPanelAction}
          onPanelDismiss={onClose}
        />
      </Host>
    </View>
  );
}
