import { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Line, Path, Rect } from "react-native-svg";
import * as AppleAuthentication from "expo-apple-authentication";
import { P, PF, panel, rule, ruleSoft, solidBtn } from "../theme/post";
import { WHEEL_ROW, Wheel } from "../components/Wheel";
import { useBreathe } from "../components/anim";
import { MONTHS } from "../data/content";
import { useAuth } from "../lib/auth";
import { publishLetter, upsertFingerprint } from "../lib/db";
import { signatureVector, voiceSignature } from "../lib/signature";
import { WrenBird, type WrenMood } from "../components/WrenBird";
import { EggShell } from "../components/EggShell";
import { hatchLine, readMood } from "../lib/wren-read";
import { bumpStageFloor, setWrenAccessory } from "../lib/wren-style";
import { saveWrenType, wrenTypeFor } from "../lib/wren-type";
import { STARTER_STAMPS } from "../data/stamps";
import { OPENING_MIN, weightedCount } from "../lib/weighted-count";

/* Onboarding.
   ────────────────────────────────────────────────────────────────────────
   THE ORDER IS THE ARGUMENT. This product's whole claim is that you are how
   you write, not how you look — so it cannot ask for a name, a birthday, a
   face and an egg colour before it ever asks you to write a word. The old
   flow did exactly that: the one load-bearing step was sixth of seven.

   Here the line comes FIRST, and everything else is asked afterwards, when
   it has a reason to exist. `wrenTypeFor()` has always decided who Wren
   becomes from HOW you wrote — now the screens say so out loud.

     door   what this is · sign in · or look around first
     write  one line. this is the whole product, on the second screen.
     you    a pen name, and the 18+ gate
     hatch  she cracks out of THAT line, reads you, and carries it off

   THREE CONTROLS WERE REMOVED because they collected nothing:
     · the egg colour was picked and then discarded — `finish()` never saved
       it. The shell is now DERIVED from your line, so the egg means the
       thing the screen after it claims it means.
     · the mood row was picked and then never read — Wren's face comes from
       `readMood(note)`, off the text.
     · the avatar is already editable in Me, and was already skippable.

   The cakeday stayed: it is the 18+ gate, which a stranger-messaging app
   does not get to skip. It now shares a screen with the pen name.

   PUBLISHING: the first line always trains the fingerprint, but only reaches
   the stranger pool if it clears the same floor every other opening does.
   A two-character letter should not be someone's morning post. */

type Step = "door" | "write" | "you" | "hatch";

/* the three rows on the door — a letter's whole life, in order. The numbers
   are load-bearing here: this IS a sequence, and the sequence is the pitch. */
const LIFE: { n: string; h: string; s: string }[] = [
  { n: "01", h: "You write a line", s: "Tired, glad, or just true. A line is enough." },
  { n: "02", h: "It travels", s: "Matched by how you write — never by who you are." },
  { n: "03", h: "Someone writes back", s: "Five letters each, and you're not strangers." },
];

