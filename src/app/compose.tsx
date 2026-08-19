import { useWrenName } from "../lib/wren-name";
import { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Path, Rect } from "react-native-svg";
import { C, navyBtn } from "../theme/tokens";
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
import { LeaveSheet, openLeaveSheet } from "../components/LeaveSheet";
import { SignUpSheet, openSignUpSheet } from "../components/SignUpSheet";
import { useAuth } from "../lib/auth";
import { setFlag } from "../lib/flags";
import { useEntitlement } from "../lib/entitlement";
import { Recorder } from "../components/Recorder";
import { AudioCard } from "../components/AudioCard";
import { DRIFT_LABEL, openingLadder, readMood, wrenLine } from "../lib/wren-read";
import { nextSpark } from "../lib/sparks";
import { COUNTER_FROM, LETTER_MAX, weightedCount } from "../lib/weighted-count";

const LANG = "en";
const LAV = P.paper; // the same surface every room uses
type Step = "pick" | "write" | "sending";
type Mode = "write" | "speak";

export default function Compose() {
  const router = useRouter();
  const wren = useWrenName();
  const params = useLocalSearchParams<{ morning?: string; stamp?: string; draft?: string; seed?: string }>();
  const isMorning = params.morning === "1";
  const { premium } = useEntitlement();

  // open straight to writing — text first, any length. The stamp is a light,
  // optional accent (default one assigned; tap it to change), not a gate.
  const [step, setStep] = useState<Step>("write");
  // WHERE this is going. It lives on the page, not in a sheet you answered
  // before you started — so you can change your mind halfway through, which
  // in this app is the whole point: the line between what you keep and what
  // you send is the thing being decided while you write.
  const [draftId, setDraftId] = useState<string | null>(params.draft ?? null);
  const [mode, setMode] = useState<Mode>("write");
  const [showAll, setShowAll] = useState(false);
  const [feelings, setFeelings] = useState(false);
  const [sel, setSel] = useState<string | null>(params.stamp ?? (params.draft ? null : STARTER_STAMPS[0]));
  // arriving from a sealed page that decided to leave — the words come with it
  const [text, setText] = useState(params.seed ?? "");
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const [capMsg, setCapMsg] = useState<string | null>(null);
  const [recUri, setRecUri] = useState<string | null>(null);
  const [recDur, setRecDur] = useState(0);
  const breathe = useBreathe(6, 2600);
  // the empty page hands you something to reach for, not "start typing"
  const [spark, setSpark] = useState("");
  useEffect(() => {
    nextSpark().then(setSpark);
  }, []);

  // back that survives cold deep-link starts (no history → land on Letters)
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/letters");
  };

  /* CLOSING WITH WORDS IN IT USED TO THROW THEM AWAY, silently, on one tap of
     a small ✕ — the single most expensive mistake this screen could make, and
     the only one it made without asking. lib/drafts has existed all along;
     nothing was calling it from here.

     Three ways out, because there are genuinely three intentions: keep
     writing (the accidental tap, and the cancel), keep it for later, throw it
     away. The sheet itself is components/LeaveSheet — this used to be
     Alert.alert, which is right behaviour in stock iOS clothes. */
  const [leaving, setLeaving] = useState(false);
  const { session } = useAuth();
  const [needsAccount, setNeedsAccount] = useState(false);
  const closeWithGuard = () => {
    if (!text.trim()) return goBack();
    openLeaveSheet(() => setLeaving(true));
  };
  const saveAndLeave = async () => {
    setLeaving(false);
    try {
      await saveDraft({ id: draftId, stamp: sel || STARTER_STAMPS[0], body: text.trim(), ask: spark });
    } catch {
      /* a draft is not worth blocking the exit */
    }
    goBack();
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
        Alert.alert(`${wren} held this back`, "This can't go out as written. Keep it to strangers — no contact details.");
        return;
      }
    }

    const bump = await bumpLetters();
    if (!bump.ok) {
      setBusy(false);
      if (bump.reason === "daily_cap") {
        setCapMsg(`That's your ${bump.cap ?? 3} letters for today.`);
      } else if (bump.reason === "unauthorized") {
        /* THE FIRST WALL A GHOST ACTUALLY HITS. The daily-cap check runs
           before publishLetter, so this — not the publish — is where someone
           with no session gets stopped, and it was a stock alert saying
           "sign in AGAIN" to a person who never signed in once. */
        if (!session) openSignUpSheet(() => setNeedsAccount(true));
        else Alert.alert("Sign in", "Your session expired. Sign in again to send.");
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
    /* A ghost's publishLetter always returns null, and "The letter didn't go
       out. Try again." turns "you aren't signed in" into "the network broke" —
       so they retry forever. Ask for the account instead, and only here. */
    if (!ok && !session) {
      openSignUpSheet(() => setNeedsAccount(true));
      return;
    }
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
          onPress={closeWithGuard}
          hitSlop={10}
          style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontFamily: PF.mono, fontSize: 17, color: P.ink }}>✕</Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1.6, color: P.ink }}>TO A STRANGER</Text>
        </View>
        {true ? (
          <Pressable onPress={() => setStep("pick")} hitSlop={8} style={{ transform: [{ rotate: "8deg" }] }}>
            <View style={{ padding: 3 }}>
              <StampTile id={sel || STARTER_STAMPS[0]} w={44} r={5} />
            </View>
          </Pressable>
        ) : (
          <View style={{ width: 50 }} />
        )}
      </View>

      {(

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 14, paddingTop: 14 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* The paper IS the page. It used to be a card floating inside the
              screen with a shadow and a tilt, which made writing feel like
              filling in a form on a desk; the letter you READ is full bleed, so
              the one you write should be too. */}
          <View>
            {/* Wren reads you live */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Animated.View key={wrenMood} entering={ZoomIn.duration(340)} style={[breathe, { width: 46, height: 46, alignItems: "center", justifyContent: "center" }]}>
                <WrenBird size={38} mood={wrenMood} />
              </Animated.View>
              <Text style={{ flex: 1, fontFamily: PF.serifItalic, fontSize: 14, color: P.ink60, lineHeight: 20 }}>
                “{mode === "speak" ? wrenLine(wrenMood) : ladder.line}”
              </Text>
            </View>
            {/* the line she stands on — the same one in both composers */}
            <View style={{ borderBottomWidth: 1, borderColor: P.ink12, marginTop: 12, marginBottom: 8 }} />

            {mode === "write" ? (
              <TextInput
                autoFocus
                value={text}
                onChangeText={setText}
                placeholder={spark}
                placeholderTextColor="#B9B3D8"
                multiline
                style={{ minHeight: 340, color: P.ink, fontFamily: PF.letter, fontSize: 20, lineHeight: 33, textAlignVertical: "top", paddingTop: 10 }}
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
                  Up to three minutes. Your voice travels as it is — {wren} doesn't listen in.
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

          </View>

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

    {/* The stamp is pinned above the bar, not left floating in the middle
        of the page. It's a property of the letter, so it belongs with the
        controls that act on the letter — and it stays visible while you
        write instead of drifting wherever the text happens to end. */}
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 22, paddingVertical: 12, borderTopWidth: 1, borderTopColor: P.ink12 }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: P.ink40 }}>MOOD STAMP</Text>
          {stamp && (
            <View style={{ backgroundColor: channelWash(stamp.color), borderWidth: 1, borderColor: stamp.color, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ fontFamily: PF.monoMed, fontSize: 12, color: channelInk(stamp.color) }}>#{stamp.name.en.toLowerCase()}</Text>
            </View>
          )}
          <Pressable onPress={() => setStep("pick")} hitSlop={6} style={{ paddingHorizontal: 6, paddingVertical: 7 }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 11.5, letterSpacing: 0.8, color: P.pen }}>CHANGE ›</Text>
          </Pressable>
        </View>

        {/* The quick feelings, in a tray. On the page they read as part of the
            letter — six boxes sitting under your own words, easy to mistake for
            the MOOD STAMP above them. They're neither: they're characters you
            drop INTO the sentence. So they behave like a keyboard — a key opens
            them, they cover the bottom, they close when you're done. */}
        {feelings && (
          <View style={{ flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 14, paddingVertical: 14, borderTopWidth: 1, borderTopColor: P.ink12 }}>
            {["🥹", "😤", "🫥", "✨", "🫶", "💀"].map((e) => (
              <Pressable key={e} onPress={() => setText((t) => t + e)} hitSlop={6} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
                <Text style={{ fontSize: 27 }}>{e}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 24 }}>
          <Pressable
            onPress={() => setFeelings((v) => !v)}
            style={{
              width: 50,
              height: 50,
              backgroundColor: feelings ? P.ink : "transparent",
              borderWidth: 1,
              borderColor: P.ink,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 20 }}>🙂</Text>
          </Pressable>

          {/* A voice letter is a Kindredly+ thing. It has to be VISIBLE — you
              can't want what you can't see — and unmistakably shut. So the key
              is always here, wearing a lock, and pressing it explains rather
              than refuses. */}
          <Pressable
            onPress={() => (premium ? setMode(mode === "speak" ? "write" : "speak") : router.push("/paywall"))}
            style={{
              width: 50,
              height: 50,
              backgroundColor: mode === "speak" ? P.ink : "transparent",
              borderWidth: 1,
              borderColor: P.ink,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 19, opacity: premium ? 1 : 0.4 }}>🎙</Text>
            {!premium && <LockBadge />}
          </Pressable>

          <Pressable
            onPress={send}
            disabled={!canSend || busy}
            style={{
              flex: 1,
              backgroundColor: canSend && !busy ? P.ink : "transparent",
              borderWidth: 1,
              borderColor: canSend && !busy ? P.ink : P.ink12,
              paddingVertical: 17,
              alignItems: "center",
            }}
          >
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 13, letterSpacing: 1.4, color: canSend && !busy ? "#fff" : P.ink40 }}>
              {busy ? "SENDING…" : DRIFT_LABEL}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      )}

      <SignUpSheet
        open={needsAccount}
        reason="This one's addressed to a stranger, so it needs somewhere for their reply to land. Your letter stays exactly as you left it."
        onClose={() => setNeedsAccount(false)}
        onSignedIn={() => {
          setNeedsAccount(false);
          void send();
        }}
      />

      <LeaveSheet
        open={leaving}
        title="Leave this letter?"
        body="You've written something. It hasn't gone anywhere yet."
        actions={[
          { label: "SAVE AS DRAFT", kind: "primary", onPress: saveAndLeave },
          { label: "DISCARD", kind: "destructive", onPress: goBack },
        ]}
        onCancel={() => setLeaving(false)}
      />
    </SafeAreaView>
  );
}

/* A drawn padlock. A 7pt "+" reads as "add something", which is the opposite of
   what it means here — the key has to say SHUT at a glance, and only then say
   why. */
function LockBadge() {
  return (
    <View style={{ position: "absolute", right: -6, bottom: -6, width: 18, height: 18, backgroundColor: P.pen, alignItems: "center", justifyContent: "center" }}>
      <Svg width={10} height={10} viewBox="0 0 12 12">
        <Path d="M3.7 5.6V4.1a2.3 2.3 0 0 1 4.6 0v1.5" fill="none" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
        <Rect x={2.5} y={5.6} width={7} height={5} fill="#fff" />
      </Svg>
    </View>
  );
}
