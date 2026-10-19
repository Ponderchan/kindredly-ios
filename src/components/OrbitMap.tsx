import { useEffect, type ReactNode } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import Svg, { Ellipse } from "react-native-svg";
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  ReduceMotion,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
  type SharedValue,
} from "react-native-reanimated";
import { useIsFocused } from "expo-router";
import { PF } from "../theme/post";
import { useTheme } from "../lib/theme";
import { MosaicId } from "./MosaicId";
import { Frost } from "./Frost";
import { StampEdge } from "./StampAvatar";
import { useMemberStamps } from "../lib/member-marks";
import type { FrostSpec } from "../lib/frost";
import type { OrbitVM } from "../screens/kindreds/kindreds-model";
import { t, useLang } from "../lib/i18n";

/* Kindreds as an orbit (design K1f), drawn by React Native — the Kindreds
   fallback's sky (KindredsSky) and the empty state's (KindredsEmpty). You're
   the ink square at the centre, each stranger drawn inward by the letters
   they send. The orbit is the grammar of APPROACH — coming into view — so
   once names are traded the approach is over and they aren't drawn here
   (owner B3); a closed account has no one to place. The model
   (screens/kindreds/kindreds-model orbitItems) decides who is on it and
   where: the SwiftUI orbit (KOrbit) draws the very same items.

   The sky shows the faces themselves: every marker is that correspondent's
   MosaicId, developed as far as their letters have carried it, inked in
   ind when it is your turn to write to them (10a: the face says it, the
   old corner marks went). SVG carries only the rings; faces are real views
   laid over it so they render crisp.

   WITH THE IDENTITY SWITCH ON (identity Phase 1; the owner's "轨道那里也要
   同步", 2026-10-18) every marker is that pen pal's frosted window instead
   (the model's `frost`: the same FROST v1 window they wear on the desk, the
   row and the chat), square with corners at 25%, at the face's 17.6 —
   under lib/frost's detail size, so base, lights and hairline only. It
   never develops: the same window on every ring, and the ring itself is
   the progress. Your turn is a 1.5pt ind ring round the window
   (components/Frost `ring`) instead of the mosaic inked in ind. Folded, a
   window shrinks to the same tick as a face. You, the rings, the drift and
   the arrival fade are unchanged; switch off, all of it is exactly as it
   was.

   PROPORTION. Rings are ELLIPSES (ry ≈ .78 rx) as wide as the screen
   allows, measured now (useWindowDimensions) rather than once at module
   load, so a size change can't leave a stale sky. Lane width exceeds face
   width at every point on the ring.

   ONE RING PER LETTER. Ring p holds the person who has sent you p letters,
   so every letter moves them one ring in; someone who has written nothing
   waits in the void outside.

   AND THE SKY MOVES, slowly: a circuit takes 150–270 s, speed and direction
   per correspondent, from a start angle the model computes over a stable
   order — a reply that re-sorts the list moves nobody. It turns only while
   the tab is focused, and honours Reduce Motion.

   FOLDED TO A HORIZON (`flat` 0 → 1): the rings fade into one line, and
   every stranger slides onto it as a tick, ind for the ones on you. A
   tick's place on the line is how far the two of you are from trading
   names (letters each way), drifting gently about it. */

const REVEAL = 5;
const SQUASH = 0.78; // ry / rx — enough to buy vertical room, not so much it reads as 3D
const RX_MIN = 56;
const FACE = 17.6; // 5 cells × 2.8 + 4 gaps × 0.9 — narrower than a lane
const TICK = 6; // a face, folded onto the horizon
const CLAMP = Extrapolation.CLAMP;

/** The sky's box for a window width, for anything that folds it (KindredsSky). */
export function orbitBox(windowWidth: number) {
  const W = Math.min(398, windowWidth - 8);
  const RX_MAX = Math.min(162, W / 2 - 30); // air, plus half a face, at the widest ring
  const H = Math.round(RX_MAX * SQUASH * 2 + 52);
  return { W, H, CX: W / 2, CY: H / 2, RX_MAX };
}

