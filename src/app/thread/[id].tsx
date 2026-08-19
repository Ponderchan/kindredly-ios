import { speakAs, useWrenName } from "../../lib/wren-name";
import { useCallback, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { Easing, FadeIn } from "react-native-reanimated";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { P, PF, channelInk, channelWash } from "../../theme/post";
import { ReportMenu } from "../../components/ReportMenu";
import { StampTile } from "../../components/StampTile";
import { MosaicId } from "../../components/MosaicId";
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
const PAPER = P.paper;

export default function ThreadScreen() {
  const { id, i } = useLocalSearchParams<{ id: string; i?: string }>();
  const router = useRouter();
  const wren = useWrenName();
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
  // you read the letter you tapped; with no index, their latest
  const heroIdx = (() => {
    const asked = i != null ? parseInt(i, 10) : NaN;
    if (Number.isFinite(asked) && asked >= 0 && asked < conv.length) return asked;
    for (let k = conv.length - 1; k >= 0; k--) if (!conv[k].mine) return k;
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
    } else Alert.alert(`${wren} couldn't translate this`, "Try again in a moment.");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }}>
      {/* header — no back button; this IS the letter, swipe from the edge to leave */}
      <View style={{ paddingHorizontal: 12, paddingTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ width: 42 }} />
        <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 1.2, color: P.ink60 }}>
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
              style={{ paddingTop: 6 }}
            >
              {stamp && (
                <View style={{ position: "absolute", top: -2, right: 0, transform: [{ rotate: "3deg" }] }}>
                  <StampTile id={detail!.stamp} w={52} r={5} />
                </View>
              )}
              <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 0.8, color: P.ink60, paddingRight: 64 }}>
                {[heroDate, `NO. ${detail ? postNo(detail.other) : "…"}`, name ? name.toUpperCase() : "A STRANGER, FOR YOU"].filter(Boolean).join(" · ")}
              </Text>

              {detail?.openingMedia && conv.length === 1 ? (
                <View style={{ marginTop: 18 }}>
                  <AudioCard url={voiceLetterUrl(detail.openingMedia) || ""} durationS={detail.openingDurationS} compact />
                </View>
              ) : (
                <Text
                  style={{
                    fontFamily: PF.letter,
                    fontSize: tier.size,
                    lineHeight: tier.line,
                    color: P.ink,
                    marginTop: tier.center ? 30 : 20,
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
                  <View style={{ backgroundColor: channelWash(stamp.color), borderWidth: 1, borderColor: stamp.color, paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text style={{ fontFamily: PF.monoMed, fontSize: 12, letterSpacing: 0.2, color: channelInk(stamp.color) }}>
                      #{stamp.name.en.toLowerCase()}
                    </Text>
                  </View>
                )}
                {detail?.revealed ? (
                  <View style={{ backgroundColor: P.penWash, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Text style={{ fontFamily: PF.monoMed, fontSize: 11, letterSpacing: 0.8, color: P.pen }}>NO LONGER STRANGERS</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: P.ink12, paddingHorizontal: 10, paddingVertical: 6 }}>
                    {[0, 1, 2, 3, 4].map((k) => (
                      <View key={k} style={{ width: 6, height: 6, backgroundColor: k < filled ? P.pen : P.ink12 }} />
                    ))}
                    <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 0.6, color: P.ink60, marginLeft: 4 }}>{remaining} TO NAMES</Text>
                  </View>
                )}
              </View>

              {/* dashed divider */}
              <View style={{ borderBottomWidth: 1, borderColor: P.ink, marginTop: 20, marginBottom: 12 }} />

              {/* footer — the person (still veiled) + translate */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                {earlier.length > 0 ? (
                  <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                    {/* the mosaic IS the veil — a face you can't resolve until
                        you've traded names, at which point it clears */}
                    <View style={{ opacity: detail?.revealed ? 1 : 0.4 }}>
                      <MosaicId seed={detail?.other || "anon"} cell={4} gap={1.2} />
                    </View>
                    <View>
                      <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 0.8, color: P.ink }}>{(name || alias).toUpperCase()}</Text>
                      <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.6, color: P.ink40, marginTop: 2 }}>
                        {expanded ? "HIDE THE THREAD" : `${conv.length} LETTERS BETWEEN YOU ›`}
                      </Text>
                    </View>
                  </Pressable>
                ) : (
                  <View />
                )}
                <Pressable onPress={doTranslate} hitSlop={8}>
                  <Text style={{ fontFamily: PF.monoMed, fontSize: 11.5, letterSpacing: 1, color: P.pen }}>
                    {xlBusy ? "TRANSLATING…" : xlOn ? "ORIGINAL" : "TRANSLATE"}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          )}

          {/* earlier letters, revealed on demand */}
          {expanded &&
            earlier.map((m, i) => (
              <View
                key={i}
                style={{ borderWidth: 1, borderColor: m.mine ? P.ink12 : P.ink, backgroundColor: m.mine ? P.paperDeep : P.paper, padding: 15, marginTop: 10, marginLeft: m.mine ? 28 : 0, marginRight: m.mine ? 0 : 28 }}
              >
                <Text style={{ fontFamily: PF.letter, fontSize: 15.5, lineHeight: 24, color: P.ink }}>{m.body}</Text>
                <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 0.8, color: P.ink40, marginTop: 8 }}>{m.mine ? "YOU" : alias.toUpperCase()}</Text>
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
                  style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: on ? P.penWash : "transparent", borderWidth: 1, borderColor: on ? P.pen : P.ink12 }}
                >
                  <Text style={{ fontSize: 18 }}>{r.emoji}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.8, color: myR ? P.pen : P.ink40, marginTop: 10 }}>
            {myR ? `${(reactionLabel(myR) || "").toUpperCase()} — THEY'LL SEE IT` : "OR ANSWER WITH ONE TAP"}
          </Text>
        </View>

        {/* reply — input + navy airplane */}
        <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, borderBottomWidth: 1, borderBottomColor: P.ink, paddingRight: 2, paddingVertical: 2 }}>
            <TextInput
              value={reply}
              onChangeText={setReply}
              placeholder="write back to them…"
              placeholderTextColor={P.ink40}
              multiline
              style={{ flex: 1, maxHeight: 120, paddingTop: 10, paddingBottom: 10, color: P.ink, fontFamily: PF.letter, fontSize: 17, lineHeight: 23 }}
            />
            <Pressable
              onPress={onSend}
              disabled={!replyOk || sending}
              style={{ paddingHorizontal: 10, paddingVertical: 9, backgroundColor: replyOk && !sending ? P.pen : "transparent" }}
            >
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1, color: replyOk && !sending ? "#fff" : P.ink40 }}>
                {sending ? "···" : "SEND"}
              </Text>
            </Pressable>
          </View>
          <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.6, color: replyW > LETTER_MAX ? P.post : P.ink40, marginTop: 9 }}>
            {replyW > LETTER_MAX ? `${replyW - LETTER_MAX} OVER THE LIMIT` : "THIS REPLY GOES STRAIGHT TO THEM"}
          </Text>
        </View>
      </KeyboardAvoidingView>

      {revealToast && <Toast msg="you're no longer strangers." bottom={150} />}
    </SafeAreaView>
  );
}
