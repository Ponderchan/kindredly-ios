import { useWrenName } from "../../lib/wren-name";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Dimensions, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useFocusEffect, useRouter } from "expo-router";
import { P, PF, channelInk, channelWash, rule } from "../../theme/post";
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
import { translate } from "../../lib/wren";
import { getFlags, setFlag } from "../../lib/flags";
import { useAuth } from "../../lib/auth";
import { STARTER_STAMPS } from "../../data/stamps";
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
    // wait for the pool before deciding what she came back with
    if (!loaded) return <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }} />;
    return (
      <Arrival
        first={feed[0] ?? null}
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
      <SafeAreaView style={{ flex: 1, backgroundColor: P.ground }} edges={["top"]}>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: P.ground }} edges={["top"]}>
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
            <View style={{ height: vh, backgroundColor: P.ground }}>
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
              {/* no box: on one white surface a filled field is just a paler
                  smudge. It's an underlined field — the rule does the work, the
                  same way every other separation on this screen does. */}
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, borderBottomWidth: 1, borderBottomColor: P.ink, paddingRight: 2, paddingVertical: 2 }}>
                <TextInput
                  value={drafts[current.id] || ""}
                  onChangeText={(t) => setDrafts((d) => ({ ...d, [current.id]: t }))}
                  placeholder="write back…"
                  placeholderTextColor={P.ink40}
                  multiline
                  style={{ flex: 1, maxHeight: 104, paddingTop: 10, paddingBottom: 10, color: P.ink, fontFamily: PF.letter, fontSize: 17, lineHeight: 23 }}
                />
                <Pressable
                  onPress={send}
                  disabled={!replyOk || sending}
                  style={{ paddingHorizontal: 10, paddingVertical: 9, backgroundColor: replyOk && !sending ? P.pen : "transparent" }}
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
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10, marginHorizontal: 16, borderBottomWidth: 1, borderBottomColor: P.ink }}>
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.6, color: P.groundInk }}>TODAY</Text>
      <Text style={{ fontFamily: PF.mono, fontSize: 12.5, letterSpacing: 1.2, color: P.groundInk60 }}>
        {count === 0 ? "CLOSED" : atEnd ? "ALL READ" : `${String(idx + 1).padStart(2, "0")}/${String(count).padStart(2, "0")}`}
      </Text>
    </View>
  );
}

/* One letter, and the paper IS the screen.

   Full bleed and white at the same time — those were never in conflict. The
   letter is not a card lying on the desk (that would demote it to a row in a
   feed, which is the opposite of what this tab is for); it's the sheet held up
   to your face. So the white runs edge to edge and the desk shows only as the
   strip above (the header) and below (where you write back).

   That keeps Today consistent with every other room — white is always where
   you read — without shrinking the one thing this screen exists to show. */
