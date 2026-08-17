import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, type DimensionValue } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing, FadeIn, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { useFocusEffect, useRouter } from "expo-router";
import { C, F, shadow } from "../../theme/tokens";
import { StampTile } from "../../components/StampTile";
import { StrangerAvatar } from "../../components/StrangerAvatar";
import { WrenBird } from "../../components/WrenBird";
import { AudioCard } from "../../components/AudioCard";
import { Toast } from "../../components/ui";
import { DEMO_POOL, seedDemoThread } from "../../data/demo";
import { getStamp } from "../../data/stamps";
import { dShort } from "../../lib/format";
import { fetchPool, replyToLetter, voiceLetterUrl, type PoolLetter } from "../../lib/db";
import { MORNING_HOUR } from "../../lib/notify";
import { getFlags, setFlag } from "../../lib/flags";
import { LETTER_MAX, REPLY_MIN, letterTier, weightedCount } from "../../lib/weighted-count";

/* Today — the post, as a stack of strangers you swipe through. Each letter fills
   the screen; if it moves you, write back and a thread opens (it moves to
   Kindreds). If it doesn't, swipe up to the next one — no guilt, no unread badge.
   Threads already going live in Kindreds now; Today is only what's fresh at your
   door. New users meet the post through a one-time ritual first (Wren's welcome),
   then land here forever. The lavender ground marks the strangers' space. */

const LAV = "#B9A8F0";
const NIGHT = "#4C3F86"; // the top of the night gradient — the post, closed
const PAPER = "#FBF7EC";
const W = Dimensions.get("window").width;
const WINDOW_H = Dimensions.get("window").height;
const RITUAL_FLAG = "today_ritual";

