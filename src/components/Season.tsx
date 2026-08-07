import { View } from "react-native";
import { MOODS, type MoodId } from "../data/moods";

/* A row of mood-colored bars — the "last N days" chart (v20 145-149). */
export function Season({
  seq,
  h = 24,
  w = 9,
  gap = 3.2,
}: {
  seq: MoodId[];
  h?: number;
  w?: number;
  gap?: number;
}) {
  return (
    <View style={{ flexDirection: "row", gap, alignItems: "flex-end" }}>
      {seq.map((m, i) => (
        <View
          key={i}
          style={{ width: w, height: h, borderRadius: 3, backgroundColor: MOODS[m].col, opacity: 0.82 }}
        />
      ))}
    </View>
  );
}
