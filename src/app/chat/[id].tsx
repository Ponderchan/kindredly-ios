import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatField } from "../../components/ChatField";
import { archNameThird } from "../../lib/aura-copy";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { scoped as AsyncStorage } from "../../lib/scoped-store";
import { SafeAreaView } from "react-native-safe-area-context";

import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { t, useLang } from "../../lib/i18n";
import { P, PF } from "../../theme/post";
import { CorrespondentFace } from "../../components/CorrespondentFace";
import { Introduction } from "../../components/Introduction";
import { noticeAboutUs, type KindredNotice } from "../../lib/kindred-read";
import type { ThreadMessage } from "../../lib/db";
import { LeaveSheet } from "../../components/LeaveSheet";
import { MosaicId } from "../../components/MosaicId";
import { ReportMenu } from "../../components/ReportMenu";
import { ON_WAY } from "../../data/reactions";
import { dShort, postNo, localeTag } from "../../lib/format";
import { clearThreadReaction, fetchThreadMessages, sendThreadMessage, setThreadReaction, signThread, type ThreadDetail } from "../../lib/db";
import { useThreadLive } from "../../lib/live";
import { kindredGate } from "../../lib/kindred-gate";
import { track } from "../../lib/track";
import { useEntitlement } from "../../lib/entitlement";
import { LETTER_MAX, REPLY_MIN, weightedCount } from "../../lib/weighted-count";
import { refreshFingerprint } from "../../lib/aura";
import { readCorrespondent, theyify } from "../../lib/correspondent";
import { threadState } from "../../lib/thread-state";
import { useAuth } from "../../lib/auth";
import { useWrenName } from "../../lib/wren-name";
import { alertFail } from "../../lib/fail";
import { Toast, useSlow } from "../../components/ui";

/* The correspondence, seen from Kindreds: a slow chat. The other person's
   mosaic develops in the header with every letter THEY send — coming into
   view — and a letter-writing field sits at the bottom. Tap any bubble to
   open THAT letter full-page in the reader (thread/[id]?i=N) — two lenses on
   one correspondence: this is the relationship, that is the letter.

   There used to be a milestone strip here (VOICE → RHYTHM → RESONANCE →
   NAME) and a 3/5 progress bar over the composer. Both cut: a counter makes
   intimacy transactional — insert two more letters, receive human — and it
   invites exactly the throwaway writing that would make the reveal worthless.
   The developing face carries the same information without ever naming a
   number.

   Same surface as everywhere: white, rules doing the separation, mono for what
   the system says, the system font for what either of you wrote. The bubbles
   stay — they're the one place the two voices need telling apart at a glance —
   but they lose their tint and their rounding and become ruled blocks. */

const GROUND = P.paper;
const REVEAL = 5;

/* one introduction per thread, ever — the ceremony is a moment, not a
   recurring screen */
const SEEN_KEY = "kindredly_introductions";
async function introduceOnce(threadId: string, show: () => void) {
  try {
    const seen: string[] = JSON.parse((await AsyncStorage.getItem(SEEN_KEY)) || "[]");
    if (seen.includes(threadId)) return;
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...seen, threadId]));
  } catch {
    /* if the ledger is unreadable, showing twice beats never showing */
  }
  show();
}

