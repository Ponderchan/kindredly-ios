import { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  SlideInDown,
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
import { MosaicId } from "../components/MosaicId";
import { MONTHS } from "../data/content";
import { firstLetter } from "../data/first-letter";
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
   GIVE BEFORE YOU ASK. The version before this one described the product —
   three numbered rows explaining that you write a line, it travels, someone
   answers — and then, on the second screen, handed a person who had received
   nothing a blank page and asked them to say something true. All of the cost
   was at the front and all of the payoff at the back, which is exactly the
   order in which nobody continues.

   So the app now opens ON A LETTER. Full bleed, no logo, no headline, no
   button — a stranger's page, the same shape Today will hand you every
   morning. You read it. Only then does anyone ask you for anything, and by
   then you've heard what this place sounds like, so the blank page has a
   register and an audience instead of being a void with a cursor.

     letter  what arrived, full bleed. Wren speaks for the first time.
     write   your own first letter — the letter above just taught you the genre.
     you     pen name, the 18+ gate, and the way back in. One screen.
     hatch   she hatches out of your line and carries it off.

   Three asks, and every one of them comes after something was given.

   An earlier attempt wrapped this in a metal box you had to unlock with two
   drag gestures. It was dropped: nothing else in this product opens, turns
   or unlatches, so the ritual was an invention of the onboarding rather than
   a first taste of the app — and an onboarding that teaches a gesture the
   app doesn't have has taught you nothing.

   HONESTY: the pool is `for select to authenticated`, so there is no real
   letter to show a signed-out person. The opening letter is written by us
   and the screen says so — see data/first-letter.ts. Wren then asks for the
   user's OWN first letter rather than a reply, because there is nobody at
   the other end of a sample to reply to.

   SIGN-IN MOVED TO THE END. It used to be the first thing on the first
   screen. Asking for an account from someone who has already written a
   letter they'd like to keep is a different question than asking a stranger
   at the door.

   WHAT THE OLD FLOW ASKED FOR AND THREW AWAY: the egg colour was picked and
   never saved (the shell is now derived from your line), and the mood row
   was picked and never read (her face comes from readMood off the text).
   The avatar is already editable in Me. The cakeday stayed — it is the 18+
   gate, which a stranger-messaging app does not get to skip.

   PUBLISHING: the first letter always trains the fingerprint, but only
   reaches the pool once it clears the same floor every other opening does.
   A two-character letter should not be someone's morning post. */

type Step = "letter" | "write" | "you" | "hatch";

export default function Onboarding() {
  const router = useRouter();
  const auth = useAuth();
  const { session, onboarded, appleAvailable } = auth;

  const [step, setStep] = useState<Step>("letter");
  const [wrenIn, setWrenIn] = useState(false); // she waits until you've read it
  const [note, setNote] = useState("");
  const [username, setUsername] = useState("");
  const nowY = new Date().getFullYear();
  const [dob, setDob] = useState({ m: 5, d: 15, y: nowY - 22 });
  const [hatchPhase, setHatchPhase] = useState<"crack" | "read" | "fly">("crack");
  const [busy, setBusy] = useState<null | "apple" | "google" | "email">(null);
  const [emailSent, setEmailSent] = useState(false);
  const finishing = useRef(false);

  // steady for this run, so the letter doesn't change under you on a re-render
  const sample = useRef(firstLetter(new Date().getDate() * 7 + new Date().getHours())).current;

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

  // she comes in a beat after the letter lands, not on top of it
  useEffect(() => {
    if (step !== "letter") return;
    setWrenIn(false);
    const t = setTimeout(() => setWrenIn(true), 1500);
    return () => clearTimeout(t);
  }, [step]);

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

  // birthday derived — the only reason it's asked is the 18 below
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
  const canPass = username.trim().length > 0 && ageOk;
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

  /* ── the app opens on a letter ──────────────────────────────────────── */
  if (step === "letter") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
        <Animated.View entering={FadeIn.duration(420)} style={{ flex: 1 }}>
          {/* Today's own docket, on purpose: a mosaic for whoever wrote it and
              a stamp pasted crooked. The first screen is already the screen
              you'll open every morning, so nothing here has to be unlearned.
              No date and no distance — those would be invented. */}
          <View style={{ paddingHorizontal: 22, paddingTop: 10, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
            <MosaicId seed={sample} cell={4.4} gap={1.5} />
            <View style={{ width: 30, height: 36, backgroundColor: P.pen, transform: [{ rotate: "-5deg" }] }} />
          </View>

          <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
            <Animated.Text
              entering={FadeInDown.delay(240).duration(680)}
              style={{ fontFamily: PF.letter, fontSize: 30, lineHeight: 41, color: P.ink, letterSpacing: -0.5 }}
            >
              {sample}
            </Animated.Text>
          </View>

          {/* the one claim this screen makes, and it's the true one */}
          <Animated.Text
            entering={FadeIn.delay(1000).duration(500)}
            style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 1.2, color: P.ink40, paddingHorizontal: 24, paddingBottom: 18 }}
          >
            WE WROTE THIS ONE. TOMORROW'S IS FROM SOMEONE REAL.
          </Animated.Text>

          {wrenIn && (
            <Animated.View entering={SlideInDown.duration(520)}>
              <View style={{ ...rule }} />
              <View style={{ flexDirection: "row", paddingHorizontal: 22, paddingTop: 16, paddingBottom: 4, alignItems: "flex-start" }}>
                <WrenBird size={44} mood="curious" />
                <Text style={{ flex: 1, fontFamily: PF.serifItalic, fontSize: 16.5, lineHeight: 25, color: P.ink, marginLeft: 12, marginTop: 2 }}>
                  That's what comes in. Yours goes the other way — write one and I'll find who it's for.
                </Text>
              </View>
              <View style={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 12 }}>
                <Pressable onPress={() => setStep("write")} style={solidBtn}>
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 2, color: "#fff" }}>WRITE MINE</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </SafeAreaView>
    );
  }

  /* ── your own first letter ──────────────────────────────────────────── */
  if (step === "write") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <StepHead n="01" total="02" label="YOUR FIRST LETTER" onBack={() => setStep("letter")} />

          {/* the sample stays in the room, quietly, so the page has a register */}
          <View style={{ flexDirection: "row", paddingHorizontal: 22, paddingTop: 12, paddingBottom: 12 }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 1.2, color: P.ink40, marginRight: 8 }}>YOU READ</Text>
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 0.4, color: P.ink40 }}>
              {sample}
            </Text>
          </View>
          <View style={{ marginHorizontal: 22, ...ruleSoft }} />

          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            <TextInput
              value={note}
              onChangeText={setNote}
              multiline
              autoFocus
              placeholder="something true, and short is fine…"
              placeholderTextColor={P.ink40}
              style={{
                fontFamily: PF.letter,
                fontSize: 21,
                lineHeight: 32,
                color: P.ink,
                paddingHorizontal: 22,
                paddingTop: 22,
                paddingBottom: 40,
                minHeight: 200,
              }}
            />
          </ScrollView>

          <View style={{ ...rule }} />
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 22, paddingVertical: 12 }}>
            <Text style={{ flex: 1, fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 0.8, color: P.ink40 }}>
              {weightedCount(line) >= OPENING_MIN ? "LONG ENOUGH TO TRAVEL" : "NOBODY READS IT UNTIL YOU'RE IN"}
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

  /* ── the box needs a name on it, and a way back in ──────────────────── */
  if (step === "you") {
    const signedIn = !!session;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <StepHead n="02" total="02" label="WHO'S WRITING" onBack={() => setStep("write")} />

          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={{ paddingHorizontal: 22, paddingTop: 20 }}>
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

            <View style={{ paddingHorizontal: 22, paddingTop: 26 }}>
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

            {/* the account, asked now that there's a letter worth keeping */}
            <View style={{ marginTop: 28, ...rule }} />
            <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.8, color: P.ink60 }}>SO IT COMES BACK TO YOU</Text>
              <Text style={{ fontFamily: PF.mono, fontSize: 11, lineHeight: 18, color: P.ink60, marginTop: 6 }}>
                Answers come back here. Without this, it's one letter from one phone.
              </Text>
            </View>

            <View style={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 24 }}>
              {signedIn ? (
                <View style={{ ...panel, padding: 14, alignItems: "center" }}>
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.6, color: P.pen }}>SIGNED IN</Text>
                </View>
              ) : emailSent ? (
                <View style={{ ...panel, padding: 16, alignItems: "center" }}>
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.6, color: P.pen }}>LINK SENT</Text>
                  <Text style={{ fontFamily: PF.mono, fontSize: 11.5, lineHeight: 18, color: P.ink60, marginTop: 6, textAlign: "center" }}>
                    Open it on this phone and you'll come straight back here.
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
                  <Pressable onPress={doEmail} disabled={!!busy} style={{ paddingVertical: 13, alignItems: "center" }}>
                    <Text style={{ fontFamily: PF.mono, fontSize: 11.5, letterSpacing: 1, color: P.ink60 }}>
                      {busy === "email" ? "…" : "EMAIL ME A LINK"}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </ScrollView>

          <View style={{ ...rule }} />
          <View style={{ paddingHorizontal: 22, paddingVertical: 12 }}>
            <Pressable onPress={() => canPass && setStep("hatch")} disabled={!canPass} style={{ ...solidBtn, opacity: canPass ? 1 : 0.25 }}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 2, color: "#fff" }}>
                {signedIn ? "SEND IT" : "LOOK AROUND FIRST"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  /* ── she hatches out of your letter ─────────────────────────────────── */
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

/* The two screens that actually ask for something wear the same header: where
   you are, out of how many, and one way back. The box and the letter carry no
   counter at all — nothing is being asked of you there, so a progress meter
   would only turn a gift into a form. */
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

/* the letter she carries off — a sealed sheet, drawn on the same grid as the
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
