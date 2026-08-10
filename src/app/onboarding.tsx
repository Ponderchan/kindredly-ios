import { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import * as AppleAuthentication from "expo-apple-authentication";
import { C, F } from "../theme/tokens";
import { GhostButton, PrimaryButton, TopBar } from "../components/ui";
import { Wheel } from "../components/Wheel";
import { useBreathe } from "../components/anim";
import { MONTHS } from "../data/content";
import { useAuth } from "../lib/auth";
import { upsertFingerprint } from "../lib/db";
import { signatureVector, voiceSignature } from "../lib/signature";

/* Onboarding — a logical arc:
   ① Wren's story (a reception that shows the core features through Wren)
   ② sign in  ③ pen name  ④ cakeday (birthday + 18+ gate)
   ⑤ welcome  ⑥ what's on your mind now? (your first note) → the app.
   English-first; localization comes later. Anonymous, no letters. */

type Step = "story" | "auth" | "username" | "cakeday" | "welcome" | "write";

const SWATCHES = ["#CDE0EE", "#E4B15C", "#E7A3B4", "#7FC3A6"];

// the reception story — each beat introduces one core feature through Wren
const STORY: { art: "wren" | "caught" | "world" | "grow"; h: string; s: string }[] = [
  { art: "wren", h: "Hi, I'm Wren.", s: "I read what you write." },
  { art: "caught", h: "Say what's on your heart.", s: "I catch it first — you're never shouting into the void." },
  { art: "world", h: "Then I carry it off,", s: "to find someone who writes like you." },
  { art: "grow", h: "The more you write,", s: "the more I know you — and the more I'm yours." },
];

export default function Onboarding() {
  const router = useRouter();
  const auth = useAuth();
  const { session, onboarded, appleAvailable } = auth;

  const [step, setStep] = useState<Step>("story");
  const [beat, setBeat] = useState(0);
  const [username, setUsername] = useState("");
  const nowY = new Date().getFullYear();
  const [dob, setDob] = useState({ m: 5, d: 15, y: nowY - 22 });
  const [note, setNote] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [busy, setBusy] = useState<null | "apple" | "google" | "email">(null);
  const [emailSent, setEmailSent] = useState(false);
  const finishing = useRef(false);
  const breathe = useBreathe(5, 3800);

  // returning, already-onboarded → straight in
  useEffect(() => {
    if (session && onboarded) router.replace("/(tabs)/letters");
  }, [session, onboarded, router]);

  // signed in but not set up → jump past the story/auth into setup
  useEffect(() => {
    if (session && !onboarded && (step === "story" || step === "auth")) setStep("username");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, onboarded]);

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

  // birthday derived
  const years = Array.from({ length: 80 }, (_, i) => nowY - 13 - i);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const yi = Math.max(0, years.indexOf(dob.y));
  let age = nowY - dob.y;
  const nd = new Date();
  if (nd.getMonth() < dob.m || (nd.getMonth() === dob.m && nd.getDate() < dob.d)) age -= 1;
  const ageOk = age >= 18;
  const dobStr = `${dob.y}-${String(dob.m + 1).padStart(2, "0")}-${String(dob.d).padStart(2, "0")}`;
  const nameReady = username.trim().length > 0;
  const canWrite = note.trim().length >= 2;

  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    const l = note.trim();
    if (l.length >= 2) {
      try {
        await upsertFingerprint(signatureVector(l), voiceSignature(l).words);
      } catch {
        /* best-effort */
      }
    }
    await auth.saveProfile({ handle: username.trim(), dob: dobStr, firstLine: l || undefined });
    router.replace("/(tabs)/letters");
  };

  const S = STORY[beat];
  const lastBeat = beat === STORY.length - 1;

  return (
    <>
      {/* ── ① the reception story ── */}
      {step === "story" && (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.night }}>
          <Sky />
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, paddingTop: 12 }}>
            {STORY.map((_, i) => (
              <View key={i} style={{ width: i === beat ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === beat ? "#9B9BF9" : "rgba(255,255,255,0.18)" }} />
            ))}
          </View>

          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 }}>
            <Animated.View key={`art${beat}`} entering={FadeIn.duration(500)} style={S.art === "world" ? undefined : breathe}>
              {S.art === "world" ? (
                <LittleWorld />
              ) : (
                <View style={{ alignItems: "center" }}>
                  <CuteWren size={S.art === "grow" ? 128 : 116} tone="dark" />
                  {S.art === "caught" && (
                    <View style={{ backgroundColor: C.purple, borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 9, marginTop: 10 }}>
                      <Text style={{ fontFamily: F.serif, fontSize: 15, color: "#fff" }}>I hear you.</Text>
                    </View>
                  )}
                  {S.art === "grow" && (
                    <Text style={{ fontFamily: F.sansBold, fontSize: 12, color: "#9B9BF9", marginTop: 12 }}>✦ new feathers · new songs · more you</Text>
                  )}
                </View>
              )}
            </Animated.View>

            <Animated.View key={`txt${beat}`} entering={FadeInDown.delay(150).duration(500)} style={{ alignItems: "center", marginTop: 26 }}>
              <Text style={{ fontFamily: F.serif, fontSize: 27, color: "#F1EFF7", textAlign: "center", lineHeight: 35 }}>{S.h}</Text>
              <Text style={{ fontFamily: F.sans, fontSize: 14.5, color: "#9C97AB", marginTop: 12, textAlign: "center", lineHeight: 22, maxWidth: 300 }}>
                {S.s}
              </Text>
            </Animated.View>
          </View>

          <View style={{ paddingHorizontal: 26, paddingBottom: 20 }}>
            <PurpleButton
              label={lastBeat ? "Start" : "Next"}
              onPress={() => (lastBeat ? setStep(session ? "username" : "auth") : setBeat((b) => b + 1))}
            />
            {!lastBeat && (
              <Pressable onPress={() => setStep(session ? "username" : "auth")} style={{ alignItems: "center", paddingTop: 14 }}>
                <Text style={{ fontFamily: F.sansBold, fontSize: 12, letterSpacing: 1, color: "#6E6A7B" }}>Skip</Text>
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      )}

      {/* ── ② sign in ── */}
      {step === "auth" && (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
          <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 30, alignItems: "center" }}>
            <CuteWren size={88} tone="light" />
            <Text style={{ fontFamily: F.serif, fontSize: 27, color: C.ink, textAlign: "center", lineHeight: 36, marginTop: 20 }}>
              Keep Wren,{"\n"}and keep what you write.
            </Text>
            <Text style={{ fontFamily: F.sans, fontSize: 13.5, color: C.muted, marginTop: 12, textAlign: "center", lineHeight: 21, maxWidth: 320 }}>
              Signing in only saves you — and lets you hear back. No real name, no photo.
            </Text>
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
            <Pressable onPress={doEmail} style={{ alignItems: "center", paddingTop: 14, paddingBottom: 6 }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: 12, letterSpacing: 1.2, color: C.muted }}>SIGN IN WITH EMAIL</Text>
            </Pressable>
            {emailSent ? (
              <Animated.Text entering={FadeIn} style={{ textAlign: "center", fontFamily: F.serifItalic, fontSize: 13, color: C.purple }}>
                Tap the link in your email.
              </Animated.Text>
            ) : (
              <Text style={{ textAlign: "center", fontFamily: F.sans, fontSize: 10.5, color: C.faint, lineHeight: 16 }}>
                By continuing, you agree to our Terms & Privacy.
              </Text>
            )}
            {__DEV__ && (
              <Pressable onPress={() => setStep("username")} style={{ alignItems: "center", paddingTop: 10 }}>
                <Text style={{ fontFamily: F.sansBold, fontSize: 11, color: C.gold }}>(dev) preview setup →</Text>
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      )}

      {/* ── ③ pen name ── */}
      {step === "username" && (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
          <TopBar pct={33} onBack={() => auth.signOut()} />
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={{ flex: 1, paddingHorizontal: 26, paddingTop: 26 }}>
              <Text style={{ fontFamily: F.serif, fontSize: 30, color: C.ink, lineHeight: 40 }}>Pick a</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 30, color: C.purple, lineHeight: 42 }}>pen name.</Text>
              <TextInput
                autoFocus
                value={username}
                onChangeText={setUsername}
                placeholder="Anything — you can change it…"
                placeholderTextColor={C.faint}
                style={{ marginTop: 30, fontFamily: F.serif, fontSize: 27, color: C.ink, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: nameReady ? C.purple : C.line }}
              />
              <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.faint, marginTop: 12, lineHeight: 19 }}>
                Strangers never see it — only someone you've traded letters with. You are how you write.
              </Text>
            </View>
            <View style={{ paddingHorizontal: 26, paddingBottom: 24 }}>
              <PurpleButton label="Next" disabled={!nameReady} onPress={() => setStep("cakeday")} />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      )}

      {/* ── ④ cakeday ── */}
      {step === "cakeday" && (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
          <TopBar pct={58} onBack={() => setStep("username")} />
          <View style={{ paddingHorizontal: 26, paddingTop: 26, alignItems: "center" }}>
            <Text style={{ fontFamily: F.serif, fontSize: 28, color: C.ink, textAlign: "center" }}>
              {username ? `${username}, when's your` : "When's your"}
            </Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 28, color: C.purple }}>cakeday?</Text>
            <Text style={{ fontFamily: F.sans, fontSize: 13.5, color: C.muted, marginTop: 12, textAlign: "center" }}>
              🎂 Wren keeps it — she'll write to you on the day.
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <View style={{ position: "relative", flexDirection: "row", gap: 6 }}>
              <View style={{ position: "absolute", left: -8, right: -8, top: "50%", marginTop: -22, height: 44, borderRadius: 14, backgroundColor: C.card }} />
              <Wheel width={78} items={MONTHS} value={dob.m} onChange={(m) => setDob({ ...dob, m })} />
              <Wheel width={62} items={days} value={dob.d - 1} onChange={(i) => setDob({ ...dob, d: i + 1 })} />
              <Wheel width={86} items={years} value={yi} onChange={(i) => setDob({ ...dob, y: years[i] })} />
            </View>
          </View>
          <View style={{ paddingHorizontal: 26, paddingBottom: 24 }}>
            <Text style={{ textAlign: "center", marginBottom: 14, fontFamily: F.sans, fontSize: 13, lineHeight: 20, color: ageOk ? C.muted : "#C0503A" }}>
              {ageOk ? `You're ${age}.` : "Kindredly is for 18 and over — you'll meet strangers here, and we can't keep that safe for anyone younger."}
            </Text>
            <PurpleButton label="Next" disabled={!ageOk} onPress={() => setStep("welcome")} />
          </View>
        </SafeAreaView>
      )}

      {/* ── ⑤ welcome ── */}
      {step === "welcome" && (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
            <Animated.View entering={FadeIn.duration(600)} style={breathe}>
              <CuteWren size={120} tone="light" />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(200).duration(600)} style={{ alignItems: "center", marginTop: 20 }}>
              <Text style={{ fontFamily: F.serif, fontSize: 26, color: C.ink }}>{username ? `Welcome, ${username}.` : "Welcome."}</Text>
              <Text style={{ fontFamily: F.sans, fontSize: 14.5, color: C.muted, marginTop: 14, textAlign: "center", lineHeight: 24, maxWidth: 300 }}>
                Here, everything you write is a <Text style={{ color: C.purple, fontFamily: F.sansBold }}>letter</Text>.{"\n"}Write it down, and someone writes back.
              </Text>
            </Animated.View>
          </View>
          <View style={{ paddingHorizontal: 26, paddingBottom: 22 }}>
            <PurpleButton label="Write your first letter" onPress={() => setStep("write")} />
          </View>
        </SafeAreaView>
      )}

      {/* ── ⑥ what's on your mind now ── */}
      {step === "write" && (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
          <TopBar pct={92} onBack={() => setStep("welcome")} />
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={{ flex: 1, paddingHorizontal: 26, paddingTop: 20 }}>
              <Text style={{ fontFamily: F.serif, fontSize: 28, color: C.ink, lineHeight: 37 }}>
                What's on your{"\n"}mind right now?
              </Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, color: C.muted, marginTop: 10 }}>
                Tired, happy, or just something to say — a line is enough.
              </Text>
              <TextInput
                autoFocus
                value={note}
                onChangeText={setNote}
                placeholder="Write it…"
                placeholderTextColor={C.faint}
                multiline
                style={{ marginTop: 22, minHeight: 140, fontFamily: F.letter, fontSize: 20, lineHeight: 32, color: "#22222A", textAlignVertical: "top" }}
              />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 }}>
                <Text style={{ fontFamily: F.sans, fontSize: 12, color: C.faint }}>mood</Text>
                {SWATCHES.map((c, i) => (
                  <Pressable key={c} onPress={() => setMood(i)}>
                    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c, borderWidth: 2.5, borderColor: mood === i ? C.ink : "transparent" }} />
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={{ paddingHorizontal: 26, paddingBottom: 22 }}>
              <PurpleButton label="Done — take me in" disabled={!canWrite} onPress={finish} />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      )}
    </>
  );
}

