import { useCallback, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { Easing, FadeIn } from "react-native-reanimated";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { C, F, shadow } from "../../theme/tokens";
import { ReportMenu } from "../../components/ReportMenu";
import { StampTile } from "../../components/StampTile";
import { StrangerAvatar } from "../../components/StrangerAvatar";
import { Toast } from "../../components/ui";
import { AudioCard } from "../../components/AudioCard";
import { getStamp } from "../../data/stamps";
import { REACTIONS, reactionLabel } from "../../data/reactions";
import { dShort, postNo } from "../../lib/format";
import {
  clearThreadReaction,
  fetchThreadMessages,
  sendThreadMessage,
  setThreadReaction,
  voiceLetterUrl,
  type ThreadDetail,
} from "../../lib/db";
import { translate } from "../../lib/wren";
import { LETTER_MAX, REPLY_MIN, letterTier, weightedCount } from "../../lib/weighted-count";

const REVEAL_AT = 5;
const PAPER = "#FBF8F0";

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
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
      const { DEMO_DETAILS, SEEDED_DEMO } = await import("../../data/demo");
      setDetail(SEEDED_DEMO[id] ?? DEMO_DETAILS[id] ?? null);
      return;
    }
    setDetail(await fetchThreadMessages(id));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onSend = async () => {
    const text = reply.trim();
    if (!id || sending || !replyOk) return;
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
  const name = detail?.revealed ? detail.otherName || alias : null;
  const stamp = getStamp(detail?.stamp);
  const remaining = detail ? Math.max(0, REVEAL_AT - detail.myCount) : REVEAL_AT;
  const filled = detail ? Math.min(REVEAL_AT, detail.myCount) : 0;
  // the letter you came to read = their latest (fall back to the newest)
  const heroIdx = (() => {
    for (let i = conv.length - 1; i >= 0; i--) if (!conv[i].mine) return i;
    return conv.length - 1;
  })();
  const hero = conv[heroIdx] ?? null;
  const earlier = conv.filter((_, i) => i !== heroIdx);
  const heroDate = hero?.date ? dShort(hero.date).toUpperCase() : detail && !detail.revealed ? "AUG 11" : "";
  // size the letter to its weight: a short one is a telegram, a long one steps down
  const tier = letterTier(weightedCount((xlOn && xl ? xl : hero?.body) || ""));
  const replyW = weightedCount(reply);
  const replyOk = replyW >= REPLY_MIN && replyW <= LETTER_MAX;

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
      {/* header — no back button; this IS the letter, swipe from the edge to leave */}
      <View style={{ paddingHorizontal: 12, paddingTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ width: 42 }} />
        <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1.4, color: "#B3A985" }}>
          {conv.length} {conv.length === 1 ? "LETTER" : "LETTERS"} IN THIS THREAD
        </Text>
        <ReportMenu targetUser={detail?.other} context="thread" refId={id} snapshot={detail?.opening} onBlocked={() => router.back()} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
          {/* the letter */}
          {hero && (
            <Animated.View
              entering={FadeIn.duration(300).easing(Easing.out(Easing.cubic))}
              style={[{ backgroundColor: "#fff", borderRadius: 22, padding: 22, paddingTop: 20 }, shadow.card]}
            >
              {stamp && (
                <View style={{ position: "absolute", top: -8, right: 16, transform: [{ rotate: "7deg" }] }}>
                  <StampTile id={detail!.stamp} w={52} r={5} />
                </View>
              )}
              <Text style={{ fontFamily: F.sansExtra, fontSize: 10, letterSpacing: 1, color: "#9A8B6A", paddingRight: 64 }}>
                {[heroDate, `NO. ${detail ? postNo(detail.other) : "…"}`, name ? name.toUpperCase() : "A STRANGER, FOR YOU"].filter(Boolean).join(" · ")}
              </Text>

              {detail?.openingMedia && conv.length === 1 ? (
                <View style={{ marginTop: 18 }}>
                  <AudioCard url={voiceLetterUrl(detail.openingMedia) || ""} durationS={detail.openingDurationS} compact />
                </View>
              ) : (
                <Text
                  style={{
                    fontFamily: F.letter,
                    fontSize: tier.size,
                    lineHeight: tier.line,
                    color: "#22222A",
                    marginTop: tier.center ? 30 : 18,
                    textAlign: tier.center ? "center" : "auto",
                    paddingBottom: tier.center ? 14 : 0,
                  }}
                >
                  {xlOn && xl ? xl : hero.body}
                </Text>
              )}

              {/* chips — theme + progress to names */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 22 }}>
                {stamp && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: `${stamp.color}16`, borderRadius: 15, paddingHorizontal: 11, paddingVertical: 7 }}>
                    <Text style={{ fontSize: 11 }}>{stamp.emoji}</Text>
                    <Text style={{ fontFamily: F.sansExtra, fontSize: 10.5, letterSpacing: 0.8, color: stamp.color }}>{stamp.name.en.toUpperCase()}</Text>
                  </View>
                )}
                {detail?.revealed ? (
                  <View style={{ backgroundColor: C.purpleLt, borderRadius: 15, paddingHorizontal: 11, paddingVertical: 7 }}>
                    <Text style={{ fontFamily: F.sansBold, fontSize: 11, color: C.purple }}>💜 no longer strangers</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.purpleLt, borderRadius: 15, paddingHorizontal: 11, paddingVertical: 7 }}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i < filled ? C.purple : "#D2CCF0" }} />
                    ))}
                    <Text style={{ fontFamily: F.sansBold, fontSize: 11, color: C.purple, marginLeft: 3 }}>{remaining} to names</Text>
                  </View>
                )}
              </View>

              {/* dashed divider */}
              <View style={{ borderBottomWidth: 1, borderStyle: "dashed", borderColor: "#E4DCC8", marginTop: 16, marginBottom: 12 }} />

              {/* footer — the person (still veiled) + translate */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                {earlier.length > 0 ? (
                  <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                    <View>
                      <StrangerAvatar seed={detail?.other || "anon"} size={30} round />
                      {!detail?.revealed && (
                        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 15, backgroundColor: "rgba(251,248,240,0.55)" }} />
                      )}
                    </View>
                    <View>
                      <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, color: "#5A5344" }}>{name || alias}</Text>
                      <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: "#8C7F63" }}>
                        {expanded ? "hide the thread" : `${conv.length} letters between you ›`}
                      </Text>
                    </View>
                  </Pressable>
                ) : (
                  <View />
                )}
                <Pressable onPress={doTranslate} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 13 }}>{xlOn ? "🕊" : "🌐"}</Text>
                  <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, color: C.purple }}>{xlBusy ? "translating…" : xlOn ? "original" : "translate"}</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}

          {/* earlier letters, revealed on demand */}
          {expanded &&
            earlier.map((m, i) => (
              <View
                key={i}
                style={{ backgroundColor: m.mine ? "#F1EEE4" : "#fff", borderRadius: 16, padding: 18, marginTop: 10, marginLeft: m.mine ? 30 : 0, marginRight: m.mine ? 0 : 30 }}
              >
                <Text style={{ fontFamily: F.letter, fontSize: 15.5, lineHeight: 25, color: "#3A3630" }}>{m.body}</Text>
                <Text style={{ fontFamily: F.sans, fontSize: 11, color: C.faint, marginTop: 8 }}>{m.mine ? "You" : alias}</Text>
              </View>
            ))}
        </ScrollView>

        {/* reactions */}
        <View style={{ alignItems: "center", paddingBottom: 4 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {REACTIONS.map((r) => {
              const on = myR === r.emoji;
              return (
                <Pressable
                  key={r.emoji}
                  onPress={() => react(r.emoji)}
                  hitSlop={4}
                  style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: on ? C.purpleLt : "#F3EFE3", borderWidth: on ? 1.5 : 0, borderColor: C.purple }}
                >
                  <Text style={{ fontSize: 18 }}>{r.emoji}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: myR ? C.purple : "#B3A985", marginTop: 8 }}>
            {myR ? `${reactionLabel(myR)} — they'll see it` : "or answer with one tap"}
          </Text>
        </View>

        {/* reply — input + navy airplane */}
        <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 20 }}>
          <View style={[{ flexDirection: "row", alignItems: "flex-end", gap: 8, backgroundColor: "#fff", borderRadius: 28, paddingLeft: 20, paddingRight: 7, paddingVertical: 7 }, shadow.card]}>
            <TextInput
              value={reply}
              onChangeText={setReply}
              placeholder="write back to them…"
              placeholderTextColor="#B3A985"
              multiline
              style={{ flex: 1, maxHeight: 120, paddingTop: 12, paddingBottom: 12, color: C.ink, fontFamily: F.letter, fontSize: 16, lineHeight: 22 }}
            />
            <Pressable
              onPress={onSend}
              disabled={!replyOk || sending}
              style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "#1E1B2E", alignItems: "center", justifyContent: "center", opacity: !replyOk || sending ? 0.4 : 1 }}
            >
              <Text style={{ fontSize: 18 }}>✈️</Text>
            </Pressable>
          </View>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: replyW > LETTER_MAX ? "#C0503A" : "#B3A985", textAlign: "center", marginTop: 9 }}>
            {replyW > LETTER_MAX ? `${replyW - LETTER_MAX} over the limit` : "this reply goes straight to them."}
          </Text>
        </View>
      </KeyboardAvoidingView>

      {revealToast && <Toast msg="you're no longer strangers." bottom={150} />}
    </SafeAreaView>
  );
}
