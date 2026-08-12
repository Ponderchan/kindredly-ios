import { useCallback, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { C, F, cardStyle, shadow } from "../../theme/tokens";
import { ReportMenu } from "../../components/ReportMenu";
import { StampTile } from "../../components/StampTile";
import { Toast } from "../../components/ui";
import { AudioCard } from "../../components/AudioCard";
import { getStamp } from "../../data/stamps";
import { REACTIONS, reactionLabel } from "../../data/reactions";
import { postNo } from "../../lib/format";
import {
  clearThreadReaction,
  fetchThreadMessages,
  sendThreadMessage,
  setThreadReaction,
  voiceLetterUrl,
  type ThreadDetail,
} from "../../lib/db";
import { translate } from "../../lib/wren";
import { useEntitlement } from "../../lib/entitlement";

const REVEAL_AT = 5;
const PAPER = "#FBF8F0";

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const { premium } = useEntitlement();
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [sending, setSending] = useState(false);
  const [revealToast, setRevealToast] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [reply, setReply] = useState("");
  const [myR, setMyR] = useState<string | null>(null);
  const [xl, setXl] = useState<string | null>(null);
  const [xlOn, setXlOn] = useState(false);
  const [xlBusy, setXlBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    if (__DEV__ && id.startsWith("demo-")) {
      const { DEMO_DETAILS } = await import("../../data/demo");
      setDetail(DEMO_DETAILS[id] ?? null);
      return;
    }
    const d = await fetchThreadMessages(id);
    setDetail(d);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onSend = async () => {
    const text = reply.trim();
    if (!id || sending || text.length < 1) return;
    setSending(true);
    const wasRevealed = detail?.revealed;
    const res = await sendThreadMessage(id, text);
    setSending(false);
    if (!res) {
      Alert.alert("Your letter stayed here", "It didn't go out. Try again in a moment.");
      return;
    }
    setReply("");
    await load();
    if (res.revealed && !wasRevealed) setRevealToast(true);
  };

  const react = (emoji: string) => {
    if (!id) return;
    if (myR === emoji) {
      setMyR(null);
      void clearThreadReaction(id);
    } else {
      setMyR(emoji);
      void setThreadReaction(id, emoji);
    }
  };

  const conv = detail
    ? [{ body: detail.opening, mine: detail.openingFromMe, date: "" }, ...detail.messages].filter((m) => m.body)
    : [];
  const alias = detail ? `No. ${postNo(detail.other)}` : "…";
  const stamp = getStamp(detail?.stamp);
  const remaining = detail ? Math.max(0, REVEAL_AT - detail.myCount) : REVEAL_AT;
  const hero = conv[conv.length - 1] ?? null;
  const earlier = conv.slice(0, -1);

  const doTranslate = async () => {
    if (!hero) return;
    if (xl) {
      setXlOn((v) => !v);
      return;
    }
    if (xlBusy) return;
    setXlBusy(true);
    const to = (Intl.DateTimeFormat().resolvedOptions().locale || "en").split("-")[0];
    const t = await translate(hero.body, to);
    setXlBusy(false);
    if (t) {
      setXl(t);
      setXlOn(true);
    } else Alert.alert("Wren couldn't translate this", "Try again in a moment.");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }}>
      {/* header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 24, color: "#5A5344" }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: F.sansExtra, fontSize: 10.5, letterSpacing: 1, color: "#9A8B6A", textAlign: "center", flex: 1 }}>
          LETTER {conv.length} OF THIS THREAD · NO. {detail ? postNo(detail.other) : "…"}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable onPress={doTranslate} hitSlop={8} style={{ width: 36, height: 42, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 18, opacity: xlBusy ? 0.4 : 1 }}>{xlOn ? "🕊" : "🌐"}</Text>
          </Pressable>
          <ReportMenu targetUser={detail?.other} context="thread" refId={id} snapshot={detail?.opening} onBlocked={() => router.back()} />
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
          {/* earlier letters (collapsed) */}
          {earlier.length > 0 && !expanded && (
            <Pressable onPress={() => setExpanded(true)} style={{ alignItems: "center", paddingVertical: 12 }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, color: C.purple }}>read the {earlier.length} before ↑</Text>
            </Pressable>
          )}
          {expanded &&
            earlier.map((m, i) => (
              <View
                key={i}
                style={{ backgroundColor: m.mine ? "#F1EEE4" : "#fff", borderRadius: 16, padding: 18, marginBottom: 10, marginLeft: m.mine ? 30 : 0, marginRight: m.mine ? 0 : 30 }}
              >
                <Text style={{ fontFamily: F.letter, fontSize: 15.5, lineHeight: 25, color: "#3A3630" }}>{m.body}</Text>
                <Text style={{ fontFamily: F.sans, fontSize: 11, color: C.faint, marginTop: 8 }}>{m.mine ? "You" : alias}</Text>
              </View>
            ))}

          {/* hero — the latest letter */}
          {hero && (
            <View style={[{ backgroundColor: "#fff", borderRadius: 22, padding: 24, paddingTop: 26, marginTop: 6 }, shadow.card]}>
              {stamp && (
                <View style={{ position: "absolute", top: -6, right: 16, transform: [{ rotate: "7deg" }] }}>
                  <StampTile id={detail!.stamp} w={50} r={5} />
                </View>
              )}
              {detail?.openingMedia && conv.length === 1 ? (
                <AudioCard url={voiceLetterUrl(detail.openingMedia) || ""} durationS={detail.openingDurationS} compact />
              ) : (
                <Text style={{ fontFamily: F.letter, fontSize: 21, lineHeight: 33, color: "#22222A", paddingRight: hero.mine ? 0 : 40 }}>
                  {xlOn && xl ? xl : hero.body}
                </Text>
              )}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
                {stamp ? (
                  <View style={{ backgroundColor: `${stamp.color}18`, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 6 }}>
                    <Text style={{ fontFamily: F.sansBold, fontSize: 11.5, color: stamp.color }}>#{stamp.name.en.toLowerCase()}</Text>
                  </View>
                ) : (
                  <View />
                )}
                {xlOn && xl && <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.faint }}>translated by Wren</Text>}
              </View>
            </View>
          )}

          {/* progress to names */}
          {detail && !detail.revealed && detail.myCount > 0 && (
            <View style={{ marginTop: 16 }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: "#EBE4D2", overflow: "hidden" }}>
                <View style={{ width: `${Math.min(100, (detail.myCount / REVEAL_AT) * 100)}%`, height: "100%", backgroundColor: C.purple }} />
              </View>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: "#9A8B6A", textAlign: "center", marginTop: 10 }}>
                {remaining > 0 ? `${remaining} more from you and you won't be strangers.` : "waiting on their fifth — then Wren tells you each other's names."}
              </Text>
            </View>
          )}
          {detail?.revealed && (
            <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.purple, textAlign: "center", paddingVertical: 14 }}>💜 you're no longer strangers.</Text>
          )}
        </ScrollView>

        {/* reactions — a lighter answer than a letter */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 22, paddingBottom: 6 }}>
          {REACTIONS.map((r) => {
            const on = myR === r.emoji;
            return (
              <Pressable
                key={r.emoji}
                onPress={() => react(r.emoji)}
                hitSlop={4}
                style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: on ? C.purpleLt : "transparent", borderWidth: on ? 1.5 : 0, borderColor: C.purple }}
              >
                <Text style={{ fontSize: 17 }}>{r.emoji}</Text>
              </Pressable>
            );
          })}
          <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 11.5, color: myR ? C.purple : "#B3A985", textAlign: "right" }}>
            {myR ? `${reactionLabel(myR)} — they'll see it` : "…or answer with one tap"}
          </Text>
        </View>

        {/* reply dock — Aa / mic / reply, on the app accent */}
        <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 22 }}>
          <View style={[{ flexDirection: "row", alignItems: "flex-end", gap: 8, backgroundColor: "#fff", borderRadius: 26, padding: 7 }, shadow.card]}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.purpleLt, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: 14, color: C.purple }}>Aa</Text>
            </View>
            <TextInput
              value={reply}
              onChangeText={setReply}
              placeholder="write back to them…"
              placeholderTextColor="#B3A985"
              multiline
              style={{ flex: 1, maxHeight: 120, paddingHorizontal: 4, paddingTop: 10, color: C.ink, fontFamily: F.sans, fontSize: 15.5, lineHeight: 22 }}
            />
            <Pressable
              onPress={onSend}
              disabled={reply.trim().length < 1 || sending}
              style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.purple, borderRadius: 22, paddingHorizontal: 16, height: 44, justifyContent: "center", opacity: reply.trim().length < 1 || sending ? 0.4 : 1 }}
            >
              <Text style={{ color: "#fff", fontFamily: F.sansExtra, fontSize: 14 }}>{sending ? "…" : "reply"}</Text>
              <Text style={{ fontSize: 13 }}>✈️</Text>
            </Pressable>
          </View>
          <Text style={{ fontFamily: F.sansBold, fontSize: 9.5, letterSpacing: 1, color: "#B3A985", textAlign: "center", marginTop: 9 }}>
            {premium ? "GOES STRAIGHT TO THEM · UNLIMITED" : "GOES STRAIGHT TO THEM"}
          </Text>
        </View>
      </KeyboardAvoidingView>

      {revealToast && <Toast msg="you're no longer strangers." bottom={150} />}
    </SafeAreaView>
  );
}
