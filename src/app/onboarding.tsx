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
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import * as AppleAuthentication from "expo-apple-authentication";
import { C, F } from "../theme/tokens";
import { GhostButton, PrimaryButton, TopBar } from "../components/ui";
import { Wheel } from "../components/Wheel";
import { useBreathe } from "../components/anim";
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
import { STARTER_STAMPS } from "../data/stamps";
import { MoodIcon } from "../components/MoodIcon";
import { MOODS, MOOD_IDS, type MoodId } from "../data/moods";

/* Onboarding — one welcome screen (a swipeable recap of what the app does, with
   sign-in right there), then setup: ③ pen name ④ cakeday ⑤ face ⑥ your egg
   ⑦ write your first line ⑧ that writing hatches her — she reads you, then
   flies off into the app carrying your first letter. The hatch is earned by
   writing, exactly like the product (egg→hatchling). */

type Step = "welcome" | "username" | "cakeday" | "avatar" | "egg" | "write" | "hatch";

const WIN_W = Dimensions.get("window").width;
const CARD_W = WIN_W - 72;
const CARD_H = Math.min(CARD_W, 340);

// the recap cards — a letter's whole life, swipeable
const CARDS: { pill: string; h: string; h2: string; s: string }[] = [
  { pill: "✍️  Write it down", h: "Write down", h2: "what's real.", s: "Tired, glad, or just true — a line is enough." },
  { pill: "🕊  Off it goes", h: "It flies to", h2: "your kind of person.", s: "Matched by how you write — not who you are." },
  { pill: "💜  They write back", h: "And slowly,", h2: "you're not strangers.", s: "Letter by letter, someone gets to know you." },
];

