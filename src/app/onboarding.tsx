import { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import { C, F } from "../theme/tokens";
import { EnvelopeArt } from "../components/EnvelopeArt";
import { Wheel } from "../components/Wheel";
import { Dots, GhostButton, PrimaryButton, TopBar } from "../components/ui";
import { useBreathe } from "../components/anim";
import {
  ActCrossing,
  ActFirstLetter,
  ActKnock,
  ActPick,
  ActRead,
  ActSort,
  ActWrite,
  DeskReveal,
} from "../components/story";
import { BEATS, FIRST_LETTER, MONTHS } from "../data/content";
import { useAuth } from "../lib/auth";
import { upsertFingerprint } from "../lib/db";
import { signatureVector, voiceSignature } from "../lib/signature";
import { today } from "../lib/format";

type Step =
  | "auth"
  | "name"
  | "birthday"
  | "knock"
  | "read0"
  | "read1"
  | "read2"
  | "pick"
  | "write"
  | "sort"
  | "crossing"
  | "first"
  | "desk";

/* Onboarding — all hooks hoisted; each step is inline JSX (not a nested
   component) so React reconciles it in place and the name TextInput keeps
   focus while typing. The full animated story acts land in the next pass. */
export default function Onboarding() {
  const router = useRouter();
  const auth = useAuth();
  const { session, onboarded, appleAvailable, profile } = auth;

  const [step, setStep] = useState<Step>("auth");
  const [name, setName] = useState("");
  const [pronoun, setPronoun] = useState<"she" | "he" | "they">("they");
  const nowY = new Date().getFullYear();
  const [dob, setDob] = useState({ m: 5, d: 15, y: nowY - 25 });
  const [busy, setBusy] = useState<null | "apple" | "google" | "email" | "save">(null);
  const [emailSent, setEmailSent] = useState(false);
  const [beat, setBeat] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [firstLine, setFirstLine] = useState("");
  const breathe = useBreathe(5, 4400);

  useEffect(() => {
    const t = setInterval(() => setBeat((x) => (x + 1) % BEATS.length), 3900);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // returning, already-onboarded user → straight into the app
    if (session && onboarded && step === "auth") router.replace("/(tabs)/letters");
  }, [session, onboarded, step, router]);

  useEffect(() => {
    if (session && !onboarded && step === "auth") {
      const pf = (profile?.full_name || profile?.name || "") as string;
      setName((n) => n || pf);
      setStep("name");
    }
  }, [session, onboarded, step, profile]);

  const doApple = async () => {
    setBusy("apple");
    const r = await auth.signInWithApple();
    setBusy(null);
    if ("error" in r) Alert.alert("Sign in with Apple", r.error);
  };
  const doGoogle = async () => {
    setBusy("google");
    const r = await auth.signInWithGoogle();
    setBusy(null);
    if ("error" in r) Alert.alert("Sign in with Google", r.error);
  };
  const doEmail = () => {
    Alert.prompt?.(
      "Your email",
      "Wren will send you a quiet magic link.",
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

  const dobStr = `${dob.y}-${String(dob.m + 1).padStart(2, "0")}-${String(dob.d).padStart(2, "0")}`;

  // story end: seed the writing fingerprint, save the profile, reveal the desk
  const finishStory = async (line: string | null) => {
    const l = (line ?? firstLine).trim();
    if (l.length >= 4) {
      try {
        await upsertFingerprint(signatureVector(l), voiceSignature(l).words);
      } catch {
        /* fingerprint is best-effort */
      }
    }
    await auth.saveProfile({ handle: name.trim(), pronoun, dob: dobStr, firstLine: l || undefined });
    setStep("desk");
  };

  // birthday derived
  const years = Array.from({ length: 80 }, (_, i) => nowY - 13 - i);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const yi = Math.max(0, years.indexOf(dob.y));
  let age = nowY - dob.y;
  const nd = new Date();
  if (nd.getMonth() < dob.m || (nd.getMonth() === dob.m && nd.getDate() < dob.d)) age -= 1;
  const ageOk = age >= 18;
  const B = BEATS[beat];
  const nameReady = name.trim().length > 0;

  return (
    <>
      {step === "auth" && (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
          <View style={{ paddingTop: 10, alignItems: "center" }}>
            <Text style={{ fontFamily: F.serif, fontSize: 21, color: C.ink }}>Kindredly</Text>
          </View>

          <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 26 }}>
            <View style={{ height: 220, alignItems: "center", justifyContent: "center" }}>
              <Animated.View style={breathe}>
                <EnvelopeArt w={210} />
              </Animated.View>
            </View>

            <Animated.View key={beat} entering={FadeInDown.duration(520)} style={{ alignItems: "center", marginTop: 8 }}>
              <Text style={{ fontFamily: F.serif, fontSize: 28, color: C.ink, letterSpacing: -0.5, textAlign: "center", lineHeight: 35 }}>
                {B.h1}
              </Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 28, color: C.purple, letterSpacing: -0.5, textAlign: "center", lineHeight: 36 }}>
                {B.h2}
              </Text>
              <Text style={{ fontFamily: F.sans, fontSize: 14, color: C.muted, lineHeight: 22, marginTop: 16, textAlign: "center", maxWidth: 320 }}>
                {B.sub}
              </Text>
            </Animated.View>

            <View style={{ marginTop: 26 }}>
              <Dots i={beat} n={BEATS.length} onPick={setBeat} />
            </View>
          </View>

          <View style={{ paddingHorizontal: 24, paddingBottom: 12 }}>
            {appleAvailable ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={28}
                style={{ width: "100%", height: 54 }}
                onPress={doApple}
              />
            ) : (
              <PrimaryButton label="CONTINUE WITH APPLE" onPress={doApple} loading={busy === "apple"} />
            )}

            <GhostButton
              label="Continue with Google"
              onPress={doGoogle}
              style={{ marginTop: 11 }}
              icon={<Text style={{ fontFamily: F.sansBold, fontSize: 17, color: C.ink }}>G</Text>}
            />

            <Pressable onPress={doEmail} style={{ alignItems: "center", paddingTop: 16, paddingBottom: 8 }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, letterSpacing: 1.5, color: C.muted }}>
                USE YOUR EMAIL ADDRESS
              </Text>
            </Pressable>

            {emailSent ? (
              <Animated.Text entering={FadeIn} style={{ textAlign: "center", fontFamily: F.serifItalic, fontSize: 13, color: C.purple }}>
                Check your email for the link.
              </Animated.Text>
            ) : (
              <Text style={{ textAlign: "center", fontFamily: F.sans, fontSize: 11, color: C.faint, lineHeight: 17 }}>
                By continuing, you agree to our Quiet Terms & Privacy Parchment.
              </Text>
            )}
          </View>
        </SafeAreaView>
      )}

      {step === "name" && (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
          <TopBar pct={30} onBack={() => auth.signOut()} />
          <View style={{ flex: 1, paddingHorizontal: 26, paddingTop: 30 }}>
            <Text style={{ fontFamily: F.serif, fontSize: 31, color: C.ink, letterSpacing: -0.5, lineHeight: 38 }}>
              What shall we
            </Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 31, color: C.purple, letterSpacing: -0.5, lineHeight: 40 }}>
              call you?
            </Text>

            <View style={{ marginTop: 34 }}>
              <TextInput
                autoFocus
                value={name}
                onChangeText={setName}
                placeholder="Your name…"
                placeholderTextColor={C.faint}
                style={{
                  fontFamily: F.serif,
                  fontSize: 30,
                  color: C.ink,
                  paddingBottom: 12,
                  borderBottomWidth: 1.5,
                  borderBottomColor: nameReady ? C.purple : C.line,
                }}
              />
              <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.faint, marginTop: 12, lineHeight: 19 }}>
                Strangers never see this. Only someone you've written five letters with — and you can change it
                any time before then.
              </Text>
            </View>

            <View style={{ marginTop: 38 }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1.6, color: C.label, marginBottom: 12 }}>
                AND HOW SHOULD WREN REFER TO YOU?
              </Text>
              <View style={{ flexDirection: "row", gap: 9 }}>
                {(["she", "he", "they"] as const).map((p) => {
                  const on = pronoun === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => setPronoun(p)}
                      style={{
                        flex: 1,
                        paddingVertical: 14,
                        alignItems: "center",
                        borderRadius: 24,
                        borderWidth: 1.5,
                        borderColor: on ? C.purple : C.line,
                        backgroundColor: on ? C.purpleLt : "transparent",
                      }}
                    >
                      <Text style={{ fontFamily: F.sansBold, fontSize: 13, letterSpacing: 1.1, color: on ? C.purple : C.muted }}>
                        {p.toUpperCase()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
            <PrimaryButton label="NEXT" disabled={!nameReady} onPress={() => setStep("birthday")} />
          </View>
        </SafeAreaView>
      )}

      {step === "birthday" && (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
          <TopBar pct={70} onBack={() => setStep("name")} />
          <View style={{ paddingHorizontal: 26, paddingTop: 30, alignItems: "center" }}>
            <Text style={{ fontFamily: F.serif, fontSize: 30, color: C.ink, letterSpacing: -0.5, textAlign: "center", lineHeight: 37 }}>
              {name ? `${name}, when's` : "When's"}
            </Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 30, color: C.purple, letterSpacing: -0.5 }}>your birthday?</Text>
            <Text style={{ fontFamily: F.sans, fontSize: 13.5, color: C.muted, marginTop: 14, textAlign: "center" }}>
              Wren keeps it. She'll write to you on the day.
            </Text>
          </View>

          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <View style={{ position: "relative", flexDirection: "row", gap: 6 }}>
              <View
                style={{
                  position: "absolute",
                  left: -8,
                  right: -8,
                  top: "50%",
                  marginTop: -22,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: C.card,
                }}
              />
              <Wheel width={78} items={MONTHS} value={dob.m} onChange={(m) => setDob({ ...dob, m })} />
              <Wheel width={62} items={days} value={dob.d - 1} onChange={(i) => setDob({ ...dob, d: i + 1 })} />
              <Wheel width={86} items={years} value={yi} onChange={(i) => setDob({ ...dob, y: years[i] })} />
            </View>
          </View>

          <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
            <Text
              style={{
                textAlign: "center",
                marginBottom: 16,
                fontFamily: F.sans,
                fontSize: 13.5,
                lineHeight: 21,
                color: ageOk ? C.muted : "#C0503A",
              }}
            >
              {ageOk
                ? `You're ${age}.`
                : "Kindredly is for people 18 and over. Letters here go to strangers, and we can't keep that safe for anyone younger."}
            </Text>
            <PrimaryButton label="NEXT" disabled={!ageOk} onPress={() => setStep("knock")} />
          </View>
        </SafeAreaView>
      )}

      {/* ── the story ── */}
      {step === "knock" && <ActKnock name={name} onNext={() => setStep("read0")} />}
      {step === "read0" && <ActRead idx={0} onNext={() => setStep("read1")} onSkip={() => setStep("sort")} />}
      {step === "read1" && <ActRead idx={1} onNext={() => setStep("read2")} onSkip={() => setStep("sort")} />}
      {step === "read2" && <ActRead idx={2} onNext={() => setStep("pick")} onSkip={() => setStep("sort")} />}
      {step === "pick" && (
        <ActPick picked={picked} setPicked={setPicked} onNext={() => setStep("write")} onSkip={() => setStep("sort")} />
      )}
      {step === "write" && (
        <ActWrite text={firstLine} setText={setFirstLine} onNext={() => setStep("sort")} onSkip={() => setStep("sort")} />
      )}
      {step === "sort" && <ActSort text={firstLine || "Hello."} onNext={() => setStep("crossing")} />}
      {step === "crossing" && <ActCrossing onNext={() => setStep("first")} />}
      {step === "first" && (
        <ActFirstLetter
          letter={{ body: FIRST_LETTER.body, ask: FIRST_LETTER.ask, alias: FIRST_LETTER.alias, date: today() }}
          onSend={(t) => finishStory(t)}
          onSkip={() => finishStory(null)}
        />
      )}
      {step === "desk" && <DeskReveal onDone={() => router.replace("/(tabs)/letters")} />}
    </>
  );
}
