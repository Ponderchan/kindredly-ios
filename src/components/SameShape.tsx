import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Dimensions, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { P, PF } from "../theme/post";

/* THE LAUNCH — the same shape.
   ────────────────────────────────────────────────────────────────────────
   Two doors sit behind this screen and they are not the same room: a new
   reader lands in EGG OS (the Y2K console, hard bevels, an egg), a returning
   one lands in the post office (paper, hairlines, postmarks). Anything drawn
   from either world is a seam in the other, so this is built from the only
   thing they share — the GROUND. Both are P.penWash, and the colour never
   changes from the native splash through here into either destination.

   What it says is the product's one claim, and it says it without a word:
   YOU ARE FOUND BY SOMETHING NOBODY CAN SEE ABOUT YOU — how you write.

   Two paragraphs, drawn the way writing looks from across a room: bars, not
   letters, with a ragged right edge. They arrive from opposite sides, they
   slide together, and the rag lines up exactly. The moment they register the
   ink turns pen blue. Nothing was reshaped to fit — they were the same shape
   the whole time, which is the difference between being matched and being
   sorted. The mess of two offset combs resolving into one clean block is the
   beat the whole screen is built around.

   A courier was tried here first and thrown out. A new reader has no bird and
   no name, so the personal version of this screen only worked for people who
   already understood it — the first launch, the only one that has to land,
   got the weakest frame. This one is strongest exactly where it needs to be.

   TIMING IS NOT THE SAME FOR EVERYONE. The first launch runs whole (~790ms):
   that reader has never seen the claim. Every launch after joins late and
   only lands the merge (~380ms), because the fiftieth opening should get out
   of the way. Same composition, two lengths. */

const { width: W, height: H } = Dimensions.get("window");
const MID = H / 2;

/* The rag. Seven lines with a short last one — the single clearest cue that
   a stack of bars is a paragraph rather than a chart. */
const RAG = [1.0, 0.83, 0.95, 0.68, 1.0, 0.89, 0.42];
const PARA_W = 140;
const BAR_H = 3.5;
const BAR_GAP = 8;
const PARA_H = RAG.length * BAR_H + (RAG.length - 1) * BAR_GAP;
const SPREAD = 83; // how far each paragraph sits from centre before merging
const PARA_TOP = MID - PARA_H / 2 - 26;
const NAME_TOP = MID + 34;

const WORD = "KINDREDLY";
const SEEN = "kindredly_launch_seen";

/* The full run — a first launch. Both paragraphs write the SAME line at the
   SAME moment: line three lands on the left and the right together, at the
   same length. The rag is therefore seen matching as it is written, and the
   two blocks then sit apart, finished and obviously identical, for a beat
   before they move. Without that hold the merge happens before the eye has
   registered that there are two of anything, and the whole screen collapses
   into "one paragraph with a shadow". */
const FULL = {
  draw: { at: 0, step: 22, ms: 110 }, // both blocks, in lockstep — done at 242
  merge: { at: 330, ms: 200, from: 0 }, // ~90ms of two finished paragraphs first
  name: { at: 450, step: 11, ms: 100 },
  lift: { at: 660, ms: 160 }, // done at 820ms
};
/* Every launch after — the claim has already been made to this reader, so it
   joins the merge half-done and gets out of the way. */
const SHORT = {
  draw: { at: 0, step: 0, ms: 0 },
  merge: { at: 0, ms: 180, from: 0.5 },
  name: { at: 40, step: 8, ms: 80 },
  lift: { at: 210, ms: 150 }, // done at 360ms
};