export default function LettersTab() {
  const router = useRouter();
  const [pool, setPool] = useState<PoolLetter[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [ritualDone, setRitualDone] = useState<boolean | null>(null);

  useEffect(() => {
    getFlags().then((f) => setRitualDone(!!f[RITUAL_FLAG]));
  }, []);

  const load = useCallback(async () => {
    setPool((await fetchPool()) || []);
    setLoaded(true);
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const demo = __DEV__ && loaded && pool.length === 0;
  const feed = demo ? DEMO_POOL : pool;

  // first run: the ritual gate hasn't resolved yet
  if (ritualDone === null) return <SafeAreaView style={{ flex: 1, backgroundColor: LAV }} />;

  // the one-time ceremony — open your first letter, then the post is yours
  if (!ritualDone) {
    return (
      <Ritual
        onDone={async () => {
          await setFlag(RITUAL_FLAG);
          setRitualDone(true);
        }}
      />
    );
  }

  return <Feed feed={feed} loaded={loaded} onReloaded={load} router={router} demo={demo} />;
}

/* ── the everyday swipe feed ── */
function Feed({
  feed,
  loaded,
  onReloaded,
  router,
  demo,
}: {
  feed: PoolLetter[];
  loaded: boolean;
  onReloaded: () => void;
  router: ReturnType<typeof useRouter>;
  demo: boolean;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const tabH = 62 + Math.max(insets.bottom, 8); // matches the custom TabBar height
  const [idx, setIdx] = useState(0);
  const [vh, setVh] = useState(WINDOW_H - 250);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [toast, setToast] = useState(false);
  const [sending, setSending] = useState(false);
  const [kbOpen, setKbOpen] = useState(false);

  useEffect(() => {
    const s = Keyboard.addListener("keyboardWillShow", () => setKbOpen(true));
    const h = Keyboard.addListener("keyboardWillHide", () => setKbOpen(false));
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  const quiet = loaded && feed.length === 0;
  const atEnd = idx >= feed.length;
  const current = feed[idx];

  const goto = (i: number) => {
    scrollRef.current?.scrollTo({ y: i * vh, animated: true });
    setIdx(i);
  };

  const send = async () => {
    if (!current || sending) return;
    const text = (drafts[current.id] || "").trim();
    const w = weightedCount(text);
    if (w < REPLY_MIN || w > LETTER_MAX) return;
    setSending(true);
    Keyboard.dismiss();
    if (demo || current.author?.startsWith("demo-")) {
      seedDemoThread(current, text);
    } else {
      await replyToLetter(current, text);
    }
    setSending(false);
    setDrafts((d) => ({ ...d, [current.id]: "" }));
    setToast(true);
    setTimeout(() => setToast(false), 2200);
    goto(idx + 1); // a thread opened — it lives in Kindreds now; move along
  };

  if (quiet) {
    // nothing came today — the whole screen is already night
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: NIGHT }} edges={["top"]}>
        <Header count={0} idx={0} night />
        <Quiet onWrite={() => router.push("/compose")} onSelf={() => router.push("/journal-entry")} onKept={() => router.push("/kept")} />
      </SafeAreaView>
    );
  }

  const replyW = current ? weightedCount(drafts[current.id] || "") : 0;
  const replyOk = replyW >= REPLY_MIN && replyW <= LETTER_MAX;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: atEnd ? NIGHT : LAV }} edges={["top"]}>
      <Header count={feed.length} idx={Math.min(idx, feed.length - 1)} atEnd={atEnd} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1 }} onLayout={(e) => setVh(e.nativeEvent.layout.height)}>
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            decelerationRate="fast"
            onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.y / vh))}
          >
            {feed.map((letter, i) => (
              <LetterPage key={letter.id} letter={letter} height={vh} first={i === 0 && idx === 0} />
            ))}
            {/* the post closes for the day once you've swiped through them all.
                It carries its own night sky; the screen behind goes dark too
                (SafeAreaView switches to NIGHT at atEnd) so they meet seamlessly. */}
            <View style={{ height: vh, backgroundColor: "#211A44" }}>
              <Quiet
                compact
                onWrite={() => router.push("/compose")}
                onSelf={() => router.push("/journal-entry")}
                onKept={() => router.push("/kept")}
              />
            </View>
          </ScrollView>
        </View>

        {/* one shared reply bar, bound to the letter you're on. Always rendered
            at a constant height (even on the caught-up page) so the pager's page
            height never shifts under it. */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: kbOpen ? 10 : tabH + 6 }}>
          {/* at the end the bar is empty — carry the night's bottom colour
              through it so the sky meets the tab bar without a seam */}
          {atEnd && <LinearGradient colors={["#211A44", "#191338"]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />}
          {!atEnd && current ? (
            <View style={{ minHeight: 82 }}>
              <View style={[{ flexDirection: "row", alignItems: "flex-end", gap: 8, backgroundColor: "#fff", borderRadius: 26, paddingLeft: 18, paddingRight: 7, paddingVertical: 7 }, shadow.card]}>
                <TextInput
                  value={drafts[current.id] || ""}
                  onChangeText={(t) => setDrafts((d) => ({ ...d, [current.id]: t }))}
                  placeholder="write them back…"
                  placeholderTextColor="#B3A4E0"
                  multiline
                  style={{ flex: 1, maxHeight: 110, paddingTop: 11, paddingBottom: 11, color: "#2A2153", fontFamily: F.letter, fontSize: 16, lineHeight: 22 }}
                />
                <Pressable
                  onPress={send}
                  disabled={!replyOk || sending}
                  style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "#4B3F86", alignItems: "center", justifyContent: "center", opacity: !replyOk || sending ? 0.4 : 1 }}
                >
                  <Text style={{ fontSize: 18 }}>✈️</Text>
                </Pressable>
              </View>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: replyW > LETTER_MAX ? "#C0503A" : "rgba(43,33,83,0.6)", textAlign: "center", marginTop: 8 }}>
                {replyW > LETTER_MAX
                  ? `${replyW - LETTER_MAX} over`
                  : replyOk
                    ? "reply and a thread opens — just the two of you"
                    : "↑ swipe up to pass · write back to keep them"}
              </Text>
            </View>
          ) : (
            <View style={{ minHeight: 82 }} />
          )}
        </View>
      </KeyboardAvoidingView>

      {toast && <Toast msg="a thread opened — find it in Kindreds" bottom={150} />}
    </SafeAreaView>
  );
}

function Header({ count, idx, atEnd, night }: { count: number; idx: number; atEnd?: boolean; night?: boolean }) {
  const dark = night || atEnd; // once the post closes, the header goes night too
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 4, paddingBottom: 6 }}>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 30, color: dark ? "#F4EFE1" : "#2A2153" }}>today</Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 7,
          backgroundColor: dark ? "rgba(255,255,255,0.1)" : "#FFFFFF",
          borderWidth: dark ? 1 : 0,
          borderColor: "rgba(255,246,218,0.22)",
          borderRadius: 16,
          paddingHorizontal: 13,
          paddingVertical: 8,
        }}
      >
        <Text style={{ fontFamily: F.sansExtra, fontSize: 10.5, letterSpacing: 1.2, color: dark ? "#FFF6DA" : "#2A2153" }}>
          {count === 0 ? "GOODNIGHT" : atEnd ? "ALL READ" : `${idx + 1} / ${count}`}
        </Text>
        <Text style={{ fontSize: 11 }}>{dark ? "🌙" : "✉️"}</Text>
      </View>
    </View>
  );
}

