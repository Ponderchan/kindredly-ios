import { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { C, F, cardStyle, navyBtn } from "../theme/tokens";
import { StampTile } from "../components/StampTile";
import { Wren } from "../components/Wren";
import { Seal } from "../components/Seal";
import { useBreathe } from "../components/anim";
import Animated from "react-native-reanimated";
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

export default function Compose() {
  const router = useRouter();
  const params = useLocalSearchParams<{ morning?: string; stamp?: string; draft?: string }>();
  const isMorning = params.morning === "1";
  const { premium } = useEntitlement();

  const [step, setStep] = useState<Step>(params.stamp || params.draft ? "write" : "pick");
  const [draftId, setDraftId] = useState<string | null>(params.draft ?? null);
  const [mode, setMode] = useState<Mode>("write");
  const [showAll, setShowAll] = useState(false);
  const [sel, setSel] = useState<string | null>(params.stamp ?? null);
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
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const canSend = mode === "speak" ? !!recUri : wordCount >= 3;
  const to = isMorning ? "THE PERSON WHO SHARED THAT LINE" : "THREE PEOPLE WHO WRITE LIKE YOU";

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
        Alert.alert("Wren held this back", "This letter can't be sent as written. Keep it to strangers, not contact details.");
        return;
      }
    }

    const bump = await bumpLetters();
    if (!bump.ok) {
      setBusy(false);
      if (bump.reason === "daily_cap") {
        setCapMsg(`That's your ${bump.cap ?? 3} letters for today.`);
      } else if (bump.reason === "unauthorized") {
        Alert.alert("Sign in", "Please sign in again to send a letter.");
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
          ? "The voice letter didn't go out. (Voice letters need the storage bucket from migration 0007 — see SETUP.md.)"
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
          KINDREDLY POST OFFICE
        </Text>
        <Animated.View style={breathe}>
          <Seal size={92} />
        </Animated.View>
        <Text style={{ fontFamily: F.serif, fontSize: 26, color: C.ink, textAlign: "center", marginTop: 28, lineHeight: 34 }}>
          {isMorning ? "Sent straight\nto them." : "Sent down\nthree streets."}
        </Text>
        <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1.8, color: C.faint, marginTop: 16, textAlign: "center" }}>
          {isMorning ? "IT LANDS AT THEIR DOOR" : "THE FIRST PERSON TO ANSWER IS YOURS"}
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
          <Pressable onPress={goBack} hitSlop={10} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 20, color: C.ink }}>‹</Text>
          </Pressable>
          <View style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, backgroundColor: C.purpleLt }}>
            <Text style={{ fontFamily: F.sansExtra, fontSize: 10.5, letterSpacing: 1.2, color: C.purple }}>COLLECTOR'S EDITION</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 22, paddingTop: 24, paddingBottom: 16 }}>
          <Text style={{ fontFamily: F.serifMed, fontSize: 32, color: C.ink, letterSpacing: -0.5 }}>Choose your</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 32, color: C.purple, letterSpacing: -0.5 }}>envelope.</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, color: C.muted, marginTop: 10 }}>
            Each stamp guides your letter to the right people.
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
                  SHOW ALL {STAMPS.length} →
                </Text>
              </Pressable>
              <Text style={{ textAlign: "center", fontFamily: F.serifItalic, fontSize: 11.5, color: C.faint }}>
                Six to start with. The rest are there when you want them.
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
            <Text style={{ color: "#fff", fontFamily: F.sansExtra, fontSize: 14, letterSpacing: 1.6 }}>CONFIRM SELECTION →</Text>
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
          onPress={() => (params.stamp || params.draft ? goBack() : setStep("pick"))}
          hitSlop={10}
          style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.card, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontSize: 18, color: C.ink }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: F.sansBold, fontSize: 11, letterSpacing: 2, color: C.faint }}>DRAFT</Text>
        <View style={{ width: 42 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={[cardStyle, { borderRadius: 20, padding: 24, minHeight: 380, marginTop: 8 }]}>
            {stamp && (
              <View style={{ position: "absolute", top: 18, right: 18, transform: [{ rotate: "6deg" }], padding: 4, backgroundColor: "#fff", borderRadius: 4, shadowColor: "#131A26", shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
                <StampTile id={sel!} w={44} r={4} />
              </View>
            )}

            <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 12 }}>
              <Wren size={19} mode="line" />
              <Text style={{ fontFamily: F.sansExtra, fontSize: 10.5, letterSpacing: 1.6, color: C.purple }}>WREN SUGGESTS</Text>
            </View>
            <Pressable onPress={() => setPIdx((p) => (p + 1) % openers.length)} style={{ marginBottom: 22, paddingRight: 56 }}>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 18, color: C.muted, lineHeight: 27 }}>
                “{openers[pIdx]}”
              </Text>
            </Pressable>

            <View style={{ flexDirection: "row", gap: 10, alignItems: "baseline", marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.lineSoft }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: 11, letterSpacing: 1.4, color: C.label }}>TO:</Text>
              <Text style={{ fontFamily: F.sansExtra, fontSize: 12, letterSpacing: 1.1, color: C.ink, flex: 1 }}>{to}</Text>
            </View>

            {/* Write it / Speak it */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 18 }}>
              {(
                [
                  ["write", "✍️", "Write it"],
                  ["speak", "🎙", "Speak it"],
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
                  placeholder="Dear Kindred soul…"
                  placeholderTextColor={C.faint}
                  multiline
                  style={{ minHeight: 180, color: "#22222A", fontFamily: F.letter, fontSize: 19, lineHeight: 31, textAlignVertical: "top" }}
                />

                <View style={{ marginTop: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.lineSoft }}>
                  <Text style={{ fontFamily: F.sans, fontSize: 12.5, color: C.faint, marginBottom: 6 }}>Write me back:</Text>
                  <TextInput
                    value={ask}
                    onChangeText={setAsk}
                    placeholder="What do you want to hear about?"
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
                    placeholder="What is this letter about?"
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
                Replies are always free. Lift the cap on new letters with Kindredly+.
              </Text>
              <Pressable onPress={() => router.push("/paywall")} style={{ marginTop: 10 }}>
                <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, letterSpacing: 0.5, color: C.purple }}>Discover Kindredly+ →</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        <View style={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: 26 }}>
          <Pressable onPress={send} disabled={!canSend || busy} style={[navyBtn, { paddingVertical: 19, width: "100%", opacity: canSend && !busy ? 1 : 0.3 }]}>
            <Text style={{ color: "#fff", fontFamily: F.sansExtra, fontSize: 14, letterSpacing: 1.6 }}>
              {busy ? "SENDING…" : "SEAL AND SEND  ✈"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
