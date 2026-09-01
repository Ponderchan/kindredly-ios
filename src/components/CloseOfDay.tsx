import { useWrenName } from "../lib/wren-name";
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
import { P, PF } from "../theme/post";
import { WrenBird } from "./WrenBird";
import { MORNING_HOUR } from "../lib/notify";
// `t` is bound as a local timer handle further down, so the translator comes
// in as `tr` — the same convention the other timer/loop files use.
import { t as tr, useLang } from "../lib/i18n";
import { localeTag } from "../lib/format";

/* Close of day — the post office shuts, and you're the one who shuts it.
   The object is a POSTMARK, not a wax seal: ink on paper, the thing a real
   counter clerk slams down to say "processed, dated, done". Wax + candles on a
   dark ground read as a shrine; this is postal graphic design — crisp, flat,
   a little mechanical, the same world as the airmail stripes and the stamps.
   Press and hold: the ink spreads under the stamp, then it lands with the
   date on it. (A haptic thunk belongs on the landing — needs expo-haptics,
   which needs a native rebuild.) */

const PAPER = P.penWash; // the closed post is the desk with nothing on it
const INK = P.post;
const BOARD = P.ink;
const HOLD_MS = 750;

export function CloseOfDay({
  sealed,
  onSeal,
  onWrite,
  onSelf,
}: {
  sealed: boolean;
  onSeal: () => void;
  onWrite: () => void;
  onSelf: () => void;
}) {
  useLang(); // repaint when the reader changes language
  return (
    <View style={{ flex: 1, backgroundColor: PAPER }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 }}>
        {sealed ? <Sealed onWrite={onWrite} onSelf={onSelf} /> : <ToSeal onSeal={onSeal} />}
      </View>
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
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 13, letterSpacing: 2, color: P.groundInk, textAlign: "center" }}>
        {tr("cod.wholePost")}
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

      <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 1.4, color: P.groundInk60, marginTop: 24 }}>
        {tr("cod.hold")}
      </Text>
    </Animated.View>
  );
}

/* ── after: it's stamped, and the board says when the next one lands ── */
function Sealed({ onWrite, onSelf }: { onWrite: () => void; onSelf: () => void }) {
  const wren = useWrenName();
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

      <Text style={{ fontFamily: PF.monoSemi, fontSize: 13, letterSpacing: 2, color: P.groundInk, marginTop: 26 }}>{tr("cod.closed")}</Text>
      <Text style={{ fontFamily: PF.serifItalic, fontSize: 15, color: P.groundInk60, marginTop: 10, textAlign: "center", lineHeight: 22 }}>
        {tr("cod.goLive")}
      </Text>

      <Board />

      {/* the lock is on reading, never on writing */}
      <View style={{ alignItems: "center", marginTop: 22 }}>
        <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 0.6, color: P.groundInk40, textAlign: "center", lineHeight: 17 }}>
          {tr("cod.stillOpen")}
        </Text>
        <View style={{ flexDirection: "row", gap: 9, marginTop: 14 }}>
          <Ghost label={tr("cod.toStranger")} onPress={onWrite} />
          <Ghost label={tr("cod.toSelf")} onPress={onSelf} />
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginTop: 28 }}>
        <WrenBird size={30} mood="sleepy" />
        <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.8, color: P.groundInk40 }}>
          {tr("cod.offClock", { name: wren.toUpperCase() })}
        </Text>
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
        borderColor: P.groundInk,
        paddingVertical: 8,
        paddingHorizontal: 11,
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 0.8, color: P.groundInk }}>{label}</Text>
    </Pressable>
  );
}

/* the round date-stamp itself */
function Postmark({ dated }: { dated?: boolean }) {
  const d = new Date();
  const day = String(d.getDate());
  // a real postmark is stamped in the language of the post office you're
  // standing in — so the month follows the reader, not the build
  const mon = d.toLocaleString(localeTag(), { month: "short" }).toUpperCase();
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
      <Text style={{ fontFamily: PF.monoMed, fontSize: 9.5, letterSpacing: 1.4, color: INK }}>KINDREDLY</Text>
      <View style={{ width: 76, height: 1.5, backgroundColor: INK, marginVertical: 5 }} />
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 19, letterSpacing: 0.5, color: INK }}>
        {dated ? `${day} ${mon}` : "— —"}
      </Text>
      <View style={{ width: 76, height: 1.5, backgroundColor: INK, marginVertical: 5 }} />
      <Text style={{ fontFamily: PF.monoMed, fontSize: 9.5, letterSpacing: 1.4, color: INK }}>{tr("cod.stamp")}</Text>
    </View>
  );
}

/* ── split-flap departure board: the next post is the next departure ── */
function Board() {
  const [h, m] = useUntilMorning();
  return (
    <View style={{ backgroundColor: BOARD, paddingVertical: 13, paddingHorizontal: 16, marginTop: 22, alignItems: "center" }}>
      <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.6, color: "#8A8880" }}>{tr("cod.nextPost")}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
        <Flap ch={h[0]} />
        <Flap ch={h[1]} />
        <Text style={{ fontFamily: PF.mono, fontSize: 22, color: "#8A8880", marginHorizontal: 1 }}>:</Text>
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
    <Animated.View style={[{ backgroundColor: "#2C2C2A", paddingVertical: 7, paddingHorizontal: 9 }, style]}>
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 26, color: "#F1EFE8" }}>{shown}</Text>
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
