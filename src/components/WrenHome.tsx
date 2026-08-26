import { speakAs, useWrenName } from "../lib/wren-name";
import { dShort, postNo } from "../lib/format";
import { Image } from "react-native";
import { keepsake } from "../data/keepsakes";
import { COFOUNDER_GOLD, CofounderMark } from "./CofounderMark";
import { mint, unseen, type Minted } from "../lib/keepsakes";
import { loadJournal } from "../lib/journal";
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, ScrollView, Text, View } from "react-native";
import { P, PF } from "../theme/post";
import { WrenBird, type WrenAccessory, type WrenMood, type WrenSkin, type WrenStage } from "./WrenBird";
import { ACCESSORY_META, SKINS, STAGE_ORDER, skinUnlocked, stageIndex, stageInfo } from "../lib/wren-style";
import { useWrenSkinControl } from "../lib/wren-skin";
import { WHEREABOUTS_META, fetchCarried, getStageDates, isDozing, mintSouvenirs, sinceLastVisit, whereabouts, flightLog, type AwayReport, type Souvenir, type Whereabouts } from "../lib/whereabouts";
import type { ThreadSummary } from "../lib/db";
import type { GrowthStats } from "../data/growth";

/* HER ROOM — the owner's mockup, built in the postal grammar.
   ────────────────────────────────────────────────────────────────────────
   One identity: she is your COURIER. The page answers, top to bottom:
   where is she right now → how far the two of you have come (ONE ladder,
   with dates) → what she kept from real journeys → the four places her
   day happens → what she's wearing. The second XP bar ("how well she
   knows you") is gone from here on purpose: that story lives on the aura
   card, typed. Two ladders on one page taught nobody anything.

   Everything on this page is derived from journeys that actually
   happened. The souvenirs are counted, the whereabouts are read off the
   threads, the dates are the days the stages really turned. */

