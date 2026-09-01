import { useWrenName } from "../../lib/wren-name";
import { useCallback, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { Easing, FadeIn } from "react-native-reanimated";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { P, PF, channelInk, channelWash } from "../../theme/post";
import { ReportMenu } from "../../components/ReportMenu";
import { StampTile } from "../../components/StampTile";
import { MosaicId } from "../../components/MosaicId";
import { AudioCard } from "../../components/AudioCard";
import { getStamp, sname } from "../../data/stamps";
import { ON_WAY } from "../../data/reactions";
import { dShort, postNo } from "../../lib/format";
import { threadState } from "../../lib/thread-state";
import { getLang, t, useLang } from "../../lib/i18n";
import { TranslateMark } from "../../components/TranslateMark";
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
import { fieldBox } from "../../lib/field";
import { alertFail } from "../../lib/fail";

const PAPER = P.paper;

export default function ThreadScreen() {
  const { id, i } = useLocalSearchParams<{ id: string; i?: string }>();
  useLang(); // repaint on language change
  const router = useRouter();
  const wren = useWrenName();
  const scrollRef = useRef<ScrollView>(null);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [sending, setSending] = useState(false);
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
    const res = await sendThreadMessage(id, text);
    setSending(false);
    if (!res) {
      alertFail(t("th.fail.title"), t("th.fail.body"));
      return;
    }
    setReply("");
    // the reply IS the promise, kept — withdraw the standing "on its way"
    if (myR === ON_WAY.emoji) {
      setMyR(null);
      void clearThreadReaction(id);
    }
    await load();
    // reveal no longer rides a send — names move only by signing, and the
    // chat screen holds the introduction
  };

  const promise = () => {
    if (!id || myR === ON_WAY.emoji) return;
    setMyR(ON_WAY.emoji);
    void setThreadReaction(id, ON_WAY.emoji);
  };

  const conv = detail
    ? [{ body: detail.opening, mine: detail.openingFromMe, date: "" }, ...detail.messages].filter((m) => m.body)
    : [];
  const alias = detail ? `No. ${postNo(detail.other)}` : "…";
  const name = detail?.revealed ? detail.otherName || alias : null;
  /* the same sentence the list row and the chat header show */
  const state = detail
    ? threadState({
        mine: detail.myCount,
        theirs: detail.otherCount,
        revealed: detail.revealed,
        lastSenderMe: !detail.messages.length || !!detail.messages[detail.messages.length - 1]?.mine,
        iSigned: detail.iSigned,
        theirSigned: detail.theirSigned,
      })
    : null;
  const stamp = getStamp(detail?.stamp);
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
    const out = await translate(hero.body, getLang());
    setXlBusy(false);
    if (out) {
      setXl(out);
      setXlOn(true);
    } else Alert.alert(t("th.noTransTitle", { wren }), t("th.noTransBody"));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }}>
      {/* header — no back button; this IS the letter, swipe from the edge to leave */}
      <View style={{ paddingHorizontal: 12, paddingTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ width: 42 }} />
        <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 1.2, color: P.ink60 }}>
          {conv.length === 1 ? t("th.inThreadOne", { n: conv.length }) : t("th.inThreadMany", { n: conv.length })}
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
                {/* the number is what you call someone WITHOUT a name. Once
                    they have one it replaces the number rather than sitting
                    beside it — printing both says the reveal only half
                    happened. */}
                {[heroDate, name ? name.toUpperCase() : `NO. ${detail ? postNo(detail.other) : "…"}`]
                  .filter(Boolean)
                  .join(" · ")}
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
                      #{sname(stamp.name).toLowerCase()}
                    </Text>
                  </View>
                )}
                {/* This screen never got the memo. It still printed NO
                    LONGER STRANGERS — retired when the twelve sentences
                    became five — and five progress pips, which were the last
                    counter left in the product after slice 170 took the rest
                    out. Both gone: the state line is the same sentence every
                    other surface shows. */}
                {!!state && (
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: P.ink12 }}>
                    <Text style={{ fontFamily: PF.monoMed, fontSize: 11, letterSpacing: 0.8, color: state.tone }}>{state.label}</Text>
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
                        {expanded ? t("th.hide") : t("th.between", { n: conv.length })}
                      </Text>
                    </View>
                  </Pressable>
                ) : (
                  <View />
                )}
                <Pressable onPress={doTranslate} hitSlop={8} style={{ flexDirection: "row", alignItems: "center" }}>
                  <TranslateMark on={xlOn} />
                  <Text style={{ fontFamily: PF.monoMed, fontSize: 11.5, letterSpacing: 1, color: P.pen }}>
                    {xlBusy ? t("read.translating") : xlOn ? t("read.original") : t("read.translate")}
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
                {/* once they have a name, everything they ever wrote is signed with
                    it — the letters didn't change, but who wrote them did */}
                <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 0.8, color: P.ink40, marginTop: 8 }}>
                  {m.mine ? t("ui.you") : (name || alias).toUpperCase()}
                </Text>
              </View>
            ))}
        </ScrollView>

        {/* THE PROMISE, ONLY WHEN A PROMISE MAKES SENSE — their letter is
            waiting and yours hasn't started. Sending the reply withdraws it:
            a promise the courier has already kept is noise. */}
        {state?.needsYou && !reply.trim() && (
          <View style={{ alignItems: "center", paddingBottom: 4 }}>
            <Pressable
              onPress={promise}
              hitSlop={6}
              disabled={myR === ON_WAY.emoji}
              style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: myR === ON_WAY.emoji ? P.pen : P.ink12, backgroundColor: myR === ON_WAY.emoji ? P.penWash : "transparent" }}
            >
              <Text style={{ fontSize: 15 }}>{ON_WAY.emoji}</Text>
              <Text style={{ fontFamily: PF.mono, fontSize: 11.5, letterSpacing: 0.5, color: myR === ON_WAY.emoji ? P.pen : P.ink60 }}>
                {myR === ON_WAY.emoji ? t("th.reactSeen") : t("rx.onWay")}
              </Text>
            </Pressable>
            {myR !== ON_WAY.emoji && (
              <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.8, color: P.ink40, marginTop: 10 }}>
                {t("th.answerOneTap")}
              </Text>
            )}
          </View>
        )}

        {/* reply — input + navy airplane */}
        <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, borderBottomWidth: 1, borderBottomColor: P.ink, paddingRight: 2, paddingVertical: 2 }}>
            <TextInput
              value={reply}
              onChangeText={setReply}
              placeholder={detail?.revealed ? t("th.sayTo", { name: name ?? "" }) : t("th.writeBackThem")}
              placeholderTextColor={P.ink40}
              multiline
              style={{ flex: 1, ...fieldBox(reply, 23, 120), paddingTop: 10, paddingBottom: 10, color: P.ink, fontFamily: PF.letter, fontSize: 17, lineHeight: 23 }}
            />
            <Pressable
              onPress={onSend}
              disabled={!replyOk || sending}
              style={{ paddingHorizontal: 10, paddingVertical: 9, backgroundColor: replyOk && !sending ? P.pen : "transparent" }}
            >
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1, color: replyOk && !sending ? "#fff" : P.ink40 }}>
                {sending ? "···" : t("ld.send")}
              </Text>
            </Pressable>
          </View>
          <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.6, color: replyW > LETTER_MAX ? P.post : P.ink40, marginTop: 9 }}>
            {replyW > LETTER_MAX
              ? t("th.over", { n: replyW - LETTER_MAX })
              : detail?.revealed
                ? t("th.goesStraight")
                : t("th.replyGoesStraight")}
          </Text>
        </View>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}