export function SameShape({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const done = useRef(false);
  const [beats, setBeats] = useState<typeof FULL | null>(null);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onDone();
  }, [onDone]);

  /* which length to run. One AsyncStorage read, well inside the first frame
     — and the flag is written straight away so a launch interrupted halfway
     still counts as seen. */
  useEffect(() => {
    let alive = true;
    void (async () => {
      let seen = false;
      try {
        seen = (await AsyncStorage.getItem(SEEN)) === "1";
        if (!seen) void AsyncStorage.setItem(SEEN, "1").catch(() => {});
      } catch {
        /* no storage — give them the whole thing */
      }
      if (alive) setBeats(seen ? SHORT : FULL);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const merge = useSharedValue(0);
  const lift = useSharedValue(0);

  useEffect(() => {
    if (!beats) return;
    if (reduce) {
      merge.value = 1;
      lift.value = withDelay(220, withTiming(1, { duration: 180 }, (ok) => ok && runOnJS(finish)()));
      return;
    }
    merge.value = beats.merge.from;
    merge.value = withDelay(beats.merge.at, withTiming(1, { duration: beats.merge.ms, easing: Easing.inOut(Easing.cubic) }));
    lift.value = withDelay(beats.lift.at, withTiming(1, { duration: beats.lift.ms, easing: Easing.in(Easing.quad) }, (ok) => ok && runOnJS(finish)()));
  }, [beats, reduce, merge, lift, finish]);

  const skip = () => {
    if (done.current || lift.value > 0) return;
    lift.value = withTiming(1, { duration: 150, easing: Easing.in(Easing.quad) }, (ok) => ok && runOnJS(finish)());
  };

  const sheet = useAnimatedStyle(() => ({ opacity: 1 - lift.value, transform: [{ translateY: -lift.value * 10 }] }));
  const leftPara = useAnimatedStyle(() => ({ transform: [{ translateX: merge.value * SPREAD }] }));
  const rightPara = useAnimatedStyle(() => ({ transform: [{ translateX: -merge.value * SPREAD }] }));

  return (
    <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: P.penWash }, sheet]}>
      <Pressable onPress={skip} style={{ flex: 1 }}>
        <Animated.View style={[{ position: "absolute", top: PARA_TOP, left: W / 2 - SPREAD - PARA_W / 2 }, leftPara]}>
          <Para merge={merge} beats={beats} reduce={reduce} />
        </Animated.View>
        <Animated.View style={[{ position: "absolute", top: PARA_TOP, left: W / 2 + SPREAD - PARA_W / 2 }, rightPara]}>
          <Para merge={merge} beats={beats} reduce={reduce} />
        </Animated.View>

        <View style={{ position: "absolute", left: 0, right: 0, top: NAME_TOP, flexDirection: "row", justifyContent: "center" }}>
          {beats
            ? WORD.split("").map((ch, i) => <Struck key={i} ch={ch} i={i} beats={beats} reduce={reduce} />)
            : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

/* one paragraph — the identical rag, drawn line by line */
function Para({
  merge,
  beats,
  reduce,
}: {
  merge: SharedValue<number>;
  beats: typeof FULL | null;
  reduce: boolean;
}) {
  return (
    <View style={{ width: PARA_W }}>
      {RAG.map((f, i) => (
        <Bar key={i} f={f} i={i} merge={merge} beats={beats} reduce={reduce} last={i === RAG.length - 1} />
      ))}
    </View>
  );
}

/* one line of writing. It draws from the left, and its ink turns pen blue in
   the last of the merge — the only colour change on the screen, and the one
   that says the two of them landed on each other exactly. */
function Bar({
  f,
  i,
  merge,
  beats,
  reduce,
  last,
}: {
  f: number;
  i: number;
  merge: SharedValue<number>;
  beats: typeof FULL | null;
  reduce: boolean;
  last: boolean;
}) {
  const v = useSharedValue(0);
  const started = useRef(false);
  useEffect(() => {
    if (!beats || started.current) return;
    started.current = true;
    if (reduce || beats === SHORT) {
      v.value = 1;
      return;
    }
    const b = beats.draw;
    v.value = withDelay(b.at + i * b.step, withTiming(1, { duration: b.ms, easing: Easing.out(Easing.cubic) }));
  }, [beats, reduce, i, v]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scaleX: v.value }],
    backgroundColor: interpolateColor(merge.value, [0.88, 1], [P.ink, P.pen]),
  }));

  return (
    <Animated.View
      style={[
        { width: PARA_W * f, height: BAR_H, marginBottom: last ? 0 : BAR_GAP, transformOrigin: "left center" },
        style,
      ]}
    />
  );
}

/* the wordmark, struck rather than faded */
function Struck({ ch, i, beats, reduce }: { ch: string; i: number; beats: typeof FULL; reduce: boolean }) {
  const v = useSharedValue(reduce ? 1 : 0);
  const started = useRef(false);
  if (!started.current && !reduce) {
    started.current = true;
    v.value = withDelay(beats.name.at + i * beats.name.step, withTiming(1, { duration: beats.name.ms, easing: Easing.out(Easing.cubic) }));
  }
  const style = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: interpolate(v.value, [0, 1], [8, 0]) }] }));
  return (
    <Animated.View style={style}>
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 5, color: P.ink }}>{ch}</Text>
    </Animated.View>
  );
}
