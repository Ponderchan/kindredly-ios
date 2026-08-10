import { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import * as AppleAuthentication from "expo-apple-authentication";
import { C, F } from "../theme/tokens";
import { GhostButton, PrimaryButton } from "../components/ui";
import { useBreathe } from "../components/anim";
import { useAuth } from "../lib/auth";
import { upsertFingerprint } from "../lib/db";
import { signatureVector, voiceSignature } from "../lib/signature";

/* Onboarding, reimagined on note + Wren (no letters):
   meet Wren → write your first note (before login) → Wren catches you (我在)
   → she carries it across a little world to find someone who writes like you
   → she's your Wren, and she grows → sign in only to save.
   Value before signup; anonymous (no name, no face). */

type Step = "meet" | "write" | "caught" | "flight" | "yours" | "auth";

// mood swatches (tiny + cosmetic for now)
const SWATCHES = ["#CDE0EE", "#E4B15C", "#E7A3B4", "#7FC3A6"];

export default function Onboarding() {
  const router = useRouter();
  const auth = useAuth();
  const { session, onboarded, appleAvailable } = auth;

  const [step, setStep] = useState<Step>("meet");
  const [note, setNote] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [busy, setBusy] = useState<null | "apple" | "google" | "email">(null);
  const [emailSent, setEmailSent] = useState(false);
  const finishing = useRef(false);
  const breathe = useBreathe(5, 3800);

  const canWrite = note.trim().length >= 2;

  // returning, already-onboarded → straight in
  useEffect(() => {
    if (session && onboarded) router.replace("/(tabs)/letters");
  }, [session, onboarded, router]);

  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    const l = note.trim();
    if (l.length >= 2) {
      try {
        await upsertFingerprint(signatureVector(l), voiceSignature(l).words);
      } catch {
        /* fingerprint is best-effort */
      }
    }
    await auth.saveProfile({ firstLine: l || undefined }); // saveProfile sets onboarded: true
    router.replace("/(tabs)/letters");
  };

  // once signed in at the auth step, save + go
  useEffect(() => {
    if (session && !onboarded && step === "auth") finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, onboarded, step]);

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
      "你的邮箱",
      "Wren 会给你发一条安静的登录链接。",
      async (email?: string) => {
        if (!email || !email.trim()) return;
        setBusy("email");
        const r = await auth.signInWithEmail(email.trim());
        setBusy(null);
        if ("error" in r) Alert.alert("邮箱", r.error);
        else setEmailSent(true);
      },
      "plain-text",
      "",
      "email-address",
    );
  };

  const reflect =
    note.trim().length <= 12 ? "就这么一句,也够了。" : "谢谢你把它说出来 —— 憋着,最累了。";

  return (
    <>
      {/* ── 01 · meet Wren ── */}
      {step === "meet" && (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.night }}>
          <Sky />
          <Progress step={0} />
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 }}>
            <Animated.View entering={FadeIn.duration(600)} style={breathe}>
              <CuteWren size={132} tone="dark" />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(200).duration(600)} style={{ alignItems: "center", marginTop: 22 }}>
              <Text style={{ fontFamily: F.serif, fontSize: 27, color: "#F1EFF7", textAlign: "center", lineHeight: 37 }}>
                嗨,我是 Wren。{"\n"}你写什么,我都读。
              </Text>
              <Text style={{ fontFamily: F.sans, fontSize: 14, color: "#9C97AB", marginTop: 14, textAlign: "center" }}>
                我会找到写字像你的人。
              </Text>
            </Animated.View>
          </View>
          <View style={{ paddingHorizontal: 26, paddingBottom: 20 }}>
            <PurpleButton label="好呀" onPress={() => setStep("write")} />
          </View>
        </SafeAreaView>
      )}

      {/* ── 02 · write your first note ── */}
      {step === "write" && (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
          <Progress step={1} dark={false} />
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={{ flex: 1, paddingHorizontal: 26, paddingTop: 20 }}>
              <Text style={{ fontFamily: F.serif, fontSize: 27, color: C.ink, lineHeight: 36 }}>
                此刻,有什么{"\n"}压在心里?
              </Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, color: C.muted, marginTop: 10 }}>
                累、开心、还是就想写点什么 —— 一句话也行。
              </Text>

              <TextInput
                autoFocus
                value={note}
                onChangeText={setNote}
                placeholder="写下来…"
                placeholderTextColor={C.faint}
                multiline
                style={{ marginTop: 22, minHeight: 150, fontFamily: F.letter, fontSize: 20, lineHeight: 32, color: "#22222A", textAlignVertical: "top" }}
              />

              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 }}>
                <Text style={{ fontFamily: F.sans, fontSize: 12, color: C.faint }}>此刻的心情</Text>
                {SWATCHES.map((c, i) => (
                  <Pressable key={c} onPress={() => setMood(i)}>
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        backgroundColor: c,
                        borderWidth: 2.5,
                        borderColor: mood === i ? C.ink : "transparent",
                      }}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={{ paddingHorizontal: 26, paddingBottom: 22 }}>
              <PurpleButton label="写好了" disabled={!canWrite} onPress={() => setStep("caught")} />
              <Text style={{ fontFamily: F.sans, fontSize: 11, color: C.faint, textAlign: "center", marginTop: 12 }}>
                还没登录 · 只存在你这儿
              </Text>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      )}

      {/* ── 03 · Wren catches you ── */}
      {step === "caught" && (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.night }}>
          <Sky />
          <Progress step={2} />
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
            <Animated.View entering={FadeIn.duration(500)} style={breathe}>
              <CuteWren size={92} tone="dark" />
            </Animated.View>
            <Animated.View entering={FadeInUp.delay(250).duration(600)} style={{ alignItems: "center", marginTop: 20 }}>
              <View style={{ backgroundColor: C.purple, borderRadius: 20, borderBottomLeftRadius: 4, paddingHorizontal: 18, paddingVertical: 14, maxWidth: 300 }}>
                <Text style={{ fontFamily: F.serif, fontSize: 18, color: "#fff", lineHeight: 27 }}>我在。</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 15.5, color: "rgba(255,255,255,0.9)", lineHeight: 24, marginTop: 4 }}>
                  {reflect}
                </Text>
              </View>
              <Text style={{ fontFamily: F.sansBold, fontSize: 11.5, letterSpacing: 0.5, color: "#9B9BF9", marginTop: 20 }}>
                ✦ 我开始认识你写字的样子了
              </Text>
            </Animated.View>
          </View>
          <View style={{ paddingHorizontal: 26, paddingBottom: 20 }}>
            <PurpleButton label="嗯" onPress={() => setStep("flight")} />
          </View>
        </SafeAreaView>
      )}

      {/* ── 04 · Wren carries it across a little world ── */}
      {step === "flight" && (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.night }}>
          <Sky />
          <Progress step={3} />
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
            <Animated.View entering={FadeIn.duration(600)}>
              <LittleWorld />
            </Animated.View>
            <Animated.Text
              entering={FadeInUp.delay(300).duration(600)}
              style={{ fontFamily: F.serif, fontSize: 19, color: "#F1EFF7", textAlign: "center", lineHeight: 29, marginTop: 24 }}
            >
              看 —— 我带着它,{"\n"}去找一个写字像你的人。
            </Animated.Text>
          </View>
          <View style={{ paddingHorizontal: 26, paddingBottom: 20 }}>
            <PurpleButton label="继续" onPress={() => setStep("yours")} />
          </View>
        </SafeAreaView>
      )}

      {/* ── 05 · your Wren, she grows ── */}
      {step === "yours" && (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
          <Progress step={4} dark={false} />
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
            <Animated.View entering={FadeIn.duration(600)} style={breathe}>
              <CuteWren size={120} tone="light" />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(200).duration(600)} style={{ alignItems: "center", marginTop: 20 }}>
              <Text style={{ fontFamily: F.serif, fontSize: 25, color: C.ink }}>她是你的 Wren。</Text>
              <Text style={{ fontFamily: F.sans, fontSize: 14, color: C.muted, marginTop: 12, textAlign: "center", lineHeight: 22, maxWidth: 290 }}>
                她的样子,随你写字慢慢变 —— 换羽、学歌,越来越像你。
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16, backgroundColor: C.purpleLt, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 }}>
                <Text style={{ fontSize: 13 }}>🎨</Text>
                <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, color: C.purple }}>也能自己装扮她</Text>
              </View>
            </Animated.View>
          </View>
          <View style={{ paddingHorizontal: 26, paddingBottom: 22 }}>
            <PurpleButton label="进去看看" onPress={() => (session ? finish() : setStep("auth"))} />
          </View>
        </SafeAreaView>
      )}

      {/* ── 06 · sign in (only to save) ── */}
      {step === "auth" && (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
          <Progress step={5} dark={false} />
          <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 30, alignItems: "center" }}>
            <CuteWren size={84} tone="light" />
            <Text style={{ fontFamily: F.serif, fontSize: 26, color: C.ink, textAlign: "center", lineHeight: 35, marginTop: 20 }}>
              想留住 Wren、{"\n"}也想听到回音?
            </Text>
            <Text style={{ fontFamily: F.sans, fontSize: 13.5, color: C.muted, marginTop: 12, textAlign: "center", lineHeight: 21, maxWidth: 300 }}>
              不用名字、不用照片 —— 你就是你写的字。
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
              <Text style={{ fontFamily: F.sansBold, fontSize: 12, letterSpacing: 1.2, color: C.muted }}>用邮箱登录</Text>
            </Pressable>
            {emailSent ? (
              <Animated.Text entering={FadeIn} style={{ textAlign: "center", fontFamily: F.serifItalic, fontSize: 13, color: C.purple }}>
                去邮箱点一下链接就好。
              </Animated.Text>
            ) : (
              <Text style={{ textAlign: "center", fontFamily: F.sans, fontSize: 10.5, color: C.faint, lineHeight: 16 }}>
                继续即表示你已满 18 岁,并同意我们的条款与隐私。
              </Text>
            )}
          </View>
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

function Progress({ step, dark = true }: { step: number; dark?: boolean }) {
  const on = dark ? "#9B9BF9" : C.purple;
  const off = dark ? "rgba(255,255,255,0.18)" : C.line;
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, paddingTop: 10 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={{ width: i === step ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === step ? on : off }} />
      ))}
    </View>
  );
}

function Sky() {
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 260 }}>
      <View style={{ position: "absolute", top: 40, left: "22%", width: 3, height: 3, borderRadius: 2, backgroundColor: "#CFCFFC", opacity: 0.5 }} />
      <View style={{ position: "absolute", top: 90, left: "72%", width: 2.5, height: 2.5, borderRadius: 2, backgroundColor: "#CFCFFC", opacity: 0.4 }} />
      <View style={{ position: "absolute", top: 150, left: "40%", width: 2, height: 2, borderRadius: 1, backgroundColor: "#CFCFFC", opacity: 0.35 }} />
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
