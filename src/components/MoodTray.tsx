import { Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { MOODS, MOOD_IDS, type MoodId } from "../data/moods";
import { MoodIcon } from "./MoodIcon";
import { PF } from "../theme/post";
import { useP, useTheme } from "../lib/theme";

/* THE MOOD TRAY (owner, 2026-09-20) — the sealed page's answer to the
   letter's stamp tray. The round key on the bar shows a blank face until
   a mood is picked, then that mood's face; tapping it opens this under
   the bar, where the keyboard was, and a tap on a face closes it. Same
   height and ground as the stamp tray so the two composers feel like one
   hand made them. */
export const MOOD_TRAY_H = 296;

export function MoodTray({ selected, onPick }: { selected: MoodId | null; onPick: (id: MoodId) => void }) {
  const P = useP();
  const tk = useTheme().t;
  return (
    <View style={{ height: MOOD_TRAY_H, backgroundColor: tk.soft, borderTopWidth: 1, borderTopColor: P.ink12 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 10, paddingTop: 16, paddingBottom: 20, flexDirection: "row", flexWrap: "wrap" }} showsVerticalScrollIndicator={false}>
        {MOOD_IDS.map((id) => {
          const on = selected === id;
          return (
            <Pressable key={id} onPress={() => onPick(id)} style={({ pressed }) => ({ width: "20%", alignItems: "center", marginBottom: 14, opacity: pressed ? 0.6 : 1 })}>
              <View style={{ width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", backgroundColor: on ? MOODS[id].bg : "transparent", borderWidth: on ? 1.5 : 0, borderColor: MOODS[id].col }}>
                <MoodIcon id={id} size={40} />
              </View>
              <Text numberOfLines={1} style={{ fontFamily: PF.monoSemi, fontSize: 8.5, letterSpacing: 0.6, color: on ? MOODS[id].col : P.ink60, marginTop: 5 }}>
                {MOODS[id].n.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/* the blank face on the key before a mood is chosen */
export function MoodKeyGlyph({ size = 26, color: given }: { size?: number; color?: string }) {
  const P = useP();
  const color = given ?? P.ink;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Circle cx={9} cy={10} r={0.9} fill={color} stroke="none" />
      <Circle cx={15} cy={10} r={0.9} fill={color} stroke="none" />
      <Path d="M8.5 14.5c1 1.4 2.2 2 3.5 2s2.5-.6 3.5-2" />
    </Svg>
  );
}