function LetterPage({ letter, height, first }: { letter: PoolLetter; height: number; first: boolean }) {
  const wren = useWrenName();
  const st = getStamp(letter.stamp);
  const isVoice = letter.kind === "voice" && !!letter.media_path;
  const audioUrl = isVoice ? voiceLetterUrl(letter.media_path) : null;

  // Wren translating this letter. Kept per-letter — each page holds its own,
  // so translating one doesn't touch the others in the stack.
  const [xl, setXl] = useState<string | null>(null);
  const [xlOn, setXlOn] = useState(false);
  const [xlBusy, setXlBusy] = useState(false);
  const shown = xlOn && xl ? xl : letter.body;
  const tier = letterTier(weightedCount(shown || ""));

  const doTranslate = async () => {
    if (xl) {
      setXlOn((v) => !v);
      return;
    }
    if (xlBusy || !letter.body) return;
    setXlBusy(true);
    const to = (Intl.DateTimeFormat().resolvedOptions().locale || "en").split("-")[0];
    const t = await translate(letter.body, to);
    setXlBusy(false);
    if (t) {
      setXl(t);
      setXlOn(true);
    } else Alert.alert(`${wren} couldn't translate this`, "Try again in a moment.");
  };

  return (
    <View style={{ height, backgroundColor: P.sheet, paddingHorizontal: 26, paddingTop: 26 }}>
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
            {shown}
          </Text>
        )}
        </View>

        {/* The channel, in its stamp's own colour — the pasted tile and the
            readable word are the same thing said twice, so they can't be two
            different colours. Washed background so the hue is actually present
            on the page, true colour on the rule, word darkened to clear 4.5:1
            against its own wash.

            LOWERCASE, deliberately: the stamp is picked by the person writing,
            not assigned by the system, so it doesn't get the machine's
            all-caps voice. Everything the system itself says on this page is
            upper — this one thing isn't, because it isn't the system talking. */}
        {st && (
          <View style={{ flexDirection: "row", marginBottom: 12 }}>
            <View
              style={{
                backgroundColor: channelWash(st.color),
                borderWidth: 1,
                borderColor: st.color,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
            >
              <Text style={{ fontFamily: PF.monoMed, fontSize: 12, letterSpacing: 0.2, color: channelInk(st.color) }}>
                #{st.name.en.toLowerCase()}
              </Text>
            </View>
          </View>
        )}

        <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.5, color: P.ink40, marginBottom: 10 }}>
          SENT DOWN THREE STREETS · YOU OPENED IT FIRST
        </Text>

        {/* the two moves, on a rule */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 10, paddingBottom: 14, borderTopWidth: 1, borderTopColor: P.ink }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 11.5, letterSpacing: 1, color: P.ink60 }}>{first ? "^ SWIPE TO PASS" : "^ PASS"}</Text>
          {!isVoice && !!letter.body && (
            <Pressable onPress={doTranslate} hitSlop={10}>
              <Text style={{ fontFamily: PF.monoMed, fontSize: 11.5, letterSpacing: 1, color: xlOn ? P.pen : P.ink60 }}>
                {xlBusy ? "TRANSLATING…" : xlOn ? "ORIGINAL" : "TRANSLATE"}
              </Text>
            </Pressable>
          )}
          <Text style={{ fontFamily: PF.monoMed, fontSize: 11.5, letterSpacing: 1, color: P.pen }}>REPLY ↓</Text>
        </View>
      </Animated.View>
    </View>
  );
}

/* ── SHE COMES BACK ──────────────────────────────────────────────────────
   The hatch ends with her flying off carrying your letter. Nothing used to
   close that loop: you landed on a one-time "A LETTER FROM WREN" that
   explained the rules — a manual wearing a letter's clothes, arriving in a
   product whose whole premise is that letters come from strangers. It also
   re-taught what onboarding had just spent nine screens teaching.

   So the landing is her RETURN, in three beats, and every one of them is
   something that actually just happened:

     1. THE RECEIPT — your letter really did leave. The docket is built the
        same way the world will see it (postNo/MosaicId off your own id, the
        stamp onboarding posted it with), so this is a counterfoil, not a
        graphic.
     2. THE HONEST WAIT — nobody has replied, and nobody will for hours. Say
        so. Never fake a reply to fill a gap.
     3. WHAT SHE FOUND — the first real letter from the pool, framed as
        something she brought back. That's the core loop demonstrated in
        twenty seconds, handed over at the moment the reader is most open —
        and the rules the old welcome listed are printed on the letter page
        itself (^ SWIPE TO PASS · REPLY ↓), so they teach themselves.

   If the pool is genuinely empty, beat 3 says that plainly rather than
   inventing something to hand over. */
