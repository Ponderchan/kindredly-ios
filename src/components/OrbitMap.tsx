import { useEffect } from "react";
import { Dimensions, Text, View } from "react-native";
import Svg, { Ellipse } from "react-native-svg";
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
   MosaicId, developed as far as their letters have carried it — the map IS
   the list, seen from above. SVG carries only the rings; faces and labels
   are real views laid over it so they render crisp.

   PROPORTION (the thing that was wrong). Rings sat 18.5pt apart while a
   face was 19pt wide — every face overlapped its neighbouring rings, so
   the lattice could not breathe and the whole sky read as a small busy
   target floating in a lot of empty page. Three changes, one goal — give
   each face a lane it fits in:

     · the sky is as wide as the screen allows, not a fixed 358
     · the rings are ELLIPSES (ry ≈ 0.78 rx). We have width and we need
       height — the list lives underneath — so an oblique sky buys a much
       larger orbit inside the same vertical budget, and reads as a sky
       rather than a bullseye
     · lane width now exceeds face width at every point on the ring

   ONE RING PER LETTER. Ring radii and face radii come from one function
   so they can never drift apart: every face sits ON a ring, and the rings
   still between it and you are exactly the letters still to come.

   AND THE SKY MOVES. Strangers drift along their rings — a full circuit
   takes 2.5–4.5 minutes, deterministic speed and direction per
   correspondent, slow enough to be weather rather than spectacle. The
   landed do not drift: arrival is rest. Motion and stillness are the
   third projection of the same mechanic, after radius and resolution.
   Drift animates the ANGLE and places the face (an ellipse can't be
   travelled by rotating a wrapper, and this needs no counter-rotation to
   keep faces upright). Honors Reduce Motion. */

const REVEAL = 5;
const WINDOW_W = Dimensions.get("window").width;

const W = Math.min(398, WINDOW_W - 8);
const RX_MAX = Math.min(162, W / 2 - 30); // air, plus half a face, at the widest ring
const RX_MIN = 56;
const SQUASH = 0.78; // ry / rx — enough to buy vertical room, not so much it reads as 3D
const RY_MAX = RX_MAX * SQUASH;
const H = Math.round(RY_MAX * 2 + 52);
const CX = W / 2;
const CY = H / 2;

const SEAT_RX = 38; // where the named sit: clear of you, clear of every ring
const SEAT_RY = SEAT_RX * SQUASH;

const FACE = 17.6; // 5 cells × 2.8 + 4 gaps × 0.9 — narrower than a lane
const FACE_LANDED = 19.6; // 5 × 3.2 + 4 × 0.9

function ringRx(p: number): number {
  return RX_MIN + (RX_MAX - RX_MIN) * ((REVEAL - p) / (REVEAL - 1));
}
const RINGS = Array.from({ length: REVEAL }, (_, i) => ringRx(i + 1));

