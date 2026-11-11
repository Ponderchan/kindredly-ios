import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InteractionManager } from "react-native";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { t, useLang } from "../../lib/i18n";
import { markWork } from "../../lib/stall-probe";
import { storeAura, storeMode } from "../../lib/dev-store";
import { useAuth } from "../../lib/auth";
import { useEntitlement } from "../../lib/entitlement";
import { useWrenName } from "../../lib/wren-name";
import { useWrenSkinControl } from "../../lib/wren-skin";
import { getAvatarPhoto } from "../../lib/avatar-photo";
import { bumpStageFloor, getStageFloor, loadHatchSkin, skinUnlocked, stageIndex, useHatchSkin, wrenStage } from "../../lib/wren-style";
import { EMPTY_STATS, collectGrowthStats } from "../../lib/stats";
import { fetchMyWriting, myAura, readAuraCache, readUsedStamps, recordAuraSnapshot, type Aura, type UsedStamp, type WritingRow } from "../../lib/aura";
import { observeAuraLocks, replanLocal } from "../../lib/local-push";
import { fetchThreads, readThreadsCache, threadsAge, type ThreadSummary } from "../../lib/db";
import { fetchCarried, recordStageDate, whereabouts, type WhereaboutsRead } from "../../lib/whereabouts";
import { hungerRead, type HungerRead } from "../../lib/hunger";
import { isDayOff, noteWork, useFlightBest } from "../../lib/free-flight";
import { flightLog, type LogEntry } from "../../lib/flight-log";
import { useWhoBook } from "../../lib/who";
import { getCounters, seenToday } from "../../lib/usage-counters";
import { loadJournal } from "../../lib/journal";
import { loadShelf, mint, unseen, type Minted } from "../../lib/keepsakes";
import { keepsake } from "../../data/keepsakes";
import { getStamp, sname } from "../../data/stamps";
import { isCustomStampId, useCustomStamps, useMyCustomStamps } from "../../lib/custom-stamps";
import { useFcRollout } from "../../lib/fc-rollout";
import { daylight } from "../../components/CourierCard";
import { auraCardFacts } from "../../components/AuraCard";
import type { WrenStage } from "../../components/WrenBird";
import type { GrowthStats } from "../../data/growth";
import { useFares } from "../../lib/fares";
import { readReportDoor, reportDoorVM, type ReportDoor } from "../../lib/report-door";
import { localeTag } from "../../lib/format";
import { trialLabel } from "../paywall/paywall-model";
import { buildLetterCards } from "../letters/letters-model";
import "../../data/strings-step5-me";
import "../../data/strings-me4a";
import "../../data/strings-planet";
import { meFormat } from "./me-format";
import { planetLetters, shelfTap, shelfWeek, type PlanetLetterVM, type ShelfFacts } from "./planet-model";
import { useSeason } from "../../lib/season";
import {
  ME4A_ROUTES,
  ME_ROUTES,
  NO_REPORT_ROW,
  auraCtaHref,
  buildMe4a,
  buildMeView,
  courierHref,
  segmentIndex,
  spokenAgo,
  statHref,
  type KeepsakeFacts,
  type MeFacts,
  type LookTileId,
  type Me4aView,
  type MeView,
  type ReportRowVM,
  type StampFacts,
  type StatKey,
} from "./me-model";

