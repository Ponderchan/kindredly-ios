import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { t, useLang } from "../../lib/i18n";
import { useAuth } from "../../lib/auth";
import { useWrenName } from "../../lib/wren-name";
import { useWrenSkinControl } from "../../lib/wren-skin";
import { useWrenStage } from "../../lib/wren-stage";
import { getStageFloor, stageIndex, wrenStage } from "../../lib/wren-style";
import { EMPTY_STATS, collectGrowthStats } from "../../lib/stats";
import type { GrowthStats } from "../../data/growth";
import { fetchMyWriting, myAura, readAuraCache, type Aura, type WritingRow } from "../../lib/aura";
import { fetchThreads, readThreadsCache, type ThreadSummary } from "../../lib/db";
import { WHEREABOUTS_META, whereabouts } from "../../lib/whereabouts";
import { hungerRead } from "../../lib/hunger";
import { isDayOff, useFlightBest } from "../../lib/free-flight";
import { agoLabel, flightLog } from "../../lib/flight-log";
import { useWhoBook } from "../../lib/who";
import { getCounters, seenToday } from "../../lib/usage-counters";
import { dShort, postNo } from "../../lib/format";
import { getStamp, sname } from "../../data/stamps";
import { isCustomStampId, useCustomStamps } from "../../lib/custom-stamps";
import { courierCardModel, daylight, type CourierPaletteRecord } from "../../components/courier-card-model";
import type { WrenStage } from "../../components/WrenBird";
import type { HatchlingForm } from "../../lib/hatchling-form";
import { buildLetterCards } from "../letters/letters-model";
import { drivingThread, slipRows } from "../courier/courier-model";
import { courierA11y, spokenAgo } from "../me/me-model";
import { meFormat } from "../me/me-format";
import { buildPlanetPage, planetLetters, type PageTransit, type PlanetPageVM } from "../me/planet-model";
import "../../data/strings-step5-me";
import "../../data/strings-step5-kitrn"; // a11y.back
import "../../data/strings-planet";

/* THE PLANET PAGE — THE READS (docs/courier-planet.md; app/planet, PlanetNative).
   ────────────────────────────────────────────────────────────────────────
   What her card on Me says, this page says: the same reads (your threads — the cached list at
   once, then the fresh one —, the growth counts and the never-falling stage floor, your
   writing's clock from the aura read, what Today has shown today) and the same derivations
   (lib/whereabouts, lib/hunger, lib/free-flight isDayOff, lib/flight-log), worded by the same
   card model (components/courier-card-model). Then your letters themselves (lib/aura
   fetchMyWriting, as My letters and Me's peek read them) for the stamps, the figures and the
   slips, and the run she is on now as her own page files it (screens/courier slipRows).
   planet-model works the words out; this hook only gathers and acts.

   Taps: back; Go to the Door opens that correspondence (the room once names are traded, else
   the chat, as her page's slip does); My letters opens the list. */

export type PlanetPageModel = {
  vm: PlanetPageVM;
  /** the hour's sky */
  palette: CourierPaletteRecord;
  /** the sky is night (the status bar's style over it) */
  night: boolean;
  /** the hatchling's own shape and birthmark (lib/wren-stage): hers at the hatch stage only */
  own: { form: HatchlingForm | null; mark: string | null };
  act: {
    back: () => void;
    /** Go to the Door on a slip */
    go: (slipId: string) => void;
    myLetters: () => void;
  };
};

