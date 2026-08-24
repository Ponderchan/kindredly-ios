import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { P, PF } from "../../theme/post";
import { CorrespondentFace } from "../../components/CorrespondentFace";
import { ReportMenu } from "../../components/ReportMenu";
import { dShort } from "../../lib/format";
import { fetchThreadMessages, sendThreadMessage, type ThreadDetail } from "../../lib/db";
import { readCorrespondent, theyify } from "../../lib/correspondent";
import { noticeThings } from "../../lib/notice";
import { WrenBird } from "../../components/WrenBird";
import { useWrenName } from "../../lib/wren-name";
import { LETTER_MAX, REPLY_MIN, weightedCount } from "../../lib/weighted-count";

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const wren = useWrenName();

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

  const name = detail?.otherName || "A kindred";
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
     One at a time, the rarest thing first: she is a messenger who leaves
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

  const onSend = async () => {
    const body = text.trim();
    if (!id || !canSend) return;
    setSending(true);
    const res = await sendThreadMessage(id, body);
    setSending(false);
    if (!res) {
      Alert.alert("It stayed here", "That didn't go out. Try again in a moment.");
      return;
    }
    setText("");
    await load();
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
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
            {!!read?.archetype && (
              <Text style={{ fontFamily: PF.serifItalic, fontSize: 12, color: P.ink40, marginTop: 1 }}>
                {theyify(read.archetype.name)}
              </Text>
            )}
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
                    {m.mine ? "YOU" : name.toUpperCase()}
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
                {wren.toUpperCase()} NOTICED
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
            {weight - LETTER_MAX} OVER THE LIMIT
          </Text>
        )}

        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 22, paddingBottom: 14 }}>
          <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: P.ink12 }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={`say something to ${name}…`}
              placeholderTextColor={P.ink40}
              multiline
              style={{ maxHeight: 110, paddingTop: 10, paddingBottom: 10, fontFamily: PF.letter, fontSize: 16.5, lineHeight: 24, color: P.ink }}
            />
          </View>
          <Pressable
            onPress={onSend}
            disabled={!canSend}
            style={{ paddingHorizontal: 10, paddingVertical: 9, backgroundColor: canSend ? P.pen : "transparent" }}
          >
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1, color: canSend ? "#fff" : P.ink40 }}>
              {sending ? "···" : "SEND"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
