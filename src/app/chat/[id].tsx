import { useCallback, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { C, F } from "../../theme/tokens";
import { ReportMenu } from "../../components/ReportMenu";
import { StrangerAvatar } from "../../components/StrangerAvatar";
import { Toast } from "../../components/ui";
import { REACTIONS } from "../../data/reactions";
import { dShort, postNo } from "../../lib/format";
import { fetchThreadMessages, sendThreadMessage, setThreadReaction, type ThreadDetail } from "../../lib/db";
import { LETTER_MAX, REPLY_MIN, weightedCount } from "../../lib/weighted-count";

/* The correspondence, seen from Kindreds: a slow chat. The whole back-and-forth
   as bubbles, a milestone strip walking VOICE → RHYTHM → RESONANCE → NAME, and
   a letter-writing field at the bottom. Today's envelope still opens the letter
   as an object (thread/[id]); this is the relationship view. */

const GROUND = "#ECEBF4";
const REVEAL = 5;
// what each letter earns you on the way to a name
const STAGES: [string, number][] = [
  ["VOICE", 1],
  ["RHYTHM", 2],
  ["RESONANCE", 4],
  ["NAME", REVEAL],
];

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
  const mine = detail?.myCount ?? 0;
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
          <Text style={{ fontSize: 24, color: C.ink }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 }}>
          <StrangerAvatar seed={detail?.other || "anon"} size={30} round />
          <View>
            <Text style={{ fontFamily: F.serif, fontSize: 17, color: C.ink }}>{name}</Text>
            <Text style={{ fontFamily: F.sansBold, fontSize: 8.5, letterSpacing: 1.2, color: "#8B84B8", marginTop: 1 }}>
              {detail?.revealed ? "NAMES REVEALED" : `${Math.min(mine, REVEAL)}/5 LETTERS`}
            </Text>
          </View>
        </View>
        <ReportMenu targetUser={detail?.other} context="thread" refId={id} snapshot={detail?.opening} onBlocked={goBack} />
      </View>

      {/* milestones — what the letters are earning */}
      <View style={{ flexDirection: "row", justifyContent: "space-evenly", paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#DDD9EC" }}>
        {(() => {
          const firstUndone = STAGES.findIndex(([label, t]) => (label === "NAME" ? !detail?.revealed : mine < t));
          return STAGES.map(([label, t], i) => {
            const done = label === "NAME" ? !!detail?.revealed : mine >= t;
            const active = !done && i === firstUndone;
            return (
              <View key={label} style={{ alignItems: "center", gap: 5 }}>
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: done ? C.purpleMid : active ? C.purple : "#fff",
                    borderWidth: done || active ? 0 : 1.5,
                    borderColor: "#CFC9E8",
                  }}
                >
                  {done && <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>✓</Text>}
                </View>
                <Text style={{ fontFamily: F.sansBold, fontSize: 7.5, letterSpacing: 1, color: active ? C.purple : done ? "#8B84B8" : C.faint }}>{label}</Text>
              </View>
            );
          });
        })()}
      </View>

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
              <View key={i} style={{ marginBottom: 10, alignItems: m.mine ? "flex-end" : "flex-start" }}>
                {showLabel && (
                  <Text style={{ fontFamily: F.sansBold, fontSize: 8.5, letterSpacing: 1.2, color: C.faint, marginBottom: 5, marginHorizontal: 4 }}>
                    {m.mine ? "YOU" : name.toUpperCase()}
                    {day ? ` · ${day}` : ""}
                  </Text>
                )}
                <View
                  style={{
                    maxWidth: "84%",
                    backgroundColor: m.mine ? "#DDDEF9" : "#fff",
                    borderRadius: 16,
                    [m.mine ? "borderTopRightRadius" : "borderTopLeftRadius"]: 5,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ fontFamily: F.letter, fontSize: 15, lineHeight: 22, color: "#26232E" }}>{m.body}</Text>
                  {!!time && (
                    <Text style={{ fontFamily: F.sans, fontSize: 8.5, color: "#A39DBD", alignSelf: "flex-end", marginTop: 4 }}>{time}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* progress to a name */}
        {detail && !detail.revealed && (
          <View style={{ alignItems: "center", paddingBottom: 8 }}>
            <Text style={{ fontFamily: F.sansBold, fontSize: 8.5, letterSpacing: 1.4, color: over ? "#C0503A" : "#8B84B8" }}>
              {over ? `${weight - LETTER_MAX} OVER THE LIMIT` : `${Math.min(mine, REVEAL)} / 5 LETTERS EXCHANGED`}
            </Text>
            <View style={{ width: 92, height: 3, borderRadius: 2, backgroundColor: "#D8D4EA", marginTop: 5, overflow: "hidden" }}>
              <View style={{ width: `${Math.min(100, (mine / REVEAL) * 100)}%`, height: 3, backgroundColor: C.purpleMid }} />
            </View>
          </View>
        )}

        {/* one-tap reactions, tucked behind the + */}
        {reacting && (
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, paddingBottom: 8 }}>
            {REACTIONS.map((r) => (
              <Pressable key={r.emoji} onPress={() => react(r.emoji)} hitSlop={4} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
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
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: reacting ? C.purpleLt : "#fff", alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ fontSize: 20, color: "#6B658C", marginTop: -2 }}>+</Text>
          </Pressable>
          <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 22 }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Write your letter…"
              placeholderTextColor="#A39DBD"
              multiline
              style={{ maxHeight: 110, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontFamily: F.letter, fontSize: 15, lineHeight: 21, color: C.ink }}
            />
          </View>
          <Pressable
            onPress={onSend}
            disabled={!canSend}
            style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.purple, alignItems: "center", justifyContent: "center", opacity: canSend ? 1 : 0.35 }}
          >
            <Svg width={17} height={17} viewBox="0 0 18 18">
              <Path d="M3 9h11M9.5 4l5 5-5 5" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {revealToast && <Toast msg="you're no longer strangers." bottom={150} />}
    </SafeAreaView>
  );
}
