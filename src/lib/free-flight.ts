import { useEffect, useState } from "react";
import { onStorageUserChange, scoped, storageNs } from "./scoped-store";
import { lastWroteAt, waitingOnYou, type HungerRead } from "./hunger";
import type { Whereabouts } from "./whereabouts";
import type { WrenStage } from "../components/WrenBird";
import type { ThreadSummary } from "./db";
import type { WorkSeen } from "./wren-lines";

/* HER DAY OFF — when she plays, and what she has flown (owner, 2026-09-24:
   "除了四种天空叼信的状态 … 可以有一些时间阶段（信使的day off 状态）的他
   自己在玩 free flight … 这样可以吸引用户点进去信使详情页去自己玩").

   Two windows a day — lunch and the evening — she takes a break and does
   laps between the pillars; the Me card shows it and its button opens the
   game on her cover. Work comes first: not while she is bringing a reply
   home, not before your first letter has gone (she is waiting for it), not
   while someone is waiting on you or she is starving, and not as an egg.
   While your letter is out she still breaks — the copy says it's safe in
   her bag.

   The best run is kept on this phone, per account, and shared by the game
   (to beat) and the card (to invite) — and, with the moment of the last
   run, by her day-off push (lib/wren-lines), which never comes within a
   week of a game. */

export const DAY_OFF_HOURS: [number, number][] = [
  [12, 14],
  [20, 22],
];

let devDayOff = false;
/** dev only: show the day off whatever the hour (app/dayoff-preview) */
export const setDevDayOff = (on: boolean) => {
  if (__DEV__) devDayOff = on;
};

export function isDayOff({ state, hunger, stage, hour = new Date().getHours() }: { state: Whereabouts; hunger: HungerRead | null; stage: WrenStage; hour?: number }): boolean {
  if (stage === "egg") return false;
  if (state === "bringing" || state === "unsent") return false;
  if (hunger && (hunger.tier === "owed" || hunger.tier === "owed-long" || hunger.tier === "wilting")) return false;
  if (__DEV__ && devDayOff) return true;
  return DAY_OFF_HOURS.some(([a, b]) => hour >= a && hour < b);
}

/** `lastPlayed`: when the last run ended (ms) — only on this phone, for the day-off push's "not within a week of a game" */
export type FlightBest = { gates: number; pace: number; lastPlayed?: number };
const KEY = "kindredly_free_flight_best";
let mem: FlightBest | null | undefined;
/** whose best `mem` is — a cache read under another account is never returned */
let memNs: string | null = null;
const subs = new Set<(b: FlightBest | null) => void>();
/* a new account (sign out → in, a guest signing in to an existing account)
   reads its own best: drop the cache and let open cards fetch again */
onStorageUserChange(() => {
  mem = undefined;
  memNs = null;
  subs.forEach((f) => f(null));
  if (subs.size) void readBest().then((b) => subs.forEach((f) => f(b)));
});

const n0 = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);

export async function readBest(): Promise<FlightBest | null> {
  if (mem !== undefined && memNs !== null && memNs === storageNs()) return mem;
  const before = storageNs();
  let read: FlightBest | null;
  try {
    const raw = await scoped.getItem(KEY); // waits for the namespace, so storageNs() is set after it
    const o = raw ? (JSON.parse(raw) as Record<string, unknown> | null) : null;
    read = o && typeof o === "object" ? { gates: n0(o.gates), pace: n0(o.pace), ...(n0(o.lastPlayed) ? { lastPlayed: n0(o.lastPlayed) } : {}) } : null;
  } catch (e) {
    console.warn("[free-flight] best read:", e);
    read = null;
  }
  const after = storageNs();
  // an account change while this read was out: hand back what was read, but don't keep it for the new one
  if (before === null || before === after) {
    mem = read;
    memNs = after;
  }
  return read;
}

/** keep a finished run; returns whether it beat the last best */
export async function saveRun(run: { gates: number; pace: number }): Promise<boolean> {
  const was = await readBest();
  const isNew = run.gates > (was?.gates ?? 0);
  const next: FlightBest = { gates: Math.max(was?.gates ?? 0, run.gates), pace: Math.max(was?.pace ?? 0, run.pace), lastPlayed: Date.now() };
  mem = next;
  memNs = storageNs(); // readBest above settled the namespace
  subs.forEach((f) => f(next));
  try {
    await scoped.setItem(KEY, JSON.stringify(next));
  } catch (e) {
    console.warn("[free-flight] best write:", e); // the best lives in memory until the next write
  }
  return isNew;
}

/* WHAT THE PHONE LAST SAW OF HER WORK. Her day-off push is planned days
   ahead, with nothing running at delivery time, so the planner needs the
   parts of isDayOff above that it can carry forward: whether she's an egg,
   bringing a reply home or waiting for your first letter (as of the look),
   when the oldest letter waiting on you arrived (owed two days after it) and
   when you last wrote (wilting fourteen days after it). The Me tab writes
   it whenever it has read her; nothing of it leaves the phone. */
const WORK_KEY = "kindredly_wren_work";

/** what isDayOff reads, put away for the planner. Returns whether it changed in a way that moves a day off. */
export async function noteWork({ threads, state, lastWrittenAt, stage }: { threads: ThreadSummary[]; state: Whereabouts; lastWrittenAt: string | number | null; stage: WrenStage }): Promise<boolean> {
  const waiting = threads.filter(waitingOnYou).map((th) => th.lastAt);
  const lastWrote = lastWroteAt(threads, lastWrittenAt);
  const next: WorkSeen = { at: Date.now(), egg: stage === "egg", state, waitingSince: waiting.length ? Math.min(...waiting) : null, lastWrote: lastWrote || null };
  const was = await readWork();
  const same = !!was && was.egg === next.egg && was.state === next.state && was.waitingSince === next.waitingSince && was.lastWrote === next.lastWrote;
  try {
    await scoped.setItem(WORK_KEY, JSON.stringify(next));
  } catch (e) {
    console.warn("[free-flight] work write:", e);
    return false;
  }
  return !same;
}

/** the last look at her work; null when there has been none (the planner then plans no day off) */
export async function readWork(): Promise<WorkSeen | null> {
  try {
    const raw = await scoped.getItem(WORK_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, unknown>;
    const states: WorkSeen["state"][] = ["home", "delivery", "bringing", "exploring", "unsent"];
    const ms = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const at = ms(o.at);
    if (at == null || typeof o.egg !== "boolean" || !states.includes(o.state as WorkSeen["state"])) return null;
    return { at, egg: o.egg, state: o.state as WorkSeen["state"], waitingSince: ms(o.waitingSince), lastWrote: ms(o.lastWrote) };
  } catch (e) {
    console.warn("[free-flight] work read:", e);
    return null;
  }
}

export function useFlightBest(): FlightBest | null {
  const [b, setB] = useState<FlightBest | null>(memNs !== null && memNs === storageNs() ? (mem ?? null) : null);
  useEffect(() => {
    let alive = true;
    void readBest().then((v) => alive && setB(v));
    subs.add(setB);
    return () => {
      alive = false;
      subs.delete(setB);
    };
  }, []);
  return b;
}
