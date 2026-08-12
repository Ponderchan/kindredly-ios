import { useCallback, useEffect, useState } from "react";
import { Dimensions, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useFocusEffect, useRouter } from "expo-router";
import { C, F, shadow } from "../../theme/tokens";
import { StampTile } from "../../components/StampTile";
import { WrenBird } from "../../components/WrenBird";
import { DEMO_THREADS } from "../../data/demo";
import { getStamp } from "../../data/stamps";
import { postNo } from "../../lib/format";
import { fetchThreads, type ThreadSummary } from "../../lib/db";

/* Today — the post. When letters wait for you, they're a stack of envelopes;
   tap one and the letter rises up out of the envelope (the reader is a modal
   that slides up — pull it down to put the letter away). When it's quiet, Wren
   nudges you to write first. The lavender ground marks this as the strangers'
   space (same as the "to a stranger" composer). */

const LAV = "#B9A8F0";
const PAPER = "#FBF7EC";
const W = Dimensions.get("window").width;

export default function LettersTab() {
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [idx, setIdx] = useState(0);

  const load = useCallback(async () => {
    setThreads((await fetchThreads()) || []);
    setLoaded(true);
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const demo = __DEV__ && loaded && threads.length === 0;
  const showThreads = demo ? DEMO_THREADS : threads;
  const waiting = showThreads.filter((t) => !t.lastSenderMe);

  // tap an envelope → the letter rises up (the reader slides up as a modal)
  const open = (thread: ThreadSummary) => router.push(`/thread/${thread.id}`);

  const quiet = loaded && waiting.length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: LAV }} edges={["top"]}>
      {/* header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 6 }}>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 34, color: "#2A2153" }}>today</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#FFFFFF", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 }}>
          <Text style={{ fontFamily: F.sansExtra, fontSize: 11, letterSpacing: 1.2, color: "#2A2153" }}>{quiet ? "QUIET" : `${waiting.length} WAITING`}</Text>
          <Text style={{ fontSize: 12 }}>{quiet ? "🕊" : "✉️"}</Text>
        </View>
      </View>

      {quiet ? (
        <Quiet onWrite={() => router.push("/compose")} onSelf={() => router.push("/journal-entry")} onKept={() => router.push("/kept")} />
      ) : (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / W))}
          >
            {waiting.map((t) => (
              <View key={t.id} style={{ width: W, height: 440, alignItems: "center", justifyContent: "center" }}>
                <Envelope thread={t} onOpen={() => open(t)} />
              </View>
            ))}
          </ScrollView>

          {/* dots + count */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 }}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {waiting.map((_, i) => (
                <View key={i} style={{ width: i === idx ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i === idx ? "#4B3F86" : "rgba(43,33,83,0.28)" }} />
              ))}
            </View>
            <Text style={{ fontFamily: F.sansBold, fontSize: 11, letterSpacing: 1, color: "#4B3F86", marginLeft: 6 }}>
              {idx + 1} OF {waiting.length}
            </Text>
          </View>

          {/* Wren line */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 34, paddingTop: 22, paddingBottom: 12 }}>
            <WrenBird size={20} mood="content" />
            <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 13.5, color: "#3B3363", lineHeight: 20 }}>
              “{waitLine(waiting.length)}”
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function Envelope({ thread, onOpen }: { thread: ThreadSummary; onOpen: () => void }) {
  const st = getStamp(thread.stamp);
  return (
    <View style={{ width: W - 76 }}>
      {/* stacked cards behind */}
      <View style={{ position: "absolute", left: 14, right: 14, top: 20, height: 200, backgroundColor: "#EFE9D9", borderRadius: 18, transform: [{ rotate: "2.5deg" }] }} />
      <View style={{ position: "absolute", left: 8, right: 8, top: 12, height: 210, backgroundColor: "#F4EFE1", borderRadius: 18, transform: [{ rotate: "-1.5deg" }] }} />

      <Pressable onPress={onOpen} style={[{ backgroundColor: PAPER, borderRadius: 20, overflow: "hidden", transform: [{ rotate: "-0.5deg" }] }, shadow.card]}>
        <Airmail />
        <View style={{ padding: 20, paddingTop: 18, minHeight: 200 }}>
          {/* pasted stamp */}
          {st && (
            <View style={{ position: "absolute", top: -6, right: 16, transform: [{ rotate: "8deg" }] }}>
              <StampTile id={thread.stamp} w={52} r={5} />
            </View>
          )}
          <Text style={{ fontFamily: F.sansExtra, fontSize: 10, letterSpacing: 1, color: "#9A7B3A", paddingRight: 60 }}>
            FROM NO. {postNo(thread.other)} · A STRANGER, FOR YOU
          </Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 20, color: "#4A4266", marginTop: 18, lineHeight: 28 }} numberOfLines={2}>
            “{thread.preview}”
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 26 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#EF5A5A", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 17 }}>💌</Text>
            </View>
            <Text style={{ fontFamily: F.sansExtra, fontSize: 12.5, letterSpacing: 1.4, color: "#C0503A" }}>TAP TO OPEN →</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

