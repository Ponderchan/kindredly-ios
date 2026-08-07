import { Pressable, Text, View } from "react-native";
import { C, F, cardStyle } from "../theme/tokens";
import { MoodIcon } from "./MoodIcon";
import { Wren } from "./Wren";
import { getMood } from "../data/moods";
import { dShort } from "../lib/format";

/* The daily Morning Page — v20 presentation (light card, mood watermark, serif
   quote), recolored to the blue-white palette. A line someone let drift out,
   chosen for you; writing back goes straight to them. */
export function MorningPage({
  fragment,
  mood,
  kept,
  onKeep,
  onWrite,
}: {
  fragment: string;
  mood?: string | null;
  kept?: boolean;
  onKeep?: () => void;
  onWrite?: () => void;
}) {
  const m = getMood(mood);
  return (
    <View style={[cardStyle, { borderRadius: 22, overflow: "hidden", backgroundColor: C.purpleLt, padding: 24 }]}>
      <View style={{ position: "absolute", right: -18, bottom: -14 }}>
        <MoodIcon id={m.id} size={130} watermark />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Wren size={18} mode="line" />
          <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1.4, color: C.purple }}>
            今天别人写的一句
          </Text>
        </View>
        <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 0.6, color: C.faint }}>
          {dShort(new Date()).toUpperCase()}
        </Text>
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 22, lineHeight: 32, color: C.ink }}>“{fragment}”</Text>
      <Text style={{ fontFamily: F.sans, fontSize: 12.5, color: C.faint, marginTop: 14 }}>— 一个陌生人</Text>
      <Text style={{ fontFamily: F.sans, fontSize: 13, lineHeight: 20, color: C.muted, marginTop: 14 }}>
        这是某个人写下、还没人回的一句话。你回一句，会
        <Text style={{ color: C.purple, fontFamily: F.sansSemi }}>直接发给 ta</Text>。
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 18 }}>
        <Pressable onPress={onWrite} style={{ flex: 1, backgroundColor: C.navy, borderRadius: 26, paddingVertical: 15, alignItems: "center" }}>
          <Text style={{ color: "#fff", fontFamily: F.sansExtra, fontSize: 12.5, letterSpacing: 1 }}>回 ta 一句</Text>
        </Pressable>
        <Pressable
          onPress={onKeep}
          hitSlop={8}
          style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.7)", alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontSize: 18, color: kept ? C.purple : C.faint }}>{kept ? "♥" : "♡"}</Text>
        </Pressable>
      </View>
    </View>
  );
}
