import { useCallback, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { P, PF } from "../../theme/post";
import { MosaicId } from "../../components/MosaicId";
import { ReportMenu } from "../../components/ReportMenu";
import { Toast } from "../../components/ui";
import { REACTIONS } from "../../data/reactions";
import { dShort, postNo } from "../../lib/format";
import { fetchThreadMessages, sendThreadMessage, setThreadReaction, type ThreadDetail } from "../../lib/db";
import { LETTER_MAX, REPLY_MIN, weightedCount } from "../../lib/weighted-count";

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

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [revealToast, setRevealToast] = useState(false);
  const [reacting, setReacting] = useState(false);

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

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/kindreds"));

  const conv = detail
    ? [{ body: detail.opening, mine: detail.openingFromMe, date: "" }, ...detail.messages].filter((m) => m.body)
    : [];
  const name = detail?.revealed ? detail.otherName || "A kindred" : detail ? `No. ${postNo(detail.other)}` : "…";

  const weight = weightedCount(text);
  const over = weight > LETTER_MAX;
  const canSend = weight >= REPLY_MIN && !over && !sending;

  const onSend = async () => {
    const body = text.trim();
    if (!id || !canSend || !detail) return;
    setSending(true);
    const wasRevealed = detail.revealed;
    const res = await sendThreadMessage(id, body);
    setSending(false);
    if (!res) {
      Alert.alert("Your letter stayed here", "It didn't go out. Try again in a moment.");
      return;
    }
    setText("");
    await load();
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    if (res.revealed && !wasRevealed) setRevealToast(true);
  };

  const react = (emoji: string) => {
    if (!id) return;
    setReacting(false);
    void setThreadReaction(id, emoji);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: GROUND }}>
      {/* header — back · who · report */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingTop: 2, paddingBottom: 8 }}>
        <Pressable onPress={goBack} hitSlop={10} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 22, color: P.ink }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 }}>
          <MosaicId
            seed={detail?.other || "anon"}
            cell={5.5}
            develop={detail ? (detail.revealed ? 1 : 0.15 + 0.85 * (Math.min(detail.otherCount, REVEAL) / REVEAL)) : 0.15}
          />
          <View>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 13, letterSpacing: 1, color: P.ink }}>{name.toUpperCase()}</Text>
            <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1, color: P.ink40, marginTop: 2, textAlign: "center" }}>
              {detail?.revealed ? "NAMES REVEALED" : "COMING INTO VIEW"}
            </Text>
          </View>
        </View>
        <ReportMenu targetUser={detail?.other} context="thread" refId={id} snapshot={detail?.opening} onBlocked={goBack} />
      </View>

      {/* the rule the milestone strip used to carry */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: P.ink }} />

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
              ? new Date(m.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
              : "";
            return (
              <Pressable
                key={i}
                onPress={() => router.push(`/thread/${id}?i=${i}`)}
                style={({ pressed }) => ({ marginBottom: 10, alignItems: m.mine ? "flex-end" : "flex-start", opacity: pressed ? 0.55 : 1 })}
              >
                {showLabel && (
                  <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1, color: P.ink40, marginBottom: 6, marginHorizontal: 2 }}>
                    {m.mine ? "YOU" : name.toUpperCase()}
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

        {/* the only number left is the one that stops a letter going out */}
        {over && (
          <View style={{ alignItems: "center", paddingBottom: 8 }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: P.post }}>
              {weight - LETTER_MAX} OVER THE LIMIT
            </Text>
          </View>
        )}

        {/* one-tap reactions, tucked behind the + */}
        {reacting && (
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, paddingBottom: 8 }}>
            {REACTIONS.map((r) => (
              <Pressable key={r.emoji} onPress={() => react(r.emoji)} hitSlop={4} style={{ width: 38, height: 38, borderWidth: 1, borderColor: P.ink12, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 17 }}>{r.emoji}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* write */}
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingBottom: 14 }}>
          <Pressable
            onPress={() => setReacting((v) => !v)}
            hitSlop={6}
            style={{ width: 40, height: 40, borderWidth: 1, borderColor: reacting ? P.pen : P.ink, backgroundColor: reacting ? P.penWash : "transparent", alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ fontFamily: PF.mono, fontSize: 18, color: reacting ? P.pen : P.ink }}>+</Text>
          </Pressable>
          {/* an underlined field, like Today's — writing looks the same
              wherever you do it */}
          <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: P.ink }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="write your letter…"
              placeholderTextColor={P.ink40}
              multiline
              style={{ maxHeight: 110, paddingTop: 10, paddingBottom: 10, fontFamily: PF.letter, fontSize: 16, lineHeight: 23, color: P.ink }}
            />
          </View>
          <Pressable
            onPress={onSend}
            disabled={!canSend}
            style={{ paddingHorizontal: 10, paddingVertical: 9, backgroundColor: canSend ? P.pen : "transparent" }}
          >
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1, color: canSend ? "#fff" : P.ink40 }}>SEND</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {revealToast && <Toast msg="you're no longer strangers." bottom={150} />}
    </SafeAreaView>
  );
}
