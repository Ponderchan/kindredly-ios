import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { P, PF } from "../theme/post";
import { hashStr } from "../lib/format";
import { MosaicId } from "./MosaicId";
import type { ThreadSummary } from "../lib/db";

/* Kindreds as an orbit (design K1f): you're the ink square at the centre,
   each stranger drawn inward by the letters they send. The orbit is the
   grammar of APPROACH — coming into view — so once names are traded the
   approach is over: the named LAND, off the rings, beside you. The orbit
   belongs to strangers; the centre is a table.

   The dots used to be purple circles from the pre-postal palette — colour
   blobs in a product built of squares and ink, and a contradiction besides:
   slice 170 made the face and the radius one mechanic in two projections,
   then hung anonymous beads in the sky. Now the sky shows the faces
   themselves: every marker is that correspondent's MosaicId, developed
   exactly as far as their letters have carried it. The map IS the list,
   seen from above. SVG carries only the rings; faces and labels are real
   views laid over it so they render crisp. */

const REVEAL = 5;
const W = 358;
const H = 292;
const CX = W / 2;
const CY = H / 2;
const R_MIN = 46;
const R_MAX = 120;
const R_LANDED = 30; // inside the innermost ring, almost at the table

const FACE = 19; // 5 cells × 3 + 4 gaps × 1
const FACE_LANDED = 23; // 5 × 3.8 + 4 × 1

export function OrbitMap({ items, empty }: { items: ThreadSummary[]; empty?: boolean }) {
  const approaching = items.filter((t) => !t.revealed);
  const landed = items.filter((t) => t.revealed);

  const faces = approaching.map((t, i) => {
    // radius runs on THEIR letters, like the face itself — one mechanic,
    // two projections
    const p = Math.max(1, Math.min(t.theirs, REVEAL));
    const r = R_MIN + (R_MAX - R_MIN) * ((REVEAL - p) / (REVEAL - 1));
    const a = -Math.PI / 2 + (i / Math.max(approaching.length, 1)) * Math.PI * 2 + (((hashStr(t.other) % 44) - 22) * Math.PI) / 180;
    return {
      t,
      develop: 0.15 + 0.85 * (Math.min(t.theirs, REVEAL) / REVEAL),
      x: CX + r * Math.cos(a),
      y: CY + r * Math.sin(a),
    };
  });

  const seats = landed.map((t, i) => {
    const a = -Math.PI / 2 + (i / Math.max(landed.length, 1)) * Math.PI * 2 + (((hashStr(t.other) % 24) - 12) * Math.PI) / 180;
    const y = CY + R_LANDED * Math.sin(a);
    return { t, x: CX + R_LANDED * Math.cos(a), y, above: y < CY };
  });

  return (
    <View style={{ width: W, height: H }}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* the sky — three hairline rings, ink like every other rule */}
        {[R_MIN, (R_MIN + R_MAX) / 2, R_MAX].map((r, i) => (
          <Circle key={i} cx={CX} cy={CY} r={r} stroke={P.ink12} strokeWidth={1} strokeDasharray="2 6" fill="none" />
        ))}
      </Svg>

      {/* you — the fixed point, one solid cell */}
      <View pointerEvents="none" style={{ position: "absolute", left: CX - 6, top: CY - 6, width: 12, height: 12, backgroundColor: P.ink }} />

      {/* the ones who landed — full faces at the table, named */}
      {seats.map(({ t, x, y, above }) => (
        <View key={t.id} pointerEvents="none" style={{ position: "absolute", left: x - FACE_LANDED / 2, top: y - FACE_LANDED / 2 }}>
          <MosaicId seed={t.other} cell={3.8} gap={1} />
        </View>
      ))}
      {seats.map(({ t, x, y, above }) => (
        <Label key={t.id} x={x} y={above ? y - FACE_LANDED / 2 - 22 : y + FACE_LANDED / 2 + 5}>
          <Text style={{ fontFamily: PF.letter, fontSize: 13.5, fontWeight: "600", color: P.ink }}>{t.otherName || "A kindred"}</Text>
        </Label>
      ))}

      {/* the ones circling in — each face developed exactly as far as their
          letters have carried it; no label, no number. The sky says it. */}
      {faces.map(({ t, develop, x, y }) => (
        <View key={t.id} pointerEvents="none" style={{ position: "absolute", left: x - FACE / 2, top: y - FACE / 2 }}>
          <MosaicId seed={t.other} cell={3} gap={1} develop={develop} />
        </View>
      ))}

      <Label x={CX} y={CY + 12} hidden={!empty}>
        <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 2, color: P.ink40 }}>YOU</Text>
      </Label>
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
