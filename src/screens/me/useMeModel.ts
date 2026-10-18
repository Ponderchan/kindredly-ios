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
import { bumpStageFloor, getStageFloor, loadHatchSkin, skinUnlocked, stageIndex, wrenStage } from "../../lib/wren-style";
import { EMPTY_STATS, collectGrowthStats } from "../../lib/stats";
import { myAura, readAuraCache, readUsedStamps, recordAuraSnapshot, type Aura, type UsedStamp } from "../../lib/aura";
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
import { daylight } from "../../components/CourierCard";
import { auraCardFacts } from "../../components/AuraCard";
import type { WrenStage } from "../../components/WrenBird";
import type { GrowthStats } from "../../data/growth";
import "../../data/strings-step5-me";
import { meFormat } from "./me-format";
import {
  ME_ROUTES,
  auraCtaHref,
  buildMeView,
  courierHref,
  segmentIndex,
  spokenAgo,
  statHref,
  type KeepsakeFacts,
  type MeFacts,
  type MeView,
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
};

export type MeModel = {
  view: MeView;
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
};

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
  const { skin, pick } = useWrenSkinControl();
  const wren = useWrenName();
  const flightBest = useFlightBest();

  const [stats, setStats] = useState<GrowthStats>(EMPTY_STATS);
  const [statsIn, setStatsIn] = useState(false);
  const [aura, setAura] = useState<Aura | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
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
        readThreadsCache().then((c) => alive && c && setThreads(c)); // the last list, at once
        if (threadsAge() > 15) fetchThreads().then((th) => alive && th && setThreads(th));
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

  const ctaTo = view.aura?.ctaTo ?? "compose";
  const dayOffRef = useRef(dayOff);
  dayOffRef.current = dayOff;
  const ctaRef = useRef(ctaTo);
  ctaRef.current = ctaTo;

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
    }),
    [router],
  );

  const courier = useMemo<MeCourier>(
    () => ({ wren, where, threads, lastWrittenAt, hunger, seenToday: seenTodayN, stage: stageFloor, dayOff, best, entry }),
    [wren, where, threads, lastWrittenAt, hunger, seenTodayN, stageFloor, dayOff, best, entry],
  );

  const avatarId = (profile?.avatarId as string) || null;
  const seed = user?.id || "you";
  const avatar = useMemo(() => ({ id: avatarId, photo, seed }), [avatarId, photo, seed]);
  const scroll = useMemo(() => ({ serial: scrollSerial }), [scrollSerial]);

  return { view, segment, courier, aura, avatar, kindreds: stats.kindreds, scroll, act };
}
