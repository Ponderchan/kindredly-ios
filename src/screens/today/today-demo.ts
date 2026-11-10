import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import type { PoolLetter } from "../../lib/db";
import type { Signal } from "../../lib/today-signal";
import type { WriteFail } from "../../lib/thread-detail-core";
import { screenNow } from "../../lib/wren";
import { deskDay } from "../../lib/day";
import type { WrenStage } from "../../components/WrenBird";
import type { PaperId } from "../../data/papers";
import { emptyDay, type DayRecord } from "./today-cards";
import { useMemoryDay, type TodayDeps, type TodaySource } from "./useTodayDesk";

/* DEV ONLY — THE TODAY DESK ON FIXTURES (10a step 5, slice today), for
   src/app/dev/step5-today.tsx: every state the simulator checks ask for,
   with no network and no account. The same model runs on it
   (useTodayCore), so a send, a translation, the pouch, a refused reply,
   the arrival, pass and bring back, done (her letter, the window), the
   quiet day, offline and the first load behave exactly as on the real
   desk; only the IO is pretend (TodayDeps below), the day is kept in
   memory (never put away), the day's seal is a Set in memory (never
   lib/flags, never her Live Activity), and the words of the letters are
   written here (they are other people's letters, not UI). Nothing on this
   page reaches the account signed in: not its flags, not its put-away
   desk, not the lock screen. Her birthday letter (owner's audit,
   2026-11-10) is the page's own switch too (DemoWorld.birthday): the
   signed-in account's birthday is never read here, and the year it was
   read is never kept.

   The letters: a telegram the matcher named (auras close), a letter in
   Spanish the matcher also named (the translate capsule wins the slot), a
   long letter that folds (a night writer, like you), a voice letter with a
   caption (the sample sound from data/demo), a long Chinese letter that
   folds before it is measured (the CJK floor), and an unsigned one (a
   deleted account: the veil, no ⋯). */

const H = 3600_000;
const iso = (agoMs: number) => new Date(Date.now() - agoMs).toISOString();

const LONG =
  "I keep a list of the small things strangers have done for me. The man who ran half a block to give me the glove I dropped. The woman on the train who held my coffee while I found my ticket and then said, very seriously, that it smelled better than hers. The kid who waved at me from a bus window for no reason at all. " +
  "I started it in a bad year, when I was sure the world had run out of kindness, and I meant it as evidence for the prosecution. It turned into the opposite. It's four pages now. I read it on the nights I can't sleep, which is most of them lately. " +
  "I don't know why I'm telling you this, except that you're a stranger, and the list is mostly strangers, and it felt like the right place for it. If you have one of these, I'd like to hear it. Even a small one. Especially a small one.";

const ZH =
  "今天下班的时候，地铁里有一个老人一直在给他的孙女讲故事。故事很长，讲的是一只不会飞的鸟，每天走路去很远的地方送信。小女孩一直问，它为什么不坐车呢？老人说，因为走路的时候，它能看见所有的人。我在旁边听了一路，差点坐过了站。回到家我才发现，我已经很久没有好好看过身边的人了。每天低着头，走得很快，好像在赶什么，其实什么都没有赶上。" +
  "也许明天我会走慢一点。也许我会抬头看看车厢里的人，想想他们每个人都在给谁送信。如果你读到这封信，希望你今天也看见了一个人。";

const ES = "¿Alguien más siente que septiembre se va demasiado rápido?";