/* ── little pieces ── */

function PurpleButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={() => !disabled && onPress()}
      disabled={disabled}
      style={{ backgroundColor: C.purple, borderRadius: 28, paddingVertical: 17, alignItems: "center", opacity: disabled ? 0.35 : 1 }}
    >
      <Text style={{ color: "#fff", fontFamily: F.sansExtra, fontSize: 15, letterSpacing: 0.5 }}>{label}</Text>
    </Pressable>
  );
}

function Sky() {
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 300 }}>
      <View style={{ position: "absolute", top: 50, left: "22%", width: 3, height: 3, borderRadius: 2, backgroundColor: "#CFCFFC", opacity: 0.5 }} />
      <View style={{ position: "absolute", top: 100, left: "72%", width: 2.5, height: 2.5, borderRadius: 2, backgroundColor: "#CFCFFC", opacity: 0.4 }} />
      <View style={{ position: "absolute", top: 160, left: "40%", width: 2, height: 2, borderRadius: 1, backgroundColor: "#CFCFFC", opacity: 0.35 }} />
    </View>
  );
}

function CuteWren({ size = 96, tone = "light" }: { size?: number; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  const body = dark ? "#20203A" : C.purpleLt;
  const stroke = dark ? "#9A9AFF" : C.purple;
  const belly = dark ? "#2B2B48" : "#FFFFFF";
  const beak = C.gold;
  const eye = dark ? "#EDEBF2" : C.ink;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Ellipse cx={46} cy={100} rx={24} ry={6} fill={stroke} opacity={0.14} />
      <Path d="M28 74 q-15 -2 -19 -17 q12 0 23 9 z" fill={stroke} opacity={0.85} />
      <Ellipse cx={58} cy={62} rx={32} ry={34} fill={body} stroke={stroke} strokeWidth={2.5} />
      <Ellipse cx={60} cy={70} rx={18} ry={22} fill={belly} />
      <Path d="M84 55 q12 10 2 28 q-9 -8 -9 -19 z" fill={stroke} opacity={0.9} />
      <Path d="M56 31 q3 -9 10 -8 q-1 7 -7 10" fill={beak} />
      <Path d="M37 56 l-12 4 l11 5 z" fill={beak} />
      <Circle cx={49} cy={54} r={3.2} fill={eye} />
      <Circle cx={50.2} cy={53} r={0.9} fill="#fff" />
      <Path d="M52 96 l0 9 M60 96 l0 9 M68 96 l0 9" stroke={beak} strokeWidth={2.3} strokeLinecap="round" />
    </Svg>
  );
}