const WB = WHEREABOUTS_META;

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
  onOpenThread,
  onOpenKeepsake,
  cofounderNo = null,
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
  onOpenThread: (t: ThreadSummary) => void;
  onOpenKeepsake: (id: string) => void;
  /** her ring — the one cofounder mark another person ever sees */
  cofounderNo?: number | null;
  onPlus: () => void;
}) {
  const { skin, pick } = useWrenSkinControl();
  const info = stageInfo(stats, stageFloor);
  const wren = useWrenName();
  const where = whereabouts(threads);
  const [souvenirs, setSouvenirs] = useState<Souvenir[]>([]);
  const [away, setAway] = useState<AwayReport | null>(null);
  const [dozy, setDozy] = useState(false);
  const [carried, setCarried] = useState<{ at: string }[]>([]);
  const [shelf, setShelf] = useState<Minted[]>([]);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [dates, setDates] = useState<Partial<Record<WrenStage, string>>>({});
  const [open, setOpen] = useState<null | "looks" | "dress">(null);
  const [tracking, setTracking] = useState(false);
  const [log, setLog] = useState(false);
  const wearsHere = info.stage === "wren" || info.stage === "hatch";

  useEffect(() => {
    let alive = true;
    fetchCarried().then(async (c) => {
      const [shelf, diff] = await Promise.all([mintSouvenirs(c, threads, topWord), sinceLastVisit(c, threads)]);
      if (!alive) return;
      setCarried(c);
      setSouvenirs(shelf);
      const journal = await loadJournal().catch(() => []);
      const minted = await mint({ carried: c, threads, journal, commonWords: topWord ? [topWord] : [] });
      if (!alive) return;
      setShelf(minted);
      setFresh(await unseen(minted));
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
    if ((st === "egg" || st === "hatch") && !dates[st] && joinedAt) return short(joinedAt);
    const d = dates[st];
    return d ? short(d) : null;
  };
  /* display names — the stored ids stay (floors are persisted by index).
     The species is not a stage: her final form is GROWN, not "wren". */
  /* NO EGG IN THE PRODUCT. Onboarding hatches her before anyone reaches
     this room, so an EGG node would be a tick nobody ever watched turn.
     HATCH is her birthday; the ladder starts where the user does. */
  const JOURNEY: WrenStage[] = ["hatch", "fledge", "wren"];
  const STAGE_LABEL: Record<WrenStage, string> = { egg: "EGG", hatch: "HATCH", fledge: "FLEDGE", wren: "GROWN" };
  const milestones: Record<WrenStage, string> = {
    egg: "signed up",

    hatch: "born",
    fledge: "a reply, or 5 letters",
    wren: "first kindred",
  };

  const STAGE_BLURB: Record<WrenStage, string> = {
    egg: "Still in the egg — waiting for your first word.",
    hatch: "Newly hatched, and listening to your words.",
    fledge: "Learning to fly, finding the right windows.",
    wren: "Many journeys together.",
  };
  const flies = info.stage !== "egg";

  const items = ACCESSORY_META.filter((a) => a.id !== "none");
  const looksOwned = SKINS.filter((s) => skinUnlocked(s.id, stats, premium)).length;

  return (
    <View style={{ borderWidth: 1, borderColor: P.ink }}>
      {/* ── hero: her name, her whereabouts, her face ── */}
      <View style={{ flexDirection: "row", padding: 16, paddingBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: PF.letter, fontSize: 26, fontWeight: "700", color: P.ink }}>{wren}</Text>
          <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.4, color: P.ink40, marginTop: 3 }}>
            YOUR COURIER
          </Text>
          {cofounderNo != null && (
            <View style={{ marginTop: 7 }}>
              <CofounderMark no={cofounderNo} />
            </View>
          )}
          <Text style={{ fontFamily: PF.serifItalic, fontSize: 13, lineHeight: 19, color: P.ink60, marginTop: 8, paddingRight: 6 }}>
            {STAGE_BLURB[info.stage]}
          </Text>
          {flies && (<View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 12 }}>
            <View style={{ width: 7, height: 7, backgroundColor: where.state === "bringing" ? P.pen : P.ink40 }} />
            <Text style={{ fontFamily: PF.monoMed, fontSize: 11, letterSpacing: 0.8, color: where.state === "bringing" ? P.pen : P.ink }}>
              {where.line.toUpperCase()}
            </Text>
          </View>)}
          {away && (
            <Text style={{ fontFamily: PF.mono, fontSize: 8.5, letterSpacing: 0.8, color: P.ink60, marginTop: 7 }}>
              {`WHILE YOU WERE AWAY${away.carriedOut ? ` · ${away.carriedOut} CARRIED OUT` : ""}${away.broughtBack ? ` · ${away.broughtBack} BROUGHT BACK` : ""}`}
            </Text>
          )}
          {flies && (<Pressable onPress={() => setTracking((v) => !v)} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, alignSelf: "flex-start", borderWidth: 1, borderColor: tracking ? P.pen : P.ink12, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 1, color: tracking ? P.pen : P.ink60 }}>TRACK {wren.toUpperCase()}</Text>
            <Text style={{ fontFamily: PF.mono, fontSize: 10, color: tracking ? P.pen : P.ink60 }}>{tracking ? "↓" : "→"}</Text>
          </Pressable>)}
        </View>
        <View style={{ alignItems: "center", justifyContent: "flex-end" }}>
          {/* what she'd yell over her shoulder */}
          <View style={{ borderWidth: 1, borderColor: P.ink12, paddingHorizontal: 9, paddingVertical: 5, marginBottom: 8 }}>
            <Text style={{ fontFamily: PF.serifItalic, fontSize: 12, color: P.ink60 }}>{!flies ? "…" : dozy && where.state === "home" ? "zzz…" : speakAs(where.bubble, wren)}</Text>
          </View>
          {cofounderNo != null && (
            <View style={{ position: "absolute", bottom: -3, alignSelf: "center", zIndex: 2, width: 26, height: 5, borderRadius: 3, backgroundColor: COFOUNDER_GOLD }} />
          )}
          <HeroWren
            onPress={() => setLog((v) => !v)}
            stage={info.stage}
            state={dozy && where.state === "home" ? "dozing" : where.state}
            mood={dozy && where.state === "home" ? "sleepy" : WB[where.state].mood}
            accessory={wearsHere ? accessory : "none"}
          />
        </View>
      </View>

      {/* what she says when you actually tap her — counted, never sold */}
      {flies && log && <FlightLog state={dozy && where.state === "home" ? "dozing" : where.state} carried={carried} threads={threads} driving={drivingThread(threads, where.state)} wren={wren} />}

      {/* ── the tracking slip: her run, as the post would file it ──────────
          Not a navigation — a document. Every row is real (the thread that
          set her status, the hour your letter left, whose door she's at),
          and the last row is the door itself. */}
      {flies && tracking && <TrackingSlip threads={threads} state={where.state} wren={wren} onOpenThread={onOpenThread} />}

      {/* ── the journey: ONE ladder, with the days it really turned ── */}
      <View style={{ borderTopWidth: 1, borderTopColor: P.ink12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 }}>
        <Text style={{ fontFamily: PF.monoMed, fontSize: 9, letterSpacing: 1.6, color: P.ink40 }}>
          {wren.toUpperCase()}'S JOURNEY
        </Text>
        <View style={{ flexDirection: "row", marginTop: 12 }}>
          {JOURNEY.map((st, i) => {
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
                    {STAGE_LABEL[st]}
                    {state === "done" ? " ✓" : ""}
                  </Text>
                  <Text style={{ fontFamily: PF.mono, fontSize: 7.5, letterSpacing: 0.4, color: P.ink40, marginTop: 3, textAlign: "center" }}>
                    {d ?? milestones[st]}
                  </Text>
                </View>
                {i < JOURNEY.length - 1 && (
                  <View style={{ flex: 1, height: 1, backgroundColor: idx < cur ? P.ink : P.ink12, marginTop: state === "now" ? 11 : 10, marginHorizontal: 2 }} />
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* ── keepsakes: what she kept from journeys that really happened.
          ("souvenirs" read like a gift shop; a keepsake is kept for love) ── */}
      {shelf.length > 0 && (
        <View style={{ borderTopWidth: 1, borderTopColor: P.ink12, paddingTop: 12, paddingBottom: 14 }}>
          <Text style={{ fontFamily: PF.monoMed, fontSize: 9, letterSpacing: 1.6, color: P.ink40, paddingHorizontal: 16 }}>
            RECENT KEEPSAKES
          </Text>
          {/* RECENT only — the library's fifth law is rationing. Four at a
              time, newest first; the rest live in the archive. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 9, paddingTop: 10 }}>
            {shelf.slice(0, 4).map((k) => {
              const def = keepsake(k.id);
              if (!def) return null;
              return (
                <Pressable
                  key={k.id}
                  onPress={() => onOpenKeepsake(k.id)}
                  style={({ pressed }) => ({ width: 112, borderWidth: 1, borderColor: P.ink12, padding: 10, alignItems: "center", opacity: pressed ? 0.6 : 1 })}
                >
                  <Image source={def.icon} style={{ width: 46, height: 46 }} resizeMode="contain" />
                  <Text numberOfLines={2} style={{ fontFamily: PF.letter, fontSize: 12, fontWeight: "600", color: P.ink, marginTop: 7, textAlign: "center" }}>
                    {def.name}
                  </Text>
                  <Text numberOfLines={1} style={{ fontFamily: PF.mono, fontSize: 7.5, letterSpacing: 0.6, color: P.ink40, marginTop: 4 }}>
                    {k.evidence}
                  </Text>
                  {fresh.has(k.id) && (
                    <Text style={{ position: "absolute", top: 5, right: 6, fontFamily: PF.monoSemi, fontSize: 7, letterSpacing: 1, color: P.pen }}>NEW</Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

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
                  <WrenBird size={44} bare mood="happy" skin={sk.id} />
                </View>
                <Text style={{ fontFamily: PF.monoMed, fontSize: 9, color: on ? P.pen : P.ink60, marginTop: 3 }}>{sk.name.toUpperCase()}</Text>
                {!unlocked && (
                  <Text style={{ fontFamily: PF.mono, fontSize: 7.5, color: P.brassSeal, marginTop: 2 }}>
                    {sk.lock === "plus" ? "FIRST CLASS" : "FIRST KINDRED"}
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
                  <WrenBird size={44} bare mood="happy" accessory={a.id === "none" ? "none" : a.id} />
                </View>
                <Text style={{ fontFamily: PF.mono, fontSize: 8, color: on ? P.pen : P.ink60, marginTop: 2 }}>
                  {locked ? `🔒 ${a.label}` : a.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* ── the door to First Class: her archive, not your words ── */}
      <Pressable onPress={onPlus} style={{ borderTopWidth: 1, borderTopColor: P.ink, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, backgroundColor: P.penWash }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.2, color: P.ink }}>FIRST CLASS</Text>
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

/* which journey set her status — the same rules whereabouts() reads */
function drivingThread(threads: ThreadSummary[], state: string): ThreadSummary | null {
  const by = (f: (t: ThreadSummary) => boolean) =>
    threads.filter(f).sort((a, b) => b.lastAt - a.lastAt)[0] ?? null;
  if (state === "bringing") return by((t) => t.mine === 0 ? t.theirs > 0 : !t.lastSenderMe && t.theirs > 0);
  if (state === "delivery") return by((t) => t.lastSenderMe && t.mine > 0);
  return null;
}

function TrackingSlip({ threads, state, wren, onOpenThread }: { threads: ThreadSummary[]; state: string; wren: string; onOpenThread: (t: ThreadSummary) => void }) {
  const t = drivingThread(threads, state);
  const who = t ? (t.revealed && t.otherName ? t.otherName : `No. ${postNo(t.other)}`) : null;
  const rows: string[] = t
    ? state === "delivery"
      ? [
          `YOUR LETTER LEFT — ${dShort(new Date(t.lastAt).toISOString()).toUpperCase()}`,
          `AT ${who!.toUpperCase()}'S DOOR`,
          "WAITING FOR AN ANSWER",
        ]
      : [
          `${who!.toUpperCase()} WROTE BACK — ${dShort(new Date(t.lastAt).toISOString()).toUpperCase()}`,
          `${wren.toUpperCase()} CARRIED IT HOME`,
          "IT'S WAITING FOR YOU",
        ]
    : ["NOTHING IN TRANSIT", "WRITE, AND SHE FLIES"];

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 14, borderWidth: 1, borderColor: P.ink12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: P.ink12 }}>
        <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 1.6, color: P.ink40 }}>TRACKING SLIP</Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 9, color: P.ink40 }}>{wren.toUpperCase()}</Text>
      </View>
      {rows.map((r, i) => (
        <View key={r} style={{ flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, paddingVertical: 7 }}>
          <View style={{ width: 5, height: 5, backgroundColor: i === rows.length - 1 && t ? P.pen : P.ink40 }} />
          <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 0.8, color: i === rows.length - 1 && t ? P.ink : P.ink60 }}>{r}</Text>
        </View>
      ))}
      {t && (
        <Pressable onPress={() => onOpenThread(t)} style={{ borderTopWidth: 1, borderTopColor: P.ink12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingVertical: 11 }}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.4, color: P.pen }}>GO TO THE DOOR</Text>
          <Text style={{ fontFamily: PF.mono, fontSize: 10.5, color: P.pen }}>→</Text>
        </Pressable>
      )}
    </View>
  );
}

