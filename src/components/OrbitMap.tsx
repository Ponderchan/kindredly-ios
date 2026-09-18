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
import { threadState } from "../lib/thread-state";
import type { ThreadSummary } from "../lib/db";
import { t, useLang } from "../lib/i18n";

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

const RX_VOID = RX_MAX + 14; // hasn't written back yet — out past every ring

const FACE = 17.6; // 5 cells × 2.8 + 4 gaps × 0.9 — narrower than a lane

function ringRx(p: number): number {
  return RX_MIN + (RX_MAX - RX_MIN) * ((REVEAL - p) / (REVEAL - 1));
}
const RINGS = Array.from({ length: REVEAL }, (_, i) => ringRx(i + 1));

export function OrbitMap({ items, empty }: { items: ThreadSummary[]; empty?: boolean }) {
  /* NOBODY WHO IS NO LONGER THERE. 0009 nulls a deleted account's side of
     the thread — the letters survive, the person does not — so `other` can
     be null and there is no one to place on a ring. The correspondence is
     still readable in the list; it just has nothing to draw here. */
  /* THE LANDED ARE NOT DRAWN (the owner's B3). Names traded means they
     have left the orbit; they sit in their own row under the sky, and the
     sky is only ever the ones still on their way. */
  const present = items.filter((t) => !!t.other && !t.revealed);
  const approaching = present;

  const faces = approaching.map((t, i) => {
    /* radius runs on THEIR letters, like the face itself — one mechanic,
       two projections. Ring p holds the person who has written p letters,
       so EVERY letter moves them exactly one ring in. Nobody who has
       written nothing stands on a ring: they wait in the void outside,
       not yet on the path. (This used to clamp to 1, which parked the
       silent and the once-answered on the same ring and made the first
       letter — the hardest one — count for nothing.) */
    const p = Math.min(t.theirs, REVEAL);
    const rx = p === 0 ? RX_VOID : ringRx(p);
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

      {/* the ones circling in — no label, no number; the sky says it */}
      {faces.map(({ t, develop, rx, ry, a0 }, i) => (
        <OrbitingFace
          key={t.id}
          seed={t.other}
          develop={develop}
          rx={rx}
          ry={ry}
          a0={a0}
          order={i}
          mark={threadState(t)?.needsYou ? "answered" : t.theirSigned ? "signed" : null}
        />
      ))}

      <Label x={CX} y={CY + 13} hidden={!empty}>
        <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 2, color: P.ink40 }}>{t("ui.you")}</Text>
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
  mark,
}: {
  seed: string;
  develop: number;
  rx: number;
  ry: number;
  a0: number;
  order: number;
  /** the two states that ask something of you: they answered and you never
      wrote back (pen), or their name is enclosed waiting on yours (brass) */
  mark?: "answered" | "signed" | null;
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
      <Animated.View entering={FadeIn.duration(320).delay(60 + order * 30)}>
        <MosaicId seed={seed} cell={2.8} gap={0.9} develop={develop} />
        {mark && (
          <View
            style={{
              position: "absolute",
              right: -6,
              top: -6,
              width: 5,
              height: 5,
              backgroundColor: mark === "answered" ? P.pen : P.brassSeal,
            }}
          />
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
