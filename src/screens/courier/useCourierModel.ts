import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { t, useLang } from "../../lib/i18n";
import { useAuth } from "../../lib/auth";
import { useEntitlement } from "../../lib/entitlement";
import { speakAs, useWrenName } from "../../lib/wren-name";
import { bump } from "../../lib/usage-counters";
import { EMPTY_STATS, collectGrowthStats } from "../../lib/stats";
import type { GrowthStats } from "../../data/growth";
import { fetchThreads, readThreadsCache, type ThreadSummary } from "../../lib/db";
import { useWrenStage } from "../../lib/wren-stage";
import { useWrenSkinControl } from "../../lib/wren-skin";
import { myAura, type Aura } from "../../lib/aura";
import { SKINS, getStageFloor, offeredAccessories, skinUnlocked, stageIndex, stageInfo, useHatchSkin, wrenStage } from "../../lib/wren-style";
import { useSeason } from "../../lib/season";
import { useFares } from "../../lib/fares";
import { hungerRead } from "../../lib/hunger";
import { useWhoBook } from "../../lib/who";
import { dShort, noteDay, postNo } from "../../lib/format";
import { keepsake } from "../../data/keepsakes";
import { mint, unseen, type Minted } from "../../lib/keepsakes";
import { loadJournal } from "../../lib/journal";
import { isDayOff } from "../../lib/free-flight";
import { WHEREABOUTS_META, fetchCarried, flightLog, getStageDates, isDozing, mintSouvenirs, sinceLastVisit, whereabouts, type AwayReport } from "../../lib/whereabouts";
import { PALETTE, daylight } from "../../components/CourierCard";
import type { WrenAccessory, WrenSkin, WrenStage } from "../../components/WrenBird";
import { trialLabel } from "../paywall/paywall-model";
import { buildFirstClass4a } from "../me/me-model";
import { meFormat } from "../me/me-format";
import { buildCourierView, drivingThread, type CourierFormat, type CourierVM } from "./courier-model";
import "../../data/strings-me4a";
import "../../data/strings-a11y-compose";
import "../../data/strings-step5-me";
import "../../data/strings-step5-kitrn";

/* WREN'S JOURNEY — THE READS (for the SwiftUI page, CourierNative).
   ────────────────────────────────────────────────────────────────────────
   The same reads as the React Native page, in the same order and with the
   same side effects, so either renderer leaves the phone in the same state:
     · on focus (app/courier): a visit for the Homebody sticker, the growth
       counts and the never-falling stage floor, the threads (the cached list
       at once, then the fresh one) and her aura (her hunger clock);
     · on every new thread list (WrenHome): her runs, the souvenirs and the
       keepsakes minted from them, what's new on the shelf, what happened
       since the last visit, whether she dozes, and the days the stages turned.
   courier-model works the words out; this hook only gathers and acts.

   Taps act as the React Native page's do: a coat she has is put on, a First
   Class one opens the fare (src wardrobe_lock), Mist before a kindred says
   "Not yet"; a piece she has is put on, a locked one opens the fare; First
   Class opens the fare (src journey_archive). */

export type CourierModel = {
  view: CourierVM;
  /** the shelf's ids with a drawing, for the icons */
  shelfIcons: Record<string, number>;
  /** the coats and pieces on the rack, in its order */
  skins: readonly WrenSkin[];
  pieces: readonly WrenAccessory[];
  /** the hour's sky is night (the status bar's style on the cover) */
  night: boolean;
  actions: {
    back: () => void;
    slipGo: (threadId: string) => void;
    keepsake: (id: string) => void;
    allKeepsakes: () => void;
    look: (id: string) => void;
    dress: (id: string) => void;
    firstClass: () => void;
  };
};

/** the coats on the rack, in its order */
const SKIN_IDS: readonly WrenSkin[] = SKINS.map((s) => s.id);

