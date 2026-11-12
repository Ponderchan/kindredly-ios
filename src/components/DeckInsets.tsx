import { useMemo, type ReactNode } from "react";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFoldFrame } from "../lib/fold";
import { BEND_GAP, isLaptop } from "../lib/fold-frame";

/* A WRITING OR READING PAGE ON A SMALL LAPTOP (the Duo's inner screen upright and half-folded).
   The root stack ends these pages at the bend (app/_layout `deck`), so the home indicator is half
   a screen away from their foot: what they keep clear at the bottom is the bend's gap instead of
   the home-indicator inset, and their bar sits just over the bend rather than 50 points above it.
   Everywhere else the insets pass through unchanged. Wrap the route's whole page in it. */
export function DeckInsets({ children }: { children: ReactNode }) {
  const frame = useFoldFrame();
  const insets = useSafeAreaInsets();
  const laptop = isLaptop(frame);
  const value = useMemo(() => (laptop ? { ...insets, bottom: BEND_GAP } : insets), [laptop, insets]);
  return <SafeAreaInsetsContext.Provider value={value}>{children}</SafeAreaInsetsContext.Provider>;
}
