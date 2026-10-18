import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { StatusBar } from "expo-status-bar";
import { barOf, type Ground as GroundKind } from "../flow";
import { GROUND_HEX } from "./tokens";

/* THE THREE GROUNDS (storyboard §3): Post Blue before the hatch, the letter's
   paper on 7 (you are inside the envelope), Shell from the crack on.

   A ground is a full-bleed colour AND the status bar's text for it: light on
   blue, dark on paper and Shell. iOS 26 reads the ground under the bar by
   itself, but iOS 18 follows the window's light/dark, which on blue would be
   dark text — so a ground names its own style, and only while it is mounted
   (the stack keeps covered screens mounted; the last StatusBar mounted wins,
   app/_layout's note). The runner draws one Ground for the screen showing; a
   screen that changes its ground mid-screen (9's Shell flood) mounts its own
   <StatusBar style="dark" /> once the flood has covered the blue, and that
   later mount wins. */

export function Ground({ kind, children, style }: { kind: GroundKind; children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flex: 1, backgroundColor: GROUND_HEX[kind] }, style]}>
      <StatusBar style={barOf(kind)} animated />
      {children}
    </View>
  );
}

/** The ground's hex, for a screen that paints part of itself in it (a cut-out, a mask, a flood's under-colour). */
export const groundHex = (kind: GroundKind): string => GROUND_HEX[kind];