function Arrival({ first, onDone }: { first: PoolLetter | null; onDone: () => void }) {
  const { user, profile } = useAuth();
  const wren = useWrenName();
  const [beat, setBeat] = useState(0);
  const line = ((profile?.firstLine as string) || "").trim();
  const uid = user?.id || "you";

  useEffect(() => {
    const a = setTimeout(() => setBeat(1), 1500);
    const b = setTimeout(() => setBeat(2), 3200);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 22, paddingBottom: 10 }}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 2, color: P.ink, flex: 1 }}>TODAY</Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 1.4, color: P.ink40 }}>SHE'S BACK</Text>
      </View>
      <View style={{ ...rule }} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 26, paddingBottom: 96 }} showsVerticalScrollIndicator={false}>
        {/* she lands */}
        <Animated.View entering={FadeIn.duration(520)} style={{ alignItems: "center" }}>
          <WrenBird size={92} mood="delight" />
        </Animated.View>

        {/* 1 · the receipt — the same docket the world will see on it */}
        <Animated.View entering={FadeIn.delay(280).duration(560)} style={{ marginTop: 18 }}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 2, color: P.ink60, marginBottom: 10 }}>YOUR LETTER LEFT</Text>
          <View style={{ borderWidth: 1, borderColor: P.ink, padding: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <MosaicId seed={uid} />
              <Text style={{ flex: 1, fontFamily: PF.mono, fontSize: 11.5, letterSpacing: 0.6, color: P.ink60, marginLeft: 12, marginTop: 3 }}>
                {dShort(new Date().toISOString()).toUpperCase().replace(" ", ".")} · NO.{postNo(uid)}
              </Text>
              <View style={{ transform: [{ rotate: "-5deg" }] }}>
                <StampTile id={STARTER_STAMPS[0]} w={44} r={5} />
              </View>
            </View>
            {!!line && (
              <Text numberOfLines={3} style={{ fontFamily: PF.letter, fontSize: 16, lineHeight: 24, color: P.ink, marginTop: 14 }}>
                {line}
              </Text>
            )}
            <View style={{ marginTop: 14, alignSelf: "flex-start", borderWidth: 1.4, borderColor: P.post, paddingHorizontal: 9, paddingVertical: 3, transform: [{ rotate: "-1.5deg" }] }}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.6, color: P.post }}>POSTED</Text>
            </View>
          </View>
        </Animated.View>

        {/* 2 · the honest wait */}
        {beat >= 1 && (
          <Animated.View entering={FadeInDown.duration(520)} style={{ marginTop: 26 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <WrenBird size={34} mood="listen" />
              <Text style={{ flex: 1, fontFamily: PF.serifItalic, fontSize: 16.5, lineHeight: 25, color: P.ink, marginLeft: 12, marginTop: 2 }}>
                Nothing's come back yet — it's too soon. Answers take hours, sometimes days. That's the point.
              </Text>
            </View>
          </Animated.View>
        )}

        {/* 3 · what she found on the way, or the truth that she found nothing */}
        {beat >= 2 && (
          <Animated.View entering={FadeInDown.duration(560)} style={{ marginTop: 26 }}>
            <View style={{ ...rule, marginBottom: 18 }} />
            {first ? (
              <>
                <Text style={{ fontFamily: PF.serifItalic, fontSize: 16.5, lineHeight: 25, color: P.ink }}>
                  But {wren} picked this up on the way home.
                </Text>
                <View style={{ borderWidth: 1, borderColor: P.ink12, padding: 14, marginTop: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <MosaicId seed={first.author} cell={3} gap={1} />
                    <Text style={{ flex: 1, fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 0.6, color: P.ink40, marginLeft: 10 }}>
                      NO.{postNo(first.author)} · A STRANGER
                    </Text>
                  </View>
                  <Text numberOfLines={2} style={{ fontFamily: PF.letter, fontSize: 15, lineHeight: 23, color: P.ink60, marginTop: 10 }}>
                    {(first.body || "").trim()}
                  </Text>
                </View>
                <Pressable onPress={onDone} style={{ backgroundColor: P.pen, paddingVertical: 16, alignItems: "center", marginTop: 18 }}>
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 2, color: "#fff" }}>READ IT</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={{ fontFamily: PF.serifItalic, fontSize: 16.5, lineHeight: 25, color: P.ink }}>
                  The post is empty today — you're early. When the first one lands, {wren} brings it straight here.
                </Text>
                <Pressable onPress={onDone} style={{ borderWidth: 1, borderColor: P.ink, paddingVertical: 16, alignItems: "center", marginTop: 18 }}>
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 2, color: P.ink }}>LOOK AROUND</Text>
                </Pressable>
              </>
            )}
          </Animated.View>
        )}
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

