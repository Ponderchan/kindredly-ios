import { useCallback, useMemo, useRef, useState } from "react";
import { Dimensions, Modal, Pressable, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { t as tr, useLang } from "../lib/i18n";
import { P, PF } from "../theme/post";
import { AuraTicket, StickerChip, W14, cardShadow } from "../components/AuraCard";
import { useAuth } from "../lib/auth";
import { getAuraScope, myAura, pauseCounts, setAuraScope, wordCounts, type Aura } from "../lib/aura";
import { dimLabel } from "../lib/aura-copy";
import { observationState, stickerCount, stickerLine, stickerName, usageGroupLabel, usageLine } from "../lib/sticker-copy";
import type { UsageGroup } from "../lib/usage-stickers";
import type { DimKey } from "../lib/hatch-engine";
import type { TraitObservation } from "../lib/writing-engine/stickers";
import { dShort } from "../lib/format";

/* WRITING AURA — the room (owner's sheet, three tabs).
   ────────────────────────────────────────────────────────────────────────
   PORTRAIT   the card as it travels, and the door to the stickers.
   DIMENSIONS the nine, one card at a time: what she found there, how
              many pieces it rests on, one sentence of yours, and a link
              to the sticker it became. A dimension with nothing to say
              says so.
   HABITS     counted, never read into: the words you lean on and where
              you used them, how you pause, and which of your text is in
              scope — letters and replies always, sealed pages only if you
              turn them on. Nothing here leaves the phone. */

const ORDER: DimKey[] = ["sentence", "structure", "perspective", "rhythm", "function", "vocabulary", "punctuation", "emotion", "quirks"];
const GROUPS: UsageGroup[] = ["time", "habit", "subject", "courier", "sealed"];
const PAGE = Dimensions.get("window").width - 44;

type Tab = "portrait" | "dims" | "habits";

export default function AuraScreen() {
  useLang();
  const router = useRouter();
  const { user, profile, handle } = useAuth();
  const [aura, setAura] = useState<Aura | null>(null);
  const [tab, setTab] = useState<Tab>("portrait");
  const [idx, setIdx] = useState(0);
  const [grid, setGrid] = useState(false);
  const [scope, setScope] = useState(false);
  const [sealedOn, setSealedOn] = useState(false);
  const [word, setWord] = useState<string | null>(null);
  const pager = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    const [a, sc] = await Promise.all([myAura((profile?.firstLine as string) || null), getAuraScope()]);
    setAura(a);
    setSealedOn(sc.sealed);
  }, [profile?.firstLine]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void load().then(() => alive);
      return () => {
        alive = false;
      };
    }, [load]),
  );

  const st = aura?.stickers ?? null;
  const goto = (i: number) => {
    setIdx(i);
    pager.current?.scrollTo({ x: i * PAGE, animated: true });
  };
  const onPage = (e: NativeSyntheticEvent<NativeScrollEvent>) => setIdx(Math.round(e.nativeEvent.contentOffset.x / PAGE));

  const words = useMemo(() => (aura ? wordCounts(aura.texts) : []), [aura]);
  const pauses = useMemo(() => (aura ? pauseCounts(aura.texts) : []), [aura]);
  // writing stickers that hold but did not get a seat on the card
  const extras = useMemo(() => {
    const home = new Set((aura?.stickers?.home ?? []).map((s) => s.stickerId));
    return (aura?.stickers?.board ?? []).filter((s) => !home.has(s.stickerId));
  }, [aura]);
  const usageBy = useMemo(() => GROUPS.map((g) => ({ g, items: (aura?.usage ?? []).filter((u) => u.group === g) })).filter((x) => x.items.length), [aura]);
  const wordHit = useMemo(() => {
    if (!aura || !word) return null;
    const re = new RegExp(`(^|[^\\p{L}])${word}(?=[^\\p{L}]|$)`, "iu");
    for (const p of Object.values(aura.pieceText)) {
      const sent = p.text.split(/(?<=[.!?。！？])\s+|\n+/).find((x) => re.test(x));
      if (sent) return sent.trim();
    }
    return null;
  }, [aura, word]);

  const seed = user?.id || "you";
  const avatarId = (profile?.avatarId as string) || null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.penWash }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 4 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.letter, fontSize: 24, color: W14.ink }}>‹</Text>
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontFamily: PF.serif, fontSize: 20, color: W14.ink }}>{tr("wa.title")}</Text>
        <Pressable onPress={() => router.push("/aura-card")} hitSlop={10} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.letter, fontSize: 18, color: P.pen }}>⇧</Text>
        </Pressable>
      </View>

      {/* the three lenses */}
      <View style={{ marginHorizontal: 22, marginTop: 8, flexDirection: "row", backgroundColor: "#E4E1FA", borderRadius: 12, padding: 3 }}>
        {(["portrait", "dims", "habits"] as Tab[]).map((k) => (
          <Pressable key={k} onPress={() => setTab(k)} style={{ flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: tab === k ? "#FFFFFF" : "transparent", alignItems: "center" }}>
            <Text style={{ fontFamily: PF.letter, fontWeight: tab === k ? "600" : "400", fontSize: 13, color: tab === k ? W14.ink : "rgba(30,27,53,0.55)" }}>{tr(`wa.tab.${k}`)}</Text>
          </Pressable>
        ))}
      </View>

      {aura && tab === "portrait" && (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <AuraTicket aura={aura} seed={seed} avatarId={avatarId} who={handle || "me"} />
        </ScrollView>
      )}

      {aura && tab === "dims" && (
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 22, paddingTop: 16 }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 1.4, color: "rgba(30,27,53,0.5)" }}>{tr("wa.dimOf", { i: idx + 1 })}</Text>
            <Pressable onPress={() => setGrid(true)} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontFamily: PF.letter, fontSize: 12.5, color: P.pen }}>{tr("wa.allDims")}</Text>
              <Text style={{ fontFamily: PF.mono, fontSize: 13, color: P.pen }}>⊞</Text>
            </Pressable>
          </View>
          <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onPage} contentContainerStyle={{ paddingHorizontal: 22 }} style={{ flexGrow: 0, marginTop: 12 }} snapToInterval={PAGE} decelerationRate="fast">
            {ORDER.map((d, i) => (
              <View key={d} style={{ width: PAGE }}>
                <DimCard d={d} i={i} aura={aura} />
              </View>
            ))}
          </ScrollView>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, marginTop: 16 }}>
            <Pressable onPress={() => goto(Math.max(0, idx - 1))} disabled={idx === 0} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: W14.hair, alignItems: "center", justifyContent: "center", opacity: idx === 0 ? 0.35 : 1 }}>
              <Text style={{ fontFamily: PF.letter, fontSize: 18, color: W14.ink }}>←</Text>
            </Pressable>
            <Text style={{ fontFamily: PF.letter, fontSize: 12, color: "rgba(30,27,53,0.5)" }}>{tr("wa.swipe")}</Text>
            <Pressable onPress={() => goto(Math.min(ORDER.length - 1, idx + 1))} disabled={idx === ORDER.length - 1} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: W14.hair, alignItems: "center", justifyContent: "center", opacity: idx === ORDER.length - 1 ? 0.35 : 1 }}>
              <Text style={{ fontFamily: PF.letter, fontSize: 18, color: W14.ink }}>→</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 14 }}>
            {ORDER.map((d, i) => (
              <View key={d} style={{ width: i === idx ? 14 : 5, height: 5, borderRadius: 3, backgroundColor: i === idx ? P.pen : "rgba(30,27,53,0.2)" }} />
            ))}
          </View>

          {/* the grid of nine */}
          <Modal visible={grid} transparent animationType="slide" onRequestClose={() => setGrid(false)}>
            <Pressable onPress={() => setGrid(false)} style={{ flex: 1, backgroundColor: "rgba(30,27,53,0.35)", justifyContent: "flex-end" }}>
              <Pressable onPress={() => {}} style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 34 }}>
                <View style={{ alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: "#D9D6E8" }} />
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 16 }}>
                  <Text style={{ flex: 1, fontFamily: PF.serif, fontSize: 22, color: W14.ink }}>{tr("wa.nine")}</Text>
                  <Pressable onPress={() => setGrid(false)} hitSlop={10}><Text style={{ fontFamily: PF.letter, fontSize: 18, color: "rgba(30,27,53,0.5)" }}>✕</Text></Pressable>
                </View>
                <Text style={{ fontFamily: PF.letter, fontSize: 12.5, color: "rgba(30,27,53,0.55)", marginTop: 4 }}>{tr("wa.nineSub")}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
                  {ORDER.map((d, i) => {
                    const on = i === idx;
                    return (
                      <Pressable key={d} onPress={() => { setGrid(false); goto(i); }} style={{ width: "31%", paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: on ? P.pen : W14.hair, backgroundColor: on ? "#EEEDFB" : "#FFFFFF", alignItems: "center", gap: 4 }}>
                        <Text style={{ fontFamily: PF.serif, fontSize: 18, color: on ? P.pen : W14.ink }}>{String(i + 1).padStart(2, "0")}</Text>
                        <Text style={{ fontFamily: PF.letter, fontSize: 11.5, color: on ? P.pen : "rgba(30,27,53,0.7)", textAlign: "center" }} numberOfLines={1}>{dimLabel(d)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        </View>
      )}

      {aura && tab === "habits" && (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 1.4, color: "rgba(30,27,53,0.5)" }}>{tr("wa.fromPieces", { n: aura.pieces })}</Text>
            <Pressable onPress={() => setScope(true)} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontFamily: PF.letter, fontSize: 12.5, color: P.pen }}>{tr("wa.scope")}</Text>
              <Text style={{ fontFamily: PF.mono, fontSize: 13, color: P.pen }}>≡</Text>
            </Pressable>
          </View>

          {/* the words you lean on */}
          <View style={[{ backgroundColor: W14.card, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 18, marginTop: 12 }, cardShadow, { shadowOpacity: 0.05 }]}>
            <Text style={{ fontFamily: PF.serif, fontSize: 21, color: W14.ink }}>{tr("wa.words")}</Text>
            {words.length ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "baseline", columnGap: 16, rowGap: 8, marginTop: 16 }}>
                {words.map(([w, c], i) => (
                  <Pressable key={w} onPress={() => setWord(word === w ? null : w)} hitSlop={4} style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <Text style={{ fontFamily: PF.serif, fontSize: i < 2 ? 24 : i < 4 ? 20 : 17, color: word === w ? P.pen : i % 2 ? "#2E7D4F" : "#4B44C7" }}>{w}</Text>
                    <Text style={{ fontFamily: PF.mono, fontSize: 9.5, color: "rgba(30,27,53,0.5)", marginLeft: 2 }}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={{ fontFamily: PF.letter, fontSize: 13.5, color: "rgba(30,27,53,0.55)", marginTop: 12 }}>{tr("wa.wordsNone")}</Text>
            )}
            {word && wordHit && (
              <View style={{ marginTop: 14, backgroundColor: "#EEEDFB", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 }}>
                <Text style={{ fontFamily: PF.letterSerif, fontSize: 15.5, lineHeight: 23, color: W14.ink }}>“{wordHit}”</Text>
              </View>
            )}
            <Text style={{ fontFamily: PF.letter, fontSize: 12, color: "rgba(30,27,53,0.5)", textAlign: "center", marginTop: 12 }}>{tr("wa.wordsHint")}</Text>
          </View>

          {/* how you pause */}
          <View style={[{ backgroundColor: W14.card, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 18, marginTop: 12 }, cardShadow, { shadowOpacity: 0.05 }]}>
            <Text style={{ fontFamily: PF.serif, fontSize: 21, color: W14.ink }}>{tr("wa.pauses")}</Text>
            <View style={{ marginTop: 14, gap: 12 }}>
              {pauses.map(([label, c], i) => {
                const max = Math.max(1, ...pauses.map((p) => p[1]));
                return (
                  <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Text style={{ width: 44, fontFamily: PF.mono, fontSize: 12, color: "rgba(30,27,53,0.6)" }}>{label}</Text>
                    <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: "#E4E1FA", overflow: "hidden" }}>
                      <View style={{ width: `${Math.round((c / max) * 100)}%`, height: 6, backgroundColor: i === 0 ? "#4B44C7" : "#8F87D9" }} />
                    </View>
                    <Text style={{ width: 28, textAlign: "right", fontFamily: PF.mono, fontSize: 12, color: "rgba(30,27,53,0.7)" }}>{c}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={{ fontFamily: PF.letter, fontSize: 12, color: "rgba(30,27,53,0.5)", marginTop: 12 }}>{tr("wa.pausesHint")}</Text>
          </View>

          {/* the rest of the stickers: writing ones without a seat, then what the product counted */}
          {extras.length > 0 && (
            <View style={[{ backgroundColor: W14.card, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 18, marginTop: 12 }, cardShadow, { shadowOpacity: 0.05 }]}>
              <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 1.4, color: "rgba(30,27,53,0.5)" }}>{tr("us.more")}</Text>
              <View style={{ marginTop: 14, gap: 14 }}>
                {extras.map((s, i) => (
                  <View key={s.stickerId} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <StickerChip id={s.stickerId} i={i} />
                    <Text style={{ flex: 1, fontFamily: PF.letter, fontSize: 13, lineHeight: 18, color: "rgba(30,27,53,0.7)" }}>{stickerCount(s)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {usageBy.length === 0 ? (
            <View style={[{ backgroundColor: W14.card, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 18, marginTop: 12 }, cardShadow, { shadowOpacity: 0.05 }]}>
              <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 1.4, color: "rgba(30,27,53,0.5)" }}>{usageGroupLabel("habit")}</Text>
              <Text style={{ fontFamily: PF.letter, fontSize: 13.5, color: "rgba(30,27,53,0.55)", marginTop: 12 }}>{tr("us.none")}</Text>
            </View>
          ) : (
            usageBy.map(({ g, items }) => (
              <View key={g} style={[{ backgroundColor: W14.card, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 18, marginTop: 12 }, cardShadow, { shadowOpacity: 0.05 }]}>
                <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 1.4, color: "rgba(30,27,53,0.5)" }}>{usageGroupLabel(g)}</Text>
                <View style={{ marginTop: 14, gap: 14 }}>
                  {items.map((u, i) => (
                    <View key={u.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <StickerChip id={u.id} i={i} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: PF.letter, fontSize: 13, lineHeight: 18, color: "rgba(30,27,53,0.7)" }}>{usageLine(u)}</Text>
                        {u.private && <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1.2, color: "rgba(30,27,53,0.45)", marginTop: 3 }}>🔒 {tr("us.private")}</Text>}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}

          <Pressable onPress={() => setScope(true)} style={{ marginTop: 12, backgroundColor: W14.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 13, color: "rgba(30,27,53,0.6)" }}>🔒</Text>
            <Text style={{ flex: 1, fontFamily: PF.letter, fontSize: 14, color: W14.ink }}>{tr("wa.scopeRow")}</Text>
            <Text style={{ fontFamily: PF.letter, fontSize: 16, color: "rgba(30,27,53,0.35)" }}>›</Text>
          </Pressable>

          {/* which of your text is in scope */}
          <Modal visible={scope} transparent animationType="slide" onRequestClose={() => setScope(false)}>
            <Pressable onPress={() => setScope(false)} style={{ flex: 1, backgroundColor: "rgba(30,27,53,0.35)", justifyContent: "flex-end" }}>
              <Pressable onPress={() => {}} style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 34 }}>
                <View style={{ alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: "#D9D6E8" }} />
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 16 }}>
                  <Text style={{ flex: 1, fontFamily: PF.serif, fontSize: 22, color: W14.ink }}>{tr("wa.scopeTitle")}</Text>
                  <Pressable onPress={() => setScope(false)} hitSlop={10}><Text style={{ fontFamily: PF.letter, fontSize: 18, color: "rgba(30,27,53,0.5)" }}>✕</Text></Pressable>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: W14.hair, marginTop: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 14.5, color: W14.ink }}>{tr("wa.scopeLetters")}</Text>
                    <Text style={{ fontFamily: PF.letter, fontSize: 12, color: "rgba(30,27,53,0.55)", marginTop: 3 }}>{tr("wa.scopeLettersSub")}</Text>
                  </View>
                  <Text style={{ fontFamily: PF.letter, fontSize: 12.5, color: "rgba(30,27,53,0.5)" }}>{tr("wa.included")}</Text>
                </View>
                <Pressable onPress={() => setSealedOn((v) => !v)} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: W14.hair }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 14.5, color: W14.ink }}>{tr("wa.scopeSealed")}</Text>
                    <Text style={{ fontFamily: PF.letter, fontSize: 12, color: "rgba(30,27,53,0.55)", marginTop: 3 }}>{tr("wa.scopeSealedSub")}</Text>
                  </View>
                  <View style={{ width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, borderColor: sealedOn ? P.pen : "#B9B4D6", backgroundColor: sealedOn ? P.pen : "transparent", alignItems: "center", justifyContent: "center" }}>
                    {sealedOn && <Text style={{ color: "#FFFFFF", fontSize: 13 }}>✓</Text>}
                  </View>
                </Pressable>
                <Text style={{ fontFamily: PF.letter, fontSize: 12, lineHeight: 18, color: "rgba(30,27,53,0.55)", marginTop: 14 }}>{tr("wa.scopeNote")}</Text>
                <Pressable
                  onPress={async () => {
                    await setAuraScope({ sealed: sealedOn });
                    setScope(false);
                    await load();
                  }}
                  style={({ pressed }) => ({ marginTop: 18, backgroundColor: W14.navy, borderRadius: 12, paddingVertical: 15, alignItems: "center", opacity: pressed ? 0.85 : 1 })}
                >
                  <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 14, color: "#FFFFFF" }}>{tr("wa.done")}</Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/* one dimension: what she found there, on what, with one sentence of yours */
