import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useFocusEffect, useRouter } from "expo-router";
import { C, F, shadow } from "../../theme/tokens";
import { P, PF, channelInk, rule } from "../../theme/post";
import { StampTile } from "../../components/StampTile";
import { MosaicId } from "../../components/MosaicId";
import { WrenBird } from "../../components/WrenBird";
import { AudioCard } from "../../components/AudioCard";
import { CloseOfDay } from "../../components/CloseOfDay";
import { Toast } from "../../components/ui";
import { DEMO_POOL, seedDemoThread } from "../../data/demo";
import { getStamp } from "../../data/stamps";
import { dShort, postNo } from "../../lib/format";
import { fetchPool, replyToLetter, voiceLetterUrl, type PoolLetter } from "../../lib/db";
import { getFlags, setFlag } from "../../lib/flags";
import { LETTER_MAX, REPLY_MIN, letterTier, weightedCount } from "../../lib/weighted-count";

/* Today — the post, as a stack of strangers you swipe through. Each letter fills
   the screen; if it moves you, write back and a thread opens (it moves to
   Kindreds). If it doesn't, swipe up to the next one — no guilt, no unread badge.
   Threads already going live in Kindreds now; Today is only what's fresh at your
   door. New users meet the post through a one-time ritual first (Wren's welcome),
   then land here forever. The lavender ground marks the strangers' space. */

const LAV = "#B9A8F0";
const CLOSE = "#EFE8D8"; // the close-of-day paper (CloseOfDay)
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
  // "did I close the post today" — one flag per date
  const sealKey = `sealed:${new Date().toISOString().slice(0, 10)}`;
  const [sealed, setSealed] = useState(false);
  useEffect(() => {
    getFlags().then((f) => setSealed(!!f[sealKey]));
  }, [sealKey]);
  const seal = () => {
    setSealed(true);
    void setFlag(sealKey);
  };
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
    // nothing waiting — you're already at the close of the day
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }} edges={["top"]}>
        <View style={{ flex: 1, paddingBottom: tabH }}>
          <CloseOfDay
            sealed={sealed}
            onSeal={seal}
            onWrite={() => router.push("/compose")}
            onSelf={() => router.push("/journal-entry")}
            onKept={() => router.push("/kept")}
          />
        </View>
      </SafeAreaView>
    );
  }

  const replyW = current ? weightedCount(drafts[current.id] || "") : 0;
  const replyOk = replyW >= REPLY_MIN && replyW <= LETTER_MAX;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }} edges={["top"]}>
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
            {/* swipe past the last letter and the post closes: you stamp the
                day shut. The screen behind switches to the same paper so the
                page and the ground meet without a seam. */}
            <View style={{ height: vh, backgroundColor: P.paper }}>
              <CloseOfDay
                sealed={sealed}
                onSeal={seal}
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
        <View style={{ paddingHorizontal: 26, paddingTop: 4, paddingBottom: kbOpen ? 10 : tabH + 6 }}>
          {!atEnd && current ? (
            <View style={{ minHeight: 78 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, borderWidth: 1, borderColor: P.ink, paddingLeft: 12, paddingRight: 6, paddingVertical: 5 }}>
                <TextInput
                  value={drafts[current.id] || ""}
                  onChangeText={(t) => setDrafts((d) => ({ ...d, [current.id]: t }))}
                  placeholder="write back…"
                  placeholderTextColor={P.ink40}
                  multiline
                  style={{ flex: 1, maxHeight: 104, paddingTop: 10, paddingBottom: 10, color: P.ink, fontFamily: PF.letter, fontSize: 16, lineHeight: 22 }}
                />
                <Pressable
                  onPress={send}
                  disabled={!replyOk || sending}
                  style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: replyOk && !sending ? P.pen : "transparent" }}
                >
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1, color: replyOk && !sending ? "#fff" : P.ink40 }}>
                    {sending ? "···" : "SEND"}
                  </Text>
                </Pressable>
              </View>
              <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 0.4, color: replyW > LETTER_MAX ? P.post : P.ink40, marginTop: 8 }}>
                {replyW > LETTER_MAX
                  ? `${replyW - LETTER_MAX} OVER THE LIMIT`
                  : replyOk
                    ? "A THREAD OPENS — JUST THE TWO OF YOU"
                    : "REPLY AND A THREAD OPENS"}
              </Text>
            </View>
          ) : (
            <View style={{ minHeight: 78 }} />
          )}
        </View>
      </KeyboardAvoidingView>

      {toast && <Toast msg="a thread opened — find it in Kindreds" bottom={150} />}
    </SafeAreaView>
  );
}