export function OrbitMap({ items, empty }: { items: ThreadSummary[]; empty?: boolean }) {
  const approaching = items.filter((t) => !t.revealed);
  const landed = items.filter((t) => t.revealed);

  const faces = approaching.map((t, i) => {
    // radius runs on THEIR letters, like the face itself — one mechanic,
    // two projections
    const p = Math.max(1, Math.min(t.theirs, REVEAL));
    const rx = ringRx(p);
    return {
      t,
      rx,
      ry: rx * SQUASH,
      // spread the ring's occupants, then jitter deterministically so two
      // people on the same ring never sit in lockstep
      a0:
        -Math.PI / 2 +
        (i / Math.max(approaching.length, 1)) * Math.PI * 2 +
        (((hashStr(t.other) % 44) - 22) * Math.PI) / 180,
      develop: 0.15 + 0.85 * (Math.min(t.theirs, REVEAL) / REVEAL),
    };
  });

  const seats = landed.map((t, i) => {
    const a = -Math.PI / 2 + (i / Math.max(landed.length, 1)) * Math.PI * 2 + (((hashStr(t.other) % 24) - 12) * Math.PI) / 180;
    const y = CY + SEAT_RY * Math.sin(a);
    return { t, x: CX + SEAT_RX * Math.cos(a), y };
  });

  return (
    <View style={{ width: W, height: H }}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* five hairline rings, one per letter, fading outward: the ring
            someone is about to step onto is the one you feel, and depth
            reads as distance without any ring shouting */}
        {RINGS.map((rx, i) => (
          <Ellipse
            key={i}
            cx={CX}
            cy={CY}
            rx={rx}
            ry={rx * SQUASH}
            stroke={P.ink}
            strokeOpacity={0.16 + i * 0.05 /* RINGS[0] is the outermost */}
            strokeWidth={1}
            strokeDasharray="3 5"
            fill="none"
          />
        ))}
      </Svg>

      {/* you — the fixed point, one solid cell */}
      <View pointerEvents="none" style={{ position: "absolute", left: CX - 6.5, top: CY - 6.5, width: 13, height: 13, backgroundColor: P.ink }} />

      {/* the ones who landed — full faces at the table, named, still */}
      {seats.map(({ t, x, y }, i) => (
        <Animated.View
          key={t.id}
          entering={FadeIn.duration(500).delay(120 + i * 80)}
          pointerEvents="none"
          style={{ position: "absolute", left: x - FACE_LANDED / 2, top: y - FACE_LANDED / 2 }}
        >
          <MosaicId seed={t.other} cell={3.2} gap={0.9} />
        </Animated.View>
      ))}

      {/* the ones circling in — no label, no number; the sky says it */}
      {faces.map(({ t, develop, rx, ry, a0 }, i) => (
        <OrbitingFace key={t.id} seed={t.other} develop={develop} rx={rx} ry={ry} a0={a0} order={i} signed={!!t.theirSigned} />
      ))}

      {/* A name sits BESIDE its face, never above or below it. Stacked
          radially it landed on the next ring out, so the eye read it as
          labelling whichever stranger happened to be drifting past — the
          centre is crowded vertically (you, the seats, the inner ring) and
          roomy horizontally, so the name goes sideways, outward, level
          with the face it belongs to. On a wash plate and above the
          traffic: a stranger passes BEHIND a name, never through it. */}
      {seats.map(({ t, x, y }) => (
        <SideLabel key={t.id} x={x} y={y} outward={x >= CX ? 1 : -1}>
          {t.otherName || "A kindred"}
        </SideLabel>
      ))}

      <Label x={CX} y={CY + 13} hidden={!empty}>
        <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 2, color: P.ink40 }}>YOU</Text>
      </Label>
    </View>
  );
}

/* One stranger adrift: the angle animates, the face is placed. */
function OrbitingFace({
  seed,
  develop,
  rx,
  ry,
  a0,
  order,
  signed,
}: {
  seed: string;
  develop: number;
  rx: number;
  ry: number;
  a0: number;
  order: number;
  signed?: boolean;
}) {
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

  const orbit = useAnimatedStyle(() => {
    const ang = a0 + turn.value * Math.PI * 2 * dir;
    return { transform: [{ translateX: rx * Math.cos(ang) }, { translateY: ry * Math.sin(ang) }] };
  });

  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: CX - FACE / 2, top: CY - FACE / 2 }, orbit]}>
      <Animated.View entering={FadeIn.duration(500).delay(160 + order * 80)}>
        <MosaicId seed={seed} cell={2.8} gap={0.9} develop={develop} />
        {signed && (
          <View style={{ position: "absolute", right: -6, top: -6, width: 5, height: 5, backgroundColor: P.brassSeal }} />
        )}
      </Animated.View>
    </Animated.View>
  );
}

/* a name set level with its face, reading away from the centre */
function SideLabel({ x, y, outward, children }: { x: number; y: number; outward: 1 | -1; children: string }) {
  const gap = FACE_LANDED / 2 + 5;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: outward === 1 ? x + gap : x - gap - 120,
        top: y - 10,
        width: 120,
        alignItems: outward === 1 ? "flex-start" : "flex-end",
      }}
    >
      <Text
        numberOfLines={1}
        style={{ fontFamily: PF.letter, fontSize: 13.5, fontWeight: "600", color: P.ink, backgroundColor: P.penWash, paddingHorizontal: 4 }}
      >
        {children}
      </Text>
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
