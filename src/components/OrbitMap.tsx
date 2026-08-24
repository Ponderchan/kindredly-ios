import { useEffect } from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  Easing,
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { P, PF } from "../theme/post";
import { hashStr } from "../lib/format";
import { MosaicId } from "./MosaicId";
import type { ThreadSummary } from "../lib/db";

/* Kindreds as an orbit (design K1f): you're the ink square at the centre,
   each stranger drawn inward by the letters they send. The orbit is the
   grammar of APPROACH — coming into view — so once names are traded the
   approach is over: the named LAND, off the rings, beside you. The orbit
   belongs to strangers; the centre is a table.

   The sky shows the faces themselves: every marker is that correspondent's
   MosaicId, developed exactly as far as their letters have carried it —
   the map IS the list, seen from above. SVG carries only the rings; faces
   and labels are real views laid over it so they render crisp.

   AND THE SKY MOVES. Strangers drift along their rings — a full circuit
   takes minutes, slow enough that you only catch it if you linger, each at
   a speed and direction of their own. The landed do not drift: arrival is
   rest. Motion and stillness are the third projection of the same
   mechanic — approaching vs arrived — after radius and resolution. */

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
        {/* the sky — three hairline rings, ink like every other rule.
            ink12 vanished into the wash; ink40 with a denser dash stays
            quiet but actually reads as a path for the faces to ride */}
        {[R_MIN, (R_MIN + R_MAX) / 2, R_MAX].map((r, i) => (
          <Circle key={i} cx={CX} cy={CY} r={r} stroke={P.ink40} strokeWidth={1} strokeDasharray="3 5" fill="none" />
        ))}
      </Svg>

      {/* you — the fixed point, one solid cell */}
      <View pointerEvents="none" style={{ position: "absolute", left: CX - 6, top: CY - 6, width: 12, height: 12, backgroundColor: P.ink }} />

      {/* the ones who landed — full faces at the table, named, still */}
      {seats.map(({ t, x, y }, i) => (
        <Animated.View
          key={t.id}
          entering={FadeIn.duration(500).delay(120 + i * 80)}
          pointerEvents="none"
          style={{ position: "absolute", left: x - FACE_LANDED / 2, top: y - FACE_LANDED / 2 }}
        >
          <MosaicId seed={t.other} cell={3.8} gap={1} />
        </Animated.View>
      ))}

      {/* the ones circling in — no label, no number; the sky says it.
          A brass cell rides with anyone whose name is enclosed and
          waiting on yours: the one warm signal in the sky. */}
      {faces.map(({ t, develop, x, y }, i) => (
        <OrbitingFace key={t.id} seed={t.other} develop={develop} x={x} y={y} order={i} signed={!!t.theirSigned} />
      ))}

      {seats.map(({ t, x, y, above }) => (
        <Label key={t.id} x={x} y={above ? y - FACE_LANDED / 2 - 22 : y + FACE_LANDED / 2 + 5}>
          {/* a wash plate under the name — drifting strangers pass BEHIND
              the label instead of through it */}
          <Text style={{ fontFamily: PF.letter, fontSize: 13.5, fontWeight: "600", color: P.ink, backgroundColor: P.penWash, paddingHorizontal: 4 }}>
            {t.otherName || "A kindred"}
          </Text>
        </Label>
      ))}

      <Label x={CX} y={CY + 12} hidden={!empty}>
        <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 2, color: P.ink40 }}>YOU</Text>
      </Label>
    </View>
  );
}

/* One stranger adrift. The outer wrapper is the full sky rotating about its
   centre, which carries the face along its ring; the face counter-rotates so
   it stays upright — a moon that always shows you the same side. Speed and
   direction are deterministic per correspondent (2.5–4.5 minutes a circuit),
   slow enough to be weather, not spectacle. Honors Reduce Motion. */
function OrbitingFace({ seed, develop, x, y, order, signed }: { seed: string; develop: number; x: number; y: number; order: number; signed?: boolean }) {
  const h = hashStr(seed + "@drift");
  const dir = (h & 1) === 0 ? 1 : -1;
  const duration = 150000 + (h % 120000); // ms per full circuit

  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withRepeat(
      withTiming(1, { duration, easing: Easing.linear, reduceMotion: ReduceMotion.System }),
      -1,
      false,
    );
  }, [turn, duration]);

  const sky = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360 * dir}deg` }] }));
  const upright = useAnimatedStyle(() => ({ transform: [{ rotate: `${-turn.value * 360 * dir}deg` }] }));

  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: W, height: H }, sky]}>
      <Animated.View
        entering={FadeIn.duration(500).delay(160 + order * 80)}
        style={[{ position: "absolute", left: x - FACE / 2, top: y - FACE / 2 }, upright]}
      >
        <MosaicId seed={seed} cell={3} gap={1} develop={develop} />
        {signed && (
          <View style={{ position: "absolute", right: -6, top: -6, width: 5, height: 5, backgroundColor: P.brassSeal }} />
        )}
      </Animated.View>
    </Animated.View>
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
