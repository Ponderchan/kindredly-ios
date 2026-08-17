import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { F } from "../theme/tokens";
import { WrenBird } from "./WrenBird";
import { MORNING_HOUR } from "../lib/notify";

/* Close of day — the post office shuts, and you're the one who shuts it.
   The object is a POSTMARK, not a wax seal: ink on paper, the thing a real
   counter clerk slams down to say "processed, dated, done". Wax + candles on a
   dark ground read as a shrine; this is postal graphic design — crisp, flat,
   a little mechanical, the same world as the airmail stripes and the stamps.
   Press and hold: the ink spreads under the stamp, then it lands with the
   date on it. (A haptic thunk belongs on the landing — needs expo-haptics,
   which needs a native rebuild.) */

const PAPER = "#EFE8D8";
const INK = "#C0503A";
const BOARD = "#1A1A18";
const HOLD_MS = 750;

export function CloseOfDay({
  sealed,
  onSeal,
  onWrite,
  onSelf,
  onKept,
}: {
  sealed: boolean;
  onSeal: () => void;
  onWrite: () => void;
  onSelf: () => void;
  onKept: () => void;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: PAPER }}>
      <Airmail />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 }}>
        {sealed ? <Sealed onWrite={onWrite} onSelf={onSelf} onKept={onKept} /> : <ToSeal onSeal={onSeal} />}
      </View>
      <Airmail flip />
    </View>
  );
}

/* ── before: the stamp waits ── */
function ToSeal({ onSeal }: { onSeal: () => void }) {
  const hold = useSharedValue(0);
  const [done, setDone] = useState(false);

  const finish = () => {
    if (done) return;
    setDone(true);
    onSeal();
  };

  const press = () => {
    hold.value = withTiming(1, { duration: HOLD_MS, easing: Easing.out(Easing.quad) }, (ok) => {
      if (ok) runOnJS(finish)();
    });
  };
  const release = () => {
    if (!done) hold.value = withTiming(0, { duration: 220 });
  };

  // the stamp presses down into the paper as you hold it
  const stampStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(hold.value, [0, 1], [1, 0.93]) }, { rotate: "-8deg" }],
  }));
  // ink spreading out from under it
  const inkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(hold.value, [0, 1], [0, 0.16]),
    transform: [{ scale: interpolate(hold.value, [0, 1], [0.75, 1.18]) }],
  }));
  const borderStyle = useAnimatedStyle(() => ({ opacity: interpolate(hold.value, [0, 0.35, 1], [0.28, 0.6, 1]) }));

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: "center" }}>
      <Text style={{ fontFamily: F.serif, fontSize: 27, color: "#2E2A20", textAlign: "center", lineHeight: 35 }}>
        that's the post.{"\n"}you read them all.
      </Text>

      {/* a drag that merely starts on the stamp must not stamp it — this page
          is the last stop of a vertical pager, so cancel on any real movement */}
      <Pressable
        onPressIn={press}
        onPressOut={release}
        onTouchMove={(e) => {
          const { locationX, locationY } = e.nativeEvent;
          if (locationX < -14 || locationY < -14 || locationX > 182 || locationY > 182) release();
        }}
        style={{ marginTop: 34, padding: 18 }}
      >
        <Animated.View
          style={[{ position: "absolute", left: 4, top: 4, right: 4, bottom: 4, borderRadius: 999, backgroundColor: INK }, inkStyle]}
        />
        <Animated.View style={stampStyle}>
          <Animated.View style={borderStyle}>
            <Postmark />
          </Animated.View>
        </Animated.View>
      </Pressable>

      <Text style={{ fontFamily: F.sansExtra, fontSize: 10, letterSpacing: 1.8, color: "#9A8B6A", marginTop: 26 }}>
        PRESS AND HOLD
      </Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 14, color: "#6E6350", marginTop: 8 }}>to stamp the day closed</Text>
    </Animated.View>
  );
}

/* ── after: it's stamped, and the board says when the next one lands ── */
function Sealed({ onWrite, onSelf, onKept }: { onWrite: () => void; onSelf: () => void; onKept: () => void }) {
  const land = useSharedValue(0);
  useEffect(() => {
    land.value = withSequence(withTiming(1.14, { duration: 130 }), withTiming(1, { duration: 260, easing: Easing.out(Easing.back(2)) }));
  }, [land]);
  const landStyle = useAnimatedStyle(() => ({ transform: [{ scale: land.value }, { rotate: "-8deg" }] }));

  return (
    <Animated.View entering={FadeIn.duration(360)} style={{ alignItems: "center" }}>
      <Animated.View style={landStyle}>
        <Postmark dated />
      </Animated.View>

      <Text style={{ fontFamily: F.serif, fontSize: 25, color: "#2E2A20", marginTop: 26 }}>the post is closed.</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 14, color: "#6E6350", marginTop: 8, textAlign: "center", lineHeight: 21 }}>
        go have a life — it's better material.
      </Text>

      <Board />

      {/* the lock is on reading, never on writing */}
      <View style={{ alignItems: "center", marginTop: 22 }}>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: "#8A7C63", textAlign: "center", lineHeight: 20 }}>
          you can still write tonight.{"\n"}it leaves with the morning van.
        </Text>
        <View style={{ flexDirection: "row", gap: 9, marginTop: 14 }}>
          <Ghost label="to a stranger" onPress={onWrite} />
          <Ghost label="to yourself" onPress={onSelf} />
          <Ghost label="reread" onPress={onKept} />
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 26, opacity: 0.7 }}>
        <WrenBird size={22} mood="sleepy" />
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: "#9A8B6A" }}>Wren's off the clock</Text>
      </View>
    </Animated.View>
  );
}