export const DEMO_DESK: PoolLetter[] = [
  { id: "step5-t1", author: "step5-a1", stamp: "made-my-day", body: "Dear stranger I wanna hear something that made your day", lang: "en", created_at: iso(3 * H), kind: "text", media_path: null, duration_s: null, close: 0.82 },
  { id: "step5-t2", author: "step5-a2", stamp: "seasons", body: ES, lang: "es", created_at: iso(6 * H), kind: "text", media_path: null, duration_s: null, close: 0.77 },
  { id: "step5-t3", author: "step5-a3", stamp: "cant-sleep", body: LONG, lang: "en", created_at: iso(9 * H), kind: "text", media_path: null, duration_s: null },
  { id: "step5-t4", author: "step5-a4", stamp: "miss-someone", body: "About my grandmother's kitchen", lang: "en", created_at: iso(12 * H), kind: "voice", media_path: "demo/voice.m4a", duration_s: 6 },
  { id: "step5-t5", author: "step5-a5", stamp: "outside", body: ZH, lang: "zh", created_at: iso(20 * H), kind: "text", media_path: null, duration_s: null },
  { id: "step5-t6", author: null, stamp: "never-told", body: "I never told anyone this, so I'm telling nobody in particular.", lang: "en", created_at: iso(30 * H), kind: "text", media_path: null, duration_s: null },
];

export const DEMO_SIGNALS: Record<string, Signal> = {
  "step5-t1": { kind: "close" },
  "step5-t2": { kind: "close" },
  "step5-t3": { kind: "hour", stickerId: "night_writer" },
  "step5-t6": { kind: "label", stickerId: "straight_shooter" },
};

const DEMO_TRANSLATIONS: Record<string, string> = {
  [ES]: "Does anyone else feel like September is going by too fast?",
  [ZH]:
    "On the subway home tonight an old man was telling his granddaughter a story — a very long one, about a bird that couldn't fly and walked a long way every day to deliver letters. She kept asking why it didn't take the bus. Because when it walks, he said, it can see everyone. I listened the whole way and nearly missed my stop. At home I realised I haven't really looked at the people around me in a long time. Maybe tomorrow I'll walk a little slower. If you read this, I hope you saw someone today.",
};

/** What the next reply does on the dev page. */
export type DemoReply = "ok" | "gone" | "offline" | "suspended" | "guest";

/** The day as a fixture: what is on the desk and how far the reader got. A new one deals the day again. */
export type DemoDay = {
  desk: PoolLetter[];
  /** ids already passed today (LEFT=1, DONE) */
  passed: string[];
  /** when the desk was first seen done (DONE reopened); null = not yet */
  doneAt: number | null;
  loaded: boolean;
  offline: boolean;
  fresh: boolean;
};

/** The world around the desk: the pouch, who's waiting, her stage, hunger and hour. Changing it leaves the desk where it is. */
export type DemoWorld = {
  flights: number;
  waiting: number;
  /** her stage: an egg can't play */
  stage: WrenStage | null;
  /** she's starving: her wilted pictures on the band, and she can't play either */
  wilt: boolean;
  /** her night hours whatever the clock says (she rests sleepy, yawns as the day ends, the window's sky is night) */
  night: boolean;
  /** the paper every letter on the desk is drawn on (PAPER on the dev page; plain = each letter's own, none of the fixtures has one) */
  paper: PaperId;
  /** it is the reader's birthday (BIRTHDAY on the dev page): her letter stands before the desk until it is passed.
      Always said here, true or false, so the fixtures never read the signed-in account's own birthday */
  birthday: boolean;
};

const recordOf = (day: DemoDay): DayRecord => ({ ...emptyDay(deskDay()), desk: day.desk, passed: day.passed, dealtAt: day.desk.length ? Date.now() : null, doneAt: day.doneAt });