function Header({ count, idx, atEnd }: { count: number; idx: number; atEnd?: boolean }) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 6, paddingBottom: 9, marginHorizontal: 16 }, rule]}>
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.6, color: P.ink }}>TODAY</Text>
      <Text style={{ fontFamily: PF.mono, fontSize: 12.5, letterSpacing: 1.2, color: P.ink60 }}>
        {count === 0 ? "CLOSED" : atEnd ? "ALL READ" : `${String(idx + 1).padStart(2, "0")}/${String(count).padStart(2, "0")}`}
      </Text>
    </View>
  );
}

/* One letter, full screen. No card, no shadow, no rounding — the letter is
   printed straight onto the paper, and hairline rules do the framing. The body
   is the only serif on the screen, so the human voice sits inside the machine's
   docket. */
function LetterPage({ letter, height, first }: { letter: PoolLetter; height: number; first: boolean }) {
  const st = getStamp(letter.stamp);
  const isVoice = letter.kind === "voice" && !!letter.media_path;
  const tier = letterTier(weightedCount(letter.body || ""));
  const audioUrl = isVoice ? voiceLetterUrl(letter.media_path) : null;

  return (
    <View style={{ height, paddingHorizontal: 26, paddingTop: 26 }}>
      <Animated.View entering={FadeIn.duration(240)} style={{ flex: 1 }}>
        {/* The docket row reads like the face of an envelope: who and when
            filed on the left by the machine, the stamp pasted on the right by
            the person who sent it.

            The rule this settles: the system's CHROME is mono and black, but
            the designed artefacts — Wren, the 44 stamps, the mood faces — are
            CONTENT, and content keeps its own colour. Same licence the letter
            body gets. Stripping the stamps to fit the palette was the mistake;
            they're the reason the tab has a world at all. */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 4 }}>
            <MosaicId seed={letter.author} />
            <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 0.8, color: P.ink60 }}>
              {dShort(letter.created_at).toUpperCase().replace(" ", ".")} · NO.{postNo(letter.author)}
            </Text>
          </View>
          {st && (
            <View style={{ transform: [{ rotate: "3deg" }] }}>
              <StampTile id={letter.stamp} w={46} r={5} />
            </View>
          )}
        </View>

        <View style={{ flex: 1, justifyContent: "center" }}>
        {isVoice && audioUrl ? (
          <View>
            <Text style={{ fontFamily: PF.monoMed, fontSize: 11, letterSpacing: 1.4, color: P.pen, marginBottom: 14 }}>VOICE LETTER</Text>
            <AudioCard url={audioUrl} durationS={letter.duration_s ?? null} system />
            {!!letter.body && letter.body !== "🎙 A voice letter" && (
              <Text style={{ fontFamily: PF.serifItalic, fontSize: 15, lineHeight: 24, color: P.ink60, marginTop: 16 }}>{letter.body}</Text>
            )}
          </View>
        ) : (
          <Text
            style={{
              fontFamily: PF.letter,
              fontSize: tier.size,
              lineHeight: tier.line,
              color: P.ink,
              textAlign: tier.center ? "center" : "auto",
            }}
          >
            {letter.body}
          </Text>
        )}
        </View>

        {/* The channel, in its stamp's own colour — the pasted tile and the
            readable word are the same thing said twice, so they must not be
            two different colours. The rule carries the stamp's true hue; the
            word is that hue walked down to 4.5:1 on paper (channelInk), since
            four of the six designed colours are too light to read raw. */}
        {st && (
          <View style={{ flexDirection: "row", marginBottom: 12 }}>
            <View style={{ borderWidth: 1.5, borderColor: st.color, paddingHorizontal: 9, paddingVertical: 4 }}>
              <Text style={{ fontFamily: PF.monoMed, fontSize: 10.5, letterSpacing: 0.8, color: channelInk(st.color) }}>
                #{st.name.en.toUpperCase()}
              </Text>
            </View>
          </View>
        )}

        <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.5, color: P.ink40, marginBottom: 10 }}>
          SENT DOWN THREE STREETS · YOU OPENED IT FIRST
        </Text>

        {/* the two moves, on a rule */}
        <View style={[{ flexDirection: "row", justifyContent: "space-between", paddingTop: 10, paddingBottom: 14, borderTopWidth: 1, borderTopColor: P.ink }]}>
          <Text style={{ fontFamily: PF.mono, fontSize: 11.5, letterSpacing: 1, color: P.ink60 }}>{first ? "^ SWIPE TO PASS" : "^ PASS"}</Text>
          <Text style={{ fontFamily: PF.monoMed, fontSize: 11.5, letterSpacing: 1, color: P.pen }}>REPLY ↓</Text>
        </View>
      </Animated.View>
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

