import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GlyphInput } from "../../components/GlyphInput";
import { archNameThird } from "../../lib/aura-copy";
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, InteractionManager } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { getLang, t, useLang, t as tr } from "../../lib/i18n";
import { P, PF } from "../../theme/post";
import { CorrespondentFace } from "../../components/CorrespondentFace";
import { ReportMenu } from "../../components/ReportMenu";
import { dLong, dShort } from "../../lib/format";
import { fetchThreadMessages, readThreadDetailCache, sendThreadMessage, uploadMoment, type ThreadDetail, type ThreadMessage } from "../../lib/db";
import { answerFold, fetchFolds, leaveFold, type Fold } from "../../lib/folds";
import { fetchSongTitle, parseSongUrl } from "../../lib/song";
import { sharedSongs, songNotice } from "../../lib/shared-songs";
import { markMomentUsed, momentUsedToday, shotToday } from "../../lib/daily-moment";
import { saveToLore } from "../../lib/lore";
import { markRoomSeen } from "../../lib/room-seen";
import { markNoticeSeen, readNoticesSeen } from "../../lib/notice-seen";
import { useEntitlement } from "../../lib/entitlement";
import { isExpired, quietDays } from "../../lib/kindred-expiry";
import { markWork } from "../../lib/stall-probe";
import { DEMO_TEXT, storeMode } from "../../lib/dev-store";
import * as ImagePicker from "expo-image-picker";
import { MediaImage } from "../../lib/media";
import { PhotoLightbox, type LightboxPhoto } from "../../components/PhotoLightbox";
import { Image, Linking, Modal } from "react-native";
import { TraceTray, type TraceAction } from "../../components/LeaveATrace";
import { PlusGlyph } from "../../components/ComposeTray";
import { useThreadLive } from "../../lib/live";
import { refreshFingerprint } from "../../lib/aura";
import { readCorrespondent, theyify } from "../../lib/correspondent";
import { noticeThings } from "../../lib/notice";
import { STAMPS, sname } from "../../data/stamps";
import { WrenBird } from "../../components/WrenBird";
import { useWrenName } from "../../lib/wren-name";
import { LETTER_MAX, REPLY_MIN, weightedCount } from "../../lib/weighted-count";
import { fieldBox } from "../../lib/field";
import { alertFail } from "../../lib/fail";

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
   · bubbles, since 2026-09-20 (owner): yours right in pen blue, theirs
     left on grey. Two voices in one ink were too hard to tell apart

   What is always present: their mark at the top. You are in THEIR room.

   NOT AN INBOX. There is no typing indicator, no read receipt, no
   presence. Nothing here reports on the other person's attention. */
