import { Text, View } from "react-native";
import { C, F, cardStyle } from "../theme/tokens";
import { VOICE_TRAITS } from "../data/content";

/* The writing-voice card (v20 158-175). `evidence` adds the italic "why" line
   + dividers. `traits` can override the default static VOICE_TRAITS. */

export function VoiceCard({
  who = "Her",
  evidence = false,
  traits = VOICE_TRAITS,
}: {
  who?: string;
  evidence?: boolean;
  traits?: [string, string, string][];
}) {
  return (
    <View style={[cardStyle, { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 16 }}>
        <View style={{ width: 11, height: 11, borderRadius: 2, backgroundColor: C.purple, opacity: 0.85 }} />
        <Text style={{ fontSize: 10.5, fontFamily: F.sansBold, letterSpacing: 1.6, color: C.ink }}>
          {who.toUpperCase()} WRITING VOICE
        </Text>
      </View>
      {traits.map(([k, v, why], i) => (
        <View
          key={k}
          style={{
            marginBottom: evidence ? 16 : 12,
            paddingBottom: evidence && i < traits.length - 1 ? 14 : 0,
            borderBottomWidth: evidence && i < traits.length - 1 ? 1 : 0,
            borderBottomColor: C.lineSoft,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
            <Text style={{ fontSize: 14.5, color: C.ink, fontFamily: F.serif }}>{k}</Text>
            <Text style={{ fontSize: 11, fontFamily: F.sansBold, letterSpacing: 1.1, color: C.muted }}>{v}</Text>
          </View>
          {evidence && (
            <Text
              style={{ fontSize: 12, color: C.faint, marginTop: 6, lineHeight: 19, paddingRight: 20, fontFamily: F.serifItalic }}
            >
              {why}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
