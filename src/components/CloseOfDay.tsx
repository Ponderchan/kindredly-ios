import { useWrenName } from "../lib/wren-name";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { P, PF } from "../theme/post";
import { WrenBird, type WrenMood } from "./WrenBird";
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
   his Day's End sheet). The postmark left nothing behind; the blind carries
   her note, taped on — a line from her that is COUNTED, never written: how
   many went past the desk, how many you answered, how many are still
   waiting on you. Same voice as her flight log. Writing needs no door here:
   the + key in the tab bar is always the way to write.

   THE GESTURE AND THE PAGER. This is the last page of Today's vertical
   pager, so a downward drag would normally scroll back up to the fifteenth
   letter. The cord's pan reports its grab to the parent, which switches the
   pager's scrolling off for the length of the pull — the touch lands on the
   ring before any movement, so the pager is already still by the time a
   scroll could begin. */

const CANVAS = "#EFE8D8"; // the blind — the close-of-day paper Today has always used
const FRAME = P.ink;
const PULL_DONE = 0.45; // past here, letting go finishes the pull

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
  onGrab,
}: {
  sealed: boolean;
  facts: DayFacts;
  onSeal: () => void;
  /** the cord is held / let go — the pager stops scrolling while it's held */
  onGrab?: (held: boolean) => void;
}) {
  useLang(); // repaint when the reader changes language
  return (
    <View style={{ flex: 1, backgroundColor: P.penWash }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 26 }}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 13, letterSpacing: 2, color: P.groundInk, textAlign: "center" }}>
          {tr("cod.wholePost")}
        </Text>
        <Counter sealed={sealed} facts={facts} onSeal={onSeal} onGrab={onGrab} />
        {/* the cue keeps its line after the pull so the counter doesn't shift */}
        <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 1.4, color: P.groundInk60, marginTop: 20, opacity: sealed ? 0 : 1 }}>{tr("cod.pull")}</Text>
      </View>
    </View>
  );
}

/* ── the counter: window, roller, blind, cord ──
   Everything the closed counter has to say is printed on, or taped to,
   the blind itself — one object, the way a real shutter carries its
   CLOSED sign and the note about when they're back. There used to be a
   separate departure board and a pair of writing buttons beneath it;
   the board was a second visual language stacked under the first, and
   the buttons repeated the + key in the tab bar. */
const WIN_W = 272;
const WIN_H = 384;
const ROLLER_H = 14;
const LIP_H = 9;
const CORD_L = 62;
const RING = 30;
const HIT = 26; // the ring's hit area reaches this far past it

