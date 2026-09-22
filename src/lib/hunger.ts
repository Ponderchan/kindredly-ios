import { t } from "./i18n";
import { postNo } from "./format";
import type { ThreadSummary } from "./db";
import type { WrenMood } from "../components/WrenBird";

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
   around counted facts, never generated, never a scold. */

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

export function hungerRead({ threads, lastWrittenAt, now = Date.now() }: { threads: ThreadSummary[]; lastWrittenAt: string | number | null; now?: number }): HungerRead | null {
  const waiting = threads
    .filter((th) => !th.gone && !th.lastSenderMe && (th.theirs || 0) > 0 && th.lastAt)
    .map((th) => ({ th, days: Math.floor((now - th.lastAt) / DAY) }))
    .filter((w) => w.days >= 2)
    .sort((a, b) => b.days - a.days)[0];
  if (waiting) {
    const w = who(waiting.th), n = waiting.days;
    if (n >= 5) return { tier: "owed-long", mood: "worry", word: t("hg.waiting"), line: t("hg.owedLong", { who: w, n }), sub: t("hg.owedLongSub"), wilt: false, thread: waiting.th.id };
    return { tier: "owed", mood: "listen", word: t("hg.waiting"), line: t("hg.owed", { who: w, n }), sub: t("hg.owedSub"), wilt: false, thread: waiting.th.id };
  }
  /* last written: the newest of the aura's read and any reply of mine */
  let last = typeof lastWrittenAt === "number" ? lastWrittenAt : lastWrittenAt ? Date.parse(lastWrittenAt) || 0 : 0;
  for (const th of threads) if (th.lastSenderMe && th.lastAt > last) last = th.lastAt;
  if (!last) return null;
  const d = Math.floor((now - last) / DAY);
  if (d >= 14) return { tier: "wilting", mood: "sleepy", word: t("hg.starving"), line: t("hg.starvingLine", { n: d }), sub: t("hg.starvingSub"), wilt: true };
  if (d >= 7) return { tier: "hungry", mood: "worry", word: t("hg.hungry"), line: t("hg.hungryLine"), sub: t("hg.hungrySub"), wilt: false };
  if (d >= 3) return { tier: "peckish", mood: "think", word: t("hg.peckish"), line: t("hg.peckishLine", { n: d }), sub: t("hg.peckishSub"), wilt: false };
  return null;
}
