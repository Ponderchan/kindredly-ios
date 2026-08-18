import { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { C, F, navyBtn } from "../theme/tokens";
import { P, PF, channelInk, channelWash } from "../theme/post";
import { StampTile } from "../components/StampTile";
import { WrenBird, type WrenMood } from "../components/WrenBird";
import { Seal } from "../components/Seal";
import { useBreathe } from "../components/anim";
import Animated, { ZoomIn } from "react-native-reanimated";
import { STAMP_CATEGORIES, STAMPS, STARTER_STAMPS, getStamp, stampsByCat } from "../data/stamps";
import { screen } from "../lib/wren";
import { bumpLetters } from "../lib/api";
import { publishLetter, publishVoiceLetter } from "../lib/db";
import { deleteDraft, getDraft, saveDraft } from "../lib/drafts";
import { setFlag } from "../lib/flags";
import { useEntitlement } from "../lib/entitlement";
import { Recorder } from "../components/Recorder";
import { AudioCard } from "../components/AudioCard";
import { openingLadder, readMood, wrenLine } from "../lib/wren-read";
import { COUNTER_FROM, LETTER_MAX, weightedCount } from "../lib/weighted-count";

const LANG = "en";
const LAV = P.paper; // the same surface every room uses
type Step = "pick" | "write" | "sending";
type Mode = "write" | "speak";

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

  const stamp = getStamp(sel);
  // a cold opening earns its way to a stranger: at least a real line (weighted),
  // and never longer than a genuine short letter. Voice is exempt — the audio
  // is the content, the caption's optional.
  const weight = weightedCount(text);
  const over = weight - LETTER_MAX;
  const ladder = openingLadder(weight);
  const canSend = mode === "speak" ? !!recUri : ladder.ready && over <= 0;
  // Wren's face reads your feeling; her line reads how much you've given.
  const wrenMood: WrenMood = mode === "speak" ? (recUri ? "happy" : "curious") : readMood(text, ladder.ready);

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
      <SafeAreaView style={{ flex: 1, backgroundColor: P.paper, alignItems: "center", justifyContent: "center", padding: 30 }}>
        <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 2, color: P.ink40, position: "absolute", top: "16%" }}>
          KINDREDLY
        </Text>
        <Animated.View style={breathe}>
          <Seal size={92} />
        </Animated.View>
        <Text style={{ fontFamily: PF.letter, fontSize: 25, fontWeight: "600", color: P.ink, textAlign: "center", marginTop: 28, lineHeight: 34 }}>
          {isMorning ? "Straight to them." : "On its way."}
        </Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 1.2, color: P.ink40, marginTop: 16, textAlign: "center" }}>
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
            backgroundColor: "transparent",
            borderWidth: 2,
            borderColor: on ? P.pen : "transparent",
            paddingTop: 16,
            paddingBottom: 10,
            paddingHorizontal: 8,
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <StampTile id={id} w={46} r={7} />
          <Text numberOfLines={1} style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 0.3, color: channelInk(st?.color), textAlign: "center" }}>
            {st?.name.en.toUpperCase()}
          </Text>
        </Pressable>
      );
    };

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
        <View style={{ paddingHorizontal: 22, paddingTop: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Pressable onPress={() => setStep("write")} hitSlop={10} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 22, color: P.ink }}>‹</Text>
          </Pressable>
          <View style={{ paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: P.ink }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.4, color: P.ink }}>STAMPS</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 22, paddingTop: 24, paddingBottom: 16 }}>
          <Text style={{ fontFamily: PF.letter, fontSize: 30, fontWeight: "600", color: P.ink }}>Pick a stamp.</Text>
          <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 0.6, color: P.ink40, marginTop: 10 }}>
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
                <Text style={{ textAlign: "center", fontFamily: PF.monoMed, fontSize: 11.5, letterSpacing: 1, color: P.pen }}>
                  See all {STAMPS.length} →
                </Text>
              </Pressable>
              <Text style={{ textAlign: "center", fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.6, color: P.ink40 }}>
                Six to start. The rest are here when you want them.
              </Text>
            </>
          ) : (
            STAMP_CATEGORIES.map((cat) => (
              <View key={cat.id} style={{ marginBottom: 22 }}>
                <View style={{ paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.6, color: P.ink }}>{cat.name.en.toUpperCase()}</Text>
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
            <Text style={{ color: "#fff", fontFamily: PF.monoSemi, fontSize: 13, letterSpacing: 1.2 }}>USE THIS ONE →</Text>
          </Pressable>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  /* ── write — the sticker zine: lavender desk, everything slightly pasted-on ── */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: LAV }}>
      {/* desk header — close, the address sticker, the stamp */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, flexDirection: "row", alignItems: "center" }}>
        <Pressable
          onPress={goBack}
          hitSlop={10}
          style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontFamily: PF.mono, fontSize: 17, color: P.ink }}>✕</Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <View style={{ paddingHorizontal: 4, paddingVertical: 6 }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1.6, color: P.ink }}>TO A STRANGER</Text>
          </View>
        </View>
        <Pressable onPress={() => setStep("pick")} hitSlop={8} style={{ transform: [{ rotate: "8deg" }] }}>
          <View style={{ padding: 3 }}>
            <StampTile id={sel || STARTER_STAMPS[0]} w={44} r={5} />
          </View>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 14, paddingTop: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* the letter card — pasted a hair off-straight */}
          <View
            style={{
              backgroundColor: P.paper,
              padding: 20,
              minHeight: 380,
              transform: [{ rotate: "-0.6deg" }],
              shadowColor: "#2A2153",
              shadowOpacity: 0.16,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
            }}
          >
            {/* Wren reads you live */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Animated.View key={wrenMood} entering={ZoomIn.duration(340)} style={[breathe, { width: 46, height: 46, alignItems: "center", justifyContent: "center" }]}>
                <WrenBird size={38} mood={wrenMood} />
              </Animated.View>
              <Text style={{ flex: 1, fontFamily: PF.serifItalic, fontSize: 14, color: P.ink60, lineHeight: 20 }}>
                “{mode === "speak" ? wrenLine(wrenMood) : ladder.line}”
              </Text>
            </View>
            <View style={{ borderBottomWidth: 1.5, borderStyle: "dashed", borderColor: "#D8D2F2", marginTop: 14, marginBottom: 6 }} />

            {mode === "write" ? (
              <TextInput
                autoFocus
                value={text}
                onChangeText={setText}
                placeholder="ok so here's the thing…"
                placeholderTextColor="#B9B3D8"
                multiline
                style={{ minHeight: 250, color: P.ink, fontFamily: PF.letter, fontSize: 20, lineHeight: 33, textAlignVertical: "top", paddingTop: 10 }}
              />
            ) : (
              <View style={{ paddingTop: 12, minHeight: 250 }}>
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
                <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.6, color: P.ink40, marginTop: 14, lineHeight: 17 }}>
                  Up to three minutes. Your voice travels as it is — Wren doesn't listen in.
                </Text>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="a line to go with it… (optional)"
                  placeholderTextColor="#B9B3D8"
                  style={{ color: P.ink, fontFamily: PF.letter, fontSize: 17, marginTop: 14 }}
                />
              </View>
            )}

            {/* one stamp — this letter's channel (exactly one, required) */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
              <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: P.ink40 }}>YOUR STAMP</Text>
              {stamp && (
                <View style={{ backgroundColor: channelWash(stamp.color), borderWidth: 1, borderColor: stamp.color, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 12 }}>{stamp.emoji}</Text>
                  <Text style={{ fontFamily: PF.monoMed, fontSize: 12, color: channelInk(stamp.color) }}>#{stamp.name.en.toLowerCase()}</Text>
                </View>
              )}
              <Pressable onPress={() => setStep("pick")} hitSlop={6} style={{ paddingHorizontal: 6, paddingVertical: 7 }}>
                <Text style={{ fontFamily: PF.mono, fontSize: 11.5, letterSpacing: 0.8, color: P.pen }}>CHANGE ›</Text>
              </Pressable>
            </View>
          </View>

          {/* quick feelings — one tap drops it into the letter */}
          {mode === "write" && (
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 16 }}>
              {["🥹", "😤", "🫥", "✨", "🫶", "💀"].map((e, i) => (
                <Pressable
                  key={e}
                  onPress={() => setText((t) => t + e)}
                  hitSlop={4}
                  style={{ width: 40, height: 40, borderWidth: 1, borderColor: P.ink12, alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ fontSize: 19 }}>{e}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {capMsg && (
            <View style={{ marginTop: 16, padding: 16, borderWidth: 1, borderColor: P.ink }}>
              <Text style={{ fontFamily: PF.letter, fontSize: 15, fontWeight: "600", color: P.ink }}>{capMsg}</Text>
              <Text style={{ fontFamily: PF.letter, fontSize: 13, color: P.ink60, marginTop: 5 }}>
                Replies are always free. Lift the daily cap with Kindredly+.
              </Text>
              <Pressable onPress={() => router.push("/paywall")} style={{ marginTop: 10 }}>
                <Text style={{ fontFamily: PF.monoMed, fontSize: 11.5, letterSpacing: 1, color: P.pen }}>DISCOVER KINDREDLY+ →</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        {/* count — only surfaces near the ceiling, so no one writes to a number */}
        {mode === "write" && weight >= COUNTER_FROM && (
          <View style={{ paddingHorizontal: 24, alignItems: "flex-end", marginBottom: -2 }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 0.4, color: over > 0 ? P.post : over > -40 ? "#946738" : P.ink40 }}>
              {over > 0 ? `${over} over` : `${-over} left`}
            </Text>
          </View>
        )}

        {/* Aa / mic / yeet */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 24 }}>
          {(
            [
              ["write", "Aa"],
              ["speak", "🎙"],
            ] as [Mode, string][]
          ).map(([m, icon]) => {
            const on = mode === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={{
                  width: 48,
                  height: 48,
                  backgroundColor: on ? P.ink : "transparent",
                  borderWidth: 1,
                  borderColor: P.ink,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontFamily: PF.mono, fontSize: 16, color: on ? P.paper : P.ink }}>{icon}</Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={send}
            disabled={!canSend || busy}
            style={{
              flex: 1,
              backgroundColor: canSend && !busy ? P.pen : "transparent",
              borderWidth: 1,
              borderColor: canSend && !busy ? P.pen : P.ink12,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 13, letterSpacing: 1.4, color: canSend && !busy ? "#fff" : P.ink40 }}>
              {busy ? "SENDING…" : "YEET IT INTO THE WORLD"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