/** The day as a fixture, in memory: its letters are passed, answered and blocked as the real ones are, and come back with the fixture. */
export function useDemoSource(day: DemoDay, world: DemoWorld): TodaySource {
  const store = useMemoryDay(() => recordOf(day));
  const { reset } = store;
  // a new day deals again (a mode, RESET); the world changing around it (PLAY, POUCH) never touches the desk or what was passed
  useEffect(() => reset(recordOf(day)), [day, reset]);
  const [fresh, setFresh] = useState(day.fresh);
  useEffect(() => setFresh(day.fresh), [day.fresh]);
  const reload = useCallback(() => reset(recordOf(day)), [day, reset]);
  const settleArrival = useCallback(() => setFresh(false), []);
  // PAPER: the desk's letters as if their writers had picked it; a view over the day, so changing it never deals again
  const { paper } = world;
  const rec = useMemo(() => (paper === "plain" ? store.rec : { ...store.rec, desk: store.rec.desk.map((l) => ({ ...l, paper })) }), [store.rec, paper]);
  return {
    rec,
    loaded: day.loaded,
    offline: day.offline,
    flights: world.flights,
    waiting: world.waiting,
    stage: world.stage,
    wilt: world.wilt,
    canPlay: world.stage !== "egg" && !world.wilt,
    // 23:00 stands in for the clock: her night hours
    hour: world.night ? 23 : undefined,
    // BIRTHDAY stands in for the profile and the calendar
    birthday: world.birthday,
    fresh,
    sent: true,
    settleArrival,
    reload,
    update: store.update,
    demoAllowed: false,
  };
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const away = (what: string) => Alert.alert("Dev page", what);

/** The pretend world: replies answer as `reply()` says, translations come from the fixture, a report
    or a block never reaches the server (a block still clears the writer's letters, through `blocked`),
    her birthday letter is never remembered as read, its REPLY only says where it would go,
    and the day's seal lives in a Set here — lib/flags and her Live Activity in memory — so done
    behaves as on the tab (once per day; again once the desk is reading again, as the model lifts
    a stale seal) while the real flags, the real put-away desk and the lock screen are never touched.
    A reply that went calls `fed` (the page's own hunger switch goes off: she perks up as she would
    on the tab), never lib/hunger's noteFed, which would feed the real desk's Wren too. */
export function demoDeps({ reply, blocked, fed }: { reply: () => DemoReply; blocked: (author: string) => void; fed: () => void }): TodayDeps {
  let fail: WriteFail | null = null;
  const sealedDays = new Set<string>();
  return {
    reply: async () => {
      await wait(500);
      const r = reply();
      fail = r === "ok" ? null : r === "guest" ? "session" : r;
      return r === "ok" ? "step5-thread" : null;
    },
    lastFail: () => fail,
    screen: screenNow, // local, no network
    translate: async (text) => {
      await wait(700);
      return DEMO_TRANSLATIONS[text] ?? null;
    },
    signal: async (l) => DEMO_SIGNALS[l.id] ?? null,
    markRead: () => {},
    bump: () => {},
    afterReply: () => fed(),
    seedDemo: () => {},
    sealed: async (day) => sealedDays.has(day),
    // in the app the day is sealed here (lib/flags) and her DayClosed Live Activity goes up (lib/activities); here both stay in memory
    seal: (day, facts) => {
      sealedDays.add(day);
      console.log(`[step5-today] the desk is done: sealed ${day} in memory; DayClosed would show ${facts.read} read, ${facts.waiting} waiting`);
    },
    unseal: (day) => {
      if (sealedDays.delete(day)) console.log(`[step5-today] the desk is reading again: the seal on ${day} was stale, lifted in memory`);
    },
    openWindow: () => away("In the app this opens her game (Courier, ?play=1)."),
    /* her birthday letter: never read as far as this page remembers (the real flag, the account's
       own, is not touched), so turning BIRTHDAY off and on brings it back; a pass only says so */
    birthdayRead: async () => false,
    birthdayMark: (year, read) => console.log(`[step5-today] her birthday letter of ${year}: ${read ? "passed (the app would remember it was read)" : "brought back by Undo"}; nothing kept`),
    openWrenRoom: () => away("In the app REPLY on her birthday letter opens her room (/room/wren)."),
    intercept: (action, letter) => {
      if (action === "report") {
        away("A report would go to the server with this letter's words. Nothing was sent.");
        return true;
      }
      Alert.alert("Dev page", "Block this writer? (Nothing reaches the server; their letters leave this desk.)", [
        { text: "Never mind", style: "cancel" },
        { text: "Block", style: "destructive", onPress: () => letter.author && blocked(letter.author) },
      ]);
      return true;
    },
    guest: () => reply() === "guest",
  };
}
