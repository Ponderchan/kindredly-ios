import { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { C, F, cardStyle, navyBtn } from "../theme/tokens";
import { StampTile } from "../components/StampTile";
import { WrenBird, type WrenMood } from "../components/WrenBird";
import { Seal } from "../components/Seal";
import { useBreathe } from "../components/anim";
import Animated, { FadeIn } from "react-native-reanimated";
import { STAMP_CATEGORIES, STAMPS, STARTER_STAMPS, getStamp, stampsByCat } from "../data/stamps";
import { WREN_OPENERS } from "../data/content";
import { screen } from "../lib/wren";
import { bumpLetters } from "../lib/api";
import { publishLetter, publishVoiceLetter } from "../lib/db";
import { deleteDraft, getDraft, saveDraft } from "../lib/drafts";
import { setFlag } from "../lib/flags";
import { useEntitlement } from "../lib/entitlement";
import { Recorder } from "../components/Recorder";
import { AudioCard } from "../components/AudioCard";

const LANG = "en";
type Step = "pick" | "write" | "sending";
type Mode = "write" | "speak";

/* Wren reads you as you write. Heavy words are checked first — if in doubt,
   she'd rather be tender than celebrate the wrong thing. Not a classifier,
   just a companion catching the drift. */
const HEAVY =
  /(tired|exhausted|drained|sad|down|cry|crying|tears|alone|lonely|lost|empty|numb|anxious|anxiety|scared|afraid|worried|hurt|hurts|hurting|hate|angry|broke|broken|breakup|miss|missing|grief|grieving|depress|overwhelm|stress|can'?t|hopeless|worthless|ashamed|guilt|sick|pain|dying|die|scream|drowning)/i;
const LIGHT =
  /(happy|glad|excited|love|loved|grateful|thankful|great|proud|amazing|wonderful|relieved|relief|joy|celebrat|yay|finally|hopeful|better|smil|laugh|best day)/i;

function composeMood(text: string, canSend: boolean): WrenMood {
  const t = text.trim();
  if (!t) return "listen"; // she's here, waiting
  if (HEAVY.test(t)) return "worry"; // tender
  if (LIGHT.test(t)) return "delight";
  return canSend ? "happy" : "listen"; // enough written → she's got it
}

function wrenSays(m: WrenMood): string {
  switch (m) {
    case "worry":
      return "I hear you. Take your time.";
    case "delight":
      return "Oh — I love this.";
    case "happy":
      return "Got it. Send whenever you're ready.";
    case "curious":
      return "Go on — I'm all ears.";
    case "listen":
    default:
      return "I'm right here, listening.";
  }
}

export default function Compose() {
  const router = useRouter();
  const params = useLocalSearchParams<{ morning?: string; stamp?: string; draft?: string }>();
  const isMorning = params.morning === "1";
  const { premium } = useEntitlement();

  // open straight to writing — text first, any length. The stamp is a light,
  // optional accent (default one assigned; tap it to change), not a gate.
  const [step, setStep] = useState<Step>("write");
  const [draftId, setDraftId] = useState<string | null>(params.draft ?? null);
  const [mode, setMode] = useState<Mode>("write");
  const [showAll, setShowAll] = useState(false);
  const [sel, setSel] = useState<string | null>(params.stamp ?? (params.draft ? null : STARTER_STAMPS[0]));
  const [text, setText] = useState("");
  const [ask, setAsk] = useState("");
  const [pIdx, setPIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [capMsg, setCapMsg] = useState<string | null>(null);
  const [recUri, setRecUri] = useState<string | null>(null);
  const [recDur, setRecDur] = useState(0);
  const breathe = useBreathe(6, 2600);

  // back that survives cold deep-link starts (no history → land on Letters)
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/letters");
  };

  // sending → auto-dismiss
  useEffect(() => {
    if (step !== "sending") return;
    const t = setTimeout(goBack, 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // resume a draft
  useEffect(() => {
    if (!params.draft) return;
    getDraft(params.draft).then((d) => {
      if (!d) return;
      setSel(d.stamp);
      setText(d.body);
      setAsk(d.ask);
      setStep("write");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.draft]);

  // silent autosave on leave — "they never send themselves"
  const snap = useRef({ sel, text, ask, mode, sent: false, draftId });
  useEffect(() => {
    snap.current = { ...snap.current, sel, text, ask, mode, draftId, sent: step === "sending" };
  }, [sel, text, ask, mode, step, draftId]);
  useEffect(
    () => () => {
      const s = snap.current;
      if (s.sent) return; // sent → draft already deleted
      if (s.mode !== "write" || !s.sel) return; // voice recordings don't survive as drafts
      if (s.text.trim().length >= 3) {
        saveDraft({ id: s.draftId, stamp: s.sel, body: s.text, ask: s.ask });
      }
    },
    [],
  );

  const openers = WREN_OPENERS.letter[LANG];
  const stamp = getStamp(sel);
  // a line is enough — count characters, not whitespace words (Chinese has none)
  const canSend = mode === "speak" ? !!recUri : text.trim().length >= 2;
  // Wren's face follows your writing (speak mode: waiting vs. captured)
  const wrenMood: WrenMood = mode === "speak" ? (recUri ? "happy" : "curious") : composeMood(text, canSend);
  const to = isMorning ? "THE PERSON WHO WROTE THAT" : "THREE PEOPLE WHO WRITE LIKE YOU";
  const toLabel = "TO";

  const send = async () => {
    if (!canSend || busy || !sel) return;
    setBusy(true);
    setCapMsg(null);

    // text letters pass Wren's gate; audio can't be read — report/block covers it
    if (mode === "write") {
      const body = ask.trim() ? `${text.trim()}\n\n${ask.trim()}` : text.trim();
      const gate = await screen(body);
      if (!gate.ok) {
        setBusy(false);
        Alert.alert("Wren held this back", "This can't go out as written. Keep it to strangers — no contact details.");
        return;
      }
    }

    const bump = await bumpLetters();
    if (!bump.ok) {
      setBusy(false);
      if (bump.reason === "daily_cap") {
        setCapMsg(`That's your ${bump.cap ?? 3} letters for today.`);
      } else if (bump.reason === "unauthorized") {
        Alert.alert("Sign in", "Please sign in again to send.");
      } else {
        Alert.alert("Couldn't send", "Something went wrong. Try again in a moment.");
      }
      return;
    }

    let ok: true | null = null;
    if (mode === "speak" && recUri) {
      ok = await publishVoiceLetter(sel, recUri, recDur, text.trim(), LANG);
    } else {
      const body = ask.trim() ? `${text.trim()}\n\n${ask.trim()}` : text.trim();
      ok = await publishLetter(sel, body, LANG);
    }
    setBusy(false);
    if (!ok) {
      Alert.alert(
        "Couldn't send",
        mode === "speak"
          ? "The voice letter didn't go out. (Voice needs the storage bucket from migration 0007 — see SETUP.md.)"
          : "The letter didn't go out. Try again.",
      );
      return;
    }
    if (mode === "speak") setFlag("voiceSent"); // growth stamp: Your Voice
    if (draftId) {
      deleteDraft(draftId);
      setDraftId(null);
    }
    setStep("sending");
  };

  /* ── sending ── */
  if (step === "sending") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.creamHi, alignItems: "center", justifyContent: "center", padding: 30 }}>
        <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 3, color: C.faint, position: "absolute", top: "16%" }}>
          KINDREDLY
        </Text>
        <Animated.View style={breathe}>
          <Seal size={92} />
        </Animated.View>
        <Text style={{ fontFamily: F.serif, fontSize: 26, color: C.ink, textAlign: "center", marginTop: 28, lineHeight: 34 }}>
          {isMorning ? "Straight to them." : "On its way."}
        </Text>
        <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1.8, color: C.faint, marginTop: 16, textAlign: "center" }}>
          {isMorning ? "IT LANDS WITH THEM" : "THE FIRST TO ANSWER IS YOURS"}
        </Text>
      </SafeAreaView>
    );
  }

  /* ── pick ── */
  if (step === "pick") {
    const StampCell = ({ id }: { id: string }) => {
      const st = getStamp(id);
      const on = sel === id;
      return (
        <Pressable
          onPress={() => setSel(id)}
          style={{
            width: "31%",
            backgroundColor: on ? "#fff" : "rgba(255,255,255,0.65)",
            borderWidth: 2,
            borderColor: on ? C.purple : "transparent",
            borderRadius: 16,
            paddingTop: 16,
            paddingBottom: 10,
            paddingHorizontal: 8,
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <StampTile id={id} w={46} r={7} />
          <Text numberOfLines={1} style={{ fontFamily: F.sansExtra, fontSize: 9.5, letterSpacing: 0.5, color: st?.color, textAlign: "center" }}>
            {st?.name.en.toUpperCase()}
          </Text>
        </Pressable>
      );
    };

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
        <View style={{ paddingHorizontal: 22, paddingTop: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Pressable onPress={() => setStep("write")} hitSlop={10} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 20, color: C.ink }}>‹</Text>
          </Pressable>
          <View style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, backgroundColor: C.purpleLt }}>
            <Text style={{ fontFamily: F.sansExtra, fontSize: 10.5, letterSpacing: 1.2, color: C.purple }}>STAMPS</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 22, paddingTop: 24, paddingBottom: 16 }}>
          <Text style={{ fontFamily: F.serifMed, fontSize: 32, color: C.ink, letterSpacing: -0.5 }}>Pick a</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 32, color: C.purple, letterSpacing: -0.5 }}>stamp.</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, color: C.muted, marginTop: 10 }}>
            A stamp guides your letter to the right people — or skip it.
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          {!showAll ? (
            <>
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                {STARTER_STAMPS.map((id) => (
                  <StampCell key={id} id={id} />
                ))}
              </View>
              <Pressable onPress={() => setShowAll(true)} style={{ paddingVertical: 18 }}>
                <Text style={{ textAlign: "center", fontFamily: F.sansBold, fontSize: 12, letterSpacing: 1.2, color: C.purple }}>
                  See all {STAMPS.length} →
                </Text>
              </Pressable>
              <Text style={{ textAlign: "center", fontFamily: F.serifItalic, fontSize: 11.5, color: C.faint }}>
                Six to start. The rest are here when you want them.
              </Text>
            </>
          ) : (
            STAMP_CATEGORIES.map((cat) => (
              <View key={cat.id} style={{ marginBottom: 22 }}>
                <View style={{ paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
                  <Text style={{ fontFamily: F.sansExtra, fontSize: 11.5, letterSpacing: 2, color: C.ink }}>{cat.name.en.toUpperCase()}</Text>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 16 }}>
                  {stampsByCat(cat.id).map((s) => (
                    <StampCell key={s.id} id={s.id} />
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <LinearGradient colors={["transparent", C.cream]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 22, paddingTop: 28, paddingBottom: 30 }}>
          <Pressable
            onPress={() => sel && setStep("write")}
            style={[navyBtn, { paddingVertical: 18, width: "100%", opacity: sel ? 1 : 0.3 }]}
          >
            <Text style={{ color: "#fff", fontFamily: F.sansExtra, fontSize: 14, letterSpacing: 1 }}>Use this one →</Text>
          </Pressable>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  /* ── write ── */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={{ paddingHorizontal: 22, paddingTop: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Pressable
          onPress={goBack}
          hitSlop={10}
          style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.card, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontSize: 18, color: C.ink }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: F.sansBold, fontSize: 11, letterSpacing: 2, color: C.faint }}>Draft</Text>
        <View style={{ width: 42 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={[cardStyle, { borderRadius: 20, padding: 24, minHeight: 380, marginTop: 8 }]}>
            {stamp && (
              <Pressable
                onPress={() => setStep("pick")}
                hitSlop={8}
                style={{ position: "absolute", top: 18, right: 18, alignItems: "center", gap: 3 }}
              >
                <View style={{ transform: [{ rotate: "6deg" }], padding: 4, backgroundColor: "#fff", borderRadius: 4, shadowColor: "#131A26", shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
                  <StampTile id={sel!} w={44} r={4} />
                </View>
                <Text style={{ fontFamily: F.sans, fontSize: 9, color: C.faint }}>change stamp</Text>
              </Pressable>
            )}

            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16, paddingRight: 52 }}>
              <Animated.View key={wrenMood} entering={FadeIn.duration(360)} style={breathe}>
                <WrenBird size={56} mood={wrenMood} />
              </Animated.View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.sansExtra, fontSize: 10.5, letterSpacing: 1.6, color: C.purple }}>WREN</Text>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 15.5, color: C.muted, lineHeight: 22, marginTop: 3 }}>
                  {wrenSays(wrenMood)}
                </Text>
              </View>
            </View>
            <Pressable onPress={() => setPIdx((p) => (p + 1) % openers.length)} style={{ marginBottom: 20 }}>
              <Text style={{ fontFamily: F.sans, fontSize: 12, color: C.faint, lineHeight: 18 }}>
                Need a nudge?{"  "}
                <Text style={{ fontFamily: F.serifItalic, color: C.muted }}>“{openers[pIdx]}”</Text>
              </Text>
            </Pressable>

            <View style={{ flexDirection: "row", gap: 10, alignItems: "baseline", marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.lineSoft }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: 11, letterSpacing: 1.4, color: C.label }}>{toLabel}</Text>
              <Text style={{ fontFamily: F.sansExtra, fontSize: 12, letterSpacing: 0.5, color: C.ink, flex: 1 }}>{to}</Text>
            </View>

            {/* Write it / Speak it */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 18 }}>
              {(
                [
                  ["write", "✍️", "Write"],
                  ["speak", "🎙", "Speak"],
                ] as [Mode, string, string][]
              ).map(([m, icon, label]) => {
                const on = mode === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setMode(m)}
                    style={{
                      flex: 1,
                      paddingVertical: 11,
                      borderRadius: 14,
                      alignItems: "center",
                      backgroundColor: on ? C.purpleLt : C.card,
                      borderWidth: 1,
                      borderColor: on ? C.purple : C.line,
                    }}
                  >
                    <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, color: on ? C.purple : C.muted }}>
                      {icon}  {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {mode === "write" ? (
              <>
                <TextInput
                  autoFocus
                  value={text}
                  onChangeText={setText}
                  placeholder="What's on your mind? A line is enough."
                  placeholderTextColor={C.faint}
                  multiline
                  style={{ minHeight: 180, color: "#22222A", fontFamily: F.letter, fontSize: 19, lineHeight: 31, textAlignVertical: "top" }}
                />

                <View style={{ marginTop: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.lineSoft }}>
                  <Text style={{ fontFamily: F.sans, fontSize: 12.5, color: C.faint, marginBottom: 6 }}>What do you want to hear back? (optional)</Text>
                  <TextInput
                    value={ask}
                    onChangeText={setAsk}
                    placeholder="Like — one small good thing lately?"
                    placeholderTextColor={C.faint}
                    style={{ color: C.ink, fontFamily: F.sans, fontSize: 15 }}
                  />
                </View>
              </>
            ) : (
              <>
                <Recorder
                  doneUri={recUri}
                  doneDur={recDur}
                  onDone={(uri, s) => {
                    setRecUri(uri);
                    setRecDur(s);
                  }}
                  onClear={() => {
                    setRecUri(null);
                    setRecDur(0);
                  }}
                />
                {recUri && (
                  <View style={{ marginTop: 12 }}>
                    <AudioCard url={recUri} durationS={recDur} compact />
                  </View>
                )}
                <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.faint, marginTop: 14, lineHeight: 19 }}>
                  Up to three minutes. Your voice travels as it is — Wren doesn't listen in.
                </Text>
                <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.lineSoft }}>
                  <Text style={{ fontFamily: F.sans, fontSize: 12.5, color: C.faint, marginBottom: 6 }}>
                    A line to go with it (optional):
                  </Text>
                  <TextInput
                    value={text}
                    onChangeText={setText}
                    placeholder="What's this letter about?"
                    placeholderTextColor={C.faint}
                    style={{ color: C.ink, fontFamily: F.sans, fontSize: 15 }}
                  />
                </View>
              </>
            )}
          </View>

          {capMsg && (
            <View style={{ marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: C.purpleLt }}>
              <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.ink }}>{capMsg}</Text>
              <Text style={{ fontFamily: F.sans, fontSize: 12.5, color: C.muted, marginTop: 4 }}>
                Replies are always free. Lift the daily cap with Kindredly+.
              </Text>
              <Pressable onPress={() => router.push("/paywall")} style={{ marginTop: 10 }}>
                <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, letterSpacing: 0.5, color: C.purple }}>Discover Kindredly+ →</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        <View style={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: 26 }}>
          <Pressable onPress={send} disabled={!canSend || busy} style={[navyBtn, { paddingVertical: 19, width: "100%", opacity: canSend && !busy ? 1 : 0.3 }]}>
            <Text style={{ color: "#fff", fontFamily: F.sansExtra, fontSize: 14, letterSpacing: 1 }}>
              {busy ? "Sending…" : "Send"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