export default function ChatScreen() {
  useLang();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const slow = useSlow(sending);
  const [promised, setPromised] = useState(false); // ✍️ sent this visit
  const [askSign, setAskSign] = useState(false);
  const [signing, setSigning] = useState(false);
  const [ceremony, setCeremony] = useState(false);
  /* the road to the name: the first five letters each way, in the order
     they left — and what Wren noticed, read from their side on this phone */
  const road = useMemo(() => {
    if (!detail) return [];
    const out: ThreadMessage[] = [];
    let mine = 0;
    let theirs = 0;
    for (const m of [...detail.messages].sort((a, b) => (a.date || "").localeCompare(b.date || ""))) {
      if (m.mine ? mine >= 5 : theirs >= 5) continue;
      if (m.mine) mine++;
      else theirs++;
      out.push(m);
      if (mine >= 5 && theirs >= 5) break;
    }
    return out;
  }, [detail]);
  const [notice, setNotice] = useState<KindredNotice | null>(null);
  useEffect(() => {
    if (!ceremony || !detail) return;
    let alive = true;
    noticeAboutUs(detail.messages.filter((m) => !m.mine), new Date().toISOString()).then((n) => alive && setNotice(n));
    return () => {
      alive = false;
    };
  }, [ceremony, detail]);
  const auth = useAuth();
  const wren = useWrenName();
  const { premium } = useEntitlement();

  const load = useCallback(async () => {
    if (!id) return;
    if (__DEV__ && id.startsWith("demo-")) {
      const { DEMO_DETAILS } = await import("../../data/demo");
      const demo = DEMO_DETAILS[id] ?? null;
      setDetail(demo);
      if (demo?.revealed) void introduceOnce(id, () => setCeremony(true));
      return;
    }
    const d = await fetchThreadMessages(id);
    setDetail(d);
    // The introduction is held for whoever arrives after the second
    // signature — including the one who signed FIRST and finds out later.
    if (d?.revealed) void introduceOnce(id, () => setCeremony(true));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  /* the correspondence hears the server. This is also how the FIRST
     signer gets their ceremony the moment the second signature lands:
     the threads UPDATE pokes load(), load() sees revealed, and
     introduceOnce holds the door. */
  useThreadLive(id, load);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/kindreds"));

  const conv = detail
    ? [{ body: detail.opening, mine: detail.openingFromMe, date: "" }, ...detail.messages].filter((m) => m.body)
    : [];
  /* a deleted correspondent has no number to show — every one of them would
     otherwise collapse onto the same No. 1000 */
  const name = detail?.revealed
    ? detail.otherName || t("cm.kindred")
    : detail
      ? detail.other
        ? `No. ${postNo(detail.other)}`
        : t("ld.unsigned")
      : "…";
  /* the read, from their letters in this very thread */
  const read = useMemo(() => {
    if (!detail) return null;
    const theirs = detail.messages.filter((m) => !m.mine).map((m) => m.body);
    if (!detail.openingFromMe && detail.opening) theirs.unshift(detail.opening);
    return readCorrespondent(theirs, detail.revealed);
  }, [detail]);
  /* the same sentence the list row shows — same words, not a second
     vocabulary for the same state */
  const state = useMemo(
    () =>
      detail
        ? threadState({
            mine: detail.myCount,
            theirs: detail.otherCount,
            revealed: detail.revealed,
            lastSenderMe: !detail.messages.length || !!detail.messages[detail.messages.length - 1]?.mine,
            iSigned: detail.iSigned,
            theirSigned: detail.theirSigned,
          })
        : null,
    [detail],
  );

  const weight = weightedCount(text);
  const over = weight > LETTER_MAX;
  const canSend = weight >= REPLY_MIN && !over && !sending;

  /* OPTIMISTIC — same contract as the room: the letter appears as you
     release it; a failure drops the ghost and hands your words back. */
  const onSend = async () => {
    const body = text.trim();
    if (!id || !canSend || !detail) return;
    setSending(true);
    setText("");
    setDetail((d) =>
      d
        ? {
            ...d,
            myCount: d.myCount + 1,
            messages: [...d.messages, { body, mine: true, date: new Date().toISOString() }],
          }
        : d,
    );
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 40);
    const res = await sendThreadMessage(id, body);
    setSending(false);
    if (!res) {
      setText(body);
      void load();
      alertFail(t("th.fail.title"), t("th.fail.body"));
      return;
    }
    void refreshFingerprint();
    // the reply IS the promise, kept — withdraw the standing "on its way"
    setPromised(false);
    void clearThreadReaction(id);
    // the realtime echo of our own INSERT re-runs load() and reconciles
  };

  /* enclose my name. Whoever signs second completes the reveal and gets
     the introduction on the spot; the first signer gets it on their next
     visit, via load(). */
  const onSign = async () => {
    if (!id || signing) return;
    setSigning(true);
    const res = __DEV__ && id.startsWith("demo-") ? { revealed: true } : await signThread(id);
    setSigning(false);
    setAskSign(false);
    if (!res) {
      alertFail(t("ch.name.fail.title"), t("ch.name.fail.body"));
      return;
    }
    await load();
    if (res.revealed) {
      track("kindred_made");
      await introduceOnce(id, () => setCeremony(true));
    }
  };

  const promise = () => {
    if (!id || promised) return;
    setPromised(true);
    void setThreadReaction(id, ON_WAY.emoji);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: GROUND }}>
      {/* header — back · who · report */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingTop: 2, paddingBottom: 8 }}>
        <Pressable onPress={goBack} hitSlop={10} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 22, color: P.ink }}>‹</Text>
        </Pressable>
        <Pressable
          /* the room opens once you know their voice — not only after names.
             A stranger still has no page: at FOUND and FORMING they are
             their letters and nothing else, which is the whole point. */
          disabled={!detail?.revealed && read?.stage !== "recognizing"}
          onPress={() => router.push(`/kindred/${id}`)}
          hitSlop={6}
          style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, opacity: pressed ? 0.6 : 1 })}
        >
          <CorrespondentFace
            seed={detail?.other || "anon"}
            theirs={detail?.otherCount ?? 0}
            revealed={!!detail?.revealed}
            otherFace={detail?.otherFace}
            theirSigned={detail?.theirSigned}
            iSigned={detail?.iSigned}
            size="lg"
          />
          <View>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 13, letterSpacing: 1, color: P.ink }}>{name.toUpperCase()}</Text>
            {!!state && (
              <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1, color: state.tone, marginTop: 2, textAlign: "center" }}>
                {state.label}
              </Text>
            )}
          </View>
        </Pressable>
        <ReportMenu targetUser={detail?.other} context="thread" refId={id} snapshot={detail?.opening} onBlocked={goBack} />
      </View>

      {/* the rule the milestone strip used to carry */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: P.ink }} />

      {/* THE ONE THRESHOLD, SAID ON THE PAGE. Five letters each way and
          names can be traded — the only gate in the product, and until now
          nothing on this screen said how far along the two of you were. */}
      {detail && !detail.revealed && (() => {
        const each = Math.min(detail.myCount, detail.otherCount);
        const left = Math.max(0, 5 - each);
        return (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: "#E9F4EC", borderBottomWidth: 1, borderBottomColor: "#D2E6D7" }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.2, color: "#1F5C33" }}>{t("ch.band.ofFive", { n: each })}</Text>
            <View style={{ flexDirection: "row", gap: 3 }}>
              {Array.from({ length: 5 }, (_, i) => (
                <View key={i} style={{ width: 14, height: 4, borderRadius: 2, backgroundColor: i < each ? "#2E7D4F" : "#C5DBCB" }} />
              ))}
            </View>
            <View style={{ flex: 1 }} />
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.2, color: "#1F5C33" }}>{left > 0 ? t("ch.band.more", { n: left }) : t("ch.band.names")}</Text>
          </View>
        );
      })()}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* the correspondence */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {conv.map((m, i) => {
            const prev = conv[i - 1];
            const day = m.date ? dShort(m.date).toUpperCase() : "";
            const prevDay = prev?.date ? dShort(prev.date).toUpperCase() : "";
            const showLabel = !prev || prev.mine !== m.mine || day !== prevDay;
            const time = m.date
              ? new Date(m.date).toLocaleTimeString(localeTag(), { hour: "2-digit", minute: "2-digit", hour12: false })
              : "";
            return (
              <Pressable
                key={i}
                onPress={() => router.push(`/thread/${id}?i=${i}`)}
                style={({ pressed }) => ({ marginBottom: 10, alignItems: m.mine ? "flex-end" : "flex-start", opacity: pressed ? 0.55 : 1 })}
              >
                {showLabel && (
                  <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1, color: P.ink40, marginBottom: 6, marginHorizontal: 2 }}>
                    {m.mine ? t("ui.you") : name.toUpperCase()}
                    {day ? ` · ${day}` : ""}
                  </Text>
                )}
                <View
                  style={{
                    maxWidth: "86%",
                    borderWidth: 1,
                    borderColor: m.mine ? P.ink12 : P.ink,
                    backgroundColor: m.mine ? P.paperDeep : P.paper,
                    paddingHorizontal: 13,
                    paddingVertical: 11,
                  }}
                >
                  <Text style={{ fontFamily: PF.letter, fontSize: 15.5, lineHeight: 23, color: P.ink }}>{m.body}</Text>
                  {!!time && (
                    <Text style={{ fontFamily: PF.mono, fontSize: 9, color: P.ink40, alignSelf: "flex-end", marginTop: 6 }}>{time}</Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* the door — from the fifth letter, names can be enclosed. Three
            states: yours to offer, yours offered and waiting, or theirs
            waiting on you (brass — the one warm signal in the product). */}
        {detail && !detail.revealed && detail.myCount >= REVEAL && (
          <View style={{ alignItems: "center", paddingBottom: 10 }}>
            {detail.iSigned ? (
              <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: P.ink40 }}>
{t("ch.wentFirst")}
              </Text>
            ) : (
              <Pressable
                onPress={async () => {
                  /* the gate stands here, before the name is enclosed —
                     see lib/kindred-gate */
                  const gate = await kindredGate(premium, String(id));
                  if (gate.allowed) setAskSign(true);
                  else {
                    track("gate_hit", { gate: "kindred", have: gate.have });
                    router.push("/paywall?src=kindred_gate");
                  }
                }}
                hitSlop={8}
                style={{ borderWidth: 1, borderColor: detail.theirSigned ? P.brassSeal : P.ink, paddingHorizontal: 14, paddingVertical: 8 }}
              >
                <Text
                  style={{
                    fontFamily: PF.monoSemi,
                    fontSize: 10.5,
                    letterSpacing: 1.2,
                    color: detail.theirSigned ? P.brassSeal : P.ink,
                  }}
                >
                  {detail.theirSigned ? t("ch.theyFirst") : t("ch.sendYours")}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* the only number left is the one that stops a letter going out */}
        {over && (
          <View style={{ alignItems: "center", paddingBottom: 8 }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: P.post }}>
              {t("ui.overLimit", { n: String(weight - LETTER_MAX) })}
            </Text>
          </View>
        )}

        {/* THE PROMISE, ONLY WHEN A PROMISE MAKES SENSE. This lived behind a
            "+" — the attach-something glyph, opening onto a sentence — and it
            was offered even when the turn wasn't yours. It appears by itself
            now, exactly when their letter is waiting and you haven't started
            yours: one tap tells them a reply is coming, and actually sending
            the reply withdraws it, because a promise a courier has already
            kept is noise. */}
        {state?.needsYou && !text.trim() && !detail?.gone && (
          <View style={{ alignItems: "center", paddingBottom: 8 }}>
            <Pressable
              onPress={promise}
              hitSlop={6}
              disabled={promised}
              style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: promised ? P.pen : P.ink12, backgroundColor: promised ? P.penWash : "transparent" }}
            >
              <Text style={{ fontSize: 15 }}>{ON_WAY.emoji}</Text>
              <Text style={{ fontFamily: PF.mono, fontSize: 11.5, letterSpacing: 0.5, color: promised ? P.pen : P.ink60 }}>
                {promised ? t("th.reactSeen") : t("rx.onWay")}
              </Text>
            </Pressable>
          </View>
        )}

        {/* write — unless there is no longer anyone at the other end. 0009
            nulls threads.a/b when an account is deleted instead of cascading,
            so the survivor keeps every letter. What it did NOT do is close
            the composer: RLS asks only that the sender be a participant, and
            you still are, so letters written to a deleted correspondent were
            accepted, stored, and read by no one, forever. The correspondence
            stays open to read. It stops being somewhere you can write. */}
        {detail?.gone ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 20 }}>
            <Text
              style={{ fontFamily: PF.mono, fontSize: 11.5, lineHeight: 18, letterSpacing: 0.3, color: P.ink40, textAlign: "center" }}
            >
              {t("ch.gone")}
            </Text>
          </View>
        ) : (
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 14, paddingBottom: 14 }}>
          {/* the same field as the rooms' (owner, 2026-09-20): a pill, and a
              blue arrow at its end once there is something in it; the
              keyboard's SEND sends too. No ⊕ before names — there is
              nothing to leave yet. */}
          <ChatField
            text={text}
            canSend={canSend}
            onSend={() => void onSend()}
            onChangeText={setText}
            /* the register loosens once you know each other. Not a
               different mechanic — REPLY_MIN has always been 2, so "ok."
               was always a whole answer — but the product never admitted
               it. Before names it is a letter you are composing; after,
               it is a person you are talking to. */
            placeholder={detail?.revealed ? t("th.sayTo", { name }) : t("ch.ph")}
            lineHeight={23}
          />
        </View>
        )}
      </KeyboardAvoidingView>

      {/* The bubble is already on screen — this send is optimistic — so the
          only thing left to report is that it has not landed yet. Without
          it a stalled connection looks exactly like a delivered letter
          until the alert arrives and takes the words back. */}
      {slow && <Toast msg={t("net.slow")} bottom={96} />}

      <LeaveSheet
        open={askSign}
        title={t("ch.sign.title")}
        body={t("ch.sign.body", { name: auth.handle || t("ch.sign.fallback") })}
        actions={[{ label: signing ? "…" : t("ch.sign.confirm"), kind: "primary", onPress: onSign }]}
        cancelLabel={t("ch.sign.cancel")}
        onCancel={() => !signing && setAskSign(false)}
      />

      <Introduction
        open={ceremony}
        wren={wren}
        otherSeed={detail?.other || "anon"}
        otherFace={detail?.otherFace ?? null}
        otherName={detail?.otherName || t("cm.kindred")}
        otherArchetype={read?.archetype ? archNameThird(read.archetype.id) : null}
        myName={auth.handle || "you"}
        road={road}
        mySeed={auth.user?.id || "me"}
        myFace={(auth.profile?.avatarId as string) || null}
        notice={notice}
        since={new Date().toISOString()}
        stamp={detail?.stamp ?? null}
        onClose={() => setCeremony(false)}
        onTalk={() => {
          setCeremony(false);
          router.replace(`/room/${id}`);
        }}
      />
    </SafeAreaView>
  );
}
