import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { C, F } from "../../theme/tokens";
import { ReplyBar } from "../../components/ReplyBar";
import { ReportMenu } from "../../components/ReportMenu";
import { StampTile } from "../../components/StampTile";
import { StrangerAvatar } from "../../components/StrangerAvatar";
import { Wren } from "../../components/Wren";
import { DEMO_THREADS } from "../../data/demo";
import { getStamp } from "../../data/stamps";
import { dShort, postNo } from "../../lib/format";
import { clearThreadReaction, fetchThreads, sendThreadMessage, setThreadReaction, type ThreadSummary } from "../../lib/db";
import { translate } from "../../lib/wren";
import { REACTIONS, reactionLabel } from "../../data/reactions";

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
                onBlocked={() => {
                  setIdx(0);
                  void load();
                }}
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
          {/* writing lives on the quill button below — no second door up here */}
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
  onBlocked,
  hasNext,
}: {
  thread: ThreadSummary;
  height: number;
  isSending: boolean;
  onReply: (body: string) => void;
  onOpen: () => void;
  onBlocked: () => void;
  hasNext: boolean;
}) {
  // names come only from five letters each — never sooner
  const alias = thread.revealed && thread.otherName ? thread.otherName : `No. ${postNo(thread.other)}`;
  const st = getStamp(thread.stamp);

  // my one-tap reaction — optimistic; a new pick replaces, same pick clears
  const [myR, setMyR] = useState<string | null>(thread.myReaction ?? null);
  const react = (emoji: string) => {
    if (myR === emoji) {
      setMyR(null);
      void clearThreadReaction(thread.id);
    } else {
      setMyR(emoji);
      void setThreadReaction(thread.id, emoji);
    }
  };

  // Wren translation — on demand, toggling between original and her render
  const [xl, setXl] = useState<string | null>(null);
  const [xlBusy, setXlBusy] = useState(false);
  const [showXl, setShowXl] = useState(false);
  const doTranslate = async () => {
    if (xl) {
      setShowXl((s) => !s);
      return;
    }
    if (xlBusy) return;
    setXlBusy(true);
    const to = (Intl.DateTimeFormat().resolvedOptions().locale || "en").split("-")[0];
    const t = await translate(thread.preview, to);
    setXlBusy(false);
    if (t) {
      setXl(t);
      setShowXl(true);
    } else {
      Alert.alert("Wren couldn't translate this", "Try again in a moment.");
    }
  };

  const dots = Math.min(5, thread.mine);

  return (
    <View style={{ height, paddingHorizontal: 22, paddingTop: 50, paddingBottom: 102 }}>
      {/* the letter — a real object: their stamp on top, their signature at the end */}
      <View style={{ flex: 1, justifyContent: "center" }}>
        <View
          style={{
            backgroundColor: "#FFFDF8",
            borderRadius: 24,
            borderWidth: 1,
            borderColor: C.line,
            paddingHorizontal: 22,
            paddingTop: 20,
            paddingBottom: 16,
            shadowColor: "#131A26",
            shadowOpacity: 0.07,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
          }}
        >
          {/* pasted stamp — the icon is the hero, its name a small footnote */}
          {st && (
            <View style={{ position: "absolute", top: -18, right: 16, transform: [{ rotate: "7deg" }] }}>
              <View style={{ padding: 5, backgroundColor: "#fff", borderRadius: 7, shadowColor: "#131A26", shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}>
                <StampTile id={thread.stamp} w={56} r={5} />
              </View>
            </View>
          )}

          <Text style={{ fontFamily: F.sans, fontSize: 12, color: C.faint }}>{dShort(thread.lastAt)}</Text>

          {/* words first — you meet the writing before the writer */}
          <Pressable onPress={onOpen}>
            <Text style={{ fontFamily: F.letter, fontSize: 22, lineHeight: 36, color: "#22222A", marginTop: 14 }}>
              {showXl && xl ? xl : thread.preview}
            </Text>
          </Pressable>
          {showXl && xl && (
            <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.faint, marginTop: 6 }}>translated by Wren</Text>
          )}

          {/* chips — how they caught your last letter, theme, progress, translate */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
            {thread.theirReaction && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FBEEF1", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ fontSize: 12 }}>{thread.theirReaction}</Text>
                <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, color: "#C86E7A" }}>
                  {reactionLabel(thread.theirReaction) || "felt this"} — to your last letter
                </Text>
              </View>
            )}
            {st && (
              <View style={{ backgroundColor: `${st.color}14`, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ fontFamily: F.sansExtra, fontSize: 10, letterSpacing: 1, color: st.color }}>
                  {st.emoji} {st.name.en.toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.purpleLt, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <View
                  key={i}
                  style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: thread.revealed || i < dots ? C.purple : "#D6D6F0" }}
                />
              ))}
              <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, color: C.purple, marginLeft: 4 }}>
                {thread.revealed ? "names unlocked" : `${5 - dots} to names`}
              </Text>
            </View>
            <Pressable
              onPress={doTranslate}
              hitSlop={6}
              style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 }}
            >
              <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, color: C.purple }}>
                {xlBusy ? "translating…" : xl ? (showXl ? "original" : "translation") : "🕊 translate"}
              </Text>
            </Pressable>
          </View>

          {/* signature — the writer signs off at the end, like a letter */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.lineSoft }}>
            <StrangerAvatar seed={thread.other} size={38} round />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.serifSemi, fontSize: 15.5, color: C.ink }}>{alias}</Text>
              <Text style={{ fontFamily: F.sans, fontSize: 10.5, color: C.faint, marginTop: 1 }}>
                {thread.revealed ? "no longer a stranger" : "a stranger, for now"}
              </Text>
            </View>
            <ReportMenu
              targetUser={thread.other}
              context="thread"
              refId={thread.id}
              snapshot={thread.preview}
              onBlocked={onBlocked}
            />
          </View>
        </View>
        <Pressable onPress={onOpen} style={{ alignItems: "center", paddingTop: 12 }} hitSlop={8}>
          <Text style={{ fontFamily: F.sansBold, fontSize: 11.5, color: C.faint }}>Open the whole thread ›</Text>
        </Pressable>
      </View>

      {hasNext && (
        <Text style={{ fontFamily: F.sans, fontSize: 11.5, color: C.faint, textAlign: "center", marginBottom: 7 }}>
          One more letter is waiting above.
        </Text>
      )}

      {/* a lighter answer than a letter — one tap, they'll see it */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginBottom: 4 }}>
        {REACTIONS.map((r) => {
          const on = myR === r.emoji;
          return (
            <Pressable
              key={r.emoji}
              onPress={() => react(r.emoji)}
              hitSlop={4}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: on ? C.purpleLt : "transparent",
                borderWidth: 1.5,
                borderColor: on ? C.purple : C.line,
                transform: [{ scale: on ? 1.08 : 1 }],
              }}
            >
              <Text style={{ fontSize: 17 }}>{r.emoji}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: myR ? C.purple : C.faint, textAlign: "center", marginBottom: 2 }}>
        {myR ? `${myR} ${reactionLabel(myR)} — they'll see it` : "or answer with one tap"}
      </Text>

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
