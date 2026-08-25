import { speakAs, useWrenName } from "../lib/wren-name";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { P, PF } from "../theme/post";
import { WrenBird, type WrenAccessory, type WrenMood, type WrenSkin, type WrenStage } from "./WrenBird";
import { ACCESSORY_META, SKINS, STAGE_ORDER, skinUnlocked, stageIndex, stageInfo } from "../lib/wren-style";
import { useWrenSkinControl } from "../lib/wren-skin";
import { fetchCarried, getStageDates, isDozing, mintSouvenirs, sinceLastVisit, whereabouts, type AwayReport, type Souvenir } from "../lib/whereabouts";
import type { ThreadSummary } from "../lib/db";
import type { GrowthStats } from "../data/growth";

/* HER ROOM — the owner's mockup, built in the postal grammar.
   ────────────────────────────────────────────────────────────────────────
   One identity: she is your MESSENGER. The page answers, top to bottom:
   where is she right now → how far the two of you have come (ONE ladder,
   with dates) → what she kept from real journeys → the four places her
   day happens → what she's wearing. The second XP bar ("how well she
   knows you") is gone from here on purpose: that story lives on the aura
   card, typed. Two ladders on one page taught nobody anything.

   Everything on this page is derived from journeys that actually
   happened. The souvenirs are counted, the whereabouts are read off the
   threads, the dates are the days the stages really turned. */

const WB: Record<string, { mood: WrenMood; label: string; sub: string }> = {
  home: { mood: "content", label: "At home", sub: "no letters out" },
  delivery: { mood: "curious", label: "On a delivery", sub: "at someone's door" },
  bringing: { mood: "delight", label: "Bringing something", sub: "on the way back" },
  exploring: { mood: "listen", label: "Exploring", sub: "looking for you" },
};

