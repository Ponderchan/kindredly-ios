import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { C, F, cardStyle } from "../../theme/tokens";
import { ReplyBar } from "../../components/ReplyBar";
import { StampTile } from "../../components/StampTile";
import { Wren } from "../../components/Wren";
import { DEMO_THREADS } from "../../data/demo";
import { dShort, postNo } from "../../lib/format";
import { fetchThreads, sendThreadMessage, type ThreadSummary } from "../../lib/db";

/*
 * Letters is not a mailbox. It is the letter in front of the reader.
 *
 * The first viewport always gives one complete thought and an inline reply
 * field. Other correspondence exists one quiet swipe away, never as a list
 * competing with the letter that needs attention now.
 */

export default function LettersTab() {
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pageH, setPageH] = useState(0);
  const [idx, setIdx] = useState(0);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const next = (await fetchThreads()) || [];
    setThreads(next);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // A complete desk lets the team review this screen before live letters exist.
  const demo = __DEV__ && loaded && threads.length === 0;
  const showThreads = demo ? DEMO_THREADS : threads;
  const waiting = showThreads.filter((t) => !t.lastSenderMe);
  const sent = showThreads.filter((t) => t.lastSenderMe);
  const current = waiting[idx] ?? null;

  const reply = async (threadId: string, body: string) => {
    if (sendingId) return;
    setSendingId(threadId);
    const result = await sendThreadMessage(threadId, body);
    setSendingId(null);
    if (!result) {
      Alert.alert("Your letter stayed here", "It didn't go out. Please try again in a moment.");
      return;
    }
    setIdx(0);
    await load();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={["top"]}>
      <View style={{ flex: 1 }} onLayout={(e) => setPageH(e.nativeEvent.layout.height)}>
        {pageH > 0 && current ? (
          <ScrollView
            pagingEnabled
            showsVerticalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.y / pageH))}
          >
            {waiting.map((thread, i) => (
              <LetterPage
                key={thread.id}
                thread={thread}
                height={pageH}
                isSending={sendingId === thread.id}
                onReply={(body) => void reply(thread.id, body)}
                onOpen={() => router.push(`/thread/${thread.id}`)}
                hasNext={i < waiting.length - 1}
              />
            ))}
          </ScrollView>
        ) : (
          <QuietDesk sent={sent} onWrite={() => router.push("/compose")} />
        )}

        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            top: 8,
            left: 22,
            right: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1.7, color: C.faint }}>
            {current ? `${idx + 1} OF ${waiting.length} WAITING` : "YOUR DESK"}
          </Text>
          <Pressable
            onPress={() => router.push("/compose")}
            style={[cardStyle, { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 18 }]}
          >
            <Text style={{ fontSize: 12 }}>✍️</Text>
            <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, color: C.ink }}>Write</Text>
          </Pressable>
        </View>

        {/* the "1 OF 4 WAITING" header already says how many are left */}
      </View>
    </SafeAreaView>
  );
}

function LetterPage({
  thread,
  height,
  isSending,
  onReply,
  onOpen,
  hasNext,
}: {
  thread: ThreadSummary;
  height: number;
  isSending: boolean;
  onReply: (body: string) => void;
  onOpen: () => void;
  hasNext: boolean;
}) {
  const alias = thread.otherName || `No. ${postNo(thread.other)}`;
  const names = thread.revealed
    ? "you are no longer strangers"
    : thread.mine >= 5
      ? "waiting for their fifth letter"
      : `${5 - thread.mine} more from you before names`;

  return (
    <View style={{ height, paddingHorizontal: 26, paddingTop: 62, paddingBottom: 102 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <StampTile id={thread.stamp} w={46} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.serif, fontSize: 19, color: C.ink }}>{alias}</Text>
          <Text style={{ fontFamily: F.sans, fontSize: 11.5, color: C.faint, marginTop: 3 }}>{names}</Text>
        </View>
        <Pressable onPress={onOpen} hitSlop={10} style={{ padding: 6 }}>
          <Text style={{ fontSize: 20, color: C.faint }}>···</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, justifyContent: "center" }}>
        <Text style={{ fontFamily: F.letter, fontSize: 23, lineHeight: 37, color: "#22222A" }}>{thread.preview}</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.faint, marginTop: 18 }}>
          {dShort(thread.lastAt)} · from your correspondence
        </Text>
      </View>

      {hasNext && (
        <Text style={{ fontFamily: F.sans, fontSize: 11.5, color: C.faint, textAlign: "center", marginBottom: 7 }}>
          One more letter is waiting above.
        </Text>
      )}
      <ReplyBar
        onSend={onReply}
        placeholder="Write back to them…"
        footnote={isSending ? "Sending your letter…" : "This reply goes straight to them."}
      />
    </View>
  );
}

function QuietDesk({ sent, onWrite }: { sent: ThreadSummary[]; onWrite: () => void }) {
  const sentPreview = sent[0];
  return (
    <View style={{ flex: 1, paddingHorizontal: 30, paddingTop: 62, paddingBottom: 120 }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 62, height: 62, borderRadius: 31, borderWidth: 1.5, borderColor: C.line, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <Text style={{ fontSize: 24, color: C.purple }}>✦</Text>
        </View>
        <Text style={{ fontFamily: F.serif, fontSize: 25, color: C.ink, textAlign: "center" }}>
          {sentPreview ? "Your letter is out there." : "The desk is quiet."}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 17 }}>
          <Wren size={16} mode="line" />
          <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1.2, color: C.purple }}>WREN</Text>
        </View>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 24, color: C.muted, textAlign: "center", marginTop: 8, maxWidth: 286 }}>
          {sentPreview
            ? "Someone has your words at their door. There is nothing to chase."
            : "Nothing is asking for you right now. You can leave a letter when something is true."}
        </Text>
      </View>

      <View>
        <Pressable onPress={onWrite} style={{ backgroundColor: C.navy, borderRadius: 26, paddingVertical: 17, alignItems: "center" }}>
          <Text style={{ color: "#fff", fontFamily: F.sansExtra, fontSize: 13, letterSpacing: 1 }}>WRITE TO A STRANGER</Text>
        </Pressable>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.faint, textAlign: "center", marginTop: 12 }}>
          Replies are never limited.
        </Text>
      </View>
    </View>
  );
}