export default function Onboarding() {
  const router = useRouter();
  const auth = useAuth();
  const { session, onboarded, appleAvailable } = auth;

  const [step, setStep] = useState<Step>("door");
  const [note, setNote] = useState("");
  const [username, setUsername] = useState("");
  const nowY = new Date().getFullYear();
  const [dob, setDob] = useState({ m: 5, d: 15, y: nowY - 22 });
  const [hatchPhase, setHatchPhase] = useState<"crack" | "read" | "fly">("crack");
  const [busy, setBusy] = useState<null | "apple" | "google" | "email">(null);
  const [emailSent, setEmailSent] = useState(false);
  const finishing = useRef(false);
  const breathe = useBreathe(5, 3800);

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

  // she flies off into the app
  const flyY = useSharedValue(0);
  const flyScale = useSharedValue(1);
  const flyOp = useSharedValue(1);
  const flyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: flyY.value }, { scale: flyScale.value }, { rotate: `${flyY.value * 0.02}deg` }],
    opacity: flyOp.value,
  }));

  // returning, already-onboarded → straight in
  useEffect(() => {
    if (session && onboarded) router.replace("/(tabs)/letters");
  }, [session, onboarded, router]);

  // signed in but not set up → straight to the line, not to a form
  useEffect(() => {
    if (session && !onboarded && step === "door") setStep("write");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, onboarded]);

  // hatch sequence: crack → read → fly-into-app
  useEffect(() => {
    if (step !== "hatch") return;
    setHatchPhase("crack");
    const t = setTimeout(() => setHatchPhase("read"), 850);
    return () => clearTimeout(t);
  }, [step]);
  useEffect(() => {
    if (step === "hatch" && hatchPhase === "fly") {
      flyY.value = withTiming(-460, { duration: 1300, easing: Easing.in(Easing.cubic) });
      flyScale.value = withTiming(0.3, { duration: 1300, easing: Easing.in(Easing.cubic) });
      flyOp.value = withTiming(0, { duration: 1300, easing: Easing.in(Easing.quad) });
      const t = setTimeout(() => void finish(), 1200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, hatchPhase]);

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
      "Wren will send you a quiet sign-in link.",
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
  const canWrite = line.length >= 2;
  const nameReady = username.trim().length > 0;
  const noteMood: WrenMood = readMood(line);
  const noteType = wrenTypeFor(note); // what hatches is decided by how you write
  // your egg is your line — no picker, because a picked shell was never saved
  const eggVar = line.length ? Math.abs(line.charCodeAt(0) * 31 + line.length) % 4 : 0;

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
          await publishLetter(STARTER_STAMPS[0], line, "en"); // her first act: carry it off
        } catch {
          /* best-effort — never block getting in */
        }
      }
    }
    try {
      await bumpStageFloor("hatch");
      await saveWrenType(noteType.id);
      await setWrenAccessory(noteType.accessory);
    } catch {
      /* best-effort */
    }
    await auth.saveProfile({ handle: username.trim(), dob: dobStr, avatarId: null, firstLine: line || undefined });
    router.replace("/(tabs)/letters");
  };

  /* ── the door ───────────────────────────────────────────────────────── */
  if (step === "door") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 22, paddingTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 2.4, color: P.ink }}>KINDREDLY</Text>
            <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 1.4, color: P.ink40 }}>EST. NOWHERE</Text>
          </View>

          <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: "center", paddingTop: 22 }}>
            <Animated.View style={breathe}>
              <WrenBird size={94} mood="curious" />
            </Animated.View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).duration(560)} style={{ paddingHorizontal: 22, paddingTop: 20 }}>
            <Text style={{ fontFamily: PF.letter, fontSize: 34, lineHeight: 40, color: P.ink, letterSpacing: -0.6 }}>
              Nobody here knows{"\n"}what you look like.
            </Text>
          </Animated.View>

          <View style={{ marginTop: 26, ...rule }} />
          {LIFE.map((r, i) => (
            <Animated.View
              key={r.n}
              entering={FadeInDown.delay(220 + i * 90).duration(500)}
              style={{ flexDirection: "row", paddingHorizontal: 22, paddingVertical: 15, ...(i < 2 ? ruleSoft : rule) }}
            >
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, color: P.pen, width: 34, marginTop: 3, letterSpacing: 0.6 }}>{r.n}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: PF.letter, fontSize: 17, color: P.ink, letterSpacing: -0.2 }}>{r.h}</Text>
                <Text style={{ fontFamily: PF.mono, fontSize: 11.5, lineHeight: 18, color: P.ink60, marginTop: 4 }}>{r.s}</Text>
              </View>
            </Animated.View>
          ))}

          <Animated.View entering={FadeInDown.delay(520).duration(500)} style={{ paddingHorizontal: 22, paddingTop: 22 }}>
            {emailSent ? (
              <View style={{ ...panel, padding: 16, alignItems: "center" }}>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.6, color: P.pen }}>LINK SENT</Text>
                <Text style={{ fontFamily: PF.mono, fontSize: 11.5, lineHeight: 18, color: P.ink60, marginTop: 6, textAlign: "center" }}>
                  Open it on this phone and you'll land right back here.
                </Text>
              </View>
            ) : (
              <>
                {appleAvailable ? (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={0}
                    style={{ height: 50, width: "100%" }}
                    onPress={doApple}
                  />
                ) : null}
                <Pressable
                  onPress={doGoogle}
                  disabled={!!busy}
                  style={{ ...panel, height: 50, alignItems: "center", justifyContent: "center", marginTop: 10, opacity: busy ? 0.4 : 1 }}
                >
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1.4, color: P.ink }}>
                    {busy === "google" ? "…" : "CONTINUE WITH GOOGLE"}
                  </Text>
                </Pressable>
                <Pressable onPress={doEmail} disabled={!!busy} style={{ paddingVertical: 14, alignItems: "center" }}>
                  <Text style={{ fontFamily: PF.mono, fontSize: 11.5, letterSpacing: 1, color: P.ink60 }}>
                    {busy === "email" ? "…" : "EMAIL ME A LINK"}
                  </Text>
                </Pressable>
              </>
            )}
          </Animated.View>

          <View style={{ ...ruleSoft, marginHorizontal: 22, marginTop: 2 }} />
          <Pressable onPress={() => setStep("write")} style={{ paddingVertical: 16, alignItems: "center" }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 11.5, letterSpacing: 1, color: P.ink40 }}>LOOK AROUND FIRST →</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ── the line ───────────────────────────────────────────────────────── */
  if (step === "write") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <StepHead n="01" total="02" label="YOUR FIRST LINE" onBack={() => setStep("door")} />

          {/* she asks, and the hairline under her is where your words begin */}
          <View style={{ flexDirection: "row", paddingHorizontal: 22, paddingTop: 18, paddingBottom: 16, alignItems: "flex-start" }}>
            <WrenBird size={40} mood="curious" />
            <Text style={{ flex: 1, fontFamily: PF.serifItalic, fontSize: 16.5, lineHeight: 25, color: P.ink, marginLeft: 12, marginTop: 2 }}>
              I can't see your face from here.{"\n"}Write me one line and I'll know you.
            </Text>
          </View>
          <View style={{ marginHorizontal: 22, ...ruleSoft }} />

          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            <TextInput
              value={note}
              onChangeText={setNote}
              multiline
              autoFocus
              placeholder="what's actually going on today…"
              placeholderTextColor={P.ink40}
              style={{
                fontFamily: PF.letter,
                fontSize: 20,
                lineHeight: 31,
                color: P.ink,
                paddingHorizontal: 22,
                paddingTop: 20,
                paddingBottom: 40,
                minHeight: 200,
              }}
            />
          </ScrollView>

          <View style={{ ...rule }} />
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 22, paddingVertical: 12 }}>
            <Text style={{ flex: 1, fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 0.8, color: P.ink40 }}>
              {weightedCount(line) >= OPENING_MIN ? "THIS ONE'S LONG ENOUGH TO TRAVEL" : "NO ONE READS THIS UNTIL YOU'RE IN"}
            </Text>
            <Pressable
              onPress={() => canWrite && setStep("you")}
              disabled={!canWrite}
              style={{ ...solidBtn, paddingHorizontal: 24, opacity: canWrite ? 1 : 0.25 }}
            >
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1.6, color: "#fff" }}>NEXT</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  /* ── who's writing ──────────────────────────────────────────────────── */
  if (step === "you") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <StepHead n="02" total="02" label="WHO'S WRITING" onBack={() => setStep("write")} />

          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={{ paddingHorizontal: 22, paddingTop: 22 }}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.8, color: P.ink60 }}>PEN NAME</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                placeholder="call yourself anything"
                placeholderTextColor={P.ink40}
                style={{ fontFamily: PF.letter, fontSize: 26, color: P.ink, paddingVertical: 10, letterSpacing: -0.4 }}
              />
            </View>
            <View style={{ marginHorizontal: 22, ...rule }} />
            <Text style={{ fontFamily: PF.mono, fontSize: 11, lineHeight: 18, color: P.ink60, paddingHorizontal: 22, paddingTop: 10 }}>
              Strangers never see it. Only a kindred does — after five letters each.
            </Text>

            <View style={{ paddingHorizontal: 22, paddingTop: 30 }}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.8, color: P.ink60 }}>BORN</Text>
            </View>
            {/* one field, three columns: the band is ruled once across all of
                them so the date reads as a single value, and the columns flex
                so the panel never ends in dead paper */}
            <View style={{ marginHorizontal: 22, marginTop: 8, ...panel }}>
              <View style={{ flexDirection: "row" }}>
                <Wheel items={MONTHS} value={dob.m} onChange={(i) => setDob((d) => ({ ...d, m: i }))} />
                <Wheel items={days} value={dob.d - 1} onChange={(i) => setDob((d) => ({ ...d, d: i + 1 }))} />
                <Wheel items={years} value={yi} onChange={(i) => setDob((d) => ({ ...d, y: years[i] }))} />
              </View>
              <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: WHEEL_ROW * 2, height: 1, backgroundColor: P.ink12 }} />
              <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: WHEEL_ROW * 3, height: 1, backgroundColor: P.ink12 }} />
            </View>
            <Text style={{ fontFamily: PF.mono, fontSize: 11, lineHeight: 18, color: ageOk ? P.ink60 : P.post, paddingHorizontal: 22, paddingTop: 10 }}>
              {ageOk ? "Only the year is ever shown, and only to you." : "You have to be 18 to write to strangers here."}
            </Text>
            <View style={{ height: 30 }} />
          </ScrollView>

          <View style={{ ...rule }} />
          <View style={{ paddingHorizontal: 22, paddingVertical: 12 }}>
            <Pressable
              onPress={() => nameReady && ageOk && setStep("hatch")}
              disabled={!nameReady || !ageOk}
              style={{ ...solidBtn, opacity: nameReady && ageOk ? 1 : 0.25 }}
            >
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 2, color: "#fff" }}>THAT'S ME</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  /* ── she hatches out of your line ───────────────────────────────────── */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      <View style={{ paddingHorizontal: 22, paddingTop: 10, flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 2, color: P.ink40 }}>KINDREDLY</Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 1.4, color: P.ink40 }}>
          {hatchPhase === "crack" ? "···" : "HATCHED"}
        </Text>
      </View>
      <View style={{ marginTop: 10, ...ruleSoft }} />

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 26 }}>
        {hatchPhase === "crack" ? (
          <Animated.View style={wobble}>
            <EggShell variant={eggVar} size={168} />
          </Animated.View>
        ) : (
          <Animated.View style={flyStyle}>
            <Animated.View entering={FadeIn.duration(420)} style={{ alignItems: "center" }}>
              <WrenBird size={150} mood={noteMood} />
              {/* she leaves carrying it — tucked under one side and tilted, so
                  it reads as held rather than as a plinth she's standing on */}
              <View style={{ position: "absolute", bottom: -4, right: 6, transform: [{ rotate: "-14deg" }] }}>
                <CarriedLetter />
              </View>
            </Animated.View>
          </Animated.View>
        )}

        {hatchPhase !== "fly" && (
          <Animated.View
            key={`ht${hatchPhase}`}
            entering={FadeInDown.delay(hatchPhase === "read" ? 320 : 120).duration(500)}
            style={{ alignItems: "center", marginTop: 30 }}
          >
            {hatchPhase === "crack" ? (
              <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 2, color: P.ink40 }}>SOMETHING'S HAPPENING</Text>
            ) : (
              <>
                <Text style={{ fontFamily: PF.letter, fontSize: 27, lineHeight: 33, color: P.ink, textAlign: "center", letterSpacing: -0.5 }}>
                  She hatched out of{"\n"}what you wrote.
                </Text>
                <View style={{ ...panel, paddingHorizontal: 12, paddingVertical: 5, marginTop: 14 }}>
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.6, color: P.pen }}>{noteType.name.toUpperCase()}</Text>
                </View>
                <Text style={{ fontFamily: PF.serifItalic, fontSize: 16, color: P.ink, marginTop: 18, textAlign: "center", lineHeight: 24 }}>
                  “{hatchLine(noteMood)}”
                </Text>
                <Text style={{ fontFamily: PF.mono, fontSize: 11.5, color: P.ink60, marginTop: 12, textAlign: "center", lineHeight: 19, maxWidth: 290 }}>
                  {noteType.line}
                </Text>
              </>
            )}
          </Animated.View>
        )}
      </View>

      {hatchPhase === "read" && (
        <>
          <View style={{ ...rule }} />
          <View style={{ paddingHorizontal: 22, paddingVertical: 12 }}>
            <Pressable onPress={() => setHatchPhase("fly")} style={solidBtn}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 2, color: "#fff" }}>LET HER GO</Text>
            </Pressable>
          </View>
        </>
      )}
      {hatchPhase === "fly" && (
        <Animated.Text
          entering={FadeIn.duration(300)}
          style={{
            position: "absolute",
            bottom: 80,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: PF.mono,
            fontSize: 11,
            letterSpacing: 1.6,
            color: P.ink40,
          }}
        >
          OFF TO FIND SOMEONE WHO WRITES LIKE YOU
        </Animated.Text>
      )}
    </SafeAreaView>
  );
}

