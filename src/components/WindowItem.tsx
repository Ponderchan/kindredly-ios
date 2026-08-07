import { Text, View } from "react-native";
import { C, F, cardStyle } from "../theme/tokens";
import { MoodIcon } from "./MoodIcon";
import { getMood } from "../data/moods";
import type { WindowPost } from "../lib/db";

/* Renders a "window" post (a line + mood) — yours, or a kindred's. */
export function WindowItem({ item, empty }: { item: WindowPost | null; empty?: string }) {
  if (!item) {
    return (
      <View style={[cardStyle, { padding: 20, alignItems: "center" }]}>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 14, color: C.faint, textAlign: "center", lineHeight: 22 }}>
          {empty || "Nothing in the window yet."}
        </Text>
      </View>
    );
  }
  const m = getMood(item.mood);
  return (
    <View style={[cardStyle, { padding: 20, backgroundColor: m.bg, overflow: "hidden" }]}>
      <View style={{ position: "absolute", right: -12, bottom: -8 }}>
        <MoodIcon id={m.id} size={80} watermark />
      </View>
      <Text style={{ fontFamily: F.serif, fontSize: 17, lineHeight: 27, color: C.ink }}>{item.body}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 }}>
        <MoodIcon id={m.id} size={18} plate={false} />
        <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1, color: C.muted }}>{m.n.toUpperCase()}</Text>
      </View>
    </View>
  );
}
