import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { C, F, cardStyle } from "../../theme/tokens";
import { Wren } from "../../components/Wren";
import { StampTile } from "../../components/StampTile";
import {
  fetchMorningCandidates,
  fetchThreads,
  type MorningCandidate,
  type ThreadSummary,
} from "../../lib/db";
import { curateMorning } from "../../lib/wren";
import { DEMO_THREADS } from "../../data/demo";
import { postNo } from "../../lib/format";

const LANG = "en";

/* Today — the home is the letter in front of you, not a mailbox. A finite
   vertical deck of your correspondences + today's stranger letter, ending in
   a calm end-cap. One action at the bottom: Write back while reading, Write to
   a stranger once you're caught up. Writing your own is always a tap away
   (top-right). A letter can be a single line — no ceremony. */

type Page =
  | { kind: "morning"; frag: string }
  | { kind: "thread"; t: ThreadSummary }
  | { kind: "end" };

export default function LettersTab() {
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [morning, setMorning] = useState<MorningCandidate | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pageH, setPageH] = useState(0);
  const [idx, setIdx] = useState(0);

  const load = useCallback(async () => {
    const [t, cands] = await Promise.all([fetchThreads(), fetchMorningCandidates(8, LANG)]);
    setThreads(t || []);
    if (cands && cands.length) {
      const i = await curateMorning(cands, undefined, LANG);
      setMorning(cands[i >= 0 ? i : 0]);
    } else {
      setMorning(null);
    }
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // dev preview while there's no real data
  const demo = __DEV__ && loaded && threads.length === 0;
  const showThreads = demo ? DEMO_THREADS : threads;
  const frag = morning?.fragment || (demo ? "It's late and I realized I haven't spoken to a single person all day." : null);
  const waiting = showThreads.filter((t) => !t.lastSenderMe); // your turn

  const deck: Page[] = [
    ...(frag ? ([{ kind: "morning", frag }] as Page[]) : []),
    ...waiting.map((t) => ({ kind: "thread", t }) as Page),
  ];
  const pages: Page[] = [...deck, { kind: "end" }];
  const onLetter = idx < deck.length && deck.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={["top"]}>
      <View style={{ flex: 1 }} onLayout={(e) => setPageH(e.nativeEvent.layout.height)}>
        {pageH > 0 && (
          <ScrollView
            pagingEnabled
            showsVerticalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.y / pageH))}
          >
            {pages.map((p, i) => (
              <View key={i} style={{ height: pageH }}>
                {p.kind === "end" ? (
                  <EndCap onWrite={() => router.push("/compose")} />
                ) : (
                  <LetterView
                    page={p}
                    hasNext={i < deck.length - 1}
                    onAct={() =>
                      p.kind === "morning"
                        ? router.push({ pathname: "/compose", params: { morning: "1" } })
                        : router.push(`/thread/${p.t.id}`)
                    }
                  />
                )}
              </View>
            ))}
          </ScrollView>
        )}

        {/* top: a quiet count + the always-there "write a letter" */}
        <View style={{ position: "absolute", top: 8, left: 22, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: F.sansBold, fontSize: 12, letterSpacing: 0.5, color: C.faint }}>
            {onLetter ? `${idx + 1} / ${deck.length}` : ""}
          </Text>
          {onLetter && (
            <Pressable
              onPress={() => router.push("/compose")}
              style={[cardStyle, { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 18 }]}
            >
              <Text style={{ fontSize: 12 }}>✍️</Text>
              <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, color: C.ink }}>Write a letter</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

/* one letter, full screen */
function LetterView({ page, hasNext, onAct }: { page: Page; hasNext: boolean; onAct: () => void }) {
  if (page.kind === "end") return null;
  const isMorning = page.kind === "morning";
  const t = page.kind === "thread" ? page.t : null;
  const who = isMorning ? "A stranger" : t!.otherName || `No. ${postNo(t!.other)}`;
  const meta = isMorning
    ? "no one's written back yet"
    : t!.mine >= 5
      ? "5 letters — names are open"
      : `${5 - t!.mine} more letters to names`;
  const body = isMorning ? page.frag : t!.preview;
  const stamp = isMorning ? "cant-sleep" : t!.stamp;
  const label = isMorning ? "Write back" : "Read it — write back";

  return (
    <View style={{ flex: 1, paddingHorizontal: 26, paddingTop: 56, paddingBottom: 120 }}>
      {/* from */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <StampTile id={stamp} w={44} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.serif, fontSize: 18, color: C.ink }}>{who}</Text>
          <Text style={{ fontFamily: F.sans, fontSize: 12, color: C.faint, marginTop: 2 }}>{meta}</Text>
        </View>
      </View>

      {/* the letter */}
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Text style={{ fontFamily: F.letter, fontSize: 22, lineHeight: 36, color: "#22222A" }}>{body}</Text>
      </View>

      {/* one action */}
      <View>
        {hasNext && (
          <Text style={{ fontFamily: F.sans, fontSize: 12, color: C.faint, textAlign: "center", marginBottom: 12 }}>
            ↑ swipe up — one more
          </Text>
        )}
        <Pressable onPress={onAct} style={{ backgroundColor: C.navy, borderRadius: 26, paddingVertical: 17, alignItems: "center" }}>
          <Text style={{ color: "#fff", fontFamily: F.sansExtra, fontSize: 13, letterSpacing: 1 }}>{label}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* the calm end — all caught up. Nothing more to do, and that's the point. */
function EndCap({ onWrite }: { onWrite: () => void }) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 30, paddingTop: 56, paddingBottom: 120 }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 1.5, borderColor: C.line, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <Text style={{ fontSize: 22, color: C.purple }}>✓</Text>
        </View>
        <Text style={{ fontFamily: F.serif, fontSize: 24, color: C.ink, textAlign: "center" }}>You're all caught up.</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 18 }}>
          <Wren size={16} mode="line" />
          <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1.2, color: C.purple }}>WREN</Text>
        </View>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 24, color: C.muted, textAlign: "center", marginTop: 8, maxWidth: 280 }}>
          You answered everything. Put your phone down — I'll watch the door.
        </Text>
        <Text style={{ fontFamily: F.sansBold, fontSize: 11.5, letterSpacing: 0.4, color: C.purple, marginTop: 22 }}>
          ✦ New letters arrive at eight
        </Text>
      </View>

      <View style={{ alignItems: "center" }}>
        <Pressable onPress={onWrite} style={{ backgroundColor: C.navy, borderRadius: 26, paddingVertical: 17, alignItems: "center", width: "100%" }}>
          <Text style={{ color: "#fff", fontFamily: F.sansExtra, fontSize: 13, letterSpacing: 1 }}>Write to a stranger</Text>
        </Pressable>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.faint, marginTop: 12 }}>Just write — Wren reads it first.</Text>
      </View>
    </View>
  );
}