export default function Onboarding() {
  const router = useRouter();
  const auth = useAuth();
  const { session, onboarded, appleAvailable } = auth;

  const [step, setStep] = useState<Step>("welcome");
  const [card, setCard] = useState(0);
  const cardRef = useRef<ScrollView>(null);
  const [username, setUsername] = useState("");
  const nowY = new Date().getFullYear();
  const [dob, setDob] = useState({ m: 5, d: 15, y: nowY - 22 });
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [eggVar, setEggVar] = useState(0);
  const [note, setNote] = useState("");
  const [mood, setMood] = useState<MoodId | null>(null);
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

  // signed in but not set up → jump into setup
  useEffect(() => {
    if (session && !onboarded && step === "welcome") setStep("username");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, onboarded]);

  // recap cards auto-advance (loops gently; swipe overrides)
  useEffect(() => {
    if (step !== "welcome") return;
    const t = setTimeout(() => {
      const next = (card + 1) % CARDS.length;
      cardRef.current?.scrollTo({ x: next * WIN_W, animated: true });
      setCard(next);
    }, 3000);
    return () => clearTimeout(t);
  }, [step, card]);

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
  const noteMood: WrenMood = readMood(note.trim());
  const noteType = wrenTypeFor(note); // what hatches is decided by how you write

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
      try {
        await publishLetter(STARTER_STAMPS[0], l, "en"); // her first act: carry it off
      } catch {
        /* best-effort — never block getting in */
      }
    }
    try {
      await bumpStageFloor("hatch");
      await saveWrenType(noteType.id); // born from your hand
      await setWrenAccessory(noteType.accessory); // she wears her trait
    } catch {
      /* best-effort */
    }
    await auth.saveProfile({ handle: username.trim(), dob: dobStr, avatarId, firstLine: l || undefined });
    router.replace("/(tabs)/letters");
  };

  return (
    <>
      {/* ── ① welcome: recap carousel + sign in ── */}
      {step === "welcome" && (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <View style={{ height: CARD_H + 20 }}>
              <ScrollView
                ref={cardRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => setCard(Math.round(e.nativeEvent.contentOffset.x / WIN_W))}
              >
                {CARDS.map((c, i) => (
                  <View key={i} style={{ width: WIN_W, alignItems: "center" }}>
                    <View style={{ width: CARD_W, height: CARD_H, borderRadius: 32, backgroundColor: C.purpleLt, alignItems: "center", justifyContent: "center" }}>
                      <RecapMotif i={i} />
                      <View style={{ position: "absolute", bottom: -16, backgroundColor: "#fff", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10, shadowColor: "#131A26", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}>
                        <Text style={{ fontFamily: F.sansBold, fontSize: 13.5, color: C.ink }}>{c.pill}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 24 }}>
              {CARDS.map((_, i) => (
                <View key={i} style={{ width: i === card ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === card ? C.purple : C.line }} />
              ))}
            </View>

            <View style={{ paddingHorizontal: 30, marginTop: 18, alignItems: "center" }}>
              <Text style={{ fontFamily: F.serifSemi, fontSize: 31, color: C.ink, textAlign: "center", lineHeight: 38 }}>
                {CARDS[card].h} <Text style={{ color: C.purple }}>{CARDS[card].h2}</Text>
              </Text>
              <Text style={{ fontFamily: F.sans, fontSize: 14.5, color: C.muted, marginTop: 12, textAlign: "center", lineHeight: 22, maxWidth: 320 }}>{CARDS[card].s}</Text>
            </View>
          </View>

          <View style={{ paddingHorizontal: 24, paddingBottom: 10 }}>
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
              style={{ marginTop: 10 }}
              icon={<Text style={{ fontFamily: F.sansBold, fontSize: 17, color: C.ink }}>G</Text>}
            />
            <Pressable onPress={doEmail} style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }} hitSlop={10}>
              <Text style={{ fontFamily: F.sansBold, fontSize: 12, letterSpacing: 1.2, color: C.muted }}>CONTINUE WITH EMAIL</Text>
            </Pressable>
            {emailSent ? (
              <Animated.Text entering={FadeIn} style={{ textAlign: "center", fontFamily: F.serifItalic, fontSize: 13, color: C.purple }}>
                Tap the link in your email.
              </Animated.Text>
            ) : (
              <Pressable onPress={() => setStep("username")} style={{ alignItems: "center", paddingTop: 4 }} hitSlop={12}>
                <Text style={{ fontFamily: F.sans, fontSize: 12.5, color: C.faint }}>Explore first, sign in later →</Text>
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      )}

      {/* ── ③ pen name ── */}
      {step === "username" && (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
          <TopBar pct={20} onBack={() => (session ? auth.signOut() : setStep("welcome"))} />
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={{ flex: 1, paddingHorizontal: 26, paddingTop: 26 }}>
              <Text style={{ fontFamily: F.serif, fontSize: 30, color: C.ink, lineHeight: 40 }}>Pick a</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 30, color: C.purple, lineHeight: 42 }}>pen name.</Text>
              <TextInput
                autoFocus
                value={username}
                onChangeText={setUsername}
                placeholder="Anything…"
                placeholderTextColor={C.faint}
                style={{ marginTop: 30, fontFamily: F.serif, fontSize: 27, color: C.ink, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: nameReady ? C.purple : C.line }}
              />
              <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.faint, marginTop: 12, lineHeight: 19 }}>
                Not your real name — change it anytime. Strangers never see it; you are how you write.
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
          <TopBar pct={40} onBack={() => setStep("username")} />
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
            <PurpleButton label="Next" disabled={!ageOk} onPress={() => setStep("avatar")} />
          </View>
        </SafeAreaView>
      )}

      {/* ── ⑤ pick a face ── */}
      {step === "avatar" && (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
          <TopBar pct={58} onBack={() => setStep("cakeday")} />
          <View style={{ paddingHorizontal: 26, paddingTop: 20 }}>
            <Text style={{ fontFamily: F.serif, fontSize: 30, color: C.ink }}>Pick a</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 30, color: C.purple }}>face.</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.faint, marginTop: 10, lineHeight: 19 }}>
              Just a look — strangers never see it. Change it anytime.
            </Text>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 14 }}>
              {AVATARS.map((a) => {
                const on = avatarId === a.id;
                return (
                  <Pressable key={a.id} onPress={() => setAvatarId(on ? null : a.id)} style={{ width: "18%", alignItems: "center" }}>
                    <View style={{ borderRadius: 16, borderWidth: 2.5, borderColor: on ? C.purple : "transparent", padding: 2 }}>
                      <AvatarImage id={a.id} seed={a.id} size={56} round={false} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <View style={{ paddingHorizontal: 26, paddingBottom: 24 }}>
            <PurpleButton label={avatarId ? "Next" : "Skip for now"} onPress={() => setStep("egg")} />
          </View>
        </SafeAreaView>
      )}

      {/* ── ⑥ pick your egg ── */}
      {step === "egg" && (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
          <TopBar pct={70} onBack={() => setStep("avatar")} />
          <View style={{ paddingHorizontal: 26, paddingTop: 24 }}>
            <Text style={{ fontFamily: F.serif, fontSize: 30, color: C.ink }}>Pick your</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 30, color: C.purple }}>egg.</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, color: C.muted, marginTop: 10, lineHeight: 20 }}>
              The shell is yours to choose. Who's inside is decided by what you write.
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Animated.View key={eggVar} entering={FadeIn.duration(300)} style={breathe}>
              <EggShell variant={eggVar} size={168} />
            </Animated.View>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 14, paddingBottom: 8 }}>
            {EGG_SHELLS.map((s, i) => (
              <Pressable key={s.id} onPress={() => setEggVar(i)} style={{ alignItems: "center" }}>
                <View style={{ borderRadius: 18, borderWidth: 2.5, borderColor: eggVar === i ? C.purple : "transparent", padding: 2 }}>
                  <EggShell variant={i} size={54} />
                </View>
                <Text style={{ fontFamily: F.sans, fontSize: 10.5, color: eggVar === i ? C.purple : C.faint, marginTop: 2 }}>{s.name}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ paddingHorizontal: 26, paddingBottom: 24, paddingTop: 8 }}>
            <PurpleButton label="This one's mine" onPress={() => setStep("write")} />
          </View>
        </SafeAreaView>
      )}

      {/* ── ⑦ write your first line ── */}
      {step === "write" && (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
          <TopBar pct={88} onBack={() => setStep("egg")} />
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={{ flex: 1, paddingHorizontal: 26, paddingTop: 16 }}>
              <View style={{ alignItems: "center", marginBottom: 10 }}>
                <EggShell variant={eggVar} size={78} />
                <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.faint, marginTop: 2 }}>write, and she hatches</Text>
              </View>
              <Text style={{ fontFamily: F.serif, fontSize: 26, color: C.ink, lineHeight: 34 }}>What's on your mind right now?</Text>
              <TextInput
                autoFocus
                value={note}
                onChangeText={setNote}
                placeholder="A line is enough…"
                placeholderTextColor={C.faint}
                multiline
                style={{ marginTop: 16, minHeight: 110, fontFamily: F.letter, fontSize: 20, lineHeight: 32, color: "#22222A", textAlignVertical: "top" }}
              />
              <View style={{ marginTop: 6 }}>
                <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1.4, color: C.faint, marginBottom: 8 }}>
                  HOW IT FEELS {mood ? `· ${MOODS[mood].n.toUpperCase()}` : "(OPTIONAL)"}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 20 }} keyboardShouldPersistTaps="handled">
                  {MOOD_IDS.map((id) => {
                    const on = mood === id;
                    return (
                      <Pressable key={id} onPress={() => setMood(on ? null : id)} style={{ alignItems: "center", width: 56 }}>
                        <View style={{ borderRadius: 24, borderWidth: 2, borderColor: on ? MOODS[id].col : "transparent", padding: 2 }}>
                          <MoodIcon id={id} size={40} />
                        </View>
                        <Text style={{ fontFamily: on ? F.sansBold : F.sans, fontSize: 10, color: on ? C.ink : C.faint, marginTop: 3 }}>
                          {MOODS[id].n}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
            <View style={{ paddingHorizontal: 26, paddingBottom: 22 }}>
              <PurpleButton label="Hatch her" disabled={!canWrite} onPress={() => canWrite && setStep("hatch")} />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      )}

      {/* ── ⑧ the hatch — your writing brings her out, she reads you, flies into the app ── */}
      {step === "hatch" && (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.night }}>
          <Sky />
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
            {hatchPhase === "crack" ? (
              <Animated.View key="crack" style={wobble}>
                <EggShell variant={eggVar} size={150} />
              </Animated.View>
            ) : hatchPhase === "read" ? (
              <Animated.View key="read" entering={ZoomIn.springify().damping(8).mass(0.7)} style={{ alignItems: "center" }}>
                <WrenBird size={150} stage="hatch" mood={noteMood} accessory={noteType.accessory} />
              </Animated.View>
            ) : (
              <Animated.View key="fly" style={flyStyle}>
                <WrenBird size={140} pose="fly" />
              </Animated.View>
            )}

            {hatchPhase !== "fly" && (
              <Animated.View key={`ht${hatchPhase}`} entering={FadeInDown.delay(hatchPhase === "read" ? 320 : 120).duration(500)} style={{ alignItems: "center", marginTop: 26 }}>
                {hatchPhase === "crack" ? (
                  <Text style={{ fontFamily: F.serifItalic, fontSize: 16, color: "#9C97AB" }}>…something's happening…</Text>
                ) : (
                  <>
                    <Text style={{ fontFamily: F.serif, fontSize: 26, color: "#F1EFF7", textAlign: "center" }}>
                      She hatched — <Text style={{ color: "#9B9BF9" }}>{noteType.name}</Text>.
                    </Text>
                    <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: "#B9B4C9", marginTop: 10, textAlign: "center", lineHeight: 22, maxWidth: 300 }}>
                      “{hatchLine(noteMood)}”
                    </Text>
                    <Text style={{ fontFamily: F.sans, fontSize: 13, color: "#8E89A0", marginTop: 12, textAlign: "center", lineHeight: 20, maxWidth: 300 }}>
                      {noteType.line}
                    </Text>
                  </>
                )}
              </Animated.View>
            )}
          </View>
          {hatchPhase === "read" && (
            <View style={{ paddingHorizontal: 26, paddingBottom: 24 }}>
              <PurpleButton label="Let's go →" onPress={() => setHatchPhase("fly")} />
            </View>
          )}
          {hatchPhase === "fly" && (
            <Animated.Text entering={FadeIn.duration(300)} style={{ position: "absolute", bottom: 90, left: 0, right: 0, textAlign: "center", fontFamily: F.serifItalic, fontSize: 15, color: "#B9B4C9" }}>
              Off to find someone who writes like you…
            </Animated.Text>
          )}
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