function LittleWorld() {
  return (
    <Svg width={240} height={230} viewBox="0 0 240 230">
      <Ellipse cx={44} cy={196} rx={40} ry={15} fill="#2B2B48" />
      <Ellipse cx={186} cy={54} rx={44} ry={17} fill="#2B2B48" />
      <Ellipse cx={132} cy={140} rx={22} ry={9} fill="#232340" />
      <Path d="M44 188 q40 -100 138 -128" fill="none" stroke="#9A9AFF" strokeWidth={1.6} strokeDasharray="3 5" opacity={0.7} />
      <Circle cx={44} cy={188} r={5} fill={C.gold} />
      <Circle cx={182} cy={52} r={10} fill="#9A9AFF" opacity={0.28} />
      <Circle cx={182} cy={52} r={4.5} fill="#9A9AFF" />
      <G transform="translate(112 108) rotate(-10)">
        <Rect x={-7} y={5} width={15} height={11} rx={2} fill="#F1EFF7" />
        <Ellipse cx={0} cy={0} rx={11} ry={9} fill="#9A9AFF" />
        <Path d="M9 -3 l10 -2 l-7 8 z" fill={C.gold} />
        <Path d="M-9 -4 l-10 -5 l4 10 z" fill="#7C7CE0" />
        <Circle cx={4} cy={-2} r={1.8} fill="#161420" />
      </G>
    </Svg>
  );
}