export function OrbitMap({ items, empty, flat, line = true }: { items: OrbitVM[]; empty?: boolean; flat?: SharedValue<number>; line?: boolean }) {
  useLang();
  const { t: tk } = useTheme();
  const { width: winW } = useWindowDimensions();
  const { W, H, CX, CY, RX_MAX } = orbitBox(winW);
  /* a member's face wears only a 1pt dotted gold edge here (C2, contract D-6): the faces are
     ~17.6, too small for the stamp's ground and denomination */
  const stampOf = useMemberStamps(items.map((o) => o.seed));
  const ringRx = (p: number) => RX_MIN + (RX_MAX - RX_MIN) * ((REVEAL - p) / (REVEAL - 1));
  const rings = Array.from({ length: REVEAL }, (_, i) => ringRx(i + 1));
  const RX_VOID = RX_MAX + 14;

  /* the folded line, in the map's own x: the strip the title spans (the
     screen less 16 a side), less the round button at its right end */
  const LINE_W = winW - 32;
  const LINE_LEFT = CX - LINE_W / 2 + 8;
  const YOU_X = CX + LINE_W / 2 - 28 - 16;
  const STAGE = (YOU_X - 14 - LINE_LEFT) / REVEAL;
  const wobble = Math.min(9, STAGE * 0.3);

  const still = useSharedValue(0);
  const f = flat ?? still;
  const ringsStyle = useAnimatedStyle(() => ({ opacity: interpolate(f.value, [0, 0.8], [1, 0], CLAMP) }));
  const horizon = useAnimatedStyle(() => ({ opacity: interpolate(f.value, [0.45, 1], [0, 0.28], CLAMP) }));
  const you = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(f.value, [0, 1], [0, YOU_X - CX], CLAMP) }, { scale: interpolate(f.value, [0, 1], [1, 0.62], CLAMP) }] }));

  /* folded places: by letters each way, the ones level with each other
     stepped a little apart so they don't sit on one point */
  const level: Record<number, number> = {};
  const crowd: Record<number, number> = {};
  for (const o of items) crowd[o.each] = (crowd[o.each] ?? 0) + 1;
  const lineX = (each: number, nth: number, of: number) => LINE_LEFT + each * STAGE + nth * Math.min(7, (STAGE * 0.8) / Math.max(1, of - 1));

  return (
    <View style={{ width: W, height: H }}>
      <Animated.View style={ringsStyle}>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* five hairline rings, one per letter, fading outward */}
          {rings.map((rx, i) => (
            <Ellipse key={i} cx={CX} cy={CY} rx={rx} ry={rx * SQUASH} stroke={tk.ink} strokeOpacity={0.16 + i * 0.05 /* rings[0] is the outermost */} strokeWidth={1} strokeDasharray="3 5" fill="none" />
          ))}
        </Svg>
      </Animated.View>

      {/* the horizon the rings fold into — unless something else draws that line */}
      {line && <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 10, right: 10, top: CY - 0.5, height: 1, backgroundColor: tk.ink }, horizon]} />}

      {/* you — the fixed point, one solid cell */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: CX - 6.5, top: CY - 6.5, width: 13, height: 13, backgroundColor: tk.ink }, you]} />

      {/* the ones circling in — no label, no number; the sky says it */}
      {items.map((o, i) => {
        const nth = (level[o.each] = (level[o.each] ?? -1) + 1);
        const rx = o.ring === 0 ? RX_VOID : ringRx(o.ring);
        return (
          <OrbitingFace
            key={o.id}
            seed={o.seed}
            develop={o.develop}
            frost={o.frost}
            turn={o.turn}
            stamped={!!stampOf(o.seed)}
            rx={rx}
            ry={rx * SQUASH}
            a0={o.a0}
            dir={o.dir}
            period={o.period}
            lx={lineX(o.each, nth, crowd[o.each]) - CX}
            cx={CX}
            cy={CY}
            wobble={wobble}
            order={i}
            ink={o.turn ? tk.ind : tk.ink}
            flat={f}
          />
        );
      })}

      {empty && (
        <Label x={CX} y={CY + 13}>
          <Text style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 2, color: tk.mute }}>{t("ui.you")}</Text>
        </Label>
      )}
    </View>
  );
}