/* ── HER MOTION: STATUS × STAGE ─────────────────────────────────────────
   The status decides WHAT she is doing — resting, flying out, hurrying
   home with something, scanning the sky, asleep. The stage decides HOW
   WELL she does it: a hatchling's version of every one of those is
   smaller, quicker and wobblier than a grown bird's, because she is new
   at this. So Day 1 and Day 60 read differently even in the same state,
   which is the whole point of a bird that grows. */

const GRACE: Record<WrenStage, { amp: number; speed: number; wobble: number }> = {
  egg: { amp: 0.35, speed: 1.15, wobble: 0 },
  hatch: { amp: 0.55, speed: 1.5, wobble: 5 }, // small, fast, unsteady
  fledge: { amp: 0.8, speed: 1.15, wobble: 2.5 },
  wren: { amp: 1, speed: 1, wobble: 0 }, // she has done this a thousand times
};

function FlightLog({ state, carried, threads, driving, wren }: { state: Whereabouts | "dozing"; carried: { at: string }[]; threads: ThreadSummary[]; driving: ThreadSummary | null; wren: string }) {
  const { rows, line } = flightLog(state, carried, threads, driving);
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 14, borderWidth: 1, borderColor: P.ink12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: P.ink12 }}>
        <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 1.6, color: P.ink40 }}>FLIGHT LOG</Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 9, color: P.ink40 }}>{wren.toUpperCase()}</Text>
      </View>
      {rows.map((r) => (
        <View key={r} style={{ flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, paddingVertical: 7 }}>
          <View style={{ width: 5, height: 5, backgroundColor: P.ink40 }} />
          <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 0.8, color: P.ink60 }}>{r}</Text>
        </View>
      ))}
      <Text style={{ fontFamily: PF.serifItalic, fontSize: 12.5, lineHeight: 19, color: P.ink60, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 11 }}>
        {speakAs(line, wren)}
      </Text>
    </View>
  );
}