/* THE ME TAB'S MODEL HOOK (10a step 5): everything the tab knows and does,
   for whichever renderer draws it — MeNative (SwiftUI, KMeView) or MeRN
   (the remote switch's React Native fallback). The rules and every word
   live in me-model (pure, node-tested); this hook gathers the facts and
   does the side effects, as the old (tabs)/me.tsx did:

   - THE PAGE PAINTS BEFORE IT READS: the reads wait for the tab's own
     transition (a 320ms timer — the courier card's loops kept
     InteractionManager's queue busy), and a visit within 30s of the last
     changes nothing. The heavy part — the aura over every piece of writing
     — waits for interactions and 250ms more. The kept aura paints first.
   - EXCEPT THE PHOTO AND THE SHELF: Edit profile is its own page now (the
     Me stack), so the avatar photo is read on EVERY focus, outside the 30s
     rule, or a new photo wouldn't show on the way back; and so is the
     keepsake shelf with its NEW set (a keepsake opened from Me is seen on
     the way back; one her room minted shows at once).
   - the growth stats (KINDREDS, the courier's stage floor, which only moves
     forward, the day it turned), the threads (the kept copy at once, the
     network past 15s), today's seen count, the aura (cache, then fresh; an
     offline read comes back `stale` from lib/aura and is shown but never
     recorded or celebrated), the stamps you've used (the facts the last full
     aura read kept) — and keepsakes are MINTED here too,
     with the context her room uses, or the block would lag behind a reader
     who never opens the room (critic: mint ran only in WrenHome).
   - THE WARDROBE GATE: once the stats and the entitlement have both
     answered, a look the account hasn't earned goes back to the coat she
     hatched in.
   - her whereabouts, hunger and day off, and noteWork + a re-plan of her
     local lines when her work moved.
   - the segment, kept for the session (a fresh launch opens Courier).
   - pressing Me again while on it: the Me stack pops to its root (the
     native stack's own tabPress) and the page scrolls to the top
     (`scroll.serial`, read by both renderers).
   - every tap's destination (me-model ME_ROUTES): the sliders push
     /me/settings and the pencil /me/edit-profile (the settings-profile
     slice's screens in the Me stack, so the floating bar stays). */

/** What the courier card (an RN island in Swift, the card itself in the fallback) is drawn from. */
export type MeCourier = {
  wren: string;
  where: WhereaboutsRead;
  threads: ThreadSummary[];
  lastWrittenAt: string | null;
  hunger: HungerRead | null;
  seenToday: number;
  stage: WrenStage;
  dayOff: boolean;
  best: number;
  /** the diary line both the card and VoiceOver read */
  entry: LogEntry;
};

/** Every tap the tab answers, the same object for the life of the screen. */
export type MeActions = {
  settings: () => void;
  edit: () => void;
  stat: (key: StatKey) => void;
  /** a chip: the segment shown (Swift shows it at once; this keeps it for the session) */
  segment: (index: number) => void;
  courier: () => void;
  keepsakes: () => void;
  keepsake: (id: string) => void;
  auraOpen: () => void;
  auraCta: () => void;
  auraShare: () => void;
  stampsEmpty: () => void;
  firstClass: () => void;
  /* Me 4a (the Swift Me; MeRN doesn't use these) */
  /** a peek opened or closed (no analytics event exists for it yet: nothing is sent) */
  peek: (key: StatKey, open: boolean) => void;
  peekLetter: (id: string) => void;
  peekKindred: (id: string) => void;
  seeAll: () => void;
  openKindreds: () => void;
  /** the empty letters peek's "Write a letter →" */
  write: () => void;
  /** a free look: she wears it (useWrenSkinControl().dress); "fc" for a member: her wardrobe.
      The locked First Class tile switches the segment instead — the renderer does that. */
  look: (id: LookTileId) => void;
  /** "All looks →" for a member: her wardrobe (for anyone else the renderer shows the FC segment) */
  allLooks: () => void;
  /** the report door: the report, or First Class when locked */
  report: () => void;
  /* the courier's planet (the Swift Me with "meplanet" on; screens/me/planet-model) */
  /** a look on her card's shelf ("dress:beanie", "skin:moss"): she wears it, or it comes off;
      First Class for a paid look the reader hasn't got; her wardrobe for Moss before a kindred */
  shelfLook: (id: string) => void;
  /** her card's round button: the planet page */
  track: () => void;
};