/* recap motif — a letter's life (write → fly → answered) */
function RecapMotif({ i }: { i: number }) {
  const s = Math.round(CARD_H * 0.62);
  return (
    <Svg width={s} height={s} viewBox="0 0 168 168">
      {i === 1 ? (
        <G>
          <Path d="M20 150 Q54 132 92 96" fill="none" stroke={C.gold} strokeWidth={2.5} strokeDasharray="2 7" strokeLinecap="round" opacity={0.7} />
          <G transform="translate(96 70) rotate(-14)">
            <Rect x={-40} y={-28} width={80} height={56} rx={9} fill="#FFFFFF" />
            <Path d="M-40 -22 L0 8 L40 -22" fill="none" stroke="#B9B9E8" strokeWidth={4} />
          </G>
        </G>
      ) : (
        <G>
          <Rect x={44} y={54} width={80} height={60} rx={9} fill="#FFFFFF" />
          <Path d="M44 60 L84 92 L124 60" fill="none" stroke="#B9B9E8" strokeWidth={4} />
          {i === 0 ? (
            <G>
              <Path d="M104 40 l20 -20 l12 12 l-20 20 z" fill={C.gold} />
              <Path d="M102 42 l6 6 l-8 3 z" fill="#3A2E1A" />
            </G>
          ) : (
            <Path d="M84 30 c-7 -12 -26 -9 -26 5 c0 12 16 21 26 28 c10 -7 26 -16 26 -28 c0 -14 -19 -17 -26 -5 z" fill="#7C7CE0" />
          )}
        </G>
      )}
    </Svg>
  );
}
