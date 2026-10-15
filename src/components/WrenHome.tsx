import { speakAs, useWrenName } from "../lib/wren-name";
import { hungerRead } from "../lib/hunger";
import { dShort, postNo } from "../lib/format";
import { Image } from "react-native";
import { keepsake } from "../data/keepsakes";
import { CofounderMark } from "./CofounderMark";
import { mint, unseen, type Minted } from "../lib/keepsakes";
import { loadJournal } from "../lib/journal";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Alert, Animated, Easing, Keyboard, LayoutAnimation, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { PALETTE, daylight } from "./CourierCard";
import { t as tr, useLang } from "../lib/i18n";
import { PF } from "../theme/post";
import { useP, useTheme } from "../lib/theme";
import { THEMES } from "../theme/themes";
import { useHatchlingForm } from "../lib/hatchling-form";
import { WrenBird, type WrenAccessory, type WrenMood, type WrenPose, type WrenSkin, type WrenStage } from "./WrenBird";
import { CourierStage } from "./CourierStage";
import { StateGlyph } from "./StateGlyph";
import { FreeFlight, PillarsGlyph } from "./FreeFlightGame";
import { isDayOff } from "../lib/free-flight";
import type { Daylight } from "./CourierCard";
import { WardrobeRack } from "./WardrobeRack";
import { ACCESSORY_META, SKINS, skinName, STAGE_ORDER, skinUnlocked, stageIndex, stageInfo, useHatchSkin } from "../lib/wren-style";
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

/* THE COVER KEEPS ITS OWN COLOURS. Her sky is the hour's (CourierCard's
   daylight), not the theme's, and it already has a night of its own. So
   what is drawn on it — her bubble, the PLAY sticker, the DAY chip, the
   status band on its bottom edge — keeps fixed colours in every theme, and
   its dark type is the 10a ink, fixed (type on the lime sticker is always
   dark). Only the page under the band follows the theme. */