function Counter({ sealed, facts, onSeal, onGrab }: { sealed: boolean; facts: DayFacts; onSeal: () => void; onGrab?: (held: boolean) => void }) {
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

  const onGrabStart = () => {
    setHeld(true);
    setMood("delight");
    grab(true);
  };
  const onGrabEnd = () => {
    setHeld(false);
    setMood("content");
    grab(false);
  };
  const pan = Gesture.Pan()
    .enabled(!done)
    .onBegin(() => {
      runOnJS(onGrabStart)();
    })
    .onStart(() => {
      from.value = y.value;
    })
    .onUpdate((e) => {
      y.value = Math.min(1, Math.max(0, from.value + e.translationY / WIN_H));
    })
    .onEnd(() => {
      if (y.value >= PULL_DONE) {
        y.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }, (ok) => {
          if (ok) runOnJS(finish)();
        });
      } else {
        y.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.back(1.4)) });
      }
    })
    .onFinalize(() => {
      runOnJS(onGrabEnd)();
    });

  const blind = useAnimatedStyle(() => ({ height: y.value * WIN_H + LIP_H }));
  const cord = useAnimatedStyle(() => ({ transform: [{ translateY: y.value * WIN_H }] }));
  /* the cord has no job once the blind is down — it fades with the landing */
  const cordShow = useAnimatedStyle(() => ({ opacity: done ? 0 : 1 }));

  /* SHE SHOWS YOU THE CORD. Every few seconds she hops once toward it and
     looks up at the ring, and the ring answers with a small swing — the
     page's only instruction that isn't a line of type. The ring also sways
     on its own the whole time, the way a cord that has just been let go
     of does, so it reads as something to pull before she points at it.
     All of it stops the moment the cord is held, and for good once the
     blind is down. */
  const hop = useSharedValue(0); // 0..1, one hop
  const swing = useSharedValue(0); // degrees, the ring
  const [mood, setMood] = useState<WrenMood>("content");
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (done) return;
    swing.value = withRepeat(withSequence(withTiming(3, { duration: 900, easing: Easing.inOut(Easing.sin) }), withTiming(-3, { duration: 900, easing: Easing.inOut(Easing.sin) })), -1, true);
    let alive = true;
    let settle: ReturnType<typeof setTimeout> | null = null;
    const nudge = () => {
      if (!alive || held) return;
      setMood("curious");
      hop.value = withSequence(withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 260, easing: Easing.bounce }));
      swing.value = withSequence(withTiming(9, { duration: 260 }), withTiming(-7, { duration: 420 }), withTiming(3, { duration: 700 }), withRepeat(withSequence(withTiming(-3, { duration: 900, easing: Easing.inOut(Easing.sin) }), withTiming(3, { duration: 900, easing: Easing.inOut(Easing.sin) })), -1, true));
      settle = setTimeout(() => alive && setMood("content"), 1500);
    };
    const first = setTimeout(nudge, 1400);
    const loop = setInterval(nudge, 4200);
    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(loop);
      if (settle) clearTimeout(settle);
    };
  }, [done, held, hop, swing]);

  const bird = useAnimatedStyle(() => ({
    transform: [{ translateX: hop.value * 12 }, { translateY: -hop.value * 18 }, { rotate: `${-hop.value * 9}deg` }],
  }));
  const ring = useAnimatedStyle(() => ({ transform: [{ rotate: `${swing.value}deg` }] }));

  return (
    <View style={{ marginTop: 22, width: WIN_W, alignItems: "center" }}>
      {/* the roller the blind winds onto — the one thing above the window */}
      <View style={{ width: WIN_W + 16, height: ROLLER_H, borderRadius: ROLLER_H / 2, backgroundColor: FRAME }} />
      {/* the window: she's behind it; the blind and what's on it live inside the frame */}
      <View style={{ width: WIN_W, height: WIN_H, borderWidth: 2, borderColor: FRAME, borderTopWidth: 0, backgroundColor: "#F7F6FF", overflow: "hidden", alignItems: "center" }}>
        {/* the far wall's picture rail, so the window has depth */}
        <View style={{ position: "absolute", left: 0, right: 0, top: 64, height: 1, backgroundColor: P.ink12 }} />
        {/* the sill she stands on */}
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 30, backgroundColor: CANVAS, borderTopWidth: 1.5, borderTopColor: FRAME }} />
        <Animated.View style={[{ position: "absolute", bottom: 24 }, bird]}>
          <WrenBird size={196} mood={mood} />
        </Animated.View>
        {/* the blind — canvas with its slats. What's printed on it hangs from
            the roller, so CLOSED is the first thing the pull reveals and her
            note the last. */}
        <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0, backgroundColor: CANVAS, overflow: "hidden" }, blind]}>
          {Array.from({ length: Math.ceil(WIN_H / 14) }, (_, i) => (
            <View key={i} style={{ position: "absolute", left: 0, right: 0, top: i * 14 + 10, height: 1, backgroundColor: P.ink12 }} />
          ))}
          <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: WIN_H, alignItems: "center" }}>
            <Print />
            <Note facts={facts} />
            <View style={{ position: "absolute", left: 0, right: 0, bottom: LIP_H + 16, alignItems: "center" }}>
              <NextPost />
            </View>
          </View>
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: LIP_H, backgroundColor: FRAME }} />
        </Animated.View>
      </View>
      {/* the cord hangs from the lip; the ring is what you pull */}
      <Animated.View pointerEvents={done ? "none" : "auto"} style={[{ position: "absolute", top: ROLLER_H + LIP_H - 2, right: 34, alignItems: "center" }, cord, cordShow]}>
        {/* the pendulum turns about the point the cord leaves the lip */}
        <Animated.View style={[{ alignItems: "center", transformOrigin: "top" }, ring]}>
          <View style={{ width: 2, height: CORD_L, backgroundColor: FRAME }} />
          <GestureDetector gesture={pan}>
            <View hitSlop={HIT} style={{ width: RING, height: RING, borderRadius: RING / 2, borderWidth: 3, borderColor: FRAME, backgroundColor: P.penWash }} />
          </GestureDetector>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/* printed on the blind: the word and the date */