export type MeModel = {
  view: MeView;
  /** Me 4a's records (the Swift Me; the fallback draws `view`) */
  me4a: Me4aView;
  /** the segment shown (0 Courier, 1 Aura, 2 Stamps, 3 First Class) */
  segment: number;
  courier: MeCourier;
  /** the aura read itself, for the art island and the fallback's card */
  aura: Aura | null;
  /** the avatar's three sources (AvatarImage) */
  avatar: { id: string | null; photo: string | null; seed: string };
  /** for PlushCelebration: kindreds, once the stats are in */
  kindreds: number;
  /** pressing Me again: scroll to the top (the serial makes two presses two scrolls) */
  scroll: { serial: number };
  act: MeActions;
  /** First Class by the day: the form, its words, and its tap */
  fc: ReturnType<typeof useFcRollout>;
  /** what the courier's planet is drawn from (screens/me/planet-model): the letters behind the
      stamps, newest first, and what the shelf's four are chosen from */
  planet: { letters: PlanetLetterVM[]; shelf: ShelfFacts };
};

/* where the planet's taps go. `track` is the planet page (docs/courier-planet.md, phase 5); until
   it exists the round button opens her page, where Track is today */
const ME_PLANET_ROUTES = {
  track: "/courier",
  looksPaywall: "/paywall?src=me_looks",
} as const;

/* the segment lasts while the app is open; a fresh launch opens Courier */
const session = { segment: 0 };

/** The stamps' facts: the name and colour from stamps.ts. */
export function stampFacts(used: readonly UsedStamp[]): StampFacts[] {
  return used.map((s) => {
    const def = getStamp(s.id);
    return { id: s.id, at: s.at, name: def ? sname(def.name) : "", hex: def?.color ?? "" };
  });
}

/** The shelf's facts: the name in the reader's language and whether the catalog can draw it. */
/** A stamp's colour from stamps.ts ("" when it doesn't list it). */
export const stampHex = (id: string): string => getStamp(id)?.color ?? "";

/** "November" for "2026-11-01", in the reader's language. */
export const monthName = (iso: string): string => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(localeTag(), { month: "long" });

export function keepsakeFacts(shelf: readonly Minted[], fresh: ReadonlySet<string>): KeepsakeFacts[] {
  return shelf.map((k) => ({ id: k.id, name: t(`ks.name.${k.id}`), fresh: fresh.has(k.id), known: !!keepsake(k.id) }));
}

