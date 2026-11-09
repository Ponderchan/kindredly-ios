import { createContext, useContext, useEffect, useMemo, useState, type ComponentProps } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Host } from "@expo/ui/swift-ui";
import { KTabBar, isKindredlyUIViewAvailable, type KTabBarCard, type KTabBarProps, type KTabBarTab, type KTabGlyph } from "../../modules/kindredly-ui";
import { t, useLang } from "../lib/i18n";
import { useTheme } from "../lib/theme";
import { useBirdImageRef } from "../lib/bird-images";
import { useWrenName } from "../lib/wren-name";
import { useLettersLeft } from "../lib/use-publish-stage";
import { tabBarHeight } from "./PostTabBar";
import "../data/strings-today3d"; // pub.* (the publish entry's words)

/* THE 10a TAB BAR, IN SWIFTUI (1.2.4) — the floating bar with the sliding
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
   as today. The + toggles what it opens. While it is open a tab tapped
   only closes it and switches nothing (the owner's P2, 2026-11-09: "tap a
   tab = close the + first"); the next tap goes to the tab.

   THE + IS THE PUBLISH ENTRY, THE SAME ON EVERY TAB (the owner's P2,
   2026-11-09, which replaces the split by tab of 2026-10-18: two round
   buttons on Today, an iOS sheet on the others). The glass bar itself
   grows taller, its bottom edge where it was, around two rows: Letter
   (pub.letter, with pub.letterSub naming the reader's Wren) and Note
   (pub.note, pub.noteSub), over a light dim with a blur. A free reader's
   Letter row shows today's real letters left (pub.left); at none left it
   is red and Letter goes to the paywall (src=daily_cap, the compose page's
   own cap link) instead of the composer. For the reader's first three
   opens on this phone, Wren's picture and her question (pub.ask) sit above
   the rows (see ASK_OPENS). Neither row is new writing UI: the letter goes
   to the letter composer (/compose), the note to the diary composer
   (/journal-pick), PostFan's own two destinations, in PostFan's order —
   push first, close after the slide, so the composer slides in over the
   grown bar. Today reads the same open flag (usePlusSheetOpen, which the
   tabs layout provides) to fade its band and window and step its card
   back; nothing crosses between the two Hosts. The drawing is
   KPublishTray and KTabBar's growing (modules/kindredly-ui, style "grow").

   The 10a cards ("stranger" / "yourself") stay wired: a binary built
   before "grow" opens them instead, and they go where they always went.

   ONE HOST, TWO SIZES. A SwiftUI hosting view can take every touch inside
   its frame, even where it draws nothing — UIHostingController's view is
   known for it, and expo's hosting view (expo-modules-core
   SwiftUIHostingView.swift) doesn't override hit-testing — so a
   full-screen Host could leave the screens under it untappable. Not
   relying on either answer, the Host is the bar's strip at the
   bottom of the screen (the bar and its gap below, full width) while
   the + is closed, and the whole screen while it is open or closing —
   the dim covers everything and the bar grows up from where it sits.
   SwiftUI lays all of it out from the bottom edge, so growing the Host
   upward moves nothing. Closing, the Host stays full-screen for
   PANEL_OUT_MS so the bar can shrink back and the dim finish going, then
   shrinks. The strip takes no more than PostTabBar did — it was a
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
   the publish entry's pub.* (data/strings-today3d). Wren is called by the
   name the reader gave her. */

type BarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

/* the publish entry's words, as the bar takes them */
type PublishSheet = NonNullable<KTabBarProps["sheet"]>;

/* WREN ASKS, THREE TIMES. For the reader's first ASK_OPENS opens of the +,
   Wren's picture and pub.ask sit above the two rows (and the bar grows a
   little taller for them); from the next open on, only the rows. Counted on
   this phone, raw AsyncStorage (device-level, as language and launch-seen
   are — lib/scoped-store): a second account on the same phone has already
   seen the line. Decided at each press and held through that opening and
   its closing, so the line never pops in or out under the finger. Until
   the count has been read (or if it can't be), no line and no write: never
   a fourth showing over a count we didn't see. */
const PLUS_OPENS_KEY = "kindredly_plus_opens";
const ASK_OPENS = 3;

/* where Letter goes with no letters left today: the compose page's own cap link */
const PAYWALL_OUT = "/paywall?src=daily_cap";

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

/* how long the Host stays full-screen after the + closes: the bar shrinks
   back over .45s and the dim fades over .3s — so .45s and a little over.
   Kept no longer than that because the screen under the Host can't take
   taps until the Host shrinks. */
const PANEL_OUT_MS = 480;