/* one full-screen letter in the feed */
function LetterPage({ letter, height, first }: { letter: PoolLetter; height: number; first: boolean }) {
  const st = getStamp(letter.stamp);
  const isVoice = letter.kind === "voice" && !!letter.media_path;
  const tier = letterTier(weightedCount(letter.body || ""));
  const audioUrl = isVoice ? voiceLetterUrl(letter.media_path) : null;

  return (
    <View style={{ height, paddingHorizontal: 22, justifyContent: "center" }}>
      <Animated.View entering={FadeIn.duration(300)} style={[{ backgroundColor: PAPER, borderRadius: 24, padding: 24, paddingTop: 20 }, shadow.card]}>
        {/* pasted stamp */}
        {st && (
          <View style={{ position: "absolute", top: -8, right: 18, transform: [{ rotate: "7deg" }], zIndex: 2 }}>
            <StampTile id={letter.stamp} w={52} r={5} />
          </View>
        )}
        {/* who + when — a faceless mosaic seal + the date, nothing else. The
            corner stamp is the topic; the provenance line below says it's a
            stranger's. No number, no label. */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <StrangerAvatar seed={letter.author} size={32} round />
          <Text style={{ fontFamily: F.sansExtra, fontSize: 10.5, letterSpacing: 1.4, color: "#9A7B3A" }}>
            {dShort(letter.created_at).toUpperCase()}
          </Text>
        </View>

        {isVoice && audioUrl ? (
          <View style={{ marginTop: 22 }}>
            <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1.4, color: C.purple, marginBottom: 14 }}>🎙 A VOICE LETTER</Text>
            <AudioCard url={audioUrl} durationS={letter.duration_s ?? null} />
            {!!letter.body && letter.body !== "🎙 A voice letter" && (
              <Text style={{ fontFamily: F.letterItalic, fontSize: 15, lineHeight: 24, color: "#6A6280", marginTop: 16 }}>“{letter.body}”</Text>
            )}
          </View>
        ) : (
          <Text
            style={{
              fontFamily: F.letter,
              fontSize: tier.size,
              lineHeight: tier.line,
              color: "#22222A",
              marginTop: tier.center ? 26 : 18,
              textAlign: tier.center ? "center" : "auto",
              paddingBottom: tier.center ? 10 : 0,
            }}
          >
            {letter.body}
          </Text>
        )}

        {/* the channel as a hashtag — the one readable topic label (the corner
            tile is the icon; matches the composer's stamp chip) */}
        {st && (
          <View style={{ flexDirection: "row", marginTop: 22 }}>
            <View style={{ backgroundColor: `${st.color}16`, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 7 }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: 12, color: st.color }}>#{st.name.en.toLowerCase()}</Text>
            </View>
          </View>
        )}
        <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: "#9A8B6A", marginTop: 16, lineHeight: 18 }}>
          Sent down three streets. You were the first to open it.
        </Text>
      </Animated.View>

      {/* the swipe affordance — teach it on the very first letter */}
      <View style={{ alignItems: "center", marginTop: 18 }}>
        <Text style={{ fontSize: 15, color: "rgba(43,33,83,0.5)" }}>↑</Text>
        <Text style={{ fontFamily: F.sansExtra, fontSize: 9.5, letterSpacing: 1.4, color: "rgba(43,33,83,0.5)", marginTop: 2 }}>
          {first ? "SWIPE UP FOR THE NEXT" : "NEXT"}
        </Text>
      </View>
    </View>
  );
}

