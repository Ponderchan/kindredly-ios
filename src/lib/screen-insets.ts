import { createContext, useContext, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabBarSpace } from "../components/NativeTabBar";

/* WHAT A SWIFT SCREEN LEAVES ROOM FOR (10a step 5).
   ────────────────────────────────────────────────────────────────────────
   A Swift screen's Host fills the screen and ignores the safe areas
   (components/NativeSurface: SurfaceHost), so SwiftUI is told the room
   itself, as one small record (KInsetsRecord in modules/kindredly-ui:
   top, bottom, tabBarRoom). Swift paints its own bg strip under the
   status bar and keeps its last row clear of the floating bar. */

export type ScreenInsets = {
  /** the status bar / Dynamic Island inset */
  top: number;
  /** the home-indicator inset */
  bottom: number;
  /** the room the tab bar takes at the bottom, its gap and air included
      (NativeTabBar useTabBarSpace: the floating bar, or PostTabBar's slab
      when the remote switch has the React Native bar up). 0 outside the
      tabs — a pushed root route (room, chat, compose…) has no tab bar.
      A tab screen keeps its last row tabBarRoom + 12 clear (or the bottom
      fade's height − 6 where it draws one). */
  tabBarRoom: number;
};

/** The screen's insets as the one record a Swift screen takes for its
    `insets` prop. Memoised: the same object until a value changes, so
    passing it never re-sends the Host's props on an unrelated render. */
export function useScreenInsets(): ScreenInsets {
  const { top, bottom } = useSafeAreaInsets();
  // the tabs layout provides it (in the Me stack too); null = not in the tabs
  const tabBarRoom = useContext(TabBarSpace) ?? 0;
  return useMemo(() => ({ top, bottom, tabBarRoom }), [top, bottom, tabBarRoom]);
}

/* WHETHER THE + SHEET IS OPEN. The tabs layout provides its `choosing`
   here, so a tab screen can step out of the sheet's way: Today hides its
   write-back pill while the composer sheet is up (mock H:451-452, 489),
   which would otherwise show through the dim beside the cards. */
export const PlusSheetOpen = createContext(false);

/** true while the tab bar's + sheet (or the React Native fan) is open.
    Always false outside the tabs. */
export function usePlusSheetOpen(): boolean {
  return useContext(PlusSheetOpen);
}