/* ── little pieces ───────────────────────────────────────────────────── */

/* Every setup screen wears the same header: where you are, out of how many,
   and one way back. Two steps is short enough to be worth counting. */
function StepHead({ n, total, label, onBack }: { n: string; total: string; label: string; onBack: () => void }) {
  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 22, paddingTop: 10, paddingBottom: 12 }}>
        <Pressable onPress={onBack} hitSlop={12} style={{ marginRight: 14 }}>
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path d="M15 4 L7 12 L15 20" stroke={P.ink} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 2, color: P.ink }}>{label}</Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 1.4, color: P.ink40 }}>
          {n}/{total}
        </Text>
      </View>
      <View style={{ ...rule }} />
    </>
  );
}

/* the line she carries off — a sealed sheet, drawn on the same grid as the
   tab bar's glyphs so the first envelope you ever see is the system's one */
function CarriedLetter() {
  return (
    <Svg width={44} height={44} viewBox="0 0 24 24">
      <Rect x={4} y={7} width={16} height={11} fill={P.paper} stroke={P.ink} strokeWidth={1.7} />
      <Path d="M4 7l8 6 8-6" stroke={P.ink} strokeWidth={1.4} fill="none" strokeLinejoin="round" />
      <Line x1={7} y1={15.4} x2={13} y2={15.4} stroke={P.pen} strokeWidth={1.7} />
    </Svg>
  );
}
