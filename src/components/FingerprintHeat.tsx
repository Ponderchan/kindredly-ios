import { Text, View } from "react-native";
import { C, F, cardStyle } from "../theme/tokens";

/* Writing fingerprint as a time-of-day heatmap. 4 rows × 10 columns spanning
   6am→midnight; each cell's weight comes from your writing rhythm. Below it,
   the three style chips and one quiet read from Wren. */

const SCALE = ["#F4F2FB", "#E4E1F7", "#CBC5F1", "#9A93E8", "#3A3AF5"];
const bucket = (v: number) => SCALE[Math.min(4, Math.max(0, Math.floor(v * 5)))];

export function FingerprintHeat({ cells, chips, read }: { cells: number[]; chips: string[]; read: string }) {
  const rows = [0, 1, 2, 3];
  return (
    <View style={[cardStyle, { padding: 20 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 16 }}>
        <Text style={{ fontSize: 12 }}>🖊</Text>
        <Text style={{ fontFamily: F.sansExtra, fontSize: 10.5, letterSpacing: 1.6, color: C.label }}>WRITING FINGERPRINT</Text>
      </View>

      <View style={{ gap: 6 }}>
        {rows.map((r) => (
          <View key={r} style={{ flexDirection: "row", gap: 6 }}>
            {Array.from({ length: 10 }, (_, c) => (
              <View key={c} style={{ flex: 1, aspectRatio: 1, borderRadius: 6, backgroundColor: bucket(cells[r * 10 + c] ?? 0) }} />
            ))}
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
        {["6AM", "NOON", "6PM", "MIDNIGHT"].map((t) => (
          <Text key={t} style={{ fontFamily: F.sansBold, fontSize: 8.5, letterSpacing: 0.8, color: C.faint }}>{t}</Text>
        ))}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
        {chips.map((ch) => (
          <View key={ch} style={{ backgroundColor: C.purpleLt, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={{ fontFamily: F.sansBold, fontSize: 13, color: C.purple }}>{ch}</Text>
          </View>
        ))}
      </View>

      <Text style={{ fontFamily: F.serifItalic, fontSize: 14, color: C.muted, marginTop: 14 }}>{read}</Text>
    </View>
  );
}