/* PostFan's wait between pushing the composer and closing the grown bar under it */
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

  /* the + opens on this phone so far (ASK_OPENS); null until read */
  const [opens, setOpens] = useState<number | null>(null);
  // the opens this component has counted, so the read value is never written back
  const [counted, setCounted] = useState(false);
  /* Wren's line for this opening: decided at the press, held until the next one */
  const [asks, setAsks] = useState(false);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(PLUS_OPENS_KEY)
      .then((v) => {
        if (alive) setOpens(Math.max(0, parseInt(v ?? "0", 10) || 0));
      })
      .catch((e) => {
        // no count, no line (and nothing written): the smaller failure
        if (__DEV__) console.warn("[tabbar] plus opens unread", e);
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!counted || opens == null) return;
    AsyncStorage.setItem(PLUS_OPENS_KEY, String(opens)).catch((e) => {
      if (__DEV__) console.warn("[tabbar] plus opens unsaved", e);
    });
  }, [opens, counted]);

  /* full screen while open, and for PANEL_OUT_MS after it closes. Decided
     during render, not in an effect, so the frame it starts closing in is
     already a full-screen one; each close restarts the wait. Each opening
     also decides Wren's line, here, so it is there in the first frame. */
  const [wasOpen, setWasOpen] = useState(open);
  const [closedAt, setClosedAt] = useState(0);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) setClosedAt(Date.now());
    else {
      const first = opens != null && opens < ASK_OPENS;
      setAsks(first);
      if (first) {
        setOpens(opens + 1);
        setCounted(true);
      }
    }
  }
  useEffect(() => {
    if (!closedAt) return;
    const id = setTimeout(() => setClosedAt(0), PANEL_OUT_MS);
    return () => clearTimeout(id);
  }, [closedAt]);
  const full = open || closedAt > 0;
  /* THE BAR GROWS ONLY ONCE THE HOST IS FULL SCREEN (owner, b32: "the two discs and the sheet
     come down from the top — not logical, not native"). Opening in the same frame the Host grew
     from the strip, SwiftUI animated from the strip's layout, whose top is the top of the new
     frame: what the + opened came from the top of the screen. Now the Host grows first (laid out
     closed, at the bar), and the bar grows on the next layout, from where it sits. */
  const [grown, setGrown] = useState(false);
  if (!full && grown) setGrown(false);
  const strip = nativeTabBarSpace(insets.bottom);
  const onLayout = (e: LayoutChangeEvent) => {
    if (full && !grown && e.nativeEvent.layout.height > strip + 1) requestAnimationFrame(() => setGrown(true));
  };

  const wren = useWrenName();
  const bird = useBirdImageRef("content");
  // the free plan's count, asked as the + opens
  const left = useLettersLeft(open);

  // dev: one line in Metro per change, next to Today's own (useTodayDesk), so when the + seems
  // to do nothing it shows which side moved — the bar's open state, or the screen's
  useEffect(() => {
    if (__DEV__) console.log(`[tabbar] open=${open} full=${full} asks=${asks}`);
  }, [open, full, asks]);

  // the navigator's own semantics, exactly as PostTabBar has them
  const go = (name: string) => {
    const route = state.routes.find((r) => r.name === name);
    const focused = current === name;
    const event = navigation.emit({ type: "tabPress", target: route?.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(name);
  };

  // while the + is open a tab only closes it (P2); the bar plays no pick for it either
  const onTabPress = (index: number) => {
    const tab = TABS[index];
    if (!tab) return;
    if (open) {
      onClose();
      return;
    }
    go(tab.name);
  };

  /* push first, close after the slide — the composer slides over the grown bar. Letter with
     none left today goes to the paywall instead; Note always works. */
  const onPanelAction = (key: string) => {
    const to = key === "letter" && left === 0 ? PAYWALL_OUT : ROUTES[key];
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
      // Wren's line only for the first ASK_OPENS opens; "" leaves it out
      ask: asks ? t("pub.ask") : "",
      letterTitle: t("pub.letter"),
      letterSub: t("pub.letterSub", { name: wren }),
      // hidden for First Class, a guest, and a count that couldn't be read: never a guess
      letterLeft: left == null ? "" : t("pub.left", { n: left }),
      // none left: the count goes red (and Letter goes to the paywall, onPanelAction)
      letterOut: left === 0,
      noteTitle: t("pub.note"),
      noteSub: t("pub.noteSub"),
      footnote: "",
      bird,
    }),
    [lang, wren, left, bird, asks],
  );

  return (
    <View
      onLayout={onLayout}
      pointerEvents={hidden ? "none" : "box-none"}
      style={full ? { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 } : { position: "absolute", left: 0, right: 0, bottom: 0, height: strip }}
    >
      <Host style={{ flex: 1 }} pointerEvents="box-none" ignoreSafeArea="all" colorScheme={dark ? "dark" : "light"}>
        <KTabBar
          theme={theme}
          tabs={tabs}
          activeIndex={TABS.findIndex((tab) => tab.name === current)}
          panelOpen={open && grown}
          safeAreaBottom={insets.bottom}
          plusLabel={t("pc.post")}
          closeLabel={t("wren.trackClose")}
          panelTitle={t("pc.post")}
          panelCards={cards}
          // one behaviour on every tab (P2); a binary without "grow" opens the 10a cards
          panelStyle="grow"
          sheet={sheet}
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