function DimCard({ d, i, aura }: { d: DimKey; i: number; aura: Aura }) {
  const st = aura.stickers;
  const rep = st?.byDimension[d] ?? null;
  const obs = (st?.observations ?? []).filter((o) => o.dimension === d);
  const state: TraitObservation["state"] = rep ? rep.state : obs.some((o) => o.state === "balanced") ? "balanced" : "unknown";
  const ev = rep?.evidence.find((e) => aura.pieceText[e.pieceId]) ?? null;
  const piece = ev ? aura.pieceText[ev.pieceId] : null;
  const quote = ev && piece ? piece.text.slice(ev.start, ev.end) : null;
  const when = piece?.createdAt ? dShort(piece.createdAt) : "";
  return (
    <View style={[{ backgroundColor: W14.card, borderRadius: 18, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 18, marginRight: 0 }, cardShadow]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: "#EEEDFB" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 11, color: "#4B44C7" }}>{String(i + 1).padStart(2, "0")}</Text>
        </View>
        <Text style={{ fontFamily: PF.letter, fontSize: 12.5, color: "#4B44C7" }}>{dimLabel(d)}</Text>
      </View>
      <Text style={{ fontFamily: PF.serif, fontSize: 27, lineHeight: 33, color: W14.ink, marginTop: 14 }}>
        {rep ? stickerName(rep.stickerId) : state === "balanced" ? tr("wa.noLean") : tr("wa.stillReading")}
      </Text>
      <Text style={{ fontFamily: PF.letter, fontSize: 14, lineHeight: 21, color: "rgba(30,27,53,0.7)", marginTop: 10 }}>
        {rep ? `${stickerLine(rep)} ${stickerCount(rep)}` : state === "balanced" ? tr("st.noLean") : tr("st.stillReading")}
      </Text>
      {rep && <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: rep.state === "established" ? "#2E7D4F" : "rgba(30,27,53,0.45)", marginTop: 8 }}>{observationState(rep.state)}</Text>}
      {quote && ev && (
        <View style={{ marginTop: 16, backgroundColor: "#EEEDFB", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
          <Text style={{ fontFamily: PF.serifItalic, fontSize: 17, lineHeight: 25, color: W14.ink }} numberOfLines={4}>“{quote}”</Text>
          <Text style={{ fontFamily: PF.letter, fontSize: 11.5, color: "rgba(30,27,53,0.5)", marginTop: 8 }}>{tr(`wa.quoteFrom.${ev.source}`, { d: when })}</Text>
        </View>
      )}
    </View>
  );
}
