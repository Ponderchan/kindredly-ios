import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { P, PF } from "../theme/post";
import { W14, cardShadow } from "../components/AuraCard";
import { StampTile } from "../components/StampTile";
import { AvatarImage } from "../components/AvatarImage";
import { t, useLang } from "../lib/i18n";
import { fetchMyLetters, type WritingRow } from "../lib/aura";
import { fetchThreads, withdrawLetter, type ThreadSummary } from "../lib/db";
import { deleteDraft, loadDrafts, type Draft } from "../lib/drafts";

/* MY LETTERS — the owner's A1 sheet. Every letter you sent into the pool,
   as cards in two columns: the date, its stamp, the words, and what came
   of it — answered (by whom, if they signed), or still quiet. Drafts sit
   among them in a dashed card. A blue tile writes the next one.
   Replies inside correspondences are not letters; they live in Kindreds. */

type Filter = "all" | "answered" | "quiet" | "drafts";
interface Card {
  kind: "letter" | "draft";
  id: string;
  date: string;
  stamp: string | null;
  body: string;
  answers: ThreadSummary[];
  reads: number;
}

const ymd = (iso: string) => iso.slice(0, 10).replace(/-/g, ".");

export default function MyLetters() {
  useLang();
  const router = useRouter();
  const [letters, setLetters] = useState<WritingRow[] | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  // manage mode: the three lines open it, Cancel closes it; cards jiggle and wear a ×
  const [managing, setManaging] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchMyLetters().then((m) => alive && setLetters(m.letters));
    fetchThreads().then((th) => alive && setThreads(th || []));
    loadDrafts().then((d) => alive && setDrafts(d));
    return () => {
      alive = false;
    };
  }, []);

  const cards = useMemo<Card[]>(() => {
    // a correspondence that grew from my letter is that letter's answer —
    // by id (0020), or by the opening's text for rows older than that
    const byId = new Map<string, ThreadSummary[]>();
    const byOpening = new Map<string, ThreadSummary[]>();
    for (const th of threads) {
      if (!th.fromMyLetter) continue;
      if (th.letterId) byId.set(th.letterId, [...(byId.get(th.letterId) ?? []), th]);
      else if (th.opening) byOpening.set(th.opening, [...(byOpening.get(th.opening) ?? []), th]);
    }
    const ls: Card[] = (letters ?? []).map((l) => ({ kind: "letter", id: l.id, date: l.created_at ?? "", stamp: l.stamp ?? null, body: l.body, answers: [...(byId.get(l.id) ?? []), ...(byOpening.get(l.body) ?? [])], reads: l.reads ?? 0 }));
    const ds: Card[] = drafts.map((d) => ({ kind: "draft", id: d.id, date: d.date, stamp: d.stamp, body: d.body, answers: [], reads: 0 }));
    return [...ls, ...ds].sort((a, b) => b.date.localeCompare(a.date));
  }, [letters, threads, drafts]);

  const counts = {
    all: cards.filter((c) => c.kind === "letter").length,
    answered: cards.filter((c) => c.kind === "letter" && c.answers.length > 0).length,
    quiet: cards.filter((c) => c.kind === "letter" && c.answers.length === 0).length,
    drafts: drafts.length,
  };
  const shown = cards.filter((c) => (filter === "all" ? c.kind === "letter" : filter === "drafts" ? c.kind === "draft" : c.kind === "letter" && (filter === "answered" ? c.answers.length > 0 : c.answers.length === 0)));
  // the write tile is always first; the letters follow it newest first,
  // dealt left and right in turn
  const write = !(filter === "drafts" || managing);
  const cols: (Card | "write")[][] = [write ? ["write"] : [], []];
  shown.forEach((c, i) => cols[(i + (write ? 1 : 0)) % 2].push(c));

  const remove = (c: Card) => {
    Alert.alert(t(c.kind === "draft" ? "ml.rm.draftTitle" : "ml.rm.title"), t(c.kind === "draft" ? "ml.rm.draftBody" : "ml.rm.body"), [
      { text: t("ml.rm.keep"), style: "cancel" },
      {
        text: t("ml.rm.remove"),
        style: "destructive",
        onPress: async () => {
          if (c.kind === "draft") setDrafts(await deleteDraft(c.id));
          else if (await withdrawLetter(c.id)) setLetters((ls) => (ls ?? []).filter((l) => l.id !== c.id));
          else Alert.alert(t("ml.rm.failTitle"), t("ml.rm.failBody"));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.penWash }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 4, height: 48 }}>
        {managing ? (
          <>
            <Pressable onPress={() => setManaging(false)} hitSlop={10} style={{ paddingHorizontal: 8, height: 40, justifyContent: "center" }}>
              <Text style={{ fontFamily: PF.letter, fontSize: 16, color: W14.ink }}>{t("ml.cancel")}</Text>
            </Pressable>
            <Text style={{ flex: 1, textAlign: "center", fontFamily: PF.letter, fontWeight: "700", fontSize: 17, color: W14.ink }}>
              {t("ml.manage")} <Text style={{ color: "rgba(30,27,53,0.5)", fontWeight: "400" }}>{counts.all + counts.drafts}</Text>
            </Text>
            <View style={{ width: 64 }} />
          </>
        ) : (
          <>
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me"))} hitSlop={10} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: PF.letter, fontSize: 24, color: W14.ink }}>‹</Text>
            </Pressable>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "baseline", gap: 8 }}>
              <Text style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: 22, letterSpacing: -0.5, color: W14.ink }}>{t("ml.title")}</Text>
              <Text style={{ fontFamily: PF.letter, fontSize: 15, color: "rgba(30,27,53,0.5)" }}>{counts.all}</Text>
            </View>
            {/* three lines, all the same length — manage */}
            <Pressable onPress={() => setManaging(true)} hitSlop={10} accessibilityLabel={t("ml.manage")} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
              <Svg width={22} height={22} viewBox="0 0 24 24" stroke={W14.ink} strokeWidth={2} strokeLinecap="round">
                <Path d="M4 7h16M4 12h16M4 17h16" />
              </Svg>
            </Pressable>
          </>
        )}
      </View>

      {/* the four filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, gap: 8 }} style={{ flexGrow: 0 }}>
        {(["all", "answered", "quiet", "drafts"] as Filter[]).map((f) => {
          const on = filter === f;
          return (
            <Pressable key={f} onPress={() => setFilter(f)} style={{ backgroundColor: on ? W14.ink : "#FFFFFF", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
              <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 13, color: on ? "#FFFFFF" : W14.ink }}>
                {t(`ml.f.${f}`)} {counts[f]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {letters && shown.length === 0 && filter !== "all" && <Text style={{ fontFamily: PF.letter, fontSize: 14, color: "rgba(30,27,53,0.55)", textAlign: "center", marginTop: 40 }}>{t("ml.none")}</Text>}
        <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
          {cols.map((col, ci) => (
            <View key={ci} style={{ flex: 1, gap: 12 }}>
              {col.map((c) =>
                c === "write" ? (
                  <Pressable key="write" onPress={() => router.push("/compose")} style={({ pressed }) => ({ backgroundColor: P.pen, borderRadius: 16, paddingVertical: 22, alignItems: "center", gap: 10, opacity: pressed ? 0.9 : 1 })}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontFamily: PF.letter, fontSize: 20, color: "#FFFFFF", marginTop: -2 }}>+</Text>
                    </View>
                    <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 14, color: "#FFFFFF" }}>{t("ml.write")}</Text>
                  </Pressable>
                ) : c.kind === "draft" ? (
                  <Jiggle key={c.id} on={managing} seed={ci} onRemove={() => remove(c)}>
                    <Pressable onPress={managing ? undefined : () => router.push(`/compose?draft=${c.id}`)} style={({ pressed }) => ({ borderRadius: 16, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#B9B4F0", paddingHorizontal: 14, paddingVertical: 12, opacity: pressed ? 0.8 : 1 })}>
                      <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.4, color: "rgba(30,27,53,0.5)" }}>{t("ml.draft")} · {ymd(c.date)}</Text>
                      <Text style={{ fontFamily: PF.letterSerif, fontSize: 14, lineHeight: 20, color: "rgba(30,27,53,0.7)", marginTop: 8 }} numberOfLines={3}>
                        {c.body || t("ml.draftEmpty")}
                      </Text>
                    </Pressable>
                  </Jiggle>
                ) : (
                  <Jiggle key={c.id} on={managing} seed={ci} onRemove={() => remove(c)}>
                    <LetterCard c={c} onOpen={managing || !c.answers[0] ? undefined : () => router.push(c.answers[0].revealed ? `/room/${c.answers[0].id}` : `/chat/${c.answers[0].id}`)} />
                  </Jiggle>
                ),
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* manage mode: the card rocks like an iOS home screen in edit, each on its
   own phase, and wears a red × on its corner */
function Jiggle({ on, seed, onRemove, children }: { on: boolean; seed: number; onRemove: () => void; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) {
      v.stopAnimation();
      v.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 130, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: -1, duration: 260, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 130, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const start = setTimeout(() => loop.start(), (seed % 2) * 90);
    return () => {
      clearTimeout(start);
      loop.stop();
      v.setValue(0);
    };
  }, [on, seed, v]);
  const rotate = v.interpolate({ inputRange: [-1, 1], outputRange: seed % 2 ? ["1.4deg", "-1.4deg"] : ["-1.4deg", "1.4deg"] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      {children}
      {on && (
        <Pressable onPress={onRemove} hitSlop={8} style={{ position: "absolute", top: -8, right: -8, width: 26, height: 26, borderRadius: 13, backgroundColor: "#E5484D", borderWidth: 2, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
          <Svg width={11} height={11} viewBox="0 0 24 24" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round">
            <Path d="M6 6l12 12M18 6L6 18" />
          </Svg>
        </Pressable>
      )}
    </Animated.View>
  );
}

function LetterCard({ c, onOpen }: { c: Card; onOpen?: () => void }) {
  const a = c.answers;
  const named = a.find((th) => th.revealed && th.otherName);
  return (
    <Pressable onPress={onOpen} disabled={!onOpen} style={({ pressed }) => [{ backgroundColor: W14.card, borderRadius: 16, overflow: "hidden", opacity: pressed ? 0.92 : 1 }, cardShadow, { shadowOpacity: 0.05 }]}>
      <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.4, color: "rgba(30,27,53,0.5)" }}>{c.date ? ymd(c.date) : ""}</Text>
            {/* who read it, who wrote back */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 5 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="rgba(30,27,53,0.45)" strokeWidth={2}>
                  <Path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
                  <Circle cx={12} cy={12} r={3} />
                </Svg>
                <Text style={{ fontFamily: PF.mono, fontSize: 10.5, color: "rgba(30,27,53,0.5)" }}>{c.reads}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="rgba(30,27,53,0.45)" strokeWidth={2} strokeLinejoin="round">
                  <Rect x={3} y={5.5} width={18} height={13} rx={2} />
                  <Path d="M3.5 7l8.5 6 8.5-6" />
                </Svg>
                <Text style={{ fontFamily: PF.mono, fontSize: 10.5, color: "rgba(30,27,53,0.5)" }}>{c.answers.length}</Text>
              </View>
            </View>
          </View>
          {!!c.stamp && <StampTile id={c.stamp} w={28} r={6} />}
        </View>
        <Text style={{ fontFamily: PF.letterSerif, fontSize: 14.5, lineHeight: 20, color: W14.ink, marginTop: 10 }} numberOfLines={5}>
          {c.body}
        </Text>
      </View>
      {/* what came of it */}
      <View style={{ borderTopWidth: 1, borderTopColor: W14.hair, paddingHorizontal: 14, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 6 }}>
        {a.length === 0 ? (
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.4, color: "rgba(30,27,53,0.45)" }}>{t("ml.quiet")}</Text>
        ) : named ? (
          <>
            <AvatarImage id={named.otherFace ?? null} seed={named.other} size={18} />
            <Text style={{ fontFamily: PF.letter, fontSize: 12, color: W14.ink }} numberOfLines={1}>
              {a.length > 1 ? t("ml.repliedMore", { who: named.otherName!, n: a.length - 1 }) : t("ml.replied", { who: named.otherName! })}
            </Text>
          </>
        ) : (
          <>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#2E7D4F" }} />
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.4, color: "#2E7D4F" }} numberOfLines={1}>
              {t("ml.answered")} · {a.length}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}
