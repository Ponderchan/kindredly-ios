import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GlyphInput } from "../../components/GlyphInput";
import { archNameThird } from "../../lib/aura-copy";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, InteractionManager, useWindowDimensions } from "react-native";
import { scoped as AsyncStorage } from "../../lib/scoped-store";
import { SafeAreaView } from "react-native-safe-area-context";

import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { getLang, t, useLang } from "../../lib/i18n";
import { MessageMenu, a11yActions, type MessageAction } from "../../components/MessageMenu";
import { copyText } from "../../lib/clipboard";
import { offerTranslate } from "../../lib/lang-guess";
import { translate } from "../../lib/wren";
import { P, PF } from "../../theme/post";
import { CorrespondentFace } from "../../components/CorrespondentFace";
import { Introduction } from "../../components/Introduction";
import { noticeAboutUs, type KindredNotice } from "../../lib/kindred-read";
import type { ThreadMessage } from "../../lib/db";
import { LeaveSheet } from "../../components/LeaveSheet";
import { MosaicId } from "../../components/MosaicId";
import { ReportMenu } from "../../components/ReportMenu";
import { markRoomSeen } from "../../lib/room-seen";
import { dShort, postNo, localeTag } from "../../lib/format";
import { fetchThreadMessages, readThreadDetailCache, reportContent, sendThreadMessage, signThread, theirLatest, type ThreadDetail } from "../../lib/db";
import { useThreadLive } from "../../lib/live";
import { track } from "../../lib/track";
import { useEntitlement } from "../../lib/entitlement";
import { LETTER_MAX, REPLY_MIN, weightedCount } from "../../lib/weighted-count";
import { refreshFingerprint } from "../../lib/aura";
import { noteWrote } from "../../lib/local-push";
import { readCorrespondent, theyify } from "../../lib/correspondent";
import { markWork } from "../../lib/stall-probe";
import { threadState } from "../../lib/thread-state";
import { useAuth } from "../../lib/auth";
import { useWrenName } from "../../lib/wren-name";
import { fieldBox } from "../../lib/field";
import { alertFail } from "../../lib/fail";
import { Toast, useSlow } from "../../components/ui";