function HeroWren({
  stage,
  state,
  mood,
  accessory,
  onPress,
}: {
  stage: WrenStage;
  state: Whereabouts | "dozing";
  mood: WrenMood;
  accessory: WrenAccessory;
  onPress: () => void;
}) {
  const t = useRef(new Animated.Value(0)).current;
  const g = GRACE[stage];

  useEffect(() => {
    t.setValue(0);
    const ms = (base: number) => Math.round(base * g.speed);
    const ease = (to: number, base: number, e = Easing.inOut(Easing.sin)) =>
      Animated.timing(t, { toValue: to, duration: ms(base), easing: e, useNativeDriver: true });
    const seq =
      state === "dozing"
        ? Animated.sequence([ease(1, 2000), ease(0, 2000)]) // the long breath of sleep
        : state === "home"
          ? Animated.sequence([ease(1, 1400), ease(0, 1400)])
          : state === "delivery"
            ? // out on the wing: a flight bob that never quite settles
              Animated.sequence([ease(1, 520), ease(0, 620), Animated.delay(160)])
            : state === "bringing"
              ? // hurrying home with something for you
                Animated.sequence([
                  ease(1, 220, Easing.out(Easing.quad)),
                  ease(0, 260, Easing.bounce),
                  Animated.delay(320),
                ])
              : // exploring: a slow scan of the sky
                Animated.sequence([ease(1, 900), Animated.delay(260), ease(0, 900), Animated.delay(260)]);
    const loop = Animated.loop(seq);
    loop.start();
    return () => loop.stop();
  }, [state, stage, g.speed, t]);

  const to = (out: [number, number]) => t.interpolate({ inputRange: [0, 1], outputRange: out });
  const spin = (deg: number) => t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${deg}deg`] });
  const A = g.amp;
  const transform =
    state === "dozing"
      ? [{ translateY: to([0, 4 * A]) }, { scale: to([1, 0.985]) }]
      : state === "home"
        ? [{ scale: to([1, 1 + 0.05 * A]) }]
        : state === "delivery"
          ? [{ translateY: to([0, -9 * A]) }, { translateX: to([0, 4 * A]) }, { rotate: spin(-4 * A - g.wobble) }]
          : state === "bringing"
            ? [{ translateY: to([0, -12 * A]) }, { rotate: spin(6 * A + g.wobble) }]
            : [{ translateX: to([-3 * A, 3 * A]) }, { rotate: spin(5 * A + g.wobble) }];

  /* she reacts to being touched — a startle that plays over the idle */
  const poke = useRef(new Animated.Value(0)).current;
  const startle = () => {
    poke.setValue(0);
    Animated.sequence([
      Animated.timing(poke, { toValue: 1, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(poke, { toValue: 0, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Pressable onPress={startle} hitSlop={8}>
      <Animated.View
        style={{
          transform: [
            ...transform,
            { scale: poke.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
          ],
        }}
      >
        <WrenBird size={108} bare stage={stage} mood={mood} accessory={accessory} />
      </Animated.View>
    </Pressable>
  );
}