export function WrenHome({
  stats,
  threads,
  accessory,
  premium,
  stageFloor = "egg",
  joinedAt,
  topWord,
  pieces = 0,
  onEquip,
  onLocked,
  onTrack,
  onPlus,
}: {
  stats: GrowthStats;
  threads: ThreadSummary[];
  accessory: WrenAccessory;
  premium: boolean;
  stageFloor?: WrenStage;
  joinedAt?: string | null;
  topWord?: string | null;
  pieces?: number;
  onEquip: (a: WrenAccessory) => void;
  onLocked: () => void;
  onTrack: () => void;
  onPlus: () => void;
}) {
  const { skin, pick } = useWrenSkinControl();
  const info = stageInfo(stats, stageFloor);
  const wren = useWrenName();
  const where = whereabouts(threads);
  const [souvenirs, setSouvenirs] = useState<Souvenir[]>([]);
  const [away, setAway] = useState<AwayReport | null>(null);
  const [dozy, setDozy] = useState(false);
  const [dates, setDates] = useState<Partial<Record<WrenStage, string>>>({});
  const [open, setOpen] = useState<null | "looks" | "dress">(null);
  const wearsHere = info.stage === "wren" || info.stage === "hatch";

  useEffect(() => {
    let alive = true;
    fetchCarried().then(async (c) => {
      const [shelf, diff] = await Promise.all([mintSouvenirs(c, threads, topWord), sinceLastVisit(c, threads)]);
      if (!alive) return;
      setSouvenirs(shelf);
      setAway(diff);
      setDozy(isDozing(c));
    });
    getStageDates().then((d) => alive && setDates(d));
    return () => {
      alive = false;
    };
  }, [threads, topWord]);

  const tapSkin = (id: WrenSkin) => {
    if (skinUnlocked(id, stats, premium)) return pick(id);
    const meta = SKINS.find((s) => s.id === id);
    if (meta?.lock === "plus") onLocked();
    else Alert.alert("Not yet", "The Plush look unlocks with your first kindred — when you and a stranger trade names.");
  };

  const dateFor = (st: WrenStage): string | null => {
    if (st === "egg" && joinedAt) return short(joinedAt);
    const d = dates[st];
    return d ? short(d) : null;
  };
  const milestones: Record<WrenStage, string> = {
    egg: "signed up",
    hatch: "first letter",
    fledge: "a reply, or 5 letters",
    wren: "first kindred",
  };

  const items = ACCESSORY_META.filter((a) => a.id !== "none");
  const looksOwned = SKINS.filter((s) => skinUnlocked(s.id, stats, premium)).length;

  return (
    <View style={{ borderWidth: 1, borderColor: P.ink }}>
      {/* ── hero: her name, her whereabouts, her face ── */}
      <View style={{ flexDirection: "row", padding: 16, paddingBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: PF.letter, fontSize: 26, fontWeight: "700", color: P.ink }}>{wren}</Text>
          <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.4, color: P.ink40, marginTop: 3 }}>
            YOUR MESSENGER
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 14 }}>
            <View style={{ width: 7, height: 7, backgroundColor: where.state === "bringing" ? P.pen : P.ink40 }} />
            <Text style={{ fontFamily: PF.monoMed, fontSize: 11, letterSpacing: 0.8, color: where.state === "bringing" ? P.pen : P.ink }}>
              {where.line.toUpperCase()}
            </Text>
          </View>
          {away && (
            <Text style={{ fontFamily: PF.mono, fontSize: 8.5, letterSpacing: 0.8, color: P.ink60, marginTop: 7 }}>
              {`WHILE YOU WERE AWAY${away.carriedOut ? ` · ${away.carriedOut} CARRIED OUT` : ""}${away.broughtBack ? ` · ${away.broughtBack} BROUGHT BACK` : ""}`}
            </Text>
          )}
          <Pressable onPress={onTrack} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, alignSelf: "flex-start", borderWidth: 1, borderColor: P.ink12, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 1, color: P.ink60 }}>TRACK {wren.toUpperCase()}</Text>
            <Text style={{ fontFamily: PF.mono, fontSize: 10, color: P.ink60 }}>→</Text>
          </Pressable>
        </View>
        <View style={{ alignItems: "center", justifyContent: "center" }}>
          {/* what she'd yell over her shoulder */}
          <View style={{ borderWidth: 1, borderColor: P.ink12, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 6 }}>
            <Text style={{ fontFamily: PF.serifItalic, fontSize: 11, color: P.ink60 }}>{dozy && where.state === "home" ? "zzz…" : speakAs(where.bubble, wren)}</Text>
          </View>
          <WrenBird size={64} stage={info.stage} mood={dozy && where.state === "home" ? "sleepy" : WB[where.state].mood} accessory={wearsHere ? accessory : "none"} />
        </View>
      </View>

      {/* ── the journey: ONE ladder, with the days it really turned ── */}
      <View style={{ borderTopWidth: 1, borderTopColor: P.ink12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 }}>
        <Text style={{ fontFamily: PF.monoMed, fontSize: 9, letterSpacing: 1.6, color: P.ink40 }}>
          {wren.toUpperCase()}'S JOURNEY
        </Text>
        <View style={{ flexDirection: "row", marginTop: 12 }}>
          {STAGE_ORDER.map((st, i) => {
            const cur = stageIndex(info.stage);
            const idx = stageIndex(st);
            const state = idx < cur ? "done" : idx === cur ? "now" : "later";
            const d = state !== "later" ? dateFor(st) : null;
            return (
              <View key={st} style={{ flex: 1, flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ alignItems: "center", width: 64 }}>
                  <View
                    style={{
                      width: state === "now" ? 22 : 14,
                      height: state === "now" ? 22 : 14,
                      marginTop: state === "now" ? 0 : 4,
                      backgroundColor: state === "later" ? "transparent" : state === "now" ? P.pen : P.ink,
                      borderWidth: state === "later" ? 1 : 0,
                      borderColor: P.ink40,
                    }}
                  />
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: 8.5, letterSpacing: 0.8, color: state === "now" ? P.pen : state === "done" ? P.ink : P.ink40, marginTop: 6 }}>
                    {st.toUpperCase()}
                    {state === "done" ? " ✓" : ""}
                  </Text>
                  <Text style={{ fontFamily: PF.mono, fontSize: 7.5, letterSpacing: 0.4, color: P.ink40, marginTop: 3, textAlign: "center" }}>
                    {d ?? milestones[st]}
                  </Text>
                </View>
                {i < STAGE_ORDER.length - 1 && (
                  <View style={{ flex: 1, height: 1, backgroundColor: idx < cur ? P.ink : P.ink12, marginTop: state === "now" ? 11 : 10, marginHorizontal: 2 }} />
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* ── souvenirs: what she kept from journeys that really happened ── */}
      {souvenirs.length > 0 && (
        <View style={{ borderTopWidth: 1, borderTopColor: P.ink12, paddingTop: 12, paddingBottom: 14 }}>
          <Text style={{ fontFamily: PF.monoMed, fontSize: 9, letterSpacing: 1.6, color: P.ink40, paddingHorizontal: 16 }}>
            SOUVENIRS
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 9, paddingTop: 10 }}>
            {souvenirs.map((s) => (
              <View key={s.id} style={{ width: 108, borderWidth: 1, borderColor: P.ink12, padding: 10, alignItems: "center" }}>
                <Text style={{ fontSize: 20 }}>{s.glyph}</Text>
                <Text numberOfLines={1} style={{ fontFamily: PF.letter, fontSize: 12, fontWeight: "600", color: P.ink, marginTop: 7 }}>
                  {s.title}
                </Text>
                <Text numberOfLines={1} style={{ fontFamily: PF.mono, fontSize: 8, letterSpacing: 0.6, color: P.ink40, marginTop: 4 }}>
                  {s.detail}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── her four places — where a messenger's day happens ── */}
      <View style={{ borderTopWidth: 1, borderTopColor: P.ink12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 }}>
        <Text style={{ fontFamily: PF.monoMed, fontSize: 9, letterSpacing: 1.6, color: P.ink40 }}>
          {wren.toUpperCase()} IS…
        </Text>
        <View style={{ flexDirection: "row", marginTop: 10 }}>
          {(Object.keys(WB) as (keyof typeof WB)[]).map((k) => {
            const on = where.state === k;
            return (
              <View key={k} style={{ flex: 1, alignItems: "center", opacity: on ? 1 : 0.38 }}>
                <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: on ? 1.5 : 0, borderColor: P.pen, borderRadius: 22 }}>
                  <WrenBird size={30} bare mood={WB[k].mood} />
                </View>
                <Text style={{ fontFamily: PF.monoMed, fontSize: 8, letterSpacing: 0.5, color: on ? P.pen : P.ink60, marginTop: 5, textAlign: "center" }}>
                  {WB[k].label.toUpperCase()}
                </Text>
                <Text style={{ fontFamily: PF.mono, fontSize: 7.5, color: P.ink40, marginTop: 2, textAlign: "center" }}>{WB[k].sub}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ── looks & dress (unchanged mechanics, postal clothes) ── */}
      <Row
        label="LOOKS"
        sub={SKINS.find((s) => s.id === skin)?.name ?? "Sticker"}
        count={`${looksOwned}/3`}
        openState={open === "looks"}
        onPress={() => setOpen(open === "looks" ? null : "looks")}
      />
      {open === "looks" && (
        <View style={{ flexDirection: "row", paddingHorizontal: 14, paddingBottom: 14, gap: 9 }}>
          {SKINS.map((sk) => {
            const on = skin === sk.id;
            const unlocked = skinUnlocked(sk.id, stats, premium);
            return (
              <Pressable key={sk.id} onPress={() => tapSkin(sk.id)} style={{ flex: 1, alignItems: "center", paddingVertical: 9, borderWidth: on ? 1.5 : 1, borderColor: on ? P.pen : P.ink12 }}>
                <View style={{ opacity: unlocked ? 1 : 0.4 }}>
                  <WrenBird size={44} mood="happy" skin={sk.id} />
                </View>
                <Text style={{ fontFamily: PF.monoMed, fontSize: 9, color: on ? P.pen : P.ink60, marginTop: 3 }}>{sk.name.toUpperCase()}</Text>
                {!unlocked && (
                  <Text style={{ fontFamily: PF.mono, fontSize: 7.5, color: P.brassSeal, marginTop: 2 }}>
                    {sk.lock === "plus" ? "KINDREDLY+" : "FIRST KINDRED"}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      <Row
        label="DRESS"
        sub={accessory === "none" ? "Bare" : ACCESSORY_META.find((a) => a.id === accessory)?.label ?? ""}
        count={`${items.filter((a) => a.free || premium).length}/${items.length}`}
        openState={open === "dress"}
        onPress={() => setOpen(open === "dress" ? null : "dress")}
      />
      {open === "dress" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 14, gap: 9 }}>
          {ACCESSORY_META.map((a) => {
            const locked = !a.free && !premium;
            const on = accessory === a.id;
            return (
              <Pressable key={a.id} onPress={() => (locked ? onLocked() : onEquip(a.id))} style={{ width: 70, alignItems: "center", paddingVertical: 8, borderWidth: on ? 1.5 : 1, borderColor: on ? P.pen : P.ink12 }}>
                <View style={{ opacity: locked ? 0.4 : 1 }}>
                  <WrenBird size={44} mood="happy" accessory={a.id === "none" ? "none" : a.id} />
                </View>
                <Text style={{ fontFamily: PF.mono, fontSize: 8, color: on ? P.pen : P.ink60, marginTop: 2 }}>
                  {locked ? `🔒 ${a.label}` : a.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* ── the door to Kindredly+: her archive, not your words ── */}
      <Pressable onPress={onPlus} style={{ borderTopWidth: 1, borderTopColor: P.ink, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, backgroundColor: P.penWash }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.2, color: P.ink }}>KINDREDLY+</Text>
          <Text style={{ fontFamily: PF.letter, fontSize: 12.5, color: P.ink60, marginTop: 3 }}>
            {`${wren}'s full journey archive, and a year of her in one letter.`}
          </Text>
        </View>
        <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 1, color: P.pen }}>{premium ? "ACTIVE →" : "UNLOCK →"}</Text>
      </Pressable>
    </View>
  );
}

const short = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();

function Row({ label, sub, count, openState, onPress }: { label: string; sub: string; count: string; openState: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 10, borderTopWidth: 1, borderTopColor: P.ink12 }}>
      <Text style={{ fontFamily: PF.monoMed, fontSize: 9.5, letterSpacing: 1.3, color: P.ink40 }}>{label}</Text>
      <Text style={{ fontFamily: PF.letter, fontSize: 13, fontWeight: "600", color: P.ink }}>{sub}</Text>
      <View style={{ flex: 1 }} />
      <Text style={{ fontFamily: PF.mono, fontSize: 10, color: P.ink40 }}>{count}</Text>
      <Text style={{ fontFamily: PF.mono, fontSize: 13, color: P.ink40, transform: [{ rotate: openState ? "90deg" : "0deg" }] }}>›</Text>
    </Pressable>
  );
}
