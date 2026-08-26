import { useCallback, useMemo, useState } from "react";
import { dimLabel, dimLine, dimSealed } from "../lib/aura-copy";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Line, Polygon } from "react-native-svg";
import { useFocusEffect, useRouter } from "expo-router";
import { t as tr, useLang } from "../lib/i18n";
import { P, PF, panel, rule } from "../theme/post";
import { WrenBird } from "../components/WrenBird";
import { useWrenName } from "../lib/wren-name";
import { useAuth } from "../lib/auth";
import { loadAuraHistory, myAura, type Aura, type AuraSnapshot } from "../lib/aura";
import type { DimScore } from "../lib/hatch-engine";
import { dLong } from "../lib/format";

/* THE AURA, OPENED — the radar, the nine dimensions, and the timeline.
   ────────────────────────────────────────────────────────────────────────
   The card on Me is the glance; this is the room. Overview draws all nine
   dimensions as one shape — a radar reads as A SHAPE first and numbers
   second, which is the point: your aura is a silhouette of how you write,
   not a report card. Locked dims draw at full ink; unlocked ones sit at
   their provisional score but the row below says what is still sealed.

   Tapping a dimension expands it in place: the score, hatch's read in
   warm words, and — for the dims where it means something — the words you
   lean on, counted from your own writing. No second screen: you are
   inspecting a shape, not navigating a report.

   The timeline is the aura's own history: local snapshots recorded only
   when something changed. Events, not a heartbeat. */

const R = 118;
const CX = 160;
const CY = 138;