const WOBBLE_TURNS = 22; // to-and-fros per full circuit of its ring: one every ~7–12s

/* One stranger adrift: the angle animates, the face is placed. */
function OrbitingFace({
  seed,
  develop,
  frost,
  turn: yours,
  stamped,
  rx,
  ry,
  a0,
  dir,
  period,
  lx,
  cx,
  cy,
  wobble,
  order,
  ink,
  flat,
}: {
  seed: string;
  develop: number;
  /** switch on: their frosted window, drawn instead of the mosaic (never developing) */
  frost: FrostSpec | null;
  /** it is your turn: the window wears the ind ring (the mosaic is inked in `ink` instead) */
  turn: boolean;
  /** a member (C2): the 1pt dotted gold edge round the face, fading with it on the fold */
  stamped: boolean;
  rx: number;
  ry: number;
  a0: number;
  dir: 1 | -1;
  /** seconds per circuit */
  period: number;
  /** where it sits on the folded line, from the centre */
  lx: number;
  cx: number;
  cy: number;
  wobble: number;
  order: number;
  ink: string;
  flat: SharedValue<number>;
}) {
  const duration = period * 1000;
  /* the angle runs on the wall clock, so a face is where it would have been
     when the tab comes back rather than snapped back to its start */
  const phase0 = () => (Date.now() % duration) / duration;
  const turn = useSharedValue(phase0());
  /* the sky turns only while it is on show: orbits ticking on a tab nobody
     is looking at is work for nothing (stall probe, 2026-09-20) */
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused) {
      cancelAnimation(turn);
      return;
    }
    const start = phase0();
    turn.value = start;
    turn.value = withRepeat(withTiming(start + 1, { duration, easing: Easing.linear, reduceMotion: ReduceMotion.System }), -1, false);
    // phase0 reads the clock; duration is the only input
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, duration, focused]);

  const orbit = useAnimatedStyle(() => {
    const ang = a0 + turn.value * Math.PI * 2 * dir;
    const k = flat.value;
    const wob = Math.sin(ang * WOBBLE_TURNS) * wobble;
    return { transform: [{ translateX: rx * Math.cos(ang) * (1 - k) + (lx + wob) * k }, { translateY: ry * Math.sin(ang) * (1 - k) }] };
  });
  /* folding: the face shrinks to a tick, its mosaic giving way to one solid
     cell in the colour of what it asks of you */
  const body = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(flat.value, [0, 1], [1, TICK / FACE], CLAMP) }] }));
  const face = useAnimatedStyle(() => ({ opacity: interpolate(flat.value, [0, 0.7], [1, 0], CLAMP) }));
  const tick = useAnimatedStyle(() => ({ opacity: interpolate(flat.value, [0.3, 1], [0, 1], CLAMP) }));

  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: cx - FACE / 2, top: cy - FACE / 2 }, orbit]}>
      <Animated.View entering={FadeIn.duration(320).delay(60 + order * 30)}>
        <Animated.View style={body}>
          <Animated.View style={face}>
            {frost ? <Frost spec={frost} size={FACE} ring={yours ? ink : null} /> : <MosaicId seed={seed} cell={2.8} gap={0.9} develop={develop} color={ink} />}
            {stamped && <StampEdge size={FACE} />}
          </Animated.View>
          <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: FACE, height: FACE, backgroundColor: ink }, tick]} />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

/* an absolutely-placed, horizontally-centred label anchored at (x, y) */
function Label({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: x - 60, top: y, width: 120, alignItems: "center" }}>
      {children}
    </View>
  );
}
