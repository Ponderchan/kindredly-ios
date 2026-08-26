import { useEffect, useRef, useState } from "react";
import { Alert, Dimensions, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
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
import Svg, { Circle, ClipPath, Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";
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
import { hatch, saveArchetype, type DimScore, starterStamp } from "../lib/hatch-engine";
import { NAME_IDEAS, saveWrenEgg, saveWrenName } from "../lib/wren-name";
import { track } from "../lib/track";
import { PRONOUNS, type PronounId, pronoun, saveWrenPronoun, saveYourPronoun } from "../lib/pronouns";
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
     avatar    a face — yours alone until reveal, then it travels with your name
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

type Step = "welcome" | "username" | "you" | "cakeday" | "avatar" | "egg" | "write" | "hatch" | "naming" | "flight";
/* THE DOCTRINE ORDER (owner, 2026-08-25): you feed the egg BEFORE anything
   has a name — the bird must exist before it can be named, and naming an
   egg is naming a stranger. So: shell → words → hatch → name → first
   flight. Everything after the hatch is post-birth: no meter, no back. */
const ORDER: Step[] = ["welcome", "username", "you", "cakeday", "avatar", "egg", "write", "hatch", "naming", "flight"];
const BARS = ORDER.indexOf("hatch"); // the form ends where the bird begins

/* EVERY STEP'S CONTENT IS OPTICALLY CENTRED between the progress meter and
   the key. It used to be top-aligned, so a short step — the welcome worst of
   all — packed everything against the meter and left a third of the screen
   dead underneath. A console reads as a console because its screen is
   composed; content shoved to the top over a void reads as a page that failed
   to finish loading.

   `flexGrow: 1` matters as much as the centring: without it a content
   container only grows to fit its children, so justifyContent has no room to
   work in and nothing moves. The two steps that carry an incubator dock get a
   matching flexible gap ABOVE the content, since they already had one below
   it — one spacer centres nothing. */
const CENTRED = { flexGrow: 1, justifyContent: "center" } as const;

const WIN_W = Dimensions.get("window").width;
const PAGE_W = WIN_W - 40;

// the recap cards inside the KINDREDLY.EXE window — a letter's whole life
const CARDS: { tag: string; h: string; hi: string; s: string }[] = [
  { tag: "WRITE IT DOWN", h: "Write down", hi: "what's real.", s: "Tired, glad, or just true — a line is enough." },
  { tag: "OFF IT GOES", h: "It finds", hi: "your kind of person.", s: "Matched by how you write — not by who you are." },
  { tag: "THEY WRITE BACK", h: "And slowly,", hi: "you're not strangers.", s: "Five letters each, and you trade names." },
];

/* the sealed list's inline short forms — the long sealed lines are for a
   stacked checklist; run together with dots they need two words each */
const SEALED_SHORT: Partial<Record<string, string>> = {
  rhythm: "hidden rhythm",
  vocabulary: "rare words",
  perspective: "way of seeing",
  emotion: "emotional patterns",
  function: "small tells",
  punctuation: "where you pause",
  structure: "thought patterns",
  sentence: "sentence shape",
  quirks: "personal patterns",
};

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

  /* EVERY STEP, NOT JUST THE LAST ONE. onboard_done alone tells you how
     many finished and nothing about the ones who didn't — and this is the
     steepest stretch in the whole funnel. One event per step ARRIVED-AT
     makes each drop-off visible: how many saw the egg, how many fed it,
     how many never named her. Only the step name and its index travel;
     nothing anyone typed does. */
  useEffect(() => {
    track("onboard_step", { step, i: ORDER.indexOf(step) });
  }, [step]);
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
  const [hatchPhase, setHatchPhase] = useState<"crack" | "born">("crack");
  const [flying, setFlying] = useState(false);
  const [readStep, setReadStep] = useState(0); // the reading ceremony's cursor
  const [busy, setBusy] = useState<null | "apple" | "email">(null);
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
    if (session && !auth.isGuest && !onboarded && step === "welcome") setStep("username");
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

  /* THE READING CEREMONY. Pressing hatch used to buy a 1.5s shudder — the
     engine did all its reading in a blink and the moment felt weightless.
     Now the read is WATCHABLE: one tick per fed thought, then three named
     passes, an egg filling with ink, and the fed thoughts sitting in a card
     so you can see exactly what she's reading. The engine is instant; the
     ceremony is honest about what it computed, just not about how long it
     took — a hatch that costs nothing feels like it read nothing. */
  useEffect(() => {
    if (step !== "hatch") return;
    setHatchPhase("crack");
    setReadStep(0);
    const total = fed.length + 3;
    const t = setInterval(() => {
      setReadStep((n) => {
        if (n >= total) {
          clearInterval(t);
          setHatchPhase("born");
          return n;
        }
        return n + 1;
      });
    }, 1350);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const doApple = async () => {
    setBusy("apple");
    const r = await auth.signInWithApple();
    setBusy(null);
    if ("error" in r) Alert.alert("Continue with Apple", r.error);
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
          await publishLetter(starterStamp(mood, opener), opener, "en");
        track("onboard_done", { fed: fed.length });
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
    setFlying(true);
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
        <ScrollView contentContainerStyle={{ ...CENTRED, paddingVertical: 18 }} showsVerticalScrollIndicator={false}>
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
                {/* Two ways in, not three. Google came out on the owner's
                    call; lib/auth keeps signInWithGoogle so nothing in the
                    session layer had to change and it can come back as one
                    button whenever it's wanted. Email is now the second real
                    option rather than a footnote under a third, so it gets a
                    key of its own instead of a line of text. */}
                <Pressable
                  onPress={doEmail}
                  disabled={!!busy}
                  style={[card, bevel(4, 4), { height: 52, alignItems: "center", justifyContent: "center", marginTop: 12, opacity: busy ? 0.5 : 1 }]}
                >
                  <Text style={[mono(12, "b"), { color: Y.blue }]}>{busy === "email" ? "…" : "CONTINUE WITH EMAIL"}</Text>
                </Pressable>
                {/* clear of the email key's hard shadow — it used to follow a
                    line of text, and now it follows a bevelled button */}
                <Pressable
                  onPress={() => {
                    /* fire-and-forget: the session usually lands before they
                       finish typing a pen name, and nothing on the next few
                       screens needs it yet */
                    void auth.signInAnonymously();
                    setStep("username");
                  }}
                  style={{ alignItems: "center", paddingTop: 18 }}
                >
                  {/* "Explore first, sign in later" promised something the product can't
                      keep: without a session the pool is unreadable (RLS is
                      `to authenticated`), so there is very little to explore.
                      "Just looking" is what a person actually says walking into
                      a shop — it promises nothing, and unlike Skip or Continue
                      as guest it doesn't imply they're dodging the real thing. */}
                  <Text style={[mono(11, "r"), { color: Y.dim }]}>Just looking →</Text>
                </Pressable>

                {/* the agreement line (1.2 UGC): every door in, including "Just
                    looking", passes this sentence. Underlines mark what's a
                    link; Y.dim keeps it quiet — consent copy that shouts reads
                    as a trap. */}
                <Text style={[mono(9.5, "r"), { color: Y.dim, textAlign: "center", paddingTop: 14, lineHeight: 15 }]}>
                  BY CONTINUING YOU AGREE TO THE{" "}
                  <Text onPress={() => Linking.openURL("https://kindredly.io/terms")} style={{ textDecorationLine: "underline" }}>
                    TERMS
                  </Text>{" "}
                  &{" "}
                  <Text onPress={() => Linking.openURL("https://kindredly.io/privacy")} style={{ textDecorationLine: "underline" }}>
                    PRIVACY POLICY
                  </Text>
                </Text>
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
          <View style={{ flex: 1 }} />
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
        <View style={{ flex: 1 }} />
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
        <ScrollView contentContainerStyle={CENTRED} showsVerticalScrollIndicator={false}>
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
        <ScrollView contentContainerStyle={CENTRED} showsVerticalScrollIndicator={false}>
          <Head plain="Pick a" em="face." sub="Strangers never see it. A kindred does — it travels with your name when you trade them." />
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
        <ScrollView contentContainerStyle={CENTRED} showsVerticalScrollIndicator={false}>
          <Head
            plain="Pick your"
            em="courier's shell."
            sub="Your words decide what hatches. The shell only leaves a birthmark — the bird inside is written, not chosen."
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
        <Foot label="THIS ONE'S MINE ›" on onPress={() => setStep("write")} />
      </Console>
    );
  }

  /* ── 8 · name what hatched ── POST-BIRTH: no meter, no back. You cannot
     climb back into the shell, and the form is over — this is the first
     thing you do FOR someone rather than about yourself. */
  if (step === "naming") {
    return (
      <Console>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={CENTRED} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Head plain="Your courier" em="needs a name." sub="This is what they're called from here on — in every line they ever write you." />

            <Animated.View entering={ZoomIn.delay(60).duration(340)} style={{ alignItems: "center", marginTop: 12 }}>
              <Hatchling mood={hatchMood} shell={eggVar} />
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
          <Foot label="FIRST FLIGHT ›" on={her.length > 0} tone="brass" onPress={() => setStep("flight")} />
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
                <Text style={[mono(9.5, "b"), { flex: 1 }]}>FEED THE EGG</Text>
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

            <Head plain="Give it something" em="only you'd write." sub="One thought is enough to hatch. Each extra one locks in more of who comes out." />

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
            label={canHatch ? "HATCH IT 🥚" : "FEED ONE THOUGHT FIRST"}
            on={canHatch}
            tone="brass"
            onPress={() => setStep("hatch")}
          />
        </KeyboardAvoidingView>
      </Console>
    );
  }

  /* ── 10 · FIRST FLIGHT — the ending that teaches everything ─────────
     The fed words fold into a letter; the newly named bird picks it up and
     leaves with it. Three things land wordlessly: it came from my words,
     it is mine, it carries my letters. The button is a release, not a
     next — she goes because you let her. */
  if (step === "flight") {
    const opener = [...fed].sort((a, b) => weightedCount(b) - weightedCount(a))[0] || "";
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Y.ground }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 22 }}>
          {!flying ? (
            <>
              <Animated.Text entering={FadeIn.duration(400)} style={{ fontFamily: F2.serif, fontSize: 31, color: Y.ink, textAlign: "center" }}>
                {her}’s <Text style={{ fontFamily: F2.serifItalic }}>first flight.</Text>
              </Animated.Text>
              <Text style={[mono(10, "b"), { color: Y.dim, marginTop: 10, letterSpacing: 0.6 }]}>YOUR WORDS, FOLDED INTO A LETTER</Text>

              <Animated.View entering={FadeInDown.delay(220).duration(480)} style={{ alignItems: "center", marginTop: 22 }}>
                <Animated.View style={breathe}>
                  <WrenBird size={110} mood="delight" stage="hatch" bare />
                </Animated.View>
                {/* the letter is the words they just fed — real, not an icon */}
                <View style={[card, bevel(4, 4), { maxWidth: 300, marginTop: -8, paddingHorizontal: 16, paddingVertical: 13, transform: [{ rotate: "-2deg" }] }]}>
                  <Text numberOfLines={3} style={{ fontFamily: F2.serifItalic, fontSize: 15, lineHeight: 22, color: Y.ink }}>
                    {opener}
                  </Text>
                  <Text style={[mono(8.5, "b"), { color: Y.faint, marginTop: 8 }]}>CARRIED BY {her.toUpperCase()}</Text>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(500).duration(480)} style={{ width: "100%", maxWidth: 340, marginTop: 30 }}>
                <Pressable onPress={letHerGo} style={[keyBtn, bevel(4, 4), { backgroundColor: Y.blue }]}>
                  <Text style={[mono(12.5, "b"), { color: "#fff" }]}>LET {HER} GO ›</Text>
                </Pressable>
              </Animated.View>
            </>
          ) : (
            <>
              <Animated.View style={[flyStyle, { alignItems: "center" }]}>
                <WrenBird size={132} mood="delight" bare />
                <View style={{ marginTop: -26, transform: [{ rotate: "-11deg" }] }}>
                  <CarriedLetter />
                </View>
              </Animated.View>
              <Animated.Text
                entering={FadeIn.delay(500).duration(400)}
                style={[mono(10.5, "b"), { color: Y.dim, position: "absolute", bottom: 96, textAlign: "center" }]}
              >
                OFF TO FIND SOMEONE WHO WRITES LIKE YOU
              </Animated.Text>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  /* ── 9 · NEW HATCH UNLOCKED — in daylight ───────────────────────────
     The reveal used to be a gold-on-black trading card. It read as a
     different app at the exact moment the console hands over — so it now
     stays on the console's own pale ground, with a warm glow behind her
     doing the work the dark card used to do. The DNA rows drop the glyphs
     (half-dead at 14px on a light ground) for progress bars: brass = locked,
     the app's blue = still growing. Colour carries the confidence, so the
     GROWING tags and the OF-9 counter could go. */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: hatchPhase === "born" ? "#211C36" : Y.ground }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: hatchPhase === "crack" ? "flex-start" : "center", paddingHorizontal: 22, paddingVertical: 18 }}>
        {hatchPhase === "crack" && (
          <View style={{ width: "100%", maxWidth: 360, alignSelf: "center" }}>
            {/* the console meter, full — every step behind you */}
            <View style={{ flexDirection: "row", marginTop: 2 }}>
              {ORDER.slice(0, BARS).map((k) => (
                <View key={k} style={{ flex: 1, height: 11, marginRight: 3, borderWidth: 1.8, borderColor: Y.ink, backgroundColor: Y.blue }} />
              ))}
            </View>

            <Text style={{ fontFamily: F2.serif, fontSize: 30, color: Y.ink, marginTop: 22, lineHeight: 37 }}>
              Reading you <Text style={{ fontFamily: F2.serifItalic }}>right now.</Text>
            </Text>
            <Text style={[mono(11, "r"), { color: Y.dim, marginTop: 8, lineHeight: 18 }]}>Don't close it. This takes about ten seconds.</Text>

            {/* the egg filling with ink, and the passes it's making */}
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 20 }}>
              <ReadingEgg progress={readStep / (fed.length + 3)} />
              <View style={{ flex: 1, marginLeft: 18 }}>
                {[...fed.map((_, i) => `THOUGHT ${String(i + 1).padStart(2, "0")} READ`), "FINDING RHYTHM…", "SHAPING VOICE", "WAKING SOMETHING"].map(
                  (label, i) => {
                    const done = readStep > i;
                    const now = readStep === i;
                    return (
                      <View key={label} style={{ flexDirection: "row", alignItems: "center", marginBottom: 11 }}>
                        <View
                          style={{
                            width: 15,
                            height: 15,
                            marginRight: 10,
                            borderWidth: 2,
                            borderColor: done ? Y.blue : now ? Y.brass : "rgba(17,17,19,0.25)",
                            backgroundColor: done ? Y.blue : now ? Y.brass : "transparent",
                          }}
                        />
                        <Text style={[mono(10.5, done || now ? "b" : "m"), { color: done || now ? Y.ink : Y.faint }]}>{label}</Text>
                      </View>
                    );
                  },
                )}
              </View>
            </View>

            {/* what she's reading, in evidence */}
            <View style={[card, bevel(4, 4), { marginTop: 16, paddingHorizontal: 16, paddingVertical: 13 }]}>
              <Text style={[mono(9.5, "b"), { color: Y.faint, marginBottom: 4 }]}>WHAT YOU FED ME</Text>
              {fed.map((t, i) => (
                <View key={i} style={{ borderTopWidth: i === 0 ? 0 : 1, borderTopColor: "rgba(17,17,19,0.1)", paddingVertical: 9, flexDirection: "row" }}>
                  <Text style={[mono(10, "b"), { color: Y.blue, marginRight: 10, marginTop: 2 }]}>{String(i + 1).padStart(2, "0")}</Text>
                  <Text numberOfLines={1} style={{ flex: 1, fontFamily: F2.serifItalic, fontSize: 15.5, color: Y.ink }}>
                    {t}
                  </Text>
                </View>
              ))}
            </View>

            {/* the meter, in percent */}
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14 }}>
              <View style={{ flex: 1, height: 16, borderWidth: 2, borderColor: Y.ink, backgroundColor: Y.panel }}>
                <View style={{ width: `${Math.round((readStep / (fed.length + 3)) * 100)}%`, height: "100%", backgroundColor: Y.blue }} />
              </View>
              <Text style={[mono(11.5, "b"), { marginLeft: 10, fontVariant: ["tabular-nums"] }]}>
                {Math.round((readStep / (fed.length + 3)) * 100)}%
              </Text>
            </View>

            <View style={{ borderWidth: 2, borderColor: "rgba(17,17,19,0.2)", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 26 }}>
              <Text style={[mono(12, "b"), { color: Y.faint }]}>HATCHING…</Text>
            </View>
          </View>
        )}

        {hatchPhase === "born" && (
          <View style={{ flex: 1, width: "100%", maxWidth: 360, alignItems: "center", justifyContent: "center" }}>
            {/* THE DOCTRINE: no verdict at birth. No archetype, no nine bars,
                no percent — "Something hatched.", the thing itself (eyes
                first, out of the dark), ONE thing it caught in your words,
                and the honest close: still learning. The read all happened —
                it just doesn't get to define a newborn. */}
            <Animated.Text entering={FadeIn.duration(600)} style={{ fontFamily: F2.serif, fontSize: 31, color: "#F2EFFF" }}>
              Something <Text style={{ fontFamily: F2.serifItalic }}>hatched.</Text>
            </Animated.Text>

            <View style={{ height: 190, alignItems: "center", justifyContent: "center", marginTop: 8 }}>
              {/* the eyes arrive before the body does */}
              <Animated.View entering={FadeIn.delay(600).duration(420)} style={{ position: "absolute", flexDirection: "row", gap: 20 }}>
                <View style={{ width: 9, height: 13, borderRadius: 5, backgroundColor: "#F2EFFF" }} />
                <View style={{ width: 9, height: 13, borderRadius: 5, backgroundColor: "#F2EFFF" }} />
              </Animated.View>
              <Animated.View entering={ZoomIn.delay(1500).duration(460).easing(Easing.out(Easing.back(1.6)))}>
                <Hatchling mood={hatchMood} shell={eggVar} />
              </Animated.View>
            </View>

            <Animated.View entering={FadeIn.delay(2400).duration(500)} style={{ alignItems: "center" }}>
              <Text style={{ fontFamily: F2.serifItalic, fontSize: 16.5, color: "#9C94D6" }}>It picked up something in your words.</Text>
              <View style={[tag, bevel(2.5, 2.5), { backgroundColor: Y.brass, marginTop: 12 }]}>
                <Text style={mono(10.5, "b")}>{(SEALED_SHORT[hatched.dims[0].key] ?? hatched.dims[0].label.toLowerCase()).toUpperCase()}</Text>
              </View>
              <Text style={[mono(9.5, "b"), { color: "#6F68A8", marginTop: 14, letterSpacing: 1 }]}>STILL LEARNING.</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(3200).duration(500)} style={{ width: "100%", maxWidth: 340, marginTop: 30 }}>
              <Pressable onPress={() => setStep("naming")} style={[keyBtn, bevel(4, 4), { backgroundColor: Y.brass }]}>
                <Text style={mono(12.5, "b")}>GIVE IT A NAME ›</Text>
              </Pressable>
            </Animated.View>
          </View>
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
/* one dimension as a bar: label, fill, number. Brass = locked (trusted),
   the app's blue = still growing — colour carries the confidence, so no tag. */
function BarRow({ d }: { d: DimScore }) {
  const col = d.locked ? Y.brass : Y.blue;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
      <Text style={{ width: 118, fontFamily: F2.serif, fontSize: 15.5, color: Y.ink }}>{d.label}</Text>
      <View style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: "#E4E1F6", marginHorizontal: 10, overflow: "hidden" }}>
        <View style={{ width: `${d.score}%`, height: 7, borderRadius: 4, backgroundColor: col, opacity: d.locked ? 1 : 0.85 }} />
      </View>
      <Text style={[mono(13, "b"), { color: col, width: 30, textAlign: "right", fontVariant: ["tabular-nums"] }]}>{d.score}</Text>
    </View>
  );
}