export default function AuraScreen() {
  useLang();
  const router = useRouter();
  const wren = useWrenName();
  const { profile } = useAuth();
  const [aura, setAura] = useState<Aura | null>(null);
  const [hist, setHist] = useState<AuraSnapshot[]>([]);
  const [tab, setTab] = useState<"overview" | "timeline">("overview");
  const [openDim, setOpenDim] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const a = await myAura((profile?.firstLine as string) || null);
        if (!alive) return;
        setAura(a);
        setHist(await loadAuraHistory());
      })();
      return () => {
        alive = false;
      };
    }, [profile?.firstLine]),
  );

  const pts = useMemo(() => {
    if (!aura?.dims.length) return "";
    return aura.dims
      .map((d, i) => {
        const a = -Math.PI / 2 + (i / aura.dims.length) * Math.PI * 2;
        const r = (Math.max(d.score, 6) / 100) * R;
        return `${CX + r * Math.cos(a)},${CY + r * Math.sin(a)}`;
      })
      .join(" ");
  }, [aura]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.penWash }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 22, color: P.ink }}>‹</Text>
        </Pressable>
        <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 2, color: P.ink }}>{tr("vc.title")}</Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 11, color: P.ink40 }}>
          {aura ? `${Math.round(aura.formed * 100)}%` : ""}
        </Text>
      </View>
      <View style={{ ...rule }} />

      {/* two lenses, one rule underline like the tabs elsewhere */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingTop: 12, gap: 18 }}>
        {(["overview", "timeline"] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} hitSlop={8}>
            <Text
              style={{
                fontFamily: PF.monoSemi,
                fontSize: 11.5,
                letterSpacing: 1.4,
                color: tab === t ? P.pen : P.ink40,
                paddingBottom: 6,
                borderBottomWidth: 2,
                borderBottomColor: tab === t ? P.pen : "transparent",
              }}
            >
              {t.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      {aura && tab === "overview" && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* the shape of you */}
          <View style={{ backgroundColor: P.sheet, alignItems: "center", paddingVertical: 10, marginBottom: 14 }}>
            <View style={{ width: 320, height: 276 }}>
              <Svg width={320} height={276}>
                {[0.33, 0.66, 1].map((f) => (
                  <Polygon
                    key={f}
                    points={aura.dims
                      .map((_, i) => {
                        const a = -Math.PI / 2 + (i / aura.dims.length) * Math.PI * 2;
                        return `${CX + f * R * Math.cos(a)},${CY + f * R * Math.sin(a)}`;
                      })
                      .join(" ")}
                    stroke={P.ink12}
                    strokeWidth={1}
                    fill="none"
                  />
                ))}
                {aura.dims.map((_, i) => {
                  const a = -Math.PI / 2 + (i / aura.dims.length) * Math.PI * 2;
                  return <Line key={i} x1={CX} y1={CY} x2={CX + R * Math.cos(a)} y2={CY + R * Math.sin(a)} stroke={P.ink12} strokeWidth={0.5} />;
                })}
                <Polygon points={pts} fill="rgba(58,58,245,0.14)" stroke={P.pen} strokeWidth={1.5} />
              </Svg>
              {/* crisp labels over the svg, like the orbit does */}
              {aura.dims.map((d, i) => {
                const a = -Math.PI / 2 + (i / aura.dims.length) * Math.PI * 2;
                const lx = CX + (R + 24) * Math.cos(a);
                const ly = CY + (R + 18) * Math.sin(a);
                return (
                  <Text
                    key={d.key}
                    style={{
                      position: "absolute",
                      left: lx - 44,
                      top: ly - 7,
                      width: 88,
                      textAlign: "center",
                      fontFamily: PF.mono,
                      fontSize: 8.5,
                      letterSpacing: 0.6,
                      color: d.locked ? P.ink : P.ink40,
                    }}
                  >
                    {dimLabel(d.key).toUpperCase()}
                  </Text>
                );
              })}
            </View>
          </View>

          {/* nine rows; tap to open in place */}
          <View style={[panel, { paddingHorizontal: 16, paddingVertical: 4, marginBottom: 14 }]}>
            {aura.dims.map((d, i) => (
              <DimRow key={d.key} d={d} last={i === aura.dims.length - 1} open={openDim === d.key} onToggle={() => setOpenDim(openDim === d.key ? null : d.key)} words={d.key === "vocabulary" ? aura.commonWords : []} />
            ))}
          </View>

          {/* where the reading comes from — honest bookkeeping */}
          <View style={[panel, { paddingHorizontal: 16, paddingVertical: 12 }]}>
            <Text style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 1.4, color: P.ink40 }}>{tr("au.readFrom")}</Text>
            <Text style={{ fontFamily: PF.mono, fontSize: 11.5, lineHeight: 20, color: P.ink60, marginTop: 8 }}>
              {aura.sources.letters} LETTERS · {aura.sources.conversations} REPLIES · {aura.sources.sealed} SEALED PAGES
            </Text>
            <Text style={{ fontFamily: PF.serifItalic, fontSize: 12, lineHeight: 18, color: P.ink40, marginTop: 6 }}>
              Sealed pages shape this reading on your phone only — they are never sent anywhere, not even for matching.
            </Text>
          </View>
        </ScrollView>
      )}

      {aura && tab === "timeline" && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {hist.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <WrenBird size={34} mood="listen" />
              <Text style={{ fontFamily: PF.letter, fontSize: 16, color: P.ink60, marginTop: 12, textAlign: "center" }}>
                The story starts once something changes.
              </Text>
            </View>
          ) : (
            [...hist].reverse().map((s, i, arr) => {
              const prev = arr[i + 1];
              const gained = prev ? s.locked.filter((k) => !prev.locked.includes(k)) : s.locked;
              const becameName = prev && s.archetype !== prev.archetype && s.archetype;
              return (
                <View key={s.date + i} style={{ flexDirection: "row", gap: 12, marginBottom: 18 }}>
                  <View style={{ alignItems: "center" }}>
                    <View style={{ width: 8, height: 8, backgroundColor: i === 0 ? P.pen : P.ink12, marginTop: 4 }} />
                    {i < arr.length - 1 && <View style={{ flex: 1, width: 1, backgroundColor: P.ink12, marginTop: 4 }} />}
                  </View>
                  <View style={{ flex: 1, paddingBottom: 2 }}>
                    <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1, color: P.ink40 }}>
                      {dLong(s.date).toUpperCase()}
                    </Text>
                    {becameName ? (
                      <Text style={{ fontFamily: PF.letter, fontSize: 15, lineHeight: 22, color: P.ink, marginTop: 3 }}>
                        {wren} started calling you something new.
                      </Text>
                    ) : gained.length ? (
                      <Text style={{ fontFamily: PF.letter, fontSize: 15, lineHeight: 22, color: P.ink, marginTop: 3 }}>
                        {/* keys are for machines; a sentence is for a person.
                            Four or more at once is simply your voice arriving. */}
                        {gained.length >= 4
                          ? tr("au.allAtOnce")
                          : tr("au.came", { list: gained.map((k) => labelOf(k)).join(" and ") })}
                      </Text>
                    ) : (
                      <Text style={{ fontFamily: PF.letter, fontSize: 15, lineHeight: 22, color: P.ink60, marginTop: 3 }}>
                        {wren} met you. ({s.pieces} piece{s.pieces === 1 ? "" : "s"} of writing)
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const LABELS: Record<string, string> = {
  vocabulary: "word choice",
  sentence: "sentence shape",
  rhythm: "rhythm",
  emotion: "emotional range",
  perspective: "way of seeing",
  function: "little words",
  punctuation: "pauses",
  structure: "structure",
  quirks: "quirks",
};
const labelOf = (k: string) => LABELS[k] ?? k;

/* one dimension: bar + label collapsed; the read, the score and (for
   vocabulary) the counted words when open */
function DimRow({ d, last, open, onToggle, words }: { d: DimScore; last: boolean; open: boolean; onToggle: () => void; words: string[] }) {
  return (
    <Pressable onPress={onToggle} style={{ paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: P.ink12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={{ width: 108, fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.6, color: d.locked ? P.ink : P.ink40 }}>
          {dimLabel(d.key).toUpperCase()}
        </Text>
        <View style={{ flex: 1, height: 3, backgroundColor: P.ink12 }}>
          <View style={{ width: `${d.score}%`, height: 3, backgroundColor: d.locked ? P.pen : P.ink12 }} />
        </View>
        <Text style={{ fontFamily: PF.mono, fontSize: 10.5, color: d.locked ? P.pen : P.ink40, width: 26, textAlign: "right" }}>
          {d.locked ? d.score : "·"}
        </Text>
      </View>
      {open && (
        <View style={{ marginTop: 9, paddingLeft: 2 }}>
          <Text style={{ fontFamily: PF.letter, fontSize: 14.5, lineHeight: 21, color: d.locked ? P.ink : P.ink60 }}>
            {d.locked ? dimLine(d) : tr("dim.stillSealed", { s: dimSealed(d.key).toLowerCase() })}
          </Text>
          {d.locked && words.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
              {words.map((w) => (
                <View key={w} style={{ borderWidth: 1, borderColor: P.ink12, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontFamily: PF.mono, fontSize: 10.5, color: P.ink60 }}>{w}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}
