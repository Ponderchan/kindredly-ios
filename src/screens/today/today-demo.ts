import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import type { PoolLetter } from "../../lib/db";
import type { Signal } from "../../lib/today-signal";
import type { WriteFail } from "../../lib/thread-detail-core";
import { screenNow } from "../../lib/wren";
import type { TodayDeps, TodaySource } from "./useTodayDesk";

/* DEV ONLY — THE TODAY DESK ON FIXTURES (10a step 5, slice today), for
   src/app/dev/step5-today.tsx: every state the simulator checks ask for,
   with no network and no account. The same model runs on it
   (useTodayCore), so a send, a translation, the pouch, a refused reply,
   the arrival, the quiet day and the first load behave exactly as on the
   real desk; only the IO is pretend (TodayDeps below) and the words of the
   letters are written here (they are other people's letters, not UI).

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

export type DemoFixture = {
  pool: PoolLetter[];
  loaded: boolean;
  flights: number;
  waiting: number;
  fresh: boolean;
  deskUnread: number;
};

/** The desk as a fixture: its letters leave as the real ones do, and come back with the fixture. */
export function useDemoSource(fx: DemoFixture): TodaySource {
  const [pool, setPool] = useState(fx.pool);
  useEffect(() => setPool(fx.pool), [fx.pool]);
  const [fresh, setFresh] = useState(fx.fresh);
  useEffect(() => setFresh(fx.fresh), [fx.fresh]);
  const remove = useCallback((id: string) => setPool((cur) => cur.filter((l) => l.id !== id)), []);
  const removeAuthor = useCallback((a: string) => setPool((cur) => cur.filter((l) => l.author !== a)), []);
  const reload = useCallback(() => setPool(fx.pool), [fx.pool]);
  const settleArrival = useCallback(() => setFresh(false), []);
  return {
    pool,
    loaded: fx.loaded,
    flights: fx.flights,
    waiting: fx.waiting,
    fresh,
    sent: true,
    settleArrival,
    deskUnread: fx.deskUnread,
    reload,
    remove,
    removeAuthor,
    demoAllowed: false,
  };
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const away = (what: string) => Alert.alert("Dev page", what);

/** The pretend world: replies answer as `reply()` says, translations come from the fixture, a report
    or a block never reaches the server (a block still clears the writer's letters, through `blocked`). */
export function demoDeps({ reply, blocked }: { reply: () => DemoReply; blocked: (author: string) => void }): TodayDeps {
  let fail: WriteFail | null = null;
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
    counters: async () => ({ seen: 6, replied: 1 }),
    afterReply: () => {},
    seedDemo: () => {},
    sealed: async () => false,
    seal: () => {},
    openDesk: () => away("In the app this opens Wren's desk."),
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
