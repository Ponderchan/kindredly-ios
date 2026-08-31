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
import { fetchThreadMessages, momentUrl, sendThreadMessage, uploadMoment, type ThreadDetail, type ThreadMessage } from "../../lib/db";
import { answerFold, fetchFolds, leaveFold, type Fold } from "../../lib/folds";
import { fetchSongTitle, parseSongUrl } from "../../lib/song";
import { saveToLore } from "../../lib/lore";
import * as ImagePicker from "expo-image-picker";
import { Image, Linking } from "react-native";
import { LeaveATrace, type TraceAction } from "../../components/LeaveATrace";
import { useThreadLive } from "../../lib/live";
import { refreshFingerprint } from "../../lib/aura";
import { readCorrespondent, theyify } from "../../lib/correspondent";
import { noticeThings } from "../../lib/notice";
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
  const [folds, setFolds] = useState<Fold[]>([]);
  const [tracing, setTracing] = useState(false);
  /* what the composer is currently for. null = an ordinary line.
     note/question = leaving a fold; answering = folding onto theirs. */
  const [mode, setMode] = useState<null | { kind: "note" } | { kind: "question"; prompt: string } | { kind: "answer"; fold: Fold } | { kind: "song" }>(null);
  const wren = useWrenName();
  const inputRef = useRef<TextInput>(null);

  /* Every row adds something to the relationship rather than to the
     scroll. Three are live and need nothing but words; the two that would
     need storage, moderation and a media pipeline are shown locked rather
     than live-and-dead. */
  /* the trace sheet is back, and every row on it is real now — see the
     TRACES list below. Wren's seed feeds the STAKED question flow: she
     hands you the prompt, the stake rule still makes you answer it first. */
  const seedQuestion = () => {
    const seed = STAMPS[Math.floor(Math.random() * STAMPS.length)];
    setMode({ kind: "question", prompt: sname(seed.prompt) });
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const load = useCallback(async () => {
    if (!id) return;
    if (__DEV__ && id.startsWith("demo-")) {
      const { DEMO_DETAILS } = await import("../../data/demo");
      setDetail(DEMO_DETAILS[id] ?? null);
      // every fold state the room can render, for eyes-on verification
      setFolds([
        { id: "df-1", mine: false, kind: "note", prompt: null, parentId: null, body: null, date: "2026-08-30T09:00:00Z" },
        { id: "df-2", mine: true, kind: "question", prompt: "the song you replay and never post?", parentId: null, body: "the one i sent you, obviously", date: "2026-08-30T21:00:00Z" },
        { id: "df-3", mine: true, kind: "note", prompt: null, parentId: null, body: "i almost moved home in march.", date: "2026-08-31T08:00:00Z" },
        { id: "df-4", mine: false, kind: "note", prompt: null, parentId: "df-3", body: "i almost didn't move here at all.", date: "2026-08-31T09:00:00Z" },
      ]);
      return;
    }
    const [d, f] = await Promise.all([fetchThreadMessages(id), fetchFolds(id)]);
    setDetail(d);
    if (f) setFolds(f);
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
    ? [{ body: detail.opening, mine: detail.openingFromMe, date: "" } as ThreadMessage, ...detail.messages].filter((m) => m.body)
    : [];

  /* one stream: lines and folds interleave by time. An answered fold
     collapses onto its opener and renders once, unfolded, as a pair. */
  type StreamItem =
    | { type: "msg"; date: string; msg: ThreadMessage }
    | { type: "fold"; date: string; fold: Fold; answer: Fold | null };
  const stream = useMemo<StreamItem[]>(() => {
    const byParent = new Map<string, Fold>();
    for (const f of folds) if (f.parentId) byParent.set(f.parentId, f);
    const items: StreamItem[] = conv.map((m) => ({ type: "msg" as const, date: m.date, msg: m }));
    for (const f of folds) {
      if (f.parentId) continue; // rendered with its opener
      items.push({ type: "fold", date: f.date, fold: f, answer: byParent.get(f.id) ?? null });
    }
    return items.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [conv, folds]);

  const weight = weightedCount(text);
  const over = weight > LETTER_MAX;
  const canSend = weight >= REPLY_MIN && !over && !sending;

  /* OPTIMISTIC for plain lines; folds and media go through load() because
     their truth (sealed/open, upload) lives server-side. */
  const onSend = async () => {
    const body = text.trim();
    if (!id || sending) return;

    if (mode?.kind === "note" || mode?.kind === "question" || mode?.kind === "answer") {
      if (!body) return;
      setSending(true);
      const ok =
        mode.kind === "answer"
          ? await answerFold(id, mode.fold, body)
          : await leaveFold(id, mode.kind, body, mode.kind === "question" ? mode.prompt : undefined);
      setSending(false);
      if (!ok) {
        Alert.alert(t("rm.fail.title"), t("rm.fail.body"));
        return;
      }
      setText("");
      setMode(null);
      void load();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
      return;
    }

    if (mode?.kind === "song") {
      const card = parseSongUrl(body);
      if (!card) {
        Alert.alert(t("rm.song.badTitle"), t("rm.song.badBody"));
        return;
      }
      setSending(true);
      const title = await fetchSongTitle(card);
      const fallback = `${title ? title + " — " : ""}${card.url}`;
      const res = await sendThreadMessage(id, fallback, { kind: "song", meta: { url: card.url, title: title ?? undefined } });
      setSending(false);
      if (!res) {
        Alert.alert(t("rm.fail.title"), t("rm.fail.body"));
        return;
      }
      setText("");
      setMode(null);
      void load();
      return;
    }

    if (!canSend) return;
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

  /* a tiny moment — pick, upload, send. The body is a readable fallback. */
  const sendMoment = async () => {
    if (!id || sending) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (res.canceled || !res.assets?.[0]?.uri) return;
    setSending(true);
    const path = await uploadMoment(res.assets[0].uri);
    const ok = path ? await sendThreadMessage(id, t("rm.moment.fallback"), { kind: "photo", mediaPath: path }) : null;
    setSending(false);
    if (!ok) {
      Alert.alert(t("rm.fail.title"), t("rm.fail.body"));
      return;
    }
    void load();
  };

  const TRACES: TraceAction[] = [
    { id: "note", glyph: "📄", title: t("rm.note.t"), sub: t("rm.note.s") },
    { id: "ask", glyph: "❓", title: t("rm.ask.t"), sub: t("rm.ask.s") },
    { id: "moment", glyph: "📷", title: t("rm.moment.t"), sub: t("rm.moment.s") },
    { id: "song", glyph: "🎵", title: t("rm.song.t"), sub: t("rm.song.s") },
  ];
  const onTrace = (kind: string) => {
    setTracing(false);
    if (kind === "moment") {
      void sendMoment();
      return;
    }
    if (kind === "note") setMode({ kind: "note" });
    else if (kind === "ask") setMode({ kind: "question", prompt: "" });
    else if (kind === "song") setMode({ kind: "song" });
    setTimeout(() => inputRef.current?.focus(), 160);
  };

  /* long-press keeps a moment — theirs or an opened fold — in your lore */
  const keep = (body: string, prompt: string | null, said: string) => {
    Alert.alert(t("rm.keep.title"), t("rm.keep.body"), [
      { text: t("set.neverMind"), style: "cancel" },
      {
        text: t("rm.keep.do"),
        onPress: () => {
          if (id) void saveToLore({ threadId: id, who: name, body, prompt, said });
        },
      },
    ]);
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
        <Pressable onPress={() => router.push("/lore")} hitSlop={8} style={{ width: 36, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 15, color: P.ink40 }}>❞</Text>
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
          {stream.map((it, i) => {
            const prev = stream[i - 1];
            const day = it.date ? dShort(it.date).toUpperCase() : "";
            const newDay = !!day && day !== (prev?.date ? dShort(prev.date).toUpperCase() : "");
            const dayRule = newDay && (
              <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1.4, color: P.ink40, textAlign: "center", marginTop: i ? 22 : 0, marginBottom: 16 }}>
                {day}
              </Text>
            );

            if (it.type === "fold") {
              const f = it.fold;
              const a = it.answer;
              const open = !!a;
              return (
                <View key={`f-${f.id}`}>
                  {dayRule}
                  <View style={{ borderWidth: 1, borderColor: open ? P.ink : P.ink12, marginTop: 14, marginBottom: 6, padding: 13, backgroundColor: open ? P.paper : "#FAF9F3" }}>
                    <Text style={{ fontFamily: PF.monoMed, fontSize: 8.5, letterSpacing: 1.4, color: P.ink40 }}>
                      {f.kind === "question" ? t("rm.fold.q") : t("rm.fold.n")}
                    </Text>
                    {!!f.prompt && (
                      <Text style={{ fontFamily: PF.letter, fontSize: 16, lineHeight: 24, color: P.ink, marginTop: 6 }}>{f.prompt}</Text>
                    )}
                    {open ? (
                      <>
                        {[f, a!].map((half) => (
                          <Pressable key={half.id} onLongPress={() => !half.mine && half.body && keep(half.body, f.prompt, half.date)} delayLongPress={350}>
                            <Text style={{ fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 1.1, color: half.mine ? P.ink40 : P.pen, marginTop: 10 }}>
                              {half.mine ? tr("ui.you") : name.toUpperCase()}
                            </Text>
                            <Text style={{ fontFamily: PF.letter, fontSize: 16, lineHeight: 24, color: half.mine ? P.ink60 : P.ink, marginTop: 3 }}>
                              {half.body ?? ""}
                            </Text>
                          </Pressable>
                        ))}
                      </>
                    ) : f.mine ? (
                      <Text style={{ fontFamily: PF.serifItalic, fontSize: 13.5, color: P.ink40, marginTop: 8 }}>{t("rm.fold.waiting", { name })}</Text>
                    ) : (
                      <Pressable
                        onPress={() => {
                          setMode({ kind: "answer", fold: f });
                          setTimeout(() => inputRef.current?.focus(), 120);
                        }}
                        hitSlop={6}
                        style={{ marginTop: 8 }}
                      >
                        <Text style={{ fontFamily: PF.serifItalic, fontSize: 13.5, color: P.ink60 }}>
                          {f.kind === "question" ? t("rm.fold.answerToOpen") : t("rm.fold.foldToOpen")}
                        </Text>
                        <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1, color: P.pen, marginTop: 6 }}>
                          {f.kind === "question" ? t("rm.fold.answerKey") : t("rm.fold.foldKey")} ›
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            }

            const m = it.msg;
            const prevMsg = prev?.type === "msg" ? prev.msg : null;
            const newSpeaker = !prevMsg || prevMsg.mine !== m.mine;
            const url = m.kind === "photo" ? momentUrl(m.mediaPath) : null;
            return (
              <View key={`m-${i}`}>
                {dayRule}
                {newSpeaker && (
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.2, color: m.mine ? P.ink40 : P.pen, marginTop: newDay ? 0 : 16, marginBottom: 5 }}>
                    {m.mine ? tr("ui.you") : name.toUpperCase()}
                  </Text>
                )}
                {m.kind === "photo" && url ? (
                  <Image source={{ uri: url }} style={{ width: "78%", aspectRatio: 1, marginBottom: 6, backgroundColor: "#EFEDE6" }} resizeMode="cover" />
                ) : m.kind === "song" && m.meta?.url ? (
                  <Pressable
                    onPress={() => Linking.openURL(m.meta!.url!)}
                    style={{ borderWidth: 1, borderColor: P.ink12, padding: 12, marginBottom: 6, flexDirection: "row", alignItems: "center", gap: 10 }}
                  >
                    <Text style={{ fontSize: 17 }}>🎵</Text>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontFamily: PF.monoMed, fontSize: 12.5, color: P.ink }}>
                        {m.meta.title || t("rm.song.card")}
                      </Text>
                      <Text numberOfLines={1} style={{ fontFamily: PF.mono, fontSize: 9.5, color: P.ink40, marginTop: 2 }}>
                        {m.meta.url.replace(/^https?:\/\//, "").split("/")[0]}
                      </Text>
                    </View>
                    <Text style={{ fontFamily: PF.mono, fontSize: 12, color: P.pen }}>›</Text>
                  </Pressable>
                ) : (
                  <Pressable onLongPress={() => !m.mine && keep(m.body, null, m.date)} delayLongPress={350}>
                    <Text style={{ fontFamily: PF.letter, fontSize: 16.5, lineHeight: 25, color: m.mine ? P.ink60 : P.ink, marginBottom: 3 }}>
                      {m.body}
                    </Text>
                  </Pressable>
                )}
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

        {mode && (
          <View style={{ marginHorizontal: 22, marginBottom: 8, borderWidth: 1, borderColor: P.pen, padding: 11, backgroundColor: P.penWash }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ flex: 1, fontFamily: PF.monoMed, fontSize: 9.5, letterSpacing: 1.2, color: P.pen }}>
                {mode.kind === "note"
                  ? t("rm.mode.note")
                  : mode.kind === "question"
                    ? t("rm.mode.ask")
                    : mode.kind === "song"
                      ? t("rm.mode.song")
                      : mode.fold.kind === "question"
                        ? t("rm.mode.answerQ")
                        : t("rm.mode.answerN")}
              </Text>
              <Pressable onPress={() => setMode(null)} hitSlop={10}>
                <Text style={{ fontFamily: PF.mono, fontSize: 14, color: P.ink40 }}>✕</Text>
              </Pressable>
            </View>
            {mode.kind === "question" && (
              <TextInput
                value={mode.prompt}
                onChangeText={(v) => setMode({ kind: "question", prompt: v })}
                placeholder={t("rm.mode.promptPh")}
                placeholderTextColor={P.ink40}
                style={{ fontFamily: PF.letter, fontSize: 15.5, color: P.ink, marginTop: 7, paddingVertical: 2 }}
              />
            )}
            {mode.kind === "answer" && !!mode.fold.prompt && (
              <Text style={{ fontFamily: PF.letter, fontSize: 15.5, color: P.ink, marginTop: 7 }}>{mode.fold.prompt}</Text>
            )}
          </View>
        )}

        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 22, paddingBottom: 14 }}>
          <Pressable
            onPress={() => setTracing(true)}
            hitSlop={6}
            style={{ width: 38, height: 38, borderWidth: 1, borderColor: P.ink, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ fontFamily: PF.mono, fontSize: 18, color: P.ink }}>+</Text>
          </Pressable>
          <Pressable
            onPress={seedQuestion}
            hitSlop={6}
            style={{ width: 38, height: 38, borderWidth: 1, borderColor: P.ink12, alignItems: "center", justifyContent: "center" }}
          >
            <WrenBird size={20} bare mood="curious" />
          </Pressable>
          <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: P.ink12 }}>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder={
                mode?.kind === "song"
                  ? t("rm.song.ph")
                  : mode?.kind === "question"
                    ? t("rm.mode.answerPh")
                    : mode
                      ? t("rm.mode.notePh")
                      : t("rm.ph")
              }
              placeholderTextColor={P.ink40}
              multiline
              autoCapitalize={mode?.kind === "song" ? "none" : "sentences"}
              style={{ ...fieldBox(text, 24, 110), paddingTop: 10, paddingBottom: 10, fontFamily: PF.letter, fontSize: 16.5, lineHeight: 24, color: P.ink }}
            />
          </View>
          <Pressable
            onPress={onSend}
            disabled={mode ? sending || !text.trim() || (mode.kind === "question" && !mode.prompt.trim()) : !canSend}
            style={{ paddingHorizontal: 10, paddingVertical: 9, backgroundColor: (mode ? !!text.trim() && !(mode.kind === "question" && !mode.prompt.trim()) : canSend) ? P.pen : "transparent" }}
          >
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1, color: (mode ? !!text.trim() : canSend) ? "#fff" : P.ink40 }}>
              {sending ? "···" : mode && mode.kind !== "song" ? t("rm.fold.send") : t("ld.send")}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <LeaveATrace open={tracing} actions={TRACES} onPick={onTrace} onClose={() => setTracing(false)} />
    </SafeAreaView>
  );
}
