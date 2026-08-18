import { useEffect, useRef, useState } from "react";
import { Alert, Dimensions, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
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
import { readMood } from "../lib/wren-read";
import { bumpStageFloor, setWrenAccessory } from "../lib/wren-style";
import { saveWrenType, wrenTypeFor } from "../lib/wren-type";
import { hatch, saveArchetype, type DimScore } from "../lib/hatch-engine";
import { NAME_IDEAS, saveWrenEgg, saveWrenName } from "../lib/wren-name";
import { PRONOUNS, type PronounId, pronoun, saveWrenPronoun, saveYourPronoun } from "../lib/pronouns";
import { STARTER_STAMPS } from "../data/stamps";
import { OPENING_MIN, weightedCount } from "../lib/weighted-count";
import { MOODS, MOOD_IDS, type MoodId } from "../data/moods";
import { MoodIcon } from "../components/MoodIcon";

/* Onboarding — EGG OS.
   ────────────────────────────────────────────────────────────────────────
   Nine screens on a Y2K handheld pet console: you choose a courier, say what
   to call her, feed her your first words, and watch her hatch into a card
   with a rarity on it and then fly off carrying your letter.

     welcome   KINDREDLY.EXE — the pitch, and the way in
     username  your pen name
     you       your pronouns — asked, never guessed
     cakeday   your birthday, which exists for the 18+ gate
     avatar    a face, purely for you
     egg       CHOOSE YOUR COURIER — the shell she'll come out of
     naming    her name AND her pronoun, so the hatch key says HIM/HER/THEM
     write     feed her words; the meter fills as you write
     hatch     NEW HATCH UNLOCKED, then she leaves with it

   THE EGG IS PRESENT THE WHOLE TIME. Steps 2–5 are short forms with a lot of
   air under them, and dead air on a toy reads as a broken toy. So the egg
   sits in a console readout at the foot of every one of them, breathing, with
   a status line that changes as you go — it fills the space with the one
   thing the flow is actually about, instead of with decoration.

   PRONOUNS ARE ASKED, NOT INFERRED, and default to they/them if skipped.
   There is nothing here to infer from — this product knows nothing about you
   but your writing — and a wrong guess misgenders a real person in a way the
   neutral default never does. See lib/pronouns.ts.

   TWO SCREENS THAT USED TO BE THEATRE NOW KEEP THEIR PROMISES:

   · The egg is SAVED. It used to be picked and then dropped on the way out —
     you chose a shell and the app had forgotten before onboarding finished.
     It's also no longer "a colour": the screen says what the choice is, which
     is the bird who carries your letters.

   · The mood row is READ. It used to set nothing at all — her hatch face came
     from readMood() off the text either way. A picked mood now wins.

   COLOUR: every hue in theme/y2k.ts is an app token now. The first build of
   this used a saturated periwinkle of its own and you could feel the seam at
   the handoff. The Y2K-ness is all form — 2px borders, hard shadows, meters —
   and none of it hue. */

type Step = "welcome" | "username" | "you" | "cakeday" | "avatar" | "egg" | "naming" | "write" | "hatch";
const ORDER: Step[] = ["welcome", "username", "you", "cakeday", "avatar", "egg", "naming", "write", "hatch"];
const BARS = ORDER.length - 1; // the reveal isn't a step you're working through

const WIN_W = Dimensions.get("window").width;
const PAGE_W = WIN_W - 40;

// the recap cards inside the KINDREDLY.EXE window — a letter's whole life
const CARDS: { tag: string; h: string; hi: string; s: string }[] = [
  { tag: "WRITE IT DOWN", h: "Write down", hi: "what's real.", s: "Tired, glad, or just true — a line is enough." },
  { tag: "OFF IT GOES", h: "It finds", hi: "your kind of person.", s: "Matched by how you write — not by who you are." },
  { tag: "THEY WRITE BACK", h: "And slowly,", hi: "you're not strangers.", s: "Five letters each, and you trade names." },
];

/* one hint per feeding — each slot invites a different register, because
   three samples of the same register teach the engine less than one each of
   observation, memory and confession */
const FEED_HINTS = [
  "i keep rehearsing conversations i will never have",
  "something you noticed today that nobody else did…",
  "a small thing you remember for no reason…",
  "the thing you almost said out loud…",
  "one more, if it's already on your tongue…",
];

// what the readout says about the egg at each stage of the flow
const EGG_STATUS: Partial<Record<Step, string>> = {
  username: "SOMETHING'S IN HERE.",
  you: "STILL ASLEEP.",
  cakeday: "WARM. NOT READY.",
  avatar: "IT MOVED. DID YOU SEE?",
};

export default function Onboarding() {
  const router = useRouter();
  const auth = useAuth();
  const { session, onboarded, appleAvailable } = auth;

  const [step, setStep] = useState<Step>("welcome");
  const [cardI, setCardI] = useState(0);
  const cardRef = useRef<ScrollView>(null);
  const [username, setUsername] = useState("");
  const [youPro, setYouPro] = useState<PronounId | null>(null);
  const nowY = new Date().getFullYear();
  const [dob, setDob] = useState({ m: 7, d: 12, y: nowY - 20 });
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [eggVar, setEggVar] = useState(0);
  const [birdName, setBirdName] = useState("");
  const [birdPro, setBirdPro] = useState<PronounId>("she");
  const [note, setNote] = useState(""); // the thought being typed
  const [thoughts, setThoughts] = useState<string[]>([]); // the fed ones, 3–5
  const [mood, setMood] = useState<MoodId | null>(null);
  const [hatchPhase, setHatchPhase] = useState<"crack" | "card" | "fly">("crack");
  const [busy, setBusy] = useState<null | "apple" | "google" | "email">(null);
  const [emailSent, setEmailSent] = useState(false);
  const finishing = useRef(false);

  /* the egg breathes wherever it appears, and twitches harder once it's
     cracking — same shared value, two amplitudes */
  const wob = useSharedValue(0);
  useEffect(() => {
    wob.value = withRepeat(
      withSequence(withTiming(-1, { duration: 1500, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) })),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const breathe = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wob.value * 2.6}deg` }, { scale: 1 + wob.value * 0.012 }],
  }));

  // the crack: a hard shudder, not the idle breath
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${shake.value * 7}deg` }] }));

  // she leaves with it
  const flyY = useSharedValue(0);
  const flyX = useSharedValue(0);
  const flyScale = useSharedValue(1);
  const flyOp = useSharedValue(1);
  const flyStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: flyX.value }, { translateY: flyY.value }, { scale: flyScale.value }, { rotate: `${flyX.value * 0.06}deg` }],
    opacity: flyOp.value,
  }));

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

  // hatch: shudder → the card
  useEffect(() => {
    if (step !== "hatch") return;
    setHatchPhase("crack");
    shake.value = withRepeat(withSequence(withTiming(-1, { duration: 90 }), withTiming(1, { duration: 170 }), withTiming(0, { duration: 90 })), -1, false);
    const t = setTimeout(() => setHatchPhase("card"), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const pro = pronoun(birdPro);
  // the key says HATCH OTIS once she's named, HATCH HIM/HER/THEM before that
  const HER = (her || pro.obj).toUpperCase();
  const feedPlain = `Feed ${her || "them"} what’s`;
  /* WHO HATCHES comes from the Hatch Engine (lib/hatch-engine.ts): nine
     dimensions scored 0–100 with a locked/growing confidence each, blended by
     the owner's weights, matched against the archetype table. Wren is grown
     from the writing DNA, never selected. wrenTypeFor survives only to pick
     what she wears, which is all it was ever load-bearing for. */
  /* ONE thought hatches her. Three-to-five was the spec draft, and it is a
     wall at the exact moment someone is least invested — the engine marks
     what it hasn't read as GROWING anyway, so a thin first read is honest by
     construction. More feeds lock more dimensions; the meter sells that as
     an invitation instead of a toll. The line still in the input counts as
     fed, so nobody loses words to a button they didn't press. */
  const fed = [...thoughts, ...(line.length >= 2 ? [line] : [])];
  const corpus = fed.join("\n\n");
  const hatched = hatch(fed);
  const noteType = wrenTypeFor(corpus); // still decides the accessory
  const hatchMood: WrenMood = mood ? moodToWren(mood) : readMood(corpus); // picked mood wins
  const canFeed = line.length >= 2 && thoughts.length < 5;
  const canHatch = fed.length >= 1;

  const feed = () => {
    if (!canFeed) return;
    setThoughts((t) => [...t, line]);
    setNote("");
  };

  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    if (corpus.length >= 2) {
      try {
        await upsertFingerprint(signatureVector(corpus), voiceSignature(corpus).words);
      } catch {
        /* best-effort */
      }
      /* the pool gets ONE thought, not a concatenation — a letter is a single
         coherent thing. The longest fed thought that clears the same floor
         every other opening has to clear. */
      const opener = [...fed].sort((a, b) => weightedCount(b) - weightedCount(a))[0];
      if (opener && weightedCount(opener) >= OPENING_MIN) {
        try {
          await publishLetter(STARTER_STAMPS[0], opener, "en");
        } catch {
          /* best-effort — never block getting in */
        }
      }
    }
    try {
      await bumpStageFloor("hatch");
      await saveWrenType(noteType.id);
      await setWrenAccessory(noteType.accessory);
      await saveWrenEgg(eggVar);
      await saveWrenName(her);
      await saveWrenPronoun(birdPro);
      await saveArchetype(hatched.archetype.id);
      if (youPro) await saveYourPronoun(youPro);
    } catch {
      /* best-effort */
    }
    await auth.saveProfile({ handle, dob: dobStr, avatarId, firstLine: fed[0] || undefined });
    router.replace("/(tabs)/letters");
  };

  // LET'S GO — she actually leaves, carrying it, before the app appears
  const letHerGo = () => {
    setHatchPhase("fly");
    flyY.value = withTiming(-620, { duration: 1500, easing: Easing.in(Easing.cubic) });
    flyX.value = withSequence(
      withTiming(-30, { duration: 480, easing: Easing.inOut(Easing.quad) }),
      withTiming(46, { duration: 560, easing: Easing.inOut(Easing.quad) }),
      withTiming(6, { duration: 460, easing: Easing.inOut(Easing.quad) }),
    );
    flyScale.value = withDelay(280, withTiming(0.42, { duration: 1220, easing: Easing.in(Easing.cubic) }));
    flyOp.value = withDelay(950, withTiming(0, { duration: 520 }));
    setTimeout(() => void finish(), 1650);
  };

  const stepIdx = ORDER.indexOf(step);
  const back = () => setStep(ORDER[Math.max(0, stepIdx - 1)]);
  const eggStatus = EGG_STATUS[step];

  /* ── 1 · KINDREDLY.EXE ──────────────────────────────────────────────── */
  if (step === "welcome") {
    const c = CARDS[cardI];
    return (
      <Console>
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 18, paddingTop: 6 }}>
            <View style={[card, bevel(5, 5), { overflow: "hidden" }]}>
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

              <View style={{ position: "absolute", left: 12, bottom: 12 }}>
                <View style={[tag, bevel(2.5, 2.5), { backgroundColor: Y.brass }]}>
                  <Text style={mono(9.5, "b")}>✎ {c.tag}</Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 14 }}>
              {CARDS.map((k, i) => (
                <View
                  key={k.tag}
                  style={{ width: 13, height: 8, marginHorizontal: 3, borderWidth: 1.6, borderColor: Y.ink, backgroundColor: i === cardI ? Y.blue : "transparent" }}
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
                  <Text style={{ fontFamily: F2.hand, fontSize: 17, fontWeight: "600", color: Y.ink }}>{busy === "google" ? "…" : "Continue with Google"}</Text>
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
          <Animated.View entering={FadeInDown.delay(120).duration(420)} style={{ paddingHorizontal: 18, marginTop: 20 }}>
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
            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 14 }}>
              <Pressable onPress={() => setUsername(NAME_IDEAS[Math.floor(Math.random() * NAME_IDEAS.length)].toLowerCase())} style={[tag, bevel(2.5, 2.5)]}>
                <Text style={mono(9.5, "b")}>⚄ RANDOMIZE</Text>
              </Pressable>
            </View>
          </Animated.View>
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <EggDock variant={eggVar} status={eggStatus} style={breathe} />
          </View>
          <Foot label="NEXT ›" on={handle.length > 0} onPress={() => setStep("you")} />
        </KeyboardAvoidingView>
      </Console>
    );
  }

  /* ── 3 · what to call you ───────────────────────────────────────────── */
  if (step === "you") {
    return (
      <Console step={stepIdx} onBack={back}>
        <Head plain={`${handle || "Hey"} — what do we`} em="call you?" sub="Only used in how the app talks about you. Skip it and we'll say they." />
        <View style={{ paddingHorizontal: 18, marginTop: 20 }}>
          {PRONOUNS.map((p, i) => {
            const on = youPro === p.id;
            return (
              <Animated.View key={p.id} entering={FadeInDown.delay(90 + i * 70).duration(420)}>
                <Pressable
                  onPress={() => setYouPro(on ? null : p.id)}
                  style={[
                    card,
                    bevel(on ? 4 : 2.5, on ? 4 : 2.5),
                    {
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                      height: 58,
                      marginBottom: 12,
                      backgroundColor: on ? Y.blue : Y.panel,
                    },
                  ]}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: on ? Y.panel : Y.ink,
                      marginRight: 14,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {on ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Y.panel }} /> : null}
                  </View>
                  <Text style={{ fontFamily: F2.serifItalic, fontSize: 20, color: on ? Y.panel : Y.ink }}>{p.label}</Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <EggDock variant={eggVar} status={eggStatus} style={breathe} />
        </View>
        <Foot label="NEXT ›" on onPress={() => setStep("cakeday")} skip={youPro ? undefined : "PREFER NOT TO SAY"} onSkip={() => setStep("cakeday")} />
      </Console>
    );
  }

  /* ── 4 · cakeday ────────────────────────────────────────────────────── */
  if (step === "cakeday") {
    return (
      <Console step={stepIdx} onBack={back}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Head plain={`${handle || "Hey"}, when's your`} em="cakeday?" sub="🎂 Whoever hatches keeps it, and writes to you on the day." />
          <Animated.View entering={FadeInDown.delay(120).duration(420)} style={{ paddingHorizontal: 18, marginTop: 16 }}>
            <View style={[card, bevel(4, 4), { flexDirection: "row", overflow: "hidden" }]}>
              <Wheel items={MONTHS} value={dob.m} onChange={(i) => setDob((d) => ({ ...d, m: i }))} />
              <Wheel items={days} value={dob.d - 1} onChange={(i) => setDob((d) => ({ ...d, d: i + 1 }))} />
              <Wheel items={years} value={yi} onChange={(i) => setDob((d) => ({ ...d, y: years[i] }))} />
              <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 88, height: 2, backgroundColor: "rgba(17,17,19,0.14)" }} />
              <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 132, height: 2, backgroundColor: "rgba(17,17,19,0.14)" }} />
            </View>

            <View style={{ alignItems: "center", marginTop: 14 }}>
              <View style={[tag, bevel(2.5, 2.5), { backgroundColor: ageOk ? "#BFE8C9" : Y.panel }]}>
                <Text style={mono(10, "b")}>{ageOk ? `You're ${age}. ✓` : `You're ${age}.`}</Text>
              </View>
            </View>

            {!ageOk && (
              <View style={{ borderWidth: 2, borderColor: Y.warn, borderStyle: "dashed", borderRadius: 10, padding: 12, marginTop: 14 }}>
                <Text style={[mono(10.5, "r"), { color: Y.warn, lineHeight: 17, letterSpacing: 0.2 }]}>
                  ⚠ Kindredly is for 18 and over — you'll meet strangers here, and we can't keep that safe for anyone younger.
                </Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>
        <EggDock variant={eggVar} status={eggStatus} style={breathe} />
        <Foot label="NEXT ›" on={ageOk} onPress={() => setStep("avatar")} />
      </Console>
    );
  }

  /* ── 5 · a face ─────────────────────────────────────────────────────── */
  if (step === "avatar") {
    const shown = AVATARS.slice(0, 14);
    return (
      <Console step={stepIdx} onBack={back}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Head plain="Pick a" em="face." sub="Just for you — strangers never see it. Change it anytime." />
          <Animated.View entering={FadeInDown.delay(120).duration(420)} style={{ paddingHorizontal: 18, marginTop: 16 }}>
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
          </Animated.View>
        </ScrollView>
        <EggDock variant={eggVar} status={eggStatus} style={breathe} />
        <Foot label="NEXT ›" on onPress={() => setStep("egg")} skip="SKIP FOR NOW" onSkip={() => setStep("egg")} />
      </Console>
    );
  }

  /* ── 6 · choose your courier ────────────────────────────────────────── */
  if (step === "egg") {
    return (
      <Console step={stepIdx} onBack={back}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Head
            plain="Choose your"
            em="courier."
            sub="This one carries your letters out and brings the answers back. The shell is yours to pick — who's inside is decided by what you write."
          />

          {/* the handheld: a device inside the device */}
          <Animated.View entering={ZoomIn.delay(80).duration(380)} style={{ alignItems: "center", marginTop: 14 }}>
            <View style={[card, bevel(5, 5), { width: 224, borderRadius: 22, padding: 12 }]}>
              {/* the LCD. Markedly darker than every shell, or the pale ones
                  (Moonstone especially) vanish into their own screen — which
                  is precisely what a picker must never do. */}
              <View
                style={{
                  height: 156,
                  borderWidth: 2,
                  borderColor: Y.ink,
                  borderRadius: 12,
                  backgroundColor: Y.lcd,
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {[0, 1, 2, 3, 4, 5].map((r) => (
                  <View key={r} style={{ position: "absolute", left: 0, right: 0, top: 8 + r * 26, height: 1, backgroundColor: "#fff", opacity: 0.07 }} />
                ))}
                <Animated.View key={`egg${eggVar}`} entering={ZoomIn.duration(240)} style={breathe}>
                  <EggShell variant={eggVar} size={116} />
                </Animated.View>
                <Text style={[mono(8.5, "b"), { position: "absolute", right: 8, bottom: 6, color: "rgba(255,255,255,0.55)" }]}>LV.0 · UNMATCHED</Text>
              </View>

              {/* A, B, C — and they work. A console button that does nothing is
                  set dressing, and set dressing is what makes a toy read as a
                  picture of a toy. */}
              <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 12 }}>
                {(
                  [
                    { t: "◀", go: () => setEggVar((v) => (v + EGG_SHELLS.length - 1) % EGG_SHELLS.length) },
                    { t: "⚄", go: () => setEggVar(Math.floor(Math.random() * EGG_SHELLS.length)) },
                    { t: "▶", go: () => setEggVar((v) => (v + 1) % EGG_SHELLS.length) },
                  ] as const
                ).map((b, i) => (
                  <Pressable
                    key={b.t}
                    onPress={b.go}
                    hitSlop={8}
                    style={{
                      width: 27,
                      height: 27,
                      borderRadius: 14,
                      borderWidth: 2,
                      borderColor: Y.ink,
                      marginHorizontal: 7,
                      backgroundColor: i === 1 ? Y.brass : Y.groundDeep,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 9, color: Y.ink }}>{b.t}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Animated.View>

          {/* the four shells */}
          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 18 }}>
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
                        borderRadius: 25,
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
          <Text style={[mono(10, "b"), { textAlign: "center", marginTop: 12, color: Y.dim }]}>{EGG_SHELLS[eggVar].name.toUpperCase()}</Text>
        </ScrollView>
        <Foot label="THIS ONE'S MINE ›" on onPress={() => setStep("naming")} />
      </Console>
    );
  }

  /* ── 7 · name, and what to call her ─────────────────────────────────── */
  if (step === "naming") {
    return (
      <Console step={stepIdx} onBack={back}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Head plain="Now" em="name them." sub="This is what they're called from here on — in every line they ever write you." />

            <Animated.View entering={ZoomIn.delay(60).duration(340)} style={{ alignItems: "center", marginTop: 12 }}>
              <View style={[card, bevel(4, 4), { width: 146, height: 126, borderRadius: 18, alignItems: "center", justifyContent: "center" }]}>
                <Animated.View style={breathe}>
                  <EggShell variant={eggVar} size={96} />
                </Animated.View>
              </View>
            </Animated.View>

            <View style={{ paddingHorizontal: 18, marginTop: 16 }}>
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

              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 12 }}>
                {NAME_IDEAS.slice(0, 6).map((n) => (
                  <Pressable key={n} onPress={() => setBirdName(n)} style={[tag, bevel(2, 2), { margin: 4, paddingHorizontal: 11 }]}>
                    <Text style={mono(9.5, "b")}>{n.toUpperCase()}</Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => setBirdName(NAME_IDEAS[Math.floor(Math.random() * NAME_IDEAS.length)])}
                  style={[tag, bevel(2, 2), { margin: 4, paddingHorizontal: 12, backgroundColor: Y.brass }]}
                >
                  <Text style={mono(9.5, "b")}>⚄</Text>
                </Pressable>
              </View>

              {/* and what to call them — this is what makes the hatch key read
                  HATCH HIM / HATCH HER / HATCH THEM */}
              <Text style={[mono(9.5, "b"), { color: Y.dim, marginTop: 20, textAlign: "center" }]}>
                {her ? `AND ${her.toUpperCase()} GOES BY` : "AND THEY GO BY"}
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 10 }}>
                {PRONOUNS.map((p) => {
                  const on = birdPro === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => setBirdPro(p.id)}
                      style={[tag, bevel(on ? 3 : 2, on ? 3 : 2), { marginHorizontal: 4, paddingHorizontal: 12, backgroundColor: on ? Y.blue : Y.panel }]}
                    >
                      <Text style={[mono(9.5, "b"), { color: on ? Y.panel : Y.ink }]}>{p.label.toUpperCase()}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>
          <Foot label="NEXT ›" on={her.length > 0} onPress={() => setStep("write")} />
        </KeyboardAvoidingView>
      </Console>
    );
  }

  /* ── 8 · feed them thoughts ─────────────────────── */
  if (step === "write") {
    return (
      <Console step={stepIdx} onBack={back}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* the meter counts THOUGHTS now, not characters. Three hatch the
                egg; five is the most it will eat. Each one is a separate
                sample, which is what the engine actually wants — structure
                and perspective read across pieces, not within one. */}
            <View style={{ paddingHorizontal: 18, paddingTop: 4 }}>
              <View style={[card, bevel(4, 4), { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 9 }]}>
                <Text style={[mono(9.5, "b"), { flex: 1 }]}>FEED {HER} THOUGHTS</Text>
                <View style={{ flexDirection: "row", marginRight: 8 }}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <View
                      key={i}
                      style={{ width: 13, height: 9, marginLeft: 3, borderWidth: 1.6, borderColor: Y.ink, backgroundColor: fed.length > i ? Y.blue : "transparent" }}
                    />
                  ))}
                </View>
                <Text style={mono(9.5, "b")}>{fed.length ? `${fed.length} FED ✓` : "HUNGRY"}</Text>
              </View>
            </View>

            <Head plain={feedPlain} em="on your mind." sub="One thought is enough to hatch. Each extra one locks in more of the read." />

            {/* what's been fed, swallowed into little rows */}
            {thoughts.length > 0 && (
              <View style={{ paddingHorizontal: 18, marginTop: 10 }}>
                {thoughts.map((t, i) => (
                  <Animated.View key={`${i}-${t.slice(0, 8)}`} entering={FadeInDown.duration(320)}>
                    <View style={[card, bevel(2, 2), { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, marginBottom: 7 }]}>
                      <Text style={[mono(9, "b"), { color: Y.blue, marginRight: 9 }]}>{String(i + 1).padStart(2, "0")}</Text>
                      <Text numberOfLines={1} style={{ flex: 1, fontFamily: F2.serifItalic, fontSize: 14, color: Y.ink }}>
                        {t}
                      </Text>
                      <Pressable hitSlop={10} onPress={() => setThoughts((arr) => arr.filter((_, j) => j !== i))}>
                        <Text style={[mono(11, "r"), { color: Y.faint }]}>✕</Text>
                      </Pressable>
                    </View>
                  </Animated.View>
                ))}
              </View>
            )}

            <View style={{ paddingHorizontal: 18, marginTop: thoughts.length ? 4 : 2 }}>
              <View style={[card, bevel(4, 4), { minHeight: 92, padding: 14 }]}>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  multiline
                  autoFocus
                  placeholder={FEED_HINTS[Math.min(thoughts.length, FEED_HINTS.length - 1)]}
                  placeholderTextColor={Y.faint}
                  style={{ fontFamily: F2.serifItalic, fontSize: 17, lineHeight: 26, color: Y.ink, minHeight: 64 }}
                />
                <Pressable
                  onPress={feed}
                  disabled={!canFeed}
                  style={[tag, bevel(2.5, 2.5), { alignSelf: "flex-end", backgroundColor: canFeed ? Y.blue : Y.panel, opacity: canFeed ? 1 : 0.4 }]}
                >
                  <Text style={[mono(9.5, "b"), { color: canFeed ? "#fff" : Y.ink }]}>FEED ↑</Text>
                </Pressable>
              </View>

              <Text style={[mono(9.5, "b"), { color: Y.dim, marginTop: 14 }]}>HOW IT FEELS{mood ? ` · ${MOODS[mood].n.toUpperCase()}` : ""}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10 }}>
                {MOOD_IDS.slice(0, 9).map((id) => {
                  const on = mood === id;
                  return (
                    <Pressable key={id} onPress={() => setMood(on ? null : id)} style={{ marginRight: 8, marginBottom: 9 }}>
                      {/* the product's own drawn mood faces — the same art the
                          journal's calendar is built from, not paint chips */}
                      <View
                        style={[
                          on ? bevel(2.5, 2.5) : null,
                          {
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            borderWidth: on ? 2.5 : 2,
                            borderColor: on ? Y.ink : "rgba(17,17,19,0.28)",
                            backgroundColor: MOODS[id].bg,
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                          },
                        ]}
                      >
                        <MoodIcon id={id} size={30} />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ height: 8 }} />
            </View>
          </ScrollView>
          <Foot
            label={canHatch ? `HATCH ${HER} 🥚` : "FEED ONE THOUGHT FIRST"}
            on={canHatch}
            tone="brass"
            onPress={() => setStep("hatch")}
          />
        </KeyboardAvoidingView>
      </Console>
    );
  }

  /* ── 9 · NEW HATCH UNLOCKED, then they leave with it ────────────────── */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Y.night }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 20 }}>
        {hatchPhase === "crack" && (
          <>
            <Animated.View style={shakeStyle}>
              <EggShell variant={eggVar} size={170} />
            </Animated.View>
            <Animated.Text entering={FadeIn.delay(200).duration(500)} style={[mono(10.5, "b"), { color: "#8C86B8", marginTop: 28 }]}>
              ··· SOMETHING'S HAPPENING ···
            </Animated.Text>
          </>
        )}

        {hatchPhase === "card" && (
          <>
            <Animated.Text entering={FadeIn.duration(400)} style={[mono(10, "b"), { color: Y.brass, marginBottom: 14 }]}>
              ✦ NEW HATCH UNLOCKED ✦
            </Animated.Text>

            <Animated.View
              entering={ZoomIn.duration(520).easing(Easing.out(Easing.back(1.4)))}
              style={{
                width: "100%",
                maxWidth: 330,
                borderWidth: 2,
                borderColor: Y.brass,
                borderRadius: 16,
                backgroundColor: Y.nightCard,
                paddingVertical: 22,
                paddingHorizontal: 20,
                alignItems: "center",
              }}
            >
              <Hatchling mood={hatchMood} shell={eggVar} />
              <Text style={{ fontFamily: F2.serif, fontSize: 30, color: "#F3F0FA", marginTop: 4 }}>{her || "Wren"}</Text>
              <Text style={{ fontFamily: F2.serifItalic, fontSize: 18, color: Y.brass, marginTop: 2 }}>{hatched.archetype.name}</Text>
              <Text style={[mono(8.5, "b"), { color: "#5E5878", marginTop: 8 }]}>TAP {HER} ✦</Text>

              <Text style={{ fontFamily: F2.serifItalic, fontSize: 15, color: "#B0A9CE", marginTop: 16, textAlign: "center", lineHeight: 23 }}>
                “{hatched.desc}”
              </Text>

              {/* VOICE DNA — the engine's locked dimensions, top four, never
                  all nine. The full table is the Me tab's job; printed here it
                  turns a birth into a report card. */}
              <View style={{ width: "100%", height: 1, backgroundColor: "rgba(216,166,63,0.3)", marginTop: 18, marginBottom: 12 }} />
              <View style={{ width: "100%", flexDirection: "row", marginBottom: 10 }}>
                <Text style={[mono(9, "b"), { flex: 1, color: "rgba(216,166,63,0.85)" }]}>YOUR VOICE DNA</Text>
                <Text style={[mono(9, "b"), { color: "rgba(216,166,63,0.85)" }]}>{hatched.lockedCount} OF 9 LOCKED</Text>
              </View>
              {/* top four by confidence-then-score; a growing dimension shows
                  its provisional number dimmed rather than hiding — the spec
                  is score + confidence, and an empty card is a worse birth
                  than an honest provisional one */}
              {hatched.dims.slice(0, 4).map((d) => (
                <DnaRow key={d.key} d={d} />
              ))}
            </Animated.View>

            {/* what is still sealed. Each of the four is a real gate in
                analyzeVoice — quirks need tics to repeat, rhythm needs several
                sentences to compare, rare words need a vocabulary to average,
                and the soul is the aura's formed tier. They tick on their own. */}
            <Animated.View entering={FadeInDown.delay(420).duration(500)} style={{ width: "100%", maxWidth: 330, marginTop: 20 }}>
              <Text style={{ fontFamily: F2.serifItalic, fontSize: 16, color: "#CFC7E8", textAlign: "center" }}>
                {her || "Wren"} is still growing.
              </Text>
              <Text style={[mono(9.5, "r"), { color: "#7E7799", textAlign: "center", marginTop: 6, letterSpacing: 0.6 }]}>
                WRITE MORE LETTERS TO REVEAL
              </Text>
              <View style={{ marginTop: 12, alignSelf: "center" }}>
                {hatched.dims.slice(4).filter((d) => !d.locked).slice(0, 4).map((d) => d.sealed).map((t) => (
                  <View key={t} style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                    <View style={{ width: 13, height: 13, borderWidth: 1.6, borderColor: "#5E5878", marginRight: 10 }} />
                    <Text style={[mono(11, "r"), { color: "#8F87AC", letterSpacing: 0.3 }]}>{t}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(560).duration(500)} style={{ width: "100%", maxWidth: 320, marginTop: 22 }}>
              <Pressable onPress={letHerGo} style={[keyBtn, bevel(4, 4), { backgroundColor: Y.brass, borderColor: Y.brass }]}>
                <Text style={mono(12.5, "b")}>LET {HER} GO</Text>
              </Pressable>
            </Animated.View>
          </>
        )}

        {/* THE DEPARTURE. The old version scaled a 44px envelope under a bird
            that was itself shrinking, which is why nobody could tell she was
            carrying anything. Here the letter is big, it's tucked under her on
            a tilt, and she banks left-then-right on the way up so the eye
            follows the object rather than a straight vertical exit. */}
        {hatchPhase === "fly" && (
          <>
            <Animated.View style={[flyStyle, { alignItems: "center" }]}>
              <WrenBird size={132} mood="delight" />
              <View style={{ marginTop: -26, transform: [{ rotate: "-11deg" }] }}>
                <CarriedLetter />
              </View>
            </Animated.View>
            <Animated.Text
              entering={FadeIn.delay(500).duration(400)}
              style={[mono(10.5, "b"), { color: "#8C86B8", position: "absolute", bottom: 96, textAlign: "center" }]}
            >
              OFF TO FIND SOMEONE WHO WRITES LIKE YOU
            </Animated.Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── the console shell ───────────────────────────────────────────────── */

/* Everything but the reveal lives inside this: the pale wash ground, a
   segmented progress readout, one way back. The bar is the console's own
   display, and it's why nine screens don't read as nine screens — you can
   see the whole run from the second one. */
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
            {ORDER.slice(0, BARS).map((s, i) => (
              <Seg key={s} on={i <= step} i={i} last={i === BARS - 1} />
            ))}
          </View>
        </View>
      )}
      {children}
    </SafeAreaView>
  );
}