/* ── the one-time ritual: an envelope, then Wren's welcome ── */
function Ritual({ onDone }: { onDone: () => void }) {
  const [opened, setOpened] = useState(false);

  if (!opened) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: LAV }} edges={["top"]}>
        <View style={{ paddingHorizontal: 24, paddingTop: 6 }}>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 30, color: "#2A2153" }}>the post</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 }}>
          <Text style={{ fontFamily: F.sansExtra, fontSize: 10.5, letterSpacing: 1.8, color: "rgba(42,33,83,0.65)", textAlign: "center", marginBottom: 22 }}>
            SOMETHING IS ALREADY WAITING FOR YOU
          </Text>
          <Pressable onPress={() => setOpened(true)} style={{ width: W - 76 }}>
            <View style={{ position: "absolute", left: 14, right: 14, top: 18, height: 180, backgroundColor: "#EFE9D9", borderRadius: 18, transform: [{ rotate: "2.5deg" }] }} />
            <View style={{ position: "absolute", left: 8, right: 8, top: 10, height: 190, backgroundColor: "#F4EFE1", borderRadius: 18, transform: [{ rotate: "-1.5deg" }] }} />
            <View style={[{ backgroundColor: PAPER, borderRadius: 20, overflow: "hidden", transform: [{ rotate: "-0.5deg" }] }, shadow.card]}>
              <Airmail />
              <View style={{ padding: 22, minHeight: 180 }}>
                <View style={{ position: "absolute", top: 14, right: 16 }}>
                  <WrenBird size={40} mood="content" />
                </View>
                <Text style={{ fontFamily: F.sansExtra, fontSize: 10, letterSpacing: 1, color: "#9A7B3A" }}>FROM WREN · FOR YOU</Text>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 21, color: "#4A4266", marginTop: 20, lineHeight: 29 }}>“You made it inside. Let me show you how the post works…”</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 24 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#EF5A5A", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 17 }}>💌</Text>
                  </View>
                  <Text style={{ fontFamily: F.sansExtra, fontSize: 12.5, letterSpacing: 1.4, color: "#C0503A" }}>OPEN IT →</Text>
                </View>
              </View>
            </View>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return <Welcome onDone={onDone} />;
}

/* Wren's welcome letter — read-only; it teaches the swipe-and-write ritual and
   hands the reader into the everyday feed. */
function Welcome({ onDone }: { onDone: () => void }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(500)}>
          <View style={{ alignItems: "center", marginBottom: 18 }}>
            <WrenBird size={64} mood="content" />
          </View>
          <Text style={{ fontFamily: F.sansExtra, fontSize: 10, letterSpacing: 1.6, color: C.faint, textAlign: "center" }}>A LETTER FROM WREN</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 24, color: C.ink, textAlign: "center", marginTop: 10, lineHeight: 32 }}>
            You made it inside.
          </Text>
          <Text style={{ fontFamily: F.letter, fontSize: 16, lineHeight: 27, color: "#3A3548", marginTop: 22 }}>
            Here's how the post works.{"\n\n"}
            Every day, letters from strangers come to your door. You read them one at a time — the whole screen, no feed to skim.{"\n\n"}
            If one moves you, <Text style={{ fontFamily: F.letterItalic }}>write back</Text>, and a thread opens — just the two of you. It'll be waiting in Kindreds.{"\n\n"}
            If it doesn't, <Text style={{ fontFamily: F.letterItalic }}>swipe up</Text>. No guilt. No unread badge chasing you.{"\n\n"}
            Five letters each way, and I'll tell you each other's names.{"\n\n"}
            Write when something's true, not when it's polished. I'll be listening.
          </Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.muted, marginTop: 18, textAlign: "right" }}>— Wren</Text>

          <Pressable
            onPress={onDone}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1E1B2E", borderRadius: 26, paddingVertical: 16, marginTop: 30, opacity: pressed ? 0.92 : 1 })}
          >
            <Text style={{ fontFamily: F.sansExtra, fontSize: 14, color: "#fff", letterSpacing: 0.3 }}>step into the post</Text>
            <Text style={{ fontSize: 15 }}>🕊</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
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

/* You've read everything that came, so the post closes for the night — and the
   screen goes with it. The lavender day drains into a night sky: stars come out
   in their own time, one drifts loose every so often, the moon hangs in the
   corner, Wren curls up asleep, and the countdown to the morning post glows like
   a lit window. It's the app saying goodnight, not an empty state.
   `compact` trims it to sit as the last page of the feed. */

/* deterministic star field — no Math.random so it doesn't reshuffle on render */
/* Hand-placed so the sky reads as scattered — every generated sequence I tried
   fell into visible rows or columns. Left column stays clear of the copy; the
   right side is sparser around the moon. [x%, y%, size, brightness] */
