import { Pressable, Text, View } from "react-native";
import Svg, { Circle, G, Line, Path } from "react-native-svg";
import { C, F, cardStyle } from "../theme/tokens";
import { WrenBird } from "./WrenBird";
import type { VoiceRead } from "../lib/voice";

/* YOUR VOICE — the hero of Me's "You" room. Not a fingerprint, not a metric:
   the little things Wren noticed. Empty: Wren still listening. With data: a
   small constellation (one star lit per piece of writing — your voice map,
   filling in as you write), three soft trait lines, and Wren's pull-quote.
   The whole card opens the nine-signal read. */

export function VoiceCard({
  read,
  quote,
  units,
  lettersSent,
  onOpen,
}: {
  read: VoiceRead;
  quote: string; // Wren's line (AI when available, local otherwise)
  units: number[]; // rhythm beats from the real text — they place the stars
  lettersSent: number;
  onOpen: () => void;
}) {
  const empty = read.pieces === 0;
  const count = lettersSent > 0 ? `${lettersSent} ${lettersSent === 1 ? "letter" : "letters"}` : `${read.pieces} ${read.pieces === 1 ? "page" : "pages"}`;

  return (
    <Pressable onPress={empty ? undefined : onOpen} style={({ pressed }) => [cardStyle, { padding: 20, opacity: pressed && !empty ? 0.96 : 1 }]}>
      {/* eyebrow */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
        <Text style={{ fontSize: 12 }}>✦</Text>
        <Text style={{ fontFamily: F.sansExtra, fontSize: 10.5, letterSpacing: 1.6, color: C.label, flex: 1 }}>YOUR VOICE</Text>
        {!empty && <Text style={{ fontSize: 15, color: C.faint }}>›</Text>}
      </View>

      {empty ? (
        <View style={{ alignItems: "center", paddingTop: 18, paddingBottom: 4 }}>
          <WrenBird size={92} stage="hatch" mood="listen" />
          <Text style={{ fontFamily: F.serifSemi, fontSize: 18, color: C.ink, textAlign: "center", marginTop: 14 }}>
            Wren is still listening.
          </Text>
          <Text style={{ fontFamily: F.sans, fontSize: 13, color: C.muted, textAlign: "center", marginTop: 8, lineHeight: 20 }}>
            Write more letters, and I'll start noticing{"\n"}the little things that sound like you.
          </Text>
          <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1, color: C.faint, marginTop: 14 }}>0 LETTERS</Text>
        </View>
      ) : (
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, color: C.muted, marginTop: 10, alignSelf: "flex-start" }}>Wren noticed:</Text>

          {/* your voice map — a star for every piece of writing */}
          <Constellation units={units} stars={3 + Math.min(read.pieces, 9)} />

          {/* three soft things, not metrics */}
          <View style={{ alignItems: "center", gap: 5 }}>
            {read.chips.map((ch) => (
              <Text key={ch} style={{ fontFamily: F.sansBold, fontSize: 13.5, color: C.purple }}>
                {ch}
              </Text>
            ))}
          </View>

          <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 22, color: "#3A3644", textAlign: "center", marginTop: 16 }}>
            “{quote}”
          </Text>
          <Text style={{ fontFamily: F.sans, fontSize: 11, color: C.faint, marginTop: 6 }}>— Wren</Text>

          <View style={{ alignSelf: "stretch", flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.lineSoft }}>
            <Text style={{ fontFamily: F.sans, fontSize: 11.5, color: C.muted }}>
              {count} · {read.taking}
            </Text>
            <Text style={{ fontSize: 13, color: C.faint }}>›</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

/* your voice map: stars placed by the real rhythm units on a loose spiral —
   stable per person, one more star for every piece written. The first few
   connect faintly, the way constellations do. */
function Constellation({ units, stars }: { units: number[]; stars: number }) {
  const S = 150;
  const cx = S / 2;
  const cy = S / 2 + 2;
  const u = (i: number) => units[i % Math.max(1, units.length)] ?? 0.5;

  const pts = Array.from({ length: stars }, (_, i) => {
    const a = i * 2.399 + u(i) * 1.4; // golden-angle spread, nudged by the text
    const r = 14 + (i / Math.max(1, stars - 1)) * 48 + u(i + 3) * 9;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) * 0.82, big: i % 3 === 0, w: 0.45 + u(i + 1) * 0.55 };
  });

  // each star joins its nearest elder — a quiet tree, the way constellations read
  const links = pts.slice(1).map((p, k) => {
    const i = k + 1;
    let best = 0;
    let bd = Infinity;
    for (let j = 0; j < i; j++) {
      const d = (p.x - pts[j].x) ** 2 + (p.y - pts[j].y) ** 2;
      if (d < bd) {
        bd = d;
        best = j;
      }
    }
    return [i, best] as const;
  });

  return (
    <Svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      <G>
        {links.map(([a, b], i) => (
          <Line key={`l${i}`} x1={pts[a].x} y1={pts[a].y} x2={pts[b].x} y2={pts[b].y} stroke={C.purpleMid} strokeWidth={1} opacity={0.14} />
        ))}
        {pts.map((p, i) =>
          p.big ? (
            <Path
              key={i}
              d={`M ${p.x} ${p.y - 6} Q ${p.x + 1.6} ${p.y - 1.6} ${p.x + 6} ${p.y} Q ${p.x + 1.6} ${p.y + 1.6} ${p.x} ${p.y + 6} Q ${p.x - 1.6} ${p.y + 1.6} ${p.x - 6} ${p.y} Q ${p.x - 1.6} ${p.y - 1.6} ${p.x} ${p.y - 6} Z`}
              fill={C.purpleMid}
              opacity={0.5 + p.w * 0.5}
            />
          ) : (
            <Circle key={i} cx={p.x} cy={p.y} r={1.4 + p.w * 1.4} fill={i % 2 ? "#9A93E8" : C.purpleMid} opacity={0.35 + p.w * 0.55} />
          ),
        )}
      </G>
    </Svg>
  );
}
