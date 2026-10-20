import { Text, View } from "react-native";
import type { KChatBand } from "../../../modules/kindredly-ui/src/Conversation";
import { useTheme } from "../../lib/theme";
import { PFM } from "../../theme/post";
import { REVEAL } from "./build-items";

/* THE ONE THRESHOLD, SAID ON THE PAGE — both sides of it (owner,
   2026-10-10), under the pen-pal chat's header while names aren't traded.
   Each side has its five cells and one line says who still owes what; once
   your five are in it says so, because more from you won't move it (the
   one thing a counter must never invite is filler). Ink until a side is
   full, ind when it is — no green. Not dismissable: it's the product's
   only gate, in two lines. A gone thread has no band (spec bug 6).

     YOU ■□□□□   NO. 8768 ■□□□□
     4 MORE FROM YOU · 4 FROM THEM → NAMES

   It draws the record the Swift header draws (build-items lettersBand, on
   the header's `band`), so the two can't drift: the second label is the
   header's own name in capitals — "NO. 8768", or with the identity switch
   on the courier name. Brought back under the header's rule, replacing the
   header's five dots (owner, 2026-10-19).

   10a: the theme's ink / line / ind, mono semibold 10, no rule under it.
   One VoiceOver element. */

export function ReachBand({ band }: { band: KChatBand }) {
  const { t: tk } = useTheme();
  const cells = (n: number) => (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {Array.from({ length: REVEAL }, (_, i) => (
        <View key={i} style={{ width: 8, height: 8, backgroundColor: n >= REVEAL ? tk.ind : i < n ? tk.ink : tk.line }} />
      ))}
    </View>
  );
  const label = { ...PFM.monoSemi, fontSize: 10, letterSpacing: 1.2, color: tk.sub } as const;
  return (
    <View accessible accessibilityLabel={band.a11y} style={{ paddingHorizontal: 16, paddingTop: 9, paddingBottom: 10, backgroundColor: tk.bg }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 16, rowGap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text maxFontSizeMultiplier={2.2} style={label}>{band.youLabel}</Text>
          {cells(band.me)}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 }}>
          <Text maxFontSizeMultiplier={2.2} style={[label, { flexShrink: 1 }]}>
            {band.themLabel}
          </Text>
          {cells(band.them)}
        </View>
      </View>
      <Text maxFontSizeMultiplier={2.2} adjustsFontSizeToFit minimumFontScale={0.8} style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 1.2, color: band.named ? tk.ind : tk.ink, marginTop: 7 }}>
        {band.line}
      </Text>
    </View>
  );
}