export function useCourierModel(): CourierModel {
  const lang = useLang();
  const router = useRouter();
  const wren = useWrenName();
  const { user, profile } = useAuth();
  const { premium, cofounderNo } = useEntitlement();
  const fares = useFares();
  const { skin, pick, accessory, dress } = useWrenSkinControl();
  const hatch = useHatchSkin();
  const season = useSeason();
  const known = useWrenStage().stage;

  /* ── app/courier's reads ── */
  const [stats, setStats] = useState<GrowthStats>(EMPTY_STATS);
  const [statsReady, setStatsReady] = useState(false);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [aura, setAura] = useState<Aura | null>(null);
  const [stageFloor, setStageFloor] = useState<WrenStage>(known ?? "hatch");

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void bump("courierVisits");
      Promise.all([collectGrowthStats(user?.created_at), getStageFloor()])
        .then(([s, floor]) => {
          if (!alive) return;
          setStats(s);
          setStatsReady(true);
          const live = wrenStage(s);
          const st = stageIndex(live) >= stageIndex(floor) ? live : floor;
          setStageFloor((cur) => (stageIndex(st) >= stageIndex(cur) ? st : cur));
        })
        .catch((e) => console.warn("[courier] stats:", e));
      readThreadsCache()
        .then((c) => alive && c && setThreads(c))
        .catch((e) => console.warn("[courier] cached threads:", e));
      fetchThreads()
        .then((th) => alive && setThreads(th || []))
        .catch((e) => console.warn("[courier] threads:", e));
      myAura((profile?.firstLine as string) || null)
        .then((a) => alive && setAura(a))
        .catch((e) => console.warn("[courier] aura:", e));
      return () => {
        alive = false;
      };
    }, [user?.created_at, profile?.firstLine]),
  );

  /* ── WrenHome's reads ── */
  const topWord = aura?.commonWords[0] ?? null;
  const [carried, setCarried] = useState<{ at: string }[]>([]);
  const [carriedIn, setCarriedIn] = useState(false); // null vs zero — see whereabouts()
  const [away, setAway] = useState<AwayReport | null>(null);
  const [dozy, setDozy] = useState(false);
  const [shelf, setShelf] = useState<Minted[]>([]);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [dates, setDates] = useState<Partial<Record<WrenStage, string>>>({});

  useEffect(() => {
    let alive = true;
    fetchCarried()
      .then(async (c) => {
        const [, diff] = await Promise.all([mintSouvenirs(c, threads, topWord), sinceLastVisit(c, threads)]);
        if (!alive) return;
        setCarried(c);
        setCarriedIn(true);
        const journal = await loadJournal().catch(() => []);
        const minted = await mint({ carried: c, threads, journal, commonWords: topWord ? [topWord] : [] });
        if (!alive) return;
        setShelf(minted);
        setFresh(await unseen(minted));
        setAway(diff);
        setDozy(isDozing(c));
      })
      .catch((e) => console.warn("[courier] carried:", e));
    getStageDates()
      .then((d) => alive && setDates(d))
      .catch((e) => console.warn("[courier] stage dates:", e));
    return () => {
      alive = false;
    };
  }, [threads, topWord]);

  const book = useWhoBook({ threads });
  const info = stageInfo(stats, stageFloor);
  const where = whereabouts(threads, carriedIn ? carried.length : null);
  const hungry = hungerRead({ threads, lastWrittenAt: aura?.lastWrittenAt ?? null, book });
  const light = daylight();
  const sky = PALETTE[light];
  const offered = useMemo(() => offeredAccessories(season.looks), [season.looks]);
  const pieces = useMemo(() => offered.map((a) => a.id), [offered]);

  const firstClass = useMemo(
    () => buildFirstClass4a({ premium, cofounderNo, wren, trial: trialLabel(fares.trial, t) }, meFormat()),
    // lang: every word is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [premium, cofounderNo, wren, fares.trial, lang],
  );

  const view = useMemo(() => {
    const state = dozy && where.state === "home" ? "dozing" : where.state;
    const nameOf = (th: ThreadSummary) => (book.identity ? book.threadName(th) : th.revealed && th.otherName ? th.otherName : `No. ${postNo(th.other)}`);
    const fmt: CourierFormat = {
      t,
      upper: (s) => s.toUpperCase(),
      dShort: (ms) => dShort(new Date(ms).toISOString()),
      day: (iso) => noteDay(iso),
      speak: (line) => speakAs(line, wren),
    };
    return buildCourierView(
      {
        wren,
        stage: info.stage,
        // nothing counted is shown as a number before the counts are in
        next: statsReady ? (info.next?.progress ?? null) : null,
        statsReady,
        day: stats.day,
        kindreds: stats.kindreds,
        lettersSent: stats.lettersSent,
        carried,
        dates,
        joinedAt: user?.created_at ?? null,
        where,
        whereMood: WHEREABOUTS_META[where.state].mood,
        dozy,
        hungry: hungry ? { mood: hungry.mood, line: hungry.line, wilt: !!hungry.wilt } : null,
        dayOff: isDayOff({ state: where.state, hunger: hungry, stage: info.stage }),
        away,
        threads,
        nameOf,
        log: flightLog(state, carried, threads, drivingThread(threads, where.state)),
        sky: { night: light === "night", sky: sky.sky, ink: sky.ink, chip: sky.chip, scrim: sky.scrim, sun: sky.sun, moon: sky.moon, stars: sky.stars },
        cofounderNo: cofounderNo ?? null,
        shelf: shelf.filter((k) => keepsake(k.id)).map((k) => ({ id: k.id, evidence: k.evidence, fresh: fresh.has(k.id) })),
        shelfTotal: shelf.length,
        skin,
        accessory,
        premium,
        skins: SKINS.map((s) => ({ id: s.id, lock: s.lock, unlocked: skinUnlocked(s.id, stats, premium, hatch) })),
        pieces: offered.map((a) => ({ id: a.id, free: a.free })),
        firstClass,
      },
      fmt,
    );
    // lang: every word is t()'s; `where`, `hungry` and `info` are derived from the rest
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, wren, info.stage, statsReady, stats, carried, carriedIn, dates, user?.created_at, threads, aura?.lastWrittenAt, book, dozy, away, light, cofounderNo, shelf, fresh, skin, accessory, premium, hatch, offered, firstClass]);

  const shelfIcons = useMemo(() => {
    const o: Record<string, number> = {};
    for (const k of view.keepsakes) {
      const def = keepsake(k.id);
      if (def) o[k.id] = def.icon;
    }
    return o;
  }, [view.keepsakes]);

  const back = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me")), [router]);
  const slipGo = useCallback(
    (id: string) => {
      const th = threads.find((x) => x.id === id);
      if (th) router.push((th.revealed ? `/room/${th.id}` : `/chat/${th.id}`) as Href);
    },
    [threads, router],
  );
  const openKeepsake = useCallback((id: string) => router.push(`/keepsake/${id}` as Href), [router]);
  const allKeepsakes = useCallback(() => router.push("/keepsakes"), [router]);
  const look = useCallback(
    (id: string) => {
      const meta = SKINS.find((s) => s.id === id);
      if (!meta) return;
      if (skinUnlocked(meta.id, stats, premium, hatch)) return pick(meta.id);
      if (meta.lock === "plus") router.push("/paywall?src=wardrobe_lock");
      else Alert.alert(t("wren.plush.title"), t("wren.plush.body"));
    },
    [stats, premium, hatch, pick, router],
  );
  const dressUp = useCallback(
    (id: string) => {
      const a = offered.find((x) => x.id === id);
      if (!a) return;
      if (a.free || premium) dress(a.id);
      else router.push("/paywall?src=wardrobe_lock");
    },
    [offered, premium, dress, router],
  );
  const openFirstClass = useCallback(() => router.push("/paywall?src=journey_archive"), [router]);

  return {
    view,
    shelfIcons,
    skins: SKIN_IDS,
    pieces,
    night: light === "night",
    actions: { back, slipGo, keepsake: openKeepsake, allKeepsakes, look, dress: dressUp, firstClass: openFirstClass },
  };
}
