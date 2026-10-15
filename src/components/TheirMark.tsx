import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { P, PF } from "../theme/post";
import { COLS, ROWS, inkedCells } from "./MosaicId";

/* THEIR MARK — the ritual at both signatures.
   ────────────────────────────────────────────────────────────────────────
   The reveal used to be a name appearing. But a name is the least of what
   ten letters bought you, and this is not a real-name product: what you
   came to know is how someone writes. So the moment is staged as the thing
   it actually is — the face you watched arrive comes apart, and the same
   squares reassemble as their MARK.

   A mark, not a portrait, and specifically a POSTMARK: everything in this
   world gets stamped, and a kindred is someone whose own stamp you now
   carry. The ring is built from their face's own cells — the exact squares
   the reader has been watching for ten letters, lifted out of the grid and
   flown into a circle. Nothing new is drawn; the thing they already know
   is rearranged in front of them, which is the whole point of a ritual
   over a transition.

   Inside the ring: their name, and under it their archetype — the read of
   their writing. The name is the small print of this stamp. */

const SIZE = 188;
const R = 74; // ring radius the cells fly to
const CELL = 9;
const GAP = 3.5;
const GRID = COLS * CELL + (COLS - 1) * GAP;

export function TheirMark({
  seed,
  name,
  archetype,
}: {
  seed: string;
  name: string;
  archetype?: string | null;
}) {
  const cells = Array.from(inkedCells(seed)).map((k) => {
    const [r, c] = k.split(",").map(Number);
    return { key: k, r, c };
  });

  // one clock; every cell reads it with its own delay
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      420,
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.cubic), reduceMotion: ReduceMotion.System }),
    );
  }, [t]);

  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" }}>
      {cells.map((cell, i) => (
        <Fragment key={cell.key} r={cell.r} c={cell.c} order={i} total={cells.length} t={t} />
      ))}

      {/* the ring closes once the cells have landed on it */}
      <Animated.View
        entering={FadeIn.duration(500).delay(1700)}
        pointerEvents="none"
        style={{
          position: "absolute",
          width: R * 2 - 16,
          height: R * 2 - 16,
          borderRadius: R,
          borderWidth: 1,
          borderColor: P.ink12,
        }}
      />

      <Animated.View entering={FadeIn.duration(600).delay(1560)} style={{ alignItems: "center", paddingHorizontal: 18 }}>
        <Text style={{ fontFamily: PF.letter, fontSize: 27, fontWeight: "600", color: P.ink, textAlign: "center" }}>
          {name}
        </Text>
        {!!archetype && (
          <>
            <View style={{ width: 54, height: 1, backgroundColor: P.ink, marginVertical: 7 }} />
            <Text style={{ fontFamily: PF.serifItalic, fontStyle: "italic", fontSize: 13.5, color: P.ink60, textAlign: "center" }}>
              {archetype}
            </Text>
          </>
        )}
      </Animated.View>
    </View>
  );
}

/* one square of their face, travelling from where it sat in the grid to
   its place on the ring — lifted through an arc on the way, so it reads as
   floating up and settling rather than sliding across */
function Fragment({
  r,
  c,
  order,
  total,
  t,
}: {
  r: number;
  c: number;
  order: number;
  total: number;
  t: { value: number };
}) {
  const fromX = c * (CELL + GAP) - GRID / 2 + CELL / 2;
  const fromY = r * (CELL + GAP) - GRID / 2 + CELL / 2;
  const a = -Math.PI / 2 + (order / total) * Math.PI * 2;
  const toX = R * Math.cos(a);
  const toY = R * Math.sin(a);
  const delay = order / total; // stagger inside the same clock

  const style = useAnimatedStyle(() => {
    const raw = (t.value - delay * 0.35) / 0.65;
    const p = Math.max(0, Math.min(1, raw));
    // an arc: rise on the way out, settle on the way in
    const lift = -26 * Math.sin(p * Math.PI);
    return {
      transform: [
        { translateX: fromX + (toX - fromX) * p },
        { translateY: fromY + (toY - fromY) * p + lift },
        { rotate: `${p * 90}deg` },
      ],
      opacity: 0.35 + 0.65 * (p < 0.5 ? 1 - p : p),
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", width: CELL, height: CELL, backgroundColor: P.ink }, style]}
    />
  );
}