/* one segment of the meter — it springs in rather than snapping, so moving
   forward has a small physical reward of its own */
function Seg({ on, i, last }: { on: boolean; i: number; last: boolean }) {
  const v = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    v.value = withDelay(i * 40, withSpring(on ? 1 : 0, { damping: 13, stiffness: 180 }));
  }, [on, i, v]);
  const s = useAnimatedStyle(() => ({ transform: [{ scaleX: v.value }] }));
  return (
    <View style={{ flex: 1, height: 11, marginRight: last ? 0 : 3, borderWidth: 1.8, borderColor: Y.ink, overflow: "hidden" }}>
      <Animated.View style={[s, { flex: 1, backgroundColor: Y.blue, transformOrigin: "left center" }]} />
    </View>
  );
}

/* THE EGG DOCK. Steps 2–5 are short forms with a lot of air under them, and
   dead air on a toy reads as a broken toy. Rather than filling it with
   decoration, it gets filled with the thing the flow is actually about:
   your egg, breathing, saying a little less nothing each screen. */
function EggDock({ variant, status, style }: { variant: number; status?: string; style: any }) {
  if (!status) return null;
  return (
    <Animated.View entering={FadeInDown.delay(260).duration(460)} style={{ paddingHorizontal: 18, paddingBottom: 6 }}>
      <View style={[card, bevel(4, 4), { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 }]}>
        <View
          style={{
            width: 54,
            height: 54,
            borderWidth: 2,
            borderColor: Y.ink,
            borderRadius: 9,
            backgroundColor: Y.lcd,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <Animated.View style={style}>
            <EggShell variant={variant} size={46} />
          </Animated.View>
        </View>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={[mono(9, "b"), { color: Y.faint }]}>INCUBATOR</Text>
          <Text style={[mono(10.5, "b"), { marginTop: 3 }]}>{status}</Text>
        </View>
        <Dots />
      </View>
    </Animated.View>
  );
}

/* three dots that fill in turn — the console thinking. Written out rather
   than mapped: useAnimatedStyle is a hook, so a loop or a helper that calls
   it three times breaks the rules of hooks and takes the screen with it. */
function Dots() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(3.99, { duration: 1600, easing: Easing.linear }), -1, false);
  }, [t]);
  const a = useAnimatedStyle(() => ({ opacity: t.value >= 1 ? 1 : 0.22 }));
  const b = useAnimatedStyle(() => ({ opacity: t.value >= 2 ? 1 : 0.22 }));
  const c = useAnimatedStyle(() => ({ opacity: t.value >= 3 ? 1 : 0.22 }));
  const dot = { width: 6, height: 6, borderRadius: 3, backgroundColor: Y.blue, marginLeft: 4 } as const;
  return (
    <View style={{ flexDirection: "row" }}>
      <Animated.View style={[a, dot]} />
      <Animated.View style={[b, dot]} />
      <Animated.View style={[c, dot]} />
    </View>
  );
}

