import { useCallback, useMemo, useRef, useState } from "react";
import { archNameThird } from "../../lib/aura-copy";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { t, useLang, t as tr } from "../../lib/i18n";
import { P, PF } from "../../theme/post";
import { CorrespondentFace } from "../../components/CorrespondentFace";
import { ReportMenu } from "../../components/ReportMenu";
import { dLong, dShort } from "../../lib/format";
import { fetchThreadMessages, sendThreadMessage, type ThreadDetail } from "../../lib/db";
import { useThreadLive } from "../../lib/live";
import { refreshFingerprint } from "../../lib/aura";
import { readCorrespondent, theyify } from "../../lib/correspondent";
import { noticeThings } from "../../lib/notice";
import { LeaveATrace, type TraceAction } from "../../components/LeaveATrace";
import { STAMPS, sname } from "../../data/stamps";
import { WrenBird } from "../../components/WrenBird";
import { useWrenName } from "../../lib/wren-name";
import { LETTER_MAX, REPLY_MIN, weightedCount } from "../../lib/weighted-count";
import { fieldBox } from "../../lib/field";

/* THE ROOM — where you are once you know each other.
   ────────────────────────────────────────────────────────────────────────
   Before names are traded you are in a CORRESPONDENCE, and chat/[id] is
   built for that: a docket on every letter, a stamp, a count of how many
   have passed, and a tap that opens any one of them full-page like a
   document you might file. That grammar is right for a courtship.

   It is wrong for a friend. You do not archive someone's texts, or check
   which number this one was. So the reveal doesn't just change what things
   are called — it changes the room you are standing in, and TALK TO takes
   you here instead.

   What is deliberately absent, and why:
   · no dockets, no stamps, no letter numbers — the post office furniture
     belongs to the part where you were strangers
   · no minute timestamps. 18:12 is instant-messaging grammar and would
     quietly promise a speed this product does not offer; the day is as
     precise as a letter has ever been
   · no bubbles. This reads as a conversation transcribed, not two people
     texting — which is the honest description of what it is

   What is always present: their mark at the top. You are in THEIR room.

   NOT AN INBOX. There is no typing indicator, no read receipt, no
   presence. Nothing here reports on the other person's attention. */
