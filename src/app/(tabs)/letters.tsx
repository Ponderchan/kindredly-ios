import { useCallback, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
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

/* Letters — the home is not a mailbox, it's the letter in front of you.
   One letter, full, enlarged; the home IS the reading page. A finite
   vertical deck of your correspondences + today's stranger line, ending in
   a calm "you're all caught up" card. One state-driven action per letter;
   a small ＋ (top-right) is the only way to start something new. */

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
  const [choosing, setChoosing] = useState(false);

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
  const frag = morning?.fragment || (demo ? "今天忙到现在才想起来，我一整天没跟任何人说过话。" : null);
  const waiting = showThreads.filter((t) => !t.lastSenderMe); // your turn

  // the finite deck: letters in front of you, then the calm end-cap
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
                  <EndCap onNew={() => setChoosing(true)} onSealed={() => router.push("/journal")} />
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

        {/* top overlay — a quiet count + the only "start new" affordance */}
        <View style={{ position: "absolute", top: 6, left: 22, right: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: F.sansBold, fontSize: 12, letterSpacing: 0.5, color: C.faint }}>
            {onLetter ? `${idx + 1} / ${deck.length}` : ""}
          </Text>
          <Pressable
            onPress={() => setChoosing(true)}
            hitSlop={8}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, alignItems: "center", justifyContent: "center", ...cardStyle }}
          >
            <Text style={{ fontSize: 22, color: C.ink, marginTop: -2 }}>＋</Text>
          </Pressable>
        </View>
      </View>

      <WriteChoice
        visible={choosing}
        onSomeone={() => {
          setChoosing(false);
          router.push("/compose");
        }}
        onMyself={() => {
          setChoosing(false);
          router.push("/journal-entry");
        }}
        onClose={() => setChoosing(false)}
      />
    </SafeAreaView>
  );
}

/* one letter, full screen */
function LetterView({ page, hasNext, onAct }: { page: Page; hasNext: boolean; onAct: () => void }) {
  if (page.kind === "end") return null;
  const isMorning = page.kind === "morning";
  const t = page.kind === "thread" ? page.t : null;
  const who = isMorning ? "一个陌生人" : t!.otherName || `No. ${postNo(t!.other)}`;
  const meta = isMorning
    ? "还没人拆过的一封信"
    : t!.mine >= 5
      ? "满 5 封，可以看名字了"
      : `还差 ${5 - t!.mine} 封就能看名字`;
  const body = isMorning ? page.frag : t!.preview;
  const stamp = isMorning ? "cant-sleep" : t!.stamp;
  const label = isMorning ? "回 ta 一句" : "读完了，回 ta 一句";

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
            ↑ 上滑，还有下一封
          </Text>
        )}
        <Pressable onPress={onAct} style={{ backgroundColor: C.navy, borderRadius: 26, paddingVertical: 17, alignItems: "center" }}>
          <Text style={{ color: "#fff", fontFamily: F.sansExtra, fontSize: 13, letterSpacing: 1 }}>{label}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* the calm end — nothing more to do, and that's the point */
function EndCap({ onNew, onSealed }: { onNew: () => void; onSealed: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, paddingBottom: 90 }}>
      <View style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 1.5, borderColor: C.line, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <Text style={{ fontSize: 22, color: C.purple }}>✓</Text>
      </View>
      <Text style={{ fontFamily: F.serif, fontSize: 24, color: C.ink, textAlign: "center" }}>今天的信，都读完了。</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 18 }}>
        <Wren size={16} mode="line" />
        <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1.2, color: C.purple }}>WREN</Text>
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 24, color: C.muted, textAlign: "center", marginTop: 8, maxWidth: 280 }}>
        该回的都回了。把手机放下吧 —— 信箱，我替你看着。
      </Text>
      <Text style={{ fontFamily: F.sansBold, fontSize: 11.5, letterSpacing: 0.4, color: C.purple, marginTop: 22 }}>
        ✦ 有新的，明早八点叫你
      </Text>

      <View style={{ position: "absolute", bottom: 110, alignItems: "center", gap: 10 }}>
        <Pressable onPress={onNew} hitSlop={8}>
          <Text style={{ fontFamily: F.sans, fontSize: 13, color: C.muted }}>想写点什么？＋</Text>
        </Pressable>
        <Pressable onPress={onSealed} hitSlop={8}>
          <Text style={{ fontFamily: F.sans, fontSize: 13, color: C.faint }}>回看你封存的信 ↗</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* start something new — every write is a letter, only the recipient differs */
function WriteChoice({
  visible,
  onSomeone,
  onMyself,
  onClose,
}: {
  visible: boolean;
  onSomeone: () => void;
  onMyself: () => void;
  onClose: () => void;
}) {
  const Opt = ({ title, sub, onPress }: { title: string; sub: string; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [cardStyle, { padding: 18, marginBottom: 10, borderWidth: 1, borderColor: pressed ? C.purple : C.line }]}
    >
      <Text style={{ fontFamily: F.serifSemi, fontSize: 17, color: C.ink }}>{title}</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.muted, marginTop: 3 }}>{sub}</Text>
    </Pressable>
  );
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(20,20,26,0.35)", justifyContent: "flex-end" }} onPress={onClose}>
        <Pressable style={{ backgroundColor: C.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 40 }} onPress={() => {}}>
          <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: C.line, marginBottom: 18 }} />
          <Text style={{ fontFamily: F.serifSemi, fontSize: 20, color: C.ink, marginBottom: 4 }}>写一封信</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.muted, marginBottom: 18 }}>写给谁,都是一封信。</Text>
          <Opt title="写给一个陌生人" sub="投出去 · 也许有人会回你" onPress={onSomeone} />
          <Opt title="写给自己" sub="封存起来 · 不寄出,只有你看得到" onPress={onMyself} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