export function usePlanetPage(): PlanetPageModel {
  const lang = useLang();
  const router = useRouter();
  const wren = useWrenName();
  const { user, profile } = useAuth();
  const { skin, accessory } = useWrenSkinControl();
  const known = useWrenStage();
  const best = useFlightBest()?.gates ?? 0;

  const [stats, setStats] = useState<GrowthStats>(EMPTY_STATS);
  const [statsIn, setStatsIn] = useState(false);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [aura, setAura] = useState<Aura | null>(null);
  const [writing, setWriting] = useState<WritingRow[] | null>(null);
  const [seenN, setSeenN] = useState(0);
  const [stageFloor, setStageFloor] = useState<WrenStage>(known.stage ?? "hatch");

  const firstLine = (profile?.firstLine as string) || null;
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([collectGrowthStats(user?.created_at), getStageFloor()])
        .then(([s, floor]) => {
          if (!alive) return;
          setStats(s);
          setStatsIn(true);
          const live = wrenStage(s);
          const st = stageIndex(live) >= stageIndex(floor) ? live : floor;
          setStageFloor((cur) => (stageIndex(st) >= stageIndex(cur) ? st : cur));
        })
        .catch((e) => console.warn("[planet] stats:", e));
      readThreadsCache()
        .then((c) => alive && c && setThreads(c))
        .catch((e) => console.warn("[planet] cached threads:", e));
      fetchThreads()
        .then((th) => alive && th && setThreads(th))
        .catch((e) => console.warn("[planet] threads:", e));
      // your letters (a null answer keeps what was there: never an emptied planet)
      fetchMyWriting()
        .then((m) => alive && m && setWriting(m.letters))
        .catch((e) => console.warn("[planet] your letters weren't read:", e));
      // her hunger clock: the kept read at once, then the fresh one
      readAuraCache()
        .then((a) => alive && a && setAura((cur) => cur ?? a))
        .catch((e) => console.warn("[planet] cached aura:", e));
      myAura(firstLine)
        .then((a) => alive && setAura(a))
        .catch((e) => console.warn("[planet] aura:", e));
      getCounters()
        .then((c) => alive && setSeenN(seenToday(c)))
        .catch((e) => console.warn("[planet] counters:", e));
      return () => {
        alive = false;
      };
    }, [user?.created_at, firstLine]),
  );

  const book = useWhoBook({ threads });
  const lastWrittenAt = aura?.lastWrittenAt ?? null;
  const sent = statsIn ? stats.lettersSent : null;
  const light = daylight();

  // a photo stamp's colour while it loads (lib/custom-stamps), an official one's from the table
  const customStamp = useCustomStamps(useMemo(() => (writing ?? []).map((w) => w.stamp).filter((x): x is string => !!x), [writing]));
  const hexOf = useCallback((id: string) => (isCustomStampId(id) ? customStamp(id)?.hex ?? "" : getStamp(id)?.color ?? ""), [customStamp]);

  const built = useMemo(() => {
    const fmt = meFormat();
    const where = whereabouts(threads, sent);
    const hunger = hungerRead({ threads, lastWrittenAt, book });
    const dayOff = isDayOff({ state: where.state, hunger, stage: stageFloor });
    const entry = flightLog({ where, threads, lastWrittenAt, seenToday: seenN, daylight: light, book });
    const card = courierCardModel({ wren, state: where.state, stage: stageFloor, stateMood: WHEREABOUTS_META[where.state].mood, entry, hunger, playing: dayOff, best }, { t, ago: agoLabel });
    const a11y = courierA11y(
      { wren, dayOff, carrying: where.state === "delivery", best, agoA11y: spokenAgo(entry.at, Date.now(), fmt), line: hunger ? hunger.line : entry.line, sub: (hunger ? hunger.sub : entry.sub) ?? "" },
      fmt,
    );
    const cards = writing ? buildLetterCards(writing, threads, []) : null;
    const day = (iso: string) => fmt.upper(fmt.dateShort(iso));
    const letters = planetLetters(cards, aura ? aura.sources.letters : null, { day, hexOf });

    // the run she is on now, as her page's slip files it; and the letter of yours it answers, if any
    const th = drivingThread(threads, where.state);
    let transit: PageTransit | null = null;
    if (th) {
      const nameOf = (x: ThreadSummary) => (book.identity ? book.threadName(x) : x.revealed && x.otherName ? x.otherName : `No. ${postNo(x.other)}`);
      const slip = slipRows({ threads, where, wren, nameOf }, { t, upper: (s) => s.toUpperCase(), dShort: (ms) => dShort(new Date(ms).toISOString()) });
      const answered = (cards ?? []).find((c) => c.kind === "letter" && c.answers.some((a) => a.id === th.id));
      transit = { rows: slip.rows, thread: th.id, letter: answered?.id ?? "", back: where.state === "bringing" };
    }

    const vm = buildPlanetPage(
      {
        courier: card,
        where: where.state,
        dayOff,
        a11y,
        cards,
        letters,
        total: aura ? aura.sources.letters : null,
        transit,
        // the doors she waits at: correspondences where the last word is yours (drivingThread's rule)
        atDoors: threads.filter((x) => x.lastSenderMe && x.mine > 0).length,
        look: { skin, dress: accessory, stage: stageFloor, wilt: !!hunger?.wilt },
      },
      { t, upper: fmt.upper, wren, day, stampName: (id) => (isCustomStampId(id) ? "" : nameOfStamp(id)) },
    );
    return { vm, palette: card.palette };
    // lang: every word follows the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads, sent, lastWrittenAt, book, stageFloor, seenN, light, wren, best, writing, aura, hexOf, skin, accessory, lang]);

  const slips = built.vm.slips;
  const back = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me")), [router]);
  const go = useCallback(
    (slipId: string) => {
      const id = slips.find((s) => s.id === slipId)?.thread;
      const th = id ? threads.find((x) => x.id === id) : null;
      if (th) router.push((th.revealed ? `/room/${th.id}` : `/chat/${th.id}`) as Href);
    },
    [slips, threads, router],
  );
  const myLetters = useCallback(() => router.push("/my-letters"), [router]);
  const act = useMemo(() => ({ back, go, myLetters }), [back, go, myLetters]);
  const own = useMemo(() => ({ form: known.form, mark: known.mark }), [known.form, known.mark]);

  return { vm: built.vm, palette: built.palette, night: light === "night", own, act };
}

/** A stamp's name in the reader's language; "" when the table doesn't list it. */
function nameOfStamp(id: string): string {
  const def = getStamp(id);
  return def ? sname(def.name) : "";
}