const STARS = (
  [
    [7, 9, 2.2, 0.7], [15, 26, 1.6, 0.5], [4, 41, 2.6, 0.85], [12, 55, 1.8, 0.55],
    [21, 14, 1.5, 0.45], [9, 68, 2.0, 0.65], [18, 44, 2.4, 0.75], [26, 62, 1.6, 0.5],
    [3, 21, 1.7, 0.5], [23, 35, 2.1, 0.6], [14, 5, 1.9, 0.6], [30, 24, 1.5, 0.42],
    [6, 57, 1.6, 0.48], [28, 48, 1.8, 0.55], [19, 71, 2.3, 0.7],
    [93, 12, 2.3, 0.75], [86, 31, 1.7, 0.5], [96, 46, 2.0, 0.62], [79, 55, 2.5, 0.8],
    [89, 64, 1.6, 0.48], [97, 27, 1.5, 0.45], [83, 44, 1.9, 0.58], [92, 70, 2.2, 0.68],
    [75, 20, 1.5, 0.4], [88, 8, 1.8, 0.55], [70, 66, 1.7, 0.5], [95, 58, 1.6, 0.46],
    [77, 38, 2.0, 0.6], [66, 48, 1.5, 0.42], [72, 9, 1.6, 0.45],
  ] as const
).map(([x, y, size, bright], i) => ({
  left: `${x}%` as DimensionValue,
  top: `${y}%` as DimensionValue,
  size,
  bright,
  dur: 1900 + ((i * 13) % 6) * 330,
}));

function Star({ s }: { s: (typeof STARS)[number] }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: s.dur, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t, s.dur]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 1], [s.bright * 0.25, s.bright]),
    transform: [{ scale: interpolate(t.value, [0, 1], [0.7, 1]) }],
  }));
  return (
    <Animated.View
      style={[
        { position: "absolute", left: s.left, top: s.top, width: s.size, height: s.size, borderRadius: s.size / 2, backgroundColor: "#FFF6DA" },
        style,
      ]}
    />
  );
}