/* The correspondence, seen from Kindreds: a slow chat. The other person's
   mosaic develops in the header with every letter THEY send — coming into
   view — and a letter-writing field sits at the bottom. Tap any bubble to
   open THAT letter full-page in the reader (thread/[id]?i=N) — two lenses on
   one correspondence: this is the relationship, that is the letter.

   There used to be a milestone strip here (VOICE → RHYTHM → RESONANCE →
   NAME) and a 3/5 progress bar over the composer, cut because a counter can
   make intimacy transactional. The one threshold came back as the band under
   the header (both sides' five cells, 2026-10-10): it says who still owes
   what, and says plainly when more from you won't move it, so it never asks
   for filler. The developing face still carries the rest.

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
    // the last read first, so the page is there when you are; the fetch replaces it
    const cached = await readThreadDetailCache(id);
    if (cached) setDetail((cur) => cur ?? cached);
    const d = await fetchThreadMessages(id);
    setDetail(d);
    // The introduction is held for whoever arrives after the second
    // signature — including the one who signed FIRST and finds out later.
    if (d?.revealed) {
      void introduceOnce(id, () => setCeremony(true));
      /* everything they wrote up to here was read on this screen; the
         Kindreds count starts from the next letter (lib/room-seen) */
      void markRoomSeen(id, d.messages.filter((m) => !m.mine).length);
    }
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

  /* LONG-PRESS A LETTER (owner, 2026-10-10). Before names these are letters,
     not chat: copy it, translate it, report it — no taking back (a posted
     letter is posted) and no quoting (a letter is answered whole). Tapping
     still opens the letter. */
  const { width: winW } = useWindowDimensions();
  const letterMax = Math.round((winW - 32) * 0.86); // the list pads 16 a side
  const [trans, setTrans] = useState<Record<string, { text?: string; shown: boolean; busy?: boolean }>>({});
  const shownCount = useRef(0);
  const atBottom = useRef(true);
  const letterKey = (m: ThreadMessage) => m.id || `${m.date}|${m.body.slice(0, 24)}`;
  const translateLetter = async (k: string, body: string) => {
    if (trans[k]?.text) { setTrans((s) => ({ ...s, [k]: { ...s[k], shown: true } })); return; }
    setTrans((s) => ({ ...s, [k]: { shown: false, busy: true } }));
    const out = await translate(body, getLang());
    setTrans((s) => ({ ...s, [k]: out ? { text: out, shown: true } : { shown: false } }));
    if (!out) Alert.alert(t("th.noTransTitle", { wren }), t("th.noTransBody"));
  };
  const reportLetter = async (m: ThreadMessage) => {
    const ok = await reportContent({ targetUser: detail?.other ?? null, context: "message", refId: m.id ?? null, reason: "other", snapshot: m.body });
    if (ok) Alert.alert(t("rp.reportedTitle"), t("rp.reportedBody", { wren }));
    else Alert.alert(t("rp.failed"), t("rp.failedBody"));
  };
  const menuFor = (m: ThreadMessage): MessageAction[] => {
    if (!m.body || m.recalledAt) return [];
    const k = letterKey(m);
    const acts: MessageAction[] = [{ key: "copy", label: t("mm.copy"), icon: "doc.on.doc", onPress: () => void copyText(m.body) }];
    if (!m.mine) {
      if (trans[k]?.shown) acts.push({ key: "original", label: t("mm.original"), icon: "character.bubble", onPress: () => setTrans((s) => ({ ...s, [k]: { ...s[k], shown: false } })) });
      else if (offerTranslate(m.body)) acts.push({ key: "translate", label: t("mm.translate"), icon: "character.bubble", onPress: () => void translateLetter(k, m.body) });
      if (m.id && detail?.other) acts.push({ key: "report", label: t("mm.report"), icon: "flag", destructive: true, onPress: () => void reportLetter(m) });
    }
    return acts;
  };

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
  /* the read is a hatch over everything they wrote — the heaviest thing
     this screen does. It used to run inside render, on the way in; now it
     runs after the transition has landed (stall probe, 2026-09-20). */
  const [read, setRead] = useState<ReturnType<typeof readCorrespondent> | null>(null);
  useEffect(() => {
    if (!detail) return;
    const task = InteractionManager.runAfterInteractions(() => {
      markWork("read:correspondent");
      const theirs = detail.messages.filter((m) => !m.mine).map((m) => m.body);
      if (!detail.openingFromMe && detail.opening) theirs.unshift(detail.opening);
      setRead(readCorrespondent(theirs, detail.revealed));
    });
    return () => task.cancel();
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
    void noteWrote("letter");
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
        <ReportMenu targetUser={detail?.other} context="thread" refId={id} snapshot={theirLatest(detail?.messages, detail?.openingFromMe ? null : detail?.opening)} onBlocked={goBack} />
      </View>

      {/* the rule the milestone strip used to carry */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: P.ink }} />

      {/* THE ONE THRESHOLD, SAID ON THE PAGE — both sides of it (owner,
          2026-10-10). It used to count min(yours, theirs): four from you and
          two from them read "3 MORE", as if you owed three. Now each side has
          its five cells and one line says who still owes what; once your five
          are in it says so, because more from you won't move it (the one
          thing a counter must never invite is filler). Ink until a side is
          full, pen blue when it is — no green. Not dismissable: it's the
          product's only gate, in two lines. */}
      {detail && !detail.revealed && (() => {
        const me = Math.min(detail.myCount, REVEAL);
        const them = Math.min(detail.otherCount, REVEAL);
        const a = REVEAL - me, b = REVEAL - them;
        const line = !a && !b ? t("ch.band.names") : !a ? t("ch.band.youDone", { n: b }) : !b ? t("ch.band.theyDone", { n: a }) : t("ch.band.both", { a, b });
        const cells = (n: number) => (
          <View style={{ flexDirection: "row", gap: 2 }}>
            {Array.from({ length: REVEAL }, (_, i) => (
              <View key={i} style={{ width: 8, height: 8, backgroundColor: n >= REVEAL ? P.pen : i < n ? P.ink : P.ink12 }} />
            ))}
          </View>
        );
        return (
          <View accessible accessibilityLabel={t("ch.band.a11y", { me, them })} style={{ paddingHorizontal: 16, paddingVertical: 9, backgroundColor: P.paper, borderBottomWidth: 1, borderBottomColor: P.ink12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.2, color: P.ink60 }}>{t("ch.band.you")}</Text>
                {cells(me)}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.2, color: P.ink60 }}>NO. {postNo(detail.other)}</Text>
                {cells(them)}
              </View>
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.2, color: !a && !b ? P.pen : P.ink, marginTop: 7 }}>{line}</Text>
          </View>
        );
      })()}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* the correspondence */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={32}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            atBottom.current = contentSize.height - (contentOffset.y + layoutMeasurement.height) < 60;
          }}
          onContentSizeChange={() => {
            // to the end when a letter arrives; a translation opening mid-thread stays where it is
            const grew = conv.length !== shownCount.current;
            shownCount.current = conv.length;
            if (grew) scrollRef.current?.scrollToEnd({ animated: false });
            else if (atBottom.current) scrollRef.current?.scrollToEnd({ animated: true });
          }}
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
                /* a long-press is the letter's menu, so lifting the finger must not also open it */
                onLongPress={() => {}}
                delayLongPress={350}
                {...a11yActions(menuFor(m))}
                /* no fade under the finger: it hid iOS's own press-and-lift of the menu */
                style={{ marginBottom: 10, alignItems: m.mine ? "flex-end" : "flex-start" }}
              >
                {showLabel && (
                  <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1, color: P.ink40, marginBottom: 6, marginHorizontal: 2 }}>
                    {m.mine ? t("ui.you") : name.toUpperCase()}
                    {day ? ` · ${day}` : ""}
                  </Text>
                )}
                <MessageMenu actions={menuFor(m)} radius={0}>
                <View
                  style={{
                    maxWidth: letterMax,
                    borderWidth: 1,
                    /* yours wash blue, theirs stay paper — the two hands were
                       one shade of grey apart (owner, 2026-09-20) */
                    borderColor: m.mine ? "#CFCBF5" : P.ink,
                    backgroundColor: m.mine ? P.penWash : P.paper,
                    paddingHorizontal: 13,
                    paddingVertical: 11,
                  }}
                >
                  <Text style={{ fontFamily: PF.letter, fontSize: 15.5, lineHeight: 23, color: P.ink }}>{m.body}</Text>
                  {!!time && (
                    <Text style={{ fontFamily: PF.mono, fontSize: 9, color: P.ink40, alignSelf: "flex-end", marginTop: 6 }}>{time}</Text>
                  )}
                </View>
                </MessageMenu>
                {trans[letterKey(m)]?.busy && (
                  <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.6, color: P.ink40, marginTop: 4, marginHorizontal: 2 }}>{t("mm.translating")}</Text>
                )}
                {trans[letterKey(m)]?.shown && !!trans[letterKey(m)]?.text && (
                  <Text style={{ maxWidth: letterMax, fontFamily: PF.letter, fontSize: 14.5, lineHeight: 21, color: P.ink60, marginTop: 5, marginHorizontal: 2 }}>{trans[letterKey(m)]!.text}</Text>
                )}
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
                /* no gate here any more: kindreds are unlimited (owner,
                   2026-09-20). The fare stands at the expired door instead —
                   lib/kindred-expiry. */
                onPress={() => setAskSign(true)}
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
          {/* the same bar as the room's (owner, 2026-09-20): a pill field,
              and the keyboard's own SEND sends — no send key of ours */}
          <View style={{ flex: 1, borderRadius: 20, backgroundColor: "#F3F2FA", paddingHorizontal: 14 }}>
            <GlyphInput
              value={text}
              onChangeText={setText}
              /* the register loosens once you know each other. Not a
                 different mechanic — REPLY_MIN has always been 2, so "ok."
                 was always a whole answer — but the product never admitted
                 it. Before names it is a letter you are composing; after,
                 it is a person you are talking to. */
              placeholder={detail?.revealed ? t("th.sayTo", { name }) : t("ch.ph")}
              placeholderTextColor={P.ink40}
              multiline
              returnKeyType="send"
              submitBehavior="submit"
              onSubmitEditing={() => {
                if (canSend) void onSend();
              }}
              style={{ ...fieldBox(text, 23, 110), paddingTop: 9, paddingBottom: 9, fontFamily: PF.writing, fontSize: 16, lineHeight: 23, color: P.ink }}
            />
          </View>
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
