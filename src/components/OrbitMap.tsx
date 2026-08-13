import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { C, F } from "../theme/tokens";
import { hashStr } from "../lib/format";
import type { ThreadSummary } from "../lib/db";

/* Kindreds as an orbit (design K1f): you're the dark point at the centre, each
   correspondent a dot on a ring. Every reply pulls them one ring closer; at the
   centre (5 each way) Wren trades your names and the dot wears one. Labels are
   real <Text> laid over the SVG so they render crisp (SVG text went muddy). */

const REVEAL = 5;
const RING = "#C7C3DE";
const W = 358;
const H = 292;
const CX = W / 2;
const CY = H / 2;
const R_MIN = 46;
const R_MAX = 120;

export function OrbitMap({ items, empty }: { items: ThreadSummary[]; empty?: boolean }) {
  const dots = items.map((t, i) => {
    const p = t.revealed ? REVEAL : Math.max(1, Math.min(t.mine, REVEAL));
    const r = R_MIN + (R_MAX - R_MIN) * ((REVEAL - p) / (REVEAL - 1));
    const a = -Math.PI / 2 + (i / Math.max(items.length, 1)) * Math.PI * 2 + (((hashStr(t.other) % 44) - 22) * Math.PI) / 180;
    return { t, p, x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
  });

  return (
    <View style={{ width: W, height: H }}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* the sky — three quiet rings */}
        {[R_MIN, (R_MIN + R_MAX) / 2, R_MAX].map((r, i) => (
          <Circle key={i} cx={CX} cy={CY} r={r} stroke={RING} strokeWidth={1} strokeDasharray="2 6" fill="none" />
        ))}
        {/* you */}
        <Circle cx={CX} cy={CY} r={11} fill={C.ink} />
        {/* the ones circling in */}
        {dots.map(({ t, p, x, y }) => (
          <Circle key={t.id} cx={x} cy={y} r={t.revealed ? 9 : 7} fill={t.revealed ? C.purpleMid : `rgba(109,109,246,${(0.32 + 0.5 * (p / REVEAL)).toFixed(2)})`} />
        ))}
      </Svg>

      {/* crisp labels over the top */}
      <Label x={CX} y={CY + 15} hidden={!empty}>
        <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 2, color: C.faint }}>YOU</Text>
      </Label>
      {dots.map(({ t, p, x, y }) => (
        <Label key={t.id} x={x} y={y + (t.revealed ? 14 : 12)}>
          {t.revealed ? (
            <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.ink }}>{t.otherName || "A kindred"}</Text>
          ) : (
            <Text style={{ fontFamily: F.sansBold, fontSize: 11.5, color: "#8B84B8" }}>{p}/5</Text>
          )}
        </Label>
      ))}
    </View>
  );
}

/* an absolutely-placed, horizontally-centred label anchored at (x, y) */
function Label({ x, y, hidden, children }: { x: number; y: number; hidden?: boolean; children: React.ReactNode }) {
  if (hidden) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: x - 60, top: y, width: 120, alignItems: "center" }}>
      {children}
    </View>
  );
}