export default function RoomScreen() {
  useLang(); // repaint on language change
  const { id, expired: expiredParam } = useLocalSearchParams<{ id: string; expired?: string }>();
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
  /* DEMO ROOMS DO NOT REACH THE DATABASE. The fixtures exist so every
     state can be seen on a simulator; on a real phone they sit in Kindreds
     looking like rooms, and every write from one was rejected by RLS with
     "That didn't go out. Try again in a moment." — an error that blames
     the network for a room that was never real. Demo writes now land in
     local state, which is the only honest thing a fixture can do. */
  const isDemo = !!id?.startsWith("demo-");
  const [shelf, setShelf] = useState(false);
  const [photoFull, setPhotoFull] = useState<LightboxPhoto>(null);
  const [momentSpent, setMomentSpent] = useState(false);

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
    markWork("room:load");
    if (__DEV__ && id.startsWith("demo-")) {
      const { DEMO_DETAILS } = await import("../../data/demo");
      const base = DEMO_DETAILS[id] ?? null;
      if (storeMode && base && id === "demo-mira") {
        const d = DEMO_TEXT[getLang()];
        const h = 3600_000;
        const at = (ago: number) => new Date(Date.now() - ago * h).toISOString();
        setDetail({
          ...base,
          opening: d.letter,
          messages: [
            { body: d.b1, mine: false, date: at(80) },
            { body: d.b2, mine: true, date: at(64) },
            { body: d.b3, mine: false, date: at(40) },
            { body: d.b4, mine: true, date: at(30) },
            { body: d.b5, mine: false, date: at(2) },
          ],
        });
        return;
      }
      setDetail(base);
      // every fold state the room can render, for eyes-on verification
      setDetail((d) =>
        d
          ? {
              ...d,
              messages: [
                ...d.messages,
                { body: "Nightcall — https://open.spotify.com/track/demo1", mine: false, date: "2026-08-29T23:40:00Z", kind: "song", meta: { url: "https://open.spotify.com/track/demo1", title: "Nightcall" } },
                { body: "Motion Picture Soundtrack — https://youtu.be/demo2", mine: true, date: "2026-08-30T01:10:00Z", kind: "song", meta: { url: "https://youtu.be/demo2", title: "Motion Picture Soundtrack" } },
                { body: "Alaska — https://open.spotify.com/track/demo3", mine: false, date: "2026-08-31T02:05:00Z", kind: "song", meta: { url: "https://open.spotify.com/track/demo3", title: "Alaska" } },
                // a tiny moment, so the photo and its lightbox can be checked by eye
                { body: t("rm.moment.fallback"), mine: false, date: "2026-08-31T03:00:00Z", kind: "photo", meta: { url: Image.resolveAssetSource(require("../../../assets/icon.png")).uri } },
              ],
            }
          : d,
      );
      setFolds([
        { id: "df-1", mine: false, kind: "note", prompt: null, parentId: null, body: null, date: "2026-08-30T09:00:00Z" },
        { id: "df-2", mine: true, kind: "question", prompt: "the song you replay and never post?", parentId: null, body: "the one i sent you, obviously", date: "2026-08-30T21:00:00Z" },
        { id: "df-3", mine: true, kind: "note", prompt: null, parentId: null, body: "i almost moved home in march.", date: "2026-08-31T08:00:00Z" },
        { id: "df-4", mine: false, kind: "note", prompt: null, parentId: "df-3", body: "i almost didn't move here at all.", date: "2026-08-31T09:00:00Z" },
      ]);
      return;
    }
    // the last read first, so the room is there when you are; the fetch replaces it
    const cached = await readThreadDetailCache(id);
    if (cached) setDetail((cur) => cur ?? cached);
    const [d, f, spent] = await Promise.all([fetchThreadMessages(id), fetchFolds(id), momentUsedToday(id)]);
    setDetail(d);
    if (d) void markRoomSeen(id, d.otherCount); // what's on screen now is read
    if (f) setFolds(f);
    setMomentSpent(spent);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  // the room hears the server: their message, their reaction, live
  useThreadLive(id, load);

  const name = detail?.otherName || t("cm.kindred");
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
      setRead(readCorrespondent(theirs, true));
    });
    return () => task.cancel();
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

  /* ONE VISIT, THEN GONE (owner, 2026-09-20). The notice she leaves is
     for this visit: it is marked seen when you leave the room (or at the
     ×), and it does not come back unless there is a new one. */
  const [seenNotices, setSeenNotices] = useState<string[] | null>(null);
  useEffect(() => {
    let alive = true;
    if (id) readNoticesSeen(id).then((l) => alive && setSeenNotices(l));
    return () => {
      alive = false;
    };
  }, [id]);
  const notice = seenNotices ? notices.find((n) => !seenNotices.includes(n.id)) ?? null : null;
  const noticeRef = useRef<string | null>(null);
  noticeRef.current = notice?.id ?? null;
  useEffect(
    () => () => {
      if (id && noticeRef.current) void markNoticeSeen(id, noticeRef.current);
    },
    [id],
  );
  const dismissNotice = () => {
    if (!id || !notice) return;
    void markNoticeSeen(id, notice.id);
    setSeenNotices((s) => [...(s || []), notice.id]);
  };

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

  const songs = useMemo(() => sharedSongs(detail?.messages ?? []), [detail]);
  const songSays = useMemo(() => songNotice(songs), [songs]);

  const weight = weightedCount(text);
  const over = weight > LETTER_MAX;
  const canSend = weight >= REPLY_MIN && !over && !sending;

  /* EXPIRED (owner, 2026-09-20; lib/kindred-expiry): thirty days without
     a word here and the bar gives way to REKINDLE. Reading stays. The
     last word is the newest message either way, or the day the room
     opened; the demo rooms are exempt so the simulator keeps its bar. */
  const { premium } = useEntitlement();
  const lastAt = useMemo(() => {
    if (!detail) return Date.now();
    const dates = detail.messages.map((m) => Date.parse(m.date)).filter((n) => Number.isFinite(n));
    if (dates.length) return Math.max(...dates);
    return detail.since ? Date.parse(detail.since) : Date.now();
  }, [detail]);
  // dev: ?expired=1 on a demo room shows the closed door without waiting a month
  const expired = !!detail && ((!isDemo && isExpired(lastAt, premium)) || (__DEV__ && expiredParam === "1"));

  /* OPTIMISTIC for plain lines; folds and media go through load() because
     their truth (sealed/open, upload) lives server-side. */
  const onSend = async () => {
    const body = text.trim();
    if (!id || sending) return;

    if (mode?.kind === "note" || mode?.kind === "question" || mode?.kind === "answer") {
      if (!body) return;
      if (isDemo) {
        setFolds((f) => [
          ...f,
          mode.kind === "answer"
            ? { id: `d-${Date.now()}`, mine: true, kind: mode.fold.kind, prompt: null, parentId: mode.fold.id, body, date: new Date().toISOString() }
            : { id: `d-${Date.now()}`, mine: true, kind: mode.kind, prompt: mode.kind === "question" ? mode.prompt : null, parentId: null, body, date: new Date().toISOString() },
        ]);
        setText("");
        setMode(null);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
        return;
      }
      setSending(true);
      const ok =
        mode.kind === "answer"
          ? await answerFold(id, mode.fold, body)
          : await leaveFold(id, mode.kind, body, mode.kind === "question" ? mode.prompt : undefined);
      setSending(false);
      if (!ok) {
        alertFail(t("rm.fail.title"), t("rm.fail.body"));
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
      if (isDemo) {
        setDetail((d) => (d ? { ...d, messages: [...d.messages, { body: fallback, mine: true, date: new Date().toISOString(), kind: "song", meta: { url: card.url, title: title ?? undefined } }] } : d));
        setSending(false);
        setText("");
        setMode(null);
        return;
      }
      const res = await sendThreadMessage(id, fallback, { kind: "song", meta: { url: card.url, title: title ?? undefined } });
      setSending(false);
      if (!res) {
        alertFail(t("rm.fail.title"), t("rm.fail.body"));
        return;
      }
      setText("");
      setMode(null);
      void load();
      return;
    }

    /* A LINK PASTED WITHOUT THE MENU IS STILL A SONG. Nobody opens a
       drawer first — they paste. If a plain line is nothing but a song
       link, it travels as one. */
    const bare = parseSongUrl(body);
    if (bare && body.replace(bare.url, "").trim().length === 0) {
      setSending(true);
      const title = await fetchSongTitle(bare);
      if (isDemo) {
        setDetail((d) => (d ? { ...d, messages: [...d.messages, { body: `${title ? title + " — " : ""}${bare.url}`, mine: true, date: new Date().toISOString(), kind: "song", meta: { url: bare.url, title: title ?? undefined } }] } : d));
        setSending(false);
        setText("");
        return;
      }
      const res = await sendThreadMessage(id, `${title ? title + " — " : ""}${bare.url}`, {
        kind: "song",
        meta: { url: bare.url, title: title ?? undefined },
      });
      setSending(false);
      if (!res) {
        alertFail(t("rm.fail.title"), t("rm.fail.body"));
        return;
      }
      setText("");
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
    if (isDemo) {
      setSending(false);
      return;
    }
    const res = await sendThreadMessage(id, body);
    setSending(false);
    if (!res) {
      setText(body);
      void load();
      alertFail(t("rm.fail.title"), t("rm.fail.body"));
      return;
    }
    void refreshFingerprint();
    // the realtime echo of our own INSERT re-runs load() and reconciles
  };

  /* A TINY MOMENT IS RATIONED LIKE FILM: one frame a day, and the shutter
     has to have been pressed today. An unlimited photo button is a chat
     app's photo button; this product is not one. Absent EXIF is trusted —
     refusing a privacy-stripped image would punish the wrong instinct. */
  const sendMoment = async () => {
    if (!id || sending) return;
    if (momentSpent && !isDemo) {
      Alert.alert(t("rm.moment.spentTitle"), t("rm.moment.spentBody"));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, exif: true });
    if (res.canceled || !res.assets?.[0]?.uri) return;
    if (!shotToday(res.assets[0].exif)) {
      Alert.alert(t("rm.moment.oldTitle"), t("rm.moment.oldBody"));
      return;
    }
    if (isDemo) {
      const local = res.assets[0].uri;
      setDetail((d) => (d ? { ...d, messages: [...d.messages, { body: t("rm.moment.fallback"), mine: true, date: new Date().toISOString(), kind: "photo", meta: { url: local } }] } : d));
      return;
    }
    setSending(true);
    const path = await uploadMoment(res.assets[0].uri);
    const ok = path ? await sendThreadMessage(id, t("rm.moment.fallback"), { kind: "photo", mediaPath: path }) : null;
    setSending(false);
    if (!ok) {
      alertFail(t("rm.fail.title"), t("rm.fail.body"));
      return;
    }
    await markMomentUsed(id);
    setMomentSpent(true);
    void load();
  };

  const TRACES: TraceAction[] = [
    { id: "note", title: t("rm.note.t"), sub: t("rm.note.s") },
    { id: "ask", title: t("rm.ask.t"), sub: t("rm.ask.s") },
    { id: "moment", title: t("rm.moment.t"), sub: t("rm.moment.s") },
    { id: "song", title: t("rm.song.t"), sub: t("rm.song.s") },
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
            const photoPath = m.kind === "photo" ? m.mediaPath ?? null : null;
            const photoUri = m.kind === "photo" && !m.mediaPath ? m.meta?.url ?? null : null;
            const url = photoPath || photoUri;
            const song = m.kind === "song" && !!m.meta?.url;
            const card = !!url || song;
            /* BUBBLES, ONE SIDE EACH (owner, 2026-09-20). The room used to
               read as a transcript — a label, then the words, both sides
               flush left — and two voices in the same ink were hard to tell
               apart at a glance. Yours sit right in pen blue, theirs sit
               left on grey; no labels, the sides say it. */
            const prevMsg = prev?.type === "msg";
            return (
              <View key={`m-${i}`}>
                {dayRule}
                <View style={{ alignItems: m.mine ? "flex-end" : "flex-start", marginTop: prevMsg && !newDay ? 6 : 0, marginBottom: 2 }}>
                  {url ? (
                    <Pressable onPress={() => setPhotoFull({ path: photoPath, uri: photoUri })} accessibilityRole="imagebutton" accessibilityLabel={t("ph.open")} style={{ width: "70%", marginBottom: 4 }}>
                      <MediaImage path={photoPath} uri={photoUri} style={{ width: "100%", aspectRatio: 1, borderRadius: 16, backgroundColor: "#EFEDE6" }} />
                    </Pressable>
                  ) : song ? (
                    <Pressable
                      onPress={() => Linking.openURL(m.meta!.url!)}
                      onLongPress={() => setShelf(true)}
                      delayLongPress={350}
                      style={{ maxWidth: "86%", borderWidth: 1, borderColor: m.mine ? P.pen : P.ink12, borderRadius: 16, padding: 12, marginBottom: 4, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: m.mine ? P.penWash : "#FFFFFF" }}
                    >
                      <Text style={{ fontSize: 17 }}>🎵</Text>
                      <View style={{ flexShrink: 1 }}>
                        <Text numberOfLines={1} style={{ fontFamily: PF.monoMed, fontSize: 12.5, color: P.ink }}>
                          {m.meta!.title || t("rm.song.card")}
                        </Text>
                        <Text numberOfLines={1} style={{ fontFamily: PF.mono, fontSize: 9.5, color: P.ink40, marginTop: 2 }}>
                          {m.meta!.url!.replace(/^https?:\/\//, "").split("/")[0]}
                        </Text>
                      </View>
                      <Text style={{ fontFamily: PF.mono, fontSize: 12, color: P.pen }}>›</Text>
                    </Pressable>
                  ) : null}
                  {!card && (
                    <Pressable
                      onLongPress={() => !m.mine && keep(m.body, null, m.date)}
                      delayLongPress={350}
                      style={{
                        maxWidth: "84%",
                        backgroundColor: m.mine ? P.pen : "#F3F2FA",
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 18,
                        borderBottomRightRadius: m.mine ? 5 : 18,
                        borderBottomLeftRadius: m.mine ? 18 : 5,
                      }}
                    >
                      <Text style={{ fontFamily: PF.letter, fontSize: 16, lineHeight: 23, color: m.mine ? "#FFFFFF" : P.ink }}>{m.body}</Text>
                    </Pressable>
                  )}
                  {song && songs.length >= 2 && conv[conv.length - 1] === m && (
                    <Pressable onPress={() => setShelf(true)} hitSlop={6} style={{ marginTop: 4, marginBottom: 6 }}>
                      <Text style={{ fontFamily: PF.monoMed, fontSize: 10.5, letterSpacing: 1, color: P.pen }}>
                        {t("rm.shelf.open", { n: String(songs.length) })} ›
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* she leaves one thing on the table, at the foot of the room */}
        {!!notice && (
          <View style={{ marginHorizontal: 22, marginBottom: 10, borderWidth: 1, borderColor: P.ink12, padding: 13 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <WrenBird size={20} mood="curious" />
              <Text style={{ fontFamily: PF.monoMed, fontSize: 9, letterSpacing: 1.2, color: P.ink40 }}>
                {tr("rm.noticed", { wren: wren.toUpperCase() })}
              </Text>
              <View style={{ flex: 1 }} />
              <Text style={{ fontFamily: PF.mono, fontSize: 8.5, letterSpacing: 1, color: P.ink40, flexShrink: 1, textAlign: "right" }}>
                {notice.evidence}
              </Text>
              <Pressable onPress={dismissNotice} hitSlop={10} style={{ marginLeft: 4 }}>
                <Text style={{ fontFamily: PF.mono, fontSize: 13, color: P.ink40 }}>×</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 7 }}>
              <Text style={{ fontFamily: PF.letter, fontSize: 15.5, lineHeight: 23, color: P.ink }}>{notice.line}</Text>
              {!!notice.word && (
                <View style={{ borderWidth: 1.5, borderColor: P.pen, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: P.penWash }}>
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, color: P.pen }}>#{notice.word}</Text>
                </View>
              )}
            </View>
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

        {/* NOBODY HOME — the same guard chat/[id] already had. A kindred can
            delete their account, and 0009 nulls their side of the thread
            rather than taking the letters with it. The room stayed fully
            operable: the tray opened, the composer accepted words, and only
            the send failed, with a dialog blaming the moment. It stays
            readable; it stops being somewhere you can leave things. */}
        {detail?.gone ? (
          <View style={{ paddingHorizontal: 26, paddingTop: 6, paddingBottom: 22 }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 11.5, lineHeight: 18, letterSpacing: 0.3, color: P.ink40, textAlign: "center" }}>
              {t("ch.gone")}
            </Text>
          </View>
        ) : expired ? (
          <View style={{ marginHorizontal: 22, marginBottom: 16, borderWidth: 1, borderColor: P.ink12, padding: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <WrenBird size={20} mood="think" />
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 1.2, color: P.ink40 }}>{t("kd.expiredRow", { n: quietDays(lastAt) })}</Text>
            </View>
            <Text style={{ fontFamily: PF.letter, fontSize: 15, lineHeight: 22, color: P.ink, marginTop: 8 }}>{t("rm.expired.body")}</Text>
            <Pressable onPress={() => router.push("/paywall?src=rekindle")} style={({ pressed }) => ({ marginTop: 12, backgroundColor: P.ink, paddingVertical: 14, alignItems: "center", opacity: pressed ? 0.85 : 1 })}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.6, color: "#FFFFFF" }}>{t("rm.rekindle")}</Text>
            </Pressable>
          </View>
        ) : (
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 14, paddingBottom: 14 }}>
          {/* THE BAR IS A MESSAGING BAR NOW (owner, 2026-09-20): the courier
              on the left — she brings a question when asked — the field as
              a pill, the ⊕ on the right where a send key used to sit. There
              is no send key: the keyboard's own blue SEND sends, the way
              every chat on the phone does. The ⊕ still opens the things to
              LEAVE (a note, a question, a moment, a song), not to attach. */}
          <Pressable
            onPress={seedQuestion}
            hitSlop={6}
            style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: P.ink, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}
          >
            <WrenBird size={24} mood="curious" />
          </Pressable>
          <View style={{ flex: 1, borderRadius: 20, backgroundColor: "#F3F2FA", paddingHorizontal: 14 }}>
            <GlyphInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              onFocus={() => setTracing(false)}
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
              returnKeyType="send"
              submitBehavior="submit"
              onSubmitEditing={() => {
                if (sending) return;
                if (mode ? !text.trim() || (mode.kind === "question" && !mode.prompt.trim()) : !canSend) return;
                void onSend();
              }}
              autoCapitalize={mode?.kind === "song" ? "none" : "sentences"}
              style={{ ...fieldBox(text, 24, 110), paddingTop: 9, paddingBottom: 9, fontFamily: PF.writing, fontSize: 16, lineHeight: 24, color: P.ink }}
            />
          </View>
          <Pressable
            onPress={() => {
              /* the tray takes the keyboard's place: choosing something to
                 leave is not something you do mid-sentence */
              Keyboard.dismiss();
              setTracing((v) => !v);
            }}
            hitSlop={6}
            style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: P.ink, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}
          >
            <PlusGlyph size={24} open={tracing} color={tracing ? P.pen : P.ink} />
          </Pressable>
        </View>
        )}
        {tracing && !detail?.gone && !expired && <TraceTray actions={TRACES} onPick={onTrace} />}
      </KeyboardAvoidingView>


      {/* THE SHELF — every song either of you left, in order. A song in a
          scroll is gone by tomorrow; gathered, the same messages become
          what this product is for: accumulated evidence that you are
          alike, curated by nobody. */}
      <PhotoLightbox photo={photoFull} onClose={() => setPhotoFull(null)} />
      <Modal visible={shelf} transparent animationType="slide" onRequestClose={() => setShelf(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(17,17,19,0.32)", justifyContent: "flex-end" }}>
          <Pressable style={{ flex: 1 }} onPress={() => setShelf(false)} />
          <View style={{ backgroundColor: P.paper, maxHeight: "72%", paddingBottom: 28 }}>
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 22, paddingTop: 18, paddingBottom: 12 }}>
              <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 11.5, letterSpacing: 1.6, color: P.ink }}>
                {t("rm.shelf.title", { name: name.toUpperCase() })}
              </Text>
              <Pressable onPress={() => setShelf(false)} hitSlop={10}>
                <Text style={{ fontFamily: PF.mono, fontSize: 16, color: P.ink40 }}>✕</Text>
              </Pressable>
            </View>
            {!!songSays && (
              <View style={{ marginHorizontal: 22, marginBottom: 12, borderWidth: 1, borderColor: P.ink12, padding: 11, flexDirection: "row", alignItems: "center", gap: 9 }}>
                <WrenBird size={18} mood="curious" />
                <Text style={{ flex: 1, fontFamily: PF.letter, fontSize: 14, lineHeight: 20, color: P.ink }}>
                  {t(songSays.line === "late" ? "rm.shelf.late" : "rm.shelf.both", { name })}
                </Text>
                <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1, color: P.ink40 }}>{songSays.evidence}</Text>
              </View>
            )}
            <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 8 }}>
              {songs.map((sg) => (
                <Pressable
                  key={sg.url}
                  onPress={() => Linking.openURL(sg.url)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: P.ink12 }}
                >
                  <Text style={{ fontSize: 15 }}>🎵</Text>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontFamily: PF.letter, fontSize: 15, color: P.ink }}>
                      {sg.title || sg.url.replace(/^https?:\/\//, "").split("/")[0]}
                    </Text>
                    <Text style={{ fontFamily: PF.mono, fontSize: 8.5, letterSpacing: 1, color: P.ink40, marginTop: 3 }}>
                      {(sg.mine ? tr("ui.you") : name).toUpperCase()} · {dShort(sg.at).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: PF.mono, fontSize: 12, color: P.pen }}>›</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
