import { useCallback, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { C, F, shadow } from "../../theme/tokens";
import { ReportMenu } from "../../components/ReportMenu";
import { StampTile } from "../../components/StampTile";
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
      {/* minimal header — back + report */}
      <View style={{ paddingHorizontal: 12, paddingTop: 2, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 24, color: "#5A5344" }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1.4, color: "#B3A985" }}>
          {conv.length} {conv.length === 1 ? "LETTER" : "LETTERS"} IN THIS THREAD
        </Text>
        <ReportMenu targetUser={detail?.other} context="thread" refId={id} snapshot={detail?.opening} onBlocked={() => router.back()} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
          {/* the letter */}
          {hero && (
            <View style={[{ backgroundColor: "#fff", borderRadius: 22, padding: 22, paddingTop: 20 }, shadow.card]}>
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
                <Text style={{ fontFamily: F.letter, fontSize: 21, lineHeight: 33, color: "#22222A", marginTop: 18 }}>
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

              {/* footer — thread + translate */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                {earlier.length > 0 ? (
                  <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8}>
                    <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: "#8C7F63" }}>
                      {expanded ? "hide earlier letters" : "open the whole thread ›"}
                    </Text>
                  </Pressable>
                ) : (
                  <View />
                )}
                <Pressable onPress={doTranslate} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 13 }}>{xlOn ? "🕊" : "🌐"}</Text>
                  <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, color: C.purple }}>{xlBusy ? "translating…" : xlOn ? "original" : "translate"}</Text>
                </Pressable>
              </View>
            </View>
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
              style={{ flex: 1, maxHeight: 120, paddingTop: 11, paddingBottom: 3, color: C.ink, fontFamily: F.serifItalic, fontSize: 16, lineHeight: 22 }}
            />
            <Pressable
              onPress={onSend}
              disabled={reply.trim().length < 1 || sending}
              style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "#1E1B2E", alignItems: "center", justifyContent: "center", opacity: reply.trim().length < 1 || sending ? 0.4 : 1 }}
            >
              <Text style={{ fontSize: 18 }}>✈️</Text>
            </Pressable>
          </View>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: "#B3A985", textAlign: "center", marginTop: 9 }}>this reply goes straight to them.</Text>
        </View>
      </KeyboardAvoidingView>

      {revealToast && <Toast msg="you're no longer strangers." bottom={150} />}
    </SafeAreaView>
  );
}
