import { speakAs, useWrenName } from "../lib/wren-name";
import { GlyphInput } from "../components/GlyphInput";
import { useEffect, useRef, useState } from "react";
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { P, PF } from "../theme/post";
import { StampTile } from "../components/StampTile";
import { MoreTray, Nudge, PlusGlyph, RoundKey, StampGlyph, StampTray } from "../components/ComposeTray";
import { noteStampUsed, readRecentStamps } from "../lib/recent-stamps";
import { WrenBird, type WrenMood } from "../components/WrenBird";
import { wrenStageDirty } from "../lib/wren-stage";
import { LetterTravel } from "../components/LetterTravel";
import { useBreathe } from "../components/anim";
import Animated, { ZoomIn } from "react-native-reanimated";
import { suggestStamps } from "../lib/stamp-suggest";
import { screen } from "../lib/wren";
import { bumpLetters } from "../lib/api";
import { refreshFingerprint } from "../lib/aura";
import { track } from "../lib/track";
import { getLang, t, useLang } from "../lib/i18n";
import { useWrenOnce } from "../components/WrenSaysOnce";
import { startLetterOut } from "../lib/activities";
import { publishLetter, publishVoiceLetter } from "../lib/db";
import { deleteDraft, getDraft, saveDraft } from "../lib/drafts";
import { LeaveSheet, openLeaveSheet } from "../components/LeaveSheet";
import { SignUpSheet, openSignUpSheet } from "../components/SignUpSheet";
import { useAuth } from "../lib/auth";
import { setFlag } from "../lib/flags";
import { useEntitlement } from "../lib/entitlement";
import { Recorder } from "../components/Recorder";
import { AudioCard } from "../components/AudioCard";
import { openingLadder, readMood, wrenLine } from "../lib/wren-read";
import { nextSpark } from "../lib/sparks";
import { COUNTER_FROM, LETTER_MAX, OPENING_MIN, REPLY_MIN, weightedCount } from "../lib/weighted-count";
import { alertFail } from "../lib/fail";

/* A LETTER REMEMBERS ITS OWN LANGUAGE. This was hardcoded "en", so every
   letter ever written — in any language — was filed as English, and the
   pool had no way to hand a reader something they could read. The tag is
   the writer's interface language, which is the best available guess and
   the one they chose deliberately. */