/* the reading egg — white shell, hard shadow, and ink rising inside it as
   the passes complete. The liquid is the progress bar; the percent strip
   below just says the same thing in numbers. */
function ReadingEgg({ progress }: { progress: number }) {
  const H = 172;
  const fill = Math.max(0, Math.min(1, progress));
  return (
    <View style={[bevel(5, 5)]}>
      <Svg width={140} height={H} viewBox="0 0 140 172">
        <Defs>
          <ClipPath id="eggClip">
            <Path d="M70 6 C104 6 132 52 132 102 C132 144 106 166 70 166 C34 166 8 144 8 102 C8 52 36 6 70 6 Z" />
          </ClipPath>
        </Defs>
        <Path d="M70 6 C104 6 132 52 132 102 C132 144 106 166 70 166 C34 166 8 144 8 102 C8 52 36 6 70 6 Z" fill={Y.panel} stroke={Y.ink} strokeWidth={3.5} />
        <Rect x={0} y={166 - fill * 152} width={140} height={fill * 152 + 6} fill={Y.blue} clipPath="url(#eggClip)" />
        {fill > 0.12 && <Circle cx={44} cy={166 - fill * 152 + 26} r={5} fill="#C9C4F7" clipPath="url(#eggClip)" />}
        {fill > 0.3 && <Circle cx={92} cy={166 - fill * 152 + 14} r={4} fill="#C9C4F7" clipPath="url(#eggClip)" />}
        <Path d="M70 6 C104 6 132 52 132 102 C132 144 106 166 70 166 C34 166 8 144 8 102 C8 52 36 6 70 6 Z" fill="none" stroke={Y.ink} strokeWidth={3.5} />
        <Circle cx={48} cy={44} r={11} fill="#E4E1F6" opacity={0.9} />
      </Svg>
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