/* the headline: plain words, then the one in italic serif that carries it */
function Head({ plain, em, sub }: { plain: string; em: string; sub: string }) {
  return (
    <Animated.View entering={FadeInDown.duration(420)} style={{ paddingHorizontal: 18, paddingTop: 12 }}>
      <Text style={{ fontFamily: F2.serif, fontSize: 26, color: Y.ink, textAlign: "center", lineHeight: 33 }}>
        {plain} <Text style={{ fontFamily: F2.serifItalic }}>{em}</Text>
      </Text>
      {!!sub && <Text style={[mono(11, "r"), { color: Y.dim, textAlign: "center", marginTop: 9, lineHeight: 18, letterSpacing: 0.2 }]}>{sub}</Text>}
    </Animated.View>
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
  tone?: "brass";
  skip?: string;
  onSkip?: () => void;
}) {
  return (
    <View style={{ paddingHorizontal: 18, paddingBottom: 10, paddingTop: 8 }}>
      <Pressable
        onPress={() => on && onPress()}
        disabled={!on}
        style={[keyBtn, bevel(4, 4), { backgroundColor: tone === "brass" ? Y.brass : Y.blue, opacity: on ? 1 : 0.4 }]}
      >
        <Text style={[mono(12.5, "b"), { color: tone === "brass" ? Y.ink : "#fff" }]}>{label}</Text>
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

/* THE HATCHLING — the thing that was just born, not a portrait of the adult.
   Three faults in the old card, and they were all the same fault: she wasn't
   alive in there.

   · She was drawn at stage "wren", the grown bird. WrenBird has had a
     hatchling all along (stage="hatch"); onboarding just never asked for it.
   · The sticker skin's white keyline is die-cut for lifting her off a busy
     page. On a dark card where she's the only object it reads as a sticker
     stuck on — hence `bare`.
   · She didn't move and she didn't answer. A newly hatched pet you cannot
     poke is a picture of a pet.

   So: she sits in the halves of the shell YOU chose two screens ago, she
   breathes on her own, and she answers a finger — a squash-and-stretch hop,
   a change of face, and a small mark over her head. Four faces cycle, so the
   third poke isn't the second poke again. */
const POKES: WrenMood[] = ["delight", "curious", "wink", "happy"];

function Hatchling({ mood, shell }: { mood: WrenMood; shell: number }) {
  const [pokes, setPokes] = useState(0);
  const squish = useSharedValue(0); // 0 rest, drives the whole hop
  const spark = useSharedValue(0);

  // idle breath — slow, and never fully still
  const air = useSharedValue(0);
  useEffect(() => {
    air.value = withRepeat(
      withSequence(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 1700, easing: Easing.inOut(Easing.quad) })),
      -1,
      true,
    );
  }, [air]);

  const body = useAnimatedStyle(() => ({
    transform: [
      { translateY: -air.value * 2.5 - squish.value * 14 },
      { scaleX: 1 + squish.value * -0.12 + air.value * 0.01 },
      { scaleY: 1 + squish.value * 0.16 + air.value * 0.015 },
    ],
  }));
  const sparkStyle = useAnimatedStyle(() => ({ opacity: spark.value, transform: [{ translateY: -spark.value * 16 }, { scale: 0.6 + spark.value * 0.5 }] }));

  const poke = () => {
    setPokes((n) => n + 1);
    // down, past the top, settle — the shape of something small jumping
    squish.value = withSequence(
      withTiming(-1, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 220, easing: Easing.out(Easing.back(2.6)) }),
      withSpring(0, { damping: 9, stiffness: 220 }),
    );
    spark.value = withSequence(withTiming(1, { duration: 160 }), withDelay(280, withTiming(0, { duration: 320 })));
  };

  const face = pokes > 0 ? POKES[(pokes - 1) % POKES.length] : mood;
  const sh = EGG_SHELLS[shell] ?? EGG_SHELLS[0];

  return (
    <Pressable onPress={poke} hitSlop={16} style={{ width: 150, height: 132, alignItems: "center", justifyContent: "flex-end" }}>
      {/* the mark over her head when she answers */}
      <Animated.Text style={[sparkStyle, { position: "absolute", top: 4, fontSize: 17 }]}>♪</Animated.Text>

      {/* SHE SITS IN THE SHELL, and the shell is drawn OVER her lower half so
          she's inside it rather than standing in front of it. The first
          attempt was a zigzag strip behind her and it read as a pink mountain
          range. The colour is the one you picked two screens ago — the only
          part of her you got to choose, kept and shown. */}
      <Animated.View style={[body, { marginBottom: 30 }]}>
        <WrenBird size={104} mood={face} stage="hatch" bare />
      </Animated.View>

      <Svg width={150} height={62} viewBox="0 0 150 62" style={{ position: "absolute", bottom: 0 }}>
        {/* the bottom half she's sitting in — jagged rim, rounded belly */}
        <Path
          d="M33 16 L43 28 L53 10 L64 26 L75 8 L86 26 L96 12 L106 26 L117 16 L118 28 C118 48 101 60 75 60 C49 60 32 48 32 28 Z"
          fill={sh.base}
        />
        <Path d="M33 16 L43 28 L53 10 L64 26 L75 8 L86 26 L96 12 L106 26 L117 16" fill="none" stroke={sh.speck} strokeWidth={2} strokeLinejoin="round" />
        <Circle cx={56} cy={42} r={2} fill={sh.speck} />
        <Circle cx={92} cy={38} r={1.8} fill={sh.speck} />
        <Circle cx={74} cy={50} r={1.6} fill={sh.speck} />
      </Svg>
    </Pressable>
  );
}

