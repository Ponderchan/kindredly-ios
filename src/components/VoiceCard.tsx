import { Pressable, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { C, F, cardStyle } from "../theme/tokens";
import { WrenBird } from "./WrenBird";
import type { VoiceRead } from "../lib/voice";

/* YOUR VOICE — the Me tab's hero card. Empty: Wren in the nest, waiting for
   words. With data: a voice-swirl (concentric broken arcs drawn from the
   rhythm units — abstract on purpose, it claims nothing false), the three
   style chips, and Wren's pull-quote. Tapping opens the nine-signal read. */

export function VoiceCard({
  read,
  quote,
  units,
  lettersSent,
  onOpen,
}: {
  read: VoiceRead;
  quote: string; // Wren's line (AI when available, local otherwise)
  units: number[]; // rhythm beats from the real text — seeds the swirl
  lettersSent: number;
  onOpen: () => void;
}) {
  const empty = read.pieces === 0;

  return (
    <Pressable onPress={empty ? undefined : onOpen} style={({ pressed }) => [cardStyle, { padding: 20, opacity: pressed && !empty ? 0.96 : 1 }]}>
      {/* eyebrow */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
        <Text style={{ fontSize: 12 }}>✧</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.sansExtra, fontSize: 10.5, letterSpacing: 1.6, color: C.label }}>YOUR VOICE</Text>
          <Text style={{ fontFamily: F.sans, fontSize: 10.5, color: C.faint, marginTop: 2 }}>The way you sound in words.</Text>
        </View>
        {!empty && <Text style={{ fontSize: 15, color: C.faint }}>›</Text>}
      </View>

      {empty ? (
        <View style={{ alignItems: "center", paddingTop: 18, paddingBottom: 6 }}>
          {/* Wren waiting, little unread bubbles floating by */}
          <View>
            <WrenBird size={96} stage="hatch" mood="curious" />
            <Bubble left={-52} top={10} w={34} />
            <Bubble left={110} top={-4} w={40} />
            <Bubble left={122} top={44} w={26} />
          </View>
          <Text style={{ fontFamily: F.serifSemi, fontSize: 17, color: C.ink, textAlign: "center", marginTop: 16, lineHeight: 24 }}>
            Write a few letters{"\n"}and I'll start to recognize your voice.
          </Text>
          <Text style={{ fontFamily: F.sans, fontSize: 12.5, color: C.muted, textAlign: "center", marginTop: 8, lineHeight: 18 }}>
            Every letter helps Wren understand{"\n"}the real you.
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-end", marginTop: 10 }}>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.faint }}>— Wren</Text>
            <WrenBird size={22} mood="content" />
          </View>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14 }}>
            <VoiceSwirl units={units.length ? units : read.rows.map((r) => r.strength / 5)} />
            <View style={{ flex: 1, marginLeft: 14, gap: 8 }}>
              {read.chips.map((ch) => (
                <View key={ch} style={{ alignSelf: "flex-start", backgroundColor: C.purpleLt, borderRadius: 15, paddingHorizontal: 13, paddingVertical: 7 }}>
                  <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, color: C.purple }}>{ch}</Text>
                </View>
              ))}
              <View style={{ marginTop: 6 }}>
                <Text style={{ fontFamily: F.serif, fontSize: 16, color: C.purpleMid }}>“</Text>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 20, color: "#3A3644" }}>{quote}</Text>
                <Text style={{ fontFamily: F.sans, fontSize: 11, color: C.faint, marginTop: 5 }}>— Wren</Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.lineSoft }}>
            <Text style={{ fontFamily: F.sans, fontSize: 11.5, color: C.muted }}>
              {lettersSent > 0 ? `${lettersSent} letters written · ` : ""}
              {read.taking}
            </Text>
            <Text style={{ fontSize: 13, color: C.faint }}>›</Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

function Bubble({ left, top, w }: { left: number; top: number; w: number }) {
  return (
    <View style={{ position: "absolute", left, top, width: w, height: w * 0.62, borderRadius: 10, backgroundColor: C.purpleLt, opacity: 0.8 }}>
      <View style={{ position: "absolute", left: 7, top: "38%", width: w - 16, height: 2.5, borderRadius: 2, backgroundColor: "#C9C6EE" }} />
    </View>
  );
}

/* the voice-swirl: broken concentric arcs, angles/dashes seeded by the nine
   signal strengths — stable per person, abstract by design */
function VoiceSwirl({ units }: { units: number[] }) {
  const S = 148;
  const cx = S / 2;
  const cy = S / 2;
  const rings = 7;
  return (
    <Svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      <G>
        {Array.from({ length: rings }, (_, i) => {
          const u = units[i % units.length] ?? 0.5;
          const r = 13 + i * 9;
          const circ = 2 * Math.PI * r;
          const dash = circ * (0.3 + u * 0.42);
          const rot = (u * 360 + i * 47) % 360;
          return (
            <Circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={i % 2 ? "#9A93E8" : C.purpleMid}
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ - dash}`}
              opacity={0.4 + u * 0.5}
              transform={`rotate(${rot} ${cx} ${cy})`}
            />
          );
        })}
        <Circle cx={cx} cy={cy} r={4} fill={C.purpleMid} />
      </G>
    </Svg>
  );
}
