import { useEffect, useRef, useState } from "react";
import { Alert, Dimensions, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import * as AppleAuthentication from "expo-apple-authentication";
import { F2, Y, bevel, card, key as keyBtn, mono, tag } from "../theme/y2k";
import { Wheel } from "../components/Wheel";
import { MONTHS } from "../data/content";
import { useAuth } from "../lib/auth";
import { publishLetter, upsertFingerprint } from "../lib/db";
import { signatureVector, voiceSignature } from "../lib/signature";
import { WrenBird, type WrenMood } from "../components/WrenBird";
import { EGG_SHELLS, EggShell } from "../components/EggShell";
import { AvatarImage } from "../components/AvatarImage";
import { AVATARS } from "../data/avatar-lib";
import { hatchLine, readMood } from "../lib/wren-read";
import { bumpStageFloor, setWrenAccessory } from "../lib/wren-style";
import { saveWrenType, wrenTypeFor } from "../lib/wren-type";
import { NAME_IDEAS, saveWrenEgg, saveWrenName } from "../lib/wren-name";
import { STARTER_STAMPS } from "../data/stamps";
import { OPENING_MIN, weightedCount } from "../lib/weighted-count";
import { MOODS, MOOD_IDS, type MoodId } from "../data/moods";

/* Onboarding — EGG OS.
   ────────────────────────────────────────────────────────────────────────
   Eight screens, and the length is the point. This is the one place in the
   product allowed to be a toy: a Y2K handheld pet console where you choose a
   courier, name her, feed her your first words, and watch her hatch into a
   card with a rarity on it. The app behind this is white paper and hairlines
   — this is the box it came in, so it gets to be loud.

     welcome   KINDREDLY.EXE — the pitch, and the way in
     username  your pen name
     cakeday   your birthday, which exists for the 18+ gate
     avatar    a face, purely for you
     egg       CHOOSE YOUR COURIER — the shell she'll come out of
     naming    what you call her, for good
     write     feed her words; the meter fills as you write
     hatch     NEW HATCH UNLOCKED — who she turned out to be

   TWO SCREENS THAT USED TO BE THEATRE NOW KEEP THEIR PROMISES:

   · The egg is SAVED (lib/wren-name.ts). It used to be picked and then
     dropped on the way out — you chose a shell and the app had forgotten
     before onboarding finished. It's also no longer "a colour": the screen
     says what the choice actually is, which is the bird who carries your
     letters, and that her shell is the only part of her you get to pick.

   · The mood row is READ. It used to set nothing whatsoever — her hatch face
     came from readMood() off the text either way. Now a picked mood wins and
     the text is only the fallback, so the control does what it looks like it
     does.

   WHAT SHE'S CALLED. The naming screen is new and load-bearing: from here on
   every line she speaks anywhere in the app uses the name you gave her, with
   "Wren" left as the fallback for accounts made before this existed. */

type Step = "welcome" | "username" | "cakeday" | "avatar" | "egg" | "naming" | "write" | "hatch";
const ORDER: Step[] = ["welcome", "username", "cakeday", "avatar", "egg", "naming", "write", "hatch"];

const WIN_W = Dimensions.get("window").width;
const PAGE_W = WIN_W - 40;

// the recap cards inside the KINDREDLY.EXE window — a letter's whole life
const CARDS: { tag: string; h: string; hi: string; s: string }[] = [
  { tag: "WRITE IT DOWN", h: "Write down", hi: "what's real.", s: "Tired, glad, or just true — a line is enough." },
  { tag: "OFF IT GOES", h: "It finds", hi: "your kind of person.", s: "Matched by how you write — not by who you are." },
  { tag: "THEY WRITE BACK", h: "And slowly,", hi: "you're not strangers.", s: "Five letters each, and you trade names." },
];

export default function Onboarding() {
  const router = useRouter();
  const auth = useAuth();
  const { session, onboarded, appleAvailable } = auth;

  const [step, setStep] = useState<Step>("welcome");
  const [cardI, setCardI] = useState(0);
  const cardRef = useRef<ScrollView>(null);
  const [username, setUsername] = useState("");
  const nowY = new Date().getFullYear();
  const [dob, setDob] = useState({ m: 7, d: 12, y: nowY - 20 });
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [eggVar, setEggVar] = useState(0);
  const [birdName, setBirdName] = useState("");
  const [note, setNote] = useState("");
  const [mood, setMood] = useState<MoodId | null>(null);
  const [hatchPhase, setHatchPhase] = useState<"crack" | "read">("crack");
  const [busy, setBusy] = useState<null | "apple" | "google" | "email">(null);
  const [emailSent, setEmailSent] = useState(false);
  const finishing = useRef(false);

  // egg twitch (hatch crack phase)
  const wob = useSharedValue(0);
  useEffect(() => {
    wob.value = withRepeat(
      withSequence(withTiming(-1, { duration: 120 }), withTiming(1, { duration: 240 }), withTiming(0, { duration: 120 })),
      -1,
      false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const wobble = useAnimatedStyle(() => ({ transform: [{ rotate: `${wob.value * 6}deg` }] }));

  // returning, already-onboarded → straight in
  useEffect(() => {
    if (session && onboarded) router.replace("/(tabs)/letters");
  }, [session, onboarded, router]);

  // signed in but not set up → start the console at step two
  useEffect(() => {
    if (session && !onboarded && step === "welcome") setStep("username");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, onboarded]);

  // the recap window cycles; a swipe overrides it. The scroll is the single
  // source of truth — state only moves on momentum end, so art, tag, dots and
  // headline can never drift apart.
  useEffect(() => {
    if (step !== "welcome") return;
    const t = setTimeout(() => {
      cardRef.current?.scrollTo({ x: ((cardI + 1) % CARDS.length) * PAGE_W, animated: true });
    }, 3400);
    return () => clearTimeout(t);
  }, [step, cardI]);

  // hatch: crack → the card
  useEffect(() => {
    if (step !== "hatch") return;
    setHatchPhase("crack");
    const t = setTimeout(() => setHatchPhase("read"), 1100);
    return () => clearTimeout(t);
  }, [step]);

  const doApple = async () => {
    setBusy("apple");
    const r = await auth.signInWithApple();
    setBusy(null);
    if ("error" in r) Alert.alert("Continue with Apple", r.error);
  };
  const doGoogle = async () => {
    setBusy("google");
    const r = await auth.signInWithGoogle();
    setBusy(null);
    if ("error" in r) Alert.alert("Continue with Google", r.error);
  };
  const doEmail = () => {
    Alert.prompt?.(
      "Your email",
      "We'll send you a quiet sign-in link.",
      async (email?: string) => {
        if (!email || !email.trim()) return;
        setBusy("email");
        const r = await auth.signInWithEmail(email.trim());
        setBusy(null);
        if ("error" in r) Alert.alert("Email", r.error);
        else setEmailSent(true);
      },
      "plain-text",
      "",
      "email-address",
    );
  };

  // birthday derived — the only reason this screen exists is the 18 below
  const years = Array.from({ length: 80 }, (_, i) => nowY - 13 - i);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const yi = Math.max(0, years.indexOf(dob.y));
  let age = nowY - dob.y;
  const nd = new Date();
  if (nd.getMonth() < dob.m || (nd.getMonth() === dob.m && nd.getDate() < dob.d)) age -= 1;
  const ageOk = age >= 18;
  const dobStr = `${dob.y}-${String(dob.m + 1).padStart(2, "0")}-${String(dob.d).padStart(2, "0")}`;

  const line = note.trim();
  const handle = username.trim();
  const her = birdName.trim();
  const HER = her.toUpperCase() || "HER";
  const noteType = wrenTypeFor(note); // who hatches is decided by how you write
  // the picked mood wins; the text is only the fallback
  const hatchMood: WrenMood = mood ? moodToWren(mood) : readMood(line);
  // how close she is to coming out — the same floor a real opening must clear
  const heat = Math.min(100, Math.round((weightedCount(line) / OPENING_MIN) * 100));

  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    if (line.length >= 2) {
      try {
        await upsertFingerprint(signatureVector(line), voiceSignature(line).words);
      } catch {
        /* best-effort */
      }
      // only a real opening goes to the pool; the fingerprint learns either way
      if (weightedCount(line) >= OPENING_MIN) {
        try {
          await publishLetter(STARTER_STAMPS[0], line, "en");
        } catch {
          /* best-effort — never block getting in */
        }
      }
    }
    try {
      await bumpStageFloor("hatch");
      await saveWrenType(noteType.id);
      await setWrenAccessory(noteType.accessory);
      await saveWrenEgg(eggVar); // the shell she came out of, kept this time
      await saveWrenName(her); // and what you call her, everywhere
    } catch {
      /* best-effort */
    }
    await auth.saveProfile({ handle, dob: dobStr, avatarId, firstLine: line || undefined });
    router.replace("/(tabs)/letters");
  };

  const stepIdx = ORDER.indexOf(step);
  const back = () => setStep(ORDER[Math.max(0, stepIdx - 1)]);

  /* ── 1 · KINDREDLY.EXE ──────────────────────────────────────────────── */
  if (step === "welcome") {
    const c = CARDS[cardI];
    return (
      <Console>
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 18, paddingTop: 6 }}>
            <View style={[card, bevel(5, 5), { overflow: "hidden" }]}>
              {/* the title bar */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  borderBottomWidth: 2,
                  borderBottomColor: Y.ink,
                }}
              >
                <View style={{ width: 9, height: 9, borderRadius: 5, borderWidth: 1.6, borderColor: Y.ink, marginRight: 8 }} />
                <Text style={[mono(10.5, "b"), { flex: 1 }]}>KINDREDLY.EXE</Text>
                <Text style={mono(11, "r")}>✕</Text>
              </View>

              <ScrollView
                ref={cardRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => setCardI(Math.round(e.nativeEvent.contentOffset.x / PAGE_W))}
                style={{ height: 172 }}
              >
                {CARDS.map((k, i) => (
                  <View key={k.tag} style={{ width: PAGE_W, height: 172, alignItems: "center", justifyContent: "center" }}>
                    <RecapArt i={i} />
                  </View>
                ))}
              </ScrollView>

              {/* the sticker tag sits on the artwork */}
              <View style={{ position: "absolute", left: 12, bottom: 12 }}>
                <View style={[tag, bevel(2.5, 2.5), { backgroundColor: Y.yellow }]}>
                  <Text style={mono(9.5, "b")}>✎ {c.tag}</Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 14 }}>
              {CARDS.map((k, i) => (
                <View
                  key={k.tag}
                  style={{
                    width: 13,
                    height: 8,
                    marginHorizontal: 3,
                    borderWidth: 1.6,
                    borderColor: Y.ink,
                    backgroundColor: i === cardI ? Y.blue : "transparent",
                  }}
                />
              ))}
            </View>

            <Text style={{ fontFamily: F2.serif, fontSize: 29, color: Y.ink, textAlign: "center", marginTop: 18, lineHeight: 36 }}>
              {c.h} <Text style={{ fontFamily: F2.serifItalic }}>{c.hi}</Text>
            </Text>
            <Text style={[mono(11, "r"), { color: Y.dim, textAlign: "center", marginTop: 8, lineHeight: 18, letterSpacing: 0.2 }]}>{c.s}</Text>
          </View>

          <View style={{ paddingHorizontal: 18, marginTop: 24 }}>
            {emailSent ? (
              <View style={[card, bevel(4, 4), { padding: 16, alignItems: "center" }]}>
                <Text style={[mono(11, "b"), { color: Y.blue }]}>LINK SENT</Text>
                <Text style={[mono(11, "r"), { color: Y.dim, marginTop: 6, textAlign: "center", lineHeight: 18 }]}>
                  Open it on this phone and you'll land right back here.
                </Text>
              </View>
            ) : (
              <>
                {appleAvailable ? (
                  <View style={[bevel(4, 4), { borderRadius: 10 }]}>
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                      cornerRadius={10}
                      style={{ height: 52, width: "100%" }}
                      onPress={doApple}
                    />
                  </View>
                ) : null}
                <Pressable
                  onPress={doGoogle}
                  disabled={!!busy}
                  style={[card, bevel(4, 4), { height: 52, alignItems: "center", justifyContent: "center", marginTop: 12, opacity: busy ? 0.5 : 1 }]}
                >
                  <Text style={{ fontFamily: F2.hand, fontSize: 17, fontWeight: "600", color: Y.ink }}>
                    {busy === "google" ? "…" : "Continue with Google"}
                  </Text>
                </Pressable>
                <Pressable onPress={doEmail} disabled={!!busy} style={{ paddingVertical: 13, alignItems: "center" }}>
                  <Text style={[mono(11, "b"), { color: Y.blue }]}>{busy === "email" ? "…" : "CONTINUE WITH EMAIL"}</Text>
                </Pressable>
                <Pressable onPress={() => setStep("username")} style={{ alignItems: "center" }}>
                  <Text style={[mono(11, "r"), { color: Y.dim }]}>Explore first, sign in later →</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </Console>
    );
  }

  /* ── 2 · pen name ───────────────────────────────────────────────────── */
  if (step === "username") {
    return (
      <Console step={stepIdx} onBack={back}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Head plain="Pick a" em="pen name." sub="Not your real name — change it anytime. Strangers never see it; you are how you write." />
          <View style={{ paddingHorizontal: 18, marginTop: 22 }}>
            <View style={[card, bevel(4, 4), { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, height: 56 }]}>
              <Text style={[mono(15, "b"), { color: Y.blue, marginRight: 8 }]}>›</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                autoFocus
                placeholder="robin"
                placeholderTextColor={Y.faint}
                style={{ flex: 1, fontFamily: F2.serifItalic, fontSize: 21, color: Y.ink }}
              />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 16 }}>
              <Pressable
                onPress={() => setUsername(NAME_IDEAS[Math.floor(Math.random() * NAME_IDEAS.length)].toLowerCase())}
                style={[tag, bevel(2.5, 2.5)]}
              >
                <Text style={mono(9.5, "b")}>⚄ RANDOMIZE</Text>
              </Pressable>
            </View>
          </View>
          <View style={{ flex: 1 }} />
          <Foot label="NEXT ›" on={handle.length > 0} onPress={() => setStep("cakeday")} />
        </KeyboardAvoidingView>
      </Console>
    );
  }

  /* ── 3 · cakeday ────────────────────────────────────────────────────── */
  if (step === "cakeday") {
    return (
      <Console step={stepIdx} onBack={back}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Head plain={`${handle || "Hey"}, when's your`} em="cakeday?" sub="🎂 She keeps it — she'll write to you on the day." />
          <View style={{ paddingHorizontal: 18, marginTop: 18 }}>
            <View style={[card, bevel(4, 4), { flexDirection: "row", overflow: "hidden" }]}>
              <Wheel items={MONTHS} value={dob.m} onChange={(i) => setDob((d) => ({ ...d, m: i }))} />
              <Wheel items={days} value={dob.d - 1} onChange={(i) => setDob((d) => ({ ...d, d: i + 1 }))} />
              <Wheel items={years} value={yi} onChange={(i) => setDob((d) => ({ ...d, y: years[i] }))} />
              <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 88, height: 2, backgroundColor: "rgba(20,18,33,0.15)" }} />
              <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 132, height: 2, backgroundColor: "rgba(20,18,33,0.15)" }} />
            </View>

            <View style={{ alignItems: "center", marginTop: 16 }}>
              <View style={[tag, bevel(2.5, 2.5), { backgroundColor: ageOk ? "#BFE8C9" : Y.panel }]}>
                <Text style={mono(10, "b")}>{ageOk ? `You're ${age}. ✓` : `You're ${age}.`}</Text>
              </View>
            </View>

            {!ageOk && (
              <View style={{ borderWidth: 2, borderColor: Y.warn, borderStyle: "dashed", borderRadius: 10, padding: 12, marginTop: 16 }}>
                <Text style={[mono(10.5, "r"), { color: Y.warn, lineHeight: 17, letterSpacing: 0.2 }]}>
                  ⚠ Kindredly is for 18 and over — you'll meet strangers here, and we can't keep that safe for anyone younger.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
        <Foot label="NEXT ›" on={ageOk} onPress={() => setStep("avatar")} />
      </Console>
    );
  }

  /* ── 4 · a face ─────────────────────────────────────────────────────── */
  if (step === "avatar") {
    const shown = AVATARS.slice(0, 14);
    return (
      <Console step={stepIdx} onBack={back}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Head plain="Pick a" em="face." sub="Just for you — strangers never see it. Change it anytime." />
          <View style={{ paddingHorizontal: 18, marginTop: 18 }}>
            <View style={[card, bevel(4, 4), { padding: 12, flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }]}>
              {shown.map((a) => {
                const on = avatarId === a.id;
                return (
                  <Pressable key={a.id} onPress={() => setAvatarId(on ? null : a.id)} style={{ margin: 5 }}>
                    <View
                      style={[
                        on ? bevel(2.5, 2.5) : null,
                        {
                          width: 54,
                          height: 54,
                          borderRadius: 27,
                          borderWidth: on ? 3 : 2,
                          borderColor: on ? Y.blue : Y.ink,
                          overflow: "hidden",
                          alignItems: "center",
                          justifyContent: "center",
                        },
                      ]}
                    >
                      <AvatarImage id={a.id} seed={a.id} size={52} />
                    </View>
                  </Pressable>
                );
              })}
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  borderWidth: 2,
                  borderColor: Y.ink,
                  borderStyle: "dashed",
                  margin: 5,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={mono(10, "b")}>+{AVATARS.length - shown.length}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
        <Foot label="NEXT ›" on onPress={() => setStep("egg")} skip="SKIP FOR NOW" onSkip={() => setStep("egg")} />
      </Console>
    );
  }

  /* ── 5 · choose your courier ────────────────────────────────────────── */
  if (step === "egg") {
    return (
      <Console step={stepIdx} onBack={back}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Head
            plain="Choose your"
            em="courier."
            sub="She carries your letters out and brings the answers back. The shell is yours to pick — who's inside is decided by what you write."
          />

          {/* the handheld: a device inside the device */}
          <View style={{ alignItems: "center", marginTop: 16 }}>
            <View style={[card, bevel(5, 5), { width: 224, borderRadius: 22, padding: 12 }]}>
              {/* the LCD. It has to be markedly DARKER than every shell or
                  the pale ones (Moonstone especially) vanish into their own
                  screen — which is exactly what a picker must never do. */}
              <View
                style={{
                  height: 156,
                  borderWidth: 2,
                  borderColor: Y.ink,
                  borderRadius: 12,
                  backgroundColor: "#7F71C0",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {[0, 1, 2, 3, 4, 5].map((r) => (
                  <View key={r} style={{ position: "absolute", left: 0, right: 0, top: 8 + r * 26, height: 1, backgroundColor: "#fff", opacity: 0.07 }} />
                ))}
                <Animated.View key={`egg${eggVar}`} entering={ZoomIn.duration(260)}>
                  <EggShell variant={eggVar} size={116} />
                </Animated.View>
                <Text style={[mono(8.5, "b"), { position: "absolute", right: 8, bottom: 6, color: Y.faint }]}>LV.0 · UNMATCHED</Text>
              </View>
              {/* A, B, C — and they work. A console button that does nothing
                  is set dressing, and set dressing is the thing that makes a
                  toy feel like a picture of a toy. */}
              <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 12 }}>
                {(
                  [
                    { c: Y.yellow, t: "◀", go: () => setEggVar((v) => (v + EGG_SHELLS.length - 1) % EGG_SHELLS.length) },
                    { c: "#F3A9C0", t: "⚄", go: () => setEggVar(Math.floor(Math.random() * EGG_SHELLS.length)) },
                    { c: "#9FD8BE", t: "▶", go: () => setEggVar((v) => (v + 1) % EGG_SHELLS.length) },
                  ] as const
                ).map((b) => (
                  <Pressable
                    key={b.t}
                    onPress={b.go}
                    hitSlop={8}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      borderWidth: 2,
                      borderColor: Y.ink,
                      marginHorizontal: 7,
                      backgroundColor: b.c,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 9, color: Y.ink }}>{b.t}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* the four shells */}
          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 20 }}>
            {EGG_SHELLS.map((s, i) => {
              const on = eggVar === i;
              return (
                <Pressable key={s.id} onPress={() => setEggVar(i)} style={{ marginHorizontal: 7 }}>
                  <View
                    style={[
                      on ? bevel(3, 3) : null,
                      {
                        width: 50,
                        height: 60,
                        borderTopLeftRadius: 25,
                        borderTopRightRadius: 25,
                        borderBottomLeftRadius: 25,
                        borderBottomRightRadius: 25,
                        borderWidth: on ? 3 : 2,
                        borderColor: on ? Y.blue : Y.ink,
                        backgroundColor: s.base,
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
          <Text style={[mono(10, "b"), { textAlign: "center", marginTop: 14, color: Y.dim }]}>{EGG_SHELLS[eggVar].name.toUpperCase()}</Text>
        </ScrollView>
        <Foot label="THIS ONE'S MINE ›" on onPress={() => setStep("naming")} />
      </Console>
    );
  }

  /* ── 6 · name her ───────────────────────────────────────────────────── */
  if (step === "naming") {
    return (
      <Console step={stepIdx} onBack={back}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Head plain="Now" em="name her." sub="Whatever you pick is what she's called from here on — in every line she ever writes you." />

            <View style={{ alignItems: "center", marginTop: 14 }}>
              <View style={[card, bevel(4, 4), { width: 148, height: 130, borderRadius: 18, alignItems: "center", justifyContent: "center" }]}>
                <EggShell variant={eggVar} size={98} />
              </View>
            </View>

            <View style={{ paddingHorizontal: 18, marginTop: 18 }}>
              <View style={[card, bevel(4, 4), { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, height: 56 }]}>
                <Text style={[mono(15, "b"), { color: Y.blue, marginRight: 8 }]}>›</Text>
                <TextInput
                  value={birdName}
                  onChangeText={setBirdName}
                  autoCorrect={false}
                  maxLength={16}
                  placeholder="Wren"
                  placeholderTextColor={Y.faint}
                  style={{ flex: 1, fontFamily: F2.serifItalic, fontSize: 21, color: Y.ink }}
                />
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 14 }}>
                {NAME_IDEAS.slice(0, 6).map((n) => (
                  <Pressable key={n} onPress={() => setBirdName(n)} style={[tag, bevel(2, 2), { margin: 4, paddingHorizontal: 11 }]}>
                    <Text style={mono(9.5, "b")}>{n.toUpperCase()}</Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => setBirdName(NAME_IDEAS[Math.floor(Math.random() * NAME_IDEAS.length)])}
                  style={[tag, bevel(2, 2), { margin: 4, paddingHorizontal: 12, backgroundColor: Y.yellow }]}
                >
                  <Text style={mono(9.5, "b")}>⚄</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
          <Foot label="NEXT ›" on={her.length > 0} onPress={() => setStep("write")} />
        </KeyboardAvoidingView>
      </Console>
    );
  }

  /* ── 7 · feed her words ─────────────────────────────────────────────── */
  if (step === "write") {
    return (
      <Console step={stepIdx} onBack={back}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* the feed meter — tied to the floor a real opening has to clear */}
            <View style={{ paddingHorizontal: 18, paddingTop: 4 }}>
              <View style={[card, bevel(4, 4), { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 9 }]}>
                <Text style={[mono(9.5, "b"), { flex: 1 }]}>FEED {HER} WORDS</Text>
                <View style={{ flexDirection: "row", marginRight: 8 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <View
                      key={i}
                      style={{
                        width: 13,
                        height: 9,
                        marginLeft: 3,
                        borderWidth: 1.6,
                        borderColor: Y.ink,
                        backgroundColor: heat > i * 25 ? Y.blue : "transparent",
                      }}
                    />
                  ))}
                </View>
                <Text style={mono(9.5, "b")}>HATCH {heat}%</Text>
              </View>
            </View>

            <Head plain="What's on your mind" em="right now?" sub="" />

            <View style={{ paddingHorizontal: 18, marginTop: 2 }}>
              <View style={[card, bevel(4, 4), { minHeight: 126, padding: 14 }]}>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  multiline
                  autoFocus
                  placeholder="i keep the window open even when it's cold"
                  placeholderTextColor={Y.faint}
                  style={{ fontFamily: F2.serifItalic, fontSize: 17, lineHeight: 26, color: Y.ink, minHeight: 98 }}
                />
              </View>

              <Text style={[mono(9.5, "b"), { color: Y.dim, marginTop: 16 }]}>HOW IT FEELS{mood ? ` · ${MOODS[mood].n.toUpperCase()}` : ""}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10 }}>
                {MOOD_IDS.slice(0, 9).map((id) => {
                  const on = mood === id;
                  return (
                    <Pressable key={id} onPress={() => setMood(on ? null : id)} style={{ marginRight: 9, marginBottom: 9 }}>
                      <View
                        style={[
                          on ? bevel(2.5, 2.5) : null,
                          {
                            width: 30,
                            height: 30,
                            borderRadius: 15,
                            borderWidth: on ? 3 : 2,
                            borderColor: on ? Y.ink : "rgba(20,18,33,0.35)",
                            backgroundColor: MOODS[id].col,
                          },
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[mono(9.5, "r"), { color: Y.dim, letterSpacing: 0.6 }]}>
                {heat >= 100
                  ? "LONG ENOUGH TO TRAVEL — SHE'LL CARRY IT OUT"
                  : `${Math.max(0, OPENING_MIN - weightedCount(line))} CHARS AND IT CAN TRAVEL`}
              </Text>
            </View>
          </ScrollView>
          <Foot label={`HATCH ${HER} 🥚`} on={line.length >= 2} tone="yellow" onPress={() => setStep("hatch")} />
        </KeyboardAvoidingView>
      </Console>
    );
  }

  /* ── 8 · NEW HATCH UNLOCKED ─────────────────────────────────────────── */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Y.night }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        {hatchPhase === "crack" ? (
          <>
            <Animated.View style={wobble}>
              <EggShell variant={eggVar} size={170} />
            </Animated.View>
            <Animated.Text entering={FadeIn.delay(200).duration(500)} style={[mono(10.5, "b"), { color: "#8C86B8", marginTop: 28 }]}>
              ··· SOMETHING'S HAPPENING ···
            </Animated.Text>
          </>
        ) : (
          <>
            <Animated.Text entering={FadeIn.duration(400)} style={[mono(10, "b"), { color: Y.gold, marginBottom: 14 }]}>
              ✦ NEW HATCH UNLOCKED ✦
            </Animated.Text>

            <Animated.View
              entering={ZoomIn.duration(520).easing(Easing.out(Easing.back(1.4)))}
              style={{
                width: "100%",
                maxWidth: 320,
                borderWidth: 2,
                borderColor: Y.gold,
                borderRadius: 16,
                backgroundColor: "#221E2E",
                paddingVertical: 22,
                paddingHorizontal: 20,
                alignItems: "center",
              }}
            >
              <WrenBird size={120} mood={hatchMood} />
              {/* WREN_TYPES already name themselves "The Spark" — don't prefix */}
              <Text style={{ fontFamily: F2.serifItalic, fontSize: 26, color: Y.gold, marginTop: 10 }}>{noteType.name}</Text>
              <Text style={[mono(11, "r"), { color: "#B0A9CE", marginTop: 10, textAlign: "center", lineHeight: 18, letterSpacing: 0.2 }]}>
                {noteType.line}
              </Text>
              <View style={{ borderWidth: 1.6, borderColor: Y.gold, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginTop: 14 }}>
                <Text style={[mono(9, "b"), { color: Y.gold }]}>RARITY: ONE OF ONE</Text>
              </View>
            </Animated.View>

            <Animated.Text
              entering={FadeInDown.delay(420).duration(500)}
              style={{ fontFamily: F2.serifItalic, fontSize: 15, color: "#B0A9CE", marginTop: 18, textAlign: "center", lineHeight: 23 }}
            >
              “{hatchLine(hatchMood)}”{"\n"}— {her || "Wren"}
            </Animated.Text>

            <Animated.View entering={FadeInDown.delay(560).duration(500)} style={{ width: "100%", maxWidth: 320, marginTop: 22 }}>
              <Pressable onPress={() => void finish()} style={[keyBtn, bevel(4, 4), { backgroundColor: Y.yellow, borderColor: Y.gold }]}>
                <Text style={mono(12.5, "b")}>LET'S GO</Text>
              </Pressable>
            </Animated.View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

/* ── the console shell ───────────────────────────────────────────────── */

/* Everything but the reveal lives inside this: periwinkle ground, a segmented
   progress bar across the top, one way back. The bar is the console's own
   readout, and it's the reason eight screens don't read as eight screens —
   you can see the whole thing from the second one. */
function Console({ children, step, onBack }: { children: React.ReactNode; step?: number; onBack?: () => void }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Y.ground }}>
      {step != null && (
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 10 }}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={14} style={{ marginRight: 10 }}>
              <Svg width={15} height={15} viewBox="0 0 24 24">
                <Path d="M15 4 L7 12 L15 20" stroke={Y.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
          ) : null}
          <View style={{ flex: 1, flexDirection: "row" }}>
            {ORDER.slice(0, 7).map((s, i) => (
              <View
                key={s}
                style={{
                  flex: 1,
                  height: 11,
                  marginRight: i === 6 ? 0 : 3,
                  borderWidth: 1.8,
                  borderColor: Y.ink,
                  backgroundColor: i <= step ? Y.blue : "transparent",
                }}
              />
            ))}
          </View>
        </View>
      )}
      {children}
    </SafeAreaView>
  );
}

/* the headline: plain words, then the one in italic serif that carries it */
function Head({ plain, em, sub }: { plain: string; em: string; sub: string }) {
  return (
    <View style={{ paddingHorizontal: 18, paddingTop: 12 }}>
      <Text style={{ fontFamily: F2.serif, fontSize: 26, color: Y.ink, textAlign: "center", lineHeight: 33 }}>
        {plain} <Text style={{ fontFamily: F2.serifItalic }}>{em}</Text>
      </Text>
      {!!sub && <Text style={[mono(11, "r"), { color: Y.dim, textAlign: "center", marginTop: 9, lineHeight: 18, letterSpacing: 0.2 }]}>{sub}</Text>}
    </View>
  );
}

/* the key at the bottom of every step */
function Foot({
  label,
  on,
  onPress,
  tone,
  skip,
  onSkip,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  tone?: "yellow";
  skip?: string;
  onSkip?: () => void;
}) {
  return (
    <View style={{ paddingHorizontal: 18, paddingBottom: 10, paddingTop: 8 }}>
      <Pressable
        onPress={() => on && onPress()}
        disabled={!on}
        style={[keyBtn, bevel(4, 4), { backgroundColor: tone === "yellow" ? Y.yellow : Y.blue, opacity: on ? 1 : 0.4 }]}
      >
        <Text style={[mono(12.5, "b"), { color: tone === "yellow" ? Y.ink : "#fff" }]}>{label}</Text>
      </Pressable>
      {skip ? (
        <Pressable onPress={onSkip} style={{ paddingTop: 12, alignItems: "center" }}>
          <Text style={[mono(9.5, "b"), { color: Y.dim }]}>{skip}</Text>
        </Pressable>
      ) : (
        <View style={{ height: 10 }} />
      )}
    </View>
  );
}

/* the artwork in the KINDREDLY.EXE window — a letter written, sent, answered */
function RecapArt({ i }: { i: number }) {
  return (
    <Svg width={168} height={140} viewBox="0 0 168 140">
      {i === 1 && <Path d="M14 128 Q52 112 88 74" fill="none" stroke={Y.ink} strokeWidth={2} strokeDasharray="3 7" strokeLinecap="round" opacity={0.5} />}
      <Rect x={i === 1 ? 62 : 44} y={i === 1 ? 34 : 44} width={82} height={58} rx={4} fill={Y.panel} stroke={Y.ink} strokeWidth={2.4} />
      <Path d={i === 1 ? "M62 38 L103 68 L144 38" : "M44 48 L85 78 L126 48"} fill="none" stroke={Y.ink} strokeWidth={2.2} strokeLinejoin="round" />
      {i === 0 && <Rect x={104} y={30} width={26} height={30} fill={Y.blue} stroke={Y.ink} strokeWidth={2.2} transform="rotate(-8 117 45)" />}
      {i === 2 && (
        <Path
          d="M85 22 c-8 -13 -29 -10 -29 6 c0 13 18 23 29 31 c11 -8 29 -18 29 -31 c0 -16 -21 -19 -29 -6 z"
          fill={Y.yellow}
          stroke={Y.ink}
          strokeWidth={2.2}
        />
      )}
      <Circle cx={22} cy={22} r={3} fill={Y.ink} opacity={0.35} />
      <Circle cx={148} cy={122} r={3} fill={Y.ink} opacity={0.35} />
    </Svg>
  );
}

/* the nine moods, mapped onto the faces she actually has */
function moodToWren(m: MoodId): WrenMood {
  const tone = MOODS[m].tone;
  if (tone === "low" || tone === "edge") return "worry";
  if (tone === "up" || tone === "spark") return "delight";
  if (tone === "flat") return "think";
  return "listen";
}
