import { Text, View } from "react-native";
import { t, useLang } from "../../lib/i18n";
import { useTheme } from "../../lib/theme";
import { PF } from "../../theme/post";
import { penPalName } from "../../lib/format";
import { REVEAL, bandFacts } from "./build-items";

/* THE ONE THRESHOLD, SAID ON THE PAGE — both sides of it (owner,
   2026-10-10), under the pen-pal chat's header while names aren't traded.
   Each side has its five cells and one line says who still owes what; once
   your five are in it says so, because more from you won't move it (the
   one thing a counter must never invite is filler). Ink until a side is
   full, ind when it is — no green. Not dismissable: it's the product's
   only gate, in two lines. A gone thread has no band (spec bug 6).

   10a: the theme's ink / line / ind, mono 10 (the 9/10/11 rule), no rule
   under it (the header has none either). One VoiceOver element. */

export function ReachBand({ myCount, otherCount, other }: { myCount: number; otherCount: number; other: string | null }) {
  useLang();
  const { t: tk } = useTheme();
  const band = bandFacts(myCount, otherCount, t);
  const cells = (n: number) => (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {Array.from({ length: REVEAL }, (_, i) => (
        <View key={i} style={{ width: 8, height: 8, backgroundColor: n >= REVEAL ? tk.ind : i < n ? tk.ink : tk.line }} />
      ))}
    </View>
  );
  const label = { fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.2, color: tk.sub } as const;
  return (
    <View accessible accessibilityLabel={t("ch.band.a11y", { me: band.me, them: band.them })} style={{ paddingHorizontal: 16, paddingTop: 2, paddingBottom: 10, backgroundColor: tk.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={label}>{t("ch.band.you")}</Text>
          {cells(band.me)}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 }}>
          <Text numberOfLines={1} style={label}>
            {penPalName(other, { upper: true })}
          </Text>
          {cells(band.them)}
        </View>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.2, color: band.named ? tk.ind : tk.ink, marginTop: 7 }}>
        {band.line}
      </Text>
    </View>
  );
}