export default function RoomScreen() {
  useLang(); // repaint on language change
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const wren = useWrenName();
  const [tracing, setTracing] = useState(false);
  const inputRef = useRef<TextInput>(null);

  /* Every row adds something to the relationship rather than to the
     scroll. Three are live and need nothing but words; the two that would
     need storage, moderation and a media pipeline are shown locked rather
     than live-and-dead. */
  const TRACES: TraceAction[] = [
    { id: "thought", glyph: "💭", title: t("rm.thought.t"), sub: t("rm.thought.s") },
    { id: "ask", glyph: "❓", title: t("rm.ask.t"), sub: t("rm.ask.s") },
    { id: "wren", glyph: "🐦", title: t("rm.wren.t", { wren }), sub: t("rm.wren.s") },
    { id: "moment", glyph: "📷", title: t("rm.moment.t"), sub: t("rm.moment.s"), locked: true },
    { id: "song", glyph: "🎵", title: t("rm.song.t"), sub: t("rm.song.s"), locked: true },
    { id: "save", glyph: "🔖", title: t("rm.save.t"), sub: t("rm.save.s"), locked: true },
  ];

  const onTrace = (kind: string) => {
    setTracing(false);
    if (kind === "wren") {
      /* the seed library has been in stamps.ts since the port — 36 prompts
         in three languages, never once rendered. She hands you one; YOU
         send it, because a question arrives differently when a person
         chose to ask it. */
      const seed = STAMPS[Math.floor(Math.random() * STAMPS.length)];
      setText(sname(seed.prompt));
    }
    setTimeout(() => inputRef.current?.focus(), 160);
  };

  const load = useCallback(async () => {
    if (!id) return;
    if (__DEV__ && id.startsWith("demo-")) {
      const { DEMO_DETAILS } = await import("../../data/demo");
      setDetail(DEMO_DETAILS[id] ?? null);
      return;
    }
    setDetail(await fetchThreadMessages(id));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  // the room hears the server: their message, their reaction, live
  useThreadLive(id, load);

  const name = detail?.otherName || t("cm.kindred");
  const read = useMemo(() => {
    if (!detail) return null;
    const theirs = detail.messages.filter((m) => !m.mine).map((m) => m.body);
    if (!detail.openingFromMe && detail.opening) theirs.unshift(detail.opening);
    return readCorrespondent(theirs, true);
  }, [detail]);

  /* WREN'S NOTICES. Counted, never guessed — every line is a measurement
     of words the two of you really wrote, with the count printed beside it
     so it can be checked. Naming what a count MEANS is your job, not
     hers; that is the difference between a shared story and a label wall.
     One at a time, the rarest thing first: she is a courier who leaves
     something on the table, not a feed. */
  const notices = useMemo(() => {
    if (!detail) return [];
    return noticeThings(
      detail.messages.filter((m) => m.mine),
      detail.messages.filter((m) => !m.mine),
    );
  }, [detail]);

  const conv = detail
    ? [{ body: detail.opening, mine: detail.openingFromMe, date: "" }, ...detail.messages].filter((m) => m.body)
    : [];

  const weight = weightedCount(text);
  const over = weight > LETTER_MAX;
  const canSend = weight >= REPLY_MIN && !over && !sending;

  /* OPTIMISTIC. Your words appear the moment you let go of them — the
     network settles behind. On failure the reload drops the ghost line
     and your words come back to the input instead of vanishing. */
  const onSend = async () => {
    const body = text.trim();
    if (!id || !canSend) return;
    setSending(true);
    setText("");
    setDetail((d) =>
      d ? { ...d, messages: [...d.messages, { body, mine: true, date: new Date().toISOString() }] } : d,
    );
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 40);
    const res = await sendThreadMessage(id, body);
    setSending(false);
    if (!res) {
      setText(body);
      void load();
      Alert.alert(t("rm.fail.title"), t("rm.fail.body"));
      return;
    }
    void refreshFingerprint();
    // the realtime echo of our own INSERT re-runs load() and reconciles
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      {/* their mark, always — you are in their room */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingTop: 2, paddingBottom: 10 }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/kindreds"))}
          hitSlop={10}
          style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontFamily: PF.mono, fontSize: 22, color: P.ink }}>‹</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/kindred/${id}`)}
          hitSlop={6}
          style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: 11, opacity: pressed ? 0.6 : 1 })}
        >
          <CorrespondentFace
            seed={detail?.other || "anon"}
            theirs={detail?.otherCount ?? 5}
            revealed
            otherFace={detail?.otherFace}
            size="lg"
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: PF.letter, fontSize: 19, fontWeight: "600", color: P.ink }}>{name}</Text>
            <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1.1, color: P.ink40, marginTop: 2 }}>
              {detail?.since ? tr("rm.kindredSince", { date: dLong(detail.since).toUpperCase() }) : archNameThird(read?.archetype?.id)}
            </Text>
            {/* she carried every letter that got you here, and the room
                should say so once rather than her hovering in it */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 }}>
              <WrenBird size={13} mood="content" />
              <Text style={{ fontFamily: PF.serifItalic, fontSize: 11.5, color: P.ink40 }}>{tr("rm.foundYouTwo", { wren })}</Text>
            </View>
          </View>
        </Pressable>
        <ReportMenu
          targetUser={detail?.other}
          context="thread"
          refId={id}
          snapshot={detail?.opening}
          onBlocked={() => router.replace("/(tabs)/kindreds")}
        />
      </View>
      <View style={{ height: 1, backgroundColor: P.ink12 }} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 20, paddingBottom: 12 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {conv.map((m, i) => {
            const prev = conv[i - 1];
            const day = m.date ? dShort(m.date).toUpperCase() : "";
            const newDay = !!day && day !== (prev?.date ? dShort(prev.date).toUpperCase() : "");
            const newSpeaker = !prev || prev.mine !== m.mine;
            return (
              <View key={i}>
                {newDay && (
                  <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1.4, color: P.ink40, textAlign: "center", marginTop: i ? 22 : 0, marginBottom: 16 }}>
                    {day}
                  </Text>
                )}
                {newSpeaker && (
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.2, color: m.mine ? P.ink40 : P.pen, marginTop: newDay ? 0 : 16, marginBottom: 5 }}>
                    {m.mine ? tr("ui.you") : name.toUpperCase()}
                  </Text>
                )}
                <Text style={{ fontFamily: PF.letter, fontSize: 16.5, lineHeight: 25, color: m.mine ? P.ink60 : P.ink, marginBottom: 3 }}>
                  {m.body}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* she leaves one thing on the table, at the foot of the room */}
        {!!notices.length && (
          <View style={{ marginHorizontal: 22, marginBottom: 10, borderWidth: 1, borderColor: P.ink12, padding: 13 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <WrenBird size={20} mood="curious" />
              <Text style={{ fontFamily: PF.monoMed, fontSize: 9, letterSpacing: 1.2, color: P.ink40 }}>
                {tr("rm.noticed", { wren: wren.toUpperCase() })}
              </Text>
              <View style={{ flex: 1 }} />
              <Text style={{ fontFamily: PF.mono, fontSize: 8.5, letterSpacing: 1, color: P.ink40 }}>
                {notices[0].evidence}
              </Text>
            </View>
            <Text style={{ fontFamily: PF.letter, fontSize: 15.5, lineHeight: 23, color: P.ink, marginTop: 7 }}>
              {notices[0].line}
            </Text>
          </View>
        )}

        {over && (
          <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: P.post, textAlign: "center", paddingBottom: 6 }}>
            {tr("ui.overLimit", { n: String(weight - LETTER_MAX) })}
          </Text>
        )}

        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 22, paddingBottom: 14 }}>
          <Pressable
            onPress={() => setTracing(true)}
            hitSlop={6}
            style={{ width: 38, height: 38, borderWidth: 1, borderColor: P.ink, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ fontFamily: PF.mono, fontSize: 18, color: P.ink }}>+</Text>
          </Pressable>
          <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: P.ink12 }}>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder={t("rm.ph")}
              placeholderTextColor={P.ink40}
              multiline
              style={{ ...fieldBox(text, 24, 110), paddingTop: 10, paddingBottom: 10, fontFamily: PF.letter, fontSize: 16.5, lineHeight: 24, color: P.ink }}
            />
          </View>
          <Pressable
            onPress={onSend}
            disabled={!canSend}
            style={{ paddingHorizontal: 10, paddingVertical: 9, backgroundColor: canSend ? P.pen : "transparent" }}
          >
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1, color: canSend ? "#fff" : P.ink40 }}>
              {sending ? "···" : t("ld.send")}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <LeaveATrace open={tracing} actions={TRACES} onPick={onTrace} onClose={() => setTracing(false)} />
    </SafeAreaView>
  );
}