/* a star comes loose now and then and slides across the sky */
function ShootingStar({ delay, from, to }: { delay: number; from: number; to: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    const id = setTimeout(() => {
      t.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.linear }), -1, false);
    }, delay);
    return () => clearTimeout(id);
  }, [t, delay]);
  // it only exists for a heartbeat inside each 9s cycle
  const style = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, (t.value - 0.06) / 0.11)); // the visible dash
    return {
      opacity: t.value > 0.06 && t.value < 0.17 ? Math.sin(p * Math.PI) : 0,
      transform: [{ translateX: interpolate(p, [0, 1], [0, 150]) }, { translateY: interpolate(p, [0, 1], [0, 92]) }, { rotate: "31deg" }],
    };
  });
  return (
    <Animated.View style={[{ position: "absolute", left: from, top: to, width: 56, height: 1.6, borderRadius: 1 }, style]}>
      <LinearGradient colors={["rgba(255,246,218,0)", "#FFF6DA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, borderRadius: 1 }} />
    </Animated.View>
  );
}

function Moon() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t]);
  const glow = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [0, 1], [0.5, 0.9]), transform: [{ scale: interpolate(t.value, [0, 1], [1, 1.06]) }] }));
  return (
    <View style={{ position: "absolute", right: 34, top: 22 }}>
      {/* soft halo — stacked rings, so it reads as light, not a grey disc */}
      <Animated.View style={[{ position: "absolute", left: -33, top: -33, width: 104, height: 104 }, glow]}>
        <View style={{ position: "absolute", left: 0, top: 0, width: 104, height: 104, borderRadius: 52, backgroundColor: "rgba(255,233,168,0.05)" }} />
        <View style={{ position: "absolute", left: 16, top: 16, width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,233,168,0.07)" }} />
        <View style={{ position: "absolute", left: 28, top: 28, width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,233,168,0.1)" }} />
      </Animated.View>
      <Svg width={38} height={38} viewBox="0 0 24 24">
        <Path d="M20.5 14.5A9 9 0 1 1 10 3.2a7.2 7.2 0 0 0 10.5 11.3Z" fill="#FFEFC0" />
      </Svg>
    </View>
  );
}

function Quiet({ onWrite, onSelf, onKept, compact }: { onWrite: () => void; onSelf: () => void; onKept: () => void; compact?: boolean }) {
  const left = useNextPost();
  const insets = useSafeAreaInsets();
  const tabH = 62 + Math.max(insets.bottom, 8);
  const breath = useSharedValue(0);
  useEffect(() => {
    breath.value = withRepeat(withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [breath]);

  // Wren's slow sleeping breath
  const dozeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(breath.value, [0, 1], [0, -5]) }, { scale: interpolate(breath.value, [0, 1], [1, 1.035]) }],
  }));
  const zzzStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breath.value, [0, 1], [0.2, 0.75]),
    transform: [{ translateY: interpolate(breath.value, [0, 1], [0, -12]) }, { translateX: interpolate(breath.value, [0, 1], [0, 5]) }],
  }));
  // the lit window under the countdown pulses very faintly
  const lampStyle = useAnimatedStyle(() => ({ opacity: interpolate(breath.value, [0, 1], [0.5, 0.85]) }));

  return (
    <View style={{ flex: 1 }}>
      {/* the night itself — bleeds past the page so the feed's last page and the
          area behind the tab bar are the same sky */}
      <LinearGradient colors={["#4C3F86", "#312860", "#211A44"]} locations={[0, 0.55, 1]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: "72%" }}>
        {STARS.map((s, i) => (
          <Star key={i} s={s} />
        ))}
        <ShootingStar delay={1500} from={40} to={70} />
        <ShootingStar delay={6200} from={190} to={30} />
        <Moon />
      </View>

      <Animated.View
        entering={FadeIn.duration(700)}
        style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingBottom: compact ? 16 : tabH + 16 }}
      >
        {/* Wren asleep on the closed postbox */}
        <View style={{ height: compact ? 104 : 124, alignItems: "center", justifyContent: "flex-end" }}>
          <Animated.Text style={[{ position: "absolute", top: 2, right: 92, fontSize: 16 }, zzzStyle]}>💤</Animated.Text>
          <Animated.View style={dozeStyle}>
            <WrenBird size={compact ? 62 : 76} mood="sleepy" />
          </Animated.View>
          <Text style={{ fontSize: compact ? 38 : 44, marginTop: -6 }}>📪</Text>
        </View>

        <Text style={{ fontFamily: F.serif, fontSize: compact ? 24 : 27, color: "#F4EFE1", textAlign: "center", marginTop: 14, lineHeight: compact ? 32 : 35 }}>
          that's the whole post.{"\n"}you're all caught up.
        </Text>

        {/* the countdown as a lit window in the dark — the glow is a warm ring
            that breathes, never a filled block */}
        <View style={{ marginTop: 18 }}>
          <Animated.View
            style={[
              { position: "absolute", left: -6, right: -6, top: -6, bottom: -6, borderRadius: 28, borderWidth: 6, borderColor: "rgba(255,233,168,0.07)" },
              lampStyle,
            ]}
          />
          <View style={{ alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 22, borderWidth: 1, borderColor: "rgba(255,246,218,0.2)", paddingVertical: 13, paddingHorizontal: 28 }}>
            <Text style={{ fontFamily: F.sansExtra, fontSize: 9.5, letterSpacing: 1.6, color: "#B6AEE8" }}>THE MORNING POST LANDS IN</Text>
            <Text style={{ fontFamily: F.sansExtra, fontSize: 32, color: "#FFF6DA", marginTop: 5, fontVariant: ["tabular-nums"] }}>{left}</Text>
          </View>
        </View>

        <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, color: "#C9C1F0", textAlign: "center", marginTop: 16, lineHeight: 22 }}>
          put the phone down. go have a life —{"\n"}it's better material.
        </Text>

        <Pressable
          onPress={onSelf}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF6DA", borderRadius: 26, paddingVertical: 14, paddingHorizontal: 24, marginTop: 18, opacity: pressed ? 0.9 : 1 })}
        >
          <Text style={{ fontFamily: F.sansExtra, fontSize: 13.5, color: "#221B45", letterSpacing: 0.3 }}>write to yourself</Text>
          <Text style={{ fontSize: 15 }}>🕯</Text>
        </Pressable>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <Pressable onPress={onWrite} style={({ pressed }) => ({ backgroundColor: "rgba(255,255,255,0.09)", borderWidth: 1, borderColor: "rgba(255,246,218,0.2)", borderRadius: 20, paddingVertical: 11, paddingHorizontal: 18, opacity: pressed ? 0.75 : 1 })}>
            <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, color: "#EFE9FF" }}>to a stranger 🕊</Text>
          </Pressable>
          <Pressable onPress={onKept} style={({ pressed }) => ({ backgroundColor: "rgba(255,255,255,0.09)", borderWidth: 1, borderColor: "rgba(255,246,218,0.2)", borderRadius: 20, paddingVertical: 11, paddingHorizontal: 18, opacity: pressed ? 0.75 : 1 })}>
            <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, color: "#EFE9FF" }}>reread a kept one 📖</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

/* ticking H:MM:SS until the next morning post — the same hour the morning
   knock fires (MORNING_HOUR, lib/notify.ts), so the two never disagree */
function useNextPost() {
  const fmt = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(MORNING_HOUR, 0, 0, 0);
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
