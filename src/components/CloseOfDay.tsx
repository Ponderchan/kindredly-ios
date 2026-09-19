import { useWrenName } from "../lib/wren-name";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { P, PF } from "../theme/post";
import { WrenBird } from "./WrenBird";
import { MORNING_HOUR } from "../lib/notify";
// `t` is bound as a local timer handle further down, so the translator comes
// in as `tr` — the same convention the other timer/loop files use.
import { t as tr, useLang } from "../lib/i18n";
import { localeTag } from "../lib/format";

/* CLOSE OF DAY — the counter shuts, and you're the one who pulls the blind.
   ────────────────────────────────────────────────────────────────────────
   The page already spoke in this world ("THE POST IS CLOSED", "off the
   clock", "NEXT POST IN"), so it gets the object those words come from: a
   post-office counter with a roller blind. She's behind the window packing
   up; you pull the cord and the blind comes down with CLOSED, the date and
   the next post printed on it. A counter closes at five in the afternoon
   as readily as at midnight, which is the point — the day's ration can be
   read by two o'clock, and a candle or a blanket would be lying then.

   It replaces the press-and-hold postmark (owner's call, 2026-09-19, from
   his Day's End sheet). The postmark left nothing behind; the blind leaves
   her slip on the ledge — a line from her that is COUNTED, never written:
   how many went past the desk, how many you answered, how many are still
   waiting on you. Same voice as her flight log.

   THE GESTURE AND THE PAGER. This is the last page of Today's vertical
   pager, so a downward drag would normally scroll back up to the fifteenth
   letter. The cord's pan reports its grab to the parent, which switches the
   pager's scrolling off for the length of the pull — the touch lands on the
   ring before any movement, so the pager is already still by the time a
   scroll could begin. */

const CANVAS = "#EFE8D8"; // the blind — the close-of-day paper Today has always used
const FRAME = P.ink;
const BOARD = P.ink;
const PULL_DONE = 0.55; // past here, letting go finishes the pull

let Haptics: typeof import("expo-haptics") | null = null;
try {
  Haptics = require("expo-haptics");
} catch {}
const thunk = () => {
  try {
    void Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {}
};

export interface DayFacts {
  /** letters that went past the desk today */
  read: number;
  /** replies sent from the desk today */
  replied: number;
  /** correspondences waiting on a reply from you */
  waiting: number;
}

export function CloseOfDay({
  sealed,
  facts,
  onSeal,
  onWrite,
  onSelf,
  onGrab,
}: {
  sealed: boolean;
  facts: DayFacts;
  onSeal: () => void;
  onWrite: () => void;
  onSelf: () => void;
  /** the cord is held / let go — the pager stops scrolling while it's held */
  onGrab?: (held: boolean) => void;
}) {
  useLang(); // repaint when the reader changes language
  /* the ledge below the counter is laid out in both states, so the counter
     doesn't jump up the page when the blind lands and the slip appears */
  const reveal = useSharedValue(sealed ? 1 : 0);
  useEffect(() => {
    reveal.value = withTiming(sealed ? 1 : 0, { duration: 360 });
  }, [sealed, reveal]);
  const ledge = useAnimatedStyle(() => ({ opacity: reveal.value }));
  const cue = useAnimatedStyle(() => ({ opacity: 1 - reveal.value }));
  return (
    <View style={{ flex: 1, backgroundColor: P.penWash }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 26 }}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 13, letterSpacing: 2, color: P.groundInk, textAlign: "center" }}>
          {tr("cod.wholePost")}
        </Text>
        <Counter sealed={sealed} onSeal={onSeal} onGrab={onGrab} />
        <View style={{ width: "100%", alignItems: "center" }}>
          <Animated.View pointerEvents={sealed ? "auto" : "none"} style={[{ width: "100%", alignItems: "center" }, ledge]}>
            <Closed facts={facts} onWrite={onWrite} onSelf={onSelf} />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 18, left: 0, right: 0, alignItems: "center" }, cue]}>
            <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 1.4, color: P.groundInk60 }}>{tr("cod.pull")}</Text>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

