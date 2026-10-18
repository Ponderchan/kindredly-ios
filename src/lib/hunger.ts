import { t } from "./i18n";
import { postNo } from "./format";
import type { ThreadSummary } from "./db";
import type { WrenMood } from "../components/WrenBird";
import type { WhoBook } from "./stranger-who";

/* HUNGER — the courier lives on letters (owner, 2026-09-22; the web's
   zine/hunger.jsx, ported line for line so both shelves say the same thing).

   Two clocks:
     someone is waiting — a person wrote you and you have not written back
       2 days  listen  "{who} wrote you {n} days ago. i keep checking your desk"
       5 days  worry   "{who} has waited {n} days. i can't answer for you"
     nothing to carry — days since you last wrote anything
       3 days  think   PECKISH   "{n} days since my last run. bag's light"
       7 days  worry   HUNGRY    "a week on an empty bag. i eat letters, you know"
      14 days  sleepy  STARVING  "{n} days. i'm going grey out here"
   A person outranks the bag; under three days she says nothing; a
   correspondent who closed their account is not waiting. Fixed templates
   around counted facts, never generated, never a scold.

   {who} is a kindred's pen name, else the pen pal's "No. 4481" — or, once
   the identity switch is on, the courier name (pass the screen's book,
   lib/who useWhoBook; without one, or switched off, the number as ever). */

export type HungerTier = "owed" | "owed-long" | "peckish" | "hungry" | "wilting";
export interface HungerRead {
  tier: HungerTier;
  mood: WrenMood;
  /** the word on the shelf — WAITING · PECKISH · HUNGRY · STARVING */
  word: string;
  line: string;
  sub: string;
  /** starving: she droops and loses colour */
  wilt: boolean;
  /** the room that is waiting on you, when one is */
  thread?: string;
}

const DAY = 864e5;
const who = (th: ThreadSummary) => (th.revealed && th.otherName ? th.otherName : "No. " + postNo(th.other));
/** {who} in her line: the book's name with the switch on (lib/stranger-who threadName), else the number as it always read */
const whoIn = (th: ThreadSummary, book: WhoBook | null | undefined) => (book?.identity ? book.threadName(th) : who(th));

let devStarving = false;
/** dev only: read her as starving whatever the dates (app/wilt-preview) */
export const setDevStarving = (on: boolean) => {
  if (__DEV__) devStarving = on;
};

/* FED, ON THIS PHONE. A letter or a reply written here feeds her the moment
   it goes (lib/local-push noteWrote("letter") calls noteFed), so a screen
   that reads her hunger from what it last fetched (Today: the threads, and
   no aura date) doesn't keep her grey until its next fetch. In memory, for
   this run of the app; across launches local-push's letterDay says the same
   (lastLetterDay). Read it as hungerRead's lastWrittenAt, beside any other. */
let fedAt = 0;
const fedListeners = new Set<() => void>();

/** a letter or a reply just went from this phone */
export function noteFed(at: number = Date.now()): void {
  if (at <= fedAt) return;
  fedAt = at;
  fedListeners.forEach((l) => l());
}

/** when she was last fed on this phone in this run (ms), 0 for not yet */
export const lastFedAt = (): number => fedAt;

/** told whenever she's fed (for useSyncExternalStore); returns the unsubscribe */
export function onFed(listener: () => void): () => void {
  fedListeners.add(listener);
  return () => {
    fedListeners.delete(listener);
  };
}

/** a person wrote you and you have not written back (a closed account is not waiting) */
export const waitingOnYou = (th: ThreadSummary): boolean => !th.gone && !th.lastSenderMe && (th.theirs || 0) > 0 && !!th.lastAt;

/** the last time you wrote anything: the newest of the aura's read and any reply of yours (ms; 0 = never known) */
export function lastWroteAt(threads: ThreadSummary[], lastWrittenAt: string | number | null): number {
  let last = typeof lastWrittenAt === "number" ? lastWrittenAt : lastWrittenAt ? Date.parse(lastWrittenAt) || 0 : 0;
  for (const th of threads) if (th.lastSenderMe && th.lastAt > last) last = th.lastAt;
  return last;
}

export function hungerRead({
  threads,
  lastWrittenAt,
  now = Date.now(),
  book,
}: {
  threads: ThreadSummary[];
  lastWrittenAt: string | number | null;
  now?: number;
  /** who strangers are (lib/who useWhoBook); absent or off = "No. 4481" */
  book?: WhoBook | null;
}): HungerRead | null {
  if (devStarving && __DEV__) return { tier: "wilting", mood: "sleepy", word: t("hg.starving"), line: t("hg.starvingLine", { n: 16 }), sub: t("hg.starvingSub"), wilt: true };
  const waiting = threads
    .filter(waitingOnYou)
    .map((th) => ({ th, days: Math.floor((now - th.lastAt) / DAY) }))
    .filter((w) => w.days >= 2)
    .sort((a, b) => b.days - a.days)[0];
  if (waiting) {
    const w = whoIn(waiting.th, book), n = waiting.days;
    if (n >= 5) return { tier: "owed-long", mood: "worry", word: t("hg.waiting"), line: t("hg.owedLong", { who: w, n }), sub: t("hg.owedLongSub"), wilt: false, thread: waiting.th.id };
    return { tier: "owed", mood: "listen", word: t("hg.waiting"), line: t("hg.owed", { who: w, n }), sub: t("hg.owedSub"), wilt: false, thread: waiting.th.id };
  }
  /* last written: the newest of the aura's read and any reply of mine */
  const last = lastWroteAt(threads, lastWrittenAt);
  if (!last) return null;
  const d = Math.floor((now - last) / DAY);
  if (d >= 14) return { tier: "wilting", mood: "sleepy", word: t("hg.starving"), line: t("hg.starvingLine", { n: d }), sub: t("hg.starvingSub"), wilt: true };
  if (d >= 7) return { tier: "hungry", mood: "worry", word: t("hg.hungry"), line: t("hg.hungryLine"), sub: t("hg.hungrySub"), wilt: false };
  if (d >= 3) return { tier: "peckish", mood: "think", word: t("hg.peckish"), line: t("hg.peckishLine", { n: d }), sub: t("hg.peckishSub"), wilt: false };
  return null;
}