function Print() {
  const d = new Date();
  const day = String(d.getDate());
  // the date is printed in the language of the post office you're standing in
  const mon = d.toLocaleString(localeTag(), { month: "short" }).replace(/\.$/, "").toUpperCase();
  return (
    <View style={{ alignItems: "center", marginTop: 26 }}>
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 34, letterSpacing: 7, color: P.post }}>{tr("cod.stamp")}</Text>
      <View style={{ width: 150, height: 1.5, backgroundColor: P.post, marginTop: 6, opacity: 0.7 }} />
      <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 2, color: P.groundInk, marginTop: 9 }}>
        {day} {mon}
      </Text>
    </View>
  );
}

/* printed at the blind's foot, in the same ink as the rest: when the
   counter opens again and how long that is — the countdown is part of the
   sign, not a board hung under it */
function NextPost() {
  const [h, m] = useUntilMorning();
  const next = `${String(MORNING_HOUR).padStart(2, "0")}:00`;
  return (
    <View style={{ alignItems: "center", borderWidth: 1, borderColor: P.groundInk40, paddingHorizontal: 18, paddingTop: 7, paddingBottom: 8 }}>
      <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1.8, color: P.groundInk60 }}>{tr("cod.nextPost")}</Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 2 }}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 24, letterSpacing: 1, color: P.groundInk }}>{h}</Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 11, color: P.groundInk60 }}>H</Text>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 24, letterSpacing: 1, color: P.groundInk, marginLeft: 6 }}>{m}</Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 11, color: P.groundInk60 }}>M</Text>
      </View>
      <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1.6, color: P.groundInk60, marginTop: 3 }}>{tr("cod.blind.next")} {next}</Text>
    </View>
  );
}

/* HER NOTE, taped to the blind. Every clause is a count the phone already
   holds; a count of zero gets its own sentence rather than "0 letters".
   Nothing here is ever made up about the day — the rule the whole product
   keeps. */
export function slipLines(f: DayFacts): string[] {
  const out: string[] = [];
  out.push(f.read === 0 ? tr("cod.slip.read0") : f.read === 1 ? tr("cod.slip.read1") : tr("cod.slip.readN", { n: f.read }));
  if (f.read > 0) out.push(f.replied === 0 ? tr("cod.slip.rep0") : f.replied === 1 ? tr("cod.slip.rep1") : tr("cod.slip.repN", { n: f.replied }));
  if (f.waiting > 0) out.push(f.waiting === 1 ? tr("cod.slip.wait1") : tr("cod.slip.waitN", { n: f.waiting }));
  return out;
}

const TAPE = "rgba(232,166,60,0.45)"; // a strip of tape, the brass of the stamps at half strength

function Note({ facts }: { facts: DayFacts }) {
  const wren = useWrenName();
  const lines = slipLines(facts);
  return (
    <View style={{ marginTop: 22, width: 230, transform: [{ rotate: "-1.6deg" }] }}>
      <View style={{ backgroundColor: P.paper, borderWidth: 1, borderColor: P.ink, paddingHorizontal: 15, paddingTop: 16, paddingBottom: 12 }}>
        <Text style={{ fontFamily: PF.serifItalic, fontSize: 16, lineHeight: 23, color: P.ink }}>{lines.join(" ")}</Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: P.ink40, marginTop: 10, textAlign: "right" }}>— {wren.toUpperCase()}</Text>
      </View>
      {/* two strips of tape, one at each top corner */}
      <View style={{ position: "absolute", top: -7, left: 14, width: 44, height: 14, backgroundColor: TAPE, transform: [{ rotate: "-6deg" }] }} />
      <View style={{ position: "absolute", top: -7, right: 14, width: 44, height: 14, backgroundColor: TAPE, transform: [{ rotate: "5deg" }] }} />
    </View>
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
