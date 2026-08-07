import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { C, F } from "../../theme/tokens";
import { Wren } from "../../components/Wren";
import { Caps } from "../../components/ui";
import { MorningPage } from "../../components/MorningPage";
import { ThreadRow } from "../../components/ThreadRow";
import { StampTile } from "../../components/StampTile";
import { useEntitlement } from "../../lib/entitlement";
import {
  fetchMorningCandidates,
  fetchPool,
  fetchThreads,
  type MorningCandidate,
  type PoolLetter,
  type ThreadSummary,
} from "../../lib/db";
import { curateMorning } from "../../lib/wren";
import { DEMO_POOL, DEMO_THREADS } from "../../data/demo";
import { dShort, fmt } from "../../lib/format";
import { deleteDraft, loadDrafts, type Draft } from "../../lib/drafts";
import { isKept, toggleKept } from "../../lib/kept";
import { cardStyle } from "../../theme/tokens";

const LANG = "en";

export default function LettersTab() {
  const { premium } = useEntitlement();
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [pool, setPool] = useState<PoolLetter[]>([]);
  const [morning, setMorning] = useState<MorningCandidate | null>(null);
  const [kept, setKept] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const [t, cands, p, d] = await Promise.all([
      fetchThreads(),
      fetchMorningCandidates(8, LANG),
      fetchPool(12),
      loadDrafts(),
    ]);
    setThreads(t || []);
    setPool(p || []);
    setDrafts(d);
    if (cands && cands.length) {
      const idx = await curateMorning(cands, undefined, LANG);
      const pick = cands[idx >= 0 ? idx : 0];
      setMorning(pick);
      setKept(await isKept(pick.id));
    } else {
      setMorning(null);
    }
    setLoaded(true);
  }, []);

  const onKeepMorning = async () => {
    if (!morning) return;
    const now = await toggleKept({ id: morning.id, text: morning.fragment, from: "morning" });
    setKept(now);
  };

  const onDeleteDraft = async (id: string) => {
    setDrafts(await deleteDraft(id));
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // dev preview: a full desk of sample post while there's no real data yet
  const demo = __DEV__ && loaded && threads.length === 0;
  const showThreads = demo ? DEMO_THREADS : threads;
  const showPool = demo ? DEMO_POOL : pool;
  const waitingOnYou = showThreads.filter((t) => !t.lastSenderMe);
  const sentWaiting = showThreads.filter((t) => t.lastSenderMe);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.serif, fontSize: 32, color: C.ink, letterSpacing: -0.5 }}>今天</Text>
            <Text style={{ fontFamily: F.sans, fontSize: 13.5, color: C.muted, marginTop: 4 }}>
              写给自己，偶尔有人回你。
            </Text>
          </View>
          {premium ? (
            <View style={{ backgroundColor: C.goldLt, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: 10, letterSpacing: 1.4, color: C.gold }}>会员</Text>
            </View>
          ) : null}
        </View>

        {/* today's line from someone else */}
        <View style={{ marginTop: 22 }}>
          {morning ? (
            <MorningPage
              fragment={morning.fragment}
              mood={morning.mood}
              kept={kept}
              onKeep={onKeepMorning}
              onWrite={() => router.push({ pathname: "/compose", params: { morning: "1" } })}
            />
          ) : (
            <EmptyMorning />
          )}
        </View>

        {/* write today — the core act */}
        <Pressable
          onPress={() => router.push("/journal-entry")}
          style={({ pressed }) => [
            cardStyle,
            { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, marginTop: 12, backgroundColor: C.navy, opacity: pressed ? 0.94 : 1 },
          ]}
        >
          <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 20, color: "#fff" }}>✎</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.serifSemi, fontSize: 17, color: "#fff" }}>写今天的日记</Text>
            <Text style={{ fontFamily: F.sans, fontSize: 12.5, color: "rgba(255,255,255,0.7)", marginTop: 3 }}>
              只存你手机里 · 写完可以挑一句发出去
            </Text>
          </View>
          <Text style={{ fontSize: 18, color: "rgba(255,255,255,0.5)" }}>›</Text>
        </Pressable>

        {/* ── 我的信 — the personal section ── */}
        {(waitingOnYou.length > 0 || sentWaiting.length > 0) && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 30 }}>
            <Caps>我的信</Caps>
            {demo && (
              <View style={{ backgroundColor: C.goldLt, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontFamily: F.sansBold, fontSize: 9, letterSpacing: 1, color: C.gold }}>示例</Text>
              </View>
            )}
          </View>
        )}

        {/* waiting on you */}
        {waitingOnYou.length > 0 && (
          <>
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 16, marginBottom: 12 }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: 11, letterSpacing: 1.2, color: C.ember }}>等你回</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.faint }}>{waitingOnYou.length} 封</Text>
            </View>
            {waitingOnYou.map((t) => (
              <ThreadRow key={t.id} t={t} onOpen={() => router.push(`/thread/${t.id}`)} />
            ))}
          </>
        )}

        {/* sent — waiting */}
        {sentWaiting.length > 0 && (
          <>
            <Text style={{ fontFamily: F.sansBold, fontSize: 11, letterSpacing: 1.2, color: C.label, marginTop: 20, marginBottom: 12 }}>
              发出去了，等回音
            </Text>
            {sentWaiting.map((t) => (
              <ThreadRow key={t.id} t={t} onOpen={() => router.push(`/thread/${t.id}`)} />
            ))}
          </>
        )}

        {/* mailbox — empty */}
        {!demo && loaded && threads.length === 0 && (
          <>
            <Caps style={{ marginTop: 30, marginBottom: 4 }}>我的信</Caps>
            <View style={[cardStyle, { alignItems: "center", paddingVertical: 40, paddingHorizontal: 24, marginTop: 12, borderStyle: "dashed", borderWidth: 1, borderColor: C.line }]}>
              <Wren size={40} mode="line" color={C.faint} />
              <Text style={{ fontFamily: F.serifSemi, fontSize: 21, color: C.ink, marginTop: 16, textAlign: "center" }}>
                还没有人和你来回写信。
              </Text>
              <Text style={{ fontFamily: F.sans, fontSize: 13.5, lineHeight: 21, color: C.muted, marginTop: 8, textAlign: "center", maxWidth: 300 }}>
                你分享出去的一句，有人回了，就会出现在这里。不着急，也没人催你。
              </Text>
              <Pressable onPress={() => router.push("/journal-entry")} style={{ marginTop: 18, backgroundColor: C.purple, borderRadius: 24, paddingHorizontal: 22, paddingVertical: 12 }}>
                <Text style={{ color: "#fff", fontFamily: F.sansBold, fontSize: 13, letterSpacing: 0.3 }}>写今天的日记</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* drafts — "they never send themselves" */}
        {drafts.length > 0 && (
          <>
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 20, marginBottom: 12 }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: 11, letterSpacing: 1.2, color: C.label }}>草稿</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.faint }}>只有你能看到</Text>
            </View>
            {drafts.map((d) => (
              <Pressable
                key={d.id}
                onPress={() => router.push({ pathname: "/compose", params: { draft: d.id } })}
                style={({ pressed }) => [
                  cardStyle,
                  { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, marginBottom: 10, borderStyle: "dashed", borderWidth: 1, borderColor: C.line, opacity: pressed ? 0.94 : 1 },
                ]}
              >
                <StampTile id={d.stamp} w={36} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.muted }}>
                    {d.body}
                  </Text>
                  <Text style={{ fontFamily: F.sans, fontSize: 11, color: C.faint, marginTop: 4 }}>{dShort(d.date)} · unsent</Text>
                </View>
                <Pressable onPress={() => onDeleteDraft(d.id)} hitSlop={10} style={{ padding: 6 }}>
                  <Text style={{ fontSize: 14, color: C.faint }}>✕</Text>
                </Pressable>
              </Pressable>
            ))}
          </>
        )}

        {/* ── 别人写的一句 — the shared pool ── */}
        {showPool.length > 0 && (
          <>
            <Caps style={{ marginTop: 30, marginBottom: 14 }}>别人写的，想回就回</Caps>
            {showPool.slice(0, 6).map((l) => {
              const isVoice = l.kind === "voice" && l.media_path;
              return (
                <Pressable
                  key={l.id}
                  onPress={() =>
                    router.push({
                      pathname: "/letter/[id]",
                      params: {
                        id: l.id,
                        author: l.author,
                        stamp: l.stamp,
                        body: l.body,
                        lang: l.lang,
                        kind: l.kind || "text",
                        media: l.media_path || "",
                        dur: l.duration_s != null ? String(l.duration_s) : "",
                      },
                    })
                  }
                  style={({ pressed }) => [
                    cardStyle,
                    { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, marginBottom: 10, opacity: pressed ? 0.94 : 1 },
                  ]}
                >
                  <StampTile id={l.stamp} w={40} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ fontFamily: F.serif, fontSize: 16, color: C.ink }}>
                        {isVoice ? "一个陌生人的语音" : "一个陌生人写道…"}
                      </Text>
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.ember }} />
                    </View>
                    {isVoice ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <Text style={{ fontSize: 12 }}>🎙</Text>
                        <Text style={{ fontFamily: F.sansSemi, fontSize: 13, color: C.purple }}>
                          {fmt(l.duration_s || 0)}
                        </Text>
                        {!!l.body && l.body !== "🎙 A voice letter" && (
                          <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.sans, fontSize: 13, color: C.muted }}>
                            · {l.body}
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Text numberOfLines={1} style={{ fontFamily: F.sans, fontSize: 13, color: C.muted, marginTop: 3 }}>
                        {l.body}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </>
        )}

        {/* the weekly question — last */}
        <View style={[cardStyle, { marginTop: 24, flexDirection: "row", alignItems: "center", gap: 12, padding: 18 }]}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.purple }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.serifSemi, fontSize: 16, color: C.ink }}>本周话题，周四开</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.muted, marginTop: 3, lineHeight: 18 }}>
              一周一个问题。回答它，保证有人回你。
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyMorning() {
  return (
    <View style={{ borderRadius: 22, overflow: "hidden", backgroundColor: C.purpleLt, padding: 24, minHeight: 150, justifyContent: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Wren size={18} mode="line" />
        <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1.4, color: C.purple }}>今天别人写的一句</Text>
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 19, lineHeight: 29, color: C.ink }}>
        每天早上 8 点，这里会有一句别人写的话。
      </Text>
      <Text style={{ fontFamily: F.sans, fontSize: 13, lineHeight: 20, color: C.muted, marginTop: 10 }}>
        不管有没有人回过你。
      </Text>
    </View>
  );
}