/* ── the counter: window, roller, blind, cord ── */
const WIN_W = 250;
const WIN_H = 214;
const ROLLER_H = 14;
const LIP_H = 9;
const CORD_L = 62;
const RING = 30;
const HIT = 26; // the ring's hit area reaches this far past it

function Counter({ sealed, onSeal, onGrab }: { sealed: boolean; onSeal: () => void; onGrab?: (held: boolean) => void }) {
  /* 0 = rolled up, 1 = down on the sill */
  const y = useSharedValue(sealed ? 1 : 0);
  const from = useSharedValue(0);
  const [done, setDone] = useState(sealed);
  /* follows the flag both ways: down at once when the day is already closed
     (a cold open after the pull), and rolled back up when the date turns
     over under an app left open past midnight */
  useEffect(() => {
    if (sealed && !done) {
      y.value = 1;
      setDone(true);
    } else if (!sealed && done) {
      y.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) });
      setDone(false);
    }
  }, [sealed, done, y]);

  const finish = () => {
    if (done) return;
    setDone(true);
    thunk();
    onSeal();
  };
  const grab = (held: boolean) => onGrab?.(held);

  const pan = Gesture.Pan()
    .enabled(!done)
    .onBegin(() => {
      runOnJS(grab)(true);
    })
    .onStart(() => {
      from.value = y.value;
    })
    .onUpdate((e) => {
      y.value = Math.min(1, Math.max(0, from.value + e.translationY / WIN_H));
    })
    .onEnd(() => {
      if (y.value >= PULL_DONE) {
        y.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }, (ok) => {
          if (ok) runOnJS(finish)();
        });
      } else {
        y.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.back(1.4)) });
      }
    })
    .onFinalize(() => {
      runOnJS(grab)(false);
    });

  const blind = useAnimatedStyle(() => ({ height: y.value * WIN_H + LIP_H }));
  const cord = useAnimatedStyle(() => ({ transform: [{ translateY: y.value * WIN_H }] }));
  /* the cord has no job once the blind is down — it fades with the landing */
  const cordShow = useAnimatedStyle(() => ({ opacity: done ? 0 : 1 }));

  return (
    <View style={{ marginTop: 26, width: WIN_W, alignItems: "center" }}>
      {/* the roller the blind winds onto — the one thing above the window */}
      <View style={{ width: WIN_W + 16, height: ROLLER_H, borderRadius: ROLLER_H / 2, backgroundColor: FRAME }} />
      {/* the window: she's behind it; the blind and its print live inside the frame */}
      <View style={{ width: WIN_W, height: WIN_H, borderWidth: 2, borderColor: FRAME, borderTopWidth: 0, backgroundColor: "#F7F6FF", overflow: "hidden", alignItems: "center" }}>
        {/* the far wall's picture rail, so the window has depth */}
        <View style={{ position: "absolute", left: 0, right: 0, top: 44, height: 1, backgroundColor: P.ink12 }} />
        {/* the sill she stands on */}
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 26, backgroundColor: CANVAS, borderTopWidth: 1.5, borderTopColor: FRAME }} />
        <View style={{ position: "absolute", bottom: 22 }}>
          <WrenBird size={118} mood="content" />
        </View>
        {/* the blind — canvas with its slats, the print near its bottom edge so it
            descends into view as you pull */}
        <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0, backgroundColor: CANVAS, overflow: "hidden" }, blind]}>
          {Array.from({ length: Math.ceil(WIN_H / 14) }, (_, i) => (
            <View key={i} style={{ position: "absolute", left: 0, right: 0, top: i * 14 + 10, height: 1, backgroundColor: P.ink12 }} />
          ))}
          <View style={{ position: "absolute", left: 0, right: 0, bottom: LIP_H + 34, alignItems: "center" }}>
            <Print />
          </View>
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: LIP_H, backgroundColor: FRAME }} />
        </Animated.View>
      </View>
      {/* the cord hangs from the lip; the ring is what you pull */}
      <Animated.View pointerEvents={done ? "none" : "auto"} style={[{ position: "absolute", top: ROLLER_H + LIP_H - 2, right: 34, alignItems: "center" }, cord, cordShow]}>
        <View style={{ width: 2, height: CORD_L, backgroundColor: FRAME }} />
        <GestureDetector gesture={pan}>
          <View hitSlop={HIT} style={{ width: RING, height: RING, borderRadius: RING / 2, borderWidth: 3, borderColor: FRAME, backgroundColor: P.penWash }} />
        </GestureDetector>
      </Animated.View>
    </View>
  );
}