const COVER_INK = THEMES.classic.ink;

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
  onAllKeepsakes,
  cofounderNo = null,
  onPlus,
  statsReady = true,
  lastWrittenAt = null,
  scrollRef,
  onPlayChange,
  autoPlay = false,
}: {
  stats: GrowthStats;
  /** false while the counts are still on their way — nothing counted is shown as a number until then */
  statsReady?: boolean;
  threads: ThreadSummary[];
  /** when you last wrote anything (the aura's read) — her hunger clock */
  lastWrittenAt?: string | null;
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
  onAllKeepsakes: () => void;
  /** her ring — the one cofounder mark another person ever sees */
  cofounderNo?: number | null;
  onPlus: () => void;
  /** the page's scroll view — a drag that starts on her is hers, not the page's */
  scrollRef?: RefObject<any>;
  /** her day off (Free Flight, played on the cover): the hour being flown, or null when she's back on her perch */
  onPlayChange?: (sky: Daylight | null) => void;
  /** opened from her day off on Me: straight into the game */
  autoPlay?: boolean;
}) {
  useLang();
  const P = useP();
  const T = useTheme().t;
  const { skin, pick } = useWrenSkinControl();
  const info = stageInfo(stats, stageFloor);
  const wren = useWrenName();
  const [souvenirs, setSouvenirs] = useState<Souvenir[]>([]);
  const [away, setAway] = useState<AwayReport | null>(null);
  const [dozy, setDozy] = useState(false);
  const [carried, setCarried] = useState<{ at: string }[]>([]);
  const [carriedIn, setCarriedIn] = useState(false); // null vs zero — see whereabouts()
  const where = whereabouts(threads, carriedIn ? carried.length : null);
  const hungry = hungerRead({ threads, lastWrittenAt });   // someone waiting, or days with nothing to carry (lib/hunger)
  const hatch = useHatchSkin();   // the coat she hatched in on /aura: hers
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
      setCarriedIn(true);
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
    if (skinUnlocked(id, stats, premium, hatch)) return pick(id);
    const meta = SKINS.find((s) => s.id === id);
    if (meta?.lock === "plus") onLocked();
    else Alert.alert(tr("wren.plush.title"), tr("wren.plush.body"));
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
  const STAGE_LABEL: Record<WrenStage, string> = { egg: tr("wren.stage.egg"), hatch: tr("wren.stage.hatch"), fledge: tr("wren.stage.fledge"), wren: tr("wren.stage.grown") };
  const STAGE_NAME: Record<WrenStage, string> = { egg: tr("wren.name.egg"), hatch: tr("wren.name.hatch"), fledge: tr("wren.name.fledge"), wren: tr("wren.name.grown") };
  const milestones: Record<WrenStage, string> = {
    egg: tr("wren.milestone.egg"),
    hatch: tr("wren.milestone.hatch"),
    fledge: tr("wren.milestone.fledge"),
    wren: tr("wren.milestone.wren"),
  };

  /* what the stage MEANS, in numbers — not a mood line. Hatched: the day,
     and what fledges her. Fledged: since when, and what grows her up.
     Grown: how much she has carried and for how many kindreds. */
  const journeys = carried.length + stats.lettersSent;
  const stageFacts = (st: WrenStage): { icon: "letter" | "kindred" | "date" | "next"; text: string }[] => {
    const d = dateFor(st);
    if (st === "hatch") return [{ icon: "date", text: d ? tr("wren.pill.hatched", { date: d }) : tr("wren.pill.hatchedNoDate") }, { icon: "next", text: tr("wren.pill.toFledge") }];
    if (st === "fledge") return [{ icon: "date", text: d ? tr("wren.pill.flying", { date: d }) : tr("wren.pill.flyingNoDate") }, { icon: "next", text: tr("wren.pill.toGrow") }];
    if (st === "wren") return [{ icon: "letter", text: tr("wren.pill.carried", { n: journeys }) }, { icon: "kindred", text: stats.kindreds === 1 ? tr("wren.pill.kindredOne") : tr("wren.pill.kindreds", { n: stats.kindreds }) }];
    return [];
  };
  const flies = info.stage !== "egg";

  const items = ACCESSORY_META.filter((a) => a.id !== "none");
  const looksOwned = SKINS.filter((s) => skinUnlocked(s.id, stats, premium, hatch)).length;
  const dressName = accessory === "none" ? tr("wren.bare") : (() => { const a = ACCESSORY_META.find((x) => x.id === accessory); return a ? tr(`ws.acc.${a.id}`) : ""; })();
  const drivingT = drivingThread(threads, where.state);
  const state = dozy && where.state === "home" ? "dozing" : where.state;

  /* the hour paints the cover — the same four skies the Me card wears */
  const light = daylight();
  const sky = PALETTE[light];
  const band = light === "night" ? "#2B2660" : sky.chip;
  const onSky = sky.ink;
  const { width: coverW, height: winH } = useWindowDimensions();
  /* the course: taller than the perch, but always clear of the keyboard
     (≈290 pt of keyboard and header on the smallest phones) */
  const playH = Math.max(280, Math.min(360, winH - 290));
  /* HER DAY OFF (lib/free-flight): two windows a day she does laps — the
     pillars stand in her sky and she says so, and the door is right there */
  const dayOff = isDayOff({ state: where.state, hunger: hungry, stage: info.stage });
  /* HER DAY OFF — the cover becomes the course (components/FreeFlightGame),
     a little taller so the keyboard leaves it room, on the hour you pick */
  const [play, setPlay] = useState(false);
  /* starving, she's too tired to play: no PLAY sticker, no game (owner,
     2026-09-24) — the day off already never comes while she wilts */
  const canPlay = flies && !hungry?.wilt;
  const openPlay = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPlay(true);
    setLog(false);
    setTracking(false);
    onPlayChange?.(light);
  };
  const autoOpened = useRef(false);
  useEffect(() => {
    if (!autoPlay || autoOpened.current || !canPlay) return;
    autoOpened.current = true;
    openPlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, canPlay]);
  const closePlay = () => {
    Keyboard.dismiss();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPlay(false);
    onPlayChange?.(null);
  };
  /* the far layer is 16% larger than the cover and offset by 8% each way,
     so it can drift without showing an edge; everything in it is placed
     where it sat on the cover */
  const fx = (f: number) => f * coverW + coverW * 0.08;
  const fy = (v: number) => v + COVER_H * 0.08;

  return (
    <View>
      {/* ── the cover (the owner's D8): her sky, edge to edge, and her, big.
          The status band sits on the cover's bottom edge. ── */}
      <View style={{ height: play ? playH : COVER_H, backgroundColor: sky.sky[1], overflow: "hidden" }}>
        <Svg width="100%" height={COVER_H} style={{ position: "absolute", left: 0, top: 0 }}>
          <Defs>
            <LinearGradient id="roomSky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={sky.sky[0]} />
              <Stop offset="1" stopColor={sky.sky[1]} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width="100%" height={COVER_H} fill="url(#roomSky)" />
        </Svg>
        {play && <FreeFlight width={coverW} height={playH} top={44} sky={light} stage={info.stage} accessory={wearsHere ? accessory : "none"} onClose={closePlay} />}
        {/* the perch: a stage with depth — drag her, tap her (CourierStage, the web's) */}
        {!play && <CourierStage
          width={coverW}
          height={COVER_H}
          size={186}
          bottom={10}
          stage={info.stage}
          mood={hungry ? hungry.mood : dozy && where.state === "home" ? "sleepy" : WB[where.state].mood}
          label={wren}
          blocks={scrollRef}
          far={
            <Svg width={coverW * 1.16} height={COVER_H * 1.16}>
              {/* on her day off, two pairs of pillars stand in her sky */}
              {dayOff &&
                /* clear of the title on the left and the DAY chip: one pair behind
                   her wing, one half off the right edge */
                ([[0.62, 0.44], [0.99, 0.6]] as const).map(([f, g], i) => {
                  const gc = COVER_H * g;
                  const ink = light === "night" ? "#DAD6F2" : sky.chip;
                  return (
                    <G key={`p${i}`} opacity={0.9}>
                      <Rect x={fx(f) - 15} y={-4} width={30} height={fy(gc - 52)} rx={3} fill={sky.scrim} stroke={ink} strokeWidth={2} />
                      <Rect x={fx(f) - 19} y={fy(gc - 52) - 10} width={38} height={10} rx={3} fill={sky.scrim} stroke={ink} strokeWidth={2} />
                      <Rect x={fx(f) - 15} y={fy(gc + 52)} width={30} height={COVER_H * 1.2} rx={3} fill={sky.scrim} stroke={ink} strokeWidth={2} />
                      <Rect x={fx(f) - 19} y={fy(gc + 52)} width={38} height={10} rx={3} fill={sky.scrim} stroke={ink} strokeWidth={2} />
                    </G>
                  );
                })}
              {/* two soft discs — the sheet's air behind her */}
              <Circle cx={fx(0.78)} cy={fy(COVER_H * 0.28)} r={120} fill="#FFFFFF" opacity={light === "night" ? 0.06 : 0.28} />
              <Circle cx={fx(0.18)} cy={fy(COVER_H * 0.82)} r={150} fill="#FFFFFF" opacity={light === "night" ? 0.05 : 0.22} />
              {sky.stars && [[0.12, 40], [0.3, 24], [0.47, 58], [0.62, 30], [0.86, 48], [0.93, 90]].map(([f, y], i) => <Circle key={i} cx={fx(f as number)} cy={fy(y as number)} r={i % 2 ? 1 : 1.6} fill="#FFFFFF" opacity={0.8} />)}
              {sky.sun && <Circle cx={fx(0.86)} cy={fy(54)} r={16} fill={sky.sun} />}
              {sky.moon && (
                <>
                  <Circle cx={fx(0.86)} cy={fy(54)} r={14} fill="#FFF3D6" />
                  <Circle cx={fx(0.885)} cy={fy(48)} r={12} fill={sky.sky[0]} />
                </>
              )}
            </Svg>
          }
          bird={(m, pose, held) => <HeroWren size={186} stage={info.stage} state={state} mood={m} pose={pose} paused={held} wilt={!!hungry?.wilt} accessory={wearsHere ? accessory : "none"} />}
        />}
        {statsReady && !play && (
          <View style={{ position: "absolute", right: 14, top: 12, backgroundColor: band, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.6, color: "#FFFFFF" }}>{tr("me.dayN", { n: stats.day })}</Text>
          </View>
        )}
        {cofounderNo != null && !play && (
          <View style={{ position: "absolute", left: 14, top: 14 }}>
            <CofounderMark no={cofounderNo} />
          </View>
        )}
        {/* what she'd yell over her shoulder — and, tapped, her flight log
            (she used to open it herself; a tap on her is a face now) */}
        {!play && (
          <Pressable
            onPress={() => setLog((v) => !v)}
            disabled={!flies}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityHint={tr("wren.log")}
            accessibilityState={{ expanded: log, disabled: !flies }}
            style={({ pressed }) => ({ position: "absolute", left: 16, bottom: 12, maxWidth: coverW - 32 - 152, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFFFFF", paddingHorizontal: 11, paddingVertical: 6, borderRadius: 4, opacity: pressed ? 0.8 : 1 })}
          >
            <Text numberOfLines={2} style={{ flexShrink: 1, fontFamily: PF.serifItalic, fontStyle: "italic", fontSize: 13, color: COVER_INK }}>{dayOff ? tr("ff.dayoff.bubble") : hungry ? hungry.line : !flies ? "…" : dozy && where.state === "home" ? "zzz…" : speakAs(where.bubble, wren)}</Text>
            {flies && <Text style={{ fontFamily: PF.letter, fontSize: 11, color: "rgba(30,27,53,0.4)" }}>{log ? "▴" : "▾"}</Text>}
          </Pressable>
        )}

        {/* bottom right: how to touch her, and the door to her day off */}
        {!play && (
          <View style={{ position: "absolute", right: 16, bottom: 12, alignItems: "flex-end", gap: 8 }}>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={{ alignItems: "flex-end" }}>
              {tr("cr.stageHint").split(" · ").map((h) => (
                <Text key={h} style={{ fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 1.4, lineHeight: 13, color: light === "night" ? "rgba(255,255,255,0.5)" : "rgba(30,27,53,0.5)" }}>{h}</Text>
              ))}
            </View>
            {canPlay && (
              /* the game's door: a sticker in the signal colour, the pillars and
                 her on it, PLAY — it has to read as a game at a glance */
              <Pressable onPress={openPlay} accessibilityRole="button" accessibilityLabel={tr("ff.title")} accessibilityHint={tr("ff.hint")} hitSlop={6} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingLeft: 6, paddingRight: 12, borderRadius: 17, backgroundColor: "#C3E84F", borderWidth: 2, borderColor: COVER_INK, shadowColor: COVER_INK, shadowOffset: { width: pressed ? 1 : 3, height: pressed ? 1 : 3 }, shadowOpacity: 1, shadowRadius: 0, transform: [{ translateY: pressed ? 2 : 0 }] })}>
                <PillarsGlyph size={24} />
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1.6, color: COVER_INK }}>{tr("ff.play").toUpperCase()}</Text>
                <Text style={{ fontSize: 9, color: COVER_INK }}>▶</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* ── the status band: where she is, in one line, and the door to the slip ── */}
      {flies && (
        <View pointerEvents={play ? "none" : "auto"} style={{ backgroundColor: band, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 12, gap: 12 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: where.state === "bringing" ? "#7CC58F" : "rgba(255,255,255,0.55)" }} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: 15, color: "#FFFFFF" }} numberOfLines={1}>{where.line}</Text>
            {away ? (
              <Text style={{ fontFamily: PF.letter, fontSize: 12, color: "rgba(255,255,255,0.72)", marginTop: 2 }} numberOfLines={1}>
                {[tr("wren.away"), away.carriedOut ? tr("wren.away.out", { n: away.carriedOut }) : null, away.broughtBack ? tr("wren.away.back", { n: away.broughtBack }) : null].filter(Boolean).join(" · ")}
              </Text>
            ) : drivingT ? (
              <Text style={{ fontFamily: PF.letter, fontSize: 12, color: "rgba(255,255,255,0.72)", marginTop: 2 }} numberOfLines={1}>
                {drivingT.revealed && drivingT.otherName ? drivingT.otherName : `No. ${postNo(drivingT.other)}`} · {dShort(drivingT.lastAt)}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={() => setTracking((v) => !v)} hitSlop={8} style={({ pressed }) => ({ backgroundColor: "#FFFFFF", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, opacity: pressed ? 0.8 : 1 })}>
            <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 13, color: band }}>{tracking ? tr("wren.trackClose") : tr("wren.trackShort")}</Text>
          </Pressable>
        </View>
      )}

      {/* while she's flying laps the page under the course holds still */}
      <View pointerEvents={play ? "none" : "auto"} style={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: 40 }}>
        {/* what she says when you actually tap her — counted, never sold */}
        {flies && log && <FlightLog state={state} carried={carried} threads={threads} driving={drivingT} wren={wren} />}
        {/* the tracking slip: her run, as the post would file it */}
        {flies && tracking && <TrackingSlip threads={threads} state={where.state} wren={wren} onOpenThread={onOpenThread} />}

        {/* ── name, what she is, and the stage in two counted pills ── */}
        <Text style={{ fontFamily: PF.letter, fontSize: 32, fontWeight: "800", letterSpacing: -1, color: P.ink }}>{wren}</Text>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.6, color: P.ink40, marginTop: 4 }}>
          {tr("wren.yourCourier")} · {STAGE_LABEL[info.stage]}
        </Text>
        {statsReady && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {stageFacts(info.stage).map((f, i) => (
              <FactPill key={i} icon={f.icon} text={f.text} tone={band} />
            ))}
          </View>
        )}


        {/* ── the journey: ONE line, three stops, the days they really turned ── */}
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.6, color: P.ink40, marginTop: 24 }}>{tr("wren.journeyShort")}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
          {JOURNEY.map((st, i) => {
            const cur = stageIndex(info.stage);
            const idx = stageIndex(st);
            const st8 = idx < cur ? "done" : idx === cur ? "now" : "later";
            return (
              <View key={st} style={{ flexDirection: "row", alignItems: "center", flex: i < JOURNEY.length - 1 ? 1 : 0 }}>
                <View style={{ width: st8 === "now" ? 16 : 12, height: st8 === "now" ? 16 : 12, borderRadius: 999, backgroundColor: st8 === "later" ? "transparent" : st8 === "now" ? P.pen : P.ink, borderWidth: st8 === "later" ? 1.5 : st8 === "now" ? 3 : 0, borderColor: st8 === "now" ? T.lav : P.ink40 }} />
                {i < JOURNEY.length - 1 && <View style={{ flex: 1, height: 2, backgroundColor: idx < cur ? P.ink : T.lav, marginHorizontal: 4 }} />}
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", marginTop: 8 }}>
          {JOURNEY.map((st, i) => {
            const cur = stageIndex(info.stage);
            const idx = stageIndex(st);
            const st8 = idx < cur ? "done" : idx === cur ? "now" : "later";
            const d = st8 !== "later" ? dateFor(st) : null;
            return (
              <View key={st} style={{ flex: 1, alignItems: i === 0 ? "flex-start" : i === JOURNEY.length - 1 ? "flex-end" : "center" }}>
                <Text style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: 13, color: st8 === "now" ? P.pen : st8 === "done" ? P.ink : P.ink40 }}>{STAGE_NAME[st]}</Text>
                {/* a date when the day is known; for a stop still ahead, what gets her there; a passed stop with no date says nothing */}
                {(d || st8 === "later") && (
                  <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 0.8, color: P.ink40, marginTop: 3, textAlign: i === 0 ? "left" : i === JOURNEY.length - 1 ? "right" : "center" }}>
                    {d ? `${d}${st8 === "now" ? ` · ${tr("wren.now")}` : ""}` : milestones[st]}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* ── keepsakes: what she kept from journeys that really happened ── */}
        {shelf.length > 0 && (
          <>
            <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 24 }}>
              <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.6, color: P.ink40 }}>{tr("wren.keepsakes")}</Text>
              <Pressable onPress={onAllKeepsakes} hitSlop={8}>
                <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 12.5, color: P.pen }}>{tr("wren.allKept", { n: shelf.length })}</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              {shelf.slice(0, 3).map((k) => {
                const def = keepsake(k.id);
                if (!def) return null;
                return (
                  <Pressable key={k.id} onPress={() => onOpenKeepsake(k.id)} style={({ pressed }) => ({ flex: 1, backgroundColor: T.sf, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 8, alignItems: "center", opacity: pressed ? 0.7 : 1 })}>
                    <Image source={def.icon} style={{ width: 40, height: 40 }} resizeMode="contain" />
                    <Text numberOfLines={2} style={{ fontFamily: PF.letter, fontSize: 12, fontWeight: "600", color: P.ink, marginTop: 8, textAlign: "center" }}>{tr(`ks.name.${def.id}`)}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: PF.mono, fontSize: 8, letterSpacing: 0.6, color: P.ink40, marginTop: 4 }}>{k.evidence}</Text>
                    {fresh.has(k.id) && <View style={{ position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: P.pen }} />}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* ── looks & dress: two cells, the pickers unfold beneath ── */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 24 }}>
          <Cell label={tr("wren.looks")} value={skinName(skin)} count={statsReady ? `${looksOwned}/${SKINS.length}` : ""} swatch="#A9D0F2" on={open === "looks"} onPress={() => setOpen(open === "looks" ? null : "looks")} />
          <Cell label={tr("wren.dress")} value={dressName} count={`${items.filter((a) => a.free || premium).length}/${items.length}`} swatch="#F2887E" on={open === "dress"} onPress={() => setOpen(open === "dress" ? null : "dress")} />
        </View>
        {open && (
          <View style={{ marginTop: 10 }}>
            <WardrobeRack
              tone="post"
              show={open}
              headers={false}
              skin={skin}
              accessory={accessory}
              stats={stats}
              premium={premium}
              onLook={(id) => tapSkin(id)}
              onDress={(id, unlocked) => (unlocked ? onEquip(id) : onLocked())}
            />
          </View>
        )}

        {/* ── the door to First Class, named for what it opens on this page:
             her full wardrobe. It said FULL ARCHIVE, which no build ever had
             (audit, 2026-10-12; Apple 2.3.2 reads a paywall against the app). ── */}
        <Pressable onPress={onPlus} style={({ pressed }) => ({ marginTop: 24, backgroundColor: "#FFF8DE", borderRadius: 999, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 13, gap: 10, opacity: pressed ? 0.85 : 1 })}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#D8A63F" }} />
          <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.4, color: "#8A6A1C" }}>{tr("wren.fcArchive")}</Text>
          <Text style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: 13, color: "#8A6A1C" }}>{premium ? tr("wren.activeArrow") : tr("wren.unlock")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const COVER_H = 300;


/* a counted fact as a sticker label: the card face (white in Classic), the
   band's ink as the edge and the mark, the number in bold */
function FactPill({ icon, text, tone }: { icon: "letter" | "kindred" | "date" | "next"; text: string; tone: string }) {
  const P = useP();
  const T = useTheme().t;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: T.sf, borderRadius: 999, borderWidth: 1.5, borderColor: tone, paddingLeft: 10, paddingRight: 13, paddingVertical: 6 }}>
      {/* a kindred wears the kindred face (round 3a), as everywhere else */}
      {icon === "kindred" ? <StateGlyph kind="kindreds" size={16} /> : (
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={tone} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {icon === "letter" && (
          <>
            <Rect x={3} y={5.5} width={18} height={13} rx={2} />
            <Path d="M3.5 7l8.5 6 8.5-6" />
          </>
        )}
        {icon === "date" && (
          <>
            <Rect x={3.5} y={5} width={17} height={15} rx={2} />
            <Path d="M3.5 10h17M8 3v4M16 3v4" />
          </>
        )}
        {icon === "next" && <Path d="M5 12h13M13 7l5 5-5 5" />}
      </Svg>
      )}
      <Text style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: 12.5, color: P.ink }}>{text}</Text>
    </View>
  );
}