/* airmail striped border */
function Airmail() {
  const bars = Array.from({ length: 60 });
  const col = (i: number) => (i % 4 === 0 ? "#E0483C" : i % 4 === 2 ? "#3A4F9E" : "transparent");
  return (
    <View style={{ height: 12, flexDirection: "row", overflow: "hidden", backgroundColor: "#FFFFFF" }}>
      {bars.map((_, i) => (
        <View key={i} style={{ width: 7, height: 30, marginTop: -8, backgroundColor: col(i), transform: [{ rotate: "30deg" }] }} />
      ))}
    </View>
  );
}

/* You've read everything that came. Rather than dangle an empty feed, the post
   closes for the day: Wren dozes off, a countdown says exactly when the next
   round lands, and the copy sends you back to your life — which is where the
   letters come from anyway. */
function Quiet({ onWrite, onSelf, onKept }: { onWrite: () => void; onSelf: () => void; onKept: () => void }) {
  const left = useNextPost();
  const breath = useSharedValue(0);
  useEffect(() => {
    breath.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [breath]);
  const dozeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -4 * breath.value }, { scale: 1 + 0.03 * breath.value }],
  }));
  const zzzStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + 0.55 * breath.value,
    transform: [{ translateY: -10 * breath.value }, { translateX: 4 * breath.value }],
  }));

  return (
    <Animated.View entering={FadeIn.duration(500)} style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingBottom: 40 }}>
      {/* Wren asleep on the closed postbox */}
      <View style={{ height: 130, alignItems: "center", justifyContent: "flex-end" }}>
        <Animated.Text style={[{ position: "absolute", top: 6, right: 96, fontSize: 17 }, zzzStyle]}>💤</Animated.Text>
        <Animated.View style={dozeStyle}>
          <WrenBird size={78} mood="sleepy" />
        </Animated.View>
        <Text style={{ fontSize: 46, marginTop: -6 }}>📪</Text>
      </View>

      <Text style={{ fontFamily: F.serif, fontSize: 27, color: "#2A2153", textAlign: "center", marginTop: 18, lineHeight: 35 }}>
        that's the whole post.{"\n"}you're all caught up.
      </Text>

      {/* when the next round lands */}
      <View style={{ alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 22, paddingVertical: 16, paddingHorizontal: 28, marginTop: 22 }}>
        <Text style={{ fontFamily: F.sansExtra, fontSize: 10, letterSpacing: 1.6, color: "#8B84B8" }}>NEW LETTERS ARRIVE IN</Text>
        <Text style={{ fontFamily: F.sansExtra, fontSize: 34, color: "#2A2153", marginTop: 6, fontVariant: ["tabular-nums"] }}>{left}</Text>
      </View>

      <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: "#3B3363", textAlign: "center", marginTop: 20, lineHeight: 23 }}>
        put the phone down. go have a life —{"\n"}it's better material.
      </Text>

      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 20, paddingHorizontal: 4 }}>
        <WrenBird size={20} mood="content" />
        <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 13, color: "#4B4478", lineHeight: 20 }}>
          “and if you really can't sit still — write to yourself. no one answers. that's the point.”
        </Text>
      </View>

      <Pressable onPress={onSelf} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#1E1B2E", borderRadius: 26, paddingVertical: 15, paddingHorizontal: 26, marginTop: 20 }}>
        <Text style={{ fontFamily: F.sansExtra, fontSize: 14, color: "#fff", letterSpacing: 0.3 }}>write to yourself</Text>
        <Text style={{ fontSize: 15 }}>🕯</Text>
      </Pressable>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
        <Pressable onPress={onWrite} style={{ backgroundColor: "#fff", borderRadius: 20, paddingVertical: 12, paddingHorizontal: 18 }}>
          <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, color: "#2A2153" }}>to a stranger 🕊</Text>
        </Pressable>
        <Pressable onPress={onKept} style={{ backgroundColor: "#fff", borderRadius: 20, paddingVertical: 12, paddingHorizontal: 18 }}>
          <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, color: "#2A2153" }}>reread a kept one 📖</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

/* ticking H:MM:SS until the next 8am post — the same hour the morning knock
   is scheduled for (lib/notify.ts) */
function useNextPost() {
  const fmt = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(8, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const s = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
  };
  const [left, setLeft] = useState(fmt);
  useEffect(() => {
    const t = setInterval(() => setLeft(fmt()), 1000);
    return () => clearInterval(t);
  }, []);
  return left;
}

const waitLine = (n: number) => {
  if (n >= 4) return "the post came full today. take them one at a time.";
  if (n >= 2) return "a few are waiting. no pressure. some pressure.";
  return "this one's been waiting. no pressure. some pressure.";
};