const letterLang = () => getLang();
const LAV = P.paper; // the same surface every room uses
type Step = "write" | "sending";
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
  /* which tray is open under the bar — the stamps or the ⊕ — or none.
     Opening one puts the keyboard away; focusing the letter closes it. */
  const [tray, setTray] = useState<null | "stamps" | "more">(null);
  const openTray = (which: "stamps" | "more") => {
    Keyboard.dismiss();
    setTray((cur) => (cur === which ? null : which));
  };
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    readRecentStamps().then(setRecent);
  }, []);
  const pickStamp = (id: string) => {
    setSel(id);
    setTray(null);
    void noteStampUsed(id).then(setRecent);
  };
  const [feelings, setFeelings] = useState(false);
  /* THE STAMP IS CHOSEN, NOT DEFAULTED. It used to arrive pre-set to the
     first starter, so the pool filled with #off my chest nobody had picked
     and the door never mentioned it. Now it is empty until you choose, the
     row and the key both say so, and the letter cannot leave without one. */
  const [sel, setSel] = useState<string | null>(params.stamp ?? null);
  // arriving from a sealed page that decided to leave — the words come with it
  const [text, setText] = useState(params.seed ?? "");
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false); // the publish truly landed — the courier waits for this
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
  const { user, isGuest } = useAuth();
  const [needsAccount, setNeedsAccount] = useState(false);
  const closeWithGuard = () => {
    if (!text.trim()) return goBack();
    openLeaveSheet(() => setLeaving(true));
  };
  const saveAndLeave = async () => {
    setLeaving(false);
    try {
      /* `ask` rides with the letter — send() appends it under the body. This
         wrote the PLACEHOLDER into it, so saving a draft and resuming it
         glued the app's own prompt to the bottom of a letter a stranger
         then read as the writer's words. The draft carries what the writer
         has, which is currently nothing. */
      await saveDraft({ id: draftId, stamp: sel || "", body: text.trim(), ask });
    } catch {
      /* a draft is not worth blocking the exit */
    }
    goBack();
  };

  /* the send-off animation calls goBack itself when the courier clears the
     frame — no fixed timer, so the copy and the flight can't fall out of sync */

  // resume a draft
  useEffect(() => {
    if (!params.draft) return;
    getDraft(params.draft).then((d) => {
      if (!d) return;
      setSel(d.stamp || null);
      setText(d.body);
      setAsk(d.ask);
      setStep("write");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.draft]);

  // silent autosave on leave — "they never send themselves"
  const snap = useRef({ sel, text, ask, mode, sent: false, draftId });
  useEffect(() => {
    snap.current = { ...snap.current, sel, text, ask, mode, draftId, sent: done };
  }, [sel, text, ask, mode, done, draftId]);
  useEffect(
    () => () => {
      const s = snap.current;
      if (s.sent) return; // sent → draft already deleted
      if (s.mode !== "write") return; // voice recordings don't survive as drafts
      if (s.text.trim().length >= 3) {
        saveDraft({ id: s.draftId, stamp: s.sel || "", body: s.text, ask: s.ask });
      }
    },
    [],
  );

  // a cold opening earns its way to a stranger: at least a real line (weighted),
  // and never longer than a genuine short letter. Voice is exempt — the audio
  // is the content, the caption's optional.
  const weight = weightedCount(text);
  const over = weight - LETTER_MAX;
  const ladder = openingLadder(weight);
  /* A VOICE LETTER MUST CARRY A WRITTEN LINE.
     Two reasons, and the first is a shipping requirement: `screen()`
     reads text, so audio sent to a stranger had no gate at all — the one
     unmoderated path in a UGC app. The line gives moderation something to
     hold, and report/block still covers the audio itself.
     The second is that it is simply better: a voice letter in the pool was
     an unopenable black box in a feed of readable ones. Now it arrives the
     way a parcel does — a label on the outside. */
  const voiceLine = text.trim();
  const wordsReady = mode === "speak" ? !!recUri && weightedCount(voiceLine) >= REPLY_MIN : ladder.ready && over <= 0;
  const canSend = wordsReady && !!sel;
  // Wren's face reads your feeling; her line reads how much you've given.
  const wrenMood: WrenMood = mode === "speak" ? (recUri ? "happy" : "curious") : readMood(text, ladder.ready);
  /* Her language line — the courier's own promise ("I carry letters, not
     dictionaries"), so it stays in her mouth and nowhere else. Said only to
     writers whose interface isn't English (an English writer never wonders
     whether their language is welcome), and once PER LANGUAGE, not once ever:
     switch to Spanish and she makes the promise again, in Spanish. */
  useLang(); // the id below keys on the language, so re-render when it moves
  const langHello =
    useWrenOnce(`lang-send:${getLang()}`) && getLang() !== "en" && mode === "write" && !text.trim();

  const send = async () => {
    if (!canSend || busy || !sel) return;
    setBusy(true);
    setCapMsg(null);
    setDone(false);
    /* THE COUNTER OPENS THE MOMENT YOU HAND IT OVER. The gate, the cap and
       the publish used to run before the sending screen appeared — three
       network round-trips (one of them an LLM) of frozen composer between the
       tap and the first frame. Now the strike and the docket play over that
       wait, and the courier only takes the letter once it has truly gone
       through. Every failure steps back to the desk and explains. */
    setStep("sending");
    const back = () => setStep("write");

    /* both paths pass her gate now: the letter itself when written, and
       the line that travels with the recording when spoken */
    {
      const body =
        mode === "speak"
          ? voiceLine
          : ask.trim()
            ? `${text.trim()}\n\n${ask.trim()}`
            : text.trim();
      const gate = await screen(body);
      if (!gate.ok) {
        setBusy(false);
        back();
        Alert.alert(t("cp.gate.title", { wren }), t("cp.gate.body"));
        return;
      }
    }

    const bump = await bumpLetters();
    if (!bump.ok) {
      setBusy(false);
      back();
      if (bump.reason === "daily_cap") {
        setCapMsg(t("cp.cap", { n: bump.cap ?? 3 }));
      } else if (bump.reason === "unauthorized") {
        /* THE FIRST WALL A GHOST ACTUALLY HITS. The daily-cap check runs
           before publishLetter, so this — not the publish — is where someone
           with no session gets stopped, and it was a stock alert saying
           "sign in AGAIN" to a person who never signed in once. */
        if (isGuest) openSignUpSheet(() => setNeedsAccount(true));
        else Alert.alert(t("cp.signin.title"), t("cp.signin.body"));
      } else {
        alertFail(t("cp.fail.title"), t("cp.fail.generic"));
      }
      return;
    }

    let ok: string | true | null = null;
    if (mode === "speak" && recUri) {
      ok = await publishVoiceLetter(sel, recUri, recDur, voiceLine, letterLang());
    } else {
      const body = ask.trim() ? `${text.trim()}\n\n${ask.trim()}` : text.trim();
      ok = await publishLetter(sel, body, letterLang());
      if (ok) track("letter_sent", { kind: "text", weight: weightedCount(body) });
      // her, on the lock screen, out with this letter — fire-and-forget
      if (typeof ok === "string") void startLetterOut(ok, sel);
    }
    setBusy(false);
    /* A ghost's publishLetter always returns null, and "The letter didn't go
       out. Try again." turns "you aren't signed in" into "the network broke" —
       so they retry forever. Ask for the account instead, and only here. */
    if (!ok && isGuest) {
      back();
      openSignUpSheet(() => setNeedsAccount(true));
      return;
    }
    if (!ok) {
      back();
      Alert.alert(
        t("cp.fail.title"),
        mode === "speak" ? t("cp.fail.voice") : t("cp.fail.text"),
      );
      return;
    }
    if (mode === "speak") setFlag("voiceSent"); // growth stamp: Your Voice
    /* the vector that matching runs on finally moves with your writing —
       letters only, never the journal. Fire-and-forget: a staler match is
       fine, a blocked send is not. */
    void refreshFingerprint();
    if (draftId) {
      deleteDraft(draftId);
      setDraftId(null);
    }
    setDone(true);
    wrenStageDirty(); // her first letter is what hatches her
  };

  /* ── sending: the courier takes the letter and flies ── */
  if (step === "sending") {
    return (
      <View style={{ flex: 1 }}>
        <LetterTravel
          ready={done}
          onDone={goBack}
          title={isMorning ? t("cp.morningTitle") : undefined}
          note={isMorning ? t("cp.morningNote") : undefined}
        />
      </View>
    );
  }

  /* ── pick ── */
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
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1.6, color: P.ink }}>{t("cp.header")}</Text>
        </View>
        {true ? (
          <Pressable onPress={() => openTray("stamps")} hitSlop={8} style={{ transform: [{ rotate: "8deg" }] }}>
            <View style={{ padding: 3 }}>
              {sel ? (
                <StampTile id={sel} w={44} r={5} />
              ) : (
                /* the corner where the stamp goes, still empty */
                <View style={{ width: 44, height: 44, borderWidth: 1.5, borderStyle: "dashed", borderColor: P.pen, borderRadius: 5, backgroundColor: P.penWash }} />
              )}
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
            {/* Wren reads you live. Her first time here she instead says the
                language line — the pool is one room in every language (the
                owner's call), and someone has to tell a writer that theirs is
                welcome in it. ONE speech slot: it stacked as a second bird
                row once, and two birds talking at the same time in two
                languages read as a crowd, not a companion. The moment you
                start writing, the live read takes the slot back. */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Animated.View key={wrenMood} entering={ZoomIn.duration(340)} style={[breathe, { width: 46, height: 46, alignItems: "center", justifyContent: "center" }]}>
                <WrenBird size={38} mood={wrenMood} />
              </Animated.View>
              <Text style={{ flex: 1, fontFamily: PF.serifItalic, fontSize: 14, color: P.ink60, lineHeight: 20 }}>
                “
                {langHello
                  ? speakAs(t("lang.send"), wren)
                  : mode === "speak"
                    ? recUri && weightedCount(voiceLine) < REPLY_MIN
                      ? t("cp.voiceLine.prompt")
                      : wrenLine(wrenMood)
                    : ladder.line}
                ”
              </Text>
            </View>
            {/* the line she stands on — the same one in both composers */}
            <View style={{ borderBottomWidth: 1, borderColor: P.ink12, marginTop: 12, marginBottom: 8 }} />

            {mode === "write" ? (
              <GlyphInput
                onFocus={() => setTray(null)}
                autoFocus
                value={text}
                onChangeText={setText}
                placeholder={spark}
                placeholderTextColor="#B9B3D8"
                multiline
                style={{ minHeight: 340, color: P.ink, fontFamily: PF.writing, fontSize: 19, lineHeight: 30, textAlignVertical: "top", paddingTop: 10 }}
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
                  {t("cp.voiceNote", { wren })}
                </Text>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder={t("cp.voiceLine.ph")}
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
                {t("cp.repliesFree")}
              </Text>
              <Pressable onPress={() => router.push("/paywall?src=daily_cap")} style={{ marginTop: 10 }}>
                <Text style={{ fontFamily: PF.monoMed, fontSize: 11.5, letterSpacing: 1, color: P.pen }}>{t("cp.discover")}</Text>
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

    {/* NO STAMP ROW. There used to be a strip of words above the bar (MOOD
        STAMP · PICK ONE ›) and a slide-out of six stamps; the key below
        already says PICK A MOOD STAMP the moment the letter is long enough,
        and pressing it opens the album — which leads with stamps read from
        the letter itself. The chosen stamp sits on the envelope, top right,
        where a stamp goes (owner, 2026-09-20). */}

        {/* THE QUESTION RIDES UNDER THE LETTER. This tray held six preset
            emoji — a six-key keyboard sitting one key away from the system
            one with thousands, in the product whose claim is that nobody
            writes like you. Gone. What earns the slot is the thing that was
            wired end-to-end and never given a door: `ask` has always been
            appended below the body at send and carried by drafts, with no
            way to type it. A letter that ends in a question is an invitation
            to answer — and an answer is where every kindred begins. */}
        {feelings && (
          <View style={{ paddingHorizontal: 22, paddingVertical: 12, borderTopWidth: 1, borderTopColor: P.ink12 }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: P.ink40, marginBottom: 7 }}>{t("cp.askLabel")}</Text>
            <TextInput
              value={ask}
              onChangeText={setAsk}
              placeholder={t("cp.askPh")}
              placeholderTextColor="#B9B3D8"
              autoFocus
              maxLength={140}
              style={{ fontFamily: PF.letter, fontSize: 16.5, color: P.ink, paddingVertical: 4 }}
            />
          </View>
        )}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingTop: 10, paddingBottom: tray ? 10 : 24 }}>
          {/* TWO ROUND KEYS, A KEYBOARD'S SHAPE (owner, 2026-09-20): the
              stamp, and ⊕ — the question and the voice letter live behind
              it. Each opens a tray where the keyboard was. */}
          <RoundKey on={tray === "more" || feelings || !!ask.trim() || mode === "speak"} onPress={() => openTray("more")}>
            <PlusGlyph size={23} open={tray === "more"} color={tray === "more" || feelings || !!ask.trim() || mode === "speak" ? "#FFFFFF" : P.ink} />
          </RoundKey>
          <RoundKey on={tray === "stamps"} onPress={() => openTray("stamps")}>
            {sel ? <StampTile id={sel} w={30} r={4} /> : <StampGlyph size={23} color={tray === "stamps" ? "#FFFFFF" : P.ink} />}
          </RoundKey>

          {/* THE DOOR SHOWS HOW FAR IT IS. The courier's four lines said
              "a little more" without ever saying how much, and the owner
              could not tell when the letter would be allowed to go. So the
              key fills as you write — a wash rising from the left to the
              floor, the count beside it — and turns solid ink the moment
              it clears. Only on the way up; past the floor the count goes
              back to minding the ceiling. */}
          <Pressable
            onPress={wordsReady && !sel ? () => openTray("stamps") : send}
            disabled={(!canSend && !(wordsReady && !sel)) || busy}
            style={{
              flex: 1,
              /* three keys in one: filling (a wash rising, the count), PICK
                 A MOOD STAMP (solid pen blue — the app's one actionable
                 colour, the same pill Kindreds uses, not a hollow outline
                 that read as disabled — owner, 2026-09-20), LET IT TRAVEL
                 (solid ink) */
              backgroundColor: canSend && !busy ? P.ink : wordsReady && !sel && !busy ? P.pen : "transparent",
              borderWidth: 1,
              borderColor: canSend && !busy ? P.ink : wordsReady && !sel ? P.pen : P.ink12,
              overflow: "hidden",
            }}
          >
            {mode === "write" && !wordsReady && !busy && weight < OPENING_MIN && (
              <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.round((weight / OPENING_MIN) * 100)}%`, backgroundColor: P.penWash }} />
            )}
            {wordsReady && !sel && !busy && tray !== "stamps" && <Nudge color="#FFFFFF" />}
            <View style={{ paddingVertical: 17, alignItems: "center" }}>
              {/* two doors, and the key names only the one still shut: the
                  words first, then the stamp; both open → the letter goes */}
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 13, letterSpacing: 1.4, color: (canSend || (wordsReady && !sel)) && !busy ? "#fff" : P.ink40 }}>
                {busy ? t("cp.sending") : wordsReady && !sel ? t("cp.needStamp") : t("cp.travel")}
              </Text>
            </View>
            {mode === "write" && !wordsReady && !busy && weight < OPENING_MIN && (
              <View style={{ position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" }}>
                <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 0.6, color: P.ink40 }}>
                  {weight}/{OPENING_MIN}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
        {tray === "stamps" && <StampTray selected={sel} suggested={suggestStamps(text)} recent={recent} onPick={pickStamp} />}
        {tray === "more" && (
          <MoreTray
            askOn={feelings || !!ask.trim()}
            voiceOn={mode === "speak"}
            premium={premium}
            onAsk={() => {
              setFeelings((v) => !v);
              setTray(null);
            }}
            onVoice={() => {
              setTray(null);
              if (premium) setMode(mode === "speak" ? "write" : "speak");
              else router.push("/paywall?src=voice_lock");
            }}
          />
        )}
      </KeyboardAvoidingView>
      )}

      <SignUpSheet
        open={needsAccount}
        reason={t("cp.signup.reason")}
        onClose={() => setNeedsAccount(false)}
        onSignedIn={() => {
          setNeedsAccount(false);
          void send();
        }}
      />

      <LeaveSheet
        open={leaving}
        title={t("cp.leave.title")}
        body={t("cp.leave.body")}
        actions={[
          { label: t("cp.leave.draft"), kind: "primary", onPress: saveAndLeave },
          { label: t("cp.leave.discard"), kind: "destructive", onPress: goBack },
        ]}
        onCancel={() => setLeaving(false)}
      />
    </SafeAreaView>
  );
}

/* A drawn padlock. A 7pt "+" reads as "add something", which is the opposite of
   what it means here — the key has to say SHUT at a glance, and only then say
   why. */
