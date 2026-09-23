import type { ReactNode } from "react";
import { Text, View, type ViewStyle } from "react-native";
import { P, PF } from "../theme/post";

/* EVERY TAB'S PLATE (owner, 2026-09-23). The tab's name in capitals — 18pt,
   the app's own face (30 was the Kindreds title's and 20 still too loud for
   a name every tab wears; the owner, same day) — on one 1pt rule,
   with the tab's one fact or control on the right. Today, Notes, Kindreds
   and Me wear the same one; only the + has none, because it isn't a place.
   Today's rule used to be 3pt, thickened to match its stickers' outlines;
   one weight for every tab reads as one system, so it's 1pt like the rest.

   A long name in some languages (SEELENVERWANDTE, AUJOURD'HUI) shrinks to
   fit its line rather than pushing the right-hand fact off the screen. */
export function TabHeader({ title, right, ink = P.ink, style }: { title: string; right?: ReactNode; ink?: string; style?: ViewStyle }) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 44, marginHorizontal: 16, paddingHorizontal: 4, paddingTop: 4, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: ink }, style]}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} accessibilityRole="header" style={{ flexShrink: 1, fontFamily: PF.letter, fontWeight: "600", fontSize: 18, letterSpacing: 0.8, color: ink }}>
        {title}
      </Text>
      {right}
    </View>
  );
}
