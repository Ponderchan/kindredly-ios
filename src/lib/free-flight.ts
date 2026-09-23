import { useEffect, useState } from "react";
import { scoped } from "./scoped-store";
import type { HungerRead } from "./hunger";
import type { Whereabouts } from "./whereabouts";
import type { WrenStage } from "../components/WrenBird";

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
   (to beat) and the card (to invite). */

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

export type FlightBest = { gates: number; pace: number };
const KEY = "kindredly_free_flight_best";
let mem: FlightBest | null | undefined;
const subs = new Set<(b: FlightBest | null) => void>();

export async function readBest(): Promise<FlightBest | null> {
  if (mem !== undefined) return mem;
  try {
    const raw = await scoped.getItem(KEY);
    mem = raw ? (JSON.parse(raw) as FlightBest) : null;
  } catch {
    mem = null;
  }
  return mem;
}

/** keep a finished run; returns whether it beat the last best */
export async function saveRun(run: FlightBest): Promise<boolean> {
  const was = await readBest();
  const isNew = run.gates > (was?.gates ?? 0);
  const next = { gates: Math.max(was?.gates ?? 0, run.gates), pace: Math.max(was?.pace ?? 0, run.pace) };
  mem = next;
  subs.forEach((f) => f(next));
  try {
    await scoped.setItem(KEY, JSON.stringify(next));
  } catch {
    /* the best lives in memory until the next write */
  }
  return isNew;
}

export function useFlightBest(): FlightBest | null {
  const [b, setB] = useState<FlightBest | null>(mem ?? null);
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
