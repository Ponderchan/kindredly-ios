import { useCallback, useMemo, useRef, useState } from "react";
import { Dimensions, Modal, Pressable, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { storeAura, storeMode } from "../lib/dev-store";
import { t as tr, useLang } from "../lib/i18n";
import { PF } from "../theme/post";
import { useP, useTheme } from "../lib/theme";
import { BRAND } from "../theme/themes";
import { AuraCard, StickerChip, cardShadow } from "../components/AuraCard";
import { GridIcon, ShareIcon } from "../components/Icons";
import { useAuth } from "../lib/auth";
import { getAuraScope, myAura, pauseCounts, setAuraScope, wordCounts, type Aura } from "../lib/aura";
import { observeAuraLocks } from "../lib/local-push";
import { dimLabel } from "../lib/aura-copy";
import { observationState, stickerCount, stickerLine, stickerName, usageGroupLabel, usageLine } from "../lib/sticker-copy";
import type { UsageGroup } from "../lib/usage-stickers";
import type { DimKey } from "../lib/hatch-engine";
import type { TraitObservation } from "../lib/writing-engine/stickers";
import { dShort } from "../lib/format";
import { SecondaryHeader } from "../components/10a/SecondaryHeader";

/* WRITING AURA — the room (owner's sheet, three tabs).
   ────────────────────────────────────────────────────────────────────────
   PORTRAIT   the card itself — the same one the Me tab shows, the
              picture developing rung by rung (the W33 ladder).
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

/* THE ROOM'S COLOURS COME FROM THE THEME (10a). P is useP(), so the page
   keeps the accent's palest wash under the edgeless white cards (lav2 in
   Classic); everything else is the 10a tokens by role. The old fixed inks
   read as: the room's #1E1B35 is ink, and so is the Done key's navy (a
   solid button is ink); its faded inks are sub for a sentence (.55 and
   up) and mute for a small label or caption (.5 and under); the chevron,
   the dots not in view and the empty tick box are faint; hairlines and
   the sheets' grabbers are line; cards and sheets are sf; the lens track
   and the pause tracks are lav; the pale washes are lav2; the aura's
   indigo (#4B44C7: the dimension labels, the marked words, the first
   pause bar) is ind, the other pause bars mute; and type on an ink or ind
   fill is the page colour.

   Kept the same in every theme: the dim behind the sheets (a scrim is
   dark over any ground), the cards' soft shadow, and the aura green
   (BRAND.greenText: an established reading, every other word you lean
   on), which is a brand colour in 10a. The stickers keep their own
   colours.

   10a step 5: the room sits on the page colour (tk.bg) under the secondary
   page's header (its title in mono, share on the right), and PORTRAIT is
   the same 10a Aura card Me draws (components/AuraCard, from the Me
   model's buildAuraCard), so the card you tapped on Me is the card that
   heads the room — no differently drawn copy (critic). */
const SCRIM = "rgba(30,27,53,0.35)";

export default function AuraScreen() {
  useLang();
  const P = useP();
  const { t: tk } = useTheme();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [aura, setAura] = useState<Aura | null>(null);
  const [tab, setTab] = useState<Tab>("portrait");
  const [idx, setIdx] = useState(0);
  const [grid, setGrid] = useState(false);
  const [scope, setScope] = useState(false);
  const [sealedOn, setSealedOn] = useState(false);
  const [word, setWord] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const pager = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    const [a, sc] = await Promise.all([__DEV__ && storeMode ? Promise.resolve(storeAura()) : myAura((profile?.firstLine as string) || null), getAuraScope()]);
    setAura(a);
    setSealedOn(sc.sealed);
    /* she said a line settled; you came to look — it's told, and a line
       still waiting to go out is withdrawn (lib/local-push) */
    if (!(__DEV__ && storeMode)) void observeAuraLocks(a.locked.map((d) => d.key), true);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: tk.bg }} edges={["top"]}>
      <SecondaryHeader
        title={tr("wa.title").toLocaleUpperCase()}
        fallbackHref="/(tabs)/me"
        right={
          <Pressable onPress={() => router.push("/aura-card")} hitSlop={6} accessibilityRole="button" accessibilityLabel={tr("ac.shareSm")} style={({ pressed }) => ({ width: 34, height: 34, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}>
            <ShareIcon size={22} color={P.pen} />
          </Pressable>
        }
      />

      {/* the three lenses */}
      <View style={{ marginHorizontal: 22, marginTop: 8, flexDirection: "row", backgroundColor: tk.lav, borderRadius: 12, padding: 3 }}>
        {(["portrait", "dims", "habits"] as Tab[]).map((k) => (
          <Pressable key={k} onPress={() => setTab(k)} style={{ flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: tab === k ? tk.sf : "transparent", alignItems: "center" }}>
            <Text style={{ fontFamily: PF.letter, fontWeight: tab === k ? "600" : "400", fontSize: 13, color: tab === k ? tk.ink : tk.sub }}>{tr(`wa.tab.${k}`)}</Text>
          </Pressable>
        ))}
      </View>

      {aura && tab === "portrait" && (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* the same card as on Me; its door leads to the labels here */}
          <AuraCard aura={aura} seed={seed} avatarId={avatarId} onOpen={() => setTab("dims")} onShare={() => router.push("/aura-card")} onWrite={() => router.push("/compose")} />
        </ScrollView>
      )}

      {aura && tab === "dims" && (
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 22, paddingTop: 16 }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 1.4, color: tk.mute }}>{tr("wa.dimOf", { i: idx + 1 })}</Text>
            <Pressable onPress={() => setGrid(true)} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 13, color: P.pen }}>{tr("wa.allDims")}</Text>
              <GridIcon size={18} color={P.pen} />
            </Pressable>
          </View>
          {/* the card takes the room down to the controls (the owner's
              screenshot): one dimension, one full page */}
          <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onPage} contentContainerStyle={{ paddingHorizontal: 22 }} style={{ flex: 1, marginTop: 12 }} snapToInterval={PAGE} decelerationRate="fast">
            {ORDER.map((d, i) => (
              <View key={d} style={{ width: PAGE, flex: 1 }}>
                <DimCard d={d} i={i} aura={aura} onRead={(r) => setReading(r)} />
              </View>
            ))}
          </ScrollView>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, marginTop: 16 }}>
            <Pressable onPress={() => goto(Math.max(0, idx - 1))} disabled={idx === 0} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: tk.line, alignItems: "center", justifyContent: "center", opacity: idx === 0 ? 0.35 : 1 }}>
              <Text style={{ fontFamily: PF.letter, fontSize: 18, color: tk.ink }}>←</Text>
            </Pressable>
            <Text style={{ fontFamily: PF.letter, fontSize: 12, color: tk.mute }}>{tr("wa.swipe")}</Text>
            <Pressable onPress={() => goto(Math.min(ORDER.length - 1, idx + 1))} disabled={idx === ORDER.length - 1} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: tk.line, alignItems: "center", justifyContent: "center", opacity: idx === ORDER.length - 1 ? 0.35 : 1 }}>
              <Text style={{ fontFamily: PF.letter, fontSize: 18, color: tk.ink }}>→</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 14, marginBottom: 18 }}>
            {ORDER.map((d, i) => (
              <View key={d} style={{ width: i === idx ? 14 : 5, height: 5, borderRadius: 3, backgroundColor: i === idx ? P.pen : tk.faint }} />
            ))}
          </View>

          {/* the sentence and the read: the whole piece, the words the rule
              fired on marked, and what the sticker says it means */}
          <Modal visible={!!reading} transparent animationType="slide" onRequestClose={() => setReading(null)}>
            <Pressable onPress={() => setReading(null)} style={{ flex: 1, backgroundColor: SCRIM, justifyContent: "flex-end" }}>
              <Pressable onPress={() => {}} style={{ backgroundColor: tk.sf, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 34, maxHeight: "80%" }}>
                <View style={{ alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: tk.line }} />
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 16 }}>
                  <Text style={{ flex: 1, fontFamily: PF.serif, fontSize: 22, color: tk.ink }}>{tr("wa.readTitle")}</Text>
                  <Pressable onPress={() => setReading(null)} hitSlop={10}><Text style={{ fontFamily: PF.letter, fontSize: 18, color: tk.mute }}>✕</Text></Pressable>
                </View>
                {reading && (
                  <ScrollView style={{ marginTop: 14 }} showsVerticalScrollIndicator={false}>
                    <Text style={{ fontFamily: PF.letterSerif, fontSize: 17, lineHeight: 27, color: tk.ink }}>
                      {reading.text.slice(0, reading.start)}
                      <Text style={{ backgroundColor: tk.lav2, color: tk.ind }}>{reading.text.slice(reading.start, reading.end)}</Text>
                      {reading.text.slice(reading.end)}
                    </Text>
                    <Text style={{ fontFamily: PF.letter, fontSize: 11.5, color: tk.mute, marginTop: 10 }}>{reading.from}</Text>
                    <View style={{ marginTop: 16, backgroundColor: tk.lav2, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
                      <Text style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: 14, color: tk.ink }}>{reading.name}</Text>
                      <Text style={{ fontFamily: PF.letter, fontSize: 14, lineHeight: 21, color: tk.sub, marginTop: 4 }}>{reading.line}</Text>
                    </View>
                  </ScrollView>
                )}
              </Pressable>
            </Pressable>
          </Modal>

          {/* the grid of nine */}
          <Modal visible={grid} transparent animationType="slide" onRequestClose={() => setGrid(false)}>
            <Pressable onPress={() => setGrid(false)} style={{ flex: 1, backgroundColor: SCRIM, justifyContent: "flex-end" }}>
              <Pressable onPress={() => {}} style={{ backgroundColor: tk.sf, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 34 }}>
                <View style={{ alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: tk.line }} />
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 16 }}>
                  <Text style={{ flex: 1, fontFamily: PF.serif, fontSize: 22, color: tk.ink }}>{tr("wa.nine")}</Text>
                  <Pressable onPress={() => setGrid(false)} hitSlop={10}><Text style={{ fontFamily: PF.letter, fontSize: 18, color: tk.mute }}>✕</Text></Pressable>
                </View>
                <Text style={{ fontFamily: PF.letter, fontSize: 12.5, color: tk.sub, marginTop: 4 }}>{tr("wa.nineSub")}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
                  {ORDER.map((d, i) => {
                    const on = i === idx;
                    return (
                      <Pressable key={d} onPress={() => { setGrid(false); goto(i); }} style={{ width: "31%", paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: on ? P.pen : tk.line, backgroundColor: on ? tk.lav2 : tk.sf, alignItems: "center", gap: 4 }}>
                        <Text style={{ fontFamily: PF.serif, fontSize: 18, color: on ? P.pen : tk.ink }}>{String(i + 1).padStart(2, "0")}</Text>
                        <Text style={{ fontFamily: PF.letter, fontSize: 11.5, color: on ? P.pen : tk.sub, textAlign: "center" }} numberOfLines={1}>{dimLabel(d)}</Text>
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
            <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 1.4, color: tk.mute }}>{tr("wa.fromPieces", { n: aura.pieces })}</Text>
            <Pressable onPress={() => setScope(true)} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontFamily: PF.letter, fontSize: 12.5, color: P.pen }}>{tr("wa.scope")}</Text>
              <Text style={{ fontFamily: PF.mono, fontSize: 13, color: P.pen }}>≡</Text>
            </Pressable>
          </View>

          {/* the words you lean on */}
          <View style={[{ backgroundColor: tk.sf, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 18, marginTop: 12 }, cardShadow, { shadowOpacity: 0.05 }]}>
            <Text style={{ fontFamily: PF.serif, fontSize: 21, color: tk.ink }}>{tr("wa.words")}</Text>
            {words.length ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "baseline", columnGap: 16, rowGap: 8, marginTop: 16 }}>
                {words.map(([w, c], i) => (
                  <Pressable key={w} onPress={() => setWord(word === w ? null : w)} hitSlop={4} style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <Text style={{ fontFamily: PF.serif, fontSize: i < 2 ? 24 : i < 4 ? 20 : 17, color: word === w ? P.pen : i % 2 ? BRAND.greenText : tk.ind }}>{w}</Text>
                    <Text style={{ fontFamily: PF.mono, fontSize: 9.5, color: tk.mute, marginLeft: 2 }}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={{ fontFamily: PF.letter, fontSize: 13.5, color: tk.sub, marginTop: 12 }}>{tr("wa.wordsNone")}</Text>
            )}
            {word && wordHit && (
              <View style={{ marginTop: 14, backgroundColor: tk.lav2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 }}>
                <Text style={{ fontFamily: PF.letterSerif, fontSize: 15.5, lineHeight: 23, color: tk.ink }}>“{wordHit}”</Text>
              </View>
            )}
            <Text style={{ fontFamily: PF.letter, fontSize: 12, color: tk.mute, textAlign: "center", marginTop: 12 }}>{tr("wa.wordsHint")}</Text>
          </View>

          {/* how you pause */}
          <View style={[{ backgroundColor: tk.sf, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 18, marginTop: 12 }, cardShadow, { shadowOpacity: 0.05 }]}>
            <Text style={{ fontFamily: PF.serif, fontSize: 21, color: tk.ink }}>{tr("wa.pauses")}</Text>
            <View style={{ marginTop: 14, gap: 12 }}>
              {pauses.map(([label, c], i) => {
                const max = Math.max(1, ...pauses.map((p) => p[1]));
                return (
                  <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Text style={{ width: 44, fontFamily: PF.mono, fontSize: 12, color: tk.sub }}>{label}</Text>
                    <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: tk.lav, overflow: "hidden" }}>
                      <View style={{ width: `${Math.round((c / max) * 100)}%`, height: 6, backgroundColor: i === 0 ? tk.ind : tk.mute }} />
                    </View>
                    <Text style={{ width: 28, textAlign: "right", fontFamily: PF.mono, fontSize: 12, color: tk.sub }}>{c}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={{ fontFamily: PF.letter, fontSize: 12, color: tk.mute, marginTop: 12 }}>{tr("wa.pausesHint")}</Text>
          </View>

          {/* the rest of the stickers: writing ones without a seat, then what the product counted */}
          {extras.length > 0 && (
            <View style={[{ backgroundColor: tk.sf, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 18, marginTop: 12 }, cardShadow, { shadowOpacity: 0.05 }]}>
              <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 1.4, color: tk.mute }}>{tr("us.more")}</Text>
              <View style={{ marginTop: 14, gap: 14 }}>
                {extras.map((s, i) => (
                  <View key={s.stickerId} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <StickerChip id={s.stickerId} i={i} />
                    <Text style={{ flex: 1, fontFamily: PF.letter, fontSize: 13, lineHeight: 18, color: tk.sub }}>{stickerCount(s)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {usageBy.length === 0 ? (
            <View style={[{ backgroundColor: tk.sf, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 18, marginTop: 12 }, cardShadow, { shadowOpacity: 0.05 }]}>
              <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 1.4, color: tk.mute }}>{usageGroupLabel("habit")}</Text>
              <Text style={{ fontFamily: PF.letter, fontSize: 13.5, color: tk.sub, marginTop: 12 }}>{tr("us.none")}</Text>
            </View>
          ) : (
            usageBy.map(({ g, items }) => (
              <View key={g} style={[{ backgroundColor: tk.sf, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 18, marginTop: 12 }, cardShadow, { shadowOpacity: 0.05 }]}>
                <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 1.4, color: tk.mute }}>{usageGroupLabel(g)}</Text>
                <View style={{ marginTop: 14, gap: 14 }}>
                  {items.map((u, i) => (
                    <View key={u.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <StickerChip id={u.id} i={i} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: PF.letter, fontSize: 13, lineHeight: 18, color: tk.sub }}>{usageLine(u)}</Text>
                        {u.private && <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1.2, color: tk.mute, marginTop: 3 }}>🔒 {tr("us.private")}</Text>}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}

          <Pressable onPress={() => setScope(true)} style={{ marginTop: 12, backgroundColor: tk.sf, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 13, color: tk.sub }}>🔒</Text>
            <Text style={{ flex: 1, fontFamily: PF.letter, fontSize: 14, color: tk.ink }}>{tr("wa.scopeRow")}</Text>
            <Text style={{ fontFamily: PF.letter, fontSize: 16, color: tk.faint }}>›</Text>
          </Pressable>

          {/* which of your text is in scope */}
          <Modal visible={scope} transparent animationType="slide" onRequestClose={() => setScope(false)}>
            <Pressable onPress={() => setScope(false)} style={{ flex: 1, backgroundColor: SCRIM, justifyContent: "flex-end" }}>
              <Pressable onPress={() => {}} style={{ backgroundColor: tk.sf, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 34 }}>
                <View style={{ alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: tk.line }} />
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 16 }}>
                  <Text style={{ flex: 1, fontFamily: PF.serif, fontSize: 22, color: tk.ink }}>{tr("wa.scopeTitle")}</Text>
                  <Pressable onPress={() => setScope(false)} hitSlop={10}><Text style={{ fontFamily: PF.letter, fontSize: 18, color: tk.mute }}>✕</Text></Pressable>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: tk.line, marginTop: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 14.5, color: tk.ink }}>{tr("wa.scopeLetters")}</Text>
                    <Text style={{ fontFamily: PF.letter, fontSize: 12, color: tk.sub, marginTop: 3 }}>{tr("wa.scopeLettersSub")}</Text>
                  </View>
                  <Text style={{ fontFamily: PF.letter, fontSize: 12.5, color: tk.mute }}>{tr("wa.included")}</Text>
                </View>
                <Pressable onPress={() => setSealedOn((v) => !v)} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: tk.line }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 14.5, color: tk.ink }}>{tr("wa.scopeSealed")}</Text>
                    <Text style={{ fontFamily: PF.letter, fontSize: 12, color: tk.sub, marginTop: 3 }}>{tr("wa.scopeSealedSub")}</Text>
                  </View>
                  <View style={{ width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, borderColor: sealedOn ? P.pen : tk.faint, backgroundColor: sealedOn ? P.pen : "transparent", alignItems: "center", justifyContent: "center" }}>
                    {sealedOn && <Text style={{ color: tk.bg, fontSize: 13 }}>✓</Text>}
                  </View>
                </Pressable>
                <Text style={{ fontFamily: PF.letter, fontSize: 12, lineHeight: 18, color: tk.sub, marginTop: 14 }}>{tr("wa.scopeNote")}</Text>
                <Pressable
                  onPress={async () => {
                    await setAuraScope({ sealed: sealedOn });
                    setScope(false);
                    await load();
                  }}
                  style={({ pressed }) => ({ marginTop: 18, backgroundColor: tk.ink, borderRadius: 12, paddingVertical: 15, alignItems: "center", opacity: pressed ? 0.85 : 1 })}
                >
                  <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 14, color: tk.bg }}>{tr("wa.done")}</Text>
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
/* what the reading sheet shows: the piece, the span, the sticker's words */
interface Reading {
  text: string;
  start: number;
  end: number;
  from: string;
  name: string;
  line: string;
}

