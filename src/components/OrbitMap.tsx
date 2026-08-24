import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { C, F } from "../theme/tokens";
import { hashStr } from "../lib/format";
import type { ThreadSummary } from "../lib/db";

/* Kindreds as an orbit (design K1f): you're the dark point at the centre, each
   stranger a dot on a ring, drawn inward by the letters they send. The orbit
   is the grammar of APPROACH — coming into view — so once names are traded
   the approach is over and the dot doesn't keep circling with a name tag on:
   it LANDS. The named leave the rings and sit just beside you, inside the
   innermost ring. The orbit belongs to strangers; the centre is a table.
   Labels are real <Text> laid over the SVG so they render crisp. */

const REVEAL = 5;
const RING = "#C7C3DE";
const W = 358;
const H = 292;
const CX = W / 2;
const CY = H / 2;
const R_MIN = 46;
const R_MAX = 120;
const R_LANDED = 26; // inside the innermost ring, almost touching you

export function OrbitMap({ items, empty }: { items: ThreadSummary[]; empty?: boolean }) {
  const approaching = items.filter((t) => !t.revealed);
  const landed = items.filter((t) => t.revealed);

  const dots = approaching.map((t, i) => {
    // radius runs on THEIR letters, like the developing face — coming into
    // view is one mechanic in two projections
    const p = Math.max(1, Math.min(t.theirs, REVEAL));
    const r = R_MIN + (R_MAX - R_MIN) * ((REVEAL - p) / (REVEAL - 1));
    const a = -Math.PI / 2 + (i / Math.max(approaching.length, 1)) * Math.PI * 2 + (((hashStr(t.other) % 44) - 22) * Math.PI) / 180;
    return { t, p, x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
  });

  const seats = landed.map((t, i) => {
    const a = -Math.PI / 2 + (i / Math.max(landed.length, 1)) * Math.PI * 2 + (((hashStr(t.other) % 24) - 12) * Math.PI) / 180;
    const y = CY + R_LANDED * Math.sin(a);
    return { t, x: CX + R_LANDED * Math.cos(a), y, above: y < CY };
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
        {/* the ones who landed — beside you, off the rings */}
        {seats.map(({ t, x, y }) => (
          <Circle key={t.id} cx={x} cy={y} r={9} fill={C.purpleMid} />
        ))}
        {/* the ones circling in */}
        {dots.map(({ t, p, x, y }) => (
          <Circle key={t.id} cx={x} cy={y} r={7} fill={`rgba(109,109,246,${(0.32 + 0.5 * (p / REVEAL)).toFixed(2)})`} />
        ))}
      </Svg>

      {/* crisp labels over the top */}
      <Label x={CX} y={CY + 15} hidden={!empty}>
        <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 2, color: C.faint }}>YOU</Text>
      </Label>
      {/* only the named get a label, pushed away from the centre so it never
          sits on your dot — an approaching stranger is just a dot drawing
          inward; the radius says everything a fraction used to */}
      {seats.map(({ t, x, y, above }) => (
        <Label key={t.id} x={x} y={above ? y - 28 : y + 12}>
          <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.ink }}>{t.otherName || "A kindred"}</Text>
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
