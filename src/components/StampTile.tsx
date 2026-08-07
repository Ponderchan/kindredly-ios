import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getStamp } from "../data/stamps";
import { shade } from "../lib/format";
import { shadow } from "../theme/tokens";

/* A stamp tile — 160° gradient from the stamp's color + centered emoji.
   Ported from kindredly-v20.jsx (87-96); stamp data is the real backend set. */

export function StampTile({ id, w = 40, r = 8 }: { id?: string; w?: number; r?: number }) {
  const s = getStamp(id);
  const col = s ? s.color : "#8B7FE8";
  const e = s ? s.emoji : "✉";
  return (
    <View style={[{ borderRadius: r }, shadow.card]}>
      <LinearGradient
        colors={[shade(col, 30), shade(col, -24)]}
        start={{ x: 0.12, y: 0 }}
        end={{ x: 0.88, y: 1 }}
        style={{
          width: w,
          height: w * 1.22,
          borderRadius: r,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: w * 0.5 }}>{e}</Text>
      </LinearGradient>
    </View>
  );
}