function DimCard({ d, i, aura, onRead }: { d: DimKey; i: number; aura: Aura; onRead: (r: Reading) => void }) {
  const P = useP();
  const { t: tk } = useTheme();
  const st = aura.stickers;
  const rep = st?.byDimension[d] ?? null;
  const obs = (st?.observations ?? []).filter((o) => o.dimension === d);
  const state: TraitObservation["state"] = rep ? rep.state : obs.some((o) => o.state === "balanced") ? "balanced" : "unknown";
  const ev = rep?.evidence.find((e) => aura.pieceText[e.pieceId]) ?? null;
  const piece = ev ? aura.pieceText[ev.pieceId] : null;
  const quote = ev && piece ? piece.text.slice(ev.start, ev.end) : null;
  const when = piece?.createdAt ? dShort(piece.createdAt) : "";
  return (
    <View style={[{ flex: 1, backgroundColor: tk.sf, borderRadius: 18, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 18, marginRight: 0 }, cardShadow]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: tk.lav2 }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 11, color: tk.ind }}>{String(i + 1).padStart(2, "0")}</Text>
        </View>
        <Text style={{ fontFamily: PF.letter, fontSize: 12.5, color: tk.ind }}>{dimLabel(d)}</Text>
      </View>
      <Text style={{ fontFamily: PF.serif, fontSize: 27, lineHeight: 33, color: tk.ink, marginTop: 14 }}>
        {rep ? stickerName(rep.stickerId) : state === "balanced" ? tr("wa.noLean") : tr("wa.stillReading")}
      </Text>
      <Text style={{ fontFamily: PF.letter, fontSize: 14, lineHeight: 21, color: tk.sub, marginTop: 10 }}>
        {rep ? `${stickerLine(rep)} ${stickerCount(rep)}` : state === "balanced" ? tr("st.noLean") : tr("st.stillReading")}
      </Text>
      {rep && <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: rep.state === "established" ? BRAND.greenText : tk.mute, marginTop: 8 }}>{observationState(rep.state)}</Text>}
      {quote && ev && (
        <View style={{ marginTop: 16, backgroundColor: tk.lav2, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
          <Text style={{ fontFamily: PF.serifItalic, fontStyle: "italic", fontSize: 17, lineHeight: 25, color: tk.ink }} numberOfLines={4}>“{quote}”</Text>
          <Text style={{ fontFamily: PF.letter, fontSize: 11.5, color: tk.mute, marginTop: 8 }}>{tr(`wa.quoteFrom.${ev.source}`, { d: when })}</Text>
        </View>
      )}
      <View style={{ flex: 1 }} />
      {/* the door to the whole sentence and what it was read as */}
      {rep && quote && ev && piece && (
        <Pressable
          onPress={() => onRead({ text: piece.text, start: ev.start, end: ev.end, from: tr(`wa.quoteFrom.${ev.source}`, { d: when }), name: stickerName(rep.stickerId), line: stickerLine(rep) })}
          hitSlop={8}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}
        >
          <Text style={{ fontFamily: PF.letter, fontSize: 13, color: P.pen }}>{tr("wa.seeRead")}</Text>
          <Text style={{ fontFamily: PF.letter, fontSize: 15, color: P.pen }}>↗</Text>
        </Pressable>
      )}
    </View>
  );
}
