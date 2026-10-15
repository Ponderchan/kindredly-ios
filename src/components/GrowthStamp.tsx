import { Text, View } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { C } from "../theme/tokens";
import { shade } from "../lib/format";
import { useTheme } from "../lib/theme";
import type { GrowthStamp as StampDef } from "../data/growth";

/* A collectible growth stamp — white postage frame with punched perforations,
   gradient face, emoji mark. Locked stamps go grey with a small padlock.

   The stamp is an object and keeps its own colours in every theme. The one
   exception is the perforations: they are holes, so they are filled with
   whatever the stamp sits on — `ground`, the page by default, the card's
   face when the caller puts it on a card. */
export function GrowthStampTile({
  stamp,
  earned,
  size = 92,
  ground,
}: {
  stamp: StampDef;
  earned: boolean;
  size?: number;
  /** the colour behind the stamp, which the perforations show */
  ground?: string;
}) {
  const { t: tk } = useTheme();
  const hole = ground ?? tk.bg;
  const W = size;
  const H = size * 1.18;
  const r = size * 0.033; // perforation radius
  const holes = 7;
  const inset = size * 0.085;

  const face: [string, string] = earned
    ? [shade(stamp.color, 34), shade(stamp.color, -22)]
    : ["#DFDFDB", "#C6C6C2"];

  const edge = (n: number, horiz: boolean, fixed: number) =>
    Array.from({ length: n }).map((_, i) => {
      const t = ((i + 0.5) / n) * (horiz ? W : H);
      return (
        <Circle
          key={`${horiz ? "h" : "v"}-${fixed}-${i}`}
          cx={horiz ? t : fixed}
          cy={horiz ? fixed : t}
          r={r}
          fill={hole}
        />
      );
    });

  return (
    <View style={{ width: W, height: H }}>
      <Svg width={W} height={H} style={{ position: "absolute" }}>
        <Rect x={0} y={0} width={W} height={H} rx={2} fill="#FFFFFF" stroke={C.line} strokeWidth={0.8} />
        {edge(holes, true, 0)}
        {edge(holes, true, H)}
        {edge(Math.round(holes * 1.18), false, 0)}
        {edge(Math.round(holes * 1.18), false, W)}
      </Svg>
      <LinearGradient
        colors={face}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={{
          position: "absolute",
          left: inset,
          top: inset,
          right: inset,
          bottom: inset,
          borderRadius: 3,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: size * 0.34, opacity: earned ? 1 : 0.3 }}>{stamp.emoji}</Text>
      </LinearGradient>
      {!earned && (
        <View style={{ position: "absolute", right: inset + 3, bottom: inset + 3, width: size * 0.2, height: size * 0.2, borderRadius: size * 0.1, backgroundColor: "rgba(255,255,255,0.85)", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: size * 0.11 }}>🔒</Text>
        </View>
      )}
    </View>
  );
}
