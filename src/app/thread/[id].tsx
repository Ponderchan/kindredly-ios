import { useCallback, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { C, F, cardStyle } from "../../theme/tokens";
import { ReplyBar } from "../../components/ReplyBar";
import { ReportMenu } from "../../components/ReportMenu";
import { Toast } from "../../components/ui";
import { Wren } from "../../components/Wren";
import { AudioCard } from "../../components/AudioCard";
import { WindowItem } from "../../components/WindowItem";
import { getStamp } from "../../data/stamps";
import { dLong, postNo } from "../../lib/format";
import { fetchThreadMessages, fetchWindow, sendThreadMessage, voiceLetterUrl, type ThreadDetail, type WindowPost } from "../../lib/db";
import { peek } from "../../lib/wren";
import { useEntitlement } from "../../lib/entitlement";

const REVEAL_AT = 5;

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const { premium } = useEntitlement();
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [sending, setSending] = useState(false);
  const [revealToast, setRevealToast] = useState(false);
  const [peekLine, setPeekLine] = useState<string | null>(null);
  const [peeking, setPeeking] = useState(false);
  const [kwindow, setKwindow] = useState<WindowPost | null>(null);

  const doPeek = async () => {
    if (!premium) {
      router.push("/paywall");
      return;
    }
    if (peeking || !detail) return;
    setPeeking(true);
    const line = await peek(detail.messages, "en");
    setPeekLine(line);
    setPeeking(false);
  };

  const load = useCallback(async () => {
    if (!id) return;
    if (__DEV__ && id.startsWith("demo-")) {
      const { DEMO_DETAILS } = await import("../../data/demo");
      setDetail(DEMO_DETAILS[id] ?? null);
      return;
    }
    const d = await fetchThreadMessages(id);
    setDetail(d);
    if (d?.revealed) fetchWindow(d.other).then(setKwindow);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onSend = async (text: string) => {
    if (!id || sending) return;
    setSending(true);
    const wasRevealed = detail?.revealed;
    const res = await sendThreadMessage(id, text);
    await load();
    setSending(false);
    if (res?.revealed && !wasRevealed) setRevealToast(true);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  const alias = detail ? `No. ${postNo(detail.other)}` : "…";
  const title = detail?.revealed ? detail.otherName || alias : alias;
  const stamp = getStamp(detail?.stamp);
  const conv = detail
    ? [{ body: detail.opening, mine: detail.openingFromMe, date: "" }, ...detail.messages].filter((m) => m.body)
    : [];
  const remaining = detail ? Math.max(0, REVEAL_AT - detail.myCount) : REVEAL_AT;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      {/* header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 26, color: C.ink }}>‹</Text>
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontFamily: F.serif, fontSize: 18, color: C.ink }}>{title}</Text>
          <Text style={{ fontFamily: F.sansBold, fontSize: 10, letterSpacing: 1.2, color: C.faint, marginTop: 2 }}>
            {conv.length} LETTERS{detail && !detail.revealed ? ` · ${Math.min(REVEAL_AT, detail.myCount)} OF 5 TO NAMES` : ""}
          </Text>
        </View>
        <ReportMenu targetUser={detail?.other} context="thread" refId={id} snapshot={detail?.opening} onBlocked={() => router.back()} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {conv.map((m, i) => {
            const isMe = m.mine;
            return (
              <View
                key={i}
                style={[
                  {
                    backgroundColor: isMe ? C.mine : C.card,
                    borderRadius: 20,
                    padding: 22,
                    marginBottom: 14,
                    marginLeft: isMe ? 22 : 0,
                    marginRight: isMe ? 0 : 22,
                    borderWidth: isMe ? 1 : 0,
                    borderColor: C.line,
                  },
                  !isMe && cardStyle,
                ]}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <Text style={{ fontFamily: F.sans, fontSize: 12, color: C.faint }}>{m.date ? dLong(m.date) : "the letter that started this"}</Text>
                </View>
                {i === 0 && detail?.openingMedia ? (
                  <>
                    <AudioCard url={voiceLetterUrl(detail.openingMedia) || ""} durationS={detail.openingDurationS} compact />
                    {!!m.body && m.body !== "🎙 A voice letter" && (
                      <Text style={{ fontFamily: F.letterItalic, fontSize: 14.5, lineHeight: 23, color: C.muted, marginTop: 12 }}>
                        “{m.body}”
                      </Text>
                    )}
                  </>
                ) : (
                  <Text style={{ fontFamily: F.letter, fontSize: 17.5, lineHeight: 29, color: "#22222A" }}>{m.body}</Text>
                )}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 18 }}>
                  <Text style={{ fontFamily: F.sans, fontSize: 13, color: C.faint }}>{isMe ? "You" : alias}</Text>
                  {stamp && i === 0 && (
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: C.lineSoft }}>
                      <Text style={{ fontFamily: F.sans, fontSize: 10.5, color: C.muted }}>{stamp.name.en}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {/* progress to reveal */}
          {detail && !detail.revealed && detail.myCount > 0 && (
            <View style={{ marginTop: 4, marginBottom: 8 }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: C.lineSoft, overflow: "hidden" }}>
                <View style={{ width: `${Math.min(100, (detail.myCount / REVEAL_AT) * 100)}%`, height: "100%", backgroundColor: C.purpleMid }} />
              </View>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.faint, textAlign: "center", marginTop: 10 }}>
                {remaining > 0 ? `${remaining} more from you and you won't be strangers.` : "Waiting on their fifth — then Wren tells you each other's names."}
              </Text>
            </View>
          )}

          {detail?.revealed && (
            <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.purple, textAlign: "center", paddingVertical: 12 }}>
              💜 You're no longer strangers.
            </Text>
          )}

          {detail?.revealed && kwindow && (
            <View style={{ marginTop: 4, marginBottom: 8 }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: 10, letterSpacing: 1.2, color: C.label, marginBottom: 8 }}>
                IN {(detail.otherName || alias).toUpperCase()}'S WINDOW
              </Text>
              <WindowItem item={kwindow} />
            </View>
          )}

          {/* Wren's Peek — Kindredly+ deep read of this correspondent */}
          {conv.length >= 2 &&
            (peekLine ? (
              <View style={[cardStyle, { padding: 18, marginTop: 6, marginBottom: 10, flexDirection: "row", gap: 12, backgroundColor: C.purpleLt }]}>
                <View style={{ width: 24, paddingTop: 2 }}>
                  <Wren size={20} mode="line" />
                </View>
                <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 14, lineHeight: 22, color: C.ink }}>{peekLine}</Text>
              </View>
            ) : (
              <Pressable
                onPress={doPeek}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, marginTop: 4, marginBottom: 8, borderRadius: 18, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}
              >
                <Wren size={18} mode="line" />
                <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, letterSpacing: 0.4, color: C.purple }}>
                  {peeking ? "Reading them…" : premium ? "Ask Wren to read them" : "Ask Wren to read them  ·  Kindredly+"}
                </Text>
              </Pressable>
            ))}
        </ScrollView>

        <ReplyBar onSend={onSend} placeholder="Write a response…" />
      </KeyboardAvoidingView>

      {revealToast && <Toast msg="You're no longer strangers." bottom={140} />}
    </SafeAreaView>
  );
}