function Cell({ label, value, count, swatch, on, onPress }: { label: string; value: string; count: string; swatch: string; on: boolean; onPress: () => void }) {
  const P = useP();
  const T = useTheme().t;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, backgroundColor: T.sf, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 2, borderColor: on ? P.pen : "transparent", opacity: pressed ? 0.85 : 1 })}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: swatch }} />
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 8.5, letterSpacing: 1.4, color: P.ink40 }}>{label}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 6 }}>
        <Text style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: 15, color: P.ink }}>{value}</Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 10, color: P.ink40 }}>{count}</Text>
      </View>
    </Pressable>
  );
}

const short = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();

/* which journey set her status — the same rules whereabouts() reads */
function drivingThread(threads: ThreadSummary[], state: string): ThreadSummary | null {
  const by = (f: (t: ThreadSummary) => boolean) =>
    threads.filter(f).sort((a, b) => b.lastAt - a.lastAt)[0] ?? null;
  if (state === "bringing") return by((t) => t.mine === 0 ? t.theirs > 0 : !t.lastSenderMe && t.theirs > 0);
  if (state === "delivery") return by((t) => t.lastSenderMe && t.mine > 0);
  return null;
}

function TrackingSlip({ threads, state, wren, onOpenThread }: { threads: ThreadSummary[]; state: string; wren: string; onOpenThread: (t: ThreadSummary) => void }) {
  const P = useP();
  const T = useTheme().t;
  const t = drivingThread(threads, state);
  const who = t ? (t.revealed && t.otherName ? t.otherName : `No. ${postNo(t.other)}`) : null;
  const rows: string[] = t
    ? state === "delivery"
      ? [
          tr("wren.slip.left", { day: dShort(new Date(t.lastAt).toISOString()).toUpperCase() }),
          tr("wren.slip.door", { who: who!.toUpperCase() }),
          tr("wren.slip.waiting"),
        ]
      : [
          tr("wren.slip.wrote", { who: who!.toUpperCase(), day: dShort(new Date(t.lastAt).toISOString()).toUpperCase() }),
          tr("wren.slip.carried", { wren: wren.toUpperCase() }),
          tr("wren.slip.forYou"),
        ]
    : [tr("wren.slip.nothing"), tr("wren.slip.write")];

  return (
    <View style={{ marginBottom: 16, borderWidth: 1, borderColor: P.ink12, backgroundColor: T.sf, borderRadius: 12, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: P.ink12 }}>
        <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 1.6, color: P.ink40 }}>{tr("wren.slip")}</Text>
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
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.4, color: P.pen }}>{tr("wren.slip.go")}</Text>
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
  const P = useP();
  const T = useTheme().t;
  const { rows, line } = flightLog(state, carried, threads, driving);
  return (
    <View style={{ marginBottom: 16, borderWidth: 1, borderColor: P.ink12, backgroundColor: T.sf, borderRadius: 12, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: P.ink12 }}>
        <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 1.6, color: P.ink40 }}>{tr("wren.log")}</Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 9, color: P.ink40 }}>{wren.toUpperCase()}</Text>
      </View>
      {rows.map((r) => (
        <View key={r} style={{ flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, paddingVertical: 7 }}>
          <View style={{ width: 5, height: 5, backgroundColor: P.ink40 }} />
          <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 0.8, color: P.ink60 }}>{r}</Text>
        </View>
      ))}
      <Text style={{ fontFamily: PF.serifItalic, fontStyle: "italic", fontSize: 12.5, lineHeight: 19, color: P.ink60, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 11 }}>
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
  pose = "perch",
  paused = false,
  wilt = false,
  size = 108,
}: {
  size?: number;
  stage: WrenStage;
  state: Whereabouts | "dozing";
  mood: WrenMood;
  accessory: WrenAccessory;
  pose?: WrenPose;
  /** held in a hand: the idle stops, the hand is the motion */
  paused?: boolean;
  /** starving: greyed and drooping, and too tired for her idle (the web's .pet.wilt) */
  wilt?: boolean;
}) {
  const t = useRef(new Animated.Value(0)).current;
  const g = GRACE[stage];

  useEffect(() => {
    if (paused || wilt) {
      Animated.timing(t, { toValue: 0, duration: 160, useNativeDriver: true }).start();
      return;
    }
    t.setValue(0);
    const ms = (base: number) => Math.round(base * g.speed);
    const ease = (to: number, base: number, e = Easing.inOut(Easing.sin)) =>
      Animated.timing(t, { toValue: to, duration: ms(base), easing: e, useNativeDriver: true });
    const seq =
      state === "dozing"
        ? Animated.sequence([ease(1, 2000), ease(0, 2000)]) // the long breath of sleep
        : state === "home" || state === "unsent"
          ? // nothing in the bag is not a journey — she waits the way she rests
            Animated.sequence([ease(1, 1400), ease(0, 1400)])
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
  }, [state, stage, g.speed, t, paused, wilt]);

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

  /* her proportions came out of the writing that hatched her — the same
     chick here as at the hatch, not a stock one */
  const form = useHatchlingForm();

  return (
    <Animated.View style={{ transform }}>
      <WrenBird size={size} stage={stage} mood={mood} pose={pose} accessory={accessory} form={form} wilt={wilt} />
    </Animated.View>
  );
}