export function useMeModel(): MeModel {
  const lang = useLang();
  const router = useRouter();
  const navigation = useNavigation();
  const auth = useAuth();
  const { user, handle, profile } = auth;
  const { premium, settled, cofounderNo } = useEntitlement();
  const { skin, pick, accessory, dress } = useWrenSkinControl();
  const seasonLooks = useSeason().looks; // the season's looks take the beanie's and the scarf's tiles while it lasts
  const fares = useFares();
  const wren = useWrenName();
  const flightBest = useFlightBest();

  const [stats, setStats] = useState<GrowthStats>(EMPTY_STATS);
  const [statsIn, setStatsIn] = useState(false);
  const [aura, setAura] = useState<Aura | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [threadsIn, setThreadsIn] = useState(false);
  /* Me 4a: your letters (the peek and its count; null until read) and the report's door */
  const [writing, setWriting] = useState<WritingRow[] | null>(null);
  const [door, setDoor] = useState<ReportDoor | null>(null);
  const [doorSerial, setDoorSerial] = useState(0);
  const doorOpened = useRef(false);
  const [seenTodayN, setSeenTodayN] = useState(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [stageFloor, setStageFloor] = useState<WrenStage>("egg");
  const [used, setUsed] = useState<UsedStamp[]>([]);
  const [shelf, setShelf] = useState<Minted[]>([]);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set());
  const [segment, setSegment] = useState(() => segmentIndex(session.segment));
  const [scrollSerial, setScrollSerial] = useState(0);
  const threadsRef = useRef<ThreadSummary[]>([]);
  threadsRef.current = threads;

  /* THE WARDROBE IS ON THE DEVICE; WHAT UNLOCKS IT IS ON THE ACCOUNT.
     Checked where it's worn, not only where it's chosen — and only once
     both answers are in, or a mid-load `false` undresses a paying reader. */
  useEffect(() => {
    if (!statsIn || !settled) return;
    let alive = true;
    void loadHatchSkin().then((h) => {
      if (alive && !skinUnlocked(skin, stats, premium, h)) pick(h || "sticker"); // back to the coat she hatched in
    });
    return () => {
      alive = false;
    };
  }, [statsIn, settled, skin, stats, premium, pick]);

  /* on every focus, outside the 30s rule (two cheap local reads): the photo
     (Edit profile is a page of its own now) and the keepsake shelf with its
     NEW set — opening a NEW keepsake from Me marks it seen, and her room may
     have minted one, and the block must say so on the way back, not 30s
     later. The mint itself stays in the throttled read below. */
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getAvatarPhoto()
        .then((p) => alive && setPhoto(p))
        .catch((e) => console.warn("[me] the avatar photo wasn't read:", e));
      loadShelf()
        .then(async (s) => {
          const f = await unseen(s);
          if (!alive) return;
          setShelf(s);
          setFresh(f);
        })
        .catch((e) => console.warn("[me] the keepsake shelf wasn't read:", e));
      return () => {
        alive = false;
      };
    }, []),
  );

  /* THE PAGE PAINTS BEFORE IT READS (see the top) */
  const lastRead = useRef(0);
  const firstLine = (profile?.firstLine as string) || null;
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (Date.now() - lastRead.current < 30_000) return;
      const read = () => {
        markWork("me:stats");
        Promise.all([collectGrowthStats(user?.created_at), getStageFloor()])
          .then(([s, floor]) => {
            if (!alive) return;
            setStats(s);
            setStatsIn(true);
            const live = wrenStage(s);
            // stage only ever moves forward; remember the highest ever reached, and the day it turned
            setStageFloor(stageIndex(live) >= stageIndex(floor) ? live : floor);
            if (stageIndex(live) > stageIndex(floor)) {
              void bumpStageFloor(live);
              void recordStageDate(live);
            }
          })
          .catch((e) => console.warn("[me] stats:", e));
        readThreadsCache().then((c) => {
          if (!alive || !c) return;
          setThreads(c); // the last list, at once
          setThreadsIn(true);
        });
        if (threadsAge() > 15)
          fetchThreads().then((th) => {
            if (!alive || !th) return;
            setThreads(th);
            setThreadsIn(true);
          });
        // your letters, for the peek (null answers keep what was there: never an emptied list)
        fetchMyWriting()
          .then((m) => alive && m && setWriting(m.letters))
          .catch((e) => console.warn("[me] your letters weren't read:", e));
        setDoorSerial((n) => n + 1);
        getCounters().then((c) => alive && setSeenTodayN(seenToday(c)));
        readUsedStamps().then((u) => alive && setUsed(u));

        (async () => {
          if (__DEV__ && storeMode) {
            setAura(storeAura());
            return;
          }
          // the last read first, so the card is there when the tab is
          const cached = await readAuraCache();
          if (alive && cached) setAura((cur) => cur ?? cached);
          // the heaviest thing this tab does waits for the page and the transition
          await new Promise<void>((r) => InteractionManager.runAfterInteractions(() => setTimeout(r, 250)));
          if (!alive) return;
          markWork("me:aura");
          const a = await myAura(firstLine);
          if (!alive) return;
          setAura(a);
          // a stale (offline) read is the kept one: shown, never recorded or announced
          if (!a.stale) {
            void recordAuraSnapshot(a);
            void observeAuraLocks(a.locked.map((d) => d.key), false); // a line that settled since the last look (lib/local-push)
          }
          // the full read rewrote the stamp facts
          readUsedStamps().then((u) => alive && setUsed(u));
          // her keepsakes, with the context her room mints them in (WrenHome)
          const [carried, journal] = await Promise.all([fetchCarried(), loadJournal().catch(() => [])]);
          if (!alive) return;
          const minted = await mint({ carried, threads: threadsRef.current, journal, commonWords: a.commonWords[0] ? [a.commonWords[0]] : [], joinedAt: user?.created_at ?? null });
          const f = await unseen(minted);
          if (!alive) return;
          setShelf(minted);
          setFresh(f);
        })().catch((e) => console.warn("[me] aura:", e));
      };
      const timer = setTimeout(() => {
        if (!alive) return;
        lastRead.current = Date.now();
        read();
      }, 320);
      return () => {
        alive = false;
        clearTimeout(timer);
      };
    }, [user?.created_at, firstLine]),
  );

  /* THE REPORT'S DOOR (Me 4a, O6): read with the page (doorSerial), when the entitlement
     answers, and again on the way back from the report (opening it marks the month read) */
  useFocusEffect(
    useCallback(() => {
      if (doorOpened.current) {
        doorOpened.current = false;
        setDoorSerial((n) => n + 1);
      }
    }, []),
  );
  useEffect(() => {
    if (doorSerial === 0 || !settled) return;
    let alive = true;
    readReportDoor(premium, firstLine)
      .then((d) => alive && setDoor(d))
      .catch((e) => console.warn("[me] the report's door wasn't read:", e));
    return () => {
      alive = false;
    };
  }, [doorSerial, settled, premium, firstLine]);

  /* her status rides the card — you see she moved before you open her room */
  const sent = statsIn ? stats.lettersSent : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const where = useMemo(() => whereabouts(threads, sent), [threads, sent, lang]);
  const lastWrittenAt = aura?.lastWrittenAt ?? null;
  // her lines name a pen pal as every screen does (lib/who): their number, or the courier name once the switch is on
  const book = useWhoBook({ threads });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hunger = useMemo(() => hungerRead({ threads, lastWrittenAt, book }), [threads, lastWrittenAt, lang, book]);
  const dayOff = isDayOff({ state: where.state, hunger, stage: stageFloor });
  const best = flightBest?.gates ?? 0;
  /* her day-off push is planned days ahead (lib/local-push): put away what
     isDayOff reads once her stats and writing are in, and re-plan when it moved */
  const haveAura = !!aura;
  useEffect(() => {
    if (!statsIn || !haveAura) return;
    void noteWork({ threads, state: where.state, lastWrittenAt, stage: stageFloor })
      .then((moved) => (moved ? replanLocal({ force: true }) : undefined))
      .catch((e) => console.warn("[me] work note:", e));
  }, [statsIn, haveAura, threads, where.state, lastWrittenAt, stageFloor]);

  /* the diary line: the card shows it and VoiceOver reads it, from one read */
  const light = daylight();
  const entry = useMemo(
    () => flightLog({ where, threads, lastWrittenAt, seenToday: seenTodayN, daylight: light, book }),
    // lang: the diary is written in the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [where, threads, lastWrittenAt, seenTodayN, light, lang, book],
  );

  /* pressing Me again while on it: the stack pops to its root by itself
     (the native stack's tabPress), and the page goes to the top */
  useEffect(() => {
    type Nav = { getParent?: () => Nav | undefined; addListener?: (type: string, cb: () => void) => () => void; isFocused?: () => boolean };
    const tab = (navigation as unknown as Nav).getParent?.();
    if (!tab?.addListener) return;
    return tab.addListener("tabPress", () => {
      if (tab.isFocused?.()) setScrollSerial((n) => n + 1);
    });
  }, [navigation]);

  const view = useMemo(() => {
    const facts: MeFacts = {
      profile: {
        handle,
        createdAt: user?.created_at ?? null,
        cofounderNo,
        letters: aura ? aura.sources.letters : null,
        kindreds: statsIn ? stats.kindreds : null,
      },
      aura: auraCardFacts(aura),
      stamps: stampFacts(used),
      keepsakes: keepsakeFacts(shelf, fresh),
      firstClass: { premium, cofounderNo, wren },
      courier: {
        wren,
        dayOff,
        carrying: where.state === "delivery",
        best,
        agoA11y: spokenAgo(entry.at, Date.now(), meFormat()),
        line: hunger ? hunger.line : entry.line,
        sub: (hunger ? hunger.sub : entry.sub) ?? "",
      },
    };
    return buildMeView(facts, meFormat());
    // lang: every word follows the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, user?.created_at, cofounderNo, aura, statsIn, stats.kindreds, used, shelf, fresh, premium, wren, dayOff, where.state, best, entry, hunger, lang]);

  /* photo stamps on your letters ("c:<uuid>"): resolved and pushed to Swift for the peek's cards;
     their colour for the frame while they load */
  const customStamp = useCustomStamps(useMemo(() => (writing ?? []).map((w) => w.stamp).filter((x): x is string => !!x), [writing]));
  const hexOf = useCallback((id: string) => (isCustomStampId(id) ? customStamp(id)?.hex ?? "" : stampHex(id)), [customStamp]);
  const trial = fares.trial;
  const report = useMemo<ReportRowVM>(() => {
    if (!door) return NO_REPORT_ROW;
    return reportDoorVM(door, { t, monthName }, wren);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [door, wren, lang]);
  const me4a = useMemo(() => {
    const letters = writing ? writing.length : aura ? aura.sources.letters : null;
    return buildMe4a(
      {
        profile: { handle, createdAt: user?.created_at ?? null, cofounderNo, letters, kindreds: statsIn ? stats.kindreds : null },
        letters: writing ? buildLetterCards(writing, threads, []) : null,
        stampHex: hexOf,
        threads: threadsIn ? threads : null,
        nameOf: (th) => book.threadName(th as ThreadSummary),
        looks: { accessory, premium, wren, season: seasonLooks },
        firstClass: { premium, cofounderNo, wren, trial: trialLabel(trial, t) },
        report,
      },
      meFormat(),
    );
    // lang: every word follows the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, user?.created_at, cofounderNo, writing, aura, statsIn, stats.kindreds, threads, threadsIn, book, accessory, premium, wren, seasonLooks, trial, report, lang, hexOf]);

  /* THE COURIER'S PLANET (docs/courier-planet.md): the letters behind its stamps and what the
     shelf's four looks are chosen from. Cheap and pure, so it is kept whether or not the
     planet is on (MeNative asks the switch). The week is read when the page's facts change:
     a shelf that turned over at midnight shows on the next visit, not mid-scroll. */
  const hatchSkin = useHatchSkin();
  const planet = useMemo(() => {
    const fmt = meFormat();
    const cards = writing ? buildLetterCards(writing, threads, []) : null;
    const letters = planetLetters(cards, aura ? aura.sources.letters : null, { day: (iso) => fmt.upper(fmt.dateShort(iso)), hexOf });
    const shelf: ShelfFacts = { skin, dress: accessory, premium, kindreds: statsIn ? stats.kindreds : null, hatchSkin, season: seasonLooks, week: shelfWeek(Date.now()) };
    return { letters, shelf };
    // lang: the days are written in the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writing, threads, aura, hexOf, skin, accessory, premium, statsIn, stats.kindreds, hatchSkin, seasonLooks, lang]);
  const shelfRef = useRef(planet.shelf);
  shelfRef.current = planet.shelf;

  const ctaTo = view.aura?.ctaTo ?? "compose";
  const dayOffRef = useRef(dayOff);
  dayOffRef.current = dayOff;
  const ctaRef = useRef(ctaTo);
  ctaRef.current = ctaTo;
  const reportHref = useRef<string | null>(null);
  reportHref.current = report.href;

  const act = useMemo<MeActions>(
    () => ({
      settings: () => router.push(ME_ROUTES.settings),
      edit: () => router.push(ME_ROUTES.editProfile),
      stat: (key) => router.push(statHref(key)),
      segment: (index) => {
        const i = segmentIndex(index);
        session.segment = i;
        setSegment(i);
      },
      courier: () => router.push(courierHref(dayOffRef.current)),
      keepsakes: () => router.push(ME_ROUTES.keepsakes),
      keepsake: (id) => router.push(ME_ROUTES.keepsake(id)),
      auraOpen: () => router.push(ME_ROUTES.aura),
      auraCta: () => router.push(auraCtaHref(ctaRef.current)),
      auraShare: () => router.push(ME_ROUTES.auraCard),
      stampsEmpty: () => router.push(ME_ROUTES.compose),
      firstClass: () => router.push(ME_ROUTES.paywall),
      peek: () => {},
      peekLetter: () => router.push(ME_ROUTES.letters),
      peekKindred: (id) => router.push(ME4A_ROUTES.room(id)),
      seeAll: () => router.push(ME_ROUTES.letters),
      openKindreds: () => router.push(ME_ROUTES.kindreds),
      write: () => router.push(ME_ROUTES.compose),
      look: (id) => {
        if (id === "fc") router.push(ME4A_ROUTES.courier);
        else dress(id);
      },
      allLooks: () => router.push(ME4A_ROUTES.courier),
      report: () => {
        const href = reportHref.current;
        if (!href) return;
        doorOpened.current = true;
        router.push(href);
      },
      shelfLook: (id) => {
        const tap = shelfTap(id, shelfRef.current);
        if (!tap) return;
        if (tap.do === "dress") dress(tap.value);
        else if (tap.do === "skin") pick(tap.value);
        else if (tap.do === "firstClass") router.push(ME_PLANET_ROUTES.looksPaywall);
        else router.push(ME4A_ROUTES.courier);
      },
      track: () => router.push(ME_PLANET_ROUTES.track),
    }),
    [router, dress, pick],
  );

  /* First Class by the day (the owner's rollout, 2026-10-20; lib/fc-rollout): which form the page
     shows; every one opens our own First Class page, tagged with its form */
  const { quota: stampQuota } = useMyCustomStamps();
  const letterDates = useMemo(() => (writing ? writing.map((w) => w.created_at) : null), [writing]);
  const fc = useFcRollout(
    { premium, createdAt: user?.created_at ?? null, letterDates, penPals: threadsIn ? threads.length : 0, stampsMade: stampQuota?.made ?? 0 },
    useCallback((src: string) => router.push(`/paywall?src=${src}`), [router]),
  );

  const courier = useMemo<MeCourier>(() => {
    // while the Post's letter waits, Wren's line on the card is about it
    const invite = fc.view.courierLine ? { ...entry, line: fc.view.courierLine, sub: fc.view.courierSub } : entry;
    return { wren, where, threads, lastWrittenAt, hunger: fc.view.courierLine ? null : hunger, seenToday: seenTodayN, stage: stageFloor, dayOff, best, entry: invite };
  }, [wren, where, threads, lastWrittenAt, hunger, seenTodayN, stageFloor, dayOff, best, entry, fc.view.courierLine, fc.view.courierSub]);

  const avatarId = (profile?.avatarId as string) || null;
  const seed = user?.id || "you";
  const avatar = useMemo(() => ({ id: avatarId, photo, seed }), [avatarId, photo, seed]);
  const scroll = useMemo(() => ({ serial: scrollSerial }), [scrollSerial]);

  return { view, me4a, segment, courier, aura, avatar, kindreds: stats.kindreds, scroll, act, fc, planet };
}