/* what's printed on the blind: the word, the date, the next post */
function Print() {
  const d = new Date();
  const day = String(d.getDate());
  // the date is printed in the language of the post office you're standing in
  const mon = d.toLocaleString(localeTag(), { month: "short" }).replace(/\.$/, "").toUpperCase();
  const next = `${String(MORNING_HOUR).padStart(2, "0")}:00`;
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 30, letterSpacing: 6, color: P.post }}>{tr("cod.stamp")}</Text>
      <View style={{ width: 132, height: 1.5, backgroundColor: P.post, marginTop: 6, opacity: 0.7 }} />
      <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 1.8, color: P.groundInk, marginTop: 10 }}>
        {day} {mon} · {tr("cod.blind.next")} {next}
      </Text>
    </View>
  );
}

/* ── after: her slip on the ledge, the board, the two doors that stay open ── */
function Closed({ facts, onWrite, onSelf }: { facts: DayFacts; onWrite: () => void; onSelf: () => void }) {
  const wren = useWrenName();
  return (
    <View style={{ alignItems: "center", width: "100%" }}>
      <Slip facts={facts} name={wren} />
      <Board />
      {/* the lock is on reading, never on writing */}
      <View style={{ alignItems: "center", marginTop: 14 }}>
        <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 0.6, color: P.groundInk40, textAlign: "center", lineHeight: 17 }}>
          {tr("cod.stillOpen")}
        </Text>
        <View style={{ flexDirection: "row", gap: 9, marginTop: 10 }}>
          <Ghost label={tr("cod.toStranger")} onPress={onWrite} />
          <Ghost label={tr("cod.toSelf")} onPress={onSelf} />
        </View>
      </View>
    </View>
  );
}

/* HER SLIP. Every clause is a count the phone already holds; a count of
   zero gets its own sentence rather than "0 letters". Nothing here is
   ever made up about the day — the rule the whole product keeps. */
export function slipLines(f: DayFacts): string[] {
  const out: string[] = [];
  out.push(f.read === 0 ? tr("cod.slip.read0") : f.read === 1 ? tr("cod.slip.read1") : tr("cod.slip.readN", { n: f.read }));
  if (f.read > 0) out.push(f.replied === 0 ? tr("cod.slip.rep0") : f.replied === 1 ? tr("cod.slip.rep1") : tr("cod.slip.repN", { n: f.replied }));
  if (f.waiting > 0) out.push(f.waiting === 1 ? tr("cod.slip.wait1") : tr("cod.slip.waitN", { n: f.waiting }));
  return out;
}

function Slip({ facts, name }: { facts: DayFacts; name: string }) {
  const lines = slipLines(facts);
  return (
    <View
      style={{
        marginTop: 16,
        maxWidth: 300,
        backgroundColor: P.paper,
        borderWidth: 1,
        borderColor: P.ink,
        paddingHorizontal: 16,
        paddingVertical: 12,
        transform: [{ rotate: "-1.2deg" }],
      }}
    >
      <Text style={{ fontFamily: PF.serifItalic, fontSize: 15, lineHeight: 22, color: P.ink }}>{lines.join(" ")}</Text>
      <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: P.ink40, marginTop: 8, textAlign: "right" }}>— {name.toUpperCase()}</Text>
    </View>
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

/* ── split-flap departure board: the next post is the next departure ── */
function Board() {
  const [h, m] = useUntilMorning();
  return (
    <View style={{ backgroundColor: BOARD, paddingVertical: 10, paddingHorizontal: 16, marginTop: 14, alignItems: "center" }}>
      <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.6, color: "#8A8880" }}>{tr("cod.nextPost")}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 7 }}>
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
    <Animated.View style={[{ backgroundColor: "#2C2C2A", paddingVertical: 6, paddingHorizontal: 8 }, style]}>
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 24, color: "#F1EFE8" }}>{shown}</Text>
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