/* one strand of the DNA: mark, name, number. No bar and no nine-row table —
   the point of this screen is that something was born, not that something was
   measured. */
function DnaRow({ d }: { d: DimScore }) {
  return (
    <View style={{ width: "100%", flexDirection: "row", alignItems: "center", marginBottom: 9 }}>
      <Text style={{ fontFamily: F2.serif, fontSize: 14, width: 24, color: Y.brass }}>{d.icon}</Text>
      <Text style={{ flex: 1, fontFamily: F2.serif, fontSize: 16, color: "#E4DFF3" }}>{d.label}</Text>
      {!d.locked && <Text style={[mono(7.5, "b"), { color: "#6F6892", marginRight: 8 }]}>GROWING</Text>}
      <Text style={[mono(15, "b"), { color: Y.brass, opacity: d.locked ? 1 : 0.55, fontVariant: ["tabular-nums"] }]}>{d.score}</Text>
    </View>
  );
}

/* the letter she leaves with — big enough to actually read as a letter */
function CarriedLetter() {
  return (
    <Svg width={92} height={68} viewBox="0 0 92 68">
      <Rect x={2} y={2} width={88} height={64} rx={4} fill="#FFFFFF" stroke={Y.ink} strokeWidth={2.6} />
      <Path d="M2 6 L46 40 L90 6" fill="none" stroke={Y.ink} strokeWidth={2.4} strokeLinejoin="round" />
      <Rect x={62} y={44} width={20} height={16} fill={Y.blue} stroke={Y.ink} strokeWidth={2} />
      <Rect x={10} y={48} width={34} height={3} fill={Y.ink} opacity={0.5} />
      <Rect x={10} y={56} width={22} height={3} fill={Y.ink} opacity={0.3} />
    </Svg>
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
          fill={Y.brass}
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