function Ghost({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: "rgba(46,42,32,0.22)",
        borderRadius: 18,
        paddingVertical: 9,
        paddingHorizontal: 13,
        opacity: pressed ? 0.55 : 1,
      })}
    >
      <Text style={{ fontFamily: F.sansBold, fontSize: 11.5, color: "#5E5442" }}>{label}</Text>
    </Pressable>
  );
}

/* the round date-stamp itself */
function Postmark({ dated }: { dated?: boolean }) {
  const d = new Date();
  const day = String(d.getDate());
  const mon = d.toLocaleString("en", { month: "short" }).toUpperCase();
  return (
    <View
      style={{
        width: 132,
        height: 132,
        borderRadius: 66,
        borderWidth: 3,
        borderColor: INK,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
      }}
    >
      <View style={{ position: "absolute", left: 7, top: 7, right: 7, bottom: 7, borderRadius: 59, borderWidth: 1, borderColor: INK, opacity: 0.5 }} />
      <Text style={{ fontFamily: F.sansExtra, fontSize: 10, letterSpacing: 2, color: INK }}>KINDREDLY</Text>
      <View style={{ width: 76, height: 1.5, backgroundColor: INK, marginVertical: 5 }} />
      <Text style={{ fontFamily: F.sansExtra, fontSize: 21, letterSpacing: 0.5, color: INK }}>
        {dated ? `${day} ${mon}` : "— —"}
      </Text>
      <View style={{ width: 76, height: 1.5, backgroundColor: INK, marginVertical: 5 }} />
      <Text style={{ fontFamily: F.sansExtra, fontSize: 10, letterSpacing: 2, color: INK }}>CLOSED</Text>
    </View>
  );
}

/* ── split-flap departure board: the next post is the next departure ── */
function Board() {
  const [h, m] = useUntilMorning();
  return (
    <View style={{ backgroundColor: BOARD, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, marginTop: 22, alignItems: "center" }}>
      <Text style={{ fontFamily: F.sansExtra, fontSize: 9, letterSpacing: 2, color: "#8A8880" }}>NEXT POST IN</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
        <Flap ch={h[0]} />
        <Flap ch={h[1]} />
        <Text style={{ fontFamily: F.sansExtra, fontSize: 22, color: "#8A8880", marginHorizontal: 1 }}>:</Text>
        <Flap ch={m[0]} />
        <Flap ch={m[1]} />
      </View>
    </View>
  );
}

/* one flap — the top half falls when the value turns over */
function Flap({ ch }: { ch: string }) {
  const [shown, setShown] = useState(ch);
  const rot = useSharedValue(0);

  useEffect(() => {
    if (ch === shown) return;
    rot.value = withSequence(
      withTiming(-88, { duration: 95, easing: Easing.in(Easing.quad) }, (ok) => {
        if (ok) runOnJS(setShown)(ch);
      }),
      withTiming(0, { duration: 150, easing: Easing.out(Easing.quad) }),
    );
  }, [ch, shown, rot]);

  const style = useAnimatedStyle(() => ({ transform: [{ perspective: 300 }, { rotateX: `${rot.value}deg` }] }));

  return (
    <Animated.View style={[{ backgroundColor: "#2C2C2A", borderRadius: 4, paddingVertical: 7, paddingHorizontal: 9 }, style]}>
      <Text style={{ fontFamily: F.sansExtra, fontSize: 26, color: "#F1EFE8", fontVariant: ["tabular-nums"] }}>{shown}</Text>
      {/* the seam between the two halves */}
      <View style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, backgroundColor: BOARD }} />
    </Animated.View>
  );
}

/* hours + minutes until the morning post (the same hour the knock fires) */
function useUntilMorning(): [string, string] {
  const calc = (): [string, string] => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(MORNING_HOUR, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const mins = Math.max(0, Math.round((next.getTime() - now.getTime()) / 60000));
    const p = (n: number) => String(n).padStart(2, "0");
    return [p(Math.floor(mins / 60)), p(mins % 60)];
  };
  const [v, setV] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setV(calc()), 10000);
    return () => clearInterval(t);
  }, []);
  return v;
}

/* airmail stripe rule, top and bottom of the page */
function Airmail({ flip }: { flip?: boolean }) {
  const bars = Array.from({ length: 64 });
  const col = (i: number) => (i % 4 === 0 ? "#E0483C" : i % 4 === 2 ? "#3A4F9E" : "transparent");
  return (
    <View style={{ height: 11, flexDirection: "row", overflow: "hidden", backgroundColor: PAPER }}>
      {bars.map((_, i) => (
        <View key={i} style={{ width: 7, height: 34, marginTop: -10, backgroundColor: col(i), transform: [{ rotate: flip ? "-30deg" : "30deg" }] }} />
      ))}
    </View>
  );
}
