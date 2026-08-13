import Svg, { Circle, G, Text as SvgText } from "react-native-svg";
import { C, F } from "../theme/tokens";
import { hashStr } from "../lib/format";
import type { ThreadSummary } from "../lib/db";

/* Kindreds as an orbit (design K1f): you're the dark point at the centre, each
   correspondent a dot on a ring. Every reply pulls them one ring closer; at the
   centre (5 each way) Wren trades your names and the dot wears one. */

const REVEAL = 5;
const RING = "#C7C3DE";

export function OrbitMap({ items, empty }: { items: ThreadSummary[]; empty?: boolean }) {
  const W = 358;
  const H = 292;
  const cx = W / 2;
  const cy = H / 2;
  const R_MIN = 46;
  const R_MAX = 120;

  const dots = items.map((t, i) => {
    const p = t.revealed ? REVEAL : Math.max(1, Math.min(t.mine, REVEAL));
    const r = R_MIN + (R_MAX - R_MIN) * ((REVEAL - p) / (REVEAL - 1));
    const a = -Math.PI / 2 + (i / Math.max(items.length, 1)) * Math.PI * 2 + (((hashStr(t.other) % 44) - 22) * Math.PI) / 180;
    return { t, p, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* the sky — three quiet rings */}
      {[R_MIN, (R_MIN + R_MAX) / 2, R_MAX].map((r, i) => (
        <Circle key={i} cx={cx} cy={cy} r={r} stroke={RING} strokeWidth={1} strokeDasharray="2 6" fill="none" />
      ))}

      {/* you */}
      <Circle cx={cx} cy={cy} r={11} fill={C.ink} />
      {empty && (
        <SvgText x={cx} y={cy + 30} fontSize={10.5} fill={C.faint} textAnchor="middle" fontFamily={F.sansBold} letterSpacing={2}>
          YOU
        </SvgText>
      )}

      {/* the ones circling in — nameless dots (closeness is the position), only
          a revealed one wears a name */}
      {dots.map(({ t, p, x, y }) => (
        <G key={t.id}>
          <Circle cx={x} cy={y} r={t.revealed ? 9 : 7} fill={t.revealed ? C.purpleMid : `rgba(109,109,246,${(0.32 + 0.5 * (p / REVEAL)).toFixed(2)})`} />
          {t.revealed && (
            <SvgText x={x} y={y + 23} fontSize={13.5} fill={C.ink} textAnchor="middle" fontFamily={F.serif}>
              {t.otherName || ""}
            </SvgText>
          )}
        </G>
      ))}
    </Svg>
  );
}
