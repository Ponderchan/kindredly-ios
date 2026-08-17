import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { C, F, cardStyle } from "../../theme/tokens";
import { AudioCard } from "../../components/AudioCard";
import { ReplyBar } from "../../components/ReplyBar";
import { ReportMenu } from "../../components/ReportMenu";
import { Wren } from "../../components/Wren";
import { getStamp } from "../../data/stamps";
import { note } from "../../lib/wren";
import { isKept, toggleKept } from "../../lib/kept";
import { replyToLetter, voiceLetterUrl, type PoolLetter } from "../../lib/db";
import { letterTier, weightedCount } from "../../lib/weighted-count";

/* Read a stranger's pool letter (v20 LetterView) and reply — replying creates
   a 1:1 thread and opens it. */
export default function LetterReader() {
  const router = useRouter();
  const { id, author, stamp, body, lang, kind, media, dur } = useLocalSearchParams<{
    id: string;
    author: string;
    stamp: string;
    body: string;
    lang?: string;
    kind?: string;
    media?: string;
    dur?: string;
  }>();
  const [wrenLine, setWrenLine] = useState<string | null>(null);
  const [keptNow, setKeptNow] = useState(false);

  useEffect(() => {
    if (id) isKept(id).then(setKeptNow);
  }, [id]);

  const onKeep = async () => {
    if (!id || !body) return;
    setKeptNow(await toggleKept({ id, text: body, from: "letter" }));
  };
  const [sending, setSending] = useState(false);
  const isVoice = kind === "voice" && !!media;
  const audioUrl = isVoice ? voiceLetterUrl(media) : null;

  useEffect(() => {
    let alive = true;
    if (!isVoice) {
      note(body || "", (lang as any) || "en").then((l) => {
        if (alive) setWrenLine(l);
      });
    }
    return () => {
      alive = false;
    };
  }, [body, lang, isVoice]);

  const st = getStamp(stamp);
  const bodyTier = letterTier(weightedCount(body || ""));

  const onReply = async (text: string) => {
    if (sending) return;
    setSending(true);
    const letter: PoolLetter = {
      id: id!,
      author: author!,
      stamp: stamp || "off-chest",
      body: body || "",
      lang: lang || "en",
      created_at: new Date().toISOString(),
      kind: isVoice ? "voice" : "text",
      media_path: isVoice ? media : null,
      duration_s: isVoice && dur ? parseInt(dur, 10) : null,
    };
    // demo pool letters have no real backend author — seed a local thread so
    // the whole loop closes on the simulator
    if (__DEV__ && author?.startsWith("demo-")) {
      const { seedDemoThread } = await import("../../data/demo");
      const seededId = seedDemoThread(letter, text);
      setSending(false);
      router.replace(`/thread/${seededId}`);
      return;
    }
    const threadId = await replyToLetter(letter, text);
    setSending(false);
    if (threadId) router.replace(`/thread/${threadId}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 26, color: C.ink }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: F.serif, fontSize: 19, color: C.ink }}>Letter</Text>
        <ReportMenu targetUser={author} context="letter" refId={id} snapshot={body} onBlocked={() => router.back()} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
          <View style={[cardStyle, { borderRadius: 22, padding: 26 }]}>
            {isVoice && audioUrl ? (
              <>
                <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1.4, color: C.purple, marginBottom: 14 }}>
                  🎙 A VOICE LETTER
                </Text>
                <AudioCard url={audioUrl} durationS={dur ? parseInt(dur, 10) : null} />
                {!!body && body !== "🎙 A voice letter" && (
                  <Text style={{ fontFamily: F.letterItalic, fontSize: 15.5, lineHeight: 25, color: C.muted, marginTop: 16 }}>
                    “{body}”
                  </Text>
                )}
              </>
            ) : (
              <Text
                style={{
                  fontFamily: F.letter,
                  fontSize: bodyTier.size,
                  lineHeight: bodyTier.line,
                  color: "#22222A",
                  textAlign: bodyTier.center ? "center" : "auto",
                  paddingVertical: bodyTier.center ? 12 : 0,
                }}
              >
                {body}
              </Text>
            )}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 24, flexWrap: "wrap", alignItems: "center" }}>
              {st && (
                <View style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: C.purpleLt }}>
                  <Text style={{ fontFamily: F.sansSemi, fontSize: 12, color: C.purple }}>{st.name.en}</Text>
                </View>
              )}
              {!isVoice && (
                <Pressable
                  onPress={onKeep}
                  hitSlop={6}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: keptNow ? C.purple : C.line, backgroundColor: keptNow ? C.purpleLt : "transparent" }}
                >
                  <Text style={{ fontSize: 13, color: keptNow ? C.purple : C.faint }}>{keptNow ? "♥" : "♡"}</Text>
                  <Text style={{ fontFamily: F.sansSemi, fontSize: 12, color: keptNow ? C.purple : C.muted }}>
                    {keptNow ? "Kept" : "Keep"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          {wrenLine && (
            <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: 18, paddingHorizontal: 6 }}>
              <Wren size={20} mode="line" />
              <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 21, color: C.muted }}>
                {wrenLine}
              </Text>
            </View>
          )}

          <Text style={{ textAlign: "center", fontFamily: F.serifItalic, fontSize: 11.5, color: C.faint, marginTop: 20, paddingHorizontal: 10, lineHeight: 19 }}>
            This letter was sent down three streets. You were the first to open it.
          </Text>
        </ScrollView>

        <ReplyBar onSend={onReply} placeholder="Write them back…" footnote="Reply and a thread opens — just the two of you." />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
